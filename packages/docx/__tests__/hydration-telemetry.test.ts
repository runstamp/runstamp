/**
 * Hydration telemetry (Phase 3.3 partial).
 *
 * hydrateDocx() must surface every unfilled placeholder as a
 * DOCX_HYDRATE_UNFILLED_PLACEHOLDER warning with the placeholder name
 * in context.placeholder — no silent failures.
 */

import { describe, expect, it } from 'vitest';
import { hydrateDocx, renderToDocx } from '../src/render';
import type { DocxDocument } from '../src/schema';

async function buildTemplate(): Promise<Buffer> {
  const doc: DocxDocument = {
    type: 'DocxDocument',
    pageSize: 'a4',
    orientation: 'portrait',
    pages: [{
      elements: [
        { type: 'paragraph', text: 'Hello {{name}}, your order is {{orderId}}.' },
        { type: 'paragraph', text: 'Total: {{total}}' },
      ],
    }],
  } as DocxDocument;
  const result = await renderToDocx(doc);
  return result.buffer;
}

describe('hydrateDocx telemetry', () => {
  it('emits DOCX_HYDRATE_UNFILLED_PLACEHOLDER for each missing key', async () => {
    const template = await buildTemplate();
    const result = await hydrateDocx(template, { name: 'Alice' });
    const unfilled = result.warnings.filter(w => w.code === 'DOCX_HYDRATE_UNFILLED_PLACEHOLDER');
    const placeholders = unfilled.map(w => w.context?.placeholder).sort();
    expect(placeholders).toEqual(['orderId', 'total']);
    for (const w of unfilled) {
      expect(w.recovery).toMatch(/provide a value/i);
    }
  });

  it('emits no warnings when all keys are provided', async () => {
    const template = await buildTemplate();
    const result = await hydrateDocx(template, {
      name: 'Alice',
      orderId: '12345',
      total: '$99.99',
    });
    const unfilled = result.warnings.filter(w => w.code === 'DOCX_HYDRATE_UNFILLED_PLACEHOLDER');
    expect(unfilled).toHaveLength(0);
  });

  it('throws in strict mode (onMissing: error)', async () => {
    const template = await buildTemplate();
    await expect(
      hydrateDocx(template, { name: 'Alice' }, { onMissing: 'error' }),
    ).rejects.toThrow();
  });

  it('preserves output buffer regardless of unfilled state', async () => {
    const template = await buildTemplate();
    const result = await hydrateDocx(template, { name: 'Alice' });
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});
