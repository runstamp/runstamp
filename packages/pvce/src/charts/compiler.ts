/**
 * PVCE (Precision-Vector Charting Engine) - Main Compiler
 * =======================================================
 *
 * This is the core compiler that implements all four PVCE documents:
 * - Doc 1: Deterministic Scene Graph & Compiler Architecture
 * - Doc 2: Typographic Precision & Label Collision Logic
 * - Doc 3: Sub-Pixel Vector Normalization & Scaling
 * - Doc 4: Print-Specific Color & Accessible Data Structures
 *
 * The compiler follows a strict "Input to IR" pipeline:
 * 1. Validate input
 * 2. Calculate scales
 * 3. Generate Scene Graph (IR)
 * 4. Render to SVG
 */

import {
  ChartInput,
  ChartType,
  SceneGraph,
  SceneNode,
  CompilationResult,
  CompilationStats,
  AccessibilityMetadata,
  XMPMetadata,
  LBU,
  Rect,
  Point,
  PatternDefinition,
  CollisionLevel,
  VIRTUAL_CANVAS,
  ValidationWarning,
} from "./types.js";

import { GlyphOracle, glyphOracle } from "./glyph-oracle.js";
import { AxisCollisionSolver, collisionSolver } from "./collision-solver.js";
import { SVGRenderer, SVGRenderOptions } from "./svg-renderer.js";
import {
  ColorPipeline,
  colorPipeline,
  DEFAULT_PALETTE_COLORS,
} from "./color-pipeline.js";
import {
  AccessibilityGenerator,
  accessibilityGenerator,
  ChartData,
} from "./accessibility.js";
import {
  hashData,
  generateNodeId,
  stripAnimations,
  validateDeterminism,
  createSeededRandom,
  SeededRandom,
} from "./determinism.js";
import { PathOptimizer, pathOptimizer } from "./path-optimizer.js";

// =============================================================================
// COMPILER CONFIGURATION
// =============================================================================

/** Compiler options */
export interface CompilerOptions {
  /** Output SVG width */
  width?: number;
  /** Output SVG height */
  height?: number;
  /** Font family for labels */
  fontFamily?: string;
  /** Base font size */
  fontSize?: number;
  /** Enable accessibility features */
  accessibility?: boolean;
  /** Enable monochrome mode */
  monochrome?: boolean;
  /** Enable pattern overlays */
  patterns?: boolean;
  /** Embed source data in XMP */
  embedSourceData?: boolean;
  /** Custom color palette */
  palette?: string[];
  /** Deterministic seed (auto-derived from data if not provided) */
  seed?: number;
  /** Pretty-print SVG output */
  prettyPrint?: boolean;
}

const DEFAULT_COMPILER_OPTIONS: Required<CompilerOptions> = {
  width: 800,
  height: 600,
  fontFamily: "Arial",
  fontSize: 12,
  accessibility: true,
  monochrome: false,
  patterns: false,
  embedSourceData: true,
  palette: DEFAULT_PALETTE_COLORS,
  seed: 0,
  prettyPrint: false,
};

interface NormalizedSeries {
  name: string;
  values: Array<number | null>;
}

interface NormalizedMultiSeriesData {
  categories: string[];
  series: NormalizedSeries[];
}

// =============================================================================
// MAIN PVCE COMPILER CLASS
// =============================================================================

/**
 * PVCECompiler - The main charting engine compiler.
 *
 * Implements all requirements from Documents 1-4:
 * - Pure function pipeline (Doc 1)
 * - Glyph Oracle & collision detection (Doc 2)
 * - SVG-first rendering with sub-pixel snapping (Doc 3)
 * - Accessibility & color management (Doc 4)
 */
export class PVCECompiler {
  private glyphOracle: GlyphOracle;
  private collisionSolver: AxisCollisionSolver;
  private svgRenderer: SVGRenderer;
  private colorPipeline: ColorPipeline;
  private accessibilityGenerator: AccessibilityGenerator;
  private pathOptimizer: PathOptimizer;
  private options: Required<CompilerOptions>;
  private warnings: ValidationWarning[] = [];

  // Stats tracking
  private stats: CompilationStats = {
    compileTime: 0,
    nodeCount: 0,
    svgSize: 0,
    pathOptimization: 0,
    glyphCacheHits: 0,
    collisionsResolved: 0,
  };

  constructor(options: CompilerOptions = {}) {
    this.options = { ...DEFAULT_COMPILER_OPTIONS, ...options };

    this.glyphOracle = glyphOracle;
    this.collisionSolver = collisionSolver;
    this.svgRenderer = new SVGRenderer({
      width: this.options.width,
      height: this.options.height,
      prettyPrint: this.options.prettyPrint,
      includeAccessibility: this.options.accessibility,
    });
    this.colorPipeline = new ColorPipeline({
      colorMode: this.options.monochrome ? "monochrome" : "rgb",
      enablePatterns: this.options.patterns,
      palette: this.options.palette,
    });
    this.accessibilityGenerator = accessibilityGenerator;
    this.pathOptimizer = pathOptimizer;
  }

  /**
   * Compile a chart to Scene Graph and SVG.
   * This is the main entry point - Doc 1, Section 2: The Pure-Function Pipeline.
   */
  compile<T>(chartType: ChartType, input: ChartInput<T>): CompilationResult {
    const startTime = performance.now();
    this.resetStats();

    // Step 1: Generate data hash for determinism (Doc 1, Section 3)
    const dataHash = hashData(input.data);
    const seed = this.options.seed || this.deriveSeed(dataHash);
    const random = createSeededRandom(input.data);

    // Step 2: Build Scene Graph based on chart type
    const viewBox = {
      width: VIRTUAL_CANVAS.WIDTH,
      height: VIRTUAL_CANVAS.HEIGHT,
    };

    const bounds: Rect = {
      x: 500,
      y: 500,
      width: viewBox.width - 1000,
      height: viewBox.height - 1000,
    };

    let root: SceneNode;
    let chartData: ChartData;

    switch (chartType) {
      case "bar":
        ({ root, chartData } = this.compileBarChart(input, bounds, random));
        break;
      case "marimekko":
        this.warnings.push({
          code: "UNSUPPORTED_CHART_TYPE",
          message:
            'Chart type "marimekko" is not natively supported, rendered as bar.',
          path: "chartType",
          value: chartType,
          suggestion: 'Use "bar" for the current fallback behavior.',
        });
        ({ root, chartData } = this.compileBarChart(input, bounds, random));
        break;
      case "area":
        ({ root, chartData } = this.compileAreaChart(input, bounds));
        break;
      case "stacked-bar":
        ({ root, chartData } = this.compileStackedBarChart(input, bounds));
        break;
      case "grouped-bar":
        ({ root, chartData } = this.compileGroupedBarChart(input, bounds));
        break;
      case "combo":
        ({ root, chartData } = this.compileComboChart(input, bounds));
        break;
      case "line":
        ({ root, chartData } = this.compileLineChart(input, bounds, random));
        break;
      case "scatter":
        ({ root, chartData } = this.compileScatterChart(input, bounds, random));
        break;
      case "pie":
      case "donut":
        ({ root, chartData } = this.compilePieChart(
          input,
          bounds,
          chartType === "donut",
        ));
        break;
      case "waterfall":
        ({ root, chartData } = this.compileWaterfallChart(input, bounds));
        break;
      default:
        this.warnings.push({
          code: "UNKNOWN_CHART_TYPE",
          message: `Unknown chart type "${String(chartType)}"; rendered with the bar chart fallback.`,
          path: "chartType",
          value: chartType,
          suggestion: "Use one of the chart types exported by ChartType.",
        });
        ({ root, chartData } = this.compileBarChart(input, bounds, random));
    }

    // Step 3: Strip animations (Doc 1, Section 4: Zero-Animation Policy)
    root = stripAnimations(root);

    // Step 4: Generate accessibility metadata (Doc 4, Section 4)
    const accessibility = this.options.accessibility
      ? this.accessibilityGenerator.generateMetadata(
          chartType,
          chartData,
          input.config?.title,
        )
      : this.createMinimalAccessibility(chartType);

    // Step 5: Generate XMP metadata (Doc 4, Section 5)
    const xmpMetadata = this.options.embedSourceData
      ? this.accessibilityGenerator.generateXMPMetadata(chartType, input.data)
      : this.createMinimalXMP(chartType);

    // Step 6: Build Scene Graph
    const patterns = this.colorPipeline.shouldUsePatterns(
      (input.data as any)?.series?.length ?? 1,
    )
      ? this.generatePatterns((input.data as any)?.series?.length ?? 5)
      : [];

    const sceneGraph: SceneGraph = {
      version: "1.0.0",
      viewBox,
      root,
      metadata: {
        dataHash,
        generatedAt: Date.now(),
        deterministicSeed: seed,
        chartType,
        accessibility,
      },
      defs: patterns.length > 0 ? { patterns } : undefined,
    };

    // Step 7: Validate determinism (Doc 1, Section 6)
    const validation = validateDeterminism(sceneGraph);
    if (!validation.valid) {
      console.warn("Determinism validation warnings:", validation.warnings);
    }

    // Step 8: Render to SVG (Doc 3)
    const svg = this.svgRenderer.render(sceneGraph);

    // Calculate final stats
    const endTime = performance.now();
    this.stats.compileTime = Math.round(endTime - startTime);
    this.stats.nodeCount = this.countNodes(root);
    this.stats.svgSize = new Blob([svg]).size;
    this.stats.glyphCacheHits = this.glyphOracle.getStats().cacheHits;

    return {
      sceneGraph,
      svg,
      accessibility,
      xmpMetadata,
      stats: { ...this.stats },
      warnings: [...this.warnings],
    };
  }

  // ===========================================================================
  // CHART TYPE COMPILERS
  // ===========================================================================

  /**
   * Compile a bar chart.
   */
  private compileBarChart(
    input: ChartInput<any>,
    bounds: Rect,
    _random: SeededRandom,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeBarData(input.data);
    const { categories, values, series } = data;

    const children: SceneNode[] = [];
    const barPadding = 100;
    const barWidth =
      values.length > 0
        ? (bounds.width - barPadding * (values.length + 1)) / values.length
        : 0;

    const [minValue, maxValue] = this.getNumericDomain(values, true);
    const range = maxValue - minValue || 1;

    // Calculate axis label space (Doc 2: Fixed Gutter Strategy)
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };

    // Zero line position
    const zeroY = plotBounds.y + plotBounds.height * (maxValue / range);

    // Create bars
    values.forEach((value, i) => {
      const barX = plotBounds.x + barPadding + i * (barWidth + barPadding);
      const barHeight = Math.abs(value / range) * plotBounds.height;
      const barY = value >= 0 ? zeroY - barHeight : zeroY;

      const color = this.colorPipeline.getSeriesColor(i % series.length);
      const pattern = this.colorPipeline.getSeriesPattern(i % series.length);

      const bar: SceneNode = {
        type: "rect",
        id: generateNodeId("bar", i),
        x: this.snap(barX),
        y: this.snap(barY),
        attributes: {
          width: barWidth,
          height: barHeight,
          fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
          stroke: color.hex,
          strokeWidth: 1,
          role: "graphics-symbol",
          ariaLabel: `${categories[i]}: ${value}`,
        },
        metadata: {
          dataIndex: i,
          dataValue: value,
          category: categories[i],
        },
      };

      children.push(bar);
    });

    // Create X-axis with collision handling (Doc 2, Section 3)
    const xAxisLabels = this.createXAxisLabels(
      categories,
      plotBounds,
      xAxisHeight,
    );
    children.push(...xAxisLabels);

    // Create Y-axis
    const yAxisLabels = this.createYAxisLabels(
      minValue,
      maxValue,
      bounds,
      yAxisWidth,
    );
    children.push(...yAxisLabels);

    // Create grid lines
    children.push(this.createGridLines(plotBounds, minValue, maxValue));

    const root: SceneNode = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {
        role: "graphics-document",
      },
      children,
    };

    return {
      root,
      chartData: {
        values,
        categories,
        valueType: "number",
      },
    };
  }

  /**
   * Compile independently scaled series as overlapping translucent areas.
   *
   * The line compiler treats every series as an independent path on one shared
   * scale, so area follows that convention instead of cumulatively stacking.
   * Fills are emitted before strokes, in series order, to keep every outline
   * legible while overlapping colors remain visible.
   */
  private compileAreaChart(
    input: ChartInput<any>,
    bounds: Rect,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeMultiSeriesData(input.data);
    const finiteValues = this.getFiniteSeriesValues(data.series);
    const [minValue, maxValue] = this.getNumericDomain(finiteValues, true);
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };
    const zeroY = this.scaleY(0, minValue, maxValue, plotBounds);
    const children: SceneNode[] = [];
    const seriesPaths = data.series.map((series) => {
      const points = this.createSeriesPoints(
        series.values,
        data.categories.length,
        minValue,
        maxValue,
        plotBounds,
      );
      return {
        points,
        optimized: this.pathOptimizer.simplifyPath(points),
      };
    });

    seriesPaths.forEach(({ points, optimized }, seriesIndex) => {
      if (points.length === 0) return;
      this.stats.pathOptimization = Math.max(
        this.stats.pathOptimization,
        optimized.savings,
      );
      const first = points[0];
      const last = points[points.length - 1];
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const pattern = this.colorPipeline.getSeriesPattern(seriesIndex);

      children.push({
        type: "path",
        id: generateNodeId("area-fill", seriesIndex),
        x: 0,
        y: 0,
        attributes: {
          d: `${optimized.pathData} L${this.snap(last.x)},${this.snap(zeroY)} L${this.snap(first.x)},${this.snap(zeroY)} Z`,
          fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
          opacity: 0.35,
          role: "graphics-symbol",
          ariaLabel: `${data.series[seriesIndex].name} area series`,
        },
        metadata: { seriesName: data.series[seriesIndex].name },
      });
    });

    seriesPaths.forEach(({ points, optimized }, seriesIndex) => {
      if (points.length === 0) return;
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      children.push({
        type: "path",
        id: generateNodeId("area-line", seriesIndex),
        x: 0,
        y: 0,
        attributes: {
          d: optimized.pathData,
          fill: "none",
          stroke: color.hex,
          strokeWidth: 2,
        },
        metadata: { seriesName: data.series[seriesIndex].name },
      });
    });

    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight),
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth),
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));

    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data),
    };
  }

  /**
   * Compile bars with separate positive and negative accumulators per category.
   * Negative segments are supported and stack below zero instead of being
   * discarded, preserving both their sign and their contribution to the domain.
   */
  private compileStackedBarChart(
    input: ChartInput<any>,
    bounds: Rect,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeMultiSeriesData(input.data);
    const positiveTotals = data.categories.map((_, categoryIndex) =>
      data.series.reduce((sum, series) => {
        const value = series.values[categoryIndex];
        return value !== null && value > 0 ? sum + value : sum;
      }, 0)
    );
    const negativeTotals = data.categories.map((_, categoryIndex) =>
      data.series.reduce((sum, series) => {
        const value = series.values[categoryIndex];
        return value !== null && value < 0 ? sum + value : sum;
      }, 0)
    );
    const [minValue, maxValue] = this.getNumericDomain(
      [...negativeTotals, ...positiveTotals],
      true,
    );
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };
    const slotWidth = data.categories.length > 0
      ? plotBounds.width / data.categories.length
      : 0;
    const groupWidth = slotWidth * 0.8;
    const positiveOffsets = data.categories.map(() => 0);
    const negativeOffsets = data.categories.map(() => 0);
    const children: SceneNode[] = [];

    data.series.forEach((series, seriesIndex) => {
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const pattern = this.colorPipeline.getSeriesPattern(seriesIndex);
      series.values.forEach((value, categoryIndex) => {
        if (value === null) return;
        const startValue = value >= 0
          ? positiveOffsets[categoryIndex]
          : negativeOffsets[categoryIndex];
        const endValue = startValue + value;
        if (value >= 0) positiveOffsets[categoryIndex] = endValue;
        else negativeOffsets[categoryIndex] = endValue;
        const startY = this.scaleY(startValue, minValue, maxValue, plotBounds);
        const endY = this.scaleY(endValue, minValue, maxValue, plotBounds);
        const x =
          plotBounds.x +
          categoryIndex * slotWidth +
          (slotWidth - groupWidth) / 2;

        children.push({
          type: "rect",
          id: `stacked-bar-${seriesIndex}-${categoryIndex}`,
          x: this.snap(x),
          y: this.snap(Math.min(startY, endY)),
          attributes: {
            width: groupWidth,
            height: Math.abs(endY - startY),
            fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
            stroke: "#ffffff",
            strokeWidth: 1,
            role: "graphics-symbol",
            ariaLabel: `${series.name}, ${data.categories[categoryIndex]}: ${value}`,
          },
          metadata: {
            dataIndex: categoryIndex,
            dataValue: value,
            category: data.categories[categoryIndex],
            seriesName: series.name,
          },
        });
      });
    });

    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight),
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth),
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));

    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data),
    };
  }

  /** Compile side-by-side series with 20% group gaps and 10% inter-bar gaps. */
  private compileGroupedBarChart(
    input: ChartInput<any>,
    bounds: Rect,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeMultiSeriesData(input.data);
    const finiteValues = this.getFiniteSeriesValues(data.series);
    const [minValue, maxValue] = this.getNumericDomain(finiteValues, true);
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };
    const slotWidth = data.categories.length > 0
      ? plotBounds.width / data.categories.length
      : 0;
    const groupWidth = slotWidth * 0.8;
    const seriesCount = data.series.length;
    const barWidth = seriesCount > 0
      ? groupWidth / (seriesCount + Math.max(0, seriesCount - 1) * 0.1)
      : 0;
    const barGap = barWidth * 0.1;
    const zeroY = this.scaleY(0, minValue, maxValue, plotBounds);
    const children: SceneNode[] = [];

    data.series.forEach((series, seriesIndex) => {
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const pattern = this.colorPipeline.getSeriesPattern(seriesIndex);
      series.values.forEach((value, categoryIndex) => {
        if (value === null) return;
        const valueY = this.scaleY(value, minValue, maxValue, plotBounds);
        const groupX =
          plotBounds.x +
          categoryIndex * slotWidth +
          (slotWidth - groupWidth) / 2;
        const x = groupX + seriesIndex * (barWidth + barGap);

        children.push({
          type: "rect",
          id: `grouped-bar-${seriesIndex}-${categoryIndex}`,
          x,
          y: Math.min(zeroY, valueY),
          attributes: {
            width: barWidth,
            height: Math.abs(valueY - zeroY),
            fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
            stroke: color.hex,
            strokeWidth: 1,
            role: "graphics-symbol",
            ariaLabel: `${series.name}, ${data.categories[categoryIndex]}: ${value}`,
          },
          metadata: {
            dataIndex: categoryIndex,
            dataValue: value,
            category: data.categories[categoryIndex],
            seriesName: series.name,
          },
        });
      });
    });

    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight),
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth),
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));

    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data),
    };
  }

  /**
   * Compile the first series as bars and the second as a line. A secondary
   * right-hand scale is used only when both series have nonzero magnitudes and
   * the larger max-absolute magnitude is more than 10x the smaller one.
   */
  private compileComboChart(
    input: ChartInput<any>,
    bounds: Rect,
  ): { root: SceneNode; chartData: ChartData } {
    const normalized = this.normalizeMultiSeriesData(input.data);
    const data: NormalizedMultiSeriesData = {
      categories: normalized.categories,
      series: normalized.series.slice(0, 2),
    };
    const barSeries = data.series[0] ?? { name: "Series 1", values: [] };
    const lineSeries = data.series[1] ?? { name: "Series 2", values: [] };
    const barValues = barSeries.values.filter(
      (value): value is number => value !== null,
    );
    const lineValues = lineSeries.values.filter(
      (value): value is number => value !== null,
    );
    const barMagnitude = this.maxAbsoluteValue(barValues);
    const lineMagnitude = this.maxAbsoluteValue(lineValues);
    const smallerMagnitude = Math.min(barMagnitude, lineMagnitude);
    const largerMagnitude = Math.max(barMagnitude, lineMagnitude);
    const useSecondaryAxis =
      smallerMagnitude > 0 && largerMagnitude / smallerMagnitude > 10;

    const [leftMin, leftMax] = this.getNumericDomain(
      useSecondaryAxis ? barValues : [...barValues, ...lineValues],
      true,
    );
    const [lineMin, lineMax] = useSecondaryAxis
      ? this.getNumericDomain(lineValues, true)
      : [leftMin, leftMax];
    const leftAxisWidth = this.calculateAxisWidth(leftMin, leftMax);
    const rightAxisWidth = useSecondaryAxis
      ? this.calculateAxisWidth(lineMin, lineMax)
      : 0;
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + leftAxisWidth,
      y: bounds.y,
      width: bounds.width - leftAxisWidth - rightAxisWidth,
      height: bounds.height - xAxisHeight,
    };
    const slotWidth = data.categories.length > 0
      ? plotBounds.width / data.categories.length
      : 0;
    const barWidth = slotWidth * 0.55;
    const zeroY = this.scaleY(0, leftMin, leftMax, plotBounds);
    const children: SceneNode[] = [];
    const barColor = this.colorPipeline.getSeriesColor(0);
    const barPattern = this.colorPipeline.getSeriesPattern(0);

    barSeries.values.forEach((value, categoryIndex) => {
      if (value === null) return;
      const valueY = this.scaleY(value, leftMin, leftMax, plotBounds);
      children.push({
        type: "rect",
        id: generateNodeId("combo-bar", categoryIndex),
        x: plotBounds.x + categoryIndex * slotWidth + (slotWidth - barWidth) / 2,
        y: Math.min(zeroY, valueY),
        attributes: {
          width: barWidth,
          height: Math.abs(valueY - zeroY),
          fill: this.options.patterns ? `url(#${barPattern.id})` : barColor.hex,
          stroke: barColor.hex,
          strokeWidth: 1,
          role: "graphics-symbol",
          ariaLabel: `${barSeries.name}, ${data.categories[categoryIndex]}: ${value}`,
        },
        metadata: {
          dataIndex: categoryIndex,
          dataValue: value,
          category: data.categories[categoryIndex],
          seriesName: barSeries.name,
        },
      });
    });

    const linePoints = this.createSeriesPoints(
      lineSeries.values,
      data.categories.length,
      lineMin,
      lineMax,
      plotBounds,
    );
    if (linePoints.length > 0) {
      const optimized = this.pathOptimizer.simplifyPath(linePoints);
      this.stats.pathOptimization = optimized.savings;
      const lineColor = this.colorPipeline.getSeriesColor(1);
      children.push({
        type: "path",
        id: "combo-line",
        x: 0,
        y: 0,
        attributes: {
          d: optimized.pathData,
          fill: "none",
          stroke: lineColor.hex,
          strokeWidth: 2,
          role: "graphics-symbol",
          ariaLabel: `${lineSeries.name} line series${
            useSecondaryAxis ? " on right axis" : ""
          }`,
        },
        metadata: { seriesName: lineSeries.name },
      });

      linePoints.forEach((point, index) => {
        children.push({
          type: "circle",
          id: generateNodeId("combo-dot", index),
          x: this.snap(point.x),
          y: this.snap(point.y),
          attributes: {
            radius: 4,
            fill: lineColor.hex,
            stroke: "#ffffff",
            strokeWidth: 1.5,
          },
        });
      });
    }

    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight),
    );
    children.push(
      ...this.createYAxisLabels(leftMin, leftMax, bounds, leftAxisWidth),
    );
    if (useSecondaryAxis) {
      children.push(...this.createRightYAxisLabels(lineMin, lineMax, plotBounds));
    }
    children.push(this.createGridLines(plotBounds, leftMin, leftMax));

    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data, useSecondaryAxis),
    };
  }

  /**
   * Compile a line chart with path optimization (Doc 3, Section 2).
   */
  private compileLineChart(
    input: ChartInput<any>,
    bounds: Rect,
    _random: SeededRandom,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeLineData(input.data);
    const { categories, values, series } = data;

    const children: SceneNode[] = [];

    const [minValue, maxValue] = this.getNumericDomain(values.flat());
    const range = maxValue - minValue || 1;

    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };

    // Create line paths for each series
    series.forEach((seriesData, seriesIndex) => {
      const points: Point[] = seriesData.map((value, i) => ({
        x: plotBounds.x + (i / (seriesData.length - 1 || 1)) * plotBounds.width,
        y:
          plotBounds.y +
          plotBounds.height -
          ((value - minValue) / range) * plotBounds.height,
      }));

      // Optimize path (Doc 3, Section 2)
      const optimized = this.pathOptimizer.simplifyPath(points);
      this.stats.pathOptimization = optimized.savings;

      const color = this.colorPipeline.getSeriesColor(seriesIndex);

      const line: SceneNode = {
        type: "path",
        id: generateNodeId("line", seriesIndex),
        x: 0,
        y: 0,
        attributes: {
          d: optimized.pathData,
          stroke: color.hex,
          strokeWidth: 2,
          fill: "none",
          vectorEffect: "non-scaling-stroke",
        },
        metadata: {
          seriesName: `Series ${seriesIndex + 1}`,
        },
      };

      children.push(line);

      // Add data points
      points.forEach((point, i) => {
        const dot: SceneNode = {
          type: "circle",
          id: generateNodeId(`dot-${seriesIndex}`, i),
          x: this.snap(point.x),
          y: this.snap(point.y),
          attributes: {
            radius: 4,
            fill: color.hex,
            stroke: "#ffffff",
            strokeWidth: 1.5,
          },
          metadata: {
            dataIndex: i,
            dataValue: seriesData[i],
          },
        };
        children.push(dot);
      });
    });

    // Axes
    children.push(
      ...this.createXAxisLabels(categories, plotBounds, xAxisHeight),
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth),
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));

    const root: SceneNode = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children,
    };

    return {
      root,
      chartData: {
        values: values.flat(),
        categories,
        valueType: "number",
      },
    };
  }

  /**
   * Compile a scatter chart with label collision detection (Doc 2, Section 4).
   */
  private compileScatterChart(
    input: ChartInput<any>,
    bounds: Rect,
    _random: SeededRandom,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeScatterData(input.data);
    const { points } = data;

    const children: SceneNode[] = [];

    // Calculate ranges
    const xValues = points.map((p) => p.x);
    const yValues = points.map((p) => p.y);
    const [xMin, xMax] = this.getNumericDomain(xValues);
    const [yMin, yMax] = this.getNumericDomain(yValues);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    const yAxisWidth = this.calculateAxisWidth(yMin, yMax);
    const xAxisHeight = 300;
    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };

    // Create dots
    const dotPositions: Array<{ x: LBU; y: LBU; label: string }> = [];

    points.forEach((point, i) => {
      const px = plotBounds.x + ((point.x - xMin) / xRange) * plotBounds.width;
      const py =
        plotBounds.y +
        plotBounds.height -
        ((point.y - yMin) / yRange) * plotBounds.height;

      dotPositions.push({
        x: px,
        y: py,
        label: point.label || `Point ${i + 1}`,
      });

      const color = this.colorPipeline.getSeriesColor(i % 10);

      const dot: SceneNode = {
        type: "circle",
        id: generateNodeId("dot", i),
        x: this.snap(px),
        y: this.snap(py),
        attributes: {
          radius: 6,
          fill: color.hex,
          stroke: "#ffffff",
          strokeWidth: 1.5,
          role: "graphics-symbol",
          ariaLabel: `${point.label}: (${point.x}, ${point.y})`,
        },
        metadata: {
          dataIndex: i,
          dataValue: point.y,
        },
      };

      children.push(dot);
    });

    // Resolve label collisions (Doc 2, Section 4)
    const labelPlacements = this.collisionSolver.resolvePointLabels(
      dotPositions,
      plotBounds,
      this.options.fontSize * 10,
      this.options.fontFamily,
    );

    this.stats.collisionsResolved = labelPlacements.filter(
      (p) => p.collisionLevel !== CollisionLevel.STANDARD,
    ).length;

    // Add labels
    labelPlacements.forEach((placement, i) => {
      const label: SceneNode = {
        type: "text",
        id: generateNodeId("label", i),
        x: this.snap(placement.position.x),
        y: this.snap(placement.position.y),
        attributes: {
          text: placement.text,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#333333",
          textAnchor: "start",
        },
      };
      children.push(label);

      // Add leader line if needed
      if (placement.leaderLine) {
        const line: SceneNode = {
          type: "line",
          id: generateNodeId("leader", i),
          x: 0,
          y: 0,
          attributes: {
            x1: placement.leaderLine.fromPoint.x,
            y1: placement.leaderLine.fromPoint.y,
            x2: placement.leaderLine.toPoint.x,
            y2: placement.leaderLine.toPoint.y,
            stroke: "#999999",
            strokeWidth: 0.5,
          },
        };
        children.push(line);
      }
    });

    // Axes
    children.push(this.createGridLines(plotBounds, yMin, yMax));

    const root: SceneNode = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children,
    };

    return {
      root,
      chartData: {
        values: yValues,
        categories: points.map((p) => p.label || ""),
        valueType: "number",
      },
    };
  }

  /**
   * Compile a pie/donut chart with radial labeling (Doc 2, Section 5).
   */
  private compilePieChart(
    input: ChartInput<any>,
    bounds: Rect,
    isDonut: boolean,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizePieData(input.data);
    const { categories, values } = data;

    const children: SceneNode[] = [];
    const total = values.reduce((sum, value) => sum + Math.abs(value), 0);

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const outerRadius = Math.min(bounds.width, bounds.height) / 2 - 500;
    const innerRadius = isDonut ? outerRadius * 0.5 : 0;

    let currentAngle = -Math.PI / 2; // Start at top

    // Create slices
    const slices: Array<{
      startAngle: number;
      endAngle: number;
      label: string;
      value: number;
    }> = [];

    values.forEach((value, i) => {
      const proportion = total > 0 ? Math.abs(value) / total : 0;
      const sliceAngle = proportion * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      slices.push({
        startAngle,
        endAngle,
        label: categories[i],
        value,
      });

      // Create arc path
      const color = this.colorPipeline.getSeriesColor(i);
      const pattern = this.colorPipeline.getSeriesPattern(i);

      const pathData = this.createArcPath(
        centerX,
        centerY,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
      );

      const slice: SceneNode = {
        type: "path",
        id: generateNodeId("slice", i),
        x: 0,
        y: 0,
        attributes: {
          d: pathData,
          fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
          stroke: "#ffffff",
          strokeWidth: 2,
          role: "graphics-symbol",
          ariaLabel: `${categories[i]}: ${value} (${(proportion * 100).toFixed(1)}%)`,
        },
        metadata: {
          dataIndex: i,
          dataValue: value,
          category: categories[i],
        },
      };

      children.push(slice);
      currentAngle = endAngle;
    });

    // Resolve pie label collisions (Doc 2, Section 5)
    const labelPlacements = this.collisionSolver.resolvePieLabels(
      slices,
      { x: centerX, y: centerY },
      innerRadius,
      outerRadius,
      this.options.fontSize * 10,
      this.options.fontFamily,
    );

    // Add labels and leader lines
    labelPlacements.forEach((placement, i) => {
      const label: SceneNode = {
        type: "text",
        id: generateNodeId("pie-label", i),
        x: this.snap(placement.position.x),
        y: this.snap(placement.position.y),
        attributes: {
          text: placement.text,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#333333",
          textAnchor: placement.box.anchor,
        },
      };
      children.push(label);

      // Leader line
      if (placement.leaderLine) {
        const ll = placement.leaderLine;
        let pathD = `M${ll.fromPoint.x},${ll.fromPoint.y}`;
        if (ll.elbowPoint) {
          pathD += ` L${ll.elbowPoint.x},${ll.elbowPoint.y}`;
        }
        pathD += ` L${ll.toPoint.x},${ll.toPoint.y}`;

        const leaderLine: SceneNode = {
          type: "path",
          id: generateNodeId("pie-leader", i),
          x: 0,
          y: 0,
          attributes: {
            d: pathD,
            stroke: "#999999",
            strokeWidth: 1,
            fill: "none",
          },
        };
        children.push(leaderLine);
      }
    });

    const root: SceneNode = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children,
    };

    return {
      root,
      chartData: {
        values,
        categories,
        valueType: "number",
      },
    };
  }

  /**
   * Compile a waterfall chart.
   */
  private compileWaterfallChart(
    input: ChartInput<any>,
    bounds: Rect,
  ): { root: SceneNode; chartData: ChartData } {
    const data = this.normalizeWaterfallData(input.data);
    const { categories, values, isTotal } = data;

    const children: SceneNode[] = [];

    // Calculate running totals and ranges
    let runningTotal = 0;
    const totals: number[] = [];

    values.forEach((val, i) => {
      if (isTotal[i]) {
        runningTotal = val;
      } else {
        runningTotal += val;
      }
      totals.push(runningTotal);
    });

    const allValues = [...values, ...totals];
    const [minValue, maxValue] = this.getNumericDomain(allValues, true);
    const range = maxValue - minValue || 1;

    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const barPadding = 50;

    const plotBounds: Rect = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight,
    };

    const barWidth =
      values.length > 0
        ? (plotBounds.width - barPadding * (values.length + 1)) / values.length
        : 0;
    const zeroY = plotBounds.y + plotBounds.height * (maxValue / range);

    runningTotal = 0;

    values.forEach((val, i) => {
      let startVal: number;
      let endVal: number;

      if (isTotal[i]) {
        startVal = 0;
        endVal = val;
        runningTotal = val;
      } else {
        startVal = runningTotal;
        endVal = runningTotal + val;
        runningTotal = endVal;
      }

      const startY =
        plotBounds.y + plotBounds.height * ((maxValue - startVal) / range);
      const endY =
        plotBounds.y + plotBounds.height * ((maxValue - endVal) / range);

      const barX = plotBounds.x + barPadding + i * (barWidth + barPadding);
      const barY = Math.min(startY, endY);
      const barHeight = Math.abs(endY - startY);

      // Color based on positive/negative/total
      const colorIndex = isTotal[i] ? 0 : val >= 0 ? 1 : 2;
      const color = this.colorPipeline.getSeriesColor(colorIndex);

      const bar: SceneNode = {
        type: "rect",
        id: generateNodeId("bar", i),
        x: this.snap(barX),
        y: this.snap(barY),
        attributes: {
          width: barWidth,
          height: barHeight,
          fill: color.hex,
          stroke: "#ffffff",
          strokeWidth: 1,
        },
        metadata: {
          dataIndex: i,
          dataValue: val,
          category: categories[i],
        },
      };

      children.push(bar);

      // Connector to next bar
      if (i < values.length - 1 && !isTotal[i + 1]) {
        const connectorY = endY;
        const nextBarX = barX + barWidth + barPadding;

        const connector: SceneNode = {
          type: "line",
          id: generateNodeId("connector", i),
          x: 0,
          y: 0,
          attributes: {
            x1: barX + barWidth,
            y1: connectorY,
            x2: nextBarX,
            y2: connectorY,
            stroke: "#999999",
            strokeWidth: 1,
            strokeDasharray: "4,2",
          },
        };
        children.push(connector);
      }
    });

    // Zero line
    const zeroLine: SceneNode = {
      type: "line",
      id: "zero-line",
      x: 0,
      y: 0,
      attributes: {
        x1: plotBounds.x,
        y1: zeroY,
        x2: plotBounds.x + plotBounds.width,
        y2: zeroY,
        stroke: "#333333",
        strokeWidth: 1,
      },
    };
    children.push(zeroLine);

    // Axes
    children.push(
      ...this.createXAxisLabels(categories, plotBounds, xAxisHeight),
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth),
    );

    const root: SceneNode = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children,
    };

    return {
      root,
      chartData: {
        values,
        categories,
        valueType: "number",
      },
    };
  }

  // ===========================================================================
  // AXIS CREATION HELPERS
  // ===========================================================================

  /**
   * Create X-axis labels with collision detection (Doc 2, Section 3).
   */
  private createXAxisLabels(
    categories: string[],
    plotBounds: Rect,
    xAxisHeight: LBU,
  ): SceneNode[] {
    const axisY = plotBounds.y + plotBounds.height + 50;

    // Use collision solver
    const { placements, level } = this.collisionSolver.resolveAxisLabels(
      categories,
      plotBounds.x,
      plotBounds.x + plotBounds.width,
      axisY,
      this.options.fontSize * 10,
      this.options.fontFamily,
    );

    this.stats.collisionsResolved += level > 0 ? categories.length : 0;

    return placements
      .filter((p) => p.isVisible)
      .map((placement, i) => ({
        type: "text" as const,
        id: generateNodeId("x-label", i),
        x: this.snap(placement.position.x),
        y: this.snap(placement.position.y),
        attributes: {
          text: placement.text,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#666666",
          textAnchor: placement.box.anchor,
          rotation: placement.box.rotation,
        },
      }));
  }

  /**
   * Create Y-axis labels (Doc 2: Fixed Gutter Strategy).
   */
  private createYAxisLabels(
    minValue: number,
    maxValue: number,
    bounds: Rect,
    yAxisWidth: LBU,
  ): SceneNode[] {
    const labels: SceneNode[] = [];
    const tickCount = 5;
    const range = maxValue - minValue;
    const step = range / tickCount;

    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + step * i;
      const y =
        bounds.y +
        bounds.height -
        300 -
        (i / tickCount) * (bounds.height - 300);

      const formattedValue = this.formatAxisValue(value);

      labels.push({
        type: "text",
        id: generateNodeId("y-label", i),
        x: bounds.x + yAxisWidth - 50,
        y: this.snap(y),
        attributes: {
          text: formattedValue,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#666666",
          textAnchor: "end",
          dominantBaseline: "middle",
        },
      });
    }

    return labels;
  }

  /** Create labels for a combo chart's optional right-hand value axis. */
  private createRightYAxisLabels(
    minValue: number,
    maxValue: number,
    plotBounds: Rect,
  ): SceneNode[] {
    const labels: SceneNode[] = [];
    const tickCount = 5;
    const range = maxValue - minValue;

    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + (range / tickCount) * i;
      const y =
        plotBounds.y +
        plotBounds.height -
        (i / tickCount) * plotBounds.height;
      labels.push({
        type: "text",
        id: generateNodeId("right-y-label", i),
        x: plotBounds.x + plotBounds.width + 50,
        y: this.snap(y),
        attributes: {
          text: this.formatAxisValue(value),
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#666666",
          textAnchor: "start",
          dominantBaseline: "middle",
        },
      });
    }

    return labels;
  }

  /**
   * Create grid lines.
   */
  private createGridLines(
    plotBounds: Rect,
    minValue: number,
    maxValue: number,
  ): SceneNode {
    const lines: SceneNode[] = [];
    const tickCount = 5;

    for (let i = 0; i <= tickCount; i++) {
      const y = plotBounds.y + (i / tickCount) * plotBounds.height;

      lines.push({
        type: "line",
        id: generateNodeId("grid-h", i),
        x: 0,
        y: 0,
        attributes: {
          x1: plotBounds.x,
          y1: y,
          x2: plotBounds.x + plotBounds.width,
          y2: y,
          stroke: "#eeeeee",
          strokeWidth: 1,
        },
      });
    }

    return {
      type: "group",
      id: "grid-lines",
      x: 0,
      y: 0,
      attributes: {},
      children: lines,
    };
  }

  // ===========================================================================
  // DATA NORMALIZATION HELPERS
  // ===========================================================================

  /**
   * Normalize all multi-series shapes while retaining category alignment.
   * Invalid numeric entries become gaps instead of shifting later values into
   * the wrong category, and use the established NON_FINITE_DATA warning path.
   */
  private normalizeMultiSeriesData(data: any): NormalizedMultiSeriesData {
    let rawSeries: Array<{ name: string; values: unknown[]; path: string }>;

    if (Array.isArray(data)) {
      const nested = Array.isArray(data[0]);
      const values = nested ? data : [data];
      rawSeries = values.map((series, index) => ({
        name: `Series ${index + 1}`,
        values: Array.isArray(series) ? series : [],
        path: nested ? `data.series[${index}].values` : "data.values",
      }));
    } else if (Array.isArray(data?.series)) {
      rawSeries = data.series.map((series: any, index: number) => ({
        name: String(series?.name ?? `Series ${index + 1}`),
        values: Array.isArray(series?.values)
          ? series.values
          : Array.isArray(series)
            ? series
            : [],
        path: `data.series[${index}].values`,
      }));
    } else if (Array.isArray(data?.values?.[0])) {
      rawSeries = data.values.map((values: unknown[], index: number) => ({
        name: `Series ${index + 1}`,
        values,
        path: `data.series[${index}].values`,
      }));
    } else {
      rawSeries = [{
        name: "Series 1",
        values: Array.isArray(data?.values) ? data.values : [],
        path: "data.values",
      }];
    }

    const suppliedCategories = Array.isArray(data?.categories)
      ? data.categories
      : [];
    const categoryCount = rawSeries.reduce(
      (maximum, series) => Math.max(maximum, series.values.length),
      0,
    );
    const categories = Array.from({ length: categoryCount }, (_, index) =>
      String(suppliedCategories[index] ?? `Item ${index + 1}`)
    );
    const series = rawSeries.map((raw) => ({
      name: raw.name,
      values: Array.from({ length: categoryCount }, (_, index) => {
        const value = raw.values[index];
        if (value === undefined || value === null) return null;
        if (this.isFiniteNumber(value)) return value;
        this.addNonFiniteWarning(`${raw.path}[${index}]`, value);
        return null;
      }),
    }));

    return { categories, series };
  }

  private normalizeBarData(data: any): {
    categories: string[];
    values: number[];
    series: any[];
  } {
    const rawValues = Array.isArray(data)
      ? data
      : data?.values ?? data?.series?.[0]?.values ?? [];
    const rawCategories = Array.isArray(data?.categories)
      ? data.categories
      : rawValues.map((_: unknown, i: number) => `Item ${i + 1}`);
    const filtered = this.filterFiniteValues(
      rawValues,
      rawCategories,
      "data.values",
    );
    const series = Array.isArray(data?.series) && data.series.length > 0
      ? data.series
      : [{ name: "Series 1", values: filtered.values }];
    return {
      categories: filtered.categories,
      values: filtered.values,
      series,
    };
  }

  private normalizeLineData(data: any): {
    categories: string[];
    values: number[][];
    series: number[][];
  } {
    let rawSeries: unknown[][];
    if (Array.isArray(data)) {
      rawSeries = Array.isArray(data[0]) ? data : [data];
    } else if (Array.isArray(data?.series)) {
      rawSeries = data.series.map((series: any) =>
        Array.isArray(series?.values) ? series.values : series,
      );
    } else if (Array.isArray(data?.values?.[0])) {
      rawSeries = data.values;
    } else {
      rawSeries = [Array.isArray(data?.values) ? data.values : []];
    }

    const suppliedCategories = Array.isArray(data?.categories)
      ? data.categories
      : [];
    const series = rawSeries.map((values, seriesIndex) =>
      this.filterFiniteValues(
        values,
        suppliedCategories,
        `data.series[${seriesIndex}].values`,
      ).values,
    );
    const maxLength = series.reduce(
      (maximum, values) => Math.max(maximum, values.length),
      0,
    );
    const categories = suppliedCategories.length > 0
      ? suppliedCategories.slice(0, maxLength)
      : Array.from({ length: maxLength }, (_, i) => `${i + 1}`);

    return {
      categories,
      values: series,
      series,
    };
  }

  private normalizeScatterData(data: any): {
    points: Array<{ x: number; y: number; label: string }>;
  } {
    const rawPoints = Array.isArray(data)
      ? data
      : data?.points ?? data?.series?.[0]?.values ?? [];
    const points: Array<{ x: number; y: number; label: string }> = [];

    if (!Array.isArray(rawPoints)) return { points };

    rawPoints.forEach((point: any, index: number) => {
      const x = point?.x ?? point?.[0] ?? index;
      const y = point?.y ?? point?.[1] ?? 0;
      const invalidCoordinates = [
        ["x", x],
        ["y", y],
      ].filter((entry) => !this.isFiniteNumber(entry[1]));

      if (invalidCoordinates.length > 0) {
        invalidCoordinates.forEach(([coordinate, value]) => {
          this.addNonFiniteWarning(
            `data.points[${index}].${String(coordinate)}`,
            value,
          );
        });
        return;
      }

      points.push({
        x: x as number,
        y: y as number,
        label: String(point?.label ?? `Point ${index + 1}`),
      });
    });

    return { points };
  }

  private normalizePieData(data: any): {
    categories: string[];
    values: number[];
  } {
    const rawValues = Array.isArray(data)
      ? data.map((datum) =>
          typeof datum === "number" ? datum : datum?.value,
        )
      : data?.values ?? [];
    const rawCategories = Array.isArray(data)
      ? data.map((datum, i) => String(datum?.label ?? `Slice ${i + 1}`))
      : data?.categories ?? data?.labels ?? [];
    const filtered = this.filterFiniteValues(
      rawValues,
      rawCategories,
      "data.values",
    );
    return {
      categories: filtered.categories,
      values: filtered.values,
    };
  }

  private normalizeWaterfallData(data: any): {
    categories: string[];
    values: number[];
    isTotal: boolean[];
  } {
    const rawValues = data?.values ?? data?.series?.[0]?.values ?? [];
    const rawCategories = data?.categories ?? [];
    const rawIsTotal = data?.isTotal ?? data?.series?.[0]?.isTotal ?? [];
    const filtered = this.filterFiniteValues(
      rawValues,
      rawCategories,
      "data.values",
    );
    return {
      categories: filtered.categories,
      values: filtered.values,
      isTotal: filtered.indices.map((index) => Boolean(rawIsTotal[index])),
    };
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  private getFiniteSeriesValues(series: NormalizedSeries[]): number[] {
    return series.flatMap((entry) =>
      entry.values.filter((value): value is number => value !== null)
    );
  }

  private maxAbsoluteValue(values: number[]): number {
    return values.reduce(
      (maximum, value) => Math.max(maximum, Math.abs(value)),
      0,
    );
  }

  private scaleY(
    value: number,
    minValue: number,
    maxValue: number,
    plotBounds: Rect,
  ): number {
    const range = maxValue - minValue || 1;
    return (
      plotBounds.y +
      plotBounds.height -
      ((value - minValue) / range) * plotBounds.height
    );
  }

  private createSeriesPoints(
    values: Array<number | null>,
    categoryCount: number,
    minValue: number,
    maxValue: number,
    plotBounds: Rect,
  ): Point[] {
    const points: Point[] = [];
    values.forEach((value, categoryIndex) => {
      if (value === null) return;
      points.push({
        x:
          plotBounds.x +
          (categoryIndex / (categoryCount - 1 || 1)) * plotBounds.width,
        y: this.scaleY(value, minValue, maxValue, plotBounds),
      });
    });
    return points;
  }

  private createMultiSeriesChartData(
    data: NormalizedMultiSeriesData,
    secondaryAxis?: boolean,
  ): ChartData {
    const values: number[] = [];
    const categories: string[] = [];

    data.series.forEach((series) => {
      series.values.forEach((value, categoryIndex) => {
        if (value === null) return;
        values.push(value);
        categories.push(`${series.name} – ${data.categories[categoryIndex]}`);
      });
    });

    return {
      values,
      categories,
      valueType: "number",
      seriesCount: data.series.length,
      categoryCount: data.categories.length,
      secondaryAxis,
    };
  }

  private createChartRoot(children: SceneNode[]): SceneNode {
    return {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: { role: "graphics-document" },
      children,
    };
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }

  private addNonFiniteWarning(path: string, value: unknown): void {
    this.warnings.push({
      code: "NON_FINITE_DATA",
      message: `Filtered non-finite numeric value at ${path}.`,
      path,
      value,
      suggestion: "Provide a finite number to include this data point.",
    });
  }

  private filterFiniteValues(
    rawValues: unknown,
    rawCategories: unknown,
    pathPrefix: string,
  ): { values: number[]; categories: string[]; indices: number[] } {
    const values: number[] = [];
    const categories: string[] = [];
    const indices: number[] = [];
    const sourceValues = Array.isArray(rawValues) ? rawValues : [];
    const sourceCategories = Array.isArray(rawCategories) ? rawCategories : [];

    sourceValues.forEach((value, index) => {
      if (!this.isFiniteNumber(value)) {
        this.addNonFiniteWarning(`${pathPrefix}[${index}]`, value);
        return;
      }

      values.push(value);
      categories.push(String(sourceCategories[index] ?? `Item ${index + 1}`));
      indices.push(index);
    });

    return { values, categories, indices };
  }

  private getNumericDomain(
    values: number[],
    includeZero: boolean = false,
  ): [number, number] {
    if (values.length === 0) return [0, 1];

    let minValue = values[0];
    let maxValue = values[0];
    for (let i = 1; i < values.length; i++) {
      minValue = Math.min(minValue, values[i]);
      maxValue = Math.max(maxValue, values[i]);
    }

    if (includeZero) {
      minValue = Math.min(minValue, 0);
      maxValue = Math.max(maxValue, 0);
    }

    return [minValue, maxValue];
  }

  /**
   * Calculate Y-axis width based on max label width (Doc 1, Section 5).
   */
  private calculateAxisWidth(minValue: number, maxValue: number): LBU {
    const testValues = [minValue, maxValue, (minValue + maxValue) / 2];
    const labels = testValues.map((v) => this.formatAxisValue(v));

    const maxWidth = this.glyphOracle.getMaxLabelWidth(
      labels,
      this.options.fontSize * 10,
      this.options.fontFamily,
    );

    return maxWidth + 150; // Add padding
  }

  /**
   * Format axis value for display.
   */
  private formatAxisValue(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
    if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
    return value.toFixed(abs < 10 ? 1 : 0);
  }

  /**
   * Sub-pixel grid snapping (Doc 3, Section 5).
   */
  private snap(value: LBU): LBU {
    return Math.round(value * 2) / 2;
  }

  /**
   * Create arc path for pie charts.
   */
  private createArcPath(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number,
  ): string {
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    const x1 = cx + Math.cos(startAngle) * outerR;
    const y1 = cy + Math.sin(startAngle) * outerR;
    const x2 = cx + Math.cos(endAngle) * outerR;
    const y2 = cy + Math.sin(endAngle) * outerR;

    if (innerR === 0) {
      // Pie slice
      return `M${cx},${cy} L${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} Z`;
    }

    // Donut slice
    const x3 = cx + Math.cos(endAngle) * innerR;
    const y3 = cy + Math.sin(endAngle) * innerR;
    const x4 = cx + Math.cos(startAngle) * innerR;
    const y4 = cy + Math.sin(startAngle) * innerR;

    return `M${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${largeArc} 0 ${x4},${y4} Z`;
  }

  /**
   * Generate patterns for the palette.
   */
  private generatePatterns(count: number): PatternDefinition[] {
    const patterns: PatternDefinition[] = [];
    for (let i = 0; i < count; i++) {
      patterns.push(this.colorPipeline.getSeriesPattern(i));
    }
    return patterns;
  }

  /**
   * Derive seed from data hash.
   */
  private deriveSeed(hash: string): number {
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Count nodes in scene graph.
   */
  private countNodes(node: SceneNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  /**
   * Reset stats for new compilation.
   */
  private resetStats(): void {
    this.warnings = [];
    this.stats = {
      compileTime: 0,
      nodeCount: 0,
      svgSize: 0,
      pathOptimization: 0,
      glyphCacheHits: 0,
      collisionsResolved: 0,
    };
  }

  /**
   * Create minimal accessibility metadata.
   */
  private createMinimalAccessibility(
    chartType: ChartType,
  ): AccessibilityMetadata {
    return {
      role: "Chart",
      altText: `${chartType} chart`,
      dataSummary: [],
      lang: "en",
    };
  }

  /**
   * Create minimal XMP metadata.
   */
  private createMinimalXMP(chartType: ChartType): XMPMetadata {
    return {
      sourceData: "{}",
      dataHash: "",
      createdAt: new Date().toISOString(),
      generatorVersion: "1.0.0",
      chartType,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE & CONVENIENCE FUNCTIONS
// =============================================================================

/** Default compiler instance */
export const pvceCompiler = new PVCECompiler();

/**
 * Compile a chart with default options.
 */
export function compileChart<T>(
  chartType: ChartType,
  input: ChartInput<T>,
  options?: CompilerOptions,
): CompilationResult {
  const compiler = options ? new PVCECompiler(options) : pvceCompiler;
  return compiler.compile(chartType, input);
}

/**
 * Quick compile to SVG string only.
 */
export function chartToSVG<T>(
  chartType: ChartType,
  data: T,
  options?: CompilerOptions,
): string {
  const result = compileChart(
    chartType,
    {
      data,
      encoding: {},
      constraints: {
        width: options?.width ?? 800,
        height: options?.height ?? 600,
      },
    },
    options,
  );
  return result.svg;
}
