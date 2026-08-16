import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRuntimeAccessContext: vi.fn(),
  loadZip: vi.fn(),
  createAdminClient: vi.fn(),
  getRenderJobForOrg: vi.fn(),
  listDeckReleasesForOrg: vi.fn(),
  listOperatorActivityEventsForOrg: vi.fn(),
  listApiKeySummariesForOrg: vi.fn(),
  listUserIdentitiesForOrg: vi.fn(),
  searchMemoryIndex: vi.fn(),
  listDataSourcesForOrg: vi.fn(),
  createDataSource: vi.fn(),
  getLatestSnapshotForSource: vi.fn(),
  getDeckReleaseForOrg: vi.fn(),
  getReviewRequestForRun: vi.fn(),
  getWorkflowDefinitionForOrg: vi.fn(),
  getWorkflowRunForOrg: vi.fn(),
  updateWorkflowDefinitionConfig: vi.fn(),
  loadDocumentForOrg: vi.fn(),
  listPptxEditEventsForSession: vi.fn(),
  listPptxSyncSessionsForOrg: vi.fn(),
  listReviewRequestsForOrg: vi.fn(),
  listSyncReviewItemsForSession: vi.fn(),
  listWorkflowDefinitionsForOrg: vi.fn(),
  listWorkflowRunsForOrg: vi.fn(),
  listWorkflowRunStepsForRuns: vi.fn(),
  listWorkspaceComponentsForOrg: vi.fn(),
  getPptxSyncSessionForOrg: vi.fn(),
  reviewSyncItem: vi.fn(),
  adoptSyncReviewItem: vi.fn(),
  processPptxSyncUpload: vi.fn(),
  recordOperatorActivityEventSafe: vi.fn(),
  resolveOperatorSurface: vi.fn(() => "powerpoint_addin"),
}));

vi.mock("@/lib/auth/runtimeAccess", () => ({
  getRuntimeAccessContext: mocks.getRuntimeAccessContext,
}));

vi.mock("jszip", () => ({
  default: {
    loadAsync: mocks.loadZip,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/v2/jobs", () => ({
  getRenderJobForOrg: mocks.getRenderJobForOrg,
}));

vi.mock("@/lib/v3/store", () => ({
  listDeckReleasesForOrg: mocks.listDeckReleasesForOrg,
  listOperatorActivityEventsForOrg: mocks.listOperatorActivityEventsForOrg,
  listApiKeySummariesForOrg: mocks.listApiKeySummariesForOrg,
  listUserIdentitiesForOrg: mocks.listUserIdentitiesForOrg,
  searchMemoryIndex: mocks.searchMemoryIndex,
  listDataSourcesForOrg: mocks.listDataSourcesForOrg,
  createDataSource: mocks.createDataSource,
  getLatestSnapshotForSource: mocks.getLatestSnapshotForSource,
  getDeckReleaseForOrg: mocks.getDeckReleaseForOrg,
  getReviewRequestForRun: mocks.getReviewRequestForRun,
  getWorkflowDefinitionForOrg: mocks.getWorkflowDefinitionForOrg,
  getWorkflowRunForOrg: mocks.getWorkflowRunForOrg,
  updateWorkflowDefinitionConfig: mocks.updateWorkflowDefinitionConfig,
  loadDocumentForOrg: mocks.loadDocumentForOrg,
  listPptxEditEventsForSession: mocks.listPptxEditEventsForSession,
  listPptxSyncSessionsForOrg: mocks.listPptxSyncSessionsForOrg,
  listReviewRequestsForOrg: mocks.listReviewRequestsForOrg,
  listSyncReviewItemsForSession: mocks.listSyncReviewItemsForSession,
  listWorkflowDefinitionsForOrg: mocks.listWorkflowDefinitionsForOrg,
  listWorkflowRunsForOrg: mocks.listWorkflowRunsForOrg,
  listWorkflowRunStepsForRuns: mocks.listWorkflowRunStepsForRuns,
  listWorkspaceComponentsForOrg: mocks.listWorkspaceComponentsForOrg,
  getPptxSyncSessionForOrg: mocks.getPptxSyncSessionForOrg,
}));

vi.mock("@/lib/v3/runtime", () => ({
  reviewSyncItem: mocks.reviewSyncItem,
  adoptSyncReviewItem: mocks.adoptSyncReviewItem,
  processPptxSyncUpload: mocks.processPptxSyncUpload,
}));

vi.mock("@/lib/v3/telemetry", () => ({
  recordOperatorActivityEventSafe: mocks.recordOperatorActivityEventSafe,
  resolveOperatorSurface: mocks.resolveOperatorSurface,
}));

import { GET as getReleases } from "../../../platform/app/api/v3/releases/route";
import { GET as getReleaseDetail } from "../../../platform/app/api/v3/releases/[id]/route";
import { GET as getAddinBootstrap } from "../../../platform/app/api/v3/addin/bootstrap/route";
import { POST as postActiveDeck } from "../../../platform/app/api/v3/addin/active-deck/route";
import { GET as getDataSources, POST as postDataSource } from "../../../platform/app/api/v3/data-sources/route";
import { GET as getMemory } from "../../../platform/app/api/v3/memory/route";
import { PATCH as patchWorkflow } from "../../../platform/app/api/v3/workflows/[id]/route";
import { GET as getSyncSessionDetail } from "../../../platform/app/api/v3/sync-sessions/[id]/route";
import { POST as postSyncPreview } from "../../../platform/app/api/v3/sync-sessions/[id]/preview/route";
import { POST as postSyncSession } from "../../../platform/app/api/v3/sync-sessions/route";
import { POST as postSyncReviewItem } from "../../../platform/app/api/v3/sync-sessions/[id]/review-items/[itemId]/route";
import { POST as postSyncAdopt } from "../../../platform/app/api/v3/sync-sessions/[id]/adopt/route";
import { GET as getMetrics } from "../../../platform/app/api/v3/metrics/route";

const accessContext = {
  context: {
    org: { id: "org_1", name: "Acme", tier: "pro" },
    userId: "user_1",
    apiKeyId: "key_1",
  },
  response: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRuntimeAccessContext.mockResolvedValue(accessContext);
  mocks.updateWorkflowDefinitionConfig.mockResolvedValue({
    id: "wf_1",
    deck_id: "deck_1",
    name: "QBR",
    description: "Updated workflow",
    cadence: "weekly",
    approval_required: true,
    source_schema: "protocol_v2",
    document_spec: {},
    variables: {},
    schedule_config: {},
    preflight_policy: {},
    bindings: [],
  });
  mocks.listApiKeySummariesForOrg.mockResolvedValue([]);
  mocks.listUserIdentitiesForOrg.mockResolvedValue([]);
  mocks.searchMemoryIndex.mockResolvedValue([]);
  mocks.listDataSourcesForOrg.mockResolvedValue([]);
  mocks.loadDocumentForOrg.mockResolvedValue(null);
  mocks.getLatestSnapshotForSource.mockResolvedValue(null);
  mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([]);
  mocks.listWorkflowRunsForOrg.mockResolvedValue([]);
  mocks.listWorkflowRunStepsForRuns.mockResolvedValue([]);
  mocks.listWorkspaceComponentsForOrg.mockResolvedValue([]);
  mocks.listPptxSyncSessionsForOrg.mockResolvedValue([]);
  mocks.listReviewRequestsForOrg.mockResolvedValue([]);
  mocks.listDeckReleasesForOrg.mockResolvedValue([]);
  mocks.listSyncReviewItemsForSession.mockResolvedValue([]);
  mocks.processPptxSyncUpload.mockResolvedValue({
    id: "sync_generated",
    status: "needs_review",
    summary: { issueCount: 1 },
  });
  mocks.loadZip.mockResolvedValue({
    file: () => ({
      async: async () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"
          xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
          <property name="runstamp.deckId"><vt:lpwstr>deck_1</vt:lpwstr></property>
          <property name="runstamp.workflowId"><vt:lpwstr>wf_1</vt:lpwstr></property>
          <property name="runstamp.workflowRunId"><vt:lpwstr>run_1</vt:lpwstr></property>
          <property name="runstamp.releaseId"><vt:lpwstr>rel_1</vt:lpwstr></property>
          <property name="runstamp.lineageManifest"><vt:lpwstr>{"slides":[{"slideId":"slide_1","componentId":"component_1"}]}</vt:lpwstr></property>
        </Properties>`,
    }),
  });
  mocks.createAdminClient.mockReturnValue({
    from: (table: string) => {
      const result = { data: [], error: null };
      const chain: Record<string, any> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: async () => result,
        then: undefined,
      };
      if (table === "brand_packs") {
        chain.eq = async () => result;
      }
      return chain;
    },
  });
});

describe("V3 route contracts", () => {
  it("returns filtered releases", async () => {
    mocks.listDeckReleasesForOrg.mockResolvedValue([
      { id: "rel_1", deck_id: "deck_1", workflow_definition_id: "wf_1" },
      { id: "rel_2", deck_id: "deck_2", workflow_definition_id: "wf_2" },
    ]);

    const response = await getReleases(new Request("https://runstamp.com/api/v3/releases?deckId=deck_1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.releases).toEqual([{ id: "rel_1", deck_id: "deck_1", workflow_definition_id: "wf_1" }]);
  });

  it("returns release detail for add-in consumers", async () => {
    mocks.getDeckReleaseForOrg.mockResolvedValue({
      id: "rel_1",
      workflow_definition_id: "wf_1",
      workflow_run_id: "run_1",
      render_job_id: "job_1",
      artifact_manifest: { downloadUrl: "https://cdn.runstamp.com/deck.pptx" },
      lineage_manifest: { slides: [{ slideId: "slide_1" }] },
    });
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({ id: "wf_1", name: "QBR" });
    mocks.getWorkflowRunForOrg.mockResolvedValue({ id: "run_1", status: "published" });
    mocks.getRenderJobForOrg.mockResolvedValue({ id: "job_1", download_url: "https://cdn.runstamp.com/deck.pptx" });
    mocks.getReviewRequestForRun.mockResolvedValue({ id: "review_1", status: "approved" });

    const response = await getReleaseDetail(
      new Request("https://runstamp.com/api/v3/releases/rel_1"),
      { params: Promise.resolve({ id: "rel_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.release.id).toBe("rel_1");
    expect(payload.workflow.name).toBe("QBR");
    expect(payload.renderJob.download_url).toContain("deck.pptx");
    expect(payload.reviewRequest.id).toBe("review_1");
  });

  it("returns add-in bootstrap payload", async () => {
    mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([{ id: "wf_1", name: "QBR" }]);
    mocks.listWorkflowRunsForOrg.mockResolvedValue([]);
    mocks.listDeckReleasesForOrg.mockResolvedValue([{ id: "rel_1", version_number: 3 }]);
    mocks.listPptxSyncSessionsForOrg.mockResolvedValue([]);
    mocks.listReviewRequestsForOrg.mockResolvedValue([
      { id: "review_1", status: "open" },
      { id: "review_2", status: "approved" },
    ]);
    mocks.listWorkspaceComponentsForOrg.mockResolvedValue([{ id: "comp_1", name: "Exec summary" }]);

    const response = await getAddinBootstrap(new Request("https://runstamp.com/api/v3/addin/bootstrap"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.org.id).toBe("org_1");
    expect(payload.workflows).toHaveLength(1);
    expect(payload.reviewRequests).toHaveLength(1);
    expect(payload.reviewRequests[0]).toMatchObject({ id: "review_1", status: "open" });
    expect(payload.components[0].name).toBe("Exec summary");
    expect(payload.capabilities.supportsLayoutAwareComponentInsertion).toBe(false);
    expect(mocks.recordOperatorActivityEventSafe).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "addin.bootstrap",
    }));
  });

  it("returns data-source list payload with health and workflow summaries", async () => {
    mocks.listDataSourcesForOrg.mockResolvedValue([
      {
        id: "ds_1",
        org_id: "org_1",
        name: "Revenue feed",
        slug: "revenue-feed",
        connector_type: "http_json",
        status: "active",
        latest_snapshot_id: "snap_1",
        config: { url: "https://example.com/revenue.json" },
        created_at: "2026-03-14T00:00:00.000Z",
        updated_at: "2026-03-14T01:00:00.000Z",
      },
    ]);
    mocks.getLatestSnapshotForSource.mockResolvedValue({
      id: "snap_1",
      created_at: "2026-03-14T01:05:00.000Z",
      content_hash: "hash_1",
      content: { arr: 100 },
      metadata: { fetchedFrom: "https://example.com/revenue.json" },
    });
    mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([
      {
        id: "wf_1",
        name: "Revenue QBR",
        status: "active",
        cadence: "weekly",
        bindings: [{ data_source_id: "ds_1" }],
        latestRun: {
          id: "run_1",
          status: "published",
          created_at: "2026-03-14T01:10:00.000Z",
        },
      },
    ]);
    mocks.listWorkflowRunsForOrg.mockResolvedValue([
      {
        id: "run_1",
        workflow_definition_id: "wf_1",
        status: "published",
      },
    ]);
    mocks.listWorkflowRunStepsForRuns.mockResolvedValue([
      {
        id: "step_1",
        workflow_run_id: "run_1",
        step_key: "data.snapshot.failed",
        status: "failed",
        message: "Failed to refresh Revenue feed",
        payload: {
          dataSourceId: "ds_1",
          connectorType: "http_json",
          error: "HTTP 500",
        },
        created_at: "2026-03-14T00:55:00.000Z",
      },
      {
        id: "step_2",
        workflow_run_id: "run_1",
        step_key: "data.snapshot",
        status: "info",
        message: "Refreshed Revenue feed",
        payload: {
          dataSourceId: "ds_1",
          connectorType: "http_json",
          snapshotId: "snap_1",
        },
        created_at: "2026-03-14T01:05:00.000Z",
      },
    ]);

    const response = await getDataSources(new Request("https://runstamp.com/api/v3/data-sources"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dataSources[0]).toMatchObject({
      id: "ds_1",
      lastSuccessfulFetchAt: "2026-03-14T01:05:00.000Z",
      lastFailure: {
        error: "HTTP 500",
      },
      latestSnapshot: {
        id: "snap_1",
        content_hash: "hash_1",
      },
    });
    expect(payload.dataSources[0].workflows[0]).toMatchObject({
      id: "wf_1",
      cadence: "weekly",
    });
  });

  it("returns connector validation errors for invalid data-source configs", async () => {
    const response = await postDataSource(new Request("https://runstamp.com/api/v3/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Broken hubspot feed",
        connectorType: "hubspot",
        config: {
          objectType: "",
          properties: [],
          limit: 0,
        },
        secretPayload: {},
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.message).toBe("Invalid data source configuration");
    expect(payload.error.validationErrors).toEqual(expect.arrayContaining([
      "config.objectType is required for hubspot",
      "config.properties must contain at least one property for hubspot",
      "config.limit must be a positive number when provided",
      "secretPayload.privateAppToken is required for hubspot",
    ]));
    expect(mocks.createDataSource).not.toHaveBeenCalled();
  });

  it("returns lineage-aware memory search results", async () => {
    mocks.searchMemoryIndex.mockResolvedValue([
      {
        id: "mem_1",
        org_id: "org_1",
        source_type: "deck_release",
        source_id: "rel_1",
        title: "Release v2",
        body: "Deck history entry",
        metadata: {
          deckId: "deck_1",
          workflowDefinitionId: "wf_1",
          workflowRunId: "run_1",
          releaseId: "rel_1",
        },
        created_at: "2026-03-18T00:00:00.000Z",
        updated_at: "2026-03-18T00:00:00.000Z",
      },
      {
        id: "mem_2",
        org_id: "org_1",
        source_type: "workspace_component",
        source_id: "component_1",
        title: "Exec summary",
        body: "Component memory entry",
        metadata: {
          sourceDeckId: "deck_1",
          sourceWorkflowDefinitionId: "wf_1",
          componentId: "component_1",
        },
        created_at: "2026-03-18T00:00:00.000Z",
        updated_at: "2026-03-18T00:00:00.000Z",
      },
    ]);

    const response = await getMemory(
      new Request("https://runstamp.com/api/v3/memory?q=release&deckId=deck_1&workflowRunId=run_1&componentId=component_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.searchMemoryIndex).toHaveBeenCalledWith("org_1", "release", expect.objectContaining({
      deckId: "deck_1",
      workflowRunId: "run_1",
      componentId: "component_1",
    }));
    expect(payload.results[0].lineage.releaseId).toBe("rel_1");
    expect(payload.results[1].lineage.componentId).toBe("component_1");
    expect(payload.lineageGroups.decks).toEqual([{ id: "deck_1", count: 2 }]);
    expect(payload.lineageGroups.components).toEqual([{ id: "component_1", count: 1 }]);
  });

  it("updates workflow definitions with validated bindings", async () => {
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({
      id: "wf_1",
      deck_id: "deck_1",
      name: "QBR",
      source_schema: "protocol_v2",
    });

    const response = await patchWorkflow(
      new Request("https://runstamp.com/api/v3/workflows/wf_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated QBR",
          cadence: "weekly",
          approvalRequired: true,
          documentSpec: { version: "2.0", slides: [] },
          variables: { region: "NA" },
          scheduleConfig: { weekday: 1 },
          preflightPolicy: { renderIfScoreAbove: 70 },
          dataBindings: [
            {
              dataSourceId: "ds_1",
              bindingKey: "metrics.arr",
              bindingPath: "rows.0.arr",
              targetPath: "slides.0.body.0",
              required: true,
              transform: { type: "currency" },
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: "wf_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateWorkflowDefinitionConfig).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org_1",
      workflowId: "wf_1",
      deckId: "deck_1",
      name: "Updated QBR",
      cadence: "weekly",
      approvalRequired: true,
      preflightPolicy: { renderIfScoreAbove: 70 },
      dataBindings: [
        expect.objectContaining({
          dataSourceId: "ds_1",
          bindingKey: "metrics.arr",
          bindingPath: "rows.0.arr",
          targetPath: "slides.0.body.0",
        }),
      ],
    }));
    expect(payload.workflow.name).toBe("QBR");
  });

  it("returns sync session detail with review items", async () => {
    mocks.getPptxSyncSessionForOrg.mockResolvedValue({
      id: "sync_1",
      org_id: "org_1",
      deck_release_id: "rel_1",
      status: "needs_review",
      summary: { issueCount: 2 },
    });
    mocks.getDeckReleaseForOrg.mockResolvedValue({ id: "rel_1", version_number: 5 });
    mocks.listPptxEditEventsForSession.mockResolvedValue([{ id: "evt_1", event_type: "modified" }]);
    mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([
      {
        id: "wf_1",
        name: "QBR",
        deck_id: "deck_1",
        brand_pack_id: "brand_1",
        brand_pack_version_id: "version_1",
        document_spec: {},
        variables: {},
        latestRelease: null,
      },
    ]);
    mocks.listWorkspaceComponentsForOrg.mockResolvedValue([]);
    mocks.listSyncReviewItemsForSession.mockResolvedValue([{
      id: "item_1",
      status: "pending",
      workflow_definition_id: "wf_1",
      proposed_payload: {},
      event: null,
    }]);

    const response = await getSyncSessionDetail(
      new Request("https://runstamp.com/api/v3/sync-sessions/sync_1"),
      { params: Promise.resolve({ id: "sync_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.session.id).toBe("sync_1");
    expect(payload.reviewItems[0].id).toBe("item_1");
    expect(payload.lookups.workflows[0]).toMatchObject({
      brand_pack_id: "brand_1",
      brand_pack_version_id: "version_1",
      name: "QBR",
    });
    expect(payload.reviewItems[0].guidance).toMatchObject({
      brandPackId: "brand_1",
      brandPackVersionId: "version_1",
      issueLabel: "Modified presentation output",
      recommendedTargetLabel: "Workflow change request",
    });
    expect(payload.reviewItems[0].livePreview).toMatchObject({
      resolvedTarget: {
        targetType: "workflow_change_request",
        workflowDefinitionId: "wf_1",
        workflowName: "QBR",
      },
      selectionSummary: {
        issueLabel: "Modified presentation output",
        targetLabel: "Workflow change request",
        patchLabel: "Replace value",
      },
      applicability: {
        status: "invalid",
      },
    });
  });

  it("returns server-backed sync adoption previews", async () => {
    mocks.getPptxSyncSessionForOrg.mockResolvedValue({
      id: "sync_1",
      org_id: "org_1",
      deck_release_id: "rel_1",
      status: "needs_review",
      summary: { issueCount: 1 },
    });
    mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([
      {
        id: "wf_1",
        name: "QBR",
        deck_id: "deck_1",
        brand_pack_id: "brand_1",
        brand_pack_version_id: "version_1",
        document_spec: {
          slides: [
            { title: "Before" },
          ],
        },
        variables: {},
      },
    ]);
    mocks.listWorkspaceComponentsForOrg.mockResolvedValue([]);
    mocks.listSyncReviewItemsForSession.mockResolvedValue([{
      id: "item_1",
      status: "pending",
      workflow_definition_id: "wf_1",
      proposed_payload: {},
      event: null,
    }]);

    const response = await postSyncPreview(
      new Request("https://runstamp.com/api/v3/sync-sessions/sync_1/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: "item_1",
          targetType: "workflow_change_request",
          workflowDefinitionId: "wf_1",
          changeType: "document_spec",
          patchType: "replace_value",
          targetPath: "slides.0.title",
          valueText: "\"Updated title\"",
        }),
      }),
      { params: Promise.resolve({ id: "sync_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.livePreview).toMatchObject({
      currentValue: "Before",
      proposedValue: "Updated title",
      resolvedTarget: {
        workflowDefinitionId: "wf_1",
        workflowName: "QBR",
        targetPath: "slides.0.title",
      },
      selectionSummary: {
        issueLabel: "Modified presentation output",
        targetLabel: "Workflow change request",
        patchLabel: "Replace value",
        changeLabel: "Workflow document",
      },
      applicability: {
        status: "ready",
      },
    });
  });

  it("matches the active deck to release, workflow, run, and sync context", async () => {
    mocks.getDeckReleaseForOrg.mockResolvedValue({
      id: "rel_1",
      deck_id: "deck_1",
      workflow_definition_id: "wf_1",
      workflow_run_id: "run_1",
      version_number: 5,
      status: "published",
    });
    mocks.getWorkflowDefinitionForOrg.mockResolvedValue({
      id: "wf_1",
      name: "QBR",
      cadence: "weekly",
    });
    mocks.getWorkflowRunForOrg.mockResolvedValue({
      id: "run_1",
      status: "published",
      created_at: "2026-03-14T00:00:00.000Z",
    });
    mocks.listDeckReleasesForOrg.mockResolvedValue([
      {
        id: "rel_1",
        deck_id: "deck_1",
        workflow_definition_id: "wf_1",
        workflow_run_id: "run_1",
        version_number: 5,
        published_at: "2026-03-14T00:00:00.000Z",
        render_job_id: "job_1",
      },
    ]);
    mocks.listPptxSyncSessionsForOrg.mockResolvedValue([
      {
        id: "sync_1",
        deck_release_id: "rel_1",
        status: "needs_review",
        created_at: "2026-03-14T01:00:00.000Z",
        summary: { issueCount: 2 },
      },
    ]);
    mocks.listSyncReviewItemsForSession.mockResolvedValue([
      { id: "item_1", status: "approved" },
      { id: "item_2", status: "adopted" },
    ]);

    const formData = new FormData();
    formData.append("file", new File(["pptx"], "active-deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }));
    const response = await postActiveDeck(new Request("https://runstamp.com/api/v3/addin/active-deck", {
      method: "POST",
      body: formData,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.matched.release.id).toBe("rel_1");
    expect(payload.matched.workflow.name).toBe("QBR");
    expect(payload.matched.run.id).toBe("run_1");
    expect(payload.syncContext.latestSession.id).toBe("sync_1");
    expect(payload.syncContext.reviewCounts).toEqual({ approved: 1, adopted: 1 });
    expect(mocks.recordOperatorActivityEventSafe).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "addin.deck_match.attempt",
    }));
    expect(mocks.recordOperatorActivityEventSafe).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "addin.deck_match.success",
    }));
  });

  it("records add-in sync upload telemetry with explicit event types", async () => {
    const formData = new FormData();
    formData.append("releaseId", "rel_1");
    formData.append("file", new File(["pptx"], "sync-deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }));

    const response = await postSyncSession(new Request("https://runstamp.com/api/v3/sync-sessions", {
      method: "POST",
      headers: {
        "x-runstamp-client": "powerpoint-addin",
      },
      body: formData,
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.session.id).toBe("sync_generated");
    expect(mocks.recordOperatorActivityEventSafe).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "addin.sync_upload.start",
    }));
    expect(mocks.recordOperatorActivityEventSafe).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "addin.sync_upload.complete",
    }));
  });

  it("posts sync review decisions", async () => {
    mocks.reviewSyncItem.mockResolvedValue({
      id: "item_1",
      status: "approved",
      note: "Looks good",
    });

    const response = await postSyncReviewItem(
      new Request("https://runstamp.com/api/v3/sync-sessions/sync_1/review-items/item_1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "approved",
          note: "Looks good",
        }),
      }),
      { params: Promise.resolve({ id: "sync_1", itemId: "item_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.reviewSyncItem).toHaveBeenCalledWith({
      orgId: "org_1",
      sessionId: "sync_1",
      itemId: "item_1",
      actorId: "user_1",
      decision: "approved",
      note: "Looks good",
    });
    expect(payload.item.status).toBe("approved");
  });

  it("posts sync adoption requests", async () => {
    mocks.adoptSyncReviewItem.mockResolvedValue({
      id: "item_1",
      status: "adopted",
      adoption_target_type: "workflow_change_request",
    });

    const response = await postSyncAdopt(
      new Request("https://runstamp.com/api/v3/sync-sessions/sync_1/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: "item_1",
          targetType: "workflow_change_request",
          workflowDefinitionId: "wf_1",
          changeType: "document_spec",
          targetPath: "slides.0.title",
          value: "Updated title",
        }),
      }),
      { params: Promise.resolve({ id: "sync_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.adoptSyncReviewItem).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org_1",
      sessionId: "sync_1",
      itemId: "item_1",
      actorId: "user_1",
      targetType: "workflow_change_request",
      workflowDefinitionId: "wf_1",
      changeType: "document_spec",
      targetPath: "slides.0.title",
      value: "Updated title",
    }));
    expect(payload.item.status).toBe("adopted");
  });

  it("returns workflow health metrics", async () => {
    mocks.listWorkflowDefinitionsForOrg.mockResolvedValue([
      { id: "wf_1", status: "active", next_run_at: "2026-03-15T00:00:00.000Z" },
      { id: "wf_2", status: "paused", next_run_at: null },
    ]);
    mocks.listWorkflowRunsForOrg.mockResolvedValue([
      { id: "run_1", status: "needs_review", deck_score: 88, created_at: "2026-03-10T00:00:00.000Z" },
      { id: "run_2", status: "published", deck_score: 92, created_at: "2026-03-12T00:00:00.000Z" },
      { id: "run_3", status: "failed", deck_score: null, created_at: "2026-03-13T00:00:00.000Z" },
    ]);
    mocks.listReviewRequestsForOrg.mockResolvedValue([
      {
        id: "review_1",
        requested_at: "2026-03-10T00:00:00.000Z",
        resolved_at: "2026-03-10T01:00:00.000Z",
      },
    ]);
    mocks.listDeckReleasesForOrg.mockResolvedValue([{ id: "rel_1" }, { id: "rel_2" }]);
    mocks.listPptxSyncSessionsForOrg.mockResolvedValue([
      { id: "sync_1", summary: { issueCount: 3 }, created_at: "2026-03-17T00:00:00.000Z" },
      { id: "sync_2", summary: { issueCount: 1 }, created_at: "2026-03-18T00:00:00.000Z" },
    ]);
    mocks.listOperatorActivityEventsForOrg.mockResolvedValue([
      {
        id: "evt_1",
        surface: "powerpoint_addin",
        event_type: "addin.sync_upload.start",
        created_at: "2026-03-18T00:00:00.000Z",
        metadata: {},
      },
      {
        id: "evt_2",
        surface: "powerpoint_addin",
        event_type: "addin.deck_match.success",
        created_at: "2026-03-18T01:00:00.000Z",
        metadata: {},
      },
    ]);

    const response = await getMetrics(new Request("https://runstamp.com/api/v3/metrics?window=7d&surface=powerpoint_addin"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.window).toBe("7d");
    expect(payload.surface).toBe("powerpoint_addin");
    expect(payload.workflowCount).toBe(2);
    expect(payload.activeWorkflowCount).toBe(1);
    expect(payload.runsNeedingReviewCount).toBe(1);
    expect(payload.publishedRunCount).toBe(1);
    expect(payload.averageDeckScore).toBe(90);
    expect(payload.averageApprovalMinutes).toBe(60);
    expect(payload.averageSyncIssueCount).toBe(2);
    expect(payload.summaryCards.sync.uploadsStarted).toBe(1);
    expect(payload.summaryCards.addin.matchSuccesses).toBe(1);
    expect(payload.governance.pendingAssignedCount).toBe(0);
    expect(payload.summaryCards.governance.averageReleaseCadenceHours).toBe(0);
    expect(payload.addin.syncUploads.started).toBe(1);
    expect(payload.addin.deckMatch.successes).toBe(1);
    expect(Array.isArray(payload.timeSeries.buckets)).toBe(true);
  });
});
