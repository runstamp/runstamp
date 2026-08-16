declare module "subset-font" {
  export interface SubsetFontVariationAxisRange {
    default?: number;
    max: number;
    min: number;
  }

  export interface SubsetFontOptions {
    noLayoutClosure?: boolean;
    preserveNameIds?: number[];
    targetFormat?: string;
    variationAxes?: Record<string, number | SubsetFontVariationAxisRange>;
  }

  export default function subsetFont(
    originalFont: Buffer | Uint8Array | ArrayBuffer,
    text: string,
    options?: SubsetFontOptions,
  ): Promise<Uint8Array>;
}

declare module "fontkit" {
  interface Font {
    isMonospace?: boolean;
  }

  interface Glyph {
    advanceWidth: number;
  }

  interface FontCollection {
    fonts: Font[];
  }

  export const create: (
    buffer: Buffer,
    postscriptName?: string,
  ) => Font | FontCollection;

  const _default: {
    create(buffer: Buffer, postscriptName?: string): Font | FontCollection;
  };
  export default _default;
}
