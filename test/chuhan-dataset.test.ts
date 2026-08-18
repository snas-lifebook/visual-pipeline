import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateDataset, type Dataset } from '../src/schema';

const BASE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'datasets', 'chuhan-206');
const rd = (p: string) => JSON.parse(readFileSync(join(BASE, p), 'utf8'));

function loadDataset(): Dataset {
  return {
    manifest: rd('manifest.json'),
    actors: rd('entities/actors.json').actors,
    events: rd('entities/events.json').events,
    territory: rd('layers/territory.geojson'),
    admin_regions: rd('layers/admin_regions.geojson'),
    settlements: rd('layers/settlements.geojson'),
    battles: rd('layers/battles.geojson'),
    movements: rd('layers/movements.geojson'),
  };
}

// Polygon·MultiPolygon·LineString·Point 무관하게 모든 말단 [x,y] 좌표 추출
const allCoords = (geom: any): number[][] => {
  const out: number[][] = [];
  const walk = (a: any) => { if (typeof a[0] === 'number') out.push(a); else a.forEach(walk); };
  walk(geom.coordinates);
  return out;
};

describe('chuhan-206 데이터셋 계약 (도메인 무관성 증명 — 비로마 데이터셋)', () => {
  const d = loadDataset();

  it('스키마 검증 통과 — 구간 겹침/공백 0 (증명)', () => {
    expect(validateDataset(d)).toEqual([]);
  });

  it('좌표 [lng,lat] 순서 (flip 방지) — 고대 중원 bbox 내', () => {
    const allFeatures = [
      ...d.territory.features,
      ...d.admin_regions.features,
      ...d.settlements.features,
      ...d.battles.features,
      ...d.movements.features,
    ];
    const pts = allFeatures.flatMap(f => allCoords(f.geometry));
    expect(pts.length).toBeGreaterThan(0);
    for (const [lng, lat] of pts) {
      expect(lng).toBeGreaterThan(100);
      expect(lng).toBeLessThan(125);
      expect(lat).toBeGreaterThan(20);
      expect(lat).toBeLessThan(42);
    }
  });
});
