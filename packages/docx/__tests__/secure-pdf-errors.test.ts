import { describe, expect, it } from 'vitest';
import { SecurePDF } from '../src/secure/SecurePDF';

describe('SecurePDF public errors', () => {
  it('rejects empty PDF merges with a structured SecurePDFError', async () => {
    await expect(SecurePDF.merge([])).rejects.toMatchObject({
      name: 'SecurePDFError',
      code: 'NO_PDFS_PROVIDED',
      message: 'SecurePDF.merge: No PDFs provided',
    });
  });
});
