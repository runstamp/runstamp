/**
 * connectorLine — thin wrapper around ConnectorNode for straight /
 * right-angle / curved leader lines and pointer arrows. Used wherever
 * a primitive emits a ConnectorNode directly would be too low-level for
 * composition callers.
 *
 * Tokens consumed:
 *   - palette.faint (default line color)
 */
function connectorBounds(input, region) {
    if (input.bounds === "region")
        return { ...region };
    const lineWidth = input.width ?? 1;
    const arrowPad = input.arrowStart || input.arrowEnd ? 8 : 0;
    const pad = Math.max(2, lineWidth / 2) + arrowPad;
    const minX = Math.min(input.start.x, input.end.x);
    const maxX = Math.max(input.start.x, input.end.x);
    const minY = Math.min(input.start.y, input.end.y);
    const maxY = Math.max(input.start.y, input.end.y);
    return {
        left: minX - pad,
        top: minY - pad,
        width: Math.max(1, maxX - minX) + pad * 2,
        height: Math.max(1, maxY - minY) + pad * 2,
    };
}
export const connectorLine = (input, tokens, region) => {
    const colorRole = input.color ?? "faint";
    const color = colorRole === "foreground"
        ? tokens.palette.foreground
        : colorRole === "muted"
            ? tokens.palette.muted
            : colorRole === "accent"
                ? tokens.palette.accent
                : colorRole === "rule"
                    ? tokens.palette.rule
                    : tokens.palette.faint;
    const node = {
        kind: "connector",
        rect: connectorBounds(input, region),
        connectorKind: input.kind ?? "straight",
        start: input.start,
        end: input.end,
        lineWidth: input.width ?? 1,
        lineColor: color,
        lineDashStyle: input.dashStyle ?? "solid",
        arrowStart: input.arrowStart,
        arrowEnd: input.arrowEnd,
    };
    return { nodes: [node], overflow: { kind: "fit" } };
};
//# sourceMappingURL=connectorLine.js.map