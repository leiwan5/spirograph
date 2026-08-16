import type { Pen } from '../types';
import { addPen, getState, removePen, setPen, setPens, setState, subscribe } from '../state/store';
import { curveInfo } from '../math/curve';
import { serializeState } from '../state/url';
import { COMBO_PRESETS, RING_PRESETS, ROLLING_PRESETS } from './presets';

/** 渐变附加色的默认取色（取色相轮上与当前色差异大的颜色） */
function nextGradientColor(base: string): string {
  const palette = [
    '#e63946', '#1d6fa5', '#f4a261', '#2a9d8f', '#9b5de5',
    '#f15bb5', '#00bbf9', '#d9a404', '#3a86ff', '#ff7b00',
  ];
  const b = base.toLowerCase();
  const idx = palette.findIndex((c) => c === b);
  return palette[(idx + 1 + Math.floor(Math.random() * (palette.length - 1))) % palette.length];
}

const RING_MIN = 40;
const RING_MAX = 240;
const ROLLING_MIN = 8;
const ROLLING_MAX = 96;

export interface PanelApi {
  setPlayingUI(playing: boolean, paused?: boolean): void;
  onPlayRequest(cb: () => void): void;
  onRandomRequest(cb: () => void): void;
  onExportPng(cb: (size: number) => void): void;
  onExportSvg(cb: (size: number) => void): void;
}

/** 构建左侧控件面板 + 右侧画布容器，返回面板 API */
export function buildPanel(root: HTMLElement, canvas: HTMLCanvasElement): PanelApi {
  const panelEl = document.createElement('aside');
  panelEl.className = 'panel';
  panelEl.innerHTML = `
    <h1>🌀 Spirograph <span class="sub">生成器</span></h1>

    <section>
      <div class="section-title">绘制模式</div>
      <div class="seg" id="mode-seg">
        <button data-mode="inside" class="active">内切（齿轮环内）</button>
        <button data-mode="outside">外切（齿轮环外）</button>
      </div>
    </section>

    <section>
      <div class="section-title">环形齿轮 Ring Gear <span class="val" id="ring-val">72</span></div>
      <input type="range" id="ring" min="${RING_MIN}" max="${RING_MAX}" step="1">
      <div class="chips" id="ring-chips"></div>
    </section>

    <section>
      <div class="section-title">滚动齿轮 Rolling Gear <span class="val" id="rolling-val">30</span></div>
      <input type="range" id="rolling" min="${ROLLING_MIN}" max="${ROLLING_MAX}" step="1">
      <div class="chips" id="rolling-chips"></div>
    </section>

    <section>
      <div class="section-title">笔（多支笔叠加绘制）</div>
      <div class="pens" id="pens"></div>
      <button class="add-pen" id="add-pen">＋ 添加笔</button>
    </section>

    <section>
      <div class="section-title">预设组合</div>
      <div class="chips" id="preset-chips"></div>
    </section>

    <section>
      <div class="section-title">画布缩放</div>
      <div class="seg" id="scale-seg">
        <button data-scale="auto" class="active" title="图像尺寸固定：图案始终充满画布；调孔洞/齿轮时整图会缩放适配">固定图像大小</button>
        <button data-scale="fixed" title="环尺寸固定：齿轮环在画布上大小恒定，图案按真实比例画在环内；调孔洞不影响任何笔">环固定大小</button>
      </div>
    </section>

    <section>
      <div class="row-label"><span>画布背景</span><input type="color" id="bg"></div>
    </section>

    <section>
      <div class="row-label"><span>动画速度</span><span class="val" id="speed-val">1×</span></div>
      <input type="range" id="speed" min="0.1" max="10" step="0.1">
      <label class="check-row"><input type="checkbox" id="show-gears"><span>显示齿轮（多笔分步绘制）</span></label>
    </section>

    <section>
      <div class="row-label"><span>图片尺寸</span>
        <select id="img-size" class="size-select">
          <option value="512">512×512</option>
          <option value="1000">1000×1000</option>
          <option value="2048" selected>2048×2048</option>
          <option value="4096">4096×4096</option>
        </select>
      </div>
    </section>

    <section class="actions">
      <button class="btn btn-primary" id="play">▶ 播放绘制</button>
      <button class="btn btn-ghost" id="random">🎲 随机灵感</button>
      <button class="btn btn-ghost" id="export-png">⬇ 导出 PNG</button>
      <button class="btn btn-ghost" id="export-svg">⬇ 导出 SVG</button>
      <button class="btn btn-ghost full" id="copy-image-link">🔗 复制图片链接</button>
    </section>

    <section class="info">
      <div>化简比 <b id="info-ratio">–</b> · 花瓣数 <b id="info-petals">–</b> · 闭合转数 <b id="info-turns">–</b></div>
      <div>单笔采样 <b id="info-samples">–</b> 点</div>
    </section>
  `;

  const stage = document.createElement('main');
  stage.className = 'stage';
  stage.appendChild(canvas);
  root.appendChild(panelEl);
  root.appendChild(stage);

  // ---- 元素引用 ----
  const $ = <T extends HTMLElement>(id: string): T => panelEl.querySelector('#' + id) as T;
  const ringSlider = $<HTMLInputElement>('ring');
  const rollingSlider = $<HTMLInputElement>('rolling');
  const ringVal = $('ring-val');
  const rollingVal = $('rolling-val');
  const speedSlider = $<HTMLInputElement>('speed');
  const speedVal = $('speed-val');
  const bgColor = $<HTMLInputElement>('bg');
  const pensEl = $('pens');
  const ringChipsEl = $('ring-chips');
  const rollingChipsEl = $('rolling-chips');
  const presetChipsEl = $('preset-chips');
  const playBtn = $<HTMLButtonElement>('play');
  const randomBtn = $<HTMLButtonElement>('random');
  const exportPngBtn = $<HTMLButtonElement>('export-png');
  const exportSvgBtn = $<HTMLButtonElement>('export-svg');
  const copyLinkBtn = $<HTMLButtonElement>('copy-image-link');
  const imgSizeSelect = $<HTMLSelectElement>('img-size');
  const infoRatio = $('info-ratio');
  const infoPetals = $('info-petals');
  const infoTurns = $('info-turns');
  const infoSamples = $('info-samples');

  // ---- 回调（由 main 注入）----
  let onPlay: () => void = () => {};
  let onRandom: () => void = () => {};
  let onPng: (size: number) => void = () => {};
  let onSvg: (size: number) => void = () => {};

  // ---- 快捷 chips ----
  const ringChips: HTMLButtonElement[] = [];
  for (const v of RING_PRESETS) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = String(v);
    b.addEventListener('click', () => handleRing(v));
    ringChipsEl.appendChild(b);
    ringChips.push(b);
  }
  const rollingChips: HTMLButtonElement[] = [];
  for (const v of ROLLING_PRESETS) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = String(v);
    b.addEventListener('click', () => handleRolling(v));
    rollingChipsEl.appendChild(b);
    rollingChips.push(b);
  }

  // 预设组合
  for (const p of COMBO_PRESETS) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = p.name;
    b.title = `${p.ring}齿环 × ${p.rolling}齿轮，${p.mode === 'inside' ? '内切' : '外切'}`;
    b.addEventListener('click', () => {
      setPens(p.pens.map((pp) => ({ hole: pp.hole, color: pp.color, gradient: pp.gradient ?? [], gradientStart: 0, gradientLength: 100, width: pp.width })));
      setState({ mode: p.mode, ringTeeth: p.ring, rollingTeeth: p.rolling });
    });
    presetChipsEl.appendChild(b);
  }

  // ---- 齿轮变更处理 ----
  function handleRing(v: number): void {
    const s = getState();
    if (s.mode === 'inside' && s.rollingTeeth >= v) {
      setState({ ringTeeth: v, rollingTeeth: v - 1 });
    } else {
      setState({ ringTeeth: v });
    }
  }

  function handleRolling(v: number): void {
    const s = getState();
    if (s.mode === 'inside' && v >= s.ringTeeth) {
      v = s.ringTeeth - 1;
    }
    setState({ rollingTeeth: v });
  }

  ringSlider.addEventListener('input', () => handleRing(Math.round(+ringSlider.value)));
  rollingSlider.addEventListener('input', () => handleRolling(Math.round(+rollingSlider.value)));

  // ---- 模式切换 ----
  const segButtons = panelEl.querySelectorAll<HTMLButtonElement>('#mode-seg button');
  segButtons.forEach((b) => {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode as 'inside' | 'outside';
      const s = getState();
      if (mode === 'inside' && s.rollingTeeth >= s.ringTeeth) {
        setState({ mode, rollingTeeth: s.ringTeeth - 1 });
      } else {
        setState({ mode });
      }
    });
  });

  // ---- 缩放模式 ----
  const scaleButtons = panelEl.querySelectorAll<HTMLButtonElement>('#scale-seg button');
  scaleButtons.forEach((b) => {
    b.addEventListener('click', () => {
      setState({ scaleMode: b.dataset.scale as 'auto' | 'fixed' });
    });
  });

  // ---- 背景色 / 速度 / 显示齿轮 ----
  bgColor.addEventListener('input', () => setState({ background: bgColor.value }));
  speedSlider.addEventListener('input', () => setState({ speed: Math.round(+speedSlider.value * 10) / 10 }));
  const gearsCheck = $<HTMLInputElement>('show-gears');
  gearsCheck.addEventListener('change', () => setState({ showGears: gearsCheck.checked }));

  // ---- 笔列表 ----
  // 笔的 id 集合（结构指纹）：setPens/预设/随机/URL 整体替换时重建卡片，
  // 单纯值变化（拖动滑块）不重建，保证拖动流畅
  let lastPenIds = '';

  function renderPens(): void {
    pensEl.innerHTML = '';
    const s = getState();
    s.pens.forEach((pen, idx) => pensEl.appendChild(buildPenCard(pen, idx + 1)));
  }

  function buildPenCard(pen: Pen, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'pen-card';
    card.innerHTML = `
      <div class="pen-head">
        <span class="pen-dot" style="background:${pen.color}"></span>
        <span class="grow">笔 ${index}</span>
        <button class="pen-del" title="删除此笔">✕</button>
      </div>
      <div class="row-label"><span>孔洞位置（%滚动半径）</span><span class="val">${pen.hole}%</span></div>
      <input type="range" class="pen-hole" min="0" max="100" step="1" value="${pen.hole}">
      <div class="pen-row">
        <span class="row-label" style="flex:1"><span>颜色</span></span>
        <input type="color" class="pen-color" value="${pen.color}">
      </div>
      <div class="row-label"><span>粗细（px）</span><span class="val">${pen.width}</span></div>
      <input type="range" class="pen-width" min="0.5" max="8" step="0.5" value="${pen.width}">
      <div class="pen-row">
        <label class="check-row"><input type="checkbox" class="pen-grad"${pen.gradient.length > 0 ? ' checked' : ''}><span>渐变</span></label>
        <span class="pen-grad-slots"></span>
        <button class="pen-grad-add" title="添加渐变色">＋</button>
      </div>
      <div class="pen-grad-opts">
        <div class="row-label"><span>渐变起点（画到此处开始变色）</span><span class="val">${pen.gradientStart}%</span></div>
        <input type="range" class="pen-grad-start" min="0" max="100" step="1" value="${pen.gradientStart}">
        <div class="row-label"><span>渐变长度（多长完成渐变）</span><span class="val">${pen.gradientLength}%</span></div>
        <input type="range" class="pen-grad-length" min="0" max="100" step="1" value="${pen.gradientLength}">
      </div>
    `;
    const holeSlider = card.querySelector<HTMLInputElement>('.pen-hole')!;
    const colorInput = card.querySelector<HTMLInputElement>('.pen-color')!;
    const widthSlider = card.querySelector<HTMLInputElement>('.pen-width')!;
    const dot = card.querySelector<HTMLElement>('.pen-dot')!;
    const holeVal = card.querySelectorAll<HTMLElement>('.row-label .val')[0];
    const widthVal = card.querySelectorAll<HTMLElement>('.row-label .val')[1];

    holeSlider.addEventListener('input', () => {
      setPen(pen.id, { hole: Math.round(+holeSlider.value) });
      holeVal.textContent = holeSlider.value + '%';
    });
    colorInput.addEventListener('input', () => {
      setPen(pen.id, { color: colorInput.value });
      dot.style.background = colorInput.value;
    });
    widthSlider.addEventListener('input', () => {
      setPen(pen.id, { width: +widthSlider.value });
      widthVal.textContent = widthSlider.value;
    });

    // ---- 渐变控件 ----
    const gradCheck = card.querySelector<HTMLInputElement>('.pen-grad')!;
    const gradSlots = card.querySelector<HTMLElement>('.pen-grad-slots')!;
    const gradAdd = card.querySelector<HTMLButtonElement>('.pen-grad-add')!;
    const gradOpts = card.querySelector<HTMLElement>('.pen-grad-opts')!;
    const gradStartSlider = card.querySelector<HTMLInputElement>('.pen-grad-start')!;
    const gradLengthSlider = card.querySelector<HTMLInputElement>('.pen-grad-length')!;
    const gradStartVal = gradOpts.querySelectorAll('.row-label .val')[0] as HTMLElement;
    const gradLengthVal = gradOpts.querySelectorAll('.row-label .val')[1] as HTMLElement;

    function renderGradSlots(): void {
      gradSlots.innerHTML = '';
      const g = getState().pens.find((p) => p.id === pen.id)?.gradient ?? pen.gradient;
      gradOpts.classList.toggle('show', g.length > 0);
      g.forEach((c, idx) => {
        const swatch = document.createElement('input');
        swatch.type = 'color';
        swatch.className = 'pen-grad-color';
        swatch.value = c;
        swatch.title = '渐变色 ' + (idx + 2);
        swatch.addEventListener('input', () => {
          const cur = getState().pens.find((p) => p.id === pen.id)?.gradient ?? [];
          const next = cur.map((x, i) => (i === idx ? swatch.value : x));
          setPen(pen.id, { gradient: next });
        });
        gradSlots.appendChild(swatch);
      });
      gradAdd.disabled = g.length >= 3;
      gradAdd.textContent = g.length >= 3 ? '3' : '＋';
    }

    gradCheck.addEventListener('change', () => {
      if (gradCheck.checked) {
        const cur = getState().pens.find((p) => p.id === pen.id)?.gradient ?? [];
        const next = cur.length > 0 ? cur : [nextGradientColor(pen.color)];
        setPen(pen.id, { gradient: next });
      } else {
        setPen(pen.id, { gradient: [] });
      }
      renderGradSlots();
    });
    gradAdd.addEventListener('click', () => {
      const cur = getState().pens.find((p) => p.id === pen.id)?.gradient ?? [];
      if (cur.length >= 3) return;
      const last = cur[cur.length - 1] ?? pen.color;
      setPen(pen.id, { gradient: [...cur, nextGradientColor(last)] });
      renderGradSlots();
    });
    gradStartSlider.addEventListener('input', () => {
      const v = Math.round(+gradStartSlider.value);
      setPen(pen.id, { gradientStart: v });
      gradStartVal.textContent = v + '%';
    });
    gradLengthSlider.addEventListener('input', () => {
      const v = Math.round(+gradLengthSlider.value);
      setPen(pen.id, { gradientLength: v });
      gradLengthVal.textContent = v + '%';
    });
    renderGradSlots();
    card.querySelector<HTMLButtonElement>('.pen-del')!.addEventListener('click', () => {
      removePen(pen.id);
    });
    return card;
  }

  $<HTMLButtonElement>('add-pen').addEventListener('click', () => {
    addPen();
  });

  // ---- 操作按钮 ----
  playBtn.addEventListener('click', () => onPlay());
  randomBtn.addEventListener('click', () => onRandom());
  exportPngBtn.addEventListener('click', () => onPng(Number(imgSizeSelect.value)));
  exportSvgBtn.addEventListener('click', () => onSvg(Number(imgSizeSelect.value)));

  // 复制当前参数的图片链接（/api/image?...&format=png）
  copyLinkBtn.addEventListener('click', async () => {
    const qs = serializeState(getState());
    const dir = location.pathname.replace(/[^/]*$/, '');
    const url = location.origin + dir + 'api/image?' + qs + '&format=png&size=' + imgSizeSelect.value;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 降级方案：临时 textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyLinkBtn.textContent = '✅ 已复制链接';
    setTimeout(() => {
      copyLinkBtn.textContent = '🔗 复制图片链接';
    }, 1600);
  });

  // ---- 同步控件到状态（状态变化时调用）----
  function syncControls(): void {
    const s = getState();
    ringSlider.value = String(s.ringTeeth);
    ringVal.textContent = String(s.ringTeeth);
    rollingSlider.max = String(s.mode === 'inside' ? Math.min(ROLLING_MAX, s.ringTeeth - 1) : ROLLING_MAX);
    rollingSlider.value = String(s.rollingTeeth);
    rollingVal.textContent = String(s.rollingTeeth);
    speedSlider.value = String(s.speed);
    speedVal.textContent = s.speed + '×';
    bgColor.value = s.background;
    gearsCheck.checked = s.showGears;

    segButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === s.mode));
    scaleButtons.forEach((b) => b.classList.toggle('active', b.dataset.scale === s.scaleMode));
    ringChips.forEach((b) => b.classList.toggle('active', +b.textContent! === s.ringTeeth));
    rollingChips.forEach((b) => b.classList.toggle('active', +b.textContent! === s.rollingTeeth));

    // pens 结构变化（预设/随机/URL/增删笔）→ 重建笔卡片
    const penIds = s.pens.map((p) => p.id).join(',');
    if (penIds !== lastPenIds) {
      lastPenIds = penIds;
      renderPens();
    }

    try {
      const info = curveInfo(s.ringTeeth, s.rollingTeeth, s.mode);
      infoRatio.textContent = `${info.ratio.p}:${info.ratio.q}`;
      infoPetals.textContent = String(info.ratio.petals);
      infoTurns.textContent = String(info.periodTurns);
      infoSamples.textContent = info.totalSamples.toLocaleString() + (info.reduced ? '（已降采样）' : '');
    } catch {
      infoRatio.textContent = '–';
      infoPetals.textContent = '–';
      infoTurns.textContent = '–';
      infoSamples.textContent = '–';
    }
  }

  subscribe(syncControls);
  syncControls(); // 首次同步会重建笔卡片（lastPenIds 为空）

  return {
    setPlayingUI(playing: boolean, paused = false) {
      if (!playing) {
        playBtn.textContent = '▶ 播放绘制';
        playBtn.classList.remove('playing');
      } else {
        playBtn.textContent = paused ? '▶ 继续' : '⏸ 暂停';
        playBtn.classList.add('playing');
      }
    },
    onPlayRequest(cb: () => void) { onPlay = cb; },
    onRandomRequest(cb: () => void) { onRandom = cb; },
    onExportPng(cb: (size: number) => void) { onPng = cb; },
    onExportSvg(cb: (size: number) => void) { onSvg = cb; },
  };
}
