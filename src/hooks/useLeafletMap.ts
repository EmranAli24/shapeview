import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

import { BASEMAPS, DARK_BASEMAPS, HOME_VIEW } from '../constants';
import type { BasemapKey, Cursor } from '../types';

/** Scale-bar candidates, in metres. */
const NICE_STEPS = [
  1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 250000,
  500000, 1000000,
];

/** Graticule spacing candidates, in degrees. */
const GRATICULE_STEPS = [10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];

const MAX_SCALE_BAR_PX = 130;

export interface MapReadout {
  zoom: number;
  /** Pixel width of the scale bar. */
  scalePx: number;
  scaleLabel: string;
}

export interface UseLeafletMapResult {
  mapRef: React.RefObject<HTMLDivElement | null>;
  map: L.Map | null;
  readout: MapReadout;
  cursor: Cursor | null;
  /** Attribution HTML of the basemap currently displayed, for the PNG caption. */
  attribution: string;
  invalidateSoon: () => void;
}

export function useLeafletMap(
  basemap: BasemapKey,
  graticule: boolean,
  onBackgroundClick: () => void,
): UseLeafletMapResult {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const baseTiles = useRef<L.TileLayer | null>(null);
  const gratLayer = useRef<L.LayerGroup | null>(null);
  const cursorRaf = useRef<number | null>(null);

  // Read inside Leaflet event handlers, which are bound once and would otherwise close over
  // the first render's values.
  const basemapRef = useRef(basemap);
  const graticuleRef = useRef(graticule);
  const backgroundClickRef = useRef(onBackgroundClick);
  basemapRef.current = basemap;
  graticuleRef.current = graticule;
  backgroundClickRef.current = onBackgroundClick;

  const [map, setMap] = useState<L.Map | null>(null);
  const [readout, setReadout] = useState<MapReadout>({
    zoom: HOME_VIEW.zoom,
    scalePx: 80,
    scaleLabel: '—',
  });
  const [cursor, setCursor] = useState<Cursor | null>(null);

  const drawGraticule = useRef<() => void>(() => {});

  drawGraticule.current = () => {
    const instance = mapInstance.current;
    const layer = gratLayer.current;
    if (!instance || !layer) return;

    layer.clearLayers();
    if (!graticuleRef.current) return;

    const bounds = instance.getBounds();
    const span = Math.max(
      bounds.getEast() - bounds.getWest(),
      bounds.getNorth() - bounds.getSouth(),
    );

    // Coarsest spacing that still yields at least three lines across the viewport.
    let step = GRATICULE_STEPS[GRATICULE_STEPS.length - 1];
    for (const candidate of GRATICULE_STEPS) {
      if (span / candidate >= 3) {
        step = candidate;
        break;
      }
    }

    const dark = DARK_BASEMAPS.includes(basemapRef.current);
    const lineOptions: L.PolylineOptions = {
      pane: 'sv-graticule',
      color: dark ? '#ffffff' : '#1f2937',
      weight: 0.6,
      opacity: 0.28,
      interactive: false,
    };
    const format = (v: number) => (Math.round(v * 1e4) / 1e4).toFixed(step < 0.01 ? 3 : 2);
    const label = (text: string) =>
      '<span style="font:500 9px/1 \'IBM Plex Mono\',monospace;color:' +
      (dark ? '#e5e7eb' : '#475467') +
      ';background:' +
      (dark ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.75)') +
      ';padding:2px 4px;border-radius:3px;white-space:nowrap">' +
      text +
      '</span>';

    for (let x = Math.floor(bounds.getWest() / step) * step; x <= bounds.getEast(); x += step) {
      layer.addLayer(
        L.polyline([[bounds.getSouth(), x], [bounds.getNorth(), x]], lineOptions),
      );
      layer.addLayer(
        L.marker([bounds.getSouth(), x], {
          pane: 'sv-graticule',
          interactive: false,
          icon: L.divIcon({ className: '', html: label(format(x) + '°E'), iconAnchor: [-4, 46] }),
        }),
      );
    }

    for (let y = Math.floor(bounds.getSouth() / step) * step; y <= bounds.getNorth(); y += step) {
      layer.addLayer(
        L.polyline([[y, bounds.getWest()], [y, bounds.getEast()]], lineOptions),
      );
      layer.addLayer(
        L.marker([y, bounds.getWest()], {
          pane: 'sv-graticule',
          interactive: false,
          icon: L.divIcon({ className: '', html: label(format(y) + '°N'), iconAnchor: [-6, 6] }),
        }),
      );
    }
  };

  /* ---------- init ---------- */
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const instance = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(HOME_VIEW.center, HOME_VIEW.zoom);

    mapInstance.current = instance;

    instance.createPane('sv-graticule');
    const pane = instance.getPane('sv-graticule');
    if (pane) pane.style.zIndex = '390';
    gratLayer.current = L.layerGroup([], { pane: 'sv-graticule' }).addTo(instance);

    const refresh = () => {
      const center = instance.getCenter();
      // Web Mercator ground resolution at this latitude and zoom.
      const metresPerPixel =
        (40075016.686 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, instance.getZoom() + 8);

      let pick = NICE_STEPS[0];
      NICE_STEPS.forEach((step) => {
        if (step / metresPerPixel <= MAX_SCALE_BAR_PX) pick = step;
      });

      setReadout({
        zoom: Math.round(instance.getZoom() * 10) / 10,
        scalePx: Math.max(24, Math.round(pick / metresPerPixel)),
        scaleLabel: pick >= 1000 ? pick / 1000 + ' km' : pick + ' m',
      });
      drawGraticule.current();
    };

    instance.on('moveend zoomend', refresh);
    instance.on('mousemove', (e: L.LeafletMouseEvent) => {
      // Pointer moves fire far faster than React can usefully re-render.
      if (cursorRaf.current !== null) return;
      cursorRaf.current = requestAnimationFrame(() => {
        cursorRaf.current = null;
        setCursor({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    });
    instance.on('mouseout', () => setCursor(null));
    instance.on('click', () => backgroundClickRef.current());

    refresh();
    setMap(instance);

    // The container is still settling into the flex layout on first paint.
    const settle = setTimeout(() => {
      instance.invalidateSize();
      refresh();
    }, 200);

    return () => {
      clearTimeout(settle);
      if (cursorRaf.current !== null) cancelAnimationFrame(cursorRaf.current);
      instance.remove();
      mapInstance.current = null;
      gratLayer.current = null;
      baseTiles.current = null;
      setMap(null);
    };
  }, []);

  /* ---------- basemap ---------- */
  useEffect(() => {
    const instance = mapInstance.current;
    if (!instance) return;

    const config = BASEMAPS[basemap] ?? BASEMAPS.light;
    if (baseTiles.current) instance.removeLayer(baseTiles.current);

    baseTiles.current = L.tileLayer(config.url, {
      maxZoom: 19,
      maxNativeZoom: config.max,
      subdomains: config.sub,
      crossOrigin: true,
      attribution: config.attr,
    });
    baseTiles.current.addTo(instance);
    baseTiles.current.bringToBack();

    // Graticule contrast depends on whether the basemap underneath is dark.
    drawGraticule.current();
  }, [basemap, map]);

  /* ---------- graticule ---------- */
  useEffect(() => {
    drawGraticule.current();
  }, [graticule, map]);

  const invalidateSoon = () => {
    setTimeout(() => mapInstance.current?.invalidateSize(), 260);
  };

  return {
    mapRef,
    map,
    readout,
    cursor,
    attribution: (BASEMAPS[basemap] ?? BASEMAPS.light).attr,
    invalidateSoon,
  };
}
