import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

/**
 * Chart catalog.
 *
 * The agent only decides *what* to plot: which dataset, which fields, how to
 * aggregate, and which filters apply. Colors, fonts, spacing, tooltips,
 * animation, and number formatting live in the React components in
 * `registry.tsx`, so every chart looks the same no matter what the agent
 * writes.
 */

const rows = z
  .array(z.record(z.string(), z.unknown()))
  .describe(
    'Rows of data. Prefer { "$state": "/data/<name>" } over inline rows.',
  );

const aggregate = z
  .enum(["sum", "avg", "count", "min", "max"])
  .nullable()
  .describe("How to combine rows that share the same x value. Default: sum.");

const format = z
  .enum(["number", "currency", "percent", "compact"])
  .nullable()
  .describe("Number format for axes, tooltips, and labels. Default: number.");

const filters = z
  .array(
    z.object({
      field: z.string(),
      value: z
        .unknown()
        .describe(
          'Value to match. Usually { "$state": "/filters/<name>" }. null or "All" disables the filter.',
        ),
    }),
  )
  .nullable()
  .describe("Row filters applied before aggregation.");

const selected = z
  .string()
  .nullable()
  .describe(
    'Cross-filter selection. Bind with { "$bindState": "/filters/<name>" }; clicking a mark writes its category there, clicking again clears it.',
  );

export const catalog = defineCatalog(schema, {
  components: {
    ...shadcnComponentDefinitions,

    ChartCard: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      slots: ["default"],
      description:
        "Card frame for one chart. Put exactly one chart component inside.",
    },

    KpiCard: {
      props: z.object({
        label: z.string(),
        data: rows,
        field: z.string().describe("Numeric field to aggregate."),
        aggregate,
        format,
        trendBy: z
          .string()
          .nullable()
          .describe(
            "Ordered field (e.g. month) used for the sparkline and the change versus the previous period.",
          ),
        filters,
      }),
      description:
        "Headline number with change versus previous period and a sparkline.",
    },

    BarChart: {
      props: z.object({
        data: rows,
        x: z.string().describe("Category field."),
        y: z.string().describe("Numeric field."),
        aggregate,
        seriesBy: z
          .string()
          .nullable()
          .describe("Optional field that splits bars into colored series."),
        stacked: z.boolean().nullable(),
        horizontal: z.boolean().nullable(),
        sort: z.enum(["asc", "desc"]).nullable(),
        limit: z
          .number()
          .nullable()
          .describe("Keep only the first N bars after sorting."),
        format,
        height: z.number().nullable(),
        filters,
        selected,
      }),
      events: ["select"],
      description:
        "Bar chart for comparing categories. Supports grouped or stacked series and click-to-filter.",
    },

    TrendChart: {
      props: z.object({
        data: rows,
        x: z.string().describe("Ordered field such as month or date."),
        y: z.string(),
        aggregate,
        seriesBy: z.string().nullable(),
        variant: z.enum(["line", "area"]).nullable(),
        stacked: z.boolean().nullable(),
        format,
        height: z.number().nullable(),
        filters,
      }),
      description: "Line or area chart for values over time.",
    },

    DonutChart: {
      props: z.object({
        data: rows,
        category: z.string(),
        value: z.string(),
        aggregate,
        format,
        height: z.number().nullable(),
        filters,
        selected,
      }),
      events: ["select"],
      description:
        "Donut chart for share of total (up to ~6 slices). Shows the total in the center. Supports click-to-filter.",
    },

    ScatterChart: {
      props: z.object({
        data: rows,
        x: z.string(),
        y: z.string(),
        size: z.string().nullable().describe("Optional field for bubble size."),
        label: z
          .string()
          .nullable()
          .describe("Field shown as the point name in tooltips."),
        seriesBy: z.string().nullable(),
        xFormat: format,
        yFormat: format,
        height: z.number().nullable(),
        filters,
      }),
      description:
        "Scatter or bubble chart for the relationship between two measures.",
    },

    // -----------------------------------------------------------------------
    // Advanced charts. Same contract: the agent names fields and options,
    // the component does all statistics, layout, and styling.
    // -----------------------------------------------------------------------

    ComboChart: {
      props: z.object({
        data: rows,
        x: z.string().describe("Ordered field such as month."),
        bars: z
          .array(
            z.object({
              field: z.string(),
              label: z.string().nullable(),
              aggregate,
            }),
          )
          .describe("Bar series on the left axis."),
        lines: z
          .array(
            z.object({
              field: z.string(),
              label: z.string().nullable(),
              aggregate,
              per: z
                .string()
                .nullable()
                .describe(
                  "Divide the aggregated field by this aggregated field (e.g. revenue per orders = average order value).",
                ),
            }),
          )
          .describe("Line series on the right axis."),
        leftFormat: format,
        rightFormat: format,
        referenceLines: z
          .array(
            z.object({
              value: z.number(),
              label: z.string(),
              axis: z.enum(["left", "right"]),
            }),
          )
          .nullable()
          .describe("Horizontal target or threshold lines."),
        brush: z
          .boolean()
          .nullable()
          .describe("Show a range slider under the chart for zooming."),
        height: z.number().nullable(),
        filters,
      }),
      description:
        "Dual-axis chart: bars on the left axis and lines (including ratios) on the right, with optional target lines and a zoom brush.",
    },

    Heatmap: {
      props: z.object({
        data: rows,
        x: z.string(),
        y: z.string(),
        value: z.string(),
        aggregate,
        format,
        normalize: z
          .enum(["none", "row", "column"])
          .nullable()
          .describe(
            "Color scale: none = whole grid, row = each row on its own scale (good for seasonality).",
          ),
        selectedX: selected,
        selectedY: selected,
        filters,
      }),
      events: ["select"],
      description:
        "Matrix of x by y colored by an aggregated value, with row and column totals. Clicking a cell sets both selections.",
    },

    Treemap: {
      props: z.object({
        data: rows,
        levels: z
          .array(z.string())
          .describe("Hierarchy, outermost first, e.g. ['region', 'product']."),
        value: z.string(),
        aggregate,
        format,
        height: z.number().nullable(),
        filters,
      }),
      description:
        "Nested rectangles sized by value. Click a group to drill down, use the breadcrumb to go back up.",
    },

    Sankey: {
      props: z.object({
        data: rows,
        path: z
          .array(z.string())
          .describe(
            "Fields that define the flow stages, e.g. ['channel', 'region', 'product'].",
          ),
        value: z.string(),
        aggregate,
        format,
        height: z.number().nullable(),
        filters,
      }),
      description:
        "Flow diagram showing how a value splits across successive dimensions.",
    },

    Waterfall: {
      props: z.object({
        data: rows,
        x: z.string().describe("Step label field."),
        y: z
          .string()
          .describe(
            "Signed change per step. The first row is the starting total.",
          ),
        totalLabel: z.string().describe("Label for the computed ending total."),
        format,
        height: z.number().nullable(),
      }),
      description:
        "Bridge chart from a starting value through positive and negative changes to a computed total.",
    },

    BoxPlot: {
      props: z.object({
        data: rows,
        category: z.string(),
        value: z.string(),
        format,
        showPoints: z
          .boolean()
          .nullable()
          .describe("Overlay individual observations as jittered dots."),
        unit: z
          .string()
          .nullable()
          .describe("Unit suffix for the axis, e.g. 'days'."),
        filters,
      }),
      description:
        "Distribution per category: median, quartiles, 1.5 IQR whiskers, outliers, and mean. Hover a row for exact statistics.",
    },

    RadarChart: {
      props: z.object({
        data: rows,
        seriesBy: z.string().describe("One polygon per value of this field."),
        metrics: z.array(
          z.object({
            field: z.string(),
            label: z.string(),
            aggregate,
            invert: z
              .boolean()
              .nullable()
              .describe(
                "Lower is better (e.g. cycle time), so invert the score.",
              ),
            format,
          }),
        ),
        height: z.number().nullable(),
        filters,
      }),
      description:
        "Compare groups across several metrics. Each metric is scaled 0-100 relative to the best group; tooltips show raw values.",
    },

    Funnel: {
      props: z.object({
        data: rows,
        stage: z.string(),
        value: z.string(),
        stages: z.array(z.string()).describe("Stage order, top to bottom."),
        aggregate,
        format,
        filters,
      }),
      description:
        "Conversion funnel with step and overall conversion rates and the biggest drop-off highlighted.",
    },

    FilterBar: {
      props: z.object({
        filters: z.array(
          z.object({
            label: z.string(),
            statePath: z
              .string()
              .describe("State path such as /filters/region."),
            options: z.array(z.string()),
          }),
        ),
      }),
      description:
        "Row of pill-style filter controls. Each filter writes its value (or null for All) to statePath.",
    },
  },
  actions: {},
});
