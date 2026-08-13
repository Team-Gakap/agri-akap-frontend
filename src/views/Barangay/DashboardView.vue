<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding dash-bg">
      <div class="wrapper">
        <h2>Your Barangay</h2>
        <p class="subtitle">
          A quick summary of your area. Use the menu to record planting, pests, harvest, and damage.
        </p>

        <div class="kpi-row">
          <div class="kpi-card">
            <span class="kpi-n">—</span>
            <span class="kpi-l">Farmers (local)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-n">—</span>
            <span class="kpi-l">Planting entries</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-n">—</span>
            <span class="kpi-l">Pest reports</span>
          </div>
          <div class="kpi-card gold">
            <span class="kpi-n">—</span>
            <span class="kpi-l">Pending damage</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
} from '@ionic/vue';
</script>

<style scoped>
.dash-bg { --background: #f4f8f5; }
.wrapper { max-width: 960px; margin: 0 auto; }
h2 { margin: 0 0 4px; font-weight: 800; color: #1a4731; }
.subtitle { margin: 0 0 1.25rem; color: #64748b; font-size: 0.9rem; }
.kpi-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.kpi-card {
  flex: 1;
  min-width: 140px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.1rem;
  text-align: center;
  border-top: 4px solid #1a4731;
}
.kpi-card.gold { border-top-color: #d4af37; }
.kpi-n { display: block; font-size: 1.6rem; font-weight: 900; color: #1a4731; }
.kpi-l { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; margin-top: 4px; font-weight: 600; }
</style>
