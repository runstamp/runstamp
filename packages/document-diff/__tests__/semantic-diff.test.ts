import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runExtension } from "@runstamp/protocol";
import {
  compareSemanticDocuments,
  createRedlinePayload,
  decideRedlineChanges,
  exportRedline,
  SemanticDiffError,
  semanticCompareExtension,
  type RedlinePayload,
  type RedlineOutputInspector,
  type SemanticDocument,
  type SemanticNode,
} from "../src/index.js";

const hash = (letter: string) => letter.repeat(64);
const locator = (artifactId: string, scheme: "docx.node" | "pptx.node", id: string) => ({ artifactId, scheme, value: [id] });
const node = (artifactId: string, scheme: "docx.node" | "pptx.node", id: string, text: string, extra: Partial<SemanticNode> = {}): SemanticNode => ({ id, kind: "paragraph", locator: locator(artifactId, scheme, id), text, ...extra });

function document(kind: "docx" | "pptx", version: string, nodes: SemanticNode[]): SemanticDocument {
  const artifactId = kind === "docx" ? "contract-1" : "deck-1";
  return { schemaVersion: 1, artifactId, artifactKind: kind, version: { id: version, sha256: hash(version === "v1" ? "a" : "b") }, nodes };
}

const budget = { maxInputBytes: 1_000_000, maxOutputBytes: 1_000_000, maxEntries: 10_000, maxDepth: 50, timeoutMs: 5_000 };

describe("semantic compare", () => {
  it("classifies text, style, data, comment, structure, insertion, deletion, and explicit-ID moves", async () => {
    const aid = "contract-1";
    const before = document("docx", "v1", [
      node(aid, "docx.node", "a", "Alpha", { style: { bold: false }, data: { amount: 10 }, comments: ["old"] }),
      node(aid, "docx.node", "b", "Delete me"),
      node(aid, "docx.node", "c", "Move me"),
      node(aid, "docx.node", "d", "Kind", { kind: "paragraph" }),
    ]);
    const after = document("docx", "v2", [
      node(aid, "docx.node", "c", "Move me"),
      node(aid, "docx.node", "a", "Beta", { style: { bold: true }, data: { amount: 11 }, comments: ["new"] }),
      node(aid, "docx.node", "d", "Kind", { kind: "heading" }),
      node(aid, "docx.node", "e", "Inserted"),
    ]);
    const result = await compareSemanticDocuments(before, after);
    expect(new Set(result.changes.map((change) => change.category))).toEqual(new Set(["insert", "delete", "move", "text", "style", "data", "comment", "structure"]));
    expect(result.changes.every((change) => change.locator.artifactId === aid && /^[a-f0-9]{64}$/.test(change.id))).toBe(true);
    expect(result.beforeVersion).toEqual(before.version);
    expect(result.afterVersion).toEqual(after.version);
  });

  it("does not fabricate moves when a preceding node is deleted", async () => {
    const aid = "contract-1";
    const result = await compareSemanticDocuments(
      document("docx", "v1", [node(aid, "docx.node", "a", "A"), node(aid, "docx.node", "b", "B")]),
      document("docx", "v2", [node(aid, "docx.node", "b", "B")]),
    );
    expect(result.changes.map((change) => [change.category, change.nodeId])).toEqual([["delete", "a"]]);
  });

  it("is idempotent and symmetric for edits, insertions, and deletions", async () => {
    const aid = "contract-1";
    const left = document("docx", "v1", [node(aid, "docx.node", "a", "old"), node(aid, "docx.node", "gone", "gone")]);
    const right = document("docx", "v2", [node(aid, "docx.node", "a", "new"), node(aid, "docx.node", "added", "added")]);
    expect((await compareSemanticDocuments(left, left)).changes).toEqual([]);
    const forward = await compareSemanticDocuments(left, right);
    const reverse = await compareSemanticDocuments(right, left);
    const invert = (category: string) => category === "insert" ? "delete" : category === "delete" ? "insert" : category;
    expect(forward.changes.map((entry) => [invert(entry.category), entry.nodeId]).sort()).toEqual(reverse.changes.map((entry) => [entry.category, entry.nodeId]).sort());
  });

  it("normalizes style noise explicitly and records a typed loss", async () => {
    const aid = "contract-1";
    const before = document("docx", "v1", [node(aid, "docx.node", "a", "same", { style: { fontHint: "Calibri", bold: true } })]);
    const after = document("docx", "v2", [node(aid, "docx.node", "a", "same", { style: { fontHint: "Arial", bold: true } })]);
    const result = await compareSemanticDocuments(before, after, { ignoreStyleProperties: ["fontHint"] });
    expect(result.changes).toEqual([]);
    expect(result.losses).toEqual([expect.objectContaining({ code: "NOISE_SUPPRESSED" })]);
  });

  it.each(["docx", "pptx"] as const)("supports the shipped %s semantic adapter", async (kind) => {
    const aid = kind === "docx" ? "contract-1" : "deck-1";
    const scheme = kind === "docx" ? "docx.node" : "pptx.node";
    const result = await compareSemanticDocuments(document(kind, "v1", [node(aid, scheme, "a", "before")]), document(kind, "v2", [node(aid, scheme, "a", "after")]));
    expect(result.changes[0]).toMatchObject({ category: "text", nodeId: "a" });
  });

  it("handles a buyer-sized 55-slide deck deterministically", async () => {
    const make = (reverse = false) => {
      const nodes = Array.from({ length: 55 }, (_, index) => node("deck-1", "pptx.node", `slide-${index}`, `Slide ${index}`, { kind: "slide", data: { rows: [[index, index * 2]] } }));
      return document("pptx", reverse ? "v2" : "v1", reverse ? nodes.reverse() : nodes);
    };
    const first = await compareSemanticDocuments(make(), make(true));
    const second = await compareSemanticDocuments(make(), make(true));
    expect(first.changeSetHash).toBe(second.changeSetHash);
    expect(first.statistics.move).toBeGreaterThan(0);
  });

  it("fails closed for duplicate IDs, cross-artifact locators, and inconsistent version bindings", async () => {
    const aid = "contract-1";
    const duplicate = document("docx", "v1", [node(aid, "docx.node", "a", "A"), node(aid, "docx.node", "a", "B")]);
    await expect(compareSemanticDocuments(duplicate, duplicate)).rejects.toMatchObject({ code: "AMBIGUOUS_ALIGNMENT" });
    const cross = document("docx", "v1", [node("wrong", "docx.node", "a", "A")]);
    await expect(compareSemanticDocuments(cross, cross)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
    const left = document("docx", "v1", []);
    const right = { ...document("docx", "v2", []), version: { id: "v1", sha256: hash("b") } };
    await expect(compareSemanticDocuments(left, right)).rejects.toMatchObject({ code: "VERSION_MISMATCH" });
  });

  it("enforces byte, entry, depth, unsafe-key, and cancellation boundaries", async () => {
    const aid = "contract-1";
    const base = document("docx", "v1", [node(aid, "docx.node", "a", "x".repeat(100))]);
    await expect(compareSemanticDocuments(base, base, { maxInputBytes: 10 })).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
    await expect(compareSemanticDocuments(base, base, { maxEntries: 0 })).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
    const deep = document("docx", "v1", [node(aid, "docx.node", "a", "a", { children: [node(aid, "docx.node", "b", "b")] })]);
    await expect(compareSemanticDocuments(deep, deep, { maxDepth: 1 })).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
    const poisoned = JSON.parse('{"x":1,"__proto__":{"polluted":true}}') as Record<string, unknown>;
    const hostile = document("docx", "v1", [node(aid, "docx.node", "a", "safe", { data: poisoned as never })]);
    await expect(compareSemanticDocuments(hostile, hostile)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
    const controller = new AbortController(); controller.abort();
    await expect(compareSemanticDocuments(base, base, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  });
});

describe("review and exporter composition", () => {
  async function payload(kind: "docx" | "pptx" = "docx"): Promise<RedlinePayload> {
    const aid = kind === "docx" ? "contract-1" : "deck-1";
    const scheme = kind === "docx" ? "docx.node" : "pptx.node";
    return createRedlinePayload(await compareSemanticDocuments(document(kind, "v1", [node(aid, scheme, "a", "old")]), document(kind, "v2", [node(aid, scheme, "a", "new")])));
  }

  const references = JSON.parse(readFileSync(new URL("../fixtures/public/reference-outputs.json", import.meta.url), "utf8")) as {
    references: Record<string, { engine: string; format: "native" | "pdf"; bytesBase64: string; extensionOutput: { output: { paragraphCount?: number; slideCount?: number; pageCount?: number; text: string }; losses: Array<{ code: string }>; artifacts: Array<{ mediaType: string; byteLength: number; sha256: string }> } }>;
  };

  async function bytesHash(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  const envelopeInspector: RedlineOutputInspector = {
    async inspect(bytes) {
      const envelope = JSON.parse(new TextDecoder().decode(bytes)) as { format: "native" | "pdf"; changeSetHash: string; sourceHashes: [string, string]; unitCount: number; changedNodeIds: string[]; text: string };
      return { format: envelope.format, changeSetHash: envelope.changeSetHash, sourceHashes: envelope.sourceHashes, unitCount: envelope.unitCount, changedNodeIds: envelope.changedNodeIds, extractedText: envelope.text, byteLength: bytes.byteLength, sha256: await bytesHash(bytes) };
    },
  };

  function referenceRenderer(referenceKey: string, unitCount: number, text: string) {
    const reference = references.references[referenceKey]!;
    return {
      async render(value: RedlinePayload, format: "native" | "pdf") {
        expect(reference.format).toBe(format);
        const referenceBytes = Uint8Array.from(Buffer.from(reference.bytesBase64, "base64"));
        const referenceHash = await bytesHash(referenceBytes);
        expect(reference.extensionOutput.artifacts[0]).toMatchObject({ byteLength: referenceBytes.byteLength, sha256: referenceHash });
        expect(reference.extensionOutput.losses).toContainEqual(expect.objectContaining({ code: "RENDERER_LIMITATION" }));
        const envelope = { engine: reference.engine, format, changeSetHash: value.changeSetHash, sourceHashes: [value.beforeVersion.sha256, value.afterVersion.sha256], changedNodeIds: [...new Set(value.changes.map((change) => change.nodeId))], unitCount, text, referenceArtifactSha256: referenceHash };
        return { bytes: new TextEncoder().encode(JSON.stringify(envelope)), mediaType: reference.extensionOutput.artifacts[0]!.mediaType, losses: [{ code: "RENDERER_LIMITATION" as const, message: "Committed A01/A04/A03 output is a reference envelope, not validated Office/PDF bytes." }] };
      },
    };
  }

  it("requires explicit, known review decisions", async () => {
    const original = await payload();
    const decided = decideRedlineChanges(original, { [original.changes[0]!.id]: "accept" });
    expect(decided.changes[0]!.decision).toBe("accept");
    expect(original.changes[0]!.decision).toBe("defer");
    expect(() => decideRedlineChanges(original, { missing: "accept" })).toThrow(SemanticDiffError);
  });

  it.each([
    { label: "A01 DOCX native", kind: "docx", format: "native", key: "a01Docx", units: 1, text: "Payment due 15 days" },
    { label: "A04 PPTX native", kind: "pptx", format: "native", key: "a04Pptx", units: 2, text: "Revenue revised" },
    { label: "A03 PDF", kind: "docx", format: "pdf", key: "a03Pdf", units: 1, text: "Payment due 15 days" },
  ] as const)("composes $label reference output with independent binding/count/text inspection", async ({ kind, format, key, units, text }) => {
    const input = await payload(kind);
    const renderer = referenceRenderer(key, units, text);
    const first = await exportRedline(input, format, renderer, envelopeInspector, { reference: { unitCount: units, requiredText: [text] } });
    const second = await exportRedline(input, format, renderer, envelopeInspector, { reference: { unitCount: units, requiredText: [text] } });
    expect(first.sha256).toBe(second.sha256);
    expect(first.changeSetHash).toBe(input.changeSetHash);
    expect(first.losses).toEqual([expect.objectContaining({ code: "RENDERER_LIMITATION" })]);
  });

  it("rejects stale independently inspected binding and output-budget overflow", async () => {
    const input = await payload();
    const renderer = referenceRenderer("a03Pdf", 1, "Payment due 15 days");
    const staleInspector: RedlineOutputInspector = { inspect: async (bytes) => ({ format: "pdf", changeSetHash: hash("f"), sourceHashes: [hash("a"), hash("b")], unitCount: 1, changedNodeIds: ["a"], extractedText: "Payment due 15 days", byteLength: bytes.byteLength, sha256: await bytesHash(bytes) }) };
    await expect(exportRedline(input, "pdf", renderer, staleInspector)).rejects.toMatchObject({ code: "RENDERER_BINDING_MISMATCH" });
    await expect(exportRedline(input, "pdf", renderer, envelopeInspector, { maxOutputBytes: 1 })).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
  });

  it("aborts promptly while an inspector ignores its signal and ignores late settlement", async () => {
    const input = await payload();
    const renderer = referenceRenderer("a03Pdf", 1, "Payment due 15 days");
    const controller = new AbortController();
    let inspectionSignal: AbortSignal | undefined;
    let settleInspection: ((inspection: Awaited<ReturnType<RedlineOutputInspector["inspect"]>>) => void) | undefined;
    const inspector: RedlineOutputInspector = {
      inspect(_bytes, _mediaType, _format, signal) {
        inspectionSignal = signal;
        return new Promise((resolve) => { settleInspection = resolve; });
      },
    };
    const pending = exportRedline(input, "pdf", renderer, inspector, { signal: controller.signal, inspectorTimeoutMs: 5_000 });
    await vi.waitFor(() => expect(inspectionSignal).toBeDefined());
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
    expect(inspectionSignal!.aborted).toBe(true);
    settleInspection!({ format: "pdf", changeSetHash: input.changeSetHash, sourceHashes: [input.beforeVersion.sha256, input.afterVersion.sha256], unitCount: 1, changedNodeIds: ["a"], extractedText: "Payment due 15 days", byteLength: 0, sha256: hash("a") });
    await Promise.resolve();
  });

  it("times out a never-resolving inspector with a typed bounded failure", async () => {
    const input = await payload();
    const renderer = referenceRenderer("a03Pdf", 1, "Payment due 15 days");
    let inspectionSignal: AbortSignal | undefined;
    const inspector: RedlineOutputInspector = {
      inspect(_bytes, _mediaType, _format, signal) {
        inspectionSignal = signal;
        return new Promise(() => undefined);
      },
    };
    await expect(exportRedline(input, "pdf", renderer, inspector, { inspectorTimeoutMs: 10 })).rejects.toMatchObject({ code: "INSPECTOR_TIMEOUT" });
    expect(inspectionSignal!.aborted).toBe(true);
    await expect(exportRedline(input, "pdf", renderer, envelopeInspector, { inspectorTimeoutMs: 0 })).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
  });

  it("removes caller abort propagation after successful inspection", async () => {
    const input = await payload();
    const renderer = referenceRenderer("a03Pdf", 1, "Payment due 15 days");
    const controller = new AbortController();
    let inspectionSignal: AbortSignal | undefined;
    const inspector: RedlineOutputInspector = {
      async inspect(bytes, mediaType, format, signal) {
        inspectionSignal = signal;
        return envelopeInspector.inspect(bytes, mediaType, format, signal);
      },
    };
    await exportRedline(input, "pdf", renderer, inspector, { signal: controller.signal, inspectorTimeoutMs: 1_000, reference: { unitCount: 1, requiredText: ["Payment due 15 days"] } });
    controller.abort();
    expect(inspectionSignal!.aborted).toBe(false);
  });
});

describe("Extension Kit composition", () => {
  it("runs offline with deterministic budgets and stable output", async () => {
    const aid = "contract-1";
    const request = {
      schemaVersion: 1 as const,
      extensionId: semanticCompareExtension.manifest.id,
      operation: "compare",
      input: { before: document("docx", "v1", [node(aid, "docx.node", "a", "old")]), after: document("docx", "v2", [node(aid, "docx.node", "a", "new")]) },
      context: { runId: "run-1", seed: "fixed", now: "2026-08-10T00:00:00Z", network: "disabled" as const, budget },
    };
    const first = await runExtension(semanticCompareExtension, request);
    const second = await runExtension(semanticCompareExtension, request);
    expect(first).toEqual(second);
    expect(first.status).toBe("ok");
  });
});
