import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';

import { MEASURE_COLORS } from '../constants';
import {
  AREA_UNITS,
  LENGTH_UNITS,
  formatArea,
  formatLength,
  pathLength,
  polygonArea,
  polygonPerimeter,
  unitSuffix,
  type Point,
} from '../lib/measure';
import type { Layer } from '../types';

export type MeasureTool = 'distance' | 'area' | 'location';

const PANE = 'sv-measure';
const PANE_Z = '655';

// hold a click briefly so a double-click can finish the shape instead
const CLICK_DELAY = 220;

export interface MeasureResult {
  length?: number;
  area?: number;
  perimeter?: number;
  point?: Point;
}

export interface UseMeasureResult {
  tool: MeasureTool | null;
  setTool: (tool: MeasureTool | null) => void;
  points: Point[];
  finished: boolean;
  result: MeasureResult;
  lengthUnit: string;
  setLengthUnit: (id: string) => void;
  areaUnit: string;
  setAreaUnit: (id: string) => void;
  undo: () => void;
  clear: () => void;
}

interface Draft {
  points: Point[];
  finished: boolean;
}

const EMPTY: Draft = { points: [], finished: false };

export function useMeasure(
  map: L.Map | null,
  layers: Layer[],
  darkBasemap: boolean,
): UseMeasureResult {
  const [tool, setToolState] = useState<MeasureTool | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [live, setLive] = useState<Point | null>(null);
  const [lengthUnit, setLengthUnit] = useState('m');
  const [areaUnit, setAreaUnit] = useState('m2');

  const group = useRef<L.LayerGroup | null>(null);
  const shape = useRef<L.Layer | null>(null);
  const rubber = useRef<L.Polyline | null>(null);
  const tip = useRef<L.Marker | null>(null);
  const vertices = useRef<L.LayerGroup | null>(null);

  const clickTimer = useRef<number | null>(null);
  const moveRaf = useRef<number | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const colors = darkBasemap ? MEASURE_COLORS.dark : MEASURE_COLORS.light;

  const setTool = useCallback((next: MeasureTool | null) => {
    setToolState(next);
    setDraft(EMPTY);
    setLive(null);
  }, []);

  const clear = useCallback(() => {
    setDraft(EMPTY);
    setLive(null);
  }, []);

  const undo = useCallback(() => {
    setDraft((d) => ({ points: d.points.slice(0, -1), finished: false }));
  }, []);

  const result = useMemo<MeasureResult>(() => {
    const { points, finished } = draft;
    const withLive = !finished && live ? [...points, live] : points;

    if (tool === 'location') return { point: points[0] };
    if (tool === 'distance') return { length: pathLength(withLive) };
    if (tool === 'area') {
      return {
        area: polygonArea(withLive),
        perimeter: withLive.length >= 3 ? polygonPerimeter(withLive) : pathLength(withLive),
      };
    }
    return {};
  }, [tool, draft, live]);

  useEffect(() => {
    if (!map || !tool) return;

    const container = map.getContainer();
    container.classList.add('sv-measuring');
    map.doubleClickZoom.disable();

    const commit = (latlng: L.LatLng) => {
      const point: Point = { lat: latlng.lat, lng: latlng.lng };
      if (toolRef.current === 'location') {
        setDraft({ points: [point], finished: true });
        return;
      }
      setDraft((d) => (d.finished ? { points: [point], finished: false } : {
        points: [...d.points, point],
        finished: false,
      }));
    };

    const onClick = (e: L.LeafletMouseEvent) => {
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
      const latlng = e.latlng;
      clickTimer.current = window.setTimeout(() => {
        clickTimer.current = null;
        commit(latlng);
      }, CLICK_DELAY);
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      if (clickTimer.current !== null) {
        window.clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      const point: Point = { lat: e.latlng.lat, lng: e.latlng.lng };
      setDraft((d) => {
        if (d.finished || toolRef.current === 'location') return d;
        const last = d.points[d.points.length - 1];
        const repeat =
          last && Math.abs(last.lat - point.lat) < 1e-9 && Math.abs(last.lng - point.lng) < 1e-9;
        const points = repeat ? d.points : [...d.points, point];
        return points.length ? { points, finished: true } : d;
      });
      setLive(null);
    };

    const onMove = (e: L.LeafletMouseEvent) => {
      if (draftRef.current.finished || toolRef.current === 'location') return;
      if (moveRaf.current !== null) return;
      const latlng = e.latlng;
      moveRaf.current = requestAnimationFrame(() => {
        moveRaf.current = null;
        setLive({ lat: latlng.lat, lng: latlng.lng });
      });
    };

    const onLeave = () => setLive(null);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolState(null);
        setDraft(EMPTY);
        setLive(null);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDraft((d) => ({ points: d.points.slice(0, -1), finished: false }));
      }
    };

    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      document.removeEventListener('keydown', onKeyDown);

      if (clickTimer.current !== null) {
        window.clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      if (moveRaf.current !== null) {
        cancelAnimationFrame(moveRaf.current);
        moveRaf.current = null;
      }

      container.classList.remove('sv-measuring');
      map.doubleClickZoom.enable();
    };
  }, [map, tool]);

  useEffect(() => {
    if (!map) return;
    const panes = layers
      .map((l) => map.getPane('sv-' + l.id))
      .filter((p): p is HTMLElement => !!p);

    // let clicks fall through feature layers while a tool is active
    for (const pane of panes) pane.style.pointerEvents = tool ? 'none' : '';

    return () => {
      // restore feature clicks when the tool is turned off
      for (const pane of panes) pane.style.pointerEvents = '';
    };
  }, [map, tool, layers]);

  useEffect(() => {
    if (!map) return;

    if (!map.getPane(PANE)) {
      map.createPane(PANE);
      const pane = map.getPane(PANE);
      if (pane) pane.style.zIndex = PANE_Z;
    }
    group.current = L.layerGroup([], { pane: PANE }).addTo(map);
    vertices.current = L.layerGroup([], { pane: PANE }).addTo(group.current);

    return () => {
      if (group.current) map.removeLayer(group.current);
      group.current = null;
      vertices.current = null;
      shape.current = null;
      rubber.current = null;
      tip.current = null;
      // remove the pane element by hand (no removePane in Leaflet)
      map.getPane(PANE)?.remove();
    };
  }, [map]);

  useEffect(() => {
    const parent = group.current;
    const vertexGroup = vertices.current;
    if (!map || !parent || !vertexGroup) return;

    vertexGroup.clearLayers();
    if (shape.current) {
      parent.removeLayer(shape.current);
      shape.current = null;
    }

    const { points } = draft;
    if (!tool || !points.length) return;

    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));

    if (tool !== 'location' && latlngs.length >= 2) {
      const drawn: L.Layer =
        tool === 'area'
          ? L.polygon(latlngs, {
              pane: PANE,
              color: colors.line,
              weight: 2,
              fillColor: colors.fill,
              fillOpacity: 0.18,
              interactive: false,
            })
          : L.polyline(latlngs, {
              pane: PANE,
              color: colors.line,
              weight: 3,
              interactive: false,
            });
      shape.current = drawn;
      parent.addLayer(drawn);
    }

    latlngs.forEach((latlng, i) => {
      vertexGroup.addLayer(
        L.circleMarker(latlng, {
          pane: PANE,
          radius: i === 0 && tool !== 'location' ? 5 : 4,
          color: colors.line,
          weight: 2,
          fillColor: colors.vertex,
          fillOpacity: 1,
          interactive: false,
        }),
      );
    });
  }, [map, tool, draft, colors]);

  useEffect(() => {
    const parent = group.current;
    if (!map || !parent) return;

    const { points, finished } = draft;
    const drawing = !!tool && tool !== 'location' && !finished && !!live && points.length > 0;

    if (!drawing) {
      if (rubber.current) {
        parent.removeLayer(rubber.current);
        rubber.current = null;
      }
      if (tip.current) {
        parent.removeLayer(tip.current);
        tip.current = null;
      }
      return;
    }

    const from = points[points.length - 1];
    const band: L.LatLngExpression[] = [
      [from.lat, from.lng],
      [live!.lat, live!.lng],
    ];
    if (tool === 'area' && points.length >= 2) band.push([points[0].lat, points[0].lng]);

    if (rubber.current) {
      rubber.current.setLatLngs(band);
    } else {
      rubber.current = L.polyline(band, {
        pane: PANE,
        color: colors.line,
        weight: 2,
        dashArray: '5,5',
        opacity: 0.9,
        interactive: false,
      });
      parent.addLayer(rubber.current);
    }

    const text =
      tool === 'area'
        ? formatArea(result.area ?? 0, areaUnit) + ' ' + unitSuffix(AREA_UNITS, areaUnit)
        : formatLength(result.length ?? 0, lengthUnit) + ' ' + unitSuffix(LENGTH_UNITS, lengthUnit);

    const html =
      '<span style="background:' +
      colors.labelBg +
      ';color:' +
      colors.label +
      ';font:600 11px/1.4 \'IBM Plex Mono\',monospace;padding:3px 6px;border-radius:4px;' +
      'white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)">' +
      text +
      '</span>';

    const icon = L.divIcon({ className: '', html, iconAnchor: [-12, 26] });
    if (tip.current) {
      tip.current.setLatLng([live!.lat, live!.lng]);
      tip.current.setIcon(icon);
    } else {
      tip.current = L.marker([live!.lat, live!.lng], {
        pane: PANE,
        icon,
        interactive: false,
        keyboard: false,
      });
      parent.addLayer(tip.current);
    }
  }, [map, tool, draft, live, colors, result, lengthUnit, areaUnit]);

  return {
    tool,
    setTool,
    points: draft.points,
    finished: draft.finished,
    result,
    lengthUnit,
    setLengthUnit,
    areaUnit,
    setAreaUnit,
    undo,
    clear,
  };
}
