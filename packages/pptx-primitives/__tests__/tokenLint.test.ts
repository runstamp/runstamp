import { describe, expect, it } from "vitest";
import { lintTokenBundle } from "../src/tokens/index.js";

const BASE_TYPES = {
  display: { family: "Arial", weight: 700, size: 36, lineHeight: 42 },
  title: { family: "Arial", weight: 700, size: 24, lineHeight: 30 },
  body: { family: "Arial", weight: 400, size: 12, lineHeight: 16 },
  caption: { family: "Arial", weight: 400, size: 9, lineHeight: 12 },
  eyebrow: { family: "Arial", weight: 700, size: 9, lineHeight: 12 },
  nav: { family: "Arial", weight: 400, size: 9, lineHeight: 12 },
};

describe("lintTokenBundle", () => {
  it("passes a complete portable bundle", () => {
    const report = lintTokenBundle({
      version: "1.0",
      canvas: { surface: "#FFFFFF" },
      palette: {
        foreground: "#111111",
        muted: "#555555",
        faint: "#999999",
        rule: "#DDDDDD",
        accent: "#0F766E",
        accentInverse: "#FFFFFF",
        accentSecondary: "#2563EB",
      },
      type: BASE_TYPES,
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 72 },
    });

    expect(report.status).toBe("pass");
    expect(report.errors).toHaveLength(0);
  });

  it("reports schema and contrast failures without throwing", () => {
    const invalid = lintTokenBundle({
      version: "1.0",
      palette: {
        foreground: "black",
      },
    });
    expect(invalid.status).toBe("fail");
    expect(invalid.errors.some((issue) => issue.code === "TOKEN_SCHEMA_INVALID")).toBe(true);

    const lowContrast = lintTokenBundle({
      version: "1.0",
      canvas: { surface: "#FFFFFF" },
      palette: {
        foreground: "#F8F8F8",
        muted: "#FAFAFA",
        faint: "#AAAAAA",
        rule: "#EEEEEE",
        accent: "#FFFFFF",
        accentInverse: "#FDFDFD",
      },
      type: BASE_TYPES,
    });
    expect(lowContrast.status).toBe("fail");
    expect(lowContrast.errors.some((issue) => issue.code === "TOKEN_CONTRAST_LOW")).toBe(true);
  });

  it("warns on unpinned fonts and can escalate warnings", () => {
    const bundle = {
      version: "1.0",
      palette: {
        foreground: "#111111",
        muted: "#555555",
        faint: "#999999",
        rule: "#DDDDDD",
        accent: "#111111",
        accentInverse: "#FFFFFF",
      },
      type: {
        ...BASE_TYPES,
        title: { ...BASE_TYPES.title, family: "Unshipped Display" },
      },
    };

    const advisory = lintTokenBundle(bundle);
    expect(advisory.status).toBe("pass");
    expect(advisory.warnings.some((issue) => issue.code === "TOKEN_FONT_UNPINNED")).toBe(true);

    const gated = lintTokenBundle(bundle, { warningsAsErrors: true });
    expect(gated.status).toBe("fail");
    expect(gated.errors.some((issue) => issue.code === "TOKEN_FONT_UNPINNED")).toBe(true);
  });
});
