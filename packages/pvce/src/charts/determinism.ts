/**
 * PVCE Determinism Engine
 * =======================
 * Document 1, Section 4: Absolute Determinism - The "Time = 0" Mandate
 *
 * Features:
 * - Seedable PRNG (Pseudo-Random Number Generator)
 * - Data hashing for VRT (Visual Regression Testing)
 * - Zero-animation policy enforcement
 * - Deterministic ID generation
 */

import type { SeededRandom, SceneGraph, SceneNode } from "./types.js";
import crypto from "crypto";

// =============================================================================
// SEEDABLE PRNG (Doc 1, Section 4)
// =============================================================================

/**
 * Mulberry32 - A fast, high-quality 32-bit PRNG.
 * Produces deterministic sequences from a given seed.
 *
 * Used for:
 * - Jitter plots (Doc 1, Section 4: Math.random() Ban)
 * - Consistent scatter point positioning
 * - Reproducible "random" visual elements
 */
export class Mulberry32 implements SeededRandom {
  private state: number;
  public readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }

  /**
   * Get next random number in range [0, 1).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in range [min, max] (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random item from array.
   */
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array using Fisher-Yates algorithm.
   * Returns a new array (does not mutate input).
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Reset to initial seed state.
   */
  reset(): void {
    this.state = this.seed;
  }
}

// =============================================================================
// DATA HASHING (Doc 1, Section 3)
// =============================================================================

/**
 * Generate a deterministic hash from chart data.
 * Used for VRT verification (Doc 1, Section 3: metadata.dataHash).
 */
export function hashData(data: unknown): string {
  const normalized = normalizeForHashing(data);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generate a short hash (first 8 chars) for display/IDs.
 */
export function shortHash(data: unknown): string {
  return hashData(data).substring(0, 8);
}

/**
 * Normalize data for consistent hashing.
 * Handles floating-point precision, object key ordering, etc.
 */
function normalizeForHashing(data: unknown): string {
  return JSON.stringify(data, (key, value) => {
    // Normalize floating-point numbers to fixed precision
    if (typeof value === "number") {
      return Math.round(value * 1000000) / 1000000;
    }
    // Sort object keys for consistent ordering
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = (value as Record<string, unknown>)[k];
          return sorted;
        }, {});
    }
    return value;
  });
}

// =============================================================================
// DETERMINISTIC ID GENERATION (Doc 1, Section 3)
// =============================================================================

/**
 * Generate a deterministic ID from data index.
 * Doc 1, Section 3: "Deterministic ID generated from data index"
 */
export function generateNodeId(
  prefix: string,
  dataIndex: number,
  parentId?: string,
): string {
  const base = parentId ? `${parentId}-${prefix}` : prefix;
  return `${base}-${dataIndex}`;
}

/**
 * Generate IDs for an array of items.
 */
export function generateNodeIds(
  prefix: string,
  count: number,
  parentId?: string,
): string[] {
  return Array.from({ length: count }, (_, i) =>
    generateNodeId(prefix, i, parentId),
  );
}

// =============================================================================
// ZERO-ANIMATION POLICY (Doc 1, Section 4)
// =============================================================================

/**
 * Strip all animation-related attributes from scene nodes.
 * Doc 1, Section 4: "All animations are stripped at the compiler level."
 */
export function stripAnimations(node: SceneNode): SceneNode {
  const cleaned = { ...node };

  // Remove animation-related attributes
  const animationProps = [
    "transition",
    "animation",
    "animationDuration",
    "animationDelay",
    "animationTimingFunction",
    "transitionDuration",
    "transitionDelay",
  ];

  const cleanedAttrs = { ...cleaned.attributes };
  for (const prop of animationProps) {
    delete (cleanedAttrs as Record<string, unknown>)[prop];
  }
  cleaned.attributes = cleanedAttrs;

  // Recursively clean children
  if (cleaned.children) {
    cleaned.children = cleaned.children.map(stripAnimations);
  }

  return cleaned;
}

/**
 * Verify a scene graph has no animations.
 */
export function verifyNoAnimations(graph: SceneGraph): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  function checkNode(node: SceneNode, path: string): void {
    const attrs = node.attributes as Record<string, unknown>;

    if (attrs.transition || attrs.animation || attrs.animationDuration) {
      violations.push(`${path}: Contains animation properties`);
    }

    if (node.children) {
      node.children.forEach((child, i) => {
        checkNode(child, `${path}.children[${i}]`);
      });
    }
  }

  checkNode(graph.root, "root");

  return {
    valid: violations.length === 0,
    violations,
  };
}

// =============================================================================
// SCENE GRAPH VALIDATION (Doc 1)
// =============================================================================

/**
 * Validate scene graph for determinism requirements.
 */
export function validateDeterminism(graph: SceneGraph): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check version
  if (!graph.version) {
    errors.push("Missing version field");
  }

  // Check viewBox
  if (!graph.viewBox || graph.viewBox.width <= 0 || graph.viewBox.height <= 0) {
    errors.push("Invalid viewBox dimensions");
  }

  // Check data hash
  if (!graph.metadata?.dataHash) {
    warnings.push("Missing dataHash in metadata - VRT verification disabled");
  }

  // Check for animations
  const animCheck = verifyNoAnimations(graph);
  if (!animCheck.valid) {
    errors.push(...animCheck.violations);
  }

  // Check node IDs are unique
  const ids = new Set<string>();
  function checkIds(node: SceneNode): void {
    if (ids.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    ids.add(node.id);
    node.children?.forEach(checkIds);
  }
  checkIds(graph.root);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// SCENE GRAPH COMPARISON (VRT Support)
// =============================================================================

/**
 * Compare two scene graphs for equality.
 * Used for "Same Data, Same ID" test (Doc 1, Section 6).
 */
export function compareSceneGraphs(
  graph1: SceneGraph,
  graph2: SceneGraph,
): {
  equal: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  // Compare viewBox
  if (
    graph1.viewBox.width !== graph2.viewBox.width ||
    graph1.viewBox.height !== graph2.viewBox.height
  ) {
    differences.push("ViewBox dimensions differ");
  }

  // Compare data hashes
  if (graph1.metadata?.dataHash !== graph2.metadata?.dataHash) {
    differences.push("Data hashes differ");
  }

  // Deep compare nodes
  function compareNodes(n1: SceneNode, n2: SceneNode, path: string): void {
    if (n1.type !== n2.type) {
      differences.push(`${path}: Type mismatch (${n1.type} vs ${n2.type})`);
      return;
    }

    if (n1.id !== n2.id) {
      differences.push(`${path}: ID mismatch (${n1.id} vs ${n2.id})`);
    }

    // Compare coordinates with floating-point tolerance
    const tolerance = 0.0001;
    if (
      Math.abs(n1.x - n2.x) > tolerance ||
      Math.abs(n1.y - n2.y) > tolerance
    ) {
      differences.push(`${path}: Position mismatch`);
    }

    // Compare attributes
    const attrs1 = JSON.stringify(n1.attributes);
    const attrs2 = JSON.stringify(n2.attributes);
    if (attrs1 !== attrs2) {
      differences.push(`${path}: Attributes differ`);
    }

    // Compare children
    const children1 = n1.children || [];
    const children2 = n2.children || [];

    if (children1.length !== children2.length) {
      differences.push(`${path}: Child count mismatch`);
    } else {
      children1.forEach((c1, i) => {
        compareNodes(c1, children2[i], `${path}.children[${i}]`);
      });
    }
  }

  compareNodes(graph1.root, graph2.root, "root");

  return {
    equal: differences.length === 0,
    differences,
  };
}

// =============================================================================
// SEED DERIVATION
// =============================================================================

/**
 * Derive a seed from data for reproducible "random" elements.
 * Doc 1, Section 4: "Seed is derived from the data hash"
 */
export function deriveSeedFromData(data: unknown): number {
  const hash = hashData(data);
  // Convert first 8 hex chars to number
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Create a seeded random generator from chart data.
 */
export function createSeededRandom(data: unknown): SeededRandom {
  const seed = deriveSeedFromData(data);
  return new Mulberry32(seed);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { SeededRandom };
