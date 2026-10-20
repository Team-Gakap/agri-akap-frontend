/**
 * The Echague GeoJSON uses short PSA names for six barangays. The app stores
 * the RSBSA masterlist spelling. Bridge the two so map polygons join weather
 * and registry rows.
 *
 * Mirrors OfficialBarangays::canonicalize() in the backend.
 */
import { ECHAGUE_BARANGAYS } from '@/data/echagueBarangays';

const GEO_TO_OFFICIAL_ALIASES: Record<string, string> = {
  'cabugao pob.': 'Cabugao Pob.',
  'cabugao (pob.)': 'Cabugao Pob.',
  'cabugao (poblacion)': 'Cabugao Pob.',
  cabugao: 'Cabugao Pob.',
  'san manuel': 'San Manuel',
  'san manuel (formerly atelan)': 'San Manuel',
  'silauan norte pob.': 'Silauan Norte Pob.',
  'silauan norte (pob.)': 'Silauan Norte Pob.',
  'silauan norte (poblacion)': 'Silauan Norte Pob.',
  'silauan norte': 'Silauan Norte Pob.',
  'silauan sur pob.': 'Silauan Sur Pob.',
  'silauan sur (pob.)': 'Silauan Sur Pob.',
  'silauan sur (poblacion)': 'Silauan Sur Pob.',
  'silauan sur': 'Silauan Sur Pob.',
  soyung: 'Soyung',
  'soyung (poblacion)': 'Soyung',
  taggappan: 'Taggappan',
  'taggappan (poblacion)': 'Taggappan',
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Map a GeoJSON or sheet label to the masterlist barangay name. */
export function toOfficialBarangayName(geoName: string): string {
  const key = normalize(geoName);
  if (GEO_TO_OFFICIAL_ALIASES[key]) {
    return GEO_TO_OFFICIAL_ALIASES[key];
  }
  const match = ECHAGUE_BARANGAYS.find((name) => normalize(name) === key);
  return match ?? geoName.trim();
}

/** Compact label for map overlays — drop older PSA disambiguators. */
export function shortBarangayName(name: string): string {
  return name.replace(' (Poblacion)', '').replace(' (formerly Atelan)', '');
}

/**
 * Build a lookup from normalized official barangay name -> row, so polygons
 * can find their weather data regardless of the exact GeoJSON spelling.
 */
export function indexByOfficialName<T extends { barangay_name: string }>(
  rows: T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(normalize(row.barangay_name), row);
    map.set(normalize(toOfficialBarangayName(row.barangay_name)), row);
  }
  return map;
}

/** Look up a row for a GeoJSON feature's adm4_name against an indexed row map. */
export function findRowForGeoName<T extends { barangay_name: string }>(
  geoName: string,
  indexed: Map<string, T>,
): T | undefined {
  const official = toOfficialBarangayName(geoName);
  return indexed.get(normalize(official)) ?? indexed.get(normalize(geoName));
}
