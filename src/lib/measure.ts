/**
 * Geodesic measurement — distance, area and unit conversion.
 *
 * Both formulas treat the Earth as a sphere of the WGS 84 *mean* radius rather than as the
 * ellipsoid it is. That is a deliberate approximation: it keeps length and area consistent with
 * each other and the code short, at a cost well under 1% at these latitudes. ArcGIS and QGIS use
 * true ellipsoidal geodesics, so expect their figures to differ in the last digit or two.
 *
 * Pure functions only — no React and no Leaflet, so this file can be reasoned about (and checked
 * against a reference implementation) on its own.
 */

/** WGS 84 mean radius, R₁ = (2a + b) / 3. */
const R = 6371008.8;

const D2R = Math.PI / 180;

export interface Point {
  lat: number;
  lng: number;
}

/**
 * Great-circle distance in metres, by the haversine formula:
 *   a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)
 *   d = 2R · atan2(√a, √(1−a))
 */
export function distance(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * D2R;
  const dLng = (b.lng - a.lng) * D2R;
  const lat1 = a.lat * D2R;
  const lat2 = b.lat * D2R;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Total length of an open path. */
export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += distance(points[i - 1], points[i]);
  return total;
}

/** Length once around a ring — the path plus the segment closing it. */
export function polygonPerimeter(points: Point[]): number {
  if (points.length < 3) return pathLength(points);
  return pathLength(points) + distance(points[points.length - 1], points[0]);
}

/**
 * Area of a spherical polygon in m², from the spherical-excess sum
 *   A = |Σ (λᵢ₊₁ − λᵢ)(2 + sin φᵢ + sin φᵢ₊₁)| · R²/2
 * taken over the closed ring. Self-intersecting rings are not meaningful here, and the absolute
 * value means winding order does not matter.
 */
export function polygonArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    sum += (p2.lng - p1.lng) * D2R * (2 + Math.sin(p1.lat * D2R) + Math.sin(p2.lat * D2R));
  }

  return Math.abs((sum * R * R) / 2);
}

/* ------------------------------------------------------------------ units */

export interface Unit {
  id: string;
  label: string;
  /** Multiply the metric base (metres, or square metres) by this. */
  factor: number;
  /** Digits after the point at everyday magnitudes. */
  decimals: number;
}

export const LENGTH_UNITS: Unit[] = [
  { id: 'm', label: 'Metres', factor: 1, decimals: 2 },
  { id: 'km', label: 'Kilometres', factor: 0.001, decimals: 3 },
  { id: 'ft', label: 'Feet', factor: 3.280839895, decimals: 1 },
  { id: 'mi', label: 'Miles', factor: 0.000621371192, decimals: 3 },
  { id: 'nmi', label: 'Nautical miles', factor: 0.000539956803, decimals: 3 },
];

export const AREA_UNITS: Unit[] = [
  { id: 'm2', label: 'Square metres', factor: 1, decimals: 2 },
  { id: 'km2', label: 'Square kilometres', factor: 1e-6, decimals: 4 },
  { id: 'ha', label: 'Hectares', factor: 1e-4, decimals: 3 },
  { id: 'ac', label: 'Acres', factor: 0.000247105381, decimals: 3 },
  { id: 'ft2', label: 'Square feet', factor: 10.7639104, decimals: 0 },
  { id: 'mi2', label: 'Square miles', factor: 3.86102159e-7, decimals: 5 },
];

function unitById(units: Unit[], id: string): Unit {
  return units.find((u) => u.id === id) ?? units[0];
}

/**
 * Group digits and keep the number readable across ten orders of magnitude: a value in the
 * millions does not need its hundredths, and one below 1 needs more than the unit's default.
 */
function formatValue(value: number, unit: Unit): string {
  const magnitude = Math.abs(value);
  let decimals = unit.decimals;
  if (magnitude >= 100000) decimals = 0;
  else if (magnitude >= 1000) decimals = Math.min(decimals, 1);
  else if (magnitude > 0 && magnitude < 1) decimals = Math.max(decimals, 4);

  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatLength(metres: number, unitId: string): string {
  const unit = unitById(LENGTH_UNITS, unitId);
  return formatValue(metres * unit.factor, unit);
}

export function formatArea(squareMetres: number, unitId: string): string {
  const unit = unitById(AREA_UNITS, unitId);
  return formatValue(squareMetres * unit.factor, unit);
}

/** Short unit for the tooltip that follows the cursor, where the dropdown is not visible. */
export function unitSuffix(units: Unit[], unitId: string): string {
  const map: Record<string, string> = {
    m: 'm',
    km: 'km',
    ft: 'ft',
    mi: 'mi',
    nmi: 'nmi',
    m2: 'm²',
    km2: 'km²',
    ha: 'ha',
    ac: 'ac',
    ft2: 'ft²',
    mi2: 'mi²',
  };
  return map[unitById(units, unitId).id] ?? '';
}
