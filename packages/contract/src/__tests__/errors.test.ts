import { describe, expect, it } from "vitest";

import {
  PaperError,
  contractViolation,
  isPaperError,
  paperErrorFromJSON,
} from "../errors.js";
import { COMMON_ERROR_CODES, isCommonErrorCode } from "../codes.js";
import { ERROR_DOMAINS } from "../types.js";
import type { Locator } from "../locator.js";

const LOCATOR: Locator = {
  artifact: `sha256:${"0".repeat(64)}`,
  domain: "docx",
  path: [{ kind: "paragraph", index: 4 }],
};

describe("PaperError", () => {
  it("defaults issues to [] and retryable to false", () => {
    const error = new PaperError({
      code: "docx/IMAGE_TIMEOUT",
      phase: "media",
      message: "Image fetch timed out.",
      remediation: "Increase timeoutMs or embed the image as a data URI.",
    });
    expect(error.issues).toEqual([]);
    expect(error.retryable).toBe(false);
    expect(error.name).toBe("PaperError");
    expect(error).toBeInstanceOf(Error);
    expect(isPaperError(error)).toBe(true);
  });

  it("recognizes an error from a second copy of this package", () => {
    // Two copies of @runstamp/contract in one dependency tree is routine, and a
    // bundler can split one copy into two chunks. `instanceof` fails across that
    // boundary, so an error built by the other copy must still be recognized —
    // otherwise a caller's isPaperError check silently rejects a real error.
    class ForeignPaperError extends Error {
      readonly code = "pdf/PDFA_VIOLATION";
      readonly remediation = "Embed the font or disable PDF/A conformance.";
      constructor() {
        super("Font not embedded.");
        this.name = "PaperError";
      }
    }
    const foreign = new ForeignPaperError();

    expect(foreign).not.toBeInstanceOf(PaperError);
    expect(isPaperError(foreign)).toBe(true);
  });

  it("does not mistake an unrelated error for a PaperError", () => {
    expect(isPaperError(new Error("plain"))).toBe(false);
    expect(isPaperError({ name: "PaperError", code: "pdf/X", remediation: "y" })).toBe(false);
    expect(isPaperError(null)).toBe(false);
  });

  it("exposes the domain segment of its code", () => {
    const error = new PaperError({
      code: "pdf/PDFA_VIOLATION",
      phase: "serialization",
      message: "Font not embedded.",
      remediation: "Embed the font or disable PDF/A conformance.",
    });
    expect(error.domain).toBe("pdf");
  });

  it("keeps a correct prototype chain", () => {
    const error = contractViolation("boom");
    expect(Object.getPrototypeOf(error)).toBe(PaperError.prototype);
    expect(error instanceof PaperError).toBe(true);
  });

  it("omits absent optional fields rather than setting them to undefined", () => {
    const error = new PaperError({
      code: "common/SCHEMA_REJECTED",
      phase: "validation",
      message: "bad",
      remediation: "fix",
    });
    expect("locator" in error).toBe(false);
    expect("details" in error).toBe(false);
    expect("locator" in error.toJSON()).toBe(false);
  });
});

describe("PaperError JSON round-trip (R13)", () => {
  const original = new PaperError({
    code: "xlsx/FORMULA_UNSUPPORTED",
    phase: "compilation",
    message: "Unsupported formula.",
    remediation: "Replace LAMBDA with a supported formula.",
    issues: [
      {
        path: "sheets[0].cells.A1",
        message: "LAMBDA is not supported.",
        expected: "a supported formula",
        received: "LAMBDA(...)",
        remediation: "Precompute the value.",
        locator: LOCATOR,
      },
    ],
    locator: LOCATOR,
    details: { formula: "LAMBDA(x,x)" },
    retryable: false,
    cause: new Error("inner"),
  });

  it("survives serialize -> parse -> reconstruct with every contractual field intact", () => {
    const wire = JSON.parse(JSON.stringify(original)) as ReturnType<PaperError["toJSON"]>;
    const restored = paperErrorFromJSON(wire);

    expect(restored.code).toBe(original.code);
    expect(restored.phase).toBe(original.phase);
    expect(restored.message).toBe(original.message);
    expect(restored.remediation).toBe(original.remediation);
    expect(restored.retryable).toBe(original.retryable);
    expect(restored.issues).toEqual(original.issues);
    expect(restored.locator).toEqual(original.locator);
    expect(restored.details).toEqual(original.details);
    expect(restored.toJSON()).toEqual(original.toJSON());
  });

  it("is idempotent across a second round trip", () => {
    const once = paperErrorFromJSON(JSON.parse(JSON.stringify(original)));
    const twice = paperErrorFromJSON(JSON.parse(JSON.stringify(once)));
    expect(twice.toJSON()).toEqual(once.toJSON());
  });

  it("preserves a retryable transient error", () => {
    const transient = new PaperError({
      code: "connector/RATE_LIMITED",
      phase: "transport",
      message: "Rate limited.",
      remediation: "Retry after the interval in details.retryAfterMs.",
      retryable: true,
    });
    expect(paperErrorFromJSON(transient.toJSON()).retryable).toBe(true);
  });
});

describe("contractViolation", () => {
  it("carries the common code and a non-empty remediation", () => {
    const error = contractViolation("missing argument", { arg: "input" });
    expect(error.code).toBe("common/CONTRACT_VIOLATION");
    expect(error.phase).toBe("input");
    expect(error.remediation.length).toBeGreaterThan(0);
    expect(error.details).toEqual({ arg: "input" });
  });
});

describe("common error codes", () => {
  it("are all well-formed and in the common domain (R11)", () => {
    for (const code of COMMON_ERROR_CODES) {
      expect(code.startsWith("common/")).toBe(true);
      expect(code.slice("common/".length)).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(isCommonErrorCode(code)).toBe(true);
    }
  });

  it("contain no duplicates", () => {
    expect(new Set(COMMON_ERROR_CODES).size).toBe(COMMON_ERROR_CODES.length);
  });

  it("rejects codes outside the set", () => {
    expect(isCommonErrorCode("docx/IMAGE_TIMEOUT")).toBe(false);
    expect(isCommonErrorCode("common/NOT_A_REAL_CODE")).toBe(false);
  });

  it("declares a domain list with no duplicates", () => {
    expect(new Set(ERROR_DOMAINS).size).toBe(ERROR_DOMAINS.length);
  });
});
