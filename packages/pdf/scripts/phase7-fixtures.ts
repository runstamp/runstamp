import { PNG } from "pngjs";
import type { PdfDocumentPhase7 } from "../src/engine.js";

function repeatedText(seed: string, count: number): string {
  return Array.from({ length: count }, (_, index) => `${seed} paragraph ${index + 1} keeps the tagged layout flowing across pages for accessibility validation.`).join(" ");
}

function createFigurePng(): Buffer {
  const png = new PNG({ colorType: 6, height: 24, width: 48 });

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (png.width * y + x) * 4;
      const ratio = x / Math.max(1, png.width - 1);
      png.data[index] = Math.round(24 + (ratio * 180));
      png.data[index + 1] = Math.round(72 + ((1 - ratio) * 96));
      png.data[index + 2] = 196;
      png.data[index + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}

export function createTaggedDocument(): PdfDocumentPhase7 {
  return {
    accessibility: {
      lang: "en-US",
      tagged: true,
    },
    bookmarks: {
      fromHeadings: true,
    },
    children: [
      {
        id: "overview",
        level: 1,
        type: "heading",
        value: "Quarterly Accessibility Report",
      },
      {
        type: "paragraph",
        value: repeatedText("Overview", 20),
      },
      {
        id: "highlights",
        level: 2,
        type: "heading",
        value: "Highlights",
      },
      {
        items: [
          { text: "Screen reader reading order matches the visual layout." },
          { text: "Header rows are tagged as table headers with column scope." },
          { lang: "ko-KR", text: "다국어 콘텐츠는 구조 요소에 언어 태그를 포함합니다." },
        ],
        ordered: false,
        style: { marginTop: 12 },
        type: "list",
      },
      {
        alt: "Quarterly revenue chart",
        format: "png",
        height: 120,
        source: createFigurePng(),
        style: { marginTop: 18 },
        type: "figure",
        width: 180,
      },
      {
        id: "details",
        level: 3,
        type: "heading",
        value: "Details",
      },
      {
        lang: "ko-KR",
        type: "paragraph",
        value: "이 단락은 문서 기본 언어와 다른 한국어 구조 요소를 검증합니다.",
      },
      {
        body: Array.from({ length: 24 }, (_, index) => ({
          cells: [
            { children: [{ type: "paragraph", value: `Row ${index + 1}` }] },
            { children: [{ type: "paragraph", value: index % 2 === 0 ? "PASS" : "WARN" }] },
          ],
        })),
        columns: [{ width: 120 }, { width: 120 }],
        header: [
          {
            cells: [
              { children: [{ type: "paragraph", value: "Check" }], role: "th" },
              { children: [{ type: "paragraph", value: "Status" }], role: "th" },
            ],
          },
        ],
        style: { marginTop: 18, width: "100%" },
        type: "table",
      },
      {
        type: "paragraph",
        value: repeatedText("Appendix", 40),
      },
    ],
    meta: {
      author: "Runstamp",
      title: "Phase 7 Tagged Document",
    },
    pageNumber: {
      fontSize: 11,
      format: "Page {page} of {total}",
      x: 72,
      y: 28,
    },
  };
}
