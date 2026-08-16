/**
 * DOCX Style Definition Builder
 *
 * Builds DOCX style definitions that generate proper OOXML output.
 * Generates styles.xml content for Word documents.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DocxStyle {
  styleId: string;
  name: string;
  type: 'paragraph' | 'character' | 'table' | 'numbering';
  basedOn?: string;
  next?: string;
  isDefault?: boolean;
  paragraph?: ParagraphProperties;
  run?: RunProperties;
}

export interface ParagraphProperties {
  alignment?: 'left' | 'center' | 'right' | 'both';
  spacing?: {
    before?: number; // Twips (1/20 pt)
    after?: number;
    line?: number;
    lineRule?: 'auto' | 'exact' | 'atLeast';
  };
  indent?: {
    left?: number;
    right?: number;
    firstLine?: number;
    hanging?: number;
  };
  outlineLevel?: number; // 0-8 for TOC
  keepNext?: boolean;
  keepLines?: boolean;
}

export interface RunProperties {
  fontFamily?: string;
  fontSize?: number; // Half-points
  bold?: boolean;
  italic?: boolean;
  underline?: string;
  strike?: boolean;
  color?: string;
  highlight?: string;
  vertAlign?: 'superscript' | 'subscript';
}

// =============================================================================
// DEFAULT STYLES
// =============================================================================

/**
 * Generate default document styles.
 */
export function generateDefaultStyles(): DocxStyle[] {
  return [
    // Normal paragraph
    {
      styleId: 'Normal',
      name: 'Normal',
      type: 'paragraph',
      isDefault: true,
      paragraph: {
        spacing: { after: 200, line: 276, lineRule: 'auto' },
      },
      run: {
        fontFamily: 'Calibri',
        fontSize: 22, // 11pt = 22 half-points
      },
    },

    // Headings
    ...generateHeadingStyles(),

    // Character styles
    {
      styleId: 'Strong',
      name: 'Strong',
      type: 'character',
      run: { bold: true },
    },
    {
      styleId: 'Emphasis',
      name: 'Emphasis',
      type: 'character',
      run: { italic: true },
    },
    {
      styleId: 'Code',
      name: 'Code',
      type: 'character',
      run: { fontFamily: 'Consolas', fontSize: 20 },
    },

    // Block styles
    {
      styleId: 'Quote',
      name: 'Quote',
      type: 'paragraph',
      basedOn: 'Normal',
      paragraph: {
        indent: { left: 720, right: 720 },
        spacing: { before: 200, after: 200 },
      },
      run: { italic: true, color: '666666' },
    },
    {
      styleId: 'CodeBlock',
      name: 'Code Block',
      type: 'paragraph',
      paragraph: {
        spacing: { before: 100, after: 100, line: 240, lineRule: 'auto' },
      },
      run: { fontFamily: 'Consolas', fontSize: 18 },
    },

    // List paragraph
    {
      styleId: 'ListParagraph',
      name: 'List Paragraph',
      type: 'paragraph',
      basedOn: 'Normal',
      paragraph: {
        indent: { left: 720 },
      },
    },
  ];
}

/**
 * Generate heading styles (H1-H6).
 */
function generateHeadingStyles(): DocxStyle[] {
  const headings: DocxStyle[] = [];

  const headingConfig = [
    { level: 1, size: 32, color: '2F5496', spacing: { before: 240, after: 0 } },
    { level: 2, size: 26, color: '2F5496', spacing: { before: 40, after: 0 } },
    { level: 3, size: 24, color: '1F3763', spacing: { before: 40, after: 0 } },
    { level: 4, size: 22, color: '2F5496', spacing: { before: 40, after: 0 } },
    { level: 5, size: 22, color: '2F5496', spacing: { before: 40, after: 0 } },
    { level: 6, size: 22, color: '1F3763', spacing: { before: 40, after: 0 } },
  ];

  for (const config of headingConfig) {
    headings.push({
      styleId: `Heading${config.level}`,
      name: `Heading ${config.level}`,
      type: 'paragraph',
      basedOn: 'Normal',
      next: 'Normal',
      paragraph: {
        outlineLevel: config.level - 1,
        keepNext: true,
        keepLines: true,
        spacing: config.spacing,
      },
      run: {
        fontFamily: 'Calibri Light',
        fontSize: config.size,
        color: config.color,
        bold: config.level <= 2,
      },
    });
  }

  return headings;
}

// =============================================================================
// XML GENERATION
// =============================================================================

/**
 * Generate styles.xml content.
 */
export function generateStylesXml(styles: DocxStyle[]): string {
  const styleElements = styles.map((style) => generateStyleElement(style)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
<w:docDefaults>
  <w:rPrDefault>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
  </w:rPrDefault>
  <w:pPrDefault>
    <w:pPr>
      <w:spacing w:after="200" w:line="276" w:lineRule="auto"/>
    </w:pPr>
  </w:pPrDefault>
</w:docDefaults>
${styleElements}
</w:styles>`;
}

function generateStyleElement(style: DocxStyle): string {
  const typeAttr =
    style.type === 'paragraph'
      ? 'paragraph'
      : style.type === 'character'
        ? 'character'
        : style.type === 'table'
          ? 'table'
          : 'numbering';

  const defaultAttr = style.isDefault ? ' w:default="1"' : '';
  const basedOn = style.basedOn ? `<w:basedOn w:val="${style.basedOn}"/>` : '';
  const next = style.next ? `<w:next w:val="${style.next}"/>` : '';

  const pPr = style.paragraph ? generateParagraphPropsXml(style.paragraph) : '';
  const rPr = style.run ? generateRunPropsXml(style.run) : '';

  return `<w:style w:type="${typeAttr}" w:styleId="${style.styleId}"${defaultAttr}>
  <w:name w:val="${style.name}"/>
  ${basedOn}
  ${next}
  ${pPr}
  ${rPr}
</w:style>`;
}

function generateParagraphPropsXml(props: ParagraphProperties): string {
  const parts: string[] = [];

  if (props.alignment) {
    const alignMap = { left: 'left', center: 'center', right: 'right', both: 'both' };
    parts.push(`<w:jc w:val="${alignMap[props.alignment]}"/>`);
  }

  if (props.spacing) {
    const attrs: string[] = [];
    if (props.spacing.before !== undefined) attrs.push(`w:before="${props.spacing.before}"`);
    if (props.spacing.after !== undefined) attrs.push(`w:after="${props.spacing.after}"`);
    if (props.spacing.line !== undefined) attrs.push(`w:line="${props.spacing.line}"`);
    if (props.spacing.lineRule) attrs.push(`w:lineRule="${props.spacing.lineRule}"`);
    if (attrs.length > 0) {
      parts.push(`<w:spacing ${attrs.join(' ')}/>`);
    }
  }

  if (props.indent) {
    const attrs: string[] = [];
    if (props.indent.left !== undefined) attrs.push(`w:left="${props.indent.left}"`);
    if (props.indent.right !== undefined) attrs.push(`w:right="${props.indent.right}"`);
    if (props.indent.firstLine !== undefined) attrs.push(`w:firstLine="${props.indent.firstLine}"`);
    if (props.indent.hanging !== undefined) attrs.push(`w:hanging="${props.indent.hanging}"`);
    if (attrs.length > 0) {
      parts.push(`<w:ind ${attrs.join(' ')}/>`);
    }
  }

  if (props.outlineLevel !== undefined) {
    parts.push(`<w:outlineLvl w:val="${props.outlineLevel}"/>`);
  }

  if (props.keepNext) parts.push('<w:keepNext/>');
  if (props.keepLines) parts.push('<w:keepLines/>');

  if (parts.length === 0) return '';
  return `<w:pPr>${parts.join('')}</w:pPr>`;
}

function generateRunPropsXml(props: RunProperties): string {
  // ECMA-376 Part 1 requires strict element ordering within w:rPr.
  // Sequence: rFonts → b → bCs → i → iCs → strike → sz → szCs → color → highlight → u → vertAlign
  const parts: string[] = [];

  if (props.fontFamily) {
    parts.push(`<w:rFonts w:ascii="${props.fontFamily}" w:hAnsi="${props.fontFamily}"/>`);
  }

  if (props.bold) parts.push('<w:b/>');
  if (props.italic) parts.push('<w:i/>');
  if (props.strike) parts.push('<w:strike/>');

  if (props.fontSize) {
    parts.push(`<w:sz w:val="${props.fontSize}"/>`);
    parts.push(`<w:szCs w:val="${props.fontSize}"/>`);
  }

  if (props.color) {
    parts.push(`<w:color w:val="${props.color}"/>`);
  }

  if (props.highlight) {
    parts.push(`<w:highlight w:val="${props.highlight}"/>`);
  }

  if (props.underline) parts.push(`<w:u w:val="${props.underline}"/>`);

  if (props.vertAlign) {
    parts.push(`<w:vertAlign w:val="${props.vertAlign}"/>`);
  }

  if (parts.length === 0) return '';
  return `<w:rPr>${parts.join('')}</w:rPr>`;
}

// =============================================================================
// STYLE CUSTOMIZATION
// =============================================================================

/**
 * Create a custom style based on an existing one.
 */
export function createCustomStyle(
  baseStyle: DocxStyle,
  overrides: Partial<DocxStyle>
): DocxStyle {
  return {
    ...baseStyle,
    ...overrides,
    paragraph: {
      ...baseStyle.paragraph,
      ...overrides.paragraph,
    },
    run: {
      ...baseStyle.run,
      ...overrides.run,
    },
  };
}

/**
 * Get a style by ID from a collection.
 */
export function getStyleById(styles: DocxStyle[], styleId: string): DocxStyle | undefined {
  return styles.find((s) => s.styleId === styleId);
}

/**
 * Merge style collections, with later collections overriding earlier ones.
 */
export function mergeStyles(...collections: DocxStyle[][]): DocxStyle[] {
  const styleMap = new Map<string, DocxStyle>();

  for (const collection of collections) {
    for (const style of collection) {
      styleMap.set(style.styleId, style);
    }
  }

  return Array.from(styleMap.values());
}

// =============================================================================
// THEME-BASED STYLES
// =============================================================================

export interface StyleTheme {
  primaryColor: string;
  secondaryColor: string;
  headingFont: string;
  bodyFont: string;
  codeFont: string;
  baseFontSize: number; // Half-points
}

/**
 * Default style theme (Office-like).
 */
export const DEFAULT_THEME: StyleTheme = {
  primaryColor: '2F5496',
  secondaryColor: '1F3763',
  headingFont: 'Calibri Light',
  bodyFont: 'Calibri',
  codeFont: 'Consolas',
  baseFontSize: 22,
};

/**
 * Generate styles based on a theme.
 */
export function generateThemedStyles(theme: StyleTheme): DocxStyle[] {
  return [
    // Normal
    {
      styleId: 'Normal',
      name: 'Normal',
      type: 'paragraph',
      isDefault: true,
      paragraph: {
        spacing: { after: 200, line: 276, lineRule: 'auto' },
      },
      run: {
        fontFamily: theme.bodyFont,
        fontSize: theme.baseFontSize,
      },
    },

    // Headings with theme colors
    {
      styleId: 'Heading1',
      name: 'Heading 1',
      type: 'paragraph',
      basedOn: 'Normal',
      next: 'Normal',
      paragraph: {
        outlineLevel: 0,
        keepNext: true,
        keepLines: true,
        spacing: { before: 240, after: 0 },
      },
      run: {
        fontFamily: theme.headingFont,
        fontSize: 32,
        color: theme.primaryColor,
        bold: true,
      },
    },
    {
      styleId: 'Heading2',
      name: 'Heading 2',
      type: 'paragraph',
      basedOn: 'Normal',
      next: 'Normal',
      paragraph: {
        outlineLevel: 1,
        keepNext: true,
        keepLines: true,
        spacing: { before: 40, after: 0 },
      },
      run: {
        fontFamily: theme.headingFont,
        fontSize: 26,
        color: theme.primaryColor,
        bold: true,
      },
    },
    {
      styleId: 'Heading3',
      name: 'Heading 3',
      type: 'paragraph',
      basedOn: 'Normal',
      next: 'Normal',
      paragraph: {
        outlineLevel: 2,
        keepNext: true,
        keepLines: true,
        spacing: { before: 40, after: 0 },
      },
      run: {
        fontFamily: theme.headingFont,
        fontSize: 24,
        color: theme.secondaryColor,
      },
    },

    // Code styles
    {
      styleId: 'Code',
      name: 'Code',
      type: 'character',
      run: {
        fontFamily: theme.codeFont,
        fontSize: Math.round(theme.baseFontSize * 0.9),
      },
    },
    {
      styleId: 'CodeBlock',
      name: 'Code Block',
      type: 'paragraph',
      paragraph: {
        spacing: { before: 100, after: 100, line: 240, lineRule: 'auto' },
      },
      run: {
        fontFamily: theme.codeFont,
        fontSize: Math.round(theme.baseFontSize * 0.8),
      },
    },

    // Character styles
    {
      styleId: 'Strong',
      name: 'Strong',
      type: 'character',
      run: { bold: true },
    },
    {
      styleId: 'Emphasis',
      name: 'Emphasis',
      type: 'character',
      run: { italic: true },
    },
  ];
}
