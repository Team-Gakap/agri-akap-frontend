<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Geo-Tag Queue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="toolbar ion-padding-horizontal">
        <ion-searchbar
          v-model="searchTerm"
          placeholder="Search barangay, farmer, crop…"
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
        <ion-button expand="block" fill="outline" class="map-tool-btn" @click="openBlankMap">
          Open map tool
        </ion-button>
      </div>

      <p class="queue-meta ion-padding-horizontal">
        {{ loading ? 'Loading…' : `${filteredPlots.length} parcel(s) waiting for a field walk` }}
      </p>

      <div v-if="showingCache" class="cache-banner ion-padding-horizontal">
        <ion-icon :icon="cloudOfflineOutline"></ion-icon>
        Showing cached data from {{ formatQueueDate(cachedAt) }}
      </div>

      <div v-if="loading" class="empty ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading assigned parcels…</p>
      </div>

      <div v-else-if="error" class="empty ion-padding">
        <p class="error-text">{{ error }}</p>
        <ion-button fill="outline" @click="loadPlots">Retry</ion-button>
      </div>

      <ion-list v-else-if="filteredPlots.length" class="queue-list ion-padding-horizontal">
        <ion-card
          v-for="plot in filteredPlots"
          :key="plot.id"
          button
          class="queue-card"
          :class="{ urgent: plot.priority === 'urgent' }"
          @click="openWalk(plot)"
        >
          <ion-ripple-effect type="bounded"></ion-ripple-effect>
          <ion-card-content>
            <div class="card-top">
              <ion-badge :color="plot.priority === 'urgent' ? 'danger' : 'warning'">
                {{ plot.priority === 'urgent' ? 'Urgent' : 'Routine' }}
              </ion-badge>
              <span class="encoded">{{ plot.deadline ? `Due ${formatQueueDate(plot.deadline)}` : 'No deadline' }}</span>
            </div>
            <h2>{{ plot.farmerName }}</h2>
            <p class="meta">{{ plot.barangay }} · {{ plot.commodity }} · {{ plot.sizeHa.toFixed(2) }} ha</p>
            <p v-if="plot.parcelName" class="parcel">{{ plot.parcelName }}</p>
            <p v-if="plot.notes" class="notes">{{ plot.notes }}</p>
          </ion-card-content>
        </ion-card>
      </ion-list>

      <div v-else class="empty ion-padding">
        <ion-icon :icon="locationOutline"></ion-icon>
        <p>No parcels assigned to you for geo-tagging.</p>
        <ion-button fill="outline" @click="openBlankMap">Open map tool</ion-button>
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
import { locationOutline, cloudOfflineOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { formatFarmerName, formatQueueDate } from '@/data/technicianDispatchQueues';
import { isOnline, isNetworkError, cacheQueueList, getCachedQueueList } from '@/services/syncService';

interface QueuePlot {
  id: string;
  farmerId: string;
  farmerName: string;
  rsbsaNo: string;
  barangay: string;
  commodity: string;
  parcelName: string;
  sizeHa: number;
  priority: string;
  deadline: string;
  notes: string;
  plantingStart: string;
  plantingEnd: string;
}

const router = useRouter();
const searchTerm = ref('');
const barangayFilter = ref('');
const plots = ref<QueuePlot[]>([]);
const loading = ref(false);
const error = ref('');
const showingCache = ref(false);
const cachedAt = ref('');

const mapPlot = (p: any): QueuePlot => {
  const farmer = p.farmer || {};
  return {
    id: p.id,
    farmerId: p.farmer_id || farmer.id || '',
    farmerName: formatFarmerName(farmer),
    rsbsaNo: farmer.rsbsa_no || '',
    barangay: p.location_brgy || farmer.permanent_brgy || '—',
    commodity: p.commodity || '—',
    parcelName: p.parcel_name || '',
    sizeHa: Number(p.size_ha) || 0,
    priority: p.geotag_priority || 'routine',
    deadline: p.geotag_deadline || '',
    notes: p.geotag_notes || '',
    plantingStart: p.planting_start_month || '',
    plantingEnd: p.planting_end_month || '',
  };
};

const loadFromCache = async () => {
  const cached = await getCachedQueueList('geotag');
  if (cached?.rows.length) {
    plots.value = cached.rows.map(mapPlot);
    showingCache.value = true;
    cachedAt.value = cached.cachedAt;
    error.value = '';
    return true;
  }
  return false;
};

const loadPlots = async () => {
  loading.value = true;
  error.value = '';
  showingCache.value = false;

  if (!isOnline()) {
    loading.value = false;
    if (!(await loadFromCache())) {
      plots.value = [];
      error.value = 'Offline and no cached geo-tag queue on this device yet.';
    }
    return;
  }

  try {
    const res = await apiClient.get('/farm-plots', { params: { geotag_queue: 1 } });
    const rows = res.data?.data ?? [];
    const list = Array.isArray(rows) ? rows : [];
    await cacheQueueList('geotag', list);
    plots.value = list.map(mapPlot);
  } catch (e: any) {
    if (isNetworkError(e) && (await loadFromCache())) return;
    plots.value = [];
    error.value = e?.response?.data?.message || 'Could not load the geo-tag queue.';
  } finally {
    loading.value = false;
  }
};

const barangayOptions = computed(() =>
  [...new Set(plots.value.map((p) => p.barangay).filter((b) => b && b !== '—'))].sort(),
);

const filteredPlots = computed(() => {
  const q = searchTerm.value.trim().toLowerCase();
  return plots.value.filter((p) => {
    if (barangayFilter.value && p.barangay !== barangayFilter.value) return false;
    if (!q) return true;
    return (
      p.barangay.toLowerCase().includes(q)
      || p.farmerName.toLowerCase().includes(q)
      || p.commodity.toLowerCase().includes(q)
      || p.parcelName.toLowerCase().includes(q)
      || p.rsbsaNo.toLowerCase().includes(q)
    );
  });
});

const openWalk = (plot: QueuePlot) => {
  router.push({
    path: '/tech/geo-tag',
    query: {
      farmer_id: plot.farmerId,
      plot_id: plot.id,
      farmer_name: plot.farmerName,
      rsbsa_no: plot.rsbsaNo,
      commodity: plot.commodity !== '—' ? plot.commodity : '',
      parcel_name: plot.parcelName,
      barangay: plot.barangay !== '—' ? plot.barangay : '',
      size_ha: String(plot.sizeHa || ''),
      planting_start: plot.plantingStart,
      planting_end: plot.plantingEnd,
      notes: plot.notes,
    },
  });
};

const openBlankMap = () => router.push('/tech/geo-tag');

onIonViewWillEnter(loadPlots);
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
  --color: #0f172a;
  border: 1.5px solid #94a3b8;
  border-radius: 12px;
  padding: 0 0.75rem;
  min-height: 48px;
}

.map-tool-btn { --color: #1a4731; --border-color: #1a4731; font-weight: 700; text-transform: none; }

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
  border-left: 4px solid #0d9488;
  position: relative;
  overflow: hidden;
}
.queue-card.urgent { border-left-color: #dc2626; }

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

.parcel {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f766e;
}

.notes {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #475569;
}

.empty {
  text-align: center;
  padding-top: 3rem;
  color: #64748b;
}

.empty ion-icon {
  font-size: 48px;
  color: #0d9488;
  margin-bottom: 0.5rem;
}

.error-text { color: #b91c1c; font-weight: 600; }
</style>
