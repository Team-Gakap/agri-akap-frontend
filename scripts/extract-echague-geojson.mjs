#!/usr/bin/env node
/**
 * One-time extraction of Echague, Isabela barangay polygons from the national
 * PSA admin4 GeoJSON dataset. The source file is ~677MB and must never be
 * shipped to or fetched by the frontend; this script slims it down to the
 * ~64 Echague features and writes only the properties the app needs.
 *
 * Usage:
 *   node scripts/extract-echague-geojson.mjs
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE = path.resolve(__dirname, '../../geojson/phl_admin4.geojson');
const OUT_DIR = path.resolve(__dirname, '../public/geo');
const OUT_FILE = path.join(OUT_DIR, 'echague-barangays.geojson');
const ECHAGUE_ADM3_PCODE = 'PH0203112';

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source GeoJSON not found: ${SOURCE}`);
    process.exit(1);
  }

  const features = [];

  const rl = createInterface({
    input: createReadStream(SOURCE, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line.startsWith('{"type":"Feature"')) continue;

    let feature;
    try {
      feature = JSON.parse(line);
    } catch {
      continue;
    }

    if (feature?.properties?.adm3_pcode !== ECHAGUE_ADM3_PCODE) continue;

    features.push({
      type: 'Feature',
      properties: {
        adm4_name: feature.properties.adm4_name,
        adm4_pcode: feature.properties.adm4_pcode,
      },
      geometry: feature.geometry,
    });
  }

  console.log(`Matched ${features.length} Echague barangay features (expected 64).`);
  if (features.length !== 64) {
    console.warn(`WARNING: expected 64 features, got ${features.length}. Double-check adm3_pcode "${ECHAGUE_ADM3_PCODE}".`);
  }

  const names = features.map((f) => f.properties.adm4_name).sort();
  console.log('Barangay names found:', names.join(', '));

  const output = {
    type: 'FeatureCollection',
    name: 'echague-barangays',
    features,
  };

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output));

  console.log(`Wrote ${OUT_FILE}`);
}

main();
