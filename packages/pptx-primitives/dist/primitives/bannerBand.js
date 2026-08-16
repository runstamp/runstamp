/**
 * bannerBand — horizontal solid-fill band carrying display-style text.
 * Used on LG p7 (the simpler banners) and other section-divider plates.
 *
 * Renders as a filled rect with optional skew angle (parallelogram
 * variant) and centered text. Skew is applied via the engine's
 * "parallelogram" preset shape rather than per-shape skew transforms.
 *
 * Tokens consumed:
 *   - palette.foreground / accent (fill)
 *   - palette.accentInverse (text)
 *   - type.display or type.title (text role)
 */
export const bannerBand = (input, tokens, region) => {
    const role = tokens.type[input.role ?? "title"];
    const fillRole = input.fill ?? "foreground";
    const fill = fillRole === "muted"
        ? tokens.palette.muted
        : fillRole === "accent"
            ? tokens.palette.accent
            : fillRole === "accentSecondary"
                ? (tokens.palette.accentSecondary ?? tokens.palette.foreground)
                : tokens.palette.foreground;
    const band = {
        kind: "view",
        shape: input.parallelogram ? "parallelogram" : "rect",
        rect: { ...region },
        fill,
        decorative: false,
    };
    const text = {
        kind: "text",
        rect: { ...region },
        content: role.transform === "upper" ? input.text.toUpperCase() : input.text,
        style: {
            family: role.family,
            weight: role.weight,
            size: role.size,
            lineHeight: role.lineHeight,
            letterSpacing: role.letterSpacing,
            italic: role.italic,
            color: tokens.palette.accentInverse,
            align: "center",
            verticalAlign: "middle",
        },
        zIndex: 1,
        autoFit: false,
    };
    return { nodes: [band, text], overflow: { kind: "fit" } };
};
//# sourceMappingURL=bannerBand.js.map