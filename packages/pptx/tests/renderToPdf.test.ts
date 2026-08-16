import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunstampFeatureError, PaperError } from "../src/errors.js";
import { createEngine, PaperEngine } from "../src/engine.js";
import { getLogger, setLogger } from "../src/logger.js";
import type { PaperDocument } from "../src/types/ast.js";
import { createTestLicenseKey } from "../../../scripts/test-license-fixture.mjs";

const mockRenderChartToSvg = vi.fn();

vi.mock("../src/ooxml/chart/rasterizer.js", () => ({
  renderChartToSvg: (...args: unknown[]) => mockRenderChartToSvg(...args),
}));

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const QPDF_AVAILABLE = spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
const TINY_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function createLicenseKey(addons: string[] = ["conversion"]): string {
  return createTestLicenseKey({
    addons,
    fmt: ["pptx", "pdf", "docx", "xlsx"],
  });
}

function inspectPdf(buffer: Buffer): { inflated: boolean; text: string } {
  if (!QPDF_AVAILABLE) {
    return { inflated: false, text: buffer.toString("latin1") };
  }

  const dir = mkdtempSync(join(tmpdir(), "runstamp-core-render-to-pdf-"));
  const inputPath = join(dir, "input.pdf");
  const outputPath = join(dir, "output-qdf.pdf");

  try {
    writeFileSync(inputPath, buffer);
    execFileSync("qpdf", ["--qdf", "--object-streams=disable", "--stream-data=uncompress", inputPath, outputPath], { stdio: "pipe" });
    return { inflated: true, text: execFileSync("cat", [outputPath], { encoding: "latin1" }) };
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

function pageCount(pdfText: string): number {
  return pdfText.match(/\/Type \/Page\b/g)?.length ?? 0;
}

function mediaBoxPattern(width: number, height: number): RegExp {
  return new RegExp(`/MediaBox \\[\\s*0\\s+0\\s+${width}(?:\\.0+)?\\s+${height}(?:\\.0+)?\\s*\\]`);
}

function textNode(
  content: string | Array<{ hyperlink?: string | { slide?: number; tooltip?: string }; style?: Record<string, unknown>; text: string }>,
  style: Record<string, unknown>,
): PaperDocument["slides"][number]["children"][number] {
  return {
    type: "Text",
    content,
    style: {
      color: "#111827",
      fontFamily: "Arial",
      fontSize: 24,
      position: "absolute",
      ...style,
    },
  };
}

function makeLinkedDeck(): PaperDocument {
  return {
    type: "Document",
    meta: {
      language: "en-US",
      title: "Quarterly business review",
    },
    slideSize: { width: 800, height: 400 },
    slides: [
      {
        type: "Slide",
        notes: "Discuss conversion SLAs and customer rollout.",
        background: { color: "#F8FAFC", type: "solid" },
        children: [
          {
            type: "View",
            style: {
              backgroundColor: "#DBEAFE",
              borderColor: "#2563EB",
              borderWidth: 1,
              height: 92,
              left: 48,
              position: "absolute",
              top: 44,
              width: 704,
            },
          },
          textNode("Quarterly business review", {
            fontSize: 30,
            fontWeight: "bold",
            height: 40,
            left: 60,
            top: 68,
            width: 420,
          }),
          textNode(
            [
              {
                hyperlink: "https://runstamp.com/docs",
                style: { fontWeight: "bold" },
                text: "Runstamp docs",
              },
            ],
            {
              color: "#1D4ED8",
              height: 32,
              left: 60,
              top: 170,
              width: 220,
            },
          ),
          textNode(
            [
              {
                hyperlink: { slide: 2, tooltip: "Open the roadmap slide" },
                text: "Go to roadmap",
              },
            ],
            {
              color: "#0F766E",
              height: 32,
              left: 60,
              top: 216,
              width: 220,
            },
          ),
        ],
      },
      {
        type: "Slide",
        background: { color: "#FFFFFF", type: "solid" },
        children: [
          textNode("Roadmap", {
            fontSize: 28,
            fontWeight: "bold",
            height: 36,
            left: 60,
            top: 60,
            width: 240,
          }),
          {
            type: "Image",
            src: TINY_PNG_BASE64,
            altText: "Status icon",
            style: {
              height: 120,
              left: 60,
              position: "absolute",
              top: 120,
              width: 120,
            },
          },
        ],
      },
    ],
  };
}

function makeSimpleDeck(slideCount: number, slideSize = { width: 960, height: 540 }): PaperDocument {
  return {
    type: "Document",
    meta: { language: "en-US", title: "Simple render to PDF deck" },
    slideSize,
    slides: Array.from({ length: slideCount }, (_, index) => ({
      type: "Slide" as const,
      background: { color: index % 2 === 0 ? "#FFFFFF" : "#F3F4F6", type: "solid" as const },
      children: [
        textNode(`Slide ${index + 1}`, {
          height: 36,
          left: 56,
          top: 64,
          width: 200,
        }),
      ],
    })),
  };
}

function makePatternDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Pattern deck" },
    slideSize: { width: 800, height: 400 },
    slides: [
      {
        type: "Slide",
        background: {
          background: "#F8FAFC",
          foreground: "#CBD5E1",
          pattern: "cross",
          type: "pattern",
        },
        children: [
          {
            type: "View",
            style: {
              fill: {
                background: "#FFFFFF",
                foreground: "#2563EB",
                pattern: "ltDnDiag",
                type: "pattern",
              },
              height: 140,
              left: 80,
              position: "absolute",
              top: 80,
              width: 260,
            },
          },
          textNode("Pattern sample", {
            height: 36,
            left: 96,
            top: 132,
            width: 220,
          }),
        ],
      },
    ],
  };
}

beforeEach(() => {
  process.env.RUNSTAMP_LICENSE_KEY = createLicenseKey();
  mockRenderChartToSvg.mockReset();
});

afterEach(() => {
  delete process.env.RUNSTAMP_LICENSE_KEY;
  setLogger({ warn: console.warn.bind(console) });
  vi.restoreAllMocks();
});

describe("renderToPdf", () => {
  it("exists on the static engine and the createEngine instance shape", async () => {
    expect(typeof PaperEngine.renderToPdf).toBe("function");
    expect(typeof PaperEngine.populatePptxTemplate).toBe("function");
    expect(typeof PaperEngine.populatePptxTemplateToPdf).toBe("function");

    const engine = createEngine({ licenseKey: createLicenseKey() });
    expect(typeof engine.renderToPdf).toBe("function");
    expect(typeof engine.populatePptxTemplate).toBe("function");
    expect(typeof engine.populatePptxTemplateToPdf).toBe("function");

    const buffer = await engine.renderToPdf(makeSimpleDeck(1));
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("routes populatePptxTemplate and populatePptxTemplateToPdf through the existing template pipeline", async () => {
    const engine = createEngine({ licenseKey: createLicenseKey() });
    const templateBuffer = await engine.render(makeSimpleDeck(1));
    const templatedDoc: PaperDocument = {
      ...makeSimpleDeck(1),
      template: templateBuffer,
    };

    const expectedPptx = await engine.render(templatedDoc);
    const actualPptx = await engine.populatePptxTemplate(templateBuffer, makeSimpleDeck(1));
    expect(actualPptx.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(expectedPptx.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(actualPptx.length).toBeGreaterThan(0);

    const pdf = await engine.populatePptxTemplateToPdf(templateBuffer, makeSimpleDeck(1));
    expect(pdf.length).toBeGreaterThan(0);
  });

  it("maps each slide to one PDF page at the exact slide size", async () => {
    const buffer = await PaperEngine.renderToPdf(makeLinkedDeck());
    const pdf = inspectPdf(buffer);

    expect(pageCount(pdf.text)).toBe(2);
    expect(pdf.text).toMatch(mediaBoxPattern(600, 300));
  });

  it("preserves patterned backgrounds and rect-like fills as pattern geometry", async () => {
    const pdf = inspectPdf(await PaperEngine.renderToPdf(makePatternDeck()));
    expect(pageCount(pdf.text)).toBe(1);

    if (pdf.inflated) {
      const strokedLineCount = pdf.text.match(/\n[0-9.-]+ [0-9.-]+ m\n[0-9.-]+ [0-9.-]+ l\nS/g)?.length ?? 0;
      expect(strokedLineCount).toBeGreaterThan(8);
    }
  });

  it("preserves text output and both external and internal link annotations", async () => {
    const buffer = await PaperEngine.renderToPdf(makeLinkedDeck());
    const pdf = inspectPdf(buffer);

    expect(pdf.text).toContain("/Subtype /Link");
    expect(pdf.text).toContain("/S /URI");
    expect(pdf.text).toContain("(https://runstamp.com/docs)");
    expect(pdf.text).toContain("/S /GoTo");
    if (pdf.inflated) {
      expect(pdf.text).toContain("Quarterly business review");
      expect(pdf.text).toContain("BT");
      expect(pdf.text).toContain("/Subtype /Type0");
      expect(pdf.text).toContain("/ToUnicode");
    }
  });

  it("keeps adjacent rich-text runs separated in layout pixel coordinates", async () => {
    const deck: PaperDocument = {
      type: "Document",
      meta: { title: "Rich text spacing regression" },
      slideSize: { width: 800, height: 400 },
      slides: [{
        type: "Slide",
        children: [textNode([
          { text: "Alpha ", style: { fontWeight: "bold" } },
          { text: "Beta ", style: { fontStyle: "italic" } },
          { text: "Gamma" },
        ], { color: "#FFFFFF", height: 70, left: 100, top: 100, width: 600 })],
      }],
    };
    const pdf = inspectPdf(await PaperEngine.renderToPdf(deck));
    if (!pdf.inflated) return;

    const xPositions = [...pdf.text.matchAll(/1 0 0 1 ([0-9.]+) [0-9.]+ Tm/gu)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    expect(xPositions.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < xPositions.length; index += 1) {
      expect(xPositions[index]).toBeGreaterThan(xPositions[index - 1] ?? 0);
    }
    expect(Math.max(...xPositions) - Math.min(...xPositions)).toBeGreaterThan(100);
    expect(pdf.text).toContain("1 1 1 rg");
  });

  it("emits speaker notes as note annotations only when includeNotes is enabled", async () => {
    const withoutNotes = inspectPdf(await PaperEngine.renderToPdf(makeLinkedDeck()));
    const withNotes = inspectPdf(await PaperEngine.renderToPdf(makeLinkedDeck(), { includeNotes: true }));

    expect(withoutNotes.text).not.toContain("/Subtype /Text");
    expect(withNotes.text).toContain("/Subtype /Text");
    expect(withNotes.text).toContain("(Speaker Notes)");
    expect(withNotes.text).toContain("(Discuss conversion SLAs and customer rollout.)");
  });

  it("drops invalid internal slide links with a warning", async () => {
    const warnSpy = vi.fn();
    const originalLogger = getLogger();
    setLogger({ warn: warnSpy });

    try {
      const invalidLinkDoc: PaperDocument = {
        type: "Document",
        meta: { title: "Invalid slide link" },
        slideSize: { width: 800, height: 400 },
        slides: [
          {
            type: "Slide",
            children: [
              textNode(
                [{ hyperlink: { slide: 9 }, text: "Broken jump" }],
                { height: 32, left: 60, top: 100, width: 180 },
              ),
            ],
          },
          {
            type: "Slide",
            children: [textNode("Target", { height: 32, left: 60, top: 60, width: 120 })],
          },
        ],
      };

      const pdf = inspectPdf(await PaperEngine.renderToPdf(invalidLinkDoc));
      expect(pdf.text).not.toContain("/S /GoTo");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("non-existent slide"));
    } finally {
      setLogger(originalLogger);
    }
  });

  it("reports progress for each slide and supports cancellation", async () => {
    const progressCalls: Array<[number, number]> = [];
    await PaperEngine.renderToPdf(makeSimpleDeck(3), {
      onProgress: (slideIndex, totalSlides) => {
        progressCalls.push([slideIndex, totalSlides]);
      },
    });

    expect(progressCalls).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
    ]);

    const controller = new AbortController();
    await expect(
      PaperEngine.renderToPdf(makeSimpleDeck(4), {
        signal: controller.signal,
        onProgress: (slideIndex) => {
          if (slideIndex === 0) {
            controller.abort();
          }
        },
      }),
    ).rejects.toThrow(/cancelled/i);
  });

  it("rejects PDF/A output when external URI links are present", async () => {
    await expect(
      PaperEngine.renderToPdf(makeLinkedDeck(), { pdfA: "PDF/A-2b" }),
    ).rejects.toThrow(/PDF\/A/i);
  });

  it("routes tagged output through the accessibility structure path", async () => {
    const pdf = inspectPdf(await PaperEngine.renderToPdf(makeSimpleDeck(1), { tagged: true }));
    expect(pdf.text).toContain("/StructTreeRoot");
    expect(pdf.text).toContain("/MarkInfo");
  });


  it("fails fast when chart rasterization fails", async () => {
    mockRenderChartToSvg.mockRejectedValueOnce(new Error("chart backend unavailable"));

    const chartDoc: PaperDocument = {
      type: "Document",
      meta: { title: "Chart failure" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Chart",
              chartData: {
                categories: ["Q1"],
                chartType: "bar",
                series: [{ name: "Revenue", values: [12] }],
              },
              style: {
                height: 240,
                left: 80,
                position: "absolute",
                top: 80,
                width: 420,
              },
            },
          ],
        },
      ],
    };

    const renderPromise = PaperEngine.renderToPdf(chartDoc);

    await expect(renderPromise).rejects.toMatchObject<Partial<PaperError>>({
      code: "VALIDATION_FAILED",
      name: "PaperError",
      phase: "chart",
    });
    await expect(renderPromise).rejects.toThrow(/Chart rendering failed/i);
  });
});
