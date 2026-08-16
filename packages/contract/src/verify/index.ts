/**
 * `@runstamp/contract/verify` — the OC-1 conformance kit (§7).
 *
 * `pnpm contract:verify` runs this against every package that ships an `./ops`
 * surface, and CI blocks on the result. It is published rather than kept as a
 * repo script on purpose: every catalog extension has to be able to prove its own
 * compliance without this monorepo, which is what "every expansion item must be
 * born OC-1 compliant" requires.
 *
 * The kit imports the package under test dynamically, so the contract keeps its
 * normative zero-dependency, no-engine-imports guarantee.
 */

import { CONTRACT_VERSION } from "../version.js";
import {
  buildApiReport,
  gateC1,
  gateC11,
  gateC12,
  gateC13,
  gateC14,
  gateC15,
  gateC16,
  gateC17,
  gateC18,
  gateC2,
  gateC3,
  gateC4,
  gateC5,
  gateC6,
  gateC7C8C10,
  gateC9,
} from "./gates.js";
import type { OpsModule } from "./gates.js";
import { GATE_IDS, GATE_TITLES } from "./types.js";
import type {
  ConformanceFixture,
  ConformanceManifest,
  GateId,
  GateResult,
  GateStatus,
  VerifyReport,
} from "./types.js";

export type {
  ConformanceFixture,
  ConformanceManifest,
  ExpectedLoss,
  GateId,
  GateResult,
  GateStatus,
  VerifyReport,
} from "./types.js";
export { GATE_IDS, GATE_TITLES } from "./types.js";
export { HOSTILE_INPUTS } from "./hostile.js";
export { buildApiReport } from "./gates.js";
export { completeFixtureCoverage } from "./coverage.js";
export type { ConformanceFixtureSeed } from "./coverage.js";

function gateOrder(a: GateResult, b: GateResult): number {
  return GATE_IDS.indexOf(a.gate) - GATE_IDS.indexOf(b.gate);
}

/**
 * Run C1–C18 against one package.
 *
 * Never throws for a conformance failure — the report *is* the outcome. A thrown
 * error means the kit could not load the surface at all, which is reported as a
 * failure of every gate rather than an exception, so a broken build shows up as
 * red gates instead of a stack trace.
 */
export async function verifyPackage(manifest: ConformanceManifest): Promise<VerifyReport> {
  let ops: OpsModule;
  try {
    ops = (await import(manifest.ops)) as OpsModule;
  } catch (error) {
    const summary = `Could not import ${manifest.ops}: ${String(error)}`;
    return {
      package: manifest.package,
      domain: manifest.domain,
      contractVersion: CONTRACT_VERSION,
      gates: GATE_IDS.map((gate) => ({
        gate,
        title: GATE_TITLES[gate],
        status: "fail" as GateStatus,
        summary,
      })),
      ok: false,
    };
  }

  const gates: GateResult[] = [gateC1(ops), gateC14(ops)];

  gates.push(
    await gateC2(ops, manifest),
    await gateC3(ops, manifest),
    await gateC4(ops, manifest),
    await gateC5(ops, manifest),
    await gateC6(ops, manifest),
  );

  const [c7, c8, c10] = await gateC7C8C10(ops, manifest);
  gates.push(c7, c8, c10);

  gates.push(
    await gateC9(ops, manifest),
    await gateC11(ops, manifest),
    await gateC12(ops, manifest),
    await gateC13(manifest),
    await gateC15(ops, manifest),
    await gateC16(manifest),
    await gateC17(ops, manifest),
    await gateC18(manifest),
  );

  gates.sort(gateOrder);

  return {
    package: manifest.package,
    domain: manifest.domain,
    contractVersion: CONTRACT_VERSION,
    gates,
    // `warn` is deliberately not fatal: it carries the deprecation window.
    ok: gates.every((gate) => gate.status !== "fail"),
  };
}

const SYMBOLS: Readonly<Record<GateStatus, string>> = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
  skip: "SKIP",
};

/** Render a report for a terminal. Returned rather than printed, so callers compose. */
export function formatReport(report: VerifyReport): string {
  const lines: string[] = [
    `${report.package}  (domain: ${report.domain}, contract ${report.contractVersion})`,
  ];
  for (const gate of report.gates) {
    lines.push(`  ${SYMBOLS[gate.status].padEnd(4)} ${gate.gate.padEnd(3)} ${gate.title.padEnd(20)} ${gate.summary}`);
    for (const detail of gate.details ?? []) {
      lines.push(`         - ${detail}`);
    }
  }
  const failed = report.gates.filter((gate) => gate.status === "fail").length;
  const warned = report.gates.filter((gate) => gate.status === "warn").length;
  lines.push(
    report.ok
      ? `  => conformant${warned > 0 ? ` (${String(warned)} warning(s))` : ""}`
      : `  => NOT conformant: ${String(failed)} gate(s) failed`,
  );
  return lines.join("\n");
}

/**
 * Convenience for packages that want the gates inside their own vitest run.
 * Returns one `[name, result]` pair per gate so a suite can assert per gate and
 * report them individually rather than as one opaque boolean.
 */
export function gateCases(report: VerifyReport): readonly (readonly [string, GateResult])[] {
  return report.gates.map((gate) => [`${gate.gate} ${gate.title}`, gate] as const);
}

/** Narrow a fixture list to those a given gate will actually exercise. */
export function lossyFixtures(manifest: ConformanceManifest): readonly ConformanceFixture[] {
  return manifest.fixtures.filter((fixture) => (fixture.losses?.length ?? 0) > 0);
}
