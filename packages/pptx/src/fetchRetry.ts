// src/fetchRetry.ts — Retry wrapper for network fetches
import { getLogger } from "./logger.js";
import { FETCH_TIMEOUT_MS } from "./ooxml/constants.js";
import { isDeterministicMode } from "./deterministicMode.js";
import { PaperError } from "./errors.js";
import { fetchFollowingValidatedRedirects } from "./fetchRedirect.js";
import { validateFetchUrlWithDns } from "./ooxml/urlGuard.js";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Fetch with automatic retry on transient failures (network errors, 429, 5xx).
 * Uses linear backoff with jitter: ~500ms, ~1000ms, ~1500ms.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const signal = init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS);
      const response = await fetchFollowingValidatedRedirects(
        url,
        (currentUrl) => fetch(currentUrl, { ...init, signal, redirect: "manual" }),
        validateFetchUrlWithDns,
      );

      if (response.ok || !isRetryable(response.status) || attempt === MAX_RETRIES) {
        return response;
      }

      getLogger().warn(
        `[fetch] Retryable HTTP ${response.status} for "${url}" (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
      );
    } catch (err) {
      lastError = err as Error;

      // URL validation and redirect-limit failures are deterministic.
      if (lastError instanceof PaperError) {
        throw lastError;
      }

      // Don't retry on abort/cancellation
      if (lastError.name === "AbortError" || lastError.name === "TimeoutError") {
        throw lastError;
      }

      if (attempt === MAX_RETRIES) {
        throw lastError;
      }

      getLogger().warn(
        `[fetch] Network error for "${url}" (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`,
      );
    }

    // Linear backoff with jitter (±15%) to prevent thundering herd.
    // In deterministic mode, skip jitter for reproducible timing.
    const baseDelay = RETRY_DELAY_MS * (attempt + 1);
    const jitter = isDeterministicMode() ? baseDelay : baseDelay * (0.85 + Math.random() * 0.3);
    await new Promise(resolve => setTimeout(resolve, jitter));
  }

  const finalError = lastError ?? new Error(`[fetch] Failed after ${MAX_RETRIES + 1} attempts: ${url}`);
  getLogger().warn(`[fetch] All ${MAX_RETRIES + 1} attempts exhausted for "${url}": ${finalError.message}`);
  throw finalError;
}
