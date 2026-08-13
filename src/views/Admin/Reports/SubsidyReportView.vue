<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar class="rpt-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Subsidy Distribution Report</ion-title>
        <ion-buttons slot="end">
          <ion-button class="export-btn" :disabled="!filteredRows.length" @click="exportToPdf">
            <ion-icon slot="start" :icon="printOutline"></ion-icon>
            Export PDF
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="rpt-content">
      <!-- Print letterhead (hidden on screen) -->
      <div class="print-only letterhead">
        <h1 class="lh-title">Municipality of [LGU Name]</h1>
        <p class="lh-sub">Municipal Agriculture Office — Subsidy Distribution Report</p>
        <p class="lh-meta">
          Generated: {{ new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) }}
          <span v-if="filters.dateFrom || filters.dateTo"> &nbsp;|&nbsp; Period: {{ filters.dateFrom || '—' }} to {{ filters.dateTo || '—' }}</span>
          <span v-if="selectedProgramName"> &nbsp;|&nbsp; Program: {{ selectedProgramName }}</span>
        </p>
      </div>

      <div class="rpt-shell">
        <!-- Filter bar -->
        <div class="filter-bar no-print">
          <div class="filter-group">
            <label class="filter-label">Program</label>
            <select class="filter-select" v-model="filters.programId" @change="fetchRows">
              <option value="">All Programs</option>
              <option v-for="prog in programs" :key="prog.id" :value="prog.id">{{ prog.program_name }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Date Claimed From</label>
            <input class="filter-input" type="date" v-model="filters.dateFrom" @change="fetchRows" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Date Claimed To</label>
            <input class="filter-input" type="date" v-model="filters.dateTo" @change="fetchRows" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Barangay</label>
            <select class="filter-select" v-model="filters.barangay" @change="fetchRows">
              <option value="">All Barangays</option>
              <option v-for="b in barangays" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <button class="clear-btn" @click="clearFilters">Clear</button>
        </div>

        <!-- Data grid -->
        <div class="grid-shell">
          <div class="grid-head">
            <span class="grid-title">Claimed Subsidy Beneficiaries</span>
            <span class="row-pill">{{ filteredRows.length }} record(s)</span>
          </div>

          <div v-if="loading" class="grid-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading records…</p>
          </div>
          <div v-else-if="loadError" class="grid-state error">
            <p>{{ loadError }}</p>
            <button class="retry-btn" @click="fetchRows">Retry</button>
          </div>
          <div v-else class="table-scroll">
            <table class="excel-table">
              <thead>
                <tr>
                  <th class="col-no">No</th>
                  <th>RSBSA No.</th>
                  <th>Farmer Name</th>
                  <th>Barangay</th>
                  <th>Subsidy Program</th>
                  <th>Item / Amount Received</th>
                  <th>Date Claimed</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredRows.length">
                  <td colspan="7" class="empty-row">No claimed subsidy records found for the selected filters.</td>
                </tr>
                <tr v-for="(row, i) in filteredRows" :key="i">
                  <td class="col-no">{{ i + 1 }}</td>
                  <td class="mono">{{ row.rsbsa_no }}</td>
                  <td>{{ row.farmer_name }}</td>
                  <td>{{ row.barangay }}</td>
                  <td>{{ row.program_name }}</td>
                  <td>{{ row.item_received }}</td>
                  <td class="mono">{{ fmtDate(row.date_claimed) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Print signature block -->
        <div class="print-only sig-block">
          <div class="sig-col">
            <div class="sig-line"></div>
            <p class="sig-name">Municipal Agriculturist</p>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <p class="sig-name">Prepared by</p>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonMenuButton, IonIcon, IonSpinner,
} from '@ionic/vue';
import { printOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';

interface SubsidyRow {
  rsbsa_no: string;
  farmer_name: string;
  barangay: string;
  program_name: string;
  item_received: string;
  date_claimed: string;
}

interface Program {
  id: number | string;
  program_name: string;
}

const loading   = ref(false);
const loadError = ref('');
const rows      = ref<SubsidyRow[]>([]);
const programs  = ref<Program[]>([]);
const barangays = ref<string[]>([]);

const filters = reactive({
  programId: '' as string | number,
  dateFrom: '',
  dateTo: '',
  barangay: '',
});

const filteredRows = computed(() => rows.value);

const selectedProgramName = computed(() =>
  filters.programId ? programs.value.find(p => p.id == filters.programId)?.program_name ?? '' : ''
);

const fmtDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return d; }
};

async function fetchRows() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await apiClient.get('/reports/subsidies', {
      params: {
        program_id: filters.programId || undefined,
        date_from:  filters.dateFrom  || undefined,
        date_to:    filters.dateTo    || undefined,
        barangay:   filters.barangay  || undefined,
      },
    });
    rows.value = res.data?.data?.rows ?? [];
  } catch (e: any) {
    rows.value = [];
    loadError.value = e?.response?.data?.message || 'Could not load subsidy report data.';
  } finally {
    loading.value = false;
  }
}

async function fetchPrograms() {
  try {
    // GET /subsidies returns the subsidy program list (SubsidyController::index).
    // Handle both flat array and paginated { data: [...] } shapes.
    const res = await apiClient.get('/subsidies');
    const payload = res.data?.data;
    programs.value = Array.isArray(payload) ? payload : (payload?.data ?? []);
  } catch { programs.value = []; }
}

async function fetchBarangays() {
  try {
    const res = await apiClient.get('/farmers/barangays');
    barangays.value = (res.data?.data ?? []).filter(Boolean);
  } catch { barangays.value = []; }
}

function clearFilters() {
  filters.programId = '';
  filters.dateFrom  = '';
  filters.dateTo    = '';
  filters.barangay  = '';
  fetchRows();
}

function exportToPdf() {
  window.print();
}

onMounted(async () => {
  await Promise.all([fetchPrograms(), fetchBarangays()]);
  fetchRows();
});
</script>

<style scoped>
.rpt-toolbar { --background: #1a4731; --color: #fff; }
.export-btn { --background: #d4af37; --color: #1a4731; font-weight: 700; text-transform: none; --border-radius: 6px; }
.rpt-content { --background: #eef1f4; }

.rpt-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem 1rem 1rem;
  gap: 0.65rem;
}

/* Filter bar */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: flex-end;
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.filter-select, .filter-input {
  font-size: 0.82rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 8px;
  background: #fff;
  color: #334155;
  font-family: inherit;
}
.filter-select { min-width: 160px; }
.filter-input  { width: 130px; }
.clear-btn {
  align-self: flex-end;
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
}
.clear-btn:hover { border-color: #94a3b8; color: #334155; }

/* Data grid */
.grid-shell {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.grid-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1rem;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
}
.grid-title { color: #d1e0d6; font-size: 0.9rem; font-weight: 700; }
.row-pill {
  background: #d4af37;
  color: #1a4731;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
}
.grid-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #64748b;
  padding: 2rem;
}
.grid-state.error { color: #b91c1c; }
.retry-btn {
  border: 1px solid #1a4731;
  background: transparent;
  color: #1a4731;
  border-radius: 6px;
  padding: 4px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.8rem;
  font-family: inherit;
}

.table-scroll { flex: 1; overflow: auto; }

.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
  min-width: 820px;
}
.excel-table th,
.excel-table td {
  border: 1px solid #cbd5e1;
  padding: 4px 8px;
  text-align: left;
  white-space: nowrap;
}
.excel-table thead th {
  position: sticky;
  top: 0;
  background: #1a4731;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  z-index: 2;
}
.excel-table tbody tr:nth-child(even) { background: #f8fafc; }
.excel-table tbody tr:hover { background: #eef5ee; }
.col-no { text-align: right; width: 40px; }
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0; font-style: italic; }

/* Signature block */
.sig-block { display: none; }
.sig-col { text-align: center; flex: 1; }
.sig-line { border-bottom: 1px solid #1a4731; width: 200px; margin: 0 auto 6px; }
.sig-name { font-size: 0.82rem; font-weight: 700; color: #1a4731; margin: 0; }

/* ── Print ─────────────────────────────────────────────────── */
.no-print { }
.print-only { display: none; }

@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .rpt-shell { padding: 0; }
  .grid-shell { border: none; }
  .excel-table thead th { position: static; background: #1a4731 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  .letterhead { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #1a4731; padding-bottom: 0.75rem; }
  .lh-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1a4731; }
  .lh-sub { margin: 2px 0; font-size: 0.9rem; color: #374151; }
  .lh-meta { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; }

  .sig-block {
    display: flex !important;
    justify-content: space-around;
    margin-top: 3rem;
    padding-top: 1rem;
  }
}
</style>
