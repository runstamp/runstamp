import { z } from "zod";
/** Stable wire envelope for invoking a dependency-neutral extension. */
export declare const ExtensionV1RequestSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    request: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        extensionId: z.ZodString;
        operation: z.ZodString;
        input: z.ZodType<import("./extension-runtime.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./extension-runtime.js").JsonValue, unknown>>;
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
}, z.core.$strict>;
/** Stable wire envelope for extension output plus validation evidence. */
export declare const ExtensionV1ResultSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    result: z.ZodDiscriminatedUnion<[z.ZodObject<{
        status: z.ZodLiteral<"ok">;
        output: z.ZodType<import("./extension-runtime.js").JsonValue, unknown, z.core.$ZodTypeInternals<import("./extension-runtime.js").JsonValue, unknown>>;
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
    validators: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ExtensionV1Request = z.infer<typeof ExtensionV1RequestSchema>;
export type ExtensionV1Result = z.infer<typeof ExtensionV1ResultSchema>;
//# sourceMappingURL=extension-v1.d.ts.map