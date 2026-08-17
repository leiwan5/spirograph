import { useRef, useState } from 'react';
import type { AppState } from '@spirograph/core';
import { SpirographCanvas } from '@spirograph/react';
import type { SpirographHandle } from '@spirograph/react';
import { applyPatch, buildDemoState, randomize } from '../state';
import { DemoCard } from './DemoCard';
import { DemoControls } from './DemoControls';

export function RenderDemo() {
  const [state, setState] = useState<AppState>(() => buildDemoState());
  const ref = useRef<SpirographHandle>(null);

  const patch = (p: Partial<AppState>) => setState((s) => applyPatch(s, p));
  const random = () => setState((s) => randomize(s));

  return (
    <DemoCard
      title="Render-only"
      tag="&lt;SpirographCanvas&gt;"
      stage={
        <div className="demo-stage">
          <SpirographCanvas ref={ref} state={state} />
        </div>
      }
      toolbar={
        <>
          <button className="demo-action" onClick={() => ref.current?.exportPng()}>
            <i className="fa-solid fa-download" /> PNG
          </button>
          <button className="demo-action" onClick={() => ref.current?.exportSvg()}>
            <i className="fa-solid fa-download" /> SVG
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {state.pens.length} pen{state.pens.length > 1 ? 's' : ''} · {state.ringTeeth}×{state.rollingTeeth}
          </span>
        </>
      }
      controls={<DemoControls state={state} onPatch={patch} onRandom={random} />}
    />
  );
}
