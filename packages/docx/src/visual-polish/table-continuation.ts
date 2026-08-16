/**
 * Table Continuation Polish (Doc 3, Section 5)
 * =============================================
 *
 * Implements table splitting with continuation badges and
 * zebra stripe continuity across page breaks.
 *
 * Doc 3: "When a table splits, we render the header again with
 * a continuation badge and maintain zebra-stripe parity."
 */

import {
  TableContinuationState,
  ContinuationBadgeConfig,
  ZebraStripeConfig,
  PT,
  HexColor,
} from "./types";

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_CONTINUATION_BADGE: ContinuationBadgeConfig = {
  showBadge: true,
  template: "{{CAPTION}} (continued)",
  position: "above-header",
  style: {
    fontStyle: "italic",
    fontSize: 9,
    color: "#666666",
  },
};

const DEFAULT_ZEBRA_CONFIG: ZebraStripeConfig = {
  enabled: true,
  evenColor: "#F8F8F8",
  oddColor: "#FFFFFF",
  startEven: true,
};

// =============================================================================
// TABLE CONTINUATION TRACKER
// =============================================================================

/**
 * TableContinuationTracker - Tracks table state across page breaks
 */
export class TableContinuationTracker {
  private tableStates: Map<string, TableContinuationState> = new Map();
  private tableIdCounter = 0;

  /**
   * Register a new table
   */
  registerTable(tableId?: string, caption?: string): string {
    const id = tableId || `table-${++this.tableIdCounter}`;

    this.tableStates.set(id, {
      tableId: id,
      caption,
      segment: 1,
      totalSegments: 1,
      lastRowIndex: 0,
      lastRowWasEven: false,
    });

    return id;
  }

  /**
   * Record a page break in a table
   */
  recordPageBreak(
    tableId: string,
    lastRowIndex: number,
    lastRowWasEven: boolean,
  ): void {
    const state = this.tableStates.get(tableId);
    if (!state) return;

    state.segment++;
    state.totalSegments = state.segment;
    state.lastRowIndex = lastRowIndex;
    state.lastRowWasEven = lastRowWasEven;
  }

  /**
   * Get table state
   */
  getState(tableId: string): TableContinuationState | undefined {
    return this.tableStates.get(tableId);
  }

  /**
   * Check if table is continued (not first segment)
   */
  isContinued(tableId: string): boolean {
    const state = this.tableStates.get(tableId);
    return state ? state.segment > 1 : false;
  }

  /**
   * Get next row parity for zebra striping
   */
  getNextRowParity(tableId: string, rowIndex: number): boolean {
    const state = this.tableStates.get(tableId);
    if (!state) return rowIndex % 2 === 0;

    // Continue parity from where we left off
    const adjustedIndex = rowIndex + state.lastRowIndex;
    return adjustedIndex % 2 === 0;
  }

  /**
   * Update total segments after pagination complete
   */
  finalize(tableId: string, totalSegments: number): void {
    const state = this.tableStates.get(tableId);
    if (state) {
      state.totalSegments = totalSegments;
    }
  }

  /**
   * Clear all tracking
   */
  clear(): void {
    this.tableStates.clear();
    this.tableIdCounter = 0;
  }
}

// =============================================================================
// CONTINUATION BADGE GENERATOR
// =============================================================================

/**
 * ContinuationBadgeGenerator - Creates continuation badges for split tables
 */
export class ContinuationBadgeGenerator {
  private config: ContinuationBadgeConfig;

  constructor(config: Partial<ContinuationBadgeConfig> = {}) {
    this.config = { ...DEFAULT_CONTINUATION_BADGE, ...config };
  }

  /**
   * Generate continuation badge HTML
   */
  generate(state: TableContinuationState): string {
    if (!this.config.showBadge || state.segment === 1) {
      return "";
    }

    const text = this.formatTemplate(state);
    const { fontStyle, fontSize, color } = this.config.style || {};

    return `
<div class="table-continuation-badge" style="
  font-style: ${fontStyle || "italic"};
  font-size: ${fontSize || 9}pt;
  color: ${color || "#666666"};
  margin-bottom: 6pt;
  text-align: left;
">
  ${text}
</div>`.trim();
  }

  /**
   * Format template with state values
   */
  private formatTemplate(state: TableContinuationState): string {
    let text = this.config.template;

    text = text.replace(/\{\{CAPTION\}\}/g, state.caption || "Table");
    text = text.replace(/\{\{SEGMENT\}\}/g, state.segment.toString());
    text = text.replace(/\{\{TOTAL\}\}/g, state.totalSegments.toString());
    text = text.replace(/\{\{TABLE_ID\}\}/g, state.tableId);

    return text;
  }

  /**
   * Get CSS for badges
   */
  generateCSS(): string {
    return `
.table-continuation-badge {
  page-break-after: avoid;
  break-after: avoid;
}
`.trim();
  }
}

// =============================================================================
// ZEBRA STRIPE MANAGER
// =============================================================================

/**
 * ZebraStripeManager - Manages zebra stripe continuity
 */
export class ZebraStripeManager {
  private config: ZebraStripeConfig;

  constructor(config: Partial<ZebraStripeConfig> = {}) {
    this.config = { ...DEFAULT_ZEBRA_CONFIG, ...config };
  }

  /**
   * Get row background color based on index and continuation state
   */
  getRowColor(rowIndex: number, continuationOffset: number = 0): HexColor {
    if (!this.config.enabled) {
      return this.config.oddColor; // Default to odd (white)
    }

    const adjustedIndex = rowIndex + continuationOffset;
    const isEven = this.config.startEven
      ? adjustedIndex % 2 === 0
      : adjustedIndex % 2 !== 0;

    return isEven ? this.config.evenColor : this.config.oddColor;
  }

  /**
   * Generate CSS class for row
   */
  getRowClass(rowIndex: number, continuationOffset: number = 0): string {
    const adjustedIndex = rowIndex + continuationOffset;
    const isEven = this.config.startEven
      ? adjustedIndex % 2 === 0
      : adjustedIndex % 2 !== 0;

    return isEven ? "zebra-even" : "zebra-odd";
  }

  /**
   * Apply zebra striping to existing table HTML
   */
  applyToTable(tableHtml: string, startOffset: number = 0): string {
    let rowIndex = 0;

    return tableHtml.replace(/<tr([^>]*)>/gi, (match, attrs) => {
      // Skip header rows
      if (attrs.includes("data-header") || attrs.includes('class="header')) {
        return match;
      }

      const color = this.getRowColor(rowIndex, startOffset);
      rowIndex++;

      // Check if row already has style
      if (attrs.includes("style=")) {
        return match.replace(
          /style="([^"]*)"/,
          `style="$1; background-color: ${color};"`,
        );
      } else {
        return `<tr${attrs} style="background-color: ${color};">`;
      }
    });
  }

  /**
   * Generate CSS for zebra striping
   */
  generateCSS(): string {
    return `
.zebra-even {
  background-color: ${this.config.evenColor};
}

.zebra-odd {
  background-color: ${this.config.oddColor};
}

/* Alternative: nth-child based (doesn't support continuation) */
.table-zebra tbody tr:nth-child(even) {
  background-color: ${this.config.evenColor};
}

.table-zebra tbody tr:nth-child(odd) {
  background-color: ${this.config.oddColor};
}
`.trim();
  }
}

// =============================================================================
// TABLE HEADER REPEATER
// =============================================================================

/**
 * TableHeaderRepeater - Extracts and repeats table headers
 */
export class TableHeaderRepeater {
  /**
   * Extract header from table HTML
   */
  extractHeader(tableHtml: string): string | null {
    // Try thead first
    const theadMatch = tableHtml.match(/<thead[^>]*>[\s\S]*?<\/thead>/i);
    if (theadMatch) {
      return theadMatch[0];
    }

    // Try first tr with th elements
    const firstRowMatch = tableHtml.match(
      /<tr[^>]*>[\s\S]*?<th[\s\S]*?<\/tr>/i,
    );
    if (firstRowMatch) {
      return `<thead>${firstRowMatch[0]}</thead>`;
    }

    return null;
  }

  /**
   * Create repeated header with continuation styling
   */
  createRepeatedHeader(headerHtml: string, isContinuation: boolean): string {
    if (!isContinuation) {
      return headerHtml;
    }

    // Add continuation class to header
    return headerHtml.replace(
      /<thead([^>]*)>/i,
      '<thead$1 class="continued-header">',
    );
  }

  /**
   * Generate CSS for repeated headers
   */
  generateCSS(): string {
    return `
thead {
  display: table-header-group;
}

.continued-header {
  border-top: 2pt solid #333333;
}

.continued-header::before {
  content: '';
  display: table-row;
  height: 3pt;
}

@media print {
  thead {
    display: table-header-group;
  }
  
  tr {
    page-break-inside: avoid;
  }
}
`.trim();
  }
}

// =============================================================================
// TABLE CONTINUATION PROCESSOR
// =============================================================================

/**
 * TableContinuationProcessor - Full pipeline for table continuation
 */
export class TableContinuationProcessor {
  private tracker: TableContinuationTracker;
  private badgeGenerator: ContinuationBadgeGenerator;
  private zebraManager: ZebraStripeManager;
  private headerRepeater: TableHeaderRepeater;

  constructor(
    badgeConfig?: Partial<ContinuationBadgeConfig>,
    zebraConfig?: Partial<ZebraStripeConfig>,
  ) {
    this.tracker = new TableContinuationTracker();
    this.badgeGenerator = new ContinuationBadgeGenerator(badgeConfig);
    this.zebraManager = new ZebraStripeManager(zebraConfig);
    this.headerRepeater = new TableHeaderRepeater();
  }

  /**
   * Process a table for potential continuation
   */
  processTable(
    tableHtml: string,
    tableId?: string,
    caption?: string,
  ): { tableId: string; html: string; header: string | null } {
    const id = this.tracker.registerTable(tableId, caption);
    const header = this.headerRepeater.extractHeader(tableHtml);

    // Apply initial zebra striping
    const stripedHtml = this.zebraManager.applyToTable(tableHtml);

    return {
      tableId: id,
      html: stripedHtml,
      header,
    };
  }

  /**
   * Create continuation segment
   */
  createContinuationSegment(
    tableId: string,
    header: string,
    bodyRows: string,
    lastRowIndex: number,
    lastRowWasEven: boolean,
  ): string {
    this.tracker.recordPageBreak(tableId, lastRowIndex, lastRowWasEven);

    const state = this.tracker.getState(tableId);
    if (!state) return bodyRows;

    const badge = this.badgeGenerator.generate(state);
    const continuedHeader = this.headerRepeater.createRepeatedHeader(
      header,
      true,
    );
    const stripedBody = this.zebraManager.applyToTable(bodyRows, lastRowIndex);

    return `
${badge}
<table class="continued-table" data-table-id="${tableId}" data-segment="${state.segment}">
  ${continuedHeader}
  <tbody>
    ${stripedBody}
  </tbody>
</table>`.trim();
  }

  /**
   * Get current table state
   */
  getTableState(tableId: string): TableContinuationState | undefined {
    return this.tracker.getState(tableId);
  }

  /**
   * Generate all CSS
   */
  generateCSS(): string {
    return [
      this.badgeGenerator.generateCSS(),
      this.zebraManager.generateCSS(),
      this.headerRepeater.generateCSS(),
      `
/* Table continuation container */
.continued-table {
  width: 100%;
  border-collapse: collapse;
}

.continued-table td,
.continued-table th {
  border: 1pt solid #E0E0E0;
  padding: 8pt 12pt;
}

/* Visual indicator for continuation */
.continued-table::before {
  content: '';
  display: block;
  height: 0;
}
      `.trim(),
    ].join("\n\n");
  }

  /**
   * Reset processor
   */
  reset(): void {
    this.tracker.clear();
  }
}

// =============================================================================
// TABLE SPLIT DETECTOR
// =============================================================================

/**
 * TableSplitDetector - Detects where tables should split
 */
export class TableSplitDetector {
  private rowHeight: PT;
  private minRowsOnPage: number;

  constructor(rowHeight: PT = 24, minRowsOnPage: number = 3) {
    this.rowHeight = rowHeight;
    this.minRowsOnPage = minRowsOnPage;
  }

  /**
   * Calculate split points for a table
   */
  calculateSplitPoints(
    totalRows: number,
    headerHeight: PT,
    availableHeight: PT,
    rowHeights?: PT[],
  ): number[] {
    const splitPoints: number[] = [];
    let currentHeight = headerHeight;
    let currentRow = 0;

    while (currentRow < totalRows) {
      const rowH = rowHeights?.[currentRow] || this.rowHeight;

      if (currentHeight + rowH > availableHeight) {
        // Need to split here
        // Ensure minimum rows on page
        if (currentRow < this.minRowsOnPage) {
          // Can't split yet, need to overflow
          currentRow++;
          currentHeight += rowH;
          continue;
        }

        splitPoints.push(currentRow);
        currentHeight = headerHeight; // Reset for new page
      }

      currentHeight += rowH;
      currentRow++;
    }

    return splitPoints;
  }

  /**
   * Check if table needs splitting
   */
  needsSplit(tableHeight: PT, availableHeight: PT): boolean {
    return tableHeight > availableHeight;
  }
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const TABLE_CONTINUATION_PRESETS = {
  /** Standard continuation */
  standard: {
    badge: {
      showBadge: true,
      template: "{{CAPTION}} (continued)",
      position: "above-header" as const,
    } as ContinuationBadgeConfig,
    zebra: {
      enabled: true,
      evenColor: "#F8F8F8",
      oddColor: "#FFFFFF",
      startEven: true,
    } as ZebraStripeConfig,
  },

  /** Formal report style */
  formal: {
    badge: {
      showBadge: true,
      template: "Table {{TABLE_ID}} (continued from previous page)",
      position: "above-header" as const,
      style: {
        fontStyle: "italic" as const,
        fontSize: 8,
        color: "#999999",
      },
    } as ContinuationBadgeConfig,
    zebra: {
      enabled: false,
      evenColor: "#FFFFFF",
      oddColor: "#FFFFFF",
      startEven: true,
    } as ZebraStripeConfig,
  },

  /** High contrast zebra */
  highContrast: {
    badge: {
      showBadge: true,
      template: "{{CAPTION}} — Page {{SEGMENT}} of {{TOTAL}}",
      position: "above-header" as const,
    } as ContinuationBadgeConfig,
    zebra: {
      enabled: true,
      evenColor: "#E8E8E8",
      oddColor: "#FFFFFF",
      startEven: true,
    } as ZebraStripeConfig,
  },
};

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default table continuation tracker */
export const tableContinuationTracker = new TableContinuationTracker();

/** Default table continuation processor */
export const tableContinuationProcessor = new TableContinuationProcessor();
