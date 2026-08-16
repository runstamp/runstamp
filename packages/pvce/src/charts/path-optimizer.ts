/**
 * PVCE Path Optimizer
 * ===================
 * Document 3, Section 2: Path Optimization
 *
 * Implements Visvalingam-Whyatt algorithm for path simplification
 * to reduce SVG file size while maintaining visual fidelity.
 */

import { LBU, OptimizedPath, PathSimplificationOptions, Point } from "./types.js";

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const DEFAULT_OPTIONS: Required<PathSimplificationOptions> = {
  areaThreshold: 0.5,
  subPixelThreshold: 0.01,
  maxPoints: undefined as unknown as number,
};

// =============================================================================
// PATH OPTIMIZER CLASS
// =============================================================================

/**
 * PathOptimizer - Reduces path complexity for smaller file sizes.
 *
 * Doc 3, Section 2 compliance:
 * - Visvalingam-Whyatt algorithm for point removal
 * - Sub-pixel threshold (0.01px) for insignificant points
 * - Maintains visual fidelity at target resolution
 */
export class PathOptimizer {
  private options: Required<PathSimplificationOptions>;

  constructor(options: Partial<PathSimplificationOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      maxPoints: options.maxPoints ?? Infinity,
    };
  }

  /**
   * Simplify a path using Visvalingam-Whyatt algorithm.
   * Removes points that contribute the least visual area.
   */
  simplifyPath(points: Point[]): OptimizedPath {
    if (points.length <= 2) {
      return {
        originalPointCount: points.length,
        optimizedPointCount: points.length,
        pathData: this.pointsToPathData(points),
        savings: 0,
      };
    }

    // Apply Visvalingam-Whyatt simplification
    const simplified = this.visvalingamWhyatt(
      points,
      this.options.areaThreshold,
    );

    // Apply sub-pixel filtering
    const filtered = this.filterSubPixel(simplified);

    // Limit max points if specified
    const final =
      this.options.maxPoints < filtered.length
        ? this.reduceToMaxPoints(filtered, this.options.maxPoints)
        : filtered;

    const savings =
      points.length > 0
        ? ((points.length - final.length) / points.length) * 100
        : 0;

    return {
      originalPointCount: points.length,
      optimizedPointCount: final.length,
      pathData: this.pointsToPathData(final),
      savings: Math.round(savings * 100) / 100,
    };
  }

  /**
   * Simplify an SVG path string (d attribute).
   */
  simplifyPathString(pathData: string): OptimizedPath {
    const points = this.parsePathData(pathData);
    return this.simplifyPath(points);
  }

  /**
   * Optimize multiple paths and return combined statistics.
   */
  optimizePaths(paths: Array<{ id: string; points: Point[] }>): {
    optimizedPaths: Array<{ id: string; pathData: string }>;
    totalOriginalPoints: number;
    totalOptimizedPoints: number;
    totalSavings: number;
  } {
    let totalOriginal = 0;
    let totalOptimized = 0;

    const optimizedPaths = paths.map(({ id, points }) => {
      const result = this.simplifyPath(points);
      totalOriginal += result.originalPointCount;
      totalOptimized += result.optimizedPointCount;
      return { id, pathData: result.pathData };
    });

    const totalSavings =
      totalOriginal > 0
        ? ((totalOriginal - totalOptimized) / totalOriginal) * 100
        : 0;

    return {
      optimizedPaths,
      totalOriginalPoints: totalOriginal,
      totalOptimizedPoints: totalOptimized,
      totalSavings: Math.round(totalSavings * 100) / 100,
    };
  }

  // ===========================================================================
  // PRIVATE: Visvalingam-Whyatt Algorithm
  // ===========================================================================

  /**
   * Visvalingam-Whyatt simplification algorithm.
   * Iteratively removes the point with the smallest effective area.
   */
  private visvalingamWhyatt(points: Point[], threshold: number): Point[] {
    if (points.length <= 2) return points;

    // Create working copy with area calculations
    interface PointWithArea {
      point: Point;
      area: number;
      prev: PointWithArea | null;
      next: PointWithArea | null;
    }

    // Build linked list
    const nodes: PointWithArea[] = points.map((point) => ({
      point,
      area: Infinity,
      prev: null,
      next: null,
    }));

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].prev = i > 0 ? nodes[i - 1] : null;
      nodes[i].next = i < nodes.length - 1 ? nodes[i + 1] : null;
    }

    // Calculate initial areas
    for (let i = 1; i < nodes.length - 1; i++) {
      nodes[i].area = this.triangleArea(
        nodes[i].prev!.point,
        nodes[i].point,
        nodes[i].next!.point,
      );
    }

    // Build min-heap of internal points
    const heap = nodes.slice(1, -1);
    this.heapify(heap);

    // Remove points below threshold
    while (heap.length > 0 && heap[0].area < threshold) {
      const minNode = this.heapPop(heap);
      if (!minNode) break;

      // Remove from linked list
      if (minNode.prev) minNode.prev.next = minNode.next;
      if (minNode.next) minNode.next.prev = minNode.prev;

      // Update neighbors' areas
      if (minNode.prev && minNode.prev.prev) {
        const newArea = this.triangleArea(
          minNode.prev.prev.point,
          minNode.prev.point,
          minNode.prev.next?.point ?? minNode.prev.point,
        );
        // Area can only increase (Visvalingam property)
        minNode.prev.area = Math.max(minNode.prev.area, newArea);
        this.heapUpdate(heap, minNode.prev);
      }

      if (minNode.next && minNode.next.next) {
        const newArea = this.triangleArea(
          minNode.next.prev?.point ?? minNode.next.point,
          minNode.next.point,
          minNode.next.next.point,
        );
        minNode.next.area = Math.max(minNode.next.area, newArea);
        this.heapUpdate(heap, minNode.next);
      }
    }

    // Collect remaining points
    const result: Point[] = [];
    let current: PointWithArea | null = nodes[0];
    while (current) {
      result.push(current.point);
      current = current.next;
    }

    return result;
  }

  /**
   * Calculate the area of a triangle formed by three points.
   * Uses the shoelace formula.
   */
  private triangleArea(p1: Point, p2: Point, p3: Point): number {
    return Math.abs(
      (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2,
    );
  }

  // ===========================================================================
  // PRIVATE: Sub-Pixel Filtering
  // ===========================================================================

  /**
   * Remove points that are within sub-pixel threshold of their neighbors.
   * Doc 3, Section 2: "Points smaller than 0.01px rendering threshold"
   */
  private filterSubPixel(points: Point[]): Point[] {
    if (points.length <= 2) return points;

    const threshold = this.options.subPixelThreshold;
    const result: Point[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Check if point is significant
      const distToPrev = this.distance(prev, curr);
      const distToNext = this.distance(curr, next);

      if (distToPrev > threshold || distToNext > threshold) {
        result.push(curr);
      }
    }

    // Always keep last point
    result.push(points[points.length - 1]);

    return result;
  }

  /**
   * Euclidean distance between two points.
   */
  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Reduce to maximum number of points using adaptive simplification.
   */
  private reduceToMaxPoints(points: Point[], maxPoints: number): Point[] {
    if (points.length <= maxPoints) return points;

    // Iteratively increase threshold until we meet the target
    let threshold = this.options.areaThreshold;
    let result = points;

    while (result.length > maxPoints && threshold < 1000000) {
      threshold *= 2;
      result = this.visvalingamWhyatt(points, threshold);
    }

    return result;
  }

  // ===========================================================================
  // PRIVATE: Path Data Conversion
  // ===========================================================================

  /**
   * Convert points to SVG path data string.
   */
  private pointsToPathData(points: Point[]): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M${this.formatCoord(points[0])}`;

    const parts: string[] = [`M${this.formatCoord(points[0])}`];

    for (let i = 1; i < points.length; i++) {
      parts.push(`L${this.formatCoord(points[i])}`);
    }

    return parts.join("");
  }

  /**
   * Format coordinate with appropriate precision.
   */
  private formatCoord(p: Point): string {
    // Round to 2 decimal places to reduce file size
    const x = Math.round(p.x * 100) / 100;
    const y = Math.round(p.y * 100) / 100;
    return `${x},${y}`;
  }

  /**
   * Parse SVG path data into points.
   * Handles M, L, H, V, and Z commands.
   */
  private parsePathData(d: string): Point[] {
    const points: Point[] = [];
    let currentX = 0;
    let currentY = 0;

    // Simple parser for common path commands
    const commands = d.match(/[MLHVZmlhvz][^MLHVZmlhvz]*/g) || [];

    for (const cmd of commands) {
      const type = cmd[0];
      const args = cmd
        .slice(1)
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat)
        .filter((n) => !isNaN(n));

      switch (type) {
        case "M":
        case "m":
          if (args.length >= 2) {
            currentX = type === "M" ? args[0] : currentX + args[0];
            currentY = type === "M" ? args[1] : currentY + args[1];
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "L":
        case "l":
          for (let i = 0; i < args.length; i += 2) {
            currentX = type === "L" ? args[i] : currentX + args[i];
            currentY = type === "L" ? args[i + 1] : currentY + args[i + 1];
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "H":
        case "h":
          for (const arg of args) {
            currentX = type === "H" ? arg : currentX + arg;
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "V":
        case "v":
          for (const arg of args) {
            currentY = type === "V" ? arg : currentY + arg;
            points.push({ x: currentX, y: currentY });
          }
          break;

        case "Z":
        case "z":
          // Close path - connect back to start
          if (points.length > 0) {
            currentX = points[0].x;
            currentY = points[0].y;
          }
          break;
      }
    }

    return points;
  }

  // ===========================================================================
  // PRIVATE: Min-Heap Operations
  // ===========================================================================

  private heapify<T extends { area: number }>(heap: T[]): void {
    for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) {
      this.heapDown(heap, i);
    }
  }

  private heapPop<T extends { area: number }>(heap: T[]): T | undefined {
    if (heap.length === 0) return undefined;

    const result = heap[0];
    const last = heap.pop()!;

    if (heap.length > 0) {
      heap[0] = last;
      this.heapDown(heap, 0);
    }

    return result;
  }

  private heapUpdate<T extends { area: number }>(heap: T[], node: T): void {
    const index = heap.indexOf(node);
    if (index === -1) return;

    this.heapUp(heap, index);
    this.heapDown(heap, index);
  }

  private heapUp<T extends { area: number }>(heap: T[], index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (heap[parent].area <= heap[index].area) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      index = parent;
    }
  }

  private heapDown<T extends { area: number }>(heap: T[], index: number): void {
    const length = heap.length;

    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < length && heap[left].area < heap[smallest].area) {
        smallest = left;
      }
      if (right < length && heap[right].area < heap[smallest].area) {
        smallest = right;
      }

      if (smallest === index) break;

      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default path optimizer */
export const pathOptimizer = new PathOptimizer();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Simplify a path with default options.
 */
export function simplifyPath(points: Point[]): OptimizedPath {
  return pathOptimizer.simplifyPath(points);
}

/**
 * Simplify an SVG path string.
 */
export function simplifyPathString(pathData: string): OptimizedPath {
  return pathOptimizer.simplifyPathString(pathData);
}

/**
 * Generate points for a line chart and optimize.
 */
export function optimizeLineChart(
  values: number[],
  bounds: { x: LBU; y: LBU; width: LBU; height: LBU },
): OptimizedPath {
  if (values.length === 0) {
    return {
      originalPointCount: 0,
      optimizedPointCount: 0,
      pathData: "",
      savings: 0,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points: Point[] = values.map((v, i) => ({
    x: bounds.x + (i / (values.length - 1 || 1)) * bounds.width,
    y: bounds.y + bounds.height - ((v - min) / range) * bounds.height,
  }));

  return pathOptimizer.simplifyPath(points);
}
