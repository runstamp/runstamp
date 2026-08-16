import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, type Readable } from "node:stream";

const PDF_HEADER_PREFIX = Buffer.from("%PDF-", "ascii");

export function hasQpdf(): boolean {
  return spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
}

export async function linearizePdfBuffer(buffer: Buffer): Promise<Buffer> {
  if (!hasQpdf()) {
    throw new Error("Linearized PDF output requires qpdf to be installed");
  }

  const tempDir = mkdtempSync(join(tmpdir(), "json-to-pdf-linearize-"));
  const inputPath = join(tempDir, "input.pdf");
  const outputPath = join(tempDir, "output-linearized.pdf");

  try {
    writeFileSync(inputPath, buffer);
    // `--deterministic-id` derives the PDF /ID from the file contents instead of
    // from randomness. Without it qpdf stamps a fresh identifier on every run, so
    // two linearizations of identical bytes differ — which made `pdf.transform`
    // non-deterministic *within a single process* while its descriptor claimed
    // `deterministic: true`, and did the same to `pdf.render` whenever the caller
    // passed `linearize: true`. C7/C8 caught it the first time a fixture invoked
    // the verb (OC-1 R24).
    execFileSync("qpdf", ["--linearize", "--deterministic-id", inputPath, outputPath], { stdio: "pipe" });
    return readFileSync(outputPath);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

export function streamPdfBuffer(renderBuffer: () => Promise<Buffer>): Readable {
  const stream = new PassThrough();
  setImmediate(() => {
    stream.write(PDF_HEADER_PREFIX);

    void (async () => {
      try {
        const buffer = await renderBuffer();
        if (!buffer.subarray(0, PDF_HEADER_PREFIX.length).equals(PDF_HEADER_PREFIX)) {
          throw new Error("Rendered PDF did not begin with the expected PDF header");
        }
        stream.end(buffer.subarray(PDF_HEADER_PREFIX.length));
      } catch (error) {
        stream.destroy(error instanceof Error ? error : new Error(String(error)));
      }
    })();
  });

  return stream;
}
