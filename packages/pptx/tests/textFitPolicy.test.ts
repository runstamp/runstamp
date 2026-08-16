import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { runEngineLayoutValidation } from "../src/engine/layoutValidator.js";
import {
  collectAbsoluteDocumentLayoutDebug,
  validateAbsoluteDocumentLayout,
} from "../src/layout/absoluteSafety.js";
import type { PaperDocument } from "../src/types/ast.js";

async function slideXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("ppt/slides/slide1.xml")!.async("string");
}

describe("text fit policies", () => {
  it("fitFontSize emits pre-scaled deterministic text instead of renderer-dependent autofit", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "A long headline that needs to shrink to remain editable",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 220,
            height: 48,
            fontSize: 32,
            textFit: { policy: "fitFontSize", minFontSize: 16 },
          },
        }],
      }],
    };

    const xml = await slideXml(await PaperEngine.render(doc));
    expect(xml).not.toMatch(/<a:normAutofit fontScale="\d+"/);
    expect(xml).toContain('sz="1200"');
    expect(xml).not.toContain('sz="2400"');
  });

  it("fitFontSize honors maxLines when choosing the emitted font size", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "SupercalifragilisticexpialidociousElectrificationReadinessIndex",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 220,
            height: 52,
            fontSize: 28,
            textFit: { policy: "fitFontSize", minFontSize: 10, maxLines: 1 },
          },
        }],
      }],
    };

    const xml = await slideXml(await PaperEngine.render(doc));
    const size = Number(xml.match(/\bsz="(\d+)"/)?.[1]);
    expect(size).toBeGreaterThanOrEqual(750);
    expect(size).toBeLessThan(2100);
    expect(xml).not.toMatch(/<a:normAutofit fontScale="\d+"/);
  });

  it("truncate mutates string content to fit with an explicit marker", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "This sentence has a tail that should not survive truncation",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 150,
            height: 24,
            fontSize: 22,
            textFit: { policy: "truncate", marker: "..." },
          },
        }],
      }],
    };

    const xml = await slideXml(await PaperEngine.render(doc));
    expect(xml).toContain("...");
    expect(xml).not.toContain("survive truncation");
  });

  it("overflow policy suppresses deliberate text-fit warnings", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "Deliberate oversized display wordmark",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 100,
            height: 20,
            fontSize: 40,
            textFit: { policy: "overflow" },
          },
        }],
      }],
    };

    expect(validateAbsoluteDocumentLayout(doc)).toEqual([]);
    expect(runEngineLayoutValidation(doc, { layoutValidation: "warn" })).toEqual([]);
  });

  it("records line-count diagnostics and flags maxLines violations", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "This phrase wraps across several lines in a narrow region.",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 120,
            height: 160,
            fontSize: 18,
            textFit: { policy: "strict", maxLines: 1 },
          },
        }],
      }],
    };

    const [debug] = collectAbsoluteDocumentLayoutDebug(doc);
    expect(debug.nodes[0].textFit?.lineCount).toBeGreaterThan(1);
    expect(debug.nodes[0].textFit?.unexpectedWrap).toBe(true);
    expect(debug.issues.some((issue) => issue.code === "TEXT_OVERFLOW")).toBe(true);
  });

  it("flags cramped wrapping before text visually degrades", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "Text",
          content: "Inputs",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 28,
            height: 80,
            fontSize: 18,
          },
        }],
      }],
    };

    const [debug] = collectAbsoluteDocumentLayoutDebug(doc);
    expect(debug.nodes[0].textFit?.tightWrap).toBe(true);
    expect(debug.nodes[0].textFit?.minReadableWidth).toBeGreaterThan(28);
    expect(debug.issues.some((issue) => issue.code === "TEXT_WRAP_TIGHT")).toBe(true);
    expect(runEngineLayoutValidation(doc, { layoutValidation: "warn" }).some((warning) =>
      warning.code === "POTENTIAL_TIGHT_WRAP",
    )).toBe(true);
  });

  it("flags absolute children that escape their parent container", () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [{
        type: "Slide",
        children: [{
          type: "View",
          style: {
            position: "absolute",
            left: 40,
            top: 40,
            width: 120,
            height: 70,
          },
          children: [{
            type: "Text",
            content: "Escapes",
            style: {
              position: "absolute",
              left: 96,
              top: 20,
              width: 50,
              height: 24,
              fontSize: 16,
            },
          }],
        }],
      }],
    };

    const [debug] = collectAbsoluteDocumentLayoutDebug(doc);
    expect(debug.issues.some((issue) => issue.code === "CONTAINER_CHILD_OUT_OF_BOUNDS")).toBe(true);
    expect(runEngineLayoutValidation(doc, { layoutValidation: "warn" }).some((warning) =>
      warning.code === "POTENTIAL_CONTAINER_CLIP",
    )).toBe(true);
  });
});
