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

- `rome-753-218` — 로마 건국~제2차 포에니(기원전 753~218). atlas 프로토타입 포팅.
- 데이터 재생성: `npm run gen` (regions.geojson + territory.geojson). `validate`/`build`가 자동 실행.

**시간필터 모델**: 시간가변 피처는 `valid_from`/`valid_to`를 갖고, 연도 변경 시 `setFilter`로 필터한다(`setData` 재계산 아님). territory는 `_gen_territory.mjs`가 스냅샷 오너십(`entities/territory.json`) × 지오메트리(`regions.geojson`)를 조인해 "지역×통치구간" 날짜 피처로 생성.

> **provisional**: 현재 국경은 러프 근사(confidence:low). 정확한 BC218 트레이싱은 Natural Earth(PD) 기반 후속 작업. GPL/ODbL 데이터셋(historical-basemaps·AWMC)은 재배포하지 않고 트레이싱 참조로만 쓴다.

## 스택

MapLibre GL · Vite · TypeScript · Vitest. Konva 토큰 오버레이(군단 이동 연출)·내보내기는 후속 레이어.
