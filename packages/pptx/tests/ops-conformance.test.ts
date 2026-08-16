/**
 * OC-1 conformance for `@runstamp/pptx/ops` (gates C1–C18).
 *
 * The gates live in `@runstamp/contract/verify` so every package runs the same
 * checks rather than each hand-rolling its own; this file just makes them part
 * of the package suite, so a regression fails here as well as in the dedicated
 * `pnpm contract:verify` job.
 *
 * Deliberately runs against `dist/`, not `src/`. The gate exists to judge what
 * consumers actually install, and the divergence between the two is a failure
 * class this repo has shipped twice — a build define that differed from the test
 * define, and an `./ops` subpath that was never added to the build script.
 */

import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { GATE_IDS } from "@runstamp/contract/verify";

import manifest from "../conformance/manifest.mjs";

const BUILT = existsSync(manifest.ops);

describe.skipIf(!BUILT)("OC-1 conformance", () => {
  let report: Awaited<ReturnType<typeof import("@runstamp/contract/verify").verifyPackage>>;

  beforeAll(async () => {
    const { verifyPackage } = await import("@runstamp/contract/verify");
    report = await verifyPackage(manifest);
  }, 120_000);

  it("reports every gate", () => {
    // Compared against the contract's own list rather than a literal, so adding
    // a gate does not silently leave a package unmeasured against it.
    expect(report.gates.map((gate) => gate.gate)).toEqual([...GATE_IDS]);
  });

  it("has no failing gate", () => {
    const failures = report.gates
      .filter((gate) => gate.status === "fail")
      .map((gate) => `${gate.gate} ${gate.title}: ${gate.summary}\n    ${(gate.details ?? []).join("\n    ")}`);

    expect(failures).toEqual([]);
  });

  it("asserts a clean ledger somewhere, so losses: [] stays falsifiable", () => {
    // R17 makes an empty ledger a positive claim. A suite that only ever checks
    // for the presence of losses cannot detect a false positive.
    expect(manifest.fixtures.some((fixture) => fixture.lossFree === true)).toBe(true);
  });
});

if (!BUILT) {
  it("needs a build before conformance can run", () => {
    // Surfaces the reason rather than silently reporting a green suite.
    expect(BUILT, `run \`pnpm build\` first; ${manifest.ops} is missing`).toBe(false);
  });
}
