/**
 * Translate the token bundle's `embeddedFonts` into the engine's
 * `FontEmbedConfig[]` placed at PaperDocument.embeddedFonts.
 *
 * The engine's FontEmbedConfig uses `fontFamily` (not `family`) as the
 * key field; everything else matches. Keep this function as the single
 * translation seam so the token-layer field name can evolve independently.
 */

import type { EmbeddedFont } from "../tokens/schema.js";

export interface EngineFontEmbedConfig {
  fontFamily: string;
  src: string;
  bold?: boolean;
  italic?: boolean;
}

export function toEngineEmbeddedFonts(
  fonts: readonly EmbeddedFont[],
): EngineFontEmbedConfig[] {
  return fonts.map((f) => ({
    fontFamily: f.family,
    src: f.src,
    ...(f.bold !== undefined ? { bold: f.bold } : {}),
    ...(f.italic !== undefined ? { italic: f.italic } : {}),
  }));
}
