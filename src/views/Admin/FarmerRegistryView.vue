<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Farmer Registry</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="router.push('/admin/farmers/register')">
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar
          placeholder="Search name, RSBSA, barangay…"
          :debounce="400"
          @ionInput="onSearch"
          style="--background:#fff;--color:#0f172a;"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="shell">
        <div class="toolbar-row">
          <div>
            <h1>Official Registry</h1>
            <p>DA Masterlist and Farmer Database</p>
          </div>
          <div class="actions">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              class="hidden-file"
              @change="onFileSelected"
            />
            <ion-button class="import-btn" :disabled="importing" @click="triggerImport">
              <ion-spinner v-if="importing" name="crescent" slot="start"></ion-spinner>
              <ion-icon v-else slot="start" :icon="cloudUploadOutline"></ion-icon>
              {{ importing ? 'Importing…' : 'Import RSBSA Excel' }}
            </ion-button>
            <ion-button fill="outline" class="refresh-btn" :disabled="loading" @click="fetchFarmers()">
              <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
              Refresh
            </ion-button>
          </div>
        </div>

        <div v-if="loading && !farmers.length" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading masterlist…</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button @click="fetchFarmers()">Retry</ion-button>
        </div>

        <div v-else class="table-card">
          <div class="table-meta">
            <span>Total registered farmers: {{ meta.total.toLocaleString() }}</span>
            <span v-if="search">Filtered by “{{ search }}”</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RSBSA Reference Number</th>
                  <th>Farmer Name</th>
                  <th>Barangay</th>
                  <th>Contact Number</th>
                  <th>Registered Parcels</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!farmers.length">
                  <td colspan="5" class="empty">No farmers found. Import an RSBSA Excel file to begin.</td>
                </tr>
                <tr v-for="f in farmers" :key="f.id">
                  <td class="mono">{{ f.rsbsa_no || '—' }}</td>
                  <td>
                    <strong>{{ formatName(f) }}</strong>
                  </td>
                  <td>{{ f.permanent_brgy || '—' }}</td>
                  <td>{{ f.mobile_number || '—' }}</td>
                  <td>{{ f.farm_plots_count ?? 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager" v-if="meta.last_page > 1">
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
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSearchbar, IonSpinner, toastController,
} from '@ionic/vue';
import { addOutline, cloudUploadOutline, refreshOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';

const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

const farmers = ref<any[]>([]);
const loading = ref(false);
const importing = ref(false);
const error = ref('');
const search = ref('');
const meta = ref({ current_page: 1, last_page: 1, total: 0 });

const formatName = (f: any) => {
  const parts = [f.surname, f.first_name, f.middle_name, f.ext_name].filter(Boolean);
  return parts.length ? `${f.surname}, ${[f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ')}` : '—';
};

const toast = async (message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'success') => {
  const t = await toastController.create({ message, duration: 3200, color, position: 'top' });
  await t.present();
};

const fetchFarmers = async (page = 1) => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/farmers', {
      params: {
        page,
        search: search.value || undefined,
      },
    });
    const payload = res.data?.data;
    farmers.value = payload?.data ?? [];
    meta.value = {
      current_page: payload?.current_page ?? 1,
      last_page: payload?.last_page ?? 1,
      total: payload?.total ?? farmers.value.length,
    };
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load farmer registry.';
  } finally {
    loading.value = false;
  }
};

const onSearch = (e: CustomEvent) => {
  search.value = String(e.detail.value ?? '').trim();
  void fetchFarmers(1);
};

const triggerImport = () => fileInput.value?.click();

const onFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  const okType = /\.(xlsx|xls|csv)$/i.test(file.name);
  if (!okType) {
    await toast('Please select an .xlsx, .xls, or .csv file.', 'warning');
    return;
  }

  importing.value = true;
  try {
    const form = new FormData();
    form.append('excel_file', file);
    const res = await apiClient.post('/farmers/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const stats = res.data?.data ?? {};
    await toast(
      `Import complete — ${stats.created ?? 0} created, ${stats.updated ?? 0} updated, ${stats.skipped ?? 0} skipped.`,
      'success',
    );
    await fetchFarmers(1);
  } catch (err: any) {
    await toast(err?.response?.data?.message || 'Import failed. Check the file and try again.', 'danger');
  } finally {
    importing.value = false;
  }
};

onMounted(() => fetchFarmers());
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.shell { max-width: 1200px; margin: 0 auto; padding: 1.1rem 1rem 2rem; }

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.toolbar-row h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 900;
  color: #1a4731;
}
.toolbar-row p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}
.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.hidden-file { display: none; }

.import-btn {
  --background: #d4af37;
  --color: #1a4731;
  font-weight: 800;
  text-transform: none;
}
.refresh-btn {
  --border-color: #1a4731;
  --color: #1a4731;
  text-transform: none;
  font-weight: 700;
}

.center-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}
.center-state.error { color: #b91c1c; }

.table-card {
  background: #fff;
  border: 1px solid #d5e3da;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(26, 71, 49, 0.05);
}
.table-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  border-bottom: 1px solid #e8f0ea;
}
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eef2f0;
  font-size: 0.9rem;
}
th {
  background: #1a4731;
  color: #d4af37;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
td strong { color: #1a4731; }
.mono { font-family: ui-monospace, monospace; font-size: 0.82rem; }
.empty { text-align: center; color: #94a3b8; padding: 2rem 1rem; }

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.85rem;
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
}
</style>
