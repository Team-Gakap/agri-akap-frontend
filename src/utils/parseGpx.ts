/** Parse GPX track/route/waypoints into [{lat, lng}, …] for farm-plot boundaries. */
export function parseGpxPoints(xml: string): { lat: number; lng: number }[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];

  const nodes = [
    ...Array.from(doc.getElementsByTagName('trkpt')),
    ...Array.from(doc.getElementsByTagName('rtept')),
    ...Array.from(doc.getElementsByTagName('wpt')),
  ];

  const points: { lat: number; lng: number }[] = [];
  for (const el of nodes) {
    const lat = Number(el.getAttribute('lat'));
    const lng = Number(el.getAttribute('lon'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng });
    }
  }
  return points;
}
