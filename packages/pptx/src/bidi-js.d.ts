declare module "bidi-js" {
  export default function bidiFactory(): {
    getEmbeddingLevels(
      text: string,
      explicitDirection?: "ltr" | "rtl",
    ): {
      levels: Uint8Array;
      paragraphs: Array<{ start: number; end: number; level: number }>;
    };
  };
}
