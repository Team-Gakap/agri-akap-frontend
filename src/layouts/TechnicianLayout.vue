<template>
  <ion-page class="tech-layout">
    <ion-tabs>
      <ion-router-outlet id="tech-content"></ion-router-outlet>

      <ion-tab-bar slot="bottom" class="tech-tabbar">
        <ion-tab-button tab="dashboard" href="/tech/dashboard">
          <ion-icon :icon="homeOutline" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="history" href="/tech/history">
          <ion-icon :icon="cloudUploadOutline" />
          <ion-label>Sync</ion-label>
          <ion-badge v-if="pendingCount" class="sync-badge">{{ pendingCount }}</ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tech/profile">
          <ion-icon :icon="personCircleOutline" />
          <ion-label>Me</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  IonPage, IonTabs, IonTabBar, IonTabButton, IonRouterOutlet,
  IonIcon, IonLabel, IonBadge,
} from '@ionic/vue';
import {
  homeOutline, cloudUploadOutline, personCircleOutline,
} from 'ionicons/icons';
import { useSyncStore } from '@/stores/syncStore';

const syncStore = useSyncStore();
const pendingCount = computed(() => syncStore.pending);

onMounted(() => {
  syncStore.refreshCount();
});
</script>

<style scoped>
.tech-tabbar {
  --background: #ffffff;
  --border: 1px solid #cbd5e1;
  --color: #475569;
  min-height: 64px;
  height: auto;
  padding-bottom: var(--ion-safe-area-bottom, env(safe-area-inset-bottom, 0px));
}

ion-tab-button {
  --color: #475569;
  --color-selected: #1b4d3e;
  font-weight: 700;
  position: relative;
  margin: 6px 8px;
  border-radius: 14px;
}

ion-tab-button.tab-selected {
  background: #dcfce7;
  --color-selected: #1b4d3e;
}

ion-tab-button ion-icon {
  font-size: 24px;
}

ion-tab-button.tab-selected ion-icon {
  color: #1b4d3e;
}

ion-tab-button ion-label {
  font-size: 0.74rem;
  font-weight: 800;
  margin-top: 2px;
}

.sync-badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 22px);
  --background: #ea580c;
  --color: #fff;
  font-weight: 800;
  font-size: 0.62rem;
  padding: 2px 6px;
  min-width: 18px;
}
</style>
