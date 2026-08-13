<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Farmer Training</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <p class="lede">Record planting and pest visits while you are in the field.</p>

      <h3 class="section">Field Forms</h3>
      <ion-card class="hub-card" button @click="router.push('/tech/planting-log')">
        <ion-card-content>
          <div class="hub-row">
            <ion-icon :icon="leafOutline" class="hub-icon"></ion-icon>
            <div>
              <h2>Planting Records</h2>
              <p>Rice or corn · status · water source</p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="hub-card" button @click="router.push('/tech/pest-validation')">
        <ion-card-content>
          <div class="hub-row">
            <ion-icon :icon="bugOutline" class="hub-icon pest"></ion-icon>
            <div>
              <h2>Check Pests</h2>
              <p>Damage, location, and photo</p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <h3 class="section">Coming next</h3>
      <ion-card class="hub-card muted">
        <ion-card-content>
          <h2>Seminars &amp; Livestock</h2>
          <p>Attendance QR scanner and livestock dispersal ledger will follow.</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonIcon,
} from '@ionic/vue';
import { leafOutline, bugOutline } from 'ionicons/icons';

const router = useRouter();
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.lede { margin: 0 0 1rem; color: #64748b; font-size: 0.9rem; line-height: 1.4; }
.section {
  margin: 0.5rem 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.hub-card {
  margin: 0 0 0.75rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.hub-card.muted { opacity: 0.85; background: #f8fafc; }
.hub-row { display: flex; align-items: center; gap: 0.85rem; }
.hub-icon {
  font-size: 1.75rem;
  color: #1a4731;
  background: #e8f5e9;
  padding: 0.55rem;
  border-radius: 12px;
}
.hub-icon.pest { color: #c2410c; background: #fff7ed; }
.hub-card h2 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #0f172a; }
.hub-card p { margin: 0; font-size: 0.82rem; color: #94a3b8; }
</style>
