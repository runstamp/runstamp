import { PdfEngine } from "../src/engine.js";
import { createDeterministicDocument } from "../scripts/phase3-fixtures.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";

describe("Phase 3 determinism benchmark", () => {
  let inter: { family: string; source: string };

  beforeAll(async () => {
    const fonts = await ensurePhase2FontFixtures();
    inter = { family: "Inter", source: fonts.inter };
  }, 120_000);

  it("produces byte-identical PDFs across 100 consecutive renders", async () => {
    const document = createDeterministicDocument(inter);
    const first = await PdfEngine.render(document);

    for (let index = 0; index < 99; index += 1) {
      const next = await PdfEngine.render(document);
      expect(Buffer.compare(first, next)).toBe(0);
    }
  }, 120_000);
});
