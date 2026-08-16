import { afterEach, describe, expect, it, vi } from "vitest";
import { PaperError } from "../src/errors.js";
import { fetchWithRetry } from "../src/fetchRetry.js";
import { safeFetch } from "../src/ooxml/urlGuard.js";

function redirect(location?: string): Response {
  return new Response(null, {
    status: 302,
    headers: location === undefined ? undefined : { location },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchWithRetry redirect validation", () => {
  it("blocks a redirect to the link-local metadata endpoint before fetching it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      redirect("http://169.254.169.254/latest/meta-data"),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = fetchWithRetry("https://1.1.1.1/start");

    await expect(result).rejects.toMatchObject({
      name: "PaperError",
      code: "VALIDATION_FAILED",
      phase: "media",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a redirect to IPv4 loopback before fetching it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      redirect("http://127.0.0.1:8080/x"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://1.1.1.1/start")).rejects.toBeInstanceOf(PaperError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a validated redirect to another public HTTPS URL", async () => {
    const finalResponse = new Response("ok", { status: 200 });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect("https://8.8.8.8/moved"))
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://1.1.1.1/start")).resolves.toBe(finalResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://8.8.8.8/moved");
  });

  it("resolves a relative Location against the current URL", async () => {
    const finalResponse = new Response("ok", { status: 200 });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect("/moved"))
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://1.1.1.1/original")).resolves.toBe(finalResponse);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://1.1.1.1/moved");
  });

  it("throws a typed error when a fourth redirect is returned", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect("https://8.8.8.8/one"))
      .mockResolvedValueOnce(redirect("https://1.0.0.1/two"))
      .mockResolvedValueOnce(redirect("https://8.8.4.4/three"))
      .mockResolvedValueOnce(redirect("https://1.1.1.1/four"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://1.1.1.1/start")).rejects.toMatchObject({
      name: "PaperError",
      code: "VALIDATION_FAILED",
      phase: "media",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("passes through a plain response without validating the initial URL", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("http://127.0.0.1/owned-by-caller")).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
  });

  it("returns a redirect response with no Location header", async () => {
    const response = redirect();
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://1.1.1.1/start")).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("safeFetch redirect validation", () => {
  it("validates a redirect target before issuing the next request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      redirect("http://169.254.169.254/latest/meta-data"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(safeFetch("https://1.1.1.1/start")).rejects.toBeInstanceOf(PaperError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
