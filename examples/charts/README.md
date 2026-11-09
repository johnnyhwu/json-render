# Charts Example

Agent-style chart specs rendered with json-render and [Recharts](https://recharts.org). No AI or API key required: the specs are hand-written to match what an agent would emit.

This example shows an alternative to having an agent write raw charting-library JSON (for example a full Plotly figure). The agent only decides *what* to plot. *How* it looks is fixed by the components in `lib/render/registry.tsx`.

## What it shows

- **Fixed visual language**: colors, typography, tooltips, legends, number formatting, animation, and dark mode live in the components. Specs contain no styling, so every chart looks consistent.
- **Small specs**: a full dashboard is about 4 KB of JSON. Data rows are not in the spec; charts reference them with `{ "$state": "/data/sales" }`, and the host app fills that state from a tool result.
- **Cross-filtering**: a `FilterBar`, bar clicks, and donut slice clicks all write to `/filters/*` state. Every chart reads those paths through its `filters` prop. Clickable charts bind `selected` with `{ "$bindState": "/filters/region" }`.
- **Statistics in the component, not the prompt**: quartiles, ratios, normalization, flow links, and running totals are computed by the components. The agent only names fields, for example `{ "type": "BoxPlot", "props": { "category": "product", "value": "cycleDays" } }`.
- **Streaming**: "Replay as stream" reveals elements one by one, as they would arrive from a model.

## Components

<table>
  <thead>
    <tr><th>Component</th><th>Use</th></tr>
  </thead>
  <tbody>
    <tr><td><code>KpiCard</code></td><td>Headline number, change versus previous period, sparkline</td></tr>
    <tr><td><code>BarChart</code></td><td>Category comparison; grouped, stacked, horizontal, sorted, top-N, click-to-filter</td></tr>
    <tr><td><code>TrendChart</code></td><td>Line or area over time; optional stacked series</td></tr>
    <tr><td><code>DonutChart</code></td><td>Share of total with center total and interactive legend</td></tr>
    <tr><td><code>ScatterChart</code></td><td>Two measures, optional bubble size and series color</td></tr>
    <tr><td><code>FilterBar</code></td><td>Pill-style filters that write to state paths</td></tr>
    <tr><td><code>ChartCard</code></td><td>Title and description frame around one chart</td></tr>
    <tr><td><code>ComboChart</code></td><td>Dual axis: bars plus lines or ratios (e.g. revenue per order), target lines, zoom brush</td></tr>
    <tr><td><code>Heatmap</code></td><td>x by y matrix with row and column totals, per-row or per-column scaling, two-dimensional click-to-filter</td></tr>
    <tr><td><code>Treemap</code></td><td>Nested hierarchy sized by value, with drill-down and breadcrumb</td></tr>
    <tr><td><code>Sankey</code></td><td>Flow across successive dimensions (e.g. channel to region to product)</td></tr>
    <tr><td><code>Waterfall</code></td><td>Bridge from a starting total through signed changes to a computed total</td></tr>
    <tr><td><code>BoxPlot</code></td><td>Median, quartiles, 1.5 IQR whiskers, outliers, mean, optional jittered points, hover statistics</td></tr>
    <tr><td><code>RadarChart</code></td><td>Groups compared across metrics, each scaled to the best group, with inverted lower-is-better metrics</td></tr>
    <tr><td><code>Funnel</code></td><td>Stage conversion rates with the biggest drop-off highlighted</td></tr>
  </tbody>
</table>

All charts accept `data`, `aggregate` (`sum`, `avg`, `count`, `min`, `max`), `format` (`number`, `currency`, `percent`, `compact`), and `filters`. The shadcn layout components (`Stack`, `Grid`, and others) are also in the catalog.

## Setup

```bash
pnpm install          # from the monorepo root
cd examples/charts
pnpm dev              # requires portless, see AGENTS.md
```

## Using it with an agent

Pass `catalog.prompt()` from `lib/render/catalog.ts` as the system prompt, put tool results under `/data/*` in the provider's `initialState`, and render the streamed spec with `Renderer`. See `examples/chat` for the streaming wiring.
