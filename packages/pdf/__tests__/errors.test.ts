/**
 * Structured-error coverage: every PdfErrorCode must be reachable through
 * the public API, and the `code` field must be the stable contract.
 */
import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { PdfError, isPdfError, type PdfErrorCode } from "../src/errors.js";
import { createPdfaExternalLinkDocument } from "../scripts/phase8-fixtures.js";

describe("PdfError class", () => {
  it("preserves code, message, and details", () => {
    const err = new PdfError("SCHEMA_REJECTED", "test message", { foo: 1 });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PdfError);
    expect(err.name).toBe("PdfError");
    expect(err.code).toBe("SCHEMA_REJECTED");
    expect(err.message).toBe("test message");
    expect(err.details).toEqual({ foo: 1 });
  });

  it("supports cause chaining", () => {
    const cause = new Error("upstream");
    const err = new PdfError("SCHEMA_REJECTED", "wrapped", undefined, { cause });
    expect(err.cause).toBe(cause);
  });

  it("isPdfError narrows correctly", () => {
    expect(isPdfError(new PdfError("OPTIONS_CONFLICT", "x"))).toBe(true);
    expect(isPdfError(new Error("plain"))).toBe(false);
    expect(isPdfError(null)).toBe(false);
    expect(isPdfError("string")).toBe(false);
  });

  it("instanceof survives prototype chain after construction", () => {
    function thrower() { throw new PdfError("PDFA_VIOLATION", "x"); }
    try { thrower(); }
    catch (e) {
      expect(e).toBeInstanceOf(PdfError);
      expect(e).toBeInstanceOf(Error);
    }
  });
});

describe("PdfErrorCode reachability — every documented code has a real call site", () => {
  // Track which codes we exercise so we can assert exhaustive coverage.
  const seen = new Set<PdfErrorCode>();

  it("emits SCHEMA_REJECTED via strictSchema option", async () => {
    try {
      await PdfEngine.render(
        { children: [{ type: "paragraph", value: "ok" }], unknownTopLevel: true } as never,
        { strictSchema: true },
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect(isPdfError(e)).toBe(true);
      const err = e as PdfError;
      expect(err.code).toBe("SCHEMA_REJECTED");
      expect(err.details?.issues).toBeDefined();
      seen.add("SCHEMA_REJECTED");
    }
  });

  it("emits SCHEMA_REJECTED via Phase2 normalizeText (legacy validation path)", async () => {
    try {
      await PdfEngine.render({
        pages: [{ texts: [{ value: "x", fontSize: -1, x: 72, y: 720 }] }],
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect(isPdfError(e)).toBe(true);
      const err = e as PdfError;
      expect(err.code).toBe("SCHEMA_REJECTED");
      const issuesText = JSON.stringify(err.details?.issues ?? []);
      expect(issuesText).toContain("fontSize");
      seen.add("SCHEMA_REJECTED");
    }
  });

  it("emits OPTIONS_CONFLICT for signature + linearize", async () => {
    try {
      await PdfEngine.render(
        { pages: [{ texts: [{ value: "x", x: 72, y: 720 }] }] },
        { linearize: true, signature: { certificate: { format: "pem", cert: "x", key: "x" } } } as never,
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect(isPdfError(e)).toBe(true);
      const err = e as PdfError;
      expect(err.code).toBe("OPTIONS_CONFLICT");
      expect(err.details?.conflict).toEqual(["linearize", "signature"]);
      seen.add("OPTIONS_CONFLICT");
    }
  });

  it("emits OPTIONS_CONFLICT for encryption + pdfA", async () => {
    try {
      await PdfEngine.render(
        { pages: [{ texts: [{ value: "x", x: 72, y: 720 }] }] },
        { encryption: { userPassword: "pw" }, pdfA: "PDF/A-2b" },
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect(isPdfError(e)).toBe(true);
      const err = e as PdfError;
      expect(err.code).toBe("OPTIONS_CONFLICT");
      seen.add("OPTIONS_CONFLICT");
    }
  });

  it("emits OPTIONS_CONFLICT for renderStream + signature", () => {
    try {
      PdfEngine.renderStream(
        { pages: [{ texts: [{ value: "x", x: 72, y: 720 }] }] },
        { signature: { certificate: { format: "pem", cert: "x", key: "x" } } } as never,
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect(isPdfError(e)).toBe(true);
      expect((e as PdfError).code).toBe("OPTIONS_CONFLICT");
      seen.add("OPTIONS_CONFLICT");
    }
  });

  it("emits PDFA_VIOLATION for external URI link in PDF/A document", async () => {
    await expect(PdfEngine.render(await createPdfaExternalLinkDocument())).rejects.toMatchObject({
      name: "PdfError",
      code: "PDFA_VIOLATION",
      details: { constraint: "no-external-uri-annotations" },
    });
    seen.add("PDFA_VIOLATION");
  });

  it("ensures every documented code is exercised above", () => {
    const documented: PdfErrorCode[] = ["SCHEMA_REJECTED", "OPTIONS_CONFLICT", "PDFA_VIOLATION"];
    for (const code of documented) {
      expect(seen.has(code)).toBe(true);
    }
  });
});
