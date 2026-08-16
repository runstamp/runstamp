/**
 * sectionRibbon — optional full-width header bar with a tracked-caps label.
 *
 * LG's load-bearing element: the thin black bar across the top of every
 * non-title content slide, carrying "INTRODUCTION" / "PHASE 1 — MACRO &
 * MICRO TREND ANALYSIS" tracked wide across the middle.
 *
 * When `chrome.headerRibbon.enabled = false` (Bain and minimal bundles),
 * the primitive returns an empty result — so the same composition can be
 * used across ribbon-ful and ribbon-less bundles without branching.
 *
 * The ribbon owns a fixed height from the top of the slide; the caller
 * passes that region explicitly (typically `{left: 0, top: 0, width:
 * slide.width, height: chrome.headerRibbon.height}`). The ribbon does not
 * reach into the slide layout budget — that's the compiler's job.
 */
import { applyTypeTransform } from "../util/estimateText.js";
export const sectionRibbon = (input, tokens, region) => {
    const { headerRibbon } = tokens.chrome;
    if (!headerRibbon.enabled) {
        return { nodes: [], overflow: { kind: "fit" } };
    }
    const nodes = [];
    const fillColor = resolveChromeFill(headerRibbon.fill, tokens);
    const textColor = chromeTextColor(headerRibbon.fill, tokens);
    const bar = {
        kind: "view",
        shape: "rect",
        decorative: false,
        zIndex: 0,
        rect: {
            left: region.left,
            top: region.top,
            width: region.width,
            height: Math.min(region.height, headerRibbon.height),
        },
        fill: fillColor,
    };
    nodes.push(bar);
    const typeRole = tokens.type[headerRibbon.type];
    const labelNode = {
        kind: "text",
        zIndex: 1,
        rect: {
            left: region.left + tokens.spacing.md,
            top: region.top,
            width: region.width - tokens.spacing.md * 2,
            height: Math.min(region.height, headerRibbon.height),
        },
        content: applyTypeTransform(input.label, typeRole.transform),
        style: {
            family: typeRole.family,
            weight: typeRole.weight,
            size: typeRole.size,
            lineHeight: typeRole.lineHeight,
            letterSpacing: typeRole.letterSpacing,
            italic: typeRole.italic,
            color: textColor,
            align: headerRibbon.align,
            verticalAlign: "middle",
        },
        autoFit: false,
    };
    nodes.push(labelNode);
    return { nodes, overflow: { kind: "fit" } };
};
function resolveChromeFill(role, tokens) {
    switch (role) {
        case "foreground": return tokens.palette.foreground;
        case "accent": return tokens.palette.accent;
        case "muted": return tokens.palette.muted;
        case "surface": return tokens.canvas.surface;
    }
}
function chromeTextColor(fillRole, tokens) {
    // If the fill is dark (foreground/accent/muted), use accentInverse for
    // legibility; if it's the slide surface, use foreground.
    return fillRole === "surface" ? tokens.palette.foreground : tokens.palette.accentInverse;
}
//# sourceMappingURL=sectionRibbon.js.map