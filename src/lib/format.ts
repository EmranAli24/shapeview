export function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

/** Attribute-cell formatting: em dash for empty, trimmed float noise for numbers. */
export function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
  return String(v);
}

export function fmtLat(lat: number): string {
  return Math.abs(lat).toFixed(5) + '° ' + (lat >= 0 ? 'N' : 'S');
}

/** Longitude can run past ±180 after repeated panning; wrap it before display. */
export function fmtLng(lng: number): string {
  return Math.abs(((lng + 540) % 360) - 180).toFixed(5) + '° ' + (lng >= 0 ? 'E' : 'W');
}
