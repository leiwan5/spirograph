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
  onAnimationMode(cb: (active: boolean) => void): void;
  onPlayRequest(cb: () => void): void;
  onRandomRequest(cb: () => void): void;
  onExportPng(cb: (size: number) => void): void;
  onExportSvg(cb: (size: number) => void): void;
}

/** 构建顶部工具栏 + 左侧控件面板 + 右侧画布容器，返回面板 API */
export function buildPanel(root: HTMLElement, canvas: HTMLCanvasElement): PanelApi {
  // ---- 顶部水平工具栏（显示/动画/导出等与图形参数无关的功能）----
  const toolbarEl = document.createElement('header');
  toolbarEl.className = 'toolbar';
  toolbarEl.innerHTML = `
    <div class="toolbar-brand">
      <span class="brand-title">🌀 Spirograph</span>
      <span class="brand-sub" data-i18n="appTitleSub">Generator</span>
    </div>

    <div class="toolbar-group">
      <button class="btn btn-ghost toolbar-btn toolbar-play" id="anim-mode" data-i18n-title="animModeTitle"><i class="fa-solid fa-film"></i></button>
      <button class="btn btn-ghost toolbar-btn" id="settings-btn" data-i18n-title="settingsTitle"><i class="fa-solid fa-gear"></i></button>
    </div>

    <div class="toolbar-group">
      <button class="btn btn-ghost toolbar-btn" id="export-png" data-i18n-title="exportPngTitle">PNG</button>
      <button class="btn btn-ghost toolbar-btn" id="export-svg" data-i18n-title="exportSvgTitle">SVG</button>
      <button class="btn btn-ghost toolbar-btn" id="copy-image-link" data-i18n-title="copyImageLinkTitle"><i class="fa-solid fa-link"></i></button>
      <button class="btn btn-ghost toolbar-btn" id="random" data-i18n-title="randomTitle"><i class="fa-solid fa-shuffle"></i></button>
    </div>

    <div class="toolbar-group toolbar-group-lang">
      <div class="lang-seg" id="lang-seg">
        <button data-lang="en" class="active">EN</button>
        <button data-lang="zh">中文</button>
      </div>
    </div>
  `;

  // ---- 左侧面板（仅图形参数）----
  const panelEl = document.createElement('aside');
  panelEl.className = 'panel';
  panelEl.innerHTML = `
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
      <div class="pens-tabs" id="pens-tabs"></div>
      <div class="pens" id="pens"></div>
    </section>

    <section>
      <div class="section-title" data-i18n="sectionPresets">Presets</div>
      <div class="chips" id="preset-chips"></div>
    </section>

    <section class="info">
      <div><span data-i18n="infoRatio">Ratio</span> <b id="info-ratio">–</b> · <span data-i18n="infoPetals">Petals</span> <b id="info-petals">–</b> · <span data-i18n="infoTurns">Turns</span> <b id="info-turns">–</b></div>
      <div id="info-samples-row">–</div>
    </section>
  `;

  const stage = document.createElement('main');
  stage.className = 'stage';
  stage.appendChild(canvas);

  // ---- 画布右下角浮动工具栏（动画模式：播放/暂停 + 速度 + 退出）----
  const animFloat = document.createElement('div');
  animFloat.className = 'anim-float';
  animFloat.hidden = true;
  animFloat.innerHTML = `
    <button class="anim-float-play" id="float-play" data-i18n-title="playTitle"><i class="fa-solid fa-play"></i></button>
    <button class="anim-float-btn" id="speed-down" data-i18n-title="speedDownTitle"><i class="fa-solid fa-minus"></i></button>
    <span class="anim-float-speed" id="float-speed">1×</span>
    <button class="anim-float-btn" id="speed-up" data-i18n-title="speedUpTitle"><i class="fa-solid fa-plus"></i></button>
    <button class="anim-float-btn anim-float-exit" id="anim-exit" data-i18n-title="animModeExitTitle"><i class="fa-solid fa-xmark"></i></button>
  `;
  stage.appendChild(animFloat);

  const workspace = document.createElement('div');
  workspace.className = 'workspace';
  workspace.appendChild(panelEl);
  workspace.appendChild(stage);

  root.appendChild(toolbarEl);
  root.appendChild(workspace);

  // ---- 设置 modal（画布相关设置：背景色 / 显示齿轮 / 图片尺寸）----
  const settingsModal = document.createElement('div');
  settingsModal.className = 'settings-modal';
  settingsModal.hidden = true;
  settingsModal.innerHTML = `
    <div class="settings-modal-card">
      <div class="settings-modal-head">
        <span data-i18n="settingsTitle">Settings</span>
        <button class="settings-modal-close" id="settings-close" data-i18n-title="settingsCloseTitle"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="settings-modal-body">
        <div class="settings-row">
          <span class="settings-label" data-i18n="canvasBackground">Canvas background</span>
          <input type="color" id="bg">
        </div>
        <label class="settings-row settings-check">
          <span class="settings-label" data-i18n="showGears">Show gears (pens drawn in sequence)</span>
          <input type="checkbox" id="show-gears">
        </label>
        <div class="settings-row settings-row-scale">
          <span class="settings-label" data-i18n="sectionScale">Canvas Scale</span>
          <div class="seg settings-seg" id="scale-seg">
            <button data-scale="auto" class="active" data-i18n="scaleAuto" data-i18n-title="scaleAutoTitle">Fixed image</button>
            <button data-scale="fixed" data-i18n="scaleFixed" data-i18n-title="scaleFixedTitle">Fixed ring</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label" data-i18n="imgSize">Image size</span>
          <select id="img-size" class="size-select">
            <option value="512">512×512</option>
            <option value="1000">1000×1000</option>
            <option value="2048" selected>2048×2048</option>
            <option value="4096">4096×4096</option>
          </select>
        </div>
      </div>
    </div>
  `;
  root.appendChild(settingsModal);

  // ---- 元素引用 ----
  const $panel = <T extends HTMLElement>(id: string): T => panelEl.querySelector('#' + id) as T;
  const $toolbar = <T extends HTMLElement>(id: string): T => toolbarEl.querySelector('#' + id) as T;
  const ringSlider = $panel<HTMLInputElement>('ring');
  const rollingSlider = $panel<HTMLInputElement>('rolling');
  const ringVal = $panel('ring-val');
  const rollingVal = $panel('rolling-val');
  const settingsBtn = $toolbar<HTMLButtonElement>('settings-btn');
  const pensTabsEl = $panel('pens-tabs');
  const pensEl = $panel('pens');
  const ringChipsEl = $panel('ring-chips');
  const rollingChipsEl = $panel('rolling-chips');
  const presetChipsEl = $panel('preset-chips');
  const playBtn = $toolbar<HTMLButtonElement>('anim-mode');
  const randomBtn = $toolbar<HTMLButtonElement>('random');
  const exportPngBtn = $toolbar<HTMLButtonElement>('export-png');
  const exportSvgBtn = $toolbar<HTMLButtonElement>('export-svg');
  const copyLinkBtn = $toolbar<HTMLButtonElement>('copy-image-link');
  const infoRatio = $panel('info-ratio');
  const infoPetals = $panel('info-petals');
  const infoTurns = $panel('info-turns');
  const infoSamplesRow = $panel('info-samples-row');
  const langSeg = $toolbar<HTMLElement>('lang-seg');
  // 设置 modal
  const $modal = <T extends HTMLElement>(id: string): T => settingsModal.querySelector('#' + id) as T;
  const bgColor = $modal<HTMLInputElement>('bg');
  const gearsCheck = $modal<HTMLInputElement>('show-gears');
  const imgSizeSelect = $modal<HTMLSelectElement>('img-size');
  const settingsCloseBtn = $modal<HTMLButtonElement>('settings-close');
  // 浮动工具栏（动画模式）
  const floatPlayBtn = animFloat.querySelector<HTMLButtonElement>('#float-play')!;
  const speedDownBtn = animFloat.querySelector<HTMLButtonElement>('#speed-down')!;
  const speedUpBtn = animFloat.querySelector<HTMLButtonElement>('#speed-up')!;
  const floatSpeedVal = animFloat.querySelector<HTMLElement>('#float-speed')!;
  const animExitBtn = animFloat.querySelector<HTMLButtonElement>('#anim-exit')!;

  // ---- 回调（由 main 注入）----
  let onPlay: () => void = () => {};
  let onRandom: () => void = () => {};
  let onPng: (size: number) => void = () => {};
  let onSvg: (size: number) => void = () => {};
  let onAnimMode: (active: boolean) => void = () => {};

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
        activePenIndex = 0; // 整体替换 → 焦点回第一个
        setPens(p.pens.map((pp) => ({ hole: pp.hole, colors: [...pp.colors], spacing: 20, width: pp.width })));
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
  const scaleButtons = settingsModal.querySelectorAll<HTMLButtonElement>('#scale-seg button');
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
  gearsCheck.addEventListener('change', () => setState({ showGears: gearsCheck.checked }));

  // ---- 笔列表 ----
  // 笔的 id 集合（结构指纹）：setPens/预设/随机/URL 整体替换时重建卡片，
  // 单纯值变化（拖动滑块）不重建，保证拖动流畅
  let lastPenIds = '';
  let activePenIndex = 0;

  /** 渲染笔标签页 + 当前笔卡片（tab view） */
  function renderPens(): void {
    const s = getState();
    const pens = s.pens;
    if (pens.length === 0) return;
    // 焦点越界（如删除）时回退
    if (activePenIndex >= pens.length) activePenIndex = pens.length - 1;
    if (activePenIndex < 0) activePenIndex = 0;

    // ---- 标签行：各笔 + 添加 ----
    pensTabsEl.innerHTML = '';
    pens.forEach((pen, idx) => {
      const tab = document.createElement('button');
      tab.className = 'pen-tab' + (idx === activePenIndex ? ' active' : '');
      tab.innerHTML = `<span class="pen-tab-dot" style="background:${pen.colors[0] ?? '#888'}"></span>${t('penLabel', { n: idx + 1 })}`;
      tab.addEventListener('click', () => {
        if (idx !== activePenIndex) {
          activePenIndex = idx;
          renderPens();
        }
      });
      pensTabsEl.appendChild(tab);
    });
    // 添加笔标签
    const addTab = document.createElement('button');
    addTab.className = 'pen-tab pen-tab-add';
    addTab.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addTab.title = t('addPenTitle');
    addTab.addEventListener('click', () => {
      activePenIndex = getState().pens.length; // 新笔追加在末尾
      addPen();
    });
    pensTabsEl.appendChild(addTab);

    // ---- 当前笔卡片 ----
    pensEl.innerHTML = '';
    pensEl.appendChild(buildPenCard(pens[activePenIndex], activePenIndex + 1));
  }

  function buildPenCard(pen: Pen, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'pen-card';
    card.innerHTML = `
      <div class="pen-head">
        <span class="pen-dot" style="background:${pen.colors[0] ?? '#888'}"></span>
        <span class="grow">${t('penLabel', { n: index })}</span>
        <button class="pen-del" title="${t('penDelete')}"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="row-label"><span>${t('penHole')}</span><span class="val">${pen.hole}%</span></div>
      <input type="range" class="pen-hole" min="0" max="100" step="1" value="${pen.hole}">
      <div class="pen-row">
        <span class="row-label" style="flex:1"><span>${t('penColors')}</span></span>
        <div class="pen-grad-colors"></div>
        <button class="pen-grad-add" title="${t('addColor')}" disabled="true"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div class="pen-grad-opts">
        <div class="row-label"><span>${t('penGradSpacing')}</span><span class="val">${pen.spacing}%</span></div>
        <input type="range" class="pen-grad-spacing" min="1" max="100" step="1" value="${pen.spacing}">
      </div>
      <div class="row-label"><span>${t('penWidth')}</span><span class="val">${pen.width}</span></div>
      <input type="range" class="pen-width" min="0.5" max="8" step="0.5" value="${pen.width}">
    `;
    const holeSlider = card.querySelector<HTMLInputElement>('.pen-hole')!;
    const widthSlider = card.querySelector<HTMLInputElement>('.pen-width')!;
    const dot = card.querySelector<HTMLElement>('.pen-dot')!;
    const holeVal = card.querySelectorAll<HTMLElement>('.row-label .val')[0];
    const widthVal = card.querySelectorAll<HTMLElement>('.row-label .val')[1];

    holeSlider.addEventListener('input', () => {
      setPen(pen.id, { hole: Math.round(+holeSlider.value) });
      holeVal.textContent = holeSlider.value + '%';
    });
    widthSlider.addEventListener('input', () => {
      setPen(pen.id, { width: +widthSlider.value });
      widthVal.textContent = widthSlider.value;
    });

    // ---- 颜色列表（1 个 = 单色；≥ 2 个 = 渐变）----
    const gradAdd = card.querySelector<HTMLButtonElement>('.pen-grad-add')!;
    const gradOpts = card.querySelector<HTMLElement>('.pen-grad-opts')!;
    const gradSpacing = card.querySelector<HTMLInputElement>('.pen-grad-spacing')!;
    const gradColorsEl = card.querySelector<HTMLElement>('.pen-grad-colors')!;
    const gradSpacingVal = gradOpts.querySelector('.row-label .val') as HTMLElement;

    function currentColors(): string[] {
      return getState().pens.find((p) => p.id === pen.id)?.colors ?? pen.colors;
    }

    /** 渲染颜色槽列表（1-4 个颜色）：≥2 个才显示删除与间隔 */
    function renderColors(): void {
      const cs = currentColors();
      gradOpts.classList.toggle('show', cs.length > 1);
      gradAdd.disabled = cs.length >= 4;
      gradAdd.innerHTML = cs.length >= 4 ? '4' : '<i class="fa-solid fa-plus"></i>';
      gradColorsEl.innerHTML = '';
      cs.forEach((c, idx) => {
        const slot = document.createElement('div');
        slot.className = 'pen-grad-slot';
        const swatch = document.createElement('input');
        swatch.type = 'color';
        swatch.value = c;
        swatch.title = t('gradSlotTitle', { n: idx + 1 });
        swatch.addEventListener('input', () => {
          setPen(pen.id, { colors: currentColors().map((x, i) => (i === idx ? swatch.value : x)) });
          // 首色 → 更新笔头圆点
          if (idx === 0) dot.style.background = swatch.value;
        });
        const del = document.createElement('button');
        del.className = 'pen-grad-del';
        del.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        del.style.display = cs.length <= 1 ? 'none' : 'inline-block';
        del.addEventListener('click', () => {
          // 删除后至少保留 1 个颜色（少于 2 个即回到单色）
          setPen(pen.id, { colors: currentColors().filter((_, i) => i !== idx) });
          renderColors();
        });
        slot.appendChild(swatch);
        slot.appendChild(del);
        gradColorsEl.appendChild(slot);
      });
    }

    gradAdd.addEventListener('click', () => {
      const cur = currentColors();
      if (cur.length >= 4) return;
      const last = cur[cur.length - 1];
      setPen(pen.id, { colors: [...cur, nextGradientColor(last)] });
      renderColors();
    });
    gradSpacing.addEventListener('input', () => {
      const v = Math.round(+gradSpacing.value);
      setPen(pen.id, { spacing: v });
      gradSpacingVal.textContent = v + '%';
      const spacingVal = getState().pens.find((p) => p.id === pen.id)?.spacing;
      gradSpacing.value = String(spacingVal ?? v);
    });
    renderColors();
    card.querySelector<HTMLButtonElement>('.pen-del')!.addEventListener('click', () => {
      removePen(pen.id);
    });
    return card;
  }

  // ---- 操作按钮 ----
  // 动画模式开关：切入后画布右下角出现浮动工具栏
  let animModeActive = false;
  function setAnimMode(active: boolean): void {
    if (animModeActive === active) return;
    animModeActive = active;
    playBtn.classList.toggle('active', active);
    playBtn.title = t(active ? 'animModeExitTitle' : 'animModeTitle');
    animFloat.hidden = !active;
    onAnimMode(active);
  }
  playBtn.addEventListener('click', () => setAnimMode(!animModeActive));

  // 浮动工具栏：播放/暂停
  floatPlayBtn.addEventListener('click', () => onPlay());
  // 速度 −/+（步进 0.5，范围 0.1-10，保留 1 位小数）
  function nudgeSpeed(delta: number): void {
    const s = getState();
    const next = Math.min(10, Math.max(0.1, Math.round((s.speed + delta) * 10) / 10));
    setState({ speed: next });
  }
  speedDownBtn.addEventListener('click', () => nudgeSpeed(-0.5));
  speedUpBtn.addEventListener('click', () => nudgeSpeed(0.5));
  // 退出动画模式
  animExitBtn.addEventListener('click', () => setAnimMode(false));

  // ---- 设置 modal：打开/关闭 ----
  function openSettings(): void {
    settingsModal.hidden = false;
    settingsBtn.classList.add('active');
  }
  function closeSettings(): void {
    settingsModal.hidden = true;
    settingsBtn.classList.remove('active');
  }
  settingsBtn.addEventListener('click', () => (settingsModal.hidden ? openSettings() : closeSettings()));
  settingsCloseBtn.addEventListener('click', closeSettings);
  // 点遮罩（modal 本体）关闭
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });
  // Esc 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsModal.hidden) closeSettings();
  });

  randomBtn.addEventListener('click', () => {
    activePenIndex = 0; // 随机整体替换 → 焦点回第一个
    onRandom();
  });
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
    copyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => {
      copyLinkBtn.innerHTML = '<i class="fa-solid fa-link"></i>';
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
    floatSpeedVal.textContent = s.speed + '×';
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
    // 静态文案（工具栏 + 面板 + 浮动工具栏 + 设置 modal）
    [toolbarEl, panelEl, animFloat, settingsModal].forEach((scope) => {
      scope.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
        const key = el.dataset.i18n as I18nKey | undefined;
        if (key) el.textContent = t(key);
      });
      scope.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
        const key = el.dataset.i18nTitle as I18nKey | undefined;
        if (key) el.title = t(key);
      });
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
    // 动画模式按钮 title 按当前状态
    playBtn.title = t(animModeActive ? 'animModeExitTitle' : 'animModeTitle');
    // 复制链接按钮图标复位（FA）
    copyLinkBtn.innerHTML = '<i class="fa-solid fa-link"></i>';
    // 信息区
    renderInfoSamples();
    // 文档标题
    document.title = 'Spirograph ' + t('appTitleSub');
  }
  function setPlayingUI(playing: boolean, paused = false): void {
    playState = { playing, paused };
    // 浮动工具栏播放按钮（Font Awesome 图标）
    floatPlayBtn.innerHTML = !playing || paused
      ? '<i class="fa-solid fa-play"></i>'
      : '<i class="fa-solid fa-pause"></i>';
    floatPlayBtn.title = !playing ? t('playTitle') : paused ? t('resumeTitle') : t('pauseTitle');
    floatPlayBtn.classList.toggle('playing', playing);
  }

  subscribe(syncControls);
  subscribeLang(localize);
  renderPresetChips();
  syncControls(); // 首次同步会重建笔卡片（lastPenIds 为空）
  localize(); // 应用当前语言（默认英文）

  return {
    setPlayingUI,
    onAnimationMode(cb: (active: boolean) => void) { onAnimMode = cb; },
    onPlayRequest(cb: () => void) { onPlay = cb; },
    onRandomRequest(cb: () => void) { onRandom = cb; },
    onExportPng(cb: (size: number) => void) { onPng = cb; },
    onExportSvg(cb: (size: number) => void) { onSvg = cb; },
  };
}