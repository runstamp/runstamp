import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { PaperEngine } from "../src/engine.js";
import { applyBidiToParagraph, splitBidiText } from "../src/typography/bidi.js";
import type { PaperDocument } from "../src/types/ast.js";

const samples = [
  "إجمالي الإيرادات Total Revenue: $4.2M",
  "نمو Growth بنسبة 23% مقارنة بالعام السابق year-over-year",
  "Region: EMEA و APAC",
];

describe("mixed BiDi text", () => {
  it("splits mixed Arabic/Hebrew and Latin text without dropping logical content", () => {
    for (const sample of samples) {
      const runs = splitBidiText(sample);

      expect(runs.map((run) => run.text).join("")).toBe(sample);
      expect(runs.some((run) => run.direction === "rtl")).toBe(true);
      expect(runs.some((run) => run.direction === "ltr")).toBe(true);
    }
  });

  it("emits clean OOXML script boundaries for BM-PPTX-005 style paragraphs", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "BM-PPTX-005 BiDi regression" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              style: { width: 760, height: 220, fontSize: 24, fontFamily: "Arial" },
              paragraphs: samples.map((text) => ({ runs: [{ text }] })),
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");

    expect(slideXml).toContain("إجمالي الإيرادات");
    expect(slideXml).toContain("Total Revenue");
    expect(slideXml).toContain("$4.2M");
    expect(slideXml).toContain("نمو");
    expect(slideXml).toContain("Growth");
    expect(slideXml).toContain("23");
    expect(slideXml).toContain("%");
    expect(slideXml).toContain("Region: EMEA");
    expect(slideXml).toContain("APAC");
    expect(slideXml).toMatch(/<a:pPr[^>]*rtl="1"/);
    expect(slideXml).toContain('<a:latin typeface="Liberation Sans"/>');
    expect(slideXml).toContain('<a:cs typeface=""/>');
    expect(slideXml).toContain("<a:rtl/>");
  });

  it("emits RTL mixed runs in PowerPoint visual order", () => {
    const para = applyBidiToParagraph(
      {
        rtl: true,
        runs: [
          { text: "نمو " },
          { text: "Growth" },
          { text: " بنسبة " },
          { text: "23%" },
          { text: " مقارنة بالعام السابق " },
          { text: "year-over-year" },
        ],
      },
      { rtl: true, fontFamily: "Arial" },
    );

    expect(para.runs.map((run) => run.text)).toEqual([
      "year-over-year",
      " مقارنة بالعام السابق ",
      "23%",
      " بنسبة ",
      "Growth",
      "نمو ",
    ]);
  });

  it("preserves explicit LTR paragraphs as a single logical run", () => {
    const para = applyBidiToParagraph(
      {
        rtl: false,
        align: "right",
        runs: [
          {
            text: "نمو Growth بنسبة 23% مقارنة بالعام السابق year-over-year",
            style: { lang: "en-US", fontFamily: "Arial" },
          },
        ],
      },
      { rtl: true, fontFamily: "Arial" },
    );

    expect(para.rtl).toBe(false);
    expect(para.runs.map((run) => run.text)).toEqual([
      "نمو Growth بنسبة 23% مقارنة بالعام السابق year-over-year",
    ]);
    expect(para.runs[0].style?.lang).toBe("en-US");
  });

  it("emits explicit LTR mixed paragraphs without run-level RTL markers", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Explicit LTR mixed BiDi line" },
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              style: { width: 760, height: 80, fontSize: 24, fontFamily: "Arial", rtl: false, textAlign: "right" },
              paragraphs: [
                {
                  rtl: false,
                  align: "right",
                  runs: [
                    {
                      text: "نمو Growth بنسبة 23% مقارنة بالعام السابق year-over-year",
                      style: { lang: "en-US", fontFamily: "Arial" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");

    expect(slideXml).toContain('<a:bodyPr wrap="square" rtlCol="0"');
    expect(slideXml).toContain('<a:pPr algn="r">');
    expect(slideXml).toContain("<a:t>نمو Growth بنسبة 23% مقارنة بالعام السابق year-over-year</a:t>");
    expect(slideXml).not.toContain("<a:rtl/>");
  });
});
