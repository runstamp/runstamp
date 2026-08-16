import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';

const ORACLE_NAME = 'microsoft-word-macos';
const RESULT_SEPARATOR = '|runstamp|';
const LINK_UPDATE_PROMPT = 'contains fields that may refer to other files';

function shellResult(command, args, { timeoutMs = 15_000 } = {}) {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() => rejectResult(new Error(`${command} timed out after ${timeoutMs}ms`)));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', (error) => finish(() => rejectResult(error)));
    child.once('close', (code, signal) => finish(() => {
      const output = Buffer.concat(stdout).toString('utf8').trim();
      const diagnostic = Buffer.concat(stderr).toString('utf8').trim();
      if (code === 0) {
        resolveResult({ stdout: output, stderr: diagnostic });
      } else {
        rejectResult(new Error(`${command} exited ${signal ? `with signal ${signal}` : `with code ${code}`}${diagnostic ? `: ${diagnostic}` : ''}`));
      }
    }));
  });
}

async function digestFile(filePath) {
  const bytes = await readFile(filePath);
  return {
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

async function assertOutputAbsent(filePath, label) {
  try {
    await stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`${label} already exists; Word oracle outputs must use a fresh path: ${filePath}`);
}

export async function cleanupWordOracleWorkspace({ workingRoot, workingCopy }) {
  const resolvedRoot = resolve(workingRoot);
  const resolvedCopy = resolve(workingCopy);
  if (!basename(resolvedRoot).startsWith('.runstamp-word-oracle-')) {
    throw new Error(`Refusing to remove non-oracle working directory: ${resolvedRoot}`);
  }
  if (dirname(resolvedCopy) !== resolvedRoot || !/^runstamp-oracle-[0-9a-f-]+\.docx$/u.test(basename(resolvedCopy))) {
    throw new Error(`Refusing to remove non-oracle working copy: ${resolvedCopy}`);
  }
  await rm(resolvedRoot, { recursive: true, force: true });
}

async function wordVersion() {
  const result = await shellResult('osascript', ['-e', 'tell application "Microsoft Word" to get version']);
  if (!result.stdout) throw new Error('Microsoft Word returned an empty version');
  return result.stdout;
}

async function normalizeWordPdf(inputPath, outputPath) {
  const versionResult = await shellResult('qpdf', ['--version']);
  const version = versionResult.stdout.split('\n')[0]?.trim();
  if (!version) throw new Error('qpdf returned an empty version');
  await shellResult('qpdf', [
    '--warning-exit-0',
    '--deterministic-id',
    inputPath,
    outputPath,
  ]);
  // Word occasionally emits zero-offset xref entries. qpdf reconstructs those
  // without changing page content; the strict follow-up check keeps the scored
  // PDF fail-closed if normalization did not produce a valid file.
  await shellResult('qpdf', ['--check', outputPath]);
  return version;
}

async function grantAccessWindowCount() {
  try {
    const result = await shellResult('osascript', [
      '-e', 'tell application "System Events"',
      '-e', 'if not (exists process "Microsoft Word") then return 0',
      '-e', 'tell process "Microsoft Word" to return count of windows whose name is "Grant File Access"',
      '-e', 'end tell',
    ], { timeoutMs: 5_000 });
    return Number.parseInt(result.stdout, 10) || 0;
  } catch {
    return 0;
  }
}

async function cancelNewGrantAccessWindows(previousCount) {
  const currentCount = await grantAccessWindowCount();
  if (currentCount <= previousCount) return;
  try {
    await shellResult('osascript', [
      '-e', 'on run argv',
      '-e', 'set keepCount to (item 1 of argv) as integer',
      '-e', 'tell application "System Events" to tell process "Microsoft Word"',
      '-e', 'repeat while (count of windows whose name is "Grant File Access") > keepCount',
      '-e', 'set promptWindow to first window whose name is "Grant File Access"',
      '-e', 'click button "Cancel" of promptWindow',
      '-e', 'delay 0.1',
      '-e', 'end repeat',
      '-e', 'end tell',
      '-e', 'end run',
      String(previousCount),
    ], { timeoutMs: 5_000 });
  } catch {
    // The caller still receives the primary oracle error. UI cleanup is best effort.
  }
}

async function closeOracleCopy(copyName) {
  try {
    await shellResult('osascript', [
      '-e', 'on run argv',
      '-e', 'set targetName to item 1 of argv',
      '-e', 'tell application "Microsoft Word"',
      '-e', 'if exists document targetName then close document targetName saving no',
      '-e', 'end tell',
      '-e', 'end run',
      copyName,
    ], { timeoutMs: 5_000 });
  } catch {
    // Never quit or kill Word: only the uniquely named oracle copy is eligible.
  }
}

export function buildLinkPromptAppleScript() {
  return `on run argv
  set shouldDismiss to item 1 of argv is "dismiss"
  tell application "System Events"
    if not (exists process "Microsoft Word") then return "none"
    tell process "Microsoft Word"
      repeat with windowRef in windows
        set promptText to ""
        try
          set promptText to (value of every static text of windowRef) as text
        end try
        if promptText contains "${LINK_UPDATE_PROMPT}" then
          if shouldDismiss then
            if not (exists button "No" of windowRef) then return "missing-no-button"
            click button "No" of windowRef
          end if
          return "link-update-prompt"
        end if
      end repeat
    end tell
  end tell
  return "none"
end run
`;
}

async function linkPromptState(action) {
  const result = await shellResult('osascript', ['-e', buildLinkPromptAppleScript(), action], { timeoutMs: 5_000 });
  return result.stdout;
}

async function openOracleCopy(copyPath, copyName, timeoutMs) {
  if (await linkPromptState('detect') !== 'none') {
    throw new Error('Microsoft Word already has an external-field link prompt open; refusing to interfere with the existing session');
  }
  // Word can indefinitely queue LaunchServices open events while it is hidden on
  // the start screen. Activating it here makes the open deterministic; the
  // uniquely named working copy is still the only document we ever close.
  await shellResult('open', ['-a', 'Microsoft Word', copyPath], { timeoutMs: 15_000 });
  const deadline = Date.now() + timeoutMs;
  let declinedLinkUpdate = false;
  while (Date.now() < deadline) {
    const promptState = await linkPromptState('dismiss');
    if (promptState === 'missing-no-button') {
      throw new Error('Microsoft Word external-field link prompt did not expose a safe No action');
    }
    if (promptState === 'link-update-prompt') declinedLinkUpdate = true;
    const result = await shellResult('osascript', [
      '-e', 'on run argv',
      '-e', 'set targetName to item 1 of argv',
      '-e', 'tell application "Microsoft Word"',
      '-e', 'if exists document targetName then return "open"',
      '-e', 'return "pending"',
      '-e', 'end tell',
      '-e', 'end run',
      copyName,
    ], { timeoutMs: 5_000 });
    if (result.stdout === 'open') return { declinedLinkUpdate };
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Microsoft Word did not open the oracle copy within ${timeoutMs}ms`);
}

export function buildWordOracleAppleScript() {
  return `on run argv
  set outputPath to item 1 of argv
  set expectedName to item 2 of argv
  set docRef to missing value
  set previousAlerts to missing value
  try
    tell application "Microsoft Word"
      if not (exists document expectedName) then error "Word oracle copy is not open"
      set docRef to document expectedName
      set previousAlerts to display alerts
      set display alerts to alerts none
      set fieldRefs to every field of text object of docRef
      if fieldRefs is missing value then set fieldRefs to {}
      set fieldCount to length of fieldRefs
      repeat with fieldRef in fieldRefs
        update field (contents of fieldRef)
      end repeat
      set tocRefs to every table of contents of docRef
      if tocRefs is missing value then set tocRefs to {}
      set tocCount to length of tocRefs
      repeat with tocRef in tocRefs
        update (contents of tocRef)
        update page numbers (contents of tocRef)
      end repeat
      set indexRefs to every index of docRef
      if indexRefs is missing value then set indexRefs to {}
      set indexCount to length of indexRefs
      repeat with indexRef in indexRefs
        update (contents of indexRef)
      end repeat
      save as docRef file name outputPath file format format PDF add to recent files false
      set wordVersion to version as string
      set display alerts to previousAlerts
      close docRef saving no
      set docRef to missing value
    end tell
    return wordVersion & "${RESULT_SEPARATOR}" & fieldCount & "${RESULT_SEPARATOR}" & tocCount & "${RESULT_SEPARATOR}" & indexCount
  on error errorMessage number errorNumber
    if previousAlerts is not missing value then
      try
        tell application "Microsoft Word" to set display alerts to previousAlerts
      end try
    end if
    if docRef is not missing value then
      try
        tell application "Microsoft Word" to close docRef saving no
      end try
    end if
    error errorMessage number errorNumber
  end try
end run
`;
}

export function parseWordOracleResult(stdout) {
  const [version = '', fields = '', tablesOfContents = '', indexes = '', ...extra] = stdout.trim().split(RESULT_SEPARATOR);
  const counts = [fields, tablesOfContents, indexes].map((value) => Number.parseInt(value, 10));
  if (!version || extra.length > 0 || counts.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error(`Microsoft Word returned malformed oracle output: ${stdout}`);
  }
  return {
    wordVersion: version,
    refreshed: {
      mainStoryFields: counts[0],
      tablesOfContents: counts[1],
      indexes: counts[2],
    },
  };
}

export function buildWordOracleEvidence({
  source,
  outputPdf,
  result,
  declinedLinkUpdate = false,
  qpdfVersion = null,
}) {
  return {
    schemaVersion: 1,
    oracle: ORACLE_NAME,
    platform: 'darwin',
    wordVersion: result.wordVersion,
    source,
    outputPdf,
    pdfNormalization: {
      tool: 'qpdf',
      version: qpdfVersion,
      deterministicId: true,
      strictCheckPassed: true,
    },
    refresh: {
      mainStoryFields: true,
      tablesOfContents: true,
      indexes: true,
      counts: result.refreshed,
    },
    externalFieldLinksAtOpen: declinedLinkUpdate ? 'declined' : 'not-prompted',
    sourceHandling: {
      openedWorkingCopy: true,
      openedViaLaunchServices: true,
      sourceUnchanged: true,
      savedWorkingCopy: false,
    },
  };
}

export async function exportDocxWithWord({
  inputPath,
  outputPdfPath,
  evidencePath,
  timeoutMs = 120_000,
}) {
  if (process.platform !== 'darwin') throw new Error('Microsoft Word oracle requires macOS');
  const sourcePath = resolve(inputPath);
  const pdfPath = resolve(outputPdfPath);
  if (extname(sourcePath).toLowerCase() !== '.docx') throw new Error('Word oracle input must be a .docx file');
  if (extname(pdfPath).toLowerCase() !== '.pdf') throw new Error('Word oracle output must be a .pdf file');
  const sourceInfo = await stat(sourcePath);
  if (!sourceInfo.isFile()) throw new Error(`Word oracle input is not a file: ${sourcePath}`);
  await mkdir(dirname(pdfPath), { recursive: true });
  await assertOutputAbsent(pdfPath, 'PDF output');
  if (evidencePath) await assertOutputAbsent(resolve(evidencePath), 'Evidence output');

  const initialSource = await digestFile(sourcePath);
  const detectedVersion = await wordVersion();
  const grantWindowsBefore = await grantAccessWindowCount();
  if (grantWindowsBefore > 0) {
    throw new Error('Microsoft Word already has a Grant File Access prompt open; refusing to interfere with the existing session');
  }

  const wordContainerRoot = join(
    homedir(),
    'Library',
    'Containers',
    'com.microsoft.Word',
    'Data',
    'Documents',
    'PaperJSXOracle',
  );
  await mkdir(wordContainerRoot, { recursive: true });
  const workingRoot = await mkdtemp(join(wordContainerRoot, '.runstamp-word-oracle-'));
  const copyName = `runstamp-oracle-${randomUUID()}.docx`;
  const workingCopy = join(workingRoot, copyName);
  const wordPdfPath = join(workingRoot, 'word-output.pdf');
  const normalizedWordPdfPath = join(workingRoot, 'word-output.normalized.pdf');
  const scriptPath = join(workingRoot, 'word-oracle.applescript');
  await copyFile(sourcePath, workingCopy);
  await writeFile(scriptPath, buildWordOracleAppleScript(), 'utf8');

  let parsed;
  let declinedLinkUpdate = false;
  let evidence;
  try {
    ({ declinedLinkUpdate } = await openOracleCopy(workingCopy, copyName, Math.min(timeoutMs, 30_000)));
    const result = await shellResult('osascript', [scriptPath, wordPdfPath, copyName], { timeoutMs });
    parsed = parseWordOracleResult(result.stdout);
    if (parsed.wordVersion !== detectedVersion) {
      throw new Error(`Microsoft Word version changed during oracle run (${detectedVersion} -> ${parsed.wordVersion})`);
    }
    const finalSource = await digestFile(sourcePath);
    if (finalSource.sha256 !== initialSource.sha256 || finalSource.byteLength !== initialSource.byteLength) {
      throw new Error('Microsoft Word oracle source-safety check failed: input DOCX changed');
    }
    const qpdfVersion = await normalizeWordPdf(wordPdfPath, normalizedWordPdfPath);
    await copyFile(normalizedWordPdfPath, pdfPath);
    const outputPdf = await digestFile(pdfPath);
    evidence = buildWordOracleEvidence({
      source: initialSource,
      outputPdf,
      result: parsed,
      declinedLinkUpdate,
      qpdfVersion,
    });
    if (evidencePath) {
      await mkdir(dirname(resolve(evidencePath)), { recursive: true });
      await writeFile(resolve(evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    }
  } catch (error) {
    await cancelNewGrantAccessWindows(grantWindowsBefore);
    await closeOracleCopy(copyName);
    await rm(pdfPath, { force: true });
    if (evidencePath) await rm(resolve(evidencePath), { force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Microsoft Word oracle failed without altering the source DOCX: ${message}`);
  } finally {
    await cleanupWordOracleWorkspace({ workingRoot, workingCopy });
  }

  return { pdfPath, evidence };
}
