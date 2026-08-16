/**
 * The single bootstrap default token bundle.
 *
 * Meant to be overwritten by callers, not selected. If you reach for this and
 * do not replace most keys, you are using runstamp wrong. The default exists
 * because every token must resolve to *something* when the caller omits it.
 *
 * Design of the default:
 *   - Plain black-on-white (no accent), system fonts, minimal ornamentation.
 *   - `accent` intentionally equals `foreground` so an under-specified bundle
 *     still renders legibly without accidentally promoting stray hex values.
 *   - Photography disabled (`photo.enabled = false`) — photo primitives
 *     gracefully degrade. A photo-forward caller (LG-style) must opt in.
 *   - Footer carries a page number only; no disclaimer, no watermark.
 *   - Rules mostly `"none"` or a whisper-pale hairline. Callers choose
 *     what to emphasize.
 *
 * Default `family` is "Aptos" — PowerPoint's native Calibri replacement
 * (Office 2024+ ships Aptos by default). Earlier choices like "Helvetica Neue"
 * caused PowerPoint on Windows to substitute Calibri/Aptos with different
 * metrics and break the layout. For broader portability across non-Microsoft
 * viewers, override to a metric-compat open-source family ("Carlito").
 */
import type { ResolvedTokens } from "./schema.js";
export declare const BOOTSTRAP_TOKENS: ResolvedTokens;
//# sourceMappingURL=defaults.d.ts.map