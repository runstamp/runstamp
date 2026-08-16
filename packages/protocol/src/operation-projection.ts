/**
 * Project an `./extension-runtime.js` extension onto the OC-1 operation surface.
 *
 * The extension factory and OC-1 converged independently on the same design —
 * manifests that declare operations with loss and warning codes, results that
 * carry losses, artifacts and locators. `runExtension` already validates the
 * request, enforces resource budgets, wires abort and timeout, and rejects any
 * code the manifest did not declare, which is C5 enforced at runtime. None of
 * that should be rewritten.
 *
 * Three things it does not have, and they are precisely the three OC-1 exists
 * for:
 *
 * - an actionable `remediation` on every failure (R10);
 * - loss *severity* — `substituted | degraded | dropped` — so `losses: []` is a
 *   positive claim of fidelity rather than an absence of data (R15, R17);
 * - a receipt: engine identity, input and output hashes, and a falsifiable
 *   determinism claim (R24).
 *
 * This is one bridge rather than forty-four migrations. Wrapping `runExtension`
 * in `runOperation` supplies the receipt, the determinism claim and the hashes
 * for free; the two things that genuinely cannot be derived — a severity per
 * loss code and a remediation per error code — are required from the caller and
 * validated at construction, because guessing either is worse than not shipping.
 *
 * The verb map is `docs/verb-reconciliation.md`, decided once for the whole
 * catalog so the vocabulary cannot drift as it grows.
 */

import {
  createDiagnostic,
  createLoss,
  defineOperations,
  hashValue,
  fail,
  isVerb,
  PaperError,
  runOperation,
} from "@runstamp/contract";
import type {
  ErrorCode,
  ErrorDomain,
  ErrorPhase,
  JSONSchema,
  Loss,
  LossSeverity,
  OperationDescriptor,
  OperationOptions,
  OperationResult,
  SideEffects,
  Stability,
  Verb,
} from "@runstamp/contract";
import type { ExtensionDefinition, ExtensionResult } from "./extension-runtime.js";
import { runExtension } from "./extension-runtime.js";

/** How one manifest operation maps onto the canonical vocabulary. */
export interface VerbMapping {
  readonly verb: Verb;
  /**
   * Required whenever several manifest operations land on the same verb.
   * `defineOperations` rejects the set otherwise, which is the intended
   * behaviour: two registry entries that name the same call mean one of them can
   * never be reached.
   */
  readonly qualifier?: string;
  readonly summary?: string;
  /** Override the binding-wide default for this one projected operation. */
  readonly stability?: Stability;
}

export interface ExtensionBinding {
  readonly domain: ErrorDomain;
  readonly definition: ExtensionDefinition;

  /**
   * Manifest operation name → canonical verb.
   *
   * An operation absent from this map is not projected. That is how a *governed
   * service* — `register`, `start`, `transition`, `replay` and their kin — stays
   * off `./ops`: those write to a store or advance a workflow rather than
   * transforming a document, and a local SDK verb that cannot run without a
   * backend is exactly the failure R10 exists to prevent.
   */
  readonly verbs: Readonly<Record<string, VerbMapping>>;

  /**
   * Severity for every loss code the manifest declares.
   *
   * Not derivable. `extension-kit` grades diagnostics `info | warning | error`,
   * which describes how loud a message is; OC-1 grades losses
   * `substituted | degraded | dropped`, which describes what happened to the
   * customer's content. Nothing in the first tells you the second.
   */
  readonly lossSeverity: Readonly<Record<string, LossSeverity>>;

  /** Remediation per error code the extension can emit. */
  readonly remediation: Readonly<Record<string, string>>;

  /**
   * Used when an extension emits an error code the binding did not anticipate.
   *
   * Required, not defaulted: R10 says an error a caller cannot act on is a bug,
   * and a generic sentence invented here would be filler dressed as guidance.
   * The binding author knows what a caller of *this* extension should do.
   */
  readonly fallbackRemediation: string;

  /**
   * The module specifier a consumer imports to reach these verbs, e.g.
   * `"@runstamp/forms/ops"`. Stamped onto every descriptor so the hosted route
   * and the MCP catalog can find the implementation without knowing which
   * package owns which domain.
   */
  readonly module?: string;

  /**
   * Resource ceiling to hand the extension, when the generous default is wrong.
   *
   * The bridge's default budget is deliberately large — 64 MB in and out, so an
   * extension is bounded by the caller's deadline rather than by an arbitrary
   * size. But an extension may declare its own immutable ceiling and *reject* a
   * budget above it rather than clamping, which is a reasonable thing for a
   * safety limit to do: `@runstamp/review-operations` refuses any budget over
   * its O09 hard ceiling and fails the request as `INVALID_INPUT`. The bridge
   * cannot discover that ceiling — the manifest does not declare one — so the
   * binding says it.
   *
   * Only the fields given are overridden; `timeoutMs` still defaults to the
   * runaway ceiling, because the caller's deadline belongs to `runOperation`.
   */
  readonly budget?: {
    readonly maxInputBytes?: number;
    readonly maxOutputBytes?: number;
    readonly maxEntries?: number;
    readonly maxDepth?: number;
    readonly timeoutMs?: number;
  };

  readonly engineVersion: string;
  readonly deterministic?: boolean;
  readonly sideEffects?: SideEffects;
  readonly stability?: Stability;
}

export interface ExtensionProjection {
  readonly descriptors: readonly OperationDescriptor[];
  /** Canonical verbs, ready to re-export from a package's `./ops`. */
  readonly ops: Readonly<Record<string, ExtensionOperation>>;
  /**
   * Per-verb routes, keyed by qualifier. Exposed so several projections in one
   * domain can be combined — see {@link mergeProjections}.
   */
  readonly routes: Readonly<Record<string, Readonly<Record<string, Route>>>>;
}

export type ExtensionOperation = (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<ExtensionValue>>;

export interface ExtensionValue {
  readonly output: unknown;
  readonly artifacts: readonly { name: string; mediaType: string; byteLength: number; sha256: string }[];
}

/**
 * Upper bound on how long an extension body may run before its own harness
 * gives up. Deliberately far above any realistic caller deadline: the caller's
 * `timeoutMs` is enforced by `runOperation`, which produces the canonical
 * cancellation result.
 */
const EXTENSION_BUDGET_CEILING_MS = 10 * 60 * 1000;

const PERMISSIVE_SCHEMA: JSONSchema = { description: "Declared by the extension manifest." };

/**
 * Which phase a diagnostic or error belongs to, derived from the canonical verb.
 *
 * `ErrorPhase` has no generic "the extension was running" member, and inventing
 * one value for all forty-four extensions would make the field noise. The verb
 * already says what the operation was doing, so the mapping is derivable rather
 * than guessed — which is the same reason the verb map exists at all.
 */
const PHASE_FOR_VERB: Readonly<Record<Verb, ErrorPhase>> = {
  render: "rendering",
  convert: "rendering",
  transform: "rendering",
  repair: "rendering",
  merge: "archive",
  split: "archive",
  parse: "parsing",
  extract: "parsing",
  inspect: "parsing",
  validate: "validation",
  diff: "validation",
  redact: "policy",
};

function namespaced(domain: ErrorDomain, code: string): ErrorCode {
  return (code.includes("/") ? code : `${domain}/${code}`) as ErrorCode;
}

/**
 * A deterministic stand-in for the wall clock and the run identity.
 *
 * `ExtensionRequest.context` demands a `runId`, a `seed` and a `now`. Feeding it
 * real values would make every operation non-deterministic and C7 would say so
 * within one run. Deriving all three from the input hash keeps the same input
 * producing the same bytes, which is the whole provenance claim (R24).
 */
function deterministicContext(
  inputHash: string,
  timeoutMs: number,
  budget?: ExtensionBinding["budget"],
) {
  const seed = inputHash.replace("sha256:", "");
  return {
    runId: `runstamp-${seed.slice(0, 32)}`,
    seed,
    // Fixed rather than current: an operation that stamps "now" cannot be
    // byte-reproduced tomorrow, which is what the receipt promises.
    now: "1970-01-01T00:00:00.000Z",
    network: "disabled" as const,
    budget: {
      maxInputBytes: 64 * 1024 * 1024,
      maxOutputBytes: 64 * 1024 * 1024,
      maxEntries: 100_000,
      maxDepth: 64,
      ...budget,
      timeoutMs: budget?.timeoutMs ?? timeoutMs,
    },
  };
}

/**
 * Carry an extension locator across only when it can bind to bytes.
 *
 * R22 makes a locator an address *into specific bytes*; an `artifactId` that is
 * not a content hash cannot honour that. Rather than fabricate one, the original
 * is preserved in `details` and the locator is omitted — a missing address is
 * recoverable, a wrong one silently resolves against the wrong document.
 */
function locatorDetails(locator: unknown): Record<string, unknown> | undefined {
  if (typeof locator !== "object" || locator === null) return undefined;
  return { extensionLocator: locator };
}

/**
 * Give a thrown extension error a code and a remediation.
 *
 * `runExtension` throws `ExtensionExecutionError` for a malformed request, a
 * breached resource budget or an abort, and an extension body may throw on its
 * own. Left alone these reach `runOperation` as unmapped errors with no
 * remediation — an error the caller cannot act on, which R10 calls a bug.
 */
async function guarded<T>(
  run: () => Promise<T>,
  binding: ExtensionBinding,
  phase: ErrorPhase,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PaperError) throw error;
    const code = (error as { code?: unknown }).code;
    const raw = typeof code === "string" ? code : "EXTENSION_FAILED";
    throw new PaperError({
      message: error instanceof Error ? error.message : String(error),
      code: namespaced(binding.domain, raw),
      phase,
      remediation: binding.remediation[raw] ?? binding.fallbackRemediation,
      cause: error,
    });
  }
}

/** One addressable operation behind a shared verb. */
export interface Route {
  readonly descriptor: OperationDescriptor;
  readonly run: (
    input: unknown,
    options?: OperationOptions & Record<string, unknown>,
  ) => Promise<OperationResult<ExtensionValue>>;
}

/**
 * The single function a verb exports, routing on `options.operation`.
 *
 * When a verb hosts one operation it dispatches unambiguously. When it hosts
 * several — and after two extensions are merged into one domain it usually does
 * — the call has to say which, and a call that does not gets a typed failure
 * naming the choices rather than an arbitrary default presented as an answer.
 */
function dispatcher(verb: string, domain: ErrorDomain, group: Map<string, Route>): ExtensionOperation {
  const sole = group.size === 1 ? [...group.keys()][0] : undefined;
  const phase = PHASE_FOR_VERB[verb as Verb];

  return async (input, options) => {
    const requested = typeof options?.operation === "string" ? options.operation : sole;
    const route = requested === undefined ? undefined : group.get(requested);
    if (route === undefined) {
      return fail(
        new PaperError({
          message:
            requested === undefined
              ? `"${domain}.${verb}" hosts ${String(group.size)} operations; the call did not say which.`
              : `"${requested}" is not an operation of "${domain}.${verb}".`,
          code: namespaced(domain, "SCHEMA_REJECTED"),
          phase,
          remediation: `Set options.operation to one of: ${[...group.keys()].join(", ")}.`,
        }),
      ) as OperationResult<ExtensionValue>;
    }
    return route.run(input, options);
  };
}

function toLosses(
  result: ExtensionResult,
  binding: ExtensionBinding,
  undeclared: string[],
): Loss[] {
  return result.losses.map((loss) => {
    const severity = binding.lossSeverity[loss.code];
    if (severity === undefined) undeclared.push(loss.code);
    return createLoss({
      code: namespaced(binding.domain, loss.code),
      // `degraded` is the honest reading of an unmapped code: something changed
      // and we cannot say it was a faithful substitution or a clean drop.
      severity: severity ?? "degraded",
      subject: binding.definition.manifest.id,
      message: loss.message,
      avoidable: false,
      details: {
        ...(locatorDetails(loss.locator) ?? {}),
        extensionCode: loss.code,
        ...(severity === undefined ? { severityUndeclared: true } : {}),
      },
    });
  });
}

/**
 * Build the descriptors and the verb functions for one extension.
 *
 * Throws for a malformed binding rather than returning a result: a binding is
 * authored, not supplied by a caller, so a bad one is programmer error at module
 * load — the same line R4 draws for operations.
 */
export function projectExtension(binding: ExtensionBinding): ExtensionProjection {
  const { manifest } = binding.definition;
  const declared = new Set(manifest.operations.map((operation) => operation.name));

  for (const name of Object.keys(binding.verbs)) {
    if (!declared.has(name)) {
      throw new Error(
        `Extension "${manifest.id}" has no operation named "${name}", but the binding maps it to a verb. Known operations: ${[...declared].join(", ")}.`,
      );
    }
  }

  for (const [name, mapping] of Object.entries(binding.verbs)) {
    if (!isVerb(mapping.verb)) {
      throw new Error(
        `Operation "${name}" maps to "${mapping.verb}", which is not a canonical verb (R32). See docs/verb-reconciliation.md; packages add qualifiers, never base verbs.`,
      );
    }
  }

  // Every declared loss code needs a severity, or `losses: []` stops being a
  // claim about fidelity and becomes a claim about nothing.
  const missing = manifest.lossCodes
    .map((entry) => entry.code)
    .filter((code) => binding.lossSeverity[code] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Extension "${manifest.id}" declares loss code(s) with no severity: ${missing.join(", ")}. Grade each as substituted, degraded or dropped — it cannot be inferred from the extension's own info/warning/error scale, which measures loudness rather than what happened to the content (R15).`,
    );
  }

  // Caught here rather than left to `defineOperations`, which would reject the
  // set for a duplicate *name* — true, but it tells the binding author nothing
  // about the qualifier they are missing.
  const byVerb = new Map<string, string[]>();
  for (const [name, mapping] of Object.entries(binding.verbs)) {
    const key = `${mapping.verb}${mapping.qualifier === undefined ? "" : `.${mapping.qualifier}`}`;
    byVerb.set(key, [...(byVerb.get(key) ?? []), name]);
  }
  for (const [key, names] of byVerb) {
    if (names.length > 1) {
      throw new Error(
        `Operations ${names.map((name) => `"${name}"`).join(" and ")} both map to "${binding.domain}.${key}", so each must declare a \`qualifier\` binding saying which one a projection is asking for. Without it every projection reaches whichever was registered first.`,
      );
    }
  }

  if (binding.fallbackRemediation.trim().length === 0) {
    throw new Error(
      `Extension "${manifest.id}" supplies an empty fallbackRemediation. R10: an error the caller cannot act on is a bug.`,
    );
  }

  // The extension's own codes, plus the one this bridge itself emits when a
  // shared verb is called without saying which operation it wants. C5 checks
  // emitted codes against declared ones, so a code the bridge can produce has to
  // be declared by the bridge.
  const errorCodes = [
    ...Object.keys(binding.remediation).map((code) => namespaced(binding.domain, code)),
    namespaced(binding.domain, "SCHEMA_REJECTED"),
  ];

  const descriptors = defineOperations(
    Object.entries(binding.verbs).map(([name, mapping]) => {
      const operation = manifest.operations.find((entry) => entry.name === name);
      return {
        name: (mapping.qualifier === undefined
          ? `${binding.domain}.${mapping.verb}`
          : `${binding.domain}.${mapping.verb}.${mapping.qualifier}`) as OperationDescriptor["name"],
        domain: binding.domain,
        verb: mapping.verb,
        ...(mapping.qualifier === undefined
          ? {}
          : // The dispatch value is the *qualifier*, not the manifest operation
            // name. Two extensions in one domain can both call an operation
            // `inspect`, so the manifest name is not unique — the qualifier is,
            // because `defineOperations` already rejects a duplicate. Without
            // this the hosted route would set `operation: "inspect"` and reach
            // whichever extension registered it last.
            { qualifier: { option: "operation", value: mapping.qualifier } }),
        summary: mapping.summary ?? operation?.summary ?? `${manifest.title}: ${name}.`,
        ...(binding.module === undefined ? {} : { implementation: binding.module }),
        inputSchema: PERMISSIVE_SCHEMA,
        optionsSchema: PERMISSIVE_SCHEMA,
        valueSchema: PERMISSIVE_SCHEMA,
        errorCodes: errorCodes.length > 0 ? errorCodes : [namespaced(binding.domain, "EXTENSION_FAILED")],
        lossCodes: manifest.lossCodes.map((entry) => namespaced(binding.domain, entry.code)),
        deterministic: binding.deterministic ?? true,
        sideEffects: binding.sideEffects ?? "none",
        stability: mapping.stability ?? binding.stability ?? "experimental",
      } satisfies OperationDescriptor;
    }),
  );

  // A verb exports one function, so several qualified operations share it and
  // the call has to say which one it wants. Grouping first is what makes that
  // requirement enforceable — assigning per descriptor in a loop silently let
  // the last one win, which is the shadowing this contract exists to prevent.
  // Routes, keyed by the *qualifier* rather than the manifest operation name.
  //
  // Two extensions in one domain can both declare an operation called `inspect`
  // — the PDF evidence extension and the AcroForm extension do — so the manifest
  // name is not a unique dispatch key. The qualifier is, because
  // `defineOperations` already rejects two operations that share one.
  const routes = new Map<string, Map<string, Route>>();

  for (const descriptor of descriptors) {
    const entry = Object.entries(binding.verbs).find(
      ([name, mapping]) =>
        mapping.verb === descriptor.verb && (mapping.qualifier ?? name) === (descriptor.qualifier?.value ?? name),
    );
    if (entry === undefined) continue;
    const [operationName, mapping] = entry;
    const key = mapping.qualifier ?? operationName;
    const phase = PHASE_FOR_VERB[descriptor.verb];

    const run: Route["run"] = async (input, options) => {
      let cached: string | undefined;
      const inputHash = (): string => (cached ??= hashValue(input));

      return runOperation({
        operation: descriptor.name,
        domain: binding.domain,
        engine: { name: manifest.id, version: binding.engineVersion },
        inputHash,
        ...(options !== undefined ? { options } : {}),
        execute: async (context) => {
          // The extension's budget is a *resource* ceiling, not the caller's
          // deadline. Passing the caller's `timeoutMs` here let the extension's
          // own timer fire first and return its `TIMEOUT` code, so a timeout
          // arrived as `pdf/TIMEOUT` instead of the `common/OPERATION_TIMEOUT`
          // that R29 requires and every other operation produces. `runOperation`
          // owns cancellation; this ceiling only stops a runaway extension.
          const timeoutMs = EXTENSION_BUDGET_CEILING_MS;
          // `runExtension` throws for a malformed request, a budget breach or an
          // abort, and the extension's own body may throw too. Those would reach
          // the caller as an unmapped error with no remediation, which is the
          // R10 failure this bridge exists to prevent — so they are given one.
          const result = await guarded(() => runExtension(
            binding.definition,
            {
              schemaVersion: 1,
              extensionId: manifest.id,
              operation: operationName,
              input: input as never,
              context: deterministicContext(inputHash(), timeoutMs, binding.budget),
            },
            context.signal === undefined ? {} : { signal: context.signal },
          ), binding, phase);

          // Warnings are diagnostics, not losses: R15 keeps the ledger for
          // things that happened to the content, so that `losses: []` means
          // something. Folding advisories in would make it mean nothing.
          for (const warning of result.warnings) {
            context.addDiagnostic(
              createDiagnostic({
                code: namespaced(binding.domain, warning.code),
                // OC-1 diagnostics are debug | info | warn: an "error" that is
                // not a failure has nowhere to go, and R15 keeps the ledger for
                // content deviations, so it lands at warn rather than inventing
                // a severity or promoting an advisory into a loss.
                severity: warning.severity === "info" ? "info" : "warn",
                message: warning.message,
                phase,
                ...(locatorDetails(warning.locator) === undefined
                  ? {}
                  : { details: locatorDetails(warning.locator) }),
              }),
            );
          }

          const undeclared: string[] = [];
          for (const loss of toLosses(result, binding, undeclared)) context.addLoss(loss);
          for (const code of undeclared) {
            // Surfaced rather than swallowed: an ungraded loss is a gap in the
            // binding, and the caller should be able to see that the severity
            // they were given is a fallback.
            context.addDiagnostic(
              createDiagnostic({
                code: namespaced(binding.domain, "LOSS_SEVERITY_UNDECLARED"),
                severity: "warn",
                message: `Loss code "${code}" has no declared severity; reported as degraded.`,
                phase,
              }),
            );
          }

          if (result.status === "error") {
            // Thrown so `runOperation` converts it into the typed failure R4
            // requires; it never escapes to the caller as an exception.
            throw new PaperError({
              message: result.error.message,
              code: namespaced(binding.domain, result.error.code),
              phase,
              remediation: binding.remediation[result.error.code] ?? binding.fallbackRemediation,
              retryable: result.error.retryable,
            });
          }

          const artifacts = result.artifacts.map((artifact) => ({
            name: artifact.name,
            mediaType: artifact.mediaType,
            byteLength: artifact.byteLength,
            sha256: artifact.sha256,
          }));

          return {
            value: { output: result.output, artifacts },
            // Only meaningful for a single artifact: with several there is no one
            // set of bytes the receipt is about, and inventing a combined hash
            // would make the receipt claim something it cannot support.
            ...(artifacts.length === 1 && artifacts[0] !== undefined
              ? { outputHash: `sha256:${artifacts[0].sha256}` }
              : {}),
          };
        },
      });
    };

    const forVerb = routes.get(descriptor.verb) ?? new Map<string, Route>();
    forVerb.set(key, { descriptor, run });
    routes.set(descriptor.verb, forVerb);
  }

  const ops: Record<string, ExtensionOperation> = {};
  for (const [verb, group] of routes) ops[verb] = dispatcher(verb, binding.domain, group);

  return { descriptors, ops, routes: Object.fromEntries([...routes].map(([v, m]) => [v, Object.fromEntries(m)])) };

}

/**
 * Combine several projections into one `./ops` surface for a domain.
 *
 * A verb exports exactly one function, so two extensions that both want
 * `inspect` in the same domain cannot each own it — which is not a corner case:
 * the PDF evidence extension and the AcroForm extension both declare `inspect`,
 * `extract` and `verify`. Merging routes rather than overwriting exports is what
 * lets a domain host more than one extension without either silently shadowing
 * the other.
 *
 * Throws on a duplicate qualifier within a verb. Two routes that answer to the
 * same name mean one is unreachable, and that is a binding mistake worth failing
 * at module load rather than discovering from a wrong answer.
 */
export function mergeProjections(
  domain: ErrorDomain,
  projections: readonly ExtensionProjection[],
): ExtensionProjection {
  const routes = new Map<string, Map<string, Route>>();

  for (const projection of projections) {
    for (const [verb, group] of Object.entries(projection.routes)) {
      const target = routes.get(verb) ?? new Map<string, Route>();
      for (const [key, route] of Object.entries(group)) {
        const existing = target.get(key);
        if (existing !== undefined) {
          throw new Error(
            `Two operations claim "${domain}.${verb}" with qualifier "${key}" (${existing.descriptor.name} and ${route.descriptor.name}), so one of them can never be reached.`,
          );
        }
        target.set(key, route);
      }
      routes.set(verb, target);
    }
  }

  const ops: Record<string, ExtensionOperation> = {};
  for (const [verb, group] of routes) ops[verb] = dispatcher(verb, domain, group);

  return {
    descriptors: projections.flatMap((projection) => projection.descriptors),
    ops,
    routes: Object.fromEntries([...routes].map(([verb, group]) => [verb, Object.fromEntries(group)])),
  };
}
