import type { PdfEncryptionConfig } from "./encryption/types.js";
import type { PdfCapabilityPlan } from "./capability-planner.js";
import type { PdfSignOptions } from "./phase10-types.js";

export type PdfVersion = "1.4" | "1.5" | "1.6" | "1.7" | "2.0";

export interface PdfAssetPolicy {
  /**
   * Remote URL sources are disabled by default. Set this to true to permit
   * `http:` / `https:` sources after scheme and byte-limit checks.
   */
  allowRemoteSources?: boolean;
  /** Schemes accepted for string sources. Defaults to file/data/http/https with remote gated separately. */
  allowedSchemes?: Array<"file" | "data" | "http" | "https">;
  /** Optional directory that file paths must resolve within. */
  baseDirectory?: string;
  /** Maximum bytes for a single source. Per-loader defaults still apply when omitted. */
  maxSourceBytes?: number;
  /** Timeout for remote fetches. Defaults to 5000ms. */
  timeoutMs?: number;
}

export interface PdfRenderTrace extends PdfCapabilityPlan {
  annotationsCount: number;
  durationMs: number;
  fontCount: number;
  imageCount: number;
  outputBytes: number;
  pageCount: number;
  structureElementCount: number;
  warningCount: number;
}

export interface PdfRenderOptions {
  assetPolicy?: PdfAssetPolicy;
  /** Explicit signed license. Takes precedence over RUNSTAMP_LICENSE_KEY. */
  licenseKey?: string;
  encryption?: PdfEncryptionConfig;
  flattenForms?: boolean;
  linearize?: boolean;
  onInputWarning?: (warning: import("./relaxed-input.js").PdfInputWarning) => void;
  onPageSerialized?: (pageIndex: number, totalPages: number) => void;
  onRenderTrace?: (trace: PdfRenderTrace) => void;
  pdfA?: "PDF/A-1b" | "PDF/A-2b";
  /**
   * Target PDF specification version for the file header. The engine
   * may auto-bump above this if a feature requires it (PDF/A-2b → 1.7,
   * AES-256 → 1.7, AES-128 → 1.6) but will never auto-downgrade. When
   * omitted, the engine picks the lowest version that satisfies the
   * requested feature set (1.4 default; bumped only by encryption /
   * PDF/A constraints). Future versions will use this hint to gate
   * 1.5+ features such as object streams.
   */
  pdfVersion?: PdfVersion;
  relaxed?: boolean;
  /**
   * Emit deterministic trailer identifiers for byte-stable test output.
   * Defaults to the package-level `setDeterministicMode()` value.
   */
  deterministic?: boolean;
  signature?: PdfSignOptions;
  /**
   * Throw `PdfError("SCHEMA_REJECTED")` if the input fails Zod schema
   * validation. Defaults to `true`; pass `strict: false` to surface schema
   * failures through `onInputWarning` and render the original input.
   */
  strict?: boolean;
  /**
   * @deprecated Use `strict` instead. When supplied, this legacy option still
   * overrides the default so existing callers can opt into permissive rendering
   * with `strictSchema: false`.
   */
  strictSchema?: boolean;
}
