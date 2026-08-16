import { z } from "zod";
export declare const JsonValueSchema: z.ZodType<JsonValue>;
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
/** Encode untrusted text for either XML character data or an attribute value. */
export declare function encodeXmlText(value: string): string;
export declare const ExtensionOperationSchema: z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    inputKinds: z.ZodArray<z.ZodString>;
    outputKinds: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const DeclaredCodeSchema: z.ZodObject<{
    code: z.ZodString;
    description: z.ZodString;
}, z.core.$strict>;
export declare const ExtensionManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    version: z.ZodString;
    catalogItemId: z.ZodString;
    title: z.ZodString;
    operations: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        summary: z.ZodString;
        inputKinds: z.ZodArray<z.ZodString>;
        outputKinds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    warningCodes: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
    }, z.core.$strict>>;
    lossCodes: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;
export declare const ResourceBudgetSchema: z.ZodObject<{
    maxInputBytes: z.ZodNumber;
    maxOutputBytes: z.ZodNumber;
    maxEntries: z.ZodNumber;
    maxDepth: z.ZodNumber;
    timeoutMs: z.ZodNumber;
}, z.core.$strict>;
export declare const DeterministicContextSchema: z.ZodObject<{
    runId: z.ZodString;
    seed: z.ZodString;
    now: z.ZodISODateTime;
    network: z.ZodLiteral<"disabled">;
    budget: z.ZodObject<{
        maxInputBytes: z.ZodNumber;
        maxOutputBytes: z.ZodNumber;
        maxEntries: z.ZodNumber;
        maxDepth: z.ZodNumber;
        timeoutMs: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const ExtensionRequestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    extensionId: z.ZodString;
    operation: z.ZodString;
    input: z.ZodType<JsonValue, unknown, z.core.$ZodTypeInternals<JsonValue, unknown>>;
    context: z.ZodObject<{
        runId: z.ZodString;
        seed: z.ZodString;
        now: z.ZodISODateTime;
        network: z.ZodLiteral<"disabled">;
        budget: z.ZodObject<{
            maxInputBytes: z.ZodNumber;
            maxOutputBytes: z.ZodNumber;
            maxEntries: z.ZodNumber;
            maxDepth: z.ZodNumber;
            timeoutMs: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type ExtensionRequest = z.infer<typeof ExtensionRequestSchema>;
export type ResourceBudget = z.infer<typeof ResourceBudgetSchema>;
export declare const ExtensionLocatorSchema: z.ZodObject<{
    artifactId: z.ZodString;
    scheme: z.ZodString;
    value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
}, z.core.$strict>;
export type ExtensionLocator = z.infer<typeof ExtensionLocatorSchema>;
export declare const ExtensionDiagnosticSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    severity: z.ZodOptional<z.ZodEnum<{
        error: "error";
        warning: "warning";
        info: "info";
    }>>;
    locator: z.ZodOptional<z.ZodObject<{
        artifactId: z.ZodString;
        scheme: z.ZodString;
        value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const ArtifactDescriptorSchema: z.ZodObject<{
    name: z.ZodString;
    mediaType: z.ZodString;
    byteLength: z.ZodNumber;
    sha256: z.ZodString;
}, z.core.$strict>;
export declare const ExtensionSuccessSchema: z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    output: z.ZodType<JsonValue, unknown, z.core.$ZodTypeInternals<JsonValue, unknown>>;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    losses: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    artifacts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        mediaType: z.ZodString;
        byteLength: z.ZodNumber;
        sha256: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const ExtensionFailureSchema: z.ZodObject<{
    status: z.ZodLiteral<"error">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    losses: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    artifacts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        mediaType: z.ZodString;
        byteLength: z.ZodNumber;
        sha256: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const ExtensionResultSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    output: z.ZodType<JsonValue, unknown, z.core.$ZodTypeInternals<JsonValue, unknown>>;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    losses: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    artifacts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        mediaType: z.ZodString;
        byteLength: z.ZodNumber;
        sha256: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"error">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    losses: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodOptional<z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    artifacts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        mediaType: z.ZodString;
        byteLength: z.ZodNumber;
        sha256: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>], "status">;
export type ExtensionResult = z.infer<typeof ExtensionResultSchema>;
export declare const ProgressUpdateSchema: z.ZodObject<{
    completed: z.ZodNumber;
    total: z.ZodNumber;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;
export declare const ResourceUsageSchema: z.ZodObject<{
    inputBytes: z.ZodOptional<z.ZodNumber>;
    outputBytes: z.ZodOptional<z.ZodNumber>;
    entries: z.ZodOptional<z.ZodNumber>;
    depth: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;
export declare const ValidatorIssueSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    severity: z.ZodEnum<{
        error: "error";
        warning: "warning";
        info: "info";
    }>;
    locator: z.ZodOptional<z.ZodObject<{
        artifactId: z.ZodString;
        scheme: z.ZodString;
        value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const ValidatorResultSchema: z.ZodObject<{
    validator: z.ZodString;
    version: z.ZodString;
    required: z.ZodBoolean;
    status: z.ZodEnum<{
        PASS: "PASS";
        FAIL: "FAIL";
        ADVISORY: "ADVISORY";
        BLOCKED_EXTERNAL: "BLOCKED_EXTERNAL";
    }>;
    command: z.ZodString;
    issues: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        severity: z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>;
        locator: z.ZodOptional<z.ZodObject<{
            artifactId: z.ZodString;
            scheme: z.ZodString;
            value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ValidatorResult = z.infer<typeof ValidatorResultSchema>;
export declare const FixtureDescriptorSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<{
        minimal: "minimal";
        buyer_realistic: "buyer_realistic";
        unrelated_domain: "unrelated_domain";
        boundary: "boundary";
        hostile: "hostile";
        known_bad: "known_bad";
        determinism: "determinism";
        round_trip: "round_trip";
        composition: "composition";
    }>;
    operation: z.ZodString;
    input: z.ZodType<JsonValue, unknown, z.core.$ZodTypeInternals<JsonValue, unknown>>;
    expectedStatus: z.ZodEnum<{
        error: "error";
        ok: "ok";
    }>;
    validators: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type FixtureDescriptor = z.infer<typeof FixtureDescriptorSchema>;
export declare class ExtensionExecutionError extends Error {
    readonly code: "INVALID_REQUEST" | "EXTENSION_ABORTED" | "RESOURCE_LIMIT" | "INVALID_RESULT";
    readonly details?: JsonValue;
    constructor(code: ExtensionExecutionError["code"], message: string, details?: JsonValue);
}
export interface ExtensionExecutionContext {
    readonly signal: AbortSignal;
    readonly deterministic: z.infer<typeof DeterministicContextSchema>;
    readonly budget: ResourceBudget;
    reportProgress(update: ProgressUpdate): void;
    checkpoint(usage: ResourceUsage): void;
}
export interface ExtensionDefinition {
    manifest: ExtensionManifest;
    execute(request: ExtensionRequest, context: ExtensionExecutionContext): Promise<ExtensionResult>;
}
export interface RunExtensionOptions {
    signal?: AbortSignal;
    onProgress?: (update: ProgressUpdate) => void;
}
export declare function validateExtensionResult(manifestInput: ExtensionManifest, resultInput: unknown): ExtensionResult;
export declare function runExtension(definitionInput: ExtensionDefinition, requestInput: unknown, options?: RunExtensionOptions): Promise<ExtensionResult>;
export declare function canonicalHash(value: JsonValue): Promise<string>;
export declare function hashArtifact(bytes: Uint8Array): Promise<string>;
export declare function assessKnownBadControl(resultInput: ValidatorResult): ValidatorResult;
//# sourceMappingURL=extension-runtime.d.ts.map