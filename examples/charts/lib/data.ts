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
