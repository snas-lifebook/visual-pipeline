# rome-753-218 — 데이터 사용 안내

로마 건국~제2차 포에니 전쟁(기원전 753~218) 시계열 GIS 데이터셋. 사람·AI·팀원이 이 폴더의 파일을 그대로 받아 쓰기 위한 안내다. 계약(타입) 정본은 레포 `src/schema.ts`.

## 어떻게 받나

- **레포 접근 시(AI·팀원)**: 이 폴더 파일을 디스크에서 직접 읽으면 된다. 별도 API 없음.
  예: `public/datasets/rome-753-218/layers/regions.geojson`
- **앱 실행 중(HTTP)**: `public/`가 루트로 서빙된다. `<base>/datasets/rome-753-218/layers/regions.geojson` 을 fetch.
- **인덱스**: `manifest.json` 이 이 데이터셋의 목차(레이어 목록·시간범위·중심좌표).

## 좌표 규약 (제일 자주 틀리는 것)

모든 좌표는 **GeoJSON `[lng, lat]`** — 경도 먼저, 위도 나중. Leaflet의 `[lat, lon]` 아님.
중심 `[12.5, 41.9]` = 경도 12.5, 위도 41.9 (로마). CRS는 `EPSG:4326`.

## 레이어 (`layers/*.geojson`)

| 파일 | geom | 피처 | 핵심 속성 | 설명 |
|------|------|------|-----------|------|
| `regions.geojson` | Polygon·MultiPolygon | 14 | `id, name_ko, rank, minzoom, source, confidence` | **지방 분할** 베이스 지오메트리. 시간불변. 실제 해안선(NE land)으로 클립됨 → 섬은 MultiPolygon. territory가 이걸 지역 형틀로 씀. |
| `territory.geojson` | Polygon·MultiPolygon | 18 | `id, region, actor, valid_from, valid_to, source, confidence` | 시간가변 세력 판도. `regions` 지오메트리 × 오너십 스냅샷 조인 결과(`_gen_territory.mjs` 생성물, 직접 편집 금지). |
| `admin_regions.geojson` | MultiPolygon | 2 | `id, name_ko, name_ancient, valid_from, source, confidence` | 행정 구역 오버레이. |
| `settlements.geojson` | Point | 5 | `id, name_ko, name_ancient, name_modern, rank, minzoom, valid_from` | 도시·정착지 포인트. |
| `battles.geojson` | Point | 6 | `id, name_ko, year, victor, general_a/general_b, strength_a/strength_b, belligerents, valid_from, valid_to` | 전투 지점(시간가변). `victor`=승자 actor id, `general_a`/`strength_a`=belligerents[0](로마) 측. `valid_from=year, valid_to=OPEN_FUTURE`(발생 후 마커 유지). `_gen_battles.mjs` 생성물. |
| `movements.geojson` | LineString | 11 | `id, route, actor, label, from_year, to_year, valid_from, valid_to` | 원정로 세그먼트(시간가변). 연속 waypoint 쌍=1세그먼트, `valid_from`=도착 연도부터 그려짐(누적). Three.js 토큰이 같은 데이터의 `valid_from<=year` 마지막 세그먼트 끝점을 연도별 위치로 사용(`positionAtYear`). `entities/movements.json` → `_gen_movements.mjs` 생성물. |

## 엔티티 (`entities/*.json`)

| 파일 | 루트 | 설명 |
|------|------|------|
| `actors.json` | `{ actors: [...] }` | 세력(로마·카르타고 등) 정의. `territory.actor`가 이 id를 참조. |
| `events.json` | `{ events: [...] }` | 연표 이벤트. |
| `territory.json` | `{ snapshots: [...] }` | 지역별 오너십 스냅샷(원본). `_gen_territory.mjs`가 `regions.geojson`과 조인해 `territory.geojson` 생성. |

## 시간 필터 모델

시간가변 피처(`territory`·`battles`·`movements`, 일부 `settlements`/`admin_regions`)는 `valid_from`/`valid_to`(연도, BC는 음수)를 갖는다. 연도 변경 시 **`setFilter`로 필터**하는 계약이다 — `setData`로 재계산하지 않는다. `manifest.time` = `{ from: -753, to: -201 }`.

## 출처·라이선스·정확도

- **provisional**: region 폴리곤은 실제 해안선(`_sources/ne_land_med.geojson`, Natural Earth 10m land, PD)으로 클립 → 해안·섬은 실측 윤곽, 내륙 경계는 러프 근사(`confidence: medium/low`). 전투 좌표는 Pleiades 근사, 자마는 위치 불확실(`low`).
- **출처**: atlas 프로토타입 포팅 + 자체 리서치 + 고대사료(Polybius·Livy) 전투 수치. 상용 게임 지도(Total War 등) 파생물 아님.
- **재배포 정책**: 이 폴더의 재배포 파일은 PD(Natural Earth 등) 또는 자체 트레이싱만 담는다. CC-BY-SA(historical-basemaps·DARE)·CC-BY-NC(AWMC)·상용 자산은 **트레이싱 참조로만** 쓰고 원본을 복사·재배포하지 않는다.

## 재생성

```
npm run gen        # regions/territory 재생성
npm run validate   # 데이터→렌더 계약 테스트 (build 게이트)
```
