import { PdfEngine } from "../src/engine.js";
import { analyzePhase7Document } from "../src/phase7-analyze.js";

describe("Phase 7 graphics", () => {
  it("materializes graphic nodes into rendered page graphics", async () => {
    const analysis = await analyzePhase7Document({
      accessibility: { lang: "en-US", tagged: true },
      children: [
        {
          level: 1,
          text: "Sprint 4",
          type: "heading",
        },
        {
          graphic: {
            fill: { color: { b: 0.3, g: 0.5, r: 0.8, space: "rgb" }, opacity: 1, space: "solid" },
            height: 36,
            type: "rect",
            width: 120,
            x: 0,
            y: 0,
          },
          style: {
            height: 36,
            marginBottom: 12,
            width: 120,
          },
          type: "graphic",
        },
      ],
      page: {
        margin: 48,
        size: "Letter",
      },
    });

    expect(analysis.pages).toHaveLength(1);
    expect(analysis.pages[0]?.graphics?.some((graphic) => graphic.type === "rect")).toBe(true);
    expect(analysis.interactive.accessibility.structure.some((entry) => entry.role === "H1")).toBe(true);
  });

  it("renders PDFs containing phase 7 graphic nodes", async () => {
    const buffer = await PdfEngine.render({
      accessibility: { lang: "en-US", tagged: true },
      children: [
        {
          text: "Chart region",
          type: "paragraph",
        },
        {
          graphic: {
            height: 60,
            source: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect x="0" y="0" width="120" height="60" fill="#2563eb"/></svg>`,
            type: "svg",
            width: 120,
            x: 0,
            y: 0,
          },
          style: {
            height: 60,
            width: 120,
          },
          type: "graphic",
        },
      ],
      page: {
        margin: 48,
        size: "Letter",
      },
    });

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("preserves graphic layer placement metadata through analysis", async () => {
    const analysis = await analyzePhase7Document({
      children: [
        {
          text: "Foreground asset",
          type: "paragraph",
        },
        {
          graphic: {
            format: "png",
            height: 40,
            layer: "foreground",
            source: "https://example.com/overlay.png",
            type: "image",
            width: 40,
            x: 8,
            y: 12,
          },
          style: {
            height: 40,
            left: 8,
            position: "absolute",
            top: 12,
            width: 40,
          },
          type: "graphic",
        },
      ],
      page: {
        margin: 48,
        size: "Letter",
      },
    });

    expect(analysis.pages[0]?.graphics?.some((graphic) => graphic.type === "image" && graphic.layer === "foreground")).toBe(true);
  });
});
