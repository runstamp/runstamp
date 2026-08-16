/**
 * High-level report builder.
 *
 * Mirrors the `generate_report_docx` MCP wrapper shape so the same JSON that
 * works against the MCP server also works directly via Mode B
 * (`buildReportDocx(...) → renderToDocx(...)`). Driven by
 * docs/0428-claude-test-based-directive2.md §"@runstamp/docx" item
 * "Make the canonical Mode B shape match `references/examples.md`".
 */
import type { DocxDocument, DocxElement } from '../schema.js';

export interface BuildReportDocxInput {
  /** Report title — rendered as a level-1 heading. */
  title: string;
  /** Optional centered subtitle. */
  subtitle?: string;
  /** Author name; included in the centered byline if present. */
  author?: string;
  /** Report date string (free-form); included in the byline if present. */
  date?: string;
  /** Sections rendered in order. */
  sections: Array<{
    /** Section heading text. */
    heading: string;
    /** Heading level (1..4). Defaults to 1. */
    level?: 1 | 2 | 3 | 4;
    /** Body text. Paragraphs are separated by double newlines. */
    content: string;
    /** Optional bullet list rendered after the section body. */
    bullets?: string[];
  }>;
  /** Show a table-of-contents page. Defaults to true. */
  includeToc?: boolean;
  /** Visual theme preset. Defaults to 'corporate'. */
  theme?: 'corporate' | 'modern' | 'classic' | 'academic' | 'minimal';
  /** Page size. Defaults to 'a4'. */
  pageSize?: 'a4' | 'letter' | 'legal';
  /** Page orientation. Defaults to 'portrait'. */
  orientation?: 'portrait' | 'landscape';
  /** Header text repeated on every page. */
  headerText?: string;
  /** Footer text repeated on every page. */
  footerText?: string;
  /** Show page numbers in the footer. Defaults to true. */
  includePageNumbers?: boolean;
}

export function buildReportDocx(input: BuildReportDocxInput): DocxDocument {
  const elements: DocxElement[] = [];

  elements.push({ type: 'heading', level: 1, text: input.title });
  if (input.subtitle) {
    elements.push({ type: 'paragraph', text: input.subtitle, style: { textAlign: 'center' } });
  }
  if (input.author || input.date) {
    const meta = [input.author, input.date].filter(Boolean).join(' | ');
    elements.push({ type: 'paragraph', text: meta, style: { textAlign: 'center' } });
  }

  elements.push({ type: 'divider' });

  for (const section of input.sections) {
    const level = (section.level ?? 1) as 1 | 2 | 3 | 4;
    elements.push({ type: 'heading', level, text: section.heading });

    const paragraphs = section.content.split('\n\n').filter(Boolean);
    for (const p of paragraphs) {
      elements.push({ type: 'paragraph', text: p });
    }

    if (section.bullets && section.bullets.length > 0) {
      elements.push({
        type: 'list',
        listType: 'bullet',
        items: section.bullets.map((b) => ({ text: b })),
      });
    }
  }

  const includeToc = input.includeToc ?? true;
  const includePageNumbers = input.includePageNumbers ?? true;

  return {
    type: 'DocxDocument',
    pageSize: input.pageSize ?? 'a4',
    orientation: input.orientation ?? 'portrait',
    theme: input.theme ? { preset: input.theme } : { preset: 'corporate' },
    tableOfContents: includeToc ? { title: 'Table of Contents', maxLevel: 3 } : undefined,
    header: input.headerText ? { text: input.headerText } : undefined,
    footer: includePageNumbers
      ? { includePageNumber: true, text: input.footerText }
      : input.footerText
        ? { text: input.footerText }
        : undefined,
    pages: [{ elements }],
  } as DocxDocument;
}
