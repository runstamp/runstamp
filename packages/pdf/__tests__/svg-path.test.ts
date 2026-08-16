import { describe, expect, it } from "vitest";
import { translateSvgPathToPdf } from "../src/svg.js";

describe("SVG path translation", () => {
  it("converts absolute and relative elliptical arcs to cubic PDF paths", () => {
    const absolute = translateSvgPathToPdf("M 10 50 A 40 30 0 0 1 90 50");
    const relative = translateSvgPathToPdf("M 10 50 a 40 30 0 0 1 80 0");

    expect(absolute).toContain("10 50 m");
    expect(absolute).toMatch(/ c(?:\n|$)/);
    expect(absolute).toMatch(/90 50 c$/);
    expect(relative).toBe(absolute);
  });

  it("supports rotated large arcs and preserves the exact endpoint", () => {
    const translated = translateSvgPathToPdf("M 5 7 A 30 12 35 1 0 81 43");

    expect(translated.match(/ c/g)?.length).toBeGreaterThanOrEqual(2);
    expect(translated).toMatch(/81 43 c$/);
    expect(translated).not.toContain("NaN");
  });

  it("converts smooth cubic and quadratic commands", () => {
    const translated = translateSvgPathToPdf("M0 0 C10 0 10 10 20 10 S30 20 40 10 Q50 0 60 10 T80 10");

    expect(translated.match(/ c/g)).toHaveLength(4);
    expect(translated).toContain("30 10 30 20 40 10 c");
  });

  it("uses a line for an arc with a zero radius and rejects invalid flags", () => {
    expect(translateSvgPathToPdf("M1 2 A0 10 0 0 1 5 6")).toBe("1 2 m\n5 6 l");
    expect(() => translateSvgPathToPdf("M1 2 A10 10 0 2 0 5 6")).toThrow("arc flags must be 0 or 1");
  });
});
