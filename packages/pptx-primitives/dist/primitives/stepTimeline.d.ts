/**
 * stepTimeline — horizontal rail with N step markers.
 *
 * LG signature: a horizontal hairline across the slide with circled
 * numerals along it, month labels above, descriptive titles below. Bain
 * occasionally uses a simpler dot-and-rail timeline for project plans.
 *
 *      MAY              JUNE             JULY
 *       ●                 ●                ●     ← marker (token-driven shape)
 *  ─────│─────────────────│────────────────│──── ← rail (rules.divider)
 *
 *  Launch packaging  Expand bench    Open channel
 *  refresh           for larger      pilot
 *  ...               deals
 *
 * Tokens consumed:
 *   - palette.accent (markers, label color), palette.foreground, palette.muted
 *   - type.eyebrow (month label above), type.title (step label below),
 *     type.body (description)
 *   - rules.divider (rail), ornament.stepMarker (circleNumeric / serifCircled / plain)
 *   - spacing.* for vertical separation
 *
 * Content adaptation:
 *   - Step labels wrap within their column (region.width / N).
 *   - Description compresses; if total height > region.height the timeline
 *     truncates description (clipped) — never paginates a timeline.
 */
import type { Primitive } from "./primitive.js";
export interface StepTimelineInput {
    steps: Array<{
        /** Tag above the step (date, "MAY", "Q1", "STEP 1"). */
        tag: string;
        /** Headline label below the marker. */
        label: string;
        /** Optional description below the label. */
        description?: string;
    }>;
}
export declare const stepTimeline: Primitive<StepTimelineInput>;
//# sourceMappingURL=stepTimeline.d.ts.map