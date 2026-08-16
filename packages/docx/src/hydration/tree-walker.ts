import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { DOCXError, DOCXErrorCode } from '../errors.js';
import {
  isComplexValue,
  valueToOoxml,
  type HydrationValue,
  type RelationshipManager,
} from './ooxml-injector';
import type { HydrationOptions, HydrationTelemetry } from './hydrator';
import type { PlaceholderMatch } from './placeholder-scanner';

type OrderedXmlNode = Record<string, unknown>;

interface TextNodeRef {
  node: OrderedXmlNode;
  start: number;
  end: number;
  path: string;
}

interface PlaceholderSpan {
  key: string;
  fullMatch: string;
  syntax: 'mustache' | 'office';
  officeKind?: 'value' | 'loop' | 'if';
  inner?: string;
  formatSpec?: string;
  start: number;
  end: number;
}

interface HydrateXmlOptions {
  partPath: string;
  syntax: 'mustache' | 'office' | 'auto';
  data: Record<string, HydrationValue>;
  hydrationOptions: HydrationOptions;
  relationshipManager: RelationshipManager;
  telemetry: HydrationTelemetry;
  markReplaced(key: string): void;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  parseTagValue: false,
  trimValues: false,
  ignoreDeclaration: false,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  format: false,
  suppressEmptyNode: true,
});

const MUSTACHE_PLACEHOLDER_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;
const OFFICE_VALUE_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::format\(([^{}]*)\))?\}/g;
const OFFICE_LOOP_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):start\}([\s\S]*?)\{d\.\1:end\}/g;
const OFFICE_IF_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):if\}([\s\S]*?)\{d\.\1:endif\}/g;

function getTag(node: OrderedXmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== ':@' && key !== '#text');
}

function getChildren(node: OrderedXmlNode, tag = getTag(node)): OrderedXmlNode[] {
  if (!tag) {
    return [];
  }
  const children = node[tag];
  return Array.isArray(children) ? children as OrderedXmlNode[] : [];
}

function getTextValue(node: OrderedXmlNode): string {
  const children = getChildren(node, 'w:t');
  const textNode = children.find((child) => Object.prototype.hasOwnProperty.call(child, '#text'));
  return typeof textNode?.['#text'] === 'string' ? textNode['#text'] as string : '';
}

function setTextValue(node: OrderedXmlNode, value: string): void {
  let children = getChildren(node, 'w:t');
  if (children.length === 0) {
    children = [{ '#text': '' }];
    node['w:t'] = children;
  }

  let textNode = children.find((child) => Object.prototype.hasOwnProperty.call(child, '#text'));
  if (!textNode) {
    textNode = { '#text': '' };
    children.unshift(textNode);
  }
  textNode['#text'] = value;

  if (/^\s|\s$/.test(value)) {
    const attrs = (node[':@'] && typeof node[':@'] === 'object') ? node[':@'] as Record<string, string> : {};
    attrs['@_xml:space'] = 'preserve';
    node[':@'] = attrs;
  }
}

function collectTextNodes(nodes: OrderedXmlNode[], out: TextNodeRef[], cursor: { value: number }, path: string): void {
  nodes.forEach((node, index) => {
    const tag = getTag(node);
    if (!tag) {
      return;
    }

    const childPath = `${path}/${tag}[${index}]`;
    if (tag === 'w:t') {
      const text = getTextValue(node);
      out.push({
        node,
        start: cursor.value,
        end: cursor.value + text.length,
        path: childPath,
      });
      cursor.value += text.length;
      return;
    }

    collectTextNodes(getChildren(node, tag), out, cursor, childPath);
  });
}

function extractParagraphText(textNodes: TextNodeRef[]): string {
  return textNodes.map((ref) => getTextValue(ref.node)).join('');
}

function collectPlaceholderSpans(text: string, syntax: 'mustache' | 'office' | 'auto'): PlaceholderSpan[] {
  const spans: PlaceholderSpan[] = [];
  const coveredOfficeRanges: Array<{ start: number; end: number }> = [];

  if (syntax === 'mustache' || syntax === 'auto') {
    const regex = new RegExp(MUSTACHE_PLACEHOLDER_PATTERN.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      spans.push({
        key: match[1],
        fullMatch: match[0],
        syntax: 'mustache',
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  if (syntax === 'office' || syntax === 'auto') {
    for (const loopMatch of text.matchAll(OFFICE_LOOP_PATTERN)) {
      if (loopMatch.index !== undefined) {
        const start = loopMatch.index;
        const end = loopMatch.index + loopMatch[0].length;
        coveredOfficeRanges.push({ start, end });
        spans.push({
          key: loopMatch[1],
          fullMatch: loopMatch[0],
          syntax: 'office',
          officeKind: 'loop',
          inner: loopMatch[2],
          start,
          end,
        });
      }
    }
    for (const ifMatch of text.matchAll(OFFICE_IF_PATTERN)) {
      if (ifMatch.index !== undefined) {
        const start = ifMatch.index;
        const end = ifMatch.index + ifMatch[0].length;
        coveredOfficeRanges.push({ start, end });
        spans.push({
          key: ifMatch[1],
          fullMatch: ifMatch[0],
          syntax: 'office',
          officeKind: 'if',
          inner: ifMatch[2],
          start,
          end,
        });
      }
    }
    const valueRegex = new RegExp(OFFICE_VALUE_PATTERN.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = valueRegex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (coveredOfficeRanges.some((range) => start >= range.start && end <= range.end)) {
        continue;
      }
      spans.push({
        key: match[1],
        fullMatch: match[0],
        syntax: 'office',
        officeKind: 'value',
        formatSpec: match[2],
        start,
        end,
      });
    }
  }

  return spans.sort((a, b) => a.start - b.start);
}

export function scanXmlForPlaceholdersTree(
  xmlContent: string,
  filePath: string,
  syntax: 'mustache' | 'office' | 'auto' = 'auto',
): PlaceholderMatch[] {
  const parsed = xmlParser.parse(xmlContent) as OrderedXmlNode[];
  const matches: PlaceholderMatch[] = [];

  visitParagraphs(parsed, 'xml', (paragraph) => {
    const textNodes: TextNodeRef[] = [];
    collectTextNodes(getChildren(paragraph, 'w:p'), textNodes, { value: 0 }, filePath);
    for (const span of collectPlaceholderSpans(extractParagraphText(textNodes), syntax)) {
      matches.push({
        key: span.key,
        fullMatch: span.fullMatch,
        filePath,
        syntax: span.syntax,
      });
    }
  });

  return matches;
}

function visitParagraphs(
  nodes: OrderedXmlNode[],
  path: string,
  callback: (paragraph: OrderedXmlNode, siblings: OrderedXmlNode[], index: number, path: string) => void,
): void {
  nodes.forEach((node, index) => {
    const tag = getTag(node);
    if (!tag) {
      return;
    }

    const childPath = `${path}/${tag}[${index}]`;
    if (tag === 'w:p') {
      callback(node, nodes, index, childPath);
      return;
    }
    visitParagraphs(getChildren(node, tag), childPath, callback);
  });
}

function findTextNodeRange(textNodes: TextNodeRef[], start: number, end: number): {
  first: TextNodeRef;
  last: TextNodeRef;
  firstIndex: number;
  lastIndex: number;
} | undefined {
  const firstIndex = textNodes.findIndex((ref) =>
    (start >= ref.start && start < ref.end) || (ref.start === ref.end && start === ref.start),
  );
  const lastIndex = textNodes.findIndex((ref) =>
    (end > ref.start && end <= ref.end) || (ref.start === ref.end && end === ref.end),
  );
  if (firstIndex === -1 || lastIndex === -1) {
    return undefined;
  }
  return {
    first: textNodes[firstIndex],
    last: textNodes[lastIndex],
    firstIndex,
    lastIndex,
  };
}

function normalizePath(path: string): string {
  return path.replace(/\[(\d+)\]/g, '.$1');
}

function resolvePathValue(source: unknown, path: string): unknown {
  const segments = normalizePath(path).split('.').filter(Boolean);
  let current = source;

  for (const segment of segments) {
    if (current == null) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function resolveTemplateValue(rootData: Record<string, HydrationValue>, path: string, context?: unknown): unknown {
  const contextual = context === undefined ? undefined : resolvePathValue(context, path);
  if (contextual !== undefined) {
    return contextual;
  }
  return resolvePathValue(rootData, path);
}

function isTruthyTemplateValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

function formatTemplateValue(value: unknown, spec?: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (!spec) {
    return String(value);
  }

  if (typeof value === 'number' && /0/.test(spec)) {
    const decimalMatch = /\.([0]+)/.exec(spec);
    const fractionDigits = decimalMatch?.[1]?.length ?? 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: spec.includes(','),
    }).format(value);
  }

  if (/[YMD]/i.test(spec)) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return spec
        .replace(/YYYY/g, String(date.getUTCFullYear()))
        .replace(/MM/g, String(date.getUTCMonth() + 1).padStart(2, '0'))
        .replace(/DD/g, String(date.getUTCDate()).padStart(2, '0'));
    }
  }

  return String(value);
}

function makeMissingPlaceholderError(fullMatch: string, key: string): DOCXError {
  return new DOCXError(
    DOCXErrorCode.DOC_INVALID,
    `Missing data for placeholder: ${fullMatch}`,
    {
      recovery: 'Provide a value under the matching key in the hydration data, or disable strictMode.',
      context: { placeholder: key },
    },
  );
}

function plainReplacementForSpan(
  span: PlaceholderSpan,
  value: HydrationValue | undefined,
  rootData: Record<string, HydrationValue>,
  options: HydrationOptions,
): string {
  if (span.syntax === 'office') {
    if (span.officeKind === 'if') {
      return isTruthyTemplateValue(value) ? renderOfficePlainText(span.inner ?? '', rootData, options, value) : '';
    }
    if (span.officeKind === 'loop') {
      return Array.isArray(value)
        ? value.map((entry) => renderOfficePlainText(span.inner ?? '', rootData, options, entry)).join('')
        : '';
    }
    return formatTemplateValue(value, span.formatSpec);
  }
  return value === undefined || value === null ? '' : String(value);
}

function renderOfficePlainText(
  fragment: string,
  rootData: Record<string, HydrationValue>,
  options: HydrationOptions,
  context?: unknown,
): string {
  let rendered = fragment;

  rendered = rendered.replace(OFFICE_IF_PATTERN, (_full, path: string, inner: string) => {
    const value = resolveTemplateValue(rootData, path, context);
    return isTruthyTemplateValue(value) ? renderOfficePlainText(inner, rootData, options, context) : '';
  });

  rendered = rendered.replace(OFFICE_LOOP_PATTERN, (_full, path: string, inner: string) => {
    const value = resolveTemplateValue(rootData, path, context);
    if (!Array.isArray(value)) {
      return '';
    }
    return value.map((entry) => renderOfficePlainText(inner, rootData, options, entry)).join('');
  });

  rendered = rendered.replace(OFFICE_VALUE_PATTERN, (_full, path: string, formatSpec?: string) => {
    const value = resolveTemplateValue(rootData, path, context);
    if (value === undefined) {
      if (options.strictMode) {
        throw makeMissingPlaceholderError(formatSpec ? `{d.${path}:format(${formatSpec})}` : `{d.${path}}`, path);
      }
      return options.removeUnfilled ? '' : (formatSpec ? `{d.${path}:format(${formatSpec})}` : `{d.${path}}`);
    }
    return formatTemplateValue(value, formatSpec);
  });

  return rendered;
}

function parseReplacementFragment(fragment: string): OrderedXmlNode[] {
  return xmlParser.parse(`<root>${fragment}</root>`) as OrderedXmlNode[];
}

function unwrapReplacementNodes(parsed: OrderedXmlNode[]): OrderedXmlNode[] {
  const root = parsed.find((node) => getTag(node) === 'root');
  return root ? getChildren(root, 'root') : parsed;
}

function replaceTextSpan(textNodes: TextNodeRef[], span: PlaceholderSpan, replacement: string): void {
  const range = findTextNodeRange(textNodes, span.start, span.end);
  if (!range) {
    return;
  }

  const firstText = getTextValue(range.first.node);
  const lastText = getTextValue(range.last.node);
  const firstLocalStart = span.start - range.first.start;
  const lastLocalEnd = span.end - range.last.start;

  if (range.first === range.last) {
    setTextValue(
      range.first.node,
      `${firstText.slice(0, firstLocalStart)}${replacement}${firstText.slice(lastLocalEnd)}`,
    );
    return;
  }

  setTextValue(range.first.node, `${firstText.slice(0, firstLocalStart)}${replacement}`);
  for (let index = range.firstIndex + 1; index < range.lastIndex; index += 1) {
    setTextValue(textNodes[index].node, '');
  }
  setTextValue(range.last.node, lastText.slice(lastLocalEnd));
}

function hydrateParagraph(paragraph: OrderedXmlNode, siblings: OrderedXmlNode[], index: number, options: HydrateXmlOptions): void {
  const textNodes: TextNodeRef[] = [];
  collectTextNodes(getChildren(paragraph, 'w:p'), textNodes, { value: 0 }, options.partPath);
  if (textNodes.length === 0) {
    return;
  }

  const paragraphText = extractParagraphText(textNodes);
  const spans = collectPlaceholderSpans(paragraphText, options.syntax);
  const complexSpan = spans.find((span) => {
    const value = resolveTemplateValue(options.data, span.key) as HydrationValue | undefined;
    return value !== undefined && isComplexValue(value);
  });

  if (complexSpan) {
    const value = resolveTemplateValue(options.data, complexSpan.key) as HydrationValue;
    const fragment = valueToOoxml(value, options.relationshipManager);
    siblings.splice(index, 1, ...unwrapReplacementNodes(parseReplacementFragment(fragment)));
    options.markReplaced(complexSpan.key);
    options.telemetry.replaced.push({
      placeholder: complexSpan.key,
      part: options.partPath,
      path: options.partPath,
      runRange: `${textNodes[0]?.path ?? 'w:p'}..${textNodes[textNodes.length - 1]?.path ?? 'w:p'}`,
      replacementKind: (typeof value === 'object' && value !== null && 'type' in value) ? String(value.type) : 'complex',
    });
    return;
  }

  for (const span of [...spans].reverse()) {
    const value = resolveTemplateValue(options.data, span.key) as HydrationValue | undefined;
    if (value === undefined) {
      if (options.hydrationOptions.strictMode) {
        throw makeMissingPlaceholderError(span.fullMatch, span.key);
      }
      options.telemetry.unfilled.push({
        placeholder: span.key,
        part: options.partPath,
        path: options.partPath,
        mode: options.hydrationOptions.removeUnfilled ? 'remove' : 'keep',
      });
      if (options.hydrationOptions.removeUnfilled) {
        replaceTextSpan(textNodes, span, '');
      }
      continue;
    }

    const replacement = plainReplacementForSpan(span, value, options.data, options.hydrationOptions);
    replaceTextSpan(textNodes, span, replacement);
    options.markReplaced(span.key);
    options.telemetry.replaced.push({
      placeholder: span.key,
      part: options.partPath,
      path: options.partPath,
      runRange: `${options.partPath}:${span.start}-${span.end}`,
      replacementKind: 'text',
    });
  }
}

export function hydrateXmlPartWithTree(xmlContent: string, options: HydrateXmlOptions): string {
  const parsed = xmlParser.parse(xmlContent) as OrderedXmlNode[];

  visitParagraphs(parsed, options.partPath, (paragraph, siblings, index) => {
    hydrateParagraph(paragraph, siblings, index, options);
  });

  return xmlBuilder.build(parsed);
}
