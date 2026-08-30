<template>
  <ion-page>
    <AppHeader>
      <ion-toolbar class="search-toolbar">
        <ion-searchbar
          placeholder="Search by farmer name…"
          :debounce="400"
          @ionInput="onSearch"
          style="--background:#fff;--color:#0f172a;"
        ></ion-searchbar>
      </ion-toolbar>
    </AppHeader>

    <ion-content class="rpt-content">
      <div class="rpt-shell">
        <div class="grid-shell">
          <div class="grid-head">
            <span class="grid-title">Barangay farmer masterlist</span>
            <span class="row-pill">{{ meta.total.toLocaleString() }} record(s)</span>
          </div>

          <div v-if="loading && !farmers.length" class="grid-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading farmers…</p>
          </div>
          <div v-else-if="error" class="grid-state error">
            <p>{{ error }}</p>
            <ion-button size="small" @click="fetchFarmers()">Retry</ion-button>
          </div>
          <div v-else class="table-scroll">
            <table class="excel-table">
              <thead>
                <tr>
                  <th class="col-no">No</th>
                  <th>RSBSA No.</th>
                  <th>Farmer Name</th>
                  <th>Birthdate</th>
                  <th>Mobile</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!farmers.length">
                  <td colspan="5" class="empty-row">No farmers found for your barangay.</td>
                </tr>
                <tr v-for="(f, i) in farmers" :key="f.id">
                  <td class="col-no">{{ (meta.current_page - 1) * 15 + i + 1 }}</td>
                  <td class="mono">{{ f.rsbsa_no || '—' }}</td>
                  <td>{{ formatName(f) }}</td>
                  <td>{{ formatDate(f.birthdate) }}</td>
                  <td>{{ f.mobile_number || '—' }}</td>
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
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonSearchbar, IonSpinner,
} from '@ionic/vue';
import apiClient from '@/utils/axios';

const farmers = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const meta = ref({ current_page: 1, last_page: 1, total: 0 });

const formatName = (f: any) => {
  if (!f?.surname) return '—';
  return `${f.surname}, ${[f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ')}`;
};

const formatDate = (v: any) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(v);
  }
};

const fetchFarmers = async (page = 1) => {
  loading.value = true;
  error.value = '';
  try {
    // Backend auto-scopes to assigned_barangay via Sanctum token
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
    error.value = e?.response?.data?.message || 'Could not load barangay masterlist.';
  } finally {
    loading.value = false;
  }
};

const onSearch = (e: CustomEvent) => {
  search.value = String(e.detail.value ?? '').trim();
  void fetchFarmers(1);
};

onMounted(() => fetchFarmers());
</script>

<style scoped>
.rpt-content { --background: #eef2f0; }
.rpt-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem 1rem 1rem;
  gap: 0.65rem;
}

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
.table-scroll { flex: 1; overflow: auto; }
.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
  min-width: 640px;
}
.excel-table th, .excel-table td {
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
.col-no { text-align: right; width: 44px; }
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0; font-style: italic; }
.search-toolbar {
  --background: #ffffff;
  --border-width: 0 0 1px 0;
  --border-color: #E2E8F0;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.65rem;
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
}
</style>
