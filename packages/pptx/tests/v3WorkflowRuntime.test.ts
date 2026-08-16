import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  diffNormalizedPackages: vi.fn(),
  dispatchWebhooks: vi.fn(),
  createRenderJob: vi.fn(),
  getRenderJobById: vi.fn(),
  getRenderJobForOrg: vi.fn(),
  readRenderArtifactBinary: vi.fn(),
  updateRenderJobApproval: vi.fn(),
  processQueuedRenderJob: vi.fn(),
  materializePresentationSpec: vi.fn(),
  createBrandPackFeedbackRecord: vi.fn(),
  createDataSnapshot: vi.fn(),
  createDeckRelease: vi.fn(),
  createPptxEditEvents: vi.fn(),
  createPptxSyncSession: vi.fn(),
  createReviewComment: vi.fn(),
  createReviewDecision: vi.fn(),
  createReviewRequest: vi.fn(),
  createSyncReviewItems: vi.fn(),
  createWorkflowSyncChangeRequest: vi.fn(),
  getDataSourceForOrg: vi.fn(),
  getDataSourceSecret: vi.fn(),
  getDeckReleaseForOrg: vi.fn(),
  getLatestDeckReleaseForDeck: vi.fn(),
  getLatestSnapshotForSource: vi.fn(),
  getPptxSyncSessionForOrg: vi.fn(),
  getReviewRequestForOrg: vi.fn(),
  getReviewRequestForRun: vi.fn(),
  getSyncReviewItemForSession: vi.fn(),
  getWorkflowDefinitionForOrg: vi.fn(),
  getWorkflowRunForOrg: vi.fn(),
  getWorkflowRunById: vi.fn(),
  getWorkspaceComponentForOrg: vi.fn(),
  listBindingsForWorkflow: vi.fn(),
  listSyncReviewItemsForSession: vi.fn(),
  recordWorkflowRunStep: vi.fn(),
  replaceMemoryEntriesForSource: vi.fn(),
  updatePptxSyncSession: vi.fn(),
  updateReviewRequest: vi.fn(),
  updateSyncReviewItem: vi.fn(),
  updateWorkspaceComponent: vi.fn(),
  updateWorkflowDefinition: vi.fn(),
  updateWorkflowRun: vi.fn(),
}));

vi.mock("@runstamp/pptx", () => ({
  diffNormalizedPackages: mocks.diffNormalizedPackages,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/webhooks/dispatch", () => ({
  dispatchWebhooks: mocks.dispatchWebhooks,
}));

vi.mock("@/lib/v2/jobs", () => ({
  createRenderJob: mocks.createRenderJob,
  getRenderJobById: mocks.getRenderJobById,
  getRenderJobForOrg: mocks.getRenderJobForOrg,
  readRenderArtifactBinary: mocks.readRenderArtifactBinary,
  updateRenderJobApproval: mocks.updateRenderJobApproval,
}));

vi.mock("@/lib/v2/runtime", () => ({
  processQueuedRenderJob: mocks.processQueuedRenderJob,
}));

vi.mock("@/lib/v3/bindings", () => ({
  materializePresentationSpec: mocks.materializePresentationSpec,
}));

vi.mock("@/lib/v3/store", () => ({
  createBrandPackFeedbackRecord: mocks.createBrandPackFeedbackRecord,
  createDataSnapshot: mocks.createDataSnapshot,
  createDeckRelease: mocks.createDeckRelease,
  createPptxEditEvents: mocks.createPptxEditEvents,
  createPptxSyncSession: mocks.createPptxSyncSession,
  createReviewComment: mocks.createReviewComment,
  createReviewDecision: mocks.createReviewDecision,
  createReviewRequest: mocks.createReviewRequest,
  createSyncReviewItems: mocks.createSyncReviewItems,
  createWorkflowSyncChangeRequest: mocks.createWorkflowSyncChangeRequest,
  getDataSourceForOrg: mocks.getDataSourceForOrg,
  getDataSourceSecret: mocks.getDataSourceSecret,
  getDeckReleaseForOrg: mocks.getDeckReleaseForOrg,
  getLatestDeckReleaseForDeck: mocks.getLatestDeckReleaseForDeck,
  getLatestSnapshotForSource: mocks.getLatestSnapshotForSource,
  getPptxSyncSessionForOrg: mocks.getPptxSyncSessionForOrg,
  getReviewRequestForOrg: mocks.getReviewRequestForOrg,
  getReviewRequestForRun: mocks.getReviewRequestForRun,
  getSyncReviewItemForSession: mocks.getSyncReviewItemForSession,
  getWorkflowDefinitionForOrg: mocks.getWorkflowDefinitionForOrg,
  getWorkflowRunForOrg: mocks.getWorkflowRunForOrg,
  getWorkflowRunById: mocks.getWorkflowRunById,
  getWorkspaceComponentForOrg: mocks.getWorkspaceComponentForOrg,
  listBindingsForWorkflow: mocks.listBindingsForWorkflow,
  listSyncReviewItemsForSession: mocks.listSyncReviewItemsForSession,
  recordWorkflowRunStep: mocks.recordWorkflowRunStep,
  replaceMemoryEntriesForSource: mocks.replaceMemoryEntriesForSource,
  updatePptxSyncSession: mocks.updatePptxSyncSession,
  updateReviewRequest: mocks.updateReviewRequest,
  updateSyncReviewItem: mocks.updateSyncReviewItem,
  updateWorkspaceComponent: mocks.updateWorkspaceComponent,
  updateWorkflowDefinition: mocks.updateWorkflowDefinition,
  updateWorkflowRun: mocks.updateWorkflowRun,
}));

import {
  adoptSyncReviewItem,
  assignWorkflowReviewRequest,
  applyWorkflowReviewDecision,
  processWorkflowRun,
  publishWorkflowRun,
} from "../../../platform/app/lib/v3/runtime";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              neq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  });
  mocks.listBindingsForWorkflow.mockResolvedValue([]);
  mocks.materializePresentationSpec.mockReturnValue({
    resolvedSpec: {
      version: "2.0",
      title: "QBR",
      slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }],
    },
    resolvedVariables: {},
    lineageManifest: {
      deckId: "deck_1",
      slides: [{ slideId: "slide_1", componentId: "component_1", title: "Summary" }],
    },
  });
  mocks.getLatestDeckReleaseForDeck.mockResolvedValue(null);
});

describe("V3 workflow runtime webhook contracts", () => {
  it("dispatches started and needs_review events for approval-gated runs", async () => {
    mocks.getWorkflowRunById.mockResolvedValue({
      id: "run_1",
      org_id: "org_1",
      workflow_definition_id: "wf_1",
      created_by: "user_1",
      trigger_payload: {},
      status: "queued",
      approval_required: true,
    });
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({
      id: "wf_1",
      org_id: "org_1",
      deck_id: "deck_1",
      source_schema: "protocol_v2",
      brand_pack_id: null,
      brand_pack_version_id: null,
      approval_required: true,
      preflight_policy: {},
      variables: {},
      document_spec: { title: "QBR", slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }] },
      cadence: "manual",
      schedule_config: {},
    });
    mocks.createRenderJob.mockResolvedValue({ id: "job_1" });
    mocks.processQueuedRenderJob.mockResolvedValue({
      id: "job_1",
      status: "succeeded",
      quality_report: { documentVerdict: "pass" },
      deck_score: 91,
    });
    mocks.getRenderJobById.mockResolvedValue({
      id: "job_1",
      status: "succeeded",
      quality_report: { documentVerdict: "pass" },
      deck_score: 91,
    });
    mocks.createReviewRequest.mockResolvedValue({ id: "review_1" });

    await processWorkflowRun("run_1");

    expect(mocks.dispatchWebhooks).toHaveBeenCalledWith("org_1", "workflow.run.started", expect.any(Object));
    expect(mocks.dispatchWebhooks).toHaveBeenCalledWith("org_1", "workflow.run.needs_review", expect.objectContaining({
      workflow_run_id: "run_1",
      review_request_id: "review_1",
    }));
  });

  it("dispatches failed when render execution fails", async () => {
    mocks.getWorkflowRunById.mockResolvedValue({
      id: "run_2",
      org_id: "org_1",
      workflow_definition_id: "wf_1",
      created_by: "user_1",
      trigger_payload: {},
      status: "queued",
      approval_required: false,
    });
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({
      id: "wf_1",
      org_id: "org_1",
      deck_id: "deck_1",
      source_schema: "protocol_v2",
      brand_pack_id: null,
      brand_pack_version_id: null,
      approval_required: false,
      preflight_policy: {},
      variables: {},
      document_spec: { title: "QBR", slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }] },
      cadence: "manual",
      schedule_config: {},
    });
    mocks.createRenderJob.mockResolvedValue({ id: "job_2" });
    mocks.processQueuedRenderJob.mockResolvedValue({
      id: "job_2",
      status: "failed",
      error_message: "Renderer crashed",
      quality_report: {},
      deck_score: null,
    });
    mocks.getRenderJobById.mockResolvedValue({
      id: "job_2",
      status: "failed",
      error_message: "Renderer crashed",
      quality_report: {},
      deck_score: null,
    });

    await processWorkflowRun("run_2");

    expect(mocks.dispatchWebhooks).toHaveBeenCalledWith("org_1", "workflow.run.failed", expect.objectContaining({
      workflow_run_id: "run_2",
      render_job_id: "job_2",
      error: "Renderer crashed",
    }));
  });

  it("dispatches approval and rejection review events", async () => {
    mocks.getWorkflowRunForOrg.mockResolvedValue({
      id: "run_3",
      org_id: "org_1",
      workflow_definition_id: "wf_1",
      render_job_id: "job_3",
    });
    mocks.getReviewRequestForRun.mockResolvedValue({ id: "review_3" });
    mocks.getWorkflowRunById.mockResolvedValue({ id: "run_3", status: "approved" });

    await applyWorkflowReviewDecision("org_1", "run_3", "user_1", "approved", "Looks good");
    await applyWorkflowReviewDecision("org_1", "run_3", "user_1", "rejected", "Needs edits");

    expect(mocks.dispatchWebhooks).toHaveBeenCalledWith("org_1", "workflow.run.approved", expect.objectContaining({
      workflow_run_id: "run_3",
      review_request_id: "review_3",
    }));
    expect(mocks.dispatchWebhooks).toHaveBeenCalledWith("org_1", "workflow.run.rejected", expect.objectContaining({
      workflow_run_id: "run_3",
      review_request_id: "review_3",
    }));
  });

  it("dispatches published when a release is created", async () => {
    mocks.getWorkflowRunById.mockResolvedValue({
      id: "run_4",
      org_id: "org_1",
      workflow_definition_id: "wf_1",
      render_job_id: "job_4",
      deck_release_id: null,
      status: "approved",
      resolved_spec: { title: "Deck", slides: [{ slideType: "title-body", title: "Summary", body: ["One"] }] },
      lineage_manifest: { deckId: "deck_1", slides: [{ slideId: "slide_1", componentId: "component_1", title: "Summary" }] },
      quality_report: { documentVerdict: "pass" },
    });
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({
      id: "wf_1",
      name: "QBR",
      deck_id: "deck_1",
    });
    mocks.getRenderJobForOrg.mockResolvedValue({
      id: "job_4",
      artifacts: [],
      download_url: "https://cdn.runstamp.com/deck.pptx",
      preview_url: "https://cdn.runstamp.com/deck.png",
      validation_record_url: "https://cdn.runstamp.com/deck.validation.json",
      deck_score: 90,
    });
    mocks.createDeckRelease.mockResolvedValue({
      id: "rel_4",
      version_number: 7,
    });

    await publishWorkflowRun("run_4", "user_1");

    expect(mocks.dispatchWebhooks).toHaveBeenCalledWith("org_1", "workflow.run.published", expect.objectContaining({
      workflow_run_id: "run_4",
      release_id: "rel_4",
      render_job_id: "job_4",
    }));
  });

  it("infers brand-pack targets from the workflow when adopting feedback", async () => {
    mocks.getPptxSyncSessionForOrg.mockResolvedValue({
      id: "sync_1",
      org_id: "org_1",
    });
    mocks.getSyncReviewItemForSession.mockResolvedValue({
      id: "item_1",
      status: "pending",
      workflow_definition_id: "wf_1",
      deck_id: "deck_1",
      proposed_payload: {
        summary: "Brand mismatch",
      },
      event: {
        payload: {
          type: "modified",
          path: "ppt/theme/theme1.xml",
        },
      },
    });
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({
      id: "wf_1",
      name: "Revenue QBR",
      brand_pack_id: "brand_1",
      brand_pack_version_id: "version_7",
    });
    mocks.listSyncReviewItemsForSession.mockResolvedValue([
      {
        id: "item_1",
        status: "adopted",
      },
    ]);
    mocks.createBrandPackFeedbackRecord.mockResolvedValue({
      id: "feedback_1",
      status: "open",
    });
    mocks.updateSyncReviewItem.mockResolvedValue(undefined);

    await adoptSyncReviewItem({
      orgId: "org_1",
      sessionId: "sync_1",
      itemId: "item_1",
      actorId: "user_1",
      targetType: "brand_pack_feedback",
      summary: "Capture styling drift",
    });

    expect(mocks.createBrandPackFeedbackRecord).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org_1",
      syncSessionId: "sync_1",
      syncReviewItemId: "item_1",
      brandPackId: "brand_1",
      brandPackVersionId: "version_7",
      workflowDefinitionId: "wf_1",
      summary: "Capture styling drift",
    }));
    expect(mocks.updateSyncReviewItem).toHaveBeenCalledWith("org_1", "item_1", expect.objectContaining({
      status: "adopted",
      adoption_target_type: "brand_pack_feedback",
    }));
  });

  it("updates review memory when reviewer assignment changes", async () => {
    mocks.getReviewRequestForOrg.mockResolvedValue({
      id: "review_9",
      workflow_run_id: "run_9",
      render_job_id: "job_9",
      assigned_to: null,
      status: "open",
      decisions: [],
      comments: [],
    });
    mocks.getWorkflowRunForOrg.mockResolvedValue({
      id: "run_9",
      render_job_id: "job_9",
    });
    mocks.updateReviewRequest.mockResolvedValue({
      id: "review_9",
      assigned_to: "user_reviewer",
    });
    mocks.getReviewRequestForRun.mockResolvedValue({
      id: "review_9",
      workflow_run_id: "run_9",
      assigned_to: "user_reviewer",
      status: "open",
      decisions: [],
      comments: [
        {
          id: "comment_1",
          author_id: "user_admin",
          body: "Reviewer assigned to Reviewer.",
          created_at: "2026-03-14T00:00:00.000Z",
          metadata: {},
        },
      ],
    });

    await assignWorkflowReviewRequest(
      "org_1",
      "review_9",
      "user_admin",
      "user_reviewer",
      { surface: "dashboard" },
      "Reviewer assigned to Reviewer.",
    );

    expect(mocks.updateReviewRequest).toHaveBeenCalledWith("org_1", "review_9", {
      assigned_to: "user_reviewer",
    });
    expect(mocks.createReviewComment).toHaveBeenCalledWith(expect.objectContaining({
      reviewRequestId: "review_9",
      body: "Reviewer assigned to Reviewer.",
    }));
    expect(mocks.recordWorkflowRunStep).toHaveBeenCalledWith(
      "run_9",
      "review.assignment",
      "info",
      "Reviewer assigned to Reviewer.",
      expect.objectContaining({
        reviewRequestId: "review_9",
        nextAssignedTo: "user_reviewer",
      }),
    );
    expect(mocks.replaceMemoryEntriesForSource).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org_1",
      sourceType: "review_request",
      sourceId: "review_9",
    }));
  });
});
