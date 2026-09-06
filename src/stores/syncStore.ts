import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { isOnline, syncAllPendingData, pendingCount, resetSyncingToPending, prefetchFieldCache } from '@/services/syncService';
import { initConnectivity, onConnectivityChange, refreshConnectivity } from '@/services/connectivity';

export const useSyncStore = defineStore('sync', () => {
  const online = ref(isOnline());
  const pending = ref(0);
  const isSyncing = ref(false);
  const lastSyncAt = ref<string | null>(null);
  const lastMessage = ref<string | null>(null);
  const lastSyncFailed = ref(false);
  const fieldCacheAt = ref<string | null>(null);
  const isPrefetching = ref(false);

  const hasPending = computed(() => pending.value > 0);

  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let unsubConnectivity: (() => void) | null = null;

  async function refreshCount() {
    pending.value = await pendingCount();
  }

  function refreshFieldCacheAt() {
    try {
      fieldCacheAt.value = localStorage.getItem('agri_field_cache_at');
    } catch {
      fieldCacheAt.value = null;
    }
  }

  async function downloadFieldData(force = true) {
    if (!online.value || isPrefetching.value) return { ok: false as const, message: 'Cannot download right now.' };
    isPrefetching.value = true;
    try {
      const result = await prefetchFieldCache({ force });
      refreshFieldCacheAt();
      if (result.ok) {
        lastMessage.value = `Field data updated (${result.farmerCount} farmer${result.farmerCount === 1 ? '' : 's'}).`;
        lastSyncFailed.value = false;
      } else if (result.message) {
        lastMessage.value = result.message;
        lastSyncFailed.value = true;
      }
      return result;
    } finally {
      isPrefetching.value = false;
    }
  }

  async function sync(options: { forceFieldCache?: boolean } = {}) {
    if (isSyncing.value || !online.value) return;
    isSyncing.value = true;
    try {
      const { synced, failed, errored, errorMessage } = await syncAllPendingData();
      lastSyncAt.value = new Date().toISOString();
      lastSyncFailed.value = !!errored;
      if (errored) {
        lastMessage.value = errorMessage?.trim() || 'Sync failed — will retry automatically.';
      } else if (synced || failed) {
        lastMessage.value = `Synced ${synced} record(s)` + (failed ? `, ${failed} failed` : '');
      }
      if (!errored) {
        const syncMsg = lastMessage.value;
        const force = options.forceFieldCache === true || synced > 0;
        const download = await downloadFieldData(force);
        if (!download.ok && syncMsg) {
          // Keep the upload result visible; download failure is secondary.
          lastMessage.value = syncMsg;
          lastSyncFailed.value = false;
        }
      } else {
        refreshFieldCacheAt();
      }
    } finally {
      isSyncing.value = false;
      await refreshCount();
    }
  }

  /** Wire native/web connectivity events + periodic reachability probe. Call once on app start. */
  function init() {
    initConnectivity();
    refreshFieldCacheAt();
    unsubConnectivity?.();
    unsubConnectivity = onConnectivityChange((next) => {
      const cameOnline = next && !online.value;
      online.value = next;
      if (cameOnline) void sync();
    });

    void (async () => {
      await resetSyncingToPending();
      await refreshCount();
      if (online.value) void sync();
    })();

    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(() => {
      if (online.value && hasPending.value && !isSyncing.value) void sync();
    }, 60_000);
  }

  /** Re-check connectivity (e.g. on app resume) and sync if reachable. */
  async function recheck() {
    const next = await refreshConnectivity();
    online.value = next;
    if (next) await sync();
  }

  function teardown() {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    unsubConnectivity?.();
    unsubConnectivity = null;
  }

  return {
    online,
    pending,
    isSyncing,
    lastSyncAt,
    lastMessage,
    lastSyncFailed,
    fieldCacheAt,
    isPrefetching,
    hasPending,
    refreshCount,
    refreshFieldCacheAt,
    downloadFieldData,
    sync,
    init,
    recheck,
    teardown,
  };
});
