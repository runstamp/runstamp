import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface OpenXmlSdkIssue {
  description: string;
  path?: string;
  part?: string;
}

export interface OpenXmlSdkReport {
  available: boolean;
  passed: boolean;
  issues: OpenXmlSdkIssue[];
  command?: string[];
}

const PROJECT_PATH = resolve(
  process.cwd(),
  "tools/OpenXmlSdkValidator/OpenXmlSdkValidator.csproj",
);

function execFileAsync(
  file: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    execFile(file, args, { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

export async function validateWithOpenXmlSdk(pptxPath: string): Promise<OpenXmlSdkReport> {
  if (!existsSync(PROJECT_PATH)) {
    return { available: false, passed: false, issues: [] };
  }

  try {
    const args = ["run", "--project", PROJECT_PATH, "--", pptxPath];
    const { stdout } = await execFileAsync("dotnet", args);
    const parsed = JSON.parse(stdout) as OpenXmlSdkReport;
    return { ...parsed, available: true, command: ["dotnet", ...args] };
  } catch {
    return { available: false, passed: false, issues: [] };
  }
}
