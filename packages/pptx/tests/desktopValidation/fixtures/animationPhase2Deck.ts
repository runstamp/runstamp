import type { PaperDocument } from "../../../src/index.js";

export const animationPhase2Deck: PaperDocument = {
  type: "Document",
  meta: { title: "Animation Phase 2 Validation" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          style: {
            position: "absolute",
            left: 68,
            top: 44,
            width: 820,
            height: 54,
            fontSize: 28,
            fontWeight: "bold",
            fontFamily: "Aptos",
            color: "#0F172A",
          },
          content: "Animation Phase 2 desktop validation",
          animations: [
            {
              type: "emphasis",
              effect: "colorChange",
              trigger: "withPrevious",
              toColor: "#2563EB",
            },
          ],
        },
        {
          type: "Text",
          style: {
            position: "absolute",
            left: 84,
            top: 132,
            width: 360,
            height: 220,
            fontSize: 20,
            fontFamily: "Aptos",
            color: "#1F2937",
          },
          paragraphs: [
            { runs: [{ text: "Prepare launch deck" }], level: 0 },
            { runs: [{ text: "Validate motion path XML" }], level: 1 },
            { runs: [{ text: "Validate emphasis aliases" }], level: 1 },
            { runs: [{ text: "Export stakeholder review copy" }], level: 0 },
          ],
          animations: [
            {
              type: "entrance",
              effect: "fade",
              trigger: "onClick",
              build: { grouping: "byFirstLevel", nested: true, dimAfter: "#BFBFBF" },
            },
          ],
        },
        {
          type: "View",
          shapeType: "roundRect",
          style: {
            position: "absolute",
            left: 520,
            top: 156,
            width: 180,
            height: 88,
            backgroundColor: "#4472C4",
          },
          textContent: "Grow/Shrink",
          textStyle: {
            fontFamily: "Aptos",
            fontSize: 18,
            fontWeight: "bold",
            color: "#FFFFFF",
            textAlign: "center",
          },
          animations: [
            {
              type: "emphasis",
              effect: "growShrink",
              trigger: "onClick",
              scaleFactor: 140,
            },
          ],
        },
        {
          type: "View",
          shapeType: "ellipse",
          style: {
            position: "absolute",
            left: 748,
            top: 188,
            width: 96,
            height: 96,
            backgroundColor: "#C0504D",
          },
          animations: [
            {
              type: "entrance",
              effect: "motionPath",
              trigger: "onClick",
              motionPath: {
                path: "M 0 0 C 0.2 0.1 0.7 0.9 1 1",
                pathType: "custom",
                origin: "layout",
              },
            },
          ],
        },
      ],
    },
  ],
};
