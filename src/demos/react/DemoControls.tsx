import type { AppState } from '@spirograph/core';

interface Props {
  state: AppState;
  onPatch: (patch: Partial<AppState>) => void;
  onRandom: () => void;
}

const RING = [72, 96, 144, 192];
const ROLLING = [24, 30, 32, 45, 48, 52, 60, 63, 64, 72];

export function DemoControls({ state, onPatch, onRandom }: Props) {
  const ringMax = state.mode === 'inside' ? state.ringTeeth - 1 : 96;
  return (
    <div className="demo-controls">
      <div className="demo-control">
        <span>Mode</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={'demo-action' + (state.mode === 'inside' ? ' active' : '')}
            onClick={() => onPatch({ mode: 'inside' })}
          >
            Inside
          </button>
          <button
            className={'demo-action' + (state.mode === 'outside' ? ' active' : '')}
            onClick={() => onPatch({ mode: 'outside' })}
          >
            Outside
          </button>
        </div>
        <span />
      </div>

      <div className="demo-control">
        <span>Ring teeth</span>
        <input
          type="range"
          min={40}
          max={240}
          step={1}
          value={state.ringTeeth}
          onChange={(e) => onPatch({ ringTeeth: Number((e.target as HTMLInputElement).value) })}
        />
        <b>{state.ringTeeth}</b>
      </div>
      <div className="demo-control">
        <span>Rolling teeth</span>
        <input
          type="range"
          min={8}
          max={ringMax}
          step={1}
          value={state.rollingTeeth}
          onChange={(e) => onPatch({ rollingTeeth: Number((e.target as HTMLInputElement).value) })}
        />
        <b>{state.rollingTeeth}</b>
      </div>

      <div className="demo-chips">
        {RING.map((r) => (
          <button key={r} className="demo-chip" onClick={() => onPatch({ ringTeeth: r })}>
            ring {r}
          </button>
        ))}
      </div>
      <div className="demo-chips">
        {ROLLING.map((r) => (
          <button
            key={r}
            className="demo-chip"
            onClick={() => onPatch({ rollingTeeth: Math.min(r, ringMax) })}
          >
            roll {r}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="demo-action" onClick={onRandom}>
          <i className="fa-solid fa-shuffle" /> Random
        </button>
      </div>
    </div>
  );
}
