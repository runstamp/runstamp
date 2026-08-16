// src/engineMode.ts — which bundle is rendering, not which plan was bought.

import { getActiveContext } from "./contextStorage.js";
import { deprecate } from "@runstamp/contract";

/**
 * Which build of the engine is active.
 *
 * `"full"` was called `"pro"` while the split was a paywall. It is not one any
 * more: every rendering capability ships in the Apache-2.0 package. What
 * survives is a genuine *size* boundary — the lite bundle is built from
 * `index-lite.ts` and omits templates, the accessibility validator, HarfBuzz
 * shaping and the canvas preview so it stays small. Asking for those there
 * cannot work regardless of what anyone has paid.
 *
 * `"pro"` is still accepted as an input alias through the §9.5 window, because
 * a caller may have it stored in a RenderContext.
 */
export type EngineMode = "full" | "lite" | "pro";

const DEFAULT_ENGINE_MODE: EngineMode = "full";

export function getEngineMode(): EngineMode {
  const ctx = getActiveContext();
  const mode = ctx?.engineMode as EngineMode | undefined;
  // Normalize the legacy value so no call site has to know about both.
  return mode === "pro" ? "full" : mode ?? DEFAULT_ENGINE_MODE;
}

export function getLicenseKey(): string | undefined {
  const ctx = getActiveContext();
  return (ctx?.licenseKey as string | undefined) ?? process.env.RUNSTAMP_LICENSE_KEY;
}

/**
 * True when the active render context is the size-constrained `lite` bundle.
 *
 * A bundle boundary, not a pricing one. The name matters: `isFreeMode()` read
 * as "the caller has not paid", which is what it used to mean and has not meant
 * since the engine paywall was removed — so anyone reading the free engine
 * concluded there was still a gate in it.
 */
export function isLiteBundle(): boolean {
  return getEngineMode() === "lite";
}

/** @deprecated Renamed to {@link isLiteBundle}; this is a bundle, not a plan. */
export const isFreeMode = deprecate(
  "isFreeMode",
  "Use isLiteBundle() — the boundary is the lite bundle's size, not a licence.",
  (): boolean => isLiteBundle(),
);

/** @deprecated Use {@link isLiteBundle}. */
export const isLiteMode = deprecate(
  "isLiteMode",
  "Use isLiteBundle().",
  (): boolean => isLiteBundle(),
);
