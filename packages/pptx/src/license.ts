// license.ts — Ed25519 license key validation (shared across all engines)
//
// Keys are signed server-side with a private key. Only the public key is
// embedded in the bundle — safe to expose, useless for forgery.

import { createPublicKey, verify } from "node:crypto";
import {
  OFFLINE_LICENSE_PREFIX,
  RUNSTAMP_OFFLINE_LICENSE_PUBLIC_KEY,
  verifyOfflineLicense,
} from "./offline-license.js";

// Embedded at build time — these are PUBLIC keys, safe to expose.
// When not defined (e.g. in tests or unbundled dev), falls back to empty string.
declare const __RUNSTAMP_PUBLIC_KEY_V2__: string;
declare const __RUNSTAMP_PUBLIC_KEY_V4__: string;

const embeddedPublicKeyV2 =
  typeof __RUNSTAMP_PUBLIC_KEY_V2__ !== "undefined"
    ? __RUNSTAMP_PUBLIC_KEY_V2__
    : "";

const embeddedPublicKeyV4 =
  typeof __RUNSTAMP_PUBLIC_KEY_V4__ !== "undefined"
    ? __RUNSTAMP_PUBLIC_KEY_V4__
    : "";

// V3: in-source public key for the current rotation candidate. The matching
// private key belongs only in the approved production secret manager; it must
// never be written to this repository or a developer workstation.
const PUBLIC_KEY_V3 =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MCowBQYDK2VwAyEA/4P4nHKrym8RfJXqcmcXbpX5SdfzfNT3Go92YrRcr90=\n" +
  "-----END PUBLIC KEY-----\n";

function getPublicKeys(): Record<number, string> {
  const testPublicKeyV2 =
    process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
      ? process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 ?? ""
      : "";

  return {
    2: testPublicKeyV2 || embeddedPublicKeyV2,
    3: PUBLIC_KEY_V3,
    4: embeddedPublicKeyV4,
  };
}

export interface LicensePayload {
  addons?: string[];
  sub: string;
  iat: number;
  exp: number;
  tier: "pro" | "platform" | "enterprise";
  fmt: string[];
  v: number;
  kid?: string;
}

// Revoked key ids (v3+). To revoke a leaked or compromised key: append its
// kid here, bump @runstamp/license, republish the consuming pro packages.
// Customers who upgrade pick up the revocation. Pinned-version installs
// keep working until they upgrade — that is the cost of a baked-in list
// versus a network revocation check.
const REVOKED_KIDS: ReadonlySet<string> = new Set<string>([
  // "k_2026_05_03_abc123",
]);

export interface LicenseValidationResult {
  valid: boolean;
  payload?: LicensePayload;
  error?: string;
  code?: string;
}

export function validateLicenseKey(
  key: string,
  requiredFormat: string,
): LicenseValidationResult {
  if (!key) return { valid: false, error: "No license key provided" };

  if (key.startsWith(OFFLINE_LICENSE_PREFIX)) {
    const result = verifyOfflineLicense(
      key,
      RUNSTAMP_OFFLINE_LICENSE_PUBLIC_KEY,
    );
    if (!result.valid) return { valid: false, error: result.error };
    if (!result.entitlement.formats.includes(requiredFormat)) {
      return {
        valid: false,
        error: `License does not include ${requiredFormat.toUpperCase()}. Licensed formats: ${result.entitlement.formats.join(", ")}`,
      };
    }
    return {
      valid: true,
      payload: {
        sub: result.entitlement.organization.id,
        iat: result.entitlement.issuedAt,
        exp: result.entitlement.expiresAt,
        tier: "enterprise",
        fmt: result.entitlement.formats,
        addons: result.entitlement.features,
        v: 4,
        kid: result.entitlement.licenseId,
      },
    };
  }

  const prefixMatch = key.match(/^pjsx_(live|test)_(.+)$/);
  if (!prefixMatch) return { valid: false, error: "Invalid key format" };

  const [, env, encoded] = prefixMatch;

  if (env === "test" && process.env.NODE_ENV === "production") {
    return { valid: false, error: "Test keys are not valid in production" };
  }

  try {
    const dotIndex = encoded.lastIndexOf(".");
    if (dotIndex === -1)
      return { valid: false, error: "Invalid key structure" };

    const payloadB64 = encoded.substring(0, dotIndex);
    const signatureB64 = encoded.substring(dotIndex + 1);

    let payload: LicensePayload;
    try {
      payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8"),
      );
    } catch {
      return { valid: false, error: "Malformed payload" };
    }

    const publicKeys = getPublicKeys();
    if (!Object.prototype.hasOwnProperty.call(publicKeys, payload.v)) {
      return { valid: false, error: `Unknown key version: ${payload.v}` };
    }
    const publicKeyPem = publicKeys[payload.v];
    if (!publicKeyPem) {
      return {
        valid: false,
        error:
          "License validation is not configured for this build (missing public key)",
      };
    }

    const publicKey = createPublicKey(publicKeyPem);
    const isValid = verify(
      null,
      Buffer.from(payloadB64, "utf-8"),
      publicKey,
      Buffer.from(signatureB64, "base64url"),
    );

    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }

    if (payload.v >= 3) {
      if (!payload.kid) {
        return { valid: false, error: "Missing kid", payload };
      }
      if (REVOKED_KIDS.has(payload.kid)) {
        return { valid: false, error: "License revoked", payload };
      }
    }

    if (typeof payload.exp !== "number" || Date.now() / 1000 > payload.exp) {
      return { valid: false, error: "License expired", payload };
    }

    if (!payload.fmt.includes(requiredFormat)) {
      return {
        valid: false,
        error: `License does not include ${requiredFormat.toUpperCase()}. Licensed formats: ${payload.fmt.join(", ")}`,
        payload,
      };
    }

    return { valid: true, payload };
  } catch (err) {
    return {
      valid: false,
      error: "Failed to validate license key",
      code: err instanceof Error ? err.name : "UnknownError",
    };
  }
}

export { RunstampFeatureError, PaperJSXFeatureError } from "./errors.js";
