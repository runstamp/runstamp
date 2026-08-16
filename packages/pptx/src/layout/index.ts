// src/layout/index.ts — Yoga layout public API

import type { PaperNode, PaperSlide } from "../types/ast.js";
import type { Node as YogaNode } from "yoga-wasm-web";
import { getYoga } from "./yoga.js";
import { buildYogaTree, detectRtl } from "./build.js";
import { extractAbsoluteLayout } from "./extract.js";
import { getLogger } from "../logger.js";
import { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } from "../ooxml/constants.js";

export type { LayoutMetrics, LayoutNode } from "./extract.js";
export { getYoga, applyStyleToNode } from "./yoga.js";
export { buildYogaTree, detectRtl } from "./build.js";
export { extractAbsoluteLayout } from "./extract.js";
export { applyGhostGrid } from "./ghostGrid.js";

/** Recursively free a yoga node tree without reading layout values. */
function freeYogaTree(node: YogaNode): void {
  const childCount = node.getChildCount();
  const children: YogaNode[] = [];
  for (let i = 0; i < childCount; i++) {
    children.push(node.getChild(i));
  }
  for (const child of children) {
    freeYogaTree(child);
  }
  node.free();
}

// Runs the full layout pipeline on a single slide or any container node.
export async function runLayoutOnNode(
  astNode: PaperSlide | PaperNode,
  width: number,
  height: number,
): Promise<import("./extract.js").LayoutNode> {
  const yoga = await getYoga();
  const rootNode = buildYogaTree(astNode, yoga, width);
  try {
    const t0 = performance.now();
    const direction = detectRtl(astNode) ? yoga.DIRECTION_RTL : yoga.DIRECTION_LTR;
    rootNode.calculateLayout(width, height, direction);
    getLogger().metric?.("yoga.calculateLayout", performance.now() - t0, { width: String(width), height: String(height) });
    return extractAbsoluteLayout(astNode, rootNode);
  } catch (err) {
    freeYogaTree(rootNode);
    throw err;
  }
}

// Convenience wrapper for a full slide (default 960x540).
export async function runLayout(
  slide: PaperSlide,
  width: number = DEFAULT_SLIDE_WIDTH_PX,
  height: number = DEFAULT_SLIDE_HEIGHT_PX,
): Promise<import("./extract.js").LayoutNode> {
  return runLayoutOnNode(slide, width, height);
}
