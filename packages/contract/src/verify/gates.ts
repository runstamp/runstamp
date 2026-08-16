/**
 * Gate implementations for C1–C18 (OC-1 §7).
 *
 * Each gate takes the loaded `./ops` namespace plus the package's conformance
 * manifest and returns a `GateResult`. Gates never throw for a conformance
 * failure — a thrown gate is a bug in the kit, the same distinction R4 draws for
 * operations.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { isPaperError } from "../errors.js";
import { formatLocator, parseLocator } from "../locator.js";
import { compareLosses } from "../loss.js";
import { isVerb } from "../registry.js";
import { OPERATION_CANCELLED, OPERATION_TIMEOUT } from "../codes.js";
import type { Loss } from "../loss.js";
import type { Locator } from "../locator.js";
import type { OperationResult } from "../result.js";
import { HOSTILE_INPUTS, describeInput } from "./hostile.js";
import type {
  ConformanceFixture,
  ConformanceManifest,
  GateId,
  GateResult,
  GateStatus,
} from "./types.js";
import { GATE_TITLES } from "./types.js";

const run = promisify(execFile);

export type OpsModule = Record<string, unknown>;

function result(gate: GateId, status: GateStatus, summary: string, details?: string[]): GateResult {
  return {
    gate,
    title: GATE_TITLES[gate],
    status,
    summary,
    ...(details !== undefined && details.length > 0 ? { details } : {}),
  };
}

function verdict(gate: GateId, violations: string[], passSummary: string): GateResult {
  return violations.length === 0
    ? result(gate, "pass", passSummary)
    : result(gate, "fail", `${String(violations.length)} violation(s).`, violations);
}

/** Exported functions on the surface, which is what most gates reason over. */
function operations(ops: OpsModule): [string, (...args: unknown[]) => unknown][] {
  return Object.entries(ops).filter((entry): entry is [string, (...args: unknown[]) => unknown] =>
    typeof entry[1] === "function",
  );
}

/**
 * Read the loss ledger defensively.
 *
 * Gates are handed exactly the surfaces that get these shapes wrong — that is
 * what they are for — so reaching straight into `envelope.losses` makes the
 * runner crash on the inputs it most needs to report on. C2 owns the complaint
 * about a malformed envelope; every other gate just needs to keep going.
 */
function lossesOf(envelope: unknown): readonly Loss[] {
  const candidate = (envelope as { losses?: unknown } | undefined)?.losses;
  return Array.isArray(candidate) ? (candidate as readonly Loss[]) : [];
}

function receiptOf(envelope: unknown): Record<string, unknown> | undefined {
  const candidate = (envelope as { receipt?: unknown } | undefined)?.receipt;
  return typeof candidate === "object" && candidate !== null
    ? (candidate as Record<string, unknown>)
    : undefined;
}

async function invoke(
  ops: OpsModule,
  fixture: ConformanceFixture,
): Promise<OperationResult<unknown>> {
  const operation = ops[fixture.verb];
  if (typeof operation !== "function") {
    throw new Error(`Fixture "${fixture.name}" needs verb "${fixture.verb}", which ./ops does not export.`);
  }
  return (await (operation as (input: unknown, options?: unknown) => Promise<OperationResult<unknown>>)(
    fixture.input,
    fixture.options,
  )) as OperationResult<unknown>;
}

// ---------------------------------------------------------------------------
// C1 / C14 — signature and vocabulary
// ---------------------------------------------------------------------------

export function gateC1(ops: OpsModule): GateResult {
  const violations: string[] = [];
  for (const [name, fn] of operations(ops)) {
    if (!isVerb(name)) continue; // vocabulary is C14's problem, not C1's
    if (fn.length > 2) {
      violations.push(`${name}: declares ${String(fn.length)} parameters; OC-1 R1 allows at most two (input, options).`);
    }
  }
  if (operations(ops).length === 0) {
    violations.push("./ops exports no operations at all.");
  }
  return verdict("C1", violations, `${String(operations(ops).length)} operation(s) accept (input, options?).`);
}

export function gateC14(ops: OpsModule): GateResult {
  const violations: string[] = [];
  for (const [name, value] of Object.entries(ops)) {
    if (typeof value === "function") {
      if (!isVerb(name)) {
        violations.push(
          `${name}: not a canonical verb. R35 permits only verbs and types on ./ops — move helpers to the package root.`,
        );
      }
      continue;
    }
    // Types vanish at runtime, so anything else still present is a value.
    violations.push(`${name}: a non-function value on ./ops. R35 forbids helpers, constants and classes.`);
  }
  return verdict("C14", violations, "Every ./ops export is a canonical verb.");
}

// ---------------------------------------------------------------------------
// C2 / C3 — envelope and serialization
// ---------------------------------------------------------------------------

function envelopeViolations(label: string, envelope: unknown): string[] {
  const problems: string[] = [];
  if (typeof envelope !== "object" || envelope === null) {
    return [`${label}: did not return an object.`];
  }
  const value = envelope as Record<string, unknown>;
  if (typeof value.ok !== "boolean") problems.push(`${label}: "ok" is not a boolean.`);
  if (!Array.isArray(value.losses)) problems.push(`${label}: "losses" is not an array (R7).`);
  if (!Array.isArray(value.diagnostics)) problems.push(`${label}: "diagnostics" is not an array (R7).`);
  if (value.ok === true) {
    if (!("value" in value)) problems.push(`${label}: success envelope has no "value".`);
    if (value.receipt === undefined) problems.push(`${label}: success envelope has no receipt.`);
  } else {
    if (value.error === undefined) problems.push(`${label}: failure envelope has no "error".`);
    if ("value" in value) problems.push(`${label}: failure envelope carries a "value" (R8 forbids a partial channel).`);
  }
  return problems;
}

export async function gateC2(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const violations: string[] = [];
  for (const fixture of manifest.fixtures) {
    try {
      violations.push(...envelopeViolations(fixture.name, await invoke(ops, fixture)));
    } catch (error) {
      violations.push(`${fixture.name}: threw instead of returning an envelope — ${String(error)}`);
    }
  }
  return verdict("C2", violations, `${String(manifest.fixtures.length)} fixture(s) returned a well-formed envelope.`);
}

/** Artifact bytes are the one field §7 exempts from the JSON round-trip. */
function stripBytes(envelope: unknown): unknown {
  return JSON.parse(
    JSON.stringify(envelope, (key, value: unknown) => (key === "bytes" ? undefined : value)),
  );
}

export async function gateC3(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const violations: string[] = [];
  for (const fixture of manifest.fixtures) {
    try {
      const envelope = await invoke(ops, fixture);
      const once = stripBytes(envelope);
      const twice = stripBytes(JSON.parse(JSON.stringify(once)));
      if (JSON.stringify(once) !== JSON.stringify(twice)) {
        violations.push(`${fixture.name}: envelope is not stable across a JSON round-trip.`);
      }
      // A PaperError that loses its code across the boundary is the failure mode
      // that matters here: it is how errors cross MCP and HTTP (R13).
      if (!envelope.ok) {
        const restored = (once as { error?: { code?: unknown; remediation?: unknown } }).error;
        if (restored?.code !== envelope.error.code) {
          violations.push(`${fixture.name}: error code did not survive serialization.`);
        }
        if (typeof restored?.remediation !== "string" || restored.remediation.length === 0) {
          violations.push(`${fixture.name}: remediation did not survive serialization.`);
        }
      }
    } catch (error) {
      violations.push(`${fixture.name}: ${String(error)}`);
    }
  }
  return verdict("C3", violations, "Envelopes survive JSON.parse(JSON.stringify(...)).");
}

// ---------------------------------------------------------------------------
// C4 — errors
// ---------------------------------------------------------------------------

export async function gateC4(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const violations: string[] = [];
  let checked = 0;
  for (const fixture of manifest.fixtures) {
    let envelope: OperationResult<unknown>;
    try {
      envelope = await invoke(ops, fixture);
    } catch (error) {
      violations.push(`${fixture.name}: ${String(error)}`);
      continue;
    }
    if (fixture.expect === "fail" && envelope.ok) {
      violations.push(`${fixture.name}: expected a failure, got success.`);
      continue;
    }
    if (fixture.expect === "ok" && !envelope.ok) {
      violations.push(
        `${fixture.name}: expected success, got ${String(envelope.error?.code)} — ${String(envelope.error?.message)}`,
      );
      continue;
    }
    if (envelope.ok) continue;
    checked += 1;
    const error = envelope.error as Partial<typeof envelope.error> | undefined;
    if (error === undefined) {
      violations.push(`${fixture.name}: failure envelope carries no error.`);
      continue;
    }
    if (!isPaperError(error)) violations.push(`${fixture.name}: error is not a PaperError.`);
    if (!String(error.code).startsWith(`${manifest.domain}/`) && !String(error.code).startsWith("common/")) {
      violations.push(`${fixture.name}: code "${String(error.code)}" is namespaced to neither "${manifest.domain}/" nor "common/".`);
    }
    if (typeof error.remediation !== "string" || error.remediation.trim().length === 0) {
      violations.push(`${fixture.name}: remediation is empty (R10 — an error a caller cannot act on is a bug).`);
    }
    if (fixture.code !== undefined && error.code !== fixture.code) {
      violations.push(`${fixture.name}: expected code "${fixture.code}", got "${String(error.code)}".`);
    }
  }
  return verdict("C4", violations, `${String(checked)} failure(s) carried a namespaced code and a remediation.`);
}

// ---------------------------------------------------------------------------
// C5 — code registry
// ---------------------------------------------------------------------------

/**
 * Codes the fixtures actually produced, cross-checked against the descriptors.
 *
 * This is the half of C5 that keeps the generated projections honest: an MCP
 * tool advertises `errorCodes`, and a code emitted outside that list is one a
 * model was never told to expect.
 */
async function descriptorViolations(
  ops: OpsModule,
  manifest: ConformanceManifest,
): Promise<string[]> {
  if (manifest.descriptor === undefined) return [];
  let descriptors: readonly { name: string; verb: string; errorCodes: readonly string[]; lossCodes: readonly string[] }[];
  try {
    const loaded = (await import(manifest.descriptor)) as Record<string, unknown>;
    const candidate = loaded.default ?? Object.values(loaded).find(Array.isArray);
    if (!Array.isArray(candidate)) return [`descriptor module ${manifest.descriptor} exports no descriptor array.`];
    descriptors = candidate as typeof descriptors;
  } catch (error) {
    return [`could not load descriptors from ${manifest.descriptor}: ${String(error)}`];
  }

  const violations: string[] = [];
  for (const fixture of manifest.fixtures) {
    // A verb may have several qualified operations; any of them declaring the
    // code is enough, since the fixture does not say which qualifier it hit.
    const forVerb = descriptors.filter((descriptor) => descriptor.verb === fixture.verb);
    if (forVerb.length === 0) {
      violations.push(`${fixture.name}: verb "${fixture.verb}" has no descriptor, so its codes are undeclared.`);
      continue;
    }
    const declaredLosses = new Set(forVerb.flatMap((descriptor) => descriptor.lossCodes));
    const declaredErrors = new Set(forVerb.flatMap((descriptor) => descriptor.errorCodes));

    let envelope: OperationResult<unknown>;
    try {
      envelope = await invoke(ops, fixture);
    } catch {
      continue; // C2 reports this
    }
    for (const loss of lossesOf(envelope)) {
      if (!declaredLosses.has(loss.code)) {
        violations.push(`${fixture.name}: emitted loss ${String(loss.code)}, which "${fixture.verb}" does not declare.`);
      }
    }
    if (!envelope.ok && envelope.error?.code !== undefined && !declaredErrors.has(envelope.error.code)) {
      violations.push(
        `${fixture.name}: failed with ${String(envelope.error.code)}, which "${fixture.verb}" does not declare.`,
      );
    }
  }
  return [...new Set(violations)];
}

export async function gateC5(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const fromDescriptors = await descriptorViolations(ops, manifest);
  const scan = manifest.codeScan;
  if (scan === undefined) {
    return manifest.descriptor === undefined
      ? result("C5", "skip", "Neither a descriptor nor a codeScan declared; nothing to cross-check.")
      : verdict("C5", fromDescriptors, "Every emitted code is declared by its operation descriptor.");
  }
  const classified = new Set(scan.classified);
  const violations: string[] = [...fromDescriptors];
  const emitted = new Set<string>();

  for (const file of scan.files) {
    if (!existsSync(file)) {
      violations.push(`codeScan file missing: ${file}`);
      continue;
    }
    const source = await readFile(file, "utf8");
    const pattern = new RegExp(scan.pattern, "g");
    for (const match of source.matchAll(pattern)) {
      const code = match[1];
      if (code !== undefined) emitted.add(code);
    }
  }

  for (const code of [...emitted].sort()) {
    if (!classified.has(code)) {
      violations.push(`${code} is emitted by the engine but not classified — it would reach a caller unexplained (R17).`);
    }
  }
  // Independent of the descriptor findings above: an empty scan means the
  // pattern stopped matching, which would make this gate silently vacuous.
  if (emitted.size === 0) {
    violations.push("codeScan matched no codes at all; the pattern is almost certainly wrong.");
  }
  return verdict(
    "C5",
    violations,
    `${String(emitted.size)} engine code(s) classified${manifest.descriptor === undefined ? "" : "; every emitted code is declared by its descriptor"}.`,
  );
}

// ---------------------------------------------------------------------------
// C6 — no-throw
// ---------------------------------------------------------------------------

export async function gateC6(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  // Every exported verb, not just one. Fuzzing a single verb certified `render`
  // and left `validate`, `repair`, `transform`, `extract` and `diff` untested —
  // and all nine of those across the four engines threw a raw TypeError on a
  // non-bytes input, the exact R4 violation this gate exists to prevent.
  // `hostileVerb` now only *prioritises* a verb in the report, it no longer
  // narrows what is fuzzed.
  const verbs = operations(ops).map(([name]) => name).filter((name) => isVerb(name));
  if (verbs.length === 0) {
    return result("C6", "skip", "./ops exports no verbs to fuzz.");
  }

  const inputs = [...HOSTILE_INPUTS, ...(manifest.hostileInputs ?? [])];
  const violations: string[] = [];

  for (const verb of verbs) {
    const operation = ops[verb] as (i: unknown) => Promise<OperationResult<unknown>>;
    for (const input of inputs) {
      try {
        const envelope = await operation(input);
        if (typeof envelope?.ok !== "boolean") {
          violations.push(`${verb}(${describeInput(input)}): returned something that is not an envelope.`);
        }
      } catch (error) {
        violations.push(
          `${verb}(${describeInput(input)}): threw ${String((error as Error)?.name ?? "value")} — ${String((error as Error)?.message ?? error)}`,
        );
      }
    }
  }
  return verdict(
    "C6",
    violations,
    `${String(inputs.length)} hostile input(s) x ${String(verbs.length)} verb(s) produced results, not throws.`,
  );
}

// ---------------------------------------------------------------------------
// C7 / C8 / C10 — determinism, receipt honesty, locator stability
// ---------------------------------------------------------------------------

/**
 * Re-run the deterministic fixtures in a fresh process.
 *
 * A second call inside this process would share module state, caches and the
 * global determinism flag — precisely the things that make a render reproducible
 * by accident. C7 is only meaningful across process boundaries.
 */
async function runInFreshProcess(
  manifest: ConformanceManifest,
  fixtures: readonly ConformanceFixture[],
): Promise<Record<string, { outputHash?: string; locators: string[] }>> {
  // Fixture input crosses to the child as JSON, and JSON has no bytes: a Buffer
  // arrives as `{type:"Buffer",data:[...]}`. Handing that to a byte-input verb
  // makes the child fail while the parent succeeds, which C7 then reports as
  // non-determinism — a false positive that would hide real ones. Rehydrate on
  // arrival, at any depth, so `diff`'s `[before, after]` tuple survives too.
  const script = `
const ops = await import(${JSON.stringify(manifest.ops)});
const rehydrate = (value) => {
  if (Array.isArray(value)) return value.map(rehydrate);
  if (value === null || typeof value !== "object") return value;
  if (value.type === "Buffer" && Array.isArray(value.data)) return Buffer.from(value.data);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rehydrate(v)]));
};
const fixtures = JSON.parse(process.argv[1]).map((f) => ({ ...f, input: rehydrate(f.input) }));
const out = {};
for (const fixture of fixtures) {
  const envelope = await ops[fixture.verb](fixture.input, fixture.options);
  out[fixture.name] = {
    outputHash: envelope.ok ? envelope.receipt.outputHash : undefined,
    locators: (envelope.losses ?? [])
      .map((loss) => loss.locator)
      .filter(Boolean)
      .map((locator) => locator.artifact + "|" + JSON.stringify(locator.path)),
  };
}
process.stdout.write(JSON.stringify(out));
`;
  const payload = JSON.stringify(
    fixtures.map((fixture) => ({
      name: fixture.name,
      verb: fixture.verb,
      input: fixture.input,
      options: fixture.options ?? undefined,
    })),
  );
  const { stdout } = await run(process.execPath, ["--input-type=module", "-e", script, payload], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(stdout) as Record<string, { outputHash?: string; locators: string[] }>;
}

export async function gateC7C8C10(
  ops: OpsModule,
  manifest: ConformanceManifest,
): Promise<[GateResult, GateResult, GateResult]> {
  const candidates = manifest.fixtures.filter(
    (fixture) => fixture.expect === "ok" && fixture.nondeterministic === undefined,
  );
  if (candidates.length === 0) {
    const why = "No deterministic success fixtures declared.";
    return [result("C7", "skip", why), result("C8", "skip", why), result("C10", "skip", why)];
  }

  const c7: string[] = [];
  const c8: string[] = [];
  const c10: string[] = [];

  let fresh: Record<string, { outputHash?: string; locators: string[] }>;
  try {
    fresh = await runInFreshProcess(manifest, candidates);
  } catch (error) {
    const why = `Could not run the fixtures in a clean process: ${String(error)}`;
    return [result("C7", "fail", why), result("C8", "fail", why), result("C10", "fail", why)];
  }

  for (const fixture of candidates) {
    let envelope: OperationResult<unknown>;
    try {
      envelope = await invoke(ops, fixture);
    } catch (error) {
      c7.push(`${fixture.name}: ${String(error)}`);
      continue;
    }
    if (!envelope.ok) {
      c7.push(`${fixture.name}: expected success, got ${String(envelope.error?.code)}.`);
      continue;
    }
    const receipt = receiptOf(envelope);
    const other = fresh[fixture.name];

    if (receipt === undefined) {
      c8.push(`${fixture.name}: success envelope carries no receipt, so determinism is unverifiable.`);
    } else if (receipt.deterministic === true) {
      const sources = Array.isArray(receipt.nondeterminismSources) ? receipt.nondeterminismSources : [];
      if (other?.outputHash !== receipt.outputHash) {
        c7.push(
          `${fixture.name}: outputHash differs across processes (${String(receipt.outputHash)} vs ${String(other?.outputHash)}).`,
        );
        // C8 is the honesty claim: asserting determinism that C7 disproves.
        c8.push(`${fixture.name}: receipt claims deterministic: true, but C7 disproves it (R24).`);
      }
      if (sources.length > 0) {
        c8.push(`${fixture.name}: deterministic receipt lists nondeterminism sources.`);
      }
      if (receipt.producedAt !== undefined) {
        c8.push(`${fixture.name}: deterministic receipt carries producedAt, which R25 requires to be omitted.`);
      }
    } else if (!Array.isArray(receipt.nondeterminismSources) || receipt.nondeterminismSources.length === 0) {
      c8.push(`${fixture.name}: deterministic: false with no nondeterminismSources named (R26).`);
    }

    const local = lossesOf(envelope)
      .map((loss) => loss.locator)
      .filter((locator): locator is Locator => locator !== undefined)
      .map((locator) => `${locator.artifact}|${JSON.stringify(locator.path)}`);
    if (JSON.stringify(local) !== JSON.stringify(other?.locators ?? [])) {
      c10.push(`${fixture.name}: locator strings differ across processes.`);
    }
  }

  return [
    verdict("C7", c7, `${String(candidates.length)} fixture(s) byte-identical across two processes.`),
    verdict("C8", c8, "Receipts claim determinism only where C7 proves it."),
    verdict("C10", c10, "Locator strings are stable across processes."),
  ];
}

// ---------------------------------------------------------------------------
// C9 — locator round-trip
// ---------------------------------------------------------------------------

export async function gateC9(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const violations: string[] = [];
  let count = 0;
  for (const fixture of manifest.fixtures) {
    let envelope: OperationResult<unknown>;
    try {
      envelope = await invoke(ops, fixture);
    } catch {
      continue; // C2 already reports this
    }
    for (const loss of lossesOf(envelope)) {
      const { locator } = loss;
      if (locator === undefined) continue;
      count += 1;
      try {
        const text = formatLocator(locator);
        if (JSON.stringify(parseLocator(text)) !== JSON.stringify(locator)) {
          violations.push(`${fixture.name}: locator "${text}" does not survive parse(format(l)).`);
        }
        if (locator.domain !== manifest.domain) {
          violations.push(`${fixture.name}: locator domain "${locator.domain}" is not "${manifest.domain}".`);
        }
        if (!/^sha256:[0-9a-f]{64}$/.test(locator.artifact)) {
          violations.push(`${fixture.name}: locator artifact "${locator.artifact}" is not a sha256 binding (R22).`);
        }
      } catch (error) {
        violations.push(`${fixture.name}: locator could not be formatted — ${String(error)}`);
      }
    }
  }
  return verdict("C9", violations, `${String(count)} emitted locator(s) round-trip exactly.`);
}

// ---------------------------------------------------------------------------
// C11 / C12 — no silent loss, loss ordering
// ---------------------------------------------------------------------------

export async function gateC11(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const violations: string[] = [];
  let asserted = 0;
  let lossFreeFixtures = 0;

  for (const fixture of manifest.fixtures) {
    if (fixture.losses === undefined && fixture.lossFree !== true) continue;
    let envelope: OperationResult<unknown>;
    try {
      envelope = await invoke(ops, fixture);
    } catch (error) {
      violations.push(`${fixture.name}: ${String(error)}`);
      continue;
    }
    const losses = lossesOf(envelope);

    if (fixture.lossFree === true) {
      lossFreeFixtures += 1;
      if (losses.length > 0) {
        violations.push(
          `${fixture.name}: expected a clean ledger, got ${String(losses.length)} loss(es) [${losses.map((l) => String(l.code)).join(", ")}]. A ledger with false positives is not a ledger.`,
        );
      }
    }

    for (const expected of fixture.losses ?? []) {
      asserted += 1;
      const matches = losses.filter((loss) => loss.code === expected.code);
      if (matches.length === 0) {
        violations.push(
          `${fixture.name}: expected loss ${expected.code}, ledger held [${losses.map((l) => String(l.code)).join(", ") || "nothing"}] — this is the silent-loss failure mode C11 exists to catch.`,
        );
        continue;
      }
      const wrongSeverity = matches.filter((loss) => loss.severity !== expected.severity);
      if (wrongSeverity.length > 0) {
        violations.push(
          `${fixture.name}: ${expected.code} reported severity "${wrongSeverity[0]?.severity ?? "?"}", expected "${expected.severity}".`,
        );
      }
      if (expected.count !== undefined && matches.length !== expected.count) {
        violations.push(
          `${fixture.name}: expected ${String(expected.count)}× ${expected.code}, got ${String(matches.length)}.`,
        );
      }
      for (const loss of matches) {
        // R19: an avoidable loss without a fix is not actionable.
        if (loss.avoidable && (loss.remediation === undefined || loss.remediation.trim().length === 0)) {
          violations.push(`${fixture.name}: ${expected.code} is avoidable but names no remediation (R19).`);
        }
      }
    }
  }

  if (lossFreeFixtures === 0 && manifest.fixtures.length > 0) {
    violations.push(
      "No fixture asserts `lossFree: true`. R17 makes an empty ledger a positive claim, so a suite that never checks it cannot detect false positives.",
    );
  }
  if (violations.length > 0) {
    return result("C11", "fail", `${String(violations.length)} violation(s).`, violations);
  }

  // A suite that only ever asserts clean ledgers passes vacuously. C11 is
  // specified as adversarial — "fixtures whose faithful processing is known to
  // be impossible" — so say so rather than report a green gate that proves
  // nothing about the package's ability to detect loss.
  if (asserted === 0) {
    return result(
      "C11",
      "warn",
      `No adversarial fixture declares an expected loss; ${String(lossFreeFixtures)} clean-ledger fixture(s) only.`,
      [
        "C11 is the differentiator gate and it is passing vacuously here. Add at least one fixture whose faithful processing is known to be impossible (a restricted font, an unsupported chart type, vector-only artwork, RTL in a non-RTL target) and assert the loss it must produce.",
      ],
    );
  }
  return verdict("C11", violations, `${String(asserted)} expected loss(es) present; ${String(lossFreeFixtures)} clean-ledger fixture(s).`);
}

export async function gateC12(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const violations: string[] = [];
  const lossy = manifest.fixtures.filter((fixture) => (fixture.losses?.length ?? 0) > 0);
  if (lossy.length === 0) {
    return result("C12", "skip", "No lossy fixtures to order.");
  }
  for (const fixture of lossy) {
    const first = await invoke(ops, fixture);
    const second = await invoke(ops, fixture);
    if (JSON.stringify(lossesOf(first)) !== JSON.stringify(lossesOf(second))) {
      violations.push(`${fixture.name}: two identical runs produced different loss arrays.`);
      continue;
    }
    const losses = lossesOf(first);
    const sorted = [...losses].sort(compareLosses);
    if (JSON.stringify(sorted) !== JSON.stringify(losses)) {
      violations.push(`${fixture.name}: emitted losses are not in contract order (R18).`);
    }
  }
  return verdict("C12", violations, `${String(lossy.length)} lossy fixture(s) ordered identically across runs.`);
}

// ---------------------------------------------------------------------------
// C13 — export hygiene
// ---------------------------------------------------------------------------

/** OC-1 §4.2. Each entry names itself so a failure explains which rule it broke. */
const DENY_LIST: readonly { readonly label: string; readonly test: RegExp }[] = [
  { label: "phase-numbered internal", test: /^phase\d/i },
  { label: "phase-numbered internal", test: /Phase\d/ },
  { label: "test scaffolding", test: /[Ff]ixture/ },
  { label: "single-letter export", test: /^[A-Z]$/ },
  { label: "internal marker", test: /^(internal|_)/ },
];

/** Declared names in a built `.d.ts`, without parsing TypeScript. */
export function declaredNames(source: string): string[] {
  const names = new Set<string>();
  const declaration =
    /export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declaration)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  const braced = /export\s*(?:type\s*)?\{([^}]*)\}/g;
  for (const match of source.matchAll(braced)) {
    for (const raw of (match[1] ?? "").split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name !== undefined && name.length > 0 && name !== "type") names.add(name);
    }
  }
  return [...names];
}

async function scanSurface(path: string): Promise<string[]> {
  if (!existsSync(path)) return [`declaration file missing: ${path}`];
  const source = await readFile(path, "utf8");
  const violations: string[] = [];
  for (const name of declaredNames(source)) {
    for (const rule of DENY_LIST) {
      if (rule.test.test(name)) {
        violations.push(`${name}: ${rule.label} (OC-1 §4.2).`);
        break;
      }
    }
  }
  return violations;
}

export async function gateC13(manifest: ConformanceManifest): Promise<GateResult> {
  const surfaces = manifest.surfaces;
  if (surfaces === undefined) {
    return result("C13", "skip", "No built surfaces declared.");
  }
  const opsViolations = surfaces.ops !== undefined ? await scanSurface(surfaces.ops) : [];
  const rootViolations = surfaces.root !== undefined ? await scanSurface(surfaces.root) : [];

  if (opsViolations.length > 0) {
    return result("C13", "fail", `${String(opsViolations.length)} deny-listed export(s) on ./ops.`, [
      ...opsViolations,
      ...rootViolations.map((violation) => `[root, deprecating] ${violation}`),
    ]);
  }
  if (rootViolations.length > 0) {
    // Decision of 2026-08-12: the root surface keeps these through the §9.5
    // deprecation window, so they are reported without failing the build.
    return result(
      "C13",
      "warn",
      `${String(rootViolations.length)} deny-listed export(s) on the root entry, scheduled for removal at the next major.`,
      rootViolations,
    );
  }
  return result("C13", "pass", "No deny-listed exports.");
}

// ---------------------------------------------------------------------------
// C15 — cancellation
// ---------------------------------------------------------------------------

export async function gateC15(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  const fixture = manifest.fixtures.find((candidate) => candidate.expect === "ok");
  if (fixture === undefined) {
    return result("C15", "skip", "No success fixture to cancel.");
  }
  const violations: string[] = [];

  try {
    const envelope = await invoke(ops, { ...fixture, options: { ...fixture.options, signal: AbortSignal.abort() } });
    if (envelope.ok) {
      violations.push("An already-aborted signal produced a success envelope.");
    } else if (envelope.error.code !== OPERATION_CANCELLED) {
      violations.push(`Aborted signal produced ${String(envelope.error.code)}, expected ${OPERATION_CANCELLED}.`);
    }
  } catch (error) {
    violations.push(`Aborted signal threw instead of returning (R29): ${String(error)}`);
  }

  try {
    const envelope = await invoke(ops, { ...fixture, options: { ...fixture.options, timeoutMs: 1 } });
    // A fast operation may legitimately finish inside 1ms; only a throw is a failure.
    if (!envelope.ok && envelope.error.code !== OPERATION_TIMEOUT && envelope.error.code !== OPERATION_CANCELLED) {
      violations.push(`timeoutMs produced ${String(envelope.error.code)}, expected ${OPERATION_TIMEOUT}.`);
    }
  } catch (error) {
    violations.push(`timeoutMs threw instead of returning (R29): ${String(error)}`);
  }

  return verdict("C15", violations, "signal and timeoutMs yield typed results, never thrown AbortErrors.");
}

// ---------------------------------------------------------------------------
// C16 — API report
// ---------------------------------------------------------------------------

/**
 * Build the committed surface record for a package.
 *
 * Deliberately the export *names* rather than full api-extractor output: R38's
 * purpose is that a surface change cannot land without an explicit decision, and
 * a diffable name set delivers that today without adding a toolchain to every
 * package. Signatures can be layered in later without changing the gate.
 */
export async function buildApiReport(manifest: ConformanceManifest): Promise<string> {
  const sections: string[] = [
    `# ${manifest.package} — public surface`,
    "",
    "Generated by `pnpm contract:verify --update-api`. Do not edit by hand.",
    "A diff here means the public surface moved; that needs a version decision (OC-1 R38).",
    "",
  ];
  for (const [label, path] of [
    ["./ops", manifest.surfaces?.ops],
    [".", manifest.surfaces?.root],
  ] as const) {
    if (path === undefined || !existsSync(path)) continue;
    const names = declaredNames(await readFile(path, "utf8")).sort((a, b) => a.localeCompare(b));
    sections.push(`## ${label}`, "");
    for (const name of names) sections.push(`- ${name}`);
    sections.push("");
  }
  return sections.join("\n");
}

export async function gateC16(manifest: ConformanceManifest): Promise<GateResult> {
  if (manifest.apiReport === undefined) {
    return result("C16", "skip", "No API report declared.");
  }
  const expected = await buildApiReport(manifest);
  if (!existsSync(manifest.apiReport)) {
    return result("C16", "fail", `Missing API report at ${manifest.apiReport}.`, [
      "Run `pnpm contract:verify --update-api` and commit the result, so a surface change needs an explicit version decision (R38).",
    ]);
  }
  const committed = await readFile(manifest.apiReport, "utf8");
  if (committed.trim() !== expected.trim()) {
    return result("C16", "fail", "The built surface no longer matches the committed API report.", [
      "Review the change: adding an export is a minor, removing or repurposing one is a major (§9.1).",
      "Then run `pnpm contract:verify --update-api` to record it.",
    ]);
  }
  return result("C16", "pass", "Built surface matches the committed API report.");
}

// ---------------------------------------------------------------------------
// C17 — operation identity
// ---------------------------------------------------------------------------

/**
 * A receipt must name an operation the registry actually contains.
 *
 * The receipt is the provenance record and the thing the governance rung is
 * sold on. If it says `pdf.extract` while the catalog knows only
 * `pdf.extract.signatures`, nothing downstream can join the two: not an audit
 * query, not a usage report, not a customer asking which operation produced a
 * file. `pdf.extract` shipped that way until this gate was written.
 *
 * The check also closes the qualifier hole from the other end. A projection
 * that resolves a qualified descriptor and then calls the base verb produces a
 * receipt for the *default* operation, so the mismatch shows up here even when
 * the returned bytes look plausible.
 */
export async function gateC17(ops: OpsModule, manifest: ConformanceManifest): Promise<GateResult> {
  if (manifest.descriptor === undefined) {
    return result("C17", "skip", "No descriptor declared; there is no catalog to check receipts against.");
  }

  let names: Set<string>;
  try {
    const loaded = (await import(manifest.descriptor)) as Record<string, unknown>;
    const candidate = loaded.default ?? Object.values(loaded).find(Array.isArray);
    if (!Array.isArray(candidate)) {
      return result("C17", "fail", `Descriptor module ${manifest.descriptor} exports no descriptor array.`);
    }
    names = new Set((candidate as { name?: unknown }[]).map((d) => String(d.name)));
  } catch (error) {
    return result("C17", "fail", `Could not load descriptors from ${manifest.descriptor}: ${String(error)}`);
  }

  const violations: string[] = [];
  let checked = 0;
  for (const fixture of manifest.fixtures) {
    let envelope: OperationResult<unknown>;
    try {
      envelope = await invoke(ops, fixture);
    } catch {
      // C6 owns throwing operations; this gate only judges receipts it receives.
      continue;
    }
    const operation = receiptOf(envelope)?.operation;
    if (typeof operation !== "string") continue;
    checked += 1;
    if (!names.has(operation)) {
      violations.push(
        `${fixture.name}: receipt claims "${operation}", which is not a registered operation. A receipt that cannot be resolved against the catalog cannot serve as provenance.`,
      );
    } else if (operation !== fixture.operation) {
      violations.push(
        `${fixture.name}: fixture exercises "${fixture.operation}", but its receipt names "${operation}". Qualifier dispatch reached the wrong operation.`,
      );
    }
  }

  if (checked === 0) {
    return result("C17", "warn", "No fixture produced a receipt, so operation identity was never exercised.", [
      "Add at least one fixture whose result carries a receipt; otherwise this gate passes without checking anything.",
    ]);
  }
  return verdict("C17", violations, `${String(checked)} receipt(s) name a registered operation.`);
}

// ---------------------------------------------------------------------------
// C18 — operation coverage
// ---------------------------------------------------------------------------

/**
 * Every descriptor is exercised by operation identity, not merely by verb.
 *
 * A verb is not an operation: `pdf.inspect.form` and
 * `pdf.inspect.redaction-preview` share one exported function but dispatch to
 * different implementations. Coverage therefore belongs to the exact
 * descriptor and includes the qualifier binding that proves the fixture can
 * actually reach it.
 */
export async function gateC18(manifest: ConformanceManifest): Promise<GateResult> {
  if (manifest.descriptor === undefined) {
    return result("C18", "skip", "No descriptor declared; there is no catalog to measure coverage against.");
  }

  interface CoverageDescriptor {
    readonly name: string;
    readonly verb: string;
    readonly stability: string;
    readonly qualifier?: { readonly option: string; readonly value: string };
  }

  let descriptors: CoverageDescriptor[];
  try {
    const loaded = (await import(manifest.descriptor)) as Record<string, unknown>;
    const candidate = loaded.default ?? Object.values(loaded).find(Array.isArray);
    if (!Array.isArray(candidate)) {
      return result("C18", "fail", `Descriptor module ${manifest.descriptor} exports no descriptor array.`);
    }
    descriptors = candidate as CoverageDescriptor[];
  } catch (error) {
    return result("C18", "fail", `Could not load descriptors from ${manifest.descriptor}: ${String(error)}`);
  }

  const violations: string[] = [];
  const byName = new Map<string, CoverageDescriptor>();
  for (const [index, descriptor] of descriptors.entries()) {
    if (typeof descriptor?.name !== "string" || typeof descriptor.verb !== "string") {
      violations.push(`descriptor ${String(index)} has no string name and verb.`);
      continue;
    }
    if (byName.has(descriptor.name)) {
      violations.push(`descriptor identity "${descriptor.name}" is declared more than once.`);
      continue;
    }
    byName.set(descriptor.name, descriptor);
  }

  const coverage = new Map<string, Set<string>>();
  const validKinds = new Set(["nominal", "hostile", "boundary"]);
  for (const fixture of manifest.fixtures) {
    const claimed = (fixture as { operation?: unknown }).operation;
    const kind = (fixture as { kind?: unknown }).kind;
    let valid = true;

    if (typeof claimed !== "string" || claimed.length === 0) {
      violations.push(`${fixture.name}: fixture is missing an exact operation identity.`);
      valid = false;
    }
    if (typeof kind !== "string" || !validKinds.has(kind)) {
      violations.push(`${fixture.name}: fixture kind must be nominal, hostile, or boundary.`);
      valid = false;
    }

    const descriptor = typeof claimed === "string" ? byName.get(claimed) : undefined;
    if (typeof claimed === "string" && descriptor === undefined) {
      violations.push(`${fixture.name}: claims unknown operation "${claimed}".`);
      valid = false;
    }
    if (descriptor !== undefined && descriptor.verb !== fixture.verb) {
      violations.push(
        `${fixture.name}: claims "${descriptor.name}" but invokes verb "${fixture.verb}" instead of "${descriptor.verb}".`,
      );
      valid = false;
    }

    const forVerb = descriptors.filter((candidate) => candidate.verb === fixture.verb);
    const options = fixture.options as Record<string, unknown> | undefined;
    const matches = forVerb.filter((candidate) => {
      if (candidate.qualifier === undefined) return forVerb.length === 1;
      return options?.[candidate.qualifier.option] === candidate.qualifier.value;
    });
    if (matches.length === 0) {
      const expected = descriptor?.qualifier;
      violations.push(
        expected === undefined
          ? `${fixture.name}: its options do not resolve to any descriptor for verb "${fixture.verb}".`
          : `${fixture.name}: operation "${String(claimed)}" requires options.${expected.option} = "${expected.value}".`,
      );
      valid = false;
    } else if (matches.length > 1) {
      violations.push(
        `${fixture.name}: qualifier options ambiguously resolve to ${matches.map((match) => `"${match.name}"`).join(", ")}.`,
      );
      valid = false;
    } else if (matches[0]?.name !== claimed) {
      violations.push(
        `${fixture.name}: claims "${String(claimed)}" but its verb and qualifier options resolve to "${String(matches[0]?.name)}".`,
      );
      valid = false;
    }

    if (valid && typeof claimed === "string" && typeof kind === "string") {
      const kinds = coverage.get(claimed) ?? new Set<string>();
      kinds.add(kind);
      coverage.set(claimed, kinds);
    }
  }

  for (const descriptor of [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const kinds = coverage.get(descriptor.name) ?? new Set<string>();
    if (!kinds.has("nominal")) {
      violations.push(`${descriptor.name}: missing nominal fixture coverage.`);
    }
    if (descriptor.stability === "stable") {
      if (!kinds.has("hostile")) violations.push(`${descriptor.name}: stable operation is missing hostile fixture coverage.`);
      if (!kinds.has("boundary")) violations.push(`${descriptor.name}: stable operation is missing boundary fixture coverage.`);
    }
  }

  return verdict(
    "C18",
    violations,
    `All ${String(byName.size)} registered operation(s) have exact identity and required fixture-kind coverage.`,
  );
}
