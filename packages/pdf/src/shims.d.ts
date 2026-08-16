declare module "subset-font" {
  export interface SubsetFontOptions {
    targetFormat?: "sfnt" | "woff" | "woff2";
  }

  export default function subsetFont(
    font: Buffer | Uint8Array,
    text: string,
    options?: SubsetFontOptions,
  ): Promise<Uint8Array>;
}

declare module "fontkit" {
  export interface FontGlyph {
    advanceWidth: number;
  }

  export interface FontBoundingBox {
    maxX: number;
    maxY: number;
    minX: number;
    minY: number;
  }

  export interface Font {
    ascent: number;
    bbox: FontBoundingBox;
    capHeight?: number;
    descent: number;
    getGlyph(glyphId: number): FontGlyph;
    isMonospace?: boolean;
    italicAngle?: number;
    postscriptName?: string;
    type: string;
    unitsPerEm: number;
  }

  export interface FontCollection {
    fonts: Font[];
  }

  export function create(buffer: Buffer, postscriptName?: string): Font | FontCollection;
}
