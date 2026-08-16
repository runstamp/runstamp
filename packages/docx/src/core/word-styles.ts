/**
 * Word Styles System
 * ==================
 * True Word Styles support for consistent document branding.
 *
 * Phase 16 of Polyglot hardening (DOC-01 requirement).
 *
 * This module enables:
 * - Named paragraph styles (Heading 1, Body Text, etc.)
 * - Character styles (Emphasis, Strong, etc.)
 * - Style inheritance (based on other styles)
 * - Style cascade (changes propagate through document)
 * - Quick style gallery entries
 *
 * When a user opens the DOCX in Word:
 * - Changing "Heading 1" style updates ALL Heading 1 text
 * - Styles appear in the Styles gallery
 * - Navigation pane shows headings properly
 *
 * OOXML Structure:
 * ```xml
 * <w:styles>
 *   <w:style w:type="paragraph" w:styleId="Heading1">
 *     <w:name w:val="Heading 1"/>
 *     <w:basedOn w:val="Normal"/>
 *     <w:next w:val="Normal"/>
 *     <w:qFormat/>
 *     <w:pPr>...</w:pPr>
 *     <w:rPr>...</w:rPr>
 *   </w:style>
 * </w:styles>
 * ```
 */

// =============================================================================
// TYPES - STYLE DEFINITIONS
// =============================================================================

/** Style type */
export type WordStyleType = 'paragraph' | 'character' | 'table' | 'numbering';

/** Text alignment */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify' | 'both';

/** Vertical alignment */
export type VerticalAlignment = 'top' | 'center' | 'bottom';

/** Underline style */
export type UnderlineStyle = 'single' | 'double' | 'thick' | 'dotted' | 'dashed' | 'wave' | 'none';

/** Font properties for styles */
export interface StyleFontProperties {
  /** Font family name */
  name?: string;
  /** Font size in points */
  size?: number;
  /** Bold */
  bold?: boolean;
  /** Italic */
  italic?: boolean;
  /** Underline */
  underline?: boolean | UnderlineStyle;
  /** Strikethrough */
  strike?: boolean;
  /** Small caps */
  smallCaps?: boolean;
  /** All caps */
  allCaps?: boolean;
  /** Font color (hex without #) */
  color?: string;
  /** Highlight color */
  highlight?: string;
  /** Character spacing in points (positive = expanded, negative = condensed) */
  characterSpacing?: number;
}

/** Paragraph properties for styles */
export interface StyleParagraphProperties {
  /** Text alignment */
  alignment?: TextAlignment;
  /** Spacing before paragraph in points */
  spaceBefore?: number;
  /** Spacing after paragraph in points */
  spaceAfter?: number;
  /** Line spacing (1.0 = single, 1.5 = 1.5 lines, 2.0 = double) */
  lineSpacing?: number;
  /** Line spacing rule */
  lineSpacingRule?: 'auto' | 'atLeast' | 'exact';
  /** First line indent in points (positive = indent, negative = hanging) */
  firstLineIndent?: number;
  /** Left indent in points */
  leftIndent?: number;
  /** Right indent in points */
  rightIndent?: number;
  /** Keep lines together (prevent page break within paragraph) */
  keepLines?: boolean;
  /** Keep with next paragraph (prevent page break between) */
  keepNext?: boolean;
  /** Page break before */
  pageBreakBefore?: boolean;
  /** Widow/orphan control */
  widowControl?: boolean;
  /** Outline level (0-8, used for TOC and Navigation Pane) */
  outlineLevel?: number;
  /** Border around paragraph */
  border?: {
    top?: { style: string; size: number; color: string };
    bottom?: { style: string; size: number; color: string };
    left?: { style: string; size: number; color: string };
    right?: { style: string; size: number; color: string };
  };
  /** Shading/background color */
  shading?: string;
}

/** Complete style definition */
export interface WordStyle {
  /** Unique style ID (used internally) */
  id: string;
  /** Display name (shown in Word UI) */
  name: string;
  /** Style type */
  type: WordStyleType;
  /** Base style ID to inherit from */
  basedOn?: string;
  /** Next style ID (applied to next paragraph after pressing Enter) */
  next?: string;
  /** Include in Quick Styles gallery */
  quickFormat?: boolean;
  /** UI priority (lower = appears first in gallery) */
  uiPriority?: number;
  /** Hide from UI but still available */
  semiHidden?: boolean;
  /** Prevent direct formatting from overriding */
  locked?: boolean;
  /** Font/run properties */
  font?: StyleFontProperties;
  /** Paragraph properties */
  paragraph?: StyleParagraphProperties;
}

/** Style set - collection of related styles */
export interface WordStyleSet {
  /** Style set name */
  name: string;
  /** Description */
  description?: string;
  /** Styles in this set */
  styles: WordStyle[];
  /** Default paragraph style ID */
  defaultParagraphStyle?: string;
  /** Default character style ID */
  defaultCharacterStyle?: string;
}

// =============================================================================
// CONSTANTS - STANDARD STYLE IDS
// =============================================================================

/** Standard Word style IDs */
export const STYLE_IDS = {
  // Paragraph styles
  NORMAL: 'Normal',
  HEADING_1: 'Heading1',
  HEADING_2: 'Heading2',
  HEADING_3: 'Heading3',
  HEADING_4: 'Heading4',
  HEADING_5: 'Heading5',
  HEADING_6: 'Heading6',
  TITLE: 'Title',
  SUBTITLE: 'Subtitle',
  QUOTE: 'Quote',
  INTENSE_QUOTE: 'IntenseQuote',
  LIST_PARAGRAPH: 'ListParagraph',
  TOC_HEADING: 'TOCHeading',
  TOC_1: 'TOC1',
  TOC_2: 'TOC2',
  TOC_3: 'TOC3',
  CAPTION: 'Caption',
  FOOTER: 'Footer',
  HEADER: 'Header',

  // Character styles
  DEFAULT_PARAGRAPH_FONT: 'DefaultParagraphFont',
  EMPHASIS: 'Emphasis',
  STRONG: 'Strong',
  BOOK_TITLE: 'BookTitle',
  SUBTLE_EMPHASIS: 'SubtleEmphasis',
  INTENSE_EMPHASIS: 'IntenseEmphasis',
  SUBTLE_REFERENCE: 'SubtleReference',
  INTENSE_REFERENCE: 'IntenseReference',
  HYPERLINK: 'Hyperlink',
} as const;

// =============================================================================
// DEFAULT STYLES - OFFICE STANDARD
// =============================================================================

/** Normal (default paragraph) style */
export const STYLE_NORMAL: WordStyle = {
  id: STYLE_IDS.NORMAL,
  name: 'Normal',
  type: 'paragraph',
  quickFormat: true,
  uiPriority: 0,
  font: {
    name: 'Calibri',
    size: 11,
    color: '000000',
  },
  paragraph: {
    alignment: 'left',
    spaceBefore: 0,
    spaceAfter: 8,
    lineSpacing: 1.08,
    widowControl: true,
  },
};

/** Heading 1 style */
export const STYLE_HEADING_1: WordStyle = {
  id: STYLE_IDS.HEADING_1,
  name: 'Heading 1',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 9,
  font: {
    name: 'Calibri Light',
    size: 16,
    color: '2F5496',
    bold: false,
  },
  paragraph: {
    spaceBefore: 12,
    spaceAfter: 0,
    keepNext: true,
    keepLines: true,
    outlineLevel: 0,
  },
};

/** Heading 2 style */
export const STYLE_HEADING_2: WordStyle = {
  id: STYLE_IDS.HEADING_2,
  name: 'Heading 2',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 9,
  font: {
    name: 'Calibri Light',
    size: 13,
    color: '2F5496',
    bold: false,
  },
  paragraph: {
    spaceBefore: 2,
    spaceAfter: 0,
    keepNext: true,
    keepLines: true,
    outlineLevel: 1,
  },
};

/** Heading 3 style */
export const STYLE_HEADING_3: WordStyle = {
  id: STYLE_IDS.HEADING_3,
  name: 'Heading 3',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 9,
  font: {
    name: 'Calibri Light',
    size: 12,
    color: '1F3763',
    bold: false,
  },
  paragraph: {
    spaceBefore: 2,
    spaceAfter: 0,
    keepNext: true,
    keepLines: true,
    outlineLevel: 2,
  },
};

/** Heading 4 style */
export const STYLE_HEADING_4: WordStyle = {
  id: STYLE_IDS.HEADING_4,
  name: 'Heading 4',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 9,
  font: {
    name: 'Calibri Light',
    size: 11,
    color: '2F5496',
    bold: false,
    italic: true,
  },
  paragraph: {
    spaceBefore: 2,
    spaceAfter: 0,
    keepNext: true,
    keepLines: true,
    outlineLevel: 3,
  },
};

/** Title style */
export const STYLE_TITLE: WordStyle = {
  id: STYLE_IDS.TITLE,
  name: 'Title',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 10,
  font: {
    name: 'Calibri Light',
    size: 28,
    color: '000000',
    bold: false,
  },
  paragraph: {
    spaceBefore: 0,
    spaceAfter: 0,
    alignment: 'left',
  },
};

/** Subtitle style */
export const STYLE_SUBTITLE: WordStyle = {
  id: STYLE_IDS.SUBTITLE,
  name: 'Subtitle',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 11,
  font: {
    name: 'Calibri',
    size: 12,
    color: '5A5A5A',
    italic: false,
  },
  paragraph: {
    spaceBefore: 0,
    spaceAfter: 8,
    alignment: 'left',
  },
};

/** Quote style */
export const STYLE_QUOTE: WordStyle = {
  id: STYLE_IDS.QUOTE,
  name: 'Quote',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 29,
  font: {
    italic: true,
    color: '404040',
  },
  paragraph: {
    leftIndent: 43.2, // 0.6 inches in points
    rightIndent: 43.2,
    spaceBefore: 10,
    spaceAfter: 10,
  },
};

/** List Paragraph style */
export const STYLE_LIST_PARAGRAPH: WordStyle = {
  id: STYLE_IDS.LIST_PARAGRAPH,
  name: 'List Paragraph',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  quickFormat: true,
  uiPriority: 34,
  paragraph: {
    leftIndent: 36, // 0.5 inches
  },
};

/** Caption style */
export const STYLE_CAPTION: WordStyle = {
  id: STYLE_IDS.CAPTION,
  name: 'Caption',
  type: 'paragraph',
  basedOn: STYLE_IDS.NORMAL,
  next: STYLE_IDS.NORMAL,
  quickFormat: false,
  uiPriority: 35,
  semiHidden: true,
  font: {
    size: 9,
    italic: true,
    color: '44546A',
  },
  paragraph: {
    spaceAfter: 10,
  },
};

/** Emphasis (italic) character style */
export const STYLE_EMPHASIS: WordStyle = {
  id: STYLE_IDS.EMPHASIS,
  name: 'Emphasis',
  type: 'character',
  quickFormat: true,
  uiPriority: 20,
  font: {
    italic: true,
  },
};

/** Strong (bold) character style */
export const STYLE_STRONG: WordStyle = {
  id: STYLE_IDS.STRONG,
  name: 'Strong',
  type: 'character',
  quickFormat: true,
  uiPriority: 22,
  font: {
    bold: true,
  },
};

/** Hyperlink character style */
export const STYLE_HYPERLINK: WordStyle = {
  id: STYLE_IDS.HYPERLINK,
  name: 'Hyperlink',
  type: 'character',
  uiPriority: 99,
  semiHidden: true,
  font: {
    color: '0563C1',
    underline: 'single',
  },
};

// =============================================================================
// DEFAULT STYLE SET
// =============================================================================

/** Office default style set */
export const OFFICE_DEFAULT_STYLES: WordStyleSet = {
  name: 'Office Default',
  description: 'Standard Office 2019+ styles',
  defaultParagraphStyle: STYLE_IDS.NORMAL,
  styles: [
    STYLE_NORMAL,
    STYLE_HEADING_1,
    STYLE_HEADING_2,
    STYLE_HEADING_3,
    STYLE_HEADING_4,
    STYLE_TITLE,
    STYLE_SUBTITLE,
    STYLE_QUOTE,
    STYLE_LIST_PARAGRAPH,
    STYLE_CAPTION,
    STYLE_EMPHASIS,
    STYLE_STRONG,
    STYLE_HYPERLINK,
  ],
};

// =============================================================================
// ENTERPRISE STYLE SETS
// =============================================================================

/** Legal document style set */
export const LEGAL_STYLES: WordStyleSet = {
  name: 'Legal Document',
  description: 'Styles optimized for legal documents',
  defaultParagraphStyle: STYLE_IDS.NORMAL,
  styles: [
    {
      ...STYLE_NORMAL,
      font: { name: 'Times New Roman', size: 12, color: '000000' },
      paragraph: { ...STYLE_NORMAL.paragraph, lineSpacing: 2.0, spaceAfter: 0 },
    },
    {
      ...STYLE_HEADING_1,
      font: { name: 'Times New Roman', size: 14, bold: true, color: '000000' },
      paragraph: { ...STYLE_HEADING_1.paragraph, alignment: 'center' },
    },
    {
      ...STYLE_HEADING_2,
      font: { name: 'Times New Roman', size: 12, bold: true, color: '000000' },
    },
    {
      ...STYLE_HEADING_3,
      font: { name: 'Times New Roman', size: 12, bold: true, italic: true, color: '000000' },
    },
    STYLE_EMPHASIS,
    STYLE_STRONG,
    STYLE_HYPERLINK,
  ],
};

/** Corporate branding style set */
export const CORPORATE_STYLES: WordStyleSet = {
  name: 'Corporate',
  description: 'Modern corporate branding styles',
  defaultParagraphStyle: STYLE_IDS.NORMAL,
  styles: [
    {
      ...STYLE_NORMAL,
      font: { name: 'Arial', size: 11, color: '333333' },
      paragraph: { ...STYLE_NORMAL.paragraph, spaceAfter: 10 },
    },
    {
      ...STYLE_HEADING_1,
      font: { name: 'Arial', size: 24, bold: true, color: '003366' },
      paragraph: { ...STYLE_HEADING_1.paragraph, spaceBefore: 24, spaceAfter: 12 },
    },
    {
      ...STYLE_HEADING_2,
      font: { name: 'Arial', size: 18, bold: true, color: '003366' },
      paragraph: { ...STYLE_HEADING_2.paragraph, spaceBefore: 18, spaceAfter: 8 },
    },
    {
      ...STYLE_HEADING_3,
      font: { name: 'Arial', size: 14, bold: true, color: '003366' },
      paragraph: { ...STYLE_HEADING_3.paragraph, spaceBefore: 12, spaceAfter: 6 },
    },
    { ...STYLE_TITLE, font: { name: 'Arial', size: 32, bold: true, color: '003366' } },
    { ...STYLE_SUBTITLE, font: { name: 'Arial', size: 16, color: '666666' } },
    STYLE_EMPHASIS,
    STYLE_STRONG,
    STYLE_HYPERLINK,
  ],
};

/** Academic/thesis style set */
export const ACADEMIC_STYLES: WordStyleSet = {
  name: 'Academic',
  description: 'Styles for academic papers and theses',
  defaultParagraphStyle: STYLE_IDS.NORMAL,
  styles: [
    {
      ...STYLE_NORMAL,
      font: { name: 'Times New Roman', size: 12, color: '000000' },
      paragraph: {
        ...STYLE_NORMAL.paragraph,
        lineSpacing: 2.0,
        spaceAfter: 0,
        firstLineIndent: 36, // 0.5 inch first line indent
      },
    },
    {
      ...STYLE_HEADING_1,
      font: { name: 'Times New Roman', size: 14, bold: true, color: '000000' },
      paragraph: { ...STYLE_HEADING_1.paragraph, alignment: 'center', spaceBefore: 24 },
    },
    {
      ...STYLE_HEADING_2,
      font: { name: 'Times New Roman', size: 12, bold: true, color: '000000' },
      paragraph: { ...STYLE_HEADING_2.paragraph, spaceBefore: 12 },
    },
    {
      ...STYLE_HEADING_3,
      font: { name: 'Times New Roman', size: 12, bold: true, italic: true, color: '000000' },
    },
    {
      ...STYLE_QUOTE,
      paragraph: {
        ...STYLE_QUOTE.paragraph,
        leftIndent: 72, // 1 inch
        lineSpacing: 1.0, // Single-spaced block quotes
      },
    },
    STYLE_EMPHASIS,
    STYLE_STRONG,
    STYLE_HYPERLINK,
  ],
};

// =============================================================================
// STYLE REGISTRY
// =============================================================================

/**
 * Registry for managing Word styles
 */
export class WordStyleRegistry {
  private styles: Map<string, WordStyle> = new Map();
  private defaultStyleSet: WordStyleSet;

  constructor(styleSet: WordStyleSet = OFFICE_DEFAULT_STYLES) {
    this.defaultStyleSet = styleSet;
    this.loadStyleSet(styleSet);
  }

  /**
   * Load a style set
   */
  loadStyleSet(styleSet: WordStyleSet): void {
    for (const style of styleSet.styles) {
      this.styles.set(style.id, style);
    }
  }

  /**
   * Get a style by ID
   */
  getStyle(id: string): WordStyle | undefined {
    return this.styles.get(id);
  }

  /**
   * Register a style
   */
  registerStyle(style: WordStyle): void {
    this.styles.set(style.id, style);
  }

  /**
   * Check if a style exists
   */
  hasStyle(id: string): boolean {
    return this.styles.has(id);
  }

  /**
   * Get all styles
   */
  getAllStyles(): WordStyle[] {
    return Array.from(this.styles.values());
  }

  /**
   * Get paragraph styles only
   */
  getParagraphStyles(): WordStyle[] {
    return this.getAllStyles().filter(s => s.type === 'paragraph');
  }

  /**
   * Get character styles only
   */
  getCharacterStyles(): WordStyle[] {
    return this.getAllStyles().filter(s => s.type === 'character');
  }

  /**
   * Get styles for Quick Styles gallery
   */
  getQuickStyles(): WordStyle[] {
    return this.getAllStyles()
      .filter(s => s.quickFormat)
      .sort((a, b) => (a.uiPriority || 99) - (b.uiPriority || 99));
  }

  /**
   * Create a custom style based on an existing style
   */
  createCustomStyle(
    baseStyleId: string,
    customizations: Partial<WordStyle> & { id: string; name: string }
  ): WordStyle {
    const base = this.getStyle(baseStyleId);
    if (!base) {
      throw new Error(`Base style "${baseStyleId}" not found`);
    }

    const custom: WordStyle = {
      ...base,
      ...customizations,
      basedOn: baseStyleId,
      font: { ...base.font, ...customizations.font },
      paragraph: { ...base.paragraph, ...customizations.paragraph },
    };

    this.registerStyle(custom);
    return custom;
  }

  /**
   * Modify an existing style
   */
  modifyStyle(id: string, modifications: Partial<WordStyle>): WordStyle | undefined {
    const style = this.getStyle(id);
    if (!style) return undefined;

    const modified: WordStyle = {
      ...style,
      ...modifications,
      font: { ...style.font, ...modifications.font },
      paragraph: { ...style.paragraph, ...modifications.paragraph },
    };

    this.styles.set(id, modified);
    return modified;
  }

  /**
   * Get resolved style (with inheritance applied)
   */
  getResolvedStyle(id: string): WordStyle | undefined {
    const style = this.getStyle(id);
    if (!style) return undefined;

    if (!style.basedOn) {
      return style;
    }

    const baseStyle = this.getResolvedStyle(style.basedOn);
    if (!baseStyle) {
      return style;
    }

    // Merge base style with this style
    return {
      ...baseStyle,
      ...style,
      font: { ...baseStyle.font, ...style.font },
      paragraph: { ...baseStyle.paragraph, ...style.paragraph },
    };
  }

  /**
   * Export styles for serialization
   */
  exportStyles(): WordStyleSet {
    return {
      name: this.defaultStyleSet.name,
      description: this.defaultStyleSet.description,
      defaultParagraphStyle: this.defaultStyleSet.defaultParagraphStyle,
      styles: this.getAllStyles(),
    };
  }
}

// =============================================================================
// GLOBAL REGISTRY
// =============================================================================

let globalRegistry: WordStyleRegistry | null = null;

/**
 * Get the global Word style registry
 */
export function getWordStyleRegistry(): WordStyleRegistry {
  if (!globalRegistry) {
    globalRegistry = new WordStyleRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry
 */
export function resetWordStyleRegistry(): void {
  globalRegistry = null;
}

/**
 * Create a new Word style registry
 */
export function createWordStyleRegistry(styleSet?: WordStyleSet): WordStyleRegistry {
  return new WordStyleRegistry(styleSet);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate a word style
 */
export function validateWordStyle(style: WordStyle): string[] {
  const errors: string[] = [];

  if (!style.id) {
    errors.push('Style must have an id');
  }

  if (!style.name) {
    errors.push('Style must have a name');
  }

  if (!style.type) {
    errors.push('Style must have a type');
  }

  if (style.type !== 'paragraph' && style.type !== 'character' && style.type !== 'table' && style.type !== 'numbering') {
    errors.push('Style type must be paragraph, character, table, or numbering');
  }

  if (style.font?.size && style.font.size <= 0) {
    errors.push('Font size must be positive');
  }

  if (style.paragraph?.lineSpacing !== undefined && style.paragraph.lineSpacing <= 0) {
    errors.push('Line spacing must be positive');
  }

  return errors;
}

/**
 * Convert points to OOXML twips (twentieths of a point)
 */
export function pointsToTwips(points: number): number {
  return Math.round(points * 20);
}

/**
 * Convert points to OOXML half-points
 */
export function pointsToHalfPoints(points: number): number {
  return Math.round(points * 2);
}

/**
 * Convert line spacing multiplier to OOXML line spacing value
 */
export function lineSpacingToOOXML(multiplier: number): number {
  // OOXML line spacing is in 240ths of a line
  return Math.round(multiplier * 240);
}

/**
 * Get heading level from style ID
 */
export function getHeadingLevel(styleId: string): number | undefined {
  const match = styleId.match(/^Heading(\d)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Create a heading style for a specific level
 */
export function createHeadingStyle(
  level: number,
  options: Partial<WordStyle> = {}
): WordStyle {
  const defaultHeadings = [
    STYLE_HEADING_1,
    STYLE_HEADING_2,
    STYLE_HEADING_3,
    STYLE_HEADING_4,
  ];

  const base = defaultHeadings[level - 1] || STYLE_HEADING_1;

  return {
    ...base,
    id: `Heading${level}`,
    name: `Heading ${level}`,
    ...options,
    font: { ...base.font, ...options.font },
    paragraph: {
      ...base.paragraph,
      outlineLevel: level - 1,
      ...options.paragraph,
    },
  };
}
