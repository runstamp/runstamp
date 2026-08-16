// src/template/themeResolver.ts — Theme color resolution

import { SCHEME_COLORS } from "../types/literals.js";
import {
  emitOoxmlColor,
  isSchemeColorToken,
  resolveColorReference,
} from "../ooxml/colorXml.js";

export interface ThemeData {
  colorScheme: Record<string, string>; // e.g., { dk1: "000000", lt1: "FFFFFF", accent1: "4472C4", ... }
  fontScheme: {
    majorLatin: string;
    minorLatin: string;
    majorEa?: string;   // East Asian heading font (e.g., "MS Gothic")
    minorEa?: string;   // East Asian body font (e.g., "MS Mincho")
  };
}

/**
 * Tests whether a color value is a known OOXML scheme color token or a ColorModifier object.
 */
export function isSchemeColor(color: string | { scheme: string }): boolean {
  return isSchemeColorToken(color);
}

/**
 * Resolves a color value to either an sRGB hex or a scheme reference.
 */
export function resolveColor(color: string): { type: "srgb" | "scheme"; value: string } {
  return resolveColorReference(color);
}

/**
 * Emits the OOXML XML for a color value.
 * Accepts plain hex strings, scheme color tokens, and ColorModifier objects
 * with tint/shade/lumMod/lumOff/satMod modifiers.
 */
export function emitColorXml(color: string | { scheme: string; [key: string]: unknown }): string {
  return emitOoxmlColor(color as string | { scheme: string });
}

import { ooxmlParser } from "./xmlParser.js";

// ---------------------------------------------------------------------------
// Text Style Cascade Resolution
// ---------------------------------------------------------------------------

import type { PlaceholderTextStyle, MasterTextStyles } from "./parser.js";

/**
 * Resolves a PlaceholderTextStyle by querying a 3-tier cascade:
 *   Tier 1: Layout placeholder text style (most specific)
 *   Tier 2: Master text styles (titleStyle / bodyStyle / otherStyle)
 *   Tier 3: Theme font scheme (least specific)
 *
 * Each property uses the first defined value across the tiers.
 */
export function resolveTextStyle(
  placeholderType: string | undefined,
  layoutStyle: PlaceholderTextStyle | undefined,
  masterStyles: MasterTextStyles | undefined,
  theme: ThemeData,
): PlaceholderTextStyle {
  // Determine which master style tier applies based on placeholder type
  let masterStyle: PlaceholderTextStyle | undefined;
  if (masterStyles) {
    if (placeholderType === "title" || placeholderType === "ctrTitle") {
      masterStyle = masterStyles.titleStyle ?? undefined;
    } else if (placeholderType === "body" || placeholderType === "subTitle") {
      masterStyle = masterStyles.bodyStyle ?? undefined;
    } else {
      masterStyle = masterStyles.otherStyle ?? undefined;
    }
  }

  // Tier 3: Theme defaults
  const isTitleLike = placeholderType === "title" || placeholderType === "ctrTitle";
  const themeFontFamily = isTitleLike ? theme.fontScheme.majorLatin : theme.fontScheme.minorLatin;
  const themeFontFamilyEa = isTitleLike ? theme.fontScheme.majorEa : theme.fontScheme.minorEa;

  // Build resolved style: Tier 1 → Tier 2 → Tier 3
  return {
    fontFamily: layoutStyle?.fontFamily ?? masterStyle?.fontFamily ?? themeFontFamily,
    fontFamilyEa: layoutStyle?.fontFamilyEa ?? masterStyle?.fontFamilyEa ?? themeFontFamilyEa,
    fontSize: layoutStyle?.fontSize ?? masterStyle?.fontSize ?? undefined,
    lineSpacing: layoutStyle?.lineSpacing ?? masterStyle?.lineSpacing ?? undefined,
    bold: layoutStyle?.bold ?? masterStyle?.bold ?? undefined,
    italic: layoutStyle?.italic ?? masterStyle?.italic ?? undefined,
    color: layoutStyle?.color ?? masterStyle?.color ?? undefined,
    bulletChar: layoutStyle?.bulletChar ?? masterStyle?.bulletChar ?? undefined,
  };
}

/**
 * Parses a theme XML string to extract the color and font schemes.
 * Uses fast-xml-parser for robust OOXML handling.
 */
export function parseThemeXml(themeXml: string): ThemeData {
  const parsed = ooxmlParser.parse(themeXml);
  const colorScheme: Record<string, string> = {};

  // Navigate: a:theme > a:themeElements > a:clrScheme
  const clrScheme = parsed?.["a:theme"]?.["a:themeElements"]?.["a:clrScheme"];
  if (clrScheme) {
    for (const token of SCHEME_COLORS) {
      const entry = clrScheme[`a:${token}`];
      if (!entry) continue;

      // Try srgbClr first
      const srgb = entry["a:srgbClr"];
      if (srgb?.["@_val"]) {
        colorScheme[token] = String(srgb["@_val"]).toUpperCase();
        continue;
      }

      // Try sysClr lastClr fallback
      const sys = entry["a:sysClr"];
      if (sys?.["@_lastClr"]) {
        colorScheme[token] = String(sys["@_lastClr"]).toUpperCase();
      }
    }
  }

  // Navigate: a:theme > a:themeElements > a:fontScheme
  const fontScheme = parsed?.["a:theme"]?.["a:themeElements"]?.["a:fontScheme"];
  const majorLatin = fontScheme?.["a:majorFont"]?.["a:latin"]?.["@_typeface"] ?? "Calibri Light";
  const minorLatin = fontScheme?.["a:minorFont"]?.["a:latin"]?.["@_typeface"] ?? "Calibri";
  const majorEa = fontScheme?.["a:majorFont"]?.["a:ea"]?.["@_typeface"] || undefined;
  const minorEa = fontScheme?.["a:minorFont"]?.["a:ea"]?.["@_typeface"] || undefined;

  return {
    colorScheme,
    fontScheme: { majorLatin, minorLatin, majorEa, minorEa },
  };
}
