/**
 * What the published Apache-2.0 package can actually do.
 *
 * This file used to assert the free/pro split: that gated features threw
 * `RunstampFeatureError` without a licence key. The split is gone, so the
 * assertions are inverted — the capabilities that were paywalled must now work
 * unconditionally, and no code path may demand a key.
 *
 * The inversion matters more than it looks. The paywall sat on font embedding
 * and complex-script shaping, which meant the published package silently
 * substituted `?` for anything outside Latin-1. Fidelity was a function of what
 * you paid, which is exactly what OC-1's conformance matrix cannot express.
 */
import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { hasPdfProLicense } from "../src/pro-guard.js";
import { render } from "../src/ops/index.js";
import type { PdfDocument } from "../src/engine.js";

const doc = (input: unknown): PdfDocument => input as PdfDocument;

describe("the published package renders without any licence", () => {
  it("renders a basic PDF document", async () => {
    const buffer = await PdfEngine.render({
      pages: [{ texts: [{ value: "Hello", fontSize: 24, x: 72, y: 700 }] }],
    });

    expect(buffer).toBeInstanceOf(Buffer);
    const pdf = buffer.toString("latin1");
    expect(pdf).toContain("%PDF-");
    expect(pdf).toContain("/Type /Page");
    expect(pdf).toContain("%%EOF");
  });

  it("embeds the fallback font, so non-Latin-1 text is not substituted", async () => {
    // Previously gated behind "embedded-fonts-and-complex-shaping". Greek and
    // Cyrillic are covered by the bundled Lato, so a faithful render reports no
    // loss at all — the ledger stays empty because nothing was lost.
    const result = await render(
      doc({
        page: { size: "Letter", margin: 72 },
        children: [{ type: "paragraph", value: "α β Привет" }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.losses).toEqual([]);
  });

  it("does not require a licence key for any render path", async () => {
    const previous = process.env.RUNSTAMP_LICENSE_KEY;
    delete process.env.RUNSTAMP_LICENSE_KEY;
    try {
      const buffer = await PdfEngine.render({
        pages: [{ texts: [{ value: "No key set", fontSize: 12, x: 72, y: 700 }] }],
      });
      expect(buffer.length).toBeGreaterThan(0);
    } finally {
      if (previous !== undefined) process.env.RUNSTAMP_LICENSE_KEY = previous;
    }
  });

  it("keeps the deprecated licence predicate answering true", () => {
    // Retained through the §9.5 window so existing callers keep compiling.
    expect(hasPdfProLicense()).toBe(true);
    expect(hasPdfProLicense("anything")).toBe(true);
  });
});
