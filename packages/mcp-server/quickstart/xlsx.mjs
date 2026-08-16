import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetEngine } from "@runstamp/xlsx";

const outDir = process.env.RUNSTAMP_QUICKSTART_OUT_DIR ?? fileURLToPath(new URL("./output", import.meta.url));
const outPath = join(outDir, "runstamp-quickstart.xlsx");

const workbook = {
  meta: { title: "Runstamp XLSX Quickstart", creator: "Runstamp" },
  sheets: [
    {
      name: "Revenue",
      columns: [{ width: 18 }, { width: 14 }, { width: 14 }],
      rows: [
        { cells: [{ value: "Quarter", style: "header" }, { value: "Revenue", style: "header" }, { value: "Growth", style: "header" }] },
        { cells: [{ value: "Q1 2026" }, { value: 420000, style: "currency" }, { value: 0.18, style: "percentage" }] },
        { cells: [{ value: "Q2 2026" }, { value: 510000, style: "currency" }, { value: 0.21, style: "percentage" }] },
      ],
      conditionalFormatting: [
        {
          ref: "B2:B3",
          rules: [
            {
              type: "dataBar",
              color: "#2563EB",
              min: { type: "min" },
              max: { type: "max" },
              showValue: true,
            },
          ],
        },
      ],
    },
  ],
};

const lint = SpreadsheetEngine.lint(workbook);
if (!lint.ok) {
  throw new Error(`XLSX input failed lint: ${JSON.stringify(lint.issues)}`);
}

const buffer = await SpreadsheetEngine.render(workbook);
await mkdir(outDir, { recursive: true });
await writeFile(outPath, buffer);
console.log(outPath);
