import { computed, ref } from 'vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

export interface ReportDeleteConfig {
  endpoint: string;
  label?: string;
  requireRemarks?: boolean;
  /** When 'void', confirm + toast use void language. */
  destructiveMode?: 'remove' | 'void';
  confirmHeader?: string;
  confirmMessage?: string;
  confirmText?: string;
  successLabel?: string;
  onSuccess?: () => void | Promise<void>;
}

export function useReportRowActions() {
  const deleteOpen = ref(false);
  const deleteTarget = ref<ReportDeleteConfig | null>(null);
  const deleting = ref(false);

  const confirmHeader = computed(() => {
    const cfg = deleteTarget.value;
    if (!cfg) return 'Remove record?';
    if (cfg.confirmHeader) return cfg.confirmHeader;
    return cfg.destructiveMode === 'void' ? 'Void record?' : 'Remove record?';
  });

  const confirmMessage = computed(() => {
    const cfg = deleteTarget.value;
    if (!cfg) {
      return 'This record will be removed. You can contact MAO admin if this was a mistake.';
    }
    if (cfg.confirmMessage) return cfg.confirmMessage;
    if (cfg.destructiveMode === 'void' || cfg.requireRemarks) {
      return 'This will void the record. A justification is required for the audit trail.';
    }
    return 'This record will be removed. You can contact MAO admin if this was a mistake.';
  });

  const confirmText = computed(() => {
    const cfg = deleteTarget.value;
    if (!cfg) return 'Remove';
    if (cfg.confirmText) return cfg.confirmText;
    return cfg.destructiveMode === 'void' ? 'Void' : 'Remove';
  });

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
    const isVoid = cfg.destructiveMode === 'void' || !!cfg.requireRemarks;
    try {
      let body: Record<string, string> | undefined;
      if (cfg.requireRemarks) {
        const { promptAuditRemarks } = await import('@/composables/promptAuditRemarks');
        const remarks = await promptAuditRemarks({
          header: `Justify ${isVoid ? 'voiding' : 'removing'} ${cfg.label || 'record'}`,
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
      const done = cfg.successLabel
        || (isVoid
          ? `${cfg.label || 'Record'} voided.`
          : `${cfg.label || 'Record'} removed.`);
      await toast.success(done);
      await cfg.onSuccess?.();
    } catch (e: any) {
      await toast.error(
        e?.response?.data?.message
        || (isVoid ? 'Could not void this record.' : 'Could not remove this record.'),
      );
    } finally {
      deleting.value = false;
    }
  }

  return {
    deleteOpen,
    deleteTarget,
    deleting,
    confirmHeader,
    confirmMessage,
    confirmText,
    promptDelete,
    cancelDelete,
    confirmDelete,
  };
}
