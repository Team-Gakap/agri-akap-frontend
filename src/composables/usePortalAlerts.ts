import { computed, ref } from 'vue';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';

const pests = ref(0);
const calamities = ref(0);
const loading = ref(false);
let fetchedAt = 0;
let inflight: Promise<void> | null = null;

async function fetchAlerts(force = false): Promise<void> {
  if (!force && Date.now() - fetchedAt < 30_000 && fetchedAt > 0) return;
  if (inflight) return inflight;

  const auth = useAuthStore();
  const role = auth.userRole;
  if (!role || role === 'technician') {
    pests.value = 0;
    calamities.value = 0;
    return;
  }

  inflight = (async () => {
    loading.value = true;
    try {
      if (role === 'barangay_official') {
        const res = await apiClient.get('/brgy/dashboard');
        const desc = res.data?.data?.descriptive ?? res.data?.descriptive ?? res.data?.data ?? {};
        pests.value = Number(desc.active_pests ?? 0);
        calamities.value = Number(desc.active_calamities ?? 0);
      } else {
        const res = await apiClient.get('/dashboard/overview');
        const desc = res.data?.data?.descriptive ?? res.data?.descriptive ?? {};
        pests.value = Number(desc.active_pests ?? desc.pest_critical ?? 0);
        calamities.value = Number(desc.active_calamities ?? 0);
      }
      fetchedAt = Date.now();
    } catch {
      /* chrome is supplementary */
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();

  return inflight;
}

export function usePortalAlerts() {
  const threatTotal = computed(() => pests.value + calamities.value);

  return {
    pests,
    calamities,
    threatTotal,
    loading,
    fetchAlerts,
  };
}
