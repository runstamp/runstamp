// src/layout/extract.ts — Converts Yoga's parent-relative output into
// slide-absolute coordinates for OOXML translation.

import type {
  PaperNode, PaperSlide, PaperView, PaperText, PaperImage,
  PaperTable, PaperChart, PaperGroup, PaperConnector,
  PaperVideo, PaperAudio,
} from "../types/ast.js";
import type { Node as YogaNode } from "yoga-wasm-web";
import type { LayoutRuntimeProps } from "../compatibility/shared.js";
import { getSingleLineShrinkWrappedWidth } from "./measureBridge.js";
export type {
  CompatibilityIssue,
  InternalAutoFitPolicy,
  LayoutCompatibilityMeta,
  PptxCompatibilityMode,
  TextCompositionMode,
} from "../compatibility/shared.js";

export interface LayoutMetrics {
  x: number; // Absolute to the slide canvas
  y: number; // Absolute to the slide canvas
  width: number;
  height: number;
}

// Base layout extension shared by all LayoutNode variants.
// Uses interface to break circularity with the LayoutNode union.
export interface LayoutNodeBase extends LayoutRuntimeProps {
  layout: LayoutMetrics;
  children?: LayoutNode[];
}

// Extends the original AST node with its calculated absolute layout bounds.
// Distributed union enables TypeScript discriminant narrowing on node.type.
export type LayoutNode =
  | (Omit<PaperView, "children"> & LayoutNodeBase)
  | (Omit<PaperText, "children"> & LayoutNodeBase)
  | (PaperImage & LayoutNodeBase)
  | (PaperTable & LayoutNodeBase)
  | (PaperChart & LayoutNodeBase)
  | (Omit<PaperGroup, "children"> & LayoutNodeBase)
  | (PaperConnector & LayoutNodeBase)
  | (PaperVideo & LayoutNodeBase)
  | (PaperAudio & LayoutNodeBase)
  | (Omit<PaperSlide, "children"> & LayoutNodeBase);

// Convenience aliases for emitter function signatures
export type LayoutView = Omit<PaperView, "children"> & LayoutNodeBase;
export type LayoutText = Omit<PaperText, "children"> & LayoutNodeBase;
export type LayoutImage = PaperImage & LayoutNodeBase;
export type LayoutTable = PaperTable & LayoutNodeBase;
export type LayoutChart = PaperChart & LayoutNodeBase;
export type LayoutGroup = Omit<PaperGroup, "children"> & LayoutNodeBase;
export type LayoutConnector = PaperConnector & LayoutNodeBase;
export type LayoutVideo = PaperVideo & LayoutNodeBase;
export type LayoutAudio = PaperAudio & LayoutNodeBase;
export type LayoutSlide = Omit<PaperSlide, "children"> & LayoutNodeBase;

export function extractAbsoluteLayout(
  astNode: PaperSlide | PaperNode,
  yogaNode: YogaNode,
  parentX: number = 0,
  parentY: number = 0,
): LayoutNode {
  const localX = yogaNode.getComputedLeft();
  const localY = yogaNode.getComputedTop();
  const width = yogaNode.getComputedWidth();
  const height = yogaNode.getComputedHeight();

  // The critical math: Yoga returns parent-relative coords; OOXML needs
  // coordinates absolute to the top-left of the slide canvas.
  const absoluteX = parentX + localX;
  const absoluteY = parentY + localY;

  const layout: LayoutMetrics = { x: absoluteX, y: absoluteY, width, height };
  // Deep-clone tableData to prevent ghost grid mutations from leaking back
  // to the original AST (columns are mutated in-place during grid snapping).
  const tableData = (astNode as { tableData?: unknown }).tableData;
  const clonedTableData = tableData ? structuredClone(tableData) : undefined;
  const singleLineShrinkWrappedWidth = astNode.type === "Text"
    ? getSingleLineShrinkWrappedWidth(astNode, width)
    : undefined;
  const intrinsicTextLayout = singleLineShrinkWrappedWidth !== undefined
    ? { _singleLineShrinkWrappedWidth: singleLineShrinkWrappedWidth }
    : {};
  const spread = clonedTableData !== undefined
    ? { ...astNode, layout, tableData: clonedTableData, ...intrinsicTextLayout }
    : { ...astNode, layout, ...intrinsicTextLayout };
  const result = spread as LayoutNode;

  try {
    if (astNode.type === "View" || astNode.type === "Slide" || astNode.type === "Group") {
      const children =
        (astNode as { children?: PaperNode[] }).children ?? [];
      // Collect all child yoga node references BEFORE processing any children.
      // Freeing a child yoga node during extractAbsoluteLayout can invalidate
      // the parent's internal child list in yoga-wasm-web, causing getChild()
      // to return null for subsequent siblings.
      const childYogaNodes = children.map((_, index) => yogaNode.getChild(index));
      result.children = children.map((childAst, index) => {
        return extractAbsoluteLayout(childAst, childYogaNodes[index], absoluteX, absoluteY);
      });
    }
  } finally {
    // Release the WASM C++ memory to prevent heap growth even on exceptions.
    yogaNode.free();
  }

  return result;
}
