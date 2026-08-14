import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateDataset, withinDate, type Dataset } from '../src/schema';

const BASE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'datasets', 'rome-753-218');
const rd = (p: string) => JSON.parse(readFileSync(join(BASE, p), 'utf8'));

function loadDataset(): Dataset {
  return {
    manifest: rd('manifest.json'),
    actors: rd('entities/actors.json').actors,
    events: rd('entities/events.json').events,
    territory: rd('layers/territory.geojson'),
    settlements: rd('layers/settlements.geojson'),
  };
}

const ownerOf = (d: Dataset, region: string, year: number) =>
  d.territory.features.find(f => f.properties.region === region && withinDate(f.properties, year))?.properties.actor ?? null;

describe('rome-753-218 데이터셋 계약 (시간필터 모델)', () => {
  const d = loadDataset();

  it('스키마 검증 통과 — 구간 겹침/공백 0', () => {
    expect(validateDataset(d)).toEqual([]);
  });

  it('좌표 [lng,lat] 순서 (flip 방지)', () => {
    const lngs = d.territory.features.flatMap(f => f.geometry.coordinates[0].map((c: number[]) => c[0]));
    const lats = d.territory.features.flatMap(f => f.geometry.coordinates[0].map((c: number[]) => c[1]));
    expect(Math.min(...lngs)).toBeGreaterThan(-15);
    expect(Math.max(...lngs)).toBeLessThan(30);
    expect(Math.min(...lats)).toBeGreaterThan(30);
    expect(Math.max(...lats)).toBeLessThan(48);
  });

  it('시칠리아: 기원전 264 카르타고 → 241 로마 (setFilter가 잡을 전환)', () => {
    expect(ownerOf(d, 'sicily_east', -264)).toBe('carthage');
    expect(ownerOf(d, 'sicily_east', -241)).toBe('rome');
    expect(ownerOf(d, 'sicily_east', -218)).toBe('rome');
  });

  it('갈리아 키살피나: -218부터 로마, 그 전엔 무주공산', () => {
    expect(ownerOf(d, 'cisalpine_gaul', -240)).toBeNull();
    expect(ownerOf(d, 'cisalpine_gaul', -218)).toBe('rome');
  });

  it('신카르타고: 기원전 227 설립 — 그 전엔 안 보인다', () => {
    const cn = d.settlements.features.find(f => f.properties.id === 'carthago_nova')!;
    expect(withinDate(cn.properties, -240)).toBe(false);
    expect(withinDate(cn.properties, -218)).toBe(true);
  });
});
