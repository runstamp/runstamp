type PaperjsxCliFormat = "pdf" | "docx" | "xlsx" | "pptx";
interface PaperjsxCliOptions {
    format: PaperjsxCliFormat;
    inputPath: string;
    outputPath: string;
    validate: boolean;
    strict: boolean;
}
interface PaperjsxCliIssue {
    severity: "error" | "warning";
    code: string;
    message: string;
    path?: string;
    suggestion?: string;
}
interface PaperjsxCliValidationResult {
    ok: boolean;
    issues: PaperjsxCliIssue[];
}
interface PaperjsxCliRunOptions {
    cwd?: string;
    stdin?: NodeJS.ReadableStream;
    stdout?: NodeJS.WritableStream;
    stderr?: NodeJS.WritableStream;
}
declare class PaperjsxCliError extends Error {
    readonly exitCode: number;
    constructor(message: string, exitCode?: number);
}
declare const USAGE: string;
declare function parseArgs(argv: string[]): PaperjsxCliOptions;
declare function validateSpec(format: PaperjsxCliFormat, spec: unknown): Promise<PaperjsxCliValidationResult>;
declare function renderSpec(format: PaperjsxCliFormat, spec: unknown, strict: boolean): Promise<Buffer>;
declare function runCli(argv: string[], options?: PaperjsxCliRunOptions): Promise<number>;

export { PaperjsxCliError, type PaperjsxCliFormat, type PaperjsxCliIssue, type PaperjsxCliOptions, type PaperjsxCliRunOptions, type PaperjsxCliValidationResult, USAGE, parseArgs, renderSpec, runCli, validateSpec };
