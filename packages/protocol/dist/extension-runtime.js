import { z } from "zod";
const JsonScalarSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
export const JsonValueSchema = z.lazy(() => z.union([
    JsonScalarSchema,
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
]));
/** Encode untrusted text for either XML character data or an attribute value. */
export function encodeXmlText(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}
const StableCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{2,127}$/);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const ExtensionOperationSchema = z.strictObject({
    name: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
    summary: z.string().min(1).max(240),
    inputKinds: z.array(z.string().min(1)).min(1),
    outputKinds: z.array(z.string().min(1)).min(1),
});
export const DeclaredCodeSchema = z.strictObject({
    code: StableCodeSchema,
    description: z.string().min(1).max(500),
});
export const ExtensionManifestSchema = z.strictObject({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    catalogItemId: z.string().regex(/^(?:EX|A|O|G|D|W)\d{2}$/),
    title: z.string().min(1).max(160),
    operations: z.array(ExtensionOperationSchema).min(1),
    warningCodes: z.array(DeclaredCodeSchema),
    lossCodes: z.array(DeclaredCodeSchema),
}).superRefine((manifest, context) => {
    for (const [label, values] of [
        ["operation", manifest.operations.map((entry) => entry.name)],
        ["warning code", manifest.warningCodes.map((entry) => entry.code)],
        ["loss code", manifest.lossCodes.map((entry) => entry.code)],
    ]) {
        if (new Set(values).size !== values.length) {
            context.addIssue({ code: "custom", message: `Duplicate ${label} declarations are not allowed.` });
        }
    }
});
export const ResourceBudgetSchema = z.strictObject({
    maxInputBytes: z.number().int().positive(),
    maxOutputBytes: z.number().int().positive(),
    maxEntries: z.number().int().positive(),
    maxDepth: z.number().int().positive(),
    timeoutMs: z.number().int().positive(),
});
export const DeterministicContextSchema = z.strictObject({
    runId: z.string().min(1).max(160),
    seed: z.string().min(1).max(256),
    now: z.iso.datetime({ offset: true }),
    network: z.literal("disabled"),
    budget: ResourceBudgetSchema,
});
export const ExtensionRequestSchema = z.strictObject({
    schemaVersion: z.literal(1),
    extensionId: z.string().min(1),
    operation: z.string().min(1),
    input: JsonValueSchema,
    context: DeterministicContextSchema,
});
export const ExtensionLocatorSchema = z.strictObject({
    artifactId: z.string().min(1).max(256),
    scheme: z.string().regex(/^[a-z][a-z0-9.-]{1,63}$/),
    value: z.array(z.union([z.string(), z.number().int().nonnegative()])).min(1),
});
export const ExtensionDiagnosticSchema = z.strictObject({
    code: StableCodeSchema,
    message: z.string().min(1).max(2_000),
    severity: z.enum(["info", "warning", "error"]).optional(),
    locator: ExtensionLocatorSchema.optional(),
});
export const ArtifactDescriptorSchema = z.strictObject({
    name: z.string().min(1).max(256),
    mediaType: z.string().min(1).max(160),
    byteLength: z.number().int().nonnegative(),
    sha256: Sha256Schema,
});
export const ExtensionSuccessSchema = z.strictObject({
    status: z.literal("ok"),
    output: JsonValueSchema,
    warnings: z.array(ExtensionDiagnosticSchema),
    losses: z.array(ExtensionDiagnosticSchema),
    artifacts: z.array(ArtifactDescriptorSchema),
});
export const ExtensionFailureSchema = z.strictObject({
    status: z.literal("error"),
    error: z.strictObject({
        code: StableCodeSchema,
        message: z.string().min(1).max(2_000),
        retryable: z.boolean(),
    }),
    warnings: z.array(ExtensionDiagnosticSchema),
    losses: z.array(ExtensionDiagnosticSchema),
    artifacts: z.array(ArtifactDescriptorSchema),
});
export const ExtensionResultSchema = z.discriminatedUnion("status", [ExtensionSuccessSchema, ExtensionFailureSchema]);
export const ProgressUpdateSchema = z.strictObject({
    completed: z.number().finite().nonnegative(),
    total: z.number().finite().positive(),
    message: z.string().min(1).max(500).optional(),
}).refine((progress) => progress.completed <= progress.total, "completed cannot exceed total");
export const ResourceUsageSchema = z.strictObject({
    inputBytes: z.number().int().nonnegative().optional(),
    outputBytes: z.number().int().nonnegative().optional(),
    entries: z.number().int().nonnegative().optional(),
    depth: z.number().int().nonnegative().optional(),
});
export const ValidatorIssueSchema = z.strictObject({
    code: StableCodeSchema,
    message: z.string().min(1).max(2_000),
    severity: z.enum(["info", "warning", "error"]),
    locator: ExtensionLocatorSchema.optional(),
});
export const ValidatorResultSchema = z.strictObject({
    validator: z.string().min(1).max(160),
    version: z.string().min(1).max(160),
    required: z.boolean(),
    status: z.enum(["PASS", "FAIL", "ADVISORY", "BLOCKED_EXTERNAL"]),
    command: z.string().min(1).max(2_000),
    issues: z.array(ValidatorIssueSchema),
}).superRefine((result, context) => {
    if (result.required && result.status === "ADVISORY") {
        context.addIssue({ code: "custom", path: ["status"], message: "A required validator cannot be advisory." });
    }
    if (result.status === "PASS" && result.issues.some((issue) => issue.severity === "error")) {
        context.addIssue({ code: "custom", path: ["issues"], message: "A passing validator cannot contain error issues." });
    }
});
export const FixtureDescriptorSchema = z.strictObject({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,127}$/),
    kind: z.enum(["minimal", "buyer_realistic", "unrelated_domain", "boundary", "hostile", "known_bad", "determinism", "round_trip", "composition"]),
    operation: z.string().min(1),
    input: JsonValueSchema,
    expectedStatus: z.enum(["ok", "error"]),
    validators: z.array(z.string().min(1)),
});
export class ExtensionExecutionError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "ExtensionExecutionError";
        this.code = code;
        this.details = details;
    }
}
function encodedSize(value) {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
function assertBudget(budget, usage) {
    const limits = [
        ["inputBytes", "maxInputBytes"],
        ["outputBytes", "maxOutputBytes"],
        ["entries", "maxEntries"],
        ["depth", "maxDepth"],
    ];
    for (const [usageKey, budgetKey] of limits) {
        const amount = usage[usageKey];
        if (amount !== undefined && amount > budget[budgetKey]) {
            throw new ExtensionExecutionError("RESOURCE_LIMIT", `${usageKey} ${amount} exceeds ${budgetKey} ${budget[budgetKey]}.`, { usageKey, amount, budgetKey, limit: budget[budgetKey] });
        }
    }
}
function abortError(signal) {
    return new ExtensionExecutionError("EXTENSION_ABORTED", typeof signal.reason === "string" ? signal.reason : "Extension execution was aborted.");
}
export function validateExtensionResult(manifestInput, resultInput) {
    const manifest = ExtensionManifestSchema.parse(manifestInput);
    const parsed = ExtensionResultSchema.safeParse(resultInput);
    if (!parsed.success)
        throw new ExtensionExecutionError("INVALID_RESULT", parsed.error.message);
    const warningCodes = new Set(manifest.warningCodes.map((entry) => entry.code));
    const lossCodes = new Set(manifest.lossCodes.map((entry) => entry.code));
    for (const warning of parsed.data.warnings) {
        if (!warningCodes.has(warning.code))
            throw new ExtensionExecutionError("INVALID_RESULT", `Extension ${manifest.id} emitted undeclared warning code ${warning.code}.`);
    }
    for (const loss of parsed.data.losses) {
        if (!lossCodes.has(loss.code))
            throw new ExtensionExecutionError("INVALID_RESULT", `Extension ${manifest.id} emitted undeclared loss code ${loss.code}.`);
    }
    return parsed.data;
}
export async function runExtension(definitionInput, requestInput, options = {}) {
    const manifest = ExtensionManifestSchema.parse(definitionInput.manifest);
    const parsedRequest = ExtensionRequestSchema.safeParse(requestInput);
    if (!parsedRequest.success)
        throw new ExtensionExecutionError("INVALID_REQUEST", parsedRequest.error.message);
    const request = parsedRequest.data;
    if (request.extensionId !== manifest.id)
        throw new ExtensionExecutionError("INVALID_REQUEST", `Request extensionId ${request.extensionId} does not match ${manifest.id}.`);
    if (!manifest.operations.some((operation) => operation.name === request.operation))
        throw new ExtensionExecutionError("INVALID_REQUEST", `Extension ${manifest.id} does not declare operation ${request.operation}.`);
    if (options.signal?.aborted)
        throw abortError(options.signal);
    assertBudget(request.context.budget, { inputBytes: encodedSize(request.input) });
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", forwardAbort, { once: true });
    const timeout = setTimeout(() => controller.abort("Extension execution timed out."), request.context.budget.timeoutMs);
    const context = {
        signal: controller.signal,
        deterministic: request.context,
        budget: request.context.budget,
        reportProgress(update) {
            options.onProgress?.(ProgressUpdateSchema.parse(update));
        },
        checkpoint(usage) {
            assertBudget(request.context.budget, ResourceUsageSchema.parse(usage));
            if (controller.signal.aborted)
                throw abortError(controller.signal);
        },
    };
    const abortPromise = new Promise((_resolve, reject) => {
        controller.signal.addEventListener("abort", () => reject(abortError(controller.signal)), { once: true });
    });
    try {
        const result = await Promise.race([definitionInput.execute(request, context), abortPromise]);
        const validated = validateExtensionResult(manifest, result);
        assertBudget(request.context.budget, { outputBytes: encodedSize(validated) });
        return validated;
    }
    finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", forwardAbort);
    }
}
function canonicalize(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalize).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}
async function sha256(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function canonicalHash(value) {
    return sha256(new TextEncoder().encode(canonicalize(value)));
}
export async function hashArtifact(bytes) {
    return sha256(bytes);
}
export function assessKnownBadControl(resultInput) {
    const result = ValidatorResultSchema.parse(resultInput);
    if (result.status === "FAIL") {
        return { validator: `${result.validator}:known-bad-control`, version: result.version, required: true, status: "PASS", command: result.command, issues: [] };
    }
    return {
        validator: `${result.validator}:known-bad-control`,
        version: result.version,
        required: true,
        status: "FAIL",
        command: result.command,
        issues: [{ code: "DEAD_VALIDATOR", message: `Known-bad control was ${result.status}; the validator cannot approve releases.`, severity: "error" }],
    };
}
//# sourceMappingURL=extension-runtime.js.map