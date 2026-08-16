// src/engine/layoutValidator.ts — engine-side pre-render layout validator.
//
// The Agent compiler already runs `validateAgentDocumentLayout` on every
// compiled PaperDocument. Direct PaperDocument inputs bypass that check;
// this wrapper re-uses the same validator at the engine entry so authors
// using PaperDocument directly get the same overflow/clip/collision
// warnings that Agent-mode users get.
//
// A WeakSet keyed by the document object prevents double-validation when
// a PaperDocument has already been produced and checked by the Agent
// compiler during the same render call.

import { PaperError } from "../errors.js";
import { getLogger } from "../logger.js";
import type { PaperDocument } from "../types/ast.js";
import {
  validateAgentDocumentLayout,
  type AgentLayoutValidationMode,
  type AgentLayoutWarning,
} from "../interpreter/layout-validator.js";

const VALIDATED_DOCUMENTS = new WeakSet<PaperDocument>();

export interface EngineLayoutValidationOptions {
  layoutValidation?: AgentLayoutValidationMode;
  onLayoutWarning?: (warning: AgentLayoutWarning) => void;
}

/**
 * Mark a PaperDocument as already layout-validated so
 * `runEngineLayoutValidation` skips it on a subsequent call. The Agent
 * compiler calls this after running its own validation pass.
 */
export function markLayoutValidated(doc: PaperDocument): void {
  VALIDATED_DOCUMENTS.add(doc);
}

/**
 * Run the pre-render layout validator against a PaperDocument. No-op
 * when `layoutValidation === "off"` or the document has already been
 * marked validated. In "warn" mode (the default), warnings are logged.
 * In "error" mode, the first batch of warnings throws
 * `AGENT_LAYOUT_VALIDATION_FAILED`.
 */
export function runEngineLayoutValidation(
  doc: PaperDocument,
  options?: EngineLayoutValidationOptions,
): AgentLayoutWarning[] {
  const mode = options?.layoutValidation ?? "warn";
  if (mode === "off") return [];
  if (VALIDATED_DOCUMENTS.has(doc)) return [];

  const warnings = validateAgentDocumentLayout(doc);
  warnings.forEach((warning) => options?.onLayoutWarning?.(warning));

  if (mode === "warn") {
    warnings.forEach((warning) => {
      getLogger().warn(
        `[layout] ${warning.code} on slide ${warning.slideIndex + 1} at ${warning.nodePath}: ${warning.message}`,
      );
    });
    VALIDATED_DOCUMENTS.add(doc);
    return warnings;
  }

  // "error" mode
  if (warnings.length > 0) {
    const first = warnings[0];
    const summary = warnings
      .map((w) => `${w.code} slide ${w.slideIndex + 1} at ${w.nodePath}`)
      .join("; ");
    throw new PaperError(
      `Pre-render layout validation failed: ${summary}`,
      {
        code: "AGENT_LAYOUT_VALIDATION_FAILED",
        phase: "layout",
        slideIndex: first.slideIndex,
        path: first.nodePath.split(".").filter((p) => p.length > 0),
        remediation:
          "Reduce text length, increase container height/width, or loosen absolute overlaps. Pass `layoutValidation: \"warn\"` to downgrade this to a logged warning.",
      },
    );
  }
  VALIDATED_DOCUMENTS.add(doc);
  return warnings;
}
