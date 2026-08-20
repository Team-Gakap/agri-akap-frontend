<template>
  <div id="support-qualified-print" class="support-doc">
    <MaoFormHeader
      :show-barangay="false"
      office-title="Municipal Agriculture Office"
      title="Qualified Support Beneficiaries"
    >
      <template #subtitle>
        <p class="doc-meta">Generated: {{ generatedAt }} &middot; Total: {{ rows.length }} farmer(s)</p>
      </template>
    </MaoFormHeader>

    <table class="support-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Farmer</th>
          <th>Barangay</th>
          <th>Crop</th>
          <th>Area Destroyed (ha)</th>
          <th>Damage %</th>
          <th>Support Type</th>
          <th>Quantity</th>
          <th>Date Approved</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td class="ta-center">{{ i + 1 }}</td>
          <td>{{ row.farmer_name }}</td>
          <td>{{ row.barangay }}</td>
          <td>{{ row.crop_type }}</td>
          <td class="ta-center">{{ Number(row.area_destroyed_ha).toFixed(2) }}</td>
          <td class="ta-center">{{ row.damage_percentage }}%</td>
          <td>{{ row.support_type }}</td>
          <td class="ta-center">{{ row.quantity }} {{ row.unit }}</td>
          <td class="nowrap">{{ row.date_approved }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="9" class="ta-center empty-row">No qualified beneficiaries</td>
        </tr>
      </tbody>
    </table>

    <p class="footer-note">
      Support qty provisional MAO guideline; verify against current DA allocation.
    </p>

    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-box"></div>
        <p>Municipal Agriculturist</p>
      </div>
      <div class="sig-line">
        <div class="sig-box"></div>
        <p>Prepared by (MAO Staff)</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MaoFormHeader from '@/components/MaoFormHeader.vue';

withDefaults(
  defineProps<{
    rows?: Array<{
      farmer_name: string;
      barangay: string;
      crop_type: string;
      area_destroyed_ha: number;
      damage_percentage: number;
      support_type: string;
      quantity: number;
      unit: string;
      date_approved: string;
    }>;
    generatedAt?: string;
  }>(),
  {
    rows: () => [],
    generatedAt: '',
  },
);
</script>

<style scoped>
.support-doc {
  background: #fff;
  color: #111;
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
}

.doc-meta { font-size: 10pt; color: #475569; margin: 4px 0 0; }

.support-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9pt; }
.support-table th {
  background: #1a4731;
  color: white;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
}
.support-table td { padding: 5px 8px; border: 1px solid #ddd; }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.empty-row { color: #64748b; font-style: italic; padding: 12px !important; }

.footer-note {
  margin-top: 16px;
  font-size: 8pt;
  color: #64748b;
  font-style: italic;
  text-align: center;
}

.sig-block { display: flex; justify-content: space-around; margin-top: 40px; }
.sig-line { text-align: center; }
.sig-box { width: 180px; border-bottom: 1px solid #000; height: 40px; margin-bottom: 4px; }

@media print {
  .support-doc { padding: 0; max-width: 100%; }
  .support-table { font-size: 8pt; }
}
</style>
