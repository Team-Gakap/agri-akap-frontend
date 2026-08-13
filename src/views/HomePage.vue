<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>AGRI-AKAP</ion-title>
        <ion-buttons slot="end">
          <ion-chip :color="syncStore.online ? 'light' : 'warning'" style="--background:rgba(255,255,255,0.15);">
            <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
            <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
          </ion-chip>
          <ion-button @click="router.push('/tech/profile')">
            <ion-icon slot="icon-only" :icon="personCircleOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="home-bg">
      <!-- Greeting Banner -->
      <div class="greeting-banner" @click="router.push('/tech/profile')">
        <div>
          <p class="greeting-sub">Municipal Agriculture Office · Echague, Isabela</p>
          <h2 class="greeting-title">Good {{ timeOfDay }}, {{ firstName }}</h2>
          <p class="greeting-role">{{ roleBadge }}</p>
        </div>
        <div class="greeting-icon">🌾</div>
      </div>

      <!-- Pending Sync Banner (if any) -->
      <div v-if="syncStore.pending > 0" class="sync-banner" @click="router.push('/tech/sync')">
        <ion-icon :icon="cloudOfflineOutline"></ion-icon>
        <span>{{ syncStore.pending }} pending item{{ syncStore.pending !== 1 ? 's' : '' }} waiting to sync</span>
        <ion-icon :icon="chevronForwardOutline"></ion-icon>
      </div>

      <!-- Quick Action Tiles -->
      <div class="ion-padding">
        <h3 class="section-head">Quick Actions</h3>
        <ion-grid class="ion-no-padding">
          <ion-row>
            <ion-col size="6" v-for="tile in quickActions" :key="tile.route">
              <div class="action-tile" :style="{ borderTopColor: tile.color }" @click="router.push(tile.route)">
                <div class="tile-icon" :style="{ background: tile.bg }">
                  <ion-icon :icon="tile.icon" :style="{ color: tile.color }"></ion-icon>
                </div>
                <p class="tile-label">{{ tile.label }}</p>
                <p class="tile-desc">{{ tile.desc }}</p>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- Today's Stats -->
        <h3 class="section-head mt-4">Today's Activity</h3>
        <div v-if="isLoading" class="loading-row"><ion-spinner name="dots" color="primary"></ion-spinner></div>
        <ion-grid v-else class="ion-no-padding">
          <ion-row>
            <ion-col size="4">
              <div class="stat-card">
                <span class="stat-num">{{ todayStats.distributions }}</span>
                <span class="stat-lbl">Claims</span>
              </div>
            </ion-col>
            <ion-col size="4">
              <div class="stat-card">
                <span class="stat-num">{{ todayStats.assessments }}</span>
                <span class="stat-lbl">Assessments</span>
              </div>
            </ion-col>
            <ion-col size="4">
              <div class="stat-card">
                <span class="stat-num">{{ todayStats.farmers }}</span>
                <span class="stat-lbl">Farmers</span>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonMenuButton,
  IonChip, IonLabel, IonIcon, IonGrid, IonRow, IonCol, IonSpinner, IonButton,
} from '@ionic/vue';
import {
  qrCodeOutline, documentTextOutline, bugOutline, warningOutline,
  leafOutline, cloudDoneOutline, cloudOfflineOutline, chevronForwardOutline,
  peopleOutline, personCircleOutline, mapOutline, locateOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import axiosInstance from '@/utils/axios';

const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const isLoading = ref(true);

const todayStats = ref({ distributions: 0, assessments: 0, farmers: 0 });

const firstName = computed(() => {
  const name = (authStore as any).userName ?? (authStore as any).user?.name ?? 'Field Staff';
  return name.split(' ')[0];
});

const roleBadge = computed(() => {
  const role = authStore.userRole;
  if (role === 'admin') return 'MAO Administrator';
  if (role === 'barangay_official') return 'Barangay Official';
  return 'Field Technician';
});

const timeOfDay = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
});

const quickActions = computed(() => {
  const role = authStore.userRole;
  if (role === 'barangay_official') {
    return [
      { route: '/brgy/damage-review', label: 'Damage Review', desc: 'Check damage reports', icon: documentTextOutline, color: '#7b1fa2', bg: '#f3e5f5' },
      { route: '/brgy/map', label: 'Farm Map', desc: 'See farms and damage', icon: peopleOutline, color: '#1565c0', bg: '#e3f2fd' },
    ];
  }
  // Technician hub (default landing for the /tech/home "More" tab)
  return [
    { route: '/tech/scanner', label: 'Give Subsidy', desc: 'Scan farmer ID', icon: qrCodeOutline, color: '#1a4731', bg: '#e8f5e9' },
    { route: '/tech/farm-profiling', label: 'Measure Farm', desc: 'Soil and land size', icon: mapOutline, color: '#00695c', bg: '#e0f2f1' },
    { route: '/tech/geo-tag', label: 'Pin Farm Location', desc: 'Save GPS of the farm', icon: locateOutline, color: '#00695c', bg: '#e0f2f1' },
    { route: '/tech/extension', label: 'Farmer Training', desc: 'Seminars and livestock', icon: peopleOutline, color: '#6a1b9a', bg: '#f3e5f5' },
    { route: '/tech/damage', label: 'Report Damage', desc: 'File a disaster report', icon: warningOutline, color: '#c0392b', bg: '#ffebee' },
    { route: '/tech/field', label: 'Field Reports', desc: 'Record crop or pest', icon: bugOutline, color: '#e65100', bg: '#fff3e0' },
    { route: '/tech/sync', label: 'Unsent Records', desc: 'Waiting to upload', icon: cloudOfflineOutline, color: '#f57f17', bg: '#fff8e1' },
    { route: '/tech/farmers', label: 'Farmers', desc: 'Find farmer records', icon: peopleOutline, color: '#1565c0', bg: '#e3f2fd' },
    { route: '/tech/programs', label: 'Subsidy Campaigns', desc: 'Active aid programs', icon: leafOutline, color: '#2e7d32', bg: '#e8f5e9' },
    { route: '/tech/map', label: 'Farm Map', desc: 'See farms and damage', icon: documentTextOutline, color: '#00695c', bg: '#e0f2f1' },
  ];
});

const fetchTodayStats = async () => {
  isLoading.value = true;
  try {
    const res = await axiosInstance.get('/dashboard/stats');
    const data = res.data.data;
    todayStats.value = {
      distributions: data.audit_trail?.length ?? 0,
      assessments: data.metrics?.damage_summary?.total ?? 0,
      farmers: data.metrics?.total_farmers ?? 0,
    };
  } catch {
    // silent fail — stats are supplementary
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => fetchTodayStats());
</script>

<style scoped>
.home-bg { --background: #f4f8f5; }

.greeting-banner {
  background: linear-gradient(135deg, #1a4731, #2a6648);
  color: white;
  padding: 1.5rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.greeting-sub { font-size: 0.75rem; opacity: 0.8; margin: 0 0 4px; letter-spacing: 0.5px; text-transform: uppercase; }
.greeting-title { font-size: 1.5rem; font-weight: 900; margin: 0 0 4px; }
.greeting-role { font-size: 0.85rem; opacity: 0.8; margin: 0; background: rgba(255,255,255,0.15); display: inline-block; padding: 2px 10px; border-radius: 20px; }
.greeting-icon { font-size: 3rem; }

.sync-banner {
  background: #fff3cd;
  color: #856404;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
.sync-banner ion-icon:last-child { margin-left: auto; }

.section-head {
  font-size: 0.85rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 0.75rem;
}
.mt-4 { margin-top: 1.5rem; }

.action-tile {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  border-top: 4px solid;
  padding: 1rem 0.75rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.action-tile:active { transform: scale(0.96); box-shadow: none; }
.tile-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  margin-bottom: 8px;
}
.tile-label { font-weight: 800; color: #0f172a; font-size: 0.88rem; margin: 0 0 3px; }
.tile-desc { font-size: 0.75rem; color: #94a3b8; margin: 0; }

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 1rem 0.5rem;
  text-align: center;
  border: 1px solid #e2e8f0;
  margin: 0 4px 0.75rem;
}
.stat-num { display: block; font-size: 2rem; font-weight: 900; color: #1a4731; }
.stat-lbl { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

.loading-row { display: flex; justify-content: center; padding: 1rem; }
</style>
