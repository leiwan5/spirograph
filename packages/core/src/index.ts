// @spirograph/core — pure core entry (zero DOM / zero Node dependencies)
// math / geometry / gradient / hole pattern / pose / segment render contract / SVG / PNG / query codec

export * from './types.js';
export { DEFAULT_STATE } from './defaults.js';

// math
export {
  gcd, reduceRatio, petals, meshPhase, validateGears,
} from './math/gear.js';
export {
  SAMPLES_PER_TURN, MAX_SAMPLES, curveInfo, sampleCurve,
  type CurveInfo,
} from './math/curve.js';

// geometry
export {
  computeBounds, computeFixedBounds, computeTransform, applyTransform, gearHoleRadius,
} from './geometry.js';

// gradient
export {
  GRADIENT_SEGMENTS, hexToRgb, lerpColor, gradientColorAt,
} from './gradient.js';

// pattern / pose
export {
  generateHolePattern, type HolePatternHole,
} from './pattern.js';
export {
  computeGearPose, computeSteps, weightedSteps, type GearPose,
} from './pose.js';

// segments (unified render contract)
export {
  segmentColor, closureColor, buildRenderData,
  type BuildRenderDataOptions,
} from './segments.js';

// svg / png
export { buildSvg } from './svg.js';
export { rasterize, encodePng } from './png.js';

// image (query → image, same source as image endpoint / CLI)
export {
  parseImageParams, buildItems, generateSvg, generatePng,
  type ImageParams,
} from './image.js';

// query codec
export {
  parseState, serializeState, getQueryValue, type UrlPatch,
} from './query.js';
