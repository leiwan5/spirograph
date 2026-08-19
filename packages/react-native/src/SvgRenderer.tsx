import React from 'react';
import { Svg, Line, Path, Circle } from 'react-native-svg';
import type { RenderData, RenderSegment, PenRange } from '@spirograph/core';

export interface SvgRendererProps {
  /** The render data (segments + pen ranges) from useRenderData */
  renderData: RenderData;
  /** Viewport width in dp */
  width: number;
  /** Viewport height in dp */
  height: number;
  /** Background color */
  background: string;
  /** Optional test ID */
  testID?: string;
  /** Children rendered beneath the curve segments (e.g. gears) */
  children?: React.ReactNode;
}

/**
 * Build an SVG Path 'd' string from a list of segments.
 * Segments are connected end-to-end (each segment's x1/y1 = next segment's x0/y0).
 */
function buildPathD(segments: RenderSegment[]): string {
  if (segments.length === 0) return '';
  const first = segments[0];
  let d = `M${first.x0},${first.y0}L${first.x1},${first.y1}`;
  for (let i = 1; i < segments.length; i++) {
    const s = segments[i];
    d += `L${s.x0},${s.y0}L${s.x1},${s.y1}`;
  }
  return d;
}

/**
 * Render a single pen's segments.
 * For solid pens (uniformColor != null): batch into a single <Path> for performance.
 * For gradient pens (uniformColor == null): render individual <Line> elements.
 */
function PenSegments({
  segments,
  penRange,
  penIndex,
}: {
  segments: RenderSegment[];
  penRange: PenRange;
  penIndex: number;
}) {
  const penSegments = segments.slice(penRange.first, penRange.first + penRange.count);

  if (penSegments.length === 0) return null;

  // Solid pen: batch into a single Path
  if (penRange.uniformColor) {
    const d = buildPathD(penSegments);
    if (!d) return null;
    return (
      <Path
        d={d}
        stroke={penRange.uniformColor}
        strokeWidth={penRange.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  }

  // Gradient pen: individual Line elements
  return (
    <>
      {penSegments.map((seg, i) => (
        <Line
          key={`${penIndex}-${i}`}
          x1={seg.x0}
          y1={seg.y0}
          x2={seg.x1}
          y2={seg.y1}
          stroke={seg.color}
          strokeWidth={seg.width}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

/**
 * Core SVG renderer: renders RenderData as SVG elements.
 * This is a pure rendering component with no state or side effects.
 */
export const SvgRenderer = React.memo(function SvgRenderer({
  renderData,
  width,
  height,
  background,
  testID,
  children,
}: SvgRendererProps) {
  const { segments, pens } = renderData;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      testID={testID}
    >
      {/* Background */}
      <Circle cx={width / 2} cy={height / 2} r={Math.max(width, height)} fill={background} />

      {/* Beneath-curve content (e.g. gears) */}
      {children}

      {/* Pen segments */}
      {pens.map((penRange, i) => (
        <PenSegments
          key={i}
          segments={segments}
          penRange={penRange}
          penIndex={i}
        />
      ))}
    </Svg>
  );
});
