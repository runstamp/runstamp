import { createHash } from "node:crypto";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { listPhase1Fixtures } from "../src/fixtures/phase1.js";
import { listPhase2Fixtures } from "../src/fixtures/phase2.js";
import { listPhase3Fixtures } from "../src/fixtures/phase3.js";
import { listPhase4Fixtures } from "../src/fixtures/phase4.js";
import { SpreadsheetEngine } from "../src/spreadsheet-engine.js";

const includeLarge = process.argv.includes("--include-large");
const outputRoot = path.resolve(process.cwd(), "../../docs/runstamp-xlsx/test-files");

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main(): Promise<void> {
  const fixtures = [
    ...listPhase1Fixtures().filter((fixture) => includeLarge || !fixture.name.startsWith("large-")),
    ...listPhase2Fixtures(),
    ...listPhase3Fixtures(),
    ...listPhase4Fixtures(),
  ];
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const manifestLines: string[] = [
    "# XLSX Test Files",
    "",
    `Generated from \`@runstamp/xlsx\` on ${new Date().toISOString()}.`,
    "",
    `Mode: ${includeLarge ? "standard + large fixtures" : "standard fixtures only"}`,
    "",
    "| Fixture | File | Sheets | Rows | Cols | Size | SHA256 | Purpose |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const fixture of fixtures) {
    const buffer = await SpreadsheetEngine.render(fixture.document, fixture.renderOptions);
    const fileName = `${fixture.name}.xlsx`;
    const absolutePath = path.join(outputRoot, fileName);
    await writeFile(absolutePath, buffer);

    const fileStats = await stat(absolutePath);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    manifestLines.push(
      `| \`${fixture.name}\` | \`${fileName}\` | ${"sheets" in fixture ? fixture.sheets : fixture.document.sheets.length} | ${"rows" in fixture ? fixture.rows : fixture.document.sheets.reduce((total, sheet) => total + sheet.rows.length, 0)} | ${"cols" in fixture ? fixture.cols : Math.max(...fixture.document.sheets.map((sheet) => Math.max(0, ...sheet.rows.map((row) => row.cells.length))), 0)} | ${formatBytes(fileStats.size)} | \`${sha256}\` | ${fixture.description} |`,
    );
  }

  manifestLines.push("");
  manifestLines.push("## Notes");
  manifestLines.push("");
  manifestLines.push("- All files are deterministic renders from the in-repo fixture definitions.");
  manifestLines.push("- Date cells now auto-apply `yyyy-mm-dd` formatting when no explicit number format is provided.");
  manifestLines.push("- Large fixtures are omitted unless the script is run with `--include-large`.");
  manifestLines.push("");

  await writeFile(path.join(outputRoot, "MANIFEST.md"), `${manifestLines.join("\n")}\n`, "utf8");
  console.log(`Exported ${fixtures.length} fixture files to ${outputRoot}`);
}

await main();
