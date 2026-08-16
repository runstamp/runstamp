import { createHash } from "node:crypto";
import JSZip, { type JSZipObject } from "jszip";
import {
  type ExtensionDefinition,
  type ExtensionLocator,
  type ExtensionManifest,
  type ExtensionRequest,
  type ExtensionResult,
  type JsonValue,
  hashArtifact,
} from "@runstamp/protocol";
import { validateDocxBuffer } from "../core/ooxml-output-validator.js";

const SEARCHABLE_PART = /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/;
const EXECUTABLE_PART = /(?:^|\/)(?:vbaProject|activeX\/.+)\.(?:bin|xml|rels)$/i;
const OLE_PART = /(?:^|\/)embeddings\//i;
const XML_PART = /\.xml$/i;
const STABLE_ZIP_DATE = new Date("2000-01-01T00:00:00.000Z");

type ExtensionDiagnostic = {
  code: string;
  message: string;
  severity?: "info" | "warning" | "error";
  locator?: ExtensionLocator;
};

export const DOCX_CONTROLLED_WARNING_CODES = {
  EXTERNAL_RELATIONSHIP: "DOCX_EXTERNAL_RELATIONSHIP",
  EXECUTABLE_PART_PRESERVED: "DOCX_EXECUTABLE_PART_PRESERVED",
} as const;

export const DOCX_CONTROLLED_LOSS_CODES = {
  OPAQUE_PART_PRESERVED: "DOCX_OPAQUE_PART_PRESERVED",
} as const;

export type DocxControlledErrorCode =
  | "DOCX_INVALID_PACKAGE"
  | "DOCX_ENCRYPTED_INPUT"
  | "DOCX_ARCHIVE_LIMIT"
  | "DOCX_UNSAFE_ARCHIVE_PATH"
  | "DOCX_XML_LIMIT"
  | "DOCX_INVALID_LOCATOR"
  | "DOCX_STALE_LOCATOR";

export class DocxControlledDocumentError extends Error {
  readonly code: DocxControlledErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: DocxControlledErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DocxControlledDocumentError";
    this.code = code;
    this.details = details;
  }
}

export interface DocxArchiveLimits {
  maxInputBytes: number;
  maxEntries: number;
  maxUncompressedBytes: number;
  maxCompressionRatio: number;
  maxXmlBytes: number;
  maxXmlDepth: number;
}

export const DEFAULT_DOCX_ARCHIVE_LIMITS: DocxArchiveLimits = {
  maxInputBytes: 50 * 1024 * 1024,
  maxEntries: 10_000,
  maxUncompressedBytes: 250 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxXmlBytes: 25 * 1024 * 1024,
  maxXmlDepth: 256,
};

export interface DocxRelationshipInspection {
  owner: string;
  id: string;
  type: string;
  target: string;
  targetMode: "Internal" | "External";
  resolvedTarget?: string;
  targetExists?: boolean;
}

export interface DocxControlledInspection {
  sha256: string;
  byteLength: number;
  entryCount: number;
  uncompressedBytes: number;
  partNames: string[];
  searchableParts: string[];
  metadataParts: string[];
  mediaParts: string[];
  executableParts: string[];
  oleParts: string[];
  relationships: DocxRelationshipInspection[];
  features: {
    sections: number;
    paragraphs: number;
    runs: number;
    tables: number;
    styles: number;
    numberingDefinitions: number;
    headers: number;
    footers: number;
    footnotes: number;
    endnotes: number;
    comments: number;
    trackedInsertions: number;
    trackedDeletions: number;
    hyperlinks: number;
  };
  warnings: ExtensionDiagnostic[];
  losses: ExtensionDiagnostic[];
}

export type DocxTrackedChangeVisibility = "final" | "original" | "all";

export interface ControlledDocxPart {
  name: string;
  text: string;
  paragraphCount: number;
  /** Lossless source XML used for stable locator resolution and targeted mutation. */
  xml: string;
}

export interface ControlledDocxDocument {
  schemaVersion: 1;
  artifactId: string;
  sourceSha256: string;
  packageBase64: string;
  inspection: DocxControlledInspection;
  parts: ControlledDocxPart[];
}

export interface DocxTextLocator extends ExtensionLocator {
  scheme: "docx-ooxml-text-v1";
  value: [
    partName: string,
    paragraphIndex: number,
    startNodeIndex: number,
    startOffset: number,
    endNodeIndex: number,
    endOffset: number,
    paragraphSha256: string,
    visibility: DocxTrackedChangeVisibility,
  ];
}

export interface DocxFindResult {
  text: string;
  locator: DocxTextLocator;
}

export interface DocxRedactionPreview {
  artifactId: string;
  targets: Array<{ locator: DocxTextLocator; currentText: string }>;
  residualCount: number;
  mutatesArtifact: false;
}

export interface DocxRedactionProof {
  removedOccurrences: number;
  residualCount: number;
  removedTextSha256: string[];
  sourceSha256: string;
  outputSha256: string;
}

export interface DocxRedactionResult {
  document: ControlledDocxDocument;
  proof: DocxRedactionProof;
  warnings: ExtensionDiagnostic[];
  losses: ExtensionDiagnostic[];
}

export interface DocxVerifyIssue {
  code: string;
  message: string;
  part?: string;
}

export interface DocxVerificationReport {
  status: "PASS" | "FAIL";
  sha256: string;
  issues: DocxVerifyIssue[];
  residualMatches: Array<{ text: string; parts: string[] }>;
  validator: {
    validator: string;
    version: string;
    required: true;
    status: "PASS" | "FAIL";
    command: string;
    issues: Array<{ code: string; message: string; severity: "error" }>;
  };
}

interface TextNode {
  index: number;
  kind: "t" | "delText";
  start: number;
  end: number;
  rawText: string;
  text: string;
  visibleFinal: boolean;
  visibleOriginal: boolean;
}

interface ParagraphModel {
  index: number;
  start: number;
  end: number;
  xml: string;
  nodes: TextNode[];
}

interface LoadedPackage {
  zip: JSZip;
  inspection: DocxControlledInspection;
  entryBytes: Map<string, Uint8Array>;
}

interface ZipSizeData {
  compressedSize?: number;
  uncompressedSize?: number;
}

interface UnsafeZipObject extends JSZipObject {
  unsafeOriginalName?: string;
  _data?: ZipSizeData;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function mergeLimits(overrides?: Partial<DocxArchiveLimits>): DocxArchiveLimits {
  const limits = { ...DEFAULT_DOCX_ARCHIVE_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DocxControlledDocumentError("DOCX_ARCHIVE_LIMIT", `${name} must be a positive finite number.`, { name, value });
    }
  }
  return limits;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function maxXmlDepth(xml: string): number {
  const tags = xml.match(/<[^!?][^>]*>/g) ?? [];
  let depth = 0;
  let maximum = 0;
  for (const tag of tags) {
    if (/^<\//.test(tag)) depth = Math.max(0, depth - 1);
    else if (!/\/\s*>$/.test(tag)) {
      depth += 1;
      maximum = Math.max(maximum, depth);
    }
  }
  return maximum;
}

function isUnsafePath(name: string): boolean {
  return name.startsWith("/") || name.includes("\\") || name.split("/").some((segment) => segment === "..");
}

function relationshipOwner(path: string): string {
  if (path === "_rels/.rels") return "";
  const marker = "/_rels/";
  const index = path.indexOf(marker);
  if (index === -1 || !path.endsWith(".rels")) return path;
  return `${path.slice(0, index)}/${path.slice(index + marker.length, -".rels".length)}`;
}

function resolveRelationshipTarget(owner: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const stack = owner.includes("/") ? owner.slice(0, owner.lastIndexOf("/")).split("/") : [];
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") stack.pop();
    else stack.push(segment);
  }
  return stack.join("/");
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/g)) {
    attributes[match[1]!] = decodeXmlText(match[3]!);
  }
  return attributes;
}

function parseRelationships(path: string, xml: string, names: Set<string>): DocxRelationshipInspection[] {
  const owner = relationshipOwner(path);
  const relationships: DocxRelationshipInspection[] = [];
  for (const match of xml.matchAll(/<Relationship\b[^>]*\/?\s*>/gi)) {
    const attributes = parseAttributes(match[0]);
    if (!attributes.Id || !attributes.Type || !attributes.Target) continue;
    const external = attributes.TargetMode?.toLowerCase() === "external";
    const resolvedTarget = external ? undefined : resolveRelationshipTarget(owner, attributes.Target);
    relationships.push({
      owner,
      id: attributes.Id,
      type: attributes.Type,
      target: attributes.Target,
      targetMode: external ? "External" : "Internal",
      ...(resolvedTarget ? { resolvedTarget, targetExists: names.has(resolvedTarget) } : {}),
    });
  }
  return relationships;
}

function countTag(xml: string, tag: string): number {
  return xml.match(new RegExp(`<${tag}\\b`, "g"))?.length ?? 0;
}

async function loadPackage(bytes: Uint8Array, overrides?: Partial<DocxArchiveLimits>): Promise<LoadedPackage> {
  const limits = mergeLimits(overrides);
  if (bytes.byteLength > limits.maxInputBytes) {
    throw new DocxControlledDocumentError("DOCX_ARCHIVE_LIMIT", `Input has ${bytes.byteLength} bytes; maxInputBytes is ${limits.maxInputBytes}.`);
  }
  const compoundFileMagic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (compoundFileMagic.every((byte, index) => bytes[index] === byte)) {
    throw new DocxControlledDocumentError("DOCX_ENCRYPTED_INPUT", "Compound-file DOCX input is encrypted or legacy binary and is not decrypted or executed.");
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message)) {
      throw new DocxControlledDocumentError("DOCX_ENCRYPTED_INPUT", `Encrypted DOCX package was rejected: ${error.message}`);
    }
    throw new DocxControlledDocumentError("DOCX_INVALID_PACKAGE", `Unable to read DOCX package: ${error instanceof Error ? error.message : String(error)}`);
  }
  const entries = Object.values(zip.files).filter((entry) => !entry.dir) as UnsafeZipObject[];
  if (entries.length > limits.maxEntries) {
    throw new DocxControlledDocumentError("DOCX_ARCHIVE_LIMIT", `Archive has ${entries.length} entries; maxEntries is ${limits.maxEntries}.`);
  }
  for (const entry of entries) {
    const original = entry.unsafeOriginalName ?? entry.name;
    if (isUnsafePath(original) || isUnsafePath(entry.name)) {
      throw new DocxControlledDocumentError("DOCX_UNSAFE_ARCHIVE_PATH", `Archive entry has an unsafe path: ${original}.`, { path: original });
    }
    const compressed = entry._data?.compressedSize;
    const uncompressed = entry._data?.uncompressedSize;
    if (compressed !== undefined && uncompressed !== undefined && uncompressed > Math.max(1, compressed) * limits.maxCompressionRatio) {
      throw new DocxControlledDocumentError("DOCX_ARCHIVE_LIMIT", `Archive entry ${entry.name} exceeds maxCompressionRatio ${limits.maxCompressionRatio}.`);
    }
  }
  const names = new Set(entries.map((entry) => entry.name));
  if (names.has("EncryptedPackage") || names.has("EncryptionInfo")) {
    throw new DocxControlledDocumentError("DOCX_ENCRYPTED_INPUT", "Encrypted DOCX packages are not supported and were not decrypted.");
  }
  if (!names.has("[Content_Types].xml") || !names.has("word/document.xml")) {
    throw new DocxControlledDocumentError("DOCX_INVALID_PACKAGE", "DOCX package must contain [Content_Types].xml and word/document.xml.");
  }

  let uncompressedBytes = 0;
  let xmlBytes = 0;
  const entryBytes = new Map<string, Uint8Array>();
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const content = await entry.async("uint8array");
    uncompressedBytes += content.byteLength;
    if (uncompressedBytes > limits.maxUncompressedBytes) {
      throw new DocxControlledDocumentError("DOCX_ARCHIVE_LIMIT", `Archive expands beyond maxUncompressedBytes ${limits.maxUncompressedBytes}.`);
    }
    entryBytes.set(entry.name, content);
    if (XML_PART.test(entry.name)) {
      xmlBytes += content.byteLength;
      if (xmlBytes > limits.maxXmlBytes) {
        throw new DocxControlledDocumentError("DOCX_XML_LIMIT", `Archive XML exceeds maxXmlBytes ${limits.maxXmlBytes}.`);
      }
      const xml = new TextDecoder().decode(content);
      const depth = maxXmlDepth(xml);
      if (depth > limits.maxXmlDepth) {
        throw new DocxControlledDocumentError("DOCX_XML_LIMIT", `${entry.name} has XML depth ${depth}; maxXmlDepth is ${limits.maxXmlDepth}.`);
      }
    }
  }

  const relationships = [...entryBytes.entries()]
    .filter(([name]) => name.endsWith(".rels"))
    .flatMap(([name, content]) => parseRelationships(name, new TextDecoder().decode(content), names))
    .sort((left, right) => `${left.owner}:${left.id}`.localeCompare(`${right.owner}:${right.id}`));
  const partNames = [...names].sort();
  const executableParts = partNames.filter((name) => EXECUTABLE_PART.test(name));
  const oleParts = partNames.filter((name) => OLE_PART.test(name));
  const externalRelationships = relationships.filter(({ targetMode }) => targetMode === "External");
  const xmlFor = (name: string): string => {
    const value = entryBytes.get(name);
    return value ? new TextDecoder().decode(value) : "";
  };
  const searchableXml = partNames.filter((name) => SEARCHABLE_PART.test(name)).map(xmlFor).join("\n");
  const documentXml = xmlFor("word/document.xml");
  const stylesXml = xmlFor("word/styles.xml");
  const numberingXml = xmlFor("word/numbering.xml");
  const commentsXml = xmlFor("word/comments.xml");
  const warnings: ExtensionDiagnostic[] = [
    ...externalRelationships.map((relationship) => ({
      code: DOCX_CONTROLLED_WARNING_CODES.EXTERNAL_RELATIONSHIP,
      message: `External relationship ${relationship.id} targets ${relationship.target}; it was inspected but never fetched.`,
    })),
    ...executableParts.map((name) => ({
      code: DOCX_CONTROLLED_WARNING_CODES.EXECUTABLE_PART_PRESERVED,
      message: `Executable part ${name} was preserved as opaque bytes and never executed.`,
    })),
  ];
  const opaqueParts = [...new Set([...executableParts, ...oleParts])].sort();
  const losses: ExtensionDiagnostic[] = opaqueParts.length === 0 ? [] : [{
    code: DOCX_CONTROLLED_LOSS_CODES.OPAQUE_PART_PRESERVED,
    message: `${opaqueParts.length} macro/OLE part(s) are preserved but not editable in v1: ${opaqueParts.join(", ")}.`,
  }];
  const inspection: DocxControlledInspection = {
    sha256: sha256(bytes),
    byteLength: bytes.byteLength,
    entryCount: entries.length,
    uncompressedBytes,
    partNames,
    searchableParts: partNames.filter((name) => SEARCHABLE_PART.test(name)),
    metadataParts: partNames.filter((name) => name.startsWith("docProps/") || name === "word/settings.xml"),
    mediaParts: partNames.filter((name) => name.startsWith("word/media/")),
    executableParts,
    oleParts,
    relationships,
    features: {
      sections: countTag(documentXml, "w:sectPr"),
      paragraphs: countTag(searchableXml, "w:p"),
      runs: countTag(searchableXml, "w:r"),
      tables: countTag(documentXml, "w:tbl"),
      styles: countTag(stylesXml, "w:style"),
      numberingDefinitions: countTag(numberingXml, "w:abstractNum"),
      headers: partNames.filter((name) => /^word\/header\d+\.xml$/.test(name)).length,
      footers: partNames.filter((name) => /^word\/footer\d+\.xml$/.test(name)).length,
      footnotes: countTag(xmlFor("word/footnotes.xml"), "w:footnote"),
      endnotes: countTag(xmlFor("word/endnotes.xml"), "w:endnote"),
      comments: countTag(commentsXml, "w:comment"),
      trackedInsertions: countTag(searchableXml, "w:ins"),
      trackedDeletions: countTag(searchableXml, "w:del"),
      hyperlinks: relationships.filter(({ type }) => type.endsWith("/hyperlink")).length,
    },
    warnings,
    losses,
  };
  return { zip, inspection, entryBytes };
}

export async function inspectControlledDocx(bytes: Uint8Array, limits?: Partial<DocxArchiveLimits>): Promise<DocxControlledInspection> {
  return (await loadPackage(bytes, limits)).inspection;
}

function revisionVisibility(prefix: string, tag: "ins" | "del"): boolean {
  const openings = prefix.match(new RegExp(`<w:${tag}(?:\\s|>)`, "g"))?.length ?? 0;
  const closings = prefix.match(new RegExp(`</w:${tag}>`, "g"))?.length ?? 0;
  return openings > closings;
}

function parseParagraphs(xml: string): ParagraphModel[] {
  const paragraphs: ParagraphModel[] = [];
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
    const paragraphXml = match[0];
    const nodes: TextNode[] = [];
    for (const nodeMatch of paragraphXml.matchAll(/<w:(t|delText)\b[^>]*>([\s\S]*?)<\/w:\1>/g)) {
      const full = nodeMatch[0];
      const rawText = nodeMatch[2]!;
      const rawStart = nodeMatch.index! + full.indexOf(rawText);
      const prefix = paragraphXml.slice(0, nodeMatch.index);
      const inDeletion = nodeMatch[1] === "delText" || revisionVisibility(prefix, "del");
      const inInsertion = revisionVisibility(prefix, "ins");
      nodes.push({
        index: nodes.length,
        kind: nodeMatch[1] as "t" | "delText",
        start: rawStart,
        end: rawStart + rawText.length,
        rawText,
        text: decodeXmlText(rawText),
        visibleFinal: !inDeletion,
        visibleOriginal: !inInsertion,
      });
    }
    paragraphs.push({
      index: paragraphs.length,
      start: match.index!,
      end: match.index! + paragraphXml.length,
      xml: paragraphXml,
      nodes,
    });
  }
  return paragraphs;
}

function nodeVisible(node: TextNode, visibility: DocxTrackedChangeVisibility): boolean {
  return visibility === "all" || (visibility === "final" ? node.visibleFinal : node.visibleOriginal);
}

function paragraphVisibleText(paragraph: ParagraphModel, visibility: DocxTrackedChangeVisibility): string {
  return paragraph.nodes.filter((node) => nodeVisible(node, visibility)).map((node) => node.text).join("");
}

export async function importControlledDocx(
  bytes: Uint8Array,
  options: { artifactId?: string; limits?: Partial<DocxArchiveLimits> } = {},
): Promise<ControlledDocxDocument> {
  const loaded = await loadPackage(bytes, options.limits);
  const parts = loaded.inspection.searchableParts.map((name) => {
    const xml = new TextDecoder().decode(loaded.entryBytes.get(name)!);
    const paragraphs = parseParagraphs(xml);
    return { name, text: paragraphs.map((paragraph) => paragraphVisibleText(paragraph, "all")).join("\n"), paragraphCount: paragraphs.length, xml };
  });
  return {
    schemaVersion: 1,
    artifactId: options.artifactId ?? `docx:${loaded.inspection.sha256.slice(0, 16)}`,
    sourceSha256: loaded.inspection.sha256,
    packageBase64: Buffer.from(bytes).toString("base64"),
    inspection: loaded.inspection,
    parts,
  };
}

function assertControlledDocument(document: ControlledDocxDocument): void {
  if (document.schemaVersion !== 1 || !document.artifactId || !document.packageBase64) {
    throw new DocxControlledDocumentError("DOCX_INVALID_PACKAGE", "Controlled DOCX model is malformed.");
  }
}

function normalizeSearch(query: string, caseSensitive: boolean): string {
  return caseSensitive ? query : query.toLocaleLowerCase("en-US");
}

function locatorFor(
  artifactId: string,
  partName: string,
  paragraph: ParagraphModel,
  visibleNodes: TextNode[],
  start: number,
  end: number,
  visibility: DocxTrackedChangeVisibility,
): DocxTextLocator {
  let cursor = 0;
  let startNode = visibleNodes[0]!;
  let startOffset = 0;
  let endNode = visibleNodes.at(-1)!;
  let endOffset = endNode.text.length;
  for (const node of visibleNodes) {
    const next = cursor + node.text.length;
    if (start >= cursor && start < next) {
      startNode = node;
      startOffset = start - cursor;
    }
    if (end > cursor && end <= next) {
      endNode = node;
      endOffset = end - cursor;
      break;
    }
    cursor = next;
  }
  return {
    artifactId,
    scheme: "docx-ooxml-text-v1",
    value: [partName, paragraph.index, startNode.index, startOffset, endNode.index, endOffset, sha256(paragraph.xml), visibility],
  };
}

export function findControlledDocx(
  document: ControlledDocxDocument,
  query: string,
  options: { caseSensitive?: boolean; visibility?: DocxTrackedChangeVisibility } = {},
): DocxFindResult[] {
  assertControlledDocument(document);
  if (!query) return [];
  const visibility = options.visibility ?? "final";
  const caseSensitive = options.caseSensitive ?? true;
  const results: DocxFindResult[] = [];
  for (const part of document.parts) {
    for (const paragraph of parseParagraphs(part.xml)) {
      const visibleNodes = paragraph.nodes.filter((node) => nodeVisible(node, visibility));
      const text = visibleNodes.map((node) => node.text).join("");
      const haystack = normalizeSearch(text, caseSensitive);
      const needle = normalizeSearch(query, caseSensitive);
      let offset = 0;
      while (offset <= haystack.length - needle.length) {
        const index = haystack.indexOf(needle, offset);
        if (index === -1) break;
        results.push({ text: text.slice(index, index + query.length), locator: locatorFor(document.artifactId, part.name, paragraph, visibleNodes, index, index + query.length, visibility) });
        offset = index + Math.max(1, needle.length);
      }
    }
  }
  return results;
}

function locate(document: ControlledDocxDocument, locator: DocxTextLocator): { part: ControlledDocxPart & { xml: string }; paragraph: ParagraphModel; text: string } {
  if (locator.artifactId !== document.artifactId || locator.scheme !== "docx-ooxml-text-v1") {
    throw new DocxControlledDocumentError("DOCX_INVALID_LOCATOR", "Locator belongs to a different artifact or scheme.");
  }
  const [partName, paragraphIndex, startNodeIndex, startOffset, endNodeIndex, endOffset, paragraphHash, visibility] = locator.value;
  const part = document.parts.find(({ name }) => name === partName);
  if (!part) throw new DocxControlledDocumentError("DOCX_INVALID_LOCATOR", `Locator part ${partName} is unavailable.`);
  const paragraph = parseParagraphs(part.xml)[paragraphIndex];
  if (!paragraph) throw new DocxControlledDocumentError("DOCX_STALE_LOCATOR", `Paragraph ${paragraphIndex} no longer exists in ${partName}.`);
  if (sha256(paragraph.xml) !== paragraphHash) throw new DocxControlledDocumentError("DOCX_STALE_LOCATOR", `Paragraph ${paragraphIndex} in ${partName} changed after locator creation.`);
  const startNode = paragraph.nodes[startNodeIndex];
  const endNode = paragraph.nodes[endNodeIndex];
  if (!startNode || !endNode || !nodeVisible(startNode, visibility) || !nodeVisible(endNode, visibility) || startOffset > startNode.text.length || endOffset > endNode.text.length) {
    throw new DocxControlledDocumentError("DOCX_STALE_LOCATOR", "Locator text-node offsets are no longer valid.");
  }
  const selected: string[] = [];
  for (let index = startNodeIndex; index <= endNodeIndex; index += 1) {
    const node = paragraph.nodes[index]!;
    if (!nodeVisible(node, visibility)) continue;
    const from = index === startNodeIndex ? startOffset : 0;
    const to = index === endNodeIndex ? endOffset : node.text.length;
    selected.push(node.text.slice(from, to));
  }
  return { part, paragraph, text: selected.join("") };
}

export function previewDocxRedactions(document: ControlledDocxDocument, locators: DocxTextLocator[]): DocxRedactionPreview {
  const targets = locators.map((locator) => ({ locator, currentText: locate(document, locator).text }));
  return { artifactId: document.artifactId, targets, residualCount: targets.length, mutatesArtifact: false };
}

function redactParagraph(paragraph: ParagraphModel, locators: DocxTextLocator[]): { xml: string; removed: string[] } {
  const mutations = locators.map((locator) => {
    const [, , startNodeIndex, startOffset, endNodeIndex, endOffset, , visibility] = locator.value;
    const absoluteStart = paragraph.nodes.slice(0, startNodeIndex).reduce((sum, node) => sum + node.text.length, 0) + startOffset;
    const absoluteEnd = paragraph.nodes.slice(0, endNodeIndex).reduce((sum, node) => sum + node.text.length, 0) + endOffset;
    const selected: string[] = [];
    for (let index = startNodeIndex; index <= endNodeIndex; index += 1) {
      const node = paragraph.nodes[index]!;
      if (!nodeVisible(node, visibility)) continue;
      selected.push(node.text.slice(index === startNodeIndex ? startOffset : 0, index === endNodeIndex ? endOffset : node.text.length));
    }
    return { startNodeIndex, startOffset, endNodeIndex, endOffset, absoluteStart, absoluteEnd, visibility, removed: selected.join("") };
  }).sort((left, right) => right.absoluteStart - left.absoluteStart);
  for (let index = 1; index < mutations.length; index += 1) {
    if (mutations[index]!.absoluteEnd > mutations[index - 1]!.absoluteStart) {
      throw new DocxControlledDocumentError("DOCX_INVALID_LOCATOR", "Overlapping redaction locators are not allowed.");
    }
  }
  const nodeTexts = paragraph.nodes.map((node) => node.text);
  for (const mutation of mutations) {
    if (mutation.startNodeIndex === mutation.endNodeIndex) {
      const text = nodeTexts[mutation.startNodeIndex]!;
      nodeTexts[mutation.startNodeIndex] = text.slice(0, mutation.startOffset) + text.slice(mutation.endOffset);
    } else {
      nodeTexts[mutation.startNodeIndex] = nodeTexts[mutation.startNodeIndex]!.slice(0, mutation.startOffset);
      for (let index = mutation.startNodeIndex + 1; index < mutation.endNodeIndex; index += 1) {
        if (nodeVisible(paragraph.nodes[index]!, mutation.visibility)) nodeTexts[index] = "";
      }
      nodeTexts[mutation.endNodeIndex] = nodeTexts[mutation.endNodeIndex]!.slice(mutation.endOffset);
    }
  }
  let xml = paragraph.xml;
  for (let index = paragraph.nodes.length - 1; index >= 0; index -= 1) {
    const node = paragraph.nodes[index]!;
    xml = xml.slice(0, node.start) + encodeXmlText(nodeTexts[index]!) + xml.slice(node.end);
  }
  return { xml, removed: mutations.map(({ removed }) => removed) };
}

async function emitPackage(source: LoadedPackage, replacements: Map<string, string>): Promise<Buffer> {
  const output = new JSZip();
  for (const name of source.inspection.partNames) {
    const content = replacements.has(name) ? new TextEncoder().encode(replacements.get(name)!) : source.entryBytes.get(name)!;
    output.file(name, content, { date: STABLE_ZIP_DATE, createFolders: false });
  }
  return output.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 }, platform: "UNIX" });
}

export async function applyDocxRedactions(document: ControlledDocxDocument, locators: DocxTextLocator[]): Promise<DocxRedactionResult> {
  assertControlledDocument(document);
  const sourceBytes = Buffer.from(document.packageBase64, "base64");
  const loaded = await loadPackage(sourceBytes);
  if (loaded.inspection.sha256 !== document.inspection.sha256 || loaded.inspection.sha256 !== document.sourceSha256) {
    throw new DocxControlledDocumentError("DOCX_STALE_LOCATOR", "Controlled model package bytes no longer match the imported source hash.");
  }
  for (const part of document.parts) {
    const sourceXml = loaded.entryBytes.get(part.name);
    if (!sourceXml || new TextDecoder().decode(sourceXml) !== part.xml) {
      throw new DocxControlledDocumentError("DOCX_STALE_LOCATOR", `Controlled model part ${part.name} no longer matches its package bytes.`);
    }
  }
  const resolved = locators.map((locator) => ({ locator, ...locate(document, locator) }));
  const byPartAndParagraph = new Map<string, typeof resolved>();
  for (const target of resolved) {
    const key = `${target.part.name}\0${target.paragraph.index}`;
    const values = byPartAndParagraph.get(key) ?? [];
    values.push(target);
    byPartAndParagraph.set(key, values);
  }
  const replacements = new Map<string, string>();
  const removed: string[] = [];
  for (const targets of byPartAndParagraph.values()) {
    const part = targets[0]!.part;
    const paragraphs = parseParagraphs(replacements.get(part.name) ?? part.xml);
    const paragraph = paragraphs[targets[0]!.paragraph.index]!;
    const redaction = redactParagraph(paragraph, targets.map(({ locator }) => locator));
    const current = replacements.get(part.name) ?? part.xml;
    replacements.set(part.name, current.slice(0, paragraph.start) + redaction.xml + current.slice(paragraph.end));
    removed.push(...redaction.removed);
  }
  const output = await emitPackage(loaded, replacements);
  const next = await importControlledDocx(output, { artifactId: document.artifactId });
  const residualCount = removed.reduce((count, text) => count + findControlledDocx(next, text, { visibility: "all" }).length, 0);
  return {
    document: next,
    proof: {
      removedOccurrences: removed.length,
      residualCount,
      removedTextSha256: removed.map((text) => sha256(text)),
      sourceSha256: document.inspection.sha256,
      outputSha256: next.inspection.sha256,
    },
    warnings: next.inspection.warnings,
    losses: next.inspection.losses,
  };
}

export function exportControlledDocx(document: ControlledDocxDocument): Buffer {
  assertControlledDocument(document);
  const bytes = Buffer.from(document.packageBase64, "base64");
  if (sha256(bytes) !== document.inspection.sha256 || document.inspection.sha256 !== document.sourceSha256) {
    throw new DocxControlledDocumentError("DOCX_STALE_LOCATOR", "Controlled model package bytes do not match the imported source hash.");
  }
  return bytes;
}

function byteContains(bytes: Uint8Array, needle: string): boolean {
  if (!needle) return false;
  const lowerNeedle = needle.toLocaleLowerCase("en-US");
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes).toLocaleLowerCase("en-US");
  if (utf8.includes(lowerNeedle) || decodeXmlText(utf8).includes(lowerNeedle)) return true;
  if (bytes.byteLength % 2 === 0) {
    const utf16 = new TextDecoder("utf-16le", { fatal: false }).decode(bytes).toLocaleLowerCase("en-US");
    if (utf16.includes(lowerNeedle)) return true;
  }
  return false;
}

function entryContainsForbidden(name: string, bytes: Uint8Array, needle: string): boolean {
  if (byteContains(bytes, needle)) return true;
  if (!SEARCHABLE_PART.test(name)) return false;
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const extracted = parseParagraphs(xml)
    .map((paragraph) => paragraphVisibleText(paragraph, "all"))
    .join("\n")
    .toLocaleLowerCase("en-US");
  return extracted.includes(needle.toLocaleLowerCase("en-US"));
}

export async function verifyControlledDocx(
  bytesOrDocument: Uint8Array | ControlledDocxDocument,
  options: { forbiddenText?: string[]; limits?: Partial<DocxArchiveLimits> } = {},
): Promise<DocxVerificationReport> {
  const bytes = bytesOrDocument instanceof Uint8Array || Buffer.isBuffer(bytesOrDocument)
    ? bytesOrDocument
    : exportControlledDocx(bytesOrDocument);
  const issues: DocxVerifyIssue[] = [];
  let loaded: LoadedPackage;
  try {
    loaded = await loadPackage(bytes, options.limits);
  } catch (error) {
    const controlled = error instanceof DocxControlledDocumentError ? error : undefined;
    issues.push({ code: controlled?.code ?? "DOCX_INVALID_PACKAGE", message: error instanceof Error ? error.message : String(error) });
    return verificationReport(bytes, issues, []);
  }
  const structural = await validateDocxBuffer(bytes);
  issues.push(...structural.issues.map((issue) => ({ code: issue.code, message: issue.message, ...(issue.part ? { part: issue.part } : {}) })));
  for (const relationship of loaded.inspection.relationships) {
    if (relationship.targetMode === "Internal" && relationship.targetExists === false) {
      issues.push({ code: "DOCX_RELATIONSHIP_TARGET_MISSING", message: `${relationship.owner || "package"} relationship ${relationship.id} points to missing ${relationship.resolvedTarget}.`, part: relationship.owner });
    }
  }
  const residualMatches = (options.forbiddenText ?? []).flatMap((text) => {
    const parts = [...loaded.entryBytes.entries()].filter(([name, content]) => entryContainsForbidden(name, content, text)).map(([name]) => name).sort();
    return parts.length > 0 ? [{ text, parts }] : [];
  });
  for (const residual of residualMatches) {
    issues.push({ code: "DOCX_RESIDUAL_TEXT", message: `Forbidden text remains in ${residual.parts.join(", ")}.` });
  }
  return verificationReport(bytes, issues, residualMatches);
}

function verificationReport(bytes: Uint8Array, issues: DocxVerifyIssue[], residualMatches: Array<{ text: string; parts: string[] }>): DocxVerificationReport {
  const status = issues.length === 0 ? "PASS" : "FAIL";
  return {
    status,
    sha256: sha256(bytes),
    issues,
    residualMatches,
    validator: {
      validator: "runstamp-docx-controlled-document",
      version: "1.0.0",
      required: true,
      status,
      command: "verifyControlledDocx(in-memory)",
      issues: issues.map((issue) => ({ code: issue.code, message: issue.message, severity: "error" })),
    },
  };
}

export const DOCX_CONTROLLED_DOCUMENT_MANIFEST: ExtensionManifest = {
  schemaVersion: 1,
  id: "runstamp.docx-controlled-document",
  version: "1.0.0",
  catalogItemId: "A01",
  title: "DOCX controlled-document",
  operations: [
    { name: "inspect", summary: "Inspect OPC parts, relationships, and security limits without execution.", inputKinds: ["docx-base64"], outputKinds: ["docx-inspection"] },
    { name: "import", summary: "Import searchable DOCX text into a controlled model.", inputKinds: ["docx-base64"], outputKinds: ["controlled-docx"] },
    { name: "find", summary: "Find literal text and return stable format-owned locators.", inputKinds: ["controlled-docx"], outputKinds: ["docx-locators"] },
    { name: "preview-redaction", summary: "Preview exact redaction targets without mutating bytes.", inputKinds: ["controlled-docx", "docx-locators"], outputKinds: ["docx-redaction-preview"] },
    { name: "apply-redaction", summary: "Delete located underlying WordprocessingML text.", inputKinds: ["controlled-docx", "docx-locators"], outputKinds: ["controlled-docx", "redaction-proof"] },
    { name: "export", summary: "Export deterministic DOCX bytes from the controlled model.", inputKinds: ["controlled-docx"], outputKinds: ["docx-base64"] },
    { name: "verify", summary: "Validate OOXML relationships and residual-content absence.", inputKinds: ["docx-base64", "controlled-docx"], outputKinds: ["docx-verification"] },
  ],
  warningCodes: [
    { code: DOCX_CONTROLLED_WARNING_CODES.EXTERNAL_RELATIONSHIP, description: "An external relationship was preserved but never fetched." },
    { code: DOCX_CONTROLLED_WARNING_CODES.EXECUTABLE_PART_PRESERVED, description: "A macro or ActiveX part was preserved but never executed." },
  ],
  lossCodes: [
    { code: DOCX_CONTROLLED_LOSS_CODES.OPAQUE_PART_PRESERVED, description: "A macro or OLE part is preserved as opaque bytes and is not editable in v1." },
  ],
};

function inputRecord(request: ExtensionRequest): Record<string, unknown> {
  if (!request.input || typeof request.input !== "object" || Array.isArray(request.input)) {
    throw new DocxControlledDocumentError("DOCX_INVALID_PACKAGE", `${request.operation} input must be an object.`);
  }
  return request.input as Record<string, unknown>;
}

function inputDocument(record: Record<string, unknown>): ControlledDocxDocument {
  return record.document as unknown as ControlledDocxDocument;
}

function inputLocators(record: Record<string, unknown>): DocxTextLocator[] {
  return (record.locators ?? []) as unknown as DocxTextLocator[];
}

function artifactBytes(record: Record<string, unknown>): Buffer {
  if (typeof record.artifactBase64 !== "string") throw new DocxControlledDocumentError("DOCX_INVALID_PACKAGE", "artifactBase64 is required.");
  return Buffer.from(record.artifactBase64, "base64");
}

function success(
  output: unknown,
  warnings: ExtensionDiagnostic[] = [],
  losses: ExtensionDiagnostic[] = [],
  artifacts: Array<{ name: string; mediaType: string; byteLength: number; sha256: string }> = [],
): ExtensionResult {
  return { status: "ok", output: output as JsonValue, warnings, losses, artifacts };
}

export function createDocxControlledDocumentExtension(): ExtensionDefinition {
  return {
    manifest: DOCX_CONTROLLED_DOCUMENT_MANIFEST,
    async execute(request, context) {
      try {
        const record = inputRecord(request);
        context.checkpoint({ inputBytes: Buffer.byteLength(JSON.stringify(record)), depth: 1 });
        switch (request.operation) {
          case "inspect": {
            const inspection = await inspectControlledDocx(artifactBytes(record), { maxEntries: context.budget.maxEntries, maxInputBytes: context.budget.maxInputBytes });
            return success(inspection, inspection.warnings, inspection.losses);
          }
          case "import": {
            const document = await importControlledDocx(artifactBytes(record), { artifactId: typeof record.artifactId === "string" ? record.artifactId : undefined, limits: { maxEntries: context.budget.maxEntries, maxInputBytes: context.budget.maxInputBytes } });
            return success(document, document.inspection.warnings, document.inspection.losses);
          }
          case "find":
            return success({ matches: findControlledDocx(inputDocument(record), String(record.query ?? ""), { caseSensitive: record.caseSensitive !== false, visibility: (record.visibility as DocxTrackedChangeVisibility | undefined) ?? "final" }) });
          case "preview-redaction":
            return success(previewDocxRedactions(inputDocument(record), inputLocators(record)));
          case "apply-redaction": {
            const result = await applyDocxRedactions(inputDocument(record), inputLocators(record));
            const bytes = exportControlledDocx(result.document);
            return success(result, result.warnings, result.losses, [{ name: `${result.document.artifactId}.docx`, mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", byteLength: bytes.byteLength, sha256: await hashArtifact(bytes) }]);
          }
          case "export": {
            const document = inputDocument(record);
            const bytes = exportControlledDocx(document);
            return success({ artifactBase64: bytes.toString("base64"), byteLength: bytes.byteLength, sha256: await hashArtifact(bytes) }, document.inspection.warnings, document.inspection.losses, [{ name: `${document.artifactId}.docx`, mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", byteLength: bytes.byteLength, sha256: await hashArtifact(bytes) }]);
          }
          case "verify":
            return success(await verifyControlledDocx(record.document ? inputDocument(record) : artifactBytes(record), { forbiddenText: Array.isArray(record.forbiddenText) ? record.forbiddenText.map(String) : [] }));
          default:
            return { status: "error", error: { code: "DOCX_OPERATION_UNSUPPORTED", message: `Unsupported operation ${request.operation}.`, retryable: false }, warnings: [], losses: [], artifacts: [] };
        }
      } catch (error) {
        const code = error instanceof DocxControlledDocumentError ? error.code : "DOCX_OPERATION_FAILED";
        return { status: "error", error: { code, message: error instanceof Error ? error.message : String(error), retryable: false }, warnings: [], losses: [], artifacts: [] };
      }
    },
  };
}
