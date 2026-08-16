import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  cacheExternalFontBuffer,
  faceForStyle,
  firstMissingCodePoint,
  getCachedFontBuffer,
  inspectEmbeddableFont,
  resolveRegistryFont
} from "./chunk-2W7D7VOC.js";
import {
  validateFetchUrl
} from "./chunk-YWT5KXVL.js";
import {
  classifyScript,
  isLiteBundle
} from "./chunk-DYXX63XE.js";
import {
  boldFontKey,
  boldItalicFontKey,
  getFontOrNull,
  italicFontKey,
  loadFont,
  loadFontWithHarfBuzz,
  recordFontSubstitution
} from "./chunk-P5JGOT4P.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";
import {
  PaperError
} from "./chunk-JXY3OJQ6.js";

// src/typography/autoFont.ts
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
var _require = createRequire(import.meta.url);
var HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? "";
var SYSTEM_FONT_DIRS_MAC = [
  ...HOME_DIR ? [`${HOME_DIR}/Library/Fonts`] : [],
  "/System/Library/Fonts/Supplemental",
  "/Library/Fonts",
  "/System/Library/Fonts"
];
var SYSTEM_FONT_DIRS_WIN = [
  ...HOME_DIR ? [`${HOME_DIR}\\AppData\\Local\\Microsoft\\Windows\\Fonts`] : [],
  "C:\\Windows\\Fonts"
];
var SYSTEM_FONT_DIRS_LINUX = [
  ...HOME_DIR ? [`${HOME_DIR}/.local/share/fonts`, `${HOME_DIR}/.fonts`] : [],
  "/usr/share/fonts/truetype/dejavu",
  "/usr/share/fonts/truetype/liberation",
  "/usr/share/fonts/truetype",
  "/usr/share/fonts"
];
function resolveSystemFontPath(fontFamily) {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN : SYSTEM_FONT_DIRS_LINUX;
  const candidates = [
    `${fontFamily}.ttf`,
    `${fontFamily}-Regular.ttf`,
    `${fontFamily} Regular.ttf`,
    `${fontFamily}.otf`,
    `${fontFamily}-Regular.otf`
  ];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return { path: p, actualFileName: file };
    }
  }
  return null;
}
function resolveSystemBoldFontPath(fontFamily) {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN : SYSTEM_FONT_DIRS_LINUX;
  const candidates = [`${fontFamily} Bold.ttf`, `${fontFamily}-Bold.ttf`];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}
function resolveSystemItalicFontPath(fontFamily) {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN : SYSTEM_FONT_DIRS_LINUX;
  const candidates = [`${fontFamily} Italic.ttf`, `${fontFamily}-Italic.ttf`];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}
function resolveSystemBoldItalicFontPath(fontFamily) {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN : SYSTEM_FONT_DIRS_LINUX;
  const candidates = [
    `${fontFamily} Bold Italic.ttf`,
    `${fontFamily}-BoldItalic.ttf`,
    `${fontFamily}-BoldOblique.ttf`
  ];
  for (const dir of dirs) {
    for (const file of candidates) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}
function getNotoSansPath() {
  const hbDir = dirname(_require.resolve("harfbuzzjs/hb.js"));
  return join(hbDir, "test", "fonts", "noto", "NotoSans-Regular.ttf");
}
function collectFontNeeds(doc) {
  const families = /* @__PURE__ */ new Set();
  const boldFamilies = /* @__PURE__ */ new Set();
  const italicFamilies = /* @__PURE__ */ new Set();
  const boldItalicFamilies = /* @__PURE__ */ new Set();
  function fromTextStyle(style) {
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
  function fromRuns(runs, parentFamily) {
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
  function fromParagraphs(paragraphs, parentFamily) {
    if (!paragraphs) return;
    for (const para of paragraphs) {
      fromRuns(para.runs, parentFamily);
    }
  }
  function walkNode(node) {
    const style = node.style;
    fromTextStyle(style);
    const parentFamily = style?.fontFamily;
    if (node.type === "Text") {
      const textNode = node;
      if (Array.isArray(textNode.content)) fromRuns(textNode.content, parentFamily);
      fromParagraphs(textNode.paragraphs, parentFamily);
    }
    if (node.type === "View") {
      const view = node;
      fromTextStyle(view.textStyle);
      fromParagraphs(view.textParagraphs, view.textStyle?.fontFamily ?? parentFamily);
    }
    if (node.type === "Table") {
      const table = node;
      const headerStyle = table.tableData?.style?.headerRowStyle;
      if (headerStyle?.fontFamily) {
        families.add(headerStyle.fontFamily);
        if (headerStyle.fontWeight === "bold") boldFamilies.add(headerStyle.fontFamily);
      }
      for (const row of table.tableData?.rows ?? []) {
        for (const cell of row.cells ?? []) {
          fromTextStyle(cell.style);
          fromRuns(cell.content, cell.style?.fontFamily);
          fromParagraphs(cell.paragraphs, cell.style?.fontFamily);
        }
      }
    }
    const children = node.children;
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
async function loadFontAuto(family, buffer) {
  if (isLiteBundle()) {
    await loadFont(family, buffer);
  } else {
    await loadFontWithHarfBuzz(family, buffer);
  }
}
async function decodeEmbeddedFontSrc(src) {
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
function pickEmbeddedFont(embedded, family, wantBold, wantItalic) {
  if (!embedded || embedded.length === 0) return null;
  const matches = embedded.filter((f) => f.fontFamily === family);
  if (matches.length === 0) return null;
  const exact = matches.find((f) => Boolean(f.bold) === wantBold && Boolean(f.italic) === wantItalic);
  if (exact) return exact;
  if (!wantBold && !wantItalic) {
    const reg = matches.find((f) => !f.bold && !f.italic);
    if (reg) return reg;
  }
  return null;
}
function canonicalFontStrategy(doc) {
  const strategy = doc.fontStrategy ?? (doc.embeddedFonts?.length ? "user-embedded" : "portable");
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
function variantKey(family, face) {
  return `${family.toLocaleLowerCase("en-US")}\0${face}`;
}
async function resolveDocumentFonts(doc) {
  const strategy = canonicalFontStrategy(doc);
  doc.fontStrategy = strategy;
  const userAssets = /* @__PURE__ */ new Map();
  if (strategy === "user-embedded") {
    for (const config of doc.embeddedFonts ?? []) {
      const buffer = await decodeEmbeddedFontSrc(config.src);
      if (!buffer) {
        throw new PaperError(`Unable to load user-embedded font "${config.fontFamily}".`, {
          code: "FONT_NOT_FOUND",
          phase: "font"
        });
      }
      const inspected = inspectEmbeddableFont(buffer);
      if (inspected.familyName !== config.fontFamily) {
        throw new PaperError(
          `User-embedded font family mismatch: config names "${config.fontFamily}" but bytes name "${inspected.familyName}". Font aliases are not permitted.`,
          { code: "VALIDATION_FAILED", phase: "font" }
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
        pixelGateEligible: true
      });
    }
  }
  const used = /* @__PURE__ */ new Map();
  const resolveIdentity = (requestedFamily, face, text = "") => {
    let identity;
    if (strategy === "system") {
      identity = {
        requestedFamily,
        family: requestedFamily,
        face,
        source: "system",
        pixelGateEligible: false,
        diagnostics: [{
          code: "FONT_SYSTEM_OPT_IN",
          message: `System font "${requestedFamily}" is an explicit nonportable opt-in and is ineligible for pixel gating.`
        }]
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
            message: `User-embedded font "${requestedFamily}" has no ${face} face; its Regular face will be synthesized.`
          }]
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
            message: `Requested font "${requestedFamily}" has no matching caller-supplied embedded face.`
          }]
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
            message: `Admitted font "${regular.family}" has no ${face} face; its Regular face will be synthesized.`
          }]
        };
      } else {
        const fallback = resolveRegistryFont("Arial", face) ?? resolveRegistryFont("Arial", "Regular");
        if (!fallback) {
          throw new PaperError("Portable fallback family Liberation Sans is missing from the registry.", {
            code: "FONT_NOT_FOUND",
            phase: "font"
          });
        }
        identity = {
          ...fallback,
          requestedFamily,
          diagnostics: [{
            code: "FONT_REQUESTED_FAMILY_NOT_EMBEDDED",
            message: `Requested font "${requestedFamily}" is not admitted; using "${fallback.family}" instead.`
          }]
        };
      }
    }
    const hasPendingBatchEScript = [...text].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== void 0 && codePoint > 32 && classifyScript(codePoint) !== "latin";
    });
    const missingCodePoint = firstMissingCodePoint(identity.sha256, text);
    if (hasPendingBatchEScript || missingCodePoint !== void 0) {
      const diagnostics = [...identity.diagnostics ?? [], {
        code: "FONT_COVERAGE_FALLBACK_USED",
        message: missingCodePoint !== void 0 ? `Resolved font "${identity.family}" lacks U+${missingCodePoint.toString(16).toUpperCase().padStart(4, "0")}; no admitted coverage fallback is available and a:ea/a:cs remain empty.` : `No admitted Batch E script face is available for text requested in "${requestedFamily}"; a:ea/a:cs will remain empty.`
      }];
      identity = { ...identity, diagnostics, pixelGateEligible: false };
    }
    if (strategy === "portable") {
      identity = {
        ...identity,
        pixelGateEligible: false,
        diagnostics: [...identity.diagnostics ?? [], {
          code: "FONT_EMBEDDING_UNAVAILABLE",
          message: "PowerPoint font embedding is unavailable because no validated EOT/MicroType Express encoder is configured; portable font names will be referenced without embedding."
        }]
      };
    }
    const usedKey = identity.sha256 ?? `${identity.source}:${identity.family}:${identity.face}`;
    const previous = used.get(usedKey);
    used.set(usedKey, previous ? {
      ...identity,
      pixelGateEligible: previous.pixelGateEligible && identity.pixelGateEligible,
      diagnostics: [...new Map(
        [...previous.diagnostics ?? [], ...identity.diagnostics ?? []].map((diagnostic) => [`${diagnostic.code}:${diagnostic.message}`, diagnostic])
      ).values()]
    } : identity);
    return identity;
  };
  const applyStyle = (style, requestedFamily, bold, italic, text = "") => {
    const identity = resolveIdentity(requestedFamily, faceForStyle(bold, italic), text);
    style.fontFamily = identity.family;
    style.resolvedFont = identity;
    return identity;
  };
  const resolveRuns = (runs, parent, parentRequested) => {
    for (const run of runs ?? []) {
      const style = run.style ?? (run.style = {});
      const requested = style.resolvedFont?.requestedFamily ?? style.fontFamily ?? parentRequested;
      const bold = (style.fontWeight ?? parent.fontWeight) === "bold";
      const italic = (style.fontStyle ?? parent.fontStyle) === "italic";
      applyStyle(style, requested, bold, italic, run.text);
    }
  };
  const resolveTextStyle = (style, text, fallbackFamily) => {
    const requested = style.resolvedFont?.requestedFamily ?? style.fontFamily ?? fallbackFamily;
    applyStyle(style, requested, style.fontWeight === "bold", style.fontStyle === "italic", text);
    if (strategy === "portable") {
      style.fontFallback = [...new Set((style.fontFallback ?? []).map((family) => resolveRegistryFont(family, "Regular")?.family ?? "Liberation Sans"))].filter((family) => family !== style.fontFamily);
    } else {
      style.fontFallback = [];
    }
    return requested;
  };
  const resolveNestedFontProperties = (value, seen = /* @__PURE__ */ new Set()) => {
    if (!value || typeof value !== "object" || Buffer.isBuffer(value) || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) resolveNestedFontProperties(item, seen);
      return;
    }
    const record = value;
    for (const [key, nested] of Object.entries(record)) {
      if ((key === "fontFamily" || key.endsWith("FontFamily")) && typeof nested === "string") {
        const identity = resolveIdentity(
          nested,
          faceForStyle(record.bold === true || record.fontWeight === "bold", record.italic === true || record.fontStyle === "italic")
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
  const walkNode = (node) => {
    const nodeStyle = node.style ?? (node.style = {});
    if (node.type === "Text") {
      const textNode = node;
      const directText = typeof textNode.content === "string" ? textNode.content : "";
      const requested = resolveTextStyle(nodeStyle, directText, themeFallback);
      if (Array.isArray(textNode.content)) resolveRuns(textNode.content, nodeStyle, requested);
      for (const paragraph of textNode.paragraphs ?? []) {
        resolveRuns(paragraph.runs, nodeStyle, requested);
        resolveNestedFontProperties(paragraph.bullet);
      }
    } else if (node.type === "View") {
      const view = node;
      if (view.textStyle || view.textContent !== void 0 || view.textParagraphs?.length) {
        const style = view.textStyle ?? (view.textStyle = {});
        const requested = resolveTextStyle(style, view.textContent ?? "", themeFallback);
        for (const paragraph of view.textParagraphs ?? []) {
          resolveRuns(paragraph.runs, style, requested);
          resolveNestedFontProperties(paragraph.bullet);
        }
      }
    } else if (node.type === "Table") {
      const table = node;
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
    for (const child of node.children ?? []) walkNode(child);
  };
  for (const slide of doc.slides) {
    for (const child of slide.children ?? []) walkNode(child);
  }
  if (doc.theme?.fontScheme) {
    for (const key of ["majorLatin", "minorLatin"]) {
      const requested = doc.theme.fontScheme[key];
      if (requested) doc.theme.fontScheme[key] = resolveIdentity(requested, "Regular").family;
    }
  }
  doc.resolvedFonts = [...used.values()];
  doc.fontPixelGateEligible = strategy !== "system" && doc.resolvedFonts.every((font) => font.pixelGateEligible);
}
async function autoLoadDocumentFonts(doc, options) {
  await resolveDocumentFonts(doc);
  const { families, boldFamilies, italicFamilies, boldItalicFamilies } = collectFontNeeds(doc);
  if (families.size === 0) return;
  const strict = options?.strict ?? false;
  const lite = isLiteBundle();
  const strategy = canonicalFontStrategy(doc);
  let notoBuffer = null;
  const embedded = strategy === "user-embedded" ? doc.embeddedFonts : void 0;
  for (const family of families) {
    if (getFontOrNull(family)) continue;
    const resolvedIdentity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "Regular");
    const resolvedBuffer = strategy === "system" ? null : getCachedFontBuffer(resolvedIdentity?.sha256) ?? (strategy === "portable" ? resolveRegistryFont(family, "Regular")?.buffer : null);
    if (resolvedBuffer) {
      await loadFontAuto(family, resolvedBuffer);
      continue;
    }
    if (strategy === "portable") {
      throw new PaperError(`Portable font "${family}" has no admitted registry buffer.`, {
        code: "FONT_NOT_FOUND",
        phase: "font"
      });
    }
    const embRegular = pickEmbeddedFont(embedded, family, false, false);
    if (embRegular) {
      const buf = await decodeEmbeddedFontSrc(embRegular.src);
      if (buf) {
        try {
          await loadFontAuto(family, buf);
          continue;
        } catch (e) {
          getLogger().warn(`[autoFont] Failed to load embedded font "${family}": ${e.message}`);
        }
      }
    }
    const resolved = strategy === "system" ? resolveSystemFontPath(family) : null;
    if (resolved) {
      try {
        const buffer = await readFile(resolved.path);
        await loadFontAuto(family, buffer);
        const actualBase = resolved.actualFileName.replace(/\.ttf$/i, "").toLowerCase();
        if (!actualBase.startsWith(family.toLowerCase())) {
          recordFontSubstitution(family, actualBase);
        }
        continue;
      } catch (e) {
        getLogger().warn(`[autoFont] Failed to load system font "${family}" from ${resolved.path}: ${e.message}`);
      }
    }
    if (strategy === "system" || strategy === "user-embedded") {
      if (strict) {
        throw new PaperError(
          strategy === "system" ? `System font "${family}" is not installed.` : `User-embedded font "${family}" has no validated caller-supplied bytes.`,
          {
            code: "FONT_NOT_FOUND",
            phase: "font"
          }
        );
      }
      getLogger().warn(
        strategy === "system" ? `[autoFont] System font "${family}" is unavailable; measurement will use a char-count estimate.` : `[autoFont] User-embedded font "${family}" has no validated caller-supplied bytes; measurement will use a char-count estimate.`
      );
    } else if (lite) {
      const fallbackResolved = resolveSystemFontPath("Arial") ?? resolveSystemFontPath("DejaVu Sans");
      if (fallbackResolved) {
        try {
          const buffer = await readFile(fallbackResolved.path);
          await loadFontAuto(family, buffer);
          recordFontSubstitution(family, fallbackResolved.actualFileName.replace(/\.ttf$/i, ""));
          getLogger().warn(`[autoFont] Font "${family}" not found \u2014 falling back to system font`);
          continue;
        } catch {
        }
      }
      if (strict) {
        throw new PaperError(
          `Font "${family}" not loaded and no system fallback found. Call loadFont("${family}", buffer) before rendering, or set tokens.type.*.family to a font that's installed locally.`,
          { code: "FONT_NOT_FOUND", phase: "font" }
        );
      }
      getLogger().warn(`[autoFont] Font "${family}" unavailable. Measurement will use char-count estimate.`);
    } else {
      try {
        if (!notoBuffer) {
          notoBuffer = await readFile(getNotoSansPath());
        }
        await loadFontWithHarfBuzz(family, notoBuffer);
        recordFontSubstitution(family, "NotoSans-Regular");
        getLogger().warn(`[autoFont] Font "${family}" not found \u2014 falling back to NotoSans`);
      } catch (e) {
        if (strict) {
          throw new PaperError(
            `Font "${family}" not loaded and NotoSans fallback failed: ${e.message}. Call loadFont("${family}", buffer) before rendering.`,
            { code: "FONT_NOT_FOUND", phase: "font" }
          );
        }
        getLogger().warn(`[autoFont] Font "${family}" unavailable and NotoSans fallback failed: ${e.message}. Measurement will use char-count estimate.`);
      }
    }
  }
  for (const family of boldFamilies) {
    const bKey = boldFontKey(family);
    if (getFontOrNull(bKey)) continue;
    const identity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "Bold");
    const registryBuffer = strategy === "system" ? null : getCachedFontBuffer(identity?.sha256) ?? (strategy === "portable" ? resolveRegistryFont(family, "Bold")?.buffer : null);
    if (registryBuffer) {
      await loadFontAuto(bKey, registryBuffer);
      continue;
    }
    if (strategy === "portable") continue;
    const embBold = pickEmbeddedFont(embedded, family, true, false);
    if (embBold) {
      const buf = await decodeEmbeddedFontSrc(embBold.src);
      if (buf) {
        try {
          await loadFontAuto(bKey, buf);
          continue;
        } catch {
        }
      }
    }
    const boldPath = strategy === "system" ? resolveSystemBoldFontPath(family) : null;
    if (boldPath) {
      try {
        const buffer = await readFile(boldPath);
        await loadFontAuto(bKey, buffer);
      } catch (e) {
        getLogger().warn(`[autoFont] Bold variant for "${family}" failed to load from ${boldPath}: ${e.message}. Will apply width factor.`);
      }
    }
  }
  for (const family of italicFamilies) {
    const iKey = italicFontKey(family);
    if (getFontOrNull(iKey)) continue;
    const identity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "Italic");
    const registryBuffer = strategy === "system" ? null : getCachedFontBuffer(identity?.sha256) ?? (strategy === "portable" ? resolveRegistryFont(family, "Italic")?.buffer : null);
    if (registryBuffer) {
      await loadFontAuto(iKey, registryBuffer);
      continue;
    }
    if (strategy === "portable") continue;
    const embItalic = pickEmbeddedFont(embedded, family, false, true);
    if (embItalic) {
      const buf = await decodeEmbeddedFontSrc(embItalic.src);
      if (buf) {
        try {
          await loadFontAuto(iKey, buf);
          continue;
        } catch {
        }
      }
    }
    const italicPath = strategy === "system" ? resolveSystemItalicFontPath(family) : null;
    if (italicPath) {
      try {
        const buffer = await readFile(italicPath);
        await loadFontAuto(iKey, buffer);
      } catch (e) {
        getLogger().warn(`[autoFont] Italic variant for "${family}" failed to load from ${italicPath}: ${e.message}. Will use regular font.`);
      }
    }
  }
  for (const family of boldItalicFamilies) {
    const biKey = boldItalicFontKey(family);
    if (!getFontOrNull(biKey)) {
      const identity = doc.resolvedFonts?.find((font) => font.family === family && font.face === "BoldItalic");
      const registryBuffer = strategy === "system" ? null : getCachedFontBuffer(identity?.sha256) ?? (strategy === "portable" ? resolveRegistryFont(family, "BoldItalic")?.buffer : null);
      if (registryBuffer) {
        await loadFontAuto(biKey, registryBuffer);
        continue;
      }
      if (strategy === "portable") continue;
      const embBI = pickEmbeddedFont(embedded, family, true, true);
      if (embBI) {
        const buf = await decodeEmbeddedFontSrc(embBI.src);
        if (buf) {
          try {
            await loadFontAuto(biKey, buf);
          } catch {
          }
        }
      }
      if (!getFontOrNull(biKey)) {
        const biPath = strategy === "system" ? resolveSystemBoldItalicFontPath(family) : null;
        if (biPath) {
          try {
            const buffer = await readFile(biPath);
            await loadFontAuto(biKey, buffer);
          } catch (e) {
            getLogger().warn(`[autoFont] Bold-italic variant for "${family}" failed to load from ${biPath}: ${e.message}. Will fall back to bold or italic variant.`);
          }
        }
      }
    }
    const bKey = boldFontKey(family);
    if (!getFontOrNull(bKey)) {
      const embBold = pickEmbeddedFont(embedded, family, true, false);
      if (embBold) {
        const buf = await decodeEmbeddedFontSrc(embBold.src);
        if (buf) {
          try {
            await loadFontAuto(bKey, buf);
          } catch {
          }
        }
      }
      if (!getFontOrNull(bKey)) {
        const boldPath = resolveSystemBoldFontPath(family);
        if (boldPath) {
          try {
            const buffer = await readFile(boldPath);
            await loadFontAuto(bKey, buffer);
          } catch {
          }
        }
      }
    }
    const iKey = italicFontKey(family);
    if (!getFontOrNull(iKey)) {
      const embItalic = pickEmbeddedFont(embedded, family, false, true);
      if (embItalic) {
        const buf = await decodeEmbeddedFontSrc(embItalic.src);
        if (buf) {
          try {
            await loadFontAuto(iKey, buf);
          } catch {
          }
        }
      }
      if (!getFontOrNull(iKey)) {
        const italicPath = resolveSystemItalicFontPath(family);
        if (italicPath) {
          try {
            const buffer = await readFile(italicPath);
            await loadFontAuto(iKey, buffer);
          } catch {
          }
        }
      }
    }
  }
}

// src/engine/renderabilityWarnings.ts
var CHECKED_DOCUMENTS = /* @__PURE__ */ new WeakSet();
var RENDERABILITY_RULES = [
  {
    nodeType: "Text",
    propertyPath: "style.textWarp",
    message: "Text word-art warping is accepted by schema but not emitted by the PPTX writer in the size-constrained lite bundle; remove `textWarp`, or use the full engine entry point.",
    applies(node) {
      if (node.type !== "Text" || !isLiteBundle()) {
        return false;
      }
      const textNode = node;
      return Boolean(textNode.style?.textWarp && textNode.style.textWarp !== "textNoShape");
    }
  },
  {
    nodeType: "View",
    propertyPath: "textStyle.textWarp",
    message: "View shape text warping is accepted by schema but not emitted by the PPTX writer in the size-constrained lite bundle; remove `textWarp`, or use the full engine entry point.",
    applies(node) {
      if (node.type !== "View" || !isLiteBundle()) {
        return false;
      }
      const viewNode = node;
      return Boolean(viewNode.textStyle?.textWarp && viewNode.textStyle.textWarp !== "textNoShape");
    }
  },
  {
    nodeType: "Text",
    propertyPath: "style.textDecorationStyle",
    message: '`textDecorationStyle` only emits when paired with `textDecorationLine`. Set `textDecorationLine: "underline"` or `"strikethrough"` alongside the style, or remove `textDecorationStyle`.',
    applies(node) {
      if (node.type !== "Text") return false;
      const textNode = node;
      const hasStyle = textNode.style?.textDecorationStyle !== void 0;
      const hasLine = textNode.style?.textDecorationLine !== void 0 && textNode.style.textDecorationLine !== "none";
      return hasStyle && !hasLine;
    }
  },
  {
    nodeType: "View",
    propertyPath: "textStyle.textDecorationStyle",
    message: "`textDecorationStyle` on View.textStyle only emits when paired with `textDecorationLine`. Set both or remove the standalone style.",
    applies(node) {
      if (node.type !== "View") return false;
      const viewNode = node;
      const hasStyle = viewNode.textStyle?.textDecorationStyle !== void 0;
      const hasLine = viewNode.textStyle?.textDecorationLine !== void 0 && viewNode.textStyle.textDecorationLine !== "none";
      return hasStyle && !hasLine;
    }
  },
  {
    nodeType: "Text",
    propertyPath: "style.lineHeight",
    message: "`lineHeight` values below 0.1 or above 1000 are clamped by PowerPoint and likely indicate a unit mismatch. Use a ratio (e.g. 1.5) or an absolute value in the API's documented unit.",
    applies(node) {
      if (node.type !== "Text") return false;
      const textNode = node;
      const lh = textNode.style?.lineHeight;
      if (lh === void 0) return false;
      return lh <= 0 || lh > 1e3;
    }
  },
  {
    nodeType: "View",
    propertyPath: "style.borderRadius",
    message: "`borderRadius` on View is honored via `roundRect` geometry, but `shapeType` is already set \u2014 the explicit `shapeType` wins and `borderRadius` is ignored. Pick one.",
    applies(node) {
      if (node.type !== "View") return false;
      const viewNode = node;
      return viewNode.style?.borderRadius !== void 0 && viewNode.style.borderRadius > 0 && viewNode.shapeType !== void 0 && viewNode.shapeType !== "rect";
    }
  },
  {
    nodeType: "Image",
    propertyPath: "borderRadius",
    message: "Negative or non-finite `borderRadius` on Image is ignored by the writer. Use a positive pixel value or remove the property.",
    applies(node) {
      if (node.type !== "Image") return false;
      const img = node;
      if (img.borderRadius === void 0) return false;
      return !Number.isFinite(img.borderRadius) || img.borderRadius < 0;
    }
  },
  {
    nodeType: "View",
    propertyPath: "style.opacity",
    message: "`opacity` outside the 0..1 range is clamped by the writer; values > 1 or < 0 indicate a unit mismatch (percentage vs ratio).",
    applies(node) {
      if (node.type !== "View") return false;
      const viewNode = node;
      const op = viewNode.style?.opacity;
      return op !== void 0 && (op < 0 || op > 1);
    }
  },
  {
    nodeType: "Text",
    propertyPath: "style.opacity",
    message: "`opacity` outside the 0..1 range is clamped by the writer; values > 1 or < 0 indicate a unit mismatch (percentage vs ratio).",
    applies(node) {
      if (node.type !== "Text") return false;
      const textNode = node;
      const op = textNode.style?.opacity;
      return op !== void 0 && (op < 0 || op > 1);
    }
  },
  {
    nodeType: "View",
    propertyPath: "style.rotation",
    message: "`rotation` outside -360..360 is effectively taken modulo 360 by PowerPoint; large values are almost always a bug.",
    applies(node) {
      if (node.type !== "View") return false;
      const viewNode = node;
      const rot = viewNode.style?.rotation;
      return rot !== void 0 && (rot > 360 || rot < -360);
    }
  }
];
function hasChildren(node) {
  return "children" in node && Array.isArray(node.children);
}
function collectNodeWarnings(node, nodePath, warnings) {
  for (const rule of RENDERABILITY_RULES) {
    if (rule.nodeType !== node.type || !rule.applies(node)) {
      continue;
    }
    warnings.push({
      nodePath,
      nodeType: node.type,
      propertyPath: rule.propertyPath,
      message: rule.message
    });
  }
  if (!hasChildren(node)) {
    return;
  }
  node.children.forEach((child, index) => {
    collectNodeWarnings(child, `${nodePath}.children[${index}]`, warnings);
  });
}
function emitRenderabilityWarnings(document, onWarning) {
  const warnings = [];
  document.slides.forEach((slide, slideIndex) => {
    slide.children.forEach((child, childIndex) => {
      collectNodeWarnings(child, `slides[${slideIndex}].children[${childIndex}]`, warnings);
    });
  });
  if (!CHECKED_DOCUMENTS.has(document)) {
    warnings.forEach((warning) => {
      getLogger().warn(
        `[renderability] ${warning.nodePath}.${warning.propertyPath}: ${warning.message}`
      );
    });
    CHECKED_DOCUMENTS.add(document);
  }
  if (onWarning !== void 0) {
    warnings.forEach(onWarning);
  }
  return warnings;
}

export {
  emitRenderabilityWarnings,
  autoLoadDocumentFonts
};
//# sourceMappingURL=chunk-FUBHCOLD.js.map
