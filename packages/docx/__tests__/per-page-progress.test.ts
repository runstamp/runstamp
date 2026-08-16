/**
 * Per-page progress + AbortSignal inside the serializer loop (Phase 4.3/4.4).
 *
 * - onProgress must fire once per page with pageIndex/pageCount populated
 * - AbortSignal pre-render still rejects (existing behaviour)
 * - AbortSignal mid-serializer cancels at the next page boundary
 */

import { describe, expect, it } from 'vitest';
import { DOCXErrorCode } from '../src/errors';
import { renderToDocx } from '../src/render';
import type { DocxDocument, DocxElement } from '../src/schema';
import type { RenderProgress } from '../src/types';

function multiPageDoc(count: number): DocxDocument {
  const pages = Array.from({ length: count }, (_, i) => ({
    elements: [
      { type: 'heading', level: 1, text: `Page ${i + 1}` } as DocxElement,
      { type: 'paragraph', text: `Body ${i + 1}` } as DocxElement,
    ],
  }));
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    orientation: 'portrait',
    pages,
  } as DocxDocument;
}

describe('per-page progress', () => {
  it('fires onProgress once per page with pageIndex/pageCount', async () => {
    const events: RenderProgress[] = [];
    const doc = multiPageDoc(5);

    await renderToDocx(doc, {
      onProgress: (p) => {
        events.push({ ...p });
      },
    });

    const perPageEvents = events.filter(
      (e) => e.phase === 'serializing' && e.pageIndex !== undefined,
    );

    expect(perPageEvents).toHaveLength(5);
    for (let i = 0; i < perPageEvents.length; i++) {
      expect(perPageEvents[i].pageIndex).toBe(i);
      expect(perPageEvents[i].pageCount).toBe(5);
      expect(perPageEvents[i].percent).toBeGreaterThanOrEqual(50);
      expect(perPageEvents[i].percent).toBeLessThanOrEqual(90);
      expect(perPageEvents[i].message).toContain(`${i + 1}/5`);
    }
  });

  it('percent grows monotonically across per-page events', async () => {
    const events: RenderProgress[] = [];
    const doc = multiPageDoc(10);
    await renderToDocx(doc, { onProgress: (p) => events.push({ ...p }) });

    const perPage = events.filter((e) => e.phase === 'serializing' && e.pageIndex !== undefined);
    for (let i = 1; i < perPage.length; i++) {
      expect(perPage[i].percent).toBeGreaterThanOrEqual(perPage[i - 1].percent);
    }
  });

  it('does not fire per-page events when onProgress is absent', async () => {
    const doc = multiPageDoc(3);
    // Should not throw despite no callback.
    const result = await renderToDocx(doc);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});

describe('abort signal inside serializer', () => {
  it('pre-aborted signal rejects before serialization', async () => {
    const doc = multiPageDoc(3);
    const controller = new AbortController();
    controller.abort();
    await expect(renderToDocx(doc, { signal: controller.signal })).rejects.toMatchObject({
      code: DOCXErrorCode.RENDER_ABORTED,
      message: 'Render aborted',
    });
  });

  it('aborting mid-render cancels at the next page boundary', async () => {
    const doc = multiPageDoc(20);
    const controller = new AbortController();

    // Abort after the second per-page event fires.
    let seenPages = 0;
    const rejection = renderToDocx(doc, {
      signal: controller.signal,
      onProgress: (p) => {
        if (p.phase === 'serializing' && p.pageIndex !== undefined) {
          seenPages += 1;
          if (seenPages === 2) {
            controller.abort();
          }
        }
      },
    });

    await expect(rejection).rejects.toThrow();
    // We cancelled at page 2; we expect not to have seen all 20 pages.
    expect(seenPages).toBeLessThan(20);
  });
});
