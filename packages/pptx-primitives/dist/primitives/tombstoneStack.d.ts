/**
 * tombstoneStack — grid of thin-bordered tiles, each carrying a brand /
 * case name + short description.
 *
 * Consulting and editorial decks both use this pattern:
 *   - Bain: "past client engagements" rail across the bottom of a slide,
 *     each tile with company name bolded and one-line description.
 *   - LG: logo tombstones for design partners, each tile with a small
 *     monochrome thumbnail above the partner name.
 *
 * Visual structure (3-column × 2-row example):
 *
 *   ┌────────┐  ┌────────┐  ┌────────┐
 *   │ [logo] │  │ [logo] │  │ [logo] │
 *   │ Name   │  │ Name   │  │ Name   │
 *   │ body…  │  │ body…  │  │ body…  │
 *   └────────┘  └────────┘  └────────┘
 *   ┌────────┐  ┌────────┐  ┌────────┐
 *   │ ...    │  │ ...    │  │ ...    │
 *   └────────┘  └────────┘  └────────┘
 *
 * Tokens consumed:
 *   - palette.foreground (title), palette.muted (body), palette.rule (border)
 *   - type.caption (title role), type.body (body role)
 *   - spacing.sm (tile padding), spacing.xs (gap between rows)
 *
 * Content adaptation:
 *   - Tiles wrap to row grid based on `columns`.
 *   - When rows don't fit vertically, paginates with
 *     `remaining.startTileIndex`.
 */
import type { Primitive } from "./primitive.js";
export interface TombstoneStackInput {
    tiles: Array<{
        /** Optional logo / thumbnail image URL (data: or https:). */
        logo?: string;
        /** Bolded tile title (e.g., brand name). */
        title: string;
        /** Optional body copy beneath the title. Wraps. */
        body?: string;
        /** Optional accent: highlights the tile with a left-edge accent bar. */
        accent?: boolean;
    }>;
    /** Column count. Default 4. */
    columns?: number;
    /** Row gap in px. Default spacing.sm. */
    rowGap?: number;
    /** Column gap in px. Default spacing.sm. */
    columnGap?: number;
    /** Logo block height in px. Default 36. Set 0 to disable logo row. */
    logoHeight?: number;
    /** Pagination resume. */
    resume?: {
        startTileIndex: number;
    };
    /** Compact mode: tighter internal padding, smaller tiles. Recommended
     *  for dense case-list rails (8+ tiles). Default false (roomier
     *  spacing that reads more editorial). */
    compact?: boolean;
}
export declare const tombstoneStack: Primitive<TombstoneStackInput>;
//# sourceMappingURL=tombstoneStack.d.ts.map