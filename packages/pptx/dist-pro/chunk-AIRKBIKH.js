import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  external_exports
} from "./chunk-3VBGXE67.js";
import {
  calculateRichTextMetrics
} from "./chunk-7BYJLCSM.js";
import {
  uax14Segment
} from "./chunk-DX2BYFTQ.js";
import {
  DEFAULT_SLIDE_HEIGHT_PX,
  DEFAULT_SLIDE_WIDTH_PX
} from "./chunk-XU7YQ73E.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";
import {
  PaperError
} from "./chunk-SFVKAOLH.js";

// src/interpreter/design-tokens.ts
var HexColorSchema = external_exports.string().regex(
  /^#[0-9A-Fa-f]{6}$/,
  "Must be a 6-digit hex color (e.g., '#2563EB')"
);
var PositiveNumberSchema = external_exports.number().positive();
var FontFamilySchema = external_exports.string().min(1).max(128);
var SAFE_FONT_FAMILY_SCHEMA = external_exports.enum([
  "portable",
  "system",
  "user-embedded",
  // Backward-compatible published names. They are normalized with a warning.
  "embedded",
  "system-safe",
  "named-with-fallback"
]);
var AGENT_SCALE_SCHEMA = external_exports.enum(["sm", "md", "lg", "xl"]);
var AGENT_DENSITY_SCHEMA = external_exports.enum(["compact", "balanced", "spacious"]);
var AGENT_SHAPE_SCHEMA = external_exports.enum(["sharp", "soft", "round"]);
var AgentThemePresetSchema = external_exports.enum([
  "default-navy",
  "editorial-serif",
  "monochrome",
  "dark-punch",
  "midnight",
  "terminal",
  "editorial-wide"
]);
var AgentColorTokensSchema = external_exports.object({
  accent: HexColorSchema.describe("Primary accent color for rules, dividers, and the first chart series."),
  themeDark1: HexColorSchema.describe("Theme dark slot 1 for the PPTX theme definition."),
  themeDark2: HexColorSchema.describe("Theme dark slot 2 for the PPTX theme definition."),
  themeLight1: HexColorSchema.describe("Theme light slot 1 for the PPTX theme definition."),
  themeLight2: HexColorSchema.describe("Theme light slot 2 for the PPTX theme definition."),
  slideBackground: HexColorSchema.describe("Default background color for non-title slides."),
  titleBackgroundStart: HexColorSchema.describe("Start color for the title-slide background gradient."),
  titleBackgroundEnd: HexColorSchema.describe("End color for the title-slide background gradient."),
  titleText: HexColorSchema.describe("Primary text color on title slides."),
  titleSubtitleText: HexColorSchema.describe("Secondary text color on title slides."),
  headingText: HexColorSchema.describe("Primary heading color for non-title slides."),
  bodyText: HexColorSchema.describe("Primary body copy color for non-title slides."),
  mutedText: HexColorSchema.describe("Muted supporting text color for subheaders, labels, and footers."),
  cardBackground: HexColorSchema.describe("Background color for light KPI cards and chart plot areas."),
  darkCardBackground: HexColorSchema.describe("Background color for dark KPI cards."),
  darkCardText: HexColorSchema.describe("Primary text color inside dark KPI cards."),
  darkCardMutedText: HexColorSchema.describe("Muted text color inside dark KPI cards."),
  cardBorder: HexColorSchema.describe("Border color for outline KPI cards."),
  chartPalette: external_exports.array(HexColorSchema).min(1).max(6).describe("Chart series palette in priority order.")
}).strict().partial();
var AgentTypographyTokensSchema = external_exports.object({
  fontStrategy: SAFE_FONT_FAMILY_SCHEMA.describe(
    "Font handling mode: portable open assets, explicit nonportable system fonts, or caller-supplied embedded fonts."
  ),
  titleFontFamily: FontFamilySchema.describe("Font family for slide titles and major headings."),
  bodyFontFamily: FontFamilySchema.describe("Font family for subtitles, body copy, labels, and chart text."),
  heroTitleSize: PositiveNumberSchema.describe("Title-slide headline font size."),
  heroSubtitleSize: PositiveNumberSchema.describe("Title-slide subtitle font size."),
  headerSize: PositiveNumberSchema.describe("Section header font size."),
  subheaderSize: PositiveNumberSchema.describe("Section subheader font size."),
  footerSize: PositiveNumberSchema.describe("Footer font size."),
  sectionTitleSize: PositiveNumberSchema.describe("Statement-slide title size."),
  sectionSubtitleSize: PositiveNumberSchema.describe("Statement-slide subtitle size."),
  statementBodySize: PositiveNumberSchema.describe("Statement-slide prose size."),
  bulletListSize: PositiveNumberSchema.describe("Bullets-slide bullet font size."),
  bulletsProseSize: PositiveNumberSchema.describe("Bullets-slide prose font size."),
  comparisonBodySize: PositiveNumberSchema.describe("Comparison-slide bullet font size."),
  kpiGradientLabelSize: PositiveNumberSchema.describe("Label size for gradient KPI cards."),
  kpiLabelSize: PositiveNumberSchema.describe("Label size for dark and outline KPI cards."),
  kpiValueSize: PositiveNumberSchema.describe("Value size for KPI cards."),
  kpiSublabelSize: PositiveNumberSchema.describe("Sublabel size for KPI cards."),
  chartTitleSize: PositiveNumberSchema.describe("Chart title size."),
  chartLegendSize: PositiveNumberSchema.describe("Chart legend and axis label size."),
  chartDataLabelSize: PositiveNumberSchema.describe("Default chart data-label size."),
  chartPieDataLabelSize: PositiveNumberSchema.describe("Pie/doughnut data-label size.")
}).strict().partial();
var AgentLayoutTokensSchema = external_exports.object({
  accentBarHeight: PositiveNumberSchema.describe("Accent bar height across the top of a slide."),
  paddingX: PositiveNumberSchema.describe("Global horizontal padding fallback for slide content regions."),
  paddingTop: PositiveNumberSchema.describe("Global top padding fallback for slide content regions."),
  paddingBottom: PositiveNumberSchema.describe("Global bottom padding fallback for slide content regions."),
  headerTop: PositiveNumberSchema.describe("Top offset for section headers."),
  subheaderTop: PositiveNumberSchema.describe("Top offset for section subheaders."),
  footerBottom: PositiveNumberSchema.describe("Bottom offset for footer text."),
  headerLeft: PositiveNumberSchema.describe("Left inset for header/footer anchored content."),
  contentWidth: PositiveNumberSchema.describe("Maximum width for header/footer anchored content."),
  titlePaddingX: PositiveNumberSchema.describe("Horizontal padding on title slides."),
  titlePaddingTop: PositiveNumberSchema.describe("Top padding on title slides."),
  titlePaddingBottom: PositiveNumberSchema.describe("Bottom padding on title slides."),
  contentPaddingX: PositiveNumberSchema.describe("Horizontal padding on content-heavy slides."),
  contentPaddingTop: PositiveNumberSchema.describe("Top padding on content-heavy slides."),
  contentPaddingBottom: PositiveNumberSchema.describe("Bottom padding on content-heavy slides."),
  titleDividerWidth: PositiveNumberSchema.describe("Accent divider width on title slides."),
  titleDividerHeight: PositiveNumberSchema.describe("Accent divider height on title slides."),
  titleDividerMarginTop: PositiveNumberSchema.describe("Top spacing before the title-slide divider."),
  titleDividerMarginBottom: PositiveNumberSchema.describe("Bottom spacing after the title-slide divider."),
  sectionDividerWidth: PositiveNumberSchema.describe("Accent divider width on statement slides."),
  sectionDividerHeight: PositiveNumberSchema.describe("Accent divider height on statement slides."),
  sectionDividerMarginTop: PositiveNumberSchema.describe("Top spacing before the statement divider."),
  sectionDividerMarginBottom: PositiveNumberSchema.describe("Bottom spacing after the statement divider."),
  statementParagraphGap: PositiveNumberSchema.describe("Top spacing between statement-slide paragraphs."),
  bodyTopWithSubtitle: PositiveNumberSchema.describe("Top offset for main content areas when a subheader is present."),
  bodyTopWithoutSubtitle: PositiveNumberSchema.describe("Top offset for main content areas without a subheader."),
  bodyHeight: PositiveNumberSchema.describe("Default content area height for dashboard/comparison layouts."),
  chartHeight: PositiveNumberSchema.describe("Chart area height."),
  dashboardGap: PositiveNumberSchema.describe("Gap between KPI cards in dashboard layouts."),
  comparisonGap: PositiveNumberSchema.describe("Gap between left and right comparison columns."),
  comparisonColumnWidth: PositiveNumberSchema.describe("Width of each comparison column."),
  comparisonColumnGap: PositiveNumberSchema.describe("Gap between stacked items inside comparison columns."),
  kpiCardHeight: PositiveNumberSchema.describe("Height of KPI cards."),
  kpiCardPadding: PositiveNumberSchema.describe("Internal padding of KPI cards."),
  dashboardKpiPanelWidthWithChart: PositiveNumberSchema.describe("Dashboard KPI panel width when a chart is present."),
  dashboardPanelWidthFull: PositiveNumberSchema.describe("Dashboard KPI panel width when no chart is present."),
  dashboardChartWidthWithKpis: PositiveNumberSchema.describe("Dashboard chart width when KPI cards are present."),
  chartFocusSidebarWidth: PositiveNumberSchema.describe("Width of the KPI sidebar on chart-focus slides."),
  chartFocusSidebarLeft: PositiveNumberSchema.describe("Legacy left offset of the KPI sidebar on chart-focus slides."),
  chartFocusChartWidthWithSidebar: PositiveNumberSchema.describe("Chart width on chart-focus slides with a KPI sidebar."),
  chartFocusChartWidthFull: PositiveNumberSchema.describe("Chart width on chart-focus slides without a KPI sidebar."),
  bulletsBottomMargin: PositiveNumberSchema.describe("Bottom margin on bullets slides."),
  bulletsHeightWithProse: PositiveNumberSchema.describe("Bullet block height when prose follows on a bullets slide."),
  proseOffsetAfterBullets: PositiveNumberSchema.describe("Vertical offset applied before prose after a bullet block.")
}).strict().partial();
var AgentEffectTokensSchema = external_exports.object({
  titleGradientAngle: PositiveNumberSchema.max(360).describe("Angle for the title-slide background gradient."),
  kpiGradientAngle: PositiveNumberSchema.max(360).describe("Angle for gradient KPI cards."),
  kpiGradientDarkenPercent: PositiveNumberSchema.max(100).describe("Darkening strength for gradient KPI cards."),
  kpiGradientLabelLightenPercent: PositiveNumberSchema.max(100).describe("Lightening strength for the gradient KPI label color."),
  kpiGradientSublabelLightenPercent: PositiveNumberSchema.max(100).describe("Lightening strength for the gradient KPI sublabel color."),
  kpiShapeAdjustment: PositiveNumberSchema.describe("Round-rectangle adjustment for KPI cards."),
  outlineBorderWidth: PositiveNumberSchema.describe("Border width for outline KPI cards."),
  chartBarGapWidth: PositiveNumberSchema.describe("Gap width used for bar charts."),
  chartDoughnutHoleSize: PositiveNumberSchema.max(90).describe("Hole size for doughnut charts.")
}).strict().partial();
var DesignTokensSchema = external_exports.object({
  scale: AGENT_SCALE_SCHEMA.optional(),
  density: AGENT_DENSITY_SCHEMA.optional(),
  shape: AGENT_SHAPE_SCHEMA.optional(),
  colors: AgentColorTokensSchema.optional(),
  typography: AgentTypographyTokensSchema.optional(),
  layout: AgentLayoutTokensSchema.optional(),
  effects: AgentEffectTokensSchema.optional()
}).strict().partial();
var DEFAULT_FONT_STRATEGY = "portable";
var DEFAULT_SCALE = "lg";
var DEFAULT_DENSITY = "balanced";
var DEFAULT_SHAPE = "soft";
var SYSTEM_SAFE_FONT_FAMILY = "Liberation Sans";
var SAFE_FONT_CASCADE = [
  SYSTEM_SAFE_FONT_FAMILY,
  "Carlito",
  "Source Sans 3"
];
var SCALE_MULTIPLIERS = {
  sm: 0.88,
  md: 0.94,
  lg: 1,
  xl: 1.08
};
var DENSITY_MULTIPLIERS = {
  compact: 0.9,
  balanced: 1,
  spacious: 1.12
};
var SCALE_TYPOGRAPHY_KEYS = [
  "heroTitleSize",
  "heroSubtitleSize",
  "headerSize",
  "subheaderSize",
  "footerSize",
  "sectionTitleSize",
  "sectionSubtitleSize",
  "statementBodySize",
  "bulletListSize",
  "bulletsProseSize",
  "comparisonBodySize",
  "kpiGradientLabelSize",
  "kpiLabelSize",
  "kpiValueSize",
  "kpiSublabelSize",
  "chartTitleSize",
  "chartLegendSize",
  "chartDataLabelSize",
  "chartPieDataLabelSize"
];
var SCALE_LAYOUT_KEYS = [
  "titlePaddingTop",
  "titlePaddingBottom",
  "contentPaddingTop",
  "contentPaddingBottom",
  "titleDividerMarginTop",
  "titleDividerMarginBottom",
  "sectionDividerMarginTop",
  "sectionDividerMarginBottom",
  "statementParagraphGap",
  "bodyTopWithSubtitle",
  "bodyTopWithoutSubtitle",
  "bodyHeight",
  "chartHeight",
  "dashboardGap",
  "comparisonGap",
  "comparisonColumnGap",
  "kpiCardHeight",
  "kpiCardPadding",
  "bulletsBottomMargin",
  "bulletsHeightWithProse",
  "proseOffsetAfterBullets",
  "headerTop",
  "subheaderTop",
  "footerBottom",
  // WS-3: visual ornaments that scale with title typography — users
  // pushing scale=lg expect the accent bar and dividers to grow with
  // the headline, not stay fixed at their default sizes.
  "accentBarHeight",
  "titleDividerWidth",
  "titleDividerHeight",
  "sectionDividerWidth",
  "sectionDividerHeight"
];
var DENSITY_LAYOUT_KEYS = [
  "paddingX",
  "paddingTop",
  "paddingBottom",
  "titlePaddingX",
  "titlePaddingTop",
  "titlePaddingBottom",
  "contentPaddingX",
  "contentPaddingTop",
  "contentPaddingBottom",
  "statementParagraphGap",
  "bodyTopWithSubtitle",
  "bodyTopWithoutSubtitle",
  "dashboardGap",
  "comparisonGap",
  "comparisonColumnGap",
  "kpiCardHeight",
  "kpiCardPadding",
  "bulletsBottomMargin",
  "bulletsHeightWithProse",
  "proseOffsetAfterBullets",
  "headerLeft",
  "contentWidth",
  "dashboardKpiPanelWidthWithChart",
  "dashboardPanelWidthFull",
  "dashboardChartWidthWithKpis",
  "chartFocusSidebarWidth",
  "chartFocusChartWidthWithSidebar",
  "chartFocusChartWidthFull",
  "comparisonColumnWidth"
];
var COUPLED_ROUND_RECT_ADJUSTMENT = {
  sharp: 0,
  soft: 3e3,
  round: 7e3
};
var BASE_AGENT_DESIGN_TOKENS = {
  controls: {
    scale: DEFAULT_SCALE,
    density: DEFAULT_DENSITY,
    shape: DEFAULT_SHAPE
  },
  colors: {
    accent: "#2563EB",
    themeDark1: "#0F2540",
    themeDark2: "#1B3A5C",
    themeLight1: "#FFFFFF",
    themeLight2: "#F8FAFC",
    slideBackground: "#F8FAFC",
    titleBackgroundStart: "#0A1929",
    titleBackgroundEnd: "#1B3A5C",
    titleText: "#FFFFFF",
    titleSubtitleText: "#E2E8F0",
    headingText: "#0F2540",
    bodyText: "#475569",
    mutedText: "#94A3B8",
    cardBackground: "#FFFFFF",
    darkCardBackground: "#0F2540",
    darkCardText: "#FFFFFF",
    darkCardMutedText: "#94A3B8",
    cardBorder: "#E2E8F0",
    chartPalette: ["#2563EB", "#059669", "#7C3AED", "#EA580C", "#DC2626", "#0891B2"]
  },
  typography: {
    fontStrategy: DEFAULT_FONT_STRATEGY,
    titleFontFamily: "Liberation Sans",
    titleFontFallback: ["Carlito", "Source Sans 3"],
    bodyFontFamily: "Liberation Sans",
    bodyFontFallback: ["Carlito", "Source Sans 3"],
    heroTitleSize: 38,
    heroSubtitleSize: 18,
    headerSize: 22,
    subheaderSize: 12,
    footerSize: 9,
    sectionTitleSize: 28,
    sectionSubtitleSize: 14,
    statementBodySize: 13,
    bulletListSize: 13,
    bulletsProseSize: 12,
    comparisonBodySize: 12,
    kpiGradientLabelSize: 12,
    kpiLabelSize: 10,
    kpiValueSize: 24,
    kpiSublabelSize: 11,
    chartTitleSize: 12,
    chartLegendSize: 9,
    chartDataLabelSize: 8,
    chartPieDataLabelSize: 9
  },
  layout: {
    accentBarHeight: 4,
    paddingX: 60,
    paddingTop: 80,
    paddingBottom: 80,
    headerTop: 20,
    subheaderTop: 48,
    footerBottom: 12,
    headerLeft: 60,
    contentWidth: 840,
    titlePaddingX: 80,
    titlePaddingTop: 120,
    titlePaddingBottom: 80,
    contentPaddingX: 80,
    contentPaddingTop: 80,
    contentPaddingBottom: 80,
    titleDividerWidth: 60,
    titleDividerHeight: 3,
    titleDividerMarginTop: 32,
    titleDividerMarginBottom: 32,
    sectionDividerWidth: 60,
    sectionDividerHeight: 3,
    sectionDividerMarginTop: 24,
    sectionDividerMarginBottom: 24,
    statementParagraphGap: 8,
    bodyTopWithSubtitle: 75,
    bodyTopWithoutSubtitle: 65,
    bodyHeight: 455,
    chartHeight: 445,
    dashboardGap: 16,
    comparisonGap: 30,
    comparisonColumnWidth: 405,
    comparisonColumnGap: 12,
    kpiCardHeight: 110,
    kpiCardPadding: 16,
    dashboardKpiPanelWidthWithChart: 360,
    dashboardPanelWidthFull: 840,
    dashboardChartWidthWithKpis: 460,
    chartFocusSidebarWidth: 280,
    chartFocusSidebarLeft: 620,
    chartFocusChartWidthWithSidebar: 540,
    chartFocusChartWidthFull: 840,
    bulletsBottomMargin: 20,
    bulletsHeightWithProse: 225,
    proseOffsetAfterBullets: 235
  },
  effects: {
    titleGradientAngle: 135,
    kpiGradientAngle: 135,
    kpiGradientDarkenPercent: 25,
    kpiGradientLabelLightenPercent: 60,
    kpiGradientSublabelLightenPercent: 40,
    kpiShapeAdjustment: COUPLED_ROUND_RECT_ADJUSTMENT[DEFAULT_SHAPE],
    outlineBorderWidth: 1,
    chartBarGapWidth: 80,
    chartDoughnutHoleSize: 55
  }
};
var AGENT_THEME_PRESET_OVERRIDES = {
  "default-navy": {},
  "editorial-serif": {
    colors: {
      accent: "#C4493A",
      themeDark1: "#43261B",
      themeDark2: "#8A4B3B",
      themeLight1: "#FFF8F1",
      themeLight2: "#F4EBDD",
      slideBackground: "#FAF2E8",
      titleBackgroundStart: "#FFF8F1",
      titleBackgroundEnd: "#EEDFD0",
      titleText: "#43261B",
      titleSubtitleText: "#6C4B3F",
      headingText: "#43261B",
      bodyText: "#5B463D",
      mutedText: "#8B6F63",
      cardBackground: "#FFF8F1",
      darkCardBackground: "#43261B",
      darkCardText: "#FFF8F1",
      darkCardMutedText: "#D8BFAF",
      cardBorder: "#D8C5B3",
      chartPalette: ["#C4493A", "#3E6B6A", "#8C5E3C", "#A2742F", "#6E4B7D", "#2F4858"]
    },
    typography: {
      titleFontFamily: "Gelasio",
      bodyFontFamily: "Gelasio",
      heroTitleSize: 42,
      heroSubtitleSize: 20,
      headerSize: 24,
      sectionTitleSize: 30,
      chartTitleSize: 14
    },
    layout: {
      accentBarHeight: 6,
      titlePaddingX: 92,
      titlePaddingTop: 112,
      contentPaddingX: 72,
      contentPaddingTop: 72,
      titleDividerWidth: 88,
      sectionDividerWidth: 72
    }
  },
  monochrome: {
    colors: {
      accent: "#4B5563",
      themeDark1: "#111827",
      themeDark2: "#374151",
      themeLight1: "#FFFFFF",
      themeLight2: "#F3F4F6",
      slideBackground: "#F5F5F5",
      titleBackgroundStart: "#2B2B2B",
      titleBackgroundEnd: "#111111",
      titleText: "#FFFFFF",
      titleSubtitleText: "#D1D5DB",
      headingText: "#111827",
      bodyText: "#1F2937",
      mutedText: "#6B7280",
      cardBackground: "#FFFFFF",
      darkCardBackground: "#1F2937",
      darkCardText: "#FFFFFF",
      darkCardMutedText: "#D1D5DB",
      cardBorder: "#D1D5DB",
      chartPalette: ["#111827", "#9CA3AF", "#4B5563", "#D1D5DB", "#6B7280", "#374151"]
    },
    typography: {
      titleFontFamily: "Carlito",
      bodyFontFamily: "Carlito",
      heroTitleSize: 36,
      sectionTitleSize: 26
    },
    layout: {
      accentBarHeight: 3,
      titleDividerWidth: 48,
      sectionDividerWidth: 48
    }
  },
  "dark-punch": {
    shape: "round",
    colors: {
      accent: "#FF6B35",
      themeDark1: "#000000",
      themeDark2: "#18181B",
      themeLight1: "#FFFFFF",
      themeLight2: "#111111",
      slideBackground: "#050505",
      titleBackgroundStart: "#000000",
      titleBackgroundEnd: "#18181B",
      titleText: "#FFFFFF",
      titleSubtitleText: "#FDBA74",
      headingText: "#FFFFFF",
      bodyText: "#E5E7EB",
      mutedText: "#9CA3AF",
      cardBackground: "#111111",
      darkCardBackground: "#000000",
      darkCardText: "#FFFFFF",
      darkCardMutedText: "#FDBA74",
      cardBorder: "#2A2A2A",
      chartPalette: ["#FF6B35", "#06B6D4", "#F59E0B", "#E11D48", "#8B5CF6", "#22C55E"]
    },
    typography: {
      titleFontFamily: "Source Sans 3",
      bodyFontFamily: "Source Sans 3",
      heroTitleSize: 40,
      sectionTitleSize: 30,
      kpiValueSize: 26,
      chartTitleSize: 14
    },
    layout: {
      accentBarHeight: 8,
      titlePaddingX: 72,
      titlePaddingTop: 108,
      titleDividerWidth: 96,
      sectionDividerWidth: 84
    }
  },
  midnight: {
    shape: "round",
    density: "spacious",
    colors: {
      accent: "#5EEAD4",
      themeDark1: "#020617",
      themeDark2: "#0F172A",
      themeLight1: "#F8FAFC",
      themeLight2: "#CBD5E1",
      slideBackground: "#050B16",
      titleBackgroundStart: "#020617",
      titleBackgroundEnd: "#0B1B35",
      titleText: "#F8FAFC",
      titleSubtitleText: "#94A3B8",
      headingText: "#F8FAFC",
      bodyText: "#D5E2F2",
      mutedText: "#7C8CA5",
      cardBackground: "#0F1B30",
      darkCardBackground: "#081120",
      darkCardText: "#F8FAFC",
      darkCardMutedText: "#A5F3FC",
      cardBorder: "#1E3352",
      chartPalette: ["#5EEAD4", "#0EA5E9", "#22D3EE", "#38BDF8", "#7DD3FC", "#A5F3FC"]
    },
    typography: {
      titleFontFamily: "Carlito",
      bodyFontFamily: "Carlito",
      heroTitleSize: 42,
      heroSubtitleSize: 19,
      headerSize: 24,
      subheaderSize: 13,
      sectionTitleSize: 31,
      sectionSubtitleSize: 15,
      statementBodySize: 14,
      bulletListSize: 14,
      bulletsProseSize: 13,
      comparisonBodySize: 13,
      kpiGradientLabelSize: 11,
      kpiLabelSize: 11,
      kpiValueSize: 28,
      kpiSublabelSize: 12,
      chartTitleSize: 14,
      chartLegendSize: 10,
      chartDataLabelSize: 9,
      chartPieDataLabelSize: 10
    },
    layout: {
      accentBarHeight: 6,
      paddingX: 72,
      paddingTop: 88,
      paddingBottom: 88,
      headerTop: 24,
      subheaderTop: 54,
      footerBottom: 16,
      headerLeft: 72,
      contentWidth: 816,
      titlePaddingX: 96,
      titlePaddingTop: 132,
      titlePaddingBottom: 92,
      contentPaddingX: 88,
      contentPaddingTop: 94,
      contentPaddingBottom: 84,
      titleDividerWidth: 112,
      titleDividerHeight: 4,
      titleDividerMarginTop: 36,
      titleDividerMarginBottom: 34,
      sectionDividerWidth: 92,
      sectionDividerHeight: 4,
      sectionDividerMarginTop: 28,
      sectionDividerMarginBottom: 24,
      statementParagraphGap: 12,
      bodyTopWithSubtitle: 92,
      bodyTopWithoutSubtitle: 82,
      bodyHeight: 448,
      chartHeight: 430,
      dashboardGap: 20,
      comparisonGap: 28,
      comparisonColumnWidth: 386,
      comparisonColumnGap: 16,
      kpiCardHeight: 126,
      kpiCardPadding: 20,
      dashboardKpiPanelWidthWithChart: 324,
      dashboardPanelWidthFull: 800,
      dashboardChartWidthWithKpis: 448,
      chartFocusSidebarWidth: 248,
      chartFocusSidebarLeft: 620,
      chartFocusChartWidthWithSidebar: 540,
      chartFocusChartWidthFull: 800,
      bulletsBottomMargin: 26,
      bulletsHeightWithProse: 238,
      proseOffsetAfterBullets: 248
    },
    effects: {
      titleGradientAngle: 148,
      kpiGradientAngle: 135,
      kpiGradientDarkenPercent: 36,
      kpiGradientLabelLightenPercent: 48,
      kpiGradientSublabelLightenPercent: 34,
      outlineBorderWidth: 1,
      chartBarGapWidth: 56,
      chartDoughnutHoleSize: 58
    }
  },
  terminal: {
    shape: "sharp",
    colors: {
      accent: "#5EEAD4",
      themeDark1: "#02030A",
      themeDark2: "#111827",
      themeLight1: "#ECFEFF",
      themeLight2: "#A7F3D0",
      slideBackground: "#04070D",
      titleBackgroundStart: "#02030A",
      titleBackgroundEnd: "#07111D",
      titleText: "#ECFEFF",
      titleSubtitleText: "#67E8F9",
      headingText: "#ECFEFF",
      bodyText: "#C7D2E0",
      mutedText: "#7DD3FC",
      cardBackground: "#07111D",
      darkCardBackground: "#030712",
      darkCardText: "#ECFEFF",
      darkCardMutedText: "#99F6E4",
      cardBorder: "#16324A",
      chartPalette: ["#5EEAD4", "#67E8F9", "#A3E635", "#FDE047", "#F59E0B", "#38BDF8"]
    },
    typography: {
      titleFontFamily: "Liberation Mono",
      bodyFontFamily: "Liberation Mono",
      heroTitleSize: 41,
      heroSubtitleSize: 18,
      headerSize: 22,
      subheaderSize: 12,
      sectionTitleSize: 30,
      sectionSubtitleSize: 14,
      statementBodySize: 13,
      bulletListSize: 13,
      bulletsProseSize: 12,
      comparisonBodySize: 12,
      kpiGradientLabelSize: 11,
      kpiLabelSize: 10,
      kpiValueSize: 28,
      kpiSublabelSize: 11,
      chartTitleSize: 13,
      chartLegendSize: 10,
      chartDataLabelSize: 9,
      chartPieDataLabelSize: 10
    },
    layout: {
      accentBarHeight: 2,
      paddingX: 68,
      paddingTop: 84,
      paddingBottom: 80,
      headerTop: 24,
      subheaderTop: 60,
      footerBottom: 14,
      headerLeft: 68,
      contentWidth: 804,
      titlePaddingX: 88,
      titlePaddingTop: 126,
      titlePaddingBottom: 84,
      contentPaddingX: 84,
      contentPaddingTop: 88,
      contentPaddingBottom: 76,
      titleDividerWidth: 88,
      titleDividerHeight: 2,
      titleDividerMarginTop: 28,
      titleDividerMarginBottom: 30,
      sectionDividerWidth: 72,
      sectionDividerHeight: 2,
      sectionDividerMarginTop: 24,
      sectionDividerMarginBottom: 22,
      statementParagraphGap: 10,
      bodyTopWithSubtitle: 98,
      bodyTopWithoutSubtitle: 82,
      bodyHeight: 440,
      chartHeight: 420,
      dashboardGap: 18,
      comparisonGap: 26,
      comparisonColumnWidth: 390,
      comparisonColumnGap: 14,
      kpiCardHeight: 118,
      kpiCardPadding: 18,
      dashboardKpiPanelWidthWithChart: 320,
      dashboardPanelWidthFull: 800,
      dashboardChartWidthWithKpis: 456,
      chartFocusSidebarWidth: 244,
      chartFocusSidebarLeft: 624,
      chartFocusChartWidthWithSidebar: 544,
      chartFocusChartWidthFull: 804,
      bulletsBottomMargin: 24,
      bulletsHeightWithProse: 232,
      proseOffsetAfterBullets: 240
    },
    effects: {
      titleGradientAngle: 180,
      kpiGradientAngle: 180,
      kpiGradientDarkenPercent: 18,
      kpiGradientLabelLightenPercent: 42,
      kpiGradientSublabelLightenPercent: 30,
      outlineBorderWidth: 1,
      chartBarGapWidth: 64,
      chartDoughnutHoleSize: 52
    }
  },
  "editorial-wide": {
    density: "spacious",
    colors: {
      accent: "#C86B36",
      themeDark1: "#3C281F",
      themeDark2: "#7A5D4F",
      themeLight1: "#FFF9F0",
      themeLight2: "#F2E7D6",
      slideBackground: "#FFF9F0",
      titleBackgroundStart: "#FFF9F0",
      titleBackgroundEnd: "#F2E7D6",
      titleText: "#3C281F",
      titleSubtitleText: "#8A6A5A",
      headingText: "#3C281F",
      bodyText: "#5A463B",
      mutedText: "#9B8574",
      cardBackground: "#FFFCF7",
      darkCardBackground: "#3C281F",
      darkCardText: "#FFF9F0",
      darkCardMutedText: "#EEDBC8",
      cardBorder: "#DFCBB8",
      chartPalette: ["#C86B36", "#58727B", "#A84A3E", "#BC9343", "#4A6A55", "#865D8F"]
    },
    typography: {
      titleFontFamily: "Gelasio",
      bodyFontFamily: "Carlito",
      heroTitleSize: 46,
      heroSubtitleSize: 20,
      headerSize: 25,
      subheaderSize: 13,
      sectionTitleSize: 32,
      sectionSubtitleSize: 15,
      statementBodySize: 14,
      bulletListSize: 14,
      bulletsProseSize: 13,
      comparisonBodySize: 13,
      kpiGradientLabelSize: 11,
      kpiLabelSize: 11,
      kpiValueSize: 29,
      kpiSublabelSize: 12,
      chartTitleSize: 14,
      chartLegendSize: 10,
      chartDataLabelSize: 9,
      chartPieDataLabelSize: 10
    },
    layout: {
      accentBarHeight: 4,
      paddingX: 78,
      paddingTop: 92,
      paddingBottom: 90,
      headerTop: 24,
      subheaderTop: 56,
      footerBottom: 18,
      headerLeft: 78,
      contentWidth: 780,
      titlePaddingX: 108,
      titlePaddingTop: 132,
      titlePaddingBottom: 98,
      contentPaddingX: 96,
      contentPaddingTop: 92,
      contentPaddingBottom: 88,
      titleDividerWidth: 124,
      titleDividerHeight: 3,
      titleDividerMarginTop: 34,
      titleDividerMarginBottom: 38,
      sectionDividerWidth: 96,
      sectionDividerHeight: 3,
      sectionDividerMarginTop: 26,
      sectionDividerMarginBottom: 26,
      statementParagraphGap: 12,
      bodyTopWithSubtitle: 96,
      bodyTopWithoutSubtitle: 86,
      bodyHeight: 450,
      chartHeight: 432,
      dashboardGap: 22,
      comparisonGap: 34,
      comparisonColumnWidth: 372,
      comparisonColumnGap: 18,
      kpiCardHeight: 128,
      kpiCardPadding: 22,
      dashboardKpiPanelWidthWithChart: 316,
      dashboardPanelWidthFull: 792,
      dashboardChartWidthWithKpis: 444,
      chartFocusSidebarWidth: 248,
      chartFocusSidebarLeft: 622,
      chartFocusChartWidthWithSidebar: 536,
      chartFocusChartWidthFull: 792,
      bulletsBottomMargin: 28,
      bulletsHeightWithProse: 240,
      proseOffsetAfterBullets: 250
    },
    effects: {
      titleGradientAngle: 164,
      kpiGradientAngle: 145,
      kpiGradientDarkenPercent: 22,
      kpiGradientLabelLightenPercent: 44,
      kpiGradientSublabelLightenPercent: 34,
      outlineBorderWidth: 1,
      chartBarGapWidth: 60,
      chartDoughnutHoleSize: 56
    }
  }
};
function applyPresetRuntimeEffects(preset, tokens) {
  if (preset !== "midnight") {
    return tokens;
  }
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.effects.cardDropShadow = {
    color: "#020617",
    offsetX: 0,
    offsetY: 14,
    blurRadius: 28,
    opacity: 0.28
  };
  return next;
}
function scaleNumber(value, factor, minimum = 1) {
  return Math.max(minimum, Math.round(value * factor));
}
function cloneRawResolvedAgentDesignTokens(tokens) {
  return {
    controls: { ...tokens.controls },
    colors: {
      ...tokens.colors,
      chartPalette: [...tokens.colors.chartPalette]
    },
    typography: {
      ...tokens.typography,
      titleFontFallback: [...tokens.typography.titleFontFallback],
      bodyFontFallback: [...tokens.typography.bodyFontFallback]
    },
    layout: { ...tokens.layout },
    effects: {
      ...tokens.effects,
      ...tokens.effects.cardDropShadow ? { cardDropShadow: { ...tokens.effects.cardDropShadow } } : {}
    }
  };
}
function cloneResolvedAgentDesignTokens(tokens) {
  return {
    controls: { ...tokens.controls },
    colors: {
      ...tokens.colors,
      chartPalette: [...tokens.colors.chartPalette]
    },
    typography: {
      ...tokens.typography,
      titleFontFallback: [...tokens.typography.titleFontFallback],
      bodyFontFallback: [...tokens.typography.bodyFontFallback]
    },
    layout: { ...tokens.layout },
    effects: {
      ...tokens.effects,
      ...tokens.effects.cardDropShadow ? { cardDropShadow: { ...tokens.effects.cardDropShadow } } : {}
    },
    semantic: { ...tokens.semantic }
  };
}
function mergeRawResolvedAgentDesignTokens(base, override) {
  if (!override) {
    return cloneRawResolvedAgentDesignTokens(base);
  }
  return {
    controls: {
      scale: override.scale ?? base.controls.scale,
      density: override.density ?? base.controls.density,
      shape: override.shape ?? base.controls.shape
    },
    colors: {
      ...base.colors,
      ...override.colors ?? {},
      ...override.colors?.chartPalette ? { chartPalette: [...override.colors.chartPalette] } : {}
    },
    typography: {
      ...base.typography,
      ...override.typography ?? {}
    },
    layout: {
      ...base.layout,
      ...override.layout ?? {}
    },
    effects: {
      ...base.effects,
      ...override.effects ?? {}
    }
  };
}
function uniqueFontFallbacks(fontFamilies, primaryFamily) {
  return [...new Set(fontFamilies.filter((fontFamily) => fontFamily !== primaryFamily))];
}
function applyGlobalLayoutFallbacks(tokens, layoutOverride) {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  if (layoutOverride?.paddingX !== void 0) {
    if (layoutOverride.titlePaddingX === void 0) {
      next.layout.titlePaddingX = layoutOverride.paddingX;
    }
    if (layoutOverride.contentPaddingX === void 0) {
      next.layout.contentPaddingX = layoutOverride.paddingX;
    }
  }
  if (layoutOverride?.paddingTop !== void 0) {
    if (layoutOverride.titlePaddingTop === void 0) {
      next.layout.titlePaddingTop = layoutOverride.paddingTop;
    }
    if (layoutOverride.contentPaddingTop === void 0) {
      next.layout.contentPaddingTop = layoutOverride.paddingTop;
    }
  }
  if (layoutOverride?.paddingBottom !== void 0) {
    if (layoutOverride.titlePaddingBottom === void 0) {
      next.layout.titlePaddingBottom = layoutOverride.paddingBottom;
    }
    if (layoutOverride.contentPaddingBottom === void 0) {
      next.layout.contentPaddingBottom = layoutOverride.paddingBottom;
    }
  }
  return next;
}
function applyScale(tokens, scale) {
  if (scale === DEFAULT_SCALE) {
    return {
      ...cloneRawResolvedAgentDesignTokens(tokens),
      controls: { ...tokens.controls, scale }
    };
  }
  const factor = SCALE_MULTIPLIERS[scale];
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.controls.scale = scale;
  for (const key of SCALE_TYPOGRAPHY_KEYS) {
    next.typography[key] = scaleNumber(next.typography[key], factor);
  }
  for (const key of SCALE_LAYOUT_KEYS) {
    next.layout[key] = scaleNumber(next.layout[key], factor);
  }
  return next;
}
function applyDensity(tokens, density) {
  if (density === DEFAULT_DENSITY) {
    return {
      ...cloneRawResolvedAgentDesignTokens(tokens),
      controls: { ...tokens.controls, density }
    };
  }
  const factor = DENSITY_MULTIPLIERS[density];
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.controls.density = density;
  for (const key of DENSITY_LAYOUT_KEYS) {
    next.layout[key] = scaleNumber(next.layout[key], factor);
  }
  return next;
}
function applyShape(tokens, shape) {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.controls.shape = shape;
  next.effects.kpiShapeAdjustment = COUPLED_ROUND_RECT_ADJUSTMENT[shape];
  return next;
}
function applyCoupledControls(tokens) {
  let next = applyScale(tokens, tokens.controls.scale);
  next = applyDensity(next, next.controls.density);
  next = applyShape(next, next.controls.shape);
  return next;
}
function applyFontStrategy(tokens, {
  preserveBodyFamily = false,
  preserveTitleFamily = false,
  strategy = DEFAULT_FONT_STRATEGY
} = {}) {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  let normalizedStrategy = strategy;
  if (strategy === "named-with-fallback" || strategy === "system-safe") {
    normalizedStrategy = "portable";
    getLogger().warn(
      `[design-tokens] fontStrategy="${strategy}" is deprecated; using portable semantics (admitted open fonts plus embedding).`
    );
  } else if (strategy === "embedded") {
    normalizedStrategy = "user-embedded";
    getLogger().warn(
      '[design-tokens] fontStrategy="embedded" is deprecated; using user-embedded semantics. Supply matching PaperDocument.embeddedFonts.'
    );
  }
  const titleFontFamily = strategy === "system-safe" && !preserveTitleFamily ? SYSTEM_SAFE_FONT_FAMILY : next.typography.titleFontFamily;
  const bodyFontFamily = strategy === "system-safe" && !preserveBodyFamily ? SYSTEM_SAFE_FONT_FAMILY : next.typography.bodyFontFamily;
  const hasPortableFallbacks = normalizedStrategy === "portable";
  next.typography = {
    ...next.typography,
    fontStrategy: normalizedStrategy,
    titleFontFamily,
    titleFontFallback: hasPortableFallbacks ? uniqueFontFallbacks(SAFE_FONT_CASCADE, titleFontFamily) : [],
    bodyFontFamily,
    bodyFontFallback: hasPortableFallbacks ? uniqueFontFallbacks(SAFE_FONT_CASCADE, bodyFontFamily) : []
  };
  return next;
}
function withAccentColor(tokens, accentColor) {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.colors = {
    ...next.colors,
    accent: accentColor,
    chartPalette: [
      accentColor,
      ...next.colors.chartPalette.slice(1)
    ]
  };
  return next;
}
function withFontFamily(tokens, fontFamily) {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.typography = {
    ...next.typography,
    titleFontFamily: fontFamily,
    bodyFontFamily: fontFamily
  };
  return next;
}
function finalizeResolvedAgentDesignTokens(tokens) {
  const contentLeft = tokens.layout.contentPaddingX;
  const contentRight = DEFAULT_SLIDE_WIDTH_PX - tokens.layout.paddingX;
  const contentWidth = Math.max(0, contentRight - contentLeft);
  const bodyTopWithSubtitle = Math.max(tokens.layout.bodyTopWithSubtitle, tokens.layout.contentPaddingTop);
  const bodyTopWithoutSubtitle = Math.max(tokens.layout.bodyTopWithoutSubtitle, tokens.layout.contentPaddingTop);
  const cardShapeType = tokens.controls.shape === "sharp" ? "rect" : "roundRect";
  const cardShapeAdjustment = cardShapeType === "roundRect" ? tokens.effects.kpiShapeAdjustment : void 0;
  const dashboardChartLeftWithKpis = contentLeft + tokens.layout.dashboardKpiPanelWidthWithChart + tokens.layout.dashboardGap;
  const computedChartFocusSidebarLeft = contentLeft + tokens.layout.chartFocusChartWidthWithSidebar + tokens.layout.comparisonColumnGap;
  return {
    controls: { ...tokens.controls },
    colors: {
      ...tokens.colors,
      chartPalette: [...tokens.colors.chartPalette]
    },
    typography: {
      ...tokens.typography,
      titleFontFallback: [...tokens.typography.titleFontFallback],
      bodyFontFallback: [...tokens.typography.bodyFontFallback]
    },
    layout: { ...tokens.layout },
    effects: { ...tokens.effects },
    semantic: {
      pagePaddingX: tokens.layout.paddingX,
      pagePaddingTop: tokens.layout.paddingTop,
      pagePaddingBottom: tokens.layout.paddingBottom,
      titlePaddingX: tokens.layout.titlePaddingX,
      titlePaddingTop: tokens.layout.titlePaddingTop,
      titlePaddingBottom: tokens.layout.titlePaddingBottom,
      contentLeft,
      contentWidth,
      contentRight,
      contentPaddingTop: tokens.layout.contentPaddingTop,
      contentPaddingBottom: tokens.layout.contentPaddingBottom,
      bodyTopWithSubtitle,
      bodyTopWithoutSubtitle,
      dashboardChartLeftWithKpis,
      chartFocusSidebarLeft: Math.max(tokens.layout.chartFocusSidebarLeft, computedChartFocusSidebarLeft),
      cardShapeType,
      ...cardShapeAdjustment !== void 0 ? { cardShapeAdjustment } : {}
    }
  };
}
function getThemePresetBaseTokens(preset = "default-navy") {
  return applyPresetRuntimeEffects(
    preset,
    mergeRawResolvedAgentDesignTokens(BASE_AGENT_DESIGN_TOKENS, AGENT_THEME_PRESET_OVERRIDES[preset])
  );
}
var DEFAULT_AGENT_DESIGN_TOKENS = finalizeResolvedAgentDesignTokens(
  applyFontStrategy(
    applyCoupledControls(getThemePresetBaseTokens("default-navy")),
    {
      strategy: DEFAULT_FONT_STRATEGY,
      preserveTitleFamily: true,
      preserveBodyFamily: true
    }
  )
);
function getAgentThemePresetTokens(preset = "default-navy") {
  return finalizeResolvedAgentDesignTokens(
    applyFontStrategy(
      applyCoupledControls(getThemePresetBaseTokens(preset)),
      {
        strategy: DEFAULT_FONT_STRATEGY,
        preserveTitleFamily: true,
        preserveBodyFamily: true
      }
    )
  );
}
function warnAtomicOverridesDefeatCoupling(designTokens) {
  if (!designTokens) return;
  const scaleIsExplicit = designTokens.scale !== void 0 && designTokens.scale !== DEFAULT_SCALE;
  const densityIsExplicit = designTokens.density !== void 0 && designTokens.density !== DEFAULT_DENSITY;
  const typography = designTokens.typography;
  const layout = designTokens.layout;
  if (scaleIsExplicit && typography) {
    const overriddenTypography = [];
    for (const key of SCALE_TYPOGRAPHY_KEYS) {
      if (typography[key] !== void 0) overriddenTypography.push(key);
    }
    if (overriddenTypography.length > 0) {
      getLogger().warn(
        `[design-tokens] scale="${designTokens.scale}" is set, but typography overrides defeat the multiplier on: ${overriddenTypography.join(", ")}. Either keep the override and drop scale, or remove the override to let scale proportion the token.`
      );
    }
  }
  if (scaleIsExplicit && layout) {
    const overridden = [];
    for (const key of SCALE_LAYOUT_KEYS) {
      if (layout[key] !== void 0) overridden.push(key);
    }
    if (overridden.length > 0) {
      getLogger().warn(
        `[design-tokens] scale="${designTokens.scale}" is set, but layout overrides defeat the multiplier on: ${overridden.join(", ")}. Either keep the override and drop scale, or remove the override to let scale proportion the token.`
      );
    }
  }
  if (densityIsExplicit && layout) {
    const overridden = [];
    for (const key of DENSITY_LAYOUT_KEYS) {
      if (layout[key] !== void 0) overridden.push(key);
    }
    if (overridden.length > 0) {
      getLogger().warn(
        `[design-tokens] density="${designTokens.density}" is set, but layout overrides defeat the multiplier on: ${overridden.join(", ")}. Either keep the override and drop density, or remove the override to let density proportion the token.`
      );
    }
  }
}
function resolveAgentDesignTokens(options = {}) {
  let resolved = getThemePresetBaseTokens(options.theme);
  resolved.controls = {
    scale: options.designTokens?.scale ?? resolved.controls.scale,
    density: options.designTokens?.density ?? resolved.controls.density,
    shape: options.designTokens?.shape ?? resolved.controls.shape
  };
  resolved = applyCoupledControls(resolved);
  warnAtomicOverridesDefeatCoupling(options.designTokens);
  if (options.accentColor) {
    resolved = withAccentColor(resolved, options.accentColor);
  }
  if (options.designTokens) {
    resolved = mergeRawResolvedAgentDesignTokens(resolved, {
      colors: options.designTokens.colors,
      typography: options.designTokens.typography,
      layout: options.designTokens.layout,
      effects: options.designTokens.effects
    });
    resolved = applyGlobalLayoutFallbacks(resolved, options.designTokens.layout);
    if (options.designTokens.colors?.accent && !options.designTokens.colors.chartPalette) {
      resolved = withAccentColor(resolved, options.designTokens.colors.accent);
    }
  }
  resolved = applyFontStrategy(resolved, {
    strategy: options.designTokens?.typography?.fontStrategy ?? resolved.typography.fontStrategy,
    preserveTitleFamily: Boolean(options.designTokens?.typography?.titleFontFamily),
    preserveBodyFamily: Boolean(options.designTokens?.typography?.bodyFontFamily)
  });
  if (options.fontFamily) {
    resolved = withFontFamily(resolved, options.fontFamily);
    resolved = applyFontStrategy(resolved, {
      strategy: resolved.typography.fontStrategy,
      preserveTitleFamily: true,
      preserveBodyFamily: true
    });
  }
  return finalizeResolvedAgentDesignTokens(resolved);
}
function cloneAgentDesignTokens(tokens) {
  return cloneResolvedAgentDesignTokens(tokens);
}

// src/interpreter/composition-semantics.ts
function isQualitativeKpiValue(value) {
  return !/\d/u.test(value);
}
var MONTH_PREFIX = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
var TIMELINE_PREFIX = new RegExp(
  `^((?:${MONTH_PREFIX}\\s+\\d{4}|\\d{1,2}\\s+${MONTH_PREFIX}(?:\\s+\\d{4})?|(?:Months?|Weeks?|Days?|Phases?|Stages?|Q[1-4])\\s+[A-Za-z0-9][A-Za-z0-9./\u2013\u2014-]*)(?:\\s*[\u2014\u2013:-]))(\\s*)([\\s\\S]+)$`,
  "iu"
);
function parseTimelineEntry(entry) {
  const match = TIMELINE_PREFIX.exec(entry);
  if (!match) return void 0;
  return {
    prefix: match[1],
    body: `${match[2]}${match[3]}`
  };
}
function isTimelineSequence(entries) {
  if (entries.length < 3) return false;
  const matches = entries.map((entry) => parseTimelineEntry(entry) !== void 0);
  const matched = matches.filter(Boolean).length;
  const lastMatched = matches.lastIndexOf(true);
  const unmatchedBeforeLastMilestone = matches.slice(0, lastMatched + 1).some((match) => !match);
  return !unmatchedBeforeLastMilestone && matched >= Math.max(3, Math.ceil(entries.length * 0.66));
}
function parseComparisonOwnership(subtitle) {
  if (!subtitle) return void 0;
  const rightMarker = /\bRight:/iu.exec(subtitle);
  if (!rightMarker || !/^\s*Left:/iu.test(subtitle)) return void 0;
  const left = subtitle.slice(0, rightMarker.index).trim();
  const right = subtitle.slice(rightMarker.index).trim();
  if (left.length === 0 || right.length === 0) return void 0;
  return { left, right };
}
function parseComparisonEntry(entry) {
  const versus = /\s+([—–-]\s+(?:versus|vs\.?))\s+/iu.exec(entry);
  if (versus) {
    const rightStart = versus.index + versus[0].length;
    return {
      left: entry.slice(0, versus.index),
      relation: versus[1],
      right: entry.slice(rightStart)
    };
  }
  const semicolon = entry.indexOf("; ");
  if (semicolon > 0 && semicolon < entry.length - 2) {
    return {
      left: entry.slice(0, semicolon),
      relation: ";",
      right: entry.slice(semicolon + 2)
    };
  }
  return void 0;
}
function splitAt(entry, index, delimiterLength) {
  return {
    anchor: entry.slice(0, index + delimiterLength),
    body: entry.slice(index + delimiterLength)
  };
}
function parseRegisterEntry(entry) {
  const colon = entry.indexOf(":");
  if (colon > 0 && colon <= 52) return splitAt(entry, colon, 1);
  const emDash = entry.search(/\s[—–]\s/u);
  if (emDash > 0 && emDash <= 84) {
    const parenthetical = entry.indexOf(" (");
    if (parenthetical > 0 && parenthetical < emDash && parenthetical <= 44) {
      return { anchor: entry.slice(0, parenthetical), body: entry.slice(parenthetical) };
    }
    return splitAt(entry, emDash, 3);
  }
  const leadingValue = /^(?:[$€£]\s*)?\d[\d,.]*(?:\.\d+)?(?:%|[KMBT]|\s+(?:FTEs?|days?|months?|years?))?/iu.exec(entry);
  if (leadingValue && leadingValue[0].length >= 2) {
    return {
      anchor: leadingValue[0],
      body: entry.slice(leadingValue[0].length)
    };
  }
  const clauseBreak = /;\s/u.exec(entry);
  if (clauseBreak && clauseBreak.index > 0 && clauseBreak.index <= 84) {
    return splitAt(entry, clauseBreak.index, 1);
  }
  return { body: entry };
}

// src/interpreter/templates.ts
var SLIDE_W = DEFAULT_SLIDE_WIDTH_PX;
var SLIDE_H = DEFAULT_SLIDE_HEIGHT_PX;
var NODE_CHART = "Chart";
var NODE_SLIDE = "Slide";
var NODE_TEXT = "Text";
var NODE_VIEW = "View";
var BACKGROUND_SOLID = "solid";
var FONT_WEIGHT_BOLD = "bold";
var FLEX_ALIGN_START = "flex-start";
var FLEX_DIRECTION_COLUMN = "column";
var POSITION_ABSOLUTE = "absolute";
var ZERO = 0;
var HERO_TITLE_MARGIN_TOP = 0;
var SUBTITLE_MARGIN_TOP = 12;
var HEADER_TEXT_HEIGHT = 38;
var SUBHEADER_TEXT_HEIGHT = 22;
var BODY_BOTTOM_MIN = 24;
var BODY_BOTTOM_MAX = 40;
var FIELD_GAP = 24;
var REGISTER_COLUMN_GAP = 28;
var REGISTER_INDEX_WIDTH = 58;
var REGISTER_RULE_BAND = 8;
var REGISTER_TEXT_PADDING_TOP = 6;
var REGISTER_TEXT_PADDING_BOTTOM = 8;
var REGISTER_TEXT_PADDING_RIGHT = 24;
var OWNED_FIELD_HEADER_HEIGHT = 54;
var TIMELINE_PREFIX_WIDTH = 188;
var TIMELINE_SPINE_LEFT = 22;
var PROSE_RAIL_GAP = 18;
var PROSE_RAIL_MIN_HEIGHT = 62;
var PROSE_RAIL_MAX_HEIGHT = 118;
var FOOTER_MIN_HEIGHT = 24;
var FOOTER_CONTENT_GAP = 12;
var HALF_DIVISOR = 2;
var Z_INDEX_ACCENT_BAR = 0;
var Z_INDEX_CONTENT = 10;
var Z_INDEX_HEADER = 30;
var Z_INDEX_SUBHEADER = 40;
var Z_INDEX_FOOTER = 50;
function getSlideDesignTokens(accentColor, fontFamily, designTokens) {
  if (designTokens && "semantic" in designTokens) {
    if (!fontFamily) {
      return cloneAgentDesignTokens(designTokens);
    }
    return resolveAgentDesignTokens({
      accentColor,
      fontFamily,
      designTokens: {
        scale: designTokens.controls.scale,
        density: designTokens.controls.density,
        shape: designTokens.controls.shape,
        colors: designTokens.colors,
        typography: {
          fontStrategy: designTokens.typography.fontStrategy,
          titleFontFamily: designTokens.typography.titleFontFamily,
          bodyFontFamily: designTokens.typography.bodyFontFamily,
          heroTitleSize: designTokens.typography.heroTitleSize,
          heroSubtitleSize: designTokens.typography.heroSubtitleSize,
          headerSize: designTokens.typography.headerSize,
          subheaderSize: designTokens.typography.subheaderSize,
          footerSize: designTokens.typography.footerSize,
          sectionTitleSize: designTokens.typography.sectionTitleSize,
          sectionSubtitleSize: designTokens.typography.sectionSubtitleSize,
          statementBodySize: designTokens.typography.statementBodySize,
          bulletListSize: designTokens.typography.bulletListSize,
          bulletsProseSize: designTokens.typography.bulletsProseSize,
          comparisonBodySize: designTokens.typography.comparisonBodySize,
          kpiGradientLabelSize: designTokens.typography.kpiGradientLabelSize,
          kpiLabelSize: designTokens.typography.kpiLabelSize,
          kpiValueSize: designTokens.typography.kpiValueSize,
          kpiSublabelSize: designTokens.typography.kpiSublabelSize,
          chartTitleSize: designTokens.typography.chartTitleSize,
          chartLegendSize: designTokens.typography.chartLegendSize,
          chartDataLabelSize: designTokens.typography.chartDataLabelSize,
          chartPieDataLabelSize: designTokens.typography.chartPieDataLabelSize
        },
        layout: designTokens.layout,
        effects: designTokens.effects
      }
    });
  }
  return resolveAgentDesignTokens({
    accentColor,
    fontFamily,
    designTokens
  });
}
function accentBar(tokens) {
  return {
    type: NODE_VIEW,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_ACCENT_BAR,
      top: ZERO,
      left: ZERO,
      width: SLIDE_W,
      height: tokens.layout.accentBarHeight,
      backgroundColor: tokens.colors.accent
    }
  };
}
function titleTextStyle(tokens, style = {}) {
  return {
    ...style,
    fontFamily: tokens.typography.titleFontFamily,
    fontFallback: [...tokens.typography.titleFontFallback]
  };
}
function bodyTextStyle(tokens, style = {}) {
  return {
    ...style,
    fontFamily: tokens.typography.bodyFontFamily,
    fontFallback: [...tokens.typography.bodyFontFallback]
  };
}
function headerText(text, tokens) {
  const width = Math.max(0, tokens.semantic.contentRight - tokens.layout.headerLeft);
  return {
    type: NODE_TEXT,
    autoFit: true,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_HEADER,
      top: tokens.layout.headerTop,
      left: tokens.layout.headerLeft,
      width,
      height: HEADER_TEXT_HEIGHT,
      color: tokens.colors.headingText,
      fontSize: Math.max(26, tokens.typography.headerSize),
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "left",
      textFit: { policy: "fitFontSize", minFontSize: 18, maxLines: 1 },
      verticalAlign: "middle",
      ...titleTextStyle(tokens)
    },
    content: text
  };
}
function subheaderText(text, tokens) {
  const width = Math.max(0, tokens.semantic.contentRight - tokens.layout.headerLeft);
  return {
    type: NODE_TEXT,
    autoFit: true,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_SUBHEADER,
      top: Math.max(tokens.layout.subheaderTop, tokens.layout.headerTop + HEADER_TEXT_HEIGHT + 2),
      left: tokens.layout.headerLeft,
      width,
      height: SUBHEADER_TEXT_HEIGHT,
      color: ensureTextContrast(tokens.colors.mutedText, tokens.colors.slideBackground, 5.5),
      fontSize: Math.max(13, tokens.typography.subheaderSize),
      textFit: { policy: "fitFontSize", minFontSize: 10, maxLines: 1 },
      verticalAlign: "middle",
      ...bodyTextStyle(tokens)
    },
    content: text
  };
}
function buildAgentPaginationFooter(label, slideNumber, totalSlides, tokens) {
  const height = Math.max(FOOTER_MIN_HEIGHT, tokens.typography.footerSize + 15);
  const top = SLIDE_H - tokens.layout.footerBottom - height;
  const pageText = `${String(slideNumber).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`;
  const pageWidth = 96;
  return {
    type: NODE_VIEW,
    altText: "Agent pagination footer",
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_FOOTER,
      left: tokens.semantic.contentLeft,
      top,
      width: tokens.semantic.contentWidth,
      height
    },
    children: [
      rule({ left: 0, top: 0, width: tokens.semantic.contentWidth, height: 1 }, tokens.colors.cardBorder),
      absoluteText(label, {
        left: 0,
        top: 7,
        width: tokens.semantic.contentWidth - pageWidth - 24,
        height: height - 7
      }, {
        color: ensureTextContrast(tokens.colors.mutedText, tokens.colors.slideBackground, 5.5),
        fontSize: Math.max(9, tokens.typography.footerSize),
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 7, maxLines: 1 },
        verticalAlign: "middle",
        ...bodyTextStyle(tokens)
      }, { autoFit: true }),
      absoluteText(pageText, {
        left: tokens.semantic.contentWidth - pageWidth,
        top: 7,
        width: pageWidth,
        height: height - 7
      }, {
        color: ensureTextContrast(tokens.colors.mutedText, tokens.colors.slideBackground, 5.5),
        fontSize: Math.max(9, tokens.typography.footerSize),
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "right",
        verticalAlign: "middle",
        ...bodyTextStyle(tokens)
      })
    ]
  };
}
function agentChartToChartData(chart, accentColor, designTokens, surroundingTitles = []) {
  const tokens = getSlideDesignTokens(accentColor, void 0, designTokens);
  const categories = chart.series.length > 0 ? chart.series[0].dataPoints.map((dp) => dp.category) : [];
  const defaultColors = tokens.colors.chartPalette;
  const series = chart.series.map((s, i) => ({
    name: s.name,
    values: s.dataPoints.map((dp) => dp.value),
    color: defaultColors[i % defaultColors.length]
  }));
  const chartType = chart.type;
  const chartMutedText = ensureTextContrast(tokens.colors.mutedText, tokens.colors.cardBackground, 5.5);
  const chartBodyText = ensureTextContrast(tokens.colors.bodyText, tokens.colors.cardBackground, 5.5);
  const chartData = {
    chartType,
    categories,
    series,
    legend: {
      position: "bottom",
      fontSize: Math.max(14, tokens.typography.chartLegendSize),
      fontFamily: tokens.typography.bodyFontFamily,
      fontColor: chartMutedText,
      fill: tokens.colors.cardBackground
    },
    dataLabels: {
      showVal: true,
      ...chartType === "area" ? { position: "bestFit" } : {},
      fontSize: Math.max(12, tokens.typography.chartDataLabelSize),
      fontColor: chartType === "area" ? ensureTextContrast(tokens.colors.themeLight1, tokens.colors.chartPalette[0] ?? tokens.colors.accent, 4.5) : chartBodyText,
      fontFamily: tokens.typography.bodyFontFamily
    }
  };
  if (chartType === "area" && chart.areaGrouping !== void 0) {
    chartData.areaGrouping = chart.areaGrouping;
  }
  if (chartType === "line") {
    chartData.marker = { symbol: "circle", size: 6 };
  }
  const isPie = chartType === "pie" || chartType === "doughnut";
  if (isPie) {
    chartData.dataLabels = {
      showPercent: true,
      fontSize: Math.max(13, tokens.typography.chartPieDataLabelSize),
      fontColor: chartBodyText,
      fontFamily: tokens.typography.bodyFontFamily
    };
    if (chartType === "doughnut") {
      chartData.holeSize = tokens.effects.chartDoughnutHoleSize;
    }
  } else {
    chartData.valueAxis = {
      numberFormat: "#,##0",
      fontSize: Math.max(14, tokens.typography.chartLegendSize),
      fontFamily: tokens.typography.bodyFontFamily,
      fontColor: chartMutedText,
      labelFont: {
        fontFamily: tokens.typography.bodyFontFamily,
        fontSize: Math.max(14, tokens.typography.chartLegendSize),
        fontColor: chartMutedText
      },
      gridlines: { major: true, color: mixHex(tokens.colors.cardBorder, tokens.colors.headingText, 0.18) }
    };
    chartData.categoryAxis = {
      fontSize: Math.max(14, tokens.typography.chartLegendSize),
      fontFamily: tokens.typography.bodyFontFamily,
      fontColor: chartMutedText,
      labelFont: {
        fontFamily: tokens.typography.bodyFontFamily,
        fontSize: Math.max(14, tokens.typography.chartLegendSize),
        fontColor: chartMutedText
      }
    };
    chartData.plotArea = { fill: tokens.colors.cardBackground };
    if (chartType === "bar") {
      chartData.gapWidth = tokens.effects.chartBarGapWidth;
    }
  }
  const chartTitle = chart.title;
  if (chartTitle && !surroundingTitles.some((title) => isChartTitleEcho(chartTitle, title))) {
    chartData.title = {
      text: chartTitle,
      fontFamily: tokens.typography.titleFontFamily,
      fontSize: Math.max(18, tokens.typography.chartTitleSize),
      fontColor: tokens.colors.headingText,
      bold: true
    };
  }
  return chartData;
}
function normalizeDisplayTitle(value) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/gu, " ").trim();
}
var CHART_TITLE_STOP_WORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "m",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "under",
  "versus",
  "vs",
  "with"
]);
function meaningfulTitleTokens(value) {
  return normalizeDisplayTitle(value).split(" ").filter((token) => token.length > 1).filter((token) => !CHART_TITLE_STOP_WORDS.has(token)).filter((token) => !/^fy\d{2,4}$/u.test(token)).filter((token) => !/^\d+(?:\.\d+)?$/u.test(token));
}
function titleFieldLabel(value) {
  const generic = /* @__PURE__ */ new Set(["budget", "highlights", "plan", "proposal", "review", "update"]);
  return meaningfulTitleTokens(value).filter((token) => !/^q[1-4]$/u.test(token)).find((token) => !generic.has(token))?.toLocaleUpperCase("en-US") ?? "OPENING";
}
function isChartTitleEcho(chartTitle, surroundingTitle) {
  if (!surroundingTitle) return false;
  const chart = normalizeDisplayTitle(chartTitle);
  const surrounding = normalizeDisplayTitle(surroundingTitle);
  if (chart.length === 0) return false;
  if (chart === surrounding) return true;
  const chartTokens = meaningfulTitleTokens(chart);
  if (chartTokens.length < 2) return false;
  const surroundingTokens = new Set(meaningfulTitleTokens(surrounding));
  const sharedTokens = chartTokens.filter((token) => surroundingTokens.has(token));
  return sharedTokens.length >= 2 && sharedTokens.length / chartTokens.length >= 0.5;
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function contentComposition(tokens, hasSubtitle, prose = []) {
  const top = hasSubtitle ? Math.max(
    tokens.semantic.bodyTopWithSubtitle,
    tokens.layout.subheaderTop + SUBHEADER_TEXT_HEIGHT + 22,
    tokens.layout.headerTop + HEADER_TEXT_HEIGHT + 24
  ) : tokens.semantic.bodyTopWithoutSubtitle;
  const bottomMargin = clamp(
    tokens.semantic.pagePaddingBottom * 0.45,
    BODY_BOTTOM_MIN,
    BODY_BOTTOM_MAX
  );
  const footerReserve = tokens.layout.footerBottom + FOOTER_MIN_HEIGHT + FOOTER_CONTENT_GAP;
  const availableBottom = SLIDE_H - Math.max(bottomMargin, footerReserve);
  if (prose.length === 0) {
    return {
      content: {
        height: Math.max(0, availableBottom - top),
        left: tokens.semantic.contentLeft,
        top,
        width: tokens.semantic.contentWidth
      }
    };
  }
  const proseCharacters = prose.reduce((total, paragraph) => total + paragraph.length, 0);
  const railHeight = clamp(
    PROSE_RAIL_MIN_HEIGHT + Math.ceil(proseCharacters / 180) * 18,
    PROSE_RAIL_MIN_HEIGHT,
    PROSE_RAIL_MAX_HEIGHT
  );
  const proseTop = availableBottom - railHeight;
  return {
    content: {
      height: Math.max(0, proseTop - PROSE_RAIL_GAP - top),
      left: tokens.semantic.contentLeft,
      top,
      width: tokens.semantic.contentWidth
    },
    proseRail: {
      height: railHeight,
      left: tokens.semantic.contentLeft,
      top: proseTop,
      width: tokens.semantic.contentWidth
    }
  };
}
function absoluteText(content, frame, style, options = {}) {
  return {
    type: NODE_TEXT,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_CONTENT,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      ...style
    },
    ...options.autoFit === void 0 ? {} : { autoFit: options.autoFit },
    content
  };
}
function rule(frame, color) {
  return {
    type: NODE_VIEW,
    decorative: true,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_CONTENT,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      backgroundColor: color
    }
  };
}
function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}
function mixHex(source, target, amount) {
  const channel = (offset) => Math.round(
    parseInt(source.slice(offset, offset + 2), 16) * (1 - amount) + parseInt(target.slice(offset, offset + 2), 16) * amount
  ).toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}
function ensureTextContrast(foreground, background, minimum) {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  const target = contrastRatio("#000000", background) >= contrastRatio("#FFFFFF", background) ? "#000000" : "#FFFFFF";
  for (let step = 1; step <= 12; step += 1) {
    const candidate = mixHex(foreground, target, step / 12);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target;
}
function contrastText(background, tokens) {
  return relativeLuminance(background) > 0.48 ? tokens.colors.themeDark1 : tokens.colors.themeLight1;
}
function metricValueSize(value, primary) {
  const qualitative = isQualitativeKpiValue(value);
  if (primary) {
    if (qualitative) return value.length > 18 ? 38 : 48;
    if (value.length > 24) return 52;
    if (value.length > 14) return 64;
    if (value.length > 8) return 78;
    return 92;
  }
  if (qualitative) return value.length > 20 ? 22 : 28;
  return value.length > 18 ? 25 : 34;
}
function metricNumber(value) {
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/u);
  if (!match) return void 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function formatMetricReference(value, reference) {
  const decimalPlaces = value.match(/\.(\d+)/u)?.[1].length ?? 0;
  const formatted = reference.toLocaleString("en-US", {
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces
  });
  const prefix = value.trim().startsWith("$") ? "$" : "";
  const suffix = value.includes("%") ? "%" : /[KMBT]\b/u.exec(value)?.[0] ?? "";
  return `${prefix}${formatted}${suffix}`;
}
function metricComparisonSignal(kpi) {
  const current = metricNumber(kpi.value);
  const detail = kpi.sublabel?.trim();
  if (current === void 0 || current <= 0 || !detail) return void 0;
  let reference;
  let referenceName = "REFERENCE";
  const percentDelta = detail.match(/^\+([\d.]+)%\s*(?:yoy|year[- ]over[- ]year)/iu);
  const pointDelta = detail.match(/^([+-][\d.]+)\s*pp\b/iu);
  const additiveDelta = detail.match(/^([+-][\d.]+)\s+(?:net\s+new|added|change)/iu);
  const basisPointsOverFloor = detail.match(/([\d.]+)\s*bps\s+over\s+floor/iu);
  const namedReference = detail.match(/\b(limit|floor|min(?:imum)?|avg|average|benchmark)\b[^\d]*([\d.]+)/iu);
  if (percentDelta) {
    reference = current / (1 + Number(percentDelta[1]) / 100);
    referenceName = "PRIOR YEAR";
  } else if (pointDelta) {
    reference = current - Number(pointDelta[1]);
    referenceName = "PRIOR PERIOD";
  } else if (additiveDelta) {
    reference = current - Number(additiveDelta[1]);
    referenceName = "PRIOR PERIOD";
  } else if (basisPointsOverFloor) {
    reference = current - Number(basisPointsOverFloor[1]) / 100;
    referenceName = "FLOOR";
  } else if (namedReference) {
    reference = Number(namedReference[2]);
    referenceName = namedReference[1].toLocaleUpperCase("en-US").replace(/^MIN$/u, "MINIMUM").replace(/^AVG$/u, "AVERAGE");
  }
  if (reference === void 0 || !Number.isFinite(reference) || reference <= 0) return void 0;
  const referenceKind = namedReference?.[1]?.toLocaleLowerCase("en-US") ?? "";
  const breach = referenceKind === "limit" ? current > reference : ["floor", "min", "minimum"].includes(referenceKind) ? current < reference : false;
  return {
    breach,
    current,
    reference,
    referenceName,
    referenceLabel: formatMetricReference(kpi.value, reference)
  };
}
function metricComparisonBars(comparison, frame, currentColor, referenceColor) {
  const maximum = Math.max(comparison.current, comparison.reference);
  const currentWidth = frame.width * (comparison.current / maximum);
  const referenceWidth = frame.width * (comparison.reference / maximum);
  return [
    rule({ left: frame.left, top: frame.top, width: frame.width, height: 3 }, mixHex(referenceColor, currentColor, 0.18)),
    {
      type: NODE_VIEW,
      altText: "Agent metric reference bar",
      decorative: true,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_CONTENT,
        left: frame.left,
        top: frame.top,
        width: referenceWidth,
        height: 3,
        backgroundColor: referenceColor
      }
    },
    {
      type: NODE_VIEW,
      altText: "Agent metric current bar",
      decorative: true,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_CONTENT,
        left: frame.left,
        top: frame.top + 6,
        width: currentWidth,
        height: 5,
        backgroundColor: currentColor
      }
    }
  ];
}
function primaryMetricField(kpi, frame, tokens) {
  const variant = kpi.style ?? "gradient";
  const background = variant === "dark" ? tokens.colors.darkCardBackground : variant === "outline" ? tokens.colors.cardBackground : tokens.colors.accent;
  const foreground = variant === "outline" ? tokens.colors.headingText : ensureTextContrast(contrastText(background, tokens), background, 4.5);
  const secondary = variant === "outline" ? tokens.colors.bodyText : foreground;
  const comparison = metricComparisonSignal(kpi);
  const inset = clamp(frame.width * 0.075, 32, 56);
  const valueHeight = Math.min(168, frame.height * 0.34);
  const labelTop = 34;
  const valueTop = labelTop + 52;
  const sublabelBandTop = comparison ? Math.max(valueTop + valueHeight + 24, frame.height * 0.64) : Math.max(valueTop + valueHeight + 28, frame.height * 0.74);
  const sublabelTop = sublabelBandTop + 28;
  const sublabelHeight = Math.max(42, frame.height - sublabelTop - 18);
  const sublabelBandColor = mixHex(background, foreground, 0.1);
  const comparisonColor = comparison?.breach ? "#DC2626" : foreground;
  const comparisonGap = 24;
  const comparisonColumnWidth = Math.max(80, (frame.width - inset * 2 - comparisonGap) / 2);
  return {
    type: NODE_VIEW,
    altText: "Agent dashboard primary field",
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      backgroundColor: background,
      ...variant === "outline" ? { borderWidth: tokens.effects.outlineBorderWidth, borderColor: tokens.colors.cardBorder } : {}
    },
    children: [
      ...kpi.sublabel ? [{
        type: NODE_VIEW,
        altText: "Agent primary metric sublabel band",
        decorative: true,
        style: {
          position: POSITION_ABSOLUTE,
          zIndex: Z_INDEX_ACCENT_BAR,
          left: 0,
          top: sublabelBandTop,
          width: frame.width,
          height: frame.height - sublabelBandTop,
          backgroundColor: sublabelBandColor
        }
      }] : [],
      absoluteText(kpi.label, {
        left: inset,
        top: labelTop,
        width: frame.width - inset * 2,
        height: 44
      }, {
        color: secondary,
        fontSize: Math.max(15, tokens.typography.kpiGradientLabelSize),
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "left",
        ...bodyTextStyle(tokens)
      }),
      absoluteText(kpi.value, {
        left: inset,
        top: valueTop,
        width: frame.width - inset * 2,
        height: valueHeight
      }, {
        color: foreground,
        fontSize: metricValueSize(kpi.value, true),
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 28, maxLines: 2 },
        verticalAlign: "middle",
        ...titleTextStyle(tokens)
      }, { autoFit: true }),
      ...comparison ? [
        ...metricComparisonBars(comparison, {
          left: inset,
          top: frame.height - 17,
          width: frame.width - inset * 2,
          height: 11
        }, comparisonColor, mixHex(sublabelBandColor, foreground, 0.42)),
        absoluteText("CONTEXT", {
          left: inset,
          top: sublabelBandTop + 24,
          width: comparisonColumnWidth,
          height: 18
        }, {
          color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
          fontSize: 10,
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          ...bodyTextStyle(tokens)
        }),
        absoluteText(kpi.sublabel ?? "", {
          left: inset,
          top: sublabelBandTop + 46,
          width: comparisonColumnWidth,
          height: Math.max(54, frame.height - sublabelBandTop - 60)
        }, {
          color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
          fontSize: Math.max(15, tokens.typography.kpiSublabelSize + 2),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 3 },
          verticalAlign: "top",
          ...bodyTextStyle(tokens)
        }, { autoFit: true }),
        rule({
          left: inset + comparisonColumnWidth + comparisonGap / 2,
          top: sublabelBandTop,
          width: 1,
          height: frame.height - sublabelBandTop
        }, mixHex(sublabelBandColor, foreground, 0.24)),
        absoluteText(comparison.referenceName, {
          left: inset + comparisonColumnWidth + comparisonGap,
          top: sublabelBandTop + 24,
          width: comparisonColumnWidth,
          height: 18
        }, {
          color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
          fontSize: 10,
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          ...bodyTextStyle(tokens)
        }),
        absoluteText(comparison.referenceLabel, {
          left: inset + comparisonColumnWidth + comparisonGap,
          top: sublabelBandTop + 46,
          width: comparisonColumnWidth,
          height: Math.max(54, frame.height - sublabelBandTop - 60)
        }, {
          color: comparisonColor,
          fontSize: metricValueSize(comparison.referenceLabel, false),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 18, maxLines: 2 },
          verticalAlign: "top",
          ...titleTextStyle(tokens)
        }, { autoFit: true })
      ] : [],
      ...kpi.sublabel && !comparison ? [absoluteText(kpi.sublabel, {
        left: inset,
        top: sublabelTop,
        width: frame.width - inset * 2,
        height: sublabelHeight
      }, {
        color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
        fontSize: Math.max(14, tokens.typography.kpiSublabelSize),
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 2 },
        verticalAlign: "middle",
        ...bodyTextStyle(tokens)
      }, { autoFit: true })] : []
    ]
  };
}
function supportingMetricRegister(kpis, frame, tokens) {
  const rowGap = kpis.length > 1 ? 10 : 0;
  const rowHeight = (frame.height - rowGap * Math.max(0, kpis.length - 1)) / Math.max(1, kpis.length);
  return {
    type: NODE_VIEW,
    altText: "Agent dashboard supporting register",
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height
    },
    children: kpis.flatMap((kpi, index) => {
      const top = index * (rowHeight + rowGap);
      const comparison = metricComparisonSignal(kpi);
      const valueHeight = Math.max(34, Math.min(58, rowHeight * 0.34));
      const qualitative = isQualitativeKpiValue(kpi.value);
      const sublabelHeight = kpi.sublabel ? Math.min(42, Math.max(28, rowHeight * 0.18)) : 0;
      const comparisonReserve = comparison ? 40 : 0;
      const stackHeight = 25 + 8 + valueHeight + (sublabelHeight > 0 ? 6 + sublabelHeight : 0);
      const stackTop = top + Math.max(14, (rowHeight - comparisonReserve - stackHeight) / 2);
      const valueTop = stackTop + 33;
      const sublabelTop = valueTop + valueHeight + 6;
      const ruleColor = kpi.style === "dark" ? tokens.colors.darkCardBackground : comparison?.breach ? "#DC2626" : kpi.style === "gradient" || index === 0 ? tokens.colors.accent : tokens.colors.cardBorder;
      const rowBackground = comparison?.breach ? mixHex(tokens.colors.cardBackground, "#DC2626", 0.08) : tokens.colors.cardBackground;
      const comparisonColor = comparison?.breach ? "#DC2626" : tokens.colors.accent;
      const comparisonBandLeft = 18;
      const comparisonBandWidth = frame.width - 36;
      return [
        {
          type: NODE_VIEW,
          altText: "Agent dashboard supporting row field",
          decorative: true,
          style: {
            position: POSITION_ABSOLUTE,
            zIndex: Z_INDEX_ACCENT_BAR,
            left: 0,
            top,
            width: frame.width,
            height: rowHeight,
            backgroundColor: rowBackground
          }
        },
        rule({ left: 0, top, width: frame.width, height: 3 }, ruleColor),
        absoluteText(kpi.label, {
          left: 18,
          top: stackTop,
          width: frame.width - 36,
          height: 25
        }, {
          color: tokens.colors.headingText,
          fontSize: Math.max(13, tokens.typography.kpiLabelSize),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 10, maxLines: 1 },
          ...bodyTextStyle(tokens)
        }, { autoFit: true }),
        absoluteText(kpi.value, {
          left: 18,
          top: valueTop,
          width: frame.width - 36,
          height: valueHeight
        }, {
          color: comparison?.breach ? "#DC2626" : qualitative ? tokens.colors.accent : tokens.colors.headingText,
          fontSize: qualitative ? kpi.value.length > 20 ? 24 : 30 : metricValueSize(kpi.value, false),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 18, maxLines: 2 },
          verticalAlign: "middle",
          ...titleTextStyle(tokens)
        }, { autoFit: true }),
        ...kpi.sublabel ? [absoluteText(kpi.sublabel, {
          left: 18,
          top: sublabelTop,
          width: frame.width - 36,
          height: sublabelHeight
        }, {
          color: tokens.colors.bodyText,
          fontSize: Math.max(12, tokens.typography.kpiSublabelSize),
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 10, maxLines: 2 },
          ...bodyTextStyle(tokens)
        }, { autoFit: true })] : [],
        ...comparison ? [
          ...metricComparisonBars(comparison, {
            left: comparisonBandLeft,
            top: top + rowHeight - 12,
            width: comparisonBandWidth,
            height: 11
          }, comparisonColor, mixHex(tokens.colors.cardBorder, tokens.colors.headingText, 0.38)),
          rule({
            left: comparisonBandLeft,
            top: top + rowHeight - 31,
            width: 3,
            height: 18
          }, comparisonColor),
          absoluteText(comparison.referenceName, {
            left: comparisonBandLeft + 10,
            top: top + rowHeight - 34,
            width: comparisonBandWidth * 0.58,
            height: 24
          }, {
            color: tokens.colors.bodyText,
            fontSize: 9,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            verticalAlign: "middle",
            ...bodyTextStyle(tokens)
          }),
          absoluteText(comparison.referenceLabel, {
            left: comparisonBandLeft + comparisonBandWidth * 0.58,
            top: top + rowHeight - 34,
            width: comparisonBandWidth * 0.42,
            height: 24
          }, {
            color: comparisonColor,
            fontSize: 11,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "right",
            verticalAlign: "middle",
            ...bodyTextStyle(tokens)
          })
        ] : []
      ];
    })
  };
}
function proseRail(prose, frame, tokens) {
  if (!frame || prose.length === 0) return [];
  return [
    rule({ ...frame, height: 2 }, tokens.colors.accent),
    absoluteText(prose.join("\n"), {
      left: frame.left,
      top: frame.top + 14,
      width: frame.width,
      height: frame.height - 14
    }, {
      color: tokens.colors.bodyText,
      fontSize: Math.max(13, tokens.typography.bulletsProseSize),
      textAlign: "left",
      textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: prose.length * 2 },
      verticalAlign: "top",
      ...bodyTextStyle(tokens)
    }, { autoFit: true })
  ];
}
function registerEntryRuns(entry, fontSize, tokens) {
  const parts = parseRegisterEntry(entry);
  if (!parts.anchor) return entry;
  return [
    {
      text: parts.anchor,
      style: {
        color: tokens.colors.headingText,
        fontSize: fontSize + 1,
        fontWeight: FONT_WEIGHT_BOLD
      }
    },
    { text: parts.body }
  ];
}
function registerLineCount(entry, width, fontSize, tokens) {
  const content = registerEntryRuns(entry, fontSize, tokens);
  const runs = typeof content === "string" ? [{ text: content }] : content;
  return Math.max(1, calculateRichTextMetrics(runs, {
    color: tokens.colors.bodyText,
    fontSize,
    lineHeight: 1.12,
    ...bodyTextStyle(tokens)
  }, Math.max(40, width)).lineCount);
}
function planRegisterRows(rows, textWidth, height, tokens, minimumFontSize = 10, preferredFontSize = Math.max(15, tokens.typography.bulletListSize)) {
  const normalizedRows = rows.length > 0 ? rows : [[void 0]];
  let selectedFontSize = Math.max(minimumFontSize, preferredFontSize);
  let selectedDemands = [];
  let fits = false;
  for (let candidate = selectedFontSize; candidate >= minimumFontSize; candidate -= 1) {
    const demands = normalizedRows.map((row) => {
      const lineCount = Math.max(1, ...row.flatMap((entry) => entry ? [registerLineCount(entry, textWidth, candidate, tokens)] : []));
      return Math.max(
        52,
        REGISTER_RULE_BAND + REGISTER_TEXT_PADDING_TOP + lineCount * candidate * 1.12 + REGISTER_TEXT_PADDING_BOTTOM
      );
    });
    selectedFontSize = candidate;
    selectedDemands = demands;
    if (demands.reduce((sum, demand) => sum + demand, 0) <= height) {
      fits = true;
      break;
    }
  }
  const demandTotal = selectedDemands.reduce((sum, demand) => sum + demand, 0);
  const extraPerRow = fits ? Math.max(0, height - demandTotal) / normalizedRows.length : 0;
  const scale = !fits && demandTotal > 0 ? height / demandTotal : 1;
  const boundaries = [0];
  let cursor = 0;
  selectedDemands.forEach((demand, index) => {
    cursor += fits ? demand + extraPerRow : demand * scale;
    boundaries.push(index === selectedDemands.length - 1 ? height : Math.round(cursor));
  });
  return { boundaries, fits, fontSize: selectedFontSize };
}
function registerRows(entries, frame, tokens, startIndex = 0, entryIndices, minimumFontSize = 10, sharedPlan) {
  const rowCount = Math.max(1, entries.length);
  const sparseRegister = rowCount <= 2 && frame.height / rowCount >= 180;
  const indexWidth = sparseRegister ? clamp(frame.width * 0.17, 82, 108) : REGISTER_INDEX_WIDTH;
  const textWidth = frame.width - indexWidth - 6 - REGISTER_TEXT_PADDING_RIGHT;
  const plan = sharedPlan ?? planRegisterRows(
    entries.map((entry) => [entry]),
    textWidth,
    frame.height,
    tokens,
    minimumFontSize,
    sparseRegister ? Math.max(20, tokens.typography.bulletListSize) : Math.max(15, tokens.typography.bulletListSize)
  );
  const fontSize = sparseRegister ? Math.max(minimumFontSize, plan.fontSize - 2) : plan.fontSize;
  return {
    type: NODE_VIEW,
    altText: plan.fits ? "Agent register" : "Agent register overflow",
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height
    },
    children: entries.flatMap((entry, index) => {
      const top = plan.boundaries[index] ?? Math.round(index * frame.height / rowCount);
      const bottom = plan.boundaries[index + 1] ?? Math.round((index + 1) * frame.height / rowCount);
      const resolvedRowHeight = bottom - top;
      const textTop = REGISTER_RULE_BAND + REGISTER_TEXT_PADDING_TOP;
      const textHeight = Math.max(24, resolvedRowHeight - textTop - REGISTER_TEXT_PADDING_BOTTOM);
      if (!entry) {
        return [{
          type: NODE_VIEW,
          altText: "Agent register deliberate empty field",
          decorative: true,
          style: {
            position: POSITION_ABSOLUTE,
            left: 0,
            top,
            width: frame.width,
            height: resolvedRowHeight,
            backgroundColor: tokens.colors.accent
          },
          children: [
            rule({
              left: 28,
              top: 28,
              width: 3,
              height: Math.max(40, resolvedRowHeight - 56)
            }, contrastText(tokens.colors.accent, tokens))
          ]
        }];
      }
      const indexHeight = sparseRegister ? 68 : 40;
      const indexTop = Math.max(textTop, (resolvedRowHeight - indexHeight) / 2);
      return [{
        type: NODE_VIEW,
        altText: "Agent register row",
        style: {
          position: POSITION_ABSOLUTE,
          left: 0,
          top,
          width: frame.width,
          height: resolvedRowHeight,
          ...sparseRegister ? { backgroundColor: mixHex(tokens.colors.cardBackground, tokens.colors.accent, index % 2 === 0 ? 0.035 : 0.075) } : {}
        },
        children: [
          {
            type: NODE_VIEW,
            altText: "Agent register index field",
            decorative: true,
            style: {
              position: POSITION_ABSOLUTE,
              zIndex: Z_INDEX_ACCENT_BAR,
              left: 0,
              top: 0,
              width: indexWidth,
              height: resolvedRowHeight,
              backgroundColor: mixHex(tokens.colors.cardBackground, tokens.colors.accent, 0.1)
            }
          },
          rule({ left: 0, top: 0, width: frame.width, height: index === 0 ? 3 : 1 }, index === 0 ? tokens.colors.accent : tokens.colors.cardBorder),
          absoluteText(String((entryIndices?.[index] ?? startIndex + index) + 1).padStart(2, "0"), {
            left: 0,
            top: indexTop,
            width: indexWidth,
            height: indexHeight
          }, {
            color: tokens.colors.accent,
            fontSize: sparseRegister ? 48 : 30,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "center",
            ...bodyTextStyle(tokens)
          }),
          absoluteText(registerEntryRuns(entry, fontSize, tokens), {
            left: indexWidth + 6,
            top: textTop,
            width: textWidth,
            height: textHeight
          }, {
            color: tokens.colors.bodyText,
            fontSize,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: minimumFontSize, maxLines: Math.max(1, Math.floor(textHeight / (fontSize * 1.12))) },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens)
          }, { autoFit: true })
        ]
      }];
    })
  };
}
function ownedComparisonFields(pairs, ownership, frame, tokens) {
  const dividerGap = 30;
  const fieldWidth = (frame.width - dividerGap) / 2;
  const rowsHeight = frame.height - OWNED_FIELD_HEADER_HEIGHT;
  const comparisonInset = 18;
  const comparisonMarkerWidth = 28;
  const comparisonTextWidth = fieldWidth - comparisonInset * 2 - comparisonMarkerWidth;
  const dividerColor = mixHex(tokens.colors.cardBorder, tokens.colors.headingText, 0.28);
  const rowPlan = planRegisterRows(
    pairs.map((pair) => [pair.left, pair.right]),
    comparisonTextWidth,
    rowsHeight,
    tokens,
    11,
    Math.max(15, tokens.typography.comparisonBodySize)
  );
  const buildField = (side, left, header) => ({
    type: NODE_VIEW,
    altText: rowPlan.fits ? `Agent comparison owned field: ${side}` : `Agent comparison owned field: ${side} overflow`,
    style: {
      position: POSITION_ABSOLUTE,
      left,
      top: frame.top,
      width: fieldWidth,
      height: frame.height,
      backgroundColor: side === "right" ? mixHex(tokens.colors.cardBackground, tokens.colors.accent, 0.08) : tokens.colors.cardBackground
    },
    children: [
      rule({
        left: 0,
        top: 0,
        width: fieldWidth,
        height: 3
      }, side === "right" ? tokens.colors.accent : dividerColor),
      absoluteText(header, {
        left: comparisonInset,
        top: 13,
        width: fieldWidth - comparisonInset * 2,
        height: 32
      }, {
        color: side === "right" ? tokens.colors.accent : tokens.colors.headingText,
        fontSize: 16,
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 12, maxLines: 2 },
        ...bodyTextStyle(tokens)
      }, { autoFit: true }),
      ...pairs.flatMap((pair, index) => {
        const rowTop = OWNED_FIELD_HEADER_HEIGHT + (rowPlan.boundaries[index] ?? 0);
        const rowBottom = OWNED_FIELD_HEADER_HEIGHT + (rowPlan.boundaries[index + 1] ?? rowsHeight);
        const rowResolvedHeight = rowBottom - rowTop;
        const text = side === "left" ? pair.left : pair.right;
        const textTop = rowTop + REGISTER_RULE_BAND + REGISTER_TEXT_PADDING_TOP;
        const textHeight = Math.max(24, rowResolvedHeight - REGISTER_RULE_BAND - REGISTER_TEXT_PADDING_TOP - REGISTER_TEXT_PADDING_BOTTOM);
        return [
          rule({ left: comparisonInset, top: rowTop, width: fieldWidth - comparisonInset * 2, height: 1 }, dividerColor),
          absoluteText(side === "right" ? "\u2713" : "\u2014", {
            left: comparisonInset,
            top: textTop,
            width: comparisonMarkerWidth,
            height: textHeight
          }, {
            color: side === "right" ? tokens.colors.accent : tokens.colors.mutedText,
            fontSize: Math.max(14, rowPlan.fontSize),
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            verticalAlign: "middle",
            ...bodyTextStyle(tokens)
          }),
          absoluteText(text, {
            left: comparisonInset + comparisonMarkerWidth,
            top: textTop,
            width: comparisonTextWidth,
            height: textHeight
          }, {
            color: side === "right" ? tokens.colors.headingText : tokens.colors.bodyText,
            fontSize: rowPlan.fontSize,
            fontWeight: void 0,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: Math.max(1, Math.floor(textHeight / (rowPlan.fontSize * 1.12))) },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens)
          }, { autoFit: true })
        ];
      })
    ]
  });
  return [{
    type: NODE_VIEW,
    style: {
      position: POSITION_ABSOLUTE,
      left: 0,
      top: 0,
      width: SLIDE_W,
      height: SLIDE_H
    },
    children: [
      buildField("left", frame.left, ownership.left),
      buildField("right", frame.left + fieldWidth + dividerGap, ownership.right),
      rule({
        left: frame.left + fieldWidth + dividerGap / 2,
        top: frame.top,
        width: 2,
        height: frame.height
      }, dividerColor)
    ]
  }];
}
function timelineRunway(entries, frame, tokens) {
  const milestones = entries.flatMap((entry) => {
    const parsed = parseTimelineEntry(entry);
    return parsed ? [parsed] : [];
  });
  const supporting = entries.flatMap((entry) => parseTimelineEntry(entry) ? [] : [{ entry }]);
  const supportHeight = supporting.length > 0 ? clamp(70 * supporting.length, 76, 112) : 0;
  const runwayHeight = frame.height - (supportHeight > 0 ? supportHeight + 16 : 0);
  const rowHeight = runwayHeight / Math.max(1, milestones.length);
  const runway = {
    type: NODE_VIEW,
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: runwayHeight
    },
    children: [
      rule({
        left: TIMELINE_SPINE_LEFT,
        top: 16,
        width: 3,
        height: Math.max(0, runwayHeight - 32)
      }, tokens.colors.accent),
      ...milestones.flatMap((milestone, index) => {
        const top = Math.round(index * rowHeight);
        const bottom = Math.round((index + 1) * rowHeight);
        const resolvedHeight = bottom - top;
        const insetY = clamp(resolvedHeight * 0.14, 8, 14);
        return [{
          type: NODE_VIEW,
          altText: "Agent timeline milestone",
          style: {
            position: POSITION_ABSOLUTE,
            zIndex: Z_INDEX_CONTENT,
            left: 0,
            top,
            width: frame.width,
            height: resolvedHeight
          },
          children: [
            rule({ left: TIMELINE_SPINE_LEFT - 7, top: insetY + 8, width: 17, height: 3 }, tokens.colors.accent),
            absoluteText(milestone.prefix, {
              left: 52,
              top: insetY,
              width: TIMELINE_PREFIX_WIDTH,
              height: Math.max(30, resolvedHeight - insetY * 2)
            }, {
              color: tokens.colors.accent,
              fontSize: 18,
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 14, maxLines: 1 },
              verticalAlign: "top",
              ...titleTextStyle(tokens)
            }, { autoFit: true }),
            absoluteText(milestone.body.trimStart(), {
              left: TIMELINE_PREFIX_WIDTH + 66,
              top: insetY,
              width: frame.width - TIMELINE_PREFIX_WIDTH - 66,
              height: Math.max(30, resolvedHeight - insetY * 2)
            }, {
              color: tokens.colors.bodyText,
              fontSize: Math.max(15, tokens.typography.bulletListSize),
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 3 },
              verticalAlign: "top",
              ...bodyTextStyle(tokens)
            }, { autoFit: true })
          ]
        }];
      })
    ]
  };
  if (supporting.length === 0) return [runway];
  const supportTop = frame.top + runwayHeight + 16;
  return [
    runway,
    {
      type: NODE_VIEW,
      altText: "Agent timeline support rail",
      style: {
        position: POSITION_ABSOLUTE,
        left: frame.left,
        top: supportTop,
        width: frame.width,
        height: supportHeight
      },
      children: [
        rule({ left: 0, top: 0, width: frame.width, height: 3 }, tokens.colors.accent),
        ...supporting.map((item, index) => absoluteText(
          registerEntryRuns(item.entry, Math.max(14, tokens.typography.bulletListSize), tokens),
          {
            left: 0,
            top: 14 + index * ((supportHeight - 14) / supporting.length),
            width: frame.width,
            height: (supportHeight - 14) / supporting.length
          },
          {
            color: tokens.colors.bodyText,
            fontSize: Math.max(14, tokens.typography.bulletListSize),
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 2 },
            verticalAlign: "top",
            ...bodyTextStyle(tokens)
          },
          { autoFit: true }
        ))
      ]
    }
  ];
}
function titleOrganizationFooter(companyName, tokens, width) {
  const height = Math.max(FOOTER_MIN_HEIGHT, tokens.typography.footerSize + 15);
  return {
    type: NODE_VIEW,
    altText: "Agent title organization footer",
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_FOOTER,
      left: tokens.semantic.titlePaddingX,
      top: SLIDE_H - tokens.layout.footerBottom - height,
      width: width - tokens.semantic.titlePaddingX * 2,
      height
    },
    children: [
      rule({ left: 0, top: 0, width: width - tokens.semantic.titlePaddingX * 2, height: 1 }, tokens.colors.accent),
      absoluteText(companyName, {
        left: 0,
        top: 7,
        width: width - tokens.semantic.titlePaddingX * 2,
        height: height - 7
      }, {
        color: ensureTextContrast(tokens.colors.titleSubtitleText, tokens.colors.titleBackgroundStart, 4.5),
        fontSize: Math.max(9, tokens.typography.footerSize),
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 7, maxLines: 1 },
        verticalAlign: "middle",
        ...bodyTextStyle(tokens)
      }, { autoFit: true })
    ]
  };
}
function buildTitleLayout(content, accentColor, fontFamily, designTokens, companyName) {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const inner = [];
  const editorialFieldWidth = clamp(SLIDE_W * 0.31, 300, 410);
  const editorialFieldLeft = SLIDE_W - editorialFieldWidth;
  const editorialLabel = titleFieldLabel(content.title);
  const lowerFieldTop = SLIDE_H * 0.56;
  const lowerFieldHeight = 175;
  inner.push({
    type: NODE_TEXT,
    style: {
      color: tokens.colors.titleText,
      fontSize: Math.max(42, tokens.typography.heroTitleSize),
      fontWeight: FONT_WEIGHT_BOLD,
      marginTop: HERO_TITLE_MARGIN_TOP,
      ...titleTextStyle(tokens)
    },
    content: content.title
  });
  if (content.subtitle) {
    inner.push({
      type: NODE_TEXT,
      style: {
        color: tokens.colors.titleSubtitleText,
        fontSize: tokens.typography.heroSubtitleSize,
        marginTop: SUBTITLE_MARGIN_TOP,
        ...bodyTextStyle(tokens)
      },
      content: content.subtitle
    });
  }
  inner.push({
    type: NODE_VIEW,
    style: {
      width: tokens.layout.titleDividerWidth,
      height: tokens.layout.titleDividerHeight,
      backgroundColor: tokens.colors.accent,
      marginTop: tokens.layout.titleDividerMarginTop,
      marginBottom: tokens.layout.titleDividerMarginBottom
    }
  });
  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.titleBackgroundStart },
    children: [
      accentBar(tokens),
      {
        type: NODE_VIEW,
        altText: "Agent title editorial field",
        decorative: true,
        style: {
          position: POSITION_ABSOLUTE,
          left: editorialFieldLeft,
          top: 0,
          width: editorialFieldWidth,
          height: SLIDE_H,
          backgroundColor: tokens.colors.accent
        },
        children: [
          absoluteText(editorialLabel, {
            left: editorialFieldWidth * 0.16,
            top: SLIDE_H * 0.22,
            width: editorialFieldWidth * 0.68,
            height: 42
          }, {
            color: contrastText(tokens.colors.accent, tokens),
            fontSize: 15,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 1 },
            ...bodyTextStyle(tokens)
          }, { autoFit: true }),
          rule({
            left: editorialFieldWidth * 0.16,
            top: SLIDE_H * 0.29,
            width: 2,
            height: SLIDE_H * 0.3
          }, contrastText(tokens.colors.accent, tokens)),
          absoluteText("01", {
            left: editorialFieldWidth * 0.16,
            top: SLIDE_H * 0.56,
            width: editorialFieldWidth * 0.68,
            height: 220
          }, {
            color: contrastText(tokens.colors.accent, tokens),
            fontSize: 150,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            verticalAlign: "bottom",
            ...titleTextStyle(tokens)
          })
        ]
      },
      {
        type: NODE_VIEW,
        style: {
          flexDirection: FLEX_DIRECTION_COLUMN,
          justifyContent: FLEX_ALIGN_START,
          alignItems: FLEX_ALIGN_START,
          paddingLeft: tokens.semantic.titlePaddingX,
          paddingRight: tokens.semantic.titlePaddingX,
          paddingTop: Math.max(205, tokens.semantic.titlePaddingTop),
          paddingBottom: tokens.semantic.titlePaddingBottom,
          width: editorialFieldLeft,
          height: SLIDE_H
        },
        children: inner
      },
      {
        type: NODE_VIEW,
        altText: "Agent title horizon rule",
        decorative: true,
        style: {
          position: POSITION_ABSOLUTE,
          zIndex: Z_INDEX_CONTENT,
          left: tokens.semantic.titlePaddingX,
          top: SLIDE_H * 0.54,
          width: editorialFieldLeft - tokens.semantic.titlePaddingX * 2,
          height: 2,
          backgroundColor: mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.28)
        }
      },
      {
        type: NODE_VIEW,
        altText: "Agent title source-owned identity field",
        style: {
          position: POSITION_ABSOLUTE,
          zIndex: Z_INDEX_CONTENT,
          left: tokens.semantic.titlePaddingX,
          top: lowerFieldTop,
          width: editorialFieldLeft - tokens.semantic.titlePaddingX * 2,
          height: lowerFieldHeight,
          backgroundColor: mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.1)
        },
        children: [
          rule({ left: 0, top: 0, width: 5, height: lowerFieldHeight }, tokens.colors.accent),
          absoluteText(editorialLabel, {
            left: 28,
            top: 16,
            width: editorialFieldLeft - tokens.semantic.titlePaddingX * 2 - 56,
            height: 38
          }, {
            color: ensureTextContrast(tokens.colors.titleText, mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.1), 4.5),
            fontSize: 14,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 1 },
            ...bodyTextStyle(tokens)
          }, { autoFit: true }),
          absoluteText(companyName ?? content.subtitle ?? content.title, {
            left: 28,
            top: 54,
            width: editorialFieldLeft - tokens.semantic.titlePaddingX * 2 - 56,
            height: 44
          }, {
            color: ensureTextContrast(tokens.colors.titleSubtitleText, mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.1), 4.5),
            fontSize: Math.max(14, tokens.typography.heroSubtitleSize),
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 2 },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens)
          }, { autoFit: true })
        ]
      },
      ...companyName ? [titleOrganizationFooter(companyName, tokens, editorialFieldLeft)] : []
    ]
  };
}
function buildStatementLayout(content, accentColor, fontFamily, designTokens) {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children = [accentBar(tokens)];
  const prose = content.prose ?? [];
  const top = Math.max(118, tokens.semantic.contentPaddingTop + 28);
  const bottom = SLIDE_H - Math.max(
    clamp(tokens.semantic.pagePaddingBottom * 0.55, 42, 64),
    tokens.layout.footerBottom + FOOTER_MIN_HEIGHT + FOOTER_CONTENT_GAP
  );
  const height = bottom - top;
  const hasProse = prose.length > 0;
  const statementWidth = hasProse ? tokens.semantic.contentWidth * 0.47 : tokens.semantic.contentWidth * 0.72;
  const claimInset = hasProse ? 34 : 0;
  const statementTextWidth = statementWidth - claimInset * 2;
  const statementFontSize = Math.max(
    hasProse ? 32 : content.title.length < 90 ? 52 : 42,
    tokens.typography.sectionTitleSize
  );
  const statementRuns = [{ text: content.title }];
  const statementLines = calculateRichTextMetrics(statementRuns, {
    color: tokens.colors.headingText,
    fontSize: statementFontSize,
    fontWeight: FONT_WEIGHT_BOLD,
    lineHeight: 1.12,
    ...titleTextStyle(tokens)
  }, statementTextWidth).lineCount;
  const titleHeight = clamp(
    statementLines * statementFontSize * 1.12 + 20,
    96,
    hasProse ? Math.min(300, height * 0.62) : Math.min(390, height * 0.72)
  );
  const titleTop = hasProse ? top + clamp((height - titleHeight) / 2 - 16, 72, height - titleHeight - 72) : top + 12;
  const subtitleHeight = content.subtitle && !hasProse ? 36 : 0;
  const dividerTop = titleTop + titleHeight + subtitleHeight + 18;
  if (hasProse) {
    children.push({
      type: NODE_VIEW,
      altText: "Agent statement claim field",
      decorative: true,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_ACCENT_BAR,
        left: tokens.semantic.contentLeft,
        top,
        width: statementWidth,
        height,
        backgroundColor: tokens.colors.accent,
        borderWidth: tokens.effects.outlineBorderWidth,
        borderColor: tokens.colors.accent
      }
    });
    children.push(absoluteText("\u201C", {
      left: tokens.semantic.contentLeft + claimInset,
      top: top + 24,
      width: 120,
      height: 116
    }, {
      color: mixHex(tokens.colors.accent, contrastText(tokens.colors.accent, tokens), 0.35),
      fontSize: 96,
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "left",
      verticalAlign: "top",
      ...titleTextStyle(tokens)
    }));
    children.push(absoluteText("\u201D", {
      left: tokens.semantic.contentLeft + statementWidth - claimInset - 120,
      top: top + height - 142,
      width: 120,
      height: 116
    }, {
      color: mixHex(tokens.colors.accent, contrastText(tokens.colors.accent, tokens), 0.35),
      fontSize: 96,
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "right",
      verticalAlign: "bottom",
      ...titleTextStyle(tokens)
    }));
  }
  children.push(
    absoluteText(content.title, {
      left: tokens.semantic.contentLeft + claimInset,
      top: titleTop,
      width: statementTextWidth,
      height: titleHeight
    }, {
      color: hasProse ? contrastText(tokens.colors.accent, tokens) : tokens.colors.headingText,
      fontSize: statementFontSize,
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "left",
      textFit: {
        policy: "fitFontSize",
        minFontSize: 20,
        maxLines: Math.max(5, Math.floor(titleHeight / (statementFontSize * 1.12)))
      },
      verticalAlign: "top",
      ...titleTextStyle(tokens)
    }, { autoFit: true })
  );
  if (content.subtitle && !hasProse) {
    children.push(absoluteText(content.subtitle, {
      left: tokens.semantic.contentLeft,
      top: titleTop + titleHeight + 6,
      width: statementWidth,
      height: 30
    }, {
      color: tokens.colors.bodyText,
      fontSize: Math.max(14, tokens.typography.sectionSubtitleSize),
      textAlign: "left",
      ...bodyTextStyle(tokens)
    }));
  }
  children.push(rule({
    left: tokens.semantic.contentLeft + claimInset,
    top: dividerTop,
    width: tokens.layout.sectionDividerWidth,
    height: Math.max(3, tokens.layout.sectionDividerHeight)
  }, hasProse ? contrastText(tokens.colors.accent, tokens) : tokens.colors.accent));
  if (hasProse) {
    const proseLeft = tokens.semantic.contentLeft + statementWidth + FIELD_GAP * 1.5;
    const proseWidth = tokens.semantic.contentRight - proseLeft;
    const railInsetX = clamp(proseWidth * 0.05, 16, 24);
    const evidenceHeight = height;
    const evidenceTop = top;
    const railTop = content.subtitle ? 80 : 20;
    const railBottom = 20;
    children.push({
      type: NODE_VIEW,
      altText: "Agent statement evidence field",
      style: {
        position: POSITION_ABSOLUTE,
        left: proseLeft,
        top: evidenceTop,
        width: proseWidth,
        height: evidenceHeight,
        backgroundColor: tokens.colors.cardBackground,
        borderWidth: tokens.effects.outlineBorderWidth,
        borderColor: tokens.colors.cardBorder
      },
      children: [
        ...content.subtitle ? [absoluteText(content.subtitle, {
          left: railInsetX,
          top: 20,
          width: proseWidth - railInsetX * 2,
          height: 48
        }, {
          color: tokens.colors.headingText,
          fontSize: Math.max(14, tokens.typography.sectionSubtitleSize),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 12, maxLines: 2 },
          ...bodyTextStyle(tokens)
        }, { autoFit: true })] : [],
        registerRows(prose, {
          left: railInsetX,
          top: railTop,
          width: proseWidth - railInsetX * 2,
          height: evidenceHeight - railTop - railBottom
        }, tokens, 0, void 0, 18)
      ]
    });
  }
  if (!hasProse) {
    const anchorWidth = clamp(tokens.semantic.contentWidth * 0.16, 140, 190);
    children.push({
      type: NODE_VIEW,
      altText: "Agent statement full-height anchor",
      style: {
        position: POSITION_ABSOLUTE,
        left: tokens.semantic.contentRight - anchorWidth,
        top,
        width: anchorWidth,
        height,
        backgroundColor: tokens.colors.accent
      },
      children: [
        absoluteText("\u201C", {
          left: anchorWidth * 0.16,
          top: height * 0.08,
          width: anchorWidth * 0.68,
          height: 150
        }, {
          color: contrastText(tokens.colors.accent, tokens),
          fontSize: 108,
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          verticalAlign: "top",
          ...titleTextStyle(tokens)
        }),
        rule({
          left: anchorWidth * 0.18,
          top: height * 0.34,
          width: 3,
          height: height * 0.48
        }, contrastText(tokens.colors.accent, tokens))
      ]
    });
  }
  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children
  };
}
function buildDashboardLayout(content, accentColor, fontFamily, designTokens) {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children = [
    accentBar(tokens),
    headerText(content.title, tokens)
  ];
  if (content.subtitle) children.push(subheaderText(content.subtitle, tokens));
  const kpis = content.kpis ?? [];
  const hasChart = !!content.chart;
  const prose = content.prose ?? [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), prose);
  const body = {
    ...composition.content,
    left: tokens.layout.headerLeft,
    width: Math.max(0, tokens.semantic.contentRight - tokens.layout.headerLeft)
  };
  if (hasChart) {
    const registerWidth = kpis.length > 0 ? clamp(body.width * 0.26, 250, 320) : 0;
    const chartLeft = body.left + (registerWidth > 0 ? registerWidth + FIELD_GAP : 0);
    const chartWidth = body.width - (registerWidth > 0 ? registerWidth + FIELD_GAP : 0);
    const chartData = agentChartToChartData(
      content.chart,
      tokens.colors.accent,
      tokens,
      [content.title, content.subtitle]
    );
    children.push({
      type: NODE_CHART,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_CONTENT,
        top: body.top,
        left: chartLeft,
        width: chartWidth,
        height: body.height
      },
      chartData
    });
    if (kpis.length > 0) {
      children.push(supportingMetricRegister(kpis, {
        left: body.left,
        top: body.top,
        width: registerWidth,
        height: body.height
      }, tokens));
    }
  } else if (kpis.length > 0) {
    const heroWidth = kpis.length === 1 ? body.width : Math.round((body.width - FIELD_GAP) * 0.44);
    children.push(primaryMetricField(kpis[0], {
      left: body.left,
      top: body.top,
      width: heroWidth,
      height: body.height
    }, tokens));
    if (kpis.length > 1) {
      children.push(supportingMetricRegister(kpis.slice(1), {
        left: body.left + heroWidth + FIELD_GAP,
        top: body.top,
        width: body.width - heroWidth - FIELD_GAP,
        height: body.height
      }, tokens));
    }
  }
  children.push(...proseRail(prose, composition.proseRail, tokens));
  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children
  };
}
function buildComparisonLayout(content, accentColor, fontFamily, designTokens) {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children = [
    accentBar(tokens),
    headerText(content.title, tokens)
  ];
  const legacyOwnership = parseComparisonOwnership(content.subtitle);
  const ownership = content.comparison ? { left: content.comparison.leftLabel, right: content.comparison.rightLabel } : legacyOwnership;
  if (content.subtitle && !legacyOwnership) children.push(subheaderText(content.subtitle, tokens));
  const prose = content.prose ?? [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), prose);
  const body = composition.content;
  const explicitPairs = content.comparison?.rows;
  const legacyPairs = content.bulletPoints?.map((entry) => parseComparisonEntry(entry));
  const resolvedLegacyPairs = legacyPairs?.every((pair) => pair !== void 0) ? legacyPairs.filter((pair) => pair !== void 0) : void 0;
  const ownedPairs = explicitPairs ?? (legacyOwnership ? resolvedLegacyPairs : void 0);
  if (ownership && ownedPairs && ownedPairs.length > 0) {
    children.push(...ownedComparisonFields(ownedPairs, ownership, body, tokens));
  } else if (content.bulletPoints && content.bulletPoints.length > 0) {
    const mid = Math.ceil(content.bulletPoints.length / HALF_DIVISOR);
    const leftBullets = content.bulletPoints.slice(0, mid);
    const rightBullets = content.bulletPoints.slice(mid);
    const columnWidth = (body.width - REGISTER_COLUMN_GAP) / HALF_DIVISOR;
    children.push(
      registerRows(leftBullets, {
        left: body.left,
        top: body.top,
        width: columnWidth,
        height: body.height
      }, tokens),
      registerRows(rightBullets, {
        left: body.left + columnWidth + REGISTER_COLUMN_GAP,
        top: body.top,
        width: columnWidth,
        height: body.height
      }, tokens, mid),
      rule({
        left: body.left + columnWidth + REGISTER_COLUMN_GAP / 2,
        top: body.top,
        width: 1,
        height: body.height
      }, tokens.colors.cardBorder)
    );
  } else if (content.kpis && content.kpis.length > 0) {
    const heroWidth = content.kpis.length === 1 ? body.width : Math.round((body.width - FIELD_GAP) * 0.52);
    children.push(primaryMetricField(content.kpis[0], {
      left: body.left,
      top: body.top,
      width: heroWidth,
      height: body.height
    }, tokens));
    if (content.kpis.length > 1) {
      children.push(supportingMetricRegister(content.kpis.slice(1), {
        left: body.left + heroWidth + FIELD_GAP,
        top: body.top,
        width: body.width - heroWidth - FIELD_GAP,
        height: body.height
      }, tokens));
    }
  }
  children.push(...proseRail(prose, composition.proseRail, tokens));
  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children
  };
}
function buildChartFocusLayout(content, accentColor, fontFamily, designTokens) {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children = [
    accentBar(tokens),
    headerText(content.title, tokens)
  ];
  if (content.subtitle) children.push(subheaderText(content.subtitle, tokens));
  const kpis = content.kpis ?? [];
  const prose = content.prose ?? [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), prose);
  const body = composition.content;
  const sidebarWidth = kpis.length > 0 ? clamp(body.width * 0.25, 250, 310) : 0;
  const chartWidth = body.width - (sidebarWidth > 0 ? sidebarWidth + FIELD_GAP : 0);
  if (content.chart) {
    const chartData = agentChartToChartData(
      content.chart,
      tokens.colors.accent,
      tokens,
      [content.title, content.subtitle]
    );
    children.push({
      type: NODE_CHART,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_CONTENT,
        top: body.top,
        left: body.left,
        width: chartWidth,
        height: body.height
      },
      chartData
    });
  }
  if (kpis.length > 0) {
    if (content.chart) {
      children.push(supportingMetricRegister(kpis, {
        left: body.left + chartWidth + FIELD_GAP,
        top: body.top,
        width: sidebarWidth,
        height: body.height
      }, tokens));
    } else {
      const heroWidth = kpis.length === 1 ? body.width : Math.round((body.width - FIELD_GAP) * 0.56);
      children.push(primaryMetricField(kpis[0], {
        left: body.left,
        top: body.top,
        width: heroWidth,
        height: body.height
      }, tokens));
      if (kpis.length > 1) {
        children.push(supportingMetricRegister(kpis.slice(1), {
          left: body.left + heroWidth + FIELD_GAP,
          top: body.top,
          width: body.width - heroWidth - FIELD_GAP,
          height: body.height
        }, tokens));
      }
    }
  }
  children.push(...proseRail(prose, composition.proseRail, tokens));
  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children
  };
}
function buildBulletsLayout(content, accentColor, fontFamily, designTokens) {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children = [
    accentBar(tokens),
    headerText(content.title, tokens)
  ];
  if (content.subtitle) children.push(subheaderText(content.subtitle, tokens));
  const bullets = content.bulletPoints ?? [];
  const prose = content.prose ?? [];
  const timeline = bullets.length > 0 && isTimelineSequence(bullets);
  const useOddProseField = !timeline && bullets.length >= 5 && bullets.length % 2 === 1 && prose.length > 0;
  const proseAsRail = bullets.length > 0 && !useOddProseField ? prose : [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), proseAsRail);
  const body = composition.content;
  if (bullets.length > 0) {
    if (timeline) {
      children.push(...timelineRunway(bullets, body, tokens));
    } else {
      const wantsTwoColumns = bullets.length >= 5;
      const twoColumnWidth = (body.width - REGISTER_COLUMN_GAP) / 2;
      const rowPairs = Array.from({ length: Math.ceil(bullets.length / 2) }, (_, rowIndex) => [
        bullets[rowIndex * 2],
        bullets[rowIndex * 2 + 1]
      ]);
      const sharedPlan = wantsTwoColumns ? planRegisterRows(
        rowPairs,
        twoColumnWidth - REGISTER_INDEX_WIDTH - 6 - REGISTER_TEXT_PADDING_RIGHT,
        body.height,
        tokens,
        10,
        Math.max(20, tokens.typography.bulletListSize)
      ) : void 0;
      const oneColumnPlan = planRegisterRows(
        bullets.map((entry) => [entry]),
        body.width - REGISTER_INDEX_WIDTH - 6 - REGISTER_TEXT_PADDING_RIGHT,
        body.height,
        tokens
      );
      const useTwoColumns = wantsTwoColumns && (sharedPlan?.fits === true || !oneColumnPlan.fits);
      if (!useTwoColumns) {
        children.push(registerRows(bullets, body, tokens, 0, void 0, 10, oneColumnPlan));
      } else if (bullets.length % 2 === 1 && !useOddProseField) {
        const pairedBullets = bullets.slice(0, -1);
        const pairedRows = pairedBullets.length / 2;
        const finalRowHeight = body.height / (pairedRows + 1);
        const pairedHeight = body.height - finalRowHeight;
        const pairedPlan = planRegisterRows(
          Array.from({ length: pairedRows }, (_, rowIndex) => [
            pairedBullets[rowIndex * 2],
            pairedBullets[rowIndex * 2 + 1]
          ]),
          twoColumnWidth - REGISTER_INDEX_WIDTH - 6 - REGISTER_TEXT_PADDING_RIGHT,
          pairedHeight,
          tokens,
          10,
          Math.max(20, tokens.typography.bulletListSize)
        );
        children.push(
          registerRows(pairedBullets.filter((_entry, index) => index % 2 === 0), {
            left: body.left,
            top: body.top,
            width: twoColumnWidth,
            height: pairedHeight
          }, tokens, 0, Array.from({ length: pairedRows }, (_, index) => index * 2), 10, pairedPlan),
          registerRows(pairedBullets.filter((_entry, index) => index % 2 === 1), {
            left: body.left + twoColumnWidth + REGISTER_COLUMN_GAP,
            top: body.top,
            width: twoColumnWidth,
            height: pairedHeight
          }, tokens, 0, Array.from({ length: pairedRows }, (_, index) => index * 2 + 1), 10, pairedPlan),
          registerRows([bullets[bullets.length - 1]], {
            left: body.left,
            top: body.top + pairedHeight,
            width: body.width,
            height: finalRowHeight
          }, tokens, bullets.length - 1)
        );
      } else {
        const leftEntries = rowPairs.map((pair) => pair[0]);
        const rightEntries = rowPairs.map((pair) => pair[1]);
        const leftIndices = rowPairs.map((_pair, index) => index * 2);
        const rightIndices = rowPairs.map((_pair, index) => index * 2 + 1);
        children.push(
          registerRows(leftEntries, {
            left: body.left,
            top: body.top,
            width: twoColumnWidth,
            height: body.height
          }, tokens, 0, leftIndices, 10, sharedPlan),
          registerRows(rightEntries, {
            left: body.left + twoColumnWidth + REGISTER_COLUMN_GAP,
            top: body.top,
            width: twoColumnWidth,
            height: body.height
          }, tokens, 0, rightIndices, 10, sharedPlan)
        );
        if (useOddProseField && sharedPlan) {
          const fieldTop = sharedPlan.boundaries[rowPairs.length - 1] ?? 0;
          const fieldBottom = sharedPlan.boundaries[rowPairs.length] ?? body.height;
          const fieldHeight = fieldBottom - fieldTop;
          children.push({
            type: NODE_VIEW,
            altText: "Agent bullet source-owned editorial field",
            style: {
              position: POSITION_ABSOLUTE,
              zIndex: Z_INDEX_CONTENT,
              left: body.left + twoColumnWidth + REGISTER_COLUMN_GAP,
              top: body.top + fieldTop,
              width: twoColumnWidth,
              height: fieldHeight,
              backgroundColor: tokens.colors.accent
            },
            children: [
              rule({
                left: 34,
                top: 30,
                width: 3,
                height: Math.max(40, fieldHeight - 60)
              }, contrastText(tokens.colors.accent, tokens)),
              absoluteText(prose.join("\n"), {
                left: 58,
                top: 32,
                width: twoColumnWidth - 96,
                height: fieldHeight - 64
              }, {
                color: ensureTextContrast(contrastText(tokens.colors.accent, tokens), tokens.colors.accent, 4.5),
                fontSize: Math.max(17, tokens.typography.bulletsProseSize),
                textAlign: "left",
                textFit: { policy: "fitFontSize", minFontSize: 12, maxLines: prose.length * 4 },
                verticalAlign: "middle",
                ...bodyTextStyle(tokens)
              }, { autoFit: true })
            ]
          });
        }
      }
    }
  } else if (prose.length > 0) {
    children.push(registerRows(prose, body, tokens));
  }
  children.push(...proseRail(proseAsRail, composition.proseRail, tokens));
  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children
  };
}

// src/typography/autoFit.ts
function normalizeRuns(content) {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  return content;
}
function measureAtScale(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLines) {
  const scaleFactor = fontScale / 1e5;
  const scaledStyle = defaultStyle ? { ...defaultStyle, fontSize: (defaultStyle.fontSize ?? 16) * scaleFactor } : void 0;
  const scaledRuns = runs.map((r) => ({
    ...r,
    style: r.style ? { ...r.style, fontSize: (r.style.fontSize ?? (defaultStyle?.fontSize ?? 16)) * scaleFactor } : void 0
  }));
  const metrics = calculateRichTextMetrics(scaledRuns, scaledStyle, containerWidth);
  return metrics.height <= containerHeight && metrics.maxLineWidth <= containerWidth && (maxLines === void 0 || metrics.lineCount <= maxLines);
}
function metricsAtScale(runs, defaultStyle, fontScale, containerWidth) {
  const scaleFactor = fontScale / 1e5;
  const scaledStyle = defaultStyle ? { ...defaultStyle, fontSize: (defaultStyle.fontSize ?? 16) * scaleFactor } : void 0;
  const scaledRuns = runs.map((r) => ({
    ...r,
    style: r.style ? { ...r.style, fontSize: (r.style.fontSize ?? (defaultStyle?.fontSize ?? 16)) * scaleFactor } : void 0
  }));
  const metrics = calculateRichTextMetrics(scaledRuns, scaledStyle, containerWidth);
  return {
    height: metrics.height,
    lineCount: metrics.lineCount
  };
}
var DEFAULT_MIN_FONT_SCALE = 25e3;
var DEFAULT_MAX_LN_SPC_REDUCTION = 2e4;
var DEFAULT_FONT_SCALE_STEP = 2500;
var DEFAULT_LN_SPC_STEP = 5e3;
function computePolicyAutoFit(content, defaultStyle, containerWidth, containerHeight) {
  const policy = defaultStyle?.textFit?.policy;
  const baseFontSize = defaultStyle?.fontSize ?? 16;
  const minFontSize = defaultStyle?.textFit?.minFontSize;
  const minFontScale = minFontSize === void 0 ? void 0 : Math.max(1e3, Math.min(1e5, Math.round(minFontSize / baseFontSize * 1e5)));
  const widthSafetyFactor = policy === "fitFontSize" ? 0.84 : 1;
  return computeAutoFit(
    content,
    defaultStyle,
    containerWidth * widthSafetyFactor,
    containerHeight,
    {
      ...minFontScale === void 0 ? {} : { minFontScale },
      maxLines: defaultStyle?.textFit?.maxLines
    }
  );
}
function fitsAtAnyLnSpc(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLnSpc, lnSpcStep, maxLines) {
  if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLines)) {
    return true;
  }
  for (let lnSpc = lnSpcStep; lnSpc <= maxLnSpc; lnSpc += lnSpcStep) {
    const adjustedHeight = containerHeight * (1 + lnSpc / 1e5);
    if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, adjustedHeight, maxLines)) {
      return true;
    }
  }
  return false;
}
function findMinLnSpc(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLnSpc, lnSpcStep, maxLines) {
  if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, containerHeight, maxLines)) {
    return 0;
  }
  for (let lnSpc = lnSpcStep; lnSpc <= maxLnSpc; lnSpc += lnSpcStep) {
    const adjustedHeight = containerHeight * (1 + lnSpc / 1e5);
    if (measureAtScale(runs, defaultStyle, fontScale, containerWidth, adjustedHeight, maxLines)) {
      return lnSpc;
    }
  }
  return maxLnSpc;
}
function computeAutoFit(content, defaultStyle, containerWidth, containerHeight, options) {
  const MIN_FONT_SCALE = options?.minFontScale ?? DEFAULT_MIN_FONT_SCALE;
  const MAX_LN_SPC_REDUCTION = options?.maxLnSpcReduction ?? DEFAULT_MAX_LN_SPC_REDUCTION;
  const FONT_SCALE_STEP = options?.fontScaleStep ?? DEFAULT_FONT_SCALE_STEP;
  const LN_SPC_STEP = options?.lnSpcStep ?? DEFAULT_LN_SPC_STEP;
  const maxLines = options?.maxLines;
  const runs = normalizeRuns(content);
  if (measureAtScale(runs, defaultStyle, 1e5, containerWidth, containerHeight, maxLines)) {
    return { fontScale: 1e5, lnSpcReduction: 0, overflow: false, ...metricsAtScale(runs, defaultStyle, 1e5, containerWidth) };
  }
  for (let lnSpc = LN_SPC_STEP; lnSpc <= MAX_LN_SPC_REDUCTION; lnSpc += LN_SPC_STEP) {
    const adjustedHeight = containerHeight * (1 + lnSpc / 1e5);
    if (measureAtScale(runs, defaultStyle, 1e5, containerWidth, adjustedHeight, maxLines)) {
      return { fontScale: 1e5, lnSpcReduction: lnSpc, overflow: false, ...metricsAtScale(runs, defaultStyle, 1e5, containerWidth) };
    }
  }
  if (!fitsAtAnyLnSpc(runs, defaultStyle, MIN_FONT_SCALE, containerWidth, containerHeight, MAX_LN_SPC_REDUCTION, LN_SPC_STEP, maxLines)) {
    return { fontScale: MIN_FONT_SCALE, lnSpcReduction: MAX_LN_SPC_REDUCTION, overflow: true, ...metricsAtScale(runs, defaultStyle, MIN_FONT_SCALE, containerWidth) };
  }
  let lo = MIN_FONT_SCALE;
  let hi = 1e5 - FONT_SCALE_STEP;
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / FONT_SCALE_STEP / 2) * FONT_SCALE_STEP;
    if (fitsAtAnyLnSpc(runs, defaultStyle, mid, containerWidth, containerHeight, MAX_LN_SPC_REDUCTION, LN_SPC_STEP, maxLines)) {
      lo = mid;
    } else {
      hi = mid - FONT_SCALE_STEP;
    }
  }
  const fontScale = lo;
  const lnSpcReduction = findMinLnSpc(runs, defaultStyle, fontScale, containerWidth, containerHeight, MAX_LN_SPC_REDUCTION, LN_SPC_STEP, maxLines);
  return { fontScale, lnSpcReduction, overflow: false, ...metricsAtScale(runs, defaultStyle, fontScale, containerWidth) };
}

// src/interpreter/agent-quality-gates.ts
function childNodes(node) {
  return "children" in node && Array.isArray(node.children) ? node.children : [];
}
function collectNodes(roots, predicate) {
  const matches = [];
  const pending = [...roots];
  while (pending.length > 0) {
    const node = pending.pop();
    if (predicate(node)) matches.push(node);
    pending.push(...childNodes(node));
  }
  return matches;
}
function textRuns(node) {
  if (node.type !== "Text" || node.content === void 0) return [];
  return typeof node.content === "string" ? [{ text: node.content }] : node.content;
}
function nodeText(node) {
  return textRuns(node).map((run) => run.text).join("");
}
function assertAgentCompilationSemantics(source, compiled) {
  source.slides.forEach((slide, slideIndex) => {
    const compiledNodes = collectNodes(compiled.slides[slideIndex]?.children ?? [], () => true);
    const paginationFooters = compiledNodes.filter((node) => node.type === "View" && node.altText === "Agent pagination footer");
    if (slide.pattern === "title") {
      if (paginationFooters.length > 0) {
        throw new PaperError(`Agent title slide ${slideIndex + 1} unexpectedly contains pagination chrome.`, {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "compilation",
          slideIndex,
          remediation: "Keep title slides intentionally sparse and add pagination only to content slides."
        });
      }
    } else {
      const expectedPage = `${String(slideIndex + 1).padStart(2, "0")} / ${String(source.slides.length).padStart(2, "0")}`;
      const hasExpectedPage = paginationFooters.length === 1 && collectNodes(
        paginationFooters,
        (node) => node.type === "Text" && nodeText(node) === expectedPage
      ).length === 1;
      if (!hasExpectedPage) {
        throw new PaperError(`Agent content slide ${slideIndex + 1} is missing deterministic pagination footer "${expectedPage}".`, {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "compilation",
          slideIndex,
          remediation: "Add one professional footer with the deck label and zero-padded current/total slide count."
        });
      }
    }
    const expected = slide.content.chart?.type === "area" ? slide.content.chart.areaGrouping : void 0;
    if (expected !== void 0) {
      const charts = collectNodes(compiled.slides[slideIndex]?.children ?? [], (node) => node.type === "Chart");
      const actual = charts[0]?.type === "Chart" ? charts[0].chartData.areaGrouping : void 0;
      if (actual !== expected) {
        throw new PaperError(
          `Agent area-chart grouping was not preserved on slide ${slideIndex + 1}: expected ${expected}, received ${actual ?? "none"}.`,
          {
            code: "AGENT_INPUT_INVALID",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "chart", "areaGrouping"],
            remediation: "Preserve areaGrouping when converting agent chart input to ChartData."
          }
        );
      }
    }
    const bullets = slide.content.bulletPoints ?? [];
    if (slide.pattern === "bullets" && isTimelineSequence(bullets)) {
      const expectedMilestones = bullets.filter((entry) => parseTimelineEntry(entry) !== void 0).length;
      const actualMilestones = compiledNodes.filter((node) => node.type === "View" && node.altText === "Agent timeline milestone").length;
      if (actualMilestones !== expectedMilestones) {
        throw new PaperError(
          `Agent timeline on slide ${slideIndex + 1} was not composed as a source-ordered runway.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "bulletPoints"],
            remediation: "Render date/month/phase-prefixed bullets as milestones on one chronological runway."
          }
        );
      }
    }
    const explicitComparison = slide.pattern === "comparison" ? slide.content.comparison : void 0;
    const ownership = explicitComparison ? { left: explicitComparison.leftLabel, right: explicitComparison.rightLabel } : slide.pattern === "comparison" ? parseComparisonOwnership(slide.content.subtitle) : void 0;
    const hasRelationalPairs = explicitComparison ? explicitComparison.rows.length > 0 : ownership && bullets.length > 0 && bullets.every((entry) => parseComparisonEntry(entry) !== void 0);
    if (hasRelationalPairs) {
      const ownedFields = compiledNodes.filter((node) => node.type === "View" && node.altText?.startsWith("Agent comparison owned field:"));
      if (ownedFields.length !== 2) {
        throw new PaperError(
          `Agent comparison on slide ${slideIndex + 1} does not expose two owned source fields.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "subtitle"],
            remediation: "Use explicit left/right subtitle clauses and relational source delimiters to build two owned fields."
          }
        );
      }
    }
    if (slide.pattern === "bullets" && !isTimelineSequence(bullets)) {
      for (const entry of bullets) {
        const parts = parseRegisterEntry(entry);
        if (!parts.anchor) continue;
        const entryNode = compiledNodes.find((node) => node.type === "Text" && nodeText(node) === entry);
        const runs = entryNode ? textRuns(entryNode) : [];
        if (runs.length < 2 || runs[0].text !== parts.anchor || runs[0].style?.fontWeight !== "bold") {
          throw new PaperError(
            `Agent register anchor "${parts.anchor}" on slide ${slideIndex + 1} was not promoted verbatim.`,
            {
              code: "AGENT_LAYOUT_VALIDATION_FAILED",
              phase: "compilation",
              slideIndex,
              path: ["slides", String(slideIndex), "content", "bulletPoints"],
              remediation: "Promote compact source prefixes as bold rich-text anchors without rewriting the entry."
            }
          );
        }
      }
    }
    if (slide.pattern === "statement" && (slide.content.prose?.length ?? 0) > 0) {
      const proseNodes = (slide.content.prose ?? []).map((entry) => compiledNodes.find((node) => node.type === "Text" && nodeText(node) === entry));
      if (proseNodes.some((node) => node?.type !== "Text" || (node.style?.fontSize ?? 0) < 18)) {
        throw new PaperError(
          `Agent statement evidence on slide ${slideIndex + 1} is below the 18pt composition floor.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "prose"],
            remediation: "Balance the statement and evidence fields before shrinking supporting prose."
          }
        );
      }
    }
    if (slide.content.chart) {
      const chartNode = compiledNodes.find((node) => node.type === "Chart");
      if (chartNode?.type !== "Chart") {
        throw new PaperError(`Agent chart is missing on slide ${slideIndex + 1}.`, {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "compilation",
          slideIndex
        });
      }
      const chartData = chartNode.chartData;
      const sourceChartTitle = slide.content.chart.title;
      if (sourceChartTitle) {
        const echoesSlideHeading = [slide.content.title, slide.content.subtitle].some((title) => isChartTitleEcho(sourceChartTitle, title));
        if (echoesSlideHeading && chartData.title !== void 0) {
          throw new PaperError(
            `Agent chart title on slide ${slideIndex + 1} repeats the surrounding slide heading.`,
            {
              code: "AGENT_LAYOUT_VALIDATION_FAILED",
              phase: "compilation",
              slideIndex,
              path: ["slides", String(slideIndex), "content", "chart", "title"],
              remediation: "Suppress a chart title that normalizes to the slide title or subtitle; retain distinct evidence titles."
            }
          );
        }
        if (!echoesSlideHeading && chartData.title?.text !== sourceChartTitle) {
          throw new PaperError(
            `Agent chart title on slide ${slideIndex + 1} was lost even though it adds distinct evidence.`,
            {
              code: "AGENT_LAYOUT_VALIDATION_FAILED",
              phase: "compilation",
              slideIndex,
              path: ["slides", String(slideIndex), "content", "chart", "title"],
              remediation: "Preserve chart titles that do not duplicate the slide title or subtitle."
            }
          );
        }
      }
      const labelsAreLegible = (chartData.legend?.fontSize ?? 0) >= 14 && (chartData.categoryAxis?.labelFont?.fontSize ?? 0) >= 14 && (chartData.valueAxis?.labelFont?.fontSize ?? 0) >= 14 && (chartData.dataLabels?.fontSize ?? 0) >= 12;
      const lineHasEvidenceMarkers = chartData.chartType !== "line" || (chartData.marker?.size ?? 0) >= 6;
      if (!labelsAreLegible || !lineHasEvidenceMarkers) {
        throw new PaperError(
          `Agent chart evidence on slide ${slideIndex + 1} uses timid labels or line emphasis.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "chart"],
            remediation: "Use legible legend, axis, and data labels and visible markers for line evidence without changing values."
          }
        );
      }
    }
    for (const kpi of slide.content.kpis ?? []) {
      if (!isQualitativeKpiValue(kpi.value)) continue;
      const valueNode = collectNodes(
        compiled.slides[slideIndex]?.children ?? [],
        (node) => node.type === "Text" && nodeText(node) === kpi.value
      )[0];
      if (valueNode?.type !== "Text" || valueNode.style?.textAlign !== "left" || (valueNode.style?.fontSize ?? 0) < 30 || valueNode.style?.fontWeight !== "bold") {
        throw new PaperError(
          `Qualitative KPI value "${kpi.value}" on slide ${slideIndex + 1} was not composed as a left-aligned statement.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "kpis"],
            remediation: "Render qualitative KPI values as statements and reserve oversized metric typography for numeric values."
          }
        );
      }
    }
    if (slide.pattern === "dashboard" && !slide.content.chart && (slide.content.kpis?.length ?? 0) >= 2) {
      const [primaryKpi, supportingKpi] = slide.content.kpis ?? [];
      const primaryField = compiledNodes.find((node) => node.type === "View" && childNodes(node).some((child) => child.type === "Text" && nodeText(child) === primaryKpi?.label));
      const supportingField = compiledNodes.find((node) => node.type === "View" && childNodes(node).some((child) => child.type === "Text" && nodeText(child) === supportingKpi?.label));
      const primaryValue = compiledNodes.find((node) => node.type === "Text" && nodeText(node) === primaryKpi?.value);
      const hasStructuredSublabelBand = !primaryKpi?.sublabel || primaryField?.type === "View" && childNodes(primaryField).some((node) => node.type === "View" && node.altText === "Agent primary metric sublabel band");
      if (primaryField?.type !== "View" || supportingField?.type !== "View" || typeof primaryField.style?.width !== "number" || typeof supportingField.style?.width !== "number" || primaryField.style.width >= supportingField.style.width || !hasStructuredSublabelBand || primaryValue?.type !== "Text" || (primaryValue.style?.fontSize ?? 0) < (primaryKpi && primaryKpi.value.length <= 14 ? 78 : 48)) {
        throw new PaperError(
          `Agent dashboard on slide ${slideIndex + 1} lacks a decisive primary metric field.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "kpis"],
            remediation: "Use a compact lead field with oversized primary evidence and a wider supporting register."
          }
        );
      }
    }
  });
}
function bottomEdge(node) {
  return node.layout.y + node.layout.height;
}
function isRegisterRow(node) {
  return node.type === "View" && (node.altText === "Agent register row" || (node.children ?? []).some((child) => child.type === "Text" && typeof child.content === "string" && /^\d{2}$/u.test(child.content)));
}
function isTimelineMilestone(node) {
  return node.type === "View" && node.altText === "Agent timeline milestone";
}
function containsText(node) {
  return collectNodes(node.children ?? [], (child) => child.type === "Text").length > 0;
}
function assertRegisterContainment(rows) {
  const tolerance = 1.5;
  for (const row of rows) {
    const rowRight = row.layout.x + row.layout.width;
    const rowBottom = row.layout.y + row.layout.height;
    for (const child of collectNodes(row.children ?? [], () => true)) {
      if (child.layout.x < row.layout.x - tolerance || child.layout.y < row.layout.y - tolerance || child.layout.x + child.layout.width > rowRight + tolerance || child.layout.y + child.layout.height > rowBottom + tolerance) {
        throw new PaperError(
          "Agent register content exceeds its assigned row and may clip or overlap adjacent rows.",
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "layout",
            remediation: "Recompute register row height and text fit from the available content field."
          }
        );
      }
    }
  }
}
function assertNoRepeatedEqualPanels(pattern, nodes, slideWidth, slideHeight) {
  if (pattern !== "dashboard" && pattern !== "comparison" && pattern !== "bullets") return;
  const panels = nodes.filter((node) => node.type === "View" && containsText(node) && (node.style?.fill !== void 0 || node.style?.backgroundColor !== void 0 || node.style?.borderWidth !== void 0) && node.layout.width * node.layout.height >= slideWidth * slideHeight * 0.06);
  const groups = /* @__PURE__ */ new Map();
  for (const panel of panels) {
    const key = `${Math.round(panel.layout.width / 4)}:${Math.round(panel.layout.height / 4)}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  if ([...groups.values()].some((count) => count >= 4)) {
    throw new PaperError(
      `Agent ${pattern} recipe repeats four or more equal-weight decorated panels.`,
      {
        code: "AGENT_LAYOUT_VALIDATION_FAILED",
        phase: "layout",
        remediation: "Promote one source-supported protagonist and use a flat supporting register instead of a card grid."
      }
    );
  }
}
function assertChartFieldUtilization(pattern, nodes, slideWidth, slideHeight) {
  if (pattern !== "chart-focus" && pattern !== "dashboard") return;
  const charts = nodes.filter((node) => node.type === "Chart");
  for (const chart of charts) {
    const supportingRegister = nodes.some((node) => node.type === "View" && node.layout.y >= chart.layout.y - 1 && node.layout.height >= chart.layout.height * 0.8 && containsText(node));
    const minimumWidthRatio = supportingRegister ? 0.58 : 0.8;
    if (chart.layout.width < slideWidth * minimumWidthRatio || chart.layout.height < slideHeight * 0.65 || bottomEdge(chart) < slideHeight * 0.82) {
      throw new PaperError(
        `Agent ${pattern} chart occupies a timid visual field (${Math.round(chart.layout.width)}\xD7${Math.round(chart.layout.height)}px).`,
        {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "layout",
          remediation: "Expand the chart through the usable content width and lower canvas; reserve a rail only for source KPIs."
        }
      );
    }
  }
}
function assertOwnedComparisonFields(pattern, nodes, slideWidth) {
  if (pattern !== "comparison") return;
  const fields = nodes.filter((node) => node.type === "View" && node.altText?.startsWith("Agent comparison owned field:"));
  if (fields.length === 0) return;
  if (fields.length !== 2 || fields.some((field) => field.layout.width < slideWidth * 0.38) || Math.abs(fields[0].layout.height - fields[1].layout.height) > 1) {
    throw new PaperError("Agent relational comparison does not maintain two full owned fields.", {
      code: "AGENT_LAYOUT_VALIDATION_FAILED",
      phase: "layout",
      remediation: "Give both source-owned comparison sides a substantial, aligned field."
    });
  }
}
function assertSharedRegisterGrid(pattern, rows) {
  if (pattern !== "bullets" || rows.length < 5) return;
  const columns = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = Math.round(row.layout.x);
    const column = columns.get(key) ?? [];
    column.push(row);
    columns.set(key, column);
  }
  if (columns.size < 2) return;
  const orderedColumns = [...columns.values()].map((column) => column.sort((left, right) => left.layout.y - right.layout.y));
  const [first, ...rest] = orderedColumns;
  for (const column of rest) {
    const sharedCount = Math.min(first.length, column.length);
    for (let index = 0; index < sharedCount; index += 1) {
      if (Math.abs(first[index].layout.y - column[index].layout.y) > 1 || Math.abs(first[index].layout.height - column[index].layout.height) > 1) {
        throw new PaperError("Agent bullet columns do not share one measured row grid.", {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "layout",
          remediation: "Plan row demand across both columns and reuse the same row boundaries."
        });
      }
    }
  }
}
function assertIntentionalWhitespaceAnchor(pattern, nodes, slideWidth, slideHeight) {
  if (pattern !== "title" && pattern !== "statement") return;
  const expectedAltText = pattern === "title" ? "Agent title editorial field" : ["Agent statement evidence field", "Agent statement full-height anchor"];
  const anchors = nodes.filter((node) => node.type === "View" && (Array.isArray(expectedAltText) ? expectedAltText.includes(node.altText ?? "") : node.altText === expectedAltText));
  if (anchors.some((node) => node.layout.width >= slideWidth * 0.12 && node.layout.height >= slideHeight * 0.65 && bottomEdge(node) >= slideHeight * 0.82)) return;
  throw new PaperError(`Agent ${pattern} whitespace lacks a deliberate full-height anchor.`, {
    code: "AGENT_LAYOUT_VALIDATION_FAILED",
    phase: "layout",
    remediation: "Anchor intentional whitespace with a substantial source-appropriate field."
  });
}
function assertAgentRecipeLayoutUtilization(slide, slideHeight) {
  const pattern = slide.type === "Slide" ? slide.agentPattern : void 0;
  const nodes = collectNodes(slide.children ?? [], () => true);
  const slideWidth = slide.layout.width;
  assertNoRepeatedEqualPanels(pattern, nodes, slideWidth, slideHeight);
  assertChartFieldUtilization(pattern, nodes, slideWidth, slideHeight);
  assertOwnedComparisonFields(pattern, nodes, slideWidth);
  const registerRows2 = nodes.filter(isRegisterRow);
  const timelineMilestones = nodes.filter(isTimelineMilestone);
  assertSharedRegisterGrid(pattern, registerRows2);
  assertIntentionalWhitespaceAnchor(pattern, nodes, slideWidth, slideHeight);
  if (pattern === "bullets" || pattern === "dashboard") {
    const contentNodes = pattern === "bullets" ? [...registerRows2, ...timelineMilestones, ...nodes.filter((node) => node.type === "View" && node.altText === "Agent timeline support rail")] : nodes.filter((node) => node.type === "Chart" || node.type === "View" && (node.style?.fill !== void 0 || node.style?.backgroundColor !== void 0 || node.style?.borderWidth !== void 0));
    if (contentNodes.length > 0) {
      const usedBottom = Math.max(...contentNodes.map(bottomEdge));
      const minimumBottom = slideHeight * (pattern === "dashboard" ? 0.65 : 0.72);
      if (usedBottom + 0.5 < minimumBottom) {
        throw new PaperError(
          `Agent ${pattern} recipe clusters content in the top band (${Math.round(usedBottom)}px of ${Math.round(slideHeight)}px used).`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "layout",
            remediation: "Expand or distribute the recipe content through the lower canvas."
          }
        );
      }
    }
  }
  assertRegisterContainment([...registerRows2, ...timelineMilestones]);
}

// src/typography/breakAnywhere.ts
var ZERO_WIDTH_SPACE = "\u200B";
function splitGraphemes(text) {
  return Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text),
    (entry) => entry.segment
  );
}
function segmentWidth(text, style) {
  return calculateRichTextMetrics([{ text }], style).maxLineWidth;
}
function hasUnbreakableTextSegment(text, style, maxWidth) {
  if (maxWidth <= 0) return text.length > 0;
  const containsUrl = /(?:https?:\/\/|www\.)/iu.test(text);
  return uax14Segment(text).some(({ text: segment }) => !/^\s*$/u.test(segment) && (splitGraphemes(segment).length >= 300 || containsUrl) && segmentWidth(segment, style) > maxWidth);
}
function applyBreakAnywhereFallback(text, style, maxWidth) {
  if (maxWidth <= 0) return text;
  return uax14Segment(text).map(({ text: segment }) => {
    if (/^\s*$/u.test(segment) || segmentWidth(segment, style) <= maxWidth) {
      return segment;
    }
    return splitGraphemes(segment).join(ZERO_WIDTH_SPACE);
  }).join("");
}

export {
  AgentThemePresetSchema,
  DesignTokensSchema,
  DEFAULT_AGENT_DESIGN_TOKENS,
  getAgentThemePresetTokens,
  resolveAgentDesignTokens,
  parseComparisonOwnership,
  parseComparisonEntry,
  buildAgentPaginationFooter,
  agentChartToChartData,
  buildTitleLayout,
  buildStatementLayout,
  buildDashboardLayout,
  buildComparisonLayout,
  buildChartFocusLayout,
  buildBulletsLayout,
  computePolicyAutoFit,
  computeAutoFit,
  splitGraphemes,
  hasUnbreakableTextSegment,
  applyBreakAnywhereFallback,
  assertAgentCompilationSemantics,
  assertAgentRecipeLayoutUtilization
};
//# sourceMappingURL=chunk-AIRKBIKH.js.map
