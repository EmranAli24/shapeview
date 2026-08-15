/**
 * The shape type recorded in the .shp header, which is a different vocabulary from the GeoJSON
 * geometry types the rest of the app works in.
 *
 * shpjs hands us GeoJSON, so every other geometry label in the UI says things like "MultiPolygon"
 * — a type the shapefile specification does not have at all. Reading byte 32 of the header gives
 * the file's own answer, so the metadata panel can show both without either being mistaken for
 * the other.
 */

/** Shape type codes from the ESRI Shapefile Technical Description (July 1998). */
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
  /** The raw code, e.g. 5. */
  code: number;
  /** Its name in the specification, e.g. "Polygon". */
  label: string;
}

/** File code that opens every .shp, stored big-endian. */
const SHP_FILE_CODE = 9994;

/**
 * Read the shape type out of a .shp header, or null when the buffer is not a shapefile.
 *
 * The header is deliberately mixed-endian: the file code and length are big-endian, while the
 * version and shape type that follow them are little-endian.
 */
export function readShapeType(buffer: ArrayBuffer | null | undefined): ShapeTypeInfo | null {
  if (!buffer || buffer.byteLength < 36) return null;

  const view = new DataView(buffer);
  if (view.getInt32(0, false) !== SHP_FILE_CODE) return null;

  const code = view.getInt32(32, true);
  const label = SHAPE_TYPES[code];
  return label ? { code, label } : null;
}
