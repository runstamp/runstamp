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
interface ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodIntersectionInternals<A, B>>, $ZodIntersection<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodIntersection: $constructor<ZodIntersection>;
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

declare const KpiSchema: ZodObject<{
    label: ZodString;
    value: ZodString;
    trend: ZodDefault<ZodEnum<{
        none: "none";
        flat: "flat";
        up: "up";
        down: "down";
    }>>;
    sublabel: ZodOptional<ZodString>;
    style: ZodOptional<ZodEnum<{
        gradient: "gradient";
        outline: "outline";
        dark: "dark";
    }>>;
}, $strip>;
declare const DataSeriesSchema: ZodObject<{
    name: ZodString;
    dataPoints: ZodArray<ZodObject<{
        category: ZodString;
        value: ZodNumber;
    }, $strip>>;
}, $strip>;
declare const ComparisonSchema: ZodObject<{
    leftLabel: ZodString;
    rightLabel: ZodString;
    rows: ZodArray<ZodObject<{
        left: ZodString;
        right: ZodString;
    }, $strip>>;
}, $strip>;
declare const SlidePatternEnum: ZodEnum<{
    title: "title";
    statement: "statement";
    dashboard: "dashboard";
    comparison: "comparison";
    "chart-focus": "chart-focus";
    bullets: "bullets";
}>;
declare const AgentSlideSchema: ZodObject<{
    pattern: ZodEnum<{
        title: "title";
        statement: "statement";
        dashboard: "dashboard";
        comparison: "comparison";
        "chart-focus": "chart-focus";
        bullets: "bullets";
    }>;
    content: ZodObject<{
        title: ZodString;
        subtitle: ZodOptional<ZodString>;
        prose: ZodOptional<ZodArray<ZodString>>;
        bulletPoints: ZodOptional<ZodArray<ZodString>>;
        comparison: ZodOptional<ZodObject<{
            leftLabel: ZodString;
            rightLabel: ZodString;
            rows: ZodArray<ZodObject<{
                left: ZodString;
                right: ZodString;
            }, $strip>>;
        }, $strip>>;
        kpis: ZodOptional<ZodArray<ZodObject<{
            label: ZodString;
            value: ZodString;
            trend: ZodDefault<ZodEnum<{
                none: "none";
                flat: "flat";
                up: "up";
                down: "down";
            }>>;
            sublabel: ZodOptional<ZodString>;
            style: ZodOptional<ZodEnum<{
                gradient: "gradient";
                outline: "outline";
                dark: "dark";
            }>>;
        }, $strip>>>;
        chart: ZodOptional<ZodObject<{
            type: ZodEnum<{
                pie: "pie";
                line: "line";
                bar: "bar";
                area: "area";
                doughnut: "doughnut";
                radar: "radar";
            }>;
            areaGrouping: ZodOptional<ZodEnum<{
                stacked: "stacked";
                percentStacked: "percentStacked";
                standard: "standard";
            }>>;
            title: ZodOptional<ZodString>;
            series: ZodArray<ZodObject<{
                name: ZodString;
                dataPoints: ZodArray<ZodObject<{
                    category: ZodString;
                    value: ZodNumber;
                }, $strip>>;
            }, $strip>>;
        }, $strip>>;
    }, $strip>;
}, $strip>;
declare const AgentDocumentSchema: ZodObject<{
    type: ZodDefault<ZodLiteral<"presentation">>;
    version: ZodDefault<ZodLiteral<"1.0">>;
    presentationTitle: ZodString;
    companyName: ZodOptional<ZodString>;
    accentColor: ZodOptional<ZodString>;
    theme: ZodOptional<ZodEnum<{
        "default-navy": "default-navy";
        "editorial-serif": "editorial-serif";
        monochrome: "monochrome";
        "dark-punch": "dark-punch";
        midnight: "midnight";
        terminal: "terminal";
        "editorial-wide": "editorial-wide";
    }>>;
    designTokens: ZodOptional<ZodObject<{
        scale: ZodOptional<ZodOptional<ZodEnum<{
            sm: "sm";
            lg: "lg";
            md: "md";
            xl: "xl";
        }>>>;
        density: ZodOptional<ZodOptional<ZodEnum<{
            balanced: "balanced";
            compact: "compact";
            spacious: "spacious";
        }>>>;
        shape: ZodOptional<ZodOptional<ZodEnum<{
            soft: "soft";
            round: "round";
            sharp: "sharp";
        }>>>;
        colors: ZodOptional<ZodOptional<ZodObject<{
            accent: ZodOptional<ZodString>;
            themeDark1: ZodOptional<ZodString>;
            themeDark2: ZodOptional<ZodString>;
            themeLight1: ZodOptional<ZodString>;
            themeLight2: ZodOptional<ZodString>;
            slideBackground: ZodOptional<ZodString>;
            titleBackgroundStart: ZodOptional<ZodString>;
            titleBackgroundEnd: ZodOptional<ZodString>;
            titleText: ZodOptional<ZodString>;
            titleSubtitleText: ZodOptional<ZodString>;
            headingText: ZodOptional<ZodString>;
            bodyText: ZodOptional<ZodString>;
            mutedText: ZodOptional<ZodString>;
            cardBackground: ZodOptional<ZodString>;
            darkCardBackground: ZodOptional<ZodString>;
            darkCardText: ZodOptional<ZodString>;
            darkCardMutedText: ZodOptional<ZodString>;
            cardBorder: ZodOptional<ZodString>;
            chartPalette: ZodOptional<ZodArray<ZodString>>;
        }, $strict>>>;
        typography: ZodOptional<ZodOptional<ZodObject<{
            fontStrategy: ZodOptional<ZodEnum<{
                system: "system";
                portable: "portable";
                "user-embedded": "user-embedded";
                "named-with-fallback": "named-with-fallback";
                "system-safe": "system-safe";
                embedded: "embedded";
            }>>;
            titleFontFamily: ZodOptional<ZodString>;
            bodyFontFamily: ZodOptional<ZodString>;
            heroTitleSize: ZodOptional<ZodNumber>;
            heroSubtitleSize: ZodOptional<ZodNumber>;
            headerSize: ZodOptional<ZodNumber>;
            subheaderSize: ZodOptional<ZodNumber>;
            footerSize: ZodOptional<ZodNumber>;
            sectionTitleSize: ZodOptional<ZodNumber>;
            sectionSubtitleSize: ZodOptional<ZodNumber>;
            statementBodySize: ZodOptional<ZodNumber>;
            bulletListSize: ZodOptional<ZodNumber>;
            bulletsProseSize: ZodOptional<ZodNumber>;
            comparisonBodySize: ZodOptional<ZodNumber>;
            kpiGradientLabelSize: ZodOptional<ZodNumber>;
            kpiLabelSize: ZodOptional<ZodNumber>;
            kpiValueSize: ZodOptional<ZodNumber>;
            kpiSublabelSize: ZodOptional<ZodNumber>;
            chartTitleSize: ZodOptional<ZodNumber>;
            chartLegendSize: ZodOptional<ZodNumber>;
            chartDataLabelSize: ZodOptional<ZodNumber>;
            chartPieDataLabelSize: ZodOptional<ZodNumber>;
        }, $strict>>>;
        layout: ZodOptional<ZodOptional<ZodObject<{
            accentBarHeight: ZodOptional<ZodNumber>;
            paddingX: ZodOptional<ZodNumber>;
            paddingTop: ZodOptional<ZodNumber>;
            paddingBottom: ZodOptional<ZodNumber>;
            headerTop: ZodOptional<ZodNumber>;
            subheaderTop: ZodOptional<ZodNumber>;
            footerBottom: ZodOptional<ZodNumber>;
            headerLeft: ZodOptional<ZodNumber>;
            contentWidth: ZodOptional<ZodNumber>;
            titlePaddingX: ZodOptional<ZodNumber>;
            titlePaddingTop: ZodOptional<ZodNumber>;
            titlePaddingBottom: ZodOptional<ZodNumber>;
            contentPaddingX: ZodOptional<ZodNumber>;
            contentPaddingTop: ZodOptional<ZodNumber>;
            contentPaddingBottom: ZodOptional<ZodNumber>;
            titleDividerWidth: ZodOptional<ZodNumber>;
            titleDividerHeight: ZodOptional<ZodNumber>;
            titleDividerMarginTop: ZodOptional<ZodNumber>;
            titleDividerMarginBottom: ZodOptional<ZodNumber>;
            sectionDividerWidth: ZodOptional<ZodNumber>;
            sectionDividerHeight: ZodOptional<ZodNumber>;
            sectionDividerMarginTop: ZodOptional<ZodNumber>;
            sectionDividerMarginBottom: ZodOptional<ZodNumber>;
            statementParagraphGap: ZodOptional<ZodNumber>;
            bodyTopWithSubtitle: ZodOptional<ZodNumber>;
            bodyTopWithoutSubtitle: ZodOptional<ZodNumber>;
            bodyHeight: ZodOptional<ZodNumber>;
            chartHeight: ZodOptional<ZodNumber>;
            dashboardGap: ZodOptional<ZodNumber>;
            comparisonGap: ZodOptional<ZodNumber>;
            comparisonColumnWidth: ZodOptional<ZodNumber>;
            comparisonColumnGap: ZodOptional<ZodNumber>;
            kpiCardHeight: ZodOptional<ZodNumber>;
            kpiCardPadding: ZodOptional<ZodNumber>;
            dashboardKpiPanelWidthWithChart: ZodOptional<ZodNumber>;
            dashboardPanelWidthFull: ZodOptional<ZodNumber>;
            dashboardChartWidthWithKpis: ZodOptional<ZodNumber>;
            chartFocusSidebarWidth: ZodOptional<ZodNumber>;
            chartFocusSidebarLeft: ZodOptional<ZodNumber>;
            chartFocusChartWidthWithSidebar: ZodOptional<ZodNumber>;
            chartFocusChartWidthFull: ZodOptional<ZodNumber>;
            bulletsBottomMargin: ZodOptional<ZodNumber>;
            bulletsHeightWithProse: ZodOptional<ZodNumber>;
            proseOffsetAfterBullets: ZodOptional<ZodNumber>;
        }, $strict>>>;
        effects: ZodOptional<ZodOptional<ZodObject<{
            titleGradientAngle: ZodOptional<ZodNumber>;
            kpiGradientAngle: ZodOptional<ZodNumber>;
            kpiGradientDarkenPercent: ZodOptional<ZodNumber>;
            kpiGradientLabelLightenPercent: ZodOptional<ZodNumber>;
            kpiGradientSublabelLightenPercent: ZodOptional<ZodNumber>;
            kpiShapeAdjustment: ZodOptional<ZodNumber>;
            outlineBorderWidth: ZodOptional<ZodNumber>;
            chartBarGapWidth: ZodOptional<ZodNumber>;
            chartDoughnutHoleSize: ZodOptional<ZodNumber>;
        }, $strict>>>;
    }, $strict>>;
    slides: ZodArray<ZodObject<{
        pattern: ZodEnum<{
            title: "title";
            statement: "statement";
            dashboard: "dashboard";
            comparison: "comparison";
            "chart-focus": "chart-focus";
            bullets: "bullets";
        }>;
        content: ZodObject<{
            title: ZodString;
            subtitle: ZodOptional<ZodString>;
            prose: ZodOptional<ZodArray<ZodString>>;
            bulletPoints: ZodOptional<ZodArray<ZodString>>;
            comparison: ZodOptional<ZodObject<{
                leftLabel: ZodString;
                rightLabel: ZodString;
                rows: ZodArray<ZodObject<{
                    left: ZodString;
                    right: ZodString;
                }, $strip>>;
            }, $strip>>;
            kpis: ZodOptional<ZodArray<ZodObject<{
                label: ZodString;
                value: ZodString;
                trend: ZodDefault<ZodEnum<{
                    none: "none";
                    flat: "flat";
                    up: "up";
                    down: "down";
                }>>;
                sublabel: ZodOptional<ZodString>;
                style: ZodOptional<ZodEnum<{
                    gradient: "gradient";
                    outline: "outline";
                    dark: "dark";
                }>>;
            }, $strip>>>;
            chart: ZodOptional<ZodObject<{
                type: ZodEnum<{
                    pie: "pie";
                    line: "line";
                    bar: "bar";
                    area: "area";
                    doughnut: "doughnut";
                    radar: "radar";
                }>;
                areaGrouping: ZodOptional<ZodEnum<{
                    stacked: "stacked";
                    percentStacked: "percentStacked";
                    standard: "standard";
                }>>;
                title: ZodOptional<ZodString>;
                series: ZodArray<ZodObject<{
                    name: ZodString;
                    dataPoints: ZodArray<ZodObject<{
                        category: ZodString;
                        value: ZodNumber;
                    }, $strip>>;
                }, $strip>>;
            }, $strip>>;
        }, $strip>;
    }, $strip>>;
}, $strip>;
type Kpi = output<typeof KpiSchema>;
type DataSeries = output<typeof DataSeriesSchema>;
type Comparison = output<typeof ComparisonSchema>;
type SlidePattern = output<typeof SlidePatternEnum>;
type AgentSlide = output<typeof AgentSlideSchema>;
type AgentDocument = output<typeof AgentDocumentSchema>;

declare const SAFE_FONT_FAMILY_SCHEMA: ZodEnum<{
    system: "system";
    portable: "portable";
    "user-embedded": "user-embedded";
    "named-with-fallback": "named-with-fallback";
    "system-safe": "system-safe";
    embedded: "embedded";
}>;
declare const AGENT_SCALE_SCHEMA: ZodEnum<{
    sm: "sm";
    lg: "lg";
    md: "md";
    xl: "xl";
}>;
declare const AGENT_DENSITY_SCHEMA: ZodEnum<{
    balanced: "balanced";
    compact: "compact";
    spacious: "spacious";
}>;
declare const AGENT_SHAPE_SCHEMA: ZodEnum<{
    soft: "soft";
    round: "round";
    sharp: "sharp";
}>;
declare const AgentThemePresetSchema: ZodEnum<{
    "default-navy": "default-navy";
    "editorial-serif": "editorial-serif";
    monochrome: "monochrome";
    "dark-punch": "dark-punch";
    midnight: "midnight";
    terminal: "terminal";
    "editorial-wide": "editorial-wide";
}>;
declare const DesignTokensSchema: ZodObject<{
    scale: ZodOptional<ZodOptional<ZodEnum<{
        sm: "sm";
        lg: "lg";
        md: "md";
        xl: "xl";
    }>>>;
    density: ZodOptional<ZodOptional<ZodEnum<{
        balanced: "balanced";
        compact: "compact";
        spacious: "spacious";
    }>>>;
    shape: ZodOptional<ZodOptional<ZodEnum<{
        soft: "soft";
        round: "round";
        sharp: "sharp";
    }>>>;
    colors: ZodOptional<ZodOptional<ZodObject<{
        accent: ZodOptional<ZodString>;
        themeDark1: ZodOptional<ZodString>;
        themeDark2: ZodOptional<ZodString>;
        themeLight1: ZodOptional<ZodString>;
        themeLight2: ZodOptional<ZodString>;
        slideBackground: ZodOptional<ZodString>;
        titleBackgroundStart: ZodOptional<ZodString>;
        titleBackgroundEnd: ZodOptional<ZodString>;
        titleText: ZodOptional<ZodString>;
        titleSubtitleText: ZodOptional<ZodString>;
        headingText: ZodOptional<ZodString>;
        bodyText: ZodOptional<ZodString>;
        mutedText: ZodOptional<ZodString>;
        cardBackground: ZodOptional<ZodString>;
        darkCardBackground: ZodOptional<ZodString>;
        darkCardText: ZodOptional<ZodString>;
        darkCardMutedText: ZodOptional<ZodString>;
        cardBorder: ZodOptional<ZodString>;
        chartPalette: ZodOptional<ZodArray<ZodString>>;
    }, $strict>>>;
    typography: ZodOptional<ZodOptional<ZodObject<{
        fontStrategy: ZodOptional<ZodEnum<{
            system: "system";
            portable: "portable";
            "user-embedded": "user-embedded";
            "named-with-fallback": "named-with-fallback";
            "system-safe": "system-safe";
            embedded: "embedded";
        }>>;
        titleFontFamily: ZodOptional<ZodString>;
        bodyFontFamily: ZodOptional<ZodString>;
        heroTitleSize: ZodOptional<ZodNumber>;
        heroSubtitleSize: ZodOptional<ZodNumber>;
        headerSize: ZodOptional<ZodNumber>;
        subheaderSize: ZodOptional<ZodNumber>;
        footerSize: ZodOptional<ZodNumber>;
        sectionTitleSize: ZodOptional<ZodNumber>;
        sectionSubtitleSize: ZodOptional<ZodNumber>;
        statementBodySize: ZodOptional<ZodNumber>;
        bulletListSize: ZodOptional<ZodNumber>;
        bulletsProseSize: ZodOptional<ZodNumber>;
        comparisonBodySize: ZodOptional<ZodNumber>;
        kpiGradientLabelSize: ZodOptional<ZodNumber>;
        kpiLabelSize: ZodOptional<ZodNumber>;
        kpiValueSize: ZodOptional<ZodNumber>;
        kpiSublabelSize: ZodOptional<ZodNumber>;
        chartTitleSize: ZodOptional<ZodNumber>;
        chartLegendSize: ZodOptional<ZodNumber>;
        chartDataLabelSize: ZodOptional<ZodNumber>;
        chartPieDataLabelSize: ZodOptional<ZodNumber>;
    }, $strict>>>;
    layout: ZodOptional<ZodOptional<ZodObject<{
        accentBarHeight: ZodOptional<ZodNumber>;
        paddingX: ZodOptional<ZodNumber>;
        paddingTop: ZodOptional<ZodNumber>;
        paddingBottom: ZodOptional<ZodNumber>;
        headerTop: ZodOptional<ZodNumber>;
        subheaderTop: ZodOptional<ZodNumber>;
        footerBottom: ZodOptional<ZodNumber>;
        headerLeft: ZodOptional<ZodNumber>;
        contentWidth: ZodOptional<ZodNumber>;
        titlePaddingX: ZodOptional<ZodNumber>;
        titlePaddingTop: ZodOptional<ZodNumber>;
        titlePaddingBottom: ZodOptional<ZodNumber>;
        contentPaddingX: ZodOptional<ZodNumber>;
        contentPaddingTop: ZodOptional<ZodNumber>;
        contentPaddingBottom: ZodOptional<ZodNumber>;
        titleDividerWidth: ZodOptional<ZodNumber>;
        titleDividerHeight: ZodOptional<ZodNumber>;
        titleDividerMarginTop: ZodOptional<ZodNumber>;
        titleDividerMarginBottom: ZodOptional<ZodNumber>;
        sectionDividerWidth: ZodOptional<ZodNumber>;
        sectionDividerHeight: ZodOptional<ZodNumber>;
        sectionDividerMarginTop: ZodOptional<ZodNumber>;
        sectionDividerMarginBottom: ZodOptional<ZodNumber>;
        statementParagraphGap: ZodOptional<ZodNumber>;
        bodyTopWithSubtitle: ZodOptional<ZodNumber>;
        bodyTopWithoutSubtitle: ZodOptional<ZodNumber>;
        bodyHeight: ZodOptional<ZodNumber>;
        chartHeight: ZodOptional<ZodNumber>;
        dashboardGap: ZodOptional<ZodNumber>;
        comparisonGap: ZodOptional<ZodNumber>;
        comparisonColumnWidth: ZodOptional<ZodNumber>;
        comparisonColumnGap: ZodOptional<ZodNumber>;
        kpiCardHeight: ZodOptional<ZodNumber>;
        kpiCardPadding: ZodOptional<ZodNumber>;
        dashboardKpiPanelWidthWithChart: ZodOptional<ZodNumber>;
        dashboardPanelWidthFull: ZodOptional<ZodNumber>;
        dashboardChartWidthWithKpis: ZodOptional<ZodNumber>;
        chartFocusSidebarWidth: ZodOptional<ZodNumber>;
        chartFocusSidebarLeft: ZodOptional<ZodNumber>;
        chartFocusChartWidthWithSidebar: ZodOptional<ZodNumber>;
        chartFocusChartWidthFull: ZodOptional<ZodNumber>;
        bulletsBottomMargin: ZodOptional<ZodNumber>;
        bulletsHeightWithProse: ZodOptional<ZodNumber>;
        proseOffsetAfterBullets: ZodOptional<ZodNumber>;
    }, $strict>>>;
    effects: ZodOptional<ZodOptional<ZodObject<{
        titleGradientAngle: ZodOptional<ZodNumber>;
        kpiGradientAngle: ZodOptional<ZodNumber>;
        kpiGradientDarkenPercent: ZodOptional<ZodNumber>;
        kpiGradientLabelLightenPercent: ZodOptional<ZodNumber>;
        kpiGradientSublabelLightenPercent: ZodOptional<ZodNumber>;
        kpiShapeAdjustment: ZodOptional<ZodNumber>;
        outlineBorderWidth: ZodOptional<ZodNumber>;
        chartBarGapWidth: ZodOptional<ZodNumber>;
        chartDoughnutHoleSize: ZodOptional<ZodNumber>;
    }, $strict>>>;
}, $strict>;
type AgentThemePreset = output<typeof AgentThemePresetSchema>;
type AgentDesignTokens = output<typeof DesignTokensSchema>;
type AgentFontStrategy = output<typeof SAFE_FONT_FAMILY_SCHEMA>;
type AgentScale = output<typeof AGENT_SCALE_SCHEMA>;
type AgentDensity = output<typeof AGENT_DENSITY_SCHEMA>;
type AgentShape = output<typeof AGENT_SHAPE_SCHEMA>;
interface ResolvedAgentDesignTokens {
    controls: {
        scale: AgentScale;
        density: AgentDensity;
        shape: AgentShape;
    };
    colors: {
        accent: string;
        themeDark1: string;
        themeDark2: string;
        themeLight1: string;
        themeLight2: string;
        slideBackground: string;
        titleBackgroundStart: string;
        titleBackgroundEnd: string;
        titleText: string;
        titleSubtitleText: string;
        headingText: string;
        bodyText: string;
        mutedText: string;
        cardBackground: string;
        darkCardBackground: string;
        darkCardText: string;
        darkCardMutedText: string;
        cardBorder: string;
        chartPalette: string[];
    };
    typography: {
        fontStrategy: AgentFontStrategy;
        titleFontFamily: string;
        titleFontFallback: string[];
        bodyFontFamily: string;
        bodyFontFallback: string[];
        heroTitleSize: number;
        heroSubtitleSize: number;
        headerSize: number;
        subheaderSize: number;
        footerSize: number;
        sectionTitleSize: number;
        sectionSubtitleSize: number;
        statementBodySize: number;
        bulletListSize: number;
        bulletsProseSize: number;
        comparisonBodySize: number;
        kpiGradientLabelSize: number;
        kpiLabelSize: number;
        kpiValueSize: number;
        kpiSublabelSize: number;
        chartTitleSize: number;
        chartLegendSize: number;
        chartDataLabelSize: number;
        chartPieDataLabelSize: number;
    };
    layout: {
        accentBarHeight: number;
        paddingX: number;
        paddingTop: number;
        paddingBottom: number;
        headerTop: number;
        subheaderTop: number;
        footerBottom: number;
        headerLeft: number;
        contentWidth: number;
        titlePaddingX: number;
        titlePaddingTop: number;
        titlePaddingBottom: number;
        contentPaddingX: number;
        contentPaddingTop: number;
        contentPaddingBottom: number;
        titleDividerWidth: number;
        titleDividerHeight: number;
        titleDividerMarginTop: number;
        titleDividerMarginBottom: number;
        sectionDividerWidth: number;
        sectionDividerHeight: number;
        sectionDividerMarginTop: number;
        sectionDividerMarginBottom: number;
        statementParagraphGap: number;
        bodyTopWithSubtitle: number;
        bodyTopWithoutSubtitle: number;
        bodyHeight: number;
        chartHeight: number;
        dashboardGap: number;
        comparisonGap: number;
        comparisonColumnWidth: number;
        comparisonColumnGap: number;
        kpiCardHeight: number;
        kpiCardPadding: number;
        dashboardKpiPanelWidthWithChart: number;
        dashboardPanelWidthFull: number;
        dashboardChartWidthWithKpis: number;
        chartFocusSidebarWidth: number;
        chartFocusSidebarLeft: number;
        chartFocusChartWidthWithSidebar: number;
        chartFocusChartWidthFull: number;
        bulletsBottomMargin: number;
        bulletsHeightWithProse: number;
        proseOffsetAfterBullets: number;
    };
    effects: {
        titleGradientAngle: number;
        kpiGradientAngle: number;
        kpiGradientDarkenPercent: number;
        kpiGradientLabelLightenPercent: number;
        kpiGradientSublabelLightenPercent: number;
        cardDropShadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blurRadius: number;
            opacity?: number;
        };
        kpiShapeAdjustment: number;
        outlineBorderWidth: number;
        chartBarGapWidth: number;
        chartDoughnutHoleSize: number;
    };
    semantic: {
        pagePaddingX: number;
        pagePaddingTop: number;
        pagePaddingBottom: number;
        titlePaddingX: number;
        titlePaddingTop: number;
        titlePaddingBottom: number;
        contentLeft: number;
        contentWidth: number;
        contentRight: number;
        contentPaddingTop: number;
        contentPaddingBottom: number;
        bodyTopWithSubtitle: number;
        bodyTopWithoutSubtitle: number;
        dashboardChartLeftWithKpis: number;
        chartFocusSidebarLeft: number;
        cardShapeType: "rect" | "roundRect";
        cardShapeAdjustment?: number;
    };
}
declare const DEFAULT_AGENT_DESIGN_TOKENS: ResolvedAgentDesignTokens;
declare function getAgentThemePresetTokens(preset?: AgentThemePreset): ResolvedAgentDesignTokens;
declare function resolveAgentDesignTokens(options?: {
    theme?: AgentThemePreset;
    accentColor?: string;
    fontFamily?: string;
    designTokens?: AgentDesignTokens;
}): ResolvedAgentDesignTokens;

type FontFace = "Regular" | "Bold" | "Italic" | "BoldItalic";
type FontDiagnosticCode = "FONT_SYSTEM_OPT_IN" | "FONT_EMBEDDING_UNAVAILABLE" | "FONT_REQUESTED_FAMILY_NOT_EMBEDDED" | "FONT_MISSING_FACE_VARIANT" | "FONT_COVERAGE_FALLBACK_USED";
interface FontDiagnostic {
    code: FontDiagnosticCode;
    message: string;
}
interface ResolvedFontIdentity {
    requestedFamily: string;
    family: string;
    face: FontFace;
    source: "registry" | "user" | "system";
    path?: string;
    sha256?: string;
    byteLength?: number;
    fsType?: number;
    coverage?: Record<string, number>;
    diagnostics?: FontDiagnostic[];
    pixelGateEligible: boolean;
}

declare const PLACEHOLDER_TYPES: readonly ["title", "body", "ctrTitle", "subTitle", "pic", "obj", "chart", "tbl", "dgm", "media", "clipArt", "dt", "ftr", "hdr", "sldNum", "sldImg"];
declare const BASIC_SHAPES: readonly ["rect", "ellipse", "roundRect", "triangle", "rtTriangle", "rightTriangle", "diamond", "parallelogram", "trapezoid", "nonIsoscelesTrapezoid", "heart", "plus", "cross", "chevron", "homePlate", "donut", "cloud", "hexagon", "pentagon", "octagon", "decagon", "heptagon", "dodecagon", "snip1Rect", "snip2SameRect", "snip2DiagRect", "snip2SameRect2", "snipRoundRect", "snipRound2SameRect", "round1Rect", "round2SameRect", "round2DiagRect", "round1Rect2", "bevel", "noSmoking", "blockArc", "pie", "pieWedge", "arc", "chord", "corner", "diagStripe", "halfFrame", "frame", "foldedCorner", "can", "cube", "teardrop", "gear6", "gear9", "plaque", "smileyFace", "irregularSeal1", "irregularSeal2", "ribbon", "ribbon2", "leftRightRibbon", "lightningBolt", "moon", "sun", "funnel", "wave", "doubleWave", "ellipseRibbon", "ellipseRibbon2", "verticalScroll", "horizontalScroll", "line", "lineInv", "heptagram", "decaStar"];
declare const ARROW_SHAPES: readonly ["rightArrow", "leftArrow", "upArrow", "downArrow", "leftRightArrow", "upDownArrow", "bentArrow", "uturnArrow", "bentUpArrow", "curvedRightArrow", "curvedLeftArrow", "curvedUpArrow", "curvedDownArrow", "stripedRightArrow", "notchedRightArrow", "circularArrow", "leftCircularArrow", "swooshArrow", "leftRightUpArrow", "quadArrow", "leftUpArrow"];
declare const ARROW_CALLOUT_SHAPES: readonly ["quadArrowCallout", "leftRightArrowCallout", "upDownArrowCallout", "leftArrowCallout", "rightArrowCallout", "upArrowCallout", "downArrowCallout"];
declare const FLOWCHART_SHAPES: readonly ["flowChartProcess", "flowChartDecision", "flowChartDocument", "flowChartTerminator", "flowChartConnector", "flowChartMerge", "flowChartSort", "flowChartExtract", "flowChartPreparation", "flowChartManualInput", "flowChartManualOperation", "flowChartPredefinedProcess", "flowChartInternalStorage", "flowChartMultidocument", "flowChartOffpageConnector", "flowChartPunchedTape", "flowChartSummingJunction", "flowChartOr", "flowChartDelay", "flowChartAlternateProcess", "flowChartMagneticDisk", "flowChartMagneticDrum", "flowChartMagneticTape", "flowChartDisplay", "flowChartOnlineStorage", "flowChartCollate", "flowChartInputOutput", "flowChartOfflineStorage"];
declare const ACTION_BUTTON_SHAPES: readonly ["actionButtonBlank", "actionButtonHome", "actionButtonHelp", "actionButtonInformation", "actionButtonBackPrevious", "actionButtonForwardNext", "actionButtonBeginning", "actionButtonEnd", "actionButtonReturn", "actionButtonSound", "actionButtonMovie"];
declare const CALLOUT_SHAPES: readonly ["wedgeRoundRectCallout", "wedgeRectCallout", "wedgeEllipseCallout", "wedgeRoundRectCallout2", "cloudCallout", "borderCallout1", "borderCallout2", "borderCallout3", "callout1", "callout2", "callout3", "accentCallout1", "accentCallout2", "accentCallout3", "accentBorderCallout1", "accentBorderCallout2", "accentBorderCallout3"];
declare const MATH_SHAPES: readonly ["mathPlus", "mathMinus", "mathMultiply", "mathDivide", "mathEqual", "mathNotEqual", "mathNotEqual2"];
declare const STAR_SHAPES: readonly ["star4", "star5", "star6", "star7", "star8", "star10", "star12", "star16", "star24", "star32"];
declare const BRACKET_BRACE_SHAPES: readonly ["leftBrace", "rightBrace", "leftBracket", "rightBracket", "bracePair", "bracketPair"];
declare const TAB_SHAPES: readonly ["plaqueTabs", "squareTabs", "roundTab"];
declare const CONNECTOR_SHAPES: readonly ["curvedConnector2", "curvedConnector3", "curvedConnector4", "curvedConnector5", "straightConnector1", "bentConnector2", "bentConnector3", "bentConnector4", "bentConnector5"];
declare const PATTERN_TYPES: readonly ["ltDnDiag", "ltUpDiag", "dkDnDiag", "dkUpDiag", "ltHorz", "ltVert", "dkHorz", "dkVert", "cross", "dnDiag", "upDiag", "diagCross", "smCheck", "lgCheck", "pct25", "pct50"];
declare const CHART_TYPES: readonly ["bar", "line", "pie", "scatter", "bubble", "area", "doughnut", "radar", "waterfall", "stock", "funnel", "treemap", "sunburst", "histogram", "boxWhisker"];
declare const CONNECTOR_TYPES: readonly ["straight", "elbow", "curved"];
declare const ARROW_HEAD_TYPES: readonly ["none", "triangle", "stealth", "diamond", "oval", "arrow"];
declare const ARROW_HEAD_SIZES: readonly ["sm", "med", "lg"];

type Dimension = number | `${number}%`;
type BasicShape = (typeof BASIC_SHAPES)[number];
type ArrowShape = (typeof ARROW_SHAPES)[number];
type ArrowCalloutShape = (typeof ARROW_CALLOUT_SHAPES)[number];
type FlowchartShape = (typeof FLOWCHART_SHAPES)[number];
type ActionButtonShape = (typeof ACTION_BUTTON_SHAPES)[number];
type CalloutShape = (typeof CALLOUT_SHAPES)[number];
type MathShape = (typeof MATH_SHAPES)[number];
type StarShape = (typeof STAR_SHAPES)[number];
type BracketBraceShape = (typeof BRACKET_BRACE_SHAPES)[number];
type TabShape = (typeof TAB_SHAPES)[number];
type ConnectorShape = (typeof CONNECTOR_SHAPES)[number];
/** Full ECMA-376 §20.1.10.56 shape type union. */
type ShapeType = BasicShape | ArrowShape | ArrowCalloutShape | FlowchartShape | ActionButtonShape | CalloutShape | MathShape | StarShape | BracketBraceShape | TabShape | ConnectorShape;
/** OOXML placeholder types per ECMA-376 §19.7.9 (ST_PlaceholderType). */
type PlaceholderType = (typeof PLACEHOLDER_TYPES)[number];
interface PlaceholderRef {
    type?: PlaceholderType;
    idx?: number;
}
interface ColorModifier {
    scheme: string;
    tint?: number;
    shade?: number;
    lumMod?: number;
    lumOff?: number;
    satMod?: number;
    satOff?: number;
    hueMod?: number;
    hueOff?: number;
    comp?: boolean;
    inv?: boolean;
    gray?: boolean;
}
type ColorValue = string | ColorModifier;
interface GradientStop {
    color: ColorValue;
    position: number;
    alpha?: number;
}
interface GradientFill {
    type: "linear" | "gradient" | "radial";
    angle?: number;
    stops: GradientStop[];
}
interface SolidFill {
    type: "solid";
    color: ColorValue;
}
type PatternType = (typeof PATTERN_TYPES)[number];
interface PatternFill {
    type: "pattern";
    pattern: PatternType;
    foreground: ColorValue;
    background: ColorValue;
}
interface ImageFill {
    type: "image";
    src: string;
    tile?: boolean;
    stretch?: boolean;
}
type Fill = SolidFill | GradientFill | PatternFill | ImageFill;
interface DropShadow {
    color: ColorValue;
    offsetX: number;
    offsetY: number;
    blurRadius: number;
    opacity?: number;
}
interface Glow {
    color: ColorValue;
    radius: number;
    opacity?: number;
}
interface Reflection {
    blurRadius?: number;
    startOpacity?: number;
    endOpacity?: number;
    distance?: number;
    direction?: number;
    size?: number;
}
interface SoftEdge {
    radius: number;
}
interface InnerShadow {
    color: ColorValue;
    offsetX: number;
    offsetY: number;
    blurRadius: number;
    opacity?: number;
}
type CameraPreset = "orthographicFront" | "isometricTopUp" | "isometricTopDown" | "isometricBottomUp" | "isometricBottomDown" | "isometricLeftUp" | "isometricLeftDown" | "isometricRightUp" | "isometricRightDown" | "isometricOffAxis1Left" | "isometricOffAxis1Right" | "isometricOffAxis1Top" | "isometricOffAxis2Left" | "isometricOffAxis2Right" | "isometricOffAxis2Top" | "isometricOffAxis3Left" | "isometricOffAxis3Bottom" | "isometricOffAxis4Left" | "isometricOffAxis4Bottom" | "obliqueTopLeft" | "obliqueTop" | "obliqueTopRight" | "obliqueLeft" | "obliqueRight" | "obliqueBottomLeft" | "obliqueBottom" | "obliqueBottomRight" | "perspectiveFront" | "perspectiveLeft" | "perspectiveRight" | "perspectiveAbove" | "perspectiveBelow" | "perspectiveAboveLeftFacing" | "perspectiveAboveRightFacing" | "perspectiveContrastingLeftFacing" | "perspectiveContrastingRightFacing" | "perspectiveHeroicLeftFacing" | "perspectiveHeroicRightFacing" | "perspectiveHeroicExtremeLeftFacing" | "perspectiveHeroicExtremeRightFacing" | "perspectiveRelaxed" | "perspectiveRelaxedModerately";
type LightRigType = "balanced" | "brightRoom" | "chilly" | "contrasting" | "flat" | "flood" | "freezing" | "glow" | "harsh" | "legacyFlat1" | "legacyFlat2" | "legacyFlat3" | "legacyFlat4" | "legacyHarsh1" | "legacyHarsh2" | "legacyHarsh3" | "legacyHarsh4" | "legacyNormal1" | "legacyNormal2" | "legacyNormal3" | "legacyNormal4" | "morning" | "soft" | "sunrise" | "sunset" | "threePt" | "twoPt";
type LightRigDirection = "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br";
type BevelPreset = "angle" | "artDeco" | "circle" | "convex" | "coolSlant" | "cross" | "divot" | "hardEdge" | "relaxedInset" | "riblet" | "slope" | "softRound";
type MaterialPreset = "clear" | "dkEdge" | "flat" | "legacyMatte" | "legacyMetal" | "legacyPlastic" | "legacyWireframe" | "matte" | "metal" | "plastic" | "powder" | "softEdge" | "softmetal" | "translucentPowder" | "warmMatte";
interface Scene3D {
    camera: {
        preset: CameraPreset;
        fov?: number;
    };
    lightRig: {
        type: LightRigType;
        direction: LightRigDirection;
    };
}
interface BevelConfig {
    width?: number;
    height?: number;
    preset: BevelPreset;
}
interface Sp3D {
    material?: MaterialPreset;
    bevelTop?: BevelConfig;
    bevelBottom?: BevelConfig;
    extrudeHeight?: number;
    extrudeColor?: ColorValue;
    contourWidth?: number;
    contourColor?: ColorValue;
}
interface ImageEffects {
    brightness?: number;
    contrast?: number;
    grayscale?: boolean;
    biLevel?: number;
    duotone?: {
        color1: ColorValue;
        color2: ColorValue;
    };
    blur?: number;
}
interface Effects {
    dropShadow?: DropShadow;
    innerShadow?: InnerShadow;
    glow?: Glow;
    reflection?: Reflection;
    softEdge?: SoftEdge;
    scene3d?: Scene3D;
    sp3d?: Sp3D;
}
interface FlexStyle {
    flexDirection?: "row" | "column";
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around";
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
    width?: Dimension;
    height?: Dimension;
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
    position?: "relative" | "absolute";
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    zIndex?: number;
    backgroundColor?: ColorValue;
    flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: Dimension;
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    minWidth?: Dimension;
    maxWidth?: Dimension;
    minHeight?: Dimension;
    maxHeight?: Dimension;
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch";
    aspectRatio?: number;
    display?: "flex" | "none";
    fill?: Fill;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: ColorValue;
    borderStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    borderCap?: "flat" | "round" | "square";
    borderCompound?: "single" | "double" | "thickThin" | "thinThick" | "triple";
    effects?: Effects;
    rotation?: number;
    opacity?: number;
    flipH?: boolean;
    flipV?: boolean;
}
interface TextInsets {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
}
type TextFitPolicy = "strict" | "fitHeight" | "fitFontSize" | "truncate" | "overflow";
interface TextFitConfig {
    policy: TextFitPolicy;
    minFontSize?: number;
    maxLines?: number;
    marker?: string;
}
type TextWarpPreset = "textNoShape" | "textPlain" | "textStop" | "textTriangle" | "textTriangleInverted" | "textChevron" | "textChevronInverted" | "textRingInside" | "textRingOutside" | "textArchUp" | "textArchDown" | "textCircle" | "textButton" | "textArchUpPour" | "textArchDownPour" | "textCirclePour" | "textButtonPour" | "textCurveUp" | "textCurveDown" | "textCanUp" | "textCanDown" | "textWave1" | "textWave2" | "textDoubleWave1" | "textWave4" | "textInflate" | "textDeflate" | "textInflateBottom" | "textDeflateBottom" | "textInflateTop" | "textDeflateTop" | "textDeflateInflate" | "textDeflateInflateDeflate" | "textFadeRight" | "textFadeLeft" | "textFadeUp" | "textFadeDown" | "textSlantUp" | "textSlantDown" | "textCascadeUp" | "textCascadeDown";
interface TextStyle extends FlexStyle {
    color?: ColorValue;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    textAlign?: "left" | "center" | "right" | "justify";
    /**
     * Line height as a multiple of font size (e.g. 1.4 for 1.4× spacing).
     * Values < 4 are treated as multipliers. Values ≥ 4 are treated as legacy
     * pixel/point absolutes and emit a deprecation warning at render time.
     */
    lineHeight?: number;
    fontFallback?: string[];
    textDecorationLine?: "none" | "underline" | "strikethrough" | "underline-strikethrough";
    textDecorationStyle?: "solid" | "double" | "dotted" | "dashed";
    verticalAlign?: "top" | "middle" | "bottom";
    textInsets?: TextInsets;
    textDirection?: "horizontal" | "vertical" | "verticalEA";
    rtl?: boolean;
    columns?: number;
    columnSpacing?: number;
    lang?: string;
    textWarp?: TextWarpPreset;
    textFit?: TextFitConfig;
    /** @internal Concrete font decision made before layout. */
    resolvedFont?: ResolvedFontIdentity;
}
interface TextRunStyle {
    color?: ColorValue;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    textDecorationLine?: "none" | "underline" | "strikethrough" | "underline-strikethrough";
    textDecorationStyle?: "solid" | "double" | "dotted" | "dashed";
    baseline?: "superscript" | "subscript";
    letterSpacing?: number;
    shadow?: DropShadow;
    outline?: {
        width: number;
        color: ColorValue;
    };
    textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
    gradientFill?: GradientFill;
    lang?: string;
    altLang?: string;
    highlight?: ColorValue;
    kerning?: number;
    /** @internal Concrete font decision made before shaping and serialization. */
    resolvedFont?: ResolvedFontIdentity;
}
/**
 * Hyperlink target. Specify exactly one of: url, mailto, slide, action.
 * If multiple are set, resolution priority is: action > slide > mailto > url.
 */
interface HyperlinkTarget {
    url?: string;
    mailto?: string;
    slide?: number;
    action?: "firstSlide" | "lastSlide" | "nextSlide" | "previousSlide" | "endShow";
    tooltip?: string;
}
interface TextRun {
    text: string;
    style?: TextRunStyle;
    hyperlink?: string | HyperlinkTarget;
}
interface BulletChar {
    type?: "char";
    char: string;
    color?: ColorValue;
    size?: number;
    fontFamily?: string;
}
interface BulletAutoNum {
    type: "autoNum";
    scheme: AutoNumScheme;
    startAt?: number;
}
type AutoNumScheme = "arabicPeriod" | "arabicParenR" | "romanUcPeriod" | "romanLcPeriod" | "alphaUcPeriod" | "alphaLcPeriod" | "alphaLcParenR" | "alphaUcParenR";
interface BulletNone {
    type: "none";
}
type BulletConfig = BulletChar | BulletAutoNum | BulletNone;
type TabAlignType = "l" | "ctr" | "r" | "dec";
interface TabStop {
    position: number;
    align?: TabAlignType;
}
interface Paragraph {
    runs: TextRun[];
    align?: "left" | "center" | "right" | "justify";
    /**
     * Line spacing. Values < 4 are treated as multipliers (CSS-style: 1.4 → 140%).
     * Values ≥ 4 are treated as legacy points (deprecated; emits a warning).
     * Set lineSpacingMode="percentage" to opt into explicit percentage values.
     */
    lineHeight?: number;
    lineSpacingMode?: "points" | "percentage";
    spaceBefore?: number;
    spaceAfter?: number;
    spaceBeforePercent?: number;
    spaceAfterPercent?: number;
    level?: number;
    indent?: number;
    marginLeft?: number;
    bullet?: BulletConfig;
    rtl?: boolean;
    tabStops?: TabStop[];
    hangingIndent?: number;
}
interface ShapeLocks {
    noGrp?: boolean;
    noSelect?: boolean;
    noRot?: boolean;
    noChangeAspect?: boolean;
    noMove?: boolean;
    noResize?: boolean;
    noEditPoints?: boolean;
    noAdjustHandles?: boolean;
    noChangeArrowheads?: boolean;
    noChangeShapeType?: boolean;
    noTextEdit?: boolean;
}
type PathCommand = {
    type: "moveTo";
    x: number;
    y: number;
} | {
    type: "lineTo";
    x: number;
    y: number;
} | {
    type: "cubicBezTo";
    cp1x: number;
    cp1y: number;
    cp2x: number;
    cp2y: number;
    x: number;
    y: number;
} | {
    type: "quadBezTo";
    cpx: number;
    cpy: number;
    x: number;
    y: number;
} | {
    type: "arcTo";
    wR: number;
    hR: number;
    stAng: number;
    swAng: number;
} | {
    type: "close";
};
interface CustomGeometryPath {
    commands: PathCommand[];
    width?: number;
    height?: number;
    fill?: "norm" | "none" | "lighten" | "darken";
}
interface CustomGeometry {
    paths: CustomGeometryPath[];
}
interface PaperView {
    type: "View";
    style?: FlexStyle;
    children?: PaperNode[];
    shapeType?: ShapeType;
    shapeAdjustments?: number[];
    shapeAdjustmentMap?: Record<string, number>;
    customGeometry?: CustomGeometry;
    placeholder?: PlaceholderRef;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    hyperlink?: string | HyperlinkTarget;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
    locks?: ShapeLocks;
    textContent?: string | TextRun[];
    textParagraphs?: Paragraph[];
    textStyle?: TextStyle;
}
interface PaperText {
    type: "Text";
    style?: TextStyle;
    content?: string | TextRun[];
    paragraphs?: Paragraph[];
    autoFit?: boolean;
    placeholder?: PlaceholderRef;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface ImageCrop {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
}
interface PaperImage {
    type: "Image";
    style?: FlexStyle;
    src: string;
    svgSrc?: string;
    crop?: ImageCrop;
    borderRadius?: number;
    placeholder?: PlaceholderRef;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    hyperlink?: string | HyperlinkTarget;
    decorative?: boolean;
    readingOrder?: number;
    locks?: ShapeLocks;
    imageEffects?: ImageEffects;
}
interface TableCellBorder {
    width?: number;
    color?: ColorValue;
}
interface TableCellBorders {
    top?: TableCellBorder;
    right?: TableCellBorder;
    bottom?: TableCellBorder;
    left?: TableCellBorder;
    diagonalDown?: TableCellBorder;
    diagonalUp?: TableCellBorder;
}
interface TableCellStyle {
    fill?: ColorValue | GradientFill;
    borders?: TableCellBorders;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    fontSize?: number;
    fontFamily?: string;
    fontFallback?: string[];
    color?: ColorValue;
    textAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    padding?: number;
    textDirection?: "horizontal" | "vertical" | "verticalEA";
    rtl?: boolean;
    lang?: string;
}
interface TableCell {
    text: string;
    style?: TableCellStyle;
    colSpan?: number;
    rowSpan?: number;
    vMerge?: boolean;
    hMerge?: boolean;
    content?: TextRun[];
    paragraphs?: Paragraph[];
}
interface TableRow {
    height?: number;
    minHeight?: number;
    cells: TableCell[];
}
interface TableStyle {
    bandRow?: boolean;
    bandCol?: boolean;
    firstRow?: boolean;
    lastRow?: boolean;
    firstCol?: boolean;
    lastCol?: boolean;
    headerRowStyle?: TableCellStyle;
    footerRowStyle?: TableCellStyle;
    firstColStyle?: TableCellStyle;
    lastColStyle?: TableCellStyle;
    bandRowEvenStyle?: TableCellStyle;
    bandRowOddStyle?: TableCellStyle;
    outerBorder?: TableCellBorder;
    innerBorderH?: TableCellBorder;
    innerBorderV?: TableCellBorder;
}
interface TableRowLayoutPolicy {
    /** Natural leaves short rows compact; fill distributes extra height. Default: fill. */
    mode?: "natural" | "fill";
    /** Table-wide minimum row height in pixels. Row-level minHeight still wins. */
    minRowHeight?: number;
    /** Allow overfull tables without a layout warning. Default: warn. */
    overflow?: "warn" | "allow";
}
interface TableData {
    columns: number[];
    rows: TableRow[];
    style?: TableStyle;
    autoFit?: boolean | "distribute";
    rowLayout?: TableRowLayoutPolicy;
}
interface PaperTable {
    type: "Table";
    style?: FlexStyle;
    tableData: TableData;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
}
type ChartType = (typeof CHART_TYPES)[number];
interface TreemapCategory {
    name: string;
    value?: number;
    children?: TreemapCategory[];
    color?: string;
}
interface TreemapData {
    categories: TreemapCategory[];
    dataLabels?: ChartDataLabels;
}
interface SunburstData {
    categories: TreemapCategory[];
    dataLabels?: ChartDataLabels;
}
interface HistogramData {
    values: number[];
    binCount?: number;
    binWidth?: number;
    overflow?: number;
    underflow?: number;
    seriesName?: string;
    color?: string;
    dataLabels?: ChartDataLabels;
}
interface BoxWhiskerData {
    categories: string[];
    series: Array<{
        name: string;
        values: number[];
        color?: string;
    }>;
    quartileMethod?: "inclusive" | "exclusive";
    showOutliers?: boolean;
    showMeanMarker?: boolean;
    showMeanLine?: boolean;
    showInnerPoints?: boolean;
    showConnectorLines?: boolean;
    dataLabels?: ChartDataLabels;
}
type BarGrouping = "clustered" | "stacked" | "percentStacked";
type LineGrouping = "standard" | "stacked" | "percentStacked";
type AreaGrouping = "standard" | "stacked" | "percentStacked";
interface XYDataPoint {
    x: number;
    y: number;
    size?: number;
}
interface XYSeries {
    name: string;
    dataPoints: XYDataPoint[];
    color?: string;
}
type MarkerSymbol = "circle" | "square" | "diamond" | "triangle" | "x" | "star" | "plus" | "dot" | "dash" | "none";
interface MarkerConfig {
    symbol: MarkerSymbol;
    size?: number;
    color?: string;
}
interface TrendlineConfig {
    type: "linear" | "exponential" | "logarithmic" | "polynomial" | "power" | "movingAvg";
    order?: number;
    period?: number;
    forward?: number;
    backward?: number;
    displayEquation?: boolean;
    displayRSquared?: boolean;
    color?: string;
}
interface ErrorBarsConfig {
    direction: "x" | "y" | "both";
    type: "fixedVal" | "percentage" | "stdDev" | "stdErr";
    value?: number;
}
interface ChartSeries {
    name: string;
    values: number[];
    color?: string;
    overrideType?: "bar" | "line" | "area";
    targetAxis?: "primary" | "secondary";
    pointColors?: string[];
    marker?: MarkerConfig;
    trendline?: TrendlineConfig;
    errorBars?: ErrorBarsConfig;
    dataLabels?: ChartDataLabels;
}
interface ChartGridlines {
    major?: boolean;
    minor?: boolean;
    color?: string;
}
interface ChartAxisConfig {
    title?: string;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    min?: number;
    max?: number;
    visible?: boolean;
    numberFormat?: string;
    gridlines?: ChartGridlines;
    tickMark?: {
        major?: "cross" | "in" | "out" | "none";
        minor?: "cross" | "in" | "out" | "none";
    };
    labelRotation?: number;
    labelFont?: {
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        bold?: boolean;
        italic?: boolean;
    };
    crossesAt?: number;
}
interface ChartDataLabels {
    showVal?: boolean;
    showCatName?: boolean;
    showSerName?: boolean;
    showPercent?: boolean;
    formatCode?: string;
    position?: "outEnd" | "inEnd" | "ctr" | "inBase" | "bestFit";
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
}
interface ChartAreaStyle {
    fill?: string;
    borderColor?: string;
    borderWidth?: number;
}
interface WaterfallData {
    categories: string[];
    values: number[];
    totalIndices?: number[];
    increaseColor?: string;
    decreaseColor?: string;
    totalColor?: string;
    connectorLines?: boolean;
}
interface StockData {
    categories: string[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    hiLowLines?: boolean;
    upDownBars?: boolean;
    upColor?: string;
    downColor?: string;
}
interface FunnelData {
    categories: string[];
    values: number[];
    colors?: string[];
}
interface ChartDataTable {
    showKeys?: boolean;
    showHorzBorder?: boolean;
    showVertBorder?: boolean;
    showOutline?: boolean;
    fontFamily?: string;
    fontSize?: number;
}
interface ChartData {
    chartType: ChartType;
    dataLabels?: ChartDataLabels;
    barGrouping?: BarGrouping;
    lineGrouping?: LineGrouping;
    areaGrouping?: AreaGrouping;
    barDirection?: "col" | "bar";
    smooth?: boolean;
    marker?: MarkerConfig;
    explosion?: number;
    categories?: string[];
    series?: ChartSeries[];
    xySeries?: XYSeries[];
    holeSize?: number;
    title?: {
        text?: string;
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        bold?: boolean;
    };
    categoryAxis?: ChartAxisConfig;
    valueAxis?: ChartAxisConfig;
    secondaryValueAxis?: ChartAxisConfig;
    secondaryCategoryAxis?: ChartAxisConfig;
    legend?: {
        position?: "bottom" | "top" | "left" | "right" | "none";
        fontFamily?: string;
        fontSize?: number;
        fontColor?: string;
        border?: {
            color?: string;
            width?: number;
        };
        fill?: string;
    };
    gapWidth?: number;
    overlap?: number;
    firstSliceAng?: number;
    plotArea?: ChartAreaStyle;
    chartArea?: ChartAreaStyle;
    dispBlanksAs?: "gap" | "zero" | "span";
    radarStyle?: "radar" | "filled";
    waterfallData?: WaterfallData;
    stockData?: StockData;
    funnelData?: FunnelData;
    dataTable?: ChartDataTable;
    treemapData?: TreemapData;
    sunburstData?: SunburstData;
    histogramData?: HistogramData;
    boxWhiskerData?: BoxWhiskerData;
    annotations?: ChartAnnotation[];
}
/**
 * Anchor for a category-bound chart annotation. `categoryIndex` may be
 * fractional (e.g. 0.5 = midpoint between cat 0 and cat 1). `seriesIndex`
 * defaults to 0. `anchor` selects which y-coord on the bar/point to use:
 *   - "barTop"  → top of the bar at (categoryIndex, seriesIndex)
 *   - "barBottom" → axis baseline (value-axis min, or 0)
 *   - "value" → uses the explicit `value` field instead of the data point
 */
interface ChartCategoryAnchor {
    categoryIndex: number;
    seriesIndex?: number;
    anchor?: "barTop" | "barBottom" | "value";
    value?: number;
}
/**
 * Free-floating text annotation (legacy form). Positioned in chart-area
 * percentages 0..100. Emitted via OOXML user shapes (cdr:userShapes).
 */
interface ChartTextAnnotation {
    kind?: "text";
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    bold?: boolean;
    italic?: boolean;
    fill?: string;
    borderColor?: string;
    borderWidth?: number;
    shapeType?: "rect" | "roundRect" | "ellipse" | "wedgeRectCallout";
}
/**
 * Trend arrow that anchors to category positions. The engine resolves
 * `from`/`to` to plot-area pixel coords during chart rendering, so the
 * arrow stays glued to the bars across resizes.
 */
interface ChartTrendArrowAnnotation {
    kind: "trendArrow";
    from: ChartCategoryAnchor;
    to: ChartCategoryAnchor;
    label?: string;
    /** Hex color for line + arrow head (and label, unless `labelColor` set). */
    color?: string;
    /** Line width in pixels. Default 1.5. */
    width?: number;
    /** Optional dash pattern. Default solid. */
    dashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    labelFontFamily?: string;
    labelFontSize?: number;
    labelColor?: string;
}
/**
 * Horizontal value line at a fixed value-axis coord. Spans the plot area
 * width. Engine resolves `value` to a plot-area pixel y-coord.
 */
interface ChartTargetLineAnnotation {
    kind: "targetLine";
    value: number;
    label?: string;
    color?: string;
    width?: number;
    dashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    labelFontFamily?: string;
    labelFontSize?: number;
    labelColor?: string;
}
type ChartAnnotation = ChartTextAnnotation | ChartTrendArrowAnnotation | ChartTargetLineAnnotation;
interface ChartAnimation {
    buildType: "bySeries" | "byCategory" | "byElement" | "allAtOnce";
    trigger?: AnimationTrigger;
    effect?: AnimationEffect;
    duration?: number;
}
interface PaperChart {
    type: "Chart";
    style?: FlexStyle;
    chartData: ChartData;
    chartAnimation?: ChartAnimation;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface PaperGroup {
    type: "Group";
    style?: FlexStyle;
    children: PaperNode[];
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
    locks?: ShapeLocks;
}
type ConnectorType = (typeof CONNECTOR_TYPES)[number];
interface ConnectorPoint {
    x: number;
    y: number;
}
type ArrowHeadType = (typeof ARROW_HEAD_TYPES)[number];
type ArrowHeadSize = (typeof ARROW_HEAD_SIZES)[number];
interface ArrowHeadConfig {
    type: ArrowHeadType;
    width?: ArrowHeadSize;
    length?: ArrowHeadSize;
}
interface ConnectorShapeRef {
    shapeId: number;
    site: number;
}
interface PaperConnector {
    type: "Connector";
    style?: FlexStyle;
    connectorType: ConnectorType;
    start: ConnectorPoint;
    end: ConnectorPoint;
    lineWidth?: number;
    lineColor?: ColorValue;
    lineDashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    arrowStart?: boolean | ArrowHeadConfig;
    arrowEnd?: boolean | ArrowHeadConfig;
    startShape?: ConnectorShapeRef;
    endShape?: ConnectorShapeRef;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
    locks?: ShapeLocks;
}
interface MediaPlaybackOptions {
    loop?: boolean;
    volume?: number;
    trimStart?: number;
    trimEnd?: number;
    autoPlay?: boolean;
    hideOnClick?: boolean;
}
interface PaperVideo {
    type: "Video";
    style?: FlexStyle;
    src: string;
    poster?: string;
    mimeType?: string;
    playback?: MediaPlaybackOptions;
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface PaperAudio {
    type: "Audio";
    style?: FlexStyle;
    src: string;
    mimeType?: string;
    playback?: MediaPlaybackOptions;
    playAcrossSlides?: boolean;
    icon?: "speaker" | "none";
    animations?: AnimationIntent[];
    animationGroups?: AnimationGroup[];
    morphId?: string;
    altText?: string;
    decorative?: boolean;
    readingOrder?: number;
}
interface HeaderFooter {
    slideNumber?: boolean;
    footer?: string;
    dateTime?: boolean;
}
type TransitionType = "fade" | "push" | "wipe" | "cover" | "zoom" | "morph" | "split" | "blinds" | "checker" | "dissolve" | "comb";
type TransitionDirection = "up" | "down" | "left" | "right";
interface SlideTransition {
    type: TransitionType;
    duration?: number;
    direction?: TransitionDirection;
    advanceOnClick?: boolean;
    advanceAfterTime?: number;
}
type AnimationType = "entrance" | "exit" | "emphasis";
type AnimationEffect = "fade" | "fly" | "zoom" | "spin" | "appear" | "bounce" | "float" | "grow" | "shrink" | "growShrink" | "pulse" | "teeter" | "wipe" | "split" | "dissolve" | "swivel" | "motionPath" | "colorReveal" | "colorChange" | "boldFlash" | "wave" | "flip";
type AnimationTrigger = "onClick" | "withPrevious" | "afterPrevious";
type AnimationDirection = "up" | "down" | "left" | "right";
type AnimationEasing = "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";
type MotionPathType = "line" | "arc" | "custom";
type AnimationBuildGrouping = "byParagraph" | "byFirstLevel" | "allAtOnce";
interface MotionPath {
    path: string;
    pathType?: MotionPathType;
    origin?: "layout" | "parent";
}
interface AnimationBuild {
    nested?: boolean;
    grouping?: AnimationBuildGrouping;
    dimAfter?: string;
}
interface AnimationIntent {
    type: AnimationType;
    effect: AnimationEffect;
    trigger: AnimationTrigger;
    duration?: number;
    delay?: number;
    direction?: AnimationDirection;
    easing?: AnimationEasing;
    motionPath?: MotionPath;
    autoReverse?: boolean;
    toColor?: string;
    scaleFactor?: number;
    rotationAngle?: number;
    repeat?: number | "indefinite";
    repeatCount?: number | "indefinite";
    build?: AnimationBuild;
    buildType?: AnimationBuildGrouping;
}
interface AnimationGroup {
    type: "parallel" | "sequence";
    animations: AnimationIntent[];
    trigger?: AnimationTrigger;
}
type PaperNode = PaperView | PaperText | PaperImage | PaperTable | PaperChart | PaperGroup | PaperConnector | PaperVideo | PaperAudio;
interface SolidBackground {
    type: "solid";
    color: ColorValue;
}
interface GradientBackground {
    type: "gradient";
    angle?: number;
    stops: GradientStop[];
}
interface PatternBackground {
    type: "pattern";
    pattern: PatternType;
    foreground: ColorValue;
    background: ColorValue;
}
interface ImageBackground {
    type: "image";
    src: string;
    tile?: boolean;
}
type SlideBackground = SolidBackground | GradientBackground | PatternBackground | ImageBackground;
interface SlideComment {
    author: string;
    text: string;
    date?: string;
    x?: number;
    y?: number;
}
interface PaperSlide {
    type: "Slide";
    /** @internal Identifies compiler-owned recipes for post-layout quality gates. */
    agentPattern?: "title" | "statement" | "dashboard" | "comparison" | "chart-focus" | "bullets";
    style?: FlexStyle;
    layoutName?: string;
    masterName?: string;
    transition?: SlideTransition;
    background?: SlideBackground;
    notes?: string | Paragraph[];
    headerFooter?: HeaderFooter;
    comments?: SlideComment[];
    children: PaperNode[];
}
interface SlideSize {
    width: number;
    height: number;
}
interface ThemeColorScheme {
    dk1?: string;
    lt1?: string;
    dk2?: string;
    lt2?: string;
    accent1?: string;
    accent2?: string;
    accent3?: string;
    accent4?: string;
    accent5?: string;
    accent6?: string;
    hlink?: string;
    folHlink?: string;
}
interface ThemeFontScheme {
    majorLatin?: string;
    minorLatin?: string;
    majorEa?: string;
    minorEa?: string;
}
interface ThemeConfig {
    name?: string;
    colorScheme?: ThemeColorScheme;
    fontScheme?: ThemeFontScheme;
}
interface SlideLayoutConfig {
    name: string;
    placeholders?: PlaceholderRef[];
}
interface SlideMasterConfig {
    name: string;
    layouts: SlideLayoutConfig[];
    background?: SlideBackground;
}
interface FontEmbedConfig {
    fontFamily: string;
    /**
     * URL or data URI of a font file. PPTX rendering currently rejects this
     * explicit embedding request until a validated EOT/MicroType Express
     * encoder is available; raw sfnt bytes are not written into PowerPoint.
     */
    src: string;
    bold?: boolean;
    italic?: boolean;
}
type FontStrategy = 
/** Uses admitted font bytes for measurement, but currently references the resolved name without embedding it in PPTX. */
"portable"
/** References fonts installed in the viewing environment and emits no font streams. */
 | "system"
/** Currently fails closed for PPTX until a validated EOT/MicroType Express encoder is available. */
 | "user-embedded"
/** @deprecated Use "portable". */
 | "named-with-fallback"
/** @deprecated Use "portable". */
 | "system-safe"
/** @deprecated Use "user-embedded". */
 | "embedded";
interface SlideSection {
    name: string;
    slideIndices: number[];
}
interface DocumentProtection {
    modifyPassword?: string;
    readOnly?: boolean;
}
interface CustomShow {
    name: string;
    slideIndices: number[];
}
interface CustomProperty {
    name: string;
    value: string | number | boolean | Date;
}
interface PrintSettings {
    colorMode?: "clr" | "gray" | "bw";
    frameSlides?: boolean;
    scaleToFitPaper?: boolean;
}
type AccessibilityLevel = "A" | "AA" | "AAA";
interface AccessibilityConfig {
    level: AccessibilityLevel;
    language?: string;
    title?: string;
    autoAltText?: boolean;
    enforceHeadingHierarchy?: boolean;
    enforceTableHeaders?: boolean;
}
interface PaperDocument {
    type: "Document";
    meta: {
        title?: string;
        author?: string;
        language?: string;
    };
    accessible?: boolean | AccessibilityConfig;
    template?: Buffer;
    slideSize?: SlideSize;
    notesSize?: SlideSize;
    theme?: ThemeConfig;
    /** Font portability policy. Defaults to portable, or user-embedded when legacy embeddedFonts are supplied. */
    fontStrategy?: FontStrategy;
    sections?: SlideSection[];
    masters?: SlideMasterConfig[];
    embeddedFonts?: FontEmbedConfig[];
    /** @internal Unique concrete faces used by resolved text runs. */
    resolvedFonts?: ResolvedFontIdentity[];
    /** @internal False when system fonts or unresolved coverage make pixel gating nondeterministic. */
    fontPixelGateEligible?: boolean;
    protection?: DocumentProtection;
    customShows?: CustomShow[];
    customProperties?: CustomProperty[];
    handoutLayout?: "1" | "2" | "3" | "4" | "6" | "9";
    printSettings?: PrintSettings;
    chartFallbackImages?: boolean;
    slides: PaperSlide[];
}

type SlideContent = AgentSlide["content"];
declare function agentChartToChartData(chart: NonNullable<SlideContent["chart"]>, accentColor: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens, surroundingTitles?: readonly (string | undefined)[]): ChartData;
declare function buildTitleLayout(content: SlideContent, accentColor: string, fontFamily?: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens, companyName?: string): PaperSlide;
declare function buildStatementLayout(content: SlideContent, accentColor: string, fontFamily?: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens): PaperSlide;
declare function buildDashboardLayout(content: SlideContent, accentColor: string, fontFamily?: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens): PaperSlide;
declare function buildComparisonLayout(content: SlideContent, accentColor: string, fontFamily?: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens): PaperSlide;
declare function buildChartFocusLayout(content: SlideContent, accentColor: string, fontFamily?: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens): PaperSlide;
declare function buildBulletsLayout(content: SlideContent, accentColor: string, fontFamily?: string, designTokens?: AgentDesignTokens | ResolvedAgentDesignTokens): PaperSlide;

type AgentLayoutWarningCode = "POTENTIAL_OVERFLOW" | "POTENTIAL_CLIP" | "POTENTIAL_UNBREAKABLE_STRING" | "POTENTIAL_TIGHT_WRAP" | "POTENTIAL_CONTAINER_CLIP" | "POTENTIAL_COLLISION" | "POTENTIAL_UNOWNED_COMPARISON";
type AgentLayoutValidationMode = "off" | "warn" | "error";
interface AgentLayoutWarning {
    code: AgentLayoutWarningCode;
    message: string;
    slideIndex: number;
    nodePath: string;
    relatedNodePath?: string;
}
declare function validateAgentDocumentLayout(document: PaperDocument): AgentLayoutWarning[];

interface RelaxedInputCoercion {
    code: string;
    path: string;
    description: string;
    legacyShape: string;
    modernShape: string;
}
interface PptxInputWarning {
    code: string;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}
interface CompileAgentDocumentOptions {
    onInputWarning?: (warning: PptxInputWarning) => void;
    onLayoutWarning?: (warning: AgentLayoutWarning) => void;
    layoutValidation?: AgentLayoutValidationMode;
    relaxed?: boolean;
}
declare const PPTX_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[];
declare function looksLikeAgentDocumentInput(input: unknown): boolean;
declare function preprocessAgentDocumentInput(input: unknown, options?: CompileAgentDocumentOptions): {
    value: unknown;
    warnings: PptxInputWarning[];
};

/**
 * Compiles a single AgentSlide into a PaperSlide using the appropriate
 * template factory based on the slide's pattern.
 */
declare function compileAgentSlide(slide: AgentSlide, accentColor: string, fontFamily?: string, designTokens?: ResolvedAgentDesignTokens, companyName?: string): PaperSlide;
/**
 * Validates and compiles an AgentDocument into a PaperDocument.
 *
 * - Validates input via AgentDocumentSchema.parse()
 * - Builds theme from accentColor
 * - Maps each slide via compileAgentSlide
 * - Returns a complete PaperDocument ready for PaperEngine.render()
 */
declare function compileAgentDocument(input: unknown, options?: CompileAgentDocumentOptions): PaperDocument;
/**
 * Compiles an AgentDocument the way `compileAgentDocument` does, but measures text against the
 * document's own fonts rather than whatever happens to be in the process font cache.
 *
 * `compileAgentDocument` is synchronous, so it cannot load a font. Font loading happens later,
 * inside `PaperEngine.render`. Every autofit decision the templates make — `titleHeight`, the
 * `maxLines` a `textFit` policy is given, the divider position derived from them — is therefore
 * measured before a single font exists, and `resolveBoldFamily` silently measures bold text with
 * the regular face when the bold face has not been loaded yet
 * (`typography/segmentCache.ts:212`). Bold faces are wider, so the estimate is short, the line
 * count is low, and the block is compiled smaller than the text it will hold.
 *
 * The consequence is worse than an inaccurate estimate: the cache is process-global, so the
 * *second* document rendered in a process measures against the *first* document's fonts. The same
 * input compiles to different bytes depending on what was rendered before it — a determinism
 * violation in an engine whose output is hash-bound (`docs/quality-policy.md`).
 *
 * Two passes fix it because the first pass exists only to discover which fonts the document
 * references; its layout is discarded. After `autoLoadDocumentFonts` the cache is guaranteed to
 * hold the document's own faces, so the second pass measures the same way no matter what ran
 * before it. Prefer this over `compileAgentDocument` wherever byte-for-byte reproducibility
 * matters.
 */
declare function compileAgentDocumentWithFonts(input: unknown, options?: CompileAgentDocumentOptions): Promise<PaperDocument>;

interface AutoFitResult {
    fontScale: number;
    lnSpcReduction: number;
    overflow: boolean;
    measuredHeight?: number;
    lineCount?: number;
}

type PptxCompatibilityMode = "native_safe" | "native_anchored" | "visual_fallback";
type PptxFallbackLevel = "native_editable" | "native_anchored" | "alternate_content" | "visual_fallback";
type TextCompositionMode = "shape_per_text" | "single_frame_card" | "rendered_visual";
type InternalAutoFitPolicy = "none" | "shrink_text" | "grow_shape" | "office_default" | "engine_conditional";
type CompatibilityIssueClass = "text_overflow_risk" | "font_substitution_risk" | "chart_layout_risk" | "template_placeholder_risk" | "relationship_risk" | "animation_risk";
interface CompatibilityIssue {
    code: string;
    message: string;
    severity: "info" | "warning" | "error";
    issueClass?: CompatibilityIssueClass;
    fallbackLevel?: PptxFallbackLevel;
    remediation?: string;
}
interface LayoutCompatibilityMeta {
    mode: PptxCompatibilityMode;
    reason?: string;
    issues?: CompatibilityIssue[];
    fallbackReason?: string;
    chartUtilization?: {
        widthRatio: number;
        heightRatio: number;
    };
    textCompositionMode?: TextCompositionMode;
    autoFitPolicy?: InternalAutoFitPolicy;
}
interface LayoutRuntimeProps {
    _autoFitResult?: AutoFitResult;
    _insideVisualView?: boolean;
    _omitTransform?: boolean;
    _singleLineShrinkWrappedWidth?: number;
    _compatibility?: LayoutCompatibilityMeta;
}

interface LayoutMetrics {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface LayoutNodeBase extends LayoutRuntimeProps {
    layout: LayoutMetrics;
    children?: LayoutNode[];
}
type LayoutNode = (Omit<PaperView, "children"> & LayoutNodeBase) | (Omit<PaperText, "children"> & LayoutNodeBase) | (PaperImage & LayoutNodeBase) | (PaperTable & LayoutNodeBase) | (PaperChart & LayoutNodeBase) | (Omit<PaperGroup, "children"> & LayoutNodeBase) | (PaperConnector & LayoutNodeBase) | (PaperVideo & LayoutNodeBase) | (PaperAudio & LayoutNodeBase) | (Omit<PaperSlide, "children"> & LayoutNodeBase);

declare function assertAgentCompilationSemantics(source: AgentDocument, compiled: PaperDocument): void;
declare function assertAgentRecipeLayoutUtilization(slide: LayoutNode, slideHeight: number): void;

interface SlideSplitOptions {
    maxDepth?: number;
    textWidth?: number;
    textHeight?: number;
}
/**
 * Pre-processor that splits overflowing slides in a PaperDocument.
 *
 * For each slide, finds the primary text body and checks if it overflows
 * using computeAutoFit. If overflow is detected, uses a greedy forward-scan
 * algorithm to pack content onto slides at full font size, preferring
 * paragraph boundaries and avoiding single-paragraph widow slides.
 *
 * Continuation slides get "(Cont.)" appended to their title.
 *
 * @param doc - The PaperDocument to process
 * @param options - Optional configuration for split behavior
 * @returns A new PaperDocument with overflow slides split
 */
declare function applyElasticPagination(doc: PaperDocument, options?: SlideSplitOptions): PaperDocument;

export { AgentDocumentSchema, AgentSlideSchema, AgentThemePresetSchema, ComparisonSchema, DEFAULT_AGENT_DESIGN_TOKENS, DataSeriesSchema, DesignTokensSchema, KpiSchema, PPTX_RELAXED_INPUT_COERCIONS, SlidePatternEnum, agentChartToChartData, applyElasticPagination, assertAgentCompilationSemantics, assertAgentRecipeLayoutUtilization, buildBulletsLayout, buildChartFocusLayout, buildComparisonLayout, buildDashboardLayout, buildStatementLayout, buildTitleLayout, compileAgentDocument, compileAgentDocumentWithFonts, compileAgentSlide, getAgentThemePresetTokens, looksLikeAgentDocumentInput, preprocessAgentDocumentInput, resolveAgentDesignTokens, validateAgentDocumentLayout };
export type { AgentDensity, AgentDesignTokens, AgentDocument, AgentFontStrategy, AgentLayoutValidationMode, AgentLayoutWarning, AgentLayoutWarningCode, AgentScale, AgentShape, AgentSlide, AgentThemePreset, Comparison, CompileAgentDocumentOptions, DataSeries, Kpi, PptxInputWarning, RelaxedInputCoercion as PptxRelaxedInputCoercion, ResolvedAgentDesignTokens, SlidePattern, SlideSplitOptions };
