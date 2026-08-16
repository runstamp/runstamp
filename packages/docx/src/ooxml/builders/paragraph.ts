import type {
  CodeBlockElement,
  DividerElement,
  HeadingElement,
  ParagraphElement,
  TextRun as StructuredTextRun,
  TextRunElement,
} from '../../types.js';
import { buildParagraphProperties } from './paragraph-properties.js';
import { buildPageBreakRun, buildTextRun } from './run.js';
import { xmlElement } from '../ordered-builder.js';
import { containsRtlText } from './run-properties.js';
import { buildFieldRuns, splitFieldPlaceholders } from '../fields.js';
import { REL_TYPES } from '../namespaces.js';
import { buildEndnoteReferenceRun, buildFootnoteReferenceRun } from '../notes.js';
import type { XmlElement } from '../types.js';
import type { SerializationContext } from '../context.js';
import { appendParagraphRevision } from '../revisions.js';
import { buildCommentRange, registerComment } from '../comments.js';


export interface NativeParagraphBuildOptions {
  autoNoProof?: boolean;
  sectionProperties?: XmlElement;
  context?: SerializationContext;
}

function synthesizeRun(text: string, style: HeadingElement['style']): StructuredTextRun {
  return {
    text,
    fontFamily: style.fontFamily || 'Calibri',
    fontSize: style.fontSize || 11,
    fontWeight: (style.fontWeight as StructuredTextRun['fontWeight']) || 'normal',
    fontStyle: (style.fontStyle as StructuredTextRun['fontStyle']) || 'normal',
    textDecoration: (style.textDecoration as StructuredTextRun['textDecoration']) || 'none',
    color: style.color || '000000',
    backgroundColor: style.backgroundColor,
  };
}

function normalizeRuns(element: HeadingElement | ParagraphElement | TextRunElement): StructuredTextRun[] {
  return element.runs.length > 0 ? element.runs : [synthesizeRun(element.text, element.style)];
}

function createParagraph(children: XmlElement[], properties?: XmlElement): XmlElement {
  return xmlElement('w:p', undefined, [
    ...(properties ? [properties] : []),
    ...children,
  ]);
}

function isExternalLink(link: string): boolean {
  return /^(https?:|mailto:)/i.test(link);
}

function buildRunWithFields(
  run: StructuredTextRun,
  options: NativeParagraphBuildOptions,
  styleId?: string,
): XmlElement[] {
  const context = options.context;
  const parts = splitFieldPlaceholders(run.text);
  const result: XmlElement[] = [];

  for (const part of parts) {
    if ('field' in part) {
      if (context) {
        context.markFieldUse();
        result.push(...buildFieldRuns({ kind: part.field }, context.deterministic));
      } else {
        result.push(buildTextRun({ ...run, text: `{${part.field}}` }, { autoNoProof: options.autoNoProof, styleId }));
      }
      continue;
    }

    if (part.text.length > 0) {
      result.push(buildTextRun({ ...run, text: part.text }, { autoNoProof: options.autoNoProof, styleId, revisionInfo: context?.revisionInfo, context }));
    }
  }

  return result;
}

function buildRunOrHyperlink(run: StructuredTextRun, options: NativeParagraphBuildOptions): XmlElement[] {
  if (!run.link) {
    return buildRunWithFields(run, options);
  }

  const children = buildRunWithFields(run, options, 'Hyperlink');
  const context = options.context;
  if (!context) {
    return children;
  }

  if (isExternalLink(run.link)) {
    const relationshipId = context.deterministic.nextRelationshipId();
    context.activeRelationships.add(relationshipId, REL_TYPES.hyperlink, run.link, 'External');
    return [xmlElement('w:hyperlink', { 'r:id': relationshipId }, children)];
  }

  const anchor = run.link.replace(/^#/, '');
  return [xmlElement('w:hyperlink', { 'w:anchor': anchor }, children)];
}

export function buildBlockParagraph(
  element: HeadingElement | ParagraphElement | TextRunElement,
  options: NativeParagraphBuildOptions = {},
): XmlElement {
  const context = options.context;
  const runs = normalizeRuns(element);
  const rtl = runs.some((run) => containsRtlText(run.text));
  const styleId = element.type === 'heading' ? `Heading${element.level}` : undefined;
  const properties = buildParagraphProperties({
    element,
    styleId,
    rtl,
    sectionProperties: options.sectionProperties,
  });

  const bookmark = context?.headingBookmarks.get(element.id);
  const comment = (element as HeadingElement | ParagraphElement).comment ?? element.docx?.comment ?? (element.style as any).comment;
  const commentId = context?.commentsEnabled
    ? registerComment(context.comments, comment, {
        author: context.options.defaultCommentAuthor ?? context.revisionInfo?.author ?? context.document.metadata?.author,
        date: context.revisionInfo?.date,
        nextId: () => context.deterministic.nextId('comment') - 1,
      })
    : undefined;
  const bodyChildren = [
      ...(bookmark
        ? [xmlElement('w:bookmarkStart', {
            'w:id': String(bookmark.id),
            'w:name': bookmark.name,
          })]
        : []),
      ...runs.flatMap((run) => buildRunOrHyperlink(run, options)),
      ...(element.docx?.footnote && context
        ? [buildFootnoteReferenceRun(registerFootnote(context, element.docx.footnote))]
        : []),
      ...(element.docx?.endnote && context
        ? [buildEndnoteReferenceRun(registerEndnote(context, element.docx.endnote))]
        : []),
      ...(bookmark
        ? [xmlElement('w:bookmarkEnd', {
            'w:id': String(bookmark.id),
          })]
        : []),
    ];
  const paragraph = createParagraph(
    commentId !== undefined ? buildCommentRange(commentId, bodyChildren) : bodyChildren,
    properties,
  );
  return appendParagraphRevision(paragraph, 'revision' in element ? element.revision : undefined, context?.revisionInfo, context);
}

function registerFootnote(context: SerializationContext, text: string): number {
  const id = context.deterministic.nextId('footnote');
  context.addFootnote({ id, text });
  return id;
}

function registerEndnote(context: SerializationContext, text: string): number {
  const id = context.deterministic.nextId('endnote');
  context.addEndnote({ id, text });
  return id;
}

export function buildCodeBlockParagraphs(
  element: CodeBlockElement,
  options: NativeParagraphBuildOptions = {},
): XmlElement[] {
  const lines = element.code.split(/\r\n|\n|\r/);
  const totalLines = lines.length;

  return lines.map((line, index) => {
    const edge = totalLines === 1
      ? 'single'
      : index === 0
        ? 'first'
        : index === totalLines - 1
          ? 'last'
          : 'middle';

    const prefix = element.showLineNumbers ? `${String(index + 1).padStart(2, ' ')}  ` : '';
    const run = synthesizeRun(prefix + line, {
      ...element.style,
      fontFamily: element.style.fontFamily || 'Consolas',
      fontSize: element.style.fontSize || 10,
      color: element.style.color || '333333',
      textDecoration: element.style.textDecoration || 'none',
      fontWeight: element.style.fontWeight || 'normal',
      fontStyle: element.style.fontStyle || 'normal',
      backgroundColor: element.style.backgroundColor || 'F5F5F5',
      borderTopWidth: element.style.borderTopWidth,
      borderTopColor: element.style.borderTopColor,
      borderTopStyle: element.style.borderTopStyle,
      borderRightWidth: element.style.borderRightWidth,
      borderRightColor: element.style.borderRightColor,
      borderRightStyle: element.style.borderRightStyle,
      borderBottomWidth: element.style.borderBottomWidth,
      borderBottomColor: element.style.borderBottomColor,
      borderBottomStyle: element.style.borderBottomStyle,
      borderLeftWidth: element.style.borderLeftWidth,
      borderLeftColor: element.style.borderLeftColor,
      borderLeftStyle: element.style.borderLeftStyle,
      borderRadius: element.style.borderRadius,
      paddingTop: element.style.paddingTop,
      paddingRight: element.style.paddingRight,
      paddingBottom: element.style.paddingBottom,
      paddingLeft: element.style.paddingLeft,
      marginTop: element.style.marginTop,
      marginRight: element.style.marginRight,
      marginBottom: element.style.marginBottom,
      marginLeft: element.style.marginLeft,
      lineHeight: element.style.lineHeight,
      letterSpacing: element.style.letterSpacing,
      textAlign: element.style.textAlign,
      display: element.style.display,
      visibility: element.style.visibility,
      overflow: element.style.overflow,
      opacity: element.style.opacity,
    });

    const properties = buildParagraphProperties({
      element,
      styleId: 'CodeBlock',
      codeBlockEdge: edge,
      sectionProperties: index === totalLines - 1 ? options.sectionProperties : undefined,
    });

    return createParagraph([buildTextRun(run, { autoNoProof: true, revisionInfo: options.context?.revisionInfo, context: options.context })], properties);
  });
}

export function buildDividerParagraph(
  element: DividerElement,
  options: NativeParagraphBuildOptions = {},
): XmlElement {
  const properties = buildParagraphProperties({
    element,
    styleId: 'Divider',
    sectionProperties: options.sectionProperties,
  });
  return createParagraph([], properties);
}

export function buildPageBreakParagraph(options: NativeParagraphBuildOptions = {}): XmlElement {
  return createParagraph(
    [buildPageBreakRun()],
    options.sectionProperties ? xmlElement('w:pPr', undefined, [options.sectionProperties]) : undefined,
  );
}
