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
      <div class="workspace-header no-print">
        <div class="workspace-title">
          <h1>ID Production</h1>
          <p>Search the queue, verify beneficiary details, and print government ID cards.</p>
        </div>
        <div class="workspace-stats">
          <div class="stat-chip">
            <ion-icon :icon="peopleOutline"></ion-icon>
            <strong>{{ queueStats.total }}</strong>
            <span>Total Queue</span>
          </div>
          <div class="stat-chip warn">
            <ion-icon :icon="cameraOutline"></ion-icon>
            <strong>{{ queueStats.missingPhoto }}</strong>
            <span>Missing Photo</span>
          </div>
          <div class="stat-chip ok">
            <ion-icon :icon="printOutline"></ion-icon>
            <strong>{{ queueStats.printed }}</strong>
            <span>Printed</span>
          </div>
        </div>
      </div>

      <div class="issuance-workspace no-print">
        <aside class="queue-panel">
          <div class="queue-head">
            <h2>Issuance Queue</h2>
          </div>

          <div class="omni-bar">
            <label class="search-wrap">
              <ion-icon :icon="searchOutline" aria-hidden="true"></ion-icon>
              <input
                type="search"
                class="omni-search"
                placeholder="Search name / RSBSA…"
                aria-label="Search name or RSBSA number"
                :value="searchQuery"
                @input="onSearchInput"
              />
            </label>
            <select
              class="omni-select"
              aria-label="Barangay"
              :value="filterBarangay"
              @change="onBarangayChange"
            >
              <option value="">All barangays</option>
              <option v-for="b in barangays" :key="b" :value="b">{{ b }}</option>
            </select>
            <select
              class="omni-select"
              aria-label="ID status"
              v-model="idStatusFilter"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="printed">Printed</option>
              <option value="missing-photo">Missing Photo</option>
            </select>
          </div>

          <div class="segmented" role="tablist" aria-label="Queue filters">
            <button
              v-for="tab in queueTabs"
              :key="tab.value"
              type="button"
              role="tab"
              class="seg-btn"
              :class="{ on: queueChip === tab.value }"
              :aria-selected="queueChip === tab.value"
              @click="queueChip = tab.value"
            >
              {{ tab.label }}
              <span class="seg-count">{{ tab.count }}</span>
            </button>
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
                  <th class="col-farmer">Farmer &amp; Contact</th>
                  <th class="col-rsbsa">RSBSA Ref No.</th>
                  <th>Barangay</th>
                  <th>Priority</th>
                  <th>Photo</th>
                  <th>Status</th>
                  <th class="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="isLoading">
                  <td colspan="8" class="state-cell">
                    <ion-spinner name="crescent" color="primary"></ion-spinner>
                  </td>
                </tr>

                <tr v-else-if="visibleFarmers.length === 0">
                  <td colspan="8" class="state-cell">
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
                    <div class="farmer-name">{{ farmer.surname }}, {{ farmer.first_name }}</div>
                    <div class="farmer-meta">{{ formatContact(farmer.mobile_number) }} · {{ sexShort(farmer.sex) }}</div>
                  </td>
                  <td class="mono">{{ farmer.rsbsa_no || 'Pending' }}</td>
                  <td>{{ farmer.permanent_brgy || '—' }}</td>
                  <td>
                    <span class="prio-badge" :class="priorityCategory(farmer)">{{ priorityLabel(farmer) }}</span>
                  </td>
                  <td>
                    <span v-if="hasPhoto(farmer)" class="photo-ok" title="Photo uploaded">
                      <ion-icon :icon="checkmarkCircle"></ion-icon>
                    </span>
                    <span v-else class="photo-miss">
                      <ion-icon :icon="warningOutline"></ion-icon>
                      Needs Photo
                    </span>
                  </td>
                  <td>
                    <span class="status-chip" :class="'chip-' + issuanceStatus(farmer)">
                      {{ issuanceLabel(farmer) }}
                    </span>
                  </td>
                  <td class="col-action" @click.stop>
                    <button type="button" class="preview-btn" @click="previewSingle(farmer)">Preview</button>
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

          <Transition name="batch-bar">
            <div v-if="selectedCount > 0" class="batch-bar">
              <span class="batch-label"><strong>{{ selectedCount }}</strong> farmer{{ selectedCount === 1 ? '' : 's' }} selected</span>
              <div class="batch-actions">
                <button type="button" class="link-btn" @click="clearSelection">Clear</button>
                <button type="button" class="ghost-btn" @click="exportIdList">
                  <ion-icon :icon="pricetagOutline"></ion-icon>
                  Export ID List
                </button>
                <button type="button" class="print-btn" @click="printBatchIds">
                  <ion-icon :icon="printOutline"></ion-icon>
                  Batch Print ({{ selectedCount }})
                </button>
              </div>
            </div>
          </Transition>
        </aside>

        <section class="preview-panel">
          <div class="preview-head">
            <h2>{{ previewHeading }}</h2>
            <p>{{ previewSubhead }}</p>
          </div>

          <div class="preview-body">
            <div v-if="previewFarmer" class="id-preview-wrapper">
              <div class="id-card-stage">
                <FarmerIdCard :farmer="previewFarmer" />
              </div>
              <div class="preview-actions">
                <ion-button color="dark" size="small" class="preview-act" @click="printSingleId(previewFarmer)">
                  <ion-icon slot="start" :icon="printOutline"></ion-icon>
                  Print Single ID
                </ion-button>
                <ion-button
                  size="small"
                  class="preview-act"
                  :fill="hasPhoto(previewFarmer) ? 'outline' : 'solid'"
                  :color="hasPhoto(previewFarmer) ? 'medium' : 'warning'"
                  :disabled="uploadingPhoto"
                  @click="triggerPhotoUpload"
                >
                  <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
                  {{ uploadingPhoto ? 'Uploading…' : hasPhoto(previewFarmer) ? 'Replace Photo' : 'Upload Photo' }}
                </ion-button>
              </div>
              <p v-if="selectedCount > 1" class="batch-hint">
                {{ selectedCount }} selected for batch print.
                <button type="button" class="text-link" @click="previewFarmer = null">View batch summary</button>
              </p>
            </div>

            <div v-else-if="selectedCount > 0" class="batch-preview">
              <p class="batch-preview-title">{{ selectedCount }} item{{ selectedCount === 1 ? '' : 's' }} selected for batch print</p>
              <div class="mini-row">
                <div v-for="farmer in batchPreviewFarmers" :key="'mini-' + farmer.id" class="mini-card-frame">
                  <FarmerIdCard :farmer="farmer" />
                </div>
              </div>
              <p v-if="selectedCount > batchPreviewFarmers.length" class="more-mini">
                +{{ selectedCount - batchPreviewFarmers.length }} more
              </p>
              <div class="preview-actions">
                <ion-button color="dark" size="small" class="preview-act" @click="printBatchIds">
                  <ion-icon slot="start" :icon="printOutline"></ion-icon>
                  Print Batch ({{ selectedCount }})
                </ion-button>
                <ion-button size="small" fill="outline" class="preview-act" @click="exportIdList">
                  <ion-icon slot="start" :icon="pricetagOutline"></ion-icon>
                  Export ID List
                </ion-button>
              </div>
            </div>

            <div v-else class="empty-preview">
              <div class="empty-stats">
                <div>
                  <strong>{{ queueStats.total }}</strong>
                  <span>in queue</span>
                </div>
                <div>
                  <strong>{{ queueStats.ready }}</strong>
                  <span>ready to print</span>
                </div>
                <div>
                  <strong>{{ queueStats.missingPhoto }}</strong>
                  <span>need a photo</span>
                </div>
              </div>
              <p>Select a farmer to preview their ID, or check rows to prepare a batch print.</p>
            </div>
          </div>
        </section>
      </div>

      <input
        ref="photoInput"
        class="hidden-file"
        type="file"
        accept="image/*"
        @change="onPhotoSelected"
      />

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
  IonButton, IonIcon, IonSpinner, toastController,
} from '@ionic/vue';
import {
  printOutline, searchOutline, peopleOutline, cameraOutline,
  chevronBackOutline, chevronForwardOutline, checkmarkCircle,
  warningOutline, pricetagOutline,
} from 'ionicons/icons';
import axiosInstance from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';
import FarmerIdCard from '@/components/FarmerIdCard.vue';
import { exportAdminGridExcel } from '@/utils/statutoryFormExcel';

const route = useRoute();
const PRINTED_KEY = 'agri-akap:id-printed-ids';

interface PaginationMeta { current_page: number; last_page: number; total: number; }

const farmers = ref<any[]>([]);
const isLoading = ref(true);
const pagination = ref<PaginationMeta | null>(null);
const searchQuery = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const barangays = ref<string[]>([]);
const filterBarangay = ref('');
type QueueChip = 'all' | 'missing-photo' | 'priority';
const queueChip = ref<QueueChip>('all');
type IdStatusFilter = '' | 'pending' | 'printed' | 'missing-photo';
const idStatusFilter = ref<IdStatusFilter>('');

const selectedIds = reactive(new Set<string>());
const previewFarmer = ref<any>(null);
const photoInput = ref<HTMLInputElement | null>(null);
const uploadingPhoto = ref(false);

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

const formatContact = (n: unknown) => {
  const raw = String(n || '').trim();
  if (!raw) return '—';
  const d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
};

const selectedCount = computed(() => selectedIds.size);

const statusFilteredFarmers = computed(() => {
  const s = idStatusFilter.value;
  return farmers.value.filter((f) => {
    if (s === 'pending') return !isPrinted(f);
    if (s === 'printed') return isPrinted(f);
    if (s === 'missing-photo') return !hasPhoto(f);
    return true;
  });
});

const visibleFarmers = computed(() => {
  const chip = queueChip.value;
  return statusFilteredFarmers.value.filter((f) => {
    if (chip === 'missing-photo') return !hasPhoto(f);
    if (chip === 'priority') return priorityCategory(f) !== 'regular';
    return true;
  });
});

const queueStats = computed(() => {
  const list = visibleFarmers.value;
  return {
    total: list.length,
    missingPhoto: list.filter((f) => !hasPhoto(f)).length,
    printed: list.filter((f) => isPrinted(f)).length,
    ready: list.filter((f) => issuanceStatus(f) === 'ready').length,
  };
});

const queueTabs = computed(() => {
  const list = statusFilteredFarmers.value;
  return [
    { value: 'all' as QueueChip, label: 'All', count: list.length },
    { value: 'missing-photo' as QueueChip, label: 'Missing Photo', count: list.filter((f) => !hasPhoto(f)).length },
    { value: 'priority' as QueueChip, label: 'Senior / PWD', count: list.filter((f) => priorityCategory(f) !== 'regular').length },
  ];
});

const isAllSelected = computed(() =>
  visibleFarmers.value.length > 0 && visibleFarmers.value.every((f) => selectedIds.has(f.id))
);
const isIndeterminate = computed(() =>
  !isAllSelected.value && visibleFarmers.value.some((f) => selectedIds.has(f.id))
);

const selectedFarmers = computed(() => farmers.value.filter((f) => selectedIds.has(f.id)));
const batchPreviewFarmers = computed(() => selectedFarmers.value.slice(0, 3));
const printableFarmers = computed(() => selectedFarmers.value);

const previewHeading = computed(() => {
  if (previewFarmer.value) return 'Digital ID Preview';
  if (selectedCount.value > 0) return 'Batch Print Preview';
  return 'Digital ID Preview';
});

const previewSubhead = computed(() => {
  if (previewFarmer.value) {
    const f = previewFarmer.value;
    return `${f.surname}, ${f.first_name} · ${f.rsbsa_no || 'Pending RSBSA'}`;
  }
  if (selectedCount.value > 0) return 'Mini layout of the selected ID cards';
  return 'Select a farmer or check rows to prepare a batch';
});

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

const onSearchInput = (ev: Event) => {
  searchQuery.value = (ev.target as HTMLInputElement).value ?? '';
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => fetchFarmers(1, searchQuery.value), 400);
};

const onBarangayChange = (ev: Event) => {
  filterBarangay.value = (ev.target as HTMLSelectElement).value ?? '';
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

const priorityLabel = (farmer: any) => {
  const cat = priorityCategory(farmer);
  if (cat === 'pwd') return 'PWD';
  if (cat === 'senior') return 'Senior 60+';
  return 'Regular';
};

const issuanceStatus = (farmer: any): 'printed' | 'missing' | 'ready' => {
  if (isPrinted(farmer)) return 'printed';
  if (!hasPhoto(farmer) || !farmer?.rsbsa_no) return 'missing';
  return 'ready';
};

const issuanceLabel = (farmer: any) => {
  const s = issuanceStatus(farmer);
  if (s === 'printed') return 'Printed';
  if (s === 'missing') return 'Missing Info';
  return 'Ready to Print';
};

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

const exportIdList = async () => {
  const rows = selectedFarmers.value;
  if (!rows.length) {
    await toast('No farmers selected.', 'warning');
    return;
  }
  try {
    await exportAdminGridExcel({
      filename: 'farmer-id-issuance-list.xlsx',
      reportTitle: 'Farmer ID Issuance List',
      metaLine: `Generated: ${new Date().toLocaleString()} | ${rows.length} selected`,
      columns: [
        { key: 'no', label: 'No' },
        { key: 'rsbsa_no', label: 'RSBSA No.' },
        { key: 'farmer_name', label: 'Farmer Name' },
        { key: 'barangay', label: 'Barangay' },
        { key: 'contact', label: 'Contact' },
        { key: 'priority', label: 'Priority' },
        { key: 'photo', label: 'Photo' },
        { key: 'status', label: 'Issuance Status' },
      ],
      rows,
      getCellValue(row, key, index) {
        if (key === 'no') return index + 1;
        if (key === 'farmer_name') return `${row.surname || ''}, ${row.first_name || ''}`.trim();
        if (key === 'barangay') return String(row.permanent_brgy ?? '');
        if (key === 'contact') return String(row.mobile_number ?? '');
        if (key === 'priority') return priorityLabel(row);
        if (key === 'photo') return hasPhoto(row) ? 'Uploaded' : 'Needs Photo';
        if (key === 'status') return issuanceLabel(row);
        return String(row[key] ?? '');
      },
    });
  } catch (err: any) {
    await toast(err?.response?.data?.message || 'Excel export failed.', 'danger');
  }
};

const triggerPhotoUpload = () => {
  photoInput.value?.click();
};

const onPhotoSelected = async (ev: Event) => {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  const farmer = previewFarmer.value;
  if (!file || !farmer?.id) {
    input.value = '';
    return;
  }
  uploadingPhoto.value = true;
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the image file.'));
      reader.readAsDataURL(file);
    });
    const res = await axiosInstance.post(`/farmers/${farmer.id}/photo`, { photo_base64: dataUrl });
    const url = res.data?.data?.photo_url as string | undefined;
    farmer.photo_path = url || farmer.photo_path || dataUrl;
    await toast(res.data?.message || 'Farmer photo saved.', 'success');
  } catch (err: any) {
    await toast(err?.response?.data?.message || 'Failed to upload photo.', 'danger');
  } finally {
    uploadingPhoto.value = false;
    input.value = '';
  }
};

onMounted(() => {
  fetchFarmers();
  loadBarangays();
  window.addEventListener('afterprint', onAfterPrint);
});

onUnmounted(() => {
  window.removeEventListener('afterprint', onAfterPrint);
  window.clearTimeout(searchTimer);
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
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 600;
}

.stat-chip ion-icon { font-size: 0.95rem; color: #64748b; }
.stat-chip strong { font-size: 0.92rem; font-weight: 800; color: #0f172a; }
.stat-chip.warn { border-color: #fed7aa; background: #fff7ed; color: #9a3412; }
.stat-chip.warn ion-icon, .stat-chip.warn strong { color: #c2410c; }
.stat-chip.ok { border-color: #bbf7d0; background: #f0fdf4; }
.stat-chip.ok ion-icon, .stat-chip.ok strong { color: #15803d; }

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
}

.omni-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding: 10px 12px 8px;
  flex-shrink: 0;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
}

.search-wrap ion-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #94a3b8;
  pointer-events: none;
}

.omni-search, .omni-select {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.42rem 0.65rem;
  font-size: 0.82rem;
  background: #fff;
  font-family: inherit;
  color: #0f172a;
}

.omni-search { width: 100%; padding-left: 2rem; }
.omni-select { min-width: 148px; color: #334155; }

.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid #f1f5f9;
}

.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.74rem;
  font-weight: 600;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.seg-btn.on {
  background: #e8f5e9;
  border-color: #c8e6c9;
  color: #1e7e34;
}

.seg-count {
  font-size: 0.68rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #64748b;
  padding: 0 6px;
  border-radius: 999px;
  min-width: 1.2rem;
  text-align: center;
}

.seg-btn.on .seg-count { background: #c8e6c9; color: #1e7e34; }

.excel-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #1a4731;
}

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
  min-width: 720px;
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
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  z-index: 2;
  white-space: nowrap;
  border-bottom: 1px solid #e2e8f0;
}

.queue-table .col-check { width: 36px; text-align: center; }
.queue-table .col-farmer { min-width: 160px; }
.queue-table .col-rsbsa { min-width: 150px; }
.queue-table .col-action { width: 88px; text-align: right; }

.queue-row { cursor: pointer; transition: background 0.1s ease; }
.queue-table tbody tr:nth-child(even) { background: #fafcfb; }
.queue-row:hover { background: #eef5ee; }
.queue-row.row-selected { background: #e4f3e6; }
.queue-row.row-active {
  background: #ecfdf5;
  box-shadow: inset 3px 0 0 #1a4731;
}

.state-cell { text-align: center; padding: 2rem 0; }

.farmer-name { font-weight: 700; font-size: 0.86rem; color: #0f172a; line-height: 1.25; }
.farmer-meta { margin-top: 2px; color: #64748b; font-size: 0.74rem; }

.prio-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.66rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.prio-badge.regular { background: #f1f5f9; color: #475569; }
.prio-badge.senior { background: #fff8e1; color: #8a6d12; }
.prio-badge.pwd { background: #e3f2fd; color: #1565c0; }

.photo-ok {
  display: inline-flex;
  color: #15803d;
  font-size: 1.15rem;
}
.photo-miss {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.66rem;
  font-weight: 700;
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.photo-miss ion-icon { font-size: 0.85rem; }

.mono { font-family: 'Courier New', monospace; font-size: 0.78rem; color: #64748b; }

.status-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  white-space: nowrap;
}
.chip-ready { background: #e8f5e9; color: #1e7e34; }
.chip-printed { background: #f1f5f9; color: #475569; }
.chip-missing { background: #fdecea; color: #c0392b; }

.preview-btn {
  border: 1px solid #1a4731;
  background: #fff;
  color: #1a4731;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  padding: 4px 9px;
  border-radius: 7px;
  cursor: pointer;
}
.preview-btn:hover { background: #e8f5e9; }

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

.batch-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  background: #1a4731;
  color: #fff;
}
.batch-label { font-size: 0.85rem; }
.batch-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.link-btn {
  background: none;
  border: 0;
  color: #d1e0d6;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.ghost-btn, .print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 800;
  font-family: inherit;
  padding: 7px 12px;
  cursor: pointer;
}
.ghost-btn {
  background: transparent;
  border: 1px solid #d4af37;
  color: #f8e7a0;
}
.print-btn {
  background: #d4af37;
  border: 0;
  color: #1a4731;
}

.batch-bar-enter-active,
.batch-bar-leave-active { transition: transform 0.22s ease, opacity 0.22s ease; }
.batch-bar-enter-from,
.batch-bar-leave-to { transform: translateY(12px); opacity: 0; }

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
  padding: 1.1rem;
  overflow: auto;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 240px;
  color: #64748b;
  gap: 1.1rem;
  text-align: center;
}

.empty-stats {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
}

.empty-stats div {
  display: flex;
  flex-direction: column;
  min-width: 72px;
}

.empty-stats strong {
  font-size: 1.35rem;
  color: #1a4731;
  font-weight: 800;
}

.empty-stats span { font-size: 0.72rem; color: #64748b; }

.empty-preview p {
  margin: 0;
  max-width: 280px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.id-preview-wrapper,
.batch-preview {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: auto;
}

.preview-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-act {
  text-transform: none;
  font-weight: 700;
  margin: 0;
}

.batch-hint {
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
}

.text-link {
  border: 0;
  background: none;
  color: #1a4731;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.batch-preview-title {
  margin: 0;
  font-weight: 800;
  color: #1a4731;
  text-align: center;
}

.mini-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.mini-card-frame {
  width: calc(85.6mm * 0.46);
  height: calc(53.98mm * 0.46);
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
}

.mini-card-frame :deep(.id-card) {
  transform: scale(0.46);
  transform-origin: top left;
}

.more-mini { margin: 0; font-size: 0.78rem; color: #64748b; font-weight: 700; }

.hidden-file { display: none; }

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
  .auth-bg { --overflow: auto; }
  .auth-bg::part(scroll) { height: auto; }
  .workspace-header { flex-direction: column; align-items: flex-start; }
  .issuance-workspace {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }
  .queue-panel { height: auto; max-height: none; }
  .table-wrap { max-height: 50vh; }
  .preview-panel { height: auto; min-height: 360px; }
  .omni-select { flex: 1; }
}
</style>
