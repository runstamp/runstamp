import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutNode } from "../src/layout/extract.js";
import {
  createMediaFetchBudget,
  processSlideMedia,
  resolveImageSource,
} from "../src/ooxml/media.js";

const REMOTE_BASE = "https://1.1.1.1";
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function mediaResponse(bytes: number, includeContentLength: boolean): Response {
  const headers = new Headers({ "content-type": "image/png" });
  if (includeContentLength) headers.set("content-length", String(bytes));
  return new Response(new Uint8Array(bytes), { status: 200, headers });
}

function imageSlide(src: string): LayoutNode {
  return {
    type: "Slide",
    style: {},
    layout: { x: 0, y: 0, width: 960, height: 540 },
    children: [{
      type: "Image",
      src,
      style: { width: 100, height: 100 },
      layout: { x: 0, y: 0, width: 100, height: 100 },
    }],
  } as unknown as LayoutNode;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("aggregate remote media byte budget", () => {
  it("reserves Content-Length before buffering and rejects the response that exceeds the aggregate limit", async () => {
    const bytes = 1024;
    const aggregateLimit = bytes * 1.5;
    const secondResponse = mediaResponse(bytes, true);
    const secondRead = vi.spyOn(secondResponse, "arrayBuffer");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(mediaResponse(bytes, true))
      .mockResolvedValueOnce(secondResponse));
    const budget = createMediaFetchBudget(aggregateLimit);

    await expect(resolveImageSource(`${REMOTE_BASE}/first.png`, {
      mediaFetchBudget: budget,
      validateUrl: () => undefined,
    })).resolves.toMatchObject({ buffer: expect.any(Buffer) });

    await expect(resolveImageSource(`${REMOTE_BASE}/second.png?token=secret`, {
      mediaFetchBudget: budget,
      validateUrl: () => undefined,
    })).rejects.toMatchObject({
      name: "PaperError",
      code: "RESOURCE_LIMIT_EXCEEDED",
      phase: "media",
      message: expect.stringMatching(/aggregate limit.*https:\/\/1\.1\.1\.1\/second\.png/i),
    });
    expect(secondRead).not.toHaveBeenCalled();
    expect(budget.consumedBytes).toBe(bytes);
    expect(budget.reservedBytes).toBe(0);
  });

  it("enforces the aggregate limit from actual bytes when Content-Length is missing", async () => {
    const bytes = 1024;
    const secondResponse = mediaResponse(bytes, false);
    const secondRead = vi.spyOn(secondResponse, "arrayBuffer");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(mediaResponse(bytes, false))
      .mockResolvedValueOnce(secondResponse));
    const budget = createMediaFetchBudget(bytes * 1.5);

    await resolveImageSource(`${REMOTE_BASE}/first-no-length.png`, {
      mediaFetchBudget: budget,
      validateUrl: () => undefined,
    });
    await expect(resolveImageSource(`${REMOTE_BASE}/second-no-length.png`, {
      mediaFetchBudget: budget,
      validateUrl: () => undefined,
    })).rejects.toMatchObject({
      code: "RESOURCE_LIMIT_EXCEEDED",
      phase: "media",
      message: expect.stringContaining("second-no-length.png"),
    });

    expect(secondRead).toHaveBeenCalledOnce();
    expect(budget.consumedBytes).toBe(bytes * 2);
    expect(budget.reservedBytes).toBe(0);
  });

  it("uses a separate aggregate budget for separate renders", async () => {
    const bytes = 1024;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(mediaResponse(bytes, true))
      .mockResolvedValueOnce(mediaResponse(bytes, true)));
    const firstRenderBudget = createMediaFetchBudget(bytes * 1.5);
    const secondRenderBudget = createMediaFetchBudget(bytes * 1.5);

    await expect(processSlideMedia(
      imageSlide(`${REMOTE_BASE}/render-one.png`),
      { current: 1 },
      { current: 1 },
      undefined,
      firstRenderBudget,
    )).resolves.toMatchObject({ assets: [{ buffer: expect.any(Buffer) }] });
    await expect(processSlideMedia(
      imageSlide(`${REMOTE_BASE}/render-two.png`),
      { current: 1 },
      { current: 1 },
      undefined,
      secondRenderBudget,
    )).resolves.toMatchObject({ assets: [{ buffer: expect.any(Buffer) }] });

    expect(firstRenderBudget.consumedBytes).toBe(bytes);
    expect(secondRenderBudget.consumedBytes).toBe(bytes);
  });

  it("does not charge data URIs or the local buffers decoded from them", async () => {
    const budget = createMediaFetchBudget(0);
    const slide = imageSlide(TINY_PNG);
    slide.children!.push(
      {
        type: "Video",
        src: "data:video/mp4;base64,AAECAw==",
        style: { width: 100, height: 100 },
        layout: { x: 0, y: 120, width: 100, height: 100 },
      } as LayoutNode,
      {
        type: "Audio",
        src: "data:audio/mpeg;base64,BAUGBw==",
        style: { width: 100, height: 20 },
        layout: { x: 0, y: 240, width: 100, height: 20 },
      } as LayoutNode,
    );

    const manifest = await processSlideMedia(
      slide,
      { current: 1 },
      { current: 1 },
      undefined,
      budget,
    );

    expect(manifest.assets[0].buffer.length).toBeGreaterThan(0);
    expect(manifest.videoAssets[0].buffer).toEqual(Buffer.from([0, 1, 2, 3]));
    expect(manifest.audioAssets[0].buffer).toEqual(Buffer.from([4, 5, 6, 7]));
    expect(budget).toMatchObject({ consumedBytes: 0, reservedBytes: 0 });
  });
});
