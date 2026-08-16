/**
 * Deterministic mode for @runstamp/docx.
 *
 * The enabled/disabled flag now lives in `@runstamp/contract` (OC-1 Phase 2), so
 * this package, `@runstamp/pdf`, `@runstamp/xlsx` and
 * `@runstamp/pptx` all observe one flag instead of four independent
 * copies that could disagree.
 *
 * The public signatures here are unchanged, including the two-argument
 * `setDeterministicMode(enabled, seed)` and `resolveDeterministicSeed`. The seed
 * remains package-local because it is a DOCX-specific value.
 */

import {
  isDeterministicModeEnabled as contractIsDeterministicModeEnabled,
  setDeterministicMode as contractSetDeterministicMode,
} from '@runstamp/contract';

const DEFAULT_DETERMINISTIC_SEED = "runstamp-docx-native-phase1";

let deterministicSeed = DEFAULT_DETERMINISTIC_SEED;

export function setDeterministicMode(enabled = true, seed = DEFAULT_DETERMINISTIC_SEED): void {
  contractSetDeterministicMode(enabled);
  deterministicSeed = seed;
}

export function isDeterministicModeEnabled(): boolean {
  return contractIsDeterministicModeEnabled();
}

export function resolveDeterministicSeed(
  deterministic: boolean | undefined,
  seed: string | undefined,
): string | undefined {
  const enabled = deterministic ?? isDeterministicModeEnabled();
  if (enabled) {
    return seed ?? deterministicSeed;
  }
  return seed ?? `runstamp-docx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
