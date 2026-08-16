/**
 * SSRF protection utilities.
 *
 * Validates URLs before fetching to prevent Server-Side Request Forgery
 * attacks. Only HTTP(S) schemes are allowed, and requests to private /
 * loopback / link-local addresses are blocked.
 *
 * Two levels of protection:
 *  1. `validateFetchUrl` — synchronous, checks hostname strings only
 *  2. `validateFetchUrlWithDns` — async, also resolves DNS and validates resolved IPs
 */
import { PaperError } from "../errors.js";
import { fetchFollowingValidatedRedirects } from "../fetchRedirect.js";
import { resolve4, resolve6 } from "node:dns/promises";

// ---------------------------------------------------------------------------
// Private-range IPv4 patterns
// ---------------------------------------------------------------------------

const PRIVATE_IPV4_PATTERNS: Array<(host: string) => boolean> = [
  // 10.0.0.0/8
  (h) => h.startsWith("10."),
  // 172.16.0.0/12  (172.16.* – 172.31.*)
  (h) => {
    if (!h.startsWith("172.")) return false;
    const second = parseInt(h.split(".")[1], 10);
    return second >= 16 && second <= 31;
  },
  // 192.168.0.0/16
  (h) => h.startsWith("192.168."),
  // 169.254.0.0/16  (link-local)
  (h) => h.startsWith("169.254."),
  // 127.0.0.0/8  (loopback)
  (h) => h.startsWith("127."),
  // 0.0.0.0
  (h) => h === "0.0.0.0",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip surrounding brackets from IPv6 hostnames that `new URL` may
 * return (e.g. `[::1]` -> `::1`).
 */
function stripBrackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function isPrivateIPv6(raw: string): boolean {
  const addr = stripBrackets(raw).toLowerCase();
  // Loopback
  if (addr === "::1") return true;
  // Link-local
  if (addr.startsWith("fe80:") || addr.startsWith("fe80%")) return true;
  // IPv6-mapped IPv4 — Node.js URL parser may produce either:
  //   ::ffff:127.0.0.1  (dotted decimal) or  ::ffff:7f00:1  (hex notation)
  if (addr.startsWith("::ffff:")) {
    const mapped = addr.slice(7);
    // Dotted decimal format (e.g. "127.0.0.1")
    if (mapped.includes(".") && isPrivateIPv4(mapped)) return true;
    // Hex notation format (e.g. "7f00:1") — parse as two 16-bit hex groups
    if (isPrivateIPv4FromHex(mapped)) return true;
  }
  return false;
}

/**
 * Converts IPv6 hex suffix (e.g. "7f00:1") from an IPv6-mapped address
 * to IPv4 and checks against private ranges.
 */
function isPrivateIPv4FromHex(hexSuffix: string): boolean {
  const parts = hexSuffix.split(":");
  if (parts.length !== 2) return false;
  const hi = parseInt(parts[0], 16);
  const lo = parseInt(parts[1], 16);
  if (isNaN(hi) || isNaN(lo)) return false;
  // Convert to IPv4 dotted decimal
  const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  return isPrivateIPv4(ipv4);
}

function isPrivateIPv4(hostname: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((check) => check(hostname));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates that `url` is safe to fetch.
 *
 * Throws a descriptive `Error` if:
 * - The URL cannot be parsed.
 * - The scheme is not `http:` or `https:`.
 * - The hostname resolves to a private, loopback, or link-local address.
 * - The hostname is `localhost`.
 */
export function validateFetchUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PaperError(`Invalid URL: ${url}`, { code: "VALIDATION_FAILED", phase: "media" });
  }

  // -- Scheme allowlist -----------------------------------------------------
  const allowed = ["http:", "https:"];
  if (!allowed.includes(parsed.protocol)) {
    throw new PaperError(
      `Blocked URL scheme "${parsed.protocol}" — only http: and https: are allowed`,
      { code: "VALIDATION_FAILED", phase: "media" },
    );
  }

  // -- Hostname checks ------------------------------------------------------
  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "localhost") {
    throw new PaperError("Blocked URL: requests to localhost are not allowed", { code: "VALIDATION_FAILED", phase: "media" });
  }

  if (isPrivateIPv4(hostname)) {
    throw new PaperError(
      `Blocked URL: hostname "${hostname}" resolves to a private IPv4 address`,
      { code: "VALIDATION_FAILED", phase: "media" },
    );
  }

  if (isPrivateIPv6(hostname)) {
    throw new PaperError(
      `Blocked URL: hostname "${hostname}" resolves to a private/loopback IPv6 address`,
      { code: "VALIDATION_FAILED", phase: "media" },
    );
  }
}

/**
 * Returns true if the hostname looks like a literal IP address (v4 or v6),
 * meaning DNS resolution is unnecessary.
 */
function isLiteralIp(hostname: string): boolean {
  // IPv4: digits and dots
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6: contains colons (already stripped of brackets)
  if (hostname.includes(":")) return true;
  return false;
}

/**
 * Validates an individual resolved IP address against private/loopback ranges.
 */
function validateResolvedIp(ip: string): void {
  if (isPrivateIPv4(ip)) {
    throw new PaperError(
      `Blocked URL: hostname resolves to private IPv4 address ${ip}`,
      { code: "VALIDATION_FAILED", phase: "media" },
    );
  }
  if (isPrivateIPv6(ip)) {
    throw new PaperError(
      `Blocked URL: hostname resolves to private/loopback IPv6 address ${ip}`,
      { code: "VALIDATION_FAILED", phase: "media" },
    );
  }
}

/**
 * Async SSRF protection: performs all checks from {@link validateFetchUrl},
 * then resolves the hostname via DNS and validates the resolved IP addresses
 * against private/loopback ranges.
 *
 * This prevents DNS rebinding attacks where `evil.example.com` resolves to
 * `127.0.0.1` — the hostname string check passes but the actual request
 * hits localhost.
 */
export async function validateFetchUrlWithDns(url: string): Promise<void> {
  // Run synchronous checks first
  validateFetchUrl(url);

  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  // Skip DNS for literal IP addresses — already validated by validateFetchUrl
  if (isLiteralIp(stripBrackets(hostname))) return;

  // Resolve DNS with a timeout to prevent hangs
  const DNS_TIMEOUT_MS = 5000;
  const timeoutError = new PaperError("DNS resolution timed out", { code: "VALIDATION_FAILED", phase: "media" });

  const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(timeoutError), DNS_TIMEOUT_MS)),
    ]);

  try {
    const ipv4Addresses = await withTimeout(resolve4(hostname));
    for (const ip of ipv4Addresses) {
      validateResolvedIp(ip);
    }
  } catch (err) {
    // If the error is from our validation, re-throw
    if (err instanceof PaperError) throw err;
    // DNS resolution failure for IPv4 is OK — hostname may be IPv6-only
  }

  try {
    const ipv6Addresses = await withTimeout(resolve6(hostname));
    for (const ip of ipv6Addresses) {
      validateResolvedIp(ip);
    }
  } catch (err) {
    if (err instanceof PaperError) throw err;
    // DNS resolution failure for IPv6 is OK — hostname may be IPv4-only
  }
}

/**
 * Validates the URL with {@link validateFetchUrlWithDns} (including DNS resolution)
 * and then delegates to the global `fetch`. Redirect targets receive the same
 * validation before they are followed. Throws before any network request is
 * made when the current URL is deemed unsafe.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  await validateFetchUrlWithDns(url);
  return fetchFollowingValidatedRedirects(
    url,
    (currentUrl) => fetch(currentUrl, { ...init, redirect: "manual" }),
    validateFetchUrlWithDns,
  );
}
