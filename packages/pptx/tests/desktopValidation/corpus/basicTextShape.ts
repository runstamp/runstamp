import type { PaperDocument } from "../../../src/index.js";

/** Minimal native baseline used to separate Office automation failures from rich-feature failures. */
export const basicTextShapeDeck: PaperDocument = {
  type: "Document",
  meta: { title: "Basic text and shape baseline" },
  slides: [{
    type: "Slide",
    children: [
      {
        type: "Text",
        content: "Paper.jsx Office baseline",
        style: {
          position: "absolute",
          left: 80,
          top: 90,
          width: 760,
          height: 80,
          fontSize: 36,
          fontWeight: "bold",
          color: "#172033",
        },
      },
      {
        type: "View",
        decorative: true,
        style: {
          position: "absolute",
          left: 80,
          top: 210,
          width: 1020,
          height: 260,
          zIndex: 1,
          backgroundColor: "#2B6DE9",
        },
      },
      {
        type: "Text",
        content: "Editable text, native shape, clean package relationships.",
        style: {
          position: "absolute",
          left: 120,
          top: 300,
          width: 900,
          height: 60,
          zIndex: 2,
          fontSize: 24,
          color: "#FFFFFF",
        },
      },
    ],
  }],
};
