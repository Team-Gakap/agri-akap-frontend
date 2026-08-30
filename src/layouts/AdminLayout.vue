<template>
  <ion-page>
    <ion-split-pane content-id="admin-content" when="md" class="responsive-split">
      <app-sidebar portal="admin" />
      <ion-router-outlet id="admin-content" />
    </ion-split-pane>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import AppSidebar from '@/components/Navigation/AppSidebar.vue';
</script>
