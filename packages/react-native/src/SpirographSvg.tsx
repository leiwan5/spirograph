import React from 'react';
import type { SpirographSvgProps } from './types.js';
import { useRenderData } from './useRenderData.js';
import { SvgRenderer } from './SvgRenderer.js';
import { SvgGearRenderer } from './SvgGearRenderer.js';

/**
 * Static Spirograph SVG: renders the finished pattern from `state` at the given
 * size using react-native-svg. No animation or timer logic — use
 * SpirographAnimated when you need a controllable drawing animation.
 */
export const SpirographSvg = React.memo(function SpirographSvg({
  state,
  size,
  showGears = false,
  testID,
}: SpirographSvgProps) {
  const { renderData, transform, items } = useRenderData(
    state,
    size.width,
    size.height,
  );

  return (
    <SvgRenderer
      renderData={renderData}
      width={size.width}
      height={size.height}
      background={state.background}
      testID={testID}
    >
      {showGears && items.length > 0 && (
        <SvgGearRenderer
          state={state}
          transform={transform}
          gearAngle={0}
          activePenIndex={0}
        />
      )}
    </SvgRenderer>
  );
});
