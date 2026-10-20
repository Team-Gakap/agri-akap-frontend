import type { ExecutiveReportCategory } from '@/constants/executiveReportingColumns';

export type ExecutiveReportRow = Record<string, string | number>;

interface MockRecord extends ExecutiveReportRow {
  category: ExecutiveReportCategory;
  barangay: string;
  crop_type: string;
  report_date: string;
}

const MOCK_POOL: MockRecord[] = [
  {
    category: 'crop_production',
    barangay: 'San Fabian',
    crop_type: 'Rice',
    report_date: '2026-07-10',
    rsbsa_no: '01-28-03-005-000012',
    last_name: 'Dela Cruz',
    first_name: 'Juan',
    middle_name: 'Santos',
    ext_name: '',
    birthday: '1978-03-14',
    farmer_address: 'Purok 2, San Fabian',
    farm_location: 'Sitio Malabnig',
    area_planted: '0.75',
    date_of_planting: '2026-06-18',
  },
  {
    category: 'crop_production',
    barangay: 'San Fabian',
    crop_type: 'Corn',
    report_date: '2026-07-12',
    rsbsa_no: '01-28-03-005-000034',
    last_name: 'Reyes',
    first_name: 'Maria',
    middle_name: 'Lopez',
    ext_name: '',
    birthday: '1985-11-02',
    farmer_address: 'Purok 5, San Fabian',
    farm_location: 'Brgy. Proper',
    area_planted: '1.20',
    date_of_planting: '2026-06-25',
  },
  {
    category: 'crop_production',
    barangay: 'Soyung',
    crop_type: 'Rice',
    report_date: '2026-07-08',
    rsbsa_no: '01-28-03-005-000078',
    last_name: 'Garcia',
    first_name: 'Pedro',
    middle_name: 'M.',
    ext_name: 'Jr.',
    birthday: '1972-07-21',
    farmer_address: 'Rizal St., Soyung',
    farm_location: 'Irrigated Field A',
    area_planted: '2.00',
    date_of_planting: '2026-06-10',
  },
  {
    category: 'masterlists',
    barangay: 'San Fabian',
    crop_type: 'Rice',
    report_date: '2026-07-05',
    rsbsa_no: '01-28-03-005-000012',
    last_name: 'Dela Cruz',
    first_name: 'Juan',
    middle_name: 'Santos',
    ext_name: '',
    birthday: '1978-03-14',
    farmer_address: 'Purok 2, San Fabian',
    farm_location: 'Sitio Malabnig',
    area_planted: '0.75',
    source_of_water: 'Irrigation Canal',
    remarks: 'Seed subsidy recipient 2026',
  },
  {
    category: 'masterlists',
    barangay: 'Annafunan',
    crop_type: 'Corn',
    report_date: '2026-07-14',
    rsbsa_no: '01-28-03-005-000091',
    last_name: 'Bautista',
    first_name: 'Ana',
    middle_name: 'V.',
    ext_name: '',
    birthday: '1990-01-30',
    farmer_address: 'Annafunan Centro',
    farm_location: 'Vegetable Demo Plot',
    area_planted: '0.35',
    source_of_water: 'Deep Well',
    remarks: 'High-value crops program',
  },
  {
    category: 'pest_surveillance',
    barangay: 'San Fabian',
    crop_type: 'Rice',
    report_date: '2026-07-15',
    rsbsa_no: '01-28-03-005-000034',
    last_name: 'Reyes',
    first_name: 'Maria',
    middle_name: 'Lopez',
    ext_name: '',
    birthday: '1985-11-02',
    farmer_address: 'Purok 5, San Fabian',
    farm_location: 'Brgy. Proper',
    area_planted: '1.20',
    days_after_planting: 28,
    variety: 'NSIC Rc 222',
    area_damage_pct: '15',
    damage_by_pest: 'Brown Planthopper',
  },
  {
    category: 'pest_surveillance',
    barangay: 'Soyung',
    crop_type: 'Corn',
    report_date: '2026-07-16',
    rsbsa_no: '01-28-03-005-000102',
    last_name: 'Mendoza',
    first_name: 'Carlos',
    middle_name: 'R.',
    ext_name: '',
    birthday: '1980-09-09',
    farmer_address: 'Mabini St., Soyung',
    farm_location: 'Upper Field',
    area_planted: '0.90',
    days_after_planting: 42,
    variety: 'Hybrid Yellow',
    area_damage_pct: '8',
    damage_by_pest: 'Fall Armyworm',
  },
  {
    category: 'damage_calamity',
    barangay: 'Annafunan',
    crop_type: 'Rice',
    report_date: '2026-07-18',
    rsbsa_no: '01-28-03-005-000055',
    last_name: 'Torres',
    first_name: 'Ricardo',
    middle_name: 'P.',
    ext_name: '',
    farm_location: 'Flood-prone Parcel 3',
    stage_of_crop: 'Tillering',
    area_planted: '1.50',
    area_damaged: '0.60',
    est_yield_loss_pct: '40',
  },
  {
    category: 'damage_calamity',
    barangay: 'San Fabian',
    crop_type: 'Corn',
    report_date: '2026-07-19',
    rsbsa_no: '01-28-03-005-000067',
    last_name: 'Aquino',
    first_name: 'Liza',
    middle_name: 'D.',
    ext_name: '',
    farm_location: 'Riverbank Lot',
    stage_of_crop: 'Vegetative',
    area_planted: '0.80',
    area_damaged: '0.25',
    est_yield_loss_pct: '30',
  },
  {
    category: 'damage_calamity',
    barangay: 'Soyung',
    crop_type: 'Corn',
    report_date: '2026-07-20',
    rsbsa_no: '01-28-03-005-000088',
    last_name: 'Flores',
    first_name: 'Benjamin',
    middle_name: 'T.',
    ext_name: 'Sr.',
    farm_location: 'Greenhouse Cluster',
    stage_of_crop: 'Flowering',
    area_planted: '0.40',
    area_damaged: '0.10',
    est_yield_loss_pct: '25',
  },
];

export function getMockExecutiveRows(category: ExecutiveReportCategory): ExecutiveReportRow[] {
  return MOCK_POOL.filter((r) => r.category === category).map(({ category: _c, barangay: _b, crop_type: _ct, report_date: _d, ...row }) => row);
}

export function filterMockExecutiveRows(
  category: ExecutiveReportCategory,
  filters: { barangay: string; cropType: string; dateFrom: string; dateTo: string },
): ExecutiveReportRow[] {
  return MOCK_POOL.filter((r) => {
    if (r.category !== category) return false;
    if (filters.barangay && r.barangay !== filters.barangay) return false;
    if (filters.cropType && r.crop_type !== filters.cropType) return false;
    if (filters.dateFrom && r.report_date < filters.dateFrom) return false;
    if (filters.dateTo && r.report_date > filters.dateTo) return false;
    return true;
  }).map(({ category: _c, barangay, crop_type, report_date, ...row }) => ({
    ...row,
    barangay,
    crop_type,
    report_date,
  }));
}
