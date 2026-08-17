import { type Dataset } from './schema';
import { withinDate } from './schema';

export function initExport(dataset: Dataset, getYear: () => number): void {
  // 버튼 중복 생성 회피: 이미 있으면 재사용
  let button = document.getElementById('export-timeslice-btn') as HTMLButtonElement | null;

  if (!button) {
    button = document.createElement('button');
    button.id = 'export-timeslice-btn';
    button.textContent = '이 시점 GeoJSON 내려받기';
    button.style.position = 'fixed';
    button.style.top = '12px';
    button.style.left = '12px';
    button.style.zIndex = '5';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#f0f0f0';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.fontFamily = 'sans-serif';
    document.body.appendChild(button);
  }

  button.onclick = () => {
    const year = getYear();

    // 모든 collection에서 해당 연도의 features 필터링
    const features: any[] = [];

    const collections = [
      dataset.territory,
      dataset.admin_regions,
      dataset.settlements,
      dataset.battles,
      dataset.movements
    ];

    for (const collection of collections) {
      for (const feature of collection.features) {
        if (withinDate(feature.properties, year)) {
          features.push(feature);
        }
      }
    }

    // FeatureCollection 생성
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    // JSON을 Blob으로 변환 후 다운로드
    const jsonString = JSON.stringify(geojson, null, 2);
    const blob = new Blob([jsonString], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rome-${year}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
}
