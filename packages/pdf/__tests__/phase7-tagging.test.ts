import { PdfEngine } from "../src/engine.js";
import { analyzePhase7Document } from "../src/phase7-analyze.js";
import { createTaggedDocument } from "../scripts/phase7-fixtures.js";

describe("Phase 7 tagging", () => {
  it("builds a structure tree with document, headings, lists, tables, and figures", async () => {
    const analysis = await analyzePhase7Document(createTaggedDocument());
    const roles = analysis.interactive.accessibility.structure.map((entry) => entry.role);
    expect(roles).toContain("Document");
    expect(roles).toContain("H1");
    expect(roles).toContain("H2");
    expect(roles).toContain("H3");
    expect(roles).toContain("L");
    expect(roles).toContain("LI");
    expect(roles).toContain("Lbl");
    expect(roles).toContain("LBody");
    expect(roles).toContain("Table");
    expect(roles).toContain("TH");
    expect(roles).toContain("TD");
    expect(roles).toContain("Figure");
  });

  it("renders list labels and bodies as separate tagged regions with a hanging indent", async () => {
    const analysis = await analyzePhase7Document({
      accessibility: { lang: "en-US", tagged: true },
      page: { margin: 48, size: { width: 300, height: 360 } },
      children: [{
        type: "list",
        ordered: true,
        items: [{
          text: "A deliberately long list item that wraps onto another line while keeping every body line aligned.",
        }],
      }],
    });
    const pageTexts = analysis.pages[0]?.texts ?? [];
    const label = pageTexts.find((text) => text.accessibility?.role === "Lbl");
    const bodyLines = pageTexts.filter((text) => text.accessibility?.role === "LBody");

    expect(label?.value).toBe("1.");
    expect(bodyLines.length).toBeGreaterThan(1);
    expect(label?.fontSize).toBe(10);
    expect(bodyLines.every((text) => text.fontSize === 10)).toBe(true);
    expect(new Set(bodyLines.map((text) => text.x)).size).toBe(1);
    expect(bodyLines[0]?.x).toBeGreaterThan((label?.x ?? Number.POSITIVE_INFINITY) + (label?.width ?? 0));
  });

  it("marks page numbering as artifacts", async () => {
    const analysis = await analyzePhase7Document(createTaggedDocument());
    expect(analysis.pages.every((page) =>
      page.texts.some((text) => text.accessibility?.artifact) &&
      (page.extraCommands ?? []).every((entry) => typeof entry === "string" || entry.accessibility?.artifact),
    )).toBe(true);
  });

  it("renders a tagged PDF catalog with structure and language entries", async () => {
    const buffer = await PdfEngine.render(createTaggedDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/StructTreeRoot");
    expect(text).toContain("/MarkInfo");
    expect(text).toContain("/Lang (en-US)");
    expect(text).toContain("/ParentTree");
  });
});
