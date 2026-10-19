<template>
  <section class="predict-panel">
    <div v-if="loading && !summary.generated_at" class="center-state">
      <ion-spinner name="crescent" color="primary"></ion-spinner>
      <p>Building yield and risk forecasts&hellip;</p>
    </div>

    <div v-else-if="error && !summary.generated_at" class="center-state error">
      <p>{{ error }}</p>
      <ion-button @click="load">Retry</ion-button>
    </div>

    <div v-else class="page">
          <header class="page-head">
            <div>
              <h1>Predictive Analytics</h1>
              <p>
                {{ summary.season }} {{ summary.year }} forecast from harvest history, planted area, and seasonal weather.
                Generated {{ summary.generated_at }}.
              </p>
            </div>
            <div class="filters" role="group" aria-label="Commodity filter">
              <button
                v-for="option in commodityOptions"
                :key="option"
                type="button"
                class="filter-btn"
                :class="{ active: commodity === option }"
                @click="setCommodity(option)"
              >
                {{ option === 'All' ? 'All commodities' : option }}
              </button>
            </div>
          </header>

          <div class="kpi-row">
            <article class="kpi-card">
              <p class="kpi-label">Projected yield</p>
              <p class="kpi-value">{{ fmtMt(summary.projected_mt) }} <small>MT</small></p>
              <p class="kpi-hint">{{ summary.season }} season · active planted area</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-label">{{ varianceLabel }}</p>
              <p class="kpi-value" :class="varianceClass">
                {{ signedMt(summary.surplus_shortfall_mt) }} <small>MT</small>
              </p>
              <p class="kpi-hint">Versus {{ summary.season }} {{ Number(summary.year) - 1 }} harvest</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-label">High-risk barangays</p>
              <p class="kpi-value">{{ fmt(summary.high_risk_barangays) }}</p>
              <p class="kpi-hint">Drought, typhoon, or flood exposure at High</p>
            </article>
            <article class="kpi-card">
              <p class="kpi-label">Replacement seedling bags</p>
              <p class="kpi-value">{{ fmt(summary.suggested_buffer_bags) }}</p>
              <p class="kpi-hint">{{ summary.bags_per_at_risk_hectare }} bags per at-risk hectare</p>
            </article>
          </div>

          <p v-if="assumedOnly" class="assumption-note">
            No harvest history yet for this filter. Projections use the municipal assumed yield so buffer planning can still start.
          </p>

          <div class="chart-grid">
            <section class="panel-card">
              <header class="panel-head">
                <div>
                  <h2>Municipal yield forecast</h2>
                  <p>Historical {{ summary.season }} harvest versus this season's projection</p>
                </div>
              </header>
              <div v-if="commodities.length" class="chart-box">
                <Bar :data="yieldChartData" :options="chartOptions" />
              </div>
              <p v-else class="empty-note">No harvest or planting records for this commodity.</p>
            </section>

            <section class="panel-card">
              <header class="panel-head">
                <div>
                  <h2>Projected yield by barangay</h2>
                  <p>{{ barangayChartNote }}</p>
                </div>
              </header>
              <div v-if="barangayChartRows.length" class="chart-box tall">
                <Bar :data="barangayChartData" :options="horizontalOptions" />
              </div>
              <p v-else class="empty-note">No active planted area to project.</p>
            </section>

            <section class="panel-card span-2">
              <header class="panel-head">
                <div>
                  <h2>Agricultural risk</h2>
                  <p>Drought vulnerability and typhoon or flood exposure</p>
                </div>
              </header>
              <div v-if="riskChartRows.length" class="chart-box">
                <Bar :data="riskChartData" :options="chartOptions" />
              </div>
              <p v-else class="empty-note">Risk indicators appear once a barangay has planted area.</p>
            </section>
          </div>

          <section class="panel-card">
            <header class="panel-head">
              <div>
                <h2>Barangay planning table</h2>
                <p>{{ summary.formula }}</p>
              </div>
            </header>
            <div v-if="barangays.length" class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Barangay</th>
                    <th>Commodity</th>
                    <th>Planted ha</th>
                    <th>Projected MT</th>
                    <th>Vs last season</th>
                    <th>Confidence</th>
                    <th>Risk</th>
                    <th>Buffer bags</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in barangays" :key="row.barangay + row.commodity">
                    <td>{{ row.barangay }}</td>
                    <td>{{ row.commodity }}</td>
                    <td>{{ fmtHa(row.planted_ha) }}</td>
                    <td>{{ fmtMt(row.projected_mt) }}</td>
                    <td :class="varianceClassFor(row.variance_mt)">
                      <template v-if="row.has_last_season">{{ signedMt(row.variance_mt) }}</template>
                      <template v-else>No prior season</template>
                    </td>
                    <td>
                      <span class="pill">{{ confidenceLabel(row) }}</span>
                    </td>
                    <td>
                      <span class="pill" :class="riskClass(row.risk_level)">{{ row.risk_level }}</span>
                      <span v-if="row.drought_flag" class="flag">Drought</span>
                      <span v-if="row.typhoon_flag" class="flag">Typhoon</span>
                    </td>
                    <td>{{ fmt(row.buffer_bags) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty-note">Planting records will populate this table.</p>
            <p class="method">{{ summary.method_note }}</p>
          </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { IonSpinner, IonButton } from '@ionic/vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import apiClient from '@/utils/axios';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const LGU_GREEN = '#1A4731';
const LGU_GOLD = '#D4AF37';
const DROUGHT = '#C2410C';
const TYPHOON = '#1D4ED8';

type CommodityFilter = 'All' | 'Rice' | 'Corn' | 'HVCC';

interface HistoryPoint {
  year: number;
  season: string;
  total_yield_mt: number;
  area_ha: number;
}

interface CommoditySeries {
  commodity: string;
  history: HistoryPoint[];
  projection: {
    year: number;
    season: string;
    projected_mt: number;
    confidence: string;
  };
}

interface BarangayRow {
  barangay: string;
  commodity: string;
  planted_ha: number;
  projected_mt: number;
  last_season_mt: number;
  has_last_season: boolean;
  variance_mt: number;
  yield_kg_per_ha: number;
  yield_source: string;
  confidence: string;
  drought_score: number;
  typhoon_score: number;
  risk_score: number;
  risk_level: string;
  drought_flag: boolean;
  typhoon_flag: boolean;
  buffer_bags: number;
}

interface Summary {
  season: string;
  year: number;
  projected_mt: number;
  last_season_mt: number;
  surplus_shortfall_mt: number;
  direction: string;
  high_risk_barangays: number;
  suggested_buffer_bags: number;
  generated_at: string;
  method_note: string;
  formula: string;
  bags_per_at_risk_hectare: number;
}

const commodityOptions: CommodityFilter[] = ['All', 'Rice', 'Corn', 'HVCC'];
const commodity = ref<CommodityFilter>('All');
const loading = ref(true);
const error = ref('');
const summary = ref<Summary>({
  season: '',
  year: new Date().getFullYear(),
  projected_mt: 0,
  last_season_mt: 0,
  surplus_shortfall_mt: 0,
  direction: 'balanced',
  high_risk_barangays: 0,
  suggested_buffer_bags: 0,
  generated_at: '',
  method_note: '',
  formula: '',
  bags_per_at_risk_hectare: 4,
});
const commodities = ref<CommoditySeries[]>([]);
const barangays = ref<BarangayRow[]>([]);

const fmt = (v: unknown) => Number(v ?? 0).toLocaleString('en-PH');
const fmtHa = (v: unknown) => Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const fmtMt = (v: unknown) => Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signedMt(value: unknown) {
  const n = Number(value ?? 0);
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${fmtMt(n)}`;
}

const varianceLabel = computed(() => {
  if (summary.value.direction === 'shortfall') return 'Production shortfall';
  if (summary.value.direction === 'surplus') return 'Production surplus';
  return 'On last season';
});

const varianceClass = computed(() => ({
  surplus: summary.value.direction === 'surplus',
  shortfall: summary.value.direction === 'shortfall',
}));

const assumedOnly = computed(() =>
  barangays.value.length > 0 && barangays.value.every((row) => row.yield_source === 'assumed')
);

const barangayChartRows = computed(() => barangays.value.slice(0, 12));
const barangayChartNote = computed(() =>
  barangays.value.length > 12
    ? 'Top 12 barangays by projected metric tons'
    : 'Metric tons expected from current planted area'
);

const riskChartRows = computed(() =>
  [...barangays.value].sort((a, b) => b.risk_score - a.risk_score).slice(0, 12)
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

const horizontalOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

const yieldChartData = computed(() => {
  const labels = commodities.value.map((row) => row.commodity);
  const lastHist = commodities.value.map((row) => {
    const last = row.history[row.history.length - 1];
    return last ? last.total_yield_mt : 0;
  });
  const projected = commodities.value.map((row) => row.projection.projected_mt);
  return {
    labels,
    datasets: [
      { label: 'Last recorded season (MT)', data: lastHist, backgroundColor: LGU_GOLD },
      { label: 'Projected (MT)', data: projected, backgroundColor: LGU_GREEN },
    ],
  };
});

const barangayChartData = computed(() => ({
  labels: barangayChartRows.value.map((row) => `${row.barangay} · ${row.commodity}`),
  datasets: [
    {
      label: 'Projected MT',
      data: barangayChartRows.value.map((row) => row.projected_mt),
      backgroundColor: LGU_GREEN,
    },
  ],
}));

const riskChartData = computed(() => ({
  labels: riskChartRows.value.map((row) => row.barangay),
  datasets: [
    {
      label: 'Drought',
      data: riskChartRows.value.map((row) => row.drought_score),
      backgroundColor: DROUGHT,
    },
    {
      label: 'Typhoon / flood',
      data: riskChartRows.value.map((row) => row.typhoon_score),
      backgroundColor: TYPHOON,
    },
  ],
}));

function varianceClassFor(value: number) {
  if (value > 0.05) return 'surplus';
  if (value < -0.05) return 'shortfall';
  return '';
}

function riskClass(level: string) {
  if (level === 'High') return 'risk-high';
  if (level === 'Moderate') return 'risk-mid';
  return 'risk-low';
}

function confidenceLabel(row: BarangayRow) {
  if (row.yield_source === 'assumed') return 'Assumed yield';
  if (row.yield_source === 'municipal_average') return `${row.confidence} · municipal`;
  return row.confidence;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params = commodity.value === 'All' ? {} : { commodity: commodity.value };
    const res = await apiClient.get('/dashboard/predictive-analytics', { params });
    const data = res.data?.data ?? {};
    summary.value = { ...summary.value, ...(data.summary ?? {}) };
    commodities.value = data.commodities ?? [];
    barangays.value = data.barangays ?? [];
  } catch {
    error.value = 'The yield forecast could not be loaded.';
  } finally {
    loading.value = false;
  }
}

function setCommodity(option: CommodityFilter) {
  if (commodity.value === option) return;
  commodity.value = option;
  load();
}

onMounted(() => {
  load();
  window.addEventListener('akap:refresh', load);
});
onBeforeUnmount(() => window.removeEventListener('akap:refresh', load));
</script>

<style scoped>
.predict-panel { min-width: 0; }
.center-state {
  min-height: 8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #475569;
}
.center-state.error { color: #9f1239; }
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.page-head h1 {
  margin: 0;
  font-size: 1.45rem;
  color: #0f172a;
}
.page-head p {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.86rem;
  max-width: 42rem;
}
.filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.filter-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
}
.filter-btn.active {
  background: #1A4731;
  border-color: #1A4731;
  color: #fff;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}
.kpi-card, .panel-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.kpi-card { padding: 0.9rem 1rem; }
.kpi-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}
.kpi-value {
  margin: 0.25rem 0 0;
  font-size: 1.55rem;
  font-weight: 800;
  color: #0f172a;
}
.kpi-value small { font-size: 0.75rem; color: #64748b; }
.kpi-hint { margin: 0.3rem 0 0; font-size: 0.72rem; color: #64748b; }
.surplus { color: #166534; }
.shortfall { color: #9f1239; }
.assumption-note, .method, .empty-note {
  color: #64748b;
  font-size: 0.8rem;
}
.assumption-note {
  margin: 0 0 0.9rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  background: #fffbeb;
  color: #92400e;
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.span-2 { grid-column: 1 / -1; }
.panel-card { padding: 0.9rem 1rem 1rem; }
.panel-head h2 { margin: 0; font-size: 1rem; color: #0f172a; }
.panel-head p { margin: 0.25rem 0 0; font-size: 0.75rem; color: #64748b; }
.chart-box { height: 260px; margin-top: 0.8rem; position: relative; }
.chart-box.tall { height: 320px; }
.table-wrap { overflow-x: auto; margin-top: 0.6rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
th, td { text-align: left; padding: 0.55rem 0.45rem; border-bottom: 1px solid #E2E8F0; white-space: nowrap; }
th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; }
.pill {
  display: inline-block;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  background: #f1f5f9;
  font-weight: 700;
  font-size: 0.72rem;
}
.risk-high { background: #fee2e2; color: #991b1b; }
.risk-mid { background: #ffedd5; color: #9a3412; }
.risk-low { background: #dcfce7; color: #166534; }
.flag {
  display: inline-block;
  margin-left: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #1e3a8a;
}
.method { margin: 0.8rem 0 0; line-height: 1.45; }
@media (max-width: 900px) {
  .kpi-row, .chart-grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: auto; }
}
</style>
