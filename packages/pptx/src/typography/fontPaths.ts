// src/typography/fontPaths.ts — Shared font file resolution map
// Single source of truth for font-family-to-filename mappings used by
// both autoFont.ts (PPTX generation) and fontBridge.ts (canvas rendering).

/** Map of common font family names → candidate .ttf file names on disk. */
export const FONT_FILE_MAP: Record<string, string[]> = {
  "Arial": ["Arial.ttf"],
  "Calibri": ["Calibri.ttf", "Arial.ttf"],
  "Helvetica": ["Helvetica.ttf", "Arial.ttf"],
  "Times New Roman": ["Times New Roman.ttf", "TimesNewRoman.ttf"],
  "Georgia": ["Georgia.ttf"],
  "Verdana": ["Verdana.ttf"],
  "Trebuchet MS": ["Trebuchet MS.ttf"],
  "Courier New": ["Courier New.ttf"],
  "Tahoma": ["Tahoma.ttf"],
  "Impact": ["Impact.ttf"],
  "Comic Sans MS": ["Comic Sans MS.ttf"],
  "Palatino": ["Palatino.ttf"],
  "Garamond": ["Garamond.ttf"],
  "Book Antiqua": ["Book Antiqua.ttf"],
  "Cambria": ["Cambria.ttf", "Georgia.ttf"],
  "Consolas": ["Consolas.ttf", "Courier New.ttf"],
  "Segoe UI": ["Segoe UI.ttf", "Arial.ttf"],
  // Bundled fonts shipped with the package — see resolveBundledFontPath in
  // autoFont.ts. Aptos and Carlito are metric-compatible Calibri replacements;
  // we ship Carlito (OFL-1.1) and alias both names so default decks render
  // identically regardless of OS font availability.
  "Carlito": ["Carlito-Regular.ttf"],
  "Aptos": ["Carlito-Regular.ttf"],
};

/**
 * Family-name aliases for fonts that share an underlying file. The renderer
 * reports the font typeface as the requested family (e.g. "Aptos") even
 * though the loaded TTF is Carlito — PowerPoint then substitutes its own
 * Aptos shipped with Office 2024+ when opening the file.
 */
export const BUNDLED_FONT_FAMILIES: Record<string, { regular: string; bold?: string }> = {
  "Carlito": { regular: "Carlito-Regular.ttf", bold: "Carlito-Bold.ttf" },
  "Aptos": { regular: "Carlito-Regular.ttf", bold: "Carlito-Bold.ttf" },
};

/**
 * Broad-coverage Unicode fallback fonts for canvas rendering.
 * Tried in order. Arial Unicode has CJK + Arabic + Hebrew + most symbols.
 * These are registered with @napi-rs/canvas as "PaperFallback" to cover
 * glyphs missing from the primary font.
 */
export const UNICODE_FALLBACK_FILES: string[] = [
  "Arial Unicode.ttf",        // macOS — broad CJK/Arabic/Hebrew/symbols
  "NotoSansCJKsc-Regular.otf", // Linux — CJK SC
  "NotoSans-Regular.ttf",     // Linux fallback — Latin + some extended
  "DejaVuSans.ttf",           // Linux fallback
];

/**
 * Emoji font candidates for canvas rendering.
 * Tried in order. Registered as "PaperEmoji" for the CSS font chain.
 */
export const EMOJI_FONT_FILES: Array<{ file: string; dirs: string[] }> = [
  { file: "Apple Color Emoji.ttc", dirs: ["/System/Library/Fonts"] },                 // macOS
  { file: "NotoColorEmoji.ttf", dirs: ["/usr/share/fonts/truetype/noto"] },           // Linux
  { file: "seguiemj.ttf", dirs: ["C:\\Windows\\Fonts"] },                              // Windows
];
