import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  formatXlsxChaosLabReport,
  runXlsxChaosLab,
  type XlsxChaosLabReport,
  type XlsxChaosScenarioResult,
} from "../src/chaos-lab/index.js";
import {
  formatRigorousBenchmarkReport,
  runRigorousBenchmarkSuite,
  type XlsxRigorousBenchmarkReport,
  type XlsxRigorousBenchmarkResult,
} from "../src/benchmarks/rigorous.js";
import {
  TEST_LICENSE_KEY as TEST_XLSX_LICENSE_KEY,
  TEST_PUBLIC_KEY_PEM,
} from "../../../scripts/test-license-fixture.mjs";
import { getPhase1Fixture } from "../src/fixtures/phase1.js";
import { createRepairableCorruptionBuffer } from "../src/diagnostics/corruption.js";
import { createTemplateBenchmarkDocument } from "../src/diagnostics/workloads.js";

const execFileAsync = promisify(execFile);

type Severity = "high" | "medium" | "low";
type Status = "pass" | "fail";

interface CommandSummary {
  exitCode: number;
  durationMs: number;
  name: string;
  parsedSummary: string;
  status: Status;
  stderr: string;
  stdout: string;
  command: string;
}

interface ProSmokeCheck {
  durationMs: number;
  name: string;
  notes?: string;
  observed: string;
  status: Status;
}

interface AuditIssue {
  severity: Severity;
  source: string;
  tier: "free" | "pro" | "shared";
  title: string;
  expected: string;
  observed: string;
  reproCommand: string;
  likelyRootCause: string;
}

interface EnterpriseAudit {
  generatedAt: string;
  gitSha?: string;
  commands: {
    fixtureValidation: CommandSummary;
    proBuild: CommandSummary;
    vitest: CommandSummary;
  };
  proSmokes: ProSmokeCheck[];
  surfaces: {
    free: {
      chaos: XlsxChaosLabReport;
      rigorous: XlsxRigorousBenchmarkReport;
    };
    pro: {
      chaos: XlsxChaosLabReport;
      rigorous: XlsxRigorousBenchmarkReport;
    };
  };
  issues: AuditIssue[];
  benchmarkTargetMismatchCandidates: AuditIssue[];
  blockedItems: AuditIssue[];
  artifacts: string[];
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, "..");
const workspaceDir = resolve(packageDir, "..", "..");
const chaosOutputDir = join(packageDir, "output", "chaos");
const benchmarkOutputDir = join(packageDir, "output", "benchmarks");
const legacyChaosJsonPath = join(chaosOutputDir, "xlsx-chaos-report.json");
const enterpriseJsonPath = join(chaosOutputDir, "xlsx-enterprise-chaos-audit.json");
const freeRigorousJsonPath = join(benchmarkOutputDir, "rigorous-report.free.json");
const proRigorousJsonPath = join(benchmarkOutputDir, "rigorous-report.pro.json");
const enterpriseMarkdownPath = resolve(packageDir, "..", "..", "docs", "runstamp-xlsx", "XLSX_ENTERPRISE_CHAOS_AUDIT.md");
const legacyChaosMarkdownPath = resolve(packageDir, "..", "..", "docs", "runstamp-xlsx", "XLSX_CHAOS_LAB_REPORT.md");

async function runCommand(
  name: string,
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<CommandSummary> {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: packageDir,
      env: env ?? process.env,
      maxBuffer: 1024 * 1024 * 32,
    });
    return {
      name,
      command: `${command} ${args.join(" ")}`.trim(),
      status: "pass",
      exitCode: 0,
      durationMs: Date.now() - started,
      stdout,
      stderr,
      parsedSummary: summarizeCommandOutput(name, stdout, stderr, 0),
    };
  } catch (error) {
    const exitCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "number"
      ? error.code
      : 1;
    const stdout = typeof error === "object" && error !== null && "stdout" in error && typeof error.stdout === "string"
      ? error.stdout
      : "";
    const stderr = typeof error === "object" && error !== null && "stderr" in error && typeof error.stderr === "string"
      ? error.stderr
      : String(error);
    return {
      name,
      command: `${command} ${args.join(" ")}`.trim(),
      status: "fail",
      exitCode,
      durationMs: Date.now() - started,
      stdout,
      stderr,
      parsedSummary: summarizeCommandOutput(name, stdout, stderr, exitCode),
    };
  }
}

function summarizeCommandOutput(name: string, stdout: string, stderr: string, exitCode: number): string {
  if (name === "vitest") {
    const testFiles = stdout.match(/Test Files\s+(\d+)\s+passed\s+\((\d+)\)/);
    const tests = stdout.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
    if (testFiles && tests) {
      return `${testFiles[1]} test files passed; ${tests[1]} tests passed`;
    }
  }

  if (name === "fixtureValidation") {
    const passed = stdout.split("\n").filter((line) => line.trim().endsWith(": passed")).length;
    const failed = stdout.split("\n").filter((line) => line.trim().endsWith(": failed")).length;
    return `${passed} fixtures passed; ${failed} fixtures failed`;
  }

  if (name === "proBuild") {
    if (stdout.includes("XLSX pro build complete")) {
      return "Pro bundle built successfully";
    }
  }

  return exitCode === 0
    ? "Command completed successfully"
    : `Command failed with exit code ${exitCode}: ${(stderr || stdout).trim().split("\n")[0] ?? "unknown error"}`;
}

async function getGitSha(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", workspaceDir, "rev-parse", "--short", "HEAD"]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function loadProSpreadsheetEngine() {
  const distPath = join(packageDir, "dist-pro", "index.js");
  return import(pathToFileURL(distPath).href);
}

async function runProSmokeChecks(proEngine: any): Promise<ProSmokeCheck[]> {
  const checks: Array<{
    name: string;
    run: () => Promise<{ observed: string; notes?: string }>;
  }> = [
    {
      name: "validate(buffer)",
      run: async () => {
        const buffer = await proEngine.SpreadsheetEngine.render(getPhase1Fixture("strings-unicode").document);
        const summary = await proEngine.SpreadsheetEngine.validate(buffer);
        return {
          observed: `verdict ${summary.verdict}; findings ${summary.findings.length}`,
        };
      },
    },
    {
      name: "preflight(...)",
      run: async () => {
        const report = proEngine.SpreadsheetEngine.preflight(getPhase1Fixture("large-100k").document, { largeDataset: true });
        return {
          observed: `mode ${report.recommendedRenderMode}; findings ${report.findings.map((finding: { code: string }) => finding.code).join(", ") || "none"}`,
        };
      },
    },
    {
      name: "repair(...)",
      run: async () => {
        const corrupt = await createRepairableCorruptionBuffer();
        const repaired = await proEngine.SpreadsheetEngine.repair(corrupt);
        return {
          observed: `actions ${repaired.actions.length}; findings ${repaired.findings.length}; risky=${repaired.riskyTransformations}`,
        };
      },
    },
    {
      name: "template parse/assemble",
      run: async () => {
        const templateBuffer = await proEngine.SpreadsheetEngine.render(createTemplateBenchmarkDocument());
        const index = await proEngine.SpreadsheetEngine.parseTemplate(templateBuffer);
        const assembled = await proEngine.SpreadsheetEngine.assembleFromTemplate(index, {
          namedRanges: { InvoiceHeader: "Smoke Test Corp" },
        });
        return {
          observed: `named ranges ${index.namedRanges.length}; assembled bytes ${assembled.length}`,
        };
      },
    },
  ];

  const results: ProSmokeCheck[] = [];
  for (const check of checks) {
    const started = Date.now();
    try {
      const outcome = await check.run();
      results.push({
        name: check.name,
        status: "pass",
        durationMs: Date.now() - started,
        observed: outcome.observed,
        notes: outcome.notes,
      });
    } catch (error) {
      results.push({
        name: check.name,
        status: "fail",
        durationMs: Date.now() - started,
        observed: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function inferRootCause(observed: string, title: string): string {
  if (observed.includes("Requires Excel, Google Sheets, Numbers, and LibreOffice")) {
    return "No desktop/app-oracle environment is attached to this machine, so real cross-application validation cannot run yet.";
  }
  if (observed.includes("requires @runstamp/xlsx-pro")) {
    return "A free-surface path is still invoking a Pro-gated API instead of marking it blocked.";
  }
  if (title.includes("cached values")) {
    return "Formula serialization succeeded, but cached-value evaluation is missing where Pro behavior is expected.";
  }
  return "See observed output for the immediate failure signature; this item needs direct triage from the scenario or benchmark owner.";
}

function createScenarioIssue(
  result: XlsxChaosScenarioResult,
  source: string,
): AuditIssue {
  const severity: Severity = result.status === "warn"
    ? (result.tier === "pro" ? "medium" : "low")
    : (result.tier === "pro" ? "high" : "medium");
  return {
    severity,
    source,
    tier: result.tier,
    title: `${result.id} ${result.name}`,
    expected: result.expected,
    observed: result.observed,
    reproCommand: "pnpm --filter @runstamp/xlsx chaos:run",
    likelyRootCause: inferRootCause(result.observed, result.name),
  };
}

function createBenchmarkIssue(
  result: XlsxRigorousBenchmarkResult,
  source: string,
): AuditIssue {
  const severity: Severity = result.status === "warn"
    ? (result.tier === "pro" ? "medium" : "low")
    : (result.tier === "pro" ? "high" : "medium");
  return {
    severity,
    source,
    tier: result.tier,
    title: `${result.id} ${result.name}`,
    expected: result.target,
    observed: result.observed,
    reproCommand: `pnpm --filter @runstamp/xlsx benchmark:rigorous -- --mode ${result.tier}`,
    likelyRootCause: inferRootCause(result.observed, result.name),
  };
}

function inferBenchmarkTargetMismatchRootCause(result: XlsxRigorousBenchmarkResult): string {
  if (result.id === "G5" && result.diagnostics?.keyPartBytes) {
    const keyPartBytes = result.diagnostics.keyPartBytes;
    const sheetZipBytes = keyPartBytes.sheet1XmlZipContributionBytes ?? keyPartBytes.sheet1XmlCompressedBytes ?? keyPartBytes.sheet1XmlBytes;
    const totalZipBytes = keyPartBytes.zipBytes;
    const gapBytes = Math.max(0, sheetZipBytes - 500 * 1024);
    const formatKb = (value: number) => `${(value / 1024).toFixed(1)} KB`;
    return `The default-path styled workbook is dominated by worksheet payload: sheet1.xml alone contributes about ${formatKb(sheetZipBytes)} to a ${formatKb(totalZipBytes)} ZIP, leaving the 500 KB target about ${formatKb(gapBytes)} below the measured worksheet floor without changing behavior.`;
  }

  return "This benchmark measures raw OOXML styles part size directly; the current target appears below the practical floor for the exercised style corpus, so this is better tracked as benchmark debt than as a hidden engine regression.";
}

function isBenchmarkTargetMismatchCandidate(result: XlsxRigorousBenchmarkResult): boolean {
  return (result.status === "fail" || result.status === "warn")
    && result.diagnostics?.classification === "benchmark-target-mismatch-candidate";
}

function createBlockedIssue(
  title: string,
  expected: string,
  observed: string,
  reproCommand: string,
  tier: "free" | "pro" | "shared",
  source: string,
  severity: Severity,
): AuditIssue {
  return {
    severity,
    source,
    tier,
    title,
    expected,
    observed,
    reproCommand,
    likelyRootCause: inferRootCause(observed, title),
  };
}

function collectIssues(
  audit: Omit<EnterpriseAudit, "issues" | "blockedItems" | "benchmarkTargetMismatchCandidates">,
): { issues: AuditIssue[]; blockedItems: AuditIssue[]; benchmarkTargetMismatchCandidates: AuditIssue[] } {
  const issues: AuditIssue[] = [];
  const benchmarkTargetMismatchCandidates: AuditIssue[] = [];
  const blockedItems: AuditIssue[] = [];

  for (const command of Object.values(audit.commands)) {
    if (command.status === "fail") {
      issues.push({
        severity: "high",
        source: "verification command",
        tier: "shared",
        title: command.name,
        expected: "Command completes successfully",
        observed: command.parsedSummary,
        reproCommand: command.command,
        likelyRootCause: "The verification command itself failed before the suite could be trusted.",
      });
    }
  }

  for (const smoke of audit.proSmokes) {
    if (smoke.status === "fail") {
      issues.push({
        severity: "high",
        source: "pro smoke",
        tier: "pro",
        title: smoke.name,
        expected: "Pro smoke check passes",
        observed: smoke.observed,
        reproCommand: "pnpm --filter @runstamp/xlsx chaos:run",
        likelyRootCause: "The licensed Pro surface failed a direct smoke check before the larger suites completed.",
      });
    }
  }

  const allChaosResults = [
    ...audit.surfaces.free.chaos.results.map((result) => ({ source: "free chaos", result })),
    ...audit.surfaces.pro.chaos.results.map((result) => ({ source: "pro chaos", result })),
  ];
  for (const entry of allChaosResults) {
    if (entry.result.status === "fail" || entry.result.status === "warn") {
      issues.push(createScenarioIssue(entry.result, entry.source));
      continue;
    }
    if (entry.result.status === "blocked") {
      const severity: Severity = entry.result.bucket === "shared" ? "high" : "low";
      blockedItems.push(createBlockedIssue(
        `${entry.result.id} ${entry.result.name}`,
        entry.result.expected,
        entry.result.observed,
        "pnpm --filter @runstamp/xlsx chaos:run",
        entry.result.bucket === "shared" ? "shared" : entry.result.tier,
        entry.source,
        severity,
      ));
    }
  }

  const allBenchmarkResults = [
    ...audit.surfaces.free.rigorous.results.map((result) => ({ source: "free rigorous", result })),
    ...audit.surfaces.pro.rigorous.results.map((result) => ({ source: "pro rigorous", result })),
  ];
  for (const entry of allBenchmarkResults) {
    if (isBenchmarkTargetMismatchCandidate(entry.result)) {
      benchmarkTargetMismatchCandidates.push({
        ...createBenchmarkIssue(entry.result, entry.source),
        severity: "medium",
        likelyRootCause: inferBenchmarkTargetMismatchRootCause(entry.result),
      });
      continue;
    }
    if (entry.result.status === "fail" || entry.result.status === "warn") {
      issues.push(createBenchmarkIssue(entry.result, entry.source));
      continue;
    }
    if (entry.result.status === "blocked") {
      const severity: Severity = entry.result.group === "X" ? "high" : "low";
      blockedItems.push(createBlockedIssue(
        `${entry.result.id} ${entry.result.name}`,
        entry.result.target,
        entry.result.observed,
        `pnpm --filter @runstamp/xlsx benchmark:rigorous -- --mode ${entry.result.tier}`,
        entry.result.group === "X" ? "shared" : entry.result.tier,
        entry.source,
        severity,
      ));
    }
  }

  return { issues, blockedItems, benchmarkTargetMismatchCandidates };
}

function renderStatusSummary(label: string, passed: number, warned: number, failed: number, blocked: number, total: number): string {
  return `- ${label}: ${passed} pass / ${warned} warn / ${failed} fail / ${blocked} blocked / ${total} total`;
}

function renderNonPassingChaos(results: XlsxChaosScenarioResult[]): string[] {
  const items = results.filter((result) => result.status !== "pass");
  if (items.length === 0) {
    return ["- No non-passing chaos scenarios"];
  }
  return items.map((result) => `- ${result.id} [${result.status.toUpperCase()}] (${result.bucket}) ${result.name}: ${result.observed}`);
}

function renderNonPassingBenchmarks(results: XlsxRigorousBenchmarkResult[]): string[] {
  const items = results.filter((result) => result.status !== "pass");
  if (items.length === 0) {
    return ["- No non-passing rigorous benchmarks"];
  }
  return items.map((result) => `- ${result.id} [${result.status.toUpperCase()}] (${result.bucket}) ${result.name}: ${result.observed}`);
}

function renderIssues(title: string, issues: AuditIssue[]): string[] {
  if (issues.length === 0) {
    return [`## ${title}`, "", "- None", ""];
  }

  const lines = [`## ${title}`, ""];
  for (const issue of issues) {
    lines.push(`- [${issue.severity.toUpperCase()}] (${issue.tier}) ${issue.title}`);
    lines.push(`  source: ${issue.source}`);
    lines.push(`  expected: ${issue.expected}`);
    lines.push(`  observed: ${issue.observed}`);
    lines.push(`  repro: ${issue.reproCommand}`);
    lines.push(`  root cause: ${issue.likelyRootCause}`);
  }
  lines.push("");
  return lines;
}

function buildEnterpriseMarkdown(audit: EnterpriseAudit): string {
  const highIssues = audit.issues.filter((issue) => issue.severity === "high");
  const mediumIssues = audit.issues.filter((issue) => issue.severity === "medium");
  const lowIssues = audit.issues.filter((issue) => issue.severity === "low");

  const lines: string[] = [
    "# XLSX Enterprise Chaos Audit",
    "",
    `Generated: ${audit.generatedAt}`,
    "",
    `Git SHA: ${audit.gitSha ?? "unknown"}`,
    "",
    "## Executive Summary",
    "",
    renderStatusSummary(
      "Vitest",
      audit.commands.vitest.status === "pass" ? 1 : 0,
      0,
      audit.commands.vitest.status === "fail" ? 1 : 0,
      0,
      1,
    ),
    renderStatusSummary(
      "Fixture validation",
      audit.commands.fixtureValidation.status === "pass" ? 1 : 0,
      0,
      audit.commands.fixtureValidation.status === "fail" ? 1 : 0,
      0,
      1,
    ),
    renderStatusSummary(
      "Free chaos",
      audit.surfaces.free.chaos.summary.passed,
      audit.surfaces.free.chaos.summary.warned,
      audit.surfaces.free.chaos.summary.failed,
      audit.surfaces.free.chaos.summary.blocked,
      audit.surfaces.free.chaos.summary.total,
    ),
    renderStatusSummary(
      "Free rigorous",
      audit.surfaces.free.rigorous.summary.passed,
      audit.surfaces.free.rigorous.summary.warned,
      audit.surfaces.free.rigorous.summary.failed,
      audit.surfaces.free.rigorous.summary.blocked,
      audit.surfaces.free.rigorous.summary.total,
    ),
    renderStatusSummary(
      "Pro chaos",
      audit.surfaces.pro.chaos.summary.passed,
      audit.surfaces.pro.chaos.summary.warned,
      audit.surfaces.pro.chaos.summary.failed,
      audit.surfaces.pro.chaos.summary.blocked,
      audit.surfaces.pro.chaos.summary.total,
    ),
    renderStatusSummary(
      "Pro rigorous",
      audit.surfaces.pro.rigorous.summary.passed,
      audit.surfaces.pro.rigorous.summary.warned,
      audit.surfaces.pro.rigorous.summary.failed,
      audit.surfaces.pro.rigorous.summary.blocked,
      audit.surfaces.pro.rigorous.summary.total,
    ),
    "",
    `Open issues: ${audit.issues.length}`,
    "",
    `Benchmark target mismatch candidates: ${audit.benchmarkTargetMismatchCandidates.length}`,
    "",
    `Blocked items: ${audit.blockedItems.length}`,
    "",
    "## Verification Commands",
    "",
    `- vitest: ${audit.commands.vitest.parsedSummary}`,
    `- fixture validation: ${audit.commands.fixtureValidation.parsedSummary}`,
    `- pro build: ${audit.commands.proBuild.parsedSummary}`,
    "",
    "## Pro Smoke Checks",
    "",
    ...audit.proSmokes.map((check) => `- ${check.status.toUpperCase()} ${check.name}: ${check.observed}`),
    "",
    "## Free Surface",
    "",
    `- build: ${audit.surfaces.free.chaos.metadata.buildType}`,
    `- package: ${audit.surfaces.free.chaos.metadata.packageName}`,
    `- key present: ${audit.surfaces.free.chaos.metadata.keyPresent ? "yes" : "no"}`,
    `- git sha: ${audit.surfaces.free.chaos.metadata.gitSha ?? "unknown"}`,
    "",
    "### Free Chaos Non-Passing Results",
    "",
    ...renderNonPassingChaos(audit.surfaces.free.chaos.results),
    "",
    "### Free Rigorous Non-Passing Results",
    "",
    ...renderNonPassingBenchmarks(audit.surfaces.free.rigorous.results),
    "",
    "## Pro Surface",
    "",
    `- build: ${audit.surfaces.pro.chaos.metadata.buildType}`,
    `- package: ${audit.surfaces.pro.chaos.metadata.packageName}`,
    `- key present: ${audit.surfaces.pro.chaos.metadata.keyPresent ? "yes" : "no"}`,
    `- git sha: ${audit.surfaces.pro.chaos.metadata.gitSha ?? "unknown"}`,
    "",
    "### Pro Chaos Non-Passing Results",
    "",
    ...renderNonPassingChaos(audit.surfaces.pro.chaos.results),
    "",
    "### Pro Rigorous Non-Passing Results",
    "",
    ...renderNonPassingBenchmarks(audit.surfaces.pro.rigorous.results),
    "",
    ...renderIssues("High Severity Issues", highIssues),
    ...renderIssues("Medium Severity Issues", mediumIssues),
    ...renderIssues("Low Severity Issues", lowIssues),
    ...renderIssues("Benchmark Target Mismatch Candidates", audit.benchmarkTargetMismatchCandidates),
    ...renderIssues("Blocked Items And External Dependencies", audit.blockedItems),
    "## Artifacts",
    "",
    ...audit.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
  ];

  return lines.join("\n");
}

function buildLegacyChaosMarkdown(freeReport: XlsxChaosLabReport, proReport: XlsxChaosLabReport, enterpriseDocPath: string): string {
  return [
    "# XLSX Chaos Lab Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Superseded by: \`${enterpriseDocPath}\``,
    "",
    `Free summary: ${freeReport.summary.passed} pass / ${freeReport.summary.warned} warn / ${freeReport.summary.failed} fail / ${freeReport.summary.blocked} blocked / ${freeReport.summary.total} total`,
    "",
    `Pro summary: ${proReport.summary.passed} pass / ${proReport.summary.warned} warn / ${proReport.summary.failed} fail / ${proReport.summary.blocked} blocked / ${proReport.summary.total} total`,
    "",
    "Use the enterprise audit for the full dual-surface verification narrative, issue list, blocked items, and artifact links.",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const gitSha = await getGitSha();
  const previousKey = process.env.RUNSTAMP_LICENSE_KEY;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTestPublicKey = process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2;
  const proKey = previousKey ?? TEST_XLSX_LICENSE_KEY;

  await mkdir(chaosOutputDir, { recursive: true });
  await mkdir(benchmarkOutputDir, { recursive: true });
  await mkdir(dirname(enterpriseMarkdownPath), { recursive: true });

  const vitest = await runCommand("vitest", "pnpm", ["exec", "vitest", "run"]);
  const fixtureValidation = await runCommand("fixtureValidation", "pnpm", ["exec", "tsx", "scripts/validate-fixtures.ts"]);

  process.env.RUNSTAMP_LICENSE_KEY = proKey;
  if (!previousKey) {
    process.env.NODE_ENV = process.env.NODE_ENV === "test" ? "test" : "development";
    process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 = TEST_PUBLIC_KEY_PEM;
  }
  const proBuild = await runCommand("proBuild", "node", ["scripts/build-pro.mjs"], process.env);
  const proModule = proBuild.status === "pass"
    ? await loadProSpreadsheetEngine()
    : undefined;
  const proSmokes = proModule ? await runProSmokeChecks(proModule) : [{
    name: "pro surface bootstrap",
    status: "fail",
    durationMs: 0,
    observed: "Pro bundle did not build, so Pro smoke checks could not run.",
  }];

  const freeChaos = await runXlsxChaosLab({
    mode: "free",
    buildType: "source",
    packageName: "@runstamp/xlsx",
    keyPresent: Boolean(previousKey),
    gitSha,
    compatibilityOracleAvailable: false,
  });
  const freeRigorous = await runRigorousBenchmarkSuite({
    iterations: 1,
    mode: "free",
    buildType: "source",
    packageName: "@runstamp/xlsx",
    keyPresent: Boolean(previousKey),
    gitSha,
  });

  let proChaos: XlsxChaosLabReport;
  let proRigorous: XlsxRigorousBenchmarkReport;

  if (proModule) {
    proChaos = await runXlsxChaosLab({
      mode: "pro",
      engine: proModule.SpreadsheetEngine,
      buildType: "dist-pro",
      packageName: "@runstamp/xlsx-pro",
      keyPresent: true,
      gitSha,
      compatibilityOracleAvailable: false,
    });
    proRigorous = await runRigorousBenchmarkSuite({
      iterations: 1,
      mode: "pro",
      engine: proModule.SpreadsheetEngine,
      buildType: "dist-pro",
      packageName: "@runstamp/xlsx-pro",
      keyPresent: true,
      gitSha,
    });
  } else {
    proChaos = await runXlsxChaosLab({
      mode: "pro",
      buildType: "dist-pro-unavailable",
      packageName: "@runstamp/xlsx-pro",
      keyPresent: true,
      gitSha,
      compatibilityOracleAvailable: false,
      engine: undefined,
    });
    proRigorous = await runRigorousBenchmarkSuite({
      iterations: 1,
      mode: "free",
      buildType: "dist-pro-unavailable",
      packageName: "@runstamp/xlsx-pro",
      keyPresent: true,
      gitSha,
    });
  }

  const partialAudit = {
    generatedAt: new Date().toISOString(),
    gitSha,
    commands: {
      vitest,
      fixtureValidation,
      proBuild,
    },
    proSmokes,
    surfaces: {
      free: {
        chaos: freeChaos,
        rigorous: freeRigorous,
      },
      pro: {
        chaos: proChaos,
        rigorous: proRigorous,
      },
    },
    artifacts: [
      legacyChaosJsonPath,
      enterpriseJsonPath,
      freeRigorousJsonPath,
      proRigorousJsonPath,
      enterpriseMarkdownPath,
      legacyChaosMarkdownPath,
    ],
  };

  const { issues, blockedItems, benchmarkTargetMismatchCandidates } = collectIssues(partialAudit);
  const audit: EnterpriseAudit = {
    ...partialAudit,
    issues,
    benchmarkTargetMismatchCandidates,
    blockedItems,
  };

  await writeFile(legacyChaosJsonPath, JSON.stringify({
    generatedAt: audit.generatedAt,
    gitSha: audit.gitSha,
    free: freeChaos,
    pro: proChaos,
  }, null, 2));
  await writeFile(freeRigorousJsonPath, JSON.stringify(freeRigorous, null, 2));
  await writeFile(proRigorousJsonPath, JSON.stringify(proRigorous, null, 2));
  await writeFile(enterpriseJsonPath, JSON.stringify(audit, null, 2));
  await writeFile(enterpriseMarkdownPath, `${buildEnterpriseMarkdown(audit)}\n`);
  await writeFile(legacyChaosMarkdownPath, `${buildLegacyChaosMarkdown(freeChaos, proChaos, enterpriseMarkdownPath)}\n`);

  console.log(buildEnterpriseMarkdown(audit));

  if (previousKey) {
    process.env.RUNSTAMP_LICENSE_KEY = previousKey;
  } else {
    delete process.env.RUNSTAMP_LICENSE_KEY;
  }
  if (previousNodeEnv) {
    process.env.NODE_ENV = previousNodeEnv;
  } else {
    delete process.env.NODE_ENV;
  }
  if (previousTestPublicKey) {
    process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 = previousTestPublicKey;
  } else {
    delete process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2;
  }

  if (
    vitest.status === "fail"
    || fixtureValidation.status === "fail"
    || proBuild.status === "fail"
    || audit.issues.some((issue) => issue.severity === "high")
  ) {
    process.exitCode = 1;
  }
}

await main();
