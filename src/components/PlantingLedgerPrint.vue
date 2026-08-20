<template>
  <div id="planting-ledger-print" class="planting-doc">
    <MaoFormHeader
      :barangay="barangay"
      :office-title="showMaoHeader ? 'MUNICIPAL AGRICULTURE OFFICE' : ''"
      :program-line="showMaoHeader && cropLabel ? `${cropLabel.toUpperCase()} PROGRAM` : ''"
      :title="formTitle"
    >
      <template v-if="subtitle" #subtitle>
        <p class="doc-sub">{{ subtitle }}</p>
      </template>
    </MaoFormHeader>

    <table class="form-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in paddedRows" :key="i">
          <td v-for="col in columns" :key="col.key" :class="{ 'ta-center': col.center }">
            {{ row ? row[col.key] : '' }}
          </td>
        </tr>
      </tbody>
    </table>

    <p class="totals" v-if="totalsLabel">{{ totalsLabel }}</p>

    <div class="sig-block">
      <div class="sig-col">
        <p class="sig-label">{{ leftSigLabel }}</p>
        <div class="sig-line"></div>
        <p class="sig-title">Committee on Agriculture</p>
      </div>
      <div class="sig-col">
        <p class="sig-label">{{ rightSigLabel }}</p>
        <div class="sig-line"></div>
        <p class="sig-title">Brgy. Captain</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MaoFormHeader from '@/components/MaoFormHeader.vue';

export type PlantingPrintMode = 'already_planted' | 'not_continued' | 'with_water' | 'without_water';

const props = withDefaults(
  defineProps<{
    rows?: Record<string, string | number>[];
    barangay?: string;
    crop?: string;
    mode: PlantingPrintMode;
  }>(),
  {
    rows: () => [],
    barangay: '',
    crop: 'Rice',
  },
);

const cropLabel = computed(() => props.crop || 'Rice');

const formTitle = computed(() => {
  const crop = cropLabel.value.toUpperCase();
  if (props.mode === 'not_continued') return `LIST OF FARMERS WHO PLANTED BUT NOT CONTINUED`;
  if (props.mode === 'with_water') return `LIST OF FARMERS WHO PLANTED WITH WATER SOURCE`;
  if (props.mode === 'without_water') return `LIST OF FARMERS WHO PLANTED BUT WITHOUT WATER SOURCE`;
  return `LIST OF FARMERS ALREADY PLANTED ${crop}`;
});

const subtitle = computed(() =>
  props.mode === 'already_planted' ? 'WEEKLY PLANTING REPORT' : ''
);

const showMaoHeader = computed(() =>
  ['not_continued', 'with_water', 'without_water'].includes(props.mode)
);

const leftSigLabel = computed(() =>
  props.mode === 'already_planted' ? 'Prepared by:' : 'Prepared and Submitted by:'
);

const rightSigLabel = computed(() =>
  props.mode === 'already_planted' ? 'Noted by:' : 'Certified correct by:'
);

const columns = computed(() => {
  if (props.mode === 'already_planted') {
    return [
      { key: 'no', label: 'NO.', center: true },
      { key: 'rsbsa_no', label: 'RSBSA NO.', center: false },
      { key: 'surname', label: 'LAST NAME', center: false },
      { key: 'first_name', label: 'FIRST NAME', center: false },
      { key: 'middle_name', label: 'MIDDLE NAME', center: false },
      { key: 'ext_name', label: 'EXT NAME', center: false },
      { key: 'birthdate', label: 'BIRTHDAY', center: false },
      { key: 'farmer_address', label: 'FARMER ADDRESS', center: false },
      { key: 'farm_location', label: 'FARM LOCATION', center: false },
      { key: 'area_planted', label: 'AREA PLANTED', center: true },
      { key: 'date_of_planting', label: 'DATE OF PLANTING', center: false },
    ];
  }
  if (props.mode === 'not_continued') {
    return [
      { key: 'no', label: 'NO.', center: true },
      { key: 'surname', label: 'SURNAME', center: false },
      { key: 'first_name', label: 'FIRSTNAME', center: false },
      { key: 'middle_name', label: 'MIDDLE NAME', center: false },
      { key: 'ext_name', label: 'EXT. NAME', center: false },
      { key: 'area_planted', label: 'PLANTED AREA', center: true },
      { key: 'remarks', label: 'REMARKS', center: false },
    ];
  }
  return [
    { key: 'no', label: 'NO.', center: true },
    { key: 'surname', label: 'SURNAME', center: false },
    { key: 'first_name', label: 'FIRSTNAME', center: false },
    { key: 'middle_name', label: 'MIDDLE NAME', center: false },
    { key: 'ext_name', label: 'EXT. NAME', center: false },
    { key: 'area_planted', label: 'PLANTED AREA', center: true },
    { key: 'water_source', label: 'SOURCE OF WATER', center: false },
    { key: 'remarks', label: 'REMARKS', center: false },
  ];
});

const paddedRows = computed(() => {
  const list = props.rows.map((r, i) => ({ ...r, no: i + 1 }));
  const min = 20;
  if (list.length >= min) return list;
  return [...list, ...Array(min - list.length).fill(null)];
});

const totalsLabel = computed(() => {
  const totalHa = props.rows.reduce((s, r) => s + (Number(r.area_planted_num) || 0), 0);
  return `${props.rows.length} / ${totalHa.toFixed(2)} ha`;
});
</script>

<style scoped>
.planting-doc {
  background: #fff;
  color: #111;
  padding: 16px 20px;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Times New Roman', Times, serif;
  font-size: 10pt;
}

.doc-sub { margin: 4px 0 0; font-size: 10pt; font-weight: bold; text-align: left; }

.form-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.form-table th, .form-table td {
  border: 1px solid #000;
  padding: 3px 4px;
  vertical-align: top;
  height: 18px;
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
  .planting-doc { padding: 0; max-width: 100%; }
  @page { size: landscape; margin: 10mm; }
}
</style>
