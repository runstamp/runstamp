import type { StructuredDocument, StructuredElement, TextRun } from '../types.js';
import { resolveRevisionInfo, type RevisionDefaultsInput } from '../core/revision-tracker.js';
import { createDeterministicContext } from './deterministic.js';
import { buildDocumentXml } from './document.js';
import { ContentTypesRegistry } from './content-types.js';
import { RelationshipManager } from './relationships.js';
import { buildCorePropertiesXml, buildAppPropertiesXml } from './doc-props.js';
import { buildSettingsXml } from './settings.js';
import { collectFonts, buildFontTableXml } from './font-table.js';
import { buildWebSettingsXml } from './web-settings.js';
import { buildThemeXml } from './theme.js';
import { buildStylesXml } from './styles.js';
import { assembleNativeDocxPackage } from './assembler.js';
import { CONTENT_TYPES, REL_TYPES } from './namespaces.js';
import { enforceResourceLimits, resolveResourceLimits, type ResourceLimits } from './resource-limits.js';
import { Errors } from '../errors.js';
import { createSerializationContext } from './context.js';
import { buildEndnotesXml, buildFootnotesXml } from './notes.js';
import { isDeterministicModeEnabled, resolveDeterministicSeed } from '../deterministic-mode.js';
import type { ImageFetchConfig } from '../elements/images/extractor.js';


export interface NativeOOXMLSerializerOptions {
  autoNoProof?: boolean;
  deterministic?: boolean;
  deterministicSeed?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  headingFont?: string;
  bodyFont?: string;
  monospaceFont?: string;
  resourceLimits?: Partial<ResourceLimits>;
  imageFetch?: ImageFetchConfig & {
    /** Maximum simultaneous external image fetches inside one native render. */
    maxConcurrentExternalFetches?: number;
    /** Aggregate external-fetch wall time allowed per native render (default: 30000ms). */
    maxTotalExternalFetchTimeMs?: number;
    /** Aggregate external image bytes allowed per native render (default: 50MB). */
    maxTotalExternalFetchBytes?: number;
  };
  startAbstractNumId?: number;
  startNumId?: number;
  columns?: number;
  trackChanges?: boolean;
  strictColors?: boolean;
  revisionInfo?: RevisionDefaultsInput;
  defaultCommentAuthor?: string;
  licenseKey?: string;
  /**
   * Cancellation signal checked at each page boundary. A long render
   * can be aborted without waiting for it to finish.
   */
  signal?: AbortSignal;
  /**
   * Per-page progress callback. Fires once after each page's XML is
   * serialized, with pageIndex/pageCount populated.
   */
  onProgress?: (progress: {
    phase: 'serializing';
    percent: number;
    pageIndex: number;
    pageCount: number;
    message?: string;
  }) => void;
  watermark?: string | {
    text?: string;
    opacity?: number;
    rotation?: number;
  };
}

function runsHaveRevisions(runs: TextRun[] | undefined): boolean {
  return Array.isArray(runs) && runs.some((run) => !!run.revision);
}

function collectRunRevisionIds(runs: TextRun[] | undefined, ids: Set<number>): void {
  if (!Array.isArray(runs)) {
    return;
  }
  for (const run of runs) {
    if (run.revision?.id !== undefined) {
      if (ids.has(run.revision.id)) {
        throw Errors.internal(`Duplicate DOCX revision id ${run.revision.id}. Revision IDs must be unique within a render.`);
      }
      ids.add(run.revision.id);
    }
  }
}

function elementHasRevisions(element: StructuredElement): boolean {
  switch (element.type) {
    case 'heading':
    case 'paragraph':
    case 'text-run':
      return ('revision' in element && !!element.revision) || runsHaveRevisions(element.runs);
    case 'table':
      return !!element.revision || element.rows.some((row) =>
        !!row.revision ||
        row.cells.some((cell) => !!cell.revision || runsHaveRevisions(cell.content))
      );
    case 'list':
      return element.items.some((item) => runsHaveRevisions(item.content) || (item.nestedList ? elementHasRevisions(item.nestedList) : false));
    case 'container':
      return element.children.some(elementHasRevisions);
    default:
      return false;
  }
}

function documentHasRevisions(document: StructuredDocument): boolean {
  return document.pages.some((page) => page.elements.some(elementHasRevisions));
}

function collectElementRevisionIds(element: StructuredElement, ids: Set<number>): void {
  if ('revision' in element && element.revision?.id !== undefined) {
    if (ids.has(element.revision.id)) {
      throw Errors.internal(`Duplicate DOCX revision id ${element.revision.id}. Revision IDs must be unique within a render.`);
    }
    ids.add(element.revision.id);
  }
  if ('runs' in element) {
    collectRunRevisionIds(element.runs, ids);
  }

  switch (element.type) {
    case 'table':
      for (const row of element.rows) {
        if (row.revision?.id !== undefined) {
          if (ids.has(row.revision.id)) {
            throw Errors.internal(`Duplicate DOCX revision id ${row.revision.id}. Revision IDs must be unique within a render.`);
          }
          ids.add(row.revision.id);
        }
        for (const cell of row.cells) {
          if (cell.revision?.id !== undefined) {
            if (ids.has(cell.revision.id)) {
              throw Errors.internal(`Duplicate DOCX revision id ${cell.revision.id}. Revision IDs must be unique within a render.`);
            }
            ids.add(cell.revision.id);
          }
          collectRunRevisionIds(cell.content, ids);
        }
      }
      break;
    case 'list':
      for (const item of element.items) {
        collectRunRevisionIds(item.content, ids);
        if (item.nestedList) {
          collectElementRevisionIds(item.nestedList, ids);
        }
      }
      break;
    case 'container':
      for (const child of element.children) {
        collectElementRevisionIds(child, ids);
      }
      break;
    default:
      break;
  }
}

function collectDocumentRevisionIds(document: StructuredDocument): Set<number> {
  const ids = new Set<number>();
  for (const page of document.pages) {
    for (const element of page.elements) {
      collectElementRevisionIds(element, ids);
    }
  }
  return ids;
}

export interface NativeOOXMLSerializerResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  stats: {
    /** Logical source page/section groups; Word determines physical pagination. */
    pageCount: number;
    logicalPageCount: number;
    elementCount: number;
    serializationTimeMs: number;
    xmlTimeMs: number;
    zipTimeMs: number;
    fileSizeBytes: number;
  };
  warnings: string[];
}

export async function serializeStructuredToNativeOOXML(
  document: StructuredDocument,
  options: NativeOOXMLSerializerOptions = {},
): Promise<NativeOOXMLSerializerResult> {
  if (!document || !Array.isArray(document.pages)) {
    throw Errors.invalidDocument('Expected a StructuredDocument with pages.');
  }
  if (document.pages.length === 0) {
    throw Errors.noPages();
  }

  // lint-allow-nondeterministic: perf timer only; value surfaces in stats.serializationTimeMs, not output bytes
  const start = Date.now();
  const limits = resolveResourceLimits(options.resourceLimits);
  enforceResourceLimits(document, limits);

  const deterministicEnabled = options.deterministic ?? isDeterministicModeEnabled();
  const deterministic = createDeterministicContext(resolveDeterministicSeed(options.deterministic, options.deterministicSeed));
  const needsRevisionInfo = options.trackChanges || document.revisionInfo || documentHasRevisions(document);
  const revisionInfo = needsRevisionInfo
    ? resolveRevisionInfo(options.revisionInfo ?? document.revisionInfo, document.metadata?.author)
    : undefined;
  const reservedRevisionIds = revisionInfo ? collectDocumentRevisionIds(document) : new Set<number>();
  const fonts = collectFonts(document);
  if (fonts.length > limits.maxFonts) {
    throw Errors.internal(`Native OOXML font table exceeds maxFonts (${fonts.length} > ${limits.maxFonts})`);
  }

  const contentTypes = new ContentTypesRegistry();
  contentTypes.registerOverride('word/document.xml', CONTENT_TYPES.document);
  contentTypes.registerOverride('word/styles.xml', CONTENT_TYPES.styles);
  contentTypes.registerOverride('word/settings.xml', CONTENT_TYPES.settings);
  contentTypes.registerOverride('word/webSettings.xml', CONTENT_TYPES.webSettings);
  contentTypes.registerOverride('word/fontTable.xml', CONTENT_TYPES.fontTable);
  contentTypes.registerOverride('word/theme/theme1.xml', CONTENT_TYPES.theme);
  contentTypes.registerOverride('docProps/core.xml', CONTENT_TYPES.coreProps);
  contentTypes.registerOverride('docProps/app.xml', CONTENT_TYPES.appProps);

  const packageRelationships = new RelationshipManager();
  packageRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.officeDocument, 'word/document.xml');
  packageRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.coreProperties, 'docProps/core.xml');
  packageRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.extendedProperties, 'docProps/app.xml');

  const documentRelationships = new RelationshipManager();
  documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.styles, 'styles.xml');
  documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.settings, 'settings.xml');
  documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.webSettings, 'webSettings.xml');
  documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.fontTable, 'fontTable.xml');
  documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.theme, 'theme/theme1.xml');

  const context = createSerializationContext({
    document,
    options,
    deterministic,
    limits,
    contentTypes,
    documentRelationships,
    deterministicExternalFetchDisabled: deterministicEnabled,
    revisionInfo,
    commentsEnabled: true,
    reservedRevisionIds,
  });

  const documentXml = await buildDocumentXml(document, context, {
    autoNoProof: options.autoNoProof ?? true,
    columns: options.columns,
    watermark: options.watermark,
    signal: options.signal,
    onProgress: options.onProgress,
  });
  const footnotesXml = context.footnotes.length > 0
    ? buildFootnotesXml(context.footnotes)
    : undefined;
  const endnotesXml = context.endnotes.length > 0
    ? buildEndnotesXml(context.endnotes)
    : undefined;
  let nativeCommentXmlParts: Array<{ path: string; xml: string }> = [];
  if (context.comments.length > 0) {
    const { buildNativeCommentXmlParts } = await import('./comment-parts.js');
    const commentParts = buildNativeCommentXmlParts(context.comments);
    for (const part of commentParts) {
      contentTypes.registerOverride(part.contentTypePath, part.contentType);
      documentRelationships.add(deterministic.nextRelationshipId(), part.relationshipType, part.target);
    }
    nativeCommentXmlParts = commentParts.map((part) => ({ path: part.path, xml: part.xml }));
  }
  const stylesXml = buildStylesXml({
    includeToc: !!document.toc,
    primaryColor: options.primaryColor,
    textColor: options.textColor,
    headingFont: options.headingFont,
    bodyFont: options.bodyFont,
    monospaceFont: options.monospaceFont,
    language: document.metadata.language,
  });
  const settingsXml = buildSettingsXml(deterministic, {
    updateFields: context.usesFields,
    evenAndOddHeaders: context.usesEvenOddHeaders,
    trackRevisions: !!revisionInfo,
    revisionRsid: revisionInfo?.rsid,
  });
  const webSettingsXml = buildWebSettingsXml();
  const fontTableXml = buildFontTableXml(fonts);
  const themeXml = buildThemeXml({
    primaryColor: options.primaryColor,
    secondaryColor: options.secondaryColor,
    accentColor: options.accentColor,
    textColor: options.textColor,
    backgroundColor: options.backgroundColor,
    headingFont: options.headingFont,
    bodyFont: options.bodyFont,
  });
  const corePropsXml = buildCorePropertiesXml(document.metadata, deterministic);
  // Physical page count is unknown until Word lays the document out. Do not
  // publish the source page-group count as an Office physical page count.
  const appPropsXml = buildAppPropertiesXml();
  const numberingXml = context.numberingRegistry.hasDefinitions()
    ? context.numberingRegistry.toXml()
    : undefined;
  if (numberingXml) {
    contentTypes.registerOverride('word/numbering.xml', CONTENT_TYPES.numbering);
    documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.numbering, 'numbering.xml');
  }
  if (footnotesXml) {
    contentTypes.registerOverride('word/footnotes.xml', CONTENT_TYPES.footnotes);
    documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.footnotes, 'footnotes.xml');
  }
  if (endnotesXml) {
    contentTypes.registerOverride('word/endnotes.xml', CONTENT_TYPES.endnotes);
    documentRelationships.add(deterministic.nextRelationshipId(), REL_TYPES.endnotes, 'endnotes.xml');
  }

  const totalXmlBytes = [
    documentXml,
    stylesXml,
    settingsXml,
    webSettingsXml,
    fontTableXml,
    themeXml,
    corePropsXml,
    appPropsXml,
    contentTypes.toXml(),
    packageRelationships.toXml(),
    documentRelationships.toXml(),
    numberingXml ?? '',
    footnotesXml ?? '',
    endnotesXml ?? '',
    ...nativeCommentXmlParts.map((part) => part.xml),
    ...context.xmlParts.map((part) => part.xml),
    ...context.xmlParts.map((part) => part.relationshipsXml ?? ''),
  ].reduce((sum, xml) => sum + Buffer.byteLength(xml, 'utf8'), 0);
  if (totalXmlBytes > limits.maxTotalXmlBytes) {
    throw Errors.internal(`Native OOXML total XML size exceeds maxTotalXmlBytes (${totalXmlBytes} > ${limits.maxTotalXmlBytes}).`);
  }

  // lint-allow-nondeterministic: perf timer diff
  const xmlTimeMs = Date.now() - start;
  // lint-allow-nondeterministic: perf timer — ZIP assembly phase timing
  const zipStart = Date.now();
  const buffer = await assembleNativeDocxPackage({
    contentTypesXml: contentTypes.toXml(),
    packageRelationshipsXml: packageRelationships.toXml(),
    documentRelationshipsXml: documentRelationships.toXml(),
    documentXml,
    numberingXml,
    footnotesXml,
    endnotesXml,
    stylesXml,
    settingsXml,
    webSettingsXml,
    fontTableXml,
    themeXml,
    appPropsXml,
    corePropsXml,
    mediaParts: context.mediaParts.map((part) => ({ path: part.path, buffer: part.buffer })),
    xmlParts: [...context.xmlParts, ...nativeCommentXmlParts],
  }, deterministic);
  // lint-allow-nondeterministic: perf timer diff
  const zipTimeMs = Date.now() - zipStart;

  return {
    buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    stats: {
      pageCount: document.pages.length,
      logicalPageCount: document.pages.length,
      elementCount: document.pages.reduce((count, page) => count + page.elements.length, 0),
      // lint-allow-nondeterministic: perf timer diff — exposed only in stats
      serializationTimeMs: Date.now() - start,
      xmlTimeMs,
      zipTimeMs,
      fileSizeBytes: buffer.byteLength,
    },
    warnings: [...context.warnings],
  };
}
