import { describe, expect, it } from "vitest";
import {
  adaptSemanticArtifact,
  compareArtifactSources,
  docxInspectionAdapter,
  pptxInspectionAdapter,
  type ControlledDocxDocumentOutput,
  type PptxInspectionOutput,
  type SemanticArtifactSource,
} from "../src/index.js";

async function sha(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", owned.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const features = {
  sections: 1, paragraphs: 1, runs: 1, tables: 0, styles: 1, numberingDefinitions: 0,
  headers: 0, footers: 0, footnotes: 0, endnotes: 0, comments: 0,
  trackedInsertions: 0, trackedDeletions: 0, hyperlinks: 0,
};

async function controlledDocx(versionId: string, text: string): Promise<SemanticArtifactSource<ControlledDocxDocumentOutput>> {
  const sourceBytes = new TextEncoder().encode(`PK-DOCX-${versionId}-${text}`);
  const sourceSha256 = await sha(sourceBytes);
  const inspection = {
    sha256: sourceSha256,
    byteLength: sourceBytes.byteLength,
    entryCount: 6,
    uncompressedBytes: 512,
    partNames: ["word/document.xml"],
    searchableParts: ["word/document.xml"],
    metadataParts: [], mediaParts: [], executableParts: [], oleParts: [], relationships: [], features,
    warnings: [], losses: [],
  };
  const document: ControlledDocxDocumentOutput = {
    schemaVersion: 1,
    artifactId: "contract.docx",
    sourceSha256,
    packageBase64: Buffer.from(sourceBytes).toString("base64"),
    inspection,
    parts: [{ name: "word/document.xml", text, paragraphCount: 1, xml: `<w:p><w:t>${text}</w:t></w:p>` }],
  };
  return { artifactId: "contract.docx", artifactKind: "docx", versionId, inspection: document, sourceBytes, declaredSha256: sourceSha256 };
}

async function pptxInspection(versionId: string, reverse = false): Promise<SemanticArtifactSource<PptxInspectionOutput>> {
  const sourceBytes = new TextEncoder().encode(`PK-PPTX-${versionId}`);
  const sourceSha256 = await sha(sourceBytes);
  const slide = (index: number, part: string, text: string) => ({
    index,
    locator: { artifactId: sourceSha256, scheme: "pptx.slide" as const, value: [part] },
    part,
    text,
    objects: [{ id: "2", kind: "shape" as const, locator: { artifactId: sourceSha256, scheme: "pptx.object" as const, value: [part, "2"] }, name: "Title", slotId: "title", text }],
  });
  const slides = versionId === "v1"
    ? [slide(1, "ppt/slides/slide1.xml", "Revenue"), slide(2, "ppt/slides/slide2.xml", "Appendix")]
    : [slide(2, "ppt/slides/slide2.xml", "Appendix revised"), slide(1, "ppt/slides/slide1.xml", "Revenue")];
  if (!reverse && versionId === "v2") slides.reverse();
  const inspection: PptxInspectionOutput = {
    artifactId: sourceSha256,
    byteLength: sourceBytes.byteLength,
    canonicalPackageHash: (versionId === "v1" ? "a" : "b").repeat(64),
    counts: { charts: 0, comments: 0, layouts: 1, masters: 1, media: 0, notes: 0, objects: 2, placeholders: 2, relationships: 4, slides: 2, tables: 0, themes: 1 },
    losses: [], opaqueParts: [], relationships: [], slides, slots: [],
  };
  return { artifactId: "board.pptx", artifactKind: "pptx", versionId, inspection, sourceBytes, declaredSha256: sourceSha256 };
}

describe("actual A01 controlled DOCX adapter", () => {
  it("consumes ControlledDocxDocument fields and binds text/parts to exact package bytes", async () => {
    const before = await controlledDocx("v1", "Payment is due in 30 days.");
    const after = await controlledDocx("v2", "Payment is due in 15 days.");
    const result = await compareArtifactSources(before, after, docxInspectionAdapter);
    expect(result.changes).toContainEqual(expect.objectContaining({ category: "text", nodeId: "docx-part:word/document.xml" }));
    expect(result.changes.every((change) => ["docx-ooxml-part-v1", "docx-controlled-inspection-v1"].includes(change.locator.scheme))).toBe(true);
    expect(result.beforeVersion.sha256).toBe(before.declaredSha256);
  });

  it("rejects tampered bytes, packageBase64, cross-kind input, budgets, and cancellation", async () => {
    const valid = await controlledDocx("v1", "safe");
    await expect(adaptSemanticArtifact({ ...valid, declaredSha256: "f".repeat(64) }, docxInspectionAdapter)).rejects.toMatchObject({ code: "VERSION_MISMATCH" });
    await expect(adaptSemanticArtifact({ ...valid, inspection: { ...valid.inspection, packageBase64: Buffer.from("stale").toString("base64") } }, docxInspectionAdapter)).rejects.toMatchObject({ code: "VERSION_MISMATCH" });
    await expect(adaptSemanticArtifact({ ...valid, artifactKind: "pptx" }, docxInspectionAdapter)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
    await expect(adaptSemanticArtifact(valid, docxInspectionAdapter, { maxInputBytes: 1 })).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
    const controller = new AbortController(); controller.abort();
    await expect(adaptSemanticArtifact(valid, docxInspectionAdapter, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  });
});

describe("actual A04 PPTX template inspection adapter", () => {
  it("consumes slide index/locator/objects/part/text and detects source-bound moves and edits", async () => {
    const before = await pptxInspection("v1");
    const after = await pptxInspection("v2", true);
    const result = await compareArtifactSources(before, after, pptxInspectionAdapter);
    expect(result.statistics.move).toBeGreaterThan(0);
    expect(result.statistics.text).toBeGreaterThan(0);
    expect(result.statistics.data).toBeGreaterThan(0);
    expect(result.changes.every((change) => ["pptx.slide", "pptx.object", "pptx.part"].includes(change.locator.scheme))).toBe(true);
  });

  it("preserves an index-only revision as data without destabilizing part alignment", async () => {
    const before = await pptxInspection("v1");
    const afterInspection = structuredClone(before.inspection);
    afterInspection.slides[0]!.index = 999;
    const after = { ...before, versionId: "v2", inspection: afterInspection };
    const beforeDocument = await adaptSemanticArtifact(before, pptxInspectionAdapter);
    const afterDocument = await adaptSemanticArtifact(after, pptxInspectionAdapter);
    const beforeSlide = beforeDocument.nodes[1]!;
    const afterSlide = afterDocument.nodes[1]!;

    expect(beforeSlide.data).toEqual({ index: 1, part: "ppt/slides/slide1.xml" });
    expect(afterSlide.data).toEqual({ index: 999, part: "ppt/slides/slide1.xml" });
    expect(afterSlide.id).toBe(beforeSlide.id);
    expect(afterSlide.locator).toEqual(beforeSlide.locator);
    const result = await compareArtifactSources(before, after, pptxInspectionAdapter);
    expect(result.changes).toEqual([expect.objectContaining({ category: "data", nodeId: "pptx-slide:ppt/slides/slide1.xml", before: { index: 1, part: "ppt/slides/slide1.xml" }, after: { index: 999, part: "ppt/slides/slide1.xml" } })]);
  });

  it("keeps generated slide indexes collision-free and rejects cross-artifact comparison", async () => {
    for (let generatedIndex = 0; generatedIndex < 50; generatedIndex += 1) {
      const source = await pptxInspection("v1");
      source.inspection.slides[0]!.index = generatedIndex;
      source.inspection.slides[1]!.index = generatedIndex;
      const document = await adaptSemanticArtifact(source, pptxInspectionAdapter);
      expect(document.nodes.slice(1).map((entry) => entry.id)).toEqual([
        "pptx-slide:ppt/slides/slide1.xml",
        "pptx-slide:ppt/slides/slide2.xml",
      ]);
      expect(document.nodes.slice(1).map((entry) => entry.data)).toEqual([
        { index: generatedIndex, part: "ppt/slides/slide1.xml" },
        { index: generatedIndex, part: "ppt/slides/slide2.xml" },
      ]);
    }
    const before = await pptxInspection("v1");
    const after = await pptxInspection("v2");
    after.artifactId = "other-board.pptx";
    await expect(compareArtifactSources(before, after, pptxInspectionAdapter)).rejects.toMatchObject({ code: "VERSION_MISMATCH" });
  });

  it("rejects a stale real inspection artifactId and object locator", async () => {
    const valid = await pptxInspection("v1");
    await expect(adaptSemanticArtifact({ ...valid, inspection: { ...valid.inspection, artifactId: "f".repeat(64) } }, pptxInspectionAdapter)).rejects.toMatchObject({ code: "VERSION_MISMATCH" });
    const stale = structuredClone(valid.inspection);
    stale.slides[0]!.objects[0]!.locator.artifactId = "f".repeat(64);
    await expect(adaptSemanticArtifact({ ...valid, inspection: stale }, pptxInspectionAdapter)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
  });
});
