import { z } from "zod";
import { DEFAULT_SLIDE_WIDTH_PX } from "../ooxml/constants.js";
import { getLogger } from "../logger.js";

const HexColorSchema = z.string().regex(
  /^#[0-9A-Fa-f]{6}$/,
  "Must be a 6-digit hex color (e.g., '#2563EB')",
);

const PositiveNumberSchema = z.number().positive();
const FontFamilySchema = z.string().min(1).max(128);
const SAFE_FONT_FAMILY_SCHEMA = z.enum([
  "portable",
  "system",
  "user-embedded",
  // Backward-compatible published names. They are normalized with a warning.
  "embedded",
  "system-safe",
  "named-with-fallback",
]);
const AGENT_SCALE_SCHEMA = z.enum(["sm", "md", "lg", "xl"]);
const AGENT_DENSITY_SCHEMA = z.enum(["compact", "balanced", "spacious"]);
const AGENT_SHAPE_SCHEMA = z.enum(["sharp", "soft", "round"]);

type RawResolvedAgentDesignTokens = Omit<ResolvedAgentDesignTokens, "semantic">;

export const AgentThemePresetSchema = z.enum([
  "default-navy",
  "editorial-serif",
  "monochrome",
  "dark-punch",
  "midnight",
  "terminal",
  "editorial-wide",
]);

export const AgentColorTokensSchema = z.object({
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
  chartPalette: z.array(HexColorSchema).min(1).max(6).describe("Chart series palette in priority order."),
}).strict().partial();

export const AgentTypographyTokensSchema = z.object({
  fontStrategy: SAFE_FONT_FAMILY_SCHEMA.describe(
    "Font handling mode: portable open assets, explicit nonportable system fonts, or caller-supplied embedded fonts.",
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
  chartPieDataLabelSize: PositiveNumberSchema.describe("Pie/doughnut data-label size."),
}).strict().partial();

export const AgentLayoutTokensSchema = z.object({
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
  proseOffsetAfterBullets: PositiveNumberSchema.describe("Vertical offset applied before prose after a bullet block."),
}).strict().partial();

export const AgentEffectTokensSchema = z.object({
  titleGradientAngle: PositiveNumberSchema.max(360).describe("Angle for the title-slide background gradient."),
  kpiGradientAngle: PositiveNumberSchema.max(360).describe("Angle for gradient KPI cards."),
  kpiGradientDarkenPercent: PositiveNumberSchema.max(100).describe("Darkening strength for gradient KPI cards."),
  kpiGradientLabelLightenPercent: PositiveNumberSchema.max(100).describe("Lightening strength for the gradient KPI label color."),
  kpiGradientSublabelLightenPercent: PositiveNumberSchema.max(100).describe("Lightening strength for the gradient KPI sublabel color."),
  kpiShapeAdjustment: PositiveNumberSchema.describe("Round-rectangle adjustment for KPI cards."),
  outlineBorderWidth: PositiveNumberSchema.describe("Border width for outline KPI cards."),
  chartBarGapWidth: PositiveNumberSchema.describe("Gap width used for bar charts."),
  chartDoughnutHoleSize: PositiveNumberSchema.max(90).describe("Hole size for doughnut charts."),
}).strict().partial();

export const DesignTokensSchema = z.object({
  scale: AGENT_SCALE_SCHEMA.optional(),
  density: AGENT_DENSITY_SCHEMA.optional(),
  shape: AGENT_SHAPE_SCHEMA.optional(),
  colors: AgentColorTokensSchema.optional(),
  typography: AgentTypographyTokensSchema.optional(),
  layout: AgentLayoutTokensSchema.optional(),
  effects: AgentEffectTokensSchema.optional(),
}).strict().partial();

export type AgentThemePreset = z.infer<typeof AgentThemePresetSchema>;
export type AgentDesignTokens = z.infer<typeof DesignTokensSchema>;
export type AgentFontStrategy = z.infer<typeof SAFE_FONT_FAMILY_SCHEMA>;
export type AgentScale = z.infer<typeof AGENT_SCALE_SCHEMA>;
export type AgentDensity = z.infer<typeof AGENT_DENSITY_SCHEMA>;
export type AgentShape = z.infer<typeof AGENT_SHAPE_SCHEMA>;

export interface ResolvedAgentDesignTokens {
  controls: {
    scale: AgentScale;
    density: AgentDensity;
    shape: AgentShape;
  };
  colors: {
    accent: string;
    themeDark1: string;
    themeDark2: string;
    themeLight1: string;
    themeLight2: string;
    slideBackground: string;
    titleBackgroundStart: string;
    titleBackgroundEnd: string;
    titleText: string;
    titleSubtitleText: string;
    headingText: string;
    bodyText: string;
    mutedText: string;
    cardBackground: string;
    darkCardBackground: string;
    darkCardText: string;
    darkCardMutedText: string;
    cardBorder: string;
    chartPalette: string[];
  };
  typography: {
    fontStrategy: AgentFontStrategy;
    titleFontFamily: string;
    titleFontFallback: string[];
    bodyFontFamily: string;
    bodyFontFallback: string[];
    heroTitleSize: number;
    heroSubtitleSize: number;
    headerSize: number;
    subheaderSize: number;
    footerSize: number;
    sectionTitleSize: number;
    sectionSubtitleSize: number;
    statementBodySize: number;
    bulletListSize: number;
    bulletsProseSize: number;
    comparisonBodySize: number;
    kpiGradientLabelSize: number;
    kpiLabelSize: number;
    kpiValueSize: number;
    kpiSublabelSize: number;
    chartTitleSize: number;
    chartLegendSize: number;
    chartDataLabelSize: number;
    chartPieDataLabelSize: number;
  };
  layout: {
    accentBarHeight: number;
    paddingX: number;
    paddingTop: number;
    paddingBottom: number;
    headerTop: number;
    subheaderTop: number;
    footerBottom: number;
    headerLeft: number;
    contentWidth: number;
    titlePaddingX: number;
    titlePaddingTop: number;
    titlePaddingBottom: number;
    contentPaddingX: number;
    contentPaddingTop: number;
    contentPaddingBottom: number;
    titleDividerWidth: number;
    titleDividerHeight: number;
    titleDividerMarginTop: number;
    titleDividerMarginBottom: number;
    sectionDividerWidth: number;
    sectionDividerHeight: number;
    sectionDividerMarginTop: number;
    sectionDividerMarginBottom: number;
    statementParagraphGap: number;
    bodyTopWithSubtitle: number;
    bodyTopWithoutSubtitle: number;
    bodyHeight: number;
    chartHeight: number;
    dashboardGap: number;
    comparisonGap: number;
    comparisonColumnWidth: number;
    comparisonColumnGap: number;
    kpiCardHeight: number;
    kpiCardPadding: number;
    dashboardKpiPanelWidthWithChart: number;
    dashboardPanelWidthFull: number;
    dashboardChartWidthWithKpis: number;
    chartFocusSidebarWidth: number;
    chartFocusSidebarLeft: number;
    chartFocusChartWidthWithSidebar: number;
    chartFocusChartWidthFull: number;
    bulletsBottomMargin: number;
    bulletsHeightWithProse: number;
    proseOffsetAfterBullets: number;
  };
  effects: {
    titleGradientAngle: number;
    kpiGradientAngle: number;
    kpiGradientDarkenPercent: number;
    kpiGradientLabelLightenPercent: number;
    kpiGradientSublabelLightenPercent: number;
    cardDropShadow?: {
      color: string;
      offsetX: number;
      offsetY: number;
      blurRadius: number;
      opacity?: number;
    };
    kpiShapeAdjustment: number;
    outlineBorderWidth: number;
    chartBarGapWidth: number;
    chartDoughnutHoleSize: number;
  };
  semantic: {
    pagePaddingX: number;
    pagePaddingTop: number;
    pagePaddingBottom: number;
    titlePaddingX: number;
    titlePaddingTop: number;
    titlePaddingBottom: number;
    contentLeft: number;
    contentWidth: number;
    contentRight: number;
    contentPaddingTop: number;
    contentPaddingBottom: number;
    bodyTopWithSubtitle: number;
    bodyTopWithoutSubtitle: number;
    dashboardChartLeftWithKpis: number;
    chartFocusSidebarLeft: number;
    cardShapeType: "rect" | "roundRect";
    cardShapeAdjustment?: number;
  };
}

const DEFAULT_FONT_STRATEGY: AgentFontStrategy = "portable";
const DEFAULT_SCALE: AgentScale = "lg";
const DEFAULT_DENSITY: AgentDensity = "balanced";
const DEFAULT_SHAPE: AgentShape = "soft";
const SYSTEM_SAFE_FONT_FAMILY = "Liberation Sans";
const SAFE_FONT_CASCADE = [
  SYSTEM_SAFE_FONT_FAMILY,
  "Carlito",
  "Source Sans 3",
] as const;

const SCALE_MULTIPLIERS: Record<AgentScale, number> = {
  sm: 0.88,
  md: 0.94,
  lg: 1,
  xl: 1.08,
};

const DENSITY_MULTIPLIERS: Record<AgentDensity, number> = {
  compact: 0.9,
  balanced: 1,
  spacious: 1.12,
};

const SCALE_TYPOGRAPHY_KEYS = [
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
  "chartPieDataLabelSize",
] as const;

const SCALE_LAYOUT_KEYS = [
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
  "sectionDividerHeight",
] as const;

const DENSITY_LAYOUT_KEYS = [
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
  "comparisonColumnWidth",
] as const;

const COUPLED_ROUND_RECT_ADJUSTMENT: Record<AgentShape, number> = {
  sharp: 0,
  soft: 3000,
  round: 7000,
};

const BASE_AGENT_DESIGN_TOKENS: RawResolvedAgentDesignTokens = {
  controls: {
    scale: DEFAULT_SCALE,
    density: DEFAULT_DENSITY,
    shape: DEFAULT_SHAPE,
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
    chartPalette: ["#2563EB", "#059669", "#7C3AED", "#EA580C", "#DC2626", "#0891B2"],
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
    chartPieDataLabelSize: 9,
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
    proseOffsetAfterBullets: 235,
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
    chartDoughnutHoleSize: 55,
  },
};

const AGENT_THEME_PRESET_OVERRIDES: Record<AgentThemePreset, AgentDesignTokens> = {
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
      chartPalette: ["#C4493A", "#3E6B6A", "#8C5E3C", "#A2742F", "#6E4B7D", "#2F4858"],
    },
    typography: {
      titleFontFamily: "Gelasio",
      bodyFontFamily: "Gelasio",
      heroTitleSize: 42,
      heroSubtitleSize: 20,
      headerSize: 24,
      sectionTitleSize: 30,
      chartTitleSize: 14,
    },
    layout: {
      accentBarHeight: 6,
      titlePaddingX: 92,
      titlePaddingTop: 112,
      contentPaddingX: 72,
      contentPaddingTop: 72,
      titleDividerWidth: 88,
      sectionDividerWidth: 72,
    },
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
      chartPalette: ["#111827", "#9CA3AF", "#4B5563", "#D1D5DB", "#6B7280", "#374151"],
    },
    typography: {
      titleFontFamily: "Carlito",
      bodyFontFamily: "Carlito",
      heroTitleSize: 36,
      sectionTitleSize: 26,
    },
    layout: {
      accentBarHeight: 3,
      titleDividerWidth: 48,
      sectionDividerWidth: 48,
    },
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
      chartPalette: ["#FF6B35", "#06B6D4", "#F59E0B", "#E11D48", "#8B5CF6", "#22C55E"],
    },
    typography: {
      titleFontFamily: "Source Sans 3",
      bodyFontFamily: "Source Sans 3",
      heroTitleSize: 40,
      sectionTitleSize: 30,
      kpiValueSize: 26,
      chartTitleSize: 14,
    },
    layout: {
      accentBarHeight: 8,
      titlePaddingX: 72,
      titlePaddingTop: 108,
      titleDividerWidth: 96,
      sectionDividerWidth: 84,
    },
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
      chartPalette: ["#5EEAD4", "#0EA5E9", "#22D3EE", "#38BDF8", "#7DD3FC", "#A5F3FC"],
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
      chartPieDataLabelSize: 10,
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
      proseOffsetAfterBullets: 248,
    },
    effects: {
      titleGradientAngle: 148,
      kpiGradientAngle: 135,
      kpiGradientDarkenPercent: 36,
      kpiGradientLabelLightenPercent: 48,
      kpiGradientSublabelLightenPercent: 34,
      outlineBorderWidth: 1,
      chartBarGapWidth: 56,
      chartDoughnutHoleSize: 58,
    },
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
      chartPalette: ["#5EEAD4", "#67E8F9", "#A3E635", "#FDE047", "#F59E0B", "#38BDF8"],
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
      chartPieDataLabelSize: 10,
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
      proseOffsetAfterBullets: 240,
    },
    effects: {
      titleGradientAngle: 180,
      kpiGradientAngle: 180,
      kpiGradientDarkenPercent: 18,
      kpiGradientLabelLightenPercent: 42,
      kpiGradientSublabelLightenPercent: 30,
      outlineBorderWidth: 1,
      chartBarGapWidth: 64,
      chartDoughnutHoleSize: 52,
    },
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
      chartPalette: ["#C86B36", "#58727B", "#A84A3E", "#BC9343", "#4A6A55", "#865D8F"],
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
      chartPieDataLabelSize: 10,
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
      proseOffsetAfterBullets: 250,
    },
    effects: {
      titleGradientAngle: 164,
      kpiGradientAngle: 145,
      kpiGradientDarkenPercent: 22,
      kpiGradientLabelLightenPercent: 44,
      kpiGradientSublabelLightenPercent: 34,
      outlineBorderWidth: 1,
      chartBarGapWidth: 60,
      chartDoughnutHoleSize: 56,
    },
  },
};

function applyPresetRuntimeEffects(
  preset: AgentThemePreset,
  tokens: RawResolvedAgentDesignTokens,
): RawResolvedAgentDesignTokens {
  if (preset !== "midnight") {
    return tokens;
  }

  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.effects.cardDropShadow = {
    color: "#020617",
    offsetX: 0,
    offsetY: 14,
    blurRadius: 28,
    opacity: 0.28,
  };
  return next;
}

function scaleNumber(value: number, factor: number, minimum: number = 1): number {
  return Math.max(minimum, Math.round(value * factor));
}

function cloneRawResolvedAgentDesignTokens(tokens: RawResolvedAgentDesignTokens): RawResolvedAgentDesignTokens {
  return {
    controls: { ...tokens.controls },
    colors: {
      ...tokens.colors,
      chartPalette: [...tokens.colors.chartPalette],
    },
    typography: {
      ...tokens.typography,
      titleFontFallback: [...tokens.typography.titleFontFallback],
      bodyFontFallback: [...tokens.typography.bodyFontFallback],
    },
    layout: { ...tokens.layout },
    effects: {
      ...tokens.effects,
      ...(tokens.effects.cardDropShadow
        ? { cardDropShadow: { ...tokens.effects.cardDropShadow } }
        : {}),
    },
  };
}

function cloneResolvedAgentDesignTokens(tokens: ResolvedAgentDesignTokens): ResolvedAgentDesignTokens {
  return {
    controls: { ...tokens.controls },
    colors: {
      ...tokens.colors,
      chartPalette: [...tokens.colors.chartPalette],
    },
    typography: {
      ...tokens.typography,
      titleFontFallback: [...tokens.typography.titleFontFallback],
      bodyFontFallback: [...tokens.typography.bodyFontFallback],
    },
    layout: { ...tokens.layout },
    effects: {
      ...tokens.effects,
      ...(tokens.effects.cardDropShadow
        ? { cardDropShadow: { ...tokens.effects.cardDropShadow } }
        : {}),
    },
    semantic: { ...tokens.semantic },
  };
}

function mergeRawResolvedAgentDesignTokens(
  base: RawResolvedAgentDesignTokens,
  override?: AgentDesignTokens,
): RawResolvedAgentDesignTokens {
  if (!override) {
    return cloneRawResolvedAgentDesignTokens(base);
  }

  return {
    controls: {
      scale: override.scale ?? base.controls.scale,
      density: override.density ?? base.controls.density,
      shape: override.shape ?? base.controls.shape,
    },
    colors: {
      ...base.colors,
      ...(override.colors ?? {}),
      ...(override.colors?.chartPalette
        ? { chartPalette: [...override.colors.chartPalette] }
        : {}),
    },
    typography: {
      ...base.typography,
      ...(override.typography ?? {}),
    },
    layout: {
      ...base.layout,
      ...(override.layout ?? {}),
    },
    effects: {
      ...base.effects,
      ...(override.effects ?? {}),
    },
  };
}

function uniqueFontFallbacks(fontFamilies: readonly string[], primaryFamily: string): string[] {
  return [...new Set(fontFamilies.filter((fontFamily) => fontFamily !== primaryFamily))];
}

function applyGlobalLayoutFallbacks(
  tokens: RawResolvedAgentDesignTokens,
  layoutOverride?: AgentDesignTokens["layout"],
): RawResolvedAgentDesignTokens {
  const next = cloneRawResolvedAgentDesignTokens(tokens);

  if (layoutOverride?.paddingX !== undefined) {
    if (layoutOverride.titlePaddingX === undefined) {
      next.layout.titlePaddingX = layoutOverride.paddingX;
    }
    if (layoutOverride.contentPaddingX === undefined) {
      next.layout.contentPaddingX = layoutOverride.paddingX;
    }
  }

  if (layoutOverride?.paddingTop !== undefined) {
    if (layoutOverride.titlePaddingTop === undefined) {
      next.layout.titlePaddingTop = layoutOverride.paddingTop;
    }
    if (layoutOverride.contentPaddingTop === undefined) {
      next.layout.contentPaddingTop = layoutOverride.paddingTop;
    }
  }

  if (layoutOverride?.paddingBottom !== undefined) {
    if (layoutOverride.titlePaddingBottom === undefined) {
      next.layout.titlePaddingBottom = layoutOverride.paddingBottom;
    }
    if (layoutOverride.contentPaddingBottom === undefined) {
      next.layout.contentPaddingBottom = layoutOverride.paddingBottom;
    }
  }

  return next;
}

function applyScale(tokens: RawResolvedAgentDesignTokens, scale: AgentScale): RawResolvedAgentDesignTokens {
  if (scale === DEFAULT_SCALE) {
    return {
      ...cloneRawResolvedAgentDesignTokens(tokens),
      controls: { ...tokens.controls, scale },
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

function applyDensity(tokens: RawResolvedAgentDesignTokens, density: AgentDensity): RawResolvedAgentDesignTokens {
  if (density === DEFAULT_DENSITY) {
    return {
      ...cloneRawResolvedAgentDesignTokens(tokens),
      controls: { ...tokens.controls, density },
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

function applyShape(tokens: RawResolvedAgentDesignTokens, shape: AgentShape): RawResolvedAgentDesignTokens {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.controls.shape = shape;
  next.effects.kpiShapeAdjustment = COUPLED_ROUND_RECT_ADJUSTMENT[shape];
  return next;
}

function applyCoupledControls(tokens: RawResolvedAgentDesignTokens): RawResolvedAgentDesignTokens {
  let next = applyScale(tokens, tokens.controls.scale);
  next = applyDensity(next, next.controls.density);
  next = applyShape(next, next.controls.shape);
  return next;
}

function applyFontStrategy(
  tokens: RawResolvedAgentDesignTokens,
  {
    preserveBodyFamily = false,
    preserveTitleFamily = false,
    strategy = DEFAULT_FONT_STRATEGY,
  }: {
    preserveBodyFamily?: boolean;
    preserveTitleFamily?: boolean;
    strategy?: AgentFontStrategy;
  } = {},
): RawResolvedAgentDesignTokens {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  let normalizedStrategy: AgentFontStrategy = strategy;
  if (strategy === "named-with-fallback" || strategy === "system-safe") {
    normalizedStrategy = "portable";
    getLogger().warn(
      `[design-tokens] fontStrategy="${strategy}" is deprecated; using portable semantics (admitted open fonts plus embedding).`,
    );
  } else if (strategy === "embedded") {
    normalizedStrategy = "user-embedded";
    getLogger().warn(
      '[design-tokens] fontStrategy="embedded" is deprecated; using user-embedded semantics. Supply matching PaperDocument.embeddedFonts.',
    );
  }
  const titleFontFamily = strategy === "system-safe" && !preserveTitleFamily
    ? SYSTEM_SAFE_FONT_FAMILY
    : next.typography.titleFontFamily;
  const bodyFontFamily = strategy === "system-safe" && !preserveBodyFamily
    ? SYSTEM_SAFE_FONT_FAMILY
    : next.typography.bodyFontFamily;
  const hasPortableFallbacks = normalizedStrategy === "portable";

  next.typography = {
    ...next.typography,
    fontStrategy: normalizedStrategy,
    titleFontFamily,
    titleFontFallback: hasPortableFallbacks
      ? uniqueFontFallbacks(SAFE_FONT_CASCADE, titleFontFamily)
      : [],
    bodyFontFamily,
    bodyFontFallback: hasPortableFallbacks
      ? uniqueFontFallbacks(SAFE_FONT_CASCADE, bodyFontFamily)
      : [],
  };

  return next;
}

function withAccentColor(
  tokens: RawResolvedAgentDesignTokens,
  accentColor: string,
): RawResolvedAgentDesignTokens {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.colors = {
    ...next.colors,
    accent: accentColor,
    chartPalette: [
      accentColor,
      ...next.colors.chartPalette.slice(1),
    ],
  };
  return next;
}

function withFontFamily(
  tokens: RawResolvedAgentDesignTokens,
  fontFamily: string,
): RawResolvedAgentDesignTokens {
  const next = cloneRawResolvedAgentDesignTokens(tokens);
  next.typography = {
    ...next.typography,
    titleFontFamily: fontFamily,
    bodyFontFamily: fontFamily,
  };
  return next;
}

function finalizeResolvedAgentDesignTokens(tokens: RawResolvedAgentDesignTokens): ResolvedAgentDesignTokens {
  const contentLeft = tokens.layout.contentPaddingX;
  const contentRight = DEFAULT_SLIDE_WIDTH_PX - tokens.layout.paddingX;
  const contentWidth = Math.max(0, contentRight - contentLeft);
  const bodyTopWithSubtitle = Math.max(tokens.layout.bodyTopWithSubtitle, tokens.layout.contentPaddingTop);
  const bodyTopWithoutSubtitle = Math.max(tokens.layout.bodyTopWithoutSubtitle, tokens.layout.contentPaddingTop);
  const cardShapeType = tokens.controls.shape === "sharp" ? "rect" : "roundRect";
  const cardShapeAdjustment = cardShapeType === "roundRect"
    ? tokens.effects.kpiShapeAdjustment
    : undefined;
  const dashboardChartLeftWithKpis =
    contentLeft + tokens.layout.dashboardKpiPanelWidthWithChart + tokens.layout.dashboardGap;
  const computedChartFocusSidebarLeft =
    contentLeft + tokens.layout.chartFocusChartWidthWithSidebar + tokens.layout.comparisonColumnGap;

  return {
    controls: { ...tokens.controls },
    colors: {
      ...tokens.colors,
      chartPalette: [...tokens.colors.chartPalette],
    },
    typography: {
      ...tokens.typography,
      titleFontFallback: [...tokens.typography.titleFontFallback],
      bodyFontFallback: [...tokens.typography.bodyFontFallback],
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
      ...(cardShapeAdjustment !== undefined ? { cardShapeAdjustment } : {}),
    },
  };
}

function getThemePresetBaseTokens(
  preset: AgentThemePreset = "default-navy",
): RawResolvedAgentDesignTokens {
  return applyPresetRuntimeEffects(
    preset,
    mergeRawResolvedAgentDesignTokens(BASE_AGENT_DESIGN_TOKENS, AGENT_THEME_PRESET_OVERRIDES[preset]),
  );
}

export const DEFAULT_AGENT_DESIGN_TOKENS: ResolvedAgentDesignTokens = finalizeResolvedAgentDesignTokens(
  applyFontStrategy(
    applyCoupledControls(getThemePresetBaseTokens("default-navy")),
    {
      strategy: DEFAULT_FONT_STRATEGY,
      preserveTitleFamily: true,
      preserveBodyFamily: true,
    },
  ),
);

export function getAgentThemePresetTokens(
  preset: AgentThemePreset = "default-navy",
): ResolvedAgentDesignTokens {
  return finalizeResolvedAgentDesignTokens(
    applyFontStrategy(
      applyCoupledControls(getThemePresetBaseTokens(preset)),
      {
        strategy: DEFAULT_FONT_STRATEGY,
        preserveTitleFamily: true,
        preserveBodyFamily: true,
      },
    ),
  );
}

function warnAtomicOverridesDefeatCoupling(designTokens: AgentDesignTokens | undefined): void {
  if (!designTokens) return;

  const scaleIsExplicit = designTokens.scale !== undefined && designTokens.scale !== DEFAULT_SCALE;
  const densityIsExplicit = designTokens.density !== undefined && designTokens.density !== DEFAULT_DENSITY;

  const typography = designTokens.typography as Record<string, unknown> | undefined;
  const layout = designTokens.layout as Record<string, unknown> | undefined;

  if (scaleIsExplicit && typography) {
    const overriddenTypography: string[] = [];
    for (const key of SCALE_TYPOGRAPHY_KEYS) {
      if (typography[key] !== undefined) overriddenTypography.push(key);
    }
    if (overriddenTypography.length > 0) {
      getLogger().warn(
        `[design-tokens] scale="${designTokens.scale}" is set, but typography overrides defeat the multiplier on: ${overriddenTypography.join(", ")}. Either keep the override and drop scale, or remove the override to let scale proportion the token.`,
      );
    }
  }

  if (scaleIsExplicit && layout) {
    const overridden: string[] = [];
    for (const key of SCALE_LAYOUT_KEYS) {
      if (layout[key] !== undefined) overridden.push(key);
    }
    if (overridden.length > 0) {
      getLogger().warn(
        `[design-tokens] scale="${designTokens.scale}" is set, but layout overrides defeat the multiplier on: ${overridden.join(", ")}. Either keep the override and drop scale, or remove the override to let scale proportion the token.`,
      );
    }
  }

  if (densityIsExplicit && layout) {
    const overridden: string[] = [];
    for (const key of DENSITY_LAYOUT_KEYS) {
      if (layout[key] !== undefined) overridden.push(key);
    }
    if (overridden.length > 0) {
      getLogger().warn(
        `[design-tokens] density="${designTokens.density}" is set, but layout overrides defeat the multiplier on: ${overridden.join(", ")}. Either keep the override and drop density, or remove the override to let density proportion the token.`,
      );
    }
  }
}

export function resolveAgentDesignTokens(options: {
  theme?: AgentThemePreset;
  accentColor?: string;
  fontFamily?: string;
  designTokens?: AgentDesignTokens;
} = {}): ResolvedAgentDesignTokens {
  let resolved = getThemePresetBaseTokens(options.theme);

  resolved.controls = {
    scale: options.designTokens?.scale ?? resolved.controls.scale,
    density: options.designTokens?.density ?? resolved.controls.density,
    shape: options.designTokens?.shape ?? resolved.controls.shape,
  };

  resolved = applyCoupledControls(resolved);

  // WS-3: warn when an atomic override defeats a coupled control.
  // Example: user sets `scale: "xl"` and also `layout.contentPaddingTop:
  // 42`. The override wins, so the xl multiplier on that key is lost.
  // Surfacing this prevents the exact "pushed tokens → broken layout"
  // failure mode from the PRD's trueclara-v2-agent.pptx repro.
  warnAtomicOverridesDefeatCoupling(options.designTokens);

  if (options.accentColor) {
    resolved = withAccentColor(resolved, options.accentColor);
  }

  if (options.designTokens) {
    resolved = mergeRawResolvedAgentDesignTokens(resolved, {
      colors: options.designTokens.colors,
      typography: options.designTokens.typography,
      layout: options.designTokens.layout,
      effects: options.designTokens.effects,
    });
    resolved = applyGlobalLayoutFallbacks(resolved, options.designTokens.layout);
    if (options.designTokens.colors?.accent && !options.designTokens.colors.chartPalette) {
      resolved = withAccentColor(resolved, options.designTokens.colors.accent);
    }
  }

  resolved = applyFontStrategy(resolved, {
    strategy: options.designTokens?.typography?.fontStrategy ?? resolved.typography.fontStrategy,
    preserveTitleFamily: Boolean(options.designTokens?.typography?.titleFontFamily),
    preserveBodyFamily: Boolean(options.designTokens?.typography?.bodyFontFamily),
  });

  if (options.fontFamily) {
    resolved = withFontFamily(resolved, options.fontFamily);
    resolved = applyFontStrategy(resolved, {
      strategy: resolved.typography.fontStrategy,
      preserveTitleFamily: true,
      preserveBodyFamily: true,
    });
  }

  return finalizeResolvedAgentDesignTokens(resolved);
}

export function cloneAgentDesignTokens(
  tokens: ResolvedAgentDesignTokens,
): ResolvedAgentDesignTokens {
  return cloneResolvedAgentDesignTokens(tokens);
}
