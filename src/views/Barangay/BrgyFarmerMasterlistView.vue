<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Barangay Farmer Masterlist</ion-title>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar
          placeholder="Search by farmer name…"
          :debounce="400"
          @ionInput="onSearch"
          style="--background:#fff;--color:#0f172a;"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <div class="shell">
        <header class="intro">
          <p class="eyebrow">Read-only · Scoped to your barangay</p>
          <h1>{{ barangayLabel }}</h1>
          <p class="lede">Constituents enrolled under your RSBSA jurisdiction.</p>
        </header>

        <div v-if="loading && !farmers.length" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading constituents…</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button @click="fetchFarmers()">Retry</ion-button>
        </div>

        <div v-else class="table-card">
          <div class="table-meta">
            <span>{{ meta.total.toLocaleString() }} farmers in your barangay</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RSBSA No.</th>
                  <th>Name</th>
                  <th>Birthdate</th>
                  <th>Mobile</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!farmers.length">
                  <td colspan="4" class="empty">No farmers found for your barangay.</td>
                </tr>
                <tr v-for="f in farmers" :key="f.id">
                  <td class="mono">{{ f.rsbsa_no || '—' }}</td>
                  <td><strong>{{ formatName(f) }}</strong></td>
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
            <span>Page {{ meta.current_page }} / {{ meta.last_page }}</span>
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
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonSearchbar, IonSpinner,
} from '@ionic/vue';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const farmers = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const meta = ref({ current_page: 1, last_page: 1, total: 0 });

const barangayLabel = computed(
  () => authStore.user?.assigned_barangay || 'Your Barangay Masterlist',
);

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
.page-bg { --background: #f4f8f5; }
.shell { max-width: 1000px; margin: 0 auto; padding: 1.1rem 1rem 2rem; }

.intro { margin-bottom: 1rem; }
.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #d4af37;
}
.intro h1 {
  margin: 0.25rem 0 0;
  font-size: 1.4rem;
  font-weight: 900;
  color: #1a4731;
}
.lede {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.center-state { text-align: center; padding: 3rem 1rem; color: #64748b; }
.center-state.error { color: #b91c1c; }

.table-card {
  background: #fff;
  border: 1px solid #d5e3da;
  border-radius: 16px;
  overflow: hidden;
}
.table-meta {
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  border-bottom: 1px solid #e8f0ea;
}
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 640px; }
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
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
