// 재사용 시계열 GIS 데이터 계약 (SCHEMA.md 코드판).
// 균일 시간필터 모델: 모든 시간가변 피처가 valid_from/valid_to를 갖고 setFilter로 연도 필터된다.

export type Source = 'book' | 'web' | 'book+web';
export type Confidence = 'high' | 'medium' | 'low';

export interface Actor { id: string; label: string; color: string; source: Source; confidence: Confidence; }
export interface HistEvent { year: number; label: string; source: Source; confidence: Confidence; }
export interface Manifest {
  id: string; title: string; center: [number, number]; zoom: number;
  time: { from: number; to: number; unit: string };
  layers: string[]; skins: string[];
}
export interface Feature { type: 'Feature'; properties: Record<string, any>; geometry: { type: string; coordinates: any }; }
export interface FeatureCollection { type: 'FeatureCollection'; features: Feature[]; }

export interface Dataset {
  manifest: Manifest;
  actors: Actor[];
  events: HistEvent[];
  territory: FeatureCollection;   // 지역×통치구간 (dated) — _gen_territory.mjs 생성
  settlements: FeatureCollection;
}

// 열린 시간범위 sentinel (valid_from/valid_to 없으면 상시). _gen_territory.mjs OPEN_FUTURE와 일치.
export const OPEN_PAST = -1000000;
export const OPEN_FUTURE = 1000000;

/** props가 해당 연도에 존재하나 (valid_from <= year < valid_to). 테스트·검증용 순수 헬퍼. */
export function withinDate(props: Record<string, any>, year: number): boolean {
  const from = props.valid_from ?? OPEN_PAST;
  const to = props.valid_to ?? OPEN_FUTURE;
  return from <= year && year < to;
}

/** MapLibre setFilter용 날짜창 표현식. setData 재계산 대신 이걸로 연도 필터. */
export function dateWindow(year: number): any[] {
  return ['all',
    ['<=', ['coalesce', ['get', 'valid_from'], OPEN_PAST], year],
    ['>', ['coalesce', ['get', 'valid_to'], OPEN_FUTURE], year]];
}

const SOURCES = new Set(['book', 'web', 'book+web']);
const CONFS = new Set(['high', 'medium', 'low']);

function eachCoord(geom: any, fn: (c: number[]) => void) {
  const walk = (a: any) => {
    if (typeof a[0] === 'number') fn(a as number[]);
    else for (const x of a) walk(x);
  };
  if (geom?.coordinates) walk(geom.coordinates);
}

function checkCoords(geom: any, id: string, err: string[]) {
  eachCoord(geom, ([lng, lat]) => {
    if (lng < -180 || lng > 180) err.push(`${id}: 경도 범위밖 ${lng} (좌표 flip?)`);
    if (lat < -90 || lat > 90) err.push(`${id}: 위도 범위밖 ${lat} (좌표 flip?)`);
  });
}

/** 데이터→렌더 계약 검증. errors[] 비어 있으면 통과. */
export function validateDataset(d: Dataset): string[] {
  const err: string[] = [];
  const actorIds = new Set(d.actors.map(a => a.id));

  // actors
  const seenA = new Set<string>();
  for (const a of d.actors) {
    if (seenA.has(a.id)) err.push(`actors: id 중복 ${a.id}`);
    seenA.add(a.id);
    if (!a.color) err.push(`actors ${a.id}: color 없음`);
    if (!SOURCES.has(a.source)) err.push(`actors ${a.id}: source 불명 ${a.source}`);
  }

  // territory: 지역×통치구간 날짜 피처
  const seenT = new Set<string>();
  const byRegion: Record<string, { from: number; to: number }[]> = {};
  for (const f of d.territory.features) {
    const p = f.properties;
    const id = p?.id ?? '(id없음)';
    if (seenT.has(id)) err.push(`territory: id 중복 ${id}`);
    seenT.add(id);
    if (!p.name_ko) err.push(`territory ${id}: name_ko 없음`);
    if (f.geometry?.type !== 'Polygon') err.push(`territory ${id}: Polygon 아님`);
    checkCoords(f.geometry, `territory ${id}`, err);
    if (!actorIds.has(p.actor)) err.push(`territory ${id}: 미정의 actor ${p.actor}`);
    if (!SOURCES.has(p.source)) err.push(`territory ${id}: source 불명`);
    if (!CONFS.has(p.confidence)) err.push(`territory ${id}: confidence 불명`);
    if (!(p.valid_from < p.valid_to)) err.push(`territory ${id}: valid_from < valid_to 아님`);
    (byRegion[p.region] ??= []).push({ from: p.valid_from, to: p.valid_to });
  }
  // 같은 지역 구간이 겹치거나(중복 소유주) 사이에 공백(무주공산 순간)이 없어야 한다
  for (const [region, ivs] of Object.entries(byRegion)) {
    ivs.sort((a, b) => a.from - b.from);
    for (let i = 1; i < ivs.length; i++) {
      if (ivs[i].from < ivs[i - 1].to) err.push(`territory ${region}: 구간 겹침 (${ivs[i - 1].to} > ${ivs[i].from})`);
      else if (ivs[i].from > ivs[i - 1].to) err.push(`territory ${region}: 구간 공백 (${ivs[i - 1].to}~${ivs[i].from})`);
    }
  }

  // settlements: 포인트 + 출처 완결 + 시간범위 온전
  for (const f of d.settlements.features) {
    const p = f.properties;
    const id = p?.id ?? '(id없음)';
    if (f.geometry?.type !== 'Point') err.push(`settlements ${id}: Point 아님`);
    checkCoords(f.geometry, `settlements ${id}`, err);
    if (!SOURCES.has(p?.source)) err.push(`settlements ${id}: source 불명`);
    if (!CONFS.has(p?.confidence)) err.push(`settlements ${id}: confidence 불명`);
    if (p?.valid_from != null && p?.valid_to != null && !(p.valid_from < p.valid_to))
      err.push(`settlements ${id}: valid_from < valid_to 아님`);
  }

  // events
  for (const e of d.events) if (e.year < d.manifest.time.from || e.year > d.manifest.time.to)
    err.push(`events: ${e.label} 연도 ${e.year} 시간범위 밖`);

  return err;
}
