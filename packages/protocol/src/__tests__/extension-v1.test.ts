import { describe, expect, it } from "vitest";
import { ExtensionV1RequestSchema, ExtensionV1ResultSchema } from "../extension-v1.js";

const request = {
  version: "1.0",
  request: {
    schemaVersion: 1,
    extensionId: "runstamp.fixture",
    operation: "inspect",
    input: { value: 1 },
    context: {
      runId: "run-1",
      seed: "fixed",
      now: "2026-08-10T00:00:00Z",
      network: "disabled",
      budget: { maxInputBytes: 1024, maxOutputBytes: 1024, maxEntries: 10, maxDepth: 5, timeoutMs: 1000 },
    },
  },
} as const;

describe("extension protocol v1", () => {
  it("round trips a valid request and result", () => {
    expect(ExtensionV1RequestSchema.parse(request)).toEqual(request);
    const result = {
      version: "1.0",
      result: { status: "ok", output: { value: 1 }, warnings: [], losses: [], artifacts: [] },
      validators: [{ validator: "schema", version: "1", required: true, status: "PASS", command: "validate", issues: [] }],
    } as const;
    expect(ExtensionV1ResultSchema.parse(result)).toEqual(result);
  });

  it("rejects malformed requests", () => {
    expect(ExtensionV1RequestSchema.safeParse({ ...request, version: "2.0" }).success).toBe(false);
    expect(ExtensionV1RequestSchema.safeParse({ ...request, request: { ...request.request, operation: "" } }).success).toBe(false);
  });

  it("rejects unknown envelope and request fields", () => {
    expect(ExtensionV1RequestSchema.safeParse({ ...request, surprise: true }).success).toBe(false);
    expect(ExtensionV1RequestSchema.safeParse({ ...request, request: { ...request.request, surprise: true } }).success).toBe(false);
  });
});
