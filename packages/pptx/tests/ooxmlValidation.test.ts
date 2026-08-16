import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument, ChartData } from "../src/types/ast.js";
import { validatePptxStructure as validateCorePptxStructure } from "../src/quality/structuralValidation.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["p:sp", "p:grpSp", "p:pic", "p:graphicFrame", "Relationship", "Override", "Default"].includes(name),
});

const chartData: ChartData = {
  chartType: "bar",
  categories: ["A", "B", "C"],
  series: [{ name: "S1", values: [10, 20, 30] }],
};

async function validatePptxStructure(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Content types must exist and list all slides
  const ctFile = zip.file("[Content_Types].xml");
  expect(ctFile).not.toBeNull();
  const ctXml = await ctFile!.async("string");

  // 2. Every slide must have a matching rels file
  const slideFiles = Object.keys(zip.files).filter(
    (f) => f.match(/^ppt\/slides\/slide\d+\.xml$/) && !f.includes("_rels"),
  );

  for (const slideFile of slideFiles) {
    // Content types should reference this slide
    const slideNum = slideFile.match(/slide(\d+)/)?.[1];
    expect(ctXml).toContain(`/ppt/slides/slide${slideNum}.xml`);

    // Rels file must exist
    const relsFile = zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`);
    expect(relsFile).not.toBeNull();

    // Parse rels
    const relsXml = await relsFile!.async("string");

    // Parse slide XML for rId references
    const slideXml = await zip.file(slideFile)!.async("string");

    // Check image rIds resolve
    const imageRefs = slideXml.match(/r:embed="(rId\d+)"/g) ?? [];
    for (const ref of imageRefs) {
      const rId = ref.match(/rId\d+/)?.[0];
      if (rId) {
        expect(relsXml).toContain(`Id="${rId}"`);
      }
    }

    // Check chart rIds resolve
    const chartRefs = slideXml.match(/r:id="(rId\d+)"/g) ?? [];
    for (const ref of chartRefs) {
      const rId = ref.match(/rId\d+/)?.[0];
      if (rId) {
        expect(relsXml).toContain(`Id="${rId}"`);
      }
    }
  }

  // 3. Root spTree should have id="1" groupShape
  for (const slideFile of slideFiles) {
    const slideXml = await zip.file(slideFile)!.async("string");
    expect(slideXml).toContain('<p:cNvPr id="1" name=""/>');
  }

  // 4. Check all media files referenced in rels exist in ZIP
  for (const slideFile of slideFiles) {
    const slideNum = slideFile.match(/slide(\d+)/)?.[1];
    const relsXml = await zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`)!.async("string");

    const mediaTargets = relsXml.match(/Target="(\.\.\/media\/[^"]+)"/g) ?? [];
    for (const target of mediaTargets) {
      const path = target.match(/Target="\.\.\/(.+)"/)?.[1];
      if (path) {
        expect(zip.file(`ppt/${path}`)).not.toBeNull();
      }
    }

    const chartTargets = relsXml.match(/Target="(\.\.\/charts\/[^"]+)"/g) ?? [];
    for (const target of chartTargets) {
      const path = target.match(/Target="\.\.\/(.+)"/)?.[1];
      if (path) {
        expect(zip.file(`ppt/${path}`)).not.toBeNull();
      }
    }
  }

  // 5. Validate chart files if present
  const chartFiles = Object.keys(zip.files).filter(
    (f) => f.match(/^ppt\/charts\/chart\d+\.xml$/),
  );
  for (const chartFile of chartFiles) {
    // Content types should reference charts
    const chartNum = chartFile.match(/chart(\d+)/)?.[1];
    expect(ctXml).toContain(`/ppt/charts/chart${chartNum}.xml`);

    // Chart rels must exist
    const chartRelsFile = zip.file(`ppt/charts/_rels/chart${chartNum}.xml.rels`);
    expect(chartRelsFile).not.toBeNull();

    // Embedded Excel must exist
    const chartRelsXml = await chartRelsFile!.async("string");
    const xlsxTarget = chartRelsXml.match(/Target="(\.\.\/embeddings\/[^"]+)"/)?.[1];
    if (xlsxTarget) {
      expect(zip.file(`ppt/${xlsxTarget.replace("../", "")}`)).not.toBeNull();
    }
  }

  // 6. No duplicate shape IDs within a slide
  for (const slideFile of slideFiles) {
    const slideXml = await zip.file(slideFile)!.async("string");
    const idMatches = slideXml.match(/id="(\d+)"/g) ?? [];
    const ids = idMatches.map((m) => m.match(/\d+/)?.[0]);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  }

  return { zip, slideFiles, ctXml };
}

describe("OOXML Structural Validation", () => {
  it("validates a simple text document", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Validation Test" },
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "Hello", style: { fontSize: 24 } },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    await validatePptxStructure(buffer);
  });

  it("accepts Office-default normAutofit but rejects conflicting autofit policies", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Autofit validation" },
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "Office default autofit", style: { fontSize: 24 } },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const structural = await validateCorePptxStructure(buffer);
    expect(structural.status).toBe("passed");

    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    zip.file("ppt/slides/slide1.xml", slideXml.replace('<a:normAutofit fontScale="100000"/>', '<a:normAutofit fontScale="100000"/><a:spAutoFit/>'));

    const malformed = await zip.generateAsync({ type: "nodebuffer" });
    const malformedStructural = await validateCorePptxStructure(malformed);
    expect(malformedStructural.status).toBe("failed");
    expect(malformedStructural.checks.some((check) => check.id === "slide.1.autofit-policy.0" && !check.passed)).toBe(true);
  });

  it("validates a multi-slide document", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [{ type: "Text", content: "Slide 1" }],
        },
        {
          type: "Slide",
          children: [{ type: "Text", content: "Slide 2" }],
        },
        {
          type: "Slide",
          children: [{ type: "Text", content: "Slide 3" }],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const { slideFiles } = await validatePptxStructure(buffer);
    expect(slideFiles).toHaveLength(3);
  });

  it("validates a document with charts", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Chart",
              style: { width: 500, height: 300 },
              chartData,
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const { zip } = await validatePptxStructure(buffer);

    // Verify chart file exists
    expect(zip.file("ppt/charts/chart1.xml")).not.toBeNull();
    expect(zip.file("ppt/embeddings/chart1.xlsx")).not.toBeNull();
  });

  it("validates a document with groups", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Group",
              style: { width: 400, height: 300 },
              children: [
                { type: "Text", content: "Grouped text" },
                {
                  type: "View",
                  style: { backgroundColor: "#FF0000", width: 100, height: 50 },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    await validatePptxStructure(buffer);
  });

  it("validates a document with rich text and hyperlinks", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              content: [
                { text: "Visit " },
                { text: "example.com", hyperlink: "https://example.com" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const { zip } = await validatePptxStructure(buffer);

    // Verify hyperlink relationship
    const relsXml = await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string");
    expect(relsXml).toContain("https://example.com");
    expect(relsXml).toContain("hyperlink");
  });

  it("validates a mixed document (text + chart + group)", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "Title", style: { fontSize: 32 } },
            {
              type: "Chart",
              style: { width: 400, height: 250 },
              chartData,
            },
            {
              type: "Group",
              style: { width: 300, height: 200 },
              children: [
                { type: "Text", content: "In group" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    await validatePptxStructure(buffer);
  });

  it("validates slide XML parses as well-formed XML", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "Parse test", style: { fontSize: 24 } },
            { type: "View", style: { width: 100, height: 50, backgroundColor: "#FF0000" }, children: [] },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);

    // Parse every XML file in the ZIP — none should throw
    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir || !path.endsWith(".xml") && !path.endsWith(".rels")) continue;
      const xml = await file.async("string");
      expect(() => xmlParser.parse(xml), `Failed to parse ${path}`).not.toThrow();
    }
  });

  it("validates [Content_Types].xml has all required entries", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        { type: "Slide", children: [{ type: "Text", content: "CT check" }] },
        { type: "Slide", children: [{ type: "Text", content: "CT check 2" }] },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const ctXml = await zip.file("[Content_Types].xml")!.async("string");
    const parsed = xmlParser.parse(ctXml);
    const types = parsed?.Types;

    // Must have Default entries for rels and xml
    const defaults = types?.Default ?? [];
    const defaultExts = defaults.map((d: any) => d["@_Extension"]);
    expect(defaultExts).toContain("rels");
    expect(defaultExts).toContain("xml");

    // Must have Override for each slide
    const overrides = types?.Override ?? [];
    const overrideParts = overrides.map((o: any) => o["@_PartName"]);
    expect(overrideParts).toContain("/ppt/slides/slide1.xml");
    expect(overrideParts).toContain("/ppt/slides/slide2.xml");
    expect(overrideParts).toContain("/ppt/presentation.xml");
  });

  it("validates slide XML element ordering per ECMA-376", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            { type: "Text", content: "Order test", style: { fontSize: 20 } },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    const parsed = xmlParser.parse(slideXml);
    const sld = parsed?.["p:sld"];

    // p:sld must have p:cSld
    expect(sld).toBeDefined();
    expect(sld["p:cSld"]).toBeDefined();

    // p:cSld must have p:spTree
    const cSld = sld["p:cSld"];
    expect(cSld["p:spTree"]).toBeDefined();

    // p:spTree must have p:nvGrpSpPr, p:grpSpPr (in that order)
    const spTree = cSld["p:spTree"];
    expect(spTree["p:nvGrpSpPr"]).toBeDefined();
    expect(spTree["p:grpSpPr"]).toBeDefined();

    // Verify element order: nvGrpSpPr must come before grpSpPr in the raw XML
    const nvIdx = slideXml.indexOf("p:nvGrpSpPr");
    const grpIdx = slideXml.indexOf("p:grpSpPr");
    expect(nvIdx).toBeLessThan(grpIdx);
  });

  it("validates presentation.xml element ordering", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: { title: "Pres Order" },
      slides: [
        { type: "Slide", children: [{ type: "Text", content: "S1" }] },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const presXml = await zip.file("ppt/presentation.xml")!.async("string");

    // Per ECMA-376 §19.2.1.26: sldMasterIdLst must come before sldIdLst
    const masterIdx = presXml.indexOf("p:sldMasterIdLst");
    const slideIdx = presXml.indexOf("p:sldIdLst");
    const sldSzIdx = presXml.indexOf("p:sldSz");
    const notesSzIdx = presXml.indexOf("p:notesSz");

    expect(masterIdx).toBeGreaterThan(-1);
    expect(slideIdx).toBeGreaterThan(-1);
    expect(masterIdx).toBeLessThan(slideIdx);

    // sldSz must come after sldIdLst
    if (sldSzIdx > -1) {
      expect(slideIdx).toBeLessThan(sldSzIdx);
    }
    // notesSz must come after sldSz
    if (notesSzIdx > -1 && sldSzIdx > -1) {
      expect(sldSzIdx).toBeLessThan(notesSzIdx);
    }
  });

  it("validates all EMU values are non-negative integers in slide XML", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Text",
              content: "EMU check",
              style: { fontSize: 16, width: 200, height: 30 },
            },
          ],
        },
      ],
    };

    const buffer = await PaperEngine.render(doc);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("string");

    // Check x, y, cx, cy values are non-negative integers
    const emuValues = slideXml.match(/(?:x|y|cx|cy)="(-?\d+\.?\d*)"/g) ?? [];
    for (const match of emuValues) {
      const val = parseFloat(match.match(/"(.+)"/)?.[1] ?? "0");
      expect(val).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});
