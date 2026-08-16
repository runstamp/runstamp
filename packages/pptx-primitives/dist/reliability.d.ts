/**
 * Reliability contract surface.
 *
 * Primitives + compiler must always request strict layout validation from
 * the engine. This file exports the one option the compiler should pass
 * through on every `engine.render()` call.
 *
 * The engine already implements the three severity modes via
 * `EngineRenderOptions.layoutValidation` ("off" | "warn" | "error").
 * This module's job is to make "error" the non-negotiable default for any
 * render originating from the primitive compiler, and to expose the
 * warning type for callers that want to surface diagnostics before we
 * throw.
 */
/** The severity the compiler always requests. Explicit so nobody can grep
 *  for the string and be unsure whether it was deliberate. */
export declare const STRICT_LAYOUT_VALIDATION: "error";
export interface LayoutDiagnostic {
    /** Slide index (0-based). */
    slide: number;
    /** Validator code (POTENTIAL_COLLISION / POTENTIAL_CLIP / POTENTIAL_OVERFLOW). */
    code: string;
    /** Human-readable path into the slide tree. */
    path: string;
    /** Human-readable explanation. */
    message: string;
}
/**
 * Options payload the compiler passes into `engine.render(doc, opts)`.
 * Callers MUST spread this into their engine call; do not construct it by
 * hand, or we lose the contract.
 *
 *   const { render } = engine;
 *   const buffer = await render(doc, {
 *     ...primitiveCompilerEngineOptions(onDiagnostic),
 *     // caller-level additions here
 *   });
 */
export declare function primitiveCompilerEngineOptions(onDiagnostic?: (diagnostic: LayoutDiagnostic) => void): {
    layoutValidation: typeof STRICT_LAYOUT_VALIDATION;
    onLayoutWarning: (warning: {
        slide: number;
        code: string;
        path: string;
        message: string;
    }) => void;
};
//# sourceMappingURL=reliability.d.ts.map