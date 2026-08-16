import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PdfEngine } from "../src/engine.js";

function hasBinary(name: string): boolean {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

describe("PdfEngine phase 1 and core behavior", () => {
  it("renders a non-empty PDF buffer", async () => {
    const buffer = await PdfEngine.render({
      pages: [{ text: { value: "Hello World" } }],
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 9).toString("ascii")).toBe("%PDF-1.4\n");
  });

  it("writes the expected page dimensions and compression filter", async () => {
    const buffer = await PdfEngine.render({
      pages: [{ text: { value: "Hello World" } }],
    });

    const content = buffer.toString("binary");
    expect(content).toContain("/MediaBox [0 0 612 792]");
    expect(content).toContain("/Filter /FlateDecode");
  });

  it("produces deterministic bytes across repeated renders", async () => {
    const input = {
      meta: {
        author: "Runstamp",
        title: "Deterministic PDF",
      },
      pages: [{ text: { value: "Hello World" } }],
    } as const;

    const [first, second] = await Promise.all([PdfEngine.render(input), PdfEngine.render(input)]);
    expect(Buffer.compare(first, second)).toBe(0);
  });

  it("embeds font resources for rendered text output", async () => {
    const buffer = await PdfEngine.render({
      pages: [
        {
          text: {
            value: "Hello (PDF) \\ World",
            x: 72,
            y: 720,
            fontSize: 12,
          },
        },
      ],
    });

    const content = buffer.toString("latin1");
    expect(content).toContain("/FontFile2");
    expect(content).toContain("/Subtype /Type0");
    expect(content).toContain("/ToUnicode");
  });

  it("uses Flate-compressed streams in serialized output", async () => {
    const buffer = await PdfEngine.render({
      pages: [{ text: { value: "Hello World" } }],
    });

    const content = buffer.toString("latin1");
    expect((content.match(/\/Filter \/FlateDecode/g) ?? []).length).toBeGreaterThan(0);
    expect(content).toContain("stream");
    expect(content).toContain("endstream");
  });

  it("supports multiple text runs on the single Phase 2 page", async () => {
    const buffer = await PdfEngine.render({
      pages: [
        { texts: [{ value: "Page 1" }, { value: "Page 1 again", y: 680 }] },
      ],
    });

    expect(buffer.toString("binary")).toContain("/Count 1");
  });

  it("rejects unsupported built-in font names", async () => {
    await expect(
      PdfEngine.render({
        pages: [
          {
            text: {
              font: "Times-Roman" as never,
              value: "Hello",
            },
          },
        ],
      }, { strict: false }),
    ).rejects.toThrow(/Helvetica/);
  });

  it("can be rasterized by pdftoppm when available", async () => {
    if (!hasBinary("pdftoppm")) {
      return;
    }

    const buffer = await PdfEngine.render({
      pages: [{ text: { value: "Hello World" } }],
    });

    const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-"));
    const pdfPath = join(tempDir, "hello-world.pdf");
    const outputPrefix = join(tempDir, "page");

    try {
      writeFileSync(pdfPath, buffer);
      execFileSync("pdftoppm", ["-png", "-singlefile", "-f", "1", "-l", "1", pdfPath, outputPrefix], {
        stdio: "pipe",
      });
      const pngPath = `${outputPrefix}.png`;
      expect(readFileSync(pngPath).length).toBeGreaterThan(0);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
