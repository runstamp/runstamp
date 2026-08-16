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
import type { ErrorDomain, LossSeverity, OperationDescriptor, OperationOptions, OperationResult, SideEffects, Stability, Verb } from "@runstamp/contract";
import type { ExtensionDefinition } from "./extension-runtime.js";
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
export type ExtensionOperation = (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<ExtensionValue>>;
export interface ExtensionValue {
    readonly output: unknown;
    readonly artifacts: readonly {
        name: string;
        mediaType: string;
        byteLength: number;
        sha256: string;
    }[];
}
/** One addressable operation behind a shared verb. */
export interface Route {
    readonly descriptor: OperationDescriptor;
    readonly run: (input: unknown, options?: OperationOptions & Record<string, unknown>) => Promise<OperationResult<ExtensionValue>>;
}
/**
 * Build the descriptors and the verb functions for one extension.
 *
 * Throws for a malformed binding rather than returning a result: a binding is
 * authored, not supplied by a caller, so a bad one is programmer error at module
 * load — the same line R4 draws for operations.
 */
export declare function projectExtension(binding: ExtensionBinding): ExtensionProjection;
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
export declare function mergeProjections(domain: ErrorDomain, projections: readonly ExtensionProjection[]): ExtensionProjection;
//# sourceMappingURL=operation-projection.d.ts.map