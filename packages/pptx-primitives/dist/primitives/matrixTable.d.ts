/**
 * matrixTable — row-labeled, column-headered grid with per-cell content.
 *
 * The single primitive Bain decks lean on for ~60% of slides. Examples:
 * "Korean market outlook summary" page (3 row-strips × 1 content column,
 * each cell a bulleted micro-list); "Commerce market category" page
 * (3 row-strips × 3 column-headers grid, each cell short text).
 *
 * Visual structure:
 *
 *   ┌────────────┬─────────┬─────────┬─────────┐  ← header row (optional)
 *   │ rowLabelHdr│ col1    │ col2    │ col3    │
 *   ├────────────┼─────────┼─────────┼─────────┤  ← header underline rule
 *   │            │  cell   │  cell   │  cell   │
 *   │  ROW LABEL │  cell   │  cell   │  cell   │
 *   │  STRIP     │  cell   │  cell   │  cell   │
 *   ├────────────┼─────────┼─────────┼─────────┤  ← divider
 *   │  ROW LABEL │  cell   │  cell   │  cell   │
 *   └────────────┴─────────┴─────────┴─────────┘
 *
 * Tokens consumed:
 *   - palette.foreground, palette.muted, palette.surface, palette.accent
 *   - type.title (header text), type.body (cell text), type.caption (row label)
 *   - rules.divider for row-separator pattern
 *   - rules.section for header underline (or rules.divider if none)
 *   - spacing.* for cell padding
 *
 * Bundle expressions:
 *   - Bain: row labels in charcoal-filled strips with white bold text;
 *     column headers in blue or charcoal fill; thin gray divider hairlines.
 *   - LG (rare): no fills, italic serif row labels, black hairlines only.
 *   - Minimal: no fills, foreground row labels, hairline rules only.
 *
 * Token gates that change appearance:
 *   - `rowLabelStyle`: "filled" (strip with inverse text) or "plain"
 *     (just text + accent tick on the left). The primitive picks "filled"
 *     when the bundle's `palette.muted` is dark enough to fill against
 *     `palette.accentInverse`; "plain" otherwise.
 *
 * Content adaptation:
 *   - Cell text wraps to multiple lines as needed within fixed cell rect.
 *   - Row heights default to content-natural height. Callers can set
 *     `minRowHeight`, `rowHeight`, or `distributeRows` when the table
 *     should occupy a larger visual band.
 *   - When totalHeight exceeds region.height, paginates: returns
 *     `overflow.kind = "paginated"` with `remaining = { startRowIndex }`.
 *   - Single oversized cell (one cell taller than region) clips with
 *     ellipsis in the last visible row (degraded mode).
 */
import type { Primitive } from "./primitive.js";
import type { Paragraph, TextRun } from "../layout/index.js";
export interface MatrixTableInput {
    /** Top header cells. Index [0] = top-left corner (above row labels);
     *  null entries draw an empty header cell. Pass empty array for a
     *  no-header table. */
    columnHeaders?: Array<string | null>;
    /** Per-column header fill override, parallel to `columnHeaders`. Index
     *  [0] is the row-label corner; [1..N] are data columns. null = use
     *  the default (accent). Bain p6 uses `accentSecondary` for the first
     *  two data columns and `muted` for the third. */
    columnHeaderFills?: Array<"foreground" | "muted" | "accent" | "accentSecondary" | null>;
    /** Row data: one entry per data row. Each row has its label and an
     *  array of cell contents; missing trailing cells render as empty.
     *
     *  Cell content type expansion (Phase 10):
     *    string       → plain paragraph (current default).
     *    string[]     → vertical stack of bulleted items (sugar).
     *    TextRun[]    → rich-run paragraph with bold lead-ins / inline
     *                   color shifts. Maps to TextNode.runs at the
     *                   bridge layer.
     *
     *  CompositionBlock[] cells are also Phase 10 plan territory but
     *  require protocol-layer wiring that the primitive doesn't have
     *  visibility into; that nesting will land via the container
     *  primitive in caller code instead. */
    rows: Array<{
        /** Label text shown in the row strip on the left. Accepts a flat
         *  string, a TextRun[] for inline emphasis, or a Paragraph[] for full
         *  multi-line / rich-formatted labels. The label wraps inside the
         *  strip (or vertically inside a rotated strip) using the same
         *  measure pipeline that drives cell wrapping. */
        label: string | TextRun[] | Paragraph[];
        /** Cell contents per column, in column order. */
        cells: MatrixCell[];
        /** Optional per-row accent tick on the left edge — used to highlight
         *  the row of interest without filling the whole row. */
        accent?: boolean;
        /** Per-row label-fill override. When `labelStyle` is "filled", this
         *  picks the fill color role on a row-by-row basis. Used for
         *  dark/mid/light hierarchy (Bain p5: top row foreground, second
         *  row muted, third row faint). Default: "muted" for back-compat
         *  with the table-wide fill the original implementation used. */
        labelFill?: "foreground" | "muted" | "faint" | "accent";
    }>;
    /** Width allocated to the row-label strip (px). Overrides ratio when set. */
    rowLabelWidth?: number;
    /** Width allocated to the row-label strip, as a fraction of region width.
     *  Default 0.20 — real consulting matrices keep labels narrower than
     *  data cells so multi-column grids read balanced. */
    labelColumnWidthRatio?: number;
    /** Force "filled" or "plain" row-label treatment. Default: auto. */
    rowLabelStyle?: "filled" | "plain";
    /** Rotation angle (degrees) applied to row labels. Only ±90 is
     *  meaningful — internally maps to OOXML `vert="vert270"` (vertical
     *  text body) so the strip rect stays axis-aligned and wrap budget
     *  flips to rowHeight. Pass -90 for the bottom-up labels Bain
     *  matrices use on dense 3-column grids ("Analysis Methodology"
     *  wraps to two vertical lines inside the strip). */
    rowLabelRotation?: number;
    /** Minimum body-row height in px. Natural content height still wins when
     *  a row needs more room. */
    minRowHeight?: number;
    /** Fixed body-row height in px. Natural content height still wins when
     *  a row needs more room. */
    rowHeight?: number;
    /** When true, distribute any extra vertical room across body rows so the
     *  table fills its assigned region instead of collapsing to natural text
     *  height. Never compresses below natural/min/fixed row heights. */
    distributeRows?: boolean;
    /** Per-data-column relative widths. Length must equal the number of
     *  data columns (excluding the row-label column). Values are relative
     *  weights — e.g. `[2, 1, 1]` allocates 50% / 25% / 25% of the data
     *  area. When supplied, `labelColumnWidthRatio`-driven distribution is
     *  overridden. Use this when one column has long values that would
     *  otherwise force every other cell to wrap. */
    colW?: number[];
    /** How to handle a cell whose text would overflow its column width.
     *   - "wrap" (default): wrap to multiple lines.
     *   - "ellipsis": truncate to one line and append "…".
     *   - "shrink": shrink fontSize down to a floor until the line fits.
     *
     *  Applies only to plain-string and TextRun[] cells; string[] and
     *  Paragraph[] cells (which the author structured as multi-line)
     *  always use "wrap" regardless of this setting. */
    wrapPolicy?: "wrap" | "ellipsis" | "shrink";
    /** Pagination resume — opaque payload returned by previous render. */
    resume?: {
        startRowIndex: number;
    };
}
/** Discriminated cell content.
 *
 *   string       — plain paragraph.
 *   string[]     — vertical stack of bulleted items (sugar; literal "• " prefix).
 *   TextRun[]    — single rich-runs paragraph (bold lead-in inside one para).
 *   Paragraph[]  — full bullet hierarchy. Each Paragraph carries its own
 *                  runs (rich text inside a bullet), `level` (top-level vs
 *                  nested), and `bullet` (filled dot, dash, none). Maps to
 *                  the engine's PaperText.paragraphs path, which emits
 *                  real OOXML `<a:pPr>` + `<a:buChar>` blocks. This is
 *                  the path Bain p5-style cells need: bold lead phrase
 *                  + dash sub-bullets indented under it. */
export type MatrixCell = string | string[] | TextRun[] | Paragraph[];
export declare const matrixTable: Primitive<MatrixTableInput>;
//# sourceMappingURL=matrixTable.d.ts.map