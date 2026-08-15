import type JSZip from 'jszip';
import shp from 'shpjs';
import type { FeatureCollection, GeoJsonProperties } from 'geojson';

import { FIELD_SAMPLE_SIZE, PALETTE, SAMPLE_BASENAME } from '../constants';
import type {
  FieldType,
  Layer,
  LoadResult,
  LoadWarning,
  ProgressFn,
  ShapeCollection,
  ShapeFeature,
} from '../types';
import { bboxLooksGeographic, parseCrs, reprojectToWgs84 } from './crs';
import { AppError } from './errors';
import { readShapeType, type ShapeTypeInfo } from './shapeType';

export interface LoadOptions {
  onProgress: ProgressFn;
  /** Palette index for the first layer produced; further layers advance from here. */
  paletteStart: number;
}

/** Mutable accumulator shared across the layers produced by one drop. */
interface LoadContext {
  onProgress: ProgressFn;
  paletteIndex: number;
  warnings: LoadWarning[];
  layers: Layer[];
}

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return 'L' + Date.now().toString(36) + idCounter;
}

function readFileBuffer(file: File, onProgress: ProgressFn): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      // Reading is the first 45% of the bar; parsing takes it the rest of the way.
      if (ev.lengthComputable) void onProgress('Reading ' + file.name + '…', Math.round((ev.loaded / ev.total) * 45));
    };
    reader.onerror = () => reject(new Error('The file could not be read from disk.'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

/* ------------------------------------------------------------------ layer build */

function inferFieldTypes(features: ShapeFeature[]): Record<string, FieldType> {
  const fields: Record<string, FieldType> = {};
  for (const feature of features.slice(0, FIELD_SAMPLE_SIZE)) {
    const props: GeoJsonProperties = feature.properties || {};
    for (const key of Object.keys(props)) {
      const value = props[key];
      if (value === null || value === undefined || value === '') {
        fields[key] = fields[key] || 'Text';
        continue;
      }
      let type: FieldType = 'Text';
      if (typeof value === 'number') type = 'Number';
      else if (typeof value === 'boolean') type = 'Boolean';
      else if (value instanceof Date) type = 'Date';

      // A column with mixed types is only safely displayable as text.
      if (!fields[key]) fields[key] = type;
      else if (fields[key] !== type) fields[key] = 'Text';
    }
  }
  return fields;
}

function computeBbox(features: ShapeFeature[]): [number, number, number, number] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [x, y] = coords as number[];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return;
    }
    if (Array.isArray(coords)) coords.forEach(walk);
  };

  for (const feature of features) {
    if (!feature.geometry) continue;
    try {
      walk((feature.geometry as unknown as { coordinates: unknown }).coordinates);
    } catch {
      /* a malformed geometry should not sink the whole extent */
    }
  }

  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

function buildLayer(
  collection: FeatureCollection,
  name: string,
  size: number,
  prjText: string | null,
  shapeType: ShapeTypeInfo | null,
  ctx: LoadContext,
): void {
  const all = (collection && collection.features) || [];
  const valid = all.filter(
    (f) =>
      f &&
      f.geometry &&
      (f.geometry as unknown as { coordinates?: unknown[] }).coordinates &&
      ((f.geometry as unknown as { coordinates: unknown[] }).coordinates.length ?? 0) > 0,
  ) as ShapeFeature[];

  if (!all.length) {
    throw new AppError(
      'Empty dataset',
      '“' + name + '” parsed successfully but contains no features.',
    );
  }
  if (!valid.length) {
    throw new AppError(
      'Empty geometry',
      '“' + name + '” contains ' + all.length + ' record(s) but none of them have usable geometry.',
    );
  }

  valid.forEach((f, i) => {
    f.__fid = i;
  });

  const geojson: ShapeCollection = { type: 'FeatureCollection', features: valid };
  const crs = parseCrs(prjText);

  if (crs.unreadable) {
    ctx.warnings.push({
      title: 'Coordinate system not understood',
      message:
        'The .prj for “' +
        name +
        '” could not be interpreted by proj4, so the coordinates were used exactly as stored. ' +
        'If the layer lands in the wrong place, reproject it to WGS 84 before loading.',
    });
  }

  // shpjs reprojects when it can read the .prj. When it could not, coordinates arrive still
  // projected — metres, not degrees — which is easy to spot from the extent.
  let bbox = computeBbox(valid);
  if (bbox && !bboxLooksGeographic(bbox)) {
    if (crs.converter && reprojectToWgs84(geojson, crs.converter)) {
      bbox = computeBbox(valid);
      ctx.warnings.push({
        title: 'Reprojected to WGS 84',
        message:
          '“' + name + '” was stored in ' + crs.label + ' and has been reprojected to EPSG:4326 for display.',
      });
    } else {
      ctx.warnings.push({
        title: 'Coordinates are not longitude/latitude',
        message:
          '“' +
          name +
          '” has an extent outside the valid degree range and no usable .prj to reproject it with, ' +
          'so it will not line up with the basemap.',
      });
    }
  }

  const counts: Record<string, number> = {};
  for (const feature of valid) {
    const type = feature.geometry?.type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  }

  const palette = PALETTE[ctx.paletteIndex % PALETTE.length];
  ctx.paletteIndex += 1;

  ctx.layers.push({
    id: nextId(),
    name,
    size,
    visible: true,
    geojson,
    counts,
    shapeType,
    fields: inferFieldTypes(valid),
    crs: crs.label,
    epsg: crs.epsg,
    bbox,
    count: valid.length,
    style: { fill: palette.fill, stroke: palette.stroke, opacity: 0.45, weight: 2, radius: 7 },
  });
}

/* ------------------------------------------------------------------ zip archives */

async function loadZip(file: File, ctx: LoadContext): Promise<void> {
  await ctx.onProgress('Reading ' + file.name + '…', 5);
  const buffer = await readFileBuffer(file, ctx.onProgress);
  if (!buffer || buffer.byteLength === 0) {
    throw new AppError('Could not load that file', file.name + ' is empty (0 bytes).');
  }

  await ctx.onProgress('Inspecting archive…', 52);

  // Only the .zip path needs JSZip, so keep it out of the initial bundle.
  const { default: JSZipModule } = await import('jszip');

  let zip: JSZip;
  try {
    zip = await JSZipModule.loadAsync(buffer);
  } catch {
    throw new AppError(
      'Could not load that file',
      file.name + ' is not a readable .zip archive, or it is corrupt.',
    );
  }

  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const has = (ext: string) => names.some((n) => new RegExp('\\.' + ext + '$', 'i').test(n));

  if (!has('shp')) {
    throw new AppError(
      'Could not load that file',
      'No .shp file inside ' + file.name + '. The archive contains: ' + (names.join(', ') || 'nothing') + '.',
    );
  }
  if (!has('dbf')) {
    throw new AppError(
      'Could not load that file',
      'The archive is missing its .dbf file, so attributes cannot be read. ' +
        'A valid shapefile set needs .shp, .shx and .dbf together.',
    );
  }
  if (!has('shx')) {
    ctx.warnings.push({
      title: 'Heads up',
      message:
        'No .shx index found in ' +
        file.name +
        '. Geometry was read directly from the .shp, but some writers require the index — results may be incomplete.',
    });
  }

  let prjText: string | null = null;
  const prjName = names.find((n) => /\.prj$/i.test(n));
  if (prjName) {
    try {
      prjText = await zip.file(prjName)!.async('string');
    } catch {
      prjText = null;
    }
  }

  // shpjs's parseZip calls proj4(prj) without a try/catch, so an unreadable .prj would abort
  // the whole load. Drop it from the archive and carry on unprojected instead.
  let payload: ArrayBuffer | Uint8Array = buffer;
  const crs = parseCrs(prjText);
  if (prjName && crs.unreadable) {
    zip.remove(prjName);
    payload = await zip.generateAsync({ type: 'uint8array' });
  }

  await ctx.onProgress('Parsing geometry…', 65);

  let parsed;
  try {
    parsed = await shp(payload);
  } catch {
    throw new AppError(
      'Could not load that file',
      'The shapefile inside ' +
        file.name +
        ' could not be parsed — it may be corrupt or use an unsupported shape type.',
    );
  }

  const sets = Array.isArray(parsed) ? parsed : [parsed];
  await ctx.onProgress('Building layer…', 88);

  const shpEntries = names.filter((n) => /\.shp$/i.test(n));
  const baseOf = (path: string) => path.replace(/^.*[\\/]/, '').replace(/\.shp$/i, '').toLowerCase();

  for (let i = 0; i < sets.length; i += 1) {
    const set = sets[i];

    // Only the 100-byte header is wanted, but JSZip cannot inflate part of an entry, so this
    // costs one extra decompression of the .shp. Archives here are small enough for that.
    const entry =
      shpEntries.find((n) => baseOf(n) === (set.fileName || '').toLowerCase()) ?? shpEntries[i];
    let shapeType: ShapeTypeInfo | null = null;
    if (entry) {
      try {
        shapeType = readShapeType(await zip.file(entry)!.async('arraybuffer'));
      } catch {
        /* the geometry already parsed; a missing header reading is not worth failing over */
      }
    }

    buildLayer(
      set,
      sets.length > 1 ? set.fileName || file.name + ' #' + (i + 1) : file.name,
      file.size,
      prjText,
      shapeType,
      ctx,
    );
  }
}

/* ------------------------------------------------------------------ loose files */

async function loadLoose(files: File[], shpFiles: File[], ctx: LoadContext): Promise<void> {
  for (const shpFile of shpFiles) {
    const base = shpFile.name.replace(/\.shp$/i, '').toLowerCase();
    const sibling = (ext: string) => files.find((f) => f.name.toLowerCase() === base + '.' + ext);

    const dbfFile = sibling('dbf');
    const shxFile = sibling('shx');
    const prjFile = sibling('prj');
    const cpgFile = sibling('cpg');

    if (!dbfFile) {
      throw new AppError(
        'Could not load that file',
        '“' +
          shpFile.name +
          '” has no matching ' +
          base +
          '.dbf. Select the .shp, .shx and .dbf files together (⌘/Ctrl-click) so attributes can be read.',
      );
    }
    if (!shxFile) {
      ctx.warnings.push({
        title: 'Heads up',
        message:
          'No matching ' + base + '.shx index was selected. Geometry was read from the .shp directly.',
      });
    }

    await ctx.onProgress('Reading ' + shpFile.name + '…', 8);
    const shpBuf = await readFileBuffer(shpFile, ctx.onProgress);
    const dbfBuf = await readFileBuffer(dbfFile, ctx.onProgress);
    const prjText = prjFile ? await prjFile.text() : null;
    const cpgText = cpgFile ? await cpgFile.text() : undefined;

    if (!shpBuf || shpBuf.byteLength < 100) {
      throw new AppError(
        'Could not load that file',
        shpFile.name + ' is too small to be a valid shapefile — it may be truncated or corrupt.',
      );
    }

    await ctx.onProgress('Parsing geometry…', 66);
    const size =
      shpFile.size +
      dbfFile.size +
      (shxFile ? shxFile.size : 0) +
      (prjFile ? prjFile.size : 0) +
      (cpgFile ? cpgFile.size : 0);

    await ctx.onProgress('Building layer…', 90);
    buildLayer(
      await parseParts(shpBuf, dbfBuf, prjText, cpgText, shpFile.name),
      shpFile.name,
      size,
      prjText,
      readShapeType(shpBuf),
      ctx,
    );
  }
}

/**
 * shpjs's object form parses .shp + .dbf in one call, honouring the .cpg codepage and
 * reprojecting via the .prj. Shared by the loose-file drop and the bundled sample.
 */
async function parseParts(
  shpBuf: ArrayBuffer,
  dbfBuf: ArrayBuffer | undefined,
  prjText: string | null,
  cpgText: string | undefined,
  label: string,
): Promise<FeatureCollection> {
  try {
    const parsed = await shp({
      shp: shpBuf,
      dbf: dbfBuf,
      cpg: cpgText,
      prj: prjText ?? undefined,
    });
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    throw new AppError(
      'Could not load that file',
      label + ' could not be parsed — the file appears corrupt or uses an unsupported shape type.',
    );
  }
}

/* ------------------------------------------------------------------ entry points */

export async function loadFromFiles(files: File[], options: LoadOptions): Promise<LoadResult> {
  const ctx: LoadContext = {
    onProgress: options.onProgress,
    paletteIndex: options.paletteStart,
    warnings: [],
    layers: [],
  };

  const zips = files.filter((f) => /\.zip$/i.test(f.name));
  const shpFiles = files.filter((f) => /\.shp$/i.test(f.name));

  if (!zips.length && !shpFiles.length) {
    throw new AppError(
      'Unsupported file type',
      'ShapeView reads a .zip archive of a shapefile, or the loose .shp / .shx / .dbf / .prj files. ' +
        'Received: ' +
        files.map((f) => f.name).join(', ') +
        '.',
    );
  }

  for (const zipFile of zips) await loadZip(zipFile, ctx);
  if (shpFiles.length) await loadLoose(files, shpFiles, ctx);

  return { layers: ctx.layers, warnings: ctx.warnings };
}

/**
 * The bundled Group08_Station dataset, fetched and pushed through the exact same shpjs path
 * a dropped file takes — so the button demonstrates the real parser, not a canned object.
 */
export async function loadSample(options: LoadOptions): Promise<LoadResult> {
  const ctx: LoadContext = {
    onProgress: options.onProgress,
    paletteIndex: options.paletteStart,
    warnings: [],
    layers: [],
  };

  const base = import.meta.env.BASE_URL + 'sample/' + SAMPLE_BASENAME;
  await ctx.onProgress('Fetching sample dataset…', 20);

  const fetchPart = async (ext: string): Promise<ArrayBuffer | undefined> => {
    const response = await fetch(base + '.' + ext);
    if (!response.ok) return undefined;
    return response.arrayBuffer();
  };

  let shpBuf: ArrayBuffer | undefined;
  let dbfBuf: ArrayBuffer | undefined;
  let shxBuf: ArrayBuffer | undefined;
  let prjBuf: ArrayBuffer | undefined;
  let cpgBuf: ArrayBuffer | undefined;

  try {
    [shpBuf, dbfBuf, shxBuf, prjBuf, cpgBuf] = await Promise.all([
      fetchPart('shp'),
      fetchPart('dbf'),
      fetchPart('shx'),
      fetchPart('prj'),
      fetchPart('cpg'),
    ]);
  } catch {
    throw new AppError(
      'Sample data unavailable',
      'The bundled sample shapefile could not be fetched. Check that public/sample/' +
        SAMPLE_BASENAME +
        '.* was deployed alongside the app.',
    );
  }

  if (!shpBuf) {
    throw new AppError(
      'Sample data unavailable',
      'public/sample/' + SAMPLE_BASENAME + '.shp is missing from this build.',
    );
  }

  const decoder = new TextDecoder();
  const prjText = prjBuf ? decoder.decode(prjBuf) : null;
  const cpgText = cpgBuf ? decoder.decode(cpgBuf) : undefined;
  const name = SAMPLE_BASENAME + '.shp (sample)';

  await ctx.onProgress('Parsing geometry…', 66);
  const collection = await parseParts(shpBuf, dbfBuf, prjText, cpgText, name);

  await ctx.onProgress('Building layer…', 90);
  const size =
    shpBuf.byteLength +
    (dbfBuf?.byteLength ?? 0) +
    (shxBuf?.byteLength ?? 0) +
    (prjBuf?.byteLength ?? 0) +
    (cpgBuf?.byteLength ?? 0);

  buildLayer(collection, name, size, prjText, readShapeType(shpBuf), ctx);
  return { layers: ctx.layers, warnings: ctx.warnings };
}
