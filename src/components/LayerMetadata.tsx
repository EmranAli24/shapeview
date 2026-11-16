import { fmtSize } from '../lib/format';
import type { Layer } from '../types';

interface LayerMetadataProps {
  layer: Layer;
}

export function LayerMetadata({ layer }: LayerMetadataProps) {
  const extent = layer.bbox
    ? layer.bbox[0].toFixed(4) +
      ', ' +
      layer.bbox[1].toFixed(4) +
      '  →  ' +
      layer.bbox[2].toFixed(4) +
      ', ' +
      layer.bbox[3].toFixed(4)
    : '—';

  const geometry = Object.keys(layer.counts)
    .map((type) => {
      const n = layer.counts[type];
      return type + ' — ' + n.toLocaleString() + (n === 1 ? ' feature' : ' features');
    })
    .join(', ');

  const shapeType = layer.shapeType
    ? layer.shapeType.code + ' — ' + layer.shapeType.label
    : '—';

  const rows: { k: string; v: string }[] = [
    { k: 'File', v: layer.name },
    { k: 'Size', v: fmtSize(layer.size) },
    { k: 'Geometry', v: geometry },
    { k: 'Shape type', v: shapeType },
    { k: 'Feature count', v: layer.count.toLocaleString() },
    { k: 'CRS', v: layer.crs },
    { k: 'Extent', v: extent },
  ];

  const fields = Object.keys(layer.fields);

  return (
    <div
      style={{
        background: 'var(--sv-surface)',
        border: '1px solid var(--sv-border)',
        borderRadius: 14,
        padding: '6px 14px',
        boxShadow: '0 1px 2px var(--sv-shadow-soft)',
      }}
    >
      {rows.map((row) => (
        <div
          key={row.k}
          style={{
            display: 'flex',
            gap: 12,
            padding: '9px 0',
            borderBottom: '1px solid var(--sv-border-faint)',
            alignItems: 'baseline',
          }}
        >
          <span
            className="sv-m"
            style={{
              flex: 'none',
              width: 92,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.07em',
              textTransform: 'uppercase',
              color: 'var(--sv-faint)',
            }}
          >
            {row.k}
          </span>
          <span
            className="sv-m"
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--sv-text-2)',
              wordBreak: 'break-word',
              lineHeight: 1.55,
            }}
          >
            {row.v}
          </span>
        </div>
      ))}

      <div style={{ padding: '11px 0 13px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-faint)', marginBottom: 8 }}>
          Attribute fields ({fields.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {fields.map((name) => (
            <span
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 8,
                background: 'var(--sv-surface-2)',
                border: '1px solid var(--sv-border)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--sv-text-2)',
              }}
            >
              {name}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  color: 'var(--sv-faint)',
                }}
              >
                {layer.fields[name]}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
