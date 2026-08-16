import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);

// src/typography/fontPaths.ts
var FONT_FILE_MAP = {
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
  "Aptos": ["Carlito-Regular.ttf"]
};
var UNICODE_FALLBACK_FILES = [
  "Arial Unicode.ttf",
  // macOS — broad CJK/Arabic/Hebrew/symbols
  "NotoSansCJKsc-Regular.otf",
  // Linux — CJK SC
  "NotoSans-Regular.ttf",
  // Linux fallback — Latin + some extended
  "DejaVuSans.ttf"
  // Linux fallback
];
var EMOJI_FONT_FILES = [
  { file: "Apple Color Emoji.ttc", dirs: ["/System/Library/Fonts"] },
  // macOS
  { file: "NotoColorEmoji.ttf", dirs: ["/usr/share/fonts/truetype/noto"] },
  // Linux
  { file: "seguiemj.ttf", dirs: ["C:\\Windows\\Fonts"] }
  // Windows
];

export {
  FONT_FILE_MAP,
  UNICODE_FALLBACK_FILES,
  EMOJI_FONT_FILES
};
//# sourceMappingURL=chunk-QSVRDIHM.js.map
