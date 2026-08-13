<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Give Subsidy</ion-title>
        <ion-buttons slot="end">
          <ion-chip :color="syncStore.online ? 'light' : 'warning'" style="--background:rgba(255,255,255,0.15);">
            <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
            <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="scan-bg ion-padding">

      <!-- STATE 1: PROGRAM SELECTION + SCAN -->
      <div v-if="!scanResult" class="setup-container">

        <!-- Program Selection -->
        <ion-card class="program-card">
          <ion-card-header>
            <ion-card-title class="step-label">Step 1 — Select Program</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item class="program-select-item">
              <ion-select
                v-model="selectedProgramId"
                placeholder="Choose an active campaign..."
                @ionChange="onProgramChange"
              >
                <ion-select-option v-for="p in programs" :key="p.id" :value="p.id">
                  {{ p.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Selected program details -->
            <div v-if="selectedProgram" class="program-details">
              <div class="pd-row">
                <span class="pd-label">Type</span>
                <ion-badge color="primary">{{ selectedProgram.type }}</ion-badge>
              </div>
              <div class="pd-row">
                <span class="pd-label">Inventory Remaining</span>
                <strong>{{ selectedProgram.remaining_quantity?.toLocaleString() }} {{ selectedProgram.unit_of_measurement }}</strong>
              </div>
              <div class="pd-row">
                <span class="pd-label">Allocation Rate</span>
                <strong>{{ selectedProgram.per_hectare_allocation }} {{ selectedProgram.unit_of_measurement }}/ha</strong>
              </div>
              <div class="pd-row">
                <span class="pd-label">Valid Until</span>
                <strong>{{ selectedProgram.end_date }}</strong>
              </div>
              <ion-progress-bar
                :value="(selectedProgram.remaining_quantity / selectedProgram.total_quantity) || 0"
                :color="remainingPercent < 20 ? 'danger' : 'success'"
              ></ion-progress-bar>
              <p class="pd-pct">{{ remainingPercent }}% stock remaining</p>
            </div>

            <div v-if="!programs.length" class="no-programs">
              No active programs available{{ !syncStore.online ? ' (offline cache empty)' : '' }}
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Scan Button -->
        <div class="action-wrapper">
          <ion-button
            expand="block"
            size="large"
            class="scan-btn"
            :disabled="!selectedProgramId"
            @click="startScan"
          >
            <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
            TAP TO SCAN FARMER ID
          </ion-button>
          <p class="helper-text" v-if="!selectedProgramId">Select a program to enable scanning.</p>
        </div>
      </div>

      <!-- STATE 2: REJECTION (successful verifies route to the Release view) -->
      <div v-if="scanResult" class="result-container animation-fade-in">
        <ion-card color="danger">
          <ion-card-header>
            <ion-icon :icon="warningOutline" class="result-icon"></ion-icon>
            <ion-card-title class="text-white">Verification Failed</ion-card-title>
          </ion-card-header>
          <ion-card-content class="text-white">
            <p class="error-msg">{{ scanResult.message }}</p>
            <p v-if="scanResult.data?.claimed_at" class="claimed-at">
              Already claimed on: {{ new Date(scanResult.data.claimed_at).toLocaleString() }}
            </p>
          </ion-card-content>
        </ion-card>

        <ion-button expand="block" fill="outline" class="mt-4" @click="resetScanner">
          <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
          Scan Next Farmer
        </ion-button>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonItem, IonChip, IonLabel, IonBadge, IonProgressBar,
  toastController,
} from '@ionic/vue';
import {
  qrCodeOutline, warningOutline,
  cloudDoneOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/axios';
import { useSyncStore } from '@/stores/syncStore';
import { useDistributionStore } from '@/stores/distributionStore';
import { getPrograms, isOnline } from '@/services/syncService';

const router = useRouter();
const syncStore = useSyncStore();
const distributionStore = useDistributionStore();
const selectedProgramId = ref('');
const scanResult = ref<any>(null);
const programs = ref<any[]>([]);

const selectedProgram = computed(() =>
  programs.value.find(p => p.id === selectedProgramId.value) ?? null
);

const remainingPercent = computed(() => {
  if (!selectedProgram.value?.total_quantity) return 0;
  return Math.round((selectedProgram.value.remaining_quantity / selectedProgram.value.total_quantity) * 100);
});

const onProgramChange = () => { scanResult.value = null; };

onMounted(async () => {
  programs.value = await getPrograms();
});

const showToast = async (msg: string, color: 'warning' | 'danger' = 'warning') => {
  const t = await toastController.create({ message: msg, duration: 3000, color, position: 'top' });
  await t.present();
};

const startScan = async () => {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      await showToast('Camera permission is required to scan farmer IDs.', 'warning');
      return;
    }
    const { barcodes } = await BarcodeScanner.scan();
    if (barcodes.length > 0 && barcodes[0].rawValue) {
      await verifyFarmer(barcodes[0].rawValue);
    }
  } catch {
    await showToast('Scanner failed to start. Check camera permissions in device settings.', 'danger');
  }
};

/**
 * No-write eligibility check. On success, stash the allocation preview and
 * route to the Release view where the technician captures photo + GPS.
 * Offline: skip verify and carry minimal context (verified on sync).
 */
const verifyFarmer = async (farmerUuid: string) => {
  const uuid = farmerUuid.trim();
  if (!uuid) {
    scanResult.value = { status: 'error', message: 'No Farmer ID detected. Please scan again.' };
    return;
  }
  if (!selectedProgramId.value) {
    scanResult.value = { status: 'error', message: 'Please select an active program first.' };
    return;
  }

  const program = selectedProgram.value;

  // OFFLINE: cannot verify against the server. Carry minimal context and let
  // the Release view queue the claim; eligibility is enforced on sync.
  if (!isOnline()) {
    distributionStore.setContext({
      farmer_id: uuid,
      program_id: selectedProgramId.value,
      farmer_name: '',
      item_released: program?.name ?? '',
      unit: program?.unit_of_measurement ?? '',
      total_farm_size: 0,
      eligible_size: 0,
      quantity: 0,
      inventory_remaining: program?.remaining_quantity ?? 0,
      offline: true,
    });
    router.push('/tech/release');
    return;
  }

  try {
    const response = await apiClient.post('/distributions/verify', {
      farmer_id: uuid,
      program_id: selectedProgramId.value,
    });
    const data = response.data?.data ?? {};
    distributionStore.setContext({
      farmer_id: data.farmer_id,
      program_id: data.program_id,
      farmer_name: data.farmer_name,
      mobile_number: data.mobile_number,
      item_released: data.item_released,
      unit: data.unit,
      total_farm_size: data.total_farm_size,
      eligible_size: data.eligible_size,
      quantity: data.quantity,
      inventory_remaining: data.inventory_remaining,
      plot_lat: data.plot_lat,
      plot_long: data.plot_long,
      offline: false,
    });
    router.push('/tech/release');
  } catch (err: any) {
    if (!err.response) {
      // Network dropped mid-request: fall back to the offline release path.
      distributionStore.setContext({
        farmer_id: uuid,
        program_id: selectedProgramId.value,
        farmer_name: '',
        item_released: program?.name ?? '',
        unit: program?.unit_of_measurement ?? '',
        total_farm_size: 0,
        eligible_size: 0,
        quantity: 0,
        inventory_remaining: program?.remaining_quantity ?? 0,
        offline: true,
      });
      router.push('/tech/release');
      return;
    }
    scanResult.value = err.response?.data ?? { status: 'error', message: 'Network error. Could not reach verification server.' };
  }
};

const resetScanner = () => {
  scanResult.value = null;
};
</script>

<style scoped>
.scan-bg { --background: #f4f8f5; }
.setup-container { max-width: 680px; margin: 0 auto; }
.program-card { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.step-label { font-size: 1rem; color: #1a4731; font-weight: 800; }
.program-select-item { --background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0; }

.program-details { margin-top: 1rem; background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }
.pd-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 0.9rem; }
.pd-label { color: #64748b; }
.pd-pct { font-size: 0.78rem; color: #64748b; text-align: right; margin: 4px 0 0; }

.no-programs { color: var(--ion-color-danger); padding: 12px 0; font-size: 0.9rem; font-weight: 600; }

.action-wrapper { margin-top: 2rem; text-align: center; }
.scan-btn { --border-radius: 14px; height: 90px; font-size: 1.1rem; font-weight: 800; letter-spacing: 1.5px; }
.helper-text { color: var(--ion-color-medium); font-size: 0.88rem; margin-top: 0.75rem; }

.result-container { max-width: 680px; margin: 2rem auto 0; }
.result-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.text-white { color: white !important; }
.farmer-name-result { font-weight: 900; font-size: 1.5rem; margin: 0 0 1rem; }
.detail-row-r { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.95rem; }
.dispense-box { background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.6); border-radius: 10px; padding: 1.2rem; margin-top: 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.dispense-label { font-size: 0.8rem; letter-spacing: 2px; opacity: 0.85; }
.dispense-qty { font-size: 3rem; font-weight: 900; line-height: 1; }
.dispense-unit { font-size: 1rem; opacity: 0.85; }
.remaining-note { font-size: 0.82rem; margin-top: 1rem; opacity: 0.85; }
.error-msg { font-size: 1.1rem; line-height: 1.4; font-weight: 600; }
.claimed-at { font-size: 0.85rem; margin-top: 0.75rem; opacity: 0.85; }
.mt-4 { margin-top: 1.5rem; }
.animation-fade-in { animation: fadeIn 0.35s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
</style>
