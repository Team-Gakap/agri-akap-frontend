<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Give Subsidy</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-show="!isScanning" class="ion-padding page-bg">
      <div class="hero">
        <div class="icon-wrap">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </div>
        <h2>Find Farmer &amp; Release</h2>
        <p>Scan the farmer’s ID, or search by name / RSBSA number.</p>
      </div>

      <ion-button expand="block" class="scan-btn" :disabled="lookingUp" @click="startScan">
        <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
        Scan Farmer QR
      </ion-button>

      <div class="search-box">
        <ion-input
          class="search-input"
          label="Search farmer (name or RSBSA)"
          label-placement="stacked"
          placeholder="Type at least 2 characters…"
          :value="searchQuery"
          @ionInput="onSearchInput"
        ></ion-input>
        <div v-if="searching" class="hint">Searching…</div>
        <ul v-if="searchResults.length" class="suggest">
          <li v-for="f in searchResults" :key="f.id" @click="selectSearchedFarmer(f)">
            <strong>{{ formatName(f) }}</strong>
            <span>{{ f.rsbsa_no || 'No RSBSA' }} · {{ f.permanent_brgy || f.barangay || '—' }}</span>
          </li>
        </ul>
        <p v-else-if="searchQuery.trim().length >= 2 && !searching && !farmer" class="hint">
          No farmers match “{{ searchQuery.trim() }}”.
        </p>
      </div>

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
          <ion-button expand="block" fill="clear" color="medium" @click="clearFarmer">
            Change farmer
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card class="program-card">
        <ion-card-header>
          <ion-card-subtitle>Subsidy program</ion-card-subtitle>
          <ion-card-title>Select campaign</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item class="program-select-item" lines="none">
            <ion-select
              v-model="selectedProgramId"
              placeholder="Choose an active campaign…"
              interface="action-sheet"
            >
              <ion-select-option v-for="p in programs" :key="p.id" :value="p.id">
                {{ p.name || p.program_name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <div v-if="selectedProgram" class="program-details">
            <div class="detail-row">
              <span>Crop</span>
              <strong>{{ selectedProgram.target_crop || selectedProgram.type || '—' }}</strong>
            </div>
            <div class="detail-row">
              <span>Stock remaining</span>
              <strong>{{ selectedProgram.remaining_quantity?.toLocaleString() }} {{ selectedProgram.unit_of_measurement }}</strong>
            </div>
            <div class="detail-row">
              <span>Rate</span>
              <strong>{{ selectedProgram.per_hectare_allocation || selectedProgram.items_per_hectare }} {{ selectedProgram.unit_of_measurement }}/ha</strong>
            </div>
          </div>
          <p v-if="!programs.length" class="hint danger">
            No active subsidy programs. Ask MAO admin to activate a campaign.
          </p>
        </ion-card-content>
      </ion-card>

      <ion-button
        expand="block"
        class="continue-btn"
        :disabled="!farmer || !selectedProgramId || verifying"
        @click="continueToRelease"
      >
        {{ verifying ? 'Checking eligibility…' : 'Continue to Release' }}
      </ion-button>
    </ion-content>

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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonButton, IonIcon, IonInput, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonItem, IonSelect, IonSelectOption, toastController,
} from '@ionic/vue';
import { qrCodeOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { getPrograms, lookupFarmer, searchFarmers } from '@/services/syncService';
import { useDistributionStore } from '@/stores/distributionStore';
import apiClient from '@/utils/axios';

const router = useRouter();
const route = useRoute();
const distributionStore = useDistributionStore();

const isScanning = ref(false);
const lookingUp = ref(false);
const searching = ref(false);
const verifying = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const farmer = ref<any | null>(null);
const programs = ref<any[]>([]);
const selectedProgramId = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const selectedProgram = computed(() =>
  programs.value.find((p) => p.id === selectedProgramId.value) ?? null
);

const formatName = (f: any) => {
  if (!f) return '';
  if (f.full_name) return f.full_name;
  const parts = [f.surname || f.last_name, [f.first_name, f.middle_name].filter(Boolean).join(' ')].filter(Boolean);
  return parts.length ? parts.join(', ') : (f.name || 'Unknown farmer');
};

const farmerDisplayName = computed(() => formatName(farmer.value));

const toast = async (message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') => {
  const t = await toastController.create({ message, duration: 2400, color, position: 'top' });
  await t.present();
};

const onSearchInput = (e: CustomEvent) => {
  const value = String(e.detail.value ?? '');
  searchQuery.value = value;
  if (searchTimer) clearTimeout(searchTimer);
  const term = value.trim();
  if (term.length < 2) {
    searchResults.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await searchFarmers(term);
    } catch {
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }, 280);
};

const applyFarmer = (result: any, typed = '') => {
  farmer.value = result;
  searchQuery.value = formatName(result) || typed;
  searchResults.value = [];
};

const selectSearchedFarmer = (f: any) => {
  applyFarmer(f);
};

const clearFarmer = () => {
  farmer.value = null;
  searchQuery.value = '';
  searchResults.value = [];
};

const fetchFarmerByQr = async (raw: string) => {
  const value = raw.trim();
  if (!value) return;
  lookingUp.value = true;
  farmer.value = null;
  try {
    const result = await lookupFarmer(value);
    if (!result) {
      searchQuery.value = value;
      searchResults.value = await searchFarmers(value);
      await toast(
        searchResults.value.length
          ? 'Pick the matching farmer below.'
          : 'No farmer found for that QR / RSBSA / name.',
        'warning',
      );
      return;
    }
    applyFarmer(result, value);
    await toast('Farmer loaded.', 'success');
  } catch (err) {
    console.warn('[AGRI-AKAP] Farmer lookup failed:', err);
    await toast('Lookup failed. Check connection or try again.', 'danger');
  } finally {
    lookingUp.value = false;
  }
};

const setScannerBackground = (active: boolean) => {
  document.body.classList.toggle('scanner-active', active);
};

const stopScan = async () => {
  try {
    await BarcodeScanner.stopScan?.();
  } catch {
    // ignore
  }
  setScannerBackground(false);
  isScanning.value = false;
};

const startScan = async () => {
  if (isScanning.value) return;

  if (!Capacitor.isNativePlatform()) {
    await toast('Camera scanner needs a native build. Search by name or RSBSA below.', 'warning');
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      await toast('Camera permission denied. Search by name or RSBSA below.', 'warning');
      return;
    }

    isScanning.value = true;
    setScannerBackground(true);

    const { barcodes } = await BarcodeScanner.scan();
    const raw = barcodes[0]?.rawValue?.trim();
    await stopScan();

    if (!raw) {
      await toast('No QR code detected. Try again or search manually.', 'warning');
      return;
    }

    searchQuery.value = raw;
    await fetchFarmerByQr(raw);
  } catch (err) {
    console.warn('[AGRI-AKAP] QR scanner failed (web/native):', err);
    await stopScan();
    await toast('Scanner unavailable. Search by name or RSBSA below.', 'danger');
  }
};

const continueToRelease = async () => {
  if (!farmer.value || !selectedProgramId.value) return;
  const program = selectedProgram.value;
  verifying.value = true;

  try {
    if (program?.source === 'subsidy') {
      const response = await apiClient.post(`/subsidies/${selectedProgramId.value}/verify-farmer`, {
        farmer_id: farmer.value.id,
        rsbsa_no: farmer.value.rsbsa_no || farmer.value.rsbsaNo,
      });
      const data = response.data?.data ?? {};
      distributionStore.setContext({
        farmer_id: data.farmer_id || farmer.value.id,
        program_id: data.program_id || selectedProgramId.value,
        farmer_name: data.farmer_name || farmerDisplayName.value,
        mobile_number: data.mobile_number,
        item_released: data.item_released || program.name,
        unit: data.unit || program.unit_of_measurement,
        total_farm_size: data.total_farm_size || 0,
        eligible_size: data.eligible_size || 0,
        quantity: data.quantity || 0,
        inventory_remaining: data.inventory_remaining ?? program.remaining_quantity,
        plot_lat: data.plot_lat,
        plot_long: data.plot_long,
        beneficiary_id: data.beneficiary_id,
        rsbsa_no: farmer.value.rsbsa_no || farmer.value.rsbsaNo,
        source: 'subsidy',
        offline: false,
      });
      router.push('/tech/release');
      return;
    }

    const response = await apiClient.post('/distributions/verify', {
      farmer_id: farmer.value.id,
      program_id: selectedProgramId.value,
    });
    const data = response.data?.data ?? {};
    distributionStore.setContext({
      farmer_id: data.farmer_id || farmer.value.id,
      program_id: data.program_id || selectedProgramId.value,
      farmer_name: data.farmer_name || farmerDisplayName.value,
      mobile_number: data.mobile_number,
      item_released: data.item_released || program?.name,
      unit: data.unit || program?.unit_of_measurement,
      total_farm_size: data.total_farm_size || 0,
      eligible_size: data.eligible_size || 0,
      quantity: data.quantity || 0,
      inventory_remaining: data.inventory_remaining ?? program?.remaining_quantity,
      plot_lat: data.plot_lat,
      plot_long: data.plot_long,
      rsbsa_no: farmer.value.rsbsa_no || farmer.value.rsbsaNo,
      source: 'program',
      offline: false,
    });
    router.push('/tech/release');
  } catch (err: any) {
    await toast(err?.response?.data?.message || 'Could not verify eligibility.', 'danger');
  } finally {
    verifying.value = false;
  }
};

onMounted(async () => {
  programs.value = await getPrograms();
  if (programs.value.length === 1) selectedProgramId.value = programs.value[0].id;

  const farmerId = String(route.query.farmer || '').trim();
  const rsbsa = String(route.query.rsbsa || '').trim();
  if (farmerId || rsbsa) {
    lookingUp.value = true;
    try {
      if (farmerId) {
        const res = await apiClient.get(`/farmers/${farmerId}`);
        if (res.data?.data) {
          applyFarmer(res.data.data);
          lookingUp.value = false;
          return;
        }
      }
      await fetchFarmerByQr(rsbsa || farmerId);
    } catch {
      if (rsbsa || farmerId) await fetchFarmerByQr(rsbsa || farmerId);
    } finally {
      lookingUp.value = false;
    }
  }
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  void stopScan();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.hero {
  text-align: center;
  margin: 0.75rem 0 1.25rem;
}

.icon-wrap {
  width: 72px;
  height: 72px;
  margin: 0 auto 0.85rem;
  border-radius: 20px;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a4731;
}

.icon-wrap ion-icon { font-size: 40px; }

.hero h2 {
  margin: 0 0 0.4rem;
  font-size: 1.28rem;
  font-weight: 800;
  color: #1a4731;
}

.hero p {
  margin: 0 auto;
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.45;
  max-width: 320px;
}

.scan-btn {
  --background: #1a4731;
  --border-radius: 14px;
  min-height: 52px;
  font-size: 1.02rem;
  font-weight: 800;
  text-transform: none;
  margin-bottom: 0.85rem;
}

.search-box {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.35rem 0.75rem 0.65rem;
  margin-bottom: 1rem;
}

.search-input { --padding-start: 0; }
.hint { margin: 0.25rem 0 0; font-size: 0.8rem; color: #64748b; }
.hint.danger { color: #b91c1c; font-weight: 600; }

.suggest {
  list-style: none;
  margin: 0.4rem 0 0;
  padding: 0;
  max-height: 220px;
  overflow: auto;
}

.suggest li {
  padding: 0.55rem 0.15rem;
  border-top: 1px solid #eef2f0;
  cursor: pointer;
}

.suggest li strong {
  display: block;
  color: #1a4731;
  font-size: 0.92rem;
}

.suggest li span {
  display: block;
  color: #64748b;
  font-size: 0.78rem;
  margin-top: 0.1rem;
}

.farmer-card, .program-card {
  margin: 0 0 1rem;
  border-radius: 14px;
  border: 1px solid #c5d9cc;
}

.farmer-card ion-card-title,
.program-card ion-card-title {
  color: #1a4731;
  font-weight: 800;
  font-size: 1.05rem;
}

.program-select-item {
  --background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.program-details { margin-top: 0.75rem; }

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.45rem;
  font-size: 0.9rem;
  color: #64748b;
}

.detail-row strong {
  color: #1a4731;
  text-align: right;
}

.continue-btn {
  --background: #d4af37;
  --color: #1a4731;
  text-transform: none;
  font-weight: 800;
  min-height: 52px;
  margin-bottom: 1.5rem;
}

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
