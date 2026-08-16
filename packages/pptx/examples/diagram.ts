// diagram.ts -- SmartArt-like process flow diagram using the diagrams module.
// generateDiagram() returns a PaperGroup that can be placed on any slide.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/diagram.ts

import fs from "node:fs";
import { PaperEngine, generateDiagram, type PaperDocument } from "../dist-lite/index.js";

// Generate a process flow diagram
const processNodes = generateDiagram({
  type: "process",
  items: [
    { label: "Discovery", description: "Identify customer needs and pain points" },
    { label: "Design", description: "Create wireframes and technical architecture" },
    { label: "Develop", description: "Build features in 2-week sprint cycles" },
    { label: "Test", description: "QA, security audit, and performance benchmarks" },
    { label: "Deploy", description: "Staged rollout with feature flags" },
  ],
  style: {
    accentColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    fontFamily: "Arial",
  },
});

const doc: PaperDocument = {
  meta: { title: "Development Process" },
  slides: [
    {
      backgroundColor: "#FFFFFF",
      children: [
        // Slide title
        {
          type: "Text",
          content: "Development Lifecycle",
          style: {
            position: "absolute",
            top: 30,
            left: 60,
            width: 700,
            height: 50,
            fontSize: 32,
            fontWeight: "bold",
            color: "#0F172A",
          },
        },
        {
          type: "Text",
          content: "Our five-phase approach to product delivery",
          style: {
            position: "absolute",
            top: 80,
            left: 60,
            width: 700,
            height: 30,
            fontSize: 16,
            color: "#64748B",
          },
        },
        // Place the generated diagram group on the slide
        {
          ...processNodes,
          style: {
            ...processNodes.style,
            position: "absolute",
            top: 140,
            left: 40,
            width: 1200,
            height: 450,
          },
        },
      ],
    },
  ],
};

const pptx = await PaperEngine.render(doc);
fs.writeFileSync("diagram.pptx", pptx);
console.log("Wrote diagram.pptx");
