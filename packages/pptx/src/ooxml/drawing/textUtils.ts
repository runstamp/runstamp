// src/ooxml/drawing/textUtils.ts — Shared text emission utilities
// Reused by: text.ts, shape.ts, table.ts

import type { LayoutNode, LayoutText } from "../../layout/extract.js";
import type {
  TextStyle, TextRun, ColorValue, HyperlinkTarget,
  Paragraph, BulletConfig, ShapeLocks,
} from "../../types/ast.js";
import { getFontOrNull } from "../../typography/fontCache.js";
import { applyBidiToParagraph } from "../../typography/bidi.js";
import { getLogger } from "../../logger.js";
import { toEmu, toSignedEmu, emitColorXml, emitColorWithAlpha, shadowPolar, cssAngleToOoxml } from "./math.js";

let _legacyLineHeightWarned = false;

/**
 * Computes the line height in pixels using fontkit metrics.
 * Matches segmentCache.ts:computeLineHeight() exactly.
 * Falls back to fontSize * 1.2 if the font isn't loaded.
 */
function computeLineHeightPx(fontFamily: string, fontSize: number): number {
  const font = getFontOrNull(fontFamily);
  if (!font) return fontSize * 1.2;
  const scale = fontSize / font.unitsPerEm;
  return (font.ascent - font.descent + font.lineGap) * scale;
}

export interface HyperlinkRel {
  rId: string;
  url: string;
  external?: boolean;  // default true for backward compat; false for internal slide links
}

/**
 * Resolve a hyperlink (string or HyperlinkTarget) into hlinkClick XML.
 */
export function resolveHyperlink(
  hyperlink: string | HyperlinkTarget,
  hyperlinkRels: HyperlinkRel[],
  hyperlinkRIdCounter: { current: number },
): { hlinkXml: string } {
  if (typeof hyperlink === "string") {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: hyperlink, external: true });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}"/>` };
  }

  const target = hyperlink;
  const tooltipAttr = target.tooltip ? ` tooltip="${escapeXmlAttr(target.tooltip)}"` : "";

  // Navigation actions (no rId needed)
  if (target.action) {
    const jumpMap: Record<string, string> = {
      firstSlide: "firstslide",
      lastSlide: "lastslide",
      nextSlide: "nextslide",
      previousSlide: "previousslide",
      endShow: "endshow",
    };
    const jump = jumpMap[target.action] ?? target.action;
    return { hlinkXml: `<a:hlinkClick r:id="" action="ppaction://hlinkshowjump?jump=${jump}"${tooltipAttr}/>` };
  }

  // Internal slide link
  if (target.slide !== undefined) {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: `slide${target.slide}.xml`, external: false });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}" action="ppaction://hlinksldjump"${tooltipAttr}/>` };
  }

  // Mailto link
  if (target.mailto) {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: `mailto:${target.mailto}`, external: true });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}"${tooltipAttr}/>` };
  }

  // External URL (with optional tooltip)
  if (target.url) {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: target.url, external: true });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}"${tooltipAttr}/>` };
  }

  return { hlinkXml: "" };
}

// ---------------------------------------------------------------------------
// XML Escaping — re-exported from xmlEscape.ts (single source of truth)
// ---------------------------------------------------------------------------

import { stripXmlInvalidChars as _stripXmlInvalidChars, escapeXml as _escapeXml, escapeXmlAttr as _escapeXmlAttr } from "./xmlEscape.js";
export { _stripXmlInvalidChars as stripXmlInvalidChars, _escapeXml as escapeXml, _escapeXmlAttr as escapeXmlAttr };
// Local aliases for use within this file
const escapeXml = _escapeXml;
const escapeXmlAttr = _escapeXmlAttr;

// ---------------------------------------------------------------------------
// Shape Locks Helper
// ---------------------------------------------------------------------------

export function emitLocksXml(tagName: string, locks: ShapeLocks | undefined, defaults?: ShapeLocks): string {
  const merged = { ...defaults, ...locks };
  const attrs: string[] = [];
  for (const [key, val] of Object.entries(merged)) {
    if (val === true) attrs.push(`${key}="1"`);
  }
  if (attrs.length === 0) return `<${tagName}/>`;
  return `<${tagName} ${attrs.join(" ")}/>`;
}

// ---------------------------------------------------------------------------
// Decorative Extension Helper
// ---------------------------------------------------------------------------

export function emitDecorativeExtXml(): string {
  return `<a:extLst><a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}"><adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext></a:extLst>`;
}

export function shouldOmitTransform(
  layout: { x: number; y: number; width: number; height: number },
  omitTransform?: boolean,
): boolean {
  return Boolean(
    omitTransform &&
    layout.x === 0 &&
    layout.y === 0 &&
    layout.width === 0 &&
    layout.height === 0,
  );
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

export function normalizeRuns(content: string | TextRun[]): TextRun[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  return content;
}

export function splitRunsIntoParagraphs(runs: TextRun[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let currentRuns: TextRun[] = [];

  for (const run of runs) {
    const parts = run.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        paragraphs.push({ runs: currentRuns.length > 0 ? currentRuns : [{ text: "" }] });
        currentRuns = [];
      }
      if (parts[i].length > 0) {
        currentRuns.push({ ...run, text: parts[i] });
      }
    }
  }

  paragraphs.push({ runs: currentRuns.length > 0 ? currentRuns : [{ text: "" }] });
  return paragraphs;
}

export function normalizeToParagraphs(node: LayoutNode): Paragraph[] {
  const paras = (node as LayoutText).paragraphs;
  if (paras && paras.length > 0) {
    return paras;
  }

  const rawContent = (node as LayoutText).content ?? "";
  const runs = normalizeRuns(rawContent);
  return splitRunsIntoParagraphs(runs);
}

/**
 * Normalizes from content/paragraphs fields directly (not from a LayoutNode).
 */
export function normalizeToParagraphsFromFields(
  content?: string | TextRun[],
  paragraphs?: Paragraph[],
): Paragraph[] {
  if (paragraphs && paragraphs.length > 0) {
    return paragraphs;
  }
  const runs = normalizeRuns(content ?? "");
  return splitRunsIntoParagraphs(runs);
}

// ---------------------------------------------------------------------------
// Vertical alignment mapping
// ---------------------------------------------------------------------------

export const VERTICAL_ALIGN_MAP: Record<string, string> = {
  top: "t",
  middle: "ctr",
  bottom: "b",
};

// ---------------------------------------------------------------------------
// Bullet XML emission
// ---------------------------------------------------------------------------

export function emitBulletXml(bullet: BulletConfig): string {
  if (bullet.type === "none") {
    return `        <a:buNone/>\n`;
  }

  let xml = "";

  if (bullet.type === "autoNum") {
    const startAttr = bullet.startAt !== undefined ? ` startAt="${bullet.startAt}"` : "";
    xml += `        <a:buAutoNum type="${bullet.scheme}"${startAttr}/>\n`;
  } else {
    // OOXML spec order: buClr → buSzPct → buFont → buChar
    if (bullet.color) {
      xml += `        <a:buClr>${emitColorXml(bullet.color)}</a:buClr>\n`;
    }
    if (bullet.size !== undefined) {
      xml += `        <a:buSzPct val="${Math.round(bullet.size * 1000)}"/>\n`;
    }
    if (bullet.fontFamily) {
      xml += `        <a:buFont typeface="${escapeXmlAttr(bullet.fontFamily)}"/>\n`;
    }
    xml += `        <a:buChar char="${escapeXml(bullet.char)}"/>\n`;
  }

  return xml;
}

// ---------------------------------------------------------------------------
// Paragraph properties
// ---------------------------------------------------------------------------

export function emitParagraphProps(para: Paragraph, textStyle: TextStyle | undefined): string {
  const align = para.align ?? textStyle?.textAlign;
  // para.lineHeight is in points (as documented), textStyle.lineHeight is in pixels (FlexStyle convention)
  const lineHeight = para.lineHeight ?? textStyle?.lineHeight;
  const lineHeightIsPoints = para.lineHeight !== undefined;
  const rtl = para.rtl ?? textStyle?.rtl;
  const tabStops = para.tabStops;
  const hangingIndent = para.hangingIndent;
  const spaceBeforePercent = para.spaceBeforePercent;
  const spaceAfterPercent = para.spaceAfterPercent;
  const algnMap: Record<string, string> = { left: "l", center: "ctr", right: "r", justify: "just" };
  const algnAttr = align ? ` algn="${algnMap[align] || "l"}"` : "";
  const lvlAttr = para.level !== undefined ? ` lvl="${para.level}"` : "";
  const leftMargin = para.indent ?? para.marginLeft;
  const marLAttr = leftMargin !== undefined ? ` marL="${toEmu(leftMargin)}"` : "";
  const indentAttr = hangingIndent !== undefined ? ` indent="${toSignedEmu(-Math.abs(hangingIndent))}"` : "";
  const rtlAttr = rtl ? ` rtl="1"` : "";

  let xml = `      <a:pPr${algnAttr}${lvlAttr}${marLAttr}${indentAttr}${rtlAttr}>\n`;

  // Line spacing: explicit percentage mode, multiplier (CSS-style), points (legacy), or pixels.
  // Multiplier semantics: any unitless value < 4 is treated as a font-size multiplier
  // (e.g. 1.4 → 140%). Values ≥ 4 fall through to the legacy points/px paths and emit
  // a one-shot deprecation warning — no LLM that's seen CSS will pass 17 to mean
  // "1.7× spacing", and PowerPoint renders spcPts val="1700" as 17pt absolute spacing,
  // which collapses every wrapped line on top of the previous one.
  const lineSpacingMode = para.lineSpacingMode;
  if (lineHeight) {
    if (lineSpacingMode === "percentage") {
      // Percentage mode: value is percentage (e.g. 150 = 150%)
      xml += `        <a:lnSpc><a:spcPct val="${Math.round(lineHeight * 1000)}"/></a:lnSpc>\n`;
    } else if (lineHeight < 4) {
      // Multiplier mode: 1.4 → spcPct val="140000" (140%)
      xml += `        <a:lnSpc><a:spcPct val="${Math.round(lineHeight * 100000)}"/></a:lnSpc>\n`;
    } else if (lineHeightIsPoints) {
      if (!_legacyLineHeightWarned) {
        _legacyLineHeightWarned = true;
        getLogger().warn(
          `[lineHeight] Value ${lineHeight} treated as legacy points (deprecated). Pass a multiplier like 1.4 instead.`,
        );
      }
      // Paragraph.lineHeight is in points → OOXML spcPts val is hundredths of a point
      xml += `        <a:lnSpc><a:spcPts val="${Math.round(lineHeight * 100)}"/></a:lnSpc>\n`;
    } else {
      // TextStyle.lineHeight is in pixels (FlexStyle convention) → convert px to hundredths of a point
      xml += `        <a:lnSpc><a:spcPts val="${Math.round(lineHeight * 75)}"/></a:lnSpc>\n`;
    }
  } else {
    // No explicit lineHeight — compute from font metrics so PowerPoint matches our Yoga measurement.
    // Find the max fontSize across runs to determine dominant line height.
    let maxFontSize = textStyle?.fontSize ?? 16;
    let dominantFamily = textStyle?.fontFamily ?? "Liberation Sans";
    if (para.runs && para.runs.length > 0) {
      for (const run of para.runs) {
        const runSize = run.style?.fontSize ?? textStyle?.fontSize ?? 16;
        if (runSize > maxFontSize) {
          maxFontSize = runSize;
          dominantFamily = run.style?.fontFamily ?? textStyle?.fontFamily ?? "Liberation Sans";
        }
      }
    }
    const computedLhPx = computeLineHeightPx(dominantFamily, maxFontSize);
    // Convert pixels → hundredths-of-a-point (px * 72/96 * 100 = px * 75)
    const spcPtsVal = Math.round(computedLhPx * 75);
    xml += `        <a:lnSpc><a:spcPts val="${spcPtsVal}"/></a:lnSpc>\n`;
  }

  // Space before: percentage or points
  if (spaceBeforePercent !== undefined) {
    xml += `        <a:spcBef><a:spcPct val="${Math.round(spaceBeforePercent * 1000)}"/></a:spcBef>\n`;
  } else if (para.spaceBefore !== undefined) {
    xml += `        <a:spcBef><a:spcPts val="${Math.round(para.spaceBefore * 100)}"/></a:spcBef>\n`;
  }

  // Space after: percentage or points
  if (spaceAfterPercent !== undefined) {
    xml += `        <a:spcAft><a:spcPct val="${Math.round(spaceAfterPercent * 1000)}"/></a:spcAft>\n`;
  } else if (para.spaceAfter !== undefined) {
    xml += `        <a:spcAft><a:spcPts val="${Math.round(para.spaceAfter * 100)}"/></a:spcAft>\n`;
  }

  if (para.bullet) {
    xml += emitBulletXml(para.bullet);
  }

  if (tabStops && tabStops.length > 0) {
    xml += `        <a:tabLst>`;
    for (const tab of tabStops) {
      const pos = toEmu(tab.position);
      const algn = tab.align ? ` algn="${tab.align}"` : "";
      xml += `<a:tab pos="${pos}"${algn}/>`;
    }
    xml += `</a:tabLst>\n`;
  }

  xml += `      </a:pPr>\n`;
  return xml;
}

// ---------------------------------------------------------------------------
// Run properties
// ---------------------------------------------------------------------------

export function detectScriptFamilies(
  _text: string,
  _defaultFamily: string,
): { ea?: string; cs?: string } {
  // Batch E will supply admitted script-specific identities. Until then a
  // Latin face must never be repeated into a:ea/a:cs as if it covered them.
  return {};
}

function isRtlLanguage(lang: string | undefined): boolean {
  return /^(ar|arc|dv|fa|ha|he|khw|ks|ku|ps|sd|ug|ur|yi)(?:-|$)/i.test(lang ?? "");
}

export interface RunPropsContext {
  textStyle?: TextStyle;
  fontSize: number;
  fontColor: ColorValue;
  fontFamily: string;
  hyperlinkRels: HyperlinkRel[];
  hyperlinkRIdCounter: { current: number };
}

export function emitRunProps(
  run: TextRun,
  ctx: RunPropsContext,
): { xml: string } {
  const { textStyle, fontColor, fontFamily, hyperlinkRels, hyperlinkRIdCounter } = ctx;
  const runStyle = run.style;
  // px → ooxml hundredths-of-a-point. Round to integer; ECMA-376
  // declares a:rPr/@sz as xsd:int and PowerPoint trips its repair
  // dialog on float values like "3999.9999999999995" that arise from
  // common pt sizes traveling through the px round-trip
  // (40pt × 96/72 × 75 = 3999.999...).
  const runFontSize = Math.round((runStyle?.fontSize ?? textStyle?.fontSize ?? 16) * 75);
  const runFontColor: ColorValue = runStyle?.color ?? fontColor;
  const runFontFamily = runStyle?.resolvedFont?.family
    ?? textStyle?.resolvedFont?.family
    ?? runStyle?.fontFamily
    ?? fontFamily;
  const runBold = (runStyle?.fontWeight ?? textStyle?.fontWeight) === "bold";
  const runItalic = (runStyle?.fontStyle ?? textStyle?.fontStyle) === "italic";

  const boldAttr = runBold ? ` b="1"` : "";
  const italicAttr = runItalic ? ` i="1"` : "";

  const decorLine = runStyle?.textDecorationLine ?? textStyle?.textDecorationLine;
  const decorStyle = runStyle?.textDecorationStyle ?? textStyle?.textDecorationStyle;

  let uAttr = "";
  if (decorLine === "underline" || decorLine === "underline-strikethrough") {
    const uMap: Record<string, string> = { solid: "sng", double: "dbl", dotted: "dot", dashed: "dash" };
    uAttr = ` u="${uMap[decorStyle || "solid"] || "sng"}"`;
  }

  let strikeAttr = "";
  if (decorLine === "strikethrough" || decorLine === "underline-strikethrough") {
    const sMap: Record<string, string> = { solid: "sngStrike", double: "dblStrike" };
    strikeAttr = ` strike="${sMap[decorStyle || "solid"] || "sngStrike"}"`;
  }

  let baselineAttr = "";
  if (runStyle?.baseline === "superscript") {
    baselineAttr = ` baseline="30000"`;
  } else if (runStyle?.baseline === "subscript") {
    baselineAttr = ` baseline="-25000"`;
  }

  let spcAttr = "";
  if (runStyle?.letterSpacing !== undefined) {
    spcAttr = ` spc="${Math.round(runStyle.letterSpacing * 75)}"`;
  }

  let capAttr = "";
  if (runStyle?.textTransform === "uppercase") {
    capAttr = ` cap="all"`;
  } else if (runStyle?.textTransform === "capitalize") {
    capAttr = ` cap="small"`;
  }

  let kernAttr = "";
  if (runStyle?.kerning !== undefined) {
    kernAttr = ` kern="${Math.round(runStyle.kerning * 100)}"`;
  }

  // Text shadow & outline (Phase 4.5)
  const shadow = runStyle?.shadow;
  const outline = runStyle?.outline;
  const highlight = runStyle?.highlight;

  let hlinkAttr = "";
  if (run.hyperlink) {
    const { hlinkXml } = resolveHyperlink(run.hyperlink, hyperlinkRels, hyperlinkRIdCounter);
    if (hlinkXml) {
      hlinkAttr = `\n          ${hlinkXml}`;
    }
  }

  const runLang = runStyle?.lang ?? textStyle?.lang ?? "en-US";
  const runAltLang = runStyle?.altLang;
  const altLangAttr = runAltLang ? ` altLang="${escapeXmlAttr(runAltLang)}"` : "";

  let xml = `        <a:rPr lang="${escapeXmlAttr(runLang)}"${altLangAttr} sz="${runFontSize}"${boldAttr}${italicAttr}${uAttr}${strikeAttr}${baselineAttr}${spcAttr}${capAttr}${kernAttr} dirty="0">\n`;

  // Text outline (Phase 4.5)
  if (outline) {
    const lnW = toEmu(outline.width);
    xml += `          <a:ln w="${lnW}"><a:solidFill>${emitColorXml(outline.color)}</a:solidFill></a:ln>\n`;
  }

  // Gradient text fill or solid fill
  const gradFill = runStyle?.gradientFill;
  if (gradFill) {
    xml += `          <a:gradFill><a:gsLst>`;
    for (const stop of gradFill.stops) {
      const pos = Math.min(100000, Math.max(0, Math.round(stop.position * 1000)));
      xml += `<a:gs pos="${pos}">${emitColorXml(stop.color)}</a:gs>`;
    }
    xml += `</a:gsLst>`;
    if (gradFill.type === "linear") {
      const ang = cssAngleToOoxml(gradFill.angle ?? 180);
      xml += `<a:lin ang="${ang}" scaled="1"/>`;
    } else {
      xml += `<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>`;
    }
    xml += `</a:gradFill>\n`;
  } else {
    xml += `          <a:solidFill>${emitColorXml(runFontColor)}</a:solidFill>\n`;
  }

  // CT_TextCharacterProperties ordering: fill → effectLst → highlight → latin/ea/cs

  // Text shadow effect
  if (shadow) {
    const { dist, dir } = shadowPolar(shadow.offsetX, shadow.offsetY);
    const blurEmu = toEmu(shadow.blurRadius);
    xml += `          <a:effectLst><a:outerShdw blurRad="${blurEmu}" dist="${dist}" dir="${dir}" algn="ctr" rotWithShape="0">${emitColorWithAlpha(shadow.color, shadow.opacity)}</a:outerShdw></a:effectLst>\n`;
  }

  // Highlight color
  if (highlight) {
    xml += `          <a:highlight>${emitColorXml(highlight)}</a:highlight>\n`;
  }

  xml += `          <a:latin typeface="${escapeXmlAttr(runFontFamily)}"/>`;

  // Batch E will attach real script faces. Empty is truthful until those
  // assets exist; naming the Latin face here would misrepresent coverage.
  xml += `\n          <a:ea typeface=""/>`;
  xml += `\n          <a:cs typeface=""/>`;
  if (isRtlLanguage(runLang)) {
    xml += `\n          <a:rtl/>`;
  }

  if (hlinkAttr) xml += hlinkAttr;
  xml += `\n        </a:rPr>\n`;

  return { xml };
}

// ---------------------------------------------------------------------------
// Emit paragraphs as OOXML (shared by text.ts, shape.ts, table.ts)
// ---------------------------------------------------------------------------

export function emitParagraphsXml(
  paragraphs: Paragraph[],
  textStyle: TextStyle | undefined,
  hyperlinkRels: HyperlinkRel[],
  hyperlinkRIdCounter: { current: number },
): string {
  const fontSize = Math.round((textStyle?.fontSize || 16) * 75);
  const fontColor: ColorValue = textStyle?.color || "#000000";
  const fontFamily = textStyle?.resolvedFont?.family ?? textStyle?.fontFamily ?? "Liberation Sans";

  let xml = "";
  for (const para of paragraphs) {
    const bidiPara = applyBidiToParagraph(para, textStyle);
    xml += `    <a:p>\n`;
    xml += emitParagraphProps(bidiPara, textStyle);

    for (const run of bidiPara.runs) {
      if (run.text.length === 0) continue;

      const rProps = emitRunProps(run, {
        textStyle, fontSize, fontColor, fontFamily,
        hyperlinkRels, hyperlinkRIdCounter,
      });

      // Apply text transform for lowercase (caps are handled via OOXML cap attribute)
      const textTransform = run.style?.textTransform;
      const emittedText = escapeXml(textTransform === "lowercase" ? run.text.toLowerCase() : run.text);

      xml += `      <a:r>\n`;
      xml += rProps.xml;
      xml += `        <a:t>${emittedText}</a:t>\n`;
      xml += `      </a:r>\n`;
    }

    const endParaLang = textStyle?.lang ?? "en-US";
    xml += `      <a:endParaRPr lang="${escapeXmlAttr(endParaLang)}" dirty="0"/>\n`;
    xml += `    </a:p>\n`;
  }
  return xml;
}
