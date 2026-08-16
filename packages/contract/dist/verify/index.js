import { CONTRACT_VERSION, isVerb, isPaperError, formatLocator, parseLocator, compareLosses, OPERATION_CANCELLED, OPERATION_TIMEOUT } from '../chunk-F26VKRFR.js';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

// src/verify/hostile.ts
function unhashable() {
  const cyclic = { title: "cycle" };
  cyclic.self = cyclic;
  const deep = {};
  let cursor = deep;
  for (let index = 0; index < 500; index += 1) {
    const next = {};
    cursor.child = next;
    cursor = next;
  }
  return [
    void 0,
    null,
    cyclic,
    deep,
    /* @__PURE__ */ new Date(0),
    Number.NaN,
    Number.POSITIVE_INFINITY,
    10n,
    /* @__PURE__ */ Symbol("hostile"),
    () => "not a document"
  ];
}
function malformed() {
  return [
    {},
    [],
    "",
    "not a document",
    0,
    false,
    { pages: null },
    { pages: "many" },
    { pages: [{ children: null }] },
    { pages: [{ children: [{ type: "\0" }] }] },
    { pages: Array.from({ length: 3 }, () => ({ children: [{ type: void 0 }] })) },
    new Uint8Array([0, 1, 2, 3]),
    Buffer.from("%PDF-1.7 truncated")
  ];
}
var HOSTILE_INPUTS = Object.freeze([...unhashable(), ...malformed()]);
function describeInput(value) {
  if (value === void 0) return "undefined";
  if (value === null) return "null";
  if (typeof value === "bigint") return `${String(value)}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "function";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  if (value instanceof Date) return "Date";
  if (value instanceof Uint8Array) return `Uint8Array(${String(value.byteLength)})`;
  try {
    const text = JSON.stringify(value);
    if (text === void 0) return typeof value;
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  } catch {
    return "cyclic object";
  }
}

// src/verify/types.ts
var GATE_IDS = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
  "C10",
  "C11",
  "C12",
  "C13",
  "C14",
  "C15",
  "C16",
  "C17",
  "C18"
];
var GATE_TITLES = {
  C1: "Signature",
  C2: "Envelope",
  C3: "Serialization",
  C4: "Errors",
  C5: "Code registry",
  C6: "No-throw",
  C7: "Determinism",
  C8: "Receipt honesty",
  C9: "Locator round-trip",
  C10: "Locator stability",
  C11: "No silent loss",
  C12: "Loss ordering",
  C13: "Export hygiene",
  C14: "Verb vocabulary",
  C15: "Cancellation",
  C16: "API report",
  C17: "Operation identity",
  C18: "Operation coverage"
};

// src/verify/gates.ts
var run = promisify(execFile);
function result(gate, status, summary, details) {
  return {
    gate,
    title: GATE_TITLES[gate],
    status,
    summary,
    ...details !== void 0 && details.length > 0 ? { details } : {}
  };
}
function verdict(gate, violations, passSummary) {
  return violations.length === 0 ? result(gate, "pass", passSummary) : result(gate, "fail", `${String(violations.length)} violation(s).`, violations);
}
function operations(ops) {
  return Object.entries(ops).filter(
    (entry) => typeof entry[1] === "function"
  );
}
function lossesOf(envelope) {
  const candidate = envelope?.losses;
  return Array.isArray(candidate) ? candidate : [];
}
function receiptOf(envelope) {
  const candidate = envelope?.receipt;
  return typeof candidate === "object" && candidate !== null ? candidate : void 0;
}
async function invoke(ops, fixture) {
  const operation = ops[fixture.verb];
  if (typeof operation !== "function") {
    throw new Error(`Fixture "${fixture.name}" needs verb "${fixture.verb}", which ./ops does not export.`);
  }
  return await operation(
    fixture.input,
    fixture.options
  );
}
function gateC1(ops) {
  const violations = [];
  for (const [name, fn] of operations(ops)) {
    if (!isVerb(name)) continue;
    if (fn.length > 2) {
      violations.push(`${name}: declares ${String(fn.length)} parameters; OC-1 R1 allows at most two (input, options).`);
    }
  }
  if (operations(ops).length === 0) {
    violations.push("./ops exports no operations at all.");
  }
  return verdict("C1", violations, `${String(operations(ops).length)} operation(s) accept (input, options?).`);
}
function gateC14(ops) {
  const violations = [];
  for (const [name, value] of Object.entries(ops)) {
    if (typeof value === "function") {
      if (!isVerb(name)) {
        violations.push(
          `${name}: not a canonical verb. R35 permits only verbs and types on ./ops \u2014 move helpers to the package root.`
        );
      }
      continue;
    }
    violations.push(`${name}: a non-function value on ./ops. R35 forbids helpers, constants and classes.`);
  }
  return verdict("C14", violations, "Every ./ops export is a canonical verb.");
}
function envelopeViolations(label, envelope) {
  const problems = [];
  if (typeof envelope !== "object" || envelope === null) {
    return [`${label}: did not return an object.`];
  }
  const value = envelope;
  if (typeof value.ok !== "boolean") problems.push(`${label}: "ok" is not a boolean.`);
  if (!Array.isArray(value.losses)) problems.push(`${label}: "losses" is not an array (R7).`);
  if (!Array.isArray(value.diagnostics)) problems.push(`${label}: "diagnostics" is not an array (R7).`);
  if (value.ok === true) {
    if (!("value" in value)) problems.push(`${label}: success envelope has no "value".`);
    if (value.receipt === void 0) problems.push(`${label}: success envelope has no receipt.`);
  } else {
    if (value.error === void 0) problems.push(`${label}: failure envelope has no "error".`);
    if ("value" in value) problems.push(`${label}: failure envelope carries a "value" (R8 forbids a partial channel).`);
  }
  return problems;
}
async function gateC2(ops, manifest) {
  const violations = [];
  for (const fixture of manifest.fixtures) {
    try {
      violations.push(...envelopeViolations(fixture.name, await invoke(ops, fixture)));
    } catch (error) {
      violations.push(`${fixture.name}: threw instead of returning an envelope \u2014 ${String(error)}`);
    }
  }
  return verdict("C2", violations, `${String(manifest.fixtures.length)} fixture(s) returned a well-formed envelope.`);
}
function stripBytes(envelope) {
  return JSON.parse(
    JSON.stringify(envelope, (key, value) => key === "bytes" ? void 0 : value)
  );
}
async function gateC3(ops, manifest) {
  const violations = [];
  for (const fixture of manifest.fixtures) {
    try {
      const envelope = await invoke(ops, fixture);
      const once = stripBytes(envelope);
      const twice = stripBytes(JSON.parse(JSON.stringify(once)));
      if (JSON.stringify(once) !== JSON.stringify(twice)) {
        violations.push(`${fixture.name}: envelope is not stable across a JSON round-trip.`);
      }
      if (!envelope.ok) {
        const restored = once.error;
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
async function gateC4(ops, manifest) {
  const violations = [];
  let checked = 0;
  for (const fixture of manifest.fixtures) {
    let envelope;
    try {
      envelope = await invoke(ops, fixture);
    } catch (error2) {
      violations.push(`${fixture.name}: ${String(error2)}`);
      continue;
    }
    if (fixture.expect === "fail" && envelope.ok) {
      violations.push(`${fixture.name}: expected a failure, got success.`);
      continue;
    }
    if (fixture.expect === "ok" && !envelope.ok) {
      violations.push(
        `${fixture.name}: expected success, got ${String(envelope.error?.code)} \u2014 ${String(envelope.error?.message)}`
      );
      continue;
    }
    if (envelope.ok) continue;
    checked += 1;
    const error = envelope.error;
    if (error === void 0) {
      violations.push(`${fixture.name}: failure envelope carries no error.`);
      continue;
    }
    if (!isPaperError(error)) violations.push(`${fixture.name}: error is not a PaperError.`);
    if (!String(error.code).startsWith(`${manifest.domain}/`) && !String(error.code).startsWith("common/")) {
      violations.push(`${fixture.name}: code "${String(error.code)}" is namespaced to neither "${manifest.domain}/" nor "common/".`);
    }
    if (typeof error.remediation !== "string" || error.remediation.trim().length === 0) {
      violations.push(`${fixture.name}: remediation is empty (R10 \u2014 an error a caller cannot act on is a bug).`);
    }
    if (fixture.code !== void 0 && error.code !== fixture.code) {
      violations.push(`${fixture.name}: expected code "${fixture.code}", got "${String(error.code)}".`);
    }
  }
  return verdict("C4", violations, `${String(checked)} failure(s) carried a namespaced code and a remediation.`);
}
async function descriptorViolations(ops, manifest) {
  if (manifest.descriptor === void 0) return [];
  let descriptors;
  try {
    const loaded = await import(manifest.descriptor);
    const candidate = loaded.default ?? Object.values(loaded).find(Array.isArray);
    if (!Array.isArray(candidate)) return [`descriptor module ${manifest.descriptor} exports no descriptor array.`];
    descriptors = candidate;
  } catch (error) {
    return [`could not load descriptors from ${manifest.descriptor}: ${String(error)}`];
  }
  const violations = [];
  for (const fixture of manifest.fixtures) {
    const forVerb = descriptors.filter((descriptor) => descriptor.verb === fixture.verb);
    if (forVerb.length === 0) {
      violations.push(`${fixture.name}: verb "${fixture.verb}" has no descriptor, so its codes are undeclared.`);
      continue;
    }
    const declaredLosses = new Set(forVerb.flatMap((descriptor) => descriptor.lossCodes));
    const declaredErrors = new Set(forVerb.flatMap((descriptor) => descriptor.errorCodes));
    let envelope;
    try {
      envelope = await invoke(ops, fixture);
    } catch {
      continue;
    }
    for (const loss of lossesOf(envelope)) {
      if (!declaredLosses.has(loss.code)) {
        violations.push(`${fixture.name}: emitted loss ${String(loss.code)}, which "${fixture.verb}" does not declare.`);
      }
    }
    if (!envelope.ok && envelope.error?.code !== void 0 && !declaredErrors.has(envelope.error.code)) {
      violations.push(
        `${fixture.name}: failed with ${String(envelope.error.code)}, which "${fixture.verb}" does not declare.`
      );
    }
  }
  return [...new Set(violations)];
}
async function gateC5(ops, manifest) {
  const fromDescriptors = await descriptorViolations(ops, manifest);
  const scan = manifest.codeScan;
  if (scan === void 0) {
    return manifest.descriptor === void 0 ? result("C5", "skip", "Neither a descriptor nor a codeScan declared; nothing to cross-check.") : verdict("C5", fromDescriptors, "Every emitted code is declared by its operation descriptor.");
  }
  const classified = new Set(scan.classified);
  const violations = [...fromDescriptors];
  const emitted = /* @__PURE__ */ new Set();
  for (const file of scan.files) {
    if (!existsSync(file)) {
      violations.push(`codeScan file missing: ${file}`);
      continue;
    }
    const source = await readFile(file, "utf8");
    const pattern = new RegExp(scan.pattern, "g");
    for (const match of source.matchAll(pattern)) {
      const code = match[1];
      if (code !== void 0) emitted.add(code);
    }
  }
  for (const code of [...emitted].sort()) {
    if (!classified.has(code)) {
      violations.push(`${code} is emitted by the engine but not classified \u2014 it would reach a caller unexplained (R17).`);
    }
  }
  if (emitted.size === 0) {
    violations.push("codeScan matched no codes at all; the pattern is almost certainly wrong.");
  }
  return verdict(
    "C5",
    violations,
    `${String(emitted.size)} engine code(s) classified${manifest.descriptor === void 0 ? "" : "; every emitted code is declared by its descriptor"}.`
  );
}
async function gateC6(ops, manifest) {
  const verbs = operations(ops).map(([name]) => name).filter((name) => isVerb(name));
  if (verbs.length === 0) {
    return result("C6", "skip", "./ops exports no verbs to fuzz.");
  }
  const inputs = [...HOSTILE_INPUTS, ...manifest.hostileInputs ?? []];
  const violations = [];
  for (const verb of verbs) {
    const operation = ops[verb];
    for (const input of inputs) {
      try {
        const envelope = await operation(input);
        if (typeof envelope?.ok !== "boolean") {
          violations.push(`${verb}(${describeInput(input)}): returned something that is not an envelope.`);
        }
      } catch (error) {
        violations.push(
          `${verb}(${describeInput(input)}): threw ${String(error?.name ?? "value")} \u2014 ${String(error?.message ?? error)}`
        );
      }
    }
  }
  return verdict(
    "C6",
    violations,
    `${String(inputs.length)} hostile input(s) x ${String(verbs.length)} verb(s) produced results, not throws.`
  );
}
async function runInFreshProcess(manifest, fixtures) {
  const script = `
const { readFile } = await import("node:fs/promises");
const ops = await import(${JSON.stringify(manifest.ops)});
const rehydrate = (value) => {
  if (Array.isArray(value)) return value.map(rehydrate);
  if (value === null || typeof value !== "object") return value;
  if (value.type === "Buffer" && Array.isArray(value.data)) return Buffer.from(value.data);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rehydrate(v)]));
};
const fixtures = JSON.parse(await readFile(process.argv[1], "utf8")).map((f) => ({ ...f, input: rehydrate(f.input) }));
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
      options: fixture.options ?? void 0
    }))
  );
  const temporary = await mkdtemp(join(tmpdir(), "runstamp-conformance-"));
  const payloadPath = join(temporary, "fixtures.json");
  try {
    await writeFile(payloadPath, payload, { encoding: "utf8", mode: 384 });
    const { stdout } = await run(process.execPath, ["--input-type=module", "-e", script, payloadPath], {
      maxBuffer: 32 * 1024 * 1024
    });
    return JSON.parse(stdout);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
async function gateC7C8C10(ops, manifest) {
  const candidates = manifest.fixtures.filter(
    (fixture) => fixture.expect === "ok" && fixture.nondeterministic === void 0
  );
  if (candidates.length === 0) {
    const why = "No deterministic success fixtures declared.";
    return [result("C7", "skip", why), result("C8", "skip", why), result("C10", "skip", why)];
  }
  const c7 = [];
  const c8 = [];
  const c10 = [];
  let fresh;
  try {
    fresh = await runInFreshProcess(manifest, candidates);
  } catch (error) {
    const why = `Could not run the fixtures in a clean process: ${String(error)}`;
    return [result("C7", "fail", why), result("C8", "fail", why), result("C10", "fail", why)];
  }
  for (const fixture of candidates) {
    let envelope;
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
    if (receipt === void 0) {
      c8.push(`${fixture.name}: success envelope carries no receipt, so determinism is unverifiable.`);
    } else if (receipt.deterministic === true) {
      const sources = Array.isArray(receipt.nondeterminismSources) ? receipt.nondeterminismSources : [];
      if (other?.outputHash !== receipt.outputHash) {
        c7.push(
          `${fixture.name}: outputHash differs across processes (${String(receipt.outputHash)} vs ${String(other?.outputHash)}).`
        );
        c8.push(`${fixture.name}: receipt claims deterministic: true, but C7 disproves it (R24).`);
      }
      if (sources.length > 0) {
        c8.push(`${fixture.name}: deterministic receipt lists nondeterminism sources.`);
      }
      if (receipt.producedAt !== void 0) {
        c8.push(`${fixture.name}: deterministic receipt carries producedAt, which R25 requires to be omitted.`);
      }
    } else if (!Array.isArray(receipt.nondeterminismSources) || receipt.nondeterminismSources.length === 0) {
      c8.push(`${fixture.name}: deterministic: false with no nondeterminismSources named (R26).`);
    }
    const local = lossesOf(envelope).map((loss) => loss.locator).filter((locator) => locator !== void 0).map((locator) => `${locator.artifact}|${JSON.stringify(locator.path)}`);
    if (JSON.stringify(local) !== JSON.stringify(other?.locators ?? [])) {
      c10.push(`${fixture.name}: locator strings differ across processes.`);
    }
  }
  return [
    verdict("C7", c7, `${String(candidates.length)} fixture(s) byte-identical across two processes.`),
    verdict("C8", c8, "Receipts claim determinism only where C7 proves it."),
    verdict("C10", c10, "Locator strings are stable across processes.")
  ];
}
async function gateC9(ops, manifest) {
  const violations = [];
  let count = 0;
  for (const fixture of manifest.fixtures) {
    let envelope;
    try {
      envelope = await invoke(ops, fixture);
    } catch {
      continue;
    }
    for (const loss of lossesOf(envelope)) {
      const { locator } = loss;
      if (locator === void 0) continue;
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
        violations.push(`${fixture.name}: locator could not be formatted \u2014 ${String(error)}`);
      }
    }
  }
  return verdict("C9", violations, `${String(count)} emitted locator(s) round-trip exactly.`);
}
async function gateC11(ops, manifest) {
  const violations = [];
  let asserted = 0;
  let lossFreeFixtures = 0;
  for (const fixture of manifest.fixtures) {
    if (fixture.losses === void 0 && fixture.lossFree !== true) continue;
    let envelope;
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
          `${fixture.name}: expected a clean ledger, got ${String(losses.length)} loss(es) [${losses.map((l) => String(l.code)).join(", ")}]. A ledger with false positives is not a ledger.`
        );
      }
    }
    for (const expected of fixture.losses ?? []) {
      asserted += 1;
      const matches2 = losses.filter((loss) => loss.code === expected.code);
      if (matches2.length === 0) {
        violations.push(
          `${fixture.name}: expected loss ${expected.code}, ledger held [${losses.map((l) => String(l.code)).join(", ") || "nothing"}] \u2014 this is the silent-loss failure mode C11 exists to catch.`
        );
        continue;
      }
      const wrongSeverity = matches2.filter((loss) => loss.severity !== expected.severity);
      if (wrongSeverity.length > 0) {
        violations.push(
          `${fixture.name}: ${expected.code} reported severity "${wrongSeverity[0]?.severity ?? "?"}", expected "${expected.severity}".`
        );
      }
      if (expected.count !== void 0 && matches2.length !== expected.count) {
        violations.push(
          `${fixture.name}: expected ${String(expected.count)}\xD7 ${expected.code}, got ${String(matches2.length)}.`
        );
      }
      for (const loss of matches2) {
        if (loss.avoidable && (loss.remediation === void 0 || loss.remediation.trim().length === 0)) {
          violations.push(`${fixture.name}: ${expected.code} is avoidable but names no remediation (R19).`);
        }
      }
    }
  }
  if (lossFreeFixtures === 0 && manifest.fixtures.length > 0) {
    violations.push(
      "No fixture asserts `lossFree: true`. R17 makes an empty ledger a positive claim, so a suite that never checks it cannot detect false positives."
    );
  }
  if (violations.length > 0) {
    return result("C11", "fail", `${String(violations.length)} violation(s).`, violations);
  }
  if (asserted === 0) {
    return result(
      "C11",
      "warn",
      `No adversarial fixture declares an expected loss; ${String(lossFreeFixtures)} clean-ledger fixture(s) only.`,
      [
        "C11 is the differentiator gate and it is passing vacuously here. Add at least one fixture whose faithful processing is known to be impossible (a restricted font, an unsupported chart type, vector-only artwork, RTL in a non-RTL target) and assert the loss it must produce."
      ]
    );
  }
  return verdict("C11", violations, `${String(asserted)} expected loss(es) present; ${String(lossFreeFixtures)} clean-ledger fixture(s).`);
}
async function gateC12(ops, manifest) {
  const violations = [];
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
var DENY_LIST = [
  { label: "phase-numbered internal", test: /^phase\d/i },
  { label: "phase-numbered internal", test: /Phase\d/ },
  { label: "test scaffolding", test: /[Ff]ixture/ },
  { label: "single-letter export", test: /^[A-Z]$/ },
  { label: "internal marker", test: /^(internal|_)/ }
];
function declaredNames(source) {
  const names = /* @__PURE__ */ new Set();
  const declaration = /export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declaration)) {
    if (match[1] !== void 0) names.add(match[1]);
  }
  const braced = /export\s*(?:type\s*)?\{([^}]*)\}/g;
  for (const match of source.matchAll(braced)) {
    for (const raw of (match[1] ?? "").split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name !== void 0 && name.length > 0 && name !== "type") names.add(name);
    }
  }
  return [...names];
}
async function scanSurface(path) {
  if (!existsSync(path)) return [`declaration file missing: ${path}`];
  const source = await readFile(path, "utf8");
  const violations = [];
  for (const name of declaredNames(source)) {
    for (const rule of DENY_LIST) {
      if (rule.test.test(name)) {
        violations.push(`${name}: ${rule.label} (OC-1 \xA74.2).`);
        break;
      }
    }
  }
  return violations;
}
async function gateC13(manifest) {
  const surfaces = manifest.surfaces;
  if (surfaces === void 0) {
    return result("C13", "skip", "No built surfaces declared.");
  }
  const opsViolations = surfaces.ops !== void 0 ? await scanSurface(surfaces.ops) : [];
  const rootViolations = surfaces.root !== void 0 ? await scanSurface(surfaces.root) : [];
  if (opsViolations.length > 0) {
    return result("C13", "fail", `${String(opsViolations.length)} deny-listed export(s) on ./ops.`, [
      ...opsViolations,
      ...rootViolations.map((violation) => `[root, deprecating] ${violation}`)
    ]);
  }
  if (rootViolations.length > 0) {
    return result(
      "C13",
      "warn",
      `${String(rootViolations.length)} deny-listed export(s) on the root entry, scheduled for removal at the next major.`,
      rootViolations
    );
  }
  return result("C13", "pass", "No deny-listed exports.");
}
async function gateC15(ops, manifest) {
  const fixture = manifest.fixtures.find((candidate) => candidate.expect === "ok");
  if (fixture === void 0) {
    return result("C15", "skip", "No success fixture to cancel.");
  }
  const violations = [];
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
    if (!envelope.ok && envelope.error.code !== OPERATION_TIMEOUT && envelope.error.code !== OPERATION_CANCELLED) {
      violations.push(`timeoutMs produced ${String(envelope.error.code)}, expected ${OPERATION_TIMEOUT}.`);
    }
  } catch (error) {
    violations.push(`timeoutMs threw instead of returning (R29): ${String(error)}`);
  }
  return verdict("C15", violations, "signal and timeoutMs yield typed results, never thrown AbortErrors.");
}
async function buildApiReport(manifest) {
  const sections = [
    `# ${manifest.package} \u2014 public surface`,
    "",
    "Generated by `pnpm contract:verify --update-api`. Do not edit by hand.",
    "A diff here means the public surface moved; that needs a version decision (OC-1 R38).",
    ""
  ];
  for (const [label, path] of [
    ["./ops", manifest.surfaces?.ops],
    [".", manifest.surfaces?.root]
  ]) {
    if (path === void 0 || !existsSync(path)) continue;
    const names = declaredNames(await readFile(path, "utf8")).sort((a, b) => a.localeCompare(b));
    sections.push(`## ${label}`, "");
    for (const name of names) sections.push(`- ${name}`);
    sections.push("");
  }
  return sections.join("\n");
}
async function gateC16(manifest) {
  if (manifest.apiReport === void 0) {
    return result("C16", "skip", "No API report declared.");
  }
  const expected = await buildApiReport(manifest);
  if (!existsSync(manifest.apiReport)) {
    return result("C16", "fail", `Missing API report at ${manifest.apiReport}.`, [
      "Run `pnpm contract:verify --update-api` and commit the result, so a surface change needs an explicit version decision (R38)."
    ]);
  }
  const committed = await readFile(manifest.apiReport, "utf8");
  if (committed.trim() !== expected.trim()) {
    return result("C16", "fail", "The built surface no longer matches the committed API report.", [
      "Review the change: adding an export is a minor, removing or repurposing one is a major (\xA79.1).",
      "Then run `pnpm contract:verify --update-api` to record it."
    ]);
  }
  return result("C16", "pass", "Built surface matches the committed API report.");
}
async function gateC17(ops, manifest) {
  if (manifest.descriptor === void 0) {
    return result("C17", "skip", "No descriptor declared; there is no catalog to check receipts against.");
  }
  let names;
  try {
    const loaded = await import(manifest.descriptor);
    const candidate = loaded.default ?? Object.values(loaded).find(Array.isArray);
    if (!Array.isArray(candidate)) {
      return result("C17", "fail", `Descriptor module ${manifest.descriptor} exports no descriptor array.`);
    }
    names = new Set(candidate.map((d) => String(d.name)));
  } catch (error) {
    return result("C17", "fail", `Could not load descriptors from ${manifest.descriptor}: ${String(error)}`);
  }
  const violations = [];
  let checked = 0;
  for (const fixture of manifest.fixtures) {
    let envelope;
    try {
      envelope = await invoke(ops, fixture);
    } catch {
      continue;
    }
    const operation = receiptOf(envelope)?.operation;
    if (typeof operation !== "string") continue;
    checked += 1;
    if (!names.has(operation)) {
      violations.push(
        `${fixture.name}: receipt claims "${operation}", which is not a registered operation. A receipt that cannot be resolved against the catalog cannot serve as provenance.`
      );
    } else if (operation !== fixture.operation) {
      violations.push(
        `${fixture.name}: fixture exercises "${fixture.operation}", but its receipt names "${operation}". Qualifier dispatch reached the wrong operation.`
      );
    }
  }
  if (checked === 0) {
    return result("C17", "warn", "No fixture produced a receipt, so operation identity was never exercised.", [
      "Add at least one fixture whose result carries a receipt; otherwise this gate passes without checking anything."
    ]);
  }
  return verdict("C17", violations, `${String(checked)} receipt(s) name a registered operation.`);
}
async function gateC18(manifest) {
  if (manifest.descriptor === void 0) {
    return result("C18", "skip", "No descriptor declared; there is no catalog to measure coverage against.");
  }
  let descriptors;
  try {
    const loaded = await import(manifest.descriptor);
    const candidate = loaded.default ?? Object.values(loaded).find(Array.isArray);
    if (!Array.isArray(candidate)) {
      return result("C18", "fail", `Descriptor module ${manifest.descriptor} exports no descriptor array.`);
    }
    descriptors = candidate;
  } catch (error) {
    return result("C18", "fail", `Could not load descriptors from ${manifest.descriptor}: ${String(error)}`);
  }
  const violations = [];
  const byName = /* @__PURE__ */ new Map();
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
  const coverage = /* @__PURE__ */ new Map();
  const validKinds = /* @__PURE__ */ new Set(["nominal", "hostile", "boundary"]);
  for (const fixture of manifest.fixtures) {
    const claimed = fixture.operation;
    const kind = fixture.kind;
    let valid = true;
    if (typeof claimed !== "string" || claimed.length === 0) {
      violations.push(`${fixture.name}: fixture is missing an exact operation identity.`);
      valid = false;
    }
    if (typeof kind !== "string" || !validKinds.has(kind)) {
      violations.push(`${fixture.name}: fixture kind must be nominal, hostile, or boundary.`);
      valid = false;
    }
    const descriptor = typeof claimed === "string" ? byName.get(claimed) : void 0;
    if (typeof claimed === "string" && descriptor === void 0) {
      violations.push(`${fixture.name}: claims unknown operation "${claimed}".`);
      valid = false;
    }
    if (descriptor !== void 0 && descriptor.verb !== fixture.verb) {
      violations.push(
        `${fixture.name}: claims "${descriptor.name}" but invokes verb "${fixture.verb}" instead of "${descriptor.verb}".`
      );
      valid = false;
    }
    const forVerb = descriptors.filter((candidate) => candidate.verb === fixture.verb);
    const options = fixture.options;
    const matches2 = forVerb.filter((candidate) => {
      if (candidate.qualifier === void 0) return forVerb.length === 1;
      return options?.[candidate.qualifier.option] === candidate.qualifier.value;
    });
    if (matches2.length === 0) {
      const expected = descriptor?.qualifier;
      violations.push(
        expected === void 0 ? `${fixture.name}: its options do not resolve to any descriptor for verb "${fixture.verb}".` : `${fixture.name}: operation "${String(claimed)}" requires options.${expected.option} = "${expected.value}".`
      );
      valid = false;
    } else if (matches2.length > 1) {
      violations.push(
        `${fixture.name}: qualifier options ambiguously resolve to ${matches2.map((match) => `"${match.name}"`).join(", ")}.`
      );
      valid = false;
    } else if (matches2[0]?.name !== claimed) {
      violations.push(
        `${fixture.name}: claims "${String(claimed)}" but its verb and qualifier options resolve to "${String(matches2[0]?.name)}".`
      );
      valid = false;
    }
    if (valid && typeof claimed === "string" && typeof kind === "string") {
      const kinds = coverage.get(claimed) ?? /* @__PURE__ */ new Set();
      kinds.add(kind);
      coverage.set(claimed, kinds);
    }
  }
  for (const descriptor of [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const kinds = coverage.get(descriptor.name) ?? /* @__PURE__ */ new Set();
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
    `All ${String(byName.size)} registered operation(s) have exact identity and required fixture-kind coverage.`
  );
}

// src/verify/coverage.ts
var KINDS = ["nominal", "hostile", "boundary"];
function descriptorsFrom(module) {
  const candidate = module.default ?? Object.values(module).find(Array.isArray);
  if (!Array.isArray(candidate)) throw new Error("Descriptor module does not export an operation descriptor array.");
  return candidate;
}
function matches(descriptor, fixture) {
  if (descriptor.verb !== fixture.verb) return false;
  if (!descriptor.qualifier) return true;
  return fixture.options?.[descriptor.qualifier.option] === descriptor.qualifier.value;
}
function qualifierOptions(descriptor) {
  return descriptor.qualifier ? { [descriptor.qualifier.option]: descriptor.qualifier.value } : void 0;
}
async function completeFixtureCoverage(descriptorModule, seeds) {
  const descriptors = descriptorsFrom(await import(descriptorModule));
  const result2 = [];
  const kinds = /* @__PURE__ */ new Map();
  for (const seed of seeds) {
    const candidates = descriptors.filter((descriptor2) => matches(descriptor2, seed));
    const claimed = seed.operation ? descriptors.find((descriptor2) => descriptor2.name === seed.operation) : void 0;
    const descriptor = claimed ?? (candidates.length === 1 ? candidates[0] : void 0);
    if (!descriptor || candidates.length !== 1 || candidates[0]?.name !== descriptor.name) {
      throw new Error(
        `Fixture ${seed.name} must resolve to exactly one descriptor; resolved ${candidates.map((item) => item.name).join(", ") || "none"}.`
      );
    }
    const seen = kinds.get(descriptor.name) ?? /* @__PURE__ */ new Set();
    const kind = seed.kind ?? (seed.expect === "fail" ? "hostile" : seen.has("nominal") ? "boundary" : "nominal");
    seen.add(kind);
    kinds.set(descriptor.name, seen);
    result2.push({ ...seed, operation: descriptor.name, kind });
  }
  const missingNominal = descriptors.filter((descriptor) => !kinds.get(descriptor.name)?.has("nominal"));
  if (missingNominal.length) {
    throw new Error(`Missing nominal fixtures for: ${missingNominal.map((item) => item.name).join(", ")}`);
  }
  for (const descriptor of descriptors) {
    const seen = kinds.get(descriptor.name) ?? /* @__PURE__ */ new Set();
    for (const kind of KINDS) {
      if (seen.has(kind)) continue;
      if (kind === "nominal") continue;
      const options = qualifierOptions(descriptor);
      result2.push({
        name: `${descriptor.name}-${kind}`,
        operation: descriptor.name,
        kind,
        verb: descriptor.verb,
        input: kind === "boundary" ? null : { __runstampHostileFixture: true },
        ...options ? { options } : {},
        expect: "fail"
      });
    }
  }
  return result2;
}

// src/verify/index.ts
function gateOrder(a, b) {
  return GATE_IDS.indexOf(a.gate) - GATE_IDS.indexOf(b.gate);
}
async function verifyPackage(manifest) {
  let ops;
  try {
    ops = await import(manifest.ops);
  } catch (error) {
    const summary = `Could not import ${manifest.ops}: ${String(error)}`;
    return {
      package: manifest.package,
      domain: manifest.domain,
      contractVersion: CONTRACT_VERSION,
      gates: GATE_IDS.map((gate) => ({
        gate,
        title: GATE_TITLES[gate],
        status: "fail",
        summary
      })),
      ok: false
    };
  }
  const gates = [gateC1(ops), gateC14(ops)];
  gates.push(
    await gateC2(ops, manifest),
    await gateC3(ops, manifest),
    await gateC4(ops, manifest),
    await gateC5(ops, manifest),
    await gateC6(ops, manifest)
  );
  const [c7, c8, c10] = await gateC7C8C10(ops, manifest);
  gates.push(c7, c8, c10);
  gates.push(
    await gateC9(ops, manifest),
    await gateC11(ops, manifest),
    await gateC12(ops, manifest),
    await gateC13(manifest),
    await gateC15(ops, manifest),
    await gateC16(manifest),
    await gateC17(ops, manifest),
    await gateC18(manifest)
  );
  gates.sort(gateOrder);
  return {
    package: manifest.package,
    domain: manifest.domain,
    contractVersion: CONTRACT_VERSION,
    gates,
    // `warn` is deliberately not fatal: it carries the deprecation window.
    ok: gates.every((gate) => gate.status !== "fail")
  };
}
var SYMBOLS = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
  skip: "SKIP"
};
function formatReport(report) {
  const lines = [
    `${report.package}  (domain: ${report.domain}, contract ${report.contractVersion})`
  ];
  for (const gate of report.gates) {
    lines.push(`  ${SYMBOLS[gate.status].padEnd(4)} ${gate.gate.padEnd(3)} ${gate.title.padEnd(20)} ${gate.summary}`);
    for (const detail of gate.details ?? []) {
      lines.push(`         - ${detail}`);
    }
  }
  const failed = report.gates.filter((gate) => gate.status === "fail").length;
  const warned = report.gates.filter((gate) => gate.status === "warn").length;
  lines.push(
    report.ok ? `  => conformant${warned > 0 ? ` (${String(warned)} warning(s))` : ""}` : `  => NOT conformant: ${String(failed)} gate(s) failed`
  );
  return lines.join("\n");
}
function gateCases(report) {
  return report.gates.map((gate) => [`${gate.gate} ${gate.title}`, gate]);
}
function lossyFixtures(manifest) {
  return manifest.fixtures.filter((fixture) => (fixture.losses?.length ?? 0) > 0);
}

export { GATE_IDS, GATE_TITLES, HOSTILE_INPUTS, buildApiReport, completeFixtureCoverage, formatReport, gateCases, lossyFixtures, verifyPackage };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map