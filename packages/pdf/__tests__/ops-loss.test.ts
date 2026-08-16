/**
 * C11 (no silent loss) and C12 (loss ordering) for the `pdf` domain.
 *
 * This suite is adversarial by construction: every fixture below is a document
 * whose faithful rendering is *known to be impossible*, and the assertion is that
 * the corresponding `Loss` appears with the right severity. A build that renders
 * plausible-looking bytes and returns an empty ledger fails here.
 *
 * The inverse assertion matters just as much: a clean document must produce
 * `losses: []`. If everything reported a loss, the ledger would carry no signal.
 */

import { describe, expect, it } from "vitest";

import { render } from "../src/ops/index.js";
import { CLASSIFIED_ENGINE_CODES, classifyWarning, locatorFromEnginePath } from "../src/ops/losses.js";
import { parseLocator, formatLocator } from "@runstamp/contract";
import type { Loss } from "@runstamp/contract";
import type { PdfDocument } from "../src/engine.js";

const doc = (input: unknown): PdfDocument => input as PdfDocument;

/** A document with nothing the engine cannot represent faithfully. */
const CLEAN = doc({
  page: { size: "Letter", margin: 72 },
  meta: { title: "clean" },
  children: [{ type: "paragraph", value: "Plain ASCII text." }],
});

async function lossesFor(input: PdfDocument): Promise<readonly Loss[]> {
  const result = await render(input);
  if (!result.ok) throw new Error(`render failed: ${result.error.code} ${result.error.message}`);
  return result.losses;
}

describe("C11 — the ledger is empty only when fidelity is actually full", () => {
  it("reports no loss for a document the engine can represent", async () => {
    // R17: `losses: []` is a positive claim. It must be reachable, or it is noise.
    expect(await lossesFor(CLEAN)).toEqual([]);
  });
});

describe("C11 — known-lossy fixtures each surface their loss", () => {
  it("dropped: text with no glyph in the embedded font is reported, not left blank", async () => {
    // The audit's most serious finding. The bundled fallback font (Lato) has no
    // CJK glyphs, so these characters render as `.notdef` — a blank box. The
    // output is a well-formed PDF of the right size with the text simply gone,
    // which is exactly the "plausible output, empty ledger" failure C11 exists
    // to catch. Before instrumentation this returned `losses: []`.
    const losses = await lossesFor(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [{ type: "paragraph", value: "漢字" }],
      }),
    );

    const missing = losses.filter((loss) => loss.code === "pdf/TEXT_GLYPH_MISSING");
    expect(missing.length).toBe(2);
    for (const loss of missing) {
      // `dropped`, not `substituted`: nothing legible reaches the page at all.
      expect(loss.severity).toBe("dropped");
      expect(loss.avoidable).toBe(true);
      expect(loss.remediation).toMatch(/font/i);
    }
    expect(missing.map((loss) => loss.expected)).toEqual(["漢", "字"]);
  });

  it("reports nothing for a script the fallback font does cover", async () => {
    // Greek and Cyrillic ARE in Lato, so they are faithfully rendered. Reporting
    // them would be a false positive and would devalue the ledger.
    expect(
      await lossesFor(
        doc({
          page: { size: "Letter", margin: 72 },
          children: [{ type: "paragraph", value: "α β Привет" }],
        }),
      ),
    ).toEqual([]);
  });

  it("substituted: form widget values are reported too (the Phase 4 audit finding)", async () => {
    // Widget appearance text went through the same encoder with no warning sink,
    // so non-WinAnsi form values were destroyed with nothing recorded anywhere.
    const losses = await lossesFor(
      doc({ children: [{ name: "note", type: "form-text", value: "α ≥ 5" }] }),
    );

    const substitutions = losses.filter((loss) => loss.code === "pdf/TEXT_CHARACTER_UNMAPPABLE");
    expect(substitutions.length).toBe(2);
    expect(substitutions.every((loss) => loss.severity === "substituted")).toBe(true);
  });

  it("degraded: a page size outside the representable range reports the clamp", async () => {
    // The representable range is 3pt..14400pt, so this exceeds the maximum.
    const losses = await lossesFor(
      doc({
        page: { size: { width: 20_000, height: 20_000 }, margin: 72 },
        children: [{ type: "paragraph", value: "oversized" }],
      }),
    );

    const clamped = losses.filter((loss) => loss.code === "pdf/PAGE_SIZE_CLAMPED");
    expect(clamped.length).toBeGreaterThan(0);
    for (const loss of clamped) {
      expect(loss.severity).toBe("degraded");
      // Here `to` really is what was produced, so expected/actual differ.
      expect(loss.expected).toBeDefined();
      expect(loss.actual).toBeDefined();
      expect(loss.expected).not.toBe(loss.actual);
    }
  });

  it("degraded: an element taller than the printable area reports the overflow", async () => {
    const losses = await lossesFor(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [{ type: "container", style: { height: 5000 }, children: [] }],
      }),
    );

    const overflow = losses.filter((loss) => loss.code === "pdf/ELEMENT_OVERFLOWS_PAGE");
    expect(overflow.length).toBeGreaterThan(0);
    expect(overflow[0]?.severity).toBe("degraded");
    expect(overflow[0]?.avoidable).toBe(true);
  });

  it("degraded: an unbreakable token that must wrap mid-word reports it", async () => {
    const losses = await lossesFor(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [{ type: "paragraph", value: "x".repeat(400) }],
      }),
    );

    const wrapped = losses.filter((loss) => loss.code === "pdf/TOKEN_WRAPPED");
    expect(wrapped.length).toBeGreaterThan(0);
    expect(wrapped[0]?.severity).toBe("degraded");
  });
});

describe("C6 — a page too short for a single line terminates and reports", () => {
  // Regression: this input used to append pages forever inside the paginator and
  // exhaust the heap, killing the process rather than returning a result. It was
  // found by the Phase 4 audit, not by a bug report.
  it("returns instead of exhausting memory, and reports the clipping", async () => {
    const result = await render(
      doc({
        page: { size: { width: 300, height: 18 }, margin: 2 },
        children: [{ type: "paragraph", value: "hello world" }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.byteLength).toBeGreaterThan(0);

    const overflow = result.losses.filter((loss) => loss.code === "pdf/ELEMENT_OVERFLOWS_PAGE");
    expect(overflow.length).toBeGreaterThan(0);
    expect(overflow[0]?.severity).toBe("degraded");
    expect(overflow[0]?.message).toMatch(/clipped/i);
  });

  it("terminates for a zero-height printable area too", async () => {
    const result = await render(
      doc({
        page: { size: { width: 300, height: 10 }, margin: 5 },
        children: [{ type: "paragraph", value: "x" }],
      }),
    );
    expect(typeof result.ok).toBe("boolean");
  });
});

describe("C11 — conditions that are NOT losses stay out of the ledger", () => {
  it("a legacy input shape is coerced as a diagnostic, not a loss", async () => {
    // Nothing is lost: the legacy spelling and the modern one describe the same
    // document. Counting this as a loss would make the ledger unusable.
    const result = await render(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [{ type: "list", listType: "bullet", items: [{ value: "One" }] }],
      }),
    );
    if (!result.ok) throw new Error("render failed");

    expect(result.losses).toEqual([]);
    const coercions = result.diagnostics.filter((d) => d.code === "pdf/PDF_RELAXED_LIST_ITEMS");
    expect(coercions.length).toBeGreaterThan(0);
    expect(coercions[0]?.severity).toBe("info");
  });
});

describe("C12 — loss ordering is stable", () => {
  const MESSY = doc({
    page: { size: { width: 20_000, height: 20_000 }, margin: 72 },
    children: [
      { type: "paragraph", value: "漢字テスト" },
      { type: "container", style: { height: 50_000 }, children: [] },
      { type: "paragraph", value: "y".repeat(400) },
    ],
  });

  it("identical input yields an identical loss array, in identical order", async () => {
    const a = await lossesFor(MESSY);
    const b = await lossesFor(MESSY);
    expect(a.length).toBeGreaterThan(1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("the ledger survives the JSON boundary intact (C3)", async () => {
    const losses = await lossesFor(MESSY);
    expect(JSON.parse(JSON.stringify(losses))).toEqual(losses);
  });
});

describe("C9/C10 — locators emitted on losses round-trip", () => {
  it("every emitted locator parses back to itself", async () => {
    const losses = await lossesFor(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [
          { type: "paragraph", value: "漢字" },
          { type: "container", style: { height: 5000 }, children: [] },
        ],
      }),
    );

    const located = losses.filter((loss) => loss.locator !== undefined);
    expect(located.length).toBeGreaterThan(0);
    for (const loss of located) {
      const locator = loss.locator!;
      expect(parseLocator(formatLocator(locator))).toEqual(locator);
      expect(locator.domain).toBe("pdf");
      expect(locator.artifact).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
  });

  it("binds the locator to the input hash, so the address names real bytes", async () => {
    const result = await render(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [{ type: "paragraph", value: "漢" }],
      }),
    );
    if (!result.ok) throw new Error("render failed");
    const located = result.losses.find((loss) => loss.locator !== undefined);
    expect(located?.locator?.artifact).toBe(result.receipt.inputHash);
  });

  it("omits the locator rather than fabricating one for an unaddressable path", () => {
    // `meta.title` names no node in the document tree. A locator pointing at a
    // node that does not exist is worse than no locator at all.
    expect(locatorFromEnginePath("meta.title", "sha256:" + "a".repeat(64))).toBeUndefined();
  });

  it("maps nested table paths to structural segments only", () => {
    const locator = locatorFromEnginePath(
      "children[0].body[1].cells[2].style.minHeight",
      "sha256:" + "b".repeat(64),
    );
    expect(locator?.path.map((segment) => segment.kind)).toEqual(["part", "row", "cell"]);
    expect(locator?.path.map((segment) => segment.index)).toEqual([0, 1, 2]);
  });
});

describe("C5 — the taxonomy covers every warning the engine can emit", () => {
  // Without this, adding a warning code to the engine would silently route it to
  // the `UNCLASSIFIED` fallback: reported, but with a useless code and no
  // remediation. The gate is that classification is a required step, not an
  // optional one — which is what makes the ledger trustworthy over time.
  const SOURCES = [
    "src/engine.ts",
    "src/edge-policy.ts",
    "src/relaxed-input.ts",
    "src/phases/phase3-layout.ts",
  ];

  it("every PDF_* code emitted through onInputWarning is classified", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");

    const emitted = new Set<string>();
    for (const file of SOURCES) {
      const source = readFileSync(join(root, file), "utf8");
      for (const match of source.matchAll(/\bcode:\s*"(PDF_[A-Z0-9_]+)"/g)) {
        if (match[1]) emitted.add(match[1]);
      }
    }

    expect(emitted.size).toBeGreaterThan(0);
    const unclassified = [...emitted].filter((code) => !CLASSIFIED_ENGINE_CODES.includes(code));
    expect(unclassified).toEqual([]);
  });
});

describe("R17 — an unclassified engine warning still reaches the ledger", () => {
  it("degrades an unknown code instead of dropping it", () => {
    const { loss, diagnostic } = classifyWarning(
      { code: "PDF_SOME_FUTURE_CONDITION", message: "something happened", path: "children[0]" },
      "sha256:" + "c".repeat(64),
    );
    expect(diagnostic).toBeUndefined();
    expect(loss?.code).toBe("pdf/UNCLASSIFIED_CONDITION");
    // Unknown fidelity must never be reported as full fidelity.
    expect(loss?.severity).toBe("degraded");
  });
});

describe("R30 — lossPolicy composes with the real ledger", () => {
  it("failOnAny converts a dropped glyph into a typed failure", async () => {
    const input = doc({
      page: { size: "Letter", margin: 72 },
      children: [{ type: "paragraph", value: "漢" }],
    });

    const collected = await render(input, { lossPolicy: "collect" });
    expect(collected.ok).toBe(true);
    if (collected.ok) expect(collected.losses.length).toBeGreaterThan(0);

    const strict = await render(input, { lossPolicy: "failOnAny" });
    expect(strict.ok).toBe(false);
    if (!strict.ok) {
      expect(strict.error.code).toBe("pdf/LOSS_POLICY_VIOLATED");
      // The ledger travels with the failure, so the caller can see what tripped it.
      expect(strict.losses.length).toBeGreaterThan(0);
    }
  });

  it("failOnAny still succeeds for a document with genuinely full fidelity", async () => {
    const result = await render(CLEAN, { lossPolicy: "failOnAny" });
    expect(result.ok).toBe(true);
  });
});
