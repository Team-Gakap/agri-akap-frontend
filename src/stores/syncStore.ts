import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { isOnline, syncAllPendingData, pendingCount } from '@/services/syncService';
import { initConnectivity, onConnectivityChange, refreshConnectivity } from '@/services/connectivity';

export const useSyncStore = defineStore('sync', () => {
  const online = ref(isOnline());
  const pending = ref(0);
  const isSyncing = ref(false);
  const lastSyncAt = ref<string | null>(null);
  const lastMessage = ref<string | null>(null);
  const lastSyncFailed = ref(false);

  const hasPending = computed(() => pending.value > 0);

  async function refreshCount() {
    pending.value = await pendingCount();
  }

  async function sync() {
    if (isSyncing.value || !online.value) return;
    isSyncing.value = true;
    try {
      const { synced, failed, errored } = await syncAllPendingData();
      lastSyncAt.value = new Date().toISOString();
      lastSyncFailed.value = !!errored;
      if (errored) {
        lastMessage.value = 'Sync failed — will retry automatically.';
      } else if (synced || failed) {
        lastMessage.value = `Synced ${synced} record(s)` + (failed ? `, ${failed} failed` : '');
      }
    } finally {
      isSyncing.value = false;
      await refreshCount();
    }
  }

  /** Wire native/web connectivity events + periodic reachability probe. Call once on app start. */
  function init() {
    initConnectivity();
    onConnectivityChange((next) => {
      const cameOnline = next && !online.value;
      online.value = next;
      if (cameOnline) void sync();
    });

    refreshCount();
    if (online.value) sync();
  }

  /** Re-check connectivity (e.g. on app resume) and sync if reachable. */
  async function recheck() {
    const next = await refreshConnectivity();
    online.value = next;
    if (next) await sync();
  }

  return {
    online,
    pending,
    isSyncing,
    lastSyncAt,
    lastMessage,
    lastSyncFailed,
    hasPending,
    refreshCount,
    sync,
    init,
    recheck,
  };
});
