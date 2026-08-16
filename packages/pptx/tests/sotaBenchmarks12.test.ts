/**
 * SOTA Benchmarks 12 — Performance & Determinism
 *
 * 20 tests across 3 categories:
 *   A: Performance — render timing benchmarks for various slide complexities
 *   B: Determinism — byte-identical output, consistent timestamps
 *   C: Scale — large presentations, many shapes, many media files
 */

import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import type { PaperDocument, PaperSlide, PaperNode, TableData } from "../src/types/ast.js";
import { generateDiagram } from "../src/diagrams/index.js";
import {
  parseXml, findAllElements, getAttr, getZipEntry,
  getZipPaths, zipHasFile, RED_PIXEL,
  assertUniqueShapeIds, assertWellFormedXml, getShapeCount,
} from "./helpers/xmlTestUtils.js";

// =========================================================================
// Helpers
// =========================================================================

function makeDoc(children: PaperNode[], slideOverrides?: Partial<PaperSlide>, docOverrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      style: { width: 960, height: 540 },
      children,
      ...slideOverrides,
    } as PaperSlide],
    ...docOverrides,
  } as PaperDocument;
}

function makeMultiSlideDoc(slides: PaperSlide[], docOverrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides,
    ...docOverrides,
  } as PaperDocument;
}

// =========================================================================
// CATEGORY A: PERFORMANCE (8 tests)
// =========================================================================

describe("A: Performance", () => {
  it("A1: 1-slide empty → renders in <500ms", async () => {
    const doc = makeDoc([]);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });

  it("A2: 1-slide with shapes → renders in <1000ms", async () => {
    const children: PaperNode[] = Array.from({ length: 10 }, (_, i) => ({
      type: "View" as const,
      style: {
        position: "absolute" as const,
        left: (i % 5) * 180,
        top: Math.floor(i / 5) * 250,
        width: 160, height: 220,
        backgroundColor: "#4472C4",
      },
      textContent: `Shape ${i + 1}`,
      textStyle: { fontSize: 14 },
    }));
    const doc = makeDoc(children);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  it("A3: 10-slide presentation → renders in <3s", async () => {
    const slides: PaperSlide[] = Array.from({ length: 10 }, (_, i) => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [
        { type: "Text" as const, style: { width: 400, height: 50, fontSize: 24 }, content: `Slide ${i + 1}` },
        { type: "View" as const, style: { width: 300, height: 200, backgroundColor: "#4472C4" } },
      ],
    }));
    const doc = makeMultiSlideDoc(slides);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(3000);
  });

  it("A4: Chart-heavy slide (4 charts) → renders in <5s", async () => {
    const children: PaperNode[] = Array.from({ length: 4 }, (_, i) => ({
      type: "Chart" as const,
      style: { position: "absolute" as const, left: (i % 2) * 480, top: Math.floor(i / 2) * 270, width: 450, height: 250 },
      chartData: {
        chartType: "bar" as const,
        categories: ["Q1", "Q2", "Q3", "Q4"],
        series: [
          { name: `Series A${i}`, values: [10, 20, 30, 40] },
          { name: `Series B${i}`, values: [15, 25, 35, 45] },
        ],
      },
    }));
    const doc = makeDoc(children);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });

  it("A5: Diagram generation (process 20 steps) → <100ms", () => {
    const start = performance.now();
    const group = generateDiagram({
      type: "process",
      items: Array.from({ length: 20 }, (_, i) => ({ text: `Step ${i + 1}` })),
    });
    const elapsed = performance.now() - start;
    expect(group.children.length).toBe(39); // 20 views + 19 connectors
    expect(elapsed).toBeLessThan(100);
  });

  it("A6: Large table (50 rows × 5 cols) → renders in <3s", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      cells: Array.from({ length: 5 }, (_, j) => ({ text: `R${i + 1}C${j + 1}` })),
    }));
    const doc = makeDoc([{
      type: "Table",
      style: { width: 600, height: 800 },
      tableData: { columns: [120, 120, 120, 120, 120], rows },
    }]);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(3000);
  });

  it("A7: Slide with many text shapes (20) → renders in <2s", async () => {
    const children: PaperNode[] = Array.from({ length: 20 }, (_, i) => ({
      type: "Text" as const,
      style: {
        position: "absolute" as const,
        left: (i % 5) * 190,
        top: Math.floor(i / 5) * 130,
        width: 180, height: 120, fontSize: 10,
      },
      content: `Text block ${i + 1} with some content to make it longer.`,
    }));
    const doc = makeDoc(children);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it("A8: Slide with images → renders in <2s", async () => {
    const children: PaperNode[] = Array.from({ length: 5 }, (_, i) => ({
      type: "Image" as const,
      src: RED_PIXEL,
      style: {
        position: "absolute" as const,
        left: i * 190,
        top: 100,
        width: 180, height: 180,
      },
    }));
    const doc = makeDoc(children);
    const start = performance.now();
    const buffer = await PaperEngine.render(doc);
    const elapsed = performance.now() - start;
    expect(buffer.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });
});

// =========================================================================
// CATEGORY B: DETERMINISM (7 tests)
// =========================================================================

describe("B: Determinism", () => {
  it("B1: Deterministic mode → byte-identical output across 3 renders", async () => {
    setDeterministicMode(true);
    try {
      const doc = makeDoc([
        { type: "Text", style: { width: 300, height: 50, fontSize: 14 }, content: "Hello World" },
        { type: "View", style: { width: 200, height: 100, backgroundColor: "#FF0000" } },
      ]);

      const buf1 = await PaperEngine.render(doc);
      const buf2 = await PaperEngine.render(doc);
      const buf3 = await PaperEngine.render(doc);

      expect(buf1.equals(buf2)).toBe(true);
      expect(buf2.equals(buf3)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });

  it("B2: Deterministic mode → timestamps are consistent", async () => {
    setDeterministicMode(true);
    try {
      const doc = makeDoc([], {}, { meta: { title: "Test", author: "Author" } });
      const buffer = await PaperEngine.render(doc);
      const coreXml = await getZipEntry(buffer, "docProps/core.xml");

      // Should use deterministic date (1980-01-01)
      expect(coreXml).toContain("1980-01-01");
    } finally {
      setDeterministicMode(false);
    }
  });

  it("B3: Deterministic mode → chart-heavy doc is identical across renders", async () => {
    setDeterministicMode(true);
    try {
      const doc = makeDoc([{
        type: "Chart",
        style: { width: 400, height: 300 },
        chartData: {
          chartType: "bar",
          categories: ["A", "B", "C"],
          series: [{ name: "S", values: [10, 20, 30] }],
        },
      }]);

      const buf1 = await PaperEngine.render(doc);
      const buf2 = await PaperEngine.render(doc);

      expect(buf1.equals(buf2)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });

  it("B4: Deterministic mode → image doc is identical across renders", async () => {
    setDeterministicMode(true);
    try {
      const doc = makeDoc([
        { type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } },
      ]);

      const buf1 = await PaperEngine.render(doc);
      const buf2 = await PaperEngine.render(doc);

      expect(buf1.equals(buf2)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });

  it("B5: Deterministic mode → multi-slide doc is identical", async () => {
    setDeterministicMode(true);
    try {
      const slides: PaperSlide[] = [
        { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Text", style: { width: 200, height: 50, fontSize: 14 }, content: "Slide 1" }] },
        { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "View", style: { width: 100, height: 100, backgroundColor: "#FF0000" } }] },
        { type: "Slide", style: { width: 960, height: 540 }, children: [{ type: "Image", src: RED_PIXEL, style: { width: 100, height: 100 } }] },
      ];
      const doc = makeMultiSlideDoc(slides);

      const buf1 = await PaperEngine.render(doc);
      const buf2 = await PaperEngine.render(doc);

      expect(buf1.equals(buf2)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });

  it("B6: Deterministic mode → doc with notes is identical", async () => {
    setDeterministicMode(true);
    try {
      const doc = makeDoc(
        [{ type: "Text", style: { width: 200, height: 50, fontSize: 14 }, content: "Content" }],
        { notes: "Speaker notes" },
      );

      const buf1 = await PaperEngine.render(doc);
      const buf2 = await PaperEngine.render(doc);

      expect(buf1.equals(buf2)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });

  it("B7: Deterministic mode → doc with comments is identical", async () => {
    setDeterministicMode(true);
    try {
      const doc = makeDoc(
        [{ type: "Text", style: { width: 200, height: 50, fontSize: 14 }, content: "Content" }],
        { comments: [{ author: "Alice", text: "Good", date: "2024-01-15T10:00:00Z" }] },
      );

      const buf1 = await PaperEngine.render(doc);
      const buf2 = await PaperEngine.render(doc);

      expect(buf1.equals(buf2)).toBe(true);
    } finally {
      setDeterministicMode(false);
    }
  });
});

// =========================================================================
// CATEGORY C: SCALE (5 tests)
// =========================================================================

describe("C: Scale", () => {
  it("C1: 50-slide presentation → all slides present and valid", async () => {
    const slides: PaperSlide[] = Array.from({ length: 50 }, (_, i) => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [
        { type: "Text" as const, style: { width: 300, height: 40, fontSize: 18 }, content: `Slide ${i + 1}` },
      ],
    }));
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);

    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 50; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }
    await assertWellFormedXml(buffer);
  }, 30000);

  it("C2: Slide with 50 shapes → all rendered with unique IDs", async () => {
    const children: PaperNode[] = Array.from({ length: 50 }, (_, i) => ({
      type: "View" as const,
      style: {
        position: "absolute" as const,
        left: (i % 10) * 95,
        top: Math.floor(i / 10) * 105,
        width: 90, height: 100,
        backgroundColor: `#${(i * 5).toString(16).padStart(2, "0")}${(255 - i * 5).toString(16).padStart(2, "0")}80`,
      },
    }));
    const doc = makeDoc(children);
    const buffer = await PaperEngine.render(doc);
    const slideXml = await getZipEntry(buffer, "ppt/slides/slide1.xml");
    const tree = parseXml(slideXml);

    const sps = findAllElements(tree, "p:sp");
    expect(sps.length).toBeGreaterThanOrEqual(50);
    assertUniqueShapeIds(tree);
  }, 10000);

  it("C3: 10 images across 5 slides → global media counter correct", async () => {
    const slides: PaperSlide[] = Array.from({ length: 5 }, (_, i) => ({
      type: "Slide" as const,
      style: { width: 960, height: 540 },
      children: [
        { type: "Image" as const, src: RED_PIXEL, style: { width: 100, height: 100 } },
        { type: "Image" as const, src: RED_PIXEL, style: { width: 100, height: 100 } },
      ],
    }));
    const doc = makeMultiSlideDoc(slides);
    const buffer = await PaperEngine.render(doc);
    const paths = await getZipPaths(buffer);
    const mediaPaths = paths.filter(p => p.startsWith("ppt/media/image"));
    // All 10 images use identical RED_PIXEL → deduplication reduces to 1 file
    // Each slide still has its own rId pointing to the same file
    expect(mediaPaths.length).toBe(1);
  }, 10000);

  it("C4: 10 charts across 3 slides → all chart files and Excel files present", async () => {
    const makeChartSlide = (count: number, offset: number): PaperSlide => ({
      type: "Slide",
      style: { width: 960, height: 540 },
      children: Array.from({ length: count }, (_, i) => ({
        type: "Chart" as const,
        style: { position: "absolute" as const, left: (i % 2) * 480, top: Math.floor(i / 2) * 270, width: 450, height: 250 },
        chartData: {
          chartType: "bar" as const,
          categories: ["A", "B"],
          series: [{ name: `S${offset + i}`, values: [10 + i, 20 + i] }],
        },
      })),
    });
    const doc = makeMultiSlideDoc([
      makeChartSlide(4, 0),
      makeChartSlide(4, 4),
      makeChartSlide(2, 8),
    ]);
    const buffer = await PaperEngine.render(doc);

    for (let i = 1; i <= 10; i++) {
      expect(await zipHasFile(buffer, `ppt/charts/chart${i}.xml`)).toBe(true);
      expect(await zipHasFile(buffer, `ppt/embeddings/chart${i}.xlsx`)).toBe(true);
    }
    await assertWellFormedXml(buffer);
  }, 15000);

  it("C5: Complex mixed-content 20-slide deck → renders without crash", async () => {
    const slides: PaperSlide[] = Array.from({ length: 20 }, (_, i) => {
      const children: PaperNode[] = [];
      // Alternate content types
      if (i % 4 === 0) {
        children.push({ type: "Text", style: { width: 400, height: 50, fontSize: 20 }, content: `Title ${i + 1}` });
      } else if (i % 4 === 1) {
        children.push({ type: "Image", src: RED_PIXEL, style: { width: 200, height: 200 } });
      } else if (i % 4 === 2) {
        children.push({
          type: "Chart", style: { width: 500, height: 350 },
          chartData: { chartType: "bar", categories: ["A", "B"], series: [{ name: "S", values: [10, 20] }] },
        });
      } else {
        children.push({
          type: "Table", style: { width: 400, height: 100 },
          tableData: { columns: [200, 200], rows: [{ cells: [{ text: "X" }, { text: "Y" }] }] },
        });
      }
      return {
        type: "Slide" as const,
        style: { width: 960, height: 540 },
        children,
      };
    });
    const doc = makeMultiSlideDoc(slides, {
      meta: { title: "Large Deck", author: "Engineer" },
    });
    const buffer = await PaperEngine.render(doc);
    expect(buffer.length).toBeGreaterThan(0);

    const paths = await getZipPaths(buffer);
    for (let i = 1; i <= 20; i++) {
      expect(paths).toContain(`ppt/slides/slide${i}.xml`);
    }

    await assertWellFormedXml(buffer);
  }, 30000);
});
