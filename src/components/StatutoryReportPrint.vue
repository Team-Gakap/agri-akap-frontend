<template>
  <div class="statutory-print" v-if="report">
    <div class="report-cover">
      <div class="cover-logo">
        <img src="@/assets/images/echague-logo.png" alt="MAO" class="cover-img" onerror="this.style.display='none'" />
      </div>
      <h1 class="cover-title">MUNICIPAL AGRICULTURE OFFICE</h1>
      <p class="cover-sub">Echague, Isabela</p>
      <h2 class="cover-report">{{ report.report_type || 'Statutory Report' }}</h2>
      <p class="cover-period" v-if="report.period_label">Reporting Period: {{ report.period_label }}</p>
      <p class="cover-date">Generated: {{ report.generated_at ?? '...' }}</p>
      <p class="cover-filters" v-if="hasFilters">Filters: {{ filterSummary }}</p>
    </div>

    <div class="section-block" v-if="report.standing_area_ha != null">
      <h3 class="section-title">Standing Crop Area</h3>
      <div class="standing-stat">
        <span class="standing-n">{{ Number(report.standing_area_ha).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
        <span class="standing-l">hectares ({{ report.filters_applied?.commodity || 'crop' }})</span>
      </div>
    </div>

    <div class="section-block">
      <h3 class="section-title">Summary Statistics</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="sum-n">{{ report.totals?.farmers?.toLocaleString() }}</span>
          <span class="sum-l">Registered Farmers</span>
        </div>
        <div class="summary-item">
          <span class="sum-n">{{ report.totals?.programs }}</span>
          <span class="sum-l">Programs</span>
        </div>
        <div class="summary-item">
          <span class="sum-n">{{ report.totals?.distributions?.toLocaleString() }}</span>
          <span class="sum-l">Distributions</span>
        </div>
        <div class="summary-item">
          <span class="sum-n">{{ report.totals?.approved_damage_claims }}</span>
          <span class="sum-l">Approved Damage Claims</span>
        </div>
        <div class="summary-item highlight">
          <span class="sum-n">₱{{ Number(report.totals?.total_value_lost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
          <span class="sum-l">Total Value of Losses</span>
        </div>
      </div>
    </div>

    <div class="section-block" v-if="report.program_performance_matrix?.length">
      <h3 class="section-title">Program Performance Matrix</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Program</th>
            <th class="ta-right">Target</th>
            <th class="ta-right">Actual Dispensed</th>
            <th class="ta-right">% Accomplishment</th>
            <th class="ta-right">Beneficiaries</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in report.program_performance_matrix" :key="i">
            <td><strong>{{ row.program_name }}</strong></td>
            <td class="ta-right">{{ row.target_quantity?.toLocaleString() }} {{ row.unit }}</td>
            <td class="ta-right text-green">{{ row.actual_dispensed?.toLocaleString() }} {{ row.unit }}</td>
            <td class="ta-right">{{ row.accomplishment_pct }}%</td>
            <td class="ta-right">{{ row.beneficiaries }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-block">
      <h3 class="section-title">Farmer Distribution by Barangay</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Barangay</th>
            <th class="ta-right">No. of Farmers</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.farmers_by_barangay" :key="row.permanent_brgy">
            <td>{{ row.permanent_brgy }}</td>
            <td class="ta-right">{{ row.count }}</td>
          </tr>
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="ta-right"><strong>{{ report.totals?.farmers }}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-block">
      <h3 class="section-title">Subsidy Programs &amp; Distribution Summary</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Program Name</th>
            <th>Type</th>
            <th>Period</th>
            <th class="ta-right">Total</th>
            <th class="ta-right">Dispensed</th>
            <th class="ta-right">Remaining</th>
            <th class="ta-right">Beneficiaries</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in report.programs" :key="p.id">
            <td><strong>{{ p.name }}</strong></td>
            <td>{{ p.type }}</td>
            <td class="nowrap">{{ p.start_date }} – {{ p.end_date }}</td>
            <td class="ta-right">{{ p.total_quantity?.toLocaleString() }} {{ p.unit }}</td>
            <td class="ta-right text-green">{{ p.dispensed?.toLocaleString() }} {{ p.unit }}</td>
            <td class="ta-right">{{ p.remaining_quantity?.toLocaleString() }} {{ p.unit }}</td>
            <td class="ta-right">{{ p.beneficiaries }}</td>
          </tr>
          <tr v-if="!report.programs?.length">
            <td colspan="7" class="ta-center empty-row">No programs recorded.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-block" v-if="report.pest_summary_by_barangay?.length">
      <h3 class="section-title">Pest Outbreak Summary by Barangay</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Barangay</th>
            <th class="ta-right">Total Outbreaks</th>
            <th class="ta-right">Active</th>
            <th class="ta-right">Resolved</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.pest_summary_by_barangay" :key="row.barangay">
            <td>{{ row.barangay }}</td>
            <td class="ta-right">{{ row.total_outbreaks }}</td>
            <td class="ta-right text-danger">{{ row.active }}</td>
            <td class="ta-right text-green">{{ row.resolved }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section-block">
      <h3 class="section-title">Approved Damage Assessments</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Farmer</th>
            <th>Barangay</th>
            <th>Calamity</th>
            <th>Date</th>
            <th>Commodity</th>
            <th class="ta-right">Area (ha)</th>
            <th class="ta-right">Damage %</th>
            <th class="ta-right">Est. Value Lost</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="da in report.damage_assessments" :key="da.id">
            <td><strong>{{ da.farmer_name }}</strong></td>
            <td>{{ da.barangay }}</td>
            <td>{{ da.calamity_name }}</td>
            <td class="nowrap">{{ da.date_of_calamity }}</td>
            <td>{{ da.commodity }}</td>
            <td class="ta-right">{{ da.area_ha }}</td>
            <td class="ta-right">{{ da.damage_percentage }}%</td>
            <td class="ta-right">₱{{ Number(da.estimated_value_lost ?? 0).toLocaleString() }}</td>
          </tr>
          <tr v-if="!report.damage_assessments?.length">
            <td colspan="8" class="ta-center empty-row">No approved damage assessments.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line"></div>
        <p class="sig-name">{{ collectorName || '____________________' }}</p>
        <p class="sig-title">Agricultural Technologist (Data Collector)</p>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <p class="sig-name">{{ consolidatorName || '____________________' }}</p>
        <p class="sig-title">Municipal Agriculturist</p>
      </div>
      <div class="sig-col sig-date">
        <p class="sig-date-label">Date of Submission</p>
        <p class="sig-date-val">{{ submissionDate || '_______________' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  report: any;
  collectorName?: string;
  consolidatorName?: string;
  submissionDate?: string;
}>();

const hasFilters = computed(() => {
  const f = props.report?.filters_applied;
  return f && (f.barangay || f.commodity || f.date_from || f.date_to);
});

const filterSummary = computed(() => {
  const f = props.report?.filters_applied ?? {};
  const parts: string[] = [];
  if (f.barangay) parts.push(`Barangay: ${f.barangay}`);
  if (f.commodity) parts.push(`Commodity: ${f.commodity}`);
  if (f.date_from) parts.push(`From: ${f.date_from}`);
  if (f.date_to) parts.push(`To: ${f.date_to}`);
  return parts.join(' · ') || 'None';
});
</script>

<style scoped>
.statutory-print { max-width: 1000px; margin: 0 auto; padding-bottom: 2rem; }
.report-cover { text-align: center; padding: 2rem 1rem 2.5rem; background: white; border-radius: 12px; border: 2px solid #1a4731; margin-bottom: 2rem; }
.cover-logo { margin-bottom: 1rem; }
.cover-img { width: 80px; height: 80px; object-fit: contain; }
.cover-title { font-size: 1.2rem; font-weight: 900; color: #1a4731; margin: 0; letter-spacing: 1px; }
.cover-sub { color: #64748b; font-size: 0.9rem; margin: 4px 0 1rem; }
.cover-report { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0 0 4px; }
.cover-period { color: #475569; font-size: 0.9rem; margin: 4px 0; font-weight: 600; }
.cover-date { color: #94a3b8; font-size: 0.85rem; margin: 0; }
.cover-filters { color: #64748b; font-size: 0.8rem; margin: 8px 0 0; }
.standing-stat { padding: 1.5rem; text-align: center; }
.standing-n { display: block; font-size: 2rem; font-weight: 900; color: #1a4731; }
.standing-l { display: block; font-size: 0.8rem; color: #64748b; text-transform: uppercase; margin-top: 4px; }
.section-block { background: white; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; overflow: hidden; break-inside: avoid; }
.section-title { background: #1a4731; color: white; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.5px; padding: 10px 16px; margin: 0; text-transform: uppercase; }
.summary-grid { display: flex; flex-wrap: wrap; gap: 1px; background: #e2e8f0; }
.summary-item { background: white; flex: 1; min-width: 150px; padding: 1.25rem; text-align: center; }
.summary-item.highlight { background: #e8f5e9; }
.sum-n { display: block; font-size: 1.8rem; font-weight: 900; color: #1a4731; }
.sum-l { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
.report-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.report-table th { padding: 0.7rem 1rem; background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
.report-table td { padding: 0.7rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
.total-row td { background: #f0fdf4; font-weight: 700; }
.ta-right { text-align: right; }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-green { color: #2e7d32; font-weight: 700; }
.text-danger { color: #c0392b; font-weight: 700; }
.empty-row { color: #94a3b8; padding: 1.5rem; }
.signature-block { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 1.5rem; padding: 2rem 1rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 2rem; break-inside: avoid; }
.sig-col { text-align: center; min-width: 180px; }
.sig-line { width: 200px; border-bottom: 2px solid #1a4731; margin: 0 auto 6px; height: 40px; }
.sig-name { font-weight: 700; color: #0f172a; margin: 0; font-size: 0.9rem; }
.sig-title { color: #64748b; margin: 2px 0 0; font-size: 0.8rem; }
.sig-date { display: flex; flex-direction: column; justify-content: flex-end; }
.sig-date-label { font-size: 0.8rem; color: #64748b; margin: 0; }
.sig-date-val { font-weight: 700; color: #0f172a; margin: 4px 0 0; font-size: 0.95rem; }
@media print {
  .statutory-print { max-width: 100%; padding: 0; }
  .report-cover, .section-block, .signature-block { break-inside: avoid; page-break-inside: avoid; }
  .report-table { font-size: 0.75rem; }
  .report-table th, .report-table td { padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; }
}
</style>
