<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>ID Issuance Portal</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="auth-bg no-print-bg">
      <!-- ═══════════════════════════════════════════════════════════
           WORKSPACE HEADER
           ═══════════════════════════════════════════════════════════ -->
      <div class="workspace-header no-print">
        <div class="workspace-title">
          <h1>ID Production</h1>
          <p>Search the queue, verify beneficiary details, and print government ID cards.</p>
        </div>
        <div class="workspace-stats">
          <div class="stat-pill">
            <span class="stat-value">{{ pagination?.total ?? farmers.length }}</span>
            <span class="stat-label">Total Farmers</span>
          </div>
          <div class="stat-pill stat-pending">
            <span class="stat-value">{{ pendingOnPageCount }}</span>
            <span class="stat-label">Pending (page)</span>
          </div>
          <div class="stat-pill stat-printed">
            <span class="stat-value">{{ printedOnPageCount }}</span>
            <span class="stat-label">Printed (page)</span>
          </div>
          <div class="stat-pill stat-photo">
            <span class="stat-value">{{ missingPhotoCount }}</span>
            <span class="stat-label">Missing photo</span>
          </div>
        </div>
      </div>

      <div class="issuance-workspace no-print">

        <!-- ═══════════════════════════════════════════════════════
             LEFT: SMART QUEUE (~58%) — TABLE FORMAT
             ═══════════════════════════════════════════════════════ -->
        <aside class="queue-panel">
          <div class="queue-head">
            <h2>Issuance Queue</h2>
            <span v-if="selectedCount > 0" class="queue-head-badge">{{ selectedCount }} selected</span>
          </div>

          <div class="queue-filters">
            <ion-searchbar
              placeholder="Farmer Name or RSBSA Number"
              @ionInput="handleSearch"
              :debounce="400"
              class="list-searchbar"
            ></ion-searchbar>
            <ion-select
              class="list-brgy-filter"
              label="Barangay"
              label-placement="stacked"
              interface="popover"
              :value="filterBarangay"
              placeholder="All"
              @ionChange="onBarangayChange"
            >
              <ion-select-option :value="''">All barangays</ion-select-option>
              <ion-select-option v-for="b in barangays" :key="b" :value="b">{{ b }}</ion-select-option>
            </ion-select>
          </div>

          <div class="queue-chip-row">
            <button type="button" class="filter-chip" :class="{ on: queueChip === 'all' }" @click="queueChip = 'all'">All</button>
            <button type="button" class="filter-chip" :class="{ on: queueChip === 'missing-photo' }" @click="queueChip = 'missing-photo'">
              Missing photo
            </button>
            <button type="button" class="filter-chip" :class="{ on: queueChip === 'priority' }" @click="queueChip = 'priority'">
              Senior / PWD
            </button>
            <button type="button" class="filter-chip" :class="{ on: queueChip === 'pending' }" @click="queueChip = 'pending'">
              Pending only
            </button>
          </div>

          <div class="color-legend">
            <span class="legend-title">Color Codes:</span>
            <span class="legend-item"><span class="swatch" :style="{ background: CATEGORY.regular.color }"></span>Regular</span>
            <span class="legend-item"><span class="swatch" :style="{ background: CATEGORY.senior.color }"></span>Senior Citizen (60+)</span>
            <span class="legend-item"><span class="swatch" :style="{ background: CATEGORY.pwd.color }"></span>PWD</span>
          </div>

          <div v-if="selectedCount > 0" class="selection-bar">
            <span class="selection-label">{{ selectedCount }} of {{ visibleFarmers.length }} in view selected</span>
            <span class="clear-link" @click="clearSelection">Clear</span>
          </div>

          <div class="table-wrap">
            <table class="queue-table">
              <thead>
                <tr>
                  <th class="col-check">
                    <input
                      type="checkbox"
                      class="excel-checkbox"
                      :checked="isAllSelected"
                      :indeterminate="isIndeterminate"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th class="col-farmer">Farmer</th>
                  <th class="col-rsbsa">RSBSA No.</th>
                  <th>Barangay</th>
                  <th class="col-priority">Priority</th>
                  <th class="col-sex">Sex</th>
                  <th class="col-contact">Contact</th>
                  <th class="col-photo">Photo</th>
                  <th class="col-status">Print</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="isLoading">
                  <td colspan="9" class="state-cell">
                    <ion-spinner name="crescent" color="primary"></ion-spinner>
                  </td>
                </tr>

                <tr v-else-if="visibleFarmers.length === 0">
                  <td colspan="9" class="state-cell">
                    <EmptyState variant="farmers" message="No farmers match the current filters." />
                  </td>
                </tr>

                <tr
                  v-else
                  v-for="farmer in visibleFarmers"
                  :key="farmer.id"
                  class="queue-row"
                  :class="{
                    'row-selected': selectedIds.has(farmer.id),
                    'row-active': previewFarmer?.id === farmer.id,
                    'row-no-photo': !hasPhoto(farmer),
                  }"
                  @click="previewSingle(farmer)"
                >
                  <td class="col-check" @click.stop>
                    <input
                      type="checkbox"
                      class="excel-checkbox"
                      :checked="selectedIds.has(farmer.id)"
                      @change="toggleRow(farmer)"
                    />
                  </td>
                  <td class="col-farmer">
                    <span class="farmer-name">{{ farmer.surname }}, {{ farmer.first_name }}</span>
                  </td>
                  <td class="mono">{{ farmer.rsbsa_no || 'Pending' }}</td>
                  <td>{{ farmer.permanent_brgy || '—' }}</td>
                  <td class="col-priority">
                    <span class="priority-mark">
                      <span class="cat-dot" :style="{ background: catInfo(farmer).color }"></span>
                      {{ catInfo(farmer).label }}
                    </span>
                  </td>
                  <td class="col-sex">{{ sexShort(farmer.sex) }}</td>
                  <td class="col-contact" :title="farmer.mobile_number || ''">{{ farmer.mobile_number || '—' }}</td>
                  <td class="col-photo">
                    <span class="status-chip" :class="hasPhoto(farmer) ? 'chip-photo-ready' : 'chip-photo-missing'">
                      {{ hasPhoto(farmer) ? 'Ready' : 'Missing' }}
                    </span>
                  </td>
                  <td class="col-status">
                    <span class="status-chip" :class="isPrinted(farmer) ? 'chip-printed' : 'chip-pending'">
                      {{ isPrinted(farmer) ? 'Printed' : 'Pending' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagination && pagination.last_page > 1" class="list-pagination">
            <ion-button fill="clear" size="small" :disabled="pagination.current_page <= 1" @click="loadPage(pagination.current_page - 1)">
              <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
            </ion-button>
            <span class="page-label">{{ pagination.current_page }}/{{ pagination.last_page }}</span>
            <ion-button fill="clear" size="small" :disabled="pagination.current_page >= pagination.last_page" @click="loadPage(pagination.current_page + 1)">
              <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </div>

          <div class="queue-footer">
            <button
              class="print-selected-btn"
              type="button"
              :disabled="selectedCount === 0"
              @click="printBatchIds"
            >
              <ion-icon :icon="printOutline"></ion-icon>
              Print ({{ selectedCount }}) Selected IDs
            </button>
          </div>
        </aside>

        <!-- ═══════════════════════════════════════════════════════
             RIGHT: DIGITAL TWIN PREVIEW (~42%)
             ═══════════════════════════════════════════════════════ -->
        <section class="preview-panel">
          <div class="preview-head">
            <h2>Digital ID Preview</h2>
            <p>Live render of the secure farmer identification card</p>
          </div>

          <div class="preview-body">
            <div v-if="!previewFarmer" class="empty-preview">
              <ion-icon :icon="idCardOutline" class="empty-icon"></ion-icon>
              <p>Select a farmer from the queue to generate their secure digital ID.</p>
            </div>

            <div v-else class="id-preview-wrapper">
              <div class="action-bar">
                <div class="action-bar-left">
                  <ion-badge color="success">READY FOR ISSUANCE</ion-badge>
                  <ion-badge :color="catInfo(previewFarmer).badge">{{ catInfo(previewFarmer).label }}</ion-badge>
                </div>
                <ion-button color="dark" size="small" @click="printSingleId(previewFarmer)">
                  <ion-icon slot="start" :icon="printOutline"></ion-icon>
                  Print this ID
                </ion-button>
              </div>

              <div class="id-card-stage">
                <FarmerIdCard :farmer="previewFarmer" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Hidden print grid — @media print only -->
      <div class="print-container print-only" id="print-batch">
        <div
          v-for="farmer in printableFarmers"
          :key="'print-' + farmer.id"
          class="id-card-print-wrapper"
        >
          <FarmerIdCard :farmer="farmer" print-mode />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonBadge, IonButton, IonIcon, IonSpinner,
  IonSearchbar, IonSelect, IonSelectOption,
  toastController,
} from '@ionic/vue';
import {
  printOutline, idCardOutline,
  chevronBackOutline, chevronForwardOutline,
} from 'ionicons/icons';
import axiosInstance from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';
import FarmerIdCard from '@/components/FarmerIdCard.vue';

const route = useRoute();
const PRINTED_KEY = 'agri-akap:id-printed-ids';

interface PaginationMeta { current_page: number; last_page: number; total: number; }

const farmers = ref<any[]>([]);
const isLoading = ref(true);
const pagination = ref<PaginationMeta | null>(null);
const searchQuery = ref('');

const barangays = ref<string[]>([]);
const filterBarangay = ref('');
type QueueChip = 'all' | 'missing-photo' | 'priority' | 'pending';
const queueChip = ref<QueueChip>('all');

const selectedIds = reactive(new Set<string>());
const previewFarmer = ref<any>(null);

const loadPrintedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PRINTED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
};

const printedIds = ref<Set<string>>(loadPrintedIds());
const lastPrintIds = ref<string[]>([]);

const persistPrinted = (ids: Set<string>) => {
  try {
    localStorage.setItem(PRINTED_KEY, JSON.stringify([...ids]));
  } catch {
    // private mode / quota
  }
};

const commitPrinted = (ids: Iterable<string>) => {
  const next = new Set(printedIds.value);
  for (const id of ids) next.add(String(id));
  printedIds.value = next;
  persistPrinted(next);
};

const isPrinted = (farmer: any) => printedIds.value.has(String(farmer?.id));
const hasPhoto = (farmer: any) => !!farmer?.photo_path;

const sexShort = (sex: unknown) => {
  const v = String(sex || '').trim();
  if (!v) return '—';
  const lower = v.toLowerCase();
  if (lower.startsWith('m')) return 'M';
  if (lower.startsWith('f')) return 'F';
  return v.slice(0, 1).toUpperCase();
};

const selectedCount = computed(() => selectedIds.size);

const pendingOnPageCount = computed(() => farmers.value.filter((f) => !isPrinted(f)).length);
const printedOnPageCount = computed(() => farmers.value.filter((f) => isPrinted(f)).length);
const missingPhotoCount = computed(() => farmers.value.filter((f) => !hasPhoto(f)).length);

const visibleFarmers = computed(() => {
  const chip = queueChip.value;
  return farmers.value.filter((f) => {
    if (chip === 'missing-photo') return !hasPhoto(f);
    if (chip === 'priority') return priorityCategory(f) !== 'regular';
    if (chip === 'pending') return !isPrinted(f);
    return true;
  });
});

const isAllSelected = computed(() =>
  visibleFarmers.value.length > 0 && visibleFarmers.value.every((f) => selectedIds.has(f.id))
);
const isIndeterminate = computed(() =>
  !isAllSelected.value && visibleFarmers.value.some((f) => selectedIds.has(f.id))
);

const printableFarmers = computed(() =>
  farmers.value.filter((f) => selectedIds.has(f.id))
);

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    visibleFarmers.value.forEach((f) => selectedIds.delete(f.id));
  } else {
    visibleFarmers.value.forEach((f) => selectedIds.add(f.id));
  }
};

const toggleRow = (farmer: any) => {
  if (selectedIds.has(farmer.id)) {
    selectedIds.delete(farmer.id);
  } else {
    selectedIds.add(farmer.id);
  }
};

const clearSelection = () => {
  selectedIds.clear();
};

const previewSingle = (farmer: any) => {
  previewFarmer.value = farmer;
};

const fetchFarmers = async (page = 1, search = '') => {
  isLoading.value = true;
  try {
    const params: Record<string, any> = { page, search, per_page: 50 };
    if (filterBarangay.value) params.barangay = filterBarangay.value;
    const res = await axiosInstance.get('/farmers', { params });
    const payload = res.data.data;
    const rank = (f: any) => (priorityCategory(f) === 'pwd' ? 0 : priorityCategory(f) === 'senior' ? 1 : 2);
    farmers.value = [...payload.data].sort((a: any, b: any) => rank(a) - rank(b));
    pagination.value = {
      current_page: payload.current_page,
      last_page: payload.last_page,
      total: payload.total,
    };

    const targetId = route.query.farmer_id as string | undefined;
    if (targetId && !previewFarmer.value) {
      const match = farmers.value.find((f: any) => f.id === targetId);
      if (match) {
        previewFarmer.value = match;
        selectedIds.add(match.id);
      }
    }
  } catch {
    // silent
  } finally {
    isLoading.value = false;
  }
};

const loadBarangays = async () => {
  try {
    const res = await axiosInstance.get('/farmers/barangays');
    barangays.value = (res.data?.data ?? []).filter(Boolean);
  } catch {
    // optional
  }
};

const handleSearch = (ev: CustomEvent) => {
  searchQuery.value = (ev.detail as any).value ?? '';
  fetchFarmers(1, searchQuery.value);
};

const onBarangayChange = (e: CustomEvent) => {
  filterBarangay.value = (e.detail as any).value ?? '';
  fetchFarmers(1, searchQuery.value);
};

const loadPage = (page: number) => fetchFarmers(page, searchQuery.value);

const ageOf = (farmer: any): number | null => {
  if (!farmer?.birthdate) return null;
  const bd = new Date(farmer.birthdate);
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
};

type PriorityCategory = 'pwd' | 'senior' | 'regular';

const priorityCategory = (farmer: any): PriorityCategory => {
  if (!farmer) return 'regular';
  if (farmer.is_pwd) return 'pwd';
  const age = ageOf(farmer);
  if (age !== null && age >= 60) return 'senior';
  return 'regular';
};

const CATEGORY: Record<PriorityCategory, { label: string; color: string; badge: string }> = {
  pwd:     { label: 'PWD',            color: '#d4af37', badge: 'warning' },
  senior:  { label: 'SENIOR CITIZEN', color: '#d4af37', badge: 'warning' },
  regular: { label: 'REGULAR',        color: '#1a4731', badge: 'success' },
};

const catInfo = (farmer: any) => CATEGORY[priorityCategory(farmer)];

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2400, color, position: 'top' });
  await t.present();
};

const onAfterPrint = () => {
  if (lastPrintIds.value.length) {
    commitPrinted(lastPrintIds.value);
    lastPrintIds.value = [];
  }
};

const printSingleId = async (farmer: any) => {
  const previous = new Set(selectedIds);
  selectedIds.clear();
  selectedIds.add(farmer.id);
  lastPrintIds.value = [farmer.id];
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  window.print();
  commitPrinted([farmer.id]);
  lastPrintIds.value = [];
  selectedIds.clear();
  previous.forEach((id) => selectedIds.add(id));
};

const printBatchIds = async () => {
  if (selectedIds.size === 0) {
    await toast('No farmers selected.', 'warning');
    return;
  }
  const ids = [...selectedIds];
  lastPrintIds.value = ids;
  await nextTick();
  window.print();
  commitPrinted(ids);
  lastPrintIds.value = [];
};

onMounted(() => {
  fetchFarmers();
  loadBarangays();
  window.addEventListener('afterprint', onAfterPrint);
});

onUnmounted(() => {
  window.removeEventListener('afterprint', onAfterPrint);
});
</script>

<style scoped>
.auth-bg {
  --background: #eef3ef;
  --overflow: hidden;
}

.auth-bg::part(scroll) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ═══════════════════════════════════════════════════════════════════
   WORKSPACE HEADER
   ═══════════════════════════════════════════════════════════════════ */
.workspace-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 16px 0;
}

.workspace-title h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #1a4731;
  letter-spacing: -0.01em;
}

.workspace-title p {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: #6b7f74;
}

.workspace-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 84px;
  padding: 6px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.stat-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1a4731;
  line-height: 1.1;
}

.stat-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-pill.stat-pending .stat-value { color: #b45309; }
.stat-pill.stat-printed .stat-value { color: #64748b; }
.stat-pill.stat-photo .stat-value { color: #9a3412; }

/* ═══════════════════════════════════════════════════════════════════
   WORKSPACE GRID
   ═══════════════════════════════════════════════════════════════════ */
.issuance-workspace {
  display: grid;
  grid-template-columns: minmax(0, 58fr) minmax(280px, 42fr);
  gap: 14px;
  padding: 12px 16px 16px;
  flex: 1;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}

.queue-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.queue-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
}

.queue-head h2 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.queue-head-badge {
  background: #d4af37;
  color: #1a4731;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.queue-filters {
  flex-shrink: 0;
  border-bottom: 1px solid #e2e8f0;
}

.list-searchbar {
  --background: #f8fafc;
  padding: 6px 8px;
}

.list-brgy-filter {
  --background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  padding: 0 12px;
  font-size: 0.85rem;
}

.queue-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px 0;
  flex-shrink: 0;
}

.filter-chip {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  min-height: 28px;
}

.filter-chip.on {
  background: #1a4731;
  border-color: #1a4731;
  color: #ffffff;
}

.filter-chip:hover:not(.on) {
  border-color: #1a4731;
  color: #1a4731;
}

.color-legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 8px 14px;
  font-size: 0.72rem;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.legend-title { font-weight: 700; color: #1a4731; }
.legend-item { display: inline-flex; align-items: center; gap: 5px; }
.swatch {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 16px;
  background: #eef5ee;
  border-bottom: 1px solid #dbe9de;
  font-size: 0.78rem;
  flex-shrink: 0;
}

.selection-label { font-weight: 700; color: #1a4731; }

.clear-link {
  font-size: 0.76rem;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}
.clear-link:hover { text-decoration: underline; }

.excel-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #1a4731;
  flex-shrink: 0;
}

/* ── Queue table ───────────────────────────────────────────────── */
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.queue-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12.5px;
  color: #1e293b;
  min-width: 760px;
}

.queue-table th,
.queue-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #eef2f1;
  text-align: left;
  vertical-align: middle;
}

.queue-table thead th {
  position: sticky;
  top: 0;
  background: #1a4731;
  color: #ffffff;
  font-weight: 700;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  z-index: 2;
  white-space: nowrap;
  border-bottom: none;
}

.queue-table .col-check { width: 40px; text-align: center; }
.queue-table .col-farmer { min-width: 140px; }
.queue-table .col-rsbsa { min-width: 120px; }
.queue-table .col-priority { min-width: 100px; }
.queue-table .col-sex { width: 44px; text-align: center; }
.queue-table .col-contact { min-width: 110px; max-width: 140px; }
.queue-table .col-photo { width: 88px; }
.queue-table .col-status { width: 84px; }

.queue-row { cursor: pointer; transition: background 0.1s ease; }
.queue-table tbody tr:nth-child(even) { background: #fafcfb; }
.queue-row:hover { background: #eef5ee; }
.queue-row.row-selected { background: #e4f3e6; }
.queue-row.row-active {
  background: #dbeafe;
  box-shadow: inset 3px 0 0 #1a4731;
}
.queue-row.row-no-photo td { box-shadow: inset 0 -1px 0 #fdba74; }

.state-cell { text-align: center; padding: 2rem 0; }

.farmer-name { font-weight: 700; font-size: 0.86rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }

.priority-mark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #1e293b;
  white-space: nowrap;
}

.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.col-contact {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.mono { font-family: 'Courier New', monospace; font-size: 0.78rem; color: #64748b; }

.status-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.status-chip.chip-pending { background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
.status-chip.chip-printed { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
.status-chip.chip-photo-ready { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; }
.status-chip.chip-photo-missing { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }

.list-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.page-label { font-size: 0.85rem; color: #64748b; font-weight: 600; }

.queue-footer {
  flex-shrink: 0;
  padding: 10px 12px 12px;
  border-top: 1px solid #e2e8f0;
  background: #f8faf9;
}

.print-selected-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  background: #1a4731;
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(26, 71, 49, 0.28);
  transition: background 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
}

.print-selected-btn ion-icon { font-size: 22px; }

.print-selected-btn:hover:not(:disabled) {
  background: #143a28;
}

.print-selected-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.print-selected-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  box-shadow: none;
}

/* ═══════════════════════════════════════════════════════════════════
   PREVIEW PANEL
   ═══════════════════════════════════════════════════════════════════ */
.preview-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.preview-head {
  flex-shrink: 0;
  padding: 12px 16px;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
}

.preview-head h2 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.preview-head p {
  margin: 2px 0 0;
  font-size: 0.74rem;
  color: #d1e0d6;
}

.preview-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle, #e2ece6 1px, transparent 1px) 0 0 / 18px 18px,
    #f7faf8;
  padding: 1.25rem;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 240px;
  color: #64748b;
  gap: 1rem;
  width: 100%;
  text-align: center;
}

.empty-icon {
  font-size: 4.5rem;
  color: #a9bcb2;
}

.empty-preview p {
  margin: 0;
  max-width: 320px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #64748b;
}

.id-preview-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: min(100%, 520px);
  gap: 8px;
}

.action-bar-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.id-card-stage {
  display: flex;
  justify-content: center;
}

.print-only { display: none; }
.print-container { display: none; }

@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  .no-print,
  ion-header,
  ion-fab,
  ion-menu,
  ion-tab-bar {
    display: none !important;
  }

  html, body, ion-app, ion-router-outlet, ion-split-pane,
  .responsive-split, ion-page, .ion-page, ion-content,
  ion-content::part(scroll), ion-content::part(background),
  .inner-scroll, .scroll-content {
    position: relative !important;
    overflow: visible !important;
    contain: none !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;
    box-shadow: none !important;
  }

  ion-content {
    --background: transparent !important;
    --offset-top: 0 !important;
    --offset-bottom: 0 !important;
    --padding-start: 0 !important;
    --padding-end: 0 !important;
    --padding-top: 0 !important;
    --padding-bottom: 0 !important;
  }

  ion-page, .ion-page {
    --background: transparent !important;
    left: 0 !important;
    right: 0 !important;
    top: 0 !important;
    bottom: auto !important;
    display: block !important;
  }

  .print-only,
  .print-container {
    display: grid !important;
  }

  .print-container {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 54mm;
    gap: 10mm;
    justify-items: center;
    align-items: center;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  .id-card-print-wrapper {
    page-break-inside: avoid;
    break-inside: avoid;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 85.6mm;
    height: 53.98mm;
  }

  .id-card-print-wrapper :deep(.id-card) {
    width: 85.6mm;
    height: 53.98mm;
    aspect-ratio: auto;
    box-shadow: none;
  }
}

@media (max-width: 768px) {
  .auth-bg {
    --overflow: auto;
  }

  .auth-bg::part(scroll) {
    height: auto;
  }

  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .issuance-workspace {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .queue-panel {
    height: auto;
    max-height: none;
  }

  .table-wrap {
    max-height: 50vh;
  }

  .preview-panel {
    height: auto;
    min-height: 360px;
  }

  .action-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
