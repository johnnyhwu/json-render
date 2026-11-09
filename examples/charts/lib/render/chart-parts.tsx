"use client";

import { useBoundProp } from "@json-render/react";
import { formatValue, type Format, type Row } from "../chart-utils";

// ---------------------------------------------------------------------------
// Shared visual language. Every chart uses these, so the agent cannot produce
// an off-brand chart even if it tries.
// ---------------------------------------------------------------------------

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
export const GRID_STROKE = "var(--border)";
export const ANIMATION_MS = 450;

export type TooltipItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  payload?: Row;
};

export function TooltipCard({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  format?: Format | null;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value !== undefined);
  const showTotal = items.length > 2;
  const total = items.reduce((a, p) => a + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm min-w-[160px]">
      {label !== undefined && (
        <div className="mb-1.5 font-medium text-foreground">{label}</div>
      )}
      <div className="space-y-1">
        {items.map((p) => (
          <div key={String(p.name)} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: p.color ?? p.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-mono tabular-nums text-foreground">
              {formatValue(Number(p.value), format)}
            </span>
          </div>
        ))}
        {showTotal && (
          <div className="flex items-center gap-2 border-t pt-1 mt-1">
            <span className="text-muted-foreground">Total</span>
            <span className="ml-auto font-mono tabular-nums font-medium">
              {formatValue(total, format)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { name: string; color: string }[];
}) {
  if (items.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-[2px]"
            style={{ background: i.color }}
          />
          {i.name}
        </span>
      ))}
    </div>
  );
}

export function Empty() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      No data for the current filters
    </div>
  );
}

export function getPath(state: unknown, path: string): unknown {
  return path
    .split("/")
    .filter(Boolean)
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Row)[key] : undefined,
      state,
    );
}

export function payloadOf(entry: unknown): Row | undefined {
  if (entry && typeof entry === "object" && "payload" in entry) {
    return (entry as { payload?: Row }).payload;
  }
  return undefined;
}

/** Click-to-filter: clicking the selected category again clears it. */
export function useSelection(
  selected: string | null | undefined,
  binding: string | undefined,
  emit: (e: string) => void,
) {
  const [value, setValue] = useBoundProp<string | null>(
    selected ?? null,
    binding,
  );
  const interactive = !!binding;
  const toggle = (category: string) => {
    if (!interactive) return;
    setValue(value === category ? null : category);
    emit("select");
  };
  const isDimmed = (category: string) => !!value && value !== category;
  return { interactive, toggle, isDimmed };
}
