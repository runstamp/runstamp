import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openPptx } from "../src/open.js";
import { extractToIR } from "../src/extract-ir.js";

const FIXTURE_DIR = resolve(__dirname, "../../../test-suite/engine-validation/expected");

async function loadExpected(id: string) {
  const buf = readFileSync(resolve(FIXTURE_DIR, `${id}.pptx`));
  const opened = await openPptx(buf);
  return extractToIR(opened);
}

describe("extractToIR", () => {
  it("recovers slide count and meta.title from financial-quarterly", async () => {
    const ir = await loadExpected("01-financial-quarterly");
    expect(ir.slideCount).toBe(10);
    expect(ir.meta.title).toContain("Acme Capital");
    expect(ir.slides).toHaveLength(10);
  });

  it("recovers per-slide text content (substring of authored text)", async () => {
    const ir = await loadExpected("01-financial-quarterly");
    const slide1 = ir.slides[0];
    expect(slide1.text).toContain("Acme Capital");
    expect(slide1.text).toContain("FY24 Q4 Results");

    const slide2 = ir.slides[1];
    expect(slide2.text).toContain("Executive summary");
  });

  it("flags charts and tables on the slides that have them", async () => {
    const ir = await loadExpected("01-financial-quarterly");
    const chartSlide = ir.slides[2]; // bar chart
    expect(chartSlide.hasChart).toBe(true);
    const tableSlide = ir.slides[4]; // segment table
    expect(tableSlide.hasTable).toBe(true);
  });

  it("recovers text-run font families", async () => {
    const ir = await loadExpected("01-financial-quarterly");
    const allFonts = new Set(
      ir.slides.flatMap((s) => s.textRuns.map((r) => r.fontFamily).filter(Boolean)),
    );
    expect(Array.from(allFonts)).toContain("Inter");
  });

  it("recovers text-run colors", async () => {
    const ir = await loadExpected("01-financial-quarterly");
    const allColors = new Set(
      ir.slides.flatMap((s) => s.textRuns.map((r) => r.color).filter(Boolean)),
    );
    expect(Array.from(allColors)).toContain("0B2545");
  });

  it("recovers solid background color from cover slide", async () => {
    const ir = await loadExpected("01-financial-quarterly");
    expect(ir.slides[0].background).toBe("EEF4ED");
  });

  it("works on a different fixture (saas-pitch with gradients)", async () => {
    const ir = await loadExpected("03-saas-pitch");
    expect(ir.slideCount).toBe(10);
    expect(ir.slides[0].text).toContain("Helix");
    // saas-pitch slide 5 has the ARR chart
    expect(ir.slides[4].hasChart).toBe(true);
  });

  it("works on a fixture with tables only (board-update)", async () => {
    const ir = await loadExpected("06-board-update");
    expect(ir.slideCount).toBe(10);
    // slide 5 is financials table, slide 7 is risk register
    expect(ir.slides[4].hasTable).toBe(true);
    expect(ir.slides[6].hasTable).toBe(true);
  });
});
