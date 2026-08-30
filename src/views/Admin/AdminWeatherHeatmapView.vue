<template>
  <ion-page>
    <AppHeader />

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

        <div class="toolbar-row">
          <ion-segment
            class="metric-segment"
            :value="activeMetric"
            scrollable
            @ionChange="onMetricChange"
          >
            <ion-segment-button value="precipitation_probability">
              <ion-label>Precipitation</ion-label>
            </ion-segment-button>
            <ion-segment-button value="soil_moisture_28cm">
              <ion-label>Soil Moisture</ion-label>
            </ion-segment-button>
            <ion-segment-button value="wind_speed_10m">
              <ion-label>Wind Speed</ion-label>
            </ion-segment-button>
            <ion-segment-button value="evapotranspiration">
              <ion-label>Water Demand</ion-label>
            </ion-segment-button>
          </ion-segment>
          <div class="view-toggle" role="group" aria-label="View mode">
            <button type="button" :class="{ on: viewMode === 'map' }" @click="setViewMode('map')">Map</button>
            <button type="button" :class="{ on: viewMode === 'table' }" @click="setViewMode('table')">Table</button>
          </div>
        </div>

        <div class="hint-row">
          <p class="metric-hint">{{ metricHint }}</p>
          <div class="exceptions-toggle" role="group" aria-label="Barangay scope">
            <button type="button" :class="{ on: !exceptionsOnly }" @click="exceptionsOnly = false">All</button>
            <button type="button" :class="{ on: exceptionsOnly }" @click="exceptionsOnly = true">
              Exceptions{{ exceptionsCount ? ` (${exceptionsCount})` : '' }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="loading-box">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading barangay climate data…</p>
        </div>

        <div v-else class="layout">
          <section class="heatmap-panel">
            <div class="panel-kicker-row">
              <p class="panel-kicker">Barangay risk matrix · {{ metricLabel }}</p>
              <div
                v-show="viewMode === 'map'"
                class="basemap-switch"
                role="group"
                aria-label="Basemap"
              >
                <button type="button" :class="{ on: basemap === 'satellite' }" @click="setBasemap('satellite')">
                  Satellite
                </button>
                <button type="button" :class="{ on: basemap === 'terrain' }" @click="setBasemap('terrain')">
                  Terrain
                </button>
              </div>
            </div>

            <div v-show="viewMode === 'map'" class="map-shell">
              <div v-if="mapLoadError" class="map-error">
                <p><strong>Map unavailable.</strong> {{ mapLoadError }}</p>
              </div>
              <template v-else>
                <div v-if="geoLoading" class="map-loading"><ion-spinner name="crescent"></ion-spinner></div>
                <div ref="mapEl" class="map-canvas"></div>
                <div class="map-legend">
                  <span class="leg safe">Safe</span>
                  <span class="leg watch">Watch</span>
                  <span class="leg warn">Warning</span>
                  <span class="leg danger">Critical</span>
                  <span class="leg nodata">No data</span>
                </div>
              </template>
            </div>

            <div v-show="viewMode === 'table'" class="table-wrap">
              <table class="risk-table">
                <thead>
                  <tr>
                    <th><button type="button" @click="sortBy('name')">Barangay</button></th>
                    <th><button type="button" @click="sortBy('precipitation_probability')">Rain %</button></th>
                    <th><button type="button" @click="sortBy('soil_moisture_28cm')">Soil</button></th>
                    <th><button type="button" @click="sortBy('wind_speed_10m')">Wind</button></th>
                    <th><button type="button" @click="sortBy('evapotranspiration')">ET0</button></th>
                    <th><button type="button" @click="sortBy('level')">Status</button></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in sortedRows"
                    :key="row.barangay_name"
                    :class="{ selected: selectedBarangay === row.barangay_name }"
                    @click="selectedBarangay = row.barangay_name"
                  >
                    <td class="name-cell">{{ shortName(row.barangay_name) }}</td>
                    <td>{{ formatValue(row.precipitation_probability, 'precipitation_probability') }}%</td>
                    <td>{{ formatValue(row.soil_moisture_28cm, 'soil_moisture_28cm') }}</td>
                    <td>{{ formatValue(row.wind_speed_10m, 'wind_speed_10m') }} km/h</td>
                    <td>{{ formatValue(row.evapotranspiration, 'evapotranspiration') }} mm</td>
                    <td><span class="status-pill" :class="levelClass(row)">{{ levelLabel(levelFor(row)) }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <aside class="insights-panel">
            <h3>Critical Advisories</h3>
            <p class="insights-sub">
              {{ criticalBarangays.length }} barangay(s) above threshold for
              <strong>{{ metricLabel }}</strong>
            </p>

            <button
              v-if="criticalBarangays.length"
              type="button"
              class="batch-btn"
              :disabled="sendingAll"
              @click="broadcastAllCritical"
            >
              {{ sendingAll ? 'Sending…' : `Broadcast Alert to All ${criticalBarangays.length} Areas` }}
            </button>
            <button
              v-if="criticalBarangays.length"
              type="button"
              class="composer-link"
              @click="openComposer()"
            >
              Open in Broadcast Center
            </button>

            <div v-if="!criticalBarangays.length" class="empty-alerts">
              No barangays above threshold for this metric.
            </div>

            <ul v-else class="alert-list">
              <li v-for="row in criticalBarangays" :key="row.barangay_name" :class="levelClass(row)">
                <button type="button" class="alert-main" @click="selectedBarangay = row.barangay_name">
                  <strong>{{ shortName(row.barangay_name) }}</strong>
                  <span>{{ formatValue(metricValue(row)) }}{{ metricSuffix }} · {{ alertReason(row) }}</span>
                </button>
                <button
                  type="button"
                  class="quick-sms"
                  :disabled="sendingBarangay === row.barangay_name"
                  @click="triggerTargetedSms(row)"
                >
                  {{ sendingBarangay === row.barangay_name ? '…' : 'SMS' }}
                </button>
              </li>
            </ul>

            <div v-if="selectedRow" class="selected-card">
              <h4>Selected: {{ selectedRow.barangay_name }}</h4>
              <p v-if="selectedPin(selectedRow)" class="selected-pin">{{ selectedPin(selectedRow) }}</p>
              <dl>
                <div>
                  <dt>Rain</dt>
                  <dd>{{ selectedRow.precipitation_probability ?? '—' }}%</dd>
                  <span class="qual">{{ rainQual(selectedRow) }}</span>
                  <div class="meter"><i :style="{ width: barPct('precipitation_probability', selectedRow.precipitation_probability) + '%' }"></i></div>
                </div>
                <div>
                  <dt>Root moisture</dt>
                  <dd>{{ formatValue(selectedRow.soil_moisture_28cm, 'soil_moisture_28cm') }} m³/m³</dd>
                  <span class="qual">{{ soilQual(selectedRow) }}</span>
                  <div class="meter"><i :style="{ width: barPct('soil_moisture_28cm', selectedRow.soil_moisture_28cm) + '%' }"></i></div>
                </div>
                <div>
                  <dt>Wind</dt>
                  <dd>{{ formatValue(selectedRow.wind_speed_10m, 'wind_speed_10m') }} km/h</dd>
                  <span class="qual">{{ windQual(selectedRow) }}</span>
                  <div class="meter"><i :style="{ width: barPct('wind_speed_10m', selectedRow.wind_speed_10m) + '%' }"></i></div>
                </div>
                <div>
                  <dt>ET0</dt>
                  <dd>{{ formatValue(selectedRow.evapotranspiration, 'evapotranspiration') }} mm/day</dd>
                  <span class="qual">{{ et0Qual(selectedRow) }}</span>
                  <div class="meter"><i :style="{ width: barPct('evapotranspiration', selectedRow.evapotranspiration) + '%' }"></i></div>
                </div>
              </dl>
              <div class="advice-box">{{ fieldAdvice(selectedRow) }}</div>
            </div>
          </aside>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import type { FeatureCollection, Geometry } from 'geojson';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import { echagueMapOptions, loadGoogleMaps } from '@/utils/googleMaps';
import { findRowForGeoName, indexByOfficialName, toOfficialBarangayName } from '@/utils/echagueGeoName';

type MetricKey =
  | 'precipitation_probability'
  | 'soil_moisture_28cm'
  | 'wind_speed_10m'
  | 'evapotranspiration';

type Level = 'safe' | 'watch' | 'warn' | 'danger';

interface BarangayWeather {
  barangay_name: string;
  forecast_date?: string;
  precipitation_probability: number | null;
  soil_moisture_28cm: number | null;
  wind_speed_10m: number | null;
  evapotranspiration: number | null;
  temperature_max?: number | null;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

const router = useRouter();
const loading = ref(true);
const usingMock = ref(false);
const forecastDate = ref('');
const barangays = ref<BarangayWeather[]>([]);
const activeMetric = ref<MetricKey>('precipitation_probability');
const selectedBarangay = ref<string | null>(null);
const sendingBarangay = ref<string | null>(null);
const sendingAll = ref(false);
const viewMode = ref<'map' | 'table'>('map');
type Basemap = 'satellite' | 'terrain';
const basemap = ref<Basemap>('terrain');
const exceptionsOnly = ref(false);
const sortKey = ref<MetricKey | 'name' | 'level'>('level');
const sortDir = ref<'asc' | 'desc'>('desc');

const mapEl = ref<HTMLDivElement | null>(null);
const geoLoading = ref(true);
const mapLoadError = ref('');
let map: google.maps.Map | null = null;
let geoJsonLoaded = false;
let infoWindow: google.maps.InfoWindow | null = null;
let echagueGeoJson: FeatureCollection<Geometry, { adm4_name: string; adm4_pcode: string }> | null = null;

const METRIC_META: Record<MetricKey, { label: string; suffix: string; hint: string; chip: string; critical: (v: number) => boolean; reason: string }> = {
  precipitation_probability: {
    label: 'Precipitation Risk',
    suffix: '%',
    chip: 'Rain',
    hint: 'Flood / lodging risk. Critical when rain chance ≥ 80%.',
    critical: (v) => v >= 80,
    reason: 'Heavy rain risk',
  },
  soil_moisture_28cm: {
    label: 'Deep Soil Moisture',
    suffix: '',
    chip: 'Soil',
    hint: 'Root-zone drought proxy (7–28 cm). Critical when volumetric moisture ≤ 0.18.',
    critical: (v) => v > 0 && v <= 0.18,
    reason: 'Root-zone drought stress',
  },
  wind_speed_10m: {
    label: 'Wind Speed',
    suffix: ' km/h',
    chip: 'Wind',
    hint: 'Spray-drift risk. Critical when wind > 15 km/h.',
    critical: (v) => v > 15,
    reason: 'Avoid pesticide spraying (drift)',
  },
  evapotranspiration: {
    label: 'Crop Water Demand (ET0)',
    suffix: ' mm',
    chip: 'ET0',
    hint: 'FAO reference ET0. Critical when daily demand ≥ 5.5 mm.',
    critical: (v) => v >= 5.5,
    reason: 'High crop water demand',
  },
};

const FILL_COLORS: Record<Level, string> = {
  safe: '#94a3b8',
  watch: '#facc15',
  warn: '#fb923c',
  danger: '#ef4444',
};
const NODATA_FILL = '#e2e8f0';

const metricLabel = computed(() => METRIC_META[activeMetric.value].label);
const metricSuffix = computed(() => METRIC_META[activeMetric.value].suffix);
const metricHint = computed(() => METRIC_META[activeMetric.value].hint);

const selectedRow = computed(() =>
  barangays.value.find((b) => b.barangay_name === selectedBarangay.value) ?? null,
);

function selectedPin(row: BarangayWeather): string | null {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

const criticalBarangays = computed(() => {
  const meta = METRIC_META[activeMetric.value];
  return barangays.value
    .filter((row) => {
      const v = metricValue(row);
      return v != null && meta.critical(v);
    })
    .sort((a, b) => riskRank(b, activeMetric.value) - riskRank(a, activeMetric.value));
});

/** Watch + Warning + Critical — everything above "Safe" for the active metric. */
const exceptionsCount = computed(
  () => barangays.value.filter((row) => levelFor(row) !== 'safe').length,
);

const sortedRows = computed(() => {
  const rows = [...barangays.value];
  const dir = sortDir.value === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    if (sortKey.value === 'name') {
      return dir * shortName(a.barangay_name).localeCompare(shortName(b.barangay_name));
    }
    if (sortKey.value === 'level') {
      return dir * (levelRank(levelFor(a)) - levelRank(levelFor(b)));
    }
    return dir * (riskRank(a, sortKey.value) - riskRank(b, sortKey.value));
  });
  return rows;
});

function metricValue(row: BarangayWeather, key: MetricKey = activeMetric.value): number | null {
  const raw = row[key];
  if (raw == null || Number.isNaN(Number(raw))) return null;
  return Number(raw);
}

function formatValue(v: number | null | undefined, key: MetricKey = activeMetric.value): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  if (key === 'precipitation_probability') return String(Math.round(n));
  if (key === 'soil_moisture_28cm') return n.toFixed(2);
  return n.toFixed(1);
}

function shortName(name: string): string {
  return name.replace(' (Poblacion)', '').replace(' (formerly Atelan)', '');
}

function levelFor(row: BarangayWeather, key: MetricKey = activeMetric.value): Level {
  const v = metricValue(row, key);
  if (v == null) return 'safe';

  if (key === 'precipitation_probability') {
    if (v >= 80) return 'danger';
    if (v >= 60) return 'warn';
    if (v >= 35) return 'watch';
    return 'safe';
  }
  if (key === 'soil_moisture_28cm') {
    if (v <= 0.15) return 'danger';
    if (v <= 0.18) return 'warn';
    if (v <= 0.25) return 'watch';
    return 'safe';
  }
  if (key === 'wind_speed_10m') {
    if (v > 20) return 'danger';
    if (v > 15) return 'warn';
    if (v > 10) return 'watch';
    return 'safe';
  }
  if (v >= 6.5) return 'danger';
  if (v >= 5.5) return 'warn';
  if (v >= 4) return 'watch';
  return 'safe';
}

function levelClass(row: BarangayWeather, key: MetricKey = activeMetric.value): string {
  return `lvl-${levelFor(row, key)}`;
}

function levelLabel(level: Level): string {
  if (level === 'danger') return 'Critical';
  if (level === 'warn') return 'Warning';
  if (level === 'watch') return 'Watch';
  return 'Safe';
}

function levelRank(level: Level): number {
  if (level === 'danger') return 3;
  if (level === 'warn') return 2;
  if (level === 'watch') return 1;
  return 0;
}

/** Higher = more severe for sorting. Soil moisture is inverted. */
function riskRank(row: BarangayWeather, key: MetricKey): number {
  const v = metricValue(row, key);
  if (v == null) return -Infinity;
  return key === 'soil_moisture_28cm' ? -v : v;
}

function alertReason(row: BarangayWeather): string {
  return METRIC_META[activeMetric.value].reason;
}

function rainQual(row: BarangayWeather): string {
  const v = row.precipitation_probability ?? 0;
  if (v >= 80) return 'High rain risk';
  if (v >= 60) return 'Elevated rain risk';
  if (v >= 35) return 'Watch rainfall';
  return 'Low rain risk';
}

function soilQual(row: BarangayWeather): string {
  const v = row.soil_moisture_28cm ?? 0;
  if (v <= 0.15) return 'Severe drought stress';
  if (v <= 0.18) return 'Drought stress';
  if (v <= 0.25) return 'Watch moisture';
  return 'Optimal';
}

function windQual(row: BarangayWeather): string {
  const v = row.wind_speed_10m ?? 0;
  if (v > 15) return 'Avoid spraying';
  if (v > 10) return 'Spray with caution';
  return 'Safe for spraying';
}

function et0Qual(row: BarangayWeather): string {
  const v = row.evapotranspiration ?? 0;
  if (v >= 5.5) return 'High crop water demand';
  if (v >= 4) return 'Moderate demand';
  return 'Low demand';
}

function barPct(key: MetricKey, raw: number | null | undefined): number {
  const v = Number(raw ?? 0);
  if (key === 'precipitation_probability') return Math.max(0, Math.min(100, v));
  if (key === 'soil_moisture_28cm') return Math.max(0, Math.min(100, (v / 0.35) * 100));
  if (key === 'wind_speed_10m') return Math.max(0, Math.min(100, (v / 25) * 100));
  return Math.max(0, Math.min(100, (v / 8) * 100));
}

function fieldAdvice(row: BarangayWeather): string {
  const issues: string[] = [];
  const rain = row.precipitation_probability ?? 0;
  const soil = row.soil_moisture_28cm ?? 0;
  const wind = row.wind_speed_10m ?? 0;
  const et0 = row.evapotranspiration ?? 0;
  if (rain >= 80) issues.push('heavy rain / lodging risk');
  if (soil > 0 && soil <= 0.18) issues.push('root-zone drought stress');
  if (wind > 15) issues.push('spray-drift risk — avoid pesticide spraying');
  if (et0 >= 5.5) issues.push('high crop water demand');
  if (!issues.length) {
    return 'Conditions suitable for field work. No immediate spray-drift or flood risk.';
  }
  return `Priority: ${issues.join('; ')}.`;
}

function onMetricChange(e: CustomEvent) {
  const val = e.detail.value as MetricKey;
  if (val) activeMetric.value = val;
}

function sortBy(key: MetricKey | 'name' | 'level') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
    return;
  }
  sortKey.value = key;
  sortDir.value = key === 'name' ? 'asc' : 'desc';
}

function advisoryMessage(row: BarangayWeather): string {
  const meta = METRIC_META[activeMetric.value];
  const value = formatValue(metricValue(row), activeMetric.value);
  return `MAO Echague Advisory (${row.barangay_name}): ${meta.reason} detected (${meta.label}: ${value}${meta.suffix.trim()}). Take precautions for crops/livestock. Stay safe!`;
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
  sendingBarangay.value = row.barangay_name;
  try {
    const res = await apiClient.post('/broadcasts/send', {
      message_body: advisoryMessage(row).slice(0, 459),
      target_barangay: row.barangay_name,
      target_commodity: 'All',
    });
    await toast.success(res.data?.message ?? `Advisory queued for ${row.barangay_name}.`);
  } catch (err: any) {
    await toast.error(err.response?.data?.message ?? `Failed to SMS ${row.barangay_name}.`);
  } finally {
    sendingBarangay.value = null;
  }
}

async function broadcastAllCritical() {
  const rows = criticalBarangays.value;
  if (!rows.length) return;
  const meta = METRIC_META[activeMetric.value];
  const names = rows.map((r) => r.barangay_name);
  const list = names.slice(0, 6).join(', ') + (names.length > 6 ? ` +${names.length - 6} more` : '');
  const message = `MAO Echague Advisory: ${meta.reason} in ${list}. ${meta.hint} Please take precautions. Stay safe!`.slice(0, 459);
  sendingAll.value = true;
  try {
    const res = await apiClient.post('/broadcasts/send', {
      message_body: message,
      target_barangays: names,
      target_commodity: 'All',
    });
    await toast.success(res.data?.message ?? `Advisory queued for ${names.length} barangays.`);
  } catch (err: any) {
    await toast.error(err.response?.data?.message ?? 'Failed to send batch advisory.');
  } finally {
    sendingAll.value = false;
  }
}

function openComposer(row?: BarangayWeather) {
  const targets = row ? [row] : criticalBarangays.value;
  const names = targets.map((r) => r.barangay_name);
  const meta = METRIC_META[activeMetric.value];
  const message = row
    ? advisoryMessage(row)
    : `MAO Echague Advisory: ${meta.reason} affecting ${names.length} barangay(s). ${meta.hint} Take precautions for crops and livestock. Stay safe!`;
  router.push({
    path: '/admin/broadcasts',
    query: {
      message: message.slice(0, 459),
      barangays: names.join('|'),
    },
  });
}

// ---------------------------------------------------------------------------
// Google Maps choropleth (Data layer)
// ---------------------------------------------------------------------------

const rowIndex = computed(() => indexByOfficialName(barangays.value));

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function rowForGeoName(geoName: string): BarangayWeather | undefined {
  return findRowForGeoName(geoName, rowIndex.value);
}

function officialNameForGeoName(geoName: string): string {
  const row = rowForGeoName(geoName);
  return row?.barangay_name ?? toOfficialBarangayName(geoName);
}

function tooltipHtml(row: BarangayWeather | undefined, geoName: string): string {
  const label = escapeHtml(row ? shortName(row.barangay_name) : geoName);
  if (!row) return `<div class="geo-tooltip"><strong>${label}</strong><br/><span class="tt-muted">No forecast data</span></div>`;
  const value = `${formatValue(metricValue(row))}${metricSuffix.value}`;
  return `<div class="geo-tooltip"><strong>${label}</strong><br/>${escapeHtml(metricLabel.value)}: <b>${escapeHtml(value)}</b></div>`;
}

function styleForRow(row: BarangayWeather | undefined, isSelected: boolean): google.maps.Data.StyleOptions {
  if (!row) {
    return {
      strokeColor: isSelected ? '#1a4731' : '#94a3b8',
      strokeWeight: isSelected ? 3 : 1,
      fillColor: NODATA_FILL,
      fillOpacity: 0.45,
      zIndex: isSelected ? 10 : 1,
      clickable: true,
    };
  }
  const level = levelFor(row);
  const dim = exceptionsOnly.value && level === 'safe';
  return {
    strokeColor: isSelected ? '#1a4731' : '#ffffff',
    strokeWeight: isSelected ? 3 : 1,
    fillColor: FILL_COLORS[level],
    fillOpacity: dim ? 0.14 : isSelected ? 0.85 : 0.68,
    zIndex: isSelected ? 10 : 1,
    clickable: true,
  };
}

function featureStyle(feature: google.maps.Data.Feature): google.maps.Data.StyleOptions {
  const geoName = (feature.getProperty('adm4_name') as string) ?? '';
  const officialName = officialNameForGeoName(geoName);
  const isSelected = selectedBarangay.value === officialName;
  return styleForRow(rowForGeoName(geoName), isSelected);
}

function refreshMapStyles() {
  map?.data.setStyle(featureStyle);
}

function showFeatureTooltip(feature: google.maps.Data.Feature, latLng: google.maps.LatLng | null) {
  if (!map || !infoWindow || !latLng) return;
  const geoName = (feature.getProperty('adm4_name') as string) ?? '';
  infoWindow.setContent(tooltipHtml(rowForGeoName(geoName), geoName));
  infoWindow.setPosition(latLng);
  infoWindow.open(map);
}

function hideFeatureTooltip() {
  infoWindow?.close();
}

function applyBasemap(mode: Basemap) {
  if (!map) return;
  map.setMapTypeId(mode === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.TERRAIN);
  map.setOptions({ styles: echagueMapOptions().styles });
}

function setBasemap(mode: Basemap) {
  basemap.value = mode;
  applyBasemap(mode);
}

async function initMap() {
  if (!mapEl.value || map) return;
  try {
    await loadGoogleMaps();
  } catch (err: any) {
    mapLoadError.value = err?.message ?? 'Failed to load Google Maps.';
    return;
  }
  map = new google.maps.Map(mapEl.value, echagueMapOptions({
    mapTypeId: google.maps.MapTypeId.TERRAIN,
    zoom: 12,
  }));
  infoWindow = new google.maps.InfoWindow({ disableAutoPan: true });

  map.data.addListener('click', (e: google.maps.Data.MouseEvent) => {
    const geoName = (e.feature.getProperty('adm4_name') as string) ?? '';
    selectedBarangay.value = officialNameForGeoName(geoName);
  });
  map.data.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
    map?.data.overrideStyle(e.feature, { strokeWeight: 2.5, strokeColor: '#1a4731' });
    showFeatureTooltip(e.feature, e.latLng);
  });
  map.data.addListener('mouseout', (e: google.maps.Data.MouseEvent) => {
    map?.data.revertStyle(e.feature);
    hideFeatureTooltip();
  });

  google.maps.event.trigger(map, 'resize');
}

async function loadGeoJsonFile(): Promise<void> {
  if (echagueGeoJson) return;
  const res = await fetch('/geo/echague-barangays.geojson');
  if (!res.ok) throw new Error(`Failed to fetch GeoJSON: ${res.status}`);
  echagueGeoJson = await res.json();
}

async function ensureGeoLayerReady() {
  if (!map) return;
  geoLoading.value = true;
  try {
    await loadGeoJsonFile();
    if (!geoJsonLoaded) {
      map.data.addGeoJson(echagueGeoJson as unknown as object);
      geoJsonLoaded = true;
      map.data.setStyle(featureStyle);
    } else {
      refreshMapStyles();
    }
  } catch {
    await toast.error('Failed to load barangay boundaries for the map.');
  } finally {
    geoLoading.value = false;
  }
}

function setViewMode(mode: 'map' | 'table') {
  viewMode.value = mode;
  if (mode === 'map' && map) {
    nextTick(() => map && google.maps.event.trigger(map, 'resize'));
  }
}

watch(activeMetric, () => refreshMapStyles());
watch(exceptionsOnly, () => refreshMapStyles());
watch(selectedBarangay, () => refreshMapStyles());
watch(barangays, () => refreshMapStyles());

onMounted(async () => {
  await loadData();
  await nextTick();
  await initMap();
  await ensureGeoLayerReady();
  window.addEventListener('akap:refresh', loadData);
});

onBeforeUnmount(() => {
  window.removeEventListener('akap:refresh', loadData);
  if (map) {
    google.maps.event.clearInstanceListeners(map.data);
    map.data.forEach((feature) => map?.data.remove(feature));
    map = null;
  }
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrap { max-width: 1240px; margin: 0 auto; padding-bottom: 2rem; }

.page-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.page-head h2 {
  margin: 0 0 0.25rem;
  color: #1a4731;
  font-weight: 800;
  font-size: 1.35rem;
}
.page-head p { margin: 0; color: #64748b; font-size: 0.9rem; }

.legend { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.leg {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
}
.leg.safe { background: #e2e8f0; color: #475569; }
.leg.watch { background: #fef3c7; color: #a16207; }
.leg.warn { background: #ffedd5; color: #c2410c; }
.leg.danger { background: #fee2e2; color: #dc2626; }
.leg.nodata { background: #f1f5f9; color: #94a3b8; }

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 0.45rem;
}
.metric-segment {
  --background: #e8f0eb;
  flex: 1;
  min-width: 240px;
}
.metric-segment ion-segment-button {
  --color: #1a4731;
  --color-checked: #1a4731;
  --indicator-color: #1a4731;
  min-width: 120px;
  font-size: 0.72rem;
  font-weight: 700;
}
.view-toggle {
  display: inline-flex;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  overflow: hidden;
  background: #fff;
}
.view-toggle button {
  border: 0;
  background: transparent;
  color: #475569;
  font-weight: 700;
  font-size: 0.75rem;
  font-family: inherit;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}
.view-toggle button.on { background: #1a4731; color: #fff; }

.hint-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}
.metric-hint { margin: 0; font-size: 0.82rem; color: #48515e; }
.loading-box { text-align: center; padding: 3rem 1rem; color: #64748b; }

.exceptions-toggle {
  display: inline-flex;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  overflow: hidden;
  background: #fff;
  flex-shrink: 0;
}
.exceptions-toggle button {
  border: 0;
  background: transparent;
  color: #475569;
  font-weight: 700;
  font-size: 0.7rem;
  font-family: inherit;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  white-space: nowrap;
}
.exceptions-toggle button.on { background: #fef3c7; color: #a16207; }

.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.95fr);
    align-items: start;
  }
}

.heatmap-panel,
.insights-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.9rem;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.05);
}

.panel-kicker {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.panel-kicker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.7rem;
}
.basemap-switch { display: flex; gap: 0.35rem; }
.basemap-switch button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.basemap-switch button.on {
  background: #1a4731;
  border-color: #1a4731;
  color: #fff;
}

.map-shell {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.map-canvas { width: 100%; height: 64vh; min-height: 420px; background: #eef2f1; }
.map-loading {
  position: absolute;
  z-index: 500;
  top: 12px;
  right: 12px;
  background: #fff;
  border-radius: 50%;
  padding: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.map-legend {
  position: absolute;
  z-index: 400;
  left: 10px;
  bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.35rem 0.5rem;
  backdrop-filter: blur(2px);
}
.map-error {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.85rem;
}
.map-error strong { display: block; margin-bottom: 0.3rem; font-size: 0.95rem; }

.status-pill {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.status-pill.lvl-safe { background: #e2e8f0; color: #475569; }
.status-pill.lvl-watch { background: #fef3c7; color: #a16207; }
.status-pill.lvl-warn { background: #fef3c7; color: #d97706; }
.status-pill.lvl-danger { background: #fee2e2; color: #dc2626; }

.table-wrap { overflow: auto; }
.risk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.risk-table th,
.risk-table td {
  text-align: left;
  padding: 0.55rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.risk-table th button {
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}
.risk-table tbody tr { cursor: pointer; }
.risk-table tbody tr:hover { background: #f8fafc; }
.risk-table tbody tr.selected { background: #ecfdf5; }
.name-cell { font-weight: 700; color: #0f172a; }

.insights-panel h3 {
  margin: 0 0 0.25rem;
  color: #1a4731;
  font-weight: 800;
  font-size: 1.05rem;
}
.insights-sub { margin: 0 0 0.7rem; font-size: 0.82rem; color: #64748b; }

.batch-btn {
  width: 100%;
  border: 0;
  background: #1a4731;
  color: #fff;
  font-weight: 800;
  font-size: 0.8rem;
  font-family: inherit;
  border-radius: 9px;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
}
.batch-btn:disabled { opacity: 0.65; cursor: wait; }
.composer-link {
  display: block;
  width: 100%;
  margin: 6px 0 10px;
  border: 0;
  background: none;
  color: #1a4731;
  font-weight: 800;
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.empty-alerts {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 0.85rem;
  font-size: 0.85rem;
  color: #475569;
}

.alert-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 280px;
  overflow: auto;
}
.alert-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.45rem 0.5rem;
  border-left-width: 3px;
}
.alert-list li.lvl-danger { border-left-color: #dc2626; }
.alert-list li.lvl-warn { border-left-color: #d97706; }
.alert-list li.lvl-watch { border-left-color: #ca8a04; }
.alert-main {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  text-align: left;
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.alert-main strong { color: #0f172a; font-size: 0.82rem; }
.alert-main span { color: #64748b; font-size: 0.72rem; }
.quick-sms {
  flex-shrink: 0;
  border: 1px solid #1a4731;
  background: #fff;
  color: #1a4731;
  font-weight: 800;
  font-size: 0.7rem;
  font-family: inherit;
  border-radius: 7px;
  padding: 5px 8px;
  cursor: pointer;
}

.selected-card {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #e2e8f0;
}
.selected-card h4 {
  margin: 0 0 0.55rem;
  color: #1a4731;
  font-weight: 800;
}
.selected-pin {
  margin: -0.25rem 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}
.selected-card dl {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.selected-card dl > div {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.45rem 0.5rem;
}
.selected-card dt {
  font-size: 0.62rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #64748b;
}
.selected-card dd {
  margin: 0.1rem 0 0;
  font-weight: 800;
  color: #0f172a;
  font-size: 0.92rem;
}
.qual { display: block; font-size: 0.68rem; font-weight: 600; color: #64748b; margin-top: 2px; }
.meter {
  height: 4px;
  background: #e2e8f0;
  border-radius: 999px;
  margin-top: 6px;
  overflow: hidden;
}
.meter i {
  display: block;
  height: 100%;
  background: #1a4731;
  border-radius: 999px;
}
.advice-box {
  margin-top: 0.7rem;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  color: #14532d;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
}

/* Google Maps renders InfoWindow content outside this component's DOM subtree. */
:global(.geo-tooltip) {
  font-size: 0.75rem;
  line-height: 1.35;
}
:global(.geo-tooltip .tt-muted) { color: #94a3b8; font-weight: 600; }
</style>
