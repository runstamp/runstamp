/**
 * Accessibility Validator Tests
 * =============================
 * Tests for the Pro tier WCAG accessibility validator.
 * Imports the internal validator directly (bypasses Pro guard).
 */

import { describe, it, expect } from 'vitest';
import { validateAccessibility } from '../src/accessibility/validator.js';
import { remediateAccessibility } from '../src/accessibility/remediator.js';
import type {
  StructuredDocument,
  ImageElement,
  TableElement,
  HeadingElement,
  ParagraphElement,
  ListElement,
} from '../src/types.js';

// =============================================================================
// HELPERS
// =============================================================================

function makeDoc(overrides: Partial<StructuredDocument> = {}): StructuredDocument {
  return {
    __kind: 'StructuredDocument',
    metadata: { title: 'Test Doc', language: 'en-US', ...overrides.metadata },
    pages: overrides.pages ?? [{
      pageNumber: 1,
      dimensions: { width: 595, height: 842, margins: { top: 72, right: 72, bottom: 72, left: 72 } },
      elements: [],
    }],
    styles: {} as any,
    assets: { images: new Map(), fonts: new Map(), embeddedFiles: new Map() },
    stats: { totalPages: 1, totalElements: 0 } as any,
    warnings: [],
  };
}

const defaultPosition = { x: 0, y: 0, width: 100, height: 20 };
const defaultStyle = {
  borderTopWidth: 0, borderTopColor: '', borderTopStyle: 'none',
  borderRightWidth: 0, borderRightColor: '', borderRightStyle: 'none',
  borderBottomWidth: 0, borderBottomColor: '', borderBottomStyle: 'none',
  borderLeftWidth: 0, borderLeftColor: '', borderLeftStyle: 'none',
  borderRadius: 0,
  paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
  fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal',
  lineHeight: 1.2, letterSpacing: 0, textAlign: 'left' as const,
  textDecoration: 'none', color: '#000000',
  display: 'block', visibility: 'visible', overflow: 'visible', opacity: 1,
};

let _id = 0;
function nextId(): string { return `el-${++_id}`; }

function makeHeading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string): HeadingElement {
  return {
    id: nextId(), type: 'heading', level, text,
    runs: [{ text, fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', color: '#000000' }],
    position: defaultPosition, zIndex: 0, opacity: 1, style: defaultStyle, tagName: `h${level}`, dataAttributes: {},
  };
}

function makeParagraph(text: string): ParagraphElement {
  return {
    id: nextId(), type: 'paragraph', text,
    runs: [{ text, fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#000000' }],
    position: defaultPosition, zIndex: 0, opacity: 1, style: defaultStyle, tagName: 'p', dataAttributes: {},
  };
}

function makeImage(opts: { alt?: string; decorative?: boolean } = {}): ImageElement {
  return {
    id: nextId(), type: 'image', src: 'https://example.com/img.png',
    alt: opts.alt as any, decorative: opts.decorative,
    position: defaultPosition, zIndex: 0, opacity: 1, style: defaultStyle, tagName: 'img', dataAttributes: {},
  };
}

function makeTable(opts: { headerRowCount?: number; caption?: string; tableCaption?: string } = {}): TableElement {
  return {
    id: nextId(), type: 'table',
    columns: [{ width: 100 }],
    rows: [{
      index: 0, height: 20, isHeader: (opts.headerRowCount ?? 0) > 0, isFooter: false,
      cells: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1, content: [], text: 'Cell',
        style: { padding: { top: 2, right: 2, bottom: 2, left: 2 }, verticalAlign: 'top', textAlign: 'left' }, isHeader: false }],
    }],
    headerRowCount: opts.headerRowCount ?? 0,
    footerRowCount: 0,
    repeatHeaders: true,
    cellMatrix: [],
    caption: opts.caption,
    tableCaption: opts.tableCaption,
    position: defaultPosition, zIndex: 0, opacity: 1, style: defaultStyle, tagName: 'table', dataAttributes: {},
  };
}

function makePage(elements: any[]) {
  return {
    pageNumber: 1,
    dimensions: { width: 595, height: 842, margins: { top: 72, right: 72, bottom: 72, left: 72 } },
    elements,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Accessibility Validator', () => {
  it('fully accessible document scores 100', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeHeading(1, 'Title'),
        makeImage({ alt: 'A descriptive image' }),
        makeTable({ headerRowCount: 1, tableCaption: 'Revenue table' }),
      ])],
    });

    const report = validateAccessibility(doc);

    expect(report.score).toBe(100);
    expect(report.level).toBe('AAA');
    expect(report.violations).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('detects heading skip H1→H3', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeHeading(1, 'Title'),
        makeHeading(3, 'Subsection'),
      ])],
    });

    const report = validateAccessibility(doc);
    const skip = report.violations.find(v => v.code === 'HEADING_SKIP');

    expect(skip).toBeDefined();
    expect(skip!.severity).toBe('error');
    expect(skip!.message).toContain('H1');
    expect(skip!.message).toContain('H3');
  });

  it('allows sequential headings', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeHeading(1, 'Title'),
        makeHeading(2, 'Section'),
        makeHeading(3, 'Subsection'),
      ])],
    });

    const report = validateAccessibility(doc);
    const skips = report.violations.filter(v => v.code === 'HEADING_SKIP');

    expect(skips).toHaveLength(0);
  });

  it('detects missing image alt text', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeImage({ alt: undefined }),
      ])],
    });

    const report = validateAccessibility(doc);
    const violation = report.violations.find(v => v.code === 'IMG_ALT_MISSING');

    expect(violation).toBeDefined();
    expect(violation!.severity).toBe('error');
    expect(report.issues.some((issue) => issue.code === 'image.alt_missing')).toBe(true);
  });

  it('skips decorative images', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeImage({ decorative: true }),
      ])],
    });

    const report = validateAccessibility(doc);
    const imgViolations = [...report.violations, ...report.warnings].filter(
      v => v.code === 'IMG_ALT_MISSING' || v.code === 'IMG_ALT_EMPTY',
    );

    expect(imgViolations).toHaveLength(0);
    expect(report.summary.imagesDecorativeMarked).toBe(1);
  });

  it('detects empty image alt text', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeImage({ alt: '' }),
      ])],
    });

    const report = validateAccessibility(doc);
    const warning = report.warnings.find(v => v.code === 'IMG_ALT_EMPTY');

    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('applies conservative remediation without overwriting existing metadata', () => {
    const doc = makeDoc({
      metadata: {},
      pages: [makePage([
        makeHeading(1, 'Title'),
        makeImage({ alt: undefined }),
        makeTable({ headerRowCount: 0 }),
      ])],
    });

    const result = remediateAccessibility(doc);

    expect(result.fixesApplied.some((fix) => fix.code === 'image.alt_missing')).toBe(true);
    expect(result.fixesApplied.some((fix) => fix.code === 'table.header_missing')).toBe(true);
    expect(result.document.metadata.title).toBe('Test Doc');
    expect(result.document.metadata.language).toBe('en-US');
  });

  it('detects missing table headers', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeTable({ headerRowCount: 0, tableCaption: 'A table' }),
      ])],
    });

    const report = validateAccessibility(doc);
    const warning = report.warnings.find(v => v.code === 'TABLE_HEADER_MISSING');

    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('detects missing table caption', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeTable({ headerRowCount: 1 }),
      ])],
    });

    const report = validateAccessibility(doc);
    const warning = report.warnings.find(v => v.code === 'TABLE_CAPTION_MISSING');

    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('detects missing document title', () => {
    const doc = makeDoc({ metadata: { title: '', language: 'en-US' } });

    const report = validateAccessibility(doc);
    const violation = report.violations.find(v => v.code === 'DOC_TITLE_MISSING');

    expect(violation).toBeDefined();
    expect(violation!.severity).toBe('error');
  });

  it('detects missing document language', () => {
    const doc = makeDoc({ metadata: { title: 'Test Doc' } });
    // Explicitly remove language
    delete (doc.metadata as any).language;

    const report = validateAccessibility(doc);
    const violation = report.violations.find(v => v.code === 'DOC_LANG_MISSING');

    expect(violation).toBeDefined();
    expect(violation!.severity).toBe('error');
  });

  it('detects faux-list paragraphs', () => {
    const doc = makeDoc({
      pages: [makePage([
        makeParagraph('• First item'),
        makeParagraph('1. Second item'),
      ])],
    });

    const report = validateAccessibility(doc);
    const fauxListWarnings = report.warnings.filter(v => v.code === 'LIST_SEMANTIC_MISSING');

    expect(fauxListWarnings).toHaveLength(2);
    expect(fauxListWarnings[0].severity).toBe('warning');
  });

  it('detects contrast violations', () => {
    const doc = makeDoc({
      pages: [makePage([{
        ...makeParagraph('Low contrast text'),
        runs: [{
          text: 'Low contrast text',
          fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal' as const,
          fontStyle: 'normal' as const, textDecoration: 'none' as const,
          color: '#FFFFFF', backgroundColor: '#FFFFFF',
        }],
      }])],
    });

    const report = validateAccessibility(doc);
    const contrastWarning = report.warnings.find(v => v.code === 'CONTRAST_INSUFFICIENT');

    expect(contrastWarning).toBeDefined();
    expect(contrastWarning!.severity).toBe('warning');
    expect(report.summary.colorContrastIssues).toBeGreaterThan(0);
  });

  it('score calculation: 2 errors + 1 warning = 77', () => {
    // 2 errors: missing title + missing language → 100 - 20 = 80
    // 1 warning: missing table header → 80 - 3 = 77
    const doc = makeDoc({ metadata: { title: '' } });
    delete (doc.metadata as any).language;
    doc.pages = [makePage([
      makeTable({ headerRowCount: 0, tableCaption: 'A table' }),
    ])];

    const report = validateAccessibility(doc);
    const errorCount = report.violations.length;
    const warningCount = report.warnings.length;

    expect(errorCount).toBe(2);
    expect(warningCount).toBe(1);
    expect(report.score).toBe(77);
    expect(report.level).toBe('A');
  });

  it('level derivation: AAA requires score >= 95 and 0 errors', () => {
    // AAA: score >= 95, errors = 0
    const aaaDoc = makeDoc({ pages: [makePage([makeHeading(1, 'Title')])] });
    const aaaReport = validateAccessibility(aaaDoc);
    expect(aaaReport.level).toBe('AAA');
    expect(aaaReport.score).toBeGreaterThanOrEqual(95);
    expect(aaaReport.violations).toHaveLength(0);

    // AA: score >= 80 and errors = 0, but score < 95 (e.g. 2 warnings = 94)
    const aaDoc = makeDoc({
      pages: [makePage([
        makeHeading(1, 'Title'),
        makeTable({ headerRowCount: 0 }), // TABLE_HEADER_MISSING + TABLE_CAPTION_MISSING = 2 warnings → 94
      ])],
    });
    const aaReport = validateAccessibility(aaDoc);
    expect(aaReport.level).toBe('AA');
    expect(aaReport.score).toBeGreaterThanOrEqual(80);
    expect(aaReport.score).toBeLessThan(95);

    // A: has errors
    const aDoc = makeDoc({ metadata: { title: '', language: 'en-US' } });
    const aReport = validateAccessibility(aDoc);
    expect(aReport.level).toBe('A');
    expect(aReport.violations.length).toBeGreaterThan(0);
  });

  it('all violations have non-empty remediation', () => {
    // Create a doc with as many violations as possible
    const doc = makeDoc({ metadata: { title: '' } });
    delete (doc.metadata as any).language;
    doc.pages = [makePage([
      makeHeading(1, 'Title'),
      makeHeading(3, 'Skipped'),
      makeImage({ alt: undefined }),
      makeImage({ alt: '' }),
      makeTable({ headerRowCount: 0 }),
      makeParagraph('• Faux list'),
    ])];

    const report = validateAccessibility(doc);
    const allViolations = [...report.violations, ...report.warnings];

    expect(allViolations.length).toBeGreaterThan(0);
    for (const v of allViolations) {
      expect(v.remediation).toBeDefined();
      expect(v.remediation.length).toBeGreaterThan(0);
    }
  });
});
