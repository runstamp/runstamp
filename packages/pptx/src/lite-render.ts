import {
  DeclarativeValidationError,
  type DeclarativeDocument,
} from "@runstamp/protocol";
import { compileDeclarativeDocument, validate } from "./protocol/declarative.js";
import { PaperEngine, type EngineRenderOptions } from "./engine.js";
import type { PaperDocument } from "./types/ast.js";

export type LiteRenderDocument = DeclarativeDocument | PaperDocument;

function isPaperDocument(document: LiteRenderDocument): document is PaperDocument {
  return "type" in document && document.type === "Document";
}

/**
 * Validate, compile, and render the canonical declarative contract, or render
 * an already-compiled PaperDocument. This is the high-level lite entrypoint.
 */
export async function render(
  document: LiteRenderDocument,
  options?: EngineRenderOptions,
): Promise<Buffer> {
  if (isPaperDocument(document)) {
    return PaperEngine.render(document, options);
  }

  const validation = validate(document);
  if (!validation.ok) {
    throw new DeclarativeValidationError(validation.issues);
  }

  return PaperEngine.render(compileDeclarativeDocument(document), options);
}
