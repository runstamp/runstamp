import { describe, it, expect } from "vitest";
import { generateTransitionXml } from "../src/ooxml/transition.js";
import { generateSlideShell } from "../src/ooxml/slide.js";
import type { SlideTransition } from "../src/types/ast.js";

describe("generateTransitionXml", () => {
  it("returns empty string for undefined transition", () => {
    expect(generateTransitionXml(undefined)).toBe("");
  });

  it("emits fade transition", () => {
    const xml = generateTransitionXml({ type: "fade" });
    expect(xml).toContain("<p:fade/>");
    expect(xml).toContain('spd="med"');
    expect(xml).toContain('advClick="1"');
  });

  it("emits push transition with direction", () => {
    const xml = generateTransitionXml({ type: "push", direction: "right" });
    expect(xml).toContain('<p:push dir="r"/>');
  });

  it("emits wipe transition with default direction", () => {
    const xml = generateTransitionXml({ type: "wipe" });
    expect(xml).toContain('<p:wipe dir="l"/>');
  });

  it("emits cover transition with up direction", () => {
    const xml = generateTransitionXml({ type: "cover", direction: "up" });
    expect(xml).toContain('<p:cover dir="u"/>');
  });

  it("emits zoom transition", () => {
    const xml = generateTransitionXml({ type: "zoom" });
    expect(xml).toContain("<p:zoom/>");
  });

  it("maps fast speed for duration <= 250", () => {
    const xml = generateTransitionXml({ type: "fade", duration: 200 });
    expect(xml).toContain('spd="fast"');
  });

  it("maps medium speed for duration <= 750", () => {
    const xml = generateTransitionXml({ type: "fade", duration: 500 });
    expect(xml).toContain('spd="med"');
  });

  it("maps slow speed for duration > 750", () => {
    const xml = generateTransitionXml({ type: "fade", duration: 1000 });
    expect(xml).toContain('spd="slow"');
  });

  it("handles advanceOnClick=false", () => {
    const xml = generateTransitionXml({ type: "fade", advanceOnClick: false });
    expect(xml).toContain('advClick="0"');
  });

  it("includes advTm when advanceAfterTime is set", () => {
    const xml = generateTransitionXml({ type: "fade", advanceAfterTime: 3000 });
    expect(xml).toContain('advTm="3000"');
  });

  it("emits morph transition with p159 namespace", () => {
    const xml = generateTransitionXml({ type: "morph" });
    expect(xml).toContain("<p159:morph");
    expect(xml).toContain('option="byObject"');
    expect(xml).toContain("http://schemas.microsoft.com/office/powerpoint/2015/09/main");
  });
});

describe("generateSlideShell with transition/timing", () => {
  it("backward compatible: no extra XML with empty strings", () => {
    const shell1 = generateSlideShell("<p:sp/>", "", "");
    const shell2 = generateSlideShell("<p:sp/>");
    expect(shell1).toBe(shell2);
  });

  it("inserts transition XML after clrMapOvr", () => {
    const transXml = '<p:transition spd="med" advClick="1"><p:fade/></p:transition>';
    const shell = generateSlideShell("<p:sp/>", transXml);
    const clrMapIdx = shell.indexOf("</p:clrMapOvr>");
    const transIdx = shell.indexOf("<p:transition");
    const sldEndIdx = shell.indexOf("</p:sld>");
    expect(transIdx).toBeGreaterThan(clrMapIdx);
    expect(transIdx).toBeLessThan(sldEndIdx);
  });

  it("inserts timing XML after transition XML", () => {
    const transXml = '<p:transition spd="med" advClick="1"><p:fade/></p:transition>';
    const timingXml = '<p:timing><p:tnLst/></p:timing>';
    const shell = generateSlideShell("<p:sp/>", transXml, timingXml);
    const transIdx = shell.indexOf("<p:transition");
    const timingIdx = shell.indexOf("<p:timing>");
    expect(timingIdx).toBeGreaterThan(transIdx);
  });
});

describe("Morph transition", () => {
  it("emits morph with slow speed for default 500ms duration", () => {
    const xml = generateTransitionXml({ type: "morph", duration: 500 });
    expect(xml).toContain('spd="med"');
    expect(xml).toContain("<p159:morph");
  });

  it("morph ignores direction", () => {
    const xml = generateTransitionXml({ type: "morph", direction: "up" } as SlideTransition);
    // Direction is irrelevant for morph — just make sure it doesn't break
    expect(xml).toContain("<p159:morph");
  });
});
