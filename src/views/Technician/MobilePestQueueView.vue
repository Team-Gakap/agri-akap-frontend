<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Pest Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="toolbar ion-padding-horizontal">
        <ion-searchbar
          v-model="searchTerm"
          placeholder="Search barangay, farmer, pest…"
          :debounce="200"
          class="search-bar"
        ></ion-searchbar>
        <ion-select
          class="filter-select"
          interface="popover"
          :value="barangayFilter"
          @ionChange="(e: CustomEvent) => barangayFilter = e.detail.value"
        >
          <ion-select-option value="">All Barangays</ion-select-option>
          <ion-select-option v-for="b in barangayOptions" :key="b" :value="b">{{ b }}</ion-select-option>
        </ion-select>
      </div>

      <p class="queue-meta ion-padding-horizontal">
        {{ loading ? 'Loading…' : `${filteredReports.length} report(s) waiting to be checked` }}
      </p>

      <div v-if="loading" class="empty ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading barangay pest reports…</p>
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
              <ion-badge color="warning">Pending</ion-badge>
              <span class="encoded">{{ formatQueueDate(report.encodedAt) }}</span>
            </div>
            <h2>{{ report.farmerName }}</h2>
            <p class="meta">{{ report.barangay }} · {{ report.crop }}</p>
            <p class="pest">{{ report.reportedPest }}</p>
            <p class="report-id">{{ report.reportId }}</p>
          </ion-card-content>
        </ion-card>
      </ion-list>

      <div v-else class="empty ion-padding">
        <ion-icon :icon="bugOutline"></ion-icon>
        <p>No pest reports match your filters.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSearchbar, IonSelect, IonSelectOption, IonList, IonCard, IonCardContent,
  IonBadge, IonIcon, IonRippleEffect, IonSpinner, IonButton,
} from '@ionic/vue';
import { bugOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';
import {
  formatFarmerName,
  formatQueueDate,
  type PendingPestReport,
} from '@/data/technicianDispatchQueues';

const router = useRouter();
const searchTerm = ref('');
const barangayFilter = ref('');
const reports = ref<PendingPestReport[]>([]);
const loading = ref(false);
const error = ref('');

const mapReport = (r: any): PendingPestReport => {
  const farmer = r.farmer || {};
  return {
    id: r.id,
    reportId: r.report_ref || `PEST-${String(r.id || '').slice(0, 8).toUpperCase()}`,
    barangay: farmer.permanent_brgy || r.farm_location || r.farm_plot?.location_brgy || '—',
    farmerName: formatFarmerName(farmer),
    farmerId: r.farmer_id || farmer.id,
    rsbsaNo: farmer.rsbsa_no || '',
    crop: r.crop || r.farm_plot?.commodity || '—',
    reportedPest: r.pest_name || r.damage_by || 'Unspecified pest',
    encodedAt: r.date_of_inspection || r.created_at || '',
    status: r.latitude && r.photo_path ? 'validated' : 'pending',
  };
};

const loadReports = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/pest-monitoring', {
      params: { pending_field: 1, per_page: 200 },
    });
    const rows = res.data?.data?.data ?? res.data?.data ?? [];
    reports.value = (Array.isArray(rows) ? rows : []).map(mapReport);
  } catch (e: any) {
    reports.value = [];
    error.value = e?.response?.data?.message || 'Could not load pest reports.';
  } finally {
    loading.value = false;
  }
};

const barangayOptions = computed(() =>
  [...new Set(reports.value.map((r) => r.barangay).filter((b) => b && b !== '—'))].sort(),
);

const filteredReports = computed(() => {
  const q = searchTerm.value.trim().toLowerCase();
  return reports.value.filter((r) => {
    if (r.status !== 'pending') return false;
    if (barangayFilter.value && r.barangay !== barangayFilter.value) return false;
    if (!q) return true;
    return (
      r.barangay.toLowerCase().includes(q)
      || r.farmerName.toLowerCase().includes(q)
      || r.reportedPest.toLowerCase().includes(q)
      || r.crop.toLowerCase().includes(q)
      || r.reportId.toLowerCase().includes(q)
      || r.rsbsaNo.toLowerCase().includes(q)
    );
  });
});

const openValidation = (report: PendingPestReport) => {
  router.push({
    path: '/tech/pest-response',
    query: {
      id: report.id,
      from: 'queue',
      farmerId: report.farmerId || '',
      rsbsa: report.rsbsaNo,
      farmer: report.farmerName,
      barangay: report.barangay,
      crop: report.crop,
      pest: report.reportedPest,
      reportId: report.reportId,
    },
  });
};

onMounted(loadReports);
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

.queue-card {
  margin: 0 0 0.85rem;
  border-radius: 16px;
  border-left: 4px solid #ca8a04;
  position: relative;
  overflow: hidden;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.encoded {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
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

.pest {
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #b45309;
}

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
  color: #ca8a04;
  margin-bottom: 0.5rem;
}

.error-text { color: #b91c1c; font-weight: 600; }
</style>
