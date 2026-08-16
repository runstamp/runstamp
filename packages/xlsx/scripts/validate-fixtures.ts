import { listPhase1Fixtures } from "../src/fixtures/phase1.js";
import { listPhase2Fixtures } from "../src/fixtures/phase2.js";
import { listPhase3Fixtures } from "../src/fixtures/phase3.js";
import { listPhase4Fixtures } from "../src/fixtures/phase4.js";
import { validateXlsxStructure } from "../src/quality/structural-validation.js";
import { SpreadsheetEngine } from "../src/spreadsheet-engine.js";

const includeLarge = process.argv.includes("--include-large");
let failures = 0;

for (const fixture of [...listPhase1Fixtures(), ...listPhase2Fixtures(), ...listPhase3Fixtures(), ...listPhase4Fixtures()]) {
  if (!includeLarge && fixture.name.startsWith("large-")) {
    continue;
  }
  const buffer = await SpreadsheetEngine.render(fixture.document, fixture.renderOptions);
  const summary = await validateXlsxStructure(buffer);
  if (!summary.passed) {
    failures += 1;
    console.error(`${fixture.name}: failed`);
    for (const check of summary.checks.filter((check) => !check.passed)) {
      console.error(`  - ${check.name}: ${check.details}`);
    }
  } else {
    console.log(`${fixture.name}: passed`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
