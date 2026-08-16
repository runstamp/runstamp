import { lineHeightToDocx, pxToTwips, type LineSpacingDxa, type Twips } from '../../utils/units.js';
import type {
  CodeBlockElement,
  DividerElement,
  HeadingElement,
  ParagraphElement,
  StructuredElement,
  TextRunElement,
} from '../../types.js';
import { OrderedBuilder, xmlElement } from '../ordered-builder.js';
import { PARAGRAPH_PROPERTY_ORDER, type XmlElement } from '../types.js';
import { normalizeOoxmlColor } from '../color.js';

export interface NativeParagraphPropertiesInput {
  element: HeadingElement | ParagraphElement | TextRunElement | CodeBlockElement | DividerElement;
  styleId?: string;
  sectionProperties?: XmlElement;
  codeBlockEdge?: 'single' | 'first' | 'middle' | 'last';
  rtl?: boolean;
}

function mapAlignment(value: string | undefined): 'left' | 'center' | 'right' | 'both' | undefined {
  if (value === 'justify') return 'both';
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return undefined;
}

function buildSpacing(element: StructuredElement): XmlElement | undefined {
  const before: Twips = pxToTwips((element.style.marginTop || 0) + (element.style.paddingTop || 0));
  const after: Twips = pxToTwips((element.style.marginBottom || 0) + (element.style.paddingBottom || 0));
  const line: LineSpacingDxa = lineHeightToDocx(element.style.lineHeight || 1.15);

  if (before === 0 && after === 0 && line === 240) {
    return undefined;
  }

  return xmlElement('w:spacing', {
    ...(before > 0 ? { 'w:before': String(before) } : {}),
    ...(after > 0 ? { 'w:after': String(after) } : {}),
    'w:line': String(line),
    'w:lineRule': 'auto',
  });
}

function buildInd(element: StructuredElement): XmlElement | undefined {
  const left: Twips = pxToTwips((element.docx?.indent?.left ?? 0) + (element.style.paddingLeft || 0));
  const right: Twips = pxToTwips((element.docx?.indent?.right ?? 0) + (element.style.paddingRight || 0));
  const firstLine: Twips = pxToTwips(element.docx?.indent?.firstLine ?? 0);

  if (left === 0 && right === 0 && firstLine === 0) {
    return undefined;
  }

  return xmlElement('w:ind', {
    ...(left !== 0 ? { 'w:left': String(left) } : {}),
    ...(right !== 0 ? { 'w:right': String(right) } : {}),
    ...(firstLine !== 0 ? { 'w:firstLine': String(firstLine) } : {}),
  });
}

function paragraphBorderValue(style: string): string {
  if (style === 'solid') return 'single';
  if (style === 'none') return 'nil';
  return style;
}

function buildParagraphBorders(element: StructuredElement): XmlElement | undefined {
  const sides = [
    ['top', element.style.borderTopWidth, element.style.borderTopStyle, element.style.borderTopColor, element.style.paddingTop],
    ['left', element.style.borderLeftWidth, element.style.borderLeftStyle, element.style.borderLeftColor, element.style.paddingLeft],
    ['bottom', element.style.borderBottomWidth, element.style.borderBottomStyle, element.style.borderBottomColor, element.style.paddingBottom],
    ['right', element.style.borderRightWidth, element.style.borderRightStyle, element.style.borderRightColor, element.style.paddingRight],
  ] as const;
  const borders = sides.flatMap(([side, width, style, color, padding]) => {
    if (width <= 0 || style === 'none') return [];
    return [xmlElement(`w:${side}`, {
      'w:val': paragraphBorderValue(style),
      'w:sz': String(Math.max(2, Math.round(width * 8))),
      'w:space': String(Math.max(0, Math.round(padding || 0))),
      'w:color': normalizeOoxmlColor(color, '000000', { allowCssHex: true }) ?? '000000',
    })];
  });
  return borders.length > 0 ? xmlElement('w:pBdr', undefined, borders) : undefined;
}

function buildParagraphShading(element: StructuredElement): XmlElement | undefined {
  if (!element.style.backgroundColor) return undefined;
  return xmlElement('w:shd', {
    'w:val': 'clear',
    'w:color': 'auto',
    'w:fill': normalizeOoxmlColor(element.style.backgroundColor, 'FFFFFF', { allowCssHex: true }) ?? 'FFFFFF',
  });
}

function buildCodeBlockProperties(
  element: CodeBlockElement,
  edge: NativeParagraphPropertiesInput['codeBlockEdge'],
): XmlElement[] {
  const fill = normalizeOoxmlColor(element.style.backgroundColor, 'F5F5F5', { allowCssHex: true }) ?? 'F5F5F5';
  const borderColor = normalizeOoxmlColor(element.style.borderLeftColor, 'D9D9D9', { allowCssHex: true }) ?? 'D9D9D9';
  const size = String(Math.max(4, Math.round((element.style.borderLeftWidth || 1) * 8)));

  return [
    xmlElement('w:pBdr', undefined, [
      ...(edge === 'single' || edge === 'first' ? [xmlElement('w:top', { 'w:val': 'single', 'w:sz': size, 'w:space': '0', 'w:color': borderColor })] : []),
      xmlElement('w:left', { 'w:val': 'single', 'w:sz': size, 'w:space': '0', 'w:color': borderColor }),
      ...(edge === 'single' || edge === 'last' ? [xmlElement('w:bottom', { 'w:val': 'single', 'w:sz': size, 'w:space': '0', 'w:color': borderColor })] : []),
      xmlElement('w:right', { 'w:val': 'single', 'w:sz': size, 'w:space': '0', 'w:color': borderColor }),
    ]),
    xmlElement('w:shd', { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': fill }),
    xmlElement('w:spacing', { 'w:before': edge === 'first' || edge === 'single' ? '80' : '0', 'w:after': edge === 'last' || edge === 'single' ? '80' : '0', 'w:line': '240', 'w:lineRule': 'auto' }),
    xmlElement('w:ind', { 'w:left': '240', 'w:right': '240' }),
  ];
}

function buildDividerProperties(element: DividerElement): XmlElement {
  const val = element.styleType ?? 'single';
  const thickness = String(Math.max(4, Math.round((element.thickness ?? 1) * 8)));
  const color = normalizeOoxmlColor(element.color ?? element.style.borderBottomColor, 'BFBFBF', { allowCssHex: true }) ?? 'BFBFBF';

  return xmlElement('w:pBdr', undefined, [
    xmlElement('w:bottom', {
      'w:val': val === 'solid' ? 'single' : val,
      'w:sz': thickness,
      'w:space': '1',
      'w:color': color,
    }),
  ]);
}

export function buildParagraphProperties(input: NativeParagraphPropertiesInput): XmlElement | undefined {
  const builder = new OrderedBuilder<(typeof PARAGRAPH_PROPERTY_ORDER)[number]>(PARAGRAPH_PROPERTY_ORDER);
  const { element } = input;

  const styleId = input.styleId ?? element.docx?.paragraphStyleId;
  if (styleId) {
    builder.set('pStyle', xmlElement('w:pStyle', { 'w:val': styleId }));
  }

  if (element.docx?.keepNext || element.type === 'heading') {
    builder.set('keepNext', xmlElement('w:keepNext'));
  }
  if (element.docx?.keepLines || element.type === 'heading') {
    builder.set('keepLines', xmlElement('w:keepLines'));
  }
  if (element.docx?.pageBreakBefore) {
    builder.set('pageBreakBefore', xmlElement('w:pageBreakBefore'));
  }

  if (element.docx?.listInfo) {
    builder.set('numPr', xmlElement('w:numPr', undefined, [
      xmlElement('w:ilvl', { 'w:val': String(element.docx.listInfo.level) }),
      xmlElement('w:numId', { 'w:val': String(element.docx.listInfo.numId) }),
    ]));
  }

  if (element.type === 'code-block') {
    builder.set('pBdr', buildCodeBlockProperties(element, input.codeBlockEdge));
  } else if (element.type === 'divider') {
    builder.set('pBdr', buildDividerProperties(element));
    builder.set('spacing', buildSpacing(element) ?? xmlElement('w:spacing', { 'w:before': '80', 'w:after': '80' }));
  } else {
    builder.set('pBdr', buildParagraphBorders(element));
    builder.set('shd', buildParagraphShading(element));
    builder.set('spacing', buildSpacing(element));
    builder.set('ind', buildInd(element));
  }

  const alignment = mapAlignment(element.style.textAlign);
  if (alignment) {
    builder.set('jc', xmlElement('w:jc', { 'w:val': alignment }));
  }

  if (input.rtl) {
    builder.set('bidi', xmlElement('w:bidi'));
  }

  if (element.type === 'heading') {
    builder.set('outlineLvl', xmlElement('w:outlineLvl', { 'w:val': String(Math.max(0, element.level - 1)) }));
  }

  if (input.sectionProperties) {
    builder.set('sectPr', input.sectionProperties);
  }

  const children = builder.build();
  return children.length > 0 ? xmlElement('w:pPr', undefined, children) : undefined;
}
