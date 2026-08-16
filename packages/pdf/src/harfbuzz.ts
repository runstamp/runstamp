import { createRequire } from "node:module";
import type { HbApiInstance, HbBuffer, HbFont, HbGlyph } from "./vendor-types.js";

const requireFrom = createRequire(import.meta.url);

declare const __RUNSTAMP_HARFBUZZ_WASM_BASE64__: string;

type HarfBuzzFactoryOptions = { wasmBinary?: Uint8Array };

let createHarfBuzz: ((options?: HarfBuzzFactoryOptions) => Promise<object>) | null = null;
let wrapHarfBuzz: ((module: object) => HbApiInstance) | null = null;

function ensureModules(): void {
  if (!createHarfBuzz) {
    createHarfBuzz = requireFrom("harfbuzzjs/hb.js");
    wrapHarfBuzz = requireFrom("harfbuzzjs/hbjs.js");
  }
}

export class HarfBuzzManager {
  private hb: HbApiInstance | null = null;
  private initPromise: Promise<void> | null = null;
  private fonts = new Map<string, HbFont>();
  private fontRegistrations = new Map<string, Promise<void>>();

  async init(): Promise<void> {
    if (this.hb) {
      return;
    }
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    ensureModules();
    this.initPromise = (async () => {
      const embeddedWasm = typeof __RUNSTAMP_HARFBUZZ_WASM_BASE64__ === "string"
        ? __RUNSTAMP_HARFBUZZ_WASM_BASE64__
        : "";
      const module = await createHarfBuzz!(embeddedWasm
        ? { wasmBinary: Uint8Array.from(Buffer.from(embeddedWasm, "base64")) }
        : undefined);
      this.hb = wrapHarfBuzz!(module);
    })();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async registerFont(key: string, fontData: Uint8Array): Promise<void> {
    await this.init();
    if (this.fonts.has(key)) {
      return;
    }
    const pending = this.fontRegistrations.get(key);
    if (pending) {
      await pending;
      return;
    }

    const registration = (async () => {
      const hb = this.hb!;
      const blob = hb.createBlob(fontData);
      const face = hb.createFace(blob, 0);
      blob.destroy();
      const font = hb.createFont(face);
      face.destroy();
      const existing = this.fonts.get(key);
      if (existing) {
        font.destroy();
        return;
      }
      this.fonts.set(key, font);
    })();
    this.fontRegistrations.set(key, registration);
    try {
      await registration;
    } finally {
      this.fontRegistrations.delete(key);
    }
  }

  async shapeText(
    key: string,
    fontData: Uint8Array,
    text: string,
    direction?: "ltr" | "rtl",
  ): Promise<HbGlyph[]> {
    if (text.length === 0) {
      return [];
    }

    await this.registerFont(key, fontData);

    const hbFont = this.fonts.get(key);
    if (!hbFont) {
      throw new Error(`HarfBuzz font "${key}" is not registered`);
    }

    const buffer = this.hb!.createBuffer();
    try {
      buffer.addText(text);
      if (direction) {
        buffer.setDirection(direction);
      }
      buffer.guessSegmentProperties();
      this.hb!.shape(hbFont, buffer);
      return buffer.json();
    } finally {
      buffer.destroy();
    }
  }

  destroy(): void {
    for (const font of this.fonts.values()) {
      font.destroy();
    }
    this.fonts.clear();
    this.fontRegistrations.clear();
    this.initPromise = null;
    this.hb = null;
  }
}

const defaultManager = new HarfBuzzManager();

export async function shapeTextWithHarfBuzz(
  key: string,
  fontData: Uint8Array,
  text: string,
  direction?: "ltr" | "rtl",
): Promise<HbGlyph[]> {
  return defaultManager.shapeText(key, fontData, text, direction);
}

export function destroyHarfBuzzManager(): void {
  defaultManager.destroy();
}
