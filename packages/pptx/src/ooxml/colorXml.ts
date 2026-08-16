import type { ColorModifier, ColorValue } from "../types/ast.js";
import { SCHEME_COLORS } from "../types/literals.js";
import { escapeXmlAttr } from "./drawing/xmlEscape.js";

const SCHEME_COLOR_TOKENS = new Set<string>(SCHEME_COLORS);

export function isSchemeColorToken(
  color: string | { scheme: string },
): boolean {
  if (typeof color === "object" && "scheme" in color) return true;
  return SCHEME_COLOR_TOKENS.has(color);
}

export function normalizeRgbHex(color: string): string {
  const raw = color.replace("#", "").toUpperCase();
  if (/^[0-9A-F]{6}$/.test(raw)) return raw;
  if (/^[0-9A-F]{3}$/.test(raw)) {
    return raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  }
  if (/^[0-9A-F]{8}$/.test(raw)) return raw.slice(0, 6);
  return "000000";
}

export function resolveColorReference(
  color: string,
): { type: "srgb" | "scheme"; value: string } {
  if (isSchemeColorToken(color)) {
    return { type: "scheme", value: color };
  }
  return { type: "srgb", value: normalizeRgbHex(color) };
}

function emitColorModifierChildren(
  color: ColorModifier,
  includeAlpha?: number,
): string {
  let children = "";
  if (color.tint !== undefined) children += `<a:tint val="${Math.round(color.tint * 1000)}"/>`;
  if (color.shade !== undefined) children += `<a:shade val="${Math.round(color.shade * 1000)}"/>`;
  if (color.comp) children += `<a:comp/>`;
  if (color.inv) children += `<a:inv/>`;
  if (color.gray) children += `<a:gray/>`;
  if (includeAlpha !== undefined) children += `<a:alpha val="${includeAlpha}"/>`;
  if (color.hueMod !== undefined) children += `<a:hueMod val="${Math.round(color.hueMod * 1000)}"/>`;
  if (color.hueOff !== undefined) children += `<a:hueOff val="${Math.round(color.hueOff * 60000)}"/>`;
  if (color.satMod !== undefined) children += `<a:satMod val="${Math.round(color.satMod * 1000)}"/>`;
  if (color.satOff !== undefined) children += `<a:satOff val="${Math.round(color.satOff * 1000)}"/>`;
  if (color.lumMod !== undefined) children += `<a:lumMod val="${Math.round(color.lumMod * 1000)}"/>`;
  if (color.lumOff !== undefined) children += `<a:lumOff val="${Math.round(color.lumOff * 1000)}"/>`;
  return children;
}

export function emitOoxmlColor(
  color: ColorValue,
  opacity?: number,
): string {
  const alphaVal =
    opacity !== undefined && opacity < 1
      ? Math.min(100000, Math.max(0, Math.round(opacity * 100000)))
      : undefined;

  if (typeof color === "object" && "scheme" in color) {
    const children = emitColorModifierChildren(color, alphaVal);
    const safeScheme = escapeXmlAttr(color.scheme);
    return children
      ? `<a:schemeClr val="${safeScheme}">${children}</a:schemeClr>`
      : `<a:schemeClr val="${safeScheme}"/>`;
  }

  if (isSchemeColorToken(color)) {
    const safeScheme = escapeXmlAttr(color);
    return alphaVal !== undefined
      ? `<a:schemeClr val="${safeScheme}"><a:alpha val="${alphaVal}"/></a:schemeClr>`
      : `<a:schemeClr val="${safeScheme}"/>`;
  }

  const value = normalizeRgbHex(color);
  return alphaVal !== undefined
    ? `<a:srgbClr val="${value}"><a:alpha val="${alphaVal}"/></a:srgbClr>`
    : `<a:srgbClr val="${value}"/>`;
}
