import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

import type { ShapeTypeInfo } from './lib/shapeType';

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

export type FieldType = 'Text' | 'Number' | 'Boolean' | 'Date';

export interface Layer {
  id: string;
  name: string;
  size: number;
  visible: boolean;
  geojson: ShapeCollection;
  counts: Record<string, number>;
  shapeType: ShapeTypeInfo | null;
  fields: Record<string, FieldType>;
  crs: string;
  epsg: string | null;
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

export interface LoadWarning {
  title: string;
  message: string;
}

export interface LoadResult {
  layers: Layer[];
  warnings: LoadWarning[];
}

export type ProgressFn = (message: string, pct: number) => Promise<void> | void;
