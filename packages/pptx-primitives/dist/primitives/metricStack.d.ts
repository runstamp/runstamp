/**
 * metricStack — vertical list of label/value/delta rows separated by
 * hairline dividers.
 *
 * Companion to kpiHero. Typical composition: a hero metric in the
 * dominant left column, three or four supporting metrics stacked here on
 * the right.
 *
 * Per row:
 *
 *   ┌────────────────────────────────┐
 *   │ NRR                            │  ← caption role, muted, tracked
 *   │ 118%                           │  ← title role, foreground, large
 *   │ +4 pts                         │  ← caption role, accent or muted
 *   │ ─────────────────────────────  │  ← divider rule (rules.divider)
 *   └────────────────────────────────┘
 *
 * Tokens consumed:
 *   - palette.foreground, palette.muted, palette.accent
 *   - type.caption (label, delta), type.title (value)
 *   - rules.divider (between rows; `none` skips dividers)
 *
 * Content adaptation: the value compresses per-row when its width
 * exceeds the region width. Pagination kicks in when total height
 * exceeds region.height (returns `paginated` with remaining items).
 */
import type { Primitive } from "./primitive.js";
export interface MetricStackInput {
    rows: Array<{
        label: string;
        value: string;
        delta?: string;
        trend?: "up" | "down" | "flat";
    }>;
    /** Pagination resume — opaque payload from previous render. */
    resume?: {
        startIndex: number;
    };
}
export declare const metricStack: Primitive<MetricStackInput>;
//# sourceMappingURL=metricStack.d.ts.map