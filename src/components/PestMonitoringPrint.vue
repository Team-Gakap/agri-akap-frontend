<template>
  <div id="pest-monitoring-print" class="pest-doc">
    <MaoFormHeader
      :barangay="barangay"
      :title="`MONITORING OF ${cropLabel.toUpperCase()} PEST AND DISEASES`"
    />

    <table class="form-table">
      <thead>
        <tr>
          <th>NO.</th>
          <th>RSBSA NO.</th>
          <th>LAST NAME</th>
          <th>FIRST NAME</th>
          <th>MIDDLE NAME</th>
          <th>EXT NAME</th>
          <th>B-DAY</th>
          <th>FARMER ADDRESS</th>
          <th>FARM LOCATION</th>
          <th>AREA PLANTED</th>
          <th>DAYS AFTER PLANTING</th>
          <th>VARIETY</th>
          <th>AREA DAMAGE (%)</th>
          <th>DAMAGE BY PEST/DISEASES</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in paddedRows" :key="i">
          <td class="ta-center">{{ row ? i + 1 : '' }}</td>
          <td>{{ row?.rsbsa_no }}</td>
          <td>{{ row?.surname }}</td>
          <td>{{ row?.first_name }}</td>
          <td>{{ row?.middle_name }}</td>
          <td>{{ row?.ext_name }}</td>
          <td>{{ row?.birthdate }}</td>
          <td>{{ row?.farmer_address }}</td>
          <td>{{ row?.farm_location }}</td>
          <td class="ta-center">{{ row?.area_planted }}</td>
          <td class="ta-center">{{ row?.days_after_planting }}</td>
          <td>{{ row?.variety }}</td>
          <td class="ta-center">{{ row?.area_damage_pct }}</td>
          <td>{{ row?.damage_by }}</td>
        </tr>
      </tbody>
    </table>

    <div class="sig-block">
      <div class="sig-col">
        <p class="sig-label">Prepared by:</p>
        <div class="sig-line"></div>
        <p class="sig-title">Committee on Agriculture</p>
      </div>
      <div class="sig-col">
        <p class="sig-label">Noted by:</p>
        <div class="sig-line"></div>
        <p class="sig-title">Brgy. Captain</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MaoFormHeader from '@/components/MaoFormHeader.vue';

const props = withDefaults(
  defineProps<{
    rows?: Array<{
      rsbsa_no: string;
      surname: string;
      first_name: string;
      middle_name: string;
      ext_name: string;
      birthdate: string;
      farmer_address: string;
      farm_location: string;
      area_planted: string | number;
      days_after_planting: string | number;
      variety: string;
      area_damage_pct: string | number;
      damage_by: string;
    }>;
    barangay?: string;
    crop?: string;
  }>(),
  {
    rows: () => [],
    barangay: '',
    crop: 'Corn',
  },
);

const cropLabel = computed(() => props.crop || 'Corn');

const paddedRows = computed(() => {
  const list = [...(props.rows || [])];
  const min = 20;
  if (list.length >= min) return list;
  return [...list, ...Array(min - list.length).fill(null)];
});
</script>

<style scoped>
.pest-doc {
  background: #fff;
  color: #111;
  padding: 16px 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Times New Roman', Times, serif;
  font-size: 9pt;
}

.form-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
.form-table th, .form-table td {
  border: 1px solid #000;
  padding: 2px 3px;
  vertical-align: top;
  height: 16px;
}
.form-table th { font-weight: bold; text-align: center; background: #fff; }
.ta-center { text-align: center; }

.sig-block {
  display: flex;
  justify-content: space-between;
  margin-top: 36px;
  padding: 0 24px;
}
.sig-col { text-align: center; min-width: 220px; }
.sig-label { margin: 0 0 4px; font-size: 10pt; text-align: left; }
.sig-line { border-bottom: 1px solid #000; height: 36px; margin-bottom: 4px; }
.sig-title { margin: 0; font-weight: bold; font-size: 10pt; }

@media print {
  .pest-doc { padding: 0; max-width: 100%; }
  @page { size: landscape; margin: 8mm; }
}
</style>
