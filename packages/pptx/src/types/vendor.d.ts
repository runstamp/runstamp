// src/types/vendor.d.ts — Ambient type declarations for untyped CJS packages

export interface HbGlyph {
  g: number;
  cl: number;
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  flags: number;
}

export interface HbBuffer {
  addText(text: string): void;
  guessSegmentProperties(): void;
  setDirection(dir: "ltr" | "rtl" | "ttb" | "btt"): void;
  setScript(script: string): void;
  setLanguage(language: string): void;
  json(): HbGlyph[];
  reset(): void;
  destroy(): void;
}

export interface HbFont {
  getUpem(): number;
  destroy(): void;
}

export interface HbFace {
  destroy(): void;
}

export interface HbBlob {
  destroy(): void;
}

export interface HbApiInstance {
  createBlob(data: Uint8Array): HbBlob;
  createFace(blob: HbBlob, index: number): HbFace;
  createFont(face: HbFace): HbFont;
  createBuffer(): HbBuffer;
  shape(font: HbFont, buf: HbBuffer): void;
}
