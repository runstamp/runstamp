import { describe, expect, it, vi } from "vitest";
import { resolveAgentDesignTokens } from "../src/interpreter/design-tokens.js";

describe("fontStrategy contract", () => {
  it("defaults to portable admitted families and fallbacks", () => {
    const tokens = resolveAgentDesignTokens({ theme: "default-navy" });
    expect(tokens.typography.fontStrategy).toBe("portable");
    expect(tokens.typography.titleFontFamily).toBe("Liberation Sans");
    expect(tokens.typography.bodyFontFamily).toBe("Liberation Sans");
    expect(tokens.typography.titleFontFallback).toEqual(["Carlito", "Source Sans 3"]);
    expect(tokens.typography.bodyFontFallback).toEqual(["Carlito", "Source Sans 3"]);
  });

  it("system preserves an explicitly requested family and has no portable fallback promise", () => {
    const tokens = resolveAgentDesignTokens({
      designTokens: {
        typography: {
          fontStrategy: "system",
          titleFontFamily: "Aptos",
          bodyFontFamily: "Aptos",
        },
      },
    });
    expect(tokens.typography.fontStrategy).toBe("system");
    expect(tokens.typography.titleFontFamily).toBe("Aptos");
    expect(tokens.typography.bodyFontFamily).toBe("Aptos");
    expect(tokens.typography.titleFontFallback).toEqual([]);
    expect(tokens.typography.bodyFontFallback).toEqual([]);
  });

  it("user-embedded requires caller-supplied faces and has no registry fallback cascade", () => {
    const tokens = resolveAgentDesignTokens({
      designTokens: { typography: { fontStrategy: "user-embedded" } },
    });
    expect(tokens.typography.fontStrategy).toBe("user-embedded");
    expect(tokens.typography.titleFontFallback).toEqual([]);
    expect(tokens.typography.bodyFontFallback).toEqual([]);
  });

  it.each([
    ["named-with-fallback", "portable"],
    ["system-safe", "portable"],
    ["embedded", "user-embedded"],
  ] as const)("normalizes deprecated %s to %s", (legacy, canonical) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const tokens = resolveAgentDesignTokens({
      designTokens: { typography: { fontStrategy: legacy } },
    });
    expect(tokens.typography.fontStrategy).toBe(canonical);
    warn.mockRestore();
  });

  it("keeps the approved preset families distinct", () => {
    const serif = resolveAgentDesignTokens({ theme: "editorial-serif" });
    const navy = resolveAgentDesignTokens({ theme: "default-navy" });
    expect(serif.typography.titleFontFamily).toBe("Gelasio");
    expect(navy.typography.titleFontFamily).toBe("Liberation Sans");
  });

  it.each([
    ["default-navy", "Liberation Sans", "Liberation Sans"],
    ["editorial-serif", "Gelasio", "Gelasio"],
    ["monochrome", "Carlito", "Carlito"],
    ["dark-punch", "Source Sans 3", "Source Sans 3"],
    ["midnight", "Carlito", "Carlito"],
    ["terminal", "Liberation Mono", "Liberation Mono"],
    ["editorial-wide", "Gelasio", "Carlito"],
  ] as const)("resolves %s to %s / %s", (theme, title, body) => {
    const tokens = resolveAgentDesignTokens({ theme });
    expect(tokens.typography.titleFontFamily).toBe(title);
    expect(tokens.typography.bodyFontFamily).toBe(body);
  });
});
