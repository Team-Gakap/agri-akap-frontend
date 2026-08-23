<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Advanced Climate GIS Hub</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" :disabled="isLoading" @click="fetchSiteData(activeSite)">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="gis-content" :fullscreen="true" :scroll-y="false">
      <div class="gis-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <!-- ════════════ LEFT — MAP (~70%) ════════════ -->
        <section class="map-panel">
          <div class="map-toolbar">
            <div class="layer-toggles">
              <label class="layer-toggle">
                <input type="checkbox" v-model="layers.sensors" />
                <ion-icon :icon="hardwareChipOutline"></ion-icon>
                Show Virtual Sensors
              </label>
              <label class="layer-toggle">
                <input type="checkbox" v-model="layers.floodRisk" />
                <ion-icon :icon="waterOutline"></ion-icon>
                Show Flood Risk
              </label>
            </div>
            <button class="desktop-collapse-btn" type="button" @click="sidebarCollapsed = !sidebarCollapsed">
              <ion-icon :icon="sidebarCollapsed ? chevronBackOutline : chevronForwardOutline"></ion-icon>
            </button>
          </div>

          <div class="map-shell">
            <div ref="mapEl" class="map-canvas"></div>
            <div class="map-legend">
              <span class="legend-chip"><i class="dot normal"></i>Barangay pin</span>
              <span class="legend-chip"><i class="dot selected"></i>Active site</span>
              <span class="legend-chip"><i class="dot severe"></i>Wind &gt; 60 km/h</span>
            </div>
          </div>
        </section>

        <!-- ════════════ RIGHT — ANALYSIS SIDEBAR (~30%) ════════════ -->
        <aside class="analysis-sidebar">
          <button class="mobile-peek-handle" type="button" @click="sidebarCollapsed = !sidebarCollapsed">
            <ion-icon :icon="sidebarCollapsed ? chevronUpOutline : chevronDownOutline"></ion-icon>
            <span>{{ sidebarCollapsed ? 'Expand Analysis Panel' : 'Collapse' }}</span>
          </button>

          <div class="sidebar-inner">
            <header class="sidebar-header">
              <p class="site-eyebrow">ACTIVE SITE</p>
              <h2>{{ activeSite }}</h2>
              <p class="site-sub">
                <span v-if="usingMock">Sample / offline feed</span>
                <span v-else>Open-Meteo cache</span>
                <span v-if="lastFetchedAt"> &middot; {{ lastFetchedAt }}</span>
              </p>
            </header>

            <nav class="tool-tabs" role="tablist">
              <button
                v-for="tool in tools"
                :key="tool.id"
                type="button"
                role="tab"
                class="tool-tab"
                :class="{ active: activeTab === tool.id, danger: tool.id === 'TC/Severe' && severeWindThreat }"
                :aria-selected="activeTab === tool.id"
                @click="activeTab = tool.id"
              >
                <ion-icon :icon="tool.icon"></ion-icon>
                <span>{{ tool.label }}</span>
              </button>
            </nav>

            <div class="tool-body">
              <div v-if="isLoading" class="sidebar-loading">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Loading climate for {{ activeSite }}…</p>
              </div>

              <template v-else>
                <!-- ── 1. 6HR ANALYSIS ──────────────────────────────────── -->
                <div v-show="activeTab === '6HR'" class="panel">
                  <p class="panel-caption">Next 6 hours · temperature, wind &amp; rain chance</p>
                  <div v-if="!climateData.hourly.length" class="empty-inline">No hourly forecast cached for this site.</div>
                  <div v-else class="hourly-scroll">
                    <div v-for="(h, i) in climateData.hourly" :key="`${h.time}-${i}`" class="hour-card">
                      <span class="hour-time">{{ h.time }}</span>
                      <ion-icon class="hour-icon" :icon="conditionIcon(h.rainChance)"></ion-icon>
                      <span class="hour-temp">{{ fmt(h.temp, 0) }}&deg;</span>
                      <span class="hour-metric">
                        <ion-icon :icon="speedometerOutline"></ion-icon>{{ fmt(h.wind, 0) }} km/h
                      </span>
                      <span class="hour-metric">
                        <ion-icon :icon="rainyOutline"></ion-icon>{{ fmt(h.rainChance, 0) }}%
                      </span>
                    </div>
                  </div>
                </div>

                <!-- ── 2. SITE ANALYSIS ─────────────────────────────────── -->
                <div v-show="activeTab === 'Site'" class="panel">
                  <p class="panel-caption">Current site weather profile</p>
                  <div class="profile-hero">
                    <ion-icon :icon="conditionIcon(climateData.current.rainChance)"></ion-icon>
                    <div>
                      <span class="hero-temp">{{ fmt(climateData.current.temperature, 1) }}&deg;C</span>
                      <span class="hero-condition">{{ climateData.current.condition }}</span>
                    </div>
                  </div>
                  <div class="metric-grid">
                    <div class="metric-tile">
                      <ion-icon :icon="thermometerOutline"></ion-icon>
                      <span class="m-label">Temp Range</span>
                      <span class="m-value">{{ fmt(climateData.current.tempMin, 1) }}–{{ fmt(climateData.current.tempMax, 1) }}&deg;C</span>
                    </div>
                    <div class="metric-tile">
                      <ion-icon :icon="speedometerOutline"></ion-icon>
                      <span class="m-label">Wind</span>
                      <span class="m-value">{{ fmt(climateData.current.windSpeed, 0) }} km/h</span>
                    </div>
                    <div class="metric-tile">
                      <ion-icon :icon="rainyOutline"></ion-icon>
                      <span class="m-label">Rain Chance</span>
                      <span class="m-value">{{ fmt(climateData.current.rainChance, 0) }}%</span>
                    </div>
                    <div class="metric-tile">
                      <ion-icon :icon="leafOutline"></ion-icon>
                      <span class="m-label">Root Moisture</span>
                      <span class="m-value">{{ fmt(climateData.current.soilMoisture, 2) }}</span>
                    </div>
                    <div class="metric-tile">
                      <ion-icon :icon="waterOutline"></ion-icon>
                      <span class="m-label">ET0</span>
                      <span class="m-value">{{ fmt(climateData.current.et0, 2) }} mm</span>
                    </div>
                    <div class="metric-tile">
                      <ion-icon :icon="sunnyOutline"></ion-icon>
                      <span class="m-label">Status</span>
                      <span class="m-value">{{ climateData.current.condition }}</span>
                    </div>
                  </div>
                </div>

                <!-- ── 3. TC / SEVERE ───────────────────────────────────── -->
                <div v-show="activeTab === 'TC/Severe'" class="panel">
                  <div v-if="severeWindThreat" class="alert-banner danger">
                    <ion-icon :icon="warningOutline"></ion-icon>
                    <div>
                      <strong>Severe Wind Threat Detected</strong>
                      <p>
                        One or more hours in the 6HR window exceed 60 km/h for {{ activeSite }}.
                        Secure standing crops, greenhouses, and light structures.
                      </p>
                      <p class="alert-meta">Peak forecast wind: <b>{{ fmt(maxHourlyWind, 0) }} km/h</b></p>
                    </div>
                  </div>
                  <div v-else class="alert-banner safe">
                    <ion-icon :icon="checkmarkCircleOutline"></ion-icon>
                    <div>
                      <strong>Clear</strong>
                      <p>No gale-force wind signal in the next 6 hours for {{ activeSite }}.</p>
                    </div>
                  </div>
                  <div class="tc-status-grid">
                    <div class="tc-status-tile">
                      <span class="m-label">Status</span>
                      <span class="m-value">{{ severeWindThreat ? 'WARNING' : 'Clear' }}</span>
                    </div>
                    <div class="tc-status-tile">
                      <span class="m-label">Max 6HR Wind</span>
                      <span class="m-value">{{ fmt(maxHourlyWind, 0) }} km/h</span>
                    </div>
                    <div class="tc-status-tile">
                      <span class="m-label">Threshold</span>
                      <span class="m-value">&gt; 60 km/h</span>
                    </div>
                  </div>
                </div>

                <!-- ── 4. SENSOR NETWORK ────────────────────────────────── -->
                <div v-show="activeTab === 'Sensors'" class="panel">
                  <p class="panel-caption">Virtual IoT ground telemetry</p>
                  <div class="sensor-hero-grid">
                    <div class="sensor-hero">
                      <span class="m-label">Deep Soil Moisture</span>
                      <span class="sensor-big mono">{{ fmt(climateData.sensors.soilMoistureDeep, 1) }}%</span>
                    </div>
                    <div class="sensor-hero">
                      <span class="m-label">Evapotranspiration</span>
                      <span class="sensor-big mono">{{ fmt(climateData.sensors.evapotranspiration, 2) }} <small>mm</small></span>
                    </div>
                  </div>
                  <div class="sensor-grid">
                    <div class="sensor-tile">
                      <ion-icon :icon="thermometerOutline"></ion-icon>
                      <span class="m-label">Soil Temp (10cm)</span>
                      <span class="m-value mono">{{ fmt(climateData.sensors.soilTemp, 1) }}&deg;C</span>
                    </div>
                    <div class="sensor-tile">
                      <ion-icon :icon="batteryHalfOutline"></ion-icon>
                      <span class="m-label">Node Battery</span>
                      <span class="m-value mono">{{ fmt(climateData.sensors.batteryLevel, 0) }}%</span>
                    </div>
                  </div>
                  <p class="sensor-footnote">
                    <ion-icon :icon="pulseOutline"></ion-icon>
                    Node {{ climateData.sensors.nodeId }} · last sync {{ climateData.sensors.lastSync }}
                  </p>
                </div>

                <!-- ── 5. HISTORICAL ────────────────────────────────────── -->
                <div v-show="activeTab === 'History'" class="panel">
                  <p class="panel-caption">Precipitation · last 30 days</p>
                  <div v-if="!climateData.historical.length" class="empty-inline">No historical archive for this site.</div>
                  <template v-else>
                    <div class="chart-box">
                      <Line :data="historicalChartData" :options="historicalChartOptions" />
                    </div>
                    <div class="historical-stats">
                      <div class="stat">
                        <span class="m-label">Total</span>
                        <span class="m-value">{{ fmt(historicalStats.total, 0) }} mm</span>
                      </div>
                      <div class="stat">
                        <span class="m-label">Daily Avg</span>
                        <span class="m-value">{{ fmt(historicalStats.avg, 1) }} mm</span>
                      </div>
                      <div class="stat">
                        <span class="m-label">Peak Day</span>
                        <span class="m-value">{{ fmt(historicalStats.max, 0) }} mm</span>
                      </div>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </aside>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, onIonViewDidEnter,
} from '@ionic/vue';
import {
  refreshOutline, chevronBackOutline, chevronForwardOutline, chevronUpOutline, chevronDownOutline,
  timeOutline, locationOutline, warningOutline, hardwareChipOutline, statsChartOutline,
  thermometerOutline, waterOutline, speedometerOutline, rainyOutline, sunnyOutline, cloudyOutline,
  thunderstormOutline, leafOutline, pulseOutline, batteryHalfOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import apiClient from '@/utils/axios';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

/* ═══════════════════════════ Types ═══════════════════════════ */

type TabId = '6HR' | 'Site' | 'TC/Severe' | 'Sensors' | 'History';

interface BarangaySite {
  name: string;
  lat: number;
  lng: number;
}

interface HourlyPoint {
  time: string;
  temp: number;
  wind: number;
  rainChance: number;
  weatherCode?: number | null;
  status?: string;
}

interface HistoricalPoint {
  date: string;
  label: string;
  precipitation: number;
  temperatureMax?: number | null;
  et0?: number | null;
}

interface CurrentProfile {
  temperature: number;
  tempMin: number;
  tempMax: number;
  windSpeed: number;
  rainChance: number;
  soilMoisture: number;
  et0: number;
  condition: string;
}

interface SensorReading {
  soilMoistureDeep: number;
  evapotranspiration: number;
  soilTemp: number;
  batteryLevel: number;
  nodeId: string;
  lastSync: string;
}

/* ═══════════════════════════ Constants ═══════════════════════════ */

const ECHAGUE: [number, number] = [16.7053, 121.6772];

/** Map pins — click triggers fetchSiteData */
const BARANGAY_SITES: BarangaySite[] = [
  { name: 'San Fabian', lat: 16.7209, lng: 121.6572 },
  { name: 'Angoluan', lat: 16.6850, lng: 121.7050 },
  { name: 'Soyung (Poblacion)', lat: 16.7053, lng: 121.6772 },
  { name: 'Ipil', lat: 16.7350, lng: 121.6920 },
];

const tools: Array<{ id: TabId; label: string; icon: string }> = [
  { id: '6HR', label: '6HR', icon: timeOutline },
  { id: 'Site', label: 'Site', icon: locationOutline },
  { id: 'TC/Severe', label: 'TC/Severe', icon: warningOutline },
  { id: 'Sensors', label: 'Sensors', icon: hardwareChipOutline },
  { id: 'History', label: 'History', icon: statsChartOutline },
];

/* ═══════════════════════════ State ═══════════════════════════ */

const activeSite = ref('Echague Center');
const activeTab = ref<TabId>('6HR');
const isLoading = ref(false);
const usingMock = ref(false);
const lastFetchedAt = ref('');
const sidebarCollapsed = ref(false);
const mapEl = ref<HTMLDivElement | null>(null);

const layers = reactive({ sensors: true, floodRisk: false });

const climateData = reactive({
  hourly: [] as HourlyPoint[],
  historical: [] as HistoricalPoint[],
  current: {
    temperature: 0,
    tempMin: 0,
    tempMax: 0,
    windSpeed: 0,
    rainChance: 0,
    soilMoisture: 0,
    et0: 0,
    condition: '—',
  } as CurrentProfile,
  sensors: {
    soilMoistureDeep: 0,
    evapotranspiration: 0,
    soilTemp: 0,
    batteryLevel: 0,
    nodeId: '—',
    lastSync: '—',
  } as SensorReading,
});

let map: L.Map | null = null;
let sensorLayer: L.LayerGroup | null = null;
let floodLayer: L.LayerGroup | null = null;
const markerRefs: Record<string, L.CircleMarker> = {};

/* ═══════════════════════════ Derived ═══════════════════════════ */

const maxHourlyWind = computed(() =>
  climateData.hourly.reduce((max, h) => Math.max(max, Number(h.wind) || 0), 0),
);

const severeWindThreat = computed(() => climateData.hourly.some((h) => Number(h.wind) > 60));

const historicalStats = computed(() => {
  const points = climateData.historical;
  const total = points.reduce((sum, p) => sum + (Number(p.precipitation) || 0), 0);
  const max = points.reduce((m, p) => Math.max(m, Number(p.precipitation) || 0), 0);
  return {
    total,
    avg: points.length ? total / points.length : 0,
    max,
  };
});

const historicalChartData = computed(() => ({
  labels: climateData.historical.map((p) => p.label),
  datasets: [
    {
      label: 'Precipitation (mm)',
      data: climateData.historical.map((p) => p.precipitation),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.18)',
      pointBackgroundColor: '#38bdf8',
      pointRadius: climateData.historical.length > 20 ? 0 : 3,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
    },
  ],
}));

const historicalChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#0f172a', titleColor: '#f8fafc', bodyColor: '#7dd3fc' },
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
        font: { size: 9 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
      },
      grid: { color: 'rgba(148,163,184,0.12)' },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(148,163,184,0.12)' },
    },
  },
};

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function fmt(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
}

function conditionIcon(rainChance: number): string {
  if (rainChance >= 65) return thunderstormOutline;
  if (rainChance >= 35) return rainyOutline;
  if (rainChance >= 15) return cloudyOutline;
  return sunnyOutline;
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', hour12: true }).replace(' ', '');
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function applyClimatePayload(payload: {
  hourly: HourlyPoint[];
  historical: HistoricalPoint[];
  current: CurrentProfile;
  sensors: SensorReading;
}) {
  climateData.hourly = payload.hourly;
  climateData.historical = payload.historical;
  Object.assign(climateData.current, payload.current);
  Object.assign(climateData.sensors, payload.sensors);
  lastFetchedAt.value = new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  updateMarkerStyles();
}

/* ═══════════════════════════ Mock fallback ═══════════════════════════ */

function buildMockClimate(barangayName: string) {
  const seed = hashString(barangayName);
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const severe = seed % 5 === 0;
  const hourly: HourlyPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + i + 1);
    return {
      time: d.toLocaleTimeString('en-PH', { hour: 'numeric', hour12: true }).replace(' ', ''),
      temp: 26 + (seed % 7) + Math.sin(i / 2) * 2,
      wind: 8 + (seed % 10) + (severe && i >= 2 ? 55 : 0) + i * 1.5,
      rainChance: Math.min(100, 15 + (seed % 40) + i * 8),
      status: 'Mock',
    };
  });

  const first = hourly[0];
  const current: CurrentProfile = {
    temperature: first.temp,
    tempMin: first.temp - 3,
    tempMax: first.temp + 2,
    windSpeed: first.wind,
    rainChance: first.rainChance,
    soilMoisture: 0.18 + (seed % 15) / 100,
    et0: 3.5 + (seed % 30) / 10,
    condition: first.rainChance > 50 ? 'Rain Likely' : 'Partly Cloudy',
  };

  const historical: HistoricalPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: formatDayLabel(date),
      precipitation: Math.round((next() * 28 + (i % 5) * 2) * 10) / 10,
      temperatureMax: 30 + (i % 4),
      et0: 4 + (i % 3) * 0.4,
    };
  });

  const sensors: SensorReading = {
    soilMoistureDeep: Math.round((current.soilMoisture * 100 + (seed % 8)) * 10) / 10,
    evapotranspiration: current.et0,
    soilTemp: 24 + (seed % 6),
    batteryLevel: 60 + (seed % 35),
    nodeId: `VS-${(seed % 900) + 100}`,
    lastSync: `${(seed % 12) + 1} min ago`,
  };

  return { hourly, historical, current, sensors };
}

/* ═══════════════════════════ API wiring ═══════════════════════════ */

async function fetchSiteData(barangayName: string) {
  if (!barangayName) return;

  activeSite.value = barangayName;
  isLoading.value = true;
  usingMock.value = false;

  const encoded = encodeURIComponent(barangayName);

  try {
    // Concurrent Open-Meteo cache reads (+ current for Site / Sensors panels)
    const [hourlyRes, historicalRes, currentRes] = await Promise.all([
      apiClient.get(`/weather/hourly/${encoded}`),
      apiClient.get(`/weather/historical/${encoded}`),
      apiClient.get('/weather/current', { params: { barangay: barangayName } }).catch(() => null),
    ]);

    const hoursRaw = hourlyRes.data?.data?.hours ?? [];
    const hourly: HourlyPoint[] = (Array.isArray(hoursRaw) ? hoursRaw : []).map((row: any) => ({
      time: formatHourLabel(row.forecast_datetime ?? ''),
      temp: Number(row.temperature ?? 0),
      wind: Number(row.wind_speed ?? 0),
      rainChance: Number(row.precipitation_probability ?? 0),
      weatherCode: row.weather_code ?? null,
      status: row.status ?? 'Unknown',
    }));

    const daysRaw = historicalRes.data?.data?.days ?? [];
    const historical: HistoricalPoint[] = (Array.isArray(daysRaw) ? daysRaw : []).map((row: any) => ({
      date: String(row.date ?? ''),
      label: formatDayLabel(String(row.date ?? '')),
      precipitation: Number(row.precipitation_sum ?? 0),
      temperatureMax: row.temperature_max != null ? Number(row.temperature_max) : null,
      et0: row.et0_fao_evapotranspiration != null ? Number(row.et0_fao_evapotranspiration) : null,
    }));

    const today = currentRes?.data?.data?.today;
    const firstHour = hourly[0];
    const current: CurrentProfile = today
      ? {
          temperature: Number(today.temperature_max ?? today.temperature_min ?? firstHour?.temp ?? 0),
          tempMin: Number(today.temperature_min ?? 0),
          tempMax: Number(today.temperature_max ?? 0),
          windSpeed: Number(today.wind_speed_10m ?? firstHour?.wind ?? 0),
          rainChance: Number(today.precipitation_probability ?? firstHour?.rainChance ?? 0),
          soilMoisture: Number(today.soil_moisture_28cm ?? 0),
          et0: Number(today.evapotranspiration ?? 0),
          condition: String(today.status ?? 'Unknown'),
        }
      : {
          temperature: firstHour?.temp ?? 0,
          tempMin: firstHour ? firstHour.temp - 2 : 0,
          tempMax: firstHour ? firstHour.temp + 1 : 0,
          windSpeed: firstHour?.wind ?? 0,
          rainChance: firstHour?.rainChance ?? 0,
          soilMoisture: 0,
          et0: historical.at(-1)?.et0 ?? 0,
          condition: firstHour?.status ?? 'Unknown',
        };

    const soilPct = current.soilMoisture > 0 && current.soilMoisture <= 1
      ? current.soilMoisture * 100
      : current.soilMoisture || 22;

    const sensors: SensorReading = {
      soilMoistureDeep: Math.round(soilPct * 10) / 10,
      evapotranspiration: current.et0 || Number(historical.at(-1)?.et0 ?? 0),
      soilTemp: Math.round((current.temperature - 2 + (hashString(barangayName) % 3)) * 10) / 10,
      batteryLevel: 70 + (hashString(barangayName) % 25),
      nodeId: `VS-${(hashString(barangayName) % 900) + 100}`,
      lastSync: 'live cache',
    };

    applyClimatePayload({ hourly, historical, current, sensors });
  } catch {
    // Backend offline / unauthenticated — keep UI usable with seeded mock
    usingMock.value = true;
    applyClimatePayload(buildMockClimate(barangayName));
  } finally {
    isLoading.value = false;
  }
}

/* ═══════════════════════════ Leaflet map ═══════════════════════════ */

function updateMarkerStyles() {
  BARANGAY_SITES.forEach((site) => {
    const marker = markerRefs[site.name];
    if (!marker) return;
    const isSelected = activeSite.value === site.name;
    const isSevere = isSelected && severeWindThreat.value;
    marker.setStyle({
      radius: isSelected ? 11 : 8,
      weight: isSelected ? 3 : 2,
      color: isSelected ? '#d4af37' : '#ffffff',
      fillColor: isSelected ? (isSevere ? '#dc2626' : '#d4af37') : '#1a4731',
      fillOpacity: 0.92,
    });
  });
}

function selectSite(site: BarangaySite) {
  map?.flyTo([site.lat, site.lng], 14, { duration: 0.55 });
  void fetchSiteData(site.name);
}

function applyLayerVisibility() {
  if (!map) return;
  if (layers.sensors) {
    if (sensorLayer && !map.hasLayer(sensorLayer)) map.addLayer(sensorLayer);
  } else if (sensorLayer && map.hasLayer(sensorLayer)) {
    map.removeLayer(sensorLayer);
  }
  if (layers.floodRisk) {
    if (floodLayer && !map.hasLayer(floodLayer)) map.addLayer(floodLayer);
  } else if (floodLayer && map.hasLayer(floodLayer)) {
    map.removeLayer(floodLayer);
  }
}

function initMap() {
  if (!mapEl.value || map) return;

  map = L.map(mapEl.value, { center: ECHAGUE, zoom: 12 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  BARANGAY_SITES.forEach((site) => {
    const marker = L.circleMarker([site.lat, site.lng], {
      radius: 8,
      weight: 2,
      color: '#ffffff',
      fillColor: '#1a4731',
      fillOpacity: 0.92,
    })
      .bindTooltip(site.name, { direction: 'top', offset: [0, -6] })
      .on('click', () => selectSite(site))
      .addTo(map!);
    markerRefs[site.name] = marker;
  });

  sensorLayer = L.layerGroup();
  BARANGAY_SITES.forEach((site) => {
    L.circleMarker([site.lat + 0.004, site.lng + 0.004], {
      radius: 4,
      weight: 1,
      color: '#0891b2',
      fillColor: '#22d3ee',
      fillOpacity: 0.95,
    })
      .bindPopup(`<strong>Virtual Sensor · ${site.name}</strong>`)
      .addTo(sensorLayer!);
  });

  floodLayer = L.layerGroup();
  [BARANGAY_SITES[0], BARANGAY_SITES[2]].forEach((site) => {
    L.circle([site.lat, site.lng], {
      radius: 550,
      weight: 1,
      color: '#f97316',
      fillColor: '#f97316',
      fillOpacity: 0.16,
    })
      .bindTooltip(`${site.name} · Flood-prone zone`)
      .addTo(floodLayer!);
  });

  applyLayerVisibility();
  setTimeout(() => map?.invalidateSize(), 300);
}

watch(() => layers.sensors, applyLayerVisibility);
watch(() => layers.floodRisk, applyLayerVisibility);
watch(sidebarCollapsed, () => setTimeout(() => map?.invalidateSize(), 260));
watch(severeWindThreat, updateMarkerStyles);

onMounted(async () => {
  await nextTick();
  initMap();
  // Seed sidebar with default site (mock or live depending on API)
  await fetchSiteData(BARANGAY_SITES[2].name);
});

onIonViewDidEnter(() => {
  setTimeout(() => map?.invalidateSize(), 200);
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.gis-content {
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
  --background: #eef2f0;
}

.gis-shell {
  position: absolute;
  inset: 0;
  display: flex;
  height: auto;
  width: 100%;
  background: #0f172a;
}

.map-panel {
  flex: 1 1 70%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #eef2f0;
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  background: #1a4731;
  flex-wrap: wrap;
}

.layer-toggles { display: flex; gap: 1rem; flex-wrap: wrap; }

.layer-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #eef7f0;
  cursor: pointer;
  user-select: none;
}

.layer-toggle input { accent-color: #d4af37; width: 15px; height: 15px; cursor: pointer; }
.layer-toggle ion-icon { font-size: 1rem; color: #d4af37; }

.desktop-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
}

.map-shell { position: relative; flex: 1; min-height: 0; }
.map-canvas { width: 100%; height: 100%; }

.map-legend {
  position: absolute;
  bottom: 14px;
  left: 14px;
  z-index: 500;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #334155;
}

.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
.dot.normal { background: #1a4731; }
.dot.selected { background: #d4af37; }
.dot.severe { background: #dc2626; }

.analysis-sidebar {
  flex: 0 0 30%;
  max-width: 420px;
  min-width: 320px;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #1e293b;
  transition: flex-basis 0.25s ease, min-width 0.25s ease, max-width 0.25s ease;
}

.gis-shell.sidebar-collapsed .analysis-sidebar {
  flex-basis: 0;
  min-width: 0;
  max-width: 0;
  overflow: hidden;
  border-left: none;
}

.mobile-peek-handle { display: none; }

.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 320px;
  overflow: hidden;
}

.sidebar-header {
  padding: 0.9rem 1rem 0.6rem;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.site-eyebrow {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d4af37;
}

.sidebar-header h2 {
  margin: 0.2rem 0 0.15rem;
  font-size: 1.1rem;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.25;
}

.site-sub { margin: 0; font-size: 0.72rem; color: #64748b; }

.tool-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid #1e293b;
  background: #111c31;
  overflow-x: auto;
}

.tool-tab {
  flex: 1;
  min-width: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.55rem 0.25rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
}

.tool-tab ion-icon { font-size: 1.15rem; }

.tool-tab.active {
  color: #f8fafc;
  border-bottom-color: #d4af37;
  background: rgba(212, 175, 55, 0.08);
}

.tool-tab.danger { color: #fca5a5; }
.tool-tab.danger.active {
  color: #fee2e2;
  border-bottom-color: #ef4444;
  background: rgba(239, 68, 68, 0.14);
}

.tool-body {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 0.9rem 1rem 1.4rem;
}

.sidebar-loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  background: rgba(15, 23, 42, 0.88);
  color: #94a3b8;
  font-size: 0.82rem;
}

.sidebar-loading ion-spinner { --color: #d4af37; width: 36px; height: 36px; }

.empty-inline {
  background: #16213b;
  border: 1px dashed #334155;
  border-radius: 10px;
  padding: 0.85rem;
  font-size: 0.82rem;
  color: #94a3b8;
}

.panel-caption {
  margin: 0 0 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.m-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.m-value {
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
  color: #f8fafc;
  margin-top: 0.15rem;
}

.m-value.mono,
.sensor-big.mono {
  font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
  color: #7dd3fc;
}

.hourly-scroll {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;
}

.hour-card {
  flex: 0 0 auto;
  width: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  background: #16213b;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 0.7rem 0.4rem;
}

.hour-time { font-size: 0.7rem; font-weight: 700; color: #94a3b8; }
.hour-icon { font-size: 1.35rem; color: #7dd3fc; }
.hour-temp { font-size: 1.05rem; font-weight: 800; color: #f8fafc; }

.hour-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.62rem;
  color: #94a3b8;
  font-weight: 600;
}

.hour-metric ion-icon { font-size: 0.8rem; }

.profile-hero {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: #16213b;
  border: 1px solid #1e293b;
  border-radius: 14px;
  padding: 0.9rem;
  margin-bottom: 0.85rem;
}

.profile-hero ion-icon { font-size: 2.4rem; color: #d4af37; }
.profile-hero div { display: flex; flex-direction: column; }
.hero-temp { font-size: 1.5rem; font-weight: 900; color: #f8fafc; }
.hero-condition { font-size: 0.78rem; color: #94a3b8; font-weight: 600; }

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.metric-tile,
.sensor-tile {
  background: #16213b;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 0.6rem 0.65rem;
}

.metric-tile ion-icon,
.sensor-tile ion-icon {
  font-size: 1rem;
  color: #d4af37;
  margin-bottom: 0.3rem;
}

.alert-banner {
  display: flex;
  gap: 0.65rem;
  border-radius: 12px;
  padding: 0.8rem 0.85rem;
  margin-bottom: 0.85rem;
}

.alert-banner ion-icon { font-size: 1.5rem; flex-shrink: 0; }

.alert-banner.danger {
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.45);
}

.alert-banner.danger ion-icon { color: #ef4444; }
.alert-banner.danger strong { color: #fecaca; }

.alert-banner.safe {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.alert-banner.safe ion-icon { color: #22c55e; }
.alert-banner.safe strong { color: #bbf7d0; }

.alert-banner strong { display: block; font-size: 0.85rem; margin-bottom: 0.2rem; }
.alert-banner p { margin: 0; font-size: 0.78rem; color: #cbd5e1; line-height: 1.4; }
.alert-meta { margin-top: 0.35rem !important; font-weight: 700; color: #f8fafc !important; }

.tc-status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.tc-status-tile {
  background: #16213b;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 0.55rem 0.5rem;
  text-align: center;
}

.sensor-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 0.65rem;
}

.sensor-hero {
  background: linear-gradient(145deg, #16213b, #0f2744);
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  padding: 0.85rem 0.7rem;
  text-align: center;
}

.sensor-big {
  display: block;
  font-size: 1.65rem;
  font-weight: 900;
  margin-top: 0.35rem;
  line-height: 1.1;
}

.sensor-big small { font-size: 0.75rem; font-weight: 700; }

.sensor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
}

.sensor-footnote {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: #64748b;
  margin: 0;
}

.sensor-footnote ion-icon { color: #22d3ee; }

.chart-box { height: 190px; position: relative; margin-bottom: 0.8rem; }

.historical-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.stat {
  background: #16213b;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 0.55rem 0.5rem;
  text-align: center;
}

@media (max-width: 960px) {
  .gis-shell { flex-direction: column; }
  .map-panel { flex: 1 1 50%; min-height: 0; }
  .desktop-collapse-btn { display: none; }

  .analysis-sidebar {
    flex: 1 1 50%;
    max-width: none;
    min-width: 0;
    border-left: none;
    border-top: 1px solid #1e293b;
  }

  .gis-shell.sidebar-collapsed .analysis-sidebar {
    flex: 0 0 auto;
    max-width: none;
  }

  .mobile-peek-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    border: none;
    background: #111c31;
    color: #94a3b8;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.4rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .sidebar-inner { min-width: 0; }
  .gis-shell.sidebar-collapsed .sidebar-inner { display: none; }
}
</style>
