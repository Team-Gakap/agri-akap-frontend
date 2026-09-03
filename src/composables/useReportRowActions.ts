import { ref } from 'vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

export interface ReportDeleteConfig {
  endpoint: string;
  label?: string;
  requireRemarks?: boolean;
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
    if (deleting.value) return;
    deleteOpen.value = false;
    deleteTarget.value = null;
  }

  async function confirmDelete() {
    const cfg = deleteTarget.value;
    if (!cfg || deleting.value) return;
    deleting.value = true;
    try {
      let body: Record<string, string> | undefined;
      if (cfg.requireRemarks) {
        const { promptAuditRemarks } = await import('@/composables/promptAuditRemarks');
        const remarks = await promptAuditRemarks({
          header: `Justify removing ${cfg.label || 'record'}`,
          required: true,
        });
        if (!remarks) {
          return;
        }
        body = { audit_remarks: remarks };
      }
      await apiClient.delete(cfg.endpoint, body ? { data: body } : undefined);
      deleteOpen.value = false;
      deleteTarget.value = null;
      await toast.success(`${cfg.label || 'Record'} removed.`);
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
