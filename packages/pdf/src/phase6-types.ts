import type { PdfDocumentPhase3, PdfDocumentLayoutNode, PdfPhase3Link, PdfPhase3Style } from "./phase3-types.js";

export interface PdfPhase6TocNode {
  fontSize?: number;
  id?: string;
  indentPerLevel?: number;
  lineHeight?: number;
  maxLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: PdfPhase3Style;
  title?: string;
  titleFontSize?: number;
  type: "toc";
}

export interface PdfPhase6TextFieldNode {
  calculate?: string;
  fontColor?: string;
  fontSize?: number;
  height?: number;
  label?: string;
  maxLength?: number;
  multiline?: boolean;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  tooltip?: string;
  tabOrder?: number;
  style?: PdfPhase3Style;
  type: "form-text";
  value?: string;
  width?: number | string;
}

export interface PdfPhase6CheckboxNode {
  calculate?: string;
  checked?: boolean;
  fontColor?: string;
  label?: string;
  name: string;
  size?: number;
  readOnly?: boolean;
  required?: boolean;
  tabOrder?: number;
  tooltip?: string;
  style?: PdfPhase3Style;
  type: "form-checkbox";
}

export interface PdfPhase6DropdownNode {
  calculate?: string;
  fontColor?: string;
  fontSize?: number;
  height?: number;
  label?: string;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  options: string[];
  tabOrder?: number;
  tooltip?: string;
  style?: PdfPhase3Style;
  type: "form-dropdown";
  value?: string;
  width?: number | string;
}

export interface PdfPhase6RadioButtonNode {
  calculate?: string;
  checked?: boolean;
  fontColor?: string;
  label?: string;
  name: string;
  group: string;
  readOnly?: boolean;
  required?: boolean;
  size?: number;
  tabOrder?: number;
  tooltip?: string;
  style?: PdfPhase3Style;
  type: "form-radio";
  value: string;
}

export interface PdfPhase6SignatureFieldNode {
  fieldName: string;
  fontColor?: string;
  fontSize?: number;
  height?: number;
  label?: string;
  mode?: "digital" | "visual";
  style?: PdfPhase3Style;
  tabOrder?: number;
  tooltip?: string;
  type: "form-signature";
  value?: string;
  width?: number | string;
}

export interface PdfPhase6NoteAnnotationNode {
  contents: string;
  height?: number;
  open?: boolean;
  style?: PdfPhase3Style;
  title?: string;
  type: "note-annotation";
  width?: number | string;
}

export interface PdfPhase6HighlightAnnotationNode {
  contents?: string;
  style?: PdfPhase3Style;
  target: string;
  type: "highlight-annotation";
}

export interface PdfPhase6PageLabel {
  prefix?: string;
  startNumber?: number;
  startPage: number;
  style: "arabic" | "roman-lower" | "roman-upper";
}

export interface PdfPhase6PageNumberOptions {
  fontSize?: number;
  format?: string;
  x?: number;
  y?: number;
}

export interface PdfPhase6BookmarkOptions {
  fromHeadings?: boolean;
}

export type PdfPhase6DocumentNode =
  | PdfDocumentLayoutNode
  | PdfPhase6CheckboxNode
  | PdfPhase6DropdownNode
  | PdfPhase6HighlightAnnotationNode
  | PdfPhase6NoteAnnotationNode
  | PdfPhase6RadioButtonNode
  | PdfPhase6SignatureFieldNode
  | PdfPhase6TextFieldNode
  | PdfPhase6TocNode;

export type PdfDynamicHeaderFooterContent = string | PdfDocumentLayoutNode[];

/** Standard report header/footer zones. Each zone is aligned within one third of the configured region. */
export interface PdfDynamicHeaderFooterZones {
  center?: string;
  left?: string;
  right?: string;
}

export type PdfDynamicHeaderFooterConfiguredContent =
  | PdfDynamicHeaderFooterContent
  | PdfDynamicHeaderFooterZones;

export interface PdfDynamicHeaderFooterOptions {
  content: PdfDynamicHeaderFooterConfiguredContent;
  fontSize?: number;
  height?: number;
  /** Omit this running region from page 1 while retaining its reserved body space. */
  skipFirstPage?: boolean;
  width?: number;
  x?: number;
  y?: number;
}

export interface PdfDynamicHeaderOptions extends PdfDynamicHeaderFooterOptions {
  y?: number; // default: page height - 36 (top margin area)
}

export interface PdfDynamicFooterOptions extends PdfDynamicHeaderFooterOptions {
  y?: number; // default: 24 (bottom margin area)
}

export interface PdfDocumentPhase6 extends Omit<PdfDocumentPhase3, "children" | "content"> {
  bookmarks?: PdfPhase6BookmarkOptions;
  children?: PdfPhase6DocumentNode[];
  content?: PdfPhase6DocumentNode[];
  dynamicHeader?: PdfDynamicHeaderOptions;
  dynamicFooter?: PdfDynamicFooterOptions;
  pageLabels?: PdfPhase6PageLabel[];
  pageNumber?: PdfPhase6PageNumberOptions;
}

export function isPdfPhase6SpecialNode(node: PdfPhase6DocumentNode): node is Exclude<PdfPhase6DocumentNode, PdfDocumentLayoutNode> {
  return [
    "form-checkbox",
    "form-dropdown",
    "form-text",
    "form-radio",
    "form-signature",
    "highlight-annotation",
    "note-annotation",
    "toc",
  ].includes(node.type);
}

export function hasPhase6Link(value: PdfPhase3Link | undefined): boolean {
  return Boolean(value && (value.kind === "external" || value.kind === "internal"));
}
