import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import type { LayoutNode } from "../src/layout/extract.js";
import { RenderContext, withContext } from "../src/renderContext.js";
import type { Fill, PaperDocument, PaperSlide } from "../src/types/ast.js";
import { PaperDocumentSchema } from "../src/validator/schema.js";
import { getLogger, LoggerManager, setLogger } from "../src/logger.js";

function minimalDoc(overrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{ type: "Slide", children: [{ type: "Text", content: "Test" }] }],
    ...overrides,
  };
}

describe("PaperEngine.render — End-to-End Pipeline", () => {
  it("produces a valid PPTX buffer for a single-slide document", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Test Deck", author: "Runstamp" },
      slides: [
        {
          type: "Slide",
          style: { width: 960, height: 540 },
          children: [
            {
              type: "Text",
              style: { fontSize: 32, color: "#FFFFFF" },
              content: "Hello, World",
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify it's a valid ZIP with PPTX structure
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
    expect(zip.file("ppt/presentation.xml")).not.toBeNull();
    expect(zip.file("ppt/slides/slide1.xml")).not.toBeNull();

    // Verify slide contains the text
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slideXml).toContain("Hello, World");
    expect(slideXml).toContain('sz="2400"');
  }, 90_000);

  it("resolves without throwing on a minimal document", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [],
        },
      ],
    };
    await expect(PaperEngine.render(doc)).resolves.toBeInstanceOf(Buffer);
  });

  it("handles multi-slide documents", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [{ type: "Text", content: "Slide 1" }],
        },
        {
          type: "Slide",
          children: [{ type: "Text", content: "Slide 2" }],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);

    expect(zip.file("ppt/slides/slide1.xml")).not.toBeNull();
    expect(zip.file("ppt/slides/slide2.xml")).not.toBeNull();

    const slide1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const slide2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
    expect(slide1).toContain("Slide 1");
    expect(slide2).toContain("Slide 2");
  });
});

describe("LoggerManager defaults", () => {
  it("keeps routine font fallback diagnostics quiet by default", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new LoggerManager();

    logger.getLogger().warn('[autoFont] Font "Missing" not found — falling back to NotoSans');
    logger.getLogger().warn("[fontEmbed] FONT_EMBEDDING_UNAVAILABLE: portable names retained");
    logger.getLogger().warn("A non-routine rendering warning");

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith("A non-routine rendering warning");
    consoleWarn.mockRestore();
  });
});

describe("PaperEngine — Concurrency Guard", () => {
  it("queues a second render() when one is in-flight (FIFO mutex)", async () => {
    const doc = minimalDoc();

    // Start first render — it holds the mutex
    const first = PaperEngine.render(doc);

    // Second concurrent call queues behind the first (FIFO mutex)
    const second = PaperEngine.render(doc);

    // Both should succeed sequentially
    const [buf1, buf2] = await Promise.all([first, second]);
    expect(buf1).toBeInstanceOf(Buffer);
    expect(buf2).toBeInstanceOf(Buffer);
  });

  it("allows sequential renders after first completes", async () => {
    const doc = minimalDoc();
    const buf1 = await PaperEngine.render(doc);
    expect(buf1).toBeInstanceOf(Buffer);

    const buf2 = await PaperEngine.render(doc);
    expect(buf2).toBeInstanceOf(Buffer);
  });

  it("releases lock if render throws (validation error)", async () => {
    const badDoc = { type: "Document", meta: {}, slides: [] } as unknown as PaperDocument;

    // This should throw due to empty slides or validation
    await expect(PaperEngine.render(badDoc)).rejects.toThrow();

    // Lock should be released — next render should succeed
    const doc = minimalDoc();
    const buf = await PaperEngine.render(doc);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it("queues renderStream behind an in-flight render (FIFO mutex)", async () => {
    const doc = minimalDoc();
    const first = PaperEngine.render(doc);

    // renderStream queues behind the first render
    const streamPromise = PaperEngine.renderStream(doc);

    const [buf, stream] = await Promise.all([first, streamPromise]);
    expect(buf).toBeInstanceOf(Buffer);
    expect(stream).toBeDefined();
  });
});

describe("PaperEngine.render in lite mode", () => {
  it("preserves morph IDs without auto-enabling morph transitions", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Lite Morph Metadata" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "View",
              morphId: "heroBox",
              style: { backgroundColor: "#FF0000", width: 100, height: 100 },
              shapeType: "rect",
            },
          ],
        },
        {
          type: "Slide",
          children: [
            {
              type: "View",
              morphId: "heroBox",
              style: { backgroundColor: "#0000FF", width: 200, height: 200 },
              shapeType: "ellipse",
            },
          ],
        },
      ],
    };

    const buffer = await withContext(
      new RenderContext({ engineMode: "lite" }),
      () => PaperEngine.render(doc),
    );
    const zip = await JSZip.loadAsync(buffer);

    const slide1Xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const slide2Xml = await zip.file("ppt/slides/slide2.xml")!.async("string");

    expect(slide1Xml).toContain('name="!!heroBox"');
    expect(slide2Xml).toContain('name="!!heroBox"');
    expect(slide1Xml).not.toContain("<p159:morph");
    expect(slide2Xml).not.toContain("<p159:morph");
  });

  it("still rejects explicit morph transitions", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Lite Explicit Morph" },
      slides: [
        {
          type: "Slide",
          transition: { type: "morph" },
          children: [{ type: "Text", content: "Morph should stay gated" }],
        },
      ],
    };

    await expect(
      withContext(new RenderContext({ engineMode: "lite" }), () => PaperEngine.render(doc)),
    ).rejects.toThrow("Morph transitions are not available");
  });

  it("warns when textWarp is accepted by schema but not emitted by the lite bundle", async () => {
    const warnSpy = vi.fn();
    const logger = new LoggerManager();
    logger.setLogger({ warn: warnSpy });

    try {
      const doc: PaperDocument = {
        type: "Document",
        meta: { title: "Lite text warp warning" },
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Warped title",
                style: {
                  fontSize: 28,
                  textWarp: "textArchUp",
                },
              },
            ],
          },
        ],
      };

      const buffer = await withContext(
        new RenderContext({ engineMode: "lite", logger }),
        () => PaperEngine.render(doc),
      );

      expect(buffer.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("slides[0].children[0].style.textWarp"),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not emitted by the PPTX writer in the size-constrained lite bundle"),
      );
    } finally {
      logger.setLogger({ warn: () => {} });
    }
  }, 30_000);

  it("does not warn for supported lineHeight serialization", async () => {
    const warnSpy = vi.fn();
    const originalLogger = getLogger();
    setLogger({ warn: warnSpy });

    try {
      const doc: PaperDocument = {
        type: "Document",
        meta: { title: "Supported line height" },
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Line-height stays rendered",
                style: {
                  fontSize: 20,
                  lineHeight: 30,
                },
              },
            ],
          },
        ],
      };

      const buffer = await PaperEngine.render(doc);
      expect(buffer.length).toBeGreaterThan(0);
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("lineHeight"),
      );
    } finally {
      setLogger(originalLogger);
    }
  });

  it("normalizes fill.type='gradient' to the same rendered output as linear with angle 0", async () => {
    const slideChildren = (fill: Fill): PaperSlide["children"] => [
      {
        type: "View" as const,
        style: {
          position: "absolute" as const,
          left: 120,
          top: 100,
          width: 320,
          height: 180,
          fill,
        },
      },
    ];

    const aliasDoc: PaperDocument = {
      type: "Document",
      meta: { title: "Gradient Alias" },
      slides: [{
        type: "Slide",
        children: slideChildren({
          type: "gradient",
          stops: [
            { color: "#112233", position: 0 },
            { color: "#AABBCC", position: 100 },
          ],
        }),
      }],
    };

    const linearDoc: PaperDocument = {
      type: "Document",
      meta: { title: "Linear Gradient" },
      slides: [{
        type: "Slide",
        children: slideChildren({
          type: "linear",
          angle: 0,
          stops: [
            { color: "#112233", position: 0 },
            { color: "#AABBCC", position: 100 },
          ],
        }),
      }],
    };

    const [aliasBuffer, linearBuffer] = await Promise.all([
      PaperEngine.render(aliasDoc),
      PaperEngine.render(linearDoc),
    ]);

    const [aliasZip, linearZip] = await Promise.all([
      JSZip.loadAsync(aliasBuffer),
      JSZip.loadAsync(linearBuffer),
    ]);
    const [aliasSlideXml, linearSlideXml] = await Promise.all([
      aliasZip.file("ppt/slides/slide1.xml")!.async("string"),
      linearZip.file("ppt/slides/slide1.xml")!.async("string"),
    ]);

    expect(aliasSlideXml).toContain("<a:lin ");
    expect(aliasSlideXml).toContain('ang="16200000"');
    expect(aliasSlideXml).toBe(linearSlideXml);
  });

  it("renders Text children inside flex column Views across nested absolute wrappers", async () => {
    const makeSlide = (absoluteWrapperCount: number): PaperSlide => {
      let current: PaperSlide["children"][number] = {
        type: "View",
        style: {
          flexDirection: "column",
          gap: 24,
          width: 320,
          height: 140,
        },
        children: [
          { type: "Text", content: "Alpha text", style: { fontSize: 24, color: "#111111" } },
          { type: "Text", content: "Beta text", style: { fontSize: 24, color: "#222222" } },
        ],
      };

      for (let index = 0; index < absoluteWrapperCount; index += 1) {
        current = {
          type: "View",
          style: {
            position: "absolute",
            left: 80 + (index * 10),
            top: 80 + (index * 10),
            width: 420,
            height: 220,
          },
          children: [current],
        };
      }

      return {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [current],
      };
    };

    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "P2-2 regression" },
      slides: [makeSlide(0), makeSlide(1), makeSlide(2)],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);

    for (const slideNumber of [1, 2, 3]) {
      const slideXml = await zip.file(`ppt/slides/slide${slideNumber}.xml`)!.async("string");
      expect(slideXml).toContain("Alpha text");
      expect(slideXml).toContain("Beta text");
    }
  });

  it("parses View style.borderRadius and preserves explicit shapeType precedence at render time", async () => {
    const parsed = PaperDocumentSchema.parse({
      type: "Document",
      meta: { title: "View border radius" },
      slides: [{
        type: "Slide",
        children: [
          {
            type: "View",
            style: { width: 200, height: 120, backgroundColor: "#FF0000", borderRadius: 24 },
            children: [],
          },
          {
            type: "View",
            shapeType: "ellipse",
            style: { width: 200, height: 120, backgroundColor: "#0000FF", borderRadius: 24, left: 240 },
            children: [],
          },
        ],
      }],
    }) as PaperDocument;

    const buffer = await PaperEngine.render(parsed);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");

    expect(slideXml).toContain('prst="roundRect"');
    expect(slideXml).toContain('fmla="val 20000"');
    expect(slideXml).toContain('prst="ellipse"');
  });

  it("renders View style.borderRadius as rounded corners in the canvas preview renderer", async () => {
    const [{ createCanvas }, { renderSlideToCanvas }] = await Promise.all([
      import("@napi-rs/canvas"),
      import("../src/renderer/canvasRenderer.js"),
    ]);

    const canvas = createCanvas(192, 108);
    const slide: LayoutNode = {
      type: "Slide",
      layout: { x: 0, y: 0, width: 960, height: 540 },
      children: [{
        type: "View",
        layout: { x: 100, y: 100, width: 200, height: 150 },
        style: { backgroundColor: "#FF0000", borderRadius: 40 },
        children: [],
      } as LayoutNode],
    } as LayoutNode;

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
});
