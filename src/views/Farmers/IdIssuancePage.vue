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

    <ion-content class="ion-padding auth-bg no-print-bg">
      <div class="issuance-container">

        <!-- ═══════════════════════════════════════════════════════
             HEADER + COLOR LEGEND
             ═══════════════════════════════════════════════════════ -->
        <div class="header-section no-print">
          <h2>Farmer ID Issuance</h2>
          <p class="text-muted">Card Selection and Printing Options</p>
          <div class="color-legend">
            <span class="legend-title">ID Color Codes:</span>
            <span class="legend-item"><span class="swatch" :style="{ background: CATEGORY.regular.color }"></span>Regular</span>
            <span class="legend-item"><span class="swatch" :style="{ background: CATEGORY.senior.color }"></span>Senior Citizen (60+)</span>
            <span class="legend-item"><span class="swatch" :style="{ background: CATEGORY.pwd.color }"></span>PWD</span>
          </div>
        </div>

        <ion-grid class="no-print">
          <ion-row>
            <!-- ═══════════════════════════════════════════════════
                 LEFT: FARMER LIST WITH BULK SELECTION
                 ═══════════════════════════════════════════════════ -->
            <ion-col size="12" size-md="5" size-lg="4">
              <ion-card class="list-card">
                <ion-card-content class="ion-no-padding">

                  <!-- 1. Filter Bar: Search + Barangay -->
                  <div class="list-filter-bar">
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

                  <!-- Select All header -->
                  <div class="list-select-all">
                    <input
                      type="checkbox"
                      class="excel-checkbox"
                      :checked="isAllSelected"
                      :indeterminate="isIndeterminate"
                      @change="toggleSelectAll"
                    />
                    <span class="select-all-label">
                      {{ selectedIds.size > 0 ? `${selectedIds.size} selected` : 'All Farmers' }}
                    </span>
                    <span v-if="selectedIds.size > 0" class="clear-link" @click="clearSelection">Clear</span>
                  </div>

                  <!-- Loading -->
                  <div v-if="isLoading" class="text-center p-4">
                    <ion-spinner name="crescent" color="primary"></ion-spinner>
                  </div>

                  <!-- Farmer list with checkboxes -->
                  <ion-list v-else lines="full" class="farmer-select-list">
                    <ion-item
                      v-for="farmer in farmers"
                      :key="farmer.id"
                      :class="{ 'selected-item': selectedIds.has(farmer.id), 'preview-active': previewFarmer?.id === farmer.id }"
                    >
                      <input
                        type="checkbox"
                        slot="start"
                        class="excel-checkbox row-check"
                        :checked="selectedIds.has(farmer.id)"
                        @change="toggleRow(farmer)"
                      />
                      <ion-label button @click="previewSingle(farmer)" class="farmer-label-btn">
                        <h2><strong>{{ farmer.surname }}, {{ farmer.first_name }}</strong></h2>
                        <p class="mono">{{ farmer.rsbsa_no || 'RSBSA Pending' }}</p>
                        <p class="brgy-text">{{ farmer.permanent_brgy }}</p>
                      </ion-label>
                      <div slot="end" class="item-end-badges">
                        <ion-badge v-if="isPriority(farmer)" :color="catInfo(farmer).badge" class="priority-badge">{{ catInfo(farmer).label }}</ion-badge>
                      </div>
                    </ion-item>

                    <EmptyState
                      v-if="!isLoading && farmers.length === 0"
                      variant="farmers"
                      message="No farmers found."
                    />
                  </ion-list>

                  <!-- Pagination -->
                  <div v-if="pagination && pagination.last_page > 1" class="list-pagination">
                    <ion-button fill="clear" size="small" :disabled="pagination.current_page <= 1" @click="loadPage(pagination.current_page - 1)">
                      <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
                    </ion-button>
                    <span class="page-label">{{ pagination.current_page }}/{{ pagination.last_page }}</span>
                    <ion-button fill="clear" size="small" :disabled="pagination.current_page >= pagination.last_page" @click="loadPage(pagination.current_page + 1)">
                      <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- ═══════════════════════════════════════════════════
                 RIGHT: SINGLE ID PREVIEW
                 ═══════════════════════════════════════════════════ -->
            <ion-col size="12" size-md="7" size-lg="8" class="preview-col">
              <div v-if="!previewFarmer" class="empty-preview">
                <ion-icon :icon="idCardOutline" style="font-size:3rem;color:#94a3b8;"></ion-icon>
                <p>Click a farmer's name to preview their ID card.</p>
                <p class="hint-text">Use checkboxes to select farmers for batch printing.</p>
              </div>

              <div v-else class="id-preview-wrapper">
                <div class="action-bar">
                  <div class="action-bar-left">
                    <ion-badge color="success">READY FOR ISSUANCE</ion-badge>
                    <ion-badge :color="catInfo(previewFarmer).badge">{{ catInfo(previewFarmer).label }}</ion-badge>
                  </div>
                  <ion-button color="dark" size="small" @click="printSingleId(previewFarmer)">
                    <ion-icon slot="start" :icon="printOutline"></ion-icon>
                    Printout
                  </ion-button>
                </div>

                <!-- Single ID Card Preview -->
                <div class="id-card-preview-frame">
                  <div class="id-card" :class="catClass(previewFarmer)">
                    <div class="id-header">
                      <img src="@/assets/images/mao-echague-logo.png" alt="MAO Logo" class="id-logo" onerror="this.style.display='none'" />
                      <div class="id-header-text">
                        <p class="gov-line-1">REPUBLIC OF THE PHILIPPINES</p>
                        <p class="gov-line-2">Municipality of Echague</p>
                        <p class="gov-line-3">MUNICIPAL AGRICULTURE OFFICE</p>
                      </div>
                    </div>

                    <div class="id-body">
                      <div class="photo-section">
                        <div class="photo-box">
                          <img v-if="previewFarmer.photo_path"
                            :src="`${API_BASE}/storage/${previewFarmer.photo_path}`"
                            class="photo-img"
                          />
                          <ion-icon v-else :icon="personOutline" class="photo-icon"></ion-icon>
                        </div>
                        <div class="badge-role">REGISTERED FARMER</div>
                      </div>

                      <div class="details-section">
                        <div class="detail-group">
                          <span class="detail-label">FULL NAME</span>
                          <span class="detail-value name-value">
                            {{ previewFarmer.first_name }}
                            {{ previewFarmer.middle_name ? previewFarmer.middle_name[0] + '.' : '' }}
                            {{ previewFarmer.surname }}
                            {{ previewFarmer.ext_name || '' }}
                          </span>
                        </div>
                        <div class="detail-group">
                          <span class="detail-label">RSBSA NUMBER</span>
                          <span class="detail-value rsbsa-value">{{ previewFarmer.rsbsa_no || 'PENDING' }}</span>
                        </div>
                        <div class="detail-row">
                          <div class="detail-group">
                            <span class="detail-label">BARANGAY</span>
                            <span class="detail-value">{{ previewFarmer.permanent_brgy }}</span>
                          </div>
                          <div class="detail-group">
                            <span class="detail-label">SEX</span>
                            <span class="detail-value">{{ previewFarmer.sex }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="qr-section">
                        <qrcode-vue :value="previewFarmer.id" :size="80" level="H" />
                        <p class="qr-label">Scan to Verify</p>
                      </div>
                    </div>

                    <!-- Footer: color-coded by priority -->
                    <div class="id-footer" :class="catFooterClass(previewFarmer)">
                      <span v-if="isPriority(previewFarmer)" class="footer-star">★</span>
                      {{ catInfo(previewFarmer).footer }}
                    </div>
                  </div>
                </div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- ═══════════════════════════════════════════════════════
             FLOATING BULK PRINT BAR
             ═══════════════════════════════════════════════════════ -->
        <Transition name="bulk-bar">
          <div v-if="selectedIds.size > 0" class="bulk-print-bar no-print">
            <div class="bulk-bar-inner">
              <div class="bulk-count">
                <ion-icon :icon="printOutline" class="bulk-icon"></ion-icon>
                <strong>{{ selectedIds.size }}</strong> ID{{ selectedIds.size !== 1 ? 's' : '' }} ready to print
              </div>
              <button class="bulk-print-btn" @click="printBatchIds">
                <ion-icon :icon="printOutline"></ion-icon>
                Print Batch
              </button>
            </div>
          </div>
        </Transition>

      </div>

      <!-- ═══════════════════════════════════════════════════════════
           HIDDEN PRINT CONTAINER — rendered for @media print only
           Generates a 2-column A4 grid of ID cards for selected farmers
           ═══════════════════════════════════════════════════════════ -->
      <div class="print-container print-only" id="print-batch">
        <div
          v-for="farmer in printableFarmers"
          :key="'print-' + farmer.id"
          class="id-card-print-wrapper"
        >
          <div class="id-card" :class="catClass(farmer)">
            <div class="id-header">
              <img src="@/assets/images/mao-echague-logo.png" alt="MAO Logo" class="id-logo" onerror="this.style.display='none'" />
              <div class="id-header-text">
                <p class="gov-line-1">REPUBLIC OF THE PHILIPPINES</p>
                <p class="gov-line-2">Municipality of Echague</p>
                <p class="gov-line-3">MUNICIPAL AGRICULTURE OFFICE</p>
              </div>
            </div>

            <div class="id-body">
              <div class="photo-section">
                <div class="photo-box">
                  <img v-if="farmer.photo_path"
                    :src="`${API_BASE}/storage/${farmer.photo_path}`"
                    class="photo-img"
                  />
                  <ion-icon v-else :icon="personOutline" class="photo-icon"></ion-icon>
                </div>
                <div class="badge-role">REGISTERED FARMER</div>
              </div>

              <div class="details-section">
                <div class="detail-group">
                  <span class="detail-label">FULL NAME</span>
                  <span class="detail-value name-value">
                    {{ farmer.first_name }}
                    {{ farmer.middle_name ? farmer.middle_name[0] + '.' : '' }}
                    {{ farmer.surname }}
                    {{ farmer.ext_name || '' }}
                  </span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">RSBSA NUMBER</span>
                  <span class="detail-value rsbsa-value">{{ farmer.rsbsa_no || 'PENDING' }}</span>
                </div>
                <div class="detail-row">
                  <div class="detail-group">
                    <span class="detail-label">BARANGAY</span>
                    <span class="detail-value">{{ farmer.permanent_brgy }}</span>
                  </div>
                  <div class="detail-group">
                    <span class="detail-label">SEX</span>
                    <span class="detail-value">{{ farmer.sex }}</span>
                  </div>
                </div>
              </div>

              <div class="qr-section">
                <qrcode-vue :value="farmer.id" :size="70" level="H" />
                <p class="qr-label">Scan to Verify</p>
              </div>
            </div>

            <div class="id-footer" :class="catFooterClass(farmer)">
              <span v-if="isPriority(farmer)" class="footer-star">★</span>
              {{ catInfo(farmer).footer }}
            </div>
          </div>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonGrid, IonRow, IonCol, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon, IonSpinner,
  IonSearchbar, IonSelect, IonSelectOption,
  toastController,
} from '@ionic/vue';
import {
  printOutline, personOutline, idCardOutline,
  chevronBackOutline, chevronForwardOutline,
} from 'ionicons/icons';
import QrcodeVue from 'qrcode.vue';
import axiosInstance from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';

const route = useRoute();
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://127.0.0.1:8000';

// ── Data state ────────────────────────────────────────────────────
interface PaginationMeta { current_page: number; last_page: number; total: number; }

const farmers = ref<any[]>([]);
const isLoading = ref(true);
const pagination = ref<PaginationMeta | null>(null);
const searchQuery = ref('');

// ── Filter state ──────────────────────────────────────────────────
const barangays = ref<string[]>([]);
const filterBarangay = ref('');

// ── Selection state ───────────────────────────────────────────────
const selectedIds = reactive(new Set<string>());
const previewFarmer = ref<any>(null);

// ── Computed ──────────────────────────────────────────────────────
const isAllSelected = computed(() =>
  farmers.value.length > 0 && farmers.value.every((f) => selectedIds.has(f.id))
);
const isIndeterminate = computed(() =>
  !isAllSelected.value && farmers.value.some((f) => selectedIds.has(f.id))
);

/** Farmers to render in the hidden print container */
const printableFarmers = computed(() =>
  farmers.value.filter((f) => selectedIds.has(f.id))
);

// ── Selection actions ─────────────────────────────────────────────
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    farmers.value.forEach((f) => selectedIds.delete(f.id));
  } else {
    farmers.value.forEach((f) => selectedIds.add(f.id));
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

// ── Farmer data fetching ──────────────────────────────────────────
const fetchFarmers = async (page = 1, search = '') => {
  isLoading.value = true;
  try {
    const params: Record<string, any> = { page, search };
    if (filterBarangay.value) params.barangay = filterBarangay.value;
    const res = await axiosInstance.get('/farmers', { params });
    const payload = res.data.data;
    // Surface priority beneficiaries (PWD, then Senior) first within the page.
    const rank = (f: any) => (priorityCategory(f) === 'pwd' ? 0 : priorityCategory(f) === 'senior' ? 1 : 2);
    farmers.value = [...payload.data].sort((a: any, b: any) => rank(a) - rank(b));
    pagination.value = {
      current_page: payload.current_page,
      last_page: payload.last_page,
      total: payload.total,
    };

    // Auto-select if launched from FarmersListPage with a farmer_id query param
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

// ── Priority category helpers ─────────────────────────────────────
const initials = (f: any) => ((f.first_name?.[0] ?? '') + (f.surname?.[0] ?? '')).toUpperCase();

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

const CATEGORY: Record<PriorityCategory, { label: string; color: string; badge: string; footer: string }> = {
  pwd:     { label: 'PWD',            color: '#d4af37', badge: 'warning',  footer: 'PRIORITY ACCESS — PERSON WITH DISABILITY' },
  senior:  { label: 'SENIOR CITIZEN', color: '#d4af37', badge: 'warning',  footer: 'PRIORITY ACCESS — SENIOR CITIZEN' },
  regular: { label: 'REGULAR',        color: '#1a4731', badge: 'success',  footer: 'OFFICIAL GOVERNMENT BENEFICIARY CARD' },
};

const catInfo = (farmer: any) => CATEGORY[priorityCategory(farmer)];
const isPriority = (farmer: any): boolean => priorityCategory(farmer) !== 'regular';

/** CSS class for the id-card element based on priority */
const catClass = (farmer: any): string => {
  const cat = priorityCategory(farmer);
  return cat === 'regular' ? 'cat-regular' : 'cat-priority';
};

/** CSS class for the footer based on priority */
const catFooterClass = (farmer: any): string => {
  return isPriority(farmer) ? 'footer-priority' : 'footer-regular';
};

// ── Print actions ─────────────────────────────────────────────────
const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2400, color, position: 'top' });
  await t.present();
};

const printSingleId = (farmer: any) => {
  // Ensure this single farmer is in the print set
  const wasSelected = selectedIds.has(farmer.id);
  // Temporarily set only this farmer
  selectedIds.clear();
  selectedIds.add(farmer.id);
  // Give Vue a tick to render the print container
  requestAnimationFrame(() => {
    window.print();
    // Restore previous selection state
    if (!wasSelected) {
      selectedIds.delete(farmer.id);
    }
  });
};

const printBatchIds = () => {
  if (selectedIds.size === 0) {
    toast('No farmers selected.', 'warning');
    return;
  }
  window.print();
};

onMounted(() => {
  fetchFarmers();
  loadBarangays();
});
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   ID ISSUANCE PORTAL — Scoped Styles
   Professional Government ID + Bulk A4 Print Layout
   ═══════════════════════════════════════════════════════════════════ */

/* ── Page ──────────────────────────────────────────────────────── */
.auth-bg { --background: #f4f8f5; }
.issuance-container { max-width: 1280px; margin: 0 auto; padding-top: 0.75rem; padding-bottom: 2rem; }

/* ── Header section ────────────────────────────────────────────── */
.header-section { margin-bottom: 1.25rem; }
.header-section h2 { font-weight: 800; color: #1a4731; margin: 0 0 4px; font-size: 1.4rem; }
.text-muted { color: #6c757d; font-size: 0.9rem; margin: 0; }
.color-legend { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 0.75rem; font-size: 0.8rem; color: #475569; }
.legend-title { font-weight: 700; color: #1a4731; }
.legend-item { display: inline-flex; align-items: center; gap: 5px; }
.swatch { width: 14px; height: 14px; border-radius: 3px; display: inline-block; border: 1px solid rgba(0,0,0,0.1); }

/* ═══════════════════════════════════════════════════════════════════
   LEFT PANEL — Farmer list card
   ═══════════════════════════════════════════════════════════════════ */
.list-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

/* ── Filter bar ────────────────────────────────────────────────── */
.list-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0;
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

/* ── Select All row ────────────────────────────────────────────── */
.list-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8faf9;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.82rem;
}
.select-all-label {
  font-weight: 700;
  color: #1a4731;
  flex: 1;
}
.clear-link {
  font-size: 0.78rem;
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
}
.clear-link:hover { text-decoration: underline; }

/* ── Checkboxes ────────────────────────────────────────────────── */
.excel-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #1a4731;
  flex-shrink: 0;
}
.row-check { margin-right: 8px; }

/* ── Farmer list items ─────────────────────────────────────────── */
.farmer-select-list {
  max-height: 480px;
  overflow-y: auto;
}
.farmer-select-list ion-item {
  --padding-start: 12px;
  --inner-padding-end: 8px;
}
.farmer-label-btn { cursor: pointer; }
.farmer-label-btn h2 { font-size: 0.9rem; margin: 0; color: #0f172a; }
.mono { font-family: monospace; font-size: 0.78rem; color: #64748b; margin: 2px 0 0; }
.brgy-text { font-size: 0.78rem; color: #2e7d32; margin: 1px 0 0; }
.item-end-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.priority-badge { font-size: 0.6rem; }
.selected-item { --background: #e8f5e9; }
.preview-active { --background: #dbeafe; border-left: 3px solid #1a4731; }
.p-4 { padding: 1rem; }
.text-center { text-align: center; }

/* ── List pagination ───────────────────────────────────────────── */
.list-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-top: 1px solid #e2e8f0; }
.page-label { font-size: 0.85rem; color: #64748b; font-weight: 600; }

/* ═══════════════════════════════════════════════════════════════════
   RIGHT PANEL — ID Preview
   ═══════════════════════════════════════════════════════════════════ */
.preview-col { display: flex; align-items: flex-start; justify-content: center; flex-direction: column; }
.empty-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; background: #f1f5f9; border-radius: 12px; border: 2px dashed #cbd5e1; color: #94a3b8; gap: 0.75rem; width: 100%; text-align: center; padding: 2rem; }
.hint-text { font-size: 0.82rem; color: #b0b8c1; }
.id-preview-wrapper { width: 100%; }
.action-bar { display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 500px; margin: 0 auto 1rem; gap: 8px; }
.action-bar-left { display: flex; align-items: center; gap: 8px; }

/* ── ID Card Preview frame (screen shadow) ─────────────────────── */
.id-card-preview-frame {
  display: flex;
  justify-content: center;
}

/* ═══════════════════════════════════════════════════════════════════
   THE ID CARD — Professional Government Credential
   CR80 ratio: 85.6mm × 53.98mm ≈ 3.375in × 2.125in
   ═══════════════════════════════════════════════════════════════════ */
.id-card {
  width: 85.6mm;
  height: 53.98mm;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid #d1d5db;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  position: relative;
}

/* ── ID Header — LGU Forest Green ──────────────────────────────── */
.id-header {
  background: #1a4731;
  color: #ffffff;
  display: flex;
  align-items: center;
  padding: 5px 10px;
  gap: 7px;
  flex-shrink: 0;
}
.id-logo {
  width: 26px;
  height: 26px;
  background: white;
  border-radius: 50%;
  padding: 1px;
  object-fit: contain;
  flex-shrink: 0;
}
.id-header-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.gov-line-1 {
  margin: 0;
  font-size: 5.5px;
  font-weight: 600;
  letter-spacing: 0.8px;
  opacity: 0.85;
  text-transform: uppercase;
}
.gov-line-2 {
  margin: 0;
  font-size: 7.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.gov-line-3 {
  margin: 0;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #d4af37;
}

/* ── ID Body ───────────────────────────────────────────────────── */
.id-body {
  display: flex;
  padding: 6px 10px;
  gap: 8px;
  background: #ffffff;
  flex: 1;
  align-items: center;
}

/* Photo */
.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 56px;
  flex-shrink: 0;
  gap: 3px;
}
.photo-box {
  width: 48px;
  height: 48px;
  background: #f1f5f9;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.photo-img { width: 100%; height: 100%; object-fit: cover; }
.photo-icon { font-size: 1.6rem; color: #94a3b8; }
.badge-role {
  font-size: 4.5px;
  font-weight: 800;
  background: #1a4731;
  color: white;
  padding: 1.5px 5px;
  border-radius: 2px;
  text-align: center;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Details */
.details-section { flex-grow: 1; min-width: 0; }
.detail-group { display: flex; flex-direction: column; margin-bottom: 3px; }
.detail-row { display: flex; gap: 10px; }
.detail-label {
  font-size: 5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  line-height: 1;
}
.detail-value {
  font-size: 8px;
  font-weight: 600;
  color: #1e293b;
  margin-top: 1px;
  line-height: 1.2;
}
.name-value {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #0f172a;
  letter-spacing: 0.02em;
}
.rsbsa-value {
  font-family: 'Courier New', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1a4731;
  letter-spacing: 0.8px;
}

/* QR Code */
.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.qr-label {
  font-size: 4.5px;
  color: #94a3b8;
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ── ID Footer — color-coded ───────────────────────────────────── */
.id-footer {
  text-align: center;
  padding: 3.5px 10px;
  font-size: 5.5px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.footer-regular {
  background: #1a4731;
  color: #ffffff;
  border-top: 2px solid #143a28;
}
.footer-priority {
  background: linear-gradient(90deg, #d4af37 0%, #f1c94b 50%, #d4af37 100%);
  color: #3a2f00;
  border-top: 2px solid #b8860b;
}
.footer-star { margin-right: 4px; }

/* Category border accents on card */
.id-card.cat-regular { border-top: 3px solid #1a4731; }
.id-card.cat-priority { border-top: 3px solid #d4af37; }

/* ═══════════════════════════════════════════════════════════════════
   FLOATING BULK PRINT BAR
   ═══════════════════════════════════════════════════════════════════ */
.bulk-print-bar {
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
  padding: 12px 24px;
  max-width: 1280px;
  margin: 0 auto;
  gap: 16px;
}
.bulk-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
}
.bulk-icon { font-size: 22px; color: #d4af37; }
.bulk-count strong { font-weight: 800; font-size: 1.15rem; color: #d4af37; }

.bulk-print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  background: #d4af37;
  color: #1a1a1a;
  border: none;
  transition: all 0.15s ease;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.bulk-print-btn ion-icon { font-size: 18px; }
.bulk-print-btn:hover {
  background: #e8c84b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
}
.bulk-print-btn:active { transform: scale(0.97); }

/* Bar transitions */
.bulk-bar-enter-active { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.bulk-bar-leave-active { animation: slideDown 0.2s ease-in forwards; }
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }

/* ═══════════════════════════════════════════════════════════════════
   SCREEN: Hide print container
   ═══════════════════════════════════════════════════════════════════ */
.print-only { display: none; }
.print-container { display: none; }

/* ═══════════════════════════════════════════════════════════════════
   @MEDIA PRINT — A4 GRID LAYOUT
   2-column layout, IDs sized at CR80, with cut guides
   ═══════════════════════════════════════════════════════════════════ */
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  /* Hide all interactive chrome */
  .no-print,
  .no-print-bg > .issuance-container > .header-section,
  .no-print-bg > .issuance-container > ion-grid,
  .bulk-print-bar,
  ion-header,
  ion-fab,
  ion-menu,
  ion-tab-bar {
    display: none !important;
  }

  /* Unlock Ionic scroll containers */
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

  /* Show the print container */
  .print-only,
  .print-container {
    display: grid !important;
  }

  /* A4 Grid: 2 columns of ID cards */
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

  /* Each ID wrapper */
  .id-card-print-wrapper {
    page-break-inside: avoid;
    break-inside: avoid;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 85.6mm;
    height: 53.98mm;
  }

  /* ID card inside print */
  .print-container .id-card {
    width: 85.6mm;
    height: 53.98mm;
    border-radius: 4px;
    box-shadow: none;
    border: 0.5px solid #cccccc;
    font-size: inherit;
  }

  /* Ensure colors print */
  .id-header,
  .id-footer,
  .footer-regular,
  .footer-priority,
  .badge-role {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .issuance-container {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .id-card-preview-frame { overflow-x: auto; }
  .action-bar { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>
