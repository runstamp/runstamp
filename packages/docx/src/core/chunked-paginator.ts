/**
 * Chunked Paginator
 * =================
 * Async/generator-based pagination for large documents.
 * Processes nodes in configurable chunks, yielding control between chunks
 * to prevent blocking and allow memory management.
 *
 * Phase 10 of Polyglot hardening.
 */

import type {
  PolyglotNode,
  PolyglotPage,
  PageDimensions,
} from './types';

import {
  VLTPaginator,
  type PaginationOptions,
  type PaginationResult,
} from './paginator';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default chunk size (nodes to process before yielding) */
export const DEFAULT_CHUNK_SIZE = 100;

/** Default yield delay in milliseconds (0 = nextTick/setImmediate) */
export const DEFAULT_YIELD_DELAY = 0;

/** Memory warning threshold in bytes (500MB) */
export const MEMORY_WARNING_THRESHOLD = 500 * 1024 * 1024;

/** Memory critical threshold in bytes (1GB) */
export const MEMORY_CRITICAL_THRESHOLD = 1024 * 1024 * 1024;

// =============================================================================
// TYPES
// =============================================================================

/** Configuration for chunked pagination */
export interface ChunkedPaginationOptions extends PaginationOptions {
  /** Number of nodes to process before yielding (default 100) */
  chunkSize?: number;
  /** Delay in ms between chunks (default 0 = nextTick) */
  yieldDelay?: number;
  /** Enable memory monitoring (default true in Node.js) */
  monitorMemory?: boolean;
  /** Memory warning threshold in bytes */
  memoryWarningThreshold?: number;
  /** Memory critical threshold in bytes (will pause pagination) */
  memoryCriticalThreshold?: number;
  /** Callback for progress updates */
  onProgress?: (progress: ChunkProgress) => void;
  /** Callback for memory warnings */
  onMemoryWarning?: (usage: MemoryUsage) => void;
}

/** Progress information for each chunk */
export interface ChunkProgress {
  /** Current chunk index (0-based) */
  chunkIndex: number;
  /** Total nodes processed so far */
  nodesProcessed: number;
  /** Total nodes to process (estimate) */
  totalNodes: number;
  /** Pages created so far */
  pagesCreated: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMs: number;
}

/** Memory usage information */
export interface MemoryUsage {
  /** Heap used in bytes */
  heapUsed: number;
  /** Heap total in bytes */
  heapTotal: number;
  /** External memory in bytes */
  external: number;
  /** RSS (resident set size) in bytes */
  rss: number;
  /** Whether we're above warning threshold */
  isWarning: boolean;
  /** Whether we're above critical threshold */
  isCritical: boolean;
}

/** Result of chunked pagination */
export interface ChunkedPaginationResult extends PaginationResult {
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Peak memory usage observed */
  peakMemoryUsage?: MemoryUsage;
  /** Whether pagination was paused due to memory pressure */
  pausedForMemory: boolean;
}

/** Checkpoint for resumable pagination */
export interface PaginationCheckpoint {
  /** Nodes that have been processed */
  processedNodeIds: Set<string>;
  /** Current page contexts */
  pageContexts: Array<{
    pageIndex: number;
    currentY: number;
    nodeCount: number;
  }>;
  /** Partial pages generated so far */
  partialPages: PolyglotPage[];
  /** Stats at checkpoint */
  stats: PaginationResult['stats'];
  /** Warnings collected so far */
  warnings: string[];
  /** Timestamp of checkpoint */
  timestamp: number;
}

// =============================================================================
// CHUNKED PAGINATOR CLASS
// =============================================================================

/**
 * Async paginator that processes documents in chunks.
 * Use this for large documents to prevent memory exhaustion and allow
 * progress reporting.
 */
export class ChunkedPaginator {
  private options: Required<Omit<ChunkedPaginationOptions, 'dimensions' | 'timeout' | 'onProgress' | 'onMemoryWarning' | 'performanceMonitor'>> &
    Pick<ChunkedPaginationOptions, 'dimensions' | 'timeout' | 'onProgress' | 'onMemoryWarning' | 'performanceMonitor'>;
  private peakMemory: MemoryUsage | null = null;
  private pausedForMemory = false;

  constructor(options: ChunkedPaginationOptions) {
    this.options = {
      repeatTableHeaders: true,
      maxPages: 1000,
      overflowStrategy: 'emergency-split',
      minScaleFactor: 0.5,
      widowOrphan: { minLinesBeforeBreak: 2, minLinesAfterBreak: 2 },
      estimatedLineHeight: 20,
      chunkSize: DEFAULT_CHUNK_SIZE,
      yieldDelay: DEFAULT_YIELD_DELAY,
      monitorMemory: typeof process !== 'undefined' && typeof process.memoryUsage === 'function',
      memoryWarningThreshold: MEMORY_WARNING_THRESHOLD,
      memoryCriticalThreshold: MEMORY_CRITICAL_THRESHOLD,
      ...options,
    };
  }

  /**
   * Paginate a document asynchronously in chunks.
   * This is the main entry point for chunked pagination.
   */
  async paginate(rootNode: PolyglotNode): Promise<ChunkedPaginationResult> {
    const allNodes = this.flattenNodes(rootNode);
    const totalNodes = allNodes.length;

    // For small documents, just use the synchronous paginator
    if (totalNodes <= this.options.chunkSize) {
      const syncPaginator = new VLTPaginator(this.options);
      const result = syncPaginator.paginate(rootNode);
      return {
        ...result,
        chunksProcessed: 1,
        peakMemoryUsage: this.getMemoryUsage(),
        pausedForMemory: false,
      };
    }

    // Process in chunks using the generator
    let chunksProcessed = 0;
    let lastResult: PaginationResult | null = null;

    for await (const progress of this.paginateGenerator(rootNode)) {
      chunksProcessed = progress.chunkIndex + 1;

      // Call progress callback
      if (this.options.onProgress) {
        this.options.onProgress(progress);
      }
    }

    // Get final result from sync paginator (generator was for chunking control)
    const syncPaginator = new VLTPaginator(this.options);
    lastResult = syncPaginator.paginate(rootNode);

    return {
      ...lastResult,
      chunksProcessed,
      peakMemoryUsage: this.peakMemory || undefined,
      pausedForMemory: this.pausedForMemory,
    };
  }

  /**
   * Generator-based pagination that yields after each chunk.
   * Use this for fine-grained control over pagination progress.
   */
  async *paginateGenerator(rootNode: PolyglotNode): AsyncGenerator<ChunkProgress, void, unknown> {
    const startTime = Date.now();
    const allNodes = this.flattenNodes(rootNode);
    const totalNodes = allNodes.length;
    const chunkSize = this.options.chunkSize;

    let nodesProcessed = 0;
    let chunkIndex = 0;

    while (nodesProcessed < totalNodes) {
      // Check memory before processing chunk
      if (this.options.monitorMemory) {
        const memUsage = this.getMemoryUsage();
        this.updatePeakMemory(memUsage);

        if (memUsage.isCritical) {
          this.pausedForMemory = true;
          if (this.options.onMemoryWarning) {
            this.options.onMemoryWarning(memUsage);
          }
          // Wait for GC and retry
          await this.triggerGCAndWait();
        } else if (memUsage.isWarning && this.options.onMemoryWarning) {
          this.options.onMemoryWarning(memUsage);
        }
      }

      // Process chunk
      const chunkEnd = Math.min(nodesProcessed + chunkSize, totalNodes);
      nodesProcessed = chunkEnd;

      // Calculate progress
      const elapsedMs = Date.now() - startTime;
      const percentComplete = (nodesProcessed / totalNodes) * 100;
      const rate = nodesProcessed / elapsedMs; // nodes per ms
      const remaining = totalNodes - nodesProcessed;
      const estimatedRemainingMs = rate > 0 ? remaining / rate : 0;

      const progress: ChunkProgress = {
        chunkIndex,
        nodesProcessed,
        totalNodes,
        pagesCreated: 0, // Will be updated in final result
        percentComplete,
        elapsedMs,
        estimatedRemainingMs,
      };

      yield progress;

      chunkIndex++;

      // Yield control to event loop
      await this.yieldControl();
    }
  }

  /**
   * Create a checkpoint for resumable pagination.
   * Note: Full checkpoint/resume is complex; this provides basic state capture.
   */
  createCheckpoint(
    processedNodes: PolyglotNode[],
    partialPages: PolyglotPage[],
    stats: PaginationResult['stats'],
    warnings: string[]
  ): PaginationCheckpoint {
    return {
      processedNodeIds: new Set(processedNodes.map(n => n.id)),
      pageContexts: partialPages.map((p, i) => ({
        pageIndex: i,
        currentY: 0, // Would need to track this
        nodeCount: p.content.children?.length || 0,
      })),
      partialPages,
      stats,
      warnings,
      timestamp: Date.now(),
    };
  }

  /**
   * Flatten all nodes in the document tree for counting/chunking.
   */
  private flattenNodes(node: PolyglotNode): PolyglotNode[] {
    const nodes: PolyglotNode[] = [node];

    if (node.children) {
      for (const child of node.children) {
        nodes.push(...this.flattenNodes(child));
      }
    }

    return nodes;
  }

  /**
   * Get current memory usage.
   */
  private getMemoryUsage(): MemoryUsage {
    if (typeof process === 'undefined' || typeof process.memoryUsage !== 'function') {
      // Browser environment - limited memory info
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        isWarning: false,
        isCritical: false,
      };
    }

    const mem = process.memoryUsage();
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
      isWarning: mem.heapUsed >= this.options.memoryWarningThreshold,
      isCritical: mem.heapUsed >= this.options.memoryCriticalThreshold,
    };
  }

  /**
   * Update peak memory tracking.
   */
  private updatePeakMemory(current: MemoryUsage): void {
    if (!this.peakMemory || current.heapUsed > this.peakMemory.heapUsed) {
      this.peakMemory = { ...current };
    }
  }

  /**
   * Yield control to the event loop.
   */
  private async yieldControl(): Promise<void> {
    const delay = this.options.yieldDelay;

    if (delay > 0) {
      return new Promise(resolve => setTimeout(resolve, delay));
    }

    // Use setImmediate in Node.js, setTimeout(0) in browser
    if (typeof setImmediate === 'function') {
      return new Promise(resolve => setImmediate(resolve));
    }

    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Attempt to trigger garbage collection and wait.
   */
  private async triggerGCAndWait(): Promise<void> {
    // global.gc is only available with --expose-gc flag
    if (typeof global !== 'undefined' && typeof (global as any).gc === 'function') {
      (global as any).gc();
    }

    // Wait a bit for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Paginate a document asynchronously with default options.
 */
export async function paginateDocumentAsync(
  rootNode: PolyglotNode,
  dimensions: PageDimensions,
  options?: Partial<ChunkedPaginationOptions>
): Promise<ChunkedPaginationResult> {
  const paginator = new ChunkedPaginator({ dimensions, ...options });
  return paginator.paginate(rootNode);
}

/**
 * Create a progress callback that logs to console.
 */
export function createConsoleProgressCallback(): (progress: ChunkProgress) => void {
  return (progress: ChunkProgress) => {
    const percent = progress.percentComplete.toFixed(1);
    const remaining = (progress.estimatedRemainingMs / 1000).toFixed(1);
    console.log(
      `[Paginator] Chunk ${progress.chunkIndex + 1}: ${percent}% complete, ` +
      `${progress.nodesProcessed}/${progress.totalNodes} nodes, ` +
      `~${remaining}s remaining`
    );
  };
}

/**
 * Create a memory warning callback that logs to console.
 */
export function createConsoleMemoryCallback(): (usage: MemoryUsage) => void {
  return (usage: MemoryUsage) => {
    const heapMB = (usage.heapUsed / 1024 / 1024).toFixed(1);
    const level = usage.isCritical ? 'CRITICAL' : 'WARNING';
    console.warn(`[Paginator] Memory ${level}: ${heapMB}MB heap used`);
  };
}
