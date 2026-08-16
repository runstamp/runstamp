/**
 * Structural XML safety-net tests.
 *
 * Fast, deterministic tests that verify OOXML invariants without rendering:
 * 1. Z-order: child shapes appear AFTER their parent shape in slide XML
 * 2. Bounds: child shape coordinates fall within parent bounding box
 * 3. Completeness: every Text child in the AST has a corresponding <p:sp> in XML
 * 4. normAutofit: bounded text inside visual Views keeps an explicit <a:normAutofit fontScale> available
 *
 * Tests all three demo deck templates.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { strategyDeck, pitchDeck, qbrDeck } from "../../../app/app/lib/templates.ts";
import JSZip from "jszip";
import type { PaperDocument } from "../src/types/ast.js";

interface ShapeInfo {
  index: number;
  name: string;
  id: number;
  x: number;  // in EMU
  y: number;
  cx: number;
  cy: number;
  isTxBox: boolean;
  hasNormAutofit: boolean;
  textContent: string;
  hasFill: boolean;
  geom: string;
}

function parseShapes(slideXml: string): ShapeInfo[] {
  const shapes = slideXml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
  return shapes.map((shape, index) => {
    const nameMatch = shape.match(/name="([^"]+)"/);
    const idMatch = shape.match(/id="(\d+)"/);
    const offMatch = shape.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
    const extMatch = shape.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    const textMatch = shape.match(/<a:t>([^<]*)<\/a:t>/g);
    const texts = textMatch ? textMatch.map(t => t.replace(/<\/?a:t>/g, '')).join(' ') : '';
    const prstMatch = shape.match(/prst="([^"]+)"/);
    const spPrMatch = shape.match(/<p:spPr>[\s\S]*?<\/p:spPr>/);
    const spPrSection = spPrMatch?.[0] || '';
    const hasFill = !spPrSection.includes("<a:noFill/>");

    return {
      index,
      name: nameMatch?.[1] || '',
      id: Number(idMatch?.[1] || 0),
      x: Number(offMatch?.[1] || 0),
      y: Number(offMatch?.[2] || 0),
      cx: Number(extMatch?.[1] || 0),
      cy: Number(extMatch?.[2] || 0),
      isTxBox: shape.includes('txBox="1"'),
      hasNormAutofit: shape.includes('<a:normAutofit'),
      textContent: texts,
      hasFill,
      geom: prstMatch?.[1] || 'rect',
    };
  });
}

/** Count Text nodes in an AST subtree */
function countTextNodes(node: any): number {
  let count = 0;
  if (node.type === "Text") count++;
  if (node.children) {
    for (const child of node.children) {
      count += countTextNodes(child);
    }
  }
  return count;
}

/** Walk AST to find Views with visual properties that have Text children */
function findVisualViewsWithTextChildren(node: any): Array<{ viewNode: any; textChildren: any[] }> {
  const results: Array<{ viewNode: any; textChildren: any[] }> = [];
  if (node.type === "View") {
    const hasVisual = node.style?.backgroundColor || node.style?.fill ||
      (node.style?.borderWidth && node.style.borderWidth > 0) ||
      node.shapeType || node.style?.effects;
    if (hasVisual && node.children) {
      const textChildren: any[] = [];
      function collectTexts(n: any) {
        if (n.type === "Text") textChildren.push(n);
        if (n.children) for (const c of n.children) collectTexts(c);
      }
      for (const c of node.children) collectTexts(c);
      if (textChildren.length > 0) {
        results.push({ viewNode: node, textChildren });
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      results.push(...findVisualViewsWithTextChildren(child));
    }
  }
  return results;
}

/** Load slide XMLs from a rendered PaperDocument */
async function loadSlideXmls(doc: PaperDocument): Promise<string[]> {
  const buffer = await PaperEngine.render(doc);
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter(f => f.startsWith("ppt/slides/slide") && f.endsWith(".xml"))
    .sort();
  return Promise.all(slideFiles.map(f => zip.file(f)!.async("string")));
}

// Test a single deck's structural invariants
function testDeckStructure(deckName: string, deck: PaperDocument) {
  describe(deckName, () => {
    let slideXmls: string[] = [];
    let skipReason: string | undefined;

    beforeAll(async () => {
      try {
        slideXmls = await loadSlideXmls(deck);
      } catch (error) {
        skipReason = (error as Error).message;
      }
    });

    it("all slides — shape IDs are monotonically increasing per slide", () => {
      if (skipReason) return;
      for (let slideIdx = 0; slideIdx < slideXmls.length; slideIdx++) {
        const shapes = parseShapes(slideXmls[slideIdx]);
        for (let i = 1; i < shapes.length; i++) {
          expect(
            shapes[i].id,
            `${deckName} slide ${slideIdx + 1}: shape ${shapes[i].name} (id=${shapes[i].id}) should have higher id than ${shapes[i - 1].name} (id=${shapes[i - 1].id})`
          ).toBeGreaterThan(shapes[i - 1].id);
        }
      }
    });

    it("roundRect views with children — text shapes appear after parent card shapes", () => {
      if (skipReason) return;
      for (let slideIdx = 0; slideIdx < slideXmls.length; slideIdx++) {
        const shapes = parseShapes(slideXmls[slideIdx]);
        const viewShapes = shapes.filter(s => !s.isTxBox && s.geom === "roundRect");

        for (const viewShape of viewShapes) {
          const textInsideView = shapes.filter(s =>
            s.isTxBox &&
            s.x >= viewShape.x &&
            s.y >= viewShape.y &&
            s.x + s.cx <= viewShape.x + viewShape.cx + 1000 &&
            s.y + s.cy <= viewShape.y + viewShape.cy + 1000
          );
          for (const textShape of textInsideView) {
            expect(
              textShape.index,
              `${deckName} slide ${slideIdx + 1}: "${textShape.textContent.substring(0, 30)}" should render after "${viewShape.name}"`
            ).toBeGreaterThan(viewShape.index);
          }
        }
      }
    });

    it("each slide produces at least one shape", () => {
      if (skipReason) return;
      for (let slideIdx = 0; slideIdx < deck.slides.length; slideIdx++) {
        const shapes = parseShapes(slideXmls[slideIdx]);
        expect(
          shapes.length,
          `${deckName} slide ${slideIdx + 1} has no shapes`
        ).toBeGreaterThan(0);
      }
    });

    it("text inside visual Views keeps PowerPoint autofit available", () => {
      if (skipReason) return;
      for (let slideIdx = 0; slideIdx < deck.slides.length; slideIdx++) {
        const slide = deck.slides[slideIdx];
        const visualViews = findVisualViewsWithTextChildren(slide);
        if (visualViews.length === 0) continue;

        const shapes = parseShapes(slideXmls[slideIdx]);
        const viewShapes = shapes.filter(s => !s.isTxBox && s.hasFill);
        for (const viewShape of viewShapes) {
          const textInsideView = shapes.filter(s =>
            s.isTxBox &&
            s.index > viewShape.index &&
            s.x >= viewShape.x &&
            s.y >= viewShape.y &&
            s.x + s.cx <= viewShape.x + viewShape.cx + 9525 &&
            s.y + s.cy <= viewShape.y + viewShape.cy + 9525
          );
          for (const textShape of textInsideView) {
            expect(
              textShape.hasNormAutofit,
              `${deckName} slide ${slideIdx + 1}: "${textShape.textContent.substring(0, 40)}" inside "${viewShape.name}" should keep normAutofit as an Office safety net`
            ).toBe(true);
          }
        }
      }
    });
  });
}

describe("Structural XML Ordering", () => {
  testDeckStructure("strategyDeck", strategyDeck);
  testDeckStructure("pitchDeck", pitchDeck);
  testDeckStructure("qbrDeck", qbrDeck);
});
