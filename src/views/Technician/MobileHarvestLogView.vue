<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Harvest Log</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg ion-padding">
      <p class="lede">Record harvest yield in metric tons.</p>

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
          <ion-card-title>Harvest details</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-select label="Crop" label-placement="stacked" interface="action-sheet" :value="form.cropType" @ionChange="onCropChange">
            <ion-select-option value="Rice">Rice</ion-select-option>
            <ion-select-option value="Corn">Corn</ion-select-option>
            <ion-select-option value="High-Value">High-Value</ion-select-option>
          </ion-select>
          <ion-select label="Farm plot" label-placement="stacked" interface="action-sheet" :value="form.plotId" :disabled="!plots.length" @ionChange="onPlotChange">
            <ion-select-option value="">Select plot</ion-select-option>
            <ion-select-option v-for="p in plots" :key="p.id" :value="p.id">
              {{ p.location_brgy || 'Plot' }} · {{ p.commodity }} · {{ p.size_ha }} ha
            </ion-select-option>
          </ion-select>
          <ion-input label="Variety" label-placement="stacked" :value="form.variety" @ionInput="(e: CustomEvent) => form.variety = e.detail.value ?? ''"></ion-input>
          <ion-input type="number" label="Area harvested (ha)" label-placement="stacked" :value="form.areaHarvested" @ionInput="(e: CustomEvent) => form.areaHarvested = e.detail.value ?? ''"></ion-input>
          <ion-input type="number" label="Total yield (MT)" label-placement="stacked" :value="form.totalYield" @ionInput="(e: CustomEvent) => form.totalYield = e.detail.value ?? ''"></ion-input>
          <ion-input type="date" label="Date harvested" label-placement="stacked" :value="form.dateHarvested" @ionInput="(e: CustomEvent) => form.dateHarvested = e.detail.value ?? ''"></ion-input>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" class="submit-btn" :disabled="!canSubmit || submitting" @click="submit">
        {{ submitting ? 'Saving…' : 'Save harvest' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonSelect, IonSelectOption,
  toastController,
} from '@ionic/vue';
import { useBarangayFarmerSearch, type FarmerOption } from '@/composables/useBarangayFarmerSearch';
import apiClient from '@/utils/axios';

const farmerSearch = useBarangayFarmerSearch(() => null, { requireBarangay: false });
const submitting = ref(false);

const form = reactive({
  farmerId: '',
  farmerName: '',
  plotId: '',
  farmLocation: '',
  cropType: 'Rice',
  variety: '',
  areaHarvested: '',
  totalYield: '',
  dateHarvested: new Date().toISOString().slice(0, 10),
});

const plots = computed(() => farmerSearch.plotsForCommodity(form.cropType));
const canSubmit = computed(() =>
  !!form.farmerId && !!form.plotId && !!form.variety.trim() && !!form.areaHarvested && form.totalYield !== '' && !!form.dateHarvested && !submitting.value
);

const onSelectFarmer = async (f: FarmerOption) => {
  await farmerSearch.selectFarmer(f);
  const sel = farmerSearch.selected.value;
  if (!sel) return;
  form.farmerId = sel.id;
  form.farmerName = `${sel.surname}, ${sel.first_name}`;
  farmerSearch.query.value = form.farmerName;
  farmerSearch.results.value = [];
  const match = plots.value[0];
  if (match) {
    form.plotId = match.id;
    form.farmLocation = match.location_brgy || sel.barangay;
    form.areaHarvested = String(match.size_ha || '');
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
    form.areaHarvested = String(match.size_ha || form.areaHarvested);
  }
};

const onPlotChange = (e: CustomEvent) => {
  form.plotId = e.detail.value;
  const p = plots.value.find((x) => x.id === form.plotId);
  if (p) {
    form.farmLocation = p.location_brgy || form.farmLocation;
    form.areaHarvested = String(p.size_ha || form.areaHarvested);
  }
};

const submit = async () => {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    await apiClient.post('/harvest-logs', {
      id: crypto.randomUUID(),
      farmer_id: form.farmerId,
      farm_plot_id: form.plotId,
      crop_type: form.cropType,
      variety: form.variety.trim(),
      area_harvested: Number(form.areaHarvested),
      total_yield: Number(form.totalYield),
      yield_unit: 'Metric Tons',
      date_harvested: form.dateHarvested,
      farm_location: form.farmLocation,
    });
    const t = await toastController.create({
      message: 'Harvest saved.',
      duration: 2400,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch (e: any) {
    const t = await toastController.create({
      message: e?.response?.data?.message || 'Could not save harvest log.',
      duration: 2600,
      color: 'danger',
      position: 'top',
    });
    await t.present();
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
