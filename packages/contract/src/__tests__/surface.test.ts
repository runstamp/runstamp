import { describe, expect, it } from "vitest";

import * as contract from "../index.js";
import { createArtifactBytes, MEDIA_TYPES } from "../artifact.js";
import { isVerb, parseOperationName } from "../registry.js";
import { VERBS } from "../types.js";
import { hashBytes } from "../canonical.js";
import { isPaperError } from "../errors.js";

describe("createArtifactBytes", () => {
  it("derives byteLength and hash so callers never re-derive them (R31)", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const artifact = createArtifactBytes(bytes, MEDIA_TYPES.pdf, "pdf");
    expect(artifact.byteLength).toBe(4);
    expect(artifact.hash).toBe(hashBytes(bytes));
    expect(artifact.mediaType).toBe("application/pdf");
  });

  it("rejects a leading dot on the extension", () => {
    expect(() => createArtifactBytes(new Uint8Array(), MEDIA_TYPES.pdf, ".pdf")).toThrow(
      /leading dot/i,
    );
  });

  it("rejects a non-Uint8Array payload", () => {
    let thrown: unknown;
    try {
      createArtifactBytes("nope" as unknown as Uint8Array, MEDIA_TYPES.pdf, "pdf");
    } catch (error) {
      thrown = error;
    }
    expect(isPaperError(thrown)).toBe(true);
  });

  it("declares a media type for every natively rendered format", () => {
    expect(Object.keys(MEDIA_TYPES).sort()).toEqual(["docx", "html", "pdf", "pptx", "xlsx"]);
  });
});

describe("registry", () => {
  it("declares exactly the twelve canonical verbs (§4)", () => {
    expect(VERBS).toHaveLength(12);
    expect(new Set(VERBS).size).toBe(12);
    for (const verb of VERBS) expect(isVerb(verb)).toBe(true);
    expect(isVerb("generate")).toBe(false); // not a canonical verb
  });

  it("parses qualified and unqualified operation names", () => {
    expect(parseOperationName("docx.render")).toEqual({ domain: "docx", verb: "render" });
    expect(parseOperationName("xlsx.extract.tables")).toEqual({
      domain: "xlsx",
      verb: "extract",
      qualifier: "tables",
    });
    expect(parseOperationName("pdf.extract.text.spans")).toEqual({
      domain: "pdf",
      verb: "extract",
      qualifier: "text.spans",
    });
  });

  it("returns undefined for a name that is not a canonical verb", () => {
    expect(parseOperationName("docx.generate")).toBeUndefined();
    expect(parseOperationName("docx")).toBeUndefined();
    expect(parseOperationName("")).toBeUndefined();
  });
});

describe("public surface hygiene (§4.2 deny-list)", () => {
  const exported = Object.keys(contract);

  it("exports nothing matching the deny-list", () => {
    const denied = [/^phase\d/i, /Phase\d/, /[Ff]ixture/, /^[A-Z]$/, /^(internal|_)/];
    const offenders = exported.filter((name) => denied.some((pattern) => pattern.test(name)));
    expect(offenders).toEqual([]);
  });

  it("exports no default", () => {
    expect(exported).not.toContain("default");
  });

  it("exposes the contract version", () => {
    expect(contract.CONTRACT_VERSION).toBe("1.0.0");
  });

  it("keeps every runtime export callable or a plain value", () => {
    for (const name of exported) {
      const value = (contract as Record<string, unknown>)[name];
      expect(value, `${name} must not be undefined`).toBeDefined();
    }
  });
});
