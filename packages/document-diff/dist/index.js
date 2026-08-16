import { create } from 'jsondiffpatch';

// src/index.ts

// src/semantic.ts
var SHA256 = /^[a-f0-9]{64}$/;
var SAFE_KEY = /^(?!__proto__$)(?!prototype$)(?!constructor$).+/;
var categories = ["insert", "delete", "move", "text", "style", "data", "comment", "structure"];
var SemanticDiffError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "SemanticDiffError";
  }
};
function checkpoint(options, entries, depth) {
  if (options.signal?.aborted || options.context?.signal.aborted) throw new SemanticDiffError("ABORTED", "Semantic comparison was aborted.");
  const maxEntries = options.maxEntries ?? options.context?.budget.maxEntries ?? 1e5;
  const maxDepth = options.maxDepth ?? options.context?.budget.maxDepth ?? 128;
  if (entries > maxEntries) throw new SemanticDiffError("RESOURCE_LIMIT", `Node count ${entries} exceeds ${maxEntries}.`);
  if (depth > maxDepth) throw new SemanticDiffError("RESOURCE_LIMIT", `Node depth ${depth} exceeds ${maxDepth}.`);
  options.context?.checkpoint({ entries, depth });
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
async function sha256(bytes) {
  const owned = Uint8Array.from(bytes);
  const digest2 = await crypto.subtle.digest("SHA-256", owned.buffer);
  return [...new Uint8Array(digest2)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function canonicalHash(value) {
  return sha256(new TextEncoder().encode(canonical(value)));
}
function jsonEqual(left, right) {
  return left === void 0 ? right === void 0 : right !== void 0 && canonical(left) === canonical(right);
}
function ensureSafeJson(value, label, seen = /* @__PURE__ */ new Set()) {
  if (value === void 0) return;
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") throw new SemanticDiffError("INVALID_DOCUMENT", `${label} must contain only JSON values.`);
  if (seen.has(value)) throw new SemanticDiffError("INVALID_DOCUMENT", `${label} cannot contain cycles.`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => ensureSafeJson(entry, `${label}[${index}]`, seen));
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (!SAFE_KEY.test(key)) throw new SemanticDiffError("INVALID_DOCUMENT", `${label} contains unsafe key ${key}.`);
      ensureSafeJson(entry, `${label}.${key}`, seen);
    }
  }
  seen.delete(value);
}
function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}
function validateLocator(locator, document, nodeId) {
  const expectedSchemes = document.artifactKind === "docx" ? /* @__PURE__ */ new Set(["docx.node", "docx-ooxml-part-v1", "docx-controlled-inspection-v1"]) : /* @__PURE__ */ new Set(["pptx.node", "pptx.slide", "pptx.object", "pptx.part"]);
  const validSegments = Array.isArray(locator?.value) && locator.value.every((segment) => typeof segment === "string" ? segment.length > 0 : Number.isInteger(segment) && segment >= 0);
  if (!locator || ![document.artifactId, document.version.sha256].includes(locator.artifactId) || !expectedSchemes.has(locator.scheme) || locator.value.length === 0 || !validSegments) {
    throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${nodeId} has an invalid or cross-artifact locator.`);
  }
}
function flatten(document, options) {
  if (document?.schemaVersion !== 1 || !document.artifactId || !["docx", "pptx"].includes(document.artifactKind)) {
    throw new SemanticDiffError("INVALID_DOCUMENT", "Only schema v1 DOCX and PPTX semantic documents are supported.");
  }
  if (!document.version?.id || !SHA256.test(document.version.sha256)) throw new SemanticDiffError("INVALID_DOCUMENT", "Version ID and lowercase SHA-256 are required.");
  if (!Array.isArray(document.nodes)) throw new SemanticDiffError("INVALID_DOCUMENT", "nodes must be an array.");
  const result = /* @__PURE__ */ new Map();
  const visit = (nodes, parentId, depth) => {
    checkpoint(options, result.size + nodes.length, depth);
    nodes.forEach((node, index) => {
      if (!node || typeof node.id !== "string" || node.id.length === 0 || typeof node.kind !== "string" || node.kind.length === 0) {
        throw new SemanticDiffError("INVALID_DOCUMENT", "Every node requires a non-empty stable id and kind.");
      }
      if (result.has(node.id)) throw new SemanticDiffError("AMBIGUOUS_ALIGNMENT", `Duplicate stable node ID ${node.id}.`);
      const supportedKeys = /* @__PURE__ */ new Set(["id", "kind", "locator", "text", "style", "data", "comments", "children"]);
      const unknownKey = Object.keys(node).find((key) => !supportedKeys.has(key));
      if (unknownKey) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id} contains unsupported property ${unknownKey}.`);
      if (node.text !== void 0 && typeof node.text !== "string") throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.text must be a string.`);
      if (node.style !== void 0 && (node.style === null || Array.isArray(node.style) || typeof node.style !== "object")) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.style must be an object.`);
      if (node.comments !== void 0 && !Array.isArray(node.comments)) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.comments must be an array.`);
      validateLocator(node.locator, document, node.id);
      ensureSafeJson(node.style, `node ${node.id}.style`);
      ensureSafeJson(node.data, `node ${node.id}.data`);
      ensureSafeJson(node.comments, `node ${node.id}.comments`);
      result.set(node.id, { node, parentId, index, depth });
      if (node.children !== void 0 && !Array.isArray(node.children)) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.children must be an array.`);
      visit(node.children ?? [], node.id, depth + 1);
    });
  };
  visit(document.nodes, null, 1);
  return result;
}
function cleanStyle(style, ignored) {
  if (!style) return void 0;
  return Object.fromEntries(Object.entries(style).filter(([key]) => !ignored.has(key)).sort(([a], [b]) => a.localeCompare(b)));
}
function severity(category) {
  if (category === "style" || category === "comment") return "cosmetic";
  if (category === "text" || category === "data") return "minor";
  return "major";
}
async function makeChange(input) {
  const id = await canonicalHash(input);
  return { ...input, id, severity: severity(input.category) };
}
function stats(changes) {
  const output = Object.fromEntries(categories.map((category) => [category, 0]));
  for (const change of changes) output[change.category] += 1;
  return output;
}
function commonOrdinals(own, other) {
  const groups = /* @__PURE__ */ new Map();
  for (const [id, entry] of own) {
    if (!other.has(id)) continue;
    const group = groups.get(entry.parentId) ?? [];
    group.push([id, entry]);
    groups.set(entry.parentId, group);
  }
  const ordinals = /* @__PURE__ */ new Map();
  for (const group of groups.values()) {
    group.sort(([, a], [, b]) => a.index - b.index).forEach(([id], index) => ordinals.set(id, index));
  }
  return ordinals;
}
async function compareSemanticDocuments(before, after, options = {}) {
  const maxInputBytes = options.maxInputBytes ?? options.context?.budget.maxInputBytes ?? 32 * 1024 * 1024;
  const inputBytes = new TextEncoder().encode(JSON.stringify([before, after])).byteLength;
  if (inputBytes > maxInputBytes) throw new SemanticDiffError("RESOURCE_LIMIT", `Input bytes ${inputBytes} exceeds ${maxInputBytes}.`);
  const left = flatten(before, options);
  const right = flatten(after, options);
  if (before.artifactId !== after.artifactId || before.artifactKind !== after.artifactKind) {
    throw new SemanticDiffError("VERSION_MISMATCH", "Both versions must bind the same artifact ID and kind.");
  }
  if (before.version.id === after.version.id && before.version.sha256 !== after.version.sha256) {
    throw new SemanticDiffError("VERSION_MISMATCH", "One version ID cannot bind two source hashes.");
  }
  const ignoredStyle = new Set(options.ignoreStyleProperties ?? []);
  const leftOrdinals = commonOrdinals(left, right);
  const rightOrdinals = commonOrdinals(right, left);
  const losses = [];
  if (ignoredStyle.size > 0) losses.push({ code: "NOISE_SUPPRESSED", message: `Ignored style properties: ${[...ignoredStyle].sort().join(", ")}.` });
  if (options.ignoreComments) losses.push({ code: "NOISE_SUPPRESSED", message: "Comment changes were ignored by policy." });
  const pending = [];
  const allIds = [.../* @__PURE__ */ new Set([...left.keys(), ...right.keys()])].sort();
  for (const nodeId of allIds) {
    checkpoint(options, allIds.length, Math.max(left.get(nodeId)?.depth ?? 0, right.get(nodeId)?.depth ?? 0));
    const oldEntry = left.get(nodeId);
    const newEntry = right.get(nodeId);
    if (!oldEntry) {
      pending.push(makeChange({ category: "insert", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, after: snapshot(newEntry.node) }));
      continue;
    }
    if (!newEntry) {
      pending.push(makeChange({ category: "delete", nodeId, nodeKind: oldEntry.node.kind, locator: oldEntry.node.locator, before: snapshot(oldEntry.node) }));
      continue;
    }
    if (oldEntry.parentId !== newEntry.parentId || leftOrdinals.get(nodeId) !== rightOrdinals.get(nodeId)) {
      pending.push(makeChange({ category: "move", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, fromLocator: oldEntry.node.locator, before: { parentId: oldEntry.parentId, index: oldEntry.index }, after: { parentId: newEntry.parentId, index: newEntry.index } }));
    }
    if (oldEntry.node.kind !== newEntry.node.kind) pending.push(makeChange({ category: "structure", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, before: oldEntry.node.kind, after: newEntry.node.kind }));
    if (oldEntry.node.text !== newEntry.node.text) pending.push(makeChange({ category: "text", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, before: oldEntry.node.text ?? null, after: newEntry.node.text ?? null }));
    const oldStyle = cleanStyle(oldEntry.node.style, ignoredStyle);
    const newStyle = cleanStyle(newEntry.node.style, ignoredStyle);
    if (!jsonEqual(oldStyle, newStyle)) pending.push(makeChange({ category: "style", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, before: oldStyle ?? null, after: newStyle ?? null }));
    if (!jsonEqual(oldEntry.node.data, newEntry.node.data)) pending.push(makeChange({ category: "data", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, before: oldEntry.node.data ?? null, after: newEntry.node.data ?? null }));
    if (!options.ignoreComments && !jsonEqual(oldEntry.node.comments, newEntry.node.comments)) pending.push(makeChange({ category: "comment", nodeId, nodeKind: newEntry.node.kind, locator: newEntry.node.locator, before: oldEntry.node.comments ?? null, after: newEntry.node.comments ?? null }));
  }
  const changes = (await Promise.all(pending)).sort((a, b) => canonical([a.locator.value, a.category, a.nodeId]).localeCompare(canonical([b.locator.value, b.category, b.nodeId])));
  const hashInput = { schemaVersion: 1, artifactKind: before.artifactKind, artifactId: before.artifactId, beforeVersion: before.version, afterVersion: after.version, changes, losses };
  return { ...hashInput, statistics: stats(changes), changeSetHash: await canonicalHash(hashInput) };
}
function createRedlinePayload(changeSet) {
  return { schemaVersion: 1, changeSetHash: changeSet.changeSetHash, artifactId: changeSet.artifactId, artifactKind: changeSet.artifactKind, beforeVersion: changeSet.beforeVersion, afterVersion: changeSet.afterVersion, changes: changeSet.changes.map((change) => ({ ...change, decision: "defer" })), losses: [...changeSet.losses] };
}
function decideRedlineChanges(payload, decisions) {
  const known = new Set(payload.changes.map((change) => change.id));
  for (const id of Object.keys(decisions)) if (!known.has(id)) throw new SemanticDiffError("INVALID_DOCUMENT", `Unknown change decision ${id}.`);
  return { ...payload, changes: payload.changes.map((change) => ({ ...change, decision: decisions[change.id] ?? change.decision })) };
}
var DEFAULT_INSPECTOR_TIMEOUT_MS = 3e4;
async function inspectRedlineOutput(inspector, bytes, mediaType, format, signal, timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) {
    throw new SemanticDiffError("INVALID_DOCUMENT", "Inspector timeout must be a positive 32-bit integer in milliseconds.");
  }
  if (signal?.aborted) throw new SemanticDiffError("ABORTED", "Redline export was aborted before inspection.");
  const inspectionController = new AbortController();
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    const resolveOnce = (inspection) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(inspection);
    };
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      inspectionController.abort();
      rejectOnce(new SemanticDiffError("ABORTED", "Redline export was aborted during inspection."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => {
      inspectionController.abort();
      rejectOnce(new SemanticDiffError("INSPECTOR_TIMEOUT", `Independent output inspection exceeded ${timeoutMs} ms.`));
    }, timeoutMs);
    Promise.resolve().then(() => inspector.inspect(bytes, mediaType, format, inspectionController.signal)).then(resolveOnce, rejectOnce);
  });
}
async function exportRedline(payload, format, renderer, inspector, options = {}) {
  if (options.signal?.aborted) throw new SemanticDiffError("ABORTED", "Redline export was aborted.");
  const result = await renderer.render(payload, format, options.signal);
  if (!(result.bytes instanceof Uint8Array) || !result.mediaType) throw new SemanticDiffError("INVALID_DOCUMENT", "Renderer returned invalid output.");
  if (result.bytes.byteLength > (options.maxOutputBytes ?? 64 * 1024 * 1024)) throw new SemanticDiffError("RESOURCE_LIMIT", "Rendered redline exceeds the output budget.");
  const byteHash = await sha256(result.bytes);
  const inspection = await inspectRedlineOutput(inspector, result.bytes, result.mediaType, format, options.signal, options.inspectorTimeoutMs ?? DEFAULT_INSPECTOR_TIMEOUT_MS);
  const expectedNodeIds = [...new Set(payload.changes.map((change) => change.nodeId))].sort();
  const actualNodeIds = [...new Set(inspection.changedNodeIds)].sort();
  if (inspection.format !== format || inspection.changeSetHash !== payload.changeSetHash || inspection.sourceHashes[0] !== payload.beforeVersion.sha256 || inspection.sourceHashes[1] !== payload.afterVersion.sha256 || inspection.byteLength !== result.bytes.byteLength || inspection.sha256 !== byteHash || canonical(actualNodeIds) !== canonical(expectedNodeIds)) throw new SemanticDiffError("RENDERER_BINDING_MISMATCH", "Independent output inspection did not prove exact change-set, source, node, byte, and format binding.");
  if (options.reference?.unitCount !== void 0 && inspection.unitCount !== options.reference.unitCount) throw new SemanticDiffError("RENDERER_BINDING_MISMATCH", "Rendered redline unit count failed its reference expectation.");
  for (const text of options.reference?.requiredText ?? []) if (!inspection.extractedText.includes(text)) throw new SemanticDiffError("RENDERER_BINDING_MISMATCH", `Rendered redline is missing required text: ${text}`);
  return { bytes: result.bytes, mediaType: result.mediaType, byteLength: result.bytes.byteLength, sha256: byteHash, changeSetHash: inspection.changeSetHash, losses: result.losses ?? [] };
}

// src/extension.ts
var semanticCompareManifest = {
  schemaVersion: 1,
  id: "runstamp.semantic-compare",
  version: "1.0.0",
  catalogItemId: "O03",
  title: "Semantic compare/redline",
  operations: [{ name: "compare", summary: "Compare exact DOCX or PPTX semantic versions.", inputKinds: ["runstamp.semantic-pair.v1"], outputKinds: ["runstamp.semantic-changeset.v1"] }],
  warningCodes: [],
  lossCodes: [
    { code: "NOISE_SUPPRESSED", description: "A declared noise-policy field was omitted from comparison." },
    { code: "RENDERER_LIMITATION", description: "A renderer could not represent a semantic change natively." }
  ]
};
var semanticCompareExtension = {
  manifest: semanticCompareManifest,
  async execute(request, context) {
    try {
      const input = request.input;
      const result = await compareSemanticDocuments(input.before, input.after, { ...input.options, context });
      context.checkpoint({ entries: result.changes.length, outputBytes: new TextEncoder().encode(JSON.stringify(result)).byteLength });
      return {
        status: "ok",
        output: result,
        warnings: [],
        losses: result.losses.map((loss) => ({ code: loss.code, message: loss.message, severity: "warning", locator: loss.locator })),
        artifacts: []
      };
    } catch (error) {
      return { status: "error", error: { code: "SEMANTIC_COMPARE_FAILED", message: error instanceof Error ? error.message : "Semantic comparison failed.", retryable: false }, warnings: [], losses: [], artifacts: [] };
    }
  }
};

// src/adapters.ts
function toJson(value, label) {
  try {
    const encoded = JSON.stringify(value);
    if (encoded === void 0) throw new Error("not JSON");
    return JSON.parse(encoded);
  } catch {
    throw new SemanticDiffError("INVALID_DOCUMENT", `${label} must be safe JSON.`);
  }
}
function assertExactKeys(value, allowed, label) {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknown) throw new SemanticDiffError("INVALID_DOCUMENT", `${label} contains unsupported property ${unknown}.`);
}
async function digest(bytes) {
  const owned = Uint8Array.from(bytes);
  const result = await crypto.subtle.digest("SHA-256", owned.buffer);
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function adaptSemanticArtifact(source, adapter, options = {}) {
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
async function compareArtifactSources(before, after, adapter, options = {}) {
  const [left, right] = await Promise.all([adaptSemanticArtifact(before, adapter, options), adaptSemanticArtifact(after, adapter, options)]);
  return compareSemanticDocuments(left, right, options);
}
async function docxPartNode(part, sourceHash) {
  assertExactKeys(part, ["name", "text", "paragraphCount", "xml"], "Controlled DOCX part");
  if (!part.name || typeof part.text !== "string" || !Number.isInteger(part.paragraphCount) || typeof part.xml !== "string") {
    throw new SemanticDiffError("INVALID_DOCUMENT", "Controlled DOCX part is malformed.");
  }
  return {
    id: `docx-part:${part.name}`,
    kind: "docx-part",
    locator: { artifactId: sourceHash, scheme: "docx-ooxml-part-v1", value: [part.name] },
    text: part.text,
    data: { paragraphCount: part.paragraphCount, xmlSha256: await digest(new TextEncoder().encode(part.xml)) }
  };
}
var docxInspectionAdapter = {
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
    const inspection = toJson(document.inspection, "Controlled DOCX inspection");
    return {
      schemaVersion: 1,
      artifactId: source.artifactId,
      artifactKind: "docx",
      version: { id: source.versionId, sha256: computedSha256 },
      nodes: [
        { id: "docx:inspection", kind: "docx-inspection", locator: { artifactId: computedSha256, scheme: "docx-controlled-inspection-v1", value: ["inspection"] }, data: inspection },
        ...await Promise.all(document.parts.map((part) => docxPartNode(part, computedSha256)))
      ]
    };
  }
};
function pptxObjectNode(object, slidePart, sourceHash) {
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
    data: { name: object.name ?? null, slotId: object.slotId ?? null }
  };
}
var pptxInspectionAdapter = {
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
            children: slide.objects.map((object) => pptxObjectNode(object, slide.part, computedSha256))
          };
        })
      ]
    };
  }
};

// src/index.ts
var INTERNAL_FIELD_PREFIX = "__diff";
function compareJsonDiffKeys(left, right) {
  const normalize = (value) => {
    if (value.startsWith("_")) {
      return [1, value.slice(1)];
    }
    return [0, value];
  };
  const [leftPrefix, leftValue] = normalize(left);
  const [rightPrefix, rightValue] = normalize(right);
  if (leftPrefix !== rightPrefix) {
    return leftPrefix - rightPrefix;
  }
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return left.localeCompare(right);
}
function classifyArrayDelta(delta) {
  if (delta.length === 1) {
    return "added";
  }
  if (delta.length >= 3 && delta[1] === 0 && delta[2] === 0) {
    return "removed";
  }
  if (delta.length >= 3 && delta[2] === 3) {
    return "moved";
  }
  return "modified";
}
function flattenDelta(delta, path = []) {
  if (!delta || typeof delta !== "object") {
    return [];
  }
  if (Array.isArray(delta)) {
    return [{ type: classifyArrayDelta(delta), path }];
  }
  const deltaRecord = delta;
  if (deltaRecord._t === "a") {
    const changes2 = [];
    for (const key of Object.keys(deltaRecord).filter((candidate) => candidate !== "_t").sort(compareJsonDiffKeys)) {
      const child = deltaRecord[key];
      if (key.startsWith("_")) {
        const oldIndex = Number(key.slice(1));
        if (Array.isArray(child)) {
          const childKind = classifyArrayDelta(child);
          if (childKind === "moved") {
            changes2.push({
              type: "moved",
              path: [...path, Number(child[1])],
              fromPath: [...path, oldIndex]
            });
          } else if (childKind === "removed") {
            changes2.push({
              type: "removed",
              path: [...path, oldIndex]
            });
          } else {
            changes2.push({
              type: childKind,
              path: [...path, oldIndex]
            });
          }
          continue;
        }
        changes2.push(...flattenDelta(child, [...path, oldIndex]));
        continue;
      }
      const newIndex = Number(key);
      if (Array.isArray(child) && classifyArrayDelta(child) === "added") {
        changes2.push({
          type: "added",
          path: [...path, newIndex]
        });
        continue;
      }
      changes2.push(...flattenDelta(child, [...path, newIndex]));
    }
    return changes2;
  }
  const changes = [];
  for (const key of Object.keys(deltaRecord).sort()) {
    const child = deltaRecord[key];
    if (Array.isArray(child)) {
      changes.push({
        type: classifyArrayDelta(child),
        path: [...path, key]
      });
      continue;
    }
    changes.push(...flattenDelta(child, [...path, key]));
  }
  return changes;
}
function getValueAtPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (current == null || typeof current !== "object") {
      return void 0;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return void 0;
      }
      current = current[segment];
      continue;
    }
    current = current[segment];
  }
  return current;
}
function formatPath(path) {
  return path.reduce((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }
    if (result.length === 0) {
      return segment;
    }
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      return `${result}.${segment}`;
    }
    return `${result}[${JSON.stringify(segment)}]`;
  }, "");
}
function defaultDescription(type, pathString) {
  if (type === "added") {
    return `${pathString} added`;
  }
  if (type === "removed") {
    return `${pathString} removed`;
  }
  if (type === "moved") {
    return `${pathString} moved`;
  }
  return `${pathString} modified`;
}
function defaultSeverity(type) {
  if (type === "modified") {
    return "minor";
  }
  return "major";
}
function createEmptyStatistics() {
  return {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0
  };
}
function buildStatistics(changes) {
  const statistics = createEmptyStatistics();
  for (const change of changes) {
    statistics[change.type] += 1;
  }
  return statistics;
}
function buildSummary(changes, summaryLabels, options) {
  if (options?.includeSummary === false) {
    return "";
  }
  if (changes.length === 0) {
    return "No changes";
  }
  const grouped = /* @__PURE__ */ new Map();
  for (const label of summaryLabels) {
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }
  const fragments = [...grouped.entries()].map(([label, count]) => `${count} ${label}`);
  const noun = changes.length === 1 ? "change" : "changes";
  return `${changes.length} ${noun}: ${fragments.join(", ")}`;
}
function shouldSuppressInternalPath(path, fromPath) {
  const includesInternalField = (segments) => Boolean(segments?.some((segment) => typeof segment === "string" && segment.startsWith(INTERNAL_FIELD_PREFIX)));
  return includesInternalField(path) || includesInternalField(fromPath);
}
function defaultSummaryLabel(type) {
  if (type === "added") {
    return "item added";
  }
  if (type === "removed") {
    return "item removed";
  }
  if (type === "moved") {
    return "item moved";
  }
  return "item modified";
}
function defaultObjectHash(value, index) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  return value.__diffKey ?? (typeof index === "number" ? `__index:${index}` : void 0);
}
function diffDocuments(before, after, plugin, options) {
  const normalizedBefore = plugin.normalize(before);
  const normalizedAfter = plugin.normalize(after);
  const diffPatch = create({
    objectHash: defaultObjectHash,
    arrays: {
      detectMove: true,
      includeValueOnMove: false
    }
  });
  const delta = diffPatch.diff(normalizedBefore, normalizedAfter);
  if (!delta) {
    return {
      changes: [],
      summary: options?.includeSummary === false ? "" : "No changes",
      statistics: createEmptyStatistics()
    };
  }
  const rawChanges = flattenDelta(delta);
  const changes = [];
  const summaryLabels = [];
  for (const rawChange of rawChanges) {
    const pathString = formatPath(rawChange.path);
    const fromPathString = rawChange.fromPath ? formatPath(rawChange.fromPath) : void 0;
    const context = {
      type: rawChange.type,
      path: rawChange.path,
      pathString,
      fromPath: rawChange.fromPath,
      fromPathString,
      before: rawChange.fromPath ? getValueAtPath(normalizedBefore, rawChange.fromPath) : getValueAtPath(normalizedBefore, rawChange.path),
      after: getValueAtPath(normalizedAfter, rawChange.path),
      normalizedBefore,
      normalizedAfter
    };
    if (shouldSuppressInternalPath(rawChange.path, rawChange.fromPath) || plugin.shouldSuppress?.(context)) {
      continue;
    }
    const interpreted = plugin.interpretChange?.(context);
    if (interpreted === null) {
      continue;
    }
    changes.push({
      type: rawChange.type,
      path: pathString,
      description: interpreted?.description ?? defaultDescription(rawChange.type, pathString),
      before: context.before,
      after: context.after,
      severity: interpreted?.severity ?? defaultSeverity(rawChange.type)
    });
    summaryLabels.push(interpreted?.summaryLabel ?? defaultSummaryLabel(rawChange.type));
  }
  const statistics = buildStatistics(changes);
  return {
    changes,
    summary: buildSummary(changes, summaryLabels, options),
    statistics
  };
}
function createDiffKey(...parts) {
  return parts.filter((part) => part !== void 0 && part !== null && part !== "").join(":");
}
function isInternalDiffField(segment) {
  return typeof segment === "string" && segment.startsWith(INTERNAL_FIELD_PREFIX);
}

export { SemanticDiffError, adaptSemanticArtifact, compareArtifactSources, compareSemanticDocuments, createDiffKey, createRedlinePayload, decideRedlineChanges, diffDocuments, docxInspectionAdapter, exportRedline, isInternalDiffField, pptxInspectionAdapter, semanticCompareExtension, semanticCompareManifest };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map