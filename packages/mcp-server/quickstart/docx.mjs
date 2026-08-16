import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReportDocx, renderToDocx, validateDocxDocument } from "@runstamp/docx";

const outDir = process.env.RUNSTAMP_QUICKSTART_OUT_DIR ?? fileURLToPath(new URL("./output", import.meta.url));
const outPath = join(outDir, "runstamp-quickstart.docx");

const report = {
  title: "Runstamp DOCX Quickstart",
  subtitle: "Mode B builder example",
  author: "Runstamp",
  date: "2026-04-28",
  sections: [
    {
      heading: "Summary",
      level: 1,
      content: "This DOCX uses the same high-level report shape accepted by the MCP generate_report_docx tool.",
      bullets: [
        "buildReportDocx converts the wrapper shape into canonical DocxDocument JSON.",
        "renderToDocx writes a native Office Open XML package.",
      ],
    },
  ],
  includeToc: false,
  theme: "corporate",
  pageSize: "a4",
  includePageNumbers: true,
};

const document = buildReportDocx(report);
validateDocxDocument(document);
const result = await renderToDocx(document);
await mkdir(outDir, { recursive: true });
await writeFile(outPath, result.buffer);
console.log(outPath);
