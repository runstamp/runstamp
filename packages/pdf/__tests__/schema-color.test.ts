import { PdfColorSchema, PdfDocumentSchema } from "../src/schema.js";
import { validatePdfDocument } from "../src/engine.js";

describe("PdfColorSchema accepts relaxed inputs", () => {
  it("transforms hex strings into canonical RGB", () => {
    const result = PdfColorSchema.parse("#E5E7EB");
    expect(result).toEqual({
      space: "rgb",
      r: 0xe5 / 255,
      g: 0xe7 / 255,
      b: 0xeb / 255,
    });
  });

  it("transforms RGB shorthand objects into canonical shape", () => {
    expect(PdfColorSchema.parse({ r: 1, g: 0, b: 0 })).toEqual({
      space: "rgb",
      r: 1,
      g: 0,
      b: 0,
    });
  });

  it("passes canonical RGB objects through unchanged", () => {
    const input = { space: "rgb", r: 0.5, g: 0.5, b: 0.5 } as const;
    expect(PdfColorSchema.parse(input)).toEqual(input);
  });

  it("emits a zod issue (not a deep stack throw) for malformed colors", () => {
    const parsed = PdfColorSchema.safeParse("not-a-color");
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("validatePdfDocument with the README table style example", () => {
  it("accepts a table style with hex colors via the canonical border fields", () => {
    const parsed = validatePdfDocument({
      meta: { title: "Test" },
      page: { size: "Letter", margin: 48 },
      children: [
        {
          type: "table",
          columns: [{ width: 200 }, { width: 100 }],
          rows: [
            { isHeader: true, cells: [{ value: "Item" }, { value: "Total" }] },
            { cells: [{ value: "Enterprise License" }, { value: "$12,000" }] },
          ],
          style: {
            backgroundColor: "#FFFFFF",
            borderTop: { color: "#E5E7EB", width: 1, style: "solid" },
            borderBottom: { color: "#E5E7EB", width: 1, style: "solid" },
            borderLeft: { color: "#E5E7EB", width: 1, style: "solid" },
            borderRight: { color: "#E5E7EB", width: 1, style: "solid" },
          },
        },
      ],
    });
    expect(parsed).toBeDefined();
  });

  it("rejects malformed hex with a useful issue path", () => {
    let caught: unknown;
    try {
      validatePdfDocument({
        meta: { title: "Bad color" },
        page: { size: "Letter", margin: 48 },
        children: [
          {
            type: "table",
            columns: [{ width: 100 }],
            rows: [{ cells: [{ value: "x" }] }],
            style: { backgroundColor: "#NOTHEX" },
          },
        ],
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    expect((caught as Error).message).toMatch(/Document failed schema validation/);
    const issuesText = JSON.stringify((caught as { details?: { issues?: unknown[] } }).details?.issues ?? []);
    expect(issuesText).toMatch(/hex color|NOTHEX|backgroundColor/);
  });
});

describe("README quick-start example renders without throwing", () => {
  it("accepts the relaxed table shape the README quick-start demonstrates", async () => {
    const { PdfEngine } = await import("../src/engine.js");
    const buffer = await PdfEngine.render({
      meta: { title: "Monthly Update", author: "Acme Inc." },
      page: { size: "Letter", margin: 48 },
      children: [
        { type: "heading", value: "Monthly Update", level: 1 },
        { type: "paragraph", value: "Revenue grew 18% month over month." },
        {
          type: "table",
          columns: [{ width: 120 }, { width: 80 }],
          rows: [
            { isHeader: true, cells: [{ value: "Region" }, { value: "Revenue" }] },
            { cells: [{ value: "North America" }, { value: "$5.1M" }] },
            { cells: [{ value: "Europe" }, { value: "$3.6M" }] },
          ],
        },
      ],
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
