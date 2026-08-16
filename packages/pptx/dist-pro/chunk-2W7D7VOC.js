import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  $d636bc798e7178db$export$185802fd694ee1f5
} from "./chunk-P5JGOT4P.js";
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/typography/fontRegistry.ts
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
var cachedManifest = null;
var cachedFontDir;
var bufferCache = /* @__PURE__ */ new Map();
var parsedFontCache = /* @__PURE__ */ new Map();
function resolveBundledFontDir() {
  if (cachedFontDir !== void 0) return cachedFontDir;
  const candidates = [];
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(
      join(thisDir, "assets", "fonts"),
      join(thisDir, "..", "assets", "fonts"),
      join(thisDir, "..", "..", "assets", "fonts")
    );
  } catch {
  }
  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    candidates.push(
      join(current, "packages", "core", "assets", "fonts"),
      join(current, "packages", "core", "dist", "assets", "fonts"),
      join(current, "packages", "core", "dist-pro", "assets", "fonts"),
      join(current, "assets", "fonts")
    );
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  cachedFontDir = candidates.find((candidate) => existsSync(join(candidate, "manifest.json"))) ?? null;
  return cachedFontDir;
}
function getManifest() {
  if (cachedManifest) return cachedManifest;
  const fontDir = resolveBundledFontDir();
  if (!fontDir) {
    throw new PaperError("Bundled font registry manifest.json was not found.", {
      code: "FONT_NOT_FOUND",
      phase: "font"
    });
  }
  const parsed = JSON.parse(readFileSync(join(fontDir, "manifest.json"), "utf8"));
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.assets)) {
    throw new PaperError("Bundled font registry has an unsupported schema.", {
      code: "VALIDATION_FAILED",
      phase: "font"
    });
  }
  cachedManifest = parsed;
  return parsed;
}
function normalized(value) {
  return value.trim().toLocaleLowerCase("en-US");
}
function faceForStyle(bold = false, italic = false) {
  if (bold && italic) return "BoldItalic";
  if (bold) return "Bold";
  if (italic) return "Italic";
  return "Regular";
}
function resolveRegistryFont(requestedFamily, face) {
  const requested = normalized(requestedFamily);
  const manifestAsset = getManifest().assets.find((asset) => asset.face === face && (normalized(asset.names.family) === requested || asset.roles.requestedFamilies.some((family) => normalized(family) === requested)));
  if (!manifestAsset) return null;
  const fontDir = resolveBundledFontDir();
  if (!fontDir) return null;
  const absolutePath = resolve(fontDir, manifestAsset.path);
  const allowedPrefix = fontDir.endsWith(sep) ? fontDir : `${fontDir}${sep}`;
  if (!absolutePath.startsWith(allowedPrefix)) {
    throw new PaperError(`Font registry path escapes its asset directory: ${manifestAsset.path}`, {
      code: "VALIDATION_FAILED",
      phase: "font"
    });
  }
  let buffer = bufferCache.get(manifestAsset.sha256);
  if (!buffer) {
    buffer = readFileSync(absolutePath);
    const sha256 = sha256Buffer(buffer);
    if (buffer.length !== manifestAsset.byteLength || sha256 !== manifestAsset.sha256) {
      throw new PaperError(`Font registry asset failed integrity validation: ${manifestAsset.id}`, {
        code: "VALIDATION_FAILED",
        phase: "font"
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
    buffer
  };
}
function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
function getCachedFontBuffer(sha256) {
  return sha256 ? bufferCache.get(sha256) ?? null : null;
}
function cacheExternalFontBuffer(sha256, buffer) {
  if (!bufferCache.has(sha256)) bufferCache.set(sha256, buffer);
}
function firstMissingCodePoint(sha256, text) {
  if (!sha256) return void 0;
  const buffer = bufferCache.get(sha256);
  if (!buffer) return void 0;
  let font = parsedFontCache.get(sha256);
  if (!font) {
    font = $d636bc798e7178db$export$185802fd694ee1f5(buffer);
    parsedFontCache.set(sha256, font);
  }
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === void 0 || codePoint <= 32) continue;
    const glyph = font.glyphForCodePoint(codePoint);
    if (!glyph || glyph.id === 0) return codePoint;
  }
  return void 0;
}
function inspectEmbeddableFont(buffer) {
  if (buffer.length < 12) {
    throw new PaperError("Font payload is too small to contain an sfnt header.", {
      code: "VALIDATION_FAILED",
      phase: "font"
    });
  }
  const signature = buffer.toString("ascii", 0, 4);
  const scalar = buffer.readUInt32BE(0);
  if (scalar !== 65536 && signature !== "OTTO" && signature !== "true") {
    throw new PaperError("Font payload is not a supported single-face TrueType/OpenType font.", {
      code: "VALIDATION_FAILED",
      phase: "font"
    });
  }
  const tableCount = buffer.readUInt16BE(4);
  if (12 + tableCount * 16 > buffer.length) {
    throw new PaperError("Font table directory is truncated.", {
      code: "VALIDATION_FAILED",
      phase: "font"
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
      phase: "font"
    });
  }
  const fsType = buffer.readUInt16BE(os2Offset + 8);
  if ((fsType & 2) !== 0 || (fsType & 4) !== 0 || (fsType & 512) !== 0) {
    throw new PaperError(`Font embedding is prohibited by OS/2.fsType=0x${fsType.toString(16)}.`, {
      code: "VALIDATION_FAILED",
      phase: "font"
    });
  }
  const parsedFont = $d636bc798e7178db$export$185802fd694ee1f5(buffer);
  return { sha256: sha256Buffer(buffer), fsType, familyName: parsedFont.familyName };
}

export {
  faceForStyle,
  resolveRegistryFont,
  getCachedFontBuffer,
  cacheExternalFontBuffer,
  firstMissingCodePoint,
  inspectEmbeddableFont
};
//# sourceMappingURL=chunk-2W7D7VOC.js.map
