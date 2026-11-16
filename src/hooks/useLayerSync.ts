import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';

import type { Layer, Selection, ShapeFeature } from '../types';

interface GroupEntry {
  group: L.GeoJSON;
  index: Record<number, L.Layer>;
  paneName: string;
  added: boolean;
}

const FIT_OPTIONS: L.FitBoundsOptions = { padding: [40, 40], maxZoom: 17 };

function styleFor(layer: Layer, selected: boolean): L.PathOptions {
  const { style } = layer;
  return {
    color: selected ? '#111827' : style.stroke,
    weight: selected ? style.weight + 2 : style.weight,
    opacity: 1,
    fillColor: style.fill,
    fillOpacity: selected ? Math.min(1, style.opacity + 0.3) : style.opacity,
  };
}

export interface UseLayerSyncResult {
  zoomToLayer: (layerId: string) => void;
  zoomToFeature: (layerId: string, fid: number) => void;
}

export function useLayerSync(
  map: L.Map | null,
  layers: Layer[],
  selected: Selection | null,
  onSelectFromMap: (layerId: string, fid: number) => void,
): UseLayerSyncResult {
  const groups = useRef<Record<string, GroupEntry>>({});
  const pendingFit = useRef<string | null>(null);

  const selectRef = useRef(onSelectFromMap);
  selectRef.current = onSelectFromMap;

  useEffect(() => {
    if (!map) return;

    const live = new Set(layers.map((l) => l.id));

    for (const id of Object.keys(groups.current)) {
      if (!live.has(id)) {
        const entry = groups.current[id];
        map.removeLayer(entry.group);
        // Leaflet has no removePane(), so remove the element ourselves
        map.getPane(entry.paneName)?.remove();
        delete groups.current[id];
      }
    }

    layers.forEach((layer, index) => {
      let entry = groups.current[layer.id];

      if (!entry) {
        const paneName = 'sv-' + layer.id;
        if (!map.getPane(paneName)) map.createPane(paneName);

        const featureIndex: Record<number, L.Layer> = {};
        const group = L.geoJSON(layer.geojson, {
          pane: paneName,
          pointToLayer: (_feature, latlng) =>
            L.circleMarker(latlng, { pane: paneName, radius: layer.style.radius }),
          style: () => styleFor(layer, false),
          onEachFeature: (feature, leafletLayer) => {
            const fid = (feature as ShapeFeature).__fid;
            featureIndex[fid] = leafletLayer;
            leafletLayer.on('click', (e: L.LeafletMouseEvent) => {
              if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
              selectRef.current(layer.id, fid);
            });
          },
        });

        entry = groups.current[layer.id] = { group, index: featureIndex, paneName, added: false };
        pendingFit.current = layer.id;
      }

      const pane = map.getPane(entry.paneName);
      if (pane) pane.style.zIndex = String(500 + (layers.length - index));

      if (layer.visible && !entry.added) {
        entry.group.addTo(map);
        entry.added = true;
      } else if (!layer.visible && entry.added) {
        map.removeLayer(entry.group);
        entry.added = false;
      }

      entry.group.eachLayer((leafletLayer) => {
        const feature = (leafletLayer as L.Layer & { feature?: ShapeFeature }).feature;
        const fid = feature?.__fid;
        const isSelected =
          !!selected && selected.layerId === layer.id && selected.fid === fid;

        const path = leafletLayer as L.Path & { setRadius?: (r: number) => void };
        if (path.setStyle) path.setStyle(styleFor(layer, isSelected));
        if (path.setRadius) path.setRadius(isSelected ? layer.style.radius * 1.7 : layer.style.radius);
        if (isSelected && path.bringToFront) path.bringToFront();
      });
    });

    if (pendingFit.current && groups.current[pendingFit.current]) {
      const target = groups.current[pendingFit.current].group;
      pendingFit.current = null;
      try {
        const bounds = target.getBounds();
        if (bounds && bounds.isValid()) map.fitBounds(bounds, FIT_OPTIONS);
      } catch {
      }
    }
  }, [map, layers, selected]);

  const zoomToLayer = useCallback(
    (layerId: string) => {
      const entry = groups.current[layerId];
      if (!entry || !map) return;
      try {
        map.fitBounds(entry.group.getBounds(), FIT_OPTIONS);
      } catch {
      }
    },
    [map],
  );

  const zoomToFeature = useCallback(
    (layerId: string, fid: number) => {
      const entry = groups.current[layerId];
      const target = entry && entry.index[fid];
      if (!target || !map) return;

      const point = target as L.Layer & { getLatLng?: () => L.LatLng };
      const shape = target as L.Layer & { getBounds?: () => L.LatLngBounds };

      if (point.getLatLng) {
        map.setView(point.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
      } else if (shape.getBounds) {
        map.fitBounds(shape.getBounds(), { padding: [60, 60], maxZoom: 17 });
      }
    },
    [map],
  );

  return { zoomToLayer, zoomToFeature };
}
