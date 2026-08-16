// src/renderContext.ts — Per-request render context for isolation
//
// RenderContext bundles all mutable manager instances so concurrent render
// requests each get their own state (font caches, logger, config flags).
// Use `withContext()` to run an async function with a specific context active.

import { contextStorage } from "./contextStorage.js";
import type { EngineMode } from "./engineMode.js";
import { LoggerManager } from "./logger.js";
import { createInheritedDeterministicModeManager, DeterministicModeManager } from "./deterministicMode.js";
import { FontCacheManager } from "./typography/fontCache.js";
import { HarfBuzzManager } from "./typography/harfbuzzLoader.js";
import { KnuthPlassConfig } from "./typography/knuthPlass.js";
import { FontBridgeManager } from "./renderer/fontBridge.js";

export interface RenderContextOptions {
  engineMode?: EngineMode;
  licenseKey?: string;
  logger?: LoggerManager;
  deterministicMode?: DeterministicModeManager;
  fontCache?: FontCacheManager;
  harfBuzz?: HarfBuzzManager;
  knuthPlass?: KnuthPlassConfig;
  fontBridge?: FontBridgeManager;
}

/**
 * Per-request isolation context. Each instance holds independent manager state
 * (font caches, logger, determinism flag, etc.).
 *
 * ```ts
 * const ctx = new RenderContext();
 * ctx.deterministicMode.setDeterministicMode(true);
 * const buf = await withContext(ctx, () => engine.render(doc));
 * ```
 */
export class RenderContext {
  readonly engineMode: EngineMode;
  readonly licenseKey?: string;
  readonly logger: LoggerManager;
  readonly deterministicMode: DeterministicModeManager;
  readonly fontCache: FontCacheManager;
  readonly harfBuzz: HarfBuzzManager;
  readonly knuthPlass: KnuthPlassConfig;
  readonly fontBridge: FontBridgeManager;

  constructor(opts?: RenderContextOptions) {
    this.engineMode = opts?.engineMode ?? "full";
    this.licenseKey = opts?.licenseKey;
    this.logger = opts?.logger ?? new LoggerManager();
    this.deterministicMode = opts?.deterministicMode ?? createInheritedDeterministicModeManager();
    this.fontCache = opts?.fontCache ?? new FontCacheManager();
    this.harfBuzz = opts?.harfBuzz ?? new HarfBuzzManager();
    this.knuthPlass = opts?.knuthPlass ?? new KnuthPlassConfig();
    this.fontBridge = opts?.fontBridge ?? new FontBridgeManager();
  }
}

/**
 * Execute `fn` with the given RenderContext active in AsyncLocalStorage.
 * All module-level getter functions (getLogger, getFont, etc.) will
 * automatically resolve to the context's managers instead of the defaults.
 */
export function withContext<T>(ctx: RenderContext, fn: () => T): T {
  return contextStorage.run(ctx, fn);
}
