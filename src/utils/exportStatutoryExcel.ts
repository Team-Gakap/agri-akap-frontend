import ExcelJS from 'exceljs';
import echagueLogoUrl from '@/assets/images/echague-logo.png';
import bagongPilipinasLogoUrl from '@/assets/images/bagong-pilipinas-seeklogo.png';

export interface ExcelColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ExcelSignature {
  label: string;
  title: string;
}

export interface StatutoryExcelOptions {
  filename: string;
  headerLines: string[];
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  minRows?: number;
  footerLines?: string[];
  footerAlign?: 'left' | 'center' | 'right';
  signatures?: ExcelSignature[];
  includeLogos?: boolean;
  getCellValue?: (
    row: Record<string, unknown> | null,
    key: string,
    index: number,
  ) => string | number;
}

const FORM_FONT = 'Times New Roman';
const TABLE_FONT_SIZE = 7.5;
const GOV_FONT_SIZE = 9;
const BRGY_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 12;
const SUBTITLE_FONT_SIZE = 10;

/** Target total character-width for all columns on landscape A4 */
const LANDSCAPE_WIDTH_TARGET = 116;

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  no: 4.5,
  rsbsa_no: 12,
  surname: 10,
  first_name: 10,
  middle_name: 10,
  ext_name: 7,
  birthdate: 9,
  farmer_address: 16,
  farm_location: 14,
  area_planted: 8.5,
  days_after_planting: 8,
  variety: 9,
  area_damage_pct: 8,
  damage_by: 14,
  area_ha: 8.5,
  area_harvested: 9,
  area_damaged: 9,
  crop_type: 9,
  growth_stage: 11,
  est_harvest_date: 11,
  date_of_harvest: 11,
  yield_display: 10,
  crop_stage: 10,
  est_yield_loss_pct: 9,
  date_of_planting: 10,
  water_source: 12,
  remarks: 12,
};

const CENTER_KEYS = new Set([
  'no',
  'ext_name',
  'birthdate',
  'area_planted',
  'days_after_planting',
  'area_damage_pct',
  'area_ha',
  'area_harvested',
  'area_damaged',
  'est_yield_loss_pct',
  'crop_type',
  'crop_stage',
  'variety',
  'date_of_planting',
  'date_of_harvest',
  'est_harvest_date',
]);

let logoBuffersPromise: Promise<{
  echague: ArrayBuffer;
  bagong: ArrayBuffer;
  echagueSize: ImageSize;
  bagongSize: ImageSize;
}> | null = null;

interface ImageSize {
  width: number;
  height: number;
}

function readImageSize(buffer: ArrayBuffer): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image dimensions'));
    };
    img.src = url;
  });
}

function loadLogoBuffers(): Promise<{
  echague: ArrayBuffer;
  bagong: ArrayBuffer;
  echagueSize: ImageSize;
  bagongSize: ImageSize;
}> {
  if (!logoBuffersPromise) {
    logoBuffersPromise = Promise.all([
      fetch(echagueLogoUrl).then((r) => r.arrayBuffer()),
      fetch(bagongPilipinasLogoUrl).then((r) => r.arrayBuffer()),
    ]).then(async ([echague, bagong]) => ({
      echague,
      bagong,
      echagueSize: await readImageSize(echague),
      bagongSize: await readImageSize(bagong),
    }));
  }
  return logoBuffersPromise;
}

/** Approximate column width in pixels (Excel default font). */
function columnWidthPx(ws: ExcelJS.Worksheet, col: number): number {
  const w = ws.getColumn(col).width ?? 8;
  return w * 7 + 5;
}

/** Approximate row height in pixels. */
function rowHeightPx(ws: ExcelJS.Worksheet, row: number): number {
  const h = ws.getRow(row).height ?? 15;
  return h * (96 / 72);
}

function containSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
): ImageSize {
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
}

/** Place logo with object-fit: contain — never stretch aspect ratio. */
function placeContainedLogo(
  ws: ExcelJS.Worksheet,
  imageId: number,
  naturalSize: ImageSize,
  box: { colStart: number; colEnd: number; rowStart: number; rowEnd: number },
): void {
  let boxWidthPx = 0;
  for (let c = box.colStart; c <= box.colEnd; c += 1) {
    boxWidthPx += columnWidthPx(ws, c);
  }

  let boxHeightPx = 0;
  for (let r = box.rowStart; r <= box.rowEnd; r += 1) {
    boxHeightPx += rowHeightPx(ws, r);
  }

  const fitted = containSize(
    naturalSize.width,
    naturalSize.height,
    boxWidthPx * 0.88,
    boxHeightPx * 0.88,
  );

  const leftPadPx = (boxWidthPx - fitted.width) / 2;
  const topPadPx = (boxHeightPx - fitted.height) / 2;

  let tlCol = box.colStart - 1;
  let colPad = leftPadPx;
  for (let c = box.colStart; c <= box.colEnd; c += 1) {
    const cw = columnWidthPx(ws, c);
    if (colPad >= cw) {
      colPad -= cw;
      tlCol += 1;
    } else {
      tlCol += colPad / cw;
      break;
    }
  }

  let tlRow = box.rowStart - 1;
  let rowPad = topPadPx;
  for (let r = box.rowStart; r <= box.rowEnd; r += 1) {
    const rh = rowHeightPx(ws, r);
    if (rowPad >= rh) {
      rowPad -= rh;
      tlRow += 1;
    } else {
      tlRow += rowPad / rh;
      break;
    }
  }

  ws.addImage(imageId, {
    tl: { col: tlCol, row: tlRow },
    ext: { width: fitted.width, height: fitted.height },
  });
}

export function padStatutoryRows<T>(rows: T[], min: number): (T | null)[] {
  if (rows.length >= min) return [...rows];
  return [...rows, ...Array(min - rows.length).fill(null)];
}

export function slugFilename(value: string, fallback = 'report'): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function rawColWidth(col: ExcelColumn): number {
  if (col.width) return col.width;
  if (DEFAULT_COL_WIDTHS[col.key]) return DEFAULT_COL_WIDTHS[col.key];
  return Math.max(Math.min(col.label.length + 1.5, 18), 7);
}

function applyScaledColumnWidths(ws: ExcelJS.Worksheet, columns: ExcelColumn[]): void {
  const raw = columns.map(rawColWidth);
  const sum = raw.reduce((a, b) => a + b, 0);
  const scale = LANDSCAPE_WIDTH_TARGET / sum;
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = Math.max(raw[i] * scale, 4);
  });
}

interface HeaderLineStyle {
  fontSize: number;
  bold: boolean;
  rowHeight: number;
}

function getHeaderLineStyle(line: string): HeaderLineStyle {
  if (/^Republic of the Philippines|^Province of|^Municipality of/i.test(line)) {
    return { fontSize: GOV_FONT_SIZE, bold: false, rowHeight: 14 };
  }
  if (/^BARANGAY /i.test(line)) {
    return { fontSize: BRGY_FONT_SIZE, bold: true, rowHeight: 16 };
  }
  if (/^MUNICIPAL AGRICULTURE OFFICE/i.test(line)) {
    return { fontSize: TITLE_FONT_SIZE, bold: true, rowHeight: 17 };
  }
  if (/^Calamity:|^Generated:|^Period:|^Barangay:| · /i.test(line)) {
    return { fontSize: SUBTITLE_FONT_SIZE, bold: true, rowHeight: 15 };
  }
  if (
    /MONITORING OF|LIST OF|STANDING CROP|HARVESTING REPORT|DAMAGE & CALAMITY|WEEKLY PLANTING|CROP PRODUCTION|PEST SURVEILLANCE|SUBSIDY|LIQUIDATION|EXECUTIVE/i.test(
      line,
    )
  ) {
    return { fontSize: TITLE_FONT_SIZE, bold: true, rowHeight: 17 };
  }
  if (/ PROGRAM$/i.test(line)) {
    return { fontSize: BRGY_FONT_SIZE, bold: true, rowHeight: 16 };
  }
  return { fontSize: GOV_FONT_SIZE, bold: false, rowHeight: 14 };
}

function defaultAlign(col: ExcelColumn): 'left' | 'center' | 'right' {
  if (col.align) return col.align;
  if (CENTER_KEYS.has(col.key)) return 'center';
  return 'left';
}

function resolveCellValue(
  row: Record<string, unknown> | null,
  col: ExcelColumn,
  index: number,
  getCellValue?: StatutoryExcelOptions['getCellValue'],
): string | number {
  if (!row) return '';
  if (getCellValue) return getCellValue(row, col.key, index);
  if (col.key === 'no') return index + 1;
  const value = row[col.key];
  if (value == null) return '';
  if (typeof value === 'number') return value;
  return String(value);
}

function applyTableCellStyle(
  cell: ExcelJS.Cell,
  opts: { bold?: boolean; align?: 'left' | 'center' | 'right'; wrap?: boolean; header?: boolean },
) {
  cell.font = {
    name: FORM_FONT,
    size: TABLE_FONT_SIZE,
    bold: opts.bold ?? false,
  };
  cell.alignment = {
    horizontal: opts.align ?? 'left',
    vertical: 'middle',
    wrapText: opts.wrap ?? false,
  };
  cell.border = THIN_BORDER;
  if (opts.header) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
  }
}

function signatureSpan(
  colCount: number,
  sigIndex: number,
  sigCount: number,
): { startCol: number; endCol: number } {
  if (sigCount === 2) {
    const half = Math.floor(colCount / 2);
    if (sigIndex === 0) return { startCol: 1, endCol: half - 1 };
    return { startCol: half + 2, endCol: colCount };
  }
  const block = Math.floor(colCount / sigCount);
  const startCol = sigIndex * block + 1;
  const endCol = sigIndex === sigCount - 1 ? colCount : startCol + block - 1;
  return { startCol, endCol };
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportStatutoryExcel(options: StatutoryExcelOptions): Promise<void> {
  const { columns, minRows = 20, includeLogos = true } = options;
  const colCount = Math.max(columns.length, 1);
  const padded = padStatutoryRows(options.rows, minRows);
  const filteredHeaderLines = options.headerLines.filter(Boolean);
  const headerLineCount = Math.max(filteredHeaderLines.length, 5);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Agri-AKAP';
  const ws = workbook.addWorksheet('Report', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 15 },
  });

  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.45,
      bottom: 0.45,
      header: 0.15,
      footer: 0.15,
    },
  };

  applyScaledColumnWidths(ws, columns);

  const logoColLeftEnd = 2;
  const logoColRightStart = colCount - 1;
  const textColStart = logoColLeftEnd + 1;
  const textColEnd = logoColRightStart - 1;

  if (includeLogos && colCount >= 6) {
    ws.mergeCells(1, 1, headerLineCount, logoColLeftEnd);
    ws.mergeCells(1, logoColRightStart, headerLineCount, colCount);
  }

  let rowIndex = 1;
  filteredHeaderLines.forEach((line) => {
    const style = getHeaderLineStyle(line);
    if (includeLogos && colCount >= 6) {
      ws.mergeCells(rowIndex, textColStart, rowIndex, textColEnd);
      const cell = ws.getCell(rowIndex, textColStart);
      cell.value = line;
      cell.font = { name: FORM_FONT, size: style.fontSize, bold: style.bold };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    } else {
      ws.mergeCells(rowIndex, 1, rowIndex, colCount);
      const cell = ws.getCell(rowIndex, 1);
      cell.value = line;
      cell.font = { name: FORM_FONT, size: style.fontSize, bold: style.bold };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
    ws.getRow(rowIndex).height = style.rowHeight;
    rowIndex += 1;
  });

  while (rowIndex <= headerLineCount) {
    ws.getRow(rowIndex).height = 14;
    rowIndex += 1;
  }

  if (includeLogos && colCount >= 6) {
    const logos = await loadLogoBuffers();
    const leftLogoId = workbook.addImage({ buffer: logos.echague, extension: 'png' });
    const rightLogoId = workbook.addImage({ buffer: logos.bagong, extension: 'png' });

    placeContainedLogo(ws, leftLogoId, logos.echagueSize, {
      colStart: 1,
      colEnd: logoColLeftEnd,
      rowStart: 1,
      rowEnd: headerLineCount,
    });
    placeContainedLogo(ws, rightLogoId, logos.bagongSize, {
      colStart: logoColRightStart,
      colEnd: colCount,
      rowStart: 1,
      rowEnd: headerLineCount,
    });
  }

  rowIndex += 1;

  const tableHeaderRow = rowIndex;
  columns.forEach((col, i) => {
    const cell = ws.getCell(tableHeaderRow, i + 1);
    cell.value = col.label;
    applyTableCellStyle(cell, { bold: true, align: 'center', wrap: true, header: true });
  });
  ws.getRow(tableHeaderRow).height = 32;

  rowIndex += 1;

  padded.forEach((row, index) => {
    columns.forEach((col, colIndex) => {
      const cell = ws.getCell(rowIndex, colIndex + 1);
      cell.value = resolveCellValue(row as Record<string, unknown> | null, col, index, options.getCellValue);
      applyTableCellStyle(cell, { align: defaultAlign(col) });
    });
    ws.getRow(rowIndex).height = 15;
    rowIndex += 1;
  });

  const footerAlign = options.footerAlign ?? (options.footerLines?.length ? 'right' : 'left');

  if (options.footerLines?.length) {
    rowIndex += 1;
    options.footerLines.forEach((line) => {
      ws.mergeCells(rowIndex, 1, rowIndex, colCount);
      const cell = ws.getCell(rowIndex, 1);
      cell.value = line;
      cell.font = { name: FORM_FONT, size: GOV_FONT_SIZE, bold: true };
      cell.alignment = { horizontal: footerAlign, vertical: 'middle' };
      ws.getRow(rowIndex).height = 16;
      rowIndex += 1;
    });
  }

  if (options.signatures?.length) {
    rowIndex += 2;
    const sigCount = options.signatures.length;
    const sigStartRow = rowIndex;

    const placeSigRow = (
      row: number,
      build: (sig: ExcelSignature, startCol: number, endCol: number) => void,
      rowHeight?: number,
    ) => {
      options.signatures!.forEach((sig, sigIndex) => {
        const { startCol, endCol } = signatureSpan(colCount, sigIndex, sigCount);
        if (endCol <= startCol) return;
        ws.mergeCells(row, startCol, row, endCol);
        build(sig, startCol, endCol);
      });
      if (rowHeight) ws.getRow(row).height = rowHeight;
    };

    placeSigRow(sigStartRow, (sig, startCol) => {
      const labelCell = ws.getCell(sigStartRow, startCol);
      labelCell.value = sig.label;
      labelCell.font = { name: FORM_FONT, size: SUBTITLE_FONT_SIZE };
      labelCell.alignment = { horizontal: 'left', vertical: 'bottom' };
    }, 16);

    placeSigRow(sigStartRow + 1, (_sig, startCol) => {
      const lineCell = ws.getCell(sigStartRow + 1, startCol);
      lineCell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };
    }, 32);

    placeSigRow(sigStartRow + 2, (sig, startCol) => {
      const titleCell = ws.getCell(sigStartRow + 2, startCol);
      titleCell.value = sig.title;
      titleCell.font = { name: FORM_FONT, size: SUBTITLE_FONT_SIZE, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'top' };
    }, 18);

    rowIndex = sigStartRow + 3;
  }

  const lastRow = rowIndex - 1;
  const lastColLetter = ws.getColumn(colCount).letter;
  ws.pageSetup.printArea = `A1:${lastColLetter}${lastRow}`;
  ws.pageSetup.printTitlesRow = `${tableHeaderRow}:${tableHeaderRow}`;

  await downloadWorkbook(workbook, options.filename);
}

export function buildBarangayHeaderLines(
  barangay: string,
  title: string,
  options?: { beforeTitle?: string[]; afterTitle?: string[] },
): string[] {
  return [
    'Republic of the Philippines',
    'Province of Isabela',
    'Municipality of Echague',
    `BARANGAY ${barangay || '____________'}`,
    ...(options?.beforeTitle ?? []),
    title,
    ...(options?.afterTitle ?? []),
  ].filter((line) => line !== '');
}

export function buildMaoHeaderLines(
  reportTitle: string,
  extraLines: string[] = [],
): string[] {
  return [
    'Republic of the Philippines',
    'Province of Isabela',
    'Municipality of Echague',
    'MUNICIPAL AGRICULTURE OFFICE',
    reportTitle,
    ...extraLines,
  ];
}
