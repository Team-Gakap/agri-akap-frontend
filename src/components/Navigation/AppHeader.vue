<template>
  <ion-header class="no-print akap-header-wrap">
    <ion-toolbar class="akap-toolbar">
      <ion-buttons slot="start">
        <ion-menu-button class="akap-menu-btn"></ion-menu-button>
      </ion-buttons>

      <ion-title class="page-title-slot">
        <div class="title-wrap">
          <span class="page-title">{{ pageTitle }}</span>
          <span v-if="localityBadge" class="locality-pill">
            <ion-icon :icon="locationOutline" aria-hidden="true"></ion-icon>
            {{ localityBadge }}
          </span>
        </div>
      </ion-title>

      <ion-buttons slot="end" class="tray">
        <div class="status-chip" :class="{ offline: !syncStore.online }">
          <span class="status-dot"></span>
          <span v-if="syncStore.online">Online</span>
          <span v-else>Offline Queue: {{ syncStore.pending }}</span>
        </div>

        <button
          v-if="showAlerts"
          id="akap-alerts-trigger"
          type="button"
          class="icon-btn"
          aria-label="Threat alerts"
          @click="alertsOpen = true"
        >
          <ion-icon :icon="notificationsOutline"></ion-icon>
          <span v-if="threatTotal > 0" class="tray-badge">{{ threatTotal > 99 ? '99+' : threatTotal }}</span>
        </button>

        <button
          id="akap-profile-trigger"
          type="button"
          class="profile-btn"
          aria-label="Account menu"
          aria-haspopup="true"
          @click="profileOpen = true"
        >
          <span class="avatar">{{ initials }}</span>
        </button>
      </ion-buttons>
    </ion-toolbar>
    <slot />
  </ion-header>

  <ion-popover
    trigger="akap-alerts-trigger"
    :is-open="alertsOpen"
    side="bottom"
    alignment="end"
    @didDismiss="alertsOpen = false"
  >
    <div class="popover-card">
      <p class="popover-kicker">Field alerts</p>
      <button type="button" class="popover-row" @click="goAlerts(pestHref)">
        <span>Pest incidents</span>
        <strong>{{ pests }}</strong>
      </button>
      <button type="button" class="popover-row" @click="goAlerts(damageHref)">
        <span>Pending calamity reports</span>
        <strong>{{ calamities }}</strong>
      </button>
      <p v-if="threatTotal === 0" class="popover-empty">No active pest or calamity flags.</p>
    </div>
  </ion-popover>

  <ion-popover
    trigger="akap-profile-trigger"
    :is-open="profileOpen"
    side="bottom"
    alignment="end"
    @didDismiss="profileOpen = false"
  >
    <div class="popover-card profile-menu">
      <button type="button" class="popover-row" @click="go('/change-password')">Account Settings</button>
      <button
        v-if="authStore.isSuperAdmin"
        type="button"
        class="popover-row"
        @click="go('/superadmin/audit-logs')"
      >
        Audit Trail
      </button>
      <button type="button" class="popover-row danger" @click="logout">Logout</button>
    </div>
  </ion-popover>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonIcon, IonPopover,
} from '@ionic/vue';
import { notificationsOutline, refreshOutline, locationOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { usePortalAlerts } from '@/composables/usePortalAlerts';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const { pests, calamities, threatTotal, fetchAlerts } = usePortalAlerts();

const profileOpen = ref(false);
const alertsOpen = ref(false);

const pageTitle = computed(() => String(route.meta.title || 'Portal'));

const localityBadge = computed(() => {
  if (authStore.userRole !== 'barangay_official') return '';
  return authStore.user?.assigned_barangay?.trim() || '';
});

const showAlerts = computed(() =>
  authStore.userRole === 'admin'
  || authStore.userRole === 'barangay_official'
  || (authStore.userRole === 'super_admin' && route.path.startsWith('/admin')),
);

const pestHref = computed(() =>
  authStore.userRole === 'barangay_official'
    ? '/brgy/pest-monitoring'
    : '/admin/reports/pest-surveillance',
);

const damageHref = computed(() =>
  authStore.userRole === 'barangay_official'
    ? '/brgy/calamity-assessment'
    : '/admin/reports/damage-calamity',
);

const displayName = computed(() => authStore.userName || 'MAO User');

const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});

async function refreshTelemetry() {
  await syncStore.recheck();
  await fetchAlerts(true);
  window.dispatchEvent(new Event('akap:refresh'));
}

function go(path: string) {
  profileOpen.value = false;
  alertsOpen.value = false;
  router.push(path);
}

function goAlerts(path: string) {
  alertsOpen.value = false;
  router.push(path);
}

function logout() {
  profileOpen.value = false;
  authStore.logout();
}

onMounted(() => {
  void fetchAlerts();
});
</script>

<style scoped>
.akap-header-wrap {
  box-shadow: none;
}
.akap-header-wrap::after {
  display: none !important;
}
.akap-toolbar {
  --background: #ffffff;
  --color: #0f172a;
  --border-width: 0 0 1px 0;
  --border-color: #E2E8F0;
  --min-height: 64px;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 8px;
  --padding-end: 10px;
  height: 64px;
  min-height: 64px;
  overflow: hidden;
}
.akap-toolbar :deep(.toolbar-container) {
  min-height: 64px;
  height: 64px;
  padding-top: 0;
  padding-bottom: 0;
}
.akap-menu-btn { --color: #1A4731; }
.page-title-slot {
  padding-inline: 0;
  text-align: start;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  padding-inline-start: 0.15rem;
}
.page-title {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}
.locality-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  font-weight: 800;
  color: #1A4731;
  background: #E8F5E9;
  border: 1px solid #cfe3d4;
  border-radius: 999px;
  padding: 0.18rem 0.5rem 0.18rem 0.38rem;
}
.locality-pill ion-icon {
  font-size: 0.78rem;
}

.tray {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-inline-end: 0.2rem;
  margin: 0;
}
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  white-space: nowrap;
}
.status-chip.offline {
  color: #9a3412;
  background: #fff7ed;
  border-color: #fed7aa;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16a34a;
}
.status-chip.offline .status-dot { background: #ea580c; }
.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #fff;
  color: #1A4731;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.15rem;
}
.icon-btn:disabled { opacity: 0.55; cursor: default; }
.tray-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #d97706;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
}
.spin { animation: akap-spin 0.8s linear infinite; }
@keyframes akap-spin { to { transform: rotate(360deg); } }

.profile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #E2E8F0;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-family: inherit;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #1A4731;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popover-card {
  min-width: 220px;
  padding: 0.35rem 0.75rem 0.4rem;
}
.popover-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  color: #1A4731;
}
.popover-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.45rem 0.1rem;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 650;
  color: #334155;
  cursor: pointer;
  text-align: left;
  border-top: 1px solid #E2E8F0;
}
.popover-row.danger { color: #b91c1c; }
.popover-empty {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}
.profile-menu .popover-row:first-of-type { border-top: 0; }

@media (max-width: 900px) {
  .status-chip { display: none; }
}
</style>
