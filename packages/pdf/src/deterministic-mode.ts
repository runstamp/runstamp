/**
 * Deterministic mode for @runstamp/pdf.
 *
 * The enabled/disabled flag now lives in `@runstamp/contract` (OC-1 Phase 2), so
 * every Runstamp engine observes one flag instead of four independent copies that
 * could disagree. Public signatures are unchanged.
 */

import {
  isDeterministicModeEnabled as contractIsDeterministicModeEnabled,
  setDeterministicMode as contractSetDeterministicMode,
} from "@runstamp/contract";

/**
 * Frozen at the Runstamp rename. This seed feeds the deterministic PDF file
 * identifier, not any label a reader sees. Changing it changes the /ID of every
 * PDF this engine produces, which moves the byte-determinism oracle and breaks
 * signature validation that binds /ID. Renaming buys nothing. Do not rename.
 */
const DETERMINISTIC_PDF_SEED = "paperjsx-json-to-pdf-test";

export function setDeterministicMode(enabled = true): void {
  contractSetDeterministicMode(enabled);
}

export function isDeterministicModeEnabled(): boolean {
  return contractIsDeterministicModeEnabled();
}

export function deterministicPdfFileIdSeed(): string {
  return DETERMINISTIC_PDF_SEED;
}
