/**
 * Structural validator gate (Phase 0.3).
 *
 * Runs the canonical byte-reproducibility fixture set through two
 * independent validators:
 *
 *   1. @xarsh/ooxml-validator — ECMA-376 schema check (Microsoft365 mode)
 *   2. mammoth — round-trip text extraction (proves Word can read it)
 *
 * A fixture that fails either check fails the CI gate. Validator + parse
 * failures are the leading indicators of the silent "Word opens but
 * repairs the file" bug class, so catching them pre-merge is critical.
 *
 * Fixture set mirrors __tests__/byte-reproducibility.test.ts; keep them
 * in sync — any input we claim is byte-reproducible must also be
 * structurally valid.
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mammoth from 'mammoth';
import { renderToDocx } from '../src/render';
import type { DocxDocument, DocxElement } from '../src/schema';

const PNG_PIXEL_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';

function baseDoc(overrides: Partial<DocxDocument>): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    orientation: 'portrait',
    pages: overrides.pages ?? [{ elements: [{ type: 'paragraph', text: 'placeholder' } as DocxElement] }],
    ...overrides,
  } as DocxDocument;
}

interface Fixture {
  name: string;
  /** Substrings mammoth must extract from the document body. */
  expectedText: string[];
  build: () => DocxDocument;
}

const FIXTURES: Fixture[] = [
  {
    name: 'minimal paragraph',
    expectedText: ['Hello, world.'],
    build: () => baseDoc({
      pages: [{ elements: [{ type: 'paragraph', text: 'Hello, world.' } as DocxElement] }],
    }),
  },
  {
    name: 'headings + paragraphs',
    expectedText: ['Heading level 1', 'Heading level 6', 'Body text'],
    build: () => baseDoc({
      pages: [{
        elements: [
          ...Array.from({ length: 6 }, (_, i) => ({
            type: 'heading' as const,
            level: (i + 1) as 1|2|3|4|5|6,
            text: `Heading level ${i + 1}`,
          })),
          { type: 'paragraph', text: 'Body text under each heading.' } as DocxElement,
        ],
      }],
    }),
  },
  {
    name: 'table',
    expectedText: ['Year', 'Revenue', '2024'],
    build: () => baseDoc({
      pages: [{
        elements: [{
          type: 'table',
          repeatHeaders: true,
          rows: [
            { isHeader: true, cells: [{ text: 'Year' }, { text: 'Revenue' }]},
            { cells: [{ text: '2024' }, { text: '$12M' }]},
            { cells: [{ text: '2025' }, { text: '$15M' }]},
          ],
        } as DocxElement],
      }],
    }),
  },
  {
    name: 'bullet list',
    expectedText: ['Apple', 'Banana', 'Cherry'],
    build: () => baseDoc({
      pages: [{
        elements: [{
          type: 'list',
          listType: 'bullet',
          items: [{ text: 'Apple' }, { text: 'Banana' }, { text: 'Cherry' }],
        } as DocxElement],
      }],
    }),
  },
  {
    name: 'image + paragraph',
    expectedText: ['Before image', 'After image'],
    build: () => baseDoc({
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Before image' } as DocxElement,
          { type: 'image', src: PNG_PIXEL_DATA_URI, alt: 'pixel', width: 72, height: 72 } as DocxElement,
          { type: 'paragraph', text: 'After image' } as DocxElement,
        ],
      }],
    }),
  },
  {
    name: 'TOC + bookmarks',
    expectedText: ['Chapter 1', 'Chapter 2'],
    build: () => baseDoc({
      tableOfContents: { maxLevel: 2 },
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Chapter 1', bookmarkId: 'ch1' } as DocxElement,
          { type: 'paragraph', text: 'Body 1' } as DocxElement,
          { type: 'heading', level: 1, text: 'Chapter 2', bookmarkId: 'ch2' } as DocxElement,
          { type: 'paragraph', text: 'Body 2' } as DocxElement,
        ],
      }],
    }),
  },
  {
    name: 'watermark + header + footer',
    expectedText: ['Body content'],
    build: () => baseDoc({
      watermark: 'DRAFT',
      header: { text: 'Global Header' },
      footer: { text: 'Global Footer', includePageNumber: true },
      pages: [{ elements: [{ type: 'paragraph', text: 'Body content' } as DocxElement] }],
    }),
  },
  {
    name: 'multi-page',
    expectedText: ['Page One', 'Page Two'],
    build: () => baseDoc({
      pages: [
        { elements: [{ type: 'heading', level: 1, text: 'Page One' } as DocxElement] },
        { elements: [{ type: 'heading', level: 1, text: 'Page Two' } as DocxElement], sectionBreak: 'nextPage' },
      ],
    }),
  },
  {
    name: 'code block',
    expectedText: ['function f(x: number)'],
    build: () => baseDoc({
      pages: [{
        elements: [{
          type: 'code-block',
          code: 'function f(x: number): number {\n  return x + 1;\n}\n',
          language: 'typescript',
        } as DocxElement],
      }],
    }),
  },
  {
    name: 'metadata + accessibility',
    expectedText: ['Accessible Title'],
    build: () => baseDoc({
      metadata: { title: 'A11y Doc', author: 'Runstamp', language: 'en-US' },
      accessible: { level: 'AA', language: 'en-US' },
      pages: [{
        elements: [{ type: 'heading', level: 1, text: 'Accessible Title' } as DocxElement],
      }],
    }),
  },
];

async function writeTempDocx(buffer: Buffer): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'runstamp-validator-'));
  const path = join(dir, 'fixture.docx');
  await writeFile(path, buffer);
  return {
    path,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

interface XarshValidatorResult {
  ok: boolean;
  errors: unknown[];
}

describe('structural-validator gate', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.name}: passes @xarsh/ooxml-validator + mammoth`, async () => {
      const doc = fixture.build();
      const result = await renderToDocx(doc, { licenseKey: process.env.RUNSTAMP_LICENSE_KEY });

      expect(result.buffer.length).toBeGreaterThan(0);

      const { path, cleanup } = await writeTempDocx(result.buffer);
      try {
        // 1. OOXML schema validator
        const { validateFile } = await import('@xarsh/ooxml-validator');
        const validated = (await validateFile(path, {
          officeVersion: 'Microsoft365',
        })) as XarshValidatorResult;

        if (!validated.ok) {
          throw new Error(
            `Fixture "${fixture.name}" failed OOXML validation with ${validated.errors.length} error(s): ` +
            JSON.stringify(validated.errors.slice(0, 5), null, 2),
          );
        }

        // 2. mammoth round-trip text extraction
        const extracted = await mammoth.extractRawText({ buffer: result.buffer });
        for (const needle of fixture.expectedText) {
          expect(extracted.value, `mammoth extraction missing: "${needle}"`).toContain(needle);
        }
      } finally {
        await cleanup();
      }
    }, 30000);
  }
});
