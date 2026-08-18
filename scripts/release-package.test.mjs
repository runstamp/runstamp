import assert from "node:assert/strict";
import test from "node:test";
import { assertNoWorkspaceProtocols, isTransientAttestation404, releases, validateInputs, verifyAuditResult } from "./release-package.mjs";

for (const [name, release] of releases) {
  test(`accepts only the frozen release identity for ${name}`, () => {
    const tag = `${name}@${release.version}`;
    assert.equal(validateInputs({ package: name, version: release.version, tag, confirm: `publish ${tag}`, bootstrap: String(release.bootstrap) }).name, name);
    assert.throws(() => validateInputs({ package: name, version: "9.9.9", tag, confirm: `publish ${tag}`, bootstrap: String(release.bootstrap) }));
    assert.throws(() => validateInputs({ package: name, version: release.version, tag: "wrong", confirm: `publish ${tag}`, bootstrap: String(release.bootstrap) }));
    assert.throws(() => validateInputs({ package: name, version: release.version, tag, confirm: "publish", bootstrap: String(release.bootstrap) }));
    assert.throws(() => validateInputs({ package: name, version: release.version, tag, confirm: `publish ${tag}`, bootstrap: String(!release.bootstrap) }));
  });
}

test("rejects packages outside the nine-package allowlist", () => {
  assert.throws(() => validateInputs({ package: "@runstamp/private", version: "1.0.0", tag: "@runstamp/private@1.0.0", confirm: "publish @runstamp/private@1.0.0", bootstrap: "true" }));
});

test("rejects workspace protocols in packed runtime dependency fields", () => {
  assert.throws(() => assertNoWorkspaceProtocols({ dependencies: { "@runstamp/contract": "workspace:^" } }));
  assert.throws(() => assertNoWorkspaceProtocols({ optionalDependencies: { "@runstamp/contract": "workspace:*" } }));
  assert.throws(() => assertNoWorkspaceProtocols({ peerDependencies: { "@runstamp/contract": "workspace:~" } }));
  assert.doesNotThrow(() => assertNoWorkspaceProtocols({ dependencies: { "@runstamp/contract": "^1.0.1" } }));
});

test("accepts only empty npm signature and attestation audit findings", () => {
  assert.doesNotThrow(() => verifyAuditResult({ invalid: [], missing: [] }));
  assert.throws(() => verifyAuditResult({ invalid: [{ name: "bad" }], missing: [] }));
  assert.throws(() => verifyAuditResult({ invalid: [], missing: [{ name: "missing" }] }));
  assert.throws(() => verifyAuditResult({ verified: [] }));
});

test("retries only transient npm attestation endpoint 404s", () => {
  assert.equal(isTransientAttestation404({ status: 1, stdout: '{"error":{"code":"E404"}}', stderr: "404 Not Found - GET https://registry.npmjs.org/-/npm/v1/attestations/%40runstamp%2Fxlsx@1.0.1" }), true);
  assert.equal(isTransientAttestation404({ status: 1, stdout: "E404 package missing", stderr: "" }), false);
  assert.equal(isTransientAttestation404({ status: 1, stdout: '{"invalid":[{"name":"bad"}]}', stderr: "" }), false);
  assert.equal(isTransientAttestation404({ status: 0, stdout: '{"invalid":[],"missing":[]}', stderr: "" }), false);
});
