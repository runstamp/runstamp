/**
 * Schema validation surfacing — replaces the silent-fail behavior at
 * engine.ts:601 with strict-by-default rejection and an explicit permissive
 * opt-out.
 */
import { describe, it, expect, vi } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { PdfError, isPdfError } from "../src/errors.js";
import type { PdfInputWarning } from "../src/relaxed-input.js";

const STRICT_INVALID_DOC = {
  pages: [{ texts: [{ value: "ok", x: 72, y: 720 }] }],
  __unknownTopLevelKey__: true,
} as never;

const VALID_DOC = {
  pages: [{ texts: [{ value: "ok", x: 72, y: 720 }] }],
};

describe("schema validation surfacing", () => {
  it("throws PdfError(SCHEMA_REJECTED) by default", async () => {
    await expect(PdfEngine.render(STRICT_INVALID_DOC)).rejects.toMatchObject({
      name: "PdfError",
      code: "SCHEMA_REJECTED",
    });
  });

  it("does NOT throw on schema failure when strict is false", async () => {
    // A doc with an unknown top-level key fails strict schema but should still render
    // when the caller explicitly opts into permissive rendering.
    const buffer = await PdfEngine.render(STRICT_INVALID_DOC, { strict: false });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("keeps strictSchema false as a legacy permissive opt-out", async () => {
    const buffer = await PdfEngine.render(STRICT_INVALID_DOC, { strictSchema: false });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("emits PDF_SCHEMA_VALIDATION_FAILED warning via onInputWarning in permissive mode", async () => {
    const warnings: PdfInputWarning[] = [];
    await PdfEngine.render(STRICT_INVALID_DOC, {
      strict: false,
      onInputWarning: (w) => warnings.push(w),
    });
    expect(warnings.some((w) => w.code === "PDF_SCHEMA_VALIDATION_FAILED")).toBe(true);
  });

  it("does NOT emit a schema warning for valid documents", async () => {
    const onInputWarning = vi.fn();
    await PdfEngine.render(VALID_DOC, { onInputWarning });
    expect(onInputWarning).not.toHaveBeenCalledWith(
      expect.objectContaining({ code: "PDF_SCHEMA_VALIDATION_FAILED" }),
    );
  });

  it("strictSchema error includes the underlying Zod issues in details", async () => {
    try {
      await PdfEngine.render(STRICT_INVALID_DOC, { strictSchema: true });
      throw new Error("should have thrown");
    } catch (e) {
      expect(isPdfError(e)).toBe(true);
      const err = e as PdfError;
      expect(err.details?.issues).toBeDefined();
      expect(Array.isArray(err.details?.issues)).toBe(true);
      expect((err.details?.issues as unknown[]).length).toBeGreaterThan(0);
      expect(err.cause).toBeDefined();
    }
  });
});
