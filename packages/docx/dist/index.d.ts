type _JSONSchema = boolean | JSONSchema;
type JSONSchema = {
    [k: string]: unknown;
    $schema?: "https://json-schema.org/draft/2020-12/schema" | "http://json-schema.org/draft-07/schema#" | "http://json-schema.org/draft-04/schema#";
    $id?: string;
    $anchor?: string;
    $ref?: string;
    $dynamicRef?: string;
    $dynamicAnchor?: string;
    $vocabulary?: Record<string, boolean>;
    $comment?: string;
    $defs?: Record<string, JSONSchema>;
    type?: "object" | "array" | "string" | "number" | "boolean" | "null" | "integer";
    additionalItems?: _JSONSchema;
    unevaluatedItems?: _JSONSchema;
    prefixItems?: _JSONSchema[];
    items?: _JSONSchema | _JSONSchema[];
    contains?: _JSONSchema;
    additionalProperties?: _JSONSchema;
    unevaluatedProperties?: _JSONSchema;
    properties?: Record<string, _JSONSchema>;
    patternProperties?: Record<string, _JSONSchema>;
    dependentSchemas?: Record<string, _JSONSchema>;
    propertyNames?: _JSONSchema;
    if?: _JSONSchema;
    then?: _JSONSchema;
    else?: _JSONSchema;
    allOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    not?: _JSONSchema;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number | boolean;
    minimum?: number;
    exclusiveMinimum?: number | boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    dependentRequired?: Record<string, string[]>;
    enum?: Array<string | number | boolean | null>;
    const?: string | number | boolean | null;
    id?: string;
    title?: string;
    description?: string;
    default?: unknown;
    deprecated?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    nullable?: boolean;
    examples?: unknown[];
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    contentSchema?: JSONSchema;
    _prefault?: unknown;
};
type BaseSchema = JSONSchema;

/** The Standard interface. */
interface StandardTypedV1<Input = unknown, Output = Input> {
    /** The Standard properties. */
    readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
declare namespace StandardTypedV1 {
    /** The Standard properties interface. */
    interface Props<Input = unknown, Output = Input> {
        /** The version number of the standard. */
        readonly version: 1;
        /** The vendor name of the schema library. */
        readonly vendor: string;
        /** Inferred types associated with the schema. */
        readonly types?: Types<Input, Output> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> {
        /** The input type of the schema. */
        readonly input: Input;
        /** The output type of the schema. */
        readonly output: Output;
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["input"];
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
    /** The Standard Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Validates unknown input values. */
        readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
    }
    /** The result interface of the validate function. */
    type Result<Output> = SuccessResult<Output> | FailureResult;
    /** The result interface if validation succeeds. */
    interface SuccessResult<Output> {
        /** The typed output value. */
        readonly value: Output;
        /** The absence of issues indicates success. */
        readonly issues?: undefined;
    }
    interface Options {
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The result interface if validation fails. */
    interface FailureResult {
        /** The issues of failed validation. */
        readonly issues: ReadonlyArray<Issue>;
    }
    /** The issue interface of the failure output. */
    interface Issue {
        /** The error message of the issue. */
        readonly message: string;
        /** The path of the issue, if any. */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    /** The path segment interface of the issue. */
    interface PathSegment {
        /** The key representing a path segment. */
        readonly key: PropertyKey;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
/** The Standard JSON Schema interface. */
interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
    /** The Standard JSON Schema properties. */
    readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}
declare namespace StandardJSONSchemaV1 {
    /** The Standard JSON Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Methods for generating the input/output JSON Schema. */
        readonly jsonSchema: Converter;
    }
    /** The Standard JSON Schema converter interface. */
    interface Converter {
        /** Converts the input type to JSON Schema. May throw if conversion is not supported. */
        readonly input: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
        /** Converts the output type to JSON Schema. May throw if conversion is not supported. */
        readonly output: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
    }
    /** The target version of the generated JSON Schema.
     *
     * It is *strongly recommended* that implementers support `"draft-2020-12"` and `"draft-07"`, as they are both in wide use.
     *
     * The `"openapi-3.0"` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema `"draft-04"`.
     *
     * All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.
     */
    type Target = "draft-2020-12" | "draft-07" | "openapi-3.0" | ({} & string);
    /** The options for the input/output methods. */
    interface Options {
        /** Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. */
        readonly target: Target;
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
interface StandardSchemaWithJSONProps<Input = unknown, Output = Input> extends StandardSchemaV1.Props<Input, Output>, StandardJSONSchemaV1.Props<Input, Output> {
}

declare const $output: unique symbol;
type $output = typeof $output;
declare const $input: unique symbol;
type $input = typeof $input;
type $replace<Meta, S extends $ZodType> = Meta extends $output ? output<S> : Meta extends $input ? input<S> : Meta extends (infer M)[] ? $replace<M, S>[] : Meta extends (...args: infer P) => infer R ? (...args: {
    [K in keyof P]: $replace<P[K], S>;
}) => $replace<R, S> : Meta extends object ? {
    [K in keyof Meta]: $replace<Meta[K], S>;
} : Meta;
type MetadataType = object | undefined;
declare class $ZodRegistry<Meta extends MetadataType = MetadataType, Schema extends $ZodType = $ZodType> {
    _meta: Meta;
    _schema: Schema;
    _map: WeakMap<Schema, $replace<Meta, Schema>>;
    _idmap: Map<string, Schema>;
    add<S extends Schema>(schema: S, ..._meta: undefined extends Meta ? [$replace<Meta, S>?] : [$replace<Meta, S>]): this;
    clear(): this;
    remove(schema: Schema): this;
    get<S extends Schema>(schema: S): $replace<Meta, S> | undefined;
    has(schema: Schema): boolean;
}
interface JSONSchemaMeta {
    id?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    deprecated?: boolean | undefined;
    [k: string]: unknown;
}
interface GlobalMeta extends JSONSchemaMeta {
}

type Processor<T extends $ZodType = $ZodType> = (schema: T, ctx: ToJSONSchemaContext, json: BaseSchema, params: ProcessParams) => void;
interface JSONSchemaGeneratorParams {
    processors: Record<string, Processor>;
    /** A registry used to look up metadata for each schema. Any schema with an `id` property will be extracted as a $def.
     *  @default globalRegistry */
    metadata?: $ZodRegistry<Record<string, any>>;
    /** The JSON Schema version to target.
     * - `"draft-2020-12"` — Default. JSON Schema Draft 2020-12
     * - `"draft-07"` — JSON Schema Draft 7
     * - `"draft-04"` — JSON Schema Draft 4
     * - `"openapi-3.0"` — OpenAPI 3.0 Schema Object */
    target?: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string) | undefined;
    /** How to handle unrepresentable types.
     * - `"throw"` — Default. Unrepresentable types throw an error
     * - `"any"` — Unrepresentable types become `{}` */
    unrepresentable?: "throw" | "any";
    /** Arbitrary custom logic that can be used to modify the generated JSON Schema. */
    override?: (ctx: {
        zodSchema: $ZodTypes;
        jsonSchema: BaseSchema;
        path: (string | number)[];
    }) => void;
    /** Whether to extract the `"input"` or `"output"` type. Relevant to transforms, defaults, coerced primitives, etc.
     * - `"output"` — Default. Convert the output schema.
     * - `"input"` — Convert the input schema. */
    io?: "input" | "output";
    cycles?: "ref" | "throw";
    reused?: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, BaseSchema>;
    } | undefined;
}
/**
 * Parameters for the toJSONSchema function.
 */
type ToJSONSchemaParams = Omit<JSONSchemaGeneratorParams, "processors" | "external">;
interface ProcessParams {
    schemaPath: $ZodType[];
    path: (string | number)[];
}
interface Seen {
    /** JSON Schema result for this Zod schema */
    schema: BaseSchema;
    /** A cached version of the schema that doesn't get overwritten during ref resolution */
    def?: BaseSchema;
    defId?: string | undefined;
    /** Number of times this schema was encountered during traversal */
    count: number;
    /** Cycle path */
    cycle?: (string | number)[] | undefined;
    isParent?: boolean | undefined;
    /** Schema to inherit JSON Schema properties from (set by processor for wrappers) */
    ref?: $ZodType | null;
    /** JSON Schema property path for this schema */
    path?: (string | number)[] | undefined;
}
interface ToJSONSchemaContext {
    processors: Record<string, Processor>;
    metadataRegistry: $ZodRegistry<Record<string, any>>;
    target: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string);
    unrepresentable: "throw" | "any";
    override: (ctx: {
        zodSchema: $ZodType;
        jsonSchema: BaseSchema;
        path: (string | number)[];
    }) => void;
    io: "input" | "output";
    counter: number;
    seen: Map<$ZodType, Seen>;
    cycles: "ref" | "throw";
    reused: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, BaseSchema>;
    } | undefined;
}
type ZodStandardSchemaWithJSON$1<T> = StandardSchemaWithJSONProps<input<T>, output<T>>;
interface ZodStandardJSONSchemaPayload<T> extends BaseSchema {
    "~standard": ZodStandardSchemaWithJSON$1<T>;
}

type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "EdDSA" | (string & {});
type MimeTypes = "application/json" | "application/xml" | "application/x-www-form-urlencoded" | "application/javascript" | "application/pdf" | "application/zip" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/octet-stream" | "application/graphql" | "text/html" | "text/plain" | "text/css" | "text/javascript" | "text/csv" | "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" | "image/webp" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "video/mp4" | "video/webm" | "video/ogg" | "font/woff" | "font/woff2" | "font/ttf" | "font/otf" | "multipart/form-data" | (string & {});
type IsAny<T> = 0 extends 1 & T ? true : false;
type Omit$1<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type MakePartial<T, K extends keyof T> = Omit$1<T, K> & InexactPartial<Pick<T, K>>;
type NoUndefined<T> = T extends undefined ? never : T;
type LoosePartial<T extends object> = InexactPartial<T> & {
    [k: string]: unknown;
};
type Mask<Keys extends PropertyKey> = {
    [K in Keys]?: true;
};
type InexactPartial<T> = {
    [P in keyof T]?: T[P] | undefined;
};
type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
type SomeObject = Record<PropertyKey, any>;
type Identity<T> = T;
type Flatten<T> = Identity<{
    [k in keyof T]: T[k];
}>;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type Extend<A extends SomeObject, B extends SomeObject> = Flatten<keyof A & keyof B extends never ? A & B : {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & {
    [K in keyof B]: B[K];
}>;
type TupleItems = ReadonlyArray<SomeType>;
type AnyFunc = (...args: any[]) => any;
type MaybeAsync<T> = T | Promise<T>;
type EnumValue = string | number;
type EnumLike = Readonly<Record<string, EnumValue>>;
type ToEnum<T extends EnumValue> = Flatten<{
    [k in T]: k;
}>;
type Literal = string | number | bigint | boolean | null | undefined;
type Primitive = string | number | symbol | bigint | boolean | null | undefined;
type HasLength = {
    length: number;
};
type Numeric = number | bigint | Date;
type PropValues = Record<string, Set<Primitive>>;
type PrimitiveSet = Set<Primitive>;
type EmptyToNever<T> = keyof T extends never ? never : T;
declare abstract class Class {
    constructor(..._args: any[]);
}

declare const version: {
    readonly major: 4;
    readonly minor: 3;
    readonly patch: number;
};

interface ParseContext<T extends $ZodIssueBase = never> {
    /** Customize error messages. */
    readonly error?: $ZodErrorMap<T>;
    /** Include the `input` field in issue objects. Default `false`. */
    readonly reportInput?: boolean;
    /** Skip eval-based fast path. Default `false`. */
    readonly jitless?: boolean;
}
/** @internal */
interface ParseContextInternal<T extends $ZodIssueBase = never> extends ParseContext<T> {
    readonly async?: boolean | undefined;
    readonly direction?: "forward" | "backward";
    readonly skipChecks?: boolean;
}
interface ParsePayload<T = unknown> {
    value: T;
    issues: $ZodRawIssue[];
    /** A may to mark a whole payload as aborted. Used in codecs/pipes. */
    aborted?: boolean;
}
type CheckFn<T> = (input: ParsePayload<T>) => MaybeAsync<void>;
interface $ZodTypeDef {
    type: "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "null" | "undefined" | "void" | "never" | "any" | "unknown" | "date" | "object" | "record" | "file" | "array" | "tuple" | "union" | "intersection" | "map" | "set" | "enum" | "literal" | "nullable" | "optional" | "nonoptional" | "success" | "transform" | "default" | "prefault" | "catch" | "nan" | "pipe" | "readonly" | "template_literal" | "promise" | "lazy" | "function" | "custom";
    error?: $ZodErrorMap<never> | undefined;
    checks?: $ZodCheck<never>[];
}
interface _$ZodTypeInternals {
    /** The `@zod/core` version of this schema */
    version: typeof version;
    /** Schema definition. */
    def: $ZodTypeDef;
    /** @internal Randomly generated ID for this schema. */
    /** @internal List of deferred initializers. */
    deferred: AnyFunc[] | undefined;
    /** @internal Parses input and runs all checks (refinements). */
    run(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
    /** @internal Parses input, doesn't run checks. */
    parse(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
    /** @internal  Stores identifiers for the set of traits implemented by this schema. */
    traits: Set<string>;
    /** @internal Indicates that a schema output type should be considered optional inside objects.
     * @default Required
     */
    /** @internal */
    optin?: "optional" | undefined;
    /** @internal */
    optout?: "optional" | undefined;
    /** @internal The set of literal values that will pass validation. Must be an exhaustive set. Used to determine optionality in z.record().
     *
     * Defined on: enum, const, literal, null, undefined
     * Passthrough: optional, nullable, branded, default, catch, pipe
     * Todo: unions?
     */
    values?: PrimitiveSet | undefined;
    /** Default value bubbled up from  */
    /** @internal A set of literal discriminators used for the fast path in discriminated unions. */
    propValues?: PropValues | undefined;
    /** @internal This flag indicates that a schema validation can be represented with a regular expression. Used to determine allowable schemas in z.templateLiteral(). */
    pattern: RegExp | undefined;
    /** @internal The constructor function of this schema. */
    constr: new (def: any) => $ZodType;
    /** @internal A catchall object for bag metadata related to this schema. Commonly modified by checks using `onattach`. */
    bag: Record<string, unknown>;
    /** @internal The set of issues this schema might throw during type checking. */
    isst: $ZodIssueBase;
    /** @internal Subject to change, not a public API. */
    processJSONSchema?: ((ctx: ToJSONSchemaContext, json: BaseSchema, params: ProcessParams) => void) | undefined;
    /** An optional method used to override `toJSONSchema` logic. */
    toJSONSchema?: () => unknown;
    /** @internal The parent of this schema. Only set during certain clone operations. */
    parent?: $ZodType | undefined;
}
/** @internal */
interface $ZodTypeInternals<out O = unknown, out I = unknown> extends _$ZodTypeInternals {
    /** @internal The inferred output type */
    output: O;
    /** @internal The inferred input type */
    input: I;
}
type $ZodStandardSchema<T> = StandardSchemaV1.Props<input<T>, output<T>>;
type SomeType = {
    _zod: _$ZodTypeInternals;
};
interface _$ZodType<T extends $ZodTypeInternals = $ZodTypeInternals> extends $ZodType<T["output"], T["input"], T> {
}
interface $ZodType<O = unknown, I = unknown, Internals extends $ZodTypeInternals<O, I> = $ZodTypeInternals<O, I>> {
    _zod: Internals;
    "~standard": $ZodStandardSchema<this>;
}
declare const $ZodType: $constructor<$ZodType>;

interface $ZodStringDef extends $ZodTypeDef {
    type: "string";
    coerce?: boolean;
    checks?: $ZodCheck<string>[];
}
interface $ZodStringInternals<Input> extends $ZodTypeInternals<string, Input> {
    def: $ZodStringDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        patterns: Set<RegExp>;
        format: string;
        contentEncoding: string;
    }>;
}
interface $ZodString<Input = unknown> extends _$ZodType<$ZodStringInternals<Input>> {
}
declare const $ZodString: $constructor<$ZodString>;
interface $ZodStringFormatDef<Format extends string = string> extends $ZodStringDef, $ZodCheckStringFormatDef<Format> {
}
interface $ZodStringFormatInternals<Format extends string = string> extends $ZodStringInternals<string>, $ZodCheckStringFormatInternals {
    def: $ZodStringFormatDef<Format>;
}
interface $ZodStringFormat<Format extends string = string> extends $ZodType {
    _zod: $ZodStringFormatInternals<Format>;
}
declare const $ZodStringFormat: $constructor<$ZodStringFormat>;
interface $ZodGUIDInternals extends $ZodStringFormatInternals<"guid"> {
}
interface $ZodGUID extends $ZodType {
    _zod: $ZodGUIDInternals;
}
declare const $ZodGUID: $constructor<$ZodGUID>;
interface $ZodUUIDDef extends $ZodStringFormatDef<"uuid"> {
    version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
}
interface $ZodUUIDInternals extends $ZodStringFormatInternals<"uuid"> {
    def: $ZodUUIDDef;
}
interface $ZodUUID extends $ZodType {
    _zod: $ZodUUIDInternals;
}
declare const $ZodUUID: $constructor<$ZodUUID>;
interface $ZodEmailInternals extends $ZodStringFormatInternals<"email"> {
}
interface $ZodEmail extends $ZodType {
    _zod: $ZodEmailInternals;
}
declare const $ZodEmail: $constructor<$ZodEmail>;
interface $ZodURLDef extends $ZodStringFormatDef<"url"> {
    hostname?: RegExp | undefined;
    protocol?: RegExp | undefined;
    normalize?: boolean | undefined;
}
interface $ZodURLInternals extends $ZodStringFormatInternals<"url"> {
    def: $ZodURLDef;
}
interface $ZodURL extends $ZodType {
    _zod: $ZodURLInternals;
}
declare const $ZodURL: $constructor<$ZodURL>;
interface $ZodEmojiInternals extends $ZodStringFormatInternals<"emoji"> {
}
interface $ZodEmoji extends $ZodType {
    _zod: $ZodEmojiInternals;
}
declare const $ZodEmoji: $constructor<$ZodEmoji>;
interface $ZodNanoIDInternals extends $ZodStringFormatInternals<"nanoid"> {
}
interface $ZodNanoID extends $ZodType {
    _zod: $ZodNanoIDInternals;
}
declare const $ZodNanoID: $constructor<$ZodNanoID>;
interface $ZodCUIDInternals extends $ZodStringFormatInternals<"cuid"> {
}
interface $ZodCUID extends $ZodType {
    _zod: $ZodCUIDInternals;
}
declare const $ZodCUID: $constructor<$ZodCUID>;
interface $ZodCUID2Internals extends $ZodStringFormatInternals<"cuid2"> {
}
interface $ZodCUID2 extends $ZodType {
    _zod: $ZodCUID2Internals;
}
declare const $ZodCUID2: $constructor<$ZodCUID2>;
interface $ZodULIDInternals extends $ZodStringFormatInternals<"ulid"> {
}
interface $ZodULID extends $ZodType {
    _zod: $ZodULIDInternals;
}
declare const $ZodULID: $constructor<$ZodULID>;
interface $ZodXIDInternals extends $ZodStringFormatInternals<"xid"> {
}
interface $ZodXID extends $ZodType {
    _zod: $ZodXIDInternals;
}
declare const $ZodXID: $constructor<$ZodXID>;
interface $ZodKSUIDInternals extends $ZodStringFormatInternals<"ksuid"> {
}
interface $ZodKSUID extends $ZodType {
    _zod: $ZodKSUIDInternals;
}
declare const $ZodKSUID: $constructor<$ZodKSUID>;
interface $ZodISODateTimeDef extends $ZodStringFormatDef<"datetime"> {
    precision: number | null;
    offset: boolean;
    local: boolean;
}
interface $ZodISODateTimeInternals extends $ZodStringFormatInternals {
    def: $ZodISODateTimeDef;
}
interface $ZodISODateTime extends $ZodType {
    _zod: $ZodISODateTimeInternals;
}
declare const $ZodISODateTime: $constructor<$ZodISODateTime>;
interface $ZodISODateInternals extends $ZodStringFormatInternals<"date"> {
}
interface $ZodISODate extends $ZodType {
    _zod: $ZodISODateInternals;
}
declare const $ZodISODate: $constructor<$ZodISODate>;
interface $ZodISOTimeDef extends $ZodStringFormatDef<"time"> {
    precision?: number | null;
}
interface $ZodISOTimeInternals extends $ZodStringFormatInternals<"time"> {
    def: $ZodISOTimeDef;
}
interface $ZodISOTime extends $ZodType {
    _zod: $ZodISOTimeInternals;
}
declare const $ZodISOTime: $constructor<$ZodISOTime>;
interface $ZodISODurationInternals extends $ZodStringFormatInternals<"duration"> {
}
interface $ZodISODuration extends $ZodType {
    _zod: $ZodISODurationInternals;
}
declare const $ZodISODuration: $constructor<$ZodISODuration>;
interface $ZodIPv4Def extends $ZodStringFormatDef<"ipv4"> {
    version?: "v4";
}
interface $ZodIPv4Internals extends $ZodStringFormatInternals<"ipv4"> {
    def: $ZodIPv4Def;
}
interface $ZodIPv4 extends $ZodType {
    _zod: $ZodIPv4Internals;
}
declare const $ZodIPv4: $constructor<$ZodIPv4>;
interface $ZodIPv6Def extends $ZodStringFormatDef<"ipv6"> {
    version?: "v6";
}
interface $ZodIPv6Internals extends $ZodStringFormatInternals<"ipv6"> {
    def: $ZodIPv6Def;
}
interface $ZodIPv6 extends $ZodType {
    _zod: $ZodIPv6Internals;
}
declare const $ZodIPv6: $constructor<$ZodIPv6>;
interface $ZodCIDRv4Def extends $ZodStringFormatDef<"cidrv4"> {
    version?: "v4";
}
interface $ZodCIDRv4Internals extends $ZodStringFormatInternals<"cidrv4"> {
    def: $ZodCIDRv4Def;
}
interface $ZodCIDRv4 extends $ZodType {
    _zod: $ZodCIDRv4Internals;
}
declare const $ZodCIDRv4: $constructor<$ZodCIDRv4>;
interface $ZodCIDRv6Def extends $ZodStringFormatDef<"cidrv6"> {
    version?: "v6";
}
interface $ZodCIDRv6Internals extends $ZodStringFormatInternals<"cidrv6"> {
    def: $ZodCIDRv6Def;
}
interface $ZodCIDRv6 extends $ZodType {
    _zod: $ZodCIDRv6Internals;
}
declare const $ZodCIDRv6: $constructor<$ZodCIDRv6>;
interface $ZodBase64Internals extends $ZodStringFormatInternals<"base64"> {
}
interface $ZodBase64 extends $ZodType {
    _zod: $ZodBase64Internals;
}
declare const $ZodBase64: $constructor<$ZodBase64>;
interface $ZodBase64URLInternals extends $ZodStringFormatInternals<"base64url"> {
}
interface $ZodBase64URL extends $ZodType {
    _zod: $ZodBase64URLInternals;
}
declare const $ZodBase64URL: $constructor<$ZodBase64URL>;
interface $ZodE164Internals extends $ZodStringFormatInternals<"e164"> {
}
interface $ZodE164 extends $ZodType {
    _zod: $ZodE164Internals;
}
declare const $ZodE164: $constructor<$ZodE164>;
interface $ZodJWTDef extends $ZodStringFormatDef<"jwt"> {
    alg?: JWTAlgorithm | undefined;
}
interface $ZodJWTInternals extends $ZodStringFormatInternals<"jwt"> {
    def: $ZodJWTDef;
}
interface $ZodJWT extends $ZodType {
    _zod: $ZodJWTInternals;
}
declare const $ZodJWT: $constructor<$ZodJWT>;
interface $ZodNumberDef extends $ZodTypeDef {
    type: "number";
    coerce?: boolean;
}
interface $ZodNumberInternals<Input = unknown> extends $ZodTypeInternals<number, Input> {
    def: $ZodNumberDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        exclusiveMinimum: number;
        exclusiveMaximum: number;
        format: string;
        pattern: RegExp;
    }>;
}
interface $ZodNumber<Input = unknown> extends $ZodType {
    _zod: $ZodNumberInternals<Input>;
}
declare const $ZodNumber: $constructor<$ZodNumber>;
interface $ZodBooleanDef extends $ZodTypeDef {
    type: "boolean";
    coerce?: boolean;
    checks?: $ZodCheck<boolean>[];
}
interface $ZodBooleanInternals<T = unknown> extends $ZodTypeInternals<boolean, T> {
    pattern: RegExp;
    def: $ZodBooleanDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodBoolean<T = unknown> extends $ZodType {
    _zod: $ZodBooleanInternals<T>;
}
declare const $ZodBoolean: $constructor<$ZodBoolean>;
interface $ZodBigIntDef extends $ZodTypeDef {
    type: "bigint";
    coerce?: boolean;
}
interface $ZodBigIntInternals<T = unknown> extends $ZodTypeInternals<bigint, T> {
    pattern: RegExp;
    /** @internal Internal API, use with caution */
    def: $ZodBigIntDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: bigint;
        maximum: bigint;
        format: string;
    }>;
}
interface $ZodBigInt<T = unknown> extends $ZodType {
    _zod: $ZodBigIntInternals<T>;
}
declare const $ZodBigInt: $constructor<$ZodBigInt>;
interface $ZodSymbolDef extends $ZodTypeDef {
    type: "symbol";
}
interface $ZodSymbolInternals extends $ZodTypeInternals<symbol, symbol> {
    def: $ZodSymbolDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodSymbol extends $ZodType {
    _zod: $ZodSymbolInternals;
}
declare const $ZodSymbol: $constructor<$ZodSymbol>;
interface $ZodUndefinedDef extends $ZodTypeDef {
    type: "undefined";
}
interface $ZodUndefinedInternals extends $ZodTypeInternals<undefined, undefined> {
    pattern: RegExp;
    def: $ZodUndefinedDef;
    values: PrimitiveSet;
    isst: $ZodIssueInvalidType;
}
interface $ZodUndefined extends $ZodType {
    _zod: $ZodUndefinedInternals;
}
declare const $ZodUndefined: $constructor<$ZodUndefined>;
interface $ZodNullDef extends $ZodTypeDef {
    type: "null";
}
interface $ZodNullInternals extends $ZodTypeInternals<null, null> {
    pattern: RegExp;
    def: $ZodNullDef;
    values: PrimitiveSet;
    isst: $ZodIssueInvalidType;
}
interface $ZodNull extends $ZodType {
    _zod: $ZodNullInternals;
}
declare const $ZodNull: $constructor<$ZodNull>;
interface $ZodAnyDef extends $ZodTypeDef {
    type: "any";
}
interface $ZodAnyInternals extends $ZodTypeInternals<any, any> {
    def: $ZodAnyDef;
    isst: never;
}
interface $ZodAny extends $ZodType {
    _zod: $ZodAnyInternals;
}
declare const $ZodAny: $constructor<$ZodAny>;
interface $ZodUnknownDef extends $ZodTypeDef {
    type: "unknown";
}
interface $ZodUnknownInternals extends $ZodTypeInternals<unknown, unknown> {
    def: $ZodUnknownDef;
    isst: never;
}
interface $ZodUnknown extends $ZodType {
    _zod: $ZodUnknownInternals;
}
declare const $ZodUnknown: $constructor<$ZodUnknown>;
interface $ZodNeverDef extends $ZodTypeDef {
    type: "never";
}
interface $ZodNeverInternals extends $ZodTypeInternals<never, never> {
    def: $ZodNeverDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodNever extends $ZodType {
    _zod: $ZodNeverInternals;
}
declare const $ZodNever: $constructor<$ZodNever>;
interface $ZodVoidDef extends $ZodTypeDef {
    type: "void";
}
interface $ZodVoidInternals extends $ZodTypeInternals<void, void> {
    def: $ZodVoidDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodVoid extends $ZodType {
    _zod: $ZodVoidInternals;
}
declare const $ZodVoid: $constructor<$ZodVoid>;
interface $ZodDateDef extends $ZodTypeDef {
    type: "date";
    coerce?: boolean;
}
interface $ZodDateInternals<T = unknown> extends $ZodTypeInternals<Date, T> {
    def: $ZodDateDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: Date;
        maximum: Date;
        format: string;
    }>;
}
interface $ZodDate<T = unknown> extends $ZodType {
    _zod: $ZodDateInternals<T>;
}
declare const $ZodDate: $constructor<$ZodDate>;
interface $ZodArrayDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "array";
    element: T;
}
interface $ZodArrayInternals<T extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodArrayDef<T>;
    isst: $ZodIssueInvalidType;
    output: output<T>[];
    input: input<T>[];
}
interface $ZodArray<T extends SomeType = $ZodType> extends $ZodType<any, any, $ZodArrayInternals<T>> {
}
declare const $ZodArray: $constructor<$ZodArray>;
type OptionalOutSchema = {
    _zod: {
        optout: "optional";
    };
};
type OptionalInSchema = {
    _zod: {
        optin: "optional";
    };
};
type $InferObjectOutput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? IsAny<T[keyof T]> extends true ? Record<string, unknown> : Record<string, output<T[keyof T]>> : keyof (T & Extra) extends never ? Record<string, never> : Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: T[k]["_zod"]["output"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: T[k]["_zod"]["output"];
} & Extra>;
type $InferObjectInput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? IsAny<T[keyof T]> extends true ? Record<string, unknown> : Record<string, input<T[keyof T]>> : keyof (T & Extra) extends never ? Record<string, never> : Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? never : k]: T[k]["_zod"]["input"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? k : never]?: T[k]["_zod"]["input"];
} & Extra>;
type $ZodObjectConfig = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
type $loose = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
type $strict = {
    out: {};
    in: {};
};
type $strip = {
    out: {};
    in: {};
};
type $catchall<T extends SomeType> = {
    out: {
        [k: string]: output<T>;
    };
    in: {
        [k: string]: input<T>;
    };
};
type $ZodShape = Readonly<{
    [k: string]: $ZodType;
}>;
interface $ZodObjectDef<Shape extends $ZodShape = $ZodShape> extends $ZodTypeDef {
    type: "object";
    shape: Shape;
    catchall?: $ZodType | undefined;
}
interface $ZodObjectInternals<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodShape, out Config extends $ZodObjectConfig = $ZodObjectConfig> extends _$ZodTypeInternals {
    def: $ZodObjectDef<Shape>;
    config: Config;
    isst: $ZodIssueInvalidType | $ZodIssueUnrecognizedKeys;
    propValues: PropValues;
    output: $InferObjectOutput<Shape, Config["out"]>;
    input: $InferObjectInput<Shape, Config["in"]>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
type $ZodLooseShape = Record<string, any>;
interface $ZodObject<
/** @ts-ignore Cast variance */
out Shape extends Readonly<$ZodShape> = Readonly<$ZodShape>, out Params extends $ZodObjectConfig = $ZodObjectConfig> extends $ZodType<any, any, $ZodObjectInternals<Shape, Params>> {
}
declare const $ZodObject: $constructor<$ZodObject>;
type $InferUnionOutput<T extends SomeType> = T extends any ? output<T> : never;
type $InferUnionInput<T extends SomeType> = T extends any ? input<T> : never;
interface $ZodUnionDef<Options extends readonly SomeType[] = readonly $ZodType[]> extends $ZodTypeDef {
    type: "union";
    options: Options;
    inclusive?: boolean;
}
type IsOptionalIn<T extends SomeType> = T extends OptionalInSchema ? true : false;
type IsOptionalOut<T extends SomeType> = T extends OptionalOutSchema ? true : false;
interface $ZodUnionInternals<T extends readonly SomeType[] = readonly $ZodType[]> extends _$ZodTypeInternals {
    def: $ZodUnionDef<T>;
    isst: $ZodIssueInvalidUnion;
    pattern: T[number]["_zod"]["pattern"];
    values: T[number]["_zod"]["values"];
    output: $InferUnionOutput<T[number]>;
    input: $InferUnionInput<T[number]>;
    optin: IsOptionalIn<T[number]> extends false ? "optional" | undefined : "optional";
    optout: IsOptionalOut<T[number]> extends false ? "optional" | undefined : "optional";
}
interface $ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends $ZodType<any, any, $ZodUnionInternals<T>> {
    _zod: $ZodUnionInternals<T>;
}
declare const $ZodUnion: $constructor<$ZodUnion>;
interface $ZodDiscriminatedUnionDef<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodUnionDef<Options> {
    discriminator: Disc;
    unionFallback?: boolean;
}
interface $ZodDiscriminatedUnionInternals<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodUnionInternals<Options> {
    def: $ZodDiscriminatedUnionDef<Options, Disc>;
    propValues: PropValues;
}
interface $ZodDiscriminatedUnion<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends $ZodType {
    _zod: $ZodDiscriminatedUnionInternals<Options, Disc>;
}
declare const $ZodDiscriminatedUnion: $constructor<$ZodDiscriminatedUnion>;
interface $ZodIntersectionDef<Left extends SomeType = $ZodType, Right extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "intersection";
    left: Left;
    right: Right;
}
interface $ZodIntersectionInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodIntersectionDef<A, B>;
    isst: never;
    optin: A["_zod"]["optin"] | B["_zod"]["optin"];
    optout: A["_zod"]["optout"] | B["_zod"]["optout"];
    output: output<A> & output<B>;
    input: input<A> & input<B>;
}
interface $ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodIntersectionInternals<A, B>;
}
declare const $ZodIntersection: $constructor<$ZodIntersection>;
interface $ZodTupleDef<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodTypeDef {
    type: "tuple";
    items: T;
    rest: Rest;
}
type $InferTupleInputType<T extends TupleItems, Rest extends SomeType | null> = [
    ...TupleInputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? input<Rest>[] : [])
];
type TupleInputTypeNoOptionals<T extends TupleItems> = {
    [k in keyof T]: input<T[k]>;
};
type TupleInputTypeWithOptionals<T extends TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optin"] extends "optional" ? [...TupleInputTypeWithOptionals<Prefix>, input<Tail>?] : TupleInputTypeNoOptionals<T> : [];
type $InferTupleOutputType<T extends TupleItems, Rest extends SomeType | null> = [
    ...TupleOutputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? output<Rest>[] : [])
];
type TupleOutputTypeNoOptionals<T extends TupleItems> = {
    [k in keyof T]: output<T[k]>;
};
type TupleOutputTypeWithOptionals<T extends TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optout"] extends "optional" ? [...TupleOutputTypeWithOptionals<Prefix>, output<Tail>?] : TupleOutputTypeNoOptionals<T> : [];
interface $ZodTupleInternals<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends _$ZodTypeInternals {
    def: $ZodTupleDef<T, Rest>;
    isst: $ZodIssueInvalidType | $ZodIssueTooBig<unknown[]> | $ZodIssueTooSmall<unknown[]>;
    output: $InferTupleOutputType<T, Rest>;
    input: $InferTupleInputType<T, Rest>;
}
interface $ZodTuple<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodType {
    _zod: $ZodTupleInternals<T, Rest>;
}
declare const $ZodTuple: $constructor<$ZodTuple>;
type $ZodRecordKey = $ZodType<string | number | symbol, unknown>;
interface $ZodRecordDef<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "record";
    keyType: Key;
    valueType: Value;
    /** @default "strict" - errors on keys not matching keyType. "loose" passes through non-matching keys unchanged. */
    mode?: "strict" | "loose";
}
type $InferZodRecordOutput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<output<Key>, output<Value>>> : Record<output<Key>, output<Value>>;
type $InferZodRecordInput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<input<Key> & PropertyKey, input<Value>>> : Record<input<Key> & PropertyKey, input<Value>>;
interface $ZodRecordInternals<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeInternals<$InferZodRecordOutput<Key, Value>, $InferZodRecordInput<Key, Value>> {
    def: $ZodRecordDef<Key, Value>;
    isst: $ZodIssueInvalidType | $ZodIssueInvalidKey<Record<PropertyKey, unknown>>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
type $partial = {
    "~~partial": true;
};
interface $ZodRecord<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodRecordInternals<Key, Value>;
}
declare const $ZodRecord: $constructor<$ZodRecord>;
interface $ZodMapDef<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "map";
    keyType: Key;
    valueType: Value;
}
interface $ZodMapInternals<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeInternals<Map<output<Key>, output<Value>>, Map<input<Key>, input<Value>>> {
    def: $ZodMapDef<Key, Value>;
    isst: $ZodIssueInvalidType | $ZodIssueInvalidKey | $ZodIssueInvalidElement<unknown>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
interface $ZodMap<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodMapInternals<Key, Value>;
}
declare const $ZodMap: $constructor<$ZodMap>;
interface $ZodSetDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "set";
    valueType: T;
}
interface $ZodSetInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Set<output<T>>, Set<input<T>>> {
    def: $ZodSetDef<T>;
    isst: $ZodIssueInvalidType;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
interface $ZodSet<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSetInternals<T>;
}
declare const $ZodSet: $constructor<$ZodSet>;
type $InferEnumOutput<T extends EnumLike> = T[keyof T] & {};
type $InferEnumInput<T extends EnumLike> = T[keyof T] & {};
interface $ZodEnumDef<T extends EnumLike = EnumLike> extends $ZodTypeDef {
    type: "enum";
    entries: T;
}
interface $ZodEnumInternals<
/** @ts-ignore Cast variance */
out T extends EnumLike = EnumLike> extends $ZodTypeInternals<$InferEnumOutput<T>, $InferEnumInput<T>> {
    def: $ZodEnumDef<T>;
    /** @deprecated Internal API, use with caution (not deprecated) */
    values: PrimitiveSet;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    isst: $ZodIssueInvalidValue;
}
interface $ZodEnum<T extends EnumLike = EnumLike> extends $ZodType {
    _zod: $ZodEnumInternals<T>;
}
declare const $ZodEnum: $constructor<$ZodEnum>;
interface $ZodLiteralDef<T extends Literal> extends $ZodTypeDef {
    type: "literal";
    values: T[];
}
interface $ZodLiteralInternals<T extends Literal = Literal> extends $ZodTypeInternals<T, T> {
    def: $ZodLiteralDef<T>;
    values: Set<T>;
    pattern: RegExp;
    isst: $ZodIssueInvalidValue;
}
interface $ZodLiteral<T extends Literal = Literal> extends $ZodType {
    _zod: $ZodLiteralInternals<T>;
}
declare const $ZodLiteral: $constructor<$ZodLiteral>;
type _File = typeof globalThis extends {
    File: infer F extends new (...args: any[]) => any;
} ? InstanceType<F> : {};
/** Do not reference this directly. */
interface File extends _File {
    readonly type: string;
    readonly size: number;
}
interface $ZodFileDef extends $ZodTypeDef {
    type: "file";
}
interface $ZodFileInternals extends $ZodTypeInternals<File, File> {
    def: $ZodFileDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        mime: MimeTypes[];
    }>;
}
interface $ZodFile extends $ZodType {
    _zod: $ZodFileInternals;
}
declare const $ZodFile: $constructor<$ZodFile>;
interface $ZodTransformDef extends $ZodTypeDef {
    type: "transform";
    transform: (input: unknown, payload: ParsePayload<unknown>) => MaybeAsync<unknown>;
}
interface $ZodTransformInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I> {
    def: $ZodTransformDef;
    isst: never;
}
interface $ZodTransform<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodTransformInternals<O, I>;
}
declare const $ZodTransform: $constructor<$ZodTransform>;
interface $ZodOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "optional";
    innerType: T;
}
interface $ZodOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T> | undefined, input<T> | undefined> {
    def: $ZodOptionalDef<T>;
    optin: "optional";
    optout: "optional";
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
interface $ZodOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodOptionalInternals<T>;
}
declare const $ZodOptional: $constructor<$ZodOptional>;
interface $ZodExactOptionalDef<T extends SomeType = $ZodType> extends $ZodOptionalDef<T> {
}
interface $ZodExactOptionalInternals<T extends SomeType = $ZodType> extends $ZodOptionalInternals<T> {
    def: $ZodExactOptionalDef<T>;
    output: output<T>;
    input: input<T>;
}
interface $ZodExactOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodExactOptionalInternals<T>;
}
declare const $ZodExactOptional: $constructor<$ZodExactOptional>;
interface $ZodNullableDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nullable";
    innerType: T;
}
interface $ZodNullableInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T> | null, input<T> | null> {
    def: $ZodNullableDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
interface $ZodNullable<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNullableInternals<T>;
}
declare const $ZodNullable: $constructor<$ZodNullable>;
interface $ZodDefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "default";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: NoUndefined<output<T>>;
}
interface $ZodDefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, input<T> | undefined> {
    def: $ZodDefaultDef<T>;
    optin: "optional";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodDefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodDefaultInternals<T>;
}
declare const $ZodDefault: $constructor<$ZodDefault>;
interface $ZodPrefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "prefault";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: input<T>;
}
interface $ZodPrefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, input<T> | undefined> {
    def: $ZodPrefaultDef<T>;
    optin: "optional";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodPrefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPrefaultInternals<T>;
}
declare const $ZodPrefault: $constructor<$ZodPrefault>;
interface $ZodNonOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nonoptional";
    innerType: T;
}
interface $ZodNonOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, NoUndefined<input<T>>> {
    def: $ZodNonOptionalDef<T>;
    isst: $ZodIssueInvalidType;
    values: T["_zod"]["values"];
    optin: "optional" | undefined;
    optout: "optional" | undefined;
}
interface $ZodNonOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNonOptionalInternals<T>;
}
declare const $ZodNonOptional: $constructor<$ZodNonOptional>;
interface $ZodSuccessDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "success";
    innerType: T;
}
interface $ZodSuccessInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<boolean, input<T>> {
    def: $ZodSuccessDef<T>;
    isst: never;
    optin: T["_zod"]["optin"];
    optout: "optional" | undefined;
}
interface $ZodSuccess<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSuccessInternals<T>;
}
declare const $ZodSuccess: $constructor<$ZodSuccess>;
interface $ZodCatchCtx extends ParsePayload {
    /** @deprecated Use `ctx.issues` */
    error: {
        issues: $ZodIssue[];
    };
    /** @deprecated Use `ctx.value` */
    input: unknown;
}
interface $ZodCatchDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "catch";
    innerType: T;
    catchValue: (ctx: $ZodCatchCtx) => unknown;
}
interface $ZodCatchInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>, input<T>> {
    def: $ZodCatchDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodCatch<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodCatchInternals<T>;
}
declare const $ZodCatch: $constructor<$ZodCatch>;
interface $ZodNaNDef extends $ZodTypeDef {
    type: "nan";
}
interface $ZodNaNInternals extends $ZodTypeInternals<number, number> {
    def: $ZodNaNDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodNaN extends $ZodType {
    _zod: $ZodNaNInternals;
}
declare const $ZodNaN: $constructor<$ZodNaN>;
interface $ZodPipeDef<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "pipe";
    in: A;
    out: B;
    /** Only defined inside $ZodCodec instances. */
    transform?: (value: output<A>, payload: ParsePayload<output<A>>) => MaybeAsync<input<B>>;
    /** Only defined inside $ZodCodec instances. */
    reverseTransform?: (value: input<B>, payload: ParsePayload<input<B>>) => MaybeAsync<output<A>>;
}
interface $ZodPipeInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeInternals<output<B>, input<A>> {
    def: $ZodPipeDef<A, B>;
    isst: never;
    values: A["_zod"]["values"];
    optin: A["_zod"]["optin"];
    optout: B["_zod"]["optout"];
    propValues: A["_zod"]["propValues"];
}
interface $ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPipeInternals<A, B>;
}
declare const $ZodPipe: $constructor<$ZodPipe>;
interface $ZodReadonlyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "readonly";
    innerType: T;
}
interface $ZodReadonlyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<MakeReadonly<output<T>>, MakeReadonly<input<T>>> {
    def: $ZodReadonlyDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    propValues: T["_zod"]["propValues"];
    values: T["_zod"]["values"];
}
interface $ZodReadonly<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodReadonlyInternals<T>;
}
declare const $ZodReadonly: $constructor<$ZodReadonly>;
interface $ZodTemplateLiteralDef extends $ZodTypeDef {
    type: "template_literal";
    parts: $ZodTemplateLiteralPart[];
    format?: string | undefined;
}
interface $ZodTemplateLiteralInternals<Template extends string = string> extends $ZodTypeInternals<Template, Template> {
    pattern: RegExp;
    def: $ZodTemplateLiteralDef;
    isst: $ZodIssueInvalidType;
}
type LiteralPart = Exclude<Literal, symbol>;
interface SchemaPartInternals extends $ZodTypeInternals<LiteralPart, LiteralPart> {
    pattern: RegExp;
}
interface SchemaPart extends $ZodType {
    _zod: SchemaPartInternals;
}
type $ZodTemplateLiteralPart = LiteralPart | SchemaPart;
interface $ZodTemplateLiteral<Template extends string = string> extends $ZodType {
    _zod: $ZodTemplateLiteralInternals<Template>;
}
declare const $ZodTemplateLiteral: $constructor<$ZodTemplateLiteral>;
type $ZodFunctionArgs = $ZodType<unknown[], unknown[]>;
type $ZodFunctionIn = $ZodFunctionArgs;
type $ZodFunctionOut = $ZodType;
type $InferInnerFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : output<Args>) => input<Returns>;
type $InferInnerFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : output<Args>) => MaybeAsync<input<Returns>>;
type $InferOuterFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : input<Args>) => output<Returns>;
type $InferOuterFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : input<Args>) => Promise<output<Returns>>;
interface $ZodFunctionDef<In extends $ZodFunctionIn = $ZodFunctionIn, Out extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodTypeDef {
    type: "function";
    input: In;
    output: Out;
}
interface $ZodFunctionInternals<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> extends $ZodTypeInternals<$InferOuterFunctionType<Args, Returns>, $InferInnerFunctionType<Args, Returns>> {
    def: $ZodFunctionDef<Args, Returns>;
    isst: $ZodIssueInvalidType;
}
interface $ZodFunction<Args extends $ZodFunctionIn = $ZodFunctionIn, Returns extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodType<any, any, $ZodFunctionInternals<Args, Returns>> {
    /** @deprecated */
    _def: $ZodFunctionDef<Args, Returns>;
    _input: $InferInnerFunctionType<Args, Returns>;
    _output: $InferOuterFunctionType<Args, Returns>;
    implement<F extends $InferInnerFunctionType<Args, Returns>>(func: F): (...args: Parameters<this["_output"]>) => ReturnType<F> extends ReturnType<this["_output"]> ? ReturnType<F> : ReturnType<this["_output"]>;
    implementAsync<F extends $InferInnerFunctionTypeAsync<Args, Returns>>(func: F): F extends $InferOuterFunctionTypeAsync<Args, Returns> ? F : $InferOuterFunctionTypeAsync<Args, Returns>;
    input<const Items extends TupleItems, const Rest extends $ZodFunctionOut = $ZodFunctionOut>(args: Items, rest?: Rest): $ZodFunction<$ZodTuple<Items, Rest>, Returns>;
    input<NewArgs extends $ZodFunctionIn>(args: NewArgs): $ZodFunction<NewArgs, Returns>;
    input(...args: any[]): $ZodFunction<any, Returns>;
    output<NewReturns extends $ZodType>(output: NewReturns): $ZodFunction<Args, NewReturns>;
}
declare const $ZodFunction: $constructor<$ZodFunction>;
interface $ZodPromiseDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "promise";
    innerType: T;
}
interface $ZodPromiseInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Promise<output<T>>, MaybeAsync<input<T>>> {
    def: $ZodPromiseDef<T>;
    isst: never;
}
interface $ZodPromise<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPromiseInternals<T>;
}
declare const $ZodPromise: $constructor<$ZodPromise>;
interface $ZodLazyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "lazy";
    getter: () => T;
}
interface $ZodLazyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>, input<T>> {
    def: $ZodLazyDef<T>;
    isst: never;
    /** Auto-cached way to retrieve the inner schema */
    innerType: T;
    pattern: T["_zod"]["pattern"];
    propValues: T["_zod"]["propValues"];
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
}
interface $ZodLazy<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodLazyInternals<T>;
}
declare const $ZodLazy: $constructor<$ZodLazy>;
interface $ZodCustomDef<O = unknown> extends $ZodTypeDef, $ZodCheckDef {
    type: "custom";
    check: "custom";
    path?: PropertyKey[] | undefined;
    error?: $ZodErrorMap | undefined;
    params?: Record<string, any> | undefined;
    fn: (arg: O) => unknown;
}
interface $ZodCustomInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I>, $ZodCheckInternals<O> {
    def: $ZodCustomDef;
    issc: $ZodIssue;
    isst: never;
    bag: LoosePartial<{
        Class: typeof Class;
    }>;
}
interface $ZodCustom<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodCustomInternals<O, I>;
}
declare const $ZodCustom: $constructor<$ZodCustom>;
type $ZodTypes = $ZodString | $ZodNumber | $ZodBigInt | $ZodBoolean | $ZodDate | $ZodSymbol | $ZodUndefined | $ZodNullable | $ZodNull | $ZodAny | $ZodUnknown | $ZodNever | $ZodVoid | $ZodArray | $ZodObject | $ZodUnion | $ZodIntersection | $ZodTuple | $ZodRecord | $ZodMap | $ZodSet | $ZodLiteral | $ZodEnum | $ZodFunction | $ZodPromise | $ZodLazy | $ZodOptional | $ZodDefault | $ZodPrefault | $ZodTemplateLiteral | $ZodCustom | $ZodTransform | $ZodNonOptional | $ZodReadonly | $ZodNaN | $ZodPipe | $ZodSuccess | $ZodCatch | $ZodFile;

interface $ZodCheckDef {
    check: string;
    error?: $ZodErrorMap<never> | undefined;
    /** If true, no later checks will be executed if this check fails. Default `false`. */
    abort?: boolean | undefined;
    /** If provided, this check will only be executed if the function returns `true`. Defaults to `payload => z.util.isAborted(payload)`. */
    when?: ((payload: ParsePayload) => boolean) | undefined;
}
interface $ZodCheckInternals<T> {
    def: $ZodCheckDef;
    /** The set of issues this check might throw. */
    issc?: $ZodIssueBase;
    check(payload: ParsePayload<T>): MaybeAsync<void>;
    onattach: ((schema: $ZodType) => void)[];
}
interface $ZodCheck<in T = never> {
    _zod: $ZodCheckInternals<T>;
}
declare const $ZodCheck: $constructor<$ZodCheck<any>>;
interface $ZodCheckLessThanDef extends $ZodCheckDef {
    check: "less_than";
    value: Numeric;
    inclusive: boolean;
}
interface $ZodCheckLessThanInternals<T extends Numeric = Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckLessThanDef;
    issc: $ZodIssueTooBig<T>;
}
interface $ZodCheckLessThan<T extends Numeric = Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckLessThanInternals<T>;
}
declare const $ZodCheckLessThan: $constructor<$ZodCheckLessThan>;
interface $ZodCheckGreaterThanDef extends $ZodCheckDef {
    check: "greater_than";
    value: Numeric;
    inclusive: boolean;
}
interface $ZodCheckGreaterThanInternals<T extends Numeric = Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckGreaterThanDef;
    issc: $ZodIssueTooSmall<T>;
}
interface $ZodCheckGreaterThan<T extends Numeric = Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckGreaterThanInternals<T>;
}
declare const $ZodCheckGreaterThan: $constructor<$ZodCheckGreaterThan>;
interface $ZodCheckMultipleOfDef<T extends number | bigint = number | bigint> extends $ZodCheckDef {
    check: "multiple_of";
    value: T;
}
interface $ZodCheckMultipleOfInternals<T extends number | bigint = number | bigint> extends $ZodCheckInternals<T> {
    def: $ZodCheckMultipleOfDef<T>;
    issc: $ZodIssueNotMultipleOf;
}
interface $ZodCheckMultipleOf<T extends number | bigint = number | bigint> extends $ZodCheck<T> {
    _zod: $ZodCheckMultipleOfInternals<T>;
}
declare const $ZodCheckMultipleOf: $constructor<$ZodCheckMultipleOf<number | bigint>>;
type $ZodNumberFormats = "int32" | "uint32" | "float32" | "float64" | "safeint";
interface $ZodCheckNumberFormatDef extends $ZodCheckDef {
    check: "number_format";
    format: $ZodNumberFormats;
}
interface $ZodCheckNumberFormatInternals extends $ZodCheckInternals<number> {
    def: $ZodCheckNumberFormatDef;
    issc: $ZodIssueInvalidType | $ZodIssueTooBig<"number"> | $ZodIssueTooSmall<"number">;
}
interface $ZodCheckNumberFormat extends $ZodCheck<number> {
    _zod: $ZodCheckNumberFormatInternals;
}
declare const $ZodCheckNumberFormat: $constructor<$ZodCheckNumberFormat>;
interface $ZodCheckMaxLengthDef extends $ZodCheckDef {
    check: "max_length";
    maximum: number;
}
interface $ZodCheckMaxLengthInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMaxLengthDef;
    issc: $ZodIssueTooBig<T>;
}
interface $ZodCheckMaxLength<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMaxLengthInternals<T>;
}
declare const $ZodCheckMaxLength: $constructor<$ZodCheckMaxLength>;
interface $ZodCheckMinLengthDef extends $ZodCheckDef {
    check: "min_length";
    minimum: number;
}
interface $ZodCheckMinLengthInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMinLengthDef;
    issc: $ZodIssueTooSmall<T>;
}
interface $ZodCheckMinLength<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMinLengthInternals<T>;
}
declare const $ZodCheckMinLength: $constructor<$ZodCheckMinLength>;
interface $ZodCheckLengthEqualsDef extends $ZodCheckDef {
    check: "length_equals";
    length: number;
}
interface $ZodCheckLengthEqualsInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckLengthEqualsDef;
    issc: $ZodIssueTooBig<T> | $ZodIssueTooSmall<T>;
}
interface $ZodCheckLengthEquals<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckLengthEqualsInternals<T>;
}
declare const $ZodCheckLengthEquals: $constructor<$ZodCheckLengthEquals>;
type $ZodStringFormats = "email" | "url" | "emoji" | "uuid" | "guid" | "nanoid" | "cuid" | "cuid2" | "ulid" | "xid" | "ksuid" | "datetime" | "date" | "time" | "duration" | "ipv4" | "ipv6" | "cidrv4" | "cidrv6" | "base64" | "base64url" | "json_string" | "e164" | "lowercase" | "uppercase" | "regex" | "jwt" | "starts_with" | "ends_with" | "includes";
interface $ZodCheckStringFormatDef<Format extends string = string> extends $ZodCheckDef {
    check: "string_format";
    format: Format;
    pattern?: RegExp | undefined;
}
interface $ZodCheckStringFormatInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStringFormatDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegexDef extends $ZodCheckStringFormatDef {
    format: "regex";
    pattern: RegExp;
}
interface $ZodCheckRegexInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckRegexDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegex extends $ZodCheck<string> {
    _zod: $ZodCheckRegexInternals;
}
declare const $ZodCheckRegex: $constructor<$ZodCheckRegex>;
interface $ZodCheckLowerCaseDef extends $ZodCheckStringFormatDef<"lowercase"> {
}
interface $ZodCheckLowerCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckLowerCaseDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckLowerCase extends $ZodCheck<string> {
    _zod: $ZodCheckLowerCaseInternals;
}
declare const $ZodCheckLowerCase: $constructor<$ZodCheckLowerCase>;
interface $ZodCheckUpperCaseDef extends $ZodCheckStringFormatDef<"uppercase"> {
}
interface $ZodCheckUpperCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckUpperCaseDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckUpperCase extends $ZodCheck<string> {
    _zod: $ZodCheckUpperCaseInternals;
}
declare const $ZodCheckUpperCase: $constructor<$ZodCheckUpperCase>;
interface $ZodCheckIncludesDef extends $ZodCheckStringFormatDef<"includes"> {
    includes: string;
    position?: number | undefined;
}
interface $ZodCheckIncludesInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckIncludesDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckIncludes extends $ZodCheck<string> {
    _zod: $ZodCheckIncludesInternals;
}
declare const $ZodCheckIncludes: $constructor<$ZodCheckIncludes>;
interface $ZodCheckStartsWithDef extends $ZodCheckStringFormatDef<"starts_with"> {
    prefix: string;
}
interface $ZodCheckStartsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStartsWithDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckStartsWith extends $ZodCheck<string> {
    _zod: $ZodCheckStartsWithInternals;
}
declare const $ZodCheckStartsWith: $constructor<$ZodCheckStartsWith>;
interface $ZodCheckEndsWithDef extends $ZodCheckStringFormatDef<"ends_with"> {
    suffix: string;
}
interface $ZodCheckEndsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckEndsWithDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckEndsWith extends $ZodCheckInternals<string> {
    _zod: $ZodCheckEndsWithInternals;
}
declare const $ZodCheckEndsWith: $constructor<$ZodCheckEndsWith>;

interface $ZodIssueBase {
    readonly code?: string;
    readonly input?: unknown;
    readonly path: PropertyKey[];
    readonly message: string;
}
type $ZodInvalidTypeExpected = "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "undefined" | "null" | "never" | "void" | "date" | "array" | "object" | "tuple" | "record" | "map" | "set" | "file" | "nonoptional" | "nan" | "function" | (string & {});
interface $ZodIssueInvalidType<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_type";
    readonly expected: $ZodInvalidTypeExpected;
    readonly input?: Input;
}
interface $ZodIssueTooBig<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_big";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly maximum: number | bigint;
    readonly inclusive?: boolean;
    readonly exact?: boolean;
    readonly input?: Input;
}
interface $ZodIssueTooSmall<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_small";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly minimum: number | bigint;
    /** True if the allowable range includes the minimum */
    readonly inclusive?: boolean;
    /** True if the allowed value is fixed (e.g.` z.length(5)`), not a range (`z.minLength(5)`) */
    readonly exact?: boolean;
    readonly input?: Input;
}
interface $ZodIssueInvalidStringFormat extends $ZodIssueBase {
    readonly code: "invalid_format";
    readonly format: $ZodStringFormats | (string & {});
    readonly pattern?: string;
    readonly input?: string;
}
interface $ZodIssueNotMultipleOf<Input extends number | bigint = number | bigint> extends $ZodIssueBase {
    readonly code: "not_multiple_of";
    readonly divisor: number;
    readonly input?: Input;
}
interface $ZodIssueUnrecognizedKeys extends $ZodIssueBase {
    readonly code: "unrecognized_keys";
    readonly keys: string[];
    readonly input?: Record<string, unknown>;
}
interface $ZodIssueInvalidUnionNoMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: $ZodIssue[][];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive?: true;
}
interface $ZodIssueInvalidUnionMultipleMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: [];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive: false;
}
type $ZodIssueInvalidUnion = $ZodIssueInvalidUnionNoMatch | $ZodIssueInvalidUnionMultipleMatch;
interface $ZodIssueInvalidKey<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_key";
    readonly origin: "map" | "record";
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
interface $ZodIssueInvalidElement<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_element";
    readonly origin: "map" | "set";
    readonly key: unknown;
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
interface $ZodIssueInvalidValue<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_value";
    readonly values: Primitive[];
    readonly input?: Input;
}
interface $ZodIssueCustom extends $ZodIssueBase {
    readonly code: "custom";
    readonly params?: Record<string, any> | undefined;
    readonly input?: unknown;
}
type $ZodIssue = $ZodIssueInvalidType | $ZodIssueTooBig | $ZodIssueTooSmall | $ZodIssueInvalidStringFormat | $ZodIssueNotMultipleOf | $ZodIssueUnrecognizedKeys | $ZodIssueInvalidUnion | $ZodIssueInvalidKey | $ZodIssueInvalidElement | $ZodIssueInvalidValue | $ZodIssueCustom;
type $ZodInternalIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue$1<T> : never;
type RawIssue$1<T extends $ZodIssueBase> = T extends any ? Flatten<MakePartial<T, "message" | "path"> & {
    /** The input data */
    readonly input: unknown;
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** If `true`, Zod will continue executing checks/refinements after this issue. */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
type $ZodRawIssue<T extends $ZodIssueBase = $ZodIssue> = $ZodInternalIssue<T>;
interface $ZodErrorMap<T extends $ZodIssueBase = $ZodIssue> {
    (issue: $ZodRawIssue<T>): {
        message: string;
    } | string | undefined | null;
}
interface $ZodError<T = unknown> extends Error {
    type: T;
    issues: $ZodIssue[];
    _zod: {
        output: T;
        def: $ZodIssue[];
    };
    stack?: string;
    name: string;
}
declare const $ZodError: $constructor<$ZodError>;
type $ZodFlattenedError<T, U = string> = _FlattenedError<T, U>;
type _FlattenedError<T, U = string> = {
    formErrors: U[];
    fieldErrors: {
        [P in keyof T]?: U[];
    };
};
type _ZodFormattedError<T, U = string> = T extends [any, ...any[]] ? {
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
} : T extends any[] ? {
    [k: number]: $ZodFormattedError<T[number], U>;
} : T extends object ? Flatten<{
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
}> : any;
type $ZodFormattedError<T, U = string> = {
    _errors: U[];
} & Flatten<_ZodFormattedError<T, U>>;

type ZodTrait = {
    _zod: {
        def: any;
        [k: string]: any;
    };
};
interface $constructor<T extends ZodTrait, D = T["_zod"]["def"]> {
    new (def: D): T;
    init(inst: T, def: D): asserts inst is T;
}
declare function $constructor<T extends ZodTrait, D = T["_zod"]["def"]>(name: string, initializer: (inst: T, def: D) => void, params?: {
    Parent?: typeof Class;
}): $constructor<T, D>;
declare const $brand: unique symbol;
type $brand<T extends string | number | symbol = string | number | symbol> = {
    [$brand]: {
        [k in T]: true;
    };
};
type $ZodBranded<T extends SomeType, Brand extends string | number | symbol, Dir extends "in" | "out" | "inout" = "out"> = T & (Dir extends "inout" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
        output: output<T> & $brand<Brand>;
    };
} : Dir extends "in" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
    };
} : {
    _zod: {
        output: output<T> & $brand<Brand>;
    };
});
type input<T> = T extends {
    _zod: {
        input: any;
    };
} ? T["_zod"]["input"] : unknown;
type output<T> = T extends {
    _zod: {
        output: any;
    };
} ? T["_zod"]["output"] : unknown;

type Params<T extends $ZodType | $ZodCheck, IssueTypes extends $ZodIssueBase, OmitKeys extends keyof T["_zod"]["def"] = never> = Flatten<Partial<EmptyToNever<Omit<T["_zod"]["def"], OmitKeys> & ([IssueTypes] extends [never] ? {} : {
    error?: string | $ZodErrorMap<IssueTypes> | undefined;
    /** @deprecated This parameter is deprecated. Use `error` instead. */
    message?: string | undefined;
})>>>;
type TypeParams<T extends $ZodType = $ZodType & {
    _isst: never;
}, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error"> = never> = Params<T, NonNullable<T["_zod"]["isst"]>, "type" | "checks" | "error" | AlsoOmit>;
type CheckParams<T extends $ZodCheck = $ZodCheck, // & { _issc: never },
AlsoOmit extends Exclude<keyof T["_zod"]["def"], "check" | "error"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "check" | "error" | AlsoOmit>;
type CheckStringFormatParams<T extends $ZodStringFormat = $ZodStringFormat, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "coerce" | "checks" | "error" | "check" | "format"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "type" | "coerce" | "checks" | "error" | "check" | "format" | AlsoOmit>;
type CheckTypeParams<T extends $ZodType & $ZodCheck = $ZodType & $ZodCheck, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error" | "check"> = never> = Params<T, NonNullable<T["_zod"]["isst"] | T["_zod"]["issc"]>, "type" | "checks" | "error" | "check" | AlsoOmit>;
type $ZodCheckEmailParams = CheckStringFormatParams<$ZodEmail, "when">;
type $ZodCheckGUIDParams = CheckStringFormatParams<$ZodGUID, "pattern" | "when">;
type $ZodCheckUUIDParams = CheckStringFormatParams<$ZodUUID, "pattern" | "when">;
type $ZodCheckURLParams = CheckStringFormatParams<$ZodURL, "when">;
type $ZodCheckEmojiParams = CheckStringFormatParams<$ZodEmoji, "when">;
type $ZodCheckNanoIDParams = CheckStringFormatParams<$ZodNanoID, "when">;
type $ZodCheckCUIDParams = CheckStringFormatParams<$ZodCUID, "when">;
type $ZodCheckCUID2Params = CheckStringFormatParams<$ZodCUID2, "when">;
type $ZodCheckULIDParams = CheckStringFormatParams<$ZodULID, "when">;
type $ZodCheckXIDParams = CheckStringFormatParams<$ZodXID, "when">;
type $ZodCheckKSUIDParams = CheckStringFormatParams<$ZodKSUID, "when">;
type $ZodCheckIPv4Params = CheckStringFormatParams<$ZodIPv4, "pattern" | "when" | "version">;
type $ZodCheckIPv6Params = CheckStringFormatParams<$ZodIPv6, "pattern" | "when" | "version">;
type $ZodCheckCIDRv4Params = CheckStringFormatParams<$ZodCIDRv4, "pattern" | "when">;
type $ZodCheckCIDRv6Params = CheckStringFormatParams<$ZodCIDRv6, "pattern" | "when">;
type $ZodCheckBase64Params = CheckStringFormatParams<$ZodBase64, "pattern" | "when">;
type $ZodCheckBase64URLParams = CheckStringFormatParams<$ZodBase64URL, "pattern" | "when">;
type $ZodCheckE164Params = CheckStringFormatParams<$ZodE164, "when">;
type $ZodCheckJWTParams = CheckStringFormatParams<$ZodJWT, "pattern" | "when">;
type $ZodCheckISODateTimeParams = CheckStringFormatParams<$ZodISODateTime, "pattern" | "when">;
type $ZodCheckISODateParams = CheckStringFormatParams<$ZodISODate, "pattern" | "when">;
type $ZodCheckISOTimeParams = CheckStringFormatParams<$ZodISOTime, "pattern" | "when">;
type $ZodCheckISODurationParams = CheckStringFormatParams<$ZodISODuration, "when">;
type $ZodCheckNumberFormatParams = CheckParams<$ZodCheckNumberFormat, "format" | "when">;
type $ZodCheckLessThanParams = CheckParams<$ZodCheckLessThan, "inclusive" | "value" | "when">;
type $ZodCheckGreaterThanParams = CheckParams<$ZodCheckGreaterThan, "inclusive" | "value" | "when">;
type $ZodCheckMultipleOfParams = CheckParams<$ZodCheckMultipleOf, "value" | "when">;
type $ZodCheckMaxLengthParams = CheckParams<$ZodCheckMaxLength, "maximum" | "when">;
type $ZodCheckMinLengthParams = CheckParams<$ZodCheckMinLength, "minimum" | "when">;
type $ZodCheckLengthEqualsParams = CheckParams<$ZodCheckLengthEquals, "length" | "when">;
type $ZodCheckRegexParams = CheckParams<$ZodCheckRegex, "format" | "pattern" | "when">;
type $ZodCheckLowerCaseParams = CheckParams<$ZodCheckLowerCase, "format" | "when">;
type $ZodCheckUpperCaseParams = CheckParams<$ZodCheckUpperCase, "format" | "when">;
type $ZodCheckIncludesParams = CheckParams<$ZodCheckIncludes, "includes" | "format" | "when" | "pattern">;
type $ZodCheckStartsWithParams = CheckParams<$ZodCheckStartsWith, "prefix" | "format" | "when" | "pattern">;
type $ZodCheckEndsWithParams = CheckParams<$ZodCheckEndsWith, "suffix" | "format" | "pattern" | "when">;
type $ZodEnumParams = TypeParams<$ZodEnum, "entries">;
type $ZodNonOptionalParams = TypeParams<$ZodNonOptional, "innerType">;
type $ZodCustomParams = CheckTypeParams<$ZodCustom, "fn">;
type $ZodSuperRefineIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue<T> : never;
type RawIssue<T extends $ZodIssueBase> = T extends any ? Flatten<MakePartial<T, "message" | "path"> & {
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** If `true`, Zod will execute subsequent checks/refinements instead of immediately aborting */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
interface $RefinementCtx<T = unknown> extends ParsePayload<T> {
    addIssue(arg: string | $ZodSuperRefineIssue): void;
}

/** An Error-like class used to store Zod validation issues.  */
interface ZodError<T = unknown> extends $ZodError<T> {
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    format(): $ZodFormattedError<T>;
    format<U>(mapper: (issue: $ZodIssue) => U): $ZodFormattedError<T, U>;
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    flatten(): $ZodFlattenedError<T>;
    flatten<U>(mapper: (issue: $ZodIssue) => U): $ZodFlattenedError<T, U>;
    /** @deprecated Push directly to `.issues` instead. */
    addIssue(issue: $ZodIssue): void;
    /** @deprecated Push directly to `.issues` instead. */
    addIssues(issues: $ZodIssue[]): void;
    /** @deprecated Check `err.issues.length === 0` instead. */
    isEmpty: boolean;
}
declare const ZodError: $constructor<ZodError>;

type ZodSafeParseResult<T> = ZodSafeParseSuccess<T> | ZodSafeParseError<T>;
type ZodSafeParseSuccess<T> = {
    success: true;
    data: T;
    error?: never;
};
type ZodSafeParseError<T> = {
    success: false;
    data?: never;
    error: ZodError<T>;
};

type ZodStandardSchemaWithJSON<T> = StandardSchemaWithJSONProps<input<T>, output<T>>;
interface _ZodType<out Internals extends $ZodTypeInternals = $ZodTypeInternals> extends ZodType<any, any, Internals> {
}
interface ZodType<out Output = unknown, out Input = unknown, out Internals extends $ZodTypeInternals<Output, Input> = $ZodTypeInternals<Output, Input>> extends $ZodType<Output, Input, Internals> {
    def: Internals["def"];
    type: Internals["def"]["type"];
    /** @deprecated Use `.def` instead. */
    _def: Internals["def"];
    /** @deprecated Use `z.output<typeof schema>` instead. */
    _output: Internals["output"];
    /** @deprecated Use `z.input<typeof schema>` instead. */
    _input: Internals["input"];
    "~standard": ZodStandardSchemaWithJSON<this>;
    /** Converts this schema to a JSON Schema representation. */
    toJSONSchema(params?: ToJSONSchemaParams): ZodStandardJSONSchemaPayload<this>;
    check(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
    with(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
    clone(def?: Internals["def"], params?: {
        parent: boolean;
    }): this;
    register<R extends $ZodRegistry>(registry: R, ...meta: this extends R["_schema"] ? undefined extends R["_meta"] ? [$replace<R["_meta"], this>?] : [$replace<R["_meta"], this>] : ["Incompatible schema"]): this;
    brand<T extends PropertyKey = PropertyKey, Dir extends "in" | "out" | "inout" = "out">(value?: T): PropertyKey extends T ? this : $ZodBranded<this, T, Dir>;
    parse(data: unknown, params?: ParseContext<$ZodIssue>): output<this>;
    safeParse(data: unknown, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
    parseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
    safeParseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
    spa: (data: unknown, params?: ParseContext<$ZodIssue>) => Promise<ZodSafeParseResult<output<this>>>;
    encode(data: output<this>, params?: ParseContext<$ZodIssue>): input<this>;
    decode(data: input<this>, params?: ParseContext<$ZodIssue>): output<this>;
    encodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<input<this>>;
    decodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
    safeEncode(data: output<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<input<this>>;
    safeDecode(data: input<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
    safeEncodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<input<this>>>;
    safeDecodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
    refine<Ch extends (arg: output<this>) => unknown | Promise<unknown>>(check: Ch, params?: string | $ZodCustomParams): Ch extends (arg: any) => arg is infer R ? this & ZodType<R, input<this>> : this;
    superRefine(refinement: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => void | Promise<void>): this;
    overwrite(fn: (x: output<this>) => output<this>): this;
    optional(): ZodOptional<this>;
    exactOptional(): ZodExactOptional<this>;
    nonoptional(params?: string | $ZodNonOptionalParams): ZodNonOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    default(def: NoUndefined<output<this>>): ZodDefault<this>;
    default(def: () => NoUndefined<output<this>>): ZodDefault<this>;
    prefault(def: () => input<this>): ZodPrefault<this>;
    prefault(def: input<this>): ZodPrefault<this>;
    array(): ZodArray<this>;
    or<T extends SomeType>(option: T): ZodUnion<[this, T]>;
    and<T extends SomeType>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => NewOut | Promise<NewOut>): ZodPipe<this, ZodTransform<Awaited<NewOut>, output<this>>>;
    catch(def: output<this>): ZodCatch<this>;
    catch(def: (ctx: $ZodCatchCtx) => output<this>): ZodCatch<this>;
    pipe<T extends $ZodType<any, output<this>>>(target: T | $ZodType<any, output<this>>): ZodPipe<this, T>;
    readonly(): ZodReadonly<this>;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified description */
    describe(description: string): this;
    description?: string;
    /** Returns the metadata associated with this instance in `z.globalRegistry` */
    meta(): $replace<GlobalMeta, this> | undefined;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified metadata */
    meta(data: $replace<GlobalMeta, this>): this;
    /** @deprecated Try safe-parsing `undefined` (this is what `isOptional` does internally):
     *
     * ```ts
     * const schema = z.string().optional();
     * const isOptional = schema.safeParse(undefined).success; // true
     * ```
     */
    isOptional(): boolean;
    /**
     * @deprecated Try safe-parsing `null` (this is what `isNullable` does internally):
     *
     * ```ts
     * const schema = z.string().nullable();
     * const isNullable = schema.safeParse(null).success; // true
     * ```
     */
    isNullable(): boolean;
    apply<T>(fn: (schema: this) => T): T;
}
declare const ZodType: $constructor<ZodType>;
interface _ZodString<T extends $ZodStringInternals<unknown> = $ZodStringInternals<unknown>> extends _ZodType<T> {
    format: string | null;
    minLength: number | null;
    maxLength: number | null;
    regex(regex: RegExp, params?: string | $ZodCheckRegexParams): this;
    includes(value: string, params?: string | $ZodCheckIncludesParams): this;
    startsWith(value: string, params?: string | $ZodCheckStartsWithParams): this;
    endsWith(value: string, params?: string | $ZodCheckEndsWithParams): this;
    min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
    nonempty(params?: string | $ZodCheckMinLengthParams): this;
    lowercase(params?: string | $ZodCheckLowerCaseParams): this;
    uppercase(params?: string | $ZodCheckUpperCaseParams): this;
    trim(): this;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD" | (string & {})): this;
    toLowerCase(): this;
    toUpperCase(): this;
    slugify(): this;
}
/** @internal */
declare const _ZodString: $constructor<_ZodString>;
interface ZodString extends _ZodString<$ZodStringInternals<string>> {
    /** @deprecated Use `z.email()` instead. */
    email(params?: string | $ZodCheckEmailParams): this;
    /** @deprecated Use `z.url()` instead. */
    url(params?: string | $ZodCheckURLParams): this;
    /** @deprecated Use `z.jwt()` instead. */
    jwt(params?: string | $ZodCheckJWTParams): this;
    /** @deprecated Use `z.emoji()` instead. */
    emoji(params?: string | $ZodCheckEmojiParams): this;
    /** @deprecated Use `z.guid()` instead. */
    guid(params?: string | $ZodCheckGUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuid(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv4(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv6(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv7(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.nanoid()` instead. */
    nanoid(params?: string | $ZodCheckNanoIDParams): this;
    /** @deprecated Use `z.guid()` instead. */
    guid(params?: string | $ZodCheckGUIDParams): this;
    /** @deprecated Use `z.cuid()` instead. */
    cuid(params?: string | $ZodCheckCUIDParams): this;
    /** @deprecated Use `z.cuid2()` instead. */
    cuid2(params?: string | $ZodCheckCUID2Params): this;
    /** @deprecated Use `z.ulid()` instead. */
    ulid(params?: string | $ZodCheckULIDParams): this;
    /** @deprecated Use `z.base64()` instead. */
    base64(params?: string | $ZodCheckBase64Params): this;
    /** @deprecated Use `z.base64url()` instead. */
    base64url(params?: string | $ZodCheckBase64URLParams): this;
    /** @deprecated Use `z.xid()` instead. */
    xid(params?: string | $ZodCheckXIDParams): this;
    /** @deprecated Use `z.ksuid()` instead. */
    ksuid(params?: string | $ZodCheckKSUIDParams): this;
    /** @deprecated Use `z.ipv4()` instead. */
    ipv4(params?: string | $ZodCheckIPv4Params): this;
    /** @deprecated Use `z.ipv6()` instead. */
    ipv6(params?: string | $ZodCheckIPv6Params): this;
    /** @deprecated Use `z.cidrv4()` instead. */
    cidrv4(params?: string | $ZodCheckCIDRv4Params): this;
    /** @deprecated Use `z.cidrv6()` instead. */
    cidrv6(params?: string | $ZodCheckCIDRv6Params): this;
    /** @deprecated Use `z.e164()` instead. */
    e164(params?: string | $ZodCheckE164Params): this;
    /** @deprecated Use `z.iso.datetime()` instead. */
    datetime(params?: string | $ZodCheckISODateTimeParams): this;
    /** @deprecated Use `z.iso.date()` instead. */
    date(params?: string | $ZodCheckISODateParams): this;
    /** @deprecated Use `z.iso.time()` instead. */
    time(params?: string | $ZodCheckISOTimeParams): this;
    /** @deprecated Use `z.iso.duration()` instead. */
    duration(params?: string | $ZodCheckISODurationParams): this;
}
declare const ZodString: $constructor<ZodString>;
interface ZodStringFormat<Format extends string = string> extends _ZodString<$ZodStringFormatInternals<Format>> {
}
declare const ZodStringFormat: $constructor<ZodStringFormat>;
interface _ZodNumber<Internals extends $ZodNumberInternals = $ZodNumberInternals> extends _ZodType<Internals> {
    gt(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    /** Identical to .min() */
    gte(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    min(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    lt(value: number, params?: string | $ZodCheckLessThanParams): this;
    /** Identical to .max() */
    lte(value: number, params?: string | $ZodCheckLessThanParams): this;
    max(value: number, params?: string | $ZodCheckLessThanParams): this;
    /** Consider `z.int()` instead. This API is considered *legacy*; it will never be removed but a better alternative exists. */
    int(params?: string | $ZodCheckNumberFormatParams): this;
    /** @deprecated This is now identical to `.int()`. Only numbers in the safe integer range are accepted. */
    safe(params?: string | $ZodCheckNumberFormatParams): this;
    positive(params?: string | $ZodCheckGreaterThanParams): this;
    nonnegative(params?: string | $ZodCheckGreaterThanParams): this;
    negative(params?: string | $ZodCheckLessThanParams): this;
    nonpositive(params?: string | $ZodCheckLessThanParams): this;
    multipleOf(value: number, params?: string | $ZodCheckMultipleOfParams): this;
    /** @deprecated Use `.multipleOf()` instead. */
    step(value: number, params?: string | $ZodCheckMultipleOfParams): this;
    /** @deprecated In v4 and later, z.number() does not allow infinite values by default. This is a no-op. */
    finite(params?: unknown): this;
    minValue: number | null;
    maxValue: number | null;
    /** @deprecated Check the `format` property instead.  */
    isInt: boolean;
    /** @deprecated Number schemas no longer accept infinite values, so this always returns `true`. */
    isFinite: boolean;
    format: string | null;
}
interface ZodNumber extends _ZodNumber<$ZodNumberInternals<number>> {
}
declare const ZodNumber: $constructor<ZodNumber>;
interface _ZodBoolean<T extends $ZodBooleanInternals = $ZodBooleanInternals> extends _ZodType<T> {
}
interface ZodBoolean extends _ZodBoolean<$ZodBooleanInternals<boolean>> {
}
declare const ZodBoolean: $constructor<ZodBoolean>;
interface _ZodDate<T extends $ZodDateInternals = $ZodDateInternals> extends _ZodType<T> {
    min(value: number | Date, params?: string | $ZodCheckGreaterThanParams): this;
    max(value: number | Date, params?: string | $ZodCheckLessThanParams): this;
    /** @deprecated Not recommended. */
    minDate: Date | null;
    /** @deprecated Not recommended. */
    maxDate: Date | null;
}
interface ZodDate extends _ZodDate<$ZodDateInternals<Date>> {
}
declare const ZodDate: $constructor<ZodDate>;
interface ZodArray<T extends SomeType = $ZodType> extends _ZodType<$ZodArrayInternals<T>>, $ZodArray<T> {
    element: T;
    min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
    nonempty(params?: string | $ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
    unwrap(): T;
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodArray: $constructor<ZodArray>;
type SafeExtendShape<Base extends $ZodShape, Ext extends $ZodLooseShape> = {
    [K in keyof Ext]: K extends keyof Base ? output<Ext[K]> extends output<Base[K]> ? input<Ext[K]> extends input<Base[K]> ? Ext[K] : never : never : Ext[K];
};
interface ZodObject<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodLooseShape, out Config extends $ZodObjectConfig = $strip> extends _ZodType<$ZodObjectInternals<Shape, Config>>, $ZodObject<Shape, Config> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    shape: Shape;
    keyof(): ZodEnum<ToEnum<keyof Shape & string>>;
    /** Define a schema to validate all unrecognized keys. This overrides the existing strict/loose behavior. */
    catchall<T extends SomeType>(schema: T): ZodObject<Shape, $catchall<T>>;
    /** @deprecated Use `z.looseObject()` or `.loose()` instead. */
    passthrough(): ZodObject<Shape, $loose>;
    /** Consider `z.looseObject(A.shape)` instead */
    loose(): ZodObject<Shape, $loose>;
    /** Consider `z.strictObject(A.shape)` instead */
    strict(): ZodObject<Shape, $strict>;
    /** This is the default behavior. This method call is likely unnecessary. */
    strip(): ZodObject<Shape, $strip>;
    extend<U extends $ZodLooseShape>(shape: U): ZodObject<Extend<Shape, U>, Config>;
    safeExtend<U extends $ZodLooseShape>(shape: SafeExtendShape<Shape, U> & Partial<Record<keyof Shape, SomeType>>): ZodObject<Extend<Shape, U>, Config>;
    /**
     * @deprecated Use [`A.extend(B.shape)`](https://zod.dev/api?id=extend) instead.
     */
    merge<U extends ZodObject>(other: U): ZodObject<Extend<Shape, U["shape"]>, U["_zod"]["config"]>;
    pick<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    omit<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    partial(): ZodObject<{
        [k in keyof Shape]: ZodOptional<Shape[k]>;
    }, Config>;
    partial<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        [k in keyof Shape]: k extends keyof M ? ZodOptional<Shape[k]> : Shape[k];
    }, Config>;
    required(): ZodObject<{
        [k in keyof Shape]: ZodNonOptional<Shape[k]>;
    }, Config>;
    required<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        [k in keyof Shape]: k extends keyof M ? ZodNonOptional<Shape[k]> : Shape[k];
    }, Config>;
}
declare const ZodObject: $constructor<ZodObject>;
interface ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends _ZodType<$ZodUnionInternals<T>>, $ZodUnion<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    options: T;
}
declare const ZodUnion: $constructor<ZodUnion>;
interface ZodDiscriminatedUnion<Options extends readonly SomeType[] = readonly $ZodType[], Disc extends string = string> extends ZodUnion<Options>, $ZodDiscriminatedUnion<Options, Disc> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    _zod: $ZodDiscriminatedUnionInternals<Options, Disc>;
    def: $ZodDiscriminatedUnionDef<Options, Disc>;
}
declare const ZodDiscriminatedUnion: $constructor<ZodDiscriminatedUnion>;
interface ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodIntersectionInternals<A, B>>, $ZodIntersection<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodIntersection: $constructor<ZodIntersection>;
interface ZodRecord<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends _ZodType<$ZodRecordInternals<Key, Value>>, $ZodRecord<Key, Value> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    keyType: Key;
    valueType: Value;
}
declare const ZodRecord: $constructor<ZodRecord>;
interface ZodEnum<
/** @ts-ignore Cast variance */
out T extends EnumLike = EnumLike> extends _ZodType<$ZodEnumInternals<T>>, $ZodEnum<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    enum: T;
    options: Array<T[keyof T]>;
    extract<const U extends readonly (keyof T)[]>(values: U, params?: string | $ZodEnumParams): ZodEnum<Flatten<Pick<T, U[number]>>>;
    exclude<const U extends readonly (keyof T)[]>(values: U, params?: string | $ZodEnumParams): ZodEnum<Flatten<Omit<T, U[number]>>>;
}
declare const ZodEnum: $constructor<ZodEnum>;
interface ZodLiteral<T extends Literal = Literal> extends _ZodType<$ZodLiteralInternals<T>>, $ZodLiteral<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    values: Set<T>;
    /** @legacy Use `.values` instead. Accessing this property will throw an error if the literal accepts multiple values. */
    value: T;
}
declare const ZodLiteral: $constructor<ZodLiteral>;
interface ZodTransform<O = unknown, I = unknown> extends _ZodType<$ZodTransformInternals<O, I>>, $ZodTransform<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodTransform: $constructor<ZodTransform>;
interface ZodOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodOptionalInternals<T>>, $ZodOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodOptional: $constructor<ZodOptional>;
interface ZodExactOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodExactOptionalInternals<T>>, $ZodExactOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodExactOptional: $constructor<ZodExactOptional>;
interface ZodNullable<T extends SomeType = $ZodType> extends _ZodType<$ZodNullableInternals<T>>, $ZodNullable<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodNullable: $constructor<ZodNullable>;
interface ZodDefault<T extends SomeType = $ZodType> extends _ZodType<$ZodDefaultInternals<T>>, $ZodDefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use `.unwrap()` instead. */
    removeDefault(): T;
}
declare const ZodDefault: $constructor<ZodDefault>;
interface ZodPrefault<T extends SomeType = $ZodType> extends _ZodType<$ZodPrefaultInternals<T>>, $ZodPrefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodPrefault: $constructor<ZodPrefault>;
interface ZodNonOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodNonOptionalInternals<T>>, $ZodNonOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodNonOptional: $constructor<ZodNonOptional>;
interface ZodCatch<T extends SomeType = $ZodType> extends _ZodType<$ZodCatchInternals<T>>, $ZodCatch<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use `.unwrap()` instead. */
    removeCatch(): T;
}
declare const ZodCatch: $constructor<ZodCatch>;
interface ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodPipeInternals<A, B>>, $ZodPipe<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    in: A;
    out: B;
}
declare const ZodPipe: $constructor<ZodPipe>;
interface ZodReadonly<T extends SomeType = $ZodType> extends _ZodType<$ZodReadonlyInternals<T>>, $ZodReadonly<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodReadonly: $constructor<ZodReadonly>;
interface ZodLazy<T extends SomeType = $ZodType> extends _ZodType<$ZodLazyInternals<T>>, $ZodLazy<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodLazy: $constructor<ZodLazy>;
interface ZodCustom<O = unknown, I = unknown> extends _ZodType<$ZodCustomInternals<O, I>>, $ZodCustom<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodCustom: $constructor<ZodCustom>;

interface ZodISODateTime extends ZodStringFormat {
    _zod: $ZodISODateTimeInternals;
}
declare const ZodISODateTime: $constructor<ZodISODateTime>;

/**
 * DocxDocument Zod Schema
 *
 * JSON-first schema for DOCX generation. AI agents produce this directly.
 * No React, no DOM, no coordinates — pure document semantics.
 */

declare const ColorValue$1: ZodString;
declare const BorderStyleSchema: ZodObject<{
    width: ZodDefault<ZodNumber>;
    color: ZodDefault<ZodString>;
    style: ZodDefault<ZodEnum<{
        solid: "solid";
        dashed: "dashed";
        dotted: "dotted";
        double: "double";
        none: "none";
    }>>;
}, $strip>;
declare const SpacingSchema: ZodObject<{
    top: ZodDefault<ZodNumber>;
    right: ZodDefault<ZodNumber>;
    bottom: ZodDefault<ZodNumber>;
    left: ZodDefault<ZodNumber>;
}, $strip>;
declare const CommentInfoSchema: ZodObject<{
    id: ZodOptional<ZodNumber>;
    parentId: ZodOptional<ZodNumber>;
    text: ZodString;
    author: ZodOptional<ZodString>;
    initials: ZodOptional<ZodString>;
    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
    done: ZodOptional<ZodBoolean>;
}, $strip>;
declare const TextRunSchema: ZodObject<{
    text: ZodString;
    style: ZodOptional<ZodOptional<ZodObject<{
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        color: ZodOptional<ZodString>;
        backgroundColor: ZodOptional<ZodString>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        superscript: ZodOptional<ZodBoolean>;
        subscript: ZodOptional<ZodBoolean>;
        letterSpacing: ZodOptional<ZodNumber>;
    }, $strip>>>;
    hyperlink: ZodOptional<ZodString>;
    revision: ZodOptional<ZodObject<{
        type: ZodEnum<{
            format: "format";
            insert: "insert";
            delete: "delete";
        }>;
        id: ZodOptional<ZodNumber>;
        author: ZodOptional<ZodString>;
        date: ZodOptional<ZodString>;
        beforeStyle: ZodOptional<ZodObject<{
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            color: ZodOptional<ZodString>;
            backgroundColor: ZodOptional<ZodString>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            superscript: ZodOptional<ZodBoolean>;
            subscript: ZodOptional<ZodBoolean>;
            letterSpacing: ZodOptional<ZodNumber>;
        }, $strip>>;
    }, $strip>>;
}, $strict>;
declare const RevisionInfoSchema: ZodObject<{
    author: ZodOptional<ZodString>;
    date: ZodOptional<ZodString>;
    rsid: ZodOptional<ZodString>;
}, $strip>;
declare const BaseStyleSchema: ZodOptional<ZodObject<{
    color: ZodOptional<ZodString>;
    fontFamily: ZodOptional<ZodString>;
    fontSize: ZodOptional<ZodCustom<number, number>>;
    fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
        normal: "normal";
        bold: "bold";
    }>, ZodNumber]>>;
    fontStyle: ZodOptional<ZodEnum<{
        normal: "normal";
        italic: "italic";
    }>>;
    textDecoration: ZodOptional<ZodEnum<{
        none: "none";
        underline: "underline";
        "line-through": "line-through";
        "underline line-through": "underline line-through";
    }>>;
    backgroundColor: ZodOptional<ZodString>;
    border: ZodOptional<ZodObject<{
        width: ZodDefault<ZodNumber>;
        color: ZodDefault<ZodString>;
        style: ZodDefault<ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            double: "double";
            none: "none";
        }>>;
    }, $strip>>;
    padding: ZodOptional<ZodObject<{
        top: ZodDefault<ZodNumber>;
        right: ZodDefault<ZodNumber>;
        bottom: ZodDefault<ZodNumber>;
        left: ZodDefault<ZodNumber>;
    }, $strip>>;
    margin: ZodOptional<ZodObject<{
        top: ZodDefault<ZodNumber>;
        right: ZodDefault<ZodNumber>;
        bottom: ZodDefault<ZodNumber>;
        left: ZodDefault<ZodNumber>;
    }, $strip>>;
    textAlign: ZodOptional<ZodEnum<{
        right: "right";
        left: "left";
        center: "center";
        justify: "justify";
    }>>;
    lineHeight: ZodOptional<ZodNumber>;
    opacity: ZodOptional<ZodNumber>;
    comment: ZodOptional<ZodObject<{
        id: ZodOptional<ZodNumber>;
        parentId: ZodOptional<ZodNumber>;
        text: ZodString;
        author: ZodOptional<ZodString>;
        initials: ZodOptional<ZodString>;
        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        done: ZodOptional<ZodBoolean>;
    }, $strip>>;
}, $strict>>;
declare const HeadingElementSchema: ZodObject<{
    type: ZodLiteral<"heading">;
    level: ZodNumber;
    text: ZodOptional<ZodString>;
    runs: ZodOptional<ZodArray<ZodObject<{
        text: ZodString;
        style: ZodOptional<ZodOptional<ZodObject<{
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            color: ZodOptional<ZodString>;
            backgroundColor: ZodOptional<ZodString>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            superscript: ZodOptional<ZodBoolean>;
            subscript: ZodOptional<ZodBoolean>;
            letterSpacing: ZodOptional<ZodNumber>;
        }, $strip>>>;
        hyperlink: ZodOptional<ZodString>;
        revision: ZodOptional<ZodObject<{
            type: ZodEnum<{
                format: "format";
                insert: "insert";
                delete: "delete";
            }>;
            id: ZodOptional<ZodNumber>;
            author: ZodOptional<ZodString>;
            date: ZodOptional<ZodString>;
            beforeStyle: ZodOptional<ZodObject<{
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                color: ZodOptional<ZodString>;
                backgroundColor: ZodOptional<ZodString>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                superscript: ZodOptional<ZodBoolean>;
                subscript: ZodOptional<ZodBoolean>;
                letterSpacing: ZodOptional<ZodNumber>;
            }, $strip>>;
        }, $strip>>;
    }, $strict>>>;
    revision: ZodOptional<ZodObject<{
        id: ZodOptional<ZodNumber>;
        author: ZodOptional<ZodString>;
        date: ZodOptional<ZodString>;
        type: ZodEnum<{
            insert: "insert";
            delete: "delete";
            property: "property";
            moveFrom: "moveFrom";
            moveTo: "moveTo";
        }>;
        moveName: ZodOptional<ZodString>;
        before: ZodOptional<ZodObject<{
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            keepLines: ZodOptional<ZodBoolean>;
            keepNext: ZodOptional<ZodBoolean>;
            pageBreakBefore: ZodOptional<ZodBoolean>;
            indent: ZodOptional<ZodObject<{
                firstLine: ZodOptional<ZodNumber>;
                left: ZodOptional<ZodNumber>;
                right: ZodOptional<ZodNumber>;
            }, $strip>>;
        }, $strip>>;
    }, $strip>>;
    comment: ZodOptional<ZodObject<{
        id: ZodOptional<ZodNumber>;
        parentId: ZodOptional<ZodNumber>;
        text: ZodString;
        author: ZodOptional<ZodString>;
        initials: ZodOptional<ZodString>;
        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        done: ZodOptional<ZodBoolean>;
    }, $strip>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
    bookmarkId: ZodOptional<ZodString>;
    footnote: ZodOptional<ZodString>;
    endnote: ZodOptional<ZodString>;
    keepNext: ZodOptional<ZodBoolean>;
    pageBreakBefore: ZodOptional<ZodBoolean>;
}, $strict>;
declare const ParagraphElementSchema: ZodObject<{
    type: ZodLiteral<"paragraph">;
    text: ZodOptional<ZodString>;
    runs: ZodOptional<ZodArray<ZodObject<{
        text: ZodString;
        style: ZodOptional<ZodOptional<ZodObject<{
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            color: ZodOptional<ZodString>;
            backgroundColor: ZodOptional<ZodString>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            superscript: ZodOptional<ZodBoolean>;
            subscript: ZodOptional<ZodBoolean>;
            letterSpacing: ZodOptional<ZodNumber>;
        }, $strip>>>;
        hyperlink: ZodOptional<ZodString>;
        revision: ZodOptional<ZodObject<{
            type: ZodEnum<{
                format: "format";
                insert: "insert";
                delete: "delete";
            }>;
            id: ZodOptional<ZodNumber>;
            author: ZodOptional<ZodString>;
            date: ZodOptional<ZodString>;
            beforeStyle: ZodOptional<ZodObject<{
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                color: ZodOptional<ZodString>;
                backgroundColor: ZodOptional<ZodString>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                superscript: ZodOptional<ZodBoolean>;
                subscript: ZodOptional<ZodBoolean>;
                letterSpacing: ZodOptional<ZodNumber>;
            }, $strip>>;
        }, $strip>>;
    }, $strict>>>;
    revision: ZodOptional<ZodObject<{
        id: ZodOptional<ZodNumber>;
        author: ZodOptional<ZodString>;
        date: ZodOptional<ZodString>;
        type: ZodEnum<{
            insert: "insert";
            delete: "delete";
            property: "property";
            moveFrom: "moveFrom";
            moveTo: "moveTo";
        }>;
        moveName: ZodOptional<ZodString>;
        before: ZodOptional<ZodObject<{
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            keepLines: ZodOptional<ZodBoolean>;
            keepNext: ZodOptional<ZodBoolean>;
            pageBreakBefore: ZodOptional<ZodBoolean>;
            indent: ZodOptional<ZodObject<{
                firstLine: ZodOptional<ZodNumber>;
                left: ZodOptional<ZodNumber>;
                right: ZodOptional<ZodNumber>;
            }, $strip>>;
        }, $strip>>;
    }, $strip>>;
    comment: ZodOptional<ZodObject<{
        id: ZodOptional<ZodNumber>;
        parentId: ZodOptional<ZodNumber>;
        text: ZodString;
        author: ZodOptional<ZodString>;
        initials: ZodOptional<ZodString>;
        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        done: ZodOptional<ZodBoolean>;
    }, $strip>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
    footnote: ZodOptional<ZodString>;
    endnote: ZodOptional<ZodString>;
    keepLines: ZodOptional<ZodBoolean>;
    keepNext: ZodOptional<ZodBoolean>;
    pageBreakBefore: ZodOptional<ZodBoolean>;
    indent: ZodOptional<ZodObject<{
        firstLine: ZodOptional<ZodNumber>;
        left: ZodOptional<ZodNumber>;
        right: ZodOptional<ZodNumber>;
    }, $strip>>;
}, $strict>;
interface ListItemInput {
    text?: string;
    runs?: Array<{
        text: string;
        style?: unknown;
        hyperlink?: string;
    }>;
    nestedList?: {
        type: 'list';
        listType?: string;
        start?: number;
        items: ListItemInput[];
    };
}
declare const ListElementSchema: ZodObject<{
    type: ZodLiteral<"list">;
    listType: ZodDefault<ZodEnum<{
        number: "number";
        bullet: "bullet";
        letter: "letter";
        roman: "roman";
    }>>;
    start: ZodDefault<ZodNumber>;
    items: ZodArray<ZodType<ListItemInput, unknown, $ZodTypeInternals<ListItemInput, unknown>>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
}, $strict>;
declare const TableElementSchema: ZodObject<{
    type: ZodLiteral<"table">;
    columns: ZodOptional<ZodArray<ZodObject<{
        width: ZodOptional<ZodNumber>;
    }, $strip>>>;
    rows: ZodArray<ZodObject<{
        cells: ZodArray<ZodObject<{
            text: ZodOptional<ZodString>;
            runs: ZodOptional<ZodArray<ZodObject<{
                text: ZodString;
                style: ZodOptional<ZodOptional<ZodObject<{
                    fontFamily: ZodOptional<ZodString>;
                    fontSize: ZodOptional<ZodCustom<number, number>>;
                    fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                        normal: "normal";
                        bold: "bold";
                    }>, ZodNumber]>>;
                    fontStyle: ZodOptional<ZodEnum<{
                        normal: "normal";
                        italic: "italic";
                    }>>;
                    color: ZodOptional<ZodString>;
                    backgroundColor: ZodOptional<ZodString>;
                    textDecoration: ZodOptional<ZodEnum<{
                        none: "none";
                        underline: "underline";
                        "line-through": "line-through";
                        "underline line-through": "underline line-through";
                    }>>;
                    superscript: ZodOptional<ZodBoolean>;
                    subscript: ZodOptional<ZodBoolean>;
                    letterSpacing: ZodOptional<ZodNumber>;
                }, $strip>>>;
                hyperlink: ZodOptional<ZodString>;
                revision: ZodOptional<ZodObject<{
                    type: ZodEnum<{
                        format: "format";
                        insert: "insert";
                        delete: "delete";
                    }>;
                    id: ZodOptional<ZodNumber>;
                    author: ZodOptional<ZodString>;
                    date: ZodOptional<ZodString>;
                    beforeStyle: ZodOptional<ZodObject<{
                        fontFamily: ZodOptional<ZodString>;
                        fontSize: ZodOptional<ZodCustom<number, number>>;
                        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                            normal: "normal";
                            bold: "bold";
                        }>, ZodNumber]>>;
                        fontStyle: ZodOptional<ZodEnum<{
                            normal: "normal";
                            italic: "italic";
                        }>>;
                        color: ZodOptional<ZodString>;
                        backgroundColor: ZodOptional<ZodString>;
                        textDecoration: ZodOptional<ZodEnum<{
                            none: "none";
                            underline: "underline";
                            "line-through": "line-through";
                            "underline line-through": "underline line-through";
                        }>>;
                        superscript: ZodOptional<ZodBoolean>;
                        subscript: ZodOptional<ZodBoolean>;
                        letterSpacing: ZodOptional<ZodNumber>;
                    }, $strip>>;
                }, $strip>>;
            }, $strict>>>;
            elements: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            revision: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                author: ZodOptional<ZodString>;
                date: ZodOptional<ZodString>;
                type: ZodEnum<{
                    insert: "insert";
                    delete: "delete";
                }>;
            }, $strip>>;
            colSpan: ZodDefault<ZodNumber>;
            rowSpan: ZodDefault<ZodNumber>;
            col: ZodOptional<ZodNumber>;
            row: ZodOptional<ZodNumber>;
            style: ZodOptional<ZodObject<{
                backgroundColor: ZodOptional<ZodString>;
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                borderTop: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                borderRight: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                borderBottom: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                borderLeft: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                verticalAlign: ZodOptional<ZodEnum<{
                    top: "top";
                    bottom: "bottom";
                    middle: "middle";
                }>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
            }, $strip>>;
        }, $strict>>;
        isHeader: ZodOptional<ZodBoolean>;
        revision: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            author: ZodOptional<ZodString>;
            date: ZodOptional<ZodString>;
            type: ZodEnum<{
                insert: "insert";
                delete: "delete";
            }>;
        }, $strip>>;
    }, $strip>>;
    caption: ZodOptional<ZodString>;
    tableDescription: ZodOptional<ZodString>;
    tableCaption: ZodOptional<ZodString>;
    repeatHeaders: ZodDefault<ZodBoolean>;
    keepTogether: ZodOptional<ZodBoolean>;
    keepWithNext: ZodOptional<ZodBoolean>;
    tableStyle: ZodOptional<ZodEnum<{
        plain: "plain";
        striped: "striped";
        bordered: "bordered";
        modern: "modern";
        minimal: "minimal";
        corporate: "corporate";
    }>>;
    revision: ZodOptional<ZodObject<{
        id: ZodOptional<ZodNumber>;
        author: ZodOptional<ZodString>;
        date: ZodOptional<ZodString>;
        type: ZodLiteral<"property">;
        before: ZodOptional<ZodObject<{
            caption: ZodOptional<ZodString>;
            tableDescription: ZodOptional<ZodString>;
            tableCaption: ZodOptional<ZodString>;
        }, $strip>>;
    }, $strip>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
}, $strict>;
declare const ImageElementSchema: ZodObject<{
    type: ZodLiteral<"image">;
    src: ZodUnion<readonly [ZodString, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
    alt: ZodOptional<ZodString>;
    width: ZodOptional<ZodNumber>;
    height: ZodOptional<ZodNumber>;
    decorative: ZodOptional<ZodBoolean>;
    alignment: ZodOptional<ZodEnum<{
        right: "right";
        left: "left";
        center: "center";
        inline: "inline";
    }>>;
    caption: ZodOptional<ZodString>;
    floating: ZodOptional<ZodObject<{
        wrap: ZodOptional<ZodEnum<{
            square: "square";
            tight: "tight";
            through: "through";
            topAndBottom: "topAndBottom";
            behind: "behind";
            inFront: "inFront";
        }>>;
        position: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
        }>>;
        horizontalAnchor: ZodOptional<ZodEnum<{
            margin: "margin";
            page: "page";
            column: "column";
            character: "character";
        }>>;
        verticalAnchor: ZodOptional<ZodEnum<{
            margin: "margin";
            paragraph: "paragraph";
            page: "page";
            line: "line";
        }>>;
        horizontalPosition: ZodOptional<ZodUnion<readonly [ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            inside: "inside";
            outside: "outside";
        }>, ZodNumber]>>;
        verticalPosition: ZodOptional<ZodUnion<readonly [ZodEnum<{
            top: "top";
            bottom: "bottom";
            center: "center";
            inside: "inside";
            outside: "outside";
        }>, ZodNumber]>>;
        distanceFromText: ZodOptional<ZodObject<{
            top: ZodOptional<ZodNumber>;
            bottom: ZodOptional<ZodNumber>;
            left: ZodOptional<ZodNumber>;
            right: ZodOptional<ZodNumber>;
        }, $strip>>;
        allowOverlap: ZodOptional<ZodBoolean>;
        lockAnchor: ZodOptional<ZodBoolean>;
        layoutInCell: ZodOptional<ZodBoolean>;
    }, $strip>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
}, $strict>;
declare const ChartElementSchema: ZodObject<{
    type: ZodLiteral<"chart">;
    chartType: ZodEnum<{
        column: "column";
        line: "line";
        bar: "bar";
        area: "area";
        pie: "pie";
        doughnut: "doughnut";
        scatter: "scatter";
        radar: "radar";
    }>;
    title: ZodOptional<ZodString>;
    series: ZodArray<ZodObject<{
        name: ZodString;
        values: ZodArray<ZodNumber>;
        color: ZodOptional<ZodString>;
    }, $strip>>;
    categories: ZodOptional<ZodArray<ZodString>>;
    width: ZodOptional<ZodNumber>;
    height: ZodOptional<ZodNumber>;
    legend: ZodOptional<ZodObject<{
        position: ZodDefault<ZodEnum<{
            none: "none";
            top: "top";
            right: "right";
            bottom: "bottom";
            left: "left";
        }>>;
    }, $strip>>;
    axes: ZodOptional<ZodObject<{
        x: ZodOptional<ZodObject<{
            title: ZodOptional<ZodString>;
            gridLines: ZodOptional<ZodBoolean>;
        }, $strip>>;
        y: ZodOptional<ZodObject<{
            title: ZodOptional<ZodString>;
            min: ZodOptional<ZodNumber>;
            max: ZodOptional<ZodNumber>;
            gridLines: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strip>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
}, $strict>;
declare const ShapeElementSchema: ZodObject<{
    type: ZodLiteral<"shape">;
    shapeType: ZodEnum<{
        line: "line";
        rectangle: "rectangle";
        ellipse: "ellipse";
        triangle: "triangle";
        diamond: "diamond";
        arrow: "arrow";
    }>;
    width: ZodNumber;
    height: ZodNumber;
    fill: ZodOptional<ZodObject<{
        type: ZodDefault<ZodEnum<{
            solid: "solid";
            gradient: "gradient";
        }>>;
        color: ZodOptional<ZodString>;
        gradient: ZodOptional<ZodObject<{
            type: ZodDefault<ZodEnum<{
                linear: "linear";
                radial: "radial";
            }>>;
            angle: ZodOptional<ZodNumber>;
            stops: ZodArray<ZodObject<{
                color: ZodString;
                position: ZodNumber;
            }, $strip>>;
        }, $strip>>;
    }, $strip>>;
    stroke: ZodOptional<ZodObject<{
        width: ZodDefault<ZodNumber>;
        color: ZodDefault<ZodString>;
        style: ZodDefault<ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, $strip>>;
    text: ZodOptional<ZodString>;
    runs: ZodOptional<ZodArray<ZodObject<{
        text: ZodString;
        style: ZodOptional<ZodOptional<ZodObject<{
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            color: ZodOptional<ZodString>;
            backgroundColor: ZodOptional<ZodString>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            superscript: ZodOptional<ZodBoolean>;
            subscript: ZodOptional<ZodBoolean>;
            letterSpacing: ZodOptional<ZodNumber>;
        }, $strip>>>;
        hyperlink: ZodOptional<ZodString>;
        revision: ZodOptional<ZodObject<{
            type: ZodEnum<{
                format: "format";
                insert: "insert";
                delete: "delete";
            }>;
            id: ZodOptional<ZodNumber>;
            author: ZodOptional<ZodString>;
            date: ZodOptional<ZodString>;
            beforeStyle: ZodOptional<ZodObject<{
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                color: ZodOptional<ZodString>;
                backgroundColor: ZodOptional<ZodString>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                superscript: ZodOptional<ZodBoolean>;
                subscript: ZodOptional<ZodBoolean>;
                letterSpacing: ZodOptional<ZodNumber>;
            }, $strip>>;
        }, $strip>>;
    }, $strict>>>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
}, $strict>;
declare const CodeBlockElementSchema: ZodObject<{
    type: ZodLiteral<"code-block">;
    code: ZodString;
    language: ZodOptional<ZodString>;
    showLineNumbers: ZodOptional<ZodBoolean>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
}, $strict>;
declare const PageBreakElementSchema: ZodObject<{
    type: ZodLiteral<"page-break">;
}, $strict>;
declare const DividerElementSchema: ZodObject<{
    type: ZodLiteral<"divider">;
    style: ZodOptional<ZodEnum<{
        solid: "solid";
        dashed: "dashed";
        dotted: "dotted";
        double: "double";
    }>>;
    color: ZodOptional<ZodString>;
    thickness: ZodOptional<ZodNumber>;
}, $strict>;
interface DocxElementInput {
    type: string;
    [key: string]: unknown;
}
declare const DocxElementSchema: ZodType<DocxElementInput>;
declare const HeaderFooterDefSchema: ZodObject<{
    content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
    text: ZodOptional<ZodString>;
    style: ZodOptional<ZodObject<{
        color: ZodOptional<ZodString>;
        fontFamily: ZodOptional<ZodString>;
        fontSize: ZodOptional<ZodCustom<number, number>>;
        fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
            normal: "normal";
            bold: "bold";
        }>, ZodNumber]>>;
        fontStyle: ZodOptional<ZodEnum<{
            normal: "normal";
            italic: "italic";
        }>>;
        textDecoration: ZodOptional<ZodEnum<{
            none: "none";
            underline: "underline";
            "line-through": "line-through";
            "underline line-through": "underline line-through";
        }>>;
        backgroundColor: ZodOptional<ZodString>;
        border: ZodOptional<ZodObject<{
            width: ZodDefault<ZodNumber>;
            color: ZodDefault<ZodString>;
            style: ZodDefault<ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                double: "double";
                none: "none";
            }>>;
        }, $strip>>;
        padding: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        margin: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        textAlign: ZodOptional<ZodEnum<{
            right: "right";
            left: "left";
            center: "center";
            justify: "justify";
        }>>;
        lineHeight: ZodOptional<ZodNumber>;
        opacity: ZodOptional<ZodNumber>;
        comment: ZodOptional<ZodObject<{
            id: ZodOptional<ZodNumber>;
            parentId: ZodOptional<ZodNumber>;
            text: ZodString;
            author: ZodOptional<ZodString>;
            initials: ZodOptional<ZodString>;
            date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
            done: ZodOptional<ZodBoolean>;
        }, $strip>>;
    }, $strict>>;
    includePageNumber: ZodOptional<ZodBoolean>;
    pageNumberFormat: ZodOptional<ZodEnum<{
        letter: "letter";
        roman: "roman";
        decimal: "decimal";
        romanUpper: "romanUpper";
        letterUpper: "letterUpper";
    }>>;
}, $strip>;
declare const DocxPageSchema: ZodObject<{
    elements: ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>;
    sectionBreak: ZodOptional<ZodEnum<{
        nextPage: "nextPage";
        continuous: "continuous";
        evenPage: "evenPage";
        oddPage: "oddPage";
    }>>;
    header: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    footer: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    headerFooter: ZodOptional<ZodObject<{
        header: ZodOptional<ZodObject<{
            content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            text: ZodOptional<ZodString>;
            style: ZodOptional<ZodObject<{
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                backgroundColor: ZodOptional<ZodString>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                margin: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
                lineHeight: ZodOptional<ZodNumber>;
                opacity: ZodOptional<ZodNumber>;
                comment: ZodOptional<ZodObject<{
                    id: ZodOptional<ZodNumber>;
                    parentId: ZodOptional<ZodNumber>;
                    text: ZodString;
                    author: ZodOptional<ZodString>;
                    initials: ZodOptional<ZodString>;
                    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                    done: ZodOptional<ZodBoolean>;
                }, $strip>>;
            }, $strict>>;
            includePageNumber: ZodOptional<ZodBoolean>;
            pageNumberFormat: ZodOptional<ZodEnum<{
                letter: "letter";
                roman: "roman";
                decimal: "decimal";
                romanUpper: "romanUpper";
                letterUpper: "letterUpper";
            }>>;
        }, $strip>>;
        footer: ZodOptional<ZodObject<{
            content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            text: ZodOptional<ZodString>;
            style: ZodOptional<ZodObject<{
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                backgroundColor: ZodOptional<ZodString>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                margin: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
                lineHeight: ZodOptional<ZodNumber>;
                opacity: ZodOptional<ZodNumber>;
                comment: ZodOptional<ZodObject<{
                    id: ZodOptional<ZodNumber>;
                    parentId: ZodOptional<ZodNumber>;
                    text: ZodString;
                    author: ZodOptional<ZodString>;
                    initials: ZodOptional<ZodString>;
                    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                    done: ZodOptional<ZodBoolean>;
                }, $strip>>;
            }, $strict>>;
            includePageNumber: ZodOptional<ZodBoolean>;
            pageNumberFormat: ZodOptional<ZodEnum<{
                letter: "letter";
                roman: "roman";
                decimal: "decimal";
                romanUpper: "romanUpper";
                letterUpper: "letterUpper";
            }>>;
        }, $strip>>;
    }, $strip>>;
    dimensions: ZodOptional<ZodObject<{
        width: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        orientation: ZodOptional<ZodEnum<{
            portrait: "portrait";
            landscape: "landscape";
        }>>;
    }, $strip>>;
}, $strict>;
declare const DocxThemeSchema: ZodObject<{
    preset: ZodOptional<ZodEnum<{
        modern: "modern";
        minimal: "minimal";
        corporate: "corporate";
        classic: "classic";
        academic: "academic";
        dark: "dark";
    }>>;
    colors: ZodOptional<ZodObject<{
        primary: ZodOptional<ZodString>;
        secondary: ZodOptional<ZodString>;
        accent: ZodOptional<ZodString>;
        text: ZodOptional<ZodString>;
        background: ZodOptional<ZodString>;
    }, $strip>>;
    fonts: ZodOptional<ZodObject<{
        heading: ZodOptional<ZodString>;
        body: ZodOptional<ZodString>;
        monospace: ZodOptional<ZodString>;
    }, $strip>>;
}, $strip>;
declare const DocxTemplateSchema: ZodOptional<ZodEnum<{
    letter: "letter";
    blank: "blank";
    report: "report";
    memo: "memo";
    invoice: "invoice";
    proposal: "proposal";
    resume: "resume";
    newsletter: "newsletter";
    manual: "manual";
    thesis: "thesis";
}>>;
declare const TableOfContentsSchema: ZodObject<{
    title: ZodOptional<ZodString>;
    maxLevel: ZodDefault<ZodNumber>;
    showPageNumbers: ZodOptional<ZodBoolean>;
    hyperlinks: ZodOptional<ZodBoolean>;
    leader: ZodOptional<ZodEnum<{
        none: "none";
        dot: "dot";
        dash: "dash";
        underscore: "underscore";
    }>>;
    position: ZodOptional<ZodEnum<{
        start: "start";
        "after-cover": "after-cover";
    }>>;
}, $strip>;
declare const DocxDocumentSchema: ZodObject<{
    type: ZodDefault<ZodLiteral<"DocxDocument">>;
    metadata: ZodOptional<ZodObject<{
        title: ZodOptional<ZodString>;
        author: ZodOptional<ZodString>;
        subject: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
        creator: ZodOptional<ZodString>;
        custom: ZodOptional<ZodRecord<ZodString, ZodString>>;
        language: ZodOptional<ZodString>;
    }, $strip>>;
    accessible: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodObject<{
        level: ZodDefault<ZodEnum<{
            A: "A";
            AA: "AA";
            AAA: "AAA";
        }>>;
        language: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
        enforceHeadingHierarchy: ZodOptional<ZodBoolean>;
        enforceTableHeaders: ZodOptional<ZodBoolean>;
    }, $strict>]>>;
    pageSize: ZodDefault<ZodEnum<{
        letter: "letter";
        a4: "a4";
        legal: "legal";
        a3: "a3";
        a5: "a5";
    }>>;
    orientation: ZodDefault<ZodEnum<{
        portrait: "portrait";
        landscape: "landscape";
    }>>;
    margins: ZodOptional<ZodObject<{
        top: ZodDefault<ZodNumber>;
        right: ZodDefault<ZodNumber>;
        bottom: ZodDefault<ZodNumber>;
        left: ZodDefault<ZodNumber>;
    }, $strip>>;
    theme: ZodOptional<ZodObject<{
        preset: ZodOptional<ZodEnum<{
            modern: "modern";
            minimal: "minimal";
            corporate: "corporate";
            classic: "classic";
            academic: "academic";
            dark: "dark";
        }>>;
        colors: ZodOptional<ZodObject<{
            primary: ZodOptional<ZodString>;
            secondary: ZodOptional<ZodString>;
            accent: ZodOptional<ZodString>;
            text: ZodOptional<ZodString>;
            background: ZodOptional<ZodString>;
        }, $strip>>;
        fonts: ZodOptional<ZodObject<{
            heading: ZodOptional<ZodString>;
            body: ZodOptional<ZodString>;
            monospace: ZodOptional<ZodString>;
        }, $strip>>;
    }, $strip>>;
    template: ZodOptional<ZodEnum<{
        letter: "letter";
        blank: "blank";
        report: "report";
        memo: "memo";
        invoice: "invoice";
        proposal: "proposal";
        resume: "resume";
        newsletter: "newsletter";
        manual: "manual";
        thesis: "thesis";
    }>>;
    tableOfContents: ZodOptional<ZodUnion<readonly [ZodBoolean, ZodObject<{
        title: ZodOptional<ZodString>;
        maxLevel: ZodDefault<ZodNumber>;
        showPageNumbers: ZodOptional<ZodBoolean>;
        hyperlinks: ZodOptional<ZodBoolean>;
        leader: ZodOptional<ZodEnum<{
            none: "none";
            dot: "dot";
            dash: "dash";
            underscore: "underscore";
        }>>;
        position: ZodOptional<ZodEnum<{
            start: "start";
            "after-cover": "after-cover";
        }>>;
    }, $strip>]>>;
    header: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    footer: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    differentFirstPage: ZodOptional<ZodBoolean>;
    firstPageHeader: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    firstPageFooter: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    oddPageHeader: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    oddPageFooter: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    evenPageHeader: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    evenPageFooter: ZodOptional<ZodObject<{
        content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
        text: ZodOptional<ZodString>;
        style: ZodOptional<ZodObject<{
            color: ZodOptional<ZodString>;
            fontFamily: ZodOptional<ZodString>;
            fontSize: ZodOptional<ZodCustom<number, number>>;
            fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                normal: "normal";
                bold: "bold";
            }>, ZodNumber]>>;
            fontStyle: ZodOptional<ZodEnum<{
                normal: "normal";
                italic: "italic";
            }>>;
            textDecoration: ZodOptional<ZodEnum<{
                none: "none";
                underline: "underline";
                "line-through": "line-through";
                "underline line-through": "underline line-through";
            }>>;
            backgroundColor: ZodOptional<ZodString>;
            border: ZodOptional<ZodObject<{
                width: ZodDefault<ZodNumber>;
                color: ZodDefault<ZodString>;
                style: ZodDefault<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                    double: "double";
                    none: "none";
                }>>;
            }, $strip>>;
            padding: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            margin: ZodOptional<ZodObject<{
                top: ZodDefault<ZodNumber>;
                right: ZodDefault<ZodNumber>;
                bottom: ZodDefault<ZodNumber>;
                left: ZodDefault<ZodNumber>;
            }, $strip>>;
            textAlign: ZodOptional<ZodEnum<{
                right: "right";
                left: "left";
                center: "center";
                justify: "justify";
            }>>;
            lineHeight: ZodOptional<ZodNumber>;
            opacity: ZodOptional<ZodNumber>;
            comment: ZodOptional<ZodObject<{
                id: ZodOptional<ZodNumber>;
                parentId: ZodOptional<ZodNumber>;
                text: ZodString;
                author: ZodOptional<ZodString>;
                initials: ZodOptional<ZodString>;
                date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                done: ZodOptional<ZodBoolean>;
            }, $strip>>;
        }, $strict>>;
        includePageNumber: ZodOptional<ZodBoolean>;
        pageNumberFormat: ZodOptional<ZodEnum<{
            letter: "letter";
            roman: "roman";
            decimal: "decimal";
            romanUpper: "romanUpper";
            letterUpper: "letterUpper";
        }>>;
    }, $strip>>;
    watermark: ZodOptional<ZodUnion<readonly [ZodString, ZodObject<{
        text: ZodOptional<ZodString>;
        image: ZodOptional<ZodString>;
        opacity: ZodDefault<ZodNumber>;
        rotation: ZodDefault<ZodNumber>;
    }, $strip>]>>;
    revisionInfo: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        date: ZodOptional<ZodString>;
        rsid: ZodOptional<ZodString>;
    }, $strip>>;
    pages: ZodArray<ZodObject<{
        elements: ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>;
        sectionBreak: ZodOptional<ZodEnum<{
            nextPage: "nextPage";
            continuous: "continuous";
            evenPage: "evenPage";
            oddPage: "oddPage";
        }>>;
        header: ZodOptional<ZodObject<{
            content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            text: ZodOptional<ZodString>;
            style: ZodOptional<ZodObject<{
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                backgroundColor: ZodOptional<ZodString>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                margin: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
                lineHeight: ZodOptional<ZodNumber>;
                opacity: ZodOptional<ZodNumber>;
                comment: ZodOptional<ZodObject<{
                    id: ZodOptional<ZodNumber>;
                    parentId: ZodOptional<ZodNumber>;
                    text: ZodString;
                    author: ZodOptional<ZodString>;
                    initials: ZodOptional<ZodString>;
                    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                    done: ZodOptional<ZodBoolean>;
                }, $strip>>;
            }, $strict>>;
            includePageNumber: ZodOptional<ZodBoolean>;
            pageNumberFormat: ZodOptional<ZodEnum<{
                letter: "letter";
                roman: "roman";
                decimal: "decimal";
                romanUpper: "romanUpper";
                letterUpper: "letterUpper";
            }>>;
        }, $strip>>;
        footer: ZodOptional<ZodObject<{
            content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
            text: ZodOptional<ZodString>;
            style: ZodOptional<ZodObject<{
                color: ZodOptional<ZodString>;
                fontFamily: ZodOptional<ZodString>;
                fontSize: ZodOptional<ZodCustom<number, number>>;
                fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                    normal: "normal";
                    bold: "bold";
                }>, ZodNumber]>>;
                fontStyle: ZodOptional<ZodEnum<{
                    normal: "normal";
                    italic: "italic";
                }>>;
                textDecoration: ZodOptional<ZodEnum<{
                    none: "none";
                    underline: "underline";
                    "line-through": "line-through";
                    "underline line-through": "underline line-through";
                }>>;
                backgroundColor: ZodOptional<ZodString>;
                border: ZodOptional<ZodObject<{
                    width: ZodDefault<ZodNumber>;
                    color: ZodDefault<ZodString>;
                    style: ZodDefault<ZodEnum<{
                        solid: "solid";
                        dashed: "dashed";
                        dotted: "dotted";
                        double: "double";
                        none: "none";
                    }>>;
                }, $strip>>;
                padding: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                margin: ZodOptional<ZodObject<{
                    top: ZodDefault<ZodNumber>;
                    right: ZodDefault<ZodNumber>;
                    bottom: ZodDefault<ZodNumber>;
                    left: ZodDefault<ZodNumber>;
                }, $strip>>;
                textAlign: ZodOptional<ZodEnum<{
                    right: "right";
                    left: "left";
                    center: "center";
                    justify: "justify";
                }>>;
                lineHeight: ZodOptional<ZodNumber>;
                opacity: ZodOptional<ZodNumber>;
                comment: ZodOptional<ZodObject<{
                    id: ZodOptional<ZodNumber>;
                    parentId: ZodOptional<ZodNumber>;
                    text: ZodString;
                    author: ZodOptional<ZodString>;
                    initials: ZodOptional<ZodString>;
                    date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                    done: ZodOptional<ZodBoolean>;
                }, $strip>>;
            }, $strict>>;
            includePageNumber: ZodOptional<ZodBoolean>;
            pageNumberFormat: ZodOptional<ZodEnum<{
                letter: "letter";
                roman: "roman";
                decimal: "decimal";
                romanUpper: "romanUpper";
                letterUpper: "letterUpper";
            }>>;
        }, $strip>>;
        headerFooter: ZodOptional<ZodObject<{
            header: ZodOptional<ZodObject<{
                content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
                text: ZodOptional<ZodString>;
                style: ZodOptional<ZodObject<{
                    color: ZodOptional<ZodString>;
                    fontFamily: ZodOptional<ZodString>;
                    fontSize: ZodOptional<ZodCustom<number, number>>;
                    fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                        normal: "normal";
                        bold: "bold";
                    }>, ZodNumber]>>;
                    fontStyle: ZodOptional<ZodEnum<{
                        normal: "normal";
                        italic: "italic";
                    }>>;
                    textDecoration: ZodOptional<ZodEnum<{
                        none: "none";
                        underline: "underline";
                        "line-through": "line-through";
                        "underline line-through": "underline line-through";
                    }>>;
                    backgroundColor: ZodOptional<ZodString>;
                    border: ZodOptional<ZodObject<{
                        width: ZodDefault<ZodNumber>;
                        color: ZodDefault<ZodString>;
                        style: ZodDefault<ZodEnum<{
                            solid: "solid";
                            dashed: "dashed";
                            dotted: "dotted";
                            double: "double";
                            none: "none";
                        }>>;
                    }, $strip>>;
                    padding: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    margin: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    textAlign: ZodOptional<ZodEnum<{
                        right: "right";
                        left: "left";
                        center: "center";
                        justify: "justify";
                    }>>;
                    lineHeight: ZodOptional<ZodNumber>;
                    opacity: ZodOptional<ZodNumber>;
                    comment: ZodOptional<ZodObject<{
                        id: ZodOptional<ZodNumber>;
                        parentId: ZodOptional<ZodNumber>;
                        text: ZodString;
                        author: ZodOptional<ZodString>;
                        initials: ZodOptional<ZodString>;
                        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                        done: ZodOptional<ZodBoolean>;
                    }, $strip>>;
                }, $strict>>;
                includePageNumber: ZodOptional<ZodBoolean>;
                pageNumberFormat: ZodOptional<ZodEnum<{
                    letter: "letter";
                    roman: "roman";
                    decimal: "decimal";
                    romanUpper: "romanUpper";
                    letterUpper: "letterUpper";
                }>>;
            }, $strip>>;
            footer: ZodOptional<ZodObject<{
                content: ZodOptional<ZodLazy<ZodArray<ZodType<DocxElementInput, unknown, $ZodTypeInternals<DocxElementInput, unknown>>>>>;
                text: ZodOptional<ZodString>;
                style: ZodOptional<ZodObject<{
                    color: ZodOptional<ZodString>;
                    fontFamily: ZodOptional<ZodString>;
                    fontSize: ZodOptional<ZodCustom<number, number>>;
                    fontWeight: ZodOptional<ZodUnion<readonly [ZodEnum<{
                        normal: "normal";
                        bold: "bold";
                    }>, ZodNumber]>>;
                    fontStyle: ZodOptional<ZodEnum<{
                        normal: "normal";
                        italic: "italic";
                    }>>;
                    textDecoration: ZodOptional<ZodEnum<{
                        none: "none";
                        underline: "underline";
                        "line-through": "line-through";
                        "underline line-through": "underline line-through";
                    }>>;
                    backgroundColor: ZodOptional<ZodString>;
                    border: ZodOptional<ZodObject<{
                        width: ZodDefault<ZodNumber>;
                        color: ZodDefault<ZodString>;
                        style: ZodDefault<ZodEnum<{
                            solid: "solid";
                            dashed: "dashed";
                            dotted: "dotted";
                            double: "double";
                            none: "none";
                        }>>;
                    }, $strip>>;
                    padding: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    margin: ZodOptional<ZodObject<{
                        top: ZodDefault<ZodNumber>;
                        right: ZodDefault<ZodNumber>;
                        bottom: ZodDefault<ZodNumber>;
                        left: ZodDefault<ZodNumber>;
                    }, $strip>>;
                    textAlign: ZodOptional<ZodEnum<{
                        right: "right";
                        left: "left";
                        center: "center";
                        justify: "justify";
                    }>>;
                    lineHeight: ZodOptional<ZodNumber>;
                    opacity: ZodOptional<ZodNumber>;
                    comment: ZodOptional<ZodObject<{
                        id: ZodOptional<ZodNumber>;
                        parentId: ZodOptional<ZodNumber>;
                        text: ZodString;
                        author: ZodOptional<ZodString>;
                        initials: ZodOptional<ZodString>;
                        date: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
                        done: ZodOptional<ZodBoolean>;
                    }, $strip>>;
                }, $strict>>;
                includePageNumber: ZodOptional<ZodBoolean>;
                pageNumberFormat: ZodOptional<ZodEnum<{
                    letter: "letter";
                    roman: "roman";
                    decimal: "decimal";
                    romanUpper: "romanUpper";
                    letterUpper: "letterUpper";
                }>>;
            }, $strip>>;
        }, $strip>>;
        dimensions: ZodOptional<ZodObject<{
            width: ZodOptional<ZodNumber>;
            height: ZodOptional<ZodNumber>;
            orientation: ZodOptional<ZodEnum<{
                portrait: "portrait";
                landscape: "landscape";
            }>>;
        }, $strip>>;
    }, $strict>>;
    options: ZodOptional<ZodObject<{
        trackChanges: ZodOptional<ZodBoolean>;
        columns: ZodOptional<ZodNumber>;
        footnoteStyle: ZodOptional<ZodEnum<{
            roman: "roman";
            numeric: "numeric";
            alphabetic: "alphabetic";
        }>>;
        pagination: ZodOptional<ZodEnum<{
            preserve: "preserve";
            reflow: "reflow";
        }>>;
    }, $strip>>;
}, $strict>;
declare const HtmlDocxOptionsSchema: ZodOptional<ZodObject<{
    docxOptions: ZodOptional<ZodObject<{
        pageSize: ZodOptional<ZodEnum<{
            letter: "letter";
            a4: "a4";
            legal: "legal";
            a3: "a3";
            a5: "a5";
        }>>;
        orientation: ZodOptional<ZodEnum<{
            portrait: "portrait";
            landscape: "landscape";
        }>>;
        margins: ZodOptional<ZodObject<{
            top: ZodDefault<ZodNumber>;
            right: ZodDefault<ZodNumber>;
            bottom: ZodDefault<ZodNumber>;
            left: ZodDefault<ZodNumber>;
        }, $strip>>;
        defaultFont: ZodOptional<ZodString>;
        defaultFontSize: ZodOptional<ZodNumber>;
    }, $strip>>;
    imageOptions: ZodOptional<ZodObject<{
        fetchTimeout: ZodOptional<ZodNumber>;
        maxImageSize: ZodOptional<ZodNumber>;
        defaultWidth: ZodOptional<ZodNumber>;
    }, $strip>>;
    cssMode: ZodOptional<ZodEnum<{
        inline: "inline";
        ignore: "ignore";
    }>>;
    baseUrl: ZodOptional<ZodString>;
}, $strip>>;
type HtmlDocxOptions = output<typeof HtmlDocxOptionsSchema>;
type ParsedDocxDocument = output<typeof DocxDocumentSchema>;
/**
 * Public input contract. The parser materializes `orientation: "portrait"`,
 * but callers may omit it just as they can in JSON input.
 */
type DocxDocument = Omit<ParsedDocxDocument, 'orientation'> & {
    orientation?: ParsedDocxDocument['orientation'];
};
type DocxElement = output<typeof DocxElementSchema>;
type DocxPage = output<typeof DocxPageSchema>;
type DocxTheme = output<typeof DocxThemeSchema>;
type DocxTextRun = output<typeof TextRunSchema>;
type DocxRevisionInfo = output<typeof RevisionInfoSchema>;
type HeaderFooterDef = output<typeof HeaderFooterDefSchema>;
declare const BatchOptionsSchema: ZodObject<{
    output: ZodDefault<ZodEnum<{
        buffers: "buffers";
        zip: "zip";
    }>>;
    concurrency: ZodDefault<ZodNumber>;
    stream: ZodDefault<ZodBoolean>;
}, $strip>;

/**
 * Central registry of public-facing warning / issue codes.
 *
 * Every code that surfaces to consumers through `DocxWarning.code`,
 * `DocxInputWarning.code`, or the public `ValidationIssue.code`
 * (from `validateDocxDocument()`) must be declared here.
 *
 * Not covered by this registry: subsystems that surface their own typed
 * code streams (accessibility `DocxAccessibilityViolationCode`, internal
 * `vlt-validator` issues, internal `DOCXWarningCode` factory codes).
 * Those have their own enums in their own modules — isolation by design.
 *
 * Category prefixes (informational — not enforced by the type system):
 *   DOCX_RELAXED_*      — legacy-shape coercions (relaxed-input.ts)
 *   DOCX_VALIDATE_*     — validateDocxDocument() issues
 *   DOCX_SERIALIZER_*   — emitted by the native OOXML serializer
 *   DOCX_HTML_*         — HTML adapter diagnostics
 *   DOCX_PDF_*          — PDF bridge diagnostics
 *   DOCX_HYDRATE_*      — template hydration diagnostics
 */
declare const WARNING_CODES: readonly ["DOCX_RELAXED_THEME_STRING", "DOCX_RELAXED_CODE_BLOCK", "DOCX_RELAXED_MARGIN_TWIPS", "DOCX_RELAXED_PAGE_NUMBERS", "DOCX_RELAXED_META_KEY", "DOCX_RELAXED_CHART_POINTS", "DOCX_RELAXED_KIND_INJECTED", "DOCX_VALIDATE_SCHEMA", "DOCX_VALIDATE_IMAGE_NO_SRC", "DOCX_VALIDATE_TABLE_EMPTY", "DOCX_VALIDATE_CHART_NO_DATA", "DOCX_VALIDATE_HEADING_EMPTY", "DOCX_SERIALIZER_WARNING", "DOCX_STRICT_VALIDATOR_WARNING", "DOCX_HTML_CONVERSION_WARNING", "DOCX_PDF_BRIDGE_FALLBACK", "DOCX_HYDRATE_UNFILLED_PLACEHOLDER", "DOCX_HYDRATE_SPLIT_PLACEHOLDER"];
type DocxWarningCode = (typeof WARNING_CODES)[number];
declare function isDocxWarningCode(value: string): value is DocxWarningCode;
/**
 * Normalize a warning code: canonical codes pass through; known legacy
 * strings are remapped; unknown codes throw (internal bug — a caller
 * added a code without registering it).
 */
declare function resolveDocxWarningCode(code: string): DocxWarningCode;

interface ResourceLimits {
    maxPages: number;
    maxSections: number;
    maxElements: number;
    maxParagraphs: number;
    maxRunsPerParagraph: number;
    maxTextLength: number;
    maxTextNodeChars: number;
    maxFonts: number;
    maxTableColumns: number;
    maxTableNestingDepth: number;
    maxListNestingLevel: number;
    maxImageSizeBytes: number;
    maxTotalMediaBytes: number;
    maxTotalXmlBytes: number;
    maxInputJsonBytes: number;
    maxInputStringBytes: number;
    maxInputBase64Bytes: number;
}

/**
 * Image extraction utilities for DOCX.
 *
 * Extracts image information from StructuredDocument elements.
 * Production-ready with timeout, retry logic, and size limits.
 */

/**
 * Image fetching configuration for production reliability.
 */
interface ImageFetchConfig {
    /** Whether remote http(s) image fetching is allowed (default: false) */
    allowExternal?: boolean;
    /** Timeout in milliseconds for image fetch (default: 10000) */
    timeout?: number;
    /** Number of retry attempts (default: 3) */
    retries?: number;
    /** Maximum HTTP redirects to follow (default: 3) */
    maxRedirects?: number;
    /** Maximum image size in bytes (default: 10MB) */
    maxSize?: number;
    /** Base delay for exponential backoff in ms (default: 1000) */
    retryBaseDelay?: number;
}

/**
 * StructuredDocument Types
 *
 * Intermediate representation consumed by the DOCX serializer.
 * These types represent the bridge between input formats (DocxDocument, PaperDocument)
 * and the OOXML generation layer.
 *
 * Ported from: packages/converter/src/extraction/types.ts
 */

/**
 * Root document containing all pages and shared resources.
 */
interface StructuredDocument {
    /**
     * Kind discriminator. Required; distinguishes a StructuredDocument from
     * a DocxDocument at runtime without relying on duck typing.
     *
     * Legacy callers that construct this object without `__kind` will have
     * it injected by the serializer entry point with a
     * `DOCX_RELAXED_KIND_INJECTED` warning — but new code should always
     * set it explicitly.
     */
    __kind: 'StructuredDocument';
    /** Document metadata (title, author, etc.) */
    metadata: DocumentMetadata$1;
    /** Track changes session metadata */
    revisionInfo?: RevisionInfo;
    /** Pages in document order */
    pages: StructuredPage[];
    /** Shared style definitions */
    styles: StyleDefinitions;
    /** Asset registry (images, fonts, embedded files) */
    assets: AssetRegistry;
    /** Extraction/conversion statistics */
    stats: ExtractionStats;
    /** Warnings encountered during conversion */
    warnings: string[];
    /** Table of Contents configuration */
    toc?: TableOfContentsConfig;
}
/**
 * Table of Contents configuration.
 */
interface TableOfContentsConfig {
    title?: string;
    levels?: number;
    showPageNumbers?: boolean;
    hyperlinks?: boolean;
    leader?: 'dot' | 'dash' | 'underscore' | 'none';
    position?: 'start' | 'after-cover';
}
/**
 * Document metadata.
 */
interface DocumentMetadata$1 {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    /** Custom metadata */
    custom?: Record<string, string>;
    /** BCP 47 language tag (e.g. "en-US", "fr-FR") */
    language?: string;
}
/**
 * Track changes session metadata.
 */
interface RevisionInfo {
    author?: string;
    date?: string;
    rsid?: string;
}
/**
 * A single page/section in the document.
 */
interface StructuredPage {
    /** 1-based page number */
    pageNumber: number;
    /** Page dimensions in CSS pixels */
    dimensions: PageDimensions$1;
    /** Content elements */
    elements: StructuredElement[];
    /** Background color or image */
    background?: Background;
    /** DOCX: Section break before this page */
    sectionBreak?: SectionBreak;
    /** DOCX: Header content */
    header?: HeaderFooterContent;
    /** DOCX: Footer content */
    footer?: HeaderFooterContent;
}
/**
 * Page dimensions and margins.
 */
interface PageDimensions$1 {
    /** Width in CSS pixels */
    width: number;
    /** Height in CSS pixels */
    height: number;
    /** Margins in CSS pixels */
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
/**
 * Union of all element types.
 */
type StructuredElement = HeadingElement | ParagraphElement | TextRunElement | CodeBlockElement | PageBreakElement | DividerElement | TableElement | ImageElement | ChartElement | ShapeElement | ListElement | ContainerElement;
/**
 * Element type discriminator.
 */
type ElementType = 'heading' | 'paragraph' | 'text-run' | 'code-block' | 'page-break' | 'divider' | 'table' | 'image' | 'chart' | 'shape' | 'list' | 'container';
/**
 * Base properties shared by all elements.
 */
interface BaseElement {
    /** Unique element ID */
    id: string;
    /** Element type discriminator */
    type: ElementType;
    /** Bounding box */
    position: BoundingBox;
    /** Z-index (stacking order) */
    zIndex: number;
    /** Opacity (0-1) */
    opacity: number;
    /** Computed styles */
    style: ComputedStyle;
    /** Layout information (CSS Grid, Flexbox, etc.) */
    layout?: ExtractedLayoutInfo;
    /** Original HTML tag name */
    tagName: string;
    /** Data attributes */
    dataAttributes: Record<string, string>;
    /** DOCX-specific hints */
    docx?: DOCXHints$1;
}
/**
 * Bounding box.
 */
interface BoundingBox {
    /** X position relative to page origin */
    x: number;
    /** Y position relative to page origin */
    y: number;
    /** Width in CSS pixels */
    width: number;
    /** Height in CSS pixels */
    height: number;
}
/**
 * Heading element (h1-h6).
 */
interface HeadingElement extends BaseElement {
    type: 'heading';
    /** Heading level (1-6) */
    level: 1 | 2 | 3 | 4 | 5 | 6;
    /** Plain text content */
    text: string;
    /** Formatted text runs */
    runs: TextRun[];
    /** Track changes metadata for paragraph-level revisions */
    revision?: ParagraphRevision$1;
    /** Paragraph-level comment metadata */
    comment?: CommentInfo;
}
/**
 * Paragraph element.
 */
interface ParagraphElement extends BaseElement {
    type: 'paragraph';
    /** Plain text content */
    text: string;
    /** Formatted text runs */
    runs: TextRun[];
    /** Track changes metadata for paragraph-level revisions */
    revision?: ParagraphRevision$1;
    /** Paragraph-level comment metadata */
    comment?: CommentInfo;
}
/**
 * Inline text run (span-level content).
 */
interface TextRunElement extends BaseElement {
    type: 'text-run';
    /** Plain text content */
    text: string;
    /** Formatted text runs */
    runs: TextRun[];
    /** Paragraph-level comment metadata */
    comment?: CommentInfo;
}
/**
 * Code block element.
 */
interface CodeBlockElement extends BaseElement {
    type: 'code-block';
    /** Raw code content */
    code: string;
    /** Optional language identifier */
    language?: string;
    /** Whether line numbers should be shown */
    showLineNumbers?: boolean;
}
/**
 * Explicit page break element.
 */
interface PageBreakElement extends BaseElement {
    type: 'page-break';
}
/**
 * Horizontal divider element.
 */
interface DividerElement extends BaseElement {
    type: 'divider';
    /** Border style */
    styleType?: 'solid' | 'dashed' | 'dotted' | 'double';
    /** Divider color */
    color?: string;
    /** Divider thickness in points */
    thickness?: number;
}
/**
 * Table element with full structure.
 */
interface TableElement extends BaseElement {
    type: 'table';
    /** Visual table preset from the JSON DOCX surface */
    tableStyle?: 'plain' | 'striped' | 'bordered' | 'modern' | 'minimal' | 'corporate';
    /** Column definitions */
    columns: TableColumn[];
    /** All rows (header + body + footer) */
    rows: TableRow[];
    /** Number of header rows (to repeat on page break) */
    headerRowCount: number;
    /** Number of footer rows */
    footerRowCount: number;
    /** Should headers repeat on page breaks */
    repeatHeaders: boolean;
    /** Keep a short table on one page when Word can do so */
    keepTogether?: boolean;
    /** Keep the final table row with the following block when Word can do so */
    keepWithNext?: boolean;
    /** 2D matrix for rowspan/colspan tracking */
    cellMatrix: CellReference[][];
    /** Table caption (if any) */
    caption?: string;
    /** OOXML table description for accessibility (<w:tblDescription>) */
    tableDescription?: string;
    /** OOXML table caption for accessibility (<w:tblCaption>) */
    tableCaption?: string;
    /** Track changes metadata for table-level revisions */
    revision?: TableRevision$1;
}
/**
 * Table column definition.
 */
interface TableColumn {
    /** Column width in CSS pixels */
    width: number;
    /** Minimum width */
    minWidth?: number;
    /** Maximum width */
    maxWidth?: number;
}
/**
 * Table row.
 */
interface TableRow {
    /** Row index (0-based) */
    index: number;
    /** Row height in CSS pixels */
    height: number;
    /** Cells in this row */
    cells: TableCell[];
    /** Is this a header row */
    isHeader: boolean;
    /** Is this a footer row */
    isFooter: boolean;
    /** Track changes metadata for row structural revisions */
    revision?: TableRowRevision;
}
/**
 * Table cell.
 */
interface TableCell {
    /** Cell position in grid */
    row: number;
    col: number;
    /** Span counts */
    rowSpan: number;
    colSpan: number;
    /** Cell content (text runs) */
    content: TextRun[];
    /** Plain text content */
    text: string;
    /** Rich block content for nested tables or structured cell bodies */
    elements?: StructuredElement[];
    /** Cell-specific styles */
    style: CellStyle;
    /** Is this a header cell (th) */
    isHeader: boolean;
    /** Track changes metadata for cell structural revisions */
    revision?: TableCellRevision$1;
}
/**
 * Cell reference in the matrix (for rowspan/colspan tracking).
 */
interface CellReference {
    /** Origin row of the cell */
    originRow: number;
    /** Origin column of the cell */
    originCol: number;
    /** Is this the origin position */
    isOrigin: boolean;
    /** Reference to the actual cell */
    cell: TableCell;
}
/**
 * Cell-specific styles.
 */
interface CellStyle {
    /** Background color */
    backgroundColor?: string;
    /** Text color */
    color?: string;
    /** Font family */
    fontFamily?: string;
    /** Font size */
    fontSize?: number;
    /** Font weight */
    fontWeight?: string;
    /** Border styles */
    borderTop?: BorderStyle;
    borderRight?: BorderStyle;
    borderBottom?: BorderStyle;
    borderLeft?: BorderStyle;
    /** Padding */
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    /** Vertical alignment */
    verticalAlign: 'top' | 'middle' | 'bottom';
    /** Text alignment */
    textAlign: 'left' | 'center' | 'right' | 'justify';
}
/**
 * Image element.
 */
interface ImageElement extends BaseElement {
    type: 'image';
    /** Image source (URL, data URI, or asset reference) */
    src: string;
    /** Binary image data, used when the public input provided a Buffer */
    binaryData?: Buffer;
    /** Alternative text */
    alt: string;
    /** Natural dimensions (if available) */
    naturalWidth?: number;
    naturalHeight?: number;
    /** Asset ID (if registered in AssetRegistry) */
    assetId?: string;
    /** Image fit mode */
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    /** Whether the image is decorative (no alt text needed for screen readers) */
    decorative?: boolean;
}
/**
 * Chart element.
 */
interface ChartElement extends BaseElement {
    type: 'chart';
    /** Chart type */
    chartType: ChartType$1;
    /** Chart title */
    title?: string;
    /** Data series */
    series: ChartSeries[];
    /** Category labels (X-axis) */
    categories?: string[];
    /** Legend configuration */
    legend?: LegendConfig;
    /** Axes configuration */
    axes?: AxesConfig;
    /** For Office formats: should embed Excel data */
    embedData: boolean;
}
/**
 * Supported chart types.
 */
type ChartType$1 = 'bar' | 'column' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar';
/**
 * Chart data series.
 */
interface ChartSeries {
    /** Series name */
    name: string;
    /** Data values */
    values: number[];
    /** Series color */
    color?: string;
}
/**
 * Shape element.
 */
interface ShapeElement extends BaseElement {
    type: 'shape';
    /** Shape type */
    shapeType: ShapeType;
    /** Fill color or gradient */
    fill?: FillStyle;
    /** Stroke/outline */
    stroke?: StrokeStyle;
    /** Text content (if shape contains text) */
    text?: string;
    /** Text runs (if shape contains formatted text) */
    runs?: TextRun[];
    /** Custom path data (for custom shapes) */
    pathData?: string;
}
/**
 * Supported shape types.
 */
type ShapeType = 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'line' | 'custom';
/**
 * List element (ul/ol).
 */
interface ListElement extends BaseElement {
    type: 'list';
    /** List type */
    listType: 'bullet' | 'number' | 'letter' | 'roman';
    /** Starting number (for numbered lists) */
    start: number;
    /** List items */
    items: ListItem[];
    /** Nesting level (0 = top level) */
    level: number;
}
/**
 * List item.
 */
interface ListItem {
    /** Item content (text runs) */
    content: TextRun[];
    /** Plain text */
    text: string;
    /** Nested list (if any) */
    nestedList?: ListElement;
}
/**
 * Container element (div, section, etc.).
 */
interface ContainerElement extends BaseElement {
    type: 'container';
    /** Keep a bounded vertical group on one page when Word can do so */
    keepTogether?: boolean;
    /** Child elements */
    children: StructuredElement[];
}
/**
 * A run of text with consistent formatting.
 */
interface TextRun {
    /** Text content */
    text: string;
    /** Font family */
    fontFamily: string;
    /** Font size in points */
    fontSize: number;
    /** Font weight */
    fontWeight: 'normal' | 'bold' | number;
    /** Font style */
    fontStyle: 'normal' | 'italic';
    /** Text decoration */
    textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through';
    /** Text color (hex) */
    color: string;
    /** Background/highlight color */
    backgroundColor?: string;
    /** Hyperlink URL */
    link?: string;
    /** Superscript */
    superscript?: boolean;
    /** Subscript */
    subscript?: boolean;
    /** Track changes metadata */
    revision?: TextRunRevision;
}
/**
 * Run style snapshot used for formatting revisions.
 */
interface TextRunStyleSnapshot {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | number;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    color?: string;
    backgroundColor?: string;
    superscript?: boolean;
    subscript?: boolean;
    letterSpacing?: number;
}
/**
 * Track changes metadata attached to a text run.
 */
interface TextRunRevision {
    type: 'insert' | 'delete' | 'format';
    id?: number;
    author?: string;
    date?: string;
    beforeStyle?: TextRunStyleSnapshot;
}
/**
 * Base metadata shared by non-run tracked-change records.
 */
interface BaseRevisionMetadata {
    id?: number;
    author?: string;
    date?: string;
}
/**
 * Snapshot of paragraph properties for paragraph property revisions.
 */
interface ParagraphRevisionProperties$1 {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    keepLines?: boolean;
    keepNext?: boolean;
    pageBreakBefore?: boolean;
    indent?: {
        firstLine?: number;
        left?: number;
        right?: number;
    };
}
/**
 * Track changes metadata attached to a paragraph-level element.
 */
interface ParagraphRevision$1 extends BaseRevisionMetadata {
    type: 'insert' | 'delete' | 'property' | 'moveFrom' | 'moveTo';
    moveName?: string;
    before?: ParagraphRevisionProperties$1;
}
/**
 * Snapshot of table-level properties for table property revisions.
 */
interface TableRevisionProperties$1 {
    caption?: string;
    tableDescription?: string;
    tableCaption?: string;
}
/**
 * Track changes metadata attached to a table element.
 */
interface TableRevision$1 extends BaseRevisionMetadata {
    type: 'property';
    before?: TableRevisionProperties$1;
}
/**
 * Track changes metadata attached to a table cell.
 */
interface TableCellRevision$1 extends BaseRevisionMetadata {
    type: 'insert' | 'delete';
}
/**
 * Track changes metadata attached to a table row.
 */
interface TableRowRevision extends BaseRevisionMetadata {
    type: 'insert' | 'delete';
}
/**
 * Computed styles.
 */
interface ComputedStyle {
    backgroundColor?: string;
    backgroundImage?: string;
    borderTopWidth: number;
    borderTopColor: string;
    borderTopStyle: string;
    borderRightWidth: number;
    borderRightColor: string;
    borderRightStyle: string;
    borderBottomWidth: number;
    borderBottomColor: string;
    borderBottomStyle: string;
    borderLeftWidth: number;
    borderLeftColor: string;
    borderLeftStyle: string;
    borderRadius: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    lineHeight: number;
    letterSpacing: number;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    textDecoration: string;
    color: string;
    display: string;
    visibility: string;
    overflow: string;
    boxShadow?: string;
    opacity: number;
    transform?: string;
}
/**
 * Border style definition.
 */
interface BorderStyle {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
}
/**
 * Fill style (solid or gradient).
 */
interface FillStyle {
    type: 'solid' | 'gradient';
    color?: string;
    gradient?: GradientDefinition;
}
/**
 * Gradient definition.
 */
interface GradientDefinition {
    type: 'linear' | 'radial';
    angle?: number;
    stops: GradientStop$1[];
}
/**
 * Gradient stop.
 */
interface GradientStop$1 {
    color: string;
    position: number;
}
/**
 * Stroke/outline style.
 */
interface StrokeStyle {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
}
/**
 * DOCX-specific hints.
 */
interface DOCXHints$1 {
    /** Word style ID */
    styleId?: string;
    /** Paragraph style ID */
    paragraphStyleId?: string;
    /** Heading level for outline */
    outlineLevel?: number;
    /** List numbering info */
    listInfo?: ListNumberingInfo;
    /** Bookmark ID */
    bookmarkId?: string;
    /** Keep lines together */
    keepLines?: boolean;
    /** Keep with next paragraph */
    keepNext?: boolean;
    /** Page break before */
    pageBreakBefore?: boolean;
    /** Explicit paragraph indentation in points */
    indent?: {
        firstLine?: number;
        left?: number;
        right?: number;
    };
    /** Footnote content */
    footnote?: string;
    /** Endnote content */
    endnote?: string;
    /** Comment */
    comment?: CommentInfo;
}
/**
 * List numbering info for DOCX.
 */
interface ListNumberingInfo {
    /** Numbering definition ID */
    numId: number;
    /** Indent level */
    level: number;
}
/**
 * Comment info for DOCX.
 */
interface CommentInfo {
    id?: number;
    parentId?: number;
    text: string;
    author?: string;
    initials?: string;
    date?: Date | string;
    done?: boolean;
}
/**
 * Asset registry for images, fonts, embedded files.
 */
interface AssetRegistry {
    /** Images by ID */
    images: Map<string, ImageAsset>;
    /** Fonts by family name */
    fonts: Map<string, FontAsset>;
    /** Embedded files by ID */
    embeddedFiles: Map<string, EmbeddedFile>;
}
/**
 * Image asset.
 */
interface ImageAsset {
    id: string;
    src: string;
    mimeType: string;
    width: number;
    height: number;
    data?: ArrayBuffer;
}
/**
 * Font asset.
 */
interface FontAsset {
    family: string;
    src: string;
    weight?: string;
    style?: string;
    data?: ArrayBuffer;
}
/**
 * Embedded file (for charts with Excel data, etc.).
 */
interface EmbeddedFile {
    id: string;
    name: string;
    mimeType: string;
    data: ArrayBuffer;
}
/**
 * Shared style definitions.
 */
interface StyleDefinitions {
    /** Named paragraph styles */
    paragraphStyles: Map<string, ParagraphStyleDef>;
    /** Named character styles */
    characterStyles: Map<string, CharacterStyleDef>;
    /** Table styles */
    tableStyles: Map<string, TableStyleDef>;
}
/**
 * Paragraph style definition.
 */
interface ParagraphStyleDef {
    name: string;
    basedOn?: string;
    nextStyle?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    lineHeight?: number;
    spacingBefore?: number;
    spacingAfter?: number;
    textAlign?: string;
    color?: string;
}
/**
 * Character style definition.
 */
interface CharacterStyleDef {
    name: string;
    basedOn?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    textDecoration?: string;
}
/**
 * Table style definition.
 */
interface TableStyleDef {
    name: string;
    borderColor?: string;
    borderWidth?: number;
    headerBackground?: string;
    alternateRowBackground?: string;
}
/**
 * Background definition.
 */
interface Background {
    type: 'color' | 'image' | 'gradient';
    color?: string;
    image?: string;
    gradient?: GradientDefinition;
}
/**
 * Section break for DOCX.
 */
interface SectionBreak {
    type: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
}
/**
 * Header/footer content.
 */
interface HeaderFooterContent {
    /** Content elements */
    elements: StructuredElement[];
    /** First-page content elements, when differentFirst is enabled */
    firstElements?: StructuredElement[];
    /** Even-page content elements, when differentOddEven is enabled */
    evenElements?: StructuredElement[];
    /** Different first page */
    differentFirst?: boolean;
    /** Different odd/even pages */
    differentOddEven?: boolean;
}
/**
 * Legend configuration for charts.
 */
interface LegendConfig {
    position: 'top' | 'bottom' | 'left' | 'right' | 'none';
    entries?: string[];
}
/**
 * Axes configuration for charts.
 */
interface AxesConfig {
    xAxis?: AxisConfig;
    yAxis?: AxisConfig;
}
/**
 * Single axis configuration.
 */
interface AxisConfig {
    title?: string;
    min?: number;
    max?: number;
    gridLines?: boolean;
}
/**
 * CSS Grid position for a child element within a grid container.
 */
interface GridPosition {
    columnStart: number;
    columnEnd: number;
    rowStart: number;
    rowEnd: number;
}
/**
 * Parsed grid track (column or row) definition.
 */
interface GridTrack {
    type: 'fr' | 'px' | 'percent' | 'auto' | 'min-content' | 'max-content';
    value: number;
    computedSize?: number;
}
/**
 * Layout semantic information.
 */
interface ExtractedLayoutInfo {
    type: 'block' | 'flex' | 'grid' | 'inline' | 'inline-flex' | 'inline-grid' | 'none';
    flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
    flexGap?: number;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: string;
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    order?: number;
    gridTemplateColumns?: GridTrack[];
    gridTemplateRows?: GridTrack[];
    gridColumnGap?: number;
    gridRowGap?: number;
    gridTemplateColumnsRaw?: string;
    gridTemplateRowsRaw?: string;
    columnCount?: number;
    rowCount?: number;
    gridPosition?: GridPosition;
    gridArea?: string;
    childrenLayout?: 'horizontal' | 'vertical' | 'grid' | 'none';
    isLayoutContainer?: boolean;
    hasUniformChildren?: boolean;
    detectedColumns?: number;
    detectedRows?: number;
}
/**
 * Statistics from extraction/conversion process.
 */
interface ExtractionStats {
    /** Total pages */
    pageCount: number;
    /** Total elements */
    elementCount: number;
    /** Elements by type */
    elementsByType: Record<ElementType, number>;
    /** Total images */
    imageCount: number;
    /** Total tables */
    tableCount: number;
    /** Total charts */
    chartCount: number;
    /** Conversion time in ms */
    extractionTimeMs: number;
}
/**
 * Result from renderToDocx().
 */
interface DocxResult {
    /** DOCX binary */
    buffer: Buffer;
    /** MIME type */
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    /** File extension */
    extension: '.docx';
    /** Render statistics */
    stats: RenderStats;
    /** Non-fatal warnings */
    warnings: DocxWarning[];
}
/**
 * Result from renderToPdf().
 */
interface PdfResult {
    /** PDF binary */
    buffer: Buffer;
    /** MIME type */
    mimeType: 'application/pdf';
    /** File extension */
    extension: '.pdf';
    /** Render statistics */
    stats: RenderStats;
    /** Non-fatal warnings */
    warnings: DocxWarning[];
}
/**
 * Render statistics.
 */
interface RenderStats {
    /**
     * Number of logical source page/section groups supplied to the DOCX engine.
     * Word controls physical pagination, so this is not a rendered page count.
     * @deprecated Prefer logicalPageCount for DOCX output.
     */
    pageCount: number;
    /** Number of logical source page/section groups. */
    logicalPageCount?: number;
    elementCount: number;
    imageCount: number;
    tableCount: number;
    chartCount: number;
    fileSizeBytes: number;
    renderTimeMs: number;
    xmlTimeMs?: number;
    zipTimeMs?: number;
}
/**
 * A non-fatal warning from the render process.
 */
interface DocxWarning {
    code: DocxWarningCode;
    message: string;
    recovery?: string;
    location?: string;
    context?: Record<string, unknown>;
}
/**
 * Render options.
 */
interface RenderOptions {
    /** Pluggable image processing (default: no-op) */
    imageAdapter?: ImageAdapter;
    /** Pluggable chart rendering (default: data-table fallback) */
    chartAdapter?: ChartAdapter;
    /** Enable opt-in legacy input coercions before schema validation. */
    relaxed?: boolean;
    /** Structured callback for relaxed-input warnings. */
    onInputWarning?: (warning: DocxInputWarning) => void;
    /**
     * Use a fixed serializer seed for byte-stable ZIP metadata, relationship
     * numbering, revision IDs, and generated OOXML IDs. Defaults to the
     * package-level `setDeterministicMode()` value, which is enabled.
     */
    deterministic?: boolean;
    /** Override the fixed serializer seed used when deterministic mode is on. */
    deterministicSeed?: string;
    /** Request archival PDF output when rendering PDF buffers */
    pdfA?: 'PDF/A-1b' | 'PDF/A-2b';
    /** Request tagged PDF output when rendering PDF buffers */
    tagged?: boolean;
    /** Progress callback for streaming */
    onProgress?: (progress: RenderProgress) => void;
    /** Abort signal */
    signal?: AbortSignal;
    /**
     * Run a post-emit OOXML strict validator on the produced buffer and
     * throw if it finds structural violations (negative tab positions,
     * Content_Types overrides without a backing part, unresolved r:id
     * references). Defaults to `true`; pass `strict: false` to skip this
     * post-emit guard. See `validateDocxBuffer`.
     */
    strict?: boolean;
    /**
     * Override native serializer and public input resource limits. These limits
     * are checked before schema conversion and again before OOXML serialization.
     */
    resourceLimits?: Partial<ResourceLimits>;
    /**
     * External image fetching policy for native DOCX renders. Remote http(s)
     * sources are disabled by default and require `allowExternal: true`.
     * Deterministic renders force-disable network image fetches regardless.
     */
    imageFetch?: ImageFetchConfig & {
        /** Maximum simultaneous external image fetches inside one render. */
        maxConcurrentExternalFetches?: number;
        /** Aggregate external-fetch wall time allowed per render (default: 30000ms). */
        maxTotalExternalFetchTimeMs?: number;
        /** Aggregate external image bytes allowed per render (default: 50MB). */
        maxTotalExternalFetchBytes?: number;
    };
}
/**
 * Render progress information.
 *
 * `pageIndex` / `pageCount` are populated during the 'serializing' phase
 * when the native serializer is walking page-by-page, so UIs can show
 * granular progress on multi-page documents. They are omitted for
 * setup-time phases like 'validating' and 'converting'.
 */
interface RenderProgress {
    phase: 'validating' | 'converting' | 'serializing' | 'optimizing';
    percent: number;
    message?: string;
    pageIndex?: number;
    pageCount?: number;
}
/**
 * Pluggable image processing adapter.
 */
interface ImageAdapter {
    /** Rasterize SVG to PNG buffer */
    rasterizeSvg?(svg: string, width: number, height: number): Promise<Buffer>;
    /** Convert image format (WebP/HEIC → PNG) */
    convertFormat?(buffer: Buffer, fromMime: string, toMime: string): Promise<Buffer>;
    /** Fetch remote image */
    fetchImage?(url: string, timeoutMs?: number): Promise<{
        buffer: Buffer;
        mimeType: string;
    }>;
}
/**
 * Pluggable chart rendering adapter.
 */
interface ChartAdapter {
    /** Render chart data to PNG image buffer */
    renderChart?(chart: ChartRenderInput, width: number, height: number): Promise<Buffer>;
}
/**
 * Input for chart rendering.
 */
interface ChartRenderInput {
    chartType: string;
    title?: string;
    series: Array<{
        name: string;
        values: number[];
        color?: string;
    }>;
    categories?: string[];
    legend?: {
        position: string;
    };
    axes?: {
        x?: {
            title?: string;
        };
        y?: {
            title?: string;
            min?: number;
            max?: number;
        };
    };
}
/**
 * Hydration options for template filling.
 */
interface HydrationOptions$1 {
    /** How to handle missing placeholders */
    onMissing?: 'leave' | 'remove' | 'error';
    /** Template marker dialect to process. Default: 'auto'. */
    syntax?: 'mustache' | 'office' | 'auto';
    imageAdapter?: ImageAdapter;
    /** Resource ceilings for untrusted DOCX template archives. */
    archiveLimits?: {
        /** Maximum compressed template size. Default: 25 MiB. */
        maxCompressedBytes?: number;
        /** Maximum ZIP entry count. Default: 2,048. */
        maxEntries?: number;
        /** Maximum expanded bytes for one file part. Default: 16 MiB. */
        maxPartBytes?: number;
        /** Maximum expanded bytes across all file parts. Default: 100 MiB. */
        maxTotalExpandedBytes?: number;
    };
}
interface BatchOptions {
    /** How to name output files. Receives the data item and index. */
    fileName?: (item: Record<string, unknown>, index: number) => string;
    /** Output format: individual buffers or single ZIP archive. Default: 'zip' */
    output?: 'buffers' | 'zip';
    /** Max concurrent renders. Default: 1 (free), up to 32 (pro). */
    concurrency?: number;
    /** Progress callback. Pro only. */
    onProgress?: (completed: number, total: number, current?: string) => void;
    /** Streaming ZIP output. Pro only. */
    stream?: boolean;
}
interface BatchResult {
    results: BatchItemResult[];
    zip?: Buffer;
    totalTime: number;
    successCount: number;
    failureCount: number;
}
interface BatchItemResult {
    index: number;
    fileName: string;
    success: boolean;
    buffer?: Buffer;
    error?: string;
}
/**
 * Validation result from validateDocxDocument().
 */
interface ValidationResult$1 {
    valid: boolean;
    issues: ValidationIssue$1[];
    stats: {
        elementsChecked: number;
        errorsFound: number;
        warningsFound: number;
    };
}
/**
 * A single validation issue.
 */
interface ValidationIssue$1 {
    severity: 'error' | 'warning';
    code: DocxWarningCode;
    message: string;
    path?: string;
    details?: Record<string, unknown>;
}
interface DocxInputWarning {
    code: DocxWarningCode;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}

/**
 * Revision Tracker
 * =================
 * Track Changes / Revision Tracking support for DOCX output.
 *
 * Phase 14 of Polyglot hardening.
 *
 * This module enables "redlining" - the ability to show inserted and deleted
 * text in Word documents. When a document is opened in Word, users see:
 * - Inserted text: underlined/colored (typically blue)
 * - Deleted text: strikethrough/colored (typically red)
 *
 * This is CRITICAL for legal document workflows where changes must be tracked
 * and approved by multiple parties.
 *
 * OOXML Structure for Track Changes:
 * ```xml
 * <w:ins w:author="Author Name" w:date="2026-01-30T12:00:00Z">
 *   <w:r><w:t>inserted text</w:t></w:r>
 * </w:ins>
 * <w:del w:author="Author Name" w:date="2026-01-30T12:00:00Z">
 *   <w:r><w:delText>deleted text</w:delText></w:r>
 * </w:del>
 * ```
 */

/** Revision types */
type RevisionType = 'insert' | 'delete' | 'move' | 'format';
/** A revision author */
interface RevisionAuthor {
    /** Author name (displayed in Word) */
    name: string;
    /** Author initials (optional) */
    initials?: string;
    /** Author ID (optional, auto-generated if not provided) */
    id?: string;
}
/** A single revision entry */
interface Revision {
    /** Unique revision ID */
    id: string;
    /** Type of revision */
    type: RevisionType;
    /** Author who made the revision */
    author: RevisionAuthor;
    /** When the revision was made */
    date: Date;
    /** The content that was inserted/deleted */
    content: string;
    /** Original content (for replacements - delete + insert pair) */
    originalContent?: string;
    /** Position in document (for ordering) */
    position?: number;
    /** Associated node ID (links revision to VLT node) */
    nodeId?: string;
}
/** Configuration for revision tracking */
interface RevisionTrackingConfig {
    /** Enable revision tracking */
    enabled: boolean;
    /** Default author for revisions */
    defaultAuthor: RevisionAuthor;
    /** Whether to show revision marks in output */
    showRevisionMarks?: boolean;
    /** Whether to include revision date */
    includeDate?: boolean;
    /** Custom revision ID generator */
    idGenerator?: () => string;
}
/** Track changes diff granularity */
type TrackChangesGranularity = 'word' | 'sentence' | 'paragraph';
/** Style snapshot for formatting revisions */
interface RevisionStyleSnapshot {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | number;
    fontStyle?: 'normal' | 'italic';
    color?: string;
    backgroundColor?: string;
    textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    superscript?: boolean;
    subscript?: boolean;
    letterSpacing?: number;
}
/** Run-level revision payload */
interface RunRevision {
    type: 'insert' | 'delete' | 'format';
    id?: number;
    author?: string;
    date?: string;
    beforeStyle?: RevisionStyleSnapshot;
}
interface ParagraphRevisionProperties {
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    keepLines?: boolean;
    keepNext?: boolean;
    pageBreakBefore?: boolean;
    indent?: {
        firstLine?: number;
        left?: number;
        right?: number;
    };
}
interface ParagraphRevision {
    type: 'insert' | 'delete' | 'property' | 'moveFrom' | 'moveTo';
    id?: number;
    author?: string;
    date?: string;
    moveName?: string;
    before?: ParagraphRevisionProperties;
}
interface TableRevisionProperties {
    caption?: string;
    tableDescription?: string;
    tableCaption?: string;
}
interface TableRevision {
    type: 'property';
    id?: number;
    author?: string;
    date?: string;
    before?: TableRevisionProperties;
}
interface TableCellRevision {
    type: 'insert' | 'delete';
    id?: number;
    author?: string;
    date?: string;
}
/** Document-level revision defaults */
interface RevisionDefaultsInput {
    author?: string;
    date?: string | Date;
    rsid?: string;
}
/** Resolved document-level revision info */
interface ResolvedRevisionInfo {
    author: string;
    date: string;
    rsid: string;
}
/** Options for run normalization */
interface NormalizeRevisionRunsOptions {
    revisionInfo?: RevisionDefaultsInput;
    fallbackAuthor?: string;
    parseMarkers?: boolean;
    nextRevisionId?: () => number;
}
/** Options for tracked-change diff compilation */
interface CompileTrackedChangesOptions extends RevisionDefaultsInput {
    granularity?: TrackChangesGranularity;
}
interface CompareManifestEntry {
    type: 'added' | 'removed' | 'modified' | 'moved';
    elementType: 'heading' | 'paragraph' | 'table';
    pageIndex: number;
    elementIndex: number;
    mode?: 'text' | 'format' | 'property';
    beforeText?: string;
    afterText?: string;
}
interface CompiledTrackedChangesResult {
    document: DocxDocument;
    compareManifest: CompareManifestEntry[];
}
/** Revision-aware text span */
interface RevisionTextSpan {
    /** The text content */
    text: string;
    /** Revision type (null = no revision, normal text) */
    revision?: RevisionType;
    /** Revision author */
    author?: RevisionAuthor;
    /** Revision date */
    date?: Date;
    /** Revision ID */
    revisionId?: string | number;
    /** Standard text formatting */
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    link?: string;
}
/** Result of applying revisions to a document */
interface RevisionResult {
    /** Total revisions tracked */
    totalRevisions: number;
    /** Insertions count */
    insertions: number;
    /** Deletions count */
    deletions: number;
    /** Format changes count */
    formatChanges: number;
    /** Unique authors */
    authors: RevisionAuthor[];
    /** Revision date range */
    dateRange?: {
        start: Date;
        end: Date;
    };
}
/** Default revision tracking configuration */
declare const DEFAULT_REVISION_CONFIG: RevisionTrackingConfig;
/**
 * RevisionTracker manages tracked changes for a document.
 *
 * Usage:
 * ```typescript
 * const tracker = new RevisionTracker({
 *   enabled: true,
 *   defaultAuthor: { name: 'John Doe', initials: 'JD' },
 * });
 *
 * // Track an insertion
 * tracker.trackInsertion('new paragraph text', 'node-123');
 *
 * // Track a deletion
 * tracker.trackDeletion('removed text', 'node-456');
 *
 * // Track a replacement (delete + insert)
 * tracker.trackReplacement('old text', 'new text', 'node-789');
 *
 * // Get all revisions
 * const revisions = tracker.getRevisions();
 * ```
 */
declare class RevisionTracker {
    private config;
    private revisions;
    private revisionCounter;
    constructor(config?: Partial<RevisionTrackingConfig>);
    /**
     * Generate a unique revision ID
     */
    private generateId;
    /**
     * Track an insertion
     */
    trackInsertion(content: string, nodeId?: string, author?: RevisionAuthor, date?: Date): Revision;
    /**
     * Track a deletion
     */
    trackDeletion(content: string, nodeId?: string, author?: RevisionAuthor, date?: Date): Revision;
    /**
     * Track a replacement (delete + insert as a pair)
     */
    trackReplacement(originalContent: string, newContent: string, nodeId?: string, author?: RevisionAuthor, date?: Date): {
        deletion: Revision;
        insertion: Revision;
    };
    /**
     * Track a format change (e.g., bold applied)
     */
    trackFormatChange(content: string, nodeId?: string, author?: RevisionAuthor, date?: Date): Revision;
    /**
     * Get all revisions
     */
    getRevisions(): Revision[];
    /**
     * Get revisions for a specific node
     */
    getRevisionsForNode(nodeId: string): Revision[];
    /**
     * Get revision by ID
     */
    getRevision(id: string): Revision | undefined;
    /**
     * Remove a revision
     */
    removeRevision(id: string): boolean;
    /**
     * Clear all revisions
     */
    clearRevisions(): void;
    /**
     * Check if tracking is enabled
     */
    isEnabled(): boolean;
    /**
     * Enable/disable tracking
     */
    setEnabled(enabled: boolean): void;
    /**
     * Get the default author
     */
    getDefaultAuthor(): RevisionAuthor;
    /**
     * Set the default author
     */
    setDefaultAuthor(author: RevisionAuthor): void;
    /**
     * Get revision statistics
     */
    getStats(): RevisionResult;
    /**
     * Export revisions to JSON
     */
    toJSON(): string;
    /**
     * Import revisions from JSON
     */
    static fromJSON(json: string): RevisionTracker;
}
/**
 * Create a revision-aware text span for insertion
 */
declare function createInsertedSpan(text: string, author: RevisionAuthor, date?: Date, formatting?: Partial<RevisionTextSpan>): RevisionTextSpan;
/**
 * Create a revision-aware text span for deletion
 */
declare function createDeletedSpan(text: string, author: RevisionAuthor, date?: Date, formatting?: Partial<RevisionTextSpan>): RevisionTextSpan;
/**
 * Parse text with revision markers into spans.
 *
 * Markers:
 * - `{{+text+}}` = insertion
 * - `{{-text-}}` = deletion
 * - `{{~old~new~}}` = replacement
 *
 * Example:
 * ```typescript
 * const spans = parseRevisionMarkers(
 *   'Hello {{-world-}}{{+everyone+}}!',
 *   { name: 'Editor' }
 * );
 * // Returns:
 * // [
 * //   { text: 'Hello ', revision: undefined },
 * //   { text: 'world', revision: 'delete', author: { name: 'Editor' } },
 * //   { text: 'everyone', revision: 'insert', author: { name: 'Editor' } },
 * //   { text: '!', revision: undefined },
 * // ]
 * ```
 */
declare function parseRevisionMarkers(text: string, author: RevisionAuthor, date?: Date): RevisionTextSpan[];
/**
 * Check if text contains revision markers
 */
declare function hasRevisionMarkers(text: string): boolean;
/**
 * Strip revision markers from text, keeping only final content
 * (keeps insertions, removes deletions)
 */
declare function stripRevisionMarkers(text: string): string;
/**
 * Accept all revisions (return text with insertions kept, deletions removed)
 */
declare function acceptAllRevisions(text: string): string;
/**
 * Reject all revisions (return text with deletions kept, insertions removed)
 */
declare function rejectAllRevisions(text: string): string;
declare function generateRsid(seed?: string): string;
declare function resolveRevisionInfo(input?: RevisionDefaultsInput, fallbackAuthor?: string): ResolvedRevisionInfo;
declare function createRevisionIdAllocator(start?: number): () => number;
declare function normalizeDocxTextRuns(runs: DocxTextRun[] | undefined, fallbackText: string | undefined, options?: NormalizeRevisionRunsOptions): DocxTextRun[];
declare function documentHasTrackedChanges(document: DocxDocument): boolean;
declare function normalizeTrackedChangesDocument(document: DocxDocument): DocxDocument;
declare function compileTrackedChangesDocument(original: DocxDocument, revised: DocxDocument, options?: CompileTrackedChangesOptions): DocxDocument;
declare function compileTrackedChangesResult(original: DocxDocument, revised: DocxDocument, options?: CompileTrackedChangesOptions, compareOptions?: {
    tableStrategy?: 'structural' | 'block';
}): CompiledTrackedChangesResult;
/**
 * Get the global revision tracker instance
 */
declare function getRevisionTracker(): RevisionTracker;
/**
 * Reset the global revision tracker
 */
declare function resetRevisionTracker(): void;
/**
 * Create a new revision tracker with custom config
 */
declare function createRevisionTracker(config?: Partial<RevisionTrackingConfig>): RevisionTracker;

type QualityVerdict = "native_editable" | "editable_with_constraints" | "visual_fallback" | "rejected";
type RepairRisk = "none" | "low" | "medium" | "high";
type FindingCode = "SHARED_RELATIONSHIP_TARGET_MISSING" | "SHARED_CONTENT_TYPE_DUPLICATE" | "SHARED_CONTENT_TYPE_MISSING" | "SHARED_CONTENT_TYPE_UNEXPECTED" | "SHARED_RID_NOT_UNIQUE" | "SHARED_ZIP_BOMB_DETECTED" | "SHARED_XML_PARSE_FAILURE" | "SHARED_MEDIA_EMBED_MISSING" | "PPTX_NORMAUTOFIT_MISSING_FONTSCALE" | "PPTX_TABLE_CELL_TEXT_OVERFLOW" | "PPTX_CHART_FORMAT_CODE_UNESCAPED" | "PPTX_ELEMENT_POSITION_CASCADE" | "PPTX_CHART_WORKBOOK_MISSING" | "PPTX_CHART_LABEL_COLLISION" | "PPTX_OVERFLOW_BODY_TEXT" | "PPTX_LAYOUT_SHOULD_SPLIT" | "PPTX_FONT_FALLBACK_USED" | "PPTX_VISUAL_FALLBACK_MISSING" | "PPTX_CHART_FALLBACK_MISSING" | "PPTX_SLIDE_ID_NOT_UNIQUE" | "PPTX_SHAPE_ID_NOT_UNIQUE" | "PPTX_CUSTDATALIST_CONFLICT" | "PPTX_ELEMENT_ORDER_VIOLATION" | "PPTX_ANIMATION_REF_BROKEN" | "PPTX_HYPERLINK_DANGLING" | "PPTX_MASTER_REF_UNRESOLVED" | "PPTX_FONT_EMBED_FAILED" | "PPTX_STRUCTURAL_VALIDATION_FAILED" | "DOCX_NUMBERING_DEF_MISSING" | "DOCX_STYLE_REF_MISSING" | "DOCX_SECT_PR_MISSING" | "DOCX_TABLE_WIDTH_MISMATCH" | "DOCX_RUN_SPLIT_FORMATTING_LOSS" | "DOCX_TRACKED_CHANGE_MALFORMED" | "DOCX_HEADING_HIERARCHY_BROKEN" | "DOCX_IMAGE_REF_MISSING" | "DOCX_FONT_FALLBACK_USED" | "DOCX_PARAGRAPH_OVERFLOW" | "DOCX_CONTENT_CONTROL_REF_BROKEN" | "DOCX_RELATIONSHIP_TARGET_MISSING" | "XLSX_SHARED_STRING_INDEX_OOB" | "XLSX_STYLE_INDEX_OOB" | "XLSX_MERGE_OVERLAP" | "XLSX_NAMED_RANGE_DEAD_REF" | "XLSX_CHART_WORKBOOK_MISSING" | "XLSX_FORMULA_CACHED_VALUE_MISSING" | "XLSX_SHEET_NAME_INVALID" | "XLSX_DUPLICATE_SHEET_NAME" | "XLSX_RELATIONSHIP_TARGET_MISSING" | "XLSX_TABLE_RELATIONSHIP_BROKEN" | "XLSX_TABLE_NAME_DUPLICATE" | "XLSX_TABLE_REF_INVALID" | "XLSX_WORKSHEET_DIMENSION_MISMATCH" | "XLSX_RANGE_REF_INVALID" | "XLSX_MERGE_RANGE_OUT_OF_BOUNDS" | "XLSX_HYPERLINK_TARGET_INVALID" | "XLSX_MACRO_STRIPPED" | "XLSX_EXTERNAL_CONNECTION_STRIPPED" | "XLSX_GOOGLE_SHEETS_IMPORT_RISK" | "XLSX_NUMBERS_COMPATIBILITY_WARNING" | "XLSX_HIGH_UNIQUE_STRING_COUNT" | "XLSX_STYLE_CARDINALITY_EXCESSIVE" | "XLSX_STREAM_MODE_RECOMMENDED" | "XLSX_FORMULA_REF_BROKEN" | "XLSX_DATE_BEFORE_1900" | "XLSX_LARGE_FILE_WARNING" | "PDF_XREF_OFFSET_INCORRECT" | "PDF_XREF_ENTRY_ZERO_OFFSET" | "PDF_XREF_TABLE_MISSING" | "PDF_FONT_OBJECT_MISSING" | "PDF_FONT_NOT_EMBEDDED" | "PDF_IMAGE_REFERENCE_MISSING" | "PDF_STREAM_LENGTH_INCORRECT" | "PDF_EOF_MARKER_MISSING" | "PDF_ROOT_OBJECT_INVALID" | "PDF_FONT_SUBSET_INCOMPLETE" | "PDF_SIGNATURE_INVALID" | "PDF_SIGNATURE_MISSING" | "PDF_SIGNATURE_BYTERANGE_INVALID" | "PDF_TIMESTAMP_MISSING" | "PDF_TIMESTAMP_INVALID" | "PDF_PAGE_TREE_COUNT_MISMATCH" | "PDF_TAG_MCID_GAP" | "PDF_SELF_REFERENCE" | "PDF_METADATA_INFO_XMP_MISMATCH" | "PDF_OBJECT_NUMBER_REUSE";
interface QualityFinding {
    code: FindingCode;
    severity: "error" | "warning" | "info";
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
    paragraphIndex?: number;
    nodeId?: string;
    message: string;
    autoFixed: boolean;
    repairDescription?: string;
}
interface RepairEntry {
    strategy: string;
    finding: FindingCode;
    description: string;
    success: boolean;
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
}
interface QualityReport$1 {
    verdict: QualityVerdict;
    repairRisk: RepairRisk;
    findings: QualityFinding[];
    slideCount?: number;
    sheetCount?: number;
    pageCount?: number;
    chartCount?: number;
    tableCount?: number;
    imageCount?: number;
    fontCount?: number;
    renderTimeMs: number;
    autoFixesApplied: number;
    repairLog: RepairEntry[];
}
interface RenderWithQualityResult {
    output: Buffer;
    quality: QualityReport$1;
}

/**
 * Main Entry Point: renderToDocx
 *
 * JSON in, DOCX binary out. No React, no DOM, no Puppeteer.
 *
 * Accepts either:
 * - DocxDocument (DOCX-native JSON schema, preferred for AI agents)
 * - StructuredDocument (internal intermediate format, for advanced use)
 *
 * Returns a DocxResult with the DOCX buffer and metadata.
 */

interface RenderWithTrackedChangesOptions extends RenderOptions {
    author?: string;
    date?: string;
    granularity?: TrackChangesGranularity;
    licenseKey?: string;
}
/**
 * Render a DocxDocument or StructuredDocument to DOCX binary.
 *
 * @example
 * ```ts
 * const result = await renderToDocx({
 *   type: 'DocxDocument',
 *   pageSize: 'a4',
 *   pages: [{
 *     elements: [
 *       { type: 'heading', level: 1, text: 'Hello World' },
 *       { type: 'paragraph', text: 'This is a test document.' },
 *     ]
 *   }]
 * });
 * fs.writeFileSync('output.docx', result.buffer);
 * ```
 */
declare function renderToDocx(input: DocxDocument | StructuredDocument, options?: RenderOptions & {
    licenseKey?: string;
}): Promise<DocxResult>;
declare function renderToDocxWithQuality(input: DocxDocument | StructuredDocument, options?: RenderOptions & {
    licenseKey?: string;
}): Promise<RenderWithQualityResult>;
declare function renderToPdf(input: DocxDocument | StructuredDocument, options?: RenderOptions & {
    licenseKey?: string;
}): Promise<PdfResult>;
/**
 * Hydrate a DOCX template with data.
 * Replaces {{placeholder}} patterns in an existing DOCX file.
 *
 * Surfaces any unfilled placeholders as DOCX_HYDRATE_UNFILLED_PLACEHOLDER
 * warnings on the returned DocxResult, with the placeholder name in
 * `context.placeholder`. In strict mode the hydrator itself throws, so
 * callers only see warnings in the non-strict path.
 */
declare function hydrateDocx(templateBuffer: Buffer, data: Record<string, unknown>, options?: HydrationOptions$1): Promise<DocxResult>;
declare function hydrateDocxToPdf(templateBuffer: Buffer, data: Record<string, unknown>, options?: (HydrationOptions$1 & RenderOptions & {
    licenseKey?: string;
})): Promise<PdfResult>;
declare function renderWithTrackedChanges(original: DocxDocument, revised: DocxDocument, options?: RenderWithTrackedChangesOptions): Promise<DocxResult>;
/**
 * Validate a DocxDocument without rendering.
 * Returns detailed validation issues.
 */
declare function validateDocxDocument(input: unknown): ValidationResult$1;
/**
 * Render an HTML string to DOCX binary.
 *
 * Free tier: paragraphs, headings, lists, inline formatting, code blocks.
 * Pro tier: tables, images, CSS style mapping.
 *
 * @example
 * ```ts
 * const { buffer, warnings } = await renderHtmlToDocx(`
 *   <h1>Report Title</h1>
 *   <p>This is a <strong>bold</strong> paragraph.</p>
 *   <ul><li>First item</li><li>Second item</li></ul>
 * `);
 * fs.writeFileSync('output.docx', buffer);
 * ```
 */
declare function renderHtmlToDocx(html: string, options?: HtmlDocxOptions): Promise<DocxResult>;

/**
 * Deterministic mode for @runstamp/docx.
 *
 * The enabled/disabled flag now lives in `@runstamp/contract` (OC-1 Phase 2), so
 * this package, `@runstamp/pdf`, `@runstamp/xlsx` and
 * `@runstamp/pptx` all observe one flag instead of four independent
 * copies that could disagree.
 *
 * The public signatures here are unchanged, including the two-argument
 * `setDeterministicMode(enabled, seed)` and `resolveDeterministicSeed`. The seed
 * remains package-local because it is a DOCX-specific value.
 */
declare function setDeterministicMode(enabled?: boolean, seed?: string): void;
declare function isDeterministicModeEnabled(): boolean;

type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
declare const ExtensionManifestSchema: ZodObject<{
    schemaVersion: ZodLiteral<1>;
    id: ZodString;
    version: ZodString;
    catalogItemId: ZodString;
    title: ZodString;
    operations: ZodArray<ZodObject<{
        name: ZodString;
        summary: ZodString;
        inputKinds: ZodArray<ZodString>;
        outputKinds: ZodArray<ZodString>;
    }, $strict>>;
    warningCodes: ZodArray<ZodObject<{
        code: ZodString;
        description: ZodString;
    }, $strict>>;
    lossCodes: ZodArray<ZodObject<{
        code: ZodString;
        description: ZodString;
    }, $strict>>;
}, $strict>;
type ExtensionManifest = output<typeof ExtensionManifestSchema>;
declare const ResourceBudgetSchema: ZodObject<{
    maxInputBytes: ZodNumber;
    maxOutputBytes: ZodNumber;
    maxEntries: ZodNumber;
    maxDepth: ZodNumber;
    timeoutMs: ZodNumber;
}, $strict>;
declare const DeterministicContextSchema: ZodObject<{
    runId: ZodString;
    seed: ZodString;
    now: ZodISODateTime;
    network: ZodLiteral<"disabled">;
    budget: ZodObject<{
        maxInputBytes: ZodNumber;
        maxOutputBytes: ZodNumber;
        maxEntries: ZodNumber;
        maxDepth: ZodNumber;
        timeoutMs: ZodNumber;
    }, $strict>;
}, $strict>;
declare const ExtensionRequestSchema: ZodObject<{
    schemaVersion: ZodLiteral<1>;
    extensionId: ZodString;
    operation: ZodString;
    input: ZodType<JsonValue, unknown, $ZodTypeInternals<JsonValue, unknown>>;
    context: ZodObject<{
        runId: ZodString;
        seed: ZodString;
        now: ZodISODateTime;
        network: ZodLiteral<"disabled">;
        budget: ZodObject<{
            maxInputBytes: ZodNumber;
            maxOutputBytes: ZodNumber;
            maxEntries: ZodNumber;
            maxDepth: ZodNumber;
            timeoutMs: ZodNumber;
        }, $strict>;
    }, $strict>;
}, $strict>;
type ExtensionRequest = output<typeof ExtensionRequestSchema>;
type ResourceBudget = output<typeof ResourceBudgetSchema>;
declare const ExtensionLocatorSchema: ZodObject<{
    artifactId: ZodString;
    scheme: ZodString;
    value: ZodArray<ZodUnion<readonly [ZodString, ZodNumber]>>;
}, $strict>;
type ExtensionLocator = output<typeof ExtensionLocatorSchema>;
declare const ExtensionResultSchema: ZodDiscriminatedUnion<[ZodObject<{
    status: ZodLiteral<"ok">;
    output: ZodType<JsonValue, unknown, $ZodTypeInternals<JsonValue, unknown>>;
    warnings: ZodArray<ZodObject<{
        code: ZodString;
        message: ZodString;
        severity: ZodOptional<ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: ZodOptional<ZodObject<{
            artifactId: ZodString;
            scheme: ZodString;
            value: ZodArray<ZodUnion<readonly [ZodString, ZodNumber]>>;
        }, $strict>>;
    }, $strict>>;
    losses: ZodArray<ZodObject<{
        code: ZodString;
        message: ZodString;
        severity: ZodOptional<ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: ZodOptional<ZodObject<{
            artifactId: ZodString;
            scheme: ZodString;
            value: ZodArray<ZodUnion<readonly [ZodString, ZodNumber]>>;
        }, $strict>>;
    }, $strict>>;
    artifacts: ZodArray<ZodObject<{
        name: ZodString;
        mediaType: ZodString;
        byteLength: ZodNumber;
        sha256: ZodString;
    }, $strict>>;
}, $strict>, ZodObject<{
    status: ZodLiteral<"error">;
    error: ZodObject<{
        code: ZodString;
        message: ZodString;
        retryable: ZodBoolean;
    }, $strict>;
    warnings: ZodArray<ZodObject<{
        code: ZodString;
        message: ZodString;
        severity: ZodOptional<ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: ZodOptional<ZodObject<{
            artifactId: ZodString;
            scheme: ZodString;
            value: ZodArray<ZodUnion<readonly [ZodString, ZodNumber]>>;
        }, $strict>>;
    }, $strict>>;
    losses: ZodArray<ZodObject<{
        code: ZodString;
        message: ZodString;
        severity: ZodOptional<ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>>;
        locator: ZodOptional<ZodObject<{
            artifactId: ZodString;
            scheme: ZodString;
            value: ZodArray<ZodUnion<readonly [ZodString, ZodNumber]>>;
        }, $strict>>;
    }, $strict>>;
    artifacts: ZodArray<ZodObject<{
        name: ZodString;
        mediaType: ZodString;
        byteLength: ZodNumber;
        sha256: ZodString;
    }, $strict>>;
}, $strict>], "status">;
type ExtensionResult = output<typeof ExtensionResultSchema>;
declare const ProgressUpdateSchema: ZodObject<{
    completed: ZodNumber;
    total: ZodNumber;
    message: ZodOptional<ZodString>;
}, $strict>;
type ProgressUpdate = output<typeof ProgressUpdateSchema>;
declare const ResourceUsageSchema: ZodObject<{
    inputBytes: ZodOptional<ZodNumber>;
    outputBytes: ZodOptional<ZodNumber>;
    entries: ZodOptional<ZodNumber>;
    depth: ZodOptional<ZodNumber>;
}, $strict>;
type ResourceUsage = output<typeof ResourceUsageSchema>;
declare const ValidatorResultSchema: ZodObject<{
    validator: ZodString;
    version: ZodString;
    required: ZodBoolean;
    status: ZodEnum<{
        PASS: "PASS";
        FAIL: "FAIL";
        ADVISORY: "ADVISORY";
        BLOCKED_EXTERNAL: "BLOCKED_EXTERNAL";
    }>;
    command: ZodString;
    issues: ZodArray<ZodObject<{
        code: ZodString;
        message: ZodString;
        severity: ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>;
        locator: ZodOptional<ZodObject<{
            artifactId: ZodString;
            scheme: ZodString;
            value: ZodArray<ZodUnion<readonly [ZodString, ZodNumber]>>;
        }, $strict>>;
    }, $strict>>;
}, $strict>;
type ValidatorResult = output<typeof ValidatorResultSchema>;
interface ExtensionExecutionContext {
    readonly signal: AbortSignal;
    readonly deterministic: output<typeof DeterministicContextSchema>;
    readonly budget: ResourceBudget;
    reportProgress(update: ProgressUpdate): void;
    checkpoint(usage: ResourceUsage): void;
}
interface ExtensionDefinition {
    manifest: ExtensionManifest;
    execute(request: ExtensionRequest, context: ExtensionExecutionContext): Promise<ExtensionResult>;
}

type ExtensionDiagnostic = {
    code: string;
    message: string;
    severity?: "info" | "warning" | "error";
    locator?: ExtensionLocator;
};
declare const DOCX_CONTROLLED_WARNING_CODES: {
    readonly EXTERNAL_RELATIONSHIP: "DOCX_EXTERNAL_RELATIONSHIP";
    readonly EXECUTABLE_PART_PRESERVED: "DOCX_EXECUTABLE_PART_PRESERVED";
};
declare const DOCX_CONTROLLED_LOSS_CODES: {
    readonly OPAQUE_PART_PRESERVED: "DOCX_OPAQUE_PART_PRESERVED";
};
type DocxControlledErrorCode = "DOCX_INVALID_PACKAGE" | "DOCX_ENCRYPTED_INPUT" | "DOCX_ARCHIVE_LIMIT" | "DOCX_UNSAFE_ARCHIVE_PATH" | "DOCX_XML_LIMIT" | "DOCX_INVALID_LOCATOR" | "DOCX_STALE_LOCATOR";
declare class DocxControlledDocumentError extends Error {
    readonly code: DocxControlledErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: DocxControlledErrorCode, message: string, details?: Record<string, unknown>);
}
interface DocxArchiveLimits {
    maxInputBytes: number;
    maxEntries: number;
    maxUncompressedBytes: number;
    maxCompressionRatio: number;
    maxXmlBytes: number;
    maxXmlDepth: number;
}
declare const DEFAULT_DOCX_ARCHIVE_LIMITS: DocxArchiveLimits;
interface DocxRelationshipInspection {
    owner: string;
    id: string;
    type: string;
    target: string;
    targetMode: "Internal" | "External";
    resolvedTarget?: string;
    targetExists?: boolean;
}
interface DocxControlledInspection {
    sha256: string;
    byteLength: number;
    entryCount: number;
    uncompressedBytes: number;
    partNames: string[];
    searchableParts: string[];
    metadataParts: string[];
    mediaParts: string[];
    executableParts: string[];
    oleParts: string[];
    relationships: DocxRelationshipInspection[];
    features: {
        sections: number;
        paragraphs: number;
        runs: number;
        tables: number;
        styles: number;
        numberingDefinitions: number;
        headers: number;
        footers: number;
        footnotes: number;
        endnotes: number;
        comments: number;
        trackedInsertions: number;
        trackedDeletions: number;
        hyperlinks: number;
    };
    warnings: ExtensionDiagnostic[];
    losses: ExtensionDiagnostic[];
}
type DocxTrackedChangeVisibility = "final" | "original" | "all";
interface ControlledDocxPart {
    name: string;
    text: string;
    paragraphCount: number;
    /** Lossless source XML used for stable locator resolution and targeted mutation. */
    xml: string;
}
interface ControlledDocxDocument {
    schemaVersion: 1;
    artifactId: string;
    sourceSha256: string;
    packageBase64: string;
    inspection: DocxControlledInspection;
    parts: ControlledDocxPart[];
}
interface DocxTextLocator extends ExtensionLocator {
    scheme: "docx-ooxml-text-v1";
    value: [
        partName: string,
        paragraphIndex: number,
        startNodeIndex: number,
        startOffset: number,
        endNodeIndex: number,
        endOffset: number,
        paragraphSha256: string,
        visibility: DocxTrackedChangeVisibility
    ];
}
interface DocxFindResult {
    text: string;
    locator: DocxTextLocator;
}
interface DocxRedactionPreview {
    artifactId: string;
    targets: Array<{
        locator: DocxTextLocator;
        currentText: string;
    }>;
    residualCount: number;
    mutatesArtifact: false;
}
interface DocxRedactionProof {
    removedOccurrences: number;
    residualCount: number;
    removedTextSha256: string[];
    sourceSha256: string;
    outputSha256: string;
}
interface DocxRedactionResult {
    document: ControlledDocxDocument;
    proof: DocxRedactionProof;
    warnings: ExtensionDiagnostic[];
    losses: ExtensionDiagnostic[];
}
interface DocxVerifyIssue {
    code: string;
    message: string;
    part?: string;
}
interface DocxVerificationReport {
    status: "PASS" | "FAIL";
    sha256: string;
    issues: DocxVerifyIssue[];
    residualMatches: Array<{
        text: string;
        parts: string[];
    }>;
    validator: {
        validator: string;
        version: string;
        required: true;
        status: "PASS" | "FAIL";
        command: string;
        issues: Array<{
            code: string;
            message: string;
            severity: "error";
        }>;
    };
}
declare function inspectControlledDocx(bytes: Uint8Array, limits?: Partial<DocxArchiveLimits>): Promise<DocxControlledInspection>;
declare function importControlledDocx(bytes: Uint8Array, options?: {
    artifactId?: string;
    limits?: Partial<DocxArchiveLimits>;
}): Promise<ControlledDocxDocument>;
declare function findControlledDocx(document: ControlledDocxDocument, query: string, options?: {
    caseSensitive?: boolean;
    visibility?: DocxTrackedChangeVisibility;
}): DocxFindResult[];
declare function previewDocxRedactions(document: ControlledDocxDocument, locators: DocxTextLocator[]): DocxRedactionPreview;
declare function applyDocxRedactions(document: ControlledDocxDocument, locators: DocxTextLocator[]): Promise<DocxRedactionResult>;
declare function exportControlledDocx(document: ControlledDocxDocument): Buffer;
declare function verifyControlledDocx(bytesOrDocument: Uint8Array | ControlledDocxDocument, options?: {
    forbiddenText?: string[];
    limits?: Partial<DocxArchiveLimits>;
}): Promise<DocxVerificationReport>;
declare const DOCX_CONTROLLED_DOCUMENT_MANIFEST: ExtensionManifest;
declare function createDocxControlledDocumentExtension(): ExtensionDefinition;

type DocxReferenceApplication = "word" | "libreoffice";
interface DocxReferenceValidationResult {
    application: DocxReferenceApplication;
    detectedVersion: string | null;
    openedWithoutRepair: boolean;
    validator: ValidatorResult;
}
/**
 * Opens a safe DOCX in a real reference application. Macro, ActiveX, and OLE-bearing packages are
 * rejected before launch so the adapter never asks Office to execute untrusted embedded content.
 */
declare function validateDocxWithReferenceApplication(bytes: Uint8Array, options: {
    application: DocxReferenceApplication;
    executable?: string;
    timeoutMs?: number;
}): Promise<DocxReferenceValidationResult>;

interface RelaxedInputCoercion {
    code: DocxWarningCode;
    path: string;
    description: string;
    legacyShape: string;
    modernShape: string;
}
interface DocxRelaxedInputOptions {
    onInputWarning?: (warning: DocxInputWarning) => void;
    relaxed?: boolean;
}
declare const DOCX_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[];
declare function preprocessDocxDocumentInput(input: unknown, options?: DocxRelaxedInputOptions): {
    value: unknown;
    warnings: DocxInputWarning[];
};

interface OoxmlValidationIssue {
    severity: 'error' | 'warning';
    code: 'DOCX_TAB_NEGATIVE' | 'DOCX_CONTENT_TYPES_OVERRIDE_MISSING' | 'DOCX_RELATIONSHIP_TARGET_MISSING' | 'DOCX_RELATIONSHIP_REFERENCE_MISSING' | 'DOCX_VALIDATOR_INTERNAL';
    message: string;
    part?: string;
    details?: Record<string, unknown>;
}
interface OoxmlValidationResult {
    ok: boolean;
    issues: OoxmlValidationIssue[];
}
/**
 * Validate a rendered DOCX buffer against the strict-mode invariants.
 * Pure read-only — does not mutate the buffer.
 */
declare function validateDocxBuffer(buffer: Buffer | Uint8Array): Promise<OoxmlValidationResult>;
declare class DocxStrictValidationError extends Error {
    readonly issues: OoxmlValidationIssue[];
    constructor(issues: OoxmlValidationIssue[]);
}

interface DocxRenderStatsForQualityGate {
    renderTimeMs?: number;
    pageCount?: number;
    elementCount?: number;
    imageCount?: number;
    tableCount?: number;
    chartCount?: number;
    fileSizeBytes?: number;
    xmlTimeMs?: number;
    zipTimeMs?: number;
}
interface DocxExpectedSemanticManifest {
    id?: string;
    expectedFindingCodes?: FindingCode[];
    forbiddenFindingCodes?: FindingCode[];
    expectedText?: string[];
    [key: string]: unknown;
}
interface DocxQualityGateInput {
    buffer: Buffer | Uint8Array;
    renderStats?: DocxRenderStatsForQualityGate;
    expectedSemanticManifest?: DocxExpectedSemanticManifest;
}
interface DocxQualityGateArtifactHashes {
    inputSha256: string;
    outputSha256: string;
    qualitySha256: string;
    manifestSha256: string;
    strictValidationSha256: string;
}
interface DocxQualityGateManifest {
    schemaVersion: 1;
    engine: "docx";
    accepted: boolean;
    rejected: boolean;
    verdict: QualityReport$1["verdict"];
    repairRisk: QualityReport$1["repairRisk"];
    renderStats: DocxRenderStatsForQualityGate;
    strictValidationOk: boolean;
    strictIssueCount: number;
    findingCodes: FindingCode[];
    repairStrategies: string[];
    expectedSemanticManifest?: DocxExpectedSemanticManifest;
    artifactHashes: Omit<DocxQualityGateArtifactHashes, "manifestSha256">;
}
interface DocxQualityGateSidecars {
    quality: QualityReport$1;
    manifest: DocxQualityGateManifest;
    strictValidation: OoxmlValidationResult;
}
interface DocxQualityGateResult extends RenderWithQualityResult {
    accepted: boolean;
    rejected: boolean;
    verdict: QualityReport$1["verdict"];
    findings: QualityFinding[];
    repairs: RepairEntry[];
    artifactHashes: DocxQualityGateArtifactHashes;
    strictValidation: OoxmlValidationResult;
    initialStrictValidation: OoxmlValidationResult;
    expectedSemanticManifest?: DocxExpectedSemanticManifest;
    sidecars: DocxQualityGateSidecars;
}
declare function runDocxQualityGate(input: DocxQualityGateInput): Promise<DocxQualityGateResult>;
interface DocxQualityGate {
    run(input: DocxQualityGateInput): Promise<DocxQualityGateResult>;
}
declare const DocxQualityGate: DocxQualityGate;

/**
 * High-level report builder.
 *
 * Mirrors the `generate_report_docx` MCP wrapper shape so the same JSON that
 * works against the MCP server also works directly via Mode B
 * (`buildReportDocx(...) → renderToDocx(...)`). Driven by
 * docs/0428-claude-test-based-directive2.md §"@runstamp/docx" item
 * "Make the canonical Mode B shape match `references/examples.md`".
 */

interface BuildReportDocxInput {
    /** Report title — rendered as a level-1 heading. */
    title: string;
    /** Optional centered subtitle. */
    subtitle?: string;
    /** Author name; included in the centered byline if present. */
    author?: string;
    /** Report date string (free-form); included in the byline if present. */
    date?: string;
    /** Sections rendered in order. */
    sections: Array<{
        /** Section heading text. */
        heading: string;
        /** Heading level (1..4). Defaults to 1. */
        level?: 1 | 2 | 3 | 4;
        /** Body text. Paragraphs are separated by double newlines. */
        content: string;
        /** Optional bullet list rendered after the section body. */
        bullets?: string[];
    }>;
    /** Show a table-of-contents page. Defaults to true. */
    includeToc?: boolean;
    /** Visual theme preset. Defaults to 'corporate'. */
    theme?: 'corporate' | 'modern' | 'classic' | 'academic' | 'minimal';
    /** Page size. Defaults to 'a4'. */
    pageSize?: 'a4' | 'letter' | 'legal';
    /** Page orientation. Defaults to 'portrait'. */
    orientation?: 'portrait' | 'landscape';
    /** Header text repeated on every page. */
    headerText?: string;
    /** Footer text repeated on every page. */
    footerText?: string;
    /** Show page numbers in the footer. Defaults to true. */
    includePageNumbers?: boolean;
}
declare function buildReportDocx(input: BuildReportDocxInput): DocxDocument;

/**
 * High-level invoice builder.
 *
 * Mirrors the `generate_invoice_docx` MCP wrapper shape so the documented
 * Mode B examples work without rewriting. See
 * docs/0428-claude-test-based-directive2.md §"@runstamp/docx".
 */

interface InvoiceParty {
    name: string;
    address: string;
    email?: string;
    phone?: string;
    taxId?: string;
}
interface InvoiceLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}
interface BuildInvoiceDocxInput {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    sender: InvoiceParty;
    recipient: InvoiceParty;
    items: InvoiceLineItem[];
    subtotal: number;
    /** Tax rate as decimal (e.g. 0.0875 for 8.75%). */
    taxRate?: number;
    taxAmount: number;
    total: number;
    /** ISO 4217 currency code. Defaults to 'USD'. */
    currency?: string;
    /** Notes appended after totals. */
    notes?: string;
    theme?: 'corporate' | 'modern' | 'minimal';
    pageSize?: 'a4' | 'letter';
}
declare function buildInvoiceDocx(input: BuildInvoiceDocxInput): DocxDocument;

interface ContractParty {
    name: string;
    address: string;
    /** e.g. "Licensor", "Client". */
    role: string;
}
interface ContractClause {
    /** e.g. "1", "2.1". */
    number: string;
    title: string;
    content: string;
    subclauses?: Array<{
        /** e.g. "a", "i". */
        label: string;
        content: string;
    }>;
}
interface ContractSignature {
    name: string;
    title: string;
    /** Which party this signatory represents. */
    party: string;
}
interface BuildContractDocxInput {
    title: string;
    /** Free-form date string. */
    effectiveDate: string;
    parties: ContractParty[];
    recitals?: string[];
    clauses: ContractClause[];
    signatures?: ContractSignature[];
    theme?: 'corporate' | 'classic' | 'academic';
    pageSize?: 'a4' | 'letter' | 'legal';
}
declare function buildContractDocx(input: BuildContractDocxInput): DocxDocument;

type ChangeKind = "added" | "removed" | "modified" | "moved";
type ChangeSeverity = "major" | "minor" | "cosmetic";
interface Change {
    type: ChangeKind;
    path: string;
    description: string;
    before?: unknown;
    after?: unknown;
    severity: ChangeSeverity;
}
interface DiffStatistics {
    added: number;
    removed: number;
    modified: number;
    moved: number;
}
interface ChangeSet {
    changes: Change[];
    summary: string;
    statistics: DiffStatistics;
}
interface DiffOptions {
    includeSummary?: boolean;
}

declare function diffDocxDocuments(before: DocxDocument, after: DocxDocument, options?: DiffOptions): ChangeSet;

interface CompareDocumentsOptions {
    author?: string;
    date?: string;
    granularity?: TrackChangesGranularity;
    licenseKey?: string;
    /**
     * Render the comparison artifact deterministically.
     *
     * Without this the internal `renderToDocx` call falls back to its default,
     * which stamps timestamps and identifiers — so two comparisons of the same
     * pair of documents produced different bytes even within one process, while
     * `docx.diff` advertised `deterministic: true`. C7/C8 caught it the first
     * time a conformance fixture invoked the verb.
     *
     * The revision save ID is covered too: it otherwise defaults to a hash of
     * `Date.now()` and `Math.random()`, which is upstream of rendering and so
     * unreachable by the renderer's own deterministic mode.
     */
    deterministic?: boolean;
}
interface CompareDocumentsResult {
    buffer: Buffer;
    changes: Change[];
    summary: string;
    statistics: DiffStatistics;
}
declare function compareDocuments(originalBuffer: Buffer, revisedBuffer: Buffer, options?: CompareDocumentsOptions): Promise<CompareDocumentsResult>;

/**
 * Structured Error System for DOCX Generation
 * ============================================
 * Provides error codes, actionable messages, and recovery suggestions.
 */
/**
 * Error codes for programmatic handling.
 * Format: DOCX_[CATEGORY]_[SPECIFIC]
 */
declare enum DOCXErrorCode {
    DOC_INVALID = "DOCX_DOC_INVALID",
    DOC_NO_PAGES = "DOCX_DOC_NO_PAGES",
    DOC_NO_DIMENSIONS = "DOCX_DOC_NO_DIMENSIONS",
    DOC_INVALID_DIMENSIONS = "DOCX_DOC_INVALID_DIMENSIONS",
    ELEMENT_UNKNOWN = "DOCX_ELEMENT_UNKNOWN",
    ELEMENT_INVALID = "DOCX_ELEMENT_INVALID",
    ELEMENT_MISSING_CONTENT = "DOCX_ELEMENT_MISSING_CONTENT",
    ELEMENT_NOT_IMPLEMENTED = "DOCX_ELEMENT_NOT_IMPLEMENTED",
    IMAGE_FETCH_FAILED = "DOCX_IMAGE_FETCH_FAILED",
    IMAGE_TIMEOUT = "DOCX_IMAGE_TIMEOUT",
    IMAGE_TOO_LARGE = "DOCX_IMAGE_TOO_LARGE",
    IMAGE_INVALID_FORMAT = "DOCX_IMAGE_INVALID_FORMAT",
    IMAGE_DECODE_FAILED = "DOCX_IMAGE_DECODE_FAILED",
    IMAGE_CONVERSION_FAILED = "DOCX_IMAGE_CONVERSION_FAILED",
    CHART_NO_DATA = "DOCX_CHART_NO_DATA",
    CHART_RENDER_FAILED = "DOCX_CHART_RENDER_FAILED",
    CHART_INVALID_TYPE = "DOCX_CHART_INVALID_TYPE",
    SHAPE_NOT_SUPPORTED = "DOCX_SHAPE_NOT_SUPPORTED",
    SHAPE_RENDER_FAILED = "DOCX_SHAPE_RENDER_FAILED",
    TABLE_INVALID_STRUCTURE = "DOCX_TABLE_INVALID_STRUCTURE",
    TABLE_CELL_MERGE_ERROR = "DOCX_TABLE_CELL_MERGE_ERROR",
    TABLE_GRID_MISMATCH = "TABLE_GRID_MISMATCH",
    STYLE_NOT_FOUND = "DOCX_STYLE_NOT_FOUND",
    STYLE_INVALID = "DOCX_STYLE_INVALID",
    INVALID_COLOR = "INVALID_COLOR",
    INVALID_FONT_SIZE = "INVALID_FONT_SIZE",
    RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED",
    IMAGE_SIZE_EXCEEDED = "IMAGE_SIZE_EXCEEDED",
    DEPENDENCY_MISSING = "DOCX_DEPENDENCY_MISSING",
    DEPENDENCY_VERSION = "DOCX_DEPENDENCY_VERSION",
    INTERNAL_ERROR = "DOCX_INTERNAL_ERROR",
    SERIALIZATION_FAILED = "DOCX_SERIALIZATION_FAILED",
    RENDER_ABORTED = "DOCX_RENDER_ABORTED"
}
/**
 * Warning codes for non-fatal issues.
 */
declare enum DOCXWarningCode {
    DOC_NO_METADATA = "DOCX_WARN_DOC_NO_METADATA",
    DOC_EMPTY_PAGE = "DOCX_WARN_DOC_EMPTY_PAGE",
    ELEMENT_FALLBACK = "DOCX_WARN_ELEMENT_FALLBACK",
    ELEMENT_TRUNCATED = "DOCX_WARN_ELEMENT_TRUNCATED",
    IMAGE_PLACEHOLDER = "DOCX_WARN_IMAGE_PLACEHOLDER",
    IMAGE_RESIZED = "DOCX_WARN_IMAGE_RESIZED",
    IMAGE_CONVERTED = "DOCX_WARN_IMAGE_CONVERTED",
    CHART_PLACEHOLDER = "DOCX_WARN_CHART_PLACEHOLDER",
    CHART_DATA_TRUNCATED = "DOCX_WARN_CHART_DATA_TRUNCATED",
    SHAPE_PLACEHOLDER = "DOCX_WARN_SHAPE_PLACEHOLDER",
    SHAPE_SIMPLIFIED = "DOCX_WARN_SHAPE_SIMPLIFIED",
    STYLE_FALLBACK = "DOCX_WARN_STYLE_FALLBACK",
    FONT_FALLBACK = "DOCX_WARN_FONT_FALLBACK",
    PERF_LARGE_DOCUMENT = "DOCX_WARN_PERF_LARGE_DOCUMENT",
    PERF_MANY_IMAGES = "DOCX_WARN_PERF_MANY_IMAGES"
}
/**
 * Structured DOCX error with code, message, and recovery suggestion.
 */
declare class DOCXError extends Error {
    /** Error code for programmatic handling */
    readonly code: DOCXErrorCode;
    /** Human-readable recovery suggestion */
    readonly recovery?: string;
    /** Additional context about the error */
    readonly context?: Record<string, unknown>;
    /** Original error that caused this error */
    readonly originalCause?: Error;
    constructor(code: DOCXErrorCode, message: string, options?: {
        recovery?: string;
        context?: Record<string, unknown>;
        cause?: Error;
    });
    /**
     * Format error for logging with all details.
     */
    toDetailedString(): string;
    /**
     * Convert to JSON for serialization.
     */
    toJSON(): Record<string, unknown>;
}
/**
 * Structured warning for non-fatal issues.
 */
interface DOCXWarning {
    /** Warning code for programmatic handling */
    code: DOCXWarningCode;
    /** Human-readable message */
    message: string;
    /** Recovery suggestion or workaround */
    recovery?: string;
    /** Location in document (e.g., "page 2, element 5") */
    location?: string;
    /** Additional context */
    context?: Record<string, unknown>;
}
/**
 * Create a warning object.
 */
declare function createWarning(code: DOCXWarningCode, message: string, options?: {
    recovery?: string;
    location?: string;
    context?: Record<string, unknown>;
}): DOCXWarning;
/**
 * Format a warning for display.
 */
declare function formatWarning(warning: DOCXWarning): string;
/**
 * Create common errors with consistent messages.
 */
declare const Errors: {
    invalidDocument: (reason: string) => DOCXError;
    noPages: () => DOCXError;
    noDimensions: () => DOCXError;
    invalidDimensions: (width: number, height: number) => DOCXError;
    unknownElement: (elementType: string, location?: string) => DOCXError;
    elementNotImplemented: (elementType: string, location?: string) => DOCXError;
    imageFetchFailed: (url: string, reason: string) => DOCXError;
    imageTimeout: (url: string, timeoutMs: number) => DOCXError;
    imageTooLarge: (url: string, sizeBytes: number, maxBytes: number) => DOCXError;
    imageDecodeFailed: (source: string) => DOCXError;
    chartNoData: (chartId: string) => DOCXError;
    shapeNotSupported: (shapeType: string) => DOCXError;
    dependencyMissing: (name: string, purpose: string) => DOCXError;
    internal: (message: string, cause?: Error) => DOCXError;
};
/**
 * Create common warnings with consistent messages.
 */
declare const Warnings: {
    noMetadata: () => DOCXWarning;
    emptyPage: (pageNumber: number) => DOCXWarning;
    unknownElementFallback: (elementType: string, location: string) => DOCXWarning;
    imagePlaceholder: (reason: string, location?: string) => DOCXWarning;
    imageResized: (original: {
        width: number;
        height: number;
    }, scaled: {
        width: number;
        height: number;
    }) => DOCXWarning;
    imageConverted: (from: string, to: string) => DOCXWarning;
    chartPlaceholder: (chartType: string, reason: string) => DOCXWarning;
    shapePlaceholder: (shapeType: string) => DOCXWarning;
    fontFallback: (requested: string, fallback: string) => DOCXWarning;
    largeDocument: (pageCount: number, elementCount: number) => DOCXWarning;
    manyImages: (imageCount: number) => DOCXWarning;
};
/**
 * Check if an error is a DOCXError.
 */
declare function isDOCXError(error: unknown): error is DOCXError;
/**
 * Convert any error to a DOCXError.
 */
declare function toDOCXError(error: unknown): DOCXError;
/**
 * Collect warnings from multiple sources.
 */
declare class WarningCollector {
    private warnings;
    add(warning: DOCXWarning): void;
    addLegacy(message: string, location?: string): void;
    addAll(warnings: DOCXWarning[]): void;
    getWarnings(): DOCXWarning[];
    getMessages(): string[];
    hasWarnings(): boolean;
    clear(): void;
}

interface NativeOOXMLSerializerOptions {
    autoNoProof?: boolean;
    deterministic?: boolean;
    deterministicSeed?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    backgroundColor?: string;
    headingFont?: string;
    bodyFont?: string;
    monospaceFont?: string;
    resourceLimits?: Partial<ResourceLimits>;
    imageFetch?: ImageFetchConfig & {
        /** Maximum simultaneous external image fetches inside one native render. */
        maxConcurrentExternalFetches?: number;
        /** Aggregate external-fetch wall time allowed per native render (default: 30000ms). */
        maxTotalExternalFetchTimeMs?: number;
        /** Aggregate external image bytes allowed per native render (default: 50MB). */
        maxTotalExternalFetchBytes?: number;
    };
    startAbstractNumId?: number;
    startNumId?: number;
    columns?: number;
    trackChanges?: boolean;
    strictColors?: boolean;
    revisionInfo?: RevisionDefaultsInput;
    defaultCommentAuthor?: string;
    licenseKey?: string;
    /**
     * Cancellation signal checked at each page boundary. A long render
     * can be aborted without waiting for it to finish.
     */
    signal?: AbortSignal;
    /**
     * Per-page progress callback. Fires once after each page's XML is
     * serialized, with pageIndex/pageCount populated.
     */
    onProgress?: (progress: {
        phase: 'serializing';
        percent: number;
        pageIndex: number;
        pageCount: number;
        message?: string;
    }) => void;
    watermark?: string | {
        text?: string;
        opacity?: number;
        rotation?: number;
    };
}
interface NativeOOXMLSerializerResult {
    buffer: Buffer;
    mimeType: string;
    extension: string;
    stats: {
        /** Logical source page/section groups; Word determines physical pagination. */
        pageCount: number;
        logicalPageCount: number;
        elementCount: number;
        serializationTimeMs: number;
        xmlTimeMs: number;
        zipTimeMs: number;
        fileSizeBytes: number;
    };
    warnings: string[];
}
declare function serializeStructuredToNativeOOXML(document: StructuredDocument, options?: NativeOOXMLSerializerOptions): Promise<NativeOOXMLSerializerResult>;

/**
 * DocxDocument → StructuredDocument Adapter
 *
 * Converts the AI-friendly DocxDocument JSON schema into the StructuredDocument
 * format consumed by the DOCX serializer. This is the primary input path for
 * the JSON-first architecture.
 *
 * No React, no DOM, no browser APIs.
 */

/**
 * Convert a DocxDocument to StructuredDocument.
 */
declare function docxToStructured(doc: DocxDocument): StructuredDocument;

/**
 * Minimal structural interfaces mirroring @runstamp/pptx's PaperDocument types.
 *
 * Uses TypeScript structural subtyping so any real PaperDocument from
 * @runstamp/pptx is assignable without casting or importing core.
 */
interface PaperDocumentInput {
    meta?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string[];
        creator?: string;
    };
    slides: PaperSlideInput[];
    slideSize?: {
        width: number;
        height: number;
    };
    theme?: PaperThemeInput;
}
interface PaperSlideInput {
    style?: FlexStyleInput;
    background?: string | {
        color?: string;
        image?: string;
    };
    children: PaperNodeInput[];
}
interface PaperThemeInput {
    colorScheme?: Record<string, string>;
    fonts?: {
        heading?: string;
        body?: string;
    };
}
type PaperNodeInput = PaperTextNode | PaperViewNode | PaperImageNode | PaperTableNode | PaperChartNode | PaperGroupNode | PaperConnectorNode | PaperVideoNode | PaperAudioNode;
interface PaperTextNode {
    type: 'Text';
    style?: TextStyleInput;
    children?: string | ParagraphInput[];
    /** Flat text content (alternative to children) */
    value?: string;
}
interface PaperViewNode {
    type: 'View';
    style?: FlexStyleInput;
    shapeType?: string;
    textContent?: string;
    children?: PaperNodeInput[];
}
interface PaperImageNode {
    type: 'Image';
    src: string;
    alt?: string;
    style?: FlexStyleInput;
}
interface PaperTableNode {
    type: 'Table';
    style?: FlexStyleInput;
    columns?: {
        width?: number;
    }[];
    rows: PaperTableRowInput[];
}
interface PaperTableRowInput {
    isHeader?: boolean;
    cells: PaperTableCellInput[];
}
interface PaperTableCellInput {
    text?: string;
    runs?: TextRunInput[];
    rowSpan?: number;
    colSpan?: number;
    style?: {
        backgroundColor?: string;
        color?: string;
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: string;
        textAlign?: string;
        verticalAlign?: string;
        border?: string;
        padding?: number | {
            top?: number;
            right?: number;
            bottom?: number;
            left?: number;
        };
    };
}
interface PaperChartNode {
    type: 'Chart';
    chartType: string;
    title?: string;
    series?: {
        name?: string;
        data: number[];
        color?: string;
    }[];
    categories?: string[];
    axes?: {
        x?: {
            title?: string;
        };
        y?: {
            title?: string;
        };
    };
    style?: FlexStyleInput;
}
interface PaperGroupNode {
    type: 'Group';
    style?: FlexStyleInput;
    children: PaperNodeInput[];
}
interface PaperConnectorNode {
    type: 'Connector';
    [key: string]: unknown;
}
interface PaperVideoNode {
    type: 'Video';
    [key: string]: unknown;
}
interface PaperAudioNode {
    type: 'Audio';
    [key: string]: unknown;
}
interface FlexStyleInput {
    width?: number | string;
    height?: number | string;
    top?: number | string;
    left?: number | string;
    padding?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    margin?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    backgroundColor?: string | ColorModifierInput;
    border?: string;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: string;
    opacity?: number;
    zIndex?: number;
}
interface TextStyleInput extends FlexStyleInput {
    color?: string | ColorModifierInput;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: string;
    textAlign?: string;
    lineHeight?: number;
    textDecoration?: string;
}
interface ColorModifierInput {
    token?: string;
    value?: string;
    opacity?: number;
}
interface ParagraphInput {
    runs: TextRunInput[];
}
interface TextRunInput {
    text: string;
    style?: {
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: string | number;
        fontStyle?: string;
        textDecoration?: string;
        color?: string | ColorModifierInput;
        backgroundColor?: string;
        link?: string;
        superscript?: boolean;
        subscript?: boolean;
    };
}

/**
 * PaperDocument → StructuredDocument Adapter
 *
 * Converts PaperDocument (the PPTX-oriented input format from @runstamp/pptx)
 * into StructuredDocument consumed by the DOCX serializer.
 *
 * Eliminates the React → DOM → Puppeteer pipeline:
 *   Before: PaperDocument → React → DOM → Puppeteer → StructuredDocument → DOCX
 *   After:  PaperDocument → paperToStructured() → StructuredDocument → DOCX
 *
 * No React. No DOM. No Puppeteer. No browser.
 */

/**
 * Convert a PaperDocument to StructuredDocument.
 */
declare function paperToStructured(doc: PaperDocumentInput): StructuredDocument;

/**
 * HTML → StructuredDocument Adapter
 *
 * Converts an HTML string into the StructuredDocument format consumed by the
 * DOCX serializer. Follows the same patterns as docx-to-structured.ts.
 *
 * No React, no DOM, no browser APIs.
 */

interface HtmlConversionOptions {
    /** @deprecated Ignored. Inline CSS is always resolved; removed at the next major. */
    proEnabled?: boolean;
    cssMode?: 'inline' | 'ignore';
    baseUrl?: string;
}
/**
 * Convert an HTML string to a StructuredDocument.
 */
declare function convertHtmlToStructured(html: string, options?: HtmlConversionOptions): {
    document: StructuredDocument;
    warnings: string[];
};

/**
 * Unit conversion utilities for DOCX generation.
 *
 * DOCX uses several different unit systems:
 * - Twips (twentieths of a point): 1 inch = 1440 twips
 * - Half-points: Used for font sizes
 * - EMUs (English Metric Units): Used for images (914400 EMUs = 1 inch)
 * - DXA: Used for table widths (same as twips)
 *
 * # Branded output types (Phase 1.1)
 *
 * Every conversion function returns a **branded number** — a nominal
 * type that carries its unit in its type. Branded numbers are still
 * assignable to plain `number`, so legacy callers that store results
 * in `number` variables keep working without change. Consumers that
 * opt into branded parameter types (e.g. `Twips` instead of `number`)
 * get compile-time protection against unit confusion:
 *
 *   function writeWidth(w: Twips) { ... }
 *   writeWidth(pointsToHalfPoints(12));   // TYPE ERROR — HalfPoints ≠ Twips
 *   writeWidth(pxToTwips(800));           // OK
 *
 * Escape hatches: use `asTwips`, `asHalfPoints`, etc. when you are
 * passing a value that is *known* to already be in the target unit
 * (e.g. reading from an OOXML XML attribute). Document the reason.
 */
declare const __unitBrand: unique symbol;
type Twips = number & {
    readonly [__unitBrand]: 'twips';
};
type HalfPoints = number & {
    readonly [__unitBrand]: 'halfpoints';
};
type EMU = number & {
    readonly [__unitBrand]: 'emu';
};
type Points = number & {
    readonly [__unitBrand]: 'points';
};
type Px = number & {
    readonly [__unitBrand]: 'px';
};
type Inches = number & {
    readonly [__unitBrand]: 'inches';
};
type Mm = number & {
    readonly [__unitBrand]: 'mm';
};
type LineSpacingDxa = number & {
    readonly [__unitBrand]: 'line-dxa';
};
/** Escape hatches — use when you already know the unit of a raw number. */
declare const asTwips: (n: number) => Twips;
declare const asHalfPoints: (n: number) => HalfPoints;
declare const asEmu: (n: number) => EMU;
declare const asPoints: (n: number) => Points;
declare const asPx: (n: number) => Px;
declare const asInches: (n: number) => Inches;
declare const asMm: (n: number) => Mm;
declare const asLineSpacingDxa: (n: number) => LineSpacingDxa;
/**
 * Page size presets in twips.
 */
declare const PAGE_SIZES: {
    readonly LETTER: {
        readonly width: Twips;
        readonly height: Twips;
    };
    readonly A4: {
        readonly width: Twips;
        readonly height: Twips;
    };
    readonly LEGAL: {
        readonly width: Twips;
        readonly height: Twips;
    };
    readonly TABLOID: {
        readonly width: Twips;
        readonly height: Twips;
    };
    readonly A3: {
        readonly width: Twips;
        readonly height: Twips;
    };
    readonly A5: {
        readonly width: Twips;
        readonly height: Twips;
    };
};
/**
 * Convert CSS pixels to twips.
 */
declare function pxToTwips$1(px: number): Twips;
/**
 * Convert CSS pixels to half-points (DOCX font size unit).
 */
declare function pxToHalfPoints(px: number): HalfPoints;
declare function pointsToHalfPoints$1(pt: number): HalfPoints;
declare function inchesToTwips(inches: number): Twips;
declare function mmToTwips(mm: number): Twips;
declare function pxToEmu(px: number): EMU;
declare function inchesToEmu(inches: number): EMU;
/**
 * Convert line height multiplier to DOCX line spacing value (DXA-style).
 * DOCX line spacing 240 = single spacing (1.0)
 */
declare function lineHeightToDocx(multiplier: number): LineSpacingDxa;

/**
 * Detection utilities for identifying element types and patterns.
 *
 * Used for detecting code blocks, columns, table styles, etc.
 * from element properties and styles.
 */
/**
 * Extended style interface for detection (superset of ComputedStyle).
 * Allows additional CSS properties that may be available in browser extraction.
 */
interface ExtendedStyle {
    backgroundColor?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    textAlign?: string;
    display?: string;
    overflow?: string;
    textDecoration?: string;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number | string;
    marginRight?: number | string;
    lineHeight?: number | string;
    whiteSpace?: string;
    columnCount?: number | string;
    float?: string;
    position?: string;
    textIndent?: number;
    [key: string]: unknown;
}
/**
 * Check if a font family is monospace (typically used for code).
 */
declare function isMonospaceFont(fontFamily: string | undefined): boolean;
/**
 * Detect if an element is likely a code block.
 * Uses multiple heuristics: tag name, class names, font family.
 */
declare function isCodeBlock(element: {
    tagName?: string;
    className?: string;
    style?: ExtendedStyle;
}): boolean;
/**
 * Detect image alignment from styles.
 */
declare function detectImageAlignment(style: ExtendedStyle | undefined): 'left' | 'center' | 'right';

/**
 * Theme Presets for DOCX
 * ======================
 * Pre-built themes for professional document styling.
 *
 * Each theme defines:
 * - Color scheme (primary, secondary, accent colors)
 * - Typography (heading and body fonts)
 * - Spacing guidelines
 * - Table styling
 */
/**
 * Color scheme for a theme.
 */
interface ThemeColorScheme {
    /** Primary brand color (hex without #) */
    primary: string;
    /** Secondary color for accents (hex without #) */
    secondary: string;
    /** Accent color for highlights (hex without #) */
    accent: string;
    /** Text color (hex without #) */
    text: string;
    /** Muted text color (hex without #) */
    textMuted: string;
    /** Background color (hex without #) */
    background: string;
    /** Subtle background color for shading (hex without #) */
    backgroundSubtle: string;
    /** Border color (hex without #) */
    border: string;
    /** Success color (hex without #) */
    success: string;
    /** Warning color (hex without #) */
    warning: string;
    /** Error color (hex without #) */
    error: string;
}
/**
 * Typography settings for a theme.
 */
interface ThemeTypography {
    /** Heading font family */
    headingFont: string;
    /** Body font family */
    bodyFont: string;
    /** Monospace font family */
    monoFont: string;
    /** Base font size in points */
    baseFontSize: number;
    /** Heading size multipliers (h1-h6) */
    headingSizes: [number, number, number, number, number, number];
    /** Line height for body text */
    bodyLineHeight: number;
    /** Line height for headings */
    headingLineHeight: number;
}
/**
 * Spacing settings for a theme.
 */
interface ThemeSpacing {
    /** Paragraph spacing before in twips */
    paragraphBefore: number;
    /** Paragraph spacing after in twips */
    paragraphAfter: number;
    /** Heading spacing before in twips */
    headingBefore: number;
    /** Heading spacing after in twips */
    headingAfter: number;
    /** List item spacing in twips */
    listItemSpacing: number;
    /** Table cell padding in twips */
    tableCellPadding: number;
}
/**
 * Table styling for a theme.
 */
interface ThemeTableStyle {
    /** Header background color (hex without #) */
    headerBackground: string;
    /** Header text color (hex without #) */
    headerText: string;
    /** Whether headers are bold */
    headerBold: boolean;
    /** Alternating row background (hex without #) */
    alternateRowBackground: string;
    /** Border color (hex without #) */
    borderColor: string;
    /** Border width in eighths of a point */
    borderWidth: number;
    /** Border style */
    borderStyle: 'single' | 'double' | 'thick' | 'none';
}
/**
 * Complete theme definition.
 */
interface Theme$1 {
    /** Theme name */
    name: string;
    /** Theme description */
    description: string;
    /** Color scheme */
    colors: ThemeColorScheme;
    /** Typography settings */
    typography: ThemeTypography;
    /** Spacing settings */
    spacing: ThemeSpacing;
    /** Table styling */
    tables: ThemeTableStyle;
}
/**
 * Available theme preset names.
 */
type ThemePresetName = 'corporate' | 'modern' | 'classic' | 'academic' | 'minimal' | 'dark' | 'colorful';
/**
 * Corporate theme - Professional blue color scheme.
 */
declare const CORPORATE_THEME: Theme$1;
/**
 * Modern theme - Clean and contemporary design.
 */
declare const MODERN_THEME: Theme$1;
/**
 * Classic theme - Traditional elegant styling.
 */
declare const CLASSIC_THEME: Theme$1;
/**
 * Academic theme - Scholarly document styling.
 */
declare const ACADEMIC_THEME: Theme$1;
/**
 * Minimal theme - Clean with minimal decoration.
 */
declare const MINIMAL_THEME: Theme$1;
/**
 * Dark theme - Dark backgrounds with light text.
 * Note: Word doesn't fully support dark themes, but this
 * provides consistent colors for shaded elements.
 */
declare const DARK_THEME$1: Theme$1;
/**
 * Get a theme preset by name. Pro feature.
 */
declare function getThemePreset(name: ThemePresetName): Theme$1;
/**
 * Get the default theme (corporate).
 */
declare function getDefaultTheme(): Theme$1;

/**
 * Placeholder Scanner for DOCX Template Hydration
 *
 * Scans OOXML document.xml (and headers/footers) for Mustache-style
 * placeholders like {{client_name}} or {{pricing_table}}.
 *
 * Key challenge: Word often splits placeholder text across multiple
 * <w:r> (run) elements due to spellcheck, formatting, or editing history.
 * For example, "{{client_name}}" might be stored as:
 *   <w:r><w:t>{{</w:t></w:r>
 *   <w:r><w:t>client_</w:t></w:r>
 *   <w:r><w:t>name}}</w:t></w:r>
 *
 * This scanner normalizes adjacent runs before scanning.
 */
/** A located placeholder within the OOXML structure */
interface PlaceholderMatch {
    /** The placeholder key (without braces), e.g. "client_name" */
    key: string;
    /** The full placeholder text, e.g. "{{client_name}}" */
    fullMatch: string;
    /** The XML file path within the DOCX zip (e.g. "word/document.xml") */
    filePath: string;
    /** The marker syntax used by this placeholder. */
    syntax: "mustache" | "office";
}
/**
 * Scan XML content for placeholders.
 *
 * This operates on raw XML strings. Before scanning, it normalizes
 * split runs by concatenating adjacent <w:t> content.
 */
declare function scanForPlaceholders(xmlContent: string, filePath: string, syntax?: "mustache" | "office" | "auto"): PlaceholderMatch[];

/**
 * OOXML Injector for DOCX Template Hydration
 *
 * Generates OOXML fragments from structured data values for injection
 * into DOCX templates. Handles:
 * - Plain text (string values)
 * - Tables (array of objects → <w:tbl>)
 * - Images (base64/URL → drawing elements)
 * - Paragraphs with formatting
 */
/** Data value types for template hydration */
type HydrationValue = string | number | boolean | HydrationTable | HydrationImage | HydrationRichText;
/** Table data for injection */
interface HydrationTable {
    type: 'table';
    headers: string[];
    rows: string[][];
    style?: 'plain' | 'striped' | 'bordered';
}
/** Image data for injection */
interface HydrationImage {
    type: 'image';
    /** Base64 data URI or external URL */
    src: string;
    /** Width in pixels */
    width?: number;
    /** Height in pixels */
    height?: number;
    /** Alt text */
    alt?: string;
}
/** Rich text with formatting */
interface HydrationRichText {
    type: 'richtext';
    paragraphs: Array<{
        text: string;
        bold?: boolean;
        italic?: boolean;
        fontSize?: number;
        color?: string;
        alignment?: 'left' | 'center' | 'right';
    }>;
}

/**
 * DOCX Template Hydrator
 *
 * Core engine for the template hydration (patch) system.
 * Accepts a .docx buffer + data map, finds {{placeholder}} patterns,
 * replaces them with content, and returns a modified .docx buffer.
 *
 * Per PRD §4: User uploads a .docx with Mustache placeholders.
 * Engine unzips, finds placeholders, replaces with text or generated
 * OOXML (tables, images), preserving all template styling.
 */

interface HydrationImageLimits {
    /** Maximum decoded bytes for a single inserted image. */
    maxImageBytes?: number;
    /** Maximum decoded bytes across all inserted images. */
    maxTotalImageBytes?: number;
    /** Allowed data URI MIME types for inserted images. */
    allowedMimeTypes?: string[];
}
/** Resource ceilings applied before an untrusted DOCX template is processed. */
interface HydrationArchiveLimits {
    /** Maximum compressed template size. Default: 25 MiB. */
    maxCompressedBytes?: number;
    /** Maximum number of ZIP entries, including directories. Default: 2,048. */
    maxEntries?: number;
    /** Maximum expanded bytes for any single file part. Default: 16 MiB. */
    maxPartBytes?: number;
    /** Maximum expanded bytes across all file parts. Default: 100 MiB. */
    maxTotalExpandedBytes?: number;
}
interface HydrationReplacementTelemetry {
    placeholder: string;
    part: string;
    path: string;
    runRange: string;
    replacementKind: string;
}
interface HydrationUnfilledTelemetry {
    placeholder: string;
    part: string;
    path: string;
    mode: 'keep' | 'remove';
}
interface HydrationWarningTelemetry {
    code: string;
    part: string;
    path: string;
    recovery?: string;
}
interface HydrationTelemetry {
    replaced: HydrationReplacementTelemetry[];
    unfilled: HydrationUnfilledTelemetry[];
    warnings: HydrationWarningTelemetry[];
}
/** Options for template hydration */
interface HydrationOptions {
    /** Whether to throw on missing placeholders (default: false — leaves them as-is) */
    strictMode?: boolean;
    /** Whether to remove unfilled placeholders (default: false) */
    removeUnfilled?: boolean;
    /** Template marker dialect to process. Default: auto-detect. */
    syntax?: "mustache" | "office" | "auto";
    /** Whether zip entry timestamps are normalized for byte-reproducible hydration output. Default: true. */
    deterministicZip?: boolean;
    /** Resource limits for image insertions during hydration. */
    imageLimits?: HydrationImageLimits;
    /** Resource limits for the input DOCX ZIP archive. */
    archiveLimits?: HydrationArchiveLimits;
}
/** Result of template hydration */
interface HydrationResult {
    /** The hydrated DOCX buffer */
    buffer: Buffer;
    /** Placeholders that were found and replaced */
    replaced: string[];
    /** Placeholders found in template but not in data */
    unfilled: string[];
    /** Warnings generated during hydration */
    warnings: string[];
    /** Structured telemetry for reviewerless hydration gates */
    telemetry: HydrationTelemetry;
    /** Statistics */
    stats: {
        totalPlaceholders: number;
        replacedCount: number;
        unfilledCount: number;
        processingTimeMs: number;
        fileSizeBytes: number;
    };
}
/**
 * Hydrate a DOCX template with data.
 *
 * @param templateBuffer - The original .docx file as a Buffer
 * @param data - Key-value map where keys match placeholder names
 * @param options - Hydration options
 * @returns The modified .docx buffer with placeholders replaced
 */
declare function hydrateTemplate(templateBuffer: Buffer | Uint8Array, data: Record<string, HydrationValue>, options?: HydrationOptions): Promise<HydrationResult>;

/**
 * Batch DOCX Generation
 *
 * Sequential batch rendering and hydration with ZIP output,
 * custom file naming, and error isolation.
 */

/**
 * Render a batch of data items against a DocxDocument template.
 * Each item's data is merged into template placeholders, then rendered to DOCX.
 *
 * @param template - DocxDocument with {{placeholder}} patterns in text fields
 * @param data - Array of data objects, one per output document
 * @param options - Batch options (file naming, output format, etc.)
 */
declare function batchRender(template: DocxDocument, data: Record<string, unknown>[], options?: BatchOptions): Promise<BatchResult>;
/**
 * Hydrate a batch of data items against an existing DOCX template buffer.
 * Each item is independently hydrated via hydrateDocx.
 *
 * @param templateBuffer - An existing .docx file buffer with {{placeholder}} patterns
 * @param data - Array of data objects, one per output document
 * @param options - Batch options (file naming, output format, etc.)
 */
declare function batchHydrate(templateBuffer: Buffer, data: Record<string, unknown>[], options?: BatchOptions): Promise<BatchResult>;

/**
 * Polyglot Error Handler
 * ======================
 * Centralized error and warning collection for polyglot rendering.
 */
type RenderPhase = 'parse' | 'layout' | 'paginate' | 'serialize';
interface RenderError {
    phase: RenderPhase;
    nodeId?: string;
    nodeType?: string;
    message: string;
    stack?: string;
    recoverable: boolean;
}
interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}
/**
 * Collects errors and warnings during polyglot rendering.
 * Provides structured error reporting and recovery information.
 */
declare class PolyglotErrorCollector {
    private errors;
    private warnings;
    private validationErrors;
    /**
     * Add a render error
     */
    addError(error: RenderError): void;
    /**
     * Add a warning (non-fatal issue)
     */
    addWarning(message: string): void;
    /**
     * Add a validation error
     */
    addValidationError(error: ValidationError): void;
    /**
     * Check if any errors occurred
     */
    hasErrors(): boolean;
    /**
     * Check if any fatal (non-recoverable) errors occurred
     */
    hasFatalErrors(): boolean;
    /**
     * Check if validation passed
     */
    isValid(): boolean;
    /**
     * Get all errors
     */
    getErrors(): RenderError[];
    /**
     * Get all warnings
     */
    getWarnings(): string[];
    /**
     * Get all validation errors
     */
    getValidationErrors(): ValidationError[];
    /**
     * Get a full error report
     */
    getReport(): {
        valid: boolean;
        errors: RenderError[];
        warnings: string[];
        validationErrors: ValidationError[];
        summary: string;
    };
    /**
     * Clear all collected errors and warnings
     */
    clear(): void;
    /**
     * Create error for failed component rendering
     */
    static componentError(componentName: string, error: Error, nodeId?: string): RenderError;
    /**
     * Create error for layout calculation failure
     */
    static layoutError(message: string, nodeId?: string, nodeType?: string): RenderError;
    /**
     * Create error for serialization failure
     */
    static serializeError(message: string, nodeId?: string, nodeType?: string, recoverable?: boolean): RenderError;
}
/**
 * Validate a polyglot document structure
 */
declare function validateDocument(doc: unknown): {
    valid: boolean;
    errors: ValidationError[];
};
/**
 * Validate a React element for polyglot rendering
 */
declare function validateReactElement(element: unknown): {
    valid: boolean;
    errors: ValidationError[];
};
/**
 * Get or create the global error collector
 */
declare function getErrorCollector(): PolyglotErrorCollector;
/**
 * Reset the global error collector
 */
declare function resetErrorCollector(): void;

/**
 * Performance Monitor
 * ===================
 * Detailed performance metrics collection for pagination operations.
 * Tracks timing, operation counts, and provides export/logging utilities.
 *
 * Phase 11 of Polyglot hardening.
 */
/** Individual timing entry for an operation */
interface TimingEntry {
    /** Operation name */
    operation: string;
    /** Start timestamp (ms) */
    startTime: number;
    /** End timestamp (ms) */
    endTime: number;
    /** Duration in milliseconds */
    durationMs: number;
    /** Optional metadata about the operation */
    metadata?: Record<string, unknown>;
}
/** Aggregated timing statistics for an operation type */
interface TimingStats {
    /** Total number of times this operation was performed */
    count: number;
    /** Total time spent in this operation (ms) */
    totalMs: number;
    /** Minimum duration (ms) */
    minMs: number;
    /** Maximum duration (ms) */
    maxMs: number;
    /** Average duration (ms) */
    avgMs: number;
    /** Percentage of total time */
    percentOfTotal: number;
}
/** Complete performance metrics */
interface PerformanceMetrics {
    /** Session identifier */
    sessionId: string;
    /** Start timestamp */
    startTime: number;
    /** End timestamp */
    endTime: number;
    /** Total duration in milliseconds */
    totalDurationMs: number;
    /** Operation counts */
    counts: {
        nodesProcessed: number;
        pagesCreated: number;
        tablesSplit: number;
        textFragmentations: number;
        overflowEvents: number;
        widowOrphanAdjustments: number;
        shrinkToFitApplied: number;
        placementAttempts: number;
        heartbeatChecks: number;
    };
    /** Timing breakdown by operation type */
    timing: {
        /** Time spent in pagination loop */
        pagination: TimingStats;
        /** Time spent splitting tables */
        tableSplitting: TimingStats;
        /** Time spent fragmenting text */
        textFragmentation: TimingStats;
        /** Time spent handling overflow */
        overflowHandling: TimingStats;
        /** Time spent in node placement */
        nodePlacement: TimingStats;
        /** Time spent in prescan */
        prescan: TimingStats;
        /** Time spent in page creation */
        pageCreation: TimingStats;
    };
    /** Per-page timing (first 100 pages) */
    perPageTiming: Array<{
        pageIndex: number;
        durationMs: number;
        nodeCount: number;
    }>;
    /** Throughput metrics */
    throughput: {
        /** Nodes per second */
        nodesPerSecond: number;
        /** Pages per second */
        pagesPerSecond: number;
        /** Average time per page (ms) */
        avgTimePerPageMs: number;
        /** Average time per node (ms) */
        avgTimePerNodeMs: number;
    };
    /** Memory metrics (if available) */
    memory?: {
        /** Peak heap used (bytes) */
        peakHeapUsed: number;
        /** Heap at start (bytes) */
        startHeapUsed: number;
        /** Heap at end (bytes) */
        endHeapUsed: number;
        /** Memory delta (bytes) */
        deltaBytes: number;
    };
}
/** Configuration for performance monitoring */
interface PerformanceMonitorConfig {
    /** Enable detailed timing (may have overhead) */
    enableDetailedTiming?: boolean;
    /** Maximum per-page entries to track */
    maxPerPageEntries?: number;
    /** Enable memory tracking */
    enableMemoryTracking?: boolean;
    /** Custom session ID */
    sessionId?: string;
}
/**
 * Performance monitor for tracking pagination metrics.
 *
 * Usage:
 * ```typescript
 * const monitor = new PerformanceMonitor();
 * monitor.start();
 *
 * // During pagination...
 * monitor.startOperation('tableSplitting');
 * // ... split table ...
 * monitor.endOperation('tableSplitting');
 *
 * monitor.incrementCount('tablesSplit');
 *
 * monitor.end();
 * const metrics = monitor.getMetrics();
 * console.log(monitor.formatSummary());
 * ```
 */
declare class PerformanceMonitor {
    private config;
    private sessionId;
    private startTime;
    private endTime;
    private isRunning;
    private timingEntries;
    private activeOperations;
    private perPageTiming;
    private currentPageStart;
    private currentPageNodeCount;
    private counts;
    private startMemory;
    private peakHeapUsed;
    constructor(config?: PerformanceMonitorConfig);
    /**
     * Start monitoring session.
     */
    start(): void;
    /**
     * End monitoring session.
     */
    end(): void;
    /**
     * Start timing an operation.
     */
    startOperation(operation: string, _metadata?: Record<string, unknown>): void;
    /**
     * End timing an operation.
     */
    endOperation(operation: string, metadata?: Record<string, unknown>): void;
    /**
     * Record time for a synchronous operation.
     */
    timeOperation<T>(operation: string, fn: () => T, metadata?: Record<string, unknown>): T;
    /**
     * Record time for an async operation.
     */
    timeOperationAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T>;
    /**
     * Increment a count.
     */
    incrementCount(counter: keyof typeof this.counts, amount?: number): void;
    /**
     * Start timing a new page.
     */
    startPage(_pageIndex: number): void;
    /**
     * End timing for current page.
     */
    endPage(pageIndex: number): void;
    /**
     * Record a node being added to current page.
     */
    recordNodePlaced(): void;
    /**
     * Get aggregated timing stats for an operation type.
     */
    private getTimingStats;
    /**
     * Update peak memory tracking.
     */
    private updatePeakMemory;
    /**
     * Generate a unique session ID.
     */
    private generateSessionId;
    /**
     * Get complete performance metrics.
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get metrics as JSON string.
     */
    toJSON(pretty?: boolean): string;
    /**
     * Format a human-readable summary.
     */
    formatSummary(): string;
    /**
     * Log summary to console.
     */
    logSummary(): void;
    /**
     * Check if monitor is currently running.
     */
    isActive(): boolean;
    /**
     * Get current counts (for live updates).
     */
    getCurrentCounts(): typeof this.counts;
    /**
     * Get elapsed time since start.
     */
    getElapsedMs(): number;
}
/**
 * Get or create the global performance monitor.
 */
declare function getPerformanceMonitor(): PerformanceMonitor;
/**
 * Reset the global performance monitor.
 */
declare function resetPerformanceMonitor(): void;
/**
 * Create a new performance monitor with custom config.
 */
declare function createPerformanceMonitor(config?: PerformanceMonitorConfig): PerformanceMonitor;
/**
 * Format bytes as human-readable string.
 */
declare function formatBytes$1(bytes: number): string;
/**
 * Format milliseconds as human-readable string.
 */
declare function formatDuration(ms: number): string;

/**
 * Pagination Constants
 * ====================
 * Safety limits and default values for the VLT Paginator.
 */
/** Maximum rows in a table before rejecting */
declare const MAX_TABLE_ROWS = 10000;
/** Maximum columns in a table before rejecting */
declare const MAX_TABLE_COLS = 200;
/** Maximum cell map entries (rows * cols estimate) */
declare const MAX_CELL_MAP_ENTRIES = 200000;
/** Maximum recursion depth for splitting operations */
declare const MAX_SPLIT_DEPTH = 50;
/** Maximum iterations in pagination loop */
declare const MAX_PAGINATION_ITERATIONS = 100000;
/** Default global timeout in milliseconds */
declare const DEFAULT_GLOBAL_TIMEOUT = 30000;
/** Default heartbeat interval in milliseconds (progress must be made within this time) */
declare const DEFAULT_HEARTBEAT_INTERVAL = 5000;
/** Maximum placement attempts for a single node before declaring it impossible */
declare const MAX_PLACEMENT_ATTEMPTS = 10;

/**
 * Word Styles System
 * ==================
 * True Word Styles support for consistent document branding.
 *
 * Phase 16 of Polyglot hardening (DOC-01 requirement).
 *
 * This module enables:
 * - Named paragraph styles (Heading 1, Body Text, etc.)
 * - Character styles (Emphasis, Strong, etc.)
 * - Style inheritance (based on other styles)
 * - Style cascade (changes propagate through document)
 * - Quick style gallery entries
 *
 * When a user opens the DOCX in Word:
 * - Changing "Heading 1" style updates ALL Heading 1 text
 * - Styles appear in the Styles gallery
 * - Navigation pane shows headings properly
 *
 * OOXML Structure:
 * ```xml
 * <w:styles>
 *   <w:style w:type="paragraph" w:styleId="Heading1">
 *     <w:name w:val="Heading 1"/>
 *     <w:basedOn w:val="Normal"/>
 *     <w:next w:val="Normal"/>
 *     <w:qFormat/>
 *     <w:pPr>...</w:pPr>
 *     <w:rPr>...</w:rPr>
 *   </w:style>
 * </w:styles>
 * ```
 */
/** Style type */
type WordStyleType = 'paragraph' | 'character' | 'table' | 'numbering';
/** Text alignment */
type TextAlignment = 'left' | 'center' | 'right' | 'justify' | 'both';
/** Vertical alignment */
type VerticalAlignment = 'top' | 'center' | 'bottom';
/** Underline style */
type UnderlineStyle = 'single' | 'double' | 'thick' | 'dotted' | 'dashed' | 'wave' | 'none';
/** Font properties for styles */
interface StyleFontProperties {
    /** Font family name */
    name?: string;
    /** Font size in points */
    size?: number;
    /** Bold */
    bold?: boolean;
    /** Italic */
    italic?: boolean;
    /** Underline */
    underline?: boolean | UnderlineStyle;
    /** Strikethrough */
    strike?: boolean;
    /** Small caps */
    smallCaps?: boolean;
    /** All caps */
    allCaps?: boolean;
    /** Font color (hex without #) */
    color?: string;
    /** Highlight color */
    highlight?: string;
    /** Character spacing in points (positive = expanded, negative = condensed) */
    characterSpacing?: number;
}
/** Paragraph properties for styles */
interface StyleParagraphProperties {
    /** Text alignment */
    alignment?: TextAlignment;
    /** Spacing before paragraph in points */
    spaceBefore?: number;
    /** Spacing after paragraph in points */
    spaceAfter?: number;
    /** Line spacing (1.0 = single, 1.5 = 1.5 lines, 2.0 = double) */
    lineSpacing?: number;
    /** Line spacing rule */
    lineSpacingRule?: 'auto' | 'atLeast' | 'exact';
    /** First line indent in points (positive = indent, negative = hanging) */
    firstLineIndent?: number;
    /** Left indent in points */
    leftIndent?: number;
    /** Right indent in points */
    rightIndent?: number;
    /** Keep lines together (prevent page break within paragraph) */
    keepLines?: boolean;
    /** Keep with next paragraph (prevent page break between) */
    keepNext?: boolean;
    /** Page break before */
    pageBreakBefore?: boolean;
    /** Widow/orphan control */
    widowControl?: boolean;
    /** Outline level (0-8, used for TOC and Navigation Pane) */
    outlineLevel?: number;
    /** Border around paragraph */
    border?: {
        top?: {
            style: string;
            size: number;
            color: string;
        };
        bottom?: {
            style: string;
            size: number;
            color: string;
        };
        left?: {
            style: string;
            size: number;
            color: string;
        };
        right?: {
            style: string;
            size: number;
            color: string;
        };
    };
    /** Shading/background color */
    shading?: string;
}
/** Complete style definition */
interface WordStyle {
    /** Unique style ID (used internally) */
    id: string;
    /** Display name (shown in Word UI) */
    name: string;
    /** Style type */
    type: WordStyleType;
    /** Base style ID to inherit from */
    basedOn?: string;
    /** Next style ID (applied to next paragraph after pressing Enter) */
    next?: string;
    /** Include in Quick Styles gallery */
    quickFormat?: boolean;
    /** UI priority (lower = appears first in gallery) */
    uiPriority?: number;
    /** Hide from UI but still available */
    semiHidden?: boolean;
    /** Prevent direct formatting from overriding */
    locked?: boolean;
    /** Font/run properties */
    font?: StyleFontProperties;
    /** Paragraph properties */
    paragraph?: StyleParagraphProperties;
}
/** Style set - collection of related styles */
interface WordStyleSet {
    /** Style set name */
    name: string;
    /** Description */
    description?: string;
    /** Styles in this set */
    styles: WordStyle[];
    /** Default paragraph style ID */
    defaultParagraphStyle?: string;
    /** Default character style ID */
    defaultCharacterStyle?: string;
}
/** Standard Word style IDs */
declare const STYLE_IDS: {
    readonly NORMAL: "Normal";
    readonly HEADING_1: "Heading1";
    readonly HEADING_2: "Heading2";
    readonly HEADING_3: "Heading3";
    readonly HEADING_4: "Heading4";
    readonly HEADING_5: "Heading5";
    readonly HEADING_6: "Heading6";
    readonly TITLE: "Title";
    readonly SUBTITLE: "Subtitle";
    readonly QUOTE: "Quote";
    readonly INTENSE_QUOTE: "IntenseQuote";
    readonly LIST_PARAGRAPH: "ListParagraph";
    readonly TOC_HEADING: "TOCHeading";
    readonly TOC_1: "TOC1";
    readonly TOC_2: "TOC2";
    readonly TOC_3: "TOC3";
    readonly CAPTION: "Caption";
    readonly FOOTER: "Footer";
    readonly HEADER: "Header";
    readonly DEFAULT_PARAGRAPH_FONT: "DefaultParagraphFont";
    readonly EMPHASIS: "Emphasis";
    readonly STRONG: "Strong";
    readonly BOOK_TITLE: "BookTitle";
    readonly SUBTLE_EMPHASIS: "SubtleEmphasis";
    readonly INTENSE_EMPHASIS: "IntenseEmphasis";
    readonly SUBTLE_REFERENCE: "SubtleReference";
    readonly INTENSE_REFERENCE: "IntenseReference";
    readonly HYPERLINK: "Hyperlink";
};
/** Normal (default paragraph) style */
declare const STYLE_NORMAL: WordStyle;
/** Heading 1 style */
declare const STYLE_HEADING_1: WordStyle;
/** Heading 2 style */
declare const STYLE_HEADING_2: WordStyle;
/** Heading 3 style */
declare const STYLE_HEADING_3: WordStyle;
/** Heading 4 style */
declare const STYLE_HEADING_4: WordStyle;
/** Title style */
declare const STYLE_TITLE: WordStyle;
/** Subtitle style */
declare const STYLE_SUBTITLE: WordStyle;
/** Quote style */
declare const STYLE_QUOTE: WordStyle;
/** List Paragraph style */
declare const STYLE_LIST_PARAGRAPH: WordStyle;
/** Caption style */
declare const STYLE_CAPTION: WordStyle;
/** Emphasis (italic) character style */
declare const STYLE_EMPHASIS: WordStyle;
/** Strong (bold) character style */
declare const STYLE_STRONG: WordStyle;
/** Hyperlink character style */
declare const STYLE_HYPERLINK: WordStyle;
/** Office default style set */
declare const OFFICE_DEFAULT_STYLES: WordStyleSet;
/** Legal document style set */
declare const LEGAL_STYLES: WordStyleSet;
/** Corporate branding style set */
declare const CORPORATE_STYLES: WordStyleSet;
/** Academic/thesis style set */
declare const ACADEMIC_STYLES: WordStyleSet;
/**
 * Registry for managing Word styles
 */
declare class WordStyleRegistry {
    private styles;
    private defaultStyleSet;
    constructor(styleSet?: WordStyleSet);
    /**
     * Load a style set
     */
    loadStyleSet(styleSet: WordStyleSet): void;
    /**
     * Get a style by ID
     */
    getStyle(id: string): WordStyle | undefined;
    /**
     * Register a style
     */
    registerStyle(style: WordStyle): void;
    /**
     * Check if a style exists
     */
    hasStyle(id: string): boolean;
    /**
     * Get all styles
     */
    getAllStyles(): WordStyle[];
    /**
     * Get paragraph styles only
     */
    getParagraphStyles(): WordStyle[];
    /**
     * Get character styles only
     */
    getCharacterStyles(): WordStyle[];
    /**
     * Get styles for Quick Styles gallery
     */
    getQuickStyles(): WordStyle[];
    /**
     * Create a custom style based on an existing style
     */
    createCustomStyle(baseStyleId: string, customizations: Partial<WordStyle> & {
        id: string;
        name: string;
    }): WordStyle;
    /**
     * Modify an existing style
     */
    modifyStyle(id: string, modifications: Partial<WordStyle>): WordStyle | undefined;
    /**
     * Get resolved style (with inheritance applied)
     */
    getResolvedStyle(id: string): WordStyle | undefined;
    /**
     * Export styles for serialization
     */
    exportStyles(): WordStyleSet;
}
/**
 * Get the global Word style registry
 */
declare function getWordStyleRegistry(): WordStyleRegistry;
/**
 * Reset the global registry
 */
declare function resetWordStyleRegistry(): void;
/**
 * Create a new Word style registry
 */
declare function createWordStyleRegistry(styleSet?: WordStyleSet): WordStyleRegistry;
/**
 * Validate a word style
 */
declare function validateWordStyle(style: WordStyle): string[];
/**
 * Convert points to OOXML twips (twentieths of a point)
 */
declare function pointsToTwips(points: number): number;
/**
 * Convert points to OOXML half-points
 */
declare function pointsToHalfPoints(points: number): number;
/**
 * Convert line spacing multiplier to OOXML line spacing value
 */
declare function lineSpacingToOOXML(multiplier: number): number;
/**
 * Get heading level from style ID
 */
declare function getHeadingLevel(styleId: string): number | undefined;
/**
 * Create a heading style for a specific level
 */
declare function createHeadingStyle(level: number, options?: Partial<WordStyle>): WordStyle;

/**
 * @runstamp/polyglot-core - Types
 * ================================
 * Extended Virtual Layout Tree for multi-format output (PDF, PPTX, DOCX)
 *
 * Design Principle: These types EXTEND the existing VLT, not replace it.
 * The PDF engine remains completely untouched.
 */
type OutputFormat = 'pdf' | 'pptx' | 'docx';
/**
 * Extended node types for Polyglot support
 */
type PolyglotNodeType = 'document' | 'page' | 'block' | 'text' | 'heading' | 'paragraph' | 'image' | 'table' | 'row' | 'cell' | 'list' | 'list-item' | 'chart' | 'shape' | 'fragment';
/**
 * Absolute geometry in CSS pixels
 * All coordinates are relative to the page/slide
 */
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Rich text span with formatting
 */
interface RichTextSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    link?: string;
}
/**
 * Text content with optional rich formatting
 */
interface TextContent {
    /** Plain text content */
    plain: string;
    /** Rich text spans (for formatted content) */
    spans?: RichTextSpan[];
    /** Text alignment */
    align?: 'left' | 'center' | 'right' | 'justify';
    /** Line height multiplier */
    lineHeight?: number;
}
/**
 * Common style properties applicable to all formats
 */
interface CommonStyles {
    backgroundColor?: string;
    backgroundImage?: string;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
    borderRadius?: number;
    borderTop?: {
        width: number;
        color: string;
        style: string;
    };
    borderRight?: {
        width: number;
        color: string;
        style: string;
    };
    borderBottom?: {
        width: number;
        color: string;
        style: string;
    };
    borderLeft?: {
        width: number;
        color: string;
        style: string;
    };
    padding?: number | {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    margin?: number | {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    lineHeight?: number;
    color?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    boxShadow?: {
        offsetX: number;
        offsetY: number;
        blur: number;
        color: string;
    };
    opacity?: number;
}
/**
 * PPTX-specific rendering hints
 */
interface PPTXHints {
    /** Shape type for PowerPoint */
    shapeType?: 'textbox' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'custom';
    /** Master slide reference */
    masterSlide?: string;
    /** Slide layout reference */
    slideLayout?: string;
    /** Animation specification */
    animation?: {
        type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'none';
        delay?: number;
        duration?: number;
    };
    /** Speaker notes content */
    speakerNotes?: string;
    /** Whether this element should be grouped */
    groupId?: string;
    /** Z-order (layering) */
    zOrder?: number;
}
/**
 * DOCX-specific rendering hints
 */
interface DOCXHints {
    /** Word style ID (e.g., "Heading1", "Normal", "Caption") */
    styleId?: string;
    /** Heading level (1-9) */
    headingLevel?: number;
    /** List level for nested lists (0-indexed) */
    listLevel?: number;
    /** List type */
    listType?: 'bullet' | 'number' | 'letter' | 'roman';
    /** Native Word keep-together property */
    keepLines?: boolean;
    /** Native Word keep-with-next property */
    keepNext?: boolean;
    /** Page break before this element */
    pageBreakBefore?: boolean;
    /** Section break type */
    sectionBreak?: 'continuous' | 'nextPage' | 'evenPage' | 'oddPage';
    /** Bookmark ID for cross-references */
    bookmarkId?: string;
    /** Table of contents level (0 = exclude) */
    tocLevel?: number;
    /** Footnote content (creates a footnote reference) */
    footnote?: string;
    /** Comment/annotation */
    comment?: {
        text: string;
        author?: string;
        date?: Date;
    };
    /** Cross-reference to a bookmark */
    crossReference?: {
        bookmarkId: string;
        format?: 'page' | 'text' | 'number';
    };
    /** Whether this is a header element */
    isHeader?: boolean;
    /** Whether this is a footer element */
    isFooter?: boolean;
}
/**
 * Render-as hints for format-specific behavior
 */
interface RenderAsHints {
    pdf?: 'default' | 'vector' | 'raster';
    pptx?: 'native' | 'shape' | 'image' | 'chart';
    docx?: 'paragraph' | 'table' | 'image' | 'drawing';
}
/**
 * The Polyglot Layout Node - Extended VLT for multi-format output
 *
 * This is the core data structure that serializers consume.
 * Each serializer (PDF, PPTX, DOCX) interprets this tree according
 * to its format's capabilities and conventions.
 */
interface PolyglotNode {
    /** Unique identifier */
    id: string;
    /** Node type */
    type: PolyglotNodeType;
    /** Absolute geometry (CSS pixels, relative to page/slide) */
    rect: Rect;
    /** Child nodes */
    children?: PolyglotNode[];
    /** Parent node ID */
    parentId?: string;
    /** Text content (for text/heading/paragraph nodes) */
    textContent?: TextContent;
    /** Image source (for image nodes) */
    imageSrc?: string;
    /** Image data as base64 (for embedded images) */
    imageData?: string;
    /** Alt text for accessibility */
    altText?: string;
    /** Row span for table cells */
    rowSpan?: number;
    /** Column span for table cells */
    colSpan?: number;
    /** Table column widths (percentages or pixels) */
    columnWidths?: number[];
    /** Whether this row is a table header (repeats on each page) */
    isTableHeader?: boolean;
    /** List item marker (bullet, number, etc.) */
    listMarker?: string;
    /** List item index (for numbered lists) */
    listIndex?: number;
    /** Common style properties */
    styles?: CommonStyles;
    /** PPTX-specific rendering hints */
    pptx?: PPTXHints;
    /** DOCX-specific rendering hints */
    docx?: DOCXHints;
    /** Render-as hints for format-specific behavior */
    renderAs?: RenderAsHints;
    /** Chart data for native chart rendering */
    chartData?: {
        type: 'bar' | 'column' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';
        series: Array<{
            name: string;
            data: Array<{
                x: string | number;
                y: number;
            }>;
            color?: string;
        }>;
        xAxis?: {
            label?: string;
            categories?: string[];
        };
        yAxis?: {
            label?: string;
            min?: number;
            max?: number;
        };
        showLegend?: boolean;
        legendPosition?: 'top' | 'bottom' | 'left' | 'right';
        showDataLabels?: boolean;
        title?: string;
    };
    /** Custom metadata */
    metadata?: Record<string, unknown>;
    /** Original React component name (for debugging) */
    componentName?: string;
    /** Original props (for debugging) */
    originalProps?: Record<string, unknown>;
}
/**
 * Page/slide dimensions
 */
interface PageDimensions {
    /** Width in CSS pixels */
    width: number;
    /** Height in CSS pixels */
    height: number;
    /** Margin in CSS pixels */
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
/**
 * Document metadata
 */
interface DocumentMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    createdAt?: Date;
    modifiedAt?: Date;
}
/**
 * Page/slide in the document
 */
interface PolyglotPage {
    /** Page index (0-based) */
    index: number;
    /** Page dimensions */
    dimensions: PageDimensions;
    /** Root node for this page's content */
    content: PolyglotNode;
    /** PPTX: Slide master reference */
    masterSlide?: string;
    /** PPTX: Slide layout reference */
    slideLayout?: string;
    /** PPTX: Speaker notes */
    speakerNotes?: string;
    /** DOCX: Section properties (headers, footers, etc.) */
    sectionProperties?: {
        headerContent?: PolyglotNode;
        footerContent?: PolyglotNode;
        pageNumbering?: {
            start?: number;
            format?: 'decimal' | 'roman' | 'letter';
        };
    };
}
/**
 * The complete Polyglot Document
 *
 * This is the top-level structure that serializers receive.
 * It contains all pages/slides and document-level metadata.
 */
interface PolyglotDocument {
    /** Document version for compatibility */
    version: '1.0';
    /** Target output format */
    targetFormat: OutputFormat;
    /** Document metadata */
    metadata: DocumentMetadata;
    /** Default page dimensions */
    defaultDimensions: PageDimensions;
    /** All pages/slides in the document */
    pages: PolyglotPage[];
    /** Flat map of all nodes by ID for O(1) lookup */
    nodeMap: Map<string, PolyglotNode>;
    /** Build timestamp */
    buildTimestamp: number;
    /** Debug information */
    debug?: {
        reactNodesProcessed: number;
        polyglotNodesCreated: number;
        buildTimeMs: number;
    };
}
/**
 * Options for serializers
 */
interface SerializerOptions {
    /** Enable debug output */
    debug?: boolean;
    /** Image quality (0-100) for compression */
    imageQuality?: number;
    /** PPTX-specific options */
    pptx?: {
        /** Default slide master */
        defaultMaster?: string;
        /** Company name for metadata */
        company?: string;
        /** Slide size preset */
        slideSize?: '16x9' | '4x3' | 'custom';
        /** Custom slide width (inches) */
        slideWidth?: number;
        /** Custom slide height (inches) */
        slideHeight?: number;
        /**
         * Theme configuration (PPT-02 requirement - Phase 15)
         * Use preset themes: 'office', 'mckinsey', 'bcg'
         * Or provide a custom SlideTheme for enterprise branding.
         */
        theme?: 'office' | 'mckinsey' | 'bcg';
    };
    /** DOCX-specific options */
    docx?: {
        /** Base styles to include */
        includeBaseStyles?: boolean;
        /**
         * Track changes configuration (DOC-02 requirement)
         * When enabled, revision markers in text are converted to Word Track Changes.
         * Markers: {{+inserted+}}, {{-deleted-}}, {{~old~new~}}
         */
        trackChanges?: {
            /** Author name for tracked changes */
            author?: {
                name: string;
                initials?: string;
            };
            /** Date for tracked changes (defaults to now) */
            date?: Date;
        } | boolean;
        /** Default font */
        defaultFont?: string;
        /** Default font size (points) */
        defaultFontSize?: number;
        /**
         * Word styles configuration (DOC-01 requirement - Phase 16)
         * Styles appear in Word's Styles gallery and support cascading updates.
         * Use preset style sets: 'office', 'legal', 'corporate', 'academic'
         * Or provide a custom WordStyleSet for full control.
         */
        styleSet?: 'office' | 'legal' | 'corporate' | 'academic' | WordStyleSet;
    };
}
/**
 * Result of serialization
 */
interface SerializerResult {
    /** The generated file as a buffer */
    buffer: Buffer;
    /** MIME type */
    mimeType: string;
    /** Suggested filename extension */
    extension: string;
    /** Statistics */
    stats: {
        pageCount: number;
        nodeCount: number;
        serializationTimeMs: number;
        fileSizeBytes: number;
    };
    /** Warnings generated during serialization */
    warnings: string[];
}
/**
 * Serializer interface
 * Each format (PPTX, DOCX) implements this interface
 */
interface Serializer {
    /** The output format this serializer produces */
    format: OutputFormat;
    /** Serialize a PolyglotDocument to the target format */
    serialize(doc: PolyglotDocument, options?: SerializerOptions): Promise<SerializerResult>;
}
/** Overflow strategy for content that exceeds page bounds */
type OverflowStrategy = 'clip' | 'shrink-to-fit' | 'emergency-split' | 'tile';
/** Tile information for horizontal overflow handling */
interface TileInfo {
    /** Column index (0-based) for horizontal position */
    tileColumn: number;
    /** Row index (0-based) for vertical position */
    tileRow: number;
    /** Total columns in the tiled content */
    totalColumns: number;
    /** Total rows in the tiled content */
    totalRows: number;
    /** Original content width before tiling */
    originalWidth: number;
    /** Original content height before tiling */
    originalHeight: number;
}
/** Widow/orphan control configuration */
interface WidowOrphanConfig {
    /** Minimum lines that must stay at bottom of page (orphan prevention) */
    minLinesBeforeBreak: number;
    /** Minimum lines that must appear at top of next page (widow prevention) */
    minLinesAfterBreak: number;
}
/** Timeout and resilience configuration */
interface TimeoutConfig {
    /** Global timeout in milliseconds (default 30000). Set to 0 to disable. */
    globalTimeout: number;
    /** Heartbeat interval - max time without progress before abort (default 5000). Set to 0 to disable. */
    heartbeatInterval: number;
    /** Max placement attempts per node before skipping (default 10) */
    maxPlacementAttempts: number;
}
/** Pagination statistics */
interface PaginationStats {
    totalNodes: number;
    pagesCreated: number;
    tablesSplit: number;
    overflowNodes: number;
    cellMapOperations: number;
    textFragmentations: number;
    widowOrphanAdjustments: number;
    shrinkToFitApplied: number;
    /** Number of horizontal tiles created for wide content */
    tilesCreated: number;
    /** Total pagination time in milliseconds */
    totalTimeMs: number;
    /** Number of nodes skipped due to impossible layout */
    nodesSkipped: number;
    /** Number of heartbeat checks performed */
    heartbeatChecks: number;
}
/** Pagination interruption reasons */
type PaginationInterruptReason = 'timeout' | 'heartbeat' | 'impossible-layout' | 'max-iterations';

/**
 * Text Measurement System - Phase 13 Enhanced
 * ============================================
 * Provides accurate text dimension estimation without requiring a browser.
 * Uses comprehensive font-specific metrics, character width tables, and kerning pairs.
 *
 * Accuracy improvements over basic estimation:
 * - Per-character width tables for Latin alphabet (all chars A-Z, a-z, 0-9)
 * - Common punctuation and symbol widths
 * - Unicode character class handling (CJK, Arabic, etc.)
 * - Common kerning pair adjustments
 * - Script-specific defaults
 */
interface TextStyle {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    lineHeight?: number;
    letterSpacing?: number;
}
interface TextMeasurement {
    /** Total width needed for the text */
    width: number;
    /** Total height needed for the text */
    height: number;
    /** Number of lines after wrapping */
    lineCount: number;
    /** Character indices where lines break */
    lineBreaks: number[];
}
interface TextMeasurer {
    measureText(text: string, style: TextStyle, containerWidth: number): TextMeasurement;
}
/**
 * Enhanced Text Measurer with comprehensive font metrics
 */
declare class EstimatingTextMeasurer implements TextMeasurer {
    measureText(text: string, style: TextStyle, containerWidth: number): TextMeasurement;
}
/**
 * Get the global text measurer instance
 */
declare function getTextMeasurer(): TextMeasurer;
/**
 * Set a custom text measurer (for testing or advanced use cases)
 */
declare function setTextMeasurer(measurer: TextMeasurer): void;
/**
 * Reset the text measurer to default
 */
declare function resetTextMeasurer(): void;
/**
 * Quick estimate of text height without full measurement
 */
declare function estimateTextHeight(text: string, containerWidth: number, style?: TextStyle): number;
/**
 * Quick estimate of text width without wrapping
 */
declare function estimateTextWidth(text: string, style?: TextStyle): number;
/**
 * Get supported font families
 */
declare function getSupportedFonts(): string[];
/**
 * Check if a font has detailed metrics
 */
declare function hasDetailedMetrics(fontFamily: string): boolean;

/**
 * Color Utilities
 * ===============
 * Robust color parsing and conversion for PPTX/DOCX output.
 * Handles various CSS color formats and converts to 6-digit hex.
 */
/**
 * Parse a CSS color string to 6-digit hex (without #)
 * Returns undefined if the color cannot be parsed
 */
declare function parseColor(color: string | undefined | null): string | undefined;
/**
 * Parse a color with a fallback value
 */
declare function parseColorWithFallback(color: string | undefined | null, fallback?: string): string;
/**
 * Calculate relative luminance per WCAG 2.1
 * Input: 6-digit hex string (no #)
 */
declare function relativeLuminance(hex: string): number;
/**
 * Calculate contrast ratio between two colors per WCAG 2.1
 * Input: 6-digit hex strings (no #)
 */
declare function contrastRatio(hex1: string, hex2: string): number;
/**
 * Check if a string is a valid color
 */
declare function isValidColor(color: string | undefined | null): boolean;
/**
 * Get list of supported named colors
 */
declare function getSupportedNamedColors(): string[];

/**
 * Input Sanitization
 * ==================
 * Functions to sanitize and validate input data for safe document generation.
 */

/**
 * Sanitize text content by removing null bytes and limiting length
 */
declare function sanitizeTextContent(text: string | undefined | null): string;
/**
 * Check if a string contains potentially problematic characters
 */
declare function hasProblematicCharacters(text: string): boolean;
/**
 * Sanitize a Rect by clamping values to safe ranges
 */
declare function sanitizeRect(rect: Rect | undefined): Rect;
/**
 * Sanitize a PolyglotNode tree, fixing issues and limiting depth
 */
declare function sanitizeNode(node: PolyglotNode, depth?: number): PolyglotNode;
/**
 * Safely divide two numbers, returning a fallback on division by zero
 */
declare function safeDivide(numerator: number, denominator: number, fallback?: number): number;
/**
 * Clamp a number to a range
 */
declare function clamp(value: number, min: number, max: number): number;
/**
 * Ensure a value is a valid positive number
 */
declare function ensurePositive(value: number, fallback?: number): number;
declare const SANITIZER_LIMITS: {
    MAX_TEXT_LENGTH: number;
    MAX_NODE_DEPTH: number;
    MAX_X: number;
    MAX_Y: number;
    MAX_DIMENSION: number;
};

/**
 * Quality Checker
 * ===============
 * Validates PolyglotDocument structure and content quality.
 * Returns a quality score and detailed check results.
 */

type QualitySeverity = 'critical' | 'major' | 'minor';
interface QualityCheck {
    /** Unique check ID */
    id: string;
    /** Human-readable check name */
    name: string;
    /** Severity level */
    severity: QualitySeverity;
    /** Check function */
    check: (doc: PolyglotDocument) => QualityResult;
}
interface QualityResult {
    /** Whether the check passed */
    passed: boolean;
    /** Failure message (if not passed) */
    message?: string;
    /** Additional details */
    details?: unknown;
}
interface QualityCheckResult {
    check: QualityCheck;
    result: QualityResult;
}
interface QualityReport {
    /** Overall quality score (0-100) */
    score: number;
    /** Whether the document passes minimum quality threshold */
    passed: boolean;
    /** Number of critical failures */
    criticalFailures: number;
    /** Number of major failures */
    majorFailures: number;
    /** Number of minor failures */
    minorFailures: number;
    /** Individual check results */
    results: QualityCheckResult[];
    /** Summary of issues */
    issues: string[];
}
declare const QUALITY_CHECKS: QualityCheck[];
/**
 * Run all quality checks on a document
 */
declare function runQualityChecks(doc: PolyglotDocument, checks?: QualityCheck[]): QualityReport;
/**
 * Quick check if a document meets minimum quality
 */
declare function isDocumentValid(doc: PolyglotDocument): boolean;
/**
 * Get a summary string of quality issues
 */
declare function getQualitySummary(doc: PolyglotDocument): string;

/**
 * VLT Paginator
 * =============
 * Production-grade pagination engine for splitting content across multiple pages.
 *
 * Features:
 * - Table splitting with header repeat and cell span handling
 * - keepTogether/keepWithNext hints
 * - Safety limits to prevent memory exhaustion
 * - Recursion depth protection
 * - Oversized element handling with emergency overflow
 * - Column width preservation across table splits
 */

declare class PaginationError extends Error {
    code: string;
    context?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, context?: Record<string, unknown> | undefined);
}
interface PaginationOptions {
    /** Page dimensions including margins */
    dimensions: PageDimensions;
    /** Whether to repeat table headers on each page */
    repeatTableHeaders?: boolean;
    /** Maximum pages to generate (safety limit) */
    maxPages?: number;
    /** Overflow strategy for oversized elements */
    overflowStrategy?: OverflowStrategy;
    /** Minimum scale factor for shrink-to-fit (default 0.5) */
    minScaleFactor?: number;
    /** Widow/orphan control settings */
    widowOrphan?: WidowOrphanConfig;
    /** Estimated line height for text fragmentation (default 20) */
    estimatedLineHeight?: number;
    /** Timeout and resilience settings */
    timeout?: Partial<TimeoutConfig>;
    /** Performance monitor for detailed metrics (Phase 11) */
    performanceMonitor?: PerformanceMonitor;
}
interface PaginationResult {
    /** Generated pages */
    pages: PolyglotPage[];
    /** Warnings generated during pagination */
    warnings: string[];
    /** Whether pagination completed fully or was interrupted */
    completed: boolean;
    /** Reason for interruption if not completed */
    interruptReason?: 'timeout' | 'heartbeat' | 'impossible-layout' | 'max-iterations';
    /** Statistics */
    stats: {
        totalNodes: number;
        pagesCreated: number;
        tablesSplit: number;
        overflowNodes: number;
        cellMapOperations: number;
        textFragmentations: number;
        widowOrphanAdjustments: number;
        shrinkToFitApplied: number;
        /** Number of horizontal tiles created for wide content */
        tilesCreated: number;
        /** Total pagination time in milliseconds */
        totalTimeMs: number;
        /** Number of nodes skipped due to impossible layout */
        nodesSkipped: number;
        /** Number of heartbeat checks performed */
        heartbeatChecks: number;
    };
}
declare class VLTPaginator {
    private options;
    private warnings;
    private stats;
    private iterationCount;
    private startTime;
    private lastProgressTime;
    private completed;
    private interruptReason?;
    private placementTrackers;
    private skippedNodes;
    private perfMonitor;
    constructor(options: PaginationOptions);
    /**
     * Paginate a root node into multiple pages
     */
    paginate(rootNode: PolyglotNode): PaginationResult;
    /**
     * Check if pagination should continue (timeout/heartbeat checks)
     * Returns false if pagination should stop
     */
    private checkContinue;
    /**
     * Record progress (resets heartbeat timer)
     */
    private recordProgress;
    /**
     * Track placement attempt for impossible layout detection
     * Returns true if the node should be skipped
     */
    private trackPlacementAttempt;
    /**
     * Check iteration limit to prevent infinite loops
     * Now integrated with checkContinue for unified timeout/heartbeat checking
     */
    private checkIterationLimit;
    /**
     * Pre-scan for oversized elements and log warnings
     */
    private prescanOversizedElements;
    /**
     * Place a node on the current page, creating new pages as needed
     */
    private placeNode;
    /**
     * Add a node to a page, updating Y position
     */
    private addNodeToPage;
    /**
     * Create a new page context
     */
    private createNewPage;
    /**
     * Check if a node should be kept together (not split)
     */
    private shouldKeepTogether;
    /**
     * Check if a node can be split across pages
     */
    private canSplitNode;
    /**
     * Estimate the number of lines in a text node
     */
    private estimateLines;
    /**
     * Apply widow/orphan control and return adjusted lines that fit
     * Returns 0 if the entire element should move to next page
     * Returns -1 if no adjustment needed (element fits)
     */
    private applyWidowOrphanControl;
    /**
     * Split a text node at a line boundary
     */
    private splitTextNode;
    /**
     * Find the nearest word boundary before a position
     */
    private findWordBoundary;
    /**
     * Split rich text spans at a character position
     */
    private splitSpans;
    /**
     * Handle overflow based on configured strategy
     */
    private handleOverflow;
    /**
     * Tile a node across multiple pages (both horizontally and vertically)
     * Used for very wide content like large tables or images that exceed page dimensions
     */
    private tileNode;
    /**
     * Split a generic node across pages
     */
    private splitNode;
    /**
     * Analyze a table structure for splitting
     */
    private analyzeTable;
    /**
     * Create continuation cells for rows that span a page break
     */
    private createContinuationRow;
    /**
     * Split a table across pages with header repeat and cell span handling
     */
    private splitTable;
}
/**
 * Paginate a root node with default options
 */
declare function paginateDocument(rootNode: PolyglotNode, dimensions: PageDimensions): PaginationResult;
/**
 * Compute a mapping from heading bookmark names to their paginator-computed
 * page numbers. Used by the Pro TOC to pre-populate accurate page numbers
 * without Word's "Update Fields" prompt.
 *
 * The function converts StructuredDocument elements to lightweight PolyglotNodes,
 * runs the VLTPaginator to determine page breaks, then extracts heading positions.
 *
 * @param doc - The structured document to analyze
 * @param pageConfig - Optional page dimensions override (uses doc.pages[0].dimensions if omitted)
 * @returns Map from bookmark name to 1-based page number
 */
declare function getHeadingPageMap(doc: StructuredDocument, pageConfig?: PageDimensions$1): Map<string, number>;

/**
 * Chunked Paginator
 * =================
 * Async/generator-based pagination for large documents.
 * Processes nodes in configurable chunks, yielding control between chunks
 * to prevent blocking and allow memory management.
 *
 * Phase 10 of Polyglot hardening.
 */

/** Default chunk size (nodes to process before yielding) */
declare const DEFAULT_CHUNK_SIZE = 100;
/** Default yield delay in milliseconds (0 = nextTick/setImmediate) */
declare const DEFAULT_YIELD_DELAY = 0;
/** Memory warning threshold in bytes (500MB) */
declare const MEMORY_WARNING_THRESHOLD: number;
/** Memory critical threshold in bytes (1GB) */
declare const MEMORY_CRITICAL_THRESHOLD: number;
/** Configuration for chunked pagination */
interface ChunkedPaginationOptions extends PaginationOptions {
    /** Number of nodes to process before yielding (default 100) */
    chunkSize?: number;
    /** Delay in ms between chunks (default 0 = nextTick) */
    yieldDelay?: number;
    /** Enable memory monitoring (default true in Node.js) */
    monitorMemory?: boolean;
    /** Memory warning threshold in bytes */
    memoryWarningThreshold?: number;
    /** Memory critical threshold in bytes (will pause pagination) */
    memoryCriticalThreshold?: number;
    /** Callback for progress updates */
    onProgress?: (progress: ChunkProgress) => void;
    /** Callback for memory warnings */
    onMemoryWarning?: (usage: MemoryUsage) => void;
}
/** Progress information for each chunk */
interface ChunkProgress {
    /** Current chunk index (0-based) */
    chunkIndex: number;
    /** Total nodes processed so far */
    nodesProcessed: number;
    /** Total nodes to process (estimate) */
    totalNodes: number;
    /** Pages created so far */
    pagesCreated: number;
    /** Percentage complete (0-100) */
    percentComplete: number;
    /** Elapsed time in milliseconds */
    elapsedMs: number;
    /** Estimated time remaining in milliseconds */
    estimatedRemainingMs: number;
}
/** Memory usage information */
interface MemoryUsage {
    /** Heap used in bytes */
    heapUsed: number;
    /** Heap total in bytes */
    heapTotal: number;
    /** External memory in bytes */
    external: number;
    /** RSS (resident set size) in bytes */
    rss: number;
    /** Whether we're above warning threshold */
    isWarning: boolean;
    /** Whether we're above critical threshold */
    isCritical: boolean;
}
/** Result of chunked pagination */
interface ChunkedPaginationResult extends PaginationResult {
    /** Number of chunks processed */
    chunksProcessed: number;
    /** Peak memory usage observed */
    peakMemoryUsage?: MemoryUsage;
    /** Whether pagination was paused due to memory pressure */
    pausedForMemory: boolean;
}
/** Checkpoint for resumable pagination */
interface PaginationCheckpoint {
    /** Nodes that have been processed */
    processedNodeIds: Set<string>;
    /** Current page contexts */
    pageContexts: Array<{
        pageIndex: number;
        currentY: number;
        nodeCount: number;
    }>;
    /** Partial pages generated so far */
    partialPages: PolyglotPage[];
    /** Stats at checkpoint */
    stats: PaginationResult['stats'];
    /** Warnings collected so far */
    warnings: string[];
    /** Timestamp of checkpoint */
    timestamp: number;
}
/**
 * Async paginator that processes documents in chunks.
 * Use this for large documents to prevent memory exhaustion and allow
 * progress reporting.
 */
declare class ChunkedPaginator {
    private options;
    private peakMemory;
    private pausedForMemory;
    constructor(options: ChunkedPaginationOptions);
    /**
     * Paginate a document asynchronously in chunks.
     * This is the main entry point for chunked pagination.
     */
    paginate(rootNode: PolyglotNode): Promise<ChunkedPaginationResult>;
    /**
     * Generator-based pagination that yields after each chunk.
     * Use this for fine-grained control over pagination progress.
     */
    paginateGenerator(rootNode: PolyglotNode): AsyncGenerator<ChunkProgress, void, unknown>;
    /**
     * Create a checkpoint for resumable pagination.
     * Note: Full checkpoint/resume is complex; this provides basic state capture.
     */
    createCheckpoint(processedNodes: PolyglotNode[], partialPages: PolyglotPage[], stats: PaginationResult['stats'], warnings: string[]): PaginationCheckpoint;
    /**
     * Flatten all nodes in the document tree for counting/chunking.
     */
    private flattenNodes;
    /**
     * Get current memory usage.
     */
    private getMemoryUsage;
    /**
     * Update peak memory tracking.
     */
    private updatePeakMemory;
    /**
     * Yield control to the event loop.
     */
    private yieldControl;
    /**
     * Attempt to trigger garbage collection and wait.
     */
    private triggerGCAndWait;
}
/**
 * Paginate a document asynchronously with default options.
 */
declare function paginateDocumentAsync(rootNode: PolyglotNode, dimensions: PageDimensions, options?: Partial<ChunkedPaginationOptions>): Promise<ChunkedPaginationResult>;
/**
 * Create a progress callback that logs to console.
 */
declare function createConsoleProgressCallback(): (progress: ChunkProgress) => void;
/**
 * Create a memory warning callback that logs to console.
 */
declare function createConsoleMemoryCallback(): (usage: MemoryUsage) => void;

/**
 * Normalized Rectangle Types and Operations
 * ==========================================
 *
 * The NormalizedRect is the cornerstone of the coordinate system redesign.
 * All coordinates are expressed as fractions (0.0 - 1.0) of page dimensions,
 * eliminating unit confusion and enabling validation.
 *
 * Design Principles:
 * 1. SINGLE SOURCE OF TRUTH: Normalized coordinates are the intermediate representation
 * 2. VALIDATION-FRIENDLY: Values outside [0, 1] are detectable errors (or intentional overflow)
 * 3. FORMAT-AGNOSTIC: Same normalized values work for PPTX inches, DOCX twips, or PDF points
 * 4. PRECISION-PRESERVING: No unnecessary intermediate conversions
 */
/**
 * Normalized rectangle with coordinates in range [0, 1].
 * Represents position/size relative to page dimensions.
 *
 * Example:
 * - nx: 0.0375 means 3.75% from left edge
 * - ny: 0.1852 means 18.52% from top edge
 * - nw: 0.4625 means 46.25% of page width
 * - nh: 0.0407 means 4.07% of page height
 */
interface NormalizedRect {
    /** X position as fraction of page width (0 = left edge, 1 = right edge) */
    nx: number;
    /** Y position as fraction of page height (0 = top, 1 = bottom) */
    ny: number;
    /** Width as fraction of page width */
    nw: number;
    /** Height as fraction of page height */
    nh: number;
}
/**
 * Frozen/immutable normalized rectangle for safety
 */
type FrozenNormalizedRect = Readonly<NormalizedRect>;
/**
 * Error codes for coordinate validation
 */
type CoordinateErrorCode = 'NAN_VALUE' | 'INFINITE_VALUE' | 'NEGATIVE_DIMENSION' | 'ZERO_DIMENSION' | 'OUT_OF_BOUNDS' | 'OVERFLOW_RIGHT' | 'OVERFLOW_BOTTOM' | 'UNDERFLOW_LEFT' | 'UNDERFLOW_TOP';
/**
 * Severity levels for coordinate issues
 */
type CoordinateSeverity = 'error' | 'warning';
/**
 * A coordinate validation error
 */
interface CoordinateError {
    /** Error code for programmatic handling */
    code: CoordinateErrorCode;
    /** Which field caused the error */
    field: 'nx' | 'ny' | 'nw' | 'nh';
    /** The problematic value */
    value: number;
    /** Human-readable message */
    message: string;
    /** Severity level */
    severity: CoordinateSeverity;
}
/**
 * Result of coordinate validation
 */
interface CoordinateValidation {
    /** Whether the coordinates are valid (no errors) */
    valid: boolean;
    /** All issues found (errors and warnings) */
    issues: CoordinateError[];
    /** Just the errors (severity === 'error') */
    errors: CoordinateError[];
    /** Just the warnings (severity === 'warning') */
    warnings: CoordinateError[];
}
/**
 * Create a normalized rect with validation.
 * Throws if any value is NaN or Infinity.
 */
declare function createNormalizedRect(nx: number, ny: number, nw: number, nh: number): NormalizedRect;
/**
 * Create a frozen (immutable) normalized rect.
 * Use this when passing coordinates between functions to prevent accidental mutation.
 */
declare function createFrozenNormalizedRect(nx: number, ny: number, nw: number, nh: number): FrozenNormalizedRect;
/**
 * Create a normalized rect without validation (for performance-critical paths).
 * ONLY use this when you've already validated the inputs.
 */
declare function createNormalizedRectUnsafe(nx: number, ny: number, nw: number, nh: number): NormalizedRect;
/**
 * Get the right edge (nx + nw)
 */
declare function getRight(rect: NormalizedRect): number;
/**
 * Get the bottom edge (ny + nh)
 */
declare function getBottom(rect: NormalizedRect): number;
/**
 * Get the center X coordinate
 */
declare function getCenterX(rect: NormalizedRect): number;
/**
 * Get the center Y coordinate
 */
declare function getCenterY(rect: NormalizedRect): number;
/**
 * Get the area (nw * nh)
 */
declare function getArea(rect: NormalizedRect): number;
/**
 * Check if two rects overlap
 */
declare function rectsOverlap(a: NormalizedRect, b: NormalizedRect): boolean;
/**
 * Check if rect A contains rect B entirely
 */
declare function rectContains(outer: NormalizedRect, inner: NormalizedRect): boolean;
/**
 * Check if a point is inside a rect
 */
declare function rectContainsPoint(rect: NormalizedRect, px: number, py: number): boolean;
/**
 * Compute the intersection of two rects.
 * Returns null if they don't overlap.
 */
declare function rectIntersection(a: NormalizedRect, b: NormalizedRect): NormalizedRect | null;
/**
 * Compute the bounding box of multiple rects
 */
declare function boundingBox(rects: NormalizedRect[]): NormalizedRect | null;
/**
 * Check if two rects are equal (within tolerance)
 */
declare function rectsEqual(a: NormalizedRect, b: NormalizedRect, tolerance?: number): boolean;
/**
 * Check if two rects are horizontally adjacent (same Y, touching edges)
 */
declare function rectsHorizontallyAdjacent(left: NormalizedRect, right: NormalizedRect, tolerance?: number): boolean;
/**
 * Check if two rects are vertically adjacent (same X, touching edges)
 */
declare function rectsVerticallyAdjacent(top: NormalizedRect, bottom: NormalizedRect, tolerance?: number): boolean;
/**
 * Scale a rect by a factor
 */
declare function scaleRect(rect: NormalizedRect, scaleX: number, scaleY?: number): NormalizedRect;
/**
 * Translate a rect by an offset
 */
declare function translateRect(rect: NormalizedRect, dx: number, dy: number): NormalizedRect;
/**
 * Inset a rect by a margin (shrink it)
 */
declare function insetRect(rect: NormalizedRect, margin: number): NormalizedRect;
/**
 * Expand a rect by a margin (grow it)
 */
declare function expandRect(rect: NormalizedRect, margin: number): NormalizedRect;
/**
 * Clamp a rect to stay within [0, 1] bounds
 */
declare function clampRect(rect: NormalizedRect): NormalizedRect;
/**
 * Convert to a plain object (for JSON serialization)
 */
declare function toPlainObject(rect: NormalizedRect): {
    nx: number;
    ny: number;
    nw: number;
    nh: number;
};
/**
 * Create from a plain object
 */
declare function fromPlainObject(obj: {
    nx: number;
    ny: number;
    nw: number;
    nh: number;
}): NormalizedRect;
/**
 * Format as a human-readable string
 */
declare function formatRect(rect: NormalizedRect, precision?: number): string;
/**
 * Format as percentages for display
 */
declare function formatRectAsPercent(rect: NormalizedRect, precision?: number): string;

/**
 * Coordinate Transformation Pipeline
 * ===================================
 *
 * This module implements the transformation pipeline:
 *
 *   VLT (CSS pixels) → Normalized (0-1) → Target Format (inches/twips/EMU)
 *
 * Design Principles:
 * 1. SINGLE TRANSFORMATION POINT: Page dimensions are only used in vltToNormalized()
 * 2. NO DOUBLE CONVERSIONS: Each step does exactly one transformation
 * 3. VALIDATION BETWEEN STEPS: Invalid coordinates are caught before they propagate
 * 4. REVERSIBLE: Transformations can be reversed for debugging
 */

/**
 * Standard DPI for CSS pixels
 */
declare const PIXELS_PER_INCH = 96;
/**
 * Twips per inch (for DOCX)
 */
declare const TWIPS_PER_INCH = 1440;
/**
 * EMU per inch (for PPTX raw XML)
 */
declare const EMU_PER_INCH = 914400;
/**
 * Default slide dimensions (16:9)
 */
declare const DEFAULT_SLIDE_WIDTH_INCHES = 10;
declare const DEFAULT_SLIDE_HEIGHT_INCHES = 5.625;
/**
 * Default page dimensions (Letter)
 */
declare const DEFAULT_PAGE_WIDTH_INCHES = 8.5;
declare const DEFAULT_PAGE_HEIGHT_INCHES = 11;
/**
 * Configuration for VLT to Normalized transformation
 */
interface VLTToNormalizedConfig {
    /**
     * Whether to clamp values to [0, 1] range.
     * Default: false (allows overflow detection)
     */
    clamp?: boolean;
    /**
     * Whether to throw on invalid input (NaN, Infinity).
     * Default: true
     */
    strict?: boolean;
}
/**
 * Transform VLT pixel coordinates to normalized (0-1) coordinates.
 *
 * This is the ONLY function that should use page dimensions.
 * After this point, all coordinates are format-agnostic.
 *
 * @param rect - Rectangle in CSS pixels
 * @param pageDimensions - Page dimensions in CSS pixels
 * @param config - Optional configuration
 * @returns NormalizedRect with values as fractions of page dimensions
 *
 * @example
 * const rect = { x: 36, y: 0, width: 444, height: 22 };
 * const pageDims = { width: 960, height: 540, margin: { top: 36, right: 36, bottom: 36, left: 36 } };
 * const normalized = vltToNormalized(rect, pageDims);
 * // normalized = { nx: 0.0375, ny: 0, nw: 0.4625, nh: 0.0407 }
 */
declare function vltToNormalized(rect: Rect, pageDimensions: PageDimensions, config?: VLTToNormalizedConfig): NormalizedRect;
/**
 * Batch transform multiple rects (more efficient for large documents)
 */
declare function vltToNormalizedBatch(rects: Rect[], pageDimensions: PageDimensions, config?: VLTToNormalizedConfig): NormalizedRect[];
/**
 * Transform normalized coordinates back to VLT pixels.
 * Useful for debugging and round-trip verification.
 */
declare function normalizedToVLT(normalized: NormalizedRect, pageDimensions: PageDimensions): Rect;
/**
 * Rectangle in PPTX inches
 */
interface PPTXRect {
    /** X position in inches from slide left edge */
    x: number;
    /** Y position in inches from slide top edge */
    y: number;
    /** Width in inches */
    w: number;
    /** Height in inches */
    h: number;
}
/**
 * Transform normalized coordinates to PPTX inches.
 *
 * @param normalized - Normalized rectangle (0-1)
 * @param slideWidth - Slide width in inches (default: 10)
 * @param slideHeight - Slide height in inches (default: 5.625)
 * @returns Rectangle in inches for pptxgenjs
 *
 * @example
 * const normalized = { nx: 0.0375, ny: 0.1852, nw: 0.4625, nh: 0.0407 };
 * const inches = normalizedToPPTXInches(normalized, 10, 5.625);
 * // inches = { x: 0.375, y: 1.042, w: 4.625, h: 0.229 }
 */
declare function normalizedToPPTXInches(normalized: NormalizedRect, slideWidth?: number, slideHeight?: number): PPTXRect;
/**
 * Transform normalized coordinates to EMU (English Metric Units).
 * EMU is used in raw PPTX XML. 914400 EMU = 1 inch.
 */
declare function normalizedToEMU(normalized: NormalizedRect, slideWidth?: number, slideHeight?: number): {
    x: number;
    y: number;
    cx: number;
    cy: number;
};
/**
 * Rectangle in DOCX twips
 */
interface DOCXRect {
    /** X position in twips (mostly ignored in flow documents) */
    x: number;
    /** Y position in twips (ignored in flow documents) */
    y: number;
    /** Width in twips */
    w: number;
    /** Height in twips */
    h: number;
}
/**
 * Transform normalized coordinates to DOCX twips.
 * Note: DOCX is a flow document format, so Y coordinates are typically ignored.
 *
 * @param normalized - Normalized rectangle (0-1)
 * @param pageWidth - Page width in inches (default: 8.5)
 * @param pageHeight - Page height in inches (default: 11)
 * @returns Rectangle in twips
 */
declare function normalizedToDOCXTwips(normalized: NormalizedRect, pageWidth?: number, pageHeight?: number): DOCXRect;
/**
 * Direct conversion from VLT pixels to PPTX inches.
 * Combines vltToNormalized + normalizedToPPTXInches for convenience.
 */
declare function vltToPPTXInches(rect: Rect, pageDimensions: PageDimensions, slideWidth?: number, slideHeight?: number): PPTXRect;
/**
 * Direct conversion from VLT pixels to EMU.
 */
declare function vltToEMU(rect: Rect, pageDimensions: PageDimensions, slideWidth?: number, slideHeight?: number): {
    x: number;
    y: number;
    cx: number;
    cy: number;
};
/**
 * Direct conversion from VLT pixels to DOCX twips.
 */
declare function vltToDOCXTwips(rect: Rect, pageDimensions: PageDimensions, pageWidth?: number, pageHeight?: number): DOCXRect;
/**
 * Convert a single pixel value to normalized (using width as reference)
 */
declare function pxToNormalizedWidth(px: number, pageWidth: number): number;
/**
 * Convert a single pixel value to normalized (using height as reference)
 */
declare function pxToNormalizedHeight(px: number, pageHeight: number): number;
/**
 * Convert normalized width to inches
 */
declare function normalizedWidthToInches(nw: number, slideWidth: number): number;
/**
 * Convert normalized height to inches
 */
declare function normalizedHeightToInches(nh: number, slideHeight: number): number;
/**
 * Convert pixels to inches directly (for scalar values like font sizes)
 */
declare function pxToInches(px: number): number;
/**
 * Convert inches to pixels
 */
declare function inchesToPx(inches: number): number;
/**
 * Convert pixels to twips
 */
declare function pxToTwips(px: number): number;
/**
 * Convert twips to pixels
 */
declare function twipsToPx(twips: number): number;
/**
 * Convert inches to EMU
 */
declare function inchesToEMU(inches: number): number;
/**
 * Convert EMU to inches
 */
declare function emuToInches(emu: number): number;
/**
 * Verify that a transformation round-trips correctly.
 * Useful for testing and debugging.
 */
declare function verifyRoundTrip(rect: Rect, pageDimensions: PageDimensions, tolerance?: number): {
    success: boolean;
    error?: string;
    maxDiff?: number;
};
/**
 * A coordinate pipeline that chains transformations with validation.
 * Use this for complex transformation chains that need intermediate validation.
 *
 * @example
 * const result = createPipeline(rect, pageDimensions)
 *   .toNormalized()
 *   .validate()
 *   .toPPTXInches(10, 5.625)
 *   .result();
 */
declare function createPipeline(rect: Rect, pageDimensions: PageDimensions): CoordinatePipeline;
declare class CoordinatePipeline {
    private _rect;
    private _pageDimensions;
    private _normalized;
    private _pptxInches;
    private _errors;
    constructor(rect: Rect, pageDimensions: PageDimensions);
    toNormalized(config?: VLTToNormalizedConfig): this;
    validate(options?: {
        allowOverflow?: boolean;
    }): this;
    toPPTXInches(slideWidth: number, slideHeight: number): this;
    get normalized(): NormalizedRect | null;
    get pptxInches(): PPTXRect | null;
    get errors(): string[];
    get hasErrors(): boolean;
    result(): {
        normalized: NormalizedRect | null;
        pptxInches: PPTXRect | null;
        errors: string[];
        success: boolean;
    };
}

/**
 * Coordinate Validators and Invariant Checkers
 * =============================================
 *
 * This module provides comprehensive validation for coordinates at every
 * stage of the transformation pipeline. The goal is to catch invalid
 * coordinates BEFORE they become visual bugs in the output.
 *
 * Design Principles:
 * 1. FAIL FAST: Invalid coordinates throw errors, not silent fallbacks
 * 2. DETAILED DIAGNOSTICS: Every error includes context for debugging
 * 3. CONFIGURABLE STRICTNESS: Allow warnings vs errors based on use case
 * 4. INVARIANT PRESERVATION: Verify relationships hold across transformations
 */

/**
 * Options for coordinate validation
 */
interface ValidationOptions {
    /**
     * Allow elements to extend beyond page bounds.
     * Default: false
     */
    allowOverflow?: boolean;
    /**
     * Tolerance for floating-point comparisons.
     * Default: 0.001 (0.1%)
     */
    tolerance?: number;
    /**
     * Treat warnings as errors.
     * Default: false
     */
    strictMode?: boolean;
    /**
     * Maximum allowed normalized dimension (for sanity checks).
     * Default: 10 (1000% of page dimension - catches obvious bugs)
     */
    maxNormalizedDimension?: number;
    /**
     * Minimum allowed dimension (to catch zero-size elements).
     * Default: 0.0001 (0.01% of page dimension)
     */
    minNormalizedDimension?: number;
}
/**
 * Validate a normalized rectangle.
 * This is the primary validation function - call it after every transformation.
 */
declare function validateNormalized(rect: NormalizedRect, options?: ValidationOptions): CoordinateValidation;
/**
 * Validate and throw if invalid.
 * Use this when you want to fail fast on bad coordinates.
 */
declare function assertNormalizedValid(rect: NormalizedRect, context?: string, options?: ValidationOptions): void;
/**
 * Validate a VLT rect (in pixels) before transformation
 */
declare function validateVLTRect(rect: Rect, _context?: string): CoordinateValidation;
/**
 * Result of table invariant validation
 */
interface TableInvariantResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    details: {
        rowCount: number;
        columnCount: number;
        cellCount: number;
        tableWidthMatch: boolean;
        rowsHorizontallyAligned: boolean;
        cellsAdjacent: boolean;
    };
}
/**
 * Validate table structure invariants.
 * These are mathematical properties that MUST hold for correct rendering.
 */
declare function validateTableInvariants(tableNode: PolyglotNode, pageDimensions: PageDimensions, tolerance?: number): TableInvariantResult;
/**
 * Assert table invariants hold. Throws if not.
 */
declare function assertTableInvariants(tableNode: PolyglotNode, pageDimensions: PageDimensions, context?: string): void;
/**
 * Result of document validation
 */
interface DocumentValidationResult {
    valid: boolean;
    pageResults: Array<{
        pageIndex: number;
        nodeCount: number;
        errors: string[];
        warnings: string[];
    }>;
    totalErrors: number;
    totalWarnings: number;
    totalNodes: number;
}
/**
 * Validate all coordinates in a document before serialization.
 * This is the top-level validation function.
 */
declare function validateDocumentCoordinates(doc: PolyglotDocument, options?: ValidationOptions): DocumentValidationResult;
/**
 * Assert document coordinates are valid. Throws if not.
 */
declare function assertDocumentCoordinatesValid(doc: PolyglotDocument, options?: ValidationOptions): void;
/**
 * Validate that column widths are consistent and sum correctly
 */
declare function validateColumnWidths(widths: number[], expectedTotal: number, tolerance?: number): {
    valid: boolean;
    errors: string[];
    actualSum: number;
};
/**
 * Validate that row heights are reasonable
 */
declare function validateRowHeights(heights: number[], minHeight?: number, maxHeight?: number): {
    valid: boolean;
    errors: string[];
};

/**
 * Native Office Chart Transpiler
 * ===============================
 * Converts chart data to Office Open XML Chart format with embedded Excel.
 *
 * Phase 12 of Polyglot hardening.
 *
 * This is "the hardest engineering challenge but the biggest moat" (PRD-014).
 *
 * The key insight: Office charts are NOT just shapes with data.
 * They are linked to an embedded Excel spreadsheet inside the PPTX/DOCX file.
 * When you right-click "Edit Data" in PowerPoint, it opens that embedded Excel.
 *
 * Structure inside PPTX:
 * ```
 * [Content_Types].xml
 * ppt/
 *   slides/
 *     slide1.xml          <- Contains <c:chart r:id="rId2"/>
 *   charts/
 *     chart1.xml          <- The chart definition (<c:chartSpace>)
 *   embeddings/
 *     Microsoft_Excel_Worksheet1.xlsx  <- The embedded data source
 *   _rels/
 *     slide1.xml.rels     <- Links slide to chart
 *   charts/_rels/
 *     chart1.xml.rels     <- Links chart to Excel embedding
 * ```
 */
/** Supported chart types */
type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut';
/** A single data point */
interface DataPoint {
    /** Category label (x-axis) */
    category: string;
    /** Numeric value (y-axis) */
    value: number;
}
/** A data series */
interface DataSeries {
    /** Series name (appears in legend) */
    name: string;
    /** Data points in this series */
    data: DataPoint[];
    /** Optional color (hex without #) */
    color?: string;
}
/** Chart configuration */
interface ChartConfig {
    /** Chart type */
    type: ChartType;
    /** Chart title */
    title?: string;
    /** Data series */
    series: DataSeries[];
    /** X-axis configuration */
    xAxis?: {
        title?: string;
        categories?: string[];
    };
    /** Y-axis configuration */
    yAxis?: {
        title?: string;
        min?: number;
        max?: number;
    };
    /** Show legend */
    showLegend?: boolean;
    /** Legend position */
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    /** Show data labels */
    showDataLabels?: boolean;
    /** Chart width in EMUs (English Metric Units) */
    width?: number;
    /** Chart height in EMUs */
    height?: number;
}
/** Result of chart transpilation */
interface ChartTranspileResult {
    /** The chart XML content (chart1.xml) */
    chartXml: string;
    /** The embedded Excel file as base64 */
    excelData: string;
    /** Relationship ID for the chart */
    chartRelId: string;
    /** Relationship ID for the Excel embedding */
    excelRelId: string;
    /** Content type entries needed */
    contentTypes: Array<{
        partName: string;
        contentType: string;
    }>;
}
/**
 * Transpile chart data to Office Open XML format.
 *
 * This is the core function that converts a chart configuration into:
 * 1. A chart XML file (chart1.xml)
 * 2. An embedded Excel workbook with the data
 *
 * @param config Chart configuration
 * @param chartIndex Index for naming (chart1, chart2, etc.)
 * @returns Transpile result with XML and Excel data
 */
declare function transpileChart(config: ChartConfig, chartIndex?: number): Promise<ChartTranspileResult>;
/**
 * Generate the drawing XML that embeds a chart in a slide.
 *
 * This goes inside the slide XML to reference the chart.
 */
declare function generateChartDrawingXml(chartRelId: string, x?: number, y?: number, width?: number, height?: number): string;
/**
 * Generate relationship entries for chart and Excel embedding.
 */
declare function generateChartRelationships(chartIndex: number, chartRelId: string, excelRelId: string): {
    slideRels: string;
    chartRels: string;
};
/**
 * Convert Recharts-style data to our ChartConfig format.
 *
 * Recharts typically uses:
 * ```
 * const data = [
 *   { name: 'Jan', sales: 4000, profit: 2400 },
 *   { name: 'Feb', sales: 3000, profit: 1398 },
 * ];
 * <BarChart data={data}>
 *   <Bar dataKey="sales" fill="#8884d8" />
 *   <Bar dataKey="profit" fill="#82ca9d" />
 * </BarChart>
 * ```
 */
declare function fromRechartsData(data: Array<Record<string, unknown>>, dataKeys: string[], categoryKey?: string, options?: Partial<ChartConfig>): ChartConfig;
/**
 * Validate chart configuration
 */
declare function validateChartConfig(config: ChartConfig): string[];

/**
 * VLT Invariant Validator
 * =======================
 * Validates that VLT structure meets required invariants before serialization.
 * This catches layout bugs that would result in visually broken output.
 */

interface ValidationIssue {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    nodeType?: string;
    nodePath?: string;
    details?: Record<string, unknown>;
}
interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    stats: {
        nodesChecked: number;
        errorsFound: number;
        warningsFound: number;
    };
}
/**
 * Validate a single page's VLT structure
 */
declare function validatePage(page: PolyglotPage, pageIndex: number): ValidationResult;
/**
 * Validate entire VLT document
 */
declare function validateVLT(doc: PolyglotDocument): ValidationResult;
/**
 * Validate VLT and throw if invalid (use before serialization)
 */
declare function assertVLTValid(doc: PolyglotDocument): void;
/**
 * Log validation results (for debugging)
 */
declare function logValidationResult(result: ValidationResult): void;

/**
 * @runstamp/docx - Core Engine Utilities
 * =======================================
 * Extracted from @runstamp/converter polyglot core.
 * Pure engine utilities with no React/DOM dependencies.
 */

declare const index_d$2_ACADEMIC_STYLES: typeof ACADEMIC_STYLES;
declare const index_d$2_CORPORATE_STYLES: typeof CORPORATE_STYLES;
type index_d$2_ChartConfig = ChartConfig;
type index_d$2_ChartTranspileResult = ChartTranspileResult;
type index_d$2_ChartType = ChartType;
type index_d$2_ChunkProgress = ChunkProgress;
type index_d$2_ChunkedPaginationOptions = ChunkedPaginationOptions;
type index_d$2_ChunkedPaginationResult = ChunkedPaginationResult;
type index_d$2_ChunkedPaginator = ChunkedPaginator;
declare const index_d$2_ChunkedPaginator: typeof ChunkedPaginator;
type index_d$2_CommonStyles = CommonStyles;
type index_d$2_CompareManifestEntry = CompareManifestEntry;
type index_d$2_CompileTrackedChangesOptions = CompileTrackedChangesOptions;
type index_d$2_CompiledTrackedChangesResult = CompiledTrackedChangesResult;
type index_d$2_CoordinateError = CoordinateError;
type index_d$2_CoordinateErrorCode = CoordinateErrorCode;
type index_d$2_CoordinateSeverity = CoordinateSeverity;
type index_d$2_CoordinateValidation = CoordinateValidation;
declare const index_d$2_DEFAULT_CHUNK_SIZE: typeof DEFAULT_CHUNK_SIZE;
declare const index_d$2_DEFAULT_GLOBAL_TIMEOUT: typeof DEFAULT_GLOBAL_TIMEOUT;
declare const index_d$2_DEFAULT_HEARTBEAT_INTERVAL: typeof DEFAULT_HEARTBEAT_INTERVAL;
declare const index_d$2_DEFAULT_PAGE_HEIGHT_INCHES: typeof DEFAULT_PAGE_HEIGHT_INCHES;
declare const index_d$2_DEFAULT_PAGE_WIDTH_INCHES: typeof DEFAULT_PAGE_WIDTH_INCHES;
declare const index_d$2_DEFAULT_REVISION_CONFIG: typeof DEFAULT_REVISION_CONFIG;
declare const index_d$2_DEFAULT_SLIDE_HEIGHT_INCHES: typeof DEFAULT_SLIDE_HEIGHT_INCHES;
declare const index_d$2_DEFAULT_SLIDE_WIDTH_INCHES: typeof DEFAULT_SLIDE_WIDTH_INCHES;
declare const index_d$2_DEFAULT_YIELD_DELAY: typeof DEFAULT_YIELD_DELAY;
type index_d$2_DOCXHints = DOCXHints;
type index_d$2_DOCXRect = DOCXRect;
type index_d$2_DataPoint = DataPoint;
type index_d$2_DataSeries = DataSeries;
type index_d$2_DocumentMetadata = DocumentMetadata;
type index_d$2_DocumentValidationResult = DocumentValidationResult;
declare const index_d$2_EMU_PER_INCH: typeof EMU_PER_INCH;
type index_d$2_EstimatingTextMeasurer = EstimatingTextMeasurer;
declare const index_d$2_EstimatingTextMeasurer: typeof EstimatingTextMeasurer;
type index_d$2_FrozenNormalizedRect = FrozenNormalizedRect;
declare const index_d$2_LEGAL_STYLES: typeof LEGAL_STYLES;
declare const index_d$2_MAX_CELL_MAP_ENTRIES: typeof MAX_CELL_MAP_ENTRIES;
declare const index_d$2_MAX_PAGINATION_ITERATIONS: typeof MAX_PAGINATION_ITERATIONS;
declare const index_d$2_MAX_PLACEMENT_ATTEMPTS: typeof MAX_PLACEMENT_ATTEMPTS;
declare const index_d$2_MAX_SPLIT_DEPTH: typeof MAX_SPLIT_DEPTH;
declare const index_d$2_MAX_TABLE_COLS: typeof MAX_TABLE_COLS;
declare const index_d$2_MAX_TABLE_ROWS: typeof MAX_TABLE_ROWS;
declare const index_d$2_MEMORY_CRITICAL_THRESHOLD: typeof MEMORY_CRITICAL_THRESHOLD;
declare const index_d$2_MEMORY_WARNING_THRESHOLD: typeof MEMORY_WARNING_THRESHOLD;
type index_d$2_MemoryUsage = MemoryUsage;
type index_d$2_NormalizeRevisionRunsOptions = NormalizeRevisionRunsOptions;
type index_d$2_NormalizedRect = NormalizedRect;
declare const index_d$2_OFFICE_DEFAULT_STYLES: typeof OFFICE_DEFAULT_STYLES;
type index_d$2_OutputFormat = OutputFormat;
type index_d$2_OverflowStrategy = OverflowStrategy;
declare const index_d$2_PIXELS_PER_INCH: typeof PIXELS_PER_INCH;
type index_d$2_PPTXHints = PPTXHints;
type index_d$2_PPTXRect = PPTXRect;
type index_d$2_PageDimensions = PageDimensions;
type index_d$2_PaginationCheckpoint = PaginationCheckpoint;
type index_d$2_PaginationError = PaginationError;
declare const index_d$2_PaginationError: typeof PaginationError;
type index_d$2_PaginationInterruptReason = PaginationInterruptReason;
type index_d$2_PaginationOptions = PaginationOptions;
type index_d$2_PaginationResult = PaginationResult;
type index_d$2_PaginationStats = PaginationStats;
type index_d$2_ParagraphRevision = ParagraphRevision;
type index_d$2_ParagraphRevisionProperties = ParagraphRevisionProperties;
type index_d$2_PerformanceMetrics = PerformanceMetrics;
type index_d$2_PerformanceMonitor = PerformanceMonitor;
declare const index_d$2_PerformanceMonitor: typeof PerformanceMonitor;
type index_d$2_PerformanceMonitorConfig = PerformanceMonitorConfig;
type index_d$2_PolyglotDocument = PolyglotDocument;
type index_d$2_PolyglotErrorCollector = PolyglotErrorCollector;
declare const index_d$2_PolyglotErrorCollector: typeof PolyglotErrorCollector;
type index_d$2_PolyglotNode = PolyglotNode;
type index_d$2_PolyglotNodeType = PolyglotNodeType;
type index_d$2_PolyglotPage = PolyglotPage;
declare const index_d$2_QUALITY_CHECKS: typeof QUALITY_CHECKS;
type index_d$2_QualityCheck = QualityCheck;
type index_d$2_QualityCheckResult = QualityCheckResult;
type index_d$2_QualityReport = QualityReport;
type index_d$2_QualityResult = QualityResult;
type index_d$2_QualitySeverity = QualitySeverity;
type index_d$2_Rect = Rect;
type index_d$2_RenderAsHints = RenderAsHints;
type index_d$2_RenderError = RenderError;
type index_d$2_RenderPhase = RenderPhase;
type index_d$2_ResolvedRevisionInfo = ResolvedRevisionInfo;
type index_d$2_Revision = Revision;
type index_d$2_RevisionAuthor = RevisionAuthor;
type index_d$2_RevisionDefaultsInput = RevisionDefaultsInput;
type index_d$2_RevisionResult = RevisionResult;
type index_d$2_RevisionStyleSnapshot = RevisionStyleSnapshot;
type index_d$2_RevisionTextSpan = RevisionTextSpan;
type index_d$2_RevisionTracker = RevisionTracker;
declare const index_d$2_RevisionTracker: typeof RevisionTracker;
type index_d$2_RevisionTrackingConfig = RevisionTrackingConfig;
type index_d$2_RevisionType = RevisionType;
type index_d$2_RichTextSpan = RichTextSpan;
type index_d$2_RunRevision = RunRevision;
declare const index_d$2_SANITIZER_LIMITS: typeof SANITIZER_LIMITS;
declare const index_d$2_STYLE_CAPTION: typeof STYLE_CAPTION;
declare const index_d$2_STYLE_EMPHASIS: typeof STYLE_EMPHASIS;
declare const index_d$2_STYLE_HEADING_1: typeof STYLE_HEADING_1;
declare const index_d$2_STYLE_HEADING_2: typeof STYLE_HEADING_2;
declare const index_d$2_STYLE_HEADING_3: typeof STYLE_HEADING_3;
declare const index_d$2_STYLE_HEADING_4: typeof STYLE_HEADING_4;
declare const index_d$2_STYLE_HYPERLINK: typeof STYLE_HYPERLINK;
declare const index_d$2_STYLE_IDS: typeof STYLE_IDS;
declare const index_d$2_STYLE_LIST_PARAGRAPH: typeof STYLE_LIST_PARAGRAPH;
declare const index_d$2_STYLE_NORMAL: typeof STYLE_NORMAL;
declare const index_d$2_STYLE_QUOTE: typeof STYLE_QUOTE;
declare const index_d$2_STYLE_STRONG: typeof STYLE_STRONG;
declare const index_d$2_STYLE_SUBTITLE: typeof STYLE_SUBTITLE;
declare const index_d$2_STYLE_TITLE: typeof STYLE_TITLE;
type index_d$2_Serializer = Serializer;
type index_d$2_SerializerOptions = SerializerOptions;
type index_d$2_SerializerResult = SerializerResult;
type index_d$2_StyleFontProperties = StyleFontProperties;
type index_d$2_StyleParagraphProperties = StyleParagraphProperties;
declare const index_d$2_TWIPS_PER_INCH: typeof TWIPS_PER_INCH;
type index_d$2_TableCellRevision = TableCellRevision;
type index_d$2_TableInvariantResult = TableInvariantResult;
type index_d$2_TableRevision = TableRevision;
type index_d$2_TableRevisionProperties = TableRevisionProperties;
type index_d$2_TextAlignment = TextAlignment;
type index_d$2_TextContent = TextContent;
type index_d$2_TextMeasurement = TextMeasurement;
type index_d$2_TextMeasurer = TextMeasurer;
type index_d$2_TextStyle = TextStyle;
type index_d$2_TileInfo = TileInfo;
type index_d$2_TimeoutConfig = TimeoutConfig;
type index_d$2_TimingEntry = TimingEntry;
type index_d$2_TimingStats = TimingStats;
type index_d$2_TrackChangesGranularity = TrackChangesGranularity;
type index_d$2_UnderlineStyle = UnderlineStyle;
type index_d$2_VLTPaginator = VLTPaginator;
declare const index_d$2_VLTPaginator: typeof VLTPaginator;
type index_d$2_VLTToNormalizedConfig = VLTToNormalizedConfig;
type index_d$2_ValidationError = ValidationError;
type index_d$2_ValidationIssue = ValidationIssue;
type index_d$2_ValidationOptions = ValidationOptions;
type index_d$2_ValidationResult = ValidationResult;
type index_d$2_VerticalAlignment = VerticalAlignment;
type index_d$2_WidowOrphanConfig = WidowOrphanConfig;
type index_d$2_WordStyle = WordStyle;
type index_d$2_WordStyleRegistry = WordStyleRegistry;
declare const index_d$2_WordStyleRegistry: typeof WordStyleRegistry;
type index_d$2_WordStyleSet = WordStyleSet;
type index_d$2_WordStyleType = WordStyleType;
declare const index_d$2_acceptAllRevisions: typeof acceptAllRevisions;
declare const index_d$2_assertDocumentCoordinatesValid: typeof assertDocumentCoordinatesValid;
declare const index_d$2_assertNormalizedValid: typeof assertNormalizedValid;
declare const index_d$2_assertTableInvariants: typeof assertTableInvariants;
declare const index_d$2_assertVLTValid: typeof assertVLTValid;
declare const index_d$2_boundingBox: typeof boundingBox;
declare const index_d$2_clamp: typeof clamp;
declare const index_d$2_clampRect: typeof clampRect;
declare const index_d$2_compileTrackedChangesDocument: typeof compileTrackedChangesDocument;
declare const index_d$2_compileTrackedChangesResult: typeof compileTrackedChangesResult;
declare const index_d$2_contrastRatio: typeof contrastRatio;
declare const index_d$2_createConsoleMemoryCallback: typeof createConsoleMemoryCallback;
declare const index_d$2_createConsoleProgressCallback: typeof createConsoleProgressCallback;
declare const index_d$2_createDeletedSpan: typeof createDeletedSpan;
declare const index_d$2_createFrozenNormalizedRect: typeof createFrozenNormalizedRect;
declare const index_d$2_createHeadingStyle: typeof createHeadingStyle;
declare const index_d$2_createInsertedSpan: typeof createInsertedSpan;
declare const index_d$2_createNormalizedRect: typeof createNormalizedRect;
declare const index_d$2_createNormalizedRectUnsafe: typeof createNormalizedRectUnsafe;
declare const index_d$2_createPerformanceMonitor: typeof createPerformanceMonitor;
declare const index_d$2_createPipeline: typeof createPipeline;
declare const index_d$2_createRevisionIdAllocator: typeof createRevisionIdAllocator;
declare const index_d$2_createRevisionTracker: typeof createRevisionTracker;
declare const index_d$2_createWordStyleRegistry: typeof createWordStyleRegistry;
declare const index_d$2_documentHasTrackedChanges: typeof documentHasTrackedChanges;
declare const index_d$2_emuToInches: typeof emuToInches;
declare const index_d$2_ensurePositive: typeof ensurePositive;
declare const index_d$2_estimateTextHeight: typeof estimateTextHeight;
declare const index_d$2_estimateTextWidth: typeof estimateTextWidth;
declare const index_d$2_expandRect: typeof expandRect;
declare const index_d$2_formatDuration: typeof formatDuration;
declare const index_d$2_formatRect: typeof formatRect;
declare const index_d$2_formatRectAsPercent: typeof formatRectAsPercent;
declare const index_d$2_fromPlainObject: typeof fromPlainObject;
declare const index_d$2_fromRechartsData: typeof fromRechartsData;
declare const index_d$2_generateChartDrawingXml: typeof generateChartDrawingXml;
declare const index_d$2_generateChartRelationships: typeof generateChartRelationships;
declare const index_d$2_generateRsid: typeof generateRsid;
declare const index_d$2_getArea: typeof getArea;
declare const index_d$2_getBottom: typeof getBottom;
declare const index_d$2_getCenterX: typeof getCenterX;
declare const index_d$2_getCenterY: typeof getCenterY;
declare const index_d$2_getErrorCollector: typeof getErrorCollector;
declare const index_d$2_getHeadingLevel: typeof getHeadingLevel;
declare const index_d$2_getHeadingPageMap: typeof getHeadingPageMap;
declare const index_d$2_getPerformanceMonitor: typeof getPerformanceMonitor;
declare const index_d$2_getQualitySummary: typeof getQualitySummary;
declare const index_d$2_getRevisionTracker: typeof getRevisionTracker;
declare const index_d$2_getRight: typeof getRight;
declare const index_d$2_getSupportedFonts: typeof getSupportedFonts;
declare const index_d$2_getSupportedNamedColors: typeof getSupportedNamedColors;
declare const index_d$2_getTextMeasurer: typeof getTextMeasurer;
declare const index_d$2_getWordStyleRegistry: typeof getWordStyleRegistry;
declare const index_d$2_hasDetailedMetrics: typeof hasDetailedMetrics;
declare const index_d$2_hasProblematicCharacters: typeof hasProblematicCharacters;
declare const index_d$2_hasRevisionMarkers: typeof hasRevisionMarkers;
declare const index_d$2_inchesToEMU: typeof inchesToEMU;
declare const index_d$2_inchesToPx: typeof inchesToPx;
declare const index_d$2_insetRect: typeof insetRect;
declare const index_d$2_isDocumentValid: typeof isDocumentValid;
declare const index_d$2_isValidColor: typeof isValidColor;
declare const index_d$2_lineSpacingToOOXML: typeof lineSpacingToOOXML;
declare const index_d$2_logValidationResult: typeof logValidationResult;
declare const index_d$2_normalizeDocxTextRuns: typeof normalizeDocxTextRuns;
declare const index_d$2_normalizeTrackedChangesDocument: typeof normalizeTrackedChangesDocument;
declare const index_d$2_normalizedHeightToInches: typeof normalizedHeightToInches;
declare const index_d$2_normalizedToDOCXTwips: typeof normalizedToDOCXTwips;
declare const index_d$2_normalizedToEMU: typeof normalizedToEMU;
declare const index_d$2_normalizedToPPTXInches: typeof normalizedToPPTXInches;
declare const index_d$2_normalizedToVLT: typeof normalizedToVLT;
declare const index_d$2_normalizedWidthToInches: typeof normalizedWidthToInches;
declare const index_d$2_paginateDocument: typeof paginateDocument;
declare const index_d$2_paginateDocumentAsync: typeof paginateDocumentAsync;
declare const index_d$2_parseColor: typeof parseColor;
declare const index_d$2_parseColorWithFallback: typeof parseColorWithFallback;
declare const index_d$2_parseRevisionMarkers: typeof parseRevisionMarkers;
declare const index_d$2_pointsToHalfPoints: typeof pointsToHalfPoints;
declare const index_d$2_pointsToTwips: typeof pointsToTwips;
declare const index_d$2_pxToInches: typeof pxToInches;
declare const index_d$2_pxToNormalizedHeight: typeof pxToNormalizedHeight;
declare const index_d$2_pxToNormalizedWidth: typeof pxToNormalizedWidth;
declare const index_d$2_pxToTwips: typeof pxToTwips;
declare const index_d$2_rectContains: typeof rectContains;
declare const index_d$2_rectContainsPoint: typeof rectContainsPoint;
declare const index_d$2_rectIntersection: typeof rectIntersection;
declare const index_d$2_rectsEqual: typeof rectsEqual;
declare const index_d$2_rectsHorizontallyAdjacent: typeof rectsHorizontallyAdjacent;
declare const index_d$2_rectsOverlap: typeof rectsOverlap;
declare const index_d$2_rectsVerticallyAdjacent: typeof rectsVerticallyAdjacent;
declare const index_d$2_rejectAllRevisions: typeof rejectAllRevisions;
declare const index_d$2_relativeLuminance: typeof relativeLuminance;
declare const index_d$2_resetErrorCollector: typeof resetErrorCollector;
declare const index_d$2_resetPerformanceMonitor: typeof resetPerformanceMonitor;
declare const index_d$2_resetRevisionTracker: typeof resetRevisionTracker;
declare const index_d$2_resetTextMeasurer: typeof resetTextMeasurer;
declare const index_d$2_resetWordStyleRegistry: typeof resetWordStyleRegistry;
declare const index_d$2_resolveRevisionInfo: typeof resolveRevisionInfo;
declare const index_d$2_runQualityChecks: typeof runQualityChecks;
declare const index_d$2_safeDivide: typeof safeDivide;
declare const index_d$2_sanitizeNode: typeof sanitizeNode;
declare const index_d$2_sanitizeRect: typeof sanitizeRect;
declare const index_d$2_sanitizeTextContent: typeof sanitizeTextContent;
declare const index_d$2_scaleRect: typeof scaleRect;
declare const index_d$2_setTextMeasurer: typeof setTextMeasurer;
declare const index_d$2_stripRevisionMarkers: typeof stripRevisionMarkers;
declare const index_d$2_toPlainObject: typeof toPlainObject;
declare const index_d$2_translateRect: typeof translateRect;
declare const index_d$2_transpileChart: typeof transpileChart;
declare const index_d$2_twipsToPx: typeof twipsToPx;
declare const index_d$2_validateChartConfig: typeof validateChartConfig;
declare const index_d$2_validateColumnWidths: typeof validateColumnWidths;
declare const index_d$2_validateDocument: typeof validateDocument;
declare const index_d$2_validateDocumentCoordinates: typeof validateDocumentCoordinates;
declare const index_d$2_validateNormalized: typeof validateNormalized;
declare const index_d$2_validatePage: typeof validatePage;
declare const index_d$2_validateReactElement: typeof validateReactElement;
declare const index_d$2_validateRowHeights: typeof validateRowHeights;
declare const index_d$2_validateTableInvariants: typeof validateTableInvariants;
declare const index_d$2_validateVLT: typeof validateVLT;
declare const index_d$2_validateVLTRect: typeof validateVLTRect;
declare const index_d$2_validateWordStyle: typeof validateWordStyle;
declare const index_d$2_verifyRoundTrip: typeof verifyRoundTrip;
declare const index_d$2_vltToDOCXTwips: typeof vltToDOCXTwips;
declare const index_d$2_vltToEMU: typeof vltToEMU;
declare const index_d$2_vltToNormalized: typeof vltToNormalized;
declare const index_d$2_vltToNormalizedBatch: typeof vltToNormalizedBatch;
declare const index_d$2_vltToPPTXInches: typeof vltToPPTXInches;
declare namespace index_d$2 {
  export { index_d$2_ACADEMIC_STYLES as ACADEMIC_STYLES, index_d$2_CORPORATE_STYLES as CORPORATE_STYLES, index_d$2_ChunkedPaginator as ChunkedPaginator, index_d$2_DEFAULT_CHUNK_SIZE as DEFAULT_CHUNK_SIZE, index_d$2_DEFAULT_GLOBAL_TIMEOUT as DEFAULT_GLOBAL_TIMEOUT, index_d$2_DEFAULT_HEARTBEAT_INTERVAL as DEFAULT_HEARTBEAT_INTERVAL, index_d$2_DEFAULT_PAGE_HEIGHT_INCHES as DEFAULT_PAGE_HEIGHT_INCHES, index_d$2_DEFAULT_PAGE_WIDTH_INCHES as DEFAULT_PAGE_WIDTH_INCHES, index_d$2_DEFAULT_REVISION_CONFIG as DEFAULT_REVISION_CONFIG, index_d$2_DEFAULT_SLIDE_HEIGHT_INCHES as DEFAULT_SLIDE_HEIGHT_INCHES, index_d$2_DEFAULT_SLIDE_WIDTH_INCHES as DEFAULT_SLIDE_WIDTH_INCHES, index_d$2_DEFAULT_YIELD_DELAY as DEFAULT_YIELD_DELAY, index_d$2_EMU_PER_INCH as EMU_PER_INCH, index_d$2_EstimatingTextMeasurer as EstimatingTextMeasurer, index_d$2_LEGAL_STYLES as LEGAL_STYLES, index_d$2_MAX_CELL_MAP_ENTRIES as MAX_CELL_MAP_ENTRIES, index_d$2_MAX_PAGINATION_ITERATIONS as MAX_PAGINATION_ITERATIONS, index_d$2_MAX_PLACEMENT_ATTEMPTS as MAX_PLACEMENT_ATTEMPTS, index_d$2_MAX_SPLIT_DEPTH as MAX_SPLIT_DEPTH, index_d$2_MAX_TABLE_COLS as MAX_TABLE_COLS, index_d$2_MAX_TABLE_ROWS as MAX_TABLE_ROWS, index_d$2_MEMORY_CRITICAL_THRESHOLD as MEMORY_CRITICAL_THRESHOLD, index_d$2_MEMORY_WARNING_THRESHOLD as MEMORY_WARNING_THRESHOLD, index_d$2_OFFICE_DEFAULT_STYLES as OFFICE_DEFAULT_STYLES, index_d$2_PIXELS_PER_INCH as PIXELS_PER_INCH, index_d$2_PaginationError as PaginationError, index_d$2_PerformanceMonitor as PerformanceMonitor, index_d$2_PolyglotErrorCollector as PolyglotErrorCollector, index_d$2_QUALITY_CHECKS as QUALITY_CHECKS, index_d$2_RevisionTracker as RevisionTracker, index_d$2_SANITIZER_LIMITS as SANITIZER_LIMITS, index_d$2_STYLE_CAPTION as STYLE_CAPTION, index_d$2_STYLE_EMPHASIS as STYLE_EMPHASIS, index_d$2_STYLE_HEADING_1 as STYLE_HEADING_1, index_d$2_STYLE_HEADING_2 as STYLE_HEADING_2, index_d$2_STYLE_HEADING_3 as STYLE_HEADING_3, index_d$2_STYLE_HEADING_4 as STYLE_HEADING_4, index_d$2_STYLE_HYPERLINK as STYLE_HYPERLINK, index_d$2_STYLE_IDS as STYLE_IDS, index_d$2_STYLE_LIST_PARAGRAPH as STYLE_LIST_PARAGRAPH, index_d$2_STYLE_NORMAL as STYLE_NORMAL, index_d$2_STYLE_QUOTE as STYLE_QUOTE, index_d$2_STYLE_STRONG as STYLE_STRONG, index_d$2_STYLE_SUBTITLE as STYLE_SUBTITLE, index_d$2_STYLE_TITLE as STYLE_TITLE, index_d$2_TWIPS_PER_INCH as TWIPS_PER_INCH, index_d$2_VLTPaginator as VLTPaginator, index_d$2_WordStyleRegistry as WordStyleRegistry, index_d$2_acceptAllRevisions as acceptAllRevisions, index_d$2_assertDocumentCoordinatesValid as assertDocumentCoordinatesValid, index_d$2_assertNormalizedValid as assertNormalizedValid, index_d$2_assertTableInvariants as assertTableInvariants, index_d$2_assertVLTValid as assertVLTValid, index_d$2_boundingBox as boundingBox, index_d$2_clamp as clamp, index_d$2_clampRect as clampRect, index_d$2_compileTrackedChangesDocument as compileTrackedChangesDocument, index_d$2_compileTrackedChangesResult as compileTrackedChangesResult, index_d$2_contrastRatio as contrastRatio, index_d$2_createConsoleMemoryCallback as createConsoleMemoryCallback, index_d$2_createConsoleProgressCallback as createConsoleProgressCallback, index_d$2_createDeletedSpan as createDeletedSpan, index_d$2_createFrozenNormalizedRect as createFrozenNormalizedRect, index_d$2_createHeadingStyle as createHeadingStyle, index_d$2_createInsertedSpan as createInsertedSpan, index_d$2_createNormalizedRect as createNormalizedRect, index_d$2_createNormalizedRectUnsafe as createNormalizedRectUnsafe, index_d$2_createPerformanceMonitor as createPerformanceMonitor, index_d$2_createPipeline as createPipeline, index_d$2_createRevisionIdAllocator as createRevisionIdAllocator, index_d$2_createRevisionTracker as createRevisionTracker, index_d$2_createWordStyleRegistry as createWordStyleRegistry, index_d$2_documentHasTrackedChanges as documentHasTrackedChanges, index_d$2_emuToInches as emuToInches, index_d$2_ensurePositive as ensurePositive, index_d$2_estimateTextHeight as estimateTextHeight, index_d$2_estimateTextWidth as estimateTextWidth, index_d$2_expandRect as expandRect, formatBytes$1 as formatBytes, index_d$2_formatDuration as formatDuration, index_d$2_formatRect as formatRect, index_d$2_formatRectAsPercent as formatRectAsPercent, index_d$2_fromPlainObject as fromPlainObject, index_d$2_fromRechartsData as fromRechartsData, index_d$2_generateChartDrawingXml as generateChartDrawingXml, index_d$2_generateChartRelationships as generateChartRelationships, index_d$2_generateRsid as generateRsid, index_d$2_getArea as getArea, index_d$2_getBottom as getBottom, index_d$2_getCenterX as getCenterX, index_d$2_getCenterY as getCenterY, index_d$2_getErrorCollector as getErrorCollector, index_d$2_getHeadingLevel as getHeadingLevel, index_d$2_getHeadingPageMap as getHeadingPageMap, index_d$2_getPerformanceMonitor as getPerformanceMonitor, index_d$2_getQualitySummary as getQualitySummary, index_d$2_getRevisionTracker as getRevisionTracker, index_d$2_getRight as getRight, index_d$2_getSupportedFonts as getSupportedFonts, index_d$2_getSupportedNamedColors as getSupportedNamedColors, index_d$2_getTextMeasurer as getTextMeasurer, index_d$2_getWordStyleRegistry as getWordStyleRegistry, index_d$2_hasDetailedMetrics as hasDetailedMetrics, index_d$2_hasProblematicCharacters as hasProblematicCharacters, index_d$2_hasRevisionMarkers as hasRevisionMarkers, index_d$2_inchesToEMU as inchesToEMU, index_d$2_inchesToPx as inchesToPx, index_d$2_insetRect as insetRect, index_d$2_isDocumentValid as isDocumentValid, index_d$2_isValidColor as isValidColor, index_d$2_lineSpacingToOOXML as lineSpacingToOOXML, index_d$2_logValidationResult as logValidationResult, index_d$2_normalizeDocxTextRuns as normalizeDocxTextRuns, index_d$2_normalizeTrackedChangesDocument as normalizeTrackedChangesDocument, index_d$2_normalizedHeightToInches as normalizedHeightToInches, index_d$2_normalizedToDOCXTwips as normalizedToDOCXTwips, index_d$2_normalizedToEMU as normalizedToEMU, index_d$2_normalizedToPPTXInches as normalizedToPPTXInches, index_d$2_normalizedToVLT as normalizedToVLT, index_d$2_normalizedWidthToInches as normalizedWidthToInches, index_d$2_paginateDocument as paginateDocument, index_d$2_paginateDocumentAsync as paginateDocumentAsync, index_d$2_parseColor as parseColor, index_d$2_parseColorWithFallback as parseColorWithFallback, index_d$2_parseRevisionMarkers as parseRevisionMarkers, index_d$2_pointsToHalfPoints as pointsToHalfPoints, index_d$2_pointsToTwips as pointsToTwips, index_d$2_pxToInches as pxToInches, index_d$2_pxToNormalizedHeight as pxToNormalizedHeight, index_d$2_pxToNormalizedWidth as pxToNormalizedWidth, index_d$2_pxToTwips as pxToTwips, index_d$2_rectContains as rectContains, index_d$2_rectContainsPoint as rectContainsPoint, index_d$2_rectIntersection as rectIntersection, index_d$2_rectsEqual as rectsEqual, index_d$2_rectsHorizontallyAdjacent as rectsHorizontallyAdjacent, index_d$2_rectsOverlap as rectsOverlap, index_d$2_rectsVerticallyAdjacent as rectsVerticallyAdjacent, index_d$2_rejectAllRevisions as rejectAllRevisions, index_d$2_relativeLuminance as relativeLuminance, index_d$2_resetErrorCollector as resetErrorCollector, index_d$2_resetPerformanceMonitor as resetPerformanceMonitor, index_d$2_resetRevisionTracker as resetRevisionTracker, index_d$2_resetTextMeasurer as resetTextMeasurer, index_d$2_resetWordStyleRegistry as resetWordStyleRegistry, index_d$2_resolveRevisionInfo as resolveRevisionInfo, index_d$2_runQualityChecks as runQualityChecks, index_d$2_safeDivide as safeDivide, index_d$2_sanitizeNode as sanitizeNode, index_d$2_sanitizeRect as sanitizeRect, index_d$2_sanitizeTextContent as sanitizeTextContent, index_d$2_scaleRect as scaleRect, index_d$2_setTextMeasurer as setTextMeasurer, index_d$2_stripRevisionMarkers as stripRevisionMarkers, index_d$2_toPlainObject as toPlainObject, index_d$2_translateRect as translateRect, index_d$2_transpileChart as transpileChart, index_d$2_twipsToPx as twipsToPx, index_d$2_validateChartConfig as validateChartConfig, index_d$2_validateColumnWidths as validateColumnWidths, index_d$2_validateDocument as validateDocument, index_d$2_validateDocumentCoordinates as validateDocumentCoordinates, index_d$2_validateNormalized as validateNormalized, index_d$2_validatePage as validatePage, index_d$2_validateReactElement as validateReactElement, index_d$2_validateRowHeights as validateRowHeights, index_d$2_validateTableInvariants as validateTableInvariants, index_d$2_validateVLT as validateVLT, index_d$2_validateVLTRect as validateVLTRect, index_d$2_validateWordStyle as validateWordStyle, index_d$2_verifyRoundTrip as verifyRoundTrip, index_d$2_vltToDOCXTwips as vltToDOCXTwips, index_d$2_vltToEMU as vltToEMU, index_d$2_vltToNormalized as vltToNormalized, index_d$2_vltToNormalizedBatch as vltToNormalizedBatch, index_d$2_vltToPPTXInches as vltToPPTXInches };
  export type { index_d$2_ChartConfig as ChartConfig, index_d$2_ChartTranspileResult as ChartTranspileResult, index_d$2_ChartType as ChartType, index_d$2_ChunkProgress as ChunkProgress, index_d$2_ChunkedPaginationOptions as ChunkedPaginationOptions, index_d$2_ChunkedPaginationResult as ChunkedPaginationResult, index_d$2_CommonStyles as CommonStyles, index_d$2_CompareManifestEntry as CompareManifestEntry, index_d$2_CompileTrackedChangesOptions as CompileTrackedChangesOptions, index_d$2_CompiledTrackedChangesResult as CompiledTrackedChangesResult, index_d$2_CoordinateError as CoordinateError, index_d$2_CoordinateErrorCode as CoordinateErrorCode, index_d$2_CoordinateSeverity as CoordinateSeverity, index_d$2_CoordinateValidation as CoordinateValidation, index_d$2_DOCXHints as DOCXHints, index_d$2_DOCXRect as DOCXRect, index_d$2_DataPoint as DataPoint, index_d$2_DataSeries as DataSeries, index_d$2_DocumentMetadata as DocumentMetadata, index_d$2_DocumentValidationResult as DocumentValidationResult, index_d$2_FrozenNormalizedRect as FrozenNormalizedRect, index_d$2_MemoryUsage as MemoryUsage, index_d$2_NormalizeRevisionRunsOptions as NormalizeRevisionRunsOptions, index_d$2_NormalizedRect as NormalizedRect, index_d$2_OutputFormat as OutputFormat, index_d$2_OverflowStrategy as OverflowStrategy, index_d$2_PPTXHints as PPTXHints, index_d$2_PPTXRect as PPTXRect, index_d$2_PageDimensions as PageDimensions, index_d$2_PaginationCheckpoint as PaginationCheckpoint, index_d$2_PaginationInterruptReason as PaginationInterruptReason, index_d$2_PaginationOptions as PaginationOptions, index_d$2_PaginationResult as PaginationResult, index_d$2_PaginationStats as PaginationStats, index_d$2_ParagraphRevision as ParagraphRevision, index_d$2_ParagraphRevisionProperties as ParagraphRevisionProperties, index_d$2_PerformanceMetrics as PerformanceMetrics, index_d$2_PerformanceMonitorConfig as PerformanceMonitorConfig, index_d$2_PolyglotDocument as PolyglotDocument, index_d$2_PolyglotNode as PolyglotNode, index_d$2_PolyglotNodeType as PolyglotNodeType, index_d$2_PolyglotPage as PolyglotPage, index_d$2_QualityCheck as QualityCheck, index_d$2_QualityCheckResult as QualityCheckResult, index_d$2_QualityReport as QualityReport, index_d$2_QualityResult as QualityResult, index_d$2_QualitySeverity as QualitySeverity, index_d$2_Rect as Rect, index_d$2_RenderAsHints as RenderAsHints, index_d$2_RenderError as RenderError, index_d$2_RenderPhase as RenderPhase, index_d$2_ResolvedRevisionInfo as ResolvedRevisionInfo, index_d$2_Revision as Revision, index_d$2_RevisionAuthor as RevisionAuthor, index_d$2_RevisionDefaultsInput as RevisionDefaultsInput, index_d$2_RevisionResult as RevisionResult, index_d$2_RevisionStyleSnapshot as RevisionStyleSnapshot, index_d$2_RevisionTextSpan as RevisionTextSpan, index_d$2_RevisionTrackingConfig as RevisionTrackingConfig, index_d$2_RevisionType as RevisionType, index_d$2_RichTextSpan as RichTextSpan, index_d$2_RunRevision as RunRevision, index_d$2_Serializer as Serializer, index_d$2_SerializerOptions as SerializerOptions, index_d$2_SerializerResult as SerializerResult, index_d$2_StyleFontProperties as StyleFontProperties, index_d$2_StyleParagraphProperties as StyleParagraphProperties, index_d$2_TableCellRevision as TableCellRevision, index_d$2_TableInvariantResult as TableInvariantResult, index_d$2_TableRevision as TableRevision, index_d$2_TableRevisionProperties as TableRevisionProperties, index_d$2_TextAlignment as TextAlignment, index_d$2_TextContent as TextContent, index_d$2_TextMeasurement as TextMeasurement, index_d$2_TextMeasurer as TextMeasurer, index_d$2_TextStyle as TextStyle, index_d$2_TileInfo as TileInfo, index_d$2_TimeoutConfig as TimeoutConfig, index_d$2_TimingEntry as TimingEntry, index_d$2_TimingStats as TimingStats, index_d$2_TrackChangesGranularity as TrackChangesGranularity, index_d$2_UnderlineStyle as UnderlineStyle, index_d$2_VLTToNormalizedConfig as VLTToNormalizedConfig, index_d$2_ValidationError as ValidationError, index_d$2_ValidationIssue as ValidationIssue, index_d$2_ValidationOptions as ValidationOptions, index_d$2_ValidationResult as ValidationResult, index_d$2_VerticalAlignment as VerticalAlignment, index_d$2_WidowOrphanConfig as WidowOrphanConfig, index_d$2_WordStyle as WordStyle, index_d$2_WordStyleSet as WordStyleSet, index_d$2_WordStyleType as WordStyleType };
}

/**
 * Visual Polish Type Definitions
 * ==============================
 *
 * Core types for the Design Token System, Visual Effects,
 * and Document Furniture layers.
 */
/** Print-safe point unit (1/72 inch) */
type PT = number;
/** Millimeters */
type MM = number;
/** Inches */
type INCH = number;
/** Layout Base Units (internal coordinate system) */
type LBU = number;
/** Percentage (0-100) */
type Percent = number;
/** CMYK color value (0-100 each channel) */
interface CMYKColor {
    c: Percent;
    m: Percent;
    y: Percent;
    k: Percent;
}
/** RGB color value (0-255 each channel) */
interface RGBColor {
    r: number;
    g: number;
    b: number;
}
/** Hex color string (#RRGGBB or #RGB) */
type HexColor = string;
/** Any supported color format */
type ColorValue = HexColor | RGBColor | CMYKColor;
/** Color palette tokens */
interface ColorTokens {
    /** Primary brand color */
    "brand-primary": HexColor;
    /** Secondary brand color */
    "brand-secondary"?: HexColor;
    /** Main text color */
    "text-main": HexColor;
    /** Muted text color */
    "text-muted"?: HexColor;
    /** Primary surface/background color */
    "bg-surface": HexColor;
    /** Secondary surface color */
    "bg-surface-alt"?: HexColor;
    /** Accent color for highlights */
    accent?: HexColor;
    /** Success color */
    "semantic-success"?: HexColor;
    /** Warning color */
    "semantic-warning"?: HexColor;
    /** Error/danger color */
    "semantic-error"?: HexColor;
    /** Chart color sequence for data series */
    "chart-sequence": HexColor[];
    /** Table border color */
    "table-border"?: HexColor;
    /** Table header background */
    "table-header-bg"?: HexColor;
    /** Table zebra stripe color */
    "table-stripe"?: HexColor;
}
/** Spacing tokens (all in PT) */
interface SpacingTokens {
    /** Base grid unit (default: 4pt) */
    "grid-base": string;
    /** Container padding */
    "container-padding": string;
    /** Table cell vertical padding */
    "table-cell-y": string;
    /** Table cell horizontal padding */
    "table-cell-x"?: string;
    /** Section spacing */
    "section-gap"?: string;
    /** Paragraph spacing */
    "paragraph-gap"?: string;
    /** Small spacing */
    "spacing-xs"?: string;
    /** Medium spacing */
    "spacing-sm"?: string;
    /** Large spacing */
    "spacing-md"?: string;
    /** Extra large spacing */
    "spacing-lg"?: string;
}
/** Typography tokens */
interface TypographyTokens {
    /** Heading font family */
    "font-heading": string;
    /** Body font family */
    "font-body": string;
    /** Monospace font family */
    "font-mono"?: string;
    /** Type scale ratio (e.g., 1.25 for Major Third) */
    "scale-ratio": number;
    /** Base font size */
    "base-size": string;
    /** Line height multiplier */
    "line-height": number;
    /** Letter spacing */
    "letter-spacing"?: string;
    /** Heading line height */
    "heading-line-height"?: number;
    /** Font weight for body text */
    "font-weight-normal"?: number;
    /** Font weight for bold text */
    "font-weight-bold"?: number;
}
/** Border/radius tokens */
interface GeometryTokens {
    /** Border radius for cards */
    "radius-sm"?: string;
    /** Border radius for larger elements */
    "radius-md"?: string;
    /** Border radius for buttons */
    "radius-lg"?: string;
    /** Default border width */
    "border-width"?: string;
}
/** Complete theme token structure */
interface ThemeTokens {
    colors: ColorTokens;
    spacing: SpacingTokens;
    typography: TypographyTokens;
    geometry?: GeometryTokens;
}
/** Full theme configuration */
interface Theme {
    /** Unique theme identifier */
    theme_id: string;
    /** Theme display name */
    name?: string;
    /** Theme description */
    description?: string;
    /** Token definitions */
    tokens: ThemeTokens;
    /** Custom font URLs to load */
    fontUrls?: string[];
    /** ICC profile for CMYK conversion */
    iccProfile?: string;
}
/** Grid alignment result */
interface GridAlignment {
    /** Original height */
    originalHeight: PT;
    /** Aligned height (snapped to grid) */
    alignedHeight: PT;
    /** Bottom spacer added */
    spacerHeight: PT;
    /** Number of grid units */
    gridUnits: number;
}
/** Baseline grid configuration */
interface BaselineGridConfig {
    /** Base grid unit in points */
    gridBase: PT;
    /** Whether to enforce strict alignment */
    strictMode: boolean;
    /** Tolerance for sub-pixel differences */
    tolerance: PT;
}
/** Shadow definition */
interface ShadowConfig {
    /** Horizontal offset */
    offsetX: PT;
    /** Vertical offset */
    offsetY: PT;
    /** Blur radius */
    blur: PT;
    /** Spread radius */
    spread: PT;
    /** Shadow color */
    color: HexColor;
    /** Opacity (0-1) */
    opacity: number;
    /** Inset shadow */
    inset?: boolean;
}
/** SVG filter definition for shadow */
interface ShadowFilter {
    /** Filter ID */
    filterId: string;
    /** SVG filter definition string */
    filterDef: string;
    /** CSS filter reference */
    cssFilter: string;
}
/** Gradient stop */
interface GradientStop {
    /** Color at this stop */
    color: HexColor;
    /** Position (0-100%) */
    position: Percent;
}
/** Gradient definition */
interface GradientConfig {
    /** Gradient type */
    type: "linear" | "radial";
    /** Gradient angle (for linear) */
    angle?: number;
    /** Gradient stops */
    stops: GradientStop[];
    /** Whether to apply dithering */
    dither?: boolean;
}
/** Dither filter result */
interface DitherFilter {
    /** Filter ID */
    filterId: string;
    /** SVG filter definition */
    filterDef: string;
}
/** Page box dimensions */
interface PageBox {
    /** X origin */
    x: PT;
    /** Y origin */
    y: PT;
    /** Width */
    width: PT;
    /** Height */
    height: PT;
}
/** Pre-press boxes (all four boxes) */
interface PrePressBoxes {
    /** Physical paper size (includes all marks) */
    mediaBox: PageBox;
    /** Bleed area */
    bleedBox: PageBox;
    /** Final trim size */
    trimBox: PageBox;
    /** Safe content area */
    artBox: PageBox;
}
/** Crop mark configuration */
interface CropMarkConfig {
    /** Length of crop mark lines */
    length: PT;
    /** Offset from trim edge */
    offset: PT;
    /** Stroke width */
    strokeWidth: PT;
    /** Stroke color ('registration' for all inks) */
    color: HexColor | "registration";
}
/** Pre-press configuration */
interface PrePressConfig {
    /** Final trim size */
    trimSize?: {
        width: PT;
        height: PT;
    };
    /** Bleed extension (typically 3mm = 9pt) */
    bleed?: PT;
    /** Safety margin (typically 5mm = 18pt) */
    safeMargin?: PT;
    /** Whether to include crop marks */
    cropMarks?: boolean;
    /** Whether to include registration marks */
    registrationMarks?: boolean;
    /** Whether to include color bar */
    colorBar?: boolean;
    /** Whether to include slug information */
    slug?: boolean;
    /** Crop mark length */
    cropMarkLength?: PT;
    /** Crop mark offset from trim */
    cropMarkOffset?: PT;
    /** Bleed area background color */
    bleedColor?: HexColor;
    /** Legacy aliases */
    safetyMargin?: PT;
    includeCropMarks?: boolean;
    includeRegistrationMarks?: boolean;
}
/** Triple box model (legacy interface) */
interface TripleBoxModel {
    /** Physical paper size (includes bleed) */
    mediaBox: PageBox;
    /** Bleed area */
    bleedBox: PageBox;
    /** Final trim size */
    trimBox: PageBox;
    /** Safe content area */
    safetyBox: PageBox;
}
/** Crop mark definition (legacy) */
interface CropMark {
    /** Start point */
    start: {
        x: PT;
        y: PT;
    };
    /** End point */
    end: {
        x: PT;
        y: PT;
    };
    /** Mark type */
    type: "corner" | "center";
}
/** Color gamut status */
type GamutStatus = "in-gamut" | "out-of-gamut" | "clipped";
/** Color conversion result */
interface ColorConversion {
    /** Original RGB color */
    original: RGBColor;
    /** Converted CMYK color */
    cmyk: CMYKColor;
    /** Gamut status */
    gamutStatus: GamutStatus;
    /** Delta E (color difference) */
    deltaE?: number;
}
/** Section marker for running headers */
interface SectionMarker {
    /** Section ID */
    id: string;
    /** Section title */
    title: string;
    /** Section level (1 = h1, 2 = h2, etc.) */
    level: number;
    /** Page number where section starts */
    startPage: number;
    /** Element selector */
    selector?: string;
}
/** Running header configuration */
interface RunningHeaderConfig {
    /** Header template */
    template: string;
    /** Section priority rule */
    priorityRule: "first-on-page" | "starts-on-page" | "last-on-page";
    /** Show on first page */
    showOnFirstPage: boolean;
    /** Show on cover pages */
    showOnCover: boolean;
    /** Exclude sections by level */
    excludeLevels?: number[];
}
/** Page numbering style */
type NumberingStyle = "arabic" | "roman-lower" | "roman-upper" | "alpha-lower" | "alpha-upper";
/** Page numbering configuration */
interface PageNumberingConfig {
    /** Format string (e.g., "Page {{PAGE}} of {{TOTAL}}") */
    format: string;
    /** Numbering style */
    style: NumberingStyle;
    /** Start page number */
    startNumber: number;
    /** Pages to skip numbering */
    skipPages?: number[];
    /** Use tabular numbers for alignment */
    tabularNums: boolean;
}
/** Resolved page number */
interface ResolvedPageNumber {
    /** Current page number */
    current: number;
    /** Total pages */
    total: number;
    /** Formatted string */
    formatted: string;
}
/** Page layout type */
type LayoutType = "standard" | "cover" | "chapter" | "multi-column" | "landscape";
/** Layout override configuration */
interface LayoutOverride {
    /** Layout type */
    type: LayoutType;
    /** Number of columns (for multi-column) */
    columns?: number;
    /** Column gap */
    columnGap?: PT;
    /** Custom margins */
    margins?: {
        top?: PT;
        right?: PT;
        bottom?: PT;
        left?: PT;
    };
    /** Full bleed background */
    fullBleed?: boolean;
}
/** Cover page configuration */
interface CoverPageConfig {
    /** Background color or image */
    background?: HexColor | {
        url: string;
    };
    /** Title text */
    title?: string;
    /** Subtitle text */
    subtitle?: string;
    /** Logo URL */
    logo?: string;
    /** Date */
    date?: string;
    /** Custom content */
    customContent?: string;
}
/** Table continuation state */
interface TableContinuationState {
    /** Table ID */
    tableId: string;
    /** Table caption */
    caption?: string;
    /** Current page segment */
    segment: number;
    /** Total segments */
    totalSegments: number;
    /** Last row index on previous page */
    lastRowIndex: number;
    /** Last row was even (for zebra striping) */
    lastRowWasEven: boolean;
}
/** Continuation badge configuration */
interface ContinuationBadgeConfig {
    /** Show continuation badge */
    showBadge: boolean;
    /** Badge template (e.g., "{{CAPTION}} (Continued)") */
    template: string;
    /** Badge position */
    position: "above-header" | "in-header" | "below-header";
    /** Badge styling */
    style?: {
        fontStyle?: "normal" | "italic";
        fontSize?: PT;
        color?: HexColor;
    };
}
/** Zebra stripe configuration */
interface ZebraStripeConfig {
    /** Enable zebra striping */
    enabled: boolean;
    /** Even row color */
    evenColor: HexColor;
    /** Odd row color */
    oddColor: HexColor;
    /** Start with even (true) or odd (false) */
    startEven: boolean;
}
/** Watermark type */
type WatermarkType = "text" | "image";
/** Watermark position */
type WatermarkPosition = "center" | "diagonal" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
/** Watermark configuration */
interface WatermarkConfig {
    /** Watermark type */
    type: WatermarkType;
    /** Text content (for text watermarks) */
    text?: string;
    /** Image URL (for image watermarks) */
    imageUrl?: string;
    /** Position on page */
    position: WatermarkPosition;
    /** Rotation angle (degrees) */
    rotation?: number;
    /** Opacity (0-1) */
    opacity: number;
    /** Font size (for text) */
    fontSize?: PT;
    /** Font family (for text) */
    fontFamily?: string;
    /** Color (for text) */
    color?: HexColor;
    /** Blend mode */
    blendMode: "normal" | "multiply" | "screen" | "overlay";
    /** Pages to apply watermark */
    pages?: "all" | "odd" | "even" | number[];
    /** Z-index layer */
    layer: number;
}
/** Rendered watermark */
interface RenderedWatermark {
    /** SVG element string */
    svg: string;
    /** CSS for positioning */
    css: string;
    /** Layer index */
    layer: number;
}
/** Token category for cache invalidation */
type TokenCategory = "color" | "spacing" | "typography" | "geometry";
/** Layout impact level */
type LayoutImpact = "none" | "partial" | "full";
/** Cache invalidation result */
interface CacheInvalidation {
    /** Whether cache should be cleared */
    shouldClear: boolean;
    /** Impact level */
    impact: LayoutImpact;
    /** Changed categories */
    changedCategories: TokenCategory[];
    /** Layout-impacting hash */
    layoutHash: string;
    /** Previous hash (if available) */
    previousHash?: string;
}
/** Test assertion */
interface Assertion {
    description: string;
    expected: string;
    actual: string;
    passed: boolean;
}
/** Test result */
interface TestResult {
    name: string;
    docReference: string;
    status: "passed" | "failed" | "warning";
    message: string;
    assertions: Assertion[];
    durationMs: number;
    visualData?: {
        svg?: string;
        elements?: any[];
    };
}
/** Verification report */
interface VerificationReport {
    timestamp: string;
    totalTests: number;
    passed: number;
    failed: number;
    results: TestResult[];
    executionTimeMs: number;
}

/**
 * Design Token System (Doc 1, Section 2)
 * ======================================
 *
 * Implements the SOTA Token Schema for enterprise-grade theming.
 * Supports print-safe units (pt, mm) and ensures layout consistency
 * regardless of screen resolution.
 */

/** Default enterprise light theme */
declare const DEFAULT_THEME: Theme;
/** Enterprise dark theme */
declare const DARK_THEME: Theme;
/** Compact theme (9pt font) */
declare const COMPACT_THEME: Theme;
/** Spacious theme (12pt font) */
declare const SPACIOUS_THEME: Theme;
/**
 * Convert hex color to RGB
 */
declare function hexToRgb(hex: HexColor): RGBColor;
/**
 * Calculate contrast ratio between two colors
 * (WCAG 2.1 formula)
 */
declare function calculateContrastRatio(color1: HexColor, color2: HexColor): number;
/**
 * Check if contrast meets WCAG AA standard (4.5:1 for normal text)
 */
declare function meetsWCAGAA(color1: HexColor, color2: HexColor): boolean;
/**
 * DesignTokenManager - Manages theme tokens and provides computed values
 */
declare class DesignTokenManager {
    private theme;
    private typeScale;
    constructor(theme?: Theme);
    /**
     * Get the current theme
     */
    getTheme(): Theme;
    /**
     * Set a new theme
     */
    setTheme(theme: Theme): void;
    /**
     * Load theme by ID from registry
     */
    loadTheme(themeId: string): boolean;
    /**
     * Get a color token
     */
    getColor(key: keyof ColorTokens): HexColor | HexColor[] | undefined;
    /**
     * Get a spacing token as PT value
     */
    getSpacing(key: keyof SpacingTokens): PT | undefined;
    /**
     * Get a typography token
     */
    getTypography<K extends keyof TypographyTokens>(key: K): TypographyTokens[K] | undefined;
    /**
     * Get the grid base unit
     */
    getGridBase(): PT;
    /**
     * Get the base font size
     */
    getBaseFontSize(): PT;
    /**
     * Get computed type scale
     */
    getTypeScale(): PT[];
    /**
     * Get font size for heading level
     */
    getHeadingSize(level: 1 | 2 | 3 | 4 | 5 | 6): PT;
    /**
     * Get chart color at index (wraps around)
     */
    getChartColor(index: number): HexColor;
    /**
     * Check contrast between text and background
     */
    checkTextContrast(): {
        passes: boolean;
        ratio: number;
    };
    /**
     * Compute type scale from base size and ratio
     */
    private computeTypeScale;
    /**
     * Merge partial theme tokens
     */
    mergeTokens(partialTokens: Partial<ThemeTokens>): void;
    /**
     * Export tokens as JSON
     */
    toJSON(): string;
    /**
     * Create from JSON
     */
    static fromJSON(json: string): DesignTokenManager;
}
/** Default design token manager instance */
declare const designTokenManager: DesignTokenManager;

/**
 * Baseline Grid & Vertical Rhythm (Doc 1, Section 3)
 * ===================================================
 *
 * Implements the SOTA baseline grid system that ensures all elements
 * snap to a consistent grid, creating visual harmony across the document.
 *
 * Key Features:
 * - Snap-to-grid calculations
 * - Bottom spacer injection
 * - Cross-column baseline alignment
 */

/** Default baseline grid configuration */
declare const DEFAULT_GRID_CONFIG: BaselineGridConfig;
/**
 * BaselineGridCalculator - Handles all snap-to-grid calculations
 *
 * Doc 1, Section 3: "All line-heights, margins, and padding must be
 * multiples of the grid-base (e.g., 4pt)."
 */
declare class BaselineGridCalculator {
    private config;
    constructor(config?: Partial<BaselineGridConfig>);
    /**
     * Get the grid base from theme or config
     */
    getGridBase(): PT;
    /**
     * Snap a value to the nearest grid line
     *
     * Doc 1: "If an element is measured at 102.5pt but the grid is 4pt,
     * the engine automatically adds a 1.5pt 'Bottom Spacer' to snap
     * the next element to the next baseline (104pt)."
     */
    snapToGrid(value: PT): GridAlignment;
    /**
     * Snap a value down to the nearest grid line
     */
    snapToGridFloor(value: PT): GridAlignment;
    /**
     * Round to nearest grid line (up or down)
     */
    roundToGrid(value: PT): GridAlignment;
    /**
     * Check if a value is aligned to the grid
     */
    isAligned(value: PT): boolean;
    /**
     * Calculate the spacer needed to align an element
     */
    calculateSpacer(currentHeight: PT): PT;
    /**
     * Calculate line height that aligns to the grid
     */
    calculateAlignedLineHeight(fontSize: PT, baseLineHeight: number): PT;
    /**
     * Calculate margin that aligns to the grid
     */
    calculateAlignedMargin(desiredMargin: PT): PT;
    /**
     * Calculate the cumulative height with grid alignment
     */
    accumulateAlignedHeights(heights: PT[]): {
        total: PT;
        alignments: GridAlignment[];
        spacers: PT[];
    };
    /**
     * Ensure cross-column alignment
     *
     * Doc 1: "This creates a visual 'harmony' where text in the left column
     * perfectly aligns with text in the right column, even if they have
     * different font sizes."
     */
    alignColumns(leftColumnHeights: PT[], rightColumnHeights: PT[]): {
        left: {
            heights: PT[];
            spacers: PT[];
        };
        right: {
            heights: PT[];
            spacers: PT[];
        };
        aligned: boolean;
    };
    /**
     * Generate CSS for baseline grid visualization (debugging)
     */
    generateGridOverlayCSS(): string;
    /**
     * Generate SVG baseline grid for verification
     */
    generateGridSVG(width: number, height: number): string;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<BaselineGridConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): BaselineGridConfig;
}
/**
 * VerticalRhythmManager - Higher-level manager for document rhythm
 */
declare class VerticalRhythmManager {
    private gridCalculator;
    private cursorY;
    constructor(gridCalculator?: BaselineGridCalculator);
    /**
     * Reset cursor position
     */
    reset(): void;
    /**
     * Get current cursor position
     */
    getCursor(): PT;
    /**
     * Advance cursor by element height (with grid alignment)
     */
    advanceCursor(elementHeight: PT): GridAlignment;
    /**
     * Advance cursor with explicit spacer
     */
    advanceWithSpacer(elementHeight: PT, explicitSpacer?: PT): PT;
    /**
     * Check if cursor is on a grid line
     */
    isOnGrid(): boolean;
    /**
     * Snap cursor to next grid line
     */
    snapCursor(): PT;
    /**
     * Calculate element placement with proper rhythm
     */
    placeElement(elementHeight: PT, marginTop?: PT, marginBottom?: PT): {
        position: PT;
        height: PT;
        totalSpace: PT;
        spacer: PT;
    };
    /**
     * Calculate proper line height for font size
     */
    getAlignedLineHeight(fontSize: PT): PT;
    /**
     * Get the underlying grid calculator
     */
    getGridCalculator(): BaselineGridCalculator;
}

/**
 * CSS Variable Bridge (Doc 1, Section 4)
 * ======================================
 *
 * Injects design tokens as CSS variables for seamless integration
 * with React components and styled-components.
 *
 * Doc 1: "At the start of Pass 1 (Ghost Render), the engine applies
 * the theme to the DOM."
 */

/**
 * CSSVariableBridge - Generates and injects CSS variables from theme tokens
 */
declare class CSSVariableBridge {
    private theme;
    private cssCache;
    constructor(theme?: Theme);
    /**
     * Update the theme
     */
    setTheme(theme: Theme): void;
    /**
     * Generate CSS variable declarations
     */
    generateCSSVariables(): string;
    /**
     * Add type scale CSS variables
     */
    private addTypeScaleVariables;
    /**
     * Generate CSS for component theming
     */
    generateComponentCSS(): string;
    /**
     * Generate style element for DOM injection
     */
    generateStyleElement(): string;
    /**
     * Get a specific CSS variable value
     */
    getCSSVariable(name: string): string | undefined;
    /**
     * Get all chart colors as array
     */
    getChartColors(): HexColor[];
    /**
     * Get CSS variable reference for use in components
     */
    var(name: string): string;
}

/**
 * Height Cache Invalidation (Doc 1, Section 5)
 * ============================================
 *
 * Implements smart cache invalidation based on layout-impacting tokens.
 *
 * Doc 1: "The engine generates a Layout-Impacting Hash based only on
 * tokens that affect height (Spacing, Typography)."
 *
 * - Color changes = Fast Pass (reuse cached heights)
 * - Typography/Spacing changes = Safe Pass (re-measure everything)
 */

/**
 * HeightCacheInvalidator - Determines when to invalidate cached measurements
 */
declare class HeightCacheInvalidator {
    private previousTheme;
    private previousLayoutHash;
    private heightCache;
    constructor();
    /**
     * Check if cache should be invalidated based on theme change
     */
    checkInvalidation(newTheme: Theme): CacheInvalidation;
    /**
     * Get categories that changed between themes
     */
    private getChangedCategories;
    /**
     * Store height in cache
     */
    setHeight(key: string, height: number): void;
    /**
     * Get height from cache
     */
    getHeight(key: string): number | undefined;
    /**
     * Check if height is cached
     */
    hasHeight(key: string): boolean;
    /**
     * Clear the height cache
     */
    clearCache(): void;
    /**
     * Get current cache size
     */
    getCacheSize(): number;
    /**
     * Get current layout hash
     */
    getCurrentLayoutHash(): string;
    /**
     * Check if a specific token change would require re-measurement
     */
    isLayoutImpacting(tokenKey: string): boolean;
    /**
     * Perform a "Fast Pass" - color-only changes
     *
     * Doc 1: "If you change a Color token, the Paginator re-uses
     * the cached heights (Fast Pass)."
     */
    fastPass(colorChanges: Partial<Record<string, string>>): boolean;
    /**
     * Perform a "Safe Pass" - typography/spacing changes
     *
     * Doc 1: "If you change a Typography or Spacing token, the Paginator
     * clears the cache and re-measures (Safe Pass)."
     */
    safePass(): void;
    /**
     * Get detailed cache statistics
     */
    getStats(): {
        cacheSize: number;
        layoutHash: string;
        layoutTokenCount: number;
        nonLayoutTokenCount: number;
    };
}
/**
 * ThemeChangeDetector - Detects and categorizes theme changes
 */
declare class ThemeChangeDetector {
    private invalidator;
    constructor(invalidator?: HeightCacheInvalidator);
    /**
     * Analyze a theme change
     */
    analyze(oldTheme: Theme, newTheme: Theme): {
        isLayoutChange: boolean;
        isColorChange: boolean;
        changedTokens: {
            key: string;
            category: TokenCategory;
            old: any;
            new: any;
        }[];
        recommendation: "fast-pass" | "safe-pass" | "no-change";
    };
    /**
     * Compare token objects and record changes
     */
    private compareTokens;
}

/**
 * Vector Shadow Physics (Doc 2, Section 2)
 * ========================================
 *
 * Implements SVG filter-based shadows that render as true vectors,
 * avoiding the blurry rasterization of CSS box-shadow.
 *
 * Doc 2: "The engine intercepts component shadows and translates them
 * into SVG <filter> definitions using feGaussianBlur and feOffset."
 */

/** Shadow presets for common use cases */
declare const SHADOW_PRESETS: {
    /** Subtle elevation shadow */
    sm: ShadowConfig;
    /** Standard card shadow */
    md: ShadowConfig;
    /** Elevated shadow */
    lg: ShadowConfig;
    /** Floating shadow */
    xl: ShadowConfig;
    /** Inner shadow (inset) */
    inset: ShadowConfig;
};
/**
 * ShadowFilterGenerator - Creates SVG filters for premium shadows
 *
 * Doc 2: "The 'Shadow Scale' Constant - To prevent shadows from looking
 * different at various page sizes, the engine calculates the 'Shadow Spread'
 * as a percentage of the Layout Base Units (LBU)."
 */
declare class ShadowFilterGenerator {
    private filterCache;
    /**
     * Generate a unique filter ID
     */
    private generateFilterId;
    /**
     * Generate a cache key for a shadow config
     */
    private getCacheKey;
    /**
     * Generate SVG filter for a shadow
     *
     * Doc 2: "feGaussianBlur and feOffset" with "color-interpolation-filters='sRGB'"
     * to prevent the "grey-block" artifact.
     */
    generateShadowFilter(config?: ShadowConfig): ShadowFilter;
    /**
     * Generate filter elements for drop shadow
     */
    private generateDropShadowElements;
    /**
     * Generate filter elements for inset shadow
     */
    private generateInsetShadowElements;
    /**
     * Generate multiple shadow filters for layered effect
     */
    generateMultiShadowFilter(configs: ShadowConfig[]): ShadowFilter;
    /**
     * Generate CSS box-shadow equivalent for fallback
     */
    generateCSSFallback(config: ShadowConfig): string;
    /**
     * Generate SVG defs section with all cached filters
     */
    generateDefsSection(): string;
    /**
     * Clear the filter cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        filters: string[];
    };
}
/**
 * ShadowApplicator - Applies shadows to SVG elements
 */
declare class ShadowApplicator {
    private generator;
    private collectedFilters;
    constructor(generator?: ShadowFilterGenerator);
    /**
     * Apply shadow to an SVG element string
     */
    applyShadow(svgElement: string, config?: ShadowConfig): {
        element: string;
        filter: ShadowFilter;
    };
    /**
     * Generate a shadowed rect element
     */
    generateShadowedRect(x: number, y: number, width: number, height: number, config?: ShadowConfig, additionalAttrs?: Record<string, string>): {
        rect: string;
        filter: ShadowFilter;
    };
    /**
     * Get all filter definitions needed for collected shadows
     */
    getFilterDefs(): string;
    /**
     * Reset collected filters
     */
    reset(): void;
}
/** Default shadow filter generator */
declare const shadowFilterGenerator: ShadowFilterGenerator;
/** Default shadow applicator */
declare const shadowApplicator: ShadowApplicator;

/**
 * Anti-Banding Gradient Dithering (Doc 2, Section 3)
 * ==================================================
 *
 * Implements perceptual dithering for smooth gradients using SVG filters.
 *
 * Doc 2: "When the engine detects a gradient with a low color delta...
 * it automatically injects a Deterministic Noise Grain via an SVG filter."
 *
 * Technical: Using feTurbulence with low base frequency and mode="multiply"
 */

/**
 * GradientGenerator - Creates smooth, dithered gradients
 */
declare class GradientGenerator {
    private gradientCache;
    private ditherFilterCache;
    /**
     * Generate unique gradient ID
     */
    private generateGradientId;
    /**
     * Generate unique dither filter ID
     */
    private generateDitherFilterId;
    /**
     * Generate SVG linear gradient definition
     */
    generateLinearGradient(config: GradientConfig): {
        gradientId: string;
        gradientDef: string;
        fill: string;
    };
    /**
     * Generate SVG radial gradient definition
     */
    generateRadialGradient(config: GradientConfig): {
        gradientId: string;
        gradientDef: string;
        fill: string;
    };
    /**
     * Generate dither noise filter
     *
     * Doc 2: "Using feTurbulence with a very low base frequency
     * and mode='multiply'"
     */
    generateDitherFilter(intensity?: number): DitherFilter;
    /**
     * Generate gradient with automatic dithering
     */
    generateGradientWithDither(config: GradientConfig, width: PT, height: PT): {
        gradientId: string;
        gradientDef: string;
        ditherFilter?: DitherFilter;
        fill: string;
        filter?: string;
    };
    /**
     * Generate a smooth grey-to-white gradient (common banding case)
     */
    generateSubtleGradient(startColor?: HexColor, endColor?: HexColor, angle?: number): GradientConfig;
    /**
     * Clear all caches
     */
    clearCache(): void;
}
/**
 * GradientRectGenerator - Creates complete SVG elements with gradients
 */
declare class GradientRectGenerator {
    private generator;
    private collectedDefs;
    constructor(generator?: GradientGenerator);
    /**
     * Generate a rect with gradient fill and optional dithering
     */
    generateGradientRect(x: number, y: number, width: number, height: number, config: GradientConfig, additionalAttrs?: Record<string, string>): {
        rect: string;
        defs: string;
    };
    /**
     * Generate a full-page gradient background
     */
    generatePageBackground(width: number, height: number, config: GradientConfig): string;
    /**
     * Get all collected definitions
     */
    getCollectedDefs(): string;
    /**
     * Reset collected definitions
     */
    reset(): void;
}
/** Common gradient presets */
declare const GRADIENT_PRESETS: {
    /** Subtle white to light grey (common banding case) */
    subtleGrey: {
        type: "linear";
        angle: number;
        stops: {
            color: string;
            position: number;
        }[];
        dither: boolean;
    };
    /** Soft blue gradient */
    softBlue: {
        type: "linear";
        angle: number;
        stops: {
            color: string;
            position: number;
        }[];
        dither: boolean;
    };
    /** Professional header gradient */
    headerDark: {
        type: "linear";
        angle: number;
        stops: {
            color: string;
            position: number;
        }[];
        dither: boolean;
    };
    /** Warm sunset gradient */
    warmSunset: {
        type: "linear";
        angle: number;
        stops: {
            color: string;
            position: number;
        }[];
        dither: boolean;
    };
    /** Radial spotlight */
    spotlight: {
        type: "radial";
        stops: {
            color: string;
            position: number;
        }[];
        dither: boolean;
    };
};
/** Default gradient generator */
declare const gradientGenerator: GradientGenerator;
/** Default gradient rect generator */
declare const gradientRectGenerator: GradientRectGenerator;

/**
 * Pre-Press Furniture (Doc 2, Section 4)
 * ======================================
 *
 * Implements professional print-ready PDF structure:
 * - MediaBox, BleedBox, TrimBox definitions
 * - Crop marks and registration marks
 * - Color bars for print verification
 *
 * Doc 2: "Professional PDF prepress spec differentiates three main boxes:
 * MediaBox (physical page), BleedBox (extends beyond trim), TrimBox (final cut)"
 */

/** Standard bleed sizes in points */
declare const BLEED_SIZES: {
    readonly none: 0;
    readonly standard: 9;
    readonly extended: 18;
    readonly maximum: 36;
};
/**
 * Convert millimeters to points
 */
declare function mmToPt(mm: MM): PT;
/**
 * Convert inches to points
 */
declare function inchToPt(inches: INCH): PT;
/**
 * Convert points to millimeters
 */
declare function ptToMm(pt: PT): MM;
/**
 * PrePressBoxCalculator - Calculates media, bleed, trim, and art boxes
 */
declare class PrePressBoxCalculator {
    private config;
    constructor(config: PrePressConfig);
    /**
     * Calculate all pre-press boxes from trim size
     *
     * Doc 2: "MediaBox encompasses everything, BleedBox extends
     * 3mm beyond the TrimBox, TrimBox defines the actual final page."
     */
    calculateBoxes(trimWidth: PT, trimHeight: PT): PrePressBoxes;
    /**
     * Get CSS for bleed-safe content area
     */
    getBleedSafeCSS(): string;
}
/**
 * CropMarksGenerator - Creates crop marks and registration marks
 */
declare class CropMarksGenerator {
    private config;
    constructor(config?: Partial<CropMarkConfig>);
    /**
     * Generate crop marks SVG for a page
     *
     * Crop marks are placed at all four corners, indicating where to cut.
     */
    generateCropMarks(trimWidth: PT, trimHeight: PT): string;
    /**
     * Generate registration marks
     *
     * Registration marks help align color separations in multi-color printing.
     */
    generateRegistrationMarks(trimWidth: PT, trimHeight: PT): string;
    /**
     * Generate color bar for print verification
     *
     * Color bars help printers verify color density and registration.
     */
    generateColorBar(trimWidth: PT, trimHeight: PT): string;
}
/**
 * SlugContentGenerator - Creates slug area content (job info, dates, etc.)
 */
declare class SlugContentGenerator {
    /**
     * Generate slug with job information
     */
    generateSlug(trimWidth: PT, trimHeight: PT, info: {
        filename?: string;
        date?: string;
        pageNumber?: number;
        totalPages?: number;
        plateColor?: string;
    }, offset?: PT): string;
}
/**
 * PrePressPageGenerator - Creates complete pre-press ready pages
 */
declare class PrePressPageGenerator {
    private boxCalculator;
    private cropMarksGenerator;
    private slugGenerator;
    private config;
    constructor(config: PrePressConfig);
    /**
     * Generate complete pre-press SVG wrapper
     */
    generatePrePressWrapper(trimWidth: PT, trimHeight: PT, content: string, pageInfo?: {
        filename?: string;
        date?: string;
        pageNumber?: number;
        totalPages?: number;
    }): string;
    /**
     * Get pre-press boxes for external use
     */
    getBoxes(trimWidth: PT, trimHeight: PT): PrePressBoxes;
}
/** Pre-press configuration presets */
declare const PREPRESS_PRESETS: {
    /** Standard commercial print */
    commercial: PrePressConfig;
    /** High-end printing with extended bleed */
    premium: PrePressConfig;
    /** Digital/office printing (no marks) */
    digital: PrePressConfig;
    /** Proof printing (marks but no bleed) */
    proof: PrePressConfig;
};
/** Default pre-press generator (commercial preset) */
declare const defaultPrePressGenerator: PrePressPageGenerator;

/**
 * Color Integrity: RGB to CMYK (Doc 2, Section 5)
 * ================================================
 *
 * Implements color space conversion with gamut mapping
 * for print-ready PDF output.
 *
 * Doc 2: "Colors that cannot be accurately reproduced in CMYK
 * are flagged and can optionally be replaced with an
 * out-of-gamut sentinel."
 */

/**
 * Convert RGB to CMYK using standard conversion
 *
 * This uses a simple algorithmic conversion. For production use,
 * ICC profile-based conversion would be more accurate.
 */
declare function rgbToCmyk(rgb: RGBColor): CMYKColor;
/**
 * Convert CMYK to RGB
 */
declare function cmykToRgb(cmyk: CMYKColor): RGBColor;
/**
 * Convert hex color to CMYK
 */
declare function hexToCmyk(hex: HexColor): CMYKColor;
/**
 * Apply GCR (Grey Component Replacement)
 *
 * Replaces equal amounts of CMY with black for better print quality.
 */
declare function applyGCR(cmyk: CMYKColor, factor?: number): CMYKColor;
/**
 * Check and limit total ink density
 */
declare function limitInkDensity(cmyk: CMYKColor, maxDensity?: number): CMYKColor;
/**
 * ColorIntegrityConverter - Full color space conversion with gamut mapping
 */
declare class ColorIntegrityConverter {
    private useGCR;
    private maxInkDensity;
    private sentinelColor;
    private useSentinel;
    constructor(options?: {
        useGCR?: boolean;
        maxInkDensity?: number;
        sentinelColor?: CMYKColor;
        useSentinel?: boolean;
    });
    /**
     * Convert RGB to print-ready CMYK
     */
    convertRgbToCmyk(rgb: RGBColor): ColorConversion;
    /**
     * Convert hex color to print-ready CMYK
     */
    convertHexToCmyk(hex: HexColor): ColorConversion;
    /**
     * Batch convert multiple colors
     */
    convertBatch(colors: HexColor[]): ColorConversion[];
    /**
     * Get CMYK CSS string
     */
    getCmykCss(cmyk: CMYKColor): string;
    /**
     * Format CMYK as PDF color
     */
    getCmykPdfString(cmyk: CMYKColor): string;
}
/**
 * ColorPaletteConverter - Convert entire theme palettes
 */
declare class ColorPaletteConverter {
    private converter;
    constructor(converter?: ColorIntegrityConverter);
    /**
     * Convert a palette of colors
     */
    convertPalette(palette: Record<string, HexColor>): Record<string, ColorConversion>;
    /**
     * Get gamut warnings for a palette
     */
    getGamutWarnings(palette: Record<string, HexColor>): Array<{
        key: string;
        color: HexColor;
        status: GamutStatus;
    }>;
    /**
     * Generate print-safe palette with alternatives for out-of-gamut colors
     */
    generatePrintSafePalette(palette: Record<string, HexColor>, alternatives?: Record<string, HexColor>): Record<string, HexColor>;
}
/** Spot color definition */
interface SpotColor$1 {
    name: string;
    fallbackCmyk: CMYKColor;
    fallbackRgb: RGBColor;
}
/** Common spot colors */
declare const SPOT_COLORS: Record<string, SpotColor$1>;
/** Default color integrity converter */
declare const colorIntegrityConverter: ColorIntegrityConverter;
/** Default palette converter */
declare const paletteConverter: ColorPaletteConverter;

/**
 * ICC Profile & Color Management Module
 * PRD-003 Section 3.2: Print-Ready Color Output
 *
 * Professional color management for print-ready PDF output.
 *
 * Key Features:
 * - ICC Profile embedding for color accuracy
 * - RGB → CMYK conversion with profile support
 * - Spot color handling (Pantone, custom)
 * - Gamut warning and soft-proofing
 * - Color separation for offset printing
 * - PDF/X compliance checking
 */

type ColorSpace = "sRGB" | "AdobeRGB" | "ProPhotoRGB" | "CMYK" | "Gray" | "Lab";
type RenderingIntent = "perceptual" | "relative-colorimetric" | "saturation" | "absolute-colorimetric";
interface ICCProfile {
    /** Profile identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Color space */
    colorSpace: ColorSpace;
    /** Profile Class (e.g., 'mntr' for monitor, 'prtr' for printer) */
    profileClass: "mntr" | "prtr" | "scnr" | "spac" | "abst" | "link" | "nmcl";
    /** Profile data (embedded) */
    data?: ArrayBuffer;
    /** Profile version */
    version?: string;
    /** Description */
    description?: string;
    /** Copyright */
    copyright?: string;
    /** White point (D50, D65, etc.) */
    whitePoint?: "D50" | "D65" | "custom";
}
interface SpotColor {
    /** Spot color name (e.g., "PANTONE 185 C") */
    name: string;
    /** Alternative CMYK representation */
    cmykFallback: CMYKColor;
    /** Lab color value (most accurate) */
    labColor?: {
        l: number;
        a: number;
        b: number;
    };
    /** Tint percentage (0-100) */
    tint?: number;
}
interface ColorManagementConfig {
    /** Source profile (RGB input) */
    sourceProfile: ICCProfile;
    /** Destination profile (CMYK output) */
    destinationProfile: ICCProfile;
    /** Rendering intent */
    renderingIntent: RenderingIntent;
    /** Enable black point compensation */
    blackPointCompensation: boolean;
    /** Preserve black when converting RGB black to CMYK */
    preserveBlack: boolean;
    /** Maximum ink density (Total Area Coverage) */
    maxInkDensity: number;
    /** Enable gamut warning */
    gamutWarning: boolean;
    /** PDF/X compliance level */
    pdfXCompliance?: "PDF/X-1a" | "PDF/X-3" | "PDF/X-4";
}
/**
 * Standard ICC profile definitions
 * In production, these would be loaded from actual ICC profile files
 */
declare const STANDARD_PROFILES: Record<string, ICCProfile>;
declare const PANTONE_COLORS: Record<string, SpotColor>;
interface ColorConversionResult {
    /** Converted color */
    color: CMYKColor;
    /** Is the color within gamut? */
    inGamut: boolean;
    /** Delta E (color difference) from original */
    deltaE?: number;
    /** Total ink coverage */
    totalInk: number;
    /** Warnings */
    warnings: string[];
}
/**
 * ColorManager - Professional color management for print output
 *
 * Usage:
 * ```ts
 * const cm = new ColorManager({
 *   destinationProfile: STANDARD_PROFILES.FOGRA39,
 *   renderingIntent: 'perceptual',
 * });
 *
 * const result = cm.convertToCMYK('#FF5500');
 * console.log(result.color); // { c: 0, m: 75, y: 100, k: 0 }
 * ```
 */
declare class ColorManager {
    private config;
    private spotColors;
    constructor(config?: Partial<ColorManagementConfig>);
    /**
     * Convert hex color to CMYK with color management
     */
    convertToCMYK(hex: HexColor): ColorConversionResult;
    /**
     * Convert RGB to CMYK with color management
     */
    rgbToCMYK(rgb: RGBColor): ColorConversionResult;
    /**
     * Basic RGB to CMYK conversion
     */
    private basicRgbToCmyk;
    /**
     * CMYK to RGB conversion
     */
    private cmykToRgb;
    /**
     * Limit total ink density
     */
    private limitInkDensity;
    /**
     * Check if an RGB color is within CMYK gamut (simplified)
     */
    isInGamut(rgb: RGBColor): boolean;
    /**
     * Calculate Delta E (CIE76, simplified)
     */
    private calculateDeltaE;
    /**
     * Simplified RGB to Lab conversion
     */
    private rgbToLab;
    /**
     * Register a custom spot color
     */
    registerSpotColor(spotColor: SpotColor): void;
    /**
     * Get a spot color by name
     */
    getSpotColor(name: string): SpotColor | undefined;
    /**
     * Convert spot color with tint
     */
    getSpotColorCMYK(name: string, tint?: number): CMYKColor | null;
    /**
     * Generate color separation plates
     */
    generateSeparations(colors: HexColor[]): {
        cyan: number[];
        magenta: number[];
        yellow: number[];
        black: number[];
    };
    /**
     * Check PDF/X compliance for a document's colors
     */
    checkPDFXCompliance(colors: HexColor[]): {
        compliant: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Get current configuration
     */
    getConfig(): ColorManagementConfig;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ColorManagementConfig>): void;
}
/**
 * Format CMYK color for display
 */
declare function formatCMYK(cmyk: CMYKColor): string;
/**
 * Parse CMYK string (e.g., "C100 M50 Y0 K0")
 */
declare function parseCMYK(str: string): CMYKColor | null;
/**
 * Get rich black CMYK value
 * Standard rich black avoids a single-color black which can look washed out
 */
declare function getRichBlack(variant?: "cool" | "warm" | "neutral"): CMYKColor;
/**
 * Check if a CMYK color is a safe rich black (not over-inked)
 */
declare function isValidRichBlack(cmyk: CMYKColor, maxInk?: number): boolean;
/**
 * Create a default color manager instance
 */
declare function createColorManager(destinationProfile?: keyof typeof STANDARD_PROFILES, config?: Partial<ColorManagementConfig>): ColorManager;

/**
 * Font Subsetting Module
 * PRD-003 Section 3.1: Font Optimization
 *
 * Extracts only the glyphs used in the document to minimize file size.
 * This is a critical optimization for production PDFs.
 *
 * Key Features:
 * - Character usage analysis across all text content
 * - Glyph extraction and subsetting
 * - Font format conversion (TTF/OTF → subset)
 * - Unicode range optimization
 * - Font metrics preservation
 * - Composite font handling (CJK)
 *
 * Note: Requires opentype.js as optional peer dependency for actual subsetting.
 * Install with: npm install opentype.js
 */
interface FontSubsettingOptions {
    /** Preserve font hinting for screen rendering */
    preserveHinting?: boolean;
    /** Include ligatures for professional typography */
    includeLigatures?: boolean;
    /** Include kerning pairs */
    includeKerning?: boolean;
    /** Minimum number of glyphs to trigger subsetting (small fonts may not benefit) */
    minGlyphThreshold?: number;
    /** Maximum subset size as percentage of original (skip if savings are minimal) */
    maxSubsetRatio?: number;
    /** Include common punctuation even if not explicitly used */
    includeCommonPunctuation?: boolean;
    /** Include numeric characters 0-9 even if not used */
    includeNumerals?: boolean;
    /** Include specified Unicode ranges (e.g., ['latin', 'latin-extended']) */
    unicodeRanges?: UnicodeRange[];
}
type UnicodeRange = "basic-latin" | "latin-extended-a" | "latin-extended-b" | "ipa-extensions" | "spacing-modifiers" | "combining-marks" | "greek" | "cyrillic" | "arabic" | "cjk-unified" | "hiragana" | "katakana";
interface FontUsageAnalysis {
    /** Font family name */
    fontFamily: string;
    /** Set of unique characters used */
    usedCharacters: Set<string>;
    /** Set of unique codepoints */
    usedCodepoints: Set<number>;
    /** Total text length using this font */
    totalTextLength: number;
    /** Number of text nodes using this font */
    textNodeCount: number;
    /** Detected Unicode ranges */
    detectedRanges: UnicodeRange[];
}
interface SubsetResult {
    /** Original font data */
    originalFont: ArrayBuffer;
    /** Subsetted font data */
    subsetFont: ArrayBuffer;
    /** Original size in bytes */
    originalSize: number;
    /** Subset size in bytes */
    subsetSize: number;
    /** Size reduction percentage */
    reductionPercent: number;
    /** Number of glyphs in original */
    originalGlyphCount: number;
    /** Number of glyphs in subset */
    subsetGlyphCount: number;
    /** Whether subsetting was performed (may skip if not beneficial) */
    wasSubsetted: boolean;
    /** Reason if subsetting was skipped */
    skipReason?: string;
}
interface FontSubsettingResult {
    /** Map of font family to subset result */
    fonts: Map<string, SubsetResult>;
    /** Total original size */
    totalOriginalSize: number;
    /** Total subset size */
    totalSubsetSize: number;
    /** Total reduction percentage */
    totalReductionPercent: number;
    /** Processing time in ms */
    processingTimeMs: number;
}
/**
 * FontSubsetter - Extracts only used glyphs from fonts
 *
 * Usage:
 * ```ts
 * const subsetter = new FontSubsetter();
 * const analysis = subsetter.analyzeDocument(textContent, fontMap);
 * const result = await subsetter.subsetFonts(analysis, fontData, options);
 * ```
 */
declare class FontSubsetter {
    private options;
    constructor(options?: FontSubsettingOptions);
    /**
     * Analyze document text content to determine which characters are used per font
     */
    analyzeTextContent(textNodes: Array<{
        text: string;
        fontFamily: string;
    }>): Map<string, FontUsageAnalysis>;
    /**
     * Detect which Unicode ranges are represented in a set of codepoints
     */
    private detectUnicodeRanges;
    /**
     * Subset a single font based on character usage
     */
    subsetFont(fontBuffer: ArrayBuffer, usedCodepoints: Set<number>, options?: FontSubsettingOptions): Promise<SubsetResult>;
    /**
     * Add ligature glyph indices to the glyph set
     */
    private addLigatureGlyphs;
    /**
     * Extract ligature glyph indices from a GSUB lookup
     */
    private extractLigatureGlyphs;
    /**
     * Subset multiple fonts based on document analysis
     */
    subsetFonts(usageMap: Map<string, FontUsageAnalysis>, fontData: Map<string, ArrayBuffer>, options?: FontSubsettingOptions): Promise<FontSubsettingResult>;
}
/**
 * Quick helper to subset a single font with text content
 */
declare function subsetFontForText(fontBuffer: ArrayBuffer, textContent: string, options?: FontSubsettingOptions): Promise<SubsetResult>;
/**
 * Analyze a string to determine which unicode ranges it uses
 */
declare function analyzeTextUnicodeRanges(text: string): UnicodeRange[];
/**
 * Format bytes to human-readable string
 */
declare function formatBytes(bytes: number): string;
/**
 * Generate a subsetting report
 */
declare function generateSubsettingReport(result: FontSubsettingResult): string;

/**
 * Running Headers (Doc 3, Section 2)
 * ==================================
 *
 * Implements contextual running headers with section tracking
 * and content bridge pattern.
 *
 * Doc 3: "Running headers pull their text from the nearest
 * heading visible on a page, using a content-bridge attribute."
 */

/**
 * SectionMarkerScanner - Extracts section markers from content
 */
declare class SectionMarkerScanner {
    private markers;
    private markerIdCounter;
    /**
     * Scan HTML content for section markers
     *
     * Looks for elements with data-section attribute or heading elements.
     */
    scanContent(html: string): SectionMarker[];
    /**
     * Create a section marker from a heading element info
     */
    createMarker(title: string, level: number, pageNumber: number): SectionMarker;
    /**
     * Get all markers
     */
    getMarkers(): SectionMarker[];
    /**
     * Clear markers
     */
    clear(): void;
}
interface PageSectionInfo {
    pageNumber: number;
    sectionsOnPage: SectionMarker[];
    firstSection?: SectionMarker;
    lastSection?: SectionMarker;
    startsOnPage?: SectionMarker;
}
/**
 * PageSectionTracker - Tracks which sections appear on which pages
 */
declare class PageSectionTracker {
    private pageInfo;
    /**
     * Register a section appearing on a page
     */
    registerSection(marker: SectionMarker, pageNumber: number, startsOnPage?: boolean): void;
    /**
     * Get sections for a page
     */
    getSectionsForPage(pageNumber: number): PageSectionInfo | undefined;
    /**
     * Get the most relevant section for running header
     */
    getHeaderSection(pageNumber: number, rule: RunningHeaderConfig["priorityRule"]): SectionMarker | undefined;
    /**
     * Find the current section for any page (looks back if needed)
     */
    findCurrentSection(pageNumber: number): SectionMarker | undefined;
    /**
     * Clear all tracking data
     */
    clear(): void;
}
/** Running header styles */
interface RunningHeaderStyle {
    fontSize: PT;
    fontFamily: string;
    fontWeight: "normal" | "bold";
    color: HexColor;
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
    letterSpacing: PT;
    align: "left" | "center" | "right";
    paddingBottom: PT;
    borderBottom?: {
        width: PT;
        color: HexColor;
    };
}
/**
 * RunningHeaderGenerator - Creates running header content
 */
declare class RunningHeaderGenerator {
    private config;
    private style;
    private tracker;
    constructor(config: RunningHeaderConfig, style?: Partial<RunningHeaderStyle>, tracker?: PageSectionTracker);
    /**
     * Get the page section tracker
     */
    getTracker(): PageSectionTracker;
    /**
     * Generate running header for a page
     */
    generateHeader(pageNumber: number, totalPages: number, documentTitle?: string): string | null;
    /**
     * Format template string with variables
     */
    private formatTemplate;
    /**
     * Render header HTML
     */
    private renderHeader;
    /**
     * Generate CSS for running headers
     */
    generateCSS(): string;
}
/**
 * ContentBridgeDetector - Finds content-bridge elements during rendering
 *
 * Doc 3: "Using a content-bridge attribute on headings"
 */
declare class ContentBridgeDetector {
    /**
     * Add content-bridge attributes to headings
     */
    addContentBridgeAttributes(html: string): string;
    /**
     * Extract heading text from element for content bridge
     */
    extractHeadingText(element: string): string | null;
}
/**
 * RunningHeaderProcessor - Full pipeline for running headers
 */
declare class RunningHeaderProcessor {
    private scanner;
    private tracker;
    private generator;
    private bridgeDetector;
    constructor(config: RunningHeaderConfig, style?: Partial<RunningHeaderStyle>);
    /**
     * Process content and setup section tracking
     */
    processContent(html: string): string;
    /**
     * Register a section found during pagination
     */
    registerSection(title: string, level: number, pageNumber: number, startsOnPage?: boolean): void;
    /**
     * Generate header for a page
     */
    generateHeader(pageNumber: number, totalPages: number, documentTitle?: string): string | null;
    /**
     * Get CSS for running headers
     */
    getCSS(): string;
    /**
     * Reset processor for new document
     */
    reset(): void;
}
/** Running header configuration presets */
declare const RUNNING_HEADER_PRESETS: {
    /** Standard section header */
    standard: {
        template: string;
        priorityRule: "first-on-page";
        showOnFirstPage: false;
        showOnCover: false;
    };
    /** Chapter-style with document title */
    chapter: {
        template: string;
        priorityRule: "starts-on-page";
        showOnFirstPage: false;
        showOnCover: false;
        excludeLevels: number[];
    };
    /** Page-only (for TOC or appendix) */
    pageOnly: {
        template: string;
        priorityRule: "first-on-page";
        showOnFirstPage: true;
        showOnCover: false;
    };
    /** Full info header */
    detailed: {
        template: string;
        priorityRule: "first-on-page";
        showOnFirstPage: false;
        showOnCover: false;
    };
};
/** Default scanner */
declare const sectionScanner: SectionMarkerScanner;
/** Default tracker */
declare const pageSectionTracker: PageSectionTracker;

/**
 * Page N of M Resolver (Doc 3, Section 3)
 * ========================================
 *
 * Implements three-pass page number resolution for accurate
 * "Page X of Y" formatting.
 *
 * Doc 3: "Because PDF rendering is usually a single pass, we use
 * a three-pass strategy: measure → paginate → resolve placeholders."
 */

/**
 * Format a number in the specified style
 */
declare function formatPageNumber(num: number, style: NumberingStyle): string;
/** Placeholder markers for three-pass resolve */
declare const PLACEHOLDERS: {
    readonly CURRENT: "{{PAGE}}";
    readonly TOTAL: "{{TOTAL}}";
    readonly SECTION: "{{SECTION}}";
};
/**
 * PageNumberResolver - Three-pass page number resolution
 */
declare class PageNumberResolver {
    private config;
    private totalPages;
    private sectionPages;
    constructor(config?: Partial<PageNumberingConfig>);
    /**
     * Pass 1: Set total page count after pagination
     */
    setTotalPages(total: number): void;
    /**
     * Register a section's page range
     */
    registerSection(sectionId: string, startPage: number, endPage: number): void;
    /**
     * Calculate effective page number (accounting for start offset and skips)
     */
    private getEffectivePageNumber;
    /**
     * Pass 2: Generate placeholder HTML for a page
     */
    generatePlaceholder(pageNumber: number): string;
    /**
     * Pass 3: Resolve all placeholders with actual values
     */
    resolvePlaceholders(html: string): string;
    /**
     * Resolve a format string with actual values
     */
    resolveFormat(format: string, pageNumber: number): string;
    /**
     * Get page number within current section
     */
    private getSectionPageNumber;
    /**
     * Get resolved page number info
     */
    getPageInfo(pageNumber: number): ResolvedPageNumber;
    /**
     * Generate CSS for tabular numbers
     */
    generateCSS(): string;
    /**
     * Reset resolver for new document
     */
    reset(): void;
}
/** Section numbering configuration */
interface SectionNumberingConfig {
    sectionId: string;
    style: NumberingStyle;
    startNumber: number;
    prefix?: string;
    suffix?: string;
}
/**
 * MultiSectionNumberResolver - Handle different numbering in different sections
 *
 * Common use: Roman numerals for front matter, Arabic for body, etc.
 */
declare class MultiSectionNumberResolver {
    private sections;
    private pageToSection;
    private defaultResolver;
    constructor(defaultConfig?: Partial<PageNumberingConfig>);
    /**
     * Register a section with its numbering configuration
     */
    registerSection(config: SectionNumberingConfig, startPage: number, endPage: number): void;
    /**
     * Set total pages
     */
    setTotalPages(total: number): void;
    /**
     * Get page number info
     */
    getPageInfo(pageNumber: number): ResolvedPageNumber;
    /**
     * Generate placeholder
     */
    generatePlaceholder(pageNumber: number): string;
    /**
     * Reset for new document
     */
    reset(): void;
}
/** Page number position */
type PageNumberPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
/** Page number style */
interface PageNumberStyle {
    fontSize: PT;
    fontFamily: string;
    color: string;
    marginTop?: PT;
    marginBottom?: PT;
    marginLeft?: PT;
    marginRight?: PT;
}
/**
 * PageNumberRenderer - Renders page numbers with styling
 */
declare class PageNumberRenderer {
    private resolver;
    private style;
    private position;
    constructor(config?: Partial<PageNumberingConfig>, style?: Partial<PageNumberStyle>, position?: PageNumberPosition);
    /**
     * Get resolver
     */
    getResolver(): PageNumberResolver;
    /**
     * Render page number element
     */
    render(pageNumber: number): string;
    /**
     * Get CSS for position
     */
    private getPositionCSS;
    /**
     * Generate full CSS
     */
    generateCSS(): string;
}
declare const PAGE_NUMBERING_PRESETS: {
    /** Simple page number */
    simple: {
        format: string;
        style: "arabic";
        startNumber: number;
        tabularNums: true;
    };
    /** Page X of Y */
    pageOfTotal: {
        format: string;
        style: "arabic";
        startNumber: number;
        tabularNums: true;
    };
    /** Roman numerals (for front matter) */
    romanFrontMatter: {
        format: string;
        style: "roman-lower";
        startNumber: number;
        tabularNums: false;
    };
    /** Dash-wrapped (- 5 -) */
    dashWrapped: {
        format: string;
        style: "arabic";
        startNumber: number;
        tabularNums: true;
    };
};
/** Default page number resolver */
declare const pageNumberResolver: PageNumberResolver;

/**
 * Special Page Layouts (Doc 3, Section 4)
 * =======================================
 *
 * Implements cover pages, chapter openers, multi-column layouts,
 * and other special page configurations.
 *
 * Doc 3: "Cover pages often have no headers/footers and need
 * full-bleed backgrounds. Chapter openers often drop the page
 * number and have special top margins."
 */

/** Full layout configuration */
interface PageLayoutConfig {
    type: LayoutType;
    margins: {
        top: PT;
        right: PT;
        bottom: PT;
        left: PT;
    };
    columns: number;
    columnGap: PT;
    fullBleed: boolean;
    showHeader: boolean;
    showFooter: boolean;
    showPageNumber: boolean;
    orientation: "portrait" | "landscape";
    customCSS?: string;
}
/**
 * LayoutManager - Manages page layout configurations
 */
declare class LayoutManager {
    private pageLayouts;
    private defaultLayout;
    constructor(defaultType?: LayoutType);
    /**
     * Create a full layout config from type and overrides
     */
    createLayout(type: LayoutType, overrides?: Partial<PageLayoutConfig>): PageLayoutConfig;
    /**
     * Apply layout override to a page
     */
    setPageLayout(pageNumber: number, override: LayoutOverride): void;
    /**
     * Get layout for a specific page
     */
    getLayout(pageNumber: number): PageLayoutConfig;
    /**
     * Get CSS for a layout
     */
    getLayoutCSS(layout: PageLayoutConfig): string;
    /**
     * Generate CSS for all layouts
     */
    generateCSS(): string;
    /**
     * Clear all page layouts
     */
    clear(): void;
}
/**
 * CoverPageGenerator - Creates cover page content
 */
declare class CoverPageGenerator {
    /**
     * Generate cover page HTML
     */
    generate(config: CoverPageConfig, pageWidth: PT, pageHeight: PT): string;
    /**
     * Generate CSS for cover pages
     */
    generateCSS(): string;
}
/** Chapter opener style */
interface ChapterOpenerStyle {
    numberFontSize: PT;
    titleFontSize: PT;
    numberColor: HexColor;
    titleColor: HexColor;
    topMargin: PT;
    numberPrefix: string;
    showDivider: boolean;
    dividerColor: HexColor;
}
/**
 * ChapterOpenerGenerator - Creates chapter opener pages
 */
declare class ChapterOpenerGenerator {
    private style;
    constructor(style?: Partial<ChapterOpenerStyle>);
    /**
     * Generate chapter opener HTML
     */
    generate(chapterNumber: number, title: string, subtitle?: string): string;
    /**
     * Generate CSS for chapter openers
     */
    generateCSS(): string;
}
/** Column balance mode */
type ColumnBalance = "auto" | "balance" | "none";
/**
 * MultiColumnLayout - Handles multi-column page layouts
 */
declare class MultiColumnLayout {
    private columns;
    private gap;
    private balance;
    constructor(columns?: number, gap?: PT, balance?: ColumnBalance);
    /**
     * Wrap content in multi-column container
     */
    wrapContent(content: string): string;
    /**
     * Create column break
     */
    createColumnBreak(): string;
    /**
     * Create span-all element (breaks out of columns)
     */
    createSpanAll(content: string): string;
    /**
     * Generate CSS
     */
    generateCSS(): string;
}
/**
 * PageLayoutProcessor - Full pipeline for page layouts
 */
declare class PageLayoutProcessor {
    private layoutManager;
    private coverGenerator;
    private chapterGenerator;
    constructor();
    /**
     * Set layout for a page
     */
    setPageLayout(pageNumber: number, override: LayoutOverride): void;
    /**
     * Get layout for a page
     */
    getLayout(pageNumber: number): PageLayoutConfig;
    /**
     * Generate cover page
     */
    generateCover(config: CoverPageConfig, pageWidth: PT, pageHeight: PT): string;
    /**
     * Generate chapter opener
     */
    generateChapterOpener(chapterNumber: number, title: string, subtitle?: string): string;
    /**
     * Generate all CSS
     */
    generateCSS(): string;
    /**
     * Reset processor
     */
    reset(): void;
}
declare const LAYOUT_PRESETS: {
    /** Report-style cover */
    reportCover: LayoutOverride;
    /** Chapter opener */
    chapterOpener: LayoutOverride;
    /** Two-column text */
    twoColumn: LayoutOverride;
    /** Three-column narrow */
    threeColumn: LayoutOverride;
    /** Landscape data page */
    landscapeData: LayoutOverride;
};
/** Default layout manager */
declare const layoutManager: LayoutManager;
/** Default cover generator */
declare const coverPageGenerator: CoverPageGenerator;
/** Default chapter generator */
declare const chapterOpenerGenerator: ChapterOpenerGenerator;

/**
 * Table Continuation Polish (Doc 3, Section 5)
 * =============================================
 *
 * Implements table splitting with continuation badges and
 * zebra stripe continuity across page breaks.
 *
 * Doc 3: "When a table splits, we render the header again with
 * a continuation badge and maintain zebra-stripe parity."
 */

/**
 * TableContinuationTracker - Tracks table state across page breaks
 */
declare class TableContinuationTracker {
    private tableStates;
    private tableIdCounter;
    /**
     * Register a new table
     */
    registerTable(tableId?: string, caption?: string): string;
    /**
     * Record a page break in a table
     */
    recordPageBreak(tableId: string, lastRowIndex: number, lastRowWasEven: boolean): void;
    /**
     * Get table state
     */
    getState(tableId: string): TableContinuationState | undefined;
    /**
     * Check if table is continued (not first segment)
     */
    isContinued(tableId: string): boolean;
    /**
     * Get next row parity for zebra striping
     */
    getNextRowParity(tableId: string, rowIndex: number): boolean;
    /**
     * Update total segments after pagination complete
     */
    finalize(tableId: string, totalSegments: number): void;
    /**
     * Clear all tracking
     */
    clear(): void;
}
/**
 * ContinuationBadgeGenerator - Creates continuation badges for split tables
 */
declare class ContinuationBadgeGenerator {
    private config;
    constructor(config?: Partial<ContinuationBadgeConfig>);
    /**
     * Generate continuation badge HTML
     */
    generate(state: TableContinuationState): string;
    /**
     * Format template with state values
     */
    private formatTemplate;
    /**
     * Get CSS for badges
     */
    generateCSS(): string;
}
/**
 * ZebraStripeManager - Manages zebra stripe continuity
 */
declare class ZebraStripeManager {
    private config;
    constructor(config?: Partial<ZebraStripeConfig>);
    /**
     * Get row background color based on index and continuation state
     */
    getRowColor(rowIndex: number, continuationOffset?: number): HexColor;
    /**
     * Generate CSS class for row
     */
    getRowClass(rowIndex: number, continuationOffset?: number): string;
    /**
     * Apply zebra striping to existing table HTML
     */
    applyToTable(tableHtml: string, startOffset?: number): string;
    /**
     * Generate CSS for zebra striping
     */
    generateCSS(): string;
}
/**
 * TableHeaderRepeater - Extracts and repeats table headers
 */
declare class TableHeaderRepeater {
    /**
     * Extract header from table HTML
     */
    extractHeader(tableHtml: string): string | null;
    /**
     * Create repeated header with continuation styling
     */
    createRepeatedHeader(headerHtml: string, isContinuation: boolean): string;
    /**
     * Generate CSS for repeated headers
     */
    generateCSS(): string;
}
/**
 * TableContinuationProcessor - Full pipeline for table continuation
 */
declare class TableContinuationProcessor {
    private tracker;
    private badgeGenerator;
    private zebraManager;
    private headerRepeater;
    constructor(badgeConfig?: Partial<ContinuationBadgeConfig>, zebraConfig?: Partial<ZebraStripeConfig>);
    /**
     * Process a table for potential continuation
     */
    processTable(tableHtml: string, tableId?: string, caption?: string): {
        tableId: string;
        html: string;
        header: string | null;
    };
    /**
     * Create continuation segment
     */
    createContinuationSegment(tableId: string, header: string, bodyRows: string, lastRowIndex: number, lastRowWasEven: boolean): string;
    /**
     * Get current table state
     */
    getTableState(tableId: string): TableContinuationState | undefined;
    /**
     * Generate all CSS
     */
    generateCSS(): string;
    /**
     * Reset processor
     */
    reset(): void;
}
/**
 * TableSplitDetector - Detects where tables should split
 */
declare class TableSplitDetector {
    private rowHeight;
    private minRowsOnPage;
    constructor(rowHeight?: PT, minRowsOnPage?: number);
    /**
     * Calculate split points for a table
     */
    calculateSplitPoints(totalRows: number, headerHeight: PT, availableHeight: PT, rowHeights?: PT[]): number[];
    /**
     * Check if table needs splitting
     */
    needsSplit(tableHeight: PT, availableHeight: PT): boolean;
}
declare const TABLE_CONTINUATION_PRESETS: {
    /** Standard continuation */
    standard: {
        badge: ContinuationBadgeConfig;
        zebra: ZebraStripeConfig;
    };
    /** Formal report style */
    formal: {
        badge: ContinuationBadgeConfig;
        zebra: ZebraStripeConfig;
    };
    /** High contrast zebra */
    highContrast: {
        badge: ContinuationBadgeConfig;
        zebra: ZebraStripeConfig;
    };
};
/** Default table continuation tracker */
declare const tableContinuationTracker: TableContinuationTracker;
/** Default table continuation processor */
declare const tableContinuationProcessor: TableContinuationProcessor;

/**
 * Watermark System (Doc 3, Section 6)
 * ====================================
 *
 * Implements document protective furniture including watermarks,
 * confidentiality stamps, and draft indicators.
 *
 * Doc 3: "Watermarks provide document protection and status
 * indication without interfering with content readability."
 */

/**
 * WatermarkGenerator - Creates watermark SVG elements
 */
declare class WatermarkGenerator {
    /**
     * Generate a text watermark
     */
    generateTextWatermark(config: WatermarkConfig, pageWidth: PT, pageHeight: PT): string;
    /**
     * Generate an image watermark
     */
    generateImageWatermark(config: WatermarkConfig, pageWidth: PT, pageHeight: PT): string;
    /**
     * Generate watermark based on type
     */
    generate(config: WatermarkConfig, pageWidth: PT, pageHeight: PT): string;
    /**
     * Get position coordinates for watermark placement
     */
    private getPosition;
    /**
     * Get transform string for rotation
     */
    private getTransform;
}
/**
 * WatermarkApplicator - Applies watermarks to pages
 */
declare class WatermarkApplicator {
    private generator;
    private watermarks;
    constructor(generator?: WatermarkGenerator);
    /**
     * Add a watermark configuration
     */
    addWatermark(config: Partial<WatermarkConfig>): void;
    /**
     * Check if watermark should appear on a page
     */
    shouldApplyToPage(config: WatermarkConfig, pageNumber: number): boolean;
    /**
     * Generate watermarks for a page
     */
    generateForPage(pageNumber: number, pageWidth: PT, pageHeight: PT): string[];
    /**
     * Clear all watermarks
     */
    clear(): void;
}
/** Common watermark presets */
declare const WATERMARK_PRESETS: {
    /** Draft document */
    draft: {
        type: "text";
        text: string;
        position: "diagonal";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: "all";
        layer: number;
    };
    /** Confidential document */
    confidential: {
        type: "text";
        text: string;
        position: "diagonal";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: "all";
        layer: number;
    };
    /** Sample/Preview document */
    sample: {
        type: "text";
        text: string;
        position: "diagonal";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: "all";
        layer: number;
    };
    /** Not for distribution */
    doNotDistribute: {
        type: "text";
        text: string;
        position: "diagonal";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: "all";
        layer: number;
    };
    /** Approved stamp */
    approved: {
        type: "text";
        text: string;
        position: "top-right";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: number[];
        layer: number;
    };
    /** Void/Cancelled */
    void: {
        type: "text";
        text: string;
        position: "center";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: "all";
        layer: number;
    };
    /** Copy watermark */
    copy: {
        type: "text";
        text: string;
        position: "bottom-right";
        rotation: number;
        opacity: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        blendMode: "multiply";
        pages: "all";
        layer: number;
    };
};
/**
 * TiledWatermarkGenerator - Creates repeating tile patterns
 */
declare class TiledWatermarkGenerator {
    /**
     * Generate a tiled watermark pattern
     */
    generateTiledWatermark(text: string, pageWidth: PT, pageHeight: PT, options?: {
        fontSize?: PT;
        color?: HexColor;
        opacity?: number;
        spacing?: PT;
        rotation?: number;
    }): string;
}
/**
 * TimestampWatermark - Adds print date/time watermark
 */
declare class TimestampWatermark {
    /**
     * Generate timestamp watermark
     */
    generate(pageWidth: PT, pageHeight: PT, options?: {
        position?: WatermarkPosition;
        format?: "date" | "datetime" | "iso";
        prefix?: string;
        fontSize?: PT;
        color?: HexColor;
        opacity?: number;
    }): string;
    /**
     * Format timestamp string
     */
    private formatTimestamp;
    /**
     * Get position and text anchor
     */
    private getPositionAndAnchor;
}
/**
 * WatermarkProcessor - Full pipeline for document watermarks
 */
declare class WatermarkProcessor {
    private applicator;
    private tiledGenerator;
    private timestampGenerator;
    constructor();
    /**
     * Add a preset watermark
     */
    addPreset(presetName: keyof typeof WATERMARK_PRESETS): void;
    /**
     * Add a custom watermark
     */
    addCustom(config: Partial<WatermarkConfig>): void;
    /**
     * Add timestamp watermark
     */
    addTimestamp(options?: Parameters<TimestampWatermark["generate"]>[2]): void;
    private _timestampOptions?;
    private _tiledConfig?;
    /**
     * Add tiled watermark
     */
    addTiled(text: string, options?: Parameters<TiledWatermarkGenerator["generateTiledWatermark"]>[3]): void;
    /**
     * Generate all watermarks for a page
     */
    generateForPage(pageNumber: number, pageWidth: PT, pageHeight: PT): string;
    private _addTimestamp;
    /**
     * Generate CSS for watermarks
     */
    generateCSS(): string;
    /**
     * Reset all watermarks
     */
    reset(): void;
}
/** Default watermark generator */
declare const watermarkGenerator: WatermarkGenerator;
/** Default watermark applicator */
declare const watermarkApplicator: WatermarkApplicator;
/** Default watermark processor */
declare const watermarkProcessor: WatermarkProcessor;

/**
 * Visual Polish System - Main Export
 * ===================================
 *
 * Complete implementation of the Visual Polish layer for the PDF Engine.
 *
 * Implements:
 * - Doc 1: Design Token System & Theming Architecture
 * - Doc 2: Advanced Visual Effects & Print Fidelity
 * - Doc 3: Document Furniture & Structural Polish
 */

/**
 * VisualPolishProcessor - Unified processor for all visual polish features
 */
declare class VisualPolishProcessor {
    readonly tokenManager: DesignTokenManager;
    readonly baselineGrid: BaselineGridCalculator;
    readonly verticalRhythm: VerticalRhythmManager;
    readonly cssBridge: CSSVariableBridge;
    readonly cacheInvalidator: HeightCacheInvalidator;
    readonly themeDetector: ThemeChangeDetector;
    private currentTheme;
    readonly shadowGenerator: ShadowFilterGenerator;
    readonly shadowApplicator: ShadowApplicator;
    readonly gradientGenerator: GradientGenerator;
    readonly prePressGenerator: PrePressPageGenerator;
    readonly colorConverter: ColorIntegrityConverter;
    readonly paletteConverter: ColorPaletteConverter;
    readonly headerProcessor: RunningHeaderProcessor;
    readonly pageNumberResolver: PageNumberResolver;
    readonly pageNumberRenderer: PageNumberRenderer;
    readonly layoutProcessor: PageLayoutProcessor;
    readonly tableProcessor: TableContinuationProcessor;
    readonly watermarkProcessor: WatermarkProcessor;
    constructor(theme?: Theme);
    /**
     * Set theme
     */
    setTheme(theme: Theme): void;
    /**
     * Generate all CSS for current configuration
     */
    generateCSS(): string;
    /**
     * Get shadow filter definitions for SVG
     */
    getShadowFilters(): string;
    /**
     * Process page content with all visual polish features
     */
    processPage(content: string, pageNumber: number, totalPages: number, pageWidth: number, pageHeight: number, documentTitle?: string): string;
    /**
     * Reset all processors for new document
     */
    reset(): void;
}
declare function getVisualPolishProcessor(): VisualPolishProcessor;
/** Default visual polish processor instance */
declare const visualPolishProcessor: VisualPolishProcessor;

type index_d$1_Assertion = Assertion;
declare const index_d$1_BLEED_SIZES: typeof BLEED_SIZES;
type index_d$1_BaselineGridCalculator = BaselineGridCalculator;
declare const index_d$1_BaselineGridCalculator: typeof BaselineGridCalculator;
type index_d$1_BaselineGridConfig = BaselineGridConfig;
type index_d$1_CMYKColor = CMYKColor;
declare const index_d$1_COMPACT_THEME: typeof COMPACT_THEME;
type index_d$1_CSSVariableBridge = CSSVariableBridge;
declare const index_d$1_CSSVariableBridge: typeof CSSVariableBridge;
type index_d$1_CacheInvalidation = CacheInvalidation;
type index_d$1_ChapterOpenerGenerator = ChapterOpenerGenerator;
declare const index_d$1_ChapterOpenerGenerator: typeof ChapterOpenerGenerator;
type index_d$1_ColorConversion = ColorConversion;
type index_d$1_ColorConversionResult = ColorConversionResult;
type index_d$1_ColorIntegrityConverter = ColorIntegrityConverter;
declare const index_d$1_ColorIntegrityConverter: typeof ColorIntegrityConverter;
type index_d$1_ColorManagementConfig = ColorManagementConfig;
type index_d$1_ColorManager = ColorManager;
declare const index_d$1_ColorManager: typeof ColorManager;
type index_d$1_ColorPaletteConverter = ColorPaletteConverter;
declare const index_d$1_ColorPaletteConverter: typeof ColorPaletteConverter;
type index_d$1_ColorSpace = ColorSpace;
type index_d$1_ColorTokens = ColorTokens;
type index_d$1_ColorValue = ColorValue;
type index_d$1_ContentBridgeDetector = ContentBridgeDetector;
declare const index_d$1_ContentBridgeDetector: typeof ContentBridgeDetector;
type index_d$1_ContinuationBadgeConfig = ContinuationBadgeConfig;
type index_d$1_ContinuationBadgeGenerator = ContinuationBadgeGenerator;
declare const index_d$1_ContinuationBadgeGenerator: typeof ContinuationBadgeGenerator;
type index_d$1_CoverPageConfig = CoverPageConfig;
type index_d$1_CoverPageGenerator = CoverPageGenerator;
declare const index_d$1_CoverPageGenerator: typeof CoverPageGenerator;
type index_d$1_CropMark = CropMark;
type index_d$1_CropMarkConfig = CropMarkConfig;
type index_d$1_CropMarksGenerator = CropMarksGenerator;
declare const index_d$1_CropMarksGenerator: typeof CropMarksGenerator;
declare const index_d$1_DARK_THEME: typeof DARK_THEME;
declare const index_d$1_DEFAULT_GRID_CONFIG: typeof DEFAULT_GRID_CONFIG;
declare const index_d$1_DEFAULT_THEME: typeof DEFAULT_THEME;
type index_d$1_DesignTokenManager = DesignTokenManager;
declare const index_d$1_DesignTokenManager: typeof DesignTokenManager;
type index_d$1_DitherFilter = DitherFilter;
type index_d$1_FontSubsetter = FontSubsetter;
declare const index_d$1_FontSubsetter: typeof FontSubsetter;
type index_d$1_FontSubsettingOptions = FontSubsettingOptions;
type index_d$1_FontSubsettingResult = FontSubsettingResult;
type index_d$1_FontUsageAnalysis = FontUsageAnalysis;
declare const index_d$1_GRADIENT_PRESETS: typeof GRADIENT_PRESETS;
type index_d$1_GamutStatus = GamutStatus;
type index_d$1_GeometryTokens = GeometryTokens;
type index_d$1_GradientConfig = GradientConfig;
type index_d$1_GradientGenerator = GradientGenerator;
declare const index_d$1_GradientGenerator: typeof GradientGenerator;
type index_d$1_GradientRectGenerator = GradientRectGenerator;
declare const index_d$1_GradientRectGenerator: typeof GradientRectGenerator;
type index_d$1_GradientStop = GradientStop;
type index_d$1_GridAlignment = GridAlignment;
type index_d$1_HeightCacheInvalidator = HeightCacheInvalidator;
declare const index_d$1_HeightCacheInvalidator: typeof HeightCacheInvalidator;
type index_d$1_HexColor = HexColor;
type index_d$1_ICCProfile = ICCProfile;
type index_d$1_INCH = INCH;
declare const index_d$1_LAYOUT_PRESETS: typeof LAYOUT_PRESETS;
type index_d$1_LBU = LBU;
type index_d$1_LayoutImpact = LayoutImpact;
type index_d$1_LayoutManager = LayoutManager;
declare const index_d$1_LayoutManager: typeof LayoutManager;
type index_d$1_LayoutOverride = LayoutOverride;
type index_d$1_LayoutType = LayoutType;
type index_d$1_MM = MM;
type index_d$1_MultiColumnLayout = MultiColumnLayout;
declare const index_d$1_MultiColumnLayout: typeof MultiColumnLayout;
type index_d$1_MultiSectionNumberResolver = MultiSectionNumberResolver;
declare const index_d$1_MultiSectionNumberResolver: typeof MultiSectionNumberResolver;
type index_d$1_NumberingStyle = NumberingStyle;
declare const index_d$1_PAGE_NUMBERING_PRESETS: typeof PAGE_NUMBERING_PRESETS;
declare const index_d$1_PANTONE_COLORS: typeof PANTONE_COLORS;
declare const index_d$1_PLACEHOLDERS: typeof PLACEHOLDERS;
declare const index_d$1_PREPRESS_PRESETS: typeof PREPRESS_PRESETS;
type index_d$1_PT = PT;
type index_d$1_PageBox = PageBox;
type index_d$1_PageLayoutProcessor = PageLayoutProcessor;
declare const index_d$1_PageLayoutProcessor: typeof PageLayoutProcessor;
type index_d$1_PageNumberRenderer = PageNumberRenderer;
declare const index_d$1_PageNumberRenderer: typeof PageNumberRenderer;
type index_d$1_PageNumberResolver = PageNumberResolver;
declare const index_d$1_PageNumberResolver: typeof PageNumberResolver;
type index_d$1_PageNumberingConfig = PageNumberingConfig;
type index_d$1_PageSectionTracker = PageSectionTracker;
declare const index_d$1_PageSectionTracker: typeof PageSectionTracker;
type index_d$1_Percent = Percent;
type index_d$1_PrePressBoxCalculator = PrePressBoxCalculator;
declare const index_d$1_PrePressBoxCalculator: typeof PrePressBoxCalculator;
type index_d$1_PrePressBoxes = PrePressBoxes;
type index_d$1_PrePressConfig = PrePressConfig;
type index_d$1_PrePressPageGenerator = PrePressPageGenerator;
declare const index_d$1_PrePressPageGenerator: typeof PrePressPageGenerator;
type index_d$1_RGBColor = RGBColor;
declare const index_d$1_RUNNING_HEADER_PRESETS: typeof RUNNING_HEADER_PRESETS;
type index_d$1_RenderedWatermark = RenderedWatermark;
type index_d$1_RenderingIntent = RenderingIntent;
type index_d$1_ResolvedPageNumber = ResolvedPageNumber;
type index_d$1_RunningHeaderConfig = RunningHeaderConfig;
type index_d$1_RunningHeaderGenerator = RunningHeaderGenerator;
declare const index_d$1_RunningHeaderGenerator: typeof RunningHeaderGenerator;
type index_d$1_RunningHeaderProcessor = RunningHeaderProcessor;
declare const index_d$1_RunningHeaderProcessor: typeof RunningHeaderProcessor;
declare const index_d$1_SHADOW_PRESETS: typeof SHADOW_PRESETS;
declare const index_d$1_SPACIOUS_THEME: typeof SPACIOUS_THEME;
declare const index_d$1_SPOT_COLORS: typeof SPOT_COLORS;
declare const index_d$1_STANDARD_PROFILES: typeof STANDARD_PROFILES;
type index_d$1_SectionMarker = SectionMarker;
type index_d$1_SectionMarkerScanner = SectionMarkerScanner;
declare const index_d$1_SectionMarkerScanner: typeof SectionMarkerScanner;
type index_d$1_ShadowApplicator = ShadowApplicator;
declare const index_d$1_ShadowApplicator: typeof ShadowApplicator;
type index_d$1_ShadowConfig = ShadowConfig;
type index_d$1_ShadowFilter = ShadowFilter;
type index_d$1_ShadowFilterGenerator = ShadowFilterGenerator;
declare const index_d$1_ShadowFilterGenerator: typeof ShadowFilterGenerator;
type index_d$1_SlugContentGenerator = SlugContentGenerator;
declare const index_d$1_SlugContentGenerator: typeof SlugContentGenerator;
type index_d$1_SpacingTokens = SpacingTokens;
type index_d$1_SpotColor = SpotColor;
type index_d$1_SubsetResult = SubsetResult;
declare const index_d$1_TABLE_CONTINUATION_PRESETS: typeof TABLE_CONTINUATION_PRESETS;
type index_d$1_TableContinuationProcessor = TableContinuationProcessor;
declare const index_d$1_TableContinuationProcessor: typeof TableContinuationProcessor;
type index_d$1_TableContinuationState = TableContinuationState;
type index_d$1_TableContinuationTracker = TableContinuationTracker;
declare const index_d$1_TableContinuationTracker: typeof TableContinuationTracker;
type index_d$1_TableHeaderRepeater = TableHeaderRepeater;
declare const index_d$1_TableHeaderRepeater: typeof TableHeaderRepeater;
type index_d$1_TableSplitDetector = TableSplitDetector;
declare const index_d$1_TableSplitDetector: typeof TableSplitDetector;
type index_d$1_TestResult = TestResult;
type index_d$1_Theme = Theme;
type index_d$1_ThemeChangeDetector = ThemeChangeDetector;
declare const index_d$1_ThemeChangeDetector: typeof ThemeChangeDetector;
type index_d$1_ThemeTokens = ThemeTokens;
type index_d$1_TiledWatermarkGenerator = TiledWatermarkGenerator;
declare const index_d$1_TiledWatermarkGenerator: typeof TiledWatermarkGenerator;
type index_d$1_TimestampWatermark = TimestampWatermark;
declare const index_d$1_TimestampWatermark: typeof TimestampWatermark;
type index_d$1_TokenCategory = TokenCategory;
type index_d$1_TripleBoxModel = TripleBoxModel;
type index_d$1_TypographyTokens = TypographyTokens;
type index_d$1_UnicodeRange = UnicodeRange;
type index_d$1_VerificationReport = VerificationReport;
type index_d$1_VerticalRhythmManager = VerticalRhythmManager;
declare const index_d$1_VerticalRhythmManager: typeof VerticalRhythmManager;
type index_d$1_VisualPolishProcessor = VisualPolishProcessor;
declare const index_d$1_VisualPolishProcessor: typeof VisualPolishProcessor;
declare const index_d$1_WATERMARK_PRESETS: typeof WATERMARK_PRESETS;
type index_d$1_WatermarkApplicator = WatermarkApplicator;
declare const index_d$1_WatermarkApplicator: typeof WatermarkApplicator;
type index_d$1_WatermarkConfig = WatermarkConfig;
type index_d$1_WatermarkGenerator = WatermarkGenerator;
declare const index_d$1_WatermarkGenerator: typeof WatermarkGenerator;
type index_d$1_WatermarkPosition = WatermarkPosition;
type index_d$1_WatermarkProcessor = WatermarkProcessor;
declare const index_d$1_WatermarkProcessor: typeof WatermarkProcessor;
type index_d$1_WatermarkType = WatermarkType;
type index_d$1_ZebraStripeConfig = ZebraStripeConfig;
type index_d$1_ZebraStripeManager = ZebraStripeManager;
declare const index_d$1_ZebraStripeManager: typeof ZebraStripeManager;
declare const index_d$1_analyzeTextUnicodeRanges: typeof analyzeTextUnicodeRanges;
declare const index_d$1_applyGCR: typeof applyGCR;
declare const index_d$1_calculateContrastRatio: typeof calculateContrastRatio;
declare const index_d$1_chapterOpenerGenerator: typeof chapterOpenerGenerator;
declare const index_d$1_cmykToRgb: typeof cmykToRgb;
declare const index_d$1_colorIntegrityConverter: typeof colorIntegrityConverter;
declare const index_d$1_coverPageGenerator: typeof coverPageGenerator;
declare const index_d$1_createColorManager: typeof createColorManager;
declare const index_d$1_defaultPrePressGenerator: typeof defaultPrePressGenerator;
declare const index_d$1_designTokenManager: typeof designTokenManager;
declare const index_d$1_formatBytes: typeof formatBytes;
declare const index_d$1_formatCMYK: typeof formatCMYK;
declare const index_d$1_formatPageNumber: typeof formatPageNumber;
declare const index_d$1_generateSubsettingReport: typeof generateSubsettingReport;
declare const index_d$1_getRichBlack: typeof getRichBlack;
declare const index_d$1_getVisualPolishProcessor: typeof getVisualPolishProcessor;
declare const index_d$1_gradientGenerator: typeof gradientGenerator;
declare const index_d$1_gradientRectGenerator: typeof gradientRectGenerator;
declare const index_d$1_hexToCmyk: typeof hexToCmyk;
declare const index_d$1_hexToRgb: typeof hexToRgb;
declare const index_d$1_inchToPt: typeof inchToPt;
declare const index_d$1_isValidRichBlack: typeof isValidRichBlack;
declare const index_d$1_layoutManager: typeof layoutManager;
declare const index_d$1_limitInkDensity: typeof limitInkDensity;
declare const index_d$1_meetsWCAGAA: typeof meetsWCAGAA;
declare const index_d$1_mmToPt: typeof mmToPt;
declare const index_d$1_pageNumberResolver: typeof pageNumberResolver;
declare const index_d$1_pageSectionTracker: typeof pageSectionTracker;
declare const index_d$1_paletteConverter: typeof paletteConverter;
declare const index_d$1_parseCMYK: typeof parseCMYK;
declare const index_d$1_ptToMm: typeof ptToMm;
declare const index_d$1_rgbToCmyk: typeof rgbToCmyk;
declare const index_d$1_sectionScanner: typeof sectionScanner;
declare const index_d$1_shadowApplicator: typeof shadowApplicator;
declare const index_d$1_shadowFilterGenerator: typeof shadowFilterGenerator;
declare const index_d$1_subsetFontForText: typeof subsetFontForText;
declare const index_d$1_tableContinuationProcessor: typeof tableContinuationProcessor;
declare const index_d$1_tableContinuationTracker: typeof tableContinuationTracker;
declare const index_d$1_visualPolishProcessor: typeof visualPolishProcessor;
declare const index_d$1_watermarkApplicator: typeof watermarkApplicator;
declare const index_d$1_watermarkGenerator: typeof watermarkGenerator;
declare const index_d$1_watermarkProcessor: typeof watermarkProcessor;
declare namespace index_d$1 {
  export { index_d$1_BLEED_SIZES as BLEED_SIZES, index_d$1_BaselineGridCalculator as BaselineGridCalculator, index_d$1_COMPACT_THEME as COMPACT_THEME, index_d$1_CSSVariableBridge as CSSVariableBridge, index_d$1_ChapterOpenerGenerator as ChapterOpenerGenerator, index_d$1_ColorIntegrityConverter as ColorIntegrityConverter, index_d$1_ColorManager as ColorManager, index_d$1_ColorPaletteConverter as ColorPaletteConverter, index_d$1_ContentBridgeDetector as ContentBridgeDetector, index_d$1_ContinuationBadgeGenerator as ContinuationBadgeGenerator, index_d$1_CoverPageGenerator as CoverPageGenerator, index_d$1_CropMarksGenerator as CropMarksGenerator, index_d$1_DARK_THEME as DARK_THEME, index_d$1_DEFAULT_GRID_CONFIG as DEFAULT_GRID_CONFIG, index_d$1_DEFAULT_THEME as DEFAULT_THEME, index_d$1_DesignTokenManager as DesignTokenManager, index_d$1_FontSubsetter as FontSubsetter, index_d$1_GRADIENT_PRESETS as GRADIENT_PRESETS, index_d$1_GradientGenerator as GradientGenerator, index_d$1_GradientRectGenerator as GradientRectGenerator, index_d$1_HeightCacheInvalidator as HeightCacheInvalidator, index_d$1_LAYOUT_PRESETS as LAYOUT_PRESETS, index_d$1_LayoutManager as LayoutManager, index_d$1_MultiColumnLayout as MultiColumnLayout, index_d$1_MultiSectionNumberResolver as MultiSectionNumberResolver, index_d$1_PAGE_NUMBERING_PRESETS as PAGE_NUMBERING_PRESETS, index_d$1_PANTONE_COLORS as PANTONE_COLORS, index_d$1_PLACEHOLDERS as PLACEHOLDERS, index_d$1_PREPRESS_PRESETS as PREPRESS_PRESETS, index_d$1_PageLayoutProcessor as PageLayoutProcessor, index_d$1_PageNumberRenderer as PageNumberRenderer, index_d$1_PageNumberResolver as PageNumberResolver, index_d$1_PageSectionTracker as PageSectionTracker, index_d$1_PrePressBoxCalculator as PrePressBoxCalculator, index_d$1_PrePressPageGenerator as PrePressPageGenerator, index_d$1_RUNNING_HEADER_PRESETS as RUNNING_HEADER_PRESETS, index_d$1_RunningHeaderGenerator as RunningHeaderGenerator, index_d$1_RunningHeaderProcessor as RunningHeaderProcessor, index_d$1_SHADOW_PRESETS as SHADOW_PRESETS, index_d$1_SPACIOUS_THEME as SPACIOUS_THEME, index_d$1_SPOT_COLORS as SPOT_COLORS, index_d$1_STANDARD_PROFILES as STANDARD_PROFILES, index_d$1_SectionMarkerScanner as SectionMarkerScanner, index_d$1_ShadowApplicator as ShadowApplicator, index_d$1_ShadowFilterGenerator as ShadowFilterGenerator, index_d$1_SlugContentGenerator as SlugContentGenerator, index_d$1_TABLE_CONTINUATION_PRESETS as TABLE_CONTINUATION_PRESETS, index_d$1_TableContinuationProcessor as TableContinuationProcessor, index_d$1_TableContinuationTracker as TableContinuationTracker, index_d$1_TableHeaderRepeater as TableHeaderRepeater, index_d$1_TableSplitDetector as TableSplitDetector, index_d$1_ThemeChangeDetector as ThemeChangeDetector, index_d$1_TiledWatermarkGenerator as TiledWatermarkGenerator, index_d$1_TimestampWatermark as TimestampWatermark, index_d$1_VerticalRhythmManager as VerticalRhythmManager, index_d$1_VisualPolishProcessor as VisualPolishProcessor, index_d$1_WATERMARK_PRESETS as WATERMARK_PRESETS, index_d$1_WatermarkApplicator as WatermarkApplicator, index_d$1_WatermarkGenerator as WatermarkGenerator, index_d$1_WatermarkProcessor as WatermarkProcessor, index_d$1_ZebraStripeManager as ZebraStripeManager, index_d$1_analyzeTextUnicodeRanges as analyzeTextUnicodeRanges, index_d$1_applyGCR as applyGCR, index_d$1_calculateContrastRatio as calculateContrastRatio, index_d$1_chapterOpenerGenerator as chapterOpenerGenerator, index_d$1_cmykToRgb as cmykToRgb, index_d$1_colorIntegrityConverter as colorIntegrityConverter, index_d$1_coverPageGenerator as coverPageGenerator, index_d$1_createColorManager as createColorManager, index_d$1_defaultPrePressGenerator as defaultPrePressGenerator, index_d$1_designTokenManager as designTokenManager, index_d$1_formatBytes as formatBytes, index_d$1_formatCMYK as formatCMYK, index_d$1_formatPageNumber as formatPageNumber, index_d$1_generateSubsettingReport as generateSubsettingReport, index_d$1_getRichBlack as getRichBlack, index_d$1_getVisualPolishProcessor as getVisualPolishProcessor, index_d$1_gradientGenerator as gradientGenerator, index_d$1_gradientRectGenerator as gradientRectGenerator, index_d$1_hexToCmyk as hexToCmyk, index_d$1_hexToRgb as hexToRgb, index_d$1_inchToPt as inchToPt, index_d$1_isValidRichBlack as isValidRichBlack, index_d$1_layoutManager as layoutManager, index_d$1_limitInkDensity as limitInkDensity, index_d$1_meetsWCAGAA as meetsWCAGAA, index_d$1_mmToPt as mmToPt, index_d$1_pageNumberResolver as pageNumberResolver, index_d$1_pageSectionTracker as pageSectionTracker, index_d$1_paletteConverter as paletteConverter, index_d$1_parseCMYK as parseCMYK, index_d$1_ptToMm as ptToMm, index_d$1_rgbToCmyk as rgbToCmyk, index_d$1_sectionScanner as sectionScanner, index_d$1_shadowApplicator as shadowApplicator, index_d$1_shadowFilterGenerator as shadowFilterGenerator, index_d$1_subsetFontForText as subsetFontForText, index_d$1_tableContinuationProcessor as tableContinuationProcessor, index_d$1_tableContinuationTracker as tableContinuationTracker, index_d$1_visualPolishProcessor as visualPolishProcessor, index_d$1_watermarkApplicator as watermarkApplicator, index_d$1_watermarkGenerator as watermarkGenerator, index_d$1_watermarkProcessor as watermarkProcessor };
  export type { index_d$1_Assertion as Assertion, index_d$1_BaselineGridConfig as BaselineGridConfig, index_d$1_CMYKColor as CMYKColor, index_d$1_CacheInvalidation as CacheInvalidation, index_d$1_ColorConversion as ColorConversion, index_d$1_ColorConversionResult as ColorConversionResult, index_d$1_ColorManagementConfig as ColorManagementConfig, index_d$1_ColorSpace as ColorSpace, index_d$1_ColorTokens as ColorTokens, index_d$1_ColorValue as ColorValue, index_d$1_ContinuationBadgeConfig as ContinuationBadgeConfig, index_d$1_CoverPageConfig as CoverPageConfig, index_d$1_CropMark as CropMark, index_d$1_CropMarkConfig as CropMarkConfig, index_d$1_DitherFilter as DitherFilter, index_d$1_FontSubsettingOptions as FontSubsettingOptions, index_d$1_FontSubsettingResult as FontSubsettingResult, index_d$1_FontUsageAnalysis as FontUsageAnalysis, index_d$1_GamutStatus as GamutStatus, index_d$1_GeometryTokens as GeometryTokens, index_d$1_GradientConfig as GradientConfig, index_d$1_GradientStop as GradientStop, index_d$1_GridAlignment as GridAlignment, index_d$1_HexColor as HexColor, index_d$1_ICCProfile as ICCProfile, index_d$1_INCH as INCH, index_d$1_LBU as LBU, index_d$1_LayoutImpact as LayoutImpact, index_d$1_LayoutOverride as LayoutOverride, index_d$1_LayoutType as LayoutType, index_d$1_MM as MM, index_d$1_NumberingStyle as NumberingStyle, index_d$1_PT as PT, index_d$1_PageBox as PageBox, index_d$1_PageNumberingConfig as PageNumberingConfig, index_d$1_Percent as Percent, index_d$1_PrePressBoxes as PrePressBoxes, index_d$1_PrePressConfig as PrePressConfig, index_d$1_RGBColor as RGBColor, index_d$1_RenderedWatermark as RenderedWatermark, index_d$1_RenderingIntent as RenderingIntent, index_d$1_ResolvedPageNumber as ResolvedPageNumber, index_d$1_RunningHeaderConfig as RunningHeaderConfig, index_d$1_SectionMarker as SectionMarker, index_d$1_ShadowConfig as ShadowConfig, index_d$1_ShadowFilter as ShadowFilter, index_d$1_SpacingTokens as SpacingTokens, index_d$1_SpotColor as SpotColor, index_d$1_SubsetResult as SubsetResult, index_d$1_TableContinuationState as TableContinuationState, index_d$1_TestResult as TestResult, index_d$1_Theme as Theme, index_d$1_ThemeTokens as ThemeTokens, index_d$1_TokenCategory as TokenCategory, index_d$1_TripleBoxModel as TripleBoxModel, index_d$1_TypographyTokens as TypographyTokens, index_d$1_UnicodeRange as UnicodeRange, index_d$1_VerificationReport as VerificationReport, index_d$1_WatermarkConfig as WatermarkConfig, index_d$1_WatermarkPosition as WatermarkPosition, index_d$1_WatermarkType as WatermarkType, index_d$1_ZebraStripeConfig as ZebraStripeConfig };
}

declare namespace index_d {
  export {
    index_d$1 as visualPolish,
  };
}

/**
 * SecurePDF - Pro Utility
 * =======================
 * PDF security and manipulation utilities using pdf-lib.
 *
 * This module provides enterprise-grade PDF operations:
 * - Password protection (user & owner passwords)
 * - Permission restrictions (print, copy, modify)
 * - PDF merging (combine multiple PDFs)
 * - Metadata manipulation
 * - Digital signatures (basic)
 * - PDF/A compliance helpers
 *
 * Uses pdf-lib - the most popular JavaScript PDF manipulation library
 * with 100% pure JS implementation (no native dependencies).
 *
 * @example
 * ```ts
 * import { SecurePDF, SecurePDFError } from "@runstamp/pro";
 *
 * // Add password protection (throws if encryption unavailable)
 * try {
 *   const secured = await SecurePDF.protect(pdfBytes, {
 *     userPassword: "viewer123",
 *     ownerPassword: "admin456",
 *     permissions: {
 *       printing: "low-resolution",
 *       modifying: false,
 *       copying: false,
 *     }
 *   });
 * } catch (error) {
 *   if (error instanceof SecurePDFError) {
 *     console.error("Encryption failed:", error.code);
 *   }
 * }
 *
 * // Opt-out of strict mode (NOT RECOMMENDED - security risk)
 * const maybeSecured = await SecurePDF.protect(pdfBytes, {
 *   userPassword: "viewer123",
 *   requireEncryption: false, // Returns unencrypted if encryption unavailable
 * });
 *
 * // Merge multiple PDFs
 * const merged = await SecurePDF.merge([pdf1, pdf2, pdf3]);
 * ```
 *
 * IMPORTANT: This utility requires pdf-lib as a peer dependency.
 * Install with: pnpm add pdf-lib
 */
interface ProtectOptions {
    /** Password required to open/view the PDF */
    userPassword?: string;
    /** Password required for full access (modify, print, etc.) */
    ownerPassword?: string;
    /** Permission restrictions */
    permissions?: PDFPermissions;
    /**
     * Throw an error if pdf-lib doesn't support encryption
     * When true (default), throws SecurePDFError if encryption is unavailable
     * When false, returns unencrypted PDF with a warning (SECURITY RISK)
     *
     * @default true
     */
    requireEncryption?: boolean;
}
interface PDFPermissions {
    /** Allow printing: false | 'low-resolution' | 'high-resolution' */
    printing?: false | "low-resolution" | "high-resolution";
    /** Allow content modification */
    modifying?: boolean;
    /** Allow copying text/images */
    copying?: boolean;
    /** Allow adding annotations */
    annotating?: boolean;
    /** Allow form filling */
    fillingForms?: boolean;
    /** Allow content extraction for accessibility */
    contentAccessibility?: boolean;
    /** Allow document assembly (insert, rotate, delete pages) */
    documentAssembly?: boolean;
}
interface MergeOptions {
    /** Document metadata for the merged PDF */
    metadata?: PDFMetadata;
    /** Add page numbers to the merged document */
    addPageNumbers?: boolean;
    /** Page number format */
    pageNumberFormat?: "numeric" | "roman" | "alpha";
    /** Page number position */
    pageNumberPosition?: "bottom-center" | "bottom-right" | "top-center" | "top-right";
}
interface PDFMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
}
interface WatermarkOptions {
    /** Watermark text */
    text: string;
    /** Font size (default: 48) */
    fontSize?: number;
    /** Text color in hex (default: #888888) */
    color?: string;
    /** Opacity 0-1 (default: 0.3) */
    opacity?: number;
    /** Rotation angle in degrees (default: -45) */
    rotation?: number;
    /** Position: center, tile, or custom */
    position?: "center" | "tile";
    /** Apply to which pages: 'all' | 'first' | 'last' | number[] */
    pages?: "all" | "first" | "last" | number[];
}
interface SignatureOptions {
    /** Signer name */
    name: string;
    /** Reason for signing */
    reason?: string;
    /** Location of signing */
    location?: string;
    /** Contact info */
    contactInfo?: string;
    /** Date of signing (default: now) */
    date?: Date;
    /** Visual signature image (base64 or URL) */
    signatureImage?: string;
    /** Position of visual signature */
    position?: {
        page: number;
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/**
 * SecurePDF - Enterprise PDF Security and Manipulation
 *
 * Provides a high-level API for common PDF operations.
 * All methods work with PDF bytes (Uint8Array) and return modified PDF bytes.
 */
declare class SecurePDF {
    /**
     * Check if pdf-lib supports encryption
     *
     * @returns Promise<boolean> - true if encryption is supported
     *
     * @example
     * ```ts
     * if (await SecurePDF.supportsEncryption()) {
     *   const secured = await SecurePDF.protect(pdfBytes, { userPassword: "test" });
     * }
     * ```
     */
    static supportsEncryption(): Promise<boolean>;
    /**
     * Get the installed pdf-lib version
     *
     * @returns Promise<string | null> - version string or null if unavailable
     */
    static getPdfLibVersion(): Promise<string | null>;
    /**
     * Add password protection and permission restrictions to a PDF
     *
     * @param pdfBytes - Source PDF as Uint8Array
     * @param options - Protection options
     * @returns Protected PDF as Uint8Array
     *
     * @example
     * ```ts
     * const secured = await SecurePDF.protect(pdfBytes, {
     *   userPassword: "viewonly123",
     *   ownerPassword: "fullaccess456",
     *   permissions: {
     *     printing: "low-resolution",
     *     copying: false,
     *   }
     * });
     * ```
     */
    static protect(pdfBytes: Uint8Array, options: ProtectOptions): Promise<Uint8Array>;
    /**
     * Merge multiple PDFs into a single document
     *
     * @param pdfBytesList - Array of PDF byte arrays
     * @param options - Merge options
     * @returns Merged PDF as Uint8Array
     *
     * @example
     * ```ts
     * const merged = await SecurePDF.merge([
     *   coverPagePdf,
     *   contentPdf,
     *   appendixPdf
     * ], {
     *   metadata: { title: "Complete Report" },
     *   addPageNumbers: true
     * });
     * ```
     */
    static merge(pdfBytesList: Uint8Array[], options?: MergeOptions): Promise<Uint8Array>;
    /**
     * Add a watermark to a PDF
     *
     * @param pdfBytes - Source PDF as Uint8Array
     * @param options - Watermark options
     * @returns Watermarked PDF as Uint8Array
     *
     * @example
     * ```ts
     * const watermarked = await SecurePDF.watermark(pdfBytes, {
     *   text: "CONFIDENTIAL",
     *   opacity: 0.2,
     *   rotation: -45,
     *   position: "center"
     * });
     * ```
     */
    static watermark(pdfBytes: Uint8Array, options: WatermarkOptions): Promise<Uint8Array>;
    /**
     * Set or update PDF metadata
     *
     * @param pdfBytes - Source PDF as Uint8Array
     * @param metadata - Metadata to set
     * @returns Modified PDF as Uint8Array
     */
    static setMetadata(pdfBytes: Uint8Array, metadata: PDFMetadata): Promise<Uint8Array>;
    /**
     * Extract pages from a PDF
     *
     * @param pdfBytes - Source PDF as Uint8Array
     * @param pageNumbers - Array of page numbers to extract (1-indexed)
     * @returns New PDF with only the extracted pages
     */
    static extractPages(pdfBytes: Uint8Array, pageNumbers: number[]): Promise<Uint8Array>;
    /**
     * Split a PDF into multiple single-page PDFs
     *
     * @param pdfBytes - Source PDF as Uint8Array
     * @returns Array of single-page PDFs
     */
    static split(pdfBytes: Uint8Array): Promise<Uint8Array[]>;
    /**
     * Add a visual signature to a PDF
     *
     * Note: This adds a VISUAL signature only (image + metadata).
     * For cryptographic digital signatures that provide legal validity,
     * use a dedicated signing service like DocuSign, Adobe Sign, or
     * a library that supports PKCS#7 signing (e.g., node-signpdf).
     *
     * @param pdfBytes - Source PDF as Uint8Array
     * @param options - Signature options
     * @returns Signed PDF as Uint8Array
     *
     * @example
     * ```ts
     * const signed = await SecurePDF.sign(pdfBytes, {
     *   name: "John Doe",
     *   reason: "Document approval",
     *   location: "New York, NY",
     *   position: { page: 1, x: 400, y: 50, width: 150, height: 50 }
     * });
     * ```
     */
    static sign(pdfBytes: Uint8Array, options: SignatureOptions): Promise<Uint8Array>;
    /**
     * Get PDF document info
     *
     * @param pdfBytes - PDF as Uint8Array
     * @returns Document information
     */
    static getInfo(pdfBytes: Uint8Array): Promise<{
        pageCount: number;
        metadata: PDFMetadata;
        pagesSizes: Array<{
            width: number;
            height: number;
        }>;
    }>;
}

type AccessibilitySeverity = "error" | "warning" | "info";
type AccessibilityIssueCode = "document.title_missing" | "document.language_missing" | "image.alt_missing" | "structure.heading_skipped" | "table.header_missing";
type AccessibilityFormat = "pptx" | "docx" | "xlsx" | "pdf";
interface AccessibilityLocation {
    elementPath?: string;
    pageIndex?: number;
    slideIndex?: number;
    sheetName?: string;
}
interface AccessibilityIssue {
    code: AccessibilityIssueCode;
    severity: AccessibilitySeverity;
    message: string;
    location?: AccessibilityLocation;
    suggestedFix?: string;
}
interface AccessibilitySummary {
    errors: number;
    warnings: number;
    infos: number;
}
interface AccessibilityReport$1 {
    valid: boolean;
    summary: AccessibilitySummary;
    issues: AccessibilityIssue[];
    format: AccessibilityFormat;
    standard?: string;
}
interface AccessibilityFix {
    code: AccessibilityIssueCode;
    action: string;
    applied: boolean;
    target?: string;
}
interface AccessibilityRemediationResult$1 {
    reportBefore: AccessibilityReport$1;
    reportAfter: AccessibilityReport$1;
    fixesApplied: AccessibilityFix[];
}

/**
 * DOCX Accessibility Validator Types
 * ===================================
 * WCAG-based accessibility validation for StructuredDocument.
 */

type AccessibilityLevel = 'A' | 'AA' | 'AAA';
type DocxAccessibilityViolationCode = 'HEADING_SKIP' | 'IMG_ALT_MISSING' | 'IMG_ALT_EMPTY' | 'TABLE_HEADER_MISSING' | 'TABLE_CAPTION_MISSING' | 'DOC_TITLE_MISSING' | 'DOC_LANG_MISSING' | 'LIST_SEMANTIC_MISSING' | 'CONTRAST_INSUFFICIENT';
interface AccessibilityViolation {
    code: DocxAccessibilityViolationCode;
    severity: 'error' | 'warning';
    message: string;
    pageIndex?: number;
    elementPath?: string;
    wcagCriterion: string;
    remediation: string;
}
interface AccessibilityReport extends AccessibilityReport$1 {
    score: number;
    level: AccessibilityLevel;
    violations: AccessibilityViolation[];
    warnings: AccessibilityViolation[];
    issues: AccessibilityIssue[];
    summary: AccessibilitySummary & {
        totalElements: number;
        imagesTotal: number;
        imagesWithAlt: number;
        imagesDecorativeMarked: number;
        tablesTotal: number;
        tablesWithHeaders: number;
        tablesWithCaptions: number;
        headingHierarchyValid: boolean;
        documentTitleSet: boolean;
        documentLanguageSet: boolean;
        colorContrastIssues: number;
        skippedHeadingLevels: string[];
    };
}

interface AccessibilityRemediationResult extends AccessibilityRemediationResult$1 {
    document: StructuredDocument;
    reportBefore: AccessibilityReport;
    reportAfter: AccessibilityReport;
}

declare function validateAccessibility(input: StructuredDocument | DocxDocument): AccessibilityReport;
declare function remediateAccessibility(input: StructuredDocument | DocxDocument): AccessibilityRemediationResult;

/**
 * Compliance Validation Schemas
 * =============================
 * PRD-002 Section 3: Compliance Primitives Validation
 *
 * Zod schemas for validating compliance component inputs
 * before rendering to prevent non-compliant invoices.
 */

/**
 * India GST QR Code validation schema
 * Validates input against e-invoice JSON Schema (INV-01)
 */
declare const IndiaGSTQRSchema: ZodObject<{
    gstinSupplier: ZodString;
    gstinBuyer: ZodString;
    invoiceNumber: ZodString;
    invoiceDate: ZodString;
    totalValue: ZodNumber;
    itemCount: ZodNumber;
    hsnCode: ZodString;
    irn: ZodOptional<ZodString>;
    signedQRString: ZodOptional<ZodString>;
}, $strip>;
/**
 * Validation result for India GST
 */
interface GSTValidationResult {
    valid: boolean;
    errors: Array<{
        field: string;
        message: string;
    }>;
    warnings: string[];
}
/**
 * EU Reverse Charge validation schema
 */
declare const EUReverseChargeSchema: ZodObject<{
    supplierCountry: ZodPipe<ZodString, ZodTransform<string, string>>;
    customerCountry: ZodPipe<ZodString, ZodTransform<string, string>>;
    isVatRegistered: ZodBoolean;
    vatNumber: ZodOptional<ZodString>;
    language: ZodDefault<ZodEnum<{
        fr: "fr";
        pt: "pt";
        en: "en";
        de: "de";
        es: "es";
        it: "it";
        nl: "nl";
    }>>;
}, $strip>;
/**
 * Validation result for EU VAT
 */
interface VATValidationResult {
    valid: boolean;
    errors: Array<{
        field: string;
        message: string;
    }>;
    warnings: string[];
    scenario: "reverse_charge" | "zero_rate_export" | "domestic" | "b2c" | "none";
    requiredText?: string;
}
/**
 * Brazilian DANFE validation schema
 */
declare const BrazilianDanfeSchema: ZodObject<{
    nfeKey: ZodString;
    issuerCnpj: ZodString;
    recipientDocument: ZodString;
    nfeNumber: ZodNumber;
    series: ZodNumber;
    issueDate: ZodString;
    totalValue: ZodNumber;
}, $strip>;

declare function validateIndiaGSTQR(input: unknown): GSTValidationResult;
declare function validateEUReverseCharge(input: unknown): VATValidationResult;
declare function validateBrazilianDanfe(input: unknown): {
    valid: boolean;
    errors: Array<{
        field: string;
        message: string;
    }>;
    warnings: string[];
};

/**
 * @runstamp/docx
 *
 * JSON-first DOCX rendering engine.
 * DocxDocument JSON in, .docx binary out.
 *
 * No React. No DOM. No Puppeteer. No browser.
 *
 * @example
 * ```ts
 * import { renderToDocx } from '@runstamp/docx';
 *
 * const result = await renderToDocx({
 *   type: 'DocxDocument',
 *   pageSize: 'a4',
 *   pages: [{
 *     elements: [
 *       { type: 'heading', level: 1, text: 'Hello World' },
 *       { type: 'paragraph', text: 'Generated by an AI agent.' },
 *     ]
 *   }]
 * });
 *
 * fs.writeFileSync('output.docx', result.buffer);
 * ```
 */
type DocxPvce = Record<string, unknown> & {
    compileChart: (...args: unknown[]) => unknown;
    chartToSVG: (...args: unknown[]) => unknown;
};

declare const pvce: DocxPvce;

export { ACADEMIC_THEME, BaseStyleSchema, BatchOptionsSchema, BorderStyleSchema, BrazilianDanfeSchema, CLASSIC_THEME, CORPORATE_THEME, ChartElementSchema, CodeBlockElementSchema, ColorValue$1 as ColorValue, CommentInfoSchema, DARK_THEME$1 as DARK_THEME, DEFAULT_DOCX_ARCHIVE_LIMITS, DOCXError, DOCXErrorCode, DOCXWarningCode, DOCX_CONTROLLED_DOCUMENT_MANIFEST, DOCX_CONTROLLED_LOSS_CODES, DOCX_CONTROLLED_WARNING_CODES, DOCX_RELAXED_INPUT_COERCIONS, DividerElementSchema, DocxControlledDocumentError, DocxDocumentSchema, DocxElementSchema, DocxPageSchema, DocxQualityGate, DocxStrictValidationError, DocxTemplateSchema, DocxThemeSchema, EUReverseChargeSchema, Errors, HeaderFooterDefSchema, HeadingElementSchema, HtmlDocxOptionsSchema, ImageElementSchema, IndiaGSTQRSchema, ListElementSchema, MINIMAL_THEME, MODERN_THEME, PAGE_SIZES, PageBreakElementSchema, ParagraphElementSchema, RevisionInfoSchema, SecurePDF, ShapeElementSchema, SpacingSchema, TableElementSchema, TableOfContentsSchema, TextRunSchema, WARNING_CODES, WarningCollector, Warnings, applyDocxRedactions, asEmu, asHalfPoints, asInches, asLineSpacingDxa, asMm, asPoints, asPx, asTwips, batchHydrate, batchRender, buildContractDocx, buildInvoiceDocx, buildReportDocx, compareDocuments, convertHtmlToStructured, index_d$2 as core, createDocxControlledDocumentExtension, createWarning, detectImageAlignment, diffDocxDocuments, docxToStructured, index_d as experimental, exportControlledDocx, findControlledDocx, formatWarning, getDefaultTheme, getThemePreset, hydrateDocx, hydrateDocxToPdf, hydrateTemplate, importControlledDocx, inchesToEmu, inchesToTwips, inspectControlledDocx, isCodeBlock, isDOCXError, isDeterministicModeEnabled, isDocxWarningCode, isMonospaceFont, lineHeightToDocx, mmToTwips, paperToStructured, pointsToHalfPoints$1 as pointsToHalfPoints, preprocessDocxDocumentInput, previewDocxRedactions, pvce, pxToEmu, pxToHalfPoints, pxToTwips$1 as pxToTwips, remediateAccessibility, renderHtmlToDocx, renderToDocx, renderToDocxWithQuality, renderToPdf, renderWithTrackedChanges, resolveDocxWarningCode, runDocxQualityGate, scanForPlaceholders, serializeStructuredToNativeOOXML, setDeterministicMode, toDOCXError, validateAccessibility, validateBrazilianDanfe, validateDocxBuffer, validateDocxDocument, validateDocxWithReferenceApplication, validateEUReverseCharge, validateIndiaGSTQR, verifyControlledDocx };
export type { AccessibilityLevel, AccessibilityRemediationResult, AccessibilityReport, AccessibilityViolation, AssetRegistry, AxesConfig, AxisConfig, Background, BaseElement, BatchItemResult, BatchOptions, BatchResult, BorderStyle, BoundingBox, BuildContractDocxInput, BuildInvoiceDocxInput, BuildReportDocxInput, CellReference, CellStyle, Change, ChangeSet, ChartAdapter, ChartElement, ChartRenderInput, ChartSeries, ChartType$1 as ChartType, CommentInfo, CompareDocumentsOptions, CompareDocumentsResult, ComputedStyle, ContainerElement, ContractClause, ContractParty, ContractSignature, ControlledDocxDocument, ControlledDocxPart, DOCXHints$1 as DOCXHints, DiffOptions, DocumentMetadata$1 as DocumentMetadata, DocxAccessibilityViolationCode, DocxArchiveLimits, DocxControlledErrorCode, DocxControlledInspection, DocxDocument, DocxElement, DocxExpectedSemanticManifest, DocxFindResult, DocxInputWarning, DocxPage, DocxQualityGateArtifactHashes, DocxQualityGateInput, DocxQualityGateManifest, DocxQualityGateResult, DocxQualityGateSidecars, DocxRedactionPreview, DocxRedactionProof, DocxRedactionResult, DocxReferenceApplication, DocxReferenceValidationResult, DocxRelationshipInspection, DocxRenderStatsForQualityGate, DocxResult, DocxRevisionInfo, DocxTextLocator, DocxTextRun, DocxTheme, DocxTrackedChangeVisibility, DocxVerificationReport, DocxVerifyIssue, DocxWarning, DocxWarningCode, EMU, ElementType, ExtractedLayoutInfo, ExtractionStats, FillStyle, FindingCode, GradientDefinition, GradientStop$1 as GradientStop, HalfPoints, HeaderFooterContent, HeaderFooterDef, HeadingElement, HtmlConversionOptions, HtmlDocxOptions, HydrationArchiveLimits, HydrationImageLimits, HydrationOptions$1 as HydrationOptions, ImageAdapter, ImageElement, Inches, InvoiceLineItem, InvoiceParty, LegendConfig, LineSpacingDxa, ListElement, ListItem, Mm, NativeOOXMLSerializerOptions, NativeOOXMLSerializerResult, OoxmlValidationIssue, OoxmlValidationResult, PageDimensions$1 as PageDimensions, PaperDocumentInput, ParagraphElement, PdfResult, Points, Px, QualityFinding, QualityReport$1 as QualityReport, QualityVerdict, RenderOptions, RenderProgress, RenderStats, RenderWithQualityResult, RepairEntry, RepairRisk, RevisionInfo, SectionBreak, ShapeElement, ShapeType, StrokeStyle, StructuredDocument, StructuredElement, StructuredPage, StyleDefinitions, TableCell, TableColumn, TableElement, TableOfContentsConfig, TableRow, TextRun, TextRunElement, TextRunRevision, TextRunStyleSnapshot, Theme$1 as Theme, ThemePresetName, Twips, ValidationIssue$1 as ValidationIssue, ValidationResult$1 as ValidationResult };
