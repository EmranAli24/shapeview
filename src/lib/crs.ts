import proj4 from 'proj4';
import type { Geometry, Position } from 'geojson';
import type { ShapeCollection } from '../types';

export interface LonLatConverter {
  forward(coords: number[]): number[];
  inverse(coords: number[]): number[];
}

export interface CrsInfo {
  label: string;
  epsg: string | null;
  hasPrj: boolean;
  converter: LonLatConverter | null;
  unreadable: boolean;
}

export const UNKNOWN_CRS: CrsInfo = {
  label: 'Unknown / assumed WGS 84 (no .prj)',
  epsg: null,
  hasPrj: false,
  converter: null,
  unreadable: false,
};

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

function labelFromWkt(prj: string): { name: string; epsg: string | null } {
  const proj = /PROJCS\s*\[\s*"([^"]+)"/i.exec(prj);
  const geog = /GEOGCS\s*\[\s*"([^"]+)"/i.exec(prj);
  const authorities = prj.match(/AUTHORITY\s*\[\s*"EPSG"\s*,\s*"(\d+)"\s*\]/gi);

  let name = (proj && proj[1]) || (geog && geog[1]) || 'Defined in .prj';
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

export function reprojectToWgs84(
  collection: ShapeCollection,
  converter: LonLatConverter,
): boolean {
  try {
    for (const feature of collection.features) {
      if (!feature.geometry) continue;
      mapPositions(feature.geometry, (p) => {
        const out = converter.inverse([p[0], p[1]]);
        return p.length > 2 ? [out[0], out[1], ...p.slice(2)] : [out[0], out[1]];
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function crsChip(epsg: string | null | undefined): string {
  if (epsg) return 'EPSG:' + epsg;
  return 'EPSG:4326 (assumed)';
}
