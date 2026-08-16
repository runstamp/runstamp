import { pointsToHalfPoints } from '../utils/units.js';
import { serializeXml, xmlElement } from './ordered-builder.js';
import { normalizeOoxmlColor } from './color.js';

interface StyleDefinition {
  styleId: string;
  type: 'paragraph' | 'character';
  name: string;
  basedOn?: string;
  next?: string;
  isDefault?: boolean;
  paragraph?: {
    outlineLvl?: number;
    spacingBefore?: number;
    spacingAfter?: number;
    line?: number;
    keepNext?: boolean;
    keepLines?: boolean;
    indentLeft?: number;
    indentHanging?: number;
    contextualSpacing?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'both';
  };
  run?: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    noProof?: boolean;
    underline?: 'single';
    vertAlign?: 'superscript' | 'subscript';
  };
}

const BUILT_IN_STYLES: StyleDefinition[] = [
  { styleId: 'Normal', type: 'paragraph', name: 'Normal', isDefault: true, paragraph: { spacingAfter: 160, line: 276 }, run: { fontFamily: 'Calibri', fontSize: 11 } },
  { styleId: 'Title', type: 'paragraph', name: 'Title', basedOn: 'Normal', paragraph: { spacingBefore: 240, spacingAfter: 160 }, run: { fontFamily: 'Calibri Light', fontSize: 22, color: '1F4E79' } },
  { styleId: 'Subtitle', type: 'paragraph', name: 'Subtitle', basedOn: 'Normal', paragraph: { spacingAfter: 120 }, run: { fontFamily: 'Calibri', fontSize: 14, color: '5B5B5B' } },
  { styleId: 'Heading1', type: 'paragraph', name: 'heading 1', basedOn: 'Normal', next: 'Normal', paragraph: { outlineLvl: 0, spacingBefore: 240, spacingAfter: 80, keepNext: true, keepLines: true }, run: { fontFamily: 'Calibri Light', fontSize: 18, bold: true, color: '2F5597' } },
  { styleId: 'Heading2', type: 'paragraph', name: 'heading 2', basedOn: 'Normal', next: 'Normal', paragraph: { outlineLvl: 1, spacingBefore: 180, spacingAfter: 60, keepNext: true, keepLines: true }, run: { fontFamily: 'Calibri Light', fontSize: 16, bold: true, color: '2F5597' } },
  { styleId: 'Heading3', type: 'paragraph', name: 'heading 3', basedOn: 'Normal', next: 'Normal', paragraph: { outlineLvl: 2, spacingBefore: 140, spacingAfter: 40, keepNext: true, keepLines: true }, run: { fontFamily: 'Calibri', fontSize: 14, bold: true, color: '1F3763' } },
  { styleId: 'Heading4', type: 'paragraph', name: 'heading 4', basedOn: 'Normal', next: 'Normal', paragraph: { outlineLvl: 3, spacingBefore: 120, spacingAfter: 20, keepNext: true, keepLines: true }, run: { fontFamily: 'Calibri', fontSize: 13, bold: true, color: '1F3763' } },
  { styleId: 'Heading5', type: 'paragraph', name: 'heading 5', basedOn: 'Normal', next: 'Normal', paragraph: { outlineLvl: 4, spacingBefore: 120, spacingAfter: 20, keepNext: true, keepLines: true }, run: { fontFamily: 'Calibri', fontSize: 12, bold: true, color: '1F3763' } },
  { styleId: 'Heading6', type: 'paragraph', name: 'heading 6', basedOn: 'Normal', next: 'Normal', paragraph: { outlineLvl: 5, spacingBefore: 120, spacingAfter: 20, keepNext: true, keepLines: true }, run: { fontFamily: 'Calibri', fontSize: 11, bold: true, color: '1F3763' } },
  { styleId: 'CodeBlock', type: 'paragraph', name: 'Code Block', basedOn: 'Normal', paragraph: { spacingBefore: 80, spacingAfter: 80, line: 240 }, run: { fontFamily: 'Consolas', fontSize: 10, noProof: true } },
  { styleId: 'Divider', type: 'paragraph', name: 'Divider', basedOn: 'Normal', paragraph: { spacingBefore: 80, spacingAfter: 80 } },
  { styleId: 'ListParagraph', type: 'paragraph', name: 'List Paragraph', basedOn: 'Normal', paragraph: { indentLeft: 720, indentHanging: 360, contextualSpacing: true } },
  { styleId: 'NoSpacing', type: 'paragraph', name: 'No Spacing', basedOn: 'Normal' },
  { styleId: 'Quote', type: 'paragraph', name: 'Quote', basedOn: 'Normal', paragraph: { spacingBefore: 120, spacingAfter: 120 }, run: { italic: true, color: '666666' } },
  { styleId: 'IntenseQuote', type: 'paragraph', name: 'Intense Quote', basedOn: 'Quote', paragraph: { spacingBefore: 160, spacingAfter: 160 }, run: { italic: true, color: '2F5597' } },
  { styleId: 'Header', type: 'paragraph', name: 'Header', basedOn: 'Normal', paragraph: { alignment: 'right' }, run: { fontSize: 10, color: '666666' } },
  { styleId: 'Footer', type: 'paragraph', name: 'Footer', basedOn: 'Normal', paragraph: { alignment: 'center' }, run: { fontSize: 10, color: '666666' } },
  { styleId: 'DefaultParagraphFont', type: 'character', name: 'Default Paragraph Font' },
  { styleId: 'Hyperlink', type: 'character', name: 'Hyperlink', run: { color: '0563C1', underline: 'single' } },
  { styleId: 'Strong', type: 'character', name: 'Strong', run: { bold: true } },
  { styleId: 'Emphasis', type: 'character', name: 'Emphasis', run: { italic: true } },
  { styleId: 'Code', type: 'character', name: 'Code', run: { fontFamily: 'Consolas', fontSize: 10, noProof: true } },
  { styleId: 'TOCHeading', type: 'paragraph', name: 'TOC Heading', basedOn: 'Heading1', next: 'Normal' },
  { styleId: 'TOC1', type: 'paragraph', name: 'toc 1', basedOn: 'Normal', next: 'Normal', paragraph: { spacingAfter: 100 } },
  { styleId: 'TOC2', type: 'paragraph', name: 'toc 2', basedOn: 'Normal', next: 'Normal', paragraph: { spacingAfter: 100 } },
  { styleId: 'TOC3', type: 'paragraph', name: 'toc 3', basedOn: 'Normal', next: 'Normal', paragraph: { spacingAfter: 100 } },
  { styleId: 'TOC4', type: 'paragraph', name: 'toc 4', basedOn: 'Normal', next: 'Normal', paragraph: { spacingAfter: 100 } },
  { styleId: 'TOC5', type: 'paragraph', name: 'toc 5', basedOn: 'Normal', next: 'Normal', paragraph: { spacingAfter: 100 } },
  { styleId: 'TOC6', type: 'paragraph', name: 'toc 6', basedOn: 'Normal', next: 'Normal', paragraph: { spacingAfter: 100 } },
  { styleId: 'FootnoteText', type: 'paragraph', name: 'footnote text', basedOn: 'Normal', run: { fontSize: 10 } },
  { styleId: 'FootnoteReference', type: 'character', name: 'footnote reference', run: { vertAlign: 'superscript' } },
  { styleId: 'EndnoteText', type: 'paragraph', name: 'endnote text', basedOn: 'Normal', run: { fontSize: 10 } },
  { styleId: 'EndnoteReference', type: 'character', name: 'endnote reference', run: { vertAlign: 'superscript' } },
  { styleId: 'CommentText', type: 'paragraph', name: 'comment text', basedOn: 'Normal', run: { fontSize: 10 } },
  { styleId: 'CommentReference', type: 'character', name: 'comment reference', run: { fontSize: 8 } },
];

export interface NativeStylesOptions {
  includeToc?: boolean;
  primaryColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
  monospaceFont?: string;
  language?: string;
}

function applyThemeToStyle(style: StyleDefinition, options: NativeStylesOptions): StyleDefinition {
  const isHeading = style.styleId === 'Title'
    || style.styleId === 'Subtitle'
    || style.styleId.startsWith('Heading')
    || style.styleId === 'TOCHeading';
  const isCode = style.styleId === 'Code' || style.styleId === 'CodeBlock';
  const run = style.run ? { ...style.run } : undefined;

  if (run) {
    if (isCode && options.monospaceFont) {
      run.fontFamily = options.monospaceFont;
    } else if (isHeading && options.headingFont) {
      run.fontFamily = options.headingFont;
    } else if (options.bodyFont && (run.fontFamily === 'Calibri' || run.fontFamily === 'Calibri Light')) {
      run.fontFamily = options.bodyFont;
    }

    if (options.primaryColor && (
      style.styleId === 'Title'
      || style.styleId.startsWith('Heading')
      || style.styleId === 'IntenseQuote'
    )) {
      run.color = options.primaryColor;
    } else if (options.textColor && style.styleId === 'Normal') {
      run.color = options.textColor;
    }
  }

  return run ? { ...style, run } : style;
}

function serializeRunProperties(style: StyleDefinition): ReturnType<typeof xmlElement>[] {
  if (!style.run) {
    return [];
  }

  const children: ReturnType<typeof xmlElement>[] = [];
  if (style.run.fontFamily) {
    children.push(xmlElement('w:rFonts', {
      'w:ascii': style.run.fontFamily,
      'w:hAnsi': style.run.fontFamily,
      'w:cs': style.run.fontFamily,
    }));
  }
  if (style.run.bold) {
    children.push(xmlElement('w:b'));
  }
  if (style.run.italic) {
    children.push(xmlElement('w:i'));
  }
  if (style.run.noProof) {
    children.push(xmlElement('w:noProof'));
  }
  if (style.run.color) {
    const value = normalizeOoxmlColor(style.run.color) ?? '000000';
    children.push(xmlElement('w:color', { 'w:val': value }));
  }
  if (style.run.fontSize) {
    const size = String(pointsToHalfPoints(style.run.fontSize));
    children.push(xmlElement('w:sz', { 'w:val': size }));
    children.push(xmlElement('w:szCs', { 'w:val': size }));
  }
  if (style.run.underline) {
    children.push(xmlElement('w:u', { 'w:val': style.run.underline }));
  }
  if (style.run.vertAlign) {
    children.push(xmlElement('w:vertAlign', { 'w:val': style.run.vertAlign }));
  }
  return children;
}

function serializeParagraphProperties(style: StyleDefinition): ReturnType<typeof xmlElement>[] {
  if (!style.paragraph) {
    return [];
  }

  const children: ReturnType<typeof xmlElement>[] = [];
  if (style.paragraph.keepNext) {
    children.push(xmlElement('w:keepNext'));
  }
  if (style.paragraph.keepLines) {
    children.push(xmlElement('w:keepLines'));
  }
  if (
    style.paragraph.spacingBefore !== undefined
    || style.paragraph.spacingAfter !== undefined
    || style.paragraph.line !== undefined
  ) {
    children.push(xmlElement('w:spacing', {
      ...(style.paragraph.spacingBefore !== undefined ? { 'w:before': String(style.paragraph.spacingBefore) } : {}),
      ...(style.paragraph.spacingAfter !== undefined ? { 'w:after': String(style.paragraph.spacingAfter) } : {}),
      ...(style.paragraph.line !== undefined ? { 'w:line': String(style.paragraph.line), 'w:lineRule': 'auto' } : {}),
    }));
  }
  if (style.paragraph.indentLeft !== undefined || style.paragraph.indentHanging !== undefined) {
    children.push(xmlElement('w:ind', {
      ...(style.paragraph.indentLeft !== undefined ? { 'w:left': String(style.paragraph.indentLeft) } : {}),
      ...(style.paragraph.indentHanging !== undefined ? { 'w:hanging': String(style.paragraph.indentHanging) } : {}),
    }));
  }
  if (style.paragraph.contextualSpacing) {
    children.push(xmlElement('w:contextualSpacing'));
  }
  if (style.paragraph.alignment) {
    children.push(xmlElement('w:jc', { 'w:val': style.paragraph.alignment }));
  }
  if (style.paragraph.outlineLvl !== undefined) {
    children.push(xmlElement('w:outlineLvl', { 'w:val': String(style.paragraph.outlineLvl) }));
  }
  return children;
}

function serializeStyle(style: StyleDefinition) {
  return xmlElement('w:style', {
    'w:type': style.type,
    'w:styleId': style.styleId,
    ...(style.isDefault ? { 'w:default': '1' } : {}),
  }, [
    xmlElement('w:name', { 'w:val': style.name }),
    ...(style.basedOn ? [xmlElement('w:basedOn', { 'w:val': style.basedOn })] : []),
    ...(style.next ? [xmlElement('w:next', { 'w:val': style.next })] : []),
    ...(style.type === 'paragraph' ? [xmlElement('w:qFormat')] : []),
    ...(style.paragraph ? [xmlElement('w:pPr', undefined, serializeParagraphProperties(style))] : []),
    ...(style.run ? [xmlElement('w:rPr', undefined, serializeRunProperties(style))] : []),
  ]);
}

export function buildStylesXml(options: NativeStylesOptions = {}): string {
  const baseStyles = options.includeToc
    ? BUILT_IN_STYLES
    : BUILT_IN_STYLES.filter((style) => !style.styleId.startsWith('TOC'));
  const styles = baseStyles.map((style) => applyThemeToStyle(style, options));
  const bodyFont = options.bodyFont ?? 'Calibri';
  const language = options.language ?? 'en-US';

  return serializeXml(
    xmlElement(
      'w:styles',
      {
        'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
      },
      [
        xmlElement('w:docDefaults', undefined, [
          xmlElement('w:rPrDefault', undefined, [
            xmlElement('w:rPr', undefined, [
              xmlElement('w:rFonts', { 'w:ascii': bodyFont, 'w:hAnsi': bodyFont, 'w:cs': bodyFont }),
              xmlElement('w:sz', { 'w:val': '22' }),
              xmlElement('w:szCs', { 'w:val': '22' }),
              xmlElement('w:lang', { 'w:val': language, 'w:eastAsia': language, 'w:bidi': language }),
            ]),
          ]),
          xmlElement('w:pPrDefault', undefined, [
            xmlElement('w:pPr', undefined, [
              xmlElement('w:spacing', { 'w:after': '160', 'w:line': '276', 'w:lineRule': 'auto' }),
            ]),
          ]),
        ]),
        xmlElement('w:latentStyles', { 'w:defLockedState': '0', 'w:defUIPriority': '99', 'w:defSemiHidden': '0', 'w:defUnhideWhenUsed': '0', 'w:defQFormat': '0', 'w:count': '376' }),
        ...styles.map(serializeStyle),
      ],
    ),
  );
}
