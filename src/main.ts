import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { type Dataset, latestSnapshot, ownership } from './schema';

const BASE = '/datasets/rome-753-218';
const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;

async function j(p: string) {
  const r = await fetch(`${BASE}/${p}`);
  if (!r.ok) throw new Error(`${p} ${r.status}`);
  return r.json();
}

async function load(): Promise<Dataset> {
  const [manifest, actorsW, territoryW, eventsW, regions, settlements] = await Promise.all([
    j('manifest.json'), j('entities/actors.json'), j('entities/territory.json'),
    j('entities/events.json'), j('layers/regions.geojson'), j('layers/settlements.geojson'),
  ]);
  return { manifest, actors: actorsW.actors, territory: territoryW.snapshots, events: eventsW.events, regions, settlements };
}

const formatYear = (y: number) => (y < 0 ? `기원전 ${-y}년` : `서기 ${y === 0 ? 1 : y}년`);

function coloredRegions(d: Dataset, year: number) {
  const owner = ownership(latestSnapshot(d.territory, year));
  return {
    type: 'FeatureCollection' as const,
    features: d.regions.features.map(f => ({ ...f, properties: { ...f.properties, actor: owner[f.properties.id] ?? 'none' } })),
  };
}

async function main() {
  const d = await load();
  let year = d.manifest.time.to;

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

  map.on('load', () => {
    map.addSource('regions', { type: 'geojson', data: coloredRegions(d, year) });
    map.addLayer({ id: 'regions-fill', type: 'fill', source: 'regions', paint: { 'fill-color': fillColor, 'fill-opacity': 0.4 } });
    map.addLayer({ id: 'regions-outline', type: 'line', source: 'regions', paint: { 'line-color': '#5a4a32', 'line-width': 1 } });

    map.addSource('settlements', { type: 'geojson', data: d.settlements as any });
    // 줌별 노출(LOD) = 레이어 minzoom 네이티브. 대도시는 항상, 소도시는 확대해야 등장.
    const circle = (id: string, rankFilter: any, minzoom: number, radius: number) =>
      map.addLayer({ id, type: 'circle', source: 'settlements', filter: rankFilter, minzoom,
        paint: { 'circle-radius': radius, 'circle-color': '#b8860b', 'circle-stroke-color': '#3a2f22', 'circle-stroke-width': 1.2 } });
    circle('settle-major', ['<=', ['get', 'rank'], 1], 3, 6);
    circle('settle-minor', ['>=', ['get', 'rank'], 2], 5, 4);

    const popup = (name: string, extra: string) =>
      new maplibregl.Popup({ closeButton: false }).setHTML(`<b>${name}</b><br><small>${extra}</small>`);
    map.on('click', 'regions-fill', e => {
      const p: any = e.features?.[0]?.properties ?? {};
      const actor = d.actors.find(a => a.id === p.actor);
      popup(p.name_ko, `${actor ? actor.label : '무주공산'} · 신뢰도 ${p.confidence}`).setLngLat(e.lngLat).addTo(map);
    });
    for (const l of ['settle-major', 'settle-minor']) {
      map.on('click', l, e => {
        const p: any = e.features?.[0]?.properties ?? {};
        popup(p.name_ko, `${p.name_ancient ?? ''} → ${p.name_modern ?? ''} · ${p.source}`).setLngLat((e.features![0].geometry as any).coordinates).addTo(map);
      });
      map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
    }
  });

  // ---- 타임라인 ----
  const slider = $<HTMLInputElement>('#year');
  const label = $<HTMLElement>('#yearLabel');
  const note = $<HTMLElement>('#eventNote');
  slider.min = String(d.manifest.time.from);
  slider.max = String(d.manifest.time.to);
  slider.value = String(year);

  const nearestEvent = (y: number) => d.events.reduce<null | Dataset['events'][number]>(
    (best, e) => (!best || Math.abs(e.year - y) < Math.abs(best.year - y)) ? e : best, null);

  function setYear(y: number) {
    year = y;
    slider.value = String(y);
    label.textContent = formatYear(y);
    const ev = nearestEvent(y);
    note.textContent = ev ? `${formatYear(ev.year)} · ${ev.label}` : '';
    const src = map.getSource('regions') as maplibregl.GeoJSONSource | undefined;
    src?.setData(coloredRegions(d, y) as any);
  }
  slider.addEventListener('input', () => setYear(parseInt(slider.value, 10)));

  // 사건 틱
  const ticks = $<HTMLElement>('#ticks');
  const span = d.manifest.time.to - d.manifest.time.from;
  for (const e of d.events) {
    const t = document.createElement('div');
    t.className = 'tick';
    t.style.left = `${((e.year - d.manifest.time.from) / span) * 100}%`;
    t.title = `${formatYear(e.year)} ${e.label}`;
    t.onclick = () => setYear(e.year);
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
      if (next >= d.manifest.time.to) { setYear(d.manifest.time.to); clearInterval(timer!); timer = null; playBtn.textContent = '▶'; return; }
      setYear(next);
    }, 350);
  };

  // 범례
  $<HTMLElement>('#legend').innerHTML = d.actors.map(a => `<span><i style="background:${a.color}"></i>${a.label}</span>`).join('');

  setYear(year);
}

main().catch(err => {
  document.body.innerHTML = `<pre style="padding:20px">로드 실패: ${err.message}\n로컬 서버로 여세요 (npm run dev)</pre>`;
});
