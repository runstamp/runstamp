/**
 * Performance Monitor
 * ===================
 * Detailed performance metrics collection for pagination operations.
 * Tracks timing, operation counts, and provides export/logging utilities.
 *
 * Phase 11 of Polyglot hardening.
 */

// =============================================================================
// TYPES
// =============================================================================

/** Individual timing entry for an operation */
export interface TimingEntry {
  /** Operation name */
  operation: string;
  /** Start timestamp (ms) */
  startTime: number;
  /** End timestamp (ms) */
  endTime: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Optional metadata about the operation */
  metadata?: Record<string, unknown>;
}

/** Aggregated timing statistics for an operation type */
export interface TimingStats {
  /** Total number of times this operation was performed */
  count: number;
  /** Total time spent in this operation (ms) */
  totalMs: number;
  /** Minimum duration (ms) */
  minMs: number;
  /** Maximum duration (ms) */
  maxMs: number;
  /** Average duration (ms) */
  avgMs: number;
  /** Percentage of total time */
  percentOfTotal: number;
}

/** Complete performance metrics */
export interface PerformanceMetrics {
  /** Session identifier */
  sessionId: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;

  /** Operation counts */
  counts: {
    nodesProcessed: number;
    pagesCreated: number;
    tablesSplit: number;
    textFragmentations: number;
    overflowEvents: number;
    widowOrphanAdjustments: number;
    shrinkToFitApplied: number;
    placementAttempts: number;
    heartbeatChecks: number;
  };

  /** Timing breakdown by operation type */
  timing: {
    /** Time spent in pagination loop */
    pagination: TimingStats;
    /** Time spent splitting tables */
    tableSplitting: TimingStats;
    /** Time spent fragmenting text */
    textFragmentation: TimingStats;
    /** Time spent handling overflow */
    overflowHandling: TimingStats;
    /** Time spent in node placement */
    nodePlacement: TimingStats;
    /** Time spent in prescan */
    prescan: TimingStats;
    /** Time spent in page creation */
    pageCreation: TimingStats;
  };

  /** Per-page timing (first 100 pages) */
  perPageTiming: Array<{
    pageIndex: number;
    durationMs: number;
    nodeCount: number;
  }>;

  /** Throughput metrics */
  throughput: {
    /** Nodes per second */
    nodesPerSecond: number;
    /** Pages per second */
    pagesPerSecond: number;
    /** Average time per page (ms) */
    avgTimePerPageMs: number;
    /** Average time per node (ms) */
    avgTimePerNodeMs: number;
  };

  /** Memory metrics (if available) */
  memory?: {
    /** Peak heap used (bytes) */
    peakHeapUsed: number;
    /** Heap at start (bytes) */
    startHeapUsed: number;
    /** Heap at end (bytes) */
    endHeapUsed: number;
    /** Memory delta (bytes) */
    deltaBytes: number;
  };
}

/** Configuration for performance monitoring */
export interface PerformanceMonitorConfig {
  /** Enable detailed timing (may have overhead) */
  enableDetailedTiming?: boolean;
  /** Maximum per-page entries to track */
  maxPerPageEntries?: number;
  /** Enable memory tracking */
  enableMemoryTracking?: boolean;
  /** Custom session ID */
  sessionId?: string;
}

// =============================================================================
// PERFORMANCE MONITOR CLASS
// =============================================================================

/**
 * Performance monitor for tracking pagination metrics.
 *
 * Usage:
 * ```typescript
 * const monitor = new PerformanceMonitor();
 * monitor.start();
 *
 * // During pagination...
 * monitor.startOperation('tableSplitting');
 * // ... split table ...
 * monitor.endOperation('tableSplitting');
 *
 * monitor.incrementCount('tablesSplit');
 *
 * monitor.end();
 * const metrics = monitor.getMetrics();
 * console.log(monitor.formatSummary());
 * ```
 */
export class PerformanceMonitor {
  private config: Required<PerformanceMonitorConfig>;
  private sessionId: string;
  private startTime = 0;
  private endTime = 0;
  private isRunning = false;

  // Operation timings
  private timingEntries: TimingEntry[] = [];
  private activeOperations = new Map<string, number>();

  // Per-page timing
  private perPageTiming: Array<{ pageIndex: number; durationMs: number; nodeCount: number }> = [];
  private currentPageStart = 0;
  private currentPageNodeCount = 0;

  // Counts
  private counts = {
    nodesProcessed: 0,
    pagesCreated: 0,
    tablesSplit: 0,
    textFragmentations: 0,
    overflowEvents: 0,
    widowOrphanAdjustments: 0,
    shrinkToFitApplied: 0,
    placementAttempts: 0,
    heartbeatChecks: 0,
  };

  // Memory tracking
  private startMemory: NodeJS.MemoryUsage | null = null;
  private peakHeapUsed = 0;

  constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      enableDetailedTiming: true,
      maxPerPageEntries: 100,
      enableMemoryTracking: typeof process !== 'undefined' && typeof process.memoryUsage === 'function',
      sessionId: config.sessionId || this.generateSessionId(),
      ...config,
    };
    this.sessionId = this.config.sessionId;
  }

  /**
   * Start monitoring session.
   */
  start(): void {
    this.startTime = Date.now();
    this.endTime = 0;
    this.isRunning = true;
    this.timingEntries = [];
    this.activeOperations.clear();
    this.perPageTiming = [];
    this.currentPageStart = 0;
    this.currentPageNodeCount = 0;

    // Reset counts
    this.counts = {
      nodesProcessed: 0,
      pagesCreated: 0,
      tablesSplit: 0,
      textFragmentations: 0,
      overflowEvents: 0,
      widowOrphanAdjustments: 0,
      shrinkToFitApplied: 0,
      placementAttempts: 0,
      heartbeatChecks: 0,
    };

    // Capture initial memory
    if (this.config.enableMemoryTracking) {
      this.startMemory = process.memoryUsage();
      this.peakHeapUsed = this.startMemory.heapUsed;
    }
  }

  /**
   * End monitoring session.
   */
  end(): void {
    this.endTime = Date.now();
    this.isRunning = false;

    // Close any active operations
    for (const [operation, startTime] of this.activeOperations) {
      this.timingEntries.push({
        operation,
        startTime,
        endTime: this.endTime,
        durationMs: this.endTime - startTime,
        metadata: { autoEnded: true },
      });
    }
    this.activeOperations.clear();
  }

  /**
   * Start timing an operation.
   */
  startOperation(operation: string, _metadata?: Record<string, unknown>): void {
    if (!this.config.enableDetailedTiming) return;

    const now = Date.now();
    this.activeOperations.set(operation, now);

    // Update peak memory
    this.updatePeakMemory();
  }

  /**
   * End timing an operation.
   */
  endOperation(operation: string, metadata?: Record<string, unknown>): void {
    if (!this.config.enableDetailedTiming) return;

    const startTime = this.activeOperations.get(operation);
    if (startTime === undefined) return;

    const endTime = Date.now();
    this.timingEntries.push({
      operation,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      metadata,
    });

    this.activeOperations.delete(operation);
  }

  /**
   * Record time for a synchronous operation.
   */
  timeOperation<T>(operation: string, fn: () => T, metadata?: Record<string, unknown>): T {
    this.startOperation(operation, metadata);
    try {
      return fn();
    } finally {
      this.endOperation(operation, metadata);
    }
  }

  /**
   * Record time for an async operation.
   */
  async timeOperationAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.startOperation(operation, metadata);
    try {
      return await fn();
    } finally {
      this.endOperation(operation, metadata);
    }
  }

  /**
   * Increment a count.
   */
  incrementCount(counter: keyof typeof this.counts, amount = 1): void {
    this.counts[counter] += amount;
  }

  /**
   * Start timing a new page.
   */
  startPage(_pageIndex: number): void {
    this.currentPageStart = Date.now();
    this.currentPageNodeCount = 0;
  }

  /**
   * End timing for current page.
   */
  endPage(pageIndex: number): void {
    if (this.perPageTiming.length < this.config.maxPerPageEntries) {
      this.perPageTiming.push({
        pageIndex,
        durationMs: Date.now() - this.currentPageStart,
        nodeCount: this.currentPageNodeCount,
      });
    }
  }

  /**
   * Record a node being added to current page.
   */
  recordNodePlaced(): void {
    this.currentPageNodeCount++;
    this.counts.nodesProcessed++;
  }

  /**
   * Get aggregated timing stats for an operation type.
   */
  private getTimingStats(operation: string, totalDuration: number): TimingStats {
    const entries = this.timingEntries.filter(e => e.operation === operation);

    if (entries.length === 0) {
      return {
        count: 0,
        totalMs: 0,
        minMs: 0,
        maxMs: 0,
        avgMs: 0,
        percentOfTotal: 0,
      };
    }

    const durations = entries.map(e => e.durationMs);
    const totalMs = durations.reduce((a, b) => a + b, 0);

    return {
      count: entries.length,
      totalMs,
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations),
      avgMs: totalMs / entries.length,
      percentOfTotal: totalDuration > 0 ? (totalMs / totalDuration) * 100 : 0,
    };
  }

  /**
   * Update peak memory tracking.
   */
  private updatePeakMemory(): void {
    if (!this.config.enableMemoryTracking) return;

    const mem = process.memoryUsage();
    if (mem.heapUsed > this.peakHeapUsed) {
      this.peakHeapUsed = mem.heapUsed;
    }
  }

  /**
   * Generate a unique session ID.
   */
  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Get complete performance metrics.
   */
  getMetrics(): PerformanceMetrics {
    const totalDurationMs = (this.endTime || Date.now()) - this.startTime;

    const metrics: PerformanceMetrics = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime || Date.now(),
      totalDurationMs,

      counts: { ...this.counts },

      timing: {
        pagination: this.getTimingStats('pagination', totalDurationMs),
        tableSplitting: this.getTimingStats('tableSplitting', totalDurationMs),
        textFragmentation: this.getTimingStats('textFragmentation', totalDurationMs),
        overflowHandling: this.getTimingStats('overflowHandling', totalDurationMs),
        nodePlacement: this.getTimingStats('nodePlacement', totalDurationMs),
        prescan: this.getTimingStats('prescan', totalDurationMs),
        pageCreation: this.getTimingStats('pageCreation', totalDurationMs),
      },

      perPageTiming: [...this.perPageTiming],

      throughput: {
        nodesPerSecond: totalDurationMs > 0 ? (this.counts.nodesProcessed / totalDurationMs) * 1000 : 0,
        pagesPerSecond: totalDurationMs > 0 ? (this.counts.pagesCreated / totalDurationMs) * 1000 : 0,
        avgTimePerPageMs: this.counts.pagesCreated > 0 ? totalDurationMs / this.counts.pagesCreated : 0,
        avgTimePerNodeMs: this.counts.nodesProcessed > 0 ? totalDurationMs / this.counts.nodesProcessed : 0,
      },
    };

    // Add memory metrics if available
    if (this.config.enableMemoryTracking && this.startMemory) {
      const endMemory = process.memoryUsage();
      metrics.memory = {
        peakHeapUsed: this.peakHeapUsed,
        startHeapUsed: this.startMemory.heapUsed,
        endHeapUsed: endMemory.heapUsed,
        deltaBytes: endMemory.heapUsed - this.startMemory.heapUsed,
      };
    }

    return metrics;
  }

  /**
   * Get metrics as JSON string.
   */
  toJSON(pretty = false): string {
    const metrics = this.getMetrics();
    return pretty ? JSON.stringify(metrics, null, 2) : JSON.stringify(metrics);
  }

  /**
   * Format a human-readable summary.
   */
  formatSummary(): string {
    const m = this.getMetrics();
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                 PAGINATION PERFORMANCE REPORT              ');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Session ID: ${m.sessionId}`);
    lines.push(`Total Duration: ${m.totalDurationMs.toFixed(2)}ms`);
    lines.push('');

    lines.push('─── COUNTS ─────────────────────────────────────────────────');
    lines.push(`  Nodes Processed:      ${m.counts.nodesProcessed.toLocaleString()}`);
    lines.push(`  Pages Created:        ${m.counts.pagesCreated.toLocaleString()}`);
    lines.push(`  Tables Split:         ${m.counts.tablesSplit.toLocaleString()}`);
    lines.push(`  Text Fragmentations:  ${m.counts.textFragmentations.toLocaleString()}`);
    lines.push(`  Overflow Events:      ${m.counts.overflowEvents.toLocaleString()}`);
    lines.push(`  Widow/Orphan Fixes:   ${m.counts.widowOrphanAdjustments.toLocaleString()}`);
    lines.push('');

    lines.push('─── THROUGHPUT ─────────────────────────────────────────────');
    lines.push(`  Nodes/Second:         ${m.throughput.nodesPerSecond.toFixed(1)}`);
    lines.push(`  Pages/Second:         ${m.throughput.pagesPerSecond.toFixed(1)}`);
    lines.push(`  Avg Time/Page:        ${m.throughput.avgTimePerPageMs.toFixed(2)}ms`);
    lines.push(`  Avg Time/Node:        ${m.throughput.avgTimePerNodeMs.toFixed(3)}ms`);
    lines.push('');

    lines.push('─── TIMING BREAKDOWN ───────────────────────────────────────');
    const timings = Object.entries(m.timing)
      .filter(([_, stats]) => stats.count > 0)
      .sort((a, b) => b[1].totalMs - a[1].totalMs);

    for (const [name, stats] of timings) {
      const bar = '█'.repeat(Math.min(20, Math.round(stats.percentOfTotal / 5)));
      lines.push(`  ${name.padEnd(18)} ${stats.totalMs.toFixed(1).padStart(8)}ms (${stats.percentOfTotal.toFixed(1).padStart(5)}%) ${bar}`);
      lines.push(`                     calls: ${stats.count}, avg: ${stats.avgMs.toFixed(2)}ms, min: ${stats.minMs.toFixed(2)}ms, max: ${stats.maxMs.toFixed(2)}ms`);
    }
    lines.push('');

    if (m.memory) {
      lines.push('─── MEMORY ─────────────────────────────────────────────────');
      lines.push(`  Peak Heap:            ${(m.memory.peakHeapUsed / 1024 / 1024).toFixed(1)}MB`);
      lines.push(`  Start Heap:           ${(m.memory.startHeapUsed / 1024 / 1024).toFixed(1)}MB`);
      lines.push(`  End Heap:             ${(m.memory.endHeapUsed / 1024 / 1024).toFixed(1)}MB`);
      lines.push(`  Delta:                ${(m.memory.deltaBytes / 1024 / 1024).toFixed(1)}MB`);
      lines.push('');
    }

    if (m.perPageTiming.length > 0) {
      lines.push('─── PER-PAGE TIMING (first 10) ─────────────────────────────');
      for (const pt of m.perPageTiming.slice(0, 10)) {
        lines.push(`  Page ${pt.pageIndex.toString().padStart(3)}: ${pt.durationMs.toFixed(1).padStart(6)}ms (${pt.nodeCount} nodes)`);
      }
      if (m.perPageTiming.length > 10) {
        lines.push(`  ... and ${m.perPageTiming.length - 10} more pages`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Log summary to console.
   */
  logSummary(): void {
    console.log(this.formatSummary());
  }

  /**
   * Check if monitor is currently running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current counts (for live updates).
   */
  getCurrentCounts(): typeof this.counts {
    return { ...this.counts };
  }

  /**
   * Get elapsed time since start.
   */
  getElapsedMs(): number {
    if (!this.startTime) return 0;
    return (this.endTime || Date.now()) - this.startTime;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/** Global monitor instance for simple use cases */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create the global performance monitor.
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Reset the global performance monitor.
 */
export function resetPerformanceMonitor(): void {
  globalMonitor = null;
}

/**
 * Create a new performance monitor with custom config.
 */
export function createPerformanceMonitor(config?: PerformanceMonitorConfig): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

/**
 * Format milliseconds as human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}
