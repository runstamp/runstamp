import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createServiceAccountAssertion,
  resolveGoogleAccessToken,
} from "../../scripts/desktopValidation/runGoogleSlidesOracle.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

describe("Google Slides oracle authentication", () => {
  it("prefers a direct access token without attempting an exchange", async () => {
    const fetchImpl = vi.fn();
    await expect(resolveGoogleAccessToken({
      env: {
        GOOGLE_SLIDES_ACCESS_TOKEN: "direct-token",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "unused@example.iam.gserviceaccount.com",
        GOOGLE_PRIVATE_KEY: "unused",
      },
      fetchImpl,
    })).resolves.toBe("direct-token");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("creates a valid scoped RS256 service-account assertion", () => {
    const issuedAt = 1_800_000_000;
    const assertion = createServiceAccountAssertion(
      "slides@example.iam.gserviceaccount.com",
      privateKey.replace(/\n/g, "\\n"),
      issuedAt,
    );
    const [headerPart, payloadPart, signaturePart] = assertion.split(".");
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));

    expect(header).toEqual({ alg: "RS256", typ: "JWT" });
    expect(payload).toEqual({
      iss: "slides@example.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    });
    expect(verify(
      "RSA-SHA256",
      Buffer.from(`${headerPart}.${payloadPart}`),
      publicKey,
      Buffer.from(signaturePart, "base64url"),
    )).toBe(true);
  });

  it("exchanges the assertion without putting credentials in the request URL", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
      expect(body.get("assertion")?.split(".")).toHaveLength(3);
      return new Response(JSON.stringify({ access_token: "service-account-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await expect(resolveGoogleAccessToken({
      env: {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "slides@example.iam.gserviceaccount.com",
        GOOGLE_PRIVATE_KEY: privateKey,
      },
      fetchImpl,
      issuedAt: 1_800_000_000,
    })).resolves.toBe("service-account-token");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
