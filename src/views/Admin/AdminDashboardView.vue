<template>
  <ion-page>
    <AppHeader />

    <ion-content class="dashboard-bg">
      <div class="shell">
        <div v-if="initialLoading" class="center-state no-print">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading live municipal overview&hellip;</p>
        </div>

        <div v-else-if="error && !hasData" class="center-state error no-print">
          <p>{{ error }}</p>
          <ion-button @click="fetchAll">Retry</ion-button>
        </div>

        <div v-else class="grid-shell no-print">
          <!-- ── 1. Descriptive KPIs ────────────────────────────────────── -->
          <button class="kpi-card span-3" type="button" @click="go('/admin/farmers')">
            <div class="kpi-icon-wrap kpi-tone-green">
              <ion-icon :icon="peopleOutline"></ion-icon>
            </div>
            <p class="kpi-value">{{ fmt(descriptive.total_farmers) }}</p>
            <p class="kpi-label">Registered Farmers</p>
            <p class="kpi-meta">
              {{ fmt(descriptive.farmers_male) }} M · {{ fmt(descriptive.farmers_female) }} F
            </p>
            <p class="kpi-hint">{{ fmt(descriptive.rsbsa_verified) }} RSBSA on file</p>
          </button>

          <button class="kpi-card span-3" type="button" @click="go('/admin/farmers')">
            <div class="kpi-icon-wrap kpi-tone-gold">
              <ion-icon :icon="leafOutline"></ion-icon>
            </div>
            <p class="kpi-value">{{ fmtHa(descriptive.registered_land_ha ?? descriptive.total_hectares) }} <small>ha</small></p>
            <p class="kpi-label">Farm Area</p>
            <p class="kpi-hint">
              {{ fmt(descriptive.farmers_with_area) }} farmers with area · avg {{ fmtHa(descriptive.avg_farm_area_ha) }} ha
            </p>
          </button>

          <button class="kpi-card span-3" type="button" @click="go('/admin/subsidies')">
            <div class="kpi-card-head">
              <div class="kpi-icon-wrap kpi-tone-green">
                <ion-icon :icon="cubeOutline"></ion-icon>
              </div>
              <span v-if="activeCampaigns" class="kpi-badge">{{ fmt(activeCampaigns) }} Active Programs</span>
            </div>
            <p class="kpi-title">Subsidy Disbursement</p>
            <p class="kpi-value">{{ fmtPct(subsidyUptake) }}<small>%</small></p>
            <p class="kpi-label">Overall Uptake</p>
            <div class="micro-bar" aria-hidden="true">
              <span :style="{ width: subsidyPercent + '%' }"></span>
            </div>
            <p v-if="activeCampaigns" class="kpi-meta">
              {{ fmt(beneficiariesClaimed) }} / {{ fmt(beneficiariesEnrolled) }} Beneficiaries Claimed
            </p>
            <p v-else class="kpi-meta">No active programs</p>
            <p v-if="topCampaignName" class="kpi-hint">
              Top: {{ topCampaignName }} ({{ fmtPct(topCampaignPercent) }}%)
            </p>
            <p v-if="lowStockPrograms" class="kpi-hint">
              {{ fmt(lowStockPrograms) }} {{ lowStockPrograms === 1 ? 'program' : 'programs' }} low stock
            </p>
          </button>

          <div class="kpi-card span-3 kpi-card-static">
            <div class="kpi-icon-wrap kpi-tone-danger">
              <ion-icon :icon="warningOutline"></ion-icon>
              <span v-if="pestCritical > 0" class="kpi-pulse" aria-hidden="true"></span>
            </div>
            <p class="kpi-value kpi-value-split">
              <span>{{ fmt(pestCount) }} <small>Pests</small></span>
              <span class="kpi-split-dot" aria-hidden="true">·</span>
              <span>{{ fmt(calamityCount) }} <small>Pending calamities</small></span>
            </p>
            <p class="kpi-label">{{ fmt(threatTotal) }} Active Incidents</p>
            <button class="kpi-meta kpi-link" type="button" @click="go('/admin/reports/pest-surveillance')">
              Pests: {{ fmt(pestCritical) }} Critical · {{ fmt(pestModerate) }} Moderate
              <template v-if="topPestName"> · {{ topPestName }}</template>
            </button>
            <button class="kpi-hint kpi-link" type="button" @click="go('/admin/reports/damage-calamity')">
              Damage: {{ fmt(calamityCount) }} calamity {{ calamityCount === 1 ? 'report' : 'reports' }} pending
            </button>
            <p v-if="dispatchesActive" class="kpi-hint">
              {{ fmt(dispatchesActive) }} {{ dispatchesActive === 1 ? 'technician' : 'technicians' }} assigned
            </p>
          </div>

          <!-- ── 2. Full-width GIS radar ───────────────────────────────── -->
          <div class="span-12 gis-span">
            <GisRadarMap @sms="onGisSms" />
          </div>

          <!-- ── 3. Diagnostic charts (7) ──────────────────────────────── -->
          <div class="span-7 diag-col">
            <div class="chart-pair">
              <section class="panel-card">
                <header class="panel-head">
                  <div>
                    <h2>Active Crop Stages</h2>
                    <p>Seasonal vulnerability &amp; input timing</p>
                  </div>
                </header>
                <div v-if="stageTotal" class="chart-box">
                  <Doughnut :data="stageChartData" :options="doughnutOptions" />
                </div>
                <p v-if="!stageTotal" class="empty-note">No standing-crop stage records yet.</p>
                <p v-else class="stage-legend">
                  Veg {{ stagePct('vegetative') }}% · Repro {{ stagePct('reproductive') }}% ·
                  Seedling {{ stagePct('seedling') }}% · Mat {{ stagePct('maturity') }}%
                </p>
              </section>

              <section class="panel-card">
                <header class="panel-head">
                  <div>
                    <h2>Subsidy Uptake by Barangay</h2>
                    <p>Liquidation % · top 5 by allocation</p>
                  </div>
                </header>
                <div v-if="distributionRows.length" class="chart-box">
                  <Bar :data="uptakeChartData" :options="barOptions" />
                </div>
                <p v-if="!distributionRows.length" class="empty-note">No active program allocations yet.</p>
              </section>
            </div>
          </div>

          <!-- ── 4. Predictive (5) ──────────────────────────────────────── -->
          <div class="span-5 pred-col">
            <section class="panel-card harvest-card">
              <header class="panel-head">
                <div>
                  <h2>Harvest Yield Projection</h2>
                  <p>{{ seasonLabel }} season · MT = ha × municipal avg yield</p>
                </div>
              </header>
              <div class="harvest-grid">
                <div v-for="row in harvestRows" :key="row.crop_type" class="harvest-tile">
                  <p class="harvest-crop">{{ row.crop_type }}</p>
                  <p class="harvest-mt">{{ fmtMt(row.estimated_harvest_mt) }} <small>MT</small></p>
                  <p class="kpi-hint">
                    {{ fmtHa(row.total_area_ha) }} ha · target {{ fmtMt(row.season_target_mt) }} MT
                  </p>
                  <div class="micro-bar gold" aria-hidden="true">
                    <span :style="{ width: harvestProgress(row) + '%' }"></span>
                  </div>
                </div>
                <p v-if="!harvestRows.length" class="empty-note">No planted hectares to project.</p>
              </div>
              <div v-if="harvestRows.length" class="harvest-chart-box">
                <Bar :data="harvestChartData" :options="harvestChartOptions" />
              </div>
              <p v-if="harvestRows.length" class="harvest-footer">
                Estimated attainment: <strong>{{ fmtPct(harvestAttainment) }}%</strong> of target
              </p>
            </section>
          </div>

          <!-- ── 4. Prescriptive Action Center ──────────────────────────── -->
          <section class="panel-card span-12 action-card">
            <header class="panel-head action-head">
              <div>
                <h2>Prescriptive Action Center</h2>
                <p>Consolidated municipal triage — critical system-generated insights</p>
              </div>
              <div class="action-toolbar no-print">
                <ion-button fill="outline" class="export-btn" @click="exportSummary">
                  <ion-icon slot="start" :icon="printOutline"></ion-icon>
                  Export Executive Summary PDF
                </ion-button>
              </div>
            </header>

            <div class="triage-filter-bar no-print">
              <button
                v-for="f in triageFilters"
                :key="f.value"
                class="triage-chip"
                :class="{ active: triageFilter === f.value }"
                @click="triageFilter = f.value"
              >{{ f.label }}</button>
            </div>

            <div v-if="filteredGroups.length" class="triage-groups">
              <div v-for="group in filteredGroups" :key="group.id" class="triage-group-card">
                <div class="triage-group-head">
                  <span class="sev-badge" :class="group.severity === 'critical' ? 'critical' : 'warning'">
                    {{ group.severity === 'critical' ? 'Critical' : 'Warning' }}
                  </span>
                  <strong class="triage-group-title">{{ group.threat_label }}</strong>
                  <span v-if="group.crop" class="crop-tag">{{ group.crop }}</span>
                  <span class="triage-group-count">{{ group.count }} barangay{{ group.count !== 1 ? 's' : '' }}</span>
                </div>
                <p class="triage-group-rec">{{ group.recommendation }}</p>
                <div v-if="group.barangays.length" class="triage-brgy-chips">
                  <span v-for="b in group.barangays" :key="b" class="brgy-chip">{{ b }}</span>
                </div>
                <p v-else class="triage-group-scope">LGU-wide</p>
                <div class="triage-group-actions no-print">
                  <ion-button
                    size="small"
                    class="batch-btn"
                    @click="openGroupBroadcast(group)"
                  >
                    <ion-icon slot="start" :icon="flashOutline"></ion-icon>
                    Broadcast to {{ group.count || 'All' }} Barangay{{ group.count !== 1 ? 's' : '' }}
                  </ion-button>
                </div>
              </div>
            </div>
            <p v-else class="empty-note">No critical alerts. Monitored indicators are within range.</p>
          </section>
        </div>
      </div>

      <article class="print-only print-summary">
        <h1>AGRI-AKAP Executive Summary — MAO Echague</h1>
        <p>{{ seasonLabel }} season · Generated {{ printedAt }}</p>
        <ul>
          <li>Farmers: {{ fmt(descriptive.total_farmers) }} ({{ fmt(descriptive.farmers_male) }} M / {{ fmt(descriptive.farmers_female) }} F) · RSBSA {{ fmt(descriptive.rsbsa_verified) }}</li>
          <li>Farm Area: {{ fmtHa(descriptive.registered_land_ha ?? descriptive.total_hectares) }} ha masterlist · {{ fmt(descriptive.farmers_with_area) }} farmers with area · avg {{ fmtHa(descriptive.avg_farm_area_ha) }} ha</li>
          <li>
            Subsidy: {{ fmt(beneficiariesClaimed) }} / {{ fmt(beneficiariesEnrolled) }} beneficiaries
            ({{ fmtPct(subsidyUptake) }}%) · {{ fmt(activeCampaigns) }} active programs
          </li>
          <li>
            Threats: {{ fmt(pestCount) }} pests ({{ fmt(pestCritical) }} critical)
            · {{ fmt(calamityCount) }} pending calamity reports
          </li>
        </ul>
        <h2>Yield forecast (MT)</h2>
        <ul>
          <li v-for="row in harvestRows" :key="'p'+row.crop_type">
            {{ row.crop_type }}: {{ fmtMt(row.estimated_harvest_mt) }} MT projected ({{ fmtHa(row.total_area_ha) }} ha)
          </li>
        </ul>
        <h2>Prescriptive actions</h2>
        <ol>
          <li v-for="(alert, i) in alerts" :key="'a'+i">
            [{{ alert.severity }}] {{ alert.barangay || 'LGU-wide' }} — {{ alert.threat_label }}: {{ alert.recommendation || alert.message }}
          </li>
        </ol>
      </article>

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
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonList, IonItem, IonModal, IonInput, IonTextarea,
} from '@ionic/vue';
import {
  peopleOutline, warningOutline, cubeOutline, leafOutline, flashOutline, printOutline,
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
import GisRadarMap from '@/components/Dashboard/GisRadarMap.vue';
import AppHeader from '@/components/Navigation/AppHeader.vue';

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const LGU_GREEN = '#1A4731';
const LGU_GOLD = '#D4AF37';

const router = useRouter();
const initialLoading = ref(true);
const loading = ref(false);
const error = ref('');
const sendingSms = ref(false);
const smsOpen = ref(false);
const printedAt = ref('');

const descriptive = reactive<any>({});
const diagnostic = reactive<any>({
  pest_breakdown: [],
  crop_distribution: [],
  crop_stages: [],
  distributions_by_barangay: [],
});
const predictive = reactive<any>({ harvest_forecast: [], weather_risk: [], climate_summary: {}, season: '' });
const prescriptive = reactive<any>({ alerts: [] });

const smsForm = reactive({
  barangay: '',
  message: '',
});

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');
const fmtHa = (v: any) => Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 1 });
const fmtMt = (v: any) => Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 1 });
const fmtPct = (v: any) => Number(v ?? 0).toLocaleString('en-PH', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const go = (path: string) => router.push(path);

const stageRows = computed(() => diagnostic.crop_stages ?? []);
const distributionRows = computed(() => diagnostic.distributions_by_barangay ?? []);
const harvestRows = computed(() => predictive.harvest_forecast ?? []);
const alerts = computed(() => prescriptive.alerts ?? []);
const hasData = computed(() =>
  Number(descriptive.total_farmers ?? 0) > 0
  || Number(descriptive.total_hectares ?? 0) > 0
  || stageRows.value.length > 0
  || alerts.value.length > 0,
);

const subsidyUptake = computed(() => Number(
  descriptive.subsidy_uptake_percent ?? descriptive.subsidy_percent ?? 0,
));
const subsidyPercent = computed(() => Math.min(100, Math.max(0, subsidyUptake.value)));
const activeCampaigns = computed(() => Number(descriptive.subsidy_active_campaigns ?? 0));
const beneficiariesClaimed = computed(() => Number(
  descriptive.subsidy_beneficiaries_claimed ?? descriptive.subsidy_claimed ?? 0,
));
const beneficiariesEnrolled = computed(() => Number(
  descriptive.subsidy_beneficiaries_enrolled ?? descriptive.subsidy_allocated ?? 0,
));
const topCampaignName = computed(() => String(descriptive.subsidy_top_campaign?.name ?? ''));
const topCampaignPercent = computed(() => Number(descriptive.subsidy_top_campaign?.percent ?? 0));
const lowStockPrograms = computed(() => Number(descriptive.subsidy_low_stock_programs ?? 0));
const pestCount = computed(() => Number(descriptive.active_pests ?? 0));
const calamityCount = computed(() => Number(descriptive.active_calamities ?? 0));
const pestCritical = computed(() => Number(
  descriptive.pest_critical ?? descriptive.threat_critical ?? 0,
));
const pestModerate = computed(() => Number(
  descriptive.pest_moderate ?? descriptive.threat_moderate ?? 0,
));
const topPestName = computed(() => String(descriptive.top_pest_name ?? ''));
const dispatchesActive = computed(() => Number(descriptive.dispatches_active ?? 0));
const threatTotal = computed(() => Number(descriptive.threat_total ?? (
  pestCount.value + calamityCount.value
)));
const seasonLabel = computed(() => predictive.season || 'Current');
const stageTotal = computed(() => stageRows.value.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0));

const zoneAlerts = computed(() =>
  alerts.value.filter((a: any) => Boolean(a?.barangay)),
);

const triageFilters = [
  { label: 'All', value: 'all' },
  { label: 'Outbreaks', value: 'outbreak' },
  { label: 'Agro-Climate', value: 'agro_climate' },
];
const triageFilter = ref('all');

const alertGroups = computed(() => (prescriptive.groups ?? []) as any[]);

const filteredGroups = computed(() => {
  if (triageFilter.value === 'all') return alertGroups.value;
  return alertGroups.value.filter((g: any) => g.category === triageFilter.value);
});

const openGroupBroadcast = (group: any) => {
  const zones = group.barangays ?? [];
  smsForm.barangay = zones.join(', ') || 'All';
  smsForm.message = group.group_sms_message || group.recommendation || '';
  smsOpen.value = true;
};

const stagePct = (key: string) => {
  const row = stageRows.value.find((r: any) => r.key === key);
  return Number(row?.percent ?? 0).toFixed(0);
};

const harvestProgress = (row: any) => {
  const target = Number(row?.season_target_mt ?? 0);
  const proj = Number(row?.estimated_harvest_mt ?? 0);
  if (target <= 0) return proj > 0 ? 100 : 0;
  return Math.min(100, Math.round((proj / target) * 100));
};

const harvestAttainment = computed(() => {
  const projected = harvestRows.value.reduce((sum: number, row: any) => (
    sum + Number(row?.estimated_harvest_mt ?? 0)
  ), 0);
  const target = harvestRows.value.reduce((sum: number, row: any) => (
    sum + Number(row?.season_target_mt ?? 0)
  ), 0);
  return target > 0 ? (projected / target) * 100 : 0;
});

const STAGE_COLORS: Record<string, string> = {
  seedling: '#94a3b8',
  vegetative: LGU_GREEN,
  reproductive: LGU_GOLD,
  maturity: '#b45309',
};

const stageChartData = computed(() => {
  const rows = stageRows.value;
  return {
    labels: rows.map((r: any) => r.stage),
    datasets: [{
      data: rows.map((r: any) => r.total),
      backgroundColor: rows.map((r: any) => STAGE_COLORS[r.key] || LGU_GREEN),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };
});

const uptakeChartData = computed(() => ({
  labels: distributionRows.value.map((r: any) => r.barangay),
  datasets: [{
    label: 'Uptake %',
    data: distributionRows.value.map((r: any) => Number(r.percent ?? 0)),
    backgroundColor: LGU_GREEN,
    hoverBackgroundColor: LGU_GOLD,
    borderRadius: 8,
    maxBarThickness: 22,
  }],
}));

const harvestChartData = computed(() => ({
  labels: harvestRows.value.map((row: any) => row.crop_type),
  datasets: [
    {
      label: 'Projected MT',
      data: harvestRows.value.map((row: any) => Number(row.estimated_harvest_mt ?? 0)),
      backgroundColor: LGU_GREEN,
      borderRadius: 6,
      maxBarThickness: 28,
    },
    {
      label: 'Target MT',
      data: harvestRows.value.map((row: any) => Number(row.season_target_mt ?? 0)),
      backgroundColor: LGU_GOLD,
      borderRadius: 6,
      maxBarThickness: 28,
    },
  ],
}));

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
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
    tooltip: {
      backgroundColor: LGU_GREEN,
      titleColor: '#fff',
      bodyColor: LGU_GOLD,
      callbacks: {
        label: (ctx: any) => `${ctx.parsed.x}% claimed`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      max: 100,
      ticks: { color: '#94a3b8', callback: (v: any) => `${v}%` },
      grid: { color: 'rgba(26,71,49,0.08)' },
    },
    y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } },
  },
};

const harvestChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: LGU_GREEN, usePointStyle: true, boxWidth: 8, font: { size: 10 } },
    },
    tooltip: {
      backgroundColor: LGU_GREEN,
      titleColor: '#fff',
      bodyColor: '#fff',
      callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${fmtMt(ctx.parsed.y)} MT` },
    },
  },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(26,71,49,0.08)' },
    },
  },
};

const alertLabel = (a: any) => {
  const map: Record<string, string> = {
    pest_outbreak: 'Pest Outbreak',
    weather_alert: 'Weather Alert',
    harvest_readiness: 'Harvest Readiness',
  };
  return map[a?.type] || 'Advisory';
};

const fetchOverview = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/dashboard/overview');
    const payload = res.data?.data ?? res.data ?? {};
    Object.assign(descriptive, payload.descriptive ?? {});
    Object.assign(diagnostic, {
      pest_breakdown: [],
      crop_distribution: [],
      crop_stages: [],
      distributions_by_barangay: [],
      ...(payload.diagnostic ?? {}),
    });
    Object.assign(predictive, {
      harvest_forecast: [],
      weather_risk: [],
      climate_summary: {},
      season: '',
      ...(payload.predictive ?? {}),
    });
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
};

const onGisSms = (payload: { barangay: string; message: string }) => {
  smsForm.barangay = payload.barangay || '';
  smsForm.message = payload.message || '';
  smsOpen.value = true;
};

const openSmsModal = (alert: any) => {
  smsForm.barangay = alert.barangay || '';
  smsForm.message = alert.sms_message || alert.message || alert.recommendation || '';
  smsOpen.value = true;
};

const openBatchSms = () => {
  const zones = Array.from(new Set(zoneAlerts.value.map((a: any) => a.barangay).filter(Boolean)));
  if (!zones.length) return;
  const lines = zoneAlerts.value.map((a: any) =>
    `${a.barangay}: ${a.recommendation || a.message}`,
  );
  smsForm.barangay = zones.join(', ');
  smsForm.message = `MAO Echague Advisory for ${zones.length} risk zone(s): ${lines.join(' | ')}`.slice(0, 459);
  smsOpen.value = true;
};

const sendSmsDraft = async () => {
  if (!smsForm.message.trim()) return;
  sendingSms.value = true;
  try {
    const zones = smsForm.barangay
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (zones.length > 1) {
      smsOpen.value = false;
      await router.push({
        path: '/admin/broadcasts',
        query: {
          message: smsForm.message.trim().slice(0, 459),
          barangays: zones.join('|'),
        },
      });
      return;
    }
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
  const zones = smsForm.barangay.split(',').map((s) => s.trim()).filter(Boolean);
  smsOpen.value = false;
  await router.push({
    path: '/admin/broadcasts',
    query: zones.length > 1
      ? { message: smsForm.message || undefined, barangays: zones.join('|') }
      : { barangay: smsForm.barangay || undefined, draft: smsForm.message || undefined, message: smsForm.message || undefined },
  });
};

const exportSummary = () => {
  printedAt.value = new Date().toLocaleString('en-PH');
  window.print();
};

onMounted(() => {
  fetchAll();
  window.addEventListener('akap:refresh', fetchAll);
});
onBeforeUnmount(() => window.removeEventListener('akap:refresh', fetchAll));
</script>

<style scoped>
.dashboard-bg {
  --background: #F8FAFC;
}
.shell {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.75rem 1rem 1.75rem;
}
.center-state {
  text-align: center;
  padding: 3.5rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }

.grid-shell {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}
.span-3 { grid-column: span 3; }
.span-5 { grid-column: span 5; }
.span-7 { grid-column: span 7; }
.span-12 { grid-column: span 12; }

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
  cursor: pointer;
  text-align: left;
  padding: 1rem 1.05rem 0.95rem;
  font-family: inherit;
  appearance: none;
}
.kpi-card-static {
  cursor: default;
}
.kpi-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.kpi-title {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1A4731;
}
.kpi-badge {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
  color: #1A4731;
  background: rgba(26, 71, 49, 0.08);
  border: 1px solid rgba(26, 71, 49, 0.16);
  border-radius: 999px;
  padding: 0.18rem 0.5rem;
  line-height: 1.2;
}
.kpi-icon-wrap {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  margin-bottom: 0.55rem;
}
.kpi-card-head .kpi-icon-wrap {
  margin-bottom: 0;
}
.kpi-pulse {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55);
  animation: kpi-pulse 1.6s ease-out infinite;
}
@keyframes kpi-pulse {
  0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}
.kpi-value-split {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.kpi-split-dot {
  color: #94a3b8;
  font-weight: 700;
  font-size: 1.1rem;
}
.kpi-tone-green { background: rgba(26, 71, 49, 0.1); color: #1A4731; }
.kpi-tone-gold { background: rgba(212, 175, 55, 0.16); color: #a3831f; }
.kpi-tone-danger { background: rgba(220, 38, 38, 0.1); color: #b91c1c; }
.kpi-tone-slate { background: rgba(100, 116, 139, 0.12); color: #475569; }
.kpi-value {
  margin: 0;
  font-size: clamp(1.45rem, 2.4vw, 1.95rem);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.kpi-value small {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
}
.kpi-label {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
}
.kpi-meta {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1A4731;
}
.kpi-hint {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: #64748b;
}
.kpi-card > :last-child {
  margin-top: auto;
  padding-top: 0.35rem;
}
.kpi-link {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  appearance: none;
}
.kpi-link.kpi-meta { margin-top: 0.35rem; }
.kpi-link.kpi-hint { margin-top: 0.2rem; }
.kpi-link:hover { text-decoration: underline; }
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
.micro-bar.gold span { background: #D4AF37; }

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
  padding: 0.85rem 1rem 1rem;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}
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

.diag-col, .pred-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}
.diag-col { align-self: stretch; }
.pred-col { align-self: start; height: auto; }
.pred-col .panel-card {
  flex: 0 0 auto;
  height: auto;
}
.gis-span { min-width: 0; }
.gis-span :deep(.gis-card) {
  width: 100%;
}
.chart-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1 1 auto;
  min-height: 0;
  align-items: stretch;
}
.chart-pair .panel-card {
  height: auto;
}

.chart-box { height: 210px; position: relative; }
.empty-note {
  margin: 0.4rem 0 0;
  color: #94a3b8;
  font-size: 0.8rem;
}
.stage-legend {
  margin: 0.4rem 0 0;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}

.harvest-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.harvest-tile {
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  background: #f8fafc;
}
.harvest-crop {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}
.harvest-mt {
  margin: 0.15rem 0 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
}
.harvest-mt small { font-size: 0.75rem; color: #64748b; }
.harvest-chart-box { height: 145px; margin-top: 0.8rem; position: relative; }
.harvest-footer {
  margin: 0.6rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px solid #E2E8F0;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
}
.harvest-footer strong { color: #1A4731; }

.action-head { flex-wrap: wrap; }
.action-toolbar { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.batch-btn {
  --background: #1A4731;
  --color: #fff;
  text-transform: none;
  font-weight: 700;
  font-size: 0.78rem;
}
.export-btn {
  --border-color: #1A4731;
  --color: #1A4731;
  text-transform: none;
  font-weight: 700;
  font-size: 0.78rem;
}
.triage-wrap { overflow-x: auto; }
.triage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.triage-table th {
  text-align: left;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
  padding: 0.4rem 0.55rem;
  border-bottom: 1px solid #E2E8F0;
}
.triage-table td {
  padding: 0.55rem;
  border-bottom: 1px solid #E2E8F0;
  color: #334155;
  vertical-align: top;
}
.triage-table td strong { color: #0f172a; }
.rec-cell { max-width: 420px; line-height: 1.35; }
.empty-row { text-align: center; color: #94a3b8; }
.crop-tag {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.65rem;
  font-weight: 800;
  color: #1A4731;
  background: rgba(26, 71, 49, 0.08);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
}
.sev-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}
.sev-badge.critical { background: #fef2f2; color: #b91c1c; }
.sev-badge.warning { background: #fff7ed; color: #c2410c; }

.triage-filter-bar {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.triage-chip {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.triage-chip.active {
  background: #1A4731;
  color: #fff;
  border-color: #1A4731;
}
.triage-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.triage-group-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
  background: #fafbfc;
}
.triage-group-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}
.triage-group-title {
  color: #0f172a;
  font-size: 0.88rem;
}
.triage-group-count {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}
.triage-group-rec {
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.4;
  margin: 0.25rem 0 0.5rem;
}
.triage-brgy-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
}
.brgy-chip {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  color: #1e3a5f;
  background: #e0f2fe;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
}
.triage-group-scope {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}
.triage-group-actions {
  display: flex;
  gap: 0.4rem;
}
.sms-btn {
  --border-color: #1A4731;
  --color: #1A4731;
  text-transform: none;
  font-weight: 700;
  font-size: 0.72rem;
}
.send-btn {
  --background: #1A4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 1rem;
}
.open-full-btn {
  --border-color: #1A4731;
  --color: #1A4731;
  text-transform: none;
  font-weight: 700;
  margin-top: 0.5rem;
}

.print-summary {
  padding: 0 1.25rem 2rem;
  color: #0f172a;
}
.print-summary h1 { font-size: 1.2rem; color: #1A4731; }
.print-summary h2 { font-size: 0.95rem; margin-top: 1rem; }

@media (max-width: 1100px) {
  .span-3, .span-5, .span-7, .span-12 { grid-column: span 12; }
  .chart-pair, .harvest-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .grid-shell { grid-template-columns: 1fr; }
  .sms-cell { white-space: nowrap; }
}
</style>
