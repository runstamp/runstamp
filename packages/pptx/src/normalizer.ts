import type { FlexStyle } from "./types/ast.js";

// NormalizedFlexStyle guarantees the shorthand `padding`/`margin` keys are
// absent — they have been expanded into their explicit four-sided equivalents.
export type NormalizedFlexStyle = Omit<FlexStyle, "padding" | "margin">;

/**
 * Expands the CSS-style shorthand `padding` and `margin` properties into
 * their explicit four-sided equivalents, respecting overrides.
 *
 * Benchmark 2 contract:
 *   normalizeStyle({ padding: 10, paddingLeft: 5 })
 *   → { paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 5 }
 */
export function normalizeStyle(style: FlexStyle): NormalizedFlexStyle {
  const {
    padding,
    margin,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    ...base
  } = style;

  const result: NormalizedFlexStyle = { ...base };

  // Apply shorthand first, then let specific keys override.
  if (padding !== undefined) {
    result.paddingTop = padding;
    result.paddingRight = padding;
    result.paddingBottom = padding;
    result.paddingLeft = padding;
  }
  if (paddingTop !== undefined) result.paddingTop = paddingTop;
  if (paddingRight !== undefined) result.paddingRight = paddingRight;
  if (paddingBottom !== undefined) result.paddingBottom = paddingBottom;
  if (paddingLeft !== undefined) result.paddingLeft = paddingLeft;

  if (margin !== undefined) {
    result.marginTop = margin;
    result.marginRight = margin;
    result.marginBottom = margin;
    result.marginLeft = margin;
  }
  if (marginTop !== undefined) result.marginTop = marginTop;
  if (marginRight !== undefined) result.marginRight = marginRight;
  if (marginBottom !== undefined) result.marginBottom = marginBottom;
  if (marginLeft !== undefined) result.marginLeft = marginLeft;

  return result;
}
