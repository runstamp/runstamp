/**
 * Visual Polish System - Main Export
 * ===================================
 *
 * Complete implementation of the Visual Polish layer for the PDF Engine.
 *
 * Implements:
 * - Doc 1: Design Token System & Theming Architecture
 * - Doc 2: Advanced Visual Effects & Print Fidelity
 * - Doc 3: Document Furniture & Structural Polish
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export * from "./types";

// =============================================================================
// DOC 1: DESIGN TOKEN SYSTEM & THEMING
// =============================================================================

// Design Tokens (Doc 1, Section 2)
export {
  DesignTokenManager,
  DEFAULT_THEME,
  DARK_THEME,
  COMPACT_THEME,
  SPACIOUS_THEME,
  hexToRgb,
  calculateContrastRatio,
  meetsWCAGAA,
  designTokenManager,
} from "./design-tokens";

// Baseline Grid & Vertical Rhythm (Doc 1, Section 3)
export {
  BaselineGridCalculator,
  VerticalRhythmManager,
  DEFAULT_GRID_CONFIG,
} from "./baseline-grid";

// CSS Variable Bridge (Doc 1, Section 4)
export { CSSVariableBridge } from "./css-bridge";

// Height Cache Invalidation (Doc 1, Section 5)
export {
  HeightCacheInvalidator,
  ThemeChangeDetector,
} from "./cache-invalidation";

// =============================================================================
// DOC 2: ADVANCED VISUAL EFFECTS & PRINT FIDELITY
// =============================================================================

// Vector-Grade Shadow Physics (Doc 2, Section 2)
export {
  ShadowFilterGenerator,
  ShadowApplicator,
  SHADOW_PRESETS,
  shadowFilterGenerator,
  shadowApplicator,
} from "./shadow-physics";

// Anti-Banding Gradient Dithering (Doc 2, Section 3)
export {
  GradientGenerator,
  GradientRectGenerator,
  GRADIENT_PRESETS,
  gradientGenerator,
  gradientRectGenerator,
} from "./gradient-dither";

// Pre-Press Furniture (Doc 2, Section 4)
export {
  PrePressBoxCalculator,
  CropMarksGenerator,
  SlugContentGenerator,
  PrePressPageGenerator,
  BLEED_SIZES,
  PREPRESS_PRESETS,
  mmToPt,
  inchToPt,
  ptToMm,
  defaultPrePressGenerator,
} from "./prepress";

// Color Integrity (Doc 2, Section 5)
export {
  ColorIntegrityConverter,
  ColorPaletteConverter,
  rgbToCmyk,
  cmykToRgb,
  hexToCmyk,
  applyGCR,
  limitInkDensity,
  SPOT_COLORS,
  colorIntegrityConverter,
  paletteConverter,
} from "./color-integrity";

// ICC Profiles & Color Management (PRD-003 Section 3.2)
export {
  ColorManager,
  createColorManager,
  formatCMYK,
  parseCMYK,
  getRichBlack,
  isValidRichBlack,
  STANDARD_PROFILES,
  PANTONE_COLORS,
  type ICCProfile,
  type SpotColor,
  type ColorManagementConfig,
  type ColorConversionResult,
  type ColorSpace,
  type RenderingIntent,
} from "./icc-profiles";

// Font Subsetting (PRD-003 Section 3.1)
export {
  FontSubsetter,
  subsetFontForText,
  analyzeTextUnicodeRanges,
  formatBytes,
  generateSubsettingReport,
  type FontSubsettingOptions,
  type FontUsageAnalysis,
  type SubsetResult,
  type FontSubsettingResult,
  type UnicodeRange,
} from "./font-subsetting";

// =============================================================================
// DOC 3: DOCUMENT FURNITURE & STRUCTURAL POLISH
// =============================================================================

// Running Headers (Doc 3, Section 2)
export {
  SectionMarkerScanner,
  PageSectionTracker,
  RunningHeaderGenerator,
  ContentBridgeDetector,
  RunningHeaderProcessor,
  RUNNING_HEADER_PRESETS,
  sectionScanner,
  pageSectionTracker,
} from "./running-headers";

// Page N of M Resolver (Doc 3, Section 3)
export {
  PageNumberResolver,
  MultiSectionNumberResolver,
  PageNumberRenderer,
  formatPageNumber,
  PLACEHOLDERS,
  PAGE_NUMBERING_PRESETS,
  pageNumberResolver,
} from "./page-numbering";

// Special Page Layouts (Doc 3, Section 4)
export {
  LayoutManager,
  CoverPageGenerator,
  ChapterOpenerGenerator,
  MultiColumnLayout,
  PageLayoutProcessor,
  LAYOUT_PRESETS,
  layoutManager,
  coverPageGenerator,
  chapterOpenerGenerator,
} from "./special-layouts";

// Table Continuation Polish (Doc 3, Section 5)
export {
  TableContinuationTracker,
  ContinuationBadgeGenerator,
  ZebraStripeManager,
  TableHeaderRepeater,
  TableContinuationProcessor,
  TableSplitDetector,
  TABLE_CONTINUATION_PRESETS,
  tableContinuationTracker,
  tableContinuationProcessor,
} from "./table-continuation";

// Watermark System (Doc 3, Section 6)
export {
  WatermarkGenerator,
  WatermarkApplicator,
  TiledWatermarkGenerator,
  TimestampWatermark,
  WatermarkProcessor,
  WATERMARK_PRESETS,
  watermarkGenerator,
  watermarkApplicator,
  watermarkProcessor,
} from "./watermarks";

// =============================================================================
// UNIFIED VISUAL POLISH PROCESSOR
// =============================================================================

import { Theme, ShadowConfig } from "./types";
import { DesignTokenManager, DEFAULT_THEME } from "./design-tokens";
import { BaselineGridCalculator, VerticalRhythmManager } from "./baseline-grid";
import { CSSVariableBridge } from "./css-bridge";
import {
  HeightCacheInvalidator,
  ThemeChangeDetector,
} from "./cache-invalidation";
import {
  ShadowFilterGenerator,
  ShadowApplicator,
  SHADOW_PRESETS,
} from "./shadow-physics";
import { GradientGenerator } from "./gradient-dither";
import { PrePressPageGenerator, PREPRESS_PRESETS } from "./prepress";
import {
  ColorIntegrityConverter,
  ColorPaletteConverter,
} from "./color-integrity";
import {
  RunningHeaderProcessor,
  RUNNING_HEADER_PRESETS,
} from "./running-headers";
import {
  PageNumberResolver,
  PageNumberRenderer,
  PAGE_NUMBERING_PRESETS,
} from "./page-numbering";
import { PageLayoutProcessor } from "./special-layouts";
import { TableContinuationProcessor } from "./table-continuation";
import { WatermarkProcessor } from "./watermarks";

/**
 * VisualPolishProcessor - Unified processor for all visual polish features
 */
export class VisualPolishProcessor {
  // Doc 1 components
  readonly tokenManager: DesignTokenManager;
  readonly baselineGrid: BaselineGridCalculator;
  readonly verticalRhythm: VerticalRhythmManager;
  readonly cssBridge: CSSVariableBridge;
  readonly cacheInvalidator: HeightCacheInvalidator;
  readonly themeDetector: ThemeChangeDetector;

  // Current theme reference
  private currentTheme: Theme;

  // Doc 2 components
  readonly shadowGenerator: ShadowFilterGenerator;
  readonly shadowApplicator: ShadowApplicator;
  readonly gradientGenerator: GradientGenerator;
  readonly prePressGenerator: PrePressPageGenerator;
  readonly colorConverter: ColorIntegrityConverter;
  readonly paletteConverter: ColorPaletteConverter;

  // Doc 3 components
  readonly headerProcessor: RunningHeaderProcessor;
  readonly pageNumberResolver: PageNumberResolver;
  readonly pageNumberRenderer: PageNumberRenderer;
  readonly layoutProcessor: PageLayoutProcessor;
  readonly tableProcessor: TableContinuationProcessor;
  readonly watermarkProcessor: WatermarkProcessor;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.currentTheme = theme;

    // Initialize Doc 1 components
    this.tokenManager = new DesignTokenManager(theme);
    this.baselineGrid = new BaselineGridCalculator();
    this.verticalRhythm = new VerticalRhythmManager(this.baselineGrid);
    this.cssBridge = new CSSVariableBridge(theme);
    this.cacheInvalidator = new HeightCacheInvalidator();
    this.themeDetector = new ThemeChangeDetector();

    // Initialize Doc 2 components
    this.shadowGenerator = new ShadowFilterGenerator();
    this.shadowApplicator = new ShadowApplicator(this.shadowGenerator);
    this.gradientGenerator = new GradientGenerator();
    this.prePressGenerator = new PrePressPageGenerator(
      PREPRESS_PRESETS.commercial,
    );
    this.colorConverter = new ColorIntegrityConverter();
    this.paletteConverter = new ColorPaletteConverter(this.colorConverter);

    // Initialize Doc 3 components
    this.headerProcessor = new RunningHeaderProcessor(
      RUNNING_HEADER_PRESETS.standard,
    );
    this.pageNumberResolver = new PageNumberResolver(
      PAGE_NUMBERING_PRESETS.pageOfTotal,
    );
    this.pageNumberRenderer = new PageNumberRenderer(
      PAGE_NUMBERING_PRESETS.pageOfTotal,
    );
    this.layoutProcessor = new PageLayoutProcessor();
    this.tableProcessor = new TableContinuationProcessor();
    this.watermarkProcessor = new WatermarkProcessor();
  }

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    const oldTheme = this.currentTheme;
    this.currentTheme = theme;
    this.tokenManager.setTheme(theme);

    // Check for cache invalidation
    const change = this.themeDetector.analyze(oldTheme, theme);
    if (change.isLayoutChange) {
      this.cacheInvalidator.clearCache();
    }
  }

  /**
   * Generate all CSS for current configuration
   */
  generateCSS(): string {
    const sections: string[] = [
      "/* Visual Polish System - Generated CSS */",
      "",
      "/* === Design Tokens (CSS Variables) === */",
      this.cssBridge.generateCSSVariables(),
      "",
      "/* === Component Styles === */",
      this.cssBridge.generateComponentCSS(),
      "",
      "/* === Running Header Styles === */",
      this.headerProcessor.getCSS(),
      "",
      "/* === Page Number Styles === */",
      this.pageNumberRenderer.generateCSS(),
      "",
      "/* === Layout Styles === */",
      this.layoutProcessor.generateCSS(),
      "",
      "/* === Table Continuation Styles === */",
      this.tableProcessor.generateCSS(),
      "",
      "/* === Watermark Styles === */",
      this.watermarkProcessor.generateCSS(),
    ];

    return sections.join("\n");
  }

  /**
   * Get shadow filter definitions for SVG
   */
  getShadowFilters(): string {
    // Collect all generated filters
    const filters: string[] = [];
    for (const preset of Object.values(SHADOW_PRESETS) as ShadowConfig[]) {
      const filter = this.shadowGenerator.generateShadowFilter(preset);
      filters.push(filter.filterDef);
    }
    return `<defs>\n${filters.join("\n")}\n</defs>`;
  }

  /**
   * Process page content with all visual polish features
   */
  processPage(
    content: string,
    pageNumber: number,
    totalPages: number,
    pageWidth: number,
    pageHeight: number,
    documentTitle?: string,
  ): string {
    // Get layout for this page
    const layout = this.layoutProcessor.getLayout(pageNumber);

    // Generate running header (if applicable)
    const header = layout.showHeader
      ? this.headerProcessor.generateHeader(
          pageNumber,
          totalPages,
          documentTitle,
        )
      : null;

    // Generate page number (if applicable)
    const pageNum = layout.showPageNumber
      ? this.pageNumberRenderer.render(pageNumber)
      : null;

    // Generate watermarks
    const watermarks = this.watermarkProcessor.generateForPage(
      pageNumber,
      pageWidth,
      pageHeight,
    );

    // Assemble page
    const parts: string[] = [];

    if (watermarks) {
      parts.push(`<div class="watermark-layer">${watermarks}</div>`);
    }

    if (header) {
      parts.push(`<header class="running-header-container">${header}</header>`);
    }

    parts.push(`<main class="page-content">${content}</main>`);

    if (pageNum) {
      parts.push(`<footer class="page-number-container">${pageNum}</footer>`);
    }

    return parts.join("\n");
  }

  /**
   * Reset all processors for new document
   */
  reset(): void {
    this.cacheInvalidator.clearCache();
    this.headerProcessor.reset();
    this.pageNumberResolver.reset();
    this.layoutProcessor.reset();
    this.tableProcessor.reset();
    this.watermarkProcessor.reset();
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

let defaultVisualPolishProcessor: VisualPolishProcessor | undefined;

export function getVisualPolishProcessor(): VisualPolishProcessor {
  defaultVisualPolishProcessor ??= new VisualPolishProcessor();
  return defaultVisualPolishProcessor;
}

/** Default visual polish processor instance */
export const visualPolishProcessor = new Proxy({} as VisualPolishProcessor, {
  get(_target, prop, _receiver) {
    const instance = getVisualPolishProcessor();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  set(_target, prop, value, _receiver) {
    const instance = getVisualPolishProcessor();
    return Reflect.set(instance, prop, value, instance);
  },
});
