import { describe, expect, it } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { validatePdfDocumentSafe } from "../src/validate-document.js";

describe("WP5.2 — soft PdfDocument validator", () => {
  it("returns ok=true on a minimal well-formed doc", () => {
    const result = validatePdfDocumentSafe({
      pages: [{ width: 612, height: 792, texts: [{ value: "Hi" }] }],
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns ok=false with schema issues (does not throw)", () => {
    const result = validatePdfDocumentSafe({
      pages: [{ width: "not-a-number" }],
    } as never);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.every((i) => i.code === "PDF_VALIDATE_SCHEMA")).toBe(true);
  });

  it("flags empty pages array (schema also rejects it)", () => {
    const result = validatePdfDocumentSafe({ pages: [] });
    expect(result.issues.some((i) => i.code === "PDF_VALIDATE_PAGES_EMPTY")).toBe(true);
  });

  it("PdfEngine.validate(doc) returns the soft result synchronously", () => {
    const result = PdfEngine.validate({
      pages: [{ width: 612, height: 792, texts: [{ value: "Hi" }] }],
    });
    expect(result).toMatchObject({ ok: true, issues: [] });
  });

  it("PdfEngine.validate(buffer) returns the buffer summary asynchronously", async () => {
    const doc = {
      pages: [{ width: 612, height: 792, texts: [{ value: "Hi" }] }],
    };
    const buffer = await PdfEngine.render(doc as never);
    const result = await PdfEngine.validate(buffer);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("object");
  });
});
