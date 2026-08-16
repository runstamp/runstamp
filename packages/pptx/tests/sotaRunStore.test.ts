import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const STORE_MODULE_PATH = resolve(
  process.cwd(),
  "platform/app/lib/sotaLab/store.ts",
);

async function importFreshStoreModule() {
  delete (globalThis as Record<string, unknown>).__sotaRunStore;
  vi.resetModules();
  return import(pathToFileURL(STORE_MODULE_PATH).href);
}

const tempDirs: string[] = [];

afterEach(async () => {
  delete process.env.RUNSTAMP_SOTA_RECORD_BACKEND;
  delete process.env.RUNSTAMP_SOTA_RECORDS_DIR;
  delete (globalThis as Record<string, unknown>).__sotaRunStore;

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("SOTA run store", () => {
  it("persists runs, artifacts, and previous-run lookup", async () => {
    const recordsDir = await mkdtemp(join(tmpdir(), "runstamp-sota-runs-"));
    tempDirs.push(recordsDir);
    process.env.RUNSTAMP_SOTA_RECORD_BACKEND = "filesystem";
    process.env.RUNSTAMP_SOTA_RECORDS_DIR = recordsDir;

    const { sotaRunStore } = await importFreshStoreModule();

    const baseDraft = {
      source: {
        kind: "fixture" as const,
        key: "fixture:classic-chart",
        displayName: "Classic chart baseline",
        fixtureId: "classic-chart",
      },
      startedAt: "2026-03-14T01:00:00.000Z",
      finishedAt: "2026-03-14T01:00:05.000Z",
      render: {
        mode: "rendered" as const,
        deckName: "Classic chart baseline",
        pptxByteLength: 128,
        slideCount: 1,
        previewCount: 1,
        chartInventory: {
          hasCharts: true,
          totalCount: 1,
          supportedCount: 1,
          unsupportedCount: 0,
          items: [],
        },
      },
      requiredTargets: ["structural", "windows_powerpoint"] as const,
      targetResults: [],
      notes: [],
      artifacts: [
        {
          id: "generated_pptx",
          label: "Generated PPTX",
          fileName: "generated.pptx",
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          buffer: Buffer.from("pptx"),
        },
      ],
    };

    const first = await sotaRunStore.save({
      ...baseDraft,
      id: "run-1",
      aggregateVerdict: "passed" as const,
    });

    const second = await sotaRunStore.save({
      ...baseDraft,
      id: "run-2",
      startedAt: "2026-03-14T02:00:00.000Z",
      finishedAt: "2026-03-14T02:00:05.000Z",
      aggregateVerdict: "failed" as const,
      comparison: {
        previousRunId: "run-1",
        previousAggregateVerdict: "passed",
        previousFinishedAt: "2026-03-14T01:00:05.000Z",
        changed: true,
      },
    });

    expect(first.recordUrl).toBe("/api/sota-lab/runs/run-1");
    expect(second.artifacts[0]?.url).toBe("/api/sota-lab/runs/run-2/artifacts/generated_pptx");

    const loaded = await sotaRunStore.get("run-2");
    expect(loaded?.comparison?.previousRunId).toBe("run-1");

    const artifact = await sotaRunStore.readArtifact("run-2", "generated_pptx");
    expect(artifact?.buffer.toString("utf8")).toBe("pptx");

    const previous = await sotaRunStore.findPreviousBySourceKey("fixture:classic-chart", "run-2");
    expect(previous?.id).toBe("run-1");
  });
});
