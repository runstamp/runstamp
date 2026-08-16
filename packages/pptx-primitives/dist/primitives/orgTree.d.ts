/**
 * orgTree — 2-level hierarchical tree with connector lines.
 *
 * Root node at top-center, N child nodes across the bottom, connector
 * lines drawn from root → horizontal rail → each child. Used for:
 *   - Market taxonomy trees (e.g., "Retail → Goods / Travel / Local")
 *   - Org charts, team hierarchies
 *   - Decomposition diagrams ("Strategy → three pillars")
 *
 * Visual (3 children):
 *
 *               ┌────────────┐
 *               │    Root    │
 *               └─────┬──────┘
 *                     │
 *         ────────────┼─────────────    ← horizontal rail
 *         │           │             │
 *      ┌──┴──┐     ┌──┴──┐       ┌──┴──┐
 *      │ Ch1 │     │ Ch2 │       │ Ch3 │
 *      └─────┘     └─────┘       └─────┘
 *
 * Deeper trees are caller-composed: render each level in its own region
 * (two orgTree calls stacked) rather than recursing here. This keeps
 * the primitive analytical — you can see exactly what it lays out.
 *
 * Tokens consumed:
 *   - palette.foreground (node borders, text), palette.rule (connectors)
 *   - type.title (root + child titles), type.caption (subtitles)
 *   - spacing.sm (internal node padding)
 *
 * Content adaptation:
 *   - Child boxes share equal width; if `minChildWidth` is set and the
 *     per-child budget falls below it, reports `clipped`.
 *   - Node text wraps within its box.
 */
import type { Primitive } from "./primitive.js";
export interface OrgTreeInput {
    root: {
        title: string;
        subtitle?: string;
    };
    children: Array<{
        title: string;
        subtitle?: string;
        accent?: boolean;
    }>;
    /** Ratio of region.height allocated to the root node. Default 0.28. */
    rootHeightRatio?: number;
    /** Minimum child box width in px. Drop children that can't fit. Default 80. */
    minChildWidth?: number;
    /** Gap between children in px. Default spacing.sm. */
    childGap?: number;
    /** Box fill role for root. Default "foreground" (filled dark box with
     *  accentInverse text). Pass "surface" for an outline-only box. */
    rootFill?: "foreground" | "surface";
}
export declare const orgTree: Primitive<OrgTreeInput>;
//# sourceMappingURL=orgTree.d.ts.map