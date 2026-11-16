import type { BasemapConfig, BasemapKey } from './types';

export const GEOM_COLORS: Record<string, string> = {
  Point: '#2563eb',
  MultiPoint: '#7c3aed',
  LineString: '#0891b2',
  MultiLineString: '#0d9488',
  Polygon: '#ea580c',
  MultiPolygon: '#db2777',
  GeometryCollection: '#64748b',
  Unknown: '#64748b',
};

export const PALETTE: { fill: string; stroke: string }[] = [
  { fill: '#2f6feb', stroke: '#1b4ba8' },
  { fill: '#ea580c', stroke: '#9a3412' },
  { fill: '#0d9488', stroke: '#115e59' },
  { fill: '#7c3aed', stroke: '#4c1d95' },
  { fill: '#db2777', stroke: '#9d174d' },
];

// Esri/OSM tiles send CORS headers, which PNG export needs
export const BASEMAPS: Record<BasemapKey, BasemapConfig> = {
  light: {
    label: 'LIGHT',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    sub: 'abc',
    attr: 'Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors',
    max: 16,
  },
  dark: {
    label: 'DARK',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    sub: 'abc',
    attr: 'Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors',
    max: 16,
  },
  terrain: {
    label: 'TERRAIN',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    sub: 'abc',
    attr: 'Tiles &copy; Esri',
    max: 13,
  },
  imagery: {
    label: 'IMAGERY',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    sub: 'abc',
    attr: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    max: 19,
  },
};

export const BASEMAP_KEYS = Object.keys(BASEMAPS) as BasemapKey[];

export const DARK_BASEMAPS: BasemapKey[] = ['dark', 'imagery'];

export const MEASURE_COLORS = {
  light: {
    line: '#c2410c',
    fill: '#f97316',
    vertex: '#ffffff',
    label: '#7c2d12',
    labelBg: 'rgba(255,255,255,.92)',
  },
  dark: {
    line: '#fb923c',
    fill: '#fb923c',
    vertex: '#111827',
    label: '#fed7aa',
    labelBg: 'rgba(17,24,39,.88)',
  },
};

export const HOME_VIEW = { center: [22.4716, 91.7876] as [number, number], zoom: 13 };

// cap rendered rows so big files do not freeze the page
export const MAX_TABLE_ROWS = 3000;

export const FIELD_SAMPLE_SIZE = 400;

export const SAMPLE_BASENAME = 'Group08_Station';
