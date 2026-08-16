import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { analyzeDocumentCompatibility } from "../src/compatibility/pptxCompatibility.js";
import { PaperEngine } from "../src/engine.js";
import { FontBridgeManager } from "../src/renderer/fontBridge.js";
import { autoLoadDocumentFonts } from "../src/typography/autoFont.js";
import {
  getCachedFontBuffer,
  inspectEmbeddableFont,
  resolveRegistryFont,
} from "../src/typography/fontRegistry.js";
import { getCachedShapedRuns, precomputeShapedSegments } from "../src/typography/segmentCache.js";
import type { PaperDocument, PaperText } from "../src/types/ast.js";

const FONT_DIR = join(import.meta.dirname, "../assets/fonts");

function oneTextDocument(fontFamily: string, content = "Portable text"): PaperDocument {
  return {
    type: "Document",
    meta: {},
    slides: [{
      type: "Slide",
      children: [{
        type: "Text",
        content,
        style: { fontFamily, fontSize: 20, width: 600, height: 80 },
      }],
    }],
  };
}

async function pptxParts(buffer: Buffer): Promise<{ zip: JSZip; slide: string; presentation: string; app: string }> {
  const zip = await JSZip.loadAsync(buffer);
  return {
    zip,
    slide: await zip.file("ppt/slides/slide1.xml")!.async("text"),
    presentation: await zip.file("ppt/presentation.xml")!.async("text"),
    app: await zip.file("docProps/app.xml")!.async("text"),
  };
}

describe("font asset registry", () => {
  it.each([
    ["Arial", "Liberation Sans"],
    ["Aptos", "Carlito"],
    ["Aptos Display", "Carlito"],
    ["Calibri", "Carlito"],
    ["Calibri Light", "Carlito"],
    ["Georgia", "Gelasio"],
    ["Trebuchet MS", "Source Sans 3"],
    ["Courier New", "Liberation Mono"],
  ])("resolves %s to the truthful admitted family %s", (requested, family) => {
    const asset = resolveRegistryFont(requested, "Regular");
    expect(asset?.family).toBe(family);
    expect(asset?.requestedFamily).toBe(requested);
    expect(asset?.fsType).toBe(0);
    expect(asset?.buffer.length).toBe(asset?.byteLength);
    expect(getCachedFontBuffer(asset?.sha256)).toBe(asset?.buffer);
  });

  it("returns complete real face variants", () => {
    expect(resolveRegistryFont("Arial", "Bold")?.face).toBe("Bold");
    expect(resolveRegistryFont("Arial", "Italic")?.face).toBe("Italic");
    expect(resolveRegistryFont("Arial", "BoldItalic")?.face).toBe("BoldItalic");
  });

  it("rejects a restricted fsType before writing", () => {
    const buffer = Buffer.from(readFileSync(join(FONT_DIR, "Carlito-Regular.ttf")));
    const tableCount = buffer.readUInt16BE(4);
    for (let index = 0; index < tableCount; index += 1) {
      const entry = 12 + index * 16;
      if (buffer.toString("ascii", entry, entry + 4) === "OS/2") {
        const offset = buffer.readUInt32BE(entry + 8);
        buffer.writeUInt16BE(0x0002, offset + 8);
        break;
      }
    }
    expect(() => inspectEmbeddableFont(buffer)).toThrow(/fsType=0x2/);
  });
});

describe("font resolution consumer parity", () => {
  it("attaches the face identity before shaping and canvas registers the same buffer", async () => {
    const doc = oneTextDocument("Aptos");
    const text = doc.slides[0].children![0] as PaperText;
    text.content = [{
      text: "Bold italic",
      style: { fontWeight: "bold", fontStyle: "italic" },
    }];

    await autoLoadDocumentFonts(doc);
    const run = text.content[0];
    expect(run.style?.fontFamily).toBe("Carlito");
    expect(run.style?.resolvedFont?.face).toBe("BoldItalic");

    precomputeShapedSegments(text);
    expect(getCachedShapedRuns(text)?.[0].resolvedFont?.sha256).toBe(run.style?.resolvedFont?.sha256);

    const register = vi.fn();
    const manager = new FontBridgeManager();
    expect(manager.registerFontFamily("Carlito", {
      register,
      registerFromPath: vi.fn(),
    }, run.style?.resolvedFont)).toBe(true);
    expect(register).toHaveBeenCalledWith(
      getCachedFontBuffer(run.style?.resolvedFont?.sha256),
      "Carlito",
    );
  });

  it("references the truthful portable family without emitting invalid PowerPoint font parts", async () => {
    const doc = oneTextDocument("Aptos");
    doc.slides[0].children!.push({
      type: "Text",
      content: "Same face again",
      style: { fontFamily: "Aptos", fontSize: 18, width: 600, height: 60 },
    });
    const compatibility = await analyzeDocumentCompatibility(doc);
    const { zip, slide, presentation, app } = await pptxParts(await PaperEngine.render(doc));
    const fontFiles = Object.keys(zip.files).filter((path) => /^ppt\/fonts\/font\d+\.fntdata$/.test(path));

    expect(fontFiles).toHaveLength(0);
    expect(presentation).not.toContain("embeddedFontLst");
    expect(slide).toContain('<a:latin typeface="Carlito"/>');
    expect(slide).not.toContain('<a:latin typeface="Aptos"/>');
    expect(app).toContain("Carlito");
    expect(app).not.toContain("Aptos");
    expect(compatibility.pixelGateEligible).toBe(false);
    expect(compatibility.slides[0].issues.filter((issue) =>
      issue.code === "FONT_EMBEDDING_UNAVAILABLE"
    )).toHaveLength(1);
  });

  it("applies the same authority to chart font consumers", async () => {
    const doc = oneTextDocument("Arial");
    doc.slides[0].children!.push({
      type: "Chart",
      style: { width: 500, height: 300 },
      chartData: {
        chartType: "bar",
        categories: ["Q1"],
        series: [{ name: "Revenue", values: [10] }],
        title: { text: "Revenue", fontFamily: "Georgia" },
        legend: { fontFamily: "Aptos" },
        dataLabels: { fontFamily: "Courier New" },
      },
    });
    await autoLoadDocumentFonts(doc);
    const chart = doc.slides[0].children![1];
    if (chart.type !== "Chart") throw new Error("expected chart");

    expect(chart.chartData.title?.fontFamily).toBe("Gelasio");
    expect(chart.chartData.legend?.fontFamily).toBe("Carlito");
    expect(chart.chartData.dataLabels?.fontFamily).toBe("Liberation Mono");
    expect(doc.resolvedFonts?.map((font) => font.family)).toEqual(expect.arrayContaining([
      "Gelasio",
      "Carlito",
      "Liberation Mono",
    ]));
  });

  it("keeps a:ea/a:cs empty and reports the pending coverage fallback", async () => {
    const doc = oneTextDocument("Arial", "東京市場 خطة التنفيذ");
    const compatibility = await analyzeDocumentCompatibility(doc);
    const { slide } = await pptxParts(await PaperEngine.render(doc));

    expect(slide).toContain('<a:latin typeface="Liberation Sans"/>');
    expect(slide).toContain('<a:ea typeface=""/>');
    expect(slide).toContain('<a:cs typeface=""/>');
    expect(compatibility.pixelGateEligible).toBe(false);
    expect(compatibility.slides[0].issues.map((issue) => issue.code)).toContain(
      "FONT_COVERAGE_FALLBACK_USED",
    );
  });

  it("system strategy preserves the requested name, embeds nothing, and is pixel-ineligible", async () => {
    const doc = oneTextDocument("Aptos");
    doc.fontStrategy = "system";
    const compatibility = await analyzeDocumentCompatibility(doc);
    const systemIdentity = doc.slides[0].children![0].style?.resolvedFont;
    const register = vi.fn();
    new FontBridgeManager().registerFontFamily("Aptos", {
      register,
      registerFromPath: vi.fn(),
    }, systemIdentity);
    const { zip, slide, presentation } = await pptxParts(await PaperEngine.render(doc));

    expect(slide).toContain('<a:latin typeface="Aptos"/>');
    expect(presentation).not.toContain("embeddedFontLst");
    expect(Object.keys(zip.files).filter((path) => /^ppt\/fonts\/font\d+\.fntdata$/.test(path))).toHaveLength(0);
    expect(compatibility.pixelGateEligible).toBe(false);
    expect(compatibility.slides[0].issues.map((issue) => issue.code)).toContain("FONT_SYSTEM_OPT_IN");
    expect(register).not.toHaveBeenCalled();
  });

  it("fails closed when caller-supplied PowerPoint font embedding is requested", async () => {
    const bytes = readFileSync(join(FONT_DIR, "Carlito-Regular.ttf"));
    const doc = oneTextDocument("Carlito");
    doc.fontStrategy = "user-embedded";
    doc.embeddedFonts = [{
      fontFamily: "Carlito",
      src: `data:font/ttf;base64,${bytes.toString("base64")}`,
    }];
    await expect(PaperEngine.render(doc)).rejects.toMatchObject({
      code: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
      phase: "font",
      path: ["embeddedFonts"],
    });
  });

  it("rejects unsupported remote font embedding before fetching the URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const doc = oneTextDocument("Remote Font");
      doc.fontStrategy = "user-embedded";
      doc.embeddedFonts = [{
        fontFamily: "Remote Font",
        src: "https://fonts.example.invalid/remote.ttf",
      }];

      await expect(PaperEngine.render(doc)).rejects.toMatchObject({
        code: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not borrow registry or system bytes when a user-embedded family is missing", async () => {
    const doc = oneTextDocument("Aptos");
    doc.fontStrategy = "user-embedded";
    await autoLoadDocumentFonts(doc);
    const identity = doc.slides[0].children![0].style?.resolvedFont;
    const register = vi.fn();
    const registerFromPath = vi.fn();
    const registered = new FontBridgeManager().registerFontFamily("Aptos", {
      register,
      registerFromPath,
    }, identity);

    expect(identity).toMatchObject({ family: "Aptos", source: "user" });
    expect(identity?.sha256).toBeUndefined();
    expect(registered).toBe(false);
    expect(register).not.toHaveBeenCalled();
    expect(registerFromPath).not.toHaveBeenCalled();
  });

  it("reports a missing caller face variant instead of silently claiming it exists", async () => {
    const bytes = readFileSync(join(FONT_DIR, "Carlito-Regular.ttf"));
    const doc = oneTextDocument("Carlito");
    doc.fontStrategy = "user-embedded";
    doc.embeddedFonts = [{
      fontFamily: "Carlito",
      src: `data:font/ttf;base64,${bytes.toString("base64")}`,
    }];
    doc.slides[0].children![0].style!.fontWeight = "bold";
    const compatibility = await analyzeDocumentCompatibility(doc);

    expect(compatibility.slides[0].issues.map((issue) => issue.code)).toContain(
      "FONT_MISSING_FACE_VARIANT",
    );
  });

  it("rejects user font aliases whose configured family disagrees with the bytes", async () => {
    const bytes = readFileSync(join(FONT_DIR, "Carlito-Regular.ttf"));
    const doc = oneTextDocument("Aptos");
    doc.fontStrategy = "user-embedded";
    doc.embeddedFonts = [{
      fontFamily: "Aptos",
      src: `data:font/ttf;base64,${bytes.toString("base64")}`,
    }];
    await expect(autoLoadDocumentFonts(doc)).rejects.toThrow(/family mismatch|aliases are not permitted/);
  });

  it("omits unsupported portable font parts through template mutation", async () => {
    const templateDoc = oneTextDocument("Template System");
    templateDoc.fontStrategy = "system";
    const template = await PaperEngine.render(templateDoc);
    const doc = oneTextDocument("Trebuchet MS", "Template portable face");
    doc.template = template;
    const { zip, slide, presentation } = await pptxParts(await PaperEngine.render(doc));

    expect(slide).toContain('<a:latin typeface="Source Sans 3"/>');
    expect(presentation).not.toContain("embeddedFontLst");
    expect(Object.keys(zip.files).some((path) => path.startsWith("ppt/fonts/font"))).toBe(false);
  });
});
