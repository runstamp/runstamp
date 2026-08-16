declare module "bidi-js" {
  export interface BidiParagraph {
    end: number;
    level: number;
    start: number;
  }

  export interface BidiEmbeddingLevels {
    levels: Uint8Array;
    paragraphs: BidiParagraph[];
  }

  export default function bidiFactory(): {
    getEmbeddingLevels(text: string, explicitDirection?: "ltr" | "rtl"): BidiEmbeddingLevels;
  };
}
