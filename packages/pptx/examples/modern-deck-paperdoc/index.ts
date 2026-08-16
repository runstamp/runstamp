// modern-deck-paperdoc/index.ts -- Canonical modern deck example built with PaperDocument.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/modern-deck-paperdoc/index.ts

import fs from "node:fs";
import path from "node:path";
import { PaperEngine } from "../../dist-lite/index.js";
import { buildModernDeckPaperDocument } from "./deck.js";

const outputPath = path.join(process.cwd(), "modern-deck-paperdoc.pptx");
const buffer = await PaperEngine.render(buildModernDeckPaperDocument());

fs.writeFileSync(outputPath, buffer);
console.log(`Wrote ${outputPath}`);
