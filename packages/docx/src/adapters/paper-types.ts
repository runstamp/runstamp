/**
 * Minimal structural interfaces mirroring @runstamp/pptx's PaperDocument types.
 *
 * Uses TypeScript structural subtyping so any real PaperDocument from
 * @runstamp/pptx is assignable without casting or importing core.
 */

// =============================================================================
// DOCUMENT
// =============================================================================

export interface PaperDocumentInput {
  meta?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
  };
  slides: PaperSlideInput[];
  slideSize?: { width: number; height: number };
  theme?: PaperThemeInput;
}

export interface PaperSlideInput {
  style?: FlexStyleInput;
  background?: string | { color?: string; image?: string };
  children: PaperNodeInput[];
}

export interface PaperThemeInput {
  colorScheme?: Record<string, string>;
  fonts?: {
    heading?: string;
    body?: string;
  };
}

// =============================================================================
// NODES
// =============================================================================

export type PaperNodeInput =
  | PaperTextNode
  | PaperViewNode
  | PaperImageNode
  | PaperTableNode
  | PaperChartNode
  | PaperGroupNode
  | PaperConnectorNode
  | PaperVideoNode
  | PaperAudioNode;

export interface PaperTextNode {
  type: 'Text';
  style?: TextStyleInput;
  children?: string | ParagraphInput[];
  /** Flat text content (alternative to children) */
  value?: string;
}

export interface PaperViewNode {
  type: 'View';
  style?: FlexStyleInput;
  shapeType?: string;
  textContent?: string;
  children?: PaperNodeInput[];
}

export interface PaperImageNode {
  type: 'Image';
  src: string;
  alt?: string;
  style?: FlexStyleInput;
}

export interface PaperTableNode {
  type: 'Table';
  style?: FlexStyleInput;
  columns?: { width?: number }[];
  rows: PaperTableRowInput[];
}

export interface PaperTableRowInput {
  isHeader?: boolean;
  cells: PaperTableCellInput[];
}

export interface PaperTableCellInput {
  text?: string;
  runs?: TextRunInput[];
  rowSpan?: number;
  colSpan?: number;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    verticalAlign?: string;
    border?: string;
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  };
}

export interface PaperChartNode {
  type: 'Chart';
  chartType: string;
  title?: string;
  series?: { name?: string; data: number[]; color?: string }[];
  categories?: string[];
  axes?: { x?: { title?: string }; y?: { title?: string } };
  style?: FlexStyleInput;
}

export interface PaperGroupNode {
  type: 'Group';
  style?: FlexStyleInput;
  children: PaperNodeInput[];
}

export interface PaperConnectorNode {
  type: 'Connector';
  [key: string]: unknown;
}

export interface PaperVideoNode {
  type: 'Video';
  [key: string]: unknown;
}

export interface PaperAudioNode {
  type: 'Audio';
  [key: string]: unknown;
}

// =============================================================================
// STYLES
// =============================================================================

export interface FlexStyleInput {
  width?: number | string;
  height?: number | string;
  top?: number | string;
  left?: number | string;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  backgroundColor?: string | ColorModifierInput;
  border?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: string;
  opacity?: number;
  zIndex?: number;
}

export interface TextStyleInput extends FlexStyleInput {
  color?: string | ColorModifierInput;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  textDecoration?: string;
}

export interface ColorModifierInput {
  token?: string;
  value?: string;
  opacity?: number;
}

// =============================================================================
// TEXT CONTENT
// =============================================================================

export interface ParagraphInput {
  runs: TextRunInput[];
}

export interface TextRunInput {
  text: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    textDecoration?: string;
    color?: string | ColorModifierInput;
    backgroundColor?: string;
    link?: string;
    superscript?: boolean;
    subscript?: boolean;
  };
}
