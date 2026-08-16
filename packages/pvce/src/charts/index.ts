/**
 * PVCE (Precision-Vector Charting Engine) - Main Entry Point
 * ==========================================================
 *
 * Production-ready charting engine implementing:
 * - Doc 1: Deterministic Scene Graph & Compiler Architecture
 * - Doc 2: Typographic Precision & Label Collision Logic
 * - Doc 3: Sub-Pixel Vector Normalization & Scaling
 * - Doc 4: Print-Specific Color & Accessible Data Structures
 *
 * @example
 * ```typescript
 * import { compileChart, chartToSVG } from './pvce';
 *
 * // Quick SVG generation
 * const svg = chartToSVG('bar', [10, 20, 30, 40]);
 *
 * // Full compilation with metadata
 * const result = compileChart('line', {
 *   data: { categories: ['Q1', 'Q2', 'Q3'], values: [100, 150, 200] },
 *   encoding: {},
 *   constraints: { width: 800, height: 600 }
 * });
 *
 * console.log(result.svg);
 * console.log(result.accessibility.altText);
 * ```
 */

// Core Types
export type {
  // Scene Graph Types (Doc 1)
  SceneGraph,
  SceneNode,
  SceneNodeType,
  SceneAttributes,
  SceneGraphMetadata,
  NodeMetadata,

  // Layout Types
  LBU,
  Point,
  Rect,

  // Text Types (Doc 2)
  TextBox,
  GlyphMetrics,
  GlyphCacheEntry,
  LabelPlacement,
  LeaderLine,

  // Color Types (Doc 4)
  RGBColor,
  CMYKColor,
  GrayscaleValue,
  UnifiedColor,
  ColorPalette,
  PatternDefinition,
  PatternType,
  ColorMode,

  // Accessibility Types (Doc 4)
  AccessibilityMetadata,
  DataPointAccessibility,
  XMPMetadata,

  // Chart Types
  ChartType,
  ChartInput,
  ChartEncoding,
  ChartConstraints,
  ChartConfig,

  // Compilation Types
  CompilationResult,
  CompilationStats,

  // Validation Types
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // Random Types (Doc 1)
  SeededRandom,

  // Path Types (Doc 3)
  OptimizedPath,
  PathSimplificationOptions,
} from "./types.js";

// Enums
export { CollisionLevel } from "./types.js";

// Constants
export { VIRTUAL_CANVAS, HAIRLINE_MIN_PT, SNAP_THRESHOLD } from "./types.js";

// Main Compiler
import {
  PVCECompiler as _PVCECompiler,
  pvceCompiler as _pvceCompiler,
  compileChart as _compileChart,
  chartToSVG as _chartToSVG,
} from "./compiler.js";

export { _PVCECompiler as PVCECompiler, _pvceCompiler as pvceCompiler };

export { _compileChart as compileChart, _chartToSVG as chartToSVG };

export type { CompilerOptions } from "./compiler.js";

// Glyph Oracle (Doc 2)
export {
  GlyphOracle,
  glyphOracle,
  measureText,
  getMaxLabelWidth,
} from "./glyph-oracle.js";

// Collision Solver (Doc 2)
export {
  AxisCollisionSolver,
  collisionSolver,
  resolveAxisLabels,
  resolvePointLabels,
} from "./collision-solver.js";

export type { CollisionConfig } from "./collision-solver.js";

// SVG Renderer (Doc 3)
export {
  SVGRenderer,
  svgRenderer,
  renderToSVG,
  snapToGrid,
  ensureMinStroke,
} from "./svg-renderer.js";

export type { SVGRenderOptions } from "./svg-renderer.js";

// Color Pipeline (Doc 4)
export {
  ColorPipeline,
  colorPipeline,
  parseColor,
  getContrastRatio,
  meetsContrastRequirement,
  createMonochromePalette,
  WCAG_CONTRAST,
  MIN_GRAY_DIFFERENCE,
  DEFAULT_PALETTE_COLORS,
  COLORBLIND_SAFE_COLORS,
} from "./color-pipeline.js";

// Accessibility (Doc 4)
export {
  AccessibilityGenerator,
  accessibilityGenerator,
  generateChartAltText,
  generateXMPMetadata,
  hashChartData,
} from "./accessibility.js";

export type { AccessibilityOptions, ChartData } from "./accessibility.js";

// Determinism Engine (Doc 1)
export {
  Mulberry32,
  hashData,
  shortHash,
  generateNodeId,
  generateNodeIds,
  stripAnimations,
  verifyNoAnimations,
  validateDeterminism,
  compareSceneGraphs,
  deriveSeedFromData,
  createSeededRandom,
} from "./determinism.js";

// Path Optimizer (Doc 3)
export {
  PathOptimizer,
  pathOptimizer,
  simplifyPath,
  simplifyPathString,
  optimizeLineChart,
} from "./path-optimizer.js";
