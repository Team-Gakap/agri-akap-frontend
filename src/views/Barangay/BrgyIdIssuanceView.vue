<template>
  <ion-page>
    <AppHeader />

    <ion-content class="issuance-bg no-print-bg">
      <div class="issuance-shell no-print" :class="{ 'show-preview': !!previewFarmer }">
        <aside class="queue-panel">
          <div class="queue-head">
            <h2>ID photo queue</h2>
            <span class="queue-pill">{{ stats.total.toLocaleString() }} farmer(s)</span>
          </div>

          <div class="omni-bar">
            <ion-searchbar
              placeholder="Search name or RSBSA…"
              :debounce="400"
              :value="searchQuery"
              @ionInput="onSearch"
            ></ion-searchbar>
          </div>

          <div class="stats-row">
            <span class="stat-chip warn">
              <ion-icon :icon="cameraOutline"></ion-icon>
              <strong>{{ stats.missing }}</strong>
              missing photo
            </span>
            <span class="stat-chip ok">
              <ion-icon :icon="checkmarkCircle"></ion-icon>
              <strong>{{ stats.withPhoto }}</strong>
              ready
            </span>
          </div>

          <div class="segmented" role="tablist" aria-label="Photo filters">
            <button
              v-for="tab in queueTabs"
              :key="tab.value"
              type="button"
              role="tab"
              class="seg-btn"
              :class="{ on: queueChip === tab.value }"
              :aria-selected="queueChip === tab.value"
              @click="setChip(tab.value)"
            >
              {{ tab.label }}
              <span class="seg-count">{{ tab.count }}</span>
            </button>
          </div>

          <div v-if="loading && !farmers.length" class="state-block">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading farmers…</p>
          </div>
          <div v-else-if="error" class="state-block error">
            <p>{{ error }}</p>
            <ion-button size="small" @click="fetchFarmers()">Retry</ion-button>
          </div>
          <div v-else-if="!farmers.length" class="state-block">
            <EmptyState variant="farmers" message="No farmers match this filter." />
          </div>
          <ul v-else class="farmer-cards">
            <li
              v-for="farmer in farmers"
              :key="farmer.id"
              class="farmer-card"
              :class="{
                active: previewFarmer?.id === farmer.id,
                'no-photo': !hasPhoto(farmer),
                selected: selectedIds.has(farmer.id),
              }"
            >
              <label v-if="isWide" class="card-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(farmer.id)"
                  @change="toggleRow(farmer)"
                />
              </label>
              <button type="button" class="card-body" @click="previewSingle(farmer)">
                <img
                  v-if="thumbUrl(farmer)"
                  :src="thumbUrl(farmer)!"
                  alt=""
                  class="card-thumb"
                />
                <div v-else class="card-thumb placeholder">
                  <ion-icon :icon="personOutline"></ion-icon>
                </div>
                <div class="card-meta">
                  <strong>{{ formatName(farmer) }}</strong>
                  <span class="mono">{{ farmer.rsbsa_no || 'RSBSA pending' }}</span>
                  <span class="photo-flag" :class="hasPhoto(farmer) ? 'ok' : 'miss'">
                    {{ hasPhoto(farmer) ? 'Photo ready' : 'Needs photo' }}
                  </span>
                </div>
              </button>
            </li>
          </ul>

          <div v-if="meta.last_page > 1" class="pager">
            <ion-button
              size="small"
              fill="outline"
              :disabled="meta.current_page <= 1 || loading"
              @click="fetchFarmers(meta.current_page - 1)"
            >
              Previous
            </ion-button>
            <span>Page {{ meta.current_page }} of {{ meta.last_page }}</span>
            <ion-button
              size="small"
              fill="outline"
              :disabled="meta.current_page >= meta.last_page || loading"
              @click="fetchFarmers(meta.current_page + 1)"
            >
              Next
            </ion-button>
          </div>

          <div v-if="isWide && selectedCount > 0" class="batch-bar">
            <span><strong>{{ selectedCount }}</strong> selected</span>
            <button type="button" class="link-btn" @click="clearSelection">Clear</button>
            <ion-button size="small" color="dark" @click="printBatchIds">
              <ion-icon slot="start" :icon="printOutline"></ion-icon>
              Batch print
            </ion-button>
          </div>
        </aside>

        <section class="preview-panel">
          <div class="preview-head">
            <button
              v-if="previewFarmer"
              type="button"
              class="back-btn"
              @click="closePreview"
            >
              <ion-icon :icon="chevronBackOutline"></ion-icon>
              Queue
            </button>
            <div>
              <h2>{{ previewFarmer ? formatName(previewFarmer) : 'ID preview' }}</h2>
              <p v-if="previewFarmer">{{ previewFarmer.rsbsa_no || 'RSBSA pending' }}</p>
              <p v-else>Tap a farmer to capture a photo or print their ID.</p>
            </div>
          </div>

          <div v-if="previewFarmer" class="preview-body">
            <div class="id-card-stage">
              <FarmerIdCard :farmer="previewFarmer" />
            </div>

            <FarmerPhotoCapture
              :has-photo="hasPhoto(previewFarmer)"
              :disabled="uploadingPhoto"
              @captured="onPhotoCaptured"
            />
            <p v-if="uploadingPhoto" class="upload-status">Saving photo…</p>

            <ion-button color="dark" class="print-act" :disabled="uploadingPhoto" @click="printSingleId(previewFarmer)">
              <ion-icon slot="start" :icon="printOutline"></ion-icon>
              Print this ID
            </ion-button>
          </div>

          <div v-else class="empty-preview">
            <p>Select a farmer from the queue. On a phone, use <strong>Take photo</strong> so the portrait lands on the ID card for MAO printing.</p>
          </div>
        </section>
      </div>

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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonButton, IonIcon, IonSearchbar, IonSpinner,
} from '@ionic/vue';
import {
  cameraOutline, checkmarkCircle, chevronBackOutline, personOutline, printOutline,
} from 'ionicons/icons';
import AppHeader from '@/components/Navigation/AppHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import FarmerIdCard from '@/components/FarmerIdCard.vue';
import FarmerPhotoCapture from '@/components/FarmerPhotoCapture.vue';
import apiClient from '@/utils/axios';
import { storageUrl } from '@/utils/storageUrl';
import { toast } from '@/utils/toast';

const PRINTED_KEY = 'agri-akap:id-printed-ids';
type QueueChip = 'all' | 'missing' | 'has-photo';

const route = useRoute();
const router = useRouter();

const farmers = ref<any[]>([]);
const loading = ref(false);
const uploadingPhoto = ref(false);
const error = ref('');
const searchQuery = ref('');
const queueChip = ref<QueueChip>('all');
const previewFarmer = ref<any>(null);
const selectedIds = reactive(new Set<string>());
const isWide = ref(typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : true);
const meta = ref({ current_page: 1, last_page: 1, total: 0 });
const stats = ref({ total: 0, missing: 0, withPhoto: 0 });
const lastPrintIds = ref<string[]>([]);
const pageReady = ref(false);

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

const hasPhoto = (farmer: any) => !!farmer?.photo_path;
const selectedCount = computed(() => selectedIds.size);

const formatName = (f: any) => {
  if (!f?.surname) return '—';
  return `${f.surname}, ${[f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ')}`;
};

const thumbUrl = (farmer: any) => storageUrl(farmer?.photo_path);

const queueTabs = computed(() => [
  { value: 'all' as QueueChip, label: 'All', count: stats.value.total },
  { value: 'missing' as QueueChip, label: 'Needs photo', count: stats.value.missing },
  { value: 'has-photo' as QueueChip, label: 'Has photo', count: stats.value.withPhoto },
]);

const printableFarmers = computed(() => {
  if (lastPrintIds.value.length) {
    const byId = new Map(farmers.value.map((f) => [String(f.id), f]));
    if (previewFarmer.value) byId.set(String(previewFarmer.value.id), previewFarmer.value);
    return lastPrintIds.value.map((id) => byId.get(String(id))).filter(Boolean);
  }
  if (previewFarmer.value) return [previewFarmer.value];
  return farmers.value.filter((f) => selectedIds.has(f.id));
});

const photoQuery = () => {
  if (queueChip.value === 'missing') return 0;
  if (queueChip.value === 'has-photo') return 1;
  return undefined;
};

const fetchStats = async () => {
  try {
    const [allRes, missRes] = await Promise.all([
      apiClient.get('/farmers', { params: { page: 1, per_page: 1, search: searchQuery.value || undefined } }),
      apiClient.get('/farmers', { params: { page: 1, per_page: 1, has_photo: 0, search: searchQuery.value || undefined } }),
    ]);
    const total = Number(allRes.data?.data?.total ?? 0);
    const missing = Number(missRes.data?.data?.total ?? 0);
    stats.value = {
      total,
      missing,
      withPhoto: Math.max(0, total - missing),
    };
  } catch {
    // list fetch still surfaces errors
  }
};

const fetchFarmers = async (page = 1) => {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, any> = {
      page,
      per_page: 30,
      search: searchQuery.value || undefined,
    };
    const hp = photoQuery();
    if (hp !== undefined) params.has_photo = hp;

    const res = await apiClient.get('/farmers', { params });
    const payload = res.data?.data;
    farmers.value = payload?.data ?? [];
    meta.value = {
      current_page: payload?.current_page ?? 1,
      last_page: payload?.last_page ?? 1,
      total: payload?.total ?? farmers.value.length,
    };
    await openFromQuery();
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load farmers.';
  } finally {
    loading.value = false;
  }
};

const openFromQuery = async () => {
  const id = String(route.query.farmer_id || '');
  if (!id) return;
  const local = farmers.value.find((f) => String(f.id) === id);
  if (local) {
    previewFarmer.value = local;
    return;
  }
  try {
    const res = await apiClient.get(`/farmers/${id}`);
    previewFarmer.value = res.data?.data ?? null;
  } catch {
    // stay on queue if the farmer is out of scope
  }
};

const applyQueryChip = () => {
  const chip = String(route.query.chip || '');
  if (chip === 'missing-photo' || chip === 'missing') queueChip.value = 'missing';
  else if (chip === 'has-photo') queueChip.value = 'has-photo';
};

const setChip = (chip: QueueChip) => {
  const next = { ...route.query } as Record<string, any>;
  if (chip === 'all') delete next.chip;
  else next.chip = chip === 'missing' ? 'missing-photo' : chip;
  void router.replace({ query: next });
};

const onSearch = (e: CustomEvent) => {
  searchQuery.value = String(e.detail.value ?? '').trim();
  void fetchFarmers(1);
  void fetchStats();
};

const previewSingle = (farmer: any) => {
  previewFarmer.value = farmer;
  void router.replace({ query: { ...route.query, farmer_id: farmer.id } });
};

const closePreview = () => {
  previewFarmer.value = null;
  const next = { ...route.query };
  delete next.farmer_id;
  void router.replace({ query: next });
};

const toggleRow = (farmer: any) => {
  if (selectedIds.has(farmer.id)) selectedIds.delete(farmer.id);
  else selectedIds.add(farmer.id);
};

const clearSelection = () => selectedIds.clear();

const onPhotoCaptured = async (dataUrl: string) => {
  const farmer = previewFarmer.value;
  if (!farmer?.id) return;
  uploadingPhoto.value = true;
  try {
    const res = await apiClient.post(`/farmers/${farmer.id}/photo`, { photo_base64: dataUrl });
    const payload = res.data?.data ?? {};
    farmer.photo_path = payload.photo_path || farmer.photo_path;
    const listed = farmers.value.find((f) => f.id === farmer.id);
    if (listed) listed.photo_path = farmer.photo_path;
    await toast.success(res.data?.message || 'Farmer photo saved.');
    void fetchStats();
    void fetchFarmers(meta.value.current_page);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Failed to upload photo.');
  } finally {
    uploadingPhoto.value = false;
  }
};

const printSingleId = async (farmer: any) => {
  lastPrintIds.value = [farmer.id];
  await nextTick();
  window.print();
  commitPrinted([farmer.id]);
  lastPrintIds.value = [];
};

const printBatchIds = async () => {
  if (selectedIds.size === 0) {
    await toast.warning('No farmers selected.');
    return;
  }
  const ids = [...selectedIds];
  lastPrintIds.value = ids;
  await nextTick();
  window.print();
  commitPrinted(ids);
  lastPrintIds.value = [];
};

const onWideChange = (ev: MediaQueryListEvent) => {
  isWide.value = ev.matches;
};

let wideMq: MediaQueryList | null = null;

watch(
  () => String(route.query.chip || ''),
  () => {
    applyQueryChip();
    if (!pageReady.value) return;
    void fetchFarmers(1);
    void fetchStats();
  },
);

watch(
  () => String(route.query.farmer_id || ''),
  () => {
    void openFromQuery();
  },
);

onMounted(() => {
  applyQueryChip();
  void fetchFarmers(1);
  void fetchStats();
  wideMq = window.matchMedia('(min-width: 900px)');
  isWide.value = wideMq.matches;
  wideMq.addEventListener('change', onWideChange);
  pageReady.value = true;
});

onUnmounted(() => {
  wideMq?.removeEventListener('change', onWideChange);
});
</script>

<style scoped>
.issuance-bg { --background: #eef2f0; }

.issuance-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0.75rem 0.85rem 1.25rem;
  min-height: 100%;
  box-sizing: border-box;
}

.queue-panel,
.preview-panel {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.queue-head,
.preview-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.65rem 1rem;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
  color: #fff;
}

.queue-head h2,
.preview-head h2 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
}

.preview-head p {
  margin: 2px 0 0;
  font-size: 0.74rem;
  color: #d1e0d6;
}

.queue-pill {
  margin-left: auto;
  background: #d4af37;
  color: #1a4731;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
}

.omni-bar { padding: 4px 6px 0; }
.omni-bar ion-searchbar { --background: #fff; --color: #0f172a; padding: 0; }

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 12px 8px;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
}
.stat-chip.warn { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
.stat-chip.ok { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.stat-chip ion-icon { font-size: 0.95rem; }
.stat-chip strong { font-weight: 800; }

.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 10px;
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
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  min-height: 36px;
}
.seg-btn.on { background: #e8f5e9; border-color: #c8e6c9; color: #1e7e34; }
.seg-count {
  font-size: 0.68rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #64748b;
  padding: 0 6px;
  border-radius: 999px;
}
.seg-btn.on .seg-count { background: #c8e6c9; color: #1e7e34; }

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: #64748b;
  text-align: center;
}
.state-block.error { color: #b91c1c; }

.farmer-cards {
  list-style: none;
  margin: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.farmer-card {
  display: flex;
  align-items: stretch;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.farmer-card.active { border-color: #1a4731; box-shadow: inset 3px 0 0 #1a4731; }
.farmer-card.no-photo { background: #fffbeb; }

.card-check {
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: #f8fafc;
}
.card-check input { width: 18px; height: 18px; accent-color: #1a4731; }

.card-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  min-height: 72px;
}

.card-thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: #e2e8f0;
}
.card-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 1.4rem;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.card-meta strong {
  font-size: 0.92rem;
  color: #0f172a;
}
.mono { font-family: 'Courier New', monospace; font-size: 0.75rem; color: #64748b; }

.photo-flag {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.photo-flag.ok { color: #15803d; }
.photo-flag.miss { color: #c2410c; }

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.65rem;
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 600;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  background: #1a4731;
  color: #fff;
  font-size: 0.85rem;
}
.batch-bar ion-button { margin: 0; --color: #1a4731; --background: #d4af37; }
.link-btn {
  background: none;
  border: 0;
  color: #d1e0d6;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.back-btn {
  display: none;
  align-items: center;
  gap: 2px;
  border: 0;
  background: transparent;
  color: #d1e0d6;
  font-weight: 700;
  font-family: inherit;
  padding: 4px 0;
  cursor: pointer;
}
.back-btn ion-icon { font-size: 1.2rem; }

.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 1rem 0.85rem 1.4rem;
  background:
    radial-gradient(circle, #e2ece6 1px, transparent 1px) 0 0 / 18px 18px,
    #f7faf8;
}

.id-card-stage {
  width: 100%;
  overflow-x: auto;
  display: flex;
  justify-content: center;
}

@media (max-width: 420px) {
  .id-card-stage :deep(.id-card.is-preview) {
    transform: scale(0.86);
    transform-origin: top center;
  }
}

.print-act {
  margin: 0;
  text-transform: none;
  font-weight: 700;
}

.upload-status {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1a4731;
}

.empty-preview {
  padding: 2rem 1.25rem;
  color: #64748b;
  text-align: center;
  line-height: 1.5;
}

.print-only { display: none; }
.print-container { display: none; }

@media (max-width: 899px) {
  .issuance-shell.show-preview .queue-panel { display: none; }
  .issuance-shell:not(.show-preview) .preview-panel { display: none; }
  .back-btn { display: inline-flex; }
}

@media (min-width: 900px) {
  .issuance-shell {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
    align-items: stretch;
    min-height: calc(100% - 0.5rem);
  }
  .queue-panel,
  .preview-panel { min-height: 0; }
  .farmer-cards { overflow: auto; flex: 1; }
  .back-btn { display: none; }
}

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
}
</style>
