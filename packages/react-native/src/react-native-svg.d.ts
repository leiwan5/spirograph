/**
 * Minimal ambient type shim for `react-native-svg`.
 *
 * @spirograph/react-native intentionally declares only the subset of
 * react-native-svg that this package consumes, as structural React component
 * types. This mirrors the `core/browser.ts` philosophy of defining minimal
 * structural interfaces rather than pulling in the full native SDK just to
 * type-check. Consumers install the real `react-native-svg` at runtime, which
 * is structurally compatible with these declarations.
 */
declare module 'react-native-svg' {
  import type * as React from 'react';

  /** SVG length: number (dp) or string (e.g. "50%", "10px") */
  type NumberProp = string | number;

  interface CommonSVGProps {
    x?: NumberProp;
    y?: NumberProp;
    x1?: NumberProp;
    y1?: NumberProp;
    x2?: NumberProp;
    y2?: NumberProp;
    cx?: NumberProp;
    cy?: NumberProp;
    r?: NumberProp;
    width?: NumberProp;
    height?: NumberProp;
    d?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: NumberProp;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    opacity?: NumberProp;
    transform?: string;
    viewBox?: string;
    color?: string;
    id?: string;
    testID?: string;
    children?: React.ReactNode;
  }

  /** Root SVG container */
  export const Svg: React.FC<CommonSVGProps>;

  /** Circle element (background, gears) */
  export const Circle: React.FC<CommonSVGProps>;

  /** Path element (batching, gear teeth) */
  export const Path: React.FC<CommonSVGProps>;

  /** Line element (pen segments, gear marks) */
  export const Line: React.FC<CommonSVGProps>;

  /** Group element (gear assembly transform grouping) */
  export const G: React.FC<CommonSVGProps>;
}
