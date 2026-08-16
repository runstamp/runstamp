import type { PdfEmbeddedFontInput } from "../src/font-embedding.js";
import type { PdfDocumentPhase3 } from "../src/phase3-types.js";

const PHASE3_WORDS = [
  "paper",
  "layout",
  "engine",
  "benchmark",
  "deterministic",
  "rendering",
  "paragraph",
  "flexbox",
  "pagination",
  "quality",
] as const;

export const PHASE3_PARAGRAPH_TEXT = Array.from({ length: 200 }, (_, index) => PHASE3_WORDS[index % PHASE3_WORDS.length]).join(" ");

export const PHASE3_EXPECTED_PARAGRAPH_LINES = [
  "paper layout engine benchmark deterministic rendering paragraph flexbox",
  "pagination quality paper layout engine benchmark deterministic rendering",
  "paragraph flexbox pagination quality paper layout engine benchmark deterministic",
  "rendering paragraph flexbox pagination quality paper layout engine benchmark",
  "deterministic rendering paragraph flexbox pagination quality paper layout engine",
  "benchmark deterministic rendering paragraph flexbox pagination quality paper",
  "layout engine benchmark deterministic rendering paragraph flexbox pagination",
  "quality paper layout engine benchmark deterministic rendering paragraph flexbox",
  "pagination quality paper layout engine benchmark deterministic rendering",
  "paragraph flexbox pagination quality paper layout engine benchmark deterministic",
  "rendering paragraph flexbox pagination quality paper layout engine benchmark",
  "deterministic rendering paragraph flexbox pagination quality paper layout engine",
  "benchmark deterministic rendering paragraph flexbox pagination quality paper",
  "layout engine benchmark deterministic rendering paragraph flexbox pagination",
  "quality paper layout engine benchmark deterministic rendering paragraph flexbox",
  "pagination quality paper layout engine benchmark deterministic rendering",
  "paragraph flexbox pagination quality paper layout engine benchmark deterministic",
  "rendering paragraph flexbox pagination quality paper layout engine benchmark",
  "deterministic rendering paragraph flexbox pagination quality paper layout engine",
  "benchmark deterministic rendering paragraph flexbox pagination quality paper",
  "layout engine benchmark deterministic rendering paragraph flexbox pagination",
  "quality paper layout engine benchmark deterministic rendering paragraph flexbox",
  "pagination quality paper layout engine benchmark deterministic rendering",
  "paragraph flexbox pagination quality",
] as const;

export function createSingleParagraphDocument(font: PdfEmbeddedFontInput): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "paragraph",
        font,
        fontSize: 12,
        value: PHASE3_PARAGRAPH_TEXT,
      },
    ],
  };
}

export function createJustifiedDocument(font: PdfEmbeddedFontInput): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "paragraph",
        font,
        fontSize: 12,
        style: { width: 320 },
        value: "Justified lines should land flush against the target width with even spacing across each non-final line of this benchmark paragraph.",
      },
    ],
  };
}

export function createMultiPageDocument(font: PdfEmbeddedFontInput): PdfDocumentPhase3 {
  const text = Array.from({ length: 5000 }, (_, index) => PHASE3_WORDS[index % PHASE3_WORDS.length]).join(" ");

  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "paragraph",
        font,
        fontSize: 12,
        value: text,
      },
    ],
  };
}

export function createHeadingOrphanDocument(): PdfDocumentPhase3 {
  const filler = Array.from({ length: 100 }, (_, index) => `Filler line ${index + 1}`).join(" ");

  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "paragraph",
        fontSize: 22,
        value: filler,
      },
      {
        type: "heading",
        fontSize: 20,
        keepWithNext: true,
        style: { marginTop: 12, marginBottom: 8 },
        value: "Heading should move",
      },
      {
        type: "paragraph",
        fontSize: 14,
        style: { marginTop: 4 },
        value: "This paragraph must stay with the heading and provide at least two lines of follow-on text for the orphan control benchmark.",
      },
    ],
  };
}

export function createFlexRowDocument(): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "container",
        style: { flexDirection: "row", gap: 24, padding: 12 },
        children: [
          {
            type: "paragraph",
            style: { width: 180 },
            value: "Left column text",
          },
          {
            type: "paragraph",
            style: { width: 180 },
            value: "Right column text",
          },
        ],
      },
    ],
  };
}

export function createFlexWrapDocument(): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "container",
        style: {
          columnGap: 20,
          flexDirection: "row",
          flexWrap: "wrap",
          padding: 10,
          rowGap: 16,
          width: 260,
        },
        children: Array.from({ length: 5 }, (_, index) => ({
          type: "paragraph" as const,
          style: { padding: 4, width: 100 },
          value: `Item ${index + 1}`,
        })),
      },
    ],
  };
}

export function createNestedContainersDocument(): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    children: [
      {
        type: "container",
        style: { padding: 20 },
        children: [
          {
            type: "container",
            style: { marginTop: 12, padding: 16 },
            children: [
              {
                type: "container",
                style: { marginLeft: 14, padding: 10 },
                children: [
                  {
                    type: "paragraph",
                    style: { width: 180 },
                    value: "Nested container text",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

export function createA4Document(): PdfDocumentPhase3 {
  return {
    page: { size: "A4", margin: 72 },
    children: [{ type: "paragraph", value: "A4 size check" }],
  };
}

export function createLetterDocument(): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    children: [{ type: "paragraph", value: "Letter size check" }],
  };
}

export function createDeterministicDocument(font: PdfEmbeddedFontInput): PdfDocumentPhase3 {
  return {
    page: { size: "Letter", margin: 72 },
    meta: {
      author: "Runstamp",
      title: "Phase 3 deterministic benchmark",
    },
    children: [
      {
        type: "heading",
        font,
        fontSize: 18,
        value: "Deterministic layout",
      },
      {
        type: "container",
        style: { flexDirection: "row", gap: 18, marginTop: 12, padding: 8 },
        children: [
          {
            type: "paragraph",
            font,
            fontSize: 12,
            style: { width: 220 },
            value: "Deterministic layout output should not reorder fonts, lines, or pages across repeated renders.",
          },
          {
            type: "paragraph",
            style: { width: 180 },
            value: "Second column content",
          },
        ],
      },
    ],
  };
}
