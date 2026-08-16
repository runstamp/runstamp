import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflate } from "pako";
import type {
  PdfComplianceLevel,
  PdfExtractedSignature,
  PdfQualityFinding,
  PdfValidationCheck,
  PdfValidationSummary,
} from "./phase10-types.js";

export interface ScannedPdfObject {
  body: Buffer;
  bodyText: string;
  dictionaryText?: string;
  end: number;
  generationNumber: number;
  objectNumber: number;
  refs: number[];
  start: number;
  streamData?: Buffer;
}

export interface ScannedPdfDocument {
  buffer: Buffer;
  headerVersion: string;
  infoRef?: number;
  objectMap: Map<number, ScannedPdfObject>;
  objects: ScannedPdfObject[];
  rootRef?: number;
  startXref?: number;
  trailerText?: string;
  xrefEntries: Map<number, number>;
  xrefOffset?: number;
}

interface SignatureValidationState {
  complianceLevel: PdfComplianceLevel;
  findings: PdfQualityFinding[];
  checks: PdfValidationCheck[];
}

function asLatin1(buffer: Buffer): string {
  return buffer.toString("latin1");
}

function hasBinary(name: string): boolean {
  try {
    execFileSync("which", [name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function withTempDir<T>(callback: (directory: string) => T): T {
  const directory = mkdtempSync(join(tmpdir(), "runstamp-pdf-validate-"));
  try {
    return callback(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

function findLineToken(
  content: string,
  token: string,
  fromIndex: number,
): { index: number; tokenIndex: number } | undefined {
  const pattern = new RegExp(`(^|[\\r\\n])${token}(?=\\r?\\n|$)`, "gm");
  pattern.lastIndex = fromIndex;
  const match = pattern.exec(content);
  if (!match) {
    return undefined;
  }
  return {
    index: match.index,
    tokenIndex: match.index + match[1].length,
  };
}

function getLineBreakStartBeforeToken(content: string, tokenIndex: number): number {
  if (tokenIndex <= 0) {
    return tokenIndex;
  }

  const lastBreakChar = content[tokenIndex - 1];
  if (lastBreakChar === "\n") {
    return tokenIndex >= 2 && content[tokenIndex - 2] === "\r"
      ? tokenIndex - 2
      : tokenIndex - 1;
  }

  if (lastBreakChar === "\r") {
    return tokenIndex - 1;
  }

  return tokenIndex;
}

function findStreamMarker(
  content: string,
  fromIndex: number,
): { dataStart: number; index: number; tokenIndex: number } | undefined {
  const pattern = /(^|[\r\n])stream(\r?\n)/gm;
  pattern.lastIndex = fromIndex;
  const match = pattern.exec(content);
  if (!match) {
    return undefined;
  }
  return {
    dataStart: match.index + match[0].length,
    index: match.index,
    tokenIndex: match.index + match[1].length,
  };
}

function parseStreamSegments(body: Buffer, bodyText: string): {
  dictionaryText?: string;
  refs: number[];
  streamData?: Buffer;
} {
  const streamMatch = /(^|[\r\n])stream(\r?\n)/gm.exec(bodyText);
  if (!streamMatch) {
    const refs = collectObjectReferences(bodyText);
    return {
      dictionaryText: bodyText.startsWith("<<") ? bodyText : undefined,
      refs,
    };
  }

  const streamTokenIndex = streamMatch.index + streamMatch[1].length;
  const dataStart = streamMatch.index + streamMatch[0].length;
  const dictionaryText = bodyText.slice(0, streamTokenIndex);
  const declaredLength = dictionaryText.match(/\/Length\s+(\d+)/)?.[1];
  const searchFrom = declaredLength ? Math.min(bodyText.length, dataStart + Number(declaredLength)) : dataStart;
  const endStream = findLineToken(bodyText, "endstream", searchFrom) ?? findLineToken(bodyText, "endstream", dataStart);
  const streamData = endStream
    ? body.subarray(dataStart, getLineBreakStartBeforeToken(bodyText, endStream.tokenIndex))
    : undefined;
  const refs = collectObjectReferences(dictionaryText);

  return {
    dictionaryText,
    refs,
    streamData,
  };
}

function stripPdfLiteralStrings(text: string): string {
  return text
    .replace(/\((?:\\.|[^\\)])*\)/gs, (match) => " ".repeat(match.length))
    .replace(/<(?!<)[0-9A-Fa-f\s]*>/g, (match) => " ".repeat(match.length));
}

function collectObjectReferences(text: string): number[] {
  const refs: number[] = [];
  const sanitized = stripPdfLiteralStrings(text);
  const pattern = /(^|[^\d.])(\d+)\s+(\d+)\s+R(?![\d.])/g;
  for (const match of sanitized.matchAll(pattern)) {
    refs.push(Number(match[2]));
  }
  return refs;
}

function parseIndirectObjects(buffer: Buffer): ScannedPdfObject[] {
  const content = asLatin1(buffer);
  const pattern = /(^|[\r\n])(\d+)\s+(\d+)\s+obj(\r?\n)/gm;
  const objects: ScannedPdfObject[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(content);
    if (!match) {
      break;
    }

    const objectStart = match.index + match[1].length;
    const objectNumber = Number(match[2]);
    const generationNumber = Number(match[3]);
    const bodyStart = match.index + match[0].length;
    const preliminaryEndMarker = findLineToken(content, "endobj", bodyStart);
    if (!preliminaryEndMarker) {
      cursor = bodyStart;
      continue;
    }

    const streamMarker = findStreamMarker(content, bodyStart);
    let endSearchStart = bodyStart;
    if (streamMarker && streamMarker.index < preliminaryEndMarker.index) {
      const dictionaryText = content.slice(bodyStart, streamMarker.tokenIndex);
      const declaredLength = dictionaryText.match(/\/Length\s+(\d+)/)?.[1];
      const endStream = findLineToken(
        content,
        "endstream",
        declaredLength ? Math.min(content.length, streamMarker.dataStart + Number(declaredLength)) : streamMarker.dataStart,
      ) ?? findLineToken(content, "endstream", streamMarker.dataStart);
      if (endStream) {
        endSearchStart = endStream.tokenIndex + "endstream".length;
      }
    }
    const endMarker = endSearchStart === bodyStart
      ? preliminaryEndMarker
      : findLineToken(content, "endobj", endSearchStart);
    if (!endMarker) {
      cursor = bodyStart;
      continue;
    }

    const body = buffer.subarray(bodyStart, endMarker.index);
    const bodyText = asLatin1(body);
    const { dictionaryText, refs, streamData } = parseStreamSegments(body, bodyText);
    objects.push({
      body,
      bodyText,
      dictionaryText,
      end: endMarker.tokenIndex + "endobj".length,
      generationNumber,
      objectNumber,
      refs,
      start: objectStart,
      streamData,
    });
    cursor = endMarker.tokenIndex + "endobj".length;
  }

  return objects.sort((left, right) => left.objectNumber - right.objectNumber);
}

function parseXrefEntries(content: string, xrefOffset: number | undefined): Map<number, number> {
  if (xrefOffset === undefined || xrefOffset < 0) {
    return new Map();
  }

  const xrefMarker = "xref\n";
  if (!content.startsWith(xrefMarker, xrefOffset)) {
    return new Map();
  }

  const trailerOffset = content.indexOf("\ntrailer\n", xrefOffset);
  if (trailerOffset < 0) {
    return new Map();
  }

  const lines = content.slice(xrefOffset + xrefMarker.length, trailerOffset).trim().split(/\r?\n/);
  const entries = new Map<number, number>();
  let cursor = 0;

  while (cursor < lines.length) {
    const header = lines[cursor]?.trim();
    cursor += 1;
    if (!header) {
      continue;
    }
    const [startValue, countValue] = header.split(/\s+/);
    const subsectionStart = Number(startValue);
    const subsectionCount = Number(countValue);
    if (!Number.isFinite(subsectionStart) || !Number.isFinite(subsectionCount)) {
      break;
    }

    for (let index = 0; index < subsectionCount && cursor < lines.length; index += 1, cursor += 1) {
      const row = lines[cursor] ?? "";
      const rowMatch = row.match(/^(\d{10})\s+(\d{5})\s+([nf])/);
      if (!rowMatch) {
        continue;
      }
      if (rowMatch[3] === "n") {
        entries.set(subsectionStart + index, Number(rowMatch[1]));
      }
    }
  }

  return entries;
}

function parseTrailerRefs(content: string): { infoRef?: number; rootRef?: number; startXref?: number; trailerText?: string; xrefOffset?: number } {
  const startXrefMatch = content.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
  const startXref = startXrefMatch ? Number(startXrefMatch[1]) : undefined;
  const trailerMatch = content.match(/trailer\s*(<<[\s\S]*?>>)\s*startxref/s);
  const trailerText = trailerMatch?.[1];
  const rootMatch = trailerText?.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
  const infoMatch = trailerText?.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
  return {
    infoRef: infoMatch ? Number(infoMatch[1]) : undefined,
    rootRef: rootMatch ? Number(rootMatch[1]) : undefined,
    startXref,
    trailerText,
    xrefOffset: startXref,
  };
}

export function scanPdfBuffer(buffer: Buffer): ScannedPdfDocument {
  const content = asLatin1(buffer);
  const headerMatch = content.match(/^%PDF-(\d\.\d)/);
  const objects = parseIndirectObjects(buffer);
  const objectMap = new Map(objects.map((object) => [object.objectNumber, object]));
  const trailer = parseTrailerRefs(content);

  return {
    buffer,
    headerVersion: headerMatch?.[1] ?? "1.4",
    infoRef: trailer.infoRef,
    objectMap,
    objects,
    rootRef: trailer.rootRef,
    startXref: trailer.startXref,
    trailerText: trailer.trailerText,
    xrefEntries: parseXrefEntries(content, trailer.xrefOffset),
    xrefOffset: trailer.xrefOffset,
  };
}

function extractTitleFromInfo(object: ScannedPdfObject | undefined): string | undefined {
  const match = object?.bodyText.match(/\/Title\s+\((.*?)\)/s);
  return match?.[1];
}

function extractTitleFromMetadata(object: ScannedPdfObject | undefined): string | undefined {
  if (!object?.streamData) {
    return undefined;
  }
  const xml = object.streamData.toString("utf8");
  const rdfMatch = xml.match(/<rdf:li[^>]*>(.*?)<\/rdf:li>/s);
  return rdfMatch?.[1];
}

function buildUnsignedComplianceLevel(content: string): PdfComplianceLevel {
  if (content.includes("/OutputIntents")) {
    return "pdfa";
  }
  if (content.includes("/StructTreeRoot")) {
    return "tagged";
  }
  if (content.includes("/AcroForm") || content.includes("/Annots")) {
    return "interactive";
  }
  return "base";
}

function trimDerPadding(buffer: Buffer): Buffer {
  if (buffer.length < 2 || buffer[0] !== 0x30) {
    return buffer;
  }
  const lengthByte = buffer[1] as number;
  if ((lengthByte & 0x80) === 0) {
    return buffer.subarray(0, Math.min(buffer.length, lengthByte + 2));
  }
  const octetCount = lengthByte & 0x7f;
  if (octetCount <= 0 || octetCount > 4 || buffer.length < 2 + octetCount) {
    return buffer;
  }
  let length = 0;
  for (let index = 0; index < octetCount; index += 1) {
    length = (length << 8) | (buffer[2 + index] as number);
  }
  return buffer.subarray(0, Math.min(buffer.length, 2 + octetCount + length));
}

function parseByteRange(text: string): [number, number, number, number] | undefined {
  const match = text.match(/\/ByteRange\s+\[(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\]/);
  if (!match) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}

export function extractPdfSignatures(buffer: Buffer): PdfExtractedSignature[] {
  const scan = scanPdfBuffer(buffer);
  const signatures: PdfExtractedSignature[] = [];

  for (const object of scan.objects) {
    if (!object.bodyText.includes("/ByteRange") || !object.bodyText.includes("/Contents <")) {
      continue;
    }
    const byteRange = parseByteRange(object.bodyText);
    const contentsMatch = object.bodyText.match(/\/Contents\s+<([0-9A-Fa-f]+)>/s);
    if (!byteRange || !contentsMatch) {
      continue;
    }
    const fieldMatch = object.bodyText.match(/\/T\s+\((.*?)\)/);
    const subFilterMatch = object.bodyText.match(/\/SubFilter\s+\/([A-Za-z0-9_.-]+)/);
    const raw = Buffer.from(contentsMatch[1], "hex");
    signatures.push({
      byteRange,
      contents: trimDerPadding(raw),
      fieldName: fieldMatch?.[1],
      kind: subFilterMatch?.[1] === "ETSI.RFC3161" || object.bodyText.includes("/Type /DocTimeStamp")
        ? "timestamp"
        : "signature",
      objectNumber: object.objectNumber,
      subFilter: subFilterMatch?.[1] ?? "",
    });
  }

  return signatures;
}

function buildValidationResult(
  checks: PdfValidationCheck[],
  findings: PdfQualityFinding[],
  scan: ScannedPdfDocument,
  complianceLevel: PdfComplianceLevel,
  signatureCount?: number,
): PdfValidationSummary {
  const severityRank = findings.reduce((rank, finding) => (
    finding.severity === "error" ? 2 : finding.severity === "warning" && rank < 1 ? 1 : rank
  ), 0);
  const verdict = severityRank >= 2 ? "errors" : severityRank === 1 ? "warnings" : "clean";

  return {
    checks,
    complianceLevel,
    findings,
    fontCount: scan.objects.filter((object) => object.bodyText.includes("/Type /Font")).length,
    imageCount: scan.objects.filter((object) => object.bodyText.includes("/Subtype /Image")).length,
    pageCount: scan.objects.filter((object) => /\/Type \/Page\b/.test(object.bodyText) && !/\/Type \/Pages\b/.test(object.bodyText)).length,
    signatureCount: signatureCount ?? extractPdfSignatures(scan.buffer).length,
    verdict,
  };
}

function pushFinding(
  findings: PdfQualityFinding[],
  finding: PdfQualityFinding,
): void {
  findings.push(finding);
}

function inflateStreamIfNeeded(object: ScannedPdfObject): string | undefined {
  if (!object.streamData) {
    return undefined;
  }
  if (!object.bodyText.includes("/Filter /FlateDecode")) {
    return undefined;
  }
  try {
    return Buffer.from(inflate(object.streamData)).toString("utf8");
  } catch {
    return undefined;
  }
}

function buildSignedContent(buffer: Buffer, byteRange: [number, number, number, number]): Buffer {
  return Buffer.concat([
    buffer.subarray(byteRange[0], byteRange[0] + byteRange[1]),
    buffer.subarray(byteRange[2], byteRange[2] + byteRange[3]),
  ]);
}

function verifyDetachedSignature(signature: PdfExtractedSignature, buffer: Buffer): boolean | undefined {
  if (!hasBinary("openssl")) {
    return undefined;
  }
  return withTempDir((directory) => {
    const contentPath = join(directory, "content.bin");
    const signaturePath = join(directory, "signature.der");
    writeFileSync(contentPath, buildSignedContent(buffer, signature.byteRange));
    writeFileSync(signaturePath, signature.contents);
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
        join(directory, "verified.bin"),
      ], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  });
}

function parseTimestampToken(signature: PdfExtractedSignature): boolean | undefined {
  if (!hasBinary("openssl")) {
    return undefined;
  }
  return withTempDir((directory) => {
    const tokenPath = join(directory, "timestamp.tsr");
    writeFileSync(tokenPath, signature.contents);
    try {
      execFileSync("openssl", [
        "ts",
        "-reply",
        "-in",
        tokenPath,
        "-token_in",
        "-text",
      ], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  });
}

function inspectSignatureState(
  buffer: Buffer,
  content: string,
  signatures: PdfExtractedSignature[],
): SignatureValidationState {
  const findings: PdfQualityFinding[] = [];
  const checks: PdfValidationCheck[] = [];
  const unsignedLevel = buildUnsignedComplianceLevel(content);
  const declaredDetached = content.includes("/SubFilter /adbe.pkcs7.detached");
  const declaredTimestamp = content.includes("/SubFilter /ETSI.RFC3161");
  const detached = signatures.filter((signature) => signature.kind === "signature");
  const timestamps = signatures.filter((signature) => signature.kind === "timestamp");

  let detachedValid = !declaredDetached;
  let timestampValid = !declaredTimestamp;

  if (declaredDetached && detached.length === 0) {
    findings.push({
      category: "signature",
      code: "SIGNATURE_MISSING",
      message: "The PDF declares a detached PKCS#7 signature but no extractable signature payload was found.",
      repairable: false,
      severity: "error",
    });
  } else if (declaredDetached) {
    const results = detached.map((signature) => verifyDetachedSignature(signature, buffer));
    detachedValid = results.every((result) => result === true);
    checks.push({
      id: "signature.detached",
      message: results.some((result) => result === undefined)
        ? "Detached signature verification was skipped because OpenSSL is unavailable."
        : detachedValid
          ? "Detached PKCS#7 signatures verified against their ByteRange content."
          : "One or more detached PKCS#7 signatures failed verification.",
      passed: detachedValid,
      severity: results.some((result) => result === undefined) ? "warning" : "error",
    });
    if (results.every((result) => result !== undefined) && !detachedValid) {
      findings.push({
        category: "signature",
        code: "SIGNATURE_INVALID",
        message: "Detached PKCS#7 signature verification failed for the current ByteRange content.",
        repairable: false,
        severity: "error",
      });
    }
  }

  if (declaredTimestamp && timestamps.length === 0) {
    findings.push({
      category: "signature",
      code: "TIMESTAMP_MISSING",
      message: "The PDF declares an RFC 3161 document timestamp but no extractable timestamp token was found.",
      repairable: false,
      severity: "error",
    });
  } else if (declaredTimestamp) {
    const results = timestamps.map((signature) => parseTimestampToken(signature));
    timestampValid = results.every((result) => result === true);
    checks.push({
      id: "signature.timestamp",
      message: results.some((result) => result === undefined)
        ? "Timestamp token parsing was skipped because OpenSSL is unavailable."
        : timestampValid
          ? "RFC 3161 timestamp tokens parsed successfully."
          : "One or more RFC 3161 timestamp tokens could not be parsed.",
      passed: timestampValid,
      severity: results.some((result) => result === undefined) ? "warning" : "error",
    });
    if (results.every((result) => result !== undefined) && !timestampValid) {
      findings.push({
        category: "signature",
        code: "TIMESTAMP_INVALID",
        message: "RFC 3161 timestamp token parsing failed.",
        repairable: false,
        severity: "error",
      });
    }
  }

  const complianceLevel = detachedValid
    ? declaredTimestamp && timestampValid
      ? "signed_timestamped"
      : declaredDetached
        ? "signed"
        : unsignedLevel
    : unsignedLevel;

  return {
    checks,
    complianceLevel,
    findings,
  };
}

export async function validatePdfBuffer(buffer: Buffer): Promise<PdfValidationSummary> {
  const scan = scanPdfBuffer(buffer);
  const findings: PdfQualityFinding[] = [];
  const checks: PdfValidationCheck[] = [];
  const content = asLatin1(buffer);
  const extractedSignatures = extractPdfSignatures(buffer);
  const signatureState = inspectSignatureState(buffer, content, extractedSignatures);
  const pageObjects = scan.objects.filter((object) => /\/Type \/Page\b/.test(object.bodyText) && !/\/Type \/Pages\b/.test(object.bodyText));
  const pagesTreeObject = scan.objects.find((object) => /\/Type \/Pages\b/.test(object.bodyText));
  const metadataObject = scan.objects.find((object) => object.bodyText.includes("/Subtype /XML") && object.bodyText.includes("/Type /Metadata"));

  findings.push(...signatureState.findings);
  checks.push(...signatureState.checks);

  if (!/%%EOF\s*$/.test(content)) {
    pushFinding(findings, {
      category: "xref",
      code: "EOF_MARKER_MISSING",
      message: "The PDF is missing a terminal %%EOF marker.",
      repairable: true,
      severity: "error",
    });
  }

  if (!scan.rootRef || !scan.objectMap.get(scan.rootRef) || !/\/Type \/Catalog\b/.test(scan.objectMap.get(scan.rootRef)?.bodyText ?? "")) {
    pushFinding(findings, {
      category: "pageTree",
      code: "ROOT_OBJECT_INVALID",
      message: "The PDF trailer root reference is missing or does not point to a catalog object.",
      objectNumber: scan.rootRef,
      repairable: false,
      severity: "error",
    });
  }

  if (scan.xrefEntries.size === 0) {
    pushFinding(findings, {
      category: "xref",
      code: "XREF_MISSING",
      message: "The PDF cross-reference table could not be parsed.",
      repairable: true,
      severity: "error",
    });
  } else {
    for (const object of scan.objects) {
      const declaredOffset = scan.xrefEntries.get(object.objectNumber);
      if (declaredOffset === undefined) {
        continue;
      }
      if (declaredOffset !== object.start) {
        pushFinding(findings, {
          category: "xref",
          code: "XREF_OFFSET_MISMATCH",
          message: `Object ${object.objectNumber} xref offset ${declaredOffset} does not match actual offset ${object.start}.`,
          metadata: {
            actualOffset: object.start,
            declaredOffset,
          },
          objectNumber: object.objectNumber,
          repairable: true,
          severity: "error",
        });
      } else if (declaredOffset === 0 && object.objectNumber !== 0) {
        pushFinding(findings, {
          category: "xref",
          code: "XREF_ENTRY_ZERO_OFFSET",
          message: `Object ${object.objectNumber} has a used xref entry with a zero offset.`,
          objectNumber: object.objectNumber,
          repairable: true,
          severity: "error",
        });
      }
    }
  }

  const seenObjectNumbers = new Set<number>();

  for (const object of scan.objects) {
    if (seenObjectNumbers.has(object.objectNumber)) {
      pushFinding(findings, {
        category: "operational",
        code: "OBJECT_NUMBER_REUSE",
        message: `Object number ${object.objectNumber} is reused by multiple indirect objects.`,
        objectNumber: object.objectNumber,
        repairable: true,
        severity: "error",
      });
    }
    seenObjectNumbers.add(object.objectNumber);

    if (object.streamData && object.dictionaryText) {
      const lengthMatch = object.dictionaryText.match(/\/Length\s+(\d+)/);
      if (lengthMatch) {
        const declaredLength = Number(lengthMatch[1]);
        const actualLength = object.streamData.length;
        if (declaredLength !== actualLength) {
          pushFinding(findings, {
            category: "stream",
            code: "STREAM_LENGTH_MISMATCH",
            message: `Stream object ${object.objectNumber} declares length ${declaredLength} but contains ${actualLength} bytes.`,
            metadata: { actualLength, declaredLength },
            objectNumber: object.objectNumber,
            repairable: true,
            severity: "error",
          });
        }
      }
    }

    if (object.refs.includes(object.objectNumber)) {
      pushFinding(findings, {
        category: "operational",
        code: "SELF_REFERENCE",
        message: `Object ${object.objectNumber} references itself.`,
        objectNumber: object.objectNumber,
        repairable: false,
        severity: "warning",
      });
    }
  }

  const declaredPageCount = pagesTreeObject?.bodyText.match(/\/Count\s+(\d+)/);
  if (declaredPageCount && Number(declaredPageCount[1]) !== pageObjects.length) {
    pushFinding(findings, {
      category: "pageTree",
      code: "PAGE_TREE_COUNT_MISMATCH",
      message: `Pages tree declares ${declaredPageCount[1]} pages but ${pageObjects.length} page objects were found.`,
      metadata: {
        actualPages: pageObjects.length,
        declaredPages: Number(declaredPageCount[1]),
      },
      objectNumber: pagesTreeObject?.objectNumber,
      repairable: true,
      severity: "error",
    });
  }

  for (const page of pageObjects) {
    const contentsMatch = page.bodyText.match(/\/Contents\s+(\d+)\s+(\d+)\s+R/);
    if (contentsMatch) {
      const contentObject = scan.objectMap.get(Number(contentsMatch[1]));
      const stream = contentObject ? inflateStreamIfNeeded(contentObject) : undefined;
      if (stream) {
        const mcids = [...stream.matchAll(/\/MCID\s+(\d+)/g)].map((entry) => Number(entry[1]));
        if (mcids.length > 0) {
          const maxMcid = Math.max(...mcids);
          const mcidSet = new Set(mcids);
          for (let expected = 0; expected <= maxMcid; expected += 1) {
            if (!mcidSet.has(expected)) {
              pushFinding(findings, {
                category: "tagging",
                code: "MCID_GAP",
                message: `Page content stream ${contentObject?.objectNumber} is missing MCID ${expected}.`,
                objectNumber: contentObject?.objectNumber,
                repairable: false,
                severity: "warning",
              });
              break;
            }
          }
        }
      }
    }

    const fontSection = page.bodyText.match(/\/Font\s*<<([\s\S]*?)>>/);
    for (const refMatch of fontSection?.[1].matchAll(/(\d+)\s+(\d+)\s+R/g) ?? []) {
      const ref = Number(refMatch[1]);
      const fontObject = scan.objectMap.get(ref);
      if (!fontObject) {
        pushFinding(findings, {
          category: "font",
          code: "FONT_REFERENCE_MISSING",
          message: `Page ${page.objectNumber} references missing font object ${ref}.`,
          metadata: { referencedFont: ref },
          objectNumber: page.objectNumber,
          repairable: false,
          severity: "error",
        });
        continue;
      }
      const isBuiltInFont = /\/Subtype \/Type1/.test(fontObject.bodyText) && /\/BaseFont \/(Helvetica|Times-Roman|Courier)/.test(fontObject.bodyText);
      const isEmbeddedFont = fontObject.bodyText.includes("/DescendantFonts")
        || fontObject.bodyText.includes("/FontFile2")
        || fontObject.bodyText.includes("/FontFile3");
      const isSubsetFont = /\/BaseFont \/([A-Z]{6}\+[^/\s]+)/.test(fontObject.bodyText);
      if (isSubsetFont && !isEmbeddedFont) {
        pushFinding(findings, {
          category: "font",
          code: "FONT_SUBSET_INCOMPLETE",
          message: `Subset font object ${ref} is referenced without embedded subset data.`,
          metadata: { referencedFont: ref },
          objectNumber: ref,
          repairable: false,
          severity: "warning",
        });
      } else if (!isBuiltInFont && !isEmbeddedFont) {
        pushFinding(findings, {
          category: "font",
          code: "FONT_NOT_EMBEDDED",
          message: `Font object ${ref} is referenced but does not appear to be embedded.`,
          metadata: { referencedFont: ref },
          objectNumber: ref,
          repairable: false,
          severity: "warning",
        });
      }
    }

    const xObjectSection = page.bodyText.match(/\/XObject\s*<<([\s\S]*?)>>/);
    for (const refMatch of xObjectSection?.[1].matchAll(/(\d+)\s+(\d+)\s+R/g) ?? []) {
      const ref = Number(refMatch[1]);
      const xObject = scan.objectMap.get(ref);
      if (!xObject) {
        pushFinding(findings, {
          category: "image",
          code: "IMAGE_REFERENCE_MISSING",
          message: `Page ${page.objectNumber} references missing XObject ${ref}.`,
          metadata: { referencedXObject: ref },
          objectNumber: page.objectNumber,
          repairable: false,
          severity: "error",
        });
        continue;
      }
      if (!/\/Subtype \/(Image|Form)\b/.test(xObject.bodyText)) {
        pushFinding(findings, {
          category: "image",
          code: "IMAGE_REFERENCE_MISSING",
          message: `XObject ${ref} is referenced from page ${page.objectNumber} but is not an image or form XObject.`,
          metadata: { referencedXObject: ref },
          objectNumber: ref,
          repairable: false,
          severity: "warning",
        });
      }
    }
  }

  if (scan.infoRef || metadataObject) {
    const infoTitle = extractTitleFromInfo(scan.infoRef ? scan.objectMap.get(scan.infoRef) : undefined);
    const metadataTitle = extractTitleFromMetadata(metadataObject);
    if (infoTitle && metadataTitle && infoTitle !== metadataTitle) {
      pushFinding(findings, {
        category: "metadata",
        code: "INFO_XMP_MISMATCH",
        message: `Info dictionary title "${infoTitle}" does not match XMP title "${metadataTitle}".`,
        repairable: true,
        severity: "warning",
      });
    }
  }

  checks.push(
    {
      id: "xref.integrity",
      message: scan.xrefEntries.size === 0 ? "Cross-reference table is missing or unreadable." : "Cross-reference offsets resolved.",
      passed: !findings.some((finding) =>
        finding.code === "XREF_MISSING"
        || finding.code === "XREF_OFFSET_MISMATCH"
        || finding.code === "XREF_ENTRY_ZERO_OFFSET"
        || finding.code === "EOF_MARKER_MISSING"
      ),
      severity: "error",
    },
    {
      id: "stream.lengths",
      message: findings.some((finding) => finding.code === "STREAM_LENGTH_MISMATCH")
        ? "At least one stream length is incorrect."
        : "All direct stream lengths match.",
      passed: !findings.some((finding) => finding.code === "STREAM_LENGTH_MISMATCH"),
      severity: "error",
    },
    {
      id: "pageTree.count",
      message: findings.some((finding) => finding.code === "PAGE_TREE_COUNT_MISMATCH")
        ? "Pages tree count does not match the discovered page objects."
        : "Pages tree count matches discovered page objects.",
      passed: !findings.some((finding) => finding.code === "PAGE_TREE_COUNT_MISMATCH"),
      severity: "error",
    },
    {
      id: "resource.references",
      message: findings.some((finding) => finding.code === "FONT_REFERENCE_MISSING" || finding.code === "IMAGE_REFERENCE_MISSING")
        ? "One or more font or XObject references are unresolved."
        : "Font and XObject references resolve cleanly.",
      passed: !findings.some((finding) => finding.code === "FONT_REFERENCE_MISSING" || finding.code === "IMAGE_REFERENCE_MISSING"),
      severity: "error",
    },
    {
      id: "catalog.root",
      message: findings.some((finding) => finding.code === "ROOT_OBJECT_INVALID")
        ? "Trailer root is missing or invalid."
        : "Trailer root resolves to a catalog object.",
      passed: !findings.some((finding) => finding.code === "ROOT_OBJECT_INVALID"),
      severity: "error",
    },
    {
      id: "tagging.mcids",
      message: findings.some((finding) => finding.code === "MCID_GAP")
        ? "Tagged page content includes MCID gaps."
        : "Tagged page content uses contiguous MCIDs.",
      passed: !findings.some((finding) => finding.code === "MCID_GAP"),
      severity: "warning",
    },
    {
      id: "metadata.sync",
      message: findings.some((finding) => finding.code === "INFO_XMP_MISMATCH")
        ? "Info dictionary metadata diverges from XMP metadata."
        : "Info dictionary and XMP metadata are aligned.",
      passed: !findings.some((finding) => finding.code === "INFO_XMP_MISMATCH"),
      severity: "warning",
    },
  );

  return buildValidationResult(
    checks,
    findings,
    scan,
    signatureState.complianceLevel,
    extractedSignatures.length,
  );
}
