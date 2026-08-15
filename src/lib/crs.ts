import proj4 from 'proj4';
import type { Geometry, Position } from 'geojson';
import type { ShapeCollection } from '../types';

/**
 * CRS handling.
 *
 * shpjs already reprojects to WGS 84 when it can read the .prj — but it does so in two
 * different and both slightly unsafe ways:
 *
 *   - `parseZip` calls `proj4(prjString)` **uncaught**, so a .prj proj4 cannot parse throws
 *     and takes the whole archive load down with a misleading "corrupt shapefile" error.
 *   - the loose/object path (`fromObject`) swallows that error and sets `prj = false`, which
 *     silently leaves the coordinates in their source projection. Leaflet then drops the
 *     layer somewhere off the coast of Africa near (0, 0).
 *
 * So we parse the .prj ourselves first, and after parsing we sanity-check the extent and
 * reproject if the numbers clearly are not degrees.
 */

/** Minimal shape of what proj4() hands back; the bundled overloads are awkward to name. */
export interface LonLatConverter {
  /** WGS 84 -> source CRS. */
  forward(coords: number[]): number[];
  /** Source CRS -> WGS 84. */
  inverse(coords: number[]): number[];
}

export interface CrsInfo {
  /** Display label for the metadata panel. */
  label: string;
  /** EPSG code as a bare string ("4326"), when one could be determined. */
  epsg: string | null;
  hasPrj: boolean;
  /** Converter whose .inverse() maps source CRS -> WGS 84, or null when unusable. */
  converter: LonLatConverter | null;
  /** True when a .prj was present but proj4 could not make sense of it. */
  unreadable: boolean;
}

export const UNKNOWN_CRS: CrsInfo = {
  label: 'Unknown / assumed WGS 84 (no .prj)',
  epsg: null,
  hasPrj: false,
  converter: null,
  unreadable: false,
};

/**
 * True when the converter is a no-op, i.e. the source CRS is already WGS 84 geographic.
 * Needed because plenty of real .prj files — including ESRI's `GCS_WGS_1984` flavour, which
 * is what our own sample dataset ships — carry no AUTHORITY node to read an EPSG code from.
 */
function isIdentityToWgs84(converter: LonLatConverter): boolean {
  const probes: number[][] = [
    [0, 0],
    [10, 20],
    [-73.5, 45.5],
    [91.7876, 22.4716],
  ];
  try {
    return probes.every((p) => {
      const out = converter.inverse(p);
      return Math.abs(out[0] - p[0]) < 1e-7 && Math.abs(out[1] - p[1]) < 1e-7;
    });
  } catch {
    return false;
  }
}

/** Scrape a display name out of WKT, the way the design prototype did. */
function labelFromWkt(prj: string): { name: string; epsg: string | null } {
  const proj = /PROJCS\s*\[\s*"([^"]+)"/i.exec(prj);
  const geog = /GEOGCS\s*\[\s*"([^"]+)"/i.exec(prj);
  const authorities = prj.match(/AUTHORITY\s*\[\s*"EPSG"\s*,\s*"(\d+)"\s*\]/gi);

  let name = (proj && proj[1]) || (geog && geog[1]) || 'Defined in .prj';
  // WKT nests AUTHORITY nodes (datum, spheroid, unit...); the outermost CRS code is last.
  let epsg: string | null = null;
  if (authorities && authorities.length) {
    const last = /"(\d+)"/.exec(authorities[authorities.length - 1]);
    if (last) epsg = last[1];
  }
  if (epsg) name += ' (EPSG:' + epsg + ')';
  return { name, epsg };
}

export function parseCrs(prjText: string | null | undefined): CrsInfo {
  if (!prjText || !prjText.trim()) return UNKNOWN_CRS;

  const { name, epsg } = labelFromWkt(prjText);

  let converter: LonLatConverter | null = null;
  try {
    converter = proj4(prjText) as unknown as LonLatConverter;
  } catch {
    converter = null;
  }

  if (!converter) {
    return {
      label: name + ' — not understood by proj4',
      epsg,
      hasPrj: true,
      converter: null,
      unreadable: true,
    };
  }

  // Already lon/lat on WGS 84: nothing to reproject, and we can name the code ourselves.
  if (isIdentityToWgs84(converter)) {
    return {
      label: epsg ? name : name + ' (EPSG:4326)',
      epsg: epsg ?? '4326',
      hasPrj: true,
      converter: null,
      unreadable: false,
    };
  }

  return { label: name, epsg, hasPrj: true, converter, unreadable: false };
}

/** Longitude/latitude bounds, with a little slack for datasets that graze the antimeridian. */
export function bboxLooksGeographic(bbox: [number, number, number, number]): boolean {
  const [minX, minY, maxX, maxY] = bbox;
  return (
    minX >= -180.5 && maxX <= 180.5 && minY >= -90.5 && maxY <= 90.5
  );
}

function mapPositions(geometry: Geometry, fn: (p: Position) => Position): void {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((g) => mapPositions(g, fn));
    return;
  }
  const walk = (coords: unknown): unknown => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      return fn(coords as Position);
    }
    if (Array.isArray(coords)) return coords.map(walk);
    return coords;
  };
  const g = geometry as unknown as { coordinates: unknown };
  g.coordinates = walk(g.coordinates);
}

/**
 * Reproject every coordinate in place. Returns false if the converter blew up on the first
 * feature, in which case the collection is left untouched.
 */
export function reprojectToWgs84(
  collection: ShapeCollection,
  converter: LonLatConverter,
): boolean {
  try {
    for (const feature of collection.features) {
      if (!feature.geometry) continue;
      mapPositions(feature.geometry, (p) => {
        const out = converter.inverse([p[0], p[1]]);
        // Preserve Z/M if the shapefile carried them.
        return p.length > 2 ? [out[0], out[1], ...p.slice(2)] : [out[0], out[1]];
      });
    }
    return true;
  } catch {
    return false;
  }
}

/** Status-bar chip: the layer's EPSG code, or the assumption we are making instead. */
export function crsChip(epsg: string | null | undefined): string {
  if (epsg) return 'EPSG:' + epsg;
  return 'EPSG:4326 (assumed)';
}
