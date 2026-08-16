// Ed25519 enterprise entitlement certificates.
//
// Verification is intentionally self-contained: it reads no environment
// variables, database state, clock service, or network resource. Air-gapped
// runtimes only need a token, the published public key, and their local clock.

import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export const OFFLINE_LICENSE_PREFIX = "pjsx_offline_v1_";

/**
 * Public half of the production v4 Ed25519 signing key. This is public data and
 * matches `keys/public-v4.pem` plus the file served from
 * `/.well-known/runstamp-license-public-key.pem`.
 */
export const RUNSTAMP_OFFLINE_LICENSE_PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MCowBQYDK2VwAyEADISwNboLC94b2Le1I9jcqBFO3zkSP3m9uovslC66hac=\n" +
  "-----END PUBLIC KEY-----\n";

export type OfflineLicenseLimit = number | "unlimited";
export type OfflineDeploymentEnvironment =
  | "development"
  | "ci"
  | "production"
  | "air-gapped"
  | "embedded";

export interface OfflineLicenseEntitlement {
  /** Token schema version. */
  version: 1;
  /** Stable certificate identifier for support and deny-list distribution. */
  licenseId: string;
  issuer: "Runstamp";
  organization: {
    id: string;
    name: string;
  };
  tier: "enterprise";
  formats: string[];
  features: string[];
  scope: {
    seats: OfflineLicenseLimit;
    deployments: {
      max: OfflineLicenseLimit;
      environments: OfflineDeploymentEnvironment[];
    };
  };
  /** Unix epoch seconds. */
  issuedAt: number;
  /** Unix epoch seconds. */
  expiresAt: number;
}

export type OfflineLicenseVerification =
  | { valid: true; entitlement: OfflineLicenseEntitlement }
  | { valid: false; reason: "invalid" | "expired"; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function isLimit(value: unknown): value is OfflineLicenseLimit {
  return value === "unlimited" || (Number.isInteger(value) && Number(value) > 0);
}

const DEPLOYMENT_ENVIRONMENTS = new Set<OfflineDeploymentEnvironment>([
  "development",
  "ci",
  "production",
  "air-gapped",
  "embedded",
]);

function isEntitlement(value: unknown): value is OfflineLicenseEntitlement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OfflineLicenseEntitlement>;
  const organization = candidate.organization;
  const scope = candidate.scope;
  const deployments = scope?.deployments;

  return candidate.version === 1
    && candidate.issuer === "Runstamp"
    && candidate.tier === "enterprise"
    && isNonEmptyString(candidate.licenseId)
    && Boolean(
      organization
      && isNonEmptyString(organization.id)
      && isNonEmptyString(organization.name),
    )
    && isStringList(candidate.formats)
    && isStringList(candidate.features)
    && Boolean(scope && isLimit(scope.seats))
    && Boolean(deployments && isLimit(deployments.max))
    && Boolean(
      deployments
      && Array.isArray(deployments.environments)
      && deployments.environments.length > 0
      && deployments.environments.every(
        (environment) => DEPLOYMENT_ENVIRONMENTS.has(environment),
      ),
    )
    && Number.isInteger(candidate.issuedAt)
    && Number(candidate.issuedAt) > 0
    && Number.isInteger(candidate.expiresAt)
    && Number(candidate.expiresAt) > Number(candidate.issuedAt);
}

function signingInput(payloadBase64Url: string): Buffer {
  return Buffer.from(`${OFFLINE_LICENSE_PREFIX}${payloadBase64Url}`, "utf8");
}

/** Server-side issuance. The private key must never be shipped to an SDK. */
export function issueOfflineLicense(
  entitlement: OfflineLicenseEntitlement,
  privateKeyPem: string,
): string {
  if (!isEntitlement(entitlement)) {
    throw new Error("Offline license entitlement is invalid");
  }

  const payloadBase64Url = Buffer.from(
    JSON.stringify(entitlement),
    "utf8",
  ).toString("base64url");
  const signature = sign(
    null,
    signingInput(payloadBase64Url),
    createPrivateKey(privateKeyPem),
  ).toString("base64url");

  return `${OFFLINE_LICENSE_PREFIX}${payloadBase64Url}.${signature}`;
}

/**
 * Verify an enterprise entitlement entirely offline.
 *
 * `nowEpochSeconds` exists for deterministic callers/tests; production callers
 * should omit it so the local system clock is used.
 */
export function verifyOfflineLicense(
  token: string,
  publicKeyPem: string,
  nowEpochSeconds = Math.floor(Date.now() / 1000),
): OfflineLicenseVerification {
  if (token.length > 65_536 || !token.startsWith(OFFLINE_LICENSE_PREFIX)) {
    return { valid: false, reason: "invalid", error: "Invalid offline license format" };
  }

  try {
    const encoded = token.slice(OFFLINE_LICENSE_PREFIX.length);
    const separatorIndex = encoded.lastIndexOf(".");
    if (separatorIndex <= 0 || separatorIndex === encoded.length - 1) {
      return { valid: false, reason: "invalid", error: "Invalid offline license structure" };
    }

    const payloadBase64Url = encoded.slice(0, separatorIndex);
    const signatureBase64Url = encoded.slice(separatorIndex + 1);
    const signatureValid = verify(
      null,
      signingInput(payloadBase64Url),
      createPublicKey(publicKeyPem),
      Buffer.from(signatureBase64Url, "base64url"),
    );
    if (!signatureValid) {
      return { valid: false, reason: "invalid", error: "Invalid offline license signature" };
    }

    let entitlement: unknown;
    try {
      entitlement = JSON.parse(
        Buffer.from(payloadBase64Url, "base64url").toString("utf8"),
      );
    } catch {
      return { valid: false, reason: "invalid", error: "Malformed offline license payload" };
    }
    if (!isEntitlement(entitlement)) {
      return { valid: false, reason: "invalid", error: "Invalid offline license entitlement" };
    }
    if (!Number.isFinite(nowEpochSeconds) || nowEpochSeconds >= entitlement.expiresAt) {
      return { valid: false, reason: "expired", error: "Offline license expired" };
    }

    return { valid: true, entitlement };
  } catch {
    return { valid: false, reason: "invalid", error: "Offline license verification failed" };
  }
}

