import { useRef, useState } from 'react';
import type { AppState } from '@spirograph/core';
import { SpirographAnimated } from '@spirograph/react';
import type { SpirographAnimationHandle, PlayMode } from '@spirograph/react';
import { applyPatch, buildDemoState, randomize } from '../state';
import { DemoCard } from './DemoCard';
import { DemoControls } from './DemoControls';

export function AnimatedDemo() {
  const [state, setState] = useState<AppState>(() => buildDemoState());
  const [playMode, setPlayMode] = useState<PlayMode>('sequential');
  const [gears, setGears] = useState(false);
  const ref = useRef<SpirographAnimationHandle>(null);

  const patch = (p: Partial<AppState>) => setState((s) => applyPatch(s, p));
  const random = () => setState((s) => randomize(s));
  const toggleGears = () => {
    setGears((g) => {
      const next = !g;
      setState((s) => applyPatch(s, { showGears: next }));
      return next;
    });
  };
  const togglePlayMode = () => setPlayMode((m) => (m === 'sequential' ? 'simultaneous' : 'sequential'));

  return (
    <DemoCard
      title="Animated & controllable"
      tag="&lt;SpirographAnimated&gt;"
      stage={
        <div className="demo-stage">
          <SpirographAnimated ref={ref} state={state} playMode={playMode} />
        </div>
      }
      toolbar={
        <>
          <button className="demo-action" onClick={() => ref.current?.play()}>
            <i className="fa-solid fa-play" /> Play
          </button>
          <button className="demo-action" onClick={() => ref.current?.pause()}>
            <i className="fa-solid fa-pause" /> Pause
          </button>
          <button className="demo-action" onClick={() => ref.current?.resume()}>
            <i className="fa-solid fa-forward" /> Resume
          </button>
          <button className="demo-action" onClick={() => ref.current?.stop()}>
            <i className="fa-solid fa-stop" /> Stop
          </button>
          <button className="demo-action" onClick={() => ref.current?.setSpeed(0.5)}>0.5×</button>
          <button className="demo-action" onClick={() => ref.current?.setSpeed(1)}>1×</button>
          <button className="demo-action" onClick={() => ref.current?.setSpeed(2)}>2×</button>
          <span style={{ flex: 1 }} />
          <button className={'demo-action' + (gears ? ' active' : '')} onClick={toggleGears}>
            <i className="fa-solid fa-gear" /> Gears
          </button>
          <button className={'demo-action' + (playMode === 'simultaneous' ? ' active' : '')} onClick={togglePlayMode}>
            {playMode === 'sequential' ? 'One pen' : 'All pens'}
          </button>
        </>
      }
      controls={<DemoControls state={state} onPatch={patch} onRandom={random} />}
    />
  );
}
