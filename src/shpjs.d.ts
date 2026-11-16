declare module 'shpjs' {
  import type {
    FeatureCollection,
    Geometry,
    GeoJsonProperties,
  } from 'geojson';

  type ShpBuffer = ArrayBuffer | ArrayBufferView | DataView;

  interface FeatureCollectionWithFilename extends FeatureCollection {
    fileName?: string;
  }

  type ShpResult =
    | FeatureCollectionWithFilename
    | FeatureCollectionWithFilename[];

  interface LooseParts {
    shp: ShpBuffer;
    dbf?: ShpBuffer;
    cpg?: ShpBuffer | string;
    prj?: ShpBuffer | string;
  }

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
