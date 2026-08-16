import { describe, expect, it } from "vitest";

import { compareLocators, formatLocator, parseLocator } from "../locator.js";
import type { Locator } from "../locator.js";
import { isPaperError } from "../errors.js";

const ARTIFACT = `sha256:${"ab12cd34".repeat(8)}`;

describe("formatLocator", () => {
  it("renders index, id, both, and bare segments", () => {
    expect(
      formatLocator({
        artifact: ARTIFACT,
        domain: "pptx",
        path: [{ kind: "slide", index: 2 }, { kind: "shape", id: "title" }, { kind: "run" }],
      }),
    ).toBe(`${ARTIFACT}/pptx:slide[2]/shape[id=title]/run`);
  });

  it("renders a segment carrying both an ordinal and a native id", () => {
    expect(
      formatLocator({
        artifact: ARTIFACT,
        domain: "xlsx",
        path: [{ kind: "sheet", index: 0, id: "Q3 Summary" }],
      }),
    ).toBe(`${ARTIFACT}/xlsx:sheet[0;id=Q3 Summary]`);
  });

  it("appends a character range", () => {
    expect(
      formatLocator({
        artifact: ARTIFACT,
        domain: "pdf",
        path: [{ kind: "page", index: 11 }],
        range: { start: 120, end: 168 },
      }),
    ).toBe(`${ARTIFACT}/pdf:page[11]#120-168`);
  });

  it("rejects a malformed artifact, an unknown domain, and an empty path", () => {
    expect(() => formatLocator({ artifact: "nope", domain: "pdf", path: [{ kind: "page" }] })).toThrow(
      /artifact/i,
    );
    expect(() =>
      formatLocator({ artifact: ARTIFACT, domain: "nope" as never, path: [{ kind: "page" }] }),
    ).toThrow(/domain/i);
    expect(() => formatLocator({ artifact: ARTIFACT, domain: "pdf", path: [] })).toThrow(/path/i);
  });

  it("rejects a negative or fractional ordinal", () => {
    expect(() =>
      formatLocator({ artifact: ARTIFACT, domain: "pdf", path: [{ kind: "page", index: -1 }] }),
    ).toThrow(/non-negative integer/i);
    expect(() =>
      formatLocator({ artifact: ARTIFACT, domain: "pdf", path: [{ kind: "page", index: 1.5 }] }),
    ).toThrow(/non-negative integer/i);
  });

  it("rejects an inverted range", () => {
    expect(() =>
      formatLocator({
        artifact: ARTIFACT,
        domain: "pdf",
        path: [{ kind: "page", index: 0 }],
        range: { start: 10, end: 4 },
      }),
    ).toThrow(/precedes/i);
  });
});

describe("locator round-trip (R20)", () => {
  // Structural cases, including every id that exercises the escaping scheme.
  const cases: Locator[] = [
    { artifact: ARTIFACT, domain: "pptx", path: [{ kind: "slide", index: 0 }] },
    { artifact: ARTIFACT, domain: "docx", path: [{ kind: "section" }, { kind: "paragraph", index: 87 }] },
    { artifact: ARTIFACT, domain: "xlsx", path: [{ kind: "sheet", id: "Sheet1" }, { kind: "cell", id: "R4C7" }] },
    { artifact: ARTIFACT, domain: "xlsx", path: [{ kind: "sheet", index: 3, id: "Costs" }] },
    {
      artifact: ARTIFACT,
      domain: "pdf",
      path: [{ kind: "page", index: 11 }, { kind: "paragraph", index: 4 }],
      range: { start: 120, end: 168 },
    },
    { artifact: ARTIFACT, domain: "common", path: [{ kind: "part", id: "word/document.xml" }] },
    { artifact: ARTIFACT, domain: "docx", path: [{ kind: "comment", id: "a[b]c/d#e;f%g" }] },
    { artifact: ARTIFACT, domain: "pptx", path: [{ kind: "note", id: "" }] },
    { artifact: ARTIFACT, domain: "pptx", path: [{ kind: "shape", id: "id=weird" }] },
    { artifact: ARTIFACT, domain: "html", path: [{ kind: "row", id: "日本語 ✓" }] },
    { artifact: ARTIFACT, domain: "pdf", path: [{ kind: "page", index: 0 }], range: { start: 0, end: 0 } },
  ];

  cases.forEach((locator, i) => {
    it(`case ${i} survives locator -> string -> locator`, () => {
      expect(parseLocator(formatLocator(locator))).toEqual(locator);
    });

    it(`case ${i} survives string -> locator -> string`, () => {
      const text = formatLocator(locator);
      expect(formatLocator(parseLocator(text))).toBe(text);
    });
  });
});

describe("parseLocator", () => {
  it("rejects malformed input with a contract violation", () => {
    const bad = [
      "",
      "no-slash",
      `${ARTIFACT}/pptx`, // missing ":"
      `${ARTIFACT}/pptx:`, // empty path
      `${ARTIFACT}/nope:slide[0]`, // unknown domain
      `${ARTIFACT}/pptx:widget[0]`, // unknown kind
      `${ARTIFACT}/pptx:slide[]`, // empty selector
      `${ARTIFACT}/pptx:slide[abc]`, // non-numeric, non-id selector
      "notahash/pptx:slide[0]",
    ];
    for (const text of bad) {
      let thrown: unknown;
      try {
        parseLocator(text);
      } catch (error) {
        thrown = error;
      }
      expect(isPaperError(thrown), `expected "${text}" to be rejected`).toBe(true);
      expect((thrown as { code: string }).code).toBe("common/CONTRACT_VIOLATION");
    }
  });
});

describe("compareLocators", () => {
  const at = (index: number): Locator => ({
    artifact: ARTIFACT,
    domain: "pptx",
    path: [{ kind: "slide", index }],
  });

  it("orders ordinals numerically, not lexically", () => {
    // The whole point: slide[2] must precede slide[10].
    const sorted = [at(10), at(2), at(1)].sort(compareLocators).map((l) => l.path[0]?.index);
    expect(sorted).toEqual([1, 2, 10]);
  });

  it("sorts a parent ahead of its children", () => {
    const parent: Locator = { artifact: ARTIFACT, domain: "pptx", path: [{ kind: "slide", index: 1 }] };
    const child: Locator = {
      artifact: ARTIFACT,
      domain: "pptx",
      path: [{ kind: "slide", index: 1 }, { kind: "shape", index: 0 }],
    };
    expect(compareLocators(parent, child)).toBeLessThan(0);
  });

  it("is a total order: antisymmetric and reflexive", () => {
    expect(compareLocators(at(1), at(1))).toBe(0);
    expect(Math.sign(compareLocators(at(1), at(2)))).toBe(-Math.sign(compareLocators(at(2), at(1))));
  });
});
