/**
 * PVCE (Precision-Vector Charting Engine) Type Definitions
 * =========================================================
 * Core types implementing Documents 1-4 specifications.
 *
 * Doc 1: Scene Graph IR, Determinism
 * Doc 2: Text measurement, Label collision
 * Doc 3: Vector fidelity, LBU coordinates
 * Doc 4: Color, Accessibility, Compliance
 */
/** Layout Base Unit - internal coordinate system (Doc 3) */
type LBU = number;
/** Point in LBU coordinate space */
interface Point {
    x: LBU;
    y: LBU;
}
/** Rectangle in LBU coordinate space */
interface Rect {
    x: LBU;
    y: LBU;
    width: LBU;
    height: LBU;
}
/** Scene Node type enumeration */
type SceneNodeType = "group" | "path" | "text" | "rect" | "circle" | "line" | "pattern";
/** Core Scene Node (Doc 1 Section 3) */
interface SceneNode {
    type: SceneNodeType;
    id: string;
    x: LBU;
    y: LBU;
    attributes: SceneAttributes;
    children?: SceneNode[];
    metadata?: NodeMetadata;
}
/** Scene node attributes */
interface SceneAttributes {
    width?: LBU;
    height?: LBU;
    radius?: LBU;
    d?: string;
    x1?: LBU;
    y1?: LBU;
    x2?: LBU;
    y2?: LBU;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    strokeLinecap?: "butt" | "round" | "square";
    strokeLinejoin?: "miter" | "round" | "bevel";
    opacity?: number;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: "normal" | "bold" | "light";
    textAnchor?: "start" | "middle" | "end";
    dominantBaseline?: "auto" | "middle" | "hanging" | "alphabetic";
    transform?: string;
    rotation?: number;
    vectorEffect?: "non-scaling-stroke" | "none";
    patternId?: string;
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
}
/** Node metadata for traceability */
interface NodeMetadata {
    dataIndex?: number;
    dataValue?: number;
    category?: string;
    seriesName?: string;
    sourcePoint?: Point;
    displacement?: number;
    needsLeaderLine?: boolean;
    isAccessibilityNode?: boolean;
    layer?: number;
    layerName?: string;
    layerCount?: number;
    isHalo?: boolean;
    haloTargetId?: string;
    priority?: number;
    isAnnotation?: boolean;
    anchorPosition?: string;
}
/** Scene Graph IR (Doc 1 Section 3) */
interface SceneGraph {
    version: string;
    viewBox: {
        width: LBU;
        height: LBU;
    };
    root: SceneNode;
    metadata: SceneGraphMetadata;
    defs?: SceneGraphDefs;
}
/** Scene graph metadata for VRT verification */
interface SceneGraphMetadata {
    dataHash: string;
    generatedAt: number;
    deterministicSeed?: number;
    chartType: ChartType;
    accessibility: AccessibilityMetadata;
}
/** Reusable definitions (patterns, gradients) */
interface SceneGraphDefs {
    patterns: PatternDefinition[];
    gradients?: GradientDefinition[];
}
/** Text bounding box (Doc 2 Section 2) */
interface TextBox {
    text: string;
    width: LBU;
    height: LBU;
    anchor: "start" | "middle" | "end";
    rotation: number;
    padding: LBU;
    baseline: "top" | "middle" | "bottom";
}
/** Measured glyph metrics */
interface GlyphMetrics {
    text: string;
    width: number;
    height: number;
    ascent: number;
    descent: number;
    fontFamily: string;
    fontSize: number;
}
/** Glyph cache entry */
interface GlyphCacheEntry {
    key: string;
    metrics: GlyphMetrics;
    lastAccessed: number;
}
/** Label collision resolution level (Doc 2 Section 3) */
declare enum CollisionLevel {
    STANDARD = 0,// Horizontal labels
    STAGGERED = 1,// Alternating rows
    ROTATED_45 = 2,// 45-degree rotation
    ROTATED_90 = 3,// 90-degree rotation
    SAMPLED = 4
}
/** Label placement result */
interface LabelPlacement {
    id: string;
    text: string;
    box: TextBox;
    position: Point;
    collisionLevel: CollisionLevel;
    sampleStep?: number;
    isVisible: boolean;
    leaderLine?: LeaderLine;
}
/** Leader line for displaced labels (Doc 2 Section 5) */
interface LeaderLine {
    fromPoint: Point;
    toPoint: Point;
    elbowPoint?: Point;
    targetLabelId: string;
}
/** Virtual canvas (LBU space) - Doc 3 Section 3 */
declare const VIRTUAL_CANVAS: {
    readonly WIDTH: 10000;
    readonly HEIGHT: 10000;
};
/** Minimum stroke width (hairline) in points - Doc 3 Section 4 */
declare const HAIRLINE_MIN_PT = 0.25;
/** Sub-pixel snapping threshold - Doc 3 Section 5 */
declare const SNAP_THRESHOLD = 0.5;
/** Path simplification options (Visvalingam-Whyatt) */
interface PathSimplificationOptions {
    /** Minimum area threshold for point removal */
    areaThreshold: number;
    /** Sub-pixel threshold (default 0.01px) */
    subPixelThreshold: number;
    /** Maximum points to retain */
    maxPoints?: number;
}
/** Optimized path segment */
interface OptimizedPath {
    originalPointCount: number;
    optimizedPointCount: number;
    pathData: string;
    savings: number;
}
/** Color mode (Doc 4 Section 2) */
type ColorMode = "rgb" | "cmyk" | "monochrome";
/** RGB color */
interface RGBColor {
    r: number;
    g: number;
    b: number;
    a?: number;
}
/** CMYK color for print (Doc 4 Section 2) */
interface CMYKColor {
    c: number;
    m: number;
    y: number;
    k: number;
}
/** Grayscale value with perceptual luminance */
interface GrayscaleValue {
    gray: number;
    perceptualLuminance: number;
}
/** Color with all representations */
interface UnifiedColor {
    rgb: RGBColor;
    cmyk: CMYKColor;
    grayscale: GrayscaleValue;
    hex: string;
    contrastRatio?: number;
}
/** Deterministic pattern for monochrome (Doc 4 Section 3) */
interface PatternDefinition {
    id: string;
    seriesIndex: number;
    type: PatternType;
    strokeWidth: number;
    spacing: number;
    angle?: number;
}
/** Pattern types for accessibility */
type PatternType = "diagonal-lines" | "dots" | "crosshatch" | "horizontal-lines" | "vertical-lines" | "diagonal-reverse" | "grid" | "circles";
/** Gradient definition */
interface GradientDefinition {
    id: string;
    type: "linear" | "radial";
    stops: Array<{
        offset: number;
        color: string;
    }>;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}
/** Color palette with accessibility info */
interface ColorPalette {
    name: string;
    colors: UnifiedColor[];
    patterns: PatternDefinition[];
    meetsWCAG: boolean;
    minContrastRatio: number;
}
/** Accessibility metadata (Doc 4 Section 4) */
interface AccessibilityMetadata {
    /** PDF/UA role */
    role: "Chart";
    /** Auto-generated natural language description */
    altText: string;
    /** Structured caption */
    caption?: string;
    /** Data summary for screen readers */
    dataSummary: DataPointAccessibility[];
    /** Language code */
    lang: string;
}
/** Accessible data point description */
interface DataPointAccessibility {
    index: number;
    category: string;
    value: number | string;
    formattedValue: string;
    percentage?: number;
    description: string;
}
/** XMP metadata for data provenance (Doc 4 Section 5) */
interface XMPMetadata {
    /** Original JSON data embedded in PDF */
    sourceData: string;
    /** SHA-256 hash of source data */
    dataHash: string;
    /** Generation timestamp */
    createdAt: string;
    /** Generator version */
    generatorVersion: string;
    /** Chart type */
    chartType: ChartType;
}
/** Supported chart types */
type ChartType = "bar" | "line" | "scatter" | "pie" | "donut" | "waterfall" | "marimekko" | "area" | "stacked-bar" | "grouped-bar" | "combo";
/** Chart input schema (Doc 1 Section 2) */
interface ChartInput<T = unknown> {
    /** Raw data */
    data: T;
    /** Data-to-visual channel mapping */
    encoding: ChartEncoding;
    /** Bounding box constraints */
    constraints: ChartConstraints;
    /** Optional configuration */
    config?: ChartConfig;
}
/** Visual encoding specification */
interface ChartEncoding {
    x?: FieldEncoding;
    y?: FieldEncoding;
    color?: FieldEncoding;
    size?: FieldEncoding;
    label?: FieldEncoding;
    tooltip?: FieldEncoding;
}
/** Field encoding details */
interface FieldEncoding {
    field: string;
    type?: "quantitative" | "nominal" | "ordinal" | "temporal";
    title?: string;
    scale?: ScaleConfig;
    axis?: AxisConfig;
    format?: string;
}
/** Scale configuration */
interface ScaleConfig {
    type: "linear" | "log" | "time" | "ordinal" | "band";
    domain?: [number, number] | string[];
    range?: [number, number] | string[];
    nice?: boolean;
    padding?: number;
}
/** Axis configuration (Doc 2 Section 3) */
interface AxisConfig {
    title?: string;
    titleFontSize?: number;
    labelFontSize?: number;
    labelRotation?: number;
    labelPadding?: number;
    tickCount?: number;
    gridLines?: boolean;
    collisionStrategy?: "auto" | "rotate" | "stagger" | "sample";
}
/** Chart constraints from paginator */
interface ChartConstraints {
    width: LBU;
    height: LBU;
    maxWidth?: LBU;
    maxHeight?: LBU;
    margin?: {
        top: LBU;
        right: LBU;
        bottom: LBU;
        left: LBU;
    };
}
/** Chart configuration */
interface ChartConfig {
    /** Title */
    title?: string;
    /** Subtitle */
    subtitle?: string;
    /** Color mode */
    colorMode?: ColorMode;
    /** Enable monochrome patterns */
    monochromePatterns?: boolean;
    /** Custom color palette */
    palette?: ColorPalette;
    /** Font family */
    fontFamily?: string;
    /** Enable accessibility features */
    accessibility?: boolean;
    /** Embed source data in XMP */
    embedSourceData?: boolean;
    /** Deterministic seed for reproducibility */
    seed?: number;
}
/** Full compilation result */
interface CompilationResult {
    /** The Scene Graph IR */
    sceneGraph: SceneGraph;
    /** SVG string output */
    svg: string;
    /** Accessibility data */
    accessibility: AccessibilityMetadata;
    /** XMP metadata for embedding */
    xmpMetadata: XMPMetadata;
    /** Compilation statistics */
    stats: CompilationStats;
    /** Non-fatal validation warnings surfaced while refining the input */
    warnings?: ValidationWarning[];
}
/** Compilation statistics */
interface CompilationStats {
    /** Time to compile (ms) */
    compileTime: number;
    /** Number of scene nodes */
    nodeCount: number;
    /** SVG file size (bytes) */
    svgSize: number;
    /** Path optimization savings (%) */
    pathOptimization: number;
    /** Glyph cache hits */
    glyphCacheHits: number;
    /** Label collisions resolved */
    collisionsResolved: number;
}
/** Seedable random number generator */
interface SeededRandom {
    /** Get next random number [0, 1) */
    next(): number;
    /** Get random integer [min, max] */
    nextInt(min: number, max: number): number;
    /** Get random item from array */
    choice<T>(array: T[]): T;
    /** Shuffle array (Fisher-Yates) */
    shuffle<T>(array: T[]): T[];
    /** Reset to initial seed */
    reset(): void;
    /** Current seed */
    seed: number;
}
/** Validation result */
interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
/** Validation error */
interface ValidationError {
    code: string;
    message: string;
    path?: string;
    value?: unknown;
}
/** Validation warning */
interface ValidationWarning {
    code: string;
    message: string;
    path?: string;
    value?: unknown;
    suggestion?: string;
}

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

/** Compiler options */
interface CompilerOptions {
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
/**
 * PVCECompiler - The main charting engine compiler.
 *
 * Implements all requirements from Documents 1-4:
 * - Pure function pipeline (Doc 1)
 * - Glyph Oracle & collision detection (Doc 2)
 * - SVG-first rendering with sub-pixel snapping (Doc 3)
 * - Accessibility & color management (Doc 4)
 */
declare class PVCECompiler {
    private glyphOracle;
    private collisionSolver;
    private svgRenderer;
    private colorPipeline;
    private accessibilityGenerator;
    private pathOptimizer;
    private options;
    private warnings;
    private stats;
    constructor(options?: CompilerOptions);
    /**
     * Compile a chart to Scene Graph and SVG.
     * This is the main entry point - Doc 1, Section 2: The Pure-Function Pipeline.
     */
    compile<T>(chartType: ChartType, input: ChartInput<T>): CompilationResult;
    /**
     * Compile a bar chart.
     */
    private compileBarChart;
    /**
     * Compile independently scaled series as overlapping translucent areas.
     *
     * The line compiler treats every series as an independent path on one shared
     * scale, so area follows that convention instead of cumulatively stacking.
     * Fills are emitted before strokes, in series order, to keep every outline
     * legible while overlapping colors remain visible.
     */
    private compileAreaChart;
    /**
     * Compile bars with separate positive and negative accumulators per category.
     * Negative segments are supported and stack below zero instead of being
     * discarded, preserving both their sign and their contribution to the domain.
     */
    private compileStackedBarChart;
    /** Compile side-by-side series with 20% group gaps and 10% inter-bar gaps. */
    private compileGroupedBarChart;
    /**
     * Compile the first series as bars and the second as a line. A secondary
     * right-hand scale is used only when both series have nonzero magnitudes and
     * the larger max-absolute magnitude is more than 10x the smaller one.
     */
    private compileComboChart;
    /**
     * Compile a line chart with path optimization (Doc 3, Section 2).
     */
    private compileLineChart;
    /**
     * Compile a scatter chart with label collision detection (Doc 2, Section 4).
     */
    private compileScatterChart;
    /**
     * Compile a pie/donut chart with radial labeling (Doc 2, Section 5).
     */
    private compilePieChart;
    /**
     * Compile a waterfall chart.
     */
    private compileWaterfallChart;
    /**
     * Create X-axis labels with collision detection (Doc 2, Section 3).
     */
    private createXAxisLabels;
    /**
     * Create Y-axis labels (Doc 2: Fixed Gutter Strategy).
     */
    private createYAxisLabels;
    /** Create labels for a combo chart's optional right-hand value axis. */
    private createRightYAxisLabels;
    /**
     * Create grid lines.
     */
    private createGridLines;
    /**
     * Normalize all multi-series shapes while retaining category alignment.
     * Invalid numeric entries become gaps instead of shifting later values into
     * the wrong category, and use the established NON_FINITE_DATA warning path.
     */
    private normalizeMultiSeriesData;
    private normalizeBarData;
    private normalizeLineData;
    private normalizeScatterData;
    private normalizePieData;
    private normalizeWaterfallData;
    private getFiniteSeriesValues;
    private maxAbsoluteValue;
    private scaleY;
    private createSeriesPoints;
    private createMultiSeriesChartData;
    private createChartRoot;
    private isFiniteNumber;
    private addNonFiniteWarning;
    private filterFiniteValues;
    private getNumericDomain;
    /**
     * Calculate Y-axis width based on max label width (Doc 1, Section 5).
     */
    private calculateAxisWidth;
    /**
     * Format axis value for display.
     */
    private formatAxisValue;
    /**
     * Sub-pixel grid snapping (Doc 3, Section 5).
     */
    private snap;
    /**
     * Create arc path for pie charts.
     */
    private createArcPath;
    /**
     * Generate patterns for the palette.
     */
    private generatePatterns;
    /**
     * Derive seed from data hash.
     */
    private deriveSeed;
    /**
     * Count nodes in scene graph.
     */
    private countNodes;
    /**
     * Reset stats for new compilation.
     */
    private resetStats;
    /**
     * Create minimal accessibility metadata.
     */
    private createMinimalAccessibility;
    /**
     * Create minimal XMP metadata.
     */
    private createMinimalXMP;
}
/** Default compiler instance */
declare const pvceCompiler: PVCECompiler;
/**
 * Compile a chart with default options.
 */
declare function compileChart<T>(chartType: ChartType, input: ChartInput<T>, options?: CompilerOptions): CompilationResult;
/**
 * Quick compile to SVG string only.
 */
declare function chartToSVG<T>(chartType: ChartType, data: T, options?: CompilerOptions): string;

/**
 * PVCE Glyph Oracle - Text Measurement Engine
 * ============================================
 * Document 2, Section 2: The Text Measurement Oracle
 *
 * Provides deterministic text measurement without DOM dependency.
 * Uses pre-calculated glyph metrics with caching for performance.
 */

/**
 * GlyphOracle - Deterministic text measurement engine
 *
 * Features (Doc 2 compliance):
 * - Pre-calculated glyph metrics (no DOM dependency)
 * - Session-based caching for performance (Doc 2, Section 7)
 * - Sub-pixel precision for accurate layout
 * - Multi-font support with fallback
 */
declare class GlyphOracle {
    private cache;
    private readonly maxCacheSize;
    private cacheHits;
    private cacheMisses;
    constructor(options?: {
        maxCacheSize?: number;
    });
    /**
     * Measure text dimensions deterministically.
     * Doc 2, Section 2: "Exact bounding box of every string"
     */
    measureText(text: string, fontSize: number, fontFamily?: string): GlyphMetrics;
    /**
     * Get raw font metrics for a font family.
     * Used by E-BBox calculator for glyph envelope calculations.
     */
    getFontMetrics(fontFamily: string): {
        avgCharWidth: number;
        capHeight: number;
        xHeight: number;
        ascent: number;
        descent: number;
        lineHeight: number;
    };
    /**
     * Create a TextBox with full positioning information.
     * Doc 2, Section 2: TextBox interface
     */
    createTextBox(text: string, fontSize: number, options?: {
        fontFamily?: string;
        anchor?: "start" | "middle" | "end";
        rotation?: number;
        padding?: number;
    }): TextBox;
    /**
     * Calculate the maximum label width for a set of labels.
     * Used for "Fixed Gutter Strategy" (Doc 1, Section 5).
     */
    getMaxLabelWidth(labels: string[], fontSize: number, fontFamily?: string): number;
    /**
     * Get bounding box for rotated text.
     * Used for 45° and 90° label rotation (Doc 2, Section 3).
     */
    getRotatedBounds(textBox: TextBox): {
        width: LBU;
        height: LBU;
    };
    /**
     * Check if two text boxes overlap.
     * Used for collision detection (Doc 2, Section 3).
     */
    boxesOverlap(box1: TextBox, pos1: Point, box2: TextBox, pos2: Point): boolean;
    /**
     * Format number for display (e.g., currency, percentage).
     * Pre-measures result for consistent layout.
     */
    formatAndMeasure(value: number, format: "number" | "currency" | "percent" | "compact", fontSize: number, fontFamily?: string, options?: {
        currency?: string;
        decimals?: number;
        locale?: string;
    }): {
        text: string;
        metrics: GlyphMetrics;
    };
    /**
     * Get cache statistics.
     */
    getStats(): {
        cacheSize: number;
        cacheHits: number;
        cacheMisses: number;
        hitRate: number;
    };
    /**
     * Clear the glyph cache.
     */
    clearCache(): void;
    private getCacheKey;
    private addToCache;
    private evictOldestEntry;
    private getAnchoredX;
    private compactNumber;
}
/** Global GlyphOracle instance for shared caching */
declare const glyphOracle: GlyphOracle;
/**
 * Measure text using the global oracle.
 */
declare function measureText(text: string, fontSize: number, fontFamily?: string): GlyphMetrics;
/**
 * Get max width of labels.
 */
declare function getMaxLabelWidth(labels: string[], fontSize: number, fontFamily?: string): number;

/**
 * PVCE Axis Collision Solver
 * ==========================
 * Document 2, Section 3: The Axis Collision Solver (X-Axis)
 * Document 2, Section 4: The Point-to-Label "Force" Algorithm
 * Document 2, Section 5: Radial Labeling (Leader Lines)
 *
 * Implements a 4-level deterministic collision resolution strategy.
 */

/** Configuration for collision resolution */
interface CollisionConfig {
    /** Minimum gap between labels (LBU) */
    minGap: LBU;
    /** Maximum iterations for force-directed layout */
    maxIterations: number;
    /** Displacement threshold for leader lines */
    leaderLineThreshold: LBU;
    /** Enable staggering strategy */
    enableStagger: boolean;
    /** Enable rotation strategy */
    enableRotation: boolean;
    /** Enable sampling strategy */
    enableSampling: boolean;
    /** Preferred rotation angles */
    rotationAngles: number[];
    /** Sample step options (show every Nth) */
    sampleSteps: number[];
}
/**
 * AxisCollisionSolver - Resolves label collisions deterministically
 *
 * Doc 2, Section 3: Linear Conflict Resolver with 4 levels:
 * - Level 0: Standard (horizontal labels)
 * - Level 1: Staggered (alternating rows)
 * - Level 2: Rotated (45° or 90°)
 * - Level 3: Sampled (show every Nth label)
 */
declare class AxisCollisionSolver {
    private oracle;
    private config;
    constructor(oracle?: GlyphOracle, config?: Partial<CollisionConfig>);
    /**
     * Resolve X-axis label collisions using the 4-level strategy.
     * Returns placement information for all labels.
     */
    resolveAxisLabels(labels: string[], axisStart: LBU, axisEnd: LBU, axisY: LBU, fontSize: number, fontFamily?: string): {
        placements: LabelPlacement[];
        level: CollisionLevel;
    };
    /**
     * Resolve scatter/line chart label collisions using force-directed layout.
     * Doc 2, Section 4: Deterministic Force-Directed Layout
     */
    resolvePointLabels(points: Array<{
        x: LBU;
        y: LBU;
        label: string;
    }>, bounds: Rect, fontSize: number, fontFamily?: string): LabelPlacement[];
    /**
     * Resolve pie/donut chart label collisions with leader lines.
     * Doc 2, Section 5: Radial Labeling (Leader Line Logic)
     */
    resolvePieLabels(slices: Array<{
        startAngle: number;
        endAngle: number;
        label: string;
        value: number;
    }>, center: Point, innerRadius: LBU, outerRadius: LBU, fontSize: number, fontFamily?: string): LabelPlacement[];
    private tryStandardLayout;
    private tryStaggeredLayout;
    private tryRotatedLayout;
    private trySampledLayout;
    private resolveExternalPieLabels;
    private boxesOverlap;
    private rotatedBoxesOverlap;
    private getEffectiveBounds;
}
/** Global collision solver instance */
declare const collisionSolver: AxisCollisionSolver;
/**
 * Resolve axis labels with automatic strategy selection.
 */
declare function resolveAxisLabels(labels: string[], axisStart: LBU, axisEnd: LBU, axisY: LBU, fontSize: number, fontFamily?: string): {
    placements: LabelPlacement[];
    level: CollisionLevel;
};
/**
 * Resolve scatter plot labels with force-directed layout.
 */
declare function resolvePointLabels(points: Array<{
    x: LBU;
    y: LBU;
    label: string;
}>, bounds: Rect, fontSize: number, fontFamily?: string): LabelPlacement[];

/**
 * PVCE SVG Renderer
 * =================
 * Document 3: Sub-Pixel Vector Normalization & Scaling
 *
 * Features:
 * - SVG-First Vector Pipeline (no canvas)
 * - Non-scaling strokes for consistent line weights
 * - Hairline management (minimum 0.25pt)
 * - Sub-pixel grid snapping (half-pixel)
 * - LBU to viewport transformation
 */

/** SVG rendering options */
interface SVGRenderOptions {
    /** Output width in pixels */
    width?: number;
    /** Output height in pixels */
    height?: number;
    /** Enable half-pixel snapping for crisp lines */
    enableSnapping?: boolean;
    /** Minimum stroke width (pt) */
    minStrokeWidth?: number;
    /** Use non-scaling strokes */
    nonScalingStrokes?: boolean;
    /** Include accessibility attributes */
    includeAccessibility?: boolean;
    /** Indent output for readability */
    prettyPrint?: boolean;
    /** Custom CSS to inject */
    customCSS?: string;
}
/**
 * SVGRenderer - Converts Scene Graph to optimized SVG
 *
 * Doc 3 Compliance:
 * - Section 2: SVG-only output (no canvas)
 * - Section 3: LBU coordinate mapping
 * - Section 4: Non-scaling strokes, hairline management
 * - Section 5: Sub-pixel grid snapping
 */
declare class SVGRenderer {
    private options;
    private indent;
    private output;
    constructor(options?: SVGRenderOptions);
    /**
     * Render a Scene Graph to SVG string.
     */
    render(sceneGraph: SceneGraph): string;
    /**
     * Render a single chart to SVG (convenience method).
     */
    renderChart(root: SceneNode, viewBox: {
        width: LBU;
        height: LBU;
    }, defs?: {
        patterns: PatternDefinition[];
        gradients?: GradientDefinition[];
    }): string;
    private renderNode;
    private renderGroup;
    private renderRect;
    private renderCircle;
    private renderLine;
    private renderPath;
    private renderText;
    private addStrokeAttributes;
    private buildCommonAttributes;
    private writeStyles;
    private writeDefs;
    private writePattern;
    private writeGradient;
    /**
     * Sub-pixel grid snapping (Doc 3, Section 5).
     * Snaps coordinates to 0.5px offsets for crisp 1px lines.
     */
    private snap;
    private escapeXML;
    private writeLine;
}
/** Default SVG renderer */
declare const svgRenderer: SVGRenderer;
/**
 * Render a Scene Graph to SVG string.
 */
declare function renderToSVG(sceneGraph: SceneGraph, options?: SVGRenderOptions): string;
/**
 * Snap a coordinate to the sub-pixel grid.
 */
declare function snapToGrid(value: LBU): number;
/**
 * Ensure stroke width meets minimum hairline requirement.
 */
declare function ensureMinStroke(strokeWidth: number): number;

/**
 * PVCE Color Pipeline
 * ===================
 * Document 4: Print-Specific Color & Accessible Data Structures
 *
 * Features:
 * - Section 2: Dual-mode color (RGB/CMYK/Monochrome)
 * - Section 3: Deterministic pattern overlays
 * - Section 4: WCAG contrast checking
 * - Perceptual luminance calculations
 */

/** WCAG minimum contrast ratios */
declare const WCAG_CONTRAST: {
    readonly AA_NORMAL: 4.5;
    readonly AA_LARGE: 3;
    readonly AAA_NORMAL: 7;
    readonly AAA_LARGE: 4.5;
};
/** Minimum grayscale difference between series (Doc 4, Section 2: 15%) */
declare const MIN_GRAY_DIFFERENCE = 15;
/**
 * Default PVCE palette - designed for both screen and print.
 * Colors are chosen for:
 * - High contrast ratios (WCAG AA against white: 4.5:1 minimum)
 * - Distinct grayscale values (min 15% difference)
 * - Clean CMYK conversion
 */
declare const DEFAULT_PALETTE_COLORS: string[];
/**
 * Colorblind-safe palette (Deuteranopia/Protanopia friendly).
 */
declare const COLORBLIND_SAFE_COLORS: string[];
/**
 * ColorPipeline - Manages color transformations for print and screen.
 *
 * Doc 4 Compliance:
 * - Section 2: RGB to CMYK and Grayscale conversion
 * - Section 3: Deterministic pattern assignment
 * - Contrast ratio calculation
 */
declare class ColorPipeline {
    private colorMode;
    private enablePatterns;
    private customPalette?;
    constructor(options?: {
        colorMode?: ColorMode;
        enablePatterns?: boolean;
        palette?: string[];
    });
    /**
     * Set the color mode (rgb, cmyk, or monochrome).
     */
    setColorMode(mode: ColorMode): void;
    /**
     * Enable/disable pattern overlays for accessibility.
     */
    setPatternMode(enabled: boolean): void;
    /**
     * Convert a hex color to UnifiedColor with all representations.
     */
    parseColor(hex: string): UnifiedColor;
    /**
     * Get the appropriate color value based on current mode.
     */
    getColor(color: UnifiedColor): string;
    /**
     * Get color for a series index from the palette.
     */
    getSeriesColor(seriesIndex: number): UnifiedColor;
    /**
     * Get pattern definition for a series (Doc 4, Section 3).
     * Patterns are deterministically mapped to series index.
     */
    getSeriesPattern(seriesIndex: number): PatternDefinition;
    /**
     * Check if patterns should be used (>3 series or monochrome mode).
     */
    shouldUsePatterns(seriesCount: number): boolean;
    /**
     * Generate a complete color palette with patterns.
     */
    createPalette(seriesCount: number, name?: string): ColorPalette;
    /**
     * Calculate contrast ratio between two colors (WCAG formula).
     */
    getContrastRatio(color1: UnifiedColor, color2: UnifiedColor): number;
    /**
     * Check if two colors have sufficient contrast for text.
     */
    hasAdequateContrast(foreground: UnifiedColor, background: UnifiedColor, isLargeText?: boolean): boolean;
    /**
     * Find a text color (black or white) with best contrast.
     */
    getTextColor(background: UnifiedColor): UnifiedColor;
    /**
     * Ensure grayscale values are distinct enough (Doc 4, Section 2).
     * Returns adjusted colors if needed.
     */
    ensureGrayscaleDistinction(colors: UnifiedColor[]): UnifiedColor[];
    private hexToRGB;
    private rgbToHex;
    /**
     * Convert RGB to CMYK using standard formulas.
     * Doc 4, Section 2: ICC Color Profiles support.
     */
    private rgbToCMYK;
    /**
     * Convert RGB to Grayscale using perceptual luminance.
     * Doc 4, Section 2: Deterministic Color-to-Gray Mapping.
     */
    private rgbToGrayscale;
    private grayscaleToRGB;
    private cmykToString;
    private grayscaleToString;
    /**
     * Calculate relative luminance for WCAG contrast formula.
     */
    private getRelativeLuminance;
    /**
     * Check contrast between all adjacent colors in palette.
     */
    private checkPaletteContrast;
}
/** Global color pipeline instance */
declare const colorPipeline: ColorPipeline;
/**
 * Parse a hex color to unified format.
 */
declare function parseColor(hex: string): UnifiedColor;
/**
 * Get contrast ratio between two hex colors.
 */
declare function getContrastRatio(hex1: string, hex2: string): number;
/**
 * Check WCAG contrast compliance.
 */
declare function meetsContrastRequirement(foregroundHex: string, backgroundHex: string, level?: "AA" | "AAA", isLargeText?: boolean): boolean;
/**
 * Create a monochrome-safe palette with patterns.
 */
declare function createMonochromePalette(seriesCount: number): ColorPalette;

/**
 * PVCE Accessibility Layer
 * ========================
 * Document 4, Sections 4-5: Tagged PDF & PDF/UA Compliance
 *
 * Features:
 * - PDF/UA semantic tagging
 * - Auto-generated alt-text
 * - Natural language chart descriptions
 * - XMP metadata for data provenance
 */

/** Accessibility options */
interface AccessibilityOptions {
    /** Language code (e.g., 'en-US') */
    lang?: string;
    /** Custom chart title for alt-text */
    title?: string;
    /** Include data table in description */
    includeDataTable?: boolean;
    /** Maximum points to describe individually */
    maxDescribedPoints?: number;
    /** Number format for values */
    numberFormat?: Intl.NumberFormatOptions;
    /** Include percentage in descriptions */
    includePercentages?: boolean;
}
/**
 * AccessibilityGenerator - Creates PDF/UA compliant accessibility metadata.
 *
 * Doc 4 Compliance:
 * - Section 4: Tagged PDF structure (Role: Chart, Caption, DataPoint)
 * - Section 4: Auto-generated natural language summaries
 * - Section 5: XMP metadata embedding
 */
declare class AccessibilityGenerator {
    private options;
    private formatter;
    constructor(options?: AccessibilityOptions);
    /**
     * Generate complete accessibility metadata for a chart.
     */
    generateMetadata(chartType: ChartType, data: ChartData, title?: string): AccessibilityMetadata;
    /**
     * Generate natural language description of the chart.
     * Doc 4, Section 4: Alt-Text Generation.
     */
    generateAltText(chartType: ChartType, data: ChartData, title?: string): string;
    /**
     * Generate structured data summary for screen readers.
     */
    generateDataSummary(chartType: ChartType, data: ChartData): DataPointAccessibility[];
    /**
     * Add accessibility attributes to scene nodes.
     * Maps scene graph nodes to PDF/UA roles.
     */
    addAccessibilityToNode(node: SceneNode, info: {
        role?: string;
        label?: string;
        describedBy?: string;
    }): SceneNode;
    /**
     * Generate XMP metadata for data provenance.
     * Doc 4, Section 5: XMP Metadata Embedding.
     */
    generateXMPMetadata(chartType: ChartType, sourceData: unknown, version?: string): XMPMetadata;
    /**
     * Generate XMP XML string for PDF embedding.
     */
    generateXMPXML(metadata: XMPMetadata): string;
    private getChartTypeName;
    private describeDataOverview;
    private analyzeTrend;
    private describeStatistics;
    private generatePointDescription;
    private formatValue;
    private calculateTotal;
    private hashData;
}
/** Generic chart data for accessibility generation */
interface ChartData {
    values: number[];
    categories?: string[];
    categoryType?: string;
    valueType?: "number" | "currency" | "percent";
    seriesName?: string;
    seriesCount?: number;
    categoryCount?: number;
    secondaryAxis?: boolean;
}
/** Global accessibility generator */
declare const accessibilityGenerator: AccessibilityGenerator;
/**
 * Generate alt-text for a chart.
 */
declare function generateChartAltText(chartType: ChartType, values: number[], categories?: string[], title?: string): string;
/**
 * Generate XMP metadata.
 */
declare function generateXMPMetadata(chartType: ChartType, sourceData: unknown): XMPMetadata;
/**
 * Hash data for verification.
 */
declare function hashChartData(data: unknown): string;

/**
 * PVCE Determinism Engine
 * =======================
 * Document 1, Section 4: Absolute Determinism - The "Time = 0" Mandate
 *
 * Features:
 * - Seedable PRNG (Pseudo-Random Number Generator)
 * - Data hashing for VRT (Visual Regression Testing)
 * - Zero-animation policy enforcement
 * - Deterministic ID generation
 */

/**
 * Mulberry32 - A fast, high-quality 32-bit PRNG.
 * Produces deterministic sequences from a given seed.
 *
 * Used for:
 * - Jitter plots (Doc 1, Section 4: Math.random() Ban)
 * - Consistent scatter point positioning
 * - Reproducible "random" visual elements
 */
declare class Mulberry32 implements SeededRandom {
    private state;
    readonly seed: number;
    constructor(seed: number);
    /**
     * Get next random number in range [0, 1).
     */
    next(): number;
    /**
     * Get random integer in range [min, max] (inclusive).
     */
    nextInt(min: number, max: number): number;
    /**
     * Get random item from array.
     */
    choice<T>(array: T[]): T;
    /**
     * Shuffle array using Fisher-Yates algorithm.
     * Returns a new array (does not mutate input).
     */
    shuffle<T>(array: T[]): T[];
    /**
     * Reset to initial seed state.
     */
    reset(): void;
}
/**
 * Generate a deterministic hash from chart data.
 * Used for VRT verification (Doc 1, Section 3: metadata.dataHash).
 */
declare function hashData(data: unknown): string;
/**
 * Generate a short hash (first 8 chars) for display/IDs.
 */
declare function shortHash(data: unknown): string;
/**
 * Generate a deterministic ID from data index.
 * Doc 1, Section 3: "Deterministic ID generated from data index"
 */
declare function generateNodeId(prefix: string, dataIndex: number, parentId?: string): string;
/**
 * Generate IDs for an array of items.
 */
declare function generateNodeIds(prefix: string, count: number, parentId?: string): string[];
/**
 * Strip all animation-related attributes from scene nodes.
 * Doc 1, Section 4: "All animations are stripped at the compiler level."
 */
declare function stripAnimations(node: SceneNode): SceneNode;
/**
 * Verify a scene graph has no animations.
 */
declare function verifyNoAnimations(graph: SceneGraph): {
    valid: boolean;
    violations: string[];
};
/**
 * Validate scene graph for determinism requirements.
 */
declare function validateDeterminism(graph: SceneGraph): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Compare two scene graphs for equality.
 * Used for "Same Data, Same ID" test (Doc 1, Section 6).
 */
declare function compareSceneGraphs(graph1: SceneGraph, graph2: SceneGraph): {
    equal: boolean;
    differences: string[];
};
/**
 * Derive a seed from data for reproducible "random" elements.
 * Doc 1, Section 4: "Seed is derived from the data hash"
 */
declare function deriveSeedFromData(data: unknown): number;
/**
 * Create a seeded random generator from chart data.
 */
declare function createSeededRandom(data: unknown): SeededRandom;

/**
 * PVCE Path Optimizer
 * ===================
 * Document 3, Section 2: Path Optimization
 *
 * Implements Visvalingam-Whyatt algorithm for path simplification
 * to reduce SVG file size while maintaining visual fidelity.
 */

/**
 * PathOptimizer - Reduces path complexity for smaller file sizes.
 *
 * Doc 3, Section 2 compliance:
 * - Visvalingam-Whyatt algorithm for point removal
 * - Sub-pixel threshold (0.01px) for insignificant points
 * - Maintains visual fidelity at target resolution
 */
declare class PathOptimizer {
    private options;
    constructor(options?: Partial<PathSimplificationOptions>);
    /**
     * Simplify a path using Visvalingam-Whyatt algorithm.
     * Removes points that contribute the least visual area.
     */
    simplifyPath(points: Point[]): OptimizedPath;
    /**
     * Simplify an SVG path string (d attribute).
     */
    simplifyPathString(pathData: string): OptimizedPath;
    /**
     * Optimize multiple paths and return combined statistics.
     */
    optimizePaths(paths: Array<{
        id: string;
        points: Point[];
    }>): {
        optimizedPaths: Array<{
            id: string;
            pathData: string;
        }>;
        totalOriginalPoints: number;
        totalOptimizedPoints: number;
        totalSavings: number;
    };
    /**
     * Visvalingam-Whyatt simplification algorithm.
     * Iteratively removes the point with the smallest effective area.
     */
    private visvalingamWhyatt;
    /**
     * Calculate the area of a triangle formed by three points.
     * Uses the shoelace formula.
     */
    private triangleArea;
    /**
     * Remove points that are within sub-pixel threshold of their neighbors.
     * Doc 3, Section 2: "Points smaller than 0.01px rendering threshold"
     */
    private filterSubPixel;
    /**
     * Euclidean distance between two points.
     */
    private distance;
    /**
     * Reduce to maximum number of points using adaptive simplification.
     */
    private reduceToMaxPoints;
    /**
     * Convert points to SVG path data string.
     */
    private pointsToPathData;
    /**
     * Format coordinate with appropriate precision.
     */
    private formatCoord;
    /**
     * Parse SVG path data into points.
     * Handles M, L, H, V, and Z commands.
     */
    private parsePathData;
    private heapify;
    private heapPop;
    private heapUpdate;
    private heapUp;
    private heapDown;
}
/** Default path optimizer */
declare const pathOptimizer: PathOptimizer;
/**
 * Simplify a path with default options.
 */
declare function simplifyPath(points: Point[]): OptimizedPath;
/**
 * Simplify an SVG path string.
 */
declare function simplifyPathString(pathData: string): OptimizedPath;
/**
 * Generate points for a line chart and optimize.
 */
declare function optimizeLineChart(values: number[], bounds: {
    x: LBU;
    y: LBU;
    width: LBU;
    height: LBU;
}): OptimizedPath;

export { AccessibilityGenerator, type AccessibilityMetadata, type AccessibilityOptions, AxisCollisionSolver, type CMYKColor, COLORBLIND_SAFE_COLORS, type ChartConfig, type ChartConstraints, type ChartData, type ChartEncoding, type ChartInput, type ChartType, type CollisionConfig, CollisionLevel, type ColorMode, type ColorPalette, ColorPipeline, type CompilationResult, type CompilationStats, type CompilerOptions, DEFAULT_PALETTE_COLORS, type DataPointAccessibility, type GlyphCacheEntry, type GlyphMetrics, GlyphOracle, type GrayscaleValue, HAIRLINE_MIN_PT, type LBU, type LabelPlacement, type LeaderLine, MIN_GRAY_DIFFERENCE, Mulberry32, type NodeMetadata, type OptimizedPath, PVCECompiler, PathOptimizer, type PathSimplificationOptions, type PatternDefinition, type PatternType, type Point, type RGBColor, type Rect, SNAP_THRESHOLD, type SVGRenderOptions, SVGRenderer, type SceneAttributes, type SceneGraph, type SceneGraphMetadata, type SceneNode, type SceneNodeType, type SeededRandom, type TextBox, type UnifiedColor, VIRTUAL_CANVAS, type ValidationError, type ValidationResult, type ValidationWarning, WCAG_CONTRAST, type XMPMetadata, accessibilityGenerator, chartToSVG, collisionSolver, colorPipeline, compareSceneGraphs, compileChart, createMonochromePalette, createSeededRandom, deriveSeedFromData, ensureMinStroke, generateChartAltText, generateNodeId, generateNodeIds, generateXMPMetadata, getContrastRatio, getMaxLabelWidth, glyphOracle, hashChartData, hashData, measureText, meetsContrastRequirement, optimizeLineChart, parseColor, pathOptimizer, pvceCompiler, renderToSVG, resolveAxisLabels, resolvePointLabels, shortHash, simplifyPath, simplifyPathString, snapToGrid, stripAnimations, svgRenderer, validateDeterminism, verifyNoAnimations };
