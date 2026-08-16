import { describe, expect, it, vi } from "vitest";
import { createModularTools } from "./runtime.js";

function payload(result: Awaited<ReturnType<ReturnType<typeof createModularTools>[number]["execute"]>>): any {
  return JSON.parse(result.content[0]?.text ?? "null");
}

describe("modular MCP tools", () => {
  it("exposes only progressive-disclosure list, describe, and invoke tools", () => {
    expect(createModularTools().map((tool) => tool.name)).toEqual([
      "runstamp_list_operations",
      "runstamp_describe_operation",
      "runstamp_invoke_operation",
    ]);
  });

  it("lists all 79 stable public operations without implementation metadata", async () => {
    const result = payload(await createModularTools()[0]!.execute({}));
    expect(result.count).toBe(79);
    expect(result.operations.every((operation: Record<string, unknown>) => operation.stability === "stable")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("implementation");
  });

  it("describes one operation on demand", async () => {
    const result = payload(await createModularTools()[1]!.execute({ name: "pdf.render" }));
    expect(result.operation.name).toBe("pdf.render");
    expect(result.httpRoute).toBe("/v1/pdf/render");
    expect(result.localEligible).toBe(true);
  });

  it("uses an installed optional engine in auto mode", async () => {
    const importModule = vi.fn(async () => ({
      render: async () => ({ ok: true, value: { answer: 42 }, losses: [], diagnostics: [], receipt: {} }),
    }));
    const tools = createModularTools({ importModule });
    const result = payload(await tools[2]!.execute({ operation: "pdf.render", input: { pages: [] } }));
    expect(result.ok).toBe(true);
    expect(result.value.answer).toBe(42);
    expect(importModule).toHaveBeenCalledWith("@runstamp/pdf/ops");
  });

  it("falls back to hosted /v1 when a local peer is unavailable", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, value: { hosted: true }, losses: [], diagnostics: [], receipt: {} }), {
      status: 200, headers: { "Content-Type": "application/json" },
    }));
    const tools = createModularTools({
      apiBaseUrl: "https://preview.example.test",
      apiKey: "preview-key",
      fetch: fetch as typeof globalThis.fetch,
      importModule: async () => { throw new Error("missing"); },
    });
    const result = payload(await tools[2]!.execute({ operation: "pdf.render", input: { pages: [] } }));
    expect(result.value.hosted).toBe(true);
    expect(fetch).toHaveBeenCalledWith(new URL("https://preview.example.test/v1/pdf/render"), expect.objectContaining({ method: "POST" }));
  });

  it("routes managed operations to hosted execution even in auto mode", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, value: {} }), { status: 200 }));
    const importModule = vi.fn();
    const tools = createModularTools({ apiBaseUrl: "https://preview.example.test", apiKey: "key", fetch: fetch as typeof globalThis.fetch, importModule });
    await tools[2]!.execute({ operation: "common.convert", input: {} });
    expect(importModule).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalled();
  });

  it("returns typed configuration errors without a viable execution path", async () => {
    const tools = createModularTools({ mode: "hosted", apiBaseUrl: undefined, apiKey: undefined });
    const result = await tools[2]!.execute({ operation: "common.convert", input: {} });
    expect(result.isError).toBe(true);
    expect(payload(result).error.code).toBe("common/CONFIGURATION_REQUIRED");
  });

  it("keeps managed operations hosted even under a local override", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, value: { hosted: true } }), { status: 200 }));
    const importModule = vi.fn();
    const result = await createModularTools({
      mode: "local", apiBaseUrl: "https://preview.example.test", apiKey: "key",
      fetch: fetch as typeof globalThis.fetch, importModule,
    })[2]!.execute({ operation: "pdf.extract.form-fields", input: "JVBERg==" });
    expect(payload(result).value.hosted).toBe(true);
    expect(importModule).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalled();
  });
});
