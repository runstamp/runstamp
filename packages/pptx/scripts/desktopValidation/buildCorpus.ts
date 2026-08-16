import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_LICENSE_KEY, TEST_PUBLIC_KEY_PEM } from "../../../../scripts/test-license-fixture.mjs";
import { getZipPaths } from "../../tests/helpers/xmlTestUtils.js";
import {
  buildCorpusFixture,
  getCorpusArtifactsDir,
  listCorpusEntries,
} from "../../tests/desktopValidation/helpers/corpus.js";

function parseArgs(args: string[]) {
  const fixtureIdx = args.indexOf("--fixture");
  const fixtureId = fixtureIdx >= 0 ? args[fixtureIdx + 1] : undefined;
  const outIdx = args.indexOf("--out");
  const outDir = outIdx >= 0 ? args[outIdx + 1] : undefined;
  return { fixtureId, outDir };
}

async function countSlides(buffer: Buffer): Promise<number> {
  const paths = await getZipPaths(buffer);
  return paths.filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).length;
}

async function main() {
  process.env.NODE_ENV ??= "test";
  process.env.RUNSTAMP_LICENSE_KEY ??= TEST_LICENSE_KEY;
  process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 ??= TEST_PUBLIC_KEY_PEM;
  const { fixtureId, outDir } = parseArgs(process.argv.slice(2));
  const artifactsDir = getCorpusArtifactsDir(outDir);
  mkdirSync(artifactsDir, { recursive: true });

  const entries = await listCorpusEntries();
  const selected = fixtureId
    ? (fixtureId === "all" ? entries : entries.filter((entry) => entry.id === fixtureId))
    : entries;

  if (selected.length === 0) {
    throw new Error(`No corpus fixture found for "${fixtureId}"`);
  }

  const results = [];
  for (const entry of selected) {
    const built = await buildCorpusFixture(entry);
    const fixtureDir = join(artifactsDir, entry.id);
    mkdirSync(fixtureDir, { recursive: true });

    const pptxPath = join(fixtureDir, "generated.pptx");
    writeFileSync(pptxPath, built.buffer);

    const actualSlideCount = await countSlides(built.buffer);
    const metadata = {
      fixtureId: entry.id,
      title: entry.title,
      expectedSlideCount: entry.expectedSlideCount,
      actualSlideCount,
      validationModes: entry.validationModes,
      acceptance: entry.acceptance,
      renderOptions: entry.renderOptions ?? null,
      pptxPath: "generated.pptx",
    };
    writeFileSync(
      join(fixtureDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );
    results.push(metadata);
  }

  console.log(JSON.stringify({
    artifactRoot: artifactsDir,
    fixtures: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
