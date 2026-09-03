<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <div class="rpt-shell">
        <div class="filter-bar">
          <div class="filter-group grow">
            <label class="filter-label">Search</label>
            <input class="filter-input" v-model="search" type="search" placeholder="Name or email" @keyup.enter="load(1)" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Role</label>
            <select class="filter-select" v-model="roleFilter" @change="load(1)">
              <option value="">All roles</option>
              <option v-for="r in listableRoles" :key="r" :value="r">{{ roleLabel(r) }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select class="filter-select" v-model="status" @change="load(1)">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
              <option value="locked">Locked</option>
            </select>
          </div>
          <ion-button class="filter-btn" @click="load(1)">Apply</ion-button>
          <ion-button class="filter-btn" @click="openCreate">New account</ion-button>
        </div>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
        <div v-else class="table-scroll">
          <table class="excel-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Barangay</th>
                <th>Status</th>
                <th>MFA</th>
                <th>Sessions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length">
                <td colspan="8" class="empty-row">No user accounts match these filters.</td>
              </tr>
              <tr v-for="row in rows" :key="row.id">
                <td>{{ row.name }}</td>
                <td>{{ row.email }}</td>
                <td>{{ roleLabel(row.role) }}</td>
                <td>{{ row.assigned_barangay || '—' }}</td>
                <td>
                  <span class="pill" :class="statusClass(row)">{{ statusText(row) }}</span>
                </td>
                <td>
                  <span class="pill" :class="mfaClass(row)">{{ mfaText(row) }}</span>
                </td>
                <td>{{ row.tokens_count ?? 0 }}</td>
                <td class="actions">
                  <button type="button" v-if="canMutate(row)" @click="openEdit(row)">Edit</button>
                  <button type="button" v-if="canReset(row)" @click="confirmReset(row)">Reset</button>
                  <button type="button" v-if="canUnlock(row)" @click="unlock(row)">Unlock</button>
                  <button type="button" v-if="canRevoke(row)" @click="revoke(row)">Revoke</button>
                  <button type="button" class="danger" v-if="canDeactivate(row)" @click="toggleActive(row)">
                    {{ row.is_active ? 'Deactivate' : 'Activate' }}
                  </button>
                </td>
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

      <ion-modal :is-open="formOpen" @didDismiss="formOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>{{ editing ? 'Edit account' : 'New account' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="formOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-input label="Full name *" label-placement="stacked" v-model="form.name"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input type="email" label="Email *" label-placement="stacked" v-model="form.email"></ion-input>
            </ion-item>
            <ion-item v-if="!editingSelfSuperAdmin">
              <ion-select label="Role *" label-placement="stacked" interface="popover" v-model="form.role">
                <ion-select-option v-for="r in creatableRoles" :key="r" :value="r">{{ roleLabel(r) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-if="form.role === 'barangay_official'">
              <ion-select label="Assigned barangay *" label-placement="stacked" interface="popover" v-model="form.assigned_barangay">
                <ion-select-option v-for="b in barangays" :key="b" :value="b">{{ b }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-if="isSuper && form.role === 'admin'">
              <ion-toggle v-model="form.enforce_mfa">Require authenticator (MFA)</ion-toggle>
            </ion-item>
          </ion-list>
          <ion-button expand="block" class="save-btn" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </ion-button>
        </ion-content>
      </ion-modal>

      <ion-modal :is-open="secretOpen" @didDismiss="secretOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Temporary password</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="secretOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p>Share this once. The user must change it at next login. Existing sessions were revoked.</p>
          <p class="secret">{{ revealedSecret }}</p>
          <ion-button expand="block" @click="copySecret">Copy</ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonSpinner, IonModal, IonList, IonItem, IonInput, IonSelect, IonSelectOption,
  IonToggle,
  alertController,
} from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';
import { useOfficialBarangays } from '@/composables/useOfficialBarangays';
import { promptAuditRemarks } from '@/composables/promptAuditRemarks';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  assigned_barangay?: string | null;
  is_active: boolean;
  is_locked: boolean;
  tokens_count?: number;
  enforce_mfa?: boolean;
  mfa_enrolled?: boolean;
};

const auth = useAuthStore();
const { barangays } = useOfficialBarangays();

const isSuper = computed(() => auth.isSuperAdmin);
const listableRoles = computed(() =>
  isSuper.value
    ? ['super_admin', 'admin', 'technician', 'barangay_official']
    : ['technician', 'barangay_official'],
);
const creatableRoles = computed(() =>
  isSuper.value ? ['admin', 'technician', 'barangay_official'] : ['technician', 'barangay_official'],
);

const search = ref('');
const roleFilter = ref('');
const status = ref('all');
const loading = ref(false);
const saving = ref(false);
const rows = ref<StaffRow[]>([]);
const page = ref(1);
const lastPage = ref(1);
const formOpen = ref(false);
const secretOpen = ref(false);
const revealedSecret = ref('');
const editing = ref<StaffRow | null>(null);
const form = reactive({ name: '', email: '', role: 'technician', assigned_barangay: '', enforce_mfa: false });

const editingSelfSuperAdmin = computed(
  () => editing.value?.role === 'super_admin' && editing.value?.id === auth.user?.id,
);

const roleLabel = (role: string) => {
  if (role === 'super_admin') return 'System SuperAdmin';
  if (role === 'admin') return 'MAO Administrator';
  if (role === 'barangay_official') return 'Barangay Encoder';
  return 'Field Technician';
};

const statusText = (row: StaffRow) => {
  if (row.is_locked) return 'Locked';
  return row.is_active ? 'Active' : 'Deactivated';
};
const statusClass = (row: StaffRow) => {
  if (row.is_locked) return 'locked';
  return row.is_active ? 'ok' : 'off';
};

const mfaText = (row: StaffRow) => {
  if (row.role === 'super_admin') return 'Required';
  if (row.role !== 'admin') return '—';
  if (row.mfa_enrolled) return 'Enrolled';
  if (row.enforce_mfa) return 'Required';
  return 'Off';
};
const mfaClass = (row: StaffRow) => {
  if (row.role === 'super_admin' || row.mfa_enrolled) return 'ok';
  if (row.enforce_mfa) return 'locked';
  return 'off';
};

const canMutate = (row: StaffRow) => {
  if (row.role === 'super_admin') return row.id === auth.user?.id;
  if (isSuper.value) return true;
  return ['technician', 'barangay_official'].includes(row.role);
};
const canReset = (row: StaffRow) => canMutate(row) && row.role !== 'super_admin';
const canUnlock = (row: StaffRow) => canReset(row) && row.is_locked;
const canRevoke = (row: StaffRow) => canMutate(row);
const canDeactivate = (row: StaffRow) => canReset(row) && row.id !== auth.user?.id;

const load = async (nextPage = 1) => {
  loading.value = true;
  page.value = nextPage;
  try {
    const res = await apiClient.get('/staff', {
      params: {
        search: search.value || undefined,
        role: roleFilter.value || undefined,
        status: status.value,
        page: nextPage,
        per_page: 20,
      },
    });
    const payload = res.data?.data;
    rows.value = payload?.data ?? [];
    lastPage.value = payload?.last_page ?? 1;
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Could not load staff.');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  form.name = '';
  form.email = '';
  form.role = creatableRoles.value[0];
  form.assigned_barangay = '';
  form.enforce_mfa = false;
  formOpen.value = true;
};

const openEdit = (row: StaffRow) => {
  editing.value = row;
  form.name = row.name;
  form.email = row.email;
  form.role = row.role === 'super_admin' ? row.role : row.role;
  form.assigned_barangay = row.assigned_barangay || '';
  form.enforce_mfa = !!row.enforce_mfa;
  formOpen.value = true;
};

const save = async () => {
  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
    };
    if (!editingSelfSuperAdmin.value) {
      body.role = form.role;
      body.assigned_barangay = form.role === 'barangay_official' ? form.assigned_barangay : null;
    }
    if (isSuper.value && form.role === 'admin') {
      body.enforce_mfa = form.enforce_mfa;
    }
    if (editing.value) {
      await apiClient.patch(`/staff/${editing.value.id}`, body);
      await toast.success('Account updated.');
    } else {
      const res = await apiClient.post('/staff', body);
      revealedSecret.value = res.data?.data?.temporary_password || '';
      secretOpen.value = !!revealedSecret.value;
      await toast.success('Account created.');
    }
    formOpen.value = false;
    await load(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Save failed.');
  } finally {
    saving.value = false;
  }
};

const confirmReset = async (row: StaffRow) => {
  const alert = await alertController.create({
    header: 'Reset password',
    message: `Generate a temporary password for ${row.email}? All sessions will be revoked.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Reset', handler: () => { void reset(row); } },
    ],
  });
  await alert.present();
};

const reset = async (row: StaffRow) => {
  const remarks = await promptAuditRemarks({
    header: 'Justify password reset',
    message: `Explain why ${row.email} needs a temporary password.`,
  });
  if (!remarks) return;
  try {
    const res = await apiClient.post(`/staff/${row.id}/reset-password`, { audit_remarks: remarks });
    revealedSecret.value = res.data?.data?.temporary_password || '';
    secretOpen.value = !!revealedSecret.value;
    await load(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Reset failed.');
  }
};

const unlock = async (row: StaffRow) => {
  try {
    await apiClient.post(`/staff/${row.id}/unlock`);
    await toast.success('Account unlocked.');
    await load(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Unlock failed.');
  }
};

const revoke = async (row: StaffRow) => {
  try {
    await apiClient.post(`/staff/${row.id}/revoke-sessions`);
    await toast.success('Sessions revoked.');
    await load(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Revoke failed.');
  }
};

const toggleActive = async (row: StaffRow) => {
  if (row.is_active) {
    const remarks = await promptAuditRemarks({
      header: 'Justify deactivation',
      message: `Explain why ${row.email} is being deactivated.`,
    });
    if (!remarks) return;
    try {
      await apiClient.patch(`/staff/${row.id}`, { is_active: false, audit_remarks: remarks });
      await toast.success('Account deactivated.');
      await load(page.value);
    } catch (err: any) {
      await toast.error(err?.response?.data?.message || 'Update failed.');
    }
    return;
  }
  try {
    await apiClient.patch(`/staff/${row.id}`, { is_active: true });
    await toast.success('Account activated.');
    await load(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Update failed.');
  }
};

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(revealedSecret.value);
    await toast.success('Copied.');
  } catch {
    await toast.warning('Copy failed. Select the password manually.');
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
.filter-btn { --background: #1a4731; }
.center-state { display: flex; justify-content: center; padding: 2rem; }
.table-scroll { overflow: auto; background: #fff; border-radius: 8px; }
.excel-table { width: 100%; border-collapse: collapse; }
.excel-table th, .excel-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.85rem; vertical-align: middle; }
.excel-table thead th { background: #1a4731; color: #fff; }
.empty-row { text-align: center; color: #94a3b8; }
.actions { white-space: nowrap; }
.actions button {
  margin-right: 0.35rem; border: 0; background: transparent; color: #1a4731;
  font-weight: 700; cursor: pointer; font-size: 0.78rem;
}
.actions button.danger { color: #b91c1c; }
.pill { font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 999px; }
.pill.ok { background: #dcfce7; color: #166534; }
.pill.off { background: #fee2e2; color: #991b1b; }
.pill.locked { background: #fef3c7; color: #92400e; }
.pager { display: flex; gap: 0.75rem; align-items: center; justify-content: center; padding: 0.8rem; }
.secret {
  font-family: ui-monospace, monospace; font-size: 1.15rem; font-weight: 800;
  letter-spacing: 0.04em; background: #f1f5f9; padding: 0.8rem; border-radius: 8px;
}
.save-btn { --background: #1a4731; margin-top: 1rem; }
</style>
