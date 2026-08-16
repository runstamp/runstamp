/**
 * Visual Polish Type Definitions
 * ==============================
 *
 * Core types for the Design Token System, Visual Effects,
 * and Document Furniture layers.
 */

// =============================================================================
// UNIT TYPES
// =============================================================================

/** Print-safe point unit (1/72 inch) */
export type PT = number;

/** Millimeters */
export type MM = number;

/** Inches */
export type INCH = number;

/** Layout Base Units (internal coordinate system) */
export type LBU = number;

/** Percentage (0-100) */
export type Percent = number;

/** CMYK color value (0-100 each channel) */
export interface CMYKColor {
  c: Percent;
  m: Percent;
  y: Percent;
  k: Percent;
}

/** RGB color value (0-255 each channel) */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Hex color string (#RRGGBB or #RGB) */
export type HexColor = string;

/** Any supported color format */
export type ColorValue = HexColor | RGBColor | CMYKColor;

// =============================================================================
// DESIGN TOKEN TYPES (Doc 1)
// =============================================================================

/** Color palette tokens */
export interface ColorTokens {
  /** Primary brand color */
  "brand-primary": HexColor;
  /** Secondary brand color */
  "brand-secondary"?: HexColor;
  /** Main text color */
  "text-main": HexColor;
  /** Muted text color */
  "text-muted"?: HexColor;
  /** Primary surface/background color */
  "bg-surface": HexColor;
  /** Secondary surface color */
  "bg-surface-alt"?: HexColor;
  /** Accent color for highlights */
  accent?: HexColor;
  /** Success color */
  "semantic-success"?: HexColor;
  /** Warning color */
  "semantic-warning"?: HexColor;
  /** Error/danger color */
  "semantic-error"?: HexColor;
  /** Chart color sequence for data series */
  "chart-sequence": HexColor[];
  /** Table border color */
  "table-border"?: HexColor;
  /** Table header background */
  "table-header-bg"?: HexColor;
  /** Table zebra stripe color */
  "table-stripe"?: HexColor;
}

/** Spacing tokens (all in PT) */
export interface SpacingTokens {
  /** Base grid unit (default: 4pt) */
  "grid-base": string;
  /** Container padding */
  "container-padding": string;
  /** Table cell vertical padding */
  "table-cell-y": string;
  /** Table cell horizontal padding */
  "table-cell-x"?: string;
  /** Section spacing */
  "section-gap"?: string;
  /** Paragraph spacing */
  "paragraph-gap"?: string;
  /** Small spacing */
  "spacing-xs"?: string;
  /** Medium spacing */
  "spacing-sm"?: string;
  /** Large spacing */
  "spacing-md"?: string;
  /** Extra large spacing */
  "spacing-lg"?: string;
}

/** Typography tokens */
export interface TypographyTokens {
  /** Heading font family */
  "font-heading": string;
  /** Body font family */
  "font-body": string;
  /** Monospace font family */
  "font-mono"?: string;
  /** Type scale ratio (e.g., 1.25 for Major Third) */
  "scale-ratio": number;
  /** Base font size */
  "base-size": string;
  /** Line height multiplier */
  "line-height": number;
  /** Letter spacing */
  "letter-spacing"?: string;
  /** Heading line height */
  "heading-line-height"?: number;
  /** Font weight for body text */
  "font-weight-normal"?: number;
  /** Font weight for bold text */
  "font-weight-bold"?: number;
}

/** Border/radius tokens */
export interface GeometryTokens {
  /** Border radius for cards */
  "radius-sm"?: string;
  /** Border radius for larger elements */
  "radius-md"?: string;
  /** Border radius for buttons */
  "radius-lg"?: string;
  /** Default border width */
  "border-width"?: string;
}

/** Complete theme token structure */
export interface ThemeTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  geometry?: GeometryTokens;
}

/** Full theme configuration */
export interface Theme {
  /** Unique theme identifier */
  theme_id: string;
  /** Theme display name */
  name?: string;
  /** Theme description */
  description?: string;
  /** Token definitions */
  tokens: ThemeTokens;
  /** Custom font URLs to load */
  fontUrls?: string[];
  /** ICC profile for CMYK conversion */
  iccProfile?: string;
}

// =============================================================================
// BASELINE GRID TYPES (Doc 1, Section 3)
// =============================================================================

/** Grid alignment result */
export interface GridAlignment {
  /** Original height */
  originalHeight: PT;
  /** Aligned height (snapped to grid) */
  alignedHeight: PT;
  /** Bottom spacer added */
  spacerHeight: PT;
  /** Number of grid units */
  gridUnits: number;
}

/** Baseline grid configuration */
export interface BaselineGridConfig {
  /** Base grid unit in points */
  gridBase: PT;
  /** Whether to enforce strict alignment */
  strictMode: boolean;
  /** Tolerance for sub-pixel differences */
  tolerance: PT;
}

// =============================================================================
// VISUAL EFFECTS TYPES (Doc 2)
// =============================================================================

/** Shadow definition */
export interface ShadowConfig {
  /** Horizontal offset */
  offsetX: PT;
  /** Vertical offset */
  offsetY: PT;
  /** Blur radius */
  blur: PT;
  /** Spread radius */
  spread: PT;
  /** Shadow color */
  color: HexColor;
  /** Opacity (0-1) */
  opacity: number;
  /** Inset shadow */
  inset?: boolean;
}

/** SVG filter definition for shadow */
export interface ShadowFilter {
  /** Filter ID */
  filterId: string;
  /** SVG filter definition string */
  filterDef: string;
  /** CSS filter reference */
  cssFilter: string;
}

/** Gradient stop */
export interface GradientStop {
  /** Color at this stop */
  color: HexColor;
  /** Position (0-100%) */
  position: Percent;
}

/** Gradient definition */
export interface GradientConfig {
  /** Gradient type */
  type: "linear" | "radial";
  /** Gradient angle (for linear) */
  angle?: number;
  /** Gradient stops */
  stops: GradientStop[];
  /** Whether to apply dithering */
  dither?: boolean;
}

/** Dither filter result */
export interface DitherFilter {
  /** Filter ID */
  filterId: string;
  /** SVG filter definition */
  filterDef: string;
}

// =============================================================================
// PRE-PRESS TYPES (Doc 2, Section 4)
// =============================================================================

/** Page box dimensions */
export interface PageBox {
  /** X origin */
  x: PT;
  /** Y origin */
  y: PT;
  /** Width */
  width: PT;
  /** Height */
  height: PT;
}

/** Pre-press boxes (all four boxes) */
export interface PrePressBoxes {
  /** Physical paper size (includes all marks) */
  mediaBox: PageBox;
  /** Bleed area */
  bleedBox: PageBox;
  /** Final trim size */
  trimBox: PageBox;
  /** Safe content area */
  artBox: PageBox;
}

/** Crop mark configuration */
export interface CropMarkConfig {
  /** Length of crop mark lines */
  length: PT;
  /** Offset from trim edge */
  offset: PT;
  /** Stroke width */
  strokeWidth: PT;
  /** Stroke color ('registration' for all inks) */
  color: HexColor | "registration";
}

/** Pre-press configuration */
export interface PrePressConfig {
  /** Final trim size */
  trimSize?: { width: PT; height: PT };
  /** Bleed extension (typically 3mm = 9pt) */
  bleed?: PT;
  /** Safety margin (typically 5mm = 18pt) */
  safeMargin?: PT;
  /** Whether to include crop marks */
  cropMarks?: boolean;
  /** Whether to include registration marks */
  registrationMarks?: boolean;
  /** Whether to include color bar */
  colorBar?: boolean;
  /** Whether to include slug information */
  slug?: boolean;
  /** Crop mark length */
  cropMarkLength?: PT;
  /** Crop mark offset from trim */
  cropMarkOffset?: PT;
  /** Bleed area background color */
  bleedColor?: HexColor;
  /** Legacy aliases */
  safetyMargin?: PT;
  includeCropMarks?: boolean;
  includeRegistrationMarks?: boolean;
}

/** Triple box model (legacy interface) */
export interface TripleBoxModel {
  /** Physical paper size (includes bleed) */
  mediaBox: PageBox;
  /** Bleed area */
  bleedBox: PageBox;
  /** Final trim size */
  trimBox: PageBox;
  /** Safe content area */
  safetyBox: PageBox;
}

/** Crop mark definition (legacy) */
export interface CropMark {
  /** Start point */
  start: { x: PT; y: PT };
  /** End point */
  end: { x: PT; y: PT };
  /** Mark type */
  type: "corner" | "center";
}

// =============================================================================
// COLOR INTEGRITY TYPES (Doc 2, Section 5)
// =============================================================================

/** Color gamut status */
export type GamutStatus = "in-gamut" | "out-of-gamut" | "clipped";

/** Color conversion result */
export interface ColorConversion {
  /** Original RGB color */
  original: RGBColor;
  /** Converted CMYK color */
  cmyk: CMYKColor;
  /** Gamut status */
  gamutStatus: GamutStatus;
  /** Delta E (color difference) */
  deltaE?: number;
}

/** ICC profile information */
export interface ICCProfile {
  /** Profile name */
  name: string;
  /** Profile type */
  type: "input" | "display" | "output";
  /** Color space */
  colorSpace: "RGB" | "CMYK" | "LAB";
  /** Rendering intent */
  renderingIntent:
    | "perceptual"
    | "relative-colorimetric"
    | "saturation"
    | "absolute-colorimetric";
}

// =============================================================================
// DOCUMENT FURNITURE TYPES (Doc 3)
// =============================================================================

/** Section marker for running headers */
export interface SectionMarker {
  /** Section ID */
  id: string;
  /** Section title */
  title: string;
  /** Section level (1 = h1, 2 = h2, etc.) */
  level: number;
  /** Page number where section starts */
  startPage: number;
  /** Element selector */
  selector?: string;
}

/** Running header configuration */
export interface RunningHeaderConfig {
  /** Header template */
  template: string;
  /** Section priority rule */
  priorityRule: "first-on-page" | "starts-on-page" | "last-on-page";
  /** Show on first page */
  showOnFirstPage: boolean;
  /** Show on cover pages */
  showOnCover: boolean;
  /** Exclude sections by level */
  excludeLevels?: number[];
}

/** Page numbering style */
export type NumberingStyle =
  | "arabic" // 1, 2, 3
  | "roman-lower" // i, ii, iii
  | "roman-upper" // I, II, III
  | "alpha-lower" // a, b, c
  | "alpha-upper"; // A, B, C;

/** Page numbering configuration */
export interface PageNumberingConfig {
  /** Format string (e.g., "Page {{PAGE}} of {{TOTAL}}") */
  format: string;
  /** Numbering style */
  style: NumberingStyle;
  /** Start page number */
  startNumber: number;
  /** Pages to skip numbering */
  skipPages?: number[];
  /** Use tabular numbers for alignment */
  tabularNums: boolean;
}

/** Resolved page number */
export interface ResolvedPageNumber {
  /** Current page number */
  current: number;
  /** Total pages */
  total: number;
  /** Formatted string */
  formatted: string;
}

// =============================================================================
// SPECIAL LAYOUT TYPES (Doc 3, Section 4)
// =============================================================================

/** Page layout type */
export type LayoutType =
  | "standard" // Normal margins
  | "cover" // Full bleed, no margins
  | "chapter" // Chapter opener (special top margin)
  | "multi-column" // Multi-column layout
  | "landscape"; // Rotated page

/** Layout override configuration */
export interface LayoutOverride {
  /** Layout type */
  type: LayoutType;
  /** Number of columns (for multi-column) */
  columns?: number;
  /** Column gap */
  columnGap?: PT;
  /** Custom margins */
  margins?: {
    top?: PT;
    right?: PT;
    bottom?: PT;
    left?: PT;
  };
  /** Full bleed background */
  fullBleed?: boolean;
}

/** Cover page configuration */
export interface CoverPageConfig {
  /** Background color or image */
  background?: HexColor | { url: string };
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Logo URL */
  logo?: string;
  /** Date */
  date?: string;
  /** Custom content */
  customContent?: string;
}

// =============================================================================
// TABLE CONTINUATION TYPES (Doc 3, Section 5)
// =============================================================================

/** Table continuation state */
export interface TableContinuationState {
  /** Table ID */
  tableId: string;
  /** Table caption */
  caption?: string;
  /** Current page segment */
  segment: number;
  /** Total segments */
  totalSegments: number;
  /** Last row index on previous page */
  lastRowIndex: number;
  /** Last row was even (for zebra striping) */
  lastRowWasEven: boolean;
}

/** Continuation badge configuration */
export interface ContinuationBadgeConfig {
  /** Show continuation badge */
  showBadge: boolean;
  /** Badge template (e.g., "{{CAPTION}} (Continued)") */
  template: string;
  /** Badge position */
  position: "above-header" | "in-header" | "below-header";
  /** Badge styling */
  style?: {
    fontStyle?: "normal" | "italic";
    fontSize?: PT;
    color?: HexColor;
  };
}

/** Zebra stripe configuration */
export interface ZebraStripeConfig {
  /** Enable zebra striping */
  enabled: boolean;
  /** Even row color */
  evenColor: HexColor;
  /** Odd row color */
  oddColor: HexColor;
  /** Start with even (true) or odd (false) */
  startEven: boolean;
}

// =============================================================================
// WATERMARK TYPES (Doc 3, Section 6)
// =============================================================================

/** Watermark type */
export type WatermarkType = "text" | "image";

/** Watermark position */
export type WatermarkPosition =
  | "center"
  | "diagonal"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** Watermark configuration */
export interface WatermarkConfig {
  /** Watermark type */
  type: WatermarkType;
  /** Text content (for text watermarks) */
  text?: string;
  /** Image URL (for image watermarks) */
  imageUrl?: string;
  /** Position on page */
  position: WatermarkPosition;
  /** Rotation angle (degrees) */
  rotation?: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Font size (for text) */
  fontSize?: PT;
  /** Font family (for text) */
  fontFamily?: string;
  /** Color (for text) */
  color?: HexColor;
  /** Blend mode */
  blendMode: "normal" | "multiply" | "screen" | "overlay";
  /** Pages to apply watermark */
  pages?: "all" | "odd" | "even" | number[];
  /** Z-index layer */
  layer: number;
}

/** Rendered watermark */
export interface RenderedWatermark {
  /** SVG element string */
  svg: string;
  /** CSS for positioning */
  css: string;
  /** Layer index */
  layer: number;
}

// =============================================================================
// CACHE INVALIDATION TYPES (Doc 1, Section 5)
// =============================================================================

/** Token category for cache invalidation */
export type TokenCategory = "color" | "spacing" | "typography" | "geometry";

/** Layout impact level */
export type LayoutImpact = "none" | "partial" | "full";

/** Cache invalidation result */
export interface CacheInvalidation {
  /** Whether cache should be cleared */
  shouldClear: boolean;
  /** Impact level */
  impact: LayoutImpact;
  /** Changed categories */
  changedCategories: TokenCategory[];
  /** Layout-impacting hash */
  layoutHash: string;
  /** Previous hash (if available) */
  previousHash?: string;
}

// =============================================================================
// VERIFICATION TYPES
// =============================================================================

/** Test assertion */
export interface Assertion {
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
}

/** Test result */
export interface TestResult {
  name: string;
  docReference: string;
  status: "passed" | "failed" | "warning";
  message: string;
  assertions: Assertion[];
  durationMs: number;
  visualData?: {
    svg?: string;
    elements?: any[];
  };
}

/** Verification report */
export interface VerificationReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  executionTimeMs: number;
}
