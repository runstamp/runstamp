import { PdfEngine } from "../src/engine.js";
import { analyzePhase6Document } from "../src/phase6-analyze.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";
import {
  createExternalLinkDocument,
  createInteractiveTableDocument,
  createMixedFormDocument,
  createNavigationDocument,
  createPageNumberDocument,
} from "../scripts/phase6-fixtures.js";

describe("Phase 6 navigation", () => {
  let fonts: Awaited<ReturnType<typeof ensurePhase2FontFixtures>>;

  beforeAll(async () => {
    fonts = await ensurePhase2FontFixtures();
  }, 120_000);

  it("adds external link annotations for linked paragraphs", async () => {
    const buffer = await PdfEngine.render(createExternalLinkDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/Subtype /Link");
    expect(text).toContain("/S /URI");
    expect(text).toContain("(https://runstamp.com/docs)");
  });

  it("builds heading destinations, bookmarks, and page labels from the navigation fixture", async () => {
    const analysis = await analyzePhase6Document(createNavigationDocument());
    expect(analysis.headings.length).toBeGreaterThanOrEqual(4);
    expect(analysis.interactive.outlines?.length).toBeGreaterThanOrEqual(3);
    expect(analysis.interactive.pageLabels).toHaveLength(2);
    expect(analysis.pages.some((page) => page.annotations?.some((annotation) => annotation.kind === "link-internal"))).toBe(true);
  });

  it("materializes total-page text on every page-number page", async () => {
    const analysis = await analyzePhase6Document(createPageNumberDocument());
    const total = String(analysis.pages.length);
    expect(analysis.pages.length).toBeGreaterThan(1);
    expect(analysis.interactive.sharedForms).toHaveLength(0);
    expect(analysis.pages.every((page, pageIndex) =>
      page.texts.some((text) => text.value === `Page ${pageIndex + 1} of ${total}`),
    )).toBe(true);
    expect(analysis.pages.every((page) => (page.extraCommands ?? []).every((command) => !command.includes("/TP1 Do")))).toBe(true);
  });

  it("supports interactive analysis on documents that also contain tables", async () => {
    const analysis = await analyzePhase6Document(createInteractiveTableDocument());
    expect(analysis.pages.length).toBeGreaterThan(1);
    expect(analysis.headings.map((heading) => heading.title)).toContain("Pipeline Table");
    expect(analysis.interactive.outlines?.length).toBeGreaterThan(0);
    expect(analysis.pages[0]?.annotations?.some((annotation) => annotation.kind === "link-internal")).toBe(true);
  });

  it("renders interactive table documents without throwing", async () => {
    const buffer = await PdfEngine.render(createInteractiveTableDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/Outlines");
    expect(text).toContain("/PageMode /UseOutlines");
    expect(text).toContain("/Subtype /Link");
  });

  it("keeps bookmark and link analysis reachable when preformatted blocks are present", async () => {
    const document = {
      page: { margin: 72, size: "Letter" },
      children: [
        {
          id: "intro",
          level: 1,
          type: "heading" as const,
          value: "Introduction",
        },
        {
          children: [
            {
              type: "preformatted" as const,
              value: "  const ready = true;\n  if (ready) run();",
            },
          ],
          style: { marginTop: 12 },
          type: "container" as const,
        },
        {
          link: { kind: "internal" as const, target: "intro" },
          type: "paragraph" as const,
          value: "Back to intro",
        },
      ],
    };

    const analysis = await analyzePhase6Document(document);
    expect(analysis.headings.map((heading) => heading.title)).toContain("Introduction");
    expect(analysis.interactive.outlines?.length).toBeGreaterThan(0);
    expect(analysis.pages.some((page) => page.annotations?.some((annotation) => annotation.kind === "link-internal"))).toBe(true);

    const buffer = await PdfEngine.render(document);
    expect(buffer.toString("latin1")).toContain("/Outlines");
  });

  it("preserves authored annotation order for mixed form documents", async () => {
    const analysis = await analyzePhase6Document(createMixedFormDocument());
    const kinds = analysis.pages[0]?.annotations?.map((annotation) => annotation.kind);
    expect(kinds).toEqual(["form-text", "form-radio", "form-checkbox", "form-radio", "form-dropdown"]);
  });

  it("lays out RTL running header content with embedded fonts", async () => {
    const document = {
      page: { margin: 72, size: "Letter" as const },
      dynamicHeader: {
        content: [
          {
            direction: "rtl" as const,
            font: { family: "Noto Sans Arabic", source: fonts.arabic },
            fontSize: 14,
            textAlign: "right" as const,
            type: "paragraph" as const,
            value: "رأس الصفحة {page} من {total}",
          },
        ],
        height: 36,
        width: 468,
        x: 72,
        y: 780,
      },
      children: [
        {
          type: "paragraph" as const,
          value: Array.from({ length: 120 }, (_, index) => `Body paragraph ${index + 1} keeps the fixture on multiple pages.`).join(" "),
        },
      ],
    };

    const analysis = await analyzePhase6Document(document);

    expect(analysis.pages.length).toBeGreaterThan(1);
    expect(analysis.pages.every((page) =>
      page.texts.some((text) =>
        text.direction === "rtl" &&
        typeof text.font === "object" &&
        text.font.family === "Noto Sans Arabic",
      ),
    )).toBe(true);

    const buffer = await PdfEngine.render(document);
    expect(buffer.toString("latin1")).toContain("/Subtype /Type0");
  });

  it("lays out table content in running headers", async () => {
    const document = {
      page: { margin: 72, size: "Letter" as const },
      dynamicHeader: {
        content: [
          {
            body: [
              {
                cells: [
                  { children: [{ type: "paragraph" as const, value: "Control" }] },
                  { children: [{ type: "paragraph" as const, value: "Owner" }] },
                ],
              },
            ],
            columns: [{ width: "45%" }, { width: "55%" }],
            style: {
              borderBottom: { color: { b: 0.2, g: 0.2, r: 0.2, space: "rgb" as const }, width: 1 },
              borderTop: { color: { b: 0.2, g: 0.2, r: 0.2, space: "rgb" as const }, width: 1 },
            },
            type: "table" as const,
          },
        ],
        height: 54,
        width: 360,
        x: 72,
        y: 780,
      },
      children: [
        { type: "paragraph" as const, value: "Body content below a table header." },
      ],
    };

    const analysis = await analyzePhase6Document(document);

    expect(analysis.pages[0]?.texts.some((text) => text.value === "Control")).toBe(true);
    expect(analysis.pages[0]?.texts.some((text) => text.value === "Owner")).toBe(true);
    expect((analysis.pages[0]?.graphics ?? []).length).toBeGreaterThan(0);

    await expect(PdfEngine.render(document)).resolves.toBeInstanceOf(Buffer);
  });
});
