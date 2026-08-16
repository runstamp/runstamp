import type { PaperDocument } from "../../src/types/ast.js";

function makeDoc(name: string, children: any[]): PaperDocument {
  return {
    type: "Document",
    meta: { title: name },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children,
      },
    ],
  };
}

export const typographyVectors: Record<string, PaperDocument> = {
  // Superscript and subscript
  "typo-super-subscript": makeDoc("typo-super-subscript", [
    {
      type: "Text",
      style: {
        fontSize: 24,
        fontFamily: "Arial",
        width: 800,
        height: 80,
        margin: 40,
      },
      content: [
        { text: "E = mc", style: { color: "#333333", fontSize: 24 } },
        { text: "2", style: { color: "#333333", fontSize: 18, baseline: "superscript" } },
        { text: "  and H", style: { color: "#333333", fontSize: 24 } },
        { text: "2", style: { color: "#333333", fontSize: 18, baseline: "subscript" } },
        { text: "O", style: { color: "#333333", fontSize: 24 } },
      ],
    },
  ]),

  // Text caps (uppercase transform)
  "typo-text-caps": makeDoc("typo-text-caps", [
    {
      type: "Text",
      style: {
        fontSize: 24,
        fontFamily: "Arial",
        width: 800,
        height: 80,
        margin: 40,
      },
      content: [
        { text: "ALL CAPS: ", style: { color: "#333333", fontSize: 24 } },
        { text: "this text is uppercase", style: { color: "#1565C0", fontSize: 24, textTransform: "uppercase" } },
      ],
    },
  ]),

  // Vertical text
  "typo-vertical-text": makeDoc("typo-vertical-text", [
    {
      type: "Text",
      style: {
        fontSize: 20,
        fontFamily: "Arial",
        color: "#333333",
        width: 60,
        height: 400,
        margin: 40,
        textDirection: "vertical",
      },
      content: "Vertical Text Example",
    },
  ]),

  // RTL text
  "typo-rtl": makeDoc("typo-rtl", [
    {
      type: "Text",
      style: {
        fontSize: 24,
        fontFamily: "Arial",
        color: "#333333",
        width: 800,
        height: 60,
        margin: 40,
        textAlign: "right",
        rtl: true,
      },
      content: "Right-to-left text alignment test",
    },
  ]),

  // Tab stops
  "typo-tab-stops": makeDoc("typo-tab-stops", [
    {
      type: "Text",
      style: {
        fontSize: 18,
        fontFamily: "Arial",
        width: 800,
        height: 200,
        margin: 40,
      },
      paragraphs: [
        {
          runs: [{ text: "Item\tQuantity\tPrice", style: { color: "#333333", fontWeight: "bold" } }],
          tabStops: [
            { position: 200, align: "l" },
            { position: 400, align: "r" },
          ],
        },
        {
          runs: [{ text: "Widget A\t100\t$12.50", style: { color: "#555555" } }],
          tabStops: [
            { position: 200, align: "l" },
            { position: 400, align: "r" },
          ],
        },
        {
          runs: [{ text: "Widget B\t250\t$8.75", style: { color: "#555555" } }],
          tabStops: [
            { position: 200, align: "l" },
            { position: 400, align: "r" },
          ],
        },
      ],
    },
  ]),

  // AutoFit with multi-paragraph text
  "typo-autofit-paragraphs": makeDoc("typo-autofit-paragraphs", [
    {
      type: "Text",
      style: {
        fontSize: 28,
        fontFamily: "Arial",
        width: 400,
        height: 120,
        margin: 40,
      },
      autoFit: true,
      paragraphs: [
        {
          runs: [{ text: "First Heading", style: { color: "#1A1A1A", fontWeight: "bold", fontSize: 28 } }],
          spaceBefore: 0,
          spaceAfter: 6,
        },
        {
          runs: [{ text: "This is a long body paragraph that should shrink to fit within the small container.", style: { color: "#555555", fontSize: 18 } }],
        },
      ],
    },
  ]),
};
