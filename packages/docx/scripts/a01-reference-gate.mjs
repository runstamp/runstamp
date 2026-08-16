#!/usr/bin/env node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validateFile } from "@xarsh/ooxml-validator";

const packageDir = resolve(import.meta.dirname, "..");
const entry = resolve(packageDir, "dist/index.js");
const {
  applyDocxRedactions,
  exportControlledDocx,
  findControlledDocx,
  importControlledDocx,
  renderToDocx,
  validateDocxBuffer,
  validateDocxWithReferenceApplication,
  verifyControlledDocx,
} = await import(entry);

const root = await mkdtemp(join(tmpdir(), "runstamp-a01-gate-"));
try {
  const rendered = await renderToDocx({
    type: "DocxDocument",
    pageSize: "letter",
    metadata: { title: "A01 controlled agreement", author: "Runstamp fixture" },
    pages: [{
      elements: [
        { type: "heading", level: 1, text: "Mutual confidentiality agreement" },
        { type: "paragraph", runs: [{ text: "Disclosing party: " }, { text: "Acme Secret Holdings", style: { fontWeight: "bold" } }] },
        { type: "paragraph", text: "The receiving party will preserve all unrelated obligations." },
        { type: "table", rows: [{ cells: [{ text: "Effective date" }, { text: "2026-08-10" }] }] },
      ],
    }],
  }, { deterministic: true, seed: "a01-reference-gate" });
  const imported = await importControlledDocx(rendered.buffer, { artifactId: "a01-reference.docx" });
  const locators = findControlledDocx(imported, "Acme Secret Holdings").map(({ locator }) => locator);
  if (locators.length !== 1) throw new Error(`Expected one redaction target, received ${locators.length}.`);
  const redacted = await applyDocxRedactions(imported, locators);
  if (redacted.proof.residualCount !== 0) throw new Error(`Residual count is ${redacted.proof.residualCount}.`);
  const output = exportControlledDocx(redacted.document);
  const outputPath = join(root, "a01-redacted.docx");
  await writeFile(outputPath, output);

  const internal = await validateDocxBuffer(output);
  const external = await validateFile(outputPath, { officeVersion: "Microsoft365" });
  const residual = await verifyControlledDocx(output, { forbiddenText: ["Acme Secret Holdings"] });
  const word = await validateDocxWithReferenceApplication(output, { application: "word", timeoutMs: 30_000 });
  const libreOffice = await validateDocxWithReferenceApplication(output, { application: "libreoffice", executable: "/opt/homebrew/bin/soffice", timeoutMs: 30_000 });
  const pass = internal.ok && external.ok && residual.status === "PASS" && word.validator.status === "PASS" && libreOffice.validator.status === "PASS";
  const report = {
    schemaVersion: 1,
    fixture: "legal_agreement",
    pass,
    artifact: { byteLength: output.byteLength, sha256: redacted.proof.outputSha256 },
    redaction: redacted.proof,
    validators: {
      internal: { status: internal.ok ? "PASS" : "FAIL", issues: internal.issues },
      ooxmlValidator: { status: external.ok ? "PASS" : "FAIL", errors: external.errors ?? [] },
      residual: { status: residual.status, issues: residual.issues },
      word: word.validator,
      libreOffice: libreOffice.validator,
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exitCode = 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
