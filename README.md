# visual-pipeline

로마사(및 확장 도메인) **시계열 GIS 지도** — MapLibre GL 기반. 타임라인을 옮기면 그 시점의 세력 판도로 지도가 다시 그려진다. 볼트 밖 코드 레포(맥락·결정은 볼트 `Works/비주얼파이프라인/` 참조).

## 라이브 데모

설치 없이 브라우저에서 바로: **https://snas-lifebook.github.io/visual-pipeline/**

- 로마(기본): 타임라인을 옮기면 판도·전투·원정로·토큰 행군이 다시 그려진다.
- 초한전쟁(도메인 무관 실증): https://snas-lifebook.github.io/visual-pipeline/?dataset=chuhan-206

`main` 브랜치에 push하면 GitHub Actions가 빌드→Pages 자동 배포(`.github/workflows/deploy.yml`).

## 개발

```
npm run dev        # Vite dev 서버
npm run validate   # 데이터→렌더 계약 테스트 (vitest run) — build 게이트
npm run build      # validate 통과 후 vite build
npm test           # vitest watch
```

## 데이터 (도메인 무관 계약 — SCHEMA)

`public/datasets/<domain>/` 하나가 한 캠페인. `manifest.json` + `layers/*.geojson` + `entities/*.json`. 좌표는 **GeoJSON [lng,lat]**(Leaflet [lat,lon] 아님). 계약·타입은 `src/schema.ts`.

- `rome-753-218` — 로마 건국~제2차 포에니 종전(기원전 753~201). 레이어: territory·admin_regions·settlements·battles·**movements**(한니발·스키피오 원정로). 데이터셋 사용법은 `public/datasets/rome-753-218/README.md`.
- `chuhan-206` — 초한전쟁(기원전 206~202). 스키마 무수정 재사용으로 **도메인 무관성 실증**. `?dataset=chuhan-206`.
- 데이터 재생성: `npm run gen` (regions·territory·admin·battles). `validate`/`build`가 자동 실행.

**시간필터 모델**: 시간가변 피처는 `valid_from`/`valid_to`를 갖고, 연도 변경 시 `setFilter`로 필터한다(`setData` 재계산 아님). territory는 `_gen_territory.mjs`가 스냅샷 오너십(`entities/territory.json`) × 지오메트리(`regions.geojson`)를 조인해 "지역×통치구간" 날짜 피처로 생성.

> **provisional**: region 폴리곤은 실제 해안선(Natural Earth 10m land, PD)으로 클립해 해안·섬은 실측 윤곽, 내륙 경계는 여전히 러프 근사(confidence:medium/low). GPL/NC/상용 데이터(historical-basemaps=GPL-3.0·AWMC=CC-BY-NC·DARE)는 재배포하지 않고 트레이싱 참조로만 쓴다. 재배포는 PD/자체 트레이싱만.

## 비전·로드맵

시간구동 인터랙티브 지도(지배·도시·전투·이동 → Three.js 토큰·3D 지형·시뮬)의 6축 매핑·상태·소스 라이선스는 `docs/roadmap.md` 참조.

## 스택

MapLibre GL · Vite · TypeScript · Vitest. 이동 경로 위 장군 토큰(장기 말)은 **Three.js 오버레이**로 movements route별 자동 생성·경로 따라 행군(완료). 타임슬라이스 GeoJSON 내보내기·상세 패널 포함. 상세=`docs/roadmap.md`.
