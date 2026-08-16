import { describe, expect, it } from "vitest";
import { PaperError } from "../src/errors.js";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function makeDoc(slideCount = 1): PaperDocument {
  return {
    type: "Document",
    meta: { title: "svg-test" },
    slides: Array.from({ length: slideCount }, (_, index) => ({
      type: "Slide" as const,
      background: index % 2 === 0
        ? {
            type: "gradient" as const,
            angle: 120,
            stops: [
              { color: "accent1", position: 0 },
              { color: "accent3", position: 100 },
            ],
          }
        : undefined,
      children: [
        {
          type: "View" as const,
          shapeType: "rect" as const,
          style: {
            width: 240,
            height: 120,
            left: 64,
            top: 72,
            position: "absolute",
            backgroundColor: index % 2 === 0 ? "#FF0000" : "#0000FF",
            borderWidth: 2,
            borderColor: "#111827",
            effects: {
              dropShadow: {
                color: "#000000",
                offsetX: 6,
                offsetY: 8,
                blurRadius: 12,
                opacity: 0.35,
              },
              reflection: {
                distance: 10,
                endOpacity: 0,
                startOpacity: 0.35,
              },
            },
          },
          textContent: `Slide ${index + 1}`,
          textStyle: {
            color: "#FFFFFF",
            fontSize: 24,
            textAlign: "center",
            textInsets: { left: 16, top: 40, right: 16, bottom: 16 },
          },
        },
        {
          type: "Image" as const,
          src: TINY_PNG,
          style: {
            width: 64,
            height: 64,
            left: 340,
            top: 84,
            position: "absolute",
          },
        },
      ],
    })),
    theme: {
      colorScheme: {
        accent1: "#4472C4",
        accent3: "#A9D18E",
      },
    },
  };
}

describe("renderToSvgSlides", () => {
  it("renders standalone SVG slides with deterministic structure", async () => {
    const [slide] = await PaperEngine.renderToSvgSlides(makeDoc(1));
    expect(slide.slideIndex).toBe(0);
    expect(slide.width).toBeGreaterThan(0);
    expect(slide.height).toBeGreaterThan(0);
    expect(slide.svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(slide.svg).toContain("<svg");
    expect(slide.svg).toContain("<defs>");
    expect(slide.svg).toContain("data:image/png;base64");
    expect(slide.svg).toContain("mask=");
  });

  it("renders slides in requested order, including duplicates", async () => {
    const slides = await PaperEngine.renderToSvgSlides(makeDoc(3), {
      slides: [2, 0, 2],
    });
    expect(slides.map((entry) => entry.slideIndex)).toEqual([2, 0, 2]);
  });

  it("supports chart rendering hooks with real SVG output", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "chart-svg" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Chart",
              chartData: {
                chartType: "bar",
                categories: ["Q1", "Q2", "Q3"],
                series: [{ name: "Revenue", values: [12, 18, 24] }],
              },
              style: {
                position: "absolute",
                top: 80,
                left: 60,
                width: 420,
                height: 240,
              },
            },
          ],
        },
      ],
    };

    const [slide] = await PaperEngine.renderToSvgSlides(doc);
    expect(slide.svg).toContain('class="runstamp-chart"');
    expect(slide.svg).toContain('data-chart-renderer="pvce"');
    expect(slide.svg).not.toContain("runstamp-chart-hook");
  });

  it("renderToSvgSlide returns a single slide", async () => {
    const svg = await PaperEngine.renderToSvgSlide(makeDoc(2), 1);
    expect(svg.slideIndex).toBe(1);
    expect(svg.svg).toContain("Slide 2");
  });

  it("throws INVALID_SLIDE_INDEX for bad indices", async () => {
    await expect(PaperEngine.renderToSvgSlides(makeDoc(2), { slides: [9] })).rejects.toThrow(PaperError);

    try {
      await PaperEngine.renderToSvgSlides(makeDoc(2), { slides: [9] });
    } catch (error) {
      expect((error as PaperError).code).toBe("INVALID_SLIDE_INDEX");
    }
  });
});
