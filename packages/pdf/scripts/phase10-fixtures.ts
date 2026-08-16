import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PdfDocumentPhase6 } from "../src/engine.js";
import type { PdfExtractedSignature, PdfSignOptions } from "../src/phase10-types.js";
import { extractPdfSignatures } from "../src/phase10-validate.js";

export interface Phase10CertificateFixtures {
  signerCertPem: string;
  signerKeyPem: string;
  signerP12: string;
  signerPassphrase: string;
  tsaCertPem: string;
  tsaKeyPem: string;
}

export function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

export function phase10OutputDir(): string {
  return join(packageRoot(), "output", "phase10");
}

function phase10FixtureDir(): string {
  return join(packageRoot(), "fixtures", "phase10");
}

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

export async function ensurePhase10CertificateFixtures(): Promise<Phase10CertificateFixtures> {
  if (!hasBinary("openssl")) {
    throw new Error("OpenSSL is required for Phase 10 fixtures");
  }

  const fixtureDir = phase10FixtureDir();
  mkdirSync(fixtureDir, { recursive: true });
  const signerCertPem = join(fixtureDir, "signer.crt");
  const signerKeyPem = join(fixtureDir, "signer.key");
  const signerP12 = join(fixtureDir, "signer.p12");
  const tsaCertPem = join(fixtureDir, "tsa.crt");
  const tsaKeyPem = join(fixtureDir, "tsa.key");
  // Frozen at the Runstamp rename. This is the passphrase of the committed
  // fixtures/phase10/signer.p12, not a brand string — renaming it makes openssl
  // fail to open a binary that already exists, taking six signature tests with
  // it. Regenerating the p12 to match a new name would be editing a fixture to
  // suit the code. Do not rename.
  const signerPassphrase = "paperjsx-phase10";

  if (
    ![signerCertPem, signerKeyPem, signerP12, tsaCertPem, tsaKeyPem].every((path) => {
      try {
        return readFileSync(path).length > 0;
      } catch {
        return false;
      }
    })
  ) {
    execFileSync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-keyout",
      signerKeyPem,
      "-out",
      signerCertPem,
      "-days",
      "3650",
      "-nodes",
      "-subj",
      "/CN=Runstamp Test Signer/O=Runstamp/C=US",
      "-addext",
      "keyUsage = critical,digitalSignature,nonRepudiation",
    ], { stdio: "pipe" });

    execFileSync("openssl", [
      "pkcs12",
      "-export",
      "-out",
      signerP12,
      "-inkey",
      signerKeyPem,
      "-in",
      signerCertPem,
      "-passout",
      `pass:${signerPassphrase}`,
    ], { stdio: "pipe" });

    execFileSync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-keyout",
      tsaKeyPem,
      "-out",
      tsaCertPem,
      "-days",
      "3650",
      "-nodes",
      "-subj",
      "/CN=Runstamp Test TSA/O=Runstamp/C=US",
      "-addext",
      "extendedKeyUsage = critical,timeStamping",
      "-addext",
      "keyUsage = critical,digitalSignature,nonRepudiation",
    ], { stdio: "pipe" });
  }

  return {
    signerCertPem,
    signerKeyPem,
    signerP12,
    signerPassphrase,
    tsaCertPem,
    tsaKeyPem,
  };
}

export function createPhase10SigningDocument(): PdfDocumentPhase6 {
  return {
    meta: {
      author: "Runstamp",
      creationDate: "2026-03-29T00:00:00Z",
      creator: "Runstamp json-to-pdf",
      modDate: "2026-03-29T00:00:00Z",
      title: "Phase 10 Signed PDF",
    },
    page: {
      margin: { bottom: 72, left: 72, right: 72, top: 72 },
      size: { height: 792, width: 612 },
    },
    children: [
      {
        type: "heading",
        level: 1,
        text: "Phase 10 Signature Test",
      },
      {
        type: "paragraph",
        text: "This document exercises PKCS#7 signatures, PDF document timestamps, and structural repair workflows.",
      },
      {
        type: "paragraph",
        text: "Runstamp keeps this fixture deterministic at the document layer so the Phase 10 harness can focus on signature integrity and repair behavior.",
      },
    ],
  };
}

export function createPhase10SignOptions(fixtures: Phase10CertificateFixtures): PdfSignOptions {
  return {
    certificate: {
      format: "p12",
      passphrase: fixtures.signerPassphrase,
      source: fixtures.signerP12,
    },
    contactInfo: "support@runstamp.com",
    location: "Seoul",
    reason: "Phase 10 benchmark",
    signerName: "Runstamp Test Signer",
    signingDate: "D:20260329000000Z00'00'",
  };
}

export function createPhase10TimestampedSignOptions(fixtures: Phase10CertificateFixtures): PdfSignOptions {
  return {
    ...createPhase10SignOptions(fixtures),
    fieldName: "SignatureWithTimestamp",
    timestamp: {
      certificate: {
        cert: fixtures.tsaCertPem,
        format: "pem",
        key: fixtures.tsaKeyPem,
      },
      fieldName: "DocumentTimestamp1",
      policyOid: "1.2.3.4.1",
    },
  };
}

export function corruptXrefTable(buffer: Buffer): Buffer {
  const content = buffer.toString("latin1");
  const corrupted = content.replace(/(\n)(\d{10}) 00000 n /, "$10000000001 00000 n ");
  return Buffer.from(corrupted, "latin1");
}

export function injectQualityDefects(buffer: Buffer): { buffer: Buffer; expectedCodes: string[] } {
  let content = buffer.toString("latin1");
  content = content.replace(/(\n)(\d{10}) 00000 n /, "$10000000001 00000 n ");
  content = content.replace(/\/Length (\d+)/, (_match, value) => `/Length ${Math.max(1, Number(value) - 5)}`);
  content = content.replace(/\/Count \d+/, "/Count 9");
  return {
    buffer: Buffer.from(content, "latin1"),
    expectedCodes: [
      "PAGE_TREE_COUNT_MISMATCH",
      "STREAM_LENGTH_MISMATCH",
      "XREF_OFFSET_MISMATCH",
    ],
  };
}

function writeTempFiles(signature: PdfExtractedSignature, buffer: Buffer): { contentPath: string; dir: string; signaturePath: string } {
  const dir = join(tmpdir(), `runstamp-phase10-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  const contentPath = join(dir, "content.bin");
  const signaturePath = join(dir, signature.kind === "timestamp" ? "timestamp.tsr" : "signature.der");
  const signedContent = Buffer.concat([
    buffer.subarray(signature.byteRange[0], signature.byteRange[0] + signature.byteRange[1]),
    buffer.subarray(signature.byteRange[2], signature.byteRange[2] + signature.byteRange[3]),
  ]);
  writeFileSync(contentPath, signedContent);
  writeFileSync(signaturePath, signature.contents);
  return { contentPath, dir, signaturePath };
}

export function verifyDetachedCms(buffer: Buffer): boolean {
  const signature = extractPdfSignatures(buffer).find((entry) => entry.kind === "signature");
  if (!signature || !hasBinary("openssl")) {
    return false;
  }
  const { contentPath, dir, signaturePath } = writeTempFiles(signature, buffer);
  try {
    execFileSync("openssl", [
      "cms",
      "-verify",
      "-binary",
      "-inform",
      "DER",
      "-in",
      signaturePath,
      "-content",
      contentPath,
      "-noverify",
      "-out",
      join(dir, "verified.bin"),
    ], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

export function verifyTimestampToken(buffer: Buffer, fixtures: Phase10CertificateFixtures): boolean {
  const signature = extractPdfSignatures(buffer).find((entry) => entry.kind === "timestamp");
  if (!signature || !hasBinary("openssl")) {
    return false;
  }
  const { contentPath, dir, signaturePath } = writeTempFiles(signature, buffer);
  try {
    execFileSync("openssl", [
      "ts",
      "-verify",
      "-data",
      contentPath,
      "-in",
      signaturePath,
      "-token_in",
      "-CAfile",
      fixtures.tsaCertPem,
    ], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

async function main(): Promise<void> {
  const fixtures = await ensurePhase10CertificateFixtures();
  console.log(JSON.stringify(fixtures, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
