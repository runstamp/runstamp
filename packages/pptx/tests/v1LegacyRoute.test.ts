import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withApiAuth: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/lib/auth/api-middleware", () => ({
  withApiAuth: mocks.withApiAuth,
}));

vi.mock("@runstamp/pptx", () => ({
  AgentDocumentSchema: {
    safeParse: mocks.safeParse,
  },
  compileAgentDocument: vi.fn(),
  applyElasticPagination: vi.fn(),
}));

vi.mock("@/lib/pptx/managedRender", () => ({
  renderWithManagedValidation: vi.fn(),
}));

vi.mock("@/lib/storageAdapter", () => ({
  storageAdapter: {},
}));

vi.mock("@/lib/billing/metering", () => ({
  logUsage: vi.fn(),
}));

vi.mock("@/lib/webhooks/dispatch", () => ({
  dispatchWebhooks: vi.fn(),
}));

vi.mock("@/lib/pptx/normalizeDocument", () => ({
  normalizeRenderRequest: vi.fn(),
}));

vi.mock("@/lib/v2/jobs", () => ({
  createRenderJob: vi.fn(),
  getRenderJobUrl: vi.fn(),
  persistRenderArtifacts: vi.fn(),
  recordRenderJobEvent: vi.fn(),
  updateRenderJobStatus: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withApiAuth.mockImplementation((handler: unknown) => handler);
  mocks.safeParse.mockReturnValue({
    success: false,
    error: {
      issues: [
        {
          path: ["slides", 0, "content"],
          message: "Expected title content",
          code: "invalid_type",
        },
      ],
    },
  });
});

describe("legacy V1 generate route", () => {
  it("returns explicit legacy headers and a migration guide on validation failure", async () => {
    const { POST } = await import("../../../platform/app/api/v1/presentations/generate/route");
    const response = await POST(
      new Request("https://runstamp.com/v1/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: [] }),
      }),
      { org: { id: "org_1" }, apiKeyId: "key_1" } as never,
    );

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(response.headers.get("X-Runstamp-Legacy")).toBe("true");
    expect(response.headers.get("X-Runstamp-Preferred-Version")).toBe("v2");
    expect(payload.error.migration_guide_url).toBe("/docs/getting-started/migrate-v1-to-v2");
  });
});
