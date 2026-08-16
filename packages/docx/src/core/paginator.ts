/**
 * VLT Paginator
 * =============
 * Production-grade pagination engine for splitting content across multiple pages.
 *
 * Features:
 * - Table splitting with header repeat and cell span handling
 * - keepTogether/keepWithNext hints
 * - Safety limits to prevent memory exhaustion
 * - Recursion depth protection
 * - Oversized element handling with emergency overflow
 * - Column width preservation across table splits
 */

import type {
  PolyglotNode,
  PolyglotNodeType,
  PolyglotPage,
  PageDimensions,
  OverflowStrategy,
  TileInfo,
  WidowOrphanConfig,
  TimeoutConfig,
} from './types';

import { PerformanceMonitor } from './performance-monitor';
import {
  MAX_TABLE_ROWS,
  MAX_TABLE_COLS,
  MAX_CELL_MAP_ENTRIES,
  MAX_SPLIT_DEPTH,
  MAX_PAGINATION_ITERATIONS,
  DEFAULT_GLOBAL_TIMEOUT,
  DEFAULT_HEARTBEAT_INTERVAL,
  MAX_PLACEMENT_ATTEMPTS,
} from './pagination-constants';

// Re-export constants and types for backward compatibility
export {
  MAX_TABLE_ROWS,
  MAX_TABLE_COLS,
  MAX_CELL_MAP_ENTRIES,
  MAX_SPLIT_DEPTH,
  MAX_PAGINATION_ITERATIONS,
  DEFAULT_GLOBAL_TIMEOUT,
  DEFAULT_HEARTBEAT_INTERVAL,
  MAX_PLACEMENT_ATTEMPTS,
} from './pagination-constants';
export type {
  OverflowStrategy,
  TileInfo,
  WidowOrphanConfig,
  TimeoutConfig,
} from './types';

import type {
  StructuredDocument,
  HeadingElement,
  PageDimensions as StructuredPageDimensions,
} from '../types';
import { EstimatingTextMeasurer } from './text-measurer';
import { getUniqueBookmarkName } from '../features/toc-bookmarks';

// =============================================================================
// ERROR TYPES
// =============================================================================

export class PaginationError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaginationError';
  }
}

// =============================================================================
// PAGINATION OPTIONS & RESULT (These remain here as they reference local types)
// =============================================================================

export interface PaginationOptions {
  /** Page dimensions including margins */
  dimensions: PageDimensions;
  /** Whether to repeat table headers on each page */
  repeatTableHeaders?: boolean;
  /** Maximum pages to generate (safety limit) */
  maxPages?: number;
  /** Overflow strategy for oversized elements */
  overflowStrategy?: OverflowStrategy;
  /** Minimum scale factor for shrink-to-fit (default 0.5) */
  minScaleFactor?: number;
  /** Widow/orphan control settings */
  widowOrphan?: WidowOrphanConfig;
  /** Estimated line height for text fragmentation (default 20) */
  estimatedLineHeight?: number;
  /** Timeout and resilience settings */
  timeout?: Partial<TimeoutConfig>;
  /** Performance monitor for detailed metrics (Phase 11) */
  performanceMonitor?: PerformanceMonitor;
}

export interface PaginationResult {
  /** Generated pages */
  pages: PolyglotPage[];
  /** Warnings generated during pagination */
  warnings: string[];
  /** Whether pagination completed fully or was interrupted */
  completed: boolean;
  /** Reason for interruption if not completed */
  interruptReason?: 'timeout' | 'heartbeat' | 'impossible-layout' | 'max-iterations';
  /** Statistics */
  stats: {
    totalNodes: number;
    pagesCreated: number;
    tablesSplit: number;
    overflowNodes: number;
    cellMapOperations: number;
    textFragmentations: number;
    widowOrphanAdjustments: number;
    shrinkToFitApplied: number;
    /** Number of horizontal tiles created for wide content */
    tilesCreated: number;
    /** Total pagination time in milliseconds */
    totalTimeMs: number;
    /** Number of nodes skipped due to impossible layout */
    nodesSkipped: number;
    /** Number of heartbeat checks performed */
    heartbeatChecks: number;
  };
}

interface PageContext {
  pageIndex: number;
  currentY: number;
  contentHeight: number;
  contentWidth: number;
  nodes: PolyglotNode[];
  /** Optional metadata for page-level information (e.g., tile info) */
  metadata?: Record<string, unknown>;
}

/**
 * Cell map entry for tracking rowspan/colspan
 */
interface CellMapEntry {
  rowIndex: number;
  colIndex: number;
  rowSpan: number;
  colSpan: number;
  sourceCell: PolyglotNode;
  remainingRowSpan: number;
}

/**
 * Table analysis result
 */
interface TableAnalysis {
  headerRows: PolyglotNode[];
  bodyRows: PolyglotNode[];
  headerHeight: number;
  totalRows: number;
  totalCols: number;
  cellMap: Map<string, CellMapEntry>;
  columnWidths: number[];
}

// =============================================================================
// PAGINATOR CLASS
// =============================================================================

/** Default widow/orphan config - "Rule of Two" */
const DEFAULT_WIDOW_ORPHAN: WidowOrphanConfig = {
  minLinesBeforeBreak: 2,
  minLinesAfterBreak: 2,
};

/** Default timeout config */
const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  globalTimeout: DEFAULT_GLOBAL_TIMEOUT,
  heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL,
  maxPlacementAttempts: MAX_PLACEMENT_ATTEMPTS,
};

/**
 * Tracks placement attempts for impossible layout detection
 */
interface PlacementTracker {
  nodeId: string;
  attempts: number;
  lastPageIndex: number;
  lastY: number;
}

export class VLTPaginator {
  private options: Required<Omit<PaginationOptions, 'dimensions' | 'timeout' | 'performanceMonitor'>> &
    Pick<PaginationOptions, 'dimensions' | 'performanceMonitor'> &
    { timeout: TimeoutConfig };
  private warnings: string[] = [];
  private stats = {
    totalNodes: 0,
    pagesCreated: 0,
    tablesSplit: 0,
    overflowNodes: 0,
    cellMapOperations: 0,
    textFragmentations: 0,
    widowOrphanAdjustments: 0,
    shrinkToFitApplied: 0,
    tilesCreated: 0,
    totalTimeMs: 0,
    nodesSkipped: 0,
    heartbeatChecks: 0,
  };
  private iterationCount = 0;

  // Timeout & Resilience tracking
  private startTime = 0;
  private lastProgressTime = 0;
  private completed = true;
  private interruptReason?: 'timeout' | 'heartbeat' | 'impossible-layout' | 'max-iterations';
  private placementTrackers = new Map<string, PlacementTracker>();
  private skippedNodes = new Set<string>();

  // Performance monitoring (Phase 11)
  private perfMonitor: PerformanceMonitor | null = null;

  constructor(options: PaginationOptions) {
    // Extract timeout and performanceMonitor to handle separately
    const { timeout: userTimeout, performanceMonitor, ...restOptions } = options;

    this.options = {
      repeatTableHeaders: true,
      maxPages: 1000,
      overflowStrategy: 'emergency-split',
      minScaleFactor: 0.5,
      widowOrphan: DEFAULT_WIDOW_ORPHAN,
      estimatedLineHeight: 20,
      ...restOptions,
      performanceMonitor,
      timeout: { ...DEFAULT_TIMEOUT_CONFIG, ...userTimeout },
    };

    this.perfMonitor = performanceMonitor || null;
  }

  /**
   * Paginate a root node into multiple pages
   */
  paginate(rootNode: PolyglotNode): PaginationResult {
    // Initialize timing and tracking
    this.startTime = Date.now();
    this.lastProgressTime = this.startTime;
    this.completed = true;
    this.interruptReason = undefined;
    this.placementTrackers.clear();
    this.skippedNodes.clear();

    // Start performance monitoring if enabled
    if (this.perfMonitor) {
      this.perfMonitor.start();
      this.perfMonitor.startOperation('pagination');
    }

    this.warnings = [];
    this.stats = {
      totalNodes: 0,
      pagesCreated: 0,
      tablesSplit: 0,
      overflowNodes: 0,
      cellMapOperations: 0,
      textFragmentations: 0,
      widowOrphanAdjustments: 0,
      shrinkToFitApplied: 0,
      tilesCreated: 0,
      totalTimeMs: 0,
      nodesSkipped: 0,
      heartbeatChecks: 0,
    };
    this.iterationCount = 0;

    const { dimensions } = this.options;
    const margin = dimensions.margin || { top: 72, right: 72, bottom: 72, left: 72 };

    const contentHeight = dimensions.height - margin.top - margin.bottom;
    const contentWidth = dimensions.width - margin.left - margin.right;

    // Validate dimensions
    if (contentHeight <= 0 || contentWidth <= 0) {
      throw new PaginationError(
        'ERR_INVALID_DIMENSIONS',
        `Invalid content dimensions: ${contentWidth}x${contentHeight}`,
        { contentWidth, contentHeight, dimensions }
      );
    }

    // Pre-scan for oversized elements
    if (this.perfMonitor) this.perfMonitor.startOperation('prescan');
    this.prescanOversizedElements(rootNode, contentHeight);
    if (this.perfMonitor) this.perfMonitor.endOperation('prescan');

    // Initialize first page
    const pages: PageContext[] = [{
      pageIndex: 0,
      currentY: 0,
      contentHeight,
      contentWidth,
      nodes: [],
    }];

    // Determine what to process:
    // - For container types (document, page, block), process children
    // - For content types (heading, paragraph, table, etc.), process the node itself
    const containerTypes = ['document', 'page', 'block'];
    const isContainer = containerTypes.includes(rootNode.type);

    try {
      if (isContainer) {
        // Process all children of the container node
        const children = rootNode.children || [];
        for (const child of children) {
          // Check for interruption conditions
          if (!this.checkContinue()) {
            break;
          }

          this.stats.totalNodes++;
          this.placeNode(child, pages, contentHeight, contentWidth, 0);

          // Safety check for runaway pagination
          if (pages.length > this.options.maxPages!) {
            this.warnings.push(`Pagination exceeded ${this.options.maxPages} pages, stopping`);
            this.completed = false;
            break;
          }
        }
      } else {
        // Process the root node itself (it's a content node like heading, table, etc.)
        this.stats.totalNodes++;
        this.placeNode(rootNode, pages, contentHeight, contentWidth, 0);
      }
    } catch (error) {
      if (error instanceof PaginationError && error.code === 'ERR_PAGINATION_INTERRUPTED') {
        // Graceful interruption - return partial results
        this.completed = false;
      } else {
        throw error;
      }
    }

    // Calculate total time
    this.stats.totalTimeMs = Date.now() - this.startTime;
    this.stats.nodesSkipped = this.skippedNodes.size;

    // Convert page contexts to PolyglotPages
    const result: PolyglotPage[] = pages.map((ctx, index) => ({
      index,
      dimensions: this.options.dimensions,
      content: {
        id: `page_${index}_root`,
        type: 'block' as const,
        rect: {
          x: 0,
          y: 0,
          width: contentWidth,
          height: contentHeight,
        },
        children: ctx.nodes,
      },
    }));

    this.stats.pagesCreated = result.length;

    // End performance monitoring and sync counts
    if (this.perfMonitor) {
      this.perfMonitor.endOperation('pagination');
      // Sync stats to performance monitor
      this.perfMonitor.incrementCount('nodesProcessed', this.stats.totalNodes);
      this.perfMonitor.incrementCount('pagesCreated', this.stats.pagesCreated);
      this.perfMonitor.incrementCount('tablesSplit', this.stats.tablesSplit);
      this.perfMonitor.incrementCount('textFragmentations', this.stats.textFragmentations);
      this.perfMonitor.incrementCount('overflowEvents', this.stats.overflowNodes);
      this.perfMonitor.incrementCount('widowOrphanAdjustments', this.stats.widowOrphanAdjustments);
      this.perfMonitor.incrementCount('shrinkToFitApplied', this.stats.shrinkToFitApplied);
      // Note: tilesCreated tracked in stats but not in performance monitor (add to PerformanceMonitor if needed)
      this.perfMonitor.incrementCount('heartbeatChecks', this.stats.heartbeatChecks);
      this.perfMonitor.end();
    }

    return {
      pages: result,
      warnings: this.warnings,
      completed: this.completed,
      interruptReason: this.interruptReason,
      stats: this.stats,
    };
  }

  /**
   * Check if pagination should continue (timeout/heartbeat checks)
   * Returns false if pagination should stop
   */
  private checkContinue(): boolean {
    const now = Date.now();
    const { timeout } = this.options;

    // Check global timeout
    if (timeout.globalTimeout > 0) {
      const elapsed = now - this.startTime;
      if (elapsed > timeout.globalTimeout) {
        this.warnings.push(
          `TIMEOUT: Pagination exceeded global timeout of ${timeout.globalTimeout}ms (elapsed: ${elapsed}ms)`
        );
        this.completed = false;
        this.interruptReason = 'timeout';
        return false;
      }
    }

    // Check heartbeat (time since last progress)
    if (timeout.heartbeatInterval > 0) {
      this.stats.heartbeatChecks++;
      const timeSinceProgress = now - this.lastProgressTime;
      if (timeSinceProgress > timeout.heartbeatInterval) {
        this.warnings.push(
          `HEARTBEAT: No progress for ${timeSinceProgress}ms (threshold: ${timeout.heartbeatInterval}ms)`
        );
        this.completed = false;
        this.interruptReason = 'heartbeat';
        return false;
      }
    }

    // Also check iteration limit
    this.iterationCount++;
    if (this.iterationCount > MAX_PAGINATION_ITERATIONS) {
      this.warnings.push(
        `MAX_ITERATIONS: Exceeded ${MAX_PAGINATION_ITERATIONS} iterations`
      );
      this.completed = false;
      this.interruptReason = 'max-iterations';
      return false;
    }

    return true;
  }

  /**
   * Record progress (resets heartbeat timer)
   */
  private recordProgress(): void {
    this.lastProgressTime = Date.now();
  }

  /**
   * Track placement attempt for impossible layout detection
   * Returns true if the node should be skipped
   */
  private trackPlacementAttempt(
    node: PolyglotNode,
    pageIndex: number,
    currentY: number
  ): boolean {
    const tracker = this.placementTrackers.get(node.id);
    const maxAttempts = this.options.timeout.maxPlacementAttempts;

    if (!tracker) {
      // First attempt for this node
      this.placementTrackers.set(node.id, {
        nodeId: node.id,
        attempts: 1,
        lastPageIndex: pageIndex,
        lastY: currentY,
      });
      return false;
    }

    // Check if we're making progress (different page or different Y position)
    const isProgress = tracker.lastPageIndex !== pageIndex || Math.abs(tracker.lastY - currentY) > 1;

    if (isProgress) {
      // Reset attempts on progress
      tracker.attempts = 1;
      tracker.lastPageIndex = pageIndex;
      tracker.lastY = currentY;
      return false;
    }

    // Same position - increment attempt counter
    tracker.attempts++;

    if (tracker.attempts >= maxAttempts) {
      // Node is stuck - skip it
      this.warnings.push(
        `IMPOSSIBLE_LAYOUT: Node ${node.id} (${node.type}) failed to place after ${maxAttempts} attempts at page ${pageIndex}, y=${currentY}. Skipping.`
      );
      this.skippedNodes.add(node.id);
      this.stats.overflowNodes++;
      return true;
    }

    return false;
  }

  /**
   * Check iteration limit to prevent infinite loops
   * Now integrated with checkContinue for unified timeout/heartbeat checking
   */
  private checkIterationLimit(): void {
    if (!this.checkContinue()) {
      throw new PaginationError(
        'ERR_PAGINATION_INTERRUPTED',
        `Pagination interrupted: ${this.interruptReason}`,
        {
          reason: this.interruptReason,
          iterations: this.iterationCount,
          elapsedMs: Date.now() - this.startTime,
        }
      );
    }
  }

  /**
   * Pre-scan for oversized elements and log warnings
   */
  private prescanOversizedElements(node: PolyglotNode, contentHeight: number, contentWidth?: number): void {
    const nodeHeight = node.rect?.height || 0;
    const nodeWidth = node.rect?.width || 0;
    // Calculate page width from options if not provided
    const { dimensions } = this.options;
    const margin = dimensions.margin || { top: 72, right: 72, bottom: 72, left: 72 };
    const pageWidth = contentWidth || (dimensions.width - margin.left - margin.right);

    // Check height overflow
    if (nodeHeight > contentHeight && !this.canSplitNode(node)) {
      this.warnings.push(
        `Oversized element detected: ${node.id} (${node.type}) is ${nodeHeight}px tall but page content area is ${contentHeight}px. Will overflow.`
      );
    }

    // Check width overflow (new for tile strategy)
    if (nodeWidth > pageWidth) {
      const tilesNeeded = Math.ceil(nodeWidth / pageWidth);
      this.warnings.push(
        `Wide element detected: ${node.id} (${node.type}) is ${nodeWidth}px wide but page content area is ${pageWidth}px. ` +
        `Will require ${tilesNeeded} horizontal tiles with 'tile' strategy.`
      );
    }

    // Recursively check children
    if (node.children) {
      for (const child of node.children) {
        this.prescanOversizedElements(child, contentHeight, pageWidth);
      }
    }
  }

  /**
   * Place a node on the current page, creating new pages as needed
   */
  private placeNode(
    node: PolyglotNode,
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number,
    splitDepth: number
  ): void {
    // Check recursion depth
    if (splitDepth > MAX_SPLIT_DEPTH) {
      throw new PaginationError(
        'ERR_MAX_SPLIT_DEPTH',
        `Maximum split depth (${MAX_SPLIT_DEPTH}) exceeded for node ${node.id}`,
        { nodeId: node.id, nodeType: node.type, splitDepth }
      );
    }

    this.checkIterationLimit();

    const currentPage = pages[pages.length - 1];
    const nodeHeight = node.rect?.height || 0;

    // Check for impossible layout (stuck nodes)
    if (this.trackPlacementAttempt(node, currentPage.pageIndex, currentPage.currentY)) {
      // Node is stuck - skip it
      return;
    }

    // Check if this node was previously skipped
    if (this.skippedNodes.has(node.id)) {
      return;
    }

    // Check for width overflow FIRST - wide content needs special handling
    // This must be checked before trying to fit the node vertically
    const nodeWidth = node.rect?.width || 0;
    if (nodeWidth > contentWidth) {
      // Node is too wide - use overflow strategy (tile, clip, shrink, etc.)
      this.handleOverflow(node, pages, contentHeight, contentWidth, splitDepth);
      return;
    }

    // Check if node fits on current page (height-wise)
    if (currentPage.currentY + nodeHeight <= contentHeight) {
      // Node fits - add it to current page
      this.addNodeToPage(node, currentPage);
      return;
    }

    // Node doesn't fit - check if it should stay together
    const keepTogether = this.shouldKeepTogether(node);

    if (keepTogether && nodeHeight <= contentHeight) {
      // Start new page and place the node there
      const newPage = this.createNewPage(pages, contentHeight, contentWidth);
      this.addNodeToPage(node, newPage);
      return;
    }

    // Node is too tall or can be split (width already checked above)
    if (node.type === 'table') {
      this.splitTable(node, pages, contentHeight, contentWidth, splitDepth + 1);
    } else if (node.type === 'paragraph' || node.type === 'text') {
      // Use text-specific splitting with widow/orphan control
      if (this.canSplitNode(node)) {
        this.splitTextNode(node, pages, contentHeight, contentWidth, splitDepth + 1);
      } else {
        // Text too short to split, handle as overflow
        this.handleOverflow(node, pages, contentHeight, contentWidth, splitDepth);
      }
    } else if (this.canSplitNode(node)) {
      this.splitNode(node, pages, contentHeight, contentWidth, splitDepth + 1);
    } else {
      // Can't split - use overflow strategy if too tall (width already checked)
      if (nodeHeight > contentHeight) {
        this.handleOverflow(node, pages, contentHeight, contentWidth, splitDepth);
      } else {
        // Node fits on a fresh page
        if (currentPage.currentY > 0) {
          const newPage = this.createNewPage(pages, contentHeight, contentWidth);
          this.addNodeToPage(node, newPage);
        } else {
          this.addNodeToPage(node, currentPage);
        }
      }
    }
  }

  /**
   * Add a node to a page, updating Y position
   */
  private addNodeToPage(node: PolyglotNode, page: PageContext): void {
    // Track node placement timing
    if (this.perfMonitor) this.perfMonitor.startOperation('nodePlacement');

    // Clone node with updated Y position
    const placedNode: PolyglotNode = {
      ...node,
      rect: {
        ...node.rect!,
        y: page.currentY,
      },
    };
    page.nodes.push(placedNode);
    page.currentY += node.rect?.height || 0;

    // Record progress (node successfully placed)
    this.recordProgress();

    // Clear placement tracker for this node (it's been successfully placed)
    this.placementTrackers.delete(node.id);

    // Record in performance monitor
    if (this.perfMonitor) {
      this.perfMonitor.endOperation('nodePlacement');
      this.perfMonitor.recordNodePlaced();
    }
  }

  /**
   * Create a new page context
   */
  private createNewPage(
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number
  ): PageContext {
    // Track page creation timing
    if (this.perfMonitor) this.perfMonitor.startOperation('pageCreation');

    const newPage: PageContext = {
      pageIndex: pages.length,
      currentY: 0,
      contentHeight,
      contentWidth,
      nodes: [],
    };
    pages.push(newPage);

    // Start tracking this page's timing
    if (this.perfMonitor) {
      this.perfMonitor.endOperation('pageCreation');
      this.perfMonitor.startPage(newPage.pageIndex);
    }

    return newPage;
  }

  /**
   * Check if a node should be kept together (not split)
   */
  private shouldKeepTogether(node: PolyglotNode): boolean {
    // Check explicit keepTogether style
    if (node.styles && 'keepTogether' in node.styles) {
      return true;
    }

    // Check DOCX hints
    if (node.docx?.keepLines) {
      return true;
    }

    // Headings should generally stay with following content
    if (node.type === 'heading') {
      return true;
    }

    // Small blocks should stay together
    const height = node.rect?.height || 0;
    if (height < 100) {
      return true;
    }

    return false;
  }

  /**
   * Check if a node can be split across pages
   */
  private canSplitNode(node: PolyglotNode): boolean {
    // Tables have special splitting logic
    if (node.type === 'table') {
      return true;
    }

    // Lists can be split by item
    if (node.type === 'list') {
      return (node.children?.length || 0) > 1;
    }

    // Blocks with children can potentially be split
    if (node.type === 'block' && (node.children?.length || 0) > 1) {
      return true;
    }

    // Text nodes (paragraph, text) can be split if they have enough content
    if ((node.type === 'paragraph' || node.type === 'text') && node.textContent?.plain) {
      const text = node.textContent.plain;
      const lineHeight = this.options.estimatedLineHeight;
      const nodeHeight = node.rect?.height || 0;
      const estimatedLines = nodeHeight > 0 ? Math.ceil(nodeHeight / lineHeight) : text.length / 80;
      // Can split if there are at least 4 lines (2 on each page after split)
      return estimatedLines >= 4;
    }

    return false;
  }

  /**
   * Estimate the number of lines in a text node
   */
  private estimateLines(node: PolyglotNode): number {
    const lineHeight = this.options.estimatedLineHeight;
    const nodeHeight = node.rect?.height || 0;

    if (nodeHeight > 0) {
      return Math.ceil(nodeHeight / lineHeight);
    }

    // Fallback: estimate from text length (assuming ~80 chars per line)
    const text = node.textContent?.plain || '';
    return Math.ceil(text.length / 80) || 1;
  }

  /**
   * Apply widow/orphan control and return adjusted lines that fit
   * Returns 0 if the entire element should move to next page
   * Returns -1 if no adjustment needed (element fits)
   */
  private applyWidowOrphanControl(
    linesThatFit: number,
    totalLines: number
  ): number {
    const { minLinesBeforeBreak, minLinesAfterBreak } = this.options.widowOrphan;

    // If element fits entirely, no adjustment needed
    if (linesThatFit >= totalLines) {
      return -1;
    }

    let adjusted = linesThatFit;

    // Orphan prevention: at least minLinesBeforeBreak must stay on current page
    if (adjusted < minLinesBeforeBreak && totalLines > adjusted) {
      this.stats.widowOrphanAdjustments++;
      return 0; // Move entire element to next page
    }

    // Widow prevention: at least minLinesAfterBreak must go to next page
    const linesOnNextPage = totalLines - adjusted;
    if (linesOnNextPage > 0 && linesOnNextPage < minLinesAfterBreak) {
      // "Steal" lines from current page to satisfy widow rule
      const linesToSteal = minLinesAfterBreak - linesOnNextPage;
      adjusted = Math.max(0, adjusted - linesToSteal);
      this.stats.widowOrphanAdjustments++;
    }

    // Final orphan check after widow adjustment
    if (adjusted > 0 && adjusted < minLinesBeforeBreak) {
      this.stats.widowOrphanAdjustments++;
      return 0; // Move entire element to next page
    }

    return adjusted;
  }

  /**
   * Split a text node at a line boundary
   */
  private splitTextNode(
    node: PolyglotNode,
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number,
    splitDepth: number
  ): void {
    // Start performance timing
    if (this.perfMonitor) this.perfMonitor.startOperation('textFragmentation', { nodeId: node.id });

    try {
      const text = node.textContent?.plain || '';
    const totalLines = this.estimateLines(node);
    const lineHeight = this.options.estimatedLineHeight;
    const currentPage = pages[pages.length - 1];
    const availableHeight = contentHeight - currentPage.currentY;

    // Calculate lines that fit
    let linesThatFit = Math.floor(availableHeight / lineHeight);

    // Apply widow/orphan control
    const adjustedLines = this.applyWidowOrphanControl(linesThatFit, totalLines);

    if (adjustedLines === -1) {
      // Element fits entirely
      this.addNodeToPage(node, currentPage);
      return;
    }

    if (adjustedLines === 0) {
      // Move entire element to next page
      const newPage = this.createNewPage(pages, contentHeight, contentWidth);
      this.addNodeToPage(node, newPage);
      return;
    }

    linesThatFit = adjustedLines;
    this.stats.textFragmentations++;

    // Estimate character position for split
    const avgCharsPerLine = text.length / totalLines;
    let splitPosition = Math.floor(linesThatFit * avgCharsPerLine);

    // Adjust to word boundary
    splitPosition = this.findWordBoundary(text, splitPosition);

    if (splitPosition <= 0 || splitPosition >= text.length) {
      // Can't split meaningfully, place on new page
      if (currentPage.currentY > 0) {
        const newPage = this.createNewPage(pages, contentHeight, contentWidth);
        this.addNodeToPage(node, newPage);
      } else {
        this.addNodeToPage(node, currentPage);
      }
      return;
    }

    // Create first part
    const firstText = text.slice(0, splitPosition).trim();
    const firstHeight = linesThatFit * lineHeight;
    const firstPart: PolyglotNode = {
      ...node,
      id: `${node.id}_part1`,
      textContent: {
        ...node.textContent,
        plain: firstText,
        spans: this.splitSpans(node.textContent?.spans, 0, splitPosition),
      },
      rect: {
        ...node.rect!,
        y: currentPage.currentY,
        height: firstHeight,
      },
      metadata: {
        ...node.metadata,
        isFragmentFirst: true,
      },
    };
    currentPage.nodes.push(firstPart);
    currentPage.currentY += firstHeight;

    // Create continuation part
    const secondText = text.slice(splitPosition).trim();
    const secondHeight = (totalLines - linesThatFit) * lineHeight;
    const continuationPart: PolyglotNode = {
      ...node,
      id: `${node.id}_part2`,
      textContent: {
        ...node.textContent,
        plain: secondText,
        spans: this.splitSpans(node.textContent?.spans, splitPosition, text.length),
      },
      rect: {
        ...node.rect!,
        height: secondHeight,
      },
      metadata: {
        ...node.metadata,
        isContinuation: true,
      },
    };

    // Place continuation on new page (or current if it fits)
    const newPage = this.createNewPage(pages, contentHeight, contentWidth);

    // Check if continuation needs further splitting
    if (secondHeight > contentHeight) {
      this.splitTextNode(continuationPart, pages, contentHeight, contentWidth, splitDepth + 1);
    } else {
      this.addNodeToPage(continuationPart, newPage);
    }
    } finally {
      // End performance timing
      if (this.perfMonitor) this.perfMonitor.endOperation('textFragmentation');
    }
  }

  /**
   * Find the nearest word boundary before a position
   */
  private findWordBoundary(text: string, position: number): number {
    if (position <= 0) return 0;
    if (position >= text.length) return text.length;

    // Look backwards for whitespace
    let adjusted = position;
    while (adjusted > 0 && !/\s/.test(text[adjusted - 1])) {
      adjusted--;
    }

    // If we went all the way back, try looking forward instead
    if (adjusted === 0) {
      adjusted = position;
      while (adjusted < text.length && !/\s/.test(text[adjusted])) {
        adjusted++;
      }
    }

    return adjusted;
  }

  /**
   * Split rich text spans at a character position
   */
  private splitSpans(
    spans: Array<{ text: string; styles?: Record<string, unknown> }> | undefined,
    start: number,
    end: number
  ): Array<{ text: string; styles?: Record<string, unknown> }> | undefined {
    if (!spans || spans.length === 0) return undefined;

    const result: Array<{ text: string; styles?: Record<string, unknown> }> = [];
    let currentPos = 0;

    for (const span of spans) {
      const spanStart = currentPos;
      const spanEnd = currentPos + span.text.length;

      if (spanEnd <= start || spanStart >= end) {
        // Span is entirely outside the range
        currentPos = spanEnd;
        continue;
      }

      // Calculate overlap
      const overlapStart = Math.max(spanStart, start);
      const overlapEnd = Math.min(spanEnd, end);
      const relativeStart = overlapStart - spanStart;
      const relativeEnd = overlapEnd - spanStart;

      result.push({
        text: span.text.slice(relativeStart, relativeEnd),
        styles: span.styles,
      });

      currentPos = spanEnd;
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Handle overflow based on configured strategy
   */
  private handleOverflow(
    node: PolyglotNode,
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number,
    splitDepth: number
  ): void {
    // Start performance timing
    if (this.perfMonitor) this.perfMonitor.startOperation('overflowHandling', { nodeId: node.id });

    try {
      const nodeHeight = node.rect?.height || 0;
      const strategy = this.options.overflowStrategy;

      switch (strategy) {
      case 'clip':
        // Just add node as-is, it will be clipped at page boundary
        this.warnings.push(
          `CLIP: Node ${node.id} (${node.type}) clipped at page boundary`
        );
        this.stats.overflowNodes++;
        this.addNodeToPage(node, pages[pages.length - 1]);
        break;

      case 'shrink-to-fit': {
        // Scale node to fit within page
        const scaleFactor = Math.max(
          this.options.minScaleFactor,
          contentHeight / nodeHeight
        );

        if (scaleFactor < 1) {
          this.stats.shrinkToFitApplied++;
          const scaledNode: PolyglotNode = {
            ...node,
            rect: {
              ...node.rect!,
              height: nodeHeight * scaleFactor,
              width: (node.rect?.width || contentWidth) * scaleFactor,
            },
            metadata: {
              ...node.metadata,
              scaleFactor,
              originalHeight: nodeHeight,
            },
          };

          // Scale font size if present
          if (scaledNode.styles?.fontSize) {
            const originalSize = parseFloat(String(scaledNode.styles.fontSize)) || 12;
            scaledNode.styles = {
              ...scaledNode.styles,
              fontSize: originalSize * scaleFactor,
            };
          }

          this.warnings.push(
            `SHRINK: Node ${node.id} scaled to ${(scaleFactor * 100).toFixed(1)}%`
          );

          const currentPage = pages[pages.length - 1];
          if (currentPage.currentY > 0) {
            const newPage = this.createNewPage(pages, contentHeight, contentWidth);
            this.addNodeToPage(scaledNode, newPage);
          } else {
            this.addNodeToPage(scaledNode, currentPage);
          }
        } else {
          this.addNodeToPage(node, pages[pages.length - 1]);
        }
        break;
      }

      case 'tile':
        // Tile strategy: split content into grid of pages for very wide/tall content
        this.tileNode(node, pages, contentHeight, contentWidth);
        break;

      case 'emergency-split':
      default:
        // Force split even if it may cause issues
        if (this.canSplitNode(node)) {
          this.splitNode(node, pages, contentHeight, contentWidth, splitDepth + 1);
        } else {
          // Last resort: add with overflow warning
          this.warnings.push(
            `EMERGENCY OVERFLOW: Node ${node.id} (${node.type}) exceeds page height by ${nodeHeight - contentHeight}px`
          );
          this.stats.overflowNodes++;
          const currentPage = pages[pages.length - 1];
          if (currentPage.currentY > 0) {
            const newPage = this.createNewPage(pages, contentHeight, contentWidth);
            this.addNodeToPage(node, newPage);
          } else {
            this.addNodeToPage(node, currentPage);
          }
        }
        break;
      }
    } finally {
      // End performance timing
      if (this.perfMonitor) this.perfMonitor.endOperation('overflowHandling');
    }
  }

  /**
   * Tile a node across multiple pages (both horizontally and vertically)
   * Used for very wide content like large tables or images that exceed page dimensions
   */
  private tileNode(
    node: PolyglotNode,
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number
  ): void {
    const nodeWidth = node.rect?.width || 0;
    const nodeHeight = node.rect?.height || 0;

    // Calculate number of tiles needed
    const tilesHorizontal = Math.ceil(nodeWidth / contentWidth);
    const tilesVertical = Math.ceil(nodeHeight / contentHeight);
    const totalTiles = tilesHorizontal * tilesVertical;

    if (totalTiles <= 1) {
      // No tiling needed, just add to current or new page
      const currentPage = pages[pages.length - 1];
      if (currentPage.currentY > 0) {
        const newPage = this.createNewPage(pages, contentHeight, contentWidth);
        this.addNodeToPage(node, newPage);
      } else {
        this.addNodeToPage(node, currentPage);
      }
      return;
    }

    this.warnings.push(
      `TILE: Node ${node.id} (${node.type}) split into ${tilesHorizontal}x${tilesVertical} tiles (${totalTiles} pages) - original size: ${nodeWidth}x${nodeHeight}px`
    );

    // Create tiles in row-major order (left to right, top to bottom)
    for (let row = 0; row < tilesVertical; row++) {
      for (let col = 0; col < tilesHorizontal; col++) {
        // Calculate the viewport for this tile
        const tileX = col * contentWidth;
        const tileY = row * contentHeight;
        const tileWidth = Math.min(contentWidth, nodeWidth - tileX);
        const tileHeight = Math.min(contentHeight, nodeHeight - tileY);

        // Create a tile node with adjusted rect and tile metadata
        const tileInfo: TileInfo = {
          tileColumn: col,
          tileRow: row,
          totalColumns: tilesHorizontal,
          totalRows: tilesVertical,
          originalWidth: nodeWidth,
          originalHeight: nodeHeight,
        };

        const tileNode: PolyglotNode = {
          ...node,
          id: `${node.id}_tile_${row}_${col}`,
          rect: {
            x: 0, // Tiles start at origin of their page
            y: 0,
            width: tileWidth,
            height: tileHeight,
          },
          metadata: {
            ...node.metadata,
            tile: tileInfo,
            // Store the clip region for the serializer to use
            clipRegion: {
              x: tileX,
              y: tileY,
              width: tileWidth,
              height: tileHeight,
            },
          },
        };

        // Create a new page for each tile
        const tilePage = this.createNewPage(pages, contentHeight, contentWidth);

        // Add tile metadata to the page for serializers to reference
        tilePage.metadata = {
          ...tilePage.metadata,
          isTilePage: true,
          tileInfo,
          sourceNodeId: node.id,
        };

        this.addNodeToPage(tileNode, tilePage);
        this.stats.tilesCreated++;
      }
    }
  }

  /**
   * Split a generic node across pages
   */
  private splitNode(
    node: PolyglotNode,
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number,
    splitDepth: number
  ): void {
    if (!node.children || node.children.length === 0) {
      // No children to split - place as-is
      const currentPage = pages[pages.length - 1];
      if (currentPage.currentY > 0) {
        const newPage = this.createNewPage(pages, contentHeight, contentWidth);
        this.addNodeToPage(node, newPage);
      } else {
        this.addNodeToPage(node, currentPage);
      }
      return;
    }

    // Split by children
    for (const child of node.children) {
      this.checkIterationLimit();
      this.stats.totalNodes++;
      this.placeNode(child, pages, contentHeight, contentWidth, splitDepth);
    }
  }

  /**
   * Analyze a table structure for splitting
   */
  private analyzeTable(tableNode: PolyglotNode): TableAnalysis {
    const rows = tableNode.children || [];

    // Count rows and validate
    if (rows.length > MAX_TABLE_ROWS) {
      throw new PaginationError(
        'ERR_TABLE_TOO_LARGE',
        `Table has ${rows.length} rows, exceeds maximum ${MAX_TABLE_ROWS}`,
        { rowCount: rows.length, maxRows: MAX_TABLE_ROWS }
      );
    }

    // Separate header and body rows
    const headerRows = rows.filter(row => row.isTableHeader);
    const bodyRows = rows.filter(row => !row.isTableHeader);

    // Calculate header height
    const headerHeight = headerRows.reduce((sum, row) => sum + (row.rect?.height || 0), 0);

    // Count columns and build cell map
    let totalCols = 0;
    const cellMap = new Map<string, CellMapEntry>();
    const columnWidths: number[] = [];

    // First pass: determine column count and collect column widths
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const cells = row.children?.filter(c => c.type === 'cell') || [];
      let colIdx = 0;

      for (const cell of cells) {
        // Skip occupied positions (from previous rowspans)
        while (cellMap.has(`${rowIdx},${colIdx}`)) {
          colIdx++;
        }

        const colSpan = cell.colSpan || 1;
        const rowSpan = cell.rowSpan || 1;

        // Track column width from first row
        if (rowIdx === 0) {
          const cellWidth = cell.rect?.width || 0;
          for (let c = 0; c < colSpan; c++) {
            columnWidths[colIdx + c] = cellWidth / colSpan;
          }
        }

        // Register cell in map for all positions it occupies
        for (let r = 0; r < rowSpan; r++) {
          for (let c = 0; c < colSpan; c++) {
            const key = `${rowIdx + r},${colIdx + c}`;
            this.stats.cellMapOperations++;

            // Check cell map size limit
            if (this.stats.cellMapOperations > MAX_CELL_MAP_ENTRIES) {
              throw new PaginationError(
                'ERR_CELL_MAP_OVERFLOW',
                `Cell map exceeded ${MAX_CELL_MAP_ENTRIES} entries, table too complex`,
                { operations: this.stats.cellMapOperations }
              );
            }

            cellMap.set(key, {
              rowIndex: rowIdx,
              colIndex: colIdx,
              rowSpan,
              colSpan,
              sourceCell: cell,
              remainingRowSpan: rowSpan - r,
            });
          }
        }

        colIdx += colSpan;
        totalCols = Math.max(totalCols, colIdx);
      }
    }

    // Validate column count
    if (totalCols > MAX_TABLE_COLS) {
      throw new PaginationError(
        'ERR_TABLE_TOO_WIDE',
        `Table has ${totalCols} columns, exceeds maximum ${MAX_TABLE_COLS}`,
        { colCount: totalCols, maxCols: MAX_TABLE_COLS }
      );
    }

    return {
      headerRows,
      bodyRows,
      headerHeight,
      totalRows: rows.length,
      totalCols,
      cellMap,
      columnWidths,
    };
  }

  /**
   * Create continuation cells for rows that span a page break
   */
  private createContinuationRow(
    analysis: TableAnalysis,
    rowIndex: number,
    tableId: string
  ): PolyglotNode | null {
    const continuationCells: PolyglotNode[] = [];
    let hasSpanningCells = false;

    for (let colIdx = 0; colIdx < analysis.totalCols; colIdx++) {
      const entry = analysis.cellMap.get(`${rowIndex},${colIdx}`);

      if (entry && entry.rowIndex < rowIndex && entry.remainingRowSpan > 1) {
        // This is a continuation of a spanning cell from a previous row
        hasSpanningCells = true;

        // Only create one continuation cell per source cell (skip colspan duplicates)
        if (entry.colIndex === colIdx) {
          continuationCells.push({
            ...entry.sourceCell,
            id: `${entry.sourceCell.id}_cont_${rowIndex}`,
            rowSpan: entry.remainingRowSpan - 1,
            // Mark as continuation for styling purposes
            metadata: {
              ...entry.sourceCell.metadata,
              isContinuation: true,
              originalRowSpan: entry.rowSpan,
            },
          });
        }
      }
    }

    if (!hasSpanningCells) {
      return null;
    }

    return {
      id: `${tableId}_cont_row_${rowIndex}`,
      type: 'row',
      rect: { x: 0, y: 0, width: 0, height: 0 }, // Height will be calculated
      children: continuationCells,
      metadata: { isContinuationRow: true },
    };
  }

  /**
   * Split a table across pages with header repeat and cell span handling
   */
  private splitTable(
    tableNode: PolyglotNode,
    pages: PageContext[],
    contentHeight: number,
    contentWidth: number,
    splitDepth: number
  ): void {
    // Start performance timing
    if (this.perfMonitor) this.perfMonitor.startOperation('tableSplitting', { tableId: tableNode.id });

    try {
      // Check recursion depth
      if (splitDepth > MAX_SPLIT_DEPTH) {
        throw new PaginationError(
          'ERR_MAX_SPLIT_DEPTH',
          `Maximum split depth exceeded in table splitting`,
          { tableId: tableNode.id, splitDepth }
        );
      }

      const rows = tableNode.children || [];
      if (rows.length === 0) {
        return;
      }

      // Analyze table structure
      const analysis = this.analyzeTable(tableNode);
    const { headerRows, bodyRows, headerHeight, columnWidths } = analysis;

    // If headers alone exceed page height, just render everything and warn
    if (headerHeight >= contentHeight) {
      this.warnings.push(`Table ${tableNode.id}: headers exceed page height (${headerHeight}px > ${contentHeight}px)`);
      const currentPage = pages[pages.length - 1];
      if (currentPage.currentY > 0) {
        this.createNewPage(pages, contentHeight, contentWidth);
      }
      this.addNodeToPage(tableNode, pages[pages.length - 1]);
      return;
    }

    let currentTablePart: PolyglotNode | null = null;
    let currentTableHeight = 0;
    let partIndex = 0;

    const startNewTablePart = (page: PageContext): void => {
      currentTablePart = {
        ...tableNode,
        id: `${tableNode.id}_part_${partIndex++}`,
        children: this.options.repeatTableHeaders ? [...headerRows.map(r => ({ ...r }))] : [],
        rect: {
          ...tableNode.rect!,
          y: page.currentY,
          height: 0, // Will be calculated
        },
        // Preserve column widths for consistency
        columnWidths: columnWidths.length > 0 ? [...columnWidths] : tableNode.columnWidths,
      };
      currentTableHeight = this.options.repeatTableHeaders ? headerHeight : 0;
    };

    const finishTablePart = (page: PageContext): void => {
      if (currentTablePart) {
        const minRows = this.options.repeatTableHeaders ? headerRows.length : 0;
        if (currentTablePart.children!.length > minRows) {
          currentTablePart.rect!.height = currentTableHeight;
          page.nodes.push(currentTablePart);
          page.currentY += currentTableHeight;
        }
      }
    };

    // Start first table part
    let currentPage = pages[pages.length - 1];

    // Check if we need a new page to start
    if (currentPage.currentY + headerHeight > contentHeight && currentPage.currentY > 0) {
      currentPage = this.createNewPage(pages, contentHeight, contentWidth);
    }

    startNewTablePart(currentPage);

    // Process body rows
    for (let rowIdx = 0; rowIdx < bodyRows.length; rowIdx++) {
      this.checkIterationLimit();

      const row = bodyRows[rowIdx];
      const rowHeight = row.rect?.height || 0;
      const availableSpace = contentHeight - currentPage.currentY - currentTableHeight;

      if (rowHeight > availableSpace) {
        // Check for spanning cells that need continuation
        const absoluteRowIdx = headerRows.length + rowIdx;
        const continuationRow = this.createContinuationRow(analysis, absoluteRowIdx, tableNode.id);

        // Finish current table part
        finishTablePart(currentPage);
        this.stats.tablesSplit++;

        // Start new page
        currentPage = this.createNewPage(pages, contentHeight, contentWidth);
        startNewTablePart(currentPage);

        // Add continuation row if there are spanning cells
        if (continuationRow) {
          currentTablePart!.children!.push(continuationRow);
          // Note: continuation row height is complex to calculate, using 0 for now
          this.warnings.push(
            `Table ${tableNode.id}: row ${absoluteRowIdx} has spanning cells across page break`
          );
        }
      }

      // Add row to current table part
      currentTablePart!.children!.push({
        ...row,
        rect: {
          ...row.rect!,
          y: currentTableHeight,
        },
      });
      currentTableHeight += rowHeight;
    }

    // Finish last table part
    finishTablePart(currentPage);
    } finally {
      // End performance timing
      if (this.perfMonitor) this.perfMonitor.endOperation('tableSplitting');
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Paginate a root node with default options
 */
export function paginateDocument(
  rootNode: PolyglotNode,
  dimensions: PageDimensions
): PaginationResult {
  const paginator = new VLTPaginator({ dimensions });
  return paginator.paginate(rootNode);
}

// =============================================================================
// HEADING PAGE MAP (PRD-17: Pagination-Aware TOC)
// =============================================================================

/**
 * Compute a mapping from heading bookmark names to their paginator-computed
 * page numbers. Used by the Pro TOC to pre-populate accurate page numbers
 * without Word's "Update Fields" prompt.
 *
 * The function converts StructuredDocument elements to lightweight PolyglotNodes,
 * runs the VLTPaginator to determine page breaks, then extracts heading positions.
 *
 * @param doc - The structured document to analyze
 * @param pageConfig - Optional page dimensions override (uses doc.pages[0].dimensions if omitted)
 * @returns Map from bookmark name to 1-based page number
 */
export function getHeadingPageMap(
  doc: StructuredDocument,
  pageConfig?: StructuredPageDimensions,
): Map<string, number> {

  if (!doc.pages.length) {
    return new Map();
  }

  // Resolve page dimensions
  const sourceDims = pageConfig ?? doc.pages[0].dimensions;
  const dimensions: PageDimensions = {
    width: sourceDims.width,
    height: sourceDims.height,
    margin: {
      top: sourceDims.margins.top,
      right: sourceDims.margins.right,
      bottom: sourceDims.margins.bottom,
      left: sourceDims.margins.left,
    },
  };

  const contentWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const contentHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  // Build flat PolyglotNode tree from all pages
  const children: PolyglotNode[] = [];
  // Track heading node IDs in document order for bookmark generation
  const headingNodeIds: { id: string; text: string; level: number }[] = [];

  const measurer = new EstimatingTextMeasurer();
  let nodeCounter = 0;
  let cumulativeHeightOnPage = 0;

  for (let pageIdx = 0; pageIdx < doc.pages.length; pageIdx++) {
    const page = doc.pages[pageIdx];
    cumulativeHeightOnPage = 0;

    for (const element of page.elements) {
      let height = element.position?.height || 0;

      // Height fallback using text measurer
      if (height <= 0) {
        if (element.type === 'heading' || element.type === 'paragraph') {
          const textEl = element as { text?: string; style?: { fontFamily?: string; fontSize?: number; fontWeight?: string } };
          const text = textEl.text || '';
          if (text) {
            const measurement = measurer.measureText(
              text,
              {
                fontFamily: textEl.style?.fontFamily || 'Calibri',
                fontSize: textEl.style?.fontSize || (element.type === 'heading' ? 24 : 11),
                fontWeight: textEl.style?.fontWeight || (element.type === 'heading' ? 'bold' : 'normal'),
              },
              contentWidth,
            );
            height = measurement.height;
          } else {
            height = element.type === 'heading' ? 36 : 20; // Single line fallback
          }
        } else if (element.type === 'table') {
          height = 200;
        } else if (element.type === 'image') {
          height = 300;
        } else {
          height = 20; // Minimal fallback
        }
      }

      const nodeId = `toc_${element.id || `el_${nodeCounter++}`}`;

      const node: PolyglotNode = {
        id: nodeId,
        type: mapElementType(element.type),
        rect: { x: 0, y: 0, width: contentWidth, height },
      };

      // Track headings for later bookmark mapping
      if (element.type === 'heading') {
        const heading = element as HeadingElement;
        const headingText = heading.text ||
          (Array.isArray(heading.runs) ? heading.runs.map((r: any) => r.text || '').join('') : '');
        node.textContent = { plain: headingText };
        node.docx = { headingLevel: heading.level };
        headingNodeIds.push({ id: nodeId, text: headingText, level: heading.level });
      }

      children.push(node);
      cumulativeHeightOnPage += height;
    }

    // Insert spacer between source pages to honor explicit page breaks
    // (except after the last page)
    if (pageIdx < doc.pages.length - 1) {
      const remainingSpace = contentHeight - (cumulativeHeightOnPage % contentHeight);
      if (remainingSpace > 0 && remainingSpace < contentHeight) {
        children.push({
          id: `toc_spacer_${pageIdx}`,
          type: 'block',
          rect: { x: 0, y: 0, width: contentWidth, height: remainingSpace },
        });
      }
    }
  }

  if (headingNodeIds.length === 0) {
    return new Map();
  }

  // Create root document node
  const rootNode: PolyglotNode = {
    id: 'toc-pagination-root',
    type: 'document',
    rect: { x: 0, y: 0, width: contentWidth, height: 0 },
    children,
  };

  // Run paginator
  const paginator = new VLTPaginator({ dimensions });
  const result = paginator.paginate(rootNode);

  // Build nodeId → page number map from result
  const nodePageMap = new Map<string, number>();
  for (const page of result.pages) {
    const pageNumber = page.index + 1; // 1-based
    if (page.content.children) {
      for (const node of page.content.children) {
        if (node.type === 'heading') {
          nodePageMap.set(node.id, pageNumber);
        }
      }
    }
  }

  // Convert nodeId map to bookmark name map
  const bookmarkMap = new Map<string, number>();
  const bookmarkTracker = new Map<string, number>();

  for (const heading of headingNodeIds) {
    const bookmarkName = getUniqueBookmarkName(heading.text, bookmarkTracker);
    const pageNumber = nodePageMap.get(heading.id);
    if (pageNumber !== undefined) {
      bookmarkMap.set(bookmarkName, pageNumber);
    }
  }

  return bookmarkMap;
}

/**
 * Map StructuredElement types to PolyglotNode types for paginator consumption.
 */
function mapElementType(elementType: string): PolyglotNodeType {
  switch (elementType) {
    case 'heading': return 'heading';
    case 'paragraph': return 'paragraph';
    case 'table': return 'table';
    case 'image': return 'image';
    case 'chart': return 'chart';
    case 'shape': return 'shape';
    case 'list': return 'list';
    default: return 'block';
  }
}
