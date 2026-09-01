<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Planting Log</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg ion-padding">
      <p class="lede">Record a farmer planting in the field. Variety is required.</p>

      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>Farmer</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="search-box">
            <ion-input
              label="Search Farmer (RSBSA / Name)"
              label-placement="stacked"
              :value="farmerSearch.query.value"
              placeholder="Type to search…"
              @ionInput="(e: CustomEvent) => farmerSearch.onQueryInput(e.detail.value ?? '')"
            ></ion-input>
            <div v-if="farmerSearch.searching.value" class="hint">Searching…</div>
            <ul v-if="farmerSearch.results.value.length" class="suggest">
              <li v-for="f in farmerSearch.results.value" :key="f.id" @click="onSelectFarmer(f)">
                <strong>{{ f.surname }}, {{ f.first_name }}</strong>
                <span>{{ f.rsbsa_no || 'No RSBSA' }} · {{ f.barangay }}</span>
              </li>
            </ul>
          </div>
          <p v-if="form.farmerName" class="farmer-name">{{ form.farmerName }}</p>
        </ion-card-content>
      </ion-card>

      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>Planting details</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-select label="Crop" label-placement="stacked" interface="action-sheet" :value="form.cropType" @ionChange="onCropChange">
            <ion-select-option value="Rice">Rice</ion-select-option>
            <ion-select-option value="Corn">Corn</ion-select-option>
          </ion-select>
          <ion-select label="Farm plot" label-placement="stacked" interface="action-sheet" :value="form.plotId" :disabled="!plots.length" @ionChange="onPlotChange">
            <ion-select-option value="">Select plot</ion-select-option>
            <ion-select-option v-for="p in plots" :key="p.id" :value="p.id">
              {{ p.location_brgy || 'Plot' }} · {{ p.commodity }} · {{ p.size_ha }} ha
            </ion-select-option>
          </ion-select>
          <VarietyField v-model="form.variety" :crop="form.cropType" interface-name="action-sheet" />
          <ion-input type="number" label="Area planted (ha)" label-placement="stacked" :value="form.areaPlanted" @ionInput="onAreaPlantedInput"></ion-input>
          <ion-input type="date" label="Date planted" label-placement="stacked" :value="form.datePlanted" @ionInput="(e: CustomEvent) => form.datePlanted = e.detail.value ?? ''"></ion-input>
          <ion-select label="Status" label-placement="stacked" interface="action-sheet" :value="form.status" @ionChange="(e: CustomEvent) => form.status = e.detail.value">
            <ion-select-option value="Active">Active</ion-select-option>
            <ion-select-option value="Not Continued">Not Continued</ion-select-option>
          </ion-select>
          <ion-select label="Water source" label-placement="stacked" interface="action-sheet" :value="form.waterSource" @ionChange="(e: CustomEvent) => form.waterSource = e.detail.value">
            <ion-select-option value="Deepwell">Deepwell</ion-select-option>
            <ion-select-option value="Irrigated">Irrigated</ion-select-option>
            <ion-select-option value="Rainfed/None">Rainfed/None</ion-select-option>
          </ion-select>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" class="submit-btn" :disabled="!canSubmit || submitting" @click="submit">
        {{ submitting ? 'Saving…' : 'Save planting' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonSelect, IonSelectOption,
} from '@ionic/vue';
import VarietyField from '@/components/VarietyField.vue';
import { useBarangayFarmerSearch, type FarmerOption } from '@/composables/useBarangayFarmerSearch';
import { presentToast } from '@/utils/toast';
import { capInputToPlot, plotSizeHa } from '@/utils/plotArea';
import apiClient from '@/utils/axios';
import { isOnline, isRetryableSyncError, queuePlantingLog, syncAllPendingData } from '@/services/syncService';
import { useSyncStore } from '@/stores/syncStore';

const farmerSearch = useBarangayFarmerSearch(() => null, {
  requireBarangay: false,
  commodity: () => form.cropType,
});
const syncStore = useSyncStore();
const router = useRouter();
const submitting = ref(false);

const form = reactive({
  farmerId: '',
  farmerName: '',
  rsbsaNo: '',
  plotId: '',
  farmLocation: '',
  cropType: 'Rice',
  variety: '',
  areaPlanted: '',
  datePlanted: new Date().toISOString().slice(0, 10),
  status: 'Active',
  waterSource: 'Irrigated',
});

const plots = computed(() => farmerSearch.plotsForCommodity(form.cropType));
const selectedPlotSize = computed(() =>
  plotSizeHa(plots.value.find((p) => p.id === form.plotId))
);
const onAreaPlantedInput = (e: CustomEvent) => {
  form.areaPlanted = capInputToPlot(e.detail.value, selectedPlotSize.value);
};
const canSubmit = computed(() =>
  !!form.farmerId && !!form.plotId && !!form.variety.trim() && !!form.areaPlanted && !!form.datePlanted && !submitting.value
);

const onSelectFarmer = async (f: FarmerOption) => {
  await farmerSearch.selectFarmer(f);
  const sel = farmerSearch.selected.value;
  if (!sel) return;
  form.farmerId = sel.id;
  form.farmerName = `${sel.surname}, ${sel.first_name}`;
  form.rsbsaNo = sel.rsbsa_no;
  farmerSearch.query.value = form.farmerName;
  farmerSearch.results.value = [];
  const match = plots.value[0];
  if (match) {
    form.plotId = match.id;
    form.farmLocation = match.location_brgy || sel.barangay;
    form.areaPlanted = String(match.size_ha || '');
  } else {
    form.plotId = '';
    form.farmLocation = sel.barangay;
  }
};

const onCropChange = (e: CustomEvent) => {
  form.cropType = e.detail.value;
  const match = plots.value[0];
  form.plotId = match?.id || '';
  if (match) {
    form.farmLocation = match.location_brgy || form.farmLocation;
    form.areaPlanted = String(match.size_ha || form.areaPlanted);
  }
};

const onPlotChange = (e: CustomEvent) => {
  form.plotId = e.detail.value;
  const p = plots.value.find((x) => x.id === form.plotId);
  if (p) {
    form.farmLocation = p.location_brgy || form.farmLocation;
    form.areaPlanted = String(p.size_ha || form.areaPlanted);
  }
};

const queueThisPlanting = () => queuePlantingLog({
  farmer_id: form.farmerId,
  farm_plot_id: form.plotId || undefined,
  rsbsa_no: form.rsbsaNo,
  farmer_name: form.farmerName,
  crop_type: form.cropType,
  variety: form.variety.trim(),
  area_planted: Number(form.areaPlanted),
  date_planted: form.datePlanted,
  status: form.status,
  water_source: form.waterSource,
});

const submit = async () => {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    if (!isOnline()) {
      await queueThisPlanting();
      await syncStore.refreshCount();
      await presentToast('Saved locally. Will sync automatically when back online.');
      await router.replace('/tech/dashboard');
      return;
    }

    try {
      await apiClient.post('/planting-logs', {
        id: crypto.randomUUID(),
        farmer_id: form.farmerId,
        farm_plot_id: form.plotId || undefined,
        crop_type: form.cropType,
        variety: form.variety.trim(),
        area_planted: Number(form.areaPlanted),
        date_planted: form.datePlanted,
        status: form.status,
        water_source: form.waterSource,
        farm_location: form.farmLocation,
      });
      await presentToast('Planting saved.');
      await router.replace('/tech/dashboard');
    } catch (err: any) {
      if (!isRetryableSyncError(err)) throw err;
      await queueThisPlanting();
      await syncStore.refreshCount();
      void syncAllPendingData().then(() => syncStore.refreshCount());
      await presentToast('Connection lost. Saved locally — will sync automatically.', 'warning');
      await router.replace('/tech/dashboard');
    }
  } catch (e: any) {
    await presentToast(e?.response?.data?.message || 'Could not save planting log.', 'danger');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.lede { margin: 0 0 0.75rem; color: #475569; font-size: 0.9rem; }
.section-card { margin-bottom: 0.75rem; }
.search-box { position: relative; }
.hint { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
.suggest {
  list-style: none; margin: 6px 0 0; padding: 0; background: #fff;
  border: 1px solid #e2e8f0; border-radius: 8px; max-height: 180px; overflow: auto;
}
.suggest li { padding: 8px 10px; display: flex; flex-direction: column; cursor: pointer; }
.suggest li span { font-size: 0.75rem; color: #64748b; }
.farmer-name { margin: 10px 0 0; font-weight: 800; color: #1a4731; }
.submit-btn { --background: #1a4731; font-weight: 700; text-transform: none; margin: 0.5rem 0 1.5rem; }
</style>
