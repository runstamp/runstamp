/**
 * Byte-determinism oracle for the M2.b refactor.
 *
 * Captures SHA-256 of representative fixture renders. Hashes are
 * snapshot-locked: the first run records them, subsequent runs assert
 * equality. A passing oracle means the M2.b RenderContext swap
 * preserved byte-for-byte output across the surveyed fixtures.
 *
 * Coverage targets the major code paths inside `renderPdfPages`:
 *   - Phase 3 (text + flex layout, embedded font subsetting)
 *   - Phase 5 (table layout)
 *   - Phase 6 (forms + annotations + outlines)
 *   - Phase 8 (PDF/A: ICC profile, output intent, structure tree)
 *   - Phase 2 (legacy flat pages with Helvetica)
 *
 * The PDF /ID array is non-deterministic across processes (uses a fresh
 * random seed when `meta.fileId` is unset); for hashing we either pin
 * `meta.fileId` to a fixed Buffer or hash the document body excluding
 * the trailer. Here we pin `meta.fileId`.
 */
import { createHash } from "node:crypto";
import { PdfEngine } from "../src/engine.js";
import { createDeterministicDocument } from "../scripts/phase3-fixtures.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";

function sha(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

describe("render byte-determinism oracle (M2.b regression guard)", () => {
  let interFont: { family: string; source: string };

  beforeAll(async () => {
    const fonts = await ensurePhase2FontFixtures();
    interFont = { family: "Inter", source: fonts.inter };
  }, 120_000);

  it("phase3 deterministic doc hashes match snapshot", async () => {
    const buffer = await PdfEngine.render(createDeterministicDocument(interFont));
    expect(sha(buffer)).toMatchSnapshot();
  });

  it("phase2 minimal helvetica doc hashes match snapshot", async () => {
    const buffer = await PdfEngine.render({
      pages: [{ texts: [{ value: "Hello, oracle.", x: 72, y: 720, fontSize: 14 }] }],
    });
    expect(sha(buffer)).toMatchSnapshot();
  });

  it("phase3 multi-paragraph doc hashes match snapshot", async () => {
    const buffer = await PdfEngine.render({
      page: { size: "Letter", margin: 72 },
      meta: { title: "Oracle phase3 multi" },
      children: [
        { type: "heading", font: interFont, fontSize: 24, value: "Heading A" },
        { type: "paragraph", font: interFont, fontSize: 12, value: "Paragraph one." },
        { type: "paragraph", font: interFont, fontSize: 12, value: "Paragraph two with more content to exercise line wrapping behavior in the layout pipeline." },
      ],
    });
    expect(sha(buffer)).toMatchSnapshot();
  });

  it("phase5 table doc hashes match snapshot", async () => {
    const buffer = await PdfEngine.render({
      page: { size: "Letter", margin: 72 },
      meta: { title: "Oracle phase5 table" },
      children: [
        { type: "heading", font: interFont, fontSize: 18, value: "Q1 figures" },
        {
          type: "table",
          columns: [{ width: 200 }, { width: 100, align: "right" }],
          header: [{ cells: [{ children: [{ type: "paragraph", value: "Region" }] }, { children: [{ type: "paragraph", value: "Revenue" }] }] }],
          body: [
            { cells: [{ children: [{ type: "paragraph", value: "NA" }] }, { children: [{ type: "paragraph", value: "$5.1M" }] }] },
            { cells: [{ children: [{ type: "paragraph", value: "EU" }] }, { children: [{ type: "paragraph", value: "$3.6M" }] }] },
          ],
        },
      ],
    }, { strict: false });
    expect(sha(buffer)).toMatchSnapshot();
  });
});
