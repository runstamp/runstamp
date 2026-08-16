import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadFontSourceBuffer } from "./font-source.js";
import type { PdfSignOptions, PdfTimestampAuthorityOptions } from "./phase10-types.js";

const BYTE_RANGE_WIDTH = 12;
const DEFAULT_SIGNATURE_PLACEHOLDER_BYTES = 4096;
const DEFAULT_TIMESTAMP_PLACEHOLDER_BYTES = 4096;

export interface PdfSignaturePlaceholderSpec {
  byteRangePlaceholder: string;
  byteRangeWidth: number;
  contentsPlaceholder: string;
  contentsPlaceholderBytes: number;
  fieldName: string;
  kind: "signature" | "timestamp";
}

export interface PdfSignaturePlan {
  signature: PdfSignaturePlaceholderSpec;
  timestamp?: PdfSignaturePlaceholderSpec;
}

interface PemMaterial {
  certPath: string;
  cleanup: () => void;
  keyPath: string;
}

function defaultFieldName(kind: "signature" | "timestamp"): string {
  return kind === "signature" ? "Signature1" : "DocumentTimestamp1";
}

function createByteRangePlaceholder(width = BYTE_RANGE_WIDTH): string {
  const token = "0".repeat(width);
  return `[${token} ${token} ${token} ${token}]`;
}

function createContentsPlaceholder(fillChar: "A" | "B", bytes: number): string {
  return `<${fillChar.repeat(bytes * 2)}>`;
}

export function createPdfSignaturePlan(options: PdfSignOptions): PdfSignaturePlan {
  const signatureBytes = options.placeholderBytes ?? DEFAULT_SIGNATURE_PLACEHOLDER_BYTES;
  const signature: PdfSignaturePlaceholderSpec = {
    byteRangePlaceholder: createByteRangePlaceholder(),
    byteRangeWidth: BYTE_RANGE_WIDTH,
    contentsPlaceholder: createContentsPlaceholder("A", signatureBytes),
    contentsPlaceholderBytes: signatureBytes,
    fieldName: options.fieldName ?? defaultFieldName("signature"),
    kind: "signature",
  };

  if (!options.timestamp) {
    return { signature };
  }

  const timestampBytes = options.timestamp.placeholderBytes ?? DEFAULT_TIMESTAMP_PLACEHOLDER_BYTES;
  return {
    signature,
    timestamp: {
      byteRangePlaceholder: createByteRangePlaceholder(),
      byteRangeWidth: BYTE_RANGE_WIDTH,
      contentsPlaceholder: createContentsPlaceholder("B", timestampBytes),
      contentsPlaceholderBytes: timestampBytes,
      fieldName: options.timestamp.fieldName ?? defaultFieldName("timestamp"),
      kind: "timestamp",
    },
  };
}

function normalizePdfDateInput(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError("Invalid PDF signature date");
    }
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    const hours = String(value.getUTCHours()).padStart(2, "0");
    const minutes = String(value.getUTCMinutes()).padStart(2, "0");
    const seconds = String(value.getUTCSeconds()).padStart(2, "0");
    return `D:${year}${month}${day}${hours}${minutes}${seconds}Z00'00'`;
  }
  if (value.startsWith("D:")) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid PDF signature date: ${value}`);
  }
  return normalizePdfDateInput(parsed);
}

export function formatPdfSignatureDate(value: Date | string | undefined): string | undefined {
  return normalizePdfDateInput(value);
}

function formatByteRangeValue(value: number, width: number): string {
  const formatted = String(value);
  if (formatted.length > width) {
    throw new Error(`PDF ByteRange value ${formatted} exceeds placeholder width ${width}`);
  }
  return formatted.padStart(width, "0");
}

function patchAsciiRegion(buffer: Buffer, offset: number, value: string, expectedLength?: number): void {
  const ascii = Buffer.from(value, "ascii");
  if (expectedLength !== undefined && ascii.length !== expectedLength) {
    throw new Error(`ASCII patch length mismatch: expected ${expectedLength}, received ${ascii.length}`);
  }
  ascii.copy(buffer, offset);
}

function locatePlaceholder(buffer: Buffer, placeholder: PdfSignaturePlaceholderSpec): {
  byteRangeEnd: number;
  byteRangeOffset: number;
  byteRangeTextLength: number;
  contentsOffset: number;
  contentsTextLength: number;
  hexEnd: number;
  hexStart: number;
} {
  const contentsOffset = buffer.indexOf(Buffer.from(placeholder.contentsPlaceholder, "ascii"));
  if (contentsOffset < 0) {
    throw new Error(`Unable to locate PDF ${placeholder.kind} contents placeholder`);
  }

  const byteRangeOffset = buffer.lastIndexOf(Buffer.from("/ByteRange ", "ascii"), contentsOffset);
  if (byteRangeOffset < 0) {
    throw new Error(`Unable to locate PDF ${placeholder.kind} ByteRange placeholder`);
  }

  const arrayOffset = byteRangeOffset + "/ByteRange ".length;
  const byteRangeEnd = buffer.indexOf(Buffer.from("]", "ascii"), arrayOffset);
  if (byteRangeEnd < 0) {
    throw new Error(`Unterminated ByteRange placeholder for ${placeholder.kind}`);
  }

  return {
    byteRangeEnd,
    byteRangeOffset: arrayOffset,
    byteRangeTextLength: byteRangeEnd - arrayOffset + 1,
    contentsOffset,
    contentsTextLength: placeholder.contentsPlaceholder.length,
    hexEnd: contentsOffset + placeholder.contentsPlaceholder.length - 1,
    hexStart: contentsOffset + 1,
  };
}

function applyByteRangePatch(
  buffer: Buffer,
  placeholder: PdfSignaturePlaceholderSpec,
  trailingEndExclusive?: number,
): [number, number, number, number] {
  const located = locatePlaceholder(buffer, placeholder);
  const trailingStart = located.hexEnd + 1;
  const trailingEnd = trailingEndExclusive ?? buffer.length;
  if (trailingEnd < trailingStart) {
    throw new Error(`PDF ByteRange trailing end ${trailingEnd} precedes start ${trailingStart} for ${placeholder.kind}`);
  }
  const byteRange: [number, number, number, number] = [
    0,
    located.contentsOffset,
    trailingStart,
    trailingEnd - trailingStart,
  ];
  const formatted = `[${byteRange.map((value) => formatByteRangeValue(value, placeholder.byteRangeWidth)).join(" ")}]`;
  patchAsciiRegion(buffer, located.byteRangeOffset, formatted, located.byteRangeTextLength);
  return byteRange;
}

function buildSignedContent(buffer: Buffer, byteRange: [number, number, number, number]): Buffer {
  const [offset1, length1, offset2, length2] = byteRange;
  return Buffer.concat([
    buffer.subarray(offset1, offset1 + length1),
    buffer.subarray(offset2, offset2 + length2),
  ]);
}

function patchContents(buffer: Buffer, placeholder: PdfSignaturePlaceholderSpec, signedValue: Buffer): void {
  const located = locatePlaceholder(buffer, placeholder);
  const hex = signedValue.toString("hex").toUpperCase();
  const maxLength = placeholder.contentsPlaceholderBytes * 2;
  if (hex.length > maxLength) {
    throw new Error(
      `${placeholder.kind} signature exceeds reserved placeholder size (${hex.length / 2} bytes > ${placeholder.contentsPlaceholderBytes} bytes)`,
    );
  }
  const padded = `<${hex.padEnd(maxLength, "0")}>`;
  patchAsciiRegion(buffer, located.contentsOffset, padded, located.contentsTextLength);
}

function hasBinary(name: string): boolean {
  try {
    execFileSync("which", [name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function withTempDir<T>(callback: (directory: string) => Promise<T> | T): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "runstamp-pdf-sign-"));
  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

async function loadPemMaterial(
  directory: string,
  options: PdfSignOptions["certificate"] | PdfTimestampAuthorityOptions["certificate"],
): Promise<PemMaterial> {
  if (!hasBinary("openssl")) {
    throw new Error("OpenSSL is required for PDF signing");
  }

  if (options.format === "pem") {
    const certPath = join(directory, "signer-cert.pem");
    const keyPath = join(directory, "signer-key.pem");
    writeFileSync(certPath, await loadFontSourceBuffer(options.cert));
    writeFileSync(keyPath, await loadFontSourceBuffer(options.key));
    return { certPath, cleanup: () => undefined, keyPath };
  }

  const p12Path = join(directory, "signer.p12");
  const certPath = join(directory, "signer-cert.pem");
  const keyPath = join(directory, "signer-key.pem");
  writeFileSync(p12Path, await loadFontSourceBuffer(options.source));
  const passphrase = options.passphrase ?? "";
  execFileSync("openssl", [
    "pkcs12",
    "-in",
    p12Path,
    "-clcerts",
    "-nokeys",
    "-out",
    certPath,
    "-passin",
    `pass:${passphrase}`,
  ], { stdio: "pipe" });
  execFileSync("openssl", [
    "pkcs12",
    "-in",
    p12Path,
    "-nocerts",
    "-nodes",
    "-out",
    keyPath,
    "-passin",
    `pass:${passphrase}`,
  ], { stdio: "pipe" });
  return { certPath, cleanup: () => undefined, keyPath };
}

async function signDetachedCms(content: Buffer, options: PdfSignOptions["certificate"]): Promise<Buffer> {
  return withTempDir(async (directory) => {
    const contentPath = join(directory, "content.bin");
    const signaturePath = join(directory, "signature.der");
    writeFileSync(contentPath, content);
    const pem = await loadPemMaterial(directory, options);
    try {
      execFileSync("openssl", [
        "cms",
        "-sign",
        "-binary",
        "-noattr",
        "-nosmimecap",
        "-md",
        "sha256",
        "-signer",
        pem.certPath,
        "-inkey",
        pem.keyPath,
        "-outform",
        "DER",
        "-in",
        contentPath,
        "-out",
        signaturePath,
      ], { stdio: "pipe" });
      return loadFontSourceBuffer(signaturePath);
    } finally {
      pem.cleanup();
    }
  });
}

function createTimestampConfig(directory: string, certPath: string, keyPath: string, policyOid: string): string {
  const serialPath = join(directory, "tsa-serial");
  const configPath = join(directory, "tsa.cnf");
  writeFileSync(serialPath, "01\n", "ascii");
  writeFileSync(configPath, [
    `dir = ${directory}`,
    "[ tsa ]",
    "default_tsa = tsa_config",
    "[ tsa_config ]",
    `serial = ${serialPath}`,
    "crypto_device = builtin",
    `signer_cert = ${certPath}`,
    `signer_key = ${keyPath}`,
    `certs = ${certPath}`,
    `default_policy = ${policyOid}`,
    `other_policies = ${policyOid}`,
    "digests = sha256",
    "signer_digest = sha256",
    "ess_cert_id_alg = sha256",
    "ess_cert_id_chain = no",
    "accuracy = secs:1",
    "ordering = yes",
    "tsa_name = yes",
    "",
  ].join("\n"), "utf8");
  return configPath;
}

async function createTimestampToken(content: Buffer, options: PdfTimestampAuthorityOptions): Promise<Buffer> {
  return withTempDir(async (directory) => {
    const contentPath = join(directory, "content.bin");
    const queryPath = join(directory, "request.tsq");
    const responsePath = join(directory, "response.tsr");
    writeFileSync(contentPath, content);
    const pem = await loadPemMaterial(directory, options.certificate);
    try {
      const digestHex = execFileSync("openssl", ["dgst", "-sha256", "-binary", contentPath], {
        stdio: "pipe",
      }).toString("hex");
      execFileSync("openssl", [
        "ts",
        "-query",
        "-digest",
        digestHex,
        "-sha256",
        "-cert",
        "-out",
        queryPath,
      ], { stdio: "pipe" });

      const configPath = createTimestampConfig(
        directory,
        pem.certPath,
        pem.keyPath,
        options.policyOid ?? "1.2.3.4.1",
      );

      execFileSync("openssl", [
        "ts",
        "-reply",
        "-queryfile",
        queryPath,
        "-config",
        configPath,
        "-section",
        "tsa_config",
        "-out",
        responsePath,
        "-token_out",
      ], { stdio: "pipe" });

      return loadFontSourceBuffer(responsePath);
    } finally {
      pem.cleanup();
    }
  });
}

export async function applyPdfSignaturePlan(
  buffer: Buffer,
  plan: PdfSignaturePlan,
  options: PdfSignOptions,
): Promise<Buffer> {
  const signedBuffer = Buffer.from(buffer);

  if (plan.timestamp && options.timestamp) {
    // PAdES-style two-signature layout: only the timestamp may cover the
    // entire document. The main signature is bounded to end just before the
    // timestamp's /Contents placeholder, so the timestamp can later cover the
    // patched main signature without both byte-ranges reaching EOF (poppler
    // rejects two signatures both covering the entire document).
    const signatureLocation = locatePlaceholder(signedBuffer, plan.signature);
    const timestampLocation = locatePlaceholder(signedBuffer, plan.timestamp);
    if (signatureLocation.contentsOffset >= timestampLocation.contentsOffset) {
      throw new Error("PDF signature placeholder must precede timestamp placeholder in the document body");
    }

    // Patch both /ByteRange placeholders before signing so the bytes in the
    // overlapping region (the timestamp dict bytes covered by the main sig)
    // are stable for both signing passes.
    const signatureByteRange = applyByteRangePatch(
      signedBuffer,
      plan.signature,
      timestampLocation.contentsOffset,
    );
    const timestampByteRange = applyByteRangePatch(signedBuffer, plan.timestamp);

    const cmsSignature = await signDetachedCms(
      buildSignedContent(signedBuffer, signatureByteRange),
      options.certificate,
    );
    patchContents(signedBuffer, plan.signature, cmsSignature);

    const timestampToken = await createTimestampToken(
      buildSignedContent(signedBuffer, timestampByteRange),
      options.timestamp,
    );
    patchContents(signedBuffer, plan.timestamp, timestampToken);
    return signedBuffer;
  }

  const signatureByteRange = applyByteRangePatch(signedBuffer, plan.signature);
  const cmsSignature = await signDetachedCms(buildSignedContent(signedBuffer, signatureByteRange), options.certificate);
  patchContents(signedBuffer, plan.signature, cmsSignature);
  return signedBuffer;
}
