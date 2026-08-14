import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateDataset, latestSnapshot, type Dataset } from '../src/schema';

const BASE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'datasets', 'rome-753-218');
const rd = (p: string) => JSON.parse(readFileSync(join(BASE, p), 'utf8'));

function loadDataset(): Dataset {
  return {
    manifest: rd('manifest.json'),
    actors: rd('entities/actors.json').actors,
    territory: rd('entities/territory.json').snapshots,
    events: rd('entities/events.json').events,
    regions: rd('layers/regions.geojson'),
    settlements: rd('layers/settlements.geojson'),
  };
}

describe('rome-753-218 데이터셋 계약', () => {
  const d = loadDataset();

  it('스키마 검증 통과 — errors 없음', () => {
    expect(validateDataset(d)).toEqual([]);
  });

  it('좌표는 [lng,lat] 순서 (flip 방지)', () => {
    const lngs = d.regions.features.flatMap(f => f.geometry.coordinates[0].map((c: number[]) => c[0]));
    const lats = d.regions.features.flatMap(f => f.geometry.coordinates[0].map((c: number[]) => c[1]));
    expect(Math.min(...lngs)).toBeGreaterThan(-15); // 서지중해 경도
    expect(Math.max(...lngs)).toBeLessThan(30);
    expect(Math.min(...lats)).toBeGreaterThan(30);  // 위도
    expect(Math.max(...lats)).toBeLessThan(48);
  });

  it('latestSnapshot 계단 함수', () => {
    expect(latestSnapshot(d.territory, -260)?.year).toBe(-264);
    expect(latestSnapshot(d.territory, -218)?.year).toBe(-218);
    expect(latestSnapshot(d.territory, -800)).toBeNull();
  });

  it('시칠리아: 기원전 264 카르타고 → 241 로마', () => {
    const owner = (y: number) => {
      const s = latestSnapshot(d.territory, y)!;
      return Object.entries(s.control).find(([, rs]) => rs.includes('sicily_east'))?.[0];
    };
    expect(owner(-264)).toBe('carthage');
    expect(owner(-241)).toBe('rome');
  });
});
