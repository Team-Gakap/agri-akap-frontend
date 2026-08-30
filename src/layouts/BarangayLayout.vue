<template>
  <ion-page>
    <ion-split-pane content-id="brgy-content" when="md" class="responsive-split">
      <app-sidebar portal="barangay" />
      <ion-router-outlet id="brgy-content" />
    </ion-split-pane>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import AppSidebar from '@/components/Navigation/AppSidebar.vue';
</script>
