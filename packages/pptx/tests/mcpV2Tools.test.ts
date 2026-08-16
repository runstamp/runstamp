import { afterEach, describe, expect, it, vi } from "vitest";
import { registerGeneratePresentation } from "../packages/mcp-server/src/tools/generate.ts";
import { registerPreviewSlide } from "../packages/mcp-server/src/tools/preview.ts";

interface RegisteredTool {
  description: string;
  schema: unknown;
  handler: (input: any) => Promise<any>;
}

class FakeMcpServer {
  readonly tools = new Map<string, RegisteredTool>();

  tool(
    name: string,
    description: string,
    schema: unknown,
    handler: RegisteredTool["handler"],
  ) {
    this.tools.set(name, { description, schema, handler });
  }
}

const config = {
  apiBaseUrl: "https://api.runstamp.com",
  apiKey: "pj_test_123",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MCP V2-first tools", () => {
  it("registers V2-first generate and legacy generate tools", async () => {
    const server = new FakeMcpServer();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        status: "success",
        data: {
          job_id: "preflight_1",
          job_url: "/api/v2/jobs/preflight_1",
          quality_report: {
            deckScore: 92,
            documentVerdict: "pass",
            findings: [
              {
                code: "FONT_FALLBACK_USED",
                severity: "warning",
                message: "One font fell back to Arial.",
              },
            ],
          },
          brand_compliance: {
            compliant: true,
            findingCount: 0,
          },
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: "queued",
        data: {
          job_id: "job_123",
          job_url: "/api/v2/jobs/job_123",
        },
      }, 202));
    vi.stubGlobal("fetch", fetchMock);

    registerGeneratePresentation(server as never, config as never);

    expect(server.tools.has("generate_presentation")).toBe(true);
    expect(server.tools.has("generate_presentation_legacy")).toBe(true);

    const result = await server.tools.get("generate_presentation")!.handler({
      version: "2.0",
      title: "Board Update",
      accentColor: "#2563EB",
      slides: [
        {
          slideType: "title-body",
          title: "Executive Summary",
          body: ["Revenue grew 18% year over year."],
        },
      ],
      brandPackId: "brand_1",
      approvalRequired: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.runstamp.com/api/v2/preflight");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.runstamp.com/api/v2/render");

    const preflightBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const renderBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));

    expect(preflightBody.sourceSchema).toBe("protocol_v2");
    expect(preflightBody.document.title).toBe("Board Update");
    expect(preflightBody.preflightPolicy.autoFix).toBe("suggest_only");
    expect(renderBody.mode).toBe("async");
    expect(renderBody.approvalRequired).toBe(true);
    expect(renderBody.document.slides[0].slideType).toBe("title-body");

    expect(result.content[0].text).toContain("job_id: job_123");
    expect(result.content[0].text).toContain("deck_score: 92");
    expect(result.content[0].text).toContain("brand_compliance: compliant");
  });

  it("keeps a separate legacy generate tool for AgentDocument callers", async () => {
    const server = new FakeMcpServer();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({
      status: "success",
      data: {
        job_id: "legacy_job",
        job_url: "/api/v2/jobs/legacy_job",
        download_url: "https://cdn.runstamp.com/decks/legacy.pptx",
        legacy_notice: {
          message: "This route is maintained for compatibility.",
        },
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    registerGeneratePresentation(server as never, config as never);

    const result = await server.tools.get("generate_presentation_legacy")!.handler({
      presentationTitle: "Legacy Deck",
      slides: [
        {
          pattern: "chart_focus",
          content: { title: "Revenue" },
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.runstamp.com/v1/presentations/generate");
    const legacyBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(legacyBody.presentationTitle).toBe("Legacy Deck");
    expect(legacyBody.slides[0].pattern).toBe("chart-focus");
    expect(result.content[0].text).toContain("Legacy AgentDocument render completed");
  });

  it("registers V2-first preview and legacy preview tools", async () => {
    const server = new FakeMcpServer();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        preview: "data:image/png;base64,Zm9v",
      }))
      .mockResolvedValueOnce(jsonResponse({
        preview: "data:image/png;base64,YmFy",
      }));
    vi.stubGlobal("fetch", fetchMock);

    registerPreviewSlide(server as never, config as never);

    expect(server.tools.has("preview_slide")).toBe(true);
    expect(server.tools.has("preview_slide_legacy")).toBe(true);

    const modern = await server.tools.get("preview_slide")!.handler({
      title: "Preview",
      accentColor: "#2563EB",
      slide: {
        slideType: "timeline",
        title: "Roadmap",
        events: [
          { label: "Discover", date: "Q1" },
          { label: "Launch", date: "Q2" },
        ],
      },
    });
    const modernBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(modernBody.sourceSchema).toBe("protocol_v2");
    expect(modernBody.document.slides[0].slideType).toBe("timeline");
    expect(modern.content[1].mimeType).toBe("image/png");

    const legacy = await server.tools.get("preview_slide_legacy")!.handler({
      slide: {
        pattern: "chart_focus",
        content: { title: "Revenue" },
      },
    });
    const legacyBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(legacyBody.presentationTitle).toBe("Preview");
    expect(legacyBody.slides[0].pattern).toBe("chart-focus");
    expect(legacy.content[0].text).toContain("Legacy slide preview generated");
  });
});
