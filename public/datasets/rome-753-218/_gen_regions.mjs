// atlas 프로토타입의 하드코딩 REGIONS([lat,lon])를 GeoJSON([lng,lat])으로 승격.
// 러프 링을 실제 해안선(Natural Earth 10m land, PD)과 교집합해 육지만 남긴다 → 섬은
// 실제 윤곽 획득, 해안 지역은 바다 오버행 제거. 내륙 경계는 여전히 러프 근사.
// (다음 정확도: 내륙 국경 트레이싱. SCHEMA 참조.)
import polygonClipping from 'polygon-clipping';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// [lat, lon] — atlas index.html REGIONS 원본
const REGIONS = {
  latium: [[42.2,11.9],[42.2,13.0],[41.3,13.2],[41.0,12.6],[41.3,11.7],[41.9,11.6]],
  etruria: [[44.0,10.5],[43.7,11.9],[42.6,12.2],[42.1,11.7],[42.3,10.4],[43.0,9.9]],
  campania: [[41.3,13.6],[41.3,14.9],[40.4,15.3],[40.1,14.6],[40.3,13.9],[40.9,13.7]],
  samnium: [[41.9,14.0],[42.0,14.9],[41.3,15.2],[41.0,14.7],[41.2,14.0]],
  apulia: [[41.9,15.4],[41.8,16.9],[41.0,17.9],[40.0,18.4],[39.8,17.3],[40.5,16.0],[41.2,15.3]],
  calabria: [[39.5,16.0],[39.0,17.1],[38.1,16.5],[37.9,15.9],[38.5,15.6],[39.2,15.9]],
  magna_graecia: [[40.3,17.2],[39.5,17.6],[38.2,16.9],[38.0,16.2],[39.0,16.6],[40.0,16.9]],
  cisalpine_gaul: [[45.2,7.0],[46.5,13.0],[44.9,12.6],[45.0,11.0],[45.0,8.0],[45.2,7.4]],
  sicily_east: [[38.3,14.9],[38.2,15.7],[37.0,15.3],[36.7,14.9],[37.2,14.3],[37.9,14.4]],
  sicily_west: [[38.2,12.4],[38.0,13.9],[37.0,14.3],[36.7,12.4],[37.5,11.9]],
  sardinia: [[41.3,8.4],[41.2,9.7],[39.2,9.6],[38.9,8.5],[39.9,8.1],[40.9,8.2]],
  corsica: [[43.1,9.4],[42.6,9.6],[41.6,9.3],[41.4,8.7],[42.1,8.5],[42.9,9.0]],
  africa_carthage: [[37.3,11.3],[37.0,10.2],[36.2,10.6],[35.5,10.0],[34.5,10.8],[33.5,10.0],[33.7,8.5],[36.0,8.5],[37.0,9.5]],
  hispania_east: [[42.4,3.2],[41.5,2.3],[40.0,0.5],[38.7,-0.2],[37.6,-0.8],[38.5,0.5],[39.8,1.0],[40.73,0.86],[41.2,2.0],[42.5,2.0]],
};
const NAME = {
  latium:'라티움', etruria:'에트루리아', campania:'캄파니아', samnium:'삼니움',
  apulia:'아풀리아', calabria:'칼라브리아', magna_graecia:'마그나 그라이키아',
  cisalpine_gaul:'갈리아 키살피나', sicily_east:'시칠리아 동부', sicily_west:'시칠리아 서부',
  sardinia:'사르디니아', corsica:'코르시카', africa_carthage:'아프리카(카르타고)', hispania_east:'히스파니아 동부',
};

const DIR = dirname(fileURLToPath(import.meta.url));
// 실제 해안선(PD)으로 러프 링 클립. features[0]=전체 육지 MultiPolygon.
const land = JSON.parse(readFileSync(join(DIR, '_sources', 'ne_land_med.geojson'), 'utf8'))
  .features[0].geometry.coordinates;
const r3 = (n) => Math.round(n * 1000) / 1000;
const round = (polys) => polys.map((poly) => poly.map((r) => r.map(([x, y]) => [r3(x), r3(y)])));

const features = Object.entries(REGIONS).map(([id, ring]) => {
  const coords = ring.map(([lat, lon]) => [lon, lat]);   // flip → [lng,lat]
  coords.push(coords[0]);                                 // close ring
  const clip = round(polygonClipping.intersection([coords], land)); // 러프 링 ∩ 육지
  const [geometry, confidence] =
    clip.length === 1 ? [{ type: 'Polygon', coordinates: clip[0] }, 'medium']
    : clip.length > 1 ? [{ type: 'MultiPolygon', coordinates: clip }, 'medium']
    : [{ type: 'Polygon', coordinates: [coords] }, 'low'];  // 클립 실패 → 원본 링 유지
  return {
    type: 'Feature',
    properties: { id, layer: 'regions', name_ko: NAME[id], source: 'book+web', confidence, minzoom: 0, rank: 2 },
    geometry,
  };
});

const out = join(DIR, 'layers', 'regions.geojson');
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');
console.log(`wrote ${features.length} regions → ${out}`);
