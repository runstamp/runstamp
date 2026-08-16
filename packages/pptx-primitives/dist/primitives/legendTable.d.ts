/**
 * legendTable — vertical legend pairing color swatch + label + optional
 * metric column. Used alongside chartBlock when the chart's intrinsic
 * legend isn't visible-friendly (Bain p20 stacked bar with a side
 * legend that includes percentage shares).
 *
 * Layout: a vertical stack of (swatch, label, value) rows. Row height
 * derives from caption type role; horizontal layout is column 1 swatch
 * (square), column 2 label flex, column 3 optional value.
 *
 * Tokens consumed:
 *   - type.caption (label + value text)
 *   - palette.foreground (default text color)
 */
import type { Primitive } from "./primitive.js";
export interface LegendItem {
    color: string;
    label: string;
    value?: string;
}
export interface LegendTableInput {
    items: LegendItem[];
    /** Direction. Default "vertical". */
    direction?: "vertical" | "horizontal";
}
export declare const legendTable: Primitive<LegendTableInput>;
//# sourceMappingURL=legendTable.d.ts.map