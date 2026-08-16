import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeclarativeDocument } from "../src/index.js";

const render = vi.fn();
const renderToPdf = vi.fn();
const compileDeclarativeDocument = vi.fn((document: { title: string }) => ({
  type: "Document",
  meta: { title: document.title },
  slides: [],
}));

vi.mock("@runstamp/pptx", () => ({
  PaperEngine: { renderToPdf },
  compileDeclarativeDocument,
  render,
}));

describe("server adapter", () => {
  beforeEach(() => {
    render.mockReset().mockResolvedValue(Buffer.from("pptx"));
    renderToPdf.mockReset().mockResolvedValue(Buffer.from("pdf"));
  });

  it("wraps PPTX rendering and merges factory defaults", async () => {
    const { createRunstampRenderer } = await import("../src/server.js");
    const renderer = createRunstampRenderer({ pptx: { deterministic: false } });
    const document: DeclarativeDocument = {
      title: "Deck",
      slides: [{ layout: "title", title: "Deck" }],
    };
    const result = await renderer.renderPptx(document, { relaxed: true });
    expect(new TextDecoder().decode(result)).toBe("pptx");
    expect(render).toHaveBeenCalledWith(
      document,
      { deterministic: false, relaxed: true },
    );
  });

  it("keeps PDF rendering behind the server export", async () => {
    const browser = await import("../src/index.js");
    const server = await import("../src/server.js");
    expect("renderDeckToPdf" in browser).toBe(false);
    expect(new TextDecoder().decode(await server.renderDeckToPdf({
      title: "Deck",
      slides: [{ layout: "title", title: "Deck" }],
    }))).toBe("pdf");
    expect(compileDeclarativeDocument).toHaveBeenCalledOnce();
  });
});
