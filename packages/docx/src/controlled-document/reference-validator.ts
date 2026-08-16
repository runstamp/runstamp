import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { ValidatorResult } from "@runstamp/protocol";
import { inspectControlledDocx } from "./index.js";
import { validateDocxBuffer } from "../core/ooxml-output-validator.js";

const execFile = promisify(execFileCallback);

export type DocxReferenceApplication = "word" | "libreoffice";

export interface DocxReferenceValidationResult {
  application: DocxReferenceApplication;
  detectedVersion: string | null;
  openedWithoutRepair: boolean;
  validator: ValidatorResult;
}

async function commandVersion(application: DocxReferenceApplication, executable?: string): Promise<string | null> {
  try {
    if (application === "word") {
      const result = await execFile("osascript", ["-e", 'tell application "Microsoft Word" to get version'], { timeout: 10_000 });
      return result.stdout.trim() || null;
    }
    const result = await execFile(executable ?? "soffice", ["--version"], { timeout: 10_000 });
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}

function blocked(application: DocxReferenceApplication, command: string): DocxReferenceValidationResult {
  return {
    application,
    detectedVersion: null,
    openedWithoutRepair: false,
    validator: {
      validator: application === "word" ? "Microsoft Word" : "LibreOffice Writer",
      version: "unavailable",
      required: application === "word",
      status: "BLOCKED_EXTERNAL",
      command,
      issues: [{ code: "DOCX_REFERENCE_APP_UNAVAILABLE", message: `${application} is unavailable in this environment.`, severity: "error" }],
    },
  };
}

/**
 * Opens a safe DOCX in a real reference application. Macro, ActiveX, and OLE-bearing packages are
 * rejected before launch so the adapter never asks Office to execute untrusted embedded content.
 */
export async function validateDocxWithReferenceApplication(
  bytes: Uint8Array,
  options: { application: DocxReferenceApplication; executable?: string; timeoutMs?: number },
): Promise<DocxReferenceValidationResult> {
  const inspection = await inspectControlledDocx(bytes);
  if (inspection.executableParts.length > 0 || inspection.oleParts.length > 0) {
    return {
      application: options.application,
      detectedVersion: await commandVersion(options.application, options.executable),
      openedWithoutRepair: false,
      validator: {
        validator: options.application === "word" ? "Microsoft Word" : "LibreOffice Writer",
        version: "safety-refusal-v1",
        required: options.application === "word",
        status: "FAIL",
        command: "validateDocxWithReferenceApplication",
        issues: [{ code: "DOCX_REFERENCE_UNSAFE_INPUT", message: "Reference-application launch refused because executable or OLE parts are present.", severity: "error" }],
      },
    };
  }

  const timeout = options.timeoutMs ?? 30_000;
  const version = await commandVersion(options.application, options.executable);
  const command = options.application === "word"
    ? "chmod 0400 <docx>; open -a 'Microsoft Word' <docx>; osascript <open/close-without-save probe>"
    : `${options.executable ?? "soffice"} --headless --convert-to docx`;
  if (!version) return blocked(options.application, command);

  const root = await mkdtemp(join(tmpdir(), "runstamp-a01-reference-"));
  try {
    const inputDir = join(root, "input");
    const outputDir = join(root, "output");
    await mkdir(inputDir);
    await mkdir(outputDir);
    const inputPath = join(inputDir, "controlled.docx");
    await writeFile(inputPath, bytes);
    await chmod(inputPath, 0o400);
    if (options.application === "word") {
      // LaunchServices grants the sandboxed Office application access to this exact file. Direct
      // AppleScript `open file name` calls trigger Word's "Grant File Access" UI and are therefore
      // neither headless nor a reliable compatibility result.
      await execFile("open", ["-a", "Microsoft Word", inputPath], { timeout });
      const script = [
        "repeat 60 times",
        'tell application "Microsoft Word"',
        'if exists document "controlled.docx" then',
        'set docRef to document "controlled.docx"',
        "close docRef saving no",
        'return "controlled.docx"',
        "end if",
        "end tell",
        "delay 0.5",
        "end repeat",
        'error "Microsoft Word did not expose controlled.docx after LaunchServices open."',
      ].join("\n");
      await execFile("osascript", ["-e", script], { timeout });
    } else {
      await execFile(options.executable ?? "soffice", ["--headless", "--convert-to", "docx", "--outdir", outputDir, inputPath], { timeout });
      const converted = await readFile(join(outputDir, "controlled.docx"));
      const structural = await validateDocxBuffer(converted);
      if (!structural.ok) throw new Error(`LibreOffice output failed structural validation: ${structural.issues.map(({ code }) => code).join(", ")}`);
    }
    return {
      application: options.application,
      detectedVersion: version,
      openedWithoutRepair: true,
      validator: {
        validator: options.application === "word" ? "Microsoft Word" : "LibreOffice Writer",
        version,
        required: options.application === "word",
        status: "PASS",
        command,
        issues: [],
      },
    };
  } catch (error) {
    const processError = error as Error & { stderr?: string; stdout?: string; code?: string | number };
    const processDetails = [processError.message, processError.stderr?.trim(), processError.stdout?.trim()]
      .filter((value): value is string => Boolean(value))
      .join(" | ");
    return {
      application: options.application,
      detectedVersion: version,
      openedWithoutRepair: false,
      validator: {
        validator: options.application === "word" ? "Microsoft Word" : "LibreOffice Writer",
        version,
        required: options.application === "word",
        status: "FAIL",
        command,
        issues: [{ code: "DOCX_REFERENCE_OPEN_FAILED", message: processDetails || String(error), severity: "error" }],
      },
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
