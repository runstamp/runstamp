/**
 * Special Page Layouts (Doc 3, Section 4)
 * =======================================
 *
 * Implements cover pages, chapter openers, multi-column layouts,
 * and other special page configurations.
 *
 * Doc 3: "Cover pages often have no headers/footers and need
 * full-bleed backgrounds. Chapter openers often drop the page
 * number and have special top margins."
 */

import {
  LayoutType,
  LayoutOverride,
  CoverPageConfig,
  PT,
  HexColor,
} from "./types";

// =============================================================================
// LAYOUT TYPE DEFINITIONS
// =============================================================================

/** Full layout configuration */
export interface PageLayoutConfig {
  type: LayoutType;
  margins: {
    top: PT;
    right: PT;
    bottom: PT;
    left: PT;
  };
  columns: number;
  columnGap: PT;
  fullBleed: boolean;
  showHeader: boolean;
  showFooter: boolean;
  showPageNumber: boolean;
  orientation: "portrait" | "landscape";
  customCSS?: string;
}

/** Standard layout presets */
const LAYOUT_DEFAULTS: Record<LayoutType, Partial<PageLayoutConfig>> = {
  standard: {
    margins: { top: 72, right: 72, bottom: 72, left: 72 },
    columns: 1,
    fullBleed: false,
    showHeader: true,
    showFooter: true,
    showPageNumber: true,
    orientation: "portrait",
  },
  cover: {
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    columns: 1,
    fullBleed: true,
    showHeader: false,
    showFooter: false,
    showPageNumber: false,
    orientation: "portrait",
  },
  chapter: {
    margins: { top: 144, right: 72, bottom: 72, left: 72 }, // Extra top margin
    columns: 1,
    fullBleed: false,
    showHeader: false, // No header on chapter openers
    showFooter: true,
    showPageNumber: false, // Often omitted on chapter starts
    orientation: "portrait",
  },
  "multi-column": {
    margins: { top: 72, right: 54, bottom: 72, left: 54 },
    columns: 2,
    columnGap: 24,
    fullBleed: false,
    showHeader: true,
    showFooter: true,
    showPageNumber: true,
    orientation: "portrait",
  },
  landscape: {
    margins: { top: 54, right: 72, bottom: 54, left: 72 },
    columns: 1,
    fullBleed: false,
    showHeader: true,
    showFooter: true,
    showPageNumber: true,
    orientation: "landscape",
  },
};

// =============================================================================
// LAYOUT MANAGER
// =============================================================================

/**
 * LayoutManager - Manages page layout configurations
 */
export class LayoutManager {
  private pageLayouts: Map<number, PageLayoutConfig> = new Map();
  private defaultLayout: PageLayoutConfig;

  constructor(defaultType: LayoutType = "standard") {
    this.defaultLayout = this.createLayout(defaultType);
  }

  /**
   * Create a full layout config from type and overrides
   */
  createLayout(
    type: LayoutType,
    overrides?: Partial<PageLayoutConfig>,
  ): PageLayoutConfig {
    const defaults = LAYOUT_DEFAULTS[type] || LAYOUT_DEFAULTS.standard;

    const baseConfig = {
      type,
      margins: { top: 72, right: 72, bottom: 72, left: 72 },
      columns: 1,
      columnGap: 24,
      fullBleed: false,
      showHeader: true,
      showFooter: true,
      showPageNumber: true,
      orientation: "portrait" as const,
      ...defaults,
      ...overrides,
    };

    // Merge margins separately to avoid duplicate property
    baseConfig.margins = {
      ...{ top: 72, right: 72, bottom: 72, left: 72 },
      ...defaults.margins,
      ...overrides?.margins,
    };

    return baseConfig as PageLayoutConfig;
  }

  /**
   * Apply layout override to a page
   */
  setPageLayout(pageNumber: number, override: LayoutOverride): void {
    const layout = this.createLayout(override.type, {
      columns: override.columns,
      columnGap: override.columnGap,
      fullBleed: override.fullBleed,
      margins: override.margins
        ? {
            top: override.margins.top ?? this.defaultLayout.margins.top,
            right: override.margins.right ?? this.defaultLayout.margins.right,
            bottom:
              override.margins.bottom ?? this.defaultLayout.margins.bottom,
            left: override.margins.left ?? this.defaultLayout.margins.left,
          }
        : undefined,
    });

    this.pageLayouts.set(pageNumber, layout);
  }

  /**
   * Get layout for a specific page
   */
  getLayout(pageNumber: number): PageLayoutConfig {
    return this.pageLayouts.get(pageNumber) || this.defaultLayout;
  }

  /**
   * Get CSS for a layout
   */
  getLayoutCSS(layout: PageLayoutConfig): string {
    const { margins, columns, columnGap, orientation } = layout;

    let css = `
      margin: ${margins.top}pt ${margins.right}pt ${margins.bottom}pt ${margins.left}pt;
    `;

    if (columns > 1) {
      css += `
        column-count: ${columns};
        column-gap: ${columnGap}pt;
        column-fill: auto;
      `;
    }

    if (orientation === "landscape") {
      css += `
        width: 100vh;
        height: 100vw;
        transform-origin: top left;
        transform: rotate(-90deg) translateX(-100%);
      `;
    }

    return css;
  }

  /**
   * Generate CSS for all layouts
   */
  generateCSS(): string {
    const css = `
/* Standard page layout */
.page {
  ${this.getLayoutCSS(this.defaultLayout)}
}

/* Cover page layout */
.page-cover {
  margin: 0;
  padding: 0;
}

/* Chapter opener layout */
.page-chapter {
  margin-top: 144pt;
}

/* Multi-column layout */
.page-multi-column {
  column-count: 2;
  column-gap: 24pt;
  column-fill: auto;
}

/* Landscape layout */
.page-landscape {
  width: 100%;
  height: 100%;
}

/* Full bleed background support */
.full-bleed {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: -9pt; /* Extend into bleed area */
}

@media print {
  .page-landscape {
    page: landscape;
  }
  
  @page landscape {
    size: landscape;
  }
}
`;

    return css.trim();
  }

  /**
   * Clear all page layouts
   */
  clear(): void {
    this.pageLayouts.clear();
  }
}

// =============================================================================
// COVER PAGE GENERATOR
// =============================================================================

/**
 * CoverPageGenerator - Creates cover page content
 */
export class CoverPageGenerator {
  /**
   * Generate cover page HTML
   */
  generate(config: CoverPageConfig, pageWidth: PT, pageHeight: PT): string {
    const elements: string[] = [];

    // Background
    if (config.background) {
      if (typeof config.background === "string") {
        elements.push(`
<div class="cover-background full-bleed" style="background-color: ${config.background};"></div>
        `);
      } else if (config.background.url) {
        elements.push(`
<div class="cover-background full-bleed" style="
  background-image: url('${config.background.url}');
  background-size: cover;
  background-position: center;
"></div>
        `);
      }
    }

    // Content wrapper
    elements.push('<div class="cover-content">');

    // Logo
    if (config.logo) {
      elements.push(`
<div class="cover-logo">
  <img src="${config.logo}" alt="Logo" style="max-width: 200pt; max-height: 100pt;" />
</div>
      `);
    }

    // Title
    if (config.title) {
      elements.push(`
<h1 class="cover-title">${config.title}</h1>
      `);
    }

    // Subtitle
    if (config.subtitle) {
      elements.push(`
<p class="cover-subtitle">${config.subtitle}</p>
      `);
    }

    // Date
    if (config.date) {
      elements.push(`
<p class="cover-date">${config.date}</p>
      `);
    }

    // Custom content
    if (config.customContent) {
      elements.push(`
<div class="cover-custom">${config.customContent}</div>
      `);
    }

    elements.push("</div>");

    return `
<div class="page page-cover" style="width: ${pageWidth}pt; height: ${pageHeight}pt; position: relative;">
  ${elements.join("\n")}
</div>`.trim();
  }

  /**
   * Generate CSS for cover pages
   */
  generateCSS(): string {
    return `
.page-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cover-background {
  z-index: 0;
}

.cover-content {
  position: relative;
  z-index: 1;
  padding: 72pt;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.cover-logo {
  margin-bottom: 36pt;
}

.cover-title {
  font-size: 36pt;
  font-weight: bold;
  color: #1A1A2E;
  margin: 0 0 18pt 0;
  line-height: 1.2;
}

.cover-subtitle {
  font-size: 18pt;
  color: #4A4A6A;
  margin: 0 0 36pt 0;
}

.cover-date {
  font-size: 12pt;
  color: #666666;
  margin-top: auto;
  padding-top: 36pt;
}

.cover-custom {
  margin-top: 24pt;
}
`.trim();
  }
}

// =============================================================================
// CHAPTER OPENER GENERATOR
// =============================================================================

/** Chapter opener style */
export interface ChapterOpenerStyle {
  numberFontSize: PT;
  titleFontSize: PT;
  numberColor: HexColor;
  titleColor: HexColor;
  topMargin: PT;
  numberPrefix: string;
  showDivider: boolean;
  dividerColor: HexColor;
}

const DEFAULT_CHAPTER_STYLE: ChapterOpenerStyle = {
  numberFontSize: 48,
  titleFontSize: 28,
  numberColor: "#CCCCCC",
  titleColor: "#1A1A2E",
  topMargin: 144,
  numberPrefix: "Chapter ",
  showDivider: true,
  dividerColor: "#E0E0E0",
};

/**
 * ChapterOpenerGenerator - Creates chapter opener pages
 */
export class ChapterOpenerGenerator {
  private style: ChapterOpenerStyle;

  constructor(style: Partial<ChapterOpenerStyle> = {}) {
    this.style = { ...DEFAULT_CHAPTER_STYLE, ...style };
  }

  /**
   * Generate chapter opener HTML
   */
  generate(chapterNumber: number, title: string, subtitle?: string): string {
    const {
      numberFontSize,
      titleFontSize,
      numberColor,
      titleColor,
      numberPrefix,
      showDivider,
      dividerColor,
    } = this.style;

    const divider = showDivider
      ? `<hr class="chapter-divider" style="border: none; border-top: 1pt solid ${dividerColor}; width: 100pt; margin: 24pt auto;" />`
      : "";

    const subtitleHtml = subtitle
      ? `<p class="chapter-subtitle" style="font-size: 14pt; color: #666666; margin-top: 12pt;">${subtitle}</p>`
      : "";

    return `
<div class="chapter-opener">
  <span class="chapter-number" style="
    font-size: ${numberFontSize}pt;
    color: ${numberColor};
    font-weight: 300;
    letter-spacing: 2pt;
  ">${numberPrefix}${chapterNumber}</span>
  
  ${divider}
  
  <h1 class="chapter-title" style="
    font-size: ${titleFontSize}pt;
    color: ${titleColor};
    font-weight: 600;
    margin-top: 24pt;
    line-height: 1.2;
  ">${title}</h1>
  
  ${subtitleHtml}
</div>`.trim();
  }

  /**
   * Generate CSS for chapter openers
   */
  generateCSS(): string {
    return `
.chapter-opener {
  text-align: center;
  padding-top: ${this.style.topMargin}pt;
}

.chapter-number {
  display: block;
  text-transform: uppercase;
}

.chapter-title {
  margin: 0;
}

.chapter-subtitle {
  margin: 0;
}
`.trim();
  }
}

// =============================================================================
// MULTI-COLUMN LAYOUT
// =============================================================================

/** Column balance mode */
export type ColumnBalance = "auto" | "balance" | "none";

/**
 * MultiColumnLayout - Handles multi-column page layouts
 */
export class MultiColumnLayout {
  private columns: number;
  private gap: PT;
  private balance: ColumnBalance;

  constructor(
    columns: number = 2,
    gap: PT = 24,
    balance: ColumnBalance = "auto",
  ) {
    this.columns = columns;
    this.gap = gap;
    this.balance = balance;
  }

  /**
   * Wrap content in multi-column container
   */
  wrapContent(content: string): string {
    return `
<div class="multi-column-container" style="
  column-count: ${this.columns};
  column-gap: ${this.gap}pt;
  column-fill: ${this.balance === "balance" ? "balance" : "auto"};
">
  ${content}
</div>`.trim();
  }

  /**
   * Create column break
   */
  createColumnBreak(): string {
    return '<div style="break-before: column;"></div>';
  }

  /**
   * Create span-all element (breaks out of columns)
   */
  createSpanAll(content: string): string {
    return `
<div style="column-span: all; margin: 12pt 0;">
  ${content}
</div>`.trim();
  }

  /**
   * Generate CSS
   */
  generateCSS(): string {
    return `
.multi-column-container {
  column-count: ${this.columns};
  column-gap: ${this.gap}pt;
  column-rule: 1pt solid #E0E0E0;
}

.multi-column-container > * {
  break-inside: avoid;
}

.span-all {
  column-span: all;
}
`.trim();
  }
}

// =============================================================================
// PAGE LAYOUT PROCESSOR
// =============================================================================

/**
 * PageLayoutProcessor - Full pipeline for page layouts
 */
export class PageLayoutProcessor {
  private layoutManager: LayoutManager;
  private coverGenerator: CoverPageGenerator;
  private chapterGenerator: ChapterOpenerGenerator;

  constructor() {
    this.layoutManager = new LayoutManager();
    this.coverGenerator = new CoverPageGenerator();
    this.chapterGenerator = new ChapterOpenerGenerator();
  }

  /**
   * Set layout for a page
   */
  setPageLayout(pageNumber: number, override: LayoutOverride): void {
    this.layoutManager.setPageLayout(pageNumber, override);
  }

  /**
   * Get layout for a page
   */
  getLayout(pageNumber: number): PageLayoutConfig {
    return this.layoutManager.getLayout(pageNumber);
  }

  /**
   * Generate cover page
   */
  generateCover(
    config: CoverPageConfig,
    pageWidth: PT,
    pageHeight: PT,
  ): string {
    return this.coverGenerator.generate(config, pageWidth, pageHeight);
  }

  /**
   * Generate chapter opener
   */
  generateChapterOpener(
    chapterNumber: number,
    title: string,
    subtitle?: string,
  ): string {
    return this.chapterGenerator.generate(chapterNumber, title, subtitle);
  }

  /**
   * Generate all CSS
   */
  generateCSS(): string {
    return [
      this.layoutManager.generateCSS(),
      this.coverGenerator.generateCSS(),
      this.chapterGenerator.generateCSS(),
    ].join("\n\n");
  }

  /**
   * Reset processor
   */
  reset(): void {
    this.layoutManager.clear();
  }
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const LAYOUT_PRESETS = {
  /** Report-style cover */
  reportCover: {
    type: "cover" as const,
    fullBleed: true,
  } as LayoutOverride,

  /** Chapter opener */
  chapterOpener: {
    type: "chapter" as const,
    margins: { top: 144 },
  } as LayoutOverride,

  /** Two-column text */
  twoColumn: {
    type: "multi-column" as const,
    columns: 2,
    columnGap: 24,
  } as LayoutOverride,

  /** Three-column narrow */
  threeColumn: {
    type: "multi-column" as const,
    columns: 3,
    columnGap: 18,
  } as LayoutOverride,

  /** Landscape data page */
  landscapeData: {
    type: "landscape" as const,
    margins: { top: 36, right: 54, bottom: 36, left: 54 },
  } as LayoutOverride,
};

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default layout manager */
export const layoutManager = new LayoutManager();

/** Default cover generator */
export const coverPageGenerator = new CoverPageGenerator();

/** Default chapter generator */
export const chapterOpenerGenerator = new ChapterOpenerGenerator();
