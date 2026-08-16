import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocxDocument } from '../src/schema';
import { normalizeDocxPackageBuffer } from '../src/ooxml/package-normalizer';

const shouldGenerateFixtures = process.env.DOCX_GENERATE_MANUAL_VALIDATION === '1';

async function loadRenderApi() {
  vi.doMock('../src/pro-guard', async () => {
    const actual = await vi.importActual<typeof import('../src/pro-guard')>('../src/pro-guard');
    return {
      ...actual,
      IS_PRO: true,
      requireDocxPro: vi.fn(),
    };
  });

  return import('../src/render');
}

afterEach(() => {
  vi.doUnmock('../src/pro-guard');
  vi.resetModules();
});

const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../output/manual-validation');

function createDoc(
  elements: DocxDocument['pages'][number]['elements'],
  options?: { title?: string; includeToc?: boolean },
): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    metadata: options?.title ? { title: options.title, author: 'Runstamp QA' } : { author: 'Runstamp QA' },
    ...(options?.includeToc
      ? {
          tableOfContents: {
            title: 'Table of Contents',
            maxLevel: 2,
            showPageNumbers: true,
            hyperlinks: true,
          },
        }
      : {}),
    pages: [
      {
        elements,
      },
    ],
  };
}

interface ManualValidationFixture {
  slug: string;
  original: DocxDocument;
  revised: DocxDocument;
  options?: {
    author?: string;
    date?: string;
    granularity?: 'word' | 'sentence' | 'paragraph';
    includeTOC?: boolean;
  };
}

const fixtures: ManualValidationFixture[] = [
  {
    slug: 'formatting',
    original: createDoc([
      {
        type: 'paragraph',
        runs: [{ text: 'Important' }],
      },
    ], { title: 'Formatting Validation' }),
    revised: createDoc([
      {
        type: 'paragraph',
        runs: [{ text: 'Important', style: { textDecoration: 'line-through' } }],
      },
    ], { title: 'Formatting Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'move',
    original: createDoc([
      { type: 'paragraph', text: 'Section Alpha' },
      { type: 'paragraph', text: 'Section Beta' },
      { type: 'paragraph', text: 'Section Gamma' },
    ], { title: 'Move Validation' }),
    revised: createDoc([
      { type: 'paragraph', text: 'Section Beta' },
      { type: 'paragraph', text: 'Section Alpha' },
      { type: 'paragraph', text: 'Section Gamma' },
    ], { title: 'Move Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'table',
    original: createDoc([
      { type: 'paragraph', text: 'Intro' },
      {
        type: 'table',
        rows: [
          { isHeader: true, cells: [{ text: 'A' }, { text: 'B' }] },
          { cells: [{ text: 'C' }, { text: 'D' }] },
        ],
      },
      { type: 'paragraph', text: 'Outro' },
    ], { title: 'Table Validation' }),
    revised: createDoc([
      { type: 'paragraph', text: 'Intro' },
      {
        type: 'table',
        rows: [
          { isHeader: true, cells: [{ text: 'A' }, { text: '' }] },
          { cells: [{ text: '' }, { text: 'D' }] },
        ],
      },
      { type: 'paragraph', text: 'Outro' },
    ], { title: 'Table Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'paragraph-property',
    original: createDoc([
      {
        type: 'paragraph',
        text: 'Payment is due within thirty calendar days of receipt.',
        style: { textAlign: 'left' },
        indent: { left: 240 },
      },
    ], { title: 'Paragraph Property Validation' }),
    revised: createDoc([
      {
        type: 'paragraph',
        text: 'Payment is due within thirty calendar days of receipt.',
        style: { textAlign: 'right' },
        indent: { left: 720 },
      },
    ], { title: 'Paragraph Property Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'paragraph-move',
    original: createDoc([
      { type: 'paragraph', text: 'Clause 1. Introductory terms.' },
      { type: 'paragraph', text: 'Clause 2. The moved obligation remains unchanged.' },
      { type: 'paragraph', text: 'Clause 3. Notices go to the address on file.' },
    ], { title: 'Paragraph Move Validation' }),
    revised: createDoc([
      { type: 'paragraph', text: 'Clause 1. Introductory terms.' },
      { type: 'paragraph', text: 'Clause 3. Notices go to the address on file.' },
      { type: 'paragraph', text: 'Clause 2. The moved obligation remains unchanged.' },
    ], { title: 'Paragraph Move Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'table-property',
    original: createDoc([
      {
        type: 'table',
        tableCaption: 'Payment schedule',
        tableDescription: 'Legacy payment schedule table',
        rows: [
          { isHeader: true, cells: [{ text: 'Milestone' }, { text: 'Amount' }] },
          { cells: [{ text: 'Signing' }, { text: '$10,000' }] },
        ],
      },
    ], { title: 'Table Property Validation' }),
    revised: createDoc([
      {
        type: 'table',
        tableCaption: 'Payment schedule',
        tableDescription: 'Updated payment schedule table',
        rows: [
          { isHeader: true, cells: [{ text: 'Milestone' }, { text: 'Amount' }] },
          { cells: [{ text: 'Signing' }, { text: '$10,000' }] },
        ],
      },
    ], { title: 'Table Property Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'cell-insert',
    original: createDoc([
      {
        type: 'table',
        rows: [
          { isHeader: true, cells: [{ text: 'Clause' }, { text: 'Status' }] },
          { cells: [{ text: 'Confidentiality' }, { text: 'Open' }] },
        ],
      },
    ], { title: 'Cell Insert Validation' }),
    revised: createDoc([
      {
        type: 'table',
        rows: [
          { isHeader: true, cells: [{ text: 'Clause' }, { text: 'Status' }, { text: 'Owner' }] },
          { cells: [{ text: 'Confidentiality' }, { text: 'Open' }, { text: 'Legal' }] },
        ],
      },
    ], { title: 'Cell Insert Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'cell-delete',
    original: createDoc([
      {
        type: 'table',
        rows: [
          { isHeader: true, cells: [{ text: 'Clause' }, { text: 'Status' }, { text: 'Owner' }] },
          { cells: [{ text: 'Confidentiality' }, { text: 'Open' }, { text: 'Legal' }] },
        ],
      },
    ], { title: 'Cell Delete Validation' }),
    revised: createDoc([
      {
        type: 'table',
        rows: [
          { isHeader: true, cells: [{ text: 'Clause' }, { text: 'Status' }] },
          { cells: [{ text: 'Confidentiality' }, { text: 'Open' }] },
        ],
      },
    ], { title: 'Cell Delete Validation' }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
    },
  },
  {
    slug: 'mixed-contract',
    original: createDoc([
      { type: 'heading', level: 1, text: 'Master Services Agreement' },
      { type: 'heading', level: 2, text: 'Commercial Terms' },
      {
        type: 'paragraph',
        text: 'Invoices are payable within thirty calendar days.',
        style: { textAlign: 'left' },
      },
      {
        type: 'table',
        tableDescription: 'Commercial terms table',
        rows: [
          { isHeader: true, cells: [{ text: 'Item' }, { text: 'Value' }] },
          { cells: [{ text: 'Notice period' }, { text: '30 days' }] },
        ],
      },
      { type: 'page-break' },
      { type: 'heading', level: 2, text: 'Operational Terms' },
      { type: 'paragraph', text: 'The moved obligation remains unchanged.' },
      {
        type: 'paragraph',
        runs: [
          { text: 'The service credit is ' },
          { text: '5%', style: { fontWeight: 'bold' } },
          { text: ' of monthly fees.' },
        ],
      },
      {
        type: 'table',
        tableDescription: 'Operational responsibilities table',
        rows: [
          { isHeader: true, cells: [{ text: 'Team' }, { text: 'Responsibility' }, { text: 'SLA' }] },
          { cells: [{ text: 'Vendor' }, { text: 'Support' }, { text: '24 hours' }] },
        ],
      },
    ], { title: 'Mixed Contract Validation', includeToc: true }),
    revised: createDoc([
      { type: 'heading', level: 1, text: 'Master Services Agreement' },
      { type: 'heading', level: 2, text: 'Commercial Terms' },
      {
        type: 'paragraph',
        text: 'Invoices are payable within thirty calendar days.',
        style: { textAlign: 'right' },
        indent: { left: 720 },
      },
      {
        type: 'table',
        tableDescription: 'Commercial terms table (updated)',
        rows: [
          { isHeader: true, cells: [{ text: 'Item' }, { text: 'Value' }, { text: 'Owner' }] },
          { cells: [{ text: 'Notice period' }, { text: '30 days' }, { text: 'Finance' }] },
        ],
      },
      { type: 'page-break' },
      { type: 'heading', level: 2, text: 'Operational Terms' },
      {
        type: 'paragraph',
        runs: [
          { text: 'The service credit is ' },
          { text: '10%', style: { fontWeight: 'bold' } },
          { text: ' of monthly fees.' },
        ],
      },
      {
        type: 'table',
        tableDescription: 'Operational responsibilities table (updated)',
        rows: [
          { isHeader: true, cells: [{ text: 'Team' }, { text: 'Responsibility' }] },
          { cells: [{ text: 'Vendor' }, { text: 'Support' }] },
        ],
      },
      { type: 'paragraph', text: 'The moved obligation remains unchanged.' },
    ], { title: 'Mixed Contract Validation', includeToc: true }),
    options: {
      author: 'Runstamp QA',
      date: '2027-04-01T09:00:00Z',
      includeTOC: true,
    },
  },
];

describe('manual validation fixture pack', () => {
  if (!shouldGenerateFixtures) {
    it('requires an explicit opt-in before writing manual validation artifacts', () => {
      expect(process.env.DOCX_GENERATE_MANUAL_VALIDATION).not.toBe('1');
    });
    return;
  }

  it('generates tracked-change validation fixtures for Word oracle testing', async () => {
    const { renderToDocx, renderWithTrackedChanges } = await loadRenderApi();

    await mkdir(OUTPUT_DIR, { recursive: true });

    for (const fixture of fixtures) {
      const originalResult = await renderToDocx(fixture.original, fixture.options);
      const revisedResult = await renderToDocx(fixture.revised, fixture.options);
      const redlineResult = await renderWithTrackedChanges(fixture.original, fixture.revised, fixture.options);

      const normalizedOriginal = await normalizeDocxPackageBuffer(originalResult.buffer);
      const normalizedRevised = await normalizeDocxPackageBuffer(revisedResult.buffer);
      const normalizedRedline = await normalizeDocxPackageBuffer(redlineResult.buffer);

      await writeFile(resolve(OUTPUT_DIR, `${fixture.slug}-original.docx`), normalizedOriginal);
      await writeFile(resolve(OUTPUT_DIR, `${fixture.slug}-revised.docx`), normalizedRevised);
      await writeFile(resolve(OUTPUT_DIR, `${fixture.slug}-redline.docx`), normalizedRedline);
    }

    expect(fixtures).toHaveLength(9);
  });
});
