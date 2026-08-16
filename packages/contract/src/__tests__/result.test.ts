import { describe, expect, it } from "vitest";

import { fail, isFail, isOk, ok, unwrap } from "../result.js";
import { PaperError, isPaperError } from "../errors.js";
import { requireBytes } from "../artifact.js";
import { buildReceipt } from "../receipt.js";
import { createLoss } from "../loss.js";
import { createDiagnostic } from "../diagnostics.js";

const RECEIPT = buildReceipt({
  operation: "docx.render",
  domain: "docx",
  engine: { name: "@runstamp/docx", version: "0.5.7" },
  inputHash: `sha256:${"1".repeat(64)}`,
  options: { deterministic: true },
});

const ERROR = new PaperError({
  code: "common/SCHEMA_REJECTED",
  phase: "validation",
  message: "Document failed validation.",
  remediation: "Correct the reported issues and retry.",
});

describe("ok / fail", () => {
  it("always materializes losses and diagnostics as arrays (R7)", () => {
    const success = ok({ pages: 3 }, { receipt: RECEIPT });
    expect(success.losses).toEqual([]);
    expect(success.diagnostics).toEqual([]);

    const failure = fail(ERROR);
    expect(failure.losses).toEqual([]);
    expect(failure.diagnostics).toEqual([]);
  });

  it("carries supplied losses and diagnostics through", () => {
    const loss = createLoss({
      code: "docx/FONT_SUBSTITUTED",
      severity: "substituted",
      subject: "font Calibri",
      message: "Calibri was unavailable; Carlito was substituted.",
    });
    const diagnostic = createDiagnostic({
      code: "docx/AUTOFIT_APPLIED",
      severity: "info",
      message: "Table auto-fit was applied.",
      phase: "layout",
    });
    const success = ok(null, { losses: [loss], diagnostics: [diagnostic], receipt: RECEIPT });
    expect(success.losses).toHaveLength(1);
    expect(success.diagnostics).toHaveLength(1);
  });

  it("omits the receipt on failure when none is supplied (R8)", () => {
    expect("receipt" in fail(ERROR)).toBe(false);
    expect("receipt" in fail(ERROR, { receipt: RECEIPT })).toBe(true);
  });

  it("carries no value on failure", () => {
    expect("value" in fail(ERROR)).toBe(false);
  });
});

describe("guards", () => {
  it("discriminate solely on ok (R6)", () => {
    const success = ok(42, { receipt: RECEIPT });
    const failure = fail(ERROR);

    expect(isOk(success)).toBe(true);
    expect(isFail(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isFail(failure)).toBe(true);

    // Narrowing must make `value` reachable without a cast.
    if (isOk(success)) expect(success.value).toBe(42);
    if (isFail(failure)) expect(failure.error.code).toBe("common/SCHEMA_REJECTED");
  });
});

describe("unwrap", () => {
  it("returns the value on success", () => {
    expect(unwrap(ok("done", { receipt: RECEIPT }))).toBe("done");
  });

  it("throws the original error on failure", () => {
    expect(() => unwrap(fail(ERROR))).toThrow(ERROR);
  });
});

describe("serializability (R9)", () => {
  it("round-trips a success envelope through JSON", () => {
    const loss = createLoss({
      code: "pdf/VECTOR_RASTERIZED",
      severity: "degraded",
      subject: "vector artwork on page 3",
      message: "Vector artwork was rasterized at 300dpi.",
      avoidable: true,
      remediation: "Set rasterizeVectors to false.",
    });
    const success = ok({ pages: 3 }, { losses: [loss], receipt: RECEIPT });
    expect(JSON.parse(JSON.stringify(success))).toEqual(success);
  });

  it("round-trips a failure envelope through JSON with the error intact", () => {
    const failure = fail(ERROR, { receipt: RECEIPT });
    const wire = JSON.parse(JSON.stringify(failure)) as {
      ok: boolean;
      error: { code: string; remediation: string };
    };
    expect(wire.ok).toBe(false);
    expect(wire.error.code).toBe("common/SCHEMA_REJECTED");
    expect(wire.error.remediation).toBe("Correct the reported issues and retry.");
  });
});

/**
 * `requireBytes` — bad input is a document condition, not a `TypeError`.
 *
 * Nine byte-input operations across four engines reached `Buffer.from(input)`
 * directly and threw a raw TypeError for anything that was not array-like. That
 * is the R4 line: the caller supplied bad data, and bad data is a result with a
 * remediation. The bug survived because the hostile-input corpus only ever
 * exercised `render`.
 */
describe("requireBytes", () => {
  it("passes bytes through", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(requireBytes(bytes)).toBe(bytes);
  });

  it("accepts an ArrayBuffer and other views without copying the contents", () => {
    expect(Array.from(requireBytes(new Uint8Array([7, 8]).buffer))).toEqual([7, 8]);
  });

  it("raises a PaperError with a remediation, never a TypeError", () => {
    let raised: unknown;
    try {
      requireBytes({ not: "bytes" });
    } catch (error) {
      raised = error;
    }
    expect(isPaperError(raised)).toBe(true);
    expect((raised as PaperError).code).toBe("common/SCHEMA_REJECTED");
    expect((raised as PaperError).remediation.length).toBeGreaterThan(0);
  });

  it("names what it received, so the message is actionable", () => {
    expect(() => requireBytes(null)).toThrow(/received null/);
    expect(() => requireBytes(42)).toThrow(/received a number/);
  });
});
