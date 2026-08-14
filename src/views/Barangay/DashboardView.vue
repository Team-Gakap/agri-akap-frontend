<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="fetchStats">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding dash-bg">
      <div class="wrapper">
        <h2>{{ barangayName }}</h2>
        <p class="subtitle">
          A quick summary of your area. Use the menu to record planting, pests, harvest, and damage.
        </p>

        <div v-if="!assignedBarangay" class="warn-banner">
          No assigned barangay on this account. Ask MAO admin to set <code>assigned_barangay</code> before encoding.
        </div>

        <div v-else-if="loading && !loaded" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading barangay summary&hellip;</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button @click="fetchStats">Retry</ion-button>
        </div>

        <div v-else class="kpi-row">
          <div class="kpi-card" @click="go('/brgy/farmers')">
            <span class="kpi-n">{{ fmt(stats.farmers) }}</span>
            <span class="kpi-l">Farmers (local)</span>
          </div>
          <div class="kpi-card" @click="go('/brgy/planting-ledger')">
            <span class="kpi-n">{{ fmt(stats.planting_entries) }}</span>
            <span class="kpi-l">Planting entries</span>
          </div>
          <div class="kpi-card" @click="go('/brgy/pest-monitoring')">
            <span class="kpi-n">{{ fmt(stats.pest_reports) }}</span>
            <span class="kpi-l">Pest reports</span>
          </div>
          <div class="kpi-card gold" @click="go('/brgy/damage-review')">
            <span class="kpi-n">{{ fmt(stats.pending_damage) }}</span>
            <span class="kpi-l">Pending damage</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, onIonViewWillEnter,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const assignedBarangay = computed(() => authStore.user?.assigned_barangay || null);
const barangayName = computed(() => assignedBarangay.value || 'Your Barangay');

const loading = ref(false);
const loaded = ref(false);
const error = ref('');
const stats = reactive({
  farmers: 0,
  planting_entries: 0,
  pest_reports: 0,
  pending_damage: 0,
});

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');
const go = (path: string) => router.push(path);

const fetchStats = async () => {
  if (!assignedBarangay.value) {
    loaded.value = true;
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/dashboard/barangay');
    const payload = res.data?.data ?? {};
    stats.farmers = Number(payload.farmers ?? 0);
    stats.planting_entries = Number(payload.planting_entries ?? 0);
    stats.pest_reports = Number(payload.pest_reports ?? 0);
    stats.pending_damage = Number(payload.pending_damage ?? 0);
    loaded.value = true;
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load barangay dashboard.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => { void fetchStats(); });
onIonViewWillEnter(() => {
  if (loaded.value) void fetchStats();
});
</script>

<style scoped>
.dash-bg { --background: #f4f8f5; }
.wrapper { max-width: 960px; margin: 0 auto; }
h2 { margin: 0 0 4px; font-weight: 800; color: #1a4731; }
.subtitle { margin: 0 0 1.25rem; color: #64748b; font-size: 0.9rem; }
.warn-banner {
  background: #fff8e1;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
}
.warn-banner code { font-size: 0.82rem; }
.center-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }
.kpi-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.kpi-card {
  flex: 1;
  min-width: 140px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.1rem;
  text-align: center;
  border-top: 4px solid #1a4731;
  cursor: pointer;
}
.kpi-card.gold { border-top-color: #d4af37; }
.kpi-n { display: block; font-size: 1.6rem; font-weight: 900; color: #1a4731; }
.kpi-l { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; margin-top: 4px; font-weight: 600; }
</style>
