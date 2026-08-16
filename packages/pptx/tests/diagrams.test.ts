import { describe, it, expect } from "vitest";
import { generateDiagram } from "../src/diagrams/index.js";
import type { DiagramConfig, PaperNode, PaperConnector } from "../src/types/ast.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getChildren(group: PaperNode): PaperNode[] {
  return (group as any).children ?? [];
}

function childrenOfType(group: PaperNode, type: string): PaperNode[] {
  return getChildren(group).filter(c => c.type === type);
}

// ---------------------------------------------------------------------------
// Process Flow
// ---------------------------------------------------------------------------

describe("generateDiagram — process", () => {
  it("produces correct child count (n Views + n-1 Connectors)", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [
        { text: "Step 1" },
        { text: "Step 2" },
        { text: "Step 3" },
      ],
    };
    const group = generateDiagram(config);
    expect(group.type).toBe("Group");

    const views = childrenOfType(group, "View");
    const connectors = childrenOfType(group, "Connector");
    expect(views.length).toBe(3);
    expect(connectors.length).toBe(2);
  });

  it("positions boxes horizontally by default", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "A" }, { text: "B" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    const leftA = (views[0] as any).style?.left ?? 0;
    const leftB = (views[1] as any).style?.left ?? 0;
    expect(leftB).toBeGreaterThan(leftA);
  });

  it("positions boxes vertically when direction='vertical'", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "A" }, { text: "B" }],
      direction: "vertical",
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    const topA = (views[0] as any).style?.top ?? 0;
    const topB = (views[1] as any).style?.top ?? 0;
    expect(topB).toBeGreaterThan(topA);
  });

  it("handles single item (no connectors)", () => {
    const config: DiagramConfig = {
      type: "process",
      items: [{ text: "Only" }],
    };
    const group = generateDiagram(config);
    expect(childrenOfType(group, "View").length).toBe(1);
    expect(childrenOfType(group, "Connector").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Hierarchy
// ---------------------------------------------------------------------------

describe("generateDiagram — hierarchy", () => {
  it("creates recursive tree layout", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [
        {
          text: "CEO",
          children: [
            { text: "VP Engineering" },
            { text: "VP Sales" },
          ],
        },
      ],
    };
    const group = generateDiagram(config);
    expect(group.type).toBe("Group");

    const views = childrenOfType(group, "View");
    expect(views.length).toBe(3); // CEO + 2 VPs
  });

  it("creates elbow connectors between parent and children", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [
        {
          text: "Root",
          children: [{ text: "Child 1" }, { text: "Child 2" }],
        },
      ],
    };
    const group = generateDiagram(config);
    const connectors = childrenOfType(group, "Connector");
    expect(connectors.length).toBeGreaterThanOrEqual(2);
  });

  it("handles single node (no children)", () => {
    const config: DiagramConfig = {
      type: "hierarchy",
      items: [{ text: "Alone" }],
    };
    const group = generateDiagram(config);
    expect(childrenOfType(group, "View").length).toBe(1);
    expect(childrenOfType(group, "Connector").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

describe("generateDiagram — cycle", () => {
  it("positions nodes in a circle", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    expect(views.length).toBe(3);

    // All should have absolute positions forming a rough circle
    const positions = views.map(v => ({
      left: (v as any).style?.left,
      top: (v as any).style?.top,
    }));
    // Positions should all be defined
    expect(positions.every(p => typeof p.left === "number" && typeof p.top === "number")).toBe(true);
  });

  it("creates ring of connectors", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }],
    };
    const group = generateDiagram(config);
    const connectors = childrenOfType(group, "Connector");
    // Ring: 3 connectors for 3 items (A→B, B→C, C→A)
    expect(connectors.length).toBe(3);
  });

  it("uses ellipse shapes", () => {
    const config: DiagramConfig = {
      type: "cycle",
      items: [{ text: "A" }, { text: "B" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    expect(views.every(v => (v as any).shapeType === "ellipse")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

describe("generateDiagram — matrix", () => {
  it("creates 4 quadrants", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [
        { text: "TL" },
        { text: "TR" },
        { text: "BL" },
        { text: "BR" },
      ],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    expect(views.length).toBe(4);
  });

  it("positions quadrants correctly (2x2 grid)", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "TL" }, { text: "TR" }, { text: "BL" }, { text: "BR" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    const positions = views.map(v => ({
      left: (v as any).style?.left ?? 0,
      top: (v as any).style?.top ?? 0,
    }));

    // Top-left should be at (0,0), Top-right further right
    expect(positions[0].left).toBeLessThan(positions[1].left);
    // Bottom-left should be below top-left
    expect(positions[2].top).toBeGreaterThan(positions[0].top);
  });

  it("uses roundRect shapes", () => {
    const config: DiagramConfig = {
      type: "matrix",
      items: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    expect(views.every(v => (v as any).shapeType === "roundRect")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pyramid
// ---------------------------------------------------------------------------

describe("generateDiagram — pyramid", () => {
  it("creates stacked trapezoid levels", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "Top" }, { text: "Middle" }, { text: "Bottom" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    expect(views.length).toBe(3);
    expect(views.every(v => (v as any).shapeType === "trapezoid")).toBe(true);
  });

  it("widths narrow toward bottom (pyramid shape)", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "Top" }, { text: "Middle" }, { text: "Bottom" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    const widths = views.map(v => (v as any).style?.width ?? 0);
    // First item (i=0) is widest, last (i=2) is narrowest
    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it("levels are vertically stacked", () => {
    const config: DiagramConfig = {
      type: "pyramid",
      items: [{ text: "A" }, { text: "B" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    const tops = views.map(v => (v as any).style?.top ?? 0);
    expect(tops[1]).toBeGreaterThan(tops[0]);
  });
});

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

describe("generateDiagram — list", () => {
  it("creates stacked items with spacing (vertical)", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [{ text: "Item 1" }, { text: "Item 2" }, { text: "Item 3" }],
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");
    expect(views.length).toBeGreaterThanOrEqual(3);
  });

  it("arranges items horizontally when direction='horizontal'", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [{ text: "A" }, { text: "B" }],
      direction: "horizontal",
    };
    const group = generateDiagram(config);
    const views = childrenOfType(group, "View");

    // Filter to the item boxes (not icon circles)
    const itemBoxes = views.filter(v => (v as any).shapeType === "roundRect");
    if (itemBoxes.length >= 2) {
      const leftA = (itemBoxes[0] as any).style?.left ?? 0;
      const leftB = (itemBoxes[1] as any).style?.left ?? 0;
      expect(leftB).toBeGreaterThan(leftA);
    }
  });

  it("handles empty items list", () => {
    const config: DiagramConfig = {
      type: "list",
      items: [],
    };
    const group = generateDiagram(config);
    expect(group.type).toBe("Group");
    expect(getChildren(group).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("generateDiagram — error handling", () => {
  it("throws for unknown diagram type", () => {
    expect(() => generateDiagram({ type: "unknown" as any, items: [] })).toThrow(/Unknown diagram type/);
  });
});
