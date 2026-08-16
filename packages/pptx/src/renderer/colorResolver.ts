// src/renderer/colorResolver.ts — Resolve ColorValue to canvas-ready #RRGGBB strings

import type { ColorValue, ColorModifier, ThemeColorScheme } from "../types/ast.js";
import { DEFAULT_SCHEME } from "../ooxml/chart/chartColorResolver.js";

/**
 * Clamp a value between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Parse a 6-digit hex string (no #) into [r, g, b] 0-255.
 */
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert RGB 0-255 to HSL (h: 0-360, s: 0-1, l: 0-1).
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

/**
 * Convert HSL back to RGB 0-255.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h / 360) * 255),
    Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255),
  ];
}

/**
 * Apply tint to an RGB color. Tint percentage 0-100 (OOXML semantics):
 * each channel moves towards 255 by tint%.
 */
function applyTint(r: number, g: number, b: number, tint: number): [number, number, number] {
  const t = tint / 100;
  return [
    Math.round(r + (255 - r) * t),
    Math.round(g + (255 - g) * t),
    Math.round(b + (255 - b) * t),
  ];
}

/**
 * Apply shade to an RGB color. Shade percentage 0-100 (OOXML semantics):
 * each channel is scaled towards 0.
 */
function applyShade(r: number, g: number, b: number, shade: number): [number, number, number] {
  const s = shade / 100;
  return [
    Math.round(r * s),
    Math.round(g * s),
    Math.round(b * s),
  ];
}

/**
 * Resolve a raw scheme token to a 6-digit hex string (no #).
 */
function resolveSchemeToken(token: string, themeColors?: ThemeColorScheme): string | undefined {
  const custom = (themeColors as Record<string, string> | undefined)?.[token];
  if (custom) return custom.replace(/^#/, "");
  return DEFAULT_SCHEME[token];
}

/**
 * Resolve a ColorValue (string | ColorModifier) to a canvas-ready #RRGGBB string.
 * Returns undefined only if the input is undefined/null.
 * Falls back to "#000000" for unresolvable scheme tokens.
 */
export function resolveColorValue(
  color: ColorValue | undefined,
  themeColors?: ThemeColorScheme,
): string | undefined {
  if (color === undefined || color === null) return undefined;

  // Simple string form
  if (typeof color === "string") {
    // Already a hex color
    if (color.startsWith("#")) return color;
    // 6-digit hex without #
    if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
    // Scheme token
    const resolved = resolveSchemeToken(color, themeColors);
    if (resolved) return `#${resolved}`;
    // CSS named color — pass through (canvas understands these)
    return color;
  }

  // ColorModifier object form
  const mod = color as ColorModifier;
  const baseHex = resolveSchemeToken(mod.scheme, themeColors);
  if (!baseHex) return "#000000";

  // Guard against NaN/Infinity in modifier values
  const safeNum = (v: number | undefined) => v !== undefined && Number.isFinite(v) ? v : undefined;

  let [r, g, b] = hexToRgb(baseHex);

  // Apply tint/shade first (these work in RGB space)
  const tint = safeNum(mod.tint);
  const shade = safeNum(mod.shade);
  if (tint !== undefined) {
    [r, g, b] = applyTint(r, g, b, tint);
  }
  if (shade !== undefined) {
    [r, g, b] = applyShade(r, g, b, shade);
  }

  // Apply HSL-based modifiers
  const lumMod = safeNum(mod.lumMod);
  const lumOff = safeNum(mod.lumOff);
  const satMod = safeNum(mod.satMod);
  const satOff = safeNum(mod.satOff);
  const hueMod = safeNum(mod.hueMod);
  const hueOff = safeNum(mod.hueOff);
  if (lumMod !== undefined || lumOff !== undefined ||
      satMod !== undefined || satOff !== undefined ||
      hueMod !== undefined || hueOff !== undefined) {
    let [h, s, l] = rgbToHsl(r, g, b);

    if (lumMod !== undefined) l = l * (lumMod / 100);
    if (lumOff !== undefined) l = l + lumOff / 100;
    if (satMod !== undefined) s = s * (satMod / 100);
    if (satOff !== undefined) s = s + satOff / 100;
    if (hueMod !== undefined) h = h * (hueMod / 100);
    if (hueOff !== undefined) h = h + hueOff / 60000; // hueOff is in 60000ths of degree

    l = clamp(l, 0, 1);
    s = clamp(s, 0, 1);

    [r, g, b] = hslToRgb(h, s, l);
  }

  // Complement — RGB inversion (ECMA-376 §20.1.2.3.7)
  if (mod.comp) {
    r = 255 - r; g = 255 - g; b = 255 - b;
  }

  // Inverse
  if (mod.inv) {
    r = 255 - r; g = 255 - g; b = 255 - b;
  }

  // Grayscale
  if (mod.gray) {
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    r = gray; g = gray; b = gray;
  }

  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolve a ColorValue with alpha support, returning { color, alpha }.
 * Useful for fills with opacity.
 */
export function resolveColorWithAlpha(
  color: ColorValue | undefined,
  opacity?: number,
  themeColors?: ThemeColorScheme,
): { color: string; alpha: number } | undefined {
  const resolved = resolveColorValue(color, themeColors);
  if (!resolved) return undefined;
  return { color: resolved, alpha: opacity ?? 1 };
}
