// src/renderer/fontBridge.ts — Register system fonts into @napi-rs/canvas

import { existsSync } from "node:fs";
import { UNICODE_FALLBACK_FILES, EMOJI_FONT_FILES } from "../typography/fontPaths.js";
import { getLogger } from "../logger.js";
import {
  getCachedFontBuffer,
  resolveRegistryFont,
  type ResolvedFontIdentity,
} from "../typography/fontRegistry.js";

interface CanvasGlobalFonts {
  register: (buffer: Buffer, nameAlias?: string) => unknown;
  registerFromPath: (path: string, nameAlias?: string) => unknown;
}

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

// ---------------------------------------------------------------------------
// Class-based state (supports multiple independent instances)
// ---------------------------------------------------------------------------

export class FontBridgeManager {
  private registeredFaces = new Set<string>();

  registerFontFamily(
    fontFamily: string,
    GlobalFonts: CanvasGlobalFonts,
    identity?: ResolvedFontIdentity,
  ): boolean {
    const registrationKey = `${fontFamily}\u0000${identity?.sha256 ?? identity?.face ?? "system"}`;
    if (this.registeredFaces.has(registrationKey)) return true;

    const registryAsset = identity
      ? identity.source === "registry"
        ? resolveRegistryFont(identity.family, identity.face)
        : null
      : resolveRegistryFont(fontFamily, "Regular");
    const sharedBuffer = identity?.source === "system"
      ? null
      : getCachedFontBuffer(identity?.sha256) ?? registryAsset?.buffer;
    if (sharedBuffer) {
      try {
        GlobalFonts.register(sharedBuffer, identity?.family ?? registryAsset?.family ?? fontFamily);
        this.registeredFaces.add(registrationKey);
        return true;
      } catch (err) {
        getLogger().warn?.(`[fontBridge] Failed to register shared buffer for "${fontFamily}": ${err instanceof Error ? err.message : err}`);
        return false;
      }
    }

    // Explicit system strategy is the only identity-bearing path that may
    // consult OS files. Missing user bytes must not borrow a local or bundled
    // substitute under the requested name.
    if (identity && identity.source !== "system") return false;
    const fontPath = resolveSystemFontPath(fontFamily);
    if (!fontPath) {
      getLogger().warn?.(`[fontBridge] Font "${fontFamily}" not found on system — text will use fallback font`);
      return false;
    }

    try {
      GlobalFonts.registerFromPath(fontPath, fontFamily);
      this.registeredFaces.add(registrationKey);
      return true;
    } catch (err) {
      getLogger().warn?.(`[fontBridge] Failed to register font "${fontFamily}" from ${fontPath}: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Default instance + backward-compatible module-level exports
// ---------------------------------------------------------------------------

import { getActiveContext } from "../contextStorage.js";

const defaultManager = new FontBridgeManager();

function resolveSystemFontPath(fontFamily: string): string | null {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return null;
  }
  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC
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
      if (existsSync(p)) return p;
    }
  }
  return null;
}

export function registerFontFamily(
  fontFamily: string,
  GlobalFonts: CanvasGlobalFonts,
  identity?: ResolvedFontIdentity,
): boolean {
  const ctx = getActiveContext();
  const mgr = (ctx?.fontBridge as FontBridgeManager | undefined) ?? defaultManager;
  return mgr.registerFontFamily(fontFamily, GlobalFonts, identity);
}

/**
 * Register a broad-coverage Unicode fallback font with the canvas runtime.
 * Called once per render session. The fallback is registered as the alias
 * used in the CSS font string's fallback chain (see canvasText.ts buildFontString).
 */
let unicodeFallbackRegistered = false;

function ensureUnicodeFallbackRegistered(
  GlobalFonts: CanvasGlobalFonts,
): void {
  if (unicodeFallbackRegistered) return;

  const dirs = process.platform === "darwin" ? SYSTEM_FONT_DIRS_MAC
    : process.platform === "win32" ? SYSTEM_FONT_DIRS_WIN
    : SYSTEM_FONT_DIRS_LINUX;

  for (const file of UNICODE_FALLBACK_FILES) {
    for (const dir of dirs) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "PaperFallback");
          unicodeFallbackRegistered = true;
          return;
        } catch {
          // try next candidate
        }
      }
    }
  }
  // Also try /System/Library/Fonts (macOS root-level fonts)
  if (process.platform === "darwin") {
    for (const file of UNICODE_FALLBACK_FILES) {
      const p = `/System/Library/Fonts/Supplemental/${file}`;
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "PaperFallback");
          unicodeFallbackRegistered = true;
          return;
        } catch {
          // try next candidate
        }
      }
    }
  }
}

let emojiFontRegistered = false;

function ensureEmojiFontRegistered(
  GlobalFonts: CanvasGlobalFonts,
): void {
  if (emojiFontRegistered) return;

  for (const { file, dirs } of EMOJI_FONT_FILES) {
    for (const dir of dirs) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) {
        try {
          GlobalFonts.registerFromPath(p, "PaperEmoji");
          emojiFontRegistered = true;
          return;
        } catch {
          // try next candidate
        }
      }
    }
  }
}

/**
 * Ensure all fonts referenced in a LayoutNode tree are registered.
 * Walks the tree collecting font family names, then registers each.
 * Also registers a broad-coverage Unicode fallback for CJK/RTL/emoji.
 */
export function ensureFontsRegistered(
  node: { type: string; style?: any; textStyle?: any; children?: any[]; content?: any; paragraphs?: any; textContent?: any; textParagraphs?: any; tableData?: any },
  GlobalFonts: CanvasGlobalFonts,
): void {
  ensureUnicodeFallbackRegistered(GlobalFonts);
  ensureEmojiFontRegistered(GlobalFonts);
  const families = new Map<string, { family: string; identity?: ResolvedFontIdentity }>();
  collectFonts(node, families);
  for (const { family, identity } of families.values()) {
    registerFontFamily(family, GlobalFonts, identity);
  }
}

type CollectedFonts = Map<string, { family: string; identity?: ResolvedFontIdentity }>;

function addFont(families: CollectedFonts, family: string, identity?: ResolvedFontIdentity): void {
  const key = `${family}\u0000${identity?.sha256 ?? identity?.face ?? "default"}`;
  families.set(key, { family, identity });
}

function collectFonts(node: any, families: CollectedFonts): void {
  // Style fontFamily
  if (node.style?.fontFamily) addFont(families, node.style.fontFamily, node.style.resolvedFont);
  if (node.textStyle?.fontFamily) addFont(families, node.textStyle.fontFamily, node.textStyle.resolvedFont);

  // Text runs
  collectFromRuns(node.content, families);
  collectFromParagraphs(node.paragraphs, families);
  collectFromRuns(node.textContent, families);
  collectFromParagraphs(node.textParagraphs, families);
  collectNestedFonts(node.chartData, families);

  // Table cells
  if (node.tableData?.rows) {
    for (const row of node.tableData.rows) {
      for (const cell of row.cells ?? []) {
        if (cell.style?.fontFamily) addFont(families, cell.style.fontFamily, cell.style.resolvedFont);
        collectFromRuns(cell.content, families);
        collectFromParagraphs(cell.paragraphs, families);
      }
    }
    if (node.tableData.style?.headerRowStyle?.fontFamily) {
      const header = node.tableData.style.headerRowStyle;
      addFont(families, header.fontFamily, header.resolvedFont);
    }
  }

  // Recurse children
  if (node.children) {
    for (const child of node.children) {
      collectFonts(child, families);
    }
  }
}

function collectNestedFonts(value: unknown, families: CollectedFonts, seen = new Set<object>()): void {
  if (!value || typeof value !== "object" || Buffer.isBuffer(value) || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectNestedFonts(item, families, seen);
    return;
  }
  const record = value as Record<string, any>;
  for (const [key, nested] of Object.entries(record)) {
    if ((key === "fontFamily" || key.endsWith("FontFamily")) && typeof nested === "string") {
      addFont(families, nested, record[`${key}ResolvedFont`] ?? record.resolvedFont);
    } else {
      collectNestedFonts(nested, families, seen);
    }
  }
}

function collectFromRuns(content: unknown, families: CollectedFonts): void {
  if (!Array.isArray(content)) return;
  for (const run of content) {
    if (run?.style?.fontFamily) addFont(families, run.style.fontFamily, run.style.resolvedFont);
  }
}

function collectFromParagraphs(paragraphs: unknown, families: CollectedFonts): void {
  if (!Array.isArray(paragraphs)) return;
  for (const para of paragraphs) {
    collectFromRuns(para?.runs, families);
  }
}
