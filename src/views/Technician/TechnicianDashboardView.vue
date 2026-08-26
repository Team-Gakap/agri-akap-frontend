<template>
  <ion-page>
    <ion-content class="dash-bg" :scroll-y="true">
      <header class="dash-header">
        <img
          src="@/assets/images/echague-logo.png"
          alt="LGU Echague"
          class="lgu-logo"
          onerror="this.style.display='none'"
        />
        <div class="welcome">
          <p class="welcome-portal">MAO Echague · Field Portal</p>
          <div class="welcome-row">
            <h1 class="welcome-name">{{ displayName }} <span class="welcome-role">(Technician)</span></h1>
            <button
              type="button"
              class="sync-pill"
              :class="pillClass"
              :aria-label="pillLabel"
              @click="openSyncDrawer"
            >
              <span class="status-dot" aria-hidden="true"></span>
              {{ pillText }}
            </button>
          </div>
        </div>
      </header>

      <div class="dash-shell">
        <ion-card button class="scan-card" @click="go('/tech/subsidy-dispense')">
          <ion-ripple-effect type="bounded"></ion-ripple-effect>
          <ion-card-content class="scan-content">
            <div class="scan-icon">
              <ion-icon :icon="qrCodeOutline"></ion-icon>
            </div>
            <div class="scan-copy">
              <h2>QR Scanner</h2>
              <p>Verify farmer &amp; dispense subsidies</p>
              <span>Instant RSBSA lookup &amp; inventory claim check</span>
            </div>
            <ion-icon class="scan-chevron" :icon="chevronForwardOutline"></ion-icon>
          </ion-card-content>
        </ion-card>

        <p class="section-label">Farm Registration &amp; GIS</p>
        <ion-card button class="row-card" @click="go('/tech/geo-tag-queue')">
          <ion-ripple-effect type="bounded"></ion-ripple-effect>
          <ion-card-content class="row-content">
            <div class="tool-icon geotag">
              <ion-icon :icon="locationOutline"></ion-icon>
            </div>
            <div class="row-copy">
              <h3>Geo-Tag Farm Parcel</h3>
              <p>Polygon / GPS pin</p>
            </div>
            <ion-icon class="row-chevron" :icon="chevronForwardOutline"></ion-icon>
          </ion-card-content>
        </ion-card>

        <p class="section-label">Crop Production Logs</p>
        <ion-grid class="tool-grid">
          <ion-row>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/planting')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon planting">
                    <ion-icon :icon="leafOutline"></ion-icon>
                  </div>
                  <h3>Planting Log</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/standing-crop')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon standing">
                    <ion-icon :icon="nutritionOutline"></ion-icon>
                  </div>
                  <h3>Standing Crop</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/harvest')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon harvest">
                    <ion-icon :icon="basketOutline"></ion-icon>
                  </div>
                  <h3>Harvest Log</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/pest-queue')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon pest">
                    <ion-icon :icon="bugOutline"></ion-icon>
                  </div>
                  <h3>Pest Report</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>

        <p class="section-label">Calamity &amp; Auditing</p>
        <ion-card button class="row-card calamity" @click="go('/tech/calamity-queue')">
          <ion-ripple-effect type="bounded"></ion-ripple-effect>
          <ion-card-content class="row-content">
            <div class="tool-icon damage">
              <ion-icon :icon="thunderstormOutline"></ion-icon>
            </div>
            <div class="row-copy">
              <h3>Calamity / Damage Assessment</h3>
              <p>RDANA field form</p>
            </div>
            <ion-icon class="row-chevron" :icon="chevronForwardOutline"></ion-icon>
          </ion-card-content>
        </ion-card>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="scan-fab">
        <ion-fab-button color="primary" aria-label="Scan Farmer ID" @click="go('/tech/subsidy-dispense')">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-modal
      :is-open="syncOpen"
      class="sync-sheet"
      :initial-breakpoint="0.55"
      :breakpoints="[0, 0.55, 0.9]"
      handle-behavior="cycle"
      @didDismiss="syncOpen = false"
    >
      <div class="sheet-inner">
        <header class="sheet-head">
          <div>
            <h2>Pending sync</h2>
            <p>{{ sheetSubtitle }}</p>
          </div>
          <ion-button
            class="sheet-sync-btn"
            :disabled="!syncStore.online || syncStore.isSyncing || !syncStore.hasPending"
            @click="runSync"
          >
            {{ syncStore.isSyncing ? 'Syncing…' : 'Sync Now' }}
          </ion-button>
        </header>

        <div v-if="pendingItems.length" class="sheet-list">
          <article v-for="item in pendingItems" :key="item.key" class="sheet-row">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.type }} · {{ item.detail }}</p>
            </div>
            <span>{{ formatWhen(item.createdAt) }}</span>
          </article>
        </div>
        <p v-else class="sheet-empty">Nothing waiting to sync. Field records on this device are safe.</p>

        <ion-button fill="outline" expand="block" class="sheet-open-btn" @click="goHistory">
          Open Sync tab
        </ion-button>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonCard, IonCardContent, IonIcon, IonRippleEffect,
  IonGrid, IonRow, IonCol, IonFab, IonFabButton, IonModal, IonButton,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  bugOutline, thunderstormOutline, qrCodeOutline, locationOutline,
  leafOutline, basketOutline, nutritionOutline, chevronForwardOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { listPendingQueueItems, type PendingQueueItem } from '@/services/syncService';
import { presentToast } from '@/utils/toast';

const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();

const syncOpen = ref(false);
const pendingItems = ref<PendingQueueItem[]>([]);

const displayName = computed(() => authStore.userName || 'Technician');
const pending = computed(() => syncStore.pending);
const isOnline = computed(() => syncStore.online);

const pillText = computed(() => {
  if (!isOnline.value) {
    return pending.value ? `Offline · ${pending.value} Queued for Sync` : 'Offline · 0 Pending Sync';
  }
  if (pending.value > 0) return `Online · ${pending.value} Queued`;
  return 'Online · Synced';
});

const pillLabel = computed(() => `Sync status: ${pillText.value}. Opens pending uploads.`);

const pillClass = computed(() => {
  if (!isOnline.value) return 'is-offline';
  if (pending.value > 0) return 'is-queued';
  return 'is-online';
});

const sheetSubtitle = computed(() => {
  if (!isOnline.value) return 'Records stay on this device until you reconnect.';
  if (pending.value) return `${pending.value} item(s) waiting to upload.`;
  return 'All queued field work is synced.';
});

const formatWhen = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const refreshQueue = async () => {
  await syncStore.refreshCount();
  pendingItems.value = await listPendingQueueItems();
};

const openSyncDrawer = async () => {
  await refreshQueue();
  syncOpen.value = true;
};

const runSync = async () => {
  await syncStore.sync();
  await refreshQueue();
  if (syncStore.lastMessage) {
    await presentToast(syncStore.lastMessage, syncStore.pending ? 'warning' : 'success');
  }
};

const go = (path: string) => router.push(path);

const goHistory = () => {
  syncOpen.value = false;
  router.push('/tech/history');
};

onIonViewWillEnter(() => {
  refreshQueue();
});
</script>

<style scoped>
.dash-bg {
  --background: #f4f8f5;
  --padding-top: 0;
  --padding-bottom: 88px;
}

.dash-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: calc(0.35rem + max(env(safe-area-inset-top, 0px), var(--ion-safe-area-top, 0px))) 0.85rem 0.7rem;
  margin: 0 0 0.7rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.dash-shell {
  display: flex;
  flex-direction: column;
  padding: 0 0.75rem 1.25rem;
  box-sizing: border-box;
}

.lgu-logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
  flex-shrink: 0;
}

.welcome { min-width: 0; flex: 1; }

.welcome-portal {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  color: #1b4d3e;
  letter-spacing: 0.01em;
}

.welcome-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.welcome-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.welcome-role {
  font-weight: 700;
  color: #334155;
  font-size: 0.92rem;
}

.sync-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.32rem 0.62rem;
  font-size: 0.68rem;
  font-weight: 800;
  font-family: inherit;
  line-height: 1.2;
  cursor: pointer;
  max-width: 58%;
  white-space: normal;
  text-align: left;
}

.sync-pill.is-online {
  background: #dcfce7;
  color: #14532d;
  border-color: #86efac;
}

.sync-pill.is-queued,
.sync-pill.is-offline {
  background: #ffedd5;
  color: #9a3412;
  border-color: #fdba74;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sync-pill.is-online .status-dot { background: #16a34a; }
.sync-pill.is-queued .status-dot,
.sync-pill.is-offline .status-dot { background: #ea580c; }

.scan-card {
  margin: 0 0 0.85rem;
  border-radius: 16px;
  background: #1b4d3e;
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.28);
  overflow: hidden;
}

.scan-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.85rem;
  color: #fff;
  min-height: 80px;
}

.scan-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.scan-icon ion-icon { font-size: 28px; color: #fff; }

.scan-copy { min-width: 0; flex: 1; }

.scan-copy h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
}

.scan-copy p {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.3;
}

.scan-copy span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
}

.scan-chevron { font-size: 20px; color: rgba(255, 255, 255, 0.8); flex-shrink: 0; }

.section-label {
  margin: 0.35rem 0 0.4rem 0.1rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.row-card {
  margin: 0 0 0.65rem;
  border-radius: 14px;
  background: #fff;
  border: 1.5px solid #cbd5e1;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.row-card.calamity { border-color: #fca5a5; }

.row-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  min-height: 80px;
}

.row-copy { min-width: 0; flex: 1; }

.row-copy h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.row-copy p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155;
}

.row-chevron { font-size: 18px; color: #475569; flex-shrink: 0; }

.tool-grid { padding: 0; margin: 0 0 0.35rem; }

.tool-grid ion-row { margin: 0 -0.28rem; }

.tool-grid ion-col { padding: 0.28rem; }

.tool-card {
  margin: 0;
  height: 100%;
  min-height: 88px;
  border-radius: 14px;
  background: #fff;
  border: 1.5px solid #cbd5e1;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.tool-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  padding: 0.75rem 0.7rem;
  min-height: 88px;
  box-sizing: border-box;
}

.tool-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.45rem;
  border: 2px solid transparent;
}

.tool-icon ion-icon { font-size: 22px; color: #fff; }

.tool-icon.geotag { background: #2563eb; border-color: #1d4ed8; }
.tool-icon.planting { background: #15803d; border-color: #166534; }
.tool-icon.standing { background: #0369a1; border-color: #075985; }
.tool-icon.harvest { background: #c2410c; border-color: #9a3412; }
.tool-icon.pest { background: #b45309; border-color: #92400e; }
.tool-icon.damage { background: #dc2626; border-color: #b91c1c; }

.row-content .tool-icon { margin-bottom: 0; flex-shrink: 0; }

.tool-content h3 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.scan-fab {
  margin-bottom: 8px;
  margin-right: 4px;
}

.scan-fab ion-fab-button {
  --background: #1b4d3e;
  --background-activated: #14532d;
  --color: #fff;
  --box-shadow: 0 8px 20px rgba(27, 77, 62, 0.4);
  width: 58px;
  height: 58px;
}

.sheet-inner { padding: 0.55rem 1rem 1.25rem; }

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.sheet-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #1b4d3e;
}

.sheet-head p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}

.sheet-sync-btn {
  --background: #1b4d3e;
  --color: #fff;
  font-weight: 800;
  text-transform: none;
  flex-shrink: 0;
}

.sheet-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-height: 42vh;
  overflow: auto;
}

.sheet-row {
  display: flex;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.7rem 0.75rem;
  background: #fff7ed;
  border: 1.5px solid #fdba74;
  border-radius: 10px;
}

.sheet-row strong { color: #0f172a; font-size: 0.88rem; }
.sheet-row p { margin: 0.15rem 0 0; font-size: 0.75rem; font-weight: 600; color: #334155; }
.sheet-row span { font-size: 0.72rem; font-weight: 700; color: #9a3412; white-space: nowrap; }

.sheet-empty {
  margin: 0 0 0.85rem;
  padding: 0.9rem;
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.sheet-open-btn {
  margin-top: 0.85rem;
  --border-color: #1b4d3e;
  --color: #1b4d3e;
  font-weight: 800;
  text-transform: none;
}
</style>
