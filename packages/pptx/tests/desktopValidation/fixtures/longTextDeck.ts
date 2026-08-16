import type { PaperDocument } from "../../../src/index.js";

const paragraphs = Array.from({ length: 12 }, (_, index) => ({
  runs: [
    {
      text:
        `Paragraph ${index + 1}: desktop validation must confirm text overflow, chart fit, and pagination parity across Studio and direct exports. `.repeat(18),
    },
  ],
}));

export const longTextDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Long Text Pagination Corpus" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Route parity must paginate identically",
          style: {
            fontSize: 28,
            fontWeight: "bold",
          },
        },
        {
          type: "Text",
          style: {
            fontSize: 24,
          },
          paragraphs,
        },
      ],
    },
  ],
};
