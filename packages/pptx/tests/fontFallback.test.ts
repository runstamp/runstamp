import { describe, it, expect } from "vitest";
import { classifyScript, segmentByFont } from "../src/typography/fontFallback.js";
import type { ScriptClass } from "../src/typography/fontFallback.js";

describe("Font Fallback & CJK", () => {
  describe("classifyScript", () => {
    it("classifies ASCII as latin", () => {
      expect(classifyScript("A".codePointAt(0)!)).toBe("latin");
      expect(classifyScript("z".codePointAt(0)!)).toBe("latin");
      expect(classifyScript("0".codePointAt(0)!)).toBe("latin");
      expect(classifyScript(" ".codePointAt(0)!)).toBe("latin");
    });

    it("classifies CJK ideographs as ea", () => {
      expect(classifyScript(0x4E2D)).toBe("ea"); // 中
      expect(classifyScript(0x6587)).toBe("ea"); // 文
    });

    it("classifies Hangul syllables as ea", () => {
      expect(classifyScript(0xAC00)).toBe("ea"); // 가
      expect(classifyScript(0xD7A3)).toBe("ea"); // 힣
    });

    it("classifies Hiragana/Katakana as ea", () => {
      expect(classifyScript(0x3041)).toBe("ea"); // ぁ
      expect(classifyScript(0x30A0)).toBe("ea"); // ゠
    });

    it("classifies Arabic as cs", () => {
      expect(classifyScript(0x0627)).toBe("cs"); // ا
      expect(classifyScript(0x0628)).toBe("cs"); // ب
    });

    it("classifies Hebrew as cs", () => {
      expect(classifyScript(0x05D0)).toBe("cs"); // א
      expect(classifyScript(0x05EA)).toBe("cs"); // ת
    });

    it("classifies Devanagari as cs", () => {
      expect(classifyScript(0x0915)).toBe("cs"); // क
    });

    it("classifies accented Latin as latin", () => {
      expect(classifyScript("é".codePointAt(0)!)).toBe("latin");
      expect(classifyScript("ñ".codePointAt(0)!)).toBe("latin");
    });
  });

  describe("segmentByFont", () => {
    it("returns empty array for empty string", () => {
      expect(segmentByFont("", "Arial")).toEqual([]);
    });

    it("returns single segment for all-latin text", () => {
      const segments = segmentByFont("Hello World", "Arial");
      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe("Hello World");
      expect(segments[0].fontFamily).toBe("Arial");
      expect(segments[0].script).toBe("latin");
    });

    it("segments mixed latin + CJK text", () => {
      const segments = segmentByFont("Hello中文World", "Arial");
      expect(segments.length).toBe(3);
      expect(segments[0].script).toBe("latin");
      expect(segments[0].text).toBe("Hello");
      expect(segments[1].script).toBe("ea");
      expect(segments[1].text).toBe("中文");
      expect(segments[2].script).toBe("latin");
      expect(segments[2].text).toBe("World");
    });

    it("segments mixed latin + Arabic text", () => {
      const segments = segmentByFont("Hello مرحبا World", "Arial");
      // "Hello " = latin, "مرحبا" = cs, " World" = latin
      expect(segments.length).toBe(3);
      expect(segments[0].script).toBe("latin");
      expect(segments[1].script).toBe("cs");
      expect(segments[2].script).toBe("latin");
    });
  });
});
