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
              <div class="lh-sub">Fields match the MAO farmer masterlist</div>
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

        <div class="form-section">
          <div class="part-banner">
            <div class="part-label">PART I</div>
            <div class="part-title">PERSONAL INFORMATION</div>
          </div>

          <div class="subsection">
            <div class="subsection-title">NAME</div>
            <div class="subsection-body">
              <div class="name-row">
                <div class="field-wrap name-surname">
                  <label class="flabel req">SURNAME</label>
                  <ion-input v-model="farmer.surname" class="finput" placeholder="e.g. DELA CRUZ" />
                </div>
                <div class="field-wrap name-first">
                  <label class="flabel req">FIRST NAME</label>
                  <ion-input v-model="farmer.first_name" class="finput" placeholder="e.g. JUAN" />
                </div>
                <div class="field-wrap name-middle">
                  <label class="flabel">MIDDLE NAME</label>
                  <ion-input v-model="farmer.middle_name" class="finput" :disabled="farmer.no_middle_name" />
                  <div class="inline-chk">
                    <ion-checkbox v-model="farmer.no_middle_name" @ionChange="onNoMiddleName" class="fcheck" />
                    <span class="chk-label">No Middle Name</span>
                  </div>
                </div>
                <div class="field-wrap name-ext">
                  <label class="flabel">SUFFIX</label>
                  <ion-input v-model="farmer.ext_name" class="finput" placeholder="Jr / III" :disabled="farmer.no_ext_name" />
                  <div class="inline-chk">
                    <ion-checkbox v-model="farmer.no_ext_name" @ionChange="onNoExtName" class="fcheck" />
                    <span class="chk-label">No Ext. Name</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="subsection">
            <div class="subsection-title">DEMOGRAPHICS & CONTACT</div>
            <div class="subsection-body">
              <div class="demo-row">
                <div class="field-wrap w-md">
                  <label class="flabel req">SEX</label>
                  <ion-select v-model="farmer.sex" interface="popover" class="fselect" placeholder="Select">
                    <ion-select-option value="Male">Male</ion-select-option>
                    <ion-select-option value="Female">Female</ion-select-option>
                  </ion-select>
                </div>
                <div class="field-wrap w-mid">
                  <label class="flabel req">BIRTHDATE</label>
                  <ion-input type="date" v-model="farmer.birthdate" class="finput" @ionChange="computeAge" />
                </div>
                <div class="field-wrap w-xs">
                  <label class="flabel">AGE</label>
                  <ion-input :value="computedAge" class="finput" readonly placeholder="—" />
                </div>
                <div class="field-wrap w-md">
                  <label class="flabel req">CONTACT NO.</label>
                  <ion-input v-model="farmer.mobile_number" class="finput" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" :maxlength="11" />
                </div>
              </div>
              <div class="vuln-row">
                <div class="inline-chk">
                  <ion-checkbox v-model="farmer.is_icc_ip" class="fcheck" />
                  <span class="chk-label">Indigenous (ICC/IP)</span>
                </div>
                <div class="inline-chk">
                  <ion-checkbox v-model="farmer.is_pwd" class="fcheck" />
                  <span class="chk-label">PWD</span>
                </div>
                <div class="inline-chk">
                  <ion-checkbox v-model="farmer.is_4ps_beneficiary" class="fcheck" />
                  <span class="chk-label">4Ps Beneficiary</span>
                </div>
              </div>
            </div>
          </div>

          <div class="subsection">
            <div class="subsection-title">FARMER ADDRESS</div>
            <div class="subsection-body">
              <PsgcLocationPicker
                class="psgc-compact"
                v-model:region="farmer.permanent_region"
                v-model:province="farmer.permanent_province"
                v-model:city="farmer.permanent_city"
                v-model:barangay="farmer.permanent_brgy"
                v-model:outside-echague="permanentOutsideEchague"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="part-banner">
            <div class="part-label">PART II</div>
            <div class="part-title">FARM INFORMATION</div>
          </div>

          <div class="subsection">
            <div class="subsection-title">FARM ADDRESS</div>
            <div class="subsection-body">
              <PsgcLocationPicker
                class="psgc-compact"
                v-model:region="farmRegionHelper"
                v-model:province="farmProvinceHelper"
                v-model:city="farmer.farm_city"
                v-model:barangay="farmer.farm_brgy"
                v-model:outside-echague="farmOutsideEchague"
              />
              <div class="demo-row mt8">
                <div class="field-wrap w-md">
                  <label class="flabel req">FARM AREA (ha)</label>
                  <ion-input v-model="farmAreaHa" type="number" step="0.0001" class="finput" placeholder="0.0000" />
                </div>
                <div class="field-wrap w-md">
                  <label class="flabel req">COMMODITY</label>
                  <ion-select v-model="farmCommodity" interface="popover" class="fselect" placeholder="Select">
                    <ion-select-option v-for="c in COMMODITY_OPTIONS" :key="c" :value="c">{{ c }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
              <div class="demo-row mt8">
                <div class="field-wrap flex-fill">
                  <label class="flabel">FARMER GEOCODE</label>
                  <ion-input v-model="farmer.farmer_psgc" class="finput" placeholder="Optional" />
                </div>
                <div class="field-wrap flex-fill">
                  <label class="flabel">FARM GEOCODE</label>
                  <ion-input v-model="farmer.farm_psgc" class="finput" placeholder="Optional" />
                </div>
              </div>
              <div class="field-wrap mt8">
                <label class="flabel">REMARKS</label>
                <ion-textarea v-model="farmer.masterlist_remarks" class="ftextarea" rows="2" placeholder="Optional masterlist remarks" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="error-banner">
          <span>Error: </span> {{ errorMsg }}
        </div>

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
import { isOutsideEchagueCity } from "@/composables/usePsgcLocations";
import {
  COMMODITY_OPTIONS,
  ECHAGUE_CITY,
  ECHAGUE_PROVINCE,
  ECHAGUE_REGION,
} from "@/data/echagueBarangays";

const router = useRouter();
const route = useRoute();
const permanentOutsideEchague = ref(false);
const farmOutsideEchague = ref(false);
const farmRegionHelper = ref(ECHAGUE_REGION);
const farmProvinceHelper = ref(ECHAGUE_PROVINCE);
const farmAreaHa = ref<string | number>("");
const farmCommodity = ref<string>("Rice");
const plotId = ref("");

const editId = computed(() => String(route.query.id || "").trim());
const isEdit = computed(() => !!editId.value);
const farmersHome = computed(() =>
  router.currentRoute.value.path.startsWith("/tech") ? "/tech/dashboard" : "/admin/farmers"
);

const isSubmitting = ref(false);
const errorMsg = ref("");
const computedAge = ref<number | "">("");

const showToast = async (msg: string, color: "success" | "danger" | "warning" = "success") => {
  const toast = await toastController.create({
    message: msg,
    duration: 3000,
    color,
    position: "top",
  });
  await toast.present();
};

const farmer = reactive({
  rsbsa_no: "",
  transaction_code: "",
  surname: "",
  first_name: "",
  middle_name: "",
  ext_name: "",
  no_middle_name: false,
  no_ext_name: false,
  sex: "",
  birthdate: "",
  mobile_number: "",
  permanent_brgy: "",
  permanent_city: ECHAGUE_CITY,
  permanent_province: ECHAGUE_PROVINCE,
  permanent_region: ECHAGUE_REGION,
  farm_brgy: "",
  farm_city: ECHAGUE_CITY,
  farm_psgc: "" as string | null,
  farmer_psgc: "" as string | null,
  masterlist_remarks: "" as string | null,
  is_icc_ip: false,
  is_pwd: false,
  is_4ps_beneficiary: false,
});

const computeAge = () => {
  if (!farmer.birthdate) {
    computedAge.value = "";
    return;
  }
  const birth = new Date(farmer.birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  computedAge.value = age;
};

const onNoMiddleName = () => {
  if (farmer.no_middle_name) farmer.middle_name = "";
};
const onNoExtName = () => {
  if (farmer.no_ext_name) farmer.ext_name = "";
};

const generateTransactionCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ECH-${year}${month}-${randomStr}`;
};

const applyFarmerRecord = (data: any) => {
  farmer.rsbsa_no = data.rsbsa_no || "";
  farmer.transaction_code = data.transaction_code || "";
  farmer.surname = data.surname || "";
  farmer.first_name = data.first_name || "";
  farmer.middle_name = data.middle_name || "";
  farmer.ext_name = data.ext_name || "";
  farmer.no_middle_name = !!data.no_middle_name;
  farmer.no_ext_name = !!data.no_ext_name;
  farmer.sex = data.sex || "";
  farmer.mobile_number = data.mobile_number || "";
  farmer.permanent_brgy = data.permanent_brgy || "";
  farmer.permanent_city = data.permanent_city || ECHAGUE_CITY;
  farmer.permanent_province = data.permanent_province || ECHAGUE_PROVINCE;
  farmer.permanent_region = data.permanent_region || ECHAGUE_REGION;
  farmer.farm_brgy = data.farm_brgy || "";
  farmer.farm_city = data.farm_city || ECHAGUE_CITY;
  farmer.farm_psgc = data.farm_psgc || "";
  farmer.farmer_psgc = data.farmer_psgc || "";
  farmer.masterlist_remarks = data.masterlist_remarks || "";
  farmer.is_icc_ip = !!data.is_icc_ip;
  farmer.is_pwd = !!data.is_pwd;
  farmer.is_4ps_beneficiary = !!data.is_4ps_beneficiary;
  if (data.birthdate) {
    farmer.birthdate = String(data.birthdate).slice(0, 10);
    computeAge();
  }
  permanentOutsideEchague.value = isOutsideEchagueCity(farmer.permanent_city);
  farmOutsideEchague.value = isOutsideEchagueCity(farmer.farm_city);
  farmProvinceHelper.value = ECHAGUE_PROVINCE;
  farmRegionHelper.value = ECHAGUE_REGION;

  const plots = data.farm_plots || data.farmPlots || [];
  const first = plots[0];
  if (first) {
    plotId.value = first.id || "";
    farmAreaHa.value = first.size_ha ?? first.total_parcel_area_ha ?? data.total_farm_area_ha ?? "";
    farmCommodity.value = first.commodity || data.commodity || "Rice";
    if (!farmer.farm_brgy) farmer.farm_brgy = first.location_brgy || "";
    if (!farmer.farm_city || farmer.farm_city === ECHAGUE_CITY) {
      farmer.farm_city = first.location_city || farmer.farm_city || ECHAGUE_CITY;
    }
  } else {
    plotId.value = "";
    farmAreaHa.value = data.total_farm_area_ha ?? "";
    farmCommodity.value = data.commodity || "Rice";
  }
};

const loadFarmerForEdit = async () => {
  try {
    const res = await axiosInstance.get(`/farmers/${editId.value}`);
    const data = res.data?.data;
    if (!data) throw new Error("empty");
    applyFarmerRecord(data);
  } catch {
    errorMsg.value = "Could not load this farmer record for editing.";
    await showToast("Could not load farmer record.", "danger");
  }
};

onMounted(async () => {
  if (isEdit.value) {
    await loadFarmerForEdit();
    return;
  }
  farmer.transaction_code = generateTransactionCode();
  farmer.rsbsa_no = "";
});

const validate = (): boolean => {
  errorMsg.value = "";
  const req = (v: string, msg: string) => {
    if (!String(v || "").trim()) {
      errorMsg.value = msg;
      return false;
    }
    return true;
  };

  if (!req(farmer.transaction_code, "Transaction Code is required.")) return false;
  if (!req(farmer.surname, "Surname is required.")) return false;
  if (!req(farmer.first_name, "First Name is required.")) return false;
  if (!farmer.sex) {
    errorMsg.value = "Sex is required.";
    return false;
  }
  if (!farmer.birthdate) {
    errorMsg.value = "Birthdate is required.";
    return false;
  }
  if (!req(farmer.permanent_brgy, "Farmer address barangay is required.")) return false;
  if (!req(farmer.permanent_city, "Farmer address municipality/city is required.")) return false;
  if (!req(farmer.permanent_province, "Farmer address province is required.")) return false;
  if (!req(farmer.mobile_number, "Contact number is required.")) return false;
  if (!/^\d{11}$/.test(farmer.mobile_number)) {
    errorMsg.value = "Contact number must be exactly 11 digits.";
    return false;
  }
  if (!req(farmer.farm_brgy, "Farm address barangay is required.")) return false;
  if (!req(farmer.farm_city, "Farm address municipality/city is required.")) return false;
  if (!farmCommodity.value) {
    errorMsg.value = "Commodity is required.";
    return false;
  }
  const area = parseFloat(String(farmAreaHa.value));
  if (!area || area <= 0) {
    errorMsg.value = "Farm area (ha) is required.";
    return false;
  }
  return true;
};

/** Columns the DB still expects but the masterlist does not collect. */
const enrollmentPlaceholders = () => ({
  permanent_house_no: "N/A",
  permanent_street: "N/A",
  mothers_maiden_first_name: "N/A",
  mothers_maiden_surname: "N/A",
  civil_status: "Single",
  highest_education: "None",
  livelihood_type: "Farmer",
  is_mobile_owner: true,
});

const buildPlotPayload = () => {
  const area = Number(farmAreaHa.value);
  return {
    ...(plotId.value ? { id: plotId.value } : {}),
    location_brgy: farmer.farm_brgy,
    location_city: farmer.farm_city,
    location_province: ECHAGUE_PROVINCE,
    total_parcel_area_ha: area,
    size_ha: area,
    commodity: farmCommodity.value,
    ownership_type: "Others",
    ownership_type_other: "Masterlist enrollment",
    proof_of_ownership_document: "Other",
    proof_of_ownership_other: "Pending Manual Verification",
    farm_type: "Other",
    farm_type_other: "Pending manual verification",
    is_ancestral_domain: false,
    is_agrarian_reform_beneficiary: false,
    is_organic: false,
  };
};

const submitForm = async () => {
  if (!validate()) {
    document.querySelector(".error-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  isSubmitting.value = true;
  errorMsg.value = "";

  try {
    const payload = {
      ...(isEdit.value ? {} : enrollmentPlaceholders()),
      transaction_code: farmer.transaction_code,
      surname: farmer.surname,
      first_name: farmer.first_name,
      middle_name: farmer.no_middle_name ? null : farmer.middle_name || null,
      ext_name: farmer.no_ext_name ? null : farmer.ext_name || null,
      no_middle_name: !!farmer.no_middle_name,
      no_ext_name: !!farmer.no_ext_name,
      sex: farmer.sex,
      birthdate: farmer.birthdate,
      mobile_number: farmer.mobile_number,
      permanent_brgy: farmer.permanent_brgy,
      permanent_city: farmer.permanent_city,
      permanent_province: farmer.permanent_province,
      permanent_region: farmer.permanent_region || ECHAGUE_REGION,
      farm_brgy: farmer.farm_brgy,
      farm_city: farmer.farm_city,
      farm_psgc: farmer.farm_psgc || null,
      farmer_psgc: farmer.farmer_psgc || null,
      masterlist_remarks: farmer.masterlist_remarks || null,
      is_icc_ip: !!farmer.is_icc_ip,
      is_pwd: !!farmer.is_pwd,
      is_4ps_beneficiary: !!farmer.is_4ps_beneficiary,
      rsbsa_no: isEdit.value ? farmer.rsbsa_no || null : null,
      plots: [buildPlotPayload()],
    };

    const res = isEdit.value
      ? await axiosInstance.patch(`/farmers/${editId.value}`, payload)
      : await axiosInstance.post("/farmers", payload);

    if (res.data.status === "success" || res.status === 200 || res.status === 201) {
      const assigned = res.data?.data?.rsbsa_no;
      await showToast(
        isEdit.value
          ? "Farmer record updated."
          : assigned
            ? `Farmer enrolled. RSBSA: ${assigned}`
            : "Farmer enrolled successfully!",
        "success",
      );
      router.push(farmersHome.value);
    }
  } catch (err: any) {
    if (err.response?.status === 422) {
      const laravelErrors = err.response.data.errors;
      const firstErrorKey = Object.keys(laravelErrors || {})[0];
      errorMsg.value = firstErrorKey
        ? `Validation Error: ${laravelErrors[firstErrorKey][0]}`
        : err.response?.data?.message || "Validation failed.";
    } else if (err.response?.status === 500 && err.response?.data?.error) {
      errorMsg.value = `SQL Crash: ${err.response.data.error}`;
    } else {
      errorMsg.value = err?.response?.data?.message ?? "Something went wrong. Please check your connection.";
    }
    document.querySelector(".error-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.page-wrapper {
  --bg-page: #f2efea;
  --bg-card: #ffffff;
  --bg-sub: #f8f7f5;
  --bg-input: #ffffff;
  --bg-input-dis: #efefef;
  --c-text: #1a1a1a;
  --c-text-soft: #555555;
  --c-label: #1a4731;
  --c-border: #999999;
  --c-border-in: #b0b0b0;
  --c-green: #1a4731;
  --c-green-mid: #2a6648;
  --c-red: #c0392b;
  --part-head-bg: #1a4731;
  --part-head-txt: #ffffff;
  --sub-head-bg: #e8f0eb;
  --sub-head-txt: #1a4731;
  --sub-border: #2a6648;
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 16px 64px;
}

@media (prefers-color-scheme: dark) {
  .page-wrapper {
    --bg-page: #0f1a14;
    --bg-card: #1a2820;
    --bg-sub: #1e3028;
    --bg-input: #243328;
    --bg-input-dis: #1a2820;
    --c-text: #e8ede9;
    --c-text-soft: #9ab09e;
    --c-label: #7ecb98;
    --c-border: #3d5e47;
    --c-border-in: #4a7059;
    --c-green: #2a6648;
    --c-green-mid: #3d8b5e;
    --c-red: #e05a4e;
    --part-head-bg: #2a6648;
    --sub-head-bg: #243328;
    --sub-head-txt: #7ecb98;
    --sub-border: #3d8b5e;
  }
}

.rsbsa-content { --background: var(--bg-page, #f2efea); }
.rsbsa-toolbar { --background: #1a4731; --color: #fff; }
.toolbar-title { font-size: 15px; font-weight: 700; }
.back-btn { --color: #fff; }

.letterhead {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-card);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.lh-left { display: flex; align-items: center; gap: 12px; }
.lh-seal {
  width: 52px; height: 52px; border-radius: 50%;
  display: grid; place-items: center; position: relative;
  background: #fff; border: 2px solid #1a4731;
}
.seal-outer, .seal-inner { position: absolute; inset: 0; border-radius: 50%; }
.lh-agency { font-size: 10px; letter-spacing: .6px; color: var(--c-text-soft); font-weight: 700; }
.lh-main { font-size: 16px; font-weight: 800; color: var(--c-green); }
.lh-sub { font-size: 11px; color: var(--c-text-soft); margin-top: 2px; }

.tx-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.form-section {
  background: var(--bg-card);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  margin-bottom: 14px;
  overflow: hidden;
}
.part-banner {
  display: flex; align-items: center; gap: 12px;
  background: var(--part-head-bg); color: var(--part-head-txt);
  padding: 8px 14px;
}
.part-label { font-size: 11px; font-weight: 800; letter-spacing: 1px; opacity: .85; }
.part-title { font-size: 13px; font-weight: 800; letter-spacing: .4px; }
.subsection { border-top: 1px solid var(--c-border); }
.subsection-title {
  background: var(--sub-head-bg); color: var(--sub-head-txt);
  font-size: 11px; font-weight: 800; letter-spacing: .5px;
  padding: 7px 14px; border-bottom: 2px solid var(--sub-border);
}
.subsection-body { padding: 12px 14px; background: var(--bg-sub); }

.field-wrap { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.flabel { font-size: 10px; font-weight: 700; color: var(--c-label); letter-spacing: .3px; }
.flabel.req::after { content: " *"; color: var(--c-red); }
.finput, .fselect, .ftextarea {
  --background: var(--bg-input);
  --padding-start: 10px; --padding-end: 10px;
  --padding-top: 8px; --padding-bottom: 8px;
  border: 1px solid var(--c-border-in); border-radius: 4px;
  font-size: 13px; color: var(--c-text); min-height: 38px;
}
.ftextarea { --padding-top: 10px; min-height: 64px; }
.name-row, .demo-row, .vuln-row {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start;
}
.name-surname, .name-first, .name-middle, .name-ext { flex: 1 1 140px; }
.w-xs { flex: 0 0 80px; }
.w-sm { flex: 0 0 120px; }
.w-md { flex: 1 1 150px; }
.w-mid { flex: 1 1 170px; }
.w-lg { flex: 1 1 200px; }
.flex-fill { flex: 1 1 180px; }
.inline-chk { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.chk-label { font-size: 12px; color: var(--c-text-soft); }
.fcheck { --size: 16px; --checkbox-background-checked: var(--c-green); }
.psgc-compact { width: 100%; }
.mt8 { margin-top: 8px; }
.vuln-row { margin-top: 10px; gap: 18px; }

.error-banner {
  background: #fdecea; color: #8b1e16; border: 1px solid #e0a8a2;
  border-radius: 4px; padding: 10px 14px; margin: 8px 0; font-size: 13px;
}
.submit-btn {
  margin-top: 18px; height: 52px;
  --background: var(--c-green); --background-activated: var(--c-green-mid); --color: #fff;
  font-size: 15px; font-weight: 800; letter-spacing: .8px; border-radius: 4px;
}
.submit-btn[disabled] { opacity: .55; }
.footer-line {
  text-align: center; font-size: 10px; color: var(--c-text-soft);
  margin-top: 16px; letter-spacing: .3px;
}

@media (max-width: 640px) {
  .tx-row { grid-template-columns: 1fr; }
}
</style>
