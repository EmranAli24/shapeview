import {
  AREA_UNITS,
  LENGTH_UNITS,
  formatArea,
  formatLength,
  type Unit,
} from '../lib/measure';
import { fmtLat, fmtLng } from '../lib/format';
import type { MeasureResult, MeasureTool } from '../hooks/useMeasure';

interface MeasurePanelProps {
  tool: MeasureTool;
  points: number;
  finished: boolean;
  result: MeasureResult;
  lengthUnit: string;
  areaUnit: string;
  onLengthUnit: (id: string) => void;
  onAreaUnit: (id: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onClose: () => void;
}

const TITLES: Record<MeasureTool, string> = {
  distance: 'Measure · Distance',
  area: 'Measure · Area',
  location: 'Measure · Location',
};

const HINTS: Record<MeasureTool, string> = {
  distance: 'Click to add points · double-click to finish',
  area: 'Click at least three points · double-click to finish',
  location: 'Click anywhere on the map',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--sv-label)',
};

const readingStyle: React.CSSProperties = {
  fontSize: 21,
  fontWeight: 600,
  letterSpacing: '-.02em',
  color: 'var(--sv-text)',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
};

function UnitSelect({
  units,
  value,
  onChange,
}: {
  units: Unit[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      className="sv-unit"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Measurement units"
    >
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.label}
        </option>
      ))}
    </select>
  );
}

export function MeasurePanel(props: MeasurePanelProps) {
  const { tool, result } = props;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 56,
        zIndex: 670,
        width: 218,
        maxWidth: 'calc(100% - 68px)',
        animation: 'sv-fade .18s ease',
        background: 'var(--sv-float)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--sv-border-strong)',
        borderRadius: 12,
        boxShadow: '0 6px 20px var(--sv-shadow)',
        padding: '11px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="sv-m" style={{ ...labelStyle, flex: 1, minWidth: 0 }}>
          {TITLES[tool]}
        </span>
        <button
          type="button"
          className="sv-btn-remove"
          aria-label="Close measurement"
          onClick={props.onClose}
        >
          ×
        </button>
      </div>

      {tool === 'location' ? (
        result.point ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="sv-m" style={{ ...readingStyle, fontSize: 14 }}>
              {fmtLat(result.point.lat)}
            </span>
            <span className="sv-m" style={{ ...readingStyle, fontSize: 14 }}>
              {fmtLng(result.point.lng)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--sv-muted)' }}>{HINTS.location}</span>
        )
      ) : (
        <>
          <div className="sv-m" style={readingStyle}>
            {tool === 'area'
              ? formatArea(result.area ?? 0, props.areaUnit)
              : formatLength(result.length ?? 0, props.lengthUnit)}
          </div>

          {tool === 'area' ? (
            <UnitSelect units={AREA_UNITS} value={props.areaUnit} onChange={props.onAreaUnit} />
          ) : (
            <UnitSelect
              units={LENGTH_UNITS}
              value={props.lengthUnit}
              onChange={props.onLengthUnit}
            />
          )}

          {tool === 'area' && (
            <div style={{ fontSize: 11, color: 'var(--sv-muted)' }}>
              Perimeter{' '}
              <span className="sv-m" style={{ color: 'var(--sv-text-2)', fontWeight: 600 }}>
                {formatLength(result.perimeter ?? 0, props.lengthUnit)}
              </span>{' '}
              {LENGTH_UNITS.find((u) => u.id === props.lengthUnit)?.label.toLowerCase()}
            </div>
          )}

          <div style={{ fontSize: 10.5, color: 'var(--sv-faint)' }}>
            {props.points === 0
              ? HINTS[tool]
              : props.points +
                (props.points === 1 ? ' point' : ' points') +
                (tool === 'distance' && props.points > 1
                  ? ' · ' +
                    (props.points - 1) +
                    (props.points === 2 ? ' segment' : ' segments')
                  : '') +
                (props.finished ? ' · done' : '')}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="sv-btn-mini"
          onClick={props.onUndo}
          disabled={props.points === 0 || tool === 'location'}
        >
          Undo
        </button>
        <button
          type="button"
          className="sv-btn-mini"
          onClick={props.onClear}
          disabled={props.points === 0}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
