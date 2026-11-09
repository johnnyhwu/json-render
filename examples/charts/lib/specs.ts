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
];
