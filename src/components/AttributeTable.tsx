import { useMemo } from 'react';

import { MAX_TABLE_ROWS } from '../constants';
import { fmtVal } from '../lib/format';
import type { Layer, Selection, ShapeFeature } from '../types';

interface AttributeTableProps {
  layer: Layer | null;
  open: boolean;
  narrow: boolean;
  search: string;
  sortField: string | null;
  sortDir: 1 | -1;
  selected: Selection | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onSearch: (value: string) => void;
  onSort: (field: string) => void;
  onSelectRow: (fid: number) => void;
}

/** Sentinel column key for the row-number column, which is not a real attribute. */
const ROW_NUMBER = '__n';

export function AttributeTable(props: AttributeTableProps) {
  const { layer, search, sortField, sortDir } = props;

  const fields = useMemo(() => (layer ? Object.keys(layer.fields) : []), [layer]);

  const features = useMemo(() => {
    if (!layer) return [] as ShapeFeature[];

    let result = layer.geojson.features;

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((f) =>
        Object.keys(f.properties || {}).some((k) =>
          String((f.properties || {})[k]).toLowerCase().includes(query),
        ),
      );
    }

    if (sortField) {
      result = result.slice().sort((a, b) => {
        if (sortField === ROW_NUMBER) return (a.__fid - b.__fid) * sortDir;

        const x = (a.properties || {})[sortField];
        const y = (b.properties || {})[sortField];
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
        return String(x).localeCompare(String(y)) * sortDir;
      });
    }

    return result;
  }, [layer, search, sortField, sortDir]);

  const rows = useMemo(() => features.slice(0, MAX_TABLE_ROWS), [features]);

  const columns = [{ key: ROW_NUMBER, label: '#' }, ...fields.map((f) => ({ key: f, label: f }))];

  const rowCountLabel = layer
    ? features.length.toLocaleString() + ' of ' + layer.count.toLocaleString() + ' rows'
    : '0 rows';

  const emptyMessage = !layer
    ? 'Load a layer to inspect its attribute table.'
    : search
      ? 'No features match “' + search + '”.'
      : 'This layer has no attributes.';

  return (
    <div
      style={{
        flex: '0 1 auto',
        minHeight: 0,
        maxHeight: '44%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sv-surface)',
        border: '1px solid var(--sv-border)',
        borderRadius: 16,
        boxShadow: '0 1px 2px var(--sv-shadow-soft)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          borderBottom: '1px solid ' + (props.open ? 'var(--sv-border)' : 'transparent'),
        }}
      >
        <button
          type="button"
          className="sv-chev"
          aria-label={props.open ? 'Collapse attribute table' : 'Expand attribute table'}
          onClick={props.onToggle}
          style={{ transform: 'rotate(' + (props.open ? '90deg' : '0deg') + ')' }}
        >
          ›
        </button>
        <span
          className="sv-h"
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '-.01em',
            color: 'var(--sv-text)',
          }}
        >
          Attribute table
        </span>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 99,
            background: 'var(--sv-surface-2)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--sv-muted)',
          }}
        >
          {rowCountLabel}
        </span>
        <div style={{ flex: 1 }} />
        <input
          type="text"
          className="sv-search"
          value={search}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder="Search attributes…"
        />
      </div>

      {props.open && (
        <div
          ref={props.scrollRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            height: 'min(' + (props.narrow ? 190 : 240) + 'px, 30vh)',
            overflow: 'auto',
          }}
        >
          {rows.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="sv-th"
                      onClick={() => props.onSort(col.key)}
                      style={{
                        color:
                          sortField === col.key ? 'var(--sv-accent)' : 'var(--sv-label)',
                      }}
                    >
                      {col.label}
                      {sortField === col.key ? (sortDir === 1 ? '  ↑' : '  ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((feature, index) => {
                  const isSelected =
                    !!props.selected &&
                    !!layer &&
                    props.selected.layerId === layer.id &&
                    props.selected.fid === feature.__fid;

                  return (
                    <tr
                      key={feature.__fid}
                      id={layer ? 'feat-' + layer.id + '-' + feature.__fid : undefined}
                      className="sv-row"
                      onClick={() => props.onSelectRow(feature.__fid)}
                      style={{
                        background: isSelected
                          ? 'var(--sv-accent-soft)'
                          : index % 2
                            ? 'var(--sv-row-alt)'
                            : 'var(--sv-row)',
                        color: isSelected ? 'var(--sv-accent)' : 'var(--sv-text-2)',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      <td className="sv-m sv-td">{feature.__fid + 1}</td>
                      {fields.map((field) => (
                        <td key={field} className="sv-m sv-td">
                          {fmtVal((feature.properties || {})[field])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div
              style={{ padding: 34, textAlign: 'center', fontSize: 12, color: 'var(--sv-faint)' }}
            >
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
