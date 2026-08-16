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

export const effectsVectors: Record<string, PaperDocument> = {
  // Drop shadow on a colored rectangle
  "effects-drop-shadow": makeDoc("effects-drop-shadow", [
    {
      type: "View",
      style: {
        width: 300,
        height: 200,
        position: "absolute",
        top: 100,
        left: 100,
        backgroundColor: "#4472C4",
        effects: {
          dropShadow: {
            color: "#000000",
            offsetX: 5,
            offsetY: 5,
            blurRadius: 10,
            opacity: 0.5,
          },
        },
      },
    },
  ]),

  // Reflection effect
  "effects-reflection": makeDoc("effects-reflection", [
    {
      type: "View",
      style: {
        width: 300,
        height: 200,
        position: "absolute",
        top: 60,
        left: 100,
        backgroundColor: "#ED7D31",
        effects: {
          reflection: {
            blurRadius: 2,
            startOpacity: 0.5,
            endOpacity: 0,
            distance: 3,
            size: 50,
          },
        },
      },
    },
  ]),

  // Soft edge effect
  "effects-soft-edge": makeDoc("effects-soft-edge", [
    {
      type: "View",
      style: {
        width: 300,
        height: 200,
        position: "absolute",
        top: 100,
        left: 100,
        backgroundColor: "#70AD47",
        effects: {
          softEdge: { radius: 15 },
        },
      },
    },
  ]),

  // Gradient fill (linear)
  "effects-gradient-fill": makeDoc("effects-gradient-fill", [
    {
      type: "View",
      style: {
        width: 400,
        height: 250,
        position: "absolute",
        top: 80,
        left: 100,
        fill: {
          type: "linear",
          angle: 135,
          stops: [
            { color: "#4472C4", position: 0 },
            { color: "#ED7D31", position: 50 },
            { color: "#70AD47", position: 100 },
          ],
        },
      },
    },
  ]),

  // Pattern fill
  "effects-pattern-fill": makeDoc("effects-pattern-fill", [
    {
      type: "View",
      style: {
        width: 300,
        height: 200,
        position: "absolute",
        top: 100,
        left: 100,
        fill: {
          type: "pattern",
          pattern: "diagCross",
          foreground: "#4472C4",
          background: "#FFFFFF",
        },
      },
    },
  ]),

  // Shape with opacity
  "effects-opacity": makeDoc("effects-opacity", [
    {
      type: "View",
      style: {
        width: 300,
        height: 200,
        position: "absolute",
        top: 100,
        left: 80,
        backgroundColor: "#4472C4",
      },
    },
    {
      type: "View",
      style: {
        width: 300,
        height: 200,
        position: "absolute",
        top: 150,
        left: 200,
        backgroundColor: "#ED7D31",
        opacity: 0.5,
      },
    },
  ]),
};
