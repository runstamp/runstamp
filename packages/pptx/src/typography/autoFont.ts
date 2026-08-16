// src/typography/autoFont.ts — Auto-load system fonts referenced by the AST
import { getLogger } from "../logger.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { FontStrategy, PaperDocument, PaperNode, TextStyle, TextRun, Paragraph } from "../types/ast.js";
import { getFontOrNull, loadFont, loadFontWithHarfBuzz, recordFontSubstitution, boldFontKey, italicFontKey, boldItalicFontKey } from "./fontCache.js";
import { isLiteBundle } from "../engineMode.js";
import { PaperError } from "../errors.js";
import {
  cacheExternalFontBuffer,
  faceForStyle,
  firstMissingCodePoint,
  getCachedFontBuffer,
  inspectEmbeddableFont,
  resolveRegistryFont,
  type FontDiagnostic,
  type FontFace,
  type ResolvedFontIdentity,
} from "./fontRegistry.js";
import { classifyScript } from "./fontFallback.js";
import { validateFetchUrl } from "../ooxml/urlGuard.js";

export interface AutoLoadDocumentFontsOptions {
  /**
   * When true, throw PaperError("FONT_NOT_FOUND") instead of falling back to
   * char-count measurement for any font the engine can't load. Use this when
   * silent layout drift is unacceptable — e.g. server-side rendering where
   * the deck must match the originating measurement environment.
   */
  strict?: boolean;
}

// ---------------------------------------------------------------------------
// Font name → system file path resolution
// ---------------------------------------------------------------------------

const HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? "";

const SYSTEM_FONT_DIRS_MAC = [
  ...(HOME_DIR ? [`${HOME_DIR}/Library/Fonts`] : []),
  "/System/Library/Fonts/Supplemental",
  "/Library/Fonts",
  "/System/Library/Fonts",
];

const SYSTEM_FONT_DIRS_WIN = [
  ...(HOME_DIR ? [`${HOME_DIR}\\AppData\\Local\\Microsoft\\Windows\\Fonts`] : []),
  "C:\\Windows\\Fonts",
];

const SYSTEM_FONT_DIRS_LINUX = [
  ...(HOME_DIR ? [`${HOME_DIR}/.local/share/fonts`, `${HOME_DIR}/.fonts`] : []),
  "/usr/share/fonts/truetype/dejavu",
  "/usr/share/fonts/truetype/liberation",
  "/usr/share/fonts/truetype",
  "/usr/share/fonts",
];

/**
 * Resolves a system font path. Returns { path, actualFileName } so callers
 * can report the concrete file used. System mode intentionally searches only
 * exact requested-family filenames: substituting registry bytes under a
 * proprietary name would reintroduce measure/raster divergence.
 */
function resolveSystemFontPath(fontFamily: string): { path: string; actualFileName: string } | null {
  // Security: reject font family names with path traversal characters
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }

  const dirs =
    process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC
      : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN
      : SYSTEM_FONT_DIRS_LINUX;

  const candidates = [
    `${fontFamily}.ttf`,
    `${fontFamily}-Regular.ttf`,
    `${fontFamily} Regular.ttf`,
    `${fontFamily}.otf`,
    `${fontFamily}-Regular.otf`,
  ];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return { path: p, actualFileName: file };
    }
  }
  return null;
}

/**
 * Resolves a bold variant system font path for the given family.
 */
function resolveSystemBoldFontPath(fontFamily: string): string | null {
  // Security: reject font family names with path traversal characters
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }

  const dirs =
    process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC
      : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN
      : SYSTEM_FONT_DIRS_LINUX;

  const candidates = [`${fontFamily} Bold.ttf`, `${fontFamily}-Bold.ttf`];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Resolves an italic variant system font path for the given family.
 */
function resolveSystemItalicFontPath(fontFamily: string): string | null {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }

  const dirs =
    process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC
      : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN
      : SYSTEM_FONT_DIRS_LINUX;

  const candidates = [`${fontFamily} Italic.ttf`, `${fontFamily}-Italic.ttf`];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Resolves a bold-italic variant system font path for the given family.
 */
function resolveSystemBoldItalicFontPath(fontFamily: string): string | null {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }

  const dirs =
    process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC
      : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN
      : SYSTEM_FONT_DIRS_LINUX;

  const candidates = [
    `${fontFamily} Bold Italic.ttf`,
    `${fontFamily}-BoldItalic.ttf`,
    `${fontFamily}-BoldOblique.ttf`,
  ];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// AST walk to collect all referenced font families + bold needs
// ---------------------------------------------------------------------------

interface FontNeeds {
  families: Set<string>;
  boldFamilies: Set<string>;
  italicFamilies: Set<string>;
  boldItalicFamilies: Set<string>;
}

function collectFontNeeds(doc: PaperDocument): FontNeeds {
  const families = new Set<string>();
  const boldFamilies = new Set<string>();
  const italicFamilies = new Set<string>();
  const boldItalicFamilies = new Set<string>();

  function fromTextStyle(style: TextStyle | undefined) {
    if (style?.fontFamily) {
      families.add(style.fontFamily);
      const isBold = style.fontWeight === "bold";
      const isItalic = style.fontStyle === "italic";
      if (isBold && isItalic) boldItalicFamilies.add(style.fontFamily);
      else if (isBold) boldFamilies.add(style.fontFamily);
      else if (isItalic) italicFamilies.add(style.fontFamily);
    }
    if (style?.fontFallback) {
      for (const f of style.fontFallback) families.add(f);
    }
  }

  function fromRuns(runs: TextRun[] | undefined, parentFamily?: string) {
    if (!runs) return;
    for (const run of runs) {
      const family = run.style?.fontFamily ?? parentFamily;
      if (run.style?.fontFamily) families.add(run.style.fontFamily);
      const isBold = run.style?.fontWeight === "bold";
      const isItalic = run.style?.fontStyle === "italic";
      if (isBold && isItalic && family) boldItalicFamilies.add(family);
      else if (isBold && family) boldFamilies.add(family);
      else if (isItalic && family) italicFamilies.add(family);
    }
  }

  function fromParagraphs(paragraphs: Paragraph[] | undefined, parentFamily?: string) {
    if (!paragraphs) return;
    for (const para of paragraphs) {
      fromRuns(para.runs, parentFamily);
    }
  }

  function walkNode(node: PaperNode) {
    const style = node.style as TextStyle | undefined;
    fromTextStyle(style);
    const parentFamily = style?.fontFamily;

    if (node.type === "Text") {
      const textNode = node as PaperNode & {
        content?: string | TextRun[];
        paragraphs?: Paragraph[];
      };
      if (Array.isArray(textNode.content)) fromRuns(textNode.content as TextRun[], parentFamily);
      fromParagraphs(textNode.paragraphs, parentFamily);
    }

    // Shape text
    if (node.type === "View") {
      const view = node as PaperNode & {
        textStyle?: TextStyle;
        textParagraphs?: Paragraph[];
      };
      fromTextStyle(view.textStyle);
      fromParagraphs(view.textParagraphs, view.textStyle?.fontFamily ?? parentFamily);
    }

    // Table cells
    if (node.type === "Table") {
      const table = node as PaperNode & {
        tableData?: {
          rows?: Array<{ cells?: Array<{ text?: string; style?: TextStyle; content?: TextRun[]; paragraphs?: Paragraph[] }> }>;
          style?: { headerRowStyle?: TextStyle };
        };
      };
      const headerStyle = table.tableData?.style?.headerRowStyle;
      if (headerStyle?.fontFamily) {
        families.add(headerStyle.fontFamily);
        if (headerStyle.fontWeight === "bold") boldFamilies.add(headerStyle.fontFamily);
      }
      for (const row of table.tableData?.rows ?? []) {
        for (const cell of row.cells ?? []) {
          fromTextStyle(cell.style as TextStyle | undefined);
          fromRuns(cell.content, (cell.style as TextStyle | undefined)?.fontFamily);
          fromParagraphs(cell.paragraphs, (cell.style as TextStyle | undefined)?.fontFamily);
        }
      }
    }

    // Recurse children
    const children = (node as { children?: PaperNode[] }).children;
    if (children) {
      for (const child of children) walkNode(child);
    }
  }

  for (const slide of doc.slides) {
    for (const child of slide.children ?? []) {
      walkNode(child);
    }
  }

  return { families, boldFamilies, italicFamilies, boldItalicFamilies };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walks the document AST, discovers all referenced font families, and loads
 * them from system paths (or NotoSans fallback) into the fontkit + HarfBuzz
 * caches. Idempotent — already-loaded fonts are skipped.
 *
 * Also loads bold variants when bold weight is used, and detects font
 * substitutions (e.g. Calibri → Arial on macOS) for safety margin adjustment.
 *
 * Must be called BEFORE runLayout() so the Yoga measure bridge gets real
 * HarfBuzz shaping widths instead of the `fontSize * 0.6 * charCount` fallback.
 */
/**
 * Internal helper: load a font file into the cache.
 * In full mode, registers with both fontkit and HarfBuzz.
 * In lite mode, uses fontkit only (no WASM init).
 */
async function loadFontAuto(family: string, buffer: Buffer): Promise<void> {
  if (isLiteBundle()) {
    await loadFont(family, buffer);
  } else {
    await loadFontWithHarfBuzz(family, buffer);
  }
}

/**
 * Decode a font src (data: URI or http(s) URL) into a Buffer for fontkit.
 * Returns null on any failure so the caller can fall back to system/NotoSans.
 */
async function decodeEmbeddedFontSrc(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith("data:")) {
      const comma = src.indexOf(",");
      if (comma < 0) return null;
      const meta = src.slice(0, comma);
      const payload = src.slice(comma + 1);
      if (meta.includes(";base64")) {
        return Buffer.from(payload, "base64");
      }
      return Buffer.from(decodeURIComponent(payload), "binary");
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      validateFetchUrl(src);
      const res = await fetch(src);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pick the best `embeddedFonts[]` entry for a (family, variant) pair.
 * Variant is matched on `bold` and `italic` flags. Default (regular)
 * = neither flag set, equivalent to `bold === false && italic === false`.
 */
function pickEmbeddedFont(
  embedded: ReadonlyArray<{ fontFamily: string; src: string; bold?: boolean; italic?: boolean }> | undefined,
  family: string,
  wantBold: boolean,
  wantItalic: boolean,
): { src: string } | null {
  if (!embedded || embedded.length === 0) return null;
  const matches = embedded.filter((f) => f.fontFamily === family);
  if (matches.length === 0) return null;
  // Exact variant match first.
  const exact = matches.find((f) => Boolean(f.bold) === wantBold && Boolean(f.italic) === wantItalic);
  if (exact) return exact;
  // For regular (no bold, no italic), accept an entry with no flags set.
  if (!wantBold && !wantItalic) {
    const reg = matches.find((f) => !f.bold && !f.italic);
    if (reg) return reg;
  }
  return null;
}

function canonicalFontStrategy(doc: PaperDocument): "portable" | "system" | "user-embedded" {
  const strategy: FontStrategy = doc.fontStrategy
    ?? (doc.embeddedFonts?.length ? "user-embedded" : "portable");
  if (strategy === "named-with-fallback" || strategy === "system-safe") {
    getLogger().warn(`[autoFont] fontStrategy="${strategy}" is deprecated; using portable semantics.`);
    return "portable";
  }
  if (strategy === "embedded") {
    getLogger().warn('[autoFont] fontStrategy="embedded" is deprecated; using user-embedded semantics.');
    return "user-embedded";
  }
  return strategy;
}

function variantKey(family: string, face: FontFace): string {
  return `${family.toLocaleLowerCase("en-US")}\u0000${face}`;
}

async function resolveDocumentFonts(doc: PaperDocument): Promise<void> {
  const strategy = canonicalFontStrategy(doc);
  doc.fontStrategy = strategy;
  const userAssets = new Map<string, ResolvedFontIdentity>();

  if (strategy === "user-embedded") {
    for (const config of doc.embeddedFonts ?? []) {
      const buffer = await decodeEmbeddedFontSrc(config.src);
      if (!buffer) {
        throw new PaperError(`Unable to load user-embedded font "${config.fontFamily}".`, {
          code: "FONT_NOT_FOUND",
          phase: "font",
        });
      }
      const inspected = inspectEmbeddableFont(buffer);
      if (inspected.familyName !== config.fontFamily) {
        throw new PaperError(
          `User-embedded font family mismatch: config names "${config.fontFamily}" but bytes name "${inspected.familyName}". Font aliases are not permitted.`,
          { code: "VALIDATION_FAILED", phase: "font" },
        );
      }
      cacheExternalFontBuffer(inspected.sha256, buffer);
      const face = faceForStyle(config.bold, config.italic);
      userAssets.set(variantKey(config.fontFamily, face), {
        requestedFamily: config.fontFamily,
        family: config.fontFamily,
        face,
        source: "user",
        path: `embeddedFonts:${config.fontFamily}:${face}`,
        sha256: inspected.sha256,
        byteLength: buffer.length,
        fsType: inspected.fsType,
        pixelGateEligible: true,
      });
    }
  }

  const used = new Map<string, ResolvedFontIdentity>();
  const resolveIdentity = (requestedFamily: string, face: FontFace, text = ""): ResolvedFontIdentity => {
    let identity: ResolvedFontIdentity;
    if (strategy === "system") {
      identity = {
        requestedFamily,
        family: requestedFamily,
        face,
        source: "system",
        pixelGateEligible: false,
        diagnostics: [{
          code: "FONT_SYSTEM_OPT_IN",
          message: `System font "${requestedFamily}" is an explicit nonportable opt-in and is ineligible for pixel gating.`,
        }],
      };
    } else if (strategy === "user-embedded") {
      const exact = userAssets.get(variantKey(requestedFamily, face));
      const regular = userAssets.get(variantKey(requestedFamily, "Regular"));
      if (exact) {
        identity = { ...exact };
      } else if (regular) {
        identity = {
          ...regular,
          pixelGateEligible: false,
          diagnostics: [{
            code: "FONT_MISSING_FACE_VARIANT",
            message: `User-embedded font "${requestedFamily}" has no ${face} face; its Regular face will be synthesized.`,
          }],
        };
      } else {
        identity = {
          requestedFamily,
          family: requestedFamily,
          face,
          source: "user",
          pixelGateEligible: false,
          diagnostics: [{
            code: "FONT_REQUESTED_FAMILY_NOT_EMBEDDED",
            message: `Requested font "${requestedFamily}" has no matching caller-supplied embedded face.`,
          }],
        };
      }
    } else {
      const exact = resolveRegistryFont(requestedFamily, face);
      const regular = resolveRegistryFont(requestedFamily, "Regular");
      if (exact) {
        identity = exact;
      } else if (regular) {
        identity = {
          ...regular,
          pixelGateEligible: false,
          diagnostics: [{
            code: "FONT_MISSING_FACE_VARIANT",
            message: `Admitted font "${regular.family}" has no ${face} face; its Regular face will be synthesized.`,
          }],
        };
      } else {
        const fallback = resolveRegistryFont("Arial", face) ?? resolveRegistryFont("Arial", "Regular");
        if (!fallback) {
          throw new PaperError("Portable fallback family Liberation Sans is missing from the registry.", {
            code: "FONT_NOT_FOUND",
            phase: "font",
          });
        }
        identity = {
          ...fallback,
          requestedFamily,
          diagnostics: [{
            code: "FONT_REQUESTED_FAMILY_NOT_EMBEDDED",
            message: `Requested font "${requestedFamily}" is not admitted; using "${fallback.family}" instead.`,
          }],
        };
      }
    }

    const hasPendingBatchEScript = [...text].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && codePoint > 0x20 && classifyScript(codePoint) !== "latin";
    });
    const missingCodePoint = firstMissingCodePoint(identity.sha256, text);
    if (hasPendingBatchEScript || missingCodePoint !== undefined) {
      const diagnostics: FontDiagnostic[] = [...(identity.diagnostics ?? []), {
        code: "FONT_COVERAGE_FALLBACK_USED",
        message: missingCodePoint !== undefined
          ? `Resolved font "${identity.family}" lacks U+${missingCodePoint.toString(16).toUpperCase().padStart(4, "0")}; no admitted coverage fallback is available and a:ea/a:cs remain empty.`
          : `No admitted Batch E script face is available for text requested in "${requestedFamily}"; a:ea/a:cs will remain empty.`,
      }];
      identity = { ...identity, diagnostics, pixelGateEligible: false };
    }

    if (strategy === "portable") {
      identity = {
        ...identity,
        pixelGateEligible: false,
        diagnostics: [...(identity.diagnostics ?? []), {
          code: "FONT_EMBEDDING_UNAVAILABLE",
          message: "PowerPoint font embedding is unavailable because no validated EOT/MicroType Express encoder is configured; portable font names will be referenced without embedding.",
        }],
      };
    }

    const usedKey = identity.sha256 ?? `${identity.source}:${identity.family}:${identity.face}`;
    const previous = used.get(usedKey);
    used.set(usedKey, previous ? {
      ...identity,
      pixelGateEligible: previous.pixelGateEligible && identity.pixelGateEligible,
      diagnostics: [...new Map(
        [...(previous.diagnostics ?? []), ...(identity.diagnostics ?? [])]
          .map((diagnostic) => [`${diagnostic.code}:${diagnostic.message}`, diagnostic]),
      ).values()],
    } : identity);
    return identity;
  };

  const applyStyle = (
    style: TextStyle | NonNullable<TextRun["style"]>,
    requestedFamily: string,
    bold: boolean,
    italic: boolean,
    text = "",
  ): ResolvedFontIdentity => {
    const identity = resolveIdentity(requestedFamily, faceForStyle(bold, italic), text);
    style.fontFamily = identity.family;
    style.resolvedFont = identity;
    return identity;
  };

  const resolveRuns = (runs: TextRun[] | undefined, parent: TextStyle, parentRequested: string): void => {
    for (const run of runs ?? []) {
      const style = run.style ?? (run.style = {});
      const requested = style.resolvedFont?.requestedFamily ?? style.fontFamily ?? parentRequested;
      const bold = (style.fontWeight ?? parent.fontWeight) === "bold";
      const italic = (style.fontStyle ?? parent.fontStyle) === "italic";
      applyStyle(style, requested, bold, italic, run.text);
    }
  };

  const resolveTextStyle = (style: TextStyle, text: string, fallbackFamily: string): string => {
    const requested = style.resolvedFont?.requestedFamily ?? style.fontFamily ?? fallbackFamily;
    applyStyle(style, requested, style.fontWeight === "bold", style.fontStyle === "italic", text);
    if (strategy === "portable") {
      style.fontFallback = [...new Set((style.fontFallback ?? []).map((family) =>
        resolveRegistryFont(family, "Regular")?.family ?? "Liberation Sans"))]
        .filter((family) => family !== style.fontFamily);
    } else {
      style.fontFallback = [];
    }
    return requested;
  };

  const resolveNestedFontProperties = (value: unknown, seen = new Set<object>()): void => {
    if (!value || typeof value !== "object" || Buffer.isBuffer(value) || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) resolveNestedFontProperties(item, seen);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const [key, nested] of Object.entries(record)) {
      if ((key === "fontFamily" || key.endsWith("FontFamily")) && typeof nested === "string") {
        const identity = resolveIdentity(
          nested,
          faceForStyle(record.bold === true || record.fontWeight === "bold", record.italic === true || record.fontStyle === "italic"),
        );
        record[key] = identity.family;
        record[`${key}ResolvedFont`] = identity;
        if (key === "fontFamily") record.resolvedFont = identity;
      } else {
        resolveNestedFontProperties(nested, seen);
      }
    }
  };

  const themeFallback = doc.theme?.fontScheme?.minorLatin ?? "Liberation Sans";
  const walkNode = (node: PaperNode): void => {
    const nodeStyle = (node.style ?? ((node as { style?: TextStyle }).style = {})) as TextStyle;
    if (node.type === "Text") {
      const textNode = node as PaperNode & { content?: string | TextRun[]; paragraphs?: Paragraph[] };
      const directText = typeof textNode.content === "string" ? textNode.content : "";
      const requested = resolveTextStyle(nodeStyle, directText, themeFallback);
      if (Array.isArray(textNode.content)) resolveRuns(textNode.content, nodeStyle, requested);
      for (const paragraph of textNode.paragraphs ?? []) {
        resolveRuns(paragraph.runs, nodeStyle, requested);
        resolveNestedFontProperties(paragraph.bullet);
      }
    } else if (node.type === "View") {
      const view = node as PaperNode & { textStyle?: TextStyle; textParagraphs?: Paragraph[]; textContent?: string };
      if (view.textStyle || view.textContent !== undefined || view.textParagraphs?.length) {
        const style = view.textStyle ?? (view.textStyle = {});
        const requested = resolveTextStyle(style, view.textContent ?? "", themeFallback);
        for (const paragraph of view.textParagraphs ?? []) {
          resolveRuns(paragraph.runs, style, requested);
          resolveNestedFontProperties(paragraph.bullet);
        }
      }
    } else if (node.type === "Table") {
      const table = node as PaperNode & {
        tableData?: {
          rows?: Array<{ cells?: Array<{ text?: string; style?: TextStyle; content?: TextRun[]; paragraphs?: Paragraph[] }> }>;
          style?: { headerRowStyle?: TextStyle };
        };
      };
      const header = table.tableData?.style?.headerRowStyle;
      if (header) resolveTextStyle(header, "", themeFallback);
      for (const row of table.tableData?.rows ?? []) {
        for (const cell of row.cells ?? []) {
          const style = cell.style ?? (cell.style = {});
          const requested = resolveTextStyle(style, cell.text ?? "", themeFallback);
          resolveRuns(cell.content, style, requested);
          for (const paragraph of cell.paragraphs ?? []) {
            resolveRuns(paragraph.runs, style, requested);
            resolveNestedFontProperties(paragraph.bullet);
          }
        }
      }
    } else if (node.type === "Chart") {
      resolveNestedFontProperties(node.chartData);
    }
    for (const child of (node as { children?: PaperNode[] }).children ?? []) walkNode(child);
  };

  for (const slide of doc.slides) {
    for (const child of slide.children ?? []) walkNode(child);
  }

  if (doc.theme?.fontScheme) {
    for (const key of ["majorLatin", "minorLatin"] as const) {
      const requested = doc.theme.fontScheme[key];
      if (requested) doc.theme.fontScheme[key] = resolveIdentity(requested, "Regular").family;
    }
  }
  doc.resolvedFonts = [...used.values()];
  doc.fontPixelGateEligible = strategy !== "system"
    && doc.resolvedFonts.every((font) => font.pixelGateEligible);
}

export async function autoLoadDocumentFonts(
  doc: PaperDocument,
  options?: AutoLoadDocumentFontsOptions,
): Promise<void> {
  await resolveDocumentFonts(doc);
  const { families, boldFamilies, italicFamilies, boldItalicFamilies } = collectFontNeeds(doc);
  if (families.size === 0) return;

  const strict = options?.strict ?? false;
  const lite = isLiteBundle();
  const strategy = canonicalFontStrategy(doc);
  let portableFallback: ReturnType<typeof resolveRegistryFont> = null;
  const embedded = strategy === "user-embedded" ? doc.embeddedFonts : undefined;

  for (const family of families) {
    // Already loaded?
    if (getFontOrNull(family)) continue;

    // Portable and user-embedded runs carry a concrete SHA whose bytes live
    // in the shared registry cache used by measurement, canvas, and writer.
    const resolvedIdentity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "Regular");
    const resolvedBuffer = strategy === "system"
      ? null
      : getCachedFontBuffer(resolvedIdentity?.sha256)
        ?? (strategy === "portable" ? resolveRegistryFont(family, "Regular")?.buffer : null);
    if (resolvedBuffer) {
      await loadFontAuto(family, resolvedBuffer);
      continue;
    }
    if (strategy === "portable") {
      throw new PaperError(`Portable font "${family}" has no admitted registry buffer.`, {
        code: "FONT_NOT_FOUND",
        phase: "font",
      });
    }

    // Prefer document-embedded fonts over system fonts: the bundle author
    // shipped these specifically so the engine measures the same glyphs
    // PowerPoint / soffice will render.
    const embRegular = pickEmbeddedFont(embedded, family, false, false);
    if (embRegular) {
      const buf = await decodeEmbeddedFontSrc(embRegular.src);
      if (buf) {
        try {
          await loadFontAuto(family, buf);
          continue;
        } catch (e) {
          getLogger().warn(`[autoFont] Failed to load embedded font "${family}": ${(e as Error).message}`);
        }
      }
    }

    // Try system font path
    const resolved = strategy === "system" ? resolveSystemFontPath(family) : null;
    if (resolved) {
      try {
        const buffer = await readFile(resolved.path);
        await loadFontAuto(family, buffer);

        // Detect substitution: if the actual file name doesn't start with
        // the requested family (case-insensitive), record it.
        const actualBase = resolved.actualFileName.replace(/\.ttf$/i, "").toLowerCase();
        if (!actualBase.startsWith(family.toLowerCase())) {
          recordFontSubstitution(family, actualBase);
        }
        continue;
      } catch (e) {
        getLogger().warn(`[autoFont] Failed to load system font "${family}" from ${resolved.path}: ${(e as Error).message}`);
      }
    }

    if (strategy === "system" || strategy === "user-embedded") {
      if (strict) {
        throw new PaperError(
          strategy === "system"
            ? `System font "${family}" is not installed.`
            : `User-embedded font "${family}" has no validated caller-supplied bytes.`,
          {
            code: "FONT_NOT_FOUND",
            phase: "font",
          },
        );
      }
      getLogger().warn(
        strategy === "system"
          ? `[autoFont] System font "${family}" is unavailable; measurement will use a char-count estimate.`
          : `[autoFont] User-embedded font "${family}" has no validated caller-supplied bytes; measurement will use a char-count estimate.`,
      );
    } else if (lite) {
      // Lite mode: no bundled NotoSans (requires harfbuzzjs package)
      // Fall back to system Arial/DejaVu Sans
      const fallbackResolved = resolveSystemFontPath("Arial") ?? resolveSystemFontPath("DejaVu Sans");
      if (fallbackResolved) {
        try {
          const buffer = await readFile(fallbackResolved.path);
          await loadFontAuto(family, buffer);
          recordFontSubstitution(family, fallbackResolved.actualFileName.replace(/\.ttf$/i, ""));
          getLogger().warn(`[autoFont] Font "${family}" not found — falling back to system font`);
          continue;
        } catch { /* fall through */ }
      }
      if (strict) {
        throw new PaperError(
          `Font "${family}" not loaded and no system fallback found. Call loadFont("${family}", buffer) before rendering, or set tokens.type.*.family to a font that's installed locally.`,
          { code: "FONT_NOT_FOUND", phase: "font" },
        );
      }
      getLogger().warn(`[autoFont] Font "${family}" unavailable. Measurement will use char-count estimate.`);
    } else {
      // Full mode: use the integrity-checked portable registry fallback.
      try {
        portableFallback ??= resolveRegistryFont("Arial", "Regular");
        if (!portableFallback) {
          throw new PaperError("Portable fallback font is missing from the registry.", {
            code: "FONT_NOT_FOUND",
            phase: "font",
          });
        }
        await loadFontWithHarfBuzz(family, portableFallback.buffer);
        recordFontSubstitution(family, portableFallback.family);
        getLogger().warn(`[autoFont] Font "${family}" not found — falling back to ${portableFallback.family}`);
      } catch (e) {
        if (strict) {
          throw new PaperError(
            `Font "${family}" not loaded and portable fallback failed: ${(e as Error).message}. Call loadFont("${family}", buffer) before rendering.`,
            { code: "FONT_NOT_FOUND", phase: "font" },
          );
        }
        getLogger().warn(`[autoFont] Font "${family}" unavailable and portable fallback failed: ${(e as Error).message}. Measurement will use char-count estimate.`);
      }
    }
  }

  // Load bold variants for families that use bold weight
  for (const family of boldFamilies) {
    const bKey = boldFontKey(family);
    if (getFontOrNull(bKey)) continue;

    const identity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "Bold");
    const registryBuffer = strategy === "system"
      ? null
      : getCachedFontBuffer(identity?.sha256)
        ?? (strategy === "portable" ? resolveRegistryFont(family, "Bold")?.buffer : null);
    if (registryBuffer) {
      await loadFontAuto(bKey, registryBuffer);
      continue;
    }
    if (strategy === "portable") continue;

    const embBold = pickEmbeddedFont(embedded, family, true, false);
    if (embBold) {
      const buf = await decodeEmbeddedFontSrc(embBold.src);
      if (buf) {
        try { await loadFontAuto(bKey, buf); continue; } catch { /* fall through */ }
      }
    }

    const boldPath = strategy === "system" ? resolveSystemBoldFontPath(family) : null;
    if (boldPath) {
      try {
        const buffer = await readFile(boldPath);
        await loadFontAuto(bKey, buffer);
      } catch (e) {
        getLogger().warn(`[autoFont] Bold variant for "${family}" failed to load from ${boldPath}: ${(e as Error).message}. Will apply width factor.`);
      }
    }
  }

  // Load italic variants for families that use italic style
  for (const family of italicFamilies) {
    const iKey = italicFontKey(family);
    if (getFontOrNull(iKey)) continue;

    const identity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "Italic");
    const registryBuffer = strategy === "system"
      ? null
      : getCachedFontBuffer(identity?.sha256)
        ?? (strategy === "portable" ? resolveRegistryFont(family, "Italic")?.buffer : null);
    if (registryBuffer) {
      await loadFontAuto(iKey, registryBuffer);
      continue;
    }
    if (strategy === "portable") continue;

    const embItalic = pickEmbeddedFont(embedded, family, false, true);
    if (embItalic) {
      const buf = await decodeEmbeddedFontSrc(embItalic.src);
      if (buf) {
        try { await loadFontAuto(iKey, buf); continue; } catch { /* fall through */ }
      }
    }

    const italicPath = strategy === "system" ? resolveSystemItalicFontPath(family) : null;
    if (italicPath) {
      try {
        const buffer = await readFile(italicPath);
        await loadFontAuto(iKey, buffer);
      } catch (e) {
        getLogger().warn(`[autoFont] Italic variant for "${family}" failed to load from ${italicPath}: ${(e as Error).message}. Will use regular font.`);
      }
    }
  }

  // Load bold-italic variants for families that use both bold and italic
  for (const family of boldItalicFamilies) {
    const biKey = boldItalicFontKey(family);
    if (!getFontOrNull(biKey)) {
      const identity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "BoldItalic");
      const registryBuffer = strategy === "system"
        ? null
        : getCachedFontBuffer(identity?.sha256)
          ?? (strategy === "portable" ? resolveRegistryFont(family, "BoldItalic")?.buffer : null);
      if (registryBuffer) {
        await loadFontAuto(biKey, registryBuffer);
        continue;
      }
      if (strategy === "portable") continue;
      const embBI = pickEmbeddedFont(embedded, family, true, true);
      if (embBI) {
        const buf = await decodeEmbeddedFontSrc(embBI.src);
        if (buf) {
          try { await loadFontAuto(biKey, buf); } catch { /* fall through */ }
        }
      }
      if (!getFontOrNull(biKey)) {
        const biPath = strategy === "system" ? resolveSystemBoldItalicFontPath(family) : null;
        if (biPath) {
          try {
            const buffer = await readFile(biPath);
            await loadFontAuto(biKey, buffer);
          } catch (e) {
            getLogger().warn(`[autoFont] Bold-italic variant for "${family}" failed to load from ${biPath}: ${(e as Error).message}. Will fall back to bold or italic variant.`);
          }
        }
      }
    }

    // Also ensure bold and italic variants are loaded as fallbacks
    const bKey = boldFontKey(family);
    if (!getFontOrNull(bKey)) {
      const embBold = pickEmbeddedFont(embedded, family, true, false);
      if (embBold) {
        const buf = await decodeEmbeddedFontSrc(embBold.src);
        if (buf) { try { await loadFontAuto(bKey, buf); } catch { /* swallow */ } }
      }
      if (!getFontOrNull(bKey)) {
        const boldPath = resolveSystemBoldFontPath(family);
        if (boldPath) {
          try {
            const buffer = await readFile(boldPath);
            await loadFontAuto(bKey, buffer);
          } catch { /* already warned */ }
        }
      }
    }
    const iKey = italicFontKey(family);
    if (!getFontOrNull(iKey)) {
      const embItalic = pickEmbeddedFont(embedded, family, false, true);
      if (embItalic) {
        const buf = await decodeEmbeddedFontSrc(embItalic.src);
        if (buf) { try { await loadFontAuto(iKey, buf); } catch { /* swallow */ } }
      }
      if (!getFontOrNull(iKey)) {
        const italicPath = resolveSystemItalicFontPath(family);
        if (italicPath) {
          try {
            const buffer = await readFile(italicPath);
            await loadFontAuto(iKey, buffer);
          } catch { /* already warned */ }
        }
      }
    }
  }
}
