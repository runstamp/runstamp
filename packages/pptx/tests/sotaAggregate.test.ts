import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MODULE_PATH = resolve(
  process.cwd(),
  "platform/app/lib/sotaLab/aggregate.ts",
);

async function importAggregateModule() {
  return import(pathToFileURL(MODULE_PATH).href);
}

function makeTargetResult(target: string, status: "passed" | "failed" | "error" | "skipped" | "unsupported") {
  return {
    target,
    required: true,
    status,
    startedAt: "2026-03-14T00:00:00.000Z",
    finishedAt: "2026-03-14T00:00:01.000Z",
    failureCount: status === "passed" || status === "skipped" ? 0 : 1,
    checks: [],
    artifactIds: [],
  };
}

describe("SOTA aggregate verdict", () => {
  it("passes when required targets pass or are skipped", async () => {
    const { computeSotaAggregateVerdict } = await importAggregateModule();

    const verdict = computeSotaAggregateVerdict(
      ["structural", "windows_chart_editability"],
      [
        makeTargetResult("structural", "passed"),
        makeTargetResult("windows_chart_editability", "skipped"),
      ],
    );

    expect(verdict).toBe("passed");
  });

  it("fails when a required target is unsupported", async () => {
    const { computeSotaAggregateVerdict } = await importAggregateModule();

    const verdict = computeSotaAggregateVerdict(
      ["windows_chart_editability"],
      [makeTargetResult("windows_chart_editability", "unsupported")],
    );

    expect(verdict).toBe("failed");
  });

  it("errors when a required target fails closed due to worker unavailability", async () => {
    const { computeSotaAggregateVerdict, normalizeSotaTargets } = await importAggregateModule();

    const verdict = computeSotaAggregateVerdict(
      normalizeSotaTargets(["structural", "windows_powerpoint", "windows_powerpoint"]),
      [
        makeTargetResult("structural", "passed"),
        makeTargetResult("windows_powerpoint", "error"),
      ],
    );

    expect(verdict).toBe("error");
  });
});
