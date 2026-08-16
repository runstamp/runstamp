/**
 * Visual verification script — renders all 10 template fixtures to .pptx files.
 * Run: npx tsx tests/launchMatrix/generateAll.ts
 * Output: tests/launchMatrix/output/t01-consulting.pptx through t10-training.pptx
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PaperEngine } from "../../src/engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "output");

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const fixtures = [
    { name: "t01-consulting", load: () => import("./fixtures/t01ConsultingDeck.js").then(m => m.consultingDeck) },
    { name: "t02-pitchbook", load: () => import("./fixtures/t02PitchBook.js").then(m => m.pitchBookDeck) },
    { name: "t03-saasBoard", load: () => import("./fixtures/t03SaasBoard.js").then(m => m.saasBoardDeck) },
    { name: "t04-qbr", load: () => import("./fixtures/t04Qbr.js").then(m => m.qbrDeck) },
    { name: "t05-salesProposal", load: () => import("./fixtures/t05SalesProposal.js").then(m => m.salesProposalDeck) },
    { name: "t06-productDemo", load: () => import("./fixtures/t06ProductDemo.js").then(m => m.productDemoDeck) },
    { name: "t07-allHands", load: () => import("./fixtures/t07AllHands.js").then(m => m.allHandsDeck) },
    { name: "t08-rfpResponse", load: () => import("./fixtures/t08RfpResponse.js").then(m => m.rfpResponseDeck) },
    { name: "t09-annualReport", load: () => import("./fixtures/t09AnnualReport.js").then(m => m.annualReportDeck) },
    { name: "t10-training", load: () => import("./fixtures/t10Training.js").then(m => m.trainingDeck) },
  ];

  console.log(`Generating ${fixtures.length} template decks...\n`);

  for (const { name, load } of fixtures) {
    try {
      const doc = await load();
      const start = Date.now();
      const buffer = await PaperEngine.render(doc);
      const elapsed = Date.now() - start;
      const outPath = join(outputDir, `${name}.pptx`);
      writeFileSync(outPath, buffer);
      console.log(`  ✓ ${name}.pptx (${doc.slides.length} slides, ${elapsed}ms, ${(buffer.length / 1024).toFixed(0)}KB)`);
    } catch (err) {
      console.error(`  ✗ ${name}: ${(err as Error).message}`);
    }
  }

  console.log(`\nOutput: ${outputDir}/`);
}

main().catch(console.error);
