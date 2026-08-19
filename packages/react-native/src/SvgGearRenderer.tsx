import React from 'react';
import { G, Path, Circle, Line } from 'react-native-svg';
import type { SpirographState, Transform } from '@spirograph/core';
import { computeGearPose, generateHolePattern, gearHoleRadius } from '@spirograph/core';

const PI2 = Math.PI * 2;

// Colors matching core/browser.ts drawGears
const FILL = 'rgba(150,162,182,0.14)';
const TOOTH_FILL = 'rgba(118,132,152,0.42)';
const STROKE = 'rgba(104,119,140,0.7)';
const STROKE_SOFT = 'rgba(130,144,164,0.35)';
const HOLE_STROKE = 'rgba(118,132,152,0.55)';

export interface SvgGearRendererProps {
  state: SpirographState;
  transform: Transform;
  gearAngle: number;
  activePenIndex: number;
}

/**
 * SVG gear renderer: draws the ring gear (stationary) and rolling gear (rotating)
 * using react-native-svg elements. Math matches core/browser.ts drawGears exactly.
 */
export const SvgGearRenderer = React.memo(function SvgGearRenderer({
  state,
  transform,
  gearAngle,
  activePenIndex,
}: SvgGearRendererProps) {
  const { scale, offsetX, offsetY } = transform;
  const R = state.ringTeeth;
  const r = state.rollingTeeth;
  const inside = state.mode === 'inside';
  const centerR = inside ? R - r : R + r;
  const pose = computeGearPose(R, r, state.mode, gearAngle);
  const toothH = 7 / scale;
  const pens = state.pens.length > 0 ? state.pens : [{ id: 0, hole: 50, colors: ['#000'], spacing: 0, width: 2 }];

  // Ring gear geometry
  const bandOuter = (inside ? R + toothH * 1.2 : R + toothH * 0.3) * scale;
  const bandInner = (inside ? R + toothH * 0.3 : R - toothH * 1.2) * scale;
  const ringRoot = inside ? bandInner : bandOuter;
  const ringTip = (inside ? R - toothH * 0.7 : R + toothH * 0.7) * scale;
  const ringStep = PI2 / R;

  // Rolling gear geometry
  const gx = centerR * Math.cos(pose.centerAngle) * scale + offsetX;
  const gy = centerR * Math.sin(pose.centerAngle) * scale + offsetY;
  const discRoot = (r - toothH * 0.7) * scale;
  const discTip = (r + toothH * 0.2) * scale;
  const rollStep = PI2 / r;

  // Hole pattern
  const pattern = generateHolePattern(pens);
  const holeR = gearHoleRadius(transform, r);

  // Active pen mark length
  const activePen = pens[activePenIndex];
  const markLen = activePen
    ? Math.max(2, (activePen.hole / 100) * r * scale)
    : discRoot * 0.5;

  return (
    <G>
      {/* Ring gear body */}
      <Circle
        cx={offsetX}
        cy={offsetY}
        r={bandOuter}
        fill={FILL}
        stroke={STROKE}
        strokeWidth={1.4}
      />
      <Circle
        cx={offsetX}
        cy={offsetY}
        r={bandInner}
        fill="none"
        stroke={STROKE_SOFT}
        strokeWidth={1.4}
      />

      {/* Ring gear teeth */}
      {Array.from({ length: R }, (_, i) => {
        const a = i * ringStep;
        const d = [
          `M${offsetX + ringRoot * Math.cos(a + ringStep * 0.2)},${offsetY + ringRoot * Math.sin(a + ringStep * 0.2)}`,
          `L${offsetX + ringTip * Math.cos(a + ringStep * 0.35)},${offsetY + ringTip * Math.sin(a + ringStep * 0.35)}`,
          `L${offsetX + ringTip * Math.cos(a + ringStep * 0.65)},${offsetY + ringTip * Math.sin(a + ringStep * 0.65)}`,
          `L${offsetX + ringRoot * Math.cos(a + ringStep * 0.8)},${offsetY + ringRoot * Math.sin(a + ringStep * 0.8)}`,
          'Z',
        ].join(' ');
        return (
          <Path
            key={`ring-tooth-${i}`}
            d={d}
            fill={TOOTH_FILL}
            stroke={STROKE}
            strokeWidth={1.4}
          />
        );
      })}

      {/* Rolling gear (translated + rotated) */}
      <G transform={`translate(${gx},${gy}) rotate(${(pose.spinAngle * 180) / Math.PI})`}>
        {/* Disc body */}
        <Circle
          cx={0}
          cy={0}
          r={discRoot}
          fill={FILL}
          stroke={STROKE_SOFT}
          strokeWidth={1.4}
        />

        {/* Rolling gear teeth */}
        {Array.from({ length: r }, (_, i) => {
          const a = i * rollStep;
          const d = [
            `M${discRoot * Math.cos(a + rollStep * 0.2)},${discRoot * Math.sin(a + rollStep * 0.2)}`,
            `L${discTip * Math.cos(a + rollStep * 0.35)},${discTip * Math.sin(a + rollStep * 0.35)}`,
            `L${discTip * Math.cos(a + rollStep * 0.65)},${discTip * Math.sin(a + rollStep * 0.65)}`,
            `L${discRoot * Math.cos(a + rollStep * 0.8)},${discRoot * Math.sin(a + rollStep * 0.8)}`,
            'Z',
          ].join(' ');
          return (
            <Path
              key={`roll-tooth-${i}`}
              d={d}
              fill={TOOTH_FILL}
              stroke={STROKE}
              strokeWidth={1.4}
            />
          );
        })}

        {/* Hole pattern */}
        {pattern.map((h, i) => (
          <Circle
            key={`hole-${i}`}
            cx={h.frac * r * scale * Math.cos(h.angle)}
            cy={h.frac * r * scale * Math.sin(h.angle)}
            r={holeR}
            fill="none"
            stroke={HOLE_STROKE}
            strokeWidth={1.2}
          />
        ))}

        {/* Center dot */}
        <Circle
          cx={0}
          cy={0}
          r={Math.max(1.5, 0.06 * discRoot)}
          fill="none"
          stroke={HOLE_STROKE}
          strokeWidth={1.2}
        />

        {/* Active pen mark */}
        <Line
          x1={0}
          y1={0}
          x2={markLen}
          y2={0}
          stroke="rgba(220,90,90,0.6)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </G>
    </G>
  );
});
