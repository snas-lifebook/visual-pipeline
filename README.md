# visual-pipeline

로마사(및 확장 도메인) **시계열 GIS 지도** — MapLibre GL 기반. 타임라인을 옮기면 그 시점의 세력 판도로 지도가 다시 그려진다. 볼트 밖 코드 레포(맥락·결정은 볼트 `Works/비주얼파이프라인/` 참조).

## 개발

```
npm run dev        # Vite dev 서버
npm run validate   # 데이터→렌더 계약 테스트 (vitest run) — build 게이트
npm run build      # validate 통과 후 vite build
npm test           # vitest watch
```

## 데이터 (도메인 무관 계약 — SCHEMA)

`public/datasets/<domain>/` 하나가 한 캠페인. `manifest.json` + `layers/*.geojson` + `entities/*.json`. 좌표는 **GeoJSON [lng,lat]**(Leaflet [lat,lon] 아님). 계약·타입은 `src/schema.ts`.

- `rome-753-218` — 로마 건국~제2차 포에니 종전(기원전 753~201). 레이어: territory·admin_regions·settlements·**battles**. 데이터셋 사용법은 `public/datasets/rome-753-218/README.md`.
- 데이터 재생성: `npm run gen` (regions·territory·admin·battles). `validate`/`build`가 자동 실행.

**시간필터 모델**: 시간가변 피처는 `valid_from`/`valid_to`를 갖고, 연도 변경 시 `setFilter`로 필터한다(`setData` 재계산 아님). territory는 `_gen_territory.mjs`가 스냅샷 오너십(`entities/territory.json`) × 지오메트리(`regions.geojson`)를 조인해 "지역×통치구간" 날짜 피처로 생성.

> **provisional**: region 폴리곤은 실제 해안선(Natural Earth 10m land, PD)으로 클립해 해안·섬은 실측 윤곽, 내륙 경계는 여전히 러프 근사(confidence:medium/low). GPL/NC/상용 데이터(historical-basemaps=GPL-3.0·AWMC=CC-BY-NC·DARE)는 재배포하지 않고 트레이싱 참조로만 쓴다. 재배포는 PD/자체 트레이싱만.

## 비전·로드맵

시간구동 인터랙티브 지도(지배·도시·전투·이동 → Three.js 토큰·3D 지형·시뮬)의 6축 매핑·상태·소스 라이선스는 `docs/roadmap.md` 참조.

## 스택

MapLibre GL · Vite · TypeScript · Vitest. 이동 경로 위 장군 토큰(장기 말) 연출은 **Three.js 오버레이**·타임슬라이스 내보내기와 함께 후속 레이어(`docs/roadmap.md`).
