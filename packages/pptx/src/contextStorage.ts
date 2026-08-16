// src/contextStorage.ts — AsyncLocalStorage for per-request isolation
//
// This module is intentionally dependency-free (only node:async_hooks) to avoid
// circular imports with manager modules that read from the context.

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Loose context bag stored in AsyncLocalStorage.
 * Property names match RenderContext fields; values are typed as `unknown`
 * to avoid importing concrete manager classes here.
 */
export interface ContextBag {
  licenseKey?: unknown;
  logger?: unknown;
  deterministicMode?: unknown;
  fontCache?: unknown;
  harfBuzz?: unknown;
  knuthPlass?: unknown;
  fontBridge?: unknown;
  engineMode?: unknown;
}

/**
 * Shared across module instances via the global symbol registry.
 *
 * The lite bundle lazy-loads `engine/archiveAssembler.js` as a separate ES
 * module carrying its own inlined copy of this file. A module-local store meant
 * a context entered by `withContext` in one copy was invisible to the other, so
 * managers read from the wrong instance. Keying off `globalThis` keeps a single
 * store no matter how the bundler splits chunks.
 *
 * The key string is frozen at the Runstamp rename. It is a cross-realm registry
 * key, not a brand string: while a legacy `@runstamp/*` release and a current
 * `@runstamp/*` one can coexist in a consumer's dependency tree, renaming it
 * gives them two separate stores and reintroduces exactly the bug above.
 * Do not rename.
 */
const STORAGE_KEY = Symbol.for("paperjsx.contextStorage");
const _globalScope = globalThis as Record<symbol, unknown>;
const _storage = (_globalScope[STORAGE_KEY] as AsyncLocalStorage<ContextBag> | undefined)
  ?? ((_globalScope[STORAGE_KEY] = new AsyncLocalStorage<ContextBag>()) as AsyncLocalStorage<ContextBag>);

/** Get the active per-request context, or undefined if none. */
export function getActiveContext(): ContextBag | undefined {
  return _storage.getStore();
}

export { _storage as contextStorage };
