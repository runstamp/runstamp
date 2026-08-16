import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PdfEngine } from "../src/engine.js";
import {
  corruptXrefTable,
  createPhase10SignOptions,
  createPhase10SigningDocument,
  createPhase10TimestampedSignOptions,
  ensurePhase10CertificateFixtures,
  injectQualityDefects,
  phase10OutputDir,
  verifyDetachedCms,
  verifyTimestampToken,
} from "./phase10-fixtures.js";

interface BenchmarkResult {
  detail: string;
  name: string;
  pass: boolean;
}

function result(name: string, pass: boolean, detail: string): BenchmarkResult {
  return { detail, name, pass };
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

async function main(): Promise<void> {
  mkdirSync(phase10OutputDir(), { recursive: true });
  const fixtures = await ensurePhase10CertificateFixtures();
  const document = createPhase10SigningDocument();

  const signedBuffer = await PdfEngine.sign(document, createPhase10SignOptions(fixtures));
  const signedPath = join(phase10OutputDir(), "signed-pkcs7.pdf");
  writeFileSync(signedPath, signedBuffer);

  const timestampedBuffer = await PdfEngine.sign(document, createPhase10TimestampedSignOptions(fixtures));
  const timestampedPath = join(phase10OutputDir(), "signed-timestamped.pdf");
  writeFileSync(timestampedPath, timestampedBuffer);

  const corruptedXrefPath = join(phase10OutputDir(), "corrupted-xref.pdf");
  const repairedXrefPath = join(phase10OutputDir(), "repaired-xref.pdf");
  const corruptedXrefBuffer = corruptXrefTable(await PdfEngine.render(document));
  writeFileSync(corruptedXrefPath, corruptedXrefBuffer);
  const repaired = await PdfEngine.repair(corruptedXrefBuffer);
  writeFileSync(repairedXrefPath, repaired.buffer);
  if (hasBinary("qpdf")) {
    execFileSync("qpdf", ["--check", repairedXrefPath], { stdio: "pipe" });
  }

  const defective = injectQualityDefects(await PdfEngine.render(document));
  const quality = await PdfEngine.quality(defective.buffer);
  writeFileSync(join(phase10OutputDir(), "quality-report.json"), JSON.stringify(quality, null, 2));

  const results: BenchmarkResult[] = [
    result(
      "sig-pkcs7-valid",
      signedBuffer.toString("latin1").includes("/SubFilter /adbe.pkcs7.detached") && verifyDetachedCms(signedBuffer),
      "openssl-cms-verify",
    ),
    result(
      "sig-timestamp",
      timestampedBuffer.toString("latin1").includes("/SubFilter /ETSI.RFC3161") && verifyTimestampToken(timestampedBuffer, fixtures),
      "openssl-ts-verify",
    ),
    result(
      "repair-xref",
      repaired.repaired
        && !repaired.findings.some((finding) => finding.code === "XREF_OFFSET_MISMATCH" || finding.code === "XREF_MISSING"),
      `actions=${repaired.actions.length}`,
    ),
    result(
      "repair-quality-report",
      defective.expectedCodes.every((code) => quality.findings.some((finding) => finding.code === code)),
      `findings=${quality.findings.map((finding) => finding.code).join(",")}`,
    ),
  ];

  results.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.name} ${entry.detail}`);
  });
  console.log(`artifact_dir=${phase10OutputDir()}`);

  const failed = results.filter((entry) => !entry.pass);
  if (failed.length > 0) {
    throw new Error(`Phase 10 benchmark failures: ${failed.map((entry) => entry.name).join(", ")}`);
  }
}

void main();
