<template>
  <div id="harvesting-print" class="brgy-doc">
    <MaoFormHeader
      :barangay="barangay"
      :title="`HARVESTING REPORT — ${cropLabel.toUpperCase()}`"
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
          <th>FARM LOCATION</th>
          <th>CROP TYPE</th>
          <th>VARIETY</th>
          <th>AREA HARVESTED (ha)</th>
          <th>TOTAL YIELD</th>
          <th>DATE OF HARVEST</th>
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
          <td>{{ row?.farm_location }}</td>
          <td>{{ row?.crop_type }}</td>
          <td>{{ row?.variety }}</td>
          <td class="ta-center">{{ row?.area_harvested }}</td>
          <td class="ta-center">{{ row?.yield_display }}</td>
          <td class="ta-center">{{ row?.date_of_harvest }}</td>
        </tr>
      </tbody>
    </table>

    <p class="totals">{{ rows.length }} farmer(s) · {{ totalHa }} ha harvested</p>

    <div class="sig-block">
      <div class="sig-col">
        <p class="sig-label">Prepared and Submitted by:</p>
        <div class="sig-line"></div>
        <p class="sig-title">Committee on Agriculture</p>
      </div>
      <div class="sig-col">
        <p class="sig-label">Certified correct by:</p>
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
      farm_location: string;
      crop_type: string;
      variety: string;
      area_harvested: string | number;
      yield_display: string;
      date_of_harvest: string;
    }>;
    barangay?: string;
    crop?: string;
  }>(),
  {
    rows: () => [],
    barangay: '',
    crop: 'Rice',
  },
);

const cropLabel = computed(() => props.crop || 'Rice');

const totalHa = computed(() =>
  props.rows.reduce((s, r) => s + (Number(r.area_harvested) || 0), 0).toFixed(2),
);

const paddedRows = computed(() => {
  const list = [...props.rows];
  const min = 18;
  if (list.length >= min) return list;
  return [...list, ...Array(min - list.length).fill(null)];
});
</script>

<style scoped>
.brgy-doc {
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

.totals { text-align: right; font-size: 9pt; margin: 8px 0 0; font-weight: bold; }

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
  .brgy-doc { padding: 0; max-width: 100%; }
  @page { size: landscape; margin: 8mm; }
}
</style>
