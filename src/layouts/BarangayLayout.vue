<template>
  <ion-page>
    <ion-split-pane content-id="brgy-content" when="md" class="responsive-split">
      <ion-menu content-id="brgy-content" type="overlay">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>
              <div class="brand">
                <span class="brand-name">AGRI-AKAP</span>
                <span class="brand-sub">Barangay Portal</span>
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
                :class="{ active: isActive(p.url) }"
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

      <ion-router-outlet id="brgy-content" />
    </ion-split-pane>
  </ion-page>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import {
  IonPage, IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle,
  IonTitle, IonToolbar, IonHeader, IonRouterOutlet, IonSplitPane,
} from '@ionic/vue';
import {
  homeOutline, leafOutline, bugOutline, shieldCheckmarkOutline, logOutOutline,
  flowerOutline, basketOutline, thunderstormOutline, peopleOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const route = useRoute();

const pages = [
  { title: 'Dashboard', url: '/brgy/dashboard', icon: homeOutline },
  { title: 'Farmers', url: '/brgy/farmers', icon: peopleOutline },
  { title: 'Planting Records', url: '/brgy/planting-ledger', icon: leafOutline },
  { title: 'Pest Reports', url: '/brgy/pest-monitoring', icon: bugOutline },
  { title: 'Standing Crops', url: '/brgy/standing-crop', icon: flowerOutline },
  { title: 'Harvest Records', url: '/brgy/harvesting', icon: basketOutline },
  { title: 'Calamity Damage', url: '/brgy/calamity-assessment', icon: thunderstormOutline },
  { title: 'Damage Review', url: '/brgy/damage-review', icon: shieldCheckmarkOutline },
];

const isActive = (url: string) => route.path === url || route.path.startsWith(url + '/');

const handleLogout = () => authStore.logout();
</script>

<style scoped>
.brand { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name { font-weight: 800; font-size: 1.05rem; letter-spacing: 0.02em; }
.brand-sub { font-size: 0.68rem; font-weight: 500; opacity: 0.85; color: #d4af37; }

ion-menu { --background: #ffffff; }
ion-content { --background: #ffffff; }

.sidebar-item {
  --background: #ffffff;
  --border-radius: 10px;
  margin: 2px 10px;
  --min-height: 46px;
}
.sidebar-item.active {
  --background: #e8f5e9;
  border-left: 3px solid #d4af37;
}
.sidebar-item.active .sidebar-icon,
.sidebar-item.active .menu-label {
  color: #1a4731;
  font-weight: 700;
}
.sidebar-icon { color: var(--mao-text-muted, #64748b); font-size: 20px; }
.menu-label { font-size: 0.88rem; font-weight: 500; color: var(--mao-text, #1e293b); }
.logout .sidebar-icon,
.logout .menu-label { color: var(--ion-color-danger); }

@media (max-width: 700px) {
  ion-menu { --width: 56px !important; --max-width: 56px !important; --border: none !important; border-right: none !important; }
  ion-header, ion-header ion-toolbar, ion-title { display: none !important; }
  .sidebar-item { --padding-start: 0; --inner-padding-end: 0; --min-height: 56px; justify-content: center; margin: 0; }
  .menu-label { display: none !important; }
  .sidebar-icon { font-size: 22px; margin: 0 auto !important; margin-inline-end: 0 !important; }
}
</style>
