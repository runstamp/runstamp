import { describe, expect, it } from "vitest";
import {
  CATALOG,
  CATALOG_VERSION,
  findOperation,
  httpRoute,
  mcpToolName,
  resolveOperation,
} from "./index.js";

describe("public catalog", () => {
  it("contains exactly the frozen stable v1 catalog", () => {
    expect(CATALOG_VERSION).toBe("1.0.0");
    expect(CATALOG).toHaveLength(79);
    expect(CATALOG.every((operation) => operation.stability === "stable")).toBe(true);
    expect(CATALOG.every((operation) => !("implementation" in operation))).toBe(true);
    expect(Object.isFrozen(CATALOG)).toBe(true);
  });

  it("keeps names and projections unique", () => {
    expect(new Set(CATALOG.map((operation) => operation.name)).size).toBe(79);
    expect(new Set(CATALOG.map(httpRoute)).size).toBe(79);
    expect(new Set(CATALOG.map(mcpToolName)).size).toBe(79);
  });

  it("resolves exact, sole-qualified, and ambiguous operations safely", () => {
    expect(findOperation("pdf.render")?.name).toBe("pdf.render");
    expect(resolveOperation("docx", "convert")?.name).toBe("docx.convert.pdf");
    expect(resolveOperation("pdf", "extract")).toBeUndefined();
  });
});
