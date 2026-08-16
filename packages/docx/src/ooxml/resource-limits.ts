import { z } from 'zod';
import type {
  HeaderFooterContent,
  ListElement,
  StructuredDocument,
  StructuredElement,
  TableCell,
  TextRun,
} from '../types.js';
import { createResourceLimitError } from './errors.js';

export interface ResourceLimits {
  maxPages: number;
  maxSections: number;
  maxElements: number;
  maxParagraphs: number;
  maxRunsPerParagraph: number;
  maxTextLength: number;
  maxTextNodeChars: number;
  maxFonts: number;
  maxTableColumns: number;
  maxTableNestingDepth: number;
  maxListNestingLevel: number;
  maxImageSizeBytes: number;
  maxTotalMediaBytes: number;
  maxTotalXmlBytes: number;
  maxInputJsonBytes: number;
  maxInputStringBytes: number;
  maxInputBase64Bytes: number;
}

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxPages: 500,
  maxSections: 500,
  maxElements: 50000,
  maxParagraphs: 50000,
  maxRunsPerParagraph: 2000,
  maxTextLength: 5_000_000,
  maxTextNodeChars: 200_000,
  maxFonts: 256,
  maxTableColumns: 64,
  maxTableNestingDepth: 5,
  maxListNestingLevel: 8,
  maxImageSizeBytes: 10 * 1024 * 1024,
  maxTotalMediaBytes: 50 * 1024 * 1024,
  maxTotalXmlBytes: 25 * 1024 * 1024,
  maxInputJsonBytes: 25 * 1024 * 1024,
  maxInputStringBytes: 1 * 1024 * 1024,
  maxInputBase64Bytes: 14 * 1024 * 1024,
};

const ResourceLimitsSchema = z.object({
  maxPages: z.number().int().positive(),
  maxSections: z.number().int().positive(),
  maxElements: z.number().int().positive(),
  maxParagraphs: z.number().int().positive(),
  maxRunsPerParagraph: z.number().int().positive(),
  maxTextLength: z.number().int().positive(),
  maxTextNodeChars: z.number().int().positive(),
  maxFonts: z.number().int().positive(),
  maxTableColumns: z.number().int().positive(),
  maxTableNestingDepth: z.number().int().positive(),
  maxListNestingLevel: z.number().int().nonnegative(),
  maxImageSizeBytes: z.number().int().positive(),
  maxTotalMediaBytes: z.number().int().positive(),
  maxTotalXmlBytes: z.number().int().positive(),
  maxInputJsonBytes: z.number().int().positive(),
  maxInputStringBytes: z.number().int().positive(),
  maxInputBase64Bytes: z.number().int().positive(),
}).partial();

export function resolveResourceLimits(overrides?: Partial<ResourceLimits>): ResourceLimits {
  const parsed = ResourceLimitsSchema.parse(overrides ?? {});
  return { ...DEFAULT_RESOURCE_LIMITS, ...parsed };
}

interface ResourceUsage {
  elementCount: number;
  paragraphCount: number;
  totalTextLength: number;
  fonts: Set<string>;
}

interface WalkState {
  tableDepth: number;
  listLevel: number;
}

function failIfOver(limit: keyof ResourceLimits, actual: number, limits: ResourceLimits): void {
  const max = limits[limit];
  if (actual > max) {
    throw createResourceLimitError(limit, actual, max);
  }
}

function stringBytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function base64PayloadLength(value: string): number | undefined {
  const commaIndex = value.indexOf(',');
  if (commaIndex === -1) {
    return undefined;
  }
  const metadata = value.slice(0, commaIndex).toLowerCase();
  if (!metadata.startsWith('data:') || !metadata.includes(';base64')) {
    return undefined;
  }
  return value.length - commaIndex - 1;
}

function estimateInputJsonBytes(
  value: unknown,
  limits: ResourceLimits,
  seen: WeakSet<object>,
): number {
  if (value === null) {
    return 4;
  }

  switch (typeof value) {
    case 'string': {
      const bytes = stringBytes(value);
      failIfOver('maxInputStringBytes', bytes, limits);
      const base64Length = base64PayloadLength(value);
      if (base64Length !== undefined) {
        failIfOver('maxInputBase64Bytes', base64Length, limits);
      }
      return bytes + 2;
    }
    case 'number':
    case 'bigint':
    case 'boolean':
      return String(value).length;
    case 'undefined':
    case 'function':
    case 'symbol':
      return 0;
    case 'object':
      break;
  }

  if (Buffer.isBuffer(value)) {
    failIfOver('maxInputBase64Bytes', Math.ceil(value.length * 4 / 3), limits);
    return value.length;
  }

  if (seen.has(value)) {
    throw createResourceLimitError('maxInputJsonBytes', limits.maxInputJsonBytes + 1, limits.maxInputJsonBytes);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    let total = 2;
    for (const item of value) {
      total += estimateInputJsonBytes(item, limits, seen) + 1;
      failIfOver('maxInputJsonBytes', total, limits);
    }
    seen.delete(value);
    return total;
  }

  let total = 2;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const keyBytes = stringBytes(key) + 2;
    total += keyBytes + estimateInputJsonBytes(item, limits, seen) + 2;
    failIfOver('maxInputJsonBytes', total, limits);
  }
  seen.delete(value);
  return total;
}

export function enforceInputResourceLimits(input: unknown, limits: ResourceLimits): void {
  const total = estimateInputJsonBytes(input, limits, new WeakSet<object>());
  failIfOver('maxInputJsonBytes', total, limits);
}

function addFont(usage: ResourceUsage, fontName: string | undefined): void {
  const normalized = fontName?.trim();
  if (normalized) {
    usage.fonts.add(normalized);
  }
}

function renderedRunTextLength(runs: TextRun[]): number {
  return runs.reduce((total, run) => total + run.text.length, 0);
}

function addTextLength(usage: ResourceUsage, limits: ResourceLimits, length: number): void {
  usage.totalTextLength += length;
  failIfOver('maxTextLength', usage.totalTextLength, limits);
}

function validateTextNode(limits: ResourceLimits, text: string): void {
  failIfOver('maxTextNodeChars', text.length, limits);
}

function validateRuns(usage: ResourceUsage, limits: ResourceLimits, runs: TextRun[]): void {
  failIfOver('maxRunsPerParagraph', runs.length, limits);
  for (const run of runs) {
    validateTextNode(limits, run.text);
    addFont(usage, run.fontFamily);
  }
}

function recordParagraphText(
  usage: ResourceUsage,
  limits: ResourceLimits,
  text: string,
  runs: TextRun[] = [],
): void {
  usage.paragraphCount += 1;
  failIfOver('maxParagraphs', usage.paragraphCount, limits);

  validateTextNode(limits, text);
  validateRuns(usage, limits, runs);
  addTextLength(usage, limits, text.length > 0 ? text.length : renderedRunTextLength(runs));
}

function commentText(comment: unknown): string | undefined {
  if (typeof comment === 'string') {
    return comment;
  }
  if (typeof comment === 'object' && comment && 'text' in comment) {
    const text = (comment as { text?: unknown }).text;
    return typeof text === 'string' ? text : undefined;
  }
  return undefined;
}

function recordSupplementalText(
  usage: ResourceUsage,
  limits: ResourceLimits,
  text: string | undefined,
): void {
  if (text !== undefined) {
    recordParagraphText(usage, limits, text);
  }
}

function recordElementAnnotations(
  usage: ResourceUsage,
  limits: ResourceLimits,
  element: StructuredElement,
): void {
  recordSupplementalText(usage, limits, element.docx?.footnote);
  recordSupplementalText(usage, limits, element.docx?.endnote);
  recordSupplementalText(usage, limits, commentText(element.docx?.comment));

  if ('comment' in element) {
    recordSupplementalText(usage, limits, commentText(element.comment));
  }
}

function recordElement(usage: ResourceUsage, limits: ResourceLimits, element: StructuredElement): void {
  usage.elementCount += 1;
  failIfOver('maxElements', usage.elementCount, limits);
  addFont(usage, element.style.fontFamily);
  recordElementAnnotations(usage, limits, element);
}

function walkTableCell(
  usage: ResourceUsage,
  limits: ResourceLimits,
  cell: TableCell,
  state: WalkState,
): void {
  addFont(usage, cell.style.fontFamily);

  if (cell.elements && cell.elements.length > 0) {
    for (const child of cell.elements) {
      walkElement(usage, limits, child, state);
    }
    return;
  }

  recordParagraphText(usage, limits, cell.text, cell.content);
}

function walkList(
  usage: ResourceUsage,
  limits: ResourceLimits,
  element: ListElement,
  state: WalkState,
): void {
  const currentLevel = Math.max(element.level, state.listLevel);
  failIfOver('maxListNestingLevel', currentLevel, limits);

  for (const item of element.items) {
    recordParagraphText(usage, limits, item.text, item.content);
    if (item.nestedList) {
      walkElement(usage, limits, item.nestedList, {
        ...state,
        listLevel: currentLevel + 1,
      });
    }
  }
}

function walkElement(
  usage: ResourceUsage,
  limits: ResourceLimits,
  element: StructuredElement,
  state: WalkState,
): void {
  recordElement(usage, limits, element);

  switch (element.type) {
    case 'heading':
    case 'paragraph':
    case 'text-run':
      recordParagraphText(usage, limits, element.text, element.runs);
      break;
    case 'code-block': {
      const lines = element.code.split(/\r\n|\n|\r/);
      usage.paragraphCount += Math.max(1, lines.length);
      failIfOver('maxParagraphs', usage.paragraphCount, limits);
      addTextLength(usage, limits, element.code.length);
      for (const line of lines) {
        validateTextNode(limits, line);
      }
      break;
    }
    case 'table': {
      const tableDepth = state.tableDepth + 1;
      failIfOver('maxTableNestingDepth', tableDepth, limits);
      failIfOver('maxTableColumns', element.columns.length, limits);

      for (const row of element.rows) {
        for (const cell of row.cells) {
          walkTableCell(usage, limits, cell, { ...state, tableDepth });
        }
      }
      break;
    }
    case 'list':
      walkList(usage, limits, element, state);
      break;
    case 'container':
      for (const child of element.children) {
        walkElement(usage, limits, child, state);
      }
      break;
    case 'shape':
      if (element.text || (element.runs && element.runs.length > 0)) {
        recordParagraphText(usage, limits, element.text ?? '', element.runs ?? []);
      }
      break;
    case 'chart':
      if (element.title) {
        validateTextNode(limits, element.title);
        addTextLength(usage, limits, element.title.length);
      }
      for (const category of element.categories ?? []) {
        validateTextNode(limits, category);
        addTextLength(usage, limits, category.length);
      }
      for (const series of element.series) {
        validateTextNode(limits, series.name);
        addTextLength(usage, limits, series.name.length);
      }
      break;
    case 'image':
    case 'page-break':
    case 'divider':
      break;
    default:
      break;
  }
}

function walkHeaderFooter(
  usage: ResourceUsage,
  limits: ResourceLimits,
  content: HeaderFooterContent | undefined,
): void {
  if (!content) {
    return;
  }

  const groups = [
    content.elements,
    content.firstElements ?? [],
    content.evenElements ?? [],
  ];

  for (const elements of groups) {
    for (const element of elements) {
      walkElement(usage, limits, element, { tableDepth: 0, listLevel: 0 });
    }
  }
}

export function enforceResourceLimits(document: StructuredDocument, limits: ResourceLimits): void {
  failIfOver('maxPages', document.pages.length, limits);
  failIfOver('maxSections', document.pages.length, limits);

  const usage: ResourceUsage = {
    elementCount: 0,
    paragraphCount: 0,
    totalTextLength: 0,
    fonts: new Set<string>(['Calibri', 'Calibri Light', 'Cambria', 'Consolas']),
  };

  if (document.metadata.language) {
    usage.fonts.add('Arial');
  }

  for (const page of document.pages) {
    for (const element of page.elements) {
      walkElement(usage, limits, element, { tableDepth: 0, listLevel: 0 });
    }
    walkHeaderFooter(usage, limits, page.header);
    walkHeaderFooter(usage, limits, page.footer);
  }

  for (const [fontName, font] of document.assets.fonts.entries()) {
    addFont(usage, fontName);
    addFont(usage, font.family);
  }
  failIfOver('maxFonts', usage.fonts.size, limits);
}
