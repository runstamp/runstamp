import { describe, it, expect } from "vitest";
import { PaperError, type PaperErrorCode } from "../src/errors.js";
import { generateTimingXml } from "../src/ooxml/timing.js";
import type { AnimationManifest } from "../src/ooxml/animationTypes.js";
import type { AnimationIntent } from "../src/types/ast.js";

function makeEntry(
  shapeId: number,
  anim: Partial<AnimationIntent>,
  options?: { kind?: "shape" | "text"; textParagraphLevels?: number[] },
) {
  return {
    shapeId,
    animation: {
      type: "entrance" as const,
      effect: "fade" as const,
      trigger: "onClick" as const,
      ...anim,
    },
    target: options?.kind === "text"
      ? {
        kind: "text" as const,
        textTarget: {
          paragraphCount: options.textParagraphLevels?.length ?? 1,
          paragraphLevels: options.textParagraphLevels ?? [0],
        },
      }
      : { kind: "shape" as const },
  };
}

function expectPaperError(
  action: () => unknown,
  message: RegExp,
  code: PaperErrorCode = "VALIDATION_FAILED",
): void {
  try {
    action();
    throw new Error("Expected action to throw a PaperError.");
  } catch (error) {
    expect(error).toBeInstanceOf(PaperError);
    expect(error).toMatchObject({ code, phase: "serialization" });
    expect((error as Error).message).toMatch(message);
  }
}

describe("Animation Edge Cases", () => {
  it("motionPath without path data throws descriptive error", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, {
        effect: "motionPath" as any,
        motionPath: undefined,
      }),
    ];
    expectPaperError(
      () => generateTimingXml(manifest, new Set([2])),
      /motionPath.*requires/,
    );
  });

  it("animation targeting non-existent shape throws orphan error", () => {
    const manifest: AnimationManifest = [makeEntry(999, {})];
    expectPaperError(
      () => generateTimingXml(manifest, new Set([2, 3])),
      /orphaned shapeId 999/,
      "STRUCTURAL_VALIDATION_FAILED",
    );
  });

  it("empty animations array produces no <p:timing> element", () => {
    const result = generateTimingXml([], new Set([2, 3]));
    expect(result).toBe("");
  });

  it("rejects malformed motion paths", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, {
        effect: "motionPath",
        motionPath: { path: "M 0 0 Q 1 1" } as any,
      }),
    ];
    expectPaperError(
      () => generateTimingXml(manifest, new Set([2])),
      /unsupported command "Q"/,
    );
  });

  it("requires toColor for colorChange", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, {
        effect: "colorChange",
        type: "emphasis",
      }),
    ];
    expectPaperError(
      () => generateTimingXml(manifest, new Set([2])),
      /colorChange.*toColor/,
    );
  });

  it("rejects boldFlash on non-text targets", () => {
    const manifest: AnimationManifest = [
      makeEntry(2, {
        effect: "boldFlash",
        type: "emphasis",
      }),
    ];
    expectPaperError(
      () => generateTimingXml(manifest, new Set([2])),
      /boldFlash.*text-containing shape target/,
    );
  });
});
