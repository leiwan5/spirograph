import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions,
} from 'react-native';
import { SpirographAnimated } from '@spirograph/react-native';
import type { SpirographAnimationHandle, SpirographState } from '@spirograph/react-native';

const DEFAULT_STATE: SpirographState = {
  mode: 'inside',
  ringTeeth: 72,
  rollingTeeth: 30,
  pens: [
    { id: 1, hole: 40, colors: ['#e63946'], spacing: 20, width: 5 },
    { id: 2, hole: 75, colors: ['#4cc9f0'], spacing: 20, width: 4 },
    { id: 3, hole: 88, colors: ['#f4a261'], spacing: 20, width: 3.5 },
  ],
  background: '#111827',
  speed: 1,
  scaleMode: 'auto',
  showGears: false,
};

export default function App() {
  const { width } = useWindowDimensions();
  const [state, setState] = useState<SpirographState>(DEFAULT_STATE);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<SpirographAnimationHandle>(null);

  const size = Math.min(width - 24, 400);
  const patch = (p: Partial<SpirographState>) => setState((s) => ({ ...s, ...p }));

  const togglePlay = () => {
    if (playing) { ref.current?.pause(); setPlaying(false); }
    else { ref.current?.play(); setPlaying(true); }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.stage, { width: size, height: size }]}>
        <SpirographAnimated
          ref={ref}
          state={state}
          size={{ width: size, height: size }}
          showGears={state.showGears}
          playMode={state.pens.length > 1 ? 'sequential' : 'simultaneous'}
          onPlayingChange={setPlaying}
        />
      </View>

      <View style={styles.playRow}>
        <Pressable style={styles.play} onPress={togglePlay}>
          <Text style={styles.playText}>{playing ? '⏸ Pause' : '▶ Play'}</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => { ref.current?.stop(); setPlaying(false); }}>
          <Text style={styles.ghostText}>Stop</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Row label="Mode">
          {(['inside', 'outside'] as const).map((m) => (
            <Chip key={m} active={state.mode === m} onPress={() => patch({ mode: m })}
              label={m === 'inside' ? 'Inside' : 'Outside'} />
          ))}
        </Row>
        <Stepper label="Ring teeth" value={state.ringTeeth} min={40} max={180}
          step={1} onChange={(v) => patch({ ringTeeth: v })} />
        <Stepper label="Rolling teeth" value={state.rollingTeeth} min={8} max={90}
          step={1} onChange={(v) => patch({ rollingTeeth: v })} />
        <Row label="Gears">
          <Chip active={state.showGears} onPress={() => patch({ showGears: !state.showGears })}
            label={state.showGears ? 'On' : 'Off'} />
        </Row>
        <Row label="Speed">
          {[0.5, 1, 2].map((s) => (
            <Chip key={s} active={state.speed === s} onPress={() => patch({ speed: s })}
              label={`${s}×`} />
          ))}
        </Row>
        <Row label="Background">
          {['#111827', '#000000', '#ffffff', '#1d3557'].map((c) => (
            <Pressable key={c} onPress={() => patch({ background: c })}
              style={[styles.swatch, { backgroundColor: c }, state.background === c && styles.swatchActive]} />
          ))}
        </Row>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.seg}>{children}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.seg}>
        <Pressable style={styles.step} onPress={() => onChange(Math.max(min, value - step))}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable style={styles.step} onPress={() => onChange(Math.min(max, value + step))}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', alignItems: 'center', paddingTop: 20 },
  stage: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#111827' },
  playRow: { flexDirection: 'row', gap: 12, marginVertical: 14 },
  play: { backgroundColor: '#2563eb', paddingHorizontal: 26, paddingVertical: 10, borderRadius: 10 },
  playText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ghost: { backgroundColor: '#374151', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  ghostText: { color: '#e5e7eb', fontSize: 15, fontWeight: '700' },
  scroll: { flex: 1, width: '100%' },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { color: '#e5e7eb', fontSize: 15 },
  seg: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  chip: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#d1d5db', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  step: { backgroundColor: '#374151', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  value: { color: '#f9fafb', fontSize: 15, fontWeight: '700', minWidth: 34, textAlign: 'center' },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#374151' },
  swatchActive: { borderColor: '#f9fafb' },
});
