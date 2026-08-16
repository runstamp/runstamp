export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface ExtensionLocator { artifactId: string; scheme: string; value: Array<string | number> }
export interface SemanticExecutionContext {
  readonly signal: AbortSignal;
  readonly budget: { maxInputBytes: number; maxOutputBytes: number; maxEntries: number; maxDepth: number; timeoutMs: number };
  checkpoint(usage: { inputBytes?: number; outputBytes?: number; entries?: number; depth?: number }): void;
}

export type SemanticArtifactKind = "docx" | "pptx";
export type SemanticChangeCategory = "insert" | "delete" | "move" | "text" | "style" | "data" | "comment" | "structure";
export type ReviewDecision = "accept" | "reject" | "defer";

export interface SemanticVersionBinding {
  id: string;
  sha256: string;
}

export interface SemanticNode {
  id: string;
  kind: string;
  locator: ExtensionLocator;
  text?: string;
  style?: Record<string, JsonValue>;
  data?: JsonValue;
  comments?: JsonValue[];
  children?: SemanticNode[];
}

export interface SemanticDocument {
  schemaVersion: 1;
  artifactId: string;
  artifactKind: SemanticArtifactKind;
  version: SemanticVersionBinding;
  nodes: SemanticNode[];
}

export interface SemanticLoss {
  code: "NOISE_SUPPRESSED" | "RENDERER_LIMITATION";
  message: string;
  locator?: ExtensionLocator;
}

export interface SemanticChange {
  id: string;
  category: SemanticChangeCategory;
  nodeId: string;
  nodeKind: string;
  locator: ExtensionLocator;
  fromLocator?: ExtensionLocator;
  before?: JsonValue;
  after?: JsonValue;
  severity: "major" | "minor" | "cosmetic";
}

export interface SemanticChangeSet {
  schemaVersion: 1;
  artifactKind: SemanticArtifactKind;
  artifactId: string;
  beforeVersion: SemanticVersionBinding;
  afterVersion: SemanticVersionBinding;
  changes: SemanticChange[];
  losses: SemanticLoss[];
  statistics: Record<SemanticChangeCategory, number>;
  changeSetHash: string;
}

export interface SemanticCompareOptions {
  maxEntries?: number;
  maxDepth?: number;
  maxInputBytes?: number;
  ignoreStyleProperties?: string[];
  ignoreComments?: boolean;
  signal?: AbortSignal;
  context?: SemanticExecutionContext;
}

interface FlatNode {
  node: SemanticNode;
  parentId: string | null;
  index: number;
  depth: number;
}

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_KEY = /^(?!__proto__$)(?!prototype$)(?!constructor$).+/;
const categories: SemanticChangeCategory[] = ["insert", "delete", "move", "text", "style", "data", "comment", "structure"];

export class SemanticDiffError extends Error {
  constructor(
    readonly code: "INVALID_DOCUMENT" | "AMBIGUOUS_ALIGNMENT" | "VERSION_MISMATCH" | "RESOURCE_LIMIT" | "ABORTED" | "RENDERER_BINDING_MISMATCH" | "INSPECTOR_TIMEOUT",
    message: string,
  ) {
    super(message);
    this.name = "SemanticDiffError";
  }
}

function checkpoint(options: SemanticCompareOptions, entries: number, depth: number): void {
  if (options.signal?.aborted || options.context?.signal.aborted) throw new SemanticDiffError("ABORTED", "Semantic comparison was aborted.");
  const maxEntries = options.maxEntries ?? options.context?.budget.maxEntries ?? 100_000;
  const maxDepth = options.maxDepth ?? options.context?.budget.maxDepth ?? 128;
  if (entries > maxEntries) throw new SemanticDiffError("RESOURCE_LIMIT", `Node count ${entries} exceeds ${maxEntries}.`);
  if (depth > maxDepth) throw new SemanticDiffError("RESOURCE_LIMIT", `Node depth ${depth} exceeds ${maxDepth}.`);
  options.context?.checkpoint({ entries, depth });
}

function canonical(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(",")}}`;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", owned.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function canonicalHash(value: JsonValue): Promise<string> {
  return sha256(new TextEncoder().encode(canonical(value)));
}

function jsonEqual(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  return left === undefined ? right === undefined : right !== undefined && canonical(left) === canonical(right);
}

function ensureSafeJson(value: unknown, label: string, seen = new Set<object>()): asserts value is JsonValue {
  if (value === undefined) return;
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

function snapshot(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function validateLocator(locator: ExtensionLocator, document: SemanticDocument, nodeId: string): void {
  const expectedSchemes = document.artifactKind === "docx"
    ? new Set(["docx.node", "docx-ooxml-part-v1", "docx-controlled-inspection-v1"])
    : new Set(["pptx.node", "pptx.slide", "pptx.object", "pptx.part"]);
  const validSegments = Array.isArray(locator?.value) && locator.value.every((segment) => typeof segment === "string" ? segment.length > 0 : Number.isInteger(segment) && segment >= 0);
  if (!locator || ![document.artifactId, document.version.sha256].includes(locator.artifactId) || !expectedSchemes.has(locator.scheme) || locator.value.length === 0 || !validSegments) {
    throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${nodeId} has an invalid or cross-artifact locator.`);
  }
}

function flatten(document: SemanticDocument, options: SemanticCompareOptions): Map<string, FlatNode> {
  if (document?.schemaVersion !== 1 || !document.artifactId || !["docx", "pptx"].includes(document.artifactKind)) {
    throw new SemanticDiffError("INVALID_DOCUMENT", "Only schema v1 DOCX and PPTX semantic documents are supported.");
  }
  if (!document.version?.id || !SHA256.test(document.version.sha256)) throw new SemanticDiffError("INVALID_DOCUMENT", "Version ID and lowercase SHA-256 are required.");
  if (!Array.isArray(document.nodes)) throw new SemanticDiffError("INVALID_DOCUMENT", "nodes must be an array.");
  const result = new Map<string, FlatNode>();
  const visit = (nodes: SemanticNode[], parentId: string | null, depth: number): void => {
    checkpoint(options, result.size + nodes.length, depth);
    nodes.forEach((node, index) => {
      if (!node || typeof node.id !== "string" || node.id.length === 0 || typeof node.kind !== "string" || node.kind.length === 0) {
        throw new SemanticDiffError("INVALID_DOCUMENT", "Every node requires a non-empty stable id and kind.");
      }
      if (result.has(node.id)) throw new SemanticDiffError("AMBIGUOUS_ALIGNMENT", `Duplicate stable node ID ${node.id}.`);
      const supportedKeys = new Set(["id", "kind", "locator", "text", "style", "data", "comments", "children"]);
      const unknownKey = Object.keys(node).find((key) => !supportedKeys.has(key));
      if (unknownKey) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id} contains unsupported property ${unknownKey}.`);
      if (node.text !== undefined && typeof node.text !== "string") throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.text must be a string.`);
      if (node.style !== undefined && (node.style === null || Array.isArray(node.style) || typeof node.style !== "object")) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.style must be an object.`);
      if (node.comments !== undefined && !Array.isArray(node.comments)) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.comments must be an array.`);
      validateLocator(node.locator, document, node.id);
      ensureSafeJson(node.style, `node ${node.id}.style`);
      ensureSafeJson(node.data, `node ${node.id}.data`);
      ensureSafeJson(node.comments, `node ${node.id}.comments`);
      result.set(node.id, { node, parentId, index, depth });
      if (node.children !== undefined && !Array.isArray(node.children)) throw new SemanticDiffError("INVALID_DOCUMENT", `Node ${node.id}.children must be an array.`);
      visit(node.children ?? [], node.id, depth + 1);
    });
  };
  visit(document.nodes, null, 1);
  return result;
}

function cleanStyle(style: Record<string, JsonValue> | undefined, ignored: Set<string>): Record<string, JsonValue> | undefined {
  if (!style) return undefined;
  return Object.fromEntries(Object.entries(style).filter(([key]) => !ignored.has(key)).sort(([a], [b]) => a.localeCompare(b)));
}

function severity(category: SemanticChangeCategory): SemanticChange["severity"] {
  if (category === "style" || category === "comment") return "cosmetic";
  if (category === "text" || category === "data") return "minor";
  return "major";
}

async function makeChange(input: Omit<SemanticChange, "id" | "severity">): Promise<SemanticChange> {
  const id = await canonicalHash(input as unknown as JsonValue);
  return { ...input, id, severity: severity(input.category) };
}

function stats(changes: SemanticChange[]): Record<SemanticChangeCategory, number> {
  const output = Object.fromEntries(categories.map((category) => [category, 0])) as Record<SemanticChangeCategory, number>;
  for (const change of changes) output[change.category] += 1;
  return output;
}

function commonOrdinals(own: Map<string, FlatNode>, other: Map<string, FlatNode>): Map<string, number> {
  const groups = new Map<string | null, Array<[string, FlatNode]>>();
  for (const [id, entry] of own) {
    if (!other.has(id)) continue;
    const group = groups.get(entry.parentId) ?? [];
    group.push([id, entry]);
    groups.set(entry.parentId, group);
  }
  const ordinals = new Map<string, number>();
  for (const group of groups.values()) {
    group.sort(([, a], [, b]) => a.index - b.index).forEach(([id], index) => ordinals.set(id, index));
  }
  return ordinals;
}

export async function compareSemanticDocuments(before: SemanticDocument, after: SemanticDocument, options: SemanticCompareOptions = {}): Promise<SemanticChangeSet> {
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
  const losses: SemanticLoss[] = [];
  if (ignoredStyle.size > 0) losses.push({ code: "NOISE_SUPPRESSED", message: `Ignored style properties: ${[...ignoredStyle].sort().join(", ")}.` });
  if (options.ignoreComments) losses.push({ code: "NOISE_SUPPRESSED", message: "Comment changes were ignored by policy." });
  const pending: Array<Promise<SemanticChange>> = [];
  const allIds = [...new Set([...left.keys(), ...right.keys()])].sort();
  for (const nodeId of allIds) {
    checkpoint(options, allIds.length, Math.max(left.get(nodeId)?.depth ?? 0, right.get(nodeId)?.depth ?? 0));
    const oldEntry = left.get(nodeId);
    const newEntry = right.get(nodeId);
    if (!oldEntry) {
      pending.push(makeChange({ category: "insert", nodeId, nodeKind: newEntry!.node.kind, locator: newEntry!.node.locator, after: snapshot(newEntry!.node) }));
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
  const changes = (await Promise.all(pending)).sort((a, b) => canonical([a.locator.value, a.category, a.nodeId] as JsonValue).localeCompare(canonical([b.locator.value, b.category, b.nodeId] as JsonValue)));
  const hashInput = { schemaVersion: 1, artifactKind: before.artifactKind, artifactId: before.artifactId, beforeVersion: before.version, afterVersion: after.version, changes, losses } as unknown as JsonValue;
  return { ...(hashInput as unknown as Omit<SemanticChangeSet, "statistics" | "changeSetHash">), statistics: stats(changes), changeSetHash: await canonicalHash(hashInput) };
}

export interface RedlinePayload {
  schemaVersion: 1;
  changeSetHash: string;
  artifactId: string;
  artifactKind: SemanticArtifactKind;
  beforeVersion: SemanticVersionBinding;
  afterVersion: SemanticVersionBinding;
  changes: Array<SemanticChange & { decision: ReviewDecision }>;
  losses: SemanticLoss[];
}

export function createRedlinePayload(changeSet: SemanticChangeSet): RedlinePayload {
  return { schemaVersion: 1, changeSetHash: changeSet.changeSetHash, artifactId: changeSet.artifactId, artifactKind: changeSet.artifactKind, beforeVersion: changeSet.beforeVersion, afterVersion: changeSet.afterVersion, changes: changeSet.changes.map((change) => ({ ...change, decision: "defer" })), losses: [...changeSet.losses] };
}

export function decideRedlineChanges(payload: RedlinePayload, decisions: Readonly<Record<string, ReviewDecision>>): RedlinePayload {
  const known = new Set(payload.changes.map((change) => change.id));
  for (const id of Object.keys(decisions)) if (!known.has(id)) throw new SemanticDiffError("INVALID_DOCUMENT", `Unknown change decision ${id}.`);
  return { ...payload, changes: payload.changes.map((change) => ({ ...change, decision: decisions[change.id] ?? change.decision })) };
}

export type RedlineExportFormat = "native" | "pdf";
export interface RedlineRendererResult { bytes: Uint8Array; mediaType: string; losses?: SemanticLoss[] }
export interface RedlineRenderer { render(payload: RedlinePayload, format: RedlineExportFormat, signal?: AbortSignal): Promise<RedlineRendererResult> }
export interface RedlineOutputInspection {
  format: RedlineExportFormat;
  changeSetHash: string;
  sourceHashes: [string, string];
  unitCount: number;
  changedNodeIds: string[];
  extractedText: string;
  byteLength: number;
  sha256: string;
}
export interface RedlineOutputInspector { inspect(bytes: Uint8Array, mediaType: string, format: RedlineExportFormat, signal?: AbortSignal): Promise<RedlineOutputInspection> }
export interface RedlineReferenceExpectations { unitCount?: number; requiredText?: string[] }
export interface RedlineExport { bytes: Uint8Array; mediaType: string; byteLength: number; sha256: string; changeSetHash: string; losses: SemanticLoss[] }
export interface RedlineExportOptions { signal?: AbortSignal; maxOutputBytes?: number; inspectorTimeoutMs?: number; reference?: RedlineReferenceExpectations }

const DEFAULT_INSPECTOR_TIMEOUT_MS = 30_000;

async function inspectRedlineOutput(
  inspector: RedlineOutputInspector,
  bytes: Uint8Array,
  mediaType: string,
  format: RedlineExportFormat,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<RedlineOutputInspection> {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new SemanticDiffError("INVALID_DOCUMENT", "Inspector timeout must be a positive 32-bit integer in milliseconds.");
  }
  if (signal?.aborted) throw new SemanticDiffError("ABORTED", "Redline export was aborted before inspection.");

  const inspectionController = new AbortController();
  return new Promise<RedlineOutputInspection>((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    const resolveOnce = (inspection: RedlineOutputInspection): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(inspection);
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = (): void => {
      inspectionController.abort();
      rejectOnce(new SemanticDiffError("ABORTED", "Redline export was aborted during inspection."));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => {
      inspectionController.abort();
      rejectOnce(new SemanticDiffError("INSPECTOR_TIMEOUT", `Independent output inspection exceeded ${timeoutMs} ms.`));
    }, timeoutMs);

    Promise.resolve()
      .then(() => inspector.inspect(bytes, mediaType, format, inspectionController.signal))
      .then(resolveOnce, rejectOnce);
  });
}

export async function exportRedline(payload: RedlinePayload, format: RedlineExportFormat, renderer: RedlineRenderer, inspector: RedlineOutputInspector, options: RedlineExportOptions = {}): Promise<RedlineExport> {
  if (options.signal?.aborted) throw new SemanticDiffError("ABORTED", "Redline export was aborted.");
  const result = await renderer.render(payload, format, options.signal);
  if (!(result.bytes instanceof Uint8Array) || !result.mediaType) throw new SemanticDiffError("INVALID_DOCUMENT", "Renderer returned invalid output.");
  if (result.bytes.byteLength > (options.maxOutputBytes ?? 64 * 1024 * 1024)) throw new SemanticDiffError("RESOURCE_LIMIT", "Rendered redline exceeds the output budget.");
  const byteHash = await sha256(result.bytes);
  const inspection = await inspectRedlineOutput(inspector, result.bytes, result.mediaType, format, options.signal, options.inspectorTimeoutMs ?? DEFAULT_INSPECTOR_TIMEOUT_MS);
  const expectedNodeIds = [...new Set(payload.changes.map((change) => change.nodeId))].sort();
  const actualNodeIds = [...new Set(inspection.changedNodeIds)].sort();
  if (
    inspection.format !== format
    || inspection.changeSetHash !== payload.changeSetHash
    || inspection.sourceHashes[0] !== payload.beforeVersion.sha256
    || inspection.sourceHashes[1] !== payload.afterVersion.sha256
    || inspection.byteLength !== result.bytes.byteLength
    || inspection.sha256 !== byteHash
    || canonical(actualNodeIds) !== canonical(expectedNodeIds)
  ) throw new SemanticDiffError("RENDERER_BINDING_MISMATCH", "Independent output inspection did not prove exact change-set, source, node, byte, and format binding.");
  if (options.reference?.unitCount !== undefined && inspection.unitCount !== options.reference.unitCount) throw new SemanticDiffError("RENDERER_BINDING_MISMATCH", "Rendered redline unit count failed its reference expectation.");
  for (const text of options.reference?.requiredText ?? []) if (!inspection.extractedText.includes(text)) throw new SemanticDiffError("RENDERER_BINDING_MISMATCH", `Rendered redline is missing required text: ${text}`);
  return { bytes: result.bytes, mediaType: result.mediaType, byteLength: result.bytes.byteLength, sha256: byteHash, changeSetHash: inspection.changeSetHash, losses: result.losses ?? [] };
}
