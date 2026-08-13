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
          debounce="200"
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
        {{ filteredReports.length }} report(s) waiting to be checked
      </p>

      <ion-list v-if="filteredReports.length" class="queue-list ion-padding-horizontal">
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSearchbar, IonSelect, IonSelectOption, IonList, IonCard, IonCardContent,
  IonBadge, IonIcon, IonRippleEffect,
} from '@ionic/vue';
import { bugOutline } from 'ionicons/icons';
import {
  MOCK_PEST_QUEUE,
  formatQueueDate,
  type PendingPestReport,
} from '@/data/technicianDispatchQueues';

const router = useRouter();
const searchTerm = ref('');
const barangayFilter = ref('');

const barangayOptions = computed(() =>
  [...new Set(MOCK_PEST_QUEUE.map((r) => r.barangay))].sort(),
);

const filteredReports = computed(() => {
  const q = searchTerm.value.trim().toLowerCase();
  return MOCK_PEST_QUEUE.filter((r) => {
    if (r.status !== 'pending') return false;
    if (barangayFilter.value && r.barangay !== barangayFilter.value) return false;
    if (!q) return true;
    return (
      r.barangay.toLowerCase().includes(q)
      || r.farmerName.toLowerCase().includes(q)
      || r.reportedPest.toLowerCase().includes(q)
      || r.crop.toLowerCase().includes(q)
      || r.reportId.toLowerCase().includes(q)
    );
  });
});

const openValidation = (report: PendingPestReport) => {
  router.push({
    path: '/tech/pest-response',
    query: { id: report.id, from: 'queue' },
  });
};
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

.queue-list {
  padding-bottom: 2rem;
}

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
</style>
