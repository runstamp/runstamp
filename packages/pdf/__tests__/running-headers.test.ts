import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { analyzePhase6Document } from "../src/phase6-analyze.js";
import { analyzePhase7Document } from "../src/phase7-analyze.js";
import type { PdfDocumentPhase6 } from "../src/phase6-types.js";
import { renderPdfPages } from "../src/pdf-renderer.js";

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
      if (inflated.includes("Runstamp deterministic content padding")) {
        streams.push(inflated);
      }
    } catch {
      // Font, image, and metadata streams are not page content streams.
    }
    searchFrom = end + endMarker.length;
  }

  return streams;
}

function unescapePdfString(value: string): string {
  return value.replace(/\\([()\\])/g, "$1");
}

function parseTextOperations(stream: string): TextOperation[] {
  return [...stream.matchAll(/1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\n\((.*?(?<!\\))\) Tj/g)]
    .map((match) => ({
      value: unescapePdfString(match[3] as string),
      x: Number(match[1]),
      y: Number(match[2]),
    }));
}

function createFlowingDocument(
  runningOptions: Partial<PdfDocumentPhase6> = {},
): PdfDocumentPhase6 {
  return {
    page: { margin: 20, size: { height: 240, width: 360 } },
    children: [
      {
        type: "paragraph",
        value: Array.from(
          { length: 320 },
          (_, index) => `body-${index + 1}`,
        ).join(" "),
      },
    ],
    ...runningOptions,
  };
}

async function renderAnalysis(document: PdfDocumentPhase6): Promise<{
  analysis: Awaited<ReturnType<typeof analyzePhase6Document>>;
  streams: string[];
}> {
  const analysis = await analyzePhase6Document(document);
  const pdf = await renderPdfPages({ deterministic: true, pages: analysis.pages });
  return { analysis, streams: extractPageContentStreams(pdf) };
}

describe("GA running headers and footers", () => {
  it("materializes canonical page tokens in every content stream on 3+ automatically paginated pages", async () => {
    const document = createFlowingDocument({
      dynamicFooter: { content: "Confidential {page}/{totalPages}" },
      dynamicHeader: { content: "Quarterly report {page} of {totalPages}" },
    });
    const { analysis, streams } = await renderAnalysis(document);

    expect(analysis.pages.length).toBeGreaterThanOrEqual(3);
    expect(streams).toHaveLength(analysis.pages.length);
    streams.forEach((stream, pageIndex) => {
      const values = parseTextOperations(stream).map((operation) => operation.value);
      expect(values).toContain(`Quarterly report ${pageIndex + 1} of ${streams.length}`);
      expect(values).toContain(`Confidential ${pageIndex + 1}/${streams.length}`);
      expect(stream).not.toContain("{page}");
      expect(stream).not.toContain("{totalPages}");
    });
  });

  it("places left, center, and right string zones in their respective thirds", async () => {
    const document = createFlowingDocument({
      dynamicHeader: {
        content: { center: "CENTER", left: "LEFT", right: "RIGHT" },
        width: 300,
        x: 30,
      },
    } as unknown as Partial<PdfDocumentPhase6>);
    const { streams } = await renderAnalysis(document);
    const operations = parseTextOperations(streams[0] as string);
    const left = operations.find((operation) => operation.value === "LEFT");
    const center = operations.find((operation) => operation.value === "CENTER");
    const right = operations.find((operation) => operation.value === "RIGHT");

    expect(left?.x).toBeGreaterThanOrEqual(30);
    expect(left?.x).toBeLessThan(130);
    expect(center?.x).toBeGreaterThanOrEqual(130);
    expect(center?.x).toBeLessThan(230);
    expect(right?.x).toBeGreaterThanOrEqual(230);
    expect(right?.x).toBeLessThanOrEqual(330);
    expect(left?.x).toBeLessThan(center?.x as number);
    expect(center?.x).toBeLessThan(right?.x as number);
  });

  it("uses the engine's default Letter height when no page size is specified", async () => {
    const document: PdfDocumentPhase6 = {
      dynamicHeader: { content: "DEFAULT LETTER HEADER" },
      children: [{ type: "paragraph", value: "Body" }],
    };
    const { streams } = await renderAnalysis(document);
    const header = parseTextOperations(streams[0] as string)
      .find(({ value }) => value === "DEFAULT LETTER HEADER");

    expect(header?.y).toBe(756);
  });

  it("suppresses configured running content only on the first page", async () => {
    const document = createFlowingDocument({
      dynamicFooter: { content: "RUNNING FOOTER", skipFirstPage: true },
      dynamicHeader: { content: "RUNNING HEADER", skipFirstPage: true },
    } as unknown as Partial<PdfDocumentPhase6>);
    const { streams } = await renderAnalysis(document);

    expect(streams.length).toBeGreaterThanOrEqual(3);
    expect(parseTextOperations(streams[0] as string).map(({ value }) => value)).not.toContain("RUNNING HEADER");
    expect(parseTextOperations(streams[0] as string).map(({ value }) => value)).not.toContain("RUNNING FOOTER");
    streams.slice(1).forEach((stream) => {
      const values = parseTextOperations(stream).map(({ value }) => value);
      expect(values).toContain("RUNNING HEADER");
      expect(values).toContain("RUNNING FOOTER");
    });
  });

  it("reserves header and footer bands on every continuation page", async () => {
    const document = createFlowingDocument({
      dynamicFooter: { content: "FOOTER BAND", height: 40, y: 20 },
      dynamicHeader: { content: "HEADER BAND", height: 40, y: 220 },
    });
    const { streams } = await renderAnalysis(document);

    expect(streams.length).toBeGreaterThanOrEqual(3);
    streams.forEach((stream) => {
      const operations = parseTextOperations(stream);
      const body = operations.filter(({ value }) => value.startsWith("body-"));
      expect(body.length).toBeGreaterThan(0);
      expect(Math.max(...body.map(({ y }) => y))).toBeLessThan(180);
      expect(Math.min(...body.map(({ y }) => y))).toBeGreaterThan(60);
      expect(operations).toContainEqual(expect.objectContaining({ value: "HEADER BAND", y: 220 }));
      expect(operations).toContainEqual(expect.objectContaining({ value: "FOOTER BAND", y: 20 }));
    });
  });

  it("repeats running headers on pages created by table splitting", async () => {
    const document: PdfDocumentPhase6 = {
      page: { margin: 24, size: { height: 240, width: 360 } },
      dynamicHeader: { content: "TABLE CONTINUATION {page}/{totalPages}", height: 36 },
      children: [
        {
          body: Array.from({ length: 36 }, (_, index) => ({
            cells: [{ children: [{ type: "paragraph" as const, value: `Control row ${index + 1}` }] }],
          })),
          columns: [{ width: "100%" }],
          type: "table",
        },
      ],
    };
    const { analysis, streams } = await renderAnalysis(document);

    expect(analysis.pages.length).toBeGreaterThanOrEqual(3);
    streams.forEach((stream, pageIndex) => {
      expect(parseTextOperations(stream).map(({ value }) => value))
        .toContain(`TABLE CONTINUATION ${pageIndex + 1}/${streams.length}`);
    });
  });

  it("accepts the public options in validate() and rejects malformed zones and suppression", () => {
    const valid = createFlowingDocument({
      dynamicFooter: { content: "Page {page} of {totalPages}" },
      dynamicHeader: {
        content: { center: "2026-07-14", left: "Enterprise report", right: "{page}/{totalPages}" },
        skipFirstPage: true,
      },
    } as unknown as Partial<PdfDocumentPhase6>);

    expect(PdfEngine.validate(valid)).toEqual({ issues: [], ok: true });
    expect(PdfEngine.validate({
      ...valid,
      dynamicHeader: { content: { left: 42 }, skipFirstPage: "yes" },
    })).toMatchObject({ ok: false });
  });

  it("uses the canonical totalPages token in pageNumber without removing the legacy total alias", async () => {
    const document = createFlowingDocument({
      pageNumber: { format: "Page {page}/{totalPages} ({total})" },
    });
    const analysis = await analyzePhase6Document(document);
    const total = String(analysis.pages.length);

    analysis.pages.forEach((page, pageIndex) => {
      expect(page.texts.map(({ value }) => value).join(""))
        .toContain(`Page ${pageIndex + 1}/${total} (${total})`);
    });
  });

  it("preserves running content when tagged accessibility selects the Phase 7 pipeline", async () => {
    const document = {
      ...createFlowingDocument({ dynamicHeader: { content: "TAGGED RUNNING HEADER" } }),
      accessibility: { lang: "en-US", tagged: true },
    } as const;
    const analysis = await analyzePhase7Document(document);
    const pdf = await renderPdfPages({
      deterministic: true,
      interactive: analysis.interactive,
      pages: analysis.pages,
    });
    const streams = extractPageContentStreams(pdf);

    expect(streams.length).toBeGreaterThanOrEqual(3);
    expect(streams.every((stream) => stream.includes("TAGGED RUNNING HEADER"))).toBe(true);
  });

  it("renders byte-identically twice in deterministic mode", async () => {
    const document = createFlowingDocument({
      dynamicFooter: { content: { left: "Internal", right: "{page}/{totalPages}" } },
      dynamicHeader: { content: "Deterministic report", skipFirstPage: true },
    } as unknown as Partial<PdfDocumentPhase6>);

    const first = await PdfEngine.render(document, { deterministic: true });
    const second = await PdfEngine.render(document, { deterministic: true });
    expect(Buffer.compare(first, second)).toBe(0);
  });
});
