import type { Readable } from "node:stream";
import { parseTemplate } from "./template/parser.js";
import { PaperError } from "./errors.js";
import type { EngineMode } from "./engineMode.js";
import { isLiteBundle } from "./engineMode.js";
import { emitRenderabilityWarnings } from "./engine/renderabilityWarnings.js";
import { RenderContext, withContext } from "./renderContext.js";
import { isDeterministicMode, setDeterministicMode } from "./deterministicMode.js";
import { contextStorage, getActiveContext } from "./contextStorage.js";
import { flattenDocumentZIndex } from "./zIndex.js";
import type { LayoutNode, LayoutSlide } from "./layout/extract.js";
import type {
  ImageRenderOptions,
  PaperDocument,
  SlideImage,
  SvgRenderOptions,
  SlideSvg,
  ThemeColorScheme,
} from "./types/ast.js";
import { validateImageRenderOptions, LITE_IMAGE_MAX_WIDTH } from "./feature-gate.js";
import { getEngineMode, getLicenseKey } from "./engineMode.js";
import {
  assertQualityContract,
  buildQualityReport,
  type EngineQualityOptions,
  type PptxValidationMode,
  type RepairSummary,
  type QualityReport,
  type StructuralValidationSummary,
  type TemplatePreflightReport,
} from "./quality/report.js";
import { validatePptxStructure } from "./quality/structuralValidation.js";
import { repairPptxStructure, validateAndRepairPptx } from "./quality/repair.js";
import { analyzeDocumentCompatibility } from "./compatibility/pptxCompatibility.js";
import { validateDocument } from "./engine/documentValidation.js";
import type { PreviewRenderOptions } from "./engine/previewGenerator.js";
import { buildTemplatePreflightReport } from "./engine/templatePreflight.js";
import { normalizeRenderInput } from "./engine/inputNormalizer.js";
import { runEngineLayoutValidation } from "./engine/layoutValidator.js";
import { createLazyModuleLoader } from "./engine/lazyModules.js";
import { enforceLockedBrandPalette, type LockedBrandPalette } from "./locked-tokens.js";
import type { AccessibilityRemediationResult } from "./quality/accessibilityRemediation.js";
import type { AccessibilityReport } from "./quality/accessibilityValidator.js";
import type { EnginePdfRenderOptions } from "./converter/pptx-to-pdf.js";
import type {
  AgentLayoutValidationMode,
  AgentLayoutWarning,
} from "./interpreter/layout-validator.js";
export type { EnginePdfRenderOptions } from "./converter/pptx-to-pdf.js";
export type { SvgRenderOptions, SlideSvg } from "./types/ast.js";
export type { PptxInputWarning } from "./interpreter/relaxed-input.js";
export type { AgentLayoutValidationMode, AgentLayoutWarning } from "./interpreter/layout-validator.js";

export interface EngineRenderOptions extends EngineQualityOptions {
  /** Produce byte-reproducible output. Defaults to true; set false to retain wall-clock metadata. */
  deterministic?: boolean;
  onInputWarning?: (warning: import("./interpreter/relaxed-input.js").PptxInputWarning) => void;
  /**
   * Called for each pre-render layout warning (POTENTIAL_OVERFLOW / CLIP /
   * UNBREAKABLE_STRING / COLLISION) detected when input is an AgentDocument.
   */
  onLayoutWarning?: (warning: AgentLayoutWarning) => void;
  /**
   * Pre-render layout validation severity for AgentDocument inputs.
   *   - "warn"  (default) — log warnings via the configured logger.
   *   - "error" — throw AGENT_LAYOUT_VALIDATION_FAILED when any warning fires.
   *   - "off"   — skip validation entirely.
   */
  layoutValidation?: AgentLayoutValidationMode;
  signal?: AbortSignal;
  relaxed?: boolean;
  onProgress?: (slideIndex: number, totalSlides: number) => void;
  /**
   * Optional brand-palette lockdown. When set, the engine validates that
   * every color and font in the document is in the allowed sets BEFORE
   * rendering. Throws PaperError(code="LOCKED_TOKEN_VIOLATION") on the
   * first violation. Omit to disable the check (default).
   */
  lockedBrandPalette?: LockedBrandPalette;
}

export type { LockedBrandPalette } from "./locked-tokens.js";

/**
 * The public render input shape. Accepts either a fully-constructed
 * PaperDocument or an AgentDocument (auto-detected and compiled via
 * `compileAgentDocument`). `unknown` lets TypeScript callers pass raw
 * JSON without casting.
 */
export type RenderInput = PaperDocument | unknown;

function resolveRenderDoc(input: RenderInput, options?: EngineRenderOptions): PaperDocument {
  const doc = normalizeRenderInput(input, {
    onInputWarning: options?.onInputWarning,
    onLayoutWarning: options?.onLayoutWarning,
    layoutValidation: options?.layoutValidation,
    relaxed: options?.relaxed,
  });
  // Guard the document shape before anything walks it. `normalizeRenderInput`
  // returns non-agent input unchanged, so a string or a document with a
  // non-array `slides` reached `slides.flatMap` deep inside the interpreter and
  // escaped as a native TypeError — which carries no code and no remediation,
  // exactly the unactionable error R10 forbids. documentValidation.ts already
  // documents this intent for its own entry point; the render path lacked it.
  if (doc === null || typeof doc !== "object" || !Array.isArray((doc as PaperDocument).slides)) {
    throw new PaperError(
      "A document with a `slides` array is required.",
      { code: "VALIDATION_FAILED", phase: "validation" },
    );
  }

  // Agent compiler already runs the layout validator and marks the
  // document as validated; this call is a no-op in that path. For direct
  // PaperDocument inputs it runs the same check so both input shapes get
  // identical pre-render diagnostics.
  runEngineLayoutValidation(doc, {
    layoutValidation: options?.layoutValidation,
    onLayoutWarning: options?.onLayoutWarning,
  });
  // Route the silent-drop inventory into the caller's warning sink. Without
  // this the engine knows a property will not survive the writer and tells only
  // the log.
  if (options?.onInputWarning) {
    const sink = options.onInputWarning;
    emitRenderabilityWarnings(doc, (warning) => {
      sink({
        code: "PPTX_PROPERTY_NOT_RENDERED",
        message: warning.message,
        path: `${warning.nodePath}.${warning.propertyPath}`,
        from: warning.propertyPath,
      });
    });
  }
  if (options?.lockedBrandPalette) {
    enforceLockedBrandPalette(doc, options.lockedBrandPalette);
  }
  return doc;
}

export type PptxTemplateDocumentInput = Omit<PaperDocument, "template">;

class RenderMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new PaperError("Render cancelled before starting", {
        code: "RENDER_CANCELLED",
        phase: "validation",
      });
    }
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const activeContext = getActiveContext();
      const onAbort = () => {
        const index = this.queue.indexOf(resolveWrapper);
        if (index !== -1) this.queue.splice(index, 1);
        reject(new PaperError("Render cancelled while queued", {
          code: "RENDER_CANCELLED",
          phase: "validation",
        }));
      };
      const resolveWrapper = () => {
        signal?.removeEventListener("abort", onAbort);
        if (activeContext) {
          contextStorage.run(activeContext, resolve);
        } else {
          resolve();
        }
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.queue.push(resolveWrapper);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      try {
        next();
      } catch {
        this.locked = false;
      }
    } else {
      this.locked = false;
    }
  }
}

const renderMutex = new RenderMutex();

function attachTemplateBuffer(
  templateBuffer: Buffer,
  doc: PptxTemplateDocumentInput,
): PaperDocument {
  return {
    ...doc,
    template: templateBuffer,
  };
}

function assertSupportedValidationMode(validationMode: PptxValidationMode | undefined): void {
  if (validationMode !== "desktop_async" && validationMode !== "desktop_blocking") {
    return;
  }

  throw new PaperError(
    "Desktop validation requires an external PowerPoint oracle backend and is not available in the core engine runtime.",
    {
      code: "VALIDATION_BACKEND_UNAVAILABLE",
      phase: "validation",
    },
  );
}

interface RenderExecutionResult {
  pptx: Buffer;
  previews: Buffer[];
  layoutTrees: LayoutNode[];
  qualityReport: QualityReport;
}

async function renderLayoutPreviewsLazily(
  layoutTrees: LayoutNode[],
  previewOptions?: PreviewRenderOptions,
  themeColors?: ThemeColorScheme,
): Promise<Buffer[]> {
  const { renderLayoutPreviews } = await loadPreviewGeneratorModule();
  return renderLayoutPreviews(layoutTrees, previewOptions, themeColors);
}

const loadPreviewGeneratorModule = createLazyModuleLoader(
  () => import("./engine/previewGenerator.js"),
);

const loadArchiveAssemblerModule = createLazyModuleLoader(
  () => import("./engine/archiveAssembler.js"),
);

const loadLayoutModule = createLazyModuleLoader(
  () => import("./layout/index.js"),
);

const loadRendererModule = createLazyModuleLoader(
  () => import("./renderer/index.js"),
);

const loadSvgModule = createLazyModuleLoader(
  () => import("./svg/exporter.js"),
);

const loadTemplateMutatorModule = createLazyModuleLoader(
  () => import("./engine/templateMutator.js"),
);

const loadPdfConverterModule = createLazyModuleLoader(
  () => import("./converter/pptx-to-pdf.js"),
);

const loadOoxmlConstantsModule = createLazyModuleLoader(
  () => import("./ooxml/constants.js") as Promise<typeof import("./ooxml/constants.js")>,
);

const loadNodeStreamModule = createLazyModuleLoader(
  () => import("node:stream"),
);

const loadAccessibilityValidatorModule = createLazyModuleLoader(
  () => import("./quality/accessibilityValidator.js") as Promise<typeof import("./quality/accessibilityValidator.js")>,
);

const loadAccessibilityRemediationModule = createLazyModuleLoader(
  () => import("./quality/accessibilityRemediation.js") as Promise<typeof import("./quality/accessibilityRemediation.js")>,
);

async function loadSlideLayoutSize(doc: PaperDocument): Promise<{ layoutWidth: number; layoutHeight: number }> {
  const { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } = await loadOoxmlConstantsModule();
  return {
    layoutWidth: doc.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX,
    layoutHeight: doc.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX,
  };
}

function assertValidSlideLayoutSize(layoutWidth: number, layoutHeight: number): void {
  if (!Number.isFinite(layoutWidth) || layoutWidth <= 0 || layoutWidth > 40000) {
    throw new PaperError(
      `Invalid slide width: ${layoutWidth} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" },
    );
  }
  if (!Number.isFinite(layoutHeight) || layoutHeight <= 0 || layoutHeight > 40000) {
    throw new PaperError(
      `Invalid slide height: ${layoutHeight} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" },
    );
  }
}

function resolveSlideIndices(
  requestedSlides: number[] | undefined,
  slideCount: number,
): number[] {
  const slideIndices = requestedSlides ?? Array.from({ length: slideCount }, (_, i) => i);

  for (const idx of slideIndices) {
    if (idx < 0 || idx >= slideCount || !Number.isInteger(idx)) {
      throw new PaperError(
        `Invalid slide index: ${idx} (document has ${slideCount} slides)`,
        { code: "INVALID_SLIDE_INDEX", phase: "rendering" },
      );
    }
  }

  return slideIndices;
}

async function renderToImagesInternal(
  doc: PaperDocument,
  options?: ImageRenderOptions,
): Promise<SlideImage[]> {
  // Validate feature gating
  const mode = getEngineMode();
  validateImageRenderOptions(options, mode);

  // Validate and normalize document
  const validated = validateDocument(doc);
  const normalized = flattenDocumentZIndex(validated);

  const { layoutWidth, layoutHeight } = await loadSlideLayoutSize(normalized);
  assertValidSlideLayoutSize(layoutWidth, layoutHeight);

  const slideIndices = resolveSlideIndices(options?.slides, normalized.slides.length);
  if (slideIndices.length === 0) return [];

  // Compute render dimensions
  const aspectRatio = layoutWidth / layoutHeight;
  const defaultWidth = mode === "lite" ? LITE_IMAGE_MAX_WIDTH : 1920;
  const renderWidth = options?.width ?? defaultWidth;
  const renderHeight = options?.height ?? Math.round(renderWidth / aspectRatio);
  const scale = options?.scale ?? 1;

  // Load modules lazily
  const { runLayout } = await loadLayoutModule();
  const { renderSlideToImage } = await loadRendererModule();

  const themeColors = normalized.theme?.colorScheme;
  const images: SlideImage[] = [];

  for (const slideIndex of slideIndices) {
    // Check cancellation
    if (options?.signal?.aborted) {
      throw new PaperError("Render cancelled", {
        code: "RENDER_CANCELLED",
        phase: "rendering",
      });
    }

    const slide = normalized.slides[slideIndex];
    const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);

    const image = await renderSlideToImage(layoutTree, slideIndex, {
      width: renderWidth,
      height: renderHeight,
      scale,
      format: options?.format,
      quality: options?.quality,
      backgroundOverride: options?.background,
      themeColors,
    });

    if (!image) {
      throw new PaperError(
        "Slide-to-image rendering requires @napi-rs/canvas. Install it with: npm install @napi-rs/canvas",
        { code: "CANVAS_UNAVAILABLE", phase: "rendering" },
      );
    }

    images.push(image);
    options?.onProgress?.(slideIndex, normalized.slides.length);
  }

  return images;
}

async function renderToSvgInternal(
  doc: PaperDocument,
  options?: SvgRenderOptions,
): Promise<SlideSvg[]> {
  const validated = validateDocument(doc);
  const normalized = flattenDocumentZIndex(validated);

  const { layoutWidth, layoutHeight } = await loadSlideLayoutSize(normalized);
  assertValidSlideLayoutSize(layoutWidth, layoutHeight);

  const slideIndices = resolveSlideIndices(options?.slides, normalized.slides.length);
  if (slideIndices.length === 0) return [];

  const aspectRatio = layoutWidth / layoutHeight;
  const renderWidth = options?.width ?? (options?.height !== undefined ? Math.round(options.height * aspectRatio) : layoutWidth);
  const renderHeight = options?.height ?? (options?.width !== undefined ? Math.round(options.width / aspectRatio) : layoutHeight);
  const scale = options?.scale ?? 1;
  const themeColors = normalized.theme?.colorScheme;
  const { renderToSvgSlide } = await loadSvgModule();
  const { runLayout } = await loadLayoutModule();

  const svgs: SlideSvg[] = [];

  for (const slideIndex of slideIndices) {
    if (options?.signal?.aborted) {
      throw new PaperError("Render cancelled", {
        code: "RENDER_CANCELLED",
        phase: "rendering",
      });
    }

    const slide = normalized.slides[slideIndex];
    const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
    const svg = await renderToSvgSlide(layoutTree as LayoutSlide, slideIndex, {
      width: renderWidth,
      height: renderHeight,
      scale,
      background: options?.background,
      themeColors,
    });

    svgs.push(svg);
    options?.onProgress?.(slideIndex, normalized.slides.length);
  }

  return svgs;
}

async function renderDocumentInternal(
  doc: PaperDocument,
  includePreviews: boolean,
  previewOptions?: PreviewRenderOptions,
  options?: EngineRenderOptions,
  enforceQualityContract = true,
): Promise<RenderExecutionResult> {
  const previousDeterministicMode = isDeterministicMode();
  setDeterministicMode(options?.deterministic !== false);
  try {
  let pptx: Buffer;
  let previews: Buffer[] = [];
  let layoutTrees: LayoutNode[];
  let compatibilityReport;
  let templateReport: TemplatePreflightReport | undefined;

  if (isLiteBundle() && doc.template) {
    throw new PaperError(
      "Template support is not bundled in the size-constrained lite build; import the full engine entry instead.",
      { code: "FEATURE_REQUIRES_UPGRADE", phase: "template" },
    );
  }

  if (enforceQualityContract && options?.outputMode === "strict_editable") {
    const compatibilityPrecheck = await analyzeDocumentCompatibility(doc);
    assertQualityContract(buildQualityReport(compatibilityPrecheck, options));
  }

  if (doc.template) {
    const { renderTemplateInternal } = await loadTemplateMutatorModule();
    const templateResult = await renderTemplateInternal(doc, options);
    pptx = templateResult.buffer;
    layoutTrees = templateResult.layoutTrees;
    compatibilityReport = templateResult.compatibilityReport;
    templateReport = templateResult.templateReport;

    if (includePreviews) {
      previews = await renderLayoutPreviewsLazily(layoutTrees, previewOptions, doc.theme?.colorScheme);
    }
  } else {
    const { buildArchive } = await loadArchiveAssemblerModule();
    const { archive, layoutTrees: builtLayoutTrees, compatibilityReport: builtCompatibilityReport } = await buildArchive(
      doc,
      options,
    );
    layoutTrees = builtLayoutTrees;
    compatibilityReport = builtCompatibilityReport;

    const thumbnailPromise = renderLayoutPreviewsLazily(
      layoutTrees.slice(0, 1),
      { width: 256, height: 192, scale: 1, format: "jpeg", quality: 78 },
      doc.theme?.colorScheme,
    );

    if (includePreviews) {
      const [thumbnailBuffers, previewBuffers] = await Promise.all([
        thumbnailPromise,
        renderLayoutPreviewsLazily(layoutTrees, previewOptions, doc.theme?.colorScheme),
      ]);
      const thumbnail = thumbnailBuffers[0];
      if (thumbnail) {
        archive.setThumbnail(thumbnail);
      }
      previews = previewBuffers;
      pptx = await archive.generateBuffer();
    } else {
      const thumbnailBuffers = await thumbnailPromise;
      const thumbnail = thumbnailBuffers[0];
      if (thumbnail) {
        archive.setThumbnail(thumbnail);
      }
      pptx = await archive.generateBuffer();
    }
  }

  let structuralValidation: StructuralValidationSummary | undefined;
  let repairSummary: RepairSummary | undefined;
  const shouldValidateStructurally =
    options?.validationMode === "structural" || options?.repairMode === "structural";

  if (shouldValidateStructurally) {
    if (options?.repairMode === "structural") {
      const repairResult = await validateAndRepairPptx(pptx);
      pptx = repairResult.buffer;
      structuralValidation = repairResult.finalValidation;
      repairSummary = repairResult.repairSummary;
    } else {
      structuralValidation = await validatePptxStructure(pptx);
    }
  }

  const qualityReport = buildQualityReport(compatibilityReport, options, {
    structuralValidation,
    templateReport,
    repairSummary,
  });
  if (enforceQualityContract) {
    assertQualityContract(qualityReport);
  }

  // Route the quality findings into the caller's warning sink.
  //
  // The report is built on every render and `render()` returned only the bytes,
  // so a deck whose font was substituted or whose body text overflowed its shape
  // reported success with nothing recorded — the engine knew, and told nobody.
  // `renderWithQualityReport` exposed the same findings, but a caller has no
  // reason to think the plain verb hides anything.
  //
  // `sharedCode` is the PPTX_-prefixed form, but `mapSharedCode` deliberately
  // returns undefined for the font findings — they are pptx-specific and have no
  // cross-format equivalent. They are still fidelity losses, so the finding's own
  // code is used as the fallback and the taxonomy aliases the short vocabulary.
  if (options?.onInputWarning) {
    const sink = options.onInputWarning;
    for (const finding of qualityReport.findings) {
      sink({
        code: finding.sharedCode ?? finding.code,
        message: finding.message,
        path: finding.componentPath
          ?? (finding.slideIndex === undefined ? "document" : `slides[${String(finding.slideIndex)}]`),
      });
    }
  }

  return {
    pptx,
    previews,
    layoutTrees,
    qualityReport,
  };
  } finally {
    setDeterministicMode(previousDeterministicMode);
  }
}

/**
 * The module-level PaperEngine.
 *
 * Every method uses the ambient `RenderContext` (from `AsyncLocalStorage`
 * via `contextStorage.run`) when one is set, and falls back to a shared
 * default context when none is. The shared default is convenient for
 * one-off scripts and tests, but for SaaS / concurrent / multi-document
 * callers prefer {@link createEngine} — each instance gets its own
 * `RenderContext` so per-call state (font caches, chart-asset counters,
 * media dedup tables) cannot leak between calls. Without isolation,
 * back-to-back `PaperEngine.render` invocations on chart-heavy decks
 * can produce divergent output even with `setDeterministicMode(true)`.
 *
 * See `tests/determinismInvariant.test.ts` and
 * `tests/concurrentRenderSafety.test.ts` for the invariants this contract
 * guarantees when `createEngine` is used.
 */
export const PaperEngine = {
  async preflight(input: RenderInput, options?: EngineRenderOptions): Promise<QualityReport> {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      const validated = validateDocument(doc, options);
      const normalized = flattenDocumentZIndex(validated);
      const result = await renderDocumentInternal(normalized, false, undefined, options, false);
      return result.qualityReport;
    } finally {
      renderMutex.release();
    }
  },

  async validate(buffer: Buffer) {
    return validatePptxStructure(buffer);
  },

  async repair(buffer: Buffer) {
    return repairPptxStructure(buffer);
  },

  async validateAndRepair(buffer: Buffer) {
    return validateAndRepairPptx(buffer);
  },

  /**
   * Render a document to a PPTX Buffer.
   *
   * Accepts either a `PaperDocument` or an `AgentDocument`; agent inputs
   * are auto-detected and compiled via `compileAgentDocument`.
   *
   * For concurrent or SaaS use, call this via {@link createEngine} so
   * each render gets its own `RenderContext`. Direct invocation here
   * uses the shared default context.
   */
  async render(input: RenderInput, options?: EngineRenderOptions): Promise<Buffer> {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      const result = await renderDocumentInternal(doc, false, undefined, options);
      return result.pptx;
    } finally {
      renderMutex.release();
    }
  },

  async renderStream(input: RenderInput, options?: EngineRenderOptions): Promise<Readable> {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      const result = await renderDocumentInternal(doc, false, undefined, options);
      const { Readable: ReadableStream } = await loadNodeStreamModule();
      return ReadableStream.from(result.pptx);
    } finally {
      renderMutex.release();
    }
  },

  async renderWithQualityReport(
    input: RenderInput,
    previewOptions?: PreviewRenderOptions,
    options?: EngineRenderOptions,
  ): Promise<RenderExecutionResult> {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      return await renderDocumentInternal(doc, false, previewOptions, options);
    } finally {
      renderMutex.release();
    }
  },

  async renderWithPreviews(
    input: RenderInput,
    previewOptions?: PreviewRenderOptions,
    options?: EngineRenderOptions,
  ): Promise<{ pptx: Buffer; previews: Buffer[]; layoutTrees: LayoutNode[]; qualityReport: QualityReport }> {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      return await renderDocumentInternal(doc, true, previewOptions, options);
    } finally {
      renderMutex.release();
    }
  },

  async renderToImages(
    input: RenderInput,
    options?: ImageRenderOptions,
  ): Promise<SlideImage[]> {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options as EngineRenderOptions | undefined);
      return await renderToImagesInternal(doc, options);
    } finally {
      renderMutex.release();
    }
  },

  async renderToImage(
    input: RenderInput,
    slideIndex: number,
    options?: Omit<ImageRenderOptions, "slides" | "onProgress">,
  ): Promise<SlideImage> {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options as EngineRenderOptions | undefined);
      const results = await renderToImagesInternal(doc, {
        ...options,
        slides: [slideIndex],
      });
      return results[0];
    } finally {
      renderMutex.release();
    }
  },

  async renderToSvgSlides(
    input: RenderInput,
    options?: SvgRenderOptions,
  ): Promise<SlideSvg[]> {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options as EngineRenderOptions | undefined);
      return await renderToSvgInternal(doc, options);
    } finally {
      renderMutex.release();
    }
  },

  async renderToSvgSlide(
    input: RenderInput,
    slideIndex: number,
    options?: Omit<SvgRenderOptions, "slides" | "onProgress">,
  ): Promise<SlideSvg> {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options as EngineRenderOptions | undefined);
      const results = await renderToSvgInternal(doc, {
        ...options,
        slides: [slideIndex],
      });
      return results[0];
    } finally {
      renderMutex.release();
    }
  },

  async renderToPdf(
    input: RenderInput,
    options?: EnginePdfRenderOptions,
  ): Promise<Buffer> {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options as EngineRenderOptions | undefined);
      const { renderDocumentToPdf } = await loadPdfConverterModule();
      return await renderDocumentToPdf(doc, options);
    } finally {
      renderMutex.release();
    }
  },

  async populatePptxTemplate(
    templateBuffer: Buffer,
    doc: PptxTemplateDocumentInput,
    options?: EngineRenderOptions,
  ): Promise<Buffer> {
    return this.render(attachTemplateBuffer(templateBuffer, doc), options);
  },

  async populatePptxTemplateToPdf(
    templateBuffer: Buffer,
    doc: PptxTemplateDocumentInput,
    options?: EnginePdfRenderOptions,
  ): Promise<Buffer> {
    return this.renderToPdf(attachTemplateBuffer(templateBuffer, doc), options);
  },

  async validateAccessibility(input: RenderInput): Promise<AccessibilityReport> {
    if (isLiteBundle()) {
      throw new PaperError(
        "Accessibility validation is not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",
        { code: "FEATURE_REQUIRES_UPGRADE", phase: "validation" },
      );
    }
    const doc = resolveRenderDoc(input);
    const validated = validateDocument(doc);
    const { validateAccessibility: runValidation } = await loadAccessibilityValidatorModule();
    return runValidation(validated);
  },

  async remediateAccessibility(input: RenderInput): Promise<AccessibilityRemediationResult> {
    if (isLiteBundle()) {
      throw new PaperError(
        "Accessibility remediation is not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",
        { code: "FEATURE_REQUIRES_UPGRADE", phase: "validation" },
      );
    }
    const doc = resolveRenderDoc(input);
    const validated = validateDocument(doc);
    const { remediateAccessibility: runRemediation } = await loadAccessibilityRemediationModule();
    return runRemediation(validated);
  },
};

// ---------------------------------------------------------------------------
// Factory for mode-aware engine instances (used by @runstamp/lite)
// ---------------------------------------------------------------------------

export interface CreateEngineOptions {
  mode?: EngineMode;
  /** Ed25519-signed license key. Falls back to RUNSTAMP_LICENSE_KEY env var. */
  licenseKey?: string;
}

/**
 * Create a PaperEngine instance bound to a specific mode.
 *
 * - `"pro"` (default with valid license): All features enabled — templates,
 *   advanced charts, HarfBuzz shaping, canvas preview, ghostGrid, autoFit.
 * - `"lite"` (default without license): Subset mode — no templates, 6 basic
 *   chart types, fontkit-only shaping, no canvas renderer.
 *
 * If a license key is provided (or found in RUNSTAMP_LICENSE_KEY), the engine
 * validates it and activates pro mode. Invalid/expired keys fall back to lite
 * with a console warning.
 */
export function createEngine(opts?: CreateEngineOptions) {
  const explicitMode = opts?.mode;
  let mode: EngineMode = explicitMode ?? "lite";
  const key = opts?.licenseKey ?? process.env.RUNSTAMP_LICENSE_KEY;

  // The full engine is the default; only an explicit `mode: "lite"` selects the
  // size-constrained code paths. Nothing here depends on a licence.
  if (explicitMode !== "lite") {
    mode = "pro";
  }

  return {
    async render(input: RenderInput, options?: EngineRenderOptions): Promise<Buffer> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.render(input, options));
    },

    async renderStream(input: RenderInput, options?: EngineRenderOptions): Promise<Readable> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderStream(input, options));
    },

    async renderToImages(input: RenderInput, options?: ImageRenderOptions): Promise<SlideImage[]> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToImages(input, options));
    },

    async renderToImage(input: RenderInput, slideIndex: number, options?: Omit<ImageRenderOptions, "slides" | "onProgress">): Promise<SlideImage> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToImage(input, slideIndex, options));
    },

    async renderToSvgSlides(input: RenderInput, options?: SvgRenderOptions): Promise<SlideSvg[]> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToSvgSlides(input, options));
    },

    async renderToSvgSlide(input: RenderInput, slideIndex: number, options?: Omit<SvgRenderOptions, "slides" | "onProgress">): Promise<SlideSvg> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToSvgSlide(input, slideIndex, options));
    },

    async renderToPdf(input: RenderInput, options?: EnginePdfRenderOptions): Promise<Buffer> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToPdf(input, options));
    },

    async populatePptxTemplate(
      templateBuffer: Buffer,
      doc: PptxTemplateDocumentInput,
      options?: EngineRenderOptions,
    ): Promise<Buffer> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.populatePptxTemplate(templateBuffer, doc, options));
    },

    async populatePptxTemplateToPdf(
      templateBuffer: Buffer,
      doc: PptxTemplateDocumentInput,
      options?: EnginePdfRenderOptions,
    ): Promise<Buffer> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.populatePptxTemplateToPdf(templateBuffer, doc, options));
    },

    async validateAccessibility(input: RenderInput): Promise<AccessibilityReport> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.validateAccessibility(input));
    },

    async remediateAccessibility(input: RenderInput): Promise<AccessibilityRemediationResult> {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.remediateAccessibility(input));
    },
  };
}
