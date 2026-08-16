import { SemanticDiffError, compareSemanticDocuments, type JsonValue, type SemanticCompareOptions, type SemanticDocument, type SemanticNode } from "./semantic.js";

export interface SemanticArtifactSource<TInspection = JsonValue> {
  artifactId: string;
  artifactKind: "docx" | "pptx";
  versionId: string;
  declaredSha256: string;
  sourceBytes: Uint8Array;
  inspection: TInspection;
}

export interface SemanticArtifactAdapter<TInspection = JsonValue> {
  readonly artifactKind: "docx" | "pptx";
  readonly inspectionKind: string;
  adapt(source: SemanticArtifactSource<TInspection>, computedSha256: string): SemanticDocument | Promise<SemanticDocument>;
}

function toJson(value: unknown, label: string): JsonValue {
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("not JSON");
    return JSON.parse(encoded) as JsonValue;
  } catch {
    throw new SemanticDiffError("INVALID_DOCUMENT", `${label} must be safe JSON.`);
  }
}

function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknown) throw new SemanticDiffError("INVALID_DOCUMENT", `${label} contains unsupported property ${unknown}.`);
}

async function digest(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes);
  const result = await crypto.subtle.digest("SHA-256", owned.buffer);
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function adaptSemanticArtifact<TInspection>(source: SemanticArtifactSource<TInspection>, adapter: SemanticArtifactAdapter<TInspection>, options: SemanticCompareOptions = {}): Promise<SemanticDocument> {
  if (options.signal?.aborted || options.context?.signal.aborted) throw new SemanticDiffError("ABORTED", "Semantic artifact adaptation was aborted.");
  if (!(source.sourceBytes instanceof Uint8Array) || source.sourceBytes.byteLength === 0) throw new SemanticDiffError("INVALID_DOCUMENT", "Exact non-empty source bytes are required for version binding.");
  const inspectionBytes = new TextEncoder().encode(JSON.stringify(source.inspection)).byteLength;
  const inputBytes = source.sourceBytes.byteLength + inspectionBytes;
  const maxInputBytes = options.maxInputBytes ?? options.context?.budget.maxInputBytes ?? 32 * 1024 * 1024;
  if (inputBytes > maxInputBytes) throw new SemanticDiffError("RESOURCE_LIMIT", `Source and inspection bytes ${inputBytes} exceeds ${maxInputBytes}.`);
  options.context?.checkpoint({ inputBytes });
  if (source.artifactKind !== adapter.artifactKind) throw new SemanticDiffError("INVALID_DOCUMENT", `Adapter ${adapter.inspectionKind} cannot inspect ${source.artifactKind}.`);
  const computed = await digest(source.sourceBytes);
  if (computed !== source.declaredSha256) throw new SemanticDiffError("VERSION_MISMATCH", `Declared source SHA-256 does not match ${source.artifactId} bytes.`);
  const document = await adapter.adapt(source, computed);
  if (document.artifactId !== source.artifactId || document.artifactKind !== source.artifactKind || document.version.id !== source.versionId || document.version.sha256 !== computed) {
    throw new SemanticDiffError("VERSION_MISMATCH", `Adapter ${adapter.inspectionKind} returned a stale or cross-artifact binding.`);
  }
  return document;
}

export async function compareArtifactSources<TInspection>(before: SemanticArtifactSource<TInspection>, after: SemanticArtifactSource<TInspection>, adapter: SemanticArtifactAdapter<TInspection>, options: SemanticCompareOptions = {}) {
  const [left, right] = await Promise.all([adaptSemanticArtifact(before, adapter, options), adaptSemanticArtifact(after, adapter, options)]);
  return compareSemanticDocuments(left, right, options);
}

export interface DocxControlledInspectionOutput {
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
  relationships: unknown[];
  features: {
    sections: number; paragraphs: number; runs: number; tables: number; styles: number;
    numberingDefinitions: number; headers: number; footers: number; footnotes: number;
    endnotes: number; comments: number; trackedInsertions: number; trackedDeletions: number;
    hyperlinks: number;
  };
  warnings: unknown[];
  losses: unknown[];
}

export interface ControlledDocxPartOutput { name: string; text: string; paragraphCount: number; xml: string }
export interface ControlledDocxDocumentOutput {
  schemaVersion: 1;
  artifactId: string;
  sourceSha256: string;
  packageBase64: string;
  inspection: DocxControlledInspectionOutput;
  parts: ControlledDocxPartOutput[];
}

async function docxPartNode(part: ControlledDocxPartOutput, sourceHash: string): Promise<SemanticNode> {
  assertExactKeys(part, ["name", "text", "paragraphCount", "xml"], "Controlled DOCX part");
  if (!part.name || typeof part.text !== "string" || !Number.isInteger(part.paragraphCount) || typeof part.xml !== "string") {
    throw new SemanticDiffError("INVALID_DOCUMENT", "Controlled DOCX part is malformed.");
  }
  return {
    id: `docx-part:${part.name}`,
    kind: "docx-part",
    locator: { artifactId: sourceHash, scheme: "docx-ooxml-part-v1", value: [part.name] },
    text: part.text,
    data: { paragraphCount: part.paragraphCount, xmlSha256: await digest(new TextEncoder().encode(part.xml)) },
  };
}

export const docxInspectionAdapter: SemanticArtifactAdapter<ControlledDocxDocumentOutput> = {
  artifactKind: "docx",
  inspectionKind: "runstamp.a01.controlled-docx-document.v1",
  async adapt(source, computedSha256) {
    const document = source.inspection;
    if (document && typeof document === "object") assertExactKeys(document, ["schemaVersion", "artifactId", "sourceSha256", "packageBase64", "inspection", "parts"], "Controlled DOCX document");
    if (document?.schemaVersion !== 1 || document.artifactId !== source.artifactId || document.sourceSha256 !== computedSha256 || document.inspection?.sha256 !== computedSha256) {
      throw new SemanticDiffError("VERSION_MISMATCH", "Controlled DOCX document is not bound to the supplied artifact and exact source bytes.");
    }
    assertExactKeys(document.inspection, ["sha256", "byteLength", "entryCount", "uncompressedBytes", "partNames", "searchableParts", "metadataParts", "mediaParts", "executableParts", "oleParts", "relationships", "features", "warnings", "losses"], "Controlled DOCX inspection");
    const packageHash = await digest(Uint8Array.from(Buffer.from(document.packageBase64, "base64")));
    if (packageHash !== computedSha256 || document.inspection.byteLength !== source.sourceBytes.byteLength) {
      throw new SemanticDiffError("VERSION_MISMATCH", "Controlled DOCX packageBase64 or byte length is stale.");
    }
    const inspection = toJson(document.inspection, "Controlled DOCX inspection") as Record<string, JsonValue>;
    return {
      schemaVersion: 1,
      artifactId: source.artifactId,
      artifactKind: "docx",
      version: { id: source.versionId, sha256: computedSha256 },
      nodes: [
        { id: "docx:inspection", kind: "docx-inspection", locator: { artifactId: computedSha256, scheme: "docx-controlled-inspection-v1", value: ["inspection"] }, data: inspection },
        ...await Promise.all(document.parts.map((part) => docxPartNode(part, computedSha256))),
      ],
    };
  },
};

export interface PptxTemplateLocatorOutput { artifactId: string; scheme: "pptx.slide" | "pptx.object" | "pptx.part"; value: Array<string | number> }
export interface PptxTemplateObjectOutput { id: string; kind: "chart" | "group" | "image" | "shape" | "table"; locator: PptxTemplateLocatorOutput; name?: string; slotId?: string; text: string }
export interface PptxTemplateSlideOutput { index: number; locator: PptxTemplateLocatorOutput; objects: PptxTemplateObjectOutput[]; part: string; text: string }
export interface PptxInspectionOutput {
  artifactId: string;
  byteLength: number;
  canonicalPackageHash: string;
  counts: {
    charts: number; comments: number; layouts: number; masters: number; media: number; notes: number;
    objects: number; placeholders: number; relationships: number; slides: number; tables: number; themes: number;
  };
  losses: unknown[];
  opaqueParts: unknown[];
  relationships: unknown[];
  slides: PptxTemplateSlideOutput[];
  slots: unknown[];
}

function pptxObjectNode(object: PptxTemplateObjectOutput, slidePart: string, sourceHash: string): SemanticNode {
  assertExactKeys(object, ["id", "kind", "locator", "name", "slotId", "text"], "PPTX object");
  if (object.locator && typeof object.locator === "object") assertExactKeys(object.locator, ["artifactId", "scheme", "value"], "PPTX object locator");
  if (!object.id || !object.kind || typeof object.text !== "string" || object.locator?.artifactId !== sourceHash || object.locator.scheme !== "pptx.object") {
    throw new SemanticDiffError("INVALID_DOCUMENT", `PPTX object in ${slidePart} is malformed or stale.`);
  }
  return {
    id: `pptx-object:${slidePart}:${object.id}`,
    kind: object.kind,
    locator: object.locator,
    text: object.text,
    data: { name: object.name ?? null, slotId: object.slotId ?? null },
  };
}

export const pptxInspectionAdapter: SemanticArtifactAdapter<PptxInspectionOutput> = {
  artifactKind: "pptx",
  inspectionKind: "runstamp.a04.pptx-template-inspection.v1",
  adapt(source, computedSha256) {
    const inspection = source.inspection;
    if (inspection && typeof inspection === "object") assertExactKeys(inspection, ["artifactId", "byteLength", "canonicalPackageHash", "counts", "losses", "opaqueParts", "relationships", "slides", "slots"], "PPTX template inspection");
    if (inspection?.artifactId !== computedSha256 || inspection.byteLength !== source.sourceBytes.byteLength || !Array.isArray(inspection.slides)) {
      throw new SemanticDiffError("VERSION_MISMATCH", "PPTX template inspection is not bound to the exact source bytes.");
    }
    const metadata = toJson({ canonicalPackageHash: inspection.canonicalPackageHash, counts: inspection.counts, losses: inspection.losses, opaqueParts: inspection.opaqueParts, relationships: inspection.relationships, slots: inspection.slots }, "PPTX inspection metadata");
    return {
      schemaVersion: 1,
      artifactId: source.artifactId,
      artifactKind: "pptx",
      version: { id: source.versionId, sha256: computedSha256 },
      nodes: [
        { id: "pptx:inspection", kind: "pptx-inspection", locator: { artifactId: computedSha256, scheme: "pptx.part", value: ["[Content_Types].xml"] }, data: metadata },
        ...inspection.slides.map((slide) => {
        assertExactKeys(slide, ["index", "locator", "objects", "part", "text"], "PPTX slide");
        if (slide.locator && typeof slide.locator === "object") assertExactKeys(slide.locator, ["artifactId", "scheme", "value"], "PPTX slide locator");
        if (!slide.part || !Number.isInteger(slide.index) || typeof slide.text !== "string" || slide.locator?.artifactId !== computedSha256 || slide.locator.scheme !== "pptx.slide") {
          throw new SemanticDiffError("INVALID_DOCUMENT", "PPTX slide inspection is malformed or stale.");
        }
        return {
          id: `pptx-slide:${slide.part}`,
          kind: "slide",
          locator: slide.locator,
          text: slide.text,
          data: { index: slide.index, part: slide.part },
          children: slide.objects.map((object) => pptxObjectNode(object, slide.part, computedSha256)),
        };
      })],
    };
  },
};
