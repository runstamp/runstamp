// basic-deck.ts -- Hello world: single slide with a centered title.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/basic-deck.ts

import fs from "node:fs";
import { PaperEngine, type PaperDocument } from "../dist-lite/index.js";

const doc: PaperDocument = {
  meta: { title: "Hello World" },
  slides: [
    {
      backgroundColor: "#FFFFFF",
      children: [
        {
          type: "Text",
          content: "Hello, PowerPoint!",
          style: {
            position: "absolute",
            top: 260,
            left: 200,
            width: 880,
            height: 80,
            fontSize: 44,
            fontWeight: "bold",
            color: "#1E293B",
            textAlign: "center",
          },
        },
      ],
    },
  ],
};

const pptx = await PaperEngine.render(doc);
fs.writeFileSync("basic-deck.pptx", pptx);
console.log("Wrote basic-deck.pptx");
