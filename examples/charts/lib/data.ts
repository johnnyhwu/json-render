/**
 * Deterministic sample data. In a real app these rows would come from a tool
 * call or an API, and the agent would only reference them via
 * `{ "$state": "/data/sales" }` instead of writing them into the spec.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rand = seeded(42);

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const REGIONS = [
  "North America",
  "Europe",
  "Asia Pacific",
  "Latin America",
];
export const CHANNELS = ["Online", "Retail", "Partner"];
export const PRODUCTS = ["Starter", "Team", "Pro", "Enterprise"];

const regionWeight: Record<string, number> = {
  "North America": 1.0,
  Europe: 0.78,
  "Asia Pacific": 0.64,
  "Latin America": 0.3,
};
const channelWeight: Record<string, number> = {
  Online: 1.0,
  Retail: 0.55,
  Partner: 0.4,
};
const productPrice: Record<string, number> = {
  Starter: 29,
  Team: 99,
  Pro: 249,
  Enterprise: 1200,
};
const productVolume: Record<string, number> = {
  Starter: 120,
  Team: 60,
  Pro: 26,
  Enterprise: 5,
};

export type SalesRow = {
  month: string;
  region: string;
  channel: string;
  product: string;
  revenue: number;
  orders: number;
  customers: number;
};

export const sales: SalesRow[] = [];

MONTHS.forEach((month, mi) => {
  const growth = 1 + mi * 0.045 + (mi === 10 || mi === 11 ? 0.18 : 0);
  for (const region of REGIONS) {
    for (const channel of CHANNELS) {
      for (const product of PRODUCTS) {
        const noise = 0.85 + rand() * 0.3;
        const orders = Math.round(
          productVolume[product]! *
            regionWeight[region]! *
            channelWeight[channel]! *
            growth *
            noise,
        );
        sales.push({
          month,
          region,
          channel,
          product,
          orders,
          revenue: Math.round(
            orders * productPrice[product]! * (0.95 + rand() * 0.1),
          ),
          customers: Math.round(orders * (0.3 + rand() * 0.15)),
        });
      }
    }
  }
});

const ACCOUNT_NAMES = [
  "Northwind",
  "Contoso",
  "Fabrikam",
  "Tailspin",
  "Wingtip",
  "Adventure Works",
  "Litware",
  "Proseware",
  "Woodgrove",
  "Alpine Ski",
  "Blue Yonder",
  "Coho Winery",
  "Fourth Coffee",
  "Graphic Design",
  "Humongous",
  "Lamna",
  "Margie's Travel",
  "Nod Publishers",
  "Relecloud",
  "Southridge",
  "Trey Research",
  "VanArsdel",
  "Wide World",
  "Bellows College",
  "City Power",
  "Consolidated",
  "Datum",
  "First Up",
  "Lucerne",
  "Munson's",
];

export type AccountRow = {
  account: string;
  region: string;
  seats: number;
  arr: number;
  nps: number;
};

export const accounts: AccountRow[] = ACCOUNT_NAMES.map((account, i) => {
  const region = REGIONS[i % REGIONS.length]!;
  const seats = Math.round(20 + rand() * rand() * 1400);
  const pricePerSeat = 90 + rand() * 160;
  return {
    account,
    region,
    seats,
    arr: Math.round(seats * pricePerSeat * 12),
    nps: Math.round(10 + rand() * 70),
  };
});

// ---------------------------------------------------------------------------
// Deals: one row per opportunity. Used for distributions and radar profiles.
// ---------------------------------------------------------------------------

const dealSize: Record<string, number> = {
  Starter: 1800,
  Team: 7500,
  Pro: 22000,
  Enterprise: 95000,
};
const dealCycle: Record<string, number> = {
  Starter: 9,
  Team: 21,
  Pro: 38,
  Enterprise: 84,
};
const regionWinRate: Record<string, number> = {
  "North America": 0.34,
  Europe: 0.29,
  "Asia Pacific": 0.25,
  "Latin America": 0.21,
};

/** Skewed noise: mostly near 1, with a long right tail. */
function skew() {
  const u = rand();
  return 0.45 + u * u * u * 2.4 + rand() * 0.35;
}

export type DealRow = {
  deal: string;
  month: string;
  region: string;
  channel: string;
  product: string;
  amount: number;
  cycleDays: number;
  discount: number;
  won: number;
};

export const deals: DealRow[] = Array.from({ length: 640 }, (_, i) => {
  const product = PRODUCTS[Math.floor(rand() * rand() * PRODUCTS.length)]!;
  const region =
    REGIONS[
      Math.floor(rand() * rand() * 1.3 * REGIONS.length) % REGIONS.length
    ]!;
  const channel = CHANNELS[Math.floor(rand() * CHANNELS.length)]!;
  const discount = Math.round(rand() * rand() * 30);
  return {
    deal: `D-${1000 + i}`,
    month: MONTHS[Math.floor(rand() * MONTHS.length)]!,
    region,
    channel,
    product,
    amount: Math.round(dealSize[product]! * skew() * (1 - discount / 100)),
    cycleDays: Math.max(2, Math.round(dealCycle[product]! * skew())),
    discount,
    won:
      rand() < regionWinRate[region]! + (channel === "Partner" ? 0.06 : 0)
        ? 1
        : 0,
  };
});

// ---------------------------------------------------------------------------
// Funnel: visitors through to paid customers, per channel and region.
// ---------------------------------------------------------------------------

export const FUNNEL_STAGES = [
  "Visitors",
  "Sign-ups",
  "Activated",
  "Trials",
  "Paid",
];
const stageRate: Record<string, number[]> = {
  Online: [1, 0.12, 0.62, 0.41, 0.33],
  Retail: [1, 0.07, 0.71, 0.48, 0.42],
  Partner: [1, 0.18, 0.66, 0.55, 0.47],
};
const channelTraffic: Record<string, number> = {
  Online: 120000,
  Retail: 38000,
  Partner: 21000,
};

export type FunnelRow = {
  stage: string;
  channel: string;
  region: string;
  count: number;
};

export const funnel: FunnelRow[] = [];
for (const channel of CHANNELS) {
  for (const region of REGIONS) {
    let n =
      channelTraffic[channel]! * regionWeight[region]! * (0.9 + rand() * 0.2);
    FUNNEL_STAGES.forEach((stage, i) => {
      n *= stageRate[channel]![i]! * (0.93 + rand() * 0.14);
      funnel.push({ stage, channel, region, count: Math.round(n) });
    });
  }
}

// ---------------------------------------------------------------------------
// Revenue bridge: Q3 ARR to Q4 ARR.
// ---------------------------------------------------------------------------

export const bridge = [
  { step: "Q3 ARR", value: 4_820_000 },
  { step: "New logos", value: 1_140_000 },
  { step: "Expansion", value: 620_000 },
  { step: "Price uplift", value: 210_000 },
  { step: "Contraction", value: -340_000 },
  { step: "Churn", value: -520_000 },
  { step: "FX", value: -95_000 },
];
