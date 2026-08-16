import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import { loadFontSourceBuffer, MAX_FONT_FILE_SIZE, MAX_PDF_FONT_SOURCE_BYTES } from "../src/font-source.js";
import { MAX_IMAGE_PIXELS, preparePdfImage } from "../src/image-embedding.js";
import { PdfEngine } from "../src/engine.js";

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createOversizedPngHeader(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  // One tiny scanline is enough for parser smoke; preparePdfImage should reject
  // from IHDR dimensions before attempting a full decode.
  const idat = pngChunk("IDAT", deflateSync(Buffer.from([0, 255, 255, 255, 255])));
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    idat,
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("PDF resource guards", () => {
  it("rejects oversized font buffers before embedding", async () => {
    await expect(
      loadFontSourceBuffer(Buffer.alloc(MAX_PDF_FONT_SOURCE_BYTES + 1)),
    ).rejects.toThrow(/Font source exceeds/);
  });

  it("rejects oversized font files before reading them into memory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "json-to-pdf-font-guard-"));
    const path = join(dir, "too-large.ttf");

    try {
      await writeFile(path, Buffer.alloc(MAX_FONT_FILE_SIZE + 1));
      await expect(loadFontSourceBuffer(path)).rejects.toThrow(/Font source exceeds/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("adds font family and source kind context to font loading errors", async () => {
    const missingPath = join(tmpdir(), "json-to-pdf-missing-font.ttf");

    await expect(PdfEngine.render({
      pages: [
        {
          text: {
            font: { family: "Missing Audit Font", source: missingPath },
            fontSize: 12,
            value: "missing font",
          },
        },
      ],
    })).rejects.toThrow(/file font source family "Missing Audit Font".*json-to-pdf-missing-font\.ttf/);
  });

  it("rejects oversized image buffers before decoding", async () => {
    await expect(
      preparePdfImage(Buffer.alloc(64 * 1024 * 1024 + 1), "png"),
    ).rejects.toThrow(/exceeds/);
  });

  it("rejects decoded images whose pixel area exceeds the limit", async () => {
    await expect(preparePdfImage(createOversizedPngHeader(10_000, 5_001), "png")).rejects.toThrow(
      new RegExp(`${MAX_IMAGE_PIXELS}`),
    );
  });

  it("rejects deeply nested container trees before layout recursion", async () => {
    let current: any = {
      type: "paragraph",
      value: "deep",
    };

    for (let index = 0; index < 101; index += 1) {
      current = {
        type: "container",
        children: [current],
      };
    }

    await expect(
      PdfEngine.render({
        children: [current],
      } as any),
    ).rejects.toThrow(/maximum depth/i);
  });
});
