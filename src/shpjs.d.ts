/**
 * Hand-written types for shpjs 6.x.
 *
 * `@types/shpjs` (3.4.7) is NOT usable here: it declares a CommonJS `export =`
 * namespace modelled on shpjs 3/4, where `parseShp` / `parseDbf` / `combine` hang
 * off the callable default export. shpjs 6.2.0 is ESM and exports them as named
 * bindings, and it also accepts a `{ shp, dbf, cpg, prj }` object form that the
 * DefinitelyTyped package does not describe at all.
 *
 * Surface below mirrors shpjs@6.2.0/lib/index.js.
 */
declare module 'shpjs' {
  import type {
    FeatureCollection,
    Geometry,
    GeoJsonProperties,
  } from 'geojson';

  /** Anything shpjs's toDataView/toUint8Array helpers accept. */
  type ShpBuffer = ArrayBuffer | ArrayBufferView | DataView;

  interface FeatureCollectionWithFilename extends FeatureCollection {
    fileName?: string;
  }

  type ShpResult =
    | FeatureCollectionWithFilename
    | FeatureCollectionWithFilename[];

  /** The `fromObject` form — parses loose parts in one call, honouring .cpg and .prj. */
  interface LooseParts {
    shp: ShpBuffer;
    dbf?: ShpBuffer;
    cpg?: ShpBuffer | string;
    prj?: ShpBuffer | string;
  }

  /**
   * Default export (`getShapefile`). Accepts a zip buffer, a base URL/path, or a
   * `{ shp, dbf, cpg, prj }` object.
   */
  export default function shp(
    base: string | ShpBuffer | LooseParts,
    whiteList?: readonly string[],
  ): Promise<ShpResult>;

  export function getShapefile(
    base: string | ShpBuffer | LooseParts,
    whiteList?: readonly string[],
  ): Promise<ShpResult>;

  export function parseZip(
    buffer: ShpBuffer,
    whiteList?: readonly string[],
  ): Promise<ShpResult>;

  export function parseShp(
    shp: ShpBuffer,
    prj?: ShpBuffer | string,
  ): Geometry[];

  export function parseDbf(
    dbf: ShpBuffer,
    cpg?: ShpBuffer | string,
  ): GeoJsonProperties[];

  export function combine(
    parts: [Geometry[], GeoJsonProperties[] | undefined],
  ): FeatureCollection;
}
