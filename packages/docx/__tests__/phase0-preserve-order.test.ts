import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { XMLBuilder } from 'fast-xml-parser';
import { renderToDocx } from '../src/render.js';

const SHOULD_WRITE_MANUAL_ARTIFACTS = process.env.DOCX_GENERATE_MANUAL_VALIDATION === '1';
const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../output/manual-validation');
const ORDERED_FILE_NAME = 'phase0-preserve-order-true.docx';
const UNORDERED_FILE_NAME = 'phase0-preserve-order-false.docx';
const SUMMARY_FILE_NAME = 'phase0-preserve-order-results.json';

type ValidatorResult = {
  file: string;
  ok: boolean;
  errors: Array<{
    description?: string;
    path?: string;
    xPath?: string;
    id?: string;
    errorType?: string;
  }>;
};

let tempDirToCleanup: string | null = null;

afterEach(async () => {
  if (tempDirToCleanup) {
    await rm(tempDirToCleanup, { recursive: true, force: true });
    tempDirToCleanup = null;
  }
});

function buildRunPropertiesXml(preserveOrder: boolean): string {
  const builder = new XMLBuilder({
    preserveOrder,
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    processEntities: false,
    format: false,
  });

  if (preserveOrder) {
    return builder.build([
      {
        'w:rPr': [
          { 'w:b': [] },
          { 'w:i': [] },
          { 'w:color': [], ':@': { '@_w:val': 'FF0000' } },
          { 'w:sz': [], ':@': { '@_w:val': '24' } },
        ],
      },
    ]);
  }

  return builder.build({
    'w:rPr': {
      'w:color': {
        '@_w:val': 'FF0000',
      },
      'w:b': {},
      'w:i': {},
      'w:sz': {
        '@_w:val': '24',
      },
    },
  });
}

function extractDocumentShell(baseDocumentXml: string): { startTag: string; sectionProperties: string } {
  const startTagMatch = baseDocumentXml.match(/<w:document\b[^>]*>/);
  const sectionPropertiesMatch = baseDocumentXml.match(/<w:sectPr[\s\S]*<\/w:sectPr>/);

  if (!startTagMatch || !sectionPropertiesMatch) {
    throw new Error('Failed to extract DOCX document shell from baseline package');
  }

  return {
    startTag: startTagMatch[0],
    sectionProperties: sectionPropertiesMatch[0],
  };
}

function buildDocumentXml(startTag: string, sectionProperties: string, runPropertiesXml: string, label: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    startTag,
    '<w:body>',
    '<w:p>',
    '<w:r>',
    runPropertiesXml,
    `<w:t>${label}</w:t>`,
    '</w:r>',
    '</w:p>',
    sectionProperties,
    '</w:body>',
    '</w:document>',
  ].join('');
}

async function buildVariantPackage(baseBuffer: Buffer, documentXml: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(baseBuffer);
  zip.file('word/document.xml', documentXml);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function assertTagOrder(xml: string, orderedTags: string[]): void {
  let previousIndex = -1;
  for (const tag of orderedTags) {
    const index = xml.indexOf(tag);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
}

describe('Phase 0 preserveOrder spike', () => {
  it('proves preserveOrder=true yields explicit OOXML child ordering and validates both variants', async () => {
    const baseResult = await renderToDocx({
      type: 'DocxDocument',
      pageSize: 'a4',
      pages: [
        {
          elements: [
            { type: 'paragraph', text: 'Phase 0 baseline' },
          ],
        },
      ],
    });

    const baselineZip = await JSZip.loadAsync(baseResult.buffer);
    const baselineDocumentXml = await baselineZip.file('word/document.xml')?.async('string');
    expect(baselineDocumentXml).toBeTruthy();

    const { startTag, sectionProperties } = extractDocumentShell(baselineDocumentXml ?? '');
    const orderedRunPropertiesXml = buildRunPropertiesXml(true);
    const unorderedRunPropertiesXml = buildRunPropertiesXml(false);

    assertTagOrder(orderedRunPropertiesXml, ['<w:b', '<w:i', '<w:color', '<w:sz']);
    assertTagOrder(unorderedRunPropertiesXml, ['<w:color', '<w:b', '<w:i', '<w:sz']);

    const orderedDocumentXml = buildDocumentXml(
      startTag,
      sectionProperties,
      orderedRunPropertiesXml,
      'Phase 0 preserveOrder=true',
    );
    const unorderedDocumentXml = buildDocumentXml(
      startTag,
      sectionProperties,
      unorderedRunPropertiesXml,
      'Phase 0 preserveOrder=false',
    );

    const orderedBuffer = await buildVariantPackage(baseResult.buffer, orderedDocumentXml);
    const unorderedBuffer = await buildVariantPackage(baseResult.buffer, unorderedDocumentXml);

    const tempDir = await mkdtemp(join(tmpdir(), 'runstamp-docx-phase0-'));
    tempDirToCleanup = tempDir;

    const orderedPath = join(tempDir, ORDERED_FILE_NAME);
    const unorderedPath = join(tempDir, UNORDERED_FILE_NAME);
    await writeFile(orderedPath, orderedBuffer);
    await writeFile(unorderedPath, unorderedBuffer);

    const { validateFile } = await import('@xarsh/ooxml-validator');
    const orderedValidation = await validateFile(orderedPath, { officeVersion: 'Microsoft365' }) as ValidatorResult;
    const unorderedValidation = await validateFile(unorderedPath, { officeVersion: 'Microsoft365' }) as ValidatorResult;

    expect(orderedValidation.ok).toBe(true);
    expect(typeof unorderedValidation.ok).toBe('boolean');

    if (SHOULD_WRITE_MANUAL_ARTIFACTS) {
      await mkdir(OUTPUT_DIR, { recursive: true });
      await writeFile(resolve(OUTPUT_DIR, ORDERED_FILE_NAME), orderedBuffer);
      await writeFile(resolve(OUTPUT_DIR, UNORDERED_FILE_NAME), unorderedBuffer);
      await writeFile(
        resolve(OUTPUT_DIR, SUMMARY_FILE_NAME),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            ordered: {
              fileName: ORDERED_FILE_NAME,
              validation: orderedValidation,
            },
            unordered: {
              fileName: UNORDERED_FILE_NAME,
              validation: unorderedValidation,
            },
            xml: {
              orderedRunPropertiesXml,
              unorderedRunPropertiesXml,
            },
          },
          null,
          2,
        ),
      );
    }
  });
});
