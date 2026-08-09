<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Subsidy Dispense</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Main form UI — hidden while the camera feed shows through the WebView -->
    <ion-content v-show="!isScanning" class="ion-padding page-bg">
      <div class="hero">
        <div class="icon-wrap">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </div>
        <h2>Scan Farmer QR ID</h2>
        <p>Scan the farmer's RSBSA QR to load their profile, then continue to program release.</p>
      </div>

      <ion-button expand="block" class="scan-btn" :disabled="lookingUp" @click="startScan">
        <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
        Scan Farmer QR
      </ion-button>

      <!-- Manual fallback (web / no-camera devices) -->
      <ion-item v-if="showManualFallback" class="search-item" lines="none">
        <ion-input
          label="RSBSA / Farmer ID (manual)"
          label-placement="stacked"
          placeholder="Type RSBSA or farmer UUID"
          :value="qrSearch"
          @ionInput="onQrInput"
        ></ion-input>
        <ion-button
          slot="end"
          fill="clear"
          :disabled="lookingUp || !qrSearch.trim()"
          @click="fetchFarmerByQr(qrSearch)"
        >
          {{ lookingUp ? '…' : 'Lookup' }}
        </ion-button>
      </ion-item>

      <ion-item v-else class="search-item" lines="none">
        <ion-input
          label="RSBSA / Farmer ID"
          label-placement="stacked"
          placeholder="Filled automatically after scan"
          :value="qrSearch"
          @ionInput="onQrInput"
        ></ion-input>
        <ion-button
          slot="end"
          fill="clear"
          :disabled="lookingUp || !qrSearch.trim()"
          @click="fetchFarmerByQr(qrSearch)"
        >
          {{ lookingUp ? '…' : 'Lookup' }}
        </ion-button>
      </ion-item>

      <ion-card v-if="farmer" class="farmer-card">
        <ion-card-header>
          <ion-card-subtitle>Verified farmer</ion-card-subtitle>
          <ion-card-title>{{ farmerDisplayName }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="detail-row">
            <span>RSBSA</span>
            <strong>{{ farmer.rsbsa_no || farmer.rsbsaNo || '—' }}</strong>
          </div>
          <div class="detail-row">
            <span>Barangay</span>
            <strong>{{ farmer.barangay || farmer.permanent_brgy || '—' }}</strong>
          </div>
          <div class="detail-row">
            <span>Farmer ID</span>
            <strong class="mono">{{ farmer.id }}</strong>
          </div>
          <ion-button expand="block" class="continue-btn" @click="continueToRelease">
            Continue to Program Release
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-note v-else class="placeholder-note">
        Point the camera at the farmer’s RSBSA QR. If the camera is unavailable, use the manual ID field.
      </ion-note>
    </ion-content>

    <!-- Scanning overlay — shown while native camera is active -->
    <div v-if="isScanning" class="scan-overlay">
      <div class="scan-frame" aria-hidden="true"></div>
      <p class="scan-label">Scanning…</p>
      <p class="scan-hint">Align the RSBSA QR inside the frame</p>
      <ion-button class="cancel-btn" fill="solid" color="light" @click="stopScan">
        Cancel
      </ion-button>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonButton, IonIcon, IonNote, IonItem, IonInput, IonCard, IonCardHeader,
  IonCardTitle, IonCardSubtitle, IonCardContent, toastController,
} from '@ionic/vue';
import { qrCodeOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { lookupFarmer } from '@/services/syncService';

const router = useRouter();

const isScanning = ref(false);
const lookingUp = ref(false);
const showManualFallback = ref(!Capacitor.isNativePlatform());
const qrSearch = ref('');
const farmer = ref<any | null>(null);

const farmerDisplayName = computed(() => {
  const f = farmer.value;
  if (!f) return '';
  if (f.full_name) return f.full_name;
  const parts = [f.surname || f.last_name, f.first_name, f.middle_name].filter(Boolean);
  return parts.length ? parts.join(', ') : (f.name || 'Unknown farmer');
});

const toast = async (message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') => {
  const t = await toastController.create({ message, duration: 2400, color, position: 'top' });
  await t.present();
};

const onQrInput = (e: CustomEvent) => {
  qrSearch.value = String(e.detail.value ?? '');
};

const setScannerBackground = (active: boolean) => {
  document.body.classList.toggle('scanner-active', active);
};

const fetchFarmerByQr = async (raw: string) => {
  const value = raw.trim();
  if (!value) return;
  lookingUp.value = true;
  farmer.value = null;
  try {
    const result = await lookupFarmer(value);
    if (!result) {
      await toast('No farmer found for that QR / RSBSA.', 'warning');
      return;
    }
    farmer.value = result;
    qrSearch.value = result.rsbsa_no || result.rsbsaNo || value;
    await toast('Farmer loaded.', 'success');
  } catch (err) {
    console.warn('[AGRI-AKAP] Farmer lookup failed:', err);
    await toast('Lookup failed. Check connection or try again.', 'danger');
  } finally {
    lookingUp.value = false;
  }
};

/** Abort scan UI and restore opaque WebView background. */
const stopScan = async () => {
  try {
    // Best-effort abort for continuous / camera-view scanners
    await BarcodeScanner.stopScan?.();
  } catch {
    // Google Code Scanner may not support stopScan — ignore
  }
  setScannerBackground(false);
  isScanning.value = false;
};

/**
 * Native ML Kit QR scan → bind rawValue into search state → fetch farmer.
 * Web / no-camera: reveal manual ID input instead of crashing.
 */
const startScan = async () => {
  if (isScanning.value) return;

  // Browser / emulator without reliable camera hardware
  if (!Capacitor.isNativePlatform()) {
    console.warn('[AGRI-AKAP] Native BarcodeScanner unavailable on web — showing manual input.');
    showManualFallback.value = true;
    await toast('Camera scanner needs a native build. Enter the RSBSA ID manually.', 'warning');
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      showManualFallback.value = true;
      await toast('Camera permission denied. Enter the RSBSA ID manually.', 'warning');
      return;
    }

    isScanning.value = true;
    setScannerBackground(true);

    const { barcodes } = await BarcodeScanner.scan();
    const raw = barcodes[0]?.rawValue?.trim();

    await stopScan();

    if (!raw) {
      await toast('No QR code detected. Try again or enter the ID manually.', 'warning');
      showManualFallback.value = true;
      return;
    }

    // Auto-fill reactive search state with scanned RSBSA / farmer ID
    qrSearch.value = raw;
    await fetchFarmerByQr(raw);
  } catch (err) {
    console.warn('[AGRI-AKAP] QR scanner failed (web/native):', err);
    await stopScan();
    showManualFallback.value = true;
    await toast('Scanner unavailable. Enter the farmer ID manually below.', 'danger');
  }
};

const continueToRelease = () => {
  const id = farmer.value?.id || qrSearch.value.trim();
  if (!id) return;
  router.push({ path: '/tech/scanner', query: { farmer: id } });
};

onBeforeUnmount(() => {
  void stopScan();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.hero {
  text-align: center;
  margin: 1.5rem 0 1.5rem;
}

.icon-wrap {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  border-radius: 20px;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a4731;
}

.icon-wrap ion-icon {
  font-size: 44px;
}

.hero h2 {
  margin: 0 0 0.5rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #1a4731;
}

.hero p {
  margin: 0 auto;
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.45;
  max-width: 320px;
}

.scan-btn {
  --background: #1a4731;
  --border-radius: 14px;
  min-height: 56px;
  font-size: 1.05rem;
  font-weight: 800;
  text-transform: none;
  margin-bottom: 1rem;
}

.search-item {
  --background: #fff;
  --border-radius: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.farmer-card {
  margin: 0 0 1rem;
  border-radius: 14px;
  border: 1px solid #c5d9cc;
}

.farmer-card ion-card-title {
  color: #1a4731;
  font-weight: 800;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
  font-size: 0.9rem;
  color: #64748b;
}

.detail-row strong {
  color: #1a4731;
  text-align: right;
}

.detail-row strong.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  word-break: break-all;
}

.continue-btn {
  margin-top: 0.75rem;
  --background: #d4af37;
  --color: #1a4731;
  text-transform: none;
  font-weight: 800;
}

.placeholder-note {
  display: block;
  text-align: center;
  font-size: 0.82rem;
  line-height: 1.45;
  padding: 0 0.5rem;
}

/* Floating scan chrome over transparent WebView */
.scan-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1.25rem 3rem;
  pointer-events: none;
  background: transparent;
}

.scan-frame {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  width: min(72vw, 280px);
  height: min(72vw, 280px);
  border: 3px solid #d4af37;
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.scan-label {
  pointer-events: none;
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}

.scan-hint {
  pointer-events: none;
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.cancel-btn {
  pointer-events: auto;
  --border-radius: 14px;
  min-width: 160px;
  font-weight: 800;
  text-transform: none;
}
</style>
