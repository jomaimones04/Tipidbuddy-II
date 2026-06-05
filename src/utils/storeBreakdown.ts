import type { ItemPriceHistoryEntry, PriceRecord } from '../types/index';

export type StorePriceRecord = Pick<
  PriceRecord | ItemPriceHistoryEntry,
  'storeId' | 'storeName' | 'price' | 'date'
>;

/** Latest record per store (by storeName), sorted cheapest first */
export const getStoreBreakdown = <T extends StorePriceRecord>(
  records: T[]
): T[] => {
  const storeMap: Record<string, T> = {};

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const record of sorted) {
    const key = record.storeName.toLowerCase().trim();
    storeMap[key] = record;
  }

  return Object.values(storeMap).sort((a, b) => a.price - b.price);
};

export interface StoreStatsEntry {
  storeId: string;
  storeName: string;
  latestPrice: number;
  latestDate: string;
  count: number;
  avgPrice: number;
}

/** Per-store stats for ItemDetail Stores tab (dedupe by name, keep all purchase counts) */
export const getStoreStatsBreakdown = (
  records: StorePriceRecord[]
): StoreStatsEntry[] => {
  const grouped = new Map<
    string,
    { storeId: string; storeName: string; prices: number[]; latest: StorePriceRecord }
  >();

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const record of sorted) {
    const key = record.storeName.toLowerCase().trim();
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        storeId: record.storeId,
        storeName: record.storeName,
        prices: [record.price],
        latest: record,
      });
    } else {
      existing.prices.push(record.price);
      existing.latest = record;
      existing.storeId = record.storeId;
    }
  }

  return Array.from(grouped.values())
    .map((g) => ({
      storeId: g.storeId,
      storeName: g.storeName,
      latestPrice: g.latest.price,
      latestDate: g.latest.date,
      count: g.prices.length,
      avgPrice: g.prices.reduce((sum, p) => sum + p, 0) / g.prices.length,
    }))
    .sort((a, b) => a.avgPrice - b.avgPrice);
};

/** Most recent purchase across all stores */
export const getMostRecentPurchase = <T extends StorePriceRecord>(
  records: T[]
): T | null => {
  if (records.length === 0) return null;
  return [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
};
