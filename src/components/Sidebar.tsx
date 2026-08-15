import { useRef } from 'react';

import type { Layer, LayerStyle, LoadWarning } from '../types';
import { LayerCard } from './LayerCard';
import { LayerMetadata } from './LayerMetadata';
import { SymbologyPanel } from './SymbologyPanel';

interface SidebarProps {
  narrow: boolean;
  open: boolean;
  layers: Layer[];
  activeLayer: Layer | null;
  dragOver: boolean;
  loading: boolean;
  progress: string;
  progressPct: number;
  error: { title: string; message: string } | null;
  warnings: LoadWarning[];
  onFiles: (files: File[]) => void;
  onDragOverChange: (over: boolean) => void;
  onLoadSample: () => void;
  onDismissError: () => void;
  onDismissWarning: (index: number) => void;
  onActivate: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
  onZoomToLayer: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onStyleChange: <K extends keyof LayerStyle>(key: K, value: LayerStyle[K]) => void;
}

const sectionLabel = 'sv-m sv-section-label';

export function Sidebar(props: SidebarProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);

  const asideStyle: React.CSSProperties = props.narrow
    ? {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 322,
        zIndex: 1200,
        transform: 'translateX(' + (props.open ? '0' : '-105%') + ')',
        boxShadow: '8px 0 30px var(--sv-shadow)',
        background: 'var(--sv-surface)',
        borderRight: '1px solid var(--sv-border)',
        overflowY: 'auto',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
      }
    : {
        flex: 'none',
        width: 342,
        background: 'var(--sv-surface)',
        borderRight: '1px solid var(--sv-border)',
        overflowY: 'auto',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
      };

  return (
    <aside style={asideStyle}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ---------- 01 / Add data ---------- */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className={sectionLabel}>01 / Add data</div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!props.dragOver) props.onDragOverChange(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              props.onDragOverChange(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              props.onDragOverChange(false);
              const files = e.dataTransfer && e.dataTransfer.files;
              if (files && files.length) props.onFiles(Array.from(files));
            }}
            onClick={() => fileInput.current?.click()}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              padding: '22px 16px',
              borderRadius: 14,
              transition: 'all .18s ease',
              border:
                '1.5px dashed ' +
                (props.dragOver ? 'var(--sv-accent)' : 'var(--sv-border-dashed)'),
              background: props.dragOver ? 'var(--sv-accent-soft)' : 'var(--sv-surface-2)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--sv-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}
            >
              <div
                style={{
                  width: 13,
                  height: 13,
                  border: '2.5px solid var(--sv-accent)',
                  borderRadius: 3,
                  transform: 'rotate(45deg)',
                }}
              />
            </div>
            <div
              className="sv-h"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--sv-text)',
                letterSpacing: '-.01em',
              }}
            >
              Drop a zipped shapefile
            </div>
            <div
              style={{ fontSize: 11.5, color: 'var(--sv-label)', marginTop: 4, lineHeight: 1.5 }}
            >
              .zip archive, or select
              <br />
              .shp + .shx + .dbf (+ .prj) together
            </div>
            <span
              style={{
                display: 'inline-block',
                marginTop: 12,
                padding: '7px 14px',
                borderRadius: 9,
                background: 'var(--sv-surface)',
                border: '1px solid var(--sv-border-dashed)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--sv-text-2)',
              }}
            >
              Browse files
            </span>
          </div>

          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".zip,.shp,.shx,.dbf,.prj,.cpg,.qpj"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              if (files.length) props.onFiles(files);
            }}
            style={{ display: 'none' }}
          />

          <button type="button" className="sv-btn sv-btn-sample" onClick={props.onLoadSample}>
            Load sample data · Group 08 station points
          </button>
        </section>

        {/* ---------- status ---------- */}
        {props.error && (
          <div
            style={{
              animation: 'sv-fade .18s ease',
              border: '1px solid var(--sv-err-border)',
              background: 'var(--sv-err-bg)',
              borderRadius: 12,
              padding: '12px 12px 12px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 7,
                height: 7,
                borderRadius: 99,
                background: 'var(--sv-err-dot)',
                marginTop: 5,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sv-err-title)' }}>
                {props.error.title}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--sv-err-body)',
                  lineHeight: 1.5,
                  marginTop: 3,
                  wordBreak: 'break-word',
                }}
              >
                {props.error.message}
              </div>
            </div>
            <button
              type="button"
              className="sv-error-dismiss"
              aria-label="Dismiss error"
              onClick={props.onDismissError}
            >
              ×
            </button>
          </div>
        )}

        {props.warnings.map((warning, i) => (
          <div
            key={warning.title + i}
            style={{
              animation: 'sv-fade .18s ease',
              border: '1px solid var(--sv-warn-border)',
              background: 'var(--sv-warn-bg)',
              borderRadius: 12,
              padding: '12px 12px 12px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 7,
                height: 7,
                borderRadius: 99,
                background: 'var(--sv-warn-dot)',
                marginTop: 5,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sv-warn-title)' }}>
                {warning.title}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--sv-warn-body)',
                  lineHeight: 1.5,
                  marginTop: 3,
                  wordBreak: 'break-word',
                }}
              >
                {warning.message}
              </div>
            </div>
            <button
              type="button"
              className="sv-error-dismiss"
              style={{ color: 'var(--sv-warn-title)' }}
              aria-label="Dismiss warning"
              onClick={() => props.onDismissWarning(i)}
            >
              ×
            </button>
          </div>
        ))}

        {props.loading && (
          <div
            style={{
              border: '1px solid var(--sv-load-border)',
              background: 'var(--sv-load-bg)',
              borderRadius: 12,
              padding: 13,
              display: 'flex',
              gap: 11,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 18,
                height: 18,
                borderRadius: 99,
                border: '2.5px solid var(--sv-load-ring)',
                borderTopColor: 'var(--sv-accent)',
                animation: 'sv-spin .8s linear infinite',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sv-accent)' }}>
                {props.progress}
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: 'var(--sv-load-track)',
                  marginTop: 7,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 99,
                    background: 'var(--sv-accent)',
                    transition: 'width .25s ease',
                    width: props.progressPct + '%',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------- 02 / Layers ---------- */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <div className={sectionLabel}>02 / Layers</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-fainter)' }}>
              {props.layers.length ? props.layers.length : ''}
            </span>
          </div>

          {props.layers.length === 0 && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--sv-faint)',
                lineHeight: 1.55,
                padding: '10px 12px',
                border: '1px dashed var(--sv-border-strong)',
                borderRadius: 11,
              }}
            >
              No layers loaded yet. Drop an archive above or try the sample data.
            </div>
          )}

          {props.layers.map((layer, index) => (
            <LayerCard
              key={layer.id}
              layer={layer}
              index={index}
              total={props.layers.length}
              active={layer.id === props.activeLayer?.id}
              onActivate={() => props.onActivate(layer.id)}
              onToggleVisible={() => props.onToggleVisible(layer.id)}
              onRemove={() => props.onRemove(layer.id)}
              onZoom={() => props.onZoomToLayer(layer.id)}
              onMove={(direction) => props.onMove(index, direction)}
            />
          ))}
        </section>

        {/* ---------- 03 / Symbology + 04 / Metadata ---------- */}
        {props.activeLayer && (
          <>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className={sectionLabel}
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                03 / Symbology — {props.activeLayer.name.replace(/\.(shp|zip).*$/i, '')}
              </div>
              <SymbologyPanel layer={props.activeLayer} onChange={props.onStyleChange} />
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div className={sectionLabel}>04 / Layer metadata</div>
              <LayerMetadata layer={props.activeLayer} />
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
