/**
 * Edge case tests for text rendering.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PaperEngine } from "../../../src/engine.js";
import { makeDoc, textNode, richText } from "../helpers/templateHelpers.js";
import {
  assertValidPptx, assertNoCorruption, assertTextOnSlide,
} from "../helpers/verificationUtils.js";

describe("Text Edge Cases", () => {
  // T-TEXT-01: 1500-char paragraph renders without error
  it("T-TEXT-01: 1500-char paragraph renders", async () => {
    const longText = "A".repeat(1500);
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode(longText, { position: "absolute", top: 40, left: 40, width: 880, fontSize: 12 }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TEXT-02: 6-level bullets (levels 0-5)
  it("T-TEXT-02: 6-level bullets render", async () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => ({
      runs: [{ text: `Level ${i} bullet`, style: { fontSize: 11 } }],
      bullet: { char: i === 0 ? "\u2022" : "\u2013" },
      level: i,
    }));
    const doc = makeDoc([{
      type: "Slide",
      children: [
        richText(paragraphs, { position: "absolute", top: 40, left: 40, width: 880 }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    for (let i = 0; i < 6; i++) {
      await assertTextOnSlide(buffer, 0, `Level ${i} bullet`);
    }
  });

  // T-TEXT-03: 200-char single word (no spaces)
  it("T-TEXT-03: 200-char single word renders", async () => {
    const longWord = "Supercalifragilisticexpialidocious".repeat(6).slice(0, 200);
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode(longWord, { position: "absolute", top: 40, left: 40, width: 880, fontSize: 10 }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TEXT-04: RTL + LTR mixed text
  it("T-TEXT-04: RTL + LTR mixed text renders", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [
        richText(
          [{
            runs: [
              { text: "\u0645\u0631\u062D\u0628\u0627 ", style: { fontSize: 14 } },
              { text: "Hello World", style: { fontSize: 14 } },
            ],
            rtl: true,
          }],
          { position: "absolute", top: 40, left: 40, width: 880 },
        ),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertTextOnSlide(buffer, 0, "Hello World");
  });

  // T-TEXT-05: CJK text
  it("T-TEXT-05: CJK text renders", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode("\u3053\u3093\u306B\u3061\u306F\u4E16\u754C \u4F60\u597D\u4E16\u754C", {
          position: "absolute", top: 40, left: 40, width: 880, fontSize: 18,
        }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TEXT-06: Emoji text
  it("T-TEXT-06: Emoji text renders", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode("\uD83C\uDF89\uD83D\uDE80\uD83D\uDCA1 Launch Party!", {
          position: "absolute", top: 40, left: 40, width: 880, fontSize: 24,
        }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TEXT-07: Unicode combining characters
  it("T-TEXT-07: Unicode combining characters render", async () => {
    // e + combining acute accent = e\u0301
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode("re\u0301sume\u0301 cre\u0300me bru\u0302le\u0301e", {
          position: "absolute", top: 40, left: 40, width: 880, fontSize: 16,
        }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-TEXT-08: Empty text frame
  it("T-TEXT-08: Empty text frame does not crash", async () => {
    const doc = makeDoc([{
      type: "Slide",
      children: [
        textNode("", { position: "absolute", top: 40, left: 40, width: 880, fontSize: 12 }),
      ],
    }]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });
});
