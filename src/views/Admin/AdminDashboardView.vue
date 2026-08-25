<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Command Center</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="dashboard-bg ion-padding">
      <div class="shell">
        <header class="intro">
          <p class="eyebrow">LGU Echague &middot; Municipal Agriculture Office</p>
          <h1>Municipal Command Center</h1>
        </header>

        <div v-if="initialLoading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading live overview&hellip;</p>
        </div>

        <div v-else-if="error && !hasData" class="center-state error">
          <p>{{ error }}</p>
          <ion-button @click="fetchAll">Retry</ion-button>
        </div>

        <div v-else class="grid-shell">
          <!-- ── Row 1: Descriptive KPIs ─────────────────────────────────── -->
          <ion-card class="kpi-card span-3" button @click="go('/admin/farmers')">
            <ion-card-content>
              <div class="kpi-icon-wrap kpi-tone-green">
                <ion-icon :icon="peopleOutline"></ion-icon>
              </div>
              <p class="kpi-value">{{ fmt(descriptive.total_farmers) }}</p>
              <p class="kpi-label">Registered Farmers</p>
            </ion-card-content>
          </ion-card>

          <ion-card class="kpi-card span-3" button @click="go('/admin/reports/damage-calamity')">
            <ion-card-content>
              <div class="kpi-icon-wrap kpi-tone-danger">
                <ion-icon :icon="warningOutline"></ion-icon>
              </div>
              <p class="kpi-value">{{ fmt(descriptive.active_calamities) }}</p>
              <p class="kpi-label">Active Calamities</p>
            </ion-card-content>
          </ion-card>

          <ion-card class="kpi-card span-3" button @click="go('/admin/reports/pest-surveillance')">
            <ion-card-content>
              <div class="kpi-icon-wrap kpi-tone-danger">
                <ion-icon :icon="bugOutline"></ion-icon>
              </div>
              <p class="kpi-value">{{ fmt(descriptive.active_pests) }}</p>
              <p class="kpi-label">Active Pests</p>
            </ion-card-content>
          </ion-card>

          <ion-card class="kpi-card span-3" button @click="go('/admin/subsidies')">
            <ion-card-content>
              <div class="kpi-icon-wrap kpi-tone-slate">
                <ion-icon :icon="cubeOutline"></ion-icon>
              </div>
              <p class="kpi-value">{{ fmt(descriptive.pending_subsidy_releases) }}</p>
              <p class="kpi-label">Pending Subsidy Releases</p>
            </ion-card-content>
          </ion-card>

          <!-- ── Row 2: GIS Map (8) + Charts (4) ─────────────────────────── -->
          <ion-card class="panel-card span-8 map-panel">
            <ion-card-header>
              <ion-card-title>Municipal GIS &amp; Outbreak Radar</ion-card-title>
              <ion-card-subtitle>Active pest outbreaks &middot; Severe crop damage</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content class="map-content">
              <div v-if="mapLoadError" class="map-error">
                <p><strong>Map unavailable.</strong> {{ mapLoadError }}</p>
              </div>
              <template v-else>
                <div class="map-shell">
                  <div v-if="mapLoading" class="map-loading"><ion-spinner name="crescent"></ion-spinner></div>
                  <div ref="mapEl" class="map-canvas"></div>
                </div>
                <div class="map-legend">
                  <span class="legend-chip"><i class="dot pest"></i>Active pest outbreak</span>
                  <span class="legend-chip"><i class="dot damage"></i>Severe damage (&ge;50%)</span>
                  <span v-if="!mapMarkerCount" class="legend-chip muted">No high-priority markers right now.</span>
                </div>
              </template>
            </ion-card-content>
          </ion-card>

          <div class="span-4 chart-col">
            <ion-card class="panel-card">
              <ion-card-header>
                <ion-card-title>Crop Distribution</ion-card-title>
                <ion-card-subtitle>Rice vs Corn (registered parcels)</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <div class="chart-box small">
                  <Doughnut :data="cropChartData" :options="doughnutOptions" />
                </div>
                <p v-if="!cropRows.length" class="empty-note">No registered farm plots yet.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="panel-card">
              <ion-card-header>
                <ion-card-title>Recent Subsidy Distributions</ion-card-title>
                <ion-card-subtitle>By barangay &middot; last 90 days</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <div class="chart-box small">
                  <Bar :data="distributionChartData" :options="barOptions" />
                </div>
                <p v-if="!distributionRows.length" class="empty-note">No recent distributions.</p>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- ── Row 3: Agricultural Intelligence / Action Center ────────── -->
          <ion-card class="panel-card span-12 action-card">
            <ion-card-header>
              <ion-card-title>Agricultural Intelligence &amp; Prescriptive Actions</ion-card-title>
              <ion-card-subtitle>Critical system-generated insights only</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none" class="alert-list">
                <ion-item v-for="(alert, i) in alerts" :key="i" class="alert-item">
                  <ion-label class="ion-text-wrap">
                    <ion-badge :color="alertColor(alert)">{{ alertLabel(alert) }}</ion-badge>
                    <h2>{{ alert.barangay || 'LGU-wide' }}</h2>
                    <p>{{ alert.message }}</p>
                  </ion-label>
                  <ion-button slot="end" fill="outline" class="sms-btn" @click="openSmsModal(alert)">
                    Trigger SMS Advisory
                  </ion-button>
                </ion-item>
                <ion-item v-if="!alerts.length">
                  <ion-label>
                    <p>No critical alerts. All monitored indicators are within normal range.</p>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <ion-modal :is-open="smsOpen" @didDismiss="smsOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Trigger SMS Advisory</ion-title>
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
                :rows="6"
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonList, IonItem, IonLabel, IonBadge, IonModal, IonInput, IonTextarea,
} from '@ionic/vue';
import { peopleOutline, warningOutline, cubeOutline, bugOutline } from 'ionicons/icons';
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
import { loadGoogleMaps } from '@/utils/googleMaps';

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const LGU_GREEN = '#1a4731';
const LGU_GOLD = '#d4af37';
const ECHAGUE = { lat: 16.7053, lng: 121.6772 };

const router = useRouter();
const initialLoading = ref(true);
const loading = ref(false);
const error = ref('');
const sendingSms = ref(false);
const smsOpen = ref(false);
const mapLoading = ref(false);
const mapMarkerCount = ref(0);
const mapEl = ref<HTMLDivElement | null>(null);
const mapLoadError = ref('');

let map: google.maps.Map | null = null;
let infoWindow: google.maps.InfoWindow | null = null;
let markers: google.maps.Marker[] = [];

const descriptive = reactive<any>({});
const diagnostic = reactive<any>({ pest_breakdown: [], crop_distribution: [], distributions_by_barangay: [] });
const predictive = reactive<any>({ harvest_forecast: [], weather_risk: [] });
const prescriptive = reactive<any>({ alerts: [] });

const smsForm = reactive({
  barangay: '',
  message: '',
});

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');
const go = (path: string) => router.push(path);

const cropRows = computed(() => diagnostic.crop_distribution ?? []);
const distributionRows = computed(() => diagnostic.distributions_by_barangay ?? []);
const alerts = computed(() => prescriptive.alerts ?? []);
const hasData = computed(() => Number(descriptive.total_farmers ?? 0) > 0 || cropRows.value.length > 0);

const cropChartData = computed(() => {
  const rows = cropRows.value;
  const palette = [LGU_GREEN, LGU_GOLD, '#94a3b8', '#40916c', '#e8c96a'];
  return {
    labels: rows.map((r: any) => r.commodity),
    datasets: [{
      data: rows.map((r: any) => r.total_plots),
      backgroundColor: rows.map((_: any, i: number) => palette[i % palette.length]),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };
});

const distributionChartData = computed(() => ({
  labels: distributionRows.value.map((r: any) => r.barangay),
  datasets: [{
    label: 'Distributions',
    data: distributionRows.value.map((r: any) => r.total),
    backgroundColor: LGU_GREEN,
    hoverBackgroundColor: LGU_GOLD,
    borderRadius: 8,
    maxBarThickness: 30,
  }],
}));

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, usePointStyle: true, boxWidth: 8, font: { size: 11 } },
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: LGU_GREEN, titleColor: '#fff', bodyColor: LGU_GOLD },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: '#94a3b8', precision: 0 },
      grid: { color: 'rgba(26,71,49,0.08)' },
    },
    y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } },
  },
};

const alertColor = (a: any) => {
  if (a?.type === 'pest_outbreak') return 'danger';
  if (a?.type === 'weather_alert') return 'warning';
  return 'medium';
};
const alertLabel = (a: any) => {
  const map: Record<string, string> = {
    pest_outbreak: 'Pest Outbreak',
    weather_alert: 'Weather Alert',
    harvest_readiness: 'Harvest Readiness',
  };
  return map[a?.type] || 'Advisory';
};

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const destroyMap = () => {
  markers.forEach((m) => m.setMap(null));
  markers = [];
  infoWindow?.close();
  map = null;
};

const initMap = async () => {
  if (!mapEl.value || map) {
    if (map) google.maps.event.trigger(map, 'resize');
    return;
  }
  try {
    await loadGoogleMaps();
  } catch (err: any) {
    mapLoadError.value = err?.message ?? 'Failed to load Google Maps.';
    return;
  }
  map = new google.maps.Map(mapEl.value, {
    center: ECHAGUE,
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });
  infoWindow = new google.maps.InfoWindow();
  google.maps.event.trigger(map, 'resize');
};

const addMarker = (lat: number, lng: number, fill: string, stroke: string, radius: number, html: string) => {
  if (!map) return;
  const marker = new google.maps.Marker({
    position: { lat, lng },
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: radius,
      fillColor: fill,
      fillOpacity: 0.9,
      strokeColor: stroke,
      strokeWeight: 1.5,
    },
  });
  marker.addListener('click', () => {
    if (!map || !infoWindow) return;
    infoWindow.setContent(html);
    infoWindow.open(map, marker);
  });
  markers.push(marker);
};

const renderMap = (data: any) => {
  if (!map) return;
  markers.forEach((m) => m.setMap(null));
  markers = [];

  const damage = (data.damage_points ?? []).filter((d: any) => Number(d.damage_percentage || 0) >= 50);
  const pests = (data.pest_outbreaks ?? []).filter((p: any) => {
    const status = String(p.status || '').toLowerCase();
    return !status || status === 'active' || status === 'reported';
  });

  mapMarkerCount.value = damage.length + pests.length;

  pests.forEach((p: any) => {
    const sev = String(p.severity || '').toLowerCase();
    const fill = sev.includes('high') || sev.includes('severe') || sev.includes('critical') ? '#b91c1c'
      : sev.includes('med') ? '#d97706' : '#eab308';
    addMarker(p.lat, p.lng, fill, '#422006', 8,
      `<strong>${esc(p.pest_name || 'Pest outbreak')}</strong><br/>` +
      `Severity: ${esc(p.severity || '-')}<br/>` +
      `${esc(p.commodity || '')} &middot; Brgy ${esc(p.brgy || '-')}`);
  });

  damage.forEach((d: any) => {
    addMarker(d.lat, d.lng, '#ef4444', '#7f1d1d', 7,
      `<strong>${esc(d.calamity_name || 'Damage')}</strong><br/>` +
      `Damage: <b>${esc(d.damage_percentage)}%</b><br/>` +
      `Brgy ${esc(d.brgy || '-')}`);
  });
};

const fetchMapData = async () => {
  mapLoading.value = true;
  try {
    const res = await apiClient.get('/dashboard/map-data');
    renderMap(res.data?.data ?? {});
  } catch {
    // Map is a supplementary layer; failures here shouldn't block the dashboard.
  } finally {
    mapLoading.value = false;
  }
};

const fetchOverview = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/dashboard/overview');
    const payload = res.data?.data ?? res.data ?? {};
    Object.assign(descriptive, payload.descriptive ?? {});
    Object.assign(diagnostic, { pest_breakdown: [], crop_distribution: [], distributions_by_barangay: [], ...(payload.diagnostic ?? {}) });
    Object.assign(predictive, { harvest_forecast: [], weather_risk: [], ...(payload.predictive ?? {}) });
    Object.assign(prescriptive, { alerts: [], ...(payload.prescriptive ?? {}) });
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load dashboard overview.';
  } finally {
    loading.value = false;
    initialLoading.value = false;
  }
};

const fetchAll = async () => {
  await fetchOverview();
  await nextTick();
  await initMap();
  await fetchMapData();
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
    await toast.success('SMS advisory broadcast queued/sent.');
    smsOpen.value = false;
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Broadcast failed.');
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

onMounted(() => fetchAll());

onBeforeUnmount(() => {
  destroyMap();
});
</script>

<style scoped>
.dashboard-bg {
  --background: #f4f5f8;
}
.shell {
  max-width: 1280px;
  margin: 0 auto;
  padding-bottom: 1.5rem;
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
.center-state {
  text-align: center;
  padding: 3.5rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }

/* ── 12-column responsive command grid ──────────────────────────────── */
.grid-shell {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1.1rem;
  align-items: start;
}
.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

/* ── KPI cards ───────────────────────────────────────────────────────── */
.kpi-card {
  margin: 0;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  cursor: pointer;
}
.kpi-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}
.kpi-tone-green { background: rgba(26, 71, 49, 0.1); color: #1a4731; }
.kpi-tone-gold { background: rgba(212, 175, 55, 0.16); color: #a3831f; }
.kpi-tone-danger { background: rgba(220, 38, 38, 0.1); color: #b91c1c; }
.kpi-tone-slate { background: rgba(100, 116, 139, 0.12); color: #475569; }
.kpi-value {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 900;
  color: #1a4731;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.kpi-value small {
  font-size: 0.85rem;
  font-weight: 700;
}
.kpi-label {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
}

/* ── Panels ──────────────────────────────────────────────────────────── */
.panel-card {
  margin: 0;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.chart-col {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  min-width: 0;
}
.chart-col .panel-card { flex: 1; }
ion-card-title {
  color: #1a4731;
  font-weight: 800;
  font-size: 1rem;
}
ion-card-subtitle {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.78rem;
}

/* ── Map ─────────────────────────────────────────────────────────────── */
.map-content { display: flex; flex-direction: column; gap: 0.7rem; }
.map-shell {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.map-canvas { width: 100%; height: 380px; }
.map-loading {
  position: absolute; z-index: 500; top: 10px; right: 10px;
  background: #fff; border-radius: 50%; padding: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.map-error {
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.85rem;
}
.map-error strong { display: block; margin-bottom: 0.3rem; font-size: 0.95rem; }
.map-legend { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.legend-chip {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  display: inline-flex;
  align-items: center;
}
.legend-chip.muted { color: #94a3b8; font-weight: 500; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.dot.pest { background: #eab308; }
.dot.damage { background: #ef4444; }

/* ── Charts ──────────────────────────────────────────────────────────── */
.chart-box { height: 190px; position: relative; }
.chart-box.small { height: 170px; }
.empty-note {
  margin: 0.5rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

/* ── Agricultural Intelligence / Action Center ──────────────────────── */
.alert-list { background: transparent; }
.alert-item {
  --background: #f8fafc;
  --border-radius: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 0.65rem;
  align-items: center;
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
  --border-color: #1a4731;
  --color: #1a4731;
  text-transform: none;
  font-weight: 700;
  font-size: 0.8rem;
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

/* ── Mobile: collapse to single column ──────────────────────────────── */
@media (max-width: 960px) {
  .grid-shell { grid-template-columns: 1fr; }
  .span-2, .span-3, .span-4, .span-8, .span-12 { grid-column: span 1; }
  .alert-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .sms-btn {
    width: 100%;
    margin: 0.65rem 0 0.25rem;
  }
}
</style>
