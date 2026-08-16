import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { isPdfError } from "../src/errors.js";

let server: Server | undefined;

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

function tinyPng(): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = pngChunk("IDAT", deflateSync(Buffer.from([0, 30, 80, 120, 255])));
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    idat,
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function imageDocument(source: string | Buffer | Uint8Array) {
  return {
    pages: [
      {
        graphics: [
          {
            format: "png" as const,
            height: 24,
            source,
            type: "image" as const,
            width: 24,
            x: 72,
            y: 680,
          },
        ],
      },
    ],
  };
}

async function localServer(body: Buffer): Promise<string> {
  server = createServer((_request, response) => {
    response.writeHead(200, {
      "content-length": String(body.length),
      "content-type": "image/png",
    });
    response.end(body);
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}/asset.png`;
}

afterEach(async () => {
  if (!server) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => error ? reject(error) : resolve());
  });
  server = undefined;
});

describe("PDF asset loading policy", () => {
  it("loads data URL image sources without treating them as file paths", async () => {
    const source = `data:image/png;base64,${tinyPng().toString("base64")}`;
    const buffer = await PdfEngine.render(imageDocument(source), { deterministic: true });

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("rejects remote image sources unless remote loading is enabled", async () => {
    let thrown: unknown;
    try {
      await PdfEngine.render(imageDocument("https://example.com/image.png"));
    } catch (error) {
      thrown = error;
    }

    expect(isPdfError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "ASSET_SOURCE_REJECTED",
      details: { scheme: "https" },
    });
  });

  it("loads remote image sources only under an explicit bounded policy", async () => {
    const url = await localServer(tinyPng());
    const buffer = await PdfEngine.render(imageDocument(url), {
      assetPolicy: {
        allowRemoteSources: true,
        allowedSchemes: ["http"],
        maxSourceBytes: 1024 * 1024,
        timeoutMs: 1000,
      },
      deterministic: true,
    });

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("enforces asset byte limits before decoding", async () => {
    let thrown: unknown;
    try {
      await PdfEngine.render(imageDocument(tinyPng()), {
        assetPolicy: { maxSourceBytes: 8 },
      });
    } catch (error) {
      thrown = error;
    }

    expect(isPdfError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "ASSET_SOURCE_REJECTED",
    });
  });
});
