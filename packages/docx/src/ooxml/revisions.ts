import type {
  ParagraphRevision,
  ParagraphRevisionProperties,
  TableCellRevision,
  TableRowRevision,
  TableRevision,
  TableRevisionProperties,
  TextRun,
  TextRunStyleSnapshot,
} from '../types.js';
import type { ResolvedRevisionInfo } from '../core/revision-tracker.js';
import { xmlElement, xmlText } from './ordered-builder.js';
import type { XmlContent, XmlElement } from './types.js';
import { escapeXml } from './xml-escape.js';
import { buildRunProperties } from './builders/run-properties.js';
import type { SerializationContext } from './context.js';

type RevisionWithMetadata = {
  id?: number;
  author?: string;
  date?: string;
};

export function revisionAttributes(
  revision: RevisionWithMetadata | undefined,
  fallback: ResolvedRevisionInfo,
  context?: SerializationContext,
): Record<string, string> {
  return {
    'w:id': String(context?.allocateRevisionId(revision) ?? revision?.id ?? 1),
    'w:author': revision?.author ?? fallback.author,
    'w:date': revision?.date ?? fallback.date,
  };
}

function paragraphPropertySnapshot(properties: ParagraphRevisionProperties | undefined): XmlElement[] {
  if (!properties) {
    return [];
  }

  const children: XmlElement[] = [];
  if (properties.keepNext !== undefined) {
    children.push(properties.keepNext ? xmlElement('w:keepNext') : xmlElement('w:keepNext', { 'w:val': 'false' }));
  }
  if (properties.keepLines !== undefined) {
    children.push(properties.keepLines ? xmlElement('w:keepLines') : xmlElement('w:keepLines', { 'w:val': 'false' }));
  }
  if (properties.pageBreakBefore !== undefined) {
    children.push(properties.pageBreakBefore ? xmlElement('w:pageBreakBefore') : xmlElement('w:pageBreakBefore', { 'w:val': 'false' }));
  }
  if (properties.indent) {
    children.push(xmlElement('w:ind', {
      ...(properties.indent.left !== undefined ? { 'w:left': String(properties.indent.left) } : {}),
      ...(properties.indent.right !== undefined ? { 'w:right': String(properties.indent.right) } : {}),
      ...(properties.indent.firstLine !== undefined ? { 'w:firstLine': String(properties.indent.firstLine) } : {}),
    }));
  }
  if (properties.textAlign) {
    children.push(xmlElement('w:jc', { 'w:val': properties.textAlign === 'justify' ? 'both' : properties.textAlign }));
  }

  return children;
}

export function appendParagraphRevision(
  paragraph: XmlElement,
  revision: ParagraphRevision | undefined,
  fallback: ResolvedRevisionInfo | undefined,
  context?: SerializationContext,
): XmlElement {
  if (fallback?.rsid && paragraph.tag === 'w:p') {
    paragraph.attrs = {
      ...(paragraph.attrs ?? {}),
      'w:rsidR': fallback.rsid,
      'w:rsidRPr': fallback.rsid,
    };
  }
  if (!revision || !fallback || paragraph.tag !== 'w:p') {
    return paragraph;
  }

  if (revision.type === 'property') {
    const pPr = ensureFirstProperties(paragraph, 'w:pPr');
    pPr.children = [
      ...(pPr.children ?? []),
      xmlElement('w:pPrChange', revisionAttributes(revision, fallback, context), [
        xmlElement('w:pPr', undefined, paragraphPropertySnapshot(revision.before)),
      ]),
    ];
    return paragraph;
  }

  const properties = (paragraph.children ?? []).filter((child) => isElement(child, 'w:pPr'));
  const content = (paragraph.children ?? []).filter((child) => !isElement(child, 'w:pPr'));
  const attrs = revisionAttributes(revision, fallback, context);
  if (revision.type === 'moveFrom' || revision.type === 'moveTo') {
    const rangeTag = revision.type === 'moveFrom' ? 'moveFrom' : 'moveTo';
    paragraph.children = [
      ...properties,
      xmlElement(`w:${rangeTag}RangeStart`, {
        'w:id': attrs['w:id'],
        'w:name': revision.moveName ?? `move-${attrs['w:id']}`,
      }),
      xmlElement(`w:${rangeTag}`, attrs, content),
      xmlElement(`w:${rangeTag}RangeEnd`, { 'w:id': attrs['w:id'] }),
    ];
    return paragraph;
  }

  paragraph.children = [
    ...properties,
    xmlElement(revision.type === 'insert' ? 'w:ins' : 'w:del', attrs, content),
  ];
  return paragraph;
}

function tablePropertySnapshot(properties: TableRevisionProperties | undefined): XmlElement[] {
  if (!properties) {
    return [];
  }

  const children: XmlElement[] = [];
  const caption = properties.tableCaption ?? properties.caption;
  if (caption) {
    children.push(xmlElement('w:tblCaption', { 'w:val': caption }));
  }
  if (properties.tableDescription) {
    children.push(xmlElement('w:tblDescription', { 'w:val': properties.tableDescription }));
  }
  return children;
}

export function buildTableRevisionChange(
  revision: TableRevision | undefined,
  fallback: ResolvedRevisionInfo | undefined,
  context?: SerializationContext,
): XmlElement | undefined {
  if (!revision || !fallback) {
    return undefined;
  }

  return xmlElement('w:tblPrChange', revisionAttributes(revision, fallback, context), [
    xmlElement('w:tblPr', undefined, tablePropertySnapshot(revision.before)),
  ]);
}

export function buildTableCellRevisionChange(
  revision: TableCellRevision | undefined,
  fallback: ResolvedRevisionInfo | undefined,
  context?: SerializationContext,
): XmlElement | undefined {
  if (!revision || !fallback) {
    return undefined;
  }

  return xmlElement(revision.type === 'insert' ? 'w:cellIns' : 'w:cellDel', revisionAttributes(revision, fallback, context));
}

export function buildTableRowRevisionChange(
  revision: TableRowRevision | undefined,
  fallback: ResolvedRevisionInfo | undefined,
  context?: SerializationContext,
): XmlElement | undefined {
  if (!revision || !fallback) {
    return undefined;
  }

  return xmlElement(revision.type === 'insert' ? 'w:ins' : 'w:del', revisionAttributes(revision, fallback, context));
}

function runStyleToProperties(style: TextRunStyleSnapshot | undefined): XmlElement {
  return buildRunProperties({
    fontFamily: style?.fontFamily,
    fontSize: style?.fontSize,
    fontWeight: style?.fontWeight,
    fontStyle: style?.fontStyle,
    textDecoration: style?.textDecoration,
    color: style?.color,
    backgroundColor: style?.backgroundColor,
    superscript: style?.superscript,
    subscript: style?.subscript,
    autoNoProof: true,
  }) ?? xmlElement('w:rPr');
}

export function appendRunRevisionProperties(
  runProperties: XmlElement | undefined,
  run: TextRun,
  fallback: ResolvedRevisionInfo | undefined,
  context?: SerializationContext,
): XmlElement | undefined {
  if (run.revision?.type !== 'format' || !fallback) {
    return runProperties;
  }

  const properties = runProperties ?? xmlElement('w:rPr');
  properties.children = [
    ...(properties.children ?? []),
    xmlElement('w:rPrChange', revisionAttributes(run.revision, fallback, context), [
      runStyleToProperties(run.revision.beforeStyle),
    ]),
  ];
  return properties;
}

export function buildDeletedTextRun(run: TextRun, fallback: ResolvedRevisionInfo, context?: SerializationContext): XmlElement {
  const allowCssHex = context?.options.strictColors !== true;
  const properties = buildRunProperties({
    fontFamily: run.fontFamily,
    fontSize: run.fontSize,
    fontWeight: run.fontWeight,
    fontStyle: run.fontStyle,
    textDecoration: run.textDecoration,
    color: run.color,
    backgroundColor: run.backgroundColor,
    superscript: run.superscript,
    subscript: run.subscript,
    autoNoProof: true,
    allowCssHex,
  });
  const children: XmlElement[] = [];
  if (properties) {
    children.push(properties);
  }
  const lines = run.text.split(/\r\n|\n|\r/);
  lines.forEach((line, index) => {
    if (index > 0) {
      children.push(xmlElement('w:br'));
    }
    children.push(xmlElement('w:delText', { 'xml:space': 'preserve' }, [xmlText(escapeXml(line))]));
  });

  return xmlElement('w:del', revisionAttributes(run.revision, fallback, context), [
    xmlElement('w:r', undefined, children),
  ]);
}

export function wrapInsertedRun(run: TextRun, fallback: ResolvedRevisionInfo, child: XmlElement, context?: SerializationContext): XmlElement {
  return xmlElement('w:ins', revisionAttributes(run.revision, fallback, context), [child]);
}

function ensureFirstProperties(parent: XmlElement, tag: string): XmlElement {
  const existing = (parent.children ?? []).find((child): child is XmlElement => isElement(child, tag));
  if (existing) {
    return existing;
  }

  const created = xmlElement(tag);
  parent.children = [created, ...(parent.children ?? [])];
  return created;
}

function isElement(value: XmlContent, tag: string): value is XmlElement {
  return typeof value === 'object' && 'tag' in value && value.tag === tag;
}
