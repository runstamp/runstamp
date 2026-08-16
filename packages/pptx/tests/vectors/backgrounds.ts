import type { PaperDocument } from "../../src/types/ast.js";

export const backgroundVectors: Record<string, PaperDocument> = {
  // Solid color background
  "bg-solid": {
    type: "Document",
    meta: { title: "bg-solid" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        background: { type: "solid", color: "#1A237E" },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 32,
              color: "#FFFFFF",
              fontFamily: "Arial",
              fontWeight: "bold",
              textAlign: "center",
              width: 960,
              height: 60,
              marginTop: 200,
            },
            content: "Solid Dark Background",
          },
        ],
      },
    ],
  },

  // Gradient background
  "bg-gradient": {
    type: "Document",
    meta: { title: "bg-gradient" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "gradient",
          angle: 135,
          stops: [
            { color: "#667eea", position: 0 },
            { color: "#764ba2", position: 100 },
          ],
        },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 32,
              color: "#FFFFFF",
              fontFamily: "Arial",
              fontWeight: "bold",
              textAlign: "center",
              width: 960,
              height: 60,
              marginTop: 200,
            },
            content: "Gradient Background",
          },
        ],
      },
    ],
  },

  // Pattern background
  "bg-pattern": {
    type: "Document",
    meta: { title: "bg-pattern" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        background: {
          type: "pattern",
          pattern: "ltDnDiag",
          foreground: "#CCCCCC",
          background: "#FFFFFF",
        },
        children: [
          {
            type: "Text",
            style: {
              fontSize: 28,
              color: "#333333",
              fontFamily: "Arial",
              fontWeight: "bold",
              textAlign: "center",
              width: 960,
              height: 60,
              marginTop: 200,
            },
            content: "Pattern Background",
          },
        ],
      },
    ],
  },
};
