<template>
  <ion-page>
    <AppHeader />

    <ion-content class="ms-bg">
      <div class="ms-shell">
        <!-- ── Top Bar: Program summary ─────────────────────────────────── -->
        <div class="top-bar">
          <div class="top-bar-info">
            <p class="program-name">{{ program.program_name || 'Subsidy Program' }}</p>
            <p class="program-sub">
              {{ cropLabel(program.target_crop) }} &middot; {{ program.items_per_hectare || 0 }} {{ program.unit_of_measurement || 'items' }}/ha &middot;
              min {{ program.min_hectares_limit || 0 }} ha &middot;
              cap {{ program.max_hectares_limit || 0 }} ha
              <span v-if="program.status" class="mock-flag">{{ program.status }}</span>
              <span v-if="isMockData" class="mock-flag">PREVIEW DATA</span>
            </p>
          </div>
          <div class="top-bar-stats">
            <div class="stat">
              <span class="stat-value">{{ totalBeneficiaries }}</span>
              <span class="stat-label">Beneficiaries</span>
            </div>
            <div class="stat claimed-progress">
              <div class="progress-head">
                <span class="stat-value">{{ totalClaimed }}/{{ totalBeneficiaries }}</span>
                <span class="stat-label">Claimed ({{ claimedPct }}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: claimedPct + '%' }"></div>
              </div>
            </div>
            <div class="stat claimed-progress stock-stat">
              <div class="progress-head">
                <span class="stat-value" :class="{ danger: program.is_low_stock }">
                  {{ fmt(program.remaining_quantity) }}/{{ fmt(program.total_quantity) }}
                </span>
                <span class="stat-label">
                  {{ program.unit_of_measurement || 'Bags' }} in Stock
                  <ion-icon v-if="program.is_low_stock" :icon="alertCircleOutline" class="low-icon"></ion-icon>
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill stock" :class="{ danger: program.is_low_stock }" :style="{ width: stockPct + '%' }"></div>
              </div>
            </div>
            <ion-button size="small" fill="outline" class="act-btn stock-btn" @click="openRestock">
              <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
              Log Delivery
            </ion-button>
          </div>
        </div>

        <!-- ── Filter + Action Bar ──────────────────────────────────────── -->
        <div class="tool-bar">
          <div class="filters">
            <select v-model="filterBarangay" class="tool-select">
              <option value="">All Barangays</option>
              <option v-for="b in barangayOptions" :key="b" :value="b">{{ b }}</option>
            </select>
            <select v-model="filterStatus" class="tool-select">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Claimed">Claimed</option>
            </select>
            <input
              v-model="searchTerm"
              type="text"
              class="tool-search"
              placeholder="Search name or RSBSA no."
            />
          </div>
          <div class="actions">
            <ion-button
              v-if="program.status === 'Draft'"
              size="small"
              fill="solid"
              class="act-btn primary"
              :disabled="activating || isMockData"
              @click="confirmActivate"
            >
              <ion-icon slot="start" :icon="playCircleOutline"></ion-icon>
              {{ activating ? 'Activating…' : 'Activate Program' }}
            </ion-button>
            <ion-button size="small" fill="solid" class="act-btn primary" :disabled="generating || program.status === 'Completed'" @click="confirmGenerate">
              <ion-icon slot="start" :icon="syncOutline"></ion-icon>
              Auto-Generate Masterlist
            </ion-button>
            <ion-button size="small" fill="outline" class="act-btn" @click="openSmsModal">
              <ion-icon slot="start" :icon="chatbubbleEllipsesOutline"></ion-icon>
              Trigger SMS Schedule
            </ion-button>
            <ion-button size="small" fill="outline" class="act-btn" @click="printLiquidation">
              <ion-icon slot="start" :icon="printOutline"></ion-icon>
              Print
            </ion-button>
          </div>
        </div>

        <!-- ── Excel-style data grid ─────────────────────────────────────── -->
        <div class="grid-shell">
          <div v-if="loading" class="grid-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading masterlist&hellip;</p>
          </div>
          <div v-else-if="error && !isMockData" class="grid-state error">
            <p>{{ error }}</p>
            <ion-button size="small" @click="fetchMasterlist">Retry</ion-button>
          </div>
          <div v-else class="table-scroll">
            <table class="excel-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th>RSBSA No.</th>
                  <th>Farmer Name</th>
                  <th>Brgy</th>
                  <th class="col-num">Farm Area (ha)</th>
                  <th class="col-num">Allocation</th>
                  <th>Status</th>
                  <th class="col-icon"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in filteredRows" :key="row.rsbsa_no + i">
                  <td class="col-num">{{ i + 1 }}</td>
                  <td class="mono">{{ row.rsbsa_no }}</td>
                  <td>{{ row.last_name }}, {{ row.first_name }}</td>
                  <td>{{ row.barangay }}</td>
                  <td class="col-num">{{ formatArea(row.farm_area) }}</td>
                  <td class="col-num">{{ formatAllocation(row.calculated_allocation) }}</td>
                  <td>
                    <span class="status-pill" :class="row.status === 'Claimed' ? 'claimed' : 'pending'">
                      {{ row.status }}
                    </span>
                  </td>
                  <td class="col-icon">
                    <button
                      v-if="row.status === 'Pending' && program.status === 'Active'"
                      class="icon-btn claim-btn"
                      title="Mark Claimed (deduct from stock)"
                      :disabled="claimingId === row.beneficiary_id"
                      @click="confirmClaim(row)"
                    >
                      <ion-icon :icon="checkmarkCircleOutline"></ion-icon>
                    </button>
                    <button class="icon-btn" title="View Profile" @click="viewProfile(row)">
                      <ion-icon :icon="eyeOutline"></ion-icon>
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredRows.length">
                  <td colspan="8" class="empty-row">{{ emptyMessage }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ion-modal :is-open="smsOpen" @didDismiss="smsOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Trigger SMS Schedule</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="smsOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="sms-label">Target barangays</p>
          <BarangayMultiPicker
            v-model="smsSelectedBarangays"
            v-model:select-all="smsSelectAll"
            :barangays="smsBarangayOptions"
          />
          <ion-item class="sms-message">
            <ion-textarea
              label="Message"
              label-placement="stacked"
              :auto-grow="true"
              :value="smsForm.message"
              @ionInput="(e: any) => smsForm.message = e.detail.value"
              :rows="6"
            ></ion-textarea>
          </ion-item>
          <ion-button
            expand="block"
            class="send-btn"
            :disabled="sendingSms || !smsForm.message.trim() || (!smsSelectAll && !smsSelectedBarangays.length)"
            @click="sendSmsSchedule"
          >
            {{ sendingSms ? 'Sending…' : 'Send Broadcast' }}
          </ion-button>
        </ion-content>
      </ion-modal>

      <ion-modal :is-open="restockOpen" @didDismiss="restockOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Log Incoming Delivery</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="restockOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="modal-program">{{ program.program_name }}</p>
          <p class="modal-hint">
            Current stock:
            <strong>{{ fmt(program.remaining_quantity) }} {{ program.unit_of_measurement }}</strong>
          </p>
          <ion-item class="modal-input">
            <ion-input
              type="number"
              :value="restockQty"
              @ionInput="(e: any) => restockQty = e.detail.value === '' ? null : Number(e.detail.value)"
              :label="`Units Delivered (${program.unit_of_measurement}) *`"
              label-placement="floating"
              placeholder="e.g., 500"
              min="1"
            ></ion-input>
          </ion-item>
          <ion-button expand="block" class="send-btn" :disabled="savingRestock || !(Number(restockQty) >= 1)" @click="submitRestock">
            <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
            {{ savingRestock ? 'Saving…' : 'Add to Stock' }}
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonButton, IonIcon, IonSpinner, IonModal, IonItem, IonTextarea,
  toastController, alertController,
} from '@ionic/vue';
import {
  refreshOutline, syncOutline, chatbubbleEllipsesOutline, printOutline, eyeOutline,
  alertCircleOutline, addCircleOutline, checkmarkCircleOutline, playCircleOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { cropLabel } from '@/utils/cropLabel';
import BarangayMultiPicker from '@/components/BarangayMultiPicker.vue';

interface MasterlistRow {
  beneficiary_id: string;
  rsbsa_no: string;
  last_name: string;
  first_name: string;
  barangay: string;
  farm_area: number;
  calculated_allocation: number;
  status: 'Pending' | 'Claimed';
}

const route = useRoute();
const router = useRouter();
const programId = computed(() => String(route.params.id || ''));

const loading = ref(true);
const generating = ref(false);
const activating = ref(false);
const sendingSms = ref(false);
const smsOpen = ref(false);
const error = ref('');
const isMockData = ref(false);

const claimingId = ref<string | null>(null);
const restockOpen = ref(false);
const restockQty = ref<number | null>(null);
const savingRestock = ref(false);

const program = reactive<any>({
  id: '',
  program_name: '',
  target_crop: '',
  max_hectares_limit: 0,
  items_per_hectare: 0,
  status: '',
  unit_of_measurement: 'Bags',
  total_quantity: 0,
  remaining_quantity: 0,
  reorder_level: null,
  is_low_stock: false,
});

const rows = ref<MasterlistRow[]>([]);

const filterBarangay = ref('');
const filterStatus = ref('');
const searchTerm = ref('');

const smsForm = reactive({ message: '' });
const smsSelectAll = ref(true);
const smsSelectedBarangays = ref<string[]>([]);
const smsBarangayOptions = ref<string[]>([]);

// ── Mock dataset (20 farmers) — spreadsheet width/CSS preview when no
// program is selected yet, or the live API is unreachable. ──────────────────
const MOCK_BARANGAYS = ['San Fabian', 'Garit Norte', 'Fugu', 'Soyung (Poblacion)', 'Mabbayad', 'Magleticia', 'Angoluan', 'Aromin'];
const MOCK_SURNAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Torres', 'Ramos', 'Mendoza', 'Flores', 'Aquino'];
const MOCK_FIRST_NAMES = ['Juan', 'Maria', 'Pedro', 'Rosa', 'Antonio', 'Carmen', 'Jose', 'Elena', 'Ricardo', 'Luz'];

const buildMockRows = (): MasterlistRow[] =>
  Array.from({ length: 20 }, (_, i) => {
    const area = Number((0.5 + (i % 6) * 0.35).toFixed(2));
    return {
      beneficiary_id: `mock-${i}`,
      rsbsa_no: `03-14-08-${String(1000 + i).padStart(6, '0')}`,
      last_name: MOCK_SURNAMES[i % MOCK_SURNAMES.length],
      first_name: MOCK_FIRST_NAMES[i % MOCK_FIRST_NAMES.length],
      barangay: MOCK_BARANGAYS[i % MOCK_BARANGAYS.length],
      farm_area: area,
      calculated_allocation: Math.max(1, Math.floor(area * 2)),
      status: i % 3 === 0 ? 'Claimed' : 'Pending',
    };
  });

const loadMock = () => {
  isMockData.value = true;
  Object.assign(program, {
    id: programId.value || 'preview',
    program_name: 'Rice Resiliency Program (Preview)',
    target_crop: 'Rice',
    max_hectares_limit: 2,
    items_per_hectare: 2,
    status: 'Active',
    unit_of_measurement: 'Bags',
    total_quantity: 60,
    remaining_quantity: 22,
    reorder_level: 20,
    is_low_stock: true,
  });
  rows.value = buildMockRows();
};

const barangayOptions = computed(() =>
  [...new Set(rows.value.map((r) => r.barangay))].filter(Boolean).sort()
);

const filteredRows = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return rows.value.filter((r) => {
    if (filterBarangay.value && r.barangay !== filterBarangay.value) return false;
    if (filterStatus.value && r.status !== filterStatus.value) return false;
    if (term) {
      const haystack = `${r.rsbsa_no} ${r.last_name} ${r.first_name}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
});

const emptyMessage = computed(() => {
  if (!rows.value.length) {
    return 'Masterlist is empty. Click Auto-Generate Masterlist to scan RSBSA farmers with matching Rice/Corn plots or active planting logs.';
  }
  return 'No beneficiaries match the current filters.';
});

const totalBeneficiaries = computed(() => rows.value.length);
const totalClaimed = computed(() => rows.value.filter((r) => r.status === 'Claimed').length);
const claimedPct = computed(() =>
  totalBeneficiaries.value ? Math.round((totalClaimed.value / totalBeneficiaries.value) * 100) : 0
);
const stockPct = computed(() =>
  program.total_quantity ? Math.max(0, Math.min(100, Math.round((program.remaining_quantity / program.total_quantity) * 100))) : 0
);

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');
const formatArea = (v: number) => Number(v ?? 0).toFixed(2);
const formatAllocation = (v: number) => `${v ?? 0} ${Number(v) === 1 ? 'Bag' : 'Bags'}`;

const toast = async (message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'success') => {
  const t = await toastController.create({ message, duration: 2800, color, position: 'top' });
  await t.present();
};

const fetchMasterlist = async () => {
  if (!programId.value) {
    loading.value = false;
    loadMock();
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get(`/subsidies/${programId.value}/masterlist`);
    const payload = res.data?.data ?? {};
    Object.assign(program, payload.program ?? {});
    rows.value = (payload.masterlist ?? []).map((r: any) => ({
      beneficiary_id: r.beneficiary_id,
      rsbsa_no: r.rsbsa_no,
      last_name: r.last_name,
      first_name: r.first_name,
      barangay: r.barangay || 'Unspecified',
      farm_area: Number(r.farm_area || 0),
      calculated_allocation: Number(r.calculated_allocation || 0),
      status: r.status,
    }));
    isMockData.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load the masterlist. Showing preview data.';
    loadMock();
  } finally {
    loading.value = false;
  }
};

const confirmActivate = async () => {
  const alert = await alertController.create({
    header: 'Activate this program?',
    message: 'Once Active, technicians can start dispensing subsidies to farmers on this masterlist.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Activate', handler: () => activateProgram() },
    ],
  });
  await alert.present();
};

const activateProgram = async () => {
  if (!programId.value || isMockData.value) return;
  activating.value = true;
  try {
    const res = await apiClient.patch(`/subsidies/${programId.value}/status`, { status: 'Active' });
    program.status = res.data?.data?.status || 'Active';
    await toast(res.data?.message || 'Program marked Active.', 'success');
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to activate program.', 'danger');
  } finally {
    activating.value = false;
  }
};

const confirmGenerate = async () => {
  const alert = await alertController.create({
    header: 'Auto-Generate Masterlist',
    message: 'Scan active planting logs for matching farmers and add newly eligible beneficiaries?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Generate',
        handler: () => generateMasterlist(),
      },
    ],
  });
  await alert.present();
};

const generateMasterlist = async () => {
  if (!programId.value) {
    await toast('Select a program first.', 'warning');
    return;
  }
  generating.value = true;
  try {
    const res = await apiClient.post(`/subsidies/${programId.value}/generate-masterlist`);
    const generated = Number(res.data?.data?.generated_count ?? 0);
    await toast(
      res.data?.message || 'Masterlist generated.',
      generated > 0 ? 'success' : 'warning',
    );
    await fetchMasterlist();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to generate masterlist.', 'danger');
  } finally {
    generating.value = false;
  }
};

const confirmClaim = async (row: MasterlistRow) => {
  const alert = await alertController.create({
    header: 'Mark as Claimed',
    message: `Release ${row.calculated_allocation} ${program.unit_of_measurement || 'Bags'} to ${row.last_name}, ${row.first_name} (${row.rsbsa_no})? This deducts from the program's warehouse stock.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm Release', handler: () => claimBeneficiary(row) },
    ],
  });
  await alert.present();
};

const claimBeneficiary = async (row: MasterlistRow) => {
  if (isMockData.value) {
    row.status = 'Claimed';
    program.remaining_quantity = Math.max(0, program.remaining_quantity - row.calculated_allocation);
    await toast('Beneficiary marked as Claimed. (Preview data)', 'success');
    return;
  }
  claimingId.value = row.beneficiary_id;
  try {
    const res = await apiClient.patch(`/subsidies/${programId.value}/beneficiaries/${row.beneficiary_id}/claim`);
    Object.assign(program, res.data?.data?.program ?? {});
    row.status = 'Claimed';
    await toast(res.data?.message || 'Beneficiary marked as Claimed.', 'success');
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to mark as claimed.', 'danger');
  } finally {
    claimingId.value = null;
  }
};

const openRestock = () => {
  restockQty.value = null;
  restockOpen.value = true;
};

const submitRestock = async () => {
  if (!(Number(restockQty.value) >= 1)) return;
  if (isMockData.value) {
    program.total_quantity += Number(restockQty.value);
    program.remaining_quantity += Number(restockQty.value);
    restockOpen.value = false;
    await toast('Delivery logged. (Preview data)', 'success');
    return;
  }
  savingRestock.value = true;
  try {
    const res = await apiClient.post(`/subsidies/${programId.value}/restock`, {
      quantity_added: Number(restockQty.value),
    });
    Object.assign(program, res.data?.data ?? {});
    await toast(res.data?.message || 'Delivery logged.', 'success');
    restockOpen.value = false;
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to log delivery.', 'danger');
  } finally {
    savingRestock.value = false;
  }
};

const openSmsModal = async () => {
  smsSelectAll.value = !filterBarangay.value;
  smsSelectedBarangays.value = filterBarangay.value ? [filterBarangay.value] : [];
  smsForm.message = `Your ${cropLabel(program.target_crop)} subsidy allocation under "${program.program_name || 'the program'}" is ready. Please visit the MAO office with your RSBSA ID to claim.`;
  smsOpen.value = true;
  if (!smsBarangayOptions.value.length) {
    try {
      const res = await apiClient.get('/farmers/barangays');
      smsBarangayOptions.value = res.data?.data ?? [];
    } catch {
      smsBarangayOptions.value = barangayOptions.value;
    }
  }
};

const sendSmsSchedule = async () => {
  if (!smsForm.message.trim()) return;
  if (!smsSelectAll.value && !smsSelectedBarangays.value.length) {
    await toast('Select all barangays, or check at least one.', 'danger');
    return;
  }
  sendingSms.value = true;
  try {
    await apiClient.post('/broadcasts/send', {
      message_body: smsForm.message.trim(),
      target_barangays: smsSelectAll.value ? [] : smsSelectedBarangays.value,
      target_commodity: program.target_crop === 'Both' ? 'Both' : (program.target_crop || 'All'),
    });
    await toast('SMS advisory scheduled for broadcast.', 'success');
    smsOpen.value = false;
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Broadcast failed.', 'danger');
  } finally {
    sendingSms.value = false;
  }
};

const printLiquidation = () => window.print();

const viewProfile = (row: MasterlistRow) => {
  router.push({ path: '/admin/farmers', query: { search: row.rsbsa_no } });
};

onMounted(() => fetchMasterlist());
</script>

<style scoped>
.ms-bg { --background: #eef1f4; }
.ms-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem 1rem 1rem;
  gap: 0.6rem;
}

/* ── Top bar ─────────────────────────────────────────────────────────── */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}
.program-name { margin: 0; font-size: 1.05rem; font-weight: 800; color: #1a4731; }
.program-sub { margin: 0.1rem 0 0; font-size: 0.78rem; color: #64748b; font-weight: 600; }
.mock-flag {
  margin-left: 0.5rem;
  color: #a3831f;
  background: rgba(212, 175, 55, 0.16);
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.top-bar-stats { display: flex; align-items: center; gap: 1.5rem; }
.stat { display: flex; flex-direction: column; align-items: flex-end; min-width: 90px; }
.stat-value { font-size: 1.1rem; font-weight: 800; color: #1a4731; line-height: 1.1; }
.stat-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
.claimed-progress { min-width: 160px; align-items: stretch; }
.progress-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
.progress-track { background: #e2e8f0; height: 7px; border-radius: 4px; overflow: hidden; }
.progress-fill { background: #1a4731; height: 100%; transition: width 0.4s ease; }
.progress-fill.stock { background: #d4af37; }
.progress-fill.stock.danger { background: #dc2626; }
.stock-stat .stat-value.danger { color: #b91c1c; }
.low-icon { font-size: 0.85rem; vertical-align: -1px; color: #dc2626; margin-left: 2px; }
.stock-btn { --border-color: #d4af37; --color: #a3831f; }

/* ── Tool bar (filters + actions) ───────────────────────────────────── */
.tool-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.tool-select, .tool-search {
  font-size: 0.82rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 8px;
  background: #fff;
  color: #334155;
  font-family: inherit;
}
.tool-search { width: 220px; }
.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.act-btn {
  --border-radius: 6px;
  text-transform: none;
  font-weight: 700;
  font-size: 0.78rem;
  --box-shadow: none;
  margin: 0;
}
.act-btn.primary { --background: #1a4731; --color: #fff; }
.act-btn:not(.primary) { --border-color: #1a4731; --color: #1a4731; }

/* ── Excel-style grid ────────────────────────────────────────────────── */
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
.table-scroll { flex: 1; overflow: auto; }

.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
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
.excel-table .col-num { text-align: right; width: 1%; }
.excel-table .col-icon { width: 1%; text-align: center; }
.excel-table .mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem 0; }

.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.status-pill.claimed { background: #dcfce7; color: #166534; }
.status-pill.pending { background: #fef9c3; color: #854d0e; }

.icon-btn {
  border: none;
  background: transparent;
  color: #1a4731;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px;
}
.icon-btn:hover { color: #d4af37; }
.icon-btn.claim-btn { color: #16a34a; margin-right: 4px; }
.icon-btn.claim-btn:hover { color: #15803d; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.modal-program { font-weight: 800; color: #1a4731; font-size: 1.15rem; margin: 0 0 4px; }
.modal-hint { color: #64748b; font-size: 0.85rem; margin: 4px 0 1rem; }
.modal-input { --background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.8rem; }

.send-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 1rem;
}
.sms-label {
  margin: 0 0 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a4731;
}
.sms-message { margin-top: 0.85rem; }

@media (max-width: 900px) {
  .top-bar { flex-direction: column; align-items: flex-start; }
  .top-bar-stats { width: 100%; justify-content: space-between; }
  .tool-search { width: 100%; }
  .filters, .actions { width: 100%; }
}

/* ── Print (Liquidation PDF export) ─────────────────────────────────── */
@media print {
  ion-header, .tool-bar, .icon-btn { display: none !important; }
  .ms-shell { padding: 0; }
  .grid-shell { border: none; }
  .excel-table thead th { position: static; background: #1a4731 !important; color: #fff !important; }
}
</style>
