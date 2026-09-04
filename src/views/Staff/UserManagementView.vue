<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <div class="rpt-shell">
        <div class="filter-bar">
          <div class="filter-group grow">
            <label class="filter-label">Search</label>
            <input
              class="filter-input"
              v-model="search"
              type="search"
              placeholder="Name or email"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select class="filter-select" v-model="status">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
              <option value="locked">Locked</option>
            </select>
          </div>
          <ion-button class="filter-btn" @click="openCreate">New account</ion-button>
        </div>

        <div class="segmented" role="tablist" aria-label="Role filters">
          <button
            v-for="tab in roleTabs"
            :key="tab.value"
            type="button"
            role="tab"
            class="seg-btn"
            :class="{ on: roleFilter === tab.value }"
            :aria-selected="roleFilter === tab.value"
            @click="setRoleFilter(tab.value)"
          >
            {{ tab.label }}
            <span class="seg-count">{{ tab.count }}</span>
          </button>
        </div>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
        <div v-else class="table-scroll">
          <table class="excel-table">
            <thead>
              <tr>
                <th>Name &amp; Account</th>
                <th>Role</th>
                <th>Jurisdiction</th>
                <th>Status</th>
                <th>Security / MFA</th>
                <th>Sessions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length">
                <td colspan="7" class="empty-row">No user accounts match these filters.</td>
              </tr>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <div class="account-cell">
                    <span class="account-name">{{ displayName(row) }}</span>
                    <span class="account-email">{{ row.email }}</span>
                  </div>
                </td>
                <td>
                  <span class="role-chip" :class="roleChipClass(row.role)">{{ roleChipLabel(row.role) }}</span>
                </td>
                <td>{{ row.assigned_barangay || '—' }}</td>
                <td>
                  <span class="pill" :class="statusClass(row)">{{ statusText(row) }}</span>
                </td>
                <td>
                  <span class="pill" :class="mfaClass(row)">{{ mfaText(row) }}</span>
                </td>
                <td>
                  <span class="session-text" :class="sessionClass(row)">{{ sessionText(row) }}</span>
                </td>
                <td class="actions">
                  <div class="action-group">
                    <button
                      v-if="canMutate(row)"
                      type="button"
                      class="act-chip"
                      title="Edit account"
                      aria-label="Edit account"
                      @click="openEdit(row)"
                    >
                      <ion-icon :icon="createOutline"></ion-icon>
                      <span>Edit</span>
                    </button>
                    <button
                      v-if="canReset(row)"
                      type="button"
                      class="act-chip"
                      title="Reset password"
                      aria-label="Reset password"
                      @click="confirmReset(row)"
                    >
                      <ion-icon :icon="keyOutline"></ion-icon>
                      <span>Reset Pass</span>
                    </button>
                    <template v-if="canShowOverflow(row)">
                      <button
                        type="button"
                        class="more-btn"
                        :id="moreTriggerId(row.id)"
                        title="More actions"
                        aria-label="More actions"
                      >
                        <ion-icon :icon="ellipsisVertical"></ion-icon>
                      </button>
                      <ion-popover
                        :trigger="moreTriggerId(row.id)"
                        trigger-action="click"
                        side="left"
                        :dismiss-on-select="true"
                      >
                        <ion-content>
                          <ion-list lines="none" class="ctx">
                            <ion-item
                              v-if="canRevoke(row)"
                              button
                              :detail="false"
                              @click="revoke(row)"
                            >
                              <ion-icon :icon="banOutline" slot="start"></ion-icon>
                              <ion-label>Revoke Active Token Sessions</ion-label>
                            </ion-item>
                            <ion-item
                              v-if="canUnlock(row)"
                              button
                              :detail="false"
                              @click="unlock(row)"
                            >
                              <ion-icon :icon="lockOpenOutline" slot="start"></ion-icon>
                              <ion-label>Unlock Account</ion-label>
                            </ion-item>
                            <div
                              v-if="canDeactivate(row) && (canRevoke(row) || canUnlock(row))"
                              class="ctx-divider"
                              role="separator"
                            ></div>
                            <ion-item
                              v-if="canDeactivate(row)"
                              button
                              :detail="false"
                              class="danger"
                              @click="toggleActive(row)"
                            >
                              <ion-icon
                                :icon="row.is_active ? personRemoveOutline : personAddOutline"
                                slot="start"
                              ></ion-icon>
                              <ion-label color="danger">
                                {{ row.is_active ? 'Deactivate Account' : 'Activate Account' }}
                              </ion-label>
                            </ion-item>
                          </ion-list>
                        </ion-content>
                      </ion-popover>
                    </template>
                  </div>
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonSpinner, IonModal, IonList, IonItem, IonInput, IonSelect, IonSelectOption,
  IonToggle, IonIcon, IonLabel, IonPopover,
  alertController,
} from '@ionic/vue';
import {
  banOutline,
  createOutline,
  ellipsisVertical,
  keyOutline,
  lockOpenOutline,
  personAddOutline,
  personRemoveOutline,
} from 'ionicons/icons';
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

type RoleTab = { value: string; label: string; count: number };

const ENCODER_NAME_RE = /^Barangay Encoder\s*[—\-]\s*/i;

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
const roleFilter = ref('technician');
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
const summary = reactive({
  total: 0,
  by_role: {} as Record<string, number>,
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const editingSelfSuperAdmin = computed(
  () => editing.value?.role === 'super_admin' && editing.value?.id === auth.user?.id,
);

const roleTabs = computed<RoleTab[]>(() => {
  const tabs: RoleTab[] = [
    { value: '', label: 'All Accounts', count: summary.total },
  ];
  if (listableRoles.value.includes('barangay_official')) {
    tabs.push({
      value: 'barangay_official',
      label: 'Barangay Encoders',
      count: summary.by_role.barangay_official ?? 0,
    });
  }
  if (listableRoles.value.includes('technician')) {
    tabs.push({
      value: 'technician',
      label: 'Field Technicians',
      count: summary.by_role.technician ?? 0,
    });
  }
  if (listableRoles.value.includes('admin')) {
    tabs.push({
      value: 'admin',
      label: 'MAO Staff',
      count: summary.by_role.admin ?? 0,
    });
  }
  if (listableRoles.value.includes('super_admin')) {
    tabs.push({
      value: 'super_admin',
      label: 'SuperAdmin',
      count: summary.by_role.super_admin ?? 0,
    });
  }
  return tabs;
});

const roleLabel = (role: string) => {
  if (role === 'super_admin') return 'System SuperAdmin';
  if (role === 'admin') return 'MAO Administrator';
  if (role === 'barangay_official') return 'Barangay Encoder';
  return 'Field Technician';
};

const roleChipLabel = (role: string) => {
  if (role === 'super_admin') return 'SuperAdmin';
  if (role === 'admin') return 'MAO Admin';
  if (role === 'barangay_official') return 'Brgy Encoder';
  return 'Field Tech';
};

const roleChipClass = (role: string) => {
  if (role === 'super_admin') return 'role-super';
  if (role === 'admin') return 'role-admin';
  if (role === 'barangay_official') return 'role-encoder';
  return 'role-tech';
};

const displayName = (row: StaffRow) => {
  if (row.role === 'barangay_official') {
    const place = row.assigned_barangay?.trim();
    if (place) return `Encoder — ${place}`;
    if (ENCODER_NAME_RE.test(row.name)) {
      return `Encoder — ${row.name.replace(ENCODER_NAME_RE, '').trim()}`;
    }
  }
  return row.name;
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
  if (row.role === 'super_admin') return 'MFA Active';
  if (row.role !== 'admin') return 'Disabled';
  if (row.mfa_enrolled) return 'MFA Active';
  if (row.enforce_mfa) return 'Required';
  return 'Disabled';
};
const mfaClass = (row: StaffRow) => {
  if (row.role === 'super_admin' || row.mfa_enrolled) return 'ok';
  if (row.role === 'admin' && row.enforce_mfa) return 'locked';
  return 'muted';
};

const sessionCount = (row: StaffRow) => row.tokens_count ?? 0;
const sessionText = (row: StaffRow) => {
  const n = sessionCount(row);
  if (n <= 0) return 'Offline';
  return n === 1 ? '1 Active Device' : `${n} Active Devices`;
};
const sessionClass = (row: StaffRow) => (sessionCount(row) > 0 ? 'online' : 'offline');

const canMutate = (row: StaffRow) => {
  if (row.role === 'super_admin') return row.id === auth.user?.id;
  if (isSuper.value) return true;
  return ['technician', 'barangay_official'].includes(row.role);
};
const canReset = (row: StaffRow) => canMutate(row) && row.role !== 'super_admin';
const canUnlock = (row: StaffRow) => canReset(row) && row.is_locked;
const canRevoke = (row: StaffRow) => canMutate(row);
const canDeactivate = (row: StaffRow) => canReset(row) && row.id !== auth.user?.id;
const canShowOverflow = (row: StaffRow) =>
  canRevoke(row) || canUnlock(row) || canDeactivate(row);

const moreTriggerId = (id: string) => `staff-more-${id}`;

const setRoleFilter = (value: string) => {
  if (roleFilter.value === value) return;
  roleFilter.value = value;
};

const loadSummary = async () => {
  try {
    const res = await apiClient.get('/staff/summary');
    const data = res.data?.data;
    summary.total = data?.total ?? 0;
    summary.by_role = data?.by_role ?? {};
  } catch {
    /* keep last known counts */
  }
};

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

const refresh = async (nextPage = page.value) => {
  await Promise.all([load(nextPage), loadSummary()]);
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
    await refresh(page.value);
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
    await refresh(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Reset failed.');
  }
};

const unlock = async (row: StaffRow) => {
  try {
    await apiClient.post(`/staff/${row.id}/unlock`);
    await toast.success('Account unlocked.');
    await refresh(page.value);
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Unlock failed.');
  }
};

const revoke = async (row: StaffRow) => {
  try {
    await apiClient.post(`/staff/${row.id}/revoke-sessions`);
    await toast.success('Sessions revoked.');
    await refresh(page.value);
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
      await refresh(page.value);
    } catch (err: any) {
      await toast.error(err?.response?.data?.message || 'Update failed.');
    }
    return;
  }
  try {
    await apiClient.patch(`/staff/${row.id}`, { is_active: true });
    await toast.success('Account activated.');
    await refresh(page.value);
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

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void load(1);
  }, 250);
});

watch(status, () => {
  void load(1);
});

watch(roleFilter, () => {
  void load(1);
});

onMounted(() => {
  void loadSummary();
  void load(1);
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.rpt-content { --background: #f4f8f5; }
.rpt-shell { padding: 1rem; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: flex-end; margin-bottom: 0.65rem; }
.filter-group { display: flex; flex-direction: column; gap: 0.2rem; }
.filter-group.grow { flex: 1; min-width: 180px; }
.filter-label { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.filter-input,
.filter-select {
  height: 36px;
  padding: 0 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 0.85rem;
  color: #0f172a;
}
.filter-btn { --background: #1a4731; }

.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 0.85rem;
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
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
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
  min-width: 1.4rem;
  text-align: center;
}
.seg-btn.on .seg-count { background: #c8e6c9; color: #1e7e34; }

.center-state { display: flex; justify-content: center; padding: 2rem; }
.table-scroll { overflow: auto; background: #fff; border-radius: 8px; }
.excel-table { width: 100%; border-collapse: collapse; }
.excel-table th, .excel-table td {
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 0.85rem;
  vertical-align: middle;
}
.excel-table thead th { background: #1a4731; color: #fff; }
.empty-row { text-align: center; color: #94a3b8; }

.account-cell { display: flex; flex-direction: column; gap: 0.12rem; min-width: 12rem; }
.account-name { font-weight: 700; color: #334155; line-height: 1.25; }
.account-email { font-size: 0.78rem; color: #64748b; line-height: 1.2; }

.role-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
.role-chip.role-encoder { background: #dcfce7; color: #166534; }
.role-chip.role-tech { background: #dbeafe; color: #1d4ed8; }
.role-chip.role-admin { background: #1a4731; color: #fff; }
.role-chip.role-super { background: #e2e8f0; color: #334155; }

.pill { font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 999px; }
.pill.ok { background: #dcfce7; color: #166534; }
.pill.off { background: #fee2e2; color: #991b1b; }
.pill.locked { background: #fef3c7; color: #92400e; }
.pill.muted { background: #f1f5f9; color: #64748b; }

.session-text { font-size: 0.82rem; font-weight: 600; }
.session-text.offline { color: #94a3b8; font-weight: 500; }
.session-text.online { color: #16a34a; }

.actions { white-space: nowrap; }
.action-group {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.35rem;
}
.act-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  height: 32px;
  padding: 0 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}
.act-chip ion-icon { font-size: 0.95rem; }
.act-chip:hover {
  border-color: #1a4731;
  color: #1a4731;
  background: #f8fafc;
}
.more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}
.more-btn ion-icon { font-size: 1.1rem; }
.more-btn:hover { background: #f1f5f9; color: #1a4731; }

.ctx { padding: 4px 0; }
.ctx ion-item { --min-height: 38px; font-size: 0.88rem; }
.ctx ion-icon { color: #1a4731; }
.ctx .danger ion-icon,
.ctx .danger ion-label { color: #dc2626; }
.ctx-divider {
  height: 1px;
  margin: 4px 12px;
  background: #e2e8f0;
}

.pager { display: flex; gap: 0.75rem; align-items: center; justify-content: center; padding: 0.8rem; }
.secret {
  font-family: ui-monospace, monospace; font-size: 1.15rem; font-weight: 800;
  letter-spacing: 0.04em; background: #f1f5f9; padding: 0.8rem; border-radius: 8px;
}
.save-btn { --background: #1a4731; margin-top: 1rem; }
</style>
