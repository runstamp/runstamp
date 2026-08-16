import { describe, it, expect } from "vitest";
import { parseThemeXml, isSchemeColor, resolveColor, emitColorXml } from "../src/template/themeResolver.js";
import { emitColorXml as emitColorXmlMath, PIXEL_TO_EMU } from "../src/ooxml/drawing/math.js";
import { generateTheme } from "../src/ooxml/theme.js";
import { injectPlaceholderGeometry } from "../src/template/placeholderInjector.js";
import { resolveLayoutTarget } from "../src/template/layoutMapper.js";
import { generateSlideRels } from "../src/ooxml/slideRelationships.js";
import { generateShapeXml } from "../src/ooxml/drawing/shape.js";
import { generateTextXml } from "../src/ooxml/drawing/text.js";
import type { PaperSlide } from "../src/types/ast.js";
import type { TemplateIndex, PlaceholderInfo, MasterTextStyles } from "../src/template/parser.js";
import type { ThemeData } from "../src/template/themeResolver.js";
import type { LayoutNode } from "../src/layout/extract.js";

describe("Theme Color Resolution", () => {
  describe("isSchemeColor", () => {
    it("recognizes all 12 scheme color tokens", () => {
      const tokens = [
        "dk1", "lt1", "dk2", "lt2",
        "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
        "hlink", "folHlink",
      ];
      for (const t of tokens) {
        expect(isSchemeColor(t)).toBe(true);
      }
    });

    it("rejects hex colors", () => {
      expect(isSchemeColor("#FF0000")).toBe(false);
      expect(isSchemeColor("FF0000")).toBe(false);
    });

    it("rejects unknown tokens", () => {
      expect(isSchemeColor("primary")).toBe(false);
    });

    it("recognizes bg1, tx1, bg2, tx2 tokens", () => {
      expect(isSchemeColor("bg1")).toBe(true);
      expect(isSchemeColor("tx1")).toBe(true);
      expect(isSchemeColor("bg2")).toBe(true);
      expect(isSchemeColor("tx2")).toBe(true);
    });

    it("recognizes ColorModifier objects", () => {
      expect(isSchemeColor({ scheme: "accent1" })).toBe(true);
      expect(isSchemeColor({ scheme: "dk1" })).toBe(true);
    });
  });

  describe("resolveColor", () => {
    it("returns srgb type for hex colors", () => {
      const result = resolveColor("#4472C4");
      expect(result.type).toBe("srgb");
      expect(result.value).toBe("4472C4");
    });

    it("returns scheme type for scheme tokens", () => {
      const result = resolveColor("accent1");
      expect(result.type).toBe("scheme");
      expect(result.value).toBe("accent1");
    });
  });

  describe("emitColorXml", () => {
    it("emits srgbClr for hex colors", () => {
      expect(emitColorXml("#FF0000")).toBe('<a:srgbClr val="FF0000"/>');
    });

    it("emits schemeClr for theme tokens", () => {
      expect(emitColorXml("accent1")).toBe('<a:schemeClr val="accent1"/>');
    });
  });

  describe("parseThemeXml", () => {
    it("extracts color scheme from default theme", () => {
      const themeXml = generateTheme();
      const theme = parseThemeXml(themeXml);

      expect(theme.colorScheme.dk1).toBe("000000");
      expect(theme.colorScheme.lt1).toBe("FFFFFF");
      expect(theme.colorScheme.accent1).toBe("4472C4");
      expect(theme.colorScheme.accent2).toBe("ED7D31");
    });

    it("extracts font scheme from default theme", () => {
      const themeXml = generateTheme();
      const theme = parseThemeXml(themeXml);

      expect(theme.fontScheme.majorLatin).toBe("Carlito");
      expect(theme.fontScheme.minorLatin).toBe("Carlito");
    });
  });

  describe("Color Modifier Emission (math.ts)", () => {
    it("emits schemeClr with tint child", () => {
      const xml = emitColorXmlMath({ scheme: "accent1", tint: 50 });
      expect(xml).toBe('<a:schemeClr val="accent1"><a:tint val="50000"/></a:schemeClr>');
    });

    it("emits schemeClr with shade child", () => {
      const xml = emitColorXmlMath({ scheme: "dk1", shade: 75 });
      expect(xml).toBe('<a:schemeClr val="dk1"><a:shade val="75000"/></a:schemeClr>');
    });

    it("emits schemeClr with both tint and shade", () => {
      const xml = emitColorXmlMath({ scheme: "accent2", tint: 30, shade: 60 });
      expect(xml).toBe('<a:schemeClr val="accent2"><a:tint val="30000"/><a:shade val="60000"/></a:schemeClr>');
    });

    it("emits self-closing schemeClr when no tint/shade", () => {
      const xml = emitColorXmlMath({ scheme: "accent1" });
      expect(xml).toBe('<a:schemeClr val="accent1"/>');
    });

    it("still emits srgbClr for hex strings", () => {
      const xml = emitColorXmlMath("#FF0000");
      expect(xml).toBe('<a:srgbClr val="FF0000"/>');
    });

    it("still emits schemeClr for string tokens", () => {
      const xml = emitColorXmlMath("accent1");
      expect(xml).toBe('<a:schemeClr val="accent1"/>');
    });
  });
});

describe("Placeholder Injection", () => {
  const placeholders: PlaceholderInfo[] = [
    { idx: "0", type: "title", x: 457200, y: 274638, cx: 8229600, cy: 1143000 },
    { idx: "1", type: "body", x: 457200, y: 1600200, cx: 8229600, cy: 4525963 },
  ];
  const theme: ThemeData = {
    colorScheme: { accent1: "4472C4" },
    fontScheme: {
      majorLatin: "Aptos Display",
      minorLatin: "Aptos",
      majorEa: "MS Gothic",
      minorEa: "Yu Gothic",
    },
  };
  const masterTextStyles: MasterTextStyles = {
    titleStyle: {
      fontFamily: "Aptos Display",
      fontSize: 2800,
      lineSpacing: 2100,
      color: "#112233",
      bold: true,
    },
    bodyStyle: {
      fontFamily: "Aptos",
      fontSize: 1800,
      lineSpacing: 1800,
      color: "#445566",
    },
  };

  it("injects absolute position from template when no user coords", () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [
        { type: "Text", content: "Hello", placeholder: { type: "title", idx: 0 } },
      ],
    };
    injectPlaceholderGeometry(slide, placeholders);
    const child = slide.children[0] as Record<string, unknown>;
    const style = child.style as Record<string, unknown>;
    expect(style.position).toBe("absolute");
    expect(style.left).toBeCloseTo(457200 / PIXEL_TO_EMU);
    expect(style.top).toBeCloseTo(274638 / PIXEL_TO_EMU);
    expect(style.width).toBeCloseTo(8229600 / PIXEL_TO_EMU);
    expect(style.height).toBeCloseTo(1143000 / PIXEL_TO_EMU);
    expect(child._omitTransform).toBe(true);
  });

  it("does NOT override user-specified width/height", () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [
        { type: "Text", content: "Hello", style: { width: 100 }, placeholder: { type: "title", idx: 0 } },
      ],
    };
    injectPlaceholderGeometry(slide, placeholders);
    const child = slide.children[0] as Record<string, unknown>;
    const style = child.style as Record<string, unknown>;
    expect(style.width).toBe(100);
    expect(child._omitTransform).toBeUndefined();
  });

  it("matches by idx first, then by type", () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [
        { type: "Text", content: "Body", placeholder: { idx: 1 } },
      ],
    };
    injectPlaceholderGeometry(slide, placeholders);
    const style = (slide.children[0] as Record<string, unknown>).style as Record<string, unknown>;
    expect(style.top).toBeCloseTo(1600200 / PIXEL_TO_EMU);
  });

  it("normalizes placeholder typography for Text nodes using emitter-compatible units", () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "Placeholder body",
          placeholder: { type: "body", idx: 1 },
        },
      ],
    };

    injectPlaceholderGeometry(slide, [{
      ...placeholders[1],
      textStyle: {
        fontSize: 1800,
        lineSpacing: 1800,
        color: "#445566",
      },
    }], masterTextStyles, theme);

    const style = (slide.children[0] as Record<string, unknown>).style as Record<string, unknown>;
    expect(style.fontSize).toBe(18);
    expect(style.lineHeight).toBe(24);
    expect(style.color).toBe("#445566");
  });

  it("writes placeholder typography into View.textStyle so shape text emission can read it", () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [
        {
          type: "View",
          textContent: "Diagram label",
          placeholder: { type: "title", idx: 0 },
        },
      ],
    };

    injectPlaceholderGeometry(slide, placeholders, masterTextStyles, theme);

    const view = slide.children[0] as Record<string, unknown>;
    const style = view.style as Record<string, unknown>;
    const textStyle = view.textStyle as Record<string, unknown>;

    expect(style.left).toBeCloseTo(457200 / PIXEL_TO_EMU);
    expect(textStyle.fontFamily).toBe("Aptos Display");
    expect(textStyle.fontFallback).toEqual(["MS Gothic"]);
    expect(textStyle.fontSize).toBe(28);
    expect(textStyle.lineHeight).toBe(28);
    expect(textStyle.fontWeight).toBe("bold");
    expect(textStyle.color).toBe("#112233");
    expect(style.fontFamily).toBeUndefined();
  });

  it("emits placeholder typography from View.textStyle in generated shape XML", () => {
    const slide: PaperSlide = {
      type: "Slide",
      children: [
        {
          type: "View",
          textContent: "Diagram label",
          placeholder: { type: "title", idx: 0 },
          layout: { x: 0, y: 0, width: 200, height: 80 },
        } as unknown as PaperSlide["children"][number],
      ],
    };

    injectPlaceholderGeometry(slide, placeholders, masterTextStyles, theme);

    const { xml } = generateShapeXml(slide.children[0] as unknown as LayoutNode, 7);
    expect(xml).toContain('typeface="Aptos Display"');
    expect(xml).toContain('sz="2100"');
    expect(xml).toContain('<a:spcPts val="2100"/>');
  });
});

describe("Layout Target Resolution", () => {
  const fakeIndex = {
    layouts: [
      { name: "Title Slide", xml: "", rels: "", placeholders: [] },
      { name: "Blank", xml: "", rels: "", placeholders: [] },
    ],
  } as unknown as TemplateIndex;

  it("resolves known layout name to correct path", () => {
    expect(resolveLayoutTarget("Title Slide", fakeIndex)).toBe("../slideLayouts/slideLayout1.xml");
    expect(resolveLayoutTarget("Blank", fakeIndex)).toBe("../slideLayouts/slideLayout2.xml");
  });

  it("is case-insensitive", () => {
    expect(resolveLayoutTarget("title slide", fakeIndex)).toBe("../slideLayouts/slideLayout1.xml");
  });

  it("returns null for unknown layout", () => {
    expect(resolveLayoutTarget("NonExistent", fakeIndex)).toBeNull();
  });

  it("returns null for undefined layoutName", () => {
    expect(resolveLayoutTarget(undefined, fakeIndex)).toBeNull();
  });
});

describe("Slide Rels with Layout Target", () => {
  it("uses custom layout target", () => {
    const xml = generateSlideRels([], [], [], undefined, "../slideLayouts/slideLayout3.xml");
    expect(xml).toContain('Target="../slideLayouts/slideLayout3.xml"');
    expect(xml).not.toContain("slideLayout1.xml");
  });

  it("defaults to slideLayout1.xml", () => {
    const xml = generateSlideRels();
    expect(xml).toContain("slideLayout1.xml");
  });
});

describe("Shape XML with Placeholders", () => {
  it("emits <p:ph> when placeholder is set", () => {
    const node = {
      type: "View",
      layout: { x: 10, y: 20, width: 100, height: 50 },
      shapeType: "rect",
      placeholder: { type: "title", idx: 0 },
    } as unknown as LayoutNode;
    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain('<p:ph type="title" idx="0"/>');
  });

  it("emits <p:nvPr/> when no placeholder", () => {
    const node = {
      type: "View",
      layout: { x: 10, y: 20, width: 100, height: 50 },
      shapeType: "rect",
    } as unknown as LayoutNode;
    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain("<p:nvPr/>");
  });

  it("emits <a:xfrm> when _omitTransform is true but geometry is non-zero", () => {
    const node = {
      type: "View",
      layout: { x: 10, y: 20, width: 100, height: 50 },
      shapeType: "rect",
      _omitTransform: true,
    } as unknown as LayoutNode;
    const { xml } = generateShapeXml(node, 2);
    expect(xml).toContain("<a:xfrm>");
  });

  it("omits <a:xfrm> when _omitTransform is true and geometry is zero", () => {
    const node = {
      type: "View",
      layout: { x: 0, y: 0, width: 0, height: 0 },
      shapeType: "rect",
      _omitTransform: true,
    } as unknown as LayoutNode;
    const { xml } = generateShapeXml(node, 2);
    expect(xml).not.toContain("<a:xfrm>");
  });
});

describe("Text XML with Placeholders", () => {
  it("emits <p:ph> when placeholder is set", () => {
    const node = {
      type: "Text",
      content: "Hello",
      layout: { x: 10, y: 20, width: 200, height: 40 },
      placeholder: { type: "body", idx: 1 },
    } as unknown as LayoutNode;
    const { xml } = generateTextXml(node, 3);
    expect(xml).toContain('<p:ph type="body" idx="1"/>');
  });

  it("emits <a:xfrm> when _omitTransform is true but geometry is non-zero", () => {
    const node = {
      type: "Text",
      content: "Hello",
      layout: { x: 10, y: 20, width: 200, height: 40 },
      _omitTransform: true,
    } as unknown as LayoutNode;
    const { xml } = generateTextXml(node, 3);
    expect(xml).toContain("<a:xfrm>");
  });

  it("omits <a:xfrm> when _omitTransform is true and geometry is zero", () => {
    const node = {
      type: "Text",
      content: "Hello",
      layout: { x: 0, y: 0, width: 0, height: 0 },
      _omitTransform: true,
    } as unknown as LayoutNode;
    const { xml } = generateTextXml(node, 3);
    expect(xml).not.toContain("<a:xfrm>");
  });
});
