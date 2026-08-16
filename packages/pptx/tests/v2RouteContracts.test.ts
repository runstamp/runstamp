import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRuntimeAccessContext: vi.fn(),
  normalizeRenderRequest: vi.fn(),
  resolveBrandPackContext: vi.fn(),
  compileProtocolDocumentFromPayload: vi.fn(),
  applyBrandComplianceToQualityReport: vi.fn(),
  createRenderJob: vi.fn(),
  getRenderJobUrl: vi.fn((id: string) => `/api/v2/jobs/${id}`),
  recordRenderJobEvent: vi.fn(),
  updateRenderJobStatus: vi.fn(),
  upsertPreflightReport: vi.fn(),
  createQueuedRenderJob: vi.fn(),
  enqueueRenderJob: vi.fn(),
  processQueuedRenderJob: vi.fn(),
  getRenderJobForOrg: vi.fn(),
  listRenderJobsForOrg: vi.fn(),
  getRenderJobApprovalDetails: vi.fn(),
  getRenderJobArtifactInventory: vi.fn(),
  getRenderJobBrandComplianceSummary: vi.fn(),
  getRenderJobDiffSummary: vi.fn(),
  getRenderJobFindingDelta: vi.fn(),
  getRenderJobFindingSummary: vi.fn(),
  getRenderJobPolicySummary: vi.fn(),
  getRenderJobPreflightSummary: vi.fn(),
  getRenderJobValidationSummary: vi.fn(),
  readRenderArtifactBinary: vi.fn(),
  storeRenderJobArtifact: vi.fn(),
  findBaselineDiffArtifact: vi.fn(),
  findSlidePreviewArtifact: vi.fn(),
  updateRenderJobApproval: vi.fn(),
  getBrandPackDetailForOrg: vi.fn(),
  listBrandPackFeedbackRecordsForBrandPack: vi.fn(),
  listPptxSyncSessionsForOrg: vi.fn(),
  listSyncReviewItemsForSession: vi.fn(),
  listUserIdentitiesForOrg: vi.fn(),
  listWorkflowDefinitionsForOrg: vi.fn(),
  actorLabel: vi.fn(() => null),
  diffSlidePreviews: vi.fn(),
  paperPreflight: vi.fn(),
  diffNormalizedPackages: vi.fn(),
}));

vi.mock("@/lib/auth/runtimeAccess", () => ({
  getRuntimeAccessContext: mocks.getRuntimeAccessContext,
}));

vi.mock("@/lib/pptx/normalizeDocument", () => ({
  normalizeRenderRequest: mocks.normalizeRenderRequest,
}));

vi.mock("@/lib/v2/brandPacks", () => ({
  resolveBrandPackContext: mocks.resolveBrandPackContext,
  getBrandPackDetailForOrg: mocks.getBrandPackDetailForOrg,
}));

vi.mock("@/lib/v2/protocol", () => ({
  compileProtocolDocumentFromPayload: mocks.compileProtocolDocumentFromPayload,
}));

vi.mock("@/lib/v2/quality", () => ({
  applyBrandComplianceToQualityReport: mocks.applyBrandComplianceToQualityReport,
}));

vi.mock("@/lib/v3/store", () => ({
  listBrandPackFeedbackRecordsForBrandPack: mocks.listBrandPackFeedbackRecordsForBrandPack,
  listPptxSyncSessionsForOrg: mocks.listPptxSyncSessionsForOrg,
  listSyncReviewItemsForSession: mocks.listSyncReviewItemsForSession,
  listUserIdentitiesForOrg: mocks.listUserIdentitiesForOrg,
  listWorkflowDefinitionsForOrg: mocks.listWorkflowDefinitionsForOrg,
}));

vi.mock("@/lib/v3/reviewAccess", () => ({
  actorLabel: mocks.actorLabel,
}));

vi.mock("@/lib/v2/runtime", () => ({
  createQueuedRenderJob: mocks.createQueuedRenderJob,
  enqueueRenderJob: mocks.enqueueRenderJob,
  processQueuedRenderJob: mocks.processQueuedRenderJob,
}));

vi.mock("@/lib/v2/diff", () => ({
  diffSlidePreviews: mocks.diffSlidePreviews,
}));

vi.mock("@/lib/v2/jobs", () => ({
  createRenderJob: mocks.createRenderJob,
  getRenderJobUrl: mocks.getRenderJobUrl,
  recordRenderJobEvent: mocks.recordRenderJobEvent,
  updateRenderJobStatus: mocks.updateRenderJobStatus,
  upsertPreflightReport: mocks.upsertPreflightReport,
  getRenderJobForOrg: mocks.getRenderJobForOrg,
  listRenderJobsForOrg: mocks.listRenderJobsForOrg,
  getRenderJobApprovalDetails: mocks.getRenderJobApprovalDetails,
  getRenderJobArtifactInventory: mocks.getRenderJobArtifactInventory,
  getRenderJobBrandComplianceSummary: mocks.getRenderJobBrandComplianceSummary,
  getRenderJobDiffSummary: mocks.getRenderJobDiffSummary,
  getRenderJobFindingDelta: mocks.getRenderJobFindingDelta,
  getRenderJobFindingSummary: mocks.getRenderJobFindingSummary,
  getRenderJobPolicySummary: mocks.getRenderJobPolicySummary,
  getRenderJobPreflightSummary: mocks.getRenderJobPreflightSummary,
  getRenderJobValidationSummary: mocks.getRenderJobValidationSummary,
  readRenderArtifactBinary: mocks.readRenderArtifactBinary,
  storeRenderJobArtifact: mocks.storeRenderJobArtifact,
  findBaselineDiffArtifact: mocks.findBaselineDiffArtifact,
  findSlidePreviewArtifact: mocks.findSlidePreviewArtifact,
  updateRenderJobApproval: mocks.updateRenderJobApproval,
}));

vi.mock("@runstamp/pptx", () => ({
  PaperEngine: {
    preflight: mocks.paperPreflight,
  },
  diffNormalizedPackages: mocks.diffNormalizedPackages,
}));

import { POST as postPreflight } from "../../../platform/app/api/v2/preflight/route";
import { POST as postRender } from "../../../platform/app/api/v2/render/route";
import { GET as getJob } from "../../../platform/app/api/v2/jobs/[id]/route";
import { GET as getDiff } from "../../../platform/app/api/v2/jobs/[id]/diff/route";
import { POST as postApproval } from "../../../platform/app/api/v2/jobs/[id]/approval/route";
import { GET as getBrandPack } from "../../../platform/app/api/v2/brand-packs/[id]/route";

const authContext = {
  context: {
    org: { id: "org_1" },
    apiKeyId: "key_1",
    userId: "user_1",
  },
  response: null,
};

const qualityReport = {
  deckScore: 87,
  documentVerdict: "pass",
  findings: [
    {
      code: "BRAND_TOKEN_MISSING",
      severity: "warning",
      category: "brand",
      slideIndex: 0,
      componentPath: "slides.0.title",
      blocking: false,
      machineFixHint: "Attach the active brand pack version.",
      recommendedAction: "Choose a certified brand pack version before render.",
      message: "No approved title font was resolved.",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRuntimeAccessContext.mockResolvedValue(authContext);
  mocks.getRenderJobApprovalDetails.mockReturnValue({
    latest: {
      status: "needs_review",
      actorId: "user_1",
      actorType: "user",
      note: null,
      createdAt: "2026-03-14T00:00:00.000Z",
    },
    history: [
      {
        status: "needs_review",
        actorId: "user_1",
        actorType: "user",
        note: null,
        createdAt: "2026-03-14T00:00:00.000Z",
      },
    ],
  });
  mocks.getRenderJobDiffSummary.mockReturnValue({
    totalSlides: 1,
    changedSlides: 1,
    unchangedSlides: 0,
    addedSlides: 0,
    removedSlides: 0,
    baselineJobId: "job_base",
  });
  mocks.listRenderJobsForOrg.mockResolvedValue([]);
  mocks.getRenderJobArtifactInventory.mockReturnValue({
    totalArtifacts: 2,
    countsByKind: { preview_png: 1, generated_pptx: 1 },
  });
  mocks.getRenderJobBrandComplianceSummary.mockReturnValue({
    compliant: true,
    findingCount: 0,
  });
  mocks.getRenderJobFindingDelta.mockReturnValue([
    {
      code: "BRAND_TOKEN_MISSING",
      currentCount: 1,
      baselineCount: 0,
      delta: 1,
      currentBlockingCount: 0,
      baselineBlockingCount: 0,
    },
  ]);
  mocks.getRenderJobPreflightSummary.mockReturnValue({
    deckScore: 87,
    documentVerdict: "pass",
    fallbackCount: 1,
    findingCount: 1,
  });
  mocks.getRenderJobFindingSummary.mockReturnValue({
    totalCount: 1,
    blockingCount: 0,
    advisoryCount: 1,
    bySeverity: {
      warning: 1,
    },
    nextActions: ["Choose a certified brand pack version before render."],
    topBlocking: [],
    topAdvisories: [
      {
        code: "BRAND_TOKEN_MISSING",
        slideLabel: "Slide 1",
        componentPath: "slides.0.title",
        message: "No approved title font was resolved.",
        recommendedAction: "Choose a certified brand pack version before render.",
      },
    ],
  });
  mocks.listBrandPackFeedbackRecordsForBrandPack.mockResolvedValue([]);
  mocks.listPptxSyncSessionsForOrg.mockResolvedValue([]);
  mocks.listSyncReviewItemsForSession.mockResolvedValue([]);
  mocks.listUserIdentitiesForOrg.mockResolvedValue([]);
  mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([]);
  mocks.getRenderJobPolicySummary.mockReturnValue({
    blocking: false,
    reasons: [],
    nextActions: [],
    unsupportedModes: [],
    validationMode: "structural",
  });
  mocks.getRenderJobValidationSummary.mockReturnValue({
    requestedValidationMode: "structural",
    validationRecordUrl: null,
    desktopValidationStatus: "not_run",
    validationSummary: {
      requestedMode: "structural",
      executedModes: ["structural"],
      deferredModes: [],
      reason: null,
    },
  });
});

describe("V2 route contracts", () => {
  it("returns a stable preflight payload with quality findings and brand compliance", async () => {
    const compiledDoc = {
      meta: { title: "Protocol deck" },
      slides: [{}],
    };
    mocks.normalizeRenderRequest.mockReturnValue({
      doc: compiledDoc,
      renderOptions: { validationMode: "structural" },
      previewOptions: undefined,
    });
    mocks.resolveBrandPackContext.mockResolvedValue({
      brandPack: { archetypes: [], assets: [{ name: "wordmark.svg" }] },
      version: { id: "bpv_1" },
      buffer: Buffer.from("template"),
    });
    mocks.compileProtocolDocumentFromPayload.mockReturnValue({
      ...compiledDoc,
      template: Buffer.from("template"),
    });
    mocks.createRenderJob.mockResolvedValue({ id: "job_preflight" });
    mocks.paperPreflight.mockResolvedValue(qualityReport);
    mocks.applyBrandComplianceToQualityReport.mockReturnValue({
      qualityReport,
      brandCompliance: {
        compliant: false,
        findingCount: 1,
        summary: "One brand finding requires review.",
      },
    });

    const response = await postPreflight(new Request("https://runstamp.com/api/v2/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceSchema: "protocol_v2",
        brandPackId: "brand_1",
        preflightPolicy: { autoFix: "suggest_only" },
        document: {
          version: "2.0",
          title: "Protocol deck",
          slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }],
        },
      }),
    }));

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.job_id).toBe("job_preflight");
    expect(payload.data.job_url).toBe("/api/v2/jobs/job_preflight");
    expect(payload.data.quality_report.findings[0]).toMatchObject({
      code: "BRAND_TOKEN_MISSING",
      severity: "warning",
      category: "brand",
      slideIndex: 0,
      componentPath: "slides.0.title",
      blocking: false,
      machineFixHint: expect.any(String),
      recommendedAction: expect.any(String),
    });
    expect(payload.data.brand_compliance).toMatchObject({
      compliant: false,
      findingCount: 1,
    });
    expect(payload.data.policyResult).toMatchObject({
      allowedToRender: true,
      blocking: false,
      validationMode: "structural",
    });
    expect(payload.data.validationSummary).toMatchObject({
      requestedMode: "structural",
      executedModes: ["structural"],
      deferredModes: [],
    });
  });

  it("returns a durable blocked decision for unsupported preflight validation modes", async () => {
    mocks.normalizeRenderRequest.mockReturnValue({
      doc: {
        meta: { title: "Unsupported validation deck" },
        slides: [{}],
      },
      renderOptions: { validationMode: "desktop_async" },
      previewOptions: undefined,
    });
    mocks.createRenderJob.mockResolvedValue({ id: "job_preflight_blocked" });

    const response = await postPreflight(new Request("https://runstamp.com/api/v2/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceSchema: "protocol_v2",
        document: {
          version: "2.0",
          title: "Unsupported validation deck",
          slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }],
        },
        renderOptions: {
          validationMode: "desktop_async",
        },
      }),
    }));

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.status).toBe("blocked");
    expect(payload.data.policyResult).toMatchObject({
      allowedToRender: false,
      blocking: true,
      validationMode: "desktop_async",
      unsupportedModes: ["desktop_async"],
    });
    expect(payload.data.validationSummary).toMatchObject({
      requestedMode: "desktop_async",
      executedModes: [],
      deferredModes: ["desktop_async"],
    });
    expect(mocks.updateRenderJobStatus).toHaveBeenCalledWith("job_preflight_blocked", "failed", expect.objectContaining({
      errorCode: "ERR_UNSUPPORTED_VALIDATION_MODE",
    }));
  });

  it("returns a stable sync render payload", async () => {
    mocks.createQueuedRenderJob.mockResolvedValue({ id: "job_sync" });
    mocks.processQueuedRenderJob.mockResolvedValue({
      id: "job_sync",
      status: "succeeded",
      download_url: "https://cdn.runstamp.com/render/job_sync.pptx",
      preview_url: "https://cdn.runstamp.com/render/job_sync.png",
      validation_record_url: "https://cdn.runstamp.com/render/job_sync.validation.json",
      quality_report: qualityReport,
      metadata: {
        brandCompliance: {
          compliant: true,
          findingCount: 0,
        },
        validationSummary: {
          requestedMode: "desktop_blocking",
          executedModes: ["structural", "desktop_blocking"],
          deferredModes: [],
          reason: "desktop validation was deferred during preflight and then executed during render-backed validation.",
        },
      },
    });

    const response = await postRender(new Request("https://runstamp.com/api/v2/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceSchema: "protocol_v2",
        mode: "sync",
        document: {
          version: "2.0",
          title: "Protocol deck",
          slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }],
        },
      }),
    }));

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      job_id: "job_sync",
      job_url: "/api/v2/jobs/job_sync",
      download_url: "https://cdn.runstamp.com/render/job_sync.pptx",
      preview_url: "https://cdn.runstamp.com/render/job_sync.png",
    });
    expect(payload.data.quality_report.findings[0].code).toBe("BRAND_TOKEN_MISSING");
    expect(payload.data.brand_compliance.compliant).toBe(true);
    expect(payload.data.validationSummary).toMatchObject({
      requestedMode: "desktop_blocking",
      executedModes: ["structural", "desktop_blocking"],
      deferredModes: [],
    });
  });

  it("returns a queued async render payload", async () => {
    mocks.createQueuedRenderJob.mockResolvedValue({ id: "job_async" });

    const response = await postRender(new Request("https://runstamp.com/api/v2/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceSchema: "protocol_v2",
        mode: "async",
        document: {
          version: "2.0",
          title: "Async deck",
          slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }],
        },
      }),
    }));

    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload.status).toBe("queued");
    expect(payload.data).toEqual({
      job_id: "job_async",
      job_url: "/api/v2/jobs/job_async",
    });
    expect(mocks.enqueueRenderJob).toHaveBeenCalledWith({ id: "job_async" });
  });

  it("returns a job detail payload with approval and diff summary", async () => {
    mocks.getRenderJobForOrg.mockResolvedValue({
      id: "job_1",
      brand_pack_id: "brand_1",
      quality_report: qualityReport,
    });
    mocks.getBrandPackDetailForOrg.mockResolvedValue({
      id: "brand_1",
      name: "Acme",
      active_version_id: "bpv_1",
      status: "active",
    });

    const response = await getJob(
      new Request("https://runstamp.com/api/v2/jobs/job_1"),
      { params: Promise.resolve({ id: "job_1" }) },
    );

    const payload = await response.json();
    expect(payload.approval.latest.status).toBe("needs_review");
    expect(payload.diffSummary.baselineJobId).toBe("job_base");
    expect(payload.brandPack).toEqual({
      id: "brand_1",
      name: "Acme",
      active_version_id: "bpv_1",
      status: "active",
    });
    expect(payload.preflight.findingCount).toBe(1);
    expect(payload.findingSummary.nextActions).toContain("Choose a certified brand pack version before render.");
    expect(payload.brandCompliance.compliant).toBe(true);
    expect(payload.validation.validationSummary).toMatchObject({
      requestedMode: "structural",
      executedModes: ["structural"],
      deferredModes: [],
    });
  });

  it("returns slide-level diff data and approval metadata", async () => {
    const currentPreview = {
      id: "artifact_current",
      kind: "preview_png",
      public_url: null,
      metadata: { slideIndex: 0 },
    };
    const baselinePreview = {
      id: "artifact_base",
      kind: "preview_png",
      public_url: null,
      metadata: { slideIndex: 0 },
    };
    const currentPptx = {
      id: "pptx_current",
      kind: "generated_pptx",
      public_url: null,
      metadata: {},
    };
    const baselinePptx = {
      id: "pptx_base",
      kind: "generated_pptx",
      public_url: null,
      metadata: {},
    };
    mocks.getRenderJobForOrg
      .mockResolvedValueOnce({
        id: "job_current",
        baseline_job_id: "job_base",
        artifacts: [currentPreview, currentPptx],
        deck_score: 87,
        preview_url: "https://cdn.runstamp.com/current.png",
        document_title: "Current deck",
        quality_report: qualityReport,
        approval_status: "needs_review",
        approval_required: true,
      })
      .mockResolvedValueOnce({
        id: "job_base",
        artifacts: [baselinePreview, baselinePptx],
        deck_score: 84,
        preview_url: "https://cdn.runstamp.com/base.png",
        document_title: "Baseline deck",
        quality_report: { fallbackCount: 0, documentVerdict: "pass" },
      });
    mocks.findSlidePreviewArtifact
      .mockReturnValueOnce(currentPreview)
      .mockReturnValueOnce(baselinePreview);
    mocks.findBaselineDiffArtifact.mockReturnValue(null);
    mocks.readRenderArtifactBinary.mockResolvedValue({
      buffer: Buffer.from("png-binary"),
    });
    mocks.diffSlidePreviews.mockReturnValue({
      status: "changed",
      diffPixels: 24,
      totalPixels: 100,
      diffBuffer: Buffer.from("diff-png"),
    });
    mocks.storeRenderJobArtifact.mockResolvedValue({
      id: "diff_artifact",
      public_url: null,
    });
    mocks.diffNormalizedPackages.mockResolvedValue({
      changedEntries: ["ppt/slides/slide1.xml"],
    });

    const response = await getDiff(
      new Request("https://runstamp.com/api/v2/jobs/job_current/diff"),
      { params: Promise.resolve({ id: "job_current" }) },
    );

    const payload = await response.json();
    expect(payload.approval.latest.status).toBe("needs_review");
    expect(payload.diffSummary.changedSlides).toBe(1);
    expect(payload.findingDelta[0].code).toBe("BRAND_TOKEN_MISSING");
    expect(payload.currentJob.findingSummary.nextActions).toContain("Choose a certified brand pack version before render.");
    expect(payload.artifactCounts.current.totalArtifacts).toBe(2);
    expect(payload.slides[0]).toMatchObject({
      slideIndex: 0,
      status: "changed",
      currentPreviewUrl: expect.stringContaining("/api/v2/jobs/job_current/artifacts/"),
      baselinePreviewUrl: expect.stringContaining("/api/v2/jobs/job_base/artifacts/"),
      diffPreviewUrl: expect.stringContaining("/api/v2/jobs/job_current/artifacts/"),
    });
  });

  it("returns approval history after an approval transition", async () => {
    mocks.getRenderJobForOrg
      .mockResolvedValueOnce({ id: "job_1" })
      .mockResolvedValueOnce({ id: "job_1" });
    mocks.getRenderJobApprovalDetails.mockReturnValue({
      latest: {
        status: "approved",
        actorId: "user_1",
        actorType: "user",
        note: "Looks good",
        createdAt: "2026-03-14T00:10:00.000Z",
      },
      history: [
        {
          status: "needs_review",
          actorId: "user_1",
          actorType: "user",
          note: null,
          createdAt: "2026-03-14T00:00:00.000Z",
        },
        {
          status: "approved",
          actorId: "user_1",
          actorType: "user",
          note: "Looks good",
          createdAt: "2026-03-14T00:10:00.000Z",
        },
      ],
    });

    const response = await postApproval(
      new Request("https://runstamp.com/api/v2/jobs/job_1/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: "approved",
          note: "Looks good",
        }),
      }),
      { params: Promise.resolve({ id: "job_1" }) },
    );

    const payload = await response.json();
    expect(payload.approvalStatus).toBe("approved");
    expect(payload.approval.latest.status).toBe("approved");
    expect(payload.approval.history).toHaveLength(2);
  });

  it("returns brand-pack detail with compile and certification status", async () => {
    mocks.getBrandPackDetailForOrg.mockResolvedValue({
      id: "brand_1",
      name: "Acme",
      active_version_id: "bpv_1",
      versions: [
        {
          id: "bpv_1",
          status: "compiled",
          certified: true,
          compiled_tokens: {
            certification: {
              requiredAssetsPresent: true,
            },
          },
        },
      ],
    });

    const response = await getBrandPack(
      new Request("https://runstamp.com/api/v2/brand-packs/brand_1"),
      { params: Promise.resolve({ id: "brand_1" }) },
    );

    const payload = await response.json();
    expect(payload.compileStatus).toBe("compiled");
    expect(payload.certificationStatus).toBe("certified");
    expect(payload.certification).toEqual({
      requiredAssetsPresent: true,
    });
  });
});
