import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../../src/index.js";
import { diffNormalizedPackages } from "./helpers/packageDiff.js";

describe("package diff normalization", () => {
  it("ignores volatile core metadata rewrites", async () => {
    const buffer = await PaperEngine.render({
      type: "Document",
      meta: { title: "Package Diff" },
      slides: [{ type: "Slide", children: [{ type: "Text", content: "Hello" }] }],
    });

    const zip = await JSZip.loadAsync(buffer);
    zip.file(
      "docProps/core.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dcterms="http://purl.org/dc/terms/">
        <dcterms:modified>2026-03-13T00:00:00Z</dcterms:modified>
      </cp:coreProperties>`,
    );

    const modified = await zip.generateAsync({ type: "nodebuffer" });
    const diff = await diffNormalizedPackages(buffer, modified);
    expect(diff.passed).toBe(true);
  });

  it("detects meaningful XML changes", async () => {
    const buffer = await PaperEngine.render({
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children: [{ type: "Text", content: "Hello" }] }],
    });

    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    zip.file("ppt/slides/slide1.xml", slideXml.replace("Hello", "Changed"));
    const modified = await zip.generateAsync({ type: "nodebuffer" });

    const diff = await diffNormalizedPackages(buffer, modified);
    expect(diff.passed).toBe(false);
    expect(diff.issues.some((issue) => issue.path === "ppt/slides/slide1.xml")).toBe(true);
  });
});
