// 재사용 시계열 GIS 데이터 계약 (SCHEMA.md 코드판).
// 도메인 무관 — rome-753-218 외 데이터셋도 같은 타입으로 로드된다.

export type Source = 'book' | 'web' | 'book+web';
export type Confidence = 'high' | 'medium' | 'low';

export interface Actor { id: string; label: string; color: string; source: Source; confidence: Confidence; }
export interface TerritorySnapshot { year: number; note?: string; source: Source; confidence: Confidence; control: Record<string, string[]>; }
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
  territory: TerritorySnapshot[];
  events: HistEvent[];
  regions: FeatureCollection;
  settlements: FeatureCollection;
}

/** 계단 함수: year 이하 가장 최근 스냅샷 (atlas latestTerritorySnapshot 승계). */
export function latestSnapshot(snapshots: TerritorySnapshot[], year: number): TerritorySnapshot | null {
  const c = snapshots.filter(s => s.year <= year).sort((a, b) => b.year - a.year);
  return c[0] ?? null;
}

/** regionId → 지배 actorId 매핑 (해당 시점). */
export function ownership(snap: TerritorySnapshot | null): Record<string, string> {
  const owner: Record<string, string> = {};
  if (!snap) return owner;
  for (const [actor, regions] of Object.entries(snap.control)) for (const r of regions) owner[r] = actor;
  return owner;
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

/** 데이터→렌더 계약 검증. errors[] 비어 있으면 통과. atlas _verify.py 승계 + 좌표순서 검사. */
export function validateDataset(d: Dataset): string[] {
  const err: string[] = [];
  const actorIds = new Set(d.actors.map(a => a.id));
  const regionIds = new Set<string>();

  // regions: 폴리곤 + 좌표 순서([lng,lat]) — flip 실수 탐지
  const seenR = new Set<string>();
  for (const f of d.regions.features) {
    const id = f.properties?.id;
    if (!id) { err.push('regions: id 없는 피처'); continue; }
    if (seenR.has(id)) err.push(`regions: id 중복 ${id}`);
    seenR.add(id); regionIds.add(id);
    if (!f.properties.name_ko) err.push(`regions ${id}: name_ko 없음`);
    if (f.geometry?.type !== 'Polygon') err.push(`regions ${id}: Polygon 아님`);
    eachCoord(f.geometry, ([lng, lat]) => {
      if (lng < -180 || lng > 180) err.push(`regions ${id}: 경도 범위밖 ${lng} (좌표 flip?)`);
      if (lat < -90 || lat > 90) err.push(`regions ${id}: 위도 범위밖 ${lat} (좌표 flip?)`);
    });
  }

  // actors
  const seenA = new Set<string>();
  for (const a of d.actors) {
    if (seenA.has(a.id)) err.push(`actors: id 중복 ${a.id}`);
    seenA.add(a.id);
    if (!a.color) err.push(`actors ${a.id}: color 없음`);
    if (!SOURCES.has(a.source)) err.push(`actors ${a.id}: source 불명 ${a.source}`);
  }

  // territory 스냅샷: 오름차순 + 참조 유효
  let prev = -Infinity;
  for (const s of d.territory) {
    if (s.year < prev) err.push(`territory: 스냅샷 연도 역순 ${s.year}`);
    prev = s.year;
    if (!SOURCES.has(s.source)) err.push(`territory ${s.year}: source 불명`);
    if (!CONFS.has(s.confidence)) err.push(`territory ${s.year}: confidence 불명`);
    for (const [actor, regions] of Object.entries(s.control)) {
      if (!actorIds.has(actor)) err.push(`territory ${s.year}: 미정의 actor ${actor}`);
      for (const r of regions) if (!regionIds.has(r)) err.push(`territory ${s.year}: 미정의 region ${r}`);
    }
  }

  // settlements: 포인트 좌표 + 출처 완결
  for (const f of d.settlements.features) {
    const id = f.properties?.id ?? '(id없음)';
    if (f.geometry?.type !== 'Point') err.push(`settlements ${id}: Point 아님`);
    const [lng, lat] = f.geometry?.coordinates ?? [];
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) err.push(`settlements ${id}: 좌표 범위밖 [${lng},${lat}]`);
    if (!SOURCES.has(f.properties?.source)) err.push(`settlements ${id}: source 불명`);
    if (!CONFS.has(f.properties?.confidence)) err.push(`settlements ${id}: confidence 불명`);
  }

  // events
  for (const e of d.events) if (e.year < d.manifest.time.from || e.year > d.manifest.time.to)
    err.push(`events: ${e.label} 연도 ${e.year} 시간범위 밖`);

  return err;
}
