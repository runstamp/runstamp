import { execFile } from "node:child_process";
import { resolve } from "node:path";

export type DesktopOracleFailureCode =
  | "open_failed"
  | "repair_dialog_detected"
  | "silent_rewrite_detected"
  | "pdf_export_failed"
  | "visual_diff_failed"
  | "structural_invalid";

export interface DesktopOracleResult {
  available: boolean;
  fixtureId: string;
  passed: boolean;
  failures: DesktopOracleFailureCode[];
  pdfPath?: string;
  savedCopyPath?: string;
  screenshotPath?: string;
  details?: string[];
}

const ORACLE_SCRIPT_PATH = resolve(
  process.cwd(),
  "tools/powerpoint-oracle/Invoke-PowerPointOracle.ps1",
);

function execFileAsync(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

export async function runWindowsDesktopOracle(params: {
  fixtureId: string;
  pptxPath: string;
  artifactDir: string;
}): Promise<DesktopOracleResult> {
  if (process.platform !== "win32") {
    return {
      available: false,
      fixtureId: params.fixtureId,
      passed: false,
      failures: [],
      details: ["Windows PowerPoint desktop oracle is only available on win32."],
    };
  }

  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ORACLE_SCRIPT_PATH,
    "-FixtureId",
    params.fixtureId,
    "-InputPptx",
    params.pptxPath,
    "-ArtifactDir",
    params.artifactDir,
  ];

  const { stdout } = await execFileAsync("powershell.exe", args);
  return JSON.parse(stdout) as DesktopOracleResult;
}
