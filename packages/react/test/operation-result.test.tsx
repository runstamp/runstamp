// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OperationResult } from "@runstamp/contract";

import {
  OperationArtifacts,
  OperationResultView,
  type ArtifactReference,
} from "../src/index.js";

const receipt = {
  contractVersion: "1.0.0" as const,
  operation: "pdf.render" as const,
  domain: "pdf" as const,
  engine: { name: "@runstamp/pdf", version: "1.0.0" },
  inputHash: `sha256:${"a".repeat(64)}`,
  optionsHash: `sha256:${"b".repeat(64)}`,
  outputHash: `sha256:${"c".repeat(64)}`,
  deterministic: true,
  nondeterminismSources: [],
};

const artifact: ArtifactReference = {
  id: "019230f4-7b5a-7000-8000-000000000001",
  mediaType: "application/pdf",
  extension: "pdf",
  byteLength: 128,
  hash: receipt.outputHash,
  downloadPath: "/v1/artifacts/019230f4-7b5a-7000-8000-000000000001",
  expiresAt: "2026-08-16T01:00:00.000Z",
  label: "Review PDF",
};

const success: OperationResult<{ pages: number }> = {
  ok: true,
  value: { pages: 2 },
  losses: [],
  diagnostics: [{
    code: "pdf/AUTO_FIT",
    severity: "info",
    message: "Content fit without loss.",
    phase: "layout",
  }],
  receipt,
};

const failure: OperationResult<never> = {
  ok: false,
  error: {
    name: "PaperError",
    code: "pdf/SCHEMA_REJECTED",
    phase: "validation",
    message: "The PDF input is invalid.",
    remediation: "Supply a valid PDF document.",
    issues: [{ path: "input", message: "Missing PDF header." }],
    retryable: false,
  } as never,
  losses: [{
    code: "pdf/CONTENT_DROPPED",
    severity: "dropped",
    subject: "page 1",
    message: "A damaged object could not be retained.",
    avoidable: false,
  }],
  diagnostics: [],
  receipt,
};

let container: HTMLDivElement;
let root: Root | undefined;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container.remove();
});

describe("cross-format OperationResult surface", () => {
  it("server-renders a successful envelope, explicit zero-loss state, diagnostics, and artifact", () => {
    const html = renderToStaticMarkup(
      <OperationResultView<{ pages: number }>
        result={success}
        artifacts={[artifact]}
        defaultExpanded={["value", "losses", "diagnostics", "artifacts", "receipt"]}
        renderValue={(value) => <output>{value.pages} pages</output>}
      />,
    );
    expect(html).toContain("Operation completed");
    expect(html).toContain("No fidelity loss was reported");
    expect(html).toContain("Content fit without loss");
    expect(html).toContain("Review PDF");
    expect(html).toContain("2 pages");
    expect(html).toContain(receipt.outputHash);
  });

  it("renders a typed failure, remediation, issues, losses, and optional receipt", () => {
    const html = renderToStaticMarkup(
      <OperationResultView result={failure} defaultExpanded={["losses", "receipt"]} />,
    );
    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("The PDF input is invalid");
    expect(html).toContain("Supply a valid PDF document");
    expect(html).toContain("Missing PDF header");
    expect(html).toContain("CONTENT_DROPPED");

    const withoutReceipt = { ...failure, receipt: undefined } as OperationResult<never>;
    expect(renderToStaticMarkup(<OperationResultView result={withoutReceipt} defaultExpanded={["receipt"]} />))
      .toContain("ended before an input-bound receipt");
  });

  it("invokes the caller-owned artifact download callback", async () => {
    const onDownload = vi.fn(async () => undefined);
    root = createRoot(container);
    await act(async () => {
      root?.render(<OperationArtifacts artifacts={[artifact]} onDownload={onDownload} defaultExpanded />);
    });
    const button = container.querySelector("button");
    expect(button?.textContent).toContain("Review PDF");
    await act(async () => button?.click());
    expect(onDownload).toHaveBeenCalledWith(artifact);
  });

  it("copies the receipt without embedding transport or authentication logic", async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    root = createRoot(container);
    await act(async () => {
      root?.render(<OperationResultView result={success} defaultExpanded={["receipt"]} />);
    });
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Copy receipt");
    await act(async () => button?.click());
    expect(writeText).toHaveBeenCalledOnce();
    expect(String(writeText.mock.calls[0]?.[0])).toContain("pdf.render");
    expect(button?.textContent).toBe("Copied");
  });

  it("fails soft for unserializable values and malformed display collections", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const malformed = { ...success, value: cyclic, losses: null, diagnostics: null } as unknown as OperationResult<unknown>;
    const html = renderToStaticMarkup(<OperationResultView result={malformed} defaultExpanded={["value", "losses", "diagnostics"]} />);
    expect(html).toContain("Value could not be serialized");
    expect(html).toContain("0 losses, 0 diagnostics");
  });
});
