import { createHash } from "node:crypto";
import { posix as posixPath } from "node:path";
import JSZip from "jszip";
import { XMLValidator } from "fast-xml-parser";
import {
  assertValidPptx,
  extractToIR,
  normalizeForHash,
  openPptx,
  type OpenedPptx,
} from "@runstamp/pptx-extractor";
import { escapeXml } from "../ooxml/drawing/xmlEscape.js";

type RoundTripJson = string | number | boolean | null | RoundTripJson[] | { [key: string]: RoundTripJson };

export type PptxTemplateLossCode =
  | "PPTX_ANIMATION_PRESERVATION_UNVERIFIED"
  | "PPTX_EXTERNAL_RELATIONSHIP_NOT_FOLLOWED"
  | "PPTX_SLOT_KIND_UNSUPPORTED";

export interface PptxTemplateLocator {
  artifactId: string;
  scheme: "pptx.slide" | "pptx.object" | "pptx.part";
  value: Array<string | number>;
}

export interface PptxTemplateLoss {
  code: PptxTemplateLossCode;
  message: string;
  locator?: PptxTemplateLocator;
}

export interface PptxTemplateRelationship {
  external: boolean;
  id: string;
  sourcePart: string;
  target: string;
  targetPart?: string;
  type: string;
}

export interface PptxTemplateObject {
  id: string;
  kind: "chart" | "group" | "image" | "shape" | "table";
  locator: PptxTemplateLocator;
  name?: string;
  slotId?: string;
  text: string;
}

export interface PptxTemplateSlide {
  index: number;
  locator: PptxTemplateLocator;
  objects: PptxTemplateObject[];
  part: string;
  text: string;
}

export interface PptxTemplateSlot {
  id: string;
  kind: "text" | "unsupported";
  locator: PptxTemplateLocator;
  value: string;
}

export interface PptxOpaquePart {
  byteLength: number;
  locator: PptxTemplateLocator;
  path: string;
  sha256: string;
}

export interface PptxTemplateCounts {
  charts: number;
  comments: number;
  layouts: number;
  masters: number;
  media: number;
  notes: number;
  objects: number;
  placeholders: number;
  relationships: number;
  slides: number;
  tables: number;
  themes: number;
}

export interface PptxTemplateInspection {
  artifactId: string;
  byteLength: number;
  canonicalPackageHash: string;
  counts: PptxTemplateCounts;
  losses: PptxTemplateLoss[];
  opaqueParts: PptxOpaquePart[];
  relationships: PptxTemplateRelationship[];
  slides: PptxTemplateSlide[];
  slots: PptxTemplateSlot[];
}

export interface PptxTemplateBudgets {
  maxEntries?: number;
  maxInputBytes?: number;
  maxObjects?: number;
  maxSlides?: number;
  maxTotalUncompressedBytes?: number;
  maxXmlPartBytes?: number;
  signal?: AbortSignal;
}

export interface PptxTemplateMutation {
  textSlots?: Record<string, string>;
  themeColors?: Record<string, string>;
}

export interface PptxTemplateDocument {
  inspection: PptxTemplateInspection;
  losses: PptxTemplateLoss[];
  mutation: PptxTemplateMutation;
  source: Buffer;
}

export interface PptxTemplateExport {
  buffer: Buffer;
  byteLength: number;
  losses: PptxTemplateLoss[];
  mediaType: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  sha256: string;
}

export interface PptxTemplateVerificationIssue {
  code:
    | "PPTX_BASELINE_COUNT_CHANGED"
    | "PPTX_MALFORMED"
    | "PPTX_OPAQUE_PART_CHANGED"
    | "PPTX_RELATIONSHIP_TARGET_MISSING";
  message: string;
  locator?: PptxTemplateLocator;
}

export interface PptxTemplateVerification {
  inspection?: PptxTemplateInspection;
  issues: PptxTemplateVerificationIssue[];
  status: "FAIL" | "PASS";
}

const DEFAULTS = {
  maxEntries: 10_000,
  maxInputBytes: 64 * 1024 * 1024,
  maxObjects: 250_000,
  maxSlides: 2_000,
  maxTotalUncompressedBytes: 256 * 1024 * 1024,
  maxXmlPartBytes: 8 * 1024 * 1024,
} as const;

export class PptxTemplateRoundTripError extends Error {
  readonly code:
    | "PPTX_ABORTED"
    | "PPTX_ACTIVE_CONTENT_REJECTED"
    | "PPTX_ENCRYPTED"
    | "PPTX_MALFORMED"
    | "PPTX_RESOURCE_LIMIT"
    | "PPTX_SLOT_NOT_FOUND"
    | "PPTX_UNSAFE_PATH";
  readonly details?: Record<string, boolean | number | string>;

  constructor(code: PptxTemplateRoundTripError["code"], message: string, details?: Record<string, boolean | number | string>) {
    super(message);
    this.name = "PptxTemplateRoundTripError";
    this.code = code;
    this.details = details;
  }
}

function sha256(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function budget<K extends keyof typeof DEFAULTS>(options: PptxTemplateBudgets | undefined, key: K): number {
  return options?.[key] ?? DEFAULTS[key];
}

function checkpoint(options?: PptxTemplateBudgets): void {
  if (options?.signal?.aborted) {
    throw new PptxTemplateRoundTripError(
      "PPTX_ABORTED",
      typeof options.signal.reason === "string" ? options.signal.reason : "PPTX round-trip operation was aborted.",
    );
  }
}

function locator(artifactId: string, scheme: PptxTemplateLocator["scheme"], ...value: Array<string | number>): PptxTemplateLocator {
  return { artifactId, scheme, value };
}

function xmlUnescape(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(xml: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(xml);
  return match ? xmlUnescape(match[1]) : undefined;
}

function textFromXml(xml: string): string {
  return Array.from(xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g), (match) => xmlUnescape(match[1])).join(" ");
}

function sourcePartForRelationships(path: string): string {
  if (path === "_rels/.rels") return "";
  const match = /^(.*)\/_rels\/([^/]+)\.rels$/.exec(path);
  return match ? `${match[1]}/${match[2]}` : path;
}

function resolveRelationshipTarget(sourcePart: string, target: string): string | undefined {
  const withoutFragment = target.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    return undefined;
  }
  const resolved = decoded.startsWith("/")
    ? posixPath.normalize(decoded.slice(1))
    : posixPath.normalize(posixPath.join(posixPath.dirname(sourcePart), decoded));
  if (!resolved || resolved === "." || resolved === ".." || resolved.startsWith("../") || resolved.startsWith("/")) return undefined;
  return resolved;
}

function parseRelationships(opened: OpenedPptx, artifactId: string): PptxTemplateRelationship[] {
  const result: PptxTemplateRelationship[] = [];
  for (const path of opened.listParts().filter((part) => part.endsWith(".rels"))) {
    const xml = opened.getPartText(path) ?? "";
    const sourcePart = sourcePartForRelationships(path);
    for (const match of xml.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?\s*>/g)) {
      const attributes = match[1];
      const target = attr(attributes, "Target") ?? "";
      const external = (attr(attributes, "TargetMode") ?? "").toLowerCase() === "external";
      result.push({
        external,
        id: attr(attributes, "Id") ?? "",
        sourcePart,
        target,
        targetPart: external ? undefined : resolveRelationshipTarget(sourcePart, target),
        type: attr(attributes, "Type") ?? "",
      });
    }
  }
  return result.sort((a, b) => `${a.sourcePart}\0${a.id}`.localeCompare(`${b.sourcePart}\0${b.id}`));
}

const KNOWN_PART = /^(?:\[Content_Types\]\.xml|_rels\/|docProps\/|ppt\/(?:presentation\.xml|_rels\/|slides\/|slideMasters\/|slideLayouts\/|theme\/|media\/|charts\/|drawings\/|embeddings\/|notesSlides\/|notesMasters\/|comments\/|commentAuthors\.xml|presProps\.xml|viewProps\.xml|tableStyles\.xml|commentAuthors\.xml|people\.xml))/;

function opaqueParts(opened: OpenedPptx, artifactId: string): PptxOpaquePart[] {
  return opened.listParts()
    .filter((path) => !KNOWN_PART.test(path))
    .map((path) => {
      const bytes = opened.getPart(path)!;
      return { byteLength: bytes.length, locator: locator(artifactId, "pptx.part", path), path, sha256: sha256(bytes) };
    });
}

function assertSafePackageParts(opened: OpenedPptx): void {
  const paths = opened.listParts();
  const contentTypes = opened.getPartText("[Content_Types].xml") ?? "";
  if (paths.some((path) => /(?:^|\/)(?:EncryptionInfo|EncryptedPackage)$/i.test(path)) || /encryptedPackage/i.test(contentTypes)) {
    throw new PptxTemplateRoundTripError("PPTX_ENCRYPTED", "Encrypted PPTX input is not supported and was not decrypted.");
  }
  const active = paths.find((path) => /(?:vbaProject\.bin|activeX\/|embeddings\/.*\.(?:bin|exe|dll|com|msi))$/i.test(path));
  if (active || /macroEnabled|oleObject/i.test(contentTypes)) {
    throw new PptxTemplateRoundTripError("PPTX_ACTIVE_CONTENT_REJECTED", `Active macro or OLE content is not accepted${active ? `: ${active}` : "."}`);
  }
}

async function safelyOpen(input: Buffer | Uint8Array, options?: PptxTemplateBudgets): Promise<OpenedPptx> {
  checkpoint(options);
  const buffer = Buffer.from(input);
  if (buffer.length > budget(options, "maxInputBytes")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Input exceeds ${budget(options, "maxInputBytes")} bytes.`);
  }
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "PPTX input is not an OPC ZIP package.");
  }
  let rawZip: JSZip;
  try {
    rawZip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  } catch (error) {
    throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `PPTX ZIP could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const files = Object.values(rawZip.files).filter((file) => !file.dir);
  if (files.length > budget(options, "maxEntries")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Archive has ${files.length} entries, exceeding ${budget(options, "maxEntries")}.`);
  }
  for (const file of files) {
    checkpoint(options);
    const unsafeName = (file as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName ?? file.name;
    const normalized = posixPath.normalize(unsafeName.replace(/\\/g, "/"));
    if (unsafeName.startsWith("/") || normalized === ".." || normalized.startsWith("../")) {
      throw new PptxTemplateRoundTripError("PPTX_UNSAFE_PATH", `Unsafe archive entry path: ${unsafeName}`);
    }
  }
  let opened: OpenedPptx;
  try {
    opened = await openPptx(buffer, {
      maxEntries: budget(options, "maxEntries"),
      maxTotalUncompressedBytes: budget(options, "maxTotalUncompressedBytes"),
    });
    assertValidPptx(opened);
  } catch (error) {
    if (error instanceof PptxTemplateRoundTripError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new PptxTemplateRoundTripError(
      /exceed|limit/i.test(message) ? "PPTX_RESOURCE_LIMIT" : "PPTX_MALFORMED",
      message,
    );
  }
  for (const path of opened.listParts()) {
    checkpoint(options);
    const part = opened.getPart(path)!;
    if ((path.endsWith(".xml") || path.endsWith(".rels")) && part.length > budget(options, "maxXmlPartBytes")) {
      throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `XML part ${path} exceeds ${budget(options, "maxXmlPartBytes")} bytes.`);
    }
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      const validity = XMLValidator.validate(part.toString("utf8"));
      if (validity !== true) {
        throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Malformed XML part ${path}: ${validity.err.msg}`);
      }
    }
  }
  assertSafePackageParts(opened);
  return opened;
}

function objectsForSlide(xml: string, path: string, artifactId: string): PptxTemplateObject[] {
  const objects: PptxTemplateObject[] = [];
  const patterns: Array<[PptxTemplateObject["kind"], RegExp]> = [
    ["shape", /<p:sp\b[\s\S]*?<\/p:sp>/g],
    ["image", /<p:pic\b[\s\S]*?<\/p:pic>/g],
    ["group", /<p:grpSp\b[\s\S]*?<\/p:grpSp>/g],
    ["table", /<p:graphicFrame\b(?=[\s\S]*?<a:tbl\b)[\s\S]*?<\/p:graphicFrame>/g],
    ["chart", /<p:graphicFrame\b(?=[\s\S]*?<(?:c:chart|cx:chart)\b)[\s\S]*?<\/p:graphicFrame>/g],
  ];
  for (const [kind, pattern] of patterns) {
    for (const match of xml.matchAll(pattern)) {
      const cNvPr = /<(?:p|a):cNvPr\b([^>]*)\/?\s*>/.exec(match[0])?.[1] ?? "";
      const id = attr(cNvPr, "id") ?? `${kind}-${objects.length + 1}`;
      const name = attr(cNvPr, "name") ?? attr(cNvPr, "descr");
      const slotId = name?.startsWith("runstamp:slot:") ? name.slice("runstamp:slot:".length) : undefined;
      objects.push({ id, kind, locator: locator(artifactId, "pptx.object", path, id), name, slotId, text: textFromXml(match[0]) });
    }
  }
  return objects.sort((a, b) => a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind));
}

export async function inspectPptxTemplate(input: Buffer | Uint8Array, options?: PptxTemplateBudgets): Promise<PptxTemplateInspection> {
  const buffer = Buffer.from(input);
  const artifactId = sha256(buffer);
  const opened = await safelyOpen(buffer, options);
  const extracted = extractToIR(opened);
  const slidePaths = opened.listParts().filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => Number(/\d+/.exec(a)?.[0]) - Number(/\d+/.exec(b)?.[0]));
  if (slidePaths.length > budget(options, "maxSlides")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Presentation has ${slidePaths.length} slides, exceeding ${budget(options, "maxSlides")}.`);
  }
  const slides = slidePaths.map((path, index): PptxTemplateSlide => {
    checkpoint(options);
    const xml = opened.getPartText(path) ?? "";
    return {
      index: index + 1,
      locator: locator(artifactId, "pptx.slide", path),
      objects: objectsForSlide(xml, path, artifactId),
      part: path,
      text: extracted.slides[index]?.text ?? textFromXml(xml),
    };
  });
  const objectCount = slides.reduce((sum, slide) => sum + slide.objects.length, 0);
  if (objectCount > budget(options, "maxObjects")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Presentation has ${objectCount} objects, exceeding ${budget(options, "maxObjects")}.`);
  }
  const relationships = parseRelationships(opened, artifactId);
  const losses: PptxTemplateLoss[] = [];
  if (slides.some((slide) => (opened.getPartText(slide.part) ?? "").includes("<p:timing"))) {
    losses.push({ code: "PPTX_ANIMATION_PRESERVATION_UNVERIFIED", message: "Timing XML is preserved unchanged, but general PowerPoint animation preservation is not claimed." });
  }
  for (const relationship of relationships.filter((entry) => entry.external)) {
    losses.push({
      code: "PPTX_EXTERNAL_RELATIONSHIP_NOT_FOLLOWED",
      message: `External relationship ${relationship.id} from ${relationship.sourcePart || "/"} was inventoried but not dereferenced.`,
      locator: locator(artifactId, "pptx.part", relationship.sourcePart || "_rels/.rels", relationship.id),
    });
  }
  const allXml = opened.listParts().filter((path) => path.endsWith(".xml")).map((path) => opened.getPartText(path) ?? "").join("\n");
  const counts: PptxTemplateCounts = {
    charts: opened.listParts().filter((path) => /^ppt\/charts\/(?:chart|chartEx)\d+\.xml$/.test(path)).length,
    comments: opened.listParts().filter((path) => /^ppt\/comments\/comment\d+\.xml$/.test(path)).length,
    layouts: opened.listParts().filter((path) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(path)).length,
    masters: opened.listParts().filter((path) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(path)).length,
    media: opened.listParts().filter((path) => path.startsWith("ppt/media/")).length,
    notes: opened.listParts().filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path)).length,
    objects: objectCount,
    placeholders: Array.from(allXml.matchAll(/<p:ph\b/g)).length,
    relationships: relationships.length,
    slides: slides.length,
    tables: slides.reduce((sum, slide) => sum + slide.objects.filter((object) => object.kind === "table").length, 0),
    themes: opened.listParts().filter((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path)).length,
  };
  const slots = slides.flatMap((slide) => slide.objects
    .filter((object): object is PptxTemplateObject & { slotId: string } => Boolean(object.slotId))
    .map((object): PptxTemplateSlot => ({ id: object.slotId, kind: object.kind === "shape" ? "text" : "unsupported", locator: object.locator, value: object.text })));
  for (const slot of slots.filter((entry) => entry.kind === "unsupported")) {
    losses.push({
      code: "PPTX_SLOT_KIND_UNSUPPORTED",
      message: `Designated slot ${slot.id} is preserved, but its object kind is not mutable in v1.`,
      locator: slot.locator,
    });
  }
  if (new Set(slots.map((slot) => slot.id)).size !== slots.length) {
    throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "Designated template slot IDs must be unique.");
  }
  return {
    artifactId,
    byteLength: buffer.length,
    canonicalPackageHash: normalizeForHash(opened).digest,
    counts,
    losses,
    opaqueParts: opaqueParts(opened, artifactId),
    relationships,
    slides,
    slots,
  };
}

export async function importPptxTemplate(input: Buffer | Uint8Array, options?: PptxTemplateBudgets): Promise<PptxTemplateDocument> {
  const source = Buffer.from(input);
  const inspection = await inspectPptxTemplate(source, options);
  return { inspection, losses: [...inspection.losses], mutation: {}, source };
}

export async function mutatePptxTemplate(document: PptxTemplateDocument, mutation: PptxTemplateMutation): Promise<PptxTemplateDocument> {
  const knownSlots = new Set(document.inspection.slots.filter((slot) => slot.kind === "text").map((slot) => slot.id));
  for (const [slotId, value] of Object.entries(mutation.textSlots ?? {})) {
    if (!knownSlots.has(slotId)) throw new PptxTemplateRoundTripError("PPTX_SLOT_NOT_FOUND", `Template slot ${slotId} was not designated.`);
    if (typeof value !== "string") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Template slot ${slotId} requires a string value.`);
  }
  for (const [from, to] of Object.entries(mutation.themeColors ?? {})) {
    if (!/^[A-Fa-f0-9]{6}$/.test(from) || !/^[A-Fa-f0-9]{6}$/.test(to)) {
      throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Theme color mutation ${from} -> ${to} must use six hexadecimal digits.`);
    }
  }
  return {
    ...document,
    mutation: {
      textSlots: { ...document.mutation.textSlots, ...mutation.textSlots },
      themeColors: { ...document.mutation.themeColors, ...mutation.themeColors },
    },
  };
}

function replaceSlotText(xml: string, slotId: string, value: string): { changed: boolean; xml: string } {
  let changed = false;
  const result = xml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (shape) => {
    const cNvPr = /<p:cNvPr\b([^>]*)\/?\s*>/.exec(shape)?.[1] ?? "";
    const name = attr(cNvPr, "name") ?? attr(cNvPr, "descr");
    if (name !== `runstamp:slot:${slotId}`) return shape;
    let first = true;
    const next = shape.replace(/(<a:t(?:\s[^>]*)?>)[\s\S]*?(<\/a:t>)/g, (_text, start: string, end: string) => {
      const replacement = first ? escapeXml(value) : "";
      first = false;
      return `${start}${replacement}${end}`;
    });
    if (first) throw new PptxTemplateRoundTripError("PPTX_MALFORMED", `Text slot ${slotId} has no editable text run.`);
    changed = true;
    return next;
  });
  return { changed, xml: result };
}

function replaceThemeColors(xml: string, colors: Record<string, string>): string {
  return xml.replace(/\bval="([A-Fa-f0-9]{6})"/g, (whole, value: string) => {
    const replacement = colors[value.toUpperCase()] ?? colors[value.toLowerCase()] ?? colors[value];
    return replacement ? `val="${replacement.toUpperCase()}"` : whole;
  });
}

export async function exportPptxTemplate(document: PptxTemplateDocument, options?: PptxTemplateBudgets): Promise<PptxTemplateExport> {
  checkpoint(options);
  const sourceZip = await JSZip.loadAsync(document.source, { checkCRC32: true });
  const output = new JSZip();
  const pendingSlots = new Set(Object.keys(document.mutation.textSlots ?? {}));
  const fixedDate = new Date("1980-01-01T00:00:00.000Z");
  for (const path of Object.keys(sourceZip.files).filter((entry) => !sourceZip.files[entry].dir).sort()) {
    checkpoint(options);
    let bytes = await sourceZip.files[path].async("nodebuffer");
    if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
      let xml = bytes.toString("utf8");
      for (const [slotId, value] of Object.entries(document.mutation.textSlots ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
        const replacement = replaceSlotText(xml, slotId, value);
        xml = replacement.xml;
        if (replacement.changed) pendingSlots.delete(slotId);
      }
      bytes = Buffer.from(xml);
    } else if (/^ppt\/theme\/theme\d+\.xml$/.test(path) && document.mutation.themeColors) {
      bytes = Buffer.from(replaceThemeColors(bytes.toString("utf8"), document.mutation.themeColors));
    }
    output.file(path, bytes, { createFolders: false, date: fixedDate });
  }
  if (pendingSlots.size > 0) throw new PptxTemplateRoundTripError("PPTX_SLOT_NOT_FOUND", `Designated slots were not found during export: ${Array.from(pendingSlots).sort().join(", ")}`);
  const buffer = await output.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    platform: "UNIX",
  });
  if (buffer.length > budget(options, "maxInputBytes")) {
    throw new PptxTemplateRoundTripError("PPTX_RESOURCE_LIMIT", `Output exceeds ${budget(options, "maxInputBytes")} bytes.`);
  }
  return {
    buffer,
    byteLength: buffer.length,
    losses: [...document.losses],
    mediaType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sha256: sha256(buffer),
  };
}

function missingRelationshipIssues(inspection: PptxTemplateInspection, partPaths: Set<string>): PptxTemplateVerificationIssue[] {
  const issues: PptxTemplateVerificationIssue[] = [];
  for (const relationship of inspection.relationships) {
    if (relationship.external) continue;
    if (!relationship.targetPart || !partPaths.has(relationship.targetPart)) {
      issues.push({
        code: "PPTX_RELATIONSHIP_TARGET_MISSING",
        message: `Relationship ${relationship.id} from ${relationship.sourcePart || "/"} targets missing or escaping part ${relationship.target}.`,
        locator: locator(inspection.artifactId, "pptx.part", relationship.sourcePart || "_rels/.rels", relationship.id),
      });
    }
  }
  return issues;
}

export async function verifyPptxTemplate(
  input: Buffer | Uint8Array,
  baseline?: PptxTemplateInspection,
  options?: PptxTemplateBudgets,
): Promise<PptxTemplateVerification> {
  let inspection: PptxTemplateInspection;
  let opened: OpenedPptx;
  try {
    inspection = await inspectPptxTemplate(input, options);
    opened = await safelyOpen(input, options);
  } catch (error) {
    return {
      issues: [{ code: "PPTX_MALFORMED", message: error instanceof Error ? error.message : String(error) }],
      status: "FAIL",
    };
  }
  const issues = missingRelationshipIssues(inspection, new Set(opened.listParts()));
  if (baseline) {
    for (const key of Object.keys(baseline.counts) as Array<keyof PptxTemplateCounts>) {
      if (inspection.counts[key] !== baseline.counts[key]) {
        issues.push({ code: "PPTX_BASELINE_COUNT_CHANGED", message: `${key} changed from ${baseline.counts[key]} to ${inspection.counts[key]}.` });
      }
    }
    const actualOpaque = new Map(inspection.opaqueParts.map((part) => [part.path, part.sha256]));
    for (const expected of baseline.opaqueParts) {
      if (actualOpaque.get(expected.path) !== expected.sha256) {
        issues.push({ code: "PPTX_OPAQUE_PART_CHANGED", message: `Opaque part ${expected.path} was not preserved byte-for-byte.`, locator: expected.locator });
      }
    }
  }
  return { inspection, issues, status: issues.length === 0 ? "PASS" : "FAIL" };
}

interface RoundTripExtensionContext {
  budget: { maxEntries: number; maxInputBytes: number };
  checkpoint(usage: { entries?: number; inputBytes?: number; outputBytes?: number }): void;
  reportProgress(progress: { completed: number; message?: string; total: number }): void;
  signal: AbortSignal;
}

interface RoundTripExtensionRequest {
  input: RoundTripJson;
  operation: string;
}

interface RoundTripExtensionResult {
  artifacts: Array<{ byteLength: number; mediaType: string; name: string; sha256: string }>;
  error?: { code: string; message: string; retryable: boolean };
  losses: Array<{ code: string; message: string; locator?: PptxTemplateLocator }>;
  output?: RoundTripJson;
  status: "error" | "ok";
  warnings: Array<{ code: string; message: string }>;
}

function inputRecord(input: RoundTripJson): Record<string, RoundTripJson> {
  if (!input || Array.isArray(input) || typeof input !== "object") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "Extension input must be an object.");
  return input;
}

function inputBuffer(input: Record<string, RoundTripJson>): Buffer {
  if (typeof input.sourceBase64 !== "string") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "sourceBase64 is required.");
  return Buffer.from(input.sourceBase64, "base64");
}

function jsonInspection(inspection: PptxTemplateInspection): RoundTripJson {
  return JSON.parse(JSON.stringify(inspection)) as RoundTripJson;
}

export function createPptxTemplateRoundTripExtension() {
  return {
    manifest: {
      schemaVersion: 1 as const,
      id: "runstamp.pptx-template-round-trip",
      version: "1.0.0",
      catalogItemId: "A04" as const,
      title: "PPTX template round-trip",
      operations: [
        { name: "inspect", summary: "Inspect a PPTX template safely.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-inspection"] },
        { name: "import", summary: "Import a source-bound PPTX template.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-template-model"] },
        { name: "mutate", summary: "Mutate designated PPTX slots and theme tokens.", inputKinds: ["pptx-base64", "pptx-mutation"], outputKinds: ["pptx-base64"] },
        { name: "export", summary: "Export a deterministic PPTX template package.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-base64"] },
        { name: "verify", summary: "Verify PPTX package and relationship integrity.", inputKinds: ["pptx-base64"], outputKinds: ["pptx-verification"] },
      ],
      warningCodes: [{ code: "PPTX_NO_MUTATIONS", description: "Export completed without requested content mutations." }],
      lossCodes: [
        { code: "PPTX_ANIMATION_PRESERVATION_UNVERIFIED", description: "Unchanged timing parts are preserved without a general animation compatibility claim." },
        { code: "PPTX_EXTERNAL_RELATIONSHIP_NOT_FOLLOWED", description: "External relationship declarations are not dereferenced." },
        { code: "PPTX_SLOT_KIND_UNSUPPORTED", description: "The designated slot kind is not mutable in v1." },
      ],
    },
    async execute(request: RoundTripExtensionRequest, context: RoundTripExtensionContext): Promise<RoundTripExtensionResult> {
      try {
        const input = inputRecord(request.input);
        const source = inputBuffer(input);
        context.checkpoint({ inputBytes: source.length });
        context.reportProgress({ completed: 1, total: 3, message: "PPTX package opened" });
        const options: PptxTemplateBudgets = {
          maxEntries: context.budget.maxEntries,
          maxInputBytes: context.budget.maxInputBytes,
          signal: context.signal,
        };
        if (request.operation === "inspect" || request.operation === "import") {
          const inspection = await inspectPptxTemplate(source, options);
          context.reportProgress({ completed: 3, total: 3, message: "PPTX inspected" });
          return { status: "ok", output: jsonInspection(inspection), warnings: [], losses: inspection.losses, artifacts: [] };
        }
        if (request.operation === "verify") {
          const verification = await verifyPptxTemplate(source, undefined, options);
          context.reportProgress({ completed: 3, total: 3, message: "PPTX verified" });
          return {
            status: "ok",
            output: JSON.parse(JSON.stringify(verification)) as RoundTripJson,
            warnings: [],
            losses: verification.inspection?.losses ?? [],
            artifacts: [],
          };
        }
        const document = await importPptxTemplate(source, options);
        let mutation: PptxTemplateMutation = {};
        if (request.operation === "mutate") {
          const rawMutation = input.mutation;
          if (!rawMutation || Array.isArray(rawMutation) || typeof rawMutation !== "object") throw new PptxTemplateRoundTripError("PPTX_MALFORMED", "mutation object is required.");
          mutation = rawMutation as unknown as PptxTemplateMutation;
        }
        const mutated = await mutatePptxTemplate(document, mutation);
        const exported = await exportPptxTemplate(mutated, options);
        context.checkpoint({ outputBytes: exported.byteLength });
        context.reportProgress({ completed: 3, total: 3, message: "PPTX exported" });
        return {
          status: "ok",
          output: { sourceBase64: exported.buffer.toString("base64"), sha256: exported.sha256 },
          warnings: Object.keys(mutation.textSlots ?? {}).length + Object.keys(mutation.themeColors ?? {}).length === 0
            ? [{ code: "PPTX_NO_MUTATIONS", message: "PPTX was deterministically repackaged without content mutations." }]
            : [],
          losses: exported.losses,
          artifacts: [{ byteLength: exported.byteLength, mediaType: exported.mediaType, name: "round-trip.pptx", sha256: exported.sha256 }],
        };
      } catch (error) {
        return {
          status: "error",
          error: { code: error instanceof PptxTemplateRoundTripError ? error.code : "PPTX_MALFORMED", message: error instanceof Error ? error.message : String(error), retryable: false },
          warnings: [],
          losses: [],
          artifacts: [],
        };
      }
    },
  };
}
