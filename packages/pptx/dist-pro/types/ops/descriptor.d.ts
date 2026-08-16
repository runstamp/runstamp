/**
 * Shared type vocabulary for OC-1.
 *
 * This module is intentionally **runtime-free**: it contains only type aliases and
 * unions. Every other contract module may import it without creating a runtime
 * import cycle. See docs/architecture/operation-contract.md §3.
 */
/**
 * The domain a code, locator, or operation belongs to.
 *
 * Domains namespace error codes so that two packages cannot collide on the same
 * bare identifier — the defect OC-1 §1.1 documents between `PaperError` and
 * `DOCXError`, which both emitted `RESOURCE_LIMIT_EXCEEDED`.
 */
type ErrorDomain = "common" | "pptx" | "docx" | "xlsx" | "pdf" | "html" | "policy" | "license" | "connector" | "host";
/**
 * A stable, greppable, collision-proof code: `${domain}/${SCREAMING_SNAKE}`.
 *
 * Codes are contractual (OC-1 §9.1); messages are not. Consumers branch on `code`.
 */
type ErrorCode = `${ErrorDomain}/${string}`;
/**
 * The canonical verb taxonomy (OC-1 §4). Exactly these twelve.
 *
 * Packages may add *qualifiers* (`xlsx.extract.tables`) but never a new base verb;
 * a new verb requires an amendment to the contract.
 */
type Verb = "render" | "parse" | "inspect" | "validate" | "repair" | "convert" | "transform" | "diff" | "merge" | "split" | "extract" | "redact";
/**
 * A fully-qualified operation name: `${domain}.${verb}` with an optional qualifier.
 *
 * Examples: `docx.render`, `pdf.validate`, `xlsx.extract.tables`.
 */
type OperationName = `${ErrorDomain}.${Verb}` | `${ErrorDomain}.${Verb}.${string}`;
/** Side effects an operation may perform, declared in the registry. */
type SideEffects = "none" | "network" | "filesystem";
/** Public stability of a registry entry. */
type Stability = "experimental" | "stable" | "deprecated";

/**
 * The operation registry (OC-1 §6).
 *
 * One descriptor per operation, from which the SDK docs, the hosted HTTP routes,
 * the MCP tool catalog and the embedded UI are all *generated*. Generation from a
 * single registry — rather than four hand-written surfaces — is the mechanism
 * that keeps the projections uniform as the catalog grows.
 */

/**
 * A JSON Schema document. Permissive for now; tightening this to a real JSON
 * Schema type is deferred until the Phase 3 `./ops` surfaces exist and the shapes
 * they actually need are known.
 */
type JSONSchema = Record<string, unknown>;
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
interface QualifierBinding {
    /** The option key that selects this operation, e.g. `"selector"`. */
    readonly option: string;
    /** The value that key must take. */
    readonly value: string;
}
interface OperationDescriptor {
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

/**
 * Registry descriptors for the `pptx` domain (OC-1 §6).
 *
 * A sibling subpath rather than part of `./ops`, because R35 keeps that surface
 * to canonical verbs and types — descriptors are metadata about the operations,
 * not operations.
 */

declare const PPTX_OPERATIONS: readonly OperationDescriptor[];

export { PPTX_OPERATIONS, PPTX_OPERATIONS as default };
