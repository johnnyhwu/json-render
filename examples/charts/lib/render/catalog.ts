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
