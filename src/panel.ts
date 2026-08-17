// 피처 클릭 상세 사이드 패널. 순수 DOM, 외부 의존성 없음. wiring은 main.ts 담당.
import { type Dataset } from './schema';

export type Kind = 'territory' | 'settlement' | 'battle' | 'movement' | 'admin';

const STYLE = `
.vp-panel {
  position: fixed; top: 0; right: 0; height: 100%; width: 300px;
  background: rgba(250, 246, 235, 0.92);
  border-left: 1px solid rgba(0,0,0,0.15);
  box-shadow: -4px 0 12px rgba(0,0,0,0.15);
  padding: 20px; box-sizing: border-box;
  font-family: 'Noto Serif KR', Georgia, serif;
  color: #2a2521;
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 0.2s ease-out;
  z-index: 1000;
}
.vp-panel.vp-open { transform: translateX(0); }
.vp-panel h2 { margin: 0 24px 12px 0; font-size: 1.2em; }
.vp-panel dl { margin: 0; }
.vp-panel dt { font-size: 0.75em; opacity: 0.65; margin-top: 10px; }
.vp-panel dd { margin: 2px 0 0; font-size: 0.95em; }
.vp-panel .vp-close {
  position: absolute; top: 14px; right: 14px;
  background: none; border: none; font-size: 1.1em; cursor: pointer;
  color: #2a2521; line-height: 1;
}
`;

function yearLabel(year: number): string {
  return year < 0 ? `기원전 ${-year}년` : `${year}년`;
}

function actorLabel(dataset: Dataset, actorId: string | undefined): string {
  return dataset.actors.find(a => a.id === actorId)?.label ?? '무주공산';
}

function field(dl: HTMLDListElement, label: string, value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = String(value);
  dl.append(dt, dd);
}

export function createPanel(dataset: Dataset): { show(kind: Kind, props: Record<string, any>): void; hide(): void } {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'vp-panel';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'vp-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', '닫기');
  closeBtn.addEventListener('click', () => hide());

  const title = document.createElement('h2');
  const dl = document.createElement('dl');

  root.append(closeBtn, title, dl);
  document.body.appendChild(root);

  function hide(): void {
    root.classList.remove('vp-open');
  }

  function show(kind: Kind, props: Record<string, any>): void {
    dl.innerHTML = '';

    switch (kind) {
      case 'territory':
        title.textContent = props.name_ko ?? '';
        field(dl, '지배세력', actorLabel(dataset, props.actor));
        field(dl, '신뢰도', props.confidence);
        break;

      case 'settlement':
        title.textContent = props.name_ko ?? '';
        field(dl, '고대명', props.name_ancient);
        field(dl, '현대명', props.name_modern);
        field(dl, '자원', props.resource);
        field(dl, '지형', props.terrain);
        field(dl, '출처', props.source);
        break;

      case 'battle':
        title.textContent = props.name_ko ?? '';
        field(dl, '지휘관', `${props.general_a ?? '?'} vs ${props.general_b ?? '?'}`);
        field(dl, '승자', actorLabel(dataset, props.victor));
        field(dl, '병력', `${props.strength_a?.toLocaleString()}:${props.strength_b?.toLocaleString()}`);
        field(dl, '신뢰도', props.confidence);
        break;

      case 'movement':
        title.textContent = props.name_ko ?? '';
        field(dl, '도착지', props.label);
        field(dl, '도착 연도', typeof props.to_year === 'number' ? yearLabel(props.to_year) : undefined);
        break;

      case 'admin':
        title.textContent = props.name_ko ?? '';
        field(dl, '고대명', props.name_ancient);
        field(dl, '설치', typeof props.valid_from === 'number' ? yearLabel(props.valid_from) : undefined);
        break;
    }

    root.classList.add('vp-open');
  }

  return { show, hide };
}
