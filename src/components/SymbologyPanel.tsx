import type { Layer, LayerStyle } from '../types';

interface SymbologyPanelProps {
  layer: Layer;
  onChange: <K extends keyof LayerStyle>(key: K, value: LayerStyle[K]) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--sv-muted)',
};

const swatchStyle: React.CSSProperties = {
  width: '100%',
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--sv-border)',
};

export function SymbologyPanel({ layer, onChange }: SymbologyPanelProps) {
  const { style } = layer;

  const slider = (
    key: 'opacity' | 'weight' | 'radius',
    caption: string,
    valueLabel: string,
    min: number,
    max: number,
    step: number,
  ) => (
    <label style={labelStyle}>
      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
        {caption} <span style={{ color: 'var(--sv-accent)' }}>{valueLabel}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={style[key]}
        onChange={(e) => onChange(key, parseFloat(e.target.value))}
        style={{ width: '100%' }}
      />
    </label>
  );

  return (
    <div
      style={{
        background: 'var(--sv-surface)',
        border: '1px solid var(--sv-border)',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
        boxShadow: '0 1px 2px var(--sv-shadow-soft)',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <label style={{ ...labelStyle, flex: 1, gap: 6 }}>
          Fill
          <input
            type="color"
            value={style.fill}
            onChange={(e) => onChange('fill', e.target.value)}
            style={swatchStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1, gap: 6 }}>
          Stroke
          <input
            type="color"
            value={style.stroke}
            onChange={(e) => onChange('stroke', e.target.value)}
            style={swatchStyle}
          />
        </label>
      </div>

      {slider('opacity', 'Fill opacity', Math.round(style.opacity * 100) + '%', 0, 1, 0.05)}
      {slider('weight', 'Stroke width', style.weight + ' px', 0, 10, 0.5)}
      {slider('radius', 'Point radius', style.radius + ' px', 2, 24, 1)}
    </div>
  );
}
