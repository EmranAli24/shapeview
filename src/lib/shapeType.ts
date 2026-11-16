
export const SHAPE_TYPES: Record<number, string> = {
  0: 'Null',
  1: 'Point',
  3: 'PolyLine',
  5: 'Polygon',
  8: 'MultiPoint',
  11: 'PointZ',
  13: 'PolyLineZ',
  15: 'PolygonZ',
  18: 'MultiPointZ',
  21: 'PointM',
  23: 'PolyLineM',
  25: 'PolygonM',
  28: 'MultiPointM',
  31: 'MultiPatch',
};

export interface ShapeTypeInfo {
  code: number;
  label: string;
}

const SHP_FILE_CODE = 9994;

export function readShapeType(buffer: ArrayBuffer | null | undefined): ShapeTypeInfo | null {
  if (!buffer || buffer.byteLength < 36) return null;

  const view = new DataView(buffer);
  if (view.getInt32(0, false) !== SHP_FILE_CODE) return null;

  const code = view.getInt32(32, true);
  const label = SHAPE_TYPES[code];
  return label ? { code, label } : null;
}
