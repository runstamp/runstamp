/**
 * The single bootstrap default token bundle.
 *
 * Meant to be overwritten by callers, not selected. If you reach for this and
 * do not replace most keys, you are using runstamp wrong. The default exists
 * because every token must resolve to *something* when the caller omits it.
 *
 * Design of the default:
 *   - Plain black-on-white (no accent), system fonts, minimal ornamentation.
 *   - `accent` intentionally equals `foreground` so an under-specified bundle
 *     still renders legibly without accidentally promoting stray hex values.
 *   - Photography disabled (`photo.enabled = false`) — photo primitives
 *     gracefully degrade. A photo-forward caller (LG-style) must opt in.
 *   - Footer carries a page number only; no disclaimer, no watermark.
 *   - Rules mostly `"none"` or a whisper-pale hairline. Callers choose
 *     what to emphasize.
 *
 * Default `family` is "Aptos" — PowerPoint's native Calibri replacement
 * (Office 2024+ ships Aptos by default). Earlier choices like "Helvetica Neue"
 * caused PowerPoint on Windows to substitute Calibri/Aptos with different
 * metrics and break the layout. For broader portability across non-Microsoft
 * viewers, override to a metric-compat open-source family ("Carlito").
 */
import type { ResolvedTokens } from "./schema.js";

export const BOOTSTRAP_TOKENS: ResolvedTokens = {
  version: "1.0",
  canvas: {
    ratio: "16:9",
    margin: 56,
    density: 1.0,
    surface: "#FFFFFF",
  },
  palette: {
    foreground: "#0A0A0A",
    muted: "#6B6B6B",
    faint: "#A8A8A8",
    rule: "#E5E5E5",
    accent: "#0A0A0A",
    accentInverse: "#FFFFFF",
    accentSecondary: null,
  },
  type: {
    display: {
      family: "Aptos",
      weight: 500,
      size: 56,
      letterSpacing: -0.5,
      lineHeight: 62,
      italic: false,
      transform: "none",
    },
    title: {
      family: "Aptos",
      weight: 500,
      size: 28,
      letterSpacing: -0.2,
      lineHeight: 34,
      italic: false,
      transform: "none",
    },
    body: {
      family: "Aptos",
      weight: 400,
      size: 14,
      letterSpacing: 0,
      lineHeight: 20,
      italic: false,
      transform: "none",
    },
    caption: {
      family: "Aptos",
      weight: 400,
      size: 10,
      letterSpacing: 0,
      lineHeight: 14,
      italic: false,
      transform: "none",
    },
    eyebrow: {
      family: "Aptos",
      weight: 700,
      size: 10,
      letterSpacing: 1.4,
      lineHeight: 12,
      italic: false,
      transform: "upper",
    },
    nav: {
      family: "Aptos",
      weight: 500,
      size: 10,
      letterSpacing: 2.0,
      lineHeight: 12,
      italic: false,
      transform: "upper",
    },
  },
  rules: {
    title: "none",
    section: "none",
    divider: "1px solid token:rule",
    edge: "none",
  },
  ornament: {
    bullet: {
      marker: "filledDot",
      color: "foreground",
      sizeRatio: 0.9,
      gap: 10,
      indent: 16,
      nestedMarker: "enDash",
    },
    stepMarker: {
      style: "plain",
      fill: "foreground",
    },
    pageNumber: {
      style: "plain",
      prefix: "",
    },
  },
  chrome: {
    headerRibbon: {
      enabled: false,
      height: 28,
      fill: "foreground",
      type: "nav",
      align: "center",
    },
    footer: {
      enabled: true,
      layout: ["spacer", "pageNumber"],
      height: 32,
      topRule: "none",
      disclaimer: "",
      projectCode: "",
      watermark: "",
    },
  },
  photo: {
    enabled: false,
    defaultBleed: "none",
    scrim: "none",
    scrimOpacity: 0.35,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
    xxl: 72,
  },
  embeddedFonts: [],
};
