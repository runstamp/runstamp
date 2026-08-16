/**
 * kpiHero — one large display number with label and optional delta.
 *
 * Visual layout (top to bottom):
 *   [LABEL]               (small caps eyebrow role, accent color, tracked)
 *   $12.4M                (massive display role, foreground)
 *   ↑ 18% YoY             (caption role, accent or muted)
 *
 * Tokens consumed:
 *   - palette.foreground (hero number)
 *   - palette.accent (label, delta when positive)
 *   - palette.muted (delta when neutral)
 *   - type.eyebrow (label)
 *   - type.display (hero number)
 *   - type.caption (delta)
 *
 * Companion to metricStack — a hero metric in the dominant left column,
 * supporting metrics stacked on the right.
 *
 * Content adaptation: the value compresses (within a bounded range) when
 * its width exceeds the region width.
 */
import type { Primitive } from "./primitive.js";
export interface KpiHeroInput {
    /** Eyebrow label above the value (e.g., "ARR"). */
    label: string;
    /** Big number / value (e.g., "$12.4M"). */
    value: string;
    /** Optional delta line below (e.g., "↑ 18% YoY"). */
    delta?: string;
    /** "up" → render delta in accent; "down" → muted; "flat" → faint. */
    trend?: "up" | "down" | "flat";
    /** Optional supporting body copy below the delta. Wraps; kept muted
     *  to read as an annotation rather than a competing headline. Use for
     *  "Driven by new logo expansion, net retention improvement…" style
     *  one-liners that keep the hero region from reading empty. */
    support?: string;
    /** Vertical alignment of the assembled block within region.
     *  Default "center" so the hero sits visually balanced; pass "top"
     *  for compact regions where anchoring to the top reads better. */
    verticalAlign?: "top" | "center";
}
export declare const kpiHero: Primitive<KpiHeroInput>;
//# sourceMappingURL=kpiHero.d.ts.map