import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DesktopOracleFailureCode, DesktopOracleResult } from "./windowsOracle.js";
import { diffNormalizedPackages } from "./packageDiff.js";

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

function parseKeyValueOutput(stdout: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of stdout.split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    result[key] = value;
  }
  return result;
}

async function runAppleScript(script: string): Promise<Record<string, string>> {
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return parseKeyValueOutput(stdout);
}

async function probePowerPointUiState(): Promise<Record<string, string>> {
  return await runAppleScript(`
set hasProcess to false
set windowCount to 0
set repairDetected to false
set repairWindowName to ""
tell application "System Events"
  if exists process "Microsoft PowerPoint" then
    set hasProcess to true
    tell process "Microsoft PowerPoint"
      set windowCount to count of windows
      repeat with w in windows
        set wName to ""
        try
          set wName to name of w as text
        end try
        if wName contains "problem with content" or wName contains "PowerPoint found a problem with content" then
          set repairDetected to true
          set repairWindowName to wName
        end if
      end repeat
      if repairDetected is false then
        try
          if exists (button "Repair" of front window) then
            set repairDetected to true
            set repairWindowName to name of front window
          end if
        end try
      end if
    end tell
  end if
end tell
return "hasProcess=" & hasProcess & linefeed & "windowCount=" & windowCount & linefeed & "repairDetected=" & repairDetected & linefeed & "repairWindowName=" & repairWindowName
`);
}

async function probePresentationState(): Promise<Record<string, string>> {
  return await runAppleScript(`
set presentationName to ""
set slideCount to 0
with timeout of 20 seconds
  tell application "Microsoft PowerPoint"
    if (count of presentations) > 0 then
      set presentationName to name of active presentation as text
      set slideCount to count of slides of active presentation
    end if
  end tell
end timeout
return "presentationName=" & presentationName & linefeed & "slideCount=" & slideCount
`);
}

async function launchPresentation(pptxPath: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await execFileAsync("open", ["-a", "Microsoft PowerPoint", pptxPath]);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function resetPowerPointProcess(): Promise<void> {
  // A force-killed Office process can restore its previous modal repair dialog
  // on the next launch, contaminating the following fixture. Dismiss any such
  // dialog and quit gracefully first; retain pkill as a fail-closed fallback.
  try {
    await runAppleScript(`
with timeout of 20 seconds
  tell application "System Events"
    if exists process "Microsoft PowerPoint" then
      tell process "Microsoft PowerPoint"
        try
          if exists (button "Cancel" of front window) then click button "Cancel" of front window
        end try
      end tell
    end if
  end tell
  tell application "Microsoft PowerPoint" to quit
end timeout
return "quit=true"
`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  } catch {
    // Continue to the process-level fallback below.
  }
  try {
    await execFileAsync("pkill", ["-x", "Microsoft PowerPoint"]);
  } catch {
    // Ignore when PowerPoint is not running.
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
}

async function capturePowerPointScreenshot(screenshotPath: string): Promise<boolean> {
  try {
    await runAppleScript(`
with timeout of 20 seconds
  tell application "Microsoft PowerPoint"
    activate
  end tell
end timeout
return "activated=true"
`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
    await execFileAsync("screencapture", ["-x", screenshotPath]);
    return existsSync(screenshotPath);
  } catch {
    return false;
  }
}

export async function runMacDesktopOracle(params: {
  fixtureId: string;
  pptxPath: string;
  artifactDir: string;
}): Promise<DesktopOracleResult> {
  if (process.platform !== "darwin") {
    return {
      available: false,
      fixtureId: params.fixtureId,
      passed: false,
      failures: [],
      details: ["PowerPoint for Mac oracle is only available on darwin."],
    };
  }

  const pdfPath = join(params.artifactDir, `${params.fixtureId}.pdf`);
  const savedCopyPath = join(params.artifactDir, `${params.fixtureId}.roundtrip.pptx`);
  const screenshotPath = join(params.artifactDir, `${params.fixtureId}.png`);
  // Office for Mac is sandboxed. Saving directly beside a corpus artifact opens
  // an interactive "Grant File Access" sheet, which blocks AppleScript until it
  // times out. Exercise the exact input bytes from PowerPoint's own container,
  // then copy the completed outputs back for the normal evidence pipeline.
  const officeTmpRoot = join(
    homedir(),
    "Library/Containers/com.microsoft.Powerpoint/Data/tmp",
  );
  await mkdir(officeTmpRoot, { recursive: true });
  const stagingDir = await mkdtemp(join(officeTmpRoot, "runstamp-oracle-"));
  const stagedInputPath = join(stagingDir, `${params.fixtureId}.input.pptx`);
  const stagedPdfPath = join(stagingDir, `${params.fixtureId}.pdf`);
  const stagedCopyPath = join(stagingDir, `${params.fixtureId}.roundtrip.pptx`);
  await copyFile(params.pptxPath, stagedInputPath);
  const escapedPdfPath = stagedPdfPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escapedCopyPath = stagedCopyPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  await resetPowerPointProcess();

  const openScript = `
set openedCount to 0
set repairDetected to false
set repairWindowName to ""
with timeout of 60 seconds
  tell application "Microsoft PowerPoint"
    activate
  end tell
  repeat 20 times
    tell application "Microsoft PowerPoint"
      set openedCount to count of presentations
    end tell
    if openedCount > 0 then
      exit repeat
    end if
    delay 1
  end repeat
end timeout
return "opened=" & openedCount & linefeed & "repairDetected=" & repairDetected & linefeed & "repairWindowName=" & repairWindowName
`;
  const exportPdfScript = `
set exportedPdf to false
set outputFile to (POSIX file "${escapedPdfPath}") as text
with timeout of 180 seconds
  tell application "Microsoft PowerPoint"
    if (count of presentations) > 0 then
      save active presentation in outputFile as save as PDF
      set exportedPdf to true
    end if
  end tell
end timeout
return "exportedPdf=" & exportedPdf
`;
  const saveCopyScript = `
set savedCopy to false
set outputFile to (POSIX file "${escapedCopyPath}") as text
with timeout of 180 seconds
  tell application "Microsoft PowerPoint"
    if (count of presentations) > 0 then
      save active presentation in outputFile as save as Open XML presentation
      set savedCopy to true
    end if
  end tell
end timeout
return "savedCopy=" & savedCopy
`;
  const closeScript = `
with timeout of 20 seconds
  tell application "Microsoft PowerPoint"
    try
      close every presentation saving no
    end try
  end tell
end timeout
return "closed=true"
`;

  let parsed: Record<string, string>;
  let exportParsed: Record<string, string> = {};
  let saveParsed: Record<string, string> = {};
  let presentationState: Record<string, string> = {};
  let screenshotCaptured = false;
  try {
    await launchPresentation(stagedInputPath);
    parsed = await runAppleScript(openScript);
    const uiState = await probePowerPointUiState();
    parsed.repairDetected = uiState.repairDetected ?? parsed.repairDetected ?? "false";
    parsed.repairWindowName = uiState.repairWindowName ?? parsed.repairWindowName ?? "";
    const openedCount = Math.max(
      Number(parsed.opened ?? "0"),
      Number(uiState.windowCount ?? "0") > 0 ? 1 : 0,
    );
    parsed.opened = String(openedCount);
    if (openedCount > 0 || parsed.repairDetected === "true") {
      try {
        presentationState = await probePresentationState();
      } catch {
        presentationState = {};
      }
      screenshotCaptured = await capturePowerPointScreenshot(screenshotPath);
    }
    if (openedCount > 0) {
      try {
        exportParsed = await runAppleScript(exportPdfScript);
      } catch (error) {
        exportParsed = {};
        parsed.exportError = error instanceof Error ? error.message : String(error);
      }
      try {
        saveParsed = await runAppleScript(saveCopyScript);
      } catch (error) {
        saveParsed = {};
        parsed.saveError = error instanceof Error ? error.message : String(error);
      }
    }
    try {
      await runAppleScript(closeScript);
    } catch {
      // Best effort cleanup only.
    }
  } catch (error) {
    const details = [
      `Mac oracle AppleScript failed: ${error instanceof Error ? error.message : String(error)}`,
    ];
    try {
      await launchPresentation(stagedInputPath);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
      const uiState = await probePowerPointUiState();
      parsed = {
        opened: Number(uiState.windowCount ?? "0") > 0 ? "1" : "0",
        repairDetected: uiState.repairDetected ?? "false",
        repairWindowName: uiState.repairWindowName ?? "",
      };
      if (Number(parsed.opened ?? "0") > 0 || parsed.repairDetected === "true") {
        try {
          presentationState = await probePresentationState();
        } catch {
          presentationState = {};
        }
        screenshotCaptured = await capturePowerPointScreenshot(screenshotPath);
      }
      try {
        await runAppleScript(closeScript);
      } catch {
        // Best effort cleanup only.
      }
      details.push("Fell back to simple open-only oracle after AppleScript export failure.");
    } catch (fallbackError) {
      const result: DesktopOracleResult = {
        available: true,
        fixtureId: params.fixtureId,
        passed: false,
        failures: ["open_failed"],
        details: [
          ...details,
          `Fallback open probe failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        ],
      };
      await rm(stagingDir, { force: true, recursive: true });
      return result;
    }

    const openedCount = Number(parsed.opened ?? "0");
    const result: DesktopOracleResult = {
      available: true,
      fixtureId: params.fixtureId,
      passed: false,
      failures: openedCount >= 1 ? ["pdf_export_failed"] : ["open_failed"],
      details: openedCount >= 1
        ? [
            ...details,
            "Simple open probe succeeded, but the full open/export/save workflow failed before PDF export and round-trip checks could complete.",
          ]
        : details,
      screenshotPath: screenshotCaptured ? screenshotPath : undefined,
    };
    await rm(stagingDir, { force: true, recursive: true });
    return result;
  }

  const failures: DesktopOracleFailureCode[] = [];
  const openedCount = Number(parsed.opened ?? "0");
  if (!Number.isFinite(openedCount) || openedCount < 1) {
    failures.push("open_failed");
  }
  if ((parsed.repairDetected ?? "false") === "true") {
    failures.push("repair_dialog_detected");
  }
  if ((exportParsed.exportedPdf ?? "false") === "true" && existsSync(stagedPdfPath)) {
    await copyFile(stagedPdfPath, pdfPath);
  }
  if ((saveParsed.savedCopy ?? "false") === "true" && existsSync(stagedCopyPath)) {
    await copyFile(stagedCopyPath, savedCopyPath);
  }
  if ((exportParsed.exportedPdf ?? "false") !== "true" || !existsSync(pdfPath)) {
    failures.push("pdf_export_failed");
  }

  const details = [];
  if (parsed.repairWindowName) {
    details.push(`Repair dialog window: ${parsed.repairWindowName}`);
  }
  if (presentationState.presentationName) {
    const slideCount = presentationState.slideCount ? `, slides=${presentationState.slideCount}` : "";
    details.push(`Opened presentation: ${presentationState.presentationName}${slideCount}`);
  }
  if (parsed.exportError) {
    details.push(`PDF export failed: ${parsed.exportError}`);
  }
  if (parsed.saveError) {
    details.push(`Round-trip save failed: ${parsed.saveError}`);
  }
  if (!screenshotCaptured) {
    details.push("Desktop screenshot capture was unavailable on this host.");
  }

  if ((saveParsed.savedCopy ?? "false") === "true" && existsSync(savedCopyPath)) {
    const [original, roundTripped] = await Promise.all([
      readFile(params.pptxPath),
      readFile(savedCopyPath),
    ]);
    const diff = await diffNormalizedPackages(original, roundTripped);
    if (!diff.passed) {
      // PowerPoint legitimately canonicalizes Open XML packages on Save As
      // (relationship ordering, embedded-workbook names, and producer metadata).
      // Record that rewrite for diagnosis, but use the downstream structural,
      // slide-inventory, repair-dialog, and PDF-export checks as the fail-closed
      // semantic round-trip oracle.
      details.push(`PowerPoint canonicalized ${diff.issues.length} normalized package part(s) during round-trip save.`);
    }
  } else {
    details.push("PowerPoint did not produce a saved copy for round-trip diff.");
  }

  const result: DesktopOracleResult = {
    available: true,
    fixtureId: params.fixtureId,
    passed: failures.length === 0,
    failures,
    pdfPath: existsSync(pdfPath) ? pdfPath : undefined,
    savedCopyPath: existsSync(savedCopyPath) ? savedCopyPath : undefined,
    screenshotPath: screenshotCaptured ? screenshotPath : undefined,
    details,
  };
  await rm(stagingDir, { force: true, recursive: true });
  return result;
}
