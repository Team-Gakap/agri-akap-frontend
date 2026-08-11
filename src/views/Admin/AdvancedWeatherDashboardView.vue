<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Precision Weather Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg ion-padding">
      <div class="wrap">
        <div class="header-section">
          <h2>Agro-Meteorology</h2>
          <p>Open-Meteo forecasts for all 64 Echague barangays — ET0, root-zone moisture, and wind for spraying advisories.</p>
        </div>

        <WeatherWidget />

        <ion-card class="guide-card">
          <ion-card-header>
            <ion-card-title>Precision thresholds</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li><strong>Heavy Rain SMS:</strong> precipitation probability ≥ 80% (tomorrow) — routed only to that barangay’s farmers</li>
              <li><strong>Extreme Heat SMS:</strong> max temperature ≥ 38°C</li>
              <li><strong>Spray Drift Advisory:</strong> wind speed &gt; 15 km/h — avoid pesticide spraying</li>
              <li><strong>Crop Water Demand (ET0):</strong> FAO reference evapotranspiration (mm/day)</li>
              <li><strong>Root Zone Moisture:</strong> soil moisture 7–28 cm (volumetric)</li>
            </ul>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
} from '@ionic/vue';
import WeatherWidget from '@/components/WeatherWidget.vue';
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrap { max-width: 900px; margin: 0 auto; padding-bottom: 2rem; }
.header-section { margin-bottom: 1rem; }
.header-section h2 { margin: 0 0 0.35rem; color: #1a4731; font-weight: 800; }
.header-section p { margin: 0; color: #64748b; font-size: 0.92rem; line-height: 1.45; }
.guide-card { border-radius: 14px; border: 1px solid #d1e0d6; }
.guide-card ion-card-title { color: #1a4731; font-weight: 800; font-size: 1.05rem; }
.guide-card ul { margin: 0; padding-left: 1.1rem; color: #334155; font-size: 0.9rem; line-height: 1.55; }
.guide-card li { margin-bottom: 0.4rem; }
</style>
