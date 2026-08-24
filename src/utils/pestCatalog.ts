import { reactive } from 'vue';
import apiClient from '@/utils/axios';

export type CropThreats = {
  pests: string[];
  diseases: string[];
};

export const PEST_CATALOG: Record<'Rice' | 'Corn', CropThreats> = {
  Rice: {
    pests: [
      'Brown Planthopper',
      'Rice Black Bug',
      'Golden Apple Snail',
      'Rice Bug',
      'Stem Borer',
      'Rodents',
    ],
    diseases: [
      'Rice Blast',
      'Tungro Virus',
      'Sheath Blight',
      'Bacterial Leaf Blight',
    ],
  },
  Corn: {
    pests: [
      'Fall Armyworm',
      'Corn Borer',
      'Corn Earworm',
      'Rodents',
    ],
    diseases: [
      'Downy Mildew',
      'Corn Leaf Blight',
      'Common Rust',
    ],
  },
};

/** Live catalog (defaults match pest_guidelines.php; hydrated from GET /pest-guidelines). */
export const pestCatalog = reactive<Record<'Rice' | 'Corn', CropThreats>>({
  Rice: { pests: [...PEST_CATALOG.Rice.pests], diseases: [...PEST_CATALOG.Rice.diseases] },
  Corn: { pests: [...PEST_CATALOG.Corn.pests], diseases: [...PEST_CATALOG.Corn.diseases] },
});

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || '').trim()).filter(Boolean);
}

export async function loadPestCatalog(): Promise<void> {
  try {
    const res = await apiClient.get('/pest-guidelines');
    const data = res.data?.data ?? {};
    (['Rice', 'Corn'] as const).forEach((crop) => {
      const row = data[crop] || {};
      const pests = asStringList(row.pests);
      const diseases = asStringList(row.diseases);
      if (pests.length) pestCatalog[crop].pests = pests;
      if (diseases.length) pestCatalog[crop].diseases = diseases;
    });
  } catch {
    // Keep bundled defaults when offline or the endpoint is unavailable.
  }
}

export function threatsForCrop(crop?: string | null): CropThreats {
  const key = String(crop || '').toLowerCase().includes('corn') ? 'Corn' : 'Rice';
  return pestCatalog[key];
}
