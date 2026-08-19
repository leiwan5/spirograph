import { SnackEmbed } from './SnackEmbed';

const base = import.meta.env.BASE_URL ?? './';
const GITHUB_URL = 'https://github.com/leiwan5/spirograph';
const NPM_URL = 'https://www.npmjs.com/package/@spirograph/react-native';

export function App() {
  return (
    <>
      <nav className="docs-nav">
        <div className="docs-brand">
          <span>🌀 Spirograph</span>
          <span className="tag tag-rn">React&nbsp;Native</span>
        </div>
        <div className="docs-links">
          <a href="#demos">Demo</a>
          <a href="#features">Features</a>
          <a href="#install">Install</a>
          <a href="#run">Run</a>
          <a href="#api">API</a>
        </div>
        <div className="docs-external">
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            <i className="fa-brands fa-npm" /> npm
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <i className="fa-brands fa-github" /> GitHub
          </a>
        </div>
        <a className="docs-source" href={base}>
          <i className="fa-solid fa-arrow-up-right-from-square" /> Spirograph Generator
        </a>
      </nav>

      <header className="docs-hero">
        <h1>
          Spirograph <span className="grad">for React Native</span>
        </h1>
        <p className="lead">
          A render-only <code>&lt;SpirographSvg&gt;</code> and an animated, controllable{' '}
          <code>&lt;SpirographAnimated&gt;</code> — React Native components on{' '}
          <code>react-native-svg</code>, powered by the same pure <code>@spirograph/core</code>{' '}
          math as every other platform.
        </p>
        <div className="docs-badges">
          <a href="#install">
            <i className="fa-brands fa-npm" /> @spirograph/react-native
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
          <a className="btn btn-ghost" href="#run">
            <i className="fa-solid fa-mobile-screen" /> Run in Expo Go
          </a>
        </div>
      </header>

      <section id="demos" className="docs-section anchor">
        <h2>Live demo</h2>
        <p className="sub">
          This demo is the <code>apps/expo-demo</code> app, embedded as an{' '}
          <strong>Expo Snack</strong>. Run it right here in the browser, or use the Snack embed's
          platform switch to open it in <strong>Expo Go</strong> on your phone.
        </p>
        <SnackEmbed />
      </section>

      <section id="features" className="docs-section anchor">
        <h2>Features</h2>
        <p className="sub">
          The same core engine as the web libraries, rendered with{' '}
          <code>react-native-svg</code> — so mobile output matches the browser exactly.
        </p>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-palette" /></div>
            <h3>Multi-pen &amp; gradients</h3>
            <p>Stack any number of pens with solid or multi-color gradient strokes, resolved identically across platforms.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-film" /></div>
            <h3>Controllable animation</h3>
            <p>Play / pause / resume / stop and speed control through the ref handle, driven by @spirograph/anim.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-gears" /></div>
            <h3>Gear system</h3>
            <p>Optional gear mesh overlay (inside / outside modes) drawn as SVG with the rolling gear animation.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-lines-leaning" /></div>
            <h3>Sequential / simultaneous</h3>
            <p>Draw one pen at a time (weighted by curve length) or all pens together.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-weight-hanging" /></div>
            <h3>Dependency-light</h3>
            <p>Only <code>@spirograph/core</code> + <code>@spirograph/anim</code> at runtime, with <code>react-native-svg</code> as a peer.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><i className="fa-solid fa-mobile-screen" /></div>
            <h3>Expo demo included</h3>
            <p>A ready <code>apps/expo-demo</code> app you can run locally or publish as a Snack.</p>
          </div>
        </div>
      </section>

      <section id="install" className="docs-section anchor">
        <h2>Install</h2>
        <p className="sub">
          Requires React 18+, React Native 0.72+ and <code>react-native-svg</code> 15+ (peer deps).
        </p>
        <div className="code-block"><pre>{'npm i @spirograph/react-native react-native-svg'}</pre></div>
        <div className="code-block">
          <pre>{`import { SpirographSvg } from '@spirograph/react-native';
import { DEFAULT_STATE } from '@spirograph/core';

export default function App() {
  return (
    <SpirographSvg
      state={DEFAULT_STATE}
      size={{ width: 320, height: 320 }}
      showGears
    />
  );
}`}</pre>
        </div>
      </section>

      <section id="run" className="docs-section anchor">
        <h2>Run the Expo demo</h2>
        <p className="sub">Clone the repo, build the packages, and start the Expo app.</p>
        <div className="code-block">
          <pre>{`npm run build:packages       # builds @spirograph/core … @spirograph/react-native
cd apps/expo-demo
npx expo start             # print the QR to open in Expo Go
npx expo start --web       # or run the same app in the browser (react-native-web)`}</pre>
        </div>
        <p className="sub" style={{ marginTop: 14 }}>
          You can also embed this demo on any site by publishing <code>apps/expo-demo/snack</code> as
          a public <a href="https://snack.expo.dev" target="_blank" rel="noreferrer">Expo Snack</a> and
          dropping its id into <code>src/demos/react-native/snackConfig.ts</code>.
        </p>
      </section>

      <section id="api" className="docs-section anchor">
        <h2>API</h2>
        <p className="sub">
          Components accept a <code>SpirographState</code> and an explicit <code>size</code>; the
          animated component's ref exposes <code>play/pause/resume/stop/setSpeed</code>.
        </p>
        <table className="api-table">
          <thead>
            <tr><th>Component</th><th>Ref handle</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td><code>SpirographSvg</code></td><td>—</td><td>render-only view of the finished pattern</td></tr>
            <tr><td><code>SpirographAnimated</code></td><td><code>SpirographAnimationHandle</code></td><td>animated + controllable drawing</td></tr>
          </tbody>
        </table>

        <table className="api-table" style={{ marginTop: 22 }}>
          <thead>
            <tr><th>Prop</th><th>Type</th><th>Default</th><th>Note</th></tr>
          </thead>
          <tbody>
            <tr><td><code>state</code></td><td><code>SpirographState</code></td><td>—</td><td>drawing state (see <code>@spirograph/core</code>)</td></tr>
            <tr><td><code>size</code></td><td><code>{'{ width, height }'}</code></td><td>—</td><td>SVG viewport size in dp</td></tr>
            <tr><td><code>showGears</code></td><td><code>boolean</code></td><td><code>false</code></td><td>overlay the gear mesh beneath the curve</td></tr>
            <tr><td><code>playMode</code></td><td><code>'sequential' | 'simultaneous'</code></td><td><code>sequential</code></td><td>one pen at a time / all together (animated)</td></tr>
            <tr><td><code>baseDurationMs</code></td><td><code>number?</code></td><td>derived</td><td>animation duration (constant pen speed by default)</td></tr>
            <tr><td><code>segmentsPerSecond</code></td><td><code>number?</code></td><td><code>350</code></td><td>target speed when duration is derived</td></tr>
            <tr><td><code>onDone</code></td><td><code>() =&gt; void?</code></td><td>—</td><td>fired when the animation completes</td></tr>
            <tr><td><code>onPlayingChange</code></td><td><code>(playing) =&gt; void?</code></td><td>—</td><td>fired when play state flips</td></tr>
            <tr><td><code>testID</code></td><td><code>string?</code></td><td>—</td><td>test id for the <code>&lt;Svg&gt;</code></td></tr>
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
              <tr><td><code>pens</code></td><td><code>Pen[]</code></td><td>stacked pens: <code>hole</code> (0–100%), <code>colors</code> (1 = solid, ≥2 = gradient), <code>width</code>, <code>spacing</code></td></tr>
              <tr><td><code>background</code></td><td><code>string</code></td><td>background color (e.g. <code>'#111827'</code>)</td></tr>
              <tr><td><code>speed</code></td><td><code>number</code></td><td>animation speed multiplier 0.1–10</td></tr>
              <tr><td><code>scaleMode</code></td><td><code>'auto' | 'fixed'</code></td><td><code>auto</code> = fit the joint bounding box · <code>fixed</code> = fixed ring size</td></tr>
              <tr><td><code>showGears</code></td><td><code>boolean</code></td><td>show the gear mesh during animation</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="docs-footer">
        <p className="footer-brand">Spirograph Generator · <strong>@spirograph/react-native</strong></p>
        <p className="footer-links">
          <a href="/react.html"><i className="fa-brands fa-react" /> React</a>
          <a href="/svelte.html"><i className="fa-solid fa-circle-half-stroke" /> Svelte</a>
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            <i className="fa-brands fa-npm" /> npm
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <i className="fa-brands fa-github" /> GitHub
          </a>
        </p>
      </footer>
    </>
  );
}
