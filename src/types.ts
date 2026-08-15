import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

import type { ShapeTypeInfo } from './lib/shapeType';

/** Features carry a stable __fid so the map and the attribute table can address the same row. */
export type ShapeFeature = Feature<Geometry, GeoJsonProperties> & { __fid: number };

export interface ShapeCollection extends FeatureCollection<Geometry, GeoJsonProperties> {
  features: ShapeFeature[];
}

export interface LayerStyle {
  fill: string;
  stroke: string;
  opacity: number;
  weight: number;
  radius: number;
}

/** Inferred attribute-field type, shown as a badge in the metadata panel. */
export type FieldType = 'Text' | 'Number' | 'Boolean' | 'Date';

export interface Layer {
  id: string;
  name: string;
  /** Total bytes of the source file(s), for the metadata panel. */
  size: number;
  visible: boolean;
  geojson: ShapeCollection;
  /** GeoJSON geometry type -> number of features carrying it. */
  counts: Record<string, number>;
  /** Shape type from the .shp header — the file's own vocabulary, not GeoJSON's. */
  shapeType: ShapeTypeInfo | null;
  fields: Record<string, FieldType>;
  /** Human-readable CRS label, e.g. "WGS 84 (EPSG:4326)". */
  crs: string;
  /** Bare EPSG code when one could be determined, for the status-bar chip. */
  epsg: string | null;
  /** [minX, minY, maxX, maxY] in WGS 84, or null when no finite coordinates were found. */
  bbox: [number, number, number, number] | null;
  count: number;
  style: LayerStyle;
}

export interface Selection {
  layerId: string;
  fid: number;
}

export interface Cursor {
  lat: number;
  lng: number;
}

export type BasemapKey = 'light' | 'dark' | 'terrain' | 'imagery';

export interface BasemapConfig {
  label: string;
  url: string;
  sub: string;
  attr: string;
  max: number;
}

/** A non-fatal message: the load succeeded but something was missing or assumed. */
export interface LoadWarning {
  title: string;
  message: string;
}

export interface LoadResult {
  layers: Layer[];
  warnings: LoadWarning[];
}

/** Progress callback threaded through the loaders so the sidebar can show a bar. */
export type ProgressFn = (message: string, pct: number) => Promise<void> | void;
