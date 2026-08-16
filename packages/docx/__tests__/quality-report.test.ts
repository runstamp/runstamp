import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { renderToDocx, renderToDocxWithQuality } from "../src/render.js";
import { DocxQualityGate, checkDocxQuality, runDocxQualityGate } from "../src/quality/index.js";

describe("renderToDocxWithQuality", () => {
  async function makeQualityGateSeedPackage(): Promise<{
    buffer: Buffer;
    stats: Awaited<ReturnType<typeof renderToDocx>>["stats"];
  }> {
    const rendered = await renderToDocx({
      type: "DocxDocument",
      pages: [{
        elements: [
          { type: "paragraph", text: "Release blocker seed." },
          { type: "list", listType: "bullet", items: [{ text: "Numbered dependency" }] },
          {
            type: "image",
            src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=",
            alt: "pixel",
            width: 72,
            height: 72,
          },
        ],
      }],
    });
    return { buffer: rendered.buffer, stats: rendered.stats };
  }

  async function mutateSeedPackage(
    mutate: (zip: JSZip, documentXml: string, relationshipXml: string) => void | Promise<void>,
  ): Promise<{ buffer: Buffer; stats: Awaited<ReturnType<typeof renderToDocx>>["stats"] }> {
    const seed = await makeQualityGateSeedPackage();
    const zip = await JSZip.loadAsync(seed.buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const relationshipXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
    await mutate(zip, documentXml, relationshipXml);
    return {
      buffer: await zip.generateAsync({ type: "nodebuffer" }),
      stats: seed.stats,
    };
  }

  it("returns a shared quality report alongside the DOCX buffer", async () => {
    const result = await renderToDocxWithQuality({
      type: "DocxDocument",
      pages: [
        {
          elements: [
            { type: "heading", level: 1, text: "Quality Check" },
            { type: "paragraph", text: "Hello from Runstamp." },
          ],
        },
      ],
    });

    expect(result.output).toBeInstanceOf(Buffer);
    expect(result.output.length).toBeGreaterThan(0);
    expect(result.quality.verdict).toMatch(/native_editable|editable_with_constraints|visual_fallback|rejected/);
    expect(Array.isArray(result.quality.findings)).toBe(true);
    expect(result.quality.autoFixesApplied).toBeGreaterThanOrEqual(0);
  });

  it("accepts native comment range markers emitted as paragraph siblings", async () => {
    const result = await renderToDocxWithQuality({
      type: "DocxDocument",
      pages: [{
        elements: [{
          type: "paragraph",
          text: "Comment anchor",
          comment: {
            id: 7,
            text: "Review this clause.",
            author: "Reviewer",
            initials: "RV",
            date: "2026-05-13T00:00:00Z",
          },
        }],
      }],
    });

    expect(result.quality.verdict).not.toBe("rejected");
    expect(result.quality.findings.map((finding) => finding.code))
      .not.toContain("SHARED_XML_PARSE_FAILURE");
  });

  it("exposes a unified DocxQualityGate contract with artifact hashes", async () => {
    const rendered = await renderToDocx({
      type: "DocxDocument",
      pages: [{ elements: [{ type: "paragraph", text: "Gate me." }] }],
    });

    const gate = await DocxQualityGate.run({
      buffer: rendered.buffer,
      renderStats: rendered.stats,
      expectedSemanticManifest: {
        id: "clean-gate-fixture",
        forbiddenFindingCodes: ["DOCX_RELATIONSHIP_TARGET_MISSING"],
      },
    });

    expect(gate.accepted).toBe(true);
    expect(gate.rejected).toBe(false);
    expect(gate.verdict).toBe(gate.quality.verdict);
    expect(gate.findings).toBe(gate.quality.findings);
    expect(gate.repairs).toBe(gate.quality.repairLog);
    expect(gate.strictValidation.ok).toBe(true);
    expect(gate.sidecars.manifest.accepted).toBe(true);
    expect(gate.artifactHashes.inputSha256).toHaveLength(64);
    expect(gate.artifactHashes.outputSha256).toHaveLength(64);
    expect(gate.artifactHashes.qualitySha256).toHaveLength(64);
    expect(gate.artifactHashes.manifestSha256).toHaveLength(64);
  });

  it("rejects packages that fail strict validation through the quality gate", async () => {
    const rendered = await renderToDocx({
      type: "DocxDocument",
      pages: [{ elements: [{ type: "paragraph", text: "Negative tabs are repair-risky." }] }],
    });
    const zip = await JSZip.loadAsync(rendered.buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    zip.file(
      "word/document.xml",
      documentXml.replace(
        "</w:body>",
        '<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="-12"/></w:tabs></w:pPr><w:r><w:t>Bad tab</w:t></w:r></w:p></w:body>',
      ),
    );

    const gate = await runDocxQualityGate({
      buffer: await zip.generateAsync({ type: "nodebuffer" }),
      renderStats: rendered.stats,
    });

    expect(gate.accepted).toBe(false);
    expect(gate.rejected).toBe(true);
    expect(gate.strictValidation.ok).toBe(false);
    expect(gate.strictValidation.issues.map((issue) => issue.code)).toContain("DOCX_TAB_NEGATIVE");
  });

  it("catches selected release-blocking seeded corruptions through DocxQualityGate", async () => {
    const cases = [
      {
        name: "missing content type override target",
        expectedCode: "DOCX_CONTENT_TYPES_OVERRIDE_MISSING",
        mutate: (zip: JSZip) => {
          const contentTypes = zip.file("[Content_Types].xml")!;
          return contentTypes.async("string").then((xml) => {
            zip.file(
              "[Content_Types].xml",
              xml.replace(
                "</Types>",
                '<Override PartName="/word/missing-release-blocker.xml" ContentType="application/xml"/></Types>',
              ),
            );
          });
        },
      },
      {
        name: "missing relationship target",
        expectedCode: "DOCX_RELATIONSHIP_TARGET_MISSING",
        mutate: (zip: JSZip, _documentXml: string, relationshipXml: string) => {
          zip.file(
            "word/_rels/document.xml.rels",
            relationshipXml.replace(/Target="media\/[^"]+"/, 'Target="media/missing-release-blocker.png"'),
          );
        },
      },
      {
        name: "duplicate relationship id",
        expectedCode: "SHARED_RID_NOT_UNIQUE",
        mutate: (zip: JSZip, _documentXml: string, relationshipXml: string) => {
          const duplicate = relationshipXml.match(/<Relationship\b[^>]*\/>/)?.[0];
          expect(duplicate).toBeDefined();
          zip.file(
            "word/_rels/document.xml.rels",
            relationshipXml.replace("</Relationships>", `${duplicate}</Relationships>`),
          );
        },
      },
      {
        name: "missing numbering definition",
        expectedCode: "DOCX_NUMBERING_DEF_MISSING",
        mutate: (zip: JSZip) => {
          zip.remove("word/numbering.xml");
        },
      },
      {
        name: "broken style reference",
        expectedCode: "DOCX_STYLE_REF_MISSING",
        mutate: (zip: JSZip, documentXml: string) => {
          zip.file(
            "word/document.xml",
            documentXml.replace("<w:p>", '<w:p><w:pPr><w:pStyle w:val="MissingReleaseBlockerStyle"/></w:pPr>'),
          );
        },
      },
      {
        name: "malformed tracked change metadata",
        expectedCode: "DOCX_TRACKED_CHANGE_MALFORMED",
        mutate: (zip: JSZip, documentXml: string) => {
          zip.file(
            "word/document.xml",
            documentXml.replace("</w:body>", "<w:ins><w:r><w:t>Tracked</w:t></w:r></w:ins></w:body>"),
          );
        },
      },
      {
        name: "broken image reference",
        expectedCode: "DOCX_IMAGE_REF_MISSING",
        mutate: (zip: JSZip, documentXml: string) => {
          zip.file("word/document.xml", documentXml.replace(/r:embed="[^"]+"/, 'r:embed="rIdMissingImage"'));
        },
      },
    ];

    for (const testCase of cases) {
      const corrupted = await mutateSeedPackage(testCase.mutate);
      const gate = await runDocxQualityGate({
        buffer: corrupted.buffer,
        renderStats: corrupted.stats,
      });
      const observedCodes = [
        ...gate.findings.map((finding) => finding.code),
        ...gate.strictValidation.issues.map((issue) => issue.code),
      ];

      expect(observedCodes, testCase.name).toContain(testCase.expectedCode);
    }
  });

  it("detects and repairs malformed tracked changes and broken content controls", async () => {
    const rendered = await renderToDocx({
      type: "DocxDocument",
      pages: [{ elements: [{ type: "paragraph", text: "Hello" }] }],
    });
    const zip = await JSZip.loadAsync(rendered.buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    zip.file(
      "word/document.xml",
      documentXml.replace(
        "</w:body>",
        `<w:sdt><w:sdtPr><w:tag w:val="broken"/></w:sdtPr></w:sdt><w:ins><w:r><w:t>Tracked</w:t></w:r></w:ins></w:body>`,
      ),
    );

    const result = await checkDocxQuality(await zip.generateAsync({ type: "nodebuffer" }), 5);
    const codes = result.quality.findings.map((finding) => finding.code);

    expect(codes).toContain("DOCX_TRACKED_CHANGE_MALFORMED");
    expect(codes).toContain("DOCX_CONTENT_CONTROL_REF_BROKEN");
    expect(result.quality.repairLog.some((entry) => entry.finding === "DOCX_TRACKED_CHANGE_MALFORMED")).toBe(true);
    expect(result.quality.repairLog.some((entry) => entry.finding === "DOCX_CONTENT_CONTROL_REF_BROKEN")).toBe(true);
  });

  it("makes repaired quality-gate output idempotent", async () => {
    const rendered = await renderToDocx({
      type: "DocxDocument",
      pages: [{ elements: [{ type: "paragraph", text: "Hello" }] }],
    });
    const zip = await JSZip.loadAsync(rendered.buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    zip.file(
      "word/document.xml",
      documentXml.replace(
        "</w:body>",
        `<w:sdt><w:sdtPr><w:tag w:val="broken"/></w:sdtPr></w:sdt><w:ins><w:r><w:t>Tracked</w:t></w:r></w:ins></w:body>`,
      ),
    );

    const first = await runDocxQualityGate({
      buffer: await zip.generateAsync({ type: "nodebuffer" }),
      renderStats: rendered.stats,
    });
    const second = await runDocxQualityGate({
      buffer: first.output,
      renderStats: rendered.stats,
    });

    expect(first.repairs.length).toBeGreaterThan(0);
    expect(second.repairs).toHaveLength(0);
    expect(Buffer.compare(first.output, second.output)).toBe(0);
    expect(second.artifactHashes.outputSha256).toBe(first.artifactHashes.outputSha256);
  });

  it("accepts valid image relationships regardless of OOXML attribute order", async () => {
    const rendered = await renderToDocx({
      type: "DocxDocument",
      pages: [{
        elements: [
          { type: "paragraph", text: "Before image" },
          {
            type: "image",
            src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=",
            alt: "pixel",
            width: 72,
            height: 72,
          },
          { type: "paragraph", text: "After image" },
        ],
      }],
    });

    const result = await checkDocxQuality(rendered.buffer, rendered.stats.renderTimeMs);

    expect(result.quality.findings.map((finding) => finding.code)).not.toContain("DOCX_IMAGE_REF_MISSING");
    expect(result.quality.verdict).not.toBe("rejected");
  });

  it("treats release-gating content warnings as editable constraints", async () => {
    const result = await renderToDocxWithQuality({
      type: "DocxDocument",
      pages: [{
        elements: [
          { type: "paragraph", text: "A".repeat(1300) },
        ],
      }],
    });

    const overflow = result.quality.findings.find((finding) => finding.code === "DOCX_PARAGRAPH_OVERFLOW");
    expect(overflow?.severity).toBe("warning");
    expect(result.quality.verdict).toBe("editable_with_constraints");
    expect(result.quality.repairRisk).toBe("medium");
  });
});
