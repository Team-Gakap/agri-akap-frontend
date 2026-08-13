<template>
  <ion-menu content-id="admin-content" type="overlay">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <div class="brand">
            <span class="brand-name">AGRI-AKAP</span>
            <span class="brand-sub">MAO Admin Console</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="admin-nav-list">
        <ion-menu-toggle :auto-hide="false" v-for="(p, i) in appPages" :key="i">
          <ion-item
            @click="selectedIndex = i"
            router-direction="root"
            :router-link="p.url"
            lines="none"
            :detail="false"
            :class="{ selected: selectedIndex === i }"
            class="sidebar-item"
          >
            <ion-icon
              slot="start"
              :ios="p.iosIcon"
              :md="p.mdIcon"
              class="sidebar-icon"
            ></ion-icon>

            <ion-label class="menu-label">{{ p.title }}</ion-label>

            <ion-badge
              v-if="p.badge && syncStore.pending > 0"
              color="warning"
              slot="end"
            >
              {{ syncStore.pending }}
            </ion-badge>
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
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle,
  IonTitle, IonToolbar, IonHeader, IonBadge,
} from "@ionic/vue";

// Imported the updated, context-accurate icons
import {
  homeOutline, homeSharp, 
  peopleOutline, peopleSharp, 
  idCardOutline, 
  cubeOutline, 
  fileTrayStackedOutline, 
  chatbubbleEllipsesOutline, 
  clipboardOutline, clipboardSharp, 
  documentTextOutline, documentTextSharp,
  cloudyOutline, 
  warningOutline, logOutOutline
} from "ionicons/icons";

import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";

const authStore = useAuthStore();
const syncStore = useSyncStore();
const selectedIndex = ref(0);

interface NavPage {
  title: string;
  url: string;
  iosIcon: string;
  mdIcon: string;
  badge?: boolean;
}

// Strictly noun-based labels and filtered scope
const appPages: NavPage[] = [
  { title: "Dashboard", url: "/admin/dashboard", iosIcon: homeOutline, mdIcon: homeSharp },
  { title: "Farmer Registry", url: "/admin/farmers", iosIcon: peopleOutline, mdIcon: peopleSharp },
  { title: "ID Card Production", url: "/admin/id-issuance", iosIcon: idCardOutline, mdIcon: idCardOutline },
  { title: "Subsidy Campaigns", url: "/admin/subsidies", iosIcon: cubeOutline, mdIcon: cubeOutline },
  { title: "Text Notifications", url: "/admin/broadcasts", iosIcon: chatbubbleEllipsesOutline, mdIcon: chatbubbleEllipsesOutline },
  { title: "Weather", url: "/admin/weather", iosIcon: cloudyOutline, mdIcon: cloudyOutline },
  { title: "Executive Reports", url: "/admin/executive-reporting", iosIcon: documentTextOutline, mdIcon: documentTextSharp },
];

const handleLogout = () => authStore.logout();
</script>

<style scoped>
/* Keeping your existing styles exactly as they were */
.brand {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.brand-name {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
}
.brand-sub {
  font-size: 0.68rem;
  font-weight: 500;
  opacity: 0.8;
}

ion-content {
  --background: #ffffff;
}

.sidebar-item {
  --background: #ffffff;
  --border-radius: 10px;
  margin: 2px 10px;
  --min-height: 46px;
}
.sidebar-icon {
  color: var(--mao-text-muted);
  font-size: 20px;
}
.menu-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--mao-text);
}
.logout .sidebar-icon,
.logout .menu-label {
  color: var(--ion-color-danger);
}

.selected {
  --background: rgba(26, 71, 49, 0.08);
  border-left: 3px solid var(--mao-gold);
}
.selected .menu-label {
  font-weight: 700;
  color: var(--mao-green);
}
.selected .sidebar-icon {
  color: var(--mao-green);
}

@media (max-width: 700px) {
  ion-menu { --width: 56px !important; --max-width: 56px !important; --border: none !important; border-right: none !important; }
  ion-header, ion-header ion-toolbar, ion-title { display: none !important; }
  ion-list { padding: 0; }
  .sidebar-item { --padding-start: 0; --inner-padding-end: 0; --min-height: 56px; justify-content: center; margin: 0; }
  .menu-label { display: none !important; }
  .sidebar-icon { font-size: 22px; margin: 0 auto !important; margin-inline-end: 0 !important; }
  ion-item ion-icon[slot="start"] { margin: 0 auto !important; margin-inline-end: 0 !important; }
}</style>