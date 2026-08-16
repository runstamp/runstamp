// src/layout/build.ts — Recursively maps PaperAST nodes into Yoga node tree

import type { Yoga, Node as YogaNode } from "yoga-wasm-web";
import type { PaperNode, PaperSlide, PaperText, PaperView, TextStyle } from "../types/ast.js";
import { applyStyleToNode } from "./yoga.js";
import { attachMeasureFunction } from "./measureBridge.js";
import { precomputeShapedSegments } from "../typography/segmentCache.js";

/**
 * Walk the AST tree and return true if any text node (PaperText via style,
 * or PaperView via textStyle) has rtl === true.
 */
export function detectRtl(astNode: PaperSlide | PaperNode): boolean {
  switch (astNode.type) {
    case "Text":
      if ((astNode.style as TextStyle | undefined)?.rtl) return true;
      break;
    case "View":
      if ((astNode as PaperView).textStyle?.rtl) return true;
      // fall through to scan children
    // eslint-disable-next-line no-fallthrough
    case "Group":
    case "Slide":
      for (const child of (astNode as { children?: PaperNode[] }).children ?? []) {
        if (detectRtl(child)) return true;
      }
      break;
  }
  return false;
}

export function buildYogaTree(
  astNode: PaperSlide | PaperNode,
  yoga: Yoga,
  slideWidth?: number,
): YogaNode {
  const node = yoga.Node.create();

  if (astNode.style) {
    applyStyleToNode(node, astNode.style, yoga);
  }

  switch (astNode.type) {
    case "Slide":
    case "View":
    case "Group": {
      const children =
        (astNode as { children?: PaperNode[] }).children ?? [];
      children.forEach((child, index) => {
        const childNode = buildYogaTree(child, yoga, slideWidth);
        node.insertChild(childNode, index);
      });
      break;
    }
    case "Text":
      // Phase A+B: pre-compute UAX#14 segments + HarfBuzz shaping BEFORE
      // Yoga fires the synchronous MeasureFunc callback.
      precomputeShapedSegments(astNode as PaperText);
      attachMeasureFunction(node, astNode as PaperText, slideWidth);
      break;
    case "Image":
      // Leaf node — dimensions must be set via style; no children.
      break;
    case "Table":
      // Leaf node — tableData holds content; dimensions set via style.
      break;
    case "Chart":
      // Leaf node — chartData holds content; dimensions set via style.
      break;
    case "Connector":
      // Absolute-positioned from start/end — layout computed outside Yoga
      break;
    case "Video":
    case "Audio":
      // Leaf nodes — media reference; dimensions set via style.
      break;
  }

  return node;
}
