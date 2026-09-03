<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <div class="rpt-shell no-print">
        <div class="filter-bar">
          <div class="filter-group grow">
            <label class="filter-label">Search</label>
            <input
              class="filter-input"
              v-model="search"
              type="search"
              placeholder="Actor, action, record, remarks"
              @keyup.enter="load(1)"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">Module</label>
            <select class="filter-select" v-model="module" @change="load(1)">
              <option value="">All modules</option>
              <option v-for="m in modules" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Verb</label>
            <select class="filter-select" v-model="verb" @change="load(1)">
              <option value="">All verbs</option>
              <option v-for="v in verbs" :key="v" :value="v">{{ v }}</option>
            </select>
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
          <ion-button class="filter-btn" fill="outline" :disabled="exporting" @click="exportCsv">
            {{ exporting ? 'Exporting…' : 'CSV' }}
          </ion-button>
          <ion-button class="filter-btn" fill="outline" @click="printReport">Print</ion-button>
          <ion-button
            v-if="isSuper"
            class="filter-btn"
            fill="outline"
            :disabled="checkingIntegrity"
            @click="checkIntegrity"
          >
            {{ integrityLabel }}
          </ion-button>
        </div>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
        <div v-else class="table-scroll">
          <table class="excel-table">
            <thead>
              <tr>
                <th>When (UTC+8)</th>
                <th>Actor</th>
                <th>Verb / Action</th>
                <th>Target</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length">
                <td colspan="5" class="empty-row">No audit events match these filters.</td>
              </tr>
              <tr
                v-for="row in rows"
                :key="row.id"
                class="clickable"
                @click="openDetail(row)"
              >
                <td class="mono">{{ row.logged_at || formatWhen(row.created_at) }}</td>
                <td>
                  <div class="actor-cell">
                    <strong>{{ row.actor_name || '—' }}</strong>
                    <span>{{ row.actor_email || '—' }} · {{ row.actor_role || '—' }}</span>
                    <span class="mono">{{ row.ip_address || '—' }}</span>
                  </div>
                </td>
                <td>
                  <span class="pill">{{ row.verb || '—' }}</span>
                  <div class="mono">{{ row.action }}</div>
                  <div class="muted">{{ row.module || '—' }}</div>
                </td>
                <td>
                  <div>{{ row.target_table || row.target_type || '—' }}</div>
                  <div class="mono">{{ row.record_code || row.target_id || '—' }}</div>
                </td>
                <td>{{ row.remarks || '—' }}</td>
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

      <div class="print-only print-document">
        <h1>AGRI-AKAP Audit Trail</h1>
        <p>Generated {{ new Date().toLocaleString() }} · Timestamp zone UTC+8</p>
        <table class="excel-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="'print-' + row.id">
              <td>{{ row.logged_at }}</td>
              <td>{{ row.actor_name }} ({{ row.actor_email }}) {{ row.actor_role }} {{ row.ip_address }}</td>
              <td>{{ row.verb }} {{ row.action }}</td>
              <td>{{ row.target_table }} {{ row.record_code }}</td>
              <td>{{ row.remarks }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ion-modal :is-open="!!detail" @didDismiss="detail = null">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Audit detail</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="detail = null">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding" v-if="detail">
          <p><strong>Log ID:</strong> <span class="mono">{{ detail.id }}</span></p>
          <p><strong>When:</strong> {{ detail.logged_at }}</p>
          <p><strong>Actor:</strong> {{ detail.actor_name }} · {{ detail.actor_email }} · {{ detail.actor_role }} · {{ detail.ip_address }}</p>
          <p><strong>Action:</strong> {{ detail.verb }} / {{ detail.action }} ({{ detail.module }})</p>
          <p><strong>Target:</strong> {{ detail.target_table }} · {{ detail.record_code }} · {{ detail.target_id }}</p>
          <p><strong>Remarks:</strong> {{ detail.remarks || '—' }}</p>
          <h3>Before</h3>
          <pre class="diff">{{ pretty(detail.before_state) }}</pre>
          <h3>After</h3>
          <pre class="diff">{{ pretty(detail.after_state) }}</pre>
          <h3>Metadata</h3>
          <pre class="diff">{{ pretty(detail.metadata) }}</pre>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, onMounted, ref } from 'vue';
import {
  IonPage, IonContent, IonButton, IonSpinner, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/vue';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/utils/toast';

const auth = useAuthStore();
const isSuper = computed(() => auth.isSuperAdmin);

const modules = ['auth', 'staff', 'rsbsa', 'plots', 'subsidy', 'calamity', 'sms', 'reports', 'export', 'sync'];
const verbs = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'LOGIN'];
const actions = [
  'auth.login.success', 'auth.login.failed', 'user.created', 'user.updated',
  'user.deactivated', 'user.unlocked', 'password.reset', 'password.changed', 'session.revoked',
  'farmer.registered', 'farmer.updated', 'farmer.archived', 'farmer.verified', 'farmer.imported',
  'subsidy_program.created', 'subsidy_program.restocked', 'subsidy_beneficiary.claimed', 'subsidy_beneficiary.voided',
  'damage_assessment.approved', 'damage_assessment.rejected', 'broadcast.sent',
  'export.farmers', 'export.distributions', 'export.audit_logs', 'sync.bulk.completed',
];

const search = ref('');
const action = ref('');
const module = ref('');
const verb = ref('');
const from = ref('');
const to = ref('');
const loading = ref(false);
const exporting = ref(false);
const checkingIntegrity = ref(false);
const integrityOk = ref<boolean | null>(null);
const rows = ref<any[]>([]);
const page = ref(1);
const lastPage = ref(1);
const detail = ref<any | null>(null);

const integrityLabel = computed(() => {
  if (checkingIntegrity.value) return 'Checking…';
  if (integrityOk.value === true) return 'Chain OK';
  if (integrityOk.value === false) return 'Chain broken';
  return 'Integrity';
});

const formatWhen = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');
const pretty = (value: unknown) => {
  if (value == null || value === '') return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const queryParams = (nextPage = 1) => ({
  search: search.value || undefined,
  action: action.value || undefined,
  module: module.value || undefined,
  verb: verb.value || undefined,
  from: from.value || undefined,
  to: to.value || undefined,
  page: nextPage,
  per_page: 25,
});

const load = async (nextPage = 1) => {
  loading.value = true;
  page.value = nextPage;
  try {
    const res = await apiClient.get('/system/audit-logs', { params: queryParams(nextPage) });
    const payload = res.data?.data;
    rows.value = payload?.data ?? [];
    lastPage.value = payload?.last_page ?? 1;
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const openDetail = (row: any) => {
  detail.value = row;
};

const exportCsv = async () => {
  exporting.value = true;
  try {
    const res = await apiClient.get('/system/audit-logs/export', {
      params: {
        search: search.value || undefined,
        action: action.value || undefined,
        module: module.value || undefined,
        verb: verb.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
      },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-akap-audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await toast.success('Audit CSV downloaded.');
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not export audit logs.');
  } finally {
    exporting.value = false;
  }
};

const printReport = () => window.print();

const checkIntegrity = async () => {
  checkingIntegrity.value = true;
  try {
    const res = await apiClient.get('/system/audit-logs/integrity');
    integrityOk.value = !!res.data?.data?.valid;
    if (integrityOk.value) {
      await toast.success('Audit hash chain is intact.');
    } else {
      await toast.error('Integrity failures detected. Review SuperAdmin alerts.');
    }
  } catch (err: any) {
    integrityOk.value = null;
    await toast.error(err?.response?.data?.message || 'Integrity check failed.');
  } finally {
    checkingIntegrity.value = false;
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
.excel-table th, .excel-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.85rem; vertical-align: top; }
.excel-table thead th { background: #1a4731; color: #fff; position: sticky; top: 0; }
.mono { font-family: ui-monospace, monospace; font-size: 0.78rem; }
.empty-row { text-align: center; color: #94a3b8; }
.pager { display: flex; gap: 0.75rem; align-items: center; justify-content: center; padding: 0.8rem; }
.filter-btn { --background: #1a4731; }
.clickable { cursor: pointer; }
.clickable:hover { background: #f8fafc; }
.actor-cell { display: flex; flex-direction: column; gap: 0.1rem; }
.muted { color: #64748b; font-size: 0.75rem; }
.pill {
  display: inline-block; font-size: 0.7rem; font-weight: 800; padding: 0.1rem 0.4rem;
  border-radius: 999px; background: #dcfce7; color: #166534; margin-bottom: 0.2rem;
}
.diff {
  background: #0f172a; color: #e2e8f0; padding: 0.75rem; border-radius: 8px;
  overflow: auto; font-size: 0.78rem; max-height: 240px;
}
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .excel-table thead th { background: #1a4731 !important; color: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
</style>
