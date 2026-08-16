import { once } from "node:events";
import { spawnSync } from "node:child_process";
import { PdfEngine } from "../src/engine.js";
import { linearizePdfBuffer } from "../src/phase9-stream.js";
import { createLinearizedDocument, createStreamingDocument } from "../scripts/phase9-fixtures.js";

function hasQpdf(): boolean {
  return spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
}

async function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  stream.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  await once(stream, "end");
  return Buffer.concat(chunks);
}

describe("Phase 9 streaming", () => {
  it("renderStream matches render output bytes", async () => {
    const document = createStreamingDocument(40);
    const buffer = await PdfEngine.render(document);
    const streamed = await collectStream(PdfEngine.renderStream(document));

    expect(Buffer.compare(buffer, streamed)).toBe(0);
  });

  it("emits data before the stream finishes", async () => {
    const stream = PdfEngine.renderStream(createStreamingDocument(120));
    const firstChunkPromise = once(stream, "data");
    const endPromise = once(stream, "end");

    const [firstChunk] = await firstChunkPromise;
    expect((firstChunk as Buffer).length).toBeGreaterThan(0);

    await endPromise;
  });

  it("can linearize rendered PDF output when qpdf is available", async () => {
    if (!hasQpdf()) {
      return;
    }

    const buffer = await PdfEngine.render(createLinearizedDocument());
    const linearized = await linearizePdfBuffer(buffer);

    expect(linearized.toString("latin1")).toContain("/Linearized");
  });
});
