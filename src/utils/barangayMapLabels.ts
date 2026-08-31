import { shortBarangayName, toOfficialBarangayName } from '@/utils/echagueGeoName';

export { shortBarangayName } from '@/utils/echagueGeoName';

const MIN_ZOOM = 11;
const LARGE_ZOOM = 14;

function featureCentroid(feature: google.maps.Data.Feature): google.maps.LatLngLiteral | null {
  const geom = feature.getGeometry();
  if (!geom) return null;
  const bounds = new google.maps.LatLngBounds();
  let count = 0;
  geom.forEachLatLng((ll) => {
    bounds.extend(ll);
    count += 1;
  });
  if (!count) return null;
  const center = bounds.getCenter();
  return { lat: center.lat(), lng: center.lng() };
}

function labelCopy(feature: google.maps.Data.Feature): string {
  const geoName = String(feature.getProperty('adm4_name') ?? '');
  return shortBarangayName(toOfficialBarangayName(geoName));
}

/**
 * Place HTML name labels on each GeoJSON barangay polygon.
 * Must be called after `loadGoogleMaps()` and `map.data.addGeoJson(...)`.
 * Returns a teardown function for Vue `onBeforeUnmount`.
 */
export function mountBarangayLabels(map: google.maps.Map): () => void {
  class BarangayLabelOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;

    constructor(
      private readonly position: google.maps.LatLngLiteral,
      private readonly text: string,
    ) {
      super();
    }

    onAdd() {
      const div = document.createElement('div');
      div.className = 'brgy-map-label';
      div.textContent = this.text;
      div.style.cssText = [
        'position:absolute',
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'user-select:none',
        'white-space:normal',
        'max-width:90px',
        'text-align:center',
        'line-height:1.15',
        'font-weight:800',
        'font-family:inherit',
        'letter-spacing:0.02em',
        'color:#fff',
        'text-shadow:0 0 3px #000,1px 1px 2px #000,-1px -1px 2px #000,1px -1px 2px #000,-1px 1px 2px #000',
      ].join(';');
      this.div = div;
      this.getPanes()?.overlayMouseTarget.appendChild(div);
      this.syncZoom(map.getZoom() ?? 12);
    }

    draw() {
      const proj = this.getProjection();
      if (!proj || !this.div) return;
      const point = proj.fromLatLngToDivPixel(
        new google.maps.LatLng(this.position.lat, this.position.lng),
      );
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }

    syncZoom(zoom: number) {
      if (!this.div) return;
      if (zoom < MIN_ZOOM) {
        this.div.style.display = 'none';
        return;
      }
      this.div.style.display = 'block';
      this.div.style.fontSize = zoom >= LARGE_ZOOM ? '12px' : '10px';
    }
  }

  const overlays: BarangayLabelOverlay[] = [];
  map.data.forEach((feature) => {
    const text = labelCopy(feature);
    if (!text) return;
    const center = featureCentroid(feature);
    if (!center) return;
    const overlay = new BarangayLabelOverlay(center, text);
    overlay.setMap(map);
    overlays.push(overlay);
  });

  const applyZoom = () => {
    const zoom = map.getZoom() ?? 12;
    overlays.forEach((overlay) => overlay.syncZoom(zoom));
  };
  applyZoom();
  const listener = map.addListener('zoom_changed', applyZoom);

  return () => {
    listener.remove();
    overlays.forEach((overlay) => overlay.setMap(null));
    overlays.length = 0;
  };
}
