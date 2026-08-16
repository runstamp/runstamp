/**
 * calloutBox — rounded rect holding a text body, with optional pointer
 * to a target (pixel coords). Used on Bain p10 / p19 / p21 for analyst
 * quotes, sidebar notes, and "important" annotations.
 *
 * The box itself is a rounded rect (preset shape "roundRect"). The
 * pointer, when supplied, is rendered as a separate connector emitted
 * by the caller — calloutBox keeps its scope tight: just the box +
 * its inner text. Callers wanting the pointer pair the box with a
 * connectorLine block.
 *
 * Tokens consumed:
 *   - palette.surface (default fill), palette.faint (default border)
 *   - palette.foreground (default text color)
 *   - type.body (text role)
 *   - spacing.sm (internal padding)
 */
const PADDING = 12;
function resolveColor(role, tokens) {
    switch (role) {
        case "foreground": return tokens.palette.foreground;
        case "muted": return tokens.palette.muted;
        case "faint": return tokens.palette.faint;
        case "accent": return tokens.palette.accent;
        case "surface": return tokens.canvas.surface;
        default: return tokens.canvas.surface;
    }
}
export const calloutBox = (input, tokens, region) => {
    const role = tokens.type[input.role ?? "body"];
    const fill = resolveColor(input.fill ?? "surface", tokens);
    const borderColor = input.borderWidth === 0
        ? undefined
        : resolveColor(input.borderColor ?? "foreground", tokens);
    const borderWidth = input.borderWidth ?? 1;
    const nodes = [];
    const box = {
        kind: "view",
        shape: input.shape ?? "rect",
        rect: { ...region },
        fill,
        ...(borderColor && borderWidth > 0
            ? { border: { width: borderWidth, color: borderColor, style: "solid" } }
            : {}),
        decorative: false,
        zIndex: 0,
    };
    nodes.push(box);
    const textRect = {
        left: region.left + PADDING,
        top: region.top + PADDING,
        width: Math.max(0, region.width - PADDING * 2),
        height: Math.max(0, region.height - PADDING * 2),
    };
    const textNode = {
        kind: "text",
        rect: textRect,
        style: {
            family: role.family,
            weight: role.weight,
            size: role.size,
            lineHeight: role.lineHeight,
            letterSpacing: role.letterSpacing,
            italic: role.italic,
            color: tokens.palette.foreground,
            align: "left",
            verticalAlign: "top",
        },
        zIndex: 1,
        autoFit: false,
    };
    if (typeof input.content === "string") {
        textNode.content = input.content;
    }
    else {
        textNode.runs = input.content;
    }
    nodes.push(textNode);
    return { nodes, overflow: { kind: "fit" } };
};
//# sourceMappingURL=calloutBox.js.map