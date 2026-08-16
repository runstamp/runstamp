import { describe, expect, it } from "vitest";

import { toPaperError } from "../interop.js";
import {
  CORE_LEGACY_CODES,
  DOCX_LEGACY_CODES,
  LEGACY_CODE_TABLES,
  LICENSE_LEGACY_CODES,
  PDF_LEGACY_CODES,
  lookupLegacyCode,
} from "../legacy-codes.js";
import { PaperError } from "../errors.js";
import { ERROR_DOMAINS } from "../types.js";

/**
 * Faithful reproductions of the four legacy shapes, matching the real classes in
 * packages/core/src/errors.ts, packages/json-to-pdf/src/errors.ts,
 * packages/docx/src/errors.ts and the license package.
 */
class LegacyPaperError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly phase: string,
    readonly remediation?: string,
    readonly issues?: unknown[],
  ) {
    super(message);
    this.name = "PaperError";
  }
}

class LegacyPdfError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PdfError";
  }
}

class LegacyDocxError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recovery?: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DOCXError";
  }
}

class LegacyFeatureError extends Error {
  readonly phase = "license";
  constructor(
    readonly code: string,
    message: string,
    readonly remediation: string,
  ) {
    super(message);
    this.name = "RunstampFeatureError";
  }
}

describe("legacy code tables", () => {
  it("cover all 71 shipped codes", () => {
    expect(Object.keys(CORE_LEGACY_CODES)).toHaveLength(27);
    expect(Object.keys(PDF_LEGACY_CODES)).toHaveLength(8);
    expect(Object.keys(DOCX_LEGACY_CODES)).toHaveLength(33);
    expect(Object.keys(LICENSE_LEGACY_CODES)).toHaveLength(3);
  });

  it("map every legacy code to a well-formed namespaced contract code", () => {
    for (const table of Object.values(LEGACY_CODE_TABLES)) {
      for (const [legacy, mapping] of Object.entries(table)) {
        const slash = mapping.contractCode.indexOf("/");
        expect(slash, `${legacy} must be namespaced`).toBeGreaterThan(0);
        const domain = mapping.contractCode.slice(0, slash);
        expect(ERROR_DOMAINS, `${legacy} -> unknown domain "${domain}"`).toContain(domain);
        expect(mapping.contractCode.slice(slash + 1)).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    }
  });

  it("give every legacy code a non-empty remediation (R10)", () => {
    // PdfError had no remediation concept at all; this is where its eight codes
    // acquire one.
    for (const table of Object.values(LEGACY_CODE_TABLES)) {
      for (const [legacy, mapping] of Object.entries(table)) {
        expect(mapping.remediation.length, `${legacy} has no remediation`).toBeGreaterThan(0);
        expect(mapping.remediation, `${legacy} remediation must not restate the code`).not.toBe(
          legacy,
        );
      }
    }
  });
});

describe("collision resolution (§1.1)", () => {
  it("resolves RESOURCE_LIMIT_EXCEEDED, previously emitted by two unrelated classes", () => {
    const fromCore = toPaperError(
      new LegacyPaperError("RESOURCE_LIMIT_EXCEEDED", "too big", "rendering"),
    );
    const fromDocx = toPaperError(
      new LegacyDocxError("RESOURCE_LIMIT_EXCEEDED", "too big", "Reduce complexity."),
    );

    // Both now carry the same portable code, so a consumer can branch once...
    expect(fromCore.code).toBe("common/RESOURCE_LIMIT_EXCEEDED");
    expect(fromDocx.code).toBe("common/RESOURCE_LIMIT_EXCEEDED");
    // ...while origin remains recoverable.
    expect(fromCore.details?.legacyModel).toBe("core");
    expect(fromDocx.details?.legacyModel).toBe("docx");
  });

  it("resolves FEATURE_REQUIRES_UPGRADE, previously emitted by two classes", () => {
    const fromCore = toPaperError(
      new LegacyPaperError("FEATURE_REQUIRES_UPGRADE", "pro only", "validation"),
    );
    const fromLicense = toPaperError(
      new LegacyFeatureError("FEATURE_REQUIRES_UPGRADE", "pro only", "Buy a license."),
    );
    expect(fromCore.code).toBe("license/FEATURE_REQUIRES_UPGRADE");
    expect(fromLicense.code).toBe("license/FEATURE_REQUIRES_UPGRADE");
  });

  it("namespaces the five docx codes that were missing their own prefix", () => {
    for (const legacy of [
      "TABLE_GRID_MISMATCH",
      "INVALID_COLOR",
      "INVALID_FONT_SIZE",
      "IMAGE_SIZE_EXCEEDED",
    ]) {
      expect(toPaperError(new LegacyDocxError(legacy, "x")).code).toBe(`docx/${legacy}`);
    }
    // The fifth, RESOURCE_LIMIT_EXCEEDED, is cross-cutting and becomes common/.
    expect(toPaperError(new LegacyDocxError("RESOURCE_LIMIT_EXCEEDED", "x")).code).toBe(
      "common/RESOURCE_LIMIT_EXCEEDED",
    );
  });
});

describe("field unification", () => {
  it("maps docx `recovery` onto `remediation`", () => {
    const error = toPaperError(
      new LegacyDocxError("DOCX_IMAGE_TIMEOUT", "timed out", "Embed the image as a data URI."),
    );
    expect(error.remediation).toBe("Embed the image as a data URI.");
  });

  it("maps docx `context` onto `details`", () => {
    const error = toPaperError(
      new LegacyDocxError("DOCX_IMAGE_TOO_LARGE", "big", undefined, { bytes: 1024 }),
    );
    expect(error.details?.bytes).toBe(1024);
  });

  it("maps pdf `details` onto `details`", () => {
    const error = toPaperError(new LegacyPdfError("PDFA_VIOLATION", "no font", { font: "Arial" }));
    expect(error.details?.font).toBe("Arial");
  });

  it("supplies a remediation for pdf errors, which had none", () => {
    const error = toPaperError(new LegacyPdfError("PDFA_VIOLATION", "no font"));
    expect(error.code).toBe("pdf/PDFA_VIOLATION");
    expect(error.remediation).toContain("Embed the offending font");
  });

  it("prefers a remediation the error carried over the table default", () => {
    const error = toPaperError(
      new LegacyPaperError("REGION_TOO_SMALL", "small", "layout", "Use colSpan >= 4."),
    );
    expect(error.remediation).toBe("Use colSpan >= 4.");
  });

  it("always preserves the original code", () => {
    expect(
      toPaperError(new LegacyDocxError("DOCX_CHART_NO_DATA", "x")).details?.legacyCode,
    ).toBe("DOCX_CHART_NO_DATA");
  });

  it("normalizes core issues, keeping path and message", () => {
    const error = toPaperError(
      new LegacyPaperError("VALIDATION_FAILED", "bad", "validation", undefined, [
        { path: "slides[0]", message: "too small", slideIndex: 0, primitive: "metricStack" },
        { path: "x", message: "" }, // dropped: no message
        "not an object", // dropped
      ]),
    );
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toEqual({ path: "slides[0]", message: "too small" });
  });

  it("carries retryability from the table", () => {
    expect(toPaperError(new LegacyPaperError("RENDER_TIMEOUT", "slow", "rendering")).retryable).toBe(
      true,
    );
    expect(toPaperError(new LegacyPdfError("PDFA_VIOLATION", "x")).retryable).toBe(false);
  });
});

describe("toPaperError robustness", () => {
  it("passes an already-compliant PaperError through untouched", () => {
    const original = new PaperError({
      code: "pdf/PDFA_VIOLATION",
      phase: "serialization",
      message: "x",
      remediation: "y",
    });
    expect(toPaperError(original)).toBe(original);
  });

  it("is idempotent", () => {
    const once = toPaperError(new LegacyDocxError("DOCX_CHART_NO_DATA", "x"));
    expect(toPaperError(once)).toBe(once);
  });

  it("handles a plain Error with no code", () => {
    const error = toPaperError(new Error("boom"), { domain: "xlsx", phase: "serialization" });
    expect(error.code).toBe("xlsx/UNMAPPED_ERROR");
    expect(error.phase).toBe("serialization");
    expect(error.remediation.length).toBeGreaterThan(0);
    expect(error.message).toBe("boom");
  });

  it("handles a non-Error throwable", () => {
    const error = toPaperError("just a string", { domain: "pdf" });
    expect(error.code).toBe("pdf/UNKNOWN_THROWN_VALUE");
    expect(error.details?.thrown).toBe("just a string");
  });

  it("handles null and undefined", () => {
    expect(toPaperError(null).code).toBe("common/UNKNOWN_THROWN_VALUE");
    expect(toPaperError(undefined).code).toBe("common/UNKNOWN_THROWN_VALUE");
  });

  it("infers the model from the error name without an explicit hint", () => {
    expect(toPaperError(new LegacyPdfError("LAYOUT_IMPOSSIBLE", "x")).code).toBe(
      "pdf/LAYOUT_IMPOSSIBLE",
    );
  });

  it("falls back to the domain hint when the name is unrecognized", () => {
    const anonymous = { code: "DOCX_CHART_NO_DATA", message: "x" };
    expect(toPaperError(anonymous, { domain: "docx" }).code).toBe("docx/CHART_NO_DATA");
  });

  it("namespaces an unmapped code under the supplied domain rather than dropping it", () => {
    const error = toPaperError({ code: "SOME_NEW_CODE", message: "x" }, { domain: "xlsx" });
    expect(error.code).toBe("xlsx/SOME_NEW_CODE");
    expect(error.details?.legacyCode).toBe("SOME_NEW_CODE");
  });

  it("keeps the original as `cause` for debugging", () => {
    const original = new LegacyDocxError("DOCX_CHART_NO_DATA", "x");
    expect(toPaperError(original).cause).toBe(original);
  });

  it("produces an error that survives the JSON boundary", () => {
    const error = toPaperError(
      new LegacyDocxError("DOCX_IMAGE_TIMEOUT", "timed out", "Embed it.", { url: "http://x" }),
    );
    const wire = JSON.parse(JSON.stringify(error)) as { code: string; remediation: string };
    expect(wire.code).toBe("docx/IMAGE_TIMEOUT");
    expect(wire.remediation).toBe("Embed it.");
  });
});

describe("lookupLegacyCode", () => {
  it("returns a mapping for a known code and undefined otherwise", () => {
    expect(lookupLegacyCode("pdf", "PDFA_VIOLATION")?.contractCode).toBe("pdf/PDFA_VIOLATION");
    expect(lookupLegacyCode("pdf", "NOT_A_CODE")).toBeUndefined();
    // Table isolation: a docx code must not resolve through the pdf table.
    expect(lookupLegacyCode("pdf", "DOCX_CHART_NO_DATA")).toBeUndefined();
  });
});
