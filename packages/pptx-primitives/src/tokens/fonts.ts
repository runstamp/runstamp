/**
 * Font availability audit.
 *
 * Critical distinction the API makes, because it's the one everyone gets
 * wrong: there are TWO font resolution paths in play for any render.
 *
 *   1. **OOXML / final .pptx fidelity.** The slide XML declares the
 *      exact family name the caller requested. If `embeddedFonts` supplies
 *      the font file, the engine packs it into `ppt/fonts/*.fntdata` and
 *      PowerPoint/Keynote renders with perfect fidelity anywhere the file
 *      is opened. If not embedded, Office uses the user's system font
 *      (usually fine for common families like Helvetica/Arial/Georgia).
 *      **This is the fidelity that ships.**
 *
 *   2. **Canvas-preview thumbnail.** The engine's thumbnail generator
 *      uses @napi-rs/canvas and looks up fonts via the `FONT_FILE_MAP` in
 *      `core/src/typography/fontPaths.ts` against the host filesystem.
 *      Families not on that map (or not present on the host) substitute
 *      to "NotoSans" for the thumbnail image only. **This does not affect
 *      the .pptx** — only the small JPEG the file carries for OS previews.
 *
 * The token audit flags unknown families so callers know the thumbnail
 * may substitute. It does NOT warn when embedded fonts cover the family,
 * because that's the primary fidelity path. Final-rendered decks look
 * right even when the audit flags a family — it's advisory, not fatal.
 */

import type { EmbeddedFont, ResolvedTokens } from "./schema.js";

/**
 * Families the engine's canvas preview can resolve on a typical host
 * without any `embeddedFonts` entry. Source of truth: the engine's own
 * `FONT_FILE_MAP` in `core/src/typography/fontPaths.ts`. Keep this in
 * sync when the engine's mapping changes.
 *
 * Note: these require the font file to be present on the rendering
 * host's filesystem. On macOS / Windows, most of these are system-shipped.
 * On Linux-without-X, only Noto* variants ship by default.
 */
export const BUNDLED_FONT_POOL: readonly string[] = Object.freeze([
  "Arial",
  "Calibri",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Tahoma",
  "Impact",
  "Comic Sans MS",
  "Palatino",
  "Garamond",
  "Book Antiqua",
  "Cambria",
  "Consolas",
  "Segoe UI",
  // Noto family — the engine's own always-present fallback chain.
  "Noto Sans",
  "Noto Serif",
  "Noto Sans JP",
  "Noto Sans SC",
  "Noto Sans TC",
  "Noto Sans KR",
]);

export interface TokenWarning {
  code: "FONT_NOT_EMBEDDED_AND_NOT_SYSTEM";
  message: string;
  context: { role: string; family: string };
}

/**
 * Warns only for families the engine cannot resolve through *either* the
 * host system font map *or* caller-supplied embeddedFonts. If embedded
 * fonts cover the family, the audit is silent — final-render fidelity is
 * guaranteed regardless of host.
 *
 * Never throws.
 */
export function auditFontAvailability(tokens: ResolvedTokens): TokenWarning[] {
  const embeddedFamilies = new Set(
    tokens.embeddedFonts.map((f) => normalize(f.family)),
  );
  const systemMapped = new Set(BUNDLED_FONT_POOL.map(normalize));

  const warnings: TokenWarning[] = [];
  const seen = new Set<string>();

  for (const [roleName, role] of Object.entries(tokens.type)) {
    const family = normalize(role.family);
    if (embeddedFamilies.has(family)) continue;
    if (systemMapped.has(family)) continue;
    if (seen.has(family)) continue;
    seen.add(family);

    warnings.push({
      code: "FONT_NOT_EMBEDDED_AND_NOT_SYSTEM",
      message:
        `Font "${role.family}" is neither on the engine's system-font map nor ` +
        `in embeddedFonts. Final-rendered .pptx will fall back to the opener's ` +
        `substitution; canvas-preview thumbnails will render as NotoSans. ` +
        `Supply via embeddedFonts to pin fidelity.`,
      context: { role: roleName, family: role.family },
    });
  }

  return warnings;
}

/** Is the given family on the engine's system-font map? */
export function isBundledFont(family: string): boolean {
  const f = normalize(family);
  return BUNDLED_FONT_POOL.map(normalize).includes(f);
}

/** Look up an embedded font by family (case-insensitive), return the first
 *  matching regular (non-bold, non-italic) entry, or null. */
export function findEmbeddedRegular(
  family: string,
  fonts: readonly EmbeddedFont[],
): EmbeddedFont | null {
  const f = normalize(family);
  for (const font of fonts) {
    if (normalize(font.family) !== f) continue;
    if (!font.bold && !font.italic) return font;
  }
  // Fall back to any entry with that family.
  return fonts.find((x) => normalize(x.family) === f) ?? null;
}

function normalize(family: string): string {
  return family.trim().toLowerCase();
}
