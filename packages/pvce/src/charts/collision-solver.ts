/**
 * PVCE Axis Collision Solver
 * ==========================
 * Document 2, Section 3: The Axis Collision Solver (X-Axis)
 * Document 2, Section 4: The Point-to-Label "Force" Algorithm
 * Document 2, Section 5: Radial Labeling (Leader Lines)
 *
 * Implements a 4-level deterministic collision resolution strategy.
 */

import {
  TextBox,
  LabelPlacement,
  LeaderLine,
  CollisionLevel,
  Point,
  LBU,
  Rect,
} from "./types.js";
import { GlyphOracle, glyphOracle } from "./glyph-oracle.js";

// =============================================================================
// COLLISION RESOLUTION CONFIGURATION
// =============================================================================

/** Configuration for collision resolution */
export interface CollisionConfig {
  /** Minimum gap between labels (LBU) */
  minGap: LBU;
  /** Maximum iterations for force-directed layout */
  maxIterations: number;
  /** Displacement threshold for leader lines */
  leaderLineThreshold: LBU;
  /** Enable staggering strategy */
  enableStagger: boolean;
  /** Enable rotation strategy */
  enableRotation: boolean;
  /** Enable sampling strategy */
  enableSampling: boolean;
  /** Preferred rotation angles */
  rotationAngles: number[];
  /** Sample step options (show every Nth) */
  sampleSteps: number[];
}

/** Default collision configuration */
const DEFAULT_CONFIG: CollisionConfig = {
  minGap: 8,
  maxIterations: 50,
  leaderLineThreshold: 50,
  enableStagger: true,
  enableRotation: true,
  enableSampling: true,
  rotationAngles: [45, 90],
  sampleSteps: [2, 3, 5, 10],
};

// =============================================================================
// AXIS COLLISION SOLVER CLASS
// =============================================================================

/**
 * AxisCollisionSolver - Resolves label collisions deterministically
 *
 * Doc 2, Section 3: Linear Conflict Resolver with 4 levels:
 * - Level 0: Standard (horizontal labels)
 * - Level 1: Staggered (alternating rows)
 * - Level 2: Rotated (45° or 90°)
 * - Level 3: Sampled (show every Nth label)
 */
export class AxisCollisionSolver {
  private oracle: GlyphOracle;
  private config: CollisionConfig;

  constructor(
    oracle: GlyphOracle = glyphOracle,
    config: Partial<CollisionConfig> = {},
  ) {
    this.oracle = oracle;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Resolve X-axis label collisions using the 4-level strategy.
   * Returns placement information for all labels.
   */
  resolveAxisLabels(
    labels: string[],
    axisStart: LBU,
    axisEnd: LBU,
    axisY: LBU,
    fontSize: number,
    fontFamily: string = "Arial",
  ): { placements: LabelPlacement[]; level: CollisionLevel } {
    if (labels.length === 0) {
      return { placements: [], level: CollisionLevel.STANDARD };
    }

    // Create text boxes for all labels
    const textBoxes = labels.map((text) =>
      this.oracle.createTextBox(text, fontSize, { fontFamily }),
    );

    // Calculate positions along axis
    const axisWidth = axisEnd - axisStart;
    const spacing = axisWidth / (labels.length - 1 || 1);
    const positions: Point[] = labels.map((_, i) => ({
      x: axisStart + i * spacing,
      y: axisY,
    }));

    // Try each level until no collisions
    // Level 0: Standard horizontal
    let result = this.tryStandardLayout(textBoxes, positions, labels);
    if (!result.hasCollisions) {
      return { placements: result.placements, level: CollisionLevel.STANDARD };
    }

    // Level 1: Staggered (alternating rows)
    if (this.config.enableStagger) {
      result = this.tryStaggeredLayout(textBoxes, positions, labels, fontSize);
      if (!result.hasCollisions) {
        return {
          placements: result.placements,
          level: CollisionLevel.STAGGERED,
        };
      }
    }

    // Level 2: Rotated (45°, then 90°)
    if (this.config.enableRotation) {
      for (const angle of this.config.rotationAngles) {
        const rotatedBoxes = textBoxes.map((box) => ({
          ...box,
          rotation: angle,
        }));
        result = this.tryRotatedLayout(rotatedBoxes, positions, labels, angle);
        if (!result.hasCollisions) {
          const level =
            angle === 45
              ? CollisionLevel.ROTATED_45
              : CollisionLevel.ROTATED_90;
          return { placements: result.placements, level };
        }
      }
    }

    // Level 3: Sampling (show every Nth label)
    if (this.config.enableSampling) {
      for (const step of this.config.sampleSteps) {
        result = this.trySampledLayout(textBoxes, positions, labels, step);
        if (!result.hasCollisions) {
          return {
            placements: result.placements,
            level: CollisionLevel.SAMPLED,
          };
        }
      }
    }

    // Fallback: Use maximum sampling
    const maxStep =
      this.config.sampleSteps[this.config.sampleSteps.length - 1] || 10;
    result = this.trySampledLayout(textBoxes, positions, labels, maxStep, true);
    return { placements: result.placements, level: CollisionLevel.SAMPLED };
  }

  /**
   * Resolve scatter/line chart label collisions using force-directed layout.
   * Doc 2, Section 4: Deterministic Force-Directed Layout
   */
  resolvePointLabels(
    points: Array<{ x: LBU; y: LBU; label: string }>,
    bounds: Rect,
    fontSize: number,
    fontFamily: string = "Arial",
  ): LabelPlacement[] {
    if (points.length === 0) return [];

    // Create text boxes for all labels
    const textBoxes = points.map((p) =>
      this.oracle.createTextBox(p.label, fontSize, { fontFamily }),
    );

    // Initial placement: labels above their points
    const placements: LabelPlacement[] = points.map((point, i) => {
      const box = textBoxes[i];
      return {
        id: `label-${i}`,
        text: point.label,
        box,
        position: {
          x: point.x - box.width / 2,
          y: point.y - box.height - 10,
        },
        collisionLevel: CollisionLevel.STANDARD,
        isVisible: true,
      };
    });

    // Run deterministic force-directed iterations (Doc 2, Section 4)
    // Fixed iteration count for determinism
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      let anyMoved = false;

      for (let i = 0; i < placements.length; i++) {
        const p1 = placements[i];
        let forceX = 0;
        let forceY = 0;

        // Repulsion from data point
        const point = points[i];
        const labelCenterX = p1.position.x + p1.box.width / 2;
        const labelCenterY = p1.position.y + p1.box.height / 2;

        // Prefer label above point
        const labelBottom = p1.position.y + p1.box.height;
        if (labelBottom > point.y - this.config.minGap) {
          forceY -= 2;
        }

        // Repulsion from other labels
        for (let j = 0; j < placements.length; j++) {
          if (i === j) continue;

          const p2 = placements[j];
          if (this.boxesOverlap(p1, p2)) {
            // Calculate repulsion vector
            const dx = labelCenterX - (p2.position.x + p2.box.width / 2);
            let dy = labelCenterY - (p2.position.y + p2.box.height / 2);
            if (dx === 0 && dy === 0) {
              // Give perfectly coincident labels a stable separation direction.
              dy = i < j ? -1 : 1;
            }
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Stronger repulsion for closer labels
            const strength = Math.min(20, 100 / dist);
            forceX += (dx / dist) * strength;
            forceY += (dy / dist) * strength;
          }
        }

        // Apply force (clamped)
        if (Math.abs(forceX) > 0.5 || Math.abs(forceY) > 0.5) {
          p1.position.x += Math.max(-10, Math.min(10, forceX));
          p1.position.y += Math.max(-10, Math.min(10, forceY));

          // Clamp to bounds
          p1.position.x = Math.max(
            bounds.x,
            Math.min(bounds.x + bounds.width - p1.box.width, p1.position.x),
          );
          p1.position.y = Math.max(
            bounds.y,
            Math.min(bounds.y + bounds.height - p1.box.height, p1.position.y),
          );

          anyMoved = true;
        }
      }

      // Early exit if stable
      if (!anyMoved) break;
    }

    // Calculate displacement and add leader lines
    for (let i = 0; i < placements.length; i++) {
      const point = points[i];
      const placement = placements[i];
      const labelCenterX = placement.position.x + placement.box.width / 2;
      const labelCenterY = placement.position.y + placement.box.height / 2;

      const displacement = Math.sqrt(
        Math.pow(labelCenterX - point.x, 2) +
          Math.pow(labelCenterY - point.y, 2),
      );

      placement.box.padding = 0;

      if (displacement > this.config.leaderLineThreshold) {
        placement.leaderLine = {
          fromPoint: {
            x: labelCenterX,
            y: placement.position.y + placement.box.height,
          },
          toPoint: { x: point.x, y: point.y },
          targetLabelId: placement.id,
        };
      }
    }

    return placements;
  }

  /**
   * Resolve pie/donut chart label collisions with leader lines.
   * Doc 2, Section 5: Radial Labeling (Leader Line Logic)
   */
  resolvePieLabels(
    slices: Array<{
      startAngle: number;
      endAngle: number;
      label: string;
      value: number;
    }>,
    center: Point,
    innerRadius: LBU,
    outerRadius: LBU,
    fontSize: number,
    fontFamily: string = "Arial",
  ): LabelPlacement[] {
    const placements: LabelPlacement[] = [];
    const labelRadius = outerRadius * 1.3; // Labels outside the pie

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const sliceAngle = slice.endAngle - slice.startAngle;

      // Create text box
      const box = this.oracle.createTextBox(slice.label, fontSize, {
        fontFamily,
      });

      // Calculate if label fits inside slice
      const arcLength = sliceAngle * outerRadius;
      const fitsInside = arcLength > box.width * 1.5;

      // Position calculation
      let position: Point;
      let leaderLine: LeaderLine | undefined;

      if (fitsInside) {
        // Place inside the slice
        const r = (innerRadius + outerRadius) / 2;
        position = {
          x: center.x + Math.cos(midAngle) * r - box.width / 2,
          y: center.y + Math.sin(midAngle) * r - box.height / 2,
        };
      } else {
        // Place outside with leader line
        const labelX = center.x + Math.cos(midAngle) * labelRadius;
        const labelY = center.y + Math.sin(midAngle) * labelRadius;

        // Adjust anchor based on which side of the pie
        const onRightSide = Math.cos(midAngle) > 0;
        box.anchor = onRightSide ? "start" : "end";

        position = {
          x: onRightSide ? labelX : labelX - box.width,
          y: labelY - box.height / 2,
        };

        // Create leader line with elbow
        const edgeX = center.x + Math.cos(midAngle) * outerRadius;
        const edgeY = center.y + Math.sin(midAngle) * outerRadius;
        const elbowX = center.x + Math.cos(midAngle) * (outerRadius + 20);
        const elbowY = center.y + Math.sin(midAngle) * (outerRadius + 20);

        leaderLine = {
          fromPoint: { x: edgeX, y: edgeY },
          elbowPoint: { x: elbowX, y: elbowY },
          toPoint: {
            x: onRightSide ? position.x : position.x + box.width,
            y: labelY,
          },
          targetLabelId: `pie-label-${i}`,
        };
      }

      placements.push({
        id: `pie-label-${i}`,
        text: slice.label,
        box,
        position,
        collisionLevel: fitsInside
          ? CollisionLevel.STANDARD
          : CollisionLevel.SAMPLED,
        isVisible: true,
        leaderLine,
      });
    }

    // Resolve collisions between external labels
    this.resolveExternalPieLabels(placements, center, labelRadius);

    return placements;
  }

  // ===========================================================================
  // PRIVATE: Layout Strategy Methods
  // ===========================================================================

  private tryStandardLayout(
    boxes: TextBox[],
    positions: Point[],
    labels: string[],
  ): { placements: LabelPlacement[]; hasCollisions: boolean } {
    const placements: LabelPlacement[] = [];
    let hasCollisions = false;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const pos = positions[i];

      const placement: LabelPlacement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box: { ...box, anchor: "middle" },
        position: { x: pos.x, y: pos.y },
        collisionLevel: CollisionLevel.STANDARD,
        isVisible: true,
      };
      placements.push(placement);

      // Check collision with previous labels
      for (let j = 0; j < i; j++) {
        if (this.boxesOverlap(placements[j], placement)) {
          hasCollisions = true;
        }
      }
    }

    return { placements, hasCollisions };
  }

  private tryStaggeredLayout(
    boxes: TextBox[],
    positions: Point[],
    labels: string[],
    fontSize: number,
  ): { placements: LabelPlacement[]; hasCollisions: boolean } {
    const placements: LabelPlacement[] = [];
    const staggerOffset = fontSize * 1.5;
    let hasCollisions = false;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const pos = positions[i];
      const isStaggered = i % 2 === 1;

      const placement: LabelPlacement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box: { ...box, anchor: "middle" },
        position: {
          x: pos.x,
          y: pos.y + (isStaggered ? staggerOffset : 0),
        },
        collisionLevel: CollisionLevel.STAGGERED,
        isVisible: true,
      };
      placements.push(placement);

      // Check collision (only with same-row labels)
      for (let j = 0; j < i; j++) {
        if (j % 2 === i % 2 && this.boxesOverlap(placements[j], placement)) {
          hasCollisions = true;
        }
      }
    }

    return { placements, hasCollisions };
  }

  private tryRotatedLayout(
    boxes: TextBox[],
    positions: Point[],
    labels: string[],
    angle: number,
  ): { placements: LabelPlacement[]; hasCollisions: boolean } {
    const placements: LabelPlacement[] = [];
    let hasCollisions = false;

    for (let i = 0; i < boxes.length; i++) {
      const box = { ...boxes[i], rotation: angle };
      const pos = positions[i];

      const placement: LabelPlacement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box,
        position: { x: pos.x, y: pos.y },
        collisionLevel:
          angle === 45 ? CollisionLevel.ROTATED_45 : CollisionLevel.ROTATED_90,
        isVisible: true,
      };
      placements.push(placement);

      // Check collision with rotated bounds
      for (let j = 0; j < i; j++) {
        if (this.rotatedBoxesOverlap(placements[j], placement)) {
          hasCollisions = true;
        }
      }
    }

    return { placements, hasCollisions };
  }

  private trySampledLayout(
    boxes: TextBox[],
    positions: Point[],
    labels: string[],
    step: number,
    force: boolean = false,
  ): { placements: LabelPlacement[]; hasCollisions: boolean } {
    const placements: LabelPlacement[] = [];
    let hasCollisions = false;

    for (let i = 0; i < boxes.length; i++) {
      const isVisible = i % step === 0;
      const box = boxes[i];
      const pos = positions[i];

      const placement: LabelPlacement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box: { ...box, anchor: "middle" },
        position: { x: pos.x, y: pos.y },
        collisionLevel: CollisionLevel.SAMPLED,
        sampleStep: step,
        isVisible,
      };
      placements.push(placement);

      // Only check collision between visible labels
      if (isVisible && !force) {
        for (let j = 0; j < i; j++) {
          if (
            placements[j].isVisible &&
            this.boxesOverlap(placements[j], placement)
          ) {
            hasCollisions = true;
          }
        }
      }
    }

    return { placements, hasCollisions };
  }

  private resolveExternalPieLabels(
    placements: LabelPlacement[],
    _center: Point,
    _labelRadius: LBU,
  ): void {
    // Sort external labels by y position
    const external = placements.filter((p) => p.leaderLine);
    external.sort((a, b) => a.position.y - b.position.y);

    // Push overlapping labels apart
    for (let iter = 0; iter < 20; iter++) {
      let anyMoved = false;

      for (let i = 1; i < external.length; i++) {
        const prev = external[i - 1];
        const curr = external[i];

        const minY = prev.position.y + prev.box.height + this.config.minGap;
        if (curr.position.y < minY) {
          const shift = minY - curr.position.y;
          curr.position.y = minY;

          // Update leader line endpoint
          if (curr.leaderLine) {
            curr.leaderLine.toPoint.y += shift;
          }

          anyMoved = true;
        }
      }

      if (!anyMoved) break;
    }
  }

  // ===========================================================================
  // PRIVATE: Collision Detection Helpers
  // ===========================================================================

  private boxesOverlap(p1: LabelPlacement, p2: LabelPlacement): boolean {
    const gap = this.config.minGap;

    // Get effective bounds
    const b1 = this.getEffectiveBounds(p1);
    const b2 = this.getEffectiveBounds(p2);

    return !(
      b1.x + b1.width + gap < b2.x ||
      b2.x + b2.width + gap < b1.x ||
      b1.y + b1.height + gap < b2.y ||
      b2.y + b2.height + gap < b1.y
    );
  }

  private rotatedBoxesOverlap(p1: LabelPlacement, p2: LabelPlacement): boolean {
    const gap = this.config.minGap;

    // Get rotated bounds
    const bounds1 = this.oracle.getRotatedBounds(p1.box);
    const bounds2 = this.oracle.getRotatedBounds(p2.box);

    const x1 = p1.position.x - bounds1.width / 2;
    const x2 = p2.position.x - bounds2.width / 2;

    return !(
      x1 + bounds1.width + gap < x2 ||
      x2 + bounds2.width + gap < x1 ||
      p1.position.y + bounds1.height + gap < p2.position.y ||
      p2.position.y + bounds2.height + gap < p1.position.y
    );
  }

  private getEffectiveBounds(p: LabelPlacement): {
    x: LBU;
    y: LBU;
    width: LBU;
    height: LBU;
  } {
    const { box, position } = p;

    // Adjust x based on anchor
    let x = position.x;
    switch (box.anchor) {
      case "middle":
        x -= box.width / 2;
        break;
      case "end":
        x -= box.width;
        break;
    }

    return {
      x,
      y: position.y,
      width: box.width,
      height: box.height,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global collision solver instance */
export const collisionSolver = new AxisCollisionSolver();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Resolve axis labels with automatic strategy selection.
 */
export function resolveAxisLabels(
  labels: string[],
  axisStart: LBU,
  axisEnd: LBU,
  axisY: LBU,
  fontSize: number,
  fontFamily?: string,
): { placements: LabelPlacement[]; level: CollisionLevel } {
  return collisionSolver.resolveAxisLabels(
    labels,
    axisStart,
    axisEnd,
    axisY,
    fontSize,
    fontFamily,
  );
}

/**
 * Resolve scatter plot labels with force-directed layout.
 */
export function resolvePointLabels(
  points: Array<{ x: LBU; y: LBU; label: string }>,
  bounds: Rect,
  fontSize: number,
  fontFamily?: string,
): LabelPlacement[] {
  return collisionSolver.resolvePointLabels(
    points,
    bounds,
    fontSize,
    fontFamily,
  );
}
