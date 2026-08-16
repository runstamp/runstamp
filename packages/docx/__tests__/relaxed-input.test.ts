import { describe, expect, it } from "vitest";
import { renderToDocx } from "../src/render.js";

const legacyDocxDocument = {
  type: "DocxDocument",
  theme: "corporate",
  meta: { title: "Legacy report" },
  margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
  footer: { pageNumbers: true },
  pages: [
    {
      elements: [
        { type: "code-block", value: "const legacy = true;" },
        {
          type: "chart",
          chartType: "bar",
          title: "Quarterly revenue",
          series: [
            {
              name: "2026",
              dataPoints: [
                { category: "Q1", value: 42 },
                { category: "Q2", value: 51 },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const;

describe("DOCX relaxed input", () => {
  it("keeps strict mode rejecting legacy shapes", async () => {
    await expect(renderToDocx(legacyDocxDocument as any)).rejects.toThrow(/Invalid DocxDocument/);
  });

  it("coerces legacy shapes in relaxed mode and returns warnings", async () => {
    const callbackWarnings: string[] = [];

    const result = await renderToDocx(legacyDocxDocument as any, {
      relaxed: true,
      onInputWarning: (warning) => callbackWarnings.push(warning.code),
    });

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "DOCX_RELAXED_THEME_STRING",
      "DOCX_RELAXED_META_KEY",
      "DOCX_RELAXED_MARGIN_TWIPS",
      "DOCX_RELAXED_PAGE_NUMBERS",
      "DOCX_RELAXED_CODE_BLOCK",
      "DOCX_RELAXED_CHART_POINTS",
    ]));
    expect(callbackWarnings).toEqual(expect.arrayContaining([
      "DOCX_RELAXED_THEME_STRING",
      "DOCX_RELAXED_CODE_BLOCK",
    ]));
  });
});
