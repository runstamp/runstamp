import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  LITE_IMAGE_MAX_WIDTH,
  analyzeDocumentCompatibility,
  resolveChartAnnotations,
  validateImageRenderOptions
} from "./chunk-Z2EIZERW.js";
import {
  computeClassicChartLayout
} from "./chunk-JRK4KXDV.js";
import {
  flattenDocumentZIndex,
  validateDocument
} from "./chunk-XVSKCRKS.js";
import {
  compileAgentDocument,
  runEngineLayoutValidation
} from "./chunk-GWTKZPGY.js";
import {
  computePolicyAutoFit,
  hasUnbreakableTextSegment
} from "./chunk-AIRKBIKH.js";
import {
  emitRenderabilityWarnings
} from "./chunk-MVPJ57UB.js";
import {
  assertQualityContract,
  buildQualityReport,
  repairPptxStructure,
  validateAndRepairPptx,
  validatePptxStructure
} from "./chunk-NK2A5B54.js";
import {
  ZodError
} from "./chunk-3VBGXE67.js";
import {
  FontBridgeManager,
  planTableLayout
} from "./chunk-IC35FUMW.js";
import {
  createInheritedDeterministicModeManager,
  isDeterministicMode,
  setDeterministicMode
} from "./chunk-RQNEGT4U.js";
import {
  calculateRichTextMetrics
} from "./chunk-7BYJLCSM.js";
import {
  KnuthPlassConfig,
  getEngineMode,
  isLiteBundle
} from "./chunk-DX2BYFTQ.js";
import {
  FontCacheManager,
  HarfBuzzManager,
  resolveLineHeightPixels
} from "./chunk-IQGCGBYO.js";
import {
  LoggerManager,
  _storage,
  getActiveContext
} from "./chunk-MV7M6AY2.js";
import {
  PaperError
} from "./chunk-SFVKAOLH.js";

// src/types/ast.ts
function assertNever(x) {
  throw new Error(`Unhandled PaperNode type: ${x.type}`);
}
function traverseAST(node) {
  switch (node.type) {
    case "View":
      node.children?.forEach(traverseAST);
      break;
    case "Text":
      break;
    case "Image":
      break;
    case "Table":
      break;
    case "Chart":
      break;
    case "Group":
      node.children.forEach(traverseAST);
      break;
    case "Connector":
      break;
    case "Video":
      break;
    case "Audio":
      break;
    default:
      assertNever(node);
  }
}

// src/renderContext.ts
var RenderContext = class {
  engineMode;
  licenseKey;
  logger;
  deterministicMode;
  fontCache;
  harfBuzz;
  knuthPlass;
  fontBridge;
  constructor(opts) {
    this.engineMode = opts?.engineMode ?? "full";
    this.licenseKey = opts?.licenseKey;
    this.logger = opts?.logger ?? new LoggerManager();
    this.deterministicMode = opts?.deterministicMode ?? createInheritedDeterministicModeManager();
    this.fontCache = opts?.fontCache ?? new FontCacheManager();
    this.harfBuzz = opts?.harfBuzz ?? new HarfBuzzManager();
    this.knuthPlass = opts?.knuthPlass ?? new KnuthPlassConfig();
    this.fontBridge = opts?.fontBridge ?? new FontBridgeManager();
  }
};
function withContext(ctx, fn) {
  return _storage.run(ctx, fn);
}

// src/locked-tokens.ts
var HEX_RE = /#?([0-9A-Fa-f]{6})/;
function normalizeHex(input) {
  const m = HEX_RE.exec(input);
  return m ? m[1].toUpperCase() : void 0;
}
function colorAllowed(value, palette) {
  const hex = normalizeHex(value);
  if (!hex) return true;
  return palette.allowedColors.has(hex);
}
function fontAllowed(value, palette) {
  if (palette.allowedFonts.has(value)) return true;
  for (const f of palette.allowedFonts) {
    if (value === f || value.startsWith(f) || f.startsWith(value)) return true;
  }
  return false;
}
function fail(message, opts) {
  throw new PaperError(message, {
    code: "LOCKED_TOKEN_VIOLATION",
    phase: "validation",
    slideIndex: opts.slideIndex,
    path: opts.field.split("."),
    issues: [{ path: opts.field, message, received: opts.value }],
    remediation: `Replace "${opts.value}" with a value from the brand kit, or remove the lockedBrandPalette option to skip this check.`
  });
}
function checkStyleColors(style, slideIndex, palette, ctx) {
  if (!style) return;
  for (const key of ["color", "backgroundColor", "borderColor"]) {
    const v = style[key];
    if (typeof v === "string" && !colorAllowed(v, palette)) {
      fail(
        `Locked-token violation on slide ${slideIndex}: ${ctx}.${key} = "${v}" is not in the allowed palette`,
        { slideIndex, field: `${ctx}.${key}`, value: v }
      );
    }
  }
  const fill = style.fill;
  if (typeof fill === "string" && !colorAllowed(fill, palette)) {
    fail(
      `Locked-token violation on slide ${slideIndex}: ${ctx}.fill = "${fill}" is not in the allowed palette`,
      { slideIndex, field: `${ctx}.fill`, value: fill }
    );
  } else if (fill && typeof fill === "object") {
    const f = fill;
    if (typeof f.color === "string" && !colorAllowed(f.color, palette)) {
      fail(
        `Locked-token violation on slide ${slideIndex}: ${ctx}.fill.color = "${f.color}" is not in the allowed palette`,
        { slideIndex, field: `${ctx}.fill.color`, value: f.color }
      );
    }
    for (const [i, stop] of (f.stops ?? []).entries()) {
      if (typeof stop?.color === "string" && !colorAllowed(stop.color, palette)) {
        fail(
          `Locked-token violation on slide ${slideIndex}: ${ctx}.fill.stops[${i}].color = "${stop.color}" is not in the allowed palette`,
          { slideIndex, field: `${ctx}.fill.stops[${i}].color`, value: stop.color }
        );
      }
    }
  }
}
function checkStyleFont(style, slideIndex, palette, ctx) {
  if (!style) return;
  const v = style.fontFamily;
  if (typeof v === "string" && !fontAllowed(v, palette)) {
    fail(
      `Locked-token violation on slide ${slideIndex}: ${ctx}.fontFamily = "${v}" is not in the allowed font set`,
      { slideIndex, field: `${ctx}.fontFamily`, value: v }
    );
  }
}
function checkNode(node, slideIndex, palette, ctx) {
  const style = node.style;
  checkStyleColors(style, slideIndex, palette, ctx);
  checkStyleFont(style, slideIndex, palette, ctx);
  const textStyle = node.textStyle;
  checkStyleColors(textStyle, slideIndex, palette, `${ctx}.textStyle`);
  checkStyleFont(textStyle, slideIndex, palette, `${ctx}.textStyle`);
  const t = node.type;
  if (t === "Table") {
    const td = node.tableData;
    for (const [r, row] of (td?.rows ?? []).entries()) {
      for (const [c, cell] of (row?.cells ?? []).entries()) {
        checkStyleColors(cell?.style, slideIndex, palette, `${ctx}.table[${r}][${c}]`);
        checkStyleFont(cell?.style, slideIndex, palette, `${ctx}.table[${r}][${c}]`);
      }
    }
  } else if (t === "Chart") {
    const cd = node.chartData;
    for (const [i, s] of (cd?.series ?? []).entries()) {
      if (typeof s?.color === "string" && !colorAllowed(s.color, palette)) {
        fail(
          `Locked-token violation on slide ${slideIndex}: ${ctx}.chart.series[${i}].color = "${s.color}" is not in the allowed palette`,
          { slideIndex, field: `${ctx}.chart.series[${i}].color`, value: s.color }
        );
      }
    }
  } else if (t === "Text") {
    for (const p of node.paragraphs ?? []) {
      for (const [ri, r] of (p?.runs ?? []).entries()) {
        checkStyleColors(r?.style, slideIndex, palette, `${ctx}.run[${ri}]`);
        checkStyleFont(r?.style, slideIndex, palette, `${ctx}.run[${ri}]`);
      }
    }
  }
}
function checkSlide(slide, index, palette) {
  const bg = slide.background;
  if (bg?.type === "solid" && typeof bg.color === "string" && !colorAllowed(bg.color, palette)) {
    fail(
      `Locked-token violation on slide ${index}: background = "${bg.color}" is not in the allowed palette`,
      { slideIndex: index, field: "slide.background", value: bg.color }
    );
  }
  if (bg?.type === "gradient") {
    for (const [i, stop] of (bg.stops ?? []).entries()) {
      if (typeof stop?.color === "string" && !colorAllowed(stop.color, palette)) {
        fail(
          `Locked-token violation on slide ${index}: gradient stop[${i}] = "${stop.color}" is not in the allowed palette`,
          { slideIndex: index, field: `slide.background.stop[${i}]`, value: stop.color }
        );
      }
    }
  }
  for (const [i, child] of (slide.children ?? []).entries()) {
    checkNode(child, index, palette, `node[${i}]`);
  }
}
function enforceLockedBrandPalette(doc, palette) {
  for (const [i, slide] of doc.slides.entries()) {
    checkSlide(slide, i + 1, palette);
  }
}

// src/engine/inputNormalizer.ts
function isAgentDocumentShape(input) {
  if (input === null || typeof input !== "object") return false;
  const obj = input;
  if (obj.type === "presentation") return true;
  const slides = obj.slides;
  if (Array.isArray(slides) && slides.length > 0) {
    const first = slides[0];
    if (first !== null && typeof first === "object" && "pattern" in first) {
      return true;
    }
  }
  return false;
}
function remediationForZodIssue(issue) {
  const dotted = issue.path.map((p) => String(p)).join(".") || "<root>";
  switch (issue.code) {
    case "invalid_type":
      return `Check that '${dotted}' matches the expected type. Run the input through AgentDocumentSchema to see the expected shape.`;
    case "invalid_literal":
      return `Value at '${dotted}' must match the required literal. See AgentDocumentSchema for allowed values.`;
    case "invalid_enum_value":
    case "invalid_union_discriminator":
      return `Value at '${dotted}' must be one of the enum options. Common fix: check spelling and casing against the schema.`;
    case "invalid_union":
      return `Value at '${dotted}' did not match any option in a union. Check the discriminator field and ensure nested fields match that variant.`;
    case "unrecognized_keys":
      return `Unknown key(s) at '${dotted}'. Remove them or confirm the schema field name.`;
    case "too_small":
    case "too_big":
      return `Value at '${dotted}' is out of the allowed range. See the schema bounds.`;
    case "custom":
      return issue.message;
    default:
      return `Fix the value at '${dotted}' and re-run. See https://runstamp.com/docs/schemas for the AgentDocument schema.`;
  }
}
function zodIssuesToPaperIssues(err) {
  return err.issues.map((issue) => {
    const path = issue.path.map((p) => String(p)).join(".") || "<root>";
    const entry = {
      path,
      code: issue.code,
      message: issue.message,
      remediation: remediationForZodIssue(issue)
    };
    const anyIssue = issue;
    if (typeof anyIssue.expected === "string") entry.expected = anyIssue.expected;
    if (typeof anyIssue.received === "string") entry.received = anyIssue.received;
    return entry;
  });
}
function normalizeRenderInput(input, options) {
  if (!isAgentDocumentShape(input)) {
    return input;
  }
  try {
    return compileAgentDocument(input, {
      onInputWarning: options?.onInputWarning,
      onLayoutWarning: options?.onLayoutWarning,
      layoutValidation: options?.layoutValidation,
      relaxed: options?.relaxed
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = zodIssuesToPaperIssues(err);
      const first = issues[0];
      const pathArr = first?.path ? first.path.split(".").filter((p) => p.length > 0) : void 0;
      const headline = first ? `AgentDocument validation failed (${err.issues.length} issue${err.issues.length === 1 ? "" : "s"}): ${first.message} at '${first.path}'` : `AgentDocument validation failed (${err.issues.length} issues).`;
      throw new PaperError(headline, {
        code: "AGENT_INPUT_INVALID",
        phase: "compilation",
        path: pathArr,
        remediation: first?.remediation ?? "Run the input through AgentDocumentSchema to see the expected shape.",
        issues,
        cause: err
      });
    }
    if (err instanceof PaperError) throw err;
    throw new PaperError(
      err instanceof Error ? err.message : "AgentDocument compilation failed.",
      {
        code: "AGENT_INPUT_INVALID",
        phase: "compilation",
        remediation: "AgentDocument compilation threw a non-Zod error. See `cause` for the underlying exception.",
        cause: err
      }
    );
  }
}

// src/engine/lazyModules.ts
function createLazyModuleLoader(importModule) {
  let modulePromise;
  return () => {
    if (!modulePromise) {
      modulePromise = importModule().catch((error) => {
        modulePromise = void 0;
        throw error;
      });
    }
    return modulePromise;
  };
}

// src/engine.ts
function resolveRenderDoc(input, options) {
  const doc = normalizeRenderInput(input, {
    onInputWarning: options?.onInputWarning,
    onLayoutWarning: options?.onLayoutWarning,
    layoutValidation: options?.layoutValidation,
    relaxed: options?.relaxed
  });
  if (doc === null || typeof doc !== "object" || !Array.isArray(doc.slides)) {
    throw new PaperError(
      "A document with a `slides` array is required.",
      { code: "VALIDATION_FAILED", phase: "validation" }
    );
  }
  runEngineLayoutValidation(doc, {
    layoutValidation: options?.layoutValidation,
    onLayoutWarning: options?.onLayoutWarning
  });
  if (options?.onInputWarning) {
    const sink = options.onInputWarning;
    emitRenderabilityWarnings(doc, (warning) => {
      sink({
        code: "PPTX_PROPERTY_NOT_RENDERED",
        message: warning.message,
        path: `${warning.nodePath}.${warning.propertyPath}`,
        from: warning.propertyPath
      });
    });
  }
  if (options?.lockedBrandPalette) {
    enforceLockedBrandPalette(doc, options.lockedBrandPalette);
  }
  return doc;
}
var RenderMutex = class {
  queue = [];
  locked = false;
  async acquire(signal) {
    if (signal?.aborted) {
      throw new PaperError("Render cancelled before starting", {
        code: "RENDER_CANCELLED",
        phase: "validation"
      });
    }
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise((resolve, reject) => {
      const activeContext = getActiveContext();
      const onAbort = () => {
        const index = this.queue.indexOf(resolveWrapper);
        if (index !== -1) this.queue.splice(index, 1);
        reject(new PaperError("Render cancelled while queued", {
          code: "RENDER_CANCELLED",
          phase: "validation"
        }));
      };
      const resolveWrapper = () => {
        signal?.removeEventListener("abort", onAbort);
        if (activeContext) {
          _storage.run(activeContext, resolve);
        } else {
          resolve();
        }
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.queue.push(resolveWrapper);
    });
  }
  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      try {
        next();
      } catch {
        this.locked = false;
      }
    } else {
      this.locked = false;
    }
  }
};
var renderMutex = new RenderMutex();
function attachTemplateBuffer(templateBuffer, doc) {
  return {
    ...doc,
    template: templateBuffer
  };
}
function assertSupportedValidationMode(validationMode) {
  if (validationMode !== "desktop_async" && validationMode !== "desktop_blocking") {
    return;
  }
  throw new PaperError(
    "Desktop validation requires an external PowerPoint oracle backend and is not available in the core engine runtime.",
    {
      code: "VALIDATION_BACKEND_UNAVAILABLE",
      phase: "validation"
    }
  );
}
async function renderLayoutPreviewsLazily(layoutTrees, previewOptions, themeColors) {
  const { renderLayoutPreviews } = await loadPreviewGeneratorModule();
  return renderLayoutPreviews(layoutTrees, previewOptions, themeColors);
}
var loadPreviewGeneratorModule = createLazyModuleLoader(
  () => import("./engine/previewGenerator.js")
);
var loadArchiveAssemblerModule = createLazyModuleLoader(
  () => import("./engine/archiveAssembler.js")
);
var loadLayoutModule = createLazyModuleLoader(
  () => import("./layout/index.js")
);
var loadRendererModule = createLazyModuleLoader(
  () => import("./renderer/index.js")
);
var loadSvgModule = createLazyModuleLoader(
  () => import("./svg/exporter.js")
);
var loadTemplateMutatorModule = createLazyModuleLoader(
  () => import("./engine/templateMutator.js")
);
var loadPdfConverterModule = createLazyModuleLoader(
  () => import("./converter/pptx-to-pdf.js")
);
var loadOoxmlConstantsModule = createLazyModuleLoader(
  () => import("./constants-275BAFIR.js")
);
var loadNodeStreamModule = createLazyModuleLoader(
  () => import("node:stream")
);
var loadAccessibilityValidatorModule = createLazyModuleLoader(
  () => import("./accessibilityValidator-3JEASF6O.js")
);
var loadAccessibilityRemediationModule = createLazyModuleLoader(
  () => import("./accessibilityRemediation-CUNM3WQE.js")
);
async function loadSlideLayoutSize(doc) {
  const { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } = await loadOoxmlConstantsModule();
  return {
    layoutWidth: doc.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX,
    layoutHeight: doc.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX
  };
}
function assertValidSlideLayoutSize(layoutWidth, layoutHeight) {
  if (!Number.isFinite(layoutWidth) || layoutWidth <= 0 || layoutWidth > 4e4) {
    throw new PaperError(
      `Invalid slide width: ${layoutWidth} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" }
    );
  }
  if (!Number.isFinite(layoutHeight) || layoutHeight <= 0 || layoutHeight > 4e4) {
    throw new PaperError(
      `Invalid slide height: ${layoutHeight} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" }
    );
  }
}
function resolveSlideIndices(requestedSlides, slideCount) {
  const slideIndices = requestedSlides ?? Array.from({ length: slideCount }, (_, i) => i);
  for (const idx of slideIndices) {
    if (idx < 0 || idx >= slideCount || !Number.isInteger(idx)) {
      throw new PaperError(
        `Invalid slide index: ${idx} (document has ${slideCount} slides)`,
        { code: "INVALID_SLIDE_INDEX", phase: "rendering" }
      );
    }
  }
  return slideIndices;
}
async function renderToImagesInternal(doc, options) {
  const mode = getEngineMode();
  validateImageRenderOptions(options, mode);
  const validated = validateDocument(doc);
  const normalized = flattenDocumentZIndex(validated);
  const { layoutWidth, layoutHeight } = await loadSlideLayoutSize(normalized);
  assertValidSlideLayoutSize(layoutWidth, layoutHeight);
  const slideIndices = resolveSlideIndices(options?.slides, normalized.slides.length);
  if (slideIndices.length === 0) return [];
  const aspectRatio = layoutWidth / layoutHeight;
  const defaultWidth = mode === "lite" ? LITE_IMAGE_MAX_WIDTH : 1920;
  const renderWidth = options?.width ?? defaultWidth;
  const renderHeight = options?.height ?? Math.round(renderWidth / aspectRatio);
  const scale = options?.scale ?? 1;
  const { runLayout } = await loadLayoutModule();
  const { renderSlideToImage } = await loadRendererModule();
  const themeColors = normalized.theme?.colorScheme;
  const images = [];
  for (const slideIndex of slideIndices) {
    if (options?.signal?.aborted) {
      throw new PaperError("Render cancelled", {
        code: "RENDER_CANCELLED",
        phase: "rendering"
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
      themeColors
    });
    if (!image) {
      throw new PaperError(
        "Slide-to-image rendering requires @napi-rs/canvas. Install it with: npm install @napi-rs/canvas",
        { code: "CANVAS_UNAVAILABLE", phase: "rendering" }
      );
    }
    images.push(image);
    options?.onProgress?.(slideIndex, normalized.slides.length);
  }
  return images;
}
async function renderToSvgInternal(doc, options) {
  const validated = validateDocument(doc);
  const normalized = flattenDocumentZIndex(validated);
  const { layoutWidth, layoutHeight } = await loadSlideLayoutSize(normalized);
  assertValidSlideLayoutSize(layoutWidth, layoutHeight);
  const slideIndices = resolveSlideIndices(options?.slides, normalized.slides.length);
  if (slideIndices.length === 0) return [];
  const aspectRatio = layoutWidth / layoutHeight;
  const renderWidth = options?.width ?? (options?.height !== void 0 ? Math.round(options.height * aspectRatio) : layoutWidth);
  const renderHeight = options?.height ?? (options?.width !== void 0 ? Math.round(options.width / aspectRatio) : layoutHeight);
  const scale = options?.scale ?? 1;
  const themeColors = normalized.theme?.colorScheme;
  const { renderToSvgSlide } = await loadSvgModule();
  const { runLayout } = await loadLayoutModule();
  const svgs = [];
  for (const slideIndex of slideIndices) {
    if (options?.signal?.aborted) {
      throw new PaperError("Render cancelled", {
        code: "RENDER_CANCELLED",
        phase: "rendering"
      });
    }
    const slide = normalized.slides[slideIndex];
    const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
    const svg = await renderToSvgSlide(layoutTree, slideIndex, {
      width: renderWidth,
      height: renderHeight,
      scale,
      background: options?.background,
      themeColors
    });
    svgs.push(svg);
    options?.onProgress?.(slideIndex, normalized.slides.length);
  }
  return svgs;
}
async function renderDocumentInternal(doc, includePreviews, previewOptions, options, enforceQualityContract = true) {
  const previousDeterministicMode = isDeterministicMode();
  setDeterministicMode(options?.deterministic !== false);
  try {
    let pptx;
    let previews = [];
    let layoutTrees;
    let compatibilityReport;
    let templateReport;
    if (isLiteBundle() && doc.template) {
      throw new PaperError(
        "Template support is not bundled in the size-constrained lite build; import the full engine entry instead.",
        { code: "FEATURE_REQUIRES_UPGRADE", phase: "template" }
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
        options
      );
      layoutTrees = builtLayoutTrees;
      compatibilityReport = builtCompatibilityReport;
      const thumbnailPromise = renderLayoutPreviewsLazily(
        layoutTrees.slice(0, 1),
        { width: 256, height: 192, scale: 1, format: "jpeg", quality: 78 },
        doc.theme?.colorScheme
      );
      if (includePreviews) {
        const [thumbnailBuffers, previewBuffers] = await Promise.all([
          thumbnailPromise,
          renderLayoutPreviewsLazily(layoutTrees, previewOptions, doc.theme?.colorScheme)
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
    let structuralValidation;
    let repairSummary;
    const shouldValidateStructurally = options?.validationMode === "structural" || options?.repairMode === "structural";
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
      repairSummary
    });
    if (enforceQualityContract) {
      assertQualityContract(qualityReport);
    }
    if (options?.onInputWarning) {
      const sink = options.onInputWarning;
      for (const finding of qualityReport.findings) {
        sink({
          code: finding.sharedCode ?? finding.code,
          message: finding.message,
          path: finding.componentPath ?? (finding.slideIndex === void 0 ? "document" : `slides[${String(finding.slideIndex)}]`)
        });
      }
    }
    return {
      pptx,
      previews,
      layoutTrees,
      qualityReport
    };
  } finally {
    setDeterministicMode(previousDeterministicMode);
  }
}
var PaperEngine = {
  async preflight(input, options) {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      const validated = validateDocument(doc, options);
      const normalized = flattenDocumentZIndex(validated);
      const result = await renderDocumentInternal(normalized, false, void 0, options, false);
      return result.qualityReport;
    } finally {
      renderMutex.release();
    }
  },
  async validate(buffer) {
    return validatePptxStructure(buffer);
  },
  async repair(buffer) {
    return repairPptxStructure(buffer);
  },
  async validateAndRepair(buffer) {
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
  async render(input, options) {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      const result = await renderDocumentInternal(doc, false, void 0, options);
      return result.pptx;
    } finally {
      renderMutex.release();
    }
  },
  async renderStream(input, options) {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      const result = await renderDocumentInternal(doc, false, void 0, options);
      const { Readable: ReadableStream } = await loadNodeStreamModule();
      return ReadableStream.from(result.pptx);
    } finally {
      renderMutex.release();
    }
  },
  async renderWithQualityReport(input, previewOptions, options) {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      return await renderDocumentInternal(doc, false, previewOptions, options);
    } finally {
      renderMutex.release();
    }
  },
  async renderWithPreviews(input, previewOptions, options) {
    await renderMutex.acquire(options?.signal);
    try {
      assertSupportedValidationMode(options?.validationMode);
      const doc = resolveRenderDoc(input, options);
      return await renderDocumentInternal(doc, true, previewOptions, options);
    } finally {
      renderMutex.release();
    }
  },
  async renderToImages(input, options) {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options);
      return await renderToImagesInternal(doc, options);
    } finally {
      renderMutex.release();
    }
  },
  async renderToImage(input, slideIndex, options) {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options);
      const results = await renderToImagesInternal(doc, {
        ...options,
        slides: [slideIndex]
      });
      return results[0];
    } finally {
      renderMutex.release();
    }
  },
  async renderToSvgSlides(input, options) {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options);
      return await renderToSvgInternal(doc, options);
    } finally {
      renderMutex.release();
    }
  },
  async renderToSvgSlide(input, slideIndex, options) {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options);
      const results = await renderToSvgInternal(doc, {
        ...options,
        slides: [slideIndex]
      });
      return results[0];
    } finally {
      renderMutex.release();
    }
  },
  async renderToPdf(input, options) {
    await renderMutex.acquire(options?.signal);
    try {
      const doc = resolveRenderDoc(input, options);
      const { renderDocumentToPdf } = await loadPdfConverterModule();
      return await renderDocumentToPdf(doc, options);
    } finally {
      renderMutex.release();
    }
  },
  async populatePptxTemplate(templateBuffer, doc, options) {
    return this.render(attachTemplateBuffer(templateBuffer, doc), options);
  },
  async populatePptxTemplateToPdf(templateBuffer, doc, options) {
    return this.renderToPdf(attachTemplateBuffer(templateBuffer, doc), options);
  },
  async validateAccessibility(input) {
    if (isLiteBundle()) {
      throw new PaperError(
        "Accessibility validation is not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",
        { code: "FEATURE_REQUIRES_UPGRADE", phase: "validation" }
      );
    }
    const doc = resolveRenderDoc(input);
    const validated = validateDocument(doc);
    const { validateAccessibility: runValidation } = await loadAccessibilityValidatorModule();
    return runValidation(validated);
  },
  async remediateAccessibility(input) {
    if (isLiteBundle()) {
      throw new PaperError(
        "Accessibility remediation is not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",
        { code: "FEATURE_REQUIRES_UPGRADE", phase: "validation" }
      );
    }
    const doc = resolveRenderDoc(input);
    const validated = validateDocument(doc);
    const { remediateAccessibility: runRemediation } = await loadAccessibilityRemediationModule();
    return runRemediation(validated);
  }
};
function createEngine(opts) {
  const explicitMode = opts?.mode;
  let mode = explicitMode ?? "lite";
  const key = opts?.licenseKey ?? process.env.RUNSTAMP_LICENSE_KEY;
  if (explicitMode !== "lite") {
    mode = "pro";
  }
  return {
    async render(input, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.render(input, options));
    },
    async renderStream(input, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderStream(input, options));
    },
    async renderToImages(input, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToImages(input, options));
    },
    async renderToImage(input, slideIndex, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToImage(input, slideIndex, options));
    },
    async renderToSvgSlides(input, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToSvgSlides(input, options));
    },
    async renderToSvgSlide(input, slideIndex, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToSvgSlide(input, slideIndex, options));
    },
    async renderToPdf(input, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.renderToPdf(input, options));
    },
    async populatePptxTemplate(templateBuffer, doc, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.populatePptxTemplate(templateBuffer, doc, options));
    },
    async populatePptxTemplateToPdf(templateBuffer, doc, options) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.populatePptxTemplateToPdf(templateBuffer, doc, options));
    },
    async validateAccessibility(input) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.validateAccessibility(input));
    },
    async remediateAccessibility(input) {
      const ctx = new RenderContext({ engineMode: mode, licenseKey: key });
      return withContext(ctx, () => PaperEngine.remediateAccessibility(input));
    }
  };
}

// src/layout/chartDiagnostics.ts
var MIN_LEGEND_MARGIN = 6;
var CATEGORY_LABEL_WIDTH_FACTOR = 0.55;
var DATA_LABEL_MIN_SLOT_WIDTH = 18;
function absoluteRect(frame, box) {
  return {
    left: frame.left + box.left,
    top: frame.top + box.top,
    width: box.width,
    height: box.height
  };
}
function styleRect(style) {
  if (style?.position !== "absolute" || typeof style.left !== "number" || typeof style.top !== "number" || typeof style.width !== "number" || typeof style.height !== "number") {
    return null;
  }
  return { left: style.left, top: style.top, width: style.width, height: style.height };
}
function gapBetween(a, b, axis) {
  if (axis === "y") {
    if (a.top + a.height <= b.top) return b.top - (a.top + a.height);
    if (b.top + b.height <= a.top) return a.top - (b.top + b.height);
    return -1;
  }
  if (a.left + a.width <= b.left) return b.left - (a.left + a.width);
  if (b.left + b.width <= a.left) return a.left - (b.left + b.width);
  return -1;
}
function rectsOverlap(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}
function estimateTextWidth(text, fontSize) {
  return text.length * fontSize * CATEGORY_LABEL_WIDTH_FACTOR;
}
function categoryLabelRisk(chartData, plotArea) {
  if (!chartData.categories?.length || chartData.categoryAxis?.visible === false) return false;
  const slotWidth = plotArea.width / chartData.categories.length;
  const fontSize = chartData.categoryAxis?.labelFont?.fontSize ?? chartData.categoryAxis?.fontSize ?? 10;
  const rotation = Math.abs(chartData.categoryAxis?.labelRotation ?? 0);
  const rotationRelief = rotation >= 35 ? 1.8 : 1;
  return chartData.categories.some(
    (category) => estimateTextWidth(String(category), fontSize) > slotWidth * 1.35 * rotationRelief
  );
}
function dataLabelRisk(chartData, plotArea) {
  const chartLabels = chartData.dataLabels;
  const series = chartData.series ?? [];
  const hasLabels = Boolean(
    chartLabels?.showVal || chartLabels?.showCatName || chartLabels?.showSerName || series.some((item) => item.dataLabels?.showVal || item.dataLabels?.showCatName || item.dataLabels?.showSerName)
  );
  if (!hasLabels || series.length === 0) return false;
  const categories = Math.max(chartData.categories?.length ?? 0, Math.max(...series.map((item) => item.values.length), 0));
  if (categories === 0) return false;
  const slotWidth = plotArea.width / Math.max(1, categories * Math.max(1, series.length));
  const fontSize = chartLabels?.fontSize ?? 10;
  return slotWidth < Math.max(DATA_LABEL_MIN_SLOT_WIDTH, fontSize * 1.6);
}
function inferCategoryAxisBand(frame, plotArea, legendBox) {
  const bottomLimit = legendBox?.top ?? frame.top + frame.height;
  const top = plotArea.top + plotArea.height;
  const height = bottomLimit - top;
  if (height <= 4) return void 0;
  return {
    left: plotArea.left,
    top,
    width: plotArea.width,
    height
  };
}
function collectChartFitDiagnostics(chart, frameOverride) {
  const frame = frameOverride ?? styleRect(chart.style);
  if (!frame || frame.width <= 0 || frame.height <= 0) return void 0;
  const layout = computeClassicChartLayout(chart.chartData, { width: frame.width, height: frame.height });
  if (!layout) return void 0;
  const plotArea = absoluteRect(frame, layout.plotAreaPx);
  const legendBox = layout.legendBox ? absoluteRect(frame, layout.legendBox) : void 0;
  const titleBox = layout.titleBox ? absoluteRect(frame, layout.titleBox) : void 0;
  const categoryAxisBand = chart.chartData.chartType !== "pie" && chart.chartData.chartType !== "doughnut" ? inferCategoryAxisBand(frame, plotArea, legendBox) : void 0;
  const boxes = [{ kind: "plotArea", rect: plotArea, label: "plot" }];
  if (legendBox) boxes.push({ kind: "legend", rect: legendBox, label: "legend" });
  if (titleBox) boxes.push({ kind: "title", rect: titleBox, label: "title" });
  if (categoryAxisBand) boxes.push({ kind: "categoryAxisBand", rect: categoryAxisBand, label: "x-axis labels" });
  const resolved = resolveChartAnnotations(chart.chartData, {
    x: frame.left,
    y: frame.top,
    width: frame.width,
    height: frame.height
  });
  const annotationBoxes = resolved.labels.map((label) => {
    const style = label.style;
    if (typeof style?.left !== "number" || typeof style.top !== "number" || typeof style.width !== "number" || typeof style.height !== "number") {
      return null;
    }
    return {
      kind: "annotationLabel",
      rect: { left: style.left, top: style.top, width: style.width, height: style.height },
      label: typeof label.content === "string" ? label.content : "annotation"
    };
  }).filter((box) => box !== null);
  boxes.push(...annotationBoxes);
  const issues = [];
  const legendMarginRisk = Boolean(legendBox && (layout.legendPosition === "bottom" && (rectsOverlap(plotArea, legendBox) || categoryAxisBand !== void 0 && categoryAxisBand.height < MIN_LEGEND_MARGIN) || layout.legendPosition === "top" && gapBetween(legendBox, plotArea, "y") < MIN_LEGEND_MARGIN || (layout.legendPosition === "left" || layout.legendPosition === "right") && gapBetween(legendBox, plotArea, "x") < MIN_LEGEND_MARGIN));
  if (legendMarginRisk && legendBox) {
    issues.push({
      code: "CHART_LEGEND_COLLISION",
      message: "Chart legend has insufficient margin from the plot or category-axis label band.",
      rect: legendBox,
      relatedRect: categoryAxisBand ?? plotArea
    });
  }
  const labelCollisionRisk = categoryLabelRisk(chart.chartData, plotArea) || dataLabelRisk(chart.chartData, plotArea);
  if (labelCollisionRisk) {
    issues.push({
      code: "CHART_LABEL_COLLISION",
      message: "Chart labels are likely to collide or wrap because available slot width is too small.",
      rect: categoryAxisBand ?? plotArea,
      relatedRect: plotArea
    });
  }
  let annotationCollisionRisk = false;
  for (const annotation of annotationBoxes) {
    const hit = [legendBox, titleBox].some((box) => box && rectsOverlap(annotation.rect, box));
    if (hit) {
      annotationCollisionRisk = true;
      issues.push({
        code: "CHART_ANNOTATION_COLLISION",
        message: "Chart annotation label overlaps the title or legend area.",
        rect: annotation.rect,
        relatedRect: legendBox && rectsOverlap(annotation.rect, legendBox) ? legendBox : titleBox
      });
    }
  }
  return {
    chartType: chart.chartData.chartType,
    plotArea,
    legendBox,
    titleBox,
    categoryAxisBand,
    annotationBoxes,
    boxes,
    labelCollisionRisk,
    legendMarginRisk,
    annotationCollisionRisk,
    issues
  };
}

// src/layout/imageDiagnostics.ts
var CROP_VISIBLE_FRACTION_FLOOR = 0.35;
var CROP_EDGE_FLOOR = 38;
var UPSCALE_FACTOR_LIMIT = 1.75;
var ASPECT_RATIO_LIMIT = 0.28;
function dataUrlBytes(src) {
  const match = src.match(/^data:image\/[^;]+;base64,(.+)$/u);
  if (!match) return void 0;
  return Buffer.from(match[1], "base64");
}
function readPngSize(bytes) {
  if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
    return void 0;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    format: "png"
  };
}
function readJpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return void 0;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 255) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) return void 0;
    if (marker >= 192 && marker <= 195) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
        format: "jpeg"
      };
    }
    offset += 2 + length;
  }
  return void 0;
}
function imageSizeFromDataUrl(src) {
  const bytes = dataUrlBytes(src);
  if (!bytes) return void 0;
  return readPngSize(bytes) ?? readJpegSize(bytes);
}
function styleRect2(style) {
  if (style?.position !== "absolute" || typeof style.left !== "number" || typeof style.top !== "number" || typeof style.width !== "number" || typeof style.height !== "number") {
    return null;
  }
  return { left: style.left, top: style.top, width: style.width, height: style.height };
}
function collectImageFitDiagnostics(image, frameOverride) {
  const frame = frameOverride ?? styleRect2(image.style);
  if (!frame || frame.width <= 0 || frame.height <= 0) return void 0;
  const size = imageSizeFromDataUrl(image.src);
  const frameAspect = frame.width / frame.height;
  const sourceAspect = size ? size.width / size.height : void 0;
  const crop = {
    left: image.crop?.left ?? 0,
    top: image.crop?.top ?? 0,
    right: image.crop?.right ?? 0,
    bottom: image.crop?.bottom ?? 0,
    visibleFraction: Math.max(0, (100 - (image.crop?.left ?? 0) - (image.crop?.right ?? 0)) / 100) * Math.max(0, (100 - (image.crop?.top ?? 0) - (image.crop?.bottom ?? 0)) / 100)
  };
  const upscaleFactor = size ? Math.max(frame.width / Math.max(1, size.width), frame.height / Math.max(1, size.height)) : void 0;
  const likelyColorSwatch = Boolean(size && size.width === size.height && size.width <= 256 && !image.crop);
  const cropRisk = crop.visibleFraction < CROP_VISIBLE_FRACTION_FLOOR || Math.max(crop.left, crop.top, crop.right, crop.bottom) >= CROP_EDGE_FLOOR;
  const upscaleRisk = !likelyColorSwatch && upscaleFactor !== void 0 && upscaleFactor > UPSCALE_FACTOR_LIMIT;
  const aspectRisk = !likelyColorSwatch && sourceAspect !== void 0 && Math.abs(Math.log(frameAspect / sourceAspect)) > ASPECT_RATIO_LIMIT && !image.crop;
  const issues = [];
  if (cropRisk) {
    issues.push({
      code: "IMAGE_CROP_RISK",
      message: `Image crop leaves ${Math.round(crop.visibleFraction * 100)}% of the source visible.`,
      rect: frame
    });
  }
  if (upscaleRisk) {
    issues.push({
      code: "IMAGE_UPSCALE_RISK",
      message: `Image is scaled ${upscaleFactor?.toFixed(1)}x beyond source dimensions.`,
      rect: frame
    });
  }
  if (aspectRisk) {
    issues.push({
      code: "IMAGE_ASPECT_RISK",
      message: "Image frame aspect ratio differs materially from the source and no explicit crop is set.",
      rect: frame
    });
  }
  return {
    frame,
    sourceWidth: size?.width,
    sourceHeight: size?.height,
    sourceFormat: size?.format ?? "unknown",
    frameAspect,
    sourceAspect,
    crop,
    upscaleFactor,
    cropRisk,
    upscaleRisk,
    aspectRisk,
    issues
  };
}

// src/layout/absoluteSafety.ts
function hasChildren(node) {
  return "children" in node && Array.isArray(node.children);
}
function toTextRuns(value) {
  if (!value) return [];
  return typeof value === "string" ? [{ text: value }] : value;
}
function paragraphsToRuns(paragraphs) {
  const runs = [];
  paragraphs.forEach((paragraph, index) => {
    runs.push(...paragraph.runs);
    if (index < paragraphs.length - 1) {
      runs.push({ text: "\n" });
    }
  });
  return runs;
}
function extractTextPayload(node) {
  if (node.type === "Text") {
    const textNode = node;
    const runs = textNode.paragraphs ? paragraphsToRuns(textNode.paragraphs) : toTextRuns(textNode.content);
    return runs.length > 0 ? { runs, style: textNode.style, insets: textNode.style?.textInsets } : null;
  }
  if (node.type === "View") {
    const viewNode = node;
    const runs = viewNode.textParagraphs ? paragraphsToRuns(viewNode.textParagraphs) : toTextRuns(viewNode.textContent);
    const style = viewNode.textStyle;
    return runs.length > 0 ? { runs, style, insets: style?.textInsets } : null;
  }
  return null;
}
function getAbsoluteRect(node, origin) {
  const style = node.style;
  if (!style || style.position !== "absolute") {
    return null;
  }
  if (typeof style.left !== "number" || typeof style.top !== "number" || typeof style.width !== "number" || typeof style.height !== "number" || style.width <= 0 || style.height <= 0) {
    return null;
  }
  return {
    left: origin.x + style.left,
    top: origin.y + style.top,
    width: style.width,
    height: style.height
  };
}
function rectsOverlap2(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}
function rectContains(outer, inner) {
  return outer.left <= inner.left && outer.top <= inner.top && outer.left + outer.width >= inner.left + inner.width && outer.top + outer.height >= inner.top + inner.height;
}
function rectContainsWithTolerance(outer, inner, tolerance) {
  return outer.left <= inner.left + tolerance && outer.top <= inner.top + tolerance && outer.left + outer.width >= inner.left + inner.width - tolerance && outer.top + outer.height >= inner.top + inner.height - tolerance;
}
function overlapArea(a, b) {
  const horizontal = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const vertical = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return horizontal * vertical;
}
function maxFontSize(runs, style) {
  let size = style?.fontSize ?? 16;
  for (const run of runs) {
    size = Math.max(size, run.style?.fontSize ?? size);
  }
  return size;
}
function minReadableTextWidth(runs, style) {
  const largestFont = maxFontSize(runs, style);
  return Math.max(48, largestFont * 3.4);
}
function textCharCount(runs) {
  return runs.reduce((count, run) => count + run.text.trim().length, 0);
}
function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function measureTextFit(node, rect) {
  if (node.decorative) return void 0;
  const payload = extractTextPayload(node);
  if (!payload) return void 0;
  const insetWidth = (payload.insets?.left ?? 0) + (payload.insets?.right ?? 0);
  const insetHeight = (payload.insets?.top ?? 0) + (payload.insets?.bottom ?? 0);
  const isVertical = payload.style?.textDirection === "vertical";
  const availableWidth = Math.max(0, (isVertical ? rect.height : rect.width) - (isVertical ? insetHeight : insetWidth));
  const availableHeight = Math.max(0, (isVertical ? rect.width : rect.height) - (isVertical ? insetWidth : insetHeight));
  const policy = payload.style?.textFit?.policy ?? "strict";
  const autoFit = computePolicyAutoFit(payload.runs, payload.style, availableWidth, availableHeight);
  const largestFont = maxFontSize(payload.runs, payload.style);
  const nominalLineHeight = resolveLineHeightPixels(
    payload.style?.lineHeight,
    largestFont,
    largestFont * 1.2
  );
  const metrics = calculateRichTextMetrics(payload.runs, payload.style, availableWidth);
  const lineCount = policy === "fitFontSize" && autoFit.lineCount !== void 0 ? autoFit.lineCount : metrics.lineCount;
  const maxLines = payload.style?.textFit?.maxLines;
  const minReadableWidth = minReadableTextWidth(payload.runs, payload.style);
  const contentLength = textCharCount(payload.runs);
  const SHRINK_NOISE_FLOOR = 9e4;
  const tightWrap = availableWidth < minReadableWidth && (lineCount > 1 || contentLength >= 4 && autoFit.fontScale < SHRINK_NOISE_FLOOR);
  return {
    availableWidth,
    availableHeight,
    overflow: autoFit.overflow,
    nominalLineHeight,
    lineHeightClips: availableHeight < nominalLineHeight * 0.95,
    policy,
    lineCount,
    maxLines,
    unexpectedWrap: maxLines !== void 0 && lineCount > maxLines,
    tightWrap,
    minReadableWidth,
    fontScale: autoFit.fontScale,
    lnSpcReduction: autoFit.lnSpcReduction
  };
}
function measureTableFit(node, rect) {
  if (node.decorative || node.type !== "Table") return void 0;
  const table = node;
  return planTableLayout(table.tableData, rect.width, rect.height);
}
function measureChartFit(node, rect) {
  if (node.decorative || node.type !== "Chart") return void 0;
  return collectChartFitDiagnostics(node, rect);
}
function measureImageFit(node, rect) {
  if (node.decorative || node.type !== "Image") return void 0;
  return collectImageFitDiagnostics(node, rect);
}
function pushIssue(issues, seen, issue) {
  const key = [
    issue.code,
    issue.slideIndex,
    issue.nodePath,
    issue.relatedNodePath ?? ""
  ].join("|");
  if (seen.has(key)) return;
  seen.add(key);
  issues.push(issue);
}
var BOUNDS_TOLERANCE = 0.5;
function warnOnBounds(node, rect, slideSize, slideIndex, nodePath, issues, seen) {
  if (!rect || node.decorative) return;
  if (rect.left < -BOUNDS_TOLERANCE || rect.top < -BOUNDS_TOLERANCE || rect.left + rect.width > slideSize.width + BOUNDS_TOLERANCE || rect.top + rect.height > slideSize.height + BOUNDS_TOLERANCE) {
    pushIssue(issues, seen, {
      code: "OUT_OF_BOUNDS",
      message: `Absolute node ${nodePath} exceeds slide bounds ${slideSize.width}x${slideSize.height}.`,
      slideIndex,
      nodePath
    });
  }
}
function warnOnParentBounds(node, rect, parentRect, slideIndex, nodePath, parentPath, issues, seen) {
  if (!rect || !parentRect || node.decorative) return;
  if (rectContainsWithTolerance(parentRect, rect, BOUNDS_TOLERANCE)) return;
  pushIssue(issues, seen, {
    code: "CONTAINER_CHILD_OUT_OF_BOUNDS",
    message: `Absolute child ${nodePath} exceeds parent container ${parentPath}.`,
    slideIndex,
    nodePath,
    relatedNodePath: parentPath,
    rect
  });
}
function warnOnTextFit(node, slideIndex, nodePath, origin, issues, seen) {
  if (node.decorative) return;
  const payload = extractTextPayload(node);
  if (!payload) return;
  const rect = getAbsoluteRect(node, origin);
  if (!rect) return;
  const insetWidth = (payload.insets?.left ?? 0) + (payload.insets?.right ?? 0);
  const insetHeight = (payload.insets?.top ?? 0) + (payload.insets?.bottom ?? 0);
  const isVertical = payload.style?.textDirection === "vertical";
  const wrapBudget = Math.max(0, (isVertical ? rect.height : rect.width) - (isVertical ? insetHeight : insetWidth));
  const blockBudget = Math.max(0, (isVertical ? rect.width : rect.height) - (isVertical ? insetWidth : insetHeight));
  const availableWidth = wrapBudget;
  const availableHeight = blockBudget;
  const fitPolicy = payload.style?.textFit?.policy ?? "strict";
  const autoFit = computePolicyAutoFit(payload.runs, payload.style, availableWidth, availableHeight);
  const metrics = calculateRichTextMetrics(payload.runs, payload.style, availableWidth);
  const largestFont = maxFontSize(payload.runs, payload.style);
  const nominalLineHeight = resolveLineHeightPixels(
    payload.style?.lineHeight,
    largestFont,
    largestFont * 1.2
  );
  const lineCount = fitPolicy === "fitFontSize" && autoFit.lineCount !== void 0 ? autoFit.lineCount : metrics.lineCount;
  const maxLines = payload.style?.textFit?.maxLines;
  const unexpectedWrap = maxLines !== void 0 && lineCount > maxLines;
  const minReadableWidth = minReadableTextWidth(payload.runs, payload.style);
  const contentLength = textCharCount(payload.runs);
  const SHRINK_NOISE_FLOOR = 9e4;
  const tightWrap = !isVertical && availableWidth < minReadableWidth && (lineCount > 1 || contentLength >= 4 && autoFit.fontScale < SHRINK_NOISE_FLOOR);
  const hasUnbreakableString = !isVertical && payload.runs.some((run) => hasUnbreakableTextSegment(run.text, payload.style, availableWidth));
  if (fitPolicy !== "overflow" && hasUnbreakableString) {
    pushIssue(issues, seen, {
      code: "TEXT_BREAK_ANYWHERE",
      message: `Text contains a segment wider than ${Math.round(availableWidth)}px at ${nodePath}; break-anywhere fallback will be applied.`,
      slideIndex,
      nodePath,
      rect
    });
  }
  if (fitPolicy !== "overflow" && (autoFit.overflow || unexpectedWrap)) {
    pushIssue(issues, seen, {
      code: "TEXT_OVERFLOW",
      message: unexpectedWrap ? `Text wraps to ${lineCount} lines, exceeding maxLines=${maxLines} at ${nodePath}.` : `Text may overflow its ${Math.round(availableWidth)}x${Math.round(availableHeight)} container at ${nodePath}.`,
      slideIndex,
      nodePath
    });
  }
  if (fitPolicy !== "overflow" && tightWrap) {
    pushIssue(issues, seen, {
      code: "TEXT_WRAP_TIGHT",
      message: `Text wraps in a cramped ${Math.round(availableWidth)}px column; needs about ${Math.round(minReadableWidth)}px for readable wrapping at ${nodePath}.`,
      slideIndex,
      nodePath,
      rect
    });
  }
  if (fitPolicy !== "overflow" && availableHeight < nominalLineHeight * 0.95) {
    pushIssue(issues, seen, {
      code: "TEXT_CLIP",
      message: `Text line height may clip inside its ${Math.round(availableWidth)}x${Math.round(availableHeight)} container at ${nodePath}.`,
      slideIndex,
      nodePath
    });
  }
}
function warnOnTableFit(node, rect, slideIndex, nodePath, issues, seen) {
  if (!rect || node.decorative || node.type !== "Table") return;
  const table = node;
  const fit = planTableLayout(table.tableData, rect.width, rect.height);
  if (table.tableData.rowLayout?.overflow !== "allow" && fit.overfull) {
    pushIssue(issues, seen, {
      code: "TABLE_OVERFULL",
      message: `Table rows require ${Math.round(fit.totalAssignedHeight)}px but allocated height is ${Math.round(rect.height)}px at ${nodePath}.`,
      slideIndex,
      nodePath,
      rect
    });
  }
  for (const rowIndex of fit.compressedRows) {
    const row = fit.rows[rowIndex];
    pushIssue(issues, seen, {
      code: "TABLE_ROW_COMPRESSED",
      message: `Table row ${rowIndex + 1} is assigned ${Math.round(row.assignedHeight)}px but needs ${Math.round(row.naturalHeight)}px at ${nodePath}.`,
      slideIndex,
      nodePath,
      rect
    });
  }
}
function warnOnChartFit(node, rect, slideIndex, nodePath, issues, seen) {
  if (!rect || node.decorative || node.type !== "Chart") return;
  const chartFit = collectChartFitDiagnostics(node, rect);
  if (!chartFit) return;
  for (const issue of chartFit.issues) {
    pushIssue(issues, seen, {
      code: issue.code,
      message: issue.message,
      slideIndex,
      nodePath,
      rect: issue.rect
    });
  }
}
function warnOnImageFit(node, rect, slideIndex, nodePath, issues, seen) {
  if (!rect || node.decorative || node.type !== "Image") return;
  const imageFit = collectImageFitDiagnostics(node, rect);
  if (!imageFit) return;
  for (const issue of imageFit.issues) {
    pushIssue(issues, seen, {
      code: issue.code,
      message: issue.message,
      slideIndex,
      nodePath,
      rect: issue.rect
    });
  }
}
function collectAbsoluteSiblingInfo(nodes, origin, parentPath) {
  return nodes.flatMap((node, index) => {
    const rect = getAbsoluteRect(node, origin);
    if (!rect) return [];
    return [{
      path: `${parentPath}[${index}]`,
      rect,
      zIndex: node.style?.zIndex,
      decorative: node.decorative
    }];
  });
}
function walkNodes(nodes, slideIndex, slideSize, origin, parentPath, issues, seen, parentRect) {
  const absoluteSiblings = collectAbsoluteSiblingInfo(nodes, origin, parentPath);
  for (let index = 0; index < absoluteSiblings.length; index += 1) {
    const current = absoluteSiblings[index];
    for (let otherIndex = index + 1; otherIndex < absoluteSiblings.length; otherIndex += 1) {
      const other = absoluteSiblings[otherIndex];
      if (!rectsOverlap2(current.rect, other.rect) || rectContains(current.rect, other.rect) || rectContains(other.rect, current.rect) || overlapArea(current.rect, other.rect) < 120 || current.decorative || other.decorative || current.zIndex !== void 0 && other.zIndex !== void 0 && current.zIndex !== other.zIndex) {
        continue;
      }
      pushIssue(issues, seen, {
        code: "NODE_COLLISION",
        message: `Absolutely positioned nodes ${current.path} and ${other.path} overlap.`,
        slideIndex,
        nodePath: current.path,
        relatedNodePath: other.path
      });
    }
  }
  nodes.forEach((node, index) => {
    const nodePath = `${parentPath}[${index}]`;
    const rect = getAbsoluteRect(node, origin);
    warnOnBounds(node, rect, slideSize, slideIndex, nodePath, issues, seen);
    warnOnParentBounds(node, rect, parentRect, slideIndex, nodePath, parentPath, issues, seen);
    warnOnTextFit(node, slideIndex, nodePath, origin, issues, seen);
    warnOnTableFit(node, rect, slideIndex, nodePath, issues, seen);
    warnOnChartFit(node, rect, slideIndex, nodePath, issues, seen);
    warnOnImageFit(node, rect, slideIndex, nodePath, issues, seen);
    if (!hasChildren(node)) return;
    const nextOrigin = rect ? { x: rect.left, y: rect.top } : origin;
    walkNodes(node.children, slideIndex, slideSize, nextOrigin, `${nodePath}.children`, issues, seen, rect ?? parentRect);
  });
}
function collectDebugNodes(nodes, origin, parentPath, output) {
  nodes.forEach((node, index) => {
    const nodePath = `${parentPath}[${index}]`;
    const rect = getAbsoluteRect(node, origin);
    if (rect) {
      output.push({
        path: nodePath,
        nodeType: node.type,
        rect,
        zIndex: node.style?.zIndex,
        decorative: node.decorative,
        textFit: measureTextFit(node, rect),
        tableFit: measureTableFit(node, rect),
        chartFit: measureChartFit(node, rect),
        imageFit: measureImageFit(node, rect)
      });
    }
    if (!hasChildren(node)) return;
    const nextOrigin = rect ? { x: rect.left, y: rect.top } : origin;
    collectDebugNodes(node.children, nextOrigin, `${nodePath}.children`, output);
  });
}
function enrichIssue(issue, rectByPath) {
  const stableKey = [
    issue.code,
    issue.slideIndex,
    issue.nodePath,
    issue.relatedNodePath ?? ""
  ].join("|");
  return {
    ...issue,
    issueId: `${issue.code.toLowerCase().replace(/_/g, "-")}-${hashString(stableKey)}`,
    rect: issue.rect ?? rectByPath.get(issue.nodePath),
    relatedRect: issue.relatedNodePath ? rectByPath.get(issue.relatedNodePath) : void 0
  };
}
function validateAbsoluteSlideLayout(slide, slideIndex, slideSize) {
  const issues = [];
  const seen = /* @__PURE__ */ new Set();
  walkNodes(slide.children, slideIndex, slideSize, { x: 0, y: 0 }, `slides[${slideIndex}].children`, issues, seen);
  return issues;
}
function collectAbsoluteSlideLayoutDebug(slide, slideIndex, slideSize) {
  const nodes = [];
  collectDebugNodes(slide.children, { x: 0, y: 0 }, `slides[${slideIndex}].children`, nodes);
  const rectByPath = new Map(nodes.map((node) => [node.path, node.rect]));
  const issues = validateAbsoluteSlideLayout(slide, slideIndex, slideSize).map((issue) => enrichIssue(issue, rectByPath));
  return { slideIndex, slideSize, nodes, issues };
}
function collectAbsoluteDocumentLayoutDebug(document) {
  const slideSize = document.slideSize ?? { width: 960, height: 540 };
  return document.slides.map(
    (slide, slideIndex) => collectAbsoluteSlideLayoutDebug(slide, slideIndex, slideSize)
  );
}
function validateAbsoluteDocumentLayout(document) {
  const slideSize = document.slideSize ?? { width: 960, height: 540 };
  return document.slides.flatMap(
    (slide, slideIndex) => validateAbsoluteSlideLayout(slide, slideIndex, slideSize)
  );
}

export {
  traverseAST,
  RenderContext,
  withContext,
  enforceLockedBrandPalette,
  PaperEngine,
  createEngine,
  collectChartFitDiagnostics,
  collectImageFitDiagnostics,
  validateAbsoluteSlideLayout,
  collectAbsoluteSlideLayoutDebug,
  collectAbsoluteDocumentLayoutDebug,
  validateAbsoluteDocumentLayout
};
//# sourceMappingURL=chunk-M3B54ZA7.js.map
