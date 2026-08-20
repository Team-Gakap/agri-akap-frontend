import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/utils/axios';

/**
 * Shared barangay context for data-encoding forms.
 * Admins pick a target barangay; barangay officials use assigned_barangay.
 */
export function useEncodingBarangay() {
  const authStore = useAuthStore();
  const isAdminOverride = computed(() => authStore.userRole === 'admin');
  const selectedBarangay = ref('');
  const barangayOptions = ref<string[]>([]);
  const loadingBarangays = ref(false);

  const effectiveBarangay = computed(() => {
    if (isAdminOverride.value) return selectedBarangay.value || null;
    return authStore.user?.assigned_barangay || null;
  });

  const canEncode = computed(() => !!effectiveBarangay.value);

  const loadBarangays = async () => {
    if (!isAdminOverride.value) return;
    loadingBarangays.value = true;
    try {
      const res = await apiClient.get('/farmers/barangays');
      barangayOptions.value = (res.data?.data ?? []).filter(Boolean);
    } catch {
      barangayOptions.value = [];
    } finally {
      loadingBarangays.value = false;
    }
  };

  /** Include in POST payloads when admin is encoding on behalf of a barangay. */
  const payloadBarangayName = (): string | undefined =>
    isAdminOverride.value && selectedBarangay.value ? selectedBarangay.value : undefined;

  onMounted(() => {
    void loadBarangays();
  });

  return {
    isAdminOverride,
    selectedBarangay,
    barangayOptions,
    loadingBarangays,
    effectiveBarangay,
    canEncode,
    loadBarangays,
    payloadBarangayName,
  };
}
