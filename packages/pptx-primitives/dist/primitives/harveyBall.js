/**
 * harveyBall — five-state pie indicator (0/4, 1/4, 2/4, 3/4, 4/4).
 *
 * Used on Bain p22 / p24 capability matrices. Renders as an outline
 * circle with a filled wedge spanning N quadrants, starting at 12
 * o'clock and going clockwise. The empty state is a hollow circle;
 * the full state is a solid filled circle.
 *
 * Tokens consumed:
 *   - palette.foreground (filled wedge + outline)
 *   - palette.surface (background of unfilled portion)
 */
export const harveyBall = (input, tokens, region) => {
    // Center the ball in the region; diameter is min(region.w, region.h).
    const diameter = Math.min(region.width, region.height);
    const cx = region.left + region.width / 2;
    const cy = region.top + region.height / 2;
    const left = cx - diameter / 2;
    const top = cy - diameter / 2;
    const filled = Math.max(0, Math.min(4, input.filled));
    const nodes = [];
    // Outline circle (always drawn).
    const outline = {
        kind: "view",
        shape: "ellipse",
        rect: { left, top, width: diameter, height: diameter },
        border: { width: 1, color: tokens.palette.foreground, style: "solid" },
        zIndex: 0,
        decorative: false,
    };
    nodes.push(outline);
    if (filled === 4) {
        // Full ball — single filled ellipse on top of the outline.
        const full = {
            kind: "view",
            shape: "ellipse",
            rect: { left, top, width: diameter, height: diameter },
            fill: tokens.palette.foreground,
            zIndex: 1,
            decorative: true,
        };
        nodes.push(full);
    }
    else if (filled > 0) {
        // Partial fill: emit real OOXML pie-wedge preset geometry for each
        // filled quadrant. Rotating the same top-right wedge keeps the PPTX
        // editable at larger sizes.
        for (let i = 0; i < filled; i++) {
            const node = {
                kind: "view",
                shape: "pieWedge",
                rect: { left, top, width: diameter, height: diameter },
                fill: tokens.palette.foreground,
                rotation: i * 90,
                zIndex: 1 + i,
                decorative: true,
            };
            nodes.push(node);
        }
        nodes.push({
            kind: "view",
            shape: "ellipse",
            rect: { left, top, width: diameter, height: diameter },
            border: { width: 1, color: tokens.palette.foreground, style: "solid" },
            zIndex: filled + 1,
            decorative: false,
        });
    }
    return { nodes, overflow: { kind: "fit" } };
};
//# sourceMappingURL=harveyBall.js.map