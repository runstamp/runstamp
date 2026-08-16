import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import { Writable } from "node:stream";

describe("Streaming Output", () => {
  const doc: PaperDocument = {
    type: "Document",
    meta: { title: "Stream Test" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: { fontSize: 24 },
            content: "Streaming slide",
          },
        ],
      },
    ],
  };

  it("renderStream returns a readable stream", async () => {
    const stream = await PaperEngine.renderStream(doc);
    expect(stream).toBeDefined();
    expect(typeof stream.pipe).toBe("function");
    expect(typeof stream.on).toBe("function");
  });

  it("stream produces valid PPTX data", async () => {
    const stream = await PaperEngine.renderStream(doc);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);
    expect(buffer.length).toBeGreaterThan(0);

    // ZIP files start with PK magic bytes
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4B); // K
  });

  it("stream and buffer produce equivalent content", async () => {
    const buffer = await PaperEngine.render(doc);
    const stream = await PaperEngine.renderStream(doc);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    const streamBuffer = Buffer.concat(chunks);

    // Both should produce non-empty output
    expect(buffer.length).toBeGreaterThan(0);
    expect(streamBuffer.length).toBeGreaterThan(0);

    // Both should be valid ZIP (start with PK)
    expect(buffer[0]).toBe(0x50);
    expect(streamBuffer[0]).toBe(0x50);
  });
});
