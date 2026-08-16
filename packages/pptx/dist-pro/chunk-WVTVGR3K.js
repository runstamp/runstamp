import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  PaperError
} from "./chunk-SFVKAOLH.js";

// src/fetchRedirect.ts
var MAX_REDIRECTS = 3;
var REDIRECT_STATUSES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
async function fetchFollowingValidatedRedirects(initialUrl, fetchHop, validateRedirect) {
  let currentUrl = initialUrl;
  let redirectsFollowed = 0;
  while (true) {
    const response = await fetchHop(currentUrl);
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    const location = response.headers.get("location");
    if (location === null) return response;
    if (redirectsFollowed >= MAX_REDIRECTS) {
      throw new PaperError(
        `Blocked URL: redirect limit of ${MAX_REDIRECTS} exceeded`,
        { code: "VALIDATION_FAILED", phase: "media" }
      );
    }
    let redirectUrl;
    try {
      redirectUrl = new URL(location, currentUrl).toString();
    } catch {
      throw new PaperError(
        `Invalid redirect URL: ${location}`,
        { code: "VALIDATION_FAILED", phase: "media" }
      );
    }
    await validateRedirect(redirectUrl);
    redirectsFollowed += 1;
    currentUrl = redirectUrl;
  }
}

// src/ooxml/urlGuard.ts
import { resolve4, resolve6 } from "node:dns/promises";
var PRIVATE_IPV4_PATTERNS = [
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
  (h) => h === "0.0.0.0"
];
function stripBrackets(hostname) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}
function isPrivateIPv6(raw) {
  const addr = stripBrackets(raw).toLowerCase();
  if (addr === "::1") return true;
  if (addr.startsWith("fe80:") || addr.startsWith("fe80%")) return true;
  if (addr.startsWith("::ffff:")) {
    const mapped = addr.slice(7);
    if (mapped.includes(".") && isPrivateIPv4(mapped)) return true;
    if (isPrivateIPv4FromHex(mapped)) return true;
  }
  return false;
}
function isPrivateIPv4FromHex(hexSuffix) {
  const parts = hexSuffix.split(":");
  if (parts.length !== 2) return false;
  const hi = parseInt(parts[0], 16);
  const lo = parseInt(parts[1], 16);
  if (isNaN(hi) || isNaN(lo)) return false;
  const ipv4 = `${hi >> 8 & 255}.${hi & 255}.${lo >> 8 & 255}.${lo & 255}`;
  return isPrivateIPv4(ipv4);
}
function isPrivateIPv4(hostname) {
  return PRIVATE_IPV4_PATTERNS.some((check) => check(hostname));
}
function validateFetchUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new PaperError(`Invalid URL: ${url}`, { code: "VALIDATION_FAILED", phase: "media" });
  }
  const allowed = ["http:", "https:"];
  if (!allowed.includes(parsed.protocol)) {
    throw new PaperError(
      `Blocked URL scheme "${parsed.protocol}" \u2014 only http: and https: are allowed`,
      { code: "VALIDATION_FAILED", phase: "media" }
    );
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost") {
    throw new PaperError("Blocked URL: requests to localhost are not allowed", { code: "VALIDATION_FAILED", phase: "media" });
  }
  if (isPrivateIPv4(hostname)) {
    throw new PaperError(
      `Blocked URL: hostname "${hostname}" resolves to a private IPv4 address`,
      { code: "VALIDATION_FAILED", phase: "media" }
    );
  }
  if (isPrivateIPv6(hostname)) {
    throw new PaperError(
      `Blocked URL: hostname "${hostname}" resolves to a private/loopback IPv6 address`,
      { code: "VALIDATION_FAILED", phase: "media" }
    );
  }
}
function isLiteralIp(hostname) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(":")) return true;
  return false;
}
function validateResolvedIp(ip) {
  if (isPrivateIPv4(ip)) {
    throw new PaperError(
      `Blocked URL: hostname resolves to private IPv4 address ${ip}`,
      { code: "VALIDATION_FAILED", phase: "media" }
    );
  }
  if (isPrivateIPv6(ip)) {
    throw new PaperError(
      `Blocked URL: hostname resolves to private/loopback IPv6 address ${ip}`,
      { code: "VALIDATION_FAILED", phase: "media" }
    );
  }
}
async function validateFetchUrlWithDns(url) {
  validateFetchUrl(url);
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  if (isLiteralIp(stripBrackets(hostname))) return;
  const DNS_TIMEOUT_MS = 5e3;
  const timeoutError = new PaperError("DNS resolution timed out", { code: "VALIDATION_FAILED", phase: "media" });
  const withTimeout = (promise) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(timeoutError), DNS_TIMEOUT_MS))
  ]);
  try {
    const ipv4Addresses = await withTimeout(resolve4(hostname));
    for (const ip of ipv4Addresses) {
      validateResolvedIp(ip);
    }
  } catch (err) {
    if (err instanceof PaperError) throw err;
  }
  try {
    const ipv6Addresses = await withTimeout(resolve6(hostname));
    for (const ip of ipv6Addresses) {
      validateResolvedIp(ip);
    }
  } catch (err) {
    if (err instanceof PaperError) throw err;
  }
}

export {
  fetchFollowingValidatedRedirects,
  validateFetchUrl,
  validateFetchUrlWithDns
};
//# sourceMappingURL=chunk-WVTVGR3K.js.map
