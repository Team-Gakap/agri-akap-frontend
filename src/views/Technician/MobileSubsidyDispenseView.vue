<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <AppHeader v-if="!embedded && isAdminOverride" />
    <ion-header v-else-if="!embedded">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Give Subsidy</ion-title>
      </ion-toolbar>
    </ion-header>

    <component :is="embedded ? 'div' : IonContent" v-show="!isScanning" class="ion-padding page-bg">
      <div class="hero">
        <div v-if="isAdminOverride" class="admin-banner">
          <strong>Admin Override — Manual Subsidy Dispense</strong>
          <p>Fallback for when QR scanning is unavailable. Release subsidies on behalf of field technicians.</p>
        </div>
        <div class="icon-wrap">
          <ion-icon :icon="qrCodeOutline"></ion-icon>
        </div>
        <h2>{{ hasProgram ? 'Scan &amp; Release' : 'Choose a campaign' }}</h2>
        <p v-if="!hasProgram">Pick the subsidy program first. After that, scan farmers one after another.</p>
        <p v-else>Scan the next farmer’s ID, or search by name / RSBSA. The campaign stays selected.</p>
      </div>

      <ion-card v-if="showProgramPicker" class="program-card">
        <ion-card-header>
          <ion-card-subtitle>Subsidy program</ion-card-subtitle>
          <ion-card-title>Select campaign</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item class="program-select-item" lines="none">
            <ion-select
              :value="selectedProgramId"
              placeholder="Choose an active campaign…"
              interface="action-sheet"
              @ionChange="onProgramChange"
            >
              <ion-select-option v-for="p in programs" :key="p.id" :value="p.id">
                {{ programOptionLabel(p) }}
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
            <div v-if="selectedProgram.secondary_unit" class="detail-row">
              <span>Stock remaining ({{ selectedProgram.secondary_unit }})</span>
              <strong>{{ selectedProgram.secondary_remaining_quantity?.toLocaleString() }} {{ selectedProgram.secondary_unit }}</strong>
            </div>
            <div class="detail-row">
              <span>Rate</span>
              <strong>
                {{ selectedProgram.per_hectare_allocation || selectedProgram.items_per_hectare }} {{ selectedProgram.unit_of_measurement }}/ha
                <template v-if="selectedProgram.secondary_unit"> + {{ selectedProgram.secondary_items_per_hectare }} {{ selectedProgram.secondary_unit }}/ha</template>
              </strong>
            </div>
          </div>
          <p v-if="!programs.length" class="hint danger">
            No active subsidy programs. Ask MAO admin to activate a campaign.
          </p>
        </ion-card-content>
      </ion-card>

      <button
        v-else-if="selectedProgram"
        type="button"
        class="program-chip"
        @click="changingProgram = true"
      >
        <span class="chip-label">Campaign</span>
        <strong>{{ programOptionLabel(selectedProgram) }}</strong>
        <span class="chip-change">Change</span>
      </button>

      <ion-card v-if="lastClaim" class="result-card" :class="{ offline: lastClaim.offline }">
        <ion-card-content>
          <div class="receipt-status">
            <ion-icon :icon="lastClaim.offline ? cloudOfflineOutline : checkmarkCircleOutline"></ion-icon>
            <span>{{ lastClaim.offline ? 'Queued offline' : 'Released' }}</span>
          </div>
          <h2 class="farmer-name-result">{{ lastClaim.farmerName }}</h2>
          <p class="receipt-id">
            {{ lastClaim.rsbsa || 'No RSBSA' }}
            <template v-if="lastClaim.barangay"> · {{ lastClaim.barangay }}</template>
          </p>
          <div v-if="lastClaim.campaign" class="detail-row">
            <span>Campaign</span>
            <strong>{{ lastClaim.campaign }}</strong>
          </div>
          <div v-if="showFarmSize" class="detail-row">
            <span>Eligible area</span>
            <strong>
              {{ formatHa(lastClaim.eligibleSize) }} ha
              <template v-if="lastClaim.totalFarmSize"> / {{ formatHa(lastClaim.totalFarmSize) }} ha farm</template>
            </strong>
          </div>
          <div v-if="hasDispensedAmount" class="dispense-box">
            <span class="dispense-label">Dispensed</span>
            <span class="dispense-qty">{{ dispensedLabel }}</span>
            <span v-if="secondaryDispensedLabel" class="dispense-qty-secondary">{{ secondaryDispensedLabel }}</span>
          </div>
          <p v-else-if="lastClaim.offline" class="receipt-pending">
            Eligibility and quantity confirm when this syncs.
          </p>
          <div v-if="inventoryPrimaryLabel" class="detail-row">
            <span>Inventory remaining</span>
            <strong>{{ inventoryPrimaryLabel }}</strong>
          </div>
          <div v-if="inventorySecondaryLabel" class="detail-row">
            <span>Inventory remaining</span>
            <strong>{{ inventorySecondaryLabel }}</strong>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-button
        expand="block"
        class="scan-btn"
        :disabled="!hasProgram || lookingUp || claiming"
        @click="startScan"
      >
        <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
        {{ claiming ? 'Releasing…' : lookingUp ? 'Looking up farmer…' : 'Scan Farmer QR' }}
      </ion-button>

      <div class="search-box" :class="{ disabled: !hasProgram || claiming }">
        <ion-input
          class="search-input"
          label="Search farmer (name or RSBSA)"
          label-placement="stacked"
          placeholder="Type at least 2 characters…"
          :value="searchQuery"
          :disabled="!hasProgram || claiming"
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

      <ion-card v-if="farmer && claiming" class="farmer-card">
        <ion-card-header>
          <ion-card-subtitle>Releasing</ion-card-subtitle>
          <ion-card-title>{{ farmerDisplayName }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="hint">Checking eligibility and recording the claim…</p>
        </ion-card-content>
      </ion-card>

      <div v-if="isRffaBlocked" class="rffa-lock-banner">
        <ion-icon :icon="alertCircleOutline" class="lock-icon"></ion-icon>
        <div class="lock-text">
          <strong>Not Eligible for RFFA</strong>
          <p>Exceeds 2.0ha limit or invalid commodity. Scan or search another farmer.</p>
        </div>
      </div>
    </component>

    <div v-if="isScanning" class="scan-overlay">
      <div class="scan-frame" aria-hidden="true"></div>
      <p class="scan-label">Scanning…</p>
      <p class="scan-hint">Align the RSBSA QR inside the frame</p>
      <ion-button class="cancel-btn" fill="solid" color="light" @click="stopScan">
        Cancel
      </ion-button>
    </div>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonButton, IonIcon, IonInput, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonItem, IonSelect, IonSelectOption,
} from '@ionic/vue';
import {
  qrCodeOutline, alertCircleOutline, checkmarkCircleOutline,
  cloudOfflineOutline, chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { getPrograms, lookupFarmer, searchFarmers, isOnline, isRetryableSyncError } from '@/services/syncService';
import { scanFarmerQr, showScannerBackground, stopLiveQrScan } from '@/composables/useNativeHardware';
import { claimSubsidyRelease, type SubsidyClaimData } from '@/composables/useSubsidyClaim';
import { useDistributionStore, type ReleaseContext } from '@/stores/distributionStore';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/utils/axios';
import { presentToast } from '@/utils/toast';
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { catalogSummary } from '@/constants/subsidyCatalog';

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: [] }>();

const route = useRoute();
const authStore = useAuthStore();
const distributionStore = useDistributionStore();

const isAdminOverride = computed(() => authStore.isMunicipalAdmin);
const backHref = computed(() =>
  route.path.startsWith('/admin') ? '/admin/dashboard' : '/tech/dashboard'
);

const isScanning = ref(false);
const lookingUp = ref(false);
const searching = ref(false);
const claiming = ref(false);
const changingProgram = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const farmer = ref<any | null>(null);
const programs = ref<any[]>([]);
const selectedProgramId = ref('');
interface LastClaimReceipt {
  offline: boolean;
  farmerName: string;
  rsbsa?: string | null;
  barangay?: string | null;
  campaign: string;
  eligibleSize?: number;
  totalFarmSize?: number;
  data?: SubsidyClaimData;
}

const lastClaim = ref<LastClaimReceipt | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const selectedProgram = computed(() =>
  programs.value.find((p) => p.id === selectedProgramId.value) ?? null
);

const hasProgram = computed(() => !!selectedProgramId.value);
const showProgramPicker = computed(() => !hasProgram.value || changingProgram.value);

const programOptionLabel = (p: any) => {
  if (p.seed_class && p.item_type) return catalogSummary(p.target_crop, p.seed_class, p.item_type);
  return p.name || p.program_name;
};

const isRffaBlocked = computed(() => {
  if (!farmer.value || !selectedProgram.value) return false;
  const programName = selectedProgram.value.name || selectedProgram.value.program_name || '';
  const isRffa = /rffa/i.test(programName);
  return isRffa && farmer.value.is_rffa_eligible === false;
});

const formatHa = (n?: number) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const qtyNumber = (value: number | string | null | undefined) => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const hasDispensedAmount = computed(() => {
  const data = lastClaim.value?.data;
  const primary = qtyNumber(data?.quantity_dispensed);
  const secondary = qtyNumber(data?.quantity_dispensed_secondary);
  return (primary != null && primary > 0) || (secondary != null && secondary > 0);
});

const dispensedLabel = computed(() => {
  const data = lastClaim.value?.data;
  if (!data) return '';
  const qty = data.quantity_dispensed ?? '';
  if (data.unit) return `${qty} ${data.unit}`.trim();
  return String(qty);
});

const secondaryDispensedLabel = computed(() => {
  const data = lastClaim.value?.data;
  if (!data?.unit_secondary || data.quantity_dispensed_secondary == null) return '';
  return `+ ${data.quantity_dispensed_secondary} ${data.unit_secondary}`;
});

const inventoryPrimaryLabel = computed(() => {
  const data = lastClaim.value?.data;
  if (data?.inventory_remaining == null) return '';
  const unit = data.unit || selectedProgram.value?.unit_of_measurement || '';
  return `${data.inventory_remaining} ${unit}`.trim();
});

const inventorySecondaryLabel = computed(() => {
  const data = lastClaim.value?.data;
  if (!data?.unit_secondary || data.inventory_remaining_secondary == null) return '';
  return `${data.inventory_remaining_secondary} ${data.unit_secondary}`;
});

const showFarmSize = computed(() => {
  const elig = lastClaim.value?.eligibleSize ?? 0;
  const total = lastClaim.value?.totalFarmSize ?? 0;
  return elig > 0 || total > 0;
});

const formatName = (f: any) => {
  if (!f) return '';
  if (f.full_name) return f.full_name;
  const parts = [f.surname || f.last_name, [f.first_name, f.middle_name].filter(Boolean).join(' ')].filter(Boolean);
  return parts.length ? parts.join(', ') : (f.name || 'Unknown farmer');
};

const farmerDisplayName = computed(() => formatName(farmer.value));

const toast = (message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') =>
  presentToast(message, color);

const persistProgram = (id: string) => {
  selectedProgramId.value = id;
  distributionStore.setActiveProgram(id);
};

const onProgramChange = (e: CustomEvent) => {
  const id = String(e.detail.value ?? '');
  persistProgram(id);
  if (id) changingProgram.value = false;
};

const onSearchInput = (e: CustomEvent) => {
  if (!hasProgram.value) return;
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

const selectSearchedFarmer = async (f: any) => {
  applyFarmer(f);
  await claimForCurrentFarmer();
};

const clearFarmer = () => {
  farmer.value = null;
  searchQuery.value = '';
  searchResults.value = [];
};

const buildOfflineContext = (program: any, source: 'subsidy' | 'program'): ReleaseContext => {
  const rsbsaNo = farmer.value.rsbsa_no || farmer.value.rsbsaNo;
  return {
    farmer_id: farmer.value.id,
    program_id: selectedProgramId.value,
    farmer_name: farmerDisplayName.value,
    mobile_number: farmer.value.mobile_number,
    item_released: program?.name || program?.program_name || 'Subsidy item',
    seed_class: program?.seed_class ?? null,
    item_type: program?.item_type ?? null,
    unit: program?.unit_of_measurement || '',
    total_farm_size: 0,
    eligible_size: 0,
    quantity: 0,
    inventory_remaining: program?.remaining_quantity ?? 0,
    unit_secondary: program?.secondary_unit ?? null,
    quantity_secondary: null,
    inventory_remaining_secondary: program?.secondary_remaining_quantity ?? null,
    plot_lat: farmer.value.farm_plots?.[0]?.latitude ?? farmer.value.farmPlots?.[0]?.latitude,
    plot_long: farmer.value.farm_plots?.[0]?.longitude ?? farmer.value.farmPlots?.[0]?.longitude,
    rsbsa_no: rsbsaNo,
    source,
    offline: true,
  };
};

const verifyOnline = async (program: any, source: 'subsidy' | 'program'): Promise<ReleaseContext> => {
  if (source === 'subsidy') {
    const response = await apiClient.post(`/subsidies/${selectedProgramId.value}/verify-farmer`, {
      farmer_id: farmer.value.id,
      rsbsa_no: farmer.value.rsbsa_no || farmer.value.rsbsaNo,
    });
    const data = response.data?.data ?? {};
    return {
      farmer_id: data.farmer_id || farmer.value.id,
      program_id: data.program_id || selectedProgramId.value,
      farmer_name: data.farmer_name || farmerDisplayName.value,
      mobile_number: data.mobile_number,
      item_released: data.item_released || program.name,
      seed_class: data.seed_class ?? program.seed_class ?? null,
      item_type: data.item_type ?? program.item_type ?? null,
      unit: data.unit || program.unit_of_measurement,
      total_farm_size: data.total_farm_size || 0,
      eligible_size: data.eligible_size || 0,
      quantity: data.quantity || 0,
      inventory_remaining: data.inventory_remaining ?? program.remaining_quantity,
      unit_secondary: data.unit_secondary ?? program.secondary_unit ?? null,
      quantity_secondary: data.quantity_secondary ?? null,
      inventory_remaining_secondary: data.inventory_remaining_secondary ?? program.secondary_remaining_quantity ?? null,
      plot_lat: data.plot_lat,
      plot_long: data.plot_long,
      beneficiary_id: data.beneficiary_id,
      rsbsa_no: farmer.value.rsbsa_no || farmer.value.rsbsaNo,
      source: 'subsidy',
      offline: false,
    };
  }

  const response = await apiClient.post('/distributions/verify', {
    farmer_id: farmer.value.id,
    program_id: selectedProgramId.value,
  });
  const data = response.data?.data ?? {};
  return {
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
  };
};

const applyStockFromClaim = (data?: SubsidyClaimData) => {
  if (!data || !selectedProgram.value) return;
  if (data.inventory_remaining != null) {
    selectedProgram.value.remaining_quantity = Number(data.inventory_remaining);
  }
  if (data.inventory_remaining_secondary != null) {
    selectedProgram.value.secondary_remaining_quantity = Number(data.inventory_remaining_secondary);
  }
};

const claimForCurrentFarmer = async () => {
  if (!farmer.value || !selectedProgramId.value || claiming.value) return;
  if (isRffaBlocked.value) {
    await toast('This farmer is not eligible for RFFA.', 'danger');
    return;
  }

  const program = selectedProgram.value;
  const source: 'subsidy' | 'program' = program?.source === 'subsidy' ? 'subsidy' : 'program';
  const farmerName = farmerDisplayName.value;
  claiming.value = true;

  try {
    let ctx: ReleaseContext;
    if (!isOnline()) {
      ctx = buildOfflineContext(program, source);
    } else {
      try {
        ctx = await verifyOnline(program, source);
      } catch (err: any) {
        if (!isRetryableSyncError(err)) {
          await toast(err?.response?.data?.message || 'Could not verify eligibility.', 'danger');
          return;
        }
        ctx = buildOfflineContext(program, source);
        await toast('Connection lost. Saving offline — will confirm on sync.', 'warning');
      }
    }

    distributionStore.setContext(ctx);
    const result = await claimSubsidyRelease(ctx);
    const farmerRow = farmer.value;
    lastClaim.value = {
      offline: result.offline,
      farmerName: result.data?.farmer_name || farmerName,
      rsbsa: ctx.rsbsa_no || farmerRow?.rsbsa_no || farmerRow?.rsbsaNo || null,
      barangay: farmerRow?.permanent_brgy || farmerRow?.barangay || null,
      campaign: program ? programOptionLabel(program) : (ctx.item_released || ''),
      eligibleSize: ctx.eligible_size,
      totalFarmSize: ctx.total_farm_size,
      data: {
        farmer_name: result.data?.farmer_name || farmerName,
        quantity_dispensed: result.data?.quantity_dispensed ?? (ctx.quantity || undefined),
        unit: result.data?.unit || ctx.unit,
        inventory_remaining: result.data?.inventory_remaining ?? ctx.inventory_remaining,
        quantity_dispensed_secondary: result.data?.quantity_dispensed_secondary ?? ctx.quantity_secondary,
        unit_secondary: result.data?.unit_secondary ?? ctx.unit_secondary ?? null,
        inventory_remaining_secondary:
          result.data?.inventory_remaining_secondary ?? ctx.inventory_remaining_secondary ?? null,
      },
    };
    applyStockFromClaim(result.data);
    distributionStore.clear();
    clearFarmer();
    emit('saved');
    if (result.offline) {
      await toast('Queued offline. Will sync when back online.', 'warning');
    }
  } catch (err: any) {
    await toast(err?.response?.data?.message || 'Release failed. Please try again.', 'danger');
  } finally {
    claiming.value = false;
  }
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
    await claimForCurrentFarmer();
  } catch (err) {
    console.warn('[AGRI-AKAP] Farmer lookup failed:', err);
    await toast('Lookup failed. Check connection or try again.', 'danger');
  } finally {
    lookingUp.value = false;
  }
};

const stopScan = async () => {
  await stopLiveQrScan();
  isScanning.value = false;
};

const startScan = async () => {
  if (!hasProgram.value) {
    await toast('Choose a subsidy campaign first.', 'warning');
    return;
  }
  if (isScanning.value || lookingUp.value || claiming.value) return;

  const result = await scanFarmerQr({
    onLiveScanStart: () => { isScanning.value = true; },
    onLiveScanEnd: () => { isScanning.value = false; },
  });

  if (!result.ok) {
    if (result.reason === 'cancelled') return;
    const messages = {
      not_native: 'Camera scanner needs a native build. Search by name or RSBSA below.',
      permission: 'Camera permission denied. Search by name or RSBSA below.',
      empty: 'No QR code detected. Try again or search manually.',
      unavailable: 'Scanner unavailable. Search by name or RSBSA below.',
    } as const;
    await toast(messages[result.reason], result.reason === 'unavailable' ? 'danger' : 'warning');
    return;
  }

  searchQuery.value = result.value;
  await fetchFarmerByQr(result.value);
};

onMounted(async () => {
  showScannerBackground();
  programs.value = await getPrograms();
  const saved = distributionStore.activeProgramId;
  if (saved && programs.value.some((p) => p.id === saved)) {
    selectedProgramId.value = saved;
  } else if (programs.value.length === 1) {
    persistProgram(programs.value[0].id);
  }

  const farmerId = String(route.query.farmer || '').trim();
  const rsbsa = String(route.query.rsbsa || '').trim();
  if ((farmerId || rsbsa) && selectedProgramId.value) {
    lookingUp.value = true;
    try {
      if (farmerId) {
        const res = await apiClient.get(`/farmers/${farmerId}`);
        if (res.data?.data) {
          applyFarmer(res.data.data);
          lookingUp.value = false;
          await claimForCurrentFarmer();
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
  showScannerBackground();
  void stopScan();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.hero {
  text-align: center;
  margin: 0.75rem 0 1.25rem;
}

.admin-banner {
  text-align: left;
  background: #eff6ff;
  color: #1e3a5f;
  border: 1px solid #93c5fd;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.88rem;
}
.admin-banner strong { display: block; margin-bottom: 0.25rem; }
.admin-banner p { margin: 0; font-size: 0.82rem; opacity: 0.9; }

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

.search-box.disabled { opacity: 0.55; pointer-events: none; }

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

.program-chip {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  background: #f0f7f2;
  border: 1px solid #c5d9cc;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
}

.program-chip .chip-label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.program-chip strong {
  flex: 1;
  color: #1a4731;
  font-size: 0.95rem;
}

.program-chip .chip-change {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1a4731;
  text-decoration: underline;
}

.rffa-lock-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: #fef2f2;
  border: 2px solid #ef4444;
  border-radius: 10px;
  padding: 0.85rem;
  margin-top: 0.85rem;
}

.rffa-lock-banner .lock-icon {
  font-size: 24px;
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.rffa-lock-banner .lock-text strong {
  display: block;
  color: #991b1b;
  font-weight: 800;
  font-size: 0.92rem;
  margin-bottom: 0.15rem;
}

.rffa-lock-banner .lock-text p {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.82rem;
  line-height: 1.35;
}

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

.result-card {
  margin: 0 0 1rem;
  border-radius: 14px;
  --background: #f0f7f2;
  --color: #0f172a;
  background: #f0f7f2;
  border: 2px solid #1a4731;
  box-shadow: none;
}

.result-card.offline {
  --background: #fffbeb;
  background: #fffbeb;
  border-color: #b45309;
}

.receipt-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1a4731;
}

.result-card.offline .receipt-status {
  color: #92400e;
}

.receipt-status ion-icon {
  font-size: 1.15rem;
}

.farmer-name-result {
  font-weight: 900;
  font-size: 1.35rem;
  color: #0f172a;
  margin: 0 0 0.25rem;
}

.receipt-id {
  margin: 0 0 0.75rem;
  font-size: 0.88rem;
  color: #64748b;
}

.receipt-pending {
  margin: 0.65rem 0 0;
  padding: 0.75rem 0.85rem;
  background: #fff;
  border: 1px dashed #d97706;
  border-radius: 10px;
  color: #92400e;
  font-size: 0.86rem;
  line-height: 1.4;
}

.dispense-box {
  background: #1a4731;
  color: #fff;
  border-radius: 10px;
  padding: 0.9rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0.65rem 0 0.35rem;
}

.result-card.offline .dispense-box {
  background: #92400e;
}

.dispense-label {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.85;
}

.dispense-qty {
  font-size: 1.85rem;
  font-weight: 900;
  line-height: 1.1;
}

.dispense-qty-secondary {
  font-size: 1.02rem;
  font-weight: 700;
  opacity: 0.92;
}

.sms-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  margin: 0.75rem 0 0;
  color: #334155;
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
