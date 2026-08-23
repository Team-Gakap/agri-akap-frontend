<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="fetchDashboard">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="dash-bg">
      <div v-if="!assignedBarangay" class="p-4">
        <div class="warn-banner">
          No assigned barangay. Ask MAO admin to set <code>assigned_barangay</code>.
        </div>
      </div>

      <div v-else-if="loading && !loaded" class="center-state">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Syncing command center&hellip;</p>
      </div>

      <div v-else-if="error && !loaded" class="center-state error">
        <p>{{ error }}</p>
        <ion-button size="small" @click="fetchDashboard">Retry</ion-button>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 p-4">
        <!-- ── KPI strip ─────────────────────────────────────────────── -->
        <ion-card class="dense-card kpi-card lg:col-span-2" button @click="go('/brgy/farmers')">
          <ion-card-content class="kpi-body">
            <span class="kpi-label">Registered Farmers</span>
            <span class="kpi-value">{{ fmt(dashboardData.total_farmers) }}</span>
            <span class="kpi-sub">{{ fmt(dashboardData.verified_farmers) }} Verified | {{ fmt(dashboardData.pending_farmers) }} Pending RSBSA</span>
          </ion-card-content>
        </ion-card>

        <ion-card class="dense-card kpi-card lg:col-span-2" button @click="go('/brgy/planting-ledger')">
          <ion-card-content class="kpi-body">
            <span class="kpi-label">Rice Hectares</span>
            <span class="kpi-value">{{ fmtHa(dashboardData.rice_hectares) }}<small>ha</small></span>
            <span class="kpi-sub">Registered rice parcels</span>
          </ion-card-content>
        </ion-card>

        <ion-card class="dense-card kpi-card lg:col-span-2" button @click="go('/brgy/planting-ledger')">
          <ion-card-content class="kpi-body">
            <span class="kpi-label">Corn Hectares</span>
            <span class="kpi-value">{{ fmtHa(dashboardData.corn_hectares) }}<small>ha</small></span>
            <span class="kpi-sub">Registered corn parcels</span>
          </ion-card-content>
        </ion-card>

        <ion-card class="dense-card kpi-card lg:col-span-2" button @click="go('/brgy/farmers')">
          <ion-card-content class="kpi-body">
            <span class="kpi-label">Subsidy Logistics</span>
            <span class="kpi-value gold">{{ fmt(dashboardData.claimed_subsidies + dashboardData.unclaimed_subsidies) }}</span>
            <span class="kpi-sub">{{ fmt(dashboardData.claimed_subsidies) }} Claimed | {{ fmt(dashboardData.unclaimed_subsidies) }} Unclaimed</span>
          </ion-card-content>
        </ion-card>

        <ion-card class="dense-card kpi-card lg:col-span-2" button @click="go('/brgy/calamity-assessment')">
          <ion-card-content class="kpi-body">
            <span class="kpi-label">Active Calamities</span>
            <span class="kpi-value">{{ fmt(dashboardData.active_calamities) }}</span>
            <span class="kpi-sub">Pending damage reports</span>
          </ion-card-content>
        </ion-card>

        <ion-card class="dense-card kpi-card lg:col-span-2" button @click="go('/brgy/pest-monitoring')">
          <ion-card-content class="kpi-body">
            <span class="kpi-label">Active Pests</span>
            <span class="kpi-value">{{ fmt(dashboardData.active_pests) }}</span>
            <span class="kpi-sub">Unverified pest reports</span>
          </ion-card-content>
        </ion-card>

        <!-- ── Diagnostic analytics ──────────────────────────────────── -->
        <ion-card class="dense-card lg:col-span-8">
          <ion-card-header class="dense-head">
            <ion-card-title>{{ barangayName }} · crop stages and 6-month yield vs damage</ion-card-title>
          </ion-card-header>
          <ion-card-content class="chart-row">
            <div class="chart-pane">
              <p class="chart-caption">Active Crop Stages</p>
              <div v-if="hasStageData(dashboardData.crop_stages)" class="chart-box">
                <Doughnut :data="cropStageChartData" :options="doughnutOptions" />
              </div>
              <p v-else class="empty-inline">No standing crop recorded yet.</p>
            </div>
            <div class="chart-pane">
              <p class="chart-caption">Harvest Yields vs Calamity Damage</p>
              <div v-if="hasMonthlyData(dashboardData.monthly_yield_damage)" class="chart-box">
                <Bar :data="yieldDamageChartData" :options="barOptions" />
              </div>
              <p v-else class="empty-inline">No harvest or damage recorded yet.</p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- ── Local micro-climate ───────────────────────────────────── -->
        <ion-card class="dense-card lg:col-span-4">
          <ion-card-header class="dense-head">
            <ion-card-title>Weather</ion-card-title>
            <ion-card-subtitle>6-hour action window</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content class="climate-body">
            <div class="climate-now">
              <ion-icon :icon="weatherIcon(currentWeather?.weather_code)" class="wx-icon"></ion-icon>
              <div>
                <span class="temp-readout">{{ currentTemp }}&deg;C</span>
                <span class="wx-status">{{ currentWeather?.status || 'No cache' }}</span>
              </div>
            </div>

            <div class="soil-indicator" :class="soilStatus.tone">
              <span class="soil-label">Soil Moisture</span>
              <span class="soil-value">{{ deepSoilMoisture }}</span>
              <span class="soil-badge">{{ soilStatus.label }}</span>
            </div>

            <ul v-if="hourlyForecast.length" class="hour-list">
              <li v-for="hour in hourlyForecast" :key="hour.id || hour.forecast_datetime" class="hour-row">
                <span class="hour-time">{{ formatHour(hour.forecast_datetime) }}</span>
                <span class="hour-rain" :class="{ high: (hour.precipitation_probability ?? 0) > 70 }">
                  {{ hour.precipitation_probability ?? 0 }}% rain
                </span>
                <span class="hour-wind">{{ fmtNum(hour.wind_speed, 0) }} km/h</span>
              </li>
            </ul>
            <p v-else class="empty-inline">No hourly forecast cached.</p>
          </ion-card-content>
        </ion-card>

        <!-- ── Prescriptive action center ────────────────────────────── -->
        <ion-card class="dense-card lg:col-span-12">
          <ion-card-header class="dense-head">
            <ion-card-title>Automated Intelligence &amp; Required Actions</ion-card-title>
            <ion-card-subtitle>Weather, pest, and field triggers · {{ displayAlerts.length }} active</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content class="action-body">
            <div class="alert-list">
              <div v-for="(alert, i) in displayAlerts" :key="i" class="alert-row">
                <ion-badge :color="alertBadge(alert.type)">{{ alertTypeLabel(alert.type) }}</ion-badge>
                <p class="alert-copy">{{ alert.message }}</p>
                <ion-button
                  fill="outline"
                  size="small"
                  class="action-btn"
                  @click="handleAlert(alert)"
                >
                  {{ alert.action || 'Take Action' }}
                </ion-button>
              </div>
              <div v-if="!displayAlerts.length" class="alert-row empty">
                <p class="alert-copy">No automated actions required. All indicators nominal.</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>

    <ion-modal :is-open="smsOpen" @didDismiss="smsOpen = false">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Draft SMS</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="smsOpen = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-textarea
          label="Advisory"
          label-placement="stacked"
          :auto-grow="true"
          :value="smsDraft"
          :rows="5"
          @ionInput="(e: any) => smsDraft = e.detail.value || ''"
        ></ion-textarea>
        <ion-button expand="block" size="small" class="copy-btn" :disabled="!smsDraft.trim()" @click="copySmsDraft">
          Copy message
        </ion-button>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonBadge, IonModal, IonTextarea,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  refreshOutline, sunnyOutline, cloudyOutline, rainyOutline, snowOutline,
  partlySunnyOutline, thunderstormOutline,
} from 'ionicons/icons';
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
import { toast } from '@/utils/toast';
import { useAuthStore } from '@/stores/authStore';

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const LGU_GREEN = '#1a4731';
const LGU_GOLD = '#d4af37';

interface CurrentWeather {
  temperature_min?: number | null;
  temperature_max?: number | null;
  soil_moisture?: number | null;
  soil_moisture_28cm?: number | null;
  weather_code?: number | null;
  status?: string;
}

interface HourlyForecast {
  id?: string;
  forecast_datetime: string;
  temperature?: number | null;
  precipitation_probability?: number | null;
  wind_speed?: number | null;
  weather_code?: number | null;
}

interface ActionAlert {
  type: string;
  message: string;
  action?: string;
}

interface CropStages {
  seedling: number;
  vegetative: number;
  reproductive: number;
  maturity: number;
}

interface MonthlyYieldDamage {
  month: string;
  key?: string;
  harvest: number;
  damage: number;
}

interface DashboardData {
  total_farmers: number;
  verified_farmers: number;
  pending_farmers: number;
  total_hectares: number;
  rice_hectares: number;
  corn_hectares: number;
  claimed_subsidies: number;
  unclaimed_subsidies: number;
  active_threats: number;
  active_calamities: number;
  active_pests: number;
  crop_stages: CropStages;
  monthly_yield_damage: MonthlyYieldDamage[];
}

const CROP_STAGE_LABELS: Array<keyof CropStages> = ['seedling', 'vegetative', 'reproductive', 'maturity'];
const CROP_STAGE_TITLES = ['Seedling', 'Vegetative', 'Reproductive', 'Maturity'];

const EMPTY_CROP_STAGES: CropStages = {
  seedling: 0,
  vegetative: 0,
  reproductive: 0,
  maturity: 0,
};

function lastSixMonthKeys(): MonthlyYieldDamage[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      month: d.toLocaleString('en-PH', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      harvest: 0,
      damage: 0,
    };
  });
}

const router = useRouter();
const authStore = useAuthStore();

const assignedBarangay = computed(() => authStore.user?.assigned_barangay || null);
const barangayName = computed(() => assignedBarangay.value || 'Barangay');

const loading = ref(false);
const loaded = ref(false);
const error = ref('');
const smsOpen = ref(false);
const smsDraft = ref('');

const dashboardData = reactive<DashboardData>({
  total_farmers: 0,
  verified_farmers: 0,
  pending_farmers: 0,
  total_hectares: 0,
  rice_hectares: 0,
  corn_hectares: 0,
  claimed_subsidies: 0,
  unclaimed_subsidies: 0,
  active_threats: 0,
  active_calamities: 0,
  active_pests: 0,
  crop_stages: { ...EMPTY_CROP_STAGES },
  monthly_yield_damage: lastSixMonthKeys(),
});

const currentWeather = ref<CurrentWeather | null>(null);
const hourlyForecast = ref<HourlyForecast[]>([]);
const apiAlerts = ref<ActionAlert[]>([]);

const currentTemp = computed(() => {
  const hourlyTemp = hourlyForecast.value[0]?.temperature;
  if (hourlyTemp != null) return Math.round(Number(hourlyTemp));
  const max = currentWeather.value?.temperature_max;
  const min = currentWeather.value?.temperature_min;
  if (max != null) return Math.round(Number(max));
  if (min != null) return Math.round(Number(min));
  return '—';
});

const soilPct = computed(() => {
  const raw = currentWeather.value?.soil_moisture_28cm ?? currentWeather.value?.soil_moisture;
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const n = Number(raw);
  return n <= 1 ? n * 100 : n;
});

const deepSoilMoisture = computed(() => {
  if (soilPct.value == null) return '—';
  return `${soilPct.value.toFixed(0)}%`;
});

const soilStatus = computed(() => {
  const pct = soilPct.value;
  if (pct == null) return { label: 'Unknown', tone: 'neutral' };
  if (pct >= 55) return { label: 'Adequate', tone: 'good' };
  if (pct >= 35) return { label: 'Moderate', tone: 'moderate' };
  return { label: 'Low', tone: 'low' };
});

const displayAlerts = computed<ActionAlert[]>(() => {
  const derived: ActionAlert[] = [];
  const rainLow = hourlyForecast.value.every(h => (h.precipitation_probability ?? 100) < 50);
  if (soilStatus.value.tone === 'good' && rainLow && hourlyForecast.value.length) {
    derived.push({
      type: 'planting',
      message: 'Optimal planting window opens tomorrow. Soil moisture is adequate with low rain risk.',
      action: 'Schedule Planting',
    });
  }
  return [...apiAlerts.value, ...derived];
});

const cropStageChartData = computed(() => {
  const stages = dashboardData.crop_stages;
  const palette = [LGU_GOLD, LGU_GREEN, '#40916c', '#94a3b8'];
  return {
    labels: CROP_STAGE_TITLES,
    datasets: [{
      data: CROP_STAGE_LABELS.map(k => Number(stages[k] ?? 0)),
      backgroundColor: palette,
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };
});

const yieldDamageChartData = computed(() => ({
  labels: dashboardData.monthly_yield_damage.map(r => r.month),
  datasets: [
    {
      label: 'Harvest yield',
      data: dashboardData.monthly_yield_damage.map(r => r.harvest),
      backgroundColor: LGU_GREEN,
      borderRadius: 4,
      maxBarThickness: 28,
    },
    {
      label: 'Calamity damage (ha)',
      data: dashboardData.monthly_yield_damage.map(r => r.damage),
      backgroundColor: LGU_GOLD,
      borderRadius: 4,
      maxBarThickness: 28,
    },
  ],
}));

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '58%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, boxWidth: 10, boxHeight: 10, font: { size: 13, weight: 700 as const }, padding: 12 },
    },
    tooltip: { backgroundColor: LGU_GREEN, titleColor: '#fff', bodyColor: LGU_GOLD, bodyFont: { size: 13 } },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, boxWidth: 10, boxHeight: 10, font: { size: 13, weight: 700 as const }, padding: 10 },
    },
    tooltip: { backgroundColor: LGU_GREEN, titleColor: '#fff', bodyColor: LGU_GOLD, bodyFont: { size: 13 } },
  },
  scales: {
    x: {
      ticks: { color: '#475569', font: { size: 12, weight: 600 as const } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#64748b', font: { size: 12 } },
      grid: { color: 'rgba(26,71,49,0.08)' },
    },
  },
};

const fmt = (v: unknown) => Number(v ?? 0).toLocaleString('en-PH');
const fmtHa = (v: unknown) => Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 1 });
const fmtNum = (v: unknown, digits = 0) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
};
const go = (path: string) => router.push(path);

const weatherIcon = (code?: number | null) => {
  if (code == null) return cloudyOutline;
  if (code === 0) return sunnyOutline;
  if (code <= 3) return partlySunnyOutline;
  if (code <= 48) return cloudyOutline;
  if (code <= 82) return rainyOutline;
  if (code <= 86) return snowOutline;
  if (code >= 95) return thunderstormOutline;
  return cloudyOutline;
};

const formatHour = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', hour12: true }).replace(' ', '');
};

const alertBadge = (type: string) => {
  if (type === 'pest') return 'warning';
  if (type === 'planting') return 'success';
  return 'primary';
};

const alertTypeLabel = (type: string) => {
  if (type === 'pest') return 'Pest';
  if (type === 'planting') return 'Planting';
  return 'Weather';
};

function normalizeStages(raw: Partial<CropStages> | undefined): CropStages {
  const next: CropStages = { seedling: 0, vegetative: 0, reproductive: 0, maturity: 0 };
  for (const key of CROP_STAGE_LABELS) {
    next[key] = Number(raw?.[key] ?? 0);
  }
  return next;
}

function hasStageData(stages: CropStages): boolean {
  return CROP_STAGE_LABELS.some(k => stages[k] > 0);
}

function hasMonthlyData(rows: MonthlyYieldDamage[]): boolean {
  return rows.some(r => Number(r.harvest) > 0 || Number(r.damage) > 0);
}

const fetchDashboard = async () => {
  if (!assignedBarangay.value) {
    loaded.value = true;
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/brgy/dashboard');
    const payload = res.data?.data ?? {};
    const desc = payload.descriptive ?? {};
    const diag = payload.diagnostic ?? {};

    const stages = normalizeStages(diag.crop_stages);
    const monthly: MonthlyYieldDamage[] = Array.isArray(diag.monthly_yield_damage)
      ? diag.monthly_yield_damage.map((r: MonthlyYieldDamage) => ({
          month: r.month,
          key: r.key,
          harvest: Number(r.harvest ?? 0),
          damage: Number(r.damage ?? 0),
        }))
      : [];

    Object.assign(dashboardData, {
      total_farmers: Number(desc.total_farmers ?? 0),
      verified_farmers: Number(desc.verified_farmers ?? 0),
      pending_farmers: Number(desc.pending_farmers ?? 0),
      total_hectares: Number(desc.total_hectares ?? desc.active_hectares ?? 0),
      rice_hectares: Number(desc.rice_hectares ?? 0),
      corn_hectares: Number(desc.corn_hectares ?? 0),
      claimed_subsidies: Number(desc.claimed_subsidies ?? 0),
      unclaimed_subsidies: Number(desc.unclaimed_subsidies ?? desc.pending_subsidies ?? 0),
      active_threats: Number(desc.active_threats ?? 0),
      active_calamities: Number(desc.active_calamities ?? 0),
      active_pests: Number(desc.active_pests ?? 0),
      crop_stages: stages,
      monthly_yield_damage: monthly.length ? monthly : lastSixMonthKeys(),
    });

    currentWeather.value = diag.current_weather ?? null;
    hourlyForecast.value = payload.predictive?.hourly_forecast ?? [];
    apiAlerts.value = payload.prescriptive?.alerts ?? [];
    loaded.value = true;
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load barangay command center.';
  } finally {
    loading.value = false;
  }
};

const handleAlert = (alert: ActionAlert) => {
  const action = (alert.action || '').toLowerCase();
  if (action.includes('sms')) {
    smsDraft.value = alert.message;
    smsOpen.value = true;
    return;
  }
  if (action.includes('planting') || alert.type === 'planting') {
    void router.push('/brgy/planting-ledger');
    return;
  }
  void router.push('/brgy/pest-monitoring');
};

const copySmsDraft = async () => {
  try {
    await navigator.clipboard.writeText(smsDraft.value.trim());
    await toast.success('Advisory copied.', 2000);
  } catch {
    await toast.error('Copy failed — select text manually.', 2000);
  }
};

onMounted(() => { void fetchDashboard(); });
onIonViewWillEnter(() => {
  if (loaded.value) void fetchDashboard();
});
</script>

<style scoped>
.dash-bg { --background: #eef2ef; --padding-top: 0; --padding-bottom: 0; --padding-start: 0; --padding-end: 0; }

.grid {
  display: grid;
  width: 100%;
  max-width: min(1480px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  align-items: stretch;
}
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.gap-4 { gap: 1rem; }
.p-4 { padding: 1rem 1.1rem 1.4rem; }

@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .p-4 { padding: 1.15rem 1.25rem 1.6rem; }
  .gap-4 { gap: 1.1rem; }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .lg\:col-span-3 { grid-column: span 3 / span 3; }
  .lg\:col-span-4 { grid-column: span 4 / span 4; }
  .lg\:col-span-8 { grid-column: span 8 / span 8; }
  .lg\:col-span-12 { grid-column: span 12 / span 12; }
}

.warn-banner {
  background: #fff8e1;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
}
.center-state { text-align: center; padding: 3rem 1rem; color: #64748b; font-size: 1rem; }
.center-state.error { color: #b91c1c; }

.dense-card {
  margin: 0;
  border-radius: 14px;
  border: 1px solid #d5ded8;
  background: #fff;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.06);
  overflow: hidden;
}
.kpi-card { border-top: 4px solid #1a4731; }
.kpi-card:nth-child(2),
.kpi-card:nth-child(3) { border-top-color: #d4af37; }
.kpi-card:nth-child(4) { border-top-color: #64748b; }
.kpi-card:nth-child(5),
.kpi-card:nth-child(6) { border-top-color: #b91c1c; }

.dense-head { padding: 14px 16px 6px; }
.dense-card ion-card-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1a4731;
  letter-spacing: -0.01em;
}
.dense-card ion-card-subtitle {
  font-size: 0.8rem;
  font-weight: 650;
  color: #64748b;
  text-transform: none;
  letter-spacing: 0;
}

.kpi-body {
  padding: 16px 18px 18px !important;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 118px;
}
.kpi-label {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}
.kpi-value {
  font-size: clamp(2rem, 3.4vw, 2.7rem);
  font-weight: 900;
  color: #1a4731;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.kpi-value small {
  font-size: 0.95rem;
  font-weight: 800;
  margin-left: 4px;
  color: #64748b;
}
.kpi-value.gold { color: #a3831f; }
.kpi-sub {
  margin-top: 4px;
  font-size: 0.85rem;
  font-weight: 650;
  color: #475569;
  line-height: 1.35;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.1rem;
  padding: 8px 16px 18px !important;
}
.chart-caption {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 800;
  color: #334155;
}
.chart-box { height: 220px; position: relative; }

.climate-body { padding: 8px 16px 16px !important; }
.climate-now {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0 12px;
  border-bottom: 1px solid #e8eeea;
}
.wx-icon { font-size: 2.8rem; color: #d4af37; flex-shrink: 0; }
.temp-readout {
  display: block;
  font-size: clamp(2.1rem, 3vw, 2.6rem);
  font-weight: 900;
  color: #1a4731;
  line-height: 1;
  letter-spacing: -0.03em;
}
.wx-status { font-size: 0.95rem; font-weight: 750; color: #475569; }

.soil-indicator {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  border: 1px solid #e2e8f0;
}
.soil-indicator.good { background: #ecfdf5; border-color: #a7f3d0; }
.soil-indicator.moderate { background: #fffbeb; border-color: #fde68a; }
.soil-indicator.low { background: #fef2f2; border-color: #fecaca; }
.soil-indicator.neutral { background: #f8fafc; }
.soil-label { color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.72rem; }
.soil-value { color: #1a4731; font-weight: 900; font-size: 1.05rem; }
.soil-badge {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(26, 71, 49, 0.1);
  color: #1a4731;
}

.hour-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 180px;
  overflow-y: auto;
}
.hour-row {
  display: grid;
  grid-template-columns: 64px 1fr 72px;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f3;
  font-size: 0.88rem;
  font-weight: 700;
}
.hour-time { color: #64748b; }
.hour-rain { color: #2563eb; }
.hour-rain.high { color: #dc2626; }
.hour-wind { color: #475569; text-align: right; }
.empty-inline { margin: 4px 0 0; font-size: 0.9rem; color: #64748b; }

.action-body { padding: 8px 14px 16px !important; }
.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  background: #f8faf9;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
}
.alert-row.empty { background: #fff; }
.alert-copy {
  margin: 0;
  flex: 1 1 220px;
  font-size: 0.98rem;
  font-weight: 650;
  color: #1e293b;
  line-height: 1.4;
}
.action-btn {
  --border-color: #1a4731;
  --color: #1a4731;
  --padding-start: 14px;
  --padding-end: 14px;
  text-transform: none;
  font-weight: 750;
  font-size: 0.85rem;
  min-height: 36px;
  margin: 0;
  flex: 0 0 auto;
}
.copy-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 0.75rem;
}

@media (min-width: 900px) {
  .chart-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); }
  .chart-box { height: 260px; }
}

@media (min-width: 1280px) {
  .kpi-body { min-height: 132px; padding: 18px 20px 20px !important; }
  .chart-box { height: 290px; }
}

@media (max-width: 639px) {
  .kpi-body { min-height: 0; }
  .soil-indicator { grid-template-columns: 1fr auto; }
  .soil-badge { grid-column: 1 / -1; justify-self: start; }
  .action-btn { width: 100%; }
}
</style>
