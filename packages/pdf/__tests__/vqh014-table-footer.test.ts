import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";

function hasPdftotext(): boolean {
  return spawnSync("which", ["pdftotext"], { stdio: "ignore" }).status === 0;
}

function extractPageTexts(pdf: Buffer, name: string): string[] {
  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-vqh014-"));
  const pdfPath = join(tempDir, name);

  try {
    writeFileSync(pdfPath, pdf);
    return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
      encoding: "utf8",
      stdio: "pipe",
    })
      .split("\f")
      .map((page) => page.trim())
      .filter((page) => page.length > 0);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function cell(value: string, minHeight?: number) {
  return {
    children: [{ type: "paragraph" as const, value }],
    style: minHeight === undefined ? undefined : { minHeight },
  };
}

function occurrences(text: string, value: string): number {
  return text.split(value).length - 1;
}

describe.skipIf(!hasPdftotext())("VQH-014 table footer rendering", () => {
  it("renders a single-page header, body, and footer exactly once", async () => {
    const pdf = await PdfEngine.render({
      page: { margin: 36, size: "A4" },
      children: [{
        type: "table",
        columns: [{}, {}],
        header: [{ cells: [cell("Item"), cell("Amount")] }],
        body: [{ cells: [cell("Support plan"), cell("$120.00")] }],
        footer: [{ cells: [cell("VQH014 SINGLE TOTAL"), cell("$120.00 total")] }],
      }],
    });
    const pages = extractPageTexts(pdf, "single-page-footer.pdf");
    const text = pages.join("\n");

    expect(pages).toHaveLength(1);
    expect(occurrences(text, "VQH014 SINGLE TOTAL")).toBe(1);
  });

  it("renders a multi-page footer exactly once on the last page only", async () => {
    const pdf = await PdfEngine.render({
      page: { margin: 20, size: { width: 300, height: 220 } },
      children: [{
        type: "table",
        columns: [{}],
        header: [{ cells: [cell("Entry")] }],
        body: Array.from({ length: 24 }, (_, index) => ({
          cells: [cell(`Line ${index + 1}: value ${index + 1}`)],
        })),
        footer: [{ cells: [cell("VQH014 MULTIPAGE TOTAL")] }],
      }],
    });
    const pages = extractPageTexts(pdf, "multi-page-footer.pdf");
    const footerPages = pages
      .map((page, pageIndex) => ({ page, pageIndex }))
      .filter(({ page }) => page.includes("VQH014 MULTIPAGE TOTAL"));

    expect(pages.length).toBeGreaterThan(1);
    expect(footerPages).toHaveLength(1);
    expect(footerPages[0]?.pageIndex).toBe(pages.length - 1);
    expect(occurrences(pages.join("\n"), "VQH014 MULTIPAGE TOTAL")).toBe(1);
  });

  it("renders a footer when the table has a header and zero body rows", async () => {
    const pdf = await PdfEngine.render({
      page: { margin: 24, size: { width: 300, height: 220 } },
      children: [{
        type: "table",
        columns: [{}],
        header: [{ cells: [cell("Summary")] }],
        body: [],
        footer: [{ cells: [cell("VQH014 EMPTY BODY TOTAL")] }],
      }],
    });
    const text = extractPageTexts(pdf, "empty-body-footer.pdf").join("\n");

    expect(text).toContain("Summary");
    expect(text).toContain("VQH014 EMPTY BODY TOTAL");
  });

  it("renders a footer-only table", async () => {
    const pdf = await PdfEngine.render({
      page: { margin: 24, size: { width: 300, height: 220 } },
      children: [{
        type: "table",
        columns: [{}],
        body: [],
        footer: [{ cells: [cell("VQH014 FOOTER ONLY TOTAL")] }],
      }],
    });
    const text = extractPageTexts(pdf, "footer-only.pdf").join("\n");

    expect(text).toContain("VQH014 FOOTER ONLY TOTAL");
  });

  it("moves a footer that does not fit below the last body row to a following page", async () => {
    const pdf = await PdfEngine.render({
      page: { margin: 20, size: { width: 300, height: 220 } },
      children: [{
        type: "table",
        columns: [{}],
        header: [{ cells: [cell("Statement")] }],
        body: [{ cells: [cell("VQH014 FINAL BODY ROW", 120)] }],
        footer: [{ cells: [cell("VQH014 FOLLOWING PAGE TOTAL", 60)] }],
      }],
    });
    const pages = extractPageTexts(pdf, "following-page-footer.pdf");
    const bodyPage = pages.findIndex((page) => page.includes("VQH014 FINAL BODY ROW"));
    const footerPage = pages.findIndex((page) => page.includes("VQH014 FOLLOWING PAGE TOTAL"));

    expect(bodyPage).toBeGreaterThanOrEqual(0);
    expect(footerPage).toBe(bodyPage + 1);
    expect(footerPage).toBe(pages.length - 1);
    expect(occurrences(pages.join("\n"), "VQH014 FOLLOWING PAGE TOTAL")).toBe(1);
  });
});

describe("VQH-014 unplaceable table footer", () => {
  it("throws a structured layout error instead of silently dropping an over-tall footer", async () => {
    await expect(PdfEngine.render({
      page: { margin: 20, size: { width: 300, height: 220 } },
      children: [{
        type: "table",
        columns: [{}],
        header: [{ cells: [cell("Statement")] }],
        body: [{ cells: [cell("Body")] }],
        footer: [{ cells: [cell("Cannot fit", 200)] }],
      }],
    })).rejects.toMatchObject({
      code: "LAYOUT_IMPOSSIBLE",
      details: {
        offendingPath: "T1.footer",
        rowGroup: "footer",
        tableId: "T1",
      },
      name: "PdfError",
    });
  });
});
