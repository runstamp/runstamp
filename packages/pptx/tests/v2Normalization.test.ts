import { describe, expect, it } from "vitest";
import { compilePresentationSpec } from "../src/protocol/compiler.js";
import { normalizeRenderRequest } from "../../../platform/app/lib/pptx/normalizeDocument";

describe("V2 request normalization", () => {
  it("normalizes a protocol_v2 document envelope", () => {
    const normalized = normalizeRenderRequest({
      sourceSchema: "protocol_v2",
      document: {
        version: "2.0",
        title: "Protocol deck",
        layoutFamily: "editorial",
        slides: [
          {
            slideType: "title-body",
            title: "Overview",
            body: ["Point one", "Point two"],
          },
        ],
      },
    });

    expect(normalized.doc?.meta.title).toBe("Protocol deck");
    expect(normalized.doc?.slides).toHaveLength(1);
    expect(normalized.validationIssues).toBeUndefined();
  });

  it("normalizes a direct PaperDocument envelope without wrapper fields", () => {
    const directDocument = compilePresentationSpec({
      version: "2.0",
      title: "Direct paper document",
      layoutFamily: "editorial",
      slides: [
        {
          slideType: "kpi-grid",
          title: "Snapshot",
          items: [
            { label: "ARR", value: "$12M", trend: "up" },
            { label: "NRR", value: "118%", trend: "up" },
          ],
        },
      ],
    });

    const normalized = normalizeRenderRequest(directDocument);

    expect(normalized.doc?.meta.title).toBe("Direct paper document");
    expect(normalized.doc?.slides).toHaveLength(1);
    expect(normalized.validationIssues).toBeUndefined();
  });
});
