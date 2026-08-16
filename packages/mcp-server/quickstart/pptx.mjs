import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PaperEngine,
  PresentationSpecSchema,
  autoLoadDocumentFonts,
  compilePresentationSpec,
} from "@runstamp/pptx";

const outDir = process.env.RUNSTAMP_QUICKSTART_OUT_DIR ?? fileURLToPath(new URL("./output", import.meta.url));
const outPath = join(outDir, "runstamp-quickstart.pptx");

const spec = PresentationSpecSchema.parse({
  version: "2.0",
  title: "Runstamp PPTX Quickstart",
  slides: [
    {
      slideType: "title-body",
      title: "Runstamp PPTX Quickstart",
      subtitle: "Mode B protocol example",
      body: [
        "The protocol shape uses version 2.0 and explicit slideType values.",
        "compilePresentationSpec converts it into the renderable Runstamp document.",
      ],
      insight: "Use this path when the MCP generate_presentation tool is not connected.",
    },
    {
      slideType: "kpi-grid",
      title: "Operating Snapshot",
      items: [
        { label: "Revenue", value: "$420K", sublabel: "+18%", trend: "up" },
        { label: "Retention", value: "118%", sublabel: "+4 pts", trend: "up" },
      ],
    },
  ],
});

const document = compilePresentationSpec(spec);
await autoLoadDocumentFonts(document);
const buffer = await PaperEngine.render(document);
await mkdir(outDir, { recursive: true });
await writeFile(outPath, buffer);
console.log(outPath);
