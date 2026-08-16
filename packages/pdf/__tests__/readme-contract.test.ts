import { readFile } from "node:fs/promises";
import * as publicApi from "../src/index.js";
import { PdfEngine } from "../src/engine.js";

describe("README contract", () => {
  it("renders the documented quick start with strict validation enabled", async () => {
    const buffer = await PdfEngine.render({
      meta: { title: "Monthly Update", author: "Acme Inc." },
      page: { size: "Letter", margin: 48 },
      children: [
        { type: "heading", value: "Monthly Update", level: 1 },
        { type: "paragraph", value: "Revenue grew 18% month over month." },
        {
          type: "table",
          columns: [{ width: 120 }, { width: 80 }],
          rows: [
            { isHeader: true, cells: [{ value: "Region" }, { value: "Revenue" }] },
            { cells: [{ value: "North America" }, { value: "$5.1M" }] },
            { cells: [{ value: "Europe" }, { value: "$3.6M" }] },
          ],
        },
      ],
    });

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("documents only the real streaming and public API contracts", async () => {
    const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

    expect(readme).toContain("stream.pipe(createWriteStream");
    expect(readme).toContain("complete PDF buffer first");
    expect(readme).not.toMatch(/\bonChunk\b|\bonEnd\b/u);
    expect(readme).not.toMatch(
      /\bisPhase3Document\b|\bcontainsTableNode\b|\bcontainsFormNode\b|\bregisterFont\b|\bparseSvgPath\b/u,
    );
    expect(readme).not.toMatch(/\bPDF\/UA\b|\bWCAG compliance\b/u);
    expect(publicApi).not.toHaveProperty("RunstampFeatureError");
  });
});
