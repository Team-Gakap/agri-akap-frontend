import { onMounted, ref } from 'vue';
import apiClient from '@/utils/axios';
import { ECHAGUE_CITY, ECHAGUE_PROVINCE, ECHAGUE_REGION } from '@/data/echagueBarangays';

export type LocationCatalog = {
  regions: string[];
  provinces: string[];
  cities: string[];
  defaults: { region: string; province: string; city: string };
};

const fallback: LocationCatalog = {
  regions: [ECHAGUE_REGION, 'National Capital Region (NCR)'],
  provinces: [ECHAGUE_PROVINCE, 'Metro Manila'],
  cities: [
    ECHAGUE_CITY,
    'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila',
    'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig',
    'Pateros', 'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
  ],
  defaults: { region: ECHAGUE_REGION, province: ECHAGUE_PROVINCE, city: ECHAGUE_CITY },
};

let cached: LocationCatalog | null = null;
let inflight: Promise<LocationCatalog> | null = null;

async function loadOfficialLocations(): Promise<LocationCatalog> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await apiClient.get('/farmers/locations');
      const data = res.data?.data;
      if (data?.regions?.length && data?.provinces?.length && data?.cities?.length) {
        cached = data as LocationCatalog;
      } else {
        cached = fallback;
      }
    } catch {
      cached = fallback;
    }
    return cached!;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function useOfficialLocations() {
  const locations = ref<LocationCatalog>(cached ?? fallback);
  const loading = ref(false);

  onMounted(async () => {
    loading.value = true;
    try {
      locations.value = await loadOfficialLocations();
    } finally {
      loading.value = false;
    }
  });

  return { locations, loading };
}
