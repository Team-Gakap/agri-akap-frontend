<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>My Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="profile-bg">
      <!-- Identity Card -->
      <div class="profile-hero">
        <div class="avatar">{{ initials }}</div>
        <h2 class="profile-name">{{ fullName }}</h2>
        <p class="profile-role">{{ roleBadge }}</p>
        <ion-chip :color="syncStore.online ? 'success' : 'warning'" class="status-chip">
          <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
          <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
        </ion-chip>
      </div>

      <!-- Account details -->
      <div class="ion-padding">
        <h3 class="section-head">Account</h3>
        <ion-list class="detail-list" inset>
          <ion-item lines="full">
            <ion-icon :icon="personOutline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <p class="detail-label">Full Name</p>
              <h4 class="detail-value">{{ fullName }}</h4>
            </ion-label>
          </ion-item>
          <ion-item lines="full">
            <ion-icon :icon="mailOutline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <p class="detail-label">Email</p>
              <h4 class="detail-value">{{ email }}</h4>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-icon :icon="shieldCheckmarkOutline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <p class="detail-label">Role</p>
              <h4 class="detail-value">{{ roleBadge }}</h4>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Sync status -->
        <h3 class="section-head mt-4">Sync</h3>
        <ion-list class="detail-list" inset>
          <ion-item lines="none">
            <ion-icon :icon="cloudUploadOutline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <p class="detail-label">Pending items</p>
              <h4 class="detail-value">{{ syncStore.pending }} waiting to sync</h4>
            </ion-label>
            <ion-badge v-if="syncStore.pending > 0" color="warning" slot="end">{{ syncStore.pending }}</ion-badge>
          </ion-item>
        </ion-list>

        <ion-button expand="block" color="danger" class="logout-btn" @click="confirmLogout">
          <ion-icon :icon="logOutOutline" slot="start"></ion-icon>
          Logout
        </ion-button>

        <p class="app-version">AGRI-AKAP · Municipal Agriculture Office, Echague, Isabela</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonChip, IonBadge, IonButton, alertController,
} from '@ionic/vue';
import {
  personOutline, mailOutline, shieldCheckmarkOutline, logOutOutline,
  cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';

const authStore = useAuthStore();
const syncStore = useSyncStore();

const fullName = computed(() => authStore.userName ?? (authStore.user as any)?.name ?? 'Field Staff');
const email = computed(() => (authStore.user as any)?.email ?? '—');

const initials = computed(() => {
  const parts = String(fullName.value).trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'U';
});

const roleBadge = computed(() => {
  const role = authStore.userRole;
  if (role === 'super_admin') return 'System SuperAdmin';
  if (role === 'admin') return 'MAO Administrator';
  if (role === 'barangay_official') return 'Barangay Official';
  return 'Field Technician';
});

const confirmLogout = async () => {
  const alert = await alertController.create({
    header: 'Logout',
    message: 'Are you sure you want to sign out of AGRI-AKAP?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Logout', role: 'destructive', handler: () => authStore.logout() },
    ],
  });
  await alert.present();
};
</script>

<style scoped>
.profile-bg { --background: #f4f8f5; }

.profile-hero {
  background: linear-gradient(135deg, #1a4731, #2a6648);
  color: white;
  padding: 2rem 1.25rem 1.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.9rem;
  font-weight: 900;
  margin-bottom: 0.9rem;
}
.profile-name { font-size: 1.4rem; font-weight: 900; margin: 0 0 4px; }
.profile-role { font-size: 0.85rem; opacity: 0.85; margin: 0 0 0.75rem; }
.status-chip { --background: rgba(255, 255, 255, 0.15); }

.section-head {
  font-size: 0.85rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 0.5rem 0.25rem;
}
.mt-4 { margin-top: 1.5rem; }

.detail-list {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.detail-label { font-size: 0.72rem; color: #94a3b8; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-value { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0; }

.logout-btn { margin-top: 1.75rem; --border-radius: 12px; font-weight: 800; }

.app-version { text-align: center; font-size: 0.72rem; color: #94a3b8; margin-top: 1.25rem; }
</style>
