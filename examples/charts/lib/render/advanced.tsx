"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RRadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Sankey as RSankey,
  Tooltip,
  Treemap as RTreemap,
  XAxis,
  YAxis,
} from "recharts";
import { useBoundProp, type ComponentFn } from "@json-render/react";
import type { catalog } from "./catalog";
import {
  aggregateValues,
  applyFilters,
  colorFor,
  formatValue,
  toRows,
  uniqueValues,
  type Aggregate,
  type Row,
} from "../chart-utils";
import { cn } from "../utils";
import {
  ANIMATION_MS,
  AXIS_TICK,
  Empty,
  GRID_STROKE,
  Legend,
  TooltipCard,
  type TooltipItem,
} from "./chart-parts";

type C = typeof catalog;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupRows(rows: Row[], field: string): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = String(r[field]);
    let arr = m.get(k);
    if (!arr) m.set(k, (arr = []));
    arr.push(r);
  }
  return m;
}

function agg(rows: Row[], field: string, a: Aggregate | null | undefined) {
  return aggregateValues(
    rows.map((r) => Number(r[field]) || 0),
    a,
  );
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

function niceTicks(max: number, count = 5): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1]! < max)
    ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}

function useWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Deterministic pseudo-random in [0, 1) from an integer, for jitter. */
function hash01(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function tint(color: string, pct: number): string {
  return `color-mix(in oklch, ${color} ${Math.round(pct)}%, var(--muted))`;
}

// ---------------------------------------------------------------------------
// ComboChart: bars (left axis) + lines and ratios (right axis), brush, targets
// ---------------------------------------------------------------------------

const ComboChart: ComponentFn<C, "ComboChart"> = ({ props }) => {
  const rows = applyFilters(toRows(props.data), props.filters);
  if (rows.length === 0) return <Empty />;
  const groups = groupRows(rows, props.x);
  const data = [...groups.entries()].map(([xv, g]) => {
    const out: Row = { [props.x]: xv };
    props.bars.forEach((b, i) => {
      out[`b${i}`] = agg(g, b.field, b.aggregate);
    });
    props.lines.forEach((l, i) => {
      const v = agg(g, l.field, l.aggregate);
      out[`l${i}`] = l.per ? v / (agg(g, l.per, l.aggregate) || 1) : v;
    });
    return out;
  });

  const series = [
    ...props.bars.map((b, i) => ({
      key: `b${i}`,
      name: b.label ?? b.field,
      color: `var(--chart-${(i % 6) + 1})`,
      format: props.leftFormat,
    })),
    ...props.lines.map((l, i) => ({
      key: `l${i}`,
      name: l.label ?? (l.per ? `${l.field} per ${l.per}` : l.field),
      color: `var(--chart-${((props.bars.length + i + 1) % 6) + 1})`,
      format: props.rightFormat,
    })),
  ];
  const byKey = new Map(series.map((s) => [s.key, s]));
  const rightValues = [
    ...data.flatMap((d) => props.lines.map((_, i) => Number(d[`l${i}`]))),
    ...(props.referenceLines ?? [])
      .filter((r) => r.axis === "right")
      .map((r) => r.value),
  ].filter(Number.isFinite);
  const rMin = Math.min(...rightValues);
  const rMax = Math.max(...rightValues);
  const rPad = (rMax - rMin) * 0.6 || rMax * 0.1 || 1;
  const rightDomain: [number, number] = [
    Math.max(0, Math.floor(rMin - rPad)),
    Math.ceil(rMax + rPad),
  ];

  const ComboTip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: (TooltipItem & { dataKey?: string })[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="min-w-[180px] rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
        <div className="mb-1.5 font-medium">{label}</div>
        {payload.map((p) => {
          const s = byKey.get(String(p.dataKey));
          return (
            <div key={String(p.dataKey)} className="flex items-center gap-2">
              <span
                className="size-2 rounded-[2px]"
                style={{ background: s?.color }}
              />
              <span className="text-muted-foreground">{s?.name}</span>
              <span className="ml-auto font-mono tabular-nums">
                {formatValue(Number(p.value), s?.format)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const children: ReactNode[] = [
    <CartesianGrid
      key="grid"
      stroke={GRID_STROKE}
      strokeDasharray="3 3"
      vertical={false}
    />,
    <XAxis
      key="x"
      dataKey={props.x}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      tickMargin={8}
    />,
    <YAxis
      key="yl"
      yAxisId="left"
      tick={AXIS_TICK}
      tickFormatter={(v: number) => formatValue(v, props.leftFormat, true)}
      axisLine={false}
      tickLine={false}
      width={56}
    />,
    <YAxis
      key="yr"
      yAxisId="right"
      orientation="right"
      domain={rightDomain}
      tick={AXIS_TICK}
      tickFormatter={(v: number) => formatValue(v, props.rightFormat, true)}
      axisLine={false}
      tickLine={false}
      width={56}
    />,
    <Tooltip
      key="tip"
      cursor={{ fill: "var(--muted)", opacity: 0.6 }}
      content={<ComboTip />}
    />,
    ...props.bars.map((_, i) => (
      <Bar
        key={`b${i}`}
        yAxisId="left"
        dataKey={`b${i}`}
        fill={byKey.get(`b${i}`)!.color}
        radius={[4, 4, 0, 0]}
        maxBarSize={28}
        animationDuration={ANIMATION_MS}
      />
    )),
    ...props.lines.map((_, i) => (
      <Line
        key={`l${i}`}
        yAxisId="right"
        dataKey={`l${i}`}
        type="monotone"
        stroke={byKey.get(`l${i}`)!.color}
        strokeWidth={2.5}
        dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
        activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        animationDuration={ANIMATION_MS}
      />
    )),
    ...(props.referenceLines ?? []).map((r) => (
      <ReferenceLine
        key={`ref-${r.label}`}
        yAxisId={r.axis}
        y={r.value}
        stroke="var(--muted-foreground)"
        strokeDasharray="4 4"
        label={{
          value: r.label,
          position: r.axis === "right" ? "insideTopRight" : "insideTopLeft",
          fill: "var(--muted-foreground)",
          fontSize: 11,
        }}
      />
    )),
  ];
  if (props.brush) {
    children.push(
      <Brush
        key="brush"
        dataKey={props.x}
        height={22}
        travellerWidth={8}
        stroke="var(--chart-1)"
        fill="var(--card)"
        tickFormatter={() => ""}
      />,
    );
  }

  return (
    <div>
      <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
      <ResponsiveContainer width="100%" height={props.height ?? 320}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
        >
          {children}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Heatmap: x by y matrix with totals and two-dimensional cross-filtering
// ---------------------------------------------------------------------------

const Heatmap: ComponentFn<C, "Heatmap"> = ({ props, bindings, emit }) => {
  const [selX, setSelX] = useBoundProp<string | null>(
    props.selectedX ?? null,
    bindings?.selectedX,
  );
  const [selY, setSelY] = useBoundProp<string | null>(
    props.selectedY ?? null,
    bindings?.selectedY,
  );
  const all = toRows(props.data);
  const rows = applyFilters(all, props.filters);
  if (rows.length === 0) return <Empty />;

  const xs = uniqueValues(all, props.x);
  const ys = uniqueValues(all, props.y);
  const cells = new Map<string, Row[]>();
  for (const r of rows) {
    const k = `${r[props.x]}\u0000${r[props.y]}`;
    let arr = cells.get(k);
    if (!arr) cells.set(k, (arr = []));
    arr.push(r);
  }
  const val = (x: string, y: string) =>
    agg(cells.get(`${x}\u0000${y}`) ?? [], props.value, props.aggregate);
  const grid = ys.map((y) => xs.map((x) => val(x, y)));
  const rowTotals = ys.map((y) =>
    agg(
      rows.filter((r) => String(r[props.y]) === y),
      props.value,
      props.aggregate,
    ),
  );
  const colTotals = xs.map((x) =>
    agg(
      rows.filter((r) => String(r[props.x]) === x),
      props.value,
      props.aggregate,
    ),
  );
  const grand = agg(rows, props.value, props.aggregate);
  const scale = (v: number, yi: number, xi: number) => {
    const pool =
      props.normalize === "row"
        ? grid[yi]!
        : props.normalize === "column"
          ? grid.map((r) => r[xi]!)
          : grid.flat();
    const lo = Math.min(...pool);
    const hi = Math.max(...pool);
    return hi > lo ? (v - lo) / (hi - lo) : 1;
  };
  const bindX = !!bindings?.selectedX;
  const bindY = !!bindings?.selectedY;
  const interactive = bindX || bindY;
  const hasSel = !!(selX || selY);
  const matches = (x: string, y: string) =>
    (!selX || selX === x) && (!selY || selY === y);
  const pick = (x: string, y: string) => {
    if (!interactive) return;
    const same = (!bindX || selX === x) && (!bindY || selY === y);
    if (bindX) setSelX(same ? null : x);
    if (bindY) setSelY(same ? null : y);
    emit("select");
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[520px] gap-1 text-[11px]"
        style={{
          gridTemplateColumns: `minmax(90px,auto) repeat(${xs.length}, minmax(44px,1fr)) minmax(64px,auto)`,
        }}
      >
        <div />
        {xs.map((x) => (
          <div
            key={x}
            className={cn(
              "truncate pb-1 text-center text-muted-foreground",
              selX === x && "font-semibold text-foreground",
            )}
          >
            {x}
          </div>
        ))}
        <div className="pb-1 text-right text-muted-foreground">Total</div>
        {ys.map((y, yi) => (
          <HeatRow key={y}>
            <div
              className={cn(
                "flex items-center truncate pr-2 text-xs text-muted-foreground",
                selY === y && "font-semibold text-foreground",
              )}
            >
              {y}
            </div>
            {xs.map((x, xi) => {
              const v = grid[yi]![xi]!;
              const t = scale(v, yi, xi);
              const dim = hasSel && !matches(x, y);
              return (
                <button
                  key={x}
                  type="button"
                  onClick={() => pick(x, y)}
                  title={`${y} / ${x}: ${formatValue(v, props.format)}`}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-[4px] font-mono tabular-nums transition-all",
                    interactive && "hover:ring-2 hover:ring-foreground/30",
                    dim && "opacity-30",
                  )}
                  style={{
                    background: tint("var(--chart-1)", 6 + t * 94),
                    color: t > 0.55 ? "white" : "var(--foreground)",
                  }}
                >
                  {formatValue(v, props.format, true)}
                </button>
              );
            })}
            <div className="flex items-center justify-end font-mono font-medium tabular-nums">
              {formatValue(rowTotals[yi]!, props.format, true)}
            </div>
          </HeatRow>
        ))}
        <div className="pt-1 text-xs text-muted-foreground">Total</div>
        {colTotals.map((v, i) => (
          <div
            key={xs[i]}
            className="pt-1 text-center font-mono font-medium tabular-nums"
          >
            {formatValue(v, props.format, true)}
          </div>
        ))}
        <div className="pt-1 text-right font-mono font-semibold tabular-nums">
          {formatValue(grand, props.format, true)}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span>Low</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${tint("var(--chart-1)", 6)}, var(--chart-1))`,
          }}
        />
        <span>High</span>
        {props.normalize === "row" && <span>(scaled per row)</span>}
      </div>
    </div>
  );
};

function HeatRow({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>;
}

// ---------------------------------------------------------------------------
// Treemap with drill-down
// ---------------------------------------------------------------------------

type TreeNode = {
  name: string;
  size?: number;
  color: string;
  group: string;
  path: string[];
  first?: boolean;
  children?: TreeNode[];
};

const Treemap: ComponentFn<C, "Treemap"> = ({ props }) => {
  const [path, setPath] = useState<string[]>([]);
  const all = toRows(props.data);
  let rows = applyFilters(all, props.filters);
  path.forEach((v, i) => {
    rows = rows.filter((r) => String(r[props.levels[i]!]) === v);
  });
  const depth = path.length;
  const level = props.levels[depth];
  const next = props.levels[depth + 1];
  if (!level || rows.length === 0) return <Empty />;

  const levelValues = uniqueValues(all, level);
  const total = agg(rows, props.value, props.aggregate);
  const data: TreeNode[] = [...groupRows(rows, level).entries()]
    .map(([name, g]) => {
      const color = colorFor(name, levelValues);
      const node: TreeNode = {
        name,
        color,
        group: name,
        path: [...path, name],
      };
      if (next) {
        node.children = [...groupRows(g, next).entries()]
          .map(([child, cg]) => ({
            name: child,
            size: agg(cg, props.value, props.aggregate),
            color,
            group: name,
            path: [...path, name],
          }))
          .sort((a, b) => b.size! - a.size!)
          .map((c, i) => ({ ...c, first: i === 0 }));
      } else {
        node.size = agg(g, props.value, props.aggregate);
      }
      return node;
    })
    .sort((a, b) => {
      const sa = a.size ?? a.children!.reduce((s, c) => s + c.size!, 0);
      const sb = b.size ?? b.children!.reduce((s, c) => s + c.size!, 0);
      return sb - sa;
    });

  const canDrill = !!next && depth < props.levels.length - 1;

  const Content = (p: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    depth?: number;
    index?: number;
    name?: string;
    value?: number;
    color?: string;
    group?: string;
    path?: string[];
    first?: boolean;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0 } = p;
    const leafDepth = next ? 2 : 1;
    if (p.depth === 1 && next) {
      // Group outline + label strip.
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke="var(--card)"
            strokeWidth={4}
          />
          {width > 70 && height > 40 && (
            <text
              x={x + 8}
              y={y + 16}
              fill="white"
              fontSize={11}
              fontWeight={600}
              style={{ pointerEvents: "none" }}
            >
              {p.name}
            </text>
          )}
        </g>
      );
    }
    if (p.depth !== leafDepth) return null;
    const share = total ? (p.value ?? 0) / total : 0;
    const shade = 55 + Math.min(45, share * 300);
    return (
      <g
        onClick={() => canDrill && p.path && setPath(p.path)}
        style={{ cursor: canDrill ? "pointer" : "default" }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          fill={tint(p.color ?? "var(--chart-1)", shade)}
          stroke="var(--card)"
          strokeWidth={1.5}
        />
        {p.first && next && width > 70 && height > 60 && (
          <text
            x={x + 8}
            y={y + 17}
            fill="white"
            fontSize={10}
            fontWeight={700}
            letterSpacing={0.6}
            style={{ pointerEvents: "none", textTransform: "uppercase" }}
          >
            {p.group}
          </text>
        )}
        {width > 64 && height > 38 && (
          <>
            <text
              x={x + 8}
              y={y + height - 24}
              fill="white"
              fontSize={12}
              fontWeight={500}
              style={{ pointerEvents: "none" }}
            >
              {p.name}
            </text>
            <text
              x={x + 8}
              y={y + height - 9}
              fill="white"
              fillOpacity={0.85}
              fontSize={11}
              fontFamily="var(--font-geist-mono)"
              style={{ pointerEvents: "none" }}
            >
              {formatValue(p.value ?? 0, props.format, true)} ·{" "}
              {formatValue(share, "percent")}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => setPath([])}
          className={cn(
            "rounded px-1.5 py-0.5",
            depth === 0
              ? "font-semibold"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          All {props.levels[0]}s
        </button>
        {path.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <button
              type="button"
              onClick={() => setPath(path.slice(0, i + 1))}
              className={cn(
                "rounded px-1.5 py-0.5",
                i === path.length - 1
                  ? "font-semibold"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          </span>
        ))}
        <span className="ml-auto text-muted-foreground">
          {canDrill ? "Click a block to drill down" : `By ${level}`}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={props.height ?? 340}>
        <RTreemap
          data={data}
          dataKey="size"
          nameKey="name"
          aspectRatio={4 / 3}
          isAnimationActive={false}
          content={<Content />}
        >
          <Tooltip content={<TooltipCard format={props.format} />} />
        </RTreemap>
      </ResponsiveContainer>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sankey
// ---------------------------------------------------------------------------

type SankeyNodeDatum = { name: string; stage: number; color: string };

const Sankey: ComponentFn<C, "Sankey"> = ({ props }) => {
  const all = toRows(props.data);
  const rows = applyFilters(all, props.filters);
  if (rows.length === 0 || props.path.length < 2) return <Empty />;

  const nodes: SankeyNodeDatum[] = [];
  const index = new Map<string, number>();
  props.path.forEach((field, stage) => {
    const values = uniqueValues(all, field);
    for (const v of uniqueValues(rows, field)) {
      index.set(`${stage}:${v}`, nodes.length);
      nodes.push({ name: v, stage, color: colorFor(v, values) });
    }
  });
  const links: { source: number; target: number; value: number }[] = [];
  for (let s = 0; s < props.path.length - 1; s++) {
    const a = props.path[s]!;
    const b = props.path[s + 1]!;
    const pairs = new Map<string, Row[]>();
    for (const r of rows) {
      const k = `${r[a]}\u0000${r[b]}`;
      let arr = pairs.get(k);
      if (!arr) pairs.set(k, (arr = []));
      arr.push(r);
    }
    for (const [k, g] of pairs) {
      const [va, vb] = k.split("\u0000");
      links.push({
        source: index.get(`${s}:${va}`)!,
        target: index.get(`${s + 1}:${vb}`)!,
        value: agg(g, props.value, props.aggregate),
      });
    }
  }
  const lastStage = props.path.length - 1;

  const Node = (p: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: SankeyNodeDatum & { value?: number };
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, payload } = p;
    if (!payload) return null;
    const right = payload.stage === lastStage;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={2}
          fill={payload.color}
        />
        <text
          x={right ? x - 8 : x + width + 8}
          y={y + height / 2 - 2}
          textAnchor={right ? "end" : "start"}
          fontSize={12}
          fill="var(--foreground)"
        >
          {payload.name}
        </text>
        <text
          x={right ? x - 8 : x + width + 8}
          y={y + height / 2 + 12}
          textAnchor={right ? "end" : "start"}
          fontSize={10}
          fontFamily="var(--font-geist-mono)"
          fill="var(--muted-foreground)"
        >
          {formatValue(payload.value ?? 0, props.format, true)}
        </text>
      </g>
    );
  };

  const Link = (p: {
    sourceX?: number;
    targetX?: number;
    sourceY?: number;
    targetY?: number;
    sourceControlX?: number;
    targetControlX?: number;
    linkWidth?: number;
    payload?: { source?: SankeyNodeDatum };
  }) => {
    const {
      sourceX = 0,
      targetX = 0,
      sourceY = 0,
      targetY = 0,
      sourceControlX = 0,
      targetControlX = 0,
      linkWidth = 0,
    } = p;
    return (
      <path
        className="transition-[stroke-opacity] hover:[stroke-opacity:0.55]"
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={p.payload?.source?.color ?? "var(--chart-1)"}
        strokeOpacity={0.28}
        strokeWidth={Math.max(1, linkWidth)}
      />
    );
  };

  return (
    <div>
      <div className="mb-2 flex justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {props.path.map((p) => (
          <span key={p}>{p}</span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={props.height ?? 380}>
        <RSankey
          data={{ nodes, links }}
          node={<Node />}
          link={<Link />}
          nodePadding={16}
          nodeWidth={10}
          iterations={64}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Tooltip content={<TooltipCard format={props.format} />} />
        </RSankey>
      </ResponsiveContainer>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Waterfall
// ---------------------------------------------------------------------------

const Waterfall: ComponentFn<C, "Waterfall"> = ({ props }) => {
  const rows = toRows(props.data);
  if (rows.length === 0) return <Empty />;
  let running = 0;
  const data = rows.map((r, i) => {
    const v = Number(r[props.y]) || 0;
    if (i === 0) {
      running = v;
      return {
        name: String(r[props.x]),
        base: 0,
        bar: v,
        delta: v,
        total: v,
        kind: "start",
      };
    }
    const base = v >= 0 ? running : running + v;
    running += v;
    return {
      name: String(r[props.x]),
      base,
      bar: Math.abs(v),
      delta: v,
      total: running,
      kind: v >= 0 ? "up" : "down",
    };
  });
  data.push({
    name: props.totalLabel,
    base: 0,
    bar: running,
    delta: running,
    total: running,
    kind: "end",
  });
  const labelled = data.map((d) => ({
    ...d,
    label:
      (d.kind === "up" ? "+" : "") + formatValue(d.delta, props.format, true),
  }));
  const color = (k: string) =>
    k === "up"
      ? "var(--positive)"
      : k === "down"
        ? "var(--negative)"
        : "var(--chart-1)";

  const WaterTip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload?: (typeof data)[number] }[];
  }) => {
    const d = payload?.[0]?.payload;
    if (!active || !d) return null;
    const isTotal = d.kind === "start" || d.kind === "end";
    return (
      <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
        <div className="mb-1 font-medium">{d.name}</div>
        {!isTotal && (
          <div className="flex gap-4">
            <span className="text-muted-foreground">Change</span>
            <span
              className="ml-auto font-mono tabular-nums"
              style={{ color: color(d.kind) }}
            >
              {d.delta > 0 ? "+" : ""}
              {formatValue(d.delta, props.format)}
            </span>
          </div>
        )}
        <div className="flex gap-4">
          <span className="text-muted-foreground">Running total</span>
          <span className="ml-auto font-mono tabular-nums">
            {formatValue(d.total, props.format)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={props.height ?? 320}>
      <BarChart
        data={labelled}
        margin={{ top: 24, right: 8, bottom: 0, left: 0 }}
        barCategoryGap="22%"
      >
        <CartesianGrid
          stroke={GRID_STROKE}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={(v: number) => formatValue(v, props.format, true)}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={<WaterTip />}
        />
        <Bar
          dataKey="base"
          stackId="w"
          fill="transparent"
          isAnimationActive={false}
        />
        <Bar
          dataKey="bar"
          stackId="w"
          radius={[4, 4, 4, 4]}
          animationDuration={ANIMATION_MS}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={color(d.kind)} />
          ))}
          <LabelList
            dataKey="label"
            position="top"
            fontSize={11}
            fill="var(--muted-foreground)"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ---------------------------------------------------------------------------
// BoxPlot (custom SVG)
// ---------------------------------------------------------------------------

type BoxStats = {
  category: string;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  lo: number;
  hi: number;
  outliers: number[];
  values: number[];
};

const BoxPlot: ComponentFn<C, "BoxPlot"> = ({ props }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = toRows(props.data);
  const rows = applyFilters(all, props.filters);
  if (rows.length === 0) return <Empty />;
  const cats = uniqueValues(all, props.category);

  const stats: BoxStats[] = [...groupRows(rows, props.category).entries()]
    .map(([category, g]) => {
      const values = g
        .map((r) => Number(r[props.value]) || 0)
        .sort((a, b) => a - b);
      const q1 = quantile(values, 0.25);
      const q3 = quantile(values, 0.75);
      const iqr = q3 - q1;
      const loFence = q1 - 1.5 * iqr;
      const hiFence = q3 + 1.5 * iqr;
      const inside = values.filter((v) => v >= loFence && v <= hiFence);
      return {
        category,
        n: values.length,
        min: values[0]!,
        max: values[values.length - 1]!,
        q1,
        q3,
        median: quantile(values, 0.5),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        lo: inside[0] ?? q1,
        hi: inside[inside.length - 1] ?? q3,
        outliers: values.filter((v) => v < loFence || v > hiFence),
        values,
      };
    })
    .sort((a, b) => b.median - a.median);

  const rowH = 52;
  const padL = 104;
  const padR = 20;
  const axisH = 28;
  const height = stats.length * rowH + axisH;
  const max = Math.max(...stats.map((s) => s.max));
  const ticks = niceTicks(max);
  const domainMax = ticks[ticks.length - 1]!;
  const plotW = Math.max(10, width - padL - padR);
  const sx = (v: number) => padL + (v / domainMax) * plotW;
  const fmt = (v: number, compact = false) =>
    `${formatValue(v, props.format, compact)}${props.unit ? ` ${props.unit}` : ""}`;
  const h = hover !== null ? stats[hover] : null;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={sx(t)}
                x2={sx(t)}
                y1={0}
                y2={height - axisH}
                stroke={GRID_STROKE}
                strokeDasharray="3 3"
              />
              <text
                x={sx(t)}
                y={height - 8}
                textAnchor="middle"
                fontSize={12}
                fill="var(--muted-foreground)"
              >
                {formatValue(t, props.format, true)}
              </text>
            </g>
          ))}
          {stats.map((s, i) => {
            const cy = i * rowH + rowH / 2;
            const c = colorFor(s.category, cats);
            const active = hover === i;
            return (
              <g
                key={s.category}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                opacity={hover !== null && !active ? 0.45 : 1}
                style={{ transition: "opacity 150ms" }}
              >
                <rect
                  x={0}
                  y={i * rowH}
                  width={width}
                  height={rowH}
                  fill={active ? "var(--muted)" : "transparent"}
                  opacity={0.5}
                />
                <text
                  x={padL - 12}
                  y={cy + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--foreground)"
                >
                  {s.category}
                </text>
                {props.showPoints &&
                  s.values.map((v, j) => (
                    <circle
                      key={j}
                      cx={sx(v)}
                      cy={cy + (hash01(j + i * 1000) - 0.5) * 30}
                      r={1.6}
                      fill={c}
                      fillOpacity={0.22}
                    />
                  ))}
                <line
                  x1={sx(s.lo)}
                  x2={sx(s.q1)}
                  y1={cy}
                  y2={cy}
                  stroke={c}
                  strokeWidth={1.5}
                />
                <line
                  x1={sx(s.q3)}
                  x2={sx(s.hi)}
                  y1={cy}
                  y2={cy}
                  stroke={c}
                  strokeWidth={1.5}
                />
                <line
                  x1={sx(s.lo)}
                  x2={sx(s.lo)}
                  y1={cy - 7}
                  y2={cy + 7}
                  stroke={c}
                  strokeWidth={1.5}
                />
                <line
                  x1={sx(s.hi)}
                  x2={sx(s.hi)}
                  y1={cy - 7}
                  y2={cy + 7}
                  stroke={c}
                  strokeWidth={1.5}
                />
                <rect
                  x={sx(s.q1)}
                  y={cy - 12}
                  width={Math.max(1, sx(s.q3) - sx(s.q1))}
                  height={24}
                  rx={4}
                  fill={c}
                  fillOpacity={0.2}
                  stroke={c}
                  strokeWidth={1.5}
                />
                <line
                  x1={sx(s.median)}
                  x2={sx(s.median)}
                  y1={cy - 12}
                  y2={cy + 12}
                  stroke={c}
                  strokeWidth={3}
                />
                <path
                  d={`M${sx(s.mean)},${cy - 4} l4,4 l-4,4 l-4,-4 Z`}
                  fill="var(--card)"
                  stroke={c}
                  strokeWidth={1.5}
                />
                {s.outliers.map((v, j) => (
                  <circle
                    key={`o${j}`}
                    cx={sx(v)}
                    cy={cy}
                    r={3}
                    fill="var(--card)"
                    stroke={c}
                    strokeWidth={1.25}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      )}
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[190px] rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(sx(h.q3) + 16, width - 200),
            top: Math.max(0, hover * rowH + rowH / 2 - 70),
          }}
        >
          <div className="mb-1 font-medium">
            {h.category}{" "}
            <span className="font-normal text-muted-foreground">n = {h.n}</span>
          </div>
          <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
            {(
              [
                ["Max", h.max],
                ["Q3", h.q3],
                ["Median", h.median],
                ["Mean", h.mean],
                ["Q1", h.q1],
                ["Min", h.min],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-mono tabular-nums">
                  {fmt(v)}
                </span>
              </div>
            ))}
            <span className="text-muted-foreground">Outliers</span>
            <span className="text-right font-mono tabular-nums">
              {h.outliers.length}
            </span>
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Box: Q1 to Q3</span>
        <span>Thick line: median</span>
        <span>Diamond: mean</span>
        <span>Whiskers: 1.5 IQR</span>
        <span>Circles: outliers</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Radar
// ---------------------------------------------------------------------------

const RadarChart: ComponentFn<C, "RadarChart"> = ({ props }) => {
  const all = toRows(props.data);
  const rows = applyFilters(all, props.filters);
  if (rows.length === 0) return <Empty />;
  const groupsAll = uniqueValues(all, props.seriesBy);
  const groups = groupRows(rows, props.seriesBy);
  const names = [...groups.keys()];

  const data = props.metrics.map((m) => {
    const raw = names.map((g) => agg(groups.get(g)!, m.field, m.aggregate));
    const max = Math.max(...raw);
    const min = Math.min(...raw.filter((v) => v > 0));
    const out: Row = { metric: m.label };
    names.forEach((g, i) => {
      const v = raw[i]!;
      out[g] = m.invert
        ? v > 0
          ? (min / v) * 100
          : 0
        : max
          ? (v / max) * 100
          : 0;
      out[`${g}__raw`] = v;
    });
    return out;
  });
  const metricFormat = new Map(props.metrics.map((m) => [m.label, m.format]));

  const RadarTip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipItem[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const f = metricFormat.get(String(label));
    return (
      <div className="min-w-[180px] rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
        <div className="mb-1.5 font-medium">{label}</div>
        {payload.map((p) => (
          <div key={String(p.name)} className="flex items-center gap-2">
            <span
              className="size-2 rounded-[2px]"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-mono tabular-nums">
              {formatValue(Number(p.payload?.[`${p.name}__raw`]), f)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Legend
        items={names.map((g) => ({ name: g, color: colorFor(g, groupsAll) }))}
      />
      <ResponsiveContainer width="100%" height={props.height ?? 340}>
        <RRadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID_STROKE} />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ ...AXIS_TICK, fill: "var(--foreground)" }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTip />} />
          {names.map((g) => (
            <Radar
              key={g}
              name={g}
              dataKey={g}
              stroke={colorFor(g, groupsAll)}
              fill={colorFor(g, groupsAll)}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 2.5, fillOpacity: 1 }}
              animationDuration={ANIMATION_MS}
            />
          ))}
        </RRadarChart>
      </ResponsiveContainer>
      <p className="text-center text-[11px] text-muted-foreground">
        Each axis is scaled to the best group (100). Hover for raw values.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

const Funnel: ComponentFn<C, "Funnel"> = ({ props }) => {
  const rows = applyFilters(toRows(props.data), props.filters);
  if (rows.length === 0) return <Empty />;
  const groups = groupRows(rows, props.stage);
  const steps = props.stages.map((s) => ({
    stage: s,
    value: agg(groups.get(s) ?? [], props.value, props.aggregate),
  }));
  const top = steps[0]?.value || 1;
  const rates = steps.map((s, i) =>
    i === 0 ? 1 : s.value / (steps[i - 1]!.value || 1),
  );
  const worst =
    rates.slice(1).reduce((w, r, i) => (r < rates[w + 1]! ? i : w), 0) + 1;
  const overall = steps[steps.length - 1]!.value / top;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {formatValue(overall, "percent")}
        </span>
        <span className="text-xs text-muted-foreground">
          overall conversion, {steps[0]!.stage} to{" "}
          {steps[steps.length - 1]!.stage}
        </span>
      </div>
      <div className="space-y-0">
        {steps.map((s, i) => {
          const w = Math.max(4, Math.sqrt(s.value / top) * 100);
          return (
            <div key={s.stage}>
              {i > 0 && (
                <div className="flex items-center py-1 pl-28 text-[11px]">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 tabular-nums",
                      i === worst
                        ? "bg-[var(--negative)]/10 font-medium text-[var(--negative)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatValue(rates[i]!, "percent")} convert
                    {i === worst && " (biggest drop-off)"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                  {s.stage}
                </span>
                <div className="flex flex-1 justify-center">
                  <div
                    className="flex h-9 items-center justify-center rounded-md text-xs font-medium text-white transition-all"
                    style={{
                      width: `${w}%`,
                      background: tint("var(--chart-1)", 100 - i * 13),
                    }}
                  >
                    <span className="font-mono tabular-nums">
                      {formatValue(s.value, props.format, true)}
                    </span>
                  </div>
                </div>
                <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatValue(s.value / top, "percent")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Bar width uses a square-root scale so late stages stay readable.
      </p>
    </div>
  );
};

export const advancedComponents = {
  ComboChart,
  Heatmap,
  Treemap,
  Sankey,
  Waterfall,
  BoxPlot,
  RadarChart,
  Funnel,
};
