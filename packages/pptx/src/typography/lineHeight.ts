/** Resolve the line-height convention shared by OOXML, layout, and preview renderers. */
export function resolveLineHeightPixels(
  lineHeight: number | undefined,
  fontSize: number,
  fallback: number,
  absoluteUnit: "pixels" | "points" = "pixels",
): number {
  if (lineHeight === undefined) return fallback;
  if (lineHeight > 0 && lineHeight < 4) return fontSize * lineHeight;
  return absoluteUnit === "points" ? lineHeight * (96 / 72) : lineHeight;
}
