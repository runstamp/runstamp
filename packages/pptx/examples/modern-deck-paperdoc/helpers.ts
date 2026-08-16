import type {
  ChartData,
  PaperChart,
  PaperNode,
  PaperText,
  PaperView,
  TextStyle,
} from "../../dist-lite/index.js";
import { CARD_SHADOW, COLORS, SPACE, TYPOGRAPHY } from "./tokens.js";

function titleStyle(overrides: Partial<TextStyle> = {}): TextStyle {
  return {
    fontFamily: TYPOGRAPHY.display,
    fontFallback: [...TYPOGRAPHY.fallback],
    color: COLORS.text,
    ...overrides,
  };
}

function bodyStyle(overrides: Partial<TextStyle> = {}): TextStyle {
  return {
    fontFamily: TYPOGRAPHY.display,
    fontFallback: [...TYPOGRAPHY.fallback],
    color: COLORS.textBody,
    ...overrides,
  };
}

export function eyebrow(text: string, x: number, y: number, width: number): PaperText {
  return {
    type: "Text",
    style: titleStyle({
      position: "absolute",
      left: x,
      top: y,
      width,
      height: 18,
      fontSize: TYPOGRAPHY.eyebrow,
      fontWeight: "bold",
      color: COLORS.accentSoft,
    }),
    content: text.toUpperCase(),
  };
}

export function rule(x: number, y: number, width: number): PaperView {
  return {
    type: "View",
    style: {
      position: "absolute",
      left: x,
      top: y,
      width,
      height: 3,
      fill: {
        type: "linear",
        angle: 0,
        stops: [
          { color: COLORS.accent, position: 0 },
          { color: COLORS.accentStrong, position: 100 },
        ],
      },
      opacity: 0.95,
    },
  };
}

export function pageFooter(text: string): PaperText {
  return {
    type: "Text",
    style: bodyStyle({
      position: "absolute",
      left: SPACE.pageX,
      bottom: 16,
      width: 420,
      height: 14,
      fontSize: TYPOGRAPHY.footer,
      color: COLORS.textMuted,
    }),
    content: text,
  };
}

export function card(
  x: number,
  y: number,
  width: number,
  height: number,
  children: PaperNode[],
  options: {
    backgroundColor?: string;
    fill?: NonNullable<PaperView["style"]>["fill"];
    padding?: number;
    borderColor?: string;
  } = {},
): PaperView {
  return {
    type: "View",
    shapeType: "roundRect",
    shapeAdjustments: [SPACE.cardRadius],
    style: {
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      padding: options.padding ?? SPACE.cardPadding,
      backgroundColor: options.backgroundColor ?? COLORS.surface,
      ...(options.fill ? { fill: options.fill } : {}),
      ...(options.borderColor ? { borderColor: options.borderColor, borderWidth: 1 } : {}),
      effects: CARD_SHADOW,
      flexDirection: "column",
    },
    children,
  };
}

export function metricCard(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  sublabel: string,
  accent: string,
  variant: "gradient" | "dark" | "outline" = "gradient",
): PaperView {
  const fill = variant === "gradient"
    ? {
        type: "linear" as const,
        angle: 135,
        stops: [
          { color: accent, position: 0 },
          { color: COLORS.accentStrong, position: 100 },
        ],
      }
    : undefined;

  return card(
    x,
    y,
    width,
    height,
    [
      {
        type: "Text",
        style: bodyStyle({
          fontSize: TYPOGRAPHY.kpiLabel,
          fontWeight: "bold",
          color: variant === "outline" ? COLORS.textMuted : COLORS.accentSoft,
        }),
        content: label,
      },
      {
        type: "Text",
        style: titleStyle({
          marginTop: 10,
          fontSize: TYPOGRAPHY.kpiValue,
          fontWeight: "bold",
          color: COLORS.text,
        }),
        content: value,
      },
      {
        type: "Text",
        style: bodyStyle({
          marginTop: 6,
          fontSize: TYPOGRAPHY.bodySmall,
          color: variant === "outline" ? COLORS.textSoft : COLORS.textBody,
        }),
        content: sublabel,
      },
    ],
    {
      fill,
      backgroundColor: variant === "dark" ? COLORS.surfaceStrong : variant === "outline" ? COLORS.backgroundRaised : undefined,
      borderColor: variant === "outline" ? COLORS.surfaceBorder : undefined,
    },
  );
}

export function bulletList(
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  bullets: string[],
): PaperView {
  return card(
    x,
    y,
    width,
    height,
    [
      {
        type: "Text",
        style: titleStyle({
          fontSize: TYPOGRAPHY.sectionTitle,
          fontWeight: "bold",
        }),
        content: title,
      },
      {
        type: "Text",
        style: bodyStyle({
          marginTop: 18,
          fontSize: TYPOGRAPHY.body,
          lineHeight: 1.35,
        }),
        paragraphs: bullets.map((bullet, index) => ({
          runs: [{ text: bullet }],
          bullet: { char: "\u2022" },
          spaceBefore: index === 0 ? 0 : 8,
        })),
      },
    ],
    {
      backgroundColor: COLORS.surface,
    },
  );
}

export function chartCard(
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  chartData: ChartData,
): PaperNode[] {
  const shell = card(x, y, width, height, [], {
    backgroundColor: COLORS.surface,
  });
  const heading: PaperText = {
    type: "Text",
    style: titleStyle({
      position: "absolute",
      left: x + 22,
      top: y + 20,
      width: width - 44,
      height: 20,
      fontSize: TYPOGRAPHY.chartTitle,
      fontWeight: "bold",
      color: COLORS.text,
    }),
    content: title,
  };
  const chart: PaperChart = {
    type: "Chart",
    style: {
      position: "absolute",
      left: x + 18,
      top: y + 54,
      width: width - 36,
      height: height - 72,
    },
    chartData,
  };
  return [shell, heading, chart];
}
