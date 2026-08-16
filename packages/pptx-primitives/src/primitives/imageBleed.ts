/**
 * imageBleed — photography-first content. Full / half / quarter / inline.
 *
 * Reads photo.enabled, photo.defaultBleed, photo.scrim, photo.scrimOpacity.
 * When photo.enabled = false, the primitive degrades gracefully:
 *   - If the input supplies `fallbackText`, it emits a text block instead.
 *   - Otherwise it emits nothing (caller is responsible for laying out
 *     something else in the vacated region).
 *
 * The `bleed` input overrides the token default, letting a single slide
 * opt for a full-bleed hero while the bundle defaults to half-bleed.
 *
 * Scrim: an optional flat translucent overlay for text-over-image
 * legibility. Scrim opacity is a token; direction ("light" / "dark") is
 * the overlay color. No gradient scrims — a deliberate ban (see memory
 * `feedback_aesthetic_bans`).
 *
 * Content adaptation: none. The image fills its region; callers size the
 * region.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { ImageNode, PrimitiveNode, Rect, TextNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import { applyTypeTransform } from "../util/estimateText.js";

export interface ImageBleedInput {
  /** Image src: data: URI or https:// URL. */
  src?: string;
  /** Alt text for a11y. */
  alt?: string;
  /** Crop as fractions [0–1] of the source image. */
  crop?: { left: number; top: number; right: number; bottom: number };
  /** Override the token default bleed for this one slide. */
  bleed?: ResolvedTokens["photo"]["defaultBleed"];
  /** When photo.enabled = false, emit this text centered in the region. */
  fallbackText?: string;
  /** Optional text to place over the image (paired with a scrim). */
  overlay?: {
    text: string;
    role?: keyof ResolvedTokens["type"];
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
  };
}

export const imageBleed: Primitive<ImageBleedInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];

  if (!tokens.photo.enabled || !input.src) {
    if (input.fallbackText) {
      nodes.push(makeFallbackText(input.fallbackText, tokens, region));
      return { nodes, overflow: { kind: "fit" } };
    }
    return { nodes: [], overflow: { kind: "fit" } };
  }

  const image: ImageNode = {
    kind: "image",
    rect: region,
    src: input.src,
    alt: input.alt,
    crop: input.crop,
    opacity: 1.0,
    zIndex: 1,
  };
  nodes.push(image);

  const scrimColor = resolveScrimColor(tokens.photo.scrim, tokens);
  if (scrimColor !== null && tokens.photo.scrimOpacity > 0) {
    const scrim: ViewNode = {
      kind: "view",
      shape: "rect",
      decorative: true,
      rect: region,
      zIndex: 2,
      // Bake opacity into the hex via alpha channel; engine supports #RRGGBBAA.
      fill: applyAlpha(scrimColor, tokens.photo.scrimOpacity),
    };
    nodes.push(scrim);
  }

  if (input.overlay) {
    const overlayNode = makeOverlayText(input.overlay, tokens, region);
    overlayNode.zIndex = 3;
    nodes.push(overlayNode);
  }

  return { nodes, overflow: { kind: "fit" } };
};

// ---------------------------------------------------------------------------
// Region helpers: translate a bleed kind to a slide region. The primitive
// itself takes the region directly, but this helper is exposed for
// composition callers that want to ask "what region does 'half-left'
// occupy on a 960×540 slide with outer margin M?".
// ---------------------------------------------------------------------------

export function regionForBleed(
  bleed: ResolvedTokens["photo"]["defaultBleed"],
  slide: { width: number; height: number },
  margin: number,
): Rect {
  switch (bleed) {
    case "full":
      return { left: 0, top: 0, width: slide.width, height: slide.height };
    case "half":
      // "half" defaults to left-half; callers that want right-half compose
      // via splitComposition with image on the right panel.
      return { left: 0, top: 0, width: slide.width / 2, height: slide.height };
    case "quarter":
      return { left: 0, top: 0, width: slide.width / 2, height: slide.height / 2 };
    case "inline":
      return {
        left: margin,
        top: margin,
        width: slide.width - margin * 2,
        height: slide.height - margin * 2,
      };
    case "none":
    default:
      return { left: margin, top: margin, width: 0, height: 0 };
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function resolveScrimColor(
  kind: ResolvedTokens["photo"]["scrim"],
  tokens: ResolvedTokens,
): string | null {
  switch (kind) {
    case "light": return "#FFFFFF";
    case "dark":  return "#000000";
    case "none":
    default: return null;
  }
}

/** Accepts #RRGGBB, appends alpha; if already #RRGGBBAA, replaces alpha. */
function applyAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  const hex = a.toString(16).padStart(2, "0");
  if (/^#[0-9a-fA-F]{6}$/u.test(color)) return `${color}${hex}`;
  if (/^#[0-9a-fA-F]{8}$/u.test(color)) return `${color.slice(0, 7)}${hex}`;
  return color;
}

function makeFallbackText(
  content: string,
  tokens: ResolvedTokens,
  region: Rect,
): TextNode {
  const role = tokens.type.caption;
  return {
    kind: "text",
    rect: region,
    content: applyTypeTransform(content, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.faint,
      align: "center",
      verticalAlign: "middle",
    },
    autoFit: false,
  };
}

function makeOverlayText(
  overlay: Required<Pick<ImageBleedInput, "overlay">>["overlay"],
  tokens: ResolvedTokens,
  region: Rect,
): TextNode {
  const roleKey = overlay.role ?? "display";
  const role = tokens.type[roleKey];
  return {
    kind: "text",
    rect: region,
    content: applyTypeTransform(overlay.text, role.transform),
    style: {
      family: role.family,
      weight: role.weight,
      size: role.size,
      lineHeight: role.lineHeight,
      letterSpacing: role.letterSpacing,
      italic: role.italic,
      color: tokens.palette.accentInverse,
      align: overlay.align ?? "center",
      verticalAlign: overlay.verticalAlign ?? "middle",
    },
    autoFit: false,
  };
}
