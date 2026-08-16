/**
 * CSS Variable Bridge (Doc 1, Section 4)
 * ======================================
 *
 * Injects design tokens as CSS variables for seamless integration
 * with React components and styled-components.
 *
 * Doc 1: "At the start of Pass 1 (Ghost Render), the engine applies
 * the theme to the DOM."
 */

import { Theme, HexColor } from "./types";
import { designTokenManager, parsePT } from "./design-tokens";

// =============================================================================
// CSS VARIABLE MAPPING
// =============================================================================

/** CSS variable prefix */
const CSS_VAR_PREFIX = "--";

/** Maps token keys to CSS variable names */
const TOKEN_TO_CSS_MAP = {
  // Colors
  "brand-primary": "brand-primary",
  "brand-secondary": "brand-secondary",
  "text-main": "text-main",
  "text-muted": "text-muted",
  "bg-surface": "bg-surface",
  "bg-surface-alt": "bg-surface-alt",
  accent: "accent",
  "semantic-success": "success",
  "semantic-warning": "warning",
  "semantic-error": "error",
  "table-border": "table-border",
  "table-header-bg": "table-header-bg",
  "table-stripe": "table-stripe",

  // Spacing
  "grid-base": "grid-base",
  "container-padding": "container-padding",
  "table-cell-y": "table-cell-y",
  "table-cell-x": "table-cell-x",
  "section-gap": "section-gap",
  "paragraph-gap": "paragraph-gap",
  "spacing-xs": "spacing-xs",
  "spacing-sm": "spacing-sm",
  "spacing-md": "spacing-md",
  "spacing-lg": "spacing-lg",

  // Typography
  "font-heading": "font-heading",
  "font-body": "font-body",
  "font-mono": "font-mono",
  "base-size": "font-size-base",
  "line-height": "line-height",
  "letter-spacing": "letter-spacing",

  // Geometry
  "radius-sm": "radius-sm",
  "radius-md": "radius-md",
  "radius-lg": "radius-lg",
  "border-width": "border-width",
} as const;

// =============================================================================
// CSS VARIABLE GENERATOR
// =============================================================================

/**
 * CSSVariableBridge - Generates and injects CSS variables from theme tokens
 */
export class CSSVariableBridge {
  private theme: Theme;
  private cssCache: string | null = null;

  constructor(theme?: Theme) {
    this.theme = theme || designTokenManager.getTheme();
  }

  /**
   * Update the theme
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.cssCache = null;
  }

  /**
   * Generate CSS variable declarations
   */
  generateCSSVariables(): string {
    if (this.cssCache) {
      return this.cssCache;
    }

    const variables: string[] = [];
    const tokens = this.theme.tokens;

    // Color tokens
    for (const [key, value] of Object.entries(tokens.colors)) {
      if (key === "chart-sequence" && Array.isArray(value)) {
        // Handle chart color sequence
        value.forEach((color, index) => {
          variables.push(
            `  ${CSS_VAR_PREFIX}chart-color-${index + 1}: ${color};`,
          );
        });
        variables.push(`  ${CSS_VAR_PREFIX}chart-colors: ${value.join(", ")};`);
      } else if (typeof value === "string") {
        const cssName =
          TOKEN_TO_CSS_MAP[key as keyof typeof TOKEN_TO_CSS_MAP] || key;
        variables.push(`  ${CSS_VAR_PREFIX}${cssName}: ${value};`);
      }
    }

    // Spacing tokens
    for (const [key, value] of Object.entries(tokens.spacing)) {
      if (typeof value === "string") {
        const cssName =
          TOKEN_TO_CSS_MAP[key as keyof typeof TOKEN_TO_CSS_MAP] || key;
        variables.push(`  ${CSS_VAR_PREFIX}${cssName}: ${value};`);
      }
    }

    // Typography tokens
    for (const [key, value] of Object.entries(tokens.typography)) {
      const cssName =
        TOKEN_TO_CSS_MAP[key as keyof typeof TOKEN_TO_CSS_MAP] || key;
      if (typeof value === "string") {
        variables.push(`  ${CSS_VAR_PREFIX}${cssName}: ${value};`);
      } else if (typeof value === "number") {
        // For numeric values like scale-ratio and line-height
        variables.push(`  ${CSS_VAR_PREFIX}${cssName}: ${value};`);
      }
    }

    // Geometry tokens
    if (tokens.geometry) {
      for (const [key, value] of Object.entries(tokens.geometry)) {
        if (typeof value === "string") {
          const cssName =
            TOKEN_TO_CSS_MAP[key as keyof typeof TOKEN_TO_CSS_MAP] || key;
          variables.push(`  ${CSS_VAR_PREFIX}${cssName}: ${value};`);
        }
      }
    }

    // Add computed type scale
    this.addTypeScaleVariables(variables);

    this.cssCache = `:root {\n${variables.join("\n")}\n}`;
    return this.cssCache;
  }

  /**
   * Add type scale CSS variables
   */
  private addTypeScaleVariables(variables: string[]): void {
    const baseSize = parsePT(this.theme.tokens.typography["base-size"]);
    const ratio = this.theme.tokens.typography["scale-ratio"];

    // Generate scale: -2 to 6
    for (let i = -2; i <= 6; i++) {
      const size = Math.round(baseSize * Math.pow(ratio, i) * 100) / 100;
      const name =
        i < 0
          ? `font-size-xs${Math.abs(i) > 1 ? Math.abs(i) : ""}`
          : i === 0
            ? "font-size-base"
            : `font-size-${["sm", "md", "lg", "xl", "2xl", "3xl"][i - 1] || `${i}xl`}`;
      variables.push(`  ${CSS_VAR_PREFIX}${name}: ${size}pt;`);
    }

    // Add heading sizes (h1-h6)
    const headingSizes = [6, 5, 4, 3, 2, 1]; // h1 is largest
    headingSizes.forEach((scaleStep, index) => {
      const size =
        Math.round(baseSize * Math.pow(ratio, scaleStep) * 100) / 100;
      variables.push(`  ${CSS_VAR_PREFIX}font-size-h${index + 1}: ${size}pt;`);
    });
  }

  /**
   * Generate CSS for component theming
   */
  generateComponentCSS(): string {
    return `
${this.generateCSSVariables()}

/* Theme Base Styles */
#pdf-root {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  color: var(--text-main);
  background-color: var(--bg-surface);
}

/* Heading Styles */
#pdf-root h1, #pdf-root h2, #pdf-root h3, 
#pdf-root h4, #pdf-root h5, #pdf-root h6 {
  font-family: var(--font-heading);
  line-height: ${this.theme.tokens.typography["heading-line-height"] || 1.2};
  margin-top: var(--section-gap);
  margin-bottom: var(--paragraph-gap);
}

#pdf-root h1 { font-size: var(--font-size-h1); }
#pdf-root h2 { font-size: var(--font-size-h2); }
#pdf-root h3 { font-size: var(--font-size-h3); }
#pdf-root h4 { font-size: var(--font-size-h4); }
#pdf-root h5 { font-size: var(--font-size-h5); }
#pdf-root h6 { font-size: var(--font-size-h6); }

/* Paragraph Styles */
#pdf-root p {
  margin-bottom: var(--paragraph-gap);
}

/* Table Styles */
#pdf-root table {
  border-collapse: collapse;
  border-color: var(--table-border);
}

#pdf-root th {
  background-color: var(--table-header-bg);
  padding: var(--table-cell-y) var(--table-cell-x);
}

#pdf-root td {
  padding: var(--table-cell-y) var(--table-cell-x);
  border-color: var(--table-border);
}

#pdf-root tr:nth-child(even) {
  background-color: var(--table-stripe);
}

/* Code/Monospace */
#pdf-root code, #pdf-root pre {
  font-family: var(--font-mono);
}

/* Brand Color Utility Classes */
.brand-primary { color: var(--brand-primary); }
.brand-secondary { color: var(--brand-secondary); }
.bg-brand-primary { background-color: var(--brand-primary); }
.bg-brand-secondary { background-color: var(--brand-secondary); }

/* Semantic Color Utility Classes */
.text-success { color: var(--success); }
.text-warning { color: var(--warning); }
.text-error { color: var(--error); }
.text-muted { color: var(--text-muted); }

/* Spacing Utility Classes */
.mt-xs { margin-top: var(--spacing-xs); }
.mt-sm { margin-top: var(--spacing-sm); }
.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }

.mb-xs { margin-bottom: var(--spacing-xs); }
.mb-sm { margin-bottom: var(--spacing-sm); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }

.p-xs { padding: var(--spacing-xs); }
.p-sm { padding: var(--spacing-sm); }
.p-md { padding: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }

/* Container */
.container {
  padding: var(--container-padding);
}

/* Border Radius Utility Classes */
.rounded-sm { border-radius: var(--radius-sm); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
`;
  }

  /**
   * Generate style element for DOM injection
   */
  generateStyleElement(): string {
    return `<style id="pdf-theme-variables">${this.generateComponentCSS()}</style>`;
  }

  /**
   * Get a specific CSS variable value
   */
  getCSSVariable(name: string): string | undefined {
    const css = this.generateCSSVariables();
    const regex = new RegExp(`--${name}:\\s*([^;]+);`);
    const match = css.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Get all chart colors as array
   */
  getChartColors(): HexColor[] {
    return this.theme.tokens.colors["chart-sequence"];
  }

  /**
   * Get CSS variable reference for use in components
   */
  var(name: string): string {
    return `var(--${name})`;
  }
}

// =============================================================================
// STYLED-COMPONENTS HELPER
// =============================================================================

/**
 * Theme object for styled-components ThemeProvider
 */
export function createStyledTheme(
  theme?: Theme,
): Record<string, string | number | string[]> {
  const t = theme || designTokenManager.getTheme();

  return {
    // Colors
    brandPrimary: t.tokens.colors["brand-primary"],
    brandSecondary:
      t.tokens.colors["brand-secondary"] || t.tokens.colors["brand-primary"],
    textMain: t.tokens.colors["text-main"],
    textMuted: t.tokens.colors["text-muted"] || t.tokens.colors["text-main"],
    bgSurface: t.tokens.colors["bg-surface"],
    bgSurfaceAlt:
      t.tokens.colors["bg-surface-alt"] || t.tokens.colors["bg-surface"],
    accent: t.tokens.colors["accent"] || t.tokens.colors["brand-primary"],
    success: t.tokens.colors["semantic-success"] || "#34A853",
    warning: t.tokens.colors["semantic-warning"] || "#FBBC04",
    error: t.tokens.colors["semantic-error"] || "#EA4335",
    chartSequence: t.tokens.colors["chart-sequence"],
    tableBorder: t.tokens.colors["table-border"] || "#DADCE0",
    tableHeaderBg: t.tokens.colors["table-header-bg"] || "#F1F3F4",
    tableStripe: t.tokens.colors["table-stripe"] || "#F8F9FA",

    // Spacing (as numbers in pt)
    gridBase: parsePT(t.tokens.spacing["grid-base"]),
    containerPadding: parsePT(t.tokens.spacing["container-padding"]),
    tableCellY: parsePT(t.tokens.spacing["table-cell-y"]),
    tableCellX: parsePT(
      t.tokens.spacing["table-cell-x"] || t.tokens.spacing["table-cell-y"],
    ),
    sectionGap: parsePT(t.tokens.spacing["section-gap"] || "24pt"),
    paragraphGap: parsePT(t.tokens.spacing["paragraph-gap"] || "12pt"),

    // Typography
    fontHeading: t.tokens.typography["font-heading"],
    fontBody: t.tokens.typography["font-body"],
    fontMono: t.tokens.typography["font-mono"] || "monospace",
    scaleRatio: t.tokens.typography["scale-ratio"],
    baseFontSize: parsePT(t.tokens.typography["base-size"]),
    lineHeight: t.tokens.typography["line-height"],
    headingLineHeight: t.tokens.typography["heading-line-height"] || 1.2,

    // Geometry
    radiusSm: parsePT(t.tokens.geometry?.["radius-sm"] || "2pt"),
    radiusMd: parsePT(t.tokens.geometry?.["radius-md"] || "4pt"),
    radiusLg: parsePT(t.tokens.geometry?.["radius-lg"] || "8pt"),
    borderWidth: parsePT(t.tokens.geometry?.["border-width"] || "1pt"),
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default CSS variable bridge */
export const cssVariableBridge = new CSSVariableBridge();
