import type { TokenBundle } from "./schema.js";
export type TokenLintSeverity = "error" | "warning";
export interface TokenLintIssue {
    code: "TOKEN_SCHEMA_INVALID" | "TOKEN_FONT_UNPINNED" | "TOKEN_CONTRAST_LOW" | "TOKEN_SPACING_SCALE_INCONSISTENT" | "TOKEN_TYPE_SCALE_INCONSISTENT" | "TOKEN_LINE_HEIGHT_TIGHT";
    severity: TokenLintSeverity;
    path: string;
    message: string;
}
export interface TokenLintReport {
    status: "pass" | "fail";
    issues: TokenLintIssue[];
    errors: TokenLintIssue[];
    warnings: TokenLintIssue[];
}
export interface TokenLintOptions {
    /**
     * Treat advisory findings as blocking. Useful for release gates; proof
     * scripts usually keep this false so intentionally unusual bundles still
     * render while surfacing their tradeoffs in QA.
     */
    warningsAsErrors?: boolean;
}
export declare function lintTokenBundle(input: TokenBundle | unknown, options?: TokenLintOptions): TokenLintReport;
//# sourceMappingURL=lint.d.ts.map