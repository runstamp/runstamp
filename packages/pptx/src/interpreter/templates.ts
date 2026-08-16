// src/interpreter/templates.ts — 6 layout factory functions → PaperSlide
//
// Ported from demo/app/lib/slideLayouts.ts (MBB-style templates).
// Each factory accepts AgentSlide content + accentColor and returns a PaperSlide.

import type {
  PaperSlide,
  PaperNode,
  PaperText,
  ChartData,
  ChartSeries,
  TextRun,
  TextStyle,
} from "../types/ast.js";
import type { AgentSlide, Kpi } from "./agentSchema.js";
import type {
  AgentDesignTokens,
  ResolvedAgentDesignTokens,
} from "./design-tokens.js";
import {
  cloneAgentDesignTokens,
  resolveAgentDesignTokens,
} from "./design-tokens.js";
import {
  isQualitativeKpiValue,
  isTimelineSequence,
  parseComparisonEntry,
  parseComparisonOwnership,
  parseRegisterEntry,
  parseTimelineEntry,
} from "./composition-semantics.js";
import { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } from "../ooxml/constants.js";
import { calculateRichTextMetrics } from "../typography/richMetrics.js";

type SlideContent = AgentSlide["content"];

const SLIDE_W = DEFAULT_SLIDE_WIDTH_PX;
const SLIDE_H = DEFAULT_SLIDE_HEIGHT_PX;
const NODE_CHART = "Chart" as const;
const NODE_SLIDE = "Slide" as const;
const NODE_TEXT = "Text" as const;
const NODE_VIEW = "View" as const;
const BACKGROUND_SOLID = "solid" as const;
const FONT_WEIGHT_BOLD = "bold" as const;
const FLEX_ALIGN_CENTER = "center" as const;
const FLEX_ALIGN_START = "flex-start" as const;
const FLEX_DIRECTION_COLUMN = "column" as const;
const POSITION_ABSOLUTE = "absolute" as const;
const ZERO = 0;
const HERO_TITLE_MARGIN_TOP = 0;
const SUBTITLE_MARGIN_TOP = 12;
const HEADER_TEXT_HEIGHT = 38;
const SUBHEADER_TEXT_HEIGHT = 22;
const BODY_BOTTOM_MIN = 24;
const BODY_BOTTOM_MAX = 40;
const FIELD_GAP = 24;
const REGISTER_COLUMN_GAP = 28;
const REGISTER_INDEX_WIDTH = 58;
const REGISTER_RULE_HEIGHT = 2;
const REGISTER_RULE_BAND = 8;
const REGISTER_TEXT_PADDING_TOP = 6;
const REGISTER_TEXT_PADDING_BOTTOM = 8;
const REGISTER_TEXT_PADDING_RIGHT = 24;
const OWNED_FIELD_HEADER_HEIGHT = 54;
const TIMELINE_PREFIX_WIDTH = 188;
const TIMELINE_SPINE_LEFT = 22;
const PROSE_RAIL_GAP = 18;
const PROSE_RAIL_MIN_HEIGHT = 62;
const PROSE_RAIL_MAX_HEIGHT = 118;
const FOOTER_MIN_HEIGHT = 24;
const FOOTER_CONTENT_GAP = 12;
const HALF_DIVISOR = 2;
const Z_INDEX_ACCENT_BAR = 0;
const Z_INDEX_CONTENT = 10;
const Z_INDEX_HEADER = 30;
const Z_INDEX_SUBHEADER = 40;
const Z_INDEX_FOOTER = 50;

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function getSlideDesignTokens(
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
): ResolvedAgentDesignTokens {
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
          chartPieDataLabelSize: designTokens.typography.chartPieDataLabelSize,
        },
        layout: designTokens.layout,
        effects: designTokens.effects,
      },
    });
  }
  return resolveAgentDesignTokens({
    accentColor,
    fontFamily,
    designTokens: designTokens as AgentDesignTokens | undefined,
  });
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function accentBar(tokens: ResolvedAgentDesignTokens): PaperNode {
  return {
    type: NODE_VIEW,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_ACCENT_BAR,
      top: ZERO,
      left: ZERO,
      width: SLIDE_W,
      height: tokens.layout.accentBarHeight,
      backgroundColor: tokens.colors.accent,
    },
  };
}

function titleTextStyle(
  tokens: ResolvedAgentDesignTokens,
  style: Omit<TextStyle, "fontFamily" | "fontFallback"> = {},
): TextStyle {
  return {
    ...style,
    fontFamily: tokens.typography.titleFontFamily,
    fontFallback: [...tokens.typography.titleFontFallback],
  };
}

function bodyTextStyle(
  tokens: ResolvedAgentDesignTokens,
  style: Omit<TextStyle, "fontFamily" | "fontFallback"> = {},
): TextStyle {
  return {
    ...style,
    fontFamily: tokens.typography.bodyFontFamily,
    fontFallback: [...tokens.typography.bodyFontFallback],
  };
}

function headerText(text: string, tokens: ResolvedAgentDesignTokens): PaperNode {
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
      ...titleTextStyle(tokens),
    },
    content: text,
  };
}

function subheaderText(text: string, tokens: ResolvedAgentDesignTokens): PaperNode {
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
      ...bodyTextStyle(tokens),
    },
    content: text,
  };
}

export function buildAgentPaginationFooter(
  label: string,
  slideNumber: number,
  totalSlides: number,
  tokens: ResolvedAgentDesignTokens,
): PaperNode {
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
      height,
    },
    children: [
      rule({ left: 0, top: 0, width: tokens.semantic.contentWidth, height: 1 }, tokens.colors.cardBorder),
      absoluteText(label, {
        left: 0,
        top: 7,
        width: tokens.semantic.contentWidth - pageWidth - 24,
        height: height - 7,
      }, {
        color: ensureTextContrast(tokens.colors.mutedText, tokens.colors.slideBackground, 5.5),
        fontSize: Math.max(9, tokens.typography.footerSize),
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 7, maxLines: 1 },
        verticalAlign: "middle",
        ...bodyTextStyle(tokens),
      }, { autoFit: true }),
      absoluteText(pageText, {
        left: tokens.semantic.contentWidth - pageWidth,
        top: 7,
        width: pageWidth,
        height: height - 7,
      }, {
        color: ensureTextContrast(tokens.colors.mutedText, tokens.colors.slideBackground, 5.5),
        fontSize: Math.max(9, tokens.typography.footerSize),
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "right",
        verticalAlign: "middle",
        ...bodyTextStyle(tokens),
      }),
    ],
  };
}

// ---------------------------------------------------------------------------
// Chart bridge: AgentSlide chart → ChartData
// ---------------------------------------------------------------------------

export function agentChartToChartData(
  chart: NonNullable<SlideContent["chart"]>,
  accentColor: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
  surroundingTitles: readonly (string | undefined)[] = [],
): ChartData {
  const tokens = getSlideDesignTokens(accentColor, undefined, designTokens);
  const categories =
    chart.series.length > 0
      ? chart.series[0].dataPoints.map((dp) => dp.category)
      : [];

  const defaultColors = tokens.colors.chartPalette;

  const series: ChartSeries[] = chart.series.map((s, i) => ({
    name: s.name,
    values: s.dataPoints.map((dp) => dp.value),
    color: defaultColors[i % defaultColors.length],
  }));

  const chartType = chart.type;
  const chartMutedText = ensureTextContrast(tokens.colors.mutedText, tokens.colors.cardBackground, 5.5);
  const chartBodyText = ensureTextContrast(tokens.colors.bodyText, tokens.colors.cardBackground, 5.5);

  const chartData: ChartData = {
    chartType,
    categories,
    series,
    legend: {
      position: "bottom",
      fontSize: Math.max(14, tokens.typography.chartLegendSize),
      fontFamily: tokens.typography.bodyFontFamily,
      fontColor: chartMutedText,
      fill: tokens.colors.cardBackground,
    },
    dataLabels: {
      showVal: true,
      ...(chartType === "area" ? { position: "bestFit" as const } : {}),
      fontSize: Math.max(12, tokens.typography.chartDataLabelSize),
      fontColor: chartType === "area"
        ? ensureTextContrast(tokens.colors.themeLight1, tokens.colors.chartPalette[0] ?? tokens.colors.accent, 4.5)
        : chartBodyText,
      fontFamily: tokens.typography.bodyFontFamily,
    },
  };

  if (chartType === "area" && chart.areaGrouping !== undefined) {
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
      fontFamily: tokens.typography.bodyFontFamily,
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
        fontColor: chartMutedText,
      },
      gridlines: { major: true, color: mixHex(tokens.colors.cardBorder, tokens.colors.headingText, 0.18) },
    };
    chartData.categoryAxis = {
      fontSize: Math.max(14, tokens.typography.chartLegendSize),
      fontFamily: tokens.typography.bodyFontFamily,
      fontColor: chartMutedText,
      labelFont: {
        fontFamily: tokens.typography.bodyFontFamily,
        fontSize: Math.max(14, tokens.typography.chartLegendSize),
        fontColor: chartMutedText,
      },
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
      bold: true,
    };
  }

  return chartData;
}

function normalizeDisplayTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const CHART_TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "m", "of", "on", "or",
  "per", "the", "to", "under", "versus", "vs", "with",
]);

function meaningfulTitleTokens(value: string): string[] {
  return normalizeDisplayTitle(value)
    .split(" ")
    .filter((token) => token.length > 1)
    .filter((token) => !CHART_TITLE_STOP_WORDS.has(token))
    .filter((token) => !/^fy\d{2,4}$/u.test(token))
    .filter((token) => !/^\d+(?:\.\d+)?$/u.test(token));
}

function titleFieldLabel(value: string): string {
  const generic = new Set(["budget", "highlights", "plan", "proposal", "review", "update"]);
  return meaningfulTitleTokens(value)
    .filter((token) => !/^q[1-4]$/u.test(token))
    .find((token) => !generic.has(token))
    ?.toLocaleUpperCase("en-US") ?? "OPENING";
}

/** True for verbatim or clear semantic heading echoes; distinct evidence titles survive. */
export function isChartTitleEcho(chartTitle: string, surroundingTitle: string | undefined): boolean {
  if (!surroundingTitle) return false;
  const chart = normalizeDisplayTitle(chartTitle);
  const surrounding = normalizeDisplayTitle(surroundingTitle);
  if (chart.length === 0) return false;
  if (chart === surrounding) return true;

  const chartTokens = meaningfulTitleTokens(chart);
  if (chartTokens.length < 2) return false;
  const surroundingTokens = new Set(meaningfulTitleTokens(surrounding));
  const sharedTokens = chartTokens.filter((token) => surroundingTokens.has(token));
  return sharedTokens.length >= 2 && (sharedTokens.length / chartTokens.length) >= 0.5;
}

// ---------------------------------------------------------------------------
// Composition primitives
// ---------------------------------------------------------------------------

interface Frame {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface BodyComposition {
  content: Frame;
  proseRail?: Frame;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function contentComposition(
  tokens: ResolvedAgentDesignTokens,
  hasSubtitle: boolean,
  prose: readonly string[] = [],
): BodyComposition {
  const top = hasSubtitle
    ? Math.max(
        tokens.semantic.bodyTopWithSubtitle,
        tokens.layout.subheaderTop + SUBHEADER_TEXT_HEIGHT + 22,
        tokens.layout.headerTop + HEADER_TEXT_HEIGHT + 24,
      )
    : tokens.semantic.bodyTopWithoutSubtitle;
  const bottomMargin = clamp(
    tokens.semantic.pagePaddingBottom * 0.45,
    BODY_BOTTOM_MIN,
    BODY_BOTTOM_MAX,
  );
  const footerReserve = tokens.layout.footerBottom + FOOTER_MIN_HEIGHT + FOOTER_CONTENT_GAP;
  const availableBottom = SLIDE_H - Math.max(bottomMargin, footerReserve);
  if (prose.length === 0) {
    return {
      content: {
        height: Math.max(0, availableBottom - top),
        left: tokens.semantic.contentLeft,
        top,
        width: tokens.semantic.contentWidth,
      },
    };
  }

  const proseCharacters = prose.reduce((total, paragraph) => total + paragraph.length, 0);
  const railHeight = clamp(
    PROSE_RAIL_MIN_HEIGHT + Math.ceil(proseCharacters / 180) * 18,
    PROSE_RAIL_MIN_HEIGHT,
    PROSE_RAIL_MAX_HEIGHT,
  );
  const proseTop = availableBottom - railHeight;
  return {
    content: {
      height: Math.max(0, proseTop - PROSE_RAIL_GAP - top),
      left: tokens.semantic.contentLeft,
      top,
      width: tokens.semantic.contentWidth,
    },
    proseRail: {
      height: railHeight,
      left: tokens.semantic.contentLeft,
      top: proseTop,
      width: tokens.semantic.contentWidth,
    },
  };
}

function absoluteText(
  content: string | TextRun[],
  frame: Frame,
  style: TextStyle,
  options: { autoFit?: boolean } = {},
): PaperText {
  return {
    type: NODE_TEXT,
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_CONTENT,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      ...style,
    },
    ...(options.autoFit === undefined ? {} : { autoFit: options.autoFit }),
    content,
  };
}

function rule(frame: Frame, color: string): PaperNode {
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
      backgroundColor: color,
    },
  };
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHex(source: string, target: string, amount: number): string {
  const channel = (offset: number) => Math.round(
    parseInt(source.slice(offset, offset + 2), 16) * (1 - amount)
      + parseInt(target.slice(offset, offset + 2), 16) * amount,
  ).toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}

function ensureTextContrast(foreground: string, background: string, minimum: number): string {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  const target = contrastRatio("#000000", background) >= contrastRatio("#FFFFFF", background)
    ? "#000000"
    : "#FFFFFF";
  for (let step = 1; step <= 12; step += 1) {
    const candidate = mixHex(foreground, target, step / 12);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target;
}

function contrastText(background: string, tokens: ResolvedAgentDesignTokens): string {
  return relativeLuminance(background) > 0.48
    ? tokens.colors.themeDark1
    : tokens.colors.themeLight1;
}

function metricValueSize(value: string, primary: boolean): number {
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

interface MetricComparisonSignal {
  breach: boolean;
  current: number;
  reference: number;
  referenceName: string;
  referenceLabel: string;
}

function metricNumber(value: string): number | undefined {
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/u);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMetricReference(value: string, reference: number): string {
  const decimalPlaces = value.match(/\.(\d+)/u)?.[1].length ?? 0;
  const formatted = reference.toLocaleString("en-US", {
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces,
  });
  const prefix = value.trim().startsWith("$") ? "$" : "";
  const suffix = value.includes("%")
    ? "%"
    : /[KMBT]\b/u.exec(value)?.[0] ?? "";
  return `${prefix}${formatted}${suffix}`;
}

function metricComparisonSignal(kpi: Kpi): MetricComparisonSignal | undefined {
  const current = metricNumber(kpi.value);
  const detail = kpi.sublabel?.trim();
  if (current === undefined || current <= 0 || !detail) return undefined;

  let reference: number | undefined;
  let referenceName = "REFERENCE";
  const percentDelta = detail.match(/^\+([\d.]+)%\s*(?:yoy|year[- ]over[- ]year)/iu);
  const pointDelta = detail.match(/^([+-][\d.]+)\s*pp\b/iu);
  const additiveDelta = detail.match(/^([+-][\d.]+)\s+(?:net\s+new|added|change)/iu);
  const basisPointsOverFloor = detail.match(/([\d.]+)\s*bps\s+over\s+floor/iu);
  const namedReference = detail.match(/\b(limit|floor|min(?:imum)?|avg|average|benchmark)\b[^\d]*([\d.]+)/iu);

  if (percentDelta) {
    reference = current / (1 + (Number(percentDelta[1]) / 100));
    referenceName = "PRIOR YEAR";
  } else if (pointDelta) {
    reference = current - Number(pointDelta[1]);
    referenceName = "PRIOR PERIOD";
  } else if (additiveDelta) {
    reference = current - Number(additiveDelta[1]);
    referenceName = "PRIOR PERIOD";
  } else if (basisPointsOverFloor) {
    reference = current - (Number(basisPointsOverFloor[1]) / 100);
    referenceName = "FLOOR";
  } else if (namedReference) {
    reference = Number(namedReference[2]);
    referenceName = namedReference[1].toLocaleUpperCase("en-US")
      .replace(/^MIN$/u, "MINIMUM")
      .replace(/^AVG$/u, "AVERAGE");
  }

  if (reference === undefined || !Number.isFinite(reference) || reference <= 0) return undefined;
  const referenceKind = namedReference?.[1]?.toLocaleLowerCase("en-US") ?? "";
  const breach = referenceKind === "limit"
    ? current > reference
    : ["floor", "min", "minimum"].includes(referenceKind)
      ? current < reference
      : false;
  return {
    breach,
    current,
    reference,
    referenceName,
    referenceLabel: formatMetricReference(kpi.value, reference),
  };
}

function metricComparisonBars(
  comparison: MetricComparisonSignal,
  frame: Frame,
  currentColor: string,
  referenceColor: string,
): PaperNode[] {
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
        backgroundColor: referenceColor,
      },
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
        backgroundColor: currentColor,
      },
    },
  ];
}

function primaryMetricField(
  kpi: Kpi,
  frame: Frame,
  tokens: ResolvedAgentDesignTokens,
): PaperNode {
  const variant = kpi.style ?? "gradient";
  const background = variant === "dark"
    ? tokens.colors.darkCardBackground
    : variant === "outline"
      ? tokens.colors.cardBackground
      : tokens.colors.accent;
  const foreground = variant === "outline"
    ? tokens.colors.headingText
    : ensureTextContrast(contrastText(background, tokens), background, 4.5);
  const secondary = variant === "outline"
    ? tokens.colors.bodyText
    : foreground;
  const comparison = metricComparisonSignal(kpi);
  const inset = clamp(frame.width * 0.075, 32, 56);
  const valueHeight = Math.min(168, frame.height * 0.34);
  const labelTop = 34;
  const valueTop = labelTop + 52;
  const sublabelBandTop = comparison
    ? Math.max(valueTop + valueHeight + 24, frame.height * 0.64)
    : Math.max(valueTop + valueHeight + 28, frame.height * 0.74);
  const sublabelTop = sublabelBandTop + 28;
  const sublabelHeight = Math.max(42, frame.height - sublabelTop - 18);
  const sublabelBandColor = mixHex(background, foreground, 0.1);
  const comparisonColor = comparison?.breach ? "#DC2626" : foreground;
  const comparisonGap = 24;
  const comparisonColumnWidth = Math.max(80, (frame.width - (inset * 2) - comparisonGap) / 2);
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
      ...(variant === "outline"
        ? { borderWidth: tokens.effects.outlineBorderWidth, borderColor: tokens.colors.cardBorder }
        : {}),
    },
    children: [
      ...(kpi.sublabel
          ? [{
            type: NODE_VIEW as typeof NODE_VIEW,
            altText: "Agent primary metric sublabel band",
            decorative: true,
            style: {
              position: POSITION_ABSOLUTE,
              zIndex: Z_INDEX_ACCENT_BAR,
              left: 0,
              top: sublabelBandTop,
              width: frame.width,
              height: frame.height - sublabelBandTop,
              backgroundColor: sublabelBandColor,
            },
          }]
        : []),
      absoluteText(kpi.label, {
        left: inset,
        top: labelTop,
        width: frame.width - (inset * 2),
        height: 44,
      }, {
        color: secondary,
        fontSize: Math.max(15, tokens.typography.kpiGradientLabelSize),
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "left",
        ...bodyTextStyle(tokens),
      }),
      absoluteText(kpi.value, {
        left: inset,
        top: valueTop,
        width: frame.width - (inset * 2),
        height: valueHeight,
      }, {
        color: foreground,
        fontSize: metricValueSize(kpi.value, true),
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 28, maxLines: 2 },
        verticalAlign: "middle",
        ...titleTextStyle(tokens),
      }, { autoFit: true }),
      ...(comparison
        ? [
            ...metricComparisonBars(comparison, {
              left: inset,
              top: frame.height - 17,
              width: frame.width - (inset * 2),
              height: 11,
            }, comparisonColor, mixHex(sublabelBandColor, foreground, 0.42)),
            absoluteText("CONTEXT", {
              left: inset,
              top: sublabelBandTop + 24,
              width: comparisonColumnWidth,
              height: 18,
            }, {
              color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
              fontSize: 10,
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              ...bodyTextStyle(tokens),
            }),
            absoluteText(kpi.sublabel ?? "", {
              left: inset,
              top: sublabelBandTop + 46,
              width: comparisonColumnWidth,
              height: Math.max(54, frame.height - sublabelBandTop - 60),
            }, {
              color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
              fontSize: Math.max(15, tokens.typography.kpiSublabelSize + 2),
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 3 },
              verticalAlign: "top",
              ...bodyTextStyle(tokens),
            }, { autoFit: true }),
            rule({
              left: inset + comparisonColumnWidth + (comparisonGap / 2),
              top: sublabelBandTop,
              width: 1,
              height: frame.height - sublabelBandTop,
            }, mixHex(sublabelBandColor, foreground, 0.24)),
            absoluteText(comparison.referenceName, {
              left: inset + comparisonColumnWidth + comparisonGap,
              top: sublabelBandTop + 24,
              width: comparisonColumnWidth,
              height: 18,
            }, {
              color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
              fontSize: 10,
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              ...bodyTextStyle(tokens),
            }),
            absoluteText(comparison.referenceLabel, {
              left: inset + comparisonColumnWidth + comparisonGap,
              top: sublabelBandTop + 46,
              width: comparisonColumnWidth,
              height: Math.max(54, frame.height - sublabelBandTop - 60),
            }, {
              color: comparisonColor,
              fontSize: metricValueSize(comparison.referenceLabel, false),
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 18, maxLines: 2 },
              verticalAlign: "top",
              ...titleTextStyle(tokens),
            }, { autoFit: true }),
          ]
        : []),
      ...(kpi.sublabel && !comparison
        ? [absoluteText(kpi.sublabel, {
            left: inset,
            top: sublabelTop,
            width: frame.width - (inset * 2),
            height: sublabelHeight,
          }, {
            color: ensureTextContrast(secondary, sublabelBandColor, 4.5),
            fontSize: Math.max(14, tokens.typography.kpiSublabelSize),
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 2 },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens),
          }, { autoFit: true })]
        : []),
    ],
  };
}

function supportingMetricRegister(
  kpis: readonly Kpi[],
  frame: Frame,
  tokens: ResolvedAgentDesignTokens,
): PaperNode {
  const rowGap = kpis.length > 1 ? 10 : 0;
  const rowHeight = (frame.height - (rowGap * Math.max(0, kpis.length - 1))) / Math.max(1, kpis.length);
  return {
    type: NODE_VIEW,
    altText: "Agent dashboard supporting register",
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
    },
    children: kpis.flatMap((kpi, index): PaperNode[] => {
      const top = index * (rowHeight + rowGap);
      const comparison = metricComparisonSignal(kpi);
      const valueHeight = Math.max(34, Math.min(58, rowHeight * 0.34));
      const qualitative = isQualitativeKpiValue(kpi.value);
      const sublabelHeight = kpi.sublabel ? Math.min(42, Math.max(28, rowHeight * 0.18)) : 0;
      const comparisonReserve = comparison ? 40 : 0;
      const stackHeight = 25 + 8 + valueHeight + (sublabelHeight > 0 ? 6 + sublabelHeight : 0);
      const stackTop = top + Math.max(14, ((rowHeight - comparisonReserve) - stackHeight) / 2);
      const valueTop = stackTop + 33;
      const sublabelTop = valueTop + valueHeight + 6;
      const ruleColor = kpi.style === "dark"
        ? tokens.colors.darkCardBackground
        : comparison?.breach
          ? "#DC2626"
          : kpi.style === "gradient" || index === 0
          ? tokens.colors.accent
          : tokens.colors.cardBorder;
      const rowBackground = comparison?.breach
        ? mixHex(tokens.colors.cardBackground, "#DC2626", 0.08)
        : tokens.colors.cardBackground;
      const comparisonColor = comparison?.breach ? "#DC2626" : tokens.colors.accent;
      const comparisonBandLeft = 18;
      const comparisonBandWidth = frame.width - 36;
      return [
        {
          type: NODE_VIEW as typeof NODE_VIEW,
          altText: "Agent dashboard supporting row field",
          decorative: true,
          style: {
            position: POSITION_ABSOLUTE,
            zIndex: Z_INDEX_ACCENT_BAR,
            left: 0,
            top,
            width: frame.width,
            height: rowHeight,
            backgroundColor: rowBackground,
          },
        },
        rule({ left: 0, top, width: frame.width, height: 3 }, ruleColor),
        absoluteText(kpi.label, {
          left: 18,
          top: stackTop,
          width: frame.width - 36,
          height: 25,
        }, {
          color: tokens.colors.headingText,
          fontSize: Math.max(13, tokens.typography.kpiLabelSize),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 10, maxLines: 1 },
          ...bodyTextStyle(tokens),
        }, { autoFit: true }),
        absoluteText(kpi.value, {
          left: 18,
          top: valueTop,
          width: frame.width - 36,
          height: valueHeight,
        }, {
          color: comparison?.breach ? "#DC2626" : qualitative ? tokens.colors.accent : tokens.colors.headingText,
          fontSize: qualitative ? (kpi.value.length > 20 ? 24 : 30) : metricValueSize(kpi.value, false),
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          textFit: { policy: "fitFontSize", minFontSize: 18, maxLines: 2 },
          verticalAlign: "middle",
          ...titleTextStyle(tokens),
        }, { autoFit: true }),
        ...(kpi.sublabel
          ? [absoluteText(kpi.sublabel, {
              left: 18,
              top: sublabelTop,
              width: frame.width - 36,
              height: sublabelHeight,
            }, {
              color: tokens.colors.bodyText,
              fontSize: Math.max(12, tokens.typography.kpiSublabelSize),
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 10, maxLines: 2 },
              ...bodyTextStyle(tokens),
            }, { autoFit: true })]
          : []),
        ...(comparison
          ? [
              ...metricComparisonBars(comparison, {
                left: comparisonBandLeft,
                top: top + rowHeight - 12,
                width: comparisonBandWidth,
                height: 11,
              }, comparisonColor, mixHex(tokens.colors.cardBorder, tokens.colors.headingText, 0.38)),
              rule({
                left: comparisonBandLeft,
                top: top + rowHeight - 31,
                width: 3,
                height: 18,
              }, comparisonColor),
              absoluteText(comparison.referenceName, {
                left: comparisonBandLeft + 10,
                top: top + rowHeight - 34,
                width: comparisonBandWidth * 0.58,
                height: 24,
              }, {
                color: tokens.colors.bodyText,
                fontSize: 9,
                fontWeight: FONT_WEIGHT_BOLD,
                textAlign: "left",
                verticalAlign: "middle",
                ...bodyTextStyle(tokens),
              }),
              absoluteText(comparison.referenceLabel, {
                left: comparisonBandLeft + (comparisonBandWidth * 0.58),
                top: top + rowHeight - 34,
                width: (comparisonBandWidth * 0.42),
                height: 24,
              }, {
                color: comparisonColor,
                fontSize: 11,
                fontWeight: FONT_WEIGHT_BOLD,
                textAlign: "right",
                verticalAlign: "middle",
                ...bodyTextStyle(tokens),
              }),
            ]
          : []),
      ];
    }),
  };
}

function proseRail(
  prose: readonly string[],
  frame: Frame | undefined,
  tokens: ResolvedAgentDesignTokens,
): PaperNode[] {
  if (!frame || prose.length === 0) return [];
  return [
    rule({ ...frame, height: 2 }, tokens.colors.accent),
    absoluteText(prose.join("\n"), {
      left: frame.left,
      top: frame.top + 14,
      width: frame.width,
      height: frame.height - 14,
    }, {
      color: tokens.colors.bodyText,
      fontSize: Math.max(13, tokens.typography.bulletsProseSize),
      textAlign: "left",
      textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: prose.length * 2 },
      verticalAlign: "top",
      ...bodyTextStyle(tokens),
    }, { autoFit: true }),
  ];
}

function registerEntryRuns(
  entry: string,
  fontSize: number,
  tokens: ResolvedAgentDesignTokens,
): TextRun[] | string {
  const parts = parseRegisterEntry(entry);
  if (!parts.anchor) return entry;
  return [
    {
      text: parts.anchor,
      style: {
        color: tokens.colors.headingText,
        fontSize: fontSize + 1,
        fontWeight: FONT_WEIGHT_BOLD,
      },
    },
    { text: parts.body },
  ];
}

interface RegisterRowPlan {
  boundaries: number[];
  fits: boolean;
  fontSize: number;
}

function registerLineCount(
  entry: string,
  width: number,
  fontSize: number,
  tokens: ResolvedAgentDesignTokens,
): number {
  const content = registerEntryRuns(entry, fontSize, tokens);
  const runs = typeof content === "string" ? [{ text: content }] : content;
  return Math.max(1, calculateRichTextMetrics(runs, {
    color: tokens.colors.bodyText,
    fontSize,
    lineHeight: 1.12,
    ...bodyTextStyle(tokens),
  }, Math.max(40, width)).lineCount);
}

function planRegisterRows(
  rows: readonly (readonly (string | undefined)[])[],
  textWidth: number,
  height: number,
  tokens: ResolvedAgentDesignTokens,
  minimumFontSize = 10,
  preferredFontSize = Math.max(15, tokens.typography.bulletListSize),
): RegisterRowPlan {
  const normalizedRows = rows.length > 0 ? rows : [[undefined]];
  let selectedFontSize = Math.max(minimumFontSize, preferredFontSize);
  let selectedDemands: number[] = [];
  let fits = false;

  for (let candidate = selectedFontSize; candidate >= minimumFontSize; candidate -= 1) {
    const demands = normalizedRows.map((row) => {
      const lineCount = Math.max(1, ...row.flatMap((entry) => (
        entry ? [registerLineCount(entry, textWidth, candidate, tokens)] : []
      )));
      return Math.max(
        52,
        REGISTER_RULE_BAND
          + REGISTER_TEXT_PADDING_TOP
          + (lineCount * candidate * 1.12)
          + REGISTER_TEXT_PADDING_BOTTOM,
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
  const extraPerRow = fits
    ? Math.max(0, height - demandTotal) / normalizedRows.length
    : 0;
  const scale = !fits && demandTotal > 0 ? height / demandTotal : 1;
  const boundaries = [0];
  let cursor = 0;
  selectedDemands.forEach((demand, index) => {
    cursor += fits ? demand + extraPerRow : demand * scale;
    boundaries.push(index === selectedDemands.length - 1 ? height : Math.round(cursor));
  });

  return { boundaries, fits, fontSize: selectedFontSize };
}

function registerRows(
  entries: readonly (string | undefined)[],
  frame: Frame,
  tokens: ResolvedAgentDesignTokens,
  startIndex = 0,
  entryIndices?: readonly number[],
  minimumFontSize = 10,
  sharedPlan?: RegisterRowPlan,
): PaperNode {
  const rowCount = Math.max(1, entries.length);
  const sparseRegister = rowCount <= 2 && (frame.height / rowCount) >= 180;
  const indexWidth = sparseRegister
    ? clamp(frame.width * 0.17, 82, 108)
    : REGISTER_INDEX_WIDTH;
  const textWidth = frame.width - indexWidth - 6 - REGISTER_TEXT_PADDING_RIGHT;
  const plan = sharedPlan ?? planRegisterRows(
    entries.map((entry) => [entry]),
    textWidth,
    frame.height,
    tokens,
    minimumFontSize,
    sparseRegister
      ? Math.max(20, tokens.typography.bulletListSize)
      : Math.max(15, tokens.typography.bulletListSize),
  );
  const fontSize = sparseRegister
    ? Math.max(minimumFontSize, plan.fontSize - 2)
    : plan.fontSize;
  return {
    type: NODE_VIEW,
    altText: plan.fits ? "Agent register" : "Agent register overflow",
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
    },
    children: entries.flatMap((entry, index): PaperNode[] => {
      const top = plan.boundaries[index] ?? Math.round((index * frame.height) / rowCount);
      const bottom = plan.boundaries[index + 1] ?? Math.round(((index + 1) * frame.height) / rowCount);
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
            backgroundColor: tokens.colors.accent,
          },
          children: [
            rule({
              left: 28,
              top: 28,
              width: 3,
              height: Math.max(40, resolvedRowHeight - 56),
            }, contrastText(tokens.colors.accent, tokens)),
          ],
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
          ...(sparseRegister
            ? { backgroundColor: mixHex(tokens.colors.cardBackground, tokens.colors.accent, index % 2 === 0 ? 0.035 : 0.075) }
            : {}),
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
              backgroundColor: mixHex(tokens.colors.cardBackground, tokens.colors.accent, 0.1),
            },
          },
          rule({ left: 0, top: 0, width: frame.width, height: index === 0 ? 3 : 1 }, index === 0 ? tokens.colors.accent : tokens.colors.cardBorder),
          absoluteText(String((entryIndices?.[index] ?? (startIndex + index)) + 1).padStart(2, "0"), {
            left: 0,
            top: indexTop,
            width: indexWidth,
            height: indexHeight,
          }, {
            color: tokens.colors.accent,
            fontSize: sparseRegister ? 48 : 30,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "center",
            ...bodyTextStyle(tokens),
          }),
          absoluteText(registerEntryRuns(entry, fontSize, tokens), {
            left: indexWidth + 6,
            top: textTop,
            width: textWidth,
            height: textHeight,
          }, {
            color: tokens.colors.bodyText,
            fontSize,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: minimumFontSize, maxLines: Math.max(1, Math.floor(textHeight / (fontSize * 1.12))) },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens),
          }, { autoFit: true }),
        ],
      }];
    }),
  };
}

function ownedComparisonFields(
  pairs: readonly { left: string; right: string }[],
  ownership: { left: string; right: string },
  frame: Frame,
  tokens: ResolvedAgentDesignTokens,
): PaperNode[] {
  const dividerGap = 30;
  const fieldWidth = (frame.width - dividerGap) / 2;
  const rowsHeight = frame.height - OWNED_FIELD_HEADER_HEIGHT;
  const comparisonInset = 18;
  const comparisonMarkerWidth = 28;
  const comparisonTextWidth = fieldWidth - (comparisonInset * 2) - comparisonMarkerWidth;
  const dividerColor = mixHex(tokens.colors.cardBorder, tokens.colors.headingText, 0.28);
  const rowPlan = planRegisterRows(
    pairs.map((pair) => [pair.left, pair.right]),
    comparisonTextWidth,
    rowsHeight,
    tokens,
    11,
    Math.max(15, tokens.typography.comparisonBodySize),
  );
  const buildField = (side: "left" | "right", left: number, header: string): PaperNode => ({
    type: NODE_VIEW,
    altText: rowPlan.fits
      ? `Agent comparison owned field: ${side}`
      : `Agent comparison owned field: ${side} overflow`,
    style: {
      position: POSITION_ABSOLUTE,
      left,
      top: frame.top,
      width: fieldWidth,
      height: frame.height,
      backgroundColor: side === "right"
        ? mixHex(tokens.colors.cardBackground, tokens.colors.accent, 0.08)
        : tokens.colors.cardBackground,
    },
    children: [
      rule({
        left: 0,
        top: 0,
        width: fieldWidth,
        height: 3,
      }, side === "right" ? tokens.colors.accent : dividerColor),
      absoluteText(header, {
        left: comparisonInset,
        top: 13,
        width: fieldWidth - (comparisonInset * 2),
        height: 32,
      }, {
        color: side === "right" ? tokens.colors.accent : tokens.colors.headingText,
        fontSize: 16,
        fontWeight: FONT_WEIGHT_BOLD,
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 12, maxLines: 2 },
        ...bodyTextStyle(tokens),
      }, { autoFit: true }),
      ...pairs.flatMap((pair, index): PaperNode[] => {
        const rowTop = OWNED_FIELD_HEADER_HEIGHT + (rowPlan.boundaries[index] ?? 0);
        const rowBottom = OWNED_FIELD_HEADER_HEIGHT + (rowPlan.boundaries[index + 1] ?? rowsHeight);
        const rowResolvedHeight = rowBottom - rowTop;
        const text = side === "left" ? pair.left : pair.right;
        const textTop = rowTop + REGISTER_RULE_BAND + REGISTER_TEXT_PADDING_TOP;
        const textHeight = Math.max(24, rowResolvedHeight - REGISTER_RULE_BAND - REGISTER_TEXT_PADDING_TOP - REGISTER_TEXT_PADDING_BOTTOM);
        return [
          rule({ left: comparisonInset, top: rowTop, width: fieldWidth - (comparisonInset * 2), height: 1 }, dividerColor),
          absoluteText(side === "right" ? "✓" : "—", {
            left: comparisonInset,
            top: textTop,
            width: comparisonMarkerWidth,
            height: textHeight,
          }, {
            color: side === "right" ? tokens.colors.accent : tokens.colors.mutedText,
            fontSize: Math.max(14, rowPlan.fontSize),
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            verticalAlign: "middle",
            ...bodyTextStyle(tokens),
          }),
          absoluteText(text, {
            left: comparisonInset + comparisonMarkerWidth,
            top: textTop,
            width: comparisonTextWidth,
            height: textHeight,
          }, {
            color: side === "right" ? tokens.colors.headingText : tokens.colors.bodyText,
            fontSize: rowPlan.fontSize,
            fontWeight: undefined,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: Math.max(1, Math.floor(textHeight / (rowPlan.fontSize * 1.12))) },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens),
          }, { autoFit: true }),
        ];
      }),
    ],
  });

  return [{
    type: NODE_VIEW,
    style: {
      position: POSITION_ABSOLUTE,
      left: 0,
      top: 0,
      width: SLIDE_W,
      height: SLIDE_H,
    },
    children: [
      buildField("left", frame.left, ownership.left),
      buildField("right", frame.left + fieldWidth + dividerGap, ownership.right),
      rule({
        left: frame.left + fieldWidth + (dividerGap / 2),
        top: frame.top,
        width: 2,
        height: frame.height,
      }, dividerColor),
    ],
  }];
}

function timelineRunway(
  entries: readonly string[],
  frame: Frame,
  tokens: ResolvedAgentDesignTokens,
): PaperNode[] {
  const milestones = entries.flatMap((entry) => {
    const parsed = parseTimelineEntry(entry);
    return parsed ? [parsed] : [];
  });
  const supporting = entries.flatMap((entry) => (
    parseTimelineEntry(entry) ? [] : [{ entry }]
  ));
  const supportHeight = supporting.length > 0
    ? clamp(70 * supporting.length, 76, 112)
    : 0;
  const runwayHeight = frame.height - (supportHeight > 0 ? supportHeight + 16 : 0);
  const rowHeight = runwayHeight / Math.max(1, milestones.length);
  const runway: PaperNode = {
    type: NODE_VIEW,
    style: {
      position: POSITION_ABSOLUTE,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: runwayHeight,
    },
    children: [
      rule({
        left: TIMELINE_SPINE_LEFT,
        top: 16,
        width: 3,
        height: Math.max(0, runwayHeight - 32),
      }, tokens.colors.accent),
      ...milestones.flatMap((milestone, index): PaperNode[] => {
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
            height: resolvedHeight,
          },
          children: [
            rule({ left: TIMELINE_SPINE_LEFT - 7, top: insetY + 8, width: 17, height: 3 }, tokens.colors.accent),
            absoluteText(milestone.prefix, {
              left: 52,
              top: insetY,
              width: TIMELINE_PREFIX_WIDTH,
              height: Math.max(30, resolvedHeight - (insetY * 2)),
            }, {
              color: tokens.colors.accent,
              fontSize: 18,
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 14, maxLines: 1 },
              verticalAlign: "top",
              ...titleTextStyle(tokens),
            }, { autoFit: true }),
            absoluteText(milestone.body.trimStart(), {
              left: TIMELINE_PREFIX_WIDTH + 66,
              top: insetY,
              width: frame.width - TIMELINE_PREFIX_WIDTH - 66,
              height: Math.max(30, resolvedHeight - (insetY * 2)),
            }, {
              color: tokens.colors.bodyText,
              fontSize: Math.max(15, tokens.typography.bulletListSize),
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 3 },
              verticalAlign: "top",
              ...bodyTextStyle(tokens),
            }, { autoFit: true }),
          ],
        }];
      }),
    ],
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
        height: supportHeight,
      },
      children: [
        rule({ left: 0, top: 0, width: frame.width, height: 3 }, tokens.colors.accent),
        ...supporting.map((item, index) => absoluteText(
          registerEntryRuns(item.entry, Math.max(14, tokens.typography.bulletListSize), tokens),
          {
            left: 0,
            top: 14 + (index * ((supportHeight - 14) / supporting.length)),
            width: frame.width,
            height: (supportHeight - 14) / supporting.length,
          },
          {
            color: tokens.colors.bodyText,
            fontSize: Math.max(14, tokens.typography.bulletListSize),
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 2 },
            verticalAlign: "top",
            ...bodyTextStyle(tokens),
          },
          { autoFit: true },
        )),
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 1. Title Layout — restrained editorial field
// ---------------------------------------------------------------------------

/**
 * The organisation line at the foot of a title slide.
 *
 * Content slides carry `companyName · presentationTitle` plus pagination; the title slide carried
 * nothing, so the company name a caller supplied was rendered on every slide except the one a
 * reader looks at first. That left the lower third of every title slide flat empty background,
 * which three judge lenses flagged unanimously as a void band across three runs
 * (VOID-BAND-CALIBRATION-2026-08-13.md).
 *
 * Only the company name goes here. The presentation title is already the slide's headline, and
 * repeating it to fill space would be the padding this fixes. A deck with no `companyName` gets no
 * footer — an invented one would be worse than the gap.
 */
function titleOrganizationFooter(
  companyName: string,
  tokens: ResolvedAgentDesignTokens,
  width: number,
): PaperNode {
  const height = Math.max(FOOTER_MIN_HEIGHT, tokens.typography.footerSize + 15);
  return {
    type: NODE_VIEW,
    altText: "Agent title organization footer",
    style: {
      position: POSITION_ABSOLUTE,
      zIndex: Z_INDEX_FOOTER,
      left: tokens.semantic.titlePaddingX,
      top: SLIDE_H - tokens.layout.footerBottom - height,
      width: width - (tokens.semantic.titlePaddingX * 2),
      height,
    },
    children: [
      rule({ left: 0, top: 0, width: width - (tokens.semantic.titlePaddingX * 2), height: 1 }, tokens.colors.accent),
      absoluteText(companyName, {
        left: 0,
        top: 7,
        width: width - (tokens.semantic.titlePaddingX * 2),
        height: height - 7,
      }, {
        color: ensureTextContrast(tokens.colors.titleSubtitleText, tokens.colors.titleBackgroundStart, 4.5),
        fontSize: Math.max(9, tokens.typography.footerSize),
        textAlign: "left",
        textFit: { policy: "fitFontSize", minFontSize: 7, maxLines: 1 },
        verticalAlign: "middle",
        ...bodyTextStyle(tokens),
      }, { autoFit: true }),
    ],
  };
}

export function buildTitleLayout(
  content: SlideContent,
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
  companyName?: string,
): PaperSlide {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const inner: PaperNode[] = [];
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
      ...titleTextStyle(tokens),
    },
    content: content.title,
  });

  if (content.subtitle) {
    inner.push({
      type: NODE_TEXT,
      style: {
        color: tokens.colors.titleSubtitleText,
        fontSize: tokens.typography.heroSubtitleSize,
        marginTop: SUBTITLE_MARGIN_TOP,
        ...bodyTextStyle(tokens),
      },
      content: content.subtitle,
    });
  }

  inner.push({
    type: NODE_VIEW,
    style: {
      width: tokens.layout.titleDividerWidth,
      height: tokens.layout.titleDividerHeight,
      backgroundColor: tokens.colors.accent,
      marginTop: tokens.layout.titleDividerMarginTop,
      marginBottom: tokens.layout.titleDividerMarginBottom,
    },
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
          backgroundColor: tokens.colors.accent,
        },
        children: [
          absoluteText(editorialLabel, {
            left: editorialFieldWidth * 0.16,
            top: SLIDE_H * 0.22,
            width: editorialFieldWidth * 0.68,
            height: 42,
          }, {
            color: contrastText(tokens.colors.accent, tokens),
            fontSize: 15,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 1 },
            ...bodyTextStyle(tokens),
          }, { autoFit: true }),
          rule({
            left: editorialFieldWidth * 0.16,
            top: SLIDE_H * 0.29,
            width: 2,
            height: SLIDE_H * 0.3,
          }, contrastText(tokens.colors.accent, tokens)),
          absoluteText("01", {
            left: editorialFieldWidth * 0.16,
            top: SLIDE_H * 0.56,
            width: editorialFieldWidth * 0.68,
            height: 220,
          }, {
            color: contrastText(tokens.colors.accent, tokens),
            fontSize: 150,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            verticalAlign: "bottom",
            ...titleTextStyle(tokens),
          }),
        ],
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
          height: SLIDE_H,
        },
        children: inner,
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
          width: editorialFieldLeft - (tokens.semantic.titlePaddingX * 2),
          height: 2,
          backgroundColor: mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.28),
        },
      },
      {
        type: NODE_VIEW,
        altText: "Agent title source-owned identity field",
        style: {
          position: POSITION_ABSOLUTE,
          zIndex: Z_INDEX_CONTENT,
          left: tokens.semantic.titlePaddingX,
          top: lowerFieldTop,
          width: editorialFieldLeft - (tokens.semantic.titlePaddingX * 2),
          height: lowerFieldHeight,
          backgroundColor: mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.1),
        },
        children: [
          rule({ left: 0, top: 0, width: 5, height: lowerFieldHeight }, tokens.colors.accent),
          absoluteText(editorialLabel, {
            left: 28,
            top: 16,
            width: editorialFieldLeft - (tokens.semantic.titlePaddingX * 2) - 56,
            height: 38,
          }, {
            color: ensureTextContrast(tokens.colors.titleText, mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.1), 4.5),
            fontSize: 14,
            fontWeight: FONT_WEIGHT_BOLD,
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 1 },
            ...bodyTextStyle(tokens),
          }, { autoFit: true }),
          absoluteText(companyName ?? content.subtitle ?? content.title, {
            left: 28,
            top: 54,
            width: editorialFieldLeft - (tokens.semantic.titlePaddingX * 2) - 56,
            height: 44,
          }, {
            color: ensureTextContrast(tokens.colors.titleSubtitleText, mixHex(tokens.colors.titleBackgroundStart, tokens.colors.accent, 0.1), 4.5),
            fontSize: Math.max(14, tokens.typography.heroSubtitleSize),
            textAlign: "left",
            textFit: { policy: "fitFontSize", minFontSize: 11, maxLines: 2 },
            verticalAlign: "middle",
            ...bodyTextStyle(tokens),
          }, { autoFit: true }),
        ],
      },
      ...(companyName ? [titleOrganizationFooter(companyName, tokens, editorialFieldLeft)] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Statement Layout — Light bg, large bold statement, optional prose
// ---------------------------------------------------------------------------

export function buildStatementLayout(
  content: SlideContent,
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
): PaperSlide {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children: PaperNode[] = [accentBar(tokens)];
  const prose = content.prose ?? [];
  const top = Math.max(118, tokens.semantic.contentPaddingTop + 28);
  const bottom = SLIDE_H - Math.max(
    clamp(tokens.semantic.pagePaddingBottom * 0.55, 42, 64),
    tokens.layout.footerBottom + FOOTER_MIN_HEIGHT + FOOTER_CONTENT_GAP,
  );
  const height = bottom - top;
  const hasProse = prose.length > 0;
  const statementWidth = hasProse
    ? tokens.semantic.contentWidth * 0.47
    : tokens.semantic.contentWidth * 0.72;
  const claimInset = hasProse ? 34 : 0;
  const statementTextWidth = statementWidth - (claimInset * 2);
  const statementFontSize = Math.max(
    hasProse ? 32 : content.title.length < 90 ? 52 : 42,
    tokens.typography.sectionTitleSize,
  );
  const statementRuns = [{ text: content.title }];
  const statementLines = calculateRichTextMetrics(statementRuns, {
    color: tokens.colors.headingText,
    fontSize: statementFontSize,
    fontWeight: FONT_WEIGHT_BOLD,
    lineHeight: 1.12,
    ...titleTextStyle(tokens),
  }, statementTextWidth).lineCount;
  const titleHeight = clamp(
    (statementLines * statementFontSize * 1.12) + 20,
    96,
    hasProse ? Math.min(300, height * 0.62) : Math.min(390, height * 0.72),
  );
  const titleTop = hasProse
    ? top + clamp(((height - titleHeight) / 2) - 16, 72, height - titleHeight - 72)
    : top + 12;
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
        borderColor: tokens.colors.accent,
      },
    });
    children.push(absoluteText("“", {
      left: tokens.semantic.contentLeft + claimInset,
      top: top + 24,
      width: 120,
      height: 116,
    }, {
      color: mixHex(tokens.colors.accent, contrastText(tokens.colors.accent, tokens), 0.35),
      fontSize: 96,
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "left",
      verticalAlign: "top",
      ...titleTextStyle(tokens),
    }));
    children.push(absoluteText("”", {
      left: tokens.semantic.contentLeft + statementWidth - claimInset - 120,
      top: top + height - 142,
      width: 120,
      height: 116,
    }, {
      color: mixHex(tokens.colors.accent, contrastText(tokens.colors.accent, tokens), 0.35),
      fontSize: 96,
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "right",
      verticalAlign: "bottom",
      ...titleTextStyle(tokens),
    }));
  }

  children.push(
    absoluteText(content.title, {
      left: tokens.semantic.contentLeft + claimInset,
      top: titleTop,
      width: statementTextWidth,
      height: titleHeight,
    }, {
      color: hasProse ? contrastText(tokens.colors.accent, tokens) : tokens.colors.headingText,
      fontSize: statementFontSize,
      fontWeight: FONT_WEIGHT_BOLD,
      textAlign: "left",
      textFit: {
        policy: "fitFontSize",
        minFontSize: 20,
        maxLines: Math.max(5, Math.floor(titleHeight / (statementFontSize * 1.12))),
      },
      verticalAlign: "top",
      ...titleTextStyle(tokens),
    }, { autoFit: true }),
  );

  if (content.subtitle && !hasProse) {
    children.push(absoluteText(content.subtitle, {
      left: tokens.semantic.contentLeft,
      top: titleTop + titleHeight + 6,
      width: statementWidth,
      height: 30,
    }, {
      color: tokens.colors.bodyText,
      fontSize: Math.max(14, tokens.typography.sectionSubtitleSize),
      textAlign: "left",
      ...bodyTextStyle(tokens),
    }));
  }

  children.push(rule({
    left: tokens.semantic.contentLeft + claimInset,
    top: dividerTop,
    width: tokens.layout.sectionDividerWidth,
    height: Math.max(3, tokens.layout.sectionDividerHeight),
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
        borderColor: tokens.colors.cardBorder,
      },
      children: [
        ...(content.subtitle
          ? [absoluteText(content.subtitle, {
              left: railInsetX,
              top: 20,
              width: proseWidth - (railInsetX * 2),
              height: 48,
            }, {
              color: tokens.colors.headingText,
              fontSize: Math.max(14, tokens.typography.sectionSubtitleSize),
              fontWeight: FONT_WEIGHT_BOLD,
              textAlign: "left",
              textFit: { policy: "fitFontSize", minFontSize: 12, maxLines: 2 },
              ...bodyTextStyle(tokens),
            }, { autoFit: true })]
          : []),
        registerRows(prose, {
          left: railInsetX,
          top: railTop,
          width: proseWidth - (railInsetX * 2),
          height: evidenceHeight - railTop - railBottom,
        }, tokens, 0, undefined, 18),
      ],
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
        backgroundColor: tokens.colors.accent,
      },
      children: [
        absoluteText("“", {
          left: anchorWidth * 0.16,
          top: height * 0.08,
          width: anchorWidth * 0.68,
          height: 150,
        }, {
          color: contrastText(tokens.colors.accent, tokens),
          fontSize: 108,
          fontWeight: FONT_WEIGHT_BOLD,
          textAlign: "left",
          verticalAlign: "top",
          ...titleTextStyle(tokens),
        }),
        rule({
          left: anchorWidth * 0.18,
          top: height * 0.34,
          width: 3,
          height: height * 0.48,
        }, contrastText(tokens.colors.accent, tokens)),
      ],
    });
  }

  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children,
  };
}

// ---------------------------------------------------------------------------
// 3. Dashboard Layout — source-ordered metric protagonist + supporting register
// ---------------------------------------------------------------------------

export function buildDashboardLayout(
  content: SlideContent,
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
): PaperSlide {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children: PaperNode[] = [
    accentBar(tokens),
    headerText(content.title, tokens),
  ];
  if (content.subtitle) children.push(subheaderText(content.subtitle, tokens));
  const kpis = content.kpis ?? [];
  const hasChart = !!content.chart;
  const prose = content.prose ?? [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), prose);
  const body = {
    ...composition.content,
    left: tokens.layout.headerLeft,
    width: Math.max(0, tokens.semantic.contentRight - tokens.layout.headerLeft),
  };

  if (hasChart) {
    const registerWidth = kpis.length > 0
      ? clamp(body.width * 0.26, 250, 320)
      : 0;
    const chartLeft = body.left + (registerWidth > 0 ? registerWidth + FIELD_GAP : 0);
    const chartWidth = body.width - (registerWidth > 0 ? registerWidth + FIELD_GAP : 0);
    const chartData = agentChartToChartData(
      content.chart!,
      tokens.colors.accent,
      tokens,
      [content.title, content.subtitle],
    );
    children.push({
      type: NODE_CHART,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_CONTENT,
        top: body.top,
        left: chartLeft,
        width: chartWidth,
        height: body.height,
      },
      chartData,
    } as PaperNode);
    if (kpis.length > 0) {
      children.push(supportingMetricRegister(kpis, {
        left: body.left,
        top: body.top,
        width: registerWidth,
        height: body.height,
      }, tokens));
    }
  } else if (kpis.length > 0) {
    const heroWidth = kpis.length === 1
      ? body.width
      : Math.round((body.width - FIELD_GAP) * 0.44);
    children.push(primaryMetricField(kpis[0], {
      left: body.left,
      top: body.top,
      width: heroWidth,
      height: body.height,
    }, tokens));
    if (kpis.length > 1) {
      children.push(supportingMetricRegister(kpis.slice(1), {
        left: body.left + heroWidth + FIELD_GAP,
        top: body.top,
        width: body.width - heroWidth - FIELD_GAP,
        height: body.height,
      }, tokens));
    }
  }

  children.push(...proseRail(prose, composition.proseRail, tokens));

  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children,
  };
}

// ---------------------------------------------------------------------------
// 4. Comparison Layout — owned fields with explicit primary/supporting hierarchy
// ---------------------------------------------------------------------------

export function buildComparisonLayout(
  content: SlideContent,
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
): PaperSlide {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children: PaperNode[] = [
    accentBar(tokens),
    headerText(content.title, tokens),
  ];
  const legacyOwnership = parseComparisonOwnership(content.subtitle);
  const ownership = content.comparison
    ? { left: content.comparison.leftLabel, right: content.comparison.rightLabel }
    : legacyOwnership;
  if (content.subtitle && !legacyOwnership) children.push(subheaderText(content.subtitle, tokens));
  const prose = content.prose ?? [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), prose);
  const body = composition.content;

  const explicitPairs = content.comparison?.rows;
  const legacyPairs = content.bulletPoints?.map((entry) => parseComparisonEntry(entry));
  const resolvedLegacyPairs = legacyPairs?.every((pair) => pair !== undefined)
    ? legacyPairs.filter((pair) => pair !== undefined)
    : undefined;
  const ownedPairs = explicitPairs ?? (legacyOwnership ? resolvedLegacyPairs : undefined);

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
          height: body.height,
        }, tokens),
        registerRows(rightBullets, {
          left: body.left + columnWidth + REGISTER_COLUMN_GAP,
          top: body.top,
          width: columnWidth,
          height: body.height,
        }, tokens, mid),
        rule({
          left: body.left + columnWidth + (REGISTER_COLUMN_GAP / 2),
          top: body.top,
          width: 1,
          height: body.height,
        }, tokens.colors.cardBorder),
      );
  } else if (content.kpis && content.kpis.length > 0) {
    const heroWidth = content.kpis.length === 1
      ? body.width
      : Math.round((body.width - FIELD_GAP) * 0.52);
    children.push(primaryMetricField(content.kpis[0], {
      left: body.left,
      top: body.top,
      width: heroWidth,
      height: body.height,
    }, tokens));
    if (content.kpis.length > 1) {
      children.push(supportingMetricRegister(content.kpis.slice(1), {
        left: body.left + heroWidth + FIELD_GAP,
        top: body.top,
        width: body.width - heroWidth - FIELD_GAP,
        height: body.height,
      }, tokens));
    }
  }
  children.push(...proseRail(prose, composition.proseRail, tokens));

  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children,
  };
}

// ---------------------------------------------------------------------------
// 5. Chart Focus Layout — evidence artifact as the visual protagonist
// ---------------------------------------------------------------------------

export function buildChartFocusLayout(
  content: SlideContent,
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
): PaperSlide {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children: PaperNode[] = [
    accentBar(tokens),
    headerText(content.title, tokens),
  ];
  if (content.subtitle) children.push(subheaderText(content.subtitle, tokens));

  const kpis = content.kpis ?? [];
  const prose = content.prose ?? [];
  const composition = contentComposition(tokens, Boolean(content.subtitle), prose);
  const body = composition.content;
  const sidebarWidth = kpis.length > 0
    ? clamp(body.width * 0.25, 250, 310)
    : 0;
  const chartWidth = body.width - (sidebarWidth > 0 ? sidebarWidth + FIELD_GAP : 0);

  if (content.chart) {
    const chartData = agentChartToChartData(
      content.chart,
      tokens.colors.accent,
      tokens,
      [content.title, content.subtitle],
    );
    children.push({
      type: NODE_CHART,
      style: {
        position: POSITION_ABSOLUTE,
        zIndex: Z_INDEX_CONTENT,
        top: body.top,
        left: body.left,
        width: chartWidth,
        height: body.height,
      },
      chartData,
    });
  }

  if (kpis.length > 0) {
    if (content.chart) {
      children.push(supportingMetricRegister(kpis, {
        left: body.left + chartWidth + FIELD_GAP,
        top: body.top,
        width: sidebarWidth,
        height: body.height,
      }, tokens));
    } else {
      const heroWidth = kpis.length === 1
        ? body.width
        : Math.round((body.width - FIELD_GAP) * 0.56);
      children.push(primaryMetricField(kpis[0], {
        left: body.left,
        top: body.top,
        width: heroWidth,
        height: body.height,
      }, tokens));
      if (kpis.length > 1) {
        children.push(supportingMetricRegister(kpis.slice(1), {
          left: body.left + heroWidth + FIELD_GAP,
          top: body.top,
          width: body.width - heroWidth - FIELD_GAP,
          height: body.height,
        }, tokens));
      }
    }
  }
  children.push(...proseRail(prose, composition.proseRail, tokens));

  return {
    type: NODE_SLIDE,
    background: { type: BACKGROUND_SOLID, color: tokens.colors.slideBackground },
    children,
  };
}

// ---------------------------------------------------------------------------
// 6. Bullets Layout — adaptive flat register with balanced full-height rhythm
// ---------------------------------------------------------------------------

export function buildBulletsLayout(
  content: SlideContent,
  accentColor: string,
  fontFamily?: string,
  designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens,
): PaperSlide {
  const tokens = getSlideDesignTokens(accentColor, fontFamily, designTokens);
  const children: PaperNode[] = [
    accentBar(tokens),
    headerText(content.title, tokens),
  ];
  if (content.subtitle) children.push(subheaderText(content.subtitle, tokens));

  const bullets = content.bulletPoints ?? [];
  const prose = content.prose ?? [];
  const timeline = bullets.length > 0 && isTimelineSequence(bullets);
  const useOddProseField = !timeline
    && bullets.length >= 5
    && bullets.length % 2 === 1
    && prose.length > 0;
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
        bullets[(rowIndex * 2) + 1],
      ] as const);
      const sharedPlan = wantsTwoColumns
        ? planRegisterRows(
            rowPairs,
            twoColumnWidth - REGISTER_INDEX_WIDTH - 6 - REGISTER_TEXT_PADDING_RIGHT,
            body.height,
            tokens,
            10,
            Math.max(20, tokens.typography.bulletListSize),
          )
        : undefined;
      const oneColumnPlan = planRegisterRows(
        bullets.map((entry) => [entry]),
        body.width - REGISTER_INDEX_WIDTH - 6 - REGISTER_TEXT_PADDING_RIGHT,
        body.height,
        tokens,
      );
      const useTwoColumns = wantsTwoColumns && (sharedPlan?.fits === true || !oneColumnPlan.fits);

      if (!useTwoColumns) {
        children.push(registerRows(bullets, body, tokens, 0, undefined, 10, oneColumnPlan));
      } else if (bullets.length % 2 === 1 && !useOddProseField) {
        const pairedBullets = bullets.slice(0, -1);
        const pairedRows = pairedBullets.length / 2;
        const finalRowHeight = body.height / (pairedRows + 1);
        const pairedHeight = body.height - finalRowHeight;
        const pairedPlan = planRegisterRows(
          Array.from({ length: pairedRows }, (_, rowIndex) => [
            pairedBullets[rowIndex * 2],
            pairedBullets[(rowIndex * 2) + 1],
          ]),
          twoColumnWidth - REGISTER_INDEX_WIDTH - 6 - REGISTER_TEXT_PADDING_RIGHT,
          pairedHeight,
          tokens,
          10,
          Math.max(20, tokens.typography.bulletListSize),
        );
        children.push(
          registerRows(pairedBullets.filter((_entry, index) => index % 2 === 0), {
            left: body.left,
            top: body.top,
            width: twoColumnWidth,
            height: pairedHeight,
          }, tokens, 0, Array.from({ length: pairedRows }, (_, index) => index * 2), 10, pairedPlan),
          registerRows(pairedBullets.filter((_entry, index) => index % 2 === 1), {
            left: body.left + twoColumnWidth + REGISTER_COLUMN_GAP,
            top: body.top,
            width: twoColumnWidth,
            height: pairedHeight,
          }, tokens, 0, Array.from({ length: pairedRows }, (_, index) => (index * 2) + 1), 10, pairedPlan),
          registerRows([bullets[bullets.length - 1]], {
            left: body.left,
            top: body.top + pairedHeight,
            width: body.width,
            height: finalRowHeight,
          }, tokens, bullets.length - 1),
        );
      } else {
        const leftEntries = rowPairs.map((pair) => pair[0]);
        const rightEntries = rowPairs.map((pair) => pair[1]);
        const leftIndices = rowPairs.map((_pair, index) => index * 2);
        const rightIndices = rowPairs.map((_pair, index) => (index * 2) + 1);
        children.push(
          registerRows(leftEntries, {
            left: body.left,
            top: body.top,
            width: twoColumnWidth,
            height: body.height,
          }, tokens, 0, leftIndices, 10, sharedPlan),
          registerRows(rightEntries, {
            left: body.left + twoColumnWidth + REGISTER_COLUMN_GAP,
            top: body.top,
            width: twoColumnWidth,
            height: body.height,
          }, tokens, 0, rightIndices, 10, sharedPlan),
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
              backgroundColor: tokens.colors.accent,
            },
            children: [
              rule({
                left: 34,
                top: 30,
                width: 3,
                height: Math.max(40, fieldHeight - 60),
              }, contrastText(tokens.colors.accent, tokens)),
              absoluteText(prose.join("\n"), {
                left: 58,
                top: 32,
                width: twoColumnWidth - 96,
                height: fieldHeight - 64,
              }, {
                color: ensureTextContrast(contrastText(tokens.colors.accent, tokens), tokens.colors.accent, 4.5),
                fontSize: Math.max(17, tokens.typography.bulletsProseSize),
                textAlign: "left",
                textFit: { policy: "fitFontSize", minFontSize: 12, maxLines: prose.length * 4 },
                verticalAlign: "middle",
                ...bodyTextStyle(tokens),
              }, { autoFit: true }),
            ],
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
    children,
  };
}
