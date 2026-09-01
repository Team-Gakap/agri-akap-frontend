export type FarmerNameRow = {
  surname?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  name?: string;
  farmer_name?: string;
};

export function rowMatchesNameSearch(row: FarmerNameRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    row.surname,
    row.last_name,
    row.first_name,
    row.middle_name,
    row.name,
    row.farmer_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return parts.includes(q);
}

export const FARMER_NAME_HEADERS = [
  { key: 'surname', label: 'Last Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
] as const;
