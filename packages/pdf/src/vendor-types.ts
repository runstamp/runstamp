export interface HbGlyph {
  ax: number;
  ay: number;
  cl: number;
  dx: number;
  dy: number;
  flags: number;
  g: number;
}

export interface HbBuffer {
  addText(text: string): void;
  destroy(): void;
  guessSegmentProperties(): void;
  json(): HbGlyph[];
  reset(): void;
  setDirection(dir: "ltr" | "rtl" | "ttb" | "btt"): void;
  setLanguage(language: string): void;
  setScript(script: string): void;
}

export interface HbFont {
  destroy(): void;
  getUpem(): number;
}

export interface HbFace {
  destroy(): void;
}

export interface HbBlob {
  destroy(): void;
}

export interface HbApiInstance {
  createBlob(data: Uint8Array): HbBlob;
  createBuffer(): HbBuffer;
  createFace(blob: HbBlob, index: number): HbFace;
  createFont(face: HbFace): HbFont;
  shape(font: HbFont, buffer: HbBuffer): void;
}
