<template>
  <ion-page>
    <ion-content class="dash-bg" :fullscreen="true">
      <div class="dash-shell">
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
            <div class="welcome-meta">
              <p class="welcome-role">Field Technician</p>
              <span
                class="status-badge"
                :class="isOnline ? 'is-online' : 'is-offline'"
                role="status"
                :aria-label="isOnline ? 'Online' : 'Offline'"
              >
                <span class="status-dot" aria-hidden="true"></span>
                {{ isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
          </div>
        </header>

        <!-- Primary: Hero Scanner -->
        <ion-card button class="hero-scan" @click="go('/tech/subsidy-dispense')">
          <ion-ripple-effect type="bounded"></ion-ripple-effect>
          <ion-card-content class="hero-scan-content">
            <div class="hero-icon-wrap">
              <ion-icon :icon="qrCodeOutline"></ion-icon>
            </div>
            <h2 class="hero-title">Scan Farmer ID</h2>
            <p class="hero-sub">Verify identity and dispense subsidies.</p>
          </ion-card-content>
        </ion-card>

        <!-- Secondary: Toolkit Grid -->
        <p class="toolkit-label">Field Toolkit</p>
        <ion-grid class="toolkit-grid">
          <ion-row>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/pest-queue')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon pest">
                    <ion-icon :icon="bugOutline"></ion-icon>
                  </div>
                  <h3>Check Pests</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/calamity-queue')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon damage">
                    <ion-icon :icon="thunderstormOutline"></ion-icon>
                  </div>
                  <h3>Check Damage</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/geo-tag')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon geotag">
                    <ion-icon :icon="locationOutline"></ion-icon>
                  </div>
                  <h3>Geo-Tag Farm</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/planting')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon planting">
                    <ion-icon :icon="leafOutline"></ion-icon>
                  </div>
                  <h3>Planting Log</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="6">
              <ion-card button class="tool-card" @click="go('/tech/harvest')">
                <ion-ripple-effect type="bounded"></ion-ripple-effect>
                <ion-card-content class="tool-content">
                  <div class="tool-icon harvest">
                    <ion-icon :icon="basketOutline"></ion-icon>
                  </div>
                  <h3>Harvest Log</h3>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonCard, IonCardContent, IonIcon, IonRippleEffect,
  IonGrid, IonRow, IonCol,
} from '@ionic/vue';
import {
  bugOutline, thunderstormOutline, qrCodeOutline, locationOutline,
  leafOutline, basketOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';

const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();

const firstName = computed(() => {
  const name = authStore.userName || 'Technician';
  return name.split(' ')[0];
});

const isOnline = computed(() => syncStore.online);

const go = (path: string) => router.push(path);
</script>

<style scoped>
.dash-bg {
  --background: #f4f8f5;
}

.dash-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0.65rem 0.75rem 0.5rem;
  box-sizing: border-box;
}

.dash-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
  flex-shrink: 0;
}

.lgu-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  flex-shrink: 0;
}

.welcome {
  min-width: 0;
  flex: 1;
}

.welcome-sub {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.welcome-name {
  margin: 0.1rem 0 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #1a4731;
  line-height: 1.15;
}

.welcome-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.welcome-role {
  margin: 0;
  font-size: 0.8rem;
  color: #d4af37;
  font-weight: 700;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.status-badge.is-online {
  background: #e8f5e9;
  color: #1a4731;
}

.status-badge.is-offline {
  background: #e2e8f0;
  color: #64748b;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge.is-online .status-dot {
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
}

.status-badge.is-offline .status-dot {
  background: #94a3b8;
}

/* ── Hero Scanner ── */
.hero-scan {
  margin: 0 0 0.65rem;
  border-radius: 18px;
  background: #1a4731;
  box-shadow: 0 6px 18px rgba(26, 71, 49, 0.28);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.hero-scan-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.35rem 1rem 1.25rem;
  color: #fff;
}

.hero-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.7rem;
}

.hero-icon-wrap ion-icon {
  font-size: 36px;
  color: #fff;
}

.hero-title {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.hero-sub {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.3;
  max-width: 16rem;
}

/* ── Toolkit Grid ── */
.toolkit-label {
  margin: 0 0 0.4rem 0.15rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.toolkit-grid {
  padding: 0;
  flex: 1;
}

.toolkit-grid ion-row {
  margin: 0 -0.25rem;
}

.toolkit-grid ion-col {
  padding: 0.25rem;
}

.tool-card {
  margin: 0;
  height: 100%;
  min-height: 108px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(26, 71, 49, 0.08);
  position: relative;
  overflow: hidden;
}

.tool-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.9rem 0.5rem;
  min-height: 108px;
  box-sizing: border-box;
}

.tool-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.55rem;
}

.tool-icon ion-icon {
  font-size: 24px;
}

.tool-icon.pest {
  background: #fef9c3;
  color: #ca8a04;
}

.tool-icon.damage {
  background: #fee2e2;
  color: #dc2626;
}

.tool-icon.geotag {
  background: #e0f2f1;
  color: #00695c;
}

.tool-icon.planting {
  background: #dcfce7;
  color: #15803d;
}

.tool-icon.harvest {
  background: #ffedd5;
  color: #c2410c;
}

.tool-content h3 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}
</style>
