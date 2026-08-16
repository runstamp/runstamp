/**
 * `defineOperations` — the guard on the registry (OC-1 §6).
 *
 * Everything downstream is generated from descriptors, so a malformed one does
 * not fail here: it fails later as an MCP tool a model cannot call or an HTTP
 * route that cannot be built. These checks move that failure to the declaration.
 */

import { describe, expect, it } from "vitest";

import { defineOperations, isVerb, parseOperationName } from "../registry.js";
import type { OperationDescriptor } from "../registry.js";

function descriptor(overrides: Partial<OperationDescriptor> = {}): OperationDescriptor {
  return {
    name: "pdf.render",
    domain: "pdf",
    verb: "render",
    summary: "Render a structured document to PDF.",
    inputSchema: {},
    optionsSchema: {},
    valueSchema: {},
    errorCodes: ["common/SCHEMA_REJECTED"],
    lossCodes: [],
    deterministic: true,
    sideEffects: "none",
    stability: "stable",
    ...overrides,
  };
}

describe("defineOperations", () => {
  it("accepts and freezes a valid catalog", () => {
    const operations = defineOperations([descriptor()]);
    expect(operations).toHaveLength(1);
    expect(Object.isFrozen(operations)).toBe(true);
  });

  it("accepts a qualified operation name", () => {
    expect(() =>
      defineOperations([descriptor({ name: "xlsx.extract.tables", domain: "xlsx", verb: "extract" })]),
    ).not.toThrow();
  });

  it("rejects a verb outside the canonical taxonomy (R32)", () => {
    expect(() => defineOperations([descriptor({ name: "pdf.flatten" })])).toThrow(/canonical verb/);
  });

  it("rejects a name whose domain contradicts the descriptor", () => {
    expect(() => defineOperations([descriptor({ name: "docx.render" })])).toThrow(/domain/);
  });

  it("rejects a name whose verb contradicts the descriptor", () => {
    expect(() => defineOperations([descriptor({ verb: "validate" })])).toThrow(/verb/);
  });

  it("rejects duplicate operation names", () => {
    expect(() => defineOperations([descriptor(), descriptor()])).toThrow(/more than once/);
  });

  it("rejects an empty summary, which becomes the MCP tool description", () => {
    expect(() => defineOperations([descriptor({ summary: "  " })])).toThrow(/summary/);
  });

  it("rejects a catalog entry claiming it can never fail", () => {
    expect(() => defineOperations([descriptor({ errorCodes: [] })])).toThrow(/errorCodes/);
  });

  it("rejects a code namespaced to neither its domain nor common (R11)", () => {
    expect(() => defineOperations([descriptor({ lossCodes: ["docx/TRACKED_CHANGE_DROPPED"] })])).toThrow(
      /namespaced/,
    );
  });
});

describe("operation names", () => {
  it("recognizes every canonical verb and nothing else", () => {
    expect(isVerb("render")).toBe(true);
    expect(isVerb("redact")).toBe(true);
    expect(isVerb("flatten")).toBe(false);
  });

  it("splits a qualified name into its parts", () => {
    expect(parseOperationName("xlsx.extract.tables")).toEqual({
      domain: "xlsx",
      verb: "extract",
      qualifier: "tables",
    });
  });

  it("returns undefined rather than throwing for a malformed name", () => {
    expect(parseOperationName("pdf")).toBeUndefined();
    expect(parseOperationName("pdf.flatten")).toBeUndefined();
  });
});

/**
 * The dispatch invariant (`qualifier`).
 *
 * A projection sees only the registry. If two operations share a verb and the
 * registry does not say how each is selected, the projection calls the verb and
 * gets its default — so one of the two entries is unreachable and answers for
 * the other, silently, with a success status. These checks move that failure to
 * the declaration, which is the only place it is cheap.
 */
describe("qualified operation dispatch", () => {
  it("accepts a lone operation on a verb with no qualifier binding", () => {
    expect(() =>
      defineOperations([descriptor({ name: "pdf.extract.signatures", verb: "extract" })]),
    ).not.toThrow();
  });

  it("rejects a second operation on a verb that does not say how it is selected", () => {
    expect(() =>
      defineOperations([
        descriptor({ name: "pdf.extract.signatures", verb: "extract" }),
        descriptor({ name: "pdf.extract.text", verb: "extract" }),
      ]),
    ).toThrow(/must declare a `qualifier` binding/);
  });

  it("rejects two operations that claim the same binding", () => {
    expect(() =>
      defineOperations([
        descriptor({
          name: "pdf.extract.signatures",
          verb: "extract",
          qualifier: { option: "selector", value: "signatures" },
        }),
        descriptor({
          name: "pdf.extract.text",
          verb: "extract",
          qualifier: { option: "selector", value: "signatures" },
        }),
      ]),
    ).toThrow(/can never be reached/);
  });

  it("accepts distinct bindings on the same verb", () => {
    expect(() =>
      defineOperations([
        descriptor({
          name: "pdf.extract.signatures",
          verb: "extract",
          qualifier: { option: "selector", value: "signatures" },
        }),
        descriptor({
          name: "pdf.extract.text",
          verb: "extract",
          qualifier: { option: "selector", value: "text" },
        }),
      ]),
    ).not.toThrow();
  });
});
