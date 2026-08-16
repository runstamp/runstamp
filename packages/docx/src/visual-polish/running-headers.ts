/**
 * Running Headers (Doc 3, Section 2)
 * ==================================
 *
 * Implements contextual running headers with section tracking
 * and content bridge pattern.
 *
 * Doc 3: "Running headers pull their text from the nearest
 * heading visible on a page, using a content-bridge attribute."
 */

import { SectionMarker, RunningHeaderConfig, PT, HexColor } from "./types";

// =============================================================================
// SECTION MARKER SCANNER
// =============================================================================

/**
 * SectionMarkerScanner - Extracts section markers from content
 */
export class SectionMarkerScanner {
  private markers: SectionMarker[] = [];
  private markerIdCounter = 0;

  /**
   * Scan HTML content for section markers
   *
   * Looks for elements with data-section attribute or heading elements.
   */
  scanContent(html: string): SectionMarker[] {
    const markers: SectionMarker[] = [];

    // Match heading tags with content-bridge or data-section
    const headingRegex =
      /<h([1-6])[^>]*(?:data-section|class="[^"]*section[^"]*")[^>]*>([^<]+)<\/h\1>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      const title = match[2].trim();

      markers.push({
        id: `section-${++this.markerIdCounter}`,
        title,
        level,
        startPage: 0, // Will be set during pagination
        selector: `h${level}`,
      });
    }

    // Also scan for explicit section markers
    const sectionRegex =
      /<[^>]+data-section-title="([^"]+)"[^>]*data-section-level="(\d)"[^>]*>/gi;

    while ((match = sectionRegex.exec(html)) !== null) {
      const title = match[1];
      const level = parseInt(match[2], 10);

      markers.push({
        id: `section-${++this.markerIdCounter}`,
        title,
        level,
        startPage: 0,
      });
    }

    this.markers = markers;
    return markers;
  }

  /**
   * Create a section marker from a heading element info
   */
  createMarker(
    title: string,
    level: number,
    pageNumber: number,
  ): SectionMarker {
    const marker: SectionMarker = {
      id: `section-${++this.markerIdCounter}`,
      title,
      level,
      startPage: pageNumber,
    };

    this.markers.push(marker);
    return marker;
  }

  /**
   * Get all markers
   */
  getMarkers(): SectionMarker[] {
    return [...this.markers];
  }

  /**
   * Clear markers
   */
  clear(): void {
    this.markers = [];
    this.markerIdCounter = 0;
  }
}

// =============================================================================
// PAGE SECTION TRACKER
// =============================================================================

interface PageSectionInfo {
  pageNumber: number;
  sectionsOnPage: SectionMarker[];
  firstSection?: SectionMarker;
  lastSection?: SectionMarker;
  startsOnPage?: SectionMarker;
}

/**
 * PageSectionTracker - Tracks which sections appear on which pages
 */
export class PageSectionTracker {
  private pageInfo: Map<number, PageSectionInfo> = new Map();

  /**
   * Register a section appearing on a page
   */
  registerSection(
    marker: SectionMarker,
    pageNumber: number,
    startsOnPage: boolean = false,
  ): void {
    let info = this.pageInfo.get(pageNumber);

    if (!info) {
      info = {
        pageNumber,
        sectionsOnPage: [],
      };
      this.pageInfo.set(pageNumber, info);
    }

    info.sectionsOnPage.push(marker);

    if (!info.firstSection) {
      info.firstSection = marker;
    }
    info.lastSection = marker;

    if (startsOnPage) {
      info.startsOnPage = marker;
    }
  }

  /**
   * Get sections for a page
   */
  getSectionsForPage(pageNumber: number): PageSectionInfo | undefined {
    return this.pageInfo.get(pageNumber);
  }

  /**
   * Get the most relevant section for running header
   */
  getHeaderSection(
    pageNumber: number,
    rule: RunningHeaderConfig["priorityRule"],
  ): SectionMarker | undefined {
    const info = this.pageInfo.get(pageNumber);
    if (!info) return undefined;

    switch (rule) {
      case "starts-on-page":
        return info.startsOnPage || info.firstSection;
      case "last-on-page":
        return info.lastSection;
      case "first-on-page":
      default:
        return info.firstSection;
    }
  }

  /**
   * Find the current section for any page (looks back if needed)
   */
  findCurrentSection(pageNumber: number): SectionMarker | undefined {
    // First check this page
    let info = this.pageInfo.get(pageNumber);
    if (info?.firstSection) {
      return info.firstSection;
    }

    // Look back to find the last section
    for (let p = pageNumber - 1; p >= 1; p--) {
      info = this.pageInfo.get(p);
      if (info?.lastSection) {
        return info.lastSection;
      }
    }

    return undefined;
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.pageInfo.clear();
  }
}

// =============================================================================
// RUNNING HEADER GENERATOR
// =============================================================================

/** Running header styles */
export interface RunningHeaderStyle {
  fontSize: PT;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  color: HexColor;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing: PT;
  align: "left" | "center" | "right";
  paddingBottom: PT;
  borderBottom?: {
    width: PT;
    color: HexColor;
  };
}

const DEFAULT_STYLE: RunningHeaderStyle = {
  fontSize: 9,
  fontFamily: "sans-serif",
  fontWeight: "normal",
  color: "#666666",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  align: "left",
  paddingBottom: 6,
  borderBottom: {
    width: 0.5,
    color: "#CCCCCC",
  },
};

/**
 * RunningHeaderGenerator - Creates running header content
 */
export class RunningHeaderGenerator {
  private config: RunningHeaderConfig;
  private style: RunningHeaderStyle;
  private tracker: PageSectionTracker;

  constructor(
    config: RunningHeaderConfig,
    style: Partial<RunningHeaderStyle> = {},
    tracker?: PageSectionTracker,
  ) {
    this.config = config;
    this.style = { ...DEFAULT_STYLE, ...style };
    this.tracker = tracker || new PageSectionTracker();
  }

  /**
   * Get the page section tracker
   */
  getTracker(): PageSectionTracker {
    return this.tracker;
  }

  /**
   * Generate running header for a page
   */
  generateHeader(
    pageNumber: number,
    totalPages: number,
    documentTitle?: string,
  ): string | null {
    // Check if header should be shown
    if (!this.config.showOnFirstPage && pageNumber === 1) {
      return null;
    }

    // Get section for this page
    const section = this.tracker.getHeaderSection(
      pageNumber,
      this.config.priorityRule,
    );

    // Check if section should be excluded
    if (section && this.config.excludeLevels?.includes(section.level)) {
      // Fall back to finding another section
      const fallbackSection = this.tracker.findCurrentSection(pageNumber);
      if (
        !fallbackSection ||
        this.config.excludeLevels?.includes(fallbackSection.level)
      ) {
        return null;
      }
      return this.renderHeader(
        this.formatTemplate(
          fallbackSection,
          pageNumber,
          totalPages,
          documentTitle,
        ),
      );
    }

    if (!section) {
      // If no section, try to use document title or return empty
      if (documentTitle) {
        return this.renderHeader(
          this.formatTemplate(undefined, pageNumber, totalPages, documentTitle),
        );
      }
      return null;
    }

    const text = this.formatTemplate(
      section,
      pageNumber,
      totalPages,
      documentTitle,
    );
    return this.renderHeader(text);
  }

  /**
   * Format template string with variables
   */
  private formatTemplate(
    section: SectionMarker | undefined,
    pageNumber: number,
    totalPages: number,
    documentTitle?: string,
  ): string {
    let template = this.config.template;

    // Replace variables
    template = template.replace(/\{\{SECTION\}\}/g, section?.title || "");
    template = template.replace(/\{\{TITLE\}\}/g, documentTitle || "");
    template = template.replace(/\{\{PAGE\}\}/g, pageNumber.toString());
    template = template.replace(/\{\{TOTAL\}\}/g, totalPages.toString());

    return template.trim();
  }

  /**
   * Render header HTML
   */
  private renderHeader(text: string): string {
    const {
      fontSize,
      fontFamily,
      fontWeight,
      color,
      textTransform,
      letterSpacing,
      align,
      paddingBottom,
      borderBottom,
    } = this.style;

    const borderStyle = borderBottom
      ? `border-bottom: ${borderBottom.width}pt solid ${borderBottom.color};`
      : "";

    return `
<div class="running-header" style="
  font-size: ${fontSize}pt;
  font-family: ${fontFamily};
  font-weight: ${fontWeight};
  color: ${color};
  text-transform: ${textTransform};
  letter-spacing: ${letterSpacing}pt;
  text-align: ${align};
  padding-bottom: ${paddingBottom}pt;
  ${borderStyle}
">
  ${text}
</div>`.trim();
  }

  /**
   * Generate CSS for running headers
   */
  generateCSS(): string {
    return `
.running-header {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

@media print {
  .running-header {
    position: running(header);
  }
  
  @page {
    @top-center {
      content: element(header);
    }
  }
}
`.trim();
  }
}

// =============================================================================
// CONTENT BRIDGE DETECTOR
// =============================================================================

/**
 * ContentBridgeDetector - Finds content-bridge elements during rendering
 *
 * Doc 3: "Using a content-bridge attribute on headings"
 */
export class ContentBridgeDetector {
  /**
   * Add content-bridge attributes to headings
   */
  addContentBridgeAttributes(html: string): string {
    // Add data-content-bridge to all heading elements
    return html.replace(/<(h[1-6])([^>]*)>/gi, (match, tag, attrs) => {
      if (attrs.includes("data-content-bridge")) {
        return match;
      }
      return `<${tag}${attrs} data-content-bridge="true">`;
    });
  }

  /**
   * Extract heading text from element for content bridge
   */
  extractHeadingText(element: string): string | null {
    const match = element.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
    return match ? match[1].trim() : null;
  }
}

// =============================================================================
// RUNNING HEADER PROCESSOR
// =============================================================================

/**
 * RunningHeaderProcessor - Full pipeline for running headers
 */
export class RunningHeaderProcessor {
  private scanner: SectionMarkerScanner;
  private tracker: PageSectionTracker;
  private generator: RunningHeaderGenerator;
  private bridgeDetector: ContentBridgeDetector;

  constructor(
    config: RunningHeaderConfig,
    style?: Partial<RunningHeaderStyle>,
  ) {
    this.scanner = new SectionMarkerScanner();
    this.tracker = new PageSectionTracker();
    this.generator = new RunningHeaderGenerator(config, style, this.tracker);
    this.bridgeDetector = new ContentBridgeDetector();
  }

  /**
   * Process content and setup section tracking
   */
  processContent(html: string): string {
    // Scan for sections
    this.scanner.scanContent(html);

    // Add content-bridge attributes
    return this.bridgeDetector.addContentBridgeAttributes(html);
  }

  /**
   * Register a section found during pagination
   */
  registerSection(
    title: string,
    level: number,
    pageNumber: number,
    startsOnPage: boolean = true,
  ): void {
    const marker = this.scanner.createMarker(title, level, pageNumber);
    this.tracker.registerSection(marker, pageNumber, startsOnPage);
  }

  /**
   * Generate header for a page
   */
  generateHeader(
    pageNumber: number,
    totalPages: number,
    documentTitle?: string,
  ): string | null {
    return this.generator.generateHeader(pageNumber, totalPages, documentTitle);
  }

  /**
   * Get CSS for running headers
   */
  getCSS(): string {
    return this.generator.generateCSS();
  }

  /**
   * Reset processor for new document
   */
  reset(): void {
    this.scanner.clear();
    this.tracker.clear();
  }
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

/** Running header configuration presets */
export const RUNNING_HEADER_PRESETS = {
  /** Standard section header */
  standard: {
    template: "{{SECTION}}",
    priorityRule: "first-on-page" as const,
    showOnFirstPage: false,
    showOnCover: false,
  } satisfies RunningHeaderConfig,

  /** Chapter-style with document title */
  chapter: {
    template: "{{TITLE}} — {{SECTION}}",
    priorityRule: "starts-on-page" as const,
    showOnFirstPage: false,
    showOnCover: false,
    excludeLevels: [3, 4, 5, 6], // Only use h1, h2
  } satisfies RunningHeaderConfig,

  /** Page-only (for TOC or appendix) */
  pageOnly: {
    template: "Page {{PAGE}}",
    priorityRule: "first-on-page" as const,
    showOnFirstPage: true,
    showOnCover: false,
  } satisfies RunningHeaderConfig,

  /** Full info header */
  detailed: {
    template: "{{SECTION}} | Page {{PAGE}} of {{TOTAL}}",
    priorityRule: "first-on-page" as const,
    showOnFirstPage: false,
    showOnCover: false,
  } satisfies RunningHeaderConfig,
};

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default scanner */
export const sectionScanner = new SectionMarkerScanner();

/** Default tracker */
export const pageSectionTracker = new PageSectionTracker();
