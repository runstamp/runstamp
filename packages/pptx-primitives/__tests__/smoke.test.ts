/**
 * Foundation smoke test.
 *
 * Exercises the full Phase-0 path in one go: caller submits a partial token
 * bundle; resolver produces a ResolvedTokens; footerChrome emits nodes;
 * toPaperNodes translates to engine AST.
 *
 * The test does NOT render to .pptx — that would pull the engine into this
 * package's test graph, which we've deliberately avoided. The smoke render
 * lives in packages/chaos-lab/proof/pptx/run-sota-harness.mjs where the engine is present.
 */
import { describe, expect, it } from "vitest";
import {
  bulletList,
  resolveTokens,
  connectorLine,
  footerChrome,
  harveyBall,
  matrixTable,
  numberedChip,
  orgTree,
  quadrantMap,
  textBlock,
  toPaperNodes,
  type PrimitiveNode,
  type TokenBundle,
  type ViewNode,
} from "../src/index.js";

describe("foundation smoke", () => {
  it("resolves a partial bundle against defaults", () => {
    const bundle: TokenBundle = {
      version: "1.0",
      palette: { accent: "#DA291C" },
    };
    const tokens = resolveTokens(bundle);
    expect(tokens.palette.accent).toBe("#DA291C");
    expect(tokens.palette.foreground).toBe("#0A0A0A"); // inherited
    expect(tokens.canvas.surface).toBe("#FFFFFF");
  });

  it("rejects unknown keys", () => {
    expect(() =>
      resolveTokens({
        version: "1.0",
        paletteTypo: { accent: "#000" },
      } as unknown),
    ).toThrow(/input bundle failed validation/u);
  });

  it("parses a compound rule pattern (Bain bar)", () => {
    const tokens = resolveTokens({
      version: "1.0",
      rules: { title: "3px solid #DA291C + 1px solid #CCCCCC gap:1" },
    });
    expect(tokens.rules.title).toBe("3px solid #DA291C + 1px solid #CCCCCC gap:1");
  });

  it("errors on malformed rule pattern at resolve time", () => {
    expect(() =>
      resolveTokens({
        version: "1.0",
        rules: { title: "3px squiggle #DA291C" },
      }),
    ).toThrow(/rule pattern failed to parse/u);
  });

  it("footerChrome emits fit result for minimal bundle", () => {
    const tokens = resolveTokens({ version: "1.0" });
    const region = { left: 56, top: 506, width: 848, height: 32 };
    const result = footerChrome({ slideIndex: 3, totalSlides: 8 }, tokens, region);
    expect(result.overflow.kind).toBe("fit");
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("rejects numbered bullet schemes without an autoNum marker", () => {
    expect(() =>
      resolveTokens({
        version: "1.0",
        ornament: {
          bullet: {
            marker: "filledDot",
            scheme: "arabicPeriod",
          },
        },
      }),
    ).toThrow(/scheme is only valid/u);
  });

  it("bulletList can inherit native auto numbering from tokens", () => {
    const tokens = resolveTokens({
      version: "1.0",
      ornament: {
        bullet: {
          marker: "autoNum",
          scheme: "arabicPeriod",
          indent: 24,
          gap: 8,
        },
      },
    });
    const result = bulletList(
      { items: [{ text: "First" }, { text: "Second" }] },
      tokens,
      { left: 0, top: 0, width: 360, height: 120 },
    );

    const textNodes = result.nodes.filter((node) => node.kind === "text");
    expect(textNodes).toHaveLength(2);
    expect(textNodes[0].paragraphs?.[0]?.bullet).toEqual({
      type: "autoNum",
      scheme: "arabicPeriod",
      startAt: 1,
    });
    expect(textNodes[1].paragraphs?.[0]?.bullet).toEqual({
      type: "autoNum",
      scheme: "arabicPeriod",
      startAt: 2,
    });
  });

  it("footerChrome respects disclaimer + pageNumber layout (Bain-shaped)", () => {
    const tokens = resolveTokens({
      version: "1.0",
      palette: { accent: "#DA291C" },
      chrome: {
        footer: {
          layout: ["disclaimer", "spacer", "projectCode", "pageNumber"],
          disclaimer: "This information is confidential.",
          projectCode: "150323-Tiger-Final update vf",
        },
      },
      ornament: {
        pageNumber: { style: "circledAccent" },
      },
    });
    const region = { left: 56, top: 506, width: 848, height: 32 };
    const result = footerChrome({ slideIndex: 5, totalSlides: 40 }, tokens, region);
    expect(result.overflow.kind).toBe("fit");
    // disclaimer + projectCode (text) + pageNumber (view with child text)
    const textCount = result.nodes.filter((n) => n.kind === "text").length;
    const viewCount = result.nodes.filter((n) => n.kind === "view").length;
    expect(textCount).toBeGreaterThanOrEqual(2); // disclaimer + projectCode
    expect(viewCount).toBeGreaterThanOrEqual(1); // circled accent page number
  });

  it("footerChrome page-number ornament children are relative to the ornament box", () => {
    const tokens = resolveTokens({
      version: "1.0",
      ornament: {
        pageNumber: { style: "boxedAccent" },
      },
      chrome: {
        footer: {
          height: 28,
          topRule: "1px solid token:rule",
          layout: ["projectCode", "spacer", "pageNumber"],
          projectCode: "Market Quest",
        },
      },
    });
    const result = footerChrome({ slideIndex: 1, totalSlides: 12 }, tokens, {
      left: 46,
      top: 512,
      width: 868,
      height: 28,
    });
    const pageNumber = result.nodes.find(
      (node): node is ViewNode => node.kind === "view" && Boolean(node.children?.length),
    );
    expect(pageNumber?.kind).toBe("view");
    expect(pageNumber?.children?.[0]?.rect).toEqual({
      left: 0,
      top: 0,
      width: pageNumber?.rect.width,
      height: pageNumber?.rect.height,
    });
  });

  it("harveyBall emits editable pie-wedge geometry for partial fills", () => {
    const tokens = resolveTokens({ version: "1.0" });
    const result = harveyBall({ filled: 3 }, tokens, { left: 0, top: 0, width: 40, height: 40 });
    const wedgeNodes = result.nodes.filter(
      (node): node is ViewNode => node.kind === "view" && node.shape === "pieWedge",
    );
    expect(wedgeNodes).toHaveLength(3);
    expect(wedgeNodes.map((node) => node.rotation)).toEqual([0, 90, 180]);
  });

  it("toPaperNodes produces engine-compatible AST shape", () => {
    const tokens = resolveTokens({
      version: "1.0",
      chrome: {
        footer: {
          layout: ["spacer", "pageNumber"],
        },
      },
    });
    const region = { left: 56, top: 506, width: 848, height: 32 };
    const { nodes } = footerChrome({ slideIndex: 1, totalSlides: 1 }, tokens, region);
    const engineNodes = toPaperNodes(nodes);
    for (const n of engineNodes) {
      expect(["Text", "View", "Image"]).toContain(n.type);
      expect(n.style.position).toBe("absolute");
      expect(typeof n.style.left).toBe("number");
      expect(typeof n.style.top).toBe("number");
    }
  });

  it("matrixTable can distribute short rows across the assigned height", () => {
    const tokens = resolveTokens({
      version: "1.0",
      palette: { accent: "#111111", muted: "#333333" },
    });
    const result = matrixTable(
      {
        rowLabelStyle: "filled",
        distributeRows: true,
        rows: [
          { label: "A", cells: ["Short"] },
          { label: "B", cells: ["Short"] },
        ],
      },
      tokens,
      { left: 40, top: 40, width: 480, height: 220 },
    );

    expect(result.overflow.kind).toBe("fit");
    const labelFills = result.nodes.filter((node) =>
      node.kind === "view" &&
      node.rect.left === 40 &&
      node.rect.width >= 120 &&
      node.rect.height > 2,
    );
    expect(labelFills).toHaveLength(2);
    expect(labelFills.every((node) => node.rect.height > 90)).toBe(true);
  });

  it("matrixTable honors minRowHeight without compressing natural content", () => {
    const tokens = resolveTokens({
      version: "1.0",
      palette: { accent: "#111111", muted: "#333333" },
    });
    const result = matrixTable(
      {
        rowLabelStyle: "filled",
        minRowHeight: 72,
        rows: [
          { label: "A", cells: ["Short"] },
          { label: "B", cells: ["Short"] },
        ],
      },
      tokens,
      { left: 40, top: 40, width: 480, height: 220 },
    );

    expect(result.overflow.kind).toBe("fit");
    const labelFills = result.nodes.filter((node) =>
      node.kind === "view" &&
      node.rect.left === 40 &&
      node.rect.width >= 120 &&
      node.rect.height > 2,
    );
    expect(labelFills.map((node) => node.rect.height)).toEqual([72, 72]);
  });

  it("textBlock resolves role colors inside rich text runs", () => {
    const tokens = resolveTokens({
      version: "1.0",
      palette: { accent: "#123456", muted: "#654321" },
    });
    const result = textBlock(
      {
        content: [
          { runs: [{ text: "Muted", color: "muted" }, { text: " accent", color: "accent" }] },
        ],
      },
      tokens,
      { left: 0, top: 0, width: 300, height: 80 },
    );

    const text = result.nodes.find((node) => node.kind === "text");
    expect(text?.kind).toBe("text");
    expect(text?.paragraphs?.[0]?.runs.map((run) => run.color)).toEqual(["#654321", "#123456"]);
  });

  it("textBlock paragraph lists can inherit native auto numbering from tokens", () => {
    const tokens = resolveTokens({
      version: "1.0",
      ornament: {
        bullet: {
          marker: "autoNum",
          scheme: "arabicPeriod",
        },
      },
    });
    const result = textBlock(
      {
        content: [
          { runs: [{ text: "First" }], level: 0, indent: 24, hangingIndent: 24 },
          { runs: [{ text: "Explicit none" }], level: 0, indent: 24, hangingIndent: 24, bullet: { type: "none" } },
          { runs: [{ text: "Second" }], level: 0, indent: 24, hangingIndent: 24 },
        ],
      },
      tokens,
      { left: 0, top: 0, width: 360, height: 120 },
    );

    const text = result.nodes.find((node) => node.kind === "text");
    expect(text?.kind).toBe("text");
    expect(text?.paragraphs?.[0]?.bullet).toEqual({
      type: "autoNum",
      scheme: "arabicPeriod",
      startAt: 1,
    });
    expect(text?.paragraphs?.[1]?.bullet).toEqual({ type: "none" });
    expect(text?.paragraphs?.[2]?.bullet).toEqual({
      type: "autoNum",
      scheme: "arabicPeriod",
      startAt: 2,
    });
  });

  it("quadrantMap can render a framework without points", () => {
    const tokens = resolveTokens({ version: "1.0" });
    const result = quadrantMap(
      {
        xAxisLabel: { low: "Low", high: "High" },
        yAxisLabel: { low: "Small", high: "Large" },
        quadrants: ["A", "B", "C", "D"],
      },
      tokens,
      { left: 0, top: 0, width: 480, height: 300 },
    );

    expect(result.overflow.kind).toBe("fit");
    expect(result.nodes.some((node) => node.kind === "view")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "text" && node.content === "A")).toBe(true);
  });

  it("quadrantMap point labels dodge quadrant captions", () => {
    const tokens = resolveTokens({ version: "1.0" });
    const result = quadrantMap(
      {
        xAxisLabel: { low: "narrow", high: "portable" },
        yAxisLabel: { low: "fragile", high: "safe" },
        quadrants: ["Watch", "Improve", "Defer", "Ship"],
        points: [{ name: "P9", x: 78, y: 82, emphasis: "primary" }],
      },
      tokens,
      { left: 0, top: 0, width: 300, height: 180 },
    );

    const ship = result.nodes.find((node) => node.kind === "text" && node.content === "SHIP");
    const pointLabel = result.nodes.find((node) => node.kind === "text" && node.content === "P9");
    expect(ship?.kind).toBe("text");
    expect(pointLabel?.kind).toBe("text");
    expect(rectsOverlap(ship!.rect, pointLabel!.rect)).toBe(false);
  });

  it("orgTree keeps root title and subtitle inside the root box", () => {
    const tokens = resolveTokens({
      version: "1.0",
      type: {
        title: { family: "Helvetica", weight: 800, size: 34, lineHeight: 42, transform: "none" },
      },
    });
    const result = orgTree(
      {
        root: { title: "PPTX engine", subtitle: "GA gate" },
        children: [{ title: "JS" }, { title: "XML" }, { title: "PPT" }],
      },
      tokens,
      { left: 0, top: 0, width: 320, height: 150 },
    );

    const flattened = flattenWithAbsoluteRects(result.nodes);
    const rootBox = flattened.find((node) => node.kind === "view" && node.fill);
    const rootTitle = flattened.find((node) => node.kind === "text" && node.content === "PPTX engine");
    const rootSubtitle = flattened.find((node) => node.kind === "text" && node.content === "GA gate");
    expect(rootBox?.kind).toBe("view");
    expect(rootTitle?.kind).toBe("text");
    expect(rootSubtitle?.kind).toBe("text");
    expect(rectContains(rootBox!.rect, rootTitle!.rect)).toBe(true);
    expect(rectContains(rootBox!.rect, rootSubtitle!.rect)).toBe(true);
  });

  it("connectorLine defaults its layout bounds to its endpoints", () => {
    const tokens = resolveTokens({ version: "1.0" });
    const result = connectorLine(
      {
        start: { x: 100, y: 120 },
        end: { x: 240, y: 120 },
        width: 2,
      },
      tokens,
      { left: 0, top: 0, width: 10, height: 10 },
    );

    const line = result.nodes[0];
    expect(line.kind).toBe("connector");
    expect(line.rect.left).toBeLessThan(100);
    expect(line.rect.width).toBeGreaterThan(140);
    expect(line.rect.height).toBeGreaterThan(1);
  });

  it("numberedChip can stay fixed-size inside a larger region", () => {
    const tokens = resolveTokens({ version: "1.0" });
    const result = numberedChip(
      {
        index: 3,
        shape: "ellipse",
        size: 30,
        anchor: "center",
      },
      tokens,
      { left: 10, top: 20, width: 120, height: 80 },
    );

    const chip = result.nodes[0];
    expect(chip.rect).toEqual({ left: 55, top: 45, width: 30, height: 30 });
  });
});

function flattenWithAbsoluteRects(
  nodes: PrimitiveNode[],
  origin: { x: number; y: number } = { x: 0, y: 0 },
): PrimitiveNode[] {
  return nodes.flatMap((node) => {
    const absoluteNode = {
      ...node,
      rect: {
        left: origin.x + node.rect.left,
        top: origin.y + node.rect.top,
        width: node.rect.width,
        height: node.rect.height,
      },
    } as PrimitiveNode;
    const children = node.kind === "view" && node.children
      ? flattenWithAbsoluteRects(node.children, { x: absoluteNode.rect.left, y: absoluteNode.rect.top })
      : [];
    return [absoluteNode, ...children];
  });
}

function rectsOverlap(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): boolean {
  return (
    a.left < b.left + b.width
    && a.left + a.width > b.left
    && a.top < b.top + b.height
    && a.top + a.height > b.top
  );
}

function rectContains(
  outer: { left: number; top: number; width: number; height: number },
  inner: { left: number; top: number; width: number; height: number },
): boolean {
  return (
    outer.left <= inner.left
    && outer.top <= inner.top
    && outer.left + outer.width >= inner.left + inner.width
    && outer.top + outer.height >= inner.top + inner.height
  );
}
