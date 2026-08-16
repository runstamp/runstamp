/**
 * comparisonBand — N-column row-banded comparison.
 *
 * The "Trade-offs across go-to-market configurations" pattern: row labels
 * down the left, column values across, optional accent tick on a single
 * highlighted row, hairline dividers between rows.
 *
 * Differs from matrixTable in that:
 *   - No filled row-label strip — labels are flush text in the first
 *     column.
 *   - No fill on column headers — column headers are tracked-caps caption
 *     text with a thicker rule below.
 *   - One row may carry an `accent` flag → 2px left tick in palette.accent.
 *
 * Tokens consumed:
 *   - palette.foreground, palette.muted, palette.accent
 *   - type.caption (column headers), type.body (cell text)
 *   - rules.divider (between rows), rules.section (under header)
 *
 * Content adaptation:
 *   - Cells wrap within their column. Total height clip → paginate.
 */
import type { Primitive } from "./primitive.js";
export interface ComparisonBandInput {
    /** Column headers in display order. The first entry is typically the
     *  label-column header (e.g., "DIMENSION") or empty string. */
    columns: string[];
    rows: Array<{
        /** Left-column label cell content. */
        label: string;
        /** Remaining columns' content, in column order. */
        values: string[];
        /** Highlight row with a 2px accent tick on the left. */
        accent?: boolean;
    }>;
    /** Pagination resume. */
    resume?: {
        startRowIndex: number;
    };
    /** Label column width as a fraction of region width. Remaining width is
     *  split equally across value columns. Default 0.22 — labels are short
     *  dimension names; value columns carry the content and deserve more
     *  width. */
    labelColumnWidthRatio?: number;
}
export declare const comparisonBand: Primitive<ComparisonBandInput>;
//# sourceMappingURL=comparisonBand.d.ts.map