import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, type Readable } from "node:stream";

const PDF_HEADER_PREFIX = Buffer.from("%PDF-", "ascii");

interface EmbeddedQpdf {
  readonly FS: {
    writeFile(path: string, contents: Uint8Array): void;
    readFile(path: string): Uint8Array;
  };
  callMain(arguments_: readonly string[]): number | void;
}

type EmbeddedQpdfFactory = (options: {
  readonly noInitialRun: boolean;
  readonly print: (message: string) => void;
  readonly printErr: (message: string) => void;
}) => Promise<EmbeddedQpdf>;

export function hasQpdf(): boolean {
  return spawnSync("which", ["qpdf"], { stdio: "ignore" }).status === 0;
}

export async function linearizePdfBufferWithWasm(buffer: Buffer): Promise<Buffer> {
  // The embedded qpdf ESM build still references Node's CommonJS globals while
  // initializing its virtual filesystem. Supply those globals before importing
  // it so the same deterministic qpdf operation works in binary-free hosts such
  // as Vercel Functions.
  const globals = globalThis as typeof globalThis & {
    require?: NodeRequire;
    __dirname?: string;
  };
  globals.require ??= createRequire(import.meta.url);
  globals.__dirname ??= process.cwd();

  const qpdfModule = await import("qpdf-wasm-esm-embedded");
  const createQpdf = qpdfModule.default as unknown as EmbeddedQpdfFactory;
  const diagnostics: string[] = [];
  const qpdf = await createQpdf({
    noInitialRun: true,
    print: (message: string) => diagnostics.push(message),
    printErr: (message: string) => diagnostics.push(message),
  });
  qpdf.FS.writeFile("/input.pdf", buffer);

  try {
    qpdf.callMain(["--linearize", "--deterministic-id", "/input.pdf", "/output.pdf"]);
    return Buffer.from(qpdf.FS.readFile("/output.pdf"));
  } catch (error) {
    const detail = diagnostics.length > 0 ? `: ${diagnostics.join("\n")}` : "";
    throw new Error(`Embedded qpdf failed to linearize the PDF${detail}`, { cause: error });
  }
}

export async function linearizePdfBuffer(buffer: Buffer): Promise<Buffer> {
  if (!hasQpdf()) {
    return linearizePdfBufferWithWasm(buffer);
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
