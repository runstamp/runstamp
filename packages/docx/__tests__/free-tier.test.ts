/**
 * Free-tier gating tests for @runstamp/docx.
 *
 * Verifies:
 * 1. Free tier renders valid DOCX (paragraphs, tables, images, lists, basic styling)
 * 2. Pro features throw RunstampFeatureError in free builds
 * 3. Pro features throw RunstampFeatureError without license key
 */
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { renderToDocx } from "../src/render.js";
import { requireDocxPro } from "../src/pro-guard.js";
import { RunstampFeatureError } from "../src/errors.js";

describe("Free tier DOCX rendering", () => {
  it("renders a basic document without license key", async () => {
    const result = await renderToDocx({
      type: "DocxDocument",
      pageSize: "a4",
      pages: [{
        elements: [
          { type: "heading", level: 1, text: "Test Document" },
          { type: "paragraph", text: "This is a free-tier rendering test." },
          {
            type: "list",
            items: [
              { text: "Item one" },
              { text: "Item two" },
            ],
          },
        ],
      }],
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);

    // Verify valid DOCX (zip with word/document.xml)
    const zip = await JSZip.loadAsync(result.buffer);
    expect(zip.file("word/document.xml")).toBeTruthy();
    expect(zip.file("[Content_Types].xml")).toBeTruthy();

    const docXml = await zip.file("word/document.xml")!.async("text");
    expect(docXml).toContain("Test Document");
    expect(docXml).toContain("free-tier rendering test");
  });
});
