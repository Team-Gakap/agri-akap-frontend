import { ref } from 'vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

export interface ReportDeleteConfig {
  endpoint: string;
  label?: string;
  onSuccess?: () => void | Promise<void>;
}

export function useReportRowActions() {
  const deleteOpen = ref(false);
  const deleteTarget = ref<ReportDeleteConfig | null>(null);
  const deleting = ref(false);

  function promptDelete(config: ReportDeleteConfig) {
    deleteTarget.value = config;
    deleteOpen.value = true;
  }

  function cancelDelete() {
    deleteOpen.value = false;
    deleteTarget.value = null;
  }

  async function confirmDelete() {
    if (!deleteTarget.value || deleting.value) return;
    deleting.value = true;
    try {
      await apiClient.delete(deleteTarget.value.endpoint);
      await toast.success(`${deleteTarget.value.label || 'Record'} removed.`);
      deleteOpen.value = false;
      const cfg = deleteTarget.value;
      deleteTarget.value = null;
      await cfg.onSuccess?.();
    } catch (e: any) {
      await toast.error(e?.response?.data?.message || 'Could not remove this record.');
    } finally {
      deleting.value = false;
    }
  }

  return {
    deleteOpen,
    deleteTarget,
    deleting,
    promptDelete,
    cancelDelete,
    confirmDelete,
  };
}
