import { onMounted, ref } from 'vue';
import apiClient from '@/utils/axios';
import { ECHAGUE_BARANGAYS } from '@/data/echagueBarangays';

const cached = ref<string[]>([]);
let inflight: Promise<string[]> | null = null;

async function loadOfficialBarangays(): Promise<string[]> {
  if (cached.value.length) return cached.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await apiClient.get('/farmers/barangays');
      const names = (res.data?.data ?? []).filter(Boolean) as string[];
      cached.value = names.length ? names : [...ECHAGUE_BARANGAYS];
    } catch {
      cached.value = [...ECHAGUE_BARANGAYS];
    }
    return cached.value;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function useOfficialBarangays() {
  const barangays = ref<string[]>(cached.value.length ? cached.value : [...ECHAGUE_BARANGAYS]);
  const loading = ref(false);

  const refresh = async () => {
    loading.value = true;
    try {
      cached.value = [];
      barangays.value = await loadOfficialBarangays();
    } finally {
      loading.value = false;
    }
  };

  onMounted(async () => {
    loading.value = true;
    try {
      barangays.value = await loadOfficialBarangays();
    } finally {
      loading.value = false;
    }
  });

  return { barangays, loading, refresh };
}
