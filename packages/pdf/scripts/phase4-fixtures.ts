import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { PdfDocumentPhase2 } from "../src/engine.js";

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSmallJpegBuffer(): Buffer {
  const width = 40;
  const height = 30;
  const data = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = x * 6;
      data[offset + 1] = y * 8;
      data[offset + 2] = 180;
      data[offset + 3] = 255;
    }
  }

  return Buffer.from(jpeg.encode({ data, width, height }, 88).data);
}

export const createPhase4SmallJpegBuffer = createSmallJpegBuffer;

export function createLargeJpegBuffer(): Buffer {
  const random = mulberry32(42);
  let width = 768;
  let height = 768;

  while (true) {
    const data = Buffer.alloc(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      data[offset] = Math.floor(random() * 256);
      data[offset + 1] = Math.floor(random() * 256);
      data[offset + 2] = Math.floor(random() * 256);
      data[offset + 3] = 255;
    }

    const encoded = Buffer.from(jpeg.encode({ data, width, height }, 88).data);
    if (encoded.length >= 500_000) {
      return encoded;
    }

    width += 64;
    height += 64;
  }
}

export const createPhase4LargeJpegBuffer = createLargeJpegBuffer;

export function createAlphaPngBuffer(): Buffer {
  const png = new PNG({ width: 64, height: 64 });

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (png.width * y + x) * 4;
      png.data[offset] = 255;
      png.data[offset + 1] = 40;
      png.data[offset + 2] = 40;
      const dx = x - 32;
      const dy = y - 32;
      png.data[offset + 3] = dx * dx + dy * dy <= 24 * 24 ? 160 : 0;
    }
  }

  return PNG.sync.write(png);
}

export const createPhase4PngAlphaBuffer = createAlphaPngBuffer;

export function createSvgSample(): string {
  return [
    '<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">',
    '<rect x="4" y="4" width="40" height="24" fill="#0d9488" />',
    '<line x1="8" y1="72" x2="112" y2="8" stroke="#1d4ed8" stroke-width="4" />',
    '<polyline points="10,50 30,38 50,46 70,24 90,34 110,18" stroke="#9333ea" stroke-width="3" fill="none" />',
    '<circle cx="88" cy="56" r="14" fill="#f97316" />',
    '<path d="M20 62 Q40 10 60 62 Z" fill="#ef4444" />',
    '</svg>',
  ].join("");
}

export const createPhase4SvgFixture = createSvgSample;

export function createRectFillDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 100,
            y: 500,
            width: 120,
            height: 80,
            fill: {
              color: { space: "rgb", r: 0.85, g: 0.2, b: 0.2 },
              space: "solid",
            },
          },
        ],
      },
    ],
  };
}

export function createRoundedRectDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 80,
            y: 500,
            width: 120,
            height: 80,
            radius: 8,
            fill: {
              color: { space: "rgb", r: 0.16, g: 0.56, b: 0.96 },
              space: "solid",
            },
          },
        ],
      },
    ],
  };
}

export function createBorderStylesDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 72,
            y: 640,
            width: 100,
            height: 40,
            stroke: { color: { space: "rgb", r: 0, g: 0, b: 0 }, style: "solid", width: 2 },
          },
          {
            type: "rect",
            x: 72,
            y: 580,
            width: 100,
            height: 40,
            stroke: { color: { space: "rgb", r: 0.1, g: 0.1, b: 0.7 }, style: "dashed", width: 2 },
          },
          {
            type: "rect",
            x: 72,
            y: 520,
            width: 100,
            height: 40,
            stroke: { color: { space: "rgb", r: 0.7, g: 0.1, b: 0.1 }, style: "dotted", width: 2 },
          },
        ],
      },
    ],
  };
}

export function createOpacityDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 72,
            y: 500,
            width: 120,
            height: 80,
            fill: {
              color: { space: "rgb", r: 0, g: 0, b: 1 },
              space: "solid",
            },
          },
          {
            type: "rect",
            x: 72,
            y: 500,
            width: 120,
            height: 80,
            fill: {
              color: { space: "rgb", r: 1, g: 0, b: 0 },
              opacity: 0.5,
              space: "solid",
            },
          },
        ],
      },
    ],
  };
}

export function createCmykDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 72,
            y: 500,
            width: 100,
            height: 80,
            fill: {
              color: { space: "cmyk", c: 0.1, m: 0.8, y: 0.2, k: 0 },
              space: "solid",
            },
          },
        ],
      },
    ],
  };
}

export function createJpegDocument(buffer: Buffer): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "image",
            format: "jpeg",
            source: buffer,
            x: 72,
            y: 520,
            width: 160,
            height: 120,
          },
        ],
      },
    ],
  };
}

export function createPngAlphaDocument(buffer: Buffer): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 72,
            y: 500,
            width: 160,
            height: 120,
            fill: {
              color: { space: "rgb", r: 0.1, g: 0.35, b: 0.85 },
              space: "solid",
            },
          },
          {
            type: "image",
            format: "png",
            source: buffer,
            x: 88,
            y: 516,
            width: 96,
            height: 96,
          },
        ],
      },
    ],
  };
}

export const createPngDocument = createPngAlphaDocument;

export function createSvgDocument(svg: string): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "svg",
            source: svg,
            x: 72,
            y: 480,
            width: 240,
            height: 160,
          },
        ],
      },
    ],
  };
}

export function createLinearGradientDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 72,
            y: 500,
            width: 180,
            height: 90,
            fill: {
              space: "linear-gradient",
              startX: 72,
              startY: 500,
              endX: 252,
              endY: 500,
              stops: [
                { offset: 0, color: { space: "rgb", r: 0.05, g: 0.3, b: 0.9 } },
                { offset: 1, color: { space: "rgb", r: 0.95, g: 0.2, b: 0.2 } },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function createRadialGradientDocument(): PdfDocumentPhase2 {
  return {
    pages: [
      {
        graphics: [
          {
            type: "rect",
            x: 72,
            y: 500,
            width: 180,
            height: 90,
            fill: {
              space: "radial-gradient",
              startX: 162,
              startY: 545,
              startRadius: 4,
              endX: 162,
              endY: 545,
              endRadius: 70,
              stops: [
                { offset: 0, color: { space: "rgb", r: 1, g: 0.95, b: 0.4 } },
                { offset: 1, color: { space: "rgb", r: 0.2, g: 0.1, b: 0.7 } },
              ],
            },
          },
        ],
      },
    ],
  };
}
