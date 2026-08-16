#!/usr/bin/env node
import { resolve } from 'node:path';
import { exportDocxWithWord } from './word-oracle-lib.mjs';

function parseArgs(argv) {
  const options = { inputPath: null, outputPdfPath: null, evidencePath: null, timeoutMs: 120_000 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--input') options.inputPath = argv[++index] ?? null;
    else if (argument === '--pdf') options.outputPdfPath = argv[++index] ?? null;
    else if (argument === '--evidence') options.evidencePath = argv[++index] ?? null;
    else if (argument === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.help) return options;
  if (!options.inputPath || !options.outputPdfPath || !options.evidencePath) {
    throw new Error('--input, --pdf, and --evidence are required');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error('--timeout-ms must be an integer >= 1000');
  }
  return options;
}

function printHelp() {
  console.log(`Usage: pnpm --dir packages/docx oracle:word -- --input document.docx --pdf rendered.pdf --evidence word-oracle.json

Opens a temporary copy in Microsoft Word for macOS, refreshes main-story fields,
tables of contents, and indexes, exports PDF, and closes the copy without saving.
The source DOCX is hash-checked before and after the run. This command never
quits or kills Word and never closes documents it did not create.`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    const result = await exportDocxWithWord({
      inputPath: resolve(options.inputPath),
      outputPdfPath: resolve(options.outputPdfPath),
      evidencePath: resolve(options.evidencePath),
      timeoutMs: options.timeoutMs,
    });
    console.log(JSON.stringify(result.evidence, null, 2));
  }
} catch (error) {
  console.error(`[word-oracle] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
