/**
 * Translate the token bundle's `embeddedFonts` into the engine's
 * `FontEmbedConfig[]` placed at PaperDocument.embeddedFonts.
 *
 * The engine's FontEmbedConfig uses `fontFamily` (not `family`) as the
 * key field; everything else matches. Keep this function as the single
 * translation seam so the token-layer field name can evolve independently.
 */
export function toEngineEmbeddedFonts(fonts) {
    return fonts.map((f) => ({
        fontFamily: f.family,
        src: f.src,
        ...(f.bold !== undefined ? { bold: f.bold } : {}),
        ...(f.italic !== undefined ? { italic: f.italic } : {}),
    }));
}
//# sourceMappingURL=embeddedFonts.js.map