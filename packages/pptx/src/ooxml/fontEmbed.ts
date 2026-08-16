// src/ooxml/fontEmbed.ts — PowerPoint font embedding capability guard
import type { PaperDocument } from "../types/ast.js";
import { PaperError } from "../errors.js";
import { getLogger } from "../logger.js";

const EMBEDDING_UNAVAILABLE_MESSAGE =
  "PowerPoint font embedding is unavailable because Runstamp does not have a validated EOT/MicroType Express encoder.";

/** Reject explicit embedding before font URLs are fetched or slides are processed. */
export function assertPowerPointFontEmbeddingAvailable(doc: PaperDocument): void {
  if (doc.fontStrategy !== "user-embedded" && (doc.embeddedFonts?.length ?? 0) === 0) return;
  throw new PaperError(EMBEDDING_UNAVAILABLE_MESSAGE, {
    code: "PPTX_FONT_EMBEDDING_UNAVAILABLE",
    phase: "font",
    path: ["embeddedFonts"],
    remediation: "Use fontStrategy=\"system\" until a validated PowerPoint EOT/MicroType Express encoder is configured.",
  });
}

/**
 * PowerPoint's application/x-fontdata parts contain EOT/MicroType Express
 * payloads. Raw sfnt bytes with OOXML GUID-XOR obfuscation are a Word font
 * mechanism and are not a valid PowerPoint embedded-font payload.
 *
 * Keep this writer fail-closed until a validated PowerPoint font encoder is
 * available. Explicit caller-supplied embedding requests reject; the implicit
 * portable registry path emits a valid, non-embedded PPTX and is marked
 * pixel-gate-ineligible during font resolution.
 */
export async function processDocumentFonts(
  doc: PaperDocument,
  _fontRIdStart?: number,
): Promise<{
  embeddedFontListXml: string | undefined;
  extraPresentationRels: Array<{ rId: string; type: string; target: string }>;
  fontDataFiles: Array<{ path: string; buffer: Buffer }>;
}> {
  assertPowerPointFontEmbeddingAvailable(doc);

  if (doc.fontStrategy === "system") {
    getLogger().warn(
      "[fontEmbed] FONT_SYSTEM_OPT_IN: explicit system strategy emits no font streams and is ineligible for deterministic pixel gating.",
    );
    return { embeddedFontListXml: undefined, extraPresentationRels: [], fontDataFiles: [] };
  }

  const hasPortableFontBytes = doc.resolvedFonts?.some(
    (font) => (font.source === "registry" || font.source === "user") && Boolean(font.sha256),
  ) ?? false;
  if (hasPortableFontBytes) {
    getLogger().warn(
      `[fontEmbed] FONT_EMBEDDING_UNAVAILABLE: ${EMBEDDING_UNAVAILABLE_MESSAGE} Portable font names will be referenced without embedding.`,
    );
  }
  return { embeddedFontListXml: undefined, extraPresentationRels: [], fontDataFiles: [] };
}
