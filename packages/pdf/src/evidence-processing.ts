import { createHash } from "node:crypto";
import { inflate } from "pako";
import { PdfEngine } from "./engine.js";
import { inspectExistingPdfForm, type PdfFormInspection } from "./pdf-form-fill.js";
import {
  extractPdfSignatures,
  scanPdfBuffer,
  validatePdfBuffer,
  type ScannedPdfDocument,
  type ScannedPdfObject,
} from "./phase10-validate.js";

type EvidenceJsonValue = string | number | boolean | null | EvidenceJsonValue[] | { [key: string]: EvidenceJsonValue };

interface EvidenceDiagnostic {
  code: string;
  message: string;
  locator?: PdfEvidenceLocator;
}

interface EvidenceExtensionResult {
  artifacts: Array<{ byteLength: number; mediaType: string; name: string; sha256: string }>;
  losses: EvidenceDiagnostic[];
  output?: EvidenceJsonValue;
  status: "error" | "ok";
  warnings: EvidenceDiagnostic[];
  error?: { code: string; message: string; retryable: boolean };
}

interface EvidenceExtensionContext {
  budget: { maxEntries: number; maxInputBytes: number };
  checkpoint(usage: { entries?: number; inputBytes?: number }): void;
  reportProgress(update: { completed: number; message?: string; total: number }): void;
  signal: AbortSignal;
}

export interface PdfEvidenceExtensionDefinition {
  manifest: {
    catalogItemId: "A03";
    id: string;
    lossCodes: Array<{ code: string; description: string }>;
    operations: Array<{ inputKinds: string[]; name: string; outputKinds: string[]; summary: string }>;
    schemaVersion: 1;
    title: string;
    version: string;
    warningCodes: Array<{ code: string; description: string }>;
  };
  execute(request: { input: EvidenceJsonValue; operation: string }, context: EvidenceExtensionContext): Promise<EvidenceExtensionResult>;
}

export type PdfEvidenceLossCode =
  | "PDF_ANNOTATIONS_STRIPPED"
  | "PDF_ATTACHMENTS_STRIPPED"
  | "PDF_FORM_INTERACTIVITY_STRIPPED"
  | "PDF_GEOMETRY_APPROXIMATED"
  | "PDF_GRAPHICS_NOT_PRESERVED"
  | "PDF_METADATA_STRIPPED"
  | "PDF_OCR_REQUIRED"
  | "PDF_SIGNATURE_INVALIDATED"
  | "PDF_TEXT_UNDECODABLE";

export interface PdfEvidenceLoss {
  code: PdfEvidenceLossCode;
  message: string;
  locator?: PdfEvidenceLocator;
}

export interface PdfEvidenceLocator {
  artifactId: string;
  scheme: "pdf.page" | "pdf.text" | "pdf.table";
  value: Array<string | number>;
}

export interface PdfEvidenceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfEvidenceTextRun {
  confidence: number;
  fontSize: number;
  locator: PdfEvidenceLocator;
  order: number;
  pageIndex: number;
  rect: PdfEvidenceRect;
  source: "native" | "ocr";
  text: string;
}

export interface PdfEvidenceTable {
  locator: PdfEvidenceLocator;
  pageIndex: number;
  rows: Array<{ cells: PdfEvidenceTextRun[] }>;
}

export interface PdfEvidencePage {
  height: number;
  imageCount: number;
  index: number;
  locator: PdfEvidenceLocator;
  nativeTextRunCount: number;
  ocrRoute: "mixed" | "native" | "scanned";
  width: number;
}

export interface PdfEvidenceInspection {
  annotations: Array<{ objectNumber: number; subtype: string }>;
  artifactId: string;
  attachments: Array<{ objectNumber: number; name?: string }>;
  byteLength: number;
  form: PdfFormInspection;
  hasJavaScript: boolean;
  isEncrypted: boolean;
  metadata: Record<string, string>;
  objectCount: number;
  pages: PdfEvidencePage[];
  signatures: Array<{ fieldName?: string; kind: "signature" | "timestamp"; objectNumber: number; subFilter: string }>;
  version: string;
}

export interface PdfEvidenceExtraction {
  inspection: PdfEvidenceInspection;
  losses: PdfEvidenceLoss[];
  tables: PdfEvidenceTable[];
  textRuns: PdfEvidenceTextRun[];
}

export interface PdfEvidenceMatch {
  end: number;
  locator: PdfEvidenceLocator;
  matchedText: string;
  rect: PdfEvidenceRect;
  start: number;
}

export interface PdfEvidenceRedactionPreview {
  matches: PdfEvidenceMatch[];
  rectangles: Array<{ locator: PdfEvidenceLocator; pageIndex: number; rect: PdfEvidenceRect }>;
}

export interface PdfEvidenceRedaction {
  buffer: Buffer;
  losses: PdfEvidenceLoss[];
  redacted: PdfEvidenceMatch[];
  sha256: string;
}

export interface PdfEvidenceExport {
  buffer: Buffer;
  byteLength: number;
  mediaType: "application/pdf";
  sha256: string;
}

export interface PdfEvidenceResidual {
  channel: "bytes" | "parser" | "text";
  query: string;
}

export interface PdfEvidenceVerification {
  parserVerdict: "clean" | "errors" | "warnings";
  residuals: PdfEvidenceResidual[];
  status: "FAIL" | "PASS";
}

export interface PdfEvidenceBudget {
  maxDecodedStreamBytes?: number;
  maxInputBytes?: number;
  maxObjects?: number;
  maxPages?: number;
  maxTextRuns?: number;
  signal?: AbortSignal;
}

export interface PdfOcrAdapterContext {
  artifactId: string;
  page: PdfEvidencePage;
  signal: AbortSignal;
}

export interface PdfOcrAdapterResult {
  confidence: number;
  runs: Array<{ confidence?: number; rect: PdfEvidenceRect; text: string }>;
}

export interface PdfOcrAdapter {
  readonly id: string;
  recognize(pdf: Buffer, context: PdfOcrAdapterContext): Promise<PdfOcrAdapterResult>;
}

export interface PdfOcrRoute {
  extraction: PdfEvidenceExtraction;
  pages: Array<{ pageIndex: number; route: "mixed" | "native" | "scanned"; reviewed: boolean }>;
}

const DEFAULTS = {
  maxDecodedStreamBytes: 8 * 1024 * 1024,
  maxInputBytes: 32 * 1024 * 1024,
  maxObjects: 5_000,
  maxPages: 2_000,
  maxTextRuns: 250_000,
} as const;

export class PdfEvidenceError extends Error {
  readonly code:
    | "PDF_ABORTED"
    | "PDF_ACTIVE_CONTENT_REJECTED"
    | "PDF_MALFORMED"
    | "PDF_PROTECTED"
    | "PDF_RESOURCE_LIMIT"
    | "PDF_UNSUPPORTED";
  readonly details?: Record<string, boolean | number | string>;

  constructor(code: PdfEvidenceError["code"], message: string, details?: Record<string, boolean | number | string>) {
    super(message);
    this.name = "PdfEvidenceError";
    this.code = code;
    this.details = details;
  }
}

function budgetValue<K extends keyof typeof DEFAULTS>(budget: PdfEvidenceBudget | undefined, key: K): number {
  return budget?.[key] ?? DEFAULTS[key];
}

function checkpoint(budget?: PdfEvidenceBudget): void {
  if (budget?.signal?.aborted) {
    throw new PdfEvidenceError("PDF_ABORTED", typeof budget.signal.reason === "string" ? budget.signal.reason : "PDF evidence processing was aborted.");
  }
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function assertInput(input: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Buffer {
  checkpoint(budget);
  const buffer = Buffer.from(input);
  const maxInputBytes = budgetValue(budget, "maxInputBytes");
  if (buffer.length > maxInputBytes) {
    throw new PdfEvidenceError("PDF_RESOURCE_LIMIT", `PDF input is ${buffer.length} bytes; limit is ${maxInputBytes}.`, { actual: buffer.length, limit: maxInputBytes });
  }
  if (!buffer.subarray(0, 8).toString("ascii").startsWith("%PDF-")) {
    throw new PdfEvidenceError("PDF_MALFORMED", "Input does not begin with a PDF header.");
  }
  if (!/%%EOF\s*$/.test(buffer.toString("latin1"))) {
    throw new PdfEvidenceError("PDF_MALFORMED", "Input is missing a terminal PDF EOF marker.");
  }
  return buffer;
}

function literalString(text: string, start: number): { end: number; value: string } | undefined {
  if (text[start] !== "(") return undefined;
  const bytes: number[] = [];
  let depth = 1;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === "\\") {
      const next = text[index + 1];
      if (next === undefined) break;
      const escaped: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12, "(": 40, ")": 41, "\\": 92 };
      if (escaped[next] !== undefined) {
        bytes.push(escaped[next] as number);
        index += 1;
        continue;
      }
      if (/[0-7]/.test(next)) {
        const octal = text.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? "0";
        bytes.push(Number.parseInt(octal, 8));
        index += octal.length;
        continue;
      }
      if (next === "\n") {
        index += 1;
        continue;
      }
      bytes.push(next.charCodeAt(0) & 0xff);
      index += 1;
      continue;
    }
    if (char === "(") {
      depth += 1;
      bytes.push(40);
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return { end: index + 1, value: Buffer.from(bytes).toString("latin1") };
      bytes.push(41);
      continue;
    }
    bytes.push(char.charCodeAt(0) & 0xff);
  }
  return undefined;
}

function decodeHexString(hex: string): string {
  const compact = hex.replace(/\s/g, "");
  const bytes = Buffer.from(compact.length % 2 === 0 ? compact : `${compact}0`, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let result = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) result += String.fromCharCode(bytes.readUInt16BE(index));
    return result;
  }
  return bytes.toString("latin1");
}

function dictionaryString(text: string, key: string): string | undefined {
  const marker = `/${key}`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return undefined;
  let cursor = markerIndex + marker.length;
  while (/\s/.test(text[cursor] ?? "")) cursor += 1;
  const literal = literalString(text, cursor);
  if (literal) return literal.value;
  if (text[cursor] === "<" && text[cursor + 1] !== "<") {
    const end = text.indexOf(">", cursor + 1);
    if (end > cursor) return decodeHexString(text.slice(cursor + 1, end));
  }
  return undefined;
}

function numberArray(text: string, key: string): number[] | undefined {
  const match = text.match(new RegExp(`/${key}\\s*\\[([^\\]]+)\\]`));
  if (!match) return undefined;
  const values = match[1]?.trim().split(/\s+/).map(Number);
  return values?.every(Number.isFinite) ? values : undefined;
}

function pageObjects(scan: ScannedPdfDocument): ScannedPdfObject[] {
  const fallback = scan.objects.filter((object) => /\/Type\s*\/Page\b/.test(object.bodyText) && !/\/Type\s*\/Pages\b/.test(object.bodyText));
  const root = scan.rootRef ? scan.objectMap.get(scan.rootRef) : undefined;
  const pagesRoot = root?.bodyText.match(/\/Pages\s+(\d+)\s+\d+\s+R/)?.[1];
  if (!pagesRoot) return fallback;
  const ordered: ScannedPdfObject[] = [];
  const seen = new Set<number>();
  const visit = (objectNumber: number, depth: number): void => {
    if (depth > 80 || seen.has(objectNumber)) return;
    seen.add(objectNumber);
    const object = scan.objectMap.get(objectNumber);
    if (!object) return;
    if (/\/Type\s*\/Page\b/.test(object.bodyText) && !/\/Type\s*\/Pages\b/.test(object.bodyText)) {
      ordered.push(object);
      return;
    }
    const kids = object.bodyText.match(/\/Kids\s*\[([^\]]+)\]/s)?.[1] ?? "";
    for (const reference of kids.matchAll(/(\d+)\s+\d+\s+R/g)) visit(Number(reference[1]), depth + 1);
  };
  visit(Number(pagesRoot), 0);
  return ordered.length > 0 ? ordered : fallback;
}

function inheritedNumberArray(scan: ScannedPdfDocument, object: ScannedPdfObject, key: string): number[] | undefined {
  let current: ScannedPdfObject | undefined = object;
  const seen = new Set<number>();
  while (current && !seen.has(current.objectNumber) && seen.size < 80) {
    seen.add(current.objectNumber);
    const value = numberArray(current.bodyText, key);
    if (value) return value;
    const parentReference: string | undefined = current.bodyText.match(/\/Parent\s+(\d+)\s+\d+\s+R/)?.[1];
    current = parentReference ? scan.objectMap.get(Number(parentReference)) : undefined;
  }
  return undefined;
}

function contentRefs(page: ScannedPdfObject): number[] {
  const match = page.bodyText.match(/\/Contents\s*(?:\[([^\]]+)\]|(\d+)\s+\d+\s+R)/s);
  if (!match) return [];
  if (match[2]) return [Number(match[2])];
  return Array.from((match[1] ?? "").matchAll(/(\d+)\s+\d+\s+R/g), (entry) => Number(entry[1]));
}

function reachableObjects(scan: ScannedPdfDocument, roots: number[], maxDepth = 3): ScannedPdfObject[] {
  const output: ScannedPdfObject[] = [];
  const seen = new Set<number>();
  const frontier = roots.map((number) => ({ depth: 0, number }));
  while (frontier.length > 0) {
    const current = frontier.shift() as { depth: number; number: number };
    if (seen.has(current.number) || current.depth > maxDepth) continue;
    seen.add(current.number);
    const object = scan.objectMap.get(current.number);
    if (!object) continue;
    output.push(object);
    frontier.push(...object.refs.map((number) => ({ depth: current.depth + 1, number })));
  }
  return output;
}

function decodeStream(object: ScannedPdfObject, budget?: PdfEvidenceBudget): Buffer | undefined {
  if (!object.streamData) return undefined;
  checkpoint(budget);
  let decoded: Buffer;
  if (!object.dictionaryText?.includes("/Filter")) decoded = object.streamData;
  else if (/\/Filter\s*\/FlateDecode\b/.test(object.dictionaryText)) {
    try {
      decoded = Buffer.from(inflate(object.streamData));
    } catch {
      throw new PdfEvidenceError("PDF_MALFORMED", `Flate stream ${object.objectNumber} could not be decoded.`, { objectNumber: object.objectNumber });
    }
  } else return undefined;
  const limit = budgetValue(budget, "maxDecodedStreamBytes");
  if (decoded.length > limit) {
    throw new PdfEvidenceError("PDF_RESOURCE_LIMIT", `Decoded stream ${object.objectNumber} exceeds ${limit} bytes.`, { actual: decoded.length, limit, objectNumber: object.objectNumber });
  }
  return decoded;
}

function normalized(value: number, extent: number): number {
  return Math.max(0, Math.min(1_000_000, Math.round((value / Math.max(1, extent)) * 1_000_000)));
}

function textLocator(artifactId: string, pageIndex: number, order: number, rect: PdfEvidenceRect, width: number, height: number): PdfEvidenceLocator {
  return {
    artifactId,
    scheme: "pdf.text",
    value: [pageIndex, normalized(rect.x, width), normalized(rect.y, height), normalized(rect.width, width), normalized(rect.height, height), order],
  };
}

function parseCmap(content: string): Map<string, string> {
  const output = new Map<string, string>();
  const bfchar = content.match(/beginbfchar([\s\S]*?)endbfchar/)?.[1] ?? "";
  for (const match of bfchar.matchAll(/<([0-9A-Fa-f]+)>[ \t]*<([0-9A-Fa-f]+)>/g)) {
    const source = match[1]?.toUpperCase();
    const target = match[2];
    if (source && target) {
      const bytes = Buffer.from(target, "hex");
      let decoded = "";
      for (let index = 0; index + 1 < bytes.length; index += 2) decoded += String.fromCharCode(bytes.readUInt16BE(index));
      output.set(source, decoded || bytes.toString("latin1"));
    }
  }
  const bfrange = content.match(/beginbfrange([\s\S]*?)endbfrange/)?.[1] ?? "";
  for (const match of bfrange.matchAll(/<([0-9A-Fa-f]+)>[ \t]*<([0-9A-Fa-f]+)>[ \t]*<([0-9A-Fa-f]+)>/g)) {
    const start = Number.parseInt(match[1] ?? "", 16);
    const end = Number.parseInt(match[2] ?? "", 16);
    const target = Number.parseInt(match[3] ?? "", 16);
    const width = match[1]?.length ?? 4;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start > 4_096) continue;
    for (let value = start; value <= end; value += 1) output.set(value.toString(16).toUpperCase().padStart(width, "0"), String.fromCodePoint(target + value - start));
  }
  return output;
}

function pageFontMaps(scan: ScannedPdfDocument, page: ScannedPdfObject, budget?: PdfEvidenceBudget): Map<string, Map<string, string>> {
  const output = new Map<string, Map<string, string>>();
  const dictionaries: string[] = [];
  let current: ScannedPdfObject | undefined = page;
  const seen = new Set<number>();
  while (current && !seen.has(current.objectNumber) && seen.size < 80) {
    seen.add(current.objectNumber);
    dictionaries.push(current.bodyText);
    const parentReference: string | undefined = current.bodyText.match(/\/Parent\s+(\d+)\s+\d+\s+R/)?.[1];
    current = parentReference ? scan.objectMap.get(Number(parentReference)) : undefined;
  }
  for (const match of dictionaries.join("\n").matchAll(/\/([A-Za-z][A-Za-z0-9_.-]*)\s+(\d+)\s+\d+\s+R/g)) {
    const alias = match[1];
    const font = scan.objectMap.get(Number(match[2]));
    const cmapRef = font?.bodyText.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/)?.[1];
    const cmap = cmapRef ? scan.objectMap.get(Number(cmapRef)) : undefined;
    const decoded = cmap ? decodeStream(cmap, budget) : undefined;
    if (alias && decoded) output.set(alias, parseCmap(decoded.toString("latin1")));
  }
  return output;
}

function decodeGlyphs(hex: string, cmap: Map<string, string> | undefined): string | undefined {
  if (!cmap || cmap.size === 0) return undefined;
  const compact = hex.replace(/\s/g, "").toUpperCase();
  const widths: number[] = Array.from(new Set(Array.from(cmap.keys(), (key) => key.length))).sort((left, right) => right - left);
  let cursor = 0;
  let output = "";
  while (cursor < compact.length) {
    const width = widths.find((candidate) => cmap.has(compact.slice(cursor, cursor + candidate)));
    if (!width) return undefined;
    output += cmap.get(compact.slice(cursor, cursor + width)) as string;
    cursor += width;
  }
  return output;
}

function parseTextRuns(content: string, artifactId: string, pageIndex: number, width: number, height: number, startOrder: number, fontMaps: Map<string, Map<string, string>>): PdfEvidenceTextRun[] {
  const runs: PdfEvidenceTextRun[] = [];
  const blocks = Array.from(content.matchAll(/BT\s*([\s\S]*?)\s*ET/g));
  for (const block of blocks) {
    const body = block[1] ?? "";
    const blockStart = block.index ?? 0;
    const prefix = content.slice(Math.max(0, blockStart - 1_024), blockStart);
    const actualMarker = prefix.lastIndexOf("/ActualText");
    const lastBdc = prefix.lastIndexOf("BDC");
    const lastEmc = prefix.lastIndexOf("EMC");
    let text: string | undefined;
    if (actualMarker >= 0 && lastBdc > actualMarker && lastEmc < lastBdc) {
      let cursor = actualMarker + "/ActualText".length;
      while (/\s/.test(prefix[cursor] ?? "")) cursor += 1;
      const literal = literalString(prefix, cursor);
      if (literal) text = literal.value;
      else if (prefix[cursor] === "<") {
        const end = prefix.indexOf(">", cursor + 1);
        if (end > cursor) text = decodeHexString(prefix.slice(cursor + 1, end));
      }
    }
    if (text === undefined) {
      const literalOperator = body.match(/(\((?:\\.|[^\\)])*\))\s*Tj\b/s);
      if (literalOperator?.index !== undefined) text = literalString(body, literalOperator.index)?.value;
    }
    if (text === undefined) {
      const alias = body.match(/\/([^\s]+)\s+-?\d+(?:\.\d+)?\s+Tf\b/)?.[1];
      const cmap = alias ? fontMaps.get(alias) : undefined;
      const glyphs: string[] = [];
      for (const glyph of body.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj\b/g)) {
        const decoded = decodeGlyphs(glyph[1] ?? "", cmap);
        if (decoded === undefined) {
          glyphs.length = 0;
          break;
        }
        glyphs.push(decoded);
      }
      if (glyphs.length > 0) text = glyphs.join("");
    }
    if (text === undefined) continue;
    const transform = Array.from(body.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm\b/g)).at(-1);
    const font = Array.from(body.matchAll(/\/[^\s]+\s+(-?\d+(?:\.\d+)?)\s+Tf\b/g)).at(-1);
    const fontSize = Math.max(1, Number(font?.[1] ?? 12));
    const x = Number(transform?.[5] ?? 0);
    const y = Number(transform?.[6] ?? height - 72);
    const rect = { x, y: Math.max(0, y - fontSize * 0.2), width: Math.max(fontSize * 0.5, text.length * fontSize * 0.5), height: fontSize };
    const order = startOrder + runs.length;
    runs.push({ confidence: 1, fontSize, locator: textLocator(artifactId, pageIndex, order, rect, width, height), order, pageIndex, rect, source: "native", text });
  }
  return runs;
}

function emptyForm(): PdfFormInspection {
  return { fields: [], hasSignatures: false, hasXfa: false, isEncrypted: false, unsupported: [] };
}

function inspectFormSafely(buffer: Buffer, content: string): PdfFormInspection {
  if (!content.includes("/AcroForm")) return emptyForm();
  try {
    return inspectExistingPdfForm(buffer);
  } catch (error) {
    return { ...emptyForm(), unsupported: [`AcroForm inspection failed safely: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

function scanInventory(buffer: Buffer, scan: ScannedPdfDocument, artifactId: string): Omit<PdfEvidenceInspection, "pages"> {
  const content = buffer.toString("latin1");
  const annotations = scan.objects.flatMap((object) => {
    const subtype = object.bodyText.match(/\/Subtype\s*\/([A-Za-z0-9_.-]+)/)?.[1];
    return subtype && (object.bodyText.includes("/Type /Annot") || object.bodyText.includes("/Rect")) ? [{ objectNumber: object.objectNumber, subtype }] : [];
  });
  const attachments = scan.objects.flatMap((object) => {
    if (!/\/Type\s*\/EmbeddedFile\b|\/Type\s*\/Filespec\b/.test(object.bodyText)) return [];
    return [{ objectNumber: object.objectNumber, name: dictionaryString(object.bodyText, "F") }];
  });
  const info = scan.infoRef ? scan.objectMap.get(scan.infoRef)?.bodyText ?? "" : "";
  const metadata: Record<string, string> = {};
  for (const key of ["Author", "CreationDate", "Creator", "Keywords", "ModDate", "Producer", "Subject", "Title"]) {
    const value = dictionaryString(info, key);
    if (value !== undefined) metadata[key] = value;
  }
  return {
    annotations,
    artifactId,
    attachments,
    byteLength: buffer.length,
    form: inspectFormSafely(buffer, content),
    hasJavaScript: /\/(?:JavaScript|JS)\b/.test(content),
    isEncrypted: /\/Encrypt\b/.test(scan.trailerText ?? content.slice(Math.max(0, content.length - 8_192))),
    metadata,
    objectCount: scan.objects.length,
    signatures: extractPdfSignatures(buffer).map(({ fieldName, kind, objectNumber, subFilter }) => ({ fieldName, kind, objectNumber: objectNumber ?? 0, subFilter })),
    version: scan.headerVersion,
  };
}

async function prepare(input: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<{ buffer: Buffer; inventory: Omit<PdfEvidenceInspection, "pages">; pageScans: Array<{ height: number; imageCount: number; object: ScannedPdfObject; streams: Array<{ decoded?: Buffer; object: ScannedPdfObject }>; width: number }>; scan: ScannedPdfDocument }> {
  const buffer = assertInput(input, budget);
  const scan = scanPdfBuffer(buffer);
  const objectLimit = budgetValue(budget, "maxObjects");
  if (scan.objects.length > objectLimit) throw new PdfEvidenceError("PDF_RESOURCE_LIMIT", `PDF object count ${scan.objects.length} exceeds ${objectLimit}.`, { actual: scan.objects.length, limit: objectLimit });
  const pages = pageObjects(scan);
  const pageLimit = budgetValue(budget, "maxPages");
  if (pages.length === 0 || pages.length > pageLimit) throw new PdfEvidenceError(pages.length === 0 ? "PDF_MALFORMED" : "PDF_RESOURCE_LIMIT", pages.length === 0 ? "PDF contains no page objects." : `PDF page count ${pages.length} exceeds ${pageLimit}.`, { actual: pages.length, limit: pageLimit });
  const inventory = scanInventory(buffer, scan, sha256(buffer));
  if (inventory.isEncrypted) throw new PdfEvidenceError("PDF_PROTECTED", "Encrypted/protected PDFs are rejected; this API never attempts decryption.");
  if (inventory.hasJavaScript) throw new PdfEvidenceError("PDF_ACTIVE_CONTENT_REJECTED", "PDF JavaScript or active JS actions are rejected and never executed.");
  const validation = await validatePdfBuffer(buffer);
  if (validation.verdict === "errors") {
    throw new PdfEvidenceError("PDF_MALFORMED", "PDF parser validation reported structural errors.", { findings: validation.findings.length });
  }
  const pageScans = pages.map((object) => {
    checkpoint(budget);
    const mediaBox = inheritedNumberArray(scan, object, "MediaBox") ?? [0, 0, 612, 792];
    const width = Math.max(1, (mediaBox[2] ?? 612) - (mediaBox[0] ?? 0));
    const height = Math.max(1, (mediaBox[3] ?? 792) - (mediaBox[1] ?? 0));
    const streams = contentRefs(object).map((reference) => scan.objectMap.get(reference)).filter((entry): entry is ScannedPdfObject => Boolean(entry)).map((entry) => ({ decoded: decodeStream(entry, budget), object: entry }));
    const reachable = reachableObjects(scan, object.refs);
    const imageCount = reachable.filter((entry) => /\/Subtype\s*\/Image\b/.test(entry.bodyText)).length;
    return { height, imageCount, object, streams, width };
  });
  return { buffer, inventory, pageScans, scan };
}

export async function extractPdfEvidence(input: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<PdfEvidenceExtraction> {
  const prepared = await prepare(input, budget);
  const textRuns: PdfEvidenceTextRun[] = [];
  const losses: PdfEvidenceLoss[] = [];
  const pages: PdfEvidencePage[] = [];
  for (let pageIndex = 0; pageIndex < prepared.pageScans.length; pageIndex += 1) {
    checkpoint(budget);
    const page = prepared.pageScans[pageIndex] as (typeof prepared.pageScans)[number];
    const before = textRuns.length;
    for (const stream of page.streams) {
      if (!stream.decoded) {
        losses.push({ code: "PDF_TEXT_UNDECODABLE", message: `Page ${pageIndex + 1} content stream ${stream.object.objectNumber} uses an unsupported filter.`, locator: { artifactId: prepared.inventory.artifactId, scheme: "pdf.page", value: [pageIndex] } });
        continue;
      }
      textRuns.push(...parseTextRuns(stream.decoded.toString("latin1"), prepared.inventory.artifactId, pageIndex, page.width, page.height, textRuns.length, pageFontMaps(prepared.scan, page.object, budget)));
      if (textRuns.length > budgetValue(budget, "maxTextRuns")) throw new PdfEvidenceError("PDF_RESOURCE_LIMIT", `Extracted text run count exceeds ${budgetValue(budget, "maxTextRuns")}.`);
    }
    const nativeTextRunCount = textRuns.length - before;
    const ocrRoute = nativeTextRunCount > 0 ? page.imageCount > 0 ? "mixed" : "native" : "scanned";
    if (ocrRoute !== "native") losses.push({ code: "PDF_OCR_REQUIRED", message: `Page ${pageIndex + 1} is ${ocrRoute} and requires caller-supplied OCR for complete text coverage.`, locator: { artifactId: prepared.inventory.artifactId, scheme: "pdf.page", value: [pageIndex] } });
    pages.push({ height: page.height, imageCount: page.imageCount, index: pageIndex, locator: { artifactId: prepared.inventory.artifactId, scheme: "pdf.page", value: [pageIndex] }, nativeTextRunCount, ocrRoute, width: page.width });
  }
  const tables = inferTables(textRuns, pages, prepared.inventory.artifactId);
  return { inspection: { ...prepared.inventory, pages }, losses, tables, textRuns };
}

export async function inspectPdfEvidence(input: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<PdfEvidenceInspection> {
  return (await extractPdfEvidence(input, budget)).inspection;
}

function inferTables(runs: PdfEvidenceTextRun[], pages: PdfEvidencePage[], artifactId: string): PdfEvidenceTable[] {
  const tables: PdfEvidenceTable[] = [];
  for (const page of pages) {
    const pageRuns = runs.filter((run) => run.pageIndex === page.index).sort((left, right) => right.rect.y - left.rect.y || left.rect.x - right.rect.x);
    const rowGroups: PdfEvidenceTextRun[][] = [];
    for (const run of pageRuns) {
      const row = rowGroups.find((candidate) => Math.abs((candidate[0]?.rect.y ?? 0) - run.rect.y) <= Math.max(2, run.fontSize * 0.35));
      if (row) row.push(run);
      else rowGroups.push([run]);
    }
    const rows = rowGroups.filter((row) => row.length >= 2).map((cells) => ({ cells: cells.sort((left, right) => left.rect.x - right.rect.x) }));
    if (rows.length >= 2) tables.push({ locator: { artifactId, scheme: "pdf.table", value: [page.index, tables.length] }, pageIndex: page.index, rows });
  }
  return tables;
}

export async function routePdfOcr(input: Buffer | Uint8Array, adapter?: PdfOcrAdapter, budget?: PdfEvidenceBudget): Promise<PdfOcrRoute> {
  const extraction = await extractPdfEvidence(input, budget);
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(budget?.signal?.reason);
  budget?.signal?.addEventListener("abort", forwardAbort, { once: true });
  try {
    const pages: PdfOcrRoute["pages"] = [];
    for (const page of extraction.inspection.pages) {
      checkpoint(budget);
      let reviewed = page.ocrRoute === "native";
      if (page.ocrRoute !== "native" && adapter) {
        const result = await adapter.recognize(Buffer.from(input), { artifactId: extraction.inspection.artifactId, page, signal: controller.signal });
        checkpoint(budget);
        for (const candidate of result.runs) {
          const order = extraction.textRuns.length;
          extraction.textRuns.push({ confidence: candidate.confidence ?? result.confidence, fontSize: Math.max(1, candidate.rect.height), locator: textLocator(extraction.inspection.artifactId, page.index, order, candidate.rect, page.width, page.height), order, pageIndex: page.index, rect: candidate.rect, source: "ocr", text: candidate.text });
        }
        reviewed = true;
      }
      pages.push({ pageIndex: page.index, route: page.ocrRoute, reviewed });
    }
    return { extraction, pages };
  } finally {
    budget?.signal?.removeEventListener("abort", forwardAbort);
  }
}

function safePattern(query: string, flags: string): RegExp {
  if (query.length === 0 || query.length > 256 || /\\[1-9]|\(\?<[=!]|\([^)]*(?:\*|\+|\{\d+,?\d*\})[^)]*\)(?:\*|\+|\{)/.test(query)) {
    throw new PdfEvidenceError("PDF_UNSUPPORTED", "Regular expression is empty, too long, or uses a disallowed high-risk construct.");
  }
  return new RegExp(query, flags.replace(/[^gimu]/g, "") + (flags.includes("g") ? "" : "g"));
}

export function findPdfEvidence(extraction: PdfEvidenceExtraction, query: string, options: { caseSensitive?: boolean; mode?: "exact" | "regex" } = {}): PdfEvidenceMatch[] {
  const matches: PdfEvidenceMatch[] = [];
  const pattern = options.mode === "regex" ? safePattern(query, options.caseSensitive ? "gu" : "giu") : undefined;
  for (const run of extraction.textRuns) {
    const runText = options.caseSensitive ? run.text : run.text.toLocaleLowerCase("en-US");
    if (pattern) {
      pattern.lastIndex = 0;
      for (const match of run.text.matchAll(pattern)) if (match[0].length > 0) matches.push(matchFor(run, match.index, match.index + match[0].length, match[0]));
      continue;
    }
    const needle = options.caseSensitive ? query : query.toLocaleLowerCase("en-US");
    if (needle.length === 0) throw new PdfEvidenceError("PDF_UNSUPPORTED", "Search query must not be empty.");
    let start = runText.indexOf(needle);
    while (start >= 0) {
      matches.push(matchFor(run, start, start + needle.length, run.text.slice(start, start + needle.length)));
      start = runText.indexOf(needle, start + Math.max(1, needle.length));
    }
  }
  return matches;
}

function matchFor(run: PdfEvidenceTextRun, start: number, end: number, matchedText: string): PdfEvidenceMatch {
  const unit = run.rect.width / Math.max(1, run.text.length);
  return { end, locator: run.locator, matchedText, rect: { x: run.rect.x + unit * start, y: run.rect.y, width: Math.max(unit, unit * (end - start)), height: run.rect.height }, start };
}

export function previewPdfRedactions(matches: PdfEvidenceMatch[]): PdfEvidenceRedactionPreview {
  return { matches, rectangles: matches.map((match) => ({ locator: match.locator, pageIndex: Number(match.locator.value[0] ?? 0), rect: match.rect })) };
}

export async function renderPdfEvidence(extraction: PdfEvidenceExtraction, omitted: PdfEvidenceMatch[] = []): Promise<Buffer> {
  const omittedByLocator = new Map<string, PdfEvidenceMatch[]>();
  for (const match of omitted) {
    const key = `${match.locator.artifactId}:${JSON.stringify(match.locator.value)}`;
    const entries = omittedByLocator.get(key) ?? [];
    entries.push(match);
    omittedByLocator.set(key, entries);
  }
  const pages = extraction.inspection.pages.map((page) => {
    const texts = extraction.textRuns.filter((run) => run.pageIndex === page.index).flatMap((run) => {
      const selected = (omittedByLocator.get(`${run.locator.artifactId}:${JSON.stringify(run.locator.value)}`) ?? []).sort((left, right) => right.start - left.start);
      let value = run.text;
      for (const match of selected) value = `${value.slice(0, match.start)}${value.slice(match.end)}`;
      return value.length === 0 ? [] : [{ fontSize: run.fontSize, value, x: run.rect.x, y: run.rect.y + run.fontSize * 0.2 }];
    });
    return { height: page.height, ...(texts.length > 0 ? { texts } : { text: { fontSize: 1, value: " ", x: 0, y: 0 } }), width: page.width };
  });
  return PdfEngine.render({ pages });
}

function uniqueLosses(losses: PdfEvidenceLoss[]): PdfEvidenceLoss[] {
  const seen = new Set<string>();
  return losses.filter((loss) => {
    const key = `${loss.code}:${JSON.stringify(loss.locator?.value ?? [])}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function redactPdfEvidence(input: Buffer | Uint8Array, matches: PdfEvidenceMatch[], budget?: PdfEvidenceBudget): Promise<PdfEvidenceRedaction> {
  if (matches.length === 0) throw new PdfEvidenceError("PDF_UNSUPPORTED", "At least one explicit redaction match is required.");
  const extraction = await extractPdfEvidence(input, budget);
  const runsByLocator = new Map(extraction.textRuns.map((run) => [`${run.locator.artifactId}:${JSON.stringify(run.locator.value)}`, run]));
  const ranges = new Map<string, Array<[number, number]>>();
  for (const match of matches) {
    const key = `${match.locator.artifactId}:${JSON.stringify(match.locator.value)}`;
    const run = runsByLocator.get(key);
    if (!run || match.locator.artifactId !== extraction.inspection.artifactId) throw new PdfEvidenceError("PDF_UNSUPPORTED", "Redaction locator does not belong to this exact PDF artifact.");
    if (!Number.isInteger(match.start) || !Number.isInteger(match.end) || match.start < 0 || match.end <= match.start || match.end > run.text.length || run.text.slice(match.start, match.end) !== match.matchedText) throw new PdfEvidenceError("PDF_UNSUPPORTED", "Redaction range does not match the located source text.");
    const prior = ranges.get(key) ?? [];
    if (prior.some(([start, end]) => match.start < end && match.end > start)) throw new PdfEvidenceError("PDF_UNSUPPORTED", "Overlapping redaction ranges for the same text run are not allowed.");
    prior.push([match.start, match.end]);
    ranges.set(key, prior);
  }
  const losses = [...extraction.losses, { code: "PDF_GEOMETRY_APPROXIMATED", message: "Sanitized derivative uses canonical text-run geometry and does not preserve font metrics exactly." } satisfies PdfEvidenceLoss];
  if (extraction.inspection.annotations.length > 0) losses.push({ code: "PDF_ANNOTATIONS_STRIPPED", message: "Annotations were not copied into the sanitized derivative." });
  if (extraction.inspection.attachments.length > 0) losses.push({ code: "PDF_ATTACHMENTS_STRIPPED", message: "Embedded files and file specifications were not copied into the sanitized derivative." });
  if (extraction.inspection.form.fields.length > 0) losses.push({ code: "PDF_FORM_INTERACTIVITY_STRIPPED", message: "Form fields were flattened to extracted text or omitted; interactive widgets were not copied." });
  if (Object.keys(extraction.inspection.metadata).length > 0) losses.push({ code: "PDF_METADATA_STRIPPED", message: "Source metadata was not copied into the sanitized derivative." });
  if (extraction.inspection.signatures.length > 0) losses.push({ code: "PDF_SIGNATURE_INVALIDATED", message: "Content mutation invalidates source signatures; no signature was copied." });
  losses.push({ code: "PDF_GRAPHICS_NOT_PRESERVED", message: "Non-text graphics are not preserved by the v1 sanitized redaction derivative." });
  const buffer = await renderPdfEvidence(extraction, matches);
  const verification = await verifyPdfRedaction(buffer, matches.map((match) => match.matchedText), budget);
  if (verification.status !== "PASS") throw new PdfEvidenceError("PDF_UNSUPPORTED", "Sanitized output failed residual-content verification.", { residuals: verification.residuals.length });
  return { buffer, losses: uniqueLosses(losses), redacted: matches, sha256: sha256(buffer) };
}

export async function exportPdfEvidence(buffer: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<PdfEvidenceExport> {
  const prepared = assertInput(buffer, budget);
  await inspectPdfEvidence(prepared, budget);
  return { buffer: prepared, byteLength: prepared.length, mediaType: "application/pdf", sha256: sha256(prepared) };
}

export async function verifyPdfRedaction(bufferInput: Buffer | Uint8Array, forbidden: string[], budget?: PdfEvidenceBudget): Promise<PdfEvidenceVerification> {
  const buffer = assertInput(bufferInput, budget);
  const residuals: PdfEvidenceResidual[] = [];
  let parserVerdict: PdfEvidenceVerification["parserVerdict"] = "errors";
  try {
    const validation = await validatePdfBuffer(buffer);
    parserVerdict = validation.verdict;
    if (validation.verdict === "errors") residuals.push({ channel: "parser", query: "structural-validation" });
    const extraction = await extractPdfEvidence(buffer, budget);
    const extracted = extraction.textRuns.map((run) => run.text).join("\n").toLocaleLowerCase("en-US");
    const bytes = buffer.toString("latin1").toLocaleLowerCase("en-US");
    for (const query of forbidden) {
      const canonical = query.toLocaleLowerCase("en-US");
      if (canonical.length === 0) continue;
      if (bytes.includes(canonical)) residuals.push({ channel: "bytes", query });
      if (extracted.includes(canonical)) residuals.push({ channel: "text", query });
    }
  } catch {
    residuals.push({ channel: "parser", query: "parse-failed" });
  }
  return { parserVerdict, residuals, status: residuals.length === 0 ? "PASS" : "FAIL" };
}

const LOSS_DESCRIPTIONS: Record<PdfEvidenceLossCode, string> = {
  PDF_ANNOTATIONS_STRIPPED: "Annotations are not copied into sanitized derivatives.",
  PDF_ATTACHMENTS_STRIPPED: "Attachments are not copied into sanitized derivatives.",
  PDF_FORM_INTERACTIVITY_STRIPPED: "Interactive form behavior is not preserved by redaction export.",
  PDF_GEOMETRY_APPROXIMATED: "Canonical geometry does not claim exact source font metrics.",
  PDF_GRAPHICS_NOT_PRESERVED: "Non-text graphics are not preserved by the v1 redaction derivative.",
  PDF_METADATA_STRIPPED: "Source metadata is not copied into sanitized derivatives.",
  PDF_OCR_REQUIRED: "A scanned or mixed page requires caller-provided OCR.",
  PDF_SIGNATURE_INVALIDATED: "Content mutation invalidates source signatures.",
  PDF_TEXT_UNDECODABLE: "A content stream could not be decoded by the bounded v1 extractor.",
};

function jsonDiagnostic(loss: PdfEvidenceLoss): EvidenceDiagnostic {
  return { code: loss.code, message: loss.message, ...(loss.locator ? { locator: loss.locator } : {}) };
}

function jsonValue(value: unknown): EvidenceJsonValue {
  return JSON.parse(JSON.stringify(value)) as EvidenceJsonValue;
}

function requestBuffer(input: EvidenceJsonValue): Buffer {
  if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.pdfBase64 !== "string") throw new PdfEvidenceError("PDF_UNSUPPORTED", "Extension input requires pdfBase64.");
  if (input.pdfBase64.length === 0 || input.pdfBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.pdfBase64)) throw new PdfEvidenceError("PDF_UNSUPPORTED", "pdfBase64 must be canonical non-empty base64.");
  const buffer = Buffer.from(input.pdfBase64, "base64");
  if (buffer.toString("base64") !== input.pdfBase64) throw new PdfEvidenceError("PDF_UNSUPPORTED", "pdfBase64 is not canonical base64.");
  return buffer;
}

function requestQuery(input: EvidenceJsonValue): string {
  if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.query !== "string") throw new PdfEvidenceError("PDF_UNSUPPORTED", "Extension input requires query.");
  return input.query;
}

function success(output: unknown, losses: PdfEvidenceLoss[] = [], artifacts: Array<{ name: string; mediaType: string; byteLength: number; sha256: string }> = []): EvidenceExtensionResult {
  return { status: "ok", output: jsonValue(output), warnings: [], losses: losses.map(jsonDiagnostic), artifacts };
}

export function createPdfEvidenceExtension(): PdfEvidenceExtensionDefinition {
  return {
    manifest: {
      schemaVersion: 1,
      id: "runstamp.pdf-evidence",
      version: "1.0.0",
      catalogItemId: "A03",
      title: "PDF evidence processing",
      operations: ["inspect", "extract", "render", "ocr-route", "find", "preview-redaction", "redact", "export", "verify"].map((name) => ({ name, summary: `${name} PDF evidence without executing active document content.`, inputKinds: ["application/pdf;base64"], outputKinds: [name === "render" || name === "redact" || name === "export" ? "application/pdf;base64" : "application/json"] })),
      warningCodes: [],
      lossCodes: (Object.entries(LOSS_DESCRIPTIONS) as Array<[PdfEvidenceLossCode, string]>).map(([code, description]) => ({ code, description })),
    },
    async execute(request, context: EvidenceExtensionContext) {
      const buffer = requestBuffer(request.input);
      const budget: PdfEvidenceBudget = { maxInputBytes: context.budget.maxInputBytes, maxObjects: context.budget.maxEntries, signal: context.signal };
      context.checkpoint({ inputBytes: buffer.length });
      context.reportProgress({ completed: 1, total: 3, message: "PDF input accepted" });
      if (request.operation === "inspect") return success(await inspectPdfEvidence(buffer, budget));
      const extraction = await extractPdfEvidence(buffer, budget);
      context.checkpoint({ entries: extraction.textRuns.length });
      context.reportProgress({ completed: 2, total: 3, message: "PDF text and structure extracted" });
      if (request.operation === "extract") return success(extraction, extraction.losses);
      if (request.operation === "ocr-route") return success(await routePdfOcr(buffer, undefined, budget), extraction.losses);
      if (request.operation === "find" || request.operation === "preview-redaction") {
        const matches = findPdfEvidence(extraction, requestQuery(request.input));
        return success(request.operation === "find" ? matches : previewPdfRedactions(matches), extraction.losses);
      }
      if (request.operation === "verify") return success(await verifyPdfRedaction(buffer, [requestQuery(request.input)], budget));
      if (request.operation === "render") {
        const rendered = await renderPdfEvidence(extraction);
        return success({ pdfBase64: rendered.toString("base64") }, extraction.losses, [{ name: "rendered.pdf", mediaType: "application/pdf", byteLength: rendered.length, sha256: sha256(rendered) }]);
      }
      if (request.operation === "redact") {
        const matches = findPdfEvidence(extraction, requestQuery(request.input));
        const redaction = await redactPdfEvidence(buffer, matches, budget);
        return success({ pdfBase64: redaction.buffer.toString("base64"), redacted: redaction.redacted, sha256: redaction.sha256 }, redaction.losses, [{ name: "sanitized.pdf", mediaType: "application/pdf", byteLength: redaction.buffer.length, sha256: redaction.sha256 }]);
      }
      if (request.operation === "export") {
        const exported = await exportPdfEvidence(buffer, budget);
        return success({ pdfBase64: exported.buffer.toString("base64"), byteLength: exported.byteLength, mediaType: exported.mediaType, sha256: exported.sha256 }, [], [{ name: "export.pdf", mediaType: exported.mediaType, byteLength: exported.byteLength, sha256: exported.sha256 }]);
      }
      return { status: "error", error: { code: "PDF_UNSUPPORTED", message: `Unsupported operation ${request.operation}.`, retryable: false }, warnings: [], losses: [], artifacts: [] };
    },
  };
}
