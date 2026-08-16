import type { ThemeConfig } from "../../dist-lite/index.js";

export const SLIDE = {
  width: 960,
  height: 540,
} as const;

export const COLORS = {
  background: "#07111F",
  backgroundRaised: "#0D1830",
  backgroundStrong: "#040A14",
  surface: "#101C32",
  surfaceStrong: "#0A1428",
  surfaceBorder: "#1F3555",
  accent: "#5EEAD4",
  accentStrong: "#38BDF8",
  accentSoft: "#A5F3FC",
  text: "#F8FAFC",
  textBody: "#D8E4F3",
  textMuted: "#89A0BF",
  textSoft: "#BFD0E5",
  success: "#34D399",
  warning: "#F59E0B",
} as const;

export const TYPOGRAPHY = {
  display: "Liberation Sans",
  bodyFamily: "Liberation Sans",
  fallback: ["DejaVu Sans", "Arial"],
  eyebrow: 11,
  hero: 34,
  heroSubtitle: 16,
  sectionTitle: 24,
  body: 14,
  bodySmall: 12,
  kpiLabel: 11,
  kpiValue: 26,
  chartTitle: 14,
  footer: 10,
} as const;

export const SPACE = {
  pageX: 64,
  pageTop: 52,
  pageBottom: 34,
  cardRadius: 7000,
  cardPadding: 20,
  cardGap: 18,
} as const;

export const CARD_SHADOW = {
  dropShadow: {
    color: "#020617",
    offsetX: 0,
    offsetY: 14,
    blurRadius: 28,
    opacity: 0.28,
  },
} as const;

export const MODERN_DECK_THEME: ThemeConfig = {
  name: "Modern Midnight",
  colorScheme: {
    dk1: COLORS.backgroundStrong,
    lt1: COLORS.text,
    dk2: COLORS.surfaceStrong,
    lt2: COLORS.textMuted,
    accent1: COLORS.accent,
    accent2: COLORS.accentStrong,
    accent3: COLORS.success,
    accent4: COLORS.warning,
    accent5: COLORS.accentSoft,
    accent6: "#818CF8",
  },
  fontScheme: {
    majorLatin: TYPOGRAPHY.display,
    minorLatin: TYPOGRAPHY.bodyFamily,
  },
};
