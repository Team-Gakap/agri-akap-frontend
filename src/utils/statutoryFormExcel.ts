import type { PlantingPrintMode } from '@/components/PlantingLedgerPrint.vue';
import type { ReportColumn } from '@/constants/executiveReportingColumns';
import {
  buildBarangayHeaderLines,
  buildMaoHeaderLines,
  exportStatutoryExcel,
  slugFilename,
  type ExcelColumn,
  type ExcelSignature,
} from '@/utils/exportStatutoryExcel';

const BRGY_SIG_PREPARED: ExcelSignature = {
  label: 'Prepared by:',
  title: 'Committee on Agriculture',
};

const BRGY_SIG_NOTED: ExcelSignature = {
  label: 'Noted by:',
  title: 'Brgy. Captain',
};

const BRGY_SIG_CERTIFIED: ExcelSignature = {
  label: 'Certified correct by:',
  title: 'Brgy. Captain',
};

function brgyCommitteeSigs(preparedLabel = 'Prepared and Submitted by:'): ExcelSignature[] {
  return [
    { label: preparedLabel, title: 'Committee on Agriculture' },
    BRGY_SIG_CERTIFIED,
  ];
}

async function exportBarangayForm(
  filename: string,
  barangay: string,
  title: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
  options?: {
    beforeTitleLines?: string[];
    afterTitleLines?: string[];
    minRows?: number;
    footerLines?: string[];
    footerAlign?: 'left' | 'center' | 'right';
    signatures?: ExcelSignature[];
  },
) {
  await exportStatutoryExcel({
    filename,
    headerLines: buildBarangayHeaderLines(barangay, title, {
      beforeTitle: options?.beforeTitleLines,
      afterTitle: options?.afterTitleLines,
    }),
    columns,
    rows,
    minRows: options?.minRows ?? 20,
    footerLines: options?.footerLines,
    footerAlign: options?.footerAlign ?? (options?.footerLines?.length ? 'right' : 'left'),
    signatures: options?.signatures ?? [BRGY_SIG_PREPARED, BRGY_SIG_NOTED],
  });
}

export async function exportPestMonitoringExcel(params: {
  rows: Record<string, unknown>[];
  barangay: string;
  crop: string;
}) {
  const crop = params.crop || 'Corn';
  await exportBarangayForm(
    `pest-monitoring-${slugFilename(params.barangay)}-${slugFilename(crop)}.xlsx`,
    params.barangay,
    `MONITORING OF ${crop.toUpperCase()} PEST AND DISEASES`,
    [
      { key: 'no', label: 'NO.' },
      { key: 'rsbsa_no', label: 'RSBSA NO.' },
      { key: 'surname', label: 'LAST NAME' },
      { key: 'first_name', label: 'FIRST NAME' },
      { key: 'middle_name', label: 'MIDDLE NAME' },
      { key: 'ext_name', label: 'EXT NAME' },
      { key: 'birthdate', label: 'B-DAY' },
      { key: 'farmer_address', label: 'FARMER ADDRESS' },
      { key: 'farm_location', label: 'FARM LOCATION' },
      { key: 'area_planted', label: 'AREA PLANTED' },
      { key: 'days_after_planting', label: 'DAYS AFTER PLANTING' },
      { key: 'variety', label: 'VARIETY' },
      { key: 'area_damage_pct', label: 'AREA DAMAGE (%)' },
      { key: 'damage_by', label: 'DAMAGE BY PEST/DISEASES' },
    ],
    params.rows,
  );
}

export async function exportStandingCropExcel(params: {
  rows: Record<string, unknown>[];
  barangay: string;
  crop: string;
}) {
  const crop = params.crop || 'Rice';
  const totalHa = params.rows.reduce(
    (sum, row) => sum + (Number(row.area_ha) || 0),
    0,
  );

  await exportBarangayForm(
    `standing-crop-${slugFilename(params.barangay)}-${slugFilename(crop)}.xlsx`,
    params.barangay,
    `STANDING CROP REPORT — ${crop.toUpperCase()}`,
    [
      { key: 'no', label: 'NO.' },
      { key: 'rsbsa_no', label: 'RSBSA NO.' },
      { key: 'surname', label: 'LAST NAME' },
      { key: 'first_name', label: 'FIRST NAME' },
      { key: 'middle_name', label: 'MIDDLE NAME' },
      { key: 'ext_name', label: 'EXT NAME' },
      { key: 'farm_location', label: 'FARM LOCATION' },
      { key: 'crop_type', label: 'CROP TYPE' },
      { key: 'variety', label: 'VARIETY' },
      { key: 'area_ha', label: 'AREA (ha)' },
      { key: 'growth_stage', label: 'GROWTH STAGE' },
      { key: 'est_harvest_date', label: 'EST. DATE OF HARVEST' },
    ],
    params.rows,
    {
      minRows: 18,
      footerLines: [`${params.rows.length} farmer(s) · ${totalHa.toFixed(2)} ha`],
      signatures: brgyCommitteeSigs(),
    },
  );
}

export async function exportHarvestingExcel(params: {
  rows: Record<string, unknown>[];
  barangay: string;
  crop: string;
}) {
  const crop = params.crop || 'Rice';
  const totalHa = params.rows.reduce(
    (sum, row) => sum + (Number(row.area_harvested) || 0),
    0,
  );

  await exportBarangayForm(
    `harvesting-${slugFilename(params.barangay)}-${slugFilename(crop)}.xlsx`,
    params.barangay,
    `HARVESTING REPORT — ${crop.toUpperCase()}`,
    [
      { key: 'no', label: 'NO.' },
      { key: 'rsbsa_no', label: 'RSBSA NO.' },
      { key: 'surname', label: 'LAST NAME' },
      { key: 'first_name', label: 'FIRST NAME' },
      { key: 'middle_name', label: 'MIDDLE NAME' },
      { key: 'ext_name', label: 'EXT NAME' },
      { key: 'farm_location', label: 'FARM LOCATION' },
      { key: 'crop_type', label: 'CROP TYPE' },
      { key: 'variety', label: 'VARIETY' },
      { key: 'area_harvested', label: 'AREA HARVESTED (ha)' },
      { key: 'yield_display', label: 'TOTAL YIELD' },
      { key: 'date_of_harvest', label: 'DATE OF HARVEST' },
    ],
    params.rows,
    {
      minRows: 18,
      footerLines: [`${params.rows.length} farmer(s) · ${totalHa.toFixed(2)} ha harvested`],
      signatures: brgyCommitteeSigs(),
    },
  );
}

export async function exportCalamityAssessmentExcel(params: {
  rows: Record<string, unknown>[];
  barangay: string;
  eventName?: string;
  eventDate?: string;
}) {
  const totalDamaged = params.rows.reduce(
    (sum, row) => sum + (Number(row.area_damaged) || 0),
    0,
  );
  const extraAfter: string[] = [];
  if (params.eventName) {
    extraAfter.push(
      `Calamity: ${params.eventName} · Date of Occurrence: ${params.eventDate || '____________'}`,
    );
  }

  await exportBarangayForm(
    `calamity-assessment-${slugFilename(params.barangay)}.xlsx`,
    params.barangay,
    'DAMAGE & CALAMITY ASSESSMENT REPORT',
    [
      { key: 'no', label: 'NO.' },
      { key: 'rsbsa_no', label: 'RSBSA NO.' },
      { key: 'surname', label: 'LAST NAME' },
      { key: 'first_name', label: 'FIRST NAME' },
      { key: 'middle_name', label: 'MIDDLE NAME' },
      { key: 'ext_name', label: 'EXT NAME' },
      { key: 'farm_location', label: 'FARM LOCATION' },
      { key: 'crop_type', label: 'CROP TYPE' },
      { key: 'crop_stage', label: 'STAGE OF CROP' },
      { key: 'area_planted', label: 'AREA PLANTED (ha)' },
      { key: 'area_damaged', label: 'AREA DAMAGED (ha)' },
      { key: 'est_yield_loss_pct', label: 'EST. YIELD LOSS (%)' },
    ],
    params.rows,
    {
      afterTitleLines: extraAfter,
      minRows: 18,
      footerLines: [`${params.rows.length} affected farmer(s) · ${totalDamaged.toFixed(2)} ha damaged`],
      signatures: brgyCommitteeSigs(),
    },
  );
}

function plantingColumns(mode: PlantingPrintMode): ExcelColumn[] {
  if (mode === 'already_planted') {
    return [
      { key: 'no', label: 'NO.' },
      { key: 'rsbsa_no', label: 'RSBSA NO.' },
      { key: 'surname', label: 'LAST NAME' },
      { key: 'first_name', label: 'FIRST NAME' },
      { key: 'middle_name', label: 'MIDDLE NAME' },
      { key: 'ext_name', label: 'EXT NAME' },
      { key: 'birthdate', label: 'BIRTHDAY' },
      { key: 'farmer_address', label: 'FARMER ADDRESS' },
      { key: 'farm_location', label: 'FARM LOCATION' },
      { key: 'area_planted', label: 'AREA PLANTED' },
      { key: 'date_of_planting', label: 'DATE OF PLANTING' },
    ];
  }
  if (mode === 'not_continued') {
    return [
      { key: 'no', label: 'NO.' },
      { key: 'surname', label: 'SURNAME' },
      { key: 'first_name', label: 'FIRSTNAME' },
      { key: 'middle_name', label: 'MIDDLE NAME' },
      { key: 'ext_name', label: 'EXT. NAME' },
      { key: 'area_planted', label: 'PLANTED AREA' },
      { key: 'remarks', label: 'REMARKS' },
    ];
  }
  return [
    { key: 'no', label: 'NO.' },
    { key: 'surname', label: 'SURNAME' },
    { key: 'first_name', label: 'FIRSTNAME' },
    { key: 'middle_name', label: 'MIDDLE NAME' },
    { key: 'ext_name', label: 'EXT. NAME' },
    { key: 'area_planted', label: 'PLANTED AREA' },
    { key: 'water_source', label: 'SOURCE OF WATER' },
    { key: 'remarks', label: 'REMARKS' },
  ];
}

function plantingTitle(mode: PlantingPrintMode, crop: string): string {
  const cropUpper = crop.toUpperCase();
  if (mode === 'not_continued') return 'LIST OF FARMERS WHO PLANTED BUT NOT CONTINUED';
  if (mode === 'with_water') return 'LIST OF FARMERS WHO PLANTED WITH WATER SOURCE';
  if (mode === 'without_water') return 'LIST OF FARMERS WHO PLANTED BUT WITHOUT WATER SOURCE';
  return `LIST OF FARMERS ALREADY PLANTED ${cropUpper}`;
}

export async function exportPlantingLedgerExcel(params: {
  rows: Record<string, unknown>[];
  barangay: string;
  crop: string;
  mode: PlantingPrintMode;
}) {
  const crop = params.crop || 'Rice';
  const showMaoHeader = ['not_continued', 'with_water', 'without_water'].includes(params.mode);
  const beforeTitle: string[] = [];
  if (showMaoHeader) {
    beforeTitle.push('MUNICIPAL AGRICULTURE OFFICE', `${crop.toUpperCase()} PROGRAM`);
  }
  const afterTitle =
    params.mode === 'already_planted' ? ['WEEKLY PLANTING REPORT'] : [];

  const totalHa = params.rows.reduce(
    (sum, row) => sum + (Number(row.area_planted_num ?? row.area_planted) || 0),
    0,
  );

  const leftSig =
    params.mode === 'already_planted' ? 'Prepared by:' : 'Prepared and Submitted by:';
  const rightSig =
    params.mode === 'already_planted' ? 'Noted by:' : 'Certified correct by:';

  await exportBarangayForm(
    `planting-ledger-${slugFilename(params.barangay)}-${params.mode}.xlsx`,
    params.barangay,
    plantingTitle(params.mode, crop),
    plantingColumns(params.mode),
    params.rows.map((row, index) => ({ ...row, no: index + 1 })),
    {
      beforeTitleLines: beforeTitle,
      afterTitleLines: afterTitle,
      minRows: 20,
      footerLines: [`${params.rows.length} / ${totalHa.toFixed(2)} ha`],
      signatures: [
        { label: leftSig, title: 'Committee on Agriculture' },
        { label: rightSig, title: 'Brgy. Captain' },
      ],
    },
  );
}

export async function exportExecutiveReportExcel(params: {
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  reportTitle: string;
  filterSummary?: string;
  generatedAt?: string;
  preparedBy?: string;
  certifiedBy?: string;
  filename: string;
}) {
  const generatedAt =
    params.generatedAt ??
    new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const extraHeader: string[] = [];
  if (params.filterSummary) extraHeader.push(params.filterSummary);
  extraHeader.push(`Generated: ${generatedAt}`);

  await exportStatutoryExcel({
    filename: params.filename,
    headerLines: buildMaoHeaderLines(params.reportTitle, extraHeader),
    columns: params.columns.map((col) => ({ key: col.key, label: col.label })),
    rows: params.rows as Record<string, unknown>[],
    minRows: 18,
    footerLines: [`${params.rows.length} record(s)`],
    signatures: [
      {
        label: 'Prepared and Submitted by:',
        title: params.preparedBy ? `${params.preparedBy} — MAO Admin / Data Encoder` : 'MAO Admin / Data Encoder',
      },
      {
        label: 'Certified correct by:',
        title: params.certifiedBy || 'Municipal Agriculturist',
      },
    ],
    getCellValue(row, key, index) {
      if (!row) return '';
      if (key === 'no') return index + 1;
      const val = row[key];
      if (val == null) return '';
      if (typeof val === 'number') return val;
      return String(val);
    },
  });
}

export async function exportAdminGridExcel(params: {
  filename: string;
  reportTitle: string;
  officeTitle?: string;
  metaLine?: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  getCellValue?: (
    row: Record<string, unknown>,
    key: string,
    index: number,
  ) => string | number;
}) {
  const headerLines = [
    'Republic of the Philippines',
    'Province of Isabela',
    'Municipality of Echague',
    params.officeTitle || 'Municipal Agriculture Office',
    params.reportTitle,
  ];
  if (params.metaLine) headerLines.push(params.metaLine);

  await exportStatutoryExcel({
    filename: params.filename,
    headerLines,
    columns: params.columns,
    rows: params.rows,
    minRows: 0,
    signatures: [
      { label: '', title: 'Municipal Agriculturist' },
      { label: '', title: 'Prepared by' },
    ],
    getCellValue(row, key, index) {
      if (!row) return '';
      if (params.getCellValue) return params.getCellValue(row, key, index);
      if (key === 'no') return index + 1;
      return row[key] == null ? '' : String(row[key]);
    },
  });
}
