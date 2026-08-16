/**
 * pageStamp — footer/header brand mark wrapping an image asset with
 * consistent positioning across all slides in a deck.
 *
 * Used wherever the brand mark needs to land in a known corner without
 * each slide composition having to repeat the image-block boilerplate.
 *
 * Falls back to a text watermark when no `src` is supplied — a light
 * type-set string in `tokens.palette.faint`.
 */
export const pageStamp = (input, tokens, region) => {
    const nodes = [];
    if (input.src) {
        const image = {
            kind: "image",
            rect: { ...region },
            src: input.src,
            alt: input.alt,
            decorative: !input.alt,
        };
        nodes.push(image);
    }
    else if (input.fallbackText) {
        const eyebrow = tokens.type.eyebrow;
        const text = {
            kind: "text",
            rect: { ...region },
            content: eyebrow.transform === "upper" ? input.fallbackText.toUpperCase() : input.fallbackText,
            style: {
                family: eyebrow.family,
                weight: eyebrow.weight,
                size: eyebrow.size,
                letterSpacing: eyebrow.letterSpacing,
                color: tokens.palette.faint,
                align: "right",
                verticalAlign: "middle",
            },
            autoFit: false,
        };
        nodes.push(text);
    }
    return { nodes, overflow: { kind: "fit" } };
};
//# sourceMappingURL=pageStamp.js.map