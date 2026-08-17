import * as THREE from 'three';
import * as maplibregl from 'maplibre-gl';

// MapLibre 위 Three.js 토큰(장군 말). 연도 위치로 이동한다(Rome:Total War식).
// render 매트릭스는 MapLibre v6 계약: args.defaultProjectionData.mainMatrix (문서 확인).
// 위치는 MercatorCoordinate + meterInMercatorCoordinateUnits() 스케일.

const TOKEN_METERS = 60000; // ponytail: 토큰 높이(약 60km) — zoom 3~9 가독성 튜닝 노브. 안 보이면 키운다.
const ANIM_MS = 500; // ponytail: setPosition 이징 지속시간 노브.

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function createHannibalToken(color: string) {
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  // 장기 말 = 원뿔 + 받침 디스크. pitch 0(탑다운)에선 원으로, pitch를 주면 서 있는 말로 보인다.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.0, 24),
    new THREE.MeshBasicMaterial({ color }), // 조명 무관 — 항상 보임(검증 불가 환경 대비)
  );
  cone.position.y = 0.65; // 받침 위에 얹힌 원뿔
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.15, 24),
    new THREE.MeshBasicMaterial({ color }),
  );
  base.position.y = 0.075; // 바닥 받침 디스크
  const group = new THREE.Group();
  group.add(cone, base);
  group.rotation.x = -Math.PI / 2; // three +y(그룹 위) → mercator +z(위)
  scene.add(group);

  let renderer: THREE.WebGLRenderer | null = null;
  let map: maplibregl.Map | null = null;
  let pos: [number, number] | null = null; // 현재 렌더 위치(이징 중엔 매 프레임 갱신)
  let animFrom: [number, number] | null = null;
  let animTo: [number, number] | null = null;
  let animStart = 0;
  let rafId: number | null = null;

  function tick() {
    rafId = null;
    if (!animTo || !animFrom) return;
    const t = Math.min(1, (performance.now() - animStart) / ANIM_MS);
    const e = easeOutCubic(t);
    pos = [animFrom[0] + (animTo[0] - animFrom[0]) * e, animFrom[1] + (animTo[1] - animFrom[1]) * e];
    map?.triggerRepaint();
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      animFrom = null;
      animTo = null;
    }
  }

  const layer: maplibregl.CustomLayerInterface = {
    id: 'hannibal-token',
    type: 'custom',
    renderingMode: '3d',
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(_gl, args: any) {
      if (!pos || !renderer) return; // 원정 전 연도엔 안 그림
      const mc = maplibregl.MercatorCoordinate.fromLngLat(pos, 0);
      const s = mc.meterInMercatorCoordinateUnits() * TOKEN_METERS;
      const model = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s));
      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(args.defaultProjectionData.mainMatrix)
        .multiply(model);
      renderer.resetState();
      renderer.render(scene, camera);
      map!.triggerRepaint();
    },
  };

  return {
    layer,
    /** 토큰을 [lng,lat]로 부드럽게 이동. null이면 즉시 숨김. */
    setPosition(next: [number, number] | null) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      animFrom = null;
      animTo = null;
      if (next === null) {
        pos = null; // 즉시 숨김 — render()가 pos 없으면 그리지 않음
        map?.triggerRepaint();
        return;
      }
      if (pos === null) {
        pos = next; // 첫 등장은 이징 없이 즉시 표시(이전 위치가 없음)
        map?.triggerRepaint();
        return;
      }
      animFrom = pos;
      animTo = next;
      animStart = performance.now();
      rafId = requestAnimationFrame(tick);
    },
  };
}
