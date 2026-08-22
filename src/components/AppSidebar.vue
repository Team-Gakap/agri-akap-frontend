<template>
  <ion-menu content-id="admin-content" type="overlay">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <div class="brand">
            <span class="brand-name">AGRI-AKAP</span>
            <span class="brand-sub">Municipal Agriculture Office</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="admin-nav-list">
        <!-- Regular nav items (all except Reports) -->
        <ion-menu-toggle :auto-hide="false" v-for="(p, i) in mainPages" :key="i">
          <ion-item
            @click="selectedIndex = i"
            router-direction="root"
            :router-link="p.url"
            lines="none"
            :detail="false"
            :class="{ selected: selectedIndex === i }"
            class="sidebar-item"
          >
            <ion-icon slot="start" :ios="p.iosIcon" :md="p.mdIcon" class="sidebar-icon"></ion-icon>
            <ion-label class="menu-label">{{ p.title }}</ion-label>
            <ion-badge v-if="p.badge && syncStore.pending > 0" color="warning" slot="end">
              {{ syncStore.pending }}
            </ion-badge>
          </ion-item>
        </ion-menu-toggle>

        <!-- Reports accordion -->
        <ion-accordion-group :value="reportsExpanded ? 'reports' : ''" @ionChange="onAccordionChange">
          <ion-accordion value="reports">
            <ion-item slot="header" lines="none" class="sidebar-item accordion-header" :class="{ 'reports-active': isOnReports }">
              <ion-icon slot="start" :icon="documentTextOutline" class="sidebar-icon"></ion-icon>
              <ion-label class="menu-label">Reports</ion-label>
            </ion-item>

            <div slot="content" class="reports-children">
              <ion-menu-toggle :auto-hide="false" v-for="rp in reportPages" :key="rp.url">
                <ion-item
                  router-direction="root"
                  :router-link="rp.url"
                  lines="none"
                  :detail="false"
                  :class="{ 'report-selected': currentPath === rp.url }"
                  class="sidebar-item report-child"
                >
                  <ion-icon slot="start" :icon="chevronForwardOutline" class="sidebar-icon child-icon"></ion-icon>
                  <ion-label class="menu-label child-label">{{ rp.title }}</ion-label>
                </ion-item>
              </ion-menu-toggle>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <!-- Logout -->
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
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle,
  IonTitle, IonToolbar, IonHeader, IonBadge, IonAccordionGroup, IonAccordion,
} from "@ionic/vue";

import {
  homeOutline, homeSharp,
  peopleOutline, peopleSharp,
  idCardOutline,
  cubeOutline,
  chatbubbleEllipsesOutline,
  documentTextOutline, documentTextSharp,
  cloudyOutline,
  earthOutline,
  chevronForwardOutline,
  logOutOutline,
} from "ionicons/icons";

import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";

const authStore = useAuthStore();
const syncStore = useSyncStore();
const route = useRoute();

const selectedIndex = ref(0);

interface NavPage {
  title: string;
  url: string;
  iosIcon: string;
  mdIcon: string;
  badge?: boolean;
}

const mainPages: NavPage[] = [
  { title: "Dashboard",          url: "/admin/dashboard",   iosIcon: homeOutline,                  mdIcon: homeSharp },
  { title: "Farmer Registry",    url: "/admin/farmers",     iosIcon: peopleOutline,                mdIcon: peopleSharp },
  { title: "ID Card Production", url: "/admin/id-issuance", iosIcon: idCardOutline,                mdIcon: idCardOutline },
  { title: "Subsidy Campaigns",  url: "/admin/subsidies",   iosIcon: cubeOutline,                  mdIcon: cubeOutline },
  { title: "Text Notifications", url: "/admin/broadcasts",  iosIcon: chatbubbleEllipsesOutline,    mdIcon: chatbubbleEllipsesOutline },
  { title: "Weather",            url: "/admin/weather",     iosIcon: cloudyOutline,                mdIcon: cloudyOutline },
  { title: "Climate GIS",        url: "/admin/weather/climate-hub", iosIcon: earthOutline,          mdIcon: earthOutline },
];

const reportPages = [
  { title: "Subsidy Distribution",  url: "/admin/reports/subsidies" },
  { title: "Crop Production",       url: "/admin/reports/crop-production" },
  { title: "Standing Crop",         url: "/admin/reports/standing-crop" },
  { title: "Pest Surveillance",     url: "/admin/reports/pest-surveillance" },
  { title: "Damage & Calamity",     url: "/admin/reports/damage-calamity" },
];

const currentPath = computed(() => route.path);
const isOnReports = computed(() => route.path.startsWith("/admin/reports"));
const reportsExpanded = ref(isOnReports.value);

watch(isOnReports, (val) => {
  if (val) reportsExpanded.value = true;
});

function onAccordionChange(e: CustomEvent) {
  reportsExpanded.value = e.detail.value === "reports";
}

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

/* Accordion header when reports section is active */
.accordion-header.reports-active {
  --background: rgba(26, 71, 49, 0.08);
  border-left: 3px solid var(--mao-gold);
}
.accordion-header.reports-active .menu-label {
  font-weight: 700;
  color: var(--mao-green);
}
.accordion-header.reports-active .sidebar-icon {
  color: var(--mao-green);
}

/* Child report items */
.reports-children {
  background: #f7faf8;
  border-left: 2px solid #d1e0d6;
  margin: 0 10px 4px 20px;
  border-radius: 0 0 8px 8px;
}
.report-child {
  margin: 1px 4px;
  --min-height: 40px;
  --background: transparent;
}
.child-icon {
  font-size: 14px;
  color: #94a3b8;
}
.child-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: #374151;
}

.report-selected {
  --background: rgba(26, 71, 49, 0.10) !important;
}
.report-selected .child-label {
  font-weight: 700;
  color: var(--mao-green) !important;
}
.report-selected .child-icon {
  color: var(--mao-gold) !important;
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
  .reports-children { display: none !important; }
}
</style>
