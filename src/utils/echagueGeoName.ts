/**
 * The Echague GeoJSON (public/geo/echague-barangays.geojson) is extracted
 * from the national PSA admin4 dataset, which uses short, unsuffixed names
 * for six barangays. The app's official records (tbl_barangays / weather
 * heatmap rows) use longer disambiguated names. Bridge the two here so map
 * polygons join correctly to weather rows.
 *
 * Mirrors NAME_ALIASES in agri-akap-backend/database/seeders/BarangayCoordinateSeeder.php.
 */
const GEO_TO_OFFICIAL_ALIASES: Record<string, string> = {
  'cabugao (pob.)': 'Cabugao (Poblacion)',
  'san manuel': 'San Manuel (formerly Atelan)',
  'silauan norte (pob.)': 'Silauan Norte (Poblacion)',
  'silauan sur (pob.)': 'Silauan Sur (Poblacion)',
  soyung: 'Soyung (Poblacion)',
  taggappan: 'Taggappan (Poblacion)',
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Map a GeoJSON `adm4_name` to the official `barangay_name` used by the API. */
export function toOfficialBarangayName(geoName: string): string {
  const key = normalize(geoName);
  return GEO_TO_OFFICIAL_ALIASES[key] ?? geoName.trim();
}

/** Compact label for map overlays and tables — drop PSA disambiguators. */
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
