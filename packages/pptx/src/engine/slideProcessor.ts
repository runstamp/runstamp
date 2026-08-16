import { getLogger } from "../logger.js";
import type {
  SlideBackground,
  SlideTransition,
  HeaderFooter,
  ImageBackground,
  Paragraph,
  ThemeColorScheme,
} from "../types/ast.js";
import { processSlideMedia, hashBuffer, resolveImageSource } from "../ooxml/media.js";
import type {
  SlideMediaManifest,
  MediaAsset,
  MediaDeduplicationMap,
  MediaFetchBudget,
} from "../ooxml/media.js";
import { serializeSlideTree } from "../ooxml/drawing/orchestrator.js";
import type { HyperlinkRel } from "../ooxml/drawing/text.js";
import { countChartRelationshipSlots, processSlideCharts, type SlideChartManifest } from "../ooxml/chart/index.js";
import type { LayoutNode } from "../layout/extract.js";
import { applyGhostGrid } from "../layout/ghostGrid.js";
import { applyVisualOrder } from "../layout/visualOrder.js";
import { applyAutoFit } from "./textFit.js";
import { isLiteBundle } from "../engineMode.js";
import { generateTransitionXml } from "../ooxml/transition.js";
import { generateTimingXml } from "../ooxml/timing.js";
import { countVideoAudioRIds, computeChartStartRId } from "../ooxml/rIdCalc.js";
import { FETCH_TIMEOUT_MS } from "../ooxml/constants.js";
import { renderSlideToBuffer } from "../renderer/index.js";
import { PaperError } from "../errors.js";
import { validateFetchUrl } from "../ooxml/urlGuard.js";
import {
  applyPptxCompatibility,
  type SlideCompatibilityReport,
} from "../compatibility/pptxCompatibility.js";
import { someLayoutNode } from "../layout/traverse.js";

async function processBackgroundImage(
  bg: ImageBackground,
  globalMediaCounter: { current: number },
  rId: string,
  slideIndex?: number,
  deduplicationMap?: MediaDeduplicationMap,
  renderSignal?: AbortSignal,
  mediaFetchBudget?: MediaFetchBudget,
): Promise<MediaAsset | undefined> {
  const src = bg.src;
  let buffer: Buffer;
  let ext: string;

  try {
    const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const fetchSignal = renderSignal
      ? AbortSignal.any([renderSignal, timeoutSignal])
      : timeoutSignal;
    ({ buffer, ext } = await resolveImageSource(src, {
      context: { slideIndex, nodeType: "background image" },
      signal: fetchSignal,
      validateUrl: validateFetchUrl,
      mediaFetchBudget,
    }));
  } catch (error) {
    if (error instanceof PaperError) {
      throw error;
    }
    throw new PaperError(
      `Failed to fetch background image (slide ${slideIndex ?? "?"}): ${src}`,
      { code: "MEDIA_FETCH_FAILED", phase: "media", slideIndex, cause: error },
    );
  }

  if (buffer.length === 0) {
    getLogger().warn(`[media] Empty background image payload on slide ${slideIndex ?? "?"}. Background image skipped.`);
    return undefined;
  }

  if (deduplicationMap && buffer.length > 0) {
    const hash = hashBuffer(buffer);
    const existing = deduplicationMap.get(hash);
    if (existing) {
      return {
        rId,
        mediaPath: existing.mediaPath,
        relativePath: existing.relativePath,
        ext: existing.ext,
        buffer: existing.buffer,
      };
    }
    const mediaIndex = globalMediaCounter.current++;
    const fileName = `image${mediaIndex}.${ext}`;
    const mediaPath = `ppt/media/${fileName}`;
    const relativePath = `../media/${fileName}`;
    deduplicationMap.set(hash, { mediaPath, relativePath, ext, buffer });
    return { rId, mediaPath, relativePath, ext, buffer };
  }

  const mediaIndex = globalMediaCounter.current++;
  const fileName = `image${mediaIndex}.${ext}`;
  return {
    rId,
    mediaPath: `ppt/media/${fileName}`,
    relativePath: `../media/${fileName}`,
    ext,
    buffer,
  };
}

function hasMorphIdInTree(node: LayoutNode): boolean {
  return someLayoutNode(
    node,
    (candidate) => "morphId" in candidate && typeof candidate.morphId === "string" && candidate.morphId.length > 0,
    { skipHidden: true },
  );
}

export interface SlideProcessingCounters {
  globalMediaCounter: { current: number };
  globalChartCounter: { current: number };
  globalChartExCounter: { current: number };
  globalVideoAudioCounter: { current: number };
  mediaDeduplicationMap: MediaDeduplicationMap;
  mediaFetchBudget: MediaFetchBudget;
}

export interface SlideProcessingResult {
  xml: string;
  mediaManifest: SlideMediaManifest;
  chartManifest: SlideChartManifest;
  fallbackArtifactManifest: FallbackArtifactManifest;
  hyperlinkRels: HyperlinkRel[];
  transitionXml: string;
  timingXml: string;
  compatibilityReport: SlideCompatibilityReport;
}

export interface FallbackArtifactEntry {
  kind: "slide_visual_fallback" | "chart_visual_fallback" | "chart_alternate_fallback";
  relationshipId: string;
  mediaPath: string;
  chartIndex?: number;
}

export interface FallbackArtifactManifest {
  slideIndex: number;
  artifacts: FallbackArtifactEntry[];
}

function buildFallbackArtifactManifest(
  slideIndex: number,
  layoutTree: LayoutNode,
  mediaManifest: SlideMediaManifest,
  chartManifest: SlideChartManifest,
): FallbackArtifactManifest {
  const artifacts: FallbackArtifactEntry[] = [];

  if (layoutTree._compatibility?.mode === "visual_fallback") {
    if (mediaManifest.assets.length !== 1) {
      throw new PaperError(
        "Slide was marked visual_fallback, but the archive manifest does not contain exactly one full-slide image fallback relationship.",
        {
          code: "PPTX_VISUAL_FALLBACK_MISSING",
          phase: "serialization",
          slideIndex,
        },
      );
    }
    const [asset] = mediaManifest.assets;
    artifacts.push({
      kind: "slide_visual_fallback",
      relationshipId: asset.rId,
      mediaPath: asset.mediaPath,
    });
  }

  for (const chart of chartManifest.charts) {
    if (chart.renderMode !== "alternate" && chart.renderMode !== "image-only") {
      continue;
    }
    if (!chart.fallbackRId || !chart.fallbackMediaPath || !chart.fallbackPng) {
      throw new PaperError(
        "Chart fallback mode requires a concrete fallback image relationship and media artifact.",
        {
          code: "PPTX_CHART_FALLBACK_MISSING",
          phase: "chart",
          slideIndex,
        },
      );
    }
    artifacts.push({
      kind: chart.renderMode === "image-only" ? "chart_visual_fallback" : "chart_alternate_fallback",
      relationshipId: chart.fallbackRId,
      mediaPath: chart.fallbackMediaPath,
      chartIndex: chart.chartIndex,
    });
  }

  return { slideIndex, artifacts };
}

export async function processSlideLayout(
  layoutTree: LayoutNode,
  slide: { transition?: SlideTransition; background?: SlideBackground },
  counters: SlideProcessingCounters,
  enableFallbackImages?: boolean,
  themeColors?: ThemeColorScheme,
  slideIndex = 0,
): Promise<SlideProcessingResult> {
  const lite = isLiteBundle();

  if (!lite) {
    applyGhostGrid(layoutTree);
  }
  applyVisualOrder(layoutTree);

  let compatibilityReport: SlideCompatibilityReport;
  if (lite) {
    compatibilityReport = {
      slideIndex,
      compatibilityVerdict: "native_safe",
      issues: [],
      fontSubstitutions: {},
      fonts: [],
      pixelGateEligible: true,
    };
  } else {
    applyAutoFit(layoutTree);
    compatibilityReport = applyPptxCompatibility(layoutTree as any, slideIndex);

    if (layoutTree._compatibility?.mode === "visual_fallback") {
      const rendered = await renderSlideToBuffer(layoutTree, {
        width: layoutTree.layout.width,
        height: layoutTree.layout.height,
        themeColors,
      });
      if (!rendered) {
        throw new PaperError(
          "Slide was marked visual_fallback, but no full-slide image fallback artifact was produced.",
          {
            code: "PPTX_VISUAL_FALLBACK_MISSING",
            phase: "rendering",
            slideIndex,
          },
        );
      }
      layoutTree.children = [{
        type: "Image",
        src: `data:image/png;base64,${rendered.toString("base64")}`,
        decorative: true,
        layout: {
          x: 0,
          y: 0,
          width: layoutTree.layout.width,
          height: layoutTree.layout.height,
        },
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: layoutTree.layout.width,
          height: layoutTree.layout.height,
        },
        _compatibility: {
          mode: "visual_fallback",
          reason: layoutTree._compatibility.reason,
          fallbackReason: layoutTree._compatibility.fallbackReason,
        },
      } as any];
    }
  }

  const mediaManifest = await processSlideMedia(
    layoutTree,
    counters.globalMediaCounter,
    counters.globalVideoAudioCounter,
    counters.mediaDeduplicationMap,
    counters.mediaFetchBudget,
  );

  const videoAudioRIdCount = countVideoAudioRIds(
    mediaManifest.videoAssets,
    mediaManifest.audioAssets.length,
  );
  const svgCount = mediaManifest.svgAssets.length;
  const chartStartRId = computeChartStartRId(
    mediaManifest.assets.length,
    mediaManifest.fillAssets.length,
    videoAudioRIdCount,
    svgCount,
  );

  const chartManifest = await processSlideCharts(
    layoutTree,
    counters.globalChartCounter,
    chartStartRId,
    counters.globalChartExCounter,
    enableFallbackImages ? counters.globalMediaCounter : undefined,
    enableFallbackImages,
    themeColors,
  );

  const mediaRIds = mediaManifest.assets.map((asset) => asset.rId);
  const fillMediaRIds = mediaManifest.fillAssets.map((asset) => asset.rId);
  const chartRIds = chartManifest.charts.map((chart) => chart.rId ?? "");
  const chartRIdCount = countChartRelationshipSlots(chartManifest);
  const hyperlinkRIdStart = chartStartRId + chartRIdCount;

  const videoMediaInfo = mediaManifest.videoAssets.map((video) => ({
    videoRId: video.videoRId,
    mediaRId: video.mediaRId,
    posterRId: video.posterRId,
    webVideo: video.webVideo,
  }));
  const audioMediaInfo = mediaManifest.audioAssets.map((audio) => ({
    audioRId: audio.audioRId,
    mediaRId: audio.mediaRId,
  }));

  const chartFallbackRIds = chartManifest.charts.map((chart) => chart.fallbackRId ?? "");
  const svgRIds = mediaManifest.svgAssets.map((asset) => asset.svgRId);
  const fallbackArtifactManifest = buildFallbackArtifactManifest(
    slideIndex,
    layoutTree,
    mediaManifest,
    chartManifest,
  );

  const result = serializeSlideTree(layoutTree, {
    mediaRIds,
    chartRIds,
    hyperlinkRIdStart,
    fillMediaRIds,
    videoMediaInfo,
    audioMediaInfo,
    chartAssets: chartManifest.charts,
    chartFallbackRIds,
    svgRIds,
  });

  // Add web video hyperlink relationships
  for (const va of mediaManifest.videoAssets) {
    if (va.webVideo) {
      result.hyperlinkRels.push({
        rId: va.webVideo.hyperlinkRId,
        url: va.webVideo.watchUrl,
        external: true,
      });
    }
  }

  let slideTransition = slide.transition;
  if (!slideTransition && !lite && hasMorphIdInTree(layoutTree)) {
    slideTransition = { type: "morph", duration: 500 };
  }
  // Morph transitions are a Pro feature — gate at serialization time
  if (slideTransition?.type === "morph" && lite) {
    throw new PaperError(
      "Morph transitions are not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.",
      { code: "FEATURE_REQUIRES_UPGRADE", phase: "serialization" },
    );
  }
  const transitionXml = generateTransitionXml(slideTransition);
  const timingXml = lite
    ? ""
    : generateTimingXml(
        result.animationManifest,
        result.emittedShapeIds,
        result.chartBuildEntries,
        result.mediaPlaybackEntries,
      );

  return {
    xml: result.xml,
    mediaManifest,
    chartManifest,
    fallbackArtifactManifest,
    hyperlinkRels: result.hyperlinkRels,
    transitionXml,
    timingXml,
    compatibilityReport,
  };
}

export interface SlideResultCollector {
  slideContents: string[];
  slideMediaManifests: SlideMediaManifest[];
  slideChartManifests: SlideChartManifest[];
  slideFallbackArtifactManifests: FallbackArtifactManifest[];
  slideHyperlinkRels: HyperlinkRel[][];
  slideTransitionXmls: string[];
  slideTimingXmls: string[];
  slideBackgrounds: (SlideBackground | undefined)[];
  slideNotes: (string | Paragraph[] | undefined)[];
  slideHeaderFooters: (HeaderFooter | undefined)[];
  slideBgImageAssets: (MediaAsset | undefined)[];
  slideCompatibilityReports: SlideCompatibilityReport[];
}

export function createSlideResultCollector(): SlideResultCollector {
  return {
    slideContents: [],
    slideMediaManifests: [],
    slideChartManifests: [],
    slideFallbackArtifactManifests: [],
    slideHyperlinkRels: [],
    slideTransitionXmls: [],
    slideTimingXmls: [],
    slideBackgrounds: [],
    slideNotes: [],
    slideHeaderFooters: [],
    slideBgImageAssets: [],
    slideCompatibilityReports: [],
  };
}

function computeBackgroundImageRId(
  slideResult: SlideProcessingResult,
): string {
  const bgVideoAudioRIdCount = countVideoAudioRIds(
    slideResult.mediaManifest.videoAssets,
    slideResult.mediaManifest.audioAssets.length,
  );
  const bgSvgCount = slideResult.mediaManifest.svgAssets.length;
  const bgChartStartRId = computeChartStartRId(
    slideResult.mediaManifest.assets.length,
    slideResult.mediaManifest.fillAssets.length,
    bgVideoAudioRIdCount,
    bgSvgCount,
  );
  const chartCount = countChartRelationshipSlots(slideResult.chartManifest);
  const hyperlinkRIdStart = bgChartStartRId + chartCount;
  return `rId${hyperlinkRIdStart + slideResult.hyperlinkRels.length + 1}`;
}

export async function collectSlideResult(
  collector: SlideResultCollector,
  slide: { background?: SlideBackground; notes?: string | Paragraph[]; headerFooter?: HeaderFooter },
  slideResult: SlideProcessingResult,
  slideIdx: number,
  counters: SlideProcessingCounters,
  renderSignal?: AbortSignal,
): Promise<void> {
  collector.slideContents.push(slideResult.xml);
  collector.slideMediaManifests.push(slideResult.mediaManifest);
  collector.slideChartManifests.push(slideResult.chartManifest);
  collector.slideFallbackArtifactManifests.push(slideResult.fallbackArtifactManifest);
  collector.slideHyperlinkRels.push(slideResult.hyperlinkRels);
  collector.slideTransitionXmls.push(slideResult.transitionXml);
  collector.slideTimingXmls.push(slideResult.timingXml);
  collector.slideBackgrounds.push(slide.background);
  collector.slideCompatibilityReports.push(slideResult.compatibilityReport);

  if (slide.background?.type === "image") {
    const bgRId = computeBackgroundImageRId(slideResult);
    const bgAsset = await processBackgroundImage(
      slide.background as ImageBackground,
      counters.globalMediaCounter,
      bgRId,
      slideIdx,
      counters.mediaDeduplicationMap,
      renderSignal,
      counters.mediaFetchBudget,
    );
    collector.slideBgImageAssets.push(bgAsset);
  } else {
    collector.slideBgImageAssets.push(undefined);
  }

  collector.slideNotes.push(slide.notes);
  collector.slideHeaderFooters.push(slide.headerFooter);
}
