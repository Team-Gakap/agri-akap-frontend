import { ref } from 'vue';
import apiClient from '@/utils/axios';
import {
  ECHAGUE_BARANGAYS,
  ECHAGUE_CITY,
  ECHAGUE_PROVINCE,
  ECHAGUE_REGION,
} from '@/data/echagueBarangays';

export interface PsgcItem {
  name: string;
  code: string;
}

export interface EchagueDefaults {
  region: string;
  region_code: string;
  province: string;
  province_code: string;
  city: string;
  city_code: string;
  barangays: string[];
}

const fallbackDefaults: EchagueDefaults = {
  region: ECHAGUE_REGION,
  region_code: '0200000000',
  province: ECHAGUE_PROVINCE,
  province_code: '0203100000',
  city: ECHAGUE_CITY,
  city_code: '0203112000',
  barangays: [...ECHAGUE_BARANGAYS],
};

let echagueCache: EchagueDefaults | null = null;
let echagueInflight: Promise<EchagueDefaults> | null = null;

export function isOutsideEchagueCity(city?: string | null): boolean {
  if (!city || !String(city).trim()) return false;
  return String(city).trim().toLowerCase() !== ECHAGUE_CITY.toLowerCase();
}

async function loadEchagueDefaults(): Promise<EchagueDefaults> {
  if (echagueCache) return echagueCache;
  if (echagueInflight) return echagueInflight;

  echagueInflight = (async () => {
    try {
      const res = await apiClient.get('/psgc/defaults/echague');
      const data = res.data?.data;
      if (data?.barangays?.length) {
        echagueCache = {
          region: data.region || fallbackDefaults.region,
          region_code: data.region_code || fallbackDefaults.region_code,
          province: data.province || fallbackDefaults.province,
          province_code: data.province_code || fallbackDefaults.province_code,
          city: data.city || fallbackDefaults.city,
          city_code: data.city_code || fallbackDefaults.city_code,
          barangays: data.barangays as string[],
        };
      } else {
        echagueCache = fallbackDefaults;
      }
    } catch {
      echagueCache = fallbackDefaults;
    }
    return echagueCache!;
  })();

  try {
    return await echagueInflight;
  } finally {
    echagueInflight = null;
  }
}

export function usePsgcLocations() {
  const loading = ref(false);

  const fetchRegions = async (): Promise<PsgcItem[]> => {
    const res = await apiClient.get('/psgc/regions');
    return (res.data?.data ?? []).map((row: { name: string; code: string }) => ({
      name: row.name,
      code: row.code,
    }));
  };

  const fetchProvinces = async (regionCode: string): Promise<PsgcItem[]> => {
    const res = await apiClient.get(`/psgc/regions/${regionCode}/provinces`);
    return (res.data?.data ?? []).map((row: { name: string; code: string }) => ({
      name: row.name,
      code: row.code,
    }));
  };

  const fetchCities = async (provinceCode: string): Promise<PsgcItem[]> => {
    const res = await apiClient.get(`/psgc/provinces/${provinceCode}/cities-municipalities`);
    return (res.data?.data ?? []).map((row: { name: string; code: string }) => ({
      name: String(row.name || '').trim(),
      code: row.code,
    }));
  };

  const fetchBarangays = async (cityCode: string): Promise<PsgcItem[]> => {
    const res = await apiClient.get(`/psgc/cities-municipalities/${cityCode}/barangays`);
    return (res.data?.data ?? []).map((row: { name: string; code: string }) => ({
      name: String(row.name || '').trim(),
      code: row.code,
    }));
  };

  const getEchagueDefaults = async (): Promise<EchagueDefaults> => {
    loading.value = true;
    try {
      return await loadEchagueDefaults();
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    fetchRegions,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
    getEchagueDefaults,
    fallbackDefaults,
  };
}
