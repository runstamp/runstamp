/**
 * textBlock — neutral text container.
 *
 * The foundational primitive for "render some text in a region", without
 * the opinions baked into the specialized text primitives:
 *   - sourceLine forces italic + muted color + footnote prefix
 *   - bannerBand always renders a filled band with inverse-on-accent text
 *   - calloutBox always emits a rounded rect surface
 *
 * textBlock has none of those defaults. Pick the role; pick whether you
 * want a fill, border, or insets; supply text as string / runs / paragraphs.
 * Everything is opt-in.
 *
 * Tokens consumed:
 *   - type.{display,title,body,caption,eyebrow}
 *   - palette.{foreground,muted,faint,accent,accentInverse,accentSecondary}
 *   - canvas.surface
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type {
  BulletConfig,
  Paragraph,
  PrimitiveNode,
  TextNode,
  TextRun,
  ViewNode,
} from "../layout/types.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import { applyTypeTransform } from "../util/estimateText.js";

type Role = "display" | "title" | "body" | "caption" | "eyebrow";
type FillRole =
  | "foreground"
  | "muted"
  | "faint"
  | "accent"
  | "accentSecondary"
  | "surface"
  | "none";
type ColorRole =
  | "foreground"
  | "muted"
  | "faint"
  | "accent"
  | "accentInverse"
  | "accentSecondary";
type BorderRole = "foreground" | "muted" | "faint" | "accent" | "rule";

export interface TextBlockInput {
  /** Text content. Three forms:
   *   - string         → single paragraph; "\n" splits to paragraphs
   *   - TextRun[]      → single paragraph with rich runs
   *   - Paragraph[]    → full multi-paragraph form
   */
  content: string | TextRun[] | Paragraph[];
  /** Type role. Default "body". */
  role?: Role;
  /** Fill color: role keyword or hex. Default "none" (no rect emitted). */
  fill?: FillRole | string;
  /** Border. Width 0 disables. */
  border?: {
    color?: BorderRole | string;
    width?: number;
    style?: "solid" | "dashed" | "dotted";
  };
  /** Insets (px). Default 0 with no fill, 8 with fill. */
  insets?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Text horizontal alignment. Default "left". */
  align?: "left" | "center" | "right";
  /** Text vertical alignment within container. Default "top". */
  verticalAlign?: "top" | "middle" | "bottom";
  /** Text color: role keyword or hex. Default = role-appropriate
   *  (accentInverse on filled bands, foreground otherwise). */
  color?: ColorRole | string;
  /** Italic override (default = role italic). */
  italic?: boolean;
  /** Font weight override (default = role weight). */
  weight?: number;
  /** Font size override in pt (default = role size). */
  size?: number;
  /** Line-height override in pt (default = role lineHeight). Required when
   *  bumping `size` well above the role default — without it, the role's
   *  lineHeight clips tall glyphs and trips TEXT_CLIP. */
  lineHeight?: number;
  /** Rotation in degrees (applied to the text frame). */
  rotation?: number;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isHex(value: string): boolean {
  return HEX_RE.test(value);
}

function resolveFill(
  fill: TextBlockInput["fill"],
  tokens: ResolvedTokens,
): string | null {
  if (!fill || fill === "none") return null;
  if (typeof fill === "string" && isHex(fill)) return fill;
  switch (fill) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "accentSecondary":
      return tokens.palette.accentSecondary ?? tokens.palette.accent;
    case "surface":
      return tokens.canvas.surface;
    default:
      return null;
  }
}

function resolveBorderColor(
  color: BorderRole | string | undefined,
  tokens: ResolvedTokens,
): string {
  if (color && isHex(color)) return color;
  switch (color) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "rule":
    default:
      return tokens.palette.rule;
  }
}

function resolveTextColor(
  color: TextBlockInput["color"],
  tokens: ResolvedTokens,
  hasOpaqueFill: boolean,
): string {
  if (color && typeof color === "string" && isHex(color)) return color;
  switch (color) {
    case "foreground":
      return tokens.palette.foreground;
    case "muted":
      return tokens.palette.muted;
    case "faint":
      return tokens.palette.faint;
    case "accent":
      return tokens.palette.accent;
    case "accentInverse":
      return tokens.palette.accentInverse;
    case "accentSecondary":
      return tokens.palette.accentSecondary ?? tokens.palette.accent;
    default:
      return hasOpaqueFill
        ? tokens.palette.accentInverse
        : tokens.palette.foreground;
  }
}

function resolveTextRunColor(
  color: TextRun["color"],
  tokens: ResolvedTokens,
  hasOpaqueFill: boolean,
): TextRun["color"] {
  if (!color) return undefined;
  if (isHex(color)) return color;
  return resolveTextColor(color as TextBlockInput["color"], tokens, hasOpaqueFill);
}

function resolveTextRunColors(
  runs: TextRun[],
  tokens: ResolvedTokens,
  hasOpaqueFill: boolean,
): TextRun[] {
  return runs.map((run) => {
    const color = resolveTextRunColor(run.color, tokens, hasOpaqueFill);
    return color === run.color ? run : { ...run, ...(color ? { color } : {}) };
  });
}

function resolveParagraphRunColors(
  paragraphs: Paragraph[],
  tokens: ResolvedTokens,
  hasOpaqueFill: boolean,
): Paragraph[] {
  let inheritedAutoNumCount = 0;
  return paragraphs.map((paragraph) => {
    const shouldInherit = shouldInheritTokenBullet(paragraph, tokens);
    if (shouldInherit) inheritedAutoNumCount += 1;
    return {
      ...paragraph,
      ...(shouldInherit
        ? { bullet: tokenParagraphBullet(tokens, inheritedAutoNumCount) }
        : {}),
      runs: resolveTextRunColors(paragraph.runs, tokens, hasOpaqueFill),
    };
  });
}

function shouldInheritTokenBullet(
  paragraph: Paragraph,
  tokens: ResolvedTokens,
): boolean {
  if (paragraph.bullet !== undefined) return false;
  if (tokens.ornament.bullet.marker !== "autoNum") return false;
  return (
    paragraph.level !== undefined ||
    paragraph.indent !== undefined ||
    paragraph.marginLeft !== undefined ||
    paragraph.hangingIndent !== undefined
  );
}

function tokenParagraphBullet(
  tokens: ResolvedTokens,
  startAt: number,
): BulletConfig {
  return {
    type: "autoNum",
    scheme: tokens.ornament.bullet.scheme ?? "arabicPeriod",
    startAt,
  };
}

function isParagraphArray(
  value: string | TextRun[] | Paragraph[],
): value is Paragraph[] {
  return (
    Array.isArray(value)
    && value.length > 0
    && typeof value[0] === "object"
    && value[0] !== null
    && "runs" in (value[0] as object)
  );
}

function isTextRunArray(
  value: string | TextRun[] | Paragraph[],
): value is TextRun[] {
  return (
    Array.isArray(value)
    && value.length > 0
    && typeof value[0] === "object"
    && value[0] !== null
    && "text" in (value[0] as object)
  );
}

function stringToParagraphs(
  content: string,
  transform: "none" | "upper" | "lower" | "title",
): Paragraph[] {
  const lines = content.split("\n");
  return lines.map((line) => ({
    runs: [{ text: applyTypeTransform(line, transform) }],
  }));
}

export const textBlock: Primitive<TextBlockInput> = (input, tokens, region) => {
  const role: Role = input.role ?? "body";
  const roleSpec = tokens.type[role];
  const fill = resolveFill(input.fill, tokens);
  const hasOpaqueFill = fill !== null;
  const borderWidth = input.border?.width ?? (input.border ? 1 : 0);
  const borderColor =
    borderWidth > 0
      ? resolveBorderColor(input.border?.color, tokens)
      : undefined;
  const borderStyle = input.border?.style ?? "solid";

  const insetDefault = hasOpaqueFill || borderWidth > 0 ? 8 : 0;
  const insetTop = input.insets?.top ?? insetDefault;
  const insetRight = input.insets?.right ?? insetDefault;
  const insetBottom = input.insets?.bottom ?? insetDefault;
  const insetLeft = input.insets?.left ?? insetDefault;

  const nodes: PrimitiveNode[] = [];

  if (hasOpaqueFill || borderWidth > 0) {
    const surface: ViewNode = {
      kind: "view",
      shape: "rect",
      rect: { ...region },
      ...(fill ? { fill } : {}),
      ...(borderWidth > 0 && borderColor
        ? { border: { width: borderWidth, color: borderColor, style: borderStyle } }
        : {}),
      decorative: false,
      zIndex: 0,
    };
    nodes.push(surface);
  }

  const textRect = {
    left: region.left + insetLeft,
    top: region.top + insetTop,
    width: Math.max(0, region.width - insetLeft - insetRight),
    height: Math.max(0, region.height - insetTop - insetBottom),
  };

  const textColor = resolveTextColor(input.color, tokens, hasOpaqueFill);

  const text: TextNode = {
    kind: "text",
    rect: textRect,
    style: {
      family: roleSpec.family,
      weight: input.weight ?? roleSpec.weight,
      size: input.size ?? roleSpec.size,
      lineHeight: input.lineHeight ?? roleSpec.lineHeight,
      letterSpacing: roleSpec.letterSpacing,
      italic: input.italic ?? roleSpec.italic,
      color: textColor,
      align: input.align ?? "left",
      verticalAlign: input.verticalAlign ?? "top",
    },
    autoFit: false,
    ...(hasOpaqueFill ? { zIndex: 1 } : {}),
    ...(input.rotation !== undefined ? { rotation: input.rotation } : {}),
  };

  let hasTextContent = true;
  if (typeof input.content === "string") {
    hasTextContent = input.content.length > 0;
    if (hasTextContent && input.content.includes("\n")) {
      text.paragraphs = stringToParagraphs(input.content, roleSpec.transform);
    } else if (hasTextContent) {
      text.content = applyTypeTransform(input.content, roleSpec.transform);
    }
  } else if (isParagraphArray(input.content)) {
    text.paragraphs = resolveParagraphRunColors(input.content, tokens, hasOpaqueFill);
  } else if (isTextRunArray(input.content)) {
    text.runs = resolveTextRunColors(input.content, tokens, hasOpaqueFill);
  } else {
    hasTextContent = false;
  }

  if (hasTextContent) nodes.push(text);

  const overflow: PrimitiveResult["overflow"] = { kind: "fit" };
  return { nodes, overflow };
};
