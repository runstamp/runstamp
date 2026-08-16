import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCorpusFixture,
  getCorpusArtifactsDir,
  listCorpusEntries,
} from "../../tests/desktopValidation/helpers/corpus.js";
import { runMacDesktopOracle } from "../../tests/desktopValidation/helpers/macOracle.js";
import { validateStructure } from "../../tests/launchMatrix/helpers/structuralValidator.js";
import {
  createNormalizedOracleEvidence,
  inspectPptx,
  sha256Buffer,
  type NormalizedOracleResult,
} from "./evidence.js";

function parseArgs(args: string[]) {
  const fixtureIdx = args.indexOf("--fixture");
  const outIdx = args.indexOf("--out");
  return {
    fixtureId: fixtureIdx >= 0 ? args[fixtureIdx + 1] : "all",
    outDir: outIdx >= 0 ? args[outIdx + 1] : undefined,
  };
}

async function main() {
  const { fixtureId, outDir } = parseArgs(process.argv.slice(2));
  const artifactRoot = getCorpusArtifactsDir(outDir);
  mkdirSync(artifactRoot, { recursive: true });

  const entries = await listCorpusEntries();
  const selected = fixtureId === "all"
    ? entries.filter((entry) => entry.validationModes.includes("desktop_open"))
    : entries.filter((entry) => entry.id === fixtureId);

  if (selected.length === 0) {
    throw new Error(`No desktop-open corpus fixtures found for "${fixtureId}"`);
  }

  const results = [];
  const normalizedResults: NormalizedOracleResult[] = [];
  let failed = false;
  for (const entry of selected) {
    const built = await buildCorpusFixture(entry);
    const fixtureDir = join(artifactRoot, entry.id);
    mkdirSync(fixtureDir, { recursive: true });
    const pptxPath = join(fixtureDir, "generated.pptx");
    writeFileSync(pptxPath, built.buffer);

    const structural = await validateStructure(built.buffer);
    const oracle = await runMacDesktopOracle({
      fixtureId: entry.id,
      pptxPath,
      artifactDir: fixtureDir,
    });

    // A failed PDF export means PowerPoint did not complete the requested
    // round trip. Package-level Save As canonicalization is recorded by the
    // helper; semantic/structural round-trip checks below remain fail-closed.
    const failures = [...oracle.failures];
    if (!oracle.available) failures.push("oracle_unavailable");
    if (!structural.passed) {
      failures.push("structural_invalid");
    }

    let roundTrip: Buffer | null = null;
    let roundTripStructuralPassed = false;
    if (oracle.savedCopyPath && existsSync(oracle.savedCopyPath)) {
      roundTrip = readFileSync(oracle.savedCopyPath);
      roundTripStructuralPassed = (await validateStructure(roundTrip)).passed;
      const roundTripInventory = await inspectPptx(roundTrip);
      if (roundTripInventory.slides !== built.slideCount) failures.push("roundtrip_slide_count_mismatch");
      if (roundTripInventory.emptyRelationshipDirectories.length > 0) failures.push("roundtrip_empty_relationship_directory");
      if (!roundTripStructuralPassed) failures.push("roundtrip_structural_invalid");
    } else if (entry.acceptance.expectDesktopOpenPass) {
      failures.push("roundtrip_missing");
    }

    const result = {
      fixtureId: entry.id,
      passed: failures.length === 0,
      failures: [...new Set(failures)],
      oracle,
      structuralPassed: structural.passed,
    };
    writeFileSync(
      join(fixtureDir, "desktop-oracle-mac.json"),
      JSON.stringify(result, null, 2),
    );
    results.push(result);
    normalizedResults.push({
      fixtureId: entry.id,
      expectedPass: entry.acceptance.expectDesktopOpenPass === true,
      inputSha256: sha256Buffer(built.buffer),
      inputByteLength: built.buffer.length,
      passed: result.passed,
      repairPromptDetected: oracle.failures.includes("repair_dialog_detected"),
      structuralPassed: roundTripStructuralPassed,
      roundTripSha256: roundTrip ? sha256Buffer(roundTrip) : null,
      roundTripByteLength: roundTrip?.length ?? null,
      failures: result.failures,
      inputSlideCount: built.slideCount,
      roundTripSlideCount: roundTrip ? (await inspectPptx(roundTrip)).slides : null,
    });

    if (result.passed !== (entry.acceptance.expectDesktopOpenPass === true)) failed = true;
  }

  const normalizedEvidence = createNormalizedOracleEvidence(
    "macPowerPoint",
    normalizedResults,
    normalizedResults.length > 0 && normalizedResults.every((_result, index) => results[index]?.oracle.available === true),
  );
  writeFileSync(
    join(artifactRoot, "mac-powerpoint-evidence.json"),
    JSON.stringify(normalizedEvidence, null, 2),
  );

  console.log(JSON.stringify({ artifactRoot, evidence: normalizedEvidence, results }, null, 2));
  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
