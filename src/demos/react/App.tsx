import { RenderDemo } from './RenderDemo';
import { AnimatedDemo } from './AnimatedDemo';

const base = import.meta.env.BASE_URL ?? './';

export function App() {
  return (
    <>
      <nav className="docs-nav">
        <div className="docs-brand">
          <span>🌀 Spirograph</span>
          <span className="tag tag-react">React</span>
        </div>
        <div className="docs-links">
          <a href="#demos">Demos</a>
          <a href="#features">Features</a>
          <a href="#install">Install</a>
          <a href="#api">API</a>
        </div>
        <a className="docs-source" href={base}>
          <i className="fa-solid fa-arrow-up-right-from-square" /> Spirograph Generator
        </a>
      </nav>

      <header className="docs-hero">
        <h1>
          Spirograph <span className="grad">for React</span>
        </h1>
        <p className="lead">
          A render-only <code>&lt;SpirographCanvas&gt;</code> and an animated, controllable{' '}
          <code>&lt;SpirographAnimated&gt;</code> — thin React components on{' '}
          <code>@spirograph/core</code>, with no extra animation cost unless you opt in.
        </p>
        <div className="docs-badges">
          <a href="#install">
            <i className="fa-brands fa-npm" /> @spirograph/react
          </a>
          <a href="#demos">
            <i className="fa-solid fa-play" /> Live demo
          </a>
          <a href="#api">
            <i className="fa-solid fa-book" /> API
          </a>
        </div>
        <div className="docs-cta">
          <a className="btn btn-primary" href="#demos">
            <i className="fa-solid fa-bolt" /> Try the demo
          </a>
          <a className="btn btn-ghost" href="#install">
            <i className="fa-solid fa-download" /> Install
          </a>
        </div>
      </header>

      <section id="demos" className="docs-section anchor">
        <h2>Live demos</h2>
        <p className="sub">
          Two components for two needs: static renders with export, or a controllable drawing
          animation. Use the sliders and buttons to explore — everything is generated in the browser.
        </p>
        <div className="demo-grid">
          <RenderDemo />
          <AnimatedDemo />
        </div>
      </section>

      <section id="features" className="docs-section anchor">
        <h2>Features</h2>
        <p className="sub">Everything is powered by the pure, dependency-light <code>@spirograph/core</code> engine.</p>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-circle-notch" /></div>
            <h3>Two component layers</h3>
            <p>Render-only canvas (no timers) and an animated canvas — pick the complexity you need.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-palette" /></div>
            <h3>Multi-pen & gradients</h3>
            <p>Stack any number of pens with solid or multi-color gradient strokes.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-film" /></div>
            <h3>Controllable animation</h3>
            <p>Play / pause / resume / stop and speed control via the ref handle.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-image" /></div>
            <h3>Export</h3>
            <p>High-res PNG and SVG export straight from the component handle.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-gears" /></div>
            <h3>Gear system</h3>
            <p>Optional realistic gear mesh overlay during animation (inside / outside modes).</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-link" /></div>
            <h3>URL sharing</h3>
            <p>Same query-string params as the vanilla app through <code>@spirograph/core</code>.</p>
          </div>
        </div>
      </section>

      <section id="install" className="docs-section anchor">
        <h2>Install</h2>
        <p className="sub">Requires React 18+. Peer-dependency on <code>@spirograph/core</code> + <code>@spirograph/canvas</code>.</p>
        <div className="code-block"><pre>{'npm i @spirograph/react'}</pre></div>
        <div className="code-block">
          <pre>{`import { useRef } from 'react';
import { SpirographCanvas } from '@spirograph/react';
import { DEFAULT_STATE } from '@spirograph/core';

export default function App() {
  const ref = useRef(null);
  return (
    <div style={{ width: 480, height: 480 }}>
      <SpirographCanvas ref={ref} state={DEFAULT_STATE} />
      <button onClick={() => ref.current?.exportPng()}>PNG</button>
    </div>
  );
}`}</pre>
        </div>
      </section>

      <section id="api" className="docs-section anchor">
        <h2>API</h2>
        <p className="sub">
          Components accept an <code>SpirographState</code>; the ref handle exposes exports (and, for the
          animated component, <code>play/pause/resume/stop/setSpeed</code>).
        </p>
        <table className="api-table">
          <thead>
            <tr><th>Prop</th><th>Type</th><th>Default</th><th>Note</th></tr>
          </thead>
          <tbody>
            <tr><td><code>state</code></td><td><code>SpirographState</code></td><td>—</td><td>drawing state (see <code>@spirograph/core</code>)</td></tr>
            <tr><td><code>playMode</code></td><td><code>'sequential' | 'simultaneous'</code></td><td><code>sequential</code></td><td>one pen at a time / all together (animated)</td></tr>
            <tr><td><code>baseDurationMs</code></td><td><code>number?</code></td><td>derived</td><td>animation duration (constant pen speed by default)</td></tr>
            <tr><td><code>segmentsPerSecond</code></td><td><code>number?</code></td><td><code>350</code></td><td>target speed when duration is derived</td></tr>
            <tr><td><code>onDone</code></td><td><code>() =&gt; void?</code></td><td>—</td><td>fired when the animation completes</td></tr>
            <tr><td><code>onPlayingChange</code></td><td><code>(playing) =&gt; void?</code></td><td>—</td><td>fired when play state flips</td></tr>
          </tbody>
        </table>

        <div className="api-struct">
          <h3>SpirographState</h3>
          <p className="sub">The single <code>state</code> prop fully describes the pattern to draw.</p>
          <table className="api-table">
            <thead>
              <tr><th>Field</th><th>Type</th><th>Note</th></tr>
            </thead>
            <tbody>
              <tr><td><code>mode</code></td><td><code>'inside' | 'outside'</code></td><td><code>inside</code> = hypotrochoid inside the ring · <code>outside</code> = epitrochoid around the ring</td></tr>
              <tr><td><code>ringTeeth</code></td><td><code>number</code></td><td>ring gear teeth (40–240)</td></tr>
              <tr><td><code>rollingTeeth</code></td><td><code>number</code></td><td>rolling gear teeth (8–96, <code>inside</code> requires &lt; <code>ringTeeth</code>)</td></tr>
              <tr><td><code>pens</code></td><td><code>Pen[]</code></td><td>stacked pens: <code>hole</code> (0–100% of rolling radius), <code>colors</code> (1 = solid, ≥2 = gradient), <code>width</code>, <code>spacing</code></td></tr>
              <tr><td><code>background</code></td><td><code>string</code></td><td>canvas background color (e.g. <code>'#ffffff'</code>)</td></tr>
              <tr><td><code>speed</code></td><td><code>number</code></td><td>animation speed multiplier 0.1–10</td></tr>
              <tr><td><code>scaleMode</code></td><td><code>'auto' | 'fixed'</code></td><td><code>auto</code> = fit the joint bounding box · <code>fixed</code> = fixed ring size</td></tr>
              <tr><td><code>showGears</code></td><td><code>boolean</code></td><td>show the gear mesh during animation</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="docs-footer">
        <p>
          Spirograph Generator · <a href={base}>Spirograph Generator</a> ·{' '}
          <a href="https://github.com/leiwan5/svelte-gallery-view" target="_blank" rel="noreferrer">
            svelte-gallery-view
          </a>{' '}
          style documentation page
        </p>
      </footer>
    </>
  );
}
