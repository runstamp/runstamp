/**
 * `runOperation` — the harness that carries the contract for every adapter.
 *
 * Focused on cancellation (R29 / gate C15), which is the part a per-package
 * conformance run cannot meaningfully exercise on its own: if the harness does
 * not implement it, every package fails identically and the cause is here.
 */

import { describe, expect, it, vi } from "vitest";

import { runOperation } from "../run.js";
import { isFail, isOk } from "../result.js";
import { OPERATION_CANCELLED, OPERATION_TIMEOUT } from "../codes.js";
import type { OperationOptions } from "../options.js";
import type { OperationContext } from "../run.js";

const ENGINE = { name: "@runstamp/contract-test", version: "0.0.0" } as const;

/** A minimal operation whose body is supplied per test. */
function run<T>(
  execute: (context: OperationContext) => Promise<{ value: T }>,
  options?: OperationOptions,
) {
  return runOperation<T>({
    operation: "common.validate",
    domain: "common",
    engine: ENGINE,
    inputHash: () => "sha256:" + "0".repeat(64),
    ...(options !== undefined ? { options } : {}),
    execute,
  });
}

const never = () => new Promise<{ value: string }>(() => {});

describe("runOperation cancellation (R29, C15)", () => {
  it("returns a typed cancellation when the signal aborts mid-flight", async () => {
    const controller = new AbortController();
    const pending = run(never, { signal: controller.signal });
    controller.abort();
    const result = await pending;

    expect(isFail(result)).toBe(true);
    if (!isFail(result)) return;
    expect(result.error.code).toBe(OPERATION_CANCELLED);
    expect(result.error.retryable).toBe(true);
    expect(result.error.remediation.length).toBeGreaterThan(0);
  });

  it("returns a typed cancellation when the signal is already aborted", async () => {
    const result = await run(never, { signal: AbortSignal.abort() });

    expect(isFail(result)).toBe(true);
    if (!isFail(result)) return;
    expect(result.error.code).toBe(OPERATION_CANCELLED);
  });

  it("returns a typed timeout once the budget elapses", async () => {
    vi.useFakeTimers();
    try {
      const pending = run(never, { timeoutMs: 25 });
      await vi.advanceTimersByTimeAsync(30);
      const result = await pending;

      expect(isFail(result)).toBe(true);
      if (!isFail(result)) return;
      expect(result.error.code).toBe(OPERATION_TIMEOUT);
      expect(result.error.retryable).toBe(true);
      expect(result.error.details).toMatchObject({ timeoutMs: 25 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("never throws an AbortError at the caller", async () => {
    const controller = new AbortController();
    const pending = run(never, { signal: controller.signal });
    controller.abort();
    // The assertion is that awaiting resolves rather than rejects.
    await expect(pending).resolves.toBeDefined();
  });

  it("exposes a signal the engine can observe, so real work can stop", async () => {
    const controller = new AbortController();
    let observed: AbortSignal | undefined;
    const pending = run(async (context) => {
      observed = context.signal;
      return new Promise<{ value: string }>(() => {});
    }, { signal: controller.signal });
    controller.abort();
    await pending;

    expect(observed).toBeDefined();
    expect(observed?.aborted).toBe(true);
  });

  it("links timeoutMs onto the observable signal too", async () => {
    vi.useFakeTimers();
    try {
      let observed: AbortSignal | undefined;
      const pending = run(async (context) => {
        observed = context.signal;
        return new Promise<{ value: string }>(() => {});
      }, { timeoutMs: 10 });
      await vi.advanceTimersByTimeAsync(15);
      await pending;

      expect(observed?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not cancel an operation that finishes inside its budget", async () => {
    const result = await run(async () => ({ value: "done" }), { timeoutMs: 10_000 });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value).toBe("done");
  });

  it("leaves the un-cancelled path untouched when neither option is supplied", async () => {
    const result = await run(async () => ({ value: "done" }));

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.receipt.operation).toBe("common.validate");
  });
});
