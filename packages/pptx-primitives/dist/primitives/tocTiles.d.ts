/**
 * tocTiles — table-of-contents / phase-decomposition tile row.
 *
 * LG's "STEP 1 / STEP 2" table-of-contents pattern: a small number of
 * large tiles across the slide, each carrying an accent numeral (or
 * phase tag), a title, and a short description. Optionally headed by
 * a photographic band — but the photo belongs to imageBleed in a
 * separate region; this primitive renders only the tile content below
 * the image.
 *
 * Contrast with tombstoneStack:
 *   - tombstoneStack: dense grid (4+ cols, many rows), outline borders,
 *     used for logos / case lists.
 *   - tocTiles: sparse rail (typically 2–4 tiles), no borders, large
 *     accent numerals, used for agenda / phase breakdown / TOC.
 *
 * Visual (3-column):
 *
 *   ╔════════╗   ╔════════╗   ╔════════╗
 *   ║   1    ║   ║   2    ║   ║   3    ║   ← big accent numeral
 *   ║────────║   ║────────║   ║────────║   ← rules.divider hairline
 *   ║ Title  ║   ║ Title  ║   ║ Title  ║
 *   ║ body   ║   ║ body   ║   ║ body   ║
 *   ╚════════╝   ╚════════╝   ╚════════╝
 *
 * Tokens consumed:
 *   - palette.accent (numeral), palette.foreground (title), palette.muted (body)
 *   - type.display (numeral — scaled down), type.title (tile title), type.body
 *   - rules.divider (hairline between numeral and title)
 *   - spacing.sm (gaps)
 *
 * Content adaptation:
 *   - No pagination: TOC is always a single-slide pattern. If content
 *     exceeds region height, reports `clipped` with dropped count.
 */
import type { Primitive } from "./primitive.js";
export interface TocTilesInput {
    tiles: Array<{
        /** Either a number (1, 2, 3 …) or a short tag ("I", "A", "Phase 1"). */
        marker: string | number;
        /** Tile title. */
        title: string;
        /** Optional body copy. Wraps. */
        body?: string;
    }>;
    /** Column count. Defaults to tiles.length (one column per tile). */
    columns?: number;
    /** Column gap in px. Default spacing.md. */
    columnGap?: number;
    /** Numeral display size in pt. Default 56. */
    markerSizePt?: number;
}
export declare const tocTiles: Primitive<TocTilesInput>;
//# sourceMappingURL=tocTiles.d.ts.map