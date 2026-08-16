import type { PdfBinarySource, PdfGraphic } from "./phase4-types.js";
import type { PdfDocumentPhase6, PdfPhase6DocumentNode } from "./phase6-types.js";
import type { PdfPhase3Style } from "./phase3-types.js";

export interface PdfPhase7AccessibilityOptions {
  lang?: string;
  tagged?: boolean;
}

export interface PdfPhase7FigureNode {
  alt: string;
  format?: "jpeg" | "png" | "svg";
  height: number;
  id?: string;
  lang?: string;
  source: PdfBinarySource;
  style?: PdfPhase3Style;
  type: "figure";
  width: number | string;
}

export interface PdfPhase7GraphicNode {
  alt?: string;
  graphic: PdfGraphic;
  id?: string;
  lang?: string;
  style?: PdfPhase3Style;
  type: "graphic";
}

export interface PdfPhase7ListItemNode {
  id?: string;
  lang?: string;
  text: string;
}

export interface PdfPhase7ListNode {
  id?: string;
  items: PdfPhase7ListItemNode[];
  lang?: string;
  ordered?: boolean;
  style?: PdfPhase3Style;
  type: "list";
}

export type PdfPhase7DocumentNode =
  | PdfPhase7FigureNode
  | PdfPhase7GraphicNode
  | PdfPhase7ListNode
  | PdfPhase6DocumentNode;

export interface PdfDocumentPhase7 extends Omit<PdfDocumentPhase6, "children" | "content"> {
  accessibility?: PdfPhase7AccessibilityOptions;
  children?: PdfPhase7DocumentNode[];
  content?: PdfPhase7DocumentNode[];
}
