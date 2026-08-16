// battles.json → battles.geojson (dated Point).
// valid_from=year, valid_to=OPEN_FUTURE — 전투는 그 해 발생 후 마커가 남는다.
// 필드는 그대로 통과, geometry만 Point로 승격. setFilter로 연도 필터(다른 시간가변 레이어와 동일).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const OPEN_FUTURE = 1000000; // schema.OPEN_FUTURE와 일치
const battles = JSON.parse(readFileSync(join(DIR, 'entities', 'battles.json'), 'utf8')).battles;

const features = battles.map((b) => ({
  type: 'Feature',
  properties: {
    id: b.id, layer: 'battles', name_ko: b.name_ko, year: b.year,
    valid_from: b.year, valid_to: OPEN_FUTURE,
    belligerents: b.belligerents, general_a: b.general_a, general_b: b.general_b,
    victor: b.victor, strength_a: b.strength_a, strength_b: b.strength_b,
    source: b.source, confidence: b.confidence,
  },
  geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
}));

const out = join(DIR, 'layers', 'battles.geojson');
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');
console.log(`wrote ${features.length} battles → ${out}`);
