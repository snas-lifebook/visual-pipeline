// movements.json(원정로 waypoints) → movements.geojson (dated LineString 세그먼트).
// 연속 waypoint 쌍 = 한 세그먼트. valid_from=도착 waypoint year(그 해에 그려짐),
// valid_to=OPEN_FUTURE(타임라인 진행 시 누적). setFilter로 연도 필터(다른 시간가변 레이어와 동일).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const OPEN_FUTURE = 1000000; // schema.OPEN_FUTURE와 일치
const routes = JSON.parse(readFileSync(join(DIR, 'entities', 'movements.json'), 'utf8')).routes;

const features = [];
for (const r of routes) {
  const w = r.waypoints;
  for (let i = 0; i < w.length - 1; i++) {
    const a = w[i], b = w[i + 1];
    features.push({
      type: 'Feature',
      properties: {
        id: `${r.id}@${i}`, layer: 'movements', route: r.id, name_ko: r.name_ko,
        actor: r.actor, label: b.label, from_year: a.year, to_year: b.year,
        valid_from: b.year, valid_to: OPEN_FUTURE, source: r.source, confidence: r.confidence,
      },
      geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
    });
  }
}

const out = join(DIR, 'layers', 'movements.geojson');
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');
console.log(`wrote ${features.length} movement segments → ${out}`);
