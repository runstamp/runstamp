import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PdfGraphic } from "../src/phase4-types.js";
import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { analyzePhase7Document, type Phase7DocumentAnalysis } from "../src/phase7-analyze.js";
import type { PdfDocumentPhase7, PdfPhase7DocumentNode } from "../src/phase7-types.js";

const CORPUS_ROOT = fileURLToPath(new URL("../fixtures/public/corpus/", import.meta.url));

const CASES = {
  audit: "pdf-summary-audit-findings-itgc.json",
  bank: "pdf-statement-bank-checking.json",
  erp: "pdf-summary-project-status-erp.json",
  executive: "pdf-summary-exec-onepager-logistics.json",
  rateCard: "pdf-catalog-professional-services-rate-card.json",
  sales: "pdf-summary-sales-pipeline-snapshot.json",
  serviceTermination: "pdf-notice-service-termination.json",
} as const;

interface CorpusEntry {
  document: PdfDocumentPhase7;
  expectedProperties?: Record<string, unknown>;
}

function loadCase(filename: string): CorpusEntry {
  return JSON.parse(readFileSync(`${CORPUS_ROOT}${filename}`, "utf8")) as CorpusEntry;
}

function graphicBottom(graphic: PdfGraphic): number | undefined {
  if (graphic.type === "rect" || graphic.type === "image" || graphic.type === "svg") return graphic.y;
  if (graphic.type === "line") return Math.min(graphic.y1, graphic.y2);
  if (graphic.type === "path") return graphic.y;
  return undefined;
}

/**
 * Running headers, footers, and page numbers are marked as artifacts by phase 7.
 * Excluding them prevents a footer at y=24 from making a sparse body appear full.
 */
function substantivePageUsages(analysis: Phase7DocumentAnalysis): number[] {
  const contentTop = analysis.page.height - analysis.page.margins.top;
  const contentBottom = analysis.page.margins.bottom;
  const availableHeight = Math.max(1, contentTop - contentBottom);
  return analysis.pages.map((page) => {
    const bottoms = [
      ...page.texts
        .filter((text) => !text.accessibility?.artifact)
        .map((text) => text.y - (text.fontSize * 0.25)),
      ...(page.graphics ?? [])
        .filter((graphic) => !(graphic as PdfGraphic & { accessibility?: { artifact?: boolean } }).accessibility?.artifact)
        .map(graphicBottom)
        .filter((value): value is number => value !== undefined),
    ];
    if (bottoms.length === 0) return 0;
    return Math.min(1, Math.max(0, (contentTop - Math.min(...bottoms)) / availableHeight));
  });
}

function allNodes(document: PdfDocumentPhase7): PdfPhase7DocumentNode[] {
  const result: PdfPhase7DocumentNode[] = [];
  const visit = (node: PdfPhase7DocumentNode): void => {
    result.push(node);
    if (node.type === "container") {
      node.children.forEach((child) => visit(child as PdfPhase7DocumentNode));
    }
    if (node.type === "table") {
      [node.header ?? [], node.body, node.footer ?? []]
        .flat()
        .flatMap((row) => row.cells)
        .flatMap((cell) => cell.children)
        .forEach((child) => visit(child as PdfPhase7DocumentNode));
    }
  };
  (document.children ?? document.content ?? []).forEach(visit);
  return result;
}

describe("PDF-5 corpus-v2 deterministic quality gates", () => {
  it("keeps exact page counts and at least 68% substantive usage on every PDF-5 page", async () => {
    const expectedPages = new Map<string, number>([
      [CASES.executive, 1],
      [CASES.audit, 2],
      [CASES.erp, 2],
      [CASES.sales, 2],
      [CASES.rateCard, 2],
    ]);

    for (const [filename, pageCount] of expectedPages) {
      const analysis = await analyzePhase7Document(loadCase(filename).document);
      expect(analysis.pages, filename).toHaveLength(pageCount);
      expect(Math.min(...substantivePageUsages(analysis)), filename).toBeGreaterThanOrEqual(0.68);
      expect(analysis.pages.every((page) => page.texts.length > 0), filename).toBe(true);
    }
  }, 30_000);

  it("aligns all five executive KPI values to the same baseline", async () => {
    const analysis = await analyzePhase7Document(loadCase(CASES.executive).document);
    const values = new Set(["$84.2M", "111%", "68.4%", "(3.2)%", "31 mo"]);
    const baselines = analysis.pages[0]!.texts
      .filter((text) => values.has(text.value))
      .map((text) => text.y);

    expect(baselines).toHaveLength(5);
    expect(Math.max(...baselines) - Math.min(...baselines)).toBeLessThanOrEqual(1.5);
  });

  it("uses one explicit built-in heading family across the dense summaries", () => {
    for (const filename of [CASES.executive, CASES.audit, CASES.erp, CASES.sales, CASES.rateCard]) {
      const headings = allNodes(loadCase(filename).document)
        .filter((node) => node.type === "heading");
      expect(headings.length, filename).toBeGreaterThan(0);
      expect(
        headings.every((heading) => heading.font === undefined || heading.font === "Helvetica-Bold"),
        filename,
      ).toBe(true);
    }
  });

  it("reconciles sales stage gross to 43,610 while preserving the assigned 41,610 total", () => {
    const entry = loadCase(CASES.sales);
    const nodes = allNodes(entry.document);
    const stageTable = nodes.find((node) =>
      node.type === "table"
      && node.header?.[0]?.cells.some((cell) =>
        cell.children.some((child) => child.type === "paragraph" && child.value === "Gross value ($K)")
      )
    );
    expect(stageTable?.type).toBe("table");
    if (!stageTable || stageTable.type !== "table") return;

    const gross = stageTable.body.reduce((sum, row) => {
      const value = row.cells[2]?.children[0];
      return sum + Number((value && "value" in value ? value.value : "0")?.replaceAll(",", ""));
    }, 0);
    const displayedTotal = stageTable.footer?.[0]?.cells[2]?.children[0];
    expect(gross).toBe(43_610);
    expect(displayedTotal && "value" in displayedTotal ? displayedTotal.value : undefined).toBe("43,610");
    expect(nodes.some((node) =>
      node.type === "paragraph"
      && node.value?.includes("$2.0M of global or currently unassigned qualified pipeline")
    )).toBe(true);
    expect(nodes.filter((node) => node.type === "list")).toHaveLength(2);
  });

  it("preserves the rate-card explicit break and repeated labor-table headers", async () => {
    const entry = loadCase(CASES.rateCard);
    const nodes = entry.document.children ?? [];
    expect(nodes.filter((node) => node.type === "page-break")).toHaveLength(1);
    const analysis = await analyzePhase5Document(entry.document);
    expect(analysis.pages).toHaveLength(2);
    expect(analysis.tables.filter((table) =>
      table.fragments.some((fragment) => fragment.headerRowCount > 0)
    )).toHaveLength(3);
  });

  it("compacts the bank-statement holdout back to four nonblank pages", async () => {
    const analysis = await analyzePhase7Document(loadCase(CASES.bank).document);
    expect(analysis.pages).toHaveLength(4);
    expect(analysis.pages.every((page) => page.texts.length > 0)).toBe(true);
    expect(analysis.pages.at(-1)?.texts.some((text) =>
      text.value.includes("In Case of Errors or Questions")
    )).toBe(true);
  }, 30_000);

  it("does not collapse the three-page service-termination holdout", async () => {
    const analysis = await analyzePhase7Document(loadCase(CASES.serviceTermination).document);
    expect(analysis.pages).toHaveLength(3);
    expect(analysis.pages.every((page) => page.texts.length > 0)).toBe(true);
  }, 30_000);
});
