import { GEOM_COLORS } from '../constants';
import type { Layer } from '../types';

interface LayerCardProps {
  layer: Layer;
  active: boolean;
  /** Position in the list, for enabling/disabling the reorder buttons. */
  index: number;
  total: number;
  onActivate: () => void;
  onToggleVisible: () => void;
  onRemove: () => void;
  onZoom: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function LayerCard({
  layer,
  active,
  index,
  total,
  onActivate,
  onToggleVisible,
  onRemove,
  onZoom,
  onMove,
}: LayerCardProps) {
  return (
    <div
      onClick={onActivate}
      style={{
        cursor: 'pointer',
        transition: 'all .16s ease',
        borderRadius: 13,
        padding: '11px 12px',
        border: '1px solid ' + (active ? 'var(--sv-accent-border)' : 'var(--sv-border)'),
        background: active ? 'var(--sv-surface-3)' : 'var(--sv-surface)',
        boxShadow: active ? '0 2px 10px var(--sv-accent-glow)' : '0 1px 2px var(--sv-shadow-soft)',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          title="Toggle visibility"
          aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          style={{
            flex: 'none',
            width: 16,
            height: 16,
            borderRadius: 5,
            cursor: 'pointer',
            transition: 'all .16s ease',
            border:
              '1.5px solid ' + (layer.visible ? layer.style.stroke : 'var(--sv-fainter)'),
            background: layer.visible ? layer.style.fill : 'transparent',
          }}
        />
        <span
          className="sv-h"
          title={layer.name}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '-.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {layer.name}
        </span>
        <button
          type="button"
          className="sv-btn-remove"
          title="Remove layer"
          aria-label="Remove layer"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {Object.keys(layer.counts).map((type) => (
          <span
            key={type}
            style={{
              padding: '3px 8px',
              borderRadius: 7,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.01em',
              color: '#ffffff',
              background: GEOM_COLORS[type] || GEOM_COLORS.Unknown,
            }}
          >
            {/* "×" so the number cannot be read as a shape type code. */}
            {type} × {layer.counts[type]}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
        <button
          type="button"
          className="sv-btn-mini"
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
        >
          Zoom to
        </button>
        <button
          type="button"
          className="sv-btn-mini"
          title="Move up"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
        >
          ↑
        </button>
        <button
          type="button"
          className="sv-btn-mini"
          title="Move down"
          disabled={index === total - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
        >
          ↓
        </button>
        <span style={{ flex: 1 }} />
        <span
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-faint)', alignSelf: 'center' }}
        >
          {layer.count.toLocaleString()} features
        </span>
      </div>
    </div>
  );
}
