import { PNG } from "pngjs";
import type { PdfRenderedPage } from "../src/pdf-renderer.js";
import type { PdfDocumentPhase3 } from "../src/engine.js";

function repeatedWords(count: number): string {
  return Array.from({ length: count }, (_, index) => `token${index % 400}`).join(" ");
}

function createSharedLogo(): Buffer {
  const png = new PNG({ colorType: 6, height: 18, width: 18 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (png.width * y + x) * 4;
      png.data[offset] = 24;
      png.data[offset + 1] = 96 + (x * 4);
      png.data[offset + 2] = 180;
      png.data[offset + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

export function createPerformancePages(pageCount: number): PdfRenderedPage[] {
  const sharedLogo = createSharedLogo();

  return Array.from({ length: pageCount }, (_, index) => ({
    graphics: index % 25 === 0
      ? [{
          format: "png" as const,
          height: 18,
          opacity: 1,
          source: sharedLogo,
          type: "image" as const,
          width: 18,
          x: 520,
          y: 744,
        }]
      : [],
    height: 792,
    texts: [
      {
        font: "Helvetica",
        fontSize: 14,
        value: `Performance Page ${index + 1}`,
        x: 72,
        y: 720,
      },
      {
        font: "Helvetica",
        fontSize: 11,
        value: "Streaming and scale benchmark payload",
        x: 72,
        y: 700,
      },
    ],
    width: 612,
  }));
}

export function createStreamingDocument(pageTarget = 160): PdfDocumentPhase3 {
  return {
    meta: {
      title: "Phase 9 Streaming",
    },
    page: {
      margin: 72,
      size: "Letter",
    },
    children: [
      {
        level: 1,
        type: "heading",
        value: "Phase 9 Streaming Document",
      },
      {
        type: "paragraph",
        value: repeatedWords(pageTarget * 360),
      },
    ],
  };
}

export function createLinearizedDocument(): PdfDocumentPhase3 {
  return {
    meta: {
      title: "Phase 9 Linearized",
    },
    page: {
      margin: 72,
      size: "Letter",
    },
    children: [
      {
        level: 1,
        type: "heading",
        value: "Linearized Output",
      },
      {
        type: "paragraph",
        value: repeatedWords(4200),
      },
    ],
  };
}
