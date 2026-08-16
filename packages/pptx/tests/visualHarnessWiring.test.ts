import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertMatchingLiteRuntimeFingerprint } from "../../lite/scripts/runtime-fingerprint.mjs";

describe("visual regression harness wiring", () => {
  it.each(["visual", "eval:icp"])("rebuilds the lite bundle before %s", (scriptName) => {
    const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
    const packageJson = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };
    const visualScript = packageJson.scripts?.[scriptName] ?? "";
    const liteBuild = "pnpm --filter @runstamp/pptx build";
    const harnessRun = "tools/visual-regression/run.ts";

    expect(visualScript.indexOf(liteBuild)).toBeGreaterThanOrEqual(0);
    if (scriptName === "visual") {
      expect(visualScript.indexOf(harnessRun)).toBeGreaterThan(visualScript.indexOf(liteBuild));
    } else {
      expect(visualScript.indexOf("run-icp.mts")).toBeGreaterThan(visualScript.indexOf(liteBuild));
    }

    const harnessSource = readFileSync(
      `${repoRoot}/tools/visual-regression/run.ts`,
      "utf8",
    );
    expect(harnessSource).toContain('"../../packages/lite/dist-lite/index.js"');
  });

  it("rejects a deliberately stale lite runtime fingerprint", () => {
    expect(() => assertMatchingLiteRuntimeFingerprint("current", "stale"))
      .toThrow(/lite runtime is stale/i);
  });
});
