import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine, validatePdfDocumentSafe } from "@runstamp/pdf";

const outDir = process.env.RUNSTAMP_QUICKSTART_OUT_DIR ?? fileURLToPath(new URL("./output", import.meta.url));
const outPath = join(outDir, "runstamp-quickstart.pdf");

const document = {
  meta: { title: "Runstamp PDF Quickstart", author: "Runstamp" },
  page: { size: "Letter", margin: 48 },
  children: [
    { type: "heading", value: "Runstamp PDF Quickstart", level: 1 },
    { type: "paragraph", value: "This PDF was rendered from structured JSON." },
    {
      type: "table",
      columns: [{ width: 180 }, { width: 120 }],
      header: [
        {
          cells: [
            { role: "th", children: [{ type: "paragraph", value: "Metric" }] },
            { role: "th", children: [{ type: "paragraph", value: "Value" }] },
          ],
        },
      ],
      body: [
        {
          cells: [
            { children: [{ type: "paragraph", value: "Revenue" }] },
            { children: [{ type: "paragraph", value: "$420,000" }] },
          ],
        },
        {
          cells: [
            { children: [{ type: "paragraph", value: "Retention" }] },
            { children: [{ type: "paragraph", value: "118%" }] },
          ],
        },
      ],
    },
  ],
};

const validation = validatePdfDocumentSafe(document);
if (!validation.ok) {
  throw new Error(`PDF input failed validation: ${JSON.stringify(validation.issues)}`);
}

const buffer = await PdfEngine.render(document);
await mkdir(outDir, { recursive: true });
await writeFile(outPath, buffer);
console.log(outPath);
