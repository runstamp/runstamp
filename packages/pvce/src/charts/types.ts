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

// =============================================================================
// DOCUMENT 1: Scene Graph & Determinism Types
// =============================================================================

/** Layout Base Unit - internal coordinate system (Doc 3) */
export type LBU = number;

/** Point in LBU coordinate space */
export interface Point {
  x: LBU;
  y: LBU;
}

/** Rectangle in LBU coordinate space */
export interface Rect {
  x: LBU;
  y: LBU;
  width: LBU;
  height: LBU;
}

/** Scene Node type enumeration */
export type SceneNodeType =
  | "group"
  | "path"
  | "text"
  | "rect"
  | "circle"
  | "line"
  | "pattern";

/** Core Scene Node (Doc 1 Section 3) */
export interface SceneNode {
  type: SceneNodeType;
  id: string;
  x: LBU;
  y: LBU;
  attributes: SceneAttributes;
  children?: SceneNode[];
  metadata?: NodeMetadata;
}

/** Scene node attributes */
export interface SceneAttributes {
  // Geometry
  width?: LBU;
  height?: LBU;
  radius?: LBU;

  // Path data
  d?: string;

  // Line endpoints
  x1?: LBU;
  y1?: LBU;
  x2?: LBU;
  y2?: LBU;

  // Visual styling
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  opacity?: number;

  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold" | "light";
  textAnchor?: "start" | "middle" | "end";
  dominantBaseline?: "auto" | "middle" | "hanging" | "alphabetic";

  // Transform
  transform?: string;
  rotation?: number;

  // Vector effects (Doc 3)
  vectorEffect?: "non-scaling-stroke" | "none";

  // Pattern reference
  patternId?: string;

  // Accessibility (Doc 4)
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/** Node metadata for traceability */
export interface NodeMetadata {
  dataIndex?: number;
  dataValue?: number;
  category?: string;
  seriesName?: string;
  sourcePoint?: Point;
  displacement?: number;
  needsLeaderLine?: boolean;
  isAccessibilityNode?: boolean;
  // Z-Layer metadata (Chart-Text Doc 1, Section 3)
  layer?: number;
  layerName?: string;
  layerCount?: number;
  // Halo/Knockout metadata (Chart-Text Doc 1, Section 4)
  isHalo?: boolean;
  haloTargetId?: string;
  // Annotation metadata (Chart-Text Doc 2)
  priority?: number;
  isAnnotation?: boolean;
  anchorPosition?: string;
}

/** Scene Graph IR (Doc 1 Section 3) */
export interface SceneGraph {
  version: string;
  viewBox: { width: LBU; height: LBU };
  root: SceneNode;
  metadata: SceneGraphMetadata;
  defs?: SceneGraphDefs;
}

/** Scene graph metadata for VRT verification */
export interface SceneGraphMetadata {
  dataHash: string;
  generatedAt: number;
  deterministicSeed?: number;
  chartType: ChartType;
  accessibility: AccessibilityMetadata;
}

/** Reusable definitions (patterns, gradients) */
export interface SceneGraphDefs {
  patterns: PatternDefinition[];
  gradients?: GradientDefinition[];
}

// =============================================================================
// DOCUMENT 2: Typography & Label Collision Types
// =============================================================================

/** Text bounding box (Doc 2 Section 2) */
export interface TextBox {
  text: string;
  width: LBU;
  height: LBU;
  anchor: "start" | "middle" | "end";
  rotation: number;
  padding: LBU;
  baseline: "top" | "middle" | "bottom";
}

/** Measured glyph metrics */
export interface GlyphMetrics {
  text: string;
  width: number;
  height: number;
  ascent: number;
  descent: number;
  fontFamily: string;
  fontSize: number;
}

/** Glyph cache entry */
export interface GlyphCacheEntry {
  key: string;
  metrics: GlyphMetrics;
  lastAccessed: number;
}

/** Label collision resolution level (Doc 2 Section 3) */
export enum CollisionLevel {
  STANDARD = 0, // Horizontal labels
  STAGGERED = 1, // Alternating rows
  ROTATED_45 = 2, // 45-degree rotation
  ROTATED_90 = 3, // 90-degree rotation
  SAMPLED = 4, // Show every Nth label
}

/** Label placement result */
export interface LabelPlacement {
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
export interface LeaderLine {
  fromPoint: Point;
  toPoint: Point;
  elbowPoint?: Point;
  targetLabelId: string;
}

// =============================================================================
// DOCUMENT 3: Vector Fidelity Types
// =============================================================================

/** Virtual canvas (LBU space) - Doc 3 Section 3 */
export const VIRTUAL_CANVAS = {
  WIDTH: 10000,
  HEIGHT: 10000,
} as const;

/** Minimum stroke width (hairline) in points - Doc 3 Section 4 */
export const HAIRLINE_MIN_PT = 0.25;

/** Sub-pixel snapping threshold - Doc 3 Section 5 */
export const SNAP_THRESHOLD = 0.5;

/** Path simplification options (Visvalingam-Whyatt) */
export interface PathSimplificationOptions {
  /** Minimum area threshold for point removal */
  areaThreshold: number;
  /** Sub-pixel threshold (default 0.01px) */
  subPixelThreshold: number;
  /** Maximum points to retain */
  maxPoints?: number;
}

/** Optimized path segment */
export interface OptimizedPath {
  originalPointCount: number;
  optimizedPointCount: number;
  pathData: string;
  savings: number;
}

// =============================================================================
// DOCUMENT 4: Color & Accessibility Types
// =============================================================================

/** Color mode (Doc 4 Section 2) */
export type ColorMode = "rgb" | "cmyk" | "monochrome";

/** RGB color */
export interface RGBColor {
  r: number; // 0-255
  g: number;
  b: number;
  a?: number; // 0-1
}

/** CMYK color for print (Doc 4 Section 2) */
export interface CMYKColor {
  c: number; // 0-100
  m: number;
  y: number;
  k: number;
}

/** Grayscale value with perceptual luminance */
export interface GrayscaleValue {
  gray: number; // 0-100
  perceptualLuminance: number; // 0-1
}

/** Color with all representations */
export interface UnifiedColor {
  rgb: RGBColor;
  cmyk: CMYKColor;
  grayscale: GrayscaleValue;
  hex: string;
  contrastRatio?: number;
}

/** Deterministic pattern for monochrome (Doc 4 Section 3) */
export interface PatternDefinition {
  id: string;
  seriesIndex: number;
  type: PatternType;
  strokeWidth: number;
  spacing: number;
  angle?: number;
}

/** Pattern types for accessibility */
export type PatternType =
  | "diagonal-lines" // Series 0: 45°
  | "dots" // Series 1
  | "crosshatch" // Series 2
  | "horizontal-lines" // Series 3
  | "vertical-lines" // Series 4
  | "diagonal-reverse" // Series 5: -45°
  | "grid" // Series 6
  | "circles"; // Series 7

/** Gradient definition */
export interface GradientDefinition {
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
export interface ColorPalette {
  name: string;
  colors: UnifiedColor[];
  patterns: PatternDefinition[];
  meetsWCAG: boolean;
  minContrastRatio: number;
}

/** Accessibility metadata (Doc 4 Section 4) */
export interface AccessibilityMetadata {
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
export interface DataPointAccessibility {
  index: number;
  category: string;
  value: number | string;
  formattedValue: string;
  percentage?: number;
  description: string;
}

/** XMP metadata for data provenance (Doc 4 Section 5) */
export interface XMPMetadata {
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

// =============================================================================
// CHART CONFIGURATION TYPES
// =============================================================================

/** Supported chart types */
export type ChartType =
  | "bar"
  | "line"
  | "scatter"
  | "pie"
  | "donut"
  | "waterfall"
  | "marimekko"
  | "area"
  | "stacked-bar"
  | "grouped-bar"
  | "combo";

/** Chart input schema (Doc 1 Section 2) */
export interface ChartInput<T = unknown> {
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
export interface ChartEncoding {
  x?: FieldEncoding;
  y?: FieldEncoding;
  color?: FieldEncoding;
  size?: FieldEncoding;
  label?: FieldEncoding;
  tooltip?: FieldEncoding;
}

/** Field encoding details */
export interface FieldEncoding {
  field: string;
  type?: "quantitative" | "nominal" | "ordinal" | "temporal";
  title?: string;
  scale?: ScaleConfig;
  axis?: AxisConfig;
  format?: string;
}

/** Scale configuration */
export interface ScaleConfig {
  type: "linear" | "log" | "time" | "ordinal" | "band";
  domain?: [number, number] | string[];
  range?: [number, number] | string[];
  nice?: boolean;
  padding?: number;
}

/** Axis configuration (Doc 2 Section 3) */
export interface AxisConfig {
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
export interface ChartConstraints {
  width: LBU;
  height: LBU;
  maxWidth?: LBU;
  maxHeight?: LBU;
  margin?: { top: LBU; right: LBU; bottom: LBU; left: LBU };
}

/** Chart configuration */
export interface ChartConfig {
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

// =============================================================================
// COMPILER OUTPUT TYPES
// =============================================================================

/** Full compilation result */
export interface CompilationResult {
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
export interface CompilationStats {
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

// =============================================================================
// SCALE TYPES (Doc 1 Section 2)
// =============================================================================

/** Scale function interface */
export interface Scale<Domain = number, Range = number> {
  (value: Domain): Range;
  domain(): Domain[];
  range(): Range[];
  invert?(value: Range): Domain;
}

/** Linear scale */
export interface LinearScale extends Scale<number, number> {
  type: "linear";
  nice(count?: number): LinearScale;
  ticks(count?: number): number[];
}

/** Log scale */
export interface LogScale extends Scale<number, number> {
  type: "log";
  base(value?: number): number | LogScale;
}

/** Time scale */
export interface TimeScale extends Scale<Date, number> {
  type: "time";
  ticks(count?: number): Date[];
}

/** Ordinal scale */
export interface OrdinalScale<T = string> extends Scale<T, number> {
  type: "ordinal";
  bandwidth(): number;
  step(): number;
}

// =============================================================================
// SEEDABLE PRNG (Doc 1 Section 4)
// =============================================================================

/** Seedable random number generator */
export interface SeededRandom {
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

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  value?: unknown;
}

/** Validation warning */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  value?: unknown;
  suggestion?: string;
}
