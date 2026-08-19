import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import type { DrawingMode, Pen } from '@spirograph/react-native';
import { PALETTE } from '../constants/state';

interface SpirographControlsProps {
  mode: DrawingMode;
  ringTeeth: number;
  rollingTeeth: number;
  speed: number;
  showGears: boolean;
  background: string;
  pens: Pen[];
  onModeChange: (mode: DrawingMode) => void;
  onRingTeethChange: (v: number) => void;
  onRollingTeethChange: (v: number) => void;
  onSpeedChange: (v: number) => void;
  onShowGearsChange: (v: boolean) => void;
  onBackgroundChange: (c: string) => void;
  onPenChange: (id: number, patch: Partial<Pen>) => void;
  onAddPen: () => void;
  onRemovePen: (id: number) => void;
}

function StepRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(min, value - step))} style={styles.stepBtn}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + step))} style={styles.stepBtn}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SpirographControls(props: SpirographControlsProps) {
  const {
    mode, ringTeeth, rollingTeeth, speed, showGears, background, pens,
    onModeChange, onRingTeethChange, onRollingTeethChange, onSpeedChange,
    onShowGearsChange, onBackgroundChange, onPenChange, onAddPen, onRemovePen,
  } = props;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pattern</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Mode</Text>
          <View style={styles.seg}>
            {(['inside', 'outside'] as DrawingMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => onModeChange(m)}
                style={[styles.segBtn, mode === m && styles.segBtnActive]}
              >
                <Text style={[styles.segText, mode === m && styles.segTextActive]}>
                  {m === 'inside' ? 'Inside' : 'Outside'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <StepRow label="Ring teeth" value={ringTeeth} min={12} max={180} step={1} onChange={onRingTeethChange} />
        <StepRow label="Rolling teeth" value={rollingTeeth} min={6} max={90} step={1} onChange={onRollingTeethChange} />

        <View style={styles.row}>
          <Text style={styles.label}>Show gears</Text>
          <Pressable
            onPress={() => onShowGearsChange(!showGears)}
            style={[styles.segBtn, showGears && styles.segBtnActive]}
          >
            <Text style={[styles.segText, showGears && styles.segTextActive]}>
              {showGears ? 'On' : 'Off'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Speed</Text>
          <View style={styles.seg}>
            {[0.5, 1, 1.5, 2].map((s) => (
              <Pressable key={s} onPress={() => onSpeedChange(s)} style={[styles.segBtn, speed === s && styles.segBtnActive]}>
                <Text style={[styles.segText, speed === s && styles.segTextActive]}>{s}×</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Background</Text>
          <View style={styles.swatches}>
            {['#111827', '#000000', '#ffffff', '#1d3557', '#233554'].map((c) => (
              <Pressable
                key={c}
                onPress={() => onBackgroundChange(c)}
                style={[styles.swatch, { backgroundColor: c }, background === c && styles.swatchActive]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Pens</Text>
          <Pressable onPress={onAddPen} style={styles.addBtn}>
            <Text style={styles.addText}>＋ Add</Text>
          </Pressable>
        </View>

        {pens.map((pen) => (
          <View key={pen.id} style={styles.penCard}>
            <View style={styles.row}>
              <Text style={styles.penName}>Pen #{pen.id}</Text>
              {pens.length > 1 && (
                <Pressable onPress={() => onRemovePen(pen.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              )}
            </View>

            <StepRow label="Hole" value={pen.hole} min={5} max={95} step={5} onChange={(h) => onPenChange(pen.id, { hole: h })} />
            <StepRow label="Width" value={pen.width} min={1} max={10} step={0.5} onChange={(w) => onPenChange(pen.id, { width: w })} />

            <View style={styles.row}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.swatches}>
                {PALETTE.slice(0, 8).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => onPenChange(pen.id, { colors: [c] })}
                    style={[styles.swatch, { backgroundColor: c }, pen.colors[0] === c && styles.swatchActive]}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 12,
  },
  section: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: '#e5e7eb',
    fontSize: 15,
    flexShrink: 1,
  },
  value: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  seg: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  segBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: '#2563eb',
  },
  segText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  segTextActive: {
    color: '#ffffff',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    backgroundColor: '#374151',
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  swatches: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#374151',
  },
  swatchActive: {
    borderColor: '#f9fafb',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  penCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  penName: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '700',
  },
  removeText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
