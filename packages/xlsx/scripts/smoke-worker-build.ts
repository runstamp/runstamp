import { readFileSync } from "node:fs";
import { SpreadsheetEngine, type SpreadsheetDocument } from "../dist/index.js";

const workbook: SpreadsheetDocument = {
  sheets: Array.from({ length: 24 }, (_unused, sheetIndex) => ({
    name: `Worker${sheetIndex + 1}`,
    freezePane: { row: 1, col: 1 },
    rows: [
      { cells: [{ value: "Region" }, { value: "Revenue" }, { value: "Active" }] },
      ...Array.from({ length: 1_500 }, (_rowUnused, rowIndex) => ({
        cells: [
          { value: `region-${sheetIndex + 1}` },
          { value: rowIndex * (sheetIndex + 1) },
          { value: rowIndex % 2 === 0 },
        ],
      })),
    ],
  })),
};

const cold = await SpreadsheetEngine.render(workbook, {
  deterministic: true,
  stringStrategy: "inlineStrings",
});
const warm = await SpreadsheetEngine.render(workbook, {
  deterministic: true,
  stringStrategy: "inlineStrings",
  warmPath: true,
});

if (!cold.equals(warm)) {
  throw new Error("Built XLSX worker warm path drifted from cold render output");
}

const packagedEntry = readFileSync(new URL("../dist/index.js", import.meta.url), "utf8");
if (packagedEntry.includes("createRequire") || packagedEntry.includes("runXlsxChaosLab")) {
  throw new Error("Built XLSX runtime bundle still includes benchmark or chaos-lab code");
}

console.log(JSON.stringify({
  ok: true,
  bytes: warm.length,
}, null, 2));
