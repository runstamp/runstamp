import { pointsToHalfPoints, type HalfPoints } from '../../utils/units.js';
import type { TextRun } from '../../types.js';
import { DOCXError, DOCXErrorCode } from '../../errors.js';
import { OrderedBuilder, xmlElement } from '../ordered-builder.js';
import { RUN_PROPERTY_ORDER, type XmlElement } from '../types.js';
import { normalizeOoxmlColor } from '../color.js';

export interface NativeRunPropertiesInput {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: TextRun['fontWeight'];
  fontStyle?: TextRun['fontStyle'];
  textDecoration?: TextRun['textDecoration'];
  color?: string;
  backgroundColor?: string;
  superscript?: boolean;
  subscript?: boolean;
  noProof?: boolean;
  autoNoProof?: boolean;
  rtl?: boolean;
  styleId?: string;
  themeColor?: string;
  themeTint?: string;
  themeShade?: string;
  language?: string;
  allowCssHex?: boolean;
}

function booleanElement(tag: string, value: boolean | undefined): XmlElement | undefined {
  if (value === undefined) return undefined;
  return value ? xmlElement(tag) : xmlElement(tag, { 'w:val': 'false' });
}

export function containsRtlText(text: string): boolean {
  return /[\u0590-\u08FF]/.test(text);
}

function normalizeFontSize(fontSize: number | undefined): number | undefined {
  if (fontSize === undefined) {
    return undefined;
  }
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    throw new DOCXError(
      DOCXErrorCode.INVALID_FONT_SIZE,
      `Invalid DOCX font size "${fontSize}".`,
      {
        recovery: 'Use a positive finite font size in points.',
        context: { fontSize },
      },
    );
  }
  return fontSize;
}

export function buildRunProperties(input: NativeRunPropertiesInput): XmlElement | undefined {
  const builder = new OrderedBuilder<(typeof RUN_PROPERTY_ORDER)[number]>(RUN_PROPERTY_ORDER);

  if (input.styleId) {
    builder.set('rStyle', xmlElement('w:rStyle', { 'w:val': input.styleId }));
  }

  if (input.fontFamily) {
    builder.set('rFonts', xmlElement('w:rFonts', {
      'w:ascii': input.fontFamily,
      'w:hAnsi': input.fontFamily,
      'w:cs': input.fontFamily,
    }));
  }

  const bold = typeof input.fontWeight === 'number' ? input.fontWeight >= 600 : input.fontWeight === 'bold';
  builder.set('b', booleanElement('w:b', bold ? true : undefined));
  builder.set('i', booleanElement('w:i', input.fontStyle === 'italic' ? true : undefined));

  const underline = input.textDecoration?.includes('underline')
    ? xmlElement('w:u', { 'w:val': 'single' })
    : undefined;
  builder.set('u', underline);

  const strike = input.textDecoration?.includes('line-through')
    ? xmlElement('w:strike')
    : undefined;
  builder.set('strike', strike);

  const normalizedColor = normalizeOoxmlColor(input.color, undefined, { allowCssHex: input.allowCssHex });
  if (normalizedColor) {
    builder.set('color', xmlElement('w:color', {
      'w:val': normalizedColor,
      ...(input.themeColor ? { 'w:themeColor': input.themeColor } : {}),
      ...(input.themeTint ? { 'w:themeTint': input.themeTint } : {}),
      ...(input.themeShade ? { 'w:themeShade': input.themeShade } : {}),
    }));
  }

  const fontSize = normalizeFontSize(input.fontSize);
  if (fontSize !== undefined) {
    const halfPoints: HalfPoints = pointsToHalfPoints(fontSize);
    const value = String(halfPoints);
    builder.set('sz', xmlElement('w:sz', { 'w:val': value }));
    builder.set('szCs', xmlElement('w:szCs', { 'w:val': value }));
  }

  if (input.backgroundColor) {
    builder.set('shd', xmlElement('w:shd', {
      'w:val': 'clear',
      'w:color': 'auto',
      'w:fill': normalizeOoxmlColor(input.backgroundColor, 'FFFFFF', { allowCssHex: input.allowCssHex }) ?? 'FFFFFF',
    }));
  }

  if (input.superscript) {
    builder.set('vertAlign', xmlElement('w:vertAlign', { 'w:val': 'superscript' }));
  } else if (input.subscript) {
    builder.set('vertAlign', xmlElement('w:vertAlign', { 'w:val': 'subscript' }));
  }

  const noProof = input.noProof ?? input.autoNoProof ?? true;
  builder.set('noProof', booleanElement('w:noProof', noProof));

  if (input.rtl) {
    builder.set('rtl', xmlElement('w:rtl'));
    builder.set('cs', xmlElement('w:cs'));
  }

  if (input.language) {
    builder.set('lang', xmlElement('w:lang', {
      'w:val': input.language,
      'w:eastAsia': input.language,
      ...(input.rtl ? { 'w:bidi': input.language } : {}),
    }));
  }

  const children = builder.build();
  return children.length > 0 ? xmlElement('w:rPr', undefined, children) : undefined;
}
