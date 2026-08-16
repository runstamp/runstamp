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
import { applyTypeTransform, estimateLineHeight } from "../util/estimateText.js";
const LABEL_AREA_HEIGHT_FRACTION = 0.22;
export const waterfallBars = (input, tokens, region) => {
    const nodes = [];
    if (input.steps.length === 0)
        return { nodes, overflow: { kind: "fit" } };
    const barWidthRatio = input.barWidthRatio ?? 0.55;
    const minStepWidth = input.minStepWidth ?? 40;
    const showConnectors = input.showConnectors ?? true;
    // Compute running totals so we can assign top/bottom per bar.
    const running = [];
    let acc = 0;
    for (const step of input.steps) {
        if (step.kind === "start") {
            acc = step.value;
            running.push(acc);
        }
        else if (step.kind === "up") {
            acc += step.value;
            running.push(acc);
        }
        else if (step.kind === "down") {
            acc -= step.value;
            running.push(acc);
        }
        else {
            // end — running is assumed to equal step.value; use as-is.
            acc = step.value;
            running.push(acc);
        }
    }
    const maxValue = Math.max(0, ...running, ...input.steps.map((s) => Math.abs(s.value)));
    if (maxValue <= 0)
        return { nodes, overflow: { kind: "fit" } };
    const stepCount = input.steps.length;
    const stepWidth = region.width / stepCount;
    if (stepWidth < minStepWidth) {
        const droppable = Math.max(0, stepCount - Math.floor(region.width / minStepWidth));
        return {
            nodes,
            overflow: {
                kind: "clipped",
                droppedCount: droppable,
                reason: `step width ${stepWidth.toFixed(0)}px below minStepWidth ${minStepWidth}`,
            },
        };
    }
    const barWidth = stepWidth * barWidthRatio;
    const captionRole = tokens.type.caption;
    const labelLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
    // Reserve bottom for step labels, top for value labels.
    const labelReserve = Math.max(labelLineHeight, region.height * LABEL_AREA_HEIGHT_FRACTION / 2);
    const chartTop = region.top + labelReserve;
    const chartBottom = region.top + region.height - labelReserve;
    const chartHeight = Math.max(10, chartBottom - chartTop);
    const scale = chartHeight / maxValue;
    const baselineY = chartBottom;
    let prevTopY = null;
    let prevTopX = null;
    for (let i = 0; i < input.steps.length; i++) {
        const step = input.steps[i];
        const stepCenterX = region.left + (i + 0.5) * stepWidth;
        const barLeft = stepCenterX - barWidth / 2;
        let barTopY;
        let barBottomY;
        let color;
        let topOfVisibleBar;
        if (step.kind === "start" || step.kind === "end") {
            barTopY = baselineY - step.value * scale;
            barBottomY = baselineY;
            color = tokens.palette.foreground;
            topOfVisibleBar = barTopY;
        }
        else if (step.kind === "up") {
            const base = running[i] - step.value;
            barTopY = baselineY - running[i] * scale;
            barBottomY = baselineY - base * scale;
            color = tokens.palette.accent;
            topOfVisibleBar = barTopY;
        }
        else {
            // down
            const base = running[i] + step.value;
            barTopY = baselineY - base * scale;
            barBottomY = baselineY - running[i] * scale;
            color = tokens.palette.muted;
            topOfVisibleBar = barBottomY;
        }
        const bar = {
            kind: "view",
            shape: "rect",
            decorative: false,
            zIndex: 1,
            rect: {
                left: barLeft,
                top: Math.min(barTopY, barBottomY),
                width: barWidth,
                height: Math.abs(barBottomY - barTopY),
            },
            fill: color,
        };
        nodes.push(bar);
        // Value label above the bar.
        const valueText = step.valueLabel ?? formatValue(step.value, step.kind);
        const valueNode = {
            kind: "text",
            zIndex: 2,
            rect: {
                left: stepCenterX - stepWidth / 2,
                top: Math.min(barTopY, barBottomY) - labelLineHeight - 2,
                width: stepWidth,
                height: labelLineHeight,
            },
            content: applyTypeTransform(valueText, captionRole.transform),
            style: {
                family: captionRole.family,
                weight: 700,
                size: Math.max(captionRole.size, 10),
                lineHeight: captionRole.lineHeight,
                letterSpacing: captionRole.letterSpacing,
                italic: captionRole.italic,
                color: step.kind === "up"
                    ? tokens.palette.accent
                    : step.kind === "down"
                        ? tokens.palette.muted
                        : tokens.palette.foreground,
                align: "center",
                verticalAlign: "bottom",
            },
            autoFit: false,
        };
        nodes.push(valueNode);
        // Step label beneath the baseline.
        const stepLabelNode = {
            kind: "text",
            zIndex: 2,
            rect: {
                left: stepCenterX - stepWidth / 2,
                top: baselineY + 4,
                width: stepWidth,
                height: labelLineHeight,
            },
            content: applyTypeTransform(step.label, captionRole.transform),
            style: {
                family: captionRole.family,
                weight: captionRole.weight,
                size: captionRole.size,
                lineHeight: captionRole.lineHeight,
                letterSpacing: captionRole.letterSpacing,
                italic: captionRole.italic,
                color: tokens.palette.muted,
                align: "center",
                verticalAlign: "top",
            },
            autoFit: false,
        };
        nodes.push(stepLabelNode);
        // Connector: dashed line from previous bar's top to current bar's
        // rising base (or falling top for "down").
        if (showConnectors && prevTopY !== null && prevTopX !== null) {
            const connectorY = step.kind === "up"
                ? baselineY - (running[i] - step.value) * scale
                : step.kind === "down"
                    ? baselineY - (running[i] + step.value) * scale
                    : topOfVisibleBar;
            const connector = {
                kind: "view",
                shape: "rect",
                decorative: true,
                zIndex: 0,
                rect: {
                    left: prevTopX,
                    top: connectorY - 0.5,
                    width: barLeft - prevTopX,
                    height: 1,
                },
                fill: tokens.palette.rule,
            };
            nodes.push(connector);
        }
        prevTopX = barLeft + barWidth;
        prevTopY = topOfVisibleBar;
    }
    return { nodes, overflow: { kind: "fit" } };
};
function formatValue(value, kind) {
    const abs = Math.abs(value);
    const formatted = abs >= 1000
        ? abs.toLocaleString("en-US", { maximumFractionDigits: 1 })
        : abs.toString();
    if (kind === "up")
        return `+${formatted}`;
    if (kind === "down")
        return `−${formatted}`;
    return formatted;
}
//# sourceMappingURL=waterfallBars.js.map