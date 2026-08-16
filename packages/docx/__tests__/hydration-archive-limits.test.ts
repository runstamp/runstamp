import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { DOCXErrorCode } from '../src/errors';
import { hydrateTemplate, scanTemplate } from '../src/hydration/hydrator';
import { hydrateDocx } from '../src/render';

async function makeArchive(parts: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(parts)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

describe('hydration input archive limits', () => {
  it('rejects compressed templates over the configured ceiling', async () => {
    const archive = await makeArchive({ 'word/document.xml': '<w:document />' });
    await expect(hydrateTemplate(archive, {}, {
      archiveLimits: { maxCompressedBytes: archive.length - 1 },
    })).rejects.toMatchObject({ code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED });
  });

  it('rejects templates with too many ZIP entries', async () => {
    const archive = await makeArchive({ a: 'a', b: 'b', c: 'c' });
    await expect(hydrateTemplate(archive, {}, {
      archiveLimits: { maxEntries: 2 },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      message: expect.stringContaining('ZIP-entry limit'),
    });
  });

  it('rejects a part whose expanded size exceeds its ceiling', async () => {
    const archive = await makeArchive({ 'word/document.xml': 'x'.repeat(4_096) });
    await expect(hydrateTemplate(archive, {}, {
      archiveLimits: { maxPartBytes: 1_024 },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      message: expect.stringContaining('expanded-size limit'),
    });
  });

  it('rejects cumulative expansion across individually-small parts', async () => {
    const archive = await makeArchive({ a: 'a'.repeat(800), b: 'b'.repeat(800) });
    await expect(hydrateTemplate(archive, {}, {
      archiveLimits: { maxPartBytes: 1_000, maxTotalExpandedBytes: 1_200 },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      message: expect.stringContaining('total expanded-size limit'),
    });
  });

  it('applies archive limits through hydrateDocx and scanTemplate', async () => {
    const archive = await makeArchive({ 'word/document.xml': '<w:document />' });
    await expect(hydrateDocx(archive, {}, {
      archiveLimits: { maxEntries: 0 },
    })).rejects.toMatchObject({ code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED });
    await expect(scanTemplate(archive, 'auto', {
      maxEntries: 0,
    })).rejects.toMatchObject({ code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED });
  });

  it('rejects invalid limit values instead of failing open', async () => {
    const archive = await makeArchive({ 'word/document.xml': '<w:document />' });
    await expect(hydrateTemplate(archive, {}, {
      archiveLimits: { maxPartBytes: Number.NaN },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      message: expect.stringContaining('non-negative safe integer'),
    });
  });
});
