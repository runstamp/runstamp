import type { PaperDocument, PaperNode, PaperText, PaperView, PaperImage } from "../types/ast.js";
import { getLogger } from "../logger.js";
import { isLiteBundle } from "../engineMode.js";

export interface RenderabilityWarning {
  message: string;
  nodePath: string;
  nodeType: PaperNode["type"];
  propertyPath: string;
}

interface RenderabilityRule {
  applies(node: PaperNode): boolean;
  message: string;
  nodeType: PaperNode["type"];
  propertyPath: string;
}

const CHECKED_DOCUMENTS = new WeakSet<PaperDocument>();

// Known silent-drop properties: Zod accepts them but the PPTX writer
// produces no corresponding output bytes without a sibling property.
// Each rule fires a warning via the logger at compile time so users
// (and LLM agents) know before they ship a deck.
const RENDERABILITY_RULES: readonly RenderabilityRule[] = [
  {
    nodeType: "Text",
    propertyPath: "style.textWarp",
    message:
      "Text word-art warping is accepted by schema but not emitted by the PPTX writer in the size-constrained lite bundle; remove `textWarp`, or use the full engine entry point.",
    applies(node): boolean {
      if (node.type !== "Text" || !isLiteBundle()) {
        return false;
      }
      const textNode = node as PaperText;
      return Boolean(textNode.style?.textWarp && textNode.style.textWarp !== "textNoShape");
    },
  },
  {
    nodeType: "View",
    propertyPath: "textStyle.textWarp",
    message:
      "View shape text warping is accepted by schema but not emitted by the PPTX writer in the size-constrained lite bundle; remove `textWarp`, or use the full engine entry point.",
    applies(node): boolean {
      if (node.type !== "View" || !isLiteBundle()) {
        return false;
      }
      const viewNode = node as PaperView;
      return Boolean(viewNode.textStyle?.textWarp && viewNode.textStyle.textWarp !== "textNoShape");
    },
  },
  {
    nodeType: "Text",
    propertyPath: "style.textDecorationStyle",
    message:
      "`textDecorationStyle` only emits when paired with `textDecorationLine`. Set `textDecorationLine: \"underline\"` or `\"strikethrough\"` alongside the style, or remove `textDecorationStyle`.",
    applies(node): boolean {
      if (node.type !== "Text") return false;
      const textNode = node as PaperText;
      const hasStyle = textNode.style?.textDecorationStyle !== undefined;
      const hasLine =
        textNode.style?.textDecorationLine !== undefined
        && textNode.style.textDecorationLine !== "none";
      return hasStyle && !hasLine;
    },
  },
  {
    nodeType: "View",
    propertyPath: "textStyle.textDecorationStyle",
    message:
      "`textDecorationStyle` on View.textStyle only emits when paired with `textDecorationLine`. Set both or remove the standalone style.",
    applies(node): boolean {
      if (node.type !== "View") return false;
      const viewNode = node as PaperView;
      const hasStyle = viewNode.textStyle?.textDecorationStyle !== undefined;
      const hasLine =
        viewNode.textStyle?.textDecorationLine !== undefined
        && viewNode.textStyle.textDecorationLine !== "none";
      return hasStyle && !hasLine;
    },
  },
  {
    nodeType: "Text",
    propertyPath: "style.lineHeight",
    message:
      "`lineHeight` values below 0.1 or above 1000 are clamped by PowerPoint and likely indicate a unit mismatch. Use a ratio (e.g. 1.5) or an absolute value in the API's documented unit.",
    applies(node): boolean {
      if (node.type !== "Text") return false;
      const textNode = node as PaperText;
      const lh = textNode.style?.lineHeight;
      if (lh === undefined) return false;
      return lh <= 0 || lh > 1000;
    },
  },
  {
    nodeType: "View",
    propertyPath: "style.borderRadius",
    message:
      "`borderRadius` on View is honored via `roundRect` geometry, but `shapeType` is already set — the explicit `shapeType` wins and `borderRadius` is ignored. Pick one.",
    applies(node): boolean {
      if (node.type !== "View") return false;
      const viewNode = node as PaperView;
      return (
        viewNode.style?.borderRadius !== undefined
        && viewNode.style.borderRadius > 0
        && viewNode.shapeType !== undefined
        && viewNode.shapeType !== "rect"
      );
    },
  },
  {
    nodeType: "Image",
    propertyPath: "borderRadius",
    message:
      "Negative or non-finite `borderRadius` on Image is ignored by the writer. Use a positive pixel value or remove the property.",
    applies(node): boolean {
      if (node.type !== "Image") return false;
      const img = node as PaperImage;
      if (img.borderRadius === undefined) return false;
      return !Number.isFinite(img.borderRadius) || img.borderRadius < 0;
    },
  },
  {
    nodeType: "View",
    propertyPath: "style.opacity",
    message:
      "`opacity` outside the 0..1 range is clamped by the writer; values > 1 or < 0 indicate a unit mismatch (percentage vs ratio).",
    applies(node): boolean {
      if (node.type !== "View") return false;
      const viewNode = node as PaperView;
      const op = viewNode.style?.opacity;
      return op !== undefined && (op < 0 || op > 1);
    },
  },
  {
    nodeType: "Text",
    propertyPath: "style.opacity",
    message:
      "`opacity` outside the 0..1 range is clamped by the writer; values > 1 or < 0 indicate a unit mismatch (percentage vs ratio).",
    applies(node): boolean {
      if (node.type !== "Text") return false;
      const textNode = node as PaperText;
      const op = textNode.style?.opacity;
      return op !== undefined && (op < 0 || op > 1);
    },
  },
  {
    nodeType: "View",
    propertyPath: "style.rotation",
    message:
      "`rotation` outside -360..360 is effectively taken modulo 360 by PowerPoint; large values are almost always a bug.",
    applies(node): boolean {
      if (node.type !== "View") return false;
      const viewNode = node as PaperView;
      const rot = viewNode.style?.rotation;
      return rot !== undefined && (rot > 360 || rot < -360);
    },
  },
] as const;

function hasChildren(node: PaperNode): node is PaperNode & { children: PaperNode[] } {
  return "children" in node && Array.isArray(node.children);
}

function collectNodeWarnings(node: PaperNode, nodePath: string, warnings: RenderabilityWarning[]): void {
  for (const rule of RENDERABILITY_RULES) {
    if (rule.nodeType !== node.type || !rule.applies(node)) {
      continue;
    }

    warnings.push({
      nodePath,
      nodeType: node.type,
      propertyPath: rule.propertyPath,
      message: rule.message,
    });
  }

  if (!hasChildren(node)) {
    return;
  }

  node.children.forEach((child, index) => {
    collectNodeWarnings(child, `${nodePath}.children[${index}]`, warnings);
  });
}

/**
 * Collect the properties the PPTX writer accepts but silently drops.
 *
 * `onWarning` is the caller-visible channel. Until it existed these warnings
 * reached a logger and nothing else, so a deck could lose word-art warping or a
 * shadow and report success with nothing recorded anywhere — the "plausible
 * output, empty ledger" condition OC-1 C11 exists to catch.
 *
 * The already-checked set now suppresses only the *log* line. It used to
 * suppress the whole pass, which made a second render of the same document
 * object report no warnings at all — and that would break C12, which requires
 * identical input to yield an identical loss array every time.
 */
export function emitRenderabilityWarnings(
  document: PaperDocument,
  onWarning?: (warning: RenderabilityWarning) => void,
): RenderabilityWarning[] {
  const warnings: RenderabilityWarning[] = [];
  document.slides.forEach((slide, slideIndex) => {
    slide.children.forEach((child, childIndex) => {
      collectNodeWarnings(child, `slides[${slideIndex}].children[${childIndex}]`, warnings);
    });
  });

  if (!CHECKED_DOCUMENTS.has(document)) {
    warnings.forEach((warning) => {
      getLogger().warn(
        `[renderability] ${warning.nodePath}.${warning.propertyPath}: ${warning.message}`,
      );
    });
    CHECKED_DOCUMENTS.add(document);
  }

  if (onWarning !== undefined) {
    warnings.forEach(onWarning);
  }
  return warnings;
}
