// territory.json 스냅샷(오너십) × regions.geojson(지오메트리) → territory.geojson
// "지역×통치구간" 날짜 피처. 각 피처가 valid_from/valid_to를 가져 setFilter로 연도 필터된다.
// (setData 재계산 폐기 — RESEARCH 트랙 D). 연속 동일 owner 구간은 병합, 마지막은 열린 끝.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const rd = (p) => JSON.parse(readFileSync(join(DIR, p), 'utf8'));
const OPEN_FUTURE = 1000000; // 마지막 구간의 열린 끝 (schema.OPEN_FUTURE와 일치)

const regions = rd('layers/regions.geojson');
const geomById = new Map(regions.features.map(f => [f.properties.id, f]));
const snaps = rd('entities/territory.json').snapshots.slice().sort((a, b) => a.year - b.year);

const ownerAt = (snap, region) => {
  for (const [actor, regs] of Object.entries(snap.control)) if (regs.includes(region)) return actor;
  return null;
};

const emit = (features, geomF, region, iv, to) => features.push({
  type: 'Feature',
  properties: {
    id: `${region}@${iv.from}`, layer: 'territory', region, name_ko: geomF.properties.name_ko,
    actor: iv.actor, valid_from: iv.from, valid_to: to, source: iv.source, confidence: iv.confidence,
  },
  geometry: geomF.geometry,
});

const features = [];
for (const [region, geomF] of geomById) {
  let cur = null; // { actor, from, source, confidence }
  for (const snap of snaps) {
    const owner = ownerAt(snap, region);
    if (owner !== (cur && cur.actor)) {
      if (cur) emit(features, geomF, region, cur, snap.year);
      cur = owner ? { actor: owner, from: snap.year, source: snap.source, confidence: snap.confidence } : null;
    }
  }
  if (cur) emit(features, geomF, region, cur, OPEN_FUTURE);
}

const out = join(DIR, 'layers', 'territory.geojson');
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');
console.log(`wrote ${features.length} territory intervals → ${out}`);
