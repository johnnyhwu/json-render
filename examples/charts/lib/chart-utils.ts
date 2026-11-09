export type Row = Record<string, unknown>;
export type Aggregate = "sum" | "avg" | "count" | "min" | "max";
export type Format = "number" | "currency" | "percent" | "compact";
export type Filter = { field: string; value?: unknown };

/** Accept either an array of rows or an object wrapping one (`{ data: [...] }`). */
export function toRows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (data && typeof data === "object" && Array.isArray((data as Row).data)) {
    return (data as { data: Row[] }).data;
  }
  return [];
}

function isActive(value: unknown): boolean {
  return (
    value !== null && value !== undefined && value !== "" && value !== "All"
  );
}

export function applyFilters(
  rows: Row[],
  filters: Filter[] | null | undefined,
): Row[] {
  const active = (filters ?? []).filter((f) => isActive(f.value));
  if (active.length === 0) return rows;
  return rows.filter((r) =>
    active.every((f) => String(r[f.field]) === String(f.value)),
  );
}

export function aggregateValues(
  values: number[],
  agg: Aggregate | null | undefined,
): number {
  if (agg === "count") return values.length;
  if (values.length === 0) return 0;
  switch (agg) {
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

/** Unique values of a field, in first-seen order. */
export function uniqueValues(rows: Row[], field: string): string[] {
  const seen = new Set<string>();
  for (const r of rows) seen.add(String(r[field]));
  return [...seen];
}

/**
 * Group rows by `x` (and optionally `seriesBy`) and aggregate `y`.
 * Returns one object per x value: `{ [x]: "Jan", Online: 120, Retail: 80 }`.
 * Without `seriesBy` the value lives under the `y` key.
 */
export function pivot(
  rows: Row[],
  x: string,
  y: string,
  agg: Aggregate | null | undefined,
  seriesBy?: string | null,
): { data: Row[]; series: string[] } {
  const xOrder = uniqueValues(rows, x);
  const series = seriesBy ? uniqueValues(rows, seriesBy) : [y];
  const buckets = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    const xk = String(r[x]);
    const sk = seriesBy ? String(r[seriesBy]) : y;
    let m = buckets.get(xk);
    if (!m) buckets.set(xk, (m = new Map()));
    let arr = m.get(sk);
    if (!arr) m.set(sk, (arr = []));
    arr.push(Number(r[y]) || 0);
  }
  const data = xOrder.map((xk) => {
    const out: Row = { [x]: xk };
    for (const s of series)
      out[s] = aggregateValues(buckets.get(xk)?.get(s) ?? [], agg);
    return out;
  });
  return { data, series };
}

export function formatValue(
  value: number,
  format: Format | null | undefined,
  compact = false,
): string {
  if (!Number.isFinite(value)) return "-";
  const notation = compact || format === "compact" ? "compact" : "standard";
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation,
        maximumFractionDigits: notation === "compact" ? 1 : 0,
      }).format(value);
    case "percent":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
    default:
      return new Intl.NumberFormat("en-US", {
        notation,
        maximumFractionDigits: notation === "compact" ? 1 : value < 10 ? 2 : 0,
      }).format(value);
  }
}

const PALETTE_SIZE = 6;

/**
 * Stable color per category. The color depends on the category's position in
 * the *unfiltered* dataset, so "Europe" keeps its color when filters change
 * and across every chart that shows regions.
 */
export function colorFor(category: string, allCategories: string[]): string {
  const i = allCategories.indexOf(category);
  return `var(--chart-${((i < 0 ? 0 : i) % PALETTE_SIZE) + 1})`;
}

/** CSS-variable-safe key for a series name. */
export function cssKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}
