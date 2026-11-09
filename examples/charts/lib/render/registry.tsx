"use client";

import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { defineRegistry, useStateStore } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog";
import {
  aggregateValues,
  applyFilters,
  colorFor,
  formatValue,
  pivot,
  toRows,
  uniqueValues,
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
  getPath,
  payloadOf,
  useSelection,
  type TooltipItem,
} from "./chart-parts";
import { advancedComponents } from "./advanced";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const { registry } = defineRegistry(catalog, {
  components: {
    ...shadcnComponents,
    ...advancedComponents,

    ChartCard: ({ props, children }) => (
      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <header className="mb-4">
          <h3 className="text-sm font-semibold tracking-tight">
            {props.title}
          </h3>
          {props.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {props.description}
            </p>
          )}
        </header>
        {children}
      </section>
    ),

    KpiCard: ({ props }) => {
      const gradientId = useId().replace(/:/g, "");
      const rows = applyFilters(toRows(props.data), props.filters);
      const values = rows.map((r) => Number(r[props.field]) || 0);
      const total = aggregateValues(values, props.aggregate);

      let trend: { x: string; v: number }[] = [];
      if (props.trendBy) {
        const { data } = pivot(
          rows,
          props.trendBy,
          props.field,
          props.aggregate,
        );
        trend = data.map((d) => ({
          x: String(d[props.trendBy!]),
          v: Number(d[props.field]),
        }));
      }
      const last = trend.at(-1);
      const prev = trend.at(-2);
      const change = last && prev && prev.v ? (last.v - prev.v) / prev.v : null;
      const up = (change ?? 0) >= 0;
      const stroke = up ? "var(--positive)" : "var(--negative)";

      return (
        <section className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">
            {props.label}
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatValue(total, props.format, total >= 1e6)}
              </p>
              {change !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      up ? "text-[var(--positive)]" : "text-[var(--negative)]",
                    )}
                  >
                    {up ? "+" : ""}
                    {formatValue(change, "percent")}
                  </span>{" "}
                  vs {prev?.x}
                </p>
              )}
            </div>
            {trend.length > 1 && (
              <div className="h-10 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trend}
                    margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={stroke}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={stroke}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="v"
                      type="monotone"
                      stroke={stroke}
                      strokeWidth={1.5}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      );
    },

    BarChart: ({ props, bindings, emit }) => {
      const all = toRows(props.data);
      const rows = applyFilters(all, props.filters);
      const { data, series } = pivot(
        rows,
        props.x,
        props.y,
        props.aggregate,
        props.seriesBy,
      );
      if (props.sort) {
        const sum = (d: Row) =>
          series.reduce((a, s) => a + (Number(d[s]) || 0), 0);
        data.sort((a, b) =>
          props.sort === "asc" ? sum(a) - sum(b) : sum(b) - sum(a),
        );
      }
      if (props.limit && props.limit > 0) data.splice(props.limit);
      const sel = useSelection(props.selected, bindings?.selected, emit);
      if (data.length === 0) return <Empty />;

      const seriesAll = props.seriesBy ? uniqueValues(all, props.seriesBy) : [];
      const colorOf = (s: string) =>
        props.seriesBy ? colorFor(s, seriesAll) : "var(--chart-1)";
      const horizontal = !!props.horizontal;
      const height =
        props.height ??
        (horizontal ? Math.max(180, data.length * 36 + 40) : 280);
      const tick = (v: number) => formatValue(v, props.format, true);
      const radius = (i: number): [number, number, number, number] => {
        const isTop = !props.stacked || i === series.length - 1;
        if (!isTop) return [0, 0, 0, 0];
        return horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
      };

      return (
        <div>
          <Legend items={series.map((s) => ({ name: s, color: colorOf(s) }))} />
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              barCategoryGap={horizontal ? "24%" : "28%"}
            >
              <CartesianGrid
                stroke={GRID_STROKE}
                strokeDasharray="3 3"
                vertical={horizontal}
                horizontal={!horizontal}
              />
              {/* Recharts only finds axes that are direct children (no Fragments). */}
              {horizontal
                ? [
                    <XAxis
                      key="x"
                      type="number"
                      tick={AXIS_TICK}
                      tickFormatter={tick}
                      axisLine={false}
                      tickLine={false}
                    />,
                    <YAxis
                      key="y"
                      type="category"
                      dataKey={props.x}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />,
                  ]
                : [
                    <XAxis
                      key="x"
                      dataKey={props.x}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                    />,
                    <YAxis
                      key="y"
                      tick={AXIS_TICK}
                      tickFormatter={tick}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />,
                  ]}
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={<TooltipCard format={props.format} />}
              />
              {series.map((s, si) => (
                <Bar
                  key={s}
                  dataKey={s}
                  name={props.seriesBy ? s : props.y}
                  stackId={props.stacked ? "stack" : undefined}
                  fill={colorOf(s)}
                  radius={radius(si)}
                  maxBarSize={48}
                  animationDuration={ANIMATION_MS}
                  onClick={(entry: unknown) => {
                    const p = payloadOf(entry);
                    if (p) sel.toggle(String(p[props.x]));
                  }}
                  style={{ cursor: sel.interactive ? "pointer" : undefined }}
                >
                  {data.map((d) => (
                    <Cell
                      key={String(d[props.x])}
                      fillOpacity={sel.isDimmed(String(d[props.x])) ? 0.22 : 1}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    },

    TrendChart: ({ props }) => {
      const uid = useId().replace(/:/g, "");
      const all = toRows(props.data);
      const rows = applyFilters(all, props.filters);
      const { data, series } = pivot(
        rows,
        props.x,
        props.y,
        props.aggregate,
        props.seriesBy,
      );
      if (data.length === 0) return <Empty />;

      const seriesAll = props.seriesBy ? uniqueValues(all, props.seriesBy) : [];
      const colorOf = (s: string) =>
        props.seriesBy ? colorFor(s, seriesAll) : "var(--chart-1)";
      const height = props.height ?? 280;
      const tick = (v: number) => formatValue(v, props.format, true);
      const common = {
        data,
        margin: { top: 4, right: 8, bottom: 0, left: 0 },
      };
      // An array, not a Fragment: Recharts only finds direct children.
      const axes = [
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
          key="y"
          tick={AXIS_TICK}
          tickFormatter={tick}
          axisLine={false}
          tickLine={false}
          width={56}
        />,
        <Tooltip
          key="tooltip"
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          content={<TooltipCard format={props.format} />}
        />,
      ];

      return (
        <div>
          <Legend items={series.map((s) => ({ name: s, color: colorOf(s) }))} />
          <ResponsiveContainer width="100%" height={height}>
            {props.variant === "line" ? (
              <LineChart {...common}>
                {axes}
                {series.map((s) => (
                  <Line
                    key={s}
                    dataKey={s}
                    name={props.seriesBy ? s : props.y}
                    type="monotone"
                    stroke={colorOf(s)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                    animationDuration={ANIMATION_MS}
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart {...common}>
                <defs>
                  {series.map((s, i) => (
                    <linearGradient
                      key={s}
                      id={`${uid}-${i}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={colorOf(s)}
                        stopOpacity={props.stacked ? 0.55 : 0.32}
                      />
                      <stop
                        offset="100%"
                        stopColor={colorOf(s)}
                        stopOpacity={props.stacked ? 0.15 : 0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                {axes}
                {series.map((s, i) => (
                  <Area
                    key={s}
                    dataKey={s}
                    name={props.seriesBy ? s : props.y}
                    type="monotone"
                    stackId={props.stacked ? "stack" : undefined}
                    stroke={colorOf(s)}
                    strokeWidth={2}
                    fill={`url(#${uid}-${i})`}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                    animationDuration={ANIMATION_MS}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    },

    DonutChart: ({ props, bindings, emit }) => {
      const all = toRows(props.data);
      const rows = applyFilters(all, props.filters);
      const { data } = pivot(
        rows,
        props.category,
        props.value,
        props.aggregate,
      );
      const sel = useSelection(props.selected, bindings?.selected, emit);
      if (data.length === 0) return <Empty />;

      const cats = uniqueValues(all, props.category);
      const slices = data
        .map((d) => ({
          name: String(d[props.category]),
          value: Number(d[props.value]) || 0,
        }))
        .sort((a, b) => b.value - a.value);
      const total = slices.reduce((a, s) => a + s.value, 0);
      const focus = slices.find(
        (s) =>
          !sel.isDimmed(s.name) && slices.some((o) => sel.isDimmed(o.name)),
      );
      const height = props.height ?? 220;

      return (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative shrink-0" style={{ width: height, height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<TooltipCard format={props.format} />} />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="92%"
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="none"
                  animationDuration={ANIMATION_MS}
                  onClick={(entry: unknown) => {
                    const p = payloadOf(entry);
                    if (p) sel.toggle(String(p.name));
                  }}
                  style={{ cursor: sel.interactive ? "pointer" : undefined }}
                >
                  {slices.map((s) => (
                    <Cell
                      key={s.name}
                      fill={colorFor(s.name, cats)}
                      fillOpacity={sel.isDimmed(s.name) ? 0.22 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {focus ? focus.name : "Total"}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatValue(focus ? focus.value : total, props.format, true)}
              </span>
            </div>
          </div>
          <ul className="w-full space-y-1.5 text-sm">
            {slices.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  disabled={!sel.interactive}
                  onClick={() => sel.toggle(s.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-opacity",
                    sel.interactive && "hover:bg-muted",
                    sel.isDimmed(s.name) && "opacity-40",
                  )}
                >
                  <span
                    className="size-2.5 rounded-[3px]"
                    style={{ background: colorFor(s.name, cats) }}
                  />
                  <span>{s.name}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {formatValue(total ? s.value / total : 0, "percent")}
                  </span>
                  <span className="w-16 text-right font-mono text-xs tabular-nums">
                    {formatValue(s.value, props.format, true)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    },

    ScatterChart: ({ props }) => {
      const all = toRows(props.data);
      const rows = applyFilters(all, props.filters);
      if (rows.length === 0) return <Empty />;

      const groupsAll = props.seriesBy
        ? uniqueValues(all, props.seriesBy)
        : ["All"];
      const groups = props.seriesBy
        ? uniqueValues(rows, props.seriesBy)
        : ["All"];
      const colorOf = (g: string) =>
        props.seriesBy ? colorFor(g, groupsAll) : "var(--chart-1)";
      const height = props.height ?? 320;

      const ScatterTip = ({
        active,
        payload,
      }: {
        active?: boolean;
        payload?: TooltipItem[];
      }) => {
        const row = payload?.[0]?.payload;
        if (!active || !row) return null;
        return (
          <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
            {props.label && (
              <div className="mb-1 font-medium">{String(row[props.label])}</div>
            )}
            <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
              <span className="text-muted-foreground">{props.x}</span>
              <span className="text-right font-mono tabular-nums">
                {formatValue(Number(row[props.x]), props.xFormat)}
              </span>
              <span className="text-muted-foreground">{props.y}</span>
              <span className="text-right font-mono tabular-nums">
                {formatValue(Number(row[props.y]), props.yFormat)}
              </span>
              {props.size && (
                <>
                  <span className="text-muted-foreground">{props.size}</span>
                  <span className="text-right font-mono tabular-nums">
                    {formatValue(Number(row[props.size]), "number")}
                  </span>
                </>
              )}
              {props.seriesBy && (
                <>
                  <span className="text-muted-foreground">
                    {props.seriesBy}
                  </span>
                  <span className="text-right">
                    {String(row[props.seriesBy])}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      };

      return (
        <div>
          <Legend items={groups.map((g) => ({ name: g, color: colorOf(g) }))} />
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey={props.x}
                name={props.x}
                tick={AXIS_TICK}
                tickFormatter={(v: number) =>
                  formatValue(v, props.xFormat, true)
                }
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey={props.y}
                name={props.y}
                tick={AXIS_TICK}
                tickFormatter={(v: number) =>
                  formatValue(v, props.yFormat, true)
                }
                axisLine={false}
                tickLine={false}
                width={56}
              />
              {props.size && (
                <ZAxis type="number" dataKey={props.size} range={[50, 520]} />
              )}
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ScatterTip />}
              />
              {groups.map((g) => (
                <Scatter
                  key={g}
                  name={g}
                  data={
                    props.seriesBy
                      ? rows.filter((r) => String(r[props.seriesBy!]) === g)
                      : rows
                  }
                  fill={colorOf(g)}
                  fillOpacity={0.75}
                  stroke="var(--card)"
                  strokeWidth={1}
                  animationDuration={ANIMATION_MS}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );
    },

    FilterBar: ({ props }) => {
      const { state, set } = useStateStore();
      return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {props.filters.map((f) => {
            const current = getPath(state, f.statePath);
            const isAll =
              current === null || current === undefined || current === "All";
            const pill = (
              label: string,
              active: boolean,
              value: string | null,
            ): ReactNode => (
              <button
                key={label}
                type="button"
                onClick={() => set(f.statePath, value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
            return (
              <div key={f.statePath} className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {f.label}
                </span>
                <div className="flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5">
                  {pill("All", isAll, null)}
                  {f.options.map((o) => pill(o, current === o, o))}
                </div>
              </div>
            );
          })}
        </div>
      );
    },
  },
  actions: {},
});
