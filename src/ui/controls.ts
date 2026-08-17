import type { Pen } from '@spirograph/core';
import { curveInfo } from '@spirograph/core';
import { serializeState } from '@spirograph/core';
import { addPen, getState, removePen, setPen, setPens, setState, subscribe } from '../state/store';
import { COMBO_PRESETS, RING_PRESETS, ROLLING_PRESETS } from './presets';
import { getLang, setLang, t, subscribeLang, type Lang, type I18nKey } from './i18n';

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
    <div class="panel-head">
      <h1>🌀 Spirograph <span class="sub" data-i18n="appTitleSub">Generator</span></h1>
      <div class="lang-seg" id="lang-seg">
        <button data-lang="en" class="active">EN</button>
        <button data-lang="zh">中文</button>
      </div>
    </div>

    <section>
      <div class="section-title" data-i18n="sectionMode">Drawing Mode</div>
      <div class="seg" id="mode-seg">
        <button data-mode="inside" class="active" data-i18n="modeInside">Inside (in ring)</button>
        <button data-mode="outside" data-i18n="modeOutside">Outside (around ring)</button>
      </div>
    </section>

    <section>
      <div class="section-title"><span data-i18n="sectionRing">Ring Gear</span> <span class="val" id="ring-val">72</span></div>
      <input type="range" id="ring" min="${RING_MIN}" max="${RING_MAX}" step="1">
      <div class="chips" id="ring-chips"></div>
    </section>

    <section>
      <div class="section-title"><span data-i18n="sectionRolling">Rolling Gear</span> <span class="val" id="rolling-val">30</span></div>
      <input type="range" id="rolling" min="${ROLLING_MIN}" max="${ROLLING_MAX}" step="1">
      <div class="chips" id="rolling-chips"></div>
    </section>

    <section>
      <div class="section-title" data-i18n="sectionPens">Pens (stacked)</div>
      <div class="pens" id="pens"></div>
      <button class="add-pen" id="add-pen" data-i18n="addPen">＋ Add Pen</button>
    </section>

    <section>
      <div class="section-title" data-i18n="sectionPresets">Presets</div>
      <div class="chips" id="preset-chips"></div>
    </section>

    <section>
      <div class="section-title" data-i18n="sectionScale">Canvas Scale</div>
      <div class="seg" id="scale-seg">
        <button data-scale="auto" class="active" data-i18n="scaleAuto" data-i18n-title="scaleAutoTitle">Fixed image</button>
        <button data-scale="fixed" data-i18n="scaleFixed" data-i18n-title="scaleFixedTitle">Fixed ring</button>
      </div>
    </section>

    <section>
      <div class="row-label"><span data-i18n="canvasBackground">Canvas background</span><input type="color" id="bg"></div>
    </section>

    <section>
      <div class="row-label"><span data-i18n="animSpeed">Animation speed</span><span class="val" id="speed-val">1×</span></div>
      <input type="range" id="speed" min="0.1" max="10" step="0.1">
      <label class="check-row"><input type="checkbox" id="show-gears"><span data-i18n="showGears">Show gears (pens drawn in sequence)</span></label>
    </section>

    <section>
      <div class="row-label"><span data-i18n="imgSize">Image size</span>
        <select id="img-size" class="size-select">
          <option value="512">512×512</option>
          <option value="1000">1000×1000</option>
          <option value="2048" selected>2048×2048</option>
          <option value="4096">4096×4096</option>
        </select>
      </div>
    </section>

    <section class="actions">
      <button class="btn btn-primary" id="play" data-i18n="play">▶ Play drawing</button>
      <button class="btn btn-ghost" id="random" data-i18n="random">🎲 Random</button>
      <button class="btn btn-ghost" id="export-png" data-i18n="exportPng">⬇ Export PNG</button>
      <button class="btn btn-ghost" id="export-svg" data-i18n="exportSvg">⬇ Export SVG</button>
      <button class="btn btn-ghost full" id="copy-image-link" data-i18n="copyImageLink">🔗 Copy image link</button>
    </section>

    <section class="info">
      <div><span data-i18n="infoRatio">Ratio</span> <b id="info-ratio">–</b> · <span data-i18n="infoPetals">Petals</span> <b id="info-petals">–</b> · <span data-i18n="infoTurns">Turns</span> <b id="info-turns">–</b></div>
      <div id="info-samples-row">–</div>
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
  const infoSamplesRow = $('info-samples-row');
  const langSeg = $<HTMLElement>('lang-seg');

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
  const presetChips: HTMLButtonElement[] = [];
  function renderPresetChips(): void {
    presetChipsEl.innerHTML = '';
    presetChips.length = 0;
    for (const p of COMBO_PRESETS) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.addEventListener('click', () => {
        setPens(p.pens.map((pp) => ({ hole: pp.hole, color: pp.color, gradient: pp.gradient ?? [], gradientSpacing: pp.gradientSpacing ?? 20, width: pp.width })));
        setState({ mode: p.mode, ringTeeth: p.ring, rollingTeeth: p.rolling });
      });
      presetChipsEl.appendChild(b);
      presetChips.push(b);
    }
    localizePresetChips();
  }
  function localizePresetChips(): void {
    presetChips.forEach((b, i) => {
      const p = COMBO_PRESETS[i];
      const modeTag = p.mode === 'inside' ? t('modeInsideTag') : t('modeOutsideTag');
      b.textContent = getLang() === 'en' ? p.nameEn : p.name;
      b.title = t('presetTitle', { ring: p.ring, rolling: p.rolling, mode: modeTag });
    });
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

  // ---- 语言切换 ----
  langSeg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang as Lang));
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
        <span class="grow">${t('penLabel', { n: index })}</span>
        <button class="pen-del" title="${t('penDelete')}">✕</button>
      </div>
      <div class="row-label"><span>${t('penHole')}</span><span class="val">${pen.hole}%</span></div>
      <input type="range" class="pen-hole" min="0" max="100" step="1" value="${pen.hole}">
      <div class="pen-row">
        <span class="row-label" style="flex:1"><span>${t('penColor')}</span></span>
        <input type="color" class="pen-color" value="${pen.color}">
      </div>
      <div class="row-label"><span>${t('penWidth')}</span><span class="val">${pen.width}</span></div>
      <input type="range" class="pen-width" min="0.5" max="8" step="0.5" value="${pen.width}">
      <div class="pen-row">
        <label class="check-row"><input type="checkbox" class="pen-grad"${pen.gradient.length > 1 ? ' checked' : ''}><span>${t('penGradient')}</span></label>
        <button class="pen-grad-add" title="${t('penGradAdd')}">＋</button>
      </div>
      <div class="pen-grad-opts">
        <div class="row-label"><span>${t('penGradSpacing')}</span><span class="val">${pen.gradientSpacing}%</span></div>
        <input type="range" class="pen-grad-spacing" min="1" max="100" step="1" value="${pen.gradientSpacing}">
        <div class="pen-grad-colors"></div>
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

    // ---- 渐变控件（统一间隔模型）----
    const gradCheck = card.querySelector<HTMLInputElement>('.pen-grad')!;
    const gradAdd = card.querySelector<HTMLButtonElement>('.pen-grad-add')!;
    const gradOpts = card.querySelector<HTMLElement>('.pen-grad-opts')!;
    const gradSpacing = card.querySelector<HTMLInputElement>('.pen-grad-spacing')!;
    const gradColorsEl = card.querySelector<HTMLElement>('.pen-grad-colors')!;
    const gradSpacingVal = gradOpts.querySelector('.row-label .val') as HTMLElement;

    function currentGradient(): string[] {
      return getState().pens.find((p) => p.id === pen.id)?.gradient ?? pen.gradient;
    }

    /** 渲染渐变色槽列表（2-4 个颜色） */
    function renderGrad(): void {
      const g = currentGradient();
      gradOpts.classList.toggle('show', g.length > 1);
      gradAdd.disabled = g.length >= 4;
      gradAdd.textContent = g.length >= 4 ? '4' : '＋';
      gradColorsEl.innerHTML = '';
      g.forEach((c, idx) => {
        const slot = document.createElement('div');
        slot.className = 'pen-grad-slot';
        const swatch = document.createElement('input');
        swatch.type = 'color';
        swatch.value = c;
        swatch.title = t('gradSlotTitle', { n: idx + 1 });
        swatch.addEventListener('input', () => {
          setPen(pen.id, { gradient: currentGradient().map((x, i) => (i === idx ? swatch.value : x)) });
        });
        const del = document.createElement('button');
        del.className = 'pen-grad-del';
        del.textContent = 'X';
        del.style.display = g.length <= 2 ? 'none' : 'inline-block';
        del.addEventListener('click', () => {
          setPen(pen.id, { gradient: currentGradient().filter((_, i) => i !== idx) });
          renderGrad();
        });
        slot.appendChild(swatch);
        slot.appendChild(del);
        gradColorsEl.appendChild(slot);
      });
    }

    gradCheck.addEventListener('change', () => {
      const cur = currentGradient();
      if (gradCheck.checked && cur.length <= 1) {
        setPen(pen.id, {
          gradient:
            cur.length === 0
              ? [pen.color, nextGradientColor(pen.color)]
              : [cur[0], nextGradientColor(cur[0])],
        });
      } else if (!gradCheck.checked) {
        setPen(pen.id, { gradient: [] });
      }
      renderGrad();
    });
    gradAdd.addEventListener('click', () => {
      const cur = currentGradient();
      if (cur.length >= 4) return;
      const last = cur[cur.length - 1];
      setPen(pen.id, { gradient: [...cur, nextGradientColor(last)] });
      renderGrad();
    });
    gradSpacing.addEventListener('input', () => {
      const v = Math.round(+gradSpacing.value);
      setPen(pen.id, { gradientSpacing: v });
      gradSpacingVal.textContent = v + '%';
      const spacingVal = getState().pens.find((p) => p.id === pen.id)?.gradientSpacing;
      gradSpacing.value = String(spacingVal ?? v);
    });
    renderGrad();
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
    copyLinkBtn.textContent = t('copyImageLinkDone');
    setTimeout(() => {
      copyLinkBtn.textContent = t('copyImageLink');
    }, 1600);
  });

  // ---- 信息区（可变部分）----
  let lastInfo: { n: number; reduced: boolean } | null = null;
  function renderInfoSamples(): void {
    infoSamplesRow.innerHTML = lastInfo
      ? t('infoSamplesRow', {
          n: lastInfo.n.toLocaleString() + (lastInfo.reduced ? t('downsampled') : ''),
        })
      : '–';
  }

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
      lastInfo = { n: info.totalSamples, reduced: info.reduced };
    } catch {
      infoRatio.textContent = '–';
      infoPetals.textContent = '–';
      infoTurns.textContent = '–';
      lastInfo = null;
    }
    renderInfoSamples();
  }

  // ---- 语言本地化（不重建面板；笔卡片重建以保证新文案） ----
  let playState: { playing: boolean; paused: boolean } = { playing: false, paused: false };
  function localize(): void {
    // 静态文案
    panelEl.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n as I18nKey | undefined;
      if (key) el.textContent = t(key);
    });
    panelEl.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle as I18nKey | undefined;
      if (key) el.title = t(key);
    });
    // 语言按钮高亮
    langSeg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === getLang());
    });
    // 预设 chips（文案 + title）
    localizePresetChips();
    // 笔卡片（含文案）重建
    const s = getState();
    if (s.pens.length > 0) renderPens();
    // 播放按钮状态保持
    setPlayingUI(playState.playing, playState.paused);
    // 复制链接按钮复位
    copyLinkBtn.textContent = t('copyImageLink');
    // 信息区
    renderInfoSamples();
    // 文档标题
    document.title = 'Spirograph ' + t('appTitleSub');
  }
  function setPlayingUI(playing: boolean, paused = false): void {
    playState = { playing, paused };
    if (!playing) {
      playBtn.textContent = t('play');
      playBtn.classList.remove('playing');
    } else {
      playBtn.textContent = paused ? t('resume') : t('pause');
      playBtn.classList.add('playing');
    }
  }

  subscribe(syncControls);
  subscribeLang(localize);
  renderPresetChips();
  syncControls(); // 首次同步会重建笔卡片（lastPenIds 为空）
  localize(); // 应用当前语言（默认英文）

  return {
    setPlayingUI,
    onPlayRequest(cb: () => void) { onPlay = cb; },
    onRandomRequest(cb: () => void) { onRandom = cb; },
    onExportPng(cb: (size: number) => void) { onPng = cb; },
    onExportSvg(cb: (size: number) => void) { onSvg = cb; },
  };
}