/**
 * waterfallBars — signature consulting waterfall: absolute start bar,
 * positive / negative delta bars stacked at the running total, and a
 * closing absolute end bar. Signature pattern for "Starting ARR +
 * new − churn = Ending ARR", "Revenue bridge", "Budget variance".
 *
 * This primitive is not a real chart. It renders rectangle + text
 * nodes at computed pixel positions, so it respects tokens entirely
 * and does not pull in the engine's charting surface. For real
 * interactive charts, use chartBlock.
 *
 * Visual (5-step example):
 *
 *       ┌──┐                                         ┌──┐
 *   $10 │  │ ─ ─ ┌──┐                          ┌──┐ ─│  │ $12
 *       │  │     │++│ ─ ─ ┌──┐                 │  │  │  │
 *       │  │     └──┘     │--│ ─ ─ ┌──┐ ─ ─ ─ ─│++│  │  │
 *       │  │              │  │     │++│        │  │  │  │
 *       └──┘              └──┘     └──┘        └──┘  └──┘
 *       Start  +$3M      −$1M     +$2M       Mgmt   End
 *
 * Step kinds:
 *   - "start": absolute bar, bottom-anchored at zero. Sets running total.
 *   - "up" / "down": delta bar stacked at running total. Positive goes
 *     up from running; negative goes down from running.
 *   - "end": absolute bar bottom-anchored at zero, height = final running.
 *
 * Colors (via tokens):
 *   - start / end → palette.foreground
 *   - up            → palette.accent (or palette.accent-lighter if caller
 *                     supplies it via tokens; keeping this cheap for now)
 *   - down          → palette.muted
 *
 * Tokens consumed:
 *   - palette.foreground, palette.accent, palette.muted, palette.rule
 *   - type.caption (step labels, value labels)
 *   - rules.divider (connector dashed line between bars)
 *   - spacing.sm (label gap)
 *
 * Content adaptation:
 *   - Bars always fit the region height: scale = region.height /
 *     maxRunningAbsValue. Overflow is NEVER reported for vertical —
 *     this is a chart-like primitive. Horizontal overflow (too many
 *     bars for region.width) reports `clipped` with dropped count.
 */
import type { Primitive } from "./primitive.js";
export interface WaterfallBarsInput {
    steps: Array<{
        kind: "start" | "end";
        label: string;
        value: number;
        valueLabel?: string;
    } | {
        kind: "up" | "down";
        label: string;
        value: number;
        valueLabel?: string;
    }>;
    /** Bar width as a fraction of the per-step column. Default 0.55. */
    barWidthRatio?: number;
    /** Minimum horizontal spacing per bar in px. Steps below this trigger
     *  horizontal clip. Default 40. */
    minStepWidth?: number;
    /** Show connector dashed line from the top of each bar to the next.
     *  Default true. */
    showConnectors?: boolean;
}
export declare const waterfallBars: Primitive<WaterfallBarsInput>;
//# sourceMappingURL=waterfallBars.d.ts.map