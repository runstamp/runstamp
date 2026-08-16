import type { PaperDocument } from "../../src/types/ast.js";

export const edgeVectors: Record<string, PaperDocument> = {
  "edge-zero-dimension": {
    type: "Document",
    meta: { title: "Zero Dimension" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: { width: 1, height: 1, backgroundColor: "#FF0000" },
            children: [],
          },
          {
            type: "View",
            style: { width: 400, height: 200, backgroundColor: "#CCCCCC" },
            children: [],
          },
        ],
      },
    ],
  },

  "edge-overlapping": {
    type: "Document",
    meta: { title: "Overlapping Views" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: {
              position: "absolute",
              top: 100,
              left: 100,
              width: 300,
              height: 200,
              backgroundColor: "#4A90D9",
            },
            children: [],
          },
          {
            type: "View",
            style: {
              position: "absolute",
              top: 150,
              left: 200,
              width: 300,
              height: 200,
              backgroundColor: "#E74C3C",
            },
            children: [],
          },
        ],
      },
    ],
  },

  "edge-scheme-colors": {
    type: "Document",
    meta: { title: "Scheme Colors" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: { width: 200, height: 100, backgroundColor: "accent1" },
            children: [],
          },
          {
            type: "View",
            style: { width: 200, height: 100, backgroundColor: "dk1" },
            children: [],
          },
          {
            type: "View",
            style: { width: 200, height: 100, backgroundColor: "lt1" },
            children: [],
          },
          {
            type: "Text",
            style: { fontSize: 20, width: 400, height: 40, color: "accent1" },
            content: "Accent1 colored text",
          },
        ],
      },
    ],
  },

  "edge-background-color": {
    type: "Document",
    meta: { title: "Background Colors" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "View",
            style: {
              width: 800,
              height: 400,
              backgroundColor: "#F0F4F8",
              padding: 20,
              flexDirection: "column",
            },
            children: [
              {
                type: "Text",
                style: {
                  fontSize: 24,
                  color: "#2D3748",
                  width: 760,
                  height: 40,
                  backgroundColor: "#EDF2F7",
                },
                content: "Text with background color",
              },
              {
                type: "View",
                style: {
                  width: 760,
                  height: 100,
                  backgroundColor: "#4299E1",
                },
                children: [],
              },
              {
                type: "View",
                style: {
                  width: 760,
                  height: 100,
                  backgroundColor: "#48BB78",
                },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
};
