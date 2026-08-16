import type { SKRSContext2D } from "@napi-rs/canvas";
import type {
  Paragraph,
  TextRun,
  TextStyle,
  ThemeColorScheme,
} from "../types/ast.js";
import { resolveColorValue } from "./colorResolver.js";
import { resolveLineHeightPixels } from "../typography/lineHeight.js";

export function paintParagraphs(
  ctx: SKRSContext2D,
  paragraphs: Paragraph[],
  parentStyle: TextStyle | undefined,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  themeColors?: ThemeColorScheme,
): void {
  let cursorY = y;
  const defaultFontSize = parentStyle?.fontSize ?? 14;
  const defaultLineHeight = resolveLineHeightPixels(
    parentStyle?.lineHeight,
    defaultFontSize,
    defaultFontSize * 1.3,
  );

  for (const para of paragraphs) {
    if (cursorY - y >= maxHeight) break;

    cursorY += para.spaceBefore ?? 0;

    const align = para.align ?? parentStyle?.textAlign ?? "left";
    const lineHeight = resolveLineHeightPixels(
      para.lineHeight,
      defaultFontSize,
      defaultLineHeight,
      "points",
    );

    for (const run of para.runs) {
      if (cursorY - y >= maxHeight) break;

      const fontSize = run.style?.fontSize ?? parentStyle?.fontSize ?? 14;
      const fontFamily = run.style?.fontFamily ?? parentStyle?.fontFamily ?? "Arial";
      const fontWeight = run.style?.fontWeight ?? parentStyle?.fontWeight ?? "normal";
      const fontStyle = run.style?.fontStyle ?? parentStyle?.fontStyle ?? "normal";
      const color = run.style?.color ?? parentStyle?.color;

      ctx.font = buildFontString(fontSize, fontFamily, fontWeight, fontStyle);
      ctx.fillStyle = resolveColorValue(color, themeColors) ?? "#000000";
      ctx.textBaseline = "top";

      const text = applyTextTransform(run.text, run.style?.textTransform);
      const lines = wrapText(ctx, text, maxWidth);

      for (const line of lines) {
        if (cursorY - y >= maxHeight) break;
        const lineX = alignText(ctx, line, x, maxWidth, align);
        ctx.fillText(line, lineX, cursorY, maxWidth);
        cursorY += lineHeight;
      }
    }

    cursorY += para.spaceAfter ?? 0;
  }
}

export function paintTextContent(
  ctx: SKRSContext2D,
  content: string | TextRun[],
  style: TextStyle | undefined,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  themeColors?: ThemeColorScheme,
): void {
  if (typeof content === "string") {
    const fontSize = style?.fontSize ?? 14;
    const fontFamily = style?.fontFamily ?? "Arial";
    const fontWeight = style?.fontWeight ?? "normal";
    const fontStyle = style?.fontStyle ?? "normal";
    const color = style?.color;

    ctx.font = buildFontString(fontSize, fontFamily, fontWeight, fontStyle);
    ctx.fillStyle = resolveColorValue(color, themeColors) ?? "#000000";
    ctx.textBaseline = "top";

    const lineHeight = resolveLineHeightPixels(style?.lineHeight, fontSize, fontSize * 1.3);
    const align = style?.textAlign ?? "left";
    const lines = wrapText(ctx, content, maxWidth);
    let cursorY = y;

    for (const line of lines) {
      if (cursorY - y >= maxHeight) break;
      const lineX = alignText(ctx, line, x, maxWidth, align);
      ctx.fillText(line, lineX, cursorY, maxWidth);
      cursorY += lineHeight;
    }
    return;
  }

  paintParagraphs(ctx, [{ runs: content }], style, x, y, maxWidth, maxHeight, themeColors);
}

export function buildFontString(
  fontSize: number,
  fontFamily: string,
  fontWeight: string | undefined,
  fontStyle: string | undefined,
): string {
  const weight = fontWeight === "bold"
    ? "bold"
    : fontWeight === "normal" || !fontWeight
      ? ""
      : /^\d{3}$/.test(fontWeight)
        ? fontWeight
        : "";
  const italic = fontStyle === "italic" ? "italic" : "";
  const parts = [italic, weight, `${fontSize}px`].filter(Boolean);
  // PaperEmoji provides color emoji glyphs (Apple Color Emoji / Noto Color Emoji).
  // PaperFallback is a broad-coverage Unicode font (Arial Unicode) for CJK/RTL/symbols.
  // Both are registered by fontBridge.ts at render time.
  return `${parts.join(" ")} "${fontFamily}", PaperEmoji, PaperFallback, Arial, sans-serif`;
}

/**
 * Test whether a code point is in a CJK range where line breaks are allowed
 * at any character boundary (no whitespace required).
 */
function isCJKCodePoint(cp: number): boolean {
  return (
    (cp >= 0x3000 && cp <= 0x9FFF) ||  // CJK Unified, Kana, Bopomofo, etc.
    (cp >= 0xAC00 && cp <= 0xD7AF) ||  // Hangul Syllables
    (cp >= 0xF900 && cp <= 0xFAFF) ||  // CJK Compatibility Ideographs
    (cp >= 0xFF00 && cp <= 0xFFEF) ||  // Fullwidth Forms
    (cp >= 0x20000 && cp <= 0x2FA1F)   // CJK Extension B+
  );
}

/**
 * Split text into wrap-able segments. Unlike a simple whitespace split,
 * this inserts break opportunities between CJK characters, matching
 * UAX#14 line break rules for East Asian text.
 */
function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (isCJKCodePoint(cp)) {
      // Each CJK character is its own wrappable segment
      if (current) { segments.push(current); current = ""; }
      segments.push(char);
    } else if (/\s/.test(char)) {
      current += char;
      segments.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) segments.push(current);
  return segments;
}

export function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (maxWidth <= 0) return [text];
  const segments = splitIntoSegments(text);
  const lines: string[] = [];
  let currentLine = "";

  for (const seg of segments) {
    const testLine = currentLine + seg;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.trimEnd());
      currentLine = seg.trimStart();
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }

  return lines.length > 0 ? lines : [""];
}

export function alignText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  maxWidth: number,
  align: string,
): number {
  if (align === "center") {
    const width = ctx.measureText(text).width;
    return x + (maxWidth - width) / 2;
  }
  if (align === "right") {
    const width = ctx.measureText(text).width;
    return x + maxWidth - width;
  }
  return x;
}

export function applyTextTransform(text: string, transform?: string): string {
  if (!transform || transform === "none") return text;
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/\b\w/g, (character) => character.toUpperCase());
  return text;
}
