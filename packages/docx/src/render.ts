/**
 * Main Entry Point: renderToDocx
 *
 * JSON in, DOCX binary out. No React, no DOM, no Puppeteer.
 *
 * Accepts either:
 * - DocxDocument (DOCX-native JSON schema, preferred for AI agents)
 * - StructuredDocument (internal intermediate format, for advanced use)
 *
 * Returns a DocxResult with the DOCX buffer and metadata.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { DocxDocumentSchema, type DocxDocument, type HtmlDocxOptions } from './schema.js';
import type {
  StructuredDocument,
  DocxResult,
  PdfResult,
  DocxWarning,
  RenderOptions,
  HydrationOptions,
  ValidationResult,
  ValidationIssue,
} from './types.js';
import { docxToStructured } from './adapters/docx-to-structured.js';
import { convertHtmlToStructured } from './adapters/html-to-structured.js';
import {
  serializeStructuredToNativeOOXML,
  type NativeOOXMLSerializerOptions,
} from './ooxml/native-serializer.js';
import {
  convertDocxDocumentToPdf,
  convertStructuredDocumentToPdf,
  type PdfSectionOverlay,
} from './converter/docx-to-pdf.js';
import {
  compileTrackedChangesDocument,
  normalizeTrackedChangesDocument,
  type TrackChangesGranularity,
} from './core/revision-tracker.js';
import { DOCXError, DOCXErrorCode } from './errors.js';
import type { PDFFont, PDFPage } from 'pdf-lib';
import {
  detectImageType,
  prepareImageAsync,
} from './elements/images/extractor.js';
import { runDocxQualityGate } from './quality/index.js';
import type { RenderWithQualityResult } from './quality/types.js';
import { normalizeOoxmlColor } from './ooxml/color.js';
import {
  preprocessDocxDocumentInput,
  toDocxResultWarning,
} from './relaxed-input.js';
import {
  validateDocxBuffer,
  DocxStrictValidationError,
} from './core/ooxml-output-validator.js';
import {
  enforceInputResourceLimits,
  resolveResourceLimits,
} from './ooxml/resource-limits.js';
import { isDeterministicModeEnabled } from './deterministic-mode.js';

const REQUIRE = createRequire(import.meta.url);

function applyAccessibleRenderContract(doc: DocxDocument): DocxDocument {
  const config = doc.accessible && doc.accessible !== true ? doc.accessible : undefined;
  const normalized: DocxDocument = config
    ? {
        ...doc,
        metadata: {
          ...doc.metadata,
          language: config.language ?? doc.metadata?.language,
          title: config.title ?? doc.metadata?.title,
        },
      }
    : doc;

  if (!config?.enforceHeadingHierarchy && !config?.enforceTableHeaders) {
    return normalized;
  }

  let previousHeadingLevel: number | undefined;
  const visit = (elements: DocxDocument['pages'][number]['elements'], parentPath: string): void => {
    elements.forEach((element, index) => {
      const path = `${parentPath}.elements[${index}]`;
      if (config.enforceHeadingHierarchy && element.type === 'heading') {
        const level = Number(element.level);
        if ((previousHeadingLevel === undefined && level > 1)
          || (previousHeadingLevel !== undefined && level > previousHeadingLevel + 1)) {
          throw new DOCXError(
            DOCXErrorCode.DOC_INVALID,
            `Accessible heading hierarchy skips to level ${level} at ${path}.`,
            { recovery: 'Use consecutive heading levels beginning with level 1, or disable enforceHeadingHierarchy.' },
          );
        }
        previousHeadingLevel = level;
      }

      if (config.enforceTableHeaders && element.type === 'table'
        && (element as unknown as { rows: Array<{ isHeader?: boolean }> }).rows.length > 0
        && (element as unknown as { rows: Array<{ isHeader?: boolean }> }).rows[0].isHeader !== true) {
        throw new DOCXError(
          DOCXErrorCode.DOC_INVALID,
          `Accessible table is missing an explicit header row at ${path}.`,
          { recovery: 'Set isHeader: true on the first table row, or disable enforceTableHeaders.' },
        );
      }

      if (element.type === 'container') {
        visit(
          (element as unknown as { children: DocxDocument['pages'][number]['elements'] }).children,
          path,
        );
      }
    });
  };

  for (let pageIndex = 0; pageIndex < normalized.pages.length; pageIndex += 1) {
    visit(normalized.pages[pageIndex].elements, `pages[${pageIndex}]`);
  }
  return normalized;
}

const SYSTEM_FONT_DIRS_MAC = [
  '/System/Library/Fonts/Supplemental',
  '/Library/Fonts',
  '/System/Library/Fonts',
];

const SYSTEM_FONT_DIRS_WIN = [
  'C:\\Windows\\Fonts',
];

const SYSTEM_FONT_DIRS_LINUX = [
  '/usr/share/fonts/truetype/dejavu',
  '/usr/share/fonts/truetype/liberation',
  '/usr/share/fonts/truetype/noto',
  '/usr/share/fonts/truetype',
  '/usr/share/fonts',
];

const PDFA_FALLBACK_FONT_FILES = [
  'NotoSans-Regular.ttf',
  'DejaVuSans.ttf',
  'LiberationSans-Regular.ttf',
  'Arial.ttf',
];

function renderAbortedError(): DOCXError {
  return new DOCXError(
    DOCXErrorCode.RENDER_ABORTED,
    'Render aborted',
    { recovery: 'Create a new AbortController signal and retry the render when cancellation is no longer requested.' },
  );
}

export interface RenderWithTrackedChangesOptions extends RenderOptions {
  author?: string;
  date?: string;
  granularity?: TrackChangesGranularity;
  licenseKey?: string;
}

// =============================================================================
// INPUT TYPE DETECTION
// =============================================================================

type ResolvedInputKind =
  | { kind: 'DocxDocument'; injected: false }
  | { kind: 'StructuredDocument'; injected: false }
  | { kind: 'DocxDocument'; injected: true }
  | { kind: 'StructuredDocument'; injected: true };

/**
 * Classify input as DocxDocument or StructuredDocument.
 *
 * Canonical form:
 *   - DocxDocument:       `type === 'DocxDocument'`
 *   - StructuredDocument: `__kind === 'StructuredDocument'`
 *
 * Legacy form (no discriminator): we fall back to structural inspection
 * and emit a DOCX_RELAXED_KIND_INJECTED warning so consumers can fix
 * their inputs. Truly ambiguous inputs throw.
 */
function resolveInputKind(input: unknown): ResolvedInputKind {
  if (typeof input !== 'object' || input === null) {
    throw new DOCXError(
      DOCXErrorCode.DOC_INVALID,
      'Input must be a DocxDocument or StructuredDocument object',
      { recovery: 'Pass a valid DocxDocument JSON or StructuredDocument value.' },
    );
  }

  const record = input as Record<string, unknown>;

  if (record.__kind === 'StructuredDocument') {
    return { kind: 'StructuredDocument', injected: false };
  }
  if (record.type === 'DocxDocument') {
    return { kind: 'DocxDocument', injected: false };
  }

  // Legacy: no explicit discriminator. Use structural fallback.
  if (!('pages' in record)) {
    throw new DOCXError(
      DOCXErrorCode.DOC_INVALID,
      'Input is missing `pages`; cannot classify as DocxDocument or StructuredDocument.',
      { recovery: 'Set `type: "DocxDocument"` or `__kind: "StructuredDocument"` and provide a non-empty `pages` array.' },
    );
  }

  // StructuredDocument has `stats` *and* `assets` *and* `styles` — three
  // fields that DocxDocument Zod parsing never produces. DocxDocument has
  // `pageSize`, which StructuredDocument does not. Use a conservative
  // signature: require all three structural fields to be present before
  // classifying as StructuredDocument. Otherwise treat as DocxDocument.
  const looksStructured = 'stats' in record && 'assets' in record && 'styles' in record;
  return looksStructured
    ? { kind: 'StructuredDocument', injected: true }
    : { kind: 'DocxDocument', injected: true };
}

function validatePublicDocxColors(value: unknown, path: string[] = []): void {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validatePublicDocxColors(item, [...path, String(index)]));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    const isThemeColorValue = path.slice(-2).join('.') === 'theme.colors';
    const isColorKey = key === 'color' || key === 'backgroundColor' || key.endsWith('Color') || isThemeColorValue;
    if (isColorKey && typeof child === 'string') {
      try {
        normalizeOoxmlColor(child);
      } catch (error) {
        if (error instanceof DOCXError) {
          throw new DOCXError(error.code, error.message, {
            recovery: error.recovery,
            context: { ...error.context, path: nextPath.join('.') },
            cause: error,
          });
        }
        throw error;
      }
    }
    validatePublicDocxColors(child, nextPath);
  }
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Render a DocxDocument or StructuredDocument to DOCX binary.
 *
 * @example
 * ```ts
 * const result = await renderToDocx({
 *   type: 'DocxDocument',
 *   pageSize: 'a4',
 *   pages: [{
 *     elements: [
 *       { type: 'heading', level: 1, text: 'Hello World' },
 *       { type: 'paragraph', text: 'This is a test document.' },
 *     ]
 *   }]
 * });
 * fs.writeFileSync('output.docx', result.buffer);
 * ```
 */
export async function renderToDocx(
  input: DocxDocument | StructuredDocument,
  options?: RenderOptions & { licenseKey?: string },
): Promise<DocxResult> {

  const startTime = Date.now();
  const warnings: DocxWarning[] = [];
  const resourceLimits = resolveResourceLimits(options?.resourceLimits);
  enforceInputResourceLimits(input, resourceLimits);

  options?.onProgress?.({ phase: 'validating', percent: 0, message: 'Validating input' });

  // 1. Determine input type and convert to StructuredDocument
  let structured: StructuredDocument;
  let serializerOptions: NativeOOXMLSerializerOptions = {};

  const resolved = resolveInputKind(input);
  if (resolved.injected) {
    warnings.push({
      code: 'DOCX_RELAXED_KIND_INJECTED',
      message: `Input lacked explicit kind discriminator; classified as ${resolved.kind} by structural inspection.`,
      recovery: resolved.kind === 'DocxDocument'
        ? 'Set `type: "DocxDocument"` on the input.'
        : 'Set `__kind: "StructuredDocument"` on the input.',
    });
  }

  if (resolved.kind === 'DocxDocument') {
    const prepared = preprocessDocxDocumentInput(input, options);
    for (const warning of prepared.warnings) {
      warnings.push(toDocxResultWarning(warning));
    }

    // Validate with Zod
    const parsed = DocxDocumentSchema.safeParse(prepared.value);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new DOCXError(
        DOCXErrorCode.DOC_INVALID,
        `Invalid DocxDocument: ${issues.join('; ')}`,
        { recovery: 'Check the DocxDocument schema and fix validation errors.' }
      );
    }

    let doc: DocxDocument = applyAccessibleRenderContract(parsed.data);
    validatePublicDocxColors(doc);

    if (doc.options?.trackChanges) {
      doc = normalizeTrackedChangesDocument(doc);
    }

    options?.onProgress?.({ phase: 'converting', percent: 20, message: 'Converting to internal format' });

    // Convert DocxDocument → StructuredDocument
    structured = docxToStructured(doc);

    // Map DocxDocument options → serializer options
    serializerOptions = mapDocxOptions(doc);
    serializerOptions.licenseKey = options?.licenseKey;
  } else {
    // Ensure the discriminator is present on legacy inputs so downstream
    // code can rely on it unconditionally.
    structured = resolved.injected
      ? { ...(input as StructuredDocument), __kind: 'StructuredDocument' }
      : (input as StructuredDocument);
    serializerOptions = {
      licenseKey: options?.licenseKey,
    };
  }

  // 2. Check abort signal
  if (options?.signal?.aborted) {
    throw renderAbortedError();
  }

  // Thread AbortSignal + per-page progress into the serializer so the
  // inner loop can cancel + report granular progress on large docs.
  serializerOptions.deterministic = options?.deterministic;
  serializerOptions.deterministicSeed = options?.deterministicSeed;
  serializerOptions.resourceLimits = options?.resourceLimits;
  serializerOptions.imageFetch = options?.imageFetch;
  serializerOptions.signal = options?.signal;
  if (options?.onProgress) {
    serializerOptions.onProgress = (pageProgress) => {
      options.onProgress?.(pageProgress);
    };
  }

  options?.onProgress?.({ phase: 'serializing', percent: 50, message: 'Generating DOCX' });

  // 3. Serialize to DOCX
  const result = await serializeStructuredToNativeOOXML(structured, serializerOptions);

  options?.onProgress?.({ phase: 'optimizing', percent: 90, message: 'Finalizing' });

  // 4. Collect warnings
  for (const w of result.warnings) {
    warnings.push({ code: 'DOCX_SERIALIZER_WARNING', message: w });
  }

  // 4b. Post-emit OOXML strict validation. Default to fail-closed on negative
  // tab positions, missing Content_Types overrides, or unresolved relationship
  // targets; callers can opt out with `{ strict: false }`.
  if (options?.strict !== false) {
    const validation = await validateDocxBuffer(result.buffer);
    if (!validation.ok) {
      throw new DocxStrictValidationError(validation.issues);
    }
    for (const issue of validation.issues) {
      warnings.push({
        code: 'DOCX_STRICT_VALIDATOR_WARNING',
        message: `${issue.code}: ${issue.message}`,
      });
    }
  }

  const renderTimeMs = Date.now() - startTime;

  options?.onProgress?.({ phase: 'optimizing', percent: 100, message: 'Done' });

  return {
    buffer: result.buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    stats: {
      pageCount: result.stats.pageCount,
      logicalPageCount: result.stats.logicalPageCount,
      elementCount: result.stats.elementCount,
      imageCount: structured.stats.imageCount,
      tableCount: structured.stats.tableCount,
      chartCount: structured.stats.chartCount,
      fileSizeBytes: result.stats.fileSizeBytes,
      renderTimeMs,
      xmlTimeMs: result.stats.xmlTimeMs,
      zipTimeMs: result.stats.zipTimeMs,
    },
    warnings,
  };
}

export async function renderToDocxWithQuality(
  input: DocxDocument | StructuredDocument,
  options?: RenderOptions & { licenseKey?: string },
): Promise<RenderWithQualityResult> {
  const rendered = await renderToDocx(input, options);
  const gate = await runDocxQualityGate({
    buffer: rendered.buffer,
    renderStats: rendered.stats,
  });
  return {
    output: gate.output,
    quality: gate.quality,
  };
}

export async function renderToPdf(
  input: DocxDocument | StructuredDocument,
  options?: RenderOptions & { licenseKey?: string },
): Promise<PdfResult> {
  const startTime = Date.now();
  const warnings: DocxWarning[] = [];
  const resourceLimits = resolveResourceLimits(options?.resourceLimits);
  enforceInputResourceLimits(input, resourceLimits);

  options?.onProgress?.({ phase: 'validating', percent: 0, message: 'Validating input' });

  let structured: StructuredDocument;
  let sourceDoc: DocxDocument | undefined;

  const resolved = resolveInputKind(input);
  if (resolved.injected) {
    warnings.push({
      code: 'DOCX_RELAXED_KIND_INJECTED',
      message: `Input lacked explicit kind discriminator; classified as ${resolved.kind} by structural inspection.`,
      recovery: resolved.kind === 'DocxDocument'
        ? 'Set `type: "DocxDocument"` on the input.'
        : 'Set `__kind: "StructuredDocument"` on the input.',
    });
  }

  if (resolved.kind === 'DocxDocument') {
    const prepared = preprocessDocxDocumentInput(input, options);
    for (const warning of prepared.warnings) {
      warnings.push(toDocxResultWarning(warning));
    }

    const parsed = DocxDocumentSchema.safeParse(prepared.value);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new DOCXError(
        DOCXErrorCode.DOC_INVALID,
        `Invalid DocxDocument: ${issues.join('; ')}`,
        { recovery: 'Check the DocxDocument schema and fix validation errors.' }
      );
    }

    let doc: DocxDocument = applyAccessibleRenderContract(parsed.data);
    if (doc.options?.trackChanges) {
      doc = normalizeTrackedChangesDocument(doc);
    }

    sourceDoc = doc;
    options?.onProgress?.({ phase: 'converting', percent: 20, message: 'Converting DOCX semantics to PDF sections' });
    structured = docxToStructured(doc);
  } else {
    structured = resolved.injected
      ? { ...(input as StructuredDocument), __kind: 'StructuredDocument' }
      : (input as StructuredDocument);
    options?.onProgress?.({ phase: 'converting', percent: 20, message: 'Preparing structured content for PDF output' });
  }

  if (options?.signal?.aborted) {
    throw renderAbortedError();
  }

  const conversion = sourceDoc
    ? convertDocxDocumentToPdf(sourceDoc, structured)
    : convertStructuredDocumentToPdf(structured);

  for (const warning of conversion.warnings) {
    warnings.push({ code: 'DOCX_PDF_BRIDGE_FALLBACK', message: warning });
  }

  options?.onProgress?.({ phase: 'serializing', percent: 55, message: 'Rendering section PDFs' });

  const complianceMode = resolvePdfComplianceMode(sourceDoc, options);
  const { PdfEngine } = await loadPdfEngine();
  for (const section of conversion.sections) {
    applyPdfComplianceMode(section.document as Record<string, unknown>, complianceMode);
  }

  if (complianceMode.strict) {
    const mergeRequired =
      conversion.sections.length !== 1 ||
      conversion.sections.some((section) => sectionOverlayRequiresMerge(section.overlay));
    if (mergeRequired) {
      throw new DOCXError(
        DOCXErrorCode.DOC_INVALID,
        'DOCX PDF compliance export currently requires a single section without header/footer/watermark overlays.',
        {
          recovery:
            'Remove header/footer/watermark overlays or reduce the export to a single section before requesting tagged or PDF/A output.',
        },
      );
    }
  }

  const sectionBuffers = await Promise.all(
    conversion.sections.map(section => PdfEngine.render(
      section.document,
      complianceMode.pdfA ? { pdfA: complianceMode.pdfA } : undefined,
    ))
  );

  if (complianceMode.strict) {
    const [buffer] = sectionBuffers;
    let pdfLib: Awaited<typeof import('pdf-lib')>;
    try {
      pdfLib = await import('pdf-lib');
    } catch {
      throw new DOCXError(
        DOCXErrorCode.DOC_INVALID,
        'renderToPdf requires the optional pdf-lib dependency to inspect compliance-preserving PDF output.',
        { recovery: 'Install pdf-lib in the consuming project and rerun renderToPdf().' }
      );
    }
    const pdf = await pdfLib.PDFDocument.load(buffer);

    options?.onProgress?.({ phase: 'optimizing', percent: 100, message: 'Done' });

    return {
      buffer,
      mimeType: 'application/pdf',
      extension: '.pdf',
      stats: {
        pageCount: pdf.getPageCount(),
        elementCount: structured.stats.elementCount,
        imageCount: structured.stats.imageCount,
        tableCount: structured.stats.tableCount,
        chartCount: structured.stats.chartCount,
        fileSizeBytes: buffer.length,
        renderTimeMs: Date.now() - startTime,
      },
      warnings,
    };
  }

  options?.onProgress?.({ phase: 'optimizing', percent: 80, message: 'Merging sections and applying overlays' });

  const { buffer, pageCount, warnings: overlayWarnings } = await mergeSectionPdfBuffers(
    sectionBuffers,
    conversion.sections.map(section => section.overlay),
  );

  for (const warning of overlayWarnings) {
    warnings.push({ code: 'DOCX_PDF_BRIDGE_FALLBACK', message: warning });
  }

  options?.onProgress?.({ phase: 'optimizing', percent: 100, message: 'Done' });

  return {
    buffer,
    mimeType: 'application/pdf',
    extension: '.pdf',
    stats: {
      pageCount,
      elementCount: structured.stats.elementCount,
      imageCount: structured.stats.imageCount,
      tableCount: structured.stats.tableCount,
      chartCount: structured.stats.chartCount,
      fileSizeBytes: buffer.length,
      renderTimeMs: Date.now() - startTime,
    },
    warnings,
  };
}

// =============================================================================
// TEMPLATE HYDRATION
// =============================================================================

/**
 * Hydrate a DOCX template with data.
 * Replaces {{placeholder}} patterns in an existing DOCX file.
 *
 * Surfaces any unfilled placeholders as DOCX_HYDRATE_UNFILLED_PLACEHOLDER
 * warnings on the returned DocxResult, with the placeholder name in
 * `context.placeholder`. In strict mode the hydrator itself throws, so
 * callers only see warnings in the non-strict path.
 */
export async function hydrateDocx(
  templateBuffer: Buffer,
  data: Record<string, unknown>,
  options?: HydrationOptions,
): Promise<DocxResult> {
  // lint-allow-nondeterministic: perf timer only; value surfaces in stats, not output bytes
  const startTime = Date.now();

  // Dynamic import to avoid bundling jszip when not needed
  const { hydrateTemplate } = await import('./hydration/hydrator.js');
  const result = await hydrateTemplate(templateBuffer, data as Record<string, any>, {
    strictMode: options?.onMissing === 'error',
    removeUnfilled: options?.onMissing === 'remove',
    syntax: options?.syntax,
    archiveLimits: options?.archiveLimits,
  });
  const normalizedBuffer = Buffer.from(result.buffer);

  const warnings: DocxWarning[] = [];
  for (const placeholder of result.unfilled) {
    warnings.push({
      code: 'DOCX_HYDRATE_UNFILLED_PLACEHOLDER',
      message: `Template placeholder "${placeholder}" had no matching data and was left in place.`,
      context: { placeholder },
      recovery: 'Provide a value under the matching key in the `data` argument, or set `onMissing: "remove"` to strip unfilled placeholders.',
    });
  }
  for (const generic of result.warnings) {
    // These are non-structured strings the hydrator surfaces (e.g.
    // split-placeholder detection). Classify them as split-placeholder
    // warnings — the hydrator only emits them for that class today, so
    // the mapping is safe. If future warning classes appear, add codes
    // to the registry before the mapping.
    warnings.push({
      code: 'DOCX_HYDRATE_SPLIT_PLACEHOLDER',
      message: generic,
    });
  }

  return {
    buffer: normalizedBuffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    stats: {
      pageCount: 0,
      elementCount: 0,
      imageCount: 0,
      tableCount: 0,
      chartCount: 0,
      fileSizeBytes: normalizedBuffer.length,
      // lint-allow-nondeterministic: perf timer diff
      renderTimeMs: Date.now() - startTime,
    },
    warnings,
  };
}

export async function hydrateDocxToPdf(
  templateBuffer: Buffer,
  data: Record<string, unknown>,
  options?: (HydrationOptions & RenderOptions & { licenseKey?: string }),
): Promise<PdfResult> {
  const hydrated = await hydrateDocx(templateBuffer, data, options);
  const { parseDocxBuffer } = await import('./diff/docx-buffer-parser.js');
  const parsed = await parseDocxBuffer(hydrated.buffer);
  const pdf = await renderToPdf(parsed.document, options);
  return {
    ...pdf,
    warnings: [
      ...hydrated.warnings,
      ...pdf.warnings,
    ],
  };
}

export async function renderWithTrackedChanges(
  original: DocxDocument,
  revised: DocxDocument,
  options: RenderWithTrackedChangesOptions = {}
): Promise<DocxResult> {

  const trackedDocument = compileTrackedChangesDocument(original, revised, {
    author: options.author,
    date: options.date,
    granularity: options.granularity,
  });

  return renderToDocx(trackedDocument, options);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a DocxDocument without rendering.
 * Returns detailed validation issues.
 */
export function validateDocxDocument(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  let elementsChecked = 0;

  const parsed = DocxDocumentSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        severity: 'error',
        code: 'DOCX_VALIDATE_SCHEMA',
        message: issue.message,
        path: issue.path.join('.'),
      });
    }
    return {
      valid: false,
      issues,
      stats: { elementsChecked: 0, errorsFound: issues.length, warningsFound: 0 },
    };
  }

  const doc = parsed.data;

  // Validate content
  for (const page of doc.pages) {
    for (const el of page.elements) {
      elementsChecked++;
      validateElement(el as any, issues, `pages[${doc.pages.indexOf(page)}]`);
    }
  }

  const errorsFound = issues.filter(i => i.severity === 'error').length;
  const warningsFound = issues.filter(i => i.severity === 'warning').length;

  return {
    valid: errorsFound === 0,
    issues,
    stats: { elementsChecked, errorsFound, warningsFound },
  };
}

function validateElement(el: any, issues: ValidationIssue[], path: string): void {
  if (el.type === 'image' && !el.src) {
    issues.push({
      severity: 'error',
      code: 'DOCX_VALIDATE_IMAGE_NO_SRC',
      message: 'Image element missing src',
      path,
    });
  }
  if (el.type === 'table' && (!el.rows || el.rows.length === 0)) {
    issues.push({
      severity: 'warning',
      code: 'DOCX_VALIDATE_TABLE_EMPTY',
      message: 'Table has no rows',
      path,
    });
  }
  if (el.type === 'chart' && (!el.series || el.series.length === 0)) {
    issues.push({
      severity: 'warning',
      code: 'DOCX_VALIDATE_CHART_NO_DATA',
      message: 'Chart has no data series',
      path,
    });
  }
  if (el.type === 'heading' && !el.text && (!el.runs || el.runs.length === 0)) {
    issues.push({
      severity: 'warning',
      code: 'DOCX_VALIDATE_HEADING_EMPTY',
      message: 'Heading has no text content',
      path,
    });
  }
  if (el.type === 'container' && el.children) {
    for (let i = 0; i < el.children.length; i++) {
      validateElement(el.children[i], issues, `${path}.children[${i}]`);
    }
  }
}

// =============================================================================
// OPTIONS MAPPING
// =============================================================================

// =============================================================================
// HTML-TO-DOCX API
// =============================================================================

/**
 * Render an HTML string to DOCX binary.
 *
 * Free tier: paragraphs, headings, lists, inline formatting, code blocks.
 * Pro tier: tables, images, CSS style mapping.
 *
 * @example
 * ```ts
 * const { buffer, warnings } = await renderHtmlToDocx(`
 *   <h1>Report Title</h1>
 *   <p>This is a <strong>bold</strong> paragraph.</p>
 *   <ul><li>First item</li><li>Second item</li></ul>
 * `);
 * fs.writeFileSync('output.docx', buffer);
 * ```
 */
export async function renderHtmlToDocx(
  html: string,
  options?: HtmlDocxOptions,
): Promise<DocxResult> {
  if (typeof html !== 'string') {
    throw new DOCXError(
      DOCXErrorCode.DOC_INVALID,
      'Input must be an HTML string',
      { recovery: 'Provide a valid HTML string.' },
    );
  }

  const startTime = Date.now();

  const { document: structured, warnings: conversionWarnings } = convertHtmlToStructured(html, {
    cssMode: options?.cssMode ?? 'inline',
    baseUrl: options?.baseUrl,
  });

  const serializerOptions = mapHtmlDocxOptions(options);
  const result = await serializeStructuredToNativeOOXML(structured, serializerOptions);

  const warnings: DocxWarning[] = [];
  for (const w of conversionWarnings) {
    warnings.push({ code: 'DOCX_HTML_CONVERSION_WARNING', message: w });
  }
  // The serializer context seeds itself from `structured.warnings`, so every
  // conversion warning comes back out in `result.warnings` too. Reporting both
  // lists verbatim duplicated each one — invisible while warnings were an
  // unexamined array, obvious the moment they became a loss ledger.
  const alreadyReported = new Set(conversionWarnings);
  for (const w of result.warnings) {
    if (alreadyReported.has(w)) continue;
    warnings.push({ code: 'DOCX_SERIALIZER_WARNING', message: w });
  }

  return {
    buffer: result.buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    stats: {
      pageCount: result.stats.pageCount,
      elementCount: result.stats.elementCount,
      imageCount: structured.stats.imageCount,
      tableCount: structured.stats.tableCount,
      chartCount: 0,
      fileSizeBytes: result.stats.fileSizeBytes,
      renderTimeMs: Date.now() - startTime,
    },
    warnings,
  };
}

function mapHtmlDocxOptions(options?: HtmlDocxOptions): NativeOOXMLSerializerOptions {
  const opts: NativeOOXMLSerializerOptions = {};
  void options;
  return opts;
}

// =============================================================================
// OPTIONS MAPPING (DocxDocument)
// =============================================================================

function mapDocxOptions(doc: DocxDocument): NativeOOXMLSerializerOptions {
  const opts: NativeOOXMLSerializerOptions = {};

  // Theme colors and fonts
  if (doc.theme?.colors?.primary) opts.primaryColor = doc.theme.colors.primary;
  if (doc.theme?.colors?.secondary) opts.secondaryColor = doc.theme.colors.secondary;
  if (doc.theme?.colors?.accent) opts.accentColor = doc.theme.colors.accent;
  if (doc.theme?.colors?.text) opts.textColor = doc.theme.colors.text;
  if (doc.theme?.colors?.background) opts.backgroundColor = doc.theme.colors.background;
  if (doc.theme?.fonts?.heading) opts.headingFont = doc.theme.fonts.heading;
  if (doc.theme?.fonts?.body) opts.bodyFont = doc.theme.fonts.body;
  if (doc.theme?.fonts?.monospace) opts.monospaceFont = doc.theme.fonts.monospace;

  // Watermark
  if (doc.watermark) {
    if (typeof doc.watermark === 'string') {
      opts.watermark = { text: doc.watermark };
    } else {
      opts.watermark = doc.watermark;
    }
  }

  // Columns
  if (doc.options?.columns) {
    opts.columns = doc.options.columns;
  }

  if (doc.options?.trackChanges) {
    opts.trackChanges = true;
    opts.revisionInfo = doc.revisionInfo;
  }

  return opts;
}

async function mergeSectionPdfBuffers(
  buffers: Buffer[],
  overlays: PdfSectionOverlay[],
): Promise<{ buffer: Buffer; pageCount: number; warnings: string[] }> {
  let pdfLib: Awaited<typeof import('pdf-lib')>;
  try {
    pdfLib = await import('pdf-lib');
  } catch {
    throw new DOCXError(
      DOCXErrorCode.DOC_INVALID,
      'renderToPdf requires the optional pdf-lib dependency to merge sections.',
      { recovery: 'Install pdf-lib in the consuming project and rerun renderToPdf().' }
    );
  }

  const merged = await pdfLib.PDFDocument.create();
  // pdf-lib stamps the wall clock into /ModDate and /CreationDate on create(),
  // so two runs a second apart produced different bytes while the receipt
  // claimed determinism -- the falsifiable claim R24 forbids. Pin both to the
  // PDF epoch under deterministic mode; OC-1 R25 wants the timestamp omitted
  // rather than zeroed, and pdf-lib has no way to omit it, so a fixed value is
  // the closest honest equivalent.
  if (isDeterministicModeEnabled()) {
    const epoch = new Date(0);
    merged.setCreationDate(epoch);
    merged.setModificationDate(epoch);
  }
  const ranges: Array<{ count: number; overlay: PdfSectionOverlay; start: number }> = [];
  const warnings: string[] = [];
  const watermarkCache = new Map<string, Promise<any | null>>();

  for (let index = 0; index < buffers.length; index += 1) {
    const source = await pdfLib.PDFDocument.load(buffers[index]);
    const pages = await merged.copyPages(source, source.getPageIndices());
    const start = merged.getPageCount();
    for (const page of pages) {
      merged.addPage(page);
    }
    ranges.push({ count: pages.length, overlay: overlays[index], start });
  }

  const totalPages = merged.getPageCount();
  const font = await merged.embedFont(pdfLib.StandardFonts.Helvetica);

  for (const range of ranges) {
    for (let localIndex = 0; localIndex < range.count; localIndex += 1) {
      const page = merged.getPage(range.start + localIndex);
      const globalPageNumber = range.start + localIndex + 1;
      await applyOverlayToPage(
        merged,
        page,
        font,
        range.overlay,
        globalPageNumber,
        totalPages,
        pdfLib.rgb,
        pdfLib.degrees,
        watermarkCache,
        warnings,
      );
    }
  }

  return {
    buffer: Buffer.from(await merged.save()),
    pageCount: totalPages,
    warnings,
  };
}

/**
 * Load the PDF engine.
 *
 * Tagged and PDF/A output used to be routed to `@runstamp/pdf-pro`,
 * falling back to a sibling `dist-pro` build. Both are gone: every capability —
 * font embedding, complex-script shaping, PDF/A and tagging — ships in the
 * published `@runstamp/pdf`, so there is one engine to load.
 */
async function loadPdfEngine(): Promise<any> {
  return await import('@runstamp/pdf');
}

function resolvePdfComplianceMode(
  sourceDoc: DocxDocument | undefined,
  options: RenderOptions | undefined,
): { pdfA?: 'PDF/A-1b' | 'PDF/A-2b'; strict: boolean; tagged: boolean } {
  return {
    pdfA: options?.pdfA,
    strict: Boolean(options?.pdfA || options?.tagged),
    tagged: Boolean(options?.tagged || sourceDoc?.accessible),
  };
}

function applyPdfComplianceMode(
  document: Record<string, unknown>,
  mode: { pdfA?: 'PDF/A-1b' | 'PDF/A-2b'; tagged: boolean },
): void {
  if (mode.tagged) {
    const current = (document.accessibility as Record<string, unknown> | undefined) ?? {};
    document.accessibility = {
      ...current,
      tagged: true,
    };
  }

  // Both tagged and PDF/A exports require an embedded fallback font — PDF/A
  // bans built-in Helvetica, and tagged output needs a real font for actual
  // text extraction. Resolve it whenever either is requested.
  if (mode.tagged || mode.pdfA) {
    const current = (document.pdfa as Record<string, unknown> | undefined) ?? {};
    const fallbackFont = current.fallbackFont ?? resolvePdfaFallbackFont();
    if (!fallbackFont) {
      throw new DOCXError(
        DOCXErrorCode.DOC_INVALID,
        'Accessible or PDF/A export requires an embedded fallback font, but no compatible fallback font was found on this system.',
        {
          recovery:
            'Install a standard TrueType fallback font such as Noto Sans, DejaVu Sans, Liberation Sans, or Arial and rerun the export.',
        },
      );
    }
    document.pdfa = {
      ...current,
      fallbackFont,
    };
  }
}

function resolvePdfaFallbackFont():
  | {
      family: string;
      source: string;
    }
  | undefined {
  const bundled = resolveBundledPdfaFallbackFont();
  if (bundled) {
    return bundled;
  }

  const fontDirs =
    process.platform === 'darwin'
      ? SYSTEM_FONT_DIRS_MAC
      : process.platform === 'win32'
        ? SYSTEM_FONT_DIRS_WIN
        : SYSTEM_FONT_DIRS_LINUX;

  for (const dir of fontDirs) {
    for (const fileName of PDFA_FALLBACK_FONT_FILES) {
      const candidate = join(dir, fileName);
      if (existsSync(candidate)) {
        return {
          family: stripFontExtension(fileName),
          source: candidate,
        };
      }
    }
  }

  return undefined;
}

function resolveBundledPdfaFallbackFont():
  | {
      family: string;
      source: string;
    }
  | undefined {
  try {
    const hbDir = dirname(REQUIRE.resolve('harfbuzzjs/hb.js'));
    const source = join(hbDir, 'test', 'fonts', 'noto', 'NotoSans-Regular.ttf');
    if (existsSync(source)) {
      return {
        family: 'Noto Sans',
        source,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function stripFontExtension(fileName: string): string {
  return fileName.replace(/\.(ttf|otf)$/i, '');
}

function sectionOverlayRequiresMerge(overlay: PdfSectionOverlay): boolean {
  return Boolean(
    overlay.footerText ||
      overlay.footerUsesPageNumber ||
      overlay.headerText ||
      overlay.headerUsesPageNumber ||
      overlay.watermarkImage ||
      overlay.watermarkText,
  );
}

async function applyOverlayToPage(
  pdfDoc: any,
  page: PDFPage,
  font: PDFFont,
  overlay: PdfSectionOverlay,
  pageNumber: number,
  totalPages: number,
  rgb: typeof import('pdf-lib').rgb,
  degrees: typeof import('pdf-lib').degrees,
  watermarkCache: Map<string, Promise<any | null>>,
  warnings: string[],
): Promise<void> {
  const { width, height } = page.getSize();
  const fontSize = 10;
  const pageNumberLabel = formatPageNumber(pageNumber, overlay.pageNumberFormat);
  const headerText = buildOverlayText(overlay.headerText, overlay.headerUsesPageNumber, pageNumberLabel, totalPages);
  const footerText = buildOverlayText(overlay.footerText, overlay.footerUsesPageNumber, pageNumberLabel, totalPages);

  if (overlay.watermarkImage) {
    const prepared = await resolveOverlayWatermarkImage(pdfDoc, overlay, watermarkCache, warnings);
    if (prepared) {
      const dimensions = fitWatermarkDimensions(prepared.width, prepared.height, width, height);
      page.drawImage(prepared.image, {
        opacity: overlay.watermarkOpacity ?? 0.25,
        rotate: degrees(overlay.watermarkRotation ?? -45),
        width: dimensions.width,
        height: dimensions.height,
        x: (width - dimensions.width) / 2,
        y: (height - dimensions.height) / 2,
      });
    }
  }

  if (overlay.watermarkText) {
    const watermarkSize = Math.max(28, Math.min(width, height) / 12);
    page.drawText(overlay.watermarkText, {
      color: rgb(0.68, 0.70, 0.76) as any,
      font,
      opacity: overlay.watermarkOpacity ?? 0.2,
      rotate: degrees(overlay.watermarkRotation ?? -45),
      size: watermarkSize,
      x: width * 0.18,
      y: height * 0.45,
    });
  }

  if (headerText) {
    page.drawText(headerText, {
      color: rgb(0.18, 0.18, 0.18) as any,
      font,
      maxWidth: width - 108,
      size: fontSize,
      x: 54,
      y: height - 28,
    });
  }

  if (footerText) {
    page.drawText(footerText, {
      color: rgb(0.18, 0.18, 0.18) as any,
      font,
      maxWidth: width - 108,
      size: fontSize,
      x: 54,
      y: 24,
    });
  }
}

async function resolveOverlayWatermarkImage(
  pdfDoc: any,
  overlay: PdfSectionOverlay,
  watermarkCache: Map<string, Promise<any | null>>,
  warnings: string[],
): Promise<{ height: number; image: any; width: number } | null> {
  const source = overlay.watermarkImage;
  if (!source) {
    return null;
  }

  let pending = watermarkCache.get(source);
  if (!pending) {
    pending = (async () => {
      const type = detectImageType(source);
      if (!['png', 'jpeg'].includes(type)) {
        warnings.push(`PDF bridge fallback: watermark image format "${type}" is not supported in PDF overlays.`);
        return null;
      }

      const prepared = await prepareImageAsync({
        alignment: 'center',
        alt: 'Watermark',
        height: 1,
        id: 'overlay-watermark',
        isDataUri: source.startsWith('data:'),
        isExternalUrl: source.startsWith('http://') || source.startsWith('https://') || source.startsWith('//'),
        needsConversion: false,
        position: 'inline',
        src: source,
        type,
        width: 1,
      });

      if (!prepared.buffer) {
        warnings.push(`PDF bridge fallback: unable to load watermark image (${prepared.error ?? 'unknown error'}).`);
        return null;
      }

      const image = type === 'png'
        ? await pdfDoc.embedPng(prepared.buffer)
        : await pdfDoc.embedJpg(prepared.buffer);
      const scaled = image.scale(1);
      return {
        height: scaled.height,
        image,
        width: scaled.width,
      };
    })();
    watermarkCache.set(source, pending);
  }

  return await pending;
}

function fitWatermarkDimensions(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
): { height: number; width: number } {
  const maxWidth = pageWidth * 0.6;
  const maxHeight = pageHeight * 0.45;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);
  return {
    height: Math.max(1, imageHeight * scale),
    width: Math.max(1, imageWidth * scale),
  };
}

function buildOverlayText(
  baseText: string | undefined,
  includePageNumber: boolean | undefined,
  pageNumber: string,
  totalPages: number,
): string | undefined {
  if (!baseText && !includePageNumber) {
    return undefined;
  }

  const parts: string[] = [];
  if (baseText) {
    parts.push(baseText.replace(/\{\{totalPages\}\}/g, String(totalPages)));
  }
  if (includePageNumber) {
    parts.push(pageNumber);
  }

  return parts.join(' ').trim() || undefined;
}

function formatPageNumber(
  value: number,
  format: 'decimal' | 'roman' | 'romanUpper' | 'letter' | 'letterUpper' | undefined,
): string {
  switch (format) {
    case 'roman':
      return toRoman(value).toLowerCase();
    case 'romanUpper':
      return toRoman(value);
    case 'letter':
      return toAlpha(value).toLowerCase();
    case 'letterUpper':
      return toAlpha(value);
    default:
      return String(value);
  }
}

function toAlpha(value: number): string {
  let current = Math.max(1, value);
  let result = '';
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let remainder = Math.max(1, value);
  let result = '';
  for (const [amount, symbol] of numerals) {
    while (remainder >= amount) {
      result += symbol;
      remainder -= amount;
    }
  }
  return result;
}
