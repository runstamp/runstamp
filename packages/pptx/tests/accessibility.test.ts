import { describe, it, expect } from "vitest";
import { validateAccessibility } from "../src/quality/accessibilityValidator.js";
import { generateCoreProperties } from "../src/ooxml/docProps.js";
import type { PaperDocument } from "../src/types/ast.js";

function makeDoc(overrides?: Partial<PaperDocument>): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Test Deck", language: "en-US" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Text",
            content: "Title",
            style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
          },
        ],
      },
    ],
    ...overrides,
  } as PaperDocument;
}

// ---------------------------------------------------------------------------
// dc:language in core.xml
// ---------------------------------------------------------------------------

describe("dc:language in core.xml", () => {
  it("includes dc:language when language is en-US", () => {
    const xml = generateCoreProperties("Test", "Author", "en-US");
    expect(xml).toContain("<dc:language>en-US</dc:language>");
  });

  it("omits dc:language when language is not provided", () => {
    const xml = generateCoreProperties("Test", "Author");
    expect(xml).not.toContain("dc:language");
  });

  it("omits dc:language when language is undefined", () => {
    const xml = generateCoreProperties("Test", "Author", undefined);
    expect(xml).not.toContain("dc:language");
  });

  it("includes dc:language for fr-FR", () => {
    const xml = generateCoreProperties("Test", "Author", "fr-FR");
    expect(xml).toContain("<dc:language>fr-FR</dc:language>");
  });
});

// ---------------------------------------------------------------------------
// validateAccessibility
// ---------------------------------------------------------------------------

describe("validateAccessibility", () => {
  // ---- Alt text checks ----

  describe("alt text checks", () => {
    it("flags Image without altText or decorative as ALT_TEXT_MISSING error", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Image",
                src: "test.png",
                style: { position: "absolute", left: 0, top: 0, width: 100, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.violations.some((v) => v.code === "ALT_TEXT_MISSING")).toBe(true);
    });

    it("does not flag Image with decorative:true", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Image",
                src: "test.png",
                decorative: true,
                style: { position: "absolute", left: 0, top: 0, width: 100, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      const altViolations = [...report.violations, ...report.warnings].filter(
        (v) => v.code === "ALT_TEXT_MISSING",
      );
      // The Image should not be flagged — only the Image type, so filter to Image path
      expect(altViolations.every((v) => !v.elementPath?.includes("children[1]"))).toBe(true);
    });

    it("does not flag Image with altText set", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Image",
                src: "test.png",
                altText: "Chart showing data",
                style: { position: "absolute", left: 0, top: 0, width: 100, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      const imgViolations = [...report.violations, ...report.warnings].filter(
        (v) => v.code === "ALT_TEXT_MISSING" && v.elementPath?.includes("children[1]"),
      );
      expect(imgViolations).toHaveLength(0);
    });

    it("flags Image with empty altText as EMPTY_ALT_TEXT warning", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Image",
                src: "test.png",
                altText: "",
                style: { position: "absolute", left: 0, top: 0, width: 100, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.warnings.some((v) => v.code === "EMPTY_ALT_TEXT")).toBe(true);
    });

    it("flags Chart without altText as ALT_TEXT_MISSING error", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Chart",
                chartType: "bar",
                data: { categories: ["A"], series: [{ name: "S", values: [1] }] },
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 300 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.violations.some((v) => v.code === "ALT_TEXT_MISSING")).toBe(true);
    });

    it("flags View (shape) without altText as ALT_TEXT_MISSING error", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "View",
                children: [],
                style: { position: "absolute", left: 0, top: 0, width: 200, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.violations.some((v) => v.code === "ALT_TEXT_MISSING")).toBe(true);
    });
  });

  // ---- Table header checks ----

  describe("table header checks", () => {
    it("flags Table without firstRow as TABLE_HEADER_MISSING warning", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Table",
                tableData: {
                  rows: [[{ value: "A" }, { value: "B" }]],
                  style: {},
                },
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 200 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.warnings.some((v) => v.code === "TABLE_HEADER_MISSING")).toBe(true);
    });

    it("does not flag Table with firstRow:true", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Table",
                tableData: {
                  rows: [[{ value: "A" }, { value: "B" }]],
                  style: { firstRow: true },
                },
                altText: "Data table",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 200 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      const headerWarnings = report.warnings.filter((v) => v.code === "TABLE_HEADER_MISSING");
      expect(headerWarnings).toHaveLength(0);
    });
  });

  // ---- Document-level checks ----

  describe("document-level checks", () => {
    it("flags doc without meta.title as DOC_TITLE_MISSING error", () => {
      const doc = makeDoc({
        meta: { language: "en-US" },
      });
      const report = validateAccessibility(doc);
      expect(report.violations.some((v) => v.code === "DOC_TITLE_MISSING")).toBe(true);
    });

    it("flags doc without meta.language as DOC_LANG_MISSING warning", () => {
      const doc = makeDoc({
        meta: { title: "Test Deck" },
      });
      const report = validateAccessibility(doc);
      expect(report.warnings.some((v) => v.code === "DOC_LANG_MISSING")).toBe(true);
    });

    it("returns score 100, level AAA, zero violations for fully accessible doc", () => {
      const doc = makeDoc();
      const report = validateAccessibility(doc);
      expect(report.score).toBe(100);
      expect(report.level).toBe("AAA");
      expect(report.violations).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("maps legacy findings into canonical issues", () => {
      const doc = makeDoc({
        meta: { title: "Deck" },
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Image",
                src: "test.png",
                style: { position: "absolute", left: 0, top: 0, width: 100, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.issues.some((issue) => issue.code === "document.language_missing")).toBe(true);
      expect(report.issues.some((issue) => issue.code === "image.alt_missing")).toBe(true);
    });
  });

  // ---- Scoring ----

  describe("scoring", () => {
    it("computes score = 100 - 20 - 3 = 77 for 2 errors + 1 warning", () => {
      // 2 Images without altText (errors) + 1 Table without headers (warning)
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Text",
                content: "Title",
                style: { position: "absolute", left: 0, top: 0, width: 400, height: 50 },
              },
              {
                type: "Image",
                src: "a.png",
                style: { position: "absolute", left: 0, top: 60, width: 100, height: 100 },
              } as any,
              {
                type: "Image",
                src: "b.png",
                style: { position: "absolute", left: 110, top: 60, width: 100, height: 100 },
              } as any,
              {
                type: "Table",
                tableData: {
                  rows: [[{ value: "A" }, { value: "B" }]],
                  style: {},
                },
                altText: "Data table",
                style: { position: "absolute", left: 0, top: 170, width: 400, height: 200 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      // 2 ALT_TEXT_MISSING errors (10 each) + 1 TABLE_HEADER_MISSING warning (3)
      expect(report.violations).toHaveLength(2);
      expect(report.warnings).toHaveLength(1);
      expect(report.score).toBe(77);
    });

    it("clamps score to 0 for many violations", () => {
      // Create enough errors to push score well below 0
      const images = Array.from({ length: 15 }, (_, i) => ({
        type: "Image" as const,
        src: `img${i}.png`,
        style: { position: "absolute" as const, left: 0, top: i * 110, width: 100, height: 100 },
      }));
      const doc = makeDoc({
        meta: {},
        slides: [
          {
            type: "Slide",
            children: images as any[],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.score).toBe(0);
    });
  });

  // ---- Slide title checks ----

  describe("slide title checks", () => {
    it("flags slide with no Text node as SLIDE_TITLE_MISSING warning", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            children: [
              {
                type: "Image",
                src: "test.png",
                altText: "A photo",
                style: { position: "absolute", left: 0, top: 0, width: 100, height: 100 },
              } as any,
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      expect(report.warnings.some((v) => v.code === "SLIDE_TITLE_MISSING")).toBe(true);
    });

    it("does not flag slide with Text node", () => {
      const doc = makeDoc();
      const report = validateAccessibility(doc);
      const titleWarnings = report.warnings.filter((v) => v.code === "SLIDE_TITLE_MISSING");
      expect(titleWarnings).toHaveLength(0);
    });
  });

  // ---- Contrast ratio checks ----

  describe("contrast ratio checks", () => {
    it("flags white text on white background as CONTRAST_RATIO error", () => {
      const doc = makeDoc({
        slides: [
          {
            type: "Slide",
            background: { type: "solid", color: "#FFFFFF" },
            children: [
              {
                type: "Text",
                content: "Invisible text",
                style: {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 400,
                  height: 50,
                  color: "#FFFFFF",
                },
              },
            ],
          },
        ],
      });
      const report = validateAccessibility(doc);
      const contrastViolations = report.violations.filter((v) => v.code === "CONTRAST_RATIO");
      expect(contrastViolations.length).toBeGreaterThanOrEqual(1);
      // Ratio should be 1:1 which is below the 3:1 minimum → error severity
      expect(contrastViolations[0].severity).toBe("error");
    });
  });
});
