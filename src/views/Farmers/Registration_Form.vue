<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="rsbsa-toolbar">
        <ion-buttons slot="start">
          <ion-back-button :default-href="farmersHome" class="back-btn" />
        </ion-buttons>
        <ion-title class="toolbar-title">{{ isEdit ? 'Edit Farmer Record' : 'RSBSA Enrollment Form' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rsbsa-content">
      <div class="page-wrapper">
        <div class="letterhead">
          <div class="lh-left">
            <div class="lh-seal">
              <div class="seal-outer"></div>
              <div class="seal-inner"></div>
              <img src="@/assets/images/echague-logo.png" alt="MAO" style="width:36px;height:36px;object-fit:contain;z-index:1;" onerror="this.style.display='none'" />
            </div>
            <div class="lh-titles">
              <div class="lh-agency">REGISTRY SYSTEM FOR BASIC SECTORS IN AGRICULTURE</div>
              <div class="lh-main">{{ isEdit ? 'RSBSA Record Update' : 'RSBSA Enrollment Form' }}</div>
            </div>
          </div>
        </div>
        <div class="tx-row">
          <div class="field-wrap">
            <label class="flabel">TRANSACTION CODE</label>
            <ion-input v-model="farmer.transaction_code" class="finput" readonly />
          </div>
          <div class="field-wrap">
            <label class="flabel">RSBSA NO.</label>
            <ion-input v-model="farmer.rsbsa_no" class="finput" readonly placeholder="Auto-generated on enrollment" />
          </div>
        </div>

        <!--Part 1-->
        <div class="form-section">
          <div class="part-banner">
            <div class="part-label">PART I</div>
            <div class="part-title">PERSONAL INFORMATION</div>
          </div>

          <!-- Name-->
          <div class="subsection">
            <div class="subsection-title">NAME</div>
            <div class="subsection-body">
              <div class="name-row">
                <div class="field-wrap name-surname">
                  <label class="flabel req">SURNAME</label>
                  <ion-input v-model="farmer.surname" class="finput" placeholder="e.g. DELA CRUZ" tabindex="1" />
                </div>
                <div class="field-wrap name-first">
                  <label class="flabel req">FIRST NAME</label>
                  <ion-input v-model="farmer.first_name" class="finput" placeholder="e.g. JUAN" tabindex="2" />
                </div>
                <div class="field-wrap name-middle">
                  <label class="flabel">MIDDLE NAME</label>
                  <ion-input v-model="farmer.middle_name" class="finput" :disabled="farmer.no_middle_name" tabindex="3" />
                  <div class="inline-chk">
                    <ion-checkbox v-model="farmer.no_middle_name" @ionChange="onNoMiddleName" class="fcheck" />
                    <span class="chk-label">No Middle Name</span>
                  </div>
                </div>
                <div class="field-wrap name-ext">
                  <label class="flabel">EXT.</label>
                  <ion-input v-model="farmer.ext_name" class="finput" placeholder="Jr / III" tabindex="4" />
                </div>
              </div>
            </div>
          </div>

          <!-- Personal Details -->
          <div class="subsection">
            <div class="subsection-title">DEMOGRAPHICS</div>
            <div class="subsection-body">
              <div class="demo-row">
                <div class="field-wrap w-md">
                  <label class="flabel req">SEX</label>
                  <ion-select v-model="farmer.sex" interface="popover" class="fselect" placeholder="Select" tabindex="5">
                    <ion-select-option value="Male">Male</ion-select-option>
                    <ion-select-option value="Female">Female</ion-select-option>
                  </ion-select>
                </div>
                <div class="field-wrap w-mid">
                  <label class="flabel req">BIRTHDATE</label>
                  <ion-input type="date" v-model="farmer.birthdate" class="finput" @ionChange="computeAge" tabindex="6" />
                </div>
                <div class="field-wrap w-xs">
                  <label class="flabel">AGE</label>
                  <ion-input :value="computedAge" class="finput" readonly placeholder="—" tabindex="-1" />
                </div>
                <div class="field-wrap w-lg">
                  <label class="flabel">RELIGION</label>
                  <ion-input v-model="farmer.religion" class="finput" placeholder="e.g. Roman Catholic" tabindex="7" />
                </div>
                <div class="field-wrap w-sm">
                  <label class="flabel req">CIVIL STATUS</label>
                  <ion-select v-model="farmer.civil_status" interface="popover" class="fselect" placeholder="Select" tabindex="8">
                    <ion-select-option v-for="cs in civilStatusOptions" :key="cs" :value="cs">{{ cs }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
              <PsgcLocationPicker
                mode="birthplace"
                class="mt6"
                :required="false"
                v-model:region="farmer.place_of_birth_region_helper"
                v-model:province="farmer.place_of_birth_province"
                v-model:city="farmer.place_of_birth_city"
              />
            </div>
          </div>

          <!-- Permanent Address -->
          <div class="subsection">
            <div class="subsection-title">
              PERMANENT ADDRESS
              <span v-if="!permanentOutsideEchague" class="jurisdiction-badge">📍 Echague, Isabela (Region II)</span>
            </div>
            <div class="subsection-body">
              <div class="addr-row">
                <div class="field-wrap w-xs">
                  <label class="flabel">HOUSE NO.</label>
                  <ion-input v-model="farmer.permanent_house_no" class="finput" tabindex="8" />
                </div>
                <div class="field-wrap flex-fill">
                  <label class="flabel">STREET / SITIO / PUROK</label>
                  <ion-input v-model="farmer.permanent_street" class="finput" tabindex="9" />
                </div>
                <PsgcLocationPicker
                  class="psgc-compact"
                  v-model:region="farmer.permanent_region"
                  v-model:province="farmer.permanent_province"
                  v-model:city="farmer.permanent_city"
                  v-model:barangay="farmer.permanent_brgy"
                  v-model:outside-echague="permanentOutsideEchague"
                  @update:barangay="onPermanentLocationChange"
                />
              </div>
              <div class="ncr-note">
                <ion-checkbox v-model="sameAddress" @ionChange="onSameAddress" class="fcheck" />
                <span class="chk-label">Answer only if full and permanent address is in NCR — <em>Ilagay lamang kung ang permanenteng tirahan ay sa NCR.</em></span>
              </div>
            </div>
          </div>

          <!-- Provincial / Mailing Address -->
          <div class="subsection">
            <div class="subsection-title">PROVINCIAL / MAILING ADDRESS</div>
            <div class="subsection-body">
              <div class="addr-row">
                <div class="field-wrap w-sm">
                  <label class="flabel">HOUSE NO.</label>
                  <ion-input v-model="farmer.provincial_house_no" class="finput" :disabled="sameAddress" />
                </div>
                <div class="field-wrap flex-fill">
                  <label class="flabel">STREET / SITIO / PUROK</label>
                  <ion-input v-model="farmer.provincial_street" class="finput" :disabled="sameAddress" />
                </div>
              </div>
              <PsgcLocationPicker
                class="mt6 psgc-compact"
                v-model:region="farmer.provincial_region"
                v-model:province="farmer.provincial_province"
                v-model:city="farmer.provincial_city"
                v-model:barangay="farmer.provincial_brgy"
                v-model:outside-echague="provincialOutsideEchague"
                :disabled="sameAddress"
              />
            </div>
          </div>

          <!-- Contact & Identification -->
          <div class="subsection">
            <div class="subsection-title">CONTACT & IDENTIFICATION</div>
            <div class="subsection-body">
              <div class="contact-row">
                <div class="field-wrap w-md">
                  <label class="flabel req">MOBILE NO.</label>
                  <ion-input v-model="farmer.mobile_number" class="finput" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" :maxlength="11" tabindex="10" />
                </div>
                <div class="inline-chk contact-owner">
                  <ion-checkbox v-model="farmer.is_mobile_owner" class="fcheck" />
                  <span class="chk-label">Mobile owner</span>
                </div>
                <div class="field-wrap w-std">
                  <label class="flabel">GOV'T ID TYPE</label>
                  <ion-select v-model="farmer.id_type" interface="popover" class="fselect" placeholder="Select ID" tabindex="11">
                    <ion-select-option v-for="id in govIdTypes" :key="id" :value="id">{{ id }}</ion-select-option>
                  </ion-select>
                </div>
                <div class="field-wrap w-std">
                  <label class="flabel">ID NUMBER</label>
                  <ion-input v-model="farmer.id_number" class="finput" tabindex="12" />
                </div>
              </div>
              <div v-if="!farmer.is_mobile_owner" class="mt6">
                <label class="flabel" style="margin-bottom:6px;">MOBILE OWNER'S NAME</label>
                <div class="name-row">
                  <div class="field-wrap name-surname">
                    <ion-input v-model="farmer.mobile_owner_surname" class="finput" placeholder="Surname" />
                  </div>
                  <div class="field-wrap name-first">
                    <ion-input v-model="farmer.mobile_owner_first_name" class="finput" placeholder="First Name" />
                  </div>
                  <div class="field-wrap name-middle">
                    <ion-input v-model="farmer.mobile_owner_middle_name" class="finput" placeholder="Middle Name" />
                  </div>
                  <div class="field-wrap name-ext">
                    <ion-input v-model="farmer.mobile_owner_ext_name" class="finput" placeholder="Ext." />
                  </div>
                </div>
              </div>
              <div v-if="farmer.id_type === 'Others'" class="field-wrap mt6 narrow-field">
                <label class="flabel req">SPECIFY ID TYPE</label>
                <ion-input v-model="farmer.id_type_other" class="finput compact" placeholder="Type the ID type" />
              </div>
            </div>
          </div>

          <!--  Mother's Maiden Name  -->
          <div class="subsection">
            <div class="subsection-title">MOTHER'S MAIDEN NAME</div>
            <div class="subsection-body">
              <div class="name-row">
                <div class="field-wrap name-surname">
                  <label class="flabel req">SURNAME</label>
                  <ion-input v-model="farmer.mothers_maiden_surname" class="finput" />
                </div>
                <div class="field-wrap name-first">
                  <label class="flabel req">FIRST NAME</label>
                  <ion-input v-model="farmer.mothers_maiden_first_name" class="finput" />
                </div>
                <div class="field-wrap name-middle">
                  <label class="flabel">MIDDLE NAME</label>
                  <ion-input v-model="farmer.mothers_maiden_middle_name" class="finput" />
                </div>
              </div>
            </div>
          </div>

          <!-- Education and spouse details -->
          <div class="subsection">
            <div class="subsection-title">EDUCATION</div>
            <div class="subsection-body">
              <div class="fgrid g2">
                <div class="field-wrap" v-if="farmer.civil_status === 'Married'">
                  <label class="flabel">SPOUSE'S NAME</label>
                  <div class="fgrid g2">
                    <ion-input v-model="farmer.spouse_first_name" class="finput" placeholder="First Name" />
                    <ion-input v-model="farmer.spouse_middle_name" class="finput" placeholder="Middle Name" />
                  </div>
                  <div class="fgrid g2 mt6">
                    <ion-input v-model="farmer.spouse_surname" class="finput" placeholder="Surname" />
                    <ion-input v-model="farmer.spouse_ext_name" class="finput" placeholder="Ext. Name" />
                  </div>
                </div>
                <div class="field-wrap">
                  <label class="flabel req">HIGHEST EDUCATIONAL ATTAINMENT</label>
                  <ion-select v-model="farmer.highest_education" interface="popover" class="fselect" placeholder="Select Educational Attainment">
                    <ion-select-option v-for="edu in educationOptions" :key="edu" :value="edu">{{ edu }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Government ID: merged into Contact & Identification above -->

          <!--  Vulnerability & Membership -->
          <div class="subsection">
            <div class="subsection-title">VULNERABILITY / MEMBERSHIP</div>
            <div class="subsection-body">
              <div class="fgrid g2">
                <div class="field-wrap">
                  <div class="chk-row">
                    <ion-checkbox v-model="farmer.is_icc_ip" class="fcheck" />
                    <span class="chk-label">ICC/IP Member</span>
                  </div>
                  <div v-if="farmer.is_icc_ip" class="mt6">
                    <label class="flabel">ICC/IP GROUP NAME</label>
                    <ion-input v-model="farmer.icc_ip_name" class="finput" />
                  </div>
                  <div class="chk-row mt4">
                    <ion-checkbox v-model="farmer.is_pwd" class="fcheck" />
                    <span class="chk-label">Persons with Disability (PWD)</span>
                  </div>
                  <div class="chk-row mt4">
                    <ion-checkbox v-model="farmer.is_4ps_beneficiary" class="fcheck" />
                    <span class="chk-label">4Ps Beneficiary</span>
                  </div>
                </div>
                <div class="field-wrap">
                  <label class="flabel">ASSOCIATIONS / COOPERATIVES (Name of Organization)</label>
                  <ion-input v-model="farmer.association_1" class="finput" placeholder="Association / Cooperative 1" />
                  <ion-input v-model="farmer.association_2" class="finput mt6" placeholder="Association / Cooperative 2" />
                  <ion-input v-model="farmer.association_3" class="finput mt6" placeholder="Association / Cooperative 3" />
                </div>
              </div>
            </div>
          </div>
        </div>


        <!-- Part 2-->

        <div class="form-section">
          
          <div class="part-banner">
            <div class="part-label">PART II</div>
            <div class="part-title">FARM PROFILE</div>
          </div>

          <!--  Livelihood  -->
          <div class="subsection">
            <div class="subsection-title">MAIN LIVELIHOOD</div>
            <div class="subsection-body">
              <div class="radio-row wrap">
                <label v-for="lv in livelihoodTypes" :key="lv.value"
                  class="radio-pill" :class="{ active: farmer.livelihood_type === lv.value }">
                  <input type="radio" v-model="farmer.livelihood_type" :value="lv.value" @change="onLivelihoodTypeChange" class="r-hidden" />
                  <span class="r-dot"></span> {{ lv.label }}
                </label>
              </div>
            </div>
          </div>

          <!--  Other livelihood detail -->
          <div class="subsection" v-if="farmer.livelihood_type === 'Other'">
            <div class="subsection-title">OTHER LIVELIHOOD</div>
            <div class="subsection-body">
              <div class="field-wrap">
                <label class="flabel req">SPECIFY MAIN LIVELIHOOD</label>
                <ion-input
                  v-model="farmer.livelihood_detail"
                  class="finput compact"
                  placeholder="Type other livelihood"
                />
              </div>
            </div>
          </div>

        </div><!-- /PART 2 -->

        <!-- Part 3 -->
        <div class="form-section">

          <div class="part-banner">
            <div class="part-label">PART III</div>
            <div class="part-title">FARM PLOT INFORMATION</div>
          </div>

          <div class="plot-matrix-wrap">
            <table class="plot-matrix">
              <thead>
                <tr>
                  <th>#</th>
                  <th>LOCATION (BARANGAY)</th>
                  <th>COMMODITY</th>
                  <th>SIZE (ha)</th>
                  <th>TENURIAL STATUS</th>
                  <th>PROOF OF OWNERSHIP</th>
                  <th>COORDINATES / GEOREF</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(plot, idx) in farmPlots" :key="idx">
                  <tr>
                    <td class="plot-index">{{ idx + 1 }}</td>
                    <td>
                      <ion-select v-model="plot.location_brgy" interface="popover" class="matrix-select" placeholder="Barangay" :disabled="plot.outside_echague">
                        <ion-select-option v-for="barangay in ECHAGUE_BARANGAYS" :key="barangay" :value="barangay">{{ barangay }}</ion-select-option>
                      </ion-select>
                    </td>
                    <td>
                      <ion-select v-model="plot.commodity" interface="popover" class="matrix-select" placeholder="Commodity" @ionChange="onCommodityChange(plot)">
                        <ion-select-option v-for="commodity in commodityOptions" :key="commodity" :value="commodity">{{ commodity }}</ion-select-option>
                      </ion-select>
                    </td>
                    <td><ion-input :value="plot.size_ha || plot.total_parcel_area_ha" type="number" step="0.0001" class="matrix-input" placeholder="0.0000" @ionInput="plot.size_ha = $event.detail.value ?? ''; plot.total_parcel_area_ha = $event.detail.value ?? ''" /></td>
                    <td>
                      <ion-select v-model="plot.ownership_type" interface="popover" class="matrix-select" placeholder="Status" @ionChange="syncPlotTenurialDocument(plot)">
                        <ion-select-option v-for="status in ownershipTypes" :key="status" :value="status">{{ status }}</ion-select-option>
                      </ion-select>
                    </td>
                    <td>
                      <ion-select v-model="plot.proof_of_ownership_document" interface="popover" class="matrix-select" placeholder="Document" @ionChange="syncPlotTenurialDocument(plot)">
                        <ion-select-option v-for="document in tenurialDocumentOptions(plot)" :key="document" :value="document">{{ document }}</ion-select-option>
                      </ion-select>
                    </td>
                    <td><ion-input v-model="plot.remarks" class="matrix-input" placeholder="Lat/Lng or code" /></td>
                    <td class="plot-actions">
                      <ion-button fill="clear" class="expand-plot-btn" :aria-label="expandedPlotIndex === idx ? 'Collapse parcel details' : 'Expand parcel details'" @click="togglePlotDetails(idx)">
                        {{ expandedPlotIndex === idx ? '▴' : '▾' }}
                      </ion-button>
                      <ion-button v-if="farmPlots.length > 1" fill="clear" class="delete-plot-btn" aria-label="Delete parcel" @click="removePlot(idx)">✕</ion-button>
                    </td>
                  </tr>
                  <tr v-if="expandedPlotIndex === idx" class="plot-detail-row">
                    <td colspan="8">
                      <div class="plot-detail-grid">
                        <PsgcLocationPicker
                          class="plot-location-picker"
                          v-model:region="plot.location_region_helper"
                          v-model:province="plot.location_province"
                          v-model:city="plot.location_city"
                          v-model:barangay="plot.location_brgy"
                          v-model:outside-echague="plot.outside_echague"
                          :include-region="plot.outside_echague"
                        />
                        <div class="field-wrap">
                          <label class="flabel">LAND OWNER</label>
                          <ion-input v-model="plot.land_owner_first_name" class="finput" placeholder="First name" />
                        </div>
                        <div class="field-wrap">
                          <label class="flabel">LAND OWNER SURNAME</label>
                          <ion-input v-model="plot.land_owner_surname" class="finput" placeholder="Surname" />
                        </div>
                        <div class="field-wrap">
                          <label class="flabel">FARM TYPE</label>
                          <ion-select v-model="plot.farm_type" interface="popover" class="fselect" placeholder="Select farm type">
                            <ion-select-option v-for="farmType in farmTypes" :key="farmType" :value="farmType">{{ farmType }}</ion-select-option>
                          </ion-select>
                        </div>
                        <div class="field-wrap">
                          <label class="flabel">LAND OWNER RSBSA NO.</label>
                          <ion-input v-model="plot.land_owner_rsbsa_no" class="finput" placeholder="Optional reference" />
                        </div>
                        <div class="plot-detail-flags">
                          <ion-checkbox v-model="plot.is_ancestral_domain" class="fcheck" @ionChange="syncPlotTenurialDocument(plot)" />
                          <span class="chk-label">Ancestral domain</span>
                          <ion-checkbox v-model="plot.is_agrarian_reform_beneficiary" class="fcheck" @ionChange="syncPlotTenurialDocument(plot)" />
                          <span class="chk-label">Agrarian reform beneficiary</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <div class="add-plot-wrap">
            <ion-button fill="outline" expand="block" class="add-plot-btn" @click="addPlot">
              + ADD FARM PARCEL
            </ion-button>
            <div class="plot-tally">
              Total Declared Area: <strong>{{ totalFarmArea }} ha</strong>
            </div>
          </div>

        </div>

        <!-- pang error -->
        <div v-if="errorMsg" class="error-banner">
          <span>Error: </span> {{ errorMsg }}
        </div>

        <!--  SUBMIT button-->
        <ion-button expand="block" class="submit-btn" :disabled="isSubmitting" @click="submitForm">
          <span v-if="isSubmitting">Submitting...</span>
          <span v-else>{{ isEdit ? 'SAVE FARMER RECORD' : 'SUBMIT ENROLLMENT FORM' }}</span>
        </ion-button>

        <div class="footer-line">
          Registry System for Basic Sectors in Agriculture &nbsp;|&nbsp; Department of Agriculture — Philippines
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonInput, IonSelect, IonSelectOption, IonButton, IonButtons,
  IonBackButton, IonCheckbox, IonTextarea,
  toastController,
} from "@ionic/vue";

import { reactive, ref, onMounted, computed } from "vue";
import axiosInstance from "@/utils/axios";
import { useRouter, useRoute } from "vue-router";
import PsgcLocationPicker from "@/components/PsgcLocationPicker.vue";
import SearchableSelect from "@/components/SearchableSelect.vue";
import { isOutsideEchagueCity } from "@/composables/usePsgcLocations";
import {
  tenurialDocumentOptions,
  tenurialDocumentHint,
  isOtherTenurialDocument,
} from "@/constants/rsbsaTenurialDocuments";
import {
  COMMODITY_OPTIONS,
  ECHAGUE_CITY,
  ECHAGUE_PROVINCE,
  ECHAGUE_REGION,
  ECHAGUE_BARANGAYS,
} from "@/data/echagueBarangays";

const router = useRouter();
const route = useRoute();
const permanentOutsideEchague = ref(false);
const provincialOutsideEchague = ref(false);

const editId = computed(() => String(route.query.id || "").trim());
const isEdit = computed(() => !!editId.value);

// Return to the farmer registry (admin) or technician home (tech uses QR lookup).
const farmersHome = computed(() =>
  router.currentRoute.value.path.startsWith("/tech") ? "/tech/dashboard" : "/admin/farmers"
);

/* state  */
const isSubmitting  = ref(false);
const errorMsg      = ref("");
const sameAddress   = ref(false);
const computedAge   = ref<number | "">("");

const showToast = async (msg: string, color: 'success' | 'danger' | 'warning' = 'success') => {
  const toast = await toastController.create({
    message: msg,
    duration: 3000,
    color,
    position: 'top',
  });
  await toast.present();
};

/* options  */
const civilStatusOptions = ["Single", "Married", "Widow/er", "Legally Separated"];
const educationOptions   = [
  "Pre-school","Elementary","High School non K-12",
  "Junior High School K-12","Senior High School K-12",
  "College","Vocational","Post-graduate","None",
];
const govIdTypes = [
  "PhilSys ID","GSIS UMID","SSS UMID","Driver's License","PRC ID",
  "Voter's ID","Passport","Postal ID","OFW ID","PWD ID","Senior Citizen ID","Others",
];
/** Labels follow DA RSBSA Form 01-2024; values stay API-compatible. */
const livelihoodTypes = [
  { value: "Farmer", label: "Farmer" },
  { value: "Farm Worker", label: "Farmworker" },
  { value: "Fisher", label: "Fisherfolk" },
  { value: "Agri-Youth", label: "Agri-youth" },
  { value: "Other", label: "Other" },
];
const ownershipTypes  = ["Registered Owner","Tenant","Lessee","Others"];
const farmTypes       = ["Irrigated","Rainfed Upland","Rainfed Lowland","Urban/Peri-Urban","Other"];
const needsLandOwner  = (plot: { ownership_type: string }) =>
  plot.ownership_type === "Tenant" || plot.ownership_type === "Lessee";
const isHighValueCommodity = (commodity: string) =>
  /high[\s-]?value/i.test(String(commodity || ""));
const onCommodityChange = (plot: { commodity: string; no_of_heads_or_trees: string | number }) => {
  if (!isHighValueCommodity(plot.commodity)) plot.no_of_heads_or_trees = "";
};

const onLivelihoodTypeChange = () => { farmer.livelihood_detail = ""; };

/* farmer details */
const farmer = reactive({
  rsbsa_no: "",
  transaction_code: "", 
  photo_path: "",
  surname: "", 
  first_name: "", 
  middle_name: "", 
  ext_name: "",
  no_middle_name: false, 
  no_ext_name: false, 
  sex: "",
  permanent_house_no: "", 
  permanent_street: "", 
  permanent_brgy: "",
  permanent_city: "Echague", 
  permanent_province: "Isabela", 
  permanent_region: "Region II",
  provincial_house_no: "", 
  provincial_street: "", 
  provincial_brgy: "",
  provincial_city: "", 
  provincial_province: "", 
  provincial_region: "",
  birthdate: "", 
  place_of_birth_region_helper: "",
  place_of_birth_city: "", 
  place_of_birth_province: "",
  mobile_number: "", 
  is_mobile_owner: true,
  mobile_owner_first_name: "", 
  mobile_owner_middle_name: "",
  mobile_owner_surname: "", 
  mobile_owner_ext_name: "",
  mothers_maiden_first_name: "", 
  mothers_maiden_middle_name: "",
  mothers_maiden_surname: "", 
  mothers_maiden_ext_name: "",
  civil_status: "", 
  spouse_first_name: "", 
  spouse_middle_name: "",
  spouse_surname: "", 
  spouse_ext_name: "",
  highest_education: "", 
  religion: "",
  id_type: "",
  id_type_other: "",
  id_number: "",
  is_icc_ip: false, 
  icc_ip_name: "", 
  is_pwd: false, 
  is_4ps_beneficiary: false,
  association_1: "", 
  association_2: "", 
  association_3: "",
  livelihood_type: "",
  livelihood_detail: "",
});

/* ── farm plots ── */
const createPlot = () => ({
  id: "" as string,
  location_region_helper: ECHAGUE_REGION,
  outside_echague: false,
  location_brgy: "", 
  location_city: ECHAGUE_CITY, 
  location_province: ECHAGUE_PROVINCE,
  total_parcel_area_ha: "" as string|number,
  is_ancestral_domain: false, 
  is_agrarian_reform_beneficiary: false,
  ownership_type: "",
  ownership_type_other: "",
  land_owner_first_name: "",
  land_owner_middle_name: "",
  land_owner_surname: "",
  land_owner_ext_name: "", 
  land_owner_rsbsa_no: "",
  proof_of_ownership_document: "",
  proof_of_ownership_other: "",
  commodity: "", 
  size_ha: "" as string|number,
  no_of_heads_or_trees: "" as string|number,
  farm_type: "",
  farm_type_other: "",
  is_organic: false, 
  cropping_schedule: "",
  rotational_tiller_full_name: "",
  rotational_tiller_surname: "",
  rotational_tiller_first_name: "",
  rotational_tiller_middle_name: "",
  remarks: "",
});
const farmPlots = reactive([createPlot()]);
const expandedPlotIndex = ref<number | null>(null);
const commodityOptions = computed(() => {
  const extra = farmPlots
    .map((p) => p.commodity)
    .filter((c) => c && !(COMMODITY_OPTIONS as readonly string[]).includes(c));
  return [...COMMODITY_OPTIONS, ...Array.from(new Set(extra))];
});
const addPlot    = () => farmPlots.push(createPlot());
const totalFarmArea = computed(() =>
  farmPlots.reduce((sum, p) => sum + (parseFloat(String(p.size_ha)) || 0), 0).toFixed(4)
);
const removePlot = (i: number) => farmPlots.splice(i, 1);
const togglePlotDetails = (i: number) => {
  expandedPlotIndex.value = expandedPlotIndex.value === i ? null : i;
};

/* age compute */
const computeAge = () => {
  if (!farmer.birthdate) { computedAge.value = ""; return; }
  const birth = new Date(farmer.birthdate), now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  computedAge.value = age;
};

const onNoMiddleName = () => { if (farmer.no_middle_name) farmer.middle_name = ""; };
const onNoExtName    = () => { if (farmer.no_ext_name)    farmer.ext_name = ""; };
const onSameAddress  = () => {
  if (sameAddress.value) {
    farmer.provincial_house_no = farmer.permanent_house_no;
    farmer.provincial_street   = farmer.permanent_street;
    farmer.provincial_brgy     = farmer.permanent_brgy;
    farmer.provincial_city     = farmer.permanent_city;
    farmer.provincial_province = farmer.permanent_province;
    farmer.provincial_region   = farmer.permanent_region;
    provincialOutsideEchague.value = permanentOutsideEchague.value;
  } else {
    farmer.provincial_house_no = farmer.provincial_street = farmer.provincial_brgy =
    farmer.provincial_city     = farmer.provincial_province = farmer.provincial_region = "";
    provincialOutsideEchague.value = false;
  }
};

const onPermanentLocationChange = () => {
  if (sameAddress.value) onSameAddress();
};

const syncPlotTenurialDocument = (plot: ReturnType<typeof createPlot>) => {
  const options = tenurialDocumentOptions(plot);
  if (plot.proof_of_ownership_document && !options.includes(plot.proof_of_ownership_document)) {
    plot.proof_of_ownership_document = "";
  }
};

/* ── Auto-Generate Transaction Code ── */
const generateTransactionCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  // Generates 4 random uppercase letters/numbers
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase(); 
  
  return `ECH-${year}${month}-${randomStr}`; // e.g., ECH-202606-A1B2
};

const applyFarmerRecord = (data: any) => {
  const skip = new Set(['farm_plots', 'farmPlots', 'distributions', 'photo_base64', 'place_of_birth_region_helper']);
  Object.keys(farmer).forEach((key) => {
    if (skip.has(key)) return;
    if (data[key] !== undefined && data[key] !== null) {
      (farmer as any)[key] = data[key];
    }
  });
  farmer.no_middle_name = !!data.no_middle_name;
  farmer.no_ext_name = !!data.no_ext_name;
  farmer.is_mobile_owner = data.is_mobile_owner !== false;
  farmer.is_icc_ip = !!data.is_icc_ip;
  farmer.is_pwd = !!data.is_pwd;
  farmer.is_4ps_beneficiary = !!data.is_4ps_beneficiary;
  if (data.birthdate) {
    farmer.birthdate = String(data.birthdate).slice(0, 10);
    computeAge();
  }
  permanentOutsideEchague.value = isOutsideEchagueCity(farmer.permanent_city);
  provincialOutsideEchague.value = isOutsideEchagueCity(farmer.provincial_city);
  const plots = data.farm_plots || data.farmPlots || [];
  farmPlots.splice(0, farmPlots.length);
  if (plots.length) {
    plots.forEach((p: any) => {
      const row = createPlot();
      Object.assign(row, {
        id: p.id || '',
        outside_echague: isOutsideEchagueCity(p.location_city || ECHAGUE_CITY),
        location_brgy: p.location_brgy || '',
        location_city: p.location_city || ECHAGUE_CITY,
        location_province: p.location_province || ECHAGUE_PROVINCE,
        total_parcel_area_ha: p.total_parcel_area_ha ?? '',
        is_ancestral_domain: !!p.is_ancestral_domain,
        is_agrarian_reform_beneficiary: !!p.is_agrarian_reform_beneficiary,
        ownership_type: p.ownership_type || '',
        ownership_type_other: p.ownership_type_other || '',
        land_owner_first_name: p.land_owner_first_name || '',
        land_owner_middle_name: p.land_owner_middle_name || '',
        land_owner_surname: p.land_owner_surname || '',
        land_owner_ext_name: p.land_owner_ext_name || '',
        land_owner_rsbsa_no: p.land_owner_rsbsa_no || '',
        proof_of_ownership_document: p.proof_of_ownership_document || '',
        proof_of_ownership_other: p.proof_of_ownership_other || '',
        commodity: p.commodity || '',
        size_ha: p.size_ha ?? '',
        no_of_heads_or_trees: p.no_of_heads_or_trees ?? '',
        farm_type: p.farm_type || '',
        farm_type_other: p.farm_type_other || '',
        is_organic: !!p.is_organic,
        cropping_schedule: p.cropping_schedule || '',
        rotational_tiller_full_name: p.rotational_tiller_full_name || '',
        rotational_tiller_surname: p.rotational_tiller_surname || '',
        rotational_tiller_first_name: p.rotational_tiller_first_name || '',
        rotational_tiller_middle_name: p.rotational_tiller_middle_name || '',
        remarks: p.remarks || '',
      });
      farmPlots.push(row);
    });
  } else {
    farmPlots.push(createPlot());
  }
};

const loadFarmerForEdit = async () => {
  try {
    const res = await axiosInstance.get(`/farmers/${editId.value}`);
    const data = res.data?.data;
    if (!data) throw new Error('empty');
    applyFarmerRecord(data);
  } catch {
    errorMsg.value = 'Could not load this farmer record for editing.';
    await showToast('Could not load farmer record.', 'danger');
  }
};

// Trigger when the page loads
onMounted(async () => {
  if (isEdit.value) {
    await loadFarmerForEdit();
    return;
  }
  farmer.transaction_code = generateTransactionCode();
  farmer.rsbsa_no = "";
});

/* validation */
const validate = (): boolean => {
  errorMsg.value = "";
  const req = (v: string, msg: string) => { if (!v.trim()) { errorMsg.value = msg; return false; } return true; };
  
  // FIX 3: Added Transaction Code Validation
  if (!req(farmer.transaction_code,  "Transaction Code is required.")) return false;
  if (!req(farmer.surname,           "Surname is required."))          return false;
  if (!req(farmer.first_name,        "First Name is required."))       return false;
  if (!farmer.sex)                   { errorMsg.value = "Sex is required."; return false; }
  if (!farmer.birthdate)             { errorMsg.value = "Birthdate is required."; return false; }
  if (!req(farmer.permanent_brgy,    "Permanent Barangay is required."))   return false;
  if (!req(farmer.permanent_city,    "Permanent Municipality/City is required.")) return false;
  if (!req(farmer.permanent_province,"Permanent Province is required."))   return false;
  if (!req(farmer.permanent_region,  "Permanent Region is required."))     return false;
  if (!req(farmer.mobile_number,     "Mobile Number is required."))        return false;
  if (!/^\d{11}$/.test(farmer.mobile_number)) { errorMsg.value = "Mobile number must be exactly 11 digits."; return false; }
  if (!req(farmer.mothers_maiden_surname,   "Mother's Maiden Surname is required."))    return false;
  if (!req(farmer.mothers_maiden_first_name,"Mother's Maiden First Name is required.")) return false;
  if (!farmer.civil_status)          { errorMsg.value = "Civil Status is required."; return false; }
  if (!farmer.highest_education)     { errorMsg.value = "Highest Education is required."; return false; }
  if (!farmer.livelihood_type)       { errorMsg.value = "Livelihood type is required."; return false; }
  if (farmer.livelihood_type === 'Other' && !farmer.livelihood_detail.trim()) {
    errorMsg.value = "Please specify the main livelihood.";
    return false;
  }
  if (farmer.id_type === 'Others' && !farmer.id_type_other.trim()) {
    errorMsg.value = "Please specify the government ID type.";
    return false;
  }
  
  for (let i = 0; i < farmPlots.length; i++) {
    const p = farmPlots[i], n = `Farm Plot ${i+1}`;
    if (!p.location_brgy.trim())               { errorMsg.value = `${n}: Barangay is required.`;             return false; }
    if (!p.location_city.trim())               { errorMsg.value = `${n}: Municipality/City is required.`;    return false; }
    if (!p.location_province.trim())           { errorMsg.value = `${n}: Province is required.`;             return false; }
    if (!p.total_parcel_area_ha)               { errorMsg.value = `${n}: Total Parcel Area is required.`;    return false; }
    if (!p.ownership_type)                     { errorMsg.value = `${n}: Ownership Type is required.`;       return false; }
    if (p.ownership_type === 'Others' && !p.ownership_type_other.trim()) {
      errorMsg.value = `${n}: Please specify the ownership / tenurial status.`;
      return false;
    }
    if (needsLandOwner(p)) {
      if (!p.land_owner_first_name.trim())     { errorMsg.value = `${n}: Landowner first name is required for tenants/lessees.`; return false; }
      if (!p.land_owner_surname.trim())        { errorMsg.value = `${n}: Landowner surname is required for tenants/lessees.`;    return false; }
      if (!p.land_owner_rsbsa_no.trim())       { errorMsg.value = `${n}: Landowner RSBSA number is required for tenants/lessees.`; return false; }
    }
    if (!p.proof_of_ownership_document.trim()) { errorMsg.value = `${n}: Proof of Ownership is required.`;   return false; }
    if (isOtherTenurialDocument(p.proof_of_ownership_document) && !p.proof_of_ownership_other.trim()) {
      errorMsg.value = `${n}: Please specify the proof of ownership document.`;
      return false;
    }
    if (!p.commodity.trim())                   { errorMsg.value = `${n}: Commodity is required.`;            return false; }
    if (!p.size_ha)                            { errorMsg.value = `${n}: Farm Size (ha) is required.`;       return false; }
    if (!p.farm_type)                          { errorMsg.value = `${n}: Farm Type is required.`;            return false; }
    if (p.farm_type === 'Other' && !p.farm_type_other.trim()) {
      errorMsg.value = `${n}: Please specify the farm type.`;
      return false;
    }
  }
  return true;
};

/* ── submit ── */
const submitForm = async () => {
  if (!validate()) {
    document.querySelector(".error-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  isSubmitting.value = true;
  errorMsg.value = ""; // clear previous errors

  try {
    const plots = farmPlots.map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      location_brgy: p.location_brgy,
      location_city: p.location_city,
      location_province: p.location_province,
      total_parcel_area_ha: p.total_parcel_area_ha,
      is_ancestral_domain: !!p.is_ancestral_domain,
      is_agrarian_reform_beneficiary: !!p.is_agrarian_reform_beneficiary,
      ownership_type: p.ownership_type,
      ownership_type_other: p.ownership_type === 'Others' ? (p.ownership_type_other || null) : null,
      land_owner_first_name: p.land_owner_first_name || null,
      land_owner_middle_name: p.land_owner_middle_name || null,
      land_owner_surname: p.land_owner_surname || null,
      land_owner_ext_name: p.land_owner_ext_name || null,
      land_owner_rsbsa_no: p.land_owner_rsbsa_no || null,
      proof_of_ownership_document: p.proof_of_ownership_document,
      proof_of_ownership_other: isOtherTenurialDocument(p.proof_of_ownership_document)
        ? (p.proof_of_ownership_other || null)
        : null,
      commodity: p.commodity,
      size_ha: p.size_ha,
      no_of_heads_or_trees: isHighValueCommodity(p.commodity)
        ? (p.no_of_heads_or_trees === '' ? null : p.no_of_heads_or_trees)
        : null,
      farm_type: p.farm_type,
      farm_type_other: p.farm_type === 'Other' ? (p.farm_type_other || null) : null,
      is_organic: !!p.is_organic,
      cropping_schedule: p.cropping_schedule || null,
      rotational_tiller_surname: p.rotational_tiller_surname || null,
      rotational_tiller_first_name: p.rotational_tiller_first_name || null,
      rotational_tiller_middle_name: p.rotational_tiller_middle_name || null,
      rotational_tiller_full_name: [p.rotational_tiller_first_name, p.rotational_tiller_middle_name, p.rotational_tiller_surname]
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .join(' ') || null,
      remarks: p.remarks || null,
    }));

    const { place_of_birth_region_helper: _birthRegionHelper, ...farmerPayload } = farmer;

    const payload = {
      ...farmerPayload,
      id_type_other: farmer.id_type === 'Others' ? (farmer.id_type_other || null) : null,
      rsbsa_no: isEdit.value ? (farmer.rsbsa_no || null) : null,
      plots,
    };

    const res = isEdit.value
      ? await axiosInstance.patch(`/farmers/${editId.value}`, payload)
      : await axiosInstance.post('/farmers', payload);
    
    if (res.data.status === 'success' || res.status === 200 || res.status === 201) {
      const assigned = res.data?.data?.rsbsa_no;
      await showToast(
        isEdit.value
          ? 'Farmer record updated.'
          : (assigned ? `Farmer enrolled. RSBSA: ${assigned}` : 'Farmer enrolled successfully!'),
        'success',
      );
      router.push(farmersHome.value);
    }
  } catch (err: any) {
    if (err.response?.status === 422) {
      const laravelErrors = err.response.data.errors;
      const firstErrorKey = Object.keys(laravelErrors)[0];
      errorMsg.value = `Validation Error: ${laravelErrors[firstErrorKey][0]}`;
    } 
    // ADD THIS: Reveal the exact database crash generated by the FarmerController
    else if (err.response?.status === 500 && err.response?.data?.error) {
      errorMsg.value = `SQL Crash: ${err.response.data.error}`;
    } 
    else {
      errorMsg.value = err?.response?.data?.message ?? "Something went wrong. Please check your connection.";
    }
    
    document.querySelector(".error-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* ═══════ DESIGN TOKENS — auto light / dark ═══════ */
.page-wrapper {
  /* Light mode */
  --bg-page:       #f2efea;
  --bg-card:       #ffffff;
  --bg-sub:        #f8f7f5;
  --bg-input:      #ffffff;
  --bg-input-dis:  #efefef;

  --c-text:        #1a1a1a;
  --c-text-soft:   #555555;
  --c-label:       #1a4731;
  --c-border:      #999999;
  --c-border-in:   #b0b0b0;

  --c-green:       #1a4731;
  --c-green-mid:   #2a6648;
  --c-green-lt:    #3d8b5e;
  --c-gold:        #c8a227;
  --c-red:         #c0392b;
  --c-note-bg:     #fffef5;
  --c-note-border: #c8a227;

  --part-head-bg:  #1a4731;
  --part-head-txt: #ffffff;
  --sub-head-bg:   #e8f0eb;
  --sub-head-txt:  #1a4731;
  --sub-border:    #2a6648;

  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 16px 64px;
}

@media (prefers-color-scheme: dark) {
  .page-wrapper {
    --bg-page:       #0f1a14;
    --bg-card:       #1a2820;
    --bg-sub:        #1e3028;
    --bg-input:      #243328;
    --bg-input-dis:  #1a2820;

    --c-text:        #e8ede9;
    --c-text-soft:   #9ab09e;
    --c-label:       #7ecb98;
    --c-border:      #3d5e47;
    --c-border-in:   #4a7059;

    --c-green:       #2a6648;
    --c-green-mid:   #3d8b5e;
    --c-green-lt:    #5aa87a;
    --c-gold:        #e9c95a;
    --c-red:         #e05a4e;
    --c-note-bg:     #1f2a1a;
    --c-note-border: #c8a227;

    --part-head-bg:  #2a6648;
    --part-head-txt: #ffffff;
    --sub-head-bg:   #1e3028;
    --sub-head-txt:  #7ecb98;
    --sub-border:    #3d8b5e;
  }
}

/* ═══════ GLOBAL ═══════ */
.rsbsa-toolbar { --background: #1a4731; --color: #fff; }
.toolbar-title { font-weight: 700; letter-spacing: .4px; color: #fff; }
.back-btn { --color: #fff; }

.rsbsa-content { --background: #f2efea; }

/* ═══════ LETTERHEAD ═══════ */
.letterhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid #d5d9d6;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(26, 71, 49, 0.04);
}
.lh-left { display: flex; align-items: center; gap: 14px; }
.lh-seal {
  position: relative; width: 56px; height: 56px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.seal-outer, .seal-inner {
  position: absolute; border-radius: 50%; border: 2px solid var(--c-green);
}
.seal-outer { width: 54px; height: 54px; }
.seal-inner { width: 38px; height: 38px; }
.seal-text  { font-size: 14px; font-weight: 900; color: var(--c-green); z-index: 1; }
.lh-agency  { font-size: 9px; font-weight: 700; letter-spacing: .6px; color: var(--c-green-mid); text-transform: uppercase; }
.lh-main    { font-size: 20px; font-weight: 900; color: var(--c-green); line-height: 1.2; }

.lh-right { display: flex; align-items: flex-start; gap: 10px; }
.copy-badge {
  display: flex; flex-direction: column; align-items: center;
  background: var(--c-green); color: #fff;
  padding: 4px 10px; border-radius: 3px; line-height: 1.1;
}
.copy-num { font-size: 22px; font-weight: 900; }
.copy-num sup { font-size: 12px; }
.copy-lbl { font-size: 9px; letter-spacing: 1px; }

.photo-capture-box {
  width: 80px; height: 80px;
  border: 2px dashed var(--c-border);
  border-radius: 4px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; overflow: hidden; gap: 2px;
  transition: border-color 0.2s;
}
.photo-capture-box:hover { border-color: var(--c-green); }
.photo-cap-lbl { font-size: 9px; font-weight: 800; color: var(--c-label); }
.photo-cap-sub { font-size: 8px; color: var(--c-text-soft); }
.photo-preview-img { width: 100%; height: 100%; object-fit: cover; }

/* ═══════ TRANSACTION ROW ═══════ */
.tx-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
  margin-bottom: 12px;
  align-items: start;
}

/* ═══════ FORM SECTION ═══════ */
.form-section {
  background: var(--bg-card);
  border: 1px solid #d5d9d6;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: visible;
  box-shadow: 0 1px 2px rgba(26, 71, 49, 0.04);
}

/* Keep part banner corners tidy without clipping field borders */
.part-banner {
  display: flex;
  align-items: stretch;
  background: var(--part-head-bg);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  position: sticky;
  top: 0;
  z-index: 4;
}

/* ── Part Banner ── */
.part-label {
  background: var(--c-gold);
  color: var(--c-green);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-right: none;
}
.part-title {
  color: var(--part-head-txt);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .8px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
}

/* ── Subsection: spacing over stacked rules ── */
.subsection {
  border-bottom: none;
}
.subsection + .subsection {
  border-top: 1px solid #eef1ef;
}
.subsection:last-child { border-bottom: none; }

.subsection-title {
  background: transparent;
  color: var(--sub-head-txt);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .5px;
  padding: 14px 16px 2px;
  border-bottom: none;
  text-transform: uppercase;
}
.subsection-body {
  padding: 10px 16px 18px;
  overflow: visible;
}

/* ═══════ GRID ═══════ */
.fgrid {
  display: grid;
  gap: 14px 16px;
  align-items: start;
}
.g1 { grid-template-columns: 1fr; }
.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.mt4 { margin-top: 4px; }
.mt6 { margin-top: 8px; }
.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.76rem;
  color: #64748b;
  line-height: 1.35;
}
.tenurial-doc-select :deep(.ss-menu) {
  max-width: min(560px, calc(100vw - 16px));
}

/* ═══════ FIELD ═══════ */
.field-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.flabel {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .35px;
  color: var(--c-label);
  text-transform: uppercase;
  margin: 0;
  line-height: 1.2;
  min-height: 14px;
}
.flabel.req::after { content: " *"; color: var(--c-red); }

/* Shared control rhythm — same height for input / select / barangay picker */
.finput,
.fselect,
.ftextarea {
  --control-h: 42px;
  --control-radius: 6px;
  --control-border: #94a3b8;
  --control-border-focus: #1a4731;
}

/* ═══════ INPUTS ═══════ */
.finput {
  --background: #ffffff;
  --color: #0f172a;
  --placeholder-color: #64748b;
  --placeholder-opacity: 1;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 0;
  --padding-bottom: 0;
  --highlight-height: 0;
  border: 1.5px solid var(--control-border);
  border-radius: var(--control-radius);
  font-size: 13px;
  min-height: var(--control-h);
  height: auto;
  max-height: none;
  background: #ffffff;
  color: #0f172a;
  box-shadow: none;
  margin: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
}
.finput.compact {
  max-width: 16rem;
}
.fselect.compact {
  max-width: 16rem;
}
@media (max-width: 640px) {
  .finput.compact,
  .fselect.compact {
    max-width: 100%;
  }
}
.finput.ion-focused,
.finput:focus-within {
  border-color: var(--control-border-focus);
  outline: 2px solid rgba(26, 71, 49, 0.18);
  outline-offset: 1px;
  box-shadow: none;
}
.finput[disabled] {
  --background: var(--bg-input-dis);
  opacity: .65;
}
.finput::part(native) {
  min-width: 0;
  width: 100%;
  overflow: visible;
  text-overflow: clip;
}

.fselect {
  --background: #ffffff;
  --color: #0f172a;
  --placeholder-color: #64748b;
  --padding-start: 12px;
  --padding-end: 28px;
  --padding-top: 0;
  --padding-bottom: 0;
  --highlight-height: 0;
  background: #ffffff;
  color: #0f172a;
  border: 1.5px solid var(--control-border);
  border-radius: var(--control-radius);
  padding-inline: 12px;
  font-size: 13px;
  min-height: var(--control-h);
  height: auto;
  max-height: none;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-shadow: none;
  box-sizing: border-box;
  overflow: visible;
}
.fselect.ion-focused,
.fselect:focus-within {
  border-color: var(--control-border-focus);
  outline: 2px solid rgba(26, 71, 49, 0.18);
  outline-offset: 1px;
  box-shadow: none;
}
.fselect::part(container) {
  min-height: unset;
  height: auto;
  min-width: 0;
  width: 100%;
  align-items: center;
  overflow: visible;
}
.fselect::part(text),
.fselect::part(placeholder) {
  color: #0f172a;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  line-height: 1.25;
  word-break: break-word;
}
.fselect::part(placeholder) {
  color: #64748b;
  opacity: 1;
}
.fselect::part(icon) {
  color: #64748b;
  opacity: 1;
  margin-inline-start: 6px;
}

.ftextarea {
  --background: #ffffff;
  --color: #0f172a;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --highlight-height: 0;
  border: 1.5px solid var(--control-border);
  border-radius: var(--control-radius);
  font-size: 13px;
  min-height: 72px;
  height: auto;
  max-height: none;
  background: #ffffff;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: visible;
}
.ftextarea.ion-focused,
.ftextarea:focus-within {
  border-color: var(--control-border-focus);
  outline: 2px solid rgba(26, 71, 49, 0.18);
  outline-offset: 1px;
}

/* Keep SearchableSelect controls flush with sibling inputs in a row */
.field-wrap :deep(.ss) {
  width: 100%;
  max-width: 100%;
  overflow: visible;
}
.field-wrap :deep(.ss-label) {
  font-size: 10px;
  min-height: 14px;
  margin-bottom: 0;
  line-height: 1.2;
}
.field-wrap :deep(.ss-control) {
  min-height: 42px;
  height: auto;
  border: 1.5px solid #94a3b8;
  border-radius: 6px;
  padding: 0 8px 0 12px;
  box-sizing: border-box;
  overflow: visible;
}
.field-wrap :deep(.ss.open .ss-control) {
  border-color: #1a4731;
  outline: 2px solid rgba(26, 71, 49, 0.18);
  outline-offset: 1px;
  box-shadow: none;
}
.field-wrap :deep(.ss-input) {
  font-size: 13px;
  padding: 8px 0;
  overflow: visible;
  text-overflow: clip;
}
.narrow-field {
  max-width: 34rem;
}

/* ═══════ RADIO ═══════ */
.radio-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
}
.radio-row.wrap { flex-wrap: wrap; }

.radio-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid #c5ccd4;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text);
  background: #ffffff;
  cursor: pointer;
  user-select: none;
  transition: background .12s, border-color .12s, color .12s;
  white-space: nowrap;
  min-height: 36px;
}
.radio-pill.active {
  background: var(--c-green);
  border-color: var(--c-green);
  color: #ffffff;
}
.radio-pill.active .r-dot { border-color: #fff; }
.radio-pill.active .r-dot::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #fff;
}

.r-hidden { display: none; }
.r-dot {
  width: 14px; height: 14px;
  border: 2px solid var(--c-border);
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  transition: border-color .12s;
}

/* ═══════ CHECKBOXES ═══════ */
.chk-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.inline-chk {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
}
.ncr-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #fbfaf3;
  border: 1px solid #e6d9a8;
  border-radius: 6px;
  padding: 8px 10px;
  margin-top: 10px;
}
.chk-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-text);
  cursor: pointer;
  line-height: 1.4;
}
.chk-sep { display: inline-block; width: 16px; }
.fcheck { --size: 17px; flex-shrink: 0; }

/* ═══════ FARM PARCEL MATRIX ═══════ */
.plot-matrix-wrap {
  overflow-x: auto;
  margin: 12px 16px 0;
  border: 1px solid #cfd8d2;
  border-radius: 6px;
  background: #ffffff;
}
.plot-matrix {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
}
.plot-matrix th {
  background: #1a4731;
  color: #ffffff;
  padding: 8px 6px;
  text-align: left;
  font-size: 9px;
  letter-spacing: .35px;
}
.plot-matrix th:nth-child(1) { width: 34px; text-align: center; }
.plot-matrix th:nth-child(2) { width: 150px; }
.plot-matrix th:nth-child(3) { width: 115px; }
.plot-matrix th:nth-child(4) { width: 88px; }
.plot-matrix th:nth-child(5) { width: 145px; }
.plot-matrix th:nth-child(6) { width: 150px; }
.plot-matrix th:nth-child(7) { width: 145px; }
.plot-matrix th:nth-child(8) { width: 70px; }
.plot-matrix td {
  padding: 4px 5px;
  border-top: 1px solid #e4e9e5;
  vertical-align: middle;
}
.plot-matrix tbody tr:nth-child(4n + 1) { background: #fbfcfb; }
.plot-index { text-align: center; font-weight: 800; color: var(--c-green); }
.matrix-input, .matrix-select { width: 100%; --padding-start: 5px; --padding-end: 5px; }
.matrix-input { min-height: 34px; }
.matrix-select { min-height: 34px; font-size: 11px; }
.plot-actions { white-space: nowrap; text-align: center; }
.expand-plot-btn, .delete-plot-btn { margin: 0; min-width: 24px; --padding-start: 4px; --padding-end: 4px; }
.expand-plot-btn { --color: var(--c-green); font-weight: 800; }
.delete-plot-btn { --color: var(--c-red); }
.plot-detail-row td { background: #f4f8f4; padding: 10px; }
.plot-detail-grid { display: grid; grid-template-columns: minmax(240px, 1.4fr) repeat(4, minmax(140px, 1fr)); gap: 10px; align-items: start; }
.plot-location-picker { grid-column: 1 / -1; }
.plot-detail-flags { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.tenant-flag {
  margin-left: 8px;
  background: var(--c-gold);
  color: var(--c-green);
  font-size: 8.5px;
  font-weight: 900;
  letter-spacing: .4px;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.add-plot-wrap { padding: 12px 16px 16px; }
.add-plot-btn {
  --border-color: #1a4731;
  --color: #1a4731;
  --border-width: 1px;
  --border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  height: 40px;
}

.organic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 4px;
}

/* ═══════ PROPORTIONAL WIDTH TOKENS ═══════ */
.w-xs    { max-width: 80px;  flex: 0 0 80px; }
.w-sm    { max-width: 100px; flex: 0 0 100px; }
.w-md    { max-width: 140px; flex: 0 0 140px; }
.w-mid   { max-width: 180px; flex: 0 0 180px; }
.w-std   { max-width: 200px; flex: 0 0 200px; }
.w-lg    { max-width: 240px; flex: 0 0 240px; }
.w-wide  { max-width: 260px; flex: 0 0 260px; }
.flex-fill { flex: 1 1 160px; min-width: 120px; }

/* ═══════ PROPORTIONAL FLEX ROWS ═══════ */
.name-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-start;
}
.name-surname { flex: 3 1 180px; min-width: 140px; }
.name-first   { flex: 3 1 180px; min-width: 140px; }
.name-middle  { flex: 2.5 1 150px; min-width: 120px; }
.name-ext     { flex: 0 0 100px; max-width: 100px; }

.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-start;
}

.addr-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-start;
}

.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-start;
}

/* ═══════ JURISDICTION BADGE ═══════ */
.jurisdiction-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--sub-head-bg);
  border: 1px solid var(--sub-border);
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--sub-head-txt);
  margin-left: 10px;
  vertical-align: middle;
  letter-spacing: 0;
  text-transform: none;
}

/* ═══════ COMPACT PSGC OVERRIDE ═══════ */
.psgc-compact :deep(.locked-grid) {
  display: none;
}
.psgc-compact {
  display: contents;
}
.psgc-compact :deep(.toggle-row) {
  flex: 0 0 100%;
  order: -1;
}
.psgc-compact :deep(.ss) {
  max-width: 260px;
  flex: 0 0 260px;
}

/* ═══════ FARM PLOT TALLY ═══════ */
.plot-tally {
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
  padding: 8px 4px 0;
  letter-spacing: 0.2px;
}
.plot-tally strong {
  color: var(--c-green);
  font-weight: 800;
  font-size: 14px;
}

/* ═══════ RESPONSIVE ═══════ */
@media (max-width: 1100px) {
  .g4 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .g3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .g4, .g3, .g2 { grid-template-columns: 1fr; }
  .narrow-field { max-width: none; }
  .tx-row { grid-template-columns: 1fr; }
  .letterhead { flex-direction: column; gap: 10px; align-items: flex-start; }
  .lh-right { align-self: flex-end; }
  .name-row, .demo-row, .addr-row, .contact-row {
    flex-direction: column;
  }
  .w-xs, .w-sm, .w-md, .w-mid, .w-std, .w-lg, .w-wide {
    max-width: none !important;
    flex: 1 1 auto;
  }
  .name-ext { max-width: none; flex: 1 1 auto; }
  .flex-fill { min-width: 0; }
  .psgc-compact :deep(.ss) {
    max-width: none;
    flex: 1 1 auto;
  }
  .plot-detail-grid { grid-template-columns: 1fr; }
}

/* ═══════ ERROR / SUBMIT ═══════ */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(192,57,43,.12);
  border: 1.5px solid var(--c-red);
  color: var(--c-red);
  border-radius: 4px;
  padding: 10px 14px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
}
.submit-btn {
  margin-top: 18px;
  height: 52px;
  --background: var(--c-green);
  --background-activated: var(--c-green-mid);
  --color: #fff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: .8px;
  border-radius: 4px;
}
.submit-btn[disabled] { opacity: .55; }

.footer-line {
  text-align: center;
  font-size: 10px;
  color: var(--c-text-soft);
  margin-top: 16px;
  letter-spacing: .3px;
}
</style>