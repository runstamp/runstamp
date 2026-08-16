import type {
  HeaderFooterContent,
  HeadingElement,
  StructuredDocument,
  StructuredElement,
  StructuredPage,
} from '../types.js';
import { DOCUMENT_ROOT_NAMESPACES } from './namespaces.js';
import { attachSectionPropertiesToPage, buildBody } from './builders/body.js';
import { serializeXml, xmlElement, xmlText } from './ordered-builder.js';
import type { SerializationContext } from './context.js';
import { withActiveRelationships } from './context.js';
import type { XmlElement } from './types.js';
import { RelationshipManager } from './relationships.js';
import { CONTENT_TYPES, REL_TYPES } from './namespaces.js';
import { pxToTwips, type Twips } from '../utils/units.js';
import { buildFieldRuns } from './fields.js';
import { escapeXml } from './xml-escape.js';
import {
  getElementSerializer,
  unhandledElement,
  type ElementSerializerOptions,
  type SerializationState,
} from './element-serializers.js';
import { DOCXError, DOCXErrorCode } from '../errors.js';

export interface NativeDocumentBuildOptions extends ElementSerializerOptions {
  autoNoProof?: boolean;
  columns?: number;
  watermark?: string | {
    text?: string;
    opacity?: number;
    rotation?: number;
  };
  /**
   * Cancellation signal checked at each page boundary. Throws the
   * signal's abort reason (or a generic DOMException) on cancellation.
   */
  signal?: AbortSignal;
  /**
   * Fires once per page after the page's elements have been serialized.
   */
  onProgress?: (progress: {
    phase: 'serializing';
    percent: number;
    pageIndex: number;
    pageCount: number;
    message?: string;
  }) => void;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  // Prefer the modern throwIfAborted API when available (Node 18+).
  if (typeof (signal as AbortSignal & { throwIfAborted?: () => void }).throwIfAborted === 'function') {
    try {
      (signal as AbortSignal & { throwIfAborted: () => void }).throwIfAborted();
    } catch (error) {
      throw new DOCXError(
        DOCXErrorCode.RENDER_ABORTED,
        error instanceof Error ? error.message : 'Render aborted',
        {
          recovery: 'Create a new AbortController signal and retry the render when cancellation is no longer requested.',
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  }
  throw new DOCXError(
    DOCXErrorCode.RENDER_ABORTED,
    signal.reason instanceof Error ? signal.reason.message : 'Render aborted',
    {
      recovery: 'Create a new AbortController signal and retry the render when cancellation is no longer requested.',
      cause: signal.reason instanceof Error ? signal.reason : undefined,
    },
  );
}

interface SectionPartReference {
  type: 'default' | 'first' | 'even';
  relationshipId: string;
}

export interface NativeSectionReferences {
  headerReferences: SectionPartReference[];
  footerReferences: SectionPartReference[];
  titlePage: boolean;
  columns?: number;
}

function prepareTocBookmarks(context: SerializationContext): void {
  if (!context.document.toc) {
    return;
  }

  const maxLevel = context.document.toc.levels ?? 3;
  const bookmarkTracker = new Map<string, number>();
  for (const page of context.document.pages) {
    for (const element of page.elements) {
      if (element.type !== 'heading' || element.level > maxLevel) {
        continue;
      }

      const id = context.deterministic.nextId('bookmark');
      const name = element.docx?.bookmarkId ?? getUniqueTocBookmarkName(element.text, bookmarkTracker);
      const entry = {
        id,
        name,
        text: element.text,
        level: element.level,
        pageNumber: String(page.pageNumber),
      };
      context.headingBookmarks.set(element.id, entry);
      context.tocEntries.push(entry);
    }
  }
}

function slugifyBookmark(text: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 31);

  if (!slug) {
    if (text.trim().length > 0) {
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
      }
      slug = `h${Math.abs(hash).toString(36)}`;
    } else {
      slug = 'heading';
    }
  }

  return slug;
}

function getUniqueTocBookmarkName(text: string, tracker: Map<string, number>): string {
  const base = `_Toc_${slugifyBookmark(text)}`;
  const count = tracker.get(base) ?? 0;
  tracker.set(base, count + 1);
  return (count === 0 ? base : `${base}_${count + 1}`).slice(0, 40);
}

function ensureBookmarkForHeading(context: SerializationContext, element: HeadingElement): void {
  if (!element.docx?.bookmarkId || context.headingBookmarks.has(element.id)) {
    return;
  }
  context.headingBookmarks.set(element.id, {
    id: context.deterministic.nextId('bookmark'),
    name: element.docx.bookmarkId,
  });
}

function tocFieldInstruction(context: SerializationContext): string {
  const levels = context.document.toc?.levels ?? 3;
  const switches: string[] = [];
  if (context.document.toc?.hyperlinks !== false) {
    switches.push('\\h');
  }
  switches.push(`\\o "1-${levels}"`);
  switches.push('\\z', '\\u');
  return ` TOC ${switches.join(' ')} `;
}

function tocEntryParagraph(context: SerializationContext, entry: typeof context.tocEntries[number]): XmlElement {
  const showPageNumbers = context.document.toc?.showPageNumbers !== false;
  if (showPageNumbers) context.markFieldUse();
  const leader = context.document.toc?.leader ?? 'dot';
  const leaderValue = leader === 'dash' ? 'hyphen' : leader;
  const firstPage = context.document.pages[0];
  const tabPosition = firstPage ? contentWidthTwips(firstPage) : pxToTwips(600);
  const content: XmlElement[] = [
    xmlElement('w:r', undefined, [
      xmlElement('w:rPr', undefined, [xmlElement('w:noProof')]),
      xmlElement('w:t', undefined, [xmlText(escapeXml(entry.text))]),
    ]),
    ...(showPageNumbers
      ? [
          xmlElement('w:r', undefined, [
            xmlElement('w:rPr', undefined, [xmlElement('w:noProof')]),
            xmlElement('w:tab'),
          ]),
          ...buildFieldRuns({ kind: 'PAGEREF', argument: entry.name, cachedValue: entry.pageNumber }, context.deterministic),
        ]
      : []),
  ];
  return xmlElement('w:p', undefined, [
    xmlElement('w:pPr', undefined, [
      xmlElement('w:pStyle', { 'w:val': `TOC${Math.min(9, Math.max(1, entry.level))}` }),
      ...(showPageNumbers ? [xmlElement('w:tabs', undefined, [
        xmlElement('w:tab', {
          'w:val': 'right',
          ...(leaderValue !== 'none' ? { 'w:leader': leaderValue } : {}),
          'w:pos': String(tabPosition),
        }),
      ])] : []),
    ]),
    ...(context.document.toc?.hyperlinks === false
      ? content
      : [xmlElement('w:hyperlink', { 'w:anchor': entry.name }, content)]),
  ]);
}

function buildTocBlock(context: SerializationContext): XmlElement[] {
  if (!context.document.toc) {
    return [];
  }

  context.markFieldUse();
  const title = context.document.toc.title ?? 'Table of Contents';
  return [
    xmlElement('w:sdt', undefined, [
      xmlElement('w:sdtPr', undefined, [
        xmlElement('w:docPartObj', undefined, [
          xmlElement('w:docPartGallery', { 'w:val': 'Table of Contents' }),
          xmlElement('w:docPartUnique'),
        ]),
      ]),
      xmlElement('w:sdtContent', undefined, [
        xmlElement('w:p', undefined, [
          xmlElement('w:pPr', undefined, [
            xmlElement('w:pStyle', { 'w:val': 'TOCHeading' }),
          ]),
          xmlElement('w:r', undefined, [
            xmlElement('w:t', undefined, [xmlText(escapeXml(title))]),
          ]),
        ]),
        xmlElement('w:p', undefined, [
          xmlElement('w:r', undefined, [
            xmlElement('w:fldChar', { 'w:fldCharType': 'begin' }),
          ]),
          xmlElement('w:r', undefined, [
            xmlElement('w:instrText', { 'xml:space': 'preserve' }, [xmlText(escapeXml(tocFieldInstruction(context)))]),
          ]),
          xmlElement('w:r', undefined, [
            xmlElement('w:fldChar', { 'w:fldCharType': 'separate' }),
          ]),
        ]),
        ...context.tocEntries.map((entry) => tocEntryParagraph(context, entry)),
        xmlElement('w:p', undefined, [
          xmlElement('w:r', undefined, [
            xmlElement('w:fldChar', { 'w:fldCharType': 'end' }),
          ]),
        ]),
      ]),
    ]),
  ];
}

function contentWidthTwips(page: StructuredPage): Twips {
  return pxToTwips(page.dimensions.width - page.dimensions.margins.left - page.dimensions.margins.right);
}

// Word rejects negative `<w:tab w:pos>` and shows the "needs repair" prompt;
// LibreOffice silently accepts. Surface the math failure as a structured error
// so callers see the offending margins instead of producing a doc that opens
// damaged (see docs/0428-claude-test-based-directive2.md §"@runstamp/docx"
// item 1).
function assertNonNegativeContentWidth(width: Twips, page: StructuredPage): void {
  if (width >= 0) return;
  const margins = page.dimensions.margins;
  throw new DOCXError(
    DOCXErrorCode.DOC_INVALID_DIMENSIONS,
    `Header/footer tab calculation produced negative width (${width} twips). ` +
      `Page width=${page.dimensions.width}px, margins.left=${margins.left}px, margins.right=${margins.right}px. ` +
      `Margins exceed page width — check that margins are in points (not twips); ` +
      `pass { relaxed: true } to renderToDocx if your input uses twips.`,
    {
      recovery: 'Use page margins in points and ensure left+right margins are less than page width.',
      context: {
        widthTwips: width,
        pageWidthPx: page.dimensions.width,
        marginLeftPx: margins.left,
        marginRightPx: margins.right,
      },
    },
  );
}

function findChild(node: XmlElement, tag: string): XmlElement | undefined {
  return node.children?.find((child): child is XmlElement => typeof child === 'object' && 'tag' in child && child.tag === tag);
}

function ensureParagraphProperties(paragraph: XmlElement): XmlElement {
  let properties = findChild(paragraph, 'w:pPr');
  if (!properties) {
    properties = xmlElement('w:pPr');
    paragraph.children = [properties, ...(paragraph.children ?? [])];
  }
  return properties;
}

function descendantText(node: XmlElement, tag: string): string {
  let value = '';
  for (const child of node.children ?? []) {
    if (typeof child === 'object' && 'tag' in child) {
      if (child.tag === tag) {
        value += (child.children ?? [])
          .filter((entry): entry is { kind: 'text'; value: string } => typeof entry === 'object' && 'kind' in entry && entry.kind === 'text')
          .map((entry) => entry.value)
          .join('');
      }
      value += descendantText(child, tag);
    }
  }
  return value;
}

function hasFieldInstruction(node: XmlElement, instruction: 'PAGE' | 'NUMPAGES'): boolean {
  return descendantText(node, 'w:instrText').trim() === instruction;
}

function containsFieldChar(node: XmlElement, type: string): boolean {
  for (const child of node.children ?? []) {
    if (typeof child !== 'object' || !('tag' in child)) continue;
    if (child.tag === 'w:fldChar' && child.attrs?.['w:fldCharType'] === type) return true;
    if (containsFieldChar(child, type)) return true;
  }
  return false;
}

function containsVisibleText(node: XmlElement): boolean {
  return descendantText(node, 'w:t').trim().length > 0;
}

/**
 * The public footer shorthand serializes `text + PAGE of NUMPAGES` as one
 * paragraph. Keep the descriptive label on the left and move the conventional
 * trailing page-count field group to the existing right tab stop. A field-only
 * footer is intentionally left alone so caller alignment remains authoritative.
 */
function alignFooterPageCount(paragraph: XmlElement): void {
  const children = paragraph.children ?? [];
  const pageInstructionIndex = children.findIndex(
    (child) => typeof child === 'object' && 'tag' in child && hasFieldInstruction(child, 'PAGE'),
  );
  const totalInstructionIndex = children.findIndex(
    (child, index) => index > pageInstructionIndex
      && typeof child === 'object'
      && 'tag' in child
      && hasFieldInstruction(child, 'NUMPAGES'),
  );
  if (pageInstructionIndex < 1 || totalInstructionIndex < 0) return;

  let fieldStartIndex = pageInstructionIndex;
  for (let index = pageInstructionIndex - 1; index >= 0; index -= 1) {
    const child = children[index];
    if (typeof child !== 'object' || !('tag' in child)) continue;
    if (child.tag === 'w:r' && containsFieldChar(child, 'begin')) {
      fieldStartIndex = index;
      break;
    }
  }

  const hasDescription = children
    .slice(0, fieldStartIndex)
    .some((child) => typeof child === 'object' && 'tag' in child && containsVisibleText(child));
  if (!hasDescription) return;

  children.splice(fieldStartIndex, 0, xmlElement('w:r', undefined, [xmlElement('w:tab')]));
  paragraph.children = children;
}

function applyHeaderFooterTabStops(blocks: XmlElement[], page: StructuredPage): XmlElement[] {
  const width = contentWidthTwips(page);
  assertNonNegativeContentWidth(width, page);
  const tabs = xmlElement('w:tabs', undefined, [
    xmlElement('w:tab', { 'w:val': 'center', 'w:pos': String(Math.round(width / 2)) }),
    xmlElement('w:tab', { 'w:val': 'right', 'w:pos': String(width) }),
  ]);

  for (const block of blocks) {
    if (block.tag !== 'w:p') {
      continue;
    }
    const properties = ensureParagraphProperties(block);
    if (!findChild(properties, 'w:tabs')) {
      properties.children = [tabs, ...(properties.children ?? [])];
    }
  }
  return blocks;
}

function buildWatermarkParagraph(options: NativeDocumentBuildOptions): XmlElement | undefined {
  const watermark = options.watermark;
  const text = typeof watermark === 'string' ? watermark : watermark?.text;
  if (!text) {
    return undefined;
  }

  const opacity = typeof watermark === 'object' && watermark.opacity !== undefined ? watermark.opacity : 0.25;
  const rotation = typeof watermark === 'object' && watermark.rotation !== undefined ? watermark.rotation : -45;
  return xmlElement('w:p', undefined, [
    xmlElement('w:r', undefined, [
      xmlElement('w:pict', undefined, [
        xmlElement('v:shapetype', {
          id: '_x0000_t136',
          coordsize: '21600,21600',
          'o:spt': '136',
          adj: '10800',
          path: 'm@7,l@8,m@5,21600l@6,21600e',
        }, [
          xmlElement('v:textpath', { on: 't', fitshape: 't' }),
          xmlElement('o:lock', { 'v:ext': 'edit', text: 't', shapetype: 't' }),
        ]),
        xmlElement('v:shape', {
          id: `PowerPlusWaterMarkObject${rotation}`,
          'o:spid': `_x0000_s${Math.abs(Math.round(rotation * 100))}`,
          type: '#_x0000_t136',
          style: `position:absolute;margin-left:0;margin-top:0;width:527.85pt;height:131.95pt;rotation:${rotation};z-index:-251658752;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin`,
          'o:allowincell': 'f',
          fillcolor: '#C0C0C0',
          stroked: 'f',
        }, [
          xmlElement('v:fill', { opacity: String(opacity) }),
          xmlElement('v:textpath', {
            style: 'font-family:"Calibri";font-size:72pt',
            string: text,
          }),
        ]),
      ]),
    ]),
  ]);
}

async function serializeHeaderFooterPart(
  context: SerializationContext,
  page: StructuredPage,
  kind: 'header' | 'footer',
  elements: StructuredElement[],
  options: NativeDocumentBuildOptions,
): Promise<string> {
  const blocks: XmlElement[] = [];
  for (const [index, element] of elements.entries()) {
    blocks.push(
      ...await serializeStructuredElement(
        element,
        context,
        `${kind} ${page.pageNumber}, element ${index + 1}`,
        options,
        { tableDepth: 0 },
      ),
    );
  }

  if (kind === 'header') {
    const watermark = buildWatermarkParagraph(options);
    if (watermark) {
      blocks.unshift(watermark);
    }
  }

  if (kind === 'footer') {
    for (const block of blocks) {
      if (block.tag === 'w:p') alignFooterPageCount(block);
    }
  }

  const tagged = applyHeaderFooterTabStops(blocks.length > 0 ? blocks : [xmlElement('w:p')], page);
  return serializeXml(xmlElement(kind === 'header' ? 'w:hdr' : 'w:ftr', DOCUMENT_ROOT_NAMESPACES, tagged));
}

async function registerHeaderFooterPart(
  context: SerializationContext,
  page: StructuredPage,
  kind: 'header' | 'footer',
  referenceType: 'default' | 'first' | 'even',
  content: HeaderFooterContent | undefined,
  elements: StructuredElement[],
  options: NativeDocumentBuildOptions,
): Promise<SectionPartReference | undefined> {
  if (elements.length === 0 && !(kind === 'header' && options.watermark)) {
    return undefined;
  }

  const partId = context.deterministic.nextId(kind);
  const path = `word/${kind}${partId}.xml`;
  const relationships = new RelationshipManager();
  const xml = await withActiveRelationships(context, relationships, () =>
    serializeHeaderFooterPart(context, page, kind, elements, options),
  );
  const relationshipId = context.deterministic.nextRelationshipId();
  context.documentRelationships.add(relationshipId, kind === 'header' ? REL_TYPES.header : REL_TYPES.footer, `${kind}${partId}.xml`);
  context.contentTypes.registerOverride(path, kind === 'header' ? CONTENT_TYPES.header : CONTENT_TYPES.footer);
  context.addXmlPart({
    path,
    xml,
    ...(relationships.all().length > 0
      ? {
          relationshipsPath: `word/_rels/${kind}${partId}.xml.rels`,
          relationshipsXml: relationships.toXml(),
        }
      : {}),
  });

  if (referenceType === 'even' || content?.differentOddEven) {
    context.markEvenOddHeaders();
  }

  return { type: referenceType, relationshipId };
}

async function registerSectionReferences(
  page: StructuredPage,
  context: SerializationContext,
  options: NativeDocumentBuildOptions,
): Promise<NativeSectionReferences> {
  const headerReferences: SectionPartReference[] = [];
  const footerReferences: SectionPartReference[] = [];
  const header = page.header;
  const footer = page.footer;

  const headerDefault = await registerHeaderFooterPart(context, page, 'header', 'default', header, header?.elements ?? [], options);
  if (headerDefault) headerReferences.push(headerDefault);
  const footerDefault = await registerHeaderFooterPart(context, page, 'footer', 'default', footer, footer?.elements ?? [], options);
  if (footerDefault) footerReferences.push(footerDefault);

  if (header?.differentFirst || header?.firstElements) {
    const first = await registerHeaderFooterPart(context, page, 'header', 'first', header, header.firstElements ?? header.elements, options);
    if (first) headerReferences.push(first);
  }
  if (footer?.differentFirst || footer?.firstElements) {
    const first = await registerHeaderFooterPart(context, page, 'footer', 'first', footer, footer.firstElements ?? footer.elements, options);
    if (first) footerReferences.push(first);
  }
  if (header?.differentOddEven || header?.evenElements) {
    const even = await registerHeaderFooterPart(context, page, 'header', 'even', header, header.evenElements ?? header.elements, options);
    if (even) headerReferences.push(even);
  }
  if (footer?.differentOddEven || footer?.evenElements) {
    const even = await registerHeaderFooterPart(context, page, 'footer', 'even', footer, footer.evenElements ?? footer.elements, options);
    if (even) footerReferences.push(even);
  }

  return {
    headerReferences,
    footerReferences,
    titlePage: Boolean(header?.differentFirst || footer?.differentFirst || header?.firstElements || footer?.firstElements),
    columns: options.columns,
  };
}

async function serializeStructuredElement(
  element: StructuredElement,
  context: SerializationContext,
  location: string,
  options: NativeDocumentBuildOptions,
  state: SerializationState,
): Promise<XmlElement[]> {
  if (element.type === 'heading') {
    ensureBookmarkForHeading(context, element);
  }

  const serializer = getElementSerializer(element.type);
  if (!serializer) {
    return unhandledElement(element, location);
  }

  return serializer.serialize(
    element,
    context,
    location,
    options,
    state,
    serializeStructuredElement,
  );
}

export async function buildDocumentXml(
  document: StructuredDocument,
  context: SerializationContext,
  options: NativeDocumentBuildOptions = {},
): Promise<string> {
  const bodyChildren: XmlElement[] = [];
  prepareTocBookmarks(context);

  const pageCount = document.pages.length;

  for (const [pageIndex, page] of document.pages.entries()) {
    // Check abort at the page boundary — large documents become
    // cancellable without waiting for full serialization.
    throwIfAborted(options.signal);

    const insertTocAtStart = document.toc?.position !== 'after-cover' && pageIndex === 0;
    const insertTocAfterCover = document.toc?.position === 'after-cover' && pageIndex === 0;
    const pageBlocks: XmlElement[] = [];
    for (const [elementIndex, element] of page.elements.entries()) {
      pageBlocks.push(
        ...await serializeStructuredElement(
          element,
          context,
          `page ${page.pageNumber}, element ${elementIndex + 1}`,
          options,
          { tableDepth: 0 },
        ),
      );
    }
    const blocksWithToc = [
      ...(insertTocAtStart ? buildTocBlock(context) : []),
      ...pageBlocks,
      ...(insertTocAfterCover ? buildTocBlock(context) : []),
    ];

    const isFinalPage = pageIndex === pageCount - 1;
    // OOXML: a sectPr's <w:type> describes how the section it terminates
    // *begins*. So `page.sectionBreak` (which describes how this page begins)
    // belongs on this page's own sectPr, not on the previous page's.
    const breakType = page.sectionBreak?.type;
    const sectionReferences = await registerSectionReferences(page, context, options);

    bodyChildren.push(
      ...attachSectionPropertiesToPage(blocksWithToc, page, isFinalPage, {
        breakType,
        ...sectionReferences,
      }),
    );

    // Fire per-page progress after the page is committed.
    // Percent maps linearly into the 50-90 band of render.ts phases
    // (between 'serializing' start and 'optimizing').
    if (options.onProgress) {
      const pageFraction = (pageIndex + 1) / pageCount;
      const percent = 50 + Math.round(pageFraction * 40);
      options.onProgress({
        phase: 'serializing',
        percent,
        pageIndex,
        pageCount,
        message: `Serialized page ${pageIndex + 1}/${pageCount}`,
      });
    }
  }

  return serializeXml(
    xmlElement('w:document', DOCUMENT_ROOT_NAMESPACES, [
      buildBody(bodyChildren),
    ]),
  );
}
