/**
 * Negative controls for the conformance kit.
 *
 * Every gate here is handed a surface that deliberately violates it, and the
 * assertion is that the gate goes red. This is the D5 rule applied to the gate
 * runner itself: a deliberately-broken fixture MUST fail, or the gate is dead and
 * a green `contract:verify` means nothing.
 *
 * Surfaces are synthesised as `data:` modules so the controls need no build step
 * and no engine — the kit only ever sees a module specifier.
 */

import { describe, expect, it } from "vitest";

import { gateC17, gateC18, gateC7C8C10 } from "../verify/gates.js";
import { verifyPackage } from "../verify/index.js";
import type { ConformanceFixture, ConformanceManifest, GateId, VerifyReport } from "../verify/types.js";

/** Build an importable ESM module from source text. */
function moduleUrl(source: string): string {
  return `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
}

/**
 * A minimal conformant `render`, used as the baseline every control mutates.
 * Written as source text because it must be importable in a fresh process too.
 */
const CONFORMANT = `
import { runOperation, createArtifactBytes, MEDIA_TYPES, hashValue } from ${JSON.stringify(
  new URL("../../dist/index.js", import.meta.url).href,
)};

export async function render(input, options) {
  let cached;
  const inputHash = () => (cached ??= hashValue(input));
  return runOperation({
    operation: "pdf.render",
    domain: "pdf",
    engine: { name: "control", version: "0.0.0" },
    inputHash,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      if (input === null || typeof input !== "object") {
        throw Object.assign(new Error("Not a document."), { code: "SCHEMA_REJECTED" });
      }
      LOSS_HOOK
      const value = createArtifactBytes(
        Buffer.from("%PDF-1.7 " + JSON.stringify(input)),
        MEDIA_TYPES.pdf,
        "pdf",
      );
      return { value, outputHash: value.hash };
    },
  });
}
`;

function surface(lossHook = ""): string {
  return CONFORMANT.replace("LOSS_HOOK", lossHook);
}

function manifest(overrides: Partial<ConformanceManifest> & { ops: string }): ConformanceManifest {
  return {
    package: "@runstamp/control",
    domain: "pdf",
    fixtures: [
      {
        name: "clean",
        operation: "pdf.render",
        kind: "nominal",
        verb: "render",
        input: { title: "ok" },
        expect: "ok",
        lossFree: true,
      },
    ],
    ...overrides,
  };
}

function gate(report: VerifyReport, id: GateId) {
  const found = report.gates.find((candidate) => candidate.gate === id);
  if (found === undefined) throw new Error(`gate ${id} missing from report`);
  return found;
}

describe("the kit passes a conformant surface", () => {
  it("reports every gate green for a correct implementation", async () => {
    const report = await verifyPackage(manifest({ ops: moduleUrl(surface()) }));
    const failures = report.gates.filter((candidate) => candidate.status === "fail");
    expect(failures.map((candidate) => `${candidate.gate}: ${candidate.summary}`)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("moves large fixture payloads across the clean-process boundary without argv limits", async () => {
    const opsUrl = moduleUrl(surface());
    const largeManifest = manifest({
      ops: opsUrl,
      fixtures: [{
        name: "large-clean-process-payload",
        operation: "pdf.render",
        kind: "boundary",
        verb: "render",
        input: { body: "x".repeat(3 * 1024 * 1024) },
        expect: "ok",
        lossFree: true,
      }],
    });
    const ops = await import(opsUrl);
    const results = await gateC7C8C10(ops, largeManifest);

    expect(results.map((candidate) => candidate.status)).toEqual(["pass", "pass", "pass"]);
  });
});

describe("C18 operation-level fixture coverage", () => {
  function coverageManifest(
    descriptors: readonly Record<string, unknown>[],
    fixtures: readonly ConformanceFixture[],
  ): ConformanceManifest {
    return manifest({
      ops: moduleUrl(surface()),
      descriptor: moduleUrl(`export default ${JSON.stringify(descriptors)};`),
      fixtures,
    });
  }

  function fixture(
    name: string,
    operation: ConformanceFixture["operation"],
    kind: ConformanceFixture["kind"],
    options?: ConformanceFixture["options"],
  ): ConformanceFixture {
    return { name, operation, kind, verb: "inspect", input: {}, options, expect: "ok" };
  }

  const qualified = [
    {
      name: "pdf.inspect.form",
      verb: "inspect",
      stability: "stable",
      qualifier: { option: "operation", value: "form" },
    },
    {
      name: "pdf.inspect.signatures",
      verb: "inspect",
      stability: "stable",
      qualifier: { option: "operation", value: "signatures" },
    },
  ] as const;

  it("passes only when every stable descriptor has nominal, hostile, and boundary evidence", async () => {
    const fixtures = qualified.flatMap((descriptor) =>
      (["nominal", "hostile", "boundary"] as const).map((kind) =>
        fixture(
          `${descriptor.qualifier.value}-${kind}`,
          descriptor.name,
          kind,
          { operation: descriptor.qualifier.value },
        ),
      ),
    );

    const result = await gateC18(coverageManifest(qualified, fixtures));
    expect(result.status).toBe("pass");
  });

  it("fails when a stable descriptor is missing hostile or boundary evidence", async () => {
    const result = await gateC18(
      coverageManifest(
        [qualified[0]],
        [fixture("form-nominal", "pdf.inspect.form", "nominal", { operation: "form" })],
      ),
    );

    expect(result.status).toBe("fail");
    expect(result.details?.join(" ")).toContain("missing hostile");
    expect(result.details?.join(" ")).toContain("missing boundary");
  });

  it("fails a fixture that claims one operation but dispatches to its sibling", async () => {
    const result = await gateC18(
      coverageManifest(qualified, [
        fixture("wrong-claim", "pdf.inspect.form", "nominal", { operation: "signatures" }),
      ]),
    );

    expect(result.status).toBe("fail");
    expect(result.details?.join(" ")).toContain(
      'claims "pdf.inspect.form" but its verb and qualifier options resolve to "pdf.inspect.signatures"',
    );
  });

  it("fails missing kinds and qualifier options that resolve ambiguously", async () => {
    const ambiguous = [
      {
        name: "pdf.inspect.form",
        verb: "inspect",
        stability: "experimental",
        qualifier: { option: "operation", value: "form" },
      },
      {
        name: "pdf.inspect.signatures",
        verb: "inspect",
        stability: "experimental",
        qualifier: { option: "selector", value: "signatures" },
      },
    ] as const;
    const missingKind = {
      name: "missing-kind",
      operation: "pdf.inspect.form",
      verb: "inspect",
      input: {},
      options: { operation: "form" },
      expect: "ok",
    } as unknown as ConformanceFixture;
    const result = await gateC18(
      coverageManifest(ambiguous, [
        missingKind,
        fixture("ambiguous", "pdf.inspect.form", "nominal", {
          operation: "form",
          selector: "signatures",
        }),
      ]),
    );

    expect(result.status).toBe("fail");
    expect(result.details?.join(" ")).toContain("fixture kind must be");
    expect(result.details?.join(" ")).toContain("ambiguously resolve");
  });
});

describe("C17 exact receipt identity", () => {
  it("fails when qualifier dispatch returns a registered sibling operation", async () => {
    const descriptor = moduleUrl(`export default [
      { name: "pdf.render", verb: "render" },
      { name: "pdf.render.preview", verb: "render" }
    ];`);
    const ops = await import(moduleUrl(surface()));
    const report = await gateC17(
      ops,
      manifest({
        ops: moduleUrl(surface()),
        descriptor,
        fixtures: [{
          name: "preview",
          operation: "pdf.render.preview",
          kind: "nominal",
          verb: "render",
          input: {},
          options: { operation: "preview" },
          expect: "ok",
        }],
      }),
    );

    expect(report.status).toBe("fail");
    expect(report.details?.join(" ")).toContain("Qualifier dispatch reached the wrong operation");
  });
});

describe("negative controls — each gate fails when its rule is broken", () => {
  it("C1 fails when an operation takes more than two parameters", async () => {
    const report = await verifyPackage(
      manifest({ ops: moduleUrl(`export async function render(a, b, c) { return {}; }`) }),
    );
    expect(gate(report, "C1").status).toBe("fail");
  });

  it("C14 fails when a non-verb is exported", async () => {
    const report = await verifyPackage(
      manifest({ ops: moduleUrl(`${surface()}\nexport function renderPdf() {}`) }),
    );
    expect(gate(report, "C14").status).toBe("fail");
    expect(gate(report, "C14").details?.join(" ")).toContain("renderPdf");
  });

  it("C14 fails when a constant is exported", async () => {
    const report = await verifyPackage(
      manifest({ ops: moduleUrl(`${surface()}\nexport const VERSION = "1";`) }),
    );
    expect(gate(report, "C14").status).toBe("fail");
  });

  it("C2 fails when the envelope is malformed", async () => {
    const report = await verifyPackage(
      manifest({ ops: moduleUrl(`export async function render() { return { ok: true }; }`) }),
    );
    expect(gate(report, "C2").status).toBe("fail");
  });

  it("C4 fails when a failure carries no remediation", async () => {
    const ops = moduleUrl(`
      export async function render() {
        return { ok: false, losses: [], diagnostics: [],
          error: { code: "pdf/BROKEN", remediation: "", toJSON() { return this; } } };
      }
    `);
    const report = await verifyPackage(
      manifest({
        ops,
        fixtures: [{ name: "bad", operation: "pdf.render", kind: "hostile", verb: "render", input: {}, expect: "fail" }],
      }),
    );
    expect(gate(report, "C4").status).toBe("fail");
  });

  it("C6 fails when a hostile input throws instead of returning", async () => {
    const ops = moduleUrl(`
      export async function render(input) {
        if (input === undefined) throw new TypeError("boom");
        return { ok: true, value: null, losses: [], diagnostics: [], receipt: {} };
      }
    `);
    const report = await verifyPackage(manifest({ ops }));
    expect(gate(report, "C6").status).toBe("fail");
    expect(gate(report, "C6").details?.join(" ")).toContain("undefined");
  });

  it("C11 fails when a declared loss never appears — the silent-loss case", async () => {
    const report = await verifyPackage(
      manifest({
        ops: moduleUrl(surface()),
        fixtures: [
          { name: "clean", operation: "pdf.render", kind: "nominal", verb: "render", input: { title: "ok" }, expect: "ok", lossFree: true },
          {
            name: "lossy",
            operation: "pdf.render",
            kind: "boundary",
            verb: "render",
            input: { title: "lossy" },
            expect: "ok",
            losses: [{ code: "pdf/TEXT_GLYPH_MISSING", severity: "dropped" }],
          },
        ],
      }),
    );
    expect(gate(report, "C11").status).toBe("fail");
    expect(gate(report, "C11").details?.join(" ")).toContain("silent-loss");
  });

  it("C11 fails on a false positive in a supposedly clean render", async () => {
    const hook = `context.addLoss({ code: "pdf/SPURIOUS", severity: "degraded",
      subject: "text", message: "not really lost", avoidable: false });`;
    const report = await verifyPackage(manifest({ ops: moduleUrl(surface(hook)) }));
    expect(gate(report, "C11").status).toBe("fail");
    expect(gate(report, "C11").details?.join(" ")).toContain("false positives");
  });

  it("C11 fails when no fixture asserts a clean ledger at all", async () => {
    const report = await verifyPackage(
      manifest({
        ops: moduleUrl(surface()),
        fixtures: [{ name: "clean", operation: "pdf.render", kind: "nominal", verb: "render", input: { title: "ok" }, expect: "ok" }],
      }),
    );
    expect(gate(report, "C11").status).toBe("fail");
    expect(gate(report, "C11").details?.join(" ")).toContain("lossFree");
  });

  it("C11 fails when an avoidable loss names no remediation (R19)", async () => {
    const hook = `context.addLoss({ code: "pdf/AVOIDABLE", severity: "degraded",
      subject: "text", message: "lost", avoidable: true });`;
    const report = await verifyPackage(
      manifest({
        ops: moduleUrl(surface(hook)),
        fixtures: [
          { name: "clean", operation: "pdf.render", kind: "nominal", verb: "render", input: { a: 1 }, expect: "ok" },
          {
            name: "avoidable",
            operation: "pdf.render",
            kind: "boundary",
            verb: "render",
            input: { title: "x" },
            expect: "ok",
            losses: [{ code: "pdf/AVOIDABLE", severity: "degraded" }],
          },
          { name: "empty", operation: "pdf.render", kind: "boundary", verb: "render", input: { b: 2 }, expect: "ok" },
        ],
      }),
    );
    expect(gate(report, "C11").details?.join(" ")).toContain("R19");
  });

  it("C15 fails when an aborted signal is ignored", async () => {
    const ops = moduleUrl(`
      export async function render() {
        return { ok: true, value: null, losses: [], diagnostics: [],
                 receipt: { deterministic: true, nondeterminismSources: [] } };
      }
    `);
    const report = await verifyPackage(manifest({ ops }));
    expect(gate(report, "C15").status).toBe("fail");
  });

  it("C5 fails when the engine emits an unclassified code", async () => {
    const report = await verifyPackage(
      manifest({
        ops: moduleUrl(surface()),
        codeScan: {
          files: [new URL("./verify.test.ts", import.meta.url).pathname],
          // Matches the sample below, which is deliberately absent from `classified`.
          pattern: String.raw`\bcode:\s*"(PDF_[A-Z0-9_]+)"`,
          classified: ["PDF_KNOWN"],
        },
      }),
    );
    expect(gate(report, "C5").status).toBe("fail");
    // Sample the scanner finds in this very file: code: "PDF_UNCLASSIFIED_SAMPLE"
  });

  it("C5 fails when an operation emits a loss code its descriptor never declares", async () => {
    // The projection-integrity half of C5: an MCP tool advertises `lossCodes`,
    // so a code emitted outside that list is one no consumer was told to expect.
    const hook = `context.addLoss({ code: "pdf/UNDECLARED", severity: "degraded",
      subject: "text", message: "lost", avoidable: false });`;
    const descriptor = moduleUrl(`
      export default [{
        name: "pdf.render", domain: "pdf", verb: "render", summary: "s",
        inputSchema: {}, optionsSchema: {}, valueSchema: {},
        errorCodes: ["common/SCHEMA_REJECTED"], lossCodes: ["pdf/EXPECTED_ONLY"],
        deterministic: true, sideEffects: "none", stability: "stable",
      }];
    `);
    const report = await verifyPackage(
      manifest({
        ops: moduleUrl(surface(hook)),
        descriptor,
        fixtures: [
          { name: "clean", operation: "pdf.render", kind: "nominal", verb: "render", input: { a: 1 }, expect: "ok" },
          { name: "lossy", operation: "pdf.render", kind: "boundary", verb: "render", input: { b: 2 }, expect: "ok" },
        ],
      }),
    );
    expect(gate(report, "C5").status).toBe("fail");
    expect(gate(report, "C5").details?.join(" ")).toContain("pdf/UNDECLARED");
  });

  it("C5 passes when every emitted code is declared", async () => {
    const hook = `context.addLoss({ code: "pdf/DECLARED", severity: "degraded",
      subject: "text", message: "lost", avoidable: false });`;
    const descriptor = moduleUrl(`
      export default [{
        name: "pdf.render", domain: "pdf", verb: "render", summary: "s",
        inputSchema: {}, optionsSchema: {}, valueSchema: {},
        errorCodes: ["common/SCHEMA_REJECTED"], lossCodes: ["pdf/DECLARED"],
        deterministic: true, sideEffects: "none", stability: "stable",
      }];
    `);
    const report = await verifyPackage(
      manifest({
        ops: moduleUrl(surface(hook)),
        descriptor,
        fixtures: [{ name: "lossy", operation: "pdf.render", kind: "nominal", verb: "render", input: { b: 2 }, expect: "ok" }],
      }),
    );
    expect(gate(report, "C5").status).toBe("pass");
  });

  it("C13 fails on a deny-listed export on ./ops but only warns on the root", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "oc1-c13-"));

    const opsDts = join(dir, "ops.d.ts");
    const rootDts = join(dir, "root.d.ts");
    writeFileSync(opsDts, "export declare function analyzePhase6Document(): void;\n");
    writeFileSync(rootDts, "export declare function render(): void;\n");

    const onOps = await verifyPackage(
      manifest({ ops: moduleUrl(surface()), surfaces: { ops: opsDts, root: rootDts } }),
    );
    expect(gate(onOps, "C13").status).toBe("fail");

    writeFileSync(opsDts, "export declare function render(): void;\n");
    writeFileSync(rootDts, "export declare function analyzePhase6Document(): void;\n");
    const onRoot = await verifyPackage(
      manifest({ ops: moduleUrl(surface()), surfaces: { ops: opsDts, root: rootDts } }),
    );
    // The deprecation window: reported, but not a merge blocker.
    expect(gate(onRoot, "C13").status).toBe("warn");
    expect(onRoot.ok).toBe(true);
  });

  it("C16 fails when the committed API report is missing", async () => {
    const report = await verifyPackage(
      manifest({ ops: moduleUrl(surface()), apiReport: "/nonexistent/api.md" }),
    );
    expect(gate(report, "C16").status).toBe("fail");
  });

  it("reports every gate red when the surface cannot be imported at all", async () => {
    const report = await verifyPackage(manifest({ ops: "file:///definitely/not/here.js" }));
    expect(report.ok).toBe(false);
    expect(report.gates.every((candidate) => candidate.status === "fail")).toBe(true);
  });
});
