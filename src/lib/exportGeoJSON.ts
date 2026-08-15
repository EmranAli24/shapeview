import type { Layer } from '../types';

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export { download };

/** Write the active layer out as GeoJSON, stripping the internal __fid we added. */
export function exportGeoJSON(layer: Layer): void {
  const clean = {
    type: 'FeatureCollection',
    features: layer.geojson.features.map((f) => ({
      type: 'Feature',
      properties: f.properties,
      geometry: f.geometry,
    })),
  };

  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/geo+json' });
  const filename =
    layer.name.replace(/\.(shp|zip)$/i, '').replace(/[^\w.-]+/g, '_') + '.geojson';

  download(blob, filename);
}
