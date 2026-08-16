/**
 * Deterministic mode for @runstamp/xlsx.
 *
 * The enabled/disabled flag now lives in `@runstamp/contract` (OC-1 Phase 2), so
 * every Runstamp engine observes one flag instead of four independent copies that
 * could disagree. Public signatures are unchanged.
 */

import {
  isDeterministicModeEnabled as contractIsDeterministicModeEnabled,
  setDeterministicMode as contractSetDeterministicMode,
} from "@runstamp/contract";

export function setDeterministicMode(enabled = true): void {
  contractSetDeterministicMode(enabled);
}

export function isDeterministicModeEnabled(): boolean {
  return contractIsDeterministicModeEnabled();
}
