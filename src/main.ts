import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { type Dataset, dateWindow } from './schema';

const BASE = '/datasets/rome-753-218';
const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;

async function j(p: string) {
  const r = await fetch(`${BASE}/${p}`);
  if (!r.ok) throw new Error(`${p} ${r.status}`);
  return r.json();
}

async function load(): Promise<Dataset> {
  const [manifest, actorsW, eventsW, territory, admin_regions, settlements] = await Promise.all([
    j('manifest.json'), j('entities/actors.json'), j('entities/events.json'),
    j('layers/territory.geojson'), j('layers/admin_regions.geojson'), j('layers/settlements.geojson'),
  ]);
  return { manifest, actors: actorsW.actors, events: eventsW.events, territory, admin_regions, settlements };
}

const formatYear = (y: number) => (y < 0 ? `기원전 ${-y}년` : `서기 ${y === 0 ? 1 : y}년`);

async function main() {
  const d = await load();
  let year = d.manifest.time.to;
  let loaded = false;

  const style: any = {
    version: 8,
    sources: {},
    layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#cfe0e6' } }],
  };
  const map = new maplibregl.Map({ container: 'map', style, center: d.manifest.center, zoom: d.manifest.zoom, minZoom: 3, maxZoom: 9 });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  const fillColor: any = ['match', ['get', 'actor']];
  for (const a of d.actors) fillColor.push(a.id, a.color);
  fillColor.push('rgba(0,0,0,0)');

  // 시간가변 레이어: [레이어id, 기본필터(rank 등, 없으면 null)]. 연도 변경 = setFilter (setData 아님).
  const timed: [string, any[] | null][] = [
    ['territory-fill', null],
    ['territory-outline', null],
    ['admin-line', null],
    ['settle-major', ['<=', ['get', 'rank'], 1]],
    ['settle-minor', ['>=', ['get', 'rank'], 2]],
  ];
  const filterFor = (base: any[] | null, y: number): any =>
    base ? ['all', base, ...dateWindow(y).slice(1)] : dateWindow(y);

  map.on('load', () => {
    map.addSource('territory', { type: 'geojson', data: d.territory as any });
    map.addLayer({ id: 'territory-fill', type: 'fill', source: 'territory', paint: { 'fill-color': fillColor, 'fill-opacity': 0.4 } });
    map.addLayer({ id: 'territory-outline', type: 'line', source: 'territory', paint: { 'line-color': '#5a4a32', 'line-width': 1 } });

    // 학술 속주(admin_regions) — 통치권(territory)과 별개 레이어. 점선 경계로 구분.
    map.addSource('admin_regions', { type: 'geojson', data: d.admin_regions as any });
    map.addLayer({ id: 'admin-line', type: 'line', source: 'admin_regions',
      paint: { 'line-color': '#4b3f8c', 'line-width': 2, 'line-dasharray': [3, 2] } });

    map.addSource('settlements', { type: 'geojson', data: d.settlements as any });
    // 줌별 노출(LOD) = 레이어 minzoom 네이티브. 시간필터(setFilter)와 병존.
    const circle = (id: string, minzoom: number, radius: number) =>
      map.addLayer({ id, type: 'circle', source: 'settlements', minzoom,
        paint: { 'circle-radius': radius, 'circle-color': '#b8860b', 'circle-stroke-color': '#3a2f22', 'circle-stroke-width': 1.2 } });
    circle('settle-major', 3, 6);
    circle('settle-minor', 5, 4);

    const popup = (name: string, extra: string, at: any) =>
      new maplibregl.Popup({ closeButton: false }).setLngLat(at).setHTML(`<b>${name}</b><br><small>${extra}</small>`).addTo(map);
    map.on('click', 'territory-fill', e => {
      const p: any = e.features?.[0]?.properties ?? {};
      const actor = d.actors.find(a => a.id === p.actor);
      popup(p.name_ko, `${actor ? actor.label : '무주공산'} · 신뢰도 ${p.confidence}`, e.lngLat);
    });
    map.on('click', 'admin-line', e => {
      const p: any = e.features?.[0]?.properties ?? {};
      popup(p.name_ko, `속주 ${p.name_ancient ?? ''} · 설치 기원전 ${-p.valid_from}년`, e.lngLat);
    });
    for (const l of ['settle-major', 'settle-minor']) {
      map.on('click', l, e => {
        const p: any = e.features?.[0]?.properties ?? {};
        popup(p.name_ko, `${p.name_ancient ?? ''} → ${p.name_modern ?? ''} · ${p.source}`, (e.features![0].geometry as any).coordinates);
      });
      map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
    }

    loaded = true;
    applyYear(year);
  });

  function applyFilters(y: number) {
    if (!loaded) return;
    for (const [id, base] of timed) map.setFilter(id, filterFor(base, y));
  }

  // ---- 타임라인 ----
  const slider = $<HTMLInputElement>('#year');
  const label = $<HTMLElement>('#yearLabel');
  const note = $<HTMLElement>('#eventNote');
  slider.min = String(d.manifest.time.from);
  slider.max = String(d.manifest.time.to);
  slider.value = String(year);

  const nearestEvent = (y: number) => d.events.reduce<null | Dataset['events'][number]>(
    (best, e) => (!best || Math.abs(e.year - y) < Math.abs(best.year - y)) ? e : best, null);

  function applyYear(y: number) {
    year = y;
    slider.value = String(y);
    label.textContent = formatYear(y);
    const ev = nearestEvent(y);
    note.textContent = ev ? `${formatYear(ev.year)} · ${ev.label}` : '';
    applyFilters(y);
  }
  slider.addEventListener('input', () => applyYear(parseInt(slider.value, 10)));

  // 사건 틱
  const ticks = $<HTMLElement>('#ticks');
  const span = d.manifest.time.to - d.manifest.time.from;
  for (const e of d.events) {
    const t = document.createElement('div');
    t.className = 'tick';
    t.style.left = `${((e.year - d.manifest.time.from) / span) * 100}%`;
    t.title = `${formatYear(e.year)} ${e.label}`;
    t.onclick = () => applyYear(e.year);
    ticks.appendChild(t);
  }

  // 재생
  let timer: number | null = null;
  const playBtn = $<HTMLButtonElement>('#play');
  playBtn.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶'; return; }
    playBtn.textContent = '⏸';
    timer = window.setInterval(() => {
      const next = year + 5;
      if (next >= d.manifest.time.to) { applyYear(d.manifest.time.to); clearInterval(timer!); timer = null; playBtn.textContent = '▶'; return; }
      applyYear(next);
    }, 350);
  };

  // 범례
  $<HTMLElement>('#legend').innerHTML = d.actors.map(a => `<span><i style="background:${a.color}"></i>${a.label}</span>`).join('');

  applyYear(year);
}

main().catch(err => {
  document.body.innerHTML = `<pre style="padding:20px">로드 실패: ${err.message}\n로컬 서버로 여세요 (npm run dev)</pre>`;
});
