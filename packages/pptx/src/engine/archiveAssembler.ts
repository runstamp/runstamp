import { getLogger } from "../logger.js";
import type {
  PaperDocument,
  SlideBackground,
  Paragraph,
  HeaderFooter,
  SlideMasterConfig,
} from "../types/ast.js";
import { runLayout } from "../layout/index.js";
import type { LayoutNode } from "../layout/extract.js";
import { createMediaFetchBudget, type SlideMediaManifest, type MediaAsset } from "../ooxml/media.js";
import type { SlideChartManifest } from "../ooxml/chart/index.js";
import type { HyperlinkRel } from "../ooxml/drawing/text.js";
import { PptxArchive } from "../ooxml/zipper.js";
import { processDocumentComments } from "../ooxml/comments.js";
import { assertPowerPointFontEmbeddingAvailable, processDocumentFonts } from "../ooxml/fontEmbed.js";
import { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } from "../ooxml/constants.js";
import { autoLoadDocumentFonts } from "../typography/autoFont.js";
import { PaperError } from "../errors.js";
import {
  summarizeDocumentCompatibility,
  type DocumentCompatibilityReport,
} from "../compatibility/pptxCompatibility.js";
import { flattenDocumentZIndex } from "../zIndex.js";
import {
  collectSlideResult,
  createSlideResultCollector,
  type FallbackArtifactManifest,
  processSlideLayout,
  type SlideProcessingCounters,
} from "./slideProcessor.js";
import { validateDocument } from "./documentValidation.js";
import type { EngineRenderOptions } from "../engine.js";
import { assertAgentRecipeLayoutUtilization } from "../interpreter/agent-quality-gates.js";

export const YIELD_FREQUENCY = 10;

export const yieldToEventLoop = typeof setImmediate === "function"
  ? () => new Promise<void>((resolve) => setImmediate(resolve))
  : () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function hasAnyNotes(slideNotes: (string | Paragraph[] | undefined)[]): boolean {
  return slideNotes.some((note) => note !== undefined && note !== "" && !(Array.isArray(note) && note.length === 0));
}

export function validateCrossSlideHyperlinks(
  slideHyperlinkRels: Array<Array<{ url: string; external?: boolean; rId: string }>>,
  slideCount: number,
): void {
  for (let slideIndex = 0; slideIndex < slideHyperlinkRels.length; slideIndex += 1) {
    slideHyperlinkRels[slideIndex] = slideHyperlinkRels[slideIndex].filter((rel) => {
      if (rel.external === false) {
        const match = rel.url.match(/^slide(\d+)\.xml$/);
        if (match) {
          const targetSlide = parseInt(match[1], 10);
          if (targetSlide < 1 || targetSlide > slideCount) {
            getLogger().warn(
              `[engine] Removing hyperlink on slide ${slideIndex + 1} targeting non-existent slide ${targetSlide} (presentation has ${slideCount} slides)`,
            );
            return false;
          }
        }
      }
      return true;
    });
  }
}

function validateStrictMasterConfiguration(
  masters: SlideMasterConfig[] | undefined,
  slideMasterNames: (string | undefined)[],
): void {
  if (!masters || masters.length === 0) return;

  const issues: import("../errors.js").PaperErrorIssue[] = [];
  const masterNames = new Set<string>();
  const duplicateMasterNames = new Set<string>();

  masters.forEach((master, masterIndex) => {
    if (!master.name) {
      issues.push({
        path: `masters[${masterIndex}].name`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: "Strict editable multi-master output requires every master to have a name.",
        remediation: "Give each slide master a unique name before rendering in strict_editable mode.",
      });
    } else if (masterNames.has(master.name)) {
      duplicateMasterNames.add(master.name);
      issues.push({
        path: `masters[${masterIndex}].name`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: `Duplicate slide master name "${master.name}" is not allowed in strict_editable mode.`,
        remediation: "Rename duplicate slide masters or render with an explicit non-strict fallback policy.",
      });
    } else {
      masterNames.add(master.name);
    }

    if (!master.layouts || master.layouts.length === 0) {
      issues.push({
        path: `masters[${masterIndex}].layouts`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: `Slide master "${master.name || masterIndex + 1}" has no layouts.`,
        remediation: "Add at least one slide layout for every declared master.",
      });
    }
  });

  slideMasterNames.forEach((masterName, slideIndex) => {
    if (masters.length > 1 && !masterName) {
      issues.push({
        path: `slides[${slideIndex}].masterName`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: "Strict editable multi-master output requires each slide to choose a masterName.",
        slideIndex,
        remediation: "Set slide.masterName to one of the declared master names.",
      });
      return;
    }

    if (masterName && (!masterNames.has(masterName) || duplicateMasterNames.has(masterName))) {
      issues.push({
        path: `slides[${slideIndex}].masterName`,
        code: "MASTER_CONFIGURATION_INVALID",
        message: `Slide references unresolved masterName "${masterName}" in strict_editable mode.`,
        slideIndex,
        remediation: "Use a unique declared masterName or render with an explicit non-strict fallback policy.",
      });
    }
  });

  if (issues.length > 0) {
    throw new PaperError(
      `Strict editable multi-master validation failed with ${issues.length} issue(s).`,
      {
        code: "VALIDATION_FAILED",
        phase: "validation",
        issues,
      },
    );
  }
}

export function checkAborted(
  signal?: AbortSignal,
  slideIndex?: number,
  phase: import("../errors.js").ErrorPhase = "layout",
): void {
  if (signal?.aborted) {
    throw new PaperError(
      `Render cancelled${slideIndex !== undefined ? ` at slide ${slideIndex}` : ""}`,
      { code: "RENDER_CANCELLED", phase, slideIndex },
    );
  }
}

export interface BuildArchiveResult {
  archive: PptxArchive;
  compatibilityReport: DocumentCompatibilityReport;
  slideContents: string[];
  slideMediaManifests: SlideMediaManifest[];
  slideChartManifests: SlideChartManifest[];
  slideHyperlinkRels: HyperlinkRel[][];
  slideTransitionXmls: string[];
  slideTimingXmls: string[];
  slideBackgrounds: (SlideBackground | undefined)[];
  slideNotes: (string | Paragraph[] | undefined)[];
  slideHeaderFooters: (HeaderFooter | undefined)[];
  slideBgImageAssets: (MediaAsset | undefined)[];
  slideFallbackArtifactManifests: FallbackArtifactManifest[];
  layoutTrees: LayoutNode[];
}

export async function buildArchive(
  doc: PaperDocument,
  options?: EngineRenderOptions,
): Promise<BuildArchiveResult> {
  const validated = validateDocument(doc, options);
  const normalized = flattenDocumentZIndex(validated);

  assertPowerPointFontEmbeddingAvailable(normalized);
  await autoLoadDocumentFonts(normalized);

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
    slideFallbackArtifactManifests,
  } = collector;
  const layoutTrees: LayoutNode[] = [];
  const counters: SlideProcessingCounters = {
    globalMediaCounter: { current: 1 },
    globalChartCounter: { current: 1 },
    globalChartExCounter: { current: 1 },
    globalVideoAudioCounter: { current: 1 },
    mediaDeduplicationMap: new Map(),
    mediaFetchBudget: createMediaFetchBudget(),
  };

  const layoutWidth = normalized.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX;
  const layoutHeight = normalized.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX;

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

  const enableFallbackImages = normalized.chartFallbackImages ?? false;
  const themeColors = normalized.theme?.colorScheme;
  const totalSlides = normalized.slides.length;

  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex += 1) {
    checkAborted(options?.signal, slideIndex, "layout");
    const slide = normalized.slides[slideIndex];
    const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
    assertAgentRecipeLayoutUtilization(layoutTree, layoutHeight);
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

  validateCrossSlideHyperlinks(slideHyperlinkRels, normalized.slides.length);

  const archive = new PptxArchive();
  const { commentSlideInfos, commentAuthorsXml, commentFilesMap } = processDocumentComments(normalized);
  const hasNotes = hasAnyNotes(slideNotes);
  const hasComments = commentSlideInfos.length > 0;
  const masterCount = normalized.masters?.length ?? 1;
  const hasHandoutMaster = normalized.handoutLayout !== undefined;
  const fontRIdStart = masterCount + normalized.slides.length + 5
    + (hasNotes ? 1 : 0)
    + (hasComments ? 1 : 0)
    + (hasHandoutMaster ? 1 : 0);
  const { embeddedFontListXml, extraPresentationRels, fontDataFiles } = await processDocumentFonts(
    normalized,
    fontRIdStart,
  );

  const slideMasterNames = normalized.slides.map((slide) => slide.masterName);
  if (options?.outputMode === "strict_editable") {
    validateStrictMasterConfiguration(normalized.masters, slideMasterNames);
  }

  archive.assemblePresentation(normalized.slides.length, {
    slideContents,
    slideMediaManifests,
    slideChartManifests,
    slideHyperlinkRels,
    slideTransitionXmls,
    slideTimingXmls,
    slideBackgrounds,
    slideNotes,
    meta: normalized.meta,
    slideSize: normalized.slideSize,
    slideHeaderFooters,
    themeConfig: normalized.theme,
    sections: normalized.sections,
    protection: normalized.protection,
    customShows: normalized.customShows,
    notesSize: normalized.notesSize,
    embeddedFontListXml,
    extraPresentationRels,
    commentSlideInfos,
    commentAuthorsXml,
    fontDataFiles,
    mastersConfig: normalized.masters,
    slideMasterNames,
    slideBgImageAssets,
    customProperties: normalized.customProperties,
    handoutLayout: normalized.handoutLayout,
    printSettings: normalized.printSettings,
  });

  for (const [path, content] of commentFilesMap) {
    archive.addFile(path, content);
  }

  const compatibilityReport = summarizeDocumentCompatibility(slideCompatibilityReports);

  return {
    archive,
    compatibilityReport,
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
    slideFallbackArtifactManifests,
    layoutTrees,
  };
}
