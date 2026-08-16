// src/deterministicMode.ts — Module-level flag for deterministic ZIP output

// ---------------------------------------------------------------------------
// Class-based state (supports multiple independent instances)
// ---------------------------------------------------------------------------

export class DeterministicModeManager {
  private _deterministic: boolean;

  constructor(initialDeterministic = true) {
    this._deterministic = initialDeterministic;
  }

  setDeterministicMode(enabled: boolean): void {
    this._deterministic = enabled;
  }

  isDeterministicMode(): boolean {
    return this._deterministic;
  }
}

// ---------------------------------------------------------------------------
// Default instance + backward-compatible module-level exports
// ---------------------------------------------------------------------------

import { getActiveContext } from "./contextStorage.js";

/**
 * The default manager is shared across module instances via the global symbol
 * registry rather than being module-local.
 *
 * The lite bundle code-splits: `index.js` lazy-loads `engine/archiveAssembler.js`
 * (which owns the zipper) as a separate ES module with its own inlined copy of
 * this module. A module-local `defaultManager` therefore gave the caller's
 * `setDeterministicMode(true)` and the zipper's `isDeterministicMode()` two
 * different instances, so the zipper always read `false` and stamped entries
 * with the wall clock. Keying off `globalThis` makes every duplicated copy
 * agree, regardless of how the bundler splits chunks.
 *
 * The key string is frozen at the Runstamp rename, and `@runstamp/contract`
 * shares it verbatim. It is a cross-realm registry key, not a brand string:
 * renaming it here without renaming it there — or renaming it at all while a
 * legacy `@runstamp/*` release can still appear alongside a current
 * `@runstamp/*` one in a consumer's tree — gives the caller and the zipper two
 * managers again, which is the bug above. Do not rename.
 */
const DEFAULT_MANAGER_KEY = Symbol.for("paperjsx.deterministicMode.defaultManager");

function getDefaultManager(): DeterministicModeManager {
  const scope = globalThis as Record<symbol, unknown>;
  const existing = scope[DEFAULT_MANAGER_KEY] as DeterministicModeManager | undefined;
  if (existing) return existing;
  const created = new DeterministicModeManager();
  scope[DEFAULT_MANAGER_KEY] = created;
  return created;
}

export function setDeterministicMode(enabled: boolean): void {
  const ctx = getActiveContext();
  const mgr = ctx?.deterministicMode as DeterministicModeManager | undefined;
  (mgr ?? getDefaultManager()).setDeterministicMode(enabled);
}

export function isDeterministicMode(): boolean {
  const ctx = getActiveContext();
  const mgr = ctx?.deterministicMode as DeterministicModeManager | undefined;
  return mgr ? mgr.isDeterministicMode() : getDefaultManager().isDeterministicMode();
}

export function createInheritedDeterministicModeManager(): DeterministicModeManager {
  return new DeterministicModeManager(isDeterministicMode());
}

/** ZIP format minimum date — 00:00:02Z avoids edge-case bugs in some ZIP libraries
 * that treat exactly midnight as an invalid DOS timestamp. */
export const DETERMINISTIC_DATE = new Date("1980-01-01T00:00:02Z");
