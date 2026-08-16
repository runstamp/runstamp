import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflate } from "pako";
import { PdfEngine } from "../src/engine.js";

function extractFirstStream(pdf: Buffer): Buffer {
  const streamMarker = Buffer.from("stream\n", "ascii");
  const start = pdf.indexOf(streamMarker);
  const lengthMarker = Buffer.from("/Length ", "ascii");
  const lengthStart = pdf.lastIndexOf(lengthMarker, start);

  if (start < 0 || lengthStart < 0) {
    throw new Error("Unable to locate first stream");
  }

  let cursor = lengthStart + lengthMarker.length;
  let digits = "";
  while (cursor < pdf.length) {
    const char = String.fromCharCode(pdf[cursor] as number);
    if (!/\d/.test(char)) {
      break;
    }
    digits += char;
    cursor += 1;
  }

  const length = Number(digits);
  return pdf.subarray(start + streamMarker.length, start + streamMarker.length + length);
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

async function main(): Promise<void> {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const outputDir = join(packageRoot, "output", "phase1");
  const outputPath = join(outputDir, "hello-world.pdf");
  mkdirSync(outputDir, { recursive: true });

  const start = performance.now();
  const buffer = await PdfEngine.render({
    meta: {
      author: "Runstamp",
      title: "Hello PDF",
    },
    pages: [
      {
        text: {
          value: "Hello World",
        },
      },
    ],
  });
  const durationMs = performance.now() - start;

  writeFileSync(outputPath, buffer);

  const compressed = extractFirstStream(buffer);
  const inflated = Buffer.from(inflate(compressed));
  const lines = [
    `artifact=${outputPath}`,
    `render_ms=${durationMs.toFixed(2)}`,
    `pdf_bytes=${buffer.length}`,
    `compressed_stream_bytes=${compressed.length}`,
    `raw_stream_bytes=${inflated.length}`,
    `filter_flate=${buffer.toString("binary").includes("/Filter /FlateDecode")}`,
  ];

  if (hasBinary("pdftoppm")) {
    const prefix = join(outputDir, "hello-world");
    execFileSync("pdftoppm", ["-png", "-singlefile", "-f", "1", "-l", "1", outputPath, prefix], { stdio: "pipe" });
    lines.push(`pdftoppm_png_bytes=${readFileSync(`${prefix}.png`).length}`);
  } else {
    lines.push("pdftoppm=skipped");
  }

  console.log(lines.join("\n"));
}

void main();
