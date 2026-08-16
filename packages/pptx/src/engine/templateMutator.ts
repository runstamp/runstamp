import { getLogger } from "../logger.js";
import type { PaperDocument } from "../types/ast.js";
import type { LayoutNode } from "../layout/extract.js";
import { parseTemplate } from "../template/parser.js";
import { assembleFromTemplate } from "../template/mutator.js";
import { mapSlideToLayout, resolveLayoutTarget } from "../template/layoutMapper.js";
import { injectPlaceholderGeometry } from "../template/placeholderInjector.js";
import { runLayout } from "../layout/index.js";
import { PIXEL_TO_EMU } from "../ooxml/drawing/math.js";
import { processDocumentComments } from "../ooxml/comments.js";
import { assertPowerPointFontEmbeddingAvailable, processDocumentFonts } from "../ooxml/fontEmbed.js";
import { autoLoadDocumentFonts } from "../typography/autoFont.js";
import {
  summarizeDocumentCompatibility,
  type DocumentCompatibilityReport,
} from "../compatibility/pptxCompatibility.js";
import { PaperError } from "../errors.js";
import { flattenDocumentZIndex } from "../zIndex.js";
import { buildTemplatePreflightReport } from "./templatePreflight.js";
import { validateDocument } from "./documentValidation.js";
import {
  checkAborted,
  hasAnyNotes,
  validateCrossSlideHyperlinks,
  YIELD_FREQUENCY,
  yieldToEventLoop,
} from "./archiveAssembler.js";
import {
  collectSlideResult,
  createSlideResultCollector,
  processSlideLayout,
  type SlideProcessingCounters,
} from "./slideProcessor.js";
import type { TemplatePreflightReport } from "../quality/report.js";
import type { EngineRenderOptions } from "../engine.js";
import { createMediaFetchBudget } from "../ooxml/media.js";

export interface TemplateRenderResult {
  buffer: Buffer;
  layoutTrees: LayoutNode[];
  compatibilityReport: DocumentCompatibilityReport;
  templateReport: TemplatePreflightReport;
}

export async function renderTemplateInternal(
  doc: PaperDocument,
  options?: EngineRenderOptions,
): Promise<TemplateRenderResult> {
  const validated = validateDocument(doc, options);
  const normalized = flattenDocumentZIndex(validated);
  assertPowerPointFontEmbeddingAvailable(normalized);
  if (!normalized.template) {
    throw new PaperError(
      "[PaperEngine] renderTemplateInternal called but document has no template buffer. Provide a .pptx template via PaperDocument.template.",
      { code: "VALIDATION_FAILED", phase: "template" },
    );
  }
  const templateIndex = await parseTemplate(normalized.template);
  const templateReport = buildTemplatePreflightReport(normalized.slides, templateIndex);
  if (templateReport.templateSupportLevel === "unsafe") {
    throw new PaperError(
      `Template preflight failed: unsafe layouts=${templateReport.unsafeLayouts.join(", ") || "none"}, missing placeholders=${templateReport.missingPlaceholderCount ?? 0}.`,
      {
        code: "COMPATIBILITY_CONTRACT_VIOLATION",
        phase: "template",
      },
    );
  }

  const collector = createSlideResultCollector();
  const {
    slideContents,
    slideMediaManifests,
    slideChartManifests,
    slideHyperlinkRels,
    slideTransitionXmls,
    slideTimingXmls,
    slideBackgrounds,
    slideNotes,
    slideHeaderFooters,
    slideBgImageAssets,
    slideCompatibilityReports,
  } = collector;
  const slideLayoutTargets: string[] = [];
  const layoutTrees: LayoutNode[] = [];
  const counters: SlideProcessingCounters = {
    globalMediaCounter: { current: 1 },
    globalChartCounter: { current: 1 },
    globalChartExCounter: { current: 1 },
    globalVideoAudioCounter: { current: 1 },
    mediaDeduplicationMap: new Map(),
    mediaFetchBudget: createMediaFetchBudget(),
  };

  const tplLayoutWidth = normalized.slideSize?.width ?? templateIndex.slideWidth;
  const tplLayoutHeight = normalized.slideSize?.height ?? templateIndex.slideHeight;
  const enableFallbackImages = normalized.chartFallbackImages ?? false;
  const themeColors = normalized.theme?.colorScheme;

  if (normalized.slideSize) {
    const dw = Math.abs(tplLayoutWidth - templateIndex.slideWidth);
    const dh = Math.abs(tplLayoutHeight - templateIndex.slideHeight);
    if (dw > 1 || dh > 1) {
      getLogger().warn(
        `[PaperEngine] Slide dimensions mismatch: AST slideSize (${tplLayoutWidth}×${tplLayoutHeight}) ` +
        `differs from template (${templateIndex.slideWidth}×${templateIndex.slideHeight}). ` +
        "Layout will use AST dimensions; template master/layout shapes may not align.",
      );
    }
  }

  const slideWidthEmu = Math.round(tplLayoutWidth * PIXEL_TO_EMU);
  const slideHeightEmu = Math.round(tplLayoutHeight * PIXEL_TO_EMU);
  const totalSlides = normalized.slides.length;

  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex += 1) {
    checkAborted(options?.signal, slideIndex, "template");
    const originalSlide = normalized.slides[slideIndex];
    const slide = structuredClone(originalSlide);

    const mapped = mapSlideToLayout(slide, templateIndex);
    if (mapped) {
      const masterIndex = mapped.layout.masterIndex;
      const master = templateIndex.slideMasters?.[masterIndex];
      const masterTextStyles = master?.textStyles ?? templateIndex.masterTextStyles;
      const masterTheme = master
        ? (templateIndex.themes?.[master.themeIndex]?.data ?? templateIndex.theme)
        : templateIndex.theme;
      injectPlaceholderGeometry(slide, mapped.placeholders, masterTextStyles, masterTheme);
    } else if (slide.layoutName) {
      throw new PaperError(
        `[PaperEngine] Layout "${slide.layoutName}" not found in template`,
        {
          code: "COMPATIBILITY_CONTRACT_VIOLATION",
          phase: "template",
          slideIndex,
        },
      );
    }

    // Template inheritance can introduce font families during placeholder
    // injection, so resolve the concrete face only after injection and still
    // before Yoga layout. Merge the per-slide used-face manifest for writing.
    const fontDocument: PaperDocument = {
      ...normalized,
      slides: [slide],
      resolvedFonts: undefined,
      fontPixelGateEligible: undefined,
    };
    await autoLoadDocumentFonts(fontDocument);
    const mergedFonts = new Map(
      (normalized.resolvedFonts ?? []).map((font) => [font.sha256 ?? `${font.source}:${font.family}:${font.face}`, font]),
    );
    for (const font of fontDocument.resolvedFonts ?? []) {
      mergedFonts.set(font.sha256 ?? `${font.source}:${font.family}:${font.face}`, font);
    }
    normalized.resolvedFonts = [...mergedFonts.values()];
    normalized.fontPixelGateEligible = normalized.resolvedFonts.every((font) => font.pixelGateEligible);

    const layoutTarget = resolveLayoutTarget(slide.layoutName, templateIndex)
      ?? "../slideLayouts/slideLayout1.xml";
    slideLayoutTargets.push(layoutTarget);

    const layoutTree = await runLayout(slide, tplLayoutWidth, tplLayoutHeight);
    layoutTrees.push(layoutTree);
    const slideResult = await processSlideLayout(
      layoutTree,
      slide,
      counters,
      enableFallbackImages,
      themeColors,
      slideIndex,
    );

    await collectSlideResult(
      collector,
      slide,
      slideResult,
      slideIndex,
      counters,
      options?.signal,
    );

    options?.onProgress?.(slideIndex, totalSlides);

    if (slideIndex % YIELD_FREQUENCY === YIELD_FREQUENCY - 1) {
      await yieldToEventLoop();
    }
    checkAborted(options?.signal, slideIndex, "serialization");
  }

  const { commentSlideInfos, commentAuthorsXml, commentFilesMap } = processDocumentComments(normalized);
  const hasComments = commentSlideInfos.length > 0;
  const hasNotes = hasAnyNotes(slideNotes);
  let maxTemplateRId = 0;
  for (const match of templateIndex.presentationRels.matchAll(/Id="rId(\d+)"/g)) {
    const value = parseInt(match[1], 10);
    if (value > maxTemplateRId) maxTemplateRId = value;
  }
  const slideRIdBase = Math.max(maxTemplateRId + 1, 101);
  const maxNewRId = slideRIdBase + normalized.slides.length + 10 + (hasNotes ? 1 : 0) + (hasComments ? 1 : 0);
  const fontRIdStart = Math.max(maxTemplateRId, maxNewRId) + 1;
  const { embeddedFontListXml, extraPresentationRels, fontDataFiles } = await processDocumentFonts(
    normalized,
    fontRIdStart,
  );

  validateCrossSlideHyperlinks(slideHyperlinkRels, normalized.slides.length);

  const buffer = await assembleFromTemplate(templateIndex, {
    slideCount: normalized.slides.length,
    slideContents,
    slideMediaManifests,
    slideChartManifests,
    slideHyperlinkRels,
    slideLayoutTargets,
    slideTransitionXmls,
    slideTimingXmls,
    slideBackgrounds,
    slideHeaderFooters,
    slideNotes,
    slideBgImageAssets,
    slideWidthEmu,
    slideHeightEmu,
    commentSlideInfos: hasComments ? commentSlideInfos : undefined,
    commentAuthorsXml,
    commentFilesMap,
    embeddedFontListXml,
    extraPresentationRels,
    fontDataFiles,
  });

  return {
    buffer,
    layoutTrees,
    compatibilityReport: summarizeDocumentCompatibility(slideCompatibilityReports),
    templateReport,
  };
}
