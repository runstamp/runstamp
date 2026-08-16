// src/ooxml/chart/index.ts — Chart pipeline: collect, process, barrel export

import type { LayoutNode, LayoutChart } from "../../layout/extract.js";
import type { ThemeColorScheme } from "../../types/ast.js";
import { generateChartXml, generateChartDrawingXml } from "./chartXml.js";
import { generateChartExRels, generateChartRelsSimple, generateChartRelsWithDrawingSimple } from "./chartRels.js";
import { generateExcelBuffer } from "./excelEmitter.js";
import { generateChartExXml } from "./chartExXml.js";
import { isChartExType } from "./chartCapabilities.js";
import { rasterizeChart } from "./rasterizer.js";
import { collectLayoutNodes } from "../../layout/traverse.js";
import { isLiteBundle } from "../../engineMode.js";
import { PaperError } from "../../errors.js";

/**
 * Chart types supported in free mode.
 * Unsupported types throw FEATURE_REQUIRES_UPGRADE with pricing link.
 */
const FREE_CHART_TYPES_SET: ReadonlySet<string> = new Set([
  "bar",
  "line",
  "pie",
  "doughnut",
  "scatter",
  "area",
]);

export interface ChartAsset {
  chartIndex: number;       // Global chart index (chart1/chartEx1, chart2/chartEx2, ...)
  rId?: string;             // rId for slide rels
  chartXml?: string;        // Full chart XML
  chartRelsXml?: string;    // Chart's .rels file
  excelBuffer?: Buffer;     // Embedded .xlsx
  isChartEx?: boolean;      // true for ChartEx (cx:chart) charts
  chartDrawingXml?: string; // Optional chart drawing for annotations
  fallbackPng?: Buffer;             // Rasterized PNG fallback image
  fallbackRId?: string;             // rId for fallback image in slide rels
  fallbackMediaPath?: string;       // ZIP path: ppt/media/imageN.png
  fallbackRelativePath?: string;    // Relative path: ../media/imageN.png
  renderMode?: "native" | "alternate" | "image-only";
}

export interface SlideChartManifest {
  charts: ChartAsset[];
}

export function countChartRelationshipSlots(manifest: SlideChartManifest): number {
  return manifest.charts.reduce((sum, chart) => {
    let count = sum;
    if (chart.rId) count += 1;
    if (chart.fallbackRId) count += 1;
    return count;
  }, 0);
}

/**
 * DFS collector: returns Chart nodes in traversal order, mirroring collectImageNodes.
 */
export function collectChartNodes(node: LayoutNode): LayoutNode[] {
  return collectLayoutNodes(node, candidate => candidate.type === "Chart", { skipHidden: true });
}

/**
 * Processes all Chart nodes in a slide's layout tree.
 *
 * @param layoutTree            Root LayoutNode for a single slide.
 * @param globalChartCounter    Shared mutable counter for classic chart numbering.
 * @param startRId              The next available rId number for this slide (after images).
 * @param globalChartExCounter  Shared mutable counter for ChartEx chart numbering.
 * @param globalMediaCounter    Shared mutable counter for global media numbering (for fallback PNGs).
 * @param enableFallbackImages  When true, rasterize charts to PNG fallback images.
 * @returns SlideChartManifest with chart XML, rels, and Excel buffers.
 */
export async function processSlideCharts(
  layoutTree: LayoutNode,
  globalChartCounter: { current: number },
  startRId: number,
  globalChartExCounter: { current: number } = { current: 1 },
  globalMediaCounter?: { current: number },
  enableFallbackImages?: boolean,
  themeColors?: ThemeColorScheme,
): Promise<SlideChartManifest> {
  const chartNodes = collectChartNodes(layoutTree);
  if (chartNodes.length === 0) return { charts: [] };

  // Phase 1: Eagerly pre-allocate all indices and rIds so counters are
  // deterministic regardless of async execution order.
  const free = isLiteBundle();
  let rIdCounter = startRId;
  const allocations = chartNodes.map((chartNode) => {
    const chartData = (chartNode as LayoutChart).chartData;

    if (free) {
      if (!FREE_CHART_TYPES_SET.has(chartData.chartType)) {
        throw new PaperError(
          `Chart type "${chartData.chartType}" requires Runstamp Pro. ` +
            `Free tier supports: bar, line, pie, doughnut, scatter, area. ` +
            `See https://runstamp.com/pricing`,
          { code: "FEATURE_REQUIRES_UPGRADE", phase: "chart" },
        );
      }
      if (chartData.series?.some((s: any) => s.overrideType !== undefined)) {
        throw new PaperError(
          `Combo charts (mixed chart types) are not available in the size-constrained @runstamp/pptx lite bundle; install @runstamp/pptx for the full engine.`,
          { code: "FEATURE_REQUIRES_UPGRADE", phase: "chart" },
        );
      }
    }

    const isChartEx = isChartExType(chartData.chartType);
    const compatibilityMode = chartNode._compatibility?.mode;
    const imageOnly = compatibilityMode === "visual_fallback";
    const chartIndex = imageOnly
      ? 0
      : isChartEx
        ? globalChartExCounter.current++
        : globalChartCounter.current++;
    const rId = imageOnly ? undefined : `rId${rIdCounter++}`;

    // Pre-allocate fallback slots if enabled (unused slots are harmless in OOXML)
    let fallbackRId: string | undefined;
    let mediaIdx: number | undefined;
    const requiresFallbackImage = imageOnly || enableFallbackImages;
    if (requiresFallbackImage && !globalMediaCounter) {
      throw new PaperError(
        "Chart fallback rasterization was required, but no media allocation context was available for the fallback image.",
        {
          code: "PPTX_CHART_FALLBACK_MISSING",
          phase: "chart",
        },
      );
    }
    if (requiresFallbackImage && globalMediaCounter) {
      fallbackRId = `rId${rIdCounter++}`;
      mediaIdx = globalMediaCounter.current++;
    }

    return {
      chartNode,
      chartData,
      isChartEx,
      chartIndex,
      rId,
      fallbackRId,
      mediaIdx,
      imageOnly,
      requiresFallbackImage,
    };
  });

  // Phase 2: Process all charts in parallel (rasterization + Excel generation).
  const charts = await Promise.all(allocations.map(async (alloc) => {
    const { chartNode, chartData, isChartEx, chartIndex, rId, imageOnly } = alloc;

    // Fallback image rasterization
    let fallbackRId: string | undefined;
    let fallbackPng: Buffer | undefined;
    let fallbackMediaPath: string | undefined;
    let fallbackRelativePath: string | undefined;

    if (alloc.requiresFallbackImage && alloc.fallbackRId != null && alloc.mediaIdx != null) {
      const { width, height } = chartNode.layout;
      fallbackPng = await rasterizeChart(chartData, { width, height }, themeColors);
      if (!fallbackPng) {
        throw new PaperError(
          "Chart fallback rasterization was required, but no fallback image artifact was produced.",
          {
            code: "PPTX_CHART_FALLBACK_MISSING",
            phase: "chart",
          },
        );
      }
      if (fallbackPng) {
        fallbackRId = alloc.fallbackRId;
        fallbackMediaPath = `ppt/media/image${alloc.mediaIdx}.png`;
        fallbackRelativePath = `../media/image${alloc.mediaIdx}.png`;
      }
    }

    // Generate Excel data workbook
    let excelBuffer: Buffer | undefined;
    let chartXml: string | undefined;
    let chartRelsXml: string | undefined;
    let chartDrawingXml: string | undefined;

    if (!imageOnly) {
      excelBuffer = await generateExcelBuffer(chartData);
      const textAnnotationCount = (chartData.annotations ?? []).reduce(
        (count, a) => count + ((a.kind ?? "text") === "text" ? 1 : 0),
        0,
      );
      const hasAnnotations = !isChartEx && textAnnotationCount > 0;
      const prefix = isChartEx ? `chartEx${chartIndex}` : `chart${chartIndex}`;
      const excelRelPath = `../embeddings/${prefix}.xlsx`;

      if (isChartEx) {
        chartXml = generateChartExXml(chartData, "rId1");
        chartRelsXml = generateChartExRels(excelRelPath);
      } else {
        chartXml = generateChartXml(chartData, "rId1", { width: chartNode.layout.width, height: chartNode.layout.height });
        if (hasAnnotations) {
          chartDrawingXml = generateChartDrawingXml(chartData.annotations!);
          chartRelsXml = generateChartRelsWithDrawingSimple(excelRelPath, `../drawings/drawing${chartIndex}.xml`);
        } else {
          chartRelsXml = generateChartRelsSimple(excelRelPath);
        }
      }
    }

    return {
      chartIndex,
      rId,
      chartXml,
      chartRelsXml,
      excelBuffer,
      isChartEx,
      chartDrawingXml,
      fallbackPng,
      fallbackRId,
      fallbackMediaPath,
      fallbackRelativePath,
      renderMode: imageOnly ? "image-only" : (fallbackRId ? "alternate" : "native"),
    } satisfies ChartAsset;
  }));

  return { charts };
}

export { generateChartXml, generateChartDrawingXml } from "./chartXml.js";
export { generateChartExRels, generateChartRelsSimple, generateChartRelsWithDrawingSimple } from "./chartRels.js";
export { generateExcelBuffer } from "./excelEmitter.js";
export { colLetter } from "./chartXml.js";
export {
  getChartCapabilityProfile,
  getChartExcelLayout,
  isChartExType,
  isPieLikeChartType,
  isXYChartType,
  supportsPerSeriesMarker,
  usesClassicAxes,
  usesSyntheticSpacerSeries,
  usesValueAxesOnly,
} from "./chartCapabilities.js";
export { generateChartExXml } from "./chartExXml.js";
export { rasterizeChart, renderChartToSvg, mapChartDataToEChartsOption } from "./rasterizer.js";
export { resolveColorToHex, DEFAULT_SCHEME } from "./chartColorResolver.js";
