<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>MAO Mission Control</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="fetchStats" :disabled="isLoading">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="goToReport">
            <ion-icon slot="icon-only" :icon="documentTextOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="auth-bg ion-padding">
      <div class="dashboard-wrapper">

        <div class="header-section">
          <h2>Accomplishment Overview</h2>
          <p class="text-muted">Real-time distribution analytics and audit trail.</p>
        </div>

        <WeatherWidget />

        <div v-if="isLoading" class="loading-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Compiling reports...</p>
        </div>

        <template v-else-if="stats">
          <!-- KPI Row 1: Core Metrics -->
          <ion-grid class="ion-no-padding mb-4">
            <ion-row>
              <ion-col size="6" size-lg="3">
                <ion-card class="kpi-card" @click="router.push('/admin/programs')">
                  <ion-card-content>
                    <div class="kpi-icon bg-green-light"><ion-icon :icon="layersOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>{{ stats.metrics.active_programs }}</h3>
                      <p>Active Programs</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-lg="3">
                <ion-card class="kpi-card" @click="router.push('/admin/farmers')">
                  <ion-card-content>
                    <div class="kpi-icon bg-blue-light"><ion-icon :icon="peopleOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>{{ stats.metrics.total_farmers.toLocaleString() }}</h3>
                      <p>Registered Farmers</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-lg="3">
                <ion-card class="kpi-card" @click="router.push('/admin/damage-review')">
                  <ion-card-content>
                    <div class="kpi-icon bg-red-light"><ion-icon :icon="warningOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>{{ stats.metrics.damage_summary?.pending ?? 0 }}</h3>
                      <p>Pending Damage Reports</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-lg="3">
                <ion-card class="kpi-card" @click="router.push('/admin/intelligence')">
                  <ion-card-content>
                    <div class="kpi-icon bg-orange-light"><ion-icon :icon="bugOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>{{ stats.metrics.active_pests ?? 0 }}</h3>
                      <p>Active Pest Alerts</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="6" size-lg="3">
                <ion-card class="kpi-card" @click="router.push('/admin/reports')">
                  <ion-card-content>
                    <div class="kpi-icon bg-purple-light"><ion-icon :icon="documentTextOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>{{ stats.metrics.pending_reports ?? 0 }}</h3>
                      <p>Pending Reports</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <!-- Dispensed breakdown (dynamic) -->
              <ion-col
                size="12" size-md="6" size-lg="3"
                v-for="(item, i) in stats.metrics.dispensed_breakdown"
                :key="i"
              >
                <ion-card class="kpi-card highlight-card">
                  <ion-card-content>
                    <div class="kpi-icon bg-gold-light"><ion-icon :icon="leafOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>{{ Number(item.total_dispensed).toLocaleString() }}</h3>
                      <p>Dispensed ({{ item.unit }})</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>

              <ion-col size="12" size-md="6" size-lg="3"
                v-if="!stats.metrics.dispensed_breakdown?.length">
                <ion-card class="kpi-card highlight-card">
                  <ion-card-content>
                    <div class="kpi-icon bg-gold-light"><ion-icon :icon="leafOutline"></ion-icon></div>
                    <div class="kpi-data">
                      <h3>0</h3>
                      <p>Dispensed (None yet)</p>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>

          <!-- Damage Status Mini-Cards -->
          <div class="status-row mb-4" v-if="stats.metrics.damage_summary">
            <div class="status-chip pending">
              <span class="status-num">{{ stats.metrics.damage_summary.pending }}</span>
              <span class="status-lbl">Pending</span>
            </div>
            <div class="status-chip verified">
              <span class="status-num">{{ stats.metrics.damage_summary.verified }}</span>
              <span class="status-lbl">Verified</span>
            </div>
            <div class="status-chip approved">
              <span class="status-num">{{ stats.metrics.damage_summary.approved }}</span>
              <span class="status-lbl">Approved</span>
            </div>
          </div>

          <!-- Audit Trail Table -->
          <div class="table-card">
            <div class="table-header">
              <h3>Recent Distribution Transactions</h3>
              <ion-button fill="clear" size="small" @click="fetchStats">
                <ion-icon :icon="refreshOutline" slot="start"></ion-icon> Refresh
              </ion-button>
            </div>

            <div v-if="stats.audit_trail?.length" class="table-responsive">
              <table class="mao-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Farmer</th>
                    <th>Barangay</th>
                    <th>Program</th>
                    <th>Dispensed</th>
                    <th>Technician</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in stats.audit_trail" :key="log.id">
                    <td class="font-medium nowrap">{{ log.date }}</td>
                    <td class="font-bold">{{ log.farmer_name }}</td>
                    <td class="text-muted">{{ log.barangay }}</td>
                    <td>{{ log.program_name }}</td>
                    <td><span class="dispense-badge">{{ log.dispensed }}</span></td>
                    <td class="text-muted">{{ log.technician }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <EmptyState
              v-else
              variant="documents"
              message="No distributions recorded yet."
            />
          </div>
        </template>

        <div v-if="errorMsg" class="error-banner mt-4">
          <ion-icon :icon="alertCircleOutline"></ion-icon>
          {{ errorMsg }}
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonButton,
  IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonIcon, IonSpinner,
} from '@ionic/vue';
import {
  layersOutline, peopleOutline, leafOutline, refreshOutline, warningOutline,
  bugOutline, documentTextOutline, alertCircleOutline,
} from 'ionicons/icons';
import axiosInstance from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';
import WeatherWidget from '@/components/WeatherWidget.vue';

const router = useRouter();
const stats = ref<any>(null);
const isLoading = ref(true);
const errorMsg = ref('');

const fetchStats = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await axiosInstance.get('/dashboard/stats');
    stats.value = res.data.data;
  } catch {
    errorMsg.value = 'Failed to communicate with the server. Check your connection.';
  } finally {
    isLoading.value = false;
  }
};

const goToReport = () => router.push('/admin/reports');

onMounted(fetchStats);
</script>

<style scoped>
.auth-bg { --background: #f4f8f5; }
.dashboard-wrapper { max-width: 1200px; margin: 0 auto; padding-top: 1rem; padding-bottom: 3rem; }
.header-section { margin-bottom: 1.5rem; }
.header-section h2 { font-weight: 800; color: #1a4731; margin: 0 0 4px; }
.text-muted { color: #6c757d; font-size: 0.9rem; }
.loading-state { text-align: center; margin-top: 4rem; color: #1a4731; font-weight: 600; }
.mb-4 { margin-bottom: 1.5rem; }

/* KPI Cards */
.kpi-card { margin: 0 0 0.75rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-radius: 12px; border: 1px solid #e2e8f0; cursor: pointer; transition: transform 0.15s; }
.kpi-card:active { transform: scale(0.97); }
.kpi-card ion-card-content { display: flex; align-items: center; gap: 12px; padding: 1rem; }
.kpi-icon { width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0; }
.bg-green-light { background: #e8f5e9; color: #2e7d32; }
.bg-blue-light { background: #e3f2fd; color: #1565c0; }
.bg-gold-light { background: #fff8e1; color: #e65100; }
.bg-red-light { background: #ffebee; color: #c0392b; }
.bg-orange-light { background: #fff3e0; color: #e65100; }
.bg-purple-light { background: #f3e8ff; color: #7c3aed; }
.highlight-card { border-bottom: 4px solid #c8a227; }
.kpi-data h3 { margin: 0; font-size: 1.7rem; font-weight: 900; color: #1e293b; }
.kpi-data p { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

/* Damage status chips */
.status-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.status-chip { flex: 1; min-width: 100px; border-radius: 10px; padding: 0.75rem 1rem; display: flex; flex-direction: column; align-items: center; background: white; border: 1px solid #e2e8f0; }
.status-chip.pending { border-left: 4px solid #f59e0b; }
.status-chip.verified { border-left: 4px solid #3b82f6; }
.status-chip.approved { border-left: 4px solid #2e7d32; }
.status-num { font-size: 1.5rem; font-weight: 900; color: #0f172a; }
.status-lbl { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

/* Table */
.table-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; overflow: hidden; }
.table-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; background: #fafafa; }
.table-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }
.table-responsive { overflow-x: auto; }
.mao-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
.mao-table th { padding: 0.85rem 1.2rem; background: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
.mao-table td { padding: 0.85rem 1.2rem; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
.mao-table tr:hover td { background: #f3f4f6; }
.mao-table tr:last-child td { border-bottom: none; }
.font-bold { font-weight: 700; color: #0f172a; }
.font-medium { font-weight: 500; }
.nowrap { white-space: nowrap; }
.dispense-badge { display: inline-block; padding: 3px 10px; background: #e8f5e9; color: #2e7d32; border-radius: 20px; font-weight: 700; font-size: 0.82rem; }
.error-banner { background: #ffebee; color: #c0392b; padding: 12px 16px; border-radius: 8px; font-weight: 600; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; }
.mt-4 { margin-top: 1.5rem; }
.text-center { text-align: center; }
.py-4 { padding: 1.5rem; }
</style>
