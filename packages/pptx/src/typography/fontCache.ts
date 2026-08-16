// src/typography/fontCache.ts — Font cache with class-based state management

import * as fontkit from "fontkit";
import { initHarfBuzz, registerHbFont } from "./harfbuzzLoader.js";
import { getLogger } from "../logger.js";

/** Maximum number of font families to keep in the fontkit cache. */
export const MAX_FONT_CACHE_SIZE = 200;

// ---------------------------------------------------------------------------
// Class-based state (supports multiple independent instances)
// ---------------------------------------------------------------------------

export class FontCacheManager {
  private fontCache = new Map<string, fontkit.Font>();
  private fontSubstitutions = new Map<string, string>();

  private evictIfNeeded(): void {
    while (this.fontCache.size > MAX_FONT_CACHE_SIZE) {
      const oldest = this.fontCache.keys().next().value!;
      this.fontCache.delete(oldest);
      getLogger().warn(`[fontCache] Evicted font "${oldest}" (cache exceeded ${MAX_FONT_CACHE_SIZE})`);
    }
  }

  async loadFont(fontFamily: string, buffer: Buffer): Promise<fontkit.Font> {
    const existing = this.fontCache.get(fontFamily);
    if (existing) {
      this.fontCache.delete(fontFamily);
      this.fontCache.set(fontFamily, existing);
      return existing;
    }

    const font = fontkit.create(buffer) as fontkit.Font;
    this.fontCache.set(fontFamily, font);
    this.evictIfNeeded();
    return font;
  }

  getFont(fontFamily: string): fontkit.Font {
    const font = this.fontCache.get(fontFamily);
    if (!font) {
      const available = [...this.fontCache.keys()].slice(0, 10).join(", ");
      throw new Error(
        `Font "${fontFamily}" not loaded into cache. ` +
        `Call loadFont("${fontFamily}", buffer) or use autoLoadDocumentFonts() before rendering. ` +
        (available ? `Available fonts: ${available}` : "No fonts loaded yet."),
      );
    }
    return font;
  }

  getFontOrNull(fontFamily: string): fontkit.Font | null {
    return this.fontCache.get(fontFamily) ?? null;
  }

  recordFontSubstitution(requested: string, actual: string): void {
    this.fontSubstitutions.set(requested, actual);
  }

  isSubstitutedFont(family: string): boolean {
    return this.fontSubstitutions.has(family);
  }

  getFontSubstitutions(): Record<string, string> {
    return Object.fromEntries(this.fontSubstitutions.entries());
  }

  clearFontCache(): void {
    this.fontCache.clear();
    this.fontSubstitutions.clear();
  }

  fontCacheSize(): number {
    return this.fontCache.size;
  }

  async loadFontWithHarfBuzz(fontFamily: string, buffer: Buffer): Promise<fontkit.Font> {
    await initHarfBuzz();
    registerHbFont(fontFamily, new Uint8Array(buffer));
    return this.loadFont(fontFamily, buffer);
  }
}

// ---------------------------------------------------------------------------
// Pure utility functions (no state — safe as module-level)
// ---------------------------------------------------------------------------

export function boldFontKey(family: string): string {
  return `${family}__bold`;
}

export function italicFontKey(family: string): string {
  return `${family}__italic`;
}

export function boldItalicFontKey(family: string): string {
  return `${family}__bolditalic`;
}

// ---------------------------------------------------------------------------
// Default instance + backward-compatible module-level exports
// ---------------------------------------------------------------------------

import { getActiveContext } from "../contextStorage.js";

const defaultManager = new FontCacheManager();

function _mgr(): FontCacheManager {
  const ctx = getActiveContext();
  return (ctx?.fontCache as FontCacheManager | undefined) ?? defaultManager;
}

export async function loadFont(fontFamily: string, buffer: Buffer): Promise<fontkit.Font> {
  return _mgr().loadFont(fontFamily, buffer);
}

export function getFont(fontFamily: string): fontkit.Font {
  return _mgr().getFont(fontFamily);
}

export function getFontOrNull(fontFamily: string): fontkit.Font | null {
  return _mgr().getFontOrNull(fontFamily);
}

export function recordFontSubstitution(requested: string, actual: string): void {
  _mgr().recordFontSubstitution(requested, actual);
}

export function isSubstitutedFont(family: string): boolean {
  return _mgr().isSubstitutedFont(family);
}

export function getFontSubstitutions(): Record<string, string> {
  return _mgr().getFontSubstitutions();
}

export function clearFontCache(): void {
  _mgr().clearFontCache();
}

export function fontCacheSize(): number {
  return _mgr().fontCacheSize();
}

export async function loadFontWithHarfBuzz(fontFamily: string, buffer: Buffer): Promise<fontkit.Font> {
  return _mgr().loadFontWithHarfBuzz(fontFamily, buffer);
}
