import { BASEMAPS, BASEMAP_KEYS } from '../constants';
import type { MeasureTool } from '../hooks/useMeasure';
import type { BasemapKey } from '../types';

interface MapChromeProps {
  basemap: BasemapKey;
  graticule: boolean;
  measureTool: MeasureTool | null;
  onBasemapChange: (key: BasemapKey) => void;
  onToggleGraticule: () => void;
  onMeasureTool: (tool: MeasureTool | null) => void;
}

const MEASURE_TOOLS: { id: MeasureTool; label: string }[] = [
  { id: 'distance', label: 'DISTANCE' },
  { id: 'area', label: 'AREA' },
  { id: 'location', label: 'LOCATION' },
];

export function MapChrome({
  basemap,
  graticule,
  measureTool,
  onBasemapChange,
  onToggleGraticule,
  onMeasureTool,
}: MapChromeProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 660,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 3,
          padding: 3,
          background: 'var(--sv-float)',
          border: '1px solid var(--sv-border-strong)',
          borderRadius: 11,
          boxShadow: '0 4px 16px var(--sv-shadow)',
        }}
      >
        {BASEMAP_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="sv-m"
            onClick={() => onBasemapChange(key)}
            style={{
              padding: '5px 9px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '.08em',
              transition: 'all .15s ease',
              background: basemap === key ? 'var(--sv-accent)' : 'transparent',
              color: basemap === key ? '#ffffff' : 'var(--sv-muted)',
            }}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 3,
          padding: 3,
          background: 'var(--sv-float)',
          border: '1px solid var(--sv-border-strong)',
          borderRadius: 11,
          boxShadow: '0 4px 16px var(--sv-shadow)',
        }}
      >
        {MEASURE_TOOLS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="sv-m"
            title={'Measure ' + label.toLowerCase()}
            aria-pressed={measureTool === id}
            onClick={() => onMeasureTool(measureTool === id ? null : id)}
            style={{
              padding: '5px 9px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '.08em',
              transition: 'all .15s ease',
              background: measureTool === id ? 'var(--sv-accent)' : 'transparent',
              color: measureTool === id ? '#ffffff' : 'var(--sv-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          className="sv-m"
          onClick={onToggleGraticule}
          style={{
            padding: '7px 11px',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '.09em',
            transition: 'all .15s ease',
            boxShadow: '0 4px 16px var(--sv-shadow)',
            border: '1px solid ' + (graticule ? 'var(--sv-accent)' : 'var(--sv-border-strong)'),
            background: graticule ? 'var(--sv-accent)' : 'var(--sv-float)',
            color: graticule ? '#ffffff' : 'var(--sv-muted)',
          }}
        >
          GRATICULE
        </button>

        <div
          title="North"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--sv-float)',
            border: '1px solid var(--sv-border-strong)',
            boxShadow: '0 4px 16px var(--sv-shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '9px solid var(--sv-accent)',
            }}
          />
          <span
            className="sv-m"
            style={{ fontSize: 9, fontWeight: 700, color: 'var(--sv-text-2)', lineHeight: 1 }}
          >
            N
          </span>
        </div>
      </div>
    </div>
  );
}
