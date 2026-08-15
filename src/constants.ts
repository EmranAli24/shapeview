import type { BasemapConfig, BasemapKey } from './types';

/** Badge colour per GeoJSON geometry type, shown on each layer card. */
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

/** Cycled through as layers are added so consecutive layers never share a colour. */
export const PALETTE: { fill: string; stroke: string }[] = [
  { fill: '#2f6feb', stroke: '#1b4ba8' },
  { fill: '#ea580c', stroke: '#9a3412' },
  { fill: '#0d9488', stroke: '#115e59' },
  { fill: '#7c3aed', stroke: '#4c1d95' },
  { fill: '#db2777', stroke: '#9d174d' },
];

export const BASEMAPS: Record<BasemapKey, BasemapConfig> = {
  light: {
    label: 'LIGHT',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    sub: 'abcd',
    attr: '&copy; OpenStreetMap contributors &copy; CARTO',
    max: 19,
  },
  dark: {
    label: 'DARK',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    sub: 'abcd',
    attr: '&copy; OpenStreetMap contributors &copy; CARTO',
    max: 19,
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

/** Basemaps whose tiles are dark, so overlaid chrome flips to light-on-dark. */
export const DARK_BASEMAPS: BasemapKey[] = ['dark', 'imagery'];

/**
 * Measurement graphics, keyed on whether the *tiles* underneath are dark — same rule as the
 * graticule, and nothing to do with the UI theme. Amber, so it never reads as layer symbology:
 * PALETTE leads with blue and the geometry badges own the rest of the spectrum.
 */
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

/** University of Chittagong campus — the sample dataset sits here. */
export const HOME_VIEW = { center: [22.4716, 91.7876] as [number, number], zoom: 13 };

/** Rendering every row of a large shapefile locks the main thread; the map still shows all of them. */
export const MAX_TABLE_ROWS = 3000;

/** Attribute types are inferred from a sample, not the whole file. */
export const FIELD_SAMPLE_SIZE = 400;

export const SAMPLE_BASENAME = 'Group08_Station';
