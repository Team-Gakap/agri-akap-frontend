<template>
  <ion-page>
    <ion-split-pane content-id="superadmin-content" when="md" class="responsive-split">
      <super-admin-sidebar />
      <ion-router-outlet id="superadmin-content" />
    </ion-split-pane>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import SuperAdminSidebar from '@/components/SuperAdminSidebar.vue';
</script>
