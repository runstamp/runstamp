/**
 * The operation harness (OC-1 §3.1–§3.2).
 *
 * `runOperation` is the single place the envelope is constructed, so every verb in
 * every package gets identical behavior for free: options resolution, loss and
 * diagnostic collection, loss policy, deterministic loss ordering, receipt
 * construction, and — critically — the R4 guarantee that a document condition
 * comes back as `{ ok: false }` rather than an exception.
 *
 * A Phase 3 adapter is then a thin mapping: describe the operation, hash the
 * input, call the existing engine, return the value.
 */

import { fail, ok } from "./result.js";
import type { OperationResult } from "./result.js";
import { PaperError, contractViolation } from "./errors.js";
import { OPERATION_CANCELLED, OPERATION_TIMEOUT } from "./codes.js";
import { toPaperError } from "./interop.js";
import type { ToPaperErrorOptions } from "./interop.js";
import { buildReceipt } from "./receipt.js";
import type { EngineIdentity, ToolVersion } from "./receipt.js";
import { resolveOptions } from "./options.js";
import type { EffectiveOptions, OperationOptions } from "./options.js";
import { hasDroppedLoss, sortLosses } from "./loss.js";
import type { Loss } from "./loss.js";
import type { Diagnostic } from "./diagnostics.js";
import type { ErrorDomain, NondeterminismSource, OperationName } from "./types.js";

/** Handed to an operation body so it can record losses and diagnostics as it works. */
export interface OperationContext {
  readonly effectiveOptions: EffectiveOptions;
  readonly deterministic: boolean;
  readonly signal?: AbortSignal;
  /** Record a faithfulness deviation. Also invokes `options.onLoss` if supplied. */
  addLoss(loss: Loss): void;
  /** Record a non-fatal observation. Also invokes `options.onDiagnostic` if supplied. */
  addDiagnostic(diagnostic: Diagnostic): void;
  /** Declare a nondeterminism source actually consumed. */
  addNondeterminism(source: NondeterminismSource): void;
  /** Declare an external tool invoked, with its pinned version. */
  addTool(tool: ToolVersion): void;
}

export interface OperationOutcome<TValue> {
  readonly value: TValue;
  /** `sha256:<hex>` of produced bytes, when the operation produced any. */
  readonly outputHash?: string;
}

export interface RunOperationInit<TValue> {
  readonly operation: OperationName;
  readonly domain: ErrorDomain;
  readonly engine: EngineIdentity;
  /**
   * `sha256:<hex>` of the input, normally via `hashValue` or `hashBytes`.
   *
   * Prefer the thunk form. Hashing an arbitrary caller-supplied value can itself
   * fail (a cycle, a `Date`, `undefined`), and a thunk is evaluated *inside* the
   * harness's guard so that failure becomes a typed result rather than an
   * exception — which R4 requires and an eagerly-computed hash would violate.
   */
  readonly inputHash: string | (() => string);
  readonly options?: OperationOptions;
  /** How to attribute errors the engine throws that are not already OC-1. */
  readonly errorContext?: ToPaperErrorOptions;
  readonly execute: (context: OperationContext) => Promise<OperationOutcome<TValue>>;
}

/**
 * Raised internally when the caller's signal aborts or `timeoutMs` elapses.
 *
 * Never escapes `runOperation`: it is converted into the typed cancellation
 * result R29 requires, so a caller never sees a thrown `AbortError`.
 */
class Cancellation extends Error {
  constructor(readonly kind: "cancelled" | "timeout") {
    super(kind);
    this.name = "Cancellation";
  }
}

/**
 * Bridge the caller's `signal`/`timeoutMs` onto one signal the engine can observe.
 *
 * The returned `signal` is handed to the operation body, so an engine that checks
 * it stops promptly. `raced` rejects for engines that do *not* check it — the
 * result still arrives "within tolerance" (C15), though the abandoned work keeps
 * running until it observes the signal or finishes. That is why engines should
 * consume `context.signal` rather than relying on the race alone.
 */
function createCancellation(options: OperationOptions | undefined): {
  signal: AbortSignal | undefined;
  raced: Promise<never> | undefined;
  dispose: () => void;
} {
  const callerSignal = options?.signal;
  const timeoutMs = options?.timeoutMs;
  if (callerSignal === undefined && timeoutMs === undefined) {
    return { signal: undefined, raced: undefined, dispose: () => {} };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  const raced = new Promise<never>((_resolve, reject) => {
    if (callerSignal?.aborted === true) {
      controller.abort();
      reject(new Cancellation("cancelled"));
      return;
    }
    if (callerSignal !== undefined) {
      onAbort = () => {
        controller.abort();
        reject(new Cancellation("cancelled"));
      };
      callerSignal.addEventListener("abort", onAbort, { once: true });
    }
    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Cancellation("timeout"));
      }, timeoutMs);
      // Do not hold the process open for a timeout that may never be needed.
      (timer as { unref?: () => void }).unref?.();
    }
  });
  // The race may settle via `execute` instead, leaving this promise rejected and
  // unobserved; without this the runtime reports an unhandled rejection.
  raced.catch(() => {});

  return {
    signal: controller.signal,
    raced,
    dispose: () => {
      if (timer !== undefined) clearTimeout(timer);
      if (onAbort !== undefined && callerSignal !== undefined) {
        callerSignal.removeEventListener("abort", onAbort);
      }
    },
  };
}

/**
 * The typed result R29 mandates. Both codes are `retryable` — the document was
 * never judged, so the same input may well succeed with more time.
 */
function cancellationError(kind: "cancelled" | "timeout", timeoutMs?: number): PaperError {
  return kind === "cancelled"
    ? new PaperError({
        code: OPERATION_CANCELLED,
        phase: "transport",
        message: "The operation was cancelled by its caller.",
        remediation:
          "Do not abort options.signal if the result is still required, then run the operation again.",
        retryable: true,
      })
    : new PaperError({
        code: OPERATION_TIMEOUT,
        phase: "transport",
        message: `The operation exceeded its ${String(timeoutMs)}ms budget.`,
        remediation:
          "Raise options.timeoutMs, or reduce the size or complexity of the input document.",
        retryable: true,
        details: { timeoutMs },
      });
}

export async function runOperation<TValue>(
  init: RunOperationInit<TValue>,
): Promise<OperationResult<TValue>> {
  const effectiveOptions = resolveOptions(init.options);
  const losses: Loss[] = [];
  const diagnostics: Diagnostic[] = [];
  const nondeterminism = new Set<NondeterminismSource>();
  const tools: ToolVersion[] = [];

  const cancellation = createCancellation(init.options);

  const context: OperationContext = {
    effectiveOptions,
    deterministic: effectiveOptions.deterministic,
    // The linked signal, not the caller's: it also fires on `timeoutMs`.
    ...(cancellation.signal !== undefined ? { signal: cancellation.signal } : {}),
    addLoss(loss) {
      losses.push(loss);
      init.options?.onLoss?.(loss);
    },
    addDiagnostic(diagnostic) {
      diagnostics.push(diagnostic);
      init.options?.onDiagnostic?.(diagnostic);
    },
    addNondeterminism(source) {
      nondeterminism.add(source);
    },
    addTool(tool) {
      tools.push(tool);
    },
  };

  // Resolved inside the guard below; a receipt is impossible until it exists.
  let inputHash: string | undefined;

  const finish = (outputHash?: string) => {
    if (inputHash === undefined) {
      throw contractViolation("Cannot build a receipt before the input hash is resolved.");
    }
    return buildReceipt({
      operation: init.operation,
      domain: init.domain,
      engine: init.engine,
      inputHash,
      effectiveOptions,
      ...(outputHash !== undefined ? { outputHash } : {}),
      nondeterminismSources: effectiveOptions.deterministic ? [] : [...nondeterminism],
      ...(tools.length > 0 ? { tools } : {}),
    });
  };

  let outcome: OperationOutcome<TValue>;
  try {
    // Hashing runs inside the guard: see RunOperationInit.inputHash.
    inputHash = typeof init.inputHash === "function" ? init.inputHash() : init.inputHash;
    // Short-circuit before doing any work. Racing alone is not enough: an
    // operation whose body reaches no `await` returns an already-resolved
    // promise, and `Promise.race` then prefers it over the already-rejected
    // cancellation — so a cancelled fast path would report success.
    if (init.options?.signal?.aborted === true) throw new Cancellation("cancelled");
    const running = init.execute(context);
    outcome =
      cancellation.raced === undefined ? await running : await Promise.race([running, cancellation.raced]);
  } catch (error) {
    // R4: a document condition is a result, not an exception. The only things that
    // propagate are contract violations raised by this package itself, which
    // indicate programmer error rather than bad data.
    //
    // R29: cancellation and timeout are results too, never a thrown AbortError.
    const normalized =
      error instanceof Cancellation
        ? cancellationError(error.kind, init.options?.timeoutMs)
        : toPaperError(error, init.errorContext ?? { domain: init.domain });
    let receipt: ReturnType<typeof finish> | undefined;
    try {
      receipt = finish();
    } catch {
      // A receipt could not be bound (e.g. nondeterminism declared with no source).
      // The failure itself still surfaces; the receipt is simply omitted.
      receipt = undefined;
    }
    return fail(normalized, {
      losses: sortLosses(losses),
      diagnostics,
      ...(receipt !== undefined ? { receipt } : {}),
    });
  } finally {
    cancellation.dispose();
  }

  const ordered = sortLosses(losses);

  // R30: lossPolicy converts fidelity deviations into a failure, so a regulated
  // caller can demand full fidelity without inspecting the ledger themselves.
  const policy = effectiveOptions.lossPolicy;
  const violates =
    policy === "failOnAny" ? ordered.length > 0 : policy === "failOnDropped" && hasDroppedLoss(ordered);

  if (violates) {
    const dropped = ordered.filter((loss) => loss.severity === "dropped").length;
    return fail(
      new PaperError({
        code: `${init.domain}/LOSS_POLICY_VIOLATED`,
        phase: "validation",
        message:
          policy === "failOnAny"
            ? `The operation completed with ${ordered.length} loss(es) and lossPolicy is "failOnAny".`
            : `The operation dropped ${dropped} item(s) and lossPolicy is "failOnDropped".`,
        remediation:
          "Inspect result.losses to see what could not be preserved, then either accept the loss with lossPolicy \"collect\" or change the input or options so the loss does not occur.",
        details: { lossPolicy: policy, lossCount: ordered.length, droppedCount: dropped },
      }),
      { losses: ordered, diagnostics, receipt: finish(outcome.outputHash) },
    );
  }

  return ok(outcome.value, {
    losses: ordered,
    diagnostics,
    receipt: finish(outcome.outputHash),
  });
}
