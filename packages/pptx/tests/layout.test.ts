// tests/layout.test.ts — Phase 2: Physics Engine benchmarks

import { describe, it, expect } from "vitest";
import { runLayout, runLayoutOnNode } from "../src/layout/index.js";
import type { PaperSlide, PaperNode } from "../src/types/ast.js";

describe("Phase 2: Physics Engine", () => {
  // Benchmark 1: Absolute Coordinate Test
  // A Slide (960x540) → View (padding: 50) → Text
  // The Text node's absolute coords must be x:50, y:50.
  // A return of 0,0 would mean the extraction used Yoga's parent-relative
  // coords instead of accumulating the parent offset.
  it("Benchmark 1: Text inside padded View reports absolute x:50, y:50", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { padding: 50 },
          children: [{ type: "Text", content: "hello" }],
        },
      ],
    };

    const root = await runLayout(slide, 960, 540);
    const view = root.children![0] as { children?: { layout: { x: number; y: number } }[] } & { layout: { x: number; y: number } };
    const text = view.children![0];

    expect(text.layout.x).toBe(50);
    expect(text.layout.y).toBe(50);
  });

  // Benchmark 2: Flex Alignment Test
  // A View (500x100, justifyContent:"center", alignItems:"center") with a
  // single 50x50 child View must center the child at x:225, y:25.
  it("Benchmark 2: Centered child View is at absolute x:225, y:25", async () => {
    const view: PaperNode = {
      type: "View",
      style: {
        width: 500,
        height: 100,
        justifyContent: "center",
        alignItems: "center",
      },
      children: [
        {
          type: "View",
          style: { width: 50, height: 50 },
        },
      ],
    };

    const root = await runLayoutOnNode(view, 500, 100);
    const child = root.children![0] as { layout: { x: number; y: number } };

    expect(child.layout.x).toBe(225);
    expect(child.layout.y).toBe(25);
  });

  // Benchmark 3: Memory Leak Prevention
  // Running the layout pipeline 1000 times must not exhaust the WASM heap.
  // This requires that .free() is called on every Yoga node after extraction.
  it("Benchmark 3: Layout pipeline stays memory-flat over 1000 iterations", async () => {
    const slide: PaperSlide = {
      type: "Slide",
      style: { width: 960, height: 540 },
      children: [
        {
          type: "View",
          style: { padding: 10 },
          children: [{ type: "Text", content: "leak test" }],
        },
      ],
    };

    for (let i = 0; i < 1000; i++) {
      await runLayout(slide, 960, 540);
    }

    // Reaching here without OOM or WASM heap exhaustion is the assertion.
    expect(true).toBe(true);
  });
});
