/**
 * DA-HVCDP (RA 7900) high-value commercial crop taxonomy.
 * Backend mirror: agri-akap-backend/config/hvcc_catalog.php
 */
export const HVCC_CATEGORIES: Record<string, string[]> = {
  Fruits: ['Pineapple', 'Banana', 'Melon', 'Watermelon', 'Mango'],
  Vegetables: ['Eggplant', 'Tomato', 'Bitter Gourd (Ampalaya)', 'String Beans', 'Okra'],
  'Beverage / Industrial Crops': ['Coffee', 'Cacao'],
  'Root Crops / Tubers': ['Ube (Purple Yam)', 'Sweet Potato (Kamote)', 'Cassava'],
  'Other Fruits': ['Papaya', 'Calamansi', 'Pomelo', 'Durian', 'Lanzones', 'Rambutan', 'Dragon Fruit', 'Mangosteen', 'Jackfruit'],
};

export const TREE_FRUIT_CATEGORIES = [
  'Fruits',
  'Other Fruits',
  'Beverage / Industrial Crops',
] as const;

export const OTHER_COMMODITY = 'Other';

export const OVERRIDE_REASONS = [
  { code: 'tenant_endorsed', label: 'Tenant/Lessee Endorsed by Barangay Captain' },
  { code: 'pending_rsbsa_batch', label: 'Pending RSBSA Enrollment (Encoded in Batch)' },
  { code: 'emergency_calamity_hvcdp', label: 'Emergency Calamity Buffer Relief (Under DA-HVCDP)' },
] as const;

export type OverrideReasonCode = (typeof OVERRIDE_REASONS)[number]['code'];

export function hvccCategories(): string[] {
  return Object.keys(HVCC_CATEGORIES);
}

export function hvccCommoditiesFor(category?: string | null): string[] {
  if (!category) return [];
  return HVCC_CATEGORIES[category] ?? [];
}

export function allHvccCommodities(): string[] {
  return [...new Set(Object.values(HVCC_CATEGORIES).flat())];
}

export function isHvccCommodity(value?: string | null): boolean {
  const key = (value || '').trim().toLowerCase();
  if (!key) return false;
  return allHvccCommodities().some((name) => name.toLowerCase() === key);
}

export function categoryForHvccCommodity(commodity?: string | null): string | null {
  const key = (commodity || '').trim().toLowerCase();
  if (!key) return null;
  for (const [category, names] of Object.entries(HVCC_CATEGORIES)) {
    if (names.some((name) => name.toLowerCase() === key)) return category;
  }
  return null;
}

export function isTreeFruitCategory(category?: string | null): boolean {
  return TREE_FRUIT_CATEGORIES.includes(category as (typeof TREE_FRUIT_CATEGORIES)[number]);
}

export function plotMatchesCrop(plotCommodity: string, crop: string, hvccCommodity?: string | null): boolean {
  const plot = plotCommodity.trim().toLowerCase();
  const key = crop.trim().toLowerCase();
  if (key === 'hvcc' || key === 'high-value' || key === 'high-value crops') {
    if (hvccCommodity && plot === hvccCommodity.trim().toLowerCase()) return true;
    return plot === 'hvcc' || plot.includes('high-value') || plot === 'hvc' || plot.includes('hvc');
  }
  return plot === key;
}

export function isHvccCrop(crop?: string | null): boolean {
  const key = (crop || '').trim().toLowerCase();
  return key === 'hvcc' || key.startsWith('hvcc ');
}

function hvccCommodityFromRow(row: {
  hvcc_commodity?: string | null;
  crop_category?: string | null;
  variety?: string | null;
}): string {
  const commodity = String(row.hvcc_commodity || '').trim();
  if (commodity && commodity.toLowerCase() !== 'hvcc') return commodity;

  const category = String(row.crop_category || '').trim();
  if (category && !hvccCategories().some((name) => name.toLowerCase() === category.toLowerCase())) {
    return category;
  }

  const variety = String(row.variety || '').trim();
  if (variety && isHvccCommodity(variety)) return variety;

  return '';
}

/** Grid / export label: "HVCC - Pineapple" or the plain Rice/Corn string. */
export function formatCropLabel(row: {
  crop?: string | null;
  crop_type?: string | null;
  hvcc_commodity?: string | null;
  crop_category?: string | null;
  variety?: string | null;
}): string {
  const crop = String(row.crop_type || row.crop || '').trim();
  if (!isHvccCrop(crop) && crop.toLowerCase() !== 'high-value' && crop.toLowerCase() !== 'high-value crops') {
    return crop || '—';
  }
  const detail = hvccCommodityFromRow(row);
  if (detail) return `HVCC - ${detail}`;
  return 'HVCC';
}

/**
 * Variety cell for grids/exports.
 * HVCC rows that stored the commodity in `variety` show "—" instead of repeating the crop.
 */
export function formatVarietyLabel(row: {
  crop?: string | null;
  crop_type?: string | null;
  hvcc_commodity?: string | null;
  crop_category?: string | null;
  variety?: string | null;
}): string {
  const variety = String(row.variety || '').trim();
  const crop = String(row.crop_type || row.crop || '').trim();
  const isHvcc = isHvccCrop(crop)
    || crop.toLowerCase() === 'high-value'
    || crop.toLowerCase() === 'high-value crops'
    || !!String(row.hvcc_commodity || '').trim();

  if (!isHvcc) return variety || '—';

  if (!variety) return '—';

  const commodity = hvccCommodityFromRow(row);
  if (commodity && variety.toLowerCase() === commodity.toLowerCase()) return '—';

  return variety;
}

export function registryBadgeLabel(row: {
  rsbsa_no?: string | null;
  registration_type?: string | null;
  is_temporary?: boolean | null;
  is_walkin?: boolean | null;
}): string | null {
  const rsbsa = String(row.rsbsa_no || '').trim();
  if (rsbsa) return null;
  if (row.registration_type === 'manual_walkin' || row.is_walkin || row.is_temporary) {
    return row.registration_type === 'manual_walkin' ? 'MANUAL-ENTRY' : 'UNREGISTERED';
  }
  return 'UNREGISTERED';
}
