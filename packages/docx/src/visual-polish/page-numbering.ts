/**
 * Page N of M Resolver (Doc 3, Section 3)
 * ========================================
 *
 * Implements three-pass page number resolution for accurate
 * "Page X of Y" formatting.
 *
 * Doc 3: "Because PDF rendering is usually a single pass, we use
 * a three-pass strategy: measure → paginate → resolve placeholders."
 */

import {
  PageNumberingConfig,
  ResolvedPageNumber,
  NumberingStyle,
  PT,
} from "./types";

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Format a number in the specified style
 */
export function formatPageNumber(num: number, style: NumberingStyle): string {
  switch (style) {
    case "roman-lower":
      return toRomanNumeral(num).toLowerCase();
    case "roman-upper":
      return toRomanNumeral(num);
    case "alpha-lower":
      return toAlphaNumeral(num).toLowerCase();
    case "alpha-upper":
      return toAlphaNumeral(num);
    case "arabic":
    default:
      return num.toString();
  }
}

/**
 * Convert number to Roman numeral
 */
function toRomanNumeral(num: number): string {
  if (num <= 0 || num > 3999) {
    return num.toString();
  }

  const romanNumerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let result = "";
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }

  return result;
}

/**
 * Convert number to alpha (A, B, C...)
 */
function toAlphaNumeral(num: number): string {
  if (num <= 0) return num.toString();

  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

// =============================================================================
// PAGE NUMBERING CONFIG
// =============================================================================

const DEFAULT_CONFIG: PageNumberingConfig = {
  format: "Page {{PAGE}} of {{TOTAL}}",
  style: "arabic",
  startNumber: 1,
  skipPages: [],
  tabularNums: true,
};

// =============================================================================
// PAGE NUMBER PLACEHOLDER
// =============================================================================

/** Placeholder markers for three-pass resolve */
export const PLACEHOLDERS = {
  CURRENT: "{{PAGE}}",
  TOTAL: "{{TOTAL}}",
  SECTION: "{{SECTION}}",
} as const;

/** Regex to match placeholders */
const PLACEHOLDER_REGEX = /\{\{(PAGE|TOTAL|SECTION)\}\}/g;

// =============================================================================
// PAGE NUMBER RESOLVER
// =============================================================================

/**
 * PageNumberResolver - Three-pass page number resolution
 */
export class PageNumberResolver {
  private config: PageNumberingConfig;
  private totalPages: number = 0;
  private sectionPages: Map<string, { start: number; end: number }> = new Map();

  constructor(config: Partial<PageNumberingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Pass 1: Set total page count after pagination
   */
  setTotalPages(total: number): void {
    this.totalPages = total;
  }

  /**
   * Register a section's page range
   */
  registerSection(sectionId: string, startPage: number, endPage: number): void {
    this.sectionPages.set(sectionId, { start: startPage, end: endPage });
  }

  /**
   * Calculate effective page number (accounting for start offset and skips)
   */
  private getEffectivePageNumber(pageNumber: number): number {
    const effective = pageNumber + (this.config.startNumber - 1);

    // Account for skipped pages before this one
    const skipsBefore = (this.config.skipPages || []).filter(
      (skip) => skip < pageNumber,
    ).length;

    return effective - skipsBefore;
  }

  /**
   * Pass 2: Generate placeholder HTML for a page
   */
  generatePlaceholder(pageNumber: number): string {
    // Check if this page should be skipped
    if (this.config.skipPages?.includes(pageNumber)) {
      return "";
    }

    // Generate placeholder HTML that will be resolved in pass 3
    const tabularClass = this.config.tabularNums ? "tabular-nums" : "";

    return `<span class="page-number ${tabularClass}" data-page="${pageNumber}" data-placeholder="true">${this.config.format}</span>`;
  }

  /**
   * Pass 3: Resolve all placeholders with actual values
   */
  resolvePlaceholders(html: string): string {
    // Find all placeholder spans and resolve them
    return html.replace(
      /<span[^>]*data-page="(\d+)"[^>]*data-placeholder="true"[^>]*>([^<]*)<\/span>/g,
      (match, pageStr, format) => {
        const pageNumber = parseInt(pageStr, 10);
        const resolved = this.resolveFormat(format, pageNumber);
        return match
          .replace('data-placeholder="true"', "")
          .replace(format, resolved);
      },
    );
  }

  /**
   * Resolve a format string with actual values
   */
  resolveFormat(format: string, pageNumber: number): string {
    const effectiveNumber = this.getEffectivePageNumber(pageNumber);

    return format.replace(PLACEHOLDER_REGEX, (match, placeholder) => {
      switch (placeholder) {
        case "PAGE":
          return formatPageNumber(effectiveNumber, this.config.style);
        case "TOTAL":
          return formatPageNumber(this.totalPages, this.config.style);
        case "SECTION":
          return this.getSectionPageNumber(pageNumber);
        default:
          return match;
      }
    });
  }

  /**
   * Get page number within current section
   */
  private getSectionPageNumber(pageNumber: number): string {
    for (const range of this.sectionPages.values()) {
      if (pageNumber >= range.start && pageNumber <= range.end) {
        const sectionPage = pageNumber - range.start + 1;
        return formatPageNumber(sectionPage, this.config.style);
      }
    }
    return formatPageNumber(pageNumber, this.config.style);
  }

  /**
   * Get resolved page number info
   */
  getPageInfo(pageNumber: number): ResolvedPageNumber {
    const current = this.getEffectivePageNumber(pageNumber);
    const formatted = this.resolveFormat(this.config.format, pageNumber);

    return {
      current,
      total: this.totalPages,
      formatted,
    };
  }

  /**
   * Generate CSS for tabular numbers
   */
  generateCSS(): string {
    return `
.page-number {
  white-space: nowrap;
}

.page-number.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

@media print {
  .page-number {
    /* Allow print stylesheets to use CSS counters */
  }
}
`.trim();
  }

  /**
   * Reset resolver for new document
   */
  reset(): void {
    this.totalPages = 0;
    this.sectionPages.clear();
  }
}

// =============================================================================
// MULTI-SECTION NUMBERING
// =============================================================================

/** Section numbering configuration */
export interface SectionNumberingConfig {
  sectionId: string;
  style: NumberingStyle;
  startNumber: number;
  prefix?: string;
  suffix?: string;
}

/**
 * MultiSectionNumberResolver - Handle different numbering in different sections
 *
 * Common use: Roman numerals for front matter, Arabic for body, etc.
 */
export class MultiSectionNumberResolver {
  private sections: Map<string, PageNumberResolver> = new Map();
  private pageToSection: Map<number, string> = new Map();
  private defaultResolver: PageNumberResolver;

  constructor(defaultConfig: Partial<PageNumberingConfig> = {}) {
    this.defaultResolver = new PageNumberResolver(defaultConfig);
  }

  /**
   * Register a section with its numbering configuration
   */
  registerSection(
    config: SectionNumberingConfig,
    startPage: number,
    endPage: number,
  ): void {
    const resolver = new PageNumberResolver({
      format: (config.prefix || "") + "{{PAGE}}" + (config.suffix || ""),
      style: config.style,
      startNumber: config.startNumber,
      tabularNums: true,
    });

    this.sections.set(config.sectionId, resolver);

    // Map pages to sections
    for (let p = startPage; p <= endPage; p++) {
      this.pageToSection.set(p, config.sectionId);
    }
  }

  /**
   * Set total pages
   */
  setTotalPages(total: number): void {
    this.defaultResolver.setTotalPages(total);
    for (const resolver of this.sections.values()) {
      resolver.setTotalPages(total);
    }
  }

  /**
   * Get page number info
   */
  getPageInfo(pageNumber: number): ResolvedPageNumber {
    const sectionId = this.pageToSection.get(pageNumber);
    const resolver = sectionId
      ? this.sections.get(sectionId) || this.defaultResolver
      : this.defaultResolver;

    return resolver.getPageInfo(pageNumber);
  }

  /**
   * Generate placeholder
   */
  generatePlaceholder(pageNumber: number): string {
    const sectionId = this.pageToSection.get(pageNumber);
    const resolver = sectionId
      ? this.sections.get(sectionId) || this.defaultResolver
      : this.defaultResolver;

    return resolver.generatePlaceholder(pageNumber);
  }

  /**
   * Reset for new document
   */
  reset(): void {
    this.sections.clear();
    this.pageToSection.clear();
    this.defaultResolver.reset();
  }
}

// =============================================================================
// PAGE NUMBER RENDERER
// =============================================================================

/** Page number position */
export type PageNumberPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** Page number style */
export interface PageNumberStyle {
  fontSize: PT;
  fontFamily: string;
  color: string;
  marginTop?: PT;
  marginBottom?: PT;
  marginLeft?: PT;
  marginRight?: PT;
}

const DEFAULT_PAGE_NUMBER_STYLE: PageNumberStyle = {
  fontSize: 10,
  fontFamily: "sans-serif",
  color: "#666666",
};

/**
 * PageNumberRenderer - Renders page numbers with styling
 */
export class PageNumberRenderer {
  private resolver: PageNumberResolver;
  private style: PageNumberStyle;
  private position: PageNumberPosition;

  constructor(
    config: Partial<PageNumberingConfig> = {},
    style: Partial<PageNumberStyle> = {},
    position: PageNumberPosition = "bottom-center",
  ) {
    this.resolver = new PageNumberResolver(config);
    this.style = { ...DEFAULT_PAGE_NUMBER_STYLE, ...style };
    this.position = position;
  }

  /**
   * Get resolver
   */
  getResolver(): PageNumberResolver {
    return this.resolver;
  }

  /**
   * Render page number element
   */
  render(pageNumber: number): string {
    const info = this.resolver.getPageInfo(pageNumber);
    const {
      fontSize,
      fontFamily,
      color,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
    } = this.style;

    const positionCSS = this.getPositionCSS();
    const marginCSS = [
      marginTop !== undefined ? `margin-top: ${marginTop}pt` : "",
      marginBottom !== undefined ? `margin-bottom: ${marginBottom}pt` : "",
      marginLeft !== undefined ? `margin-left: ${marginLeft}pt` : "",
      marginRight !== undefined ? `margin-right: ${marginRight}pt` : "",
    ]
      .filter(Boolean)
      .join("; ");

    return `
<div class="page-number-container" style="
  ${positionCSS}
  font-size: ${fontSize}pt;
  font-family: ${fontFamily};
  color: ${color};
  ${marginCSS}
">
  <span class="page-number tabular-nums">${info.formatted}</span>
</div>`.trim();
  }

  /**
   * Get CSS for position
   */
  private getPositionCSS(): string {
    const positions: Record<PageNumberPosition, string> = {
      "top-left": "text-align: left;",
      "top-center": "text-align: center;",
      "top-right": "text-align: right;",
      "bottom-left": "text-align: left;",
      "bottom-center": "text-align: center;",
      "bottom-right": "text-align: right;",
    };

    return positions[this.position] || "text-align: center;";
  }

  /**
   * Generate full CSS
   */
  generateCSS(): string {
    return `
${this.resolver.generateCSS()}

.page-number-container {
  width: 100%;
  box-sizing: border-box;
}
`.trim();
  }
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const PAGE_NUMBERING_PRESETS = {
  /** Simple page number */
  simple: {
    format: "{{PAGE}}",
    style: "arabic" as const,
    startNumber: 1,
    tabularNums: true,
  } satisfies PageNumberingConfig,

  /** Page X of Y */
  pageOfTotal: {
    format: "Page {{PAGE}} of {{TOTAL}}",
    style: "arabic" as const,
    startNumber: 1,
    tabularNums: true,
  } satisfies PageNumberingConfig,

  /** Roman numerals (for front matter) */
  romanFrontMatter: {
    format: "{{PAGE}}",
    style: "roman-lower" as const,
    startNumber: 1,
    tabularNums: false,
  } satisfies PageNumberingConfig,

  /** Dash-wrapped (- 5 -) */
  dashWrapped: {
    format: "— {{PAGE}} —",
    style: "arabic" as const,
    startNumber: 1,
    tabularNums: true,
  } satisfies PageNumberingConfig,
};

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default page number resolver */
export const pageNumberResolver = new PageNumberResolver();
