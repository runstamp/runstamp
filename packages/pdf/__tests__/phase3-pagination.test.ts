import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase3Document } from "../src/phase3-render.js";
import {
  PHASE3_PARAGRAPH_TEXT,
  createHeadingOrphanDocument,
  createMultiPageDocument,
} from "../scripts/phase3-fixtures.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";

function compactText(value: string): string {
  return value.replace(/\s+/g, "");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function withTempPdf<T>(pdf: Buffer, name: string, run: (pdfPath: string) => T): T {
  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-phase3-"));
  const pdfPath = join(tempDir, name);

  try {
    writeFileSync(pdfPath, pdf);
    return run(pdfPath);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

describe("Phase 3 pagination benchmarks", () => {
  let inter: { family: string; source: string };

  beforeAll(async () => {
    const fonts = await ensurePhase2FontFixtures();
    inter = { family: "Inter", source: fonts.inter };
  }, 120_000);

  it("paginates the 5000-word benchmark document to 13 pages and preserves text", async () => {
    const document = createMultiPageDocument(inter);
    const analysis = await analyzePhase3Document(document);
    expect(analysis.pages).toHaveLength(13);

    const renderedText = analysis.pages.flatMap((page) => page.texts.map((line) => line.value)).join(" ");
    const sourceText = Array.from({ length: 25 }, () => PHASE3_PARAGRAPH_TEXT).join(" ");
    expect(compactText(renderedText)).toContain(compactText(sourceText).slice(0, 800));

    if (hasBinary("pdftotext")) {
      const buffer = await PdfEngine.render(document);
      const extracted = withTempPdf(buffer, "phase3-multipage.pdf", (pdfPath) => execFileSync("pdftotext", ["-enc", "UTF-8", "-nopgbrk", pdfPath, "-"], {
        encoding: "utf8",
        stdio: "pipe",
      }));
      expect(compactText(extracted)).toContain(compactText(sourceText).slice(0, 800));
    }
  }, 120_000);

  it("moves a keep-with-next heading off the bottom page edge", async () => {
    const analysis = await analyzePhase3Document(createHeadingOrphanDocument());
    expect(analysis.pages).toHaveLength(2);

    const pageOneValues = analysis.pages[0]?.texts.map((line) => line.value) ?? [];
    const pageTwoValues = analysis.pages[1]?.texts.map((line) => line.value) ?? [];

    expect(pageOneValues).not.toContain("Heading should move");
    expect(pageTwoValues).toContain("Heading should move");
    expect(pageTwoValues.slice(-2)).toEqual([
      "This paragraph must stay with the heading and provide at least two lines of",
      "follow-on text for the orphan control benchmark.",
    ]);
  });

  it("accepts the content alias and rejects mixed phase 3 root arrays", async () => {
    const buffer = await PdfEngine.render({
      page: { size: "Letter", margin: 72 },
      content: [{ type: "paragraph", value: "content alias" }],
    });

    expect(buffer.length).toBeGreaterThan(0);

    await expect(PdfEngine.render({
      children: [{ type: "paragraph", value: "children" }],
      content: [{ type: "paragraph", value: "content" }],
    })).rejects.toThrow(/either "children" or "content"/);
  });
});
