import { describe, it, expect } from "vitest";
import { generateNotesTheme, generateTheme } from "../src/ooxml/theme.js";

describe("Theme Customization (Phase 2)", () => {
  it("uses truthful admitted Latin defaults in both slide and notes themes", () => {
    const slideTheme = generateTheme();
    const notesTheme = generateNotesTheme();
    expect(slideTheme.match(/<a:latin typeface="Carlito"\/>/g)).toHaveLength(2);
    expect(notesTheme.match(/<a:latin typeface="Carlito"\/>/g)).toHaveLength(2);
    expect(notesTheme).not.toContain('<a:latin typeface="Aptos');
    expect(notesTheme).toContain('script="Jpan" typeface="游ゴシック Light"');
  });

  it("generates default theme when no config provided", () => {
    const xml = generateTheme();
    expect(xml).toContain('name="Office Theme"');
    expect(xml).toContain('<a:sysClr lastClr="000000" val="windowText"/>');
    expect(xml).toContain('<a:sysClr lastClr="FFFFFF" val="window"/>');
    expect(xml).toContain('val="4472C4"'); // default accent1
    expect(xml).toContain('val="ED7D31"'); // default accent2
    expect(xml).toContain('<a:latin typeface="Carlito"/>');
    expect(xml).not.toContain('typeface="Calibri');
  });

  it("generates default theme when empty config provided", () => {
    const xml = generateTheme({});
    expect(xml).toContain('name="Office Theme"');
    expect(xml).toContain('val="windowText"');
  });

  it("overrides theme name", () => {
    const xml = generateTheme({ name: "Corporate Blue" });
    expect(xml).toContain('name="Corporate Blue"');
    expect(xml).not.toContain('name="Office Theme"');
  });

  it("overrides dk1 from sysClr to srgbClr", () => {
    const xml = generateTheme({
      colorScheme: { dk1: "#111111" },
    });
    expect(xml).toContain('<a:dk1><a:srgbClr val="111111"/></a:dk1>');
    expect(xml).not.toContain("windowText");
    // lt1 should remain default sysClr
    expect(xml).toContain('<a:lt1><a:sysClr lastClr="FFFFFF" val="window"/></a:lt1>');
  });

  it("overrides lt1 from sysClr to srgbClr", () => {
    const xml = generateTheme({
      colorScheme: { lt1: "#FAFAFA" },
    });
    expect(xml).toContain('<a:lt1><a:srgbClr val="FAFAFA"/></a:lt1>');
    expect(xml).not.toContain('val="window"');
    // dk1 should remain default sysClr
    expect(xml).toContain("windowText");
  });

  it("overrides accent colors selectively", () => {
    const xml = generateTheme({
      colorScheme: {
        accent1: "#FF0000",
        accent3: "#00FF00",
      },
    });
    expect(xml).toContain('val="FF0000"'); // overridden
    expect(xml).toContain('val="ED7D31"'); // accent2 default
    expect(xml).toContain('val="00FF00"'); // overridden
    expect(xml).toContain('val="FFC000"'); // accent4 default
  });

  it("overrides hlink and folHlink", () => {
    const xml = generateTheme({
      colorScheme: {
        hlink: "#AABBCC",
        folHlink: "#DDEEFF",
      },
    });
    expect(xml).toContain('<a:hlink><a:srgbClr val="AABBCC"/></a:hlink>');
    expect(xml).toContain('<a:folHlink><a:srgbClr val="DDEEFF"/></a:folHlink>');
  });

  it("strips # from color values", () => {
    const xml = generateTheme({
      colorScheme: { accent1: "#abcdef" },
    });
    // Should be uppercase and without #
    expect(xml).toContain('val="ABCDEF"');
    expect(xml).not.toContain('val="#');
  });

  it("overrides majorLatin font (no panose)", () => {
    const xml = generateTheme({
      fontScheme: { majorLatin: "Helvetica" },
    });
    expect(xml).toContain('<a:latin typeface="Helvetica"/>');
    // The overridden element should NOT have a panose attribute
    const majorFontSection = xml.slice(
      xml.indexOf("<a:majorFont>"),
      xml.indexOf("</a:majorFont>"),
    );
    expect(majorFontSection).toContain('typeface="Helvetica"');
    expect(majorFontSection).not.toContain("panose");
  });

  it("overrides minorLatin font (no panose)", () => {
    const xml = generateTheme({
      fontScheme: { minorLatin: "Arial" },
    });
    const minorFontSection = xml.slice(
      xml.indexOf("<a:minorFont>"),
      xml.indexOf("</a:minorFont>"),
    );
    expect(minorFontSection).toContain('<a:latin typeface="Arial"/>');
    expect(minorFontSection).not.toContain("panose");
  });

  it("overrides majorEa and minorEa fonts", () => {
    const xml = generateTheme({
      fontScheme: {
        majorEa: "MS Gothic",
        minorEa: "MS Mincho",
      },
    });
    const majorFontSection = xml.slice(
      xml.indexOf("<a:majorFont>"),
      xml.indexOf("</a:majorFont>"),
    );
    const minorFontSection = xml.slice(
      xml.indexOf("<a:minorFont>"),
      xml.indexOf("</a:minorFont>"),
    );
    expect(majorFontSection).toContain('<a:ea typeface="MS Gothic"/>');
    expect(minorFontSection).toContain('<a:ea typeface="MS Mincho"/>');
  });

  it("keeps default fonts when no fontScheme provided", () => {
    const xml = generateTheme({ colorScheme: { accent1: "#FF0000" } });
    expect(xml).toContain('typeface="Carlito"');
    expect(xml).not.toContain('typeface="Calibri');
  });

  it("keeps fmtScheme completely unchanged", () => {
    const defaultXml = generateTheme();
    const customXml = generateTheme({
      name: "Custom",
      colorScheme: { dk1: "#000000", accent1: "#FF0000" },
      fontScheme: { majorLatin: "Helvetica" },
    });

    const defaultFmt = defaultXml.slice(
      defaultXml.indexOf("<a:fmtScheme"),
      defaultXml.indexOf("</a:fmtScheme>") + "</a:fmtScheme>".length,
    );
    const customFmt = customXml.slice(
      customXml.indexOf("<a:fmtScheme"),
      customXml.indexOf("</a:fmtScheme>") + "</a:fmtScheme>".length,
    );
    expect(defaultFmt).toBe(customFmt);
  });

  it("produces valid XML structure", () => {
    const xml = generateTheme({
      name: "Full Override",
      colorScheme: {
        dk1: "#000000", lt1: "#FFFFFF",
        dk2: "#333333", lt2: "#CCCCCC",
        accent1: "#FF0000", accent2: "#00FF00",
        accent3: "#0000FF", accent4: "#FFFF00",
        accent5: "#FF00FF", accent6: "#00FFFF",
        hlink: "#0000AA", folHlink: "#AA0000",
      },
      fontScheme: {
        majorLatin: "Georgia",
        minorLatin: "Verdana",
        majorEa: "SimSun",
        minorEa: "SimHei",
      },
    });
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<a:theme");
    expect(xml).toContain("</a:theme>");
    expect(xml).toContain("<a:clrScheme");
    expect(xml).toContain("</a:clrScheme>");
    expect(xml).toContain("<a:fontScheme");
    expect(xml).toContain("</a:fontScheme>");
    // All 12 color slots present
    for (const slot of ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]) {
      expect(xml).toContain(`<a:${slot}>`);
      expect(xml).toContain(`</a:${slot}>`);
    }
  });
});

describe("Theme Customization — Schema Validation", () => {
  it("accepts document with theme config", async () => {
    const { PaperDocumentSchema } = await import("../src/validator/schema.js");
    const doc = {
      type: "Document",
      meta: { title: "Test" },
      theme: {
        name: "Custom",
        colorScheme: { accent1: "#FF0000" },
        fontScheme: { majorLatin: "Helvetica" },
      },
      slides: [{ type: "Slide", children: [] }],
    };
    const result = PaperDocumentSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });

  it("rejects invalid color format in theme", async () => {
    const { PaperDocumentSchema } = await import("../src/validator/schema.js");
    const doc = {
      type: "Document",
      meta: {},
      theme: {
        colorScheme: { accent1: "red" }, // not hex
      },
      slides: [{ type: "Slide", children: [] }],
    };
    const result = PaperDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it("rejects color without # prefix", async () => {
    const { PaperDocumentSchema } = await import("../src/validator/schema.js");
    const doc = {
      type: "Document",
      meta: {},
      theme: {
        colorScheme: { accent1: "FF0000" }, // missing #
      },
      slides: [{ type: "Slide", children: [] }],
    };
    const result = PaperDocumentSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });

  it("accepts document without theme", async () => {
    const { PaperDocumentSchema } = await import("../src/validator/schema.js");
    const doc = {
      type: "Document",
      meta: {},
      slides: [{ type: "Slide", children: [] }],
    };
    const result = PaperDocumentSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });
});

describe("Theme Customization — End-to-End", () => {
  it("renders a PPTX with custom theme colors", async () => {
    const { PaperEngine } = await import("../src/engine.js");
    const JSZip = (await import("jszip")).default;

    const doc = {
      type: "Document" as const,
      meta: { title: "Theme Test" },
      theme: {
        name: "Brand Colors",
        colorScheme: {
          accent1: "#E63946",
          accent2: "#457B9D",
          accent3: "#1D3557",
        },
        fontScheme: {
          majorLatin: "Georgia",
          minorLatin: "Verdana",
        },
      },
      slides: [
        {
          type: "Slide" as const,
          children: [
            {
              type: "Text" as const,
              content: "Themed Slide",
              style: { fontSize: 24, color: "accent1" as const },
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify theme inside the PPTX
    const zip = await JSZip.loadAsync(buffer);
    const themeXml = await zip.file("ppt/theme/theme1.xml")?.async("text");
    expect(themeXml).toBeDefined();
    expect(themeXml).toContain('name="Brand Colors"');
    expect(themeXml).toContain('val="E63946"'); // accent1
    expect(themeXml).toContain('val="457B9D"'); // accent2
    expect(themeXml).toContain('val="1D3557"'); // accent3
    expect(themeXml).toContain('typeface="Gelasio"');
    expect(themeXml).toContain('typeface="Liberation Sans"');
    expect(themeXml).not.toContain('typeface="Georgia"');
    // Defaults should still be present for non-overridden slots
    expect(themeXml).toContain("windowText"); // dk1 default
    expect(themeXml).toContain('val="FFC000"'); // accent4 default
  });

  it("renders a PPTX with default theme when no theme config", async () => {
    const { PaperEngine } = await import("../src/engine.js");
    const JSZip = (await import("jszip")).default;

    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [
        {
          type: "Slide" as const,
          children: [
            { type: "Text" as const, content: "Default theme" },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const themeXml = await zip.file("ppt/theme/theme1.xml")?.async("text");
    expect(themeXml).toContain('name="Office Theme"');
    expect(themeXml).toContain("windowText");
    expect(themeXml).toContain('val="4472C4"'); // default accent1
    expect(themeXml).toContain('typeface="Carlito"');
  });
});
