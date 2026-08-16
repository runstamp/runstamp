// tests/renderer.test.ts — Canvas renderer unit test suite
import { describe, it, expect, beforeAll } from "vitest";
import type { LayoutNode } from "../src/layout/extract.js";
import type { ThemeColorScheme } from "../src/types/ast.js";

// ---------------------------------------------------------------------------
// 1. Color Resolver
// ---------------------------------------------------------------------------

describe("resolveColorValue", () => {
  let resolveColorValue: (color: any, themeColors?: ThemeColorScheme) => string | undefined;

  beforeAll(async () => {
    const mod = await import("../src/renderer/colorResolver.js");
    resolveColorValue = mod.resolveColorValue;
  });

  it("returns undefined for undefined/null", () => {
    expect(resolveColorValue(undefined)).toBeUndefined();
    expect(resolveColorValue(null)).toBeUndefined();
  });

  it("passes through CSS #-prefixed hex colors", () => {
    expect(resolveColorValue("#FF0000")).toBe("#FF0000");
    expect(resolveColorValue("#abc")).toBe("#abc");
  });

  it("adds # prefix to bare 6-digit hex", () => {
    expect(resolveColorValue("4472C4")).toBe("#4472C4");
    expect(resolveColorValue("000000")).toBe("#000000");
  });

  it("resolves default scheme tokens without custom theme", () => {
    // DEFAULT_SCHEME has dk1, lt1, accent1, etc.
    const result = resolveColorValue("accent1");
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("resolves custom theme color tokens", () => {
    const theme: ThemeColorScheme = { accent1: "FF0000" } as any;
    expect(resolveColorValue("accent1", theme)).toBe("#FF0000");
  });

  it("passes CSS named colors through", () => {
    expect(resolveColorValue("red")).toBe("red");
    expect(resolveColorValue("transparent")).toBe("transparent");
  });

  it("applies tint modifier (towards white)", () => {
    const color = { scheme: "dk1", tint: 50 };
    const result = resolveColorValue(color, { dk1: "000000" } as any);
    // Tint 50% on black → each channel = 0 + (255-0) * 0.5 = 128
    expect(result).toBe("#808080");
  });

  it("applies shade modifier (towards black)", () => {
    const color = { scheme: "lt1", shade: 50 };
    const result = resolveColorValue(color, { lt1: "FFFFFF" } as any);
    // Shade 50% on white → each channel = 255 * 0.5 = 128
    expect(result).toBe("#808080");
  });

  it("applies lumMod modifier", () => {
    const color = { scheme: "accent1", lumMod: 75 };
    const result = resolveColorValue(color, { accent1: "4472C4" } as any);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    // Should be darker than the original
    expect(result).not.toBe("#4472C4");
  });

  it("applies comp (complement) modifier", () => {
    const color = { scheme: "dk1", comp: true };
    const result = resolveColorValue(color, { dk1: "000000" } as any);
    // Complement of black = white
    expect(result).toBe("#ffffff");
  });

  it("applies gray modifier", () => {
    const color = { scheme: "accent1", gray: true };
    const result = resolveColorValue(color, { accent1: "FF0000" } as any);
    // Grayscale of red: 0.299*255 + 0.587*0 + 0.114*0 ≈ 76
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    // R=G=B for grayscale
    const hex = result!.slice(1);
    expect(hex.slice(0, 2)).toBe(hex.slice(2, 4));
    expect(hex.slice(2, 4)).toBe(hex.slice(4, 6));
  });

  it("falls back to #000000 for unresolvable scheme in modifier", () => {
    const color = { scheme: "nonexistent_token_xyz" };
    expect(resolveColorValue(color)).toBe("#000000");
  });
});

describe("resolveColorWithAlpha", () => {
  let resolveColorWithAlpha: (color: any, opacity?: number, themeColors?: ThemeColorScheme) => any;

  beforeAll(async () => {
    const mod = await import("../src/renderer/colorResolver.js");
    resolveColorWithAlpha = mod.resolveColorWithAlpha;
  });

  it("returns color and default alpha=1", () => {
    const result = resolveColorWithAlpha("#FF0000");
    expect(result).toEqual({ color: "#FF0000", alpha: 1 });
  });

  it("returns custom alpha", () => {
    const result = resolveColorWithAlpha("#00FF00", 0.5);
    expect(result).toEqual({ color: "#00FF00", alpha: 0.5 });
  });

  it("returns undefined for undefined color", () => {
    expect(resolveColorWithAlpha(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Canvas Renderer — Integration Tests
// ---------------------------------------------------------------------------

describe("renderSlideToCanvas", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  /** Helper: create a minimal slide LayoutNode with given children. */
  function makeSlide(children: Partial<LayoutNode>[] = [], background?: any): LayoutNode {
    return {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: children as LayoutNode[],
      ...(background ? { background } : {}),
    } as LayoutNode;
  }

  it("renders an empty slide without throwing", () => {
    const canvas = createCanvas(1920, 1080);
    const slide = makeSlide();
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("fills the canvas with white for an empty slide", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide();
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    const pixel = ctx.getImageData(96, 54, 1, 1).data;
    // Should be white (255, 255, 255, 255)
    expect(pixel[0]).toBe(255);
    expect(pixel[1]).toBe(255);
    expect(pixel[2]).toBe(255);
  });

  it("renders a solid background", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([], { type: "solid", color: "#FF0000" });
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    const pixel = ctx.getImageData(96, 54, 1, 1).data;
    // Should be red
    expect(pixel[0]).toBe(255);
    expect(pixel[1]).toBe(0);
    expect(pixel[2]).toBe(0);
  });

  it("renders a gradient background", () => {
    const canvas = createCanvas(192, 108);
    // CSS angle: 90° = left-to-right gradient
    const slide = makeSlide([], {
      type: "gradient",
      angle: 90,
      stops: [
        { position: 0, color: "#000000" },
        { position: 100, color: "#FFFFFF" },
      ],
    });
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    const leftPixel = ctx.getImageData(10, 54, 1, 1).data;
    const rightPixel = ctx.getImageData(182, 54, 1, 1).data;
    // Left should be darker than right (CSS 90° = left-to-right)
    expect(leftPixel[0]).toBeLessThan(rightPixel[0]);
  });

  it("renders a View node with backgroundColor", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 100, height: 50 },
      style: { backgroundColor: "#00FF00" },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // Sample inside the green rectangle (scaled: 10/960*192 ≈ 2, center ≈ 12)
    const px = Math.round(60 / 960 * 192);
    const py = Math.round(35 / 540 * 108);
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    // Should be green
    expect(pixel[1]).toBeGreaterThan(200);
  });

  it("renders style.borderRadius on View nodes as rounded corners", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 200, height: 150 },
      style: { backgroundColor: "#FF0000", borderRadius: 40 },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");

    const outsideCorner = ctx.getImageData(20, 20, 1, 1).data;
    const insideFill = ctx.getImageData(30, 30, 1, 1).data;

    expect(outsideCorner[0]).toBe(255);
    expect(outsideCorner[1]).toBe(255);
    expect(outsideCorner[2]).toBe(255);
    expect(insideFill[0]).toBeGreaterThan(200);
    expect(insideFill[1]).toBeLessThan(50);
    expect(insideFill[2]).toBeLessThan(50);
  });

  it("renders a View with solid fill", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: { fill: { type: "solid", color: "#0000FF" } },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with gradient fill", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: {
        fill: {
          type: "linear",
          angle: 90,
          stops: [
            { position: 0, color: "#FF0000" },
            { position: 100, color: "#0000FF" },
          ],
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with radial gradient fill", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: {
        fill: {
          type: "radial",
          stops: [
            { position: 0, color: "#FFFFFF" },
            { position: 100, color: "#000000" },
          ],
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with pattern fill", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: { fill: { type: "pattern", foreground: "#CCCCCC" } },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with border", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: { borderWidth: 2, borderColor: "#000000", backgroundColor: "#EEEEEE" },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with dashed border", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: { borderWidth: 2, borderColor: "#FF0000", borderStyle: "dashed", backgroundColor: "#FFF" },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with rotation", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 50, y: 50, width: 100, height: 50 },
      style: { rotation: 45, backgroundColor: "#00FF00" },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with opacity", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 10, y: 10, width: 200, height: 100 },
      style: { opacity: 0.5, backgroundColor: "#FF0000" },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with drop shadow", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 50, y: 50, width: 100, height: 50 },
      style: {
        backgroundColor: "#FFFFFF",
        effects: {
          dropShadow: { color: "rgba(0,0,0,0.5)", blurRadius: 4, offsetX: 2, offsetY: 2 },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a View with inner shadow", () => {
    const canvas = createCanvas(192, 108);
    // Use slide-space coordinates (960x540), canvas scale = 0.2
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 600, height: 300 },
      style: {
        backgroundColor: "#FFFFFF",
        effects: {
          innerShadow: { color: "#000000", blurRadius: 8, offsetX: 3, offsetY: 3 },
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // Center of shape: slide (400, 250) → canvas (80, 50)
    const centerPixel = ctx.getImageData(80, 50, 1, 1).data;
    expect(centerPixel[0]).toBeGreaterThan(200);
    // Edge of shape: slide (103, 103) → canvas (21, 21)
    const edgePixel = ctx.getImageData(21, 21, 1, 1).data;
    expect(edgePixel[0]).toBeLessThan(centerPixel[0]);
  });

  it("renders a View with both drop shadow and inner shadow", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 30, y: 30, width: 100, height: 50 },
      style: {
        backgroundColor: "#FFFFFF",
        effects: {
          dropShadow: { color: "rgba(0,0,0,0.5)", blurRadius: 4, offsetX: 2, offsetY: 2 },
          innerShadow: { color: "#000000", blurRadius: 6, offsetX: 2, offsetY: 2 },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders gradient with CSS angle 0° (bottom-to-top)", () => {
    const canvas = createCanvas(192, 108);
    // Full slide-space coverage → fills entire canvas
    const slide = makeSlide([{
      type: "View",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      style: {
        fill: {
          type: "linear",
          angle: 0,
          stops: [
            { position: 0, color: "#000000" },
            { position: 100, color: "#FFFFFF" },
          ],
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // CSS 0° = bottom-to-top: bottom should be dark, top should be light
    const topPixel = ctx.getImageData(96, 5, 1, 1).data;
    const bottomPixel = ctx.getImageData(96, 103, 1, 1).data;
    expect(bottomPixel[0]).toBeLessThan(topPixel[0]);
  });

  it("renders gradient with CSS angle 180° (top-to-bottom)", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      style: {
        fill: {
          type: "linear",
          angle: 180,
          stops: [
            { position: 0, color: "#000000" },
            { position: 100, color: "#FFFFFF" },
          ],
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // CSS 180° = top-to-bottom: top should be dark, bottom should be light
    const topPixel = ctx.getImageData(96, 5, 1, 1).data;
    const bottomPixel = ctx.getImageData(96, 103, 1, 1).data;
    expect(topPixel[0]).toBeLessThan(bottomPixel[0]);
  });

  it("renders gradient with default angle (top-to-bottom)", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      style: {
        fill: {
          type: "linear",
          // No angle specified — default should be 180° (top-to-bottom)
          stops: [
            { position: 0, color: "#000000" },
            { position: 100, color: "#FFFFFF" },
          ],
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    const topPixel = ctx.getImageData(96, 5, 1, 1).data;
    const bottomPixel = ctx.getImageData(96, 103, 1, 1).data;
    // Default 180° = top-to-bottom: top darker, bottom lighter
    expect(topPixel[0]).toBeLessThan(bottomPixel[0]);
  });
});

// ---------------------------------------------------------------------------
// 3. Shape Registry Tests
// ---------------------------------------------------------------------------

describe("shape types", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  const shapeTypes = [
    "ellipse", "roundRect", "triangle", "diamond",
    "pentagon", "hexagon", "octagon",
    "rightArrow", "leftArrow", "upArrow", "downArrow",
    "star5", "star4", "heart", "cloud",
    "flowChartTerminator", "flowChartProcess", "flowChartDecision",
    "parallelogram", "trapezoid", "chevron", "plus", "cross",
    "wedgeRectCallout", "wedgeRoundRectCallout",
    "donut",
  ];

  for (const shape of shapeTypes) {
    it(`renders ${shape} shape without error`, () => {
      const canvas = createCanvas(192, 108);
      const slide: LayoutNode = {
        type: "Slide",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [{
          type: "View",
          layout: { x: 100, y: 100, width: 200, height: 150 },
          style: { backgroundColor: "#4472C4" },
          shapeType: shape,
          children: [],
        }] as any[],
      } as LayoutNode;
      expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
    });
  }

  it("renders roundRect with custom adjustments", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 100, y: 100, width: 200, height: 150 },
        style: { backgroundColor: "#4472C4" },
        shapeType: "roundRect",
        shapeAdjustments: [25000], // 25% corner radius
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("falls back to rectangle for unknown shapes", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 100, y: 100, width: 200, height: 150 },
        style: { backgroundColor: "#CCCCCC" },
        shapeType: "unknownShape99",
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. Text Rendering
// ---------------------------------------------------------------------------

describe("text rendering", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  it("renders a Text node with string content", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Text",
        layout: { x: 10, y: 10, width: 400, height: 50 },
        style: { fontSize: 24, fontFamily: "Arial", color: "#000000" },
        content: "Hello, World!",
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a Text node with TextRun[] content", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Text",
        layout: { x: 10, y: 10, width: 400, height: 100 },
        style: { fontSize: 14, fontFamily: "Arial" },
        content: [
          { text: "Bold text ", style: { fontWeight: "bold" } },
          { text: "Normal text", style: {} },
        ],
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a Text node with paragraphs", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Text",
        layout: { x: 10, y: 10, width: 400, height: 200 },
        style: { fontSize: 14, fontFamily: "Arial" },
        paragraphs: [
          { runs: [{ text: "First paragraph" }], spaceBefore: 0, spaceAfter: 10 },
          { runs: [{ text: "Second paragraph" }], spaceBefore: 0, spaceAfter: 10, align: "center" },
        ],
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a Text node with background fill", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Text",
        layout: { x: 10, y: 10, width: 400, height: 50 },
        style: { fontSize: 14, fontFamily: "Arial", backgroundColor: "#FFFF00" },
        content: "Highlighted text",
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders View node with textContent", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 10, y: 10, width: 400, height: 100 },
        style: { backgroundColor: "#EEEEEE" },
        textContent: "Text inside a shape",
        textStyle: { fontSize: 14, fontFamily: "Arial", textInsets: { left: 8, right: 8, top: 8, bottom: 8 } },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders View node with textParagraphs", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 10, y: 10, width: 400, height: 200 },
        style: { backgroundColor: "#EEEEEE" },
        textParagraphs: [
          { runs: [{ text: "Shape text paragraph 1" }] },
          { runs: [{ text: "Shape text paragraph 2" }], align: "right" },
        ],
        textStyle: { fontSize: 12 },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles autoFit result", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Text",
        layout: { x: 10, y: 10, width: 200, height: 50 },
        style: { fontSize: 24, fontFamily: "Arial" },
        content: "Scaled text",
        _autoFitResult: { fontSize: 12 },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. Table Rendering
// ---------------------------------------------------------------------------

describe("table rendering", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  it("renders a basic table", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Table",
        layout: { x: 50, y: 50, width: 400, height: 200 },
        tableData: {
          columns: [200, 200],
          rows: [
            { cells: [{ text: "Header 1" }, { text: "Header 2" }] },
            { cells: [{ text: "Cell A" }, { text: "Cell B" }] },
            { cells: [{ text: "Cell C" }, { text: "Cell D" }] },
          ],
          style: { firstRow: true, bandRow: true },
        },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a table with cell styles", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Table",
        layout: { x: 50, y: 50, width: 400, height: 200 },
        tableData: {
          columns: [200, 200],
          rows: [
            { cells: [
              { text: "Bold", style: { fontWeight: "bold", fontSize: 14 } },
              { text: "Italic", style: { fontStyle: "italic", color: "#FF0000" } },
            ] },
          ],
          style: { firstRow: false },
        },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders table with custom row heights", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Table",
        layout: { x: 50, y: 50, width: 300, height: 200 },
        tableData: {
          columns: [150, 150],
          rows: [
            { height: 40, cells: [{ text: "Tall row" }, { text: "Tall" }] },
            { height: 20, cells: [{ text: "Short" }, { text: "Short" }] },
          ],
        },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles table with no tableData gracefully", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Table",
        layout: { x: 50, y: 50, width: 300, height: 200 },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Connector Rendering
// ---------------------------------------------------------------------------

describe("connector rendering", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  it("renders a basic connector line", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Connector",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        start: { x: 100, y: 100 },
        end: { x: 400, y: 300 },
        lineColor: "#000000",
        lineWidth: 2,
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a connector with arrow heads", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Connector",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        start: { x: 100, y: 100 },
        end: { x: 400, y: 300 },
        lineColor: "#333333",
        lineWidth: 1.5,
        arrowEnd: true,
        arrowStart: true,
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders a dashed connector", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Connector",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        start: { x: 50, y: 270 },
        end: { x: 910, y: 270 },
        lineColor: "#FF0000",
        lineWidth: 2,
        lineDashStyle: "dashed",
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles connector with missing start/end gracefully", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Connector",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. Group / Image / Media / Chart Placeholders
// ---------------------------------------------------------------------------

describe("special node types", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  it("renders a Group node (recurses children)", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Group",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [{
          type: "View",
          layout: { x: 100, y: 100, width: 100, height: 50 },
          style: { backgroundColor: "#00FF00" },
          children: [],
        }] as any[],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders Image placeholder", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Image",
        layout: { x: 50, y: 50, width: 300, height: 200 },
        src: "https://example.com/image.png",
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders Image placeholder with border radius", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Image",
        layout: { x: 50, y: 50, width: 200, height: 200 },
        borderRadius: 20,
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders Chart placeholder", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Chart",
        layout: { x: 50, y: 50, width: 400, height: 300 },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders Video placeholder with play triangle", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Video",
        layout: { x: 50, y: 50, width: 400, height: 300 },
        children: [],
      }] as any[],
    } as LayoutNode;
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // Sample top-left corner of video area (away from the play triangle)
    const px = Math.round(60 / 960 * 192);
    const py = Math.round(60 / 540 * 108);
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    // Background is #1F2937 — very dark
    expect(pixel[0]).toBeLessThan(50);
    expect(pixel[1]).toBeLessThan(55);
    expect(pixel[2]).toBeLessThan(70);
  });

  it("renders Audio placeholder", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "Audio",
        layout: { x: 50, y: 50, width: 200, height: 100 },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles unknown node types by recursing children", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "UnknownCustomNode" as any,
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [{
          type: "View",
          layout: { x: 100, y: 100, width: 100, height: 50 },
          style: { backgroundColor: "#FF00FF" },
          children: [],
        }] as any[],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. Theme Color Resolution in Rendering
// ---------------------------------------------------------------------------

describe("theme color rendering", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  it("resolves scheme colors in shapes with themeColors", () => {
    const canvas = createCanvas(192, 108);
    const themeColors: ThemeColorScheme = { accent1: "FF0000" } as any;
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 10, y: 10, width: 200, height: 100 },
        style: { backgroundColor: "accent1" },
        children: [],
      }] as any[],
    } as LayoutNode;
    renderSlideToCanvas(slide, canvas, themeColors);
    const ctx = canvas.getContext("2d");
    const px = Math.round(110 / 960 * 192);
    const py = Math.round(60 / 540 * 108);
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    // Should be red
    expect(pixel[0]).toBeGreaterThan(200);
    expect(pixel[1]).toBeLessThan(50);
    expect(pixel[2]).toBeLessThan(50);
  });

  it("resolves scheme colors in slide background", () => {
    const canvas = createCanvas(192, 108);
    const themeColors: ThemeColorScheme = { dk1: "1E293B" } as any;
    const slide = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [],
      background: { type: "solid", color: "dk1" },
    } as any;
    renderSlideToCanvas(slide, canvas, themeColors);
    const ctx = canvas.getContext("2d");
    const pixel = ctx.getImageData(96, 54, 1, 1).data;
    // dk1 = #1E293B → R=30, G=41, B=59
    expect(pixel[0]).toBeLessThan(40);
    expect(pixel[1]).toBeLessThan(50);
    expect(pixel[2]).toBeLessThan(70);
  });
});

// ---------------------------------------------------------------------------
// 9. renderSlideToBuffer — Full Async Pipeline
// ---------------------------------------------------------------------------

describe("renderSlideToBuffer", () => {
  let renderSlideToBuffer: any;

  beforeAll(async () => {
    const mod = await import("../src/renderer/index.js");
    renderSlideToBuffer = mod.renderSlideToBuffer;
  });

  it("produces a valid PNG buffer for a simple slide", async () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 100, y: 100, width: 200, height: 100 },
        style: { backgroundColor: "#4472C4" },
        children: [],
      }] as any[],
    } as LayoutNode;
    const buffer = await renderSlideToBuffer(slideNode, { width: 480, height: 270, scale: 1 });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer!.length).toBeGreaterThan(100);
    // PNG magic bytes: \x89PNG\r\n\x1a\n
    expect(buffer![0]).toBe(0x89);
    expect(buffer![1]).toBe(0x50); // P
    expect(buffer![2]).toBe(0x4E); // N
    expect(buffer![3]).toBe(0x47); // G
  });

  it("respects custom width/height/scale options", async () => {
    const slideNode: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [],
    } as LayoutNode;
    const buffer = await renderSlideToBuffer(slideNode, { width: 200, height: 100, scale: 1 });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer!.length).toBeGreaterThan(0);
  });
});

describe("optional canvas capability detection", () => {
  it("recognizes Node ESM package-resolution failures without swallowing unrelated imports", async () => {
    const { isOptionalCanvasUnavailable } = await import("../src/renderer/index.js");
    const canvasError = Object.assign(
      new Error("Cannot find package '@napi-rs/canvas' imported from /consumer/server.js"),
      { code: "ERR_MODULE_NOT_FOUND" },
    );
    const unrelatedError = Object.assign(
      new Error("Cannot find package 'customer-plugin' imported from /consumer/server.js"),
      { code: "ERR_MODULE_NOT_FOUND" },
    );

    expect(isOptionalCanvasUnavailable(canvasError)).toBe(true);
    expect(isOptionalCanvasUnavailable(unrelatedError)).toBe(false);
    expect(isOptionalCanvasUnavailable(new Error("layout invariant failed"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. Edge Cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  it("handles zero-dimension View gracefully", () => {
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 0, y: 0, width: 0, height: 0 },
        style: { backgroundColor: "#FF0000" },
        children: [],
      }] as any[],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles deeply nested groups", () => {
    const innerView: LayoutNode = {
      type: "View",
      layout: { x: 400, y: 200, width: 100, height: 50 },
      style: { backgroundColor: "#FF00FF" },
      children: [],
    } as LayoutNode;

    let current: LayoutNode = innerView;
    for (let i = 0; i < 10; i++) {
      current = {
        type: "Group",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [current],
      } as LayoutNode;
    }

    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [current],
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles many children on a slide", () => {
    const children: any[] = [];
    for (let i = 0; i < 50; i++) {
      children.push({
        type: "View",
        layout: { x: (i % 10) * 90, y: Math.floor(i / 10) * 100, width: 80, height: 90 },
        style: { backgroundColor: `#${((i * 5) % 256).toString(16).padStart(2, "0")}${((i * 3) % 256).toString(16).padStart(2, "0")}${((i * 7) % 256).toString(16).padStart(2, "0")}` },
        children: [],
      });
    }
    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children,
    } as LayoutNode;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders pattern background type", () => {
    const canvas = createCanvas(192, 108);
    const slide = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [],
      background: { type: "pattern", background: "#CCCCCC" },
    } as any;
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders image background type (degrades to white)", () => {
    const canvas = createCanvas(192, 108);
    const slide = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [],
      background: { type: "image", src: "https://example.com/bg.jpg" },
    } as any;
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    const pixel = ctx.getImageData(96, 54, 1, 1).data;
    // Should be white (image bg degrades to white in sync render)
    expect(pixel[0]).toBe(255);
    expect(pixel[1]).toBe(255);
    expect(pixel[2]).toBe(255);
  });
});

// ---------------------------------------------------------------------------
// 11. 3D Effects Approximation
// ---------------------------------------------------------------------------

describe("3D effects", () => {
  let createCanvas: any;
  let renderSlideToCanvas: any;

  beforeAll(async () => {
    const canvasMod = await import("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
    const rendererMod = await import("../src/renderer/canvasRenderer.js");
    renderSlideToCanvas = rendererMod.renderSlideToCanvas;
  });

  function makeSlide(children: any[] = []): any {
    return {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children,
    };
  }

  it("renders extrusion as offset shape layers", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 400, height: 200 },
      style: {
        backgroundColor: "#4472C4",
        effects: {
          sp3d: { extrudeHeight: 10, extrudeColor: "#222266" },
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // Extrusion extends bottom-right (default light from tl, so shadow is br).
    // Main shape bottom-right corner: slide (500, 300) → canvas (100, 60)
    // Just past that corner at offset: slide (505, 305) → canvas (101, 61)
    const extPixel = ctx.getImageData(101, 61, 1, 1).data;
    // Should have some blue from the extrusion color #222266
    expect(extPixel[2]).toBeGreaterThan(20);
  });

  it("renders extrusion with darkened fill when no extrudeColor", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 400, height: 200 },
      style: {
        backgroundColor: "#FF0000",
        effects: {
          sp3d: { extrudeHeight: 8 },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders bevel top highlight and shadow edges", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 600, height: 300 },
      style: {
        backgroundColor: "#4472C4",
        effects: {
          sp3d: { bevelTop: { preset: "circle", width: 12, height: 12 } },
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // Center of shape: slide (400, 250) → canvas (80, 50)
    const centerPixel = ctx.getImageData(80, 50, 1, 1).data;
    // Top-left edge: slide (105, 105) → canvas (21, 21)
    const tlPixel = ctx.getImageData(21, 21, 1, 1).data;
    // Bottom-right edge: slide (695, 395) → canvas (139, 79)
    const brPixel = ctx.getImageData(139, 79, 1, 1).data;
    // Top-left should be brighter (highlight), bottom-right darker (shadow)
    const tlLum = tlPixel[0] + tlPixel[1] + tlPixel[2];
    const brLum = brPixel[0] + brPixel[1] + brPixel[2];
    expect(tlLum).toBeGreaterThan(brLum);
  });

  it("renders bevel bottom (recessed effect)", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 400, height: 200 },
      style: {
        backgroundColor: "#4472C4",
        effects: {
          sp3d: { bevelBottom: { preset: "softRound", width: 8, height: 8 } },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("renders contour stroke around shape", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 600, height: 300 },
      style: {
        backgroundColor: "#FFFFFF",
        effects: {
          sp3d: { contourWidth: 3, contourColor: "#FF0000" },
        },
      },
      children: [],
    }]);
    renderSlideToCanvas(slide, canvas);
    const ctx = canvas.getContext("2d");
    // Top edge of shape: slide (400, 100) → canvas (80, 20)
    const edgePixel = ctx.getImageData(80, 20, 1, 1).data;
    // Should have red component from the contour
    expect(edgePixel[0]).toBeGreaterThan(100);
  });

  it("renders combined extrusion + bevel + contour", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 400, height: 200 },
      style: {
        backgroundColor: "#4472C4",
        effects: {
          sp3d: {
            extrudeHeight: 6,
            extrudeColor: "#222244",
            bevelTop: { preset: "circle", width: 8, height: 8 },
            contourWidth: 2,
            contourColor: "#000000",
          },
          scene3d: {
            camera: { preset: "orthographicFront" },
            lightRig: { type: "threePt", direction: "tl" },
          },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("respects scene3d lightRig direction for extrusion offset", () => {
    const canvas = createCanvas(192, 108);
    // Light from bottom-right → extrusion should extend top-left
    const slide = makeSlide([{
      type: "View",
      layout: { x: 200, y: 100, width: 400, height: 200 },
      style: {
        backgroundColor: "#00FF00",
        effects: {
          sp3d: { extrudeHeight: 10, extrudeColor: "#005500" },
          scene3d: {
            camera: { preset: "orthographicFront" },
            lightRig: { type: "threePt", direction: "br" },
          },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles sp3d with material preset (no visual error)", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 400, height: 200 },
      style: {
        backgroundColor: "#4472C4",
        effects: {
          sp3d: { material: "metal", bevelTop: { preset: "circle", width: 6, height: 6 } },
        },
      },
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles 3D effects on shaped views (ellipse)", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 400, height: 300 },
      style: {
        backgroundColor: "#FF6600",
        effects: {
          sp3d: {
            extrudeHeight: 8,
            bevelTop: { preset: "softRound", width: 10, height: 10 },
          },
        },
      },
      shapeType: "ellipse",
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });

  it("handles 3D effects on donut shapes with evenodd fill", () => {
    const canvas = createCanvas(192, 108);
    const slide = makeSlide([{
      type: "View",
      layout: { x: 100, y: 100, width: 300, height: 300 },
      style: {
        backgroundColor: "#4472C4",
        effects: {
          sp3d: { extrudeHeight: 6, bevelTop: { preset: "angle", width: 8, height: 8 } },
        },
      },
      shapeType: "donut",
      children: [],
    }]);
    expect(() => renderSlideToCanvas(slide, canvas)).not.toThrow();
  });
});
