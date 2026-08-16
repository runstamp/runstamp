#!/usr/bin/env node

// src/index.ts
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { createHash, randomUUID } from "crypto";
import { createRequire } from "module";
import { dirname, resolve } from "path";
import { Readable } from "stream";
import { renderToDocx, validateDocxDocument } from "@runstamp/docx";
import { PdfEngine } from "@runstamp/pdf";
import { PaperEngine } from "@runstamp/pptx";
import { SpreadsheetEngine } from "@runstamp/xlsx";
var PaperjsxCliError = class extends Error {
  exitCode;
  constructor(message, exitCode2 = 1) {
    super(message);
    this.name = "PaperjsxCliError";
    this.exitCode = exitCode2;
  }
};
var FORMATS = /* @__PURE__ */ new Set(["pdf", "docx", "xlsx", "pptx"]);
var USAGE = [
  "Usage:",
  "  runstamp init --format pptx[,docx,xlsx,pdf] --framework nextjs --package-manager pnpm [--tier free|pro]",
  "  runstamp doctor",
  "  runstamp verify --link pjsx_activate_\u2026 [--format pptx]",
  "  runstamp verify --private [--format pptx]",
  "  runstamp <pdf|docx|xlsx|pptx> --in spec.json --out file --validate [--strict]",
  "  runstamp ops list",
  "  runstamp ops describe <operation>",
  "",
  "Options:",
  "  --in <path|- >     JSON spec path, or - for stdin",
  "  --out <path>       Output artifact path",
  "  --validate         Run the engine validation pass before rendering",
  "  --strict           Render in strict mode (default)",
  "  --no-strict        Render in permissive migration mode when supported",
  "  --help             Show this help"
].join("\n").replace("<path|- >", "<path|->");
var STARTER_FIXTURES = {
  pptx: {
    type: "Document",
    version: "1.0",
    meta: { title: "Runstamp verification" },
    slides: [{ type: "Slide", children: [{ type: "Text", content: "Runstamp verified", style: { left: 48, top: 48, width: 800, height: 80, fontSize: 28 } }] }]
  },
  docx: {
    type: "DocxDocument",
    metadata: { title: "Runstamp verification" },
    pages: [{ elements: [{ type: "heading", level: 1, text: "Runstamp verified" }, { type: "paragraph", text: "This deterministic fixture was rendered in the customer repository." }] }]
  },
  xlsx: {
    sheets: [{ name: "Verification", rows: [{ cells: [{ value: "Runstamp" }, { value: "Status" }] }, { cells: [{ value: "Local fixture" }, { value: "Verified" }] }] }]
  },
  pdf: { pages: [{ text: { value: "Runstamp verified \u2014 deterministic local fixture" } }] }
};
function flagValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? requireValue(argv, index, flag) : void 0;
}
function parseFormats(raw) {
  const values = [...new Set((raw ?? "pptx").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean))];
  if (!values.length || values.some((value) => !isFormat(value))) {
    throw new PaperjsxCliError("--format must contain pptx, docx, xlsx, or pdf.", 2);
  }
  return values;
}
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function runInit(argv, cwd, stdout) {
  const formats = parseFormats(flagValue(argv, "--format"));
  const framework = flagValue(argv, "--framework") ?? "node";
  const packageManager = flagValue(argv, "--package-manager") ?? "npm";
  const tier = flagValue(argv, "--tier") ?? "free";
  if (!["npm", "pnpm", "yarn", "bun"].includes(packageManager)) throw new PaperjsxCliError("Unsupported package manager.", 2);
  if (!["free", "pro", "platform", "enterprise"].includes(tier)) throw new PaperjsxCliError("Unsupported tier.", 2);
  const root = resolve(cwd, ".runstamp");
  const configPath = resolve(root, "config.json");
  if (await exists(configPath) && !argv.includes("--force")) {
    throw new PaperjsxCliError(".runstamp/config.json already exists. Pass --force to replace the generated starter.", 2);
  }
  await mkdir(resolve(root, "fixtures"), { recursive: true });
  const config = { version: 1, formats, framework, packageManager, tier };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}
`, "utf8");
  for (const format of formats) {
    await writeFile(resolve(root, "fixtures", `${format}.json`), `${JSON.stringify(STARTER_FIXTURES[format], null, 2)}
`, "utf8");
  }
  const install = packageManager === "npm" ? "npm install -D @runstamp/cli" : packageManager === "yarn" ? "yarn add -D @runstamp/cli" : packageManager === "bun" ? "bun add -d @runstamp/cli" : "pnpm add -D @runstamp/cli";
  const execute = packageManager === "npm" ? "npx runstamp" : packageManager === "yarn" ? "yarn runstamp" : packageManager === "bun" ? "bunx runstamp" : "pnpm exec runstamp";
  const commands = formats.map((format) => `${execute} ${format} --in .runstamp/fixtures/${format}.json --out .runstamp/output.${format} --validate`).join("\n");
  await writeFile(resolve(root, "README.md"), `# Runstamp local starter

Framework: ${framework}  
Tier: ${tier}

\`\`\`bash
${install}
${commands}
\`\`\`

Run \`${execute} doctor\`, then verify locally with \`${execute} verify --private\` or use the short-lived dashboard link.
`, "utf8");
  stdout.write(`runstamp: created ${formats.join(", ")} starter in ${root}
`);
  return 0;
}
async function readStarterConfig(cwd) {
  try {
    const parsed = JSON.parse(await readFile(resolve(cwd, ".runstamp/config.json"), "utf8"));
    if (parsed.version !== 1 || !Array.isArray(parsed.formats)) throw new Error("unsupported config");
    return parsed;
  } catch {
    throw new PaperjsxCliError("No valid .runstamp/config.json found. Run `runstamp init` first.", 2);
  }
}
async function runDoctor(cwd, stdout, stderr) {
  const config = await readStarterConfig(cwd);
  const checks = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push(nodeMajor >= 20 ? { level: "ok", message: `Node ${process.versions.node}` } : { level: "error", message: `Node ${process.versions.node}; Node 20+ is required` });
  const packageJson = JSON.parse(await readFile(resolve(cwd, "package.json"), "utf8").catch(() => "{}"));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const nextVersion = deps.next;
  if (config.framework === "nextjs") checks.push(nextVersion ? { level: "ok", message: `Next.js ${nextVersion}` } : { level: "error", message: "Next.js is selected but not installed" });
  const require2 = createRequire(resolve(cwd, "package.json"));
  for (const format of config.formats) {
    const packageName = format === "pptx" ? "@runstamp/pptx" : format === "docx" ? "@runstamp/docx" : format === "xlsx" ? "@runstamp/xlsx" : "@runstamp/pdf";
    try {
      require2.resolve(packageName);
      checks.push({ level: "ok", message: `${packageName} installed` });
    } catch {
      checks.push({ level: "error", message: `${packageName} is not installed` });
    }
  }
  if (config.tier !== "free") {
    checks.push(process.env.RUNSTAMP_LICENSE_KEY ? { level: "ok", message: "Hosted licence key is configured" } : { level: "warn", message: "RUNSTAMP_LICENSE_KEY is unset; local rendering is unaffected, hosted calls will need it" });
  }
  try {
    require2.resolve("canvas");
    checks.push({ level: "ok", message: "Optional canvas capability available" });
  } catch {
    checks.push({ level: "warn", message: "Optional canvas capability unavailable; raster fallback features will be limited" });
  }
  for (const check of checks) (check.level === "error" ? stderr : stdout).write(`[${check.level}] ${check.message}
`);
  return checks.some((check) => check.level === "error") ? 1 : 0;
}
async function cliVersion() {
  try {
    return String(JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version);
  } catch {
    return "unknown";
  }
}
async function runVerify(argv, cwd, stdout) {
  const token = flagValue(argv, "--link");
  const privateMode = argv.includes("--private");
  if (Boolean(token) === privateMode) throw new PaperjsxCliError("Choose exactly one of --link <token> or --private.", 2);
  const config = await readStarterConfig(cwd);
  const requestedFormat = flagValue(argv, "--format");
  const format = parseFormats(requestedFormat ?? config.formats[0])[0];
  if (!config.formats.includes(format)) throw new PaperjsxCliError(`${format} is not configured in this starter.`, 2);
  const spec = JSON.parse(await readFile(resolve(cwd, ".runstamp/fixtures", `${format}.json`), "utf8"));
  const validation = await validateSpec(format, spec);
  if (!validation.ok) throw new PaperjsxCliError(`Fixture validation failed:
${formatIssues(validation.issues)}`);
  const first = await renderSpec(format, spec, true);
  const second = await renderSpec(format, spec, true);
  const firstHash = createHash("sha256").update(first).digest("hex");
  const secondHash = createHash("sha256").update(second).digest("hex");
  if (firstHash !== secondHash) throw new PaperjsxCliError("Fixture output is not deterministic; activation was not recorded.");
  if (privateMode) {
    stdout.write(`runstamp: private verification passed (${format}, sha256:${firstHash})
No activation metadata was sent.
`);
    return 0;
  }
  const idPath = resolve(cwd, ".runstamp/project-id");
  if (!await exists(idPath)) await writeFile(idPath, `${randomUUID()}
`, { encoding: "utf8", flag: "wx" }).catch(() => void 0);
  const projectIdentifier = (await readFile(idPath, "utf8")).trim();
  const endpoint = `${(process.env.RUNSTAMP_SITE_URL ?? "https://runstamp.com").replace(/\/$/, "")}/api/activation/receipt`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ format, sdkVersion: await cliVersion(), framework: config.framework, validationResult: "passed", deterministicHash: firstHash, projectIdentifier })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new PaperjsxCliError(body.error ?? `Activation receipt failed (${response.status}).`);
  stdout.write(`runstamp: linked verification passed (${format}, sha256:${firstHash})
`);
  return 0;
}
function isFormat(value) {
  return FORMATS.has(value);
}
function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new PaperjsxCliError(`Missing value for ${flag}.

${USAGE}`, 2);
  }
  return value;
}
function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    throw new PaperjsxCliError(USAGE, argv.length === 0 ? 2 : 0);
  }
  const [formatArg, ...rest] = argv;
  if (!isFormat(formatArg)) {
    throw new PaperjsxCliError(`Unknown format "${formatArg}".

${USAGE}`, 2);
  }
  let inputPath;
  let outputPath;
  let validate = false;
  let strict = true;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    switch (arg) {
      case "--in":
      case "-i":
        inputPath = requireValue(rest, i, arg);
        i += 1;
        break;
      case "--out":
      case "-o":
        outputPath = requireValue(rest, i, arg);
        i += 1;
        break;
      case "--validate":
        validate = true;
        break;
      case "--strict":
        strict = true;
        break;
      case "--no-strict":
        strict = false;
        break;
      default:
        throw new PaperjsxCliError(`Unknown option "${arg}".

${USAGE}`, 2);
    }
  }
  if (!inputPath) {
    throw new PaperjsxCliError(`Missing required --in option.

${USAGE}`, 2);
  }
  if (!outputPath) {
    throw new PaperjsxCliError(`Missing required --out option.

${USAGE}`, 2);
  }
  return {
    format: formatArg,
    inputPath,
    outputPath,
    validate,
    strict
  };
}
async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function readJsonSpec(inputPath, cwd, stdin) {
  const json = inputPath === "-" ? await readStream(stdin) : await readFile(resolve(cwd, inputPath), "utf8");
  try {
    return JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PaperjsxCliError(`Invalid JSON input: ${message}`, 2);
  }
}
function issuePath(path) {
  if (typeof path === "string") return path;
  if (Array.isArray(path)) return path.map(String).join(".");
  return void 0;
}
function normalizeIssue(issue) {
  if (typeof issue !== "object" || issue === null) {
    return {
      severity: "error",
      code: "VALIDATION_FAILED",
      message: String(issue)
    };
  }
  const record = issue;
  const severity = record.severity === "warning" ? "warning" : "error";
  return {
    severity,
    code: typeof record.code === "string" ? record.code : "VALIDATION_FAILED",
    message: typeof record.message === "string" ? record.message : JSON.stringify(record),
    path: issuePath(record.path),
    suggestion: typeof record.suggestion === "string" ? record.suggestion : void 0
  };
}
function normalizeThrownValidation(error) {
  const record = error;
  const issues = Array.isArray(record?.issues) ? record.issues.map(normalizeIssue) : [{
    severity: "error",
    code: "VALIDATION_FAILED",
    message: error instanceof Error ? error.message : String(error)
  }];
  return { ok: false, issues };
}
async function validateSpec(format, spec) {
  try {
    switch (format) {
      case "pdf": {
        const result = PdfEngine.validate(spec);
        if (result instanceof Promise) {
          return { ok: false, issues: [{ severity: "error", code: "PDF_VALIDATE_UNSUPPORTED", message: "Unexpected buffer validation path for JSON input." }] };
        }
        return {
          ok: result.ok,
          issues: result.issues.map(normalizeIssue)
        };
      }
      case "docx": {
        const result = validateDocxDocument(spec);
        return {
          ok: result.valid,
          issues: result.issues.map(normalizeIssue)
        };
      }
      case "xlsx": {
        const spreadsheetEngine = SpreadsheetEngine;
        const document = spreadsheetEngine.validate(spec);
        if (document instanceof Promise) {
          return { ok: false, issues: [{ severity: "error", code: "XLSX_VALIDATE_UNSUPPORTED", message: "Unexpected buffer validation path for JSON input." }] };
        }
        const lint = typeof spreadsheetEngine.lint === "function" ? spreadsheetEngine.lint(document) : { ok: true, issues: [] };
        return {
          ok: lint.ok,
          issues: lint.issues.map(normalizeIssue)
        };
      }
      case "pptx": {
        if (typeof PaperEngine.preflight === "function") {
          await PaperEngine.preflight(spec);
        }
        return { ok: true, issues: [] };
      }
    }
  } catch (error) {
    return normalizeThrownValidation(error);
  }
}
function formatIssues(issues) {
  return issues.map((issue) => {
    const path = issue.path ? ` ${issue.path}` : "";
    const suggestion = issue.suggestion ? ` Suggestion: ${issue.suggestion}` : "";
    return `- [${issue.severity}] ${issue.code}${path}: ${issue.message}${suggestion}`;
  }).join("\n");
}
async function renderSpec(format, spec, strict) {
  const options = { strict };
  switch (format) {
    case "pdf":
      return PdfEngine.render(spec, options);
    case "docx": {
      const result = await renderToDocx(spec, options);
      return result.buffer;
    }
    case "xlsx":
      return SpreadsheetEngine.render(spec, options);
    case "pptx":
      return PaperEngine.render(spec, options);
  }
}
async function runOps(argv, stdout) {
  const { CATALOG, findOperation, httpRoute, mcpToolName } = await import("@runstamp/catalog");
  const [subcommand, name] = argv;
  if (subcommand === "list" || subcommand === void 0) {
    const width = Math.max(...CATALOG.map((operation) => operation.name.length));
    for (const operation of CATALOG) {
      stdout.write(`${operation.name.padEnd(width)}  ${operation.summary}
`);
    }
    stdout.write(`
${String(CATALOG.length)} operation(s). \`runstamp ops describe <name>\` for schemas.
`);
    return 0;
  }
  if (subcommand === "describe") {
    if (name === void 0) {
      throw new PaperjsxCliError(`Missing operation name.

${USAGE}`, 2);
    }
    const descriptor = findOperation(name);
    if (descriptor === void 0) {
      throw new PaperjsxCliError(
        `Unknown operation "${name}". Known: ${CATALOG.map((o) => o.name).join(", ")}.`,
        2
      );
    }
    stdout.write(`${JSON.stringify({
      ...descriptor,
      surfaces: { mcpTool: mcpToolName(descriptor), httpRoute: httpRoute(descriptor) }
    }, null, 2)}
`);
    return 0;
  }
  throw new PaperjsxCliError(`Unknown ops subcommand "${subcommand}".

${USAGE}`, 2);
}
async function runCli(argv, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const stdin = options.stdin ?? Readable.from([]);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  try {
    if (argv[0] === "init") return await runInit(argv.slice(1), cwd, stdout);
    if (argv[0] === "doctor") return await runDoctor(cwd, stdout, stderr);
    if (argv[0] === "verify") return await runVerify(argv.slice(1), cwd, stdout);
    if (argv[0] === "ops") return await runOps(argv.slice(1), stdout);
    const parsed = parseArgs(argv);
    const spec = await readJsonSpec(parsed.inputPath, cwd, stdin);
    if (parsed.validate) {
      const validation = await validateSpec(parsed.format, spec);
      if (!validation.ok) {
        throw new PaperjsxCliError(
          `Validation failed with ${validation.issues.length} issue(s):
${formatIssues(validation.issues)}`,
          1
        );
      }
      stderr.write(`runstamp: validation ok (${parsed.format})
`);
    }
    const output = await renderSpec(parsed.format, spec, parsed.strict);
    const outputPath = resolve(cwd, parsed.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output);
    stdout.write(`runstamp: wrote ${outputPath}
`);
    return 0;
  } catch (error) {
    if (error instanceof PaperjsxCliError) {
      if (error.message) {
        const target = error.exitCode === 0 ? stdout : stderr;
        target.write(`${error.message}
`);
      }
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`runstamp: ${message}
`);
    return 1;
  }
}

// src/cli.ts
var exitCode = await runCli(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr
});
process.exitCode = exitCode;
//# sourceMappingURL=cli.js.map