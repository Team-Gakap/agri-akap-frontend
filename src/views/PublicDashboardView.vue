<template>
  <ion-page>
    <ion-content :fullscreen="true" class="public-dash">
      <div class="public-shell">
        <header class="public-hero">
          <div class="hero-bg" aria-hidden="true"></div>
          <div class="hero-inner">
            <img src="@/assets/images/echague-logo.png" alt="Municipality of Echague seal" class="hero-logo" />
            <p class="hero-brand">AGRI-AKAP / MUNICIPAL AGRICULTURE OFFICE</p>
            <h1>Farmer Equity & Distribution</h1>
            <p class="hero-sub">{{ data.municipality || 'Echague, Isabela' }} · Public agricultural assistance indicators</p>
            <div class="hero-actions">
              <ion-button v-if="isAuthenticated" class="cta-primary" @click="goHome">Open full system</ion-button>
              <ion-button v-else class="cta-primary" router-link="/login">Staff sign in</ion-button>
            </div>
          </div>
        </header>

        <main class="dashboard-content">
          <form class="filter-bar" aria-label="Dashboard filters" @submit.prevent>
            <label>
              <span>Barangay</span>
              <select v-model="filters.barangay" aria-label="Filter by barangay">
                <option value="">All barangays</option>
                <option v-for="barangay in data.filters.barangays" :key="barangay" :value="barangay">{{ barangay }}</option>
              </select>
            </label>
            <label>
              <span>Commodity</span>
              <select v-model="filters.commodity" aria-label="Filter by commodity">
                <option value="">All commodities</option>
                <option value="Rice">Rice</option>
                <option value="Corn">Corn</option>
              </select>
            </label>
            <label>
              <span>Claim year</span>
              <select v-model="filters.year" aria-label="Filter claims by year">
                <option value="">All years</option>
                <option v-for="year in data.filters.years" :key="year" :value="String(year)">{{ year }}</option>
              </select>
            </label>
            <button class="clear-filters" type="button" @click="clearFilters">Clear filters</button>
            <span v-if="loading" class="filter-status" role="status">Updating…</span>
          </form>

          <p v-if="error" class="status-msg error" role="alert">{{ error }}</p>
          <div v-else>
            <section class="kpi-grid" aria-label="Key indicators">
              <article class="kpi kpi-green">
                <p class="kpi-value">{{ fmt(data.total_farmers) }}</p>
                <p class="kpi-label">Registered farmers</p>
                <p class="kpi-meta">{{ fmt(data.farmers_male) }} male · {{ fmt(data.farmers_female) }} female</p>
                <div class="split-meter" aria-label="Female share of registered farmers">
                  <span :style="{ width: femalePercent + '%' }"></span>
                </div>
              </article>
              <article class="kpi kpi-rose">
                <p class="kpi-value">{{ fmtPct(data.female_percent) }}%</p>
                <p class="kpi-label">Female registrants</p>
                <p class="kpi-meta">{{ fmt(data.farmers_female) }} women in the current registry</p>
              </article>
              <article class="kpi kpi-amber">
                <p class="kpi-value">{{ fmt(data.senior_total + data.priority_groups.pwd) }}</p>
                <p class="kpi-label">Senior & PWD farmers</p>
                <p class="kpi-meta">{{ fmt(data.senior_total) }} senior · {{ fmt(data.priority_groups.pwd) }} PWD, excluding overlap</p>
              </article>
              <article class="kpi kpi-blue">
                <p class="kpi-value">{{ fmtPct(data.subsidy_uptake_percent) }}%</p>
                <p class="kpi-label">Distribution claim rate</p>
                <p class="kpi-meta">{{ fmt(data.subsidy_beneficiaries_claimed) }} claimed of {{ fmt(data.subsidy_beneficiaries_enrolled) }} recorded</p>
                <div class="split-meter claimed-meter" aria-label="Distribution claim rate">
                  <span :style="{ width: `${Math.min(100, Number(data.subsidy_uptake_percent || 0))}%` }"></span>
                </div>
              </article>
            </section>

            <p class="scope-note">Year filters distribution activity. Farmer profiles and land area reflect the current registry; claim rate uses enrolled beneficiaries for the selected barangay and crop across all program years.</p>

            <section class="chart-grid" aria-label="Gender and priority breakdowns">
              <article class="panel">
                <div class="panel-heading"><div><p class="eyebrow">REGISTRY</p><h2>Farmers by recorded sex</h2></div><span class="panel-mark">01</span></div>
                <div class="chart-wrap doughnut-wrap"><Doughnut :data="sexChart" :options="doughnutOptions" /></div>
                <div class="legend-row"><span><i class="dot male"></i>Male {{ fmt(data.farmers_male) }}</span><span><i class="dot female"></i>Female {{ fmt(data.farmers_female) }}</span></div>
              </article>
              <article class="panel">
                <div class="panel-heading"><div><p class="eyebrow">ACCESSIBILITY</p><h2>Priority classification</h2></div><span class="panel-mark">02</span></div>
                <div class="chart-wrap doughnut-wrap"><Doughnut :data="priorityChart" :options="doughnutOptions" /></div>
                <div class="legend-row"><span><i class="dot senior"></i>Senior {{ fmt(data.priority_groups.senior) }}</span><span><i class="dot pwd"></i>PWD {{ fmt(data.priority_groups.pwd) }}</span><span><i class="dot regular"></i>Other {{ fmt(data.priority_groups.regular) }}</span></div>
                <p class="chart-note">Senior/PWD overlap: {{ fmt(data.priority_groups.senior_pwd_overlap) }} farmers, counted once.</p>
              </article>
              <article class="panel panel-wide">
                <div class="panel-heading"><div><p class="eyebrow">AGE & SEX</p><h2>Farmer age groups</h2></div><span class="panel-mark">03</span></div>
                <div class="chart-wrap"><Bar :data="ageChart" :options="groupedBarOptions" /></div>
              </article>
              <article class="panel panel-wide">
                <div class="panel-heading"><div><p class="eyebrow">DISTRIBUTION EQUITY</p><h2>Claims by sex and priority</h2></div><span class="panel-mark">04</span></div>
                <div class="chart-wrap"><Bar :data="claimsChart" :options="groupedBarOptions" /></div>
                <p class="chart-note">PWD and senior claimant counts use exclusive priority groups; a farmer who is both is counted as senior.</p>
              </article>
              <article class="panel panel-wide">
                <div class="panel-heading"><div><p class="eyebrow">FARM AREA</p><h2>Managed hectares by commodity & sex</h2></div><span class="panel-mark">05</span></div>
                <div class="chart-wrap"><Bar :data="areaChart" :options="groupedBarOptions" /></div>
              </article>
              <article class="panel panel-wide">
                <div class="panel-heading"><div><p class="eyebrow">BARANGAY COMPARISON</p><h2>Female and PWD inclusion</h2></div><span class="panel-mark">06</span></div>
                <div class="chart-wrap ranking-wrap"><Bar :data="barangayChart" :options="rankingOptions" /></div>
                <p v-if="!data.barangay_inclusion.length" class="empty-note">No farmer records match these filters.</p>
              </article>
            </section>

            <section class="panel activity-panel">
              <div class="panel-heading"><div><p class="eyebrow">RECENT ACTIVITY</p><h2>Distribution activity by day</h2></div><span class="panel-mark">07</span></div>
              <div class="table-scroll">
                <table>
                  <thead><tr><th>Claim date</th><th>Claimed</th><th>Pending sync</th><th>Total activity</th></tr></thead>
                  <tbody>
                    <tr v-for="row in data.recent_activity" :key="row.date">
                      <td>{{ formatDate(row.date) }}</td><td>{{ fmt(row.claimed) }}</td><td>{{ fmt(row.pending) }}</td><td>{{ fmt(row.claimed + row.pending) }}</td>
                    </tr>
                    <tr v-if="!data.recent_activity.length"><td colspan="4" class="empty-cell">No distribution activity for the selected filters.</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <aside class="data-caveat" aria-label="Data scope">
              <strong>Data scope</strong>
              <p>Records capture sex as male or female; gender identity is not collected. Senior and PWD categories can overlap. GAD budget utilization is not recorded here, so this dashboard supports sex-disaggregated monitoring but does not certify statutory GAD expenditure compliance.</p>
            </aside>
          </div>

          <footer class="public-footer"><p>Aggregated public indicators only. Individual farmer and transaction records are not displayed.</p></footer>
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue';
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Bar, Doughnut } from 'vue-chartjs';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';
import { homeForRole } from '@/router';

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, Title, Tooltip);

const router = useRouter();
const auth = useAuthStore();
const loading = ref(true);
const error = ref('');
const filters = reactive({ barangay: '', commodity: '', year: '' });
const data = reactive<any>({
  total_farmers: 0, farmers_male: 0, farmers_female: 0, pwd_male: 0, pwd_female: 0, pwd_total: 0,
  senior_total: 0, female_percent: 0, subsidy_uptake_percent: 0, subsidy_beneficiaries_claimed: 0,
  subsidy_beneficiaries_enrolled: 0, peak_disbursement: null, municipality: '', office: '',
  priority_groups: { senior: 0, pwd: 0, regular: 0, senior_pwd_overlap: 0 },
  age_distribution: [], claim_breakdown: {}, farm_area_by_commodity: [], barangay_inclusion: [], recent_activity: [],
  filters: { barangays: [], years: [] },
});

const isAuthenticated = computed(() => auth.isAuthenticated && homeForRole(auth.userRole) !== '/login');
const femalePercent = computed(() => Math.min(100, Number(data.female_percent || 0)));
const fmt = (value: unknown) => Number(value || 0).toLocaleString('en-PH');
const fmtPct = (value: unknown) => Number(value || 0).toFixed(Number(value || 0) % 1 ? 1 : 0);
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
const goHome = () => router.push(homeForRole(auth.userRole));

const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '63%', plugins: { legend: { display: false } } } as const;
const groupedBarOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8 } } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#e8ece8' } } },
};
const rankingOptions = {
  ...groupedBarOptions,
  indexAxis: 'y' as const,
  scales: { x: { beginAtZero: true, max: 100, ticks: { callback: (value: string | number) => `${value}%` } }, y: { grid: { display: false } } },
};

const sexChart = computed(() => ({
  labels: ['Male', 'Female'],
  datasets: [{ data: [data.farmers_male, data.farmers_female], backgroundColor: ['#3278a8', '#c54f73'], borderWidth: 0 }],
}));
const priorityChart = computed(() => ({
  labels: ['Senior', 'PWD', 'Other'],
  datasets: [{ data: [data.priority_groups.senior, data.priority_groups.pwd, data.priority_groups.regular], backgroundColor: ['#d59a20', '#3278a8', '#82918a'], borderWidth: 0 }],
}));
const ageChart = computed(() => ({
  labels: data.age_distribution.map((row: any) => row.age_group),
  datasets: [
    { label: 'Male', data: data.age_distribution.map((row: any) => row.male), backgroundColor: '#3278a8', borderRadius: 3 },
    { label: 'Female', data: data.age_distribution.map((row: any) => row.female), backgroundColor: '#c54f73', borderRadius: 3 },
  ],
}));
const claimsChart = computed(() => ({
  labels: ['Male', 'Female', 'PWD', 'Senior'],
  datasets: [
    { label: 'Claimed', data: ['male', 'female', 'pwd', 'senior'].map((key) => data.claim_breakdown[key]?.claimed || 0), backgroundColor: '#23845d', borderRadius: 3 },
    { label: 'Pending sync', data: ['male', 'female', 'pwd', 'senior'].map((key) => data.claim_breakdown[key]?.pending || 0), backgroundColor: '#d59a20', borderRadius: 3 },
  ],
}));
const areaChart = computed(() => ({
  labels: data.farm_area_by_commodity.map((row: any) => row.commodity),
  datasets: [
    { label: 'Male-managed ha', data: data.farm_area_by_commodity.map((row: any) => row.male_hectares), backgroundColor: '#3278a8', borderRadius: 3 },
    { label: 'Female-managed ha', data: data.farm_area_by_commodity.map((row: any) => row.female_hectares), backgroundColor: '#c54f73', borderRadius: 3 },
  ],
}));
const barangayChart = computed(() => ({
  labels: data.barangay_inclusion.map((row: any) => row.barangay),
  datasets: [
    { label: 'Female farmers', data: data.barangay_inclusion.map((row: any) => row.female_percent), backgroundColor: '#c54f73', borderRadius: 3 },
    { label: 'PWD farmers', data: data.barangay_inclusion.map((row: any) => row.pwd_percent), backgroundColor: '#3278a8', borderRadius: 3 },
  ],
}));

let requestSequence = 0;
const fetchSummary = async () => {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = '';
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    const response = await apiClient.get('/public/dashboard-summary', { params });
    if (sequence === requestSequence) Object.assign(data, response.data?.data || {});
  } catch (cause: any) {
    if (sequence === requestSequence) error.value = cause?.response?.data?.message || 'Could not load public dashboard summary.';
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
};
const clearFilters = () => {
  filters.barangay = '';
  filters.commodity = '';
  filters.year = '';
};

watch(() => [filters.barangay, filters.commodity, filters.year], () => void fetchSummary());
onMounted(() => void fetchSummary());
onBeforeUnmount(() => { requestSequence++; });
</script>

<style scoped>
.public-dash { --background: #f1f4ee; }
.public-shell { min-height: 100%; color: #1d3127; }
.public-hero { position: relative; overflow: hidden; color: #fff; padding: 1.7rem 1.25rem 1.5rem; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(115deg, rgba(20, 62, 43, .97), rgba(37, 91, 61, .92)), url('@/assets/images/echague-logo.png') 82% 45% / auto 190% no-repeat; }
.hero-inner { position: relative; max-width: 1240px; margin: 0 auto; }
.hero-logo { width: 46px; height: 46px; float: right; border-radius: 50%; background: #fff; object-fit: contain; }
.hero-brand, .eyebrow { margin: 0 0 .35rem; font-size: .68rem; font-weight: 800; letter-spacing: .08em; color: #e5c65a; }
.public-hero h1 { margin: 0; max-width: 680px; font-size: 1.8rem; line-height: 1.16; font-weight: 750; }
.hero-sub { margin: .45rem 0 0; color: rgba(255,255,255,.8); font-size: .9rem; }
.hero-actions { position: absolute; top: 0; right: 3.5rem; }
.cta-primary { --background: #e3bf45; --color: #1b3c2a; --border-radius: 6px; font-weight: 700; }
.dashboard-content { max-width: 1280px; margin: 0 auto; padding: 1.1rem 1.25rem 2rem; }
.filter-bar { display: flex; flex-wrap: wrap; align-items: end; gap: .75rem; padding: 0 0 1.05rem; border-bottom: 1px solid #d7dfd6; }
.filter-bar label { display: grid; gap: .3rem; min-width: 160px; color: #52645a; font-size: .72rem; font-weight: 750; }
.filter-bar select { min-height: 40px; padding: .45rem 2rem .45rem .65rem; border: 1px solid #c6d1c6; border-radius: 5px; background: #fff; color: #1d3127; font: inherit; font-size: .86rem; }
.clear-filters { min-height: 40px; padding: .4rem .7rem; border: 1px solid #b8c8b9; border-radius: 5px; background: transparent; color: #245c3f; font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; }
.filter-status { margin-left: auto; padding-bottom: .6rem; color: #64776b; font-size: .78rem; }
.status-msg { padding: 1.5rem 0; color: #475569; }.status-msg.error { color: #a52635; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; margin-top: 1rem; }
.kpi { min-width: 0; padding: .9rem 1rem .85rem; border: 1px solid #dbe3da; border-top: 3px solid #23845d; background: #fff; }
.kpi-rose { border-top-color: #c54f73; }.kpi-amber { border-top-color: #d59a20; }.kpi-blue { border-top-color: #3278a8; }
.kpi-value { margin: 0; color: #1c4b34; font-size: 1.65rem; font-weight: 800; line-height: 1.1; }
.kpi-label { margin: .35rem 0 0; color: #43594c; font-size: .72rem; font-weight: 800; text-transform: uppercase; }
.kpi-meta { min-height: 1.25rem; margin: .3rem 0 0; color: #6a786f; font-size: .78rem; line-height: 1.3; }
.split-meter { height: 5px; margin-top: .55rem; overflow: hidden; background: #e8ece8; }.split-meter span { display: block; height: 100%; background: #c54f73; transition: width .25s ease; }.claimed-meter span { background: #23845d; }
.scope-note { margin: .65rem 0 0; color: #69766e; font-size: .75rem; }
.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; margin-top: 1rem; }
.panel { min-width: 0; padding: .95rem 1rem .8rem; border: 1px solid #dbe3da; background: #fff; }
.panel-wide { grid-column: span 1; }.panel-heading { display: flex; align-items: start; justify-content: space-between; gap: .5rem; }
.panel-heading .eyebrow { margin-bottom: .2rem; color: #63806e; font-size: .62rem; }.panel h2 { margin: 0; color: #203c2d; font-size: 1rem; font-weight: 750; }
.panel-mark { color: #91a397; font-size: .68rem; font-weight: 800; }.chart-wrap { position: relative; height: 240px; margin-top: .55rem; }.doughnut-wrap { width: min(100%, 245px); height: 185px; margin: .5rem auto .15rem; }
.legend-row { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem 1rem; color: #56675d; font-size: .75rem; }.legend-row span { display: inline-flex; align-items: center; gap: .35rem; }.dot { width: 9px; height: 9px; border-radius: 50%; }.dot.male { background: #3278a8; }.dot.female { background: #c54f73; }.dot.senior { background: #d59a20; }.dot.pwd { background: #3278a8; }.dot.regular { background: #82918a; }
.chart-note, .empty-note { margin: .45rem 0 0; color: #728077; font-size: .72rem; line-height: 1.35; text-align: center; }.ranking-wrap { height: 270px; }.activity-panel { margin-top: .75rem; }.table-scroll { overflow-x: auto; margin-top: .7rem; }table { width: 100%; border-collapse: collapse; text-align: left; font-size: .8rem; }th, td { padding: .65rem .55rem; border-bottom: 1px solid #e7ece6; }th { color: #64766b; font-size: .68rem; text-transform: uppercase; }tbody tr:last-child td { border-bottom: 0; }.empty-cell { padding: 1.2rem; color: #718078; text-align: center; }
.data-caveat { margin-top: .75rem; padding: .8rem 1rem; border-left: 3px solid #d59a20; background: #f8f5e9; color: #526153; font-size: .76rem; line-height: 1.45; }.data-caveat strong { color: #354c3c; }.data-caveat p { margin: .25rem 0 0; }
.public-footer { padding: 1rem .3rem 0; color: #718078; font-size: .76rem; text-align: center; }
@media (min-width: 960px) { .panel-wide { grid-column: span 1; }.chart-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }.chart-grid .panel:nth-child(3), .chart-grid .panel:nth-child(4), .chart-grid .panel:nth-child(5), .chart-grid .panel:nth-child(6) { grid-column: span 1; } }
@media (max-width: 760px) { .hero-actions { position: static; margin-top: .65rem; }.hero-logo { width: 38px; height: 38px; }.public-hero h1 { max-width: 80%; font-size: 1.55rem; }.kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.chart-grid { grid-template-columns: 1fr; }.panel-wide { grid-column: auto; }.filter-bar label { flex: 1 1 140px; }.filter-status { width: 100%; margin: 0; padding: 0; } }
@media (max-width: 420px) { .dashboard-content { padding-inline: .75rem; }.public-hero { padding-inline: .9rem; }.kpi { padding: .75rem; }.kpi-value { font-size: 1.4rem; }.panel { padding-inline: .75rem; }.chart-wrap { height: 220px; }.doughnut-wrap { height: 180px; } }
</style>
