/**
 * `options.pdfVersion` plumbing — verifies the user-requested target
 * version reaches the PDF header, and that feature-implied minimums
 * (PDF/A, encryption) win when they're stricter than the request.
 */
import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";

function pdfHeader(buffer: Buffer): string {
  return buffer.subarray(0, 8).toString("ascii");
}

const SIMPLE_DOC = {
  pages: [{ texts: [{ value: "Hello", x: 72, y: 720 }] }],
};

describe("PdfRenderOptions.pdfVersion", () => {
  it("defaults to %PDF-1.4 for a Phase 2 doc with no special features", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC);
    // Default header (legacy default): 1.4.
    expect(pdfHeader(buffer)).toMatch(/^%PDF-1\.4/);
  });

  it("respects user-requested pdfVersion: 1.5", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.5" });
    expect(pdfHeader(buffer)).toMatch(/^%PDF-1\.5/);
  });

  it("respects user-requested pdfVersion: 1.7", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "1.7" });
    expect(pdfHeader(buffer)).toMatch(/^%PDF-1\.7/);
  });

  it("respects user-requested pdfVersion: 2.0", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, { pdfVersion: "2.0" });
    expect(pdfHeader(buffer)).toMatch(/^%PDF-2\.0/);
  });

  it("auto-bumps when AES-256 requires a higher minimum than the user requested", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, {
      pdfVersion: "1.5",
      encryption: { userPassword: "pw", algorithm: "aes-256" },
    });
    // AES-256 minimum is 1.7; user requested 1.5 — should land at 1.7.
    expect(pdfHeader(buffer)).toMatch(/^%PDF-1\.7/);
  });

  it("does not downgrade when user requests above feature minimum", async () => {
    const buffer = await PdfEngine.render(SIMPLE_DOC, {
      pdfVersion: "2.0",
      encryption: { userPassword: "pw", algorithm: "aes-128" },
    });
    // AES-128 minimum is 1.6; user requested 2.0 — should stay at 2.0.
    expect(pdfHeader(buffer)).toMatch(/^%PDF-2\.0/);
  });
});
