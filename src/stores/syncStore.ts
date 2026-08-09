import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { isOnline, syncAllPendingData, pendingCount } from '@/services/syncService';

export const useSyncStore = defineStore('sync', () => {
  const online = ref(isOnline());
  const pending = ref(0);
  const isSyncing = ref(false);
  const lastSyncAt = ref<string | null>(null);
  const lastMessage = ref<string | null>(null);

  const hasPending = computed(() => pending.value > 0);

  async function refreshCount() {
    pending.value = await pendingCount();
  }

  async function sync() {
    if (isSyncing.value || !online.value) return;
    isSyncing.value = true;
    try {
      const { synced, failed } = await syncAllPendingData();
      lastSyncAt.value = new Date().toISOString();
      if (synced || failed) {
        lastMessage.value = `Synced ${synced} record(s)` + (failed ? `, ${failed} failed` : '');
      }
    } finally {
      isSyncing.value = false;
      await refreshCount();
    }
  }

  /** Wire browser/webview connectivity events. Call once on app start. */
  function init() {
    const goOnline = async () => {
      online.value = true;
      await sync();
    };
    const goOffline = () => {
      online.value = false;
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    refreshCount();
    if (online.value) sync();
  }

  return {
    online,
    pending,
    isSyncing,
    lastSyncAt,
    lastMessage,
    hasPending,
    refreshCount,
    sync,
    init,
  };
});
