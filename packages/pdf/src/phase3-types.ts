import type { PdfFontInput } from "./font-embedding.js";
import type { PdfGraphic } from "./phase4-types.js";
import type { PdfPhase5TableNode } from "./phase5-types.js";

export type PdfPhase3Size = "A4" | "Letter" | "a4" | "letter" | { height: number; width: number };

export interface PdfPhase3Margins {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface PdfPhase3Page {
  margin?: number | Partial<PdfPhase3Margins>;
  size?: PdfPhase3Size;
}

export interface PdfPhase3Style {
  alignItems?: "center" | "flex-end" | "flex-start" | "stretch";
  alignSelf?: "center" | "flex-end" | "flex-start" | "stretch";
  bottom?: number;
  columnGap?: number;
  flexBasis?: number | string;
  flexDirection?: "column" | "row";
  flexGrow?: number;
  flexShrink?: number;
  flexWrap?: "nowrap" | "wrap";
  gap?: number;
  height?: number | string;
  justifyContent?: "center" | "flex-end" | "flex-start" | "space-around" | "space-between";
  left?: number;
  margin?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  maxHeight?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  minWidth?: number | string;
  padding?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  position?: "absolute" | "relative";
  right?: number;
  rowGap?: number;
  top?: number;
  width?: number | string;
}

export interface PdfPhase3WidowOrphan {
  minLinesAfterBreak?: number;
  minLinesBeforeBreak?: number;
}

export interface PdfPhase3ExternalLink {
  kind: "external";
  url: string;
}

export interface PdfPhase3InternalLink {
  kind: "internal";
  target: string;
}

export type PdfPhase3Link = PdfPhase3ExternalLink | PdfPhase3InternalLink;

export interface PdfPhase3TextBase {
  direction?: "auto" | "ltr" | "rtl";
  font?: PdfFontInput;
  fontSize?: number;
  id?: string;
  lang?: string;
  lineHeight?: number;
  link?: PdfPhase3Link;
  style?: PdfPhase3Style;
  text?: string;
  textAlign?: "center" | "justify" | "left" | "right";
  value?: string;
  widowOrphan?: PdfPhase3WidowOrphan;
}

export interface PdfPhase3ParagraphNode extends PdfPhase3TextBase {
  type: "paragraph";
}

export interface PdfPhase3HeadingNode extends PdfPhase3TextBase {
  keepWithNext?: boolean;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  type: "heading";
}

export interface PdfPhase3ContainerNode {
  children: PdfDocumentLayoutNode[];
  graphics?: PdfGraphic[];
  id?: string;
  lang?: string;
  style?: PdfPhase3Style;
  type: "container";
}

export interface PdfPhase3PreformattedNode extends PdfPhase3TextBase {
  type: "preformatted";
}

export interface PdfPhase3DividerNode {
  id?: string;
  lang?: string;
  style?: PdfPhase3Style;
  type: "divider";
}

export interface PdfPhase3PageBreakNode {
  id?: string;
  style?: PdfPhase3Style;
  type: "page-break";
}

export type PdfPhase3Node =
  | PdfPhase3ContainerNode
  | PdfPhase3DividerNode
  | PdfPhase3HeadingNode
  | PdfPhase3PageBreakNode
  | PdfPhase3ParagraphNode
  | PdfPhase3PreformattedNode;
export type PdfDocumentLayoutNode = PdfPhase3Node | PdfPhase5TableNode;

export interface PdfDocumentPhase3 {
  children?: PdfDocumentLayoutNode[];
  content?: PdfDocumentLayoutNode[];
  meta?: {
    author?: string;
    creationDate?: Date | string;
    creator?: string;
    keywords?: string[];
    modDate?: Date | string;
    producer?: string;
    subject?: string;
    title?: string;
  };
  page?: PdfPhase3Page;
}
