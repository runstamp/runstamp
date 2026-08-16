import * as fontkitModule from "fontkit";
import { deflate } from "pako";
import subsetFont from "subset-font";
import { buildFontSourceKey, loadFontSourceBuffer, sanitizePostScriptName, sha1Buffer } from "./font-source.js";
import type { PdfAssetPolicy } from "./phase9-types.js";
import { PDFArray, PDFDictionary, PDFName, PDFNumber, PDFRef, PDFStream, PDFString, type PDFValue } from "./pdf-objects.js";
import { shapeTextWithHarfBuzz } from "./harfbuzz.js";
import type { HbGlyph } from "./vendor-types.js";

interface FontkitGlyph {
  advanceWidth: number;
  id?: number;
}

interface FontkitBBox {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}

interface FontkitOs2 {
  usWeightClass?: number;
}

interface FontkitFont {
  "OS/2"?: FontkitOs2;
  ascent: number;
  bbox?: FontkitBBox;
  capHeight?: number;
  descent: number;
  directory?: {
    tables?: Record<string, unknown>;
  };
  glyphForCodePoint?(codePoint: number): FontkitGlyph | null;
  getGlyph(glyphId: number): FontkitGlyph;
  isMonospace?: boolean;
  italicAngle?: number;
  postscriptName?: string;
  type: string;
  unitsPerEm: number;
}

interface FontkitCollection {
  fonts: FontkitFont[];
}

interface PositionedHbGlyph extends HbGlyph {
  cid: number;
  x: number;
  y: number;
}

const UNSUPPORTED_COLOR_FONT_TABLES = new Set(["CBDT", "CBLC", "sbix", "COLR", "CPAL", "SVG "]);
type SubsetFont = (
  source: Buffer,
  text: string,
  options: { targetFormat: "sfnt" },
) => Promise<Uint8Array>;
const runSubsetFont = subsetFont as SubsetFont;
const fontkit = fontkitModule as unknown as {
  create(buffer: Buffer, postscriptName?: string): FontkitFont | FontkitCollection;
};

export interface PdfEmbeddedFontInput {
  family: string;
  postscriptName?: string;
  source: Buffer | Uint8Array | string;
}

export type PdfBuiltInFont = "Helvetica" | "Helvetica-Bold";
export type PdfFontInput = PdfBuiltInFont | PdfEmbeddedFontInput;

export interface PreparedEmbeddedFont {
  alias: string;
  family: string;
  font: FontkitFont;
  glyphCidByKey: Map<string, number>;
  cidToGid: Map<number, number>;
  fontKey: string;
  glyphToUnicode: Map<number, string>;
  glyphWidths: Map<number, number>;
  nextCid: number;
  postscriptName: string;
  sourceHash: string;
  sourceKey: string;
  subsetBuffer: Buffer;
  subsetName: string;
  unitsPerEm: number;
  /**
   * Per-document HarfBuzz shape-result cache. Keyed on
   * `${text}\0${direction}` — fontSize is irrelevant to HB (positioning
   * is computed in `shapeEmbeddedText` from the cached HB output, not
   * re-shaped). Reused across measurement-and-positioning calls within
   * the same render, which can call `shapeEmbeddedText` for identical
   * runs multiple times in a row (M7).
   */
  hbShapeCache: Map<string, HbGlyph[]>;
}

export function preparedFontSupportsText(prepared: PreparedEmbeddedFont, text: string): boolean {
  return fontSupportsText(prepared.font, text);
}

function fontSupportsText(font: FontkitFont, text: string): boolean {
  for (const character of text) {
    if (/\s/u.test(character)) {
      continue;
    }
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    const glyph = font.glyphForCodePoint?.(codePoint);
    if (!glyph || glyph.id === 0) {
      return false;
    }
  }
  return true;
}

function filterTextForSupportedGlyphs(font: FontkitFont, text: string): string {
  let supported = "";
  for (const character of text) {
    if (/\s/u.test(character)) {
      supported += character;
      continue;
    }
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    const glyph = font.glyphForCodePoint?.(codePoint);
    if (glyph && glyph.id !== 0) {
      supported += character;
    }
  }
  return supported;
}

function findUnsupportedColorFontTables(font: FontkitFont): string[] {
  return Object.keys(font.directory?.tables ?? {})
    .filter((table) => UNSUPPORTED_COLOR_FONT_TABLES.has(table))
    .sort();
}

function assertSupportedEmbeddedFont(fontFamily: string, font: FontkitFont): void {
  const unsupportedTables = findUnsupportedColorFontTables(font);
  if (unsupportedTables.length === 0) {
    return;
  }

  throw new Error(
    `Color emoji/color glyph fonts are not supported for embedded PDF text yet; ${fontFamily} uses unsupported table(s): ${unsupportedTables.join(", ")}.`,
  );
}

export interface ShapedGlyphRun {
  content: string;
  direction: "ltr" | "rtl";
  glyphs: Array<{
    advanceWidth: number;
    dx: number;
    dy: number;
    gid: number;
    hex: string;
  }>;
  totalAdvancePoints: number;
  usesPerGlyphPositioning: boolean;
}

export interface PrepareEmbeddedFontOptions {
  assetPolicy?: PdfAssetPolicy;
  subset?: boolean;
}

function toUint8Array(input: Buffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function createSubsetPrefix(sourceHash: string): string {
  return sourceHash
    .slice(0, 6)
    .split("")
    .map((char) => String.fromCharCode(65 + (parseInt(char, 16) % 26)))
    .join("");
}

function glyphHex(gid: number): string {
  return gid.toString(16).toUpperCase().padStart(4, "0");
}

function allocateGlyphCid(
  prepared: PreparedEmbeddedFont,
  glyphId: number,
  unicodeText: string,
  advanceWidth: number,
): number {
  const key = `${glyphId}\u0000${unicodeText}`;
  const existing = prepared.glyphCidByKey.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const cid = prepared.nextCid;
  if (cid > 0xFFFF || glyphId > 0xFFFF) {
    throw new Error(`Embedded font "${prepared.family}" exceeded the PDF CIDToGIDMap 16-bit glyph limit`);
  }
  prepared.nextCid += 1;
  prepared.glyphCidByKey.set(key, cid);
  prepared.cidToGid.set(cid, glyphId);
  if (unicodeText.length > 0) {
    prepared.glyphToUnicode.set(cid, unicodeText);
  }
  prepared.glyphWidths.set(cid, scaleToPdfUnits(advanceWidth, prepared.unitsPerEm));
  return cid;
}

function normalizeGlyphId(gid: number | undefined): number {
  return Number.isInteger(gid) && (gid as number) >= 0 ? (gid as number) : 0;
}

function textToUtf16BeHex(value: string): string {
  const utf16le = Buffer.from(value, "utf16le");
  const utf16be = Buffer.allocUnsafe(utf16le.length);
  for (let index = 0; index < utf16le.length; index += 2) {
    utf16be[index] = utf16le[index + 1] as number;
    utf16be[index + 1] = utf16le[index] as number;
  }
  return utf16be.toString("hex").toUpperCase();
}

function scaleToPdfUnits(value: number, unitsPerEm: number): number {
  return Math.round((value * 1000) / unitsPerEm);
}

function resolveDirection(value: string, requested?: "auto" | "ltr" | "rtl"): "ltr" | "rtl" {
  if (requested && requested !== "auto") {
    return requested;
  }

  if (/[\u0590-\u08FF]/u.test(value)) {
    return "rtl";
  }

  return "ltr";
}

export function buildFontInputKey(font: PdfEmbeddedFontInput): string {
  return `${buildFontSourceKey(font.source, font.family)}::${font.postscriptName ?? ""}`;
}

function buildClusterSlices(text: string, glyphs: HbGlyph[], direction: "ltr" | "rtl"): string[] {
  if (glyphs.length === 0) {
    return [];
  }

  const clusters = [...new Set(glyphs.map((glyph) => glyph.cl))].sort((left, right) => left - right);
  const boundaries = [...clusters, text.length];
  const clusterText = new Map<number, string>();

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    clusterText.set(boundaries[index] as number, text.slice(boundaries[index] as number, boundaries[index + 1] as number));
  }

  const slices = new Array<string>(glyphs.length).fill("");
  for (const cluster of clusters) {
    const indices = glyphs
      .map((glyph, index) => ({ cluster: glyph.cl, index }))
      .filter((entry) => entry.cluster === cluster)
      .map((entry) => entry.index);
    const value = clusterText.get(cluster) ?? "";
    const codePoints = [...value];

    if (indices.length === 1) {
      slices[indices[0] as number] = direction === "rtl" && codePoints.length > 1
        ? codePoints.reverse().join("")
        : value;
      continue;
    }

    if (codePoints.length === indices.length) {
      codePoints.forEach((codePoint, index) => {
        const targetIndex = direction === "rtl" ? codePoints.length - index - 1 : index;
        slices[indices[index] as number] = codePoints[targetIndex] as string;
      });
      continue;
    }

    slices[indices[0] as number] = direction === "rtl" ? [...value].reverse().join("") : value;
  }

  return slices;
}

function buildTjOperator(glyphs: HbGlyph[], prepared: PreparedEmbeddedFont): string {
  const values: string[] = [];
  let currentRun = "";

  glyphs.forEach((glyph, index) => {
    const glyphId = normalizeGlyphId(glyph.g);
    const fontGlyph = prepared.font.getGlyph(glyphId);
    const defaultAdvanceWidth = fontGlyph?.advanceWidth ?? glyph.ax;
    currentRun += glyphHex(glyphId);

    if (index === glyphs.length - 1) {
      values.push(`<${currentRun}>`);
      return;
    }

    const adjustment = Math.round(-((glyph.ax - defaultAdvanceWidth) * 1000) / prepared.unitsPerEm);
    if (adjustment !== 0) {
      values.push(`<${currentRun}>`);
      currentRun = "";
      values.push(String(adjustment));
    }
  });

  return `[${values.join(" ")}]`;
}

function buildPerGlyphCommands(glyphs: PositionedHbGlyph[], direction: "ltr" | "rtl"): string {
  const orderedGlyphs = [...glyphs].sort((left, right) => left.cl - right.cl);
  const lines: string[] = [];

  for (const glyph of orderedGlyphs) {
    lines.push(
      direction === "rtl"
        ? `-1 0 0 1 ${formatPdfNumber(glyph.x)} ${formatPdfNumber(glyph.y)} Tm`
        : `1 0 0 1 ${formatPdfNumber(glyph.x)} ${formatPdfNumber(glyph.y)} Tm`,
    );
    lines.push(`<${glyphHex(glyph.cid)}> Tj`);
  }

  return lines.join("\n");
}

function readFontDescriptorFlags(font: FontkitFont): number {
  let flags = 32;
  if (font.isMonospace) {
    flags |= 1;
  }
  if ((font.italicAngle ?? 0) !== 0) {
    flags |= 64;
  }
  return flags;
}

function estimateStemV(font: FontkitFont): number {
  const weightClass = font["OS/2"]?.usWeightClass ?? 400;
  return Math.round(10 + 220 * ((weightClass / 1000) ** 1.8));
}

function buildWidthArray(widths: Map<number, number>): { defaultWidth: number; widthArray: PDFArray } {
  const sortedGlyphs = [...widths.entries()].sort((left, right) => left[0] - right[0]);
  const counts = new Map<number, number>();

  for (const [, width] of sortedGlyphs) {
    counts.set(width, (counts.get(width) ?? 0) + 1);
  }

  let defaultWidth = 1000;
  let maxCount = -1;
  for (const [width, count] of counts.entries()) {
    if (count > maxCount) {
      defaultWidth = width;
      maxCount = count;
    }
  }

  const values: PDFValue[] = [];
  for (let index = 0; index < sortedGlyphs.length;) {
    const [startGlyph] = sortedGlyphs[index] as [number, number];
    const runWidths: number[] = [];
    let cursor = index;
    while (
      cursor < sortedGlyphs.length &&
      sortedGlyphs[cursor]?.[0] === startGlyph + (cursor - index)
    ) {
      runWidths.push(sortedGlyphs[cursor]?.[1] as number);
      cursor += 1;
    }

    const allSame = runWidths.every((width) => width === runWidths[0]);
    if (allSame && runWidths[0] !== defaultWidth && runWidths.length >= 3) {
      values.push(new PDFNumber(startGlyph));
      values.push(new PDFNumber(startGlyph + runWidths.length - 1));
      values.push(new PDFNumber(runWidths[0] as number));
    } else {
      values.push(new PDFNumber(startGlyph));
      values.push(new PDFArray(runWidths.map((width) => new PDFNumber(width))));
    }

    index = cursor;
  }

  return {
    defaultWidth,
    widthArray: new PDFArray(values),
  };
}

function buildToUnicodeCMap(mappings: Map<number, string>): Buffer {
  const ordered = [...mappings.entries()]
    .filter(([, text]) => text.length > 0)
    .sort((left, right) => left[0] - right[0]);

  const rangeEntries: Array<{ end: number; start: number; unicodeStartHex: string }> = [];
  const charEntries: Array<{ source: number; targetHex: string }> = [];

  for (let index = 0; index < ordered.length;) {
    const [startSource, startText] = ordered[index] as [number, string];
    const codePoints = [...startText];
    if (codePoints.length === 1) {
      let cursor = index + 1;
      let lastSource = startSource;
      let lastCodePoint = codePoints[0]!.codePointAt(0) as number;
      while (cursor < ordered.length) {
        const [candidateSource, candidateText] = ordered[cursor] as [number, string];
        const candidateCodePoints = [...candidateText];
        if (
          candidateCodePoints.length !== 1 ||
          candidateSource !== lastSource + 1 ||
          (candidateCodePoints[0]!.codePointAt(0) as number) !== lastCodePoint + 1
        ) {
          break;
        }
        lastSource = candidateSource;
        lastCodePoint = candidateCodePoints[0]!.codePointAt(0) as number;
        cursor += 1;
      }

      if (cursor - index >= 2) {
        rangeEntries.push({
          start: startSource,
          end: lastSource,
          unicodeStartHex: textToUtf16BeHex(codePoints[0] as string),
        });
        index = cursor;
        continue;
      }
    }

    charEntries.push({
      source: startSource,
      targetHex: textToUtf16BeHex(startText),
    });
    index += 1;
  }

  const lines = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
  ];

  for (let index = 0; index < rangeEntries.length; index += 100) {
    const chunk = rangeEntries.slice(index, index + 100);
    lines.push(`${chunk.length} beginbfrange`);
    chunk.forEach((entry) => {
      lines.push(`<${glyphHex(entry.start)}> <${glyphHex(entry.end)}> <${entry.unicodeStartHex}>`);
    });
    lines.push("endbfrange");
  }

  for (let index = 0; index < charEntries.length; index += 100) {
    const chunk = charEntries.slice(index, index + 100);
    lines.push(`${chunk.length} beginbfchar`);
    chunk.forEach((entry) => {
      lines.push(`<${glyphHex(entry.source)}> <${entry.targetHex}>`);
    });
    lines.push("endbfchar");
  }

  lines.push(
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  );

  return Buffer.from(lines.join("\n"), "ascii");
}

function buildCidToGidMap(mapping: Map<number, number>): Buffer {
  const maxCid = Math.max(0, ...mapping.keys());
  const buffer = Buffer.alloc((maxCid + 1) * 2);
  for (const [cid, gid] of mapping.entries()) {
    buffer.writeUInt16BE(gid, cid * 2);
  }
  return buffer;
}

// PDF/A-1 (ISO 19005-1:2005 §6.3.5) requires the CIDFont descriptor to carry a
// `/CIDSet` stream identifying which CIDs are present in the embedded subset.
// Bit i within each byte (MSB-first) indicates the presence of CID i; CID 0
// (.notdef) is always present since the subset always retains glyph 0.
function buildCidSet(mapping: Map<number, number>): Buffer {
  const maxCid = Math.max(0, ...mapping.keys());
  const byteCount = (maxCid >> 3) + 1;
  const buffer = Buffer.alloc(byteCount);
  buffer[0] |= 0x80; // CID 0 (.notdef) is always present in the subset
  for (const cid of mapping.keys()) {
    const byteIndex = cid >> 3;
    const bitIndex = 7 - (cid & 7);
    buffer[byteIndex] |= (1 << bitIndex);
  }
  return buffer;
}

async function loadFontBuffer(font: PdfEmbeddedFontInput, assetPolicy?: PdfAssetPolicy): Promise<Buffer> {
  return loadFontSourceBuffer(font.source, undefined, { assetPolicy, family: font.family });
}

function describeFontEmbeddingError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildSubsetFailureMessage(family: string, error: unknown): string {
  return [
    `Unable to subset embedded font "${family}": ${describeFontEmbeddingError(error)}.`,
    "Use subset: false only where the caller exposes that option and the output profile allows full-font embedding; PDF/A preparation already disables subsetting where required.",
  ].join(" ");
}

function buildSourceKey(font: PdfEmbeddedFontInput, sourceBuffer: Buffer): string {
  const normalizedInput = typeof font.source === "string" ? font : { ...font, source: sourceBuffer };
  return buildFontInputKey(normalizedInput);
}

export async function prepareEmbeddedFonts(
  fonts: Array<{
    alias: string;
    font: PdfEmbeddedFontInput;
    samples: string[];
  }>,
  options: PrepareEmbeddedFontOptions = {},
): Promise<Map<string, PreparedEmbeddedFont>> {
  const prepared = new Map<string, PreparedEmbeddedFont>();
  const shouldSubset = options.subset ?? true;

  for (const entry of fonts) {
    const sourceBuffer = await loadFontBuffer(entry.font, options.assetPolicy);
    const sourceKey = buildSourceKey(entry.font, sourceBuffer);
    if (prepared.has(sourceKey)) {
      continue;
    }

    const originalParsed = fontkit.create(sourceBuffer, entry.font.postscriptName);
    if ("fonts" in originalParsed) {
      throw new Error(`Phase 2 only supports single-face SFNT inputs for ${entry.font.family}`);
    }
    assertSupportedEmbeddedFont(entry.font.family, originalParsed);
    const supportedSamples = entry.samples
      .map((sample) => fontSupportsText(originalParsed, sample) ? sample : filterTextForSupportedGlyphs(originalParsed, sample))
      .filter((sample) => sample.length > 0);
    const samples = (supportedSamples.length > 0 ? supportedSamples : [" "]).join("\n");
    let subsetBuffer: Buffer;
    if (shouldSubset) {
      try {
        subsetBuffer = Buffer.from(await runSubsetFont(sourceBuffer, samples, { targetFormat: "sfnt" }));
      } catch (error) {
        throw new Error(buildSubsetFailureMessage(entry.font.family, error));
      }
    } else {
      subsetBuffer = sourceBuffer;
    }
    const parsed = fontkit.create(subsetBuffer);
    if ("fonts" in parsed) {
      throw new Error(`Phase 2 only supports single-face SFNT inputs for ${entry.font.family}`);
    }
    const sourceHash = sha1Buffer(sourceBuffer);
    const fontDataHash = sha1Buffer(subsetBuffer);
    const postscriptName = entry.font.postscriptName ?? parsed.postscriptName ?? sanitizePostScriptName(entry.font.family);
    const subsetName = `${createSubsetPrefix(sourceHash)}+${sanitizePostScriptName(postscriptName)}`;

    prepared.set(sourceKey, {
      alias: entry.alias,
      family: entry.font.family,
      font: parsed,
      cidToGid: new Map<number, number>(),
      glyphCidByKey: new Map<string, number>(),
      fontKey: `pdf-font-${fontDataHash}`,
      glyphToUnicode: new Map<number, string>(),
      glyphWidths: new Map<number, number>(),
      hbShapeCache: new Map<string, HbGlyph[]>(),
      nextCid: 1,
      postscriptName,
      sourceHash,
      sourceKey,
      subsetBuffer,
      subsetName,
      unitsPerEm: parsed.unitsPerEm,
    });
  }

  return prepared;
}

export async function shapeEmbeddedText(
  prepared: PreparedEmbeddedFont,
  text: string,
  fontSize: number,
  x: number,
  y: number,
  direction?: "auto" | "ltr" | "rtl",
  wordSpacing = 0,
): Promise<ShapedGlyphRun> {
  const resolvedDirection = resolveDirection(text, direction);
  // Per-document HarfBuzz cache (M7). The HB output depends only on
  // (font subset, text, direction); fontSize/x/y/wordSpacing affect
  // positioning, not shaping. The renderer routinely calls this twice
  // per run (once at origin to measure totalAdvancePoints, once at the
  // real x to position) — the second call is a guaranteed cache hit.
  const cacheKey = `${text}\0${resolvedDirection}`;
  let hbGlyphs = prepared.hbShapeCache.get(cacheKey);
  if (!hbGlyphs) {
    hbGlyphs = await shapeTextWithHarfBuzz(prepared.fontKey, toUint8Array(prepared.subsetBuffer), text, resolvedDirection);
    prepared.hbShapeCache.set(cacheKey, hbGlyphs);
  }
  const clusterSlices = buildClusterSlices(text, hbGlyphs, resolvedDirection);
  const glyphs = hbGlyphs.map((glyph, index) => {
    const glyphId = normalizeGlyphId(glyph.g);
    const unicodeText = clusterSlices[index] ?? "";
    const fontGlyph = prepared.font.getGlyph(glyphId);
    const advanceWidth = fontGlyph?.advanceWidth ?? glyph.ax;
    const cid = allocateGlyphCid(prepared, glyphId, unicodeText, advanceWidth);
    return {
      advanceWidth: glyph.ax,
      dx: glyph.dx,
      dy: glyph.dy,
      gid: glyphId,
      hex: glyphHex(cid),
    };
  });

  const totalAdvancePoints = hbGlyphs.reduce((sum, glyph) => sum + glyph.ax, 0) * (fontSize / prepared.unitsPerEm);
  const scale = fontSize / prepared.unitsPerEm;
  let cursor = resolvedDirection === "rtl" ? x + totalAdvancePoints : x;
  const positionedGlyphs = hbGlyphs.map((glyph, index) => {
    const clusterText = clusterSlices[index] ?? "";
    const glyphId = normalizeGlyphId(glyph.g);
    const fontGlyph = prepared.font.getGlyph(glyphId);
    const cid = allocateGlyphCid(prepared, glyphId, clusterText, fontGlyph?.advanceWidth ?? glyph.ax);
    const positioned = {
      ...glyph,
      cid,
      x: cursor + (glyph.dx * scale),
      y: y + (glyph.dy * scale),
    };
    cursor += (resolvedDirection === "rtl" ? -1 : 1) * glyph.ax * scale;
    if (wordSpacing !== 0 && /\s/u.test(clusterText)) {
      cursor += (resolvedDirection === "rtl" ? -1 : 1) * wordSpacing;
    }
    return positioned;
  });
  const usesPerGlyphPositioning = true;
  const content = buildPerGlyphCommands(positionedGlyphs, resolvedDirection);

  return {
    content,
    direction: resolvedDirection,
    glyphs,
    totalAdvancePoints,
    usesPerGlyphPositioning,
  };
}

export function buildEmbeddedFontObjects(
  prepared: PreparedEmbeddedFont,
  refs: {
    cidSet: PDFRef;
    cidToGidMap: PDFRef;
    cidFont: PDFRef;
    descriptor: PDFRef;
    fontFile: PDFRef;
    toUnicode: PDFRef;
    type0: PDFRef;
  },
): Array<{ ref: PDFRef; value: PDFValue }> {
  const compressedFontFile = Buffer.from(deflate(prepared.subsetBuffer));
  const compressedCidToGidMap = Buffer.from(deflate(buildCidToGidMap(prepared.cidToGid)));
  const compressedCidSet = Buffer.from(deflate(buildCidSet(prepared.cidToGid)));
  const compressedToUnicode = Buffer.from(deflate(buildToUnicodeCMap(prepared.glyphToUnicode)));
  const { defaultWidth, widthArray } = buildWidthArray(prepared.glyphWidths);
  const bbox = prepared.font.bbox ?? { minX: 0, minY: 0, maxX: prepared.unitsPerEm, maxY: prepared.unitsPerEm };

  return [
    {
      ref: refs.type0,
      value: new PDFDictionary({
        BaseFont: new PDFName(prepared.subsetName),
        DescendantFonts: new PDFArray([refs.cidFont]),
        Encoding: new PDFName("Identity-H"),
        Subtype: new PDFName("Type0"),
        ToUnicode: refs.toUnicode,
        Type: new PDFName("Font"),
      }),
    },
    {
      ref: refs.cidFont,
      value: new PDFDictionary({
        BaseFont: new PDFName(prepared.subsetName),
        CIDSystemInfo: new PDFDictionary({
          Ordering: new PDFString("Identity"),
          Registry: new PDFString("Adobe"),
          Supplement: new PDFNumber(0),
        }),
        CIDToGIDMap: refs.cidToGidMap,
        DW: new PDFNumber(defaultWidth),
        FontDescriptor: refs.descriptor,
        Subtype: new PDFName("CIDFontType2"),
        Type: new PDFName("Font"),
        W: widthArray,
      }),
    },
    {
      ref: refs.descriptor,
      value: new PDFDictionary({
        Ascent: new PDFNumber(scaleToPdfUnits(prepared.font.ascent, prepared.unitsPerEm)),
        CapHeight: new PDFNumber(scaleToPdfUnits(prepared.font.capHeight ?? prepared.font.ascent, prepared.unitsPerEm)),
        CIDSet: refs.cidSet,
        Descent: new PDFNumber(scaleToPdfUnits(prepared.font.descent, prepared.unitsPerEm)),
        Flags: new PDFNumber(readFontDescriptorFlags(prepared.font)),
        FontBBox: new PDFArray([
          new PDFNumber(scaleToPdfUnits(bbox.minX, prepared.unitsPerEm)),
          new PDFNumber(scaleToPdfUnits(bbox.minY, prepared.unitsPerEm)),
          new PDFNumber(scaleToPdfUnits(bbox.maxX, prepared.unitsPerEm)),
          new PDFNumber(scaleToPdfUnits(bbox.maxY, prepared.unitsPerEm)),
        ]),
        FontFile2: refs.fontFile,
        FontName: new PDFName(prepared.subsetName),
        ItalicAngle: new PDFNumber(prepared.font.italicAngle ?? 0),
        StemV: new PDFNumber(estimateStemV(prepared.font)),
        Type: new PDFName("FontDescriptor"),
      }),
    },
    {
      ref: refs.fontFile,
      value: new PDFStream(
        {
          Filter: new PDFName("FlateDecode"),
          Length1: new PDFNumber(prepared.subsetBuffer.length),
        },
        compressedFontFile,
      ),
    },
    {
      ref: refs.cidToGidMap,
      value: new PDFStream(
        {
          Filter: new PDFName("FlateDecode"),
        },
        compressedCidToGidMap,
      ),
    },
    {
      ref: refs.cidSet,
      value: new PDFStream(
        {
          Filter: new PDFName("FlateDecode"),
        },
        compressedCidSet,
      ),
    },
    {
      ref: refs.toUnicode,
      value: new PDFStream(
        {
          Filter: new PDFName("FlateDecode"),
        },
        compressedToUnicode,
      ),
    },
  ];
}

export function formatPdfNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`PDF text operators require finite numbers, received ${value}`);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}
