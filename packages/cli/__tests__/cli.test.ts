import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pdfValidate: vi.fn(),
  pdfRender: vi.fn(),
  docxValidate: vi.fn(),
  docxRender: vi.fn(),
  xlsxValidate: vi.fn(),
  xlsxLint: vi.fn(),
  xlsxRender: vi.fn(),
  pptxPreflight: vi.fn(),
  pptxRender: vi.fn(),
}));

vi.mock("@runstamp/pdf", () => ({
  PdfEngine: {
    validate: mocks.pdfValidate,
    render: mocks.pdfRender,
  },
}));

vi.mock("@runstamp/docx", () => ({
  validateDocxDocument: mocks.docxValidate,
  renderToDocx: mocks.docxRender,
}));

vi.mock("@runstamp/xlsx", () => ({
  SpreadsheetEngine: {
    validate: mocks.xlsxValidate,
    lint: mocks.xlsxLint,
    render: mocks.xlsxRender,
  },
}));

vi.mock("@runstamp/pptx", () => ({
  PaperEngine: {
    preflight: mocks.pptxPreflight,
    render: mocks.pptxRender,
  },
}));

const { parseArgs, runCli } = await import("../src/index.js");

class CaptureStream extends Writable {
  chunks: string[] = [];

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString());
    callback();
  }

  text(): string {
    return this.chunks.join("");
  }
}

describe("@runstamp/cli", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "runstamp-cli-test-"));
    vi.resetAllMocks();
    mocks.pdfValidate.mockReturnValue({ ok: true, issues: [] });
    mocks.pdfRender.mockResolvedValue(Buffer.from("%PDF-test"));
    mocks.docxValidate.mockReturnValue({ valid: true, issues: [] });
    mocks.docxRender.mockResolvedValue({ buffer: Buffer.from("docx-test") });
    mocks.xlsxValidate.mockReturnValue({ sheets: [{ name: "Sheet1", rows: [] }] });
    mocks.xlsxLint.mockReturnValue({ ok: true, issues: [] });
    mocks.xlsxRender.mockResolvedValue(Buffer.from("xlsx-test"));
    mocks.pptxPreflight.mockResolvedValue({ verdict: "ok" });
    mocks.pptxRender.mockResolvedValue(Buffer.from("pptx-test"));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  it("parses the required render command shape", () => {
    expect(parseArgs(["pdf", "--in", "spec.json", "--out", "out.pdf", "--validate"])).toEqual({
      format: "pdf",
      inputPath: "spec.json",
      outputPath: "out.pdf",
      validate: true,
      strict: true,
    });
  });

  it("prints help to stdout", async () => {
    const stdout = new CaptureStream();
    const stderr = new CaptureStream();
    const exitCode = await runCli(["--help"], {
      cwd: dir,
      stdout,
      stderr,
    });

    expect(exitCode).toBe(0);
    expect(stdout.text()).toContain("Usage:");
    expect(stderr.text()).toBe("");
  });

  it("reads JSON from stdin and writes the rendered artifact", async () => {
    const stdout = new CaptureStream();
    const stderr = new CaptureStream();
    const exitCode = await runCli(["pdf", "--in", "-", "--out", "nested/out.pdf", "--validate"], {
      cwd: dir,
      stdin: Readable.from([JSON.stringify({ type: "PdfDocument", pages: [] })]),
      stdout,
      stderr,
    });

    expect(exitCode).toBe(0);
    await expect(readFile(join(dir, "nested", "out.pdf"), "utf8")).resolves.toBe("%PDF-test");
    expect(mocks.pdfValidate).toHaveBeenCalledWith({ type: "PdfDocument", pages: [] });
    expect(mocks.pdfRender).toHaveBeenCalledWith({ type: "PdfDocument", pages: [] }, { strict: true });
    expect(stderr.text()).toContain("validation ok");
    expect(stdout.text()).toContain("nested/out.pdf");
  });

  it("supports the permissive migration flag", async () => {
    const exitCode = await runCli(["docx", "--in", "-", "--out", "out.docx", "--no-strict"], {
      cwd: dir,
      stdin: Readable.from([JSON.stringify({ type: "DocxDocument", pages: [] })]),
      stdout: new CaptureStream(),
      stderr: new CaptureStream(),
    });

    expect(exitCode).toBe(0);
    expect(mocks.docxRender).toHaveBeenCalledWith({ type: "DocxDocument", pages: [] }, { strict: false });
  });

  it("fails before rendering when validation reports issues", async () => {
    mocks.pdfValidate.mockReturnValue({
      ok: false,
      issues: [{
        severity: "error",
        code: "PDF_VALIDATE_SCHEMA",
        path: "pages",
        message: "Expected at least one page",
      }],
    });
    const stderr = new CaptureStream();
    const exitCode = await runCli(["pdf", "--in", "-", "--out", "out.pdf", "--validate"], {
      cwd: dir,
      stdin: Readable.from([JSON.stringify({ type: "PdfDocument", pages: [] })]),
      stdout: new CaptureStream(),
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(mocks.pdfRender).not.toHaveBeenCalled();
    expect(stderr.text()).toContain("PDF_VALIDATE_SCHEMA pages");
  });

  it("normalizes thrown schema validation errors", async () => {
    mocks.xlsxValidate.mockImplementation(() => {
      const error = new Error("Invalid workbook") as Error & { issues: unknown[] };
      error.issues = [{ code: "VALIDATION_FAILED", path: "sheets", message: "Required" }];
      throw error;
    });
    const stderr = new CaptureStream();
    const exitCode = await runCli(["xlsx", "--in", "-", "--out", "out.xlsx", "--validate"], {
      cwd: dir,
      stdin: Readable.from([JSON.stringify({ sheets: [] })]),
      stdout: new CaptureStream(),
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(mocks.xlsxRender).not.toHaveBeenCalled();
    expect(stderr.text()).toContain("VALIDATION_FAILED sheets");
  });

  it("creates a resumable multi-format starter without touching customer source", async () => {
    const stdout = new CaptureStream();
    const exitCode = await runCli(["init", "--format", "pptx,xlsx", "--framework", "nextjs", "--package-manager", "pnpm", "--tier", "pro"], {
      cwd: dir, stdout, stderr: new CaptureStream(),
    });

    expect(exitCode).toBe(0);
    const config = JSON.parse(await readFile(join(dir, ".runstamp/config.json"), "utf8"));
    expect(config).toMatchObject({ formats: ["pptx", "xlsx"], framework: "nextjs", packageManager: "pnpm", tier: "pro" });
    await expect(readFile(join(dir, ".runstamp/fixtures/pptx.json"), "utf8")).resolves.toContain("Runstamp verified");
    await expect(readFile(join(dir, ".runstamp/README.md"), "utf8")).resolves.toContain("pnpm exec runstamp doctor");
    expect(stdout.text()).toContain("created pptx, xlsx starter");
  });

  it("verifies determinism privately without a network request", async () => {
    await runCli(["init", "--format", "pdf"], { cwd: dir, stdout: new CaptureStream(), stderr: new CaptureStream() });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const stdout = new CaptureStream();

    const exitCode = await runCli(["verify", "--private", "--format", "pdf"], {
      cwd: dir, stdout, stderr: new CaptureStream(),
    });

    expect(exitCode).toBe(0);
    expect(mocks.pdfRender).toHaveBeenCalledTimes(2);
    expect(stdout.text()).toContain("No activation metadata was sent");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits only bounded activation metadata for a linked verification", async () => {
    await runCli(["init", "--format", "pdf", "--framework", "node"], { cwd: dir, stdout: new CaptureStream(), stderr: new CaptureStream() });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ activation: { state: "verified" } }) });
    vi.stubGlobal("fetch", fetchMock);

    const exitCode = await runCli(["verify", "--link", "pjsx_activate_test", "--format", "pdf"], {
      cwd: dir, stdout: new CaptureStream(), stderr: new CaptureStream(),
    });

    expect(exitCode).toBe(0);
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body).toEqual(expect.objectContaining({ format: "pdf", framework: "node", validationResult: "passed" }));
    expect(body).not.toHaveProperty("sourcePath");
    expect(body).not.toHaveProperty("content");
  });

  it("discovers all operations through the public descriptor-only catalog", async () => {
    const stdout = new CaptureStream();
    expect(await runCli(["ops", "list"], { cwd: dir, stdout, stderr: new CaptureStream() })).toBe(0);
    expect(stdout.text()).toContain("79 operation(s)");

    const described = new CaptureStream();
    expect(await runCli(["ops", "describe", "pdf.render"], { cwd: dir, stdout: described, stderr: new CaptureStream() })).toBe(0);
    const descriptor = JSON.parse(described.text()) as Record<string, unknown>;
    expect(descriptor.name).toBe("pdf.render");
    expect(descriptor).not.toHaveProperty("implementation");
  });
});
