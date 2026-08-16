import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { openPptx } from "../src/open.js";
import { listSlideParts, assertValidPptx } from "../src/parts.js";

async function buildPptx(slideCount: number): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("ppt/presentation.xml", "<presentation/>");
  for (let i = 1; i <= slideCount; i++) {
    zip.file(`ppt/slides/slide${i}.xml`, `<slide n="${i}"/>`);
  }
  return await zip.generateAsync({ type: "nodebuffer" });
}

describe("listSlideParts", () => {
  it("returns slide parts in numeric order", async () => {
    const buf = await buildPptx(12);
    const opened = await openPptx(buf);
    const slides = listSlideParts(opened);
    expect(slides).toEqual([
      "ppt/slides/slide1.xml",
      "ppt/slides/slide2.xml",
      "ppt/slides/slide3.xml",
      "ppt/slides/slide4.xml",
      "ppt/slides/slide5.xml",
      "ppt/slides/slide6.xml",
      "ppt/slides/slide7.xml",
      "ppt/slides/slide8.xml",
      "ppt/slides/slide9.xml",
      "ppt/slides/slide10.xml",
      "ppt/slides/slide11.xml",
      "ppt/slides/slide12.xml",
    ]);
  });
});

describe("assertValidPptx", () => {
  it("passes for a PPTX with required parts", async () => {
    const buf = await buildPptx(1);
    const opened = await openPptx(buf);
    expect(() => assertValidPptx(opened)).not.toThrow();
  });

  it("throws when ppt/presentation.xml is missing", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const opened = await openPptx(buf);
    expect(() => assertValidPptx(opened)).toThrow(/ppt\/presentation\.xml/);
  });

  it("throws when [Content_Types].xml is missing", async () => {
    const zip = new JSZip();
    zip.file("ppt/presentation.xml", "<presentation/>");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const opened = await openPptx(buf);
    expect(() => assertValidPptx(opened)).toThrow(/Content_Types/);
  });
});
