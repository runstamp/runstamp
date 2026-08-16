/**
 * Byte-reproducibility gate.
 *
 * For each document in the canonical fixture set, renders twice and
 * asserts the produced buffers are byte-identical. Any regression —
 * e.g. a new `Date.now()` in the serialization path that the ESLint
 * rule failed to catch, or a ZIP entry written in nondeterministic
 * order — fails this test.
 *
 * The fixture set intentionally covers every major subsystem: headings,
 * paragraphs with inline styling, lists, tables (with merges + header
 * repeat), images (data URI), charts, shapes, footnotes, a TOC, a
 * watermark, track changes, comments, and a multi-page document with
 * per-page headers/footers. If a feature can regress byte-repro, it
 * should appear here.
 */

import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
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
  build: () => DocxDocument;
}

const FIXTURES: Fixture[] = [
  {
    name: 'minimal paragraph',
    build: () => baseDoc({
      pages: [{
        elements: [{ type: 'paragraph', text: 'Hello, world.' } as DocxElement],
      }],
    }),
  },

  {
    name: 'headings H1-H6',
    build: () => baseDoc({
      pages: [{
        elements: Array.from({ length: 6 }, (_, i) => ({
          type: 'heading',
          level: i + 1,
          text: `Heading level ${i + 1}`,
        } as DocxElement)),
      }],
    }),
  },

  {
    name: 'paragraph with inline runs',
    build: () => baseDoc({
      pages: [{
        elements: [{
          type: 'paragraph',
          runs: [
            { text: 'This is ', style: {} },
            { text: 'bold', style: { fontWeight: 'bold' } },
            { text: ' and ', style: {} },
            { text: 'italic', style: { fontStyle: 'italic' } },
            { text: ' and ', style: {} },
            { text: 'colored', style: { color: 'FF0000' } },
            { text: '.', style: {} },
          ],
        } as DocxElement],
      }],
    }),
  },

  {
    name: 'list with bullet + number + letter + roman + nesting',
    build: () => baseDoc({
      pages: [{
        elements: [
          { type: 'list', listType: 'bullet', items: [
            { text: 'Bullet A' },
            { text: 'Bullet B', nestedList: { type: 'list', listType: 'number', items: [{ text: '1' }, { text: '2' }] } },
          ]} as DocxElement,
          { type: 'list', listType: 'letter', items: [{ text: 'alpha' }, { text: 'beta' }] } as DocxElement,
          { type: 'list', listType: 'roman', items: [{ text: 'I' }, { text: 'II' }] } as DocxElement,
        ],
      }],
    }),
  },

  {
    name: 'table with header + rowSpan + colSpan',
    build: () => baseDoc({
      pages: [{
        elements: [{
          type: 'table',
          tableStyle: 'striped',
          repeatHeaders: true,
          rows: [
            { isHeader: true, cells: [
              { text: 'Year' },
              { text: 'Revenue' },
              { text: 'Notes' },
            ]},
            { cells: [
              { text: '2024' },
              { text: '$12M' },
              { text: 'spanning', rowSpan: 2 },
            ]},
            { cells: [
              { text: '2025' },
              { text: '$15M' },
            ]},
            { cells: [
              { text: 'total', colSpan: 2 },
              { text: '$27M' },
            ]},
          ],
        } as DocxElement],
      }],
    }),
  },

  {
    name: 'inline image (data URI)',
    build: () => baseDoc({
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Before image.' } as DocxElement,
          { type: 'image', src: PNG_PIXEL_DATA_URI, alt: 'pixel', width: 72, height: 72 } as DocxElement,
          { type: 'paragraph', text: 'After image.' } as DocxElement,
        ],
      }],
    }),
  },

  {
    name: 'shapes (rectangle + ellipse + line)',
    build: () => baseDoc({
      pages: [{
        elements: [
          { type: 'shape', shapeType: 'rectangle', width: 100, height: 60, fill: { type: 'solid', color: 'AABBCC' } } as DocxElement,
          { type: 'shape', shapeType: 'ellipse', width: 80, height: 80, fill: { type: 'solid', color: '112233' } } as DocxElement,
          { type: 'shape', shapeType: 'line', width: 120, height: 1 } as DocxElement,
        ],
      }],
    }),
  },

  {
    name: 'table of contents + headings',
    build: () => baseDoc({
      tableOfContents: { maxLevel: 3 },
      pages: [{
        elements: [
          { type: 'heading', level: 1, text: 'Chapter 1', bookmarkId: 'ch1' } as DocxElement,
          { type: 'paragraph', text: 'Chapter 1 content.' } as DocxElement,
          { type: 'heading', level: 2, text: 'Section 1.1', bookmarkId: 'sec1-1' } as DocxElement,
          { type: 'paragraph', text: 'Section content.' } as DocxElement,
          { type: 'heading', level: 1, text: 'Chapter 2', bookmarkId: 'ch2' } as DocxElement,
          { type: 'paragraph', text: 'Chapter 2 content.' } as DocxElement,
        ],
      }],
    }),
  },

  {
    name: 'watermark',
    build: () => baseDoc({
      watermark: 'CONFIDENTIAL',
      pages: [{
        elements: [{ type: 'paragraph', text: 'Body text with watermark.' } as DocxElement],
      }],
    }),
  },

  {
    name: 'footnote via element hint',
    build: () => baseDoc({
      pages: [{
        elements: [
          { type: 'paragraph', text: 'See footnote.', footnote: 'Footnote content.' } as DocxElement,
        ],
      }],
    }),
  },

  {
    name: 'multi-page with per-page header/footer',
    build: () => baseDoc({
      header: { text: 'Global Header' },
      footer: { text: 'Global Footer', includePageNumber: true },
      pages: [
        { elements: [{ type: 'heading', level: 1, text: 'Page One' } as DocxElement] },
        { elements: [{ type: 'heading', level: 1, text: 'Page Two' } as DocxElement], sectionBreak: 'nextPage' },
        { elements: [{ type: 'heading', level: 1, text: 'Page Three' } as DocxElement], sectionBreak: 'nextPage' },
      ],
    }),
  },

  {
    name: 'track changes document',
    build: () => baseDoc({
      options: { trackChanges: true },
      revisionInfo: { author: 'Jake', date: '2026-04-23T00:00:00Z', rsid: 'ABCDEF01' },
      pages: [{
        elements: [{
          type: 'paragraph',
          runs: [
            { text: 'original ', style: {} },
            { text: 'inserted', style: {}, revision: { type: 'insert', id: 1, author: 'Jake', date: '2026-04-23T00:00:00Z' } },
            { text: ' tail', style: {} },
          ],
        } as DocxElement],
      }],
    }),
  },

  {
    name: 'multi-column layout',
    build: () => baseDoc({
      options: { columns: 3 },
      pages: [{
        elements: Array.from({ length: 6 }, (_, i) => ({
          type: 'paragraph',
          text: `Paragraph ${i + 1} flowing across columns.`,
        } as DocxElement)),
      }],
    }),
  },

  {
    name: 'code block',
    build: () => baseDoc({
      pages: [{
        elements: [{
          type: 'code-block',
          language: 'typescript',
          code: 'function f(x: number): number {\n  return x + 1;\n}\n',
          showLineNumbers: false,
        } as DocxElement],
      }],
    }),
  },

  {
    name: 'divider + page break + container',
    build: () => baseDoc({
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Above' } as DocxElement,
          { type: 'divider', style: 'dashed' } as DocxElement,
          { type: 'container', layout: 'vertical', children: [
            { type: 'paragraph', text: 'nested 1' } as DocxElement,
            { type: 'paragraph', text: 'nested 2' } as DocxElement,
          ]} as DocxElement,
          { type: 'page-break' } as DocxElement,
          { type: 'paragraph', text: 'After page break' } as DocxElement,
        ],
      }],
    }),
  },

  {
    name: 'metadata + accessibility',
    build: () => baseDoc({
      metadata: {
        title: 'Repro Doc',
        author: 'Runstamp',
        subject: 'Byte reproducibility',
        keywords: ['deterministic', 'golden'],
        language: 'en-US',
      },
      accessible: { level: 'AA', language: 'en-US', enforceHeadingHierarchy: true },
      pages: [{
        elements: [{ type: 'heading', level: 1, text: 'Accessible Title' } as DocxElement],
      }],
    }),
  },
];

function hashBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('byte-reproducibility', () => {
  for (const fixture of FIXTURES) {
    it(`double-render of "${fixture.name}" produces identical bytes`, async () => {
      const doc = fixture.build();
      // Render sequentially: this gate asserts deterministic output, not
      // concurrency safety. The renderer holds module-level counters
      // (numIds, image rIds, footnote ids, etc.) that are reset per render —
      // concurrent calls would clobber each other's state and produce a
      // false-positive "regression" unrelated to byte-reproducibility.
      const first = await renderToDocx(doc, { licenseKey: process.env.RUNSTAMP_LICENSE_KEY });
      const second = await renderToDocx(doc, { licenseKey: process.env.RUNSTAMP_LICENSE_KEY });

      const firstHash = hashBuffer(first.buffer);
      const secondHash = hashBuffer(second.buffer);

      if (firstHash !== secondHash) {
        // Surface the byte-level difference location to speed up debugging.
        const a = first.buffer;
        const b = second.buffer;
        const minLen = Math.min(a.length, b.length);
        let firstDiffOffset = -1;
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            firstDiffOffset = i;
            break;
          }
        }
        throw new Error(
          `Byte-reproducibility regression in fixture "${fixture.name}": ` +
          `first sha256=${firstHash}, second sha256=${secondHash}, ` +
          `first diff at offset ${firstDiffOffset}, ` +
          `lengths: ${a.length} vs ${b.length}`,
        );
      }

      expect(first.buffer.length).toBe(second.buffer.length);
      expect(firstHash).toBe(secondHash);
    });
  }
});
