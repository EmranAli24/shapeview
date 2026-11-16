import { fmtLat, fmtLng } from '../lib/format';
import type { Cursor } from '../types';

interface StatusBarProps {
  cursor: Cursor | null;
  zoom: number;
  scalePx: number;
  scaleLabel: string;
  crsChip: string;
}

export function StatusBar({ cursor, zoom, scalePx, scaleLabel, crsChip }: StatusBarProps) {
  return (
    <div
      className="sv-m"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 640,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 12px',
        background: 'var(--sv-float)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--sv-border)',
        fontSize: 10.5,
        fontWeight: 500,
        color: 'var(--sv-text-3)',
        letterSpacing: '.02em',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <span>
        LAT{' '}
        <span style={{ color: 'var(--sv-text)', fontWeight: 600 }}>
          {cursor ? fmtLat(cursor.lat) : '—'}
        </span>
      </span>
      <span>
        LON{' '}
        <span style={{ color: 'var(--sv-text)', fontWeight: 600 }}>
          {cursor ? fmtLng(cursor.lng) : '—'}
        </span>
      </span>
      <span style={{ color: 'var(--sv-fainter)' }}>|</span>
      <span>
        Z <span style={{ color: 'var(--sv-text)', fontWeight: 600 }}>{zoom}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            height: 9,
            borderLeft: '1.5px solid var(--sv-muted)',
            borderRight: '1.5px solid var(--sv-muted)',
            borderBottom: '1.5px solid var(--sv-muted)',
            transition: 'width .2s ease',
            width: scalePx,
          }}
        />
        <span style={{ color: 'var(--sv-text)', fontWeight: 600 }}>{scaleLabel}</span>
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          padding: '2px 7px',
          borderRadius: 6,
          background: 'var(--sv-accent-soft)',
          color: 'var(--sv-accent)',
          fontWeight: 600,
        }}
      >
        {crsChip}
      </span>
    </div>
  );
}
