/**
 * diagonalStamp — rotated badge ("ILLUSTRATIVE", "PRELIMINARY", "DRAFT")
 * placed at a corner of the slide via pixel coords. Used on Bain p20 /
 * p21 to flag charts that haven't been finalized.
 *
 * Tokens consumed:
 *   - palette.muted (default text color — softer than foreground so the
 *     stamp doesn't fight the slide content)
 *   - type.eyebrow (tracked-out caps)
 */
export const diagonalStamp = (input, tokens, region) => {
    const eyebrow = tokens.type.eyebrow;
    const colorRole = input.color ?? "muted";
    const color = colorRole === "faint"
        ? tokens.palette.faint
        : colorRole === "foreground"
            ? tokens.palette.foreground
            : colorRole === "accent"
                ? tokens.palette.accent
                : tokens.palette.muted;
    const stamp = {
        kind: "text",
        rect: { ...region },
        content: input.text.toUpperCase(),
        rotation: input.rotation ?? -25,
        style: {
            family: eyebrow.family,
            weight: 700,
            size: eyebrow.size,
            lineHeight: eyebrow.lineHeight,
            letterSpacing: Math.max(eyebrow.letterSpacing, 1.2),
            italic: false,
            color,
            align: "center",
            verticalAlign: "middle",
        },
        autoFit: false,
    };
    const nodes = [stamp];
    return { nodes, overflow: { kind: "fit" } };
};
//# sourceMappingURL=diagonalStamp.js.map