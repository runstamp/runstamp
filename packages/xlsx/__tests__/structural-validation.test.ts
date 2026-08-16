import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { SpreadsheetEngine, validateXlsxStructure } from "../src/index.js";
import { getPhase1Fixture, listPhase1Fixtures } from "../src/fixtures/phase1.js";

describe("validateXlsxStructure", () => {
  it("passes representative phase 1 fixtures", async () => {
    const fixtureNames = listPhase1Fixtures()
      .map((fixture) => fixture.name)
      .filter((name) => !name.startsWith("large-"));

    for (const fixtureName of fixtureNames) {
      const fixture = getPhase1Fixture(fixtureName);
      const buffer = await SpreadsheetEngine.render(fixture.document);
      const summary = await validateXlsxStructure(buffer);

      expect(summary.passed, fixtureName).toBe(true);
      expect(summary.checks.every((check) => check.passed), fixtureName).toBe(true);
    }
  });

  it("detects relationship breakage", async () => {
    const fixture = getPhase1Fixture("single-cell");
    const validBuffer = await SpreadsheetEngine.render(fixture.document);
    const zip = await JSZip.loadAsync(validBuffer);
    const workbookRels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");

    expect(workbookRels).toBeDefined();
    zip.file(
      "xl/_rels/workbook.xml.rels",
      String(workbookRels).replace('Target="styles.xml"', 'Target="missing.xml"'),
    );
    const brokenBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const summary = await validateXlsxStructure(brokenBuffer);
    expect(summary.passed).toBe(false);
    expect(summary.checks.some((check) => !check.passed && check.name.startsWith("relationship-targets:"))).toBe(true);
  });
});
