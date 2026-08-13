<template>
  <ion-page>
    <ion-split-pane content-id="review-content" when="md" class="responsive-split">
      <ion-menu content-id="review-content" type="overlay">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>
              <div class="brand">
                <span class="brand-name">AGRI-AKAP</span>
                <span class="brand-sub">Barangay Review</span>
              </div>
            </ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list>
            <ion-menu-toggle :auto-hide="false" v-for="(p, i) in pages" :key="i">
              <ion-item
                router-direction="root"
                :router-link="p.url"
                lines="none"
                :detail="false"
                class="sidebar-item"
              >
                <ion-icon slot="start" :icon="p.icon" class="sidebar-icon"></ion-icon>
                <ion-label class="menu-label">{{ p.title }}</ion-label>
              </ion-item>
            </ion-menu-toggle>

            <ion-menu-toggle :auto-hide="false">
              <ion-item button lines="none" :detail="false" class="sidebar-item logout" @click="handleLogout">
                <ion-icon slot="start" :icon="logOutOutline" class="sidebar-icon"></ion-icon>
                <ion-label class="menu-label">Logout</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-list>
        </ion-content>
      </ion-menu>

      <ion-router-outlet id="review-content" />
    </ion-split-pane>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle,
  IonTitle, IonToolbar, IonHeader, IonRouterOutlet, IonSplitPane,
} from '@ionic/vue';
import { shieldCheckmarkOutline, mapOutline, logOutOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

const pages = [
  { title: 'Damage Review', url: '/review/damage-review', icon: shieldCheckmarkOutline },
  { title: 'Farm Map', url: '/review/map', icon: mapOutline },
];

const handleLogout = () => authStore.logout();
</script>

<style scoped>
.brand { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name { font-weight: 800; font-size: 1.05rem; letter-spacing: 0.02em; }
.brand-sub { font-size: 0.68rem; font-weight: 500; opacity: 0.8; }

ion-content { --background: #ffffff; }
.sidebar-item { --background: #ffffff; --border-radius: 10px; margin: 2px 10px; --min-height: 46px; }
.sidebar-item.router-link-active {
  --background: rgba(26, 71, 49, 0.08);
  border-left: 3px solid #d4af37;
}
.sidebar-item.router-link-active .sidebar-icon,
.sidebar-item.router-link-active .menu-label {
  color: #1a4731;
  font-weight: 700;
}
.sidebar-icon { color: var(--mao-text-muted); font-size: 20px; }
.menu-label { font-size: 0.9rem; font-weight: 500; color: var(--mao-text); }
.logout .sidebar-icon, .logout .menu-label { color: var(--ion-color-danger); }

@media (max-width: 700px) {
  ion-menu { --width: 56px !important; --max-width: 56px !important; --border: none !important; border-right: none !important; }
  ion-header, ion-header ion-toolbar, ion-title { display: none !important; }
  .sidebar-item { --padding-start: 0; --inner-padding-end: 0; --min-height: 56px; justify-content: center; margin: 0; }
  .menu-label { display: none !important; }
  .sidebar-icon { font-size: 22px; margin: 0 auto !important; margin-inline-end: 0 !important; }
}
</style>
