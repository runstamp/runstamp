import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PaperError } from "../errors.js";
import * as fontkit from "fontkit";

export type FontFace = "Regular" | "Bold" | "Italic" | "BoldItalic";

export type FontDiagnosticCode =
  | "FONT_SYSTEM_OPT_IN"
  | "FONT_EMBEDDING_UNAVAILABLE"
  | "FONT_REQUESTED_FAMILY_NOT_EMBEDDED"
  | "FONT_MISSING_FACE_VARIANT"
  | "FONT_COVERAGE_FALLBACK_USED";

export interface FontDiagnostic {
  code: FontDiagnosticCode;
  message: string;
}

export interface ResolvedFontIdentity {
  requestedFamily: string;
  family: string;
  face: FontFace;
  source: "registry" | "user" | "system";
  path?: string;
  sha256?: string;
  byteLength?: number;
  fsType?: number;
  coverage?: Record<string, number>;
  diagnostics?: FontDiagnostic[];
  pixelGateEligible: boolean;
}

export interface ResolvedFontAsset extends ResolvedFontIdentity {
  source: "registry" | "user";
  path: string;
  sha256: string;
  byteLength: number;
  fsType: number;
  buffer: Buffer;
}

interface ManifestAsset {
  id: string;
  path: string;
  face: FontFace;
  roles: { requestedFamilies: string[] };
  byteLength: number;
  sha256: string;
  names: { family: string };
  embedding: {
    fsType: number;
    restrictedEmbedding: boolean;
    previewAndPrintOnly: boolean;
    bitmapOnly: boolean;
  };
  coverage: { scripts: Record<string, number> };
}

interface FontManifest {
  schemaVersion: number;
  assets: ManifestAsset[];
}

let cachedManifest: FontManifest | null = null;
let cachedFontDir: string | null | undefined;
const bufferCache = new Map<string, Buffer>();
const parsedFontCache = new Map<string, fontkit.Font>();

function resolveBundledFontDir(): string | null {
  if (cachedFontDir !== undefined) return cachedFontDir;
  const candidates: string[] = [];
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(
      join(thisDir, "assets", "fonts"),
      join(thisDir, "..", "assets", "fonts"),
      join(thisDir, "..", "..", "assets", "fonts"),
    );
  } catch {
    // Non-file module URL: continue with cwd-relative candidates.
  }

  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    candidates.push(
      join(current, "packages", "core", "assets", "fonts"),
      join(current, "packages", "core", "dist", "assets", "fonts"),
      join(current, "packages", "core", "dist-pro", "assets", "fonts"),
      join(current, "assets", "fonts"),
    );
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  cachedFontDir = candidates.find((candidate) => existsSync(join(candidate, "manifest.json"))) ?? null;
  return cachedFontDir;
}

function getManifest(): FontManifest {
  if (cachedManifest) return cachedManifest;
  const fontDir = resolveBundledFontDir();
  if (!fontDir) {
    throw new PaperError("Bundled font registry manifest.json was not found.", {
      code: "FONT_NOT_FOUND",
      phase: "font",
    });
  }
  const parsed = JSON.parse(readFileSync(join(fontDir, "manifest.json"), "utf8")) as FontManifest;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.assets)) {
    throw new PaperError("Bundled font registry has an unsupported schema.", {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }
  cachedManifest = parsed;
  return parsed;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function faceForStyle(bold = false, italic = false): FontFace {
  if (bold && italic) return "BoldItalic";
  if (bold) return "Bold";
  if (italic) return "Italic";
  return "Regular";
}

export function resolveRegistryFont(
  requestedFamily: string,
  face: FontFace,
): ResolvedFontAsset | null {
  const requested = normalized(requestedFamily);
  const manifestAsset = getManifest().assets.find((asset) =>
    asset.face === face && (
      normalized(asset.names.family) === requested ||
      asset.roles.requestedFamilies.some((family) => normalized(family) === requested)
    ));
  if (!manifestAsset) return null;

  const fontDir = resolveBundledFontDir();
  if (!fontDir) return null;
  const absolutePath = resolve(fontDir, manifestAsset.path);
  const allowedPrefix = fontDir.endsWith(sep) ? fontDir : `${fontDir}${sep}`;
  if (!absolutePath.startsWith(allowedPrefix)) {
    throw new PaperError(`Font registry path escapes its asset directory: ${manifestAsset.path}`, {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }

  let buffer = bufferCache.get(manifestAsset.sha256);
  if (!buffer) {
    buffer = readFileSync(absolutePath);
    const sha256 = sha256Buffer(buffer);
    if (buffer.length !== manifestAsset.byteLength || sha256 !== manifestAsset.sha256) {
      throw new PaperError(`Font registry asset failed integrity validation: ${manifestAsset.id}`, {
        code: "VALIDATION_FAILED",
        phase: "font",
      });
    }
    bufferCache.set(manifestAsset.sha256, buffer);
  }

  return {
    requestedFamily,
    family: manifestAsset.names.family,
    face,
    source: "registry",
    path: absolutePath,
    sha256: manifestAsset.sha256,
    byteLength: manifestAsset.byteLength,
    fsType: manifestAsset.embedding.fsType,
    coverage: { ...manifestAsset.coverage.scripts },
    pixelGateEligible: true,
    buffer,
  };
}

export function resolvePortableFamily(requestedFamily: string): string | null {
  return resolveRegistryFont(requestedFamily, "Regular")?.family ?? null;
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function getCachedFontBuffer(sha256: string | undefined): Buffer | null {
  return sha256 ? bufferCache.get(sha256) ?? null : null;
}

export function cacheExternalFontBuffer(sha256: string, buffer: Buffer): void {
  if (!bufferCache.has(sha256)) bufferCache.set(sha256, buffer);
}

export function firstMissingCodePoint(sha256: string | undefined, text: string): number | undefined {
  if (!sha256) return undefined;
  const buffer = bufferCache.get(sha256);
  if (!buffer) return undefined;
  let font = parsedFontCache.get(sha256);
  if (!font) {
    font = fontkit.create(buffer) as fontkit.Font;
    parsedFontCache.set(sha256, font);
  }
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || codePoint <= 0x20) continue;
    const glyph = font.glyphForCodePoint(codePoint);
    if (!glyph || glyph.id === 0) return codePoint;
  }
  return undefined;
}

/** Read OS/2.fsType directly from a single-face sfnt font and reject malformed input. */
export function inspectEmbeddableFont(buffer: Buffer): { sha256: string; fsType: number; familyName: string } {
  if (buffer.length < 12) {
    throw new PaperError("Font payload is too small to contain an sfnt header.", {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }
  const signature = buffer.toString("ascii", 0, 4);
  const scalar = buffer.readUInt32BE(0);
  if (scalar !== 0x00010000 && signature !== "OTTO" && signature !== "true") {
    throw new PaperError("Font payload is not a supported single-face TrueType/OpenType font.", {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }
  const tableCount = buffer.readUInt16BE(4);
  if (12 + tableCount * 16 > buffer.length) {
    throw new PaperError("Font table directory is truncated.", {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }

  let os2Offset = -1;
  let os2Length = 0;
  for (let index = 0; index < tableCount; index += 1) {
    const entry = 12 + index * 16;
    if (buffer.toString("ascii", entry, entry + 4) === "OS/2") {
      os2Offset = buffer.readUInt32BE(entry + 8);
      os2Length = buffer.readUInt32BE(entry + 12);
      break;
    }
  }
  if (os2Offset < 0 || os2Length < 10 || os2Offset + os2Length > buffer.length) {
    throw new PaperError("Font payload has no valid OS/2 table.", {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }
  const fsType = buffer.readUInt16BE(os2Offset + 8);
  if ((fsType & 0x0002) !== 0 || (fsType & 0x0004) !== 0 || (fsType & 0x0200) !== 0) {
    throw new PaperError(`Font embedding is prohibited by OS/2.fsType=0x${fsType.toString(16)}.`, {
      code: "VALIDATION_FAILED",
      phase: "font",
    });
  }
  const parsedFont = fontkit.create(buffer) as fontkit.Font;
  return { sha256: sha256Buffer(buffer), fsType, familyName: parsedFont.familyName };
}

export function __resetFontRegistryForTests(): void {
  cachedManifest = null;
  cachedFontDir = undefined;
  bufferCache.clear();
  parsedFontCache.clear();
}
