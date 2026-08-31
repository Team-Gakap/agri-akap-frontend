/**
 * Single source of truth for the MAO Hybrid/Inbred subsidy unit matrix.
 * Rice and Corn campaigns both use this table; only `target_crop` differs.
 * Mirrors agri-akap-backend/app/Support/SubsidyCatalog.php — keep in sync.
 */

export type SeedClass = 'Hybrid' | 'Inbred';
export type ItemType = 'seed' | 'abono' | 'liquid_fertilizer' | 'wettable' | 'cash';

export interface CatalogEntry {
  label: string;
  unit: string;
  secondaryUnit: string | null;
  isCash: boolean;
}

export const SEED_CLASSES: SeedClass[] = ['Hybrid', 'Inbred'];

export const SUBSIDY_CATALOG: Record<SeedClass, Partial<Record<ItemType, CatalogEntry>>> = {
  Hybrid: {
    seed: { label: 'Seed', unit: 'kg', secondaryUnit: 'bags', isCash: false },
    abono: { label: 'Abono', unit: 'kg', secondaryUnit: 'bags', isCash: false },
    liquid_fertilizer: { label: 'Liquid Fertilizer', unit: 'bottle', secondaryUnit: null, isCash: false },
    wettable: { label: 'Wettable', unit: 'kg', secondaryUnit: 'packs', isCash: false },
    cash: { label: 'Cash Assistance', unit: 'Cash (PHP)', secondaryUnit: null, isCash: true },
  },
  Inbred: {
    seed: { label: 'Seed', unit: 'bags', secondaryUnit: null, isCash: false },
  },
};

export function itemTypesFor(seedClass?: SeedClass | string | null): ItemType[] {
  if (!seedClass) return [];
  return Object.keys(SUBSIDY_CATALOG[seedClass as SeedClass] ?? {}) as ItemType[];
}

export function getCatalogEntry(
  seedClass?: SeedClass | string | null,
  itemType?: ItemType | string | null,
): CatalogEntry | null {
  if (!seedClass || !itemType) return null;
  return SUBSIDY_CATALOG[seedClass as SeedClass]?.[itemType as ItemType] ?? null;
}

export function isDualUnit(seedClass?: string | null, itemType?: string | null): boolean {
  return !!getCatalogEntry(seedClass, itemType)?.secondaryUnit;
}

export function isCashItemType(itemType?: string | null): boolean {
  return itemType === 'cash';
}

export function isValidCombo(seedClass?: string | null, itemType?: string | null): boolean {
  return !!getCatalogEntry(seedClass, itemType);
}

export function itemTypeLabel(itemType?: ItemType | string | null): string {
  const labels: Record<string, string> = {
    seed: 'Seed',
    abono: 'Abono',
    liquid_fertilizer: 'Liquid Fertilizer',
    wettable: 'Wettable',
    cash: 'Cash Assistance',
  };
  return itemType ? (labels[itemType] || itemType) : '';
}

/** Compact "Rice · Hybrid · Seed" style label used in pickers and program lists. */
export function catalogSummary(
  targetCrop?: string | null,
  seedClass?: string | null,
  itemType?: string | null,
): string {
  const parts = [targetCrop, seedClass, itemTypeLabel(itemType)].filter(Boolean);
  return parts.join(' · ');
}
