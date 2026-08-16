import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforcePublicRateLimit: vi.fn(),
  normalizeRenderRequest: vi.fn(),
  createRenderJob: vi.fn(),
  getRenderJobUrl: vi.fn((id: string) => `/api/v2/jobs/${id}`),
  updateRenderJobStatus: vi.fn(),
  recordRenderJobEvent: vi.fn(),
  upsertPreflightReport: vi.fn(),
  paperPreflight: vi.fn(),
  renderPoolRender: vi.fn(),
}));

vi.mock("@/lib/core/publicRateLimit", () => ({
  enforcePublicRateLimit: mocks.enforcePublicRateLimit,
}));

vi.mock("@/lib/pptx/normalizeDocument", () => ({
  normalizeRenderRequest: mocks.normalizeRenderRequest,
}));

vi.mock("@/lib/v2/jobs", () => ({
  createRenderJob: mocks.createRenderJob,
  getRenderJobUrl: mocks.getRenderJobUrl,
  updateRenderJobStatus: mocks.updateRenderJobStatus,
  recordRenderJobEvent: mocks.recordRenderJobEvent,
  upsertPreflightReport: mocks.upsertPreflightReport,
}));

vi.mock("@runstamp/pptx", () => ({
  PaperEngine: {
    preflight: mocks.paperPreflight,
  },
}));

vi.mock("@/lib/core/renderPool", () => ({
  renderPool: {
    render: mocks.renderPoolRender,
  },
}));

import { POST as postLegacyPreflight } from "../../../platform/app/api/preflight/route";
import { POST as postLegacyPreview } from "../../../platform/app/api/preview/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enforcePublicRateLimit.mockResolvedValue(null);
  mocks.createRenderJob.mockResolvedValue({ id: "job_legacy" });
  mocks.updateRenderJobStatus.mockResolvedValue(undefined);
  mocks.recordRenderJobEvent.mockResolvedValue(undefined);
  mocks.upsertPreflightReport.mockResolvedValue(undefined);
});

describe("legacy validation honesty", () => {
  it("blocks desktop_async on the legacy preflight route instead of downgrading it", async () => {
    mocks.normalizeRenderRequest.mockReturnValue({
      doc: {
        meta: { title: "Legacy deck" },
        slides: [{}],
      },
      validationIssues: undefined,
      renderOptions: {
        validationMode: "desktop_async",
      },
    });

    const response = await postLegacyPreflight(new Request("https://runstamp.com/api/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document: {
          title: "Legacy deck",
          slides: [{}],
        },
        validationMode: "desktop_async",
      }),
    }));

    const payload = await response.json();
    expect(response.status).toBe(501);
    expect(payload.error.message).toContain("desktop_async validation is not available");
    expect(payload.validationSummary).toMatchObject({
      requestedMode: "desktop_async",
      executedModes: [],
      deferredModes: ["desktop_async"],
      unsupportedModes: ["desktop_async"],
    });
    expect(mocks.paperPreflight).not.toHaveBeenCalled();
    expect(mocks.updateRenderJobStatus).toHaveBeenCalledWith("job_legacy", "failed", expect.objectContaining({
      errorCode: "ERR_UNSUPPORTED_VALIDATION_MODE",
    }));
  });

  it("blocks desktop_async on the preview route instead of silently rendering structurally", async () => {
    mocks.normalizeRenderRequest.mockReturnValue({
      doc: {
        meta: { title: "Legacy deck" },
        slides: [{}],
      },
      validationIssues: undefined,
      renderOptions: {
        validationMode: "desktop_async",
      },
      previewOptions: undefined,
    });

    const response = await postLegacyPreview(new Request("https://runstamp.com/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document: {
          title: "Legacy deck",
          slides: [{}],
        },
        validationMode: "desktop_async",
      }),
    }));

    const payload = await response.json();
    expect(response.status).toBe(501);
    expect(payload.error).toContain("desktop_async validation is not available");
    expect(payload.validationSummary).toMatchObject({
      requestedMode: "desktop_async",
      executedModes: [],
      deferredModes: ["desktop_async"],
      unsupportedModes: ["desktop_async"],
    });
    expect(mocks.renderPoolRender).not.toHaveBeenCalled();
  });
});
