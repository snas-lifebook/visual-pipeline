import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateDataset, withinDate, positionAtYear, type Dataset } from '../src/schema';

const BASE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'datasets', 'rome-753-218');
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

// Polygon·MultiPolygon 무관하게 모든 말단 [x,y] 좌표 추출 (해안선 클립 후 territory는 MultiPolygon일 수 있음)
const allCoords = (geom: any): number[][] => {
  const out: number[][] = [];
  const walk = (a: any) => { if (typeof a[0] === 'number') out.push(a); else a.forEach(walk); };
  walk(geom.coordinates);
  return out;
};

const ownerOf = (d: Dataset, region: string, year: number) =>
  d.territory.features.find(f => f.properties.region === region && withinDate(f.properties, year))?.properties.actor ?? null;

describe('rome-753-218 데이터셋 계약 (시간필터 모델)', () => {
  const d = loadDataset();

  it('스키마 검증 통과 — 구간 겹침/공백 0', () => {
    expect(validateDataset(d)).toEqual([]);
  });

  it('좌표 [lng,lat] 순서 (flip 방지)', () => {
    const pts = d.territory.features.flatMap(f => allCoords(f.geometry));
    const lngs = pts.map(c => c[0]);
    const lats = pts.map(c => c[1]);
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

  it('속주 ≠ 통치권: 시칠리아는 영토 BC241, 정식 속주 BC227', () => {
    const sicilia = d.admin_regions.features.find(f => f.properties.id === 'sicilia')!;
    // 영토는 -241부터 로마
    expect(ownerOf(d, 'sicily_east', -241)).toBe('rome');
    // 정식 속주는 -227부터 — -240엔 속주 아님, -218엔 속주
    expect(withinDate(sicilia.properties, -240)).toBe(false);
    expect(withinDate(sicilia.properties, -218)).toBe(true);
  });

  it('한니발 토큰 위치: 원정 전(-240) 없음, -216 칸나이, -202 자마', () => {
    const f = d.movements.features;
    expect(positionAtYear(f, -240)).toBeNull();
    expect(positionAtYear(f, -216)).toEqual([16.13, 41.31]); // 칸나이 도착
    expect(positionAtYear(f, -202)).toEqual([9.0, 36.3]);    // 자마
  });
});
