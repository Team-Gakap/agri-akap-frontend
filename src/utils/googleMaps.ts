import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/**
 * Loads the Google Maps JavaScript API once (idempotent) and makes the
 * global `google.maps.*` namespace available. Used by the Admin GIS views
 * (Climate Monitor choropleth, Command Center outbreak radar).
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY — see agri-akap-frontend/.env.
 * Technician-facing maps (Farm Map, Geo-Tagging) intentionally keep using
 * Leaflet/OpenStreetMap and do not call this.
 */
let readyPromise: Promise<void> | null = null;

export const ECHAGUE_CENTER = { lat: 16.7053, lng: 121.6772 };

/** Hide POI / transit / road shields; keep waterways and admin boundaries. */
export const ECHAGUE_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export function echagueMapOptions(overrides: google.maps.MapOptions = {}): google.maps.MapOptions {
  return {
    center: ECHAGUE_CENTER,
    zoom: 12,
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    keyboardShortcuts: false,
    gestureHandling: 'greedy',
    styles: ECHAGUE_MAP_STYLES,
    ...overrides,
  };
}

export function loadGoogleMaps(): Promise<void> {
  if (readyPromise) return readyPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return Promise.reject(
      new Error(
        'Missing Google Maps API key. Paste it into VITE_GOOGLE_MAPS_API_KEY in agri-akap-frontend/.env and restart the dev server.',
      ),
    );
  }

  setOptions({ key: apiKey, v: 'weekly' });
  readyPromise = importLibrary('maps').then(() => undefined);
  return readyPromise;
}
