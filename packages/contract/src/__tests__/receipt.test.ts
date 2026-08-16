import { afterEach, describe, expect, it } from "vitest";

import { buildReceipt } from "../receipt.js";
import {
  DEFAULT_DETERMINISTIC,
  isDeterministicModeEnabled,
  resetDeterministicMode,
  resolveOptions,
  setDeterministicMode,
} from "../options.js";
import { CONTRACT_VERSION } from "../version.js";
import { isPaperError } from "../errors.js";

const BASE = {
  operation: "pdf.render",
  domain: "pdf",
  engine: { name: "@runstamp/pdf", version: "0.4.4" },
  inputHash: `sha256:${"2".repeat(64)}`,
} as const;

afterEach(() => {
  resetDeterministicMode();
  delete process.env.RUNSTAMP_DETERMINISTIC;
});

describe("buildReceipt", () => {
  it("stamps the contract version, not a package version", () => {
    expect(buildReceipt({ ...BASE, options: { deterministic: true } }).contractVersion).toBe(
      CONTRACT_VERSION,
    );
  });

  it("omits producedAt entirely under determinism (R25)", () => {
    const receipt = buildReceipt({
      ...BASE,
      options: { deterministic: true },
      producedAt: "2026-08-12T00:00:00.000Z",
    });
    expect(receipt.deterministic).toBe(true);
    expect("producedAt" in receipt).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain("producedAt");
  });

  it("keeps producedAt when not deterministic", () => {
    const receipt = buildReceipt({
      ...BASE,
      options: { deterministic: false },
      nondeterminismSources: ["clock"],
      producedAt: "2026-08-12T00:00:00.000Z",
    });
    expect(receipt.producedAt).toBe("2026-08-12T00:00:00.000Z");
  });

  it("refuses a non-deterministic receipt with no named source (R26)", () => {
    let thrown: unknown;
    try {
      buildReceipt({ ...BASE, options: { deterministic: false } });
    } catch (error) {
      thrown = error;
    }
    expect(isPaperError(thrown)).toBe(true);
    expect((thrown as { code: string }).code).toBe("common/CONTRACT_VIOLATION");
  });

  it("refuses a deterministic receipt that names sources", () => {
    expect(() =>
      buildReceipt({
        ...BASE,
        options: { deterministic: true },
        nondeterminismSources: ["random"],
      }),
    ).toThrow(/cannot declare nondeterminism/i);
  });

  it("hashes effective options, so key order cannot change the hash", () => {
    const a = buildReceipt({ ...BASE, options: { deterministic: true, locale: "en-GB", timeoutMs: 5 } });
    const b = buildReceipt({ ...BASE, options: { timeoutMs: 5, locale: "en-GB", deterministic: true } });
    expect(a.optionsHash).toBe(b.optionsHash);
  });

  it("changes the options hash when an effective option changes", () => {
    const a = buildReceipt({ ...BASE, options: { deterministic: true, locale: "en-GB" } });
    const b = buildReceipt({ ...BASE, options: { deterministic: true, locale: "de-DE" } });
    expect(a.optionsHash).not.toBe(b.optionsHash);
  });

  it("ignores non-serializable options that cannot affect output bytes", () => {
    const withCallbacks = buildReceipt({
      ...BASE,
      options: { deterministic: true, onLoss: () => {}, onDiagnostic: () => {} },
    });
    const without = buildReceipt({ ...BASE, options: { deterministic: true } });
    expect(withCallbacks.optionsHash).toBe(without.optionsHash);
  });
});

describe("isDeterministicModeEnabled", () => {
  it("defaults to true, matching the three implementations it replaces", () => {
    expect(DEFAULT_DETERMINISTIC).toBe(true);
    expect(isDeterministicModeEnabled()).toBe(true);
    expect(isDeterministicModeEnabled({})).toBe(true);
  });

  it("prefers the explicit option over everything else (R28)", () => {
    process.env.RUNSTAMP_DETERMINISTIC = "0";
    setDeterministicMode(false);
    expect(isDeterministicModeEnabled({ deterministic: true })).toBe(true);
  });

  it("prefers the environment over the process default", () => {
    setDeterministicMode(true);
    process.env.RUNSTAMP_DETERMINISTIC = "false";
    expect(isDeterministicModeEnabled()).toBe(false);

    process.env.RUNSTAMP_DETERMINISTIC = "yes";
    expect(isDeterministicModeEnabled()).toBe(true);
  });

  it("ignores unrecognized environment values rather than guessing", () => {
    setDeterministicMode(false);
    process.env.RUNSTAMP_DETERMINISTIC = "perhaps";
    expect(isDeterministicModeEnabled()).toBe(false);
  });

  it("honors the preserved process-level mutator", () => {
    setDeterministicMode(false);
    expect(isDeterministicModeEnabled()).toBe(false);
    setDeterministicMode(true);
    expect(isDeterministicModeEnabled()).toBe(true);
  });
});

describe("resolveOptions", () => {
  it("applies defaults and drops non-serializable fields", () => {
    const effective = resolveOptions({ onLoss: () => {}, signal: new AbortController().signal });
    expect(effective).toEqual({ deterministic: true, lossPolicy: "collect" });
  });

  it("passes through the serializable options", () => {
    expect(
      resolveOptions({ locale: "fr-FR", timeoutMs: 100, deterministicSeed: "seed", limits: { maxPages: 2 } }),
    ).toEqual({
      deterministic: true,
      lossPolicy: "collect",
      locale: "fr-FR",
      timeoutMs: 100,
      deterministicSeed: "seed",
      limits: { maxPages: 2 },
    });
  });
});

describe("global determinism holder (bundler-duplication safety)", () => {
  const KEY = Symbol.for("paperjsx.deterministicMode.defaultManager");

  it("stores the default flag on the global symbol registry, not a module variable", () => {
    setDeterministicMode(false);
    const holder = (globalThis as Record<symbol, unknown>)[KEY] as {
      isDeterministicMode(): boolean;
    };
    expect(holder).toBeDefined();
    expect(holder.isDeterministicMode()).toBe(false);
  });

  it("observes a holder that another module instance installed first", () => {
    // Simulates packages/core's DeterministicModeManager already occupying the key,
    // which is exactly what happens when core loads before this package.
    const scope = globalThis as Record<symbol, unknown>;
    const previous = scope[KEY];
    let enabled = false;
    scope[KEY] = {
      setDeterministicMode(v: boolean) {
        enabled = v;
      },
      isDeterministicMode() {
        return enabled;
      },
    };
    try {
      expect(isDeterministicModeEnabled()).toBe(false);
      setDeterministicMode(true);
      expect(enabled).toBe(true);
      expect(isDeterministicModeEnabled()).toBe(true);
    } finally {
      scope[KEY] = previous;
    }
  });
});
