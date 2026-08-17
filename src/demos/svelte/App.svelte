<script lang="ts">
  import RenderDemo from './RenderDemo.svelte';
  import AnimatedDemo from './AnimatedDemo.svelte';

  const base = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL ?? './';
  const code = (s: string): string => s;
</script>

<nav class="docs-nav">
  <div class="docs-brand">
    <span>🌀 Spirograph</span>
    <span class="tag tag-svelte">Svelte</span>
  </div>
  <div class="docs-links">
    <a href="#demos">Demos</a>
    <a href="#features">Features</a>
    <a href="#install">Install</a>
    <a href="#api">API</a>
  </div>
  <a class="docs-source" href="{base}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Spirograph Generator</a>
</nav>

<header class="docs-hero">
  <h1>Spirograph <span class="grad">for Svelte</span></h1>
  <p class="lead">
    A render-only <code>&lt;SpirographCanvas&gt;</code> and an animated, controllable
    <code>&lt;SpirographAnimated&gt;</code> — thin Svelte 5 components on
    <code>@spirograph/core</code>, with no extra animation cost unless you opt in.
  </p>
  <div class="docs-badges">
    <a href="#install"><i class="fa-brands fa-npm"></i> @spirograph/svelte</a>
    <a href="#demos"><i class="fa-solid fa-play"></i> Live demo</a>
    <a href="#api"><i class="fa-solid fa-book"></i> API</a>
  </div>
  <div class="docs-cta">
    <a class="btn btn-primary" href="#demos"><i class="fa-solid fa-bolt"></i> Try the demo</a>
    <a class="btn btn-ghost" href="#install"><i class="fa-solid fa-download"></i> Install</a>
  </div>
</header>

<section id="demos" class="docs-section anchor">
  <h2>Live demos</h2>
  <p class="sub">
    Two components for two needs: static renders with export, or a controllable drawing animation.
    Use the sliders and buttons to explore — everything is generated in the browser.
  </p>
  <div class="demo-grid">
    <RenderDemo />
    <AnimatedDemo />
  </div>
</section>

<section id="features" class="docs-section anchor">
  <h2>Features</h2>
  <p class="sub">Everything is powered by the pure, dependency-light <code>@spirograph/core</code> engine.</p>
  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon"><i class="fa-solid fa-circle-notch"></i></div>
      <h3>Two component layers</h3>
      <p>Render-only canvas (no timers) and an animated canvas — pick the complexity you need.</p>
    </div>
    <div class="feature-card">
      <div class="icon"><i class="fa-solid fa-palette"></i></div>
      <h3>Multi-pen & gradients</h3>
      <p>Stack any number of pens with solid or multi-color gradient strokes.</p>
    </div>
    <div class="feature-card">
      <div class="icon"><i class="fa-solid fa-film"></i></div>
      <h3>Controllable animation</h3>
      <p>Play / pause / resume / stop and speed control via a simple control object.</p>
    </div>
    <div class="feature-card">
      <div class="icon"><i class="fa-solid fa-image"></i></div>
      <h3>Export</h3>
      <p>High-res PNG and SVG export straight from the component handle.</p>
    </div>
    <div class="feature-card">
      <div class="icon"><i class="fa-solid fa-gears"></i></div>
      <h3>Gear system</h3>
      <p>Optional realistic gear mesh overlay during animation (inside / outside modes).</p>
    </div>
    <div class="feature-card">
      <div class="icon"><i class="fa-solid fa-link"></i></div>
      <h3>URL sharing</h3>
      <p>Same query-string params as the vanilla app through <code>@spirograph/core</code>.</p>
    </div>
  </div>
</section>

<section id="install" class="docs-section anchor">
  <h2>Install</h2>
  <p class="sub">Requires Svelte 5. Peer-dependency on <code>@spirograph/core</code> + <code>@spirograph/canvas</code>.</p>
  <div class="code-block"><pre>{code(`npm i @spirograph/svelte`)}</pre></div>
  <div class="code-block"><pre>{code(`<script lang="ts">
  import { SpirographCanvas, SpirographAnimated } from '@spirograph/svelte';
  import { DEFAULT_STATE } from '@spirograph/core';

  let control = {};

  function savePng() { control.exportPng?.(); }
</script>

<div style="width:480px;height:480px">
  <SpirographCanvas state={DEFAULT_STATE} {control} />
</div>
<button on:click={savePng}>PNG</button>`)}</pre></div>
</section>

<section id="api" class="docs-section anchor">
  <h2>API</h2>
  <p class="sub">Components accept an <code>AppState</code> and an optional mutable <code>control</code> object that the component fills with methods.</p>
  <table class="api-table">
    <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Note</th></tr></thead>
    <tbody>
      <tr><td><code>state</code></td><td><code>AppState</code></td><td>—</td><td>drawing state (see <code>@spirograph/core</code>)</td></tr>
      <tr><td><code>control</code></td><td><code>SpirographControl</code></td><td>—</td><td>filled with <code>exportPng</code> / <code>exportSvg</code> (animated also <code>play/pause/resume/stop/setSpeed</code>)</td></tr>
      <tr><td><code>playMode</code></td><td><code>'sequential' | 'simultaneous'</code></td><td><code>sequential</code></td><td>one pen at a time / all together (animated)</td></tr>
      <tr><td><code>baseDurationMs</code></td><td><code>number?</code></td><td>derived</td><td>animation duration (constant pen speed by default)</td></tr>
      <tr><td><code>segmentsPerSecond</code></td><td><code>number?</code></td><td><code>350</code></td><td>target speed when duration is derived</td></tr>
      <tr><td><code>onDone</code></td><td><code>() =&gt; void?</code></td><td>—</td><td>fired when the animation completes</td></tr>
    </tbody>
  </table>
</section>

<footer class="docs-footer">
  <p>Spirograph Generator · <a href="{base}">主生成器</a> · <a href="https://github.com/leiwan5/svelte-gallery-view" target="_blank" rel="noreferrer">svelte-gallery-view</a> style documentation page</p>
</footer>
