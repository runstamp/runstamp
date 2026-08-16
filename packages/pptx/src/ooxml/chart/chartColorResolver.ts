// src/ooxml/chart/chartColorResolver.ts — Resolves scheme colors to hex for ECharts rasterizer

import type { ThemeColorScheme } from "../../types/ast.js";

const DEFAULT_SCHEME: Record<string, string> = {
  dk1: "000000", lt1: "FFFFFF", dk2: "44546A", lt2: "E7E6E6",
  accent1: "4472C4", accent2: "ED7D31", accent3: "A9D18E",
  accent4: "FFC000", accent5: "5B9BD5", accent6: "70AD47",
  hlink: "0563C1", folHlink: "954F72",
  bg1: "FFFFFF", tx1: "000000", bg2: "E7E6E6", tx2: "44546A",
};

/**
 * Resolves any color value to a plain hex string for ECharts.
 * Handles: hex strings, scheme color objects ({ scheme: "accent1" }),
 * scheme token strings ("accent1"), and undefined.
 */
export function resolveColorToHex(
  color: string | { scheme: string } | undefined,
  themeColors?: ThemeColorScheme,
): string | undefined {
  if (color === undefined || color === null) return undefined;

  // Object form: { scheme: "accent1" }
  if (typeof color === "object" && "scheme" in color) {
    const token = color.scheme;
    const resolved = (themeColors as Record<string, string> | undefined)?.[token] ?? DEFAULT_SCHEME[token];
    return resolved ? `#${resolved.replace(/^#/, "")}` : undefined;
  }

  // String form
  if (typeof color === "string") {
    // Check if it's a scheme token (no # prefix and matches a known token)
    if (!color.startsWith("#") && (DEFAULT_SCHEME[color] || (themeColors as Record<string, string> | undefined)?.[color])) {
      const resolved = (themeColors as Record<string, string> | undefined)?.[color] ?? DEFAULT_SCHEME[color];
      return resolved ? `#${resolved.replace(/^#/, "")}` : undefined;
    }
    // Hex string — ensure # prefix
    if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
    if (color.startsWith("#")) return color;
    // CSS named colors or other strings — pass through
    return color;
  }

  return undefined;
}

export { DEFAULT_SCHEME };
