// 학술 속주(provincia) 경계 → admin_regions.geojson.
// territory(통치권)와 별개 레이어: 시칠리아는 로마 영토가 BC241이나 정식 속주는 BC227.
// 속주 = 여러 region 지오메트리의 MultiPolygon. BC218 시점엔 정식 속주가 둘뿐.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const rd = (p) => JSON.parse(readFileSync(join(DIR, p), 'utf8'));
const regions = rd('layers/regions.geojson');
const geomById = new Map(regions.features.map((f) => [f.properties.id, f.geometry]));

// 속주: { id, name_ko, name_ancient, members(regionIds), valid_from, note? }
const PROVINCES = [
  { id: 'sicilia', name_ko: '시칠리아', name_ancient: 'Sicilia', members: ['sicily_east', 'sicily_west'], valid_from: -227,
    note: '시라쿠사(히에론 왕국)는 BC212까지 제외 — 개략화' },
  { id: 'sardinia_et_corsica', name_ko: '사르디니아·코르시카', name_ancient: 'Sardinia et Corsica', members: ['sardinia', 'corsica'], valid_from: -227 },
];

const features = PROVINCES.map((p) => ({
  type: 'Feature',
  properties: {
    id: p.id, layer: 'admin_regions', name_ko: p.name_ko, name_ancient: p.name_ancient,
    valid_from: p.valid_from, source: 'book+web', confidence: 'medium', ...(p.note ? { note: p.note } : {}),
  },
  geometry: { type: 'MultiPolygon', coordinates: p.members.map((m) => geomById.get(m).coordinates) },
}));

const out = join(DIR, 'layers', 'admin_regions.geojson');
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');
console.log(`wrote ${features.length} provinces → ${out}`);
