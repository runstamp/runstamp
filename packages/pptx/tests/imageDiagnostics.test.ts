import { describe, expect, it } from "vitest";
import {
  collectAbsoluteDocumentLayoutDebug,
  validateAbsoluteDocumentLayout,
} from "../src/layout/absoluteSafety.js";
import { collectImageFitDiagnostics } from "../src/layout/imageDiagnostics.js";
import type { PaperDocument, PaperImage } from "../src/types/ast.js";

const ONE_BY_ONE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function diagnosticPngDataUri(width: number, height: number): string {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(bytes, 0);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function image(overrides: Partial<PaperImage> = {}): PaperImage {
  return {
    type: "Image",
      src: diagnosticPngDataUri(24, 12),
    style: {
      position: "absolute",
      left: 40,
      top: 40,
      width: 100,
      height: 100,
    },
    ...overrides,
  };
}

describe("image diagnostics", () => {
  it("reads data-URI image dimensions and reports upscale risk", () => {
    const diagnostics = collectImageFitDiagnostics(image());

    expect(diagnostics?.sourceWidth).toBe(24);
    expect(diagnostics?.sourceHeight).toBe(12);
    expect(diagnostics?.upscaleRisk).toBe(true);
    expect(diagnostics?.issues.some((issue) => issue.code === "IMAGE_UPSCALE_RISK")).toBe(true);
  });

  it("reports risky explicit crops with visual issue rects", () => {
    const doc: PaperDocument = {
      type: "Document",
      slideSize: { width: 960, height: 540 },
      slides: [{
        type: "Slide",
        children: [
          image({
            src: ONE_BY_ONE_PNG,
            crop: { left: 40, right: 40, top: 10, bottom: 10 },
            style: {
              position: "absolute",
              left: 120,
              top: 90,
              width: 260,
              height: 140,
            },
          }),
        ],
      }],
    };

    const issues = validateAbsoluteDocumentLayout(doc);
    const debug = collectAbsoluteDocumentLayoutDebug(doc);

    expect(issues.some((issue) => issue.code === "IMAGE_CROP_RISK")).toBe(true);
    expect(debug[0].nodes[0].imageFit?.crop.visibleFraction).toBeLessThan(0.35);
    expect(debug[0].issues.find((issue) => issue.code === "IMAGE_CROP_RISK")?.rect).toBeDefined();
  });
});
