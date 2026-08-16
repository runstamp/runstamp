/**
 * Layout types used across primitives.
 *
 * We intentionally avoid importing PaperNode types from @runstamp/pptx
 * at this layer — primitives emit a *structural* node description that the
 * adapter layer translates to the engine's AST. This keeps primitives
 * testable without a full engine dep graph, and keeps the engine free to
 * evolve its AST without breaking the primitive contract.
 *
 * For now, the structural description is nominally identical to a subset
 * of PaperNode; see src/ast/toPaperNodes.ts for the translation.
 */
export {};
//# sourceMappingURL=types.js.map