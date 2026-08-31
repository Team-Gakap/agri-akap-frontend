<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Calamity Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="toolbar ion-padding-horizontal">
        <ion-searchbar
          v-model="searchTerm"
          placeholder="Search event, barangay, farmer…"
          :debounce="200"
          class="search-bar"
        ></ion-searchbar>
        <ion-select
          class="filter-select"
          interface="popover"
          :value="eventFilter"
          @ionChange="(e: CustomEvent) => eventFilter = e.detail.value"
        >
          <ion-select-option value="">All Calamities</ion-select-option>
          <ion-select-option v-for="e in eventOptions" :key="e" :value="e">{{ e }}</ion-select-option>
        </ion-select>
      </div>

      <p class="queue-meta ion-padding-horizontal">
        {{ loading ? 'Loading…' : `${filteredReports.length} report(s) waiting to be checked` }}
      </p>

      <div v-if="showingCache" class="cache-banner ion-padding-horizontal">
        <ion-icon :icon="cloudOfflineOutline"></ion-icon>
        Showing cached data from {{ formatQueueDate(cachedAt) }}
      </div>

      <div v-if="loading" class="empty ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading barangay calamity reports…</p>
      </div>

      <div v-else-if="error" class="empty ion-padding">
        <p class="error-text">{{ error }}</p>
        <ion-button fill="outline" @click="loadReports">Retry</ion-button>
      </div>

      <ion-list v-else-if="filteredReports.length" class="queue-list ion-padding-horizontal">
        <ion-card
          v-for="report in filteredReports"
          :key="report.id"
          button
          class="queue-card"
          @click="openValidation(report)"
        >
          <ion-ripple-effect type="bounded"></ion-ripple-effect>
          <ion-card-content>
            <div class="card-top">
              <ion-badge color="danger">{{ report.calamityEvent }}</ion-badge>
              <span class="encoded">{{ formatQueueDate(report.encodedAt) }}</span>
            </div>
            <h2>{{ report.farmerName }}</h2>
            <p class="meta">{{ report.barangay }} · {{ report.cropType }}</p>
            <p class="area">
              Reported affected area:
              <strong>{{ report.areaDamagedReported.toFixed(2) }} ha</strong>
              / {{ report.areaPlanted.toFixed(2) }} ha planted
            </p>
            <p class="report-id">{{ report.reportId }}</p>
          </ion-card-content>
        </ion-card>
      </ion-list>

      <div v-else class="empty ion-padding">
        <ion-icon :icon="thunderstormOutline"></ion-icon>
        <p>No calamity reports match your filters.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSearchbar, IonSelect, IonSelectOption, IonList, IonCard, IonCardContent,
  IonBadge, IonIcon, IonRippleEffect, IonSpinner, IonButton, onIonViewWillEnter,
} from '@ionic/vue';
import { thunderstormOutline, cloudOfflineOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';
import {
  formatFarmerName,
  formatQueueDate,
  type PendingCalamityReport,
} from '@/data/technicianDispatchQueues';
import { isOnline, isNetworkError, cacheQueueList, getCachedQueueList } from '@/services/syncService';

const router = useRouter();
const searchTerm = ref('');
const eventFilter = ref('');
const reports = ref<PendingCalamityReport[]>([]);
const loading = ref(false);
const error = ref('');
const showingCache = ref(false);
const cachedAt = ref('');

const mapReport = (r: any): PendingCalamityReport => {
  const farmer = r.farmer || {};
  const plot = r.farm_plot || r.farmPlot || {};
  return {
    id: r.id,
    reportId: `CAL-${String(r.id || '').slice(0, 8).toUpperCase()}`,
    calamityEvent: r.calamity_name || r.calamity_type || 'Calamity',
    barangay: farmer.permanent_brgy || plot.location_brgy || '—',
    farmerName: formatFarmerName(farmer),
    rsbsaNo: farmer.rsbsa_no || '',
    farmerId: r.farmer_id || farmer.id || '',
    farmPlotId: r.farm_plot_id || plot.id || '',
    cropType: plot.commodity || '—',
    variety: r.variety || '',
    cropStage: r.crop_stage || '',
    areaPlanted: Number(r.area_planted_ha ?? plot.size_ha) || 0,
    areaDamagedReported: Number(r.area_destroyed_ha) || 0,
    encodedAt: r.date_of_calamity || r.created_at || '',
    status: r.photo_evidence_path && r.latitude ? 'validated' : 'pending',
  };
};

const loadFromCache = async () => {
  const cached = await getCachedQueueList('calamity');
  if (cached?.rows.length) {
    reports.value = cached.rows.map(mapReport);
    showingCache.value = true;
    cachedAt.value = cached.cachedAt;
    error.value = '';
    return true;
  }
  return false;
};

const loadReports = async () => {
  loading.value = true;
  error.value = '';
  showingCache.value = false;

  if (!isOnline()) {
    loading.value = false;
    if (!(await loadFromCache())) {
      reports.value = [];
      error.value = 'Offline and no cached calamity reports on this device yet.';
    }
    return;
  }

  try {
    const res = await apiClient.get('/damage-assessments', {
      params: { dispatch_queue: 1, per_page: 200 },
    });
    const rows = res.data?.data?.data ?? res.data?.data ?? [];
    const list = Array.isArray(rows) ? rows : [];
    await cacheQueueList('calamity', list);
    reports.value = list.map(mapReport);
  } catch (e: any) {
    if (isNetworkError(e) && (await loadFromCache())) return;
    reports.value = [];
    error.value = e?.response?.data?.message || 'Could not load calamity reports.';
  } finally {
    loading.value = false;
  }
};

const eventOptions = computed(() =>
  [...new Set(reports.value.map((r) => r.calamityEvent).filter(Boolean))].sort(),
);

const filteredReports = computed(() => {
  const q = searchTerm.value.trim().toLowerCase();
  return reports.value.filter((r) => {
    if (r.status !== 'pending') return false;
    if (eventFilter.value && r.calamityEvent !== eventFilter.value) return false;
    if (!q) return true;
    return (
      r.calamityEvent.toLowerCase().includes(q)
      || r.barangay.toLowerCase().includes(q)
      || r.farmerName.toLowerCase().includes(q)
      || r.reportId.toLowerCase().includes(q)
      || r.rsbsaNo.toLowerCase().includes(q)
    );
  });
});

const openValidation = (report: PendingCalamityReport) => {
  router.push({
    path: '/tech/calamity-rdana',
    query: {
      id: report.id,
      from: 'queue',
      farmer: report.farmerId,
      rsbsa: report.rsbsaNo,
      name: report.farmerName,
      barangay: report.barangay,
    },
  });
};

onIonViewWillEnter(loadReports);
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.toolbar {
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-bar {
  --background: #fff;
  --border-radius: 12px;
  padding: 0;
}

.filter-select {
  --background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 0.75rem;
  min-height: 48px;
}

.queue-meta {
  margin: 0.5rem 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.queue-list { padding-bottom: 2rem; }

.cache-banner {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fff7e6;
  border: 1px solid #ffe0a3;
  border-radius: 10px;
  color: #92600a;
  font-size: 0.8rem;
  font-weight: 600;
}

.queue-card {
  margin: 0 0 0.85rem;
  border-radius: 16px;
  border-left: 4px solid #dc2626;
  position: relative;
  overflow: hidden;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.encoded {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
  flex-shrink: 0;
}

.queue-card h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #1a4731;
}

.meta {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  color: #64748b;
}

.area {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: #475569;
}

.area strong { color: #dc2626; }

.report-id {
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  color: #94a3b8;
  font-family: monospace;
}

.empty {
  text-align: center;
  padding-top: 3rem;
  color: #64748b;
}

.empty ion-icon {
  font-size: 48px;
  color: #dc2626;
  margin-bottom: 0.5rem;
}

.error-text { color: #b91c1c; font-weight: 600; }
</style>
