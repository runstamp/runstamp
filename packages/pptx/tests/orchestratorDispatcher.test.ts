// WS-5: orchestrator dispatcher must never silently drop unknown node types.
// A new node.type value introduced without a SERIALIZERS registry entry
// should log a structured UNKNOWN_NODE_TYPE warning and skip the node.

import { describe, expect, it, vi } from "vitest";
import { serializeSlideTree } from "../src/ooxml/drawing/orchestrator.js";
import * as loggerModule from "../src/logger.js";
import type { LayoutNode } from "../src/layout/extract.js";

function makeRootSlide(children: LayoutNode[]): LayoutNode {
  return {
    type: "Slide",
    layout: { x: 0, y: 0, width: 960, height: 540 },
    children,
  } as unknown as LayoutNode;
}

describe("orchestrator dispatcher", () => {
  it("emits UNKNOWN_NODE_TYPE warning for unregistered node types", () => {
    const warn = vi.fn();
    const origLogger = loggerModule.getLogger();
    vi.spyOn(loggerModule, "getLogger").mockReturnValue({
      ...origLogger,
      warn,
    } as ReturnType<typeof loggerModule.getLogger>);

    const bogus = {
      type: "TotallyMadeUpNode",
      layout: { x: 0, y: 0, width: 10, height: 10 },
    } as unknown as LayoutNode;

    const root = makeRootSlide([bogus]);
    const result = serializeSlideTree(root);

    expect(result.xml).not.toContain("TotallyMadeUpNode");
    const unknownCall = warn.mock.calls.find((args) =>
      typeof args[0] === "string" && args[0].includes("UNKNOWN_NODE_TYPE"),
    );
    expect(unknownCall).toBeDefined();
    expect(unknownCall?.[0]).toContain("TotallyMadeUpNode");
  });

  it("still serializes known siblings alongside an unknown node", () => {
    const textNode = {
      type: "Text",
      layout: { x: 0, y: 0, width: 200, height: 40 },
      content: "hello",
    } as unknown as LayoutNode;
    const bogus = {
      type: "MadeUp2",
      layout: { x: 0, y: 0, width: 10, height: 10 },
    } as unknown as LayoutNode;

    const root = makeRootSlide([textNode, bogus]);
    const result = serializeSlideTree(root);
    expect(result.xml).toContain("hello");
  });
});
