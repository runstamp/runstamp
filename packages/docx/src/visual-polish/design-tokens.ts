/**
 * Design Token System (Doc 1, Section 2)
 * ======================================
 *
 * Implements the SOTA Token Schema for enterprise-grade theming.
 * Supports print-safe units (pt, mm) and ensures layout consistency
 * regardless of screen resolution.
 */

import { DOCXError, DOCXErrorCode } from "../errors.js";
import {
  Theme,
  ThemeTokens,
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  HexColor,
  RGBColor,
  PT,
} from "./types";

// =============================================================================
// DEFAULT THEMES
// =============================================================================

/** Default enterprise light theme */
export const DEFAULT_THEME: Theme = {
  theme_id: "enterprise-light-default",
  name: "Enterprise Light",
  description: "Clean, professional light theme for business documents",
  tokens: {
    colors: {
      "brand-primary": "#1A73E8",
      "brand-secondary": "#4285F4",
      "text-main": "#202124",
      "text-muted": "#5F6368",
      "bg-surface": "#FFFFFF",
      "bg-surface-alt": "#F8F9FA",
      accent: "#1A73E8",
      "semantic-success": "#34A853",
      "semantic-warning": "#FBBC04",
      "semantic-error": "#EA4335",
      "chart-sequence": [
        "#1A73E8",
        "#34A853",
        "#FBBC04",
        "#EA4335",
        "#9334E6",
        "#00ACC1",
      ],
      "table-border": "#DADCE0",
      "table-header-bg": "#F1F3F4",
      "table-stripe": "#F8F9FA",
    },
    spacing: {
      "grid-base": "4pt",
      "container-padding": "24pt",
      "table-cell-y": "8pt",
      "table-cell-x": "12pt",
      "section-gap": "24pt",
      "paragraph-gap": "12pt",
      "spacing-xs": "4pt",
      "spacing-sm": "8pt",
      "spacing-md": "16pt",
      "spacing-lg": "32pt",
    },
    typography: {
      "font-heading": "Inter-Bold, Helvetica-Bold, Arial-Bold, sans-serif",
      "font-body": "Inter-Regular, Helvetica, Arial, sans-serif",
      "font-mono": "SF Mono, Consolas, monospace",
      "scale-ratio": 1.25,
      "base-size": "11pt",
      "line-height": 1.5,
      "letter-spacing": "0",
      "heading-line-height": 1.2,
      "font-weight-normal": 400,
      "font-weight-bold": 700,
    },
    geometry: {
      "radius-sm": "2pt",
      "radius-md": "4pt",
      "radius-lg": "8pt",
      "border-width": "1pt",
    },
  },
};

/** Enterprise dark theme */
export const DARK_THEME: Theme = {
  theme_id: "enterprise-dark-2026",
  name: "Enterprise Dark",
  description: "Professional dark theme for modern documents",
  tokens: {
    colors: {
      "brand-primary": "#8AB4F8",
      "brand-secondary": "#669DF6",
      "text-main": "#E8EAED",
      "text-muted": "#9AA0A6",
      "bg-surface": "#202124",
      "bg-surface-alt": "#292A2D",
      accent: "#8AB4F8",
      "semantic-success": "#81C995",
      "semantic-warning": "#FDD663",
      "semantic-error": "#F28B82",
      "chart-sequence": [
        "#8AB4F8",
        "#81C995",
        "#FDD663",
        "#F28B82",
        "#C58AF9",
        "#78D9EC",
      ],
      "table-border": "#3C4043",
      "table-header-bg": "#292A2D",
      "table-stripe": "#35363A",
    },
    spacing: {
      "grid-base": "4pt",
      "container-padding": "24pt",
      "table-cell-y": "8pt",
      "table-cell-x": "12pt",
      "section-gap": "24pt",
      "paragraph-gap": "12pt",
      "spacing-xs": "4pt",
      "spacing-sm": "8pt",
      "spacing-md": "16pt",
      "spacing-lg": "32pt",
    },
    typography: {
      "font-heading": "Inter-Bold, Helvetica-Bold, Arial-Bold, sans-serif",
      "font-body": "Inter-Regular, Helvetica, Arial, sans-serif",
      "font-mono": "SF Mono, Consolas, monospace",
      "scale-ratio": 1.25,
      "base-size": "11pt",
      "line-height": 1.5,
      "letter-spacing": "0",
      "heading-line-height": 1.2,
      "font-weight-normal": 400,
      "font-weight-bold": 700,
    },
    geometry: {
      "radius-sm": "2pt",
      "radius-md": "4pt",
      "radius-lg": "8pt",
      "border-width": "1pt",
    },
  },
};

/** Compact theme (9pt font) */
export const COMPACT_THEME: Theme = {
  theme_id: "enterprise-compact",
  name: "Enterprise Compact",
  description: "Compact theme for data-dense documents",
  tokens: {
    colors: { ...DEFAULT_THEME.tokens.colors },
    spacing: {
      "grid-base": "3pt",
      "container-padding": "18pt",
      "table-cell-y": "4pt",
      "table-cell-x": "8pt",
      "section-gap": "16pt",
      "paragraph-gap": "8pt",
      "spacing-xs": "3pt",
      "spacing-sm": "6pt",
      "spacing-md": "12pt",
      "spacing-lg": "24pt",
    },
    typography: {
      "font-heading": "Inter-Bold, Helvetica-Bold, Arial-Bold, sans-serif",
      "font-body": "Inter-Regular, Helvetica, Arial, sans-serif",
      "font-mono": "SF Mono, Consolas, monospace",
      "scale-ratio": 1.2,
      "base-size": "9pt",
      "line-height": 1.4,
      "letter-spacing": "0",
      "heading-line-height": 1.15,
      "font-weight-normal": 400,
      "font-weight-bold": 700,
    },
    geometry: {
      "radius-sm": "1pt",
      "radius-md": "2pt",
      "radius-lg": "4pt",
      "border-width": "0.5pt",
    },
  },
};

/** Spacious theme (12pt font) */
export const SPACIOUS_THEME: Theme = {
  theme_id: "enterprise-spacious",
  name: "Enterprise Spacious",
  description: "Spacious theme for accessibility and readability",
  tokens: {
    colors: { ...DEFAULT_THEME.tokens.colors },
    spacing: {
      "grid-base": "6pt",
      "container-padding": "36pt",
      "table-cell-y": "12pt",
      "table-cell-x": "16pt",
      "section-gap": "36pt",
      "paragraph-gap": "18pt",
      "spacing-xs": "6pt",
      "spacing-sm": "12pt",
      "spacing-md": "24pt",
      "spacing-lg": "48pt",
    },
    typography: {
      "font-heading": "Inter-Bold, Helvetica-Bold, Arial-Bold, sans-serif",
      "font-body": "Inter-Regular, Helvetica, Arial, sans-serif",
      "font-mono": "SF Mono, Consolas, monospace",
      "scale-ratio": 1.333,
      "base-size": "12pt",
      "line-height": 1.6,
      "letter-spacing": "0.02em",
      "heading-line-height": 1.25,
      "font-weight-normal": 400,
      "font-weight-bold": 700,
    },
    geometry: {
      "radius-sm": "3pt",
      "radius-md": "6pt",
      "radius-lg": "12pt",
      "border-width": "1pt",
    },
  },
};

// =============================================================================
// THEME REGISTRY
// =============================================================================

/** Theme registry for quick lookup */
export const THEME_REGISTRY: Map<string, Theme> = new Map([
  ["enterprise-light-default", DEFAULT_THEME],
  ["enterprise-dark-2026", DARK_THEME],
  ["enterprise-compact", COMPACT_THEME],
  ["enterprise-spacious", SPACIOUS_THEME],
]);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse a PT value from string (e.g., "12pt" -> 12)
 */
export function parsePT(value: string): PT {
  const match = value.match(/^([\d.]+)\s*(pt)?$/i);
  if (match) {
    return parseFloat(match[1]);
  }
  throw new DOCXError(DOCXErrorCode.STYLE_INVALID, `Invalid PT value: ${value}`, {
    recovery: "Use a finite point value such as \"12pt\" or \"12\".",
    context: { value },
  });
}

/**
 * Format a PT value to string (e.g., 12 -> "12pt")
 */
export function formatPT(value: PT): string {
  return `${value}pt`;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: HexColor): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  // Handle shorthand (#RGB)
  const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (shortResult) {
    return {
      r: parseInt(shortResult[1] + shortResult[1], 16),
      g: parseInt(shortResult[2] + shortResult[2], 16),
      b: parseInt(shortResult[3] + shortResult[3], 16),
    };
  }
  throw new DOCXError(DOCXErrorCode.INVALID_COLOR, `Invalid hex color: ${hex}`, {
    recovery: "Use a 3- or 6-digit hex color such as \"#0f8\" or \"#00ff88\".",
    context: { hex },
  });
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGBColor): HexColor {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Calculate relative luminance for contrast checking
 * (WCAG 2.1 formula)
 */
export function calculateLuminance(rgb: RGBColor): number {
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linearRGB = sRGB.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];
}

/**
 * Calculate contrast ratio between two colors
 * (WCAG 2.1 formula)
 */
export function calculateContrastRatio(
  color1: HexColor,
  color2: HexColor,
): number {
  const lum1 = calculateLuminance(hexToRgb(color1));
  const lum2 = calculateLuminance(hexToRgb(color2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWCAGAA(color1: HexColor, color2: HexColor): boolean {
  return calculateContrastRatio(color1, color2) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAGAAA(color1: HexColor, color2: HexColor): boolean {
  return calculateContrastRatio(color1, color2) >= 7;
}

/**
 * Calculate type scale sizes based on ratio
 */
export function calculateTypeScale(
  baseSize: PT,
  ratio: number,
  steps: number = 6,
): PT[] {
  const sizes: PT[] = [];
  for (let i = -2; i <= steps; i++) {
    sizes.push(Math.round(baseSize * Math.pow(ratio, i) * 100) / 100);
  }
  return sizes;
}

// =============================================================================
// DESIGN TOKEN MANAGER
// =============================================================================

/**
 * DesignTokenManager - Manages theme tokens and provides computed values
 */
export class DesignTokenManager {
  private theme: Theme;
  private typeScale: PT[];

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.typeScale = this.computeTypeScale();
  }

  /**
   * Get the current theme
   */
  getTheme(): Theme {
    return this.theme;
  }

  /**
   * Set a new theme
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.typeScale = this.computeTypeScale();
  }

  /**
   * Load theme by ID from registry
   */
  loadTheme(themeId: string): boolean {
    const theme = THEME_REGISTRY.get(themeId);
    if (theme) {
      this.setTheme(theme);
      return true;
    }
    return false;
  }

  /**
   * Get a color token
   */
  getColor(key: keyof ColorTokens): HexColor | HexColor[] | undefined {
    return this.theme.tokens.colors[key];
  }

  /**
   * Get a spacing token as PT value
   */
  getSpacing(key: keyof SpacingTokens): PT | undefined {
    const value = this.theme.tokens.spacing[key];
    return value ? parsePT(value) : undefined;
  }

  /**
   * Get a typography token
   */
  getTypography<K extends keyof TypographyTokens>(
    key: K,
  ): TypographyTokens[K] | undefined {
    return this.theme.tokens.typography[key];
  }

  /**
   * Get the grid base unit
   */
  getGridBase(): PT {
    return parsePT(this.theme.tokens.spacing["grid-base"]);
  }

  /**
   * Get the base font size
   */
  getBaseFontSize(): PT {
    return parsePT(this.theme.tokens.typography["base-size"]);
  }

  /**
   * Get computed type scale
   */
  getTypeScale(): PT[] {
    return this.typeScale;
  }

  /**
   * Get font size for heading level
   */
  getHeadingSize(level: 1 | 2 | 3 | 4 | 5 | 6): PT {
    // Level 1 = largest, Level 6 = smallest
    const index = this.typeScale.length - level;
    return this.typeScale[Math.max(0, index)] || this.getBaseFontSize();
  }

  /**
   * Get chart color at index (wraps around)
   */
  getChartColor(index: number): HexColor {
    const sequence = this.theme.tokens.colors["chart-sequence"];
    return sequence[index % sequence.length];
  }

  /**
   * Check contrast between text and background
   */
  checkTextContrast(): { passes: boolean; ratio: number } {
    const textColor = this.theme.tokens.colors["text-main"];
    const bgColor = this.theme.tokens.colors["bg-surface"];
    const ratio = calculateContrastRatio(textColor, bgColor);
    return {
      passes: ratio >= 4.5,
      ratio,
    };
  }

  /**
   * Compute type scale from base size and ratio
   */
  private computeTypeScale(): PT[] {
    const baseSize = this.getBaseFontSize();
    const ratio = this.theme.tokens.typography["scale-ratio"];
    return calculateTypeScale(baseSize, ratio);
  }

  /**
   * Merge partial theme tokens
   */
  mergeTokens(partialTokens: Partial<ThemeTokens>): void {
    if (partialTokens.colors) {
      this.theme.tokens.colors = {
        ...this.theme.tokens.colors,
        ...partialTokens.colors,
      };
    }
    if (partialTokens.spacing) {
      this.theme.tokens.spacing = {
        ...this.theme.tokens.spacing,
        ...partialTokens.spacing,
      };
    }
    if (partialTokens.typography) {
      this.theme.tokens.typography = {
        ...this.theme.tokens.typography,
        ...partialTokens.typography,
      };
      this.typeScale = this.computeTypeScale();
    }
    if (partialTokens.geometry) {
      this.theme.tokens.geometry = {
        ...this.theme.tokens.geometry,
        ...partialTokens.geometry,
      };
    }
  }

  /**
   * Export tokens as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.theme, null, 2);
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: string): DesignTokenManager {
    const theme = JSON.parse(json) as Theme;
    return new DesignTokenManager(theme);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default design token manager instance */
export const designTokenManager = new DesignTokenManager();
