<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Sync</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <header class="page-head">
        <p>Pending uploads and recent field work in one place.</p>
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
        <p v-if="syncStore.lastMessage" class="hint" :class="{ 'hint-error': syncStore.lastSyncFailed }">{{ syncStore.lastMessage }}</p>
        <p v-if="failedCount" class="hint hint-error">
          {{ failedCount }} record(s) were rejected by the server. Fix and resubmit, or tap Sync Now to retry.
        </p>

        <div v-if="pendingItems.length" class="list">
          <article
            v-for="item in pendingItems"
            :key="item.key"
            class="row"
            :class="item.status === 'failed' ? 'failed' : 'pending'"
          >
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.type }} · {{ item.detail }}</p>
              <p v-if="item.status === 'failed' && item.error" class="error-detail">{{ item.error }}</p>
            </div>
            <span class="row-side">
              <ion-badge v-if="item.status === 'failed'" color="danger">Failed</ion-badge>
              <span>{{ formatWhen(item.createdAt) }}</span>
            </span>
          </article>
        </div>
        <div v-else class="empty-mini">Nothing waiting to sync.</div>
      </section>

      <section class="block">
        <div class="block-head">
          <h2>Recent synced</h2>
        </div>
        <p class="hint">Tap a planting record for date, status, and water source.</p>
        <div v-if="loadingHistory" class="empty-mini">Loading recent work…</div>
        <div v-else-if="historyItems.length" class="list">
          <article
            v-for="item in historyItems"
            :key="item.key"
            class="row"
            :class="{ tap: item.type === 'Planting' }"
            @click="openHistoryDetail(item)"
          >
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
import { computed, onMounted, ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonBadge, alertController, onIonViewWillEnter } from '@ionic/vue';
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
  date_planted?: string;
  status?: string;
  water_source?: string;
  crop?: string;
  variety?: string;
  area_planted?: number | string;
}

const syncStore = useSyncStore();
const pendingItems = ref<PendingQueueItem[]>([]);
const historyItems = ref<HistoryItem[]>([]);
const loadingHistory = ref(false);
const failedCount = computed(() => pendingItems.value.filter((i) => i.status === 'failed').length);

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
      date_planted: r.date_planted,
      status: r.status,
      water_source: r.water_source,
      crop: r.crop,
      variety: r.variety,
      area_planted: r.area_planted,
    }));
  } catch {
    historyItems.value = [];
  } finally {
    loadingHistory.value = false;
  }
};

const openHistoryDetail = async (item: HistoryItem) => {
  if (item.type !== 'Planting') return;
  const lines = [
    item.title,
    item.crop ? `Crop: ${item.crop}` : '',
    item.variety ? `Variety: ${item.variety}` : '',
    item.date_planted ? `Date planted: ${item.date_planted}` : '',
    item.status ? `Status: ${item.status}` : '',
    item.water_source ? `Water source: ${item.water_source}` : '',
    item.area_planted != null && item.area_planted !== '' ? `Area: ${item.area_planted} ha` : '',
  ].filter(Boolean);
  const alert = await alertController.create({
    header: 'Planting details',
    message: lines.join('<br/>'),
    buttons: ['Close'],
  });
  await alert.present();
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

onIonViewWillEnter(async () => {
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
}

.page-head p {
  margin: 0;
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

.hint-error {
  color: #b91c1c;
  font-weight: 600;
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

.row.tap {
  cursor: pointer;
}

.row.tap:active {
  background: #f0f7f2;
}

.row.pending {
  border-color: #fdba74;
  background: #fff7ed;
}

.row.failed {
  border-color: #fca5a5;
  background: #fef2f2;
}

.row p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.row .error-detail {
  color: #b91c1c;
  font-weight: 600;
}

.row span {
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
}

.row-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.empty-mini {
  padding: 0.85rem 0.5rem;
  color: #94a3b8;
  font-size: 0.88rem;
}
</style>
