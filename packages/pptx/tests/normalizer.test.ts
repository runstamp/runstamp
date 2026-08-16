import { describe, it, expect } from "vitest";
import { normalizeStyle } from "../src/normalizer.js";

describe("normalizeStyle — Benchmark 2", () => {
  it("expands padding shorthand, specific key overrides", () => {
    const result = normalizeStyle({ padding: 10, paddingLeft: 5 });
    expect(result).toEqual({
      paddingTop: 10,
      paddingRight: 10,
      paddingBottom: 10,
      paddingLeft: 5,
    });
  });

  it("expands padding shorthand with no overrides", () => {
    const result = normalizeStyle({ padding: 20 });
    expect(result).toEqual({
      paddingTop: 20,
      paddingRight: 20,
      paddingBottom: 20,
      paddingLeft: 20,
    });
  });

  it("expands margin shorthand, specific key overrides", () => {
    const result = normalizeStyle({ margin: 8, marginTop: 0 });
    expect(result).toEqual({
      marginTop: 0,
      marginRight: 8,
      marginBottom: 8,
      marginLeft: 8,
    });
  });

  it("specific padding keys without shorthand pass through unchanged", () => {
    const result = normalizeStyle({ paddingTop: 4, paddingLeft: 16 });
    expect(result).toEqual({ paddingTop: 4, paddingLeft: 16 });
  });

  it("preserves unrelated style properties", () => {
    const result = normalizeStyle({
      padding: 10,
      backgroundColor: "#FF0000",
      flexDirection: "row",
    });
    expect(result).toMatchObject({
      paddingTop: 10,
      backgroundColor: "#FF0000",
      flexDirection: "row",
    });
    expect(result).not.toHaveProperty("padding");
  });

  it("strips shorthand keys from output", () => {
    const result = normalizeStyle({ padding: 10, margin: 5 });
    expect(result).not.toHaveProperty("padding");
    expect(result).not.toHaveProperty("margin");
  });
});
