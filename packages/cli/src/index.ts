import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { Readable, Writable } from "node:stream";
import { renderToDocx, validateDocxDocument } from "@runstamp/docx";
import { PdfEngine } from "@runstamp/pdf";
import { PaperEngine } from "@runstamp/pptx";
import { SpreadsheetEngine } from "@runstamp/xlsx";

export type PaperjsxCliFormat = "pdf" | "docx" | "xlsx" | "pptx";

export interface PaperjsxCliOptions {
  format: PaperjsxCliFormat;
  inputPath: string;
  outputPath: string;
  validate: boolean;
  strict: boolean;
}

export interface PaperjsxCliIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface PaperjsxCliValidationResult {
  ok: boolean;
  issues: PaperjsxCliIssue[];
}

export interface PaperjsxCliRunOptions {
  cwd?: string;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

export class PaperjsxCliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "PaperjsxCliError";
    this.exitCode = exitCode;
  }
}

const FORMATS = new Set<PaperjsxCliFormat>(["pdf", "docx", "xlsx", "pptx"]);

export const USAGE = [
  "Usage:",
  "  runstamp init --format pptx[,docx,xlsx,pdf] --framework nextjs --package-manager pnpm [--tier free|pro]",
  "  runstamp doctor",
  "  runstamp verify --link pjsx_activate_… [--format pptx]",
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
  "  --help             Show this help",
].join("\n").replace("<path|- >", "<path|->");

const STARTER_FIXTURES: Record<PaperjsxCliFormat, unknown> = {
  pptx: {
    type: "Document", version: "1.0", meta: { title: "Runstamp verification" },
    slides: [{ type: "Slide", children: [{ type: "Text", content: "Runstamp verified", style: { left: 48, top: 48, width: 800, height: 80, fontSize: 28 } }] }],
  },
  docx: {
    type: "DocxDocument", metadata: { title: "Runstamp verification" },
    pages: [{ elements: [{ type: "heading", level: 1, text: "Runstamp verified" }, { type: "paragraph", text: "This deterministic fixture was rendered in the customer repository." }] }],
  },
  xlsx: {
    sheets: [{ name: "Verification", rows: [{ cells: [{ value: "Runstamp" }, { value: "Status" }] }, { cells: [{ value: "Local fixture" }, { value: "Verified" }] }] }],
  },
  pdf: { pages: [{ text: { value: "Runstamp verified — deterministic local fixture" } }] },
};

interface StarterConfig {
  version: 1;
  formats: PaperjsxCliFormat[];
  framework: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  tier: "free" | "pro" | "platform" | "enterprise";
}

function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? requireValue(argv, index, flag) : undefined;
}

function parseFormats(raw: string | undefined): PaperjsxCliFormat[] {
  const values = [...new Set((raw ?? "pptx").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean))];
  if (!values.length || values.some((value) => !isFormat(value))) {
    throw new PaperjsxCliError("--format must contain pptx, docx, xlsx, or pdf.", 2);
  }
  return values as PaperjsxCliFormat[];
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function runInit(argv: string[], cwd: string, stdout: NodeJS.WritableStream): Promise<number> {
  const formats = parseFormats(flagValue(argv, "--format"));
  const framework = flagValue(argv, "--framework") ?? "node";
  const packageManager = (flagValue(argv, "--package-manager") ?? "npm") as StarterConfig["packageManager"];
  const tier = (flagValue(argv, "--tier") ?? "free") as StarterConfig["tier"];
  if (!["npm", "pnpm", "yarn", "bun"].includes(packageManager)) throw new PaperjsxCliError("Unsupported package manager.", 2);
  if (!["free", "pro", "platform", "enterprise"].includes(tier)) throw new PaperjsxCliError("Unsupported tier.", 2);
  const root = resolve(cwd, ".runstamp");
  const configPath = resolve(root, "config.json");
  if (await exists(configPath) && !argv.includes("--force")) {
    throw new PaperjsxCliError(".runstamp/config.json already exists. Pass --force to replace the generated starter.", 2);
  }
  await mkdir(resolve(root, "fixtures"), { recursive: true });
  const config: StarterConfig = { version: 1, formats, framework, packageManager, tier };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  for (const format of formats) {
    await writeFile(resolve(root, "fixtures", `${format}.json`), `${JSON.stringify(STARTER_FIXTURES[format], null, 2)}\n`, "utf8");
  }
  const install = packageManager === "npm" ? "npm install -D @runstamp/cli" : packageManager === "yarn" ? "yarn add -D @runstamp/cli" : packageManager === "bun" ? "bun add -d @runstamp/cli" : "pnpm add -D @runstamp/cli";
  const execute = packageManager === "npm" ? "npx runstamp" : packageManager === "yarn" ? "yarn runstamp" : packageManager === "bun" ? "bunx runstamp" : "pnpm exec runstamp";
  const commands = formats.map((format) => `${execute} ${format} --in .runstamp/fixtures/${format}.json --out .runstamp/output.${format} --validate`).join("\n");
  await writeFile(resolve(root, "README.md"), `# Runstamp local starter\n\nFramework: ${framework}  \nTier: ${tier}\n\n\`\`\`bash\n${install}\n${commands}\n\`\`\`\n\nRun \`${execute} doctor\`, then verify locally with \`${execute} verify --private\` or use the short-lived dashboard link.\n`, "utf8");
  stdout.write(`runstamp: created ${formats.join(", ")} starter in ${root}\n`);
  return 0;
}

async function readStarterConfig(cwd: string): Promise<StarterConfig> {
  try {
    const parsed = JSON.parse(await readFile(resolve(cwd, ".runstamp/config.json"), "utf8")) as StarterConfig;
    if (parsed.version !== 1 || !Array.isArray(parsed.formats)) throw new Error("unsupported config");
    return parsed;
  } catch {
    throw new PaperjsxCliError("No valid .runstamp/config.json found. Run `runstamp init` first.", 2);
  }
}

async function runDoctor(cwd: string, stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): Promise<number> {
  const config = await readStarterConfig(cwd);
  const checks: Array<{ level: "ok" | "warn" | "error"; message: string }> = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push(nodeMajor >= 20 ? { level: "ok", message: `Node ${process.versions.node}` } : { level: "error", message: `Node ${process.versions.node}; Node 20+ is required` });
  const packageJson = JSON.parse(await readFile(resolve(cwd, "package.json"), "utf8").catch(() => "{}")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const nextVersion = deps.next;
  if (config.framework === "nextjs") checks.push(nextVersion ? { level: "ok", message: `Next.js ${nextVersion}` } : { level: "error", message: "Next.js is selected but not installed" });
  const require = createRequire(resolve(cwd, "package.json"));
  for (const format of config.formats) {
    const packageName = format === "pptx" ? "@runstamp/pptx" : format === "docx" ? "@runstamp/docx" : format === "xlsx" ? "@runstamp/xlsx" : "@runstamp/pdf";
    try { require.resolve(packageName); checks.push({ level: "ok", message: `${packageName} installed` }); }
    catch { checks.push({ level: "error", message: `${packageName} is not installed` }); }
  }
  // The local engines gate nothing on a licence: every rendering capability
  // ships in the open-source packages. `tier` describes the hosted plan, so a
  // missing RUNSTAMP_LICENSE_KEY is worth noting for hosted calls and is never
  // an error for local rendering.
  if (config.tier !== "free") {
    checks.push(process.env.RUNSTAMP_LICENSE_KEY
      ? { level: "ok", message: "Hosted licence key is configured" }
      : { level: "warn", message: "RUNSTAMP_LICENSE_KEY is unset; local rendering is unaffected, hosted calls will need it" });
  }
  try { require.resolve("canvas"); checks.push({ level: "ok", message: "Optional canvas capability available" }); }
  catch { checks.push({ level: "warn", message: "Optional canvas capability unavailable; raster fallback features will be limited" }); }
  for (const check of checks) (check.level === "error" ? stderr : stdout).write(`[${check.level}] ${check.message}\n`);
  return checks.some((check) => check.level === "error") ? 1 : 0;
}

async function cliVersion(): Promise<string> {
  try { return String(JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version); }
  catch { return "unknown"; }
}

async function runVerify(argv: string[], cwd: string, stdout: NodeJS.WritableStream): Promise<number> {
  const token = flagValue(argv, "--link");
  const privateMode = argv.includes("--private");
  if (Boolean(token) === privateMode) throw new PaperjsxCliError("Choose exactly one of --link <token> or --private.", 2);
  const config = await readStarterConfig(cwd);
  const requestedFormat = flagValue(argv, "--format");
  const format = parseFormats(requestedFormat ?? config.formats[0])[0];
  if (!config.formats.includes(format)) throw new PaperjsxCliError(`${format} is not configured in this starter.`, 2);
  const spec = JSON.parse(await readFile(resolve(cwd, ".runstamp/fixtures", `${format}.json`), "utf8"));
  const validation = await validateSpec(format, spec);
  if (!validation.ok) throw new PaperjsxCliError(`Fixture validation failed:\n${formatIssues(validation.issues)}`);
  const first = await renderSpec(format, spec, true);
  const second = await renderSpec(format, spec, true);
  const firstHash = createHash("sha256").update(first).digest("hex");
  const secondHash = createHash("sha256").update(second).digest("hex");
  if (firstHash !== secondHash) throw new PaperjsxCliError("Fixture output is not deterministic; activation was not recorded.");
  if (privateMode) {
    stdout.write(`runstamp: private verification passed (${format}, sha256:${firstHash})\nNo activation metadata was sent.\n`);
    return 0;
  }
  const idPath = resolve(cwd, ".runstamp/project-id");
  if (!(await exists(idPath))) await writeFile(idPath, `${randomUUID()}\n`, { encoding: "utf8", flag: "wx" }).catch(() => undefined);
  const projectIdentifier = (await readFile(idPath, "utf8")).trim();
  const endpoint = `${(process.env.RUNSTAMP_SITE_URL ?? "https://runstamp.com").replace(/\/$/, "")}/api/activation/receipt`;
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ format, sdkVersion: await cliVersion(), framework: config.framework, validationResult: "passed", deterministicHash: firstHash, projectIdentifier }),
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new PaperjsxCliError(body.error ?? `Activation receipt failed (${response.status}).`);
  stdout.write(`runstamp: linked verification passed (${format}, sha256:${firstHash})\n`);
  return 0;
}

function isFormat(value: string): value is PaperjsxCliFormat {
  return FORMATS.has(value as PaperjsxCliFormat);
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new PaperjsxCliError(`Missing value for ${flag}.\n\n${USAGE}`, 2);
  }
  return value;
}

export function parseArgs(argv: string[]): PaperjsxCliOptions {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    throw new PaperjsxCliError(USAGE, argv.length === 0 ? 2 : 0);
  }

  const [formatArg, ...rest] = argv;
  if (!isFormat(formatArg)) {
    throw new PaperjsxCliError(`Unknown format "${formatArg}".\n\n${USAGE}`, 2);
  }

  let inputPath: string | undefined;
  let outputPath: string | undefined;
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
        throw new PaperjsxCliError(`Unknown option "${arg}".\n\n${USAGE}`, 2);
    }
  }

  if (!inputPath) {
    throw new PaperjsxCliError(`Missing required --in option.\n\n${USAGE}`, 2);
  }
  if (!outputPath) {
    throw new PaperjsxCliError(`Missing required --out option.\n\n${USAGE}`, 2);
  }

  return {
    format: formatArg,
    inputPath,
    outputPath,
    validate,
    strict,
  };
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonSpec(inputPath: string, cwd: string, stdin: NodeJS.ReadableStream): Promise<unknown> {
  const json = inputPath === "-"
    ? await readStream(stdin)
    : await readFile(resolve(cwd, inputPath), "utf8");
  try {
    return JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PaperjsxCliError(`Invalid JSON input: ${message}`, 2);
  }
}

function issuePath(path: unknown): string | undefined {
  if (typeof path === "string") return path;
  if (Array.isArray(path)) return path.map(String).join(".");
  return undefined;
}

function normalizeIssue(issue: unknown): PaperjsxCliIssue {
  if (typeof issue !== "object" || issue === null) {
    return {
      severity: "error",
      code: "VALIDATION_FAILED",
      message: String(issue),
    };
  }
  const record = issue as Record<string, unknown>;
  const severity = record.severity === "warning" ? "warning" : "error";
  return {
    severity,
    code: typeof record.code === "string" ? record.code : "VALIDATION_FAILED",
    message: typeof record.message === "string" ? record.message : JSON.stringify(record),
    path: issuePath(record.path),
    suggestion: typeof record.suggestion === "string" ? record.suggestion : undefined,
  };
}

function normalizeThrownValidation(error: unknown): PaperjsxCliValidationResult {
  const record = error as { issues?: unknown[]; message?: string };
  const issues = Array.isArray(record?.issues)
    ? record.issues.map(normalizeIssue)
    : [{
        severity: "error" as const,
        code: "VALIDATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      }];
  return { ok: false, issues };
}

export async function validateSpec(
  format: PaperjsxCliFormat,
  spec: unknown,
): Promise<PaperjsxCliValidationResult> {
  try {
    switch (format) {
      case "pdf": {
        const result = (PdfEngine as any).validate(spec);
        if (result instanceof Promise) {
          return { ok: false, issues: [{ severity: "error", code: "PDF_VALIDATE_UNSUPPORTED", message: "Unexpected buffer validation path for JSON input." }] };
        }
        return {
          ok: result.ok,
          issues: result.issues.map(normalizeIssue),
        };
      }
      case "docx": {
        const result = validateDocxDocument(spec);
        return {
          ok: result.valid,
          issues: result.issues.map(normalizeIssue),
        };
      }
      case "xlsx": {
        const spreadsheetEngine = SpreadsheetEngine as any;
        const document = spreadsheetEngine.validate(spec);
        if (document instanceof Promise) {
          return { ok: false, issues: [{ severity: "error", code: "XLSX_VALIDATE_UNSUPPORTED", message: "Unexpected buffer validation path for JSON input." }] };
        }
        const lint = typeof spreadsheetEngine.lint === "function"
          ? spreadsheetEngine.lint(document)
          : { ok: true, issues: [] };
        return {
          ok: lint.ok,
          issues: lint.issues.map(normalizeIssue),
        };
      }
      case "pptx": {
        if (typeof PaperEngine.preflight === "function") {
          await PaperEngine.preflight(spec as never);
        }
        return { ok: true, issues: [] };
      }
    }
  } catch (error) {
    return normalizeThrownValidation(error);
  }
}

function formatIssues(issues: PaperjsxCliIssue[]): string {
  return issues.map((issue) => {
    const path = issue.path ? ` ${issue.path}` : "";
    const suggestion = issue.suggestion ? ` Suggestion: ${issue.suggestion}` : "";
    return `- [${issue.severity}] ${issue.code}${path}: ${issue.message}${suggestion}`;
  }).join("\n");
}

async function renderSpec(format: PaperjsxCliFormat, spec: unknown, strict: boolean): Promise<Buffer> {
  const options = { strict };
  switch (format) {
    case "pdf":
      return (PdfEngine as any).render(spec, options);
    case "docx": {
      const result = await (renderToDocx as any)(spec, options);
      return result.buffer;
    }
    case "xlsx":
      return (SpreadsheetEngine as any).render(spec, options);
    case "pptx":
      return PaperEngine.render(spec as never, options as never);
  }
}


/**
 * The CLI projection of the operation registry (OC-1 §6).
 *
 * Listing and describing are generated, so a new operation appears here by
 * existing rather than by someone remembering to add a case. `describe` prints
 * the same descriptor the MCP `runstamp_describe_operation` tool serves and the
 * hosted API routes from — one registry, three surfaces.
 */
async function runOps(argv: string[], stdout: NodeJS.WritableStream): Promise<number> {
  const { CATALOG, findOperation, httpRoute, mcpToolName } = await import("@runstamp/catalog");
  const [subcommand, name] = argv;

  if (subcommand === "list" || subcommand === undefined) {
    const width = Math.max(...CATALOG.map((operation) => operation.name.length));
    for (const operation of CATALOG) {
      stdout.write(`${operation.name.padEnd(width)}  ${operation.summary}\n`);
    }
    stdout.write(`\n${String(CATALOG.length)} operation(s). \`runstamp ops describe <name>\` for schemas.\n`);
    return 0;
  }

  if (subcommand === "describe") {
    if (name === undefined) {
      throw new PaperjsxCliError(`Missing operation name.\n\n${USAGE}`, 2);
    }
    const descriptor = findOperation(name);
    if (descriptor === undefined) {
      throw new PaperjsxCliError(
        `Unknown operation "${name}". Known: ${CATALOG.map((o) => o.name).join(", ")}.`,
        2,
      );
    }
    stdout.write(`${JSON.stringify({
      ...descriptor,
      surfaces: { mcpTool: mcpToolName(descriptor), httpRoute: httpRoute(descriptor) },
    }, null, 2)}\n`);
    return 0;
  }

  throw new PaperjsxCliError(`Unknown ops subcommand "${subcommand}".\n\n${USAGE}`, 2);
}

export async function runCli(argv: string[], options: PaperjsxCliRunOptions = {}): Promise<number> {
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
          `Validation failed with ${validation.issues.length} issue(s):\n${formatIssues(validation.issues)}`,
          1,
        );
      }
      stderr.write(`runstamp: validation ok (${parsed.format})\n`);
    }

    const output = await renderSpec(parsed.format, spec, parsed.strict);
    const outputPath = resolve(cwd, parsed.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output);
    stdout.write(`runstamp: wrote ${outputPath}\n`);
    return 0;
  } catch (error) {
    if (error instanceof PaperjsxCliError) {
      if (error.message) {
        const target = error.exitCode === 0 ? stdout : stderr;
        target.write(`${error.message}\n`);
      }
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`runstamp: ${message}\n`);
    return 1;
  }
}

export { renderSpec };
