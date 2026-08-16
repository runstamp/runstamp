import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { isPdfError } from "../src/errors.js";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { analyzePhase3Document, MAX_CONTAINER_DEPTH } from "../src/phase3-render.js";
import { renderPdfPages } from "../src/pdf-renderer.js";
import type { PdfInputWarning } from "../src/relaxed-input.js";

interface TextOperation {
  value: string;
  x: number;
  y: number;
}

function extractPageContentStreams(pdf: Buffer): string[] {
  const marker = Buffer.from("stream\n", "ascii");
  const endMarker = Buffer.from("\nendstream", "ascii");
  const streams: string[] = [];
  let searchFrom = 0;

  while (searchFrom < pdf.length) {
    const start = pdf.indexOf(marker, searchFrom);
    if (start < 0) break;
    const end = pdf.indexOf(endMarker, start + marker.length);
    if (end < 0) break;
    try {
      const inflated = inflateSync(pdf.subarray(start + marker.length, end)).toString("latin1");
      if (inflated.includes("Runstamp deterministic content padding")) streams.push(inflated);
    } catch {
      // Font, image, and metadata streams are not page content streams.
    }
    searchFrom = end + endMarker.length;
  }

  return streams;
}

function parseTextOperations(stream: string): TextOperation[] {
  return [...stream.matchAll(/1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\n\((.*?(?<!\\))\) Tj/g)]
    .map((match) => ({
      value: (match[3] as string).replace(/\\([()\\])/g, "$1"),
      x: Number(match[1]),
      y: Number(match[2]),
    }));
}

function mediaBoxes(pdf: Buffer): Array<{ height: number; width: number }> {
  return [...pdf.toString("latin1").matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)]
    .map((match) => ({ width: Number(match[1]), height: Number(match[2]) }));
}

function paragraphCell(value: string, minHeight?: number) {
  return {
    children: [{ type: "paragraph" as const, value }],
    style: minHeight === undefined ? undefined : { minHeight },
  };
}

function nestedContainers(depth: number): unknown {
  let node: unknown = { type: "paragraph", value: "deep leaf" };
  for (let index = 0; index < depth; index += 1) {
    node = { type: "container", children: [node] };
  }
  return node;
}

describe("P2C Batch A PDF edge-matrix closure", () => {
  it("cell 1: paginates flowing text and oversized table rows, with structured overflow warnings", async () => {
    const textWarnings: PdfInputWarning[] = [];
    const flowingDocument = {
      page: { margin: 20, size: { height: 220, width: 240 } },
      children: [{
        type: "paragraph" as const,
        value: Array.from({ length: 260 }, (_, index) => `flow-${index + 1}`).join(" "),
      }],
    };
    const flowingAnalysis = await analyzePhase3Document(flowingDocument);
    await PdfEngine.render(flowingDocument, { onInputWarning: (warning) => textWarnings.push(warning) });

    expect(flowingAnalysis.pages.length).toBeGreaterThan(2);
    expect(textWarnings).toContainEqual(expect.objectContaining({
      code: "PDF_ELEMENT_PAGE_OVERFLOW",
      path: "children[0]",
    }));
    expect(flowingAnalysis.pages.flatMap(({ texts }) => texts).map(({ value }) => value).join(" "))
      .toContain("flow-1");
    expect(flowingAnalysis.pages.flatMap(({ texts }) => texts).map(({ value }) => value).join(" "))
      .toContain("flow-260");

    const tableDocument = {
      page: { margin: 20, size: { height: 220, width: 240 } },
      children: [{
        type: "table" as const,
        columns: [{}],
        body: [{ cells: [paragraphCell("One row deliberately taller than a printable page", 420)] }],
      }],
    };
    const analysis = await analyzePhase5Document(tableDocument);
    const tableWarnings: PdfInputWarning[] = [];
    await PdfEngine.render(tableDocument, { onInputWarning: (warning) => tableWarnings.push(warning) });
    const rowFragments = analysis.tables[0]?.fragments.flatMap((fragment) =>
      fragment.rowFragments.filter(({ bodyRowIndex }) => bodyRowIndex === 0),
    ) ?? [];

    expect(analysis.pages.length).toBeGreaterThan(1);
    expect(rowFragments.length).toBeGreaterThan(1);
    expect(tableWarnings).toContainEqual(expect.objectContaining({
      code: "PDF_ELEMENT_PAGE_OVERFLOW",
      path: "children[0].body[0].cells[0].style.minHeight",
    }));
  });

  it("cell 2: wraps 300+ character tokens in paragraphs and table cells inside printable bounds with warnings", async () => {
    const printableLeft = 20;
    const printableRight = 180;
    const paragraphToken = "A".repeat(320);
    const tableToken = "B".repeat(340);
    const paragraphWarnings: PdfInputWarning[] = [];
    const paragraphDocument = {
      page: { margin: 20, size: { height: 240, width: 200 } },
      children: [{ type: "paragraph" as const, value: paragraphToken }],
    };
    const paragraphAnalysis = await analyzePhase3Document(paragraphDocument);
    const paragraphPdf = await renderPdfPages({ pages: paragraphAnalysis.pages });
    await PdfEngine.render(paragraphDocument, { onInputWarning: (warning) => paragraphWarnings.push(warning) });
    const paragraphOperations = extractPageContentStreams(paragraphPdf).flatMap(parseTextOperations)
      .filter(({ value }) => /^A+$/u.test(value));

    expect(paragraphOperations.length).toBeGreaterThan(1);
    expect(paragraphOperations.map(({ value }) => value).join("")).toBe(paragraphToken);
    expect(paragraphOperations.every(({ x }) => x >= printableLeft && x <= printableRight)).toBe(true);
    expect(paragraphWarnings).toContainEqual(expect.objectContaining({ code: "PDF_UNBREAKABLE_TOKEN_WRAPPED" }));

    const tableDocument = {
      page: { margin: 20, size: { height: 240, width: 200 } },
      children: [{
        type: "table" as const,
        columns: [{ width: "100%" as const }],
        body: [{ cells: [paragraphCell(tableToken)] }],
      }],
    };
    const tableAnalysis = await analyzePhase5Document(tableDocument);
    const tableWarnings: PdfInputWarning[] = [];
    const tablePdf = await renderPdfPages({ pages: tableAnalysis.pages });
    await PdfEngine.render(tableDocument, {
      onInputWarning: (warning) => tableWarnings.push(warning),
    });
    const tableOperations = extractPageContentStreams(tablePdf).flatMap(parseTextOperations)
      .filter(({ value }) => /^B+$/u.test(value));

    expect(tableAnalysis.tables[0]?.columnWidths[0]).toBeLessThanOrEqual(printableRight - printableLeft);
    expect(tableOperations.length).toBeGreaterThan(1);
    expect(tableOperations.map(({ value }) => value).join("")).toBe(tableToken);
    expect(tableOperations.every(({ x }) => x >= printableLeft && x <= printableRight)).toBe(true);
    expect(tableWarnings).toContainEqual(expect.objectContaining({ code: "PDF_UNBREAKABLE_TOKEN_WRAPPED" }));
  });

  it("cell 5: renders header-only tables with a warning and rejects explicitly zero columns as typed validation", async () => {
    const headerOnly = {
      page: { margin: 24, size: { height: 240, width: 300 } },
      children: [{
        type: "table" as const,
        columns: [{}],
        header: [{ cells: [paragraphCell("Header survives")] }],
        body: [],
      }],
    };
    const analysis = await analyzePhase5Document(headerOnly);
    const warnings: PdfInputWarning[] = [];
    const pdf = await renderPdfPages({ pages: analysis.pages });
    await PdfEngine.render(headerOnly, { onInputWarning: (warning) => warnings.push(warning) });

    expect(analysis.pages).toHaveLength(1);
    expect(analysis.pages[0]?.texts.map(({ value }) => value)).toContain("Header survives");
    expect(extractPageContentStreams(pdf).flatMap(parseTextOperations).map(({ value }) => value))
      .toContain("Header survives");
    expect(warnings).toContainEqual(expect.objectContaining({
      code: "PDF_TABLE_HEADER_ONLY",
      path: "children[0].body",
    }));

    const zeroColumns = {
      children: [{
        type: "table",
        columns: [],
        body: [{ cells: [paragraphCell("invalid")] }],
      }],
    };
    expect(PdfEngine.validate(zeroColumns)).toMatchObject({ ok: false });
    await expect(PdfEngine.render(zeroColumns as never)).rejects.toMatchObject({
      name: "PdfError",
      code: "SCHEMA_REJECTED",
      details: { issues: expect.any(Array) },
    });
  });

  it("cell 6: clamps out-of-range page geometry with warnings and throws a typed margin error", async () => {
    const highWarnings: PdfInputWarning[] = [];
    const highPdf = await PdfEngine.render({
      page: { margin: 0, size: { height: 20_000, width: 3 } },
      children: [{ type: "divider" }],
    }, { onInputWarning: (warning) => highWarnings.push(warning) });

    expect(mediaBoxes(highPdf)).toContainEqual({ width: 3, height: 14_400 });
    expect(highWarnings).toContainEqual(expect.objectContaining({
      code: "PDF_PAGE_SIZE_CLAMPED",
      path: "page.size.height",
      from: 20_000,
      to: 14_400,
    }));

    const lowWarnings: PdfInputWarning[] = [];
    const lowPdf = await PdfEngine.render({
      page: { margin: 0, size: { height: 2, width: 1 } },
      children: [{ type: "divider" }],
    }, { onInputWarning: (warning) => lowWarnings.push(warning) });
    expect(mediaBoxes(lowPdf)).toContainEqual({ width: 3, height: 3 });
    expect(lowWarnings.filter(({ code }) => code === "PDF_PAGE_SIZE_CLAMPED")).toHaveLength(2);

    try {
      await PdfEngine.render({
        page: {
          margin: { top: 10, right: 50, bottom: 10, left: 50 },
          size: { height: 100, width: 100 },
        },
        children: [{ type: "paragraph", value: "no printable width" }],
      });
      throw new Error("expected invalid margins to reject");
    } catch (error) {
      expect(isPdfError(error)).toBe(true);
      if (isPdfError(error)) {
        expect(error.code).toBe("PAGE_MARGINS_INVALID");
        expect(error.message).toContain("top=10, right=50, bottom=10, left=50");
        expect(error.details).toMatchObject({
          contentWidth: 0,
          margins: { top: 10, right: 50, bottom: 10, left: 50 },
          path: "page.margin",
        });
      }
    }
  });

  it("cell 9: renders 25 nested containers and fails beyond the documented cap with a typed error", async () => {
    const document25 = { children: [nestedContainers(25)] } as never;
    const analysis = await analyzePhase3Document(document25);
    const pdf = await PdfEngine.render(document25);
    expect(pdf.length).toBeGreaterThan(0);
    expect(analysis.pages.flatMap(({ texts }) => texts).map(({ value }) => value))
      .toContain("deep leaf");

    await expect(PdfEngine.render({
      children: [nestedContainers(MAX_CONTAINER_DEPTH)],
    } as never)).rejects.toMatchObject({
      name: "PdfError",
      code: "LAYOUT_RECURSION_LIMIT",
      details: {
        cap: MAX_CONTAINER_DEPTH,
        depth: MAX_CONTAINER_DEPTH + 1,
      },
    });
  });

  it("cell 10: renders 500 rows with repeated headers, sane pagination, and under a 512MB heap delta", async () => {
    const document = {
      page: { margin: 24, size: { height: 300, width: 360 } },
      children: [{
        type: "table" as const,
        columns: [{ width: "100%" as const }],
        header: [{ cells: [paragraphCell("Enterprise header")] }],
        body: Array.from({ length: 500 }, (_, index) => ({
          cells: [paragraphCell(`Enterprise row ${index + 1}`)],
        })),
      }],
    };
    const analysis = await analyzePhase5Document(document);
    const beforeHeap = process.memoryUsage().heapUsed;
    await PdfEngine.render(document);
    const heapDelta = Math.max(0, process.memoryUsage().heapUsed - beforeHeap);
    const pages = analysis.pages;

    expect(pages.length).toBeGreaterThan(10);
    expect(pages.length).toBeLessThan(100);
    expect(pages.every((page) =>
      page.texts.some(({ value }) => value === "Enterprise header"),
    )).toBe(true);
    const bodyValues = pages.flatMap(({ texts }) => texts)
      .map(({ value }) => value)
      .filter((value) => value.startsWith("Enterprise row "));
    expect(bodyValues).toHaveLength(500);
    expect(bodyValues[0]).toBe("Enterprise row 1");
    expect(bodyValues.at(-1)).toBe("Enterprise row 500");
    expect(heapDelta).toBeLessThan(512 * 1024 * 1024);
  }, 30_000);
});
