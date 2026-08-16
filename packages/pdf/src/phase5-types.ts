import type { PdfColor } from "./phase4-types.js";
import type {
  PdfPhase3ContainerNode,
  PdfPhase3HeadingNode,
  PdfPhase3ParagraphNode,
  PdfPhase3PreformattedNode,
  PdfPhase3Style,
} from "./phase3-types.js";

export interface PdfPhase5Border {
  color: PdfColor;
  style?: "dashed" | "dotted" | "double" | "none" | "solid";
  width?: number;
}

export interface PdfPhase5TableColumn {
  maxWidth?: number;
  minWidth?: number;
  width?: number | string;
}

export interface PdfPhase5CellStyle {
  backgroundColor?: PdfColor;
  borderBottom?: PdfPhase5Border;
  borderLeft?: PdfPhase5Border;
  borderRight?: PdfPhase5Border;
  borderTop?: PdfPhase5Border;
  minHeight?: number;
  padding?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  verticalAlign?: "bottom" | "middle" | "top";
}

export interface PdfPhase5RowStyle {
  backgroundColor?: PdfColor;
}

export interface PdfPhase5TableStyle extends PdfPhase3Style {
  backgroundColor?: PdfColor;
  borderBottom?: PdfPhase5Border;
  borderCollapse?: "collapse";
  borderLeft?: PdfPhase5Border;
  borderRight?: PdfPhase5Border;
  borderTop?: PdfPhase5Border;
}

export type PdfPhase5CellContentNode =
  | PdfPhase3ContainerNode
  | PdfPhase3HeadingNode
  | PdfPhase3ParagraphNode
  | PdfPhase3PreformattedNode
  | PdfPhase5TableNode;

export interface PdfPhase5TableCell {
  children: PdfPhase5CellContentNode[];
  colSpan?: number;
  role?: "td" | "th";
  rowSpan?: number;
  style?: PdfPhase5CellStyle;
}

export interface PdfPhase5TableRow {
  cells: PdfPhase5TableCell[];
  keepTogether?: boolean;
  style?: PdfPhase5RowStyle;
}

export interface PdfPhase5TableNode {
  body: PdfPhase5TableRow[];
  borderCollapse?: "collapse";
  columns?: PdfPhase5TableColumn[];
  footer?: PdfPhase5TableRow[];
  header?: PdfPhase5TableRow[];
  style?: PdfPhase5TableStyle;
  type: "table";
}
