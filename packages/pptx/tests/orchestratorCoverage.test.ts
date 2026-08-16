// WS-5 coverage contract: every LayoutNode discriminator the schema
// produces must have a registered serializer in orchestrator.ts. This
// test constructs a minimal LayoutNode of every documented type and
// asserts none triggers the UNKNOWN_NODE_TYPE fallback.
//
// If someone later extends LayoutNode with a new `type` literal
// without adding a SERIALIZERS entry, they must either update this
// test's fixture list (forcing them to notice the registration gap)
// or accept a failing test.

import { describe, expect, it, vi } from "vitest";
import { serializeSlideTree } from "../src/ooxml/drawing/orchestrator.js";
import * as loggerModule from "../src/logger.js";
import type { LayoutNode } from "../src/layout/extract.js";

// Exhaustive list from layout/extract.ts LayoutNode union. Adding a
// new variant requires adding a fixture here.
const EXPECTED_TYPES = [
  "View",
  "Slide",
  "Text",
  "Image",
  "Table",
  "Chart",
  "Connector",
  "Group",
  "Video",
  "Audio",
] as const;

const MIN_LAYOUT = { x: 0, y: 0, width: 200, height: 100 };

function makeNode(type: typeof EXPECTED_TYPES[number]): LayoutNode {
  const base = { layout: { ...MIN_LAYOUT } } as const;
  switch (type) {
    case "View":
      return { type: "View", ...base, children: [] } as unknown as LayoutNode;
    case "Slide":
      return { type: "Slide", ...base, children: [] } as unknown as LayoutNode;
    case "Text":
      return { type: "Text", ...base, content: "hello" } as unknown as LayoutNode;
    case "Image":
      return {
        type: "Image",
        ...base,
        src: "https://example.com/img.png",
      } as unknown as LayoutNode;
    case "Table":
      return {
        type: "Table",
        ...base,
        rows: [{ cells: [{ content: "a" }] }],
        columns: [{ width: 200 }],
      } as unknown as LayoutNode;
    case "Chart":
      return {
        type: "Chart",
        ...base,
        chartData: {
          chartType: "bar",
          categories: ["Q1"],
          series: [{ name: "s", values: [1] }],
        },
      } as unknown as LayoutNode;
    case "Connector":
      return {
        type: "Connector",
        ...base,
        connectorType: "straight",
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as unknown as LayoutNode;
    case "Group":
      return {
        type: "Group",
        ...base,
        children: [],
      } as unknown as LayoutNode;
    case "Video":
      return {
        type: "Video",
        ...base,
        src: "video.mp4",
      } as unknown as LayoutNode;
    case "Audio":
      return {
        type: "Audio",
        ...base,
        src: "audio.mp3",
      } as unknown as LayoutNode;
  }
}

function captureUnknownWarnings(fn: () => void): string[] {
  const warn = vi.fn();
  const orig = loggerModule.getLogger();
  const spy = vi
    .spyOn(loggerModule, "getLogger")
    .mockReturnValue({ ...orig, warn } as ReturnType<typeof loggerModule.getLogger>);
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return warn.mock.calls
    .map((args) => (typeof args[0] === "string" ? args[0] : ""))
    .filter((msg) => msg.includes("UNKNOWN_NODE_TYPE"));
}

describe("orchestrator serializer coverage", () => {
  for (const type of EXPECTED_TYPES) {
    it(`registers a serializer for LayoutNode.type="${type}"`, () => {
      const root: LayoutNode = {
        type: "Slide",
        layout: { ...MIN_LAYOUT },
        children: [makeNode(type)],
      } as unknown as LayoutNode;
      const unknowns = captureUnknownWarnings(() => {
        serializeSlideTree(root);
      });
      expect(
        unknowns,
        `${type} produced UNKNOWN_NODE_TYPE warning; add a handler in orchestrator.ts SERIALIZERS`,
      ).toEqual([]);
    });
  }

  it("emits UNKNOWN_NODE_TYPE for a truly bogus type (sanity check)", () => {
    const bogus = {
      type: "NotARealNodeType",
      layout: { ...MIN_LAYOUT },
    } as unknown as LayoutNode;
    const root: LayoutNode = {
      type: "Slide",
      layout: { ...MIN_LAYOUT },
      children: [bogus],
    } as unknown as LayoutNode;
    const unknowns = captureUnknownWarnings(() => {
      serializeSlideTree(root);
    });
    expect(unknowns.length).toBeGreaterThan(0);
    expect(unknowns[0]).toContain("NotARealNodeType");
  });
});
