<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Audit Logs</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="rpt-content">
      <div class="rpt-shell">
        <div class="filter-bar">
          <div class="filter-group grow">
            <label class="filter-label">Search</label>
            <input class="filter-input" v-model="search" type="search" placeholder="Email or action" @keyup.enter="load(1)" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Action</label>
            <select class="filter-select" v-model="action" @change="load(1)">
              <option value="">All actions</option>
              <option v-for="a in actions" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">From</label>
            <input class="filter-input" type="date" v-model="from" @change="load(1)" />
          </div>
          <div class="filter-group">
            <label class="filter-label">To</label>
            <input class="filter-input" type="date" v-model="to" @change="load(1)" />
          </div>
          <ion-button class="filter-btn" @click="load(1)">Apply</ion-button>
        </div>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
        <div v-else class="table-scroll">
          <table class="excel-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Role</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length">
                <td colspan="5" class="empty-row">No audit events match these filters.</td>
              </tr>
              <tr v-for="row in rows" :key="row.id">
                <td>{{ formatWhen(row.created_at) }}</td>
                <td class="mono">{{ row.action }}</td>
                <td>{{ row.actor_email || '—' }}</td>
                <td>{{ row.actor_role || '—' }}</td>
                <td class="mono">{{ row.ip_address || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pager" v-if="lastPage > 1">
          <ion-button fill="outline" size="small" :disabled="page <= 1" @click="load(page - 1)">Previous</ion-button>
          <span>Page {{ page }} of {{ lastPage }}</span>
          <ion-button fill="outline" size="small" :disabled="page >= lastPage" @click="load(page + 1)">Next</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonSpinner,
} from '@ionic/vue';
import apiClient from '@/utils/axios';

const actions = [
  'auth.login.success', 'auth.login.failed', 'user.created', 'user.updated',
  'user.deactivated', 'user.unlocked', 'password.reset', 'password.changed', 'session.revoked',
  'mfa.setup', 'mfa.verify.success', 'mfa.verify.failed', 'mfa.sms.sent', 'mfa.recovery.regenerated',
  'sms.provider.updated',
];

const search = ref('');
const action = ref('');
const from = ref('');
const to = ref('');
const loading = ref(false);
const rows = ref<any[]>([]);
const page = ref(1);
const lastPage = ref(1);

const formatWhen = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const load = async (nextPage = 1) => {
  loading.value = true;
  page.value = nextPage;
  try {
    const res = await apiClient.get('/system/audit-logs', {
      params: {
        search: search.value || undefined,
        action: action.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        page: nextPage,
        per_page: 25,
      },
    });
    const payload = res.data?.data;
    rows.value = payload?.data ?? [];
    lastPage.value = payload?.last_page ?? 1;
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => { void load(1); });
</script>

<style scoped>
.rpt-content { --background: #f4f8f5; }
.rpt-shell { padding: 1rem; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: flex-end; margin-bottom: 0.8rem; }
.filter-group { display: flex; flex-direction: column; gap: 0.2rem; }
.filter-group.grow { flex: 1; min-width: 180px; }
.filter-label { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.center-state { display: flex; justify-content: center; padding: 2rem; }
.table-scroll { overflow: auto; background: #fff; border-radius: 8px; }
.excel-table { width: 100%; border-collapse: collapse; }
.excel-table th, .excel-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.85rem; }
.excel-table thead th { background: #1a4731; color: #fff; position: sticky; top: 0; }
.mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
.empty-row { text-align: center; color: #94a3b8; }
.pager { display: flex; gap: 0.75rem; align-items: center; justify-content: center; padding: 0.8rem; }
.filter-btn { --background: #1a4731; }
</style>
