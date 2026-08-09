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

    <ion-content class="ion-padding page-bg">
      <div class="hero">
        <div class="icon-wrap">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </div>
        <h2>Scan Farmer QR ID</h2>
        <p>Scan the farmer's RSBSA QR to load their profile, then continue to program release.</p>
      </div>

      <ion-button expand="block" class="scan-btn" :disabled="scanning" @click="startQRScanner">
        <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
        {{ scanning ? 'Opening scanner…' : 'Scan Farmer QR' }}
      </ion-button>

      <ion-item class="search-item" lines="none">
        <ion-input
          label="RSBSA / Farmer ID"
          label-placement="stacked"
          placeholder="Or paste / type after scan"
          :value="qrSearch"
          @ionInput="onQrInput"
        ></ion-input>
        <ion-button slot="end" fill="clear" :disabled="lookingUp || !qrSearch.trim()" @click="fetchFarmerByQr(qrSearch)">
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
            <strong>{{ farmer.barangay || '—' }}</strong>
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
        Camera scan fills the search field with the QR payload (RSBSA / UUID) and fetches farmer details instantly.
        On web browsers without native camera, you can type the ID manually.
      </ion-note>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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
import {
  ensureCameraPermission,
  hideScannerBackground,
  showScannerBackground,
} from '@/composables/useNativeHardware';

const router = useRouter();

const scanning = ref(false);
const lookingUp = ref(false);
const qrSearch = ref('');
const farmer = ref<any | null>(null);

const farmerDisplayName = computed(() => {
  const f = farmer.value;
  if (!f) return '';
  if (f.full_name) return f.full_name;
  const parts = [f.last_name, f.first_name, f.middle_name].filter(Boolean);
  return parts.length ? parts.join(', ') : (f.name || 'Unknown farmer');
});

const toast = async (message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') => {
  const t = await toastController.create({ message, duration: 2400, color, position: 'top' });
  await t.present();
};

const onQrInput = (e: CustomEvent) => {
  qrSearch.value = String(e.detail.value ?? '');
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
    await toast('Farmer loaded.', 'success');
  } catch (err) {
    console.warn('[AGRI-AKAP] Farmer lookup failed:', err);
    await toast('Lookup failed. Check connection or try again.', 'danger');
  } finally {
    lookingUp.value = false;
  }
};

/**
 * Native ML Kit QR scan → bind rawValue into search state → fetch farmer.
 * Web fallback: prompt for manual entry (does not crash the app).
 */
const startQRScanner = async () => {
  scanning.value = true;
  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[AGRI-AKAP] BarcodeScanner is native-only; using web prompt fallback.');
      const manual = window.prompt('Enter farmer QR / RSBSA / UUID (web fallback):');
      if (manual?.trim()) {
        qrSearch.value = manual.trim();
        await fetchFarmerByQr(qrSearch.value);
      }
      return;
    }

    const allowed = await ensureCameraPermission();
    if (!allowed) {
      await toast('Camera permission is required to scan farmer QR IDs.', 'warning');
      return;
    }

    hideScannerBackground();
    try {
      const { barcodes } = await BarcodeScanner.scan();
      const raw = barcodes[0]?.rawValue?.trim();
      if (!raw) {
        await toast('No QR code detected. Try again.', 'warning');
        return;
      }
      qrSearch.value = raw;
      await fetchFarmerByQr(raw);
    } finally {
      showScannerBackground();
    }
  } catch (err) {
    console.warn('[AGRI-AKAP] QR scanner failed:', err);
    showScannerBackground();
    await toast('Scanner failed. Check camera permissions or enter the ID manually.', 'danger');
  } finally {
    scanning.value = false;
  }
};

const continueToRelease = () => {
  const id = farmer.value?.id || qrSearch.value.trim();
  if (!id) return;
  router.push({ path: '/tech/scanner', query: { farmer: id } });
};
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
</style>
