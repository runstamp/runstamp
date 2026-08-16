import { describe, expect, it } from 'vitest';
import { DOCXErrorCode } from '../src/errors';
import { renderToDocx } from '../src/render';
import type { DocxDocument } from '../src/schema';

function baseDoc(text = 'ok'): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    pages: [{
      elements: [{ type: 'paragraph', text }],
    }],
  };
}

describe('render input resource limits', () => {
  it('rejects oversized string values before schema conversion', async () => {
    await expect(
      renderToDocx(baseDoc('x'.repeat(64)), {
        resourceLimits: { maxInputStringBytes: 32 },
      }),
    ).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      context: { limit: 'maxInputStringBytes' },
    });
  });

  it('rejects oversized base64 payloads before image decode', async () => {
    const doc: DocxDocument = {
      ...baseDoc(),
      pages: [{
        elements: [{
          type: 'image',
          src: `data:image/png;base64,${'A'.repeat(64)}`,
          width: 32,
          height: 32,
          alt: 'oversized payload',
        }],
      }],
    };

    await expect(
      renderToDocx(doc, {
        resourceLimits: {
          maxInputBase64Bytes: 32,
          maxInputStringBytes: 512,
        },
      }),
    ).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      context: { limit: 'maxInputBase64Bytes' },
    });
  });

  it('rejects oversized JSON input before rendering', async () => {
    await expect(
      renderToDocx(baseDoc('bounded'), {
        resourceLimits: { maxInputJsonBytes: 64 },
      }),
    ).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      context: { limit: 'maxInputJsonBytes' },
    });
  });
});
