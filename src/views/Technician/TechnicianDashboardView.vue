<template>
  <ion-page>
    <ion-content class="dash-bg ion-padding">
      <header class="dash-header">
        <img
          src="@/assets/images/echague-logo.png"
          alt="LGU Echague"
          class="lgu-logo"
          onerror="this.style.display='none'"
        />
        <div class="welcome">
          <p class="welcome-sub">Municipal Agriculture Office · Echague</p>
          <h1 class="welcome-name">Hello, {{ firstName }}</h1>
          <p class="welcome-role">Field Technician</p>
        </div>
      </header>

      <!-- <WeatherWidget use-device-gps /> -->

      <ion-card button class="action-card pest-card" @click="go('/tech/pest-queue')">
        <ion-ripple-effect type="bounded"></ion-ripple-effect>
        <ion-card-content>
          <div class="card-row">
            <div class="icon-wrap pest">
              <ion-icon :icon="bugOutline"></ion-icon>
            </div>
            <div class="card-copy">
              <h2>Check Pests</h2>
              <p>Review pest reports from barangays and check them in the field.</p>
            </div>
            <ion-icon class="chevron" :icon="chevronForwardOutline"></ion-icon>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card button class="action-card calamity-card" @click="go('/tech/calamity-queue')">
        <ion-ripple-effect type="bounded"></ion-ripple-effect>
        <ion-card-content>
          <div class="card-row">
            <div class="icon-wrap calamity">
              <ion-icon :icon="thunderstormOutline"></ion-icon>
            </div>
            <div class="card-copy">
              <h2>Check Calamity Damage</h2>
              <p>Review disaster reports from barangays and check them on site.</p>
            </div>
            <ion-icon class="chevron" :icon="chevronForwardOutline"></ion-icon>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card button class="action-card subsidy-card" @click="go('/tech/subsidy-dispense')">
        <ion-ripple-effect type="bounded"></ion-ripple-effect>
        <ion-card-content>
          <div class="card-row">
            <div class="icon-wrap subsidy">
              <ion-icon :icon="qrCodeOutline"></ion-icon>
            </div>
            <div class="card-copy">
              <h2>Give Subsidy</h2>
              <p>Scan the farmer’s ID card to give seeds or fertilizer.</p>
            </div>
            <ion-icon class="chevron" :icon="chevronForwardOutline"></ion-icon>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card button class="action-card directory-card" @click="go('/tech/farmer-directory')">
        <ion-ripple-effect type="bounded"></ion-ripple-effect>
        <ion-card-content>
          <div class="card-row">
            <div class="icon-wrap directory">
              <ion-icon :icon="peopleOutline"></ion-icon>
            </div>
            <div class="card-copy">
              <h2>Find Farmer</h2>
              <p>Search by name or farmer number.</p>
            </div>
            <ion-icon class="chevron" :icon="chevronForwardOutline"></ion-icon>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonCard, IonCardContent, IonIcon, IonRippleEffect,
} from '@ionic/vue';
import {
  bugOutline, thunderstormOutline, qrCodeOutline, chevronForwardOutline, peopleOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import WeatherWidget from '@/components/WeatherWidget.vue';

const router = useRouter();
const authStore = useAuthStore();

const firstName = computed(() => {
  const name = authStore.userName || 'Technician';
  return name.split(' ')[0];
});

const go = (path: string) => router.push(path);
</script>

<style scoped>
.dash-bg {
  --background: #f4f8f5;
}

.dash-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-top: 0.5rem;
}

.lgu-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  flex-shrink: 0;
}

.welcome-sub {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.welcome-name {
  margin: 0.15rem 0 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #1a4731;
  line-height: 1.2;
}

.welcome-role {
  margin: 0.2rem 0 0;
  font-size: 0.88rem;
  color: #d4af37;
  font-weight: 700;
}

.section-label {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.action-card {
  margin: 0 0 1rem;
  border-radius: 18px;
  box-shadow: 0 4px 14px rgba(26, 71, 49, 0.12);
  position: relative;
  overflow: hidden;
}

.action-card ion-card-content {
  padding: 1.15rem 1rem;
}

.card-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-wrap ion-icon {
  font-size: 32px;
}

.icon-wrap.pest {
  background: #fef9c3;
  color: #ca8a04;
}

.icon-wrap.calamity {
  background: #fee2e2;
  color: #dc2626;
}

.icon-wrap.subsidy {
  background: #e8f5e9;
  color: #1a4731;
}

.icon-wrap.directory {
  background: #fef3c7;
  color: #92400e;
}

.card-copy {
  flex: 1;
  min-width: 0;
}

.card-copy h2 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.25;
}

.card-copy p {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.35;
}

.chevron {
  font-size: 22px;
  color: #94a3b8;
  flex-shrink: 0;
}

.pest-card {
  border-left: 5px solid #ca8a04;
}

.calamity-card {
  border-left: 5px solid #dc2626;
}

.subsidy-card {
  border-left: 5px solid #1a4731;
}

.directory-card {
  border-left: 5px solid #d4af37;
}
</style>
