import { inflate } from "pako";
import { renderPdfPages } from "../src/pdf-renderer.js";
import { createPerformancePages } from "../scripts/phase9-fixtures.js";

function countImages(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Subtype \/Image/g);
  return matches?.length ?? 0;
}

function inflateContentStreams(buffer: Buffer): string[] {
  const marker = Buffer.from("stream\n", "ascii");
  const streams: string[] = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const start = buffer.indexOf(marker, cursor);
    if (start < 0) {
      break;
    }
    const lengthMarker = Buffer.from("/Length ", "ascii");
    const lengthStart = buffer.lastIndexOf(lengthMarker, start);
    if (lengthStart < 0) {
      cursor = start + marker.length;
      continue;
    }
    let lengthCursor = lengthStart + lengthMarker.length;
    let digits = "";
    while (lengthCursor < buffer.length) {
      const char = String.fromCharCode(buffer[lengthCursor] as number);
      if (!/\d/.test(char)) {
        break;
      }
      digits += char;
      lengthCursor += 1;
    }
    const length = Number(digits);
    if (!Number.isFinite(length) || length <= 0) {
      cursor = start + marker.length;
      continue;
    }
    try {
      const compressed = buffer.subarray(start + marker.length, start + marker.length + length);
      streams.push(Buffer.from(inflate(compressed)).toString("utf8"));
    } catch {
      // Ignore non-Flate streams like PNG image assets.
    }
    cursor = start + marker.length + length;
  }

  return streams;
}

describe("Phase 9 performance hooks", () => {
  it("deduplicates repeated image resources across many pages", async () => {
    const buffer = await renderPdfPages({
      pages: createPerformancePages(50),
    });

    expect(countImages(buffer)).toBe(1);
  });

  it("calls the page serialization hook for every page", async () => {
    const calls: number[] = [];
    await renderPdfPages({
      pages: createPerformancePages(12),
      runtimeOptions: {
        onPageSerialized(pageIndex, totalPages) {
          calls.push(pageIndex);
          expect(totalPages).toBe(12);
        },
      },
    });

    expect(calls).toEqual(Array.from({ length: 12 }, (_, index) => index));
  });

  it("keeps the final page content intact across 100 generated pages", async () => {
    const pages = createPerformancePages(100);
    const buffer = await renderPdfPages({ pages });
    const content = inflateContentStreams(buffer).join("\n");

    expect(content).toContain("Performance Page 1");
    expect(content).toContain("Performance Page 100");
  });
});
