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
