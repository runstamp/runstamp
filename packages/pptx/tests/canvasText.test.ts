import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import {
  alignText,
  applyTextTransform,
  buildFontString,
  wrapText,
} from "../src/renderer/canvasText.js";

describe("canvasText helpers", () => {
  it("builds font strings for named and numeric weights", () => {
    expect(buildFontString(18, "Inter", "bold", "italic")).toBe('italic bold 18px "Inter", PaperEmoji, PaperFallback, Arial, sans-serif');
    expect(buildFontString(12, "IBM Plex Sans", "500", "normal")).toBe('500 12px "IBM Plex Sans", PaperEmoji, PaperFallback, Arial, sans-serif');
  });

  it("applies supported text transforms", () => {
    expect(applyTextTransform("hello world", "uppercase")).toBe("HELLO WORLD");
    expect(applyTextTransform("hello world", "lowercase")).toBe("hello world");
    expect(applyTextTransform("hello world", "capitalize")).toBe("Hello World");
    expect(applyTextTransform("hello world", "none")).toBe("hello world");
  });

  it("wraps text by measured width and preserves empty fallback", () => {
    const canvas = createCanvas(320, 200);
    const ctx = canvas.getContext("2d");
    ctx.font = buildFontString(16, "Arial", "normal", "normal");

    const lines = wrapText(ctx, "alpha beta gamma delta", 60);
    expect(lines.length).toBeGreaterThan(1);
    expect(wrapText(ctx, "", 0)).toEqual([""]);
  });

  it("aligns centered and right-aligned text from measured width", () => {
    const canvas = createCanvas(320, 200);
    const ctx = canvas.getContext("2d");
    ctx.font = buildFontString(16, "Arial", "normal", "normal");

    const centered = alignText(ctx, "hello", 20, 100, "center");
    const right = alignText(ctx, "hello", 20, 100, "right");

    expect(centered).toBeGreaterThan(20);
    expect(right).toBeGreaterThan(centered);
    expect(alignText(ctx, "hello", 20, 100, "left")).toBe(20);
  });
});
