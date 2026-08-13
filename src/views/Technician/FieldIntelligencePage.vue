<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Field Reports</ion-title>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-segment v-model="activeTab" color="light">
          <ion-segment-button value="crop">
            <ion-label>Crop Log</ion-label>
          </ion-segment-button>
          <ion-segment-button value="pest">
            <ion-label>Pest Report</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="auth-bg ion-padding">
      <div class="form-wrapper">

        <div class="lgu-links">
          <ion-button expand="block" class="lgu-btn" router-link="/tech/planting-log">
            <ion-icon slot="start" :icon="leafOutline"></ion-icon>
            Planting Records
          </ion-button>
          <ion-button expand="block" class="lgu-btn response" router-link="/tech/pest-response">
            <ion-icon slot="start" :icon="medkitOutline"></ion-icon>
            Pest Response
          </ion-button>
          <ion-button expand="block" class="lgu-btn calamity" router-link="/tech/calamity-rdana">
            <ion-icon slot="start" :icon="thunderstormOutline"></ion-icon>
            Calamity Damage
          </ion-button>
          <ion-button expand="block" fill="outline" class="lgu-btn outline" router-link="/tech/pest-validation">
            <ion-icon slot="start" :icon="bugOutline"></ion-icon>
            Check Pests
          </ion-button>
        </div>

        <!-- ── CROP LOG TAB ── -->
        <div v-if="activeTab === 'crop'" class="animate-fade">
          <p class="tab-desc">Record what is planted now and the condition of the soil.</p>

          <div v-if="plotsError" class="error-note">{{ plotsError }}</div>

          <ion-card class="form-card">
            <ion-card-content>

              <ion-item class="custom-input" :class="{ 'input-error': cropErrors.farm_plot_id }">
                <ion-select
                  v-model="cropForm.farm_plot_id"
                  label="Select Farm Plot *"
                  label-placement="floating"
                  :disabled="plots.length === 0"
                  placeholder="Choose a plot..."
                >
                  <ion-select-option v-for="plot in plots" :key="plot.id" :value="plot.id">
                    {{ plot.farmer?.surname ?? 'Unknown' }} — {{ plot.commodity }} ({{ plot.size_ha ?? plot.total_parcel_area_ha }} ha · {{ plot.location_brgy }})
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <p v-if="cropErrors.farm_plot_id" class="field-error">{{ cropErrors.farm_plot_id }}</p>

              <ion-item class="custom-input" :class="{ 'input-error': cropErrors.crop_planted }">
                <ion-select v-model="cropForm.crop_planted" label="Crop Planted *" label-placement="floating" placeholder="Select crop">
                  <ion-select-option value="Rice (Palay)">Rice (Palay)</ion-select-option>
                  <ion-select-option value="Corn">Corn</ion-select-option>
                  <ion-select-option value="Mung Bean">Mung Bean</ion-select-option>
                  <ion-select-option value="Tobacco">Tobacco</ion-select-option>
                  <ion-select-option value="Onion">Onion</ion-select-option>
                  <ion-select-option value="Garlic">Garlic</ion-select-option>
                  <ion-select-option value="Vegetables">Vegetables</ion-select-option>
                  <ion-select-option value="Others">Others</ion-select-option>
                </ion-select>
              </ion-item>
              <p v-if="cropErrors.crop_planted" class="field-error">{{ cropErrors.crop_planted }}</p>

              <ion-row>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-select v-model="cropForm.season" label="Season *" label-placement="floating">
                      <ion-select-option value="Wet">Wet</ion-select-option>
                      <ion-select-option value="Dry">Dry</ion-select-option>
                    </ion-select>
                  </ion-item>
                </ion-col>
                <ion-col size="6">
                  <ion-item class="custom-input" :class="{ 'input-error': cropErrors.year }">
                    <ion-input
                      type="number"
                      v-model.number="cropForm.year"
                      label="Year *"
                      label-placement="floating"
                      :min="2000"
                      :max="2100"
                    ></ion-input>
                  </ion-item>
                </ion-col>
              </ion-row>

              <ion-item class="custom-input">
                <ion-select v-model="cropForm.crop_stage" label="Crop Stage (optional)" label-placement="floating" placeholder="Select stage">
                  <ion-select-option value="Seedling">Seedling</ion-select-option>
                  <ion-select-option value="Vegetative">Vegetative</ion-select-option>
                  <ion-select-option value="Reproductive">Reproductive</ion-select-option>
                  <ion-select-option value="Maturity">Maturity</ion-select-option>
                  <ion-select-option value="Harvested">Harvested</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-row>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-input
                      type="number"
                      step="0.1"
                      v-model.number="cropForm.area_planted_ha"
                      label="Area Planted (ha)"
                      label-placement="floating"
                      placeholder="e.g. 1.5"
                      :min="0"
                    ></ion-input>
                  </ion-item>
                </ion-col>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-input
                      type="number"
                      step="0.1"
                      v-model.number="cropForm.soil_ph"
                      label="Soil pH"
                      label-placement="floating"
                      placeholder="e.g. 6.5"
                      :min="0"
                      :max="14"
                    ></ion-input>
                  </ion-item>
                </ion-col>
              </ion-row>

              <ion-row>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-input
                      type="number"
                      step="1"
                      v-model.number="cropForm.expected_yield_kg"
                      label="Expected Yield (kg)"
                      label-placement="floating"
                      placeholder="Projected"
                      :min="0"
                    ></ion-input>
                  </ion-item>
                </ion-col>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-input
                      type="number"
                      step="1"
                      v-model.number="cropForm.actual_yield_kg"
                      label="Actual Yield (kg)"
                      label-placement="floating"
                      placeholder="At harvest"
                      :min="0"
                    ></ion-input>
                  </ion-item>
                </ion-col>
              </ion-row>
              <p class="hint-note">Yield figures power the predictive analytics dashboard. Record actual yield at harvest.</p>

              <ion-button expand="block" color="success" class="mt-3" @click="submitCropLog" :disabled="isSubmitting">
                <ion-icon slot="start" :icon="leafOutline"></ion-icon>
                {{ isSubmitting ? 'Saving...' : 'Save Field Log' }}
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- ── PEST REPORT TAB ── -->
        <div v-if="activeTab === 'pest'" class="animate-fade">
          <p class="tab-desc">Respond to barangay pest reports — validate on-site, advise farmers, and dispense interventions.</p>

          <ion-button expand="block" class="lgu-btn response pest-cta" router-link="/tech/pest-response">
            <ion-icon slot="start" :icon="medkitOutline"></ion-icon>
            Open Pest &amp; Disease Response Workflow
          </ion-button>

          <ion-card class="form-card border-danger">
            <ion-card-content>

              <ion-item class="custom-input" :class="{ 'input-error': pestErrors.farm_plot_id }">
                <ion-select
                  v-model="pestForm.farm_plot_id"
                  label="Affected Farm Plot *"
                  label-placement="floating"
                  :disabled="plots.length === 0"
                  placeholder="Choose affected plot..."
                >
                  <ion-select-option v-for="plot in plots" :key="plot.id" :value="plot.id">
                    {{ plot.farmer?.surname ?? 'Unknown' }} — {{ plot.commodity }} ({{ plot.location_brgy }})
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <p v-if="pestErrors.farm_plot_id" class="field-error">{{ pestErrors.farm_plot_id }}</p>

              <ion-item class="custom-input" :class="{ 'input-error': pestErrors.pest_name }">
                <ion-select
                  v-model="selectedThreat"
                  label="Pest / Disease *"
                  label-placement="floating"
                  placeholder="Select regional threat"
                >
                  <ion-select-option v-for="threat in regionalThreats" :key="threat" :value="threat">{{ threat }}</ion-select-option>
                  <ion-select-option value="Other">Other (specify)</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="selectedThreat === 'Other'" class="custom-input" :class="{ 'input-error': pestErrors.pest_name }">
                <ion-input
                  v-model="otherThreat"
                  label="Specify Pest / Disease *"
                  label-placement="floating"
                  placeholder="e.g. Leaf Folder"
                ></ion-input>
              </ion-item>
              <p v-if="pestErrors.pest_name" class="field-error">{{ pestErrors.pest_name }}</p>

              <ion-item class="custom-input">
                <ion-select v-model="pestForm.severity" label="Severity Level *" label-placement="floating">
                  <ion-select-option value="Low">Low — Minor damage, isolated</ion-select-option>
                  <ion-select-option value="Medium">Medium — Affecting yield</ion-select-option>
                  <ion-select-option value="High">High — Spreading rapidly</ion-select-option>
                  <ion-select-option value="Critical">Critical — Total crop failure risk</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="custom-input">
                <ion-input
                  type="date"
                  v-model="pestForm.date_spotted"
                  label="Date Spotted *"
                  label-placement="floating"
                ></ion-input>
              </ion-item>

              <ion-item class="custom-input">
                <ion-textarea
                  v-model="pestForm.notes"
                  label="Observations (optional)"
                  label-placement="floating"
                  placeholder="Describe damage pattern, affected area, etc."
                  :rows="3"
                ></ion-textarea>
              </ion-item>

              <div class="geo-note" v-if="geoStatus">
                <ion-icon :icon="locationOutline"></ion-icon>
                {{ geoStatus }}
              </div>

              <ion-button expand="block" color="danger" class="mt-3" @click="submitPestReport" :disabled="isSubmitting">
                <ion-icon slot="start" :icon="bugOutline"></ion-icon>
                {{ isSubmitting ? 'Sending Alert...' : 'Report Outbreak' }}
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>

      </div>

      <!-- Monoculture Alert -->
      <ion-alert
        :is-open="showMonocultureAlert"
        header="⚠️ Soil Depletion Risk"
        sub-header="Monoculture Pattern Detected"
        :message="alertMessage"
        :buttons="['Acknowledge & Advise Farmer']"
        @didDismiss="showMonocultureAlert = false"
      ></ion-alert>

      <!-- Pest Recommendation Alert -->
      <ion-alert
        :is-open="showPestAlert"
        :header="pestAlertHigh ? '🚨 Threat Vector Flagged' : '✅ Outbreak Logged'"
        sub-header="Recommended Intervention"
        :message="pestRecommendation"
        :buttons="['Acknowledge & Advise Farmer']"
        @didDismiss="showPestAlert = false"
      ></ion-alert>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardContent, IonItem,
  IonInput, IonTextarea, IonSelect, IonSelectOption, IonRow, IonCol, IonButton, IonIcon,
  IonAlert, toastController,
} from '@ionic/vue';
import { leafOutline, bugOutline, locationOutline, medkitOutline, thunderstormOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import axiosInstance from '@/utils/axios';

const activeTab = ref('crop');
const isSubmitting = ref(false);
const plots = ref<any[]>([]);
const plotsError = ref('');
const geoStatus = ref('');

const showMonocultureAlert = ref(false);
const alertMessage = ref('');

// Standardized regional threat labels (mirrors config/pest_guidelines.php).
const regionalThreats = [
  'Fall Armyworm', 'Rice Blast', 'Brown Planthopper', 'Rice Black Bug',
  'Tungro Virus', 'Golden Apple Snail', 'Corn Borer', 'Rice Bug', 'Rodents',
];
const selectedThreat = ref('');
const otherThreat = ref('');

const showPestAlert = ref(false);
const pestRecommendation = ref('');
const pestAlertHigh = ref(false);

const cropForm = reactive({
  farm_plot_id: '',
  crop_planted: '',
  season: 'Wet' as 'Wet' | 'Dry',
  year: new Date().getFullYear(),
  soil_ph: null as number | null,
  crop_stage: '' as string,
  area_planted_ha: null as number | null,
  expected_yield_kg: null as number | null,
  actual_yield_kg: null as number | null,
});

const cropErrors = reactive({ farm_plot_id: '', crop_planted: '', year: '' });

const pestForm = reactive({
  farm_plot_id: '',
  pest_name: '',
  severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
  date_spotted: new Date().toISOString().split('T')[0],
  notes: '',
  latitude: null as number | null,
  longitude: null as number | null,
});

const pestErrors = reactive({ farm_plot_id: '', pest_name: '' });

// Resolve the effective pest name from the dropdown / "Other" free-text.
const resolvedPestName = computed(() =>
  selectedThreat.value === 'Other' ? otherThreat.value.trim() : selectedThreat.value
);

const showToast = async (msg: string, color: 'success' | 'danger' | 'warning' = 'success') => {
  const t = await toastController.create({ message: msg, duration: 3000, color, position: 'top' });
  await t.present();
};

const fetchPlots = async () => {
  try {
    const res = await axiosInstance.get('/farm-plots');
    plots.value = res.data.data ?? [];
    if (!plots.value.length) {
      plotsError.value = 'No farm plots found. Register a farmer with plots first.';
    }
  } catch {
    plotsError.value = 'Could not load farm plots. Check your connection.';
  }
};

const getGeolocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
  geoStatus.value = 'Getting GPS location...';
  try {
    const pos = await Geolocation.getCurrentPosition({ timeout: 8000 });
    geoStatus.value = `📍 GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    geoStatus.value = 'GPS unavailable — report will be filed without geolocation.';
    return null;
  }
};

const validateCrop = (): boolean => {
  cropErrors.farm_plot_id = cropForm.farm_plot_id ? '' : 'Please select a farm plot.';
  cropErrors.crop_planted = cropForm.crop_planted ? '' : 'Please select a crop.';
  cropErrors.year = cropForm.year >= 2000 ? '' : 'Enter a valid year (2000+).';
  return !cropErrors.farm_plot_id && !cropErrors.crop_planted && !cropErrors.year;
};

const validatePest = (): boolean => {
  pestErrors.farm_plot_id = pestForm.farm_plot_id ? '' : 'Please select an affected plot.';
  pestErrors.pest_name = resolvedPestName.value ? '' : 'Select a pest or specify one.';
  return !pestErrors.farm_plot_id && !pestErrors.pest_name;
};

const submitCropLog = async () => {
  if (!validateCrop()) return;
  isSubmitting.value = true;
  try {
    const res = await axiosInstance.post('/intelligence/crop-log', cropForm);

    if (res.data.monoculture_alert) {
      alertMessage.value = res.data.alert_message;
      showMonocultureAlert.value = true;
    } else {
      await showToast('Crop cycle logged successfully!', 'success');
    }

    // Full reset
    cropForm.farm_plot_id = '';
    cropForm.crop_planted = '';
    cropForm.season = 'Wet';
    cropForm.year = new Date().getFullYear();
    cropForm.soil_ph = null;
    cropForm.crop_stage = '';
    cropForm.area_planted_ha = null;
    cropForm.expected_yield_kg = null;
    cropForm.actual_yield_kg = null;
  } catch (err: any) {
    await showToast(err.response?.data?.message ?? 'Failed to log crop.', 'danger');
  } finally {
    isSubmitting.value = false;
  }
};

const submitPestReport = async () => {
  if (!validatePest()) return;
  isSubmitting.value = true;

  pestForm.pest_name = resolvedPestName.value;

  const coords = await getGeolocation();
  if (coords) {
    pestForm.latitude = coords.latitude;
    pestForm.longitude = coords.longitude;
  } else {
    // Fall back to the selected parcel's stored coordinates.
    const plot = plots.value.find(p => p.id === pestForm.farm_plot_id);
    if (plot?.latitude && plot?.longitude) {
      pestForm.latitude = Number(plot.latitude);
      pestForm.longitude = Number(plot.longitude);
      geoStatus.value = `📍 Using parcel coordinates: ${pestForm.latitude}, ${pestForm.longitude}`;
    }
  }

  try {
    const res = await axiosInstance.post('/intelligence/pest-report', pestForm);

    // Surface the prescriptive countermeasure so the technician can advise on-site.
    if (res.data.recommended_intervention) {
      pestRecommendation.value = res.data.recommended_intervention;
      pestAlertHigh.value = !!res.data.high_priority;
      showPestAlert.value = true;
    } else {
      await showToast('Pest outbreak reported. MAO has been notified.', 'warning');
    }

    pestForm.farm_plot_id = '';
    pestForm.pest_name = '';
    pestForm.notes = '';
    pestForm.latitude = null;
    pestForm.longitude = null;
    selectedThreat.value = '';
    otherThreat.value = '';
    geoStatus.value = '';
  } catch (err: any) {
    await showToast(err.response?.data?.message ?? 'Failed to report pest.', 'danger');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => fetchPlots());
</script>

<style scoped>
.auth-bg { --background: #f4f8f5; }
.form-wrapper { max-width: 600px; margin: 0 auto; padding-top: 0.5rem; }
.lgu-links { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.lgu-btn { text-transform: none; font-weight: 700; --background: #1a4731; margin: 0; }
.lgu-btn.response { --background: #d4af37; --color: #1a4731; }
.lgu-btn.calamity { --background: #dc2626; --color: #fff; }
.lgu-btn.outline { --border-color: #1a4731; --color: #1a4731; }
.pest-cta { margin-bottom: 1rem; min-height: 52px; font-size: 1rem; }
.tab-desc { font-size: 0.88rem; color: #64748b; margin: 0.5rem 0 1rem; }
.form-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; margin: 0; }
.border-danger { border-top: 4px solid #c0392b; }
.custom-input { --background: #ffffff; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid #e2e8f0; }
.input-error { border-color: #c0392b; }
.field-error { color: #c0392b; font-size: 0.8rem; margin: -0.5rem 0 0.5rem 4px; }
.hint-note { font-size: 0.78rem; color: #64748b; margin: 0.2rem 0 0 4px; font-style: italic; }
.error-note { background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
.mt-3 { margin-top: 1rem; }
.geo-note { display: flex; align-items: center; gap: 6px; color: #2e7d32; font-size: 0.82rem; padding: 8px 0; }
.animate-fade { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
</style>
