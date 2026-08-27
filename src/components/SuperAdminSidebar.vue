<template>
  <ion-menu content-id="superadmin-content" type="overlay">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <div class="brand">
            <span class="brand-name">AGRI-AKAP</span>
            <span class="brand-sub">System Governance</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle :auto-hide="false" v-for="(p, i) in pages" :key="p.url">
          <ion-item
            router-direction="root"
            :router-link="p.url"
            lines="none"
            :detail="false"
            class="sidebar-item"
            :class="{ selected: isActive(p.url) }"
          >
            <ion-icon slot="start" :icon="p.icon" class="sidebar-icon"></ion-icon>
            <ion-label class="menu-label">{{ p.title }}</ion-label>
          </ion-item>
        </ion-menu-toggle>

        <ion-menu-toggle :auto-hide="false">
          <ion-item
            button
            lines="none"
            :detail="false"
            class="sidebar-item"
            @click="goMao"
          >
            <ion-icon slot="start" :icon="briefcaseOutline" class="sidebar-icon"></ion-icon>
            <ion-label class="menu-label">MAO Operations</ion-label>
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
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle,
  IonTitle, IonToolbar, IonHeader,
} from "@ionic/vue";
import {
  homeOutline, peopleOutline, documentTextOutline, briefcaseOutline, logOutOutline,
} from "ionicons/icons";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const pages = [
  { title: "Dashboard", url: "/superadmin/dashboard", icon: homeOutline },
  { title: "User Accounts", url: "/superadmin/users", icon: peopleOutline },
  { title: "Audit Logs", url: "/superadmin/audit-logs", icon: documentTextOutline },
];

const currentPath = computed(() => route.path);

function isActive(url: string) {
  if (url === "/superadmin/dashboard") return currentPath.value === url;
  return currentPath.value.startsWith(url);
}

const goMao = () => router.push("/admin/dashboard");
const handleLogout = () => authStore.logout();
</script>

<style scoped>
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
ion-content { --background: #ffffff; }
.sidebar-item {
  --background: #ffffff;
  --border-radius: 10px;
  margin: 2px 10px;
  --min-height: 46px;
}
.sidebar-icon { color: var(--mao-text-muted); font-size: 20px; }
.menu-label { font-size: 0.9rem; font-weight: 500; color: var(--mao-text); }
.logout .sidebar-icon, .logout .menu-label { color: var(--ion-color-danger); }
.selected {
  --background: rgba(26, 71, 49, 0.08);
  border-left: 3px solid var(--mao-gold);
}
.selected .menu-label { font-weight: 700; color: var(--mao-green); }
.selected .sidebar-icon { color: var(--mao-green); }
</style>
