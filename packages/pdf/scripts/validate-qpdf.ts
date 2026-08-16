import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfEngine } from "../src/engine.js";
import { ensurePhase2FontFixtures } from "./phase2-font-fixtures.js";

function hasQpdf(): boolean {
  return spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
}

async function main(): Promise<void> {
  if (!hasQpdf()) {
    console.log("[qpdf] skipped: qpdf is not installed locally");
    return;
  }

  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const outputDir = join(packageRoot, "output", "phase2");
  const outputPath = join(outputDir, "qpdf-embedded-font.pdf");
  mkdirSync(outputDir, { recursive: true });
  const fonts = await ensurePhase2FontFixtures();

  const buffer = await PdfEngine.render({
    meta: {
      title: "Phase 2 qpdf validation",
    },
    pages: [
      {
        text: {
          font: { family: "Inter", source: fonts.inter },
          fontSize: 24,
          value: "qpdf embedded font validation ffi",
        },
      },
    ],
  });

  writeFileSync(outputPath, buffer);
  execFileSync("qpdf", ["--check", outputPath], { stdio: "inherit" });
}

void main();
