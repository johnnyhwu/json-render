import type { Spec } from "@json-render/core";

/**
 * These specs are what an agent would emit. They contain no colors, fonts,
 * tooltip config, or data rows: only layout, field names, aggregation, and
 * state bindings. Data is referenced via `/data/*` state paths, which the host
 * app fills from tool results.
 */

const salesFilters = (except?: "region" | "channel" | "product") =>
  (["region", "channel", "product"] as const)
    .filter((f) => f !== except)
    .map((f) => ({ field: f, value: { $state: `/filters/${f}` } }));

export const examples: { name: string; prompt: string; spec: Spec }[] = [
  {
    name: "Sales overview",
    prompt:
      "Build me a 2026 sales overview. I want to slice by region, channel and product.",
    spec: {
      root: "page",
      state: { filters: { region: null, channel: null, product: null } },
      elements: {
        page: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: "stretch",
            justify: null,
            className: null,
          },
          children: ["filters", "kpis", "row1", "row2"],
        },
        filters: {
          type: "FilterBar",
          props: {
            filters: [
              {
                label: "Region",
                statePath: "/filters/region",
                options: [
                  "North America",
                  "Europe",
                  "Asia Pacific",
                  "Latin America",
                ],
              },
              {
                label: "Channel",
                statePath: "/filters/channel",
                options: ["Online", "Retail", "Partner"],
              },
              {
                label: "Product",
                statePath: "/filters/product",
                options: ["Starter", "Team", "Pro", "Enterprise"],
              },
            ],
          },
        },
        kpis: {
          type: "Grid",
          props: { columns: 3, gap: "lg", className: null },
          children: ["kpiRevenue", "kpiOrders", "kpiCustomers"],
        },
        kpiRevenue: {
          type: "KpiCard",
          props: {
            label: "Revenue",
            data: { $state: "/data/sales" },
            field: "revenue",
            aggregate: "sum",
            format: "currency",
            trendBy: "month",
            filters: salesFilters(),
          },
        },
        kpiOrders: {
          type: "KpiCard",
          props: {
            label: "Orders",
            data: { $state: "/data/sales" },
            field: "orders",
            aggregate: "sum",
            format: "number",
            trendBy: "month",
            filters: salesFilters(),
          },
        },
        kpiCustomers: {
          type: "KpiCard",
          props: {
            label: "New customers",
            data: { $state: "/data/sales" },
            field: "customers",
            aggregate: "sum",
            format: "number",
            trendBy: "month",
            filters: salesFilters(),
          },
        },
        row1: {
          type: "Grid",
          props: {
            columns: 1,
            gap: "lg",
            className: "lg:grid-cols-[1.6fr_1fr]",
          },
          children: ["trendCard", "productCard"],
        },
        trendCard: {
          type: "ChartCard",
          props: {
            title: "Monthly revenue by channel",
            description: "Stacked, responds to every filter",
          },
          children: ["trend"],
        },
        trend: {
          type: "TrendChart",
          props: {
            data: { $state: "/data/sales" },
            x: "month",
            y: "revenue",
            aggregate: "sum",
            seriesBy: "channel",
            variant: "area",
            stacked: true,
            format: "currency",
            height: 280,
            filters: salesFilters(),
          },
        },
        productCard: {
          type: "ChartCard",
          props: {
            title: "Revenue by product",
            description: "Click a slice to filter the page",
          },
          children: ["product"],
        },
        product: {
          type: "DonutChart",
          props: {
            data: { $state: "/data/sales" },
            category: "product",
            value: "revenue",
            aggregate: "sum",
            format: "currency",
            height: 200,
            filters: salesFilters("product"),
            selected: { $bindState: "/filters/product" },
          },
        },
        row2: {
          type: "Grid",
          props: { columns: 1, gap: "lg", className: "lg:grid-cols-2" },
          children: ["regionCard", "ordersCard"],
        },
        regionCard: {
          type: "ChartCard",
          props: {
            title: "Revenue by region",
            description: "Click a bar to filter the page",
          },
          children: ["region"],
        },
        region: {
          type: "BarChart",
          props: {
            data: { $state: "/data/sales" },
            x: "region",
            y: "revenue",
            aggregate: "sum",
            seriesBy: null,
            stacked: null,
            horizontal: true,
            sort: "desc",
            limit: null,
            format: "currency",
            height: null,
            filters: salesFilters("region"),
            selected: { $bindState: "/filters/region" },
          },
        },
        ordersCard: {
          type: "ChartCard",
          props: { title: "Orders by product", description: "Monthly trend" },
          children: ["orders"],
        },
        orders: {
          type: "TrendChart",
          props: {
            data: { $state: "/data/sales" },
            x: "month",
            y: "orders",
            aggregate: "sum",
            seriesBy: "product",
            variant: "line",
            stacked: null,
            format: "number",
            height: 220,
            filters: salesFilters("product"),
          },
        },
      },
    },
  },
  {
    name: "Product mix",
    prompt: "Compare how each product sells across channels and regions.",
    spec: {
      root: "page",
      state: { filters: { region: null } },
      elements: {
        page: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: "stretch",
            justify: null,
            className: null,
          },
          children: ["filters", "mixCard", "regionCard"],
        },
        filters: {
          type: "FilterBar",
          props: {
            filters: [
              {
                label: "Region",
                statePath: "/filters/region",
                options: [
                  "North America",
                  "Europe",
                  "Asia Pacific",
                  "Latin America",
                ],
              },
            ],
          },
        },
        mixCard: {
          type: "ChartCard",
          props: {
            title: "Revenue by product and channel",
            description: "Stacked bars",
          },
          children: ["mix"],
        },
        mix: {
          type: "BarChart",
          props: {
            data: { $state: "/data/sales" },
            x: "product",
            y: "revenue",
            aggregate: "sum",
            seriesBy: "channel",
            stacked: true,
            horizontal: true,
            sort: "desc",
            limit: null,
            format: "currency",
            height: null,
            filters: [
              { field: "region", value: { $state: "/filters/region" } },
            ],
            selected: null,
          },
        },
        regionCard: {
          type: "ChartCard",
          props: {
            title: "Orders by region and product",
            description: "Grouped bars",
          },
          children: ["byRegion"],
        },
        byRegion: {
          type: "BarChart",
          props: {
            data: { $state: "/data/sales" },
            x: "region",
            y: "orders",
            aggregate: "sum",
            seriesBy: "product",
            stacked: false,
            horizontal: false,
            sort: null,
            limit: null,
            format: "compact",
            height: 300,
            filters: [
              { field: "region", value: { $state: "/filters/region" } },
            ],
            selected: null,
          },
        },
      },
    },
  },
  {
    name: "Account analysis",
    prompt:
      "Which accounts are the largest, and does size relate to satisfaction?",
    spec: {
      root: "page",
      state: { filters: { region: null } },
      elements: {
        page: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: "stretch",
            justify: null,
            className: null,
          },
          children: ["filters", "row"],
        },
        filters: {
          type: "FilterBar",
          props: {
            filters: [
              {
                label: "Region",
                statePath: "/filters/region",
                options: [
                  "North America",
                  "Europe",
                  "Asia Pacific",
                  "Latin America",
                ],
              },
            ],
          },
        },
        row: {
          type: "Grid",
          props: {
            columns: 1,
            gap: "lg",
            className: "lg:grid-cols-[1.4fr_1fr]",
          },
          children: ["scatterCard", "topCard"],
        },
        scatterCard: {
          type: "ChartCard",
          props: {
            title: "Seats vs ARR",
            description: "Bubble size is NPS. Hover for details",
          },
          children: ["scatter"],
        },
        scatter: {
          type: "ScatterChart",
          props: {
            data: { $state: "/data/accounts" },
            x: "seats",
            y: "arr",
            size: "nps",
            label: "account",
            seriesBy: "region",
            xFormat: "number",
            yFormat: "currency",
            height: 380,
            filters: [
              { field: "region", value: { $state: "/filters/region" } },
            ],
          },
        },
        topCard: {
          type: "ChartCard",
          props: { title: "Top 10 accounts by ARR", description: null },
          children: ["top"],
        },
        top: {
          type: "BarChart",
          props: {
            data: { $state: "/data/accounts" },
            x: "account",
            y: "arr",
            aggregate: "sum",
            seriesBy: null,
            stacked: null,
            horizontal: true,
            sort: "desc",
            limit: 10,
            format: "currency",
            height: null,
            filters: [
              { field: "region", value: { $state: "/filters/region" } },
            ],
            selected: null,
          },
        },
      },
    },
  },
  {
    name: "Revenue deep dive",
    prompt:
      "Give me a deep dive on revenue: trend with average order value, seasonality by product, where revenue concentrates, and how it flows from channel to product.",
    spec: {
      root: "page",
      state: { filters: { region: null, channel: null, product: null } },
      elements: {
        page: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: "stretch",
            justify: null,
            className: null,
          },
          children: ["filters", "comboCard", "row", "sankeyCard"],
        },
        filters: {
          type: "FilterBar",
          props: {
            filters: [
              {
                label: "Region",
                statePath: "/filters/region",
                options: [
                  "North America",
                  "Europe",
                  "Asia Pacific",
                  "Latin America",
                ],
              },
              {
                label: "Channel",
                statePath: "/filters/channel",
                options: ["Online", "Retail", "Partner"],
              },
              {
                label: "Product",
                statePath: "/filters/product",
                options: ["Starter", "Team", "Pro", "Enterprise"],
              },
            ],
          },
        },
        comboCard: {
          type: "ChartCard",
          props: {
            title: "Revenue and average order value",
            description:
              "Bars on the left axis, ratio line on the right. Drag the slider to zoom",
          },
          children: ["combo"],
        },
        combo: {
          type: "ComboChart",
          props: {
            data: { $state: "/data/sales" },
            x: "month",
            bars: [{ field: "revenue", label: "Revenue", aggregate: "sum" }],
            lines: [
              {
                field: "revenue",
                label: "Avg order value",
                aggregate: "sum",
                per: "orders",
              },
            ],
            leftFormat: "currency",
            rightFormat: "currency",
            referenceLines: [
              { value: 105, label: "AOV target $105", axis: "right" },
            ],
            brush: true,
            height: 340,
            filters: salesFilters(),
          },
        },
        row: {
          type: "Grid",
          props: {
            columns: 1,
            gap: "lg",
            className: "lg:grid-cols-[1.25fr_1fr]",
          },
          children: ["heatCard", "treeCard"],
        },
        heatCard: {
          type: "ChartCard",
          props: {
            title: "Seasonality: revenue by product and month",
            description:
              "Each row on its own scale. Click a row to filter by product",
          },
          children: ["heat"],
        },
        heat: {
          type: "Heatmap",
          props: {
            data: { $state: "/data/sales" },
            x: "month",
            y: "product",
            value: "revenue",
            aggregate: "sum",
            format: "currency",
            normalize: "row",
            selectedX: null,
            selectedY: { $bindState: "/filters/product" },
            filters: salesFilters("product"),
          },
        },
        treeCard: {
          type: "ChartCard",
          props: {
            title: "Revenue concentration",
            description: "Region, then product",
          },
          children: ["tree"],
        },
        tree: {
          type: "Treemap",
          props: {
            data: { $state: "/data/sales" },
            levels: ["region", "product", "channel"],
            value: "revenue",
            aggregate: "sum",
            format: "currency",
            height: 330,
            filters: salesFilters(),
          },
        },
        sankeyCard: {
          type: "ChartCard",
          props: {
            title: "Revenue flow",
            description: "Channel to region to product",
          },
          children: ["sankey"],
        },
        sankey: {
          type: "Sankey",
          props: {
            data: { $state: "/data/sales" },
            path: ["channel", "region", "product"],
            value: "revenue",
            aggregate: "sum",
            format: "currency",
            height: 400,
            filters: salesFilters(),
          },
        },
      },
    },
  },
  {
    name: "Pipeline and deals",
    prompt:
      "How healthy is our pipeline? Show the conversion funnel, what moved ARR this quarter, sales cycle distribution, win rates by region and channel, and how regions compare.",
    spec: {
      root: "page",
      state: { filters: { region: null, channel: null } },
      elements: {
        page: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: "stretch",
            justify: null,
            className: null,
          },
          children: ["filters", "row1", "row2", "row3"],
        },
        filters: {
          type: "FilterBar",
          props: {
            filters: [
              {
                label: "Region",
                statePath: "/filters/region",
                options: [
                  "North America",
                  "Europe",
                  "Asia Pacific",
                  "Latin America",
                ],
              },
              {
                label: "Channel",
                statePath: "/filters/channel",
                options: ["Online", "Retail", "Partner"],
              },
            ],
          },
        },
        row1: {
          type: "Grid",
          props: { columns: 1, gap: "lg", className: "lg:grid-cols-2" },
          children: ["funnelCard", "bridgeCard"],
        },
        funnelCard: {
          type: "ChartCard",
          props: {
            title: "Acquisition funnel",
            description: "Responds to region and channel",
          },
          children: ["funnel"],
        },
        funnel: {
          type: "Funnel",
          props: {
            data: { $state: "/data/funnel" },
            stage: "stage",
            value: "count",
            stages: ["Visitors", "Sign-ups", "Activated", "Trials", "Paid"],
            aggregate: "sum",
            format: "number",
            filters: [
              { field: "region", value: { $state: "/filters/region" } },
              { field: "channel", value: { $state: "/filters/channel" } },
            ],
          },
        },
        bridgeCard: {
          type: "ChartCard",
          props: {
            title: "ARR bridge, Q3 to Q4",
            description: "What added and removed recurring revenue",
          },
          children: ["bridge"],
        },
        bridge: {
          type: "Waterfall",
          props: {
            data: { $state: "/data/bridge" },
            x: "step",
            y: "value",
            totalLabel: "Q4 ARR",
            format: "currency",
            height: 330,
          },
        },
        row2: {
          type: "Grid",
          props: {
            columns: 1,
            gap: "lg",
            className: "lg:grid-cols-[1.3fr_1fr]",
          },
          children: ["boxCard", "winCard"],
        },
        boxCard: {
          type: "ChartCard",
          props: {
            title: "Sales cycle length by product",
            description: "Distribution of days to close, every deal plotted",
          },
          children: ["box"],
        },
        box: {
          type: "BoxPlot",
          props: {
            data: { $state: "/data/deals" },
            category: "product",
            value: "cycleDays",
            format: "number",
            showPoints: true,
            unit: "days",
            filters: [
              { field: "region", value: { $state: "/filters/region" } },
              { field: "channel", value: { $state: "/filters/channel" } },
            ],
          },
        },
        winCard: {
          type: "ChartCard",
          props: {
            title: "Win rate by region and channel",
            description: "Click a cell to filter the page",
          },
          children: ["win"],
        },
        win: {
          type: "Heatmap",
          props: {
            data: { $state: "/data/deals" },
            x: "channel",
            y: "region",
            value: "won",
            aggregate: "avg",
            format: "percent",
            normalize: "none",
            selectedX: { $bindState: "/filters/channel" },
            selectedY: { $bindState: "/filters/region" },
            filters: null,
          },
        },
        row3: {
          type: "ChartCard",
          props: {
            title: "Regional sales profile",
            description:
              "Higher is better on every axis; cycle time and discount are inverted",
          },
          children: ["radar"],
        },
        radar: {
          type: "RadarChart",
          props: {
            data: { $state: "/data/deals" },
            seriesBy: "region",
            metrics: [
              {
                field: "amount",
                label: "Avg deal size",
                aggregate: "avg",
                invert: null,
                format: "currency",
              },
              {
                field: "won",
                label: "Win rate",
                aggregate: "avg",
                invert: null,
                format: "percent",
              },
              {
                field: "amount",
                label: "Deal volume",
                aggregate: "count",
                invert: null,
                format: "number",
              },
              {
                field: "cycleDays",
                label: "Sales cycle",
                aggregate: "avg",
                invert: true,
                format: "number",
              },
              {
                field: "discount",
                label: "Discounting",
                aggregate: "avg",
                invert: true,
                format: "number",
              },
            ],
            height: 360,
            filters: [
              { field: "channel", value: { $state: "/filters/channel" } },
            ],
          },
        },
      },
    },
  },
];
