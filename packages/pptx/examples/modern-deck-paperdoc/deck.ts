import type {
  ChartData,
  PaperDocument,
  PaperNode,
  PaperSlide,
  PaperText,
  PaperView,
} from "../../dist-lite/index.js";
import { bulletList, card, chartCard, eyebrow, metricCard, pageFooter, rule } from "./helpers.js";
import { COLORS, MODERN_DECK_THEME, SPACE, TYPOGRAPHY } from "./tokens.js";

function titleText(content: string, x: number, y: number, width: number, size: number): PaperText {
  return {
    type: "Text",
    style: {
      position: "absolute",
      left: x,
      top: y,
      width,
      height: size + 8,
      fontFamily: TYPOGRAPHY.display,
      fontFallback: [...TYPOGRAPHY.fallback],
      color: COLORS.text,
      fontSize: size,
      fontWeight: "bold",
    },
    content,
  };
}

function bodyText(content: string, x: number, y: number, width: number, height: number, size = TYPOGRAPHY.body): PaperText {
  return {
    type: "Text",
    style: {
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontFallback: [...TYPOGRAPHY.fallback],
      color: COLORS.textBody,
      fontSize: size,
      lineHeight: 1.35,
    },
    content,
  };
}

function slide(children: PaperNode[], background: PaperSlide["background"]): PaperSlide {
  return {
    type: "Slide",
    background,
    children,
  };
}

function chartDataForRevenue(): ChartData {
  return {
    chartType: "bar",
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      {
        name: "Revenue",
        values: [11.2, 13.1, 15.8, 18.4],
        color: COLORS.accent,
      },
    ],
    legend: {
      position: "bottom",
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.textMuted,
      fill: COLORS.surface,
    },
    dataLabels: {
      showVal: true,
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.text,
    },
    categoryAxis: {
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.textMuted,
      labelFont: {
        fontFamily: TYPOGRAPHY.bodyFamily,
        fontSize: TYPOGRAPHY.bodySmall,
        fontColor: COLORS.textMuted,
      },
    },
    valueAxis: {
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.textMuted,
      labelFont: {
        fontFamily: TYPOGRAPHY.bodyFamily,
        fontSize: TYPOGRAPHY.bodySmall,
        fontColor: COLORS.textMuted,
      },
      gridlines: {
        major: true,
        color: COLORS.surfaceBorder,
      },
    },
    plotArea: {
      fill: COLORS.surface,
    },
    gapWidth: 54,
  };
}

function chartDataForRetention(): ChartData {
  return {
    chartType: "line",
    categories: ["Jan", "Mar", "May", "Jul", "Sep"],
    series: [
      {
        name: "Enterprise",
        values: [98, 103, 107, 112, 118],
        color: COLORS.accentStrong,
      },
      {
        name: "SMB",
        values: [94, 97, 99, 101, 103],
        color: COLORS.accentSoft,
      },
    ],
    legend: {
      position: "bottom",
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.textMuted,
      fill: COLORS.surface,
    },
    categoryAxis: {
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.textMuted,
      labelFont: {
        fontFamily: TYPOGRAPHY.bodyFamily,
        fontSize: TYPOGRAPHY.bodySmall,
        fontColor: COLORS.textMuted,
      },
    },
    valueAxis: {
      fontFamily: TYPOGRAPHY.bodyFamily,
      fontSize: TYPOGRAPHY.bodySmall,
      fontColor: COLORS.textMuted,
      numberFormat: "0%",
      labelFont: {
        fontFamily: TYPOGRAPHY.bodyFamily,
        fontSize: TYPOGRAPHY.bodySmall,
        fontColor: COLORS.textMuted,
      },
      gridlines: {
        major: true,
        color: COLORS.surfaceBorder,
      },
    },
    plotArea: {
      fill: COLORS.surface,
    },
  };
}

function titleSlide(): PaperSlide {
  return slide(
    [
      eyebrow("PaperDocument modern example", SPACE.pageX, 82, 220),
      titleText("Midnight Growth Story", SPACE.pageX, 118, 520, TYPOGRAPHY.hero),
      bodyText(
        "A canonical modern deck built by hand with PaperDocument primitives: rounded surfaces, soft shadows, gradient emphasis, editable charts, and deliberate whitespace.",
        SPACE.pageX,
        190,
        460,
        84,
        TYPOGRAPHY.heroSubtitle,
      ),
      rule(SPACE.pageX, 286, 124),
      bodyText(
        "Visual baseline for the Agent compiler roadmap",
        SPACE.pageX,
        312,
        300,
        24,
        TYPOGRAPHY.bodySmall,
      ),
      card(
        612,
        92,
        284,
        314,
        [
          {
            type: "Text",
            style: {
              fontFamily: TYPOGRAPHY.display,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: 46,
              fontWeight: "bold",
              color: COLORS.text,
            },
            content: "Q2",
          },
          {
            type: "Text",
            style: {
              marginTop: 14,
              fontFamily: TYPOGRAPHY.bodyFamily,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: 16,
              color: COLORS.textBody,
              lineHeight: 1.35,
            },
            content: "Expansion arrived earlier.\nActivation tightened.\nChurn stabilized.",
          },
          {
            type: "View",
            style: {
              marginTop: 30,
              width: 176,
              height: 44,
              fill: {
                type: "linear",
                angle: 135,
                stops: [
                  { color: COLORS.accent, position: 0 },
                  { color: COLORS.accentStrong, position: 100 },
                ],
              },
            },
            shapeType: "roundRect",
            shapeAdjustments: [SPACE.cardRadius],
          } as PaperView,
        ],
        {
          backgroundColor: COLORS.backgroundRaised,
        },
      ),
      pageFooter("Runstamp / modern-deck-paperdoc / title"),
    ],
    {
      type: "gradient",
      angle: 145,
      stops: [
        { color: COLORS.backgroundStrong, position: 0 },
        { color: COLORS.background, position: 100 },
      ],
    },
  );
}

function statementSlide(): PaperSlide {
  return slide(
    [
      eyebrow("Statement", SPACE.pageX, SPACE.pageTop, 120),
      titleText("Three small product loops turned into one durable revenue engine.", SPACE.pageX, 96, 640, TYPOGRAPHY.sectionTitle + 8),
      bodyText(
        "Faster activation improved weekly retention. That widened the window for expansion. Better expansion lifted product-qualified lead quality, which fed the next activation cohort.",
        SPACE.pageX,
        182,
        492,
        110,
        16,
      ),
      card(
        620,
        118,
        272,
        244,
        [
          {
            type: "Text",
            style: {
              fontFamily: TYPOGRAPHY.display,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: TYPOGRAPHY.eyebrow,
              fontWeight: "bold",
              color: COLORS.accentSoft,
            },
            content: "WHAT CHANGED",
          },
          {
            type: "Text",
            style: {
              marginTop: 14,
              fontFamily: TYPOGRAPHY.bodyFamily,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: TYPOGRAPHY.body,
              color: COLORS.textBody,
              lineHeight: 1.35,
            },
            content: "Time-to-value fell from 10 days to 6. Enterprise rollout friction dropped. Renewals now start from a healthier usage baseline.",
          },
          {
            type: "Text",
            style: {
              marginTop: 18,
              fontFamily: TYPOGRAPHY.bodyFamily,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: TYPOGRAPHY.bodySmall,
              color: COLORS.textSoft,
            },
            content: "Net effect: stronger growth with less heroics.",
          },
        ],
        { backgroundColor: COLORS.surfaceStrong },
      ),
      pageFooter("Runstamp / modern-deck-paperdoc / statement"),
    ],
    {
      type: "solid",
      color: COLORS.background,
    },
  );
}

function dashboardSlide(): PaperSlide {
  return slide(
    [
      eyebrow("Dashboard", SPACE.pageX, SPACE.pageTop, 120),
      titleText("Operating snapshot", SPACE.pageX, 90, 320, TYPOGRAPHY.sectionTitle),
      bodyText("A modern KPI grid paired with an editable chart card.", SPACE.pageX, 124, 320, 24, TYPOGRAPHY.bodySmall),
      metricCard(64, 166, 220, 126, "ARR", "$18.4M", "+28% YoY", COLORS.accent, "gradient"),
      metricCard(302, 166, 220, 126, "NRR", "121%", "+5 pts", COLORS.accent, "dark"),
      metricCard(64, 310, 220, 126, "Pipeline", "$7.2M", "3.4x coverage", COLORS.accent, "outline"),
      metricCard(302, 310, 220, 126, "Payback", "10 mo", "-2 mo", COLORS.accent, "dark"),
      ...chartCard(548, 166, 348, 270, "Quarterly revenue", chartDataForRevenue()),
      pageFooter("Runstamp / modern-deck-paperdoc / dashboard"),
    ],
    {
      type: "solid",
      color: COLORS.background,
    },
  );
}

function comparisonColumn(x: number, title: string, items: string[]): PaperView {
  return card(
    x,
    156,
    384,
    302,
    [
      {
        type: "Text",
        style: {
          fontFamily: TYPOGRAPHY.display,
          fontFallback: [...TYPOGRAPHY.fallback],
          fontSize: TYPOGRAPHY.sectionTitle - 2,
          fontWeight: "bold",
          color: COLORS.text,
        },
        content: title,
      },
      {
        type: "Text",
        style: {
          marginTop: 20,
          fontFamily: TYPOGRAPHY.bodyFamily,
          fontFallback: [...TYPOGRAPHY.fallback],
          fontSize: TYPOGRAPHY.body,
          color: COLORS.textBody,
          lineHeight: 1.35,
        },
        paragraphs: items.map((item, index) => ({
          runs: [{ text: item }],
          bullet: { char: "\u2022" },
          spaceBefore: index === 0 ? 0 : 10,
        })),
      },
    ],
    {
      backgroundColor: COLORS.surface,
    },
  );
}

function comparisonSlide(): PaperSlide {
  return slide(
    [
      eyebrow("Comparison", SPACE.pageX, SPACE.pageTop, 120),
      titleText("What scaled well vs. what still needs attention", SPACE.pageX, 90, 560, TYPOGRAPHY.sectionTitle),
      comparisonColumn(64, "What scaled", [
        "Faster onboarding playbooks for enterprise launches",
        "More qualified expansion prompts inside active accounts",
        "Cleaner weekly operating review with one set of metrics",
      ]),
      comparisonColumn(512, "What needs work", [
        "Mid-market pipeline coverage still runs thin in EMEA",
        "Support routing remains noisy for first-week issues",
        "Pricing experiments need a tighter attribution loop",
      ]),
      pageFooter("Runstamp / modern-deck-paperdoc / comparison"),
    ],
    {
      type: "solid",
      color: COLORS.background,
    },
  );
}

function chartFocusSlide(): PaperSlide {
  return slide(
    [
      eyebrow("Chart focus", SPACE.pageX, SPACE.pageTop, 120),
      titleText("Retention is improving earlier in the customer lifecycle", SPACE.pageX, 90, 620, TYPOGRAPHY.sectionTitle),
      ...chartCard(64, 158, 552, 290, "Net revenue retention by cohort", chartDataForRetention()),
      metricCard(648, 158, 248, 120, "Enterprise", "118%", "September cohort", COLORS.accentStrong, "gradient"),
      metricCard(648, 296, 248, 120, "SMB", "103%", "September cohort", COLORS.accent, "outline"),
      pageFooter("Runstamp / modern-deck-paperdoc / chart-focus"),
    ],
    {
      type: "solid",
      color: COLORS.background,
    },
  );
}

function bulletsSlide(): PaperSlide {
  return slide(
    [
      eyebrow("Bullets", SPACE.pageX, SPACE.pageTop, 120),
      titleText("Next quarter focus", SPACE.pageX, 90, 360, TYPOGRAPHY.sectionTitle),
      bulletList(64, 154, 520, 306, "Where to press next", [
        "Turn onboarding wins into a repeatable enterprise rollout program",
        "Convert health-score signals into expansion and renewal plays",
        "Shorten the path from product-qualified lead to first value",
      ]),
      card(
        616,
        154,
        280,
        306,
        [
          {
            type: "Text",
            style: {
              fontFamily: TYPOGRAPHY.display,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: TYPOGRAPHY.eyebrow,
              fontWeight: "bold",
              color: COLORS.accentSoft,
            },
            content: "OPERATOR NOTE",
          },
          {
            type: "Text",
            style: {
              marginTop: 14,
              fontFamily: TYPOGRAPHY.bodyFamily,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: TYPOGRAPHY.body,
              color: COLORS.textBody,
              lineHeight: 1.35,
            },
            content: "The deck stays dark, spare, and highly editable. Every surface is just a PaperDocument primitive, so teams can fork this example instead of waiting on the agent compiler.",
          },
          {
            type: "Text",
            style: {
              marginTop: 18,
              fontFamily: TYPOGRAPHY.bodyFamily,
              fontFallback: [...TYPOGRAPHY.fallback],
              fontSize: TYPOGRAPHY.bodySmall,
              color: COLORS.textSoft,
            },
            content: "That makes it the right baseline for the remaining preset work.",
          },
        ],
        { backgroundColor: COLORS.surfaceStrong },
      ),
      pageFooter("Runstamp / modern-deck-paperdoc / bullets"),
    ],
    {
      type: "solid",
      color: COLORS.background,
    },
  );
}

export function buildModernDeckPaperDocument(): PaperDocument {
  return {
    type: "Document",
    meta: {
      title: "Modern Midnight Growth Story",
      author: "Runstamp",
    },
    theme: MODERN_DECK_THEME,
    slides: [
      titleSlide(),
      statementSlide(),
      dashboardSlide(),
      comparisonSlide(),
      chartFocusSlide(),
      bulletsSlide(),
    ],
  };
}
