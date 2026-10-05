<template>
  <ion-page>
    <AppHeader />

    <ion-content class="page-bg">
      <div class="shell">
        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading programs&hellip;</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button size="small" @click="fetchPrograms">Retry</ion-button>
        </div>

        <div v-else-if="!programs.length" class="empty-panel">
          <h2>No subsidy programs yet</h2>
          <p>Upload the DA-RFO monthly workbook to create this month's subsidy programs.</p>
          <ion-button class="create-btn" @click="openIntake">
            <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
            Upload Regional Monthly Workbook
          </ion-button>
        </div>

        <div v-else class="table-wrap">
          <div class="status-tabs" role="tablist" aria-label="Filter by program status">
            <div class="status-tab-list">
              <button
                v-for="tab in statusTabs"
                :key="tab.value"
                type="button"
                role="tab"
                class="status-tab"
                :class="{ active: statusFilter === tab.value }"
                :aria-selected="statusFilter === tab.value"
                @click="statusFilter = tab.value"
              >
                {{ tab.label }}
                <span class="tab-count">{{ tab.count }}</span>
              </button>
            </div>
            <ion-button class="create-btn" @click="openIntake">
              <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
              Upload Regional Monthly Workbook
            </ion-button>
          </div>

          <div class="table-tools">
            <label class="search-wrap">
              <ion-icon :icon="searchOutline" aria-hidden="true"></ion-icon>
              <input
                v-model="searchName"
                type="search"
                class="name-search"
                aria-label="Search by program name or season"
                placeholder="Search by program name or season…"
              />
            </label>
            <select v-model="statusFilter" class="tool-select" aria-label="Status">
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Completed">Completed</option>
            </select>
            <select v-model="cropFilter" class="tool-select" aria-label="Crop">
              <option value="">All crops</option>
              <option value="Rice">Rice</option>
              <option value="Corn">Corn</option>
              <option value="Both">Rice and Corn</option>
            </select>
            <select v-model="seedClassFilter" class="tool-select" aria-label="Seed class">
              <option value="">All seed classes</option>
              <option v-for="sc in SEED_CLASSES" :key="sc" :value="sc">{{ sc }}</option>
            </select>
            <select v-model="itemTypeFilter" class="tool-select" aria-label="Item type">
              <option value="">All item types</option>
              <option v-for="it in ALL_ITEM_TYPES" :key="it" :value="it">{{ itemTypeLabel(it) }}</option>
            </select>
          </div>

          <div class="table-scroll">
            <table class="program-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Crop</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Inventory</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredPrograms" :key="p.id">
                  <td>
                    <div class="program-name">{{ p.program_name }}</div>
                    <div class="row-meta">{{ allocationMeta(p) }}</div>
                  </td>
                  <td class="crop-cell">{{ cropLabel(p.target_crop) }}</td>
                  <td class="scope-cell">{{ scopeLabel(p) }}</td>
                  <td>
                    <span class="status-pill" :class="statusClass(p.status)">{{ p.status }}</span>
                  </td>
                  <td class="inv-cell">
                    <div class="inv-line">
                      <span class="inv-qty">
                        {{ fmt(p.remaining_quantity) }} / {{ fmt(p.total_quantity) }}
                        {{ p.unit_of_measurement }}
                      </span>
                      <span v-if="p.is_low_stock" class="stock-badge">Low Stock</span>
                    </div>
                    <div v-if="p.secondary_unit" class="inv-line">
                      <span class="inv-qty inv-qty-secondary">
                        {{ fmt(p.secondary_remaining_quantity) }} / {{ fmt(p.secondary_total_quantity) }}
                        {{ p.secondary_unit }}
                      </span>
                    </div>
                    <div
                      class="progress-track"
                      role="progressbar"
                      :aria-valuenow="claimedPct(p)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      :aria-label="`${claimedPct(p)} percent claimed`"
                    >
                      <div class="progress-fill" :style="{ width: claimedPct(p) + '%' }"></div>
                    </div>
                    <div class="inv-sub">{{ claimedPct(p) }}% Claimed</div>
                  </td>
                  <td class="row-actions">
                    <ion-button size="small" fill="solid" class="open-btn" @click="openMasterlist(p.id)">
                      Open Masterlist
                    </ion-button>
                    <ion-button
                      v-if="p.status === 'Draft'"
                      size="small"
                      fill="outline"
                      class="activate-btn"
                      :disabled="statusUpdatingId === p.id"
                      @click="confirmActivate(p)"
                    >
                      {{ statusUpdatingId === p.id ? 'Activating…' : 'Activate' }}
                    </ion-button>
                    <button
                      type="button"
                      class="more-btn"
                      :id="`prog-act-${p.id}`"
                      title="More actions"
                      :aria-label="`More actions for ${p.program_name}`"
                    >
                      <ion-icon :icon="ellipsisVertical"></ion-icon>
                    </button>
                    <ion-popover
                      :trigger="`prog-act-${p.id}`"
                      trigger-action="click"
                      side="left"
                      css-class="prog-more-pop"
                      :dismiss-on-select="true"
                    >
                      <ion-content>
                        <ion-list lines="none" class="ctx">
                          <ion-item
                            v-if="p.status === 'Draft'"
                            button
                            :detail="false"
                            :disabled="statusUpdatingId === p.id"
                            @click="confirmActivate(p)"
                          >
                            <ion-icon :icon="playCircleOutline" slot="start"></ion-icon>
                            <ion-label>
                              {{ statusUpdatingId === p.id ? 'Activating…' : 'Activate Program' }}
                            </ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openRestock(p)">
                            <ion-icon :icon="cubeOutline" slot="start"></ion-icon>
                            <ion-label>Log Delivery Batch</ion-label>
                          </ion-item>
                          <ion-item button :detail="false" @click="openSettings(p)">
                            <ion-icon :icon="settingsOutline" slot="start"></ion-icon>
                            <ion-label>Configure Stock Rules</ion-label>
                          </ion-item>
                          <ion-item
                            v-if="p.status !== 'Completed'"
                            button
                            :detail="false"
                            class="warn"
                            :disabled="statusUpdatingId === p.id"
                            @click="confirmComplete(p)"
                          >
                            <ion-icon :icon="checkmarkDoneOutline" slot="start"></ion-icon>
                            <ion-label>
                              {{ statusUpdatingId === p.id ? 'Updating…' : 'Mark Program as Completed' }}
                            </ion-label>
                          </ion-item>
                        </ion-list>
                      </ion-content>
                    </ion-popover>
                  </td>
                </tr>
                <tr v-if="!filteredPrograms.length">
                  <td colspan="5" class="empty-row">No programs match this search or filter.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- LOG DELIVERY MODAL -->
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
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.program_name }}</p>
            <p class="modal-hint">
              Current stock:
              <strong>{{ fmt(activeProgram.remaining_quantity) }} {{ activeProgram.unit_of_measurement }}</strong>
              <span v-if="activeProgram.secondary_unit">
                &middot; <strong>{{ fmt(activeProgram.secondary_remaining_quantity) }} {{ activeProgram.secondary_unit }}</strong>
              </span>
            </p>

            <ion-item class="modal-input">
              <ion-input
                type="number"
                :value="restockQty"
                @ionInput="(e: any) => restockQty = e.detail.value === '' ? null : Number(e.detail.value)"
                :label="`${activeProgram.unit_of_measurement} Delivered *`"
                label-placement="floating"
                placeholder="e.g., 500"
                min="0.01"
              ></ion-input>
            </ion-item>
            <ion-item v-if="activeProgram.secondary_unit" class="modal-input">
              <ion-input
                type="number"
                :value="restockQtySecondary"
                @ionInput="(e: any) => restockQtySecondary = e.detail.value === '' ? null : Number(e.detail.value)"
                :label="`${activeProgram.secondary_unit} Delivered`"
                label-placement="floating"
                placeholder="e.g., 25"
                min="0.01"
              ></ion-input>
            </ion-item>

            <ion-button expand="block" class="save-btn" :disabled="savingRestock || !(Number(restockQty) >= 0.01)" @click="submitRestock">
              <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
              {{ savingRestock ? 'Saving…' : 'Add to Stock' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- STOCK SETTINGS MODAL -->
      <ion-modal :is-open="settingsOpen" @didDismiss="settingsOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Stock Settings</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="settingsOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.program_name }}</p>
            <p v-if="activeProgram.item_type" class="modal-hint">
              {{ catalogSummary(activeProgram.target_crop, activeProgram.seed_class, activeProgram.item_type) }} — units are set by the MAO catalog.
            </p>

            <ion-item v-if="!activeProgram.item_type" class="modal-input">
              <ion-select
                :value="settingsUnit"
                interface="popover"
                label="Unit of Measurement"
                label-placement="floating"
                @ionChange="(e: any) => settingsUnit = e.detail.value"
              >
                <ion-select-option value="Bags">Bags</ion-select-option>
                <ion-select-option value="Sacks">Sacks</ion-select-option>
                <ion-select-option value="Kg">Kg</ion-select-option>
                <ion-select-option value="Cash (PHP)">Cash (PHP)</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="modal-input">
              <ion-input
                type="number"
                :value="settingsReorder"
                @ionInput="(e: any) => settingsReorder = e.detail.value === '' ? null : Number(e.detail.value)"
                :label="`Minimum Reorder Level (${activeProgram.unit_of_measurement})`"
                label-placement="floating"
                placeholder="Leave blank to disable alerts"
                min="0"
              ></ion-input>
            </ion-item>
            <ion-item v-if="activeProgram.secondary_unit" class="modal-input">
              <ion-input
                type="number"
                :value="settingsReorderSecondary"
                @ionInput="(e: any) => settingsReorderSecondary = e.detail.value === '' ? null : Number(e.detail.value)"
                :label="`Minimum Reorder Level (${activeProgram.secondary_unit})`"
                label-placement="floating"
                placeholder="Leave blank to disable alerts"
                min="0"
              ></ion-input>
            </ion-item>

            <ion-button expand="block" class="save-btn" :disabled="savingSettings" @click="submitSettings">
              <ion-icon slot="start" :icon="saveOutline"></ion-icon>
              {{ savingSettings ? 'Saving…' : 'Save Settings' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonModal, IonList, IonItem, IonInput, IonSelect,
  IonSelectOption, IonPopover, IonLabel, toastController, alertController,
} from '@ionic/vue';
import {
  refreshOutline, cloudUploadOutline, addCircleOutline, settingsOutline, saveOutline,
  searchOutline, ellipsisVertical, cubeOutline, checkmarkDoneOutline,
  playCircleOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { cropLabel } from '@/utils/cropLabel';
import { promptAuditRemarks } from '@/composables/promptAuditRemarks';
import {
  SEED_CLASSES, itemTypeLabel, catalogSummary, type SeedClass, type ItemType,
} from '@/constants/subsidyCatalog';

const ALL_ITEM_TYPES: ItemType[] = ['seed', 'abono', 'liquid_fertilizer', 'wettable', 'cash'];

interface SubsidyProgramRow {
  id: string;
  program_name: string;
  target_crop: string;
  target_barangays?: string[] | null;
  seed_class?: SeedClass | null;
  item_type?: ItemType | null;
  max_hectares_limit: number;
  min_hectares_limit: number;
  items_per_hectare: number;
  secondary_items_per_hectare?: number | null;
  status: string;
  unit_of_measurement: string;
  secondary_unit?: string | null;
  total_quantity: number;
  remaining_quantity: number;
  reorder_level: number | null;
  secondary_total_quantity?: number | null;
  secondary_remaining_quantity?: number | null;
  secondary_reorder_level?: number | null;
  is_low_stock: boolean;
  beneficiaries_count: number;
  claimed_count: number;
  created_at?: string;
}

const router = useRouter();
const programs = ref<SubsidyProgramRow[]>([]);
const loading = ref(true);
const statusUpdatingId = ref<string | null>(null);
const searchName = ref('');
const cropFilter = ref('');
const seedClassFilter = ref('');
const itemTypeFilter = ref('');
const statusFilter = ref('');
const error = ref('');

const activeProgram = ref<SubsidyProgramRow | null>(null);
const restockOpen = ref(false);
const settingsOpen = ref(false);

const restockQty = ref<number | null>(null);
const restockQtySecondary = ref<number | null>(null);
const savingRestock = ref(false);

const settingsUnit = ref('');
const settingsReorder = ref<number | null>(null);
const settingsReorderSecondary = ref<number | null>(null);
const savingSettings = ref(false);

const toast = async (message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'success') => {
  const t = await toastController.create({ message, duration: 2800, color, position: 'top' });
  await t.present();
};

const fmt = (v: any) => Number(v ?? 0).toLocaleString('en-PH');

const searchedPrograms = computed(() => {
  const q = searchName.value.trim().toLowerCase();
  return programs.value.filter((p) => {
    if (q && !p.program_name.toLowerCase().includes(q)) return false;
    if (cropFilter.value && p.target_crop !== cropFilter.value) return false;
    if (seedClassFilter.value && p.seed_class !== seedClassFilter.value) return false;
    if (itemTypeFilter.value && p.item_type !== itemTypeFilter.value) return false;
    return true;
  });
});

const statusCounts = computed(() => {
  const list = searchedPrograms.value;
  return {
    all: list.length,
    active: list.filter((p) => p.status === 'Active').length,
    draft: list.filter((p) => p.status === 'Draft').length,
    completed: list.filter((p) => p.status === 'Completed').length,
  };
});

const statusTabs = computed(() => [
  { value: '', label: 'All', count: statusCounts.value.all },
  { value: 'Active', label: 'Active', count: statusCounts.value.active },
  { value: 'Draft', label: 'Draft', count: statusCounts.value.draft },
  { value: 'Completed', label: 'Completed', count: statusCounts.value.completed },
]);

const filteredPrograms = computed(() => {
  if (!statusFilter.value) return searchedPrograms.value;
  return searchedPrograms.value.filter((p) => p.status === statusFilter.value);
});

const statusClass = (status: string) => {
  if (status === 'Active') return 'active';
  if (status === 'Completed') return 'completed';
  return 'draft';
};

const claimedPct = (p: SubsidyProgramRow) => {
  const total = Number(p.beneficiaries_count) || 0;
  if (!total) return 0;
  return Math.round((Number(p.claimed_count) / total) * 100);
};

const allocationMeta = (p: SubsidyProgramRow) => {
  const unit = p.unit_of_measurement || 'Sacks';
  let rate = `${p.items_per_hectare} ${unit}/ha`;
  if (p.secondary_unit && p.secondary_items_per_hectare != null) {
    rate += ` + ${p.secondary_items_per_hectare} ${p.secondary_unit}/ha`;
  }
  const catalogTag = p.seed_class && p.item_type ? catalogSummary(null, p.seed_class, p.item_type) : '';
  const cap = `Cap ${Number(p.max_hectares_limit).toFixed(2)} ha`;
  const min = Number(p.min_hectares_limit ?? 0);
  const parts = [catalogTag, rate, min > 0 ? `Min ${min.toFixed(2)} ha` : '', cap].filter(Boolean);
  return parts.join(' · ');
};

const scopeLabel = (p: SubsidyProgramRow) => {
  const list = p.target_barangays;
  if (!list || !list.length) return 'All barangays';
  if (list.length <= 2) return list.join(', ');
  return `${list.length} barangays`;
};

const fetchPrograms = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/subsidies');
    programs.value = res.data?.data ?? [];
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load subsidy programs. Run migrations if tables are missing.';
  } finally {
    loading.value = false;
  }
};

const openIntake = () => {
  router.push('/admin/subsidies/import');
};

const openMasterlist = (id: string) => {
  router.push(`/admin/subsidies/${id}/masterlist`);
};

const confirmActivate = async (p: SubsidyProgramRow) => {
  const alert = await alertController.create({
    header: 'Activate this program?',
    message: `“${p.program_name}” will become available for field release. Technicians can start dispensing subsidies to farmers on the masterlist.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Activate', handler: () => updateProgramStatus(p, 'Active') },
    ],
  });
  await alert.present();
};

const confirmComplete = async (p: SubsidyProgramRow) => {
  const alert = await alertController.create({
    header: 'Mark program completed?',
    message: `Claims will freeze. The masterlist and subsidy report stay as history. “${p.program_name}” will not be deleted.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Mark Completed', handler: () => updateProgramStatus(p, 'Completed') },
    ],
  });
  await alert.present();
};

const updateProgramStatus = async (p: SubsidyProgramRow, status: 'Active' | 'Completed') => {
  statusUpdatingId.value = p.id;
  try {
    const res = await apiClient.patch(`/subsidies/${p.id}/status`, { status });
    await toast(res.data?.message || `Program marked ${status}.`, 'success');
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to update program status.', 'danger');
  } finally {
    statusUpdatingId.value = null;
  }
};

const openRestock = (p: SubsidyProgramRow) => {
  activeProgram.value = p;
  restockQty.value = null;
  restockQtySecondary.value = null;
  restockOpen.value = true;
};

const submitRestock = async () => {
  if (!activeProgram.value || !(Number(restockQty.value) >= 0.01)) return;
  const remarks = await promptAuditRemarks({
    header: 'Justify warehouse delivery',
    message: 'Explain this stock delivery for the audit trail.',
  });
  if (!remarks) return;
  savingRestock.value = true;
  try {
    const res = await apiClient.post(`/subsidies/${activeProgram.value.id}/restock`, {
      quantity_added: Number(restockQty.value),
      secondary_quantity_added: Number(restockQtySecondary.value) > 0 ? Number(restockQtySecondary.value) : undefined,
      audit_remarks: remarks,
    });
    await toast(res.data?.message || 'Delivery logged.', 'success');
    restockOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to log delivery.', 'danger');
  } finally {
    savingRestock.value = false;
  }
};

const openSettings = (p: SubsidyProgramRow) => {
  activeProgram.value = p;
  settingsUnit.value = p.unit_of_measurement || 'Bags';
  settingsReorder.value = p.reorder_level ?? null;
  settingsReorderSecondary.value = p.secondary_reorder_level ?? null;
  settingsOpen.value = true;
};

const submitSettings = async () => {
  if (!activeProgram.value) return;
  const remarks = await promptAuditRemarks({
    header: 'Justify stock settings change',
    message: 'Explain why subsidy stock settings are being updated.',
  });
  if (!remarks) return;
  savingSettings.value = true;
  try {
    const res = await apiClient.patch(`/subsidies/${activeProgram.value.id}/config`, {
      unit_of_measurement: activeProgram.value.item_type ? undefined : (settingsUnit.value.trim() || undefined),
      reorder_level: settingsReorder.value,
      secondary_reorder_level: activeProgram.value.secondary_unit ? settingsReorderSecondary.value : undefined,
      audit_remarks: remarks,
    });
    await toast(res.data?.message || 'Stock settings updated.', 'success');
    settingsOpen.value = false;
    await fetchPrograms();
  } catch (e: any) {
    await toast(e?.response?.data?.message || 'Failed to update settings.', 'danger');
  } finally {
    savingSettings.value = false;
  }
};

onMounted(() => {
  fetchPrograms();
  window.addEventListener('akap:refresh', fetchPrograms);
});
onBeforeUnmount(() => window.removeEventListener('akap:refresh', fetchPrograms));
</script>

<style scoped>
.page-bg { --background: #f4f5f8; }
.shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0.75rem 1rem 2rem;
}
.create-btn {
  --background: #1a4731;
  --color: #fff;
  text-transform: none;
  font-weight: 800;
  margin: 0;
}
.center-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }
.empty-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem 1.25rem;
  text-align: center;
}
.empty-panel h2 {
  margin: 0;
  color: #1a4731;
  font-size: 1.1rem;
  font-weight: 800;
}
.empty-panel p {
  color: #64748b;
  margin: 0.5rem 0 1rem;
}
.table-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.status-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem 0;
}
.status-tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
}
.status-tab:hover { background: #f8fafc; }
.status-tab.active {
  background: #e8f5e9;
  border-color: #c8e6c9;
  color: #1e7e34;
}
.tab-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 0 0.4rem;
  border-radius: 999px;
  min-width: 1.25rem;
  text-align: center;
}
.status-tab.active .tab-count {
  background: #c8e6c9;
  color: #1e7e34;
}
.table-tools {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.75rem 0.85rem 0.85rem;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 28rem;
}
.search-wrap ion-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #94a3b8;
  pointer-events: none;
}
.name-search, .tool-select {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.48rem 0.7rem;
  font-size: 0.88rem;
  background: #fff;
  font-family: inherit;
  color: #0f172a;
}
.name-search {
  width: 100%;
  padding-left: 2.15rem;
}
.tool-select {
  min-width: 150px;
  color: #334155;
}
.table-scroll { overflow: auto; }
.program-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}
.program-table th, .program-table td {
  text-align: left;
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
  font-size: 0.86rem;
}
.program-table th {
  background: #f8fafc;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}
.program-table tbody tr:hover { background: #fafdfa; }
.program-name {
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
.row-meta {
  margin-top: 0.22rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.4;
}
.crop-cell { color: #334155; font-weight: 500; white-space: nowrap; }
.scope-cell {
  font-size: 0.82rem;
  color: #475569;
  max-width: 10rem;
}
.empty-row { text-align: center; color: #64748b; padding: 1.4rem !important; }
.status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.status-pill.draft { background: #e3f2fd; color: #1565c0; }
.status-pill.active { background: #e8f5e9; color: #1e7e34; }
.status-pill.completed { background: #f1f5f9; color: #475569; }
.inv-cell { min-width: 11rem; }
.inv-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.inv-qty {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.86rem;
}
.stock-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}
.progress-track {
  height: 6px;
  margin-top: 0.4rem;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2e7d32, #1a4731);
  border-radius: 999px;
  min-width: 0;
  transition: width 0.25s ease;
}
.inv-sub {
  margin-top: 0.28rem;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}
.col-actions { text-align: right; width: 1%; }
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  white-space: nowrap;
}
.open-btn {
  --background: #1a4731;
  --color: #fff;
  --padding-start: 0.7rem;
  --padding-end: 0.7rem;
  text-transform: none;
  font-weight: 700;
  margin: 0;
  height: 32px;
}
.activate-btn {
  --border-color: #1e7e34;
  --color: #1e7e34;
  --padding-start: 0.7rem;
  --padding-end: 0.7rem;
  text-transform: none;
  font-weight: 700;
  margin: 0;
  height: 32px;
}
.more-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.more-btn:hover {
  background: #f8fafc;
  color: #1a4731;
  border-color: #cbd5e1;
}
.more-btn ion-icon { font-size: 1.05rem; }
.catalog-hint {
  margin: 0.35rem 0.9rem 0.6rem;
  font-size: 0.78rem;
  color: #1a4731;
  background: #eef7f0;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
}
.inv-qty-secondary { color: #475569; font-weight: 600; }
.section-label {
  margin: 1rem 0 0.35rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.brgy-picker-wrap {
  margin: 0 0.9rem 0.75rem;
}
.modal-program { font-weight: 800; color: #1a4731; font-size: 1.15rem; margin: 0 0 4px; }
.modal-hint { color: #64748b; font-size: 0.85rem; margin: 4px 0 1rem; }
.modal-input { --background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.8rem; }
.legacy-note {
  margin-top: 1.25rem;
  font-size: 0.78rem;
  color: #94a3b8;
}
.legacy-note a { color: #1a4731; font-weight: 700; }
.form-error {
  color: #b91c1c;
  font-size: 0.88rem;
  margin: 0.75rem 0 0;
}
.save-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 1rem;
}
@media (max-width: 720px) {
  .search-wrap { max-width: none; }
  .tool-select { flex: 1; min-width: 140px; }
}
</style>

<style>
.prog-more-pop .ctx { padding: 4px 0; min-width: 15.5rem; }
.prog-more-pop .ctx ion-item { --min-height: 40px; font-size: 0.88rem; }
.prog-more-pop .ctx ion-icon { color: #1a4731; font-size: 1.05rem; }
.prog-more-pop .ctx .warn ion-icon,
.prog-more-pop .ctx .warn ion-label { color: #b45309; }
</style>
