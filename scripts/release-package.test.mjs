import assert from "node:assert/strict";
import test from "node:test";
import { releases, validateInputs } from "./release-package.mjs";

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
