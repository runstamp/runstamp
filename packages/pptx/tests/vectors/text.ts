import type { PaperDocument } from "../../src/types/ast.js";

export const textVectors: Record<string, PaperDocument> = {
  // 1. Single plain text, 32px
  "text-plain": {
    type: "Document",
    meta: { title: "Plain Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 32,
              color: "#333333",
              fontFamily: "Arial",
              width: 800,
              height: 60,
              margin: 40,
            },
            content: "The quick brown fox jumps over the lazy dog.",
          },
        ],
      },
    ],
  },

  // 2. Long paragraph wrapping to multiple lines
  "text-multiline": {
    type: "Document",
    meta: { title: "Multiline Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 18,
              color: "#222222",
              fontFamily: "Arial",
              width: 600,
              height: 300,
              margin: 40,
              lineHeight: 1.5,
            },
            content:
              "Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line spacing, and letter spacing, as well as adjusting the space between pairs of letters. The term typography is also applied to the style, arrangement, and appearance of the letters, numbers, and symbols created by the process. Type design is a closely related craft, sometimes considered part of typography itself.",
          },
        ],
      },
    ],
  },

  // 3. Combined bold + italic
  "text-bold-italic": {
    type: "Document",
    meta: { title: "Bold Italic Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 28,
              color: "#1a1a1a",
              fontFamily: "Georgia",
              fontWeight: "bold",
              fontStyle: "italic",
              width: 800,
              height: 80,
              margin: 40,
            },
            content:
              "Fundamental principles of design remain constant across every medium.",
          },
        ],
      },
    ],
  },

  // 4. Multiple TextRun[] with mixed styles
  "text-rich-runs": {
    type: "Document",
    meta: { title: "Rich Text Runs", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 24,
              fontFamily: "Arial",
              width: 800,
              height: 120,
              margin: 40,
            },
            content: [
              {
                text: "Revenue grew by ",
                style: { color: "#333333", fontSize: 24 },
              },
              {
                text: "42%",
                style: {
                  color: "#2E7D32",
                  fontSize: 28,
                  fontWeight: "bold",
                },
              },
              {
                text: " year-over-year, driven primarily by ",
                style: { color: "#333333", fontSize: 24 },
              },
              {
                text: "enterprise subscriptions",
                style: {
                  color: "#1565C0",
                  fontSize: 24,
                  fontWeight: "bold",
                  fontStyle: "italic",
                },
              },
              {
                text: " and a ",
                style: { color: "#333333", fontSize: 24 },
              },
              {
                text: "15%",
                style: {
                  color: "#2E7D32",
                  fontSize: 28,
                  fontWeight: "bold",
                },
              },
              {
                text: " increase in average contract value.",
                style: { color: "#333333", fontSize: 24 },
              },
            ],
          },
        ],
      },
    ],
  },

  // 5. TextRun with hyperlink property
  "text-hyperlink": {
    type: "Document",
    meta: { title: "Hyperlinked Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 22,
              fontFamily: "Arial",
              width: 700,
              height: 80,
              margin: 40,
            },
            content: [
              {
                text: "For more details, see the ",
                style: { color: "#333333" },
              },
              {
                text: "official documentation",
                style: { color: "#1565C0", fontWeight: "bold" },
                hyperlink: "https://docs.example.com/guide",
              },
              {
                text: " or contact us at ",
                style: { color: "#333333" },
              },
              {
                text: "support@example.com",
                style: { color: "#1565C0" },
                hyperlink: "mailto:support@example.com",
              },
              {
                text: ".",
                style: { color: "#333333" },
              },
            ],
          },
        ],
      },
    ],
  },

  // 6. textAlign: "center"
  "text-center-aligned": {
    type: "Document",
    meta: { title: "Center Aligned Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 36,
              color: "#1a1a1a",
              fontFamily: "Arial",
              fontWeight: "bold",
              textAlign: "center",
              width: 960,
              height: 80,
              marginTop: 100,
            },
            content: "Quarterly Business Review",
          },
          {
            type: "Text",
            style: {
              fontSize: 20,
              color: "#666666",
              fontFamily: "Arial",
              textAlign: "center",
              width: 960,
              height: 40,
              marginTop: 10,
            },
            content: "Fiscal Year 2026 — Second Quarter Results",
          },
        ],
      },
    ],
  },

  // 7. textAlign: "right"
  "text-right-aligned": {
    type: "Document",
    meta: { title: "Right Aligned Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 14,
              color: "#888888",
              fontFamily: "Arial",
              textAlign: "right",
              width: 880,
              height: 24,
              marginTop: 20,
              marginRight: 40,
              marginLeft: 40,
            },
            content: "Confidential — Internal Use Only",
          },
          {
            type: "Text",
            style: {
              fontSize: 16,
              color: "#555555",
              fontFamily: "Arial",
              textAlign: "right",
              width: 300,
              height: 120,
              position: "absolute",
              right: 40,
              bottom: 40,
            },
            content:
              "Prepared by the Office of Strategic Planning\nLast updated: February 2026\nDistribution: Board of Directors",
          },
        ],
      },
    ],
  },

  // 8. Custom lineHeight value
  "text-line-height": {
    type: "Document",
    meta: { title: "Custom Line Height", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 20,
              color: "#333333",
              fontFamily: "Georgia",
              lineHeight: 2.0,
              width: 700,
              height: 400,
              margin: 40,
            },
            content:
              "Double-spaced text is often used in academic manuscripts and editorial drafts to provide room for annotations and corrections. This paragraph demonstrates a lineHeight of 2.0, which doubles the vertical distance between baselines. Reviewers and editors traditionally prefer this spacing because it allows them to insert comments, corrections, and marginal notes between lines without cluttering the text.",
          },
        ],
      },
    ],
  },

  // 9. autoFit: true, text overflows container (small container, long text)
  "text-autofit-overflow": {
    type: "Document",
    meta: { title: "AutoFit Overflow", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 32,
              color: "#222222",
              fontFamily: "Arial",
              width: 300,
              height: 80,
              margin: 40,
            },
            autoFit: true,
            content:
              "This text is intentionally too long for the small container it has been placed in. The autoFit feature should shrink the font size so that every word fits within the 300 by 80 pixel bounding box without any clipping or overflow.",
          },
        ],
      },
    ],
  },

  // 10. autoFit: true, text fits without scaling
  "text-autofit-fits": {
    type: "Document",
    meta: { title: "AutoFit Fits", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 20,
              color: "#333333",
              fontFamily: "Arial",
              width: 800,
              height: 200,
              margin: 40,
            },
            autoFit: true,
            content: "Short text that fits easily.",
          },
        ],
      },
    ],
  },

  // 11. fontSize: 96 in a small container
  "text-large-font": {
    type: "Document",
    meta: { title: "Large Font", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 96,
              color: "#B71C1C",
              fontFamily: "Impact",
              fontWeight: "bold",
              textAlign: "center",
              width: 400,
              height: 150,
              marginTop: 60,
              marginLeft: 280,
            },
            content: "SOLD OUT",
          },
        ],
      },
    ],
  },

  // 12. Empty string content
  "text-empty": {
    type: "Document",
    meta: { title: "Empty Text", author: "Test Suite" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 24,
              color: "#000000",
              fontFamily: "Arial",
              width: 400,
              height: 60,
              margin: 40,
            },
            content: "",
          },
        ],
      },
    ],
  },
};
