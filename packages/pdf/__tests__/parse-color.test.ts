import { parseColor, tryParseColor, PdfColorParseError } from "../src/parse-color.js";

describe("parseColor", () => {
  it("parses #RRGGBB hex strings", () => {
    expect(parseColor("#E5E7EB")).toEqual({
      space: "rgb",
      r: 0xe5 / 255,
      g: 0xe7 / 255,
      b: 0xeb / 255,
    });
  });

  it("parses #RGB short hex strings", () => {
    expect(parseColor("#FFF")).toEqual({ space: "rgb", r: 1, g: 1, b: 1 });
    expect(parseColor("#000")).toEqual({ space: "rgb", r: 0, g: 0, b: 0 });
  });

  it("parses bare 6-char hex without leading #", () => {
    expect(parseColor("F3F4F6")).toEqual({
      space: "rgb",
      r: 0xf3 / 255,
      g: 0xf4 / 255,
      b: 0xf6 / 255,
    });
  });

  it("parses rgb() and rgba() strings", () => {
    expect(parseColor("rgb(229, 231, 235)")).toEqual({
      space: "rgb",
      r: 229 / 255,
      g: 231 / 255,
      b: 235 / 255,
    });
    // alpha component is ignored — fill opacity is a separate field on PdfFill
    expect(parseColor("rgba(0, 0, 0, 0.5)")).toEqual({ space: "rgb", r: 0, g: 0, b: 0 });
  });

  it("parses named colors case-insensitively", () => {
    expect(parseColor("BLACK")).toEqual({ space: "rgb", r: 0, g: 0, b: 0 });
    expect(parseColor("white")).toEqual({ space: "rgb", r: 1, g: 1, b: 1 });
    expect(parseColor("Red")).toEqual({ space: "rgb", r: 1, g: 0, b: 0 });
    expect(parseColor("Gray")).toEqual({ space: "rgb", r: 0.5, g: 0.5, b: 0.5 });
  });

  it("round-trips canonical RGB objects", () => {
    expect(parseColor({ space: "rgb", r: 0.5, g: 0.5, b: 0.5 })).toEqual({
      space: "rgb",
      r: 0.5,
      g: 0.5,
      b: 0.5,
    });
  });

  it("rejects 0..255 RGB components — only 0..1 is canonical", () => {
    // The strict policy from `docs/0428-claude-test-based-directive2.md` is
    // "require 0..1". 0..255 callers must use hex strings or rgb() instead.
    expect(() => parseColor({ r: 229, g: 231, b: 235 })).toThrow(PdfColorParseError);
  });

  it("accepts CMYK objects", () => {
    expect(parseColor({ space: "cmyk", c: 0, m: 0, y: 0, k: 1 })).toEqual({
      space: "cmyk",
      c: 0,
      m: 0,
      y: 0,
      k: 1,
    });
  });

  it("infers space from RGB key set when omitted", () => {
    expect(parseColor({ r: 0.1, g: 0.2, b: 0.3 })).toEqual({
      space: "rgb",
      r: 0.1,
      g: 0.2,
      b: 0.3,
    });
  });

  it("infers space from CMYK key set when omitted", () => {
    expect(parseColor({ c: 0.1, m: 0.2, y: 0.3, k: 0.4 })).toEqual({
      space: "cmyk",
      c: 0.1,
      m: 0.2,
      y: 0.3,
      k: 0.4,
    });
  });

  it("rejects malformed hex with a path-prefixed PdfColorParseError", () => {
    expect(() => parseColor("#XYZ", "doc.style.borderColor")).toThrow(PdfColorParseError);
    try {
      parseColor("#XYZ", "doc.style.borderColor");
    } catch (err) {
      expect(err).toBeInstanceOf(PdfColorParseError);
      expect((err as PdfColorParseError).message).toContain("doc.style.borderColor");
      expect((err as PdfColorParseError).path).toBe("doc.style.borderColor");
    }
  });

  it("rejects unknown color strings", () => {
    expect(() => parseColor("chartreuse")).toThrow(PdfColorParseError);
  });

  it("rejects out-of-range floats", () => {
    expect(() => parseColor({ space: "rgb", r: -1, g: 0, b: 0 })).toThrow(PdfColorParseError);
    expect(() => parseColor({ space: "cmyk", c: 1.5, m: 0, y: 0, k: 0 })).toThrow(PdfColorParseError);
  });

  it("tryParseColor swallows errors", () => {
    expect(tryParseColor("#XYZ")).toBeUndefined();
    expect(tryParseColor("#FFF")).toEqual({ space: "rgb", r: 1, g: 1, b: 1 });
  });
});
