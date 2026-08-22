<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Manage Farmers</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="goToRegistration">
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar
          placeholder="Search name, RSBSA no., barangay..."
          @ionInput="handleSearch"
          :debounce="450"
          style="--background:#fff;--color:#0f172a;"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="list-bg">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- ═══════════════════════════════════════════════════════════
           1. ADVANCED FILTER BAR
           ═══════════════════════════════════════════════════════════ -->
      <div class="controls-bar">
        <!-- Row 1: Quick Status Chips -->
        <div class="controls-row status-chips-row">
          <span class="filter-group-label">Status:</span>
          <ion-chip
            v-for="s in statusFilters"
            :key="s.value"
            :class="{ active: activeStatus === s.value, off: activeStatus !== s.value }"
            @click="setStatusFilter(s.value)"
          >
            <ion-icon v-if="s.icon" :icon="s.icon"></ion-icon>
            {{ s.label }}
          </ion-chip>
        </div>

        <!-- Row 2: Deep Filters + Export -->
        <div class="controls-row deep-filters-row">
          <ion-select
            class="ctrl-filter"
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

          <ion-select
            class="ctrl-filter"
            label="Commodity"
            label-placement="stacked"
            interface="popover"
            :value="filterCommodity"
            placeholder="All"
            @ionChange="onCommodityChange"
          >
            <ion-select-option :value="''">All commodities</ion-select-option>
            <ion-select-option value="Rice">Rice</ion-select-option>
            <ion-select-option value="Corn">Corn</ion-select-option>
            <ion-select-option value="High-Value">High-Value</ion-select-option>
          </ion-select>

          <ion-button size="small" fill="solid" color="success" class="export-btn" @click="exportFarmers">
            <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
            Export CSV
          </ion-button>
        </div>

        <!-- Row 3: Column toggles -->
        <div class="controls-row wrap">
          <ion-chip :class="{ off: !pwdOnly }" @click="pwdOnly = !pwdOnly">
            <ion-icon :icon="accessibilityOutline"></ion-icon> PWD only
          </ion-chip>
          <span class="col-label">Columns:</span>
          <ion-chip :class="{ off: !showCols.rsbsa }" @click="showCols.rsbsa = !showCols.rsbsa">RSBSA</ion-chip>
          <ion-chip :class="{ off: !showCols.address }" @click="showCols.address = !showCols.address">Address</ion-chip>
          <ion-chip :class="{ off: !showCols.plots }" @click="showCols.plots = !showCols.plots">Plots</ion-chip>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="farmerStore.isLoading" class="center-state">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading registry...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="farmerStore.error" class="center-state error">
        <ion-icon :icon="alertCircleOutline" size="large"></ion-icon>
        <p>{{ farmerStore.error }}</p>
        <ion-button @click="farmerStore.fetchFarmers()">Retry</ion-button>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else-if="displayedFarmers.length === 0"
        variant="farmers"
        :title="pwdOnly ? 'No PWD farmers' : 'No farmers found'"
        :message="pwdOnly ? 'No PWD farmers on this page.' : 'No farmers found. Tap + to enroll the first farmer.'"
        :action-label="pwdOnly ? '' : 'Enroll Farmer'"
        @action="goToRegistration"
      />

      <!-- ═══════════════════════════════════════════════════════════
           EXCEL-STYLE DATA TABLE (with Checkboxes)
           ═══════════════════════════════════════════════════════════ -->
      <div v-else class="table-responsive excel-grid">
        <table class="excel-table">
          <thead>
            <tr>
              <!-- 2. Bulk Selection: Select All checkbox -->
              <th class="col-check">
                <input
                  type="checkbox"
                  class="excel-checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  title="Select all visible rows"
                />
              </th>
              <th class="col-id">#</th>
              <th class="col-name frozen-col frozen-header">Farmer Name</th>
              <th v-if="showCols.rsbsa" class="col-rsbsa">RSBSA No.</th>
              <th v-if="showCols.address" class="col-brgy">Barangay</th>
              <th v-if="showCols.plots" class="col-plots">Total Plots</th>
              <th class="col-tags">Tags</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(farmer, idx) in displayedFarmers"
              :key="farmer.id"
              class="data-row"
              :class="{ 'row-selected': selectedIds.has(farmer.id) }"
            >
              <!-- 2. Bulk Selection: Row checkbox -->
              <td class="col-check">
                <input
                  type="checkbox"
                  class="excel-checkbox"
                  :checked="selectedIds.has(farmer.id)"
                  @change="toggleRowSelection(farmer)"
                />
              </td>

              <!-- Row index -->
              <td class="col-id cell-id">{{ rowNumber(idx) }}</td>

              <!-- Frozen: Farmer Name -->
              <td class="col-name frozen-col frozen-body">
                <div class="name-cell">
                  <span class="farmer-name-text">
                    {{ farmer.surname }}, {{ farmer.first_name }}
                    <span v-if="farmer.ext_name"> {{ farmer.ext_name }}</span>
                  </span>
                </div>
              </td>

              <!-- RSBSA -->
              <td v-if="showCols.rsbsa" class="col-rsbsa">
                <span :class="farmer.rsbsa_no ? 'rsbsa-value' : 'rsbsa-pending'">
                  {{ farmer.rsbsa_no || 'Pending' }}
                </span>
              </td>

              <!-- Barangay -->
              <td v-if="showCols.address" class="col-brgy">{{ farmer.permanent_brgy || '—' }}</td>

              <!-- Total Plots -->
              <td v-if="showCols.plots" class="col-plots">
                <span class="badge-plots">
                  {{ farmer.farm_plots_count ?? 0 }}
                </span>
              </td>

              <!-- Tags -->
              <td class="col-tags">
                <span v-if="farmer.is_pwd" class="badge-pwd">PWD</span>
                <span v-if="farmer.is_4ps_beneficiary" class="badge-4ps">4Ps</span>
                <span v-if="!farmer.is_pwd && !farmer.is_4ps_beneficiary" class="no-tags">—</span>
              </td>

              <!-- 4. Actions: Ellipsis context menu -->
              <td class="col-actions">
                <button
                  class="btn-actions-trigger"
                  :id="`actions-trigger-${farmer.id}`"
                  title="More actions"
                >
                  <ion-icon :icon="ellipsisVertical"></ion-icon>
                </button>

                <ion-popover
                  :trigger="`actions-trigger-${farmer.id}`"
                  trigger-action="click"
                  side="left"
                  alignment="center"
                  :dismiss-on-select="true"
                >
                  <ion-content class="popover-content">
                    <ion-list lines="none" class="context-menu-list">
                      <ion-item button :detail="false" @click="openDetail(farmer)">
                        <ion-icon :icon="eyeOutline" slot="start" class="ctx-icon"></ion-icon>
                        <ion-label>Review Profile</ion-label>
                      </ion-item>
                      <ion-item button :detail="false" @click="viewFarmPlots(farmer)">
                        <ion-icon :icon="mapOutline" slot="start" class="ctx-icon"></ion-icon>
                        <ion-label>View Farm Plots</ion-label>
                      </ion-item>
                      <ion-item button :detail="false" @click="goToIdIssuance(farmer)">
                        <ion-icon :icon="idCardOutline" slot="start" class="ctx-icon"></ion-icon>
                        <ion-label>Print ID</ion-label>
                      </ion-item>
                      <ion-item button :detail="false" @click="suspendRecord(farmer)" class="ctx-danger">
                        <ion-icon :icon="warningOutline" slot="start" class="ctx-icon danger-icon"></ion-icon>
                        <ion-label color="danger">Suspend Record</ion-label>
                      </ion-item>
                    </ion-list>
                  </ion-content>
                </ion-popover>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="farmerStore.pagination && farmerStore.pagination.last_page > 1" class="pagination-bar">
        <ion-button fill="outline" size="small"
          :disabled="farmerStore.pagination.current_page <= 1"
          @click="changePage(farmerStore.pagination.current_page - 1)">
          <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
        </ion-button>

        <span class="page-info">
          Page {{ farmerStore.pagination.current_page }} of {{ farmerStore.pagination.last_page }}
          &nbsp;·&nbsp; {{ farmerStore.pagination.total }} farmers
        </span>

        <ion-button fill="outline" size="small"
          :disabled="farmerStore.pagination.current_page >= farmerStore.pagination.last_page"
          @click="changePage(farmerStore.pagination.current_page + 1)">
          <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
        </ion-button>
      </div>

      <!-- ═══════════════════════════════════════════════════════════
           3. FLOATING BULK ACTION BAR
           ═══════════════════════════════════════════════════════════ -->
      <Transition name="bulk-bar">
        <div v-if="selectedIds.size > 0" class="bulk-action-bar" slot="fixed">
          <div class="bulk-bar-inner">
            <div class="bulk-count">
              <ion-icon :icon="checkmarkDoneOutline" class="bulk-count-icon"></ion-icon>
              <strong>{{ selectedIds.size }}</strong> Farmer{{ selectedIds.size !== 1 ? 's' : '' }} Selected
            </div>
            <div class="bulk-actions">
              <button class="bulk-btn" @click="bulkExportCsv">
                <ion-icon :icon="downloadOutline"></ion-icon>
                Export CSV
              </button>
              <button class="bulk-btn bulk-btn--verify" @click="bulkMarkVerified">
                <ion-icon :icon="checkmarkCircleOutline"></ion-icon>
                Mark Verified
              </button>
              <button class="bulk-btn bulk-btn--sms" @click="bulkSendSms">
                <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
                SMS Broadcast
              </button>
              <button class="bulk-btn bulk-btn--clear" @click="clearSelection">
                <ion-icon :icon="closeOutline"></ion-icon>
                Clear
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" @click="goToRegistration">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Farmer Detail Modal -->
    <ion-modal :is-open="isModalOpen" @didDismiss="isModalOpen = false">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-button @click="isModalOpen = false">
              <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Farmer Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="goToIdIssuance(selectedFarmer)" fill="clear">
              <ion-icon slot="start" :icon="idCardOutline"></ion-icon>
              Print ID
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding detail-bg" v-if="selectedFarmer">
        <div class="detail-card">
          <div class="detail-avatar-row">
            <div class="detail-avatar">
              <img v-if="selectedFarmer.photo_path"
                :src="`${API_BASE}/storage/${selectedFarmer.photo_path}`" />
              <div v-else class="avatar-initials large">{{ initials(selectedFarmer) }}</div>
            </div>
            <div>
              <h2 class="detail-name">{{ selectedFarmer.first_name }} {{ selectedFarmer.middle_name ? selectedFarmer.middle_name[0] + '.' : '' }} {{ selectedFarmer.surname }}</h2>
              <ion-badge color="primary">{{ selectedFarmer.livelihood_type }}</ion-badge>
              <ion-badge v-if="selectedFarmer.is_pwd" color="warning" style="margin-left:6px;">PWD</ion-badge>
              <ion-badge v-if="selectedFarmer.is_4ps_beneficiary" color="secondary" style="margin-left:6px;">4Ps</ion-badge>
            </div>
          </div>

          <ion-list>
            <ion-item>
              <ion-label>
                <p class="lbl">RSBSA Number</p>
                <h3>{{ selectedFarmer.rsbsa_no || 'Pending issuance' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <p class="lbl">Address</p>
                <h3>{{ selectedFarmer.permanent_brgy }}, {{ selectedFarmer.permanent_city }}, {{ selectedFarmer.permanent_province }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <p class="lbl">Contact</p>
                <h3>{{ selectedFarmer.mobile_number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <p class="lbl">Sex / Civil Status</p>
                <h3>{{ selectedFarmer.sex }} &middot; {{ selectedFarmer.civil_status }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <p class="lbl">Education</p>
                <h3>{{ selectedFarmer.highest_education }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>

          <h3 class="section-title">
            Farm Plots ({{ (selectedFarmer.farm_plots || []).length }})
            · Total {{ totalPlotHa(selectedFarmer) }} ha
          </h3>
          <ion-card v-for="plot in (selectedFarmer.farm_plots || [])" :key="plot.id" class="plot-card">
            <ion-card-content>
              <div class="plot-row">
                <div>
                  <strong>{{ plot.commodity }}</strong>
                  <p>{{ plot.size_ha }} ha &middot; {{ plot.location_brgy }}, {{ plot.location_city }}</p>
                  <p class="text-muted">{{ plot.farm_type }} &middot; {{ plot.ownership_type }}</p>
                </div>
                <ion-badge color="success">{{ plot.size_ha }} ha</ion-badge>
              </div>
            </ion-card-content>
          </ion-card>

          <h3 class="section-title">Subsidy Claims</h3>
          <div v-if="isLoadingDetail" class="ion-text-center"><ion-spinner></ion-spinner></div>
          <div v-else-if="!selectedFarmer.distributions?.length" class="empty-sub">No claims on record.</div>
          <ion-card v-for="d in (selectedFarmer.distributions || [])" :key="d.id" class="plot-card">
            <ion-card-content>
              <div class="plot-row">
                <div>
                  <strong>{{ d.program?.name }}</strong>
                  <p>{{ d.quantity_claimed }} {{ d.program?.unit_of_measurement }}</p>
                </div>
                <ion-badge color="primary">{{ d.program?.type }}</ion-badge>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </ion-content>
    </ion-modal>

  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmerStore } from '@/stores/farmerStore';
import type { Farmer } from '@/stores/farmerStore';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonButton, IonSearchbar, IonSpinner,
  IonList, IonItem, IonLabel, IonBadge, IonIcon,
  IonFab, IonFabButton, IonRefresher, IonRefresherContent,
  IonModal, IonCard, IonCardContent, IonSelect, IonSelectOption, IonChip,
  IonPopover,
  toastController, alertController,
} from '@ionic/vue';
import {
  addOutline, alertCircleOutline,
  chevronBackOutline, chevronForwardOutline,
  closeOutline, idCardOutline, downloadOutline, accessibilityOutline,
  ellipsisVertical, eyeOutline, mapOutline, warningOutline,
  checkmarkDoneOutline, checkmarkCircleOutline,
  chatbubbleEllipsesOutline,
  checkmarkOutline, timeOutline, copyOutline, peopleOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';

const router = useRouter();
const farmerStore = useFarmerStore();
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://127.0.0.1:8000';

// ── Modal state ───────────────────────────────────────────────────
const isModalOpen = ref(false);
const selectedFarmer = ref<any>(null);
const isLoadingDetail = ref(false);

const totalPlotHa = (farmer: any) => {
  const plots = farmer?.farm_plots || farmer?.farmPlots || [];
  const sum = plots.reduce((s: number, p: any) => s + (Number(p.size_ha) || 0), 0);
  return sum.toLocaleString('en-PH', { maximumFractionDigits: 2 });
};

// ── Filter state ──────────────────────────────────────────────────
const barangays = ref<string[]>([]);
const filterBarangay = ref('');
const filterCommodity = ref('');
const pwdOnly = ref(false);
const showCols = reactive({ rsbsa: true, address: true, plots: true });

// 1. Advanced Filters — Quick Status Chips
type StatusFilter = 'all' | 'verified' | 'pending' | 'duplicate';
const activeStatus = ref<StatusFilter>('all');
const statusFilters: { value: StatusFilter; label: string; icon: any }[] = [
  { value: 'all',       label: 'All',       icon: peopleOutline },
  { value: 'verified',  label: 'Verified',  icon: checkmarkOutline },
  { value: 'pending',   label: 'Pending',   icon: timeOutline },
  { value: 'duplicate', label: 'Duplicate', icon: copyOutline },
];

const setStatusFilter = (status: StatusFilter) => {
  activeStatus.value = status;
  // Re-fetch from API — backend can filter by status if supported,
  // otherwise client-side filter is applied in displayedFarmers
  farmerStore.fetchFarmers(1, '');
};

// ── Computed displayed farmers (client-side layers) ───────────────
const displayedFarmers = computed(() => {
  let list = farmerStore.farmers as Farmer[];

  // PWD filter
  if (pwdOnly.value) {
    list = list.filter((f) => f.is_pwd);
  }

  // Status filter (client-side heuristic)
  if (activeStatus.value === 'verified') {
    list = list.filter((f) => !!f.rsbsa_no);
  } else if (activeStatus.value === 'pending') {
    list = list.filter((f) => !f.rsbsa_no);
  }
  // 'duplicate' and 'all' pass through — duplicates would require backend support

  return list;
});

// ── 2. Bulk Selection Engine ──────────────────────────────────────
const selectedIds = reactive(new Set<string>());

const isAllSelected = computed(() =>
  displayedFarmers.value.length > 0 &&
  displayedFarmers.value.every((f) => selectedIds.has(f.id))
);

const isIndeterminate = computed(() =>
  !isAllSelected.value && displayedFarmers.value.some((f) => selectedIds.has(f.id))
);

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // Deselect all visible
    displayedFarmers.value.forEach((f) => selectedIds.delete(f.id));
  } else {
    // Select all visible
    displayedFarmers.value.forEach((f) => selectedIds.add(f.id));
  }
};

const toggleRowSelection = (farmer: Farmer) => {
  if (selectedIds.has(farmer.id)) {
    selectedIds.delete(farmer.id);
  } else {
    selectedIds.add(farmer.id);
  }
};

const clearSelection = () => {
  selectedIds.clear();
};

// Clear selection when page changes
watch(() => farmerStore.pagination?.current_page, () => {
  selectedIds.clear();
});

// ── 3. Bulk Action Handlers ───────────────────────────────────────
const getSelectedFarmerObjects = (): Farmer[] =>
  farmerStore.farmers.filter((f) => selectedIds.has(f.id));

const bulkExportCsv = async () => {
  try {
    const ids = Array.from(selectedIds);
    const params: Record<string, any> = { farmer_ids: ids.join(',') };
    if (filterBarangay.value) params.barangay = filterBarangay.value;
    const res = await apiClient.get('/reports/export/farmers', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-akap-selected-farmers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    await toast(`Exported ${ids.length} farmer(s).`, 'success');
  } catch {
    await toast('Bulk export failed.', 'danger');
  }
};

const bulkMarkVerified = async () => {
  const count = selectedIds.size;
  const alert = await alertController.create({
    header: 'Confirm Verification',
    message: `Mark ${count} farmer(s) as verified? This will assign RSBSA numbers where missing.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Mark Verified',
        handler: async () => {
          try {
            await apiClient.post('/farmers/bulk-verify', { ids: Array.from(selectedIds) });
            await toast(`${count} farmer(s) marked as verified.`, 'success');
            clearSelection();
            farmerStore.fetchFarmers();
          } catch {
            await toast('Verification failed. Please try again.', 'danger');
          }
        },
      },
    ],
  });
  await alert.present();
};

const bulkSendSms = async () => {
  const farmers = getSelectedFarmerObjects();
  const withMobile = farmers.filter((f) => f.mobile_number);
  if (withMobile.length === 0) {
    await toast('None of the selected farmers have a mobile number.', 'warning');
    return;
  }

  const alert = await alertController.create({
    header: 'SMS Broadcast',
    subHeader: `Sending to ${withMobile.length} farmer(s) with mobile numbers`,
    inputs: [
      {
        name: 'message',
        type: 'textarea',
        placeholder: 'Type your message here...',
      },
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Send',
        handler: async (data: any) => {
          if (!data.message?.trim()) {
            toast('Message cannot be empty.', 'warning');
            return false;
          }
          try {
            await apiClient.post('/sms/broadcast', {
              farmer_ids: withMobile.map((f) => f.id),
              message: data.message.trim(),
            });
            await toast(`SMS sent to ${withMobile.length} farmer(s).`, 'success');
            clearSelection();
          } catch {
            await toast('SMS broadcast failed.', 'danger');
          }
        },
      },
    ],
  });
  await alert.present();
};

// ── 4. Row-Level Context Menu Actions ─────────────────────────────
const viewFarmPlots = (farmer: Farmer) => {
  // Open the detail modal scrolled to the farm plots section
  openDetail(farmer);
};

const suspendRecord = async (farmer: Farmer) => {
  const alert = await alertController.create({
    header: 'Suspend Record',
    message: `Are you sure you want to suspend the record of ${farmer.first_name} ${farmer.surname}? This action can be reversed.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Suspend',
        cssClass: 'alert-danger-btn',
        handler: async () => {
          try {
            await apiClient.post(`/farmers/${farmer.id}/suspend`);
            await toast(`Record for ${farmer.surname} suspended.`, 'warning');
            farmerStore.fetchFarmers();
          } catch {
            await toast('Failed to suspend record.', 'danger');
          }
        },
      },
    ],
  });
  await alert.present();
};

// ── Existing logic (preserved) ────────────────────────────────────

/** Compute the absolute row number across paginated pages */
const rowNumber = (idx: number): number => {
  const page = farmerStore.pagination?.current_page ?? 1;
  const perPage = 15; // Laravel default per-page
  return (page - 1) * perPage + idx + 1;
};

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2400, color, position: 'top' });
  await t.present();
};

const loadBarangays = async () => {
  try {
    const res = await apiClient.get('/farmers/barangays');
    barangays.value = (res.data?.data ?? []).filter(Boolean);
  } catch {
    // optional
  }
};

const onBarangayChange = (e: CustomEvent) => {
  filterBarangay.value = (e.detail as any).value ?? '';
  farmerStore.fetchFarmers(1, filterBarangay.value);
};

const onCommodityChange = (e: CustomEvent) => {
  filterCommodity.value = (e.detail as any).value ?? '';
  // If the backend supports commodity filtering, pass as a query param
  // For now, we trigger a fetch — extend the backend API as needed
  farmerStore.fetchFarmers(1, '');
};

const exportFarmers = async () => {
  try {
    const params: Record<string, string> = {};
    if (filterBarangay.value) params.barangay = filterBarangay.value;
    const res = await apiClient.get('/reports/export/farmers', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-akap-farmers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    await toast('Farmer registry exported.', 'success');
  } catch {
    await toast('Export failed. Please try again.', 'danger');
  }
};

onMounted(() => {
  farmerStore.fetchFarmers();
  loadBarangays();
});

const handleSearch = (event: CustomEvent) => {
  const query = (event.detail as any).value ?? '';
  farmerStore.fetchFarmers(1, query);
};

const handleRefresh = async (event: CustomEvent) => {
  await farmerStore.fetchFarmers();
  (event.target as any).complete();
};

const changePage = (page: number) => farmerStore.fetchFarmers(page, '');

const goToRegistration = () => {
  const inTech = router.currentRoute.value.path.startsWith('/tech');
  router.push(inTech ? '/tech/farmers/register' : '/admin/farmers/register');
};

const goToIdIssuance = (farmer: any) => {
  isModalOpen.value = false;
  router.push({ name: 'IdIssuance', query: { farmer_id: farmer.id } });
};

const initials = (farmer: any): string => {
  const f = farmer.first_name?.[0] ?? '';
  const s = farmer.surname?.[0] ?? '';
  return (f + s).toUpperCase();
};

const openDetail = async (farmer: any) => {
  selectedFarmer.value = farmer;
  isModalOpen.value = true;

  if (!farmer.distributions) {
    isLoadingDetail.value = true;
    try {
      const res = await apiClient.get(`/farmers/${farmer.id}`);
      selectedFarmer.value = res.data.data;
    } catch {
      // keep partial data
    } finally {
      isLoadingDetail.value = false;
    }
  }
};
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   EXCEL-STYLE DATA TABLE — Scoped CSS
   Advanced Filters, Bulk Actions, Context Menu
   ═══════════════════════════════════════════════════════════════════ */

/* ── Page background ───────────────────────────────────────────── */
.list-bg { --background: #f4f8f5; }

/* ═══════════════════════════════════════════════════════════════════
   CONTROLS BAR — Advanced Filter Toolbar
   ═══════════════════════════════════════════════════════════════════ */
.controls-bar {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.6rem 0.9rem;
}
.controls-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.controls-row.wrap { flex-wrap: wrap; margin-top: 0.5rem; }

/* ── Status chip row ───────────────────────────────────────────── */
.status-chips-row {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.filter-group-label {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  margin-right: 0.2rem;
  white-space: nowrap;
}

/* Status chips — active uses LGU Forest Green */
.status-chips-row ion-chip {
  --background: #f1f5f9;
  --color: #64748b;
  font-weight: 600;
  font-size: 0.78rem;
  height: 30px;
  transition: all 0.15s ease;
  cursor: pointer;
}
.status-chips-row ion-chip.active {
  --background: #1a4731;
  --color: #ffffff;
  opacity: 1 !important;
}
.status-chips-row ion-chip.off {
  opacity: 0.65;
}
.status-chips-row ion-chip.active ion-icon {
  color: #d4af37;
}

/* ── Deep filters row ──────────────────────────────────────────── */
.deep-filters-row {
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ctrl-filter {
  flex: 1;
  min-width: 130px;
  max-width: 200px;
  --background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 0.85rem;
}
.export-btn { flex-shrink: 0; margin-left: auto; }

/* Column-toggle chips */
.controls-bar ion-chip { --background: #eef2ff; font-weight: 600; font-size: 0.78rem; height: 28px; }
.controls-bar ion-chip.off { opacity: 0.4; }
.col-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-left: 0.3rem; }

/* ── Loading / Error / Empty states ────────────────────────────── */
.center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: var(--ion-color-medium); gap: 0.75rem; text-align: center; padding: 1rem; }
.center-state.error { color: var(--ion-color-danger); }

/* ═══════════════════════════════════════════════════════════════════
   THE GRID — Responsive wrapper + table
   ═══════════════════════════════════════════════════════════════════ */
.excel-grid {
  margin: 0;
  border-radius: 0;
  border: none;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.excel-grid::-webkit-scrollbar { height: 7px; }
.excel-grid::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.excel-grid::-webkit-scrollbar-track { background: transparent; }

/* ── Table element ─────────────────────────────────────────────── */
.excel-table {
  width: 100%;
  min-width: 860px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

/* ── Column widths (added .col-check for checkbox) ─────────────── */
.col-check   { width: 42px; text-align: center; }
.col-id      { width: 50px; }
.col-name    { width: 210px; min-width: 170px; }
.col-rsbsa   { width: 170px; }
.col-brgy    { width: 150px; }
.col-plots   { width: 95px; }
.col-tags    { width: 110px; }
.col-actions { width: 70px; text-align: center; }

/* ═══════════════════════════════════════════════════════════════════
   STICKY HEADER
   ═══════════════════════════════════════════════════════════════════ */
.excel-table thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #1a4731;
  color: #ffffff;
  padding: 8px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 2px solid #143a28;
  text-align: left;
  user-select: none;
}

/* ═══════════════════════════════════════════════════════════════════
   CHECKBOXES — Excel-style selection
   ═══════════════════════════════════════════════════════════════════ */
.excel-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #1a4731;
  vertical-align: middle;
  border-radius: 3px;
}

/* Header checkbox centering */
.col-check { vertical-align: middle; }

/* ═══════════════════════════════════════════════════════════════════
   FROZEN COLUMN — "Farmer Name" stays visible on horizontal scroll
   ═══════════════════════════════════════════════════════════════════ */
.frozen-col {
  position: sticky;
  left: 92px; /* col-check (42) + col-id (50) = 92 */
  z-index: 5;
}
.frozen-header {
  z-index: 15 !important;
  background: #1a4731 !important;
}
.frozen-body {
  background: #ffffff;
  box-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.08);
}
.data-row:nth-child(even) .frozen-body { background: #f8faf9; }
.data-row:hover .frozen-body { background: #eef5f0 !important; }

/* Selected rows get a distinct blue tint */
.data-row.row-selected td { background-color: #edf5ff !important; }
.data-row.row-selected .frozen-body { background: #edf5ff !important; }

/* ═══════════════════════════════════════════════════════════════════
   BODY CELLS
   ═══════════════════════════════════════════════════════════════════ */
.excel-table tbody td {
  padding: 8px 12px;
  font-size: 0.82rem;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color 0.12s ease;
}
.cell-id {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  font-weight: 600;
}

/* ── Zebra striping ────────────────────────────────────────────── */
.data-row:nth-child(even) td { background-color: #f8faf9; }

/* ── Row hover ─────────────────────────────────────────────────── */
.data-row:hover td { background-color: #eef5f0; }

/* ── Farmer Name cell ──────────────────────────────────────────── */
.name-cell { display: flex; align-items: center; gap: 8px; }
.farmer-name-text {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── RSBSA cell ────────────────────────────────────────────────── */
.rsbsa-value { font-family: 'Courier New', monospace; font-size: 0.8rem; color: #334155; letter-spacing: 0.02em; }
.rsbsa-pending { font-size: 0.78rem; color: #94a3b8; font-style: italic; }

/* ═══════════════════════════════════════════════════════════════════
   BADGES
   ═══════════════════════════════════════════════════════════════════ */
.badge-plots {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; height: 22px; padding: 0 8px; border-radius: 6px;
  font-size: 0.75rem; font-weight: 700;
  background: #e8f5e9; color: #1a4731; letter-spacing: 0.02em;
}
.badge-pwd {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  background: #fdf6e3; color: #92700c; border: 1px solid #d4af37;
}
.badge-4ps {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  background: #eff6ff; color: #1d4ed8; border: 1px solid #93c5fd; margin-left: 4px;
}
.no-tags { color: #cbd5e1; font-size: 0.8rem; }

/* ═══════════════════════════════════════════════════════════════════
   4. ROW CONTEXT MENU — Ellipsis trigger + Popover
   ═══════════════════════════════════════════════════════════════════ */
.btn-actions-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-actions-trigger:hover {
  background: #f1f5f9;
  color: #1a4731;
}
.btn-actions-trigger:active {
  background: #e2e8f0;
  transform: scale(0.92);
}
.btn-actions-trigger ion-icon {
  font-size: 18px;
}

/* Context menu popover styling */
.popover-content {
  --background: #ffffff;
}
.context-menu-list {
  padding: 4px 0;
}
.context-menu-list ion-item {
  --min-height: 38px;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  --background-hover: #f8faf9;
  --color: #1e293b;
}
.context-menu-list ion-item:hover {
  --background: #f1f5f9;
}
.ctx-icon {
  font-size: 18px;
  color: #64748b;
  margin-right: 8px;
}
.ctx-danger ion-label {
  --color: #dc2626;
}
.danger-icon {
  color: #dc2626 !important;
}

/* ═══════════════════════════════════════════════════════════════════
   3. FLOATING BULK ACTION BAR
   ═══════════════════════════════════════════════════════════════════ */
.bulk-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: linear-gradient(135deg, #1a4731 0%, #0f2d1e 100%);
  color: #ffffff;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25);
  border-top: 2px solid #d4af37;
}
.bulk-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  max-width: 1400px;
  margin: 0 auto;
  gap: 16px;
  flex-wrap: wrap;
}
.bulk-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  white-space: nowrap;
}
.bulk-count-icon {
  font-size: 20px;
  color: #d4af37;
}
.bulk-count strong {
  font-weight: 800;
  font-size: 1.1rem;
  color: #d4af37;
}
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Bulk action buttons */
.bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  white-space: nowrap;
}
.bulk-btn ion-icon {
  font-size: 16px;
}
.bulk-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
  transform: translateY(-1px);
}
.bulk-btn:active {
  transform: scale(0.96);
}

/* Verify button accent */
.bulk-btn--verify {
  background: rgba(212, 175, 55, 0.2);
  border-color: #d4af37;
  color: #fde68a;
}
.bulk-btn--verify:hover {
  background: rgba(212, 175, 55, 0.35);
}

/* SMS button accent */
.bulk-btn--sms {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.4);
  color: #bfdbfe;
}
.bulk-btn--sms:hover {
  background: rgba(96, 165, 250, 0.3);
}

/* Clear button */
.bulk-btn--clear {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
}
.bulk-btn--clear:hover {
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.3);
}

/* ── Bulk bar enter/leave transition ───────────────────────────── */
.bulk-bar-enter-active {
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.bulk-bar-leave-active {
  animation: slideDown 0.2s ease-in forwards;
}
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(0);    opacity: 1; }
  to   { transform: translateY(100%); opacity: 0; }
}

/* ═══════════════════════════════════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════════════════════════════════ */
.pagination-bar {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; padding: 1rem; background: #fff; border-top: 1px solid #e2e8f0;
}
.page-info { font-size: 0.85rem; color: #64748b; font-weight: 600; }

/* ═══════════════════════════════════════════════════════════════════
   DETAIL MODAL — preserved
   ═══════════════════════════════════════════════════════════════════ */
.detail-bg { --background: #f4f8f5; }
.detail-card { max-width: 680px; margin: 0 auto; padding-bottom: 3rem; }
.detail-avatar-row { display: flex; align-items: center; gap: 1rem; padding: 1.5rem 0 1rem; }
.detail-avatar { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #e8f5e9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 3px solid #1a4731; }
.detail-avatar img { width: 100%; height: 100%; object-fit: cover; }
.detail-name { margin: 0 0 6px; font-weight: 800; color: #1a4731; font-size: 1.25rem; }
.avatar-initials { font-weight: 800; color: #1a4731; font-size: 1.1rem; }
.avatar-initials.large { font-size: 2rem; }
.lbl { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
.section-title { color: #1a4731; font-weight: 800; margin: 1.5rem 0 0.5rem; font-size: 1rem; border-bottom: 2px solid #e8f5e9; padding-bottom: 4px; }
.plot-card { border-radius: 10px; margin: 0 0 0.5rem; }
.plot-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.plot-row p { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }
.text-muted { color: #94a3b8 !important; }
.empty-sub { color: #94a3b8; text-align: center; padding: 1rem; font-size: 0.9rem; }

/* ═══════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .col-name { width: 150px; min-width: 130px; }
  .frozen-col { left: 78px; }
  .col-check { width: 36px; }
  .col-id { width: 42px; }
  .excel-table thead th { font-size: 0.68rem; padding: 6px 8px; }
  .excel-table tbody td { padding: 6px 8px; font-size: 0.78rem; }
  .bulk-bar-inner { padding: 8px 12px; gap: 10px; }
  .bulk-btn { padding: 5px 10px; font-size: 0.72rem; }
  .bulk-count { font-size: 0.82rem; }

  .deep-filters-row { flex-direction: column; align-items: stretch; }
  .ctrl-filter { max-width: 100%; }
}
</style>
