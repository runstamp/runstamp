import { describe, it, expect } from "vitest";
import { PaperError } from "../src/errors.js";
import { generateTimingXml } from "../src/ooxml/timing.js";
import type { AnimationManifest } from "../src/ooxml/animationTypes.js";
import type { AnimationIntent } from "../src/types/ast.js";

function makeEntry(
  shapeId: number,
  anim: Partial<AnimationIntent>,
  options?: { textParagraphLevels?: number[] },
) {
  const paragraphLevels = options?.textParagraphLevels;
  return {
    shapeId,
    animation: {
      type: "entrance" as const,
      effect: "fade" as const,
      trigger: "onClick" as const,
      ...anim,
    },
    target: paragraphLevels
      ? {
        kind: "text" as const,
        textTarget: {
          paragraphCount: paragraphLevels.length,
          paragraphLevels,
        },
      }
      : { kind: "shape" as const },
  };
}

describe("generateTimingXml", () => {
  it("returns empty string for empty manifest", () => {
    expect(generateTimingXml([], new Set())).toBe("");
  });

  it("throws on orphaned shapeId", () => {
    const manifest: AnimationManifest = [makeEntry(999, {})];
    try {
      generateTimingXml(manifest, new Set([2, 3]));
      throw new Error("Expected orphaned animation target to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(PaperError);
      expect(error).toMatchObject({
        code: "STRUCTURAL_VALIDATION_FAILED",
        phase: "serialization",
      });
      expect((error as Error).message).toMatch(/orphaned shapeId 999/);
    }
  });

  it("does not throw when emittedShapeIds is not provided", () => {
    const manifest: AnimationManifest = [makeEntry(999, {})];
    expect(() => generateTimingXml(manifest)).not.toThrow();
  });

  it("Click-Sequence: 3 shapes — A(onClick), B(withPrevious), C(onClick) → 2 click groups", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { trigger: "onClick", type: "entrance", effect: "fade" }),
      makeEntry(3, { trigger: "withPrevious", type: "emphasis", effect: "spin" }),
      makeEntry(4, { trigger: "onClick", type: "exit", effect: "fade" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2, 3, 4]));

    expect(xml).toContain("<p:timing>");
    expect(xml).toContain("nodeType=\"tmRoot\"");
    expect(xml).toContain("nodeType=\"mainSeq\"");

    // Count click-group <p:par> wrappers inside mainSeq's childTnLst
    // The mainSeq childTnLst should contain exactly 2 top-level <p:par> groups
    const mainSeqMatch = xml.match(/nodeType="mainSeq".*?<p:childTnLst>(.*?)<\/p:childTnLst>/s);
    expect(mainSeqMatch).toBeTruthy();
    const groupContent = mainSeqMatch![1];
    // Count top-level <p:par> in group content (each click group starts with one)
    // Simple: count occurrences of fill="hold" at the click-group level
    const topPars = groupContent.match(/<p:par><p:cTn id="\d+" fill="hold"/g);
    expect(topPars).toHaveLength(2);
  });

  it("emits appear as <p:set>", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "appear", type: "entrance" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:set>");
    expect(xml).toContain('val="visible"');
    expect(xml).toContain('spid="2"');
  });

  it("emits appear exit as hidden", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "appear", type: "exit" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:set>");
    expect(xml).toContain('val="hidden"');
  });

  it("emits fade entrance as animEffect with transition=in", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "fade", type: "entrance", duration: 750 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('<p:animEffect transition="in" filter="fade">');
    expect(xml).toContain('dur="750"');
  });

  it("emits fade exit as animEffect with transition=out", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "fade", type: "exit" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('<p:animEffect transition="out" filter="fade">');
  });

  it("emits fly entrance with wipe filter", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "fly", type: "entrance", direction: "left" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('filter="wipe(left)"');
    expect(xml).toContain('presetID="2"');
  });

  it("emits zoom entrance as animScale", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "zoom", type: "entrance", duration: 400 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:animScale>");
    expect(xml).toContain('x="0" y="0"');
    expect(xml).toContain('x="100000" y="100000"');
  });

  it("emits zoom exit as animScale (shrink)", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "zoom", type: "exit" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:animScale>");
    expect(xml).toContain('<p:from x="100000" y="100000"/>');
    expect(xml).toContain('<p:to x="0" y="0"/>');
  });

  it("emits spin as animRot", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "spin", type: "emphasis", duration: 1000 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('<p:animRot by="21600000">');
    expect(xml).toContain('dur="1000"');
  });

  it("maps trigger to nodeType correctly", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { trigger: "onClick" }),
      makeEntry(3, { trigger: "withPrevious" }),
      makeEntry(4, { trigger: "afterPrevious" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2, 3, 4]));
    expect(xml).toContain('nodeType="clickEffect"');
    expect(xml).toContain('nodeType="withEffect"');
    expect(xml).toContain('nodeType="afterEffect"');
  });

  it("respects delay on animation", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { delay: 500 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('delay="500"');
  });

  it("uses default duration of 500 when not specified", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "fade" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('dur="500"');
  });

  it("presetClass maps correctly", () => {
    const entrManifest: AnimationManifest = [makeEntry(2, { type: "entrance", effect: "fade" })];
    const exitManifest: AnimationManifest = [makeEntry(2, { type: "exit", effect: "fade" })];
    const emphManifest: AnimationManifest = [makeEntry(2, { type: "emphasis", effect: "spin" })];

    expect(generateTimingXml(entrManifest, new Set([2]))).toContain('presetClass="entr"');
    expect(generateTimingXml(exitManifest, new Set([2]))).toContain('presetClass="exit"');
    expect(generateTimingXml(emphManifest, new Set([2]))).toContain('presetClass="emph"');
  });

  it("includes prevCondLst and nextCondLst with sldTgt", () => {
    const manifest: AnimationManifest = [makeEntry(2, {})];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:prevCondLst>");
    expect(xml).toContain("<p:nextCondLst>");
    expect(xml).toContain("<p:sldTgt/>");
  });

  it("normalizes grow alias to growShrink using default scaleFactor", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "grow", type: "emphasis", duration: 400 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:animScale>");
    expect(xml).toContain('<p:to x="150000" y="150000"/>');
    expect(xml).toContain('autoRev="1"');
  });

  it("uses repeat alias on outer animation cTn", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "spin", type: "emphasis", repeat: 2 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('repeatCount="2000"');
  });

  it("keeps repeatCount legacy alias working on outer animation cTn", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "spin", type: "emphasis", repeatCount: 3 }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('repeatCount="3000"');
  });

  it("emits colorChange with requested target color", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, { effect: "colorChange", type: "emphasis", toColor: "#12AB34" }),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:animClr");
    expect(xml).toContain('val="12AB34"');
  });

  it("emits paragraph text targets for byParagraph builds", () => {
    const manifest: AnimationManifest = [
      makeEntry(
        2,
        { effect: "fade", type: "entrance", build: { grouping: "byParagraph" } },
        { textParagraphLevels: [0, 1, 0] },
      ),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain("<p:bldP");
    expect(xml).toContain("<p:txEl>");
    expect(xml).toContain('<p:pRg st="0" end="0"/>');
    expect(xml).toContain('<p:pRg st="1" end="1"/>');
    expect(xml).toContain('<p:pRg st="2" end="2"/>');
  });

  it("emits grouped paragraph targets for byFirstLevel builds", () => {
    const manifest: AnimationManifest = [
      makeEntry(
        2,
        { effect: "fade", type: "entrance", build: { grouping: "byFirstLevel", nested: true } },
        { textParagraphLevels: [0, 1, 1, 0] },
      ),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('<p:pRg st="0" end="0"/>');
    expect(xml).toContain('<p:pRg st="1" end="1"/>');
    expect(xml).toContain('<p:pRg st="2" end="2"/>');
    expect(xml).toContain('<p:pRg st="3" end="3"/>');
    expect(xml).toContain('nodeType="afterEffect"');
  });

  it("keeps buildType legacy alias working for first-level builds", () => {
    const manifest: AnimationManifest = [
      makeEntry(
        2,
        { effect: "fade", type: "entrance", buildType: "byFirstLevel" },
        { textParagraphLevels: [0, 1, 0] },
      ),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('<p:pRg st="0" end="0"/>');
    expect(xml).toContain('<p:pRg st="1" end="1"/>');
    expect(xml).toContain('<p:pRg st="2" end="2"/>');
    expect(xml).toContain('nodeType="afterEffect"');
  });

  it("dims the previous top-level group when dimAfter is configured", () => {
    const manifest: AnimationManifest = [
      makeEntry(
        2,
        {
          effect: "fade",
          type: "entrance",
          build: { grouping: "byFirstLevel", nested: true, dimAfter: "#CCCCCC" },
        },
        { textParagraphLevels: [0, 1, 0] },
      ),
    ];
    const xml = generateTimingXml(manifest, new Set([2]));
    expect(xml).toContain('val="CCCCCC"');
    expect(xml).toContain('style.color');
    expect(xml).toContain('<p:pRg st="0" end="1"/>');
  });
});
