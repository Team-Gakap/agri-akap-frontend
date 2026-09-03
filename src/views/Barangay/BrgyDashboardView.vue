<template>
  <ion-page>
    <AppHeader />

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
        <!-- ── 1. Descriptive KPI belt (4 cards) ──────────────────────── -->
        <button class="kpi-card lg:col-span-3" type="button" @click="go('/brgy/farmers')">
          <div class="kpi-icon kpi-tone-green">
            <ion-icon :icon="peopleOutline"></ion-icon>
          </div>
          <p class="kpi-value">{{ fmt(dashboardData.total_farmers) }}</p>
          <p class="kpi-label">Registered Farmers</p>
          <p class="kpi-sub">
            {{ fmt(dashboardData.verified_farmers) }} Verified · {{ fmt(dashboardData.pending_farmers) }} Pending RSBSA
          </p>
          <p
            class="kpi-hint kpi-photo-link"
            @click.stop="go('/brgy/id-issuance?chip=missing-photo')"
          >
            {{ fmt(dashboardData.missing_id_photos) }} missing ID photos
          </p>
        </button>

        <button class="kpi-card lg:col-span-3" type="button" @click="go('/brgy/planting-ledger')">
          <div class="kpi-icon kpi-tone-gold">
            <ion-icon :icon="leafOutline"></ion-icon>
          </div>
          <p class="kpi-value">{{ fmtHa(dashboardData.total_hectares) }} <small>ha</small></p>
          <p class="kpi-label">Cultivated Land (Active Season)</p>
          <p class="kpi-sub">
            {{ fmtHa(dashboardData.rice_hectares) }} ha Rice · {{ fmtHa(dashboardData.corn_hectares) }} ha Corn
          </p>
          <p v-if="dashboardData.registered_land_ha" class="kpi-hint">
            of {{ fmtHa(dashboardData.registered_land_ha) }} ha Registered ({{ dashboardData.tilled_percent ?? 0 }}% tilled)
          </p>
        </button>

        <button class="kpi-card lg:col-span-3" type="button" @click="go('/brgy/reports/subsidies')">
          <div class="kpi-icon kpi-tone-slate">
            <ion-icon :icon="cubeOutline"></ion-icon>
          </div>
          <p class="kpi-value">
            {{ fmt(dashboardData.claimed_subsidies) }}
            <small>/ {{ fmt(subsidyTotal) }}</small>
          </p>
          <p class="kpi-label">Subsidy Uptake</p>
          <div class="micro-bar" aria-hidden="true">
            <span :style="{ width: subsidyPercent + '%' }"></span>
          </div>
          <p class="kpi-hint">{{ subsidyPercent }}% release progress</p>
        </button>

        <button class="kpi-card lg:col-span-3" type="button" @click="go('/brgy/pest-monitoring')">
          <div class="kpi-icon kpi-tone-danger">
            <ion-icon :icon="warningOutline"></ion-icon>
          </div>
          <p class="kpi-value">{{ fmt(dashboardData.active_threats) }}</p>
          <p class="kpi-label">Threat Triage</p>
          <p class="kpi-sub">
            {{ fmt(dashboardData.active_calamities) }} Calamity · {{ fmt(dashboardData.active_pests) }} Unverified Pests
          </p>
        </button>

        <!-- ── 2. Diagnostic charts (8) ───────────────────────────────── -->
        <div class="lg:col-span-8 diag-col">
          <section class="panel-card">
            <header class="panel-head">
              <div>
                <h2>Active Crop Stages</h2>
                <p>Seasonal vulnerability for {{ barangayName }}</p>
              </div>
            </header>
            <div v-if="hasStageData(dashboardData.crop_stages)" class="chart-box">
              <Doughnut :data="cropStageChartData" :options="doughnutOptions" />
            </div>
            <p v-else class="empty-inline">No standing crop recorded yet.</p>
            <p v-if="hasStageData(dashboardData.crop_stages)" class="stage-legend">
              Seedling {{ stagePct('seedling') }}% · Vegetative {{ stagePct('vegetative') }}% ·
              Reproductive {{ stagePct('reproductive') }}% · Maturity {{ stagePct('maturity') }}%
            </p>
          </section>

          <section class="panel-card">
            <header class="panel-head">
              <div>
                <h2>12-Month Yield vs Loss</h2>
                <p>Harvest (MT) vs calamity damage (ha)</p>
              </div>
            </header>
            <div v-if="hasMonthlyData(dashboardData.monthly_yield_damage)" class="chart-box tall">
              <Bar :data="yieldDamageChartData" :options="barOptions" />
            </div>
            <p v-else class="empty-inline">No harvest or damage recorded yet.</p>
            <p v-if="hasMonthlyData(dashboardData.monthly_yield_damage)" class="stage-legend">
              Period total · Harvested {{ fmtHa(harvestPeriodTotal) }} MT · Damaged {{ fmtHa(damagePeriodTotal) }} ha
            </p>
          </section>
        </div>

        <!-- ── 3. Micro-climate (4) ───────────────────────────────────── -->
        <section class="panel-card lg:col-span-4 climate-card">
          <header class="panel-head">
            <div>
              <h2>Local Micro-Climate</h2>
              <p>{{ barangayName }} · Open-Meteo cache</p>
            </div>
          </header>

          <div v-if="loading && !hasWeather" class="wx-skeleton">
            <ion-skeleton-text animated style="width: 42%; height: 2.4rem;"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 70%;"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 100%; height: 3rem;"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 100%; height: 4.5rem;"></ion-skeleton-text>
          </div>

          <template v-else-if="hasWeather">
            <div class="climate-now">
              <ion-icon :icon="weatherIcon(currentWeather?.weather_code)" class="wx-icon"></ion-icon>
              <div>
                <span class="temp-readout">{{ currentTemp }}&deg;C</span>
                <span class="wx-status">{{ currentWeather?.status || 'Current conditions' }}</span>
                <span v-if="currentWind != null" class="wx-wind">Wind {{ fmtNum(currentWind, 0) }} km/h</span>
              </div>
            </div>

            <div class="soil-indicator" :class="soilStatus.tone">
              <span class="soil-label">Root-zone soil moisture</span>
              <span class="soil-value">{{ soilDisplay }}</span>
              <span class="soil-badge">{{ soilStatus.label }}</span>
            </div>

            <p class="hour-caption">6-hour agricultural advisory window</p>
            <div v-if="hourlyForecast.length" class="hour-pills">
              <div
                v-for="hour in hourlyForecast"
                :key="hour.id || hour.forecast_datetime"
                class="hour-pill"
                :class="hourTone(hour)"
              >
                <span class="hour-time">{{ formatHour(hour.forecast_datetime) }}</span>
                <span class="hour-temp">{{ fmtNum(hour.temperature, 0) }}&deg;</span>
                <span class="hour-rain">{{ hour.precipitation_probability ?? 0 }}% rain</span>
                <span class="hour-wind">{{ fmtNum(hour.wind_speed, 0) }} km/h</span>
                <span class="hour-flag">{{ hourFlag(hour) }}</span>
              </div>
            </div>
            <p v-else class="empty-inline">Hourly slots not cached yet. Daily snapshot is shown above.</p>
          </template>

          <div v-else class="wx-empty">
            <ion-icon :icon="cloudyOutline" class="wx-empty-icon"></ion-icon>
            <p><strong>No Open-Meteo cache for {{ barangayName }}.</strong></p>
            <p>The municipal climate sync has not stored a 6-hour window for this barangay yet.</p>
          </div>
        </section>

        <!-- ── 4. Prescriptive Action Center ──────────────────────────── -->
        <section class="panel-card lg:col-span-12 action-card">
          <header class="panel-head">
            <div>
              <h2>Prescriptive Action Center</h2>
              <p>Weather, pest, and field triggers · {{ displayAlerts.length }} active</p>
            </div>
          </header>
          <div class="alert-list">
            <div v-for="(alert, i) in displayAlerts" :key="i" class="alert-row">
              <span class="sev-badge" :class="alert.severity || alert.type">{{ alert.label || alertTypeLabel(alert.type) }}</span>
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
        </section>
      </div>
    </ion-content>

    <ion-modal :is-open="smsOpen" @didDismiss="smsOpen = false">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Barangay SMS Advisory</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="smsOpen = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p class="sms-hint">Barangay accounts copy this draft for the local SMS blast. MAO retains the municipal broadcast queue.</p>
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
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonModal, IonTextarea, IonSkeletonText,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  refreshOutline, sunnyOutline, cloudyOutline, rainyOutline, snowOutline,
  partlySunnyOutline, thunderstormOutline, peopleOutline, leafOutline,
  cubeOutline, warningOutline,
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

const LGU_GREEN = '#1A4731';
const LGU_GOLD = '#D4AF37';

interface CurrentWeather {
  temperature_min?: number | null;
  temperature_max?: number | null;
  soil_moisture?: number | null;
  soil_moisture_28cm?: number | null;
  wind_speed_10m?: number | null;
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
  label?: string;
  severity?: string;
  route?: string | null;
  sms_message?: string;
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
  missing_id_photos: number;
  total_hectares: number;
  rice_hectares: number;
  corn_hectares: number;
  registered_land_ha?: number;
  tilled_percent?: number;
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

function lastTwelveMonthKeys(): MonthlyYieldDamage[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
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
  missing_id_photos: 0,
  total_hectares: 0,
  rice_hectares: 0,
  corn_hectares: 0,
  claimed_subsidies: 0,
  unclaimed_subsidies: 0,
  active_threats: 0,
  active_calamities: 0,
  active_pests: 0,
  crop_stages: { ...EMPTY_CROP_STAGES },
  monthly_yield_damage: lastTwelveMonthKeys(),
});

const currentWeather = ref<CurrentWeather | null>(null);
const hourlyForecast = ref<HourlyForecast[]>([]);
const apiAlerts = ref<ActionAlert[]>([]);

const subsidyTotal = computed(
  () => Number(dashboardData.claimed_subsidies) + Number(dashboardData.unclaimed_subsidies),
);
const subsidyPercent = computed(() => {
  if (subsidyTotal.value <= 0) return 0;
  return Math.min(100, Math.round((dashboardData.claimed_subsidies / subsidyTotal.value) * 100));
});

const currentTemp = computed(() => {
  const hourlyTemp = hourlyForecast.value[0]?.temperature;
  if (hourlyTemp != null) return Math.round(Number(hourlyTemp));
  const max = currentWeather.value?.temperature_max;
  const min = currentWeather.value?.temperature_min;
  if (max != null) return Math.round(Number(max));
  if (min != null) return Math.round(Number(min));
  return '—';
});

const currentWind = computed(() => {
  const hourly = hourlyForecast.value[0]?.wind_speed;
  if (hourly != null) return Number(hourly);
  const daily = currentWeather.value?.wind_speed_10m;
  return daily != null ? Number(daily) : null;
});

const soilVolumetric = computed(() => {
  const raw = currentWeather.value?.soil_moisture_28cm ?? currentWeather.value?.soil_moisture;
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const n = Number(raw);
  return n > 1 ? n / 100 : n;
});

const soilDisplay = computed(() => {
  if (soilVolumetric.value == null) return '—';
  return `${soilVolumetric.value.toFixed(2)} m³/m³`;
});

const soilStatus = computed(() => {
  const v = soilVolumetric.value;
  if (v == null) return { label: 'Unknown', tone: 'neutral' };
  if (v >= 0.20 && v <= 0.40) return { label: 'Optimal', tone: 'good' };
  if (v > 0.40) return { label: 'Saturated', tone: 'moderate' };
  return { label: 'Low', tone: 'low' };
});

const hasWeather = computed(() =>
  Boolean(currentWeather.value) || hourlyForecast.value.length > 0,
);

const harvestPeriodTotal = computed(() =>
  dashboardData.monthly_yield_damage.reduce((s, r) => s + Number(r.harvest ?? 0), 0),
);
const damagePeriodTotal = computed(() =>
  dashboardData.monthly_yield_damage.reduce((s, r) => s + Number(r.damage ?? 0), 0),
);

const displayAlerts = computed<ActionAlert[]>(() => {
  const derived: ActionAlert[] = [];
  const rainLow = hourlyForecast.value.every(h => (h.precipitation_probability ?? 100) < 50);
  if (soilStatus.value.tone === 'good' && rainLow && hourlyForecast.value.length) {
    derived.push({
      type: 'planting',
      severity: 'info',
      label: 'Planting Window',
      message: 'Optimal planting window: soil moisture is adequate with low rain risk.',
      action: 'Open Planting Ledger',
      route: '/brgy/planting-ledger',
    });
  }
  return [...apiAlerts.value, ...derived];
});

const stageTotal = computed(() =>
  CROP_STAGE_LABELS.reduce((s, k) => s + Number(dashboardData.crop_stages[k] ?? 0), 0),
);

const stagePct = (key: keyof CropStages) => {
  if (stageTotal.value <= 0) return '0';
  return ((Number(dashboardData.crop_stages[key] ?? 0) / stageTotal.value) * 100).toFixed(0);
};

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
      label: 'Harvest yield (MT)',
      data: dashboardData.monthly_yield_damage.map(r => r.harvest),
      backgroundColor: LGU_GREEN,
      borderRadius: 4,
      maxBarThickness: 22,
      yAxisID: 'y',
    },
    {
      label: 'Calamity damage (ha)',
      data: dashboardData.monthly_yield_damage.map(r => r.damage),
      backgroundColor: LGU_GOLD,
      borderRadius: 4,
      maxBarThickness: 22,
      yAxisID: 'yDamage',
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
      labels: { color: LGU_GREEN, boxWidth: 10, boxHeight: 10, font: { size: 12, weight: 700 as const }, padding: 10 },
    },
    tooltip: { backgroundColor: LGU_GREEN, titleColor: '#fff', bodyColor: LGU_GOLD },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, boxWidth: 10, boxHeight: 10, font: { size: 12, weight: 700 as const }, padding: 10 },
    },
    tooltip: {
      backgroundColor: LGU_GREEN,
      titleColor: '#fff',
      bodyColor: LGU_GOLD,
      callbacks: {
        label: (ctx: any) => {
          const unit = ctx.dataset.yAxisID === 'yDamage' ? 'ha' : 'MT';
          return `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('en-PH', { maximumFractionDigits: 1 })} ${unit}`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#475569', font: { size: 9, weight: 600 as const }, maxRotation: 0, minRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      position: 'left' as const,
      title: { display: true, text: 'MT', color: '#64748b', font: { size: 11, weight: 700 as const } },
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { color: 'rgba(26,71,49,0.08)' },
    },
    yDamage: {
      beginAtZero: true,
      position: 'right' as const,
      title: { display: true, text: 'ha', color: '#64748b', font: { size: 11, weight: 700 as const } },
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { drawOnChartArea: false },
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
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
};

const hourTone = (hour: HourlyForecast) => {
  const rain = hour.precipitation_probability ?? 0;
  const wind = hour.wind_speed ?? 0;
  if (rain >= 80) return 'flood';
  if (rain >= 70 || wind > 15) return 'warn';
  return 'safe';
};

const hourFlag = (hour: HourlyForecast) => {
  const rain = hour.precipitation_probability ?? 0;
  const wind = hour.wind_speed ?? 0;
  if (rain >= 80) return 'Flood watch';
  if (wind > 15) return 'Spray delay';
  if (rain >= 70) return 'Spray delay';
  return 'Safe';
};

const alertTypeLabel = (type: string) => {
  if (type === 'pest') return 'Pest Report';
  if (type === 'calamity') return 'Calamity Loss';
  if (type === 'planting') return 'Planting Window';
  return 'Weather Advisory';
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
      missing_id_photos: Number(desc.missing_id_photos ?? 0),
      total_hectares: Number(desc.total_hectares ?? desc.active_hectares ?? 0),
      rice_hectares: Number(desc.rice_hectares ?? 0),
      corn_hectares: Number(desc.corn_hectares ?? 0),
      registered_land_ha: Number(desc.registered_land_ha ?? 0),
      tilled_percent: Number(desc.tilled_percent ?? 0),
      claimed_subsidies: Number(desc.claimed_subsidies ?? 0),
      unclaimed_subsidies: Number(desc.unclaimed_subsidies ?? desc.pending_subsidies ?? 0),
      active_threats: Number(desc.active_threats ?? 0),
      active_calamities: Number(desc.active_calamities ?? 0),
      active_pests: Number(desc.active_pests ?? 0),
      crop_stages: stages,
      monthly_yield_damage: monthly.length ? monthly : lastTwelveMonthKeys(),
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
  if (action.includes('sms') || alert.type === 'weather') {
    smsDraft.value = alert.sms_message || alert.message;
    smsOpen.value = true;
    return;
  }
  if (alert.route) {
    void router.push(alert.route);
    return;
  }
  if (alert.type === 'calamity') {
    void router.push('/brgy/calamity-assessment');
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

onMounted(() => {
  void fetchDashboard();
  window.addEventListener('akap:refresh', fetchDashboard);
});
onBeforeUnmount(() => window.removeEventListener('akap:refresh', fetchDashboard));
onIonViewWillEnter(() => {
  if (loaded.value) void fetchDashboard();
});
</script>

<style scoped>
.dash-bg { --background: #F8FAFC; --padding-top: 0; --padding-bottom: 0; --padding-start: 0; --padding-end: 0; }

.grid {
  display: grid;
  width: 100%;
  max-width: min(1400px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  align-items: stretch;
}
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.gap-4 { gap: 1rem; }
.p-4 { padding: 0.75rem 1.1rem 1.5rem; }

@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 1023px) {
  .diag-col,
  .climate-card,
  .action-card {
    grid-column: 1 / -1;
  }
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
.center-state { text-align: center; padding: 3rem 1rem; color: #64748b; }
.center-state.error { color: #b91c1c; }

.kpi-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  text-align: left;
  padding: 1rem 1.05rem 0.95rem;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
}
.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}
.kpi-tone-green { background: rgba(26, 71, 49, 0.1); color: #1A4731; }
.kpi-tone-gold { background: rgba(212, 175, 55, 0.16); color: #a3831f; }
.kpi-tone-slate { background: rgba(100, 116, 139, 0.12); color: #475569; }
.kpi-tone-danger { background: rgba(220, 38, 38, 0.1); color: #b91c1c; }
.kpi-value {
  margin: 0;
  font-size: clamp(1.45rem, 2.4vw, 1.95rem);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.05;
}
.kpi-value small { font-size: 0.78rem; font-weight: 700; color: #64748b; }
.kpi-label {
  margin: 0.28rem 0 0;
  font-size: 0.76rem;
  font-weight: 700;
  color: #64748b;
}
.kpi-sub, .kpi-hint {
  margin: 0.28rem 0 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1A4731;
}
.kpi-hint { color: #64748b; font-weight: 600; }
.kpi-photo-link {
  color: #c2410c;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.micro-bar {
  margin-top: 0.5rem;
  height: 6px;
  border-radius: 99px;
  background: #e2e8f0;
  overflow: hidden;
}
.micro-bar span {
  display: block;
  height: 100%;
  background: #1A4731;
  border-radius: 99px;
}

.panel-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  padding: 0.9rem 1rem 1rem;
}
.panel-head { margin-bottom: 0.65rem; }
.panel-head h2 {
  margin: 0;
  color: #1A4731;
  font-weight: 800;
  font-size: 0.98rem;
}
.panel-head p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-weight: 600;
  font-size: 0.75rem;
}

.diag-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  min-width: 0;
  height: 100%;
  align-items: stretch;
}
.diag-col .panel-card {
  height: 100%;
}
.climate-card {
  align-self: start;
  height: auto;
}
@media (min-width: 900px) {
  .diag-col { grid-template-columns: 1fr 1fr; }
}

.chart-box { height: 220px; position: relative; }
.chart-box.tall { height: 240px; }
.stage-legend {
  margin: 0.45rem 0 0;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}
.empty-inline { margin: 0.4rem 0 0; font-size: 0.85rem; color: #64748b; }

.climate-now {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0 12px;
  border-bottom: 1px solid #e8eeea;
}
.wx-icon { font-size: 2.6rem; color: #D4AF37; flex-shrink: 0; }
.temp-readout {
  display: block;
  font-size: clamp(1.9rem, 3vw, 2.4rem);
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
}
.wx-status { display: block; font-size: 0.9rem; font-weight: 750; color: #475569; }
.wx-wind { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-top: 0.15rem; }

.soil-indicator {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid #E2E8F0;
}
.soil-indicator.good { background: #ecfdf5; border-color: #a7f3d0; }
.soil-indicator.moderate { background: #fffbeb; border-color: #fde68a; }
.soil-indicator.low { background: #fef2f2; border-color: #fecaca; }
.soil-indicator.neutral { background: #f8fafc; }
.soil-label { color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.68rem; }
.soil-value { color: #0f172a; font-weight: 800; }
.soil-badge {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(26, 71, 49, 0.1);
  color: #1A4731;
}

.hour-caption {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #334155;
}
.hour-pills {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}
.hour-pill {
  min-width: 108px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 0.5rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  background: #f8fafc;
}
.hour-pill.safe { border-color: #bbf7d0; background: #f0fdf4; }
.hour-pill.warn { border-color: #fdba74; background: #fff7ed; }
.hour-pill.flood { border-color: #93c5fd; background: #eff6ff; }
.hour-time { font-size: 0.72rem; font-weight: 800; color: #1A4731; }
.hour-temp { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
.hour-rain, .hour-wind { font-size: 0.68rem; font-weight: 700; color: #475569; }
.hour-flag { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; }

.wx-skeleton { display: flex; flex-direction: column; gap: 0.55rem; padding: 0.25rem 0; }
.wx-empty {
  text-align: center;
  padding: 1.4rem 0.5rem 0.6rem;
  color: #64748b;
}
.wx-empty-icon { font-size: 2.4rem; color: #94a3b8; }
.wx-empty strong { display: block; color: #334155; margin: 0.35rem 0 0.2rem; }
.wx-empty p { margin: 0; font-size: 0.82rem; line-height: 1.4; }

.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  background: #f8fafc;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 12px 14px;
}
.alert-row.empty { background: #fff; }
.alert-copy {
  margin: 0;
  flex: 1 1 220px;
  font-size: 0.9rem;
  font-weight: 650;
  color: #1e293b;
  line-height: 1.4;
}
.sev-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  background: #e2e8f0;
  color: #334155;
}
.sev-badge.critical, .sev-badge.pest { background: #fef2f2; color: #b91c1c; }
.sev-badge.warning, .sev-badge.calamity { background: #fff7ed; color: #c2410c; }
.sev-badge.weather, .sev-badge.info { background: #eff6ff; color: #1d4ed8; }
.sev-badge.planting { background: #ecfdf5; color: #047857; }
.action-btn {
  --border-color: #1A4731;
  --color: #1A4731;
  --padding-start: 12px;
  --padding-end: 12px;
  text-transform: none;
  font-weight: 750;
  font-size: 0.78rem;
  min-height: 34px;
  margin: 0;
}
.copy-btn {
  --background: #1A4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 0.75rem;
}
.sms-hint {
  margin: 0 0 0.75rem;
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.4;
}

@media (max-width: 639px) {
  .soil-indicator { grid-template-columns: 1fr auto; }
  .soil-badge { grid-column: 1 / -1; justify-self: start; }
  .action-btn { width: 100%; }
}
</style>
