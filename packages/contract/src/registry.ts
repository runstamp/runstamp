/**
 * The operation registry (OC-1 §6).
 *
 * One descriptor per operation, from which the SDK docs, the hosted HTTP routes,
 * the MCP tool catalog and the embedded UI are all *generated*. Generation from a
 * single registry — rather than four hand-written surfaces — is the mechanism
 * that keeps the projections uniform as the catalog grows.
 */

import type {
  ErrorCode,
  ErrorDomain,
  OperationName,
  SideEffects,
  Stability,
  Verb,
} from "./types.js";
import { VERBS } from "./types.js";

/**
 * A JSON Schema document. Permissive for now; tightening this to a real JSON
 * Schema type is deferred until the Phase 3 `./ops` surfaces exist and the shapes
 * they actually need are known.
 */
export type JSONSchema = Record<string, unknown>;

/**
 * How a qualified operation selects itself within its base verb.
 *
 * `pdf.extract.signatures` and a future `pdf.extract.text` are the *same*
 * exported `extract` function; what separates them is an option value. A
 * projection that resolves the descriptor and then calls the base verb without
 * setting that option reaches the verb's default instead of the operation the
 * caller asked for — a silent misroute that returns 200 with the wrong answer.
 *
 * Declaring the binding here is what lets every projection dispatch correctly
 * from the registry alone, with no per-operation special casing.
 */
export interface QualifierBinding {
  /** The option key that selects this operation, e.g. `"selector"`. */
  readonly option: string;
  /** The value that key must take. */
  readonly value: string;
}

export interface OperationDescriptor {
  readonly name: OperationName;
  readonly domain: ErrorDomain;
  readonly verb: Verb;
  /**
   * Required on a qualified operation whose verb hosts more than one form.
   *
   * `defineOperations` enforces the invariant per `(domain, verb)` group: either
   * the group holds exactly one operation — the verb dispatches it unambiguously
   * and no binding is needed — or every member declares a distinct binding. The
   * second qualified form added to a verb therefore fails at module load rather
   * than silently shadowing the first.
   */
  readonly qualifier?: QualifierBinding;
  /** One line, agent-facing. Becomes the MCP tool description. */
  readonly summary: string;
  readonly inputSchema: JSONSchema;
  readonly optionsSchema: JSONSchema;
  readonly valueSchema: JSONSchema;
  /** Every error code this operation may emit. Enforced by conformance gate C5. */
  readonly errorCodes: readonly ErrorCode[];
  /** Every loss code this operation may emit. */
  readonly lossCodes: readonly ErrorCode[];
  /**
   * The module a projection should import to invoke this operation.
   *
   * A domain is no longer one package. `pdf` is served by both
   * `@runstamp/pdf` and `@runstamp/forms`, and `common` by whichever
   * extensions declare it — so a projection that maps domain to package reaches
   * the wrong module and reports the operation as unknown. Carrying the
   * specifier on the descriptor is what keeps the registry the single source
   * the projections are generated from (§6).
   *
   * Absent on the engines' hand-written operations, where the domain still
   * identifies the package unambiguously.
   */
  readonly implementation?: string;
  readonly deterministic: boolean;
  readonly sideEffects: SideEffects;
  readonly stability: Stability;
}

export function isVerb(value: string): value is Verb {
  return (VERBS as readonly string[]).includes(value);
}

/**
 * Validate and freeze a package's operation descriptors.
 *
 * Every package declares its catalog through this, so the errors that would
 * otherwise surface as a malformed MCP tool or an HTTP route that cannot be
 * generated are caught where the descriptor is written instead. Throws rather
 * than returning a result: a bad descriptor is programmer error at module load,
 * not a document condition, which is the R4 line.
 */
export function defineOperations(
  descriptors: readonly OperationDescriptor[],
): readonly OperationDescriptor[] {
  const seen = new Set<string>();
  for (const descriptor of descriptors) {
    const parsed = parseOperationName(descriptor.name);
    if (parsed === undefined) {
      throw new Error(
        `Operation name "${descriptor.name}" is not \`domain.verb[.qualifier]\` with a canonical verb (OC-1 §4). Packages may add qualifiers, never new base verbs (R32).`,
      );
    }
    if (parsed.domain !== descriptor.domain) {
      throw new Error(
        `Operation "${descriptor.name}" declares domain "${descriptor.domain}", which its name does not match.`,
      );
    }
    if (parsed.verb !== descriptor.verb) {
      throw new Error(
        `Operation "${descriptor.name}" declares verb "${descriptor.verb}", which its name does not match.`,
      );
    }
    if (seen.has(descriptor.name)) {
      throw new Error(`Operation "${descriptor.name}" is declared more than once.`);
    }
    seen.add(descriptor.name);

    if (descriptor.summary.trim().length === 0) {
      throw new Error(`Operation "${descriptor.name}" has an empty summary; it becomes the MCP tool description.`);
    }
    // C5 cross-checks emitted codes against these, so an empty list is a claim
    // that the operation can never fail — which is never true of a document op.
    if (descriptor.errorCodes.length === 0) {
      throw new Error(`Operation "${descriptor.name}" declares no errorCodes; every operation can fail (R4).`);
    }
    for (const code of [...descriptor.errorCodes, ...descriptor.lossCodes]) {
      if (!code.startsWith(`${descriptor.domain}/`) && !code.startsWith("common/")) {
        throw new Error(
          `Operation "${descriptor.name}" declares code "${code}", which is namespaced to neither "${descriptor.domain}/" nor "common/" (R11).`,
        );
      }
    }
  }

  assertDispatchable(descriptors);
  return Object.freeze([...descriptors]);
}

/**
 * Every operation must be reachable by a projection that has only the registry.
 *
 * A verb with one operation dispatches unambiguously. A verb with several needs
 * each one to say how it is selected, and the selections must differ — otherwise
 * two registry entries name the same call and one of them can never be reached.
 */
function assertDispatchable(descriptors: readonly OperationDescriptor[]): void {
  const groups = new Map<string, OperationDescriptor[]>();
  for (const descriptor of descriptors) {
    const key = `${descriptor.domain}.${descriptor.verb}`;
    groups.set(key, [...(groups.get(key) ?? []), descriptor]);
  }

  for (const [verb, group] of groups) {
    if (group.length === 1) continue;

    const unbound = group.filter((descriptor) => descriptor.qualifier === undefined);
    if (unbound.length > 0) {
      throw new Error(
        `"${verb}" hosts ${String(group.length)} operations, so each must declare a \`qualifier\` binding saying which option value selects it. Missing on: ${unbound
          .map((descriptor) => descriptor.name)
          .join(", ")}. Without it every projection would call the verb's default and silently return the wrong operation.`,
      );
    }

    const bindings = new Set(group.map((d) => `${d.qualifier?.option ?? ""}=${d.qualifier?.value ?? ""}`));
    if (bindings.size !== group.length) {
      throw new Error(
        `Operations under "${verb}" declare duplicate \`qualifier\` bindings, so at least one can never be reached: ${group
          .map((d) => `${d.name} -> ${d.qualifier?.option ?? "?"}=${d.qualifier?.value ?? "?"}`)
          .join(", ")}.`,
      );
    }
  }
}

/**
 * Split an operation name into its parts.
 *
 * Returns `undefined` rather than throwing, so callers validating untrusted
 * registry data can decide how to report the problem.
 */
export function parseOperationName(
  name: string,
): { domain: string; verb: Verb; qualifier?: string } | undefined {
  const parts = name.split(".");
  const domain = parts[0];
  const verb = parts[1];
  if (parts.length < 2 || domain === undefined || verb === undefined) return undefined;
  if (!isVerb(verb)) return undefined;

  const qualifier = parts.slice(2).join(".");
  return qualifier === "" ? { domain, verb } : { domain, verb, qualifier };
}
