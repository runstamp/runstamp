import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { createEngine } from "../src/engine.js";
import { validatePptxStructure } from "../src/quality/structuralValidation.js";
import type { PaperDocument, PaperSlide } from "../src/types/ast.js";
import { templateMutationDeck } from "./desktopValidation/fixtures/templateMutationDeck.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(testDir, "..");

function makeTemplateSlide(index: number): PaperSlide {
  if (index === 0) {
    return templateMutationDeck.slides[0]!;
  }

  return {
    ...templateMutationDeck.slides[1]!,
    children: templateMutationDeck.slides[1]!.children.map((child) => {
      if (child.type === "Text") {
        return {
          ...child,
          content: `Template section ${index}`,
        };
      }
      if (child.type === "View") {
        return {
          ...child,
          textContent: `Placeholder-backed body content for section ${index}.`,
          textParagraphs: undefined,
        };
      }
      return child;
    }),
  };
}

function makeTenSlideTemplateDeck(): PaperDocument {
  return {
    ...templateMutationDeck,
    meta: { title: "BM-PPTX-008 Template Regression" },
    slides: Array.from({ length: 10 }, (_unused, index) => makeTemplateSlide(index)),
  };
}

async function inspectTemplateOutput(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const filePaths = Object.keys(zip.files).filter((path) => !zip.files[path]!.dir);
  const presentationRels = (await zip.file("ppt/_rels/presentation.xml.rels")?.async("string")) ?? "";
  const masterRels = await Promise.all(
    filePaths
      .filter((path) => /^ppt\/slideMasters\/_rels\/slideMaster\d+\.xml\.rels$/.test(path))
      .map(async (path) => zip.file(path)!.async("string")),
  );
  const xmlParts = await Promise.all(
    filePaths
      .filter((path) => path.endsWith(".xml") || path.endsWith(".rels"))
      .map(async (path) => zip.file(path)!.async("string")),
  );
  const allXml = xmlParts.join("\n");

  return {
    slideCount: filePaths.filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).length,
    slideMasterCount: filePaths.filter((path) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(path)).length,
    slideLayoutCount: filePaths.filter((path) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(path)).length,
    hasPresentationMasterRelationship: presentationRels.includes("slideMasters/slideMaster"),
    hasMasterLayoutRelationship: masterRels.some((rels) => rels.includes("slideLayouts/slideLayout")),
    hasSchemeColor: allXml.includes("<a:schemeClr"),
  };
}

describe("source-mode template import", () => {
  it("treats unbundled source as pro-capable for benchmark harnesses", async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      "--import",
      "tsx",
      "--eval",
      "import { IS_PRO } from './src/feature-gate.ts'; console.log(String(IS_PRO));",
    ], { cwd: packageDir });

    expect(stdout.trim()).toBe("true");
  });

  it("renders a ten-slide template deck in pro mode", async () => {
    const engine = createEngine({ mode: "pro" });
    const pptx = await engine.render(makeTenSlideTemplateDeck());
    const structural = await validatePptxStructure(pptx);
    const inspected = await inspectTemplateOutput(pptx);

    expect(structural.status).toBe("passed");
    expect(inspected.slideCount).toBe(10);
    expect(inspected.slideMasterCount).toBeGreaterThanOrEqual(1);
    expect(inspected.slideLayoutCount).toBeGreaterThanOrEqual(1);
    expect(inspected.hasPresentationMasterRelationship).toBe(true);
    expect(inspected.hasMasterLayoutRelationship).toBe(true);
    expect(inspected.hasSchemeColor).toBe(true);
  });

  it("keeps template import gated in lite mode", async () => {
    const engine = createEngine({ mode: "lite" });

    await expect(engine.render(makeTenSlideTemplateDeck())).rejects.toMatchObject({
      code: "FEATURE_REQUIRES_UPGRADE",
      phase: "template",
    });
  });
});
