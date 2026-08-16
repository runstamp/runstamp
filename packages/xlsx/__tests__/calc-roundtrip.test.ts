import { constants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import {
  CALC_ROUND_TRIP_SENTINEL,
  createRepresentativeWorkbook,
} from "./representative-workbook.js";

const SOFFICE_TIMEOUT_MS = 60_000;
const temporaryDirectories: string[] = [];

async function resolveSofficePath(): Promise<string | undefined> {
  const executableNames = process.platform === "win32"
    ? ["soffice.exe", "soffice.com"]
    : ["soffice"];

  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) {
      continue;
    }

    for (const executableName of executableNames) {
      const candidate = join(directory, executableName);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Continue searching PATH.
      }
    }
  }

  return undefined;
}

interface SofficeResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
  timedOut: boolean;
}

function runSoffice(sofficePath: string, args: string[]): Promise<SofficeResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(sofficePath, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, SOFFICE_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        code,
        signal,
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdout: Buffer.concat(stdout).toString("utf8"),
        timedOut,
      });
    });
  });
}

function formatSofficeResult(result: SofficeResult): string {
  return [
    `exit=${String(result.code)}`,
    `signal=${String(result.signal)}`,
    `timedOut=${String(result.timedOut)}`,
    `stdout=${result.stdout.trim()}`,
    `stderr=${result.stderr.trim()}`,
  ].join("\n");
}

async function createInvocationDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "runstamp-calc-roundtrip-"));
  temporaryDirectories.push(directory);
  await mkdir(join(directory, "profile"));
  return directory;
}

async function convert(
  sofficePath: string,
  directory: string,
  inputPath: string,
  format: "csv" | "ods",
): Promise<SofficeResult> {
  const profileUrl = pathToFileURL(join(directory, "profile")).href;
  return runSoffice(sofficePath, [
    `-env:UserInstallation=${profileUrl}`,
    "--headless",
    "--convert-to",
    format,
    "--outdir",
    directory,
    inputPath,
  ]);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { force: true, recursive: true })
  )));
});

const sofficePath = await resolveSofficePath();
const suiteName = sofficePath
  ? "LibreOffice Calc round-trip"
  : "LibreOffice Calc round-trip (skipped: soffice unavailable on PATH)";

describe.skipIf(!sofficePath).sequential(suiteName, () => {
  it("opens the representative workbook and converts its first sheet to CSV", async () => {
    const directory = await createInvocationDirectory();
    const inputPath = join(directory, "representative.xlsx");
    const outputPath = join(directory, "representative.csv");
    await writeFile(inputPath, await SpreadsheetEngine.render(createRepresentativeWorkbook()));

    const result = await convert(sofficePath!, directory, inputPath, "csv");

    expect(result.timedOut, formatSofficeResult(result)).toBe(false);
    expect(result.code, formatSofficeResult(result)).toBe(0);
    const outputStats = await stat(outputPath);
    expect(outputStats.size).toBeGreaterThan(0);
    expect(await readFile(outputPath, "utf8")).toContain(CALC_ROUND_TRIP_SENTINEL);
  }, 70_000);

  it("opens the multi-sheet workbook and converts it to a non-trivial ODS file", async () => {
    const directory = await createInvocationDirectory();
    const inputPath = join(directory, "representative.xlsx");
    const outputPath = join(directory, "representative.ods");
    await writeFile(inputPath, await SpreadsheetEngine.render(createRepresentativeWorkbook()));

    const result = await convert(sofficePath!, directory, inputPath, "ods");

    expect(result.timedOut, formatSofficeResult(result)).toBe(false);
    expect(result.code, formatSofficeResult(result)).toBe(0);
    expect((await stat(outputPath)).size).toBeGreaterThan(1_000);
  }, 70_000);

  it("rejects a truncated workbook with corrupted ZIP magic bytes", async () => {
    const directory = await createInvocationDirectory();
    const inputPath = join(directory, "corrupted.xlsx");
    const outputPath = join(directory, "corrupted.csv");
    const valid = await SpreadsheetEngine.render(createRepresentativeWorkbook());
    const corrupted = Buffer.from(valid.subarray(0, Math.floor(valid.length * 0.6)));
    for (let index = 0; index < 4; index += 1) {
      corrupted[index] = corrupted[index]! ^ 0xFF;
    }
    await writeFile(inputPath, corrupted);

    const result = await convert(sofficePath!, directory, inputPath, "csv");
    let outputSize = 0;
    try {
      outputSize = (await stat(outputPath)).size;
    } catch {
      // A missing output file is the expected rejection behavior.
    }

    expect(result.timedOut, formatSofficeResult(result)).toBe(false);
    expect(
      result.code !== 0 || outputSize === 0,
      `Corrupted input unexpectedly converted successfully.\n${formatSofficeResult(result)}`,
    ).toBe(true);
  }, 70_000);
});
