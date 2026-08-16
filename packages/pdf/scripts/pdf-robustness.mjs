import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arch, cpus, platform, release } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
const mode = process.argv[2] ?? "quick";
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
const phaseId = process.env.PDF_ROBUSTNESS_PHASE_ID ||
  (mode === "baseline" ? `baseline-${timestamp}` : `robustness-${mode}-${timestamp}`);
const proofRoot = path.join(repoRoot, "outputs/pdf-sota", phaseId);
const requiredReleaseTools = ["qpdf", "pdfinfo", "pdftotext", "pdffonts", "pdftoppm", "pdfsig", "openssl", "verapdf"];

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.stdio ?? "inherit",
  });
  return result;
}

function commandOutput(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    stdio: "pipe",
  });
}

function inspectTool(name) {
  const which = commandOutput("which", [name]);
  if (which.status !== 0) {
    return {
      available: false,
      expectedPathLookup: `which ${name}`,
      name,
    };
  }
  const versionArgs = {
    openssl: ["version"],
    pdfinfo: ["-v"],
    pdffonts: ["-v"],
    pdfsig: ["-v"],
    pdftoppm: ["-v"],
    pdftotext: ["-v"],
    qpdf: ["--version"],
    verapdf: ["--version"],
  }[name] ?? ["--version"];
  const version = commandOutput(name, versionArgs);
  return {
    available: true,
    expectedPathLookup: `which ${name}`,
    name,
    path: which.stdout.trim(),
    version: (version.stdout || version.stderr || "").trim().split("\n")[0] ?? "",
  };
}

function environment(commandResults, releaseMode) {
  const gitCommit = commandOutput("git", ["rev-parse", "HEAD"]);
  const gitStatus = commandOutput("git", ["status", "--short"]);
  return {
    commandLine: process.argv.join(" "),
    commandResults,
    cpu: cpus()[0]?.model ?? "unknown",
    dirtyWorktreeStatus: gitStatus.stdout,
    enginePackageVersion: packageJson.version,
    environmentFlags: Object.fromEntries(
      Object.entries(process.env)
        .filter(([key]) => key.startsWith("PDF_") || key.startsWith("RUNSTAMP_"))
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    externalTools: Object.fromEntries(requiredReleaseTools.map((tool) => [tool, inspectTool(tool)])),
    gitCommit: gitCommit.status === 0 ? gitCommit.stdout.trim() : null,
    mode,
    nodeVersion: process.version,
    os: { arch: arch(), platform: platform(), release: release() },
    phaseId,
    proofRoot,
    releaseMode,
  };
}

function writeFailurePack(message, commandResults, releaseMode) {
  mkdirSync(proofRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const env = environment(commandResults, releaseMode);
  const scorecard = {
    generatedAt,
    ...env,
    categories: {
      preflight: { applicable: 1, failed: 1, passed: 0, skipped: 0 },
    },
    totals: { caseCount: 0, failCount: 1, passCount: 0, skipCount: 0 },
  };
  const qaReport = {
    generatedAt,
    phaseId,
    proofRoot,
    cases: [
      {
        caseId: "robustness-preflight",
        checks: {
          preflight: {
            details: { message },
            passed: false,
          },
        },
        description: "Robustness runner preflight",
        failingChecks: ["preflight"],
        passed: false,
        renderedPages: [],
        type: "preflight",
      },
    ],
    scorecard,
  };
  writeFileSync(path.join(proofRoot, "summary.md"), `# PDF Robustness ${mode}\n\n${message}\n`);
  writeFileSync(path.join(proofRoot, "scorecard.json"), `${JSON.stringify(scorecard, null, 2)}\n`);
  writeFileSync(path.join(proofRoot, "qa-report.json"), `${JSON.stringify(qaReport, null, 2)}\n`);
  writeFileSync(path.join(proofRoot, "benchmark-results.json"), `${JSON.stringify({ generatedAt, phaseId, cases: [], totals: scorecard.totals }, null, 2)}\n`);
  writeFileSync(path.join(proofRoot, "environment.json"), `${JSON.stringify(env, null, 2)}\n`);
}

function packageCommandsForMode() {
  if (mode === "quick") {
    return [
      ["pnpm", ["--filter", "@runstamp/pdf", "exec", "vitest", "run",
        "__tests__/robustness-capability.test.ts",
        "__tests__/phase5-table-robustness.test.ts",
        "__tests__/asset-policy.test.ts",
        "__tests__/phase5-table-pagination.test.ts",
        "__tests__/phase6-navigation.test.ts",
      ]],
    ];
  }
  return [
    ["pnpm", ["--filter", "@runstamp/pdf", "lint"]],
    ["pnpm", ["--filter", "@runstamp/pdf", "typecheck"]],
    ["pnpm", ["--filter", "@runstamp/pdf", "test"]],
    ["pnpm", ["--filter", "@runstamp/pdf", "build"]],
  ];
}

function harnessEnv(releaseMode) {
  const env = {
    ...process.env,
    PDF_SOTA_CASE_TIMEOUT_MS: process.env.PDF_SOTA_CASE_TIMEOUT_MS ?? "30000",
    PDF_SOTA_PHASE_ID: phaseId,
    PDF_SOTA_SUITE_TIMEOUT_MS: process.env.PDF_SOTA_SUITE_TIMEOUT_MS ?? "300000",
  };
  if (mode !== "quick") {
    env.PDF_SOTA_INCLUDE_LARGE_DOC = "1";
    env.PDF_SOTA_INCLUDE_TAGGED_A11Y = "1";
    env.PDF_SOTA_INCLUDE_ENTERPRISE = "1";
  }
  if (releaseMode) {
    env.PDF_SOTA_RELEASE = "1";
  }
  return env;
}

function main() {
  if (!["baseline", "quick", "full", "ci", "release"].includes(mode)) {
    throw new Error(`Unknown PDF robustness mode: ${mode}`);
  }

  const commandResults = [];
  const releaseMode = mode === "release";
  if (releaseMode) {
    const missingTools = requiredReleaseTools.filter((tool) => !inspectTool(tool).available);
    if (missingTools.length > 0) {
      const message = `pdf:robustness:release requires missing external tool(s): ${missingTools.join(", ")}`;
      writeFailurePack(message, commandResults, releaseMode);
      console.error(message);
      process.exit(1);
    }
  }

  for (const [command, args] of packageCommandsForMode()) {
    const startedAt = Date.now();
    const result = runCommand(command, args);
    commandResults.push({
      args,
      command,
      durationMs: Date.now() - startedAt,
      status: result.status,
    });
    if (result.status !== 0) {
      writeFailurePack(`${command} ${args.join(" ")} failed with exit ${result.status}`, commandResults, releaseMode);
      process.exit(result.status ?? 1);
    }
  }

  const harnessStartedAt = Date.now();
  const harness = runCommand("node", ["packages/chaos-lab/proof/pdf/run-pdf-sota-harness.mjs"], {
    env: harnessEnv(releaseMode),
  });
  commandResults.push({
    args: ["packages/chaos-lab/proof/pdf/run-pdf-sota-harness.mjs"],
    command: "node",
    durationMs: Date.now() - harnessStartedAt,
    status: harness.status,
  });
  if (harness.status !== 0) {
    const qaReportPath = path.join(proofRoot, "qa-report.json");
    if (existsSync(qaReportPath)) {
      writeFileSync(path.join(proofRoot, "robustness-run.json"), `${JSON.stringify(environment(commandResults, releaseMode), null, 2)}\n`);
      console.error(`PDF SOTA harness failed with exit ${harness.status}; preserving harness report at ${qaReportPath}`);
      process.exit(harness.status ?? 1);
    }
    writeFailurePack(`PDF SOTA harness failed with exit ${harness.status}`, commandResults, releaseMode);
    process.exit(harness.status ?? 1);
  }

  writeFileSync(path.join(proofRoot, "robustness-run.json"), `${JSON.stringify(environment(commandResults, releaseMode), null, 2)}\n`);
  console.log(`PDF robustness ${mode} passed: ${proofRoot}`);
}

main();
