import { describe, expect, it } from "vitest";

import { extract, render, repair, transform, validate } from "../src/ops/index.js";
import { PDF_OPERATIONS } from "../src/ops/descriptor.js";
import { PDF_EVIDENCE } from "../src/ops/evidence.js";
import type { PdfDocument } from "../src/engine.js";

const DOC = {
  page: { size: "Letter", margin: 72 },
  meta: { title: "OC-1 conformance" },
  children: [{ type: "paragraph", value: "OC-1 conformance" }],
} as unknown as PdfDocument;

describe("pdf.render (OC-1)", () => {
  it("returns a well-formed success envelope", async () => {
    const result = await render(DOC);
    expect(result.ok, JSON.stringify("error" in result ? result.error : null)).toBe(true);
    if (!result.ok) return;

    // C2: losses and diagnostics are always arrays, never undefined (R7).
    expect(Array.isArray(result.losses)).toBe(true);
    expect(Array.isArray(result.diagnostics)).toBe(true);

    // R31: bytes arrive as ArtifactBytes with hash and media type attached.
    expect(result.value.mediaType).toBe("application/pdf");
    expect(result.value.extension).toBe("pdf");
    expect(result.value.byteLength).toBe(result.value.bytes.byteLength);
    expect(result.value.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Buffer.from(result.value.bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("binds a receipt whose hashes match the actual bytes (C8)", async () => {
    const result = await render(DOC);
    if (!result.ok) throw new Error("render failed");

    expect(result.receipt.operation).toBe("pdf.render");
    expect(result.receipt.domain).toBe("pdf");
    expect(result.receipt.contractVersion).toBe("1.0.0");
    expect(result.receipt.outputHash).toBe(result.value.hash);
    expect(result.receipt.inputHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.receipt.deterministic).toBe(true);
    // R25: no timestamp under determinism.
    expect("producedAt" in result.receipt).toBe(false);
    expect(result.receipt.nondeterminismSources).toEqual([]);
  });

  it("is deterministic: identical input yields an identical output hash (C7)", async () => {
    const a = await render(DOC, { deterministic: true });
    const b = await render(DOC, { deterministic: true });
    if (!a.ok || !b.ok) throw new Error("render failed");
    expect(a.value.hash).toBe(b.value.hash);
    expect(a.receipt.optionsHash).toBe(b.receipt.optionsHash);
    expect(Buffer.from(a.value.bytes).equals(Buffer.from(b.value.bytes))).toBe(true);
  });

  it("returns a typed failure instead of throwing on invalid input (R4/C6)", async () => {
    const result = await render({ nonsense: true } as unknown as PdfDocument);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    // C4: namespaced code + non-empty remediation.
    expect(result.error.code).toMatch(/^(common|pdf)\//);
    expect(result.error.remediation.length).toBeGreaterThan(0);
    expect(result.error.name).toBe("PaperError");
    expect(Array.isArray(result.losses)).toBe(true);
  });

  it("never throws for hostile input (C6)", async () => {
    const hostile: unknown[] = [null, undefined, {}, { pages: null }, { pages: [] }, []];
    for (const input of hostile) {
      const result = await render(input as PdfDocument);
      expect(typeof result.ok).toBe("boolean");
      if (!result.ok) expect(result.error.remediation.length).toBeGreaterThan(0);
    }
  });

  it("serializes losslessly across the JSON boundary (C3)", async () => {
    const result = await render(DOC);
    if (!result.ok) throw new Error("render failed");
    const wire = JSON.parse(
      JSON.stringify({ ...result, value: { ...result.value, bytes: undefined } }),
    ) as { ok: boolean; receipt: { outputHash: string } };
    expect(wire.ok).toBe(true);
    expect(wire.receipt.outputHash).toBe(result.value.hash);
  });
});

describe("pdf.validate / repair / transform / extract (OC-1)", () => {
  async function renderedBytes(): Promise<Uint8Array> {
    const result = await render(DOC);
    if (!result.ok) throw new Error("render failed");
    return result.value.bytes;
  }

  it("validate returns an envelope and does not mutate its input", async () => {
    const bytes = await renderedBytes();
    const before = Buffer.from(bytes).toString("base64");
    const result = await validate(bytes);
    expect(typeof result.ok).toBe("boolean");
    expect(Buffer.from(bytes).toString("base64")).toBe(before);
  });

  it("repair reports every change it makes as a loss (R16)", async () => {
    const bytes = await renderedBytes();
    const result = await repair(bytes);
    expect(typeof result.ok).toBe("boolean");
    if (!result.ok) return;
    for (const loss of result.losses) {
      expect(loss.code).toMatch(/^pdf\//);
      expect(loss.severity).toBe("substituted");
      expect(loss.message.length).toBeGreaterThan(0);
    }
  });

  it("transform linearizes and returns ArtifactBytes", async () => {
    const result = await transform(await renderedBytes(), { plan: { kind: "linearize" } });
    expect(typeof result.ok).toBe("boolean");
    if (result.ok) expect(result.value.mediaType).toBe("application/pdf");
  });

  it("transform rejects an unsupported plan as a typed failure, not a throw", async () => {
    const result = await transform(await renderedBytes(), {
      plan: { kind: "teleport" } as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toMatch(/^pdf\//);
      expect(result.error.remediation.length).toBeGreaterThan(0);
    }
  });

  it("extract returns the selector it honored", async () => {
    const result = await extract(await renderedBytes(), { selector: "signatures" });
    expect(typeof result.ok).toBe("boolean");
    if (result.ok) {
      expect(result.value.selector).toBe("signatures");
      expect(Array.isArray(result.value.items)).toBe(true);
    }
  });
});

describe("lossPolicy (R30)", () => {
  it("turns losses into a failure when the caller demands full fidelity", async () => {
    const rendered = await render(DOC);
    if (!rendered.ok) throw new Error("render failed");

    const collected = await repair(rendered.value.bytes, { lossPolicy: "collect" });
    const strict = await repair(rendered.value.bytes, { lossPolicy: "failOnAny" });

    if (collected.ok && collected.losses.length > 0) {
      // Same work, stricter contract: the losses become a typed failure.
      expect(strict.ok).toBe(false);
      if (!strict.ok) expect(strict.error.code).toBe("pdf/LOSS_POLICY_VIOLATED");
    } else {
      // Nothing was repaired, so both must agree it succeeded.
      expect(strict.ok).toBe(collected.ok);
    }
  });
});

describe("uniformity across verbs", () => {
  it("keeps descriptor-only evidence metadata identical to the executable projection", () => {
    const projectedNames = new Set(PDF_EVIDENCE.descriptors.map((descriptor) => descriptor.name));
    expect(PDF_OPERATIONS.filter((descriptor) => projectedNames.has(descriptor.name)))
      .toEqual(PDF_EVIDENCE.descriptors);
  });

  it("every verb has the same call shape and envelope", async () => {
    const bytes = await renderedOrThrow();
    const results = await Promise.all([
      render(DOC),
      validate(bytes),
      repair(bytes),
      transform(bytes),
      extract(bytes),
    ]);
    for (const result of results) {
      expect(result).toHaveProperty("ok");
      expect(Array.isArray(result.losses)).toBe(true);
      expect(Array.isArray(result.diagnostics)).toBe(true);
      if (result.ok) {
        expect(result.receipt.contractVersion).toBe("1.0.0");
        expect(result.receipt.domain).toBe("pdf");
      } else {
        expect(result.error.code).toContain("/");
        expect(result.error.remediation.length).toBeGreaterThan(0);
      }
    }
  });

  async function renderedOrThrow(): Promise<Uint8Array> {
    const result = await render(DOC);
    if (!result.ok) throw new Error("render failed");
    return result.value.bytes;
  }
});
