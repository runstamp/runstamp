/**
 * Structural → engine-AST translation.
 *
 * Primitives emit PrimitiveNode (our internal structural shape). The engine
 * consumes a richer PaperNode tree. This module is the single translation
 * seam; keeping it here means primitives never import from @runstamp/core,
 * and the engine AST can evolve without rippling into every primitive.
 *
 * We emit untyped objects shaped to match the current PaperDocument AST.
 * Typing against `@runstamp/pptx`'s PaperNode is deliberately
 * deferred — tsc in this package would need a workspace path alias and the
 * engine build present, which we want to keep optional at this stage.
 */
import type { PrimitiveNode } from "../layout/index.js";
type EnginePaperNode = any;
export declare function toPaperNodes(nodes: PrimitiveNode[]): EnginePaperNode[];
export declare function toPaperNode(node: PrimitiveNode): EnginePaperNode;
export {};
//# sourceMappingURL=toPaperNodes.d.ts.map