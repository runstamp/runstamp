// src/typography/harfbuzzLoader.ts — HarfBuzz WASM with class-based state management

import { createRequire } from "node:module";
import type { HbApiInstance, HbBuffer, HbFont } from "../types/vendor.js";
import { getLogger } from "../logger.js";

const _require = createRequire(import.meta.url);

// hb.js is the Emscripten-compiled loader that self-resolves hb.wasm from
// its own package directory — returns the full Emscripten Module object.
// hbjs.js wraps that Module object with a clean JS API.
//
// Lazy-loaded: require("harfbuzzjs") is deferred to first use so that lite
// consumers (who never call initHarfBuzz) don't pay the WASM import cost.
declare const __RUNSTAMP_HARFBUZZ_WASM_BASE64__: string;

type HarfBuzzFactoryOptions = { wasmBinary?: Uint8Array };

let _createHarfBuzz: ((options?: HarfBuzzFactoryOptions) => Promise<object>) | null = null;
let _hbjsWrap: ((module: object) => HbApiInstance) | null = null;

function ensureHarfBuzzModules(): void {
  if (!_createHarfBuzz) {
    _createHarfBuzz = _require("harfbuzzjs/hb.js");
    _hbjsWrap = _require("harfbuzzjs/hbjs.js");
  }
}

/** Maximum number of HarfBuzz fonts to keep cached (WASM heap allocations). */
export const MAX_HB_FONT_CACHE_SIZE = 200;

// ---------------------------------------------------------------------------
// Class-based state (supports multiple independent instances)
// ---------------------------------------------------------------------------

export class HarfBuzzManager {
  private hbInstance: HbApiInstance | null = null;
  private sharedBuffer: HbBuffer | null = null;
  private hbFontCache = new Map<string, HbFont>();

  private evictHbIfNeeded(): void {
    while (this.hbFontCache.size > MAX_HB_FONT_CACHE_SIZE) {
      const oldest = this.hbFontCache.keys().next().value!;
      const font = this.hbFontCache.get(oldest)!;
      font.destroy();
      this.hbFontCache.delete(oldest);
      getLogger().warn(`[harfbuzz] Evicted HbFont "${oldest}" (cache exceeded ${MAX_HB_FONT_CACHE_SIZE})`);
    }
  }

  async initHarfBuzz(): Promise<void> {
    if (this.hbInstance) return;
    try {
      ensureHarfBuzzModules();
      const embeddedWasm = typeof __RUNSTAMP_HARFBUZZ_WASM_BASE64__ === "string"
        ? __RUNSTAMP_HARFBUZZ_WASM_BASE64__
        : "";
      const module = await _createHarfBuzz!(embeddedWasm
        ? { wasmBinary: Uint8Array.from(Buffer.from(embeddedWasm, "base64")) }
        : undefined);
      this.hbInstance = _hbjsWrap!(module);
      this.sharedBuffer = this.hbInstance.createBuffer();
    } catch (err) {
      throw new Error(
        "Failed to initialize HarfBuzz WASM. Ensure 'harfbuzzjs' is installed and the .wasm file is accessible. " +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }

  registerHbFont(fontFamily: string, data: Uint8Array): void {
    if (this.hbFontCache.has(fontFamily)) return;
    if (!this.hbInstance) throw new Error("HarfBuzz not initialized — call initHarfBuzz() first.");

    // Validate font data before passing to WASM — corrupt/empty buffers can crash HarfBuzz.
    // Minimum valid font: TrueType/OpenType header is at least 12 bytes.
    if (!data || data.length < 12) {
      getLogger().warn(`[harfbuzz] Skipping registration of "${fontFamily}": font data too small (${data?.length ?? 0} bytes)`);
      return;
    }

    const blob = this.hbInstance.createBlob(data);
    const face = this.hbInstance.createFace(blob, 0);
    blob.destroy();
    const font = this.hbInstance.createFont(face);
    face.destroy();
    this.hbFontCache.set(fontFamily, font);
    this.evictHbIfNeeded();
  }

  getHbInstance(): HbApiInstance {
    if (!this.hbInstance) throw new Error("HarfBuzz not initialized — call initHarfBuzz() first.");
    return this.hbInstance;
  }

  getHbFont(fontFamily: string): HbFont | null {
    return this.hbFontCache.get(fontFamily) ?? null;
  }

  getSharedBuffer(): HbBuffer {
    if (!this.sharedBuffer) throw new Error("HarfBuzz not initialized — call initHarfBuzz() first.");
    return this.sharedBuffer;
  }

  clearHbFontCache(): void {
    for (const font of this.hbFontCache.values()) {
      font.destroy();
    }
    this.hbFontCache.clear();
  }

  destroyHarfBuzz(): void {
    this.clearHbFontCache();
    if (this.sharedBuffer) {
      this.sharedBuffer.destroy();
      this.sharedBuffer = null;
    }
    this.hbInstance = null;
  }

  hbFontCacheSize(): number {
    return this.hbFontCache.size;
  }
}

// ---------------------------------------------------------------------------
// Default instance + backward-compatible module-level exports
// ---------------------------------------------------------------------------

import { getActiveContext } from "../contextStorage.js";

const defaultManager = new HarfBuzzManager();

function _mgr(): HarfBuzzManager {
  const ctx = getActiveContext();
  return (ctx?.harfBuzz as HarfBuzzManager | undefined) ?? defaultManager;
}

export async function initHarfBuzz(): Promise<void> {
  return _mgr().initHarfBuzz();
}

export function registerHbFont(fontFamily: string, data: Uint8Array): void {
  _mgr().registerHbFont(fontFamily, data);
}

export function getHbInstance(): HbApiInstance {
  return _mgr().getHbInstance();
}

export function getHbFont(fontFamily: string): HbFont | null {
  return _mgr().getHbFont(fontFamily);
}

export function getSharedBuffer(): HbBuffer {
  return _mgr().getSharedBuffer();
}

export function clearHbFontCache(): void {
  _mgr().clearHbFontCache();
}

export function destroyHarfBuzz(): void {
  _mgr().destroyHarfBuzz();
}

export function hbFontCacheSize(): number {
  return _mgr().hbFontCacheSize();
}
