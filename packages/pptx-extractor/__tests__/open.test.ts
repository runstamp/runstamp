import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { openPptx } from "../src/open.js";

async function buildMinimalPptx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("ppt/presentation.xml", "<presentation/>");
  zip.file("ppt/slides/slide1.xml", "<slide/>");
  zip.file("docProps/core.xml", "<core/>");
  return await zip.generateAsync({ type: "nodebuffer" });
}

describe("openPptx", () => {
  it("loads parts from a minimal PPTX-like ZIP", async () => {
    const buf = await buildMinimalPptx();
    const opened = await openPptx(buf);

    expect(opened.hasPart("[Content_Types].xml")).toBe(true);
    expect(opened.hasPart("ppt/presentation.xml")).toBe(true);
    expect(opened.hasPart("ppt/slides/slide1.xml")).toBe(true);
    expect(opened.hasPart("missing.xml")).toBe(false);
  });

  it("returns parts as utf8 text via getPartText", async () => {
    const buf = await buildMinimalPptx();
    const opened = await openPptx(buf);
    expect(opened.getPartText("ppt/presentation.xml")).toBe("<presentation/>");
    expect(opened.getPartText("missing.xml")).toBeUndefined();
  });

  it("listParts returns sorted paths", async () => {
    const buf = await buildMinimalPptx();
    const opened = await openPptx(buf);
    const parts = opened.listParts();
    const sorted = [...parts].sort();
    expect(parts).toEqual(sorted);
  });

  it("rejects archives exceeding the entry-count limit", async () => {
    const buf = await buildMinimalPptx();
    await expect(openPptx(buf, { maxEntries: 2 })).rejects.toThrow(/exceeding the limit of 2/);
  });

  it("rejects archives exceeding the total uncompressed size limit", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    zip.file("ppt/media/blob.bin", Buffer.alloc(64 * 1024, 0));
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    await expect(
      openPptx(buf, { maxTotalUncompressedBytes: 1024 }),
    ).rejects.toThrow(/total uncompressed size exceeded/);
  });

  it("accepts archives within explicit limits", async () => {
    const buf = await buildMinimalPptx();
    const opened = await openPptx(buf, { maxEntries: 100, maxTotalUncompressedBytes: 1024 * 1024 });
    expect(opened.hasPart("[Content_Types].xml")).toBe(true);
  });
});
