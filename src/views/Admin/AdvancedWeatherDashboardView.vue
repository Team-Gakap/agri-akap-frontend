<template>
  <ion-page>
    <AppHeader />

    <ion-content class="page-bg ion-padding">
      <div class="wrap">
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
import AppHeader from '@/components/Navigation/AppHeader.vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
} from '@ionic/vue';
import WeatherWidget from '@/components/WeatherWidget.vue';
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrap { max-width: 900px; margin: 0 auto; padding-bottom: 2rem; }
.guide-card { border-radius: 14px; border: 1px solid #d1e0d6; }
.guide-card ion-card-title { color: #1a4731; font-weight: 800; font-size: 1.05rem; }
.guide-card ul { margin: 0; padding-left: 1.1rem; color: #334155; font-size: 0.9rem; line-height: 1.55; }
.guide-card li { margin-bottom: 0.4rem; }
</style>
