<template>
  <ion-page>
    <ion-content class="ion-padding page-bg">
      <header class="page-head">
        <div>
          <h1>History & Sync</h1>
          <p>Pending uploads and recent field work in one place.</p>
        </div>
        <ion-button
          class="sync-btn"
          :disabled="!syncStore.online || syncStore.isSyncing || !syncStore.hasPending"
          @click="runSync"
        >
          {{ syncStore.isSyncing ? 'Syncing…' : 'Sync Now' }}
        </ion-button>
      </header>

      <section class="block">
        <div class="block-head">
          <h2>Waiting to sync</h2>
          <ion-badge v-if="syncStore.pending" color="warning">{{ syncStore.pending }}</ion-badge>
        </div>
        <p v-if="!syncStore.online" class="hint">Offline. Records stay on this device until you reconnect.</p>
        <p v-if="syncStore.lastMessage" class="hint">{{ syncStore.lastMessage }}</p>

        <div v-if="pendingItems.length" class="list">
          <article v-for="item in pendingItems" :key="item.key" class="row pending">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.type }} · {{ item.detail }}</p>
            </div>
            <span>{{ formatWhen(item.createdAt) }}</span>
          </article>
        </div>
        <div v-else class="empty-mini">Nothing waiting to sync.</div>
      </section>

      <section class="block">
        <div class="block-head">
          <h2>Recent synced</h2>
        </div>
        <div v-if="loadingHistory" class="empty-mini">Loading recent work…</div>
        <div v-else-if="historyItems.length" class="list">
          <article v-for="item in historyItems" :key="item.key" class="row">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.type }} · {{ item.detail }}</p>
            </div>
            <span>{{ formatWhen(item.createdAt) }}</span>
          </article>
        </div>
        <div v-else class="empty-mini">No recent field records yet.</div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { IonPage, IonContent, IonButton, IonBadge } from '@ionic/vue';
import { useSyncStore } from '@/stores/syncStore';
import { listPendingQueueItems, type PendingQueueItem } from '@/services/syncService';
import { presentToast } from '@/utils/toast';
import apiClient from '@/utils/axios';

interface HistoryItem {
  key: string;
  type: string;
  title: string;
  detail: string;
  createdAt?: string;
}

const syncStore = useSyncStore();
const pendingItems = ref<PendingQueueItem[]>([]);
const historyItems = ref<HistoryItem[]>([]);
const loadingHistory = ref(false);

const formatWhen = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const loadPending = async () => {
  await syncStore.refreshCount();
  pendingItems.value = await listPendingQueueItems();
};

const loadHistory = async () => {
  loadingHistory.value = true;
  try {
    const res = await apiClient.get('/technician/history');
    const rows = res.data?.data ?? [];
    historyItems.value = (Array.isArray(rows) ? rows : []).map((r: any, i: number) => ({
      key: `${r.type || 'item'}-${r.created_at || i}`,
      type: r.type || 'Record',
      title: r.title || 'Field record',
      detail: r.detail || '',
      createdAt: r.created_at,
    }));
  } catch {
    historyItems.value = [];
  } finally {
    loadingHistory.value = false;
  }
};

const runSync = async () => {
  await syncStore.sync();
  await loadPending();
  await loadHistory();
  if (syncStore.lastMessage) {
    await presentToast(syncStore.lastMessage, syncStore.pending ? 'warning' : 'success');
  }
};

onMounted(async () => {
  await loadPending();
  await loadHistory();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-top: 0.5rem;
}

.page-head h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #1a4731;
}

.page-head p {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: #64748b;
}

.sync-btn {
  --background: #1a4731;
  --color: #fff;
  font-weight: 700;
  text-transform: none;
  flex-shrink: 0;
}

.block {
  margin-bottom: 1.25rem;
}

.block-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.block-head h2 {
  margin: 0;
  font-size: 1rem;
  color: #1a4731;
}

.hint {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  color: #64748b;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.row.pending {
  border-color: #fdba74;
  background: #fff7ed;
}

.row p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.row span {
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
}

.empty-mini {
  padding: 0.85rem 0.5rem;
  color: #94a3b8;
  font-size: 0.88rem;
}
</style>
