import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpirographAnimated } from '@spirograph/react-native';
import type { SpirographAnimationHandle, DrawingMode, Pen, SpirographState } from '@spirograph/react-native';
import { DEMO_STATE, nextPenId } from '../constants/state';
import { SpirographControls } from '../components/SpirographControls';

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<SpirographState>(DEMO_STATE);
  const [isPlaying, setIsPlaying] = useState(false);
  const animRef = useRef<SpirographAnimationHandle>(null);

  const canvasSize = Math.min(width - 20, 420);

  const patchState = useCallback((patch: Partial<SpirographState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const patchPen = useCallback((id: number, patch: Partial<Pen>) => {
    setState((s) => ({
      ...s,
      pens: s.pens.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const addPen = useCallback(() => {
    setState((s) => {
      const id = nextPenId(s.pens);
      const colors = ['#00f5d4'];
      return { ...s, pens: [...s.pens, { id, hole: 60, colors, spacing: 20, width: 3 }] };
    });
  }, []);

  const removePen = useCallback((id: number) => {
    setState((s) => ({ ...s, pens: s.pens.filter((p) => p.id !== id) }));
  }, []);

  const togglePlay = useCallback(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (isPlaying) {
      anim.pause();
      setIsPlaying(false);
    } else {
      anim.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    animRef.current?.stop();
    setIsPlaying(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Canvas */}
      <View style={[styles.canvasWrap, { height: canvasSize }]}>
        <SpirographAnimated
          ref={animRef}
          state={state}
          size={{ width: canvasSize, height: canvasSize }}
          showGears={state.showGears}
          playMode={state.pens.length > 1 ? 'sequential' : 'simultaneous'}
          segmentsPerSecond={350}
          onPlayingChange={setIsPlaying}
        />
      </View>

      {/* Playback controls */}
      <View style={styles.playback}>
        <Pressable onPress={togglePlay} style={styles.playBtn}>
          <Text style={styles.playText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
        </Pressable>
        <Pressable onPress={stop} style={styles.stopBtn}>
          <Text style={styles.stopText}>⏹ Stop</Text>
        </Pressable>
      </View>

      {/* Parameter controls */}
      <SpirographControls
        mode={state.mode as DrawingMode}
        ringTeeth={state.ringTeeth}
        rollingTeeth={state.rollingTeeth}
        speed={state.speed}
        showGears={state.showGears}
        background={state.background}
        pens={state.pens}
        onModeChange={(mode) => patchState({ mode })}
        onRingTeethChange={(v) => patchState({ ringTeeth: v })}
        onRollingTeethChange={(v) => patchState({ rollingTeeth: v })}
        onSpeedChange={(v) => patchState({ speed: v })}
        onShowGearsChange={(v) => patchState({ showGears: v })}
        onBackgroundChange={(bg) => patchState({ background: bg })}
        onPenChange={patchPen}
        onAddPen={addPen}
        onRemovePen={removePen}
      />
      <View style={{ height: insets.bottom }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  canvasWrap: {
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  playback: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  playBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  playText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  stopBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stopText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '700',
  },
});
