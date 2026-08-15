import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AboutDialog } from './components/AboutDialog';
import { AttributeTable } from './components/AttributeTable';
import { MapChrome } from './components/MapChrome';
import { MeasurePanel } from './components/MeasurePanel';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { useLayerSync } from './hooks/useLayerSync';
import { useLeafletMap } from './hooks/useLeafletMap';
import { useMeasure } from './hooks/useMeasure';
import { useTheme } from './hooks/useTheme';
import { crsChip } from './lib/crs';
import { errorMessageOf, errorTitleOf } from './lib/errors';
import { exportGeoJSON } from './lib/exportGeoJSON';
import { exportMapPng } from './lib/exportPng';
import { fmtVal } from './lib/format';
import { loadFromFiles, loadSample } from './lib/loadShapefile';
import type {
  BasemapKey,
  Layer,
  LayerStyle,
  LoadResult,
  LoadWarning,
  Selection,
} from './types';
import { DARK_BASEMAPS } from './constants';
import { COURSE, GROUP_LABEL, INSTITUTION } from './team';

const NARROW_BREAKPOINT = 980;
const SHORT_VIEWPORT = 620;

interface AppError {
  title: string;
  message: string;
}

export default function App() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [warnings, setWarnings] = useState<LoadWarning[]>([]);

  const [tableOpen, setTableOpen] = useState(() => window.innerHeight >= SHORT_VIEWPORT);
  const [search, setSearch] = useState('');
  // Field and direction move together: updating them separately means a nested state update,
  // which React is free to invoke more than once and would flip the direction twice.
  const [sort, setSort] = useState<{ field: string | null; dir: 1 | -1 }>({
    field: null,
    dir: 1,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT);
  const [dragOver, setDragOver] = useState(false);

  const [basemap, setBasemap] = useState<BasemapKey>('light');
  const [graticule, setGraticule] = useState(false);

  const [aboutOpen, setAboutOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const dark = theme === 'dark';

  const tableRef = useRef<HTMLDivElement | null>(null);
  /** Advances per layer so consecutive layers never share a palette entry. */
  const paletteSeq = useRef(0);

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeId) ?? null,
    [layers, activeId],
  );

  /**
   * Written after useMeasure returns, read inside callbacks that Leaflet binds once. A map click
   * while a measurement tool is armed is placing a vertex, not clearing a selection.
   */
  const measuringRef = useRef(false);

  const clearSelection = useCallback(() => {
    if (measuringRef.current) return;
    setSelected(null);
  }, []);

  const { mapRef, map, readout, cursor, attribution, invalidateSoon } = useLeafletMap(
    basemap,
    graticule,
    clearSelection,
  );

  /* ---------- selection ---------- */

  // Clicking a feature on the map highlights it and scrolls the matching row into view.
  const selectFromMap = useCallback((layerId: string, fid: number) => {
    if (measuringRef.current) return;
    setSelected({ layerId, fid });
    setActiveId(layerId);
    setTimeout(() => {
      const container = tableRef.current;
      const row = container?.querySelector<HTMLElement>('#feat-' + layerId + '-' + fid);
      if (container && row) {
        container.scrollTop = row.offsetTop - container.clientHeight / 2 + row.offsetHeight / 2;
      }
    }, 40);
  }, []);

  const { zoomToLayer, zoomToFeature } = useLayerSync(map, layers, selected, selectFromMap);

  // Must come after useLayerSync: effects fire in hook order, and useMeasure switches off pointer
  // events on the layer panes that useLayerSync creates. Called first, it would miss the pane of a
  // layer loaded while a tool was armed, leaving that layer swallowing clicks.
  const measure = useMeasure(map, layers, DARK_BASEMAPS.includes(basemap));
  measuringRef.current = measure.tool !== null;

  // Clicking a table row does the reverse: select, then fly the map to the feature.
  const selectFromTable = useCallback(
    (fid: number) => {
      if (!activeLayer) return;
      setSelected({ layerId: activeLayer.id, fid });
      zoomToFeature(activeLayer.id, fid);
    },
    [activeLayer, zoomToFeature],
  );

  /* ---------- responsive ---------- */

  useEffect(() => {
    const onResize = () => {
      setNarrow(window.innerWidth < NARROW_BREAKPOINT);
      map?.invalidateSize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);

  /* ---------- loading ---------- */

  const reportProgress = useCallback(
    (message: string, pct: number) =>
      new Promise<void>((resolve) => {
        setLoading(true);
        setProgress(message);
        setProgressPct(pct);
        // Yield to the browser so the bar actually paints between stages.
        setTimeout(resolve, 24);
      }),
    [],
  );

  const runLoad = useCallback(
    async (task: (paletteStart: number) => Promise<LoadResult>) => {
      setError(null);
      setWarnings([]);
      try {
        const result = await task(paletteSeq.current);
        paletteSeq.current += result.layers.length;

        if (result.layers.length) {
          // Newest layer on top, matching the sidebar's top-to-bottom paint order.
          const incoming = [...result.layers].reverse();
          setLayers((current) => [...incoming, ...current]);
          setActiveId(incoming[0].id);
          setSelected(null);
          setSort({ field: null, dir: 1 });
          setSearch('');
          invalidateSoon();
        }
        setWarnings(result.warnings);
      } catch (err) {
        setError({ title: errorTitleOf(err), message: errorMessageOf(err) });
      } finally {
        setLoading(false);
        setProgress('');
        setProgressPct(0);
      }
    },
    [invalidateSoon],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (narrow) setSidebarOpen(false);
      void runLoad((paletteStart) => loadFromFiles(files, { onProgress: reportProgress, paletteStart }));
    },
    [narrow, reportProgress, runLoad],
  );

  const handleLoadSample = useCallback(() => {
    if (narrow) setSidebarOpen(false);
    void runLoad((paletteStart) => loadSample({ onProgress: reportProgress, paletteStart }));
  }, [narrow, reportProgress, runLoad]);

  /* ---------- layer operations ---------- */

  const patchStyle = useCallback(
    <K extends keyof LayerStyle>(key: K, value: LayerStyle[K]) => {
      setLayers((current) =>
        current.map((l) => (l.id === activeId ? { ...l, style: { ...l.style, [key]: value } } : l)),
      );
    },
    [activeId],
  );

  const toggleVisible = useCallback((id: string) => {
    setLayers((current) =>
      current.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }, []);

  const removeLayer = useCallback(
    (id: string) => {
      // Computed outside the updater: React may run an updater more than once, so it must
      // stay free of side effects like setActiveId.
      const remaining = layers.filter((l) => l.id !== id);
      setLayers(remaining);
      if (activeId === id) setActiveId(remaining[0]?.id ?? null);
      setSelected(null);
    },
    [layers, activeId],
  );

  const moveLayer = useCallback((index: number, direction: -1 | 1) => {
    setLayers((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = current.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const activateLayer = useCallback((id: string) => {
    setActiveId(id);
    setSelected(null);
    setSearch('');
    setSort({ field: null, dir: 1 });
  }, []);

  const toggleTable = useCallback(() => {
    setTableOpen((open) => !open);
    invalidateSoon();
  }, [invalidateSoon]);

  const handleSort = useCallback((field: string) => {
    setSort((current) =>
      current.field === field ? { field, dir: (current.dir * -1) as 1 | -1 } : { field, dir: 1 },
    );
  }, []);

  /* ---------- exports ---------- */

  const handleExportGeoJSON = useCallback(() => {
    if (!activeLayer) {
      setError({
        title: 'Nothing to export',
        message: 'Load a shapefile first, then select a layer to download it as GeoJSON.',
      });
      return;
    }
    exportGeoJSON(activeLayer);
  }, [activeLayer]);

  const handleExportPNG = useCallback(async () => {
    const element = mapRef.current;
    if (!element || !map) {
      setError({
        title: 'Export unavailable',
        message: 'The map is still initialising. Try again in a moment.',
      });
      return;
    }

    setError(null);
    try {
      await exportMapPng(
        element,
        {
          layerName: activeLayer?.name ?? null,
          zoom: readout.zoom,
          scaleLabel: readout.scaleLabel,
          attribution,
          darkBasemap: DARK_BASEMAPS.includes(basemap),
          theme,
        },
        reportProgress,
      );
    } catch (err) {
      setError({ title: errorTitleOf(err, 'Map image export failed'), message: errorMessageOf(err) });
    } finally {
      setLoading(false);
      setProgress('');
      setProgressPct(0);
    }
  }, [activeLayer, attribution, basemap, map, mapRef, readout, reportProgress, theme]);

  /* ---------- selected-feature caption ---------- */

  const selectedInfo = useMemo(() => {
    if (!activeLayer || !selected || selected.layerId !== activeLayer.id) return '';
    const feature = activeLayer.geojson.features.find((f) => f.__fid === selected.fid);
    if (!feature) return '';
    const props = feature.properties || {};
    const firstKey = Object.keys(props)[0];
    return (
      'Selected feature #' +
      (feature.__fid + 1) +
      (firstKey ? ' — ' + firstKey + ': ' + fmtVal(props[firstKey]) : '')
    );
  }, [activeLayer, selected]);

  const noLayers = layers.length === 0;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--sv-bg)',
      }}
    >
      <header
        style={{
          flex: 'none',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 18px',
          background: 'var(--sv-surface)',
          borderBottom: '1px solid var(--sv-border)',
          zIndex: 1200,
        }}
      >
        <button
          type="button"
          className="sv-menu-btn"
          title="Toggle panel"
          aria-label="Toggle panel"
          onClick={() => setSidebarOpen((open) => !open)}
          style={{ display: narrow ? 'flex' : 'none' }}
        >
          <span
            style={{
              display: 'block',
              width: 16,
              height: 2,
              background: 'var(--sv-text-2)',
              borderRadius: 2,
              boxShadow: '0 5px 0 var(--sv-text-2), 0 -5px 0 var(--sv-text-2)',
            }}
          />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'var(--sv-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px var(--sv-accent-glow)',
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                background: '#ffffff',
                borderRadius: 2,
                transform: 'rotate(45deg)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span className="sv-h" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.03em' }}>
              ShapeView
            </span>
            <span
              className="sv-m"
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                color: 'var(--sv-label)',
                letterSpacing: '.14em',
                textTransform: 'uppercase',
              }}
            >
              Shapefile · GeoJSON · WGS 84
            </span>
          </div>
        </div>

        <button
          type="button"
          className="sv-m sv-badge-btn"
          aria-haspopup="dialog"
          title={COURSE}
          onClick={() => setAboutOpen(true)}
          style={{
            marginLeft: 4,
            padding: '4px 9px',
            borderRadius: 7,
            border: '1px solid transparent',
            background: 'var(--sv-accent-soft)',
            color: 'var(--sv-accent)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.04em',
          }}
        >
          {GROUP_LABEL}
        </button>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          className="sv-btn sv-btn-ghost sv-btn-icon"
          aria-pressed={dark}
          title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
        >
          {dark ? '☀' : '☾'}
        </button>
        <button
          type="button"
          className="sv-btn sv-btn-ghost"
          onClick={handleExportGeoJSON}
          style={{ display: narrow ? 'none' : 'inline-flex' }}
        >
          Download GeoJSON
        </button>
        <button
          type="button"
          className="sv-btn sv-btn-primary"
          onClick={() => void handleExportPNG()}
          disabled={loading}
        >
          Export map PNG
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <Sidebar
          narrow={narrow}
          open={sidebarOpen}
          layers={layers}
          activeLayer={activeLayer}
          dragOver={dragOver}
          loading={loading}
          progress={progress}
          progressPct={progressPct}
          error={error}
          warnings={warnings}
          onFiles={handleFiles}
          onDragOverChange={setDragOver}
          onLoadSample={handleLoadSample}
          onDismissError={() => setError(null)}
          onDismissWarning={(index) => setWarnings((w) => w.filter((_, i) => i !== index))}
          onActivate={activateLayer}
          onToggleVisible={toggleVisible}
          onRemove={removeLayer}
          onZoomToLayer={zoomToLayer}
          onMove={moveLayer}
          onStyleChange={patchStyle}
        />

        {narrow && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--sv-scrim)',
              zIndex: 1150,
            }}
          />
        )}

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 14,
            gap: 12,
            minHeight: 0,
          }}
        >
          <div
            style={{
              flex: '1 1 auto',
              minHeight: 120,
              position: 'relative',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--sv-border)',
              boxShadow: '0 6px 20px var(--sv-shadow-soft)',
              background: 'var(--sv-map-bg)',
            }}
          >
            <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

            <MapChrome
              basemap={basemap}
              graticule={graticule}
              measureTool={measure.tool}
              onBasemapChange={setBasemap}
              onToggleGraticule={() => setGraticule((g) => !g)}
              onMeasureTool={measure.setTool}
            />

            {measure.tool && (
              <MeasurePanel
                tool={measure.tool}
                points={measure.points.length}
                finished={measure.finished}
                result={measure.result}
                lengthUnit={measure.lengthUnit}
                areaUnit={measure.areaUnit}
                onLengthUnit={measure.setLengthUnit}
                onAreaUnit={measure.setAreaUnit}
                onUndo={measure.undo}
                onClear={measure.clear}
                onClose={() => measure.setTool(null)}
              />
            )}

            <StatusBar
              cursor={cursor}
              zoom={readout.zoom}
              scalePx={readout.scalePx}
              scaleLabel={readout.scaleLabel}
              crsChip={crsChip(activeLayer?.epsg)}
            />

            {/* The card sits over the middle of the map and would swallow measuring clicks. */}
            {noLayers && !measure.tool && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 'calc(50% - 16px)',
                  transform: 'translate(-50%,-50%)',
                  zIndex: 680,
                  maxHeight: 'calc(100% - 54px)',
                  overflow: 'auto',
                  background: 'var(--sv-float)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid var(--sv-border)',
                  borderRadius: 16,
                  padding: '22px 26px',
                  textAlign: 'center',
                  boxShadow: '0 10px 30px var(--sv-shadow)',
                  maxWidth: 320,
                }}
              >
                <div
                  className="sv-h"
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: '-.02em',
                    color: 'var(--sv-text)',
                  }}
                >
                  Nothing on the map yet
                </div>
                <div
                  style={{ fontSize: 12, color: 'var(--sv-muted)', lineHeight: 1.6, marginTop: 6 }}
                >
                  Drop a zipped shapefile in the panel, or load the bundled station dataset to
                  explore the viewer.
                </div>
                <button type="button" className="sv-btn sv-btn-cta" onClick={handleLoadSample}>
                  Load sample data
                </button>
              </div>
            )}

            {/* Selection cannot change while measuring, so the caption would only go stale. */}
            {selectedInfo && !measure.tool && (
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  // Clear the 30px status bar, which paints above this (z-index 640).
                  bottom: 42,
                  zIndex: 600,
                  background: 'var(--sv-surface)',
                  border: '1px solid var(--sv-border)',
                  borderRadius: 12,
                  padding: '9px 12px',
                  boxShadow: '0 6px 18px var(--sv-shadow)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--sv-text-2)',
                  maxWidth: '70%',
                }}
              >
                {selectedInfo}
              </div>
            )}
          </div>

          <AttributeTable
            layer={activeLayer}
            open={tableOpen}
            narrow={narrow}
            search={search}
            sortField={sort.field}
            sortDir={sort.dir}
            selected={selected}
            scrollRef={tableRef}
            onToggle={toggleTable}
            onSearch={setSearch}
            onSort={handleSort}
            onSelectRow={selectFromTable}
          />
        </main>
      </div>

      <footer
        style={{
          flex: 'none',
          padding: '9px 18px',
          background: 'var(--sv-surface)',
          borderTop: '1px solid var(--sv-border)',
          fontSize: 11,
          color: 'var(--sv-faint)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>
          {COURSE}, {INSTITUTION}.
        </span>
        <span style={{ color: 'var(--sv-fainter)' }}>•</span>
        <span>Files are parsed in your browser; nothing is uploaded.</span>
      </footer>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
