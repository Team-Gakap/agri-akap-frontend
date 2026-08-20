<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Unsent Records</ion-title>
        <ion-buttons slot="end">
          <ion-chip :color="syncStore.online ? 'success' : 'medium'" outline>
            <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
            <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="activeTab" @ionChange="(e: any) => activeTab = e.detail.value">
          <ion-segment-button value="queue">
            <ion-label>Sync Queue</ion-label>
          </ion-segment-button>
          <ion-segment-button value="contributions">
            <ion-label>My Contributions</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding queue-bg">
      <div class="wrapper" v-if="activeTab === 'queue'">
        <ion-card class="summary-card">
          <ion-card-content>
            <div class="summary-row">
              <div>
                <p class="summary-count">{{ syncStore.pending }}</p>
                <p class="summary-label">Records waiting to upload</p>
              </div>
              <ion-button
                :disabled="!syncStore.online || syncStore.isSyncing || syncStore.pending === 0"
                @click="syncNow"
              >
                <ion-icon slot="start" :icon="syncOutline"></ion-icon>
                {{ syncStore.isSyncing ? 'Syncing...' : 'Sync Now' }}
              </ion-button>
            </div>
            <p v-if="syncStore.lastMessage" class="last-msg">{{ syncStore.lastMessage }}</p>
            <p v-if="!syncStore.online" class="offline-note">
              You are offline. Records are safely stored on this device and will upload automatically when a connection is restored.
            </p>
          </ion-card-content>
        </ion-card>

        <h3 class="section-title" v-if="distributions.length">Subsidy Claims ({{ distributions.length }})</h3>
        <ion-card v-for="d in distributions" :key="d.client_id" class="item-card">
          <ion-card-content>
            <div class="item-head">
              <strong>{{ d.farmer_name || 'Farmer' }}</strong>
              <StatusBadge :status="d.status" />
            </div>
            <p class="item-sub">{{ d.program_name || d.program_id }}</p>
            <p class="item-meta">Queued {{ formatDate(d.created_at) }}</p>
            <p v-if="d.error" class="item-error">{{ d.error }}</p>
            <ion-button size="small" fill="clear" color="danger" @click="removeDistribution(d.client_id)">
              <ion-icon slot="start" :icon="trashOutline"></ion-icon> Discard
            </ion-button>
          </ion-card-content>
        </ion-card>

        <h3 class="section-title" v-if="assessments.length">Damage Assessments ({{ assessments.length }})</h3>
        <ion-card v-for="a in assessments" :key="a.client_id" class="item-card">
          <ion-card-content>
            <div class="item-head">
              <strong>{{ a.calamity_name }}</strong>
              <StatusBadge :status="a.status" />
            </div>
            <p class="item-sub">{{ a.farmer_name || 'Plot ' + a.farm_plot_id.substring(0, 6) }} &middot; {{ a.damage_percentage }}% damage</p>
            <p class="item-meta">Queued {{ formatDate(a.created_at) }}</p>
            <p v-if="a.error" class="item-error">{{ a.error }}</p>
            <ion-button size="small" fill="clear" color="danger" @click="removeAssessment(a.client_id)">
              <ion-icon slot="start" :icon="trashOutline"></ion-icon> Discard
            </ion-button>
          </ion-card-content>
        </ion-card>

        <h3 class="section-title" v-if="plantingLogs.length">Planting Logs ({{ plantingLogs.length }})</h3>
        <ion-card v-for="p in plantingLogs" :key="p.client_id" class="item-card">
          <ion-card-content>
            <div class="item-head">
              <strong>{{ p.farmer_name || p.crop_type }}</strong>
              <StatusBadge :status="p.sync_status" />
            </div>
            <p class="item-sub">{{ p.variety }} · {{ p.area_planted }} ha · {{ p.date_planted }}</p>
            <p class="item-meta">Queued {{ formatDate(p.created_at) }}</p>
            <ion-button size="small" fill="clear" color="danger" @click="removePlanting(p.id!)">
              <ion-icon slot="start" :icon="trashOutline"></ion-icon> Discard
            </ion-button>
          </ion-card-content>
        </ion-card>

        <h3 class="section-title" v-if="pestReports.length">Pest Reports ({{ pestReports.length }})</h3>
        <ion-card v-for="p in pestReports" :key="p.client_id" class="item-card">
          <ion-card-content>
            <div class="item-head">
              <strong>{{ p.pest_name || p.crop }}</strong>
              <StatusBadge :status="p.sync_status" />
            </div>
            <p class="item-sub">{{ p.severity }} · {{ p.incidence }}% · {{ p.is_outbreak ? 'Outbreak' : 'Routine' }}</p>
            <p class="item-meta">Queued {{ formatDate(p.created_at) }}</p>
            <ion-button size="small" fill="clear" color="danger" @click="removePest(p.id!)">
              <ion-icon slot="start" :icon="trashOutline"></ion-icon> Discard
            </ion-button>
          </ion-card-content>
        </ion-card>

        <EmptyState
          v-if="syncStore.pending === 0"
          variant="sync"
          title="All clear"
          message="All records are synced. Nothing pending."
        />
      </div>

      <div class="wrapper" v-else>
        <ion-card class="summary-card">
          <ion-card-content>
            <p class="contrib-title">Reporting Period</p>
            <div class="period-row">
              <ion-input type="date" label="From" label-placement="stacked" :value="contribFrom" @ionInput="(e: any) => contribFrom = e.detail.value"></ion-input>
              <ion-input type="date" label="To" label-placement="stacked" :value="contribTo" @ionInput="(e: any) => contribTo = e.detail.value"></ion-input>
              <ion-button @click="loadContributions" :disabled="contribLoading">
                {{ contribLoading ? 'Loading…' : 'Refresh' }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <div v-if="contribLoading" class="loading-center">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>

        <template v-else-if="contribData">
          <div class="kpi-row">
            <div class="kpi-chip">
              <span class="kpi-n">{{ contribData.summary.distributions }}</span>
              <span class="kpi-l">Distributions</span>
            </div>
            <div class="kpi-chip">
              <span class="kpi-n">{{ contribData.summary.damage_assessments }}</span>
              <span class="kpi-l">Assessments</span>
            </div>
            <div class="kpi-chip">
              <span class="kpi-n">{{ contribData.summary.pest_outbreaks }}</span>
              <span class="kpi-l">Pest Logs</span>
            </div>
          </div>

          <h3 class="section-title">Recent Activity</h3>
          <ion-card v-for="row in contribData.recent" :key="row.type + '-' + row.id" class="item-card">
            <ion-card-content>
              <div class="item-head">
                <strong>{{ row.label }}</strong>
                <ion-badge color="medium">{{ typeLabel(row.type) }}</ion-badge>
              </div>
              <p class="item-sub">{{ row.detail }} <span v-if="row.barangay">· {{ row.barangay }}</span></p>
              <p class="item-meta">{{ row.date }} · {{ row.quantity }} · {{ row.status }}</p>
            </ion-card-content>
          </ion-card>

          <EmptyState
            v-if="!contribData.recent?.length"
            variant="documents"
            message="No contributions recorded for this period."
          />
        </template>

        <div v-if="contribError" class="offline-note">{{ contribError }}</div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonButton, IonIcon, IonBadge, IonChip, IonLabel,
  IonSegment, IonSegmentButton, IonInput, IonSpinner,
} from '@ionic/vue';
import {
  syncOutline, trashOutline, cloudDoneOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import {
  db,
  type PendingDistribution,
  type PendingAssessment,
  type OfflinePlantingLog,
  type OfflinePestReport,
} from '@/services/db';
import { useSyncStore } from '@/stores/syncStore';
import axiosInstance from '@/utils/axios';
import StatusBadge from '@/components/StatusBadge.vue';
import EmptyState from '@/components/EmptyState.vue';

const syncStore = useSyncStore();
const distributions = ref<PendingDistribution[]>([]);
const assessments = ref<PendingAssessment[]>([]);
const plantingLogs = ref<OfflinePlantingLog[]>([]);
const pestReports = ref<OfflinePestReport[]>([]);
const activeTab = ref('queue');
let timer: number | undefined;

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

const contribFrom = ref(monthStart());
const contribTo = ref(today());
const contribLoading = ref(false);
const contribError = ref('');
const contribData = ref<any>(null);

const load = async () => {
  distributions.value = await db.pendingDistributions.orderBy('created_at').reverse().toArray();
  assessments.value = await db.pendingAssessments.orderBy('created_at').reverse().toArray();
  plantingLogs.value = await db.offline_planting_logs.orderBy('created_at').reverse().toArray();
  pestReports.value = await db.offline_pest_reports.orderBy('created_at').reverse().toArray();
  await syncStore.refreshCount();
};

const syncNow = async () => {
  await syncStore.sync();
  await load();
};

const removeDistribution = async (id: string) => {
  await db.pendingDistributions.delete(id);
  await load();
};

const removeAssessment = async (id: string) => {
  await db.pendingAssessments.delete(id);
  await load();
};

const removePlanting = async (id: number) => {
  await db.offline_planting_logs.delete(id);
  await load();
};

const removePest = async (id: number) => {
  await db.offline_pest_reports.delete(id);
  await load();
};

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const typeLabel = (t: string) => {
  if (t === 'distribution') return 'Distribution';
  if (t === 'damage_assessment') return 'Assessment';
  if (t === 'pest_outbreak') return 'Pest';
  return t;
};

const loadContributions = async () => {
  contribLoading.value = true;
  contribError.value = '';
  try {
    const res = await axiosInstance.get('/technician/activity-log', {
      params: { date_from: contribFrom.value, date_to: contribTo.value },
    });
    contribData.value = res.data.data;
  } catch {
    contribError.value = 'Could not load contribution history. Check your connection.';
  } finally {
    contribLoading.value = false;
  }
};

watch(activeTab, (tab) => {
  if (tab === 'contributions' && !contribData.value) {
    loadContributions();
  }
});

onMounted(async () => {
  await load();
  timer = window.setInterval(load, 4000);
});
onUnmounted(() => timer && clearInterval(timer));
</script>

<style scoped>
.queue-bg { --background: var(--mao-surface, #f4f8f5); }
.wrapper { max-width: 720px; margin: 0 auto; }
.summary-card { border-radius: 14px; border-top: 4px solid var(--ion-color-primary); }
.summary-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.summary-count { font-size: 2.4rem; font-weight: 900; color: var(--ion-color-primary); margin: 0; }
.summary-label { color: #64748b; margin: 0; font-size: 0.9rem; }
.last-msg { margin-top: 0.75rem; color: var(--ion-color-primary); font-weight: 600; }
.offline-note { margin-top: 0.75rem; color: #92400e; background: #fff8e1; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; }
.section-title { color: var(--ion-color-primary); font-weight: 800; margin: 1.4rem 0 0.6rem; }
.item-card { border-radius: 12px; margin: 0 0 0.7rem; }
.item-head { display: flex; justify-content: space-between; align-items: center; }
.item-sub { margin: 4px 0 0; color: #334155; font-weight: 600; }
.item-meta { margin: 2px 0 0; color: #94a3b8; font-size: 0.8rem; }
.item-error { color: var(--ion-color-danger); font-size: 0.85rem; margin: 6px 0 0; }
.contrib-title { font-weight: 800; color: #1a4731; margin: 0 0 0.5rem; }
.period-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
.period-row ion-input { flex: 1; min-width: 120px; --background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 8px; }
.kpi-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.kpi-chip { flex: 1; min-width: 100px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center; }
.kpi-n { display: block; font-size: 1.6rem; font-weight: 900; color: #1a4731; }
.kpi-l { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; margin-top: 4px; }
.loading-center { text-align: center; padding: 2rem; }
</style>
