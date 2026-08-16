/**
 * Deprecated licensing shim for `@runstamp/pdf`.
 *
 * The engine has no feature gates. Every rendering capability — font embedding,
 * complex-script shaping, validation, repair, signatures, PDF/A — is available
 * in the published Apache-2.0 package, because correctness is not a paid
 * feature. Monetization lives in the hosted API, agent actions and governance
 * surfaces, not in whether the SDK renders your document properly.
 *
 * Only the one symbol that was ever public survives, so callers keep compiling
 * through the §9.5 deprecation window. Everything else — the license context,
 * the validation call, and the `requirePdfPro` guards at 23 call sites — is
 * gone, along with the `@runstamp/license` dependency.
 */

/**
 * @deprecated Always `true`. The free/pro split was removed on 2026-08-12 and no
 * capability is gated. Scheduled for removal at the next major; delete the call.
 */
export function hasPdfProLicense(_licenseKey?: string): boolean {
  return true;
}
