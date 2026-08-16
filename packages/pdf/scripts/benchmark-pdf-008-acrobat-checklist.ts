import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function outputDir(): string {
  return join(packageRoot(), "output", "benchmarks-0410");
}

function commandText(command: string, args: string[]): string | undefined {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  } catch {
    return undefined;
  }
}

function acrobatVersion(): string {
  return commandText("osascript", [
    "-e",
    'tell application id "com.adobe.Acrobat.Pro" to get version',
  ]) ?? "unknown";
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const signedPdf = join(outputDir(), "bm-pdf-008-signed.pdf");
if (!existsSync(signedPdf)) {
  throw new Error(`Missing ${signedPdf}; run pnpm --filter @runstamp/pdf benchmark:0410 first.`);
}

const checklistDir = join(outputDir(), "acrobat");
mkdirSync(checklistDir, { recursive: true });

const checklistPath = join(checklistDir, "bm-pdf-008-acrobat-checklist.md");
const manifestPath = join(outputDir(), "bm-pdf-008-acrobat-validation.json");
const version = acrobatVersion();
const hash = sha256File(signedPdf);

writeFileSync(checklistPath, [
  "# BM-PDF-008 Acrobat Validation Checklist",
  "",
  `Signed PDF: ${signedPdf}`,
  `Signed PDF SHA-256: ${hash}`,
  `Detected Acrobat version: ${version}`,
  `Evidence manifest to create after validation: ${manifestPath}`,
  "",
  "Required manual steps:",
  "1. Open the signed PDF in Adobe Acrobat.",
  "2. Open the signature panel or signature properties.",
  "3. Confirm Acrobat reports the signature as valid for the generated PDF.",
  "4. Capture a screenshot or exported validation report and save it under this directory.",
  "5. Create bm-pdf-008-acrobat-validation.json with this shape:",
  "",
  "```json",
  JSON.stringify({
    acrobatVersion: version,
    artifact: "acrobat/<capture-file-name>",
    benchmarkId: "BM-PDF-008",
    signedPdfSha256: hash,
    status: "valid",
    validatedAt: new Date().toISOString(),
  }, null, 2),
  "```",
  "",
  "The benchmark runner will keep BM-PDF-008 at PARTIAL until that manifest exists, has status valid, points to an existing capture file, and matches the current signed PDF SHA-256.",
  "",
].join("\n"));

console.log(`checklist=${checklistPath}`);
