<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="rsbsa-toolbar">
        <ion-buttons slot="start">
          <ion-back-button :default-href="farmersHome" class="back-btn" />
        </ion-buttons>
        <ion-title class="toolbar-title">RSBSA Enrollment Form</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rsbsa-content">
      <div class="page-wrapper">
        <div class="letterhead">
          <div class="lh-left">
            <div class="lh-seal">
              <div class="seal-outer"></div>
              <div class="seal-inner"></div>
              <img src="@/assets/images/mao-echague-logo.png" alt="MAO" style="width:36px;height:36px;object-fit:contain;z-index:1;" onerror="this.style.display='none'" />
            </div>
            <div class="lh-titles">
              <div class="lh-agency">REGISTRY SYSTEM FOR BASIC SECTORS IN AGRICULTURE</div>
              <div class="lh-main">RSBSA Enrollment Form</div>
            </div>
          </div>
          <div class="lh-right">
            <div class="photo-capture-box" @click="capturePhoto">
              <img v-if="photoPreview" :src="photoPreview" class="photo-preview-img" />
              <template v-else>
                <span style="font-size:1.5rem;color:var(--c-border)">📷</span>
                <span class="photo-cap-lbl">2x2 PHOTO</span>
                <span class="photo-cap-sub">Tap to capture</span>
              </template>
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
            <ion-input v-model="farmer.rsbsa_no" class="finput" placeholder="Auto-generated" />
          </div>
        </div>

        <!--Part 1-->
        <div class="form-section">
          <div class="part-banner">
            <div class="part-label">PART 1</div>
            <div class="part-title">PERSONAL INFORMATION</div>
          </div>

          <!-- Name-->
          <div class="subsection">
            <div class="subsection-title">NAME</div>
            <div class="subsection-body">
              <div class="fgrid g4">
                <div class="field-wrap">
                  <label class="flabel req">LAST NAME / SURNAME</label>
                  <ion-input v-model="farmer.surname" class="finput" placeholder="e.g. DELA CRUZ" />
                </div>
                <div class="field-wrap">
                  <label class="flabel req">FIRST NAME</label>
                  <ion-input v-model="farmer.first_name" class="finput" placeholder="e.g. JUAN" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">MIDDLE NAME</label>
                  <ion-input v-model="farmer.middle_name" class="finput" :disabled="farmer.no_middle_name" />
                  <div class="inline-chk">
                    <ion-checkbox v-model="farmer.no_middle_name" @ionChange="onNoMiddleName" class="fcheck" />
                    <span class="chk-label">No Middle Name</span>
                  </div>
                </div>
                <div class="field-wrap">
                  <label class="flabel">EXTENSION NAME</label>
                  <ion-input v-model="farmer.ext_name" class="finput" placeholder="Jr / Sr / III" :disabled="farmer.no_ext_name" />
                  <div class="inline-chk">
                    <ion-checkbox v-model="farmer.no_ext_name" @ionChange="onNoExtName" class="fcheck" />
                    <span class="chk-label">No Extension Name</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Personal Details -->
          <div class="subsection">
            <div class="subsection-title">PERSONAL DETAILS</div>
            <div class="subsection-body">
              <div class="fgrid g4">
                <div class="field-wrap">
                  <label class="flabel req">SEX</label>
                  <ion-select v-model="farmer.sex" interface="popover" class="fselect" placeholder="Select Sex">
                    <ion-select-option value="Male">Male</ion-select-option>
                    <ion-select-option value="Female">Female</ion-select-option>
                  </ion-select>
                </div>
                <div class="field-wrap">
                  <label class="flabel req">BIRTHDATE</label>
                  <ion-input type="date" v-model="farmer.birthdate" class="finput" @ionChange="computeAge" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">AGE</label>
                  <ion-input :value="computedAge" class="finput" readonly placeholder="Auto" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">RELIGION</label>
                  <ion-input v-model="farmer.religion" class="finput" placeholder="e.g. Roman Catholic" />
                </div>
              </div>
              <div class="fgrid g2 mt6">
                <div class="field-wrap">
                  <label class="flabel">PLACE OF BIRTH (City/Municipality)</label>
                  <ion-input v-model="farmer.place_of_birth_city" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">PLACE OF BIRTH (Province)</label>
                  <ion-input v-model="farmer.place_of_birth_province" class="finput" />
                </div>
              </div>
            </div>
          </div>

          <!-- Permanent Address -->
          <div class="subsection">
            <div class="subsection-title">PERMANENT ADDRESS</div>
            <div class="subsection-body">
              <div class="fgrid g3">
                <div class="field-wrap">
                  <label class="flabel">HOUSE NO.</label>
                  <ion-input v-model="farmer.permanent_house_no" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">STREET</label>
                  <ion-input v-model="farmer.permanent_street" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel req">BARANGAY</label>
                  <ion-input v-model="farmer.permanent_brgy" class="finput" />
                </div>
              </div>
              <div class="fgrid g3 mt6">
                <div class="field-wrap">
                  <label class="flabel req">MUNICIPALITY / CITY</label>
                  <ion-input v-model="farmer.permanent_city" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel req">PROVINCE</label>
                  <ion-input v-model="farmer.permanent_province" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel req">REGION</label>
                  <ion-input v-model="farmer.permanent_region" class="finput" />
                </div>
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
              <div class="fgrid g3">
                <div class="field-wrap">
                  <label class="flabel">HOUSE NO.</label>
                  <ion-input v-model="farmer.provincial_house_no" class="finput" :disabled="sameAddress" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">STREET</label>
                  <ion-input v-model="farmer.provincial_street" class="finput" :disabled="sameAddress" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">BARANGAY</label>
                  <ion-input v-model="farmer.provincial_brgy" class="finput" :disabled="sameAddress" />
                </div>
              </div>
              <div class="fgrid g3 mt6">
                <div class="field-wrap">
                  <label class="flabel">MUNICIPALITY / CITY</label>
                  <ion-input v-model="farmer.provincial_city" class="finput" :disabled="sameAddress" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">PROVINCE</label>
                  <ion-input v-model="farmer.provincial_province" class="finput" :disabled="sameAddress" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">REGION</label>
                  <ion-input v-model="farmer.provincial_region" class="finput" :disabled="sameAddress" />
                </div>
              </div>
            </div>
          </div>

          <!-- Contact  -->
          <div class="subsection">
            <div class="subsection-title">CONTACT INFORMATION</div>
            <div class="subsection-body">
              <div class="fgrid g2">
                <div class="field-wrap">
                  <label class="flabel req">MOBILE NUMBER</label>
                  <ion-input v-model="farmer.mobile_number" class="finput" placeholder="09XXXXXXXXX" :maxlength="11" />
                  <div class="inline-chk mt4">
                    <ion-checkbox v-model="farmer.is_mobile_owner" class="fcheck" />
                    <span class="chk-label">I am the owner of this mobile number</span>
                  </div>
                </div>
                <div class="field-wrap" v-if="!farmer.is_mobile_owner">
                  <label class="flabel">MOBILE NUMBER OWNER'S NAME</label>
                  <div class="fgrid g2">
                    <ion-input v-model="farmer.mobile_owner_first_name" class="finput" placeholder="First Name" />
                    <ion-input v-model="farmer.mobile_owner_middle_name" class="finput" placeholder="Middle Name" />
                  </div>
                  <div class="fgrid g2 mt6">
                    <ion-input v-model="farmer.mobile_owner_surname" class="finput" placeholder="Surname" />
                    <ion-input v-model="farmer.mobile_owner_ext_name" class="finput" placeholder="Ext. Name" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!--  Mother's Maiden Name  -->
          <div class="subsection">
            <div class="subsection-title">MOTHER'S MAIDEN NAME</div>
            <div class="subsection-body">
              <div class="fgrid g4">
                <div class="field-wrap">
                  <label class="flabel req">SURNAME</label>
                  <ion-input v-model="farmer.mothers_maiden_surname" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel req">FIRST NAME</label>
                  <ion-input v-model="farmer.mothers_maiden_first_name" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">MIDDLE NAME</label>
                  <ion-input v-model="farmer.mothers_maiden_middle_name" class="finput" />
                </div>
                <div class="field-wrap">
                  <label class="flabel">EXTENSION NAME</label>
                  <ion-input v-model="farmer.mothers_maiden_ext_name" class="finput" />
                </div>
              </div>
            </div>
          </div>

          <!-- Civil Status  -->
          <div class="subsection">
            <div class="subsection-title">CIVIL STATUS</div>
            <div class="subsection-body">
              <div class="fgrid g2">
                <div class="field-wrap">
                  <label class="flabel req">CIVIL STATUS</label>
                  <ion-select v-model="farmer.civil_status" interface="popover" class="fselect" placeholder="Select Civil Status">
                    <ion-select-option v-for="cs in civilStatusOptions" :key="cs" :value="cs">{{ cs }}</ion-select-option>
                  </ion-select>
                </div>
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
              </div>
            </div>
          </div>

          <!--  Education  -->
          <div class="subsection">
            <div class="subsection-title">HIGHEST EDUCATIONAL ATTAINMENT</div>
            <div class="subsection-body">
              <div class="field-wrap">
                <ion-select v-model="farmer.highest_education" interface="popover" class="fselect" placeholder="Select Educational Attainment">
                  <ion-select-option v-for="edu in educationOptions" :key="edu" :value="edu">{{ edu }}</ion-select-option>
                </ion-select>
              </div>
            </div>
          </div>

          <!--  Government ID -->
          <div class="subsection">
            <div class="subsection-title">GOVERNMENT-ISSUED IDENTIFICATION</div>
            <div class="subsection-body">
              <div class="fgrid g2">
                <div class="field-wrap">
                  <label class="flabel">ID TYPE</label>
                  <ion-select v-model="farmer.id_type" interface="popover" class="fselect" placeholder="Select ID Type">
                    <ion-select-option v-for="id in govIdTypes" :key="id" :value="id">{{ id }}</ion-select-option>
                  </ion-select>
                </div>
                <div class="field-wrap">
                  <label class="flabel">ID NUMBER</label>
                  <ion-input v-model="farmer.id_number" class="finput" />
                </div>
              </div>
            </div>
          </div>

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
            <div class="part-label">PART 2</div>
            <div class="part-title">LIVELIHOOD PROFILE</div>
          </div>

          <!--  Livelihood  -->
          <div class="subsection">
            <div class="subsection-title">LIVELIHOOD / TYPE OF FARMER</div>
            <div class="subsection-body">
              <div class="radio-row wrap">
                <label v-for="lv in livelihoodTypes" :key="lv"
                  class="radio-pill" :class="{ active: farmer.livelihood_type === lv }">
                  <input type="radio" v-model="farmer.livelihood_type" :value="lv" @change="onLivelihoodTypeChange" class="r-hidden" />
                  <span class="r-dot"></span> {{ lv }}
                </label>
              </div>
            </div>
          </div>

          <!--  Livelihood sub-classification (DA RSBSA) -->
          <div class="subsection" v-if="farmer.livelihood_type">
            <div class="subsection-title">SPECIFIC LIVELIHOOD CLASSIFICATION</div>
            <div class="subsection-body">
              <div class="field-wrap">
                <label class="flabel">CLASSIFICATION DETAIL</label>
                <ion-select v-model="farmer.livelihood_detail" interface="popover" class="fselect"
                  :placeholder="`Select ${farmer.livelihood_type} classification`">
                  <ion-select-option v-for="d in livelihoodDetailOptions" :key="d" :value="d">{{ d }}</ion-select-option>
                </ion-select>
              </div>
            </div>
          </div>

        </div><!-- /PART 2 -->

        <!-- Part 3 -->
        <div class="form-section">

          <div class="part-banner">
            <div class="part-label">PART 3</div>
            <div class="part-title">FARM PARCEL INFORMATION</div>
          </div>

          <div v-for="(plot, idx) in farmPlots" :key="idx" class="plot-card">

            <div class="plot-card-header">
              <span class="plot-num">FARM PLOT {{ idx + 1 }}</span>
              <ion-button v-if="farmPlots.length > 1" fill="clear" size="small"
                class="del-plot-btn" @click="removePlot(idx)">
                ✕ Remove Plot
              </ion-button>
            </div>

            <!-- Location -->
            <div class="subsection">
              <div class="subsection-title">LOCATION OF FARM PARCEL</div>
              <div class="subsection-body">
                <div class="fgrid g3">
                  <div class="field-wrap">
                    <label class="flabel req">BARANGAY</label>
                    <ion-input v-model="plot.location_brgy" class="finput" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel req">MUNICIPALITY / CITY</label>
                    <ion-input v-model="plot.location_city" class="finput" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel req">PROVINCE</label>
                    <ion-input v-model="plot.location_province" class="finput" />
                  </div>
                </div>
                <div class="fgrid g3 mt6">
                  <div class="field-wrap">
                    <label class="flabel">LATITUDE (GPS)</label>
                    <ion-input type="number" v-model="plot.latitude" class="finput" placeholder="e.g. 14.5995" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel">LONGITUDE (GPS)</label>
                    <ion-input type="number" v-model="plot.longitude" class="finput" placeholder="e.g. 120.9842" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel">GEOREF ID / GPX ID</label>
                    <ion-input v-model="plot.georef_id" class="finput" placeholder="e.g. GPX-ECH-0001" />
                  </div>
                </div>
                <ion-button fill="outline" size="small" class="gps-btn mt6"
                  :disabled="plot.locating" @click="useCurrentLocation(idx)">
                  <span v-if="plot.locating">Locating…</span>
                  <span v-else>Use current location</span>
                </ion-button>
              </div>
            </div>

            <!-- Ownership -->
            <div class="subsection">
              <div class="subsection-title">OWNERSHIP / TENURIAL STATUS</div>
              <div class="subsection-body">
                <div class="fgrid g2">
                  <div class="field-wrap">
                    <label class="flabel req">TOTAL PARCEL AREA (ha)</label>
                    <ion-input type="number" v-model="plot.total_parcel_area_ha" class="finput" placeholder="0.0000" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel req">TENURIAL STATUS</label>
                    <div class="radio-row wrap">
                      <label v-for="ot in ownershipTypes" :key="ot"
                        class="radio-pill" :class="{ active: plot.ownership_type === ot }">
                        <input type="radio" v-model="plot.ownership_type" :value="ot" class="r-hidden" />
                        <span class="r-dot"></span> {{ ot }}
                      </label>
                    </div>
                  </div>
                </div>
                <div class="chk-row mt6">
                  <ion-checkbox v-model="plot.is_ancestral_domain" class="fcheck" />
                  <span class="chk-label">Within Ancestral Domain</span>
                  <span class="chk-sep"></span>
                  <ion-checkbox v-model="plot.is_agrarian_reform_beneficiary" class="fcheck" />
                  <span class="chk-label">Agrarian Reform Beneficiary</span>
                </div>
              </div>
            </div>

            <!-- Land Owner -->
            <div class="subsection">
              <div class="subsection-title">
                LAND OWNER INFORMATION
                <span v-if="plot.ownership_type === 'Tenant'" class="tenant-flag">Required for Tenant</span>
              </div>
              <div class="subsection-body">
                <div class="fgrid g3">
                  <div class="field-wrap">
                    <label class="flabel" :class="{ req: plot.ownership_type === 'Tenant' }">LAND OWNER'S FIRST NAME</label>
                    <ion-input v-model="plot.land_owner_first_name" class="finput" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel" :class="{ req: plot.ownership_type === 'Tenant' }">LAND OWNER'S SURNAME</label>
                    <ion-input v-model="plot.land_owner_surname" class="finput" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel">LAND OWNER'S EXT. NAME</label>
                    <ion-input v-model="plot.land_owner_ext_name" class="finput" />
                  </div>
                </div>
                <div class="field-wrap mt6" v-if="plot.ownership_type === 'Tenant'">
                  <label class="flabel req">LAND OWNER'S RSBSA NO.</label>
                  <ion-input v-model="plot.land_owner_rsbsa_no" class="finput" placeholder="Landowner's RSBSA reference number" />
                </div>
                <div class="field-wrap mt6">
                  <label class="flabel req">PROOF OF OWNERSHIP / TENURIAL DOCUMENT</label>
                  <ion-input v-model="plot.proof_of_ownership_document" class="finput" placeholder="e.g. TCT, CLOA, Lease Contract" />
                </div>
              </div>
            </div>

            <!-- Commodity -->
            <div class="subsection">
              <div class="subsection-title">COMMODITY DETAILS</div>
              <div class="subsection-body">
                <div class="commodity-tbl">
                  <div class="ctbl-head">
                    <span>COMMODITY</span>
                    <span>SIZE (ha)</span>
                    <span>NO. OF HEADS / TREES</span>
                    <span>FARM TYPE</span>
                    <span>ORGANIC</span>
                  </div>
                  <div class="ctbl-body">
                    <ion-input v-model="plot.commodity" class="finput" placeholder="e.g. Rice, Corn, Livestock" />
                    <ion-input type="number" v-model="plot.size_ha" class="finput" placeholder="0.0000" />
                    <ion-input type="number" v-model="plot.no_of_heads_or_trees" class="finput" placeholder="0" />
                    <ion-select v-model="plot.farm_type" interface="popover" class="fselect" placeholder="Select">
                      <ion-select-option v-for="ft in farmTypes" :key="ft" :value="ft">{{ ft }}</ion-select-option>
                    </ion-select>
                    <div class="organic-cell">
                      <ion-checkbox v-model="plot.is_organic" class="fcheck" />
                      <span class="chk-label">Yes</span>
                    </div>
                  </div>
                </div>
                <div class="fgrid g2 mt6">
                  <div class="field-wrap">
                    <label class="flabel">CROPPING SCHEDULE</label>
                    <ion-input v-model="plot.cropping_schedule" class="finput" placeholder="e.g. April–June, Oct–Dec" />
                  </div>
                  <div class="field-wrap">
                    <label class="flabel">ROTATIONAL TILLER'S FULL NAME</label>
                    <ion-input v-model="plot.rotational_tiller_full_name" class="finput" />
                  </div>
                </div>
                <div class="field-wrap mt6">
                  <label class="flabel">REMARKS</label>
                  <ion-textarea v-model="plot.remarks" class="ftextarea" :rows="2" placeholder="Optional remarks..." />
                </div>
              </div>
            </div>

          </div>

          <div class="add-plot-wrap">
            <ion-button fill="outline" expand="block" class="add-plot-btn" @click="addPlot">
              + ADD ANOTHER FARM PLOT
            </ion-button>
          </div>

        </div>

        <!-- pang error -->
        <div v-if="errorMsg" class="error-banner">
          <span>Error: </span> {{ errorMsg }}
        </div>

        <!--  SUBMIT button-->
        <ion-button expand="block" class="submit-btn" :disabled="isSubmitting" @click="submitForm">
          <span v-if="isSubmitting">Submitting...</span>
          <span v-else> SUBMIT ENROLLMENT FORM</span>
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
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";

import { reactive, ref, onMounted, computed } from "vue";
import axiosInstance from "@/utils/axios";
import { useRouter } from "vue-router";
// import AppNavbar from '@/components/AppNavbar.vue'; // Unused in this layout

const router = useRouter();

// Return to the farmer registry within the current environment (admin vs technician).
const farmersHome = computed(() =>
  router.currentRoute.value.path.startsWith("/tech") ? "/tech/farmers" : "/admin/farmers"
);

/* state  */
const isSubmitting  = ref(false);
const errorMsg      = ref("");
const sameAddress   = ref(false);
const computedAge   = ref<number | "">("");
const photoPreview  = ref<string | null>(null);

const showToast = async (msg: string, color: 'success' | 'danger' | 'warning' = 'success') => {
  const toast = await toastController.create({
    message: msg,
    duration: 3000,
    color,
    position: 'top',
  });
  await toast.present();
};

const capturePhoto = async () => {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
    });
    photoPreview.value = `data:image/jpeg;base64,${photo.base64String}`;
    (farmer as any).photo_base64 = photoPreview.value;
  } catch {
    // user cancelled
  }
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
const livelihoodTypes = ["Farmer","Farm Worker","Fisher","Agri-Youth"];
const ownershipTypes  = ["Registered Owner","Tenant","Lessee","Others"];
const farmTypes       = ["Irrigated","Rainfed Upland","Rainfed Lowland","Urban/Peri-Urban"];

// DA RSBSA livelihood sub-classifications, keyed by the broad livelihood type.
const livelihoodDetailMap: Record<string, string[]> = {
  "Farmer":      ["Rice", "Corn", "Other Crops", "Livestock", "Poultry"],
  "Farm Worker": ["Land Preparation", "Planting/Transplanting", "Cultivation", "Harvesting"],
  "Fisher":      ["Fish Capture", "Aquaculture", "Gleaning", "Processing", "Fish Vending"],
  "Agri-Youth":  ["Agri-Youth", "Farming Household"],
};
const livelihoodDetailOptions = computed(
  () => livelihoodDetailMap[farmer.livelihood_type] ?? []
);
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
  location_brgy: "", 
  location_city: "", 
  location_province: "",
  latitude: "" as string|number, 
  longitude: "" as string|number,
  georef_id: "",
  locating: false,
  total_parcel_area_ha: "" as string|number,
  is_ancestral_domain: false, 
  is_agrarian_reform_beneficiary: false,
  ownership_type: "", 
  land_owner_first_name: "", 
  land_owner_surname: "",
  land_owner_ext_name: "", 
  land_owner_rsbsa_no: "",
  proof_of_ownership_document: "",
  commodity: "", 
  size_ha: "" as string|number,
  no_of_heads_or_trees: "" as string|number,
  farm_type: "", 
  is_organic: false, 
  cropping_schedule: "",
  rotational_tiller_full_name: "", 
  remarks: "",
});
const farmPlots = reactive([createPlot()]);
const addPlot    = () => farmPlots.push(createPlot());
const removePlot = (i: number) => farmPlots.splice(i, 1);

/* Capture the device GPS fix into a plot's latitude/longitude. */
const useCurrentLocation = async (i: number) => {
  const plot = farmPlots[i];
  plot.locating = true;
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    plot.latitude = Number(pos.coords.latitude.toFixed(6));
    plot.longitude = Number(pos.coords.longitude.toFixed(6));
    await showToast(`Location captured for Farm Plot ${i + 1}.`, 'success');
  } catch {
    await showToast('Unable to get GPS location. You may enter coordinates manually.', 'warning');
  } finally {
    plot.locating = false;
  }
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
  } else {
    farmer.provincial_house_no = farmer.provincial_street = farmer.provincial_brgy =
    farmer.provincial_city     = farmer.provincial_province = farmer.provincial_region = "";
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

// Trigger when the page loads
onMounted(() => {
  farmer.transaction_code = generateTransactionCode();
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
  
  for (let i = 0; i < farmPlots.length; i++) {
    const p = farmPlots[i], n = `Farm Plot ${i+1}`;
    if (!p.location_brgy.trim())               { errorMsg.value = `${n}: Barangay is required.`;             return false; }
    if (!p.location_city.trim())               { errorMsg.value = `${n}: Municipality/City is required.`;    return false; }
    if (!p.location_province.trim())           { errorMsg.value = `${n}: Province is required.`;             return false; }
    if (p.latitude !== "" && (Number(p.latitude) < -90 || Number(p.latitude) > 90))       { errorMsg.value = `${n}: Latitude must be between -90 and 90.`;   return false; }
    if (p.longitude !== "" && (Number(p.longitude) < -180 || Number(p.longitude) > 180))  { errorMsg.value = `${n}: Longitude must be between -180 and 180.`; return false; }
    if (!p.total_parcel_area_ha)               { errorMsg.value = `${n}: Total Parcel Area is required.`;    return false; }
    if (!p.ownership_type)                     { errorMsg.value = `${n}: Ownership Type is required.`;       return false; }
    if (p.ownership_type === 'Tenant') {
      if (!p.land_owner_first_name.trim())     { errorMsg.value = `${n}: Landowner first name is required for tenants.`; return false; }
      if (!p.land_owner_surname.trim())        { errorMsg.value = `${n}: Landowner surname is required for tenants.`;    return false; }
      if (!p.land_owner_rsbsa_no.trim())       { errorMsg.value = `${n}: Landowner RSBSA number is required for tenants.`; return false; }
    }
    if (!p.proof_of_ownership_document.trim()) { errorMsg.value = `${n}: Proof of Ownership is required.`;   return false; }
    if (!p.commodity.trim())                   { errorMsg.value = `${n}: Commodity is required.`;            return false; }
    if (!p.size_ha)                            { errorMsg.value = `${n}: Farm Size (ha) is required.`;       return false; }
    if (!p.farm_type)                          { errorMsg.value = `${n}: Farm Type is required.`;            return false; }
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
    // FIX 1: Exact payload match to Laravel's StoreFarmerRequest
    const payload = {
      ...farmer,
      plots: farmPlots
    };

    const res = await axiosInstance.post('/farmers', payload);
    
    if (res.data.status === 'success' || res.status === 200 || res.status === 201) {
      await showToast('Farmer enrolled successfully!', 'success');
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
:host {
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
}

@media (prefers-color-scheme: dark) {
  :host {
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
.rsbsa-toolbar { --background: var(--c-green); --color: #fff; }
.toolbar-title { font-weight: 700; letter-spacing: .4px; }
.back-btn { --color: #fff; }

.rsbsa-content { --background: var(--bg-page); }

.page-wrapper {
  max-width: 960px;
  margin: 0;
  padding: 12px 12px 64px;
}

/* ═══════ LETTERHEAD ═══════ */
.letterhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: 2px solid var(--c-border);
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 4px;
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
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;
}

/* ═══════ FORM SECTION ═══════ */
.form-section {
  background: var(--bg-card);
  border: 2px solid var(--c-border);
  border-radius: 4px;
  margin-bottom: 14px;
  overflow: hidden;
}

/* ── Part Banner ── */
.part-banner {
  display: flex;
  align-items: stretch;
  background: var(--part-head-bg);
  border-bottom: 2px solid var(--c-border);
}
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
  border-right: 2px solid rgba(0,0,0,.2);
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

/* ── Subsection ── */
.subsection {
  border-bottom: 1px solid var(--c-border);
}
.subsection:last-child { border-bottom: none; }

.subsection-title {
  background: var(--sub-head-bg);
  color: var(--sub-head-txt);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .6px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--sub-border);
  text-transform: uppercase;
}
.subsection-body {
  padding: 10px 14px 12px;
}

/* ═══════ GRID ═══════ */
.fgrid   { display: grid; gap: 8px; }
.g1 { grid-template-columns: 1fr; }
.g2 { grid-template-columns: 1fr 1fr; }
.g3 { grid-template-columns: 1fr 1fr 1fr; }
.g4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.mt4 { margin-top: 4px; }
.mt6 { margin-top: 6px; }

/* ═══════ FIELD ═══════ */
.field-wrap { display: flex; flex-direction: column; }

.flabel {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .4px;
  color: var(--c-label);
  text-transform: uppercase;
  margin-bottom: 3px;
}
.flabel.req::after { content: " *"; color: var(--c-red); }

/* ═══════ INPUTS ═══════ */
.finput {
  --background:       var(--bg-input);
  --color:            var(--c-text);
  --placeholder-color: var(--c-text-soft);
  --placeholder-opacity: 1;
  --padding-start: 8px;
  --padding-end:   8px;
  --padding-top:   6px;
  --padding-bottom:6px;
  border: 1px solid var(--c-border-in);
  border-radius: 3px;
  font-size: 13px;
  min-height: 36px;
}
.finput[disabled] {
  --background: var(--bg-input-dis);
  opacity: .6;
}

.fselect {
  background: var(--bg-input);
  color: var(--c-text);
  border: 1px solid var(--c-border-in);
  border-radius: 3px;
  padding: 7px 8px;
  font-size: 13px;
  min-height: 36px;
}

.ftextarea {
  --background:    var(--bg-input);
  --color:         var(--c-text);
  --padding-start: 8px;
  --padding-end:   8px;
  border: 1px solid var(--c-border-in);
  border-radius: 3px;
  font-size: 13px;
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
  padding: 5px 12px;
  border: 1.5px solid var(--c-border);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text);
  background: var(--bg-input);
  cursor: pointer;
  user-select: none;
  transition: background .12s, border-color .12s, color .12s;
  white-space: nowrap;
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
  background: var(--c-note-bg);
  border: 1px solid var(--c-note-border);
  border-radius: 3px;
  padding: 8px 10px;
  margin-top: 8px;
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

/* ═══════ PLOT CARD ═══════ */
.plot-card {
  border: 1.5px solid var(--c-green-mid);
  border-radius: 4px;
  margin: 12px 12px 0;
  background: var(--bg-sub);
  overflow: hidden;
}
.plot-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--c-green-mid);
  padding: 7px 12px;
}
.plot-num {
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .6px;
}
.del-plot-btn { --color: #ffb3ae; font-size: 12px; font-weight: 700; }

.gps-btn {
  --border-color: var(--c-green-mid);
  --color: var(--c-green-mid);
  font-weight: 700;
  font-size: 11px;
  text-transform: none;
}
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

.add-plot-wrap { padding: 10px 12px 12px; }
.add-plot-btn {
  --border-color: var(--c-green);
  --color:        var(--c-green);
  font-weight: 700;
  font-size: 13px;
}

/* ═══════ COMMODITY TABLE ═══════ */
.commodity-tbl {
  border: 1px solid var(--c-border);
  border-radius: 3px;
  overflow: hidden;
}
.ctbl-head {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1.5fr .8fr;
  background: var(--sub-head-bg);
  border-bottom: 1px solid var(--c-border);
}
.ctbl-head span {
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .4px;
  color: var(--sub-head-txt);
  text-transform: uppercase;
  border-right: 1px solid var(--c-border);
}
.ctbl-head span:last-child { border-right: none; }
.ctbl-body {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1.5fr .8fr;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--bg-card);
}
.organic-cell {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
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

/* ═══════ RESPONSIVE ═══════ */
@media (max-width: 768px) {
  .g4, .g3, .g2 { grid-template-columns: 1fr; }
  .tx-row { grid-template-columns: 1fr; }
  .letterhead { flex-direction: column; gap: 10px; align-items: flex-start; }
  .lh-right { align-self: flex-end; }
  .ctbl-head, .ctbl-body { grid-template-columns: 1fr 1fr; }
  .ctbl-head span:nth-child(n+3), .ctbl-body > *:nth-child(n+3) { grid-column: span 1; }
}
</style>