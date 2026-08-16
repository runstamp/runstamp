import { describe, expect, it } from "vitest";

import { canonicalJson, hashBytes, hashValue, sha256Hex } from "../canonical.js";
import { isPaperError } from "../errors.js";

function expectContractViolation(fn: () => unknown): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(isPaperError(thrown)).toBe(true);
  expect((thrown as { code: string }).code).toBe("common/CONTRACT_VIOLATION");
}

describe("canonicalJson", () => {
  it("sorts object keys recursively so insertion order cannot affect the hash", () => {
    const a = { b: 1, a: { d: 4, c: 3 } };
    const b = { a: { c: 3, d: 4 }, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":{"c":3,"d":4},"b":1}');
    expect(hashValue(a)).toBe(hashValue(b));
  });

  it("preserves array order, which is meaningful", () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it("omits undefined properties rather than encoding them", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalJson({ a: 1 })).toBe(canonicalJson({ a: 1, b: undefined }));
  });

  it("normalizes -0 to 0", () => {
    expect(canonicalJson(-0)).toBe("0");
    expect(hashValue({ v: -0 })).toBe(hashValue({ v: 0 }));
  });

  it("emits no insignificant whitespace", () => {
    expect(canonicalJson({ a: [1, { b: 2 }] })).toBe('{"a":[1,{"b":2}]}');
  });

  it("handles primitives and null", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson("x")).toBe('"x"');
    expect(canonicalJson(1.5)).toBe("1.5");
  });

  it("rejects values whose JSON form could vary between runs", () => {
    expectContractViolation(() => canonicalJson(undefined));
    expectContractViolation(() => canonicalJson(Number.NaN));
    expectContractViolation(() => canonicalJson(Number.POSITIVE_INFINITY));
    expectContractViolation(() => canonicalJson(() => 1));
    expectContractViolation(() => canonicalJson(Symbol("s")));
    expectContractViolation(() => canonicalJson(10n));
    // Dates are rejected deliberately: an implicit conversion would make hashes
    // depend on runtime behavior rather than on the value.
    expectContractViolation(() => canonicalJson(new Date(0)));
    expectContractViolation(() => canonicalJson(new Map()));
  });

  it("rejects circular structures", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expectContractViolation(() => canonicalJson(cyclic));
  });

  it("reports the path of the offending value", () => {
    let message = "";
    try {
      canonicalJson({ outer: { inner: [1, Number.NaN] } });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("$.outer.inner[1]");
  });

  it("allows a null-prototype object", () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare.a = 1;
    expect(canonicalJson(bare)).toBe('{"a":1}');
  });
});

describe("hashing", () => {
  it("produces the known SHA-256 of the empty string", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes strings and bytes identically for identical content", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex(new TextEncoder().encode("abc")));
  });

  it("prefixes digests with the algorithm", () => {
    expect(hashValue({})).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hashBytes(new Uint8Array([1, 2, 3]))).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is stable across calls", () => {
    expect(hashValue({ a: [1, 2, 3] })).toBe(hashValue({ a: [1, 2, 3] }));
  });
});
