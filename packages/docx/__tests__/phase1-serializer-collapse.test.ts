import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as docx from '../src/index';
import { normalizeDocxPackageBuffer } from '../src/ooxml/package-normalizer';
import { renderToDocx } from '../src/render';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, '..');

describe('Phase 1 serializer collapse', () => {
  it('keeps legacy serializer APIs off the public package surface', () => {
    expect('serializeStructuredToDOCX' in docx).toBe(false);
    expect('StructuredDOCXSerializer' in docx).toBe(false);
  });

  it('does not depend on the legacy docx library', async () => {
    const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'));
    for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      expect(packageJson[group]?.docx).toBeUndefined();
    }
  });

  it('renders former legacy semantic coverage through the native serializer', async () => {
    const result = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      tableOfContents: { title: 'Contents', maxLevel: 2, hyperlinks: true },
      watermark: { text: 'DRAFT', opacity: 0.25, rotation: -35 },
      options: { columns: 2 },
      pages: [{
        header: { text: 'Native header {PAGE}' },
        footer: { text: 'Native footer {NUMPAGES}' },
        elements: [
          { type: 'heading', level: 1, text: 'Native Serializer Migration' },
          {
            type: 'paragraph',
            runs: [
              { text: 'Rich ', style: { fontWeight: 'bold' } },
              { text: 'text ', style: { fontStyle: 'italic' } },
              { text: 'and links', hyperlink: 'https://runstamp.com' },
            ],
          },
          {
            type: 'list',
            listType: 'number',
            items: [
              { text: 'First migrated behavior' },
              { text: 'Second migrated behavior' },
            ],
          },
          {
            type: 'table',
            rows: [
              { isHeader: true, cells: [{ text: 'Feature' }, { text: 'Status' }] },
              { cells: [{ text: 'Native serializer' }, { text: 'Only path' }] },
            ],
          },
        ],
      }],
    });

    const normalized = await normalizeDocxPackageBuffer(result.buffer);
    const quality = await docx.runDocxQualityGate({
      buffer: normalized,
      stats: result.stats,
      expected: {
        textIncludes: [
          'Native Serializer Migration',
          'First migrated behavior',
          'Native serializer',
        ],
        warningCodes: [],
      },
    });

    expect(quality.verdict).not.toBe('rejected');
    expect(quality.findings.filter((finding) => finding.severity === 'error')).toHaveLength(0);
  });
});
