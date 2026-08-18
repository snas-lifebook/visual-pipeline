import { defineConfig } from 'vite';

// GitHub Pages 프로젝트 사이트는 /visual-pipeline/ 서브경로에서 서빙된다.
// 빌드 때만 base를 주고(dev는 / 유지). 데이터셋 fetch는 main.ts가 import.meta.env.BASE_URL로 맞춘다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/visual-pipeline/' : '/',
}));
