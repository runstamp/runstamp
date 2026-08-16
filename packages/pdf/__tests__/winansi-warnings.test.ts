import { encodeWinAnsi } from "../src/winansi-encoding.js";

describe("encodeWinAnsi unmappable warnings", () => {
  it("reports each unmappable character with index, code point, and ASCII suggestion", () => {
    const warnings: Array<{ char: string; codePoint: number; suggestion: string; index: number }> = [];
    const out = encodeWinAnsi("≥ α →", (warning) => warnings.push(warning));
    // Each unmappable byte is replaced with '?' in the output
    expect(Array.from(out)).toContain(0x3f);
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toMatchObject({ char: "≥", codePoint: 0x2265, suggestion: ">=" });
    expect(warnings[1]).toMatchObject({ char: "α", codePoint: 0x03b1, suggestion: "alpha" });
    expect(warnings[2]).toMatchObject({ char: "→", codePoint: 0x2192, suggestion: "->" });
  });

  it("does not invoke the callback when every char is in WinAnsi", () => {
    const warnings: unknown[] = [];
    encodeWinAnsi("Hello — world", (warning) => warnings.push(warning));
    // em dash 0x2014 maps to 0x97 in WinAnsi, so it is mappable
    expect(warnings).toHaveLength(0);
  });

  it("returns the encoded buffer regardless of warnings", () => {
    const out = encodeWinAnsi("ABC≥");
    expect(out.length).toBe(4);
    expect(out[0]).toBe(0x41);
    expect(out[3]).toBe(0x3f);
  });
});
