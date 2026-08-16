import { describe, expect, it } from "vitest";
import { DeclarativeValidationError } from "@runstamp/protocol";
import { compileDeclarativeDocument } from "../src/protocol/declarative.js";

describe("core declarative compiler compatibility", () => {
  it("compiles the public declarative surface", () => {
    const document = compileDeclarativeDocument({
      title: "Quarterly review",
      slides: [{ layout: "title", title: "Quarterly review" }],
    });
    expect(document.type).toBe("Document");
    expect(document.slides).toHaveLength(1);
  });

  it("fails closed and retains structured schema issues", () => {
    expect(() => compileDeclarativeDocument({ title: "No slides", slides: [] })).toThrow(DeclarativeValidationError);
    try {
      compileDeclarativeDocument({ title: "No slides", slides: [] });
    } catch (error) {
      expect((error as DeclarativeValidationError).issues[0]).toEqual(expect.objectContaining({
        path: ["slides"],
        severity: "error",
      }));
    }
  });
});
