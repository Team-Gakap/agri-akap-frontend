<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>4-Tier Analytics</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="loadDashboard">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-segment :value="tier" @ionChange="onTierChange">
          <ion-segment-button value="descriptive">
            <ion-label>Descriptive</ion-label>
          </ion-segment-button>
          <ion-segment-button value="diagnostic">
            <ion-label>Diagnostic</ion-label>
          </ion-segment-button>
          <ion-segment-button value="predictive">
            <ion-label>Predictive</ion-label>
          </ion-segment-button>
          <ion-segment-button value="prescriptive">
            <ion-label>Prescriptive</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="shell">
        <header class="intro">
          <p class="eyebrow">AGRI-AKAP · Municipal Agriculture Office</p>
          <h1>{{ tierTitle }}</h1>
          <p class="lede">{{ tierBlurb }}</p>
          <ion-badge v-if="usingMock" color="warning">Showing layout mock — API unavailable</ion-badge>
        </header>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Compiling analytics…</p>
        </div>

        <template v-else>
          <!-- TAB 1: Descriptive -->
          <section v-if="tier === 'descriptive'" class="tier-panel">
            <div class="kpi-grid">
              <ion-card class="kpi-card" v-for="k in descriptiveKpis" :key="k.label">
                <ion-card-content>
                  <p class="kpi-value">{{ k.value }}</p>
                  <p class="kpi-label">{{ k.label }}</p>
                </ion-card-content>
              </ion-card>
            </div>

            <ion-card class="chart-card">
              <ion-card-header>
                <ion-card-subtitle>Descriptive</ion-card-subtitle>
                <ion-card-title>Subsidies Distributed by Barangay</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="chart-box">
                  <Bar :data="subsidyBarData" :options="barOptions" />
                </div>
              </ion-card-content>
            </ion-card>
          </section>

          <!-- TAB 2: Diagnostic -->
          <section v-else-if="tier === 'diagnostic'" class="tier-panel">
            <div class="split">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-subtitle>Diagnostic</ion-card-subtitle>
                  <ion-card-title>Pest Outbreaks by Crop Stage</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="chart-box doughnut">
                    <Doughnut :data="pestDoughnutData" :options="doughnutOptions" />
                  </div>
                </ion-card-content>
              </ion-card>

              <ion-card class="list-card">
                <ion-card-header>
                  <ion-card-subtitle>Where vulnerabilities concentrate</ion-card-subtitle>
                  <ion-card-title>By Barangay</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ul class="diag-list">
                    <li v-for="b in diagnostic.by_barangay" :key="b.barangay">
                      <div>
                        <strong>{{ b.barangay }}</strong>
                        <span>{{ b.outbreaks }} outbreak(s)</span>
                      </div>
                      <em>{{ b.total }} reports</em>
                    </li>
                    <li v-if="!diagnostic.by_barangay?.length" class="empty">No pest diagnostic data yet.</li>
                  </ul>
                </ion-card-content>
              </ion-card>
            </div>
          </section>

          <!-- TAB 3: Predictive -->
          <section v-else-if="tier === 'predictive'" class="tier-panel">
            <ion-card class="list-card">
              <ion-card-header>
                <ion-card-subtitle>Predictive</ion-card-subtitle>
                <ion-card-title>Upcoming Harvests by Barangay</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div v-if="!predictive.by_barangay?.length" class="empty-block">
                  No active planting logs to project harvest dates.
                </div>
                <article
                  v-for="group in predictive.by_barangay"
                  :key="group.barangay"
                  class="harvest-group"
                >
                  <header>
                    <h3>{{ group.barangay }}</h3>
                    <ion-badge color="primary">
                      Next {{ formatDate(group.next_harvest_date) }}
                    </ion-badge>
                  </header>
                  <p class="group-meta">
                    {{ group.count }} active field(s) · {{ group.total_area_ha }} ha
                  </p>
                  <ul>
                    <li v-for="item in group.items" :key="item.planting_log_id">
                      <div>
                        <strong>{{ item.crop_type }}</strong>
                        <span>{{ item.farmer_name }} · {{ item.area_planted }} ha</span>
                      </div>
                      <time>{{ formatDate(item.estimated_harvest_date) }}</time>
                    </li>
                  </ul>
                </article>
              </ion-card-content>
            </ion-card>
          </section>

          <!-- TAB 4: Prescriptive -->
          <section v-else class="tier-panel">
            <ion-card class="action-center">
              <ion-card-header>
                <ion-card-subtitle>Prescriptive</ion-card-subtitle>
                <ion-card-title>Action Center</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div v-if="!prescriptive.actions?.length" class="empty-block">
                  No automated recommendations right now. System is monitoring weather and damage feeds.
                </div>
                <ul class="action-list">
                  <li
                    v-for="action in prescriptive.actions"
                    :key="action.id"
                    :class="['action-item', action.priority]"
                  >
                    <div class="action-copy">
                      <div class="action-top">
                        <ion-badge :color="priorityColor(action.priority)">{{ action.priority }}</ion-badge>
                        <h3>{{ action.title }}</h3>
                      </div>
                      <p>{{ action.recommendation }}</p>
                    </div>
                    <ion-button
                      class="cta-btn"
                      :class="action.type"
                      @click="handleAction(action)"
                    >
                      {{ action.cta }}
                    </ion-button>
                  </li>
                </ul>
              </ion-card-content>
            </ion-card>
          </section>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, toastController,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from 'chart.js';
import apiClient from '@/utils/axios';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const LGU_GREEN = '#1a4731';
const LGU_GOLD = '#d4af37';

type Tier = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';

const router = useRouter();
const tier = ref<Tier>('descriptive');
const loading = ref(true);
const usingMock = ref(false);

const descriptive = ref<any>({});
const diagnostic = ref<any>({ by_crop_stage: [], by_barangay: [] });
const predictive = ref<any>({ by_barangay: [], upcoming_harvests: [] });
const prescriptive = ref<any>({ actions: [] });

/** Layout mock used when API is unreachable — structure matches Laravel payload */
const MOCK_PAYLOAD = {
  descriptive: {
    total_farmers: 12480,
    total_hectares_planted: 8942.5,
    total_subsidy_items: 18640,
    total_subsidy_claims: 4210,
    subsidies_by_barangay: [
      { barangay: 'San Fabian', claim_count: 420, total_quantity: 2100 },
      { barangay: 'Soyung', claim_count: 380, total_quantity: 1880 },
      { barangay: 'Annafunan', claim_count: 310, total_quantity: 1550 },
      { barangay: 'Dicamay', claim_count: 280, total_quantity: 1400 },
      { barangay: 'Ipil', claim_count: 260, total_quantity: 1290 },
      { barangay: 'Mabuhay', claim_count: 240, total_quantity: 1180 },
    ],
  },
  diagnostic: {
    by_crop_stage: [
      { crop_stage: 'Seedling', total: 28 },
      { crop_stage: 'Vegetative', total: 46 },
      { crop_stage: 'Reproductive', total: 19 },
      { crop_stage: 'Maturity', total: 11 },
    ],
    by_barangay: [
      { barangay: 'San Fabian', total: 22, outbreaks: 4 },
      { barangay: 'Buneg', total: 15, outbreaks: 2 },
      { barangay: 'Camarag', total: 12, outbreaks: 1 },
    ],
    matrix: [],
  },
  predictive: {
    upcoming_harvests: [],
    by_barangay: [
      {
        barangay: 'San Fabian',
        count: 3,
        total_area_ha: 4.2,
        next_harvest_date: '2026-09-18',
        items: [
          {
            planting_log_id: '1',
            farmer_name: 'Reyes, Maria',
            crop_type: 'Rice',
            area_planted: 1.5,
            estimated_harvest_date: '2026-09-18',
          },
          {
            planting_log_id: '2',
            farmer_name: 'Mendoza, Carlos',
            crop_type: 'Corn',
            area_planted: 1.2,
            estimated_harvest_date: '2026-09-25',
          },
        ],
      },
      {
        barangay: 'Annafunan',
        count: 2,
        total_area_ha: 2.8,
        next_harvest_date: '2026-10-02',
        items: [
          {
            planting_log_id: '3',
            farmer_name: 'Torres, Ricardo',
            crop_type: 'Rice',
            area_planted: 2.8,
            estimated_harvest_date: '2026-10-02',
          },
        ],
      },
    ],
  },
  prescriptive: {
    actions: [
      {
        id: 'relief-San Fabian',
        type: 'allocate_relief',
        priority: 'critical',
        barangay: 'San Fabian',
        title: 'Buffer seed allocation — San Fabian',
        recommendation: 'Recommend allocating 120 buffer seed bags to San Fabian (avg damage 54% across 3 assessments, 2.80 ha affected).',
        cta: 'Allocate Relief',
      },
      {
        id: 'weather-Soyung',
        type: 'sms_advisory',
        priority: 'high',
        barangay: 'Soyung',
        title: 'Weather advisory — Soyung',
        recommendation: 'Draft SMS advisory for Soyung: elevated risk (rain 88%) in the next 72 hours.',
        cta: 'Draft SMS Advisory',
      },
    ],
    generated_at: new Date().toISOString(),
  },
};

const tierTitle = computed(() => ({
  descriptive: 'Descriptive Analytics',
  diagnostic: 'Diagnostic Analytics',
  predictive: 'Predictive Analytics',
  prescriptive: 'Prescriptive Analytics',
}[tier.value]));

const tierBlurb = computed(() => ({
  descriptive: 'What happened — registry scale, planted area, and subsidy outflow.',
  diagnostic: 'Why it happened — pest pressure by crop stage and barangay.',
  predictive: 'What will happen — harvest windows from active planting logs.',
  prescriptive: 'What we should do — relief allocation and advisory actions.',
}[tier.value]));

const descriptiveKpis = computed(() => [
  { label: 'Total Farmers', value: Number(descriptive.value.total_farmers ?? 0).toLocaleString() },
  { label: 'Total Hectares Planted', value: `${Number(descriptive.value.total_hectares_planted ?? 0).toLocaleString()} ha` },
  { label: 'Subsidy Items Dispensed', value: Number(descriptive.value.total_subsidy_items ?? 0).toLocaleString() },
  { label: 'Subsidy Claims', value: Number(descriptive.value.total_subsidy_claims ?? 0).toLocaleString() },
]);

const subsidyBarData = computed(() => {
  const rows = descriptive.value.subsidies_by_barangay ?? [];
  return {
    labels: rows.map((r: any) => r.barangay),
    datasets: [
      {
        label: 'Quantity released',
        data: rows.map((r: any) => r.total_quantity),
        backgroundColor: LGU_GREEN,
        hoverBackgroundColor: LGU_GOLD,
        borderRadius: 6,
        maxBarThickness: 36,
      },
    ],
  };
});

const pestDoughnutData = computed(() => {
  const rows = diagnostic.value.by_crop_stage ?? [];
  const palette = [LGU_GREEN, LGU_GOLD, '#2d6a4f', '#e8c96a', '#40916c', '#94a3b8'];
  return {
    labels: rows.map((r: any) => r.crop_stage),
    datasets: [
      {
        data: rows.map((r: any) => r.total),
        backgroundColor: rows.map((_: any, i: number) => palette[i % palette.length]),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: LGU_GREEN, titleColor: '#fff', bodyColor: LGU_GOLD },
  },
  scales: {
    x: { ticks: { color: '#64748b', maxRotation: 45, minRotation: 0 }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(26,71,49,0.08)' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '58%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, usePointStyle: true, boxWidth: 10 },
    },
  },
};

const onTierChange = (e: CustomEvent) => {
  tier.value = e.detail.value as Tier;
};

const applyPayload = (payload: any) => {
  descriptive.value = payload.descriptive ?? {};
  diagnostic.value = payload.diagnostic ?? { by_crop_stage: [], by_barangay: [] };
  predictive.value = payload.predictive ?? { by_barangay: [] };
  prescriptive.value = payload.prescriptive ?? { actions: [] };
};

const loadDashboard = async () => {
  loading.value = true;
  usingMock.value = false;
  try {
    const res = await apiClient.get('/analytics/dashboard');
    applyPayload(res.data?.data ?? {});
  } catch {
    usingMock.value = true;
    applyPayload(MOCK_PAYLOAD);
  } finally {
    loading.value = false;
  }
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const priorityColor = (p: string) => {
  if (p === 'critical') return 'danger';
  if (p === 'high') return 'warning';
  if (p === 'medium') return 'primary';
  return 'medium';
};

const handleAction = async (action: any) => {
  if (action.type === 'sms_advisory') {
    await router.push({
      path: '/admin/broadcasts',
      query: { barangay: action.barangay, draft: action.recommendation },
    });
    return;
  }
  const t = await toastController.create({
    message: `Queued for MAO operations: ${action.title}`,
    duration: 2600,
    color: 'success',
    position: 'top',
  });
  await t.present();
};

onMounted(() => loadDashboard());
</script>

<style scoped>
.page-bg {
  --background: linear-gradient(165deg, #eef5f0 0%, #f8faf8 50%, #e8f0ea 100%);
}
.shell { max-width: 1180px; margin: 0 auto; padding: 1.1rem 1rem 2.5rem; }

.intro { margin-bottom: 1rem; }
.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #d4af37;
}
.intro h1 {
  margin: 0.25rem 0 0;
  font-size: clamp(1.4rem, 3vw, 1.85rem);
  font-weight: 900;
  color: #1a4731;
}
.lede {
  margin: 0.35rem 0 0.5rem;
  color: #64748b;
  font-size: 0.92rem;
  max-width: 40rem;
}

.center-state { text-align: center; padding: 3rem 1rem; color: #64748b; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.kpi-card {
  margin: 0;
  border-radius: 14px;
  border: 1px solid #d5e3da;
  box-shadow: 0 6px 16px rgba(26, 71, 49, 0.05);
}
.kpi-value {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 900;
  color: #1a4731;
}
.kpi-label {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
}

.chart-card, .list-card, .action-center {
  margin: 0 0 1rem;
  border-radius: 16px;
  border: 1px solid #d5e3da;
  background: #fff;
}
ion-card-subtitle {
  color: #d4af37;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.68rem;
}
ion-card-title {
  color: #1a4731;
  font-weight: 800;
  font-size: 1.05rem;
}
.chart-box { height: 320px; position: relative; }
.chart-box.doughnut { height: 280px; }

.split {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1rem;
}

.diag-list, .action-list, .harvest-group ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.diag-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid #eef2f0;
}
.diag-list strong { display: block; color: #1a4731; }
.diag-list span { font-size: 0.75rem; color: #94a3b8; }
.diag-list em { font-style: normal; font-weight: 800; color: #1a4731; }

.harvest-group {
  border: 1px solid #e2ebe5;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  background: #f8fbf9;
}
.harvest-group header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.harvest-group h3 {
  margin: 0;
  color: #1a4731;
  font-size: 1.05rem;
  font-weight: 800;
}
.group-meta {
  margin: 0.25rem 0 0.65rem;
  font-size: 0.8rem;
  color: #64748b;
}
.harvest-group li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-top: 1px dashed #dce7e0;
  font-size: 0.88rem;
}
.harvest-group strong { color: #1a4731; display: block; }
.harvest-group span { color: #64748b; font-size: 0.78rem; }
.harvest-group time { font-weight: 800; color: #8a6d12; white-space: nowrap; }

.action-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.85rem;
  align-items: center;
  padding: 0.95rem;
  border-radius: 12px;
  border: 1px solid #d5e3da;
  margin-bottom: 0.7rem;
  background: #fff;
}
.action-item.critical {
  border-color: #fecaca;
  background: #fff7f7;
}
.action-item.high {
  border-color: #fde68a;
  background: #fffbeb;
}
.action-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}
.action-top h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: #1a4731;
}
.action-copy p {
  margin: 0;
  font-size: 0.86rem;
  color: #475569;
  line-height: 1.45;
}
.cta-btn {
  --background: #1a4731;
  --color: #fff;
  text-transform: none;
  font-weight: 800;
  white-space: nowrap;
}
.cta-btn.allocate_relief {
  --background: #d4af37;
  --color: #1a4731;
}

.empty, .empty-block {
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 1rem 0;
}

@media (max-width: 960px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .split { grid-template-columns: 1fr; }
  .action-item { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
