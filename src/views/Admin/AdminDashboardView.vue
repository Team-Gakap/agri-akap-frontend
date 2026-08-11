<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="fetchOverview">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="shell">
        <header class="intro">
          <p class="eyebrow">LGU Echague · Municipal Agriculture Office</p>
        </header>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading live overview…</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button @click="fetchOverview">Retry</ion-button>
        </div>

        <template v-else>
          <section class="section" aria-label="Descriptive analytics">
            <div class="kpi-grid">
              <ion-card class="kpi-card">
                <ion-card-content>
                  <p class="kpi-value">{{ fmt(dashboardData.descriptive?.total_farmers) }}</p>
                  <p class="kpi-label">Total Farmers</p>
                </ion-card-content>
              </ion-card>
              <ion-card class="kpi-card gold">
                <ion-card-content>
                  <p class="kpi-value">{{ fmt(dashboardData.descriptive?.total_hectares) }} <small>ha</small></p>
                  <p class="kpi-label">Active Hectares</p>
                </ion-card-content>
              </ion-card>
              <ion-card class="kpi-card">
                <ion-card-content>
                  <p class="kpi-value">{{ fmt(dashboardData.descriptive?.active_subsidies) }}</p>
                  <p class="kpi-label">Subsidy Releases (90d)</p>
                </ion-card-content>
              </ion-card>
            </div>
          </section>

          <section class="section mid-grid" aria-label="Diagnostic and predictive analytics">
            <div class="mid-col"> 
              <ion-card class="panel-card">
                <ion-card-header>
                  <ion-card-title>Pest / Damage by Crop Stage</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="chart-box">
                    <Doughnut :data="pestChartData" :options="doughnutOptions" />
                  </div>
                  <p v-if="!pestStageRows.length" class="empty-note">No pest_monitoring data yet.</p>
                </ion-card-content>
              </ion-card>
            </div>

            <div class="mid-col">
              <ion-card class="panel-card">
                <ion-card-header>
                  <ion-card-title>Upcoming Harvest Projections</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="chart-box">
                    <Bar :data="harvestChartData" :options="barOptions" />
                  </div>
                  <p v-if="!harvestRows.length" class="empty-note">No Active planting logs for forecast.</p>
                </ion-card-content>
              </ion-card>

              <ion-card class="panel-card risk-card">
                <ion-card-header>
                  <ion-card-title>Weather Risk Radar</ion-card-title>
                  <ion-card-subtitle>Next 3 days · Flood / Drought flags</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <ion-list lines="full" class="risk-list">
                    <ion-item v-for="r in weatherRisks" :key="r.barangay">
                      <ion-label>
                        <h3>{{ r.barangay }}</h3>
                        <p>{{ (r.risks || []).join(' · ') }}</p>
                      </ion-label>
                      <ion-badge slot="end" :color="riskBadgeColor(r)">{{ r.precipitation_probability }}%</ion-badge>
                    </ion-item>
                    <ion-item v-if="!weatherRisks.length">
                      <ion-label><p>No barangays above risk thresholds.</p></ion-label>
                    </ion-item>
                  </ion-list>
                </ion-card-content>
              </ion-card>
            </div>
          </section>

          <section class="section" aria-label="Prescriptive actions">
            <ion-card class="action-card">
              <ion-card-content>
                <ion-list lines="none" class="alert-list">
                  <ion-item v-for="(alert, i) in alerts" :key="i" class="alert-item">
                    <ion-label class="ion-text-wrap">
                      <ion-badge color="warning">{{ alert.type }}</ion-badge>
                      <h2>{{ alert.barangay || 'LGU-wide' }}</h2>
                      <p>{{ alert.message }}</p>
                    </ion-label>
                    <ion-button slot="end" class="sms-btn" @click="openSmsModal(alert)">
                      Draft SMS Advisory
                    </ion-button>
                  </ion-item>
                  <ion-item v-if="!alerts.length">
                    <ion-label>
                      <p>No automated recommendations from the current predictive feed.</p>
                    </ion-label>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </section>
        </template>
      </div>

      <ion-modal :is-open="smsOpen" @didDismiss="smsOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Draft SMS Advisory</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="smsOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-input
                label="Target Barangay"
                label-placement="stacked"
                :value="smsForm.barangay"
                @ionInput="(e: any) => smsForm.barangay = e.detail.value"
                placeholder="All / specific barangay"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-textarea
                label="Message"
                label-placement="stacked"
                :auto-grow="true"
                :value="smsForm.message"
                @ionInput="(e: any) => smsForm.message = e.detail.value"
                rows=6
              ></ion-textarea>
            </ion-item>
          </ion-list>
          <ion-button
            expand="block"
            class="send-btn"
            :disabled="sendingSms || !smsForm.message.trim()"
            @click="sendSmsDraft"
          >
            {{ sendingSms ? 'Sending…' : 'Send Broadcast' }}
          </ion-button>
          <ion-button expand="block" fill="outline" class="open-full-btn" @click="goBroadcastCenter">
            Open Full SMS Center
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonList, IonItem, IonLabel, IonBadge, IonModal, IonInput, IonTextarea,
  toastController,
} from '@ionic/vue';
import { refreshOutline, peopleOutline, leafOutline, giftOutline } from 'ionicons/icons';
import { Doughnut, Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import apiClient from '@/utils/axios';

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const LGU_GREEN = '#1a4731';
const LGU_GOLD = '#d4af37';

const router = useRouter();
const loading = ref(true);
const error = ref('');
const sendingSms = ref(false);
const smsOpen = ref(false);

const dashboardData = reactive<any>({
  descriptive: {},
  diagnostic: { pest_breakdown: [] },
  predictive: { harvest_forecast: [], weather_risk: [] },
  prescriptive: { alerts: [] },
});

const smsForm = reactive({
  barangay: '',
  message: '',
});

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');

const pestStageRows = computed(() => {
  const map = new Map<string, number>();
  for (const row of dashboardData.diagnostic?.pest_breakdown ?? []) {
    const key = row.crop_stage || 'Unspecified';
    map.set(key, (map.get(key) || 0) + Number(row.total || 0));
  }
  return [...map.entries()].map(([crop_stage, total]) => ({ crop_stage, total }));
});

const harvestRows = computed(() => dashboardData.predictive?.harvest_forecast ?? []);
const weatherRisks = computed(() => dashboardData.predictive?.weather_risk ?? []);
const alerts = computed(() => dashboardData.prescriptive?.alerts ?? []);

const pestChartData = computed(() => {
  const rows = pestStageRows.value;
  const palette = [LGU_GREEN, LGU_GOLD, '#2d6a4f', '#e8c96a', '#40916c', '#94a3b8'];
  return {
    labels: rows.map((r) => r.crop_stage),
    datasets: [{
      data: rows.map((r) => r.total),
      backgroundColor: rows.map((_, i) => palette[i % palette.length]),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };
});

const harvestChartData = computed(() => ({
  labels: harvestRows.value.map((r: any) => r.crop_type),
  datasets: [{
    label: 'Estimated harvest (kg)',
    data: harvestRows.value.map((r: any) => r.estimated_harvest_kg),
    backgroundColor: LGU_GREEN,
    hoverBackgroundColor: LGU_GOLD,
    borderRadius: 8,
    maxBarThickness: 42,
  }],
}));

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, usePointStyle: true, boxWidth: 10 },
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: LGU_GREEN, titleColor: '#fff', bodyColor: LGU_GOLD },
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { color: '#94a3b8' },
      grid: { color: 'rgba(26,71,49,0.08)' },
    },
  },
};

const riskBadgeColor = (r: any) => {
  if ((r.risks || []).includes('Flood Risk')) return 'danger';
  if ((r.risks || []).includes('Drought Risk')) return 'warning';
  return 'medium';
};

const fetchOverview = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/dashboard/overview');
    const payload = res.data?.data ?? {};
    dashboardData.descriptive = payload.descriptive ?? {};
    dashboardData.diagnostic = payload.diagnostic ?? { pest_breakdown: [] };
    dashboardData.predictive = payload.predictive ?? { harvest_forecast: [], weather_risk: [] };
    dashboardData.prescriptive = payload.prescriptive ?? { alerts: [] };
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load dashboard overview.';
  } finally {
    loading.value = false;
  }
};

const openSmsModal = (alert: any) => {
  smsForm.barangay = alert.barangay || '';
  smsForm.message = alert.message || '';
  smsOpen.value = true;
};

const sendSmsDraft = async () => {
  if (!smsForm.message.trim()) return;
  sendingSms.value = true;
  try {
    await apiClient.post('/broadcasts/send', {
      message_body: smsForm.message.trim(),
      target_barangay: smsForm.barangay || null,
      target_commodity: null,
    });
    const t = await toastController.create({
      message: 'SMS advisory broadcast queued/sent.',
      duration: 2600,
      color: 'success',
      position: 'top',
    });
    await t.present();
    smsOpen.value = false;
  } catch (e: any) {
    const t = await toastController.create({
      message: e?.response?.data?.message || 'Broadcast failed.',
      duration: 2800,
      color: 'danger',
      position: 'top',
    });
    await t.present();
  } finally {
    sendingSms.value = false;
  }
};

const goBroadcastCenter = async () => {
  smsOpen.value = false;
  await router.push({
    path: '/admin/broadcasts',
    query: {
      barangay: smsForm.barangay || undefined,
      draft: smsForm.message || undefined,
    },
  });
};

onMounted(() => fetchOverview());
</script>

<style scoped>
.page-bg {
  --background: linear-gradient(165deg, #eef5f0 0%, #f7faf8 45%, #e8f0ea 100%);
}
.shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.75rem;
}
.intro { margin-bottom: 1.35rem; }
.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d4af37;
}
.intro h1 {
  margin: 0.3rem 0 0;
  font-size: clamp(1.55rem, 3vw, 2rem);
  font-weight: 900;
  color: #1a4731;
  letter-spacing: -0.02em;
}
.lede {
  margin: 0.4rem 0 0;
  max-width: 40rem;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.45;
}
.center-state {
  text-align: center;
  padding: 3.5rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }
.section { margin-bottom: 1.75rem; }
.section-label span {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d4af37;
}
.section-label h2 {
  margin: 0.2rem 0 0.85rem;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1a4731;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}
.kpi-card {
  margin: 0;
  border-radius: 18px;
  border: 1px solid #d5e3da;
  background: #fff;
  box-shadow: 0 10px 28px rgba(26, 71, 49, 0.06);
}
.kpi-card.gold {
  background: linear-gradient(145deg, #1a4731 0%, #244f38 100%);
  border-color: #1a4731;
}
.kpi-card.gold .kpi-value,
.kpi-card.gold .kpi-label,
.kpi-card.gold .kpi-icon { color: #d4af37; }
.kpi-card.gold .kpi-label { color: rgba(255, 255, 255, 0.75); }
.kpi-icon {
  font-size: 1.45rem;
  color: #1a4731;
  margin-bottom: 0.55rem;
}
.kpi-value {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.15rem);
  font-weight: 900;
  color: #1a4731;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.kpi-value small {
  font-size: 0.9rem;
  font-weight: 700;
}
.kpi-label {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
}
.mid-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}
.mid-col { min-width: 0; }
.panel-card, .action-card {
  margin: 0 0 0.85rem;
  border-radius: 16px;
  border: 1px solid #d5e3da;
  background: #fff;
  box-shadow: 0 8px 22px rgba(26, 71, 49, 0.05);
}
ion-card-title {
  color: #1a4731;
  font-weight: 800;
  font-size: 1.02rem;
}
ion-card-subtitle {
  color: #94a3b8;
  font-weight: 600;
}
.chart-box {
  height: 260px;
  position: relative;
}
.empty-note {
  margin: 0.5rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}
.risk-list {
  background: transparent;
  padding: 0;
}
.risk-list ion-item {
  --background: #f8fbf9;
  --border-radius: 10px;
  margin-bottom: 0.4rem;
  border: 1px solid #e2ebe5;
  border-radius: 10px;
}
.risk-list h3 {
  margin: 0;
  font-weight: 800;
  color: #1a4731;
}
.alert-list { background: transparent; }
.alert-item {
  --background: #f8fbf9;
  --border-radius: 12px;
  border: 1px solid #d5e3da;
  border-radius: 12px;
  margin-bottom: 0.65rem;
  align-items: flex-start;
}
.alert-item h2 {
  margin: 0.35rem 0 0.2rem;
  font-size: 1rem;
  font-weight: 800;
  color: #1a4731;
}
.alert-item p {
  margin: 0;
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.4;
}
.sms-btn {
  --background: #d4af37;
  --color: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 0.35rem;
}
.send-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 1rem;
}
.open-full-btn {
  --border-color: #1a4731;
  --color: #1a4731;
  text-transform: none;
  font-weight: 700;
  margin-top: 0.5rem;
}
@media (max-width: 960px) {
  .kpi-grid,
  .mid-grid {
    grid-template-columns: 1fr;
  }
  .sms-btn {
    width: 100%;
    margin: 0.65rem 0 0.25rem;
  }
}
</style>
