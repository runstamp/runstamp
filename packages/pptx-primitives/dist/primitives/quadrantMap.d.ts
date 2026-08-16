/**
 * quadrantMap — 2D scatter plot with named quadrants and labeled points.
 *
 * Classic consulting deliverable: the Gartner Magic Quadrant (Leaders /
 * Challengers / Niche / Visionaries), a Boston Box, or a positioning
 * chart. Each axis carries a semantic label; companies sit at (x, y)
 * coordinates on a 0–100 scale; quadrant headers sit in each quarter.
 *
 * Differs from chartBlock because:
 *   - We render the quadrants, labels, and crossing axes ourselves.
 *     Chart engines treat this as a scatter plot and don't draw named
 *     quadrants or anchor-labeled points.
 *   - The aesthetic is entirely token-driven (no theme accent cycle).
 *
 * Visual:
 *
 *   HIGH EXECUTION
 *                 ┌──────────────────┬──────────────────┐
 *                 │  CHALLENGERS     │    LEADERS       │
 *                 │                  │                  │
 *                 │    ● BigCorp     │   ● Acme         │
 *                 │                  │     ● Initech    │
 *                 │──────────────────┼──────────────────│
 *                 │  NICHE           │  VISIONARIES     │
 *                 │                  │                  │
 *                 │     ● Umbrella   │  ● Hooli         │
 *                 │                  │                  │
 *                 └──────────────────┴──────────────────┘
 *   LOW EXECUTION                                      HIGH VISION
 *                   LOW VISION
 *
 * Input axes: x-axis runs left→right (0=low, 100=high vision); y-axis
 * runs bottom→top (0=low, 100=high execution). Companies are placed
 * at (x, y).
 *
 * Tokens consumed:
 *   - palette.foreground (axis lines), palette.muted (axis labels,
 *     quadrant labels), palette.accent (emphasized points)
 *   - type.caption (axis + quadrant labels), type.body (company labels)
 *   - rules.divider (crossing axes)
 *   - spacing.sm (chart padding)
 *
 * Content adaptation:
 *   - Labels first try to sit to the right of their point, then dodge
 *     left/above/below to avoid quadrant captions, axis labels, and
 *     previously placed point labels.
 *   - Points clamp to the chart area.
 */
import type { Primitive } from "./primitive.js";
export interface QuadrantMapInput {
    /** X-axis low and high label. */
    xAxisLabel?: {
        low: string;
        high: string;
    };
    /** Y-axis low and high label. */
    yAxisLabel?: {
        low: string;
        high: string;
    };
    /** Four quadrant headers, in order: bottom-left, bottom-right,
     *  top-left, top-right. Omit to skip quadrant labels. */
    quadrants?: [string, string, string, string];
    /** Points to plot. x and y are on 0..100 scale. Omit for a
     *  framework-only map with axes and quadrant labels. */
    points?: Array<{
        name: string;
        /** 0..100; x=0 is chart-left, x=100 is chart-right. */
        x: number;
        /** 0..100; y=0 is chart-bottom, y=100 is chart-top. */
        y: number;
        /** "primary" → accent dot, bold label; "secondary" → muted dot, regular label. */
        emphasis?: "primary" | "secondary";
    }>;
    /** Dot radius in px. Default 5. */
    dotRadius?: number;
    /** Space reserved around the chart area for axis labels. Default 28. */
    axisLabelReserve?: number;
}
export declare const quadrantMap: Primitive<QuadrantMapInput>;
//# sourceMappingURL=quadrantMap.d.ts.map