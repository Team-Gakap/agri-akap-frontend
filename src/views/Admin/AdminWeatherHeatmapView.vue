<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Climate Monitor</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" :disabled="loading" @click="loadData">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg ion-padding">
      <div class="wrap">
        <header class="page-head">
          <div>
            <h2>Climate Monitor</h2>
            <p>
              Climate view of Echague barangays —
              <span v-if="forecastDate">{{ forecastDate }}</span>
              <span v-if="usingMock"> · sample data</span>
            </p>
          </div>
          <div class="legend">
            <span class="leg safe">Safe</span>
            <span class="leg watch">Watch</span>
            <span class="leg warn">Warning</span>
            <span class="leg danger">Critical</span>
          </div>
        </header>

        <ion-segment
          class="metric-segment"
          :value="activeMetric"
          scrollable
          @ionChange="onMetricChange"
        >
          <ion-segment-button value="precipitation_probability">
            <ion-label>Precipitation Risk (%)</ion-label>
          </ion-segment-button>
          <ion-segment-button value="soil_moisture_28cm">
            <ion-label>Deep Soil Moisture</ion-label>
          </ion-segment-button>
          <ion-segment-button value="wind_speed_10m">
            <ion-label>Wind Speed (km/h)</ion-label>
          </ion-segment-button>
          <ion-segment-button value="evapotranspiration">
            <ion-label>Crop Water Demand / ET0</ion-label>
          </ion-segment-button>
        </ion-segment>

        <p class="metric-hint">{{ metricHint }}</p>

        <div v-if="loading" class="loading-box">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading barangay climate grid…</p>
        </div>

        <div v-else class="layout">
          <section class="heatmap-panel">
            <div class="heatmap-grid">
              <button
                v-for="row in barangays"
                :key="row.barangay_name"
                type="button"
                class="heat-block"
                :class="[colorClass(row), { selected: selectedBarangay === row.barangay_name }]"
                @click="selectedBarangay = row.barangay_name"
              >
                <span class="block-name">{{ shortName(row.barangay_name) }}</span>
                <span class="block-value">{{ formatValue(metricValue(row)) }}{{ metricSuffix }}</span>
              </button>
            </div>
          </section>

          <aside class="insights-panel">
            <h3>Critical Alerts &amp; Actions</h3>
            <p class="insights-sub">
              {{ criticalBarangays.length }} barangay(s) above threshold for
              <strong>{{ metricLabel }}</strong>
            </p>

            <div v-if="!criticalBarangays.length" class="empty-alerts">
              No critical zones for this metric. Switch metrics or refresh after
              <code>weather:fetch</code>.
            </div>

            <ul v-else class="alert-list">
              <li v-for="row in criticalBarangays" :key="row.barangay_name">
                <div class="alert-copy">
                  <strong>{{ row.barangay_name }}</strong>
                  <span>{{ formatValue(metricValue(row)) }}{{ metricSuffix }} · {{ alertReason(row) }}</span>
                </div>
                <ion-button
                  size="small"
                  class="sms-btn"
                  :disabled="sendingBarangay === row.barangay_name"
                  @click="triggerTargetedSms(row)"
                >
                  {{ sendingBarangay === row.barangay_name ? 'Sending…' : 'Trigger Targeted SMS Advisory' }}
                </ion-button>
              </li>
            </ul>

            <div v-if="selectedRow" class="selected-card">
              <h4>{{ selectedRow.barangay_name }}</h4>
              <dl>
                <div><dt>Rain</dt><dd>{{ selectedRow.precipitation_probability ?? '—' }}%</dd></div>
                <div><dt>Root moisture</dt><dd>{{ formatValue(selectedRow.soil_moisture_28cm) }}</dd></div>
                <div><dt>Wind</dt><dd>{{ formatValue(selectedRow.wind_speed_10m) }} km/h</dd></div>
                <div><dt>ET0</dt><dd>{{ formatValue(selectedRow.evapotranspiration) }} mm</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
  toastController,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';

type MetricKey =
  | 'precipitation_probability'
  | 'soil_moisture_28cm'
  | 'wind_speed_10m'
  | 'evapotranspiration';

interface BarangayWeather {
  barangay_name: string;
  forecast_date?: string;
  precipitation_probability: number | null;
  soil_moisture_28cm: number | null;
  wind_speed_10m: number | null;
  evapotranspiration: number | null;
  temperature_max?: number | null;
  status?: string;
}

const loading = ref(true);
const usingMock = ref(false);
const forecastDate = ref('');
const barangays = ref<BarangayWeather[]>([]);
const activeMetric = ref<MetricKey>('precipitation_probability');
const selectedBarangay = ref<string | null>(null);
const sendingBarangay = ref<string | null>(null);

const METRIC_META: Record<MetricKey, { label: string; suffix: string; hint: string; critical: (v: number) => boolean; reason: string }> = {
  precipitation_probability: {
    label: 'Precipitation Risk',
    suffix: '%',
    hint: 'Flood / lodging risk. Critical when rain chance ≥ 80%.',
    critical: (v) => v >= 80,
    reason: 'Heavy rain risk',
  },
  soil_moisture_28cm: {
    label: 'Deep Soil Moisture',
    suffix: '',
    hint: 'Root-zone drought proxy (7–28 cm). Critical when volumetric moisture ≤ 0.18.',
    critical: (v) => v > 0 && v <= 0.18,
    reason: 'Root-zone drought stress',
  },
  wind_speed_10m: {
    label: 'Wind Speed',
    suffix: ' km/h',
    hint: 'Spray-drift risk. Critical when wind > 15 km/h.',
    critical: (v) => v > 15,
    reason: 'Avoid pesticide spraying (drift)',
  },
  evapotranspiration: {
    label: 'Crop Water Demand (ET0)',
    suffix: ' mm',
    hint: 'FAO reference ET0. Critical when daily demand ≥ 5.5 mm.',
    critical: (v) => v >= 5.5,
    reason: 'High crop water demand',
  },
};

const metricLabel = computed(() => METRIC_META[activeMetric.value].label);
const metricSuffix = computed(() => METRIC_META[activeMetric.value].suffix);
const metricHint = computed(() => METRIC_META[activeMetric.value].hint);

const selectedRow = computed(() =>
  barangays.value.find((b) => b.barangay_name === selectedBarangay.value) ?? null,
);

const criticalBarangays = computed(() => {
  const meta = METRIC_META[activeMetric.value];
  return barangays.value
    .filter((row) => {
      const v = metricValue(row);
      return v != null && meta.critical(v);
    })
    .sort((a, b) => (metricValue(b) ?? 0) - (metricValue(a) ?? 0));
});

function metricValue(row: BarangayWeather): number | null {
  const raw = row[activeMetric.value];
  if (raw == null || Number.isNaN(Number(raw))) return null;
  return Number(raw);
}

function formatValue(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  if (activeMetric.value === 'precipitation_probability') return String(Math.round(n));
  if (activeMetric.value === 'soil_moisture_28cm') return n.toFixed(2);
  return n.toFixed(1);
}

function shortName(name: string): string {
  return name.replace(' (Poblacion)', '').replace(' (formerly Atelan)', '');
}

/**
 * Color scale: safe → watch → warn → danger based on active metric.
 * Soil moisture is inverted (low = drought danger).
 */
function colorClass(row: BarangayWeather): string {
  const v = metricValue(row);
  if (v == null) return 'lvl-unknown';

  if (activeMetric.value === 'precipitation_probability') {
    if (v >= 80) return 'lvl-danger';
    if (v >= 60) return 'lvl-warn';
    if (v >= 35) return 'lvl-watch';
    return 'lvl-safe';
  }

  if (activeMetric.value === 'soil_moisture_28cm') {
    if (v <= 0.15) return 'lvl-danger';
    if (v <= 0.18) return 'lvl-warn';
    if (v <= 0.25) return 'lvl-watch';
    return 'lvl-safe';
  }

  if (activeMetric.value === 'wind_speed_10m') {
    if (v > 20) return 'lvl-danger';
    if (v > 15) return 'lvl-warn';
    if (v > 10) return 'lvl-watch';
    return 'lvl-safe';
  }

  // ET0
  if (v >= 6.5) return 'lvl-danger';
  if (v >= 5.5) return 'lvl-warn';
  if (v >= 4) return 'lvl-watch';
  return 'lvl-safe';
}

function alertReason(row: BarangayWeather): string {
  return METRIC_META[activeMetric.value].reason;
}

function onMetricChange(e: CustomEvent) {
  const val = e.detail.value as MetricKey;
  if (val) activeMetric.value = val;
}

function buildMockBarangays(): BarangayWeather[] {
  const samples: Array<[string, number, number, number, number]> = [
    ['San Fabian', 88, 0.22, 8, 4.2],
    ['San Salvador', 22, 0.14, 6, 5.8],
    ['Soyung (Poblacion)', 55, 0.27, 12, 3.9],
    ['Ipil', 72, 0.19, 16, 4.8],
    ['Annafunan', 91, 0.31, 9, 3.5],
    ['Garit Norte', 40, 0.16, 18, 5.6],
    ['Garit Sur', 35, 0.21, 11, 4.1],
    ['Malibago', 65, 0.17, 22, 6.1],
    ['Narra', 18, 0.12, 7, 6.8],
    ['Pag-asa', 48, 0.24, 14, 4.5],
    ['Salay', 77, 0.20, 10, 5.1],
    ['Santa Monica', 30, 0.28, 5, 3.2],
    ['Sinabbaran', 82, 0.18, 19, 5.9],
    ['Villa Campo', 25, 0.15, 13, 5.4],
    ['Cabugao (Poblacion)', 60, 0.26, 17, 4.0],
    ['Dammang East', 70, 0.13, 21, 6.4],
  ];

  const today = new Date().toISOString().slice(0, 10);
  return samples.map(([name, rain, soil, wind, et0]) => ({
    barangay_name: name,
    forecast_date: today,
    precipitation_probability: rain,
    soil_moisture_28cm: soil,
    wind_speed_10m: wind,
    evapotranspiration: et0,
  }));
}

async function loadData() {
  loading.value = true;
  usingMock.value = false;
  try {
    const res = await apiClient.get('/weather/heatmap');
    const payload = res.data?.data;
    const rows = (payload?.barangays ?? []) as BarangayWeather[];
    forecastDate.value = payload?.forecast_date ?? '';
    if (rows.length) {
      barangays.value = rows;
    } else {
      barangays.value = buildMockBarangays();
      usingMock.value = true;
      forecastDate.value = barangays.value[0]?.forecast_date ?? '';
    }
  } catch {
    barangays.value = buildMockBarangays();
    usingMock.value = true;
    forecastDate.value = barangays.value[0]?.forecast_date ?? '';
  } finally {
    if (!selectedBarangay.value && barangays.value.length) {
      selectedBarangay.value = barangays.value[0].barangay_name;
    }
    loading.value = false;
  }
}

async function triggerTargetedSms(row: BarangayWeather) {
  const meta = METRIC_META[activeMetric.value];
  const value = formatValue(metricValue(row));
  const message =
    `MAO Echague Advisory (${row.barangay_name}): ${meta.reason} detected (${meta.label}: ${value}${meta.suffix.trim()}). Take precautions for crops/livestock. Stay safe!`
      .slice(0, 160);

  sendingBarangay.value = row.barangay_name;
  try {
    const res = await apiClient.post('/broadcasts/send', {
      message_body: message,
      target_barangay: row.barangay_name,
      target_commodity: 'All',
    });
    const t = await toastController.create({
      message: res.data?.message ?? `Advisory queued for ${row.barangay_name}.`,
      duration: 2800,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch (err: any) {
    const t = await toastController.create({
      message: err.response?.data?.message ?? `Failed to SMS ${row.barangay_name}.`,
      duration: 2800,
      color: 'danger',
      position: 'top',
    });
    await t.present();
  } finally {
    sendingBarangay.value = null;
  }
}

onMounted(loadData);
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrap { max-width: 1200px; margin: 0 auto; padding-bottom: 2rem; }

.page-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.page-head h2 {
  margin: 0 0 0.25rem;
  color: #1a4731;
  font-weight: 800;
  font-size: 1.35rem;
}

.page-head p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.leg {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  color: #fff;
}

.leg.safe { background: #163665; }
.leg.watch { background: #ca8a04; }
.leg.warn { background: #ea580c; }
.leg.danger { background: #b91c1c; }

.metric-segment {
  --background: #e8f0eb;
  margin-bottom: 0.5rem;
}

.metric-segment ion-segment-button {
  --color: #1a4731;
  --color-checked: #44b319;
  --indicator-color: #000000;
  min-width: 140px;
  font-size: 0.72rem;
  font-weight: 700;
}

.metric-hint {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: #48515e;
}

.loading-box {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
    align-items: start;
  }
}

.heatmap-panel,
.insights-panel {
  background: #fff;
  border: 1px solid #d1e0d6;
  border-radius: 14px;
  padding: 0.85rem;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.06);
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.55rem;
}

.heat-block {
  border: 2px solid transparent;
  border-radius: 12px;
  min-height: 84px;
  padding: 0.55rem 0.45rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  color: #fff;
  font: inherit;
}

.heat-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.heat-block.selected {
  border-color: #d4af37;
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.45);
}

.block-name {
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.2;
}

.block-value {
  font-size: 1.05rem;
  font-weight: 800;
  margin-top: 0.35rem;
}

.lvl-safe { background: linear-gradient(145deg, #163665, #163665); }
.lvl-watch { background: linear-gradient(145deg, #a16207, #ca8a04); }
.lvl-warn { background: linear-gradient(145deg, #c2410c, #ea580c); }
.lvl-danger { background: linear-gradient(145deg, #991b1b, #dc2626); }
.lvl-unknown { background: #64748b; }

.insights-panel h3 {
  margin: 0 0 0.25rem;
  color: #1a4731;
  font-weight: 800;
  font-size: 1.05rem;
}

.insights-sub {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  color: #64748b;
}

.empty-alerts {
  background: #f0f7f2;
  border: 1px dashed #c5d9cc;
  border-radius: 10px;
  padding: 0.85rem;
  font-size: 0.85rem;
  color: #475569;
}

.empty-alerts code {
  font-size: 0.78rem;
  color: #1a4731;
}

.alert-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.alert-list li {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 4px solid #d4af37;
  border-radius: 10px;
  padding: 0.65rem 0.7rem;
}

.alert-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.45rem;
}

.alert-copy strong {
  color: #1a4731;
  font-size: 0.92rem;
}

.alert-copy span {
  font-size: 0.78rem;
  color: #64748b;
}

.sms-btn {
  --background: #1a4731;
  --color: #fff;
  text-transform: none;
  font-weight: 700;
  font-size: 0.75rem;
  margin: 0;
}

.selected-card {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #e2e8f0;
}

.selected-card h4 {
  margin: 0 0 0.5rem;
  color: #1a4731;
  font-weight: 800;
}

.selected-card dl {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.selected-card div {
  background: #f0f7f2;
  border-radius: 8px;
  padding: 0.4rem 0.5rem;
}

.selected-card dt {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #64748b;
}

.selected-card dd {
  margin: 0.1rem 0 0;
  font-weight: 800;
  color: #1a4731;
  font-size: 0.9rem;
}
</style>
