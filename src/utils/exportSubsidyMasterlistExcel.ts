import ExcelJS from 'exceljs';

export interface MasterlistExportRow {
  rsbsa_no: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  barangay: string;
  farm_area: number;
  calculated_allocation: number;
  calculated_allocation_secondary?: number | null;
  priority_tier?: number | null;
  status: string;
}

export async function exportSubsidyMasterlistExcel(options: {
  filename: string;
  programName: string;
  unit: string;
  secondaryUnit?: string | null;
  rows: MasterlistExportRow[];
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Masterlist');
  const hasSecondary = !!options.secondaryUnit;

  sheet.addRow(['AGRI-AKAP Subsidy Masterlist']);
  sheet.addRow([options.programName]);
  sheet.addRow([]);

  const headers = [
    'RSBSA No.',
    'Last Name',
    'First Name',
    'Middle Name',
    'Barangay',
    'Farm Area (ha)',
    `Allocation (${options.unit})`,
  ];
  if (hasSecondary) headers.push(`Allocation (${options.secondaryUnit})`);
  headers.push('Priority Tier', 'Status');
  sheet.addRow(headers);

  options.rows.forEach((row) => {
    const values: Array<string | number> = [
      row.rsbsa_no,
      row.last_name || '',
      row.first_name || '',
      row.middle_name || '',
      row.barangay || '',
      Number(row.farm_area || 0),
      Number(row.calculated_allocation || 0),
    ];
    if (hasSecondary) values.push(Number(row.calculated_allocation_secondary || 0));
    values.push(row.priority_tier ?? '');
    values.push(row.status);
    sheet.addRow(values);
  });

  sheet.getRow(4).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename;
  link.click();
  URL.revokeObjectURL(url);
}
