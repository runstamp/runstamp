import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import type { PaperDocument } from "../src/types/ast.js";

const simpleDoc: PaperDocument = {
  type: "Document",
  meta: { title: "Deterministic Test" },
  slides: [
    {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "Text",
          style: { fontSize: 24, width: 400, height: 40 },
          content: "Hello Deterministic World",
        },
        {
          type: "View",
          style: { backgroundColor: "#4A90D9", width: 200, height: 100 },
          children: [],
        },
      ],
    },
  ],
};

const chartDoc: PaperDocument = {
  type: "Document",
  meta: { title: "Chart Deterministic Test" },
  slides: [
    {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "Chart",
          style: { width: 600, height: 400 },
          chartData: {
            chartType: "bar",
            categories: ["Q1", "Q2", "Q3", "Q4"],
            series: [
              { name: "Revenue", values: [100, 150, 120, 200] },
              { name: "Cost", values: [80, 90, 100, 110] },
            ],
          },
        },
      ],
    },
  ],
};

describe("Deterministic Mode", () => {
  beforeAll(() => {
    setDeterministicMode(true);
  });

  afterAll(() => {
    setDeterministicMode(false);
  });

  it("produces byte-identical output across 10 consecutive renders", async () => {
    const buffers: Buffer[] = [];
    for (let i = 0; i < 10; i++) {
      buffers.push(await PaperEngine.render(simpleDoc));
    }

    const reference = buffers[0];
    for (let i = 1; i < buffers.length; i++) {
      expect(
        reference.equals(buffers[i]),
        `Render #${i + 1} differs from render #1 (lengths: ${reference.length} vs ${buffers[i].length})`,
      ).toBe(true);
    }
  });

  it("produces byte-identical output for documents with charts", async () => {
    const buffers: Buffer[] = [];
    for (let i = 0; i < 10; i++) {
      buffers.push(await PaperEngine.render(chartDoc));
    }

    const reference = buffers[0];
    for (let i = 1; i < buffers.length; i++) {
      expect(
        reference.equals(buffers[i]),
        `Chart render #${i + 1} differs from render #1`,
      ).toBe(true);
    }
  });

  it("detects when a buffer byte is modified (sanity check)", async () => {
    const buf1 = await PaperEngine.render(simpleDoc);
    const buf2 = Buffer.from(buf1);

    // Flip a byte near the middle of the buffer
    const midpoint = Math.floor(buf2.length / 2);
    buf2[midpoint] = (buf2[midpoint] + 1) % 256;

    expect(buf1.equals(buf2)).toBe(false);
  });
});
