/**
 * PaperDocument → StructuredDocument Adapter Tests
 */

import { paperToStructured } from '../src/adapters/paper-to-structured';
import type { PaperDocumentInput, PaperSlideInput, PaperNodeInput } from '../src/adapters/paper-types';
import type {
  HeadingElement,
  ParagraphElement,
  ImageElement,
  TableElement,
  ChartElement,
  ShapeElement,
  ContainerElement,
} from '../src/types';

// =============================================================================
// HELPERS
// =============================================================================

function minDoc(children: PaperNodeInput[] = []): PaperDocumentInput {
  return { slides: [{ children }] };
}

function multiSlideDoc(slides: PaperSlideInput[]): PaperDocumentInput {
  return { slides };
}

// =============================================================================
// CORE STRUCTURE
// =============================================================================

describe('paperToStructured — core structure', () => {
  test('empty document produces valid StructuredDocument', () => {
    const result = paperToStructured({ slides: [] });
    expect(result.metadata).toBeDefined();
    expect(result.pages).toEqual([]);
    expect(result.styles.paragraphStyles).toBeInstanceOf(Map);
    expect(result.assets.images).toBeInstanceOf(Map);
    expect(result.stats.pageCount).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  test('metadata is mapped from doc.meta', () => {
    const result = paperToStructured({
      slides: [],
      meta: { title: 'Test', author: 'Alice', subject: 'Sub', keywords: ['a', 'b'], creator: 'CLI' },
    });
    expect(result.metadata.title).toBe('Test');
    expect(result.metadata.author).toBe('Alice');
    expect(result.metadata.subject).toBe('Sub');
    expect(result.metadata.keywords).toEqual(['a', 'b']);
    expect(result.metadata.creator).toBe('CLI');
  });

  test('default creator is set when not provided', () => {
    const result = paperToStructured({ slides: [] });
    expect(result.metadata.creator).toContain('paper adapter');
  });

  test('each slide becomes a page with correct dimensions', () => {
    const result = paperToStructured({
      slides: [{ children: [] }, { children: [] }],
      slideSize: { width: 800, height: 600 },
    });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[0].dimensions.width).toBe(800);
    expect(result.pages[0].dimensions.height).toBe(600);
  });

  test('section breaks added between slides (not before first)', () => {
    const result = paperToStructured(multiSlideDoc([
      { children: [] },
      { children: [] },
      { children: [] },
    ]));
    expect(result.pages[0].sectionBreak).toBeUndefined();
    expect(result.pages[1].sectionBreak).toEqual({ type: 'nextPage' });
    expect(result.pages[2].sectionBreak).toEqual({ type: 'nextPage' });
  });

  test('stats are populated', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', children: 'Hello' },
      { type: 'Image', src: 'a.png' },
    ]));
    expect(result.stats.elementCount).toBe(2);
    expect(result.stats.imageCount).toBe(1);
    expect(result.stats.extractionTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('defaults to A4 page dimensions', () => {
    const result = paperToStructured({ slides: [{ children: [] }] });
    expect(result.pages[0].dimensions.width).toBe(595);
    expect(result.pages[0].dimensions.height).toBe(842);
    expect(result.pages[0].dimensions.margins).toEqual({ top: 72, right: 72, bottom: 72, left: 72 });
  });
});

// =============================================================================
// PAPER TEXT
// =============================================================================

describe('paperToStructured — PaperText', () => {
  test('string children → paragraph', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', children: 'Hello world' },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.type).toBe('paragraph');
    expect(el.text).toBe('Hello world');
    expect(el.runs).toHaveLength(1);
    expect(el.runs[0].text).toBe('Hello world');
  });

  test('value property as fallback text source', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', value: 'Fallback text' },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.text).toBe('Fallback text');
  });

  test('paragraph runs are converted', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Text',
        children: [
          { runs: [{ text: 'Bold ', style: { fontWeight: 'bold' } }, { text: 'normal' }] },
        ],
      },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.runs).toHaveLength(2);
    expect(el.runs[0].text).toBe('Bold ');
    expect(el.runs[0].fontWeight).toBe('bold');
    expect(el.runs[1].text).toBe('normal');
  });

  test('heading detection — H1 (fontSize >= 28)', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 30 }, children: 'Title' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(1);
  });

  test('heading detection — H2 (fontSize >= 22)', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 24 }, children: 'Subtitle' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(2);
  });

  test('heading detection — H3 (fontSize >= 18)', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 20 }, children: 'Section' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(3);
  });

  test('heading detection — H4 (bold + fontSize >= 16)', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 16, fontWeight: 'bold' }, children: 'H4' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(4);
  });

  test('heading detection — H5 (bold + fontSize >= 14)', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 14, fontWeight: 'bold' }, children: 'H5' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(5);
  });

  test('heading detection — H6 (bold + fontSize >= 12)', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 12, fontWeight: 'bold' }, children: 'H6' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(6);
  });

  test('heading detection — not bold 14pt → paragraph', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 14 }, children: 'Not heading' },
    ]));
    expect(result.pages[0].elements[0].type).toBe('paragraph');
  });

  test('heading uses heading font from theme', () => {
    const result = paperToStructured({
      slides: [{ children: [{ type: 'Text', style: { fontSize: 28 }, children: 'Title' }] }],
      theme: { fonts: { heading: 'Georgia', body: 'Arial' } },
    });
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.runs[0].fontFamily).toBe('Georgia');
  });

  test('paragraph uses body font from theme', () => {
    const result = paperToStructured({
      slides: [{ children: [{ type: 'Text', children: 'Body' }] }],
      theme: { fonts: { heading: 'Georgia', body: 'Arial' } },
    });
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.runs[0].fontFamily).toBe('Arial');
  });

  test('text style mapped to computed style', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 14, color: '#ff0000', textAlign: 'center' }, children: 'Styled' },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.style.fontSize).toBe(14);
    expect(el.style.color).toBe('#ff0000');
    expect(el.style.textAlign).toBe('center');
  });
});

// =============================================================================
// PAPER VIEW
// =============================================================================

describe('paperToStructured — PaperView', () => {
  test('view with shapeType → ShapeElement', () => {
    const result = paperToStructured(minDoc([
      { type: 'View', shapeType: 'rectangle' },
    ]));
    const el = result.pages[0].elements[0] as ShapeElement;
    expect(el.type).toBe('shape');
    expect(el.shapeType).toBe('rectangle');
  });

  test('view with textContent → ShapeElement with text', () => {
    const result = paperToStructured(minDoc([
      { type: 'View', shapeType: 'ellipse', textContent: 'Hello' },
    ]));
    const el = result.pages[0].elements[0] as ShapeElement;
    expect(el.text).toBe('Hello');
    expect(el.runs).toHaveLength(1);
    expect(el.runs![0].text).toBe('Hello');
  });

  test('view without shapeType → ContainerElement', () => {
    const result = paperToStructured(minDoc([
      { type: 'View', children: [{ type: 'Text', children: 'Child' }] },
    ]));
    const el = result.pages[0].elements[0] as ContainerElement;
    expect(el.type).toBe('container');
    expect(el.children).toHaveLength(1);
  });

  test('nested views', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'View',
        children: [
          { type: 'View', children: [{ type: 'Text', children: 'Deep' }] },
        ],
      },
    ]));
    const outer = result.pages[0].elements[0] as ContainerElement;
    const inner = outer.children[0] as ContainerElement;
    const text = inner.children[0] as ParagraphElement;
    expect(text.text).toBe('Deep');
  });

  test('view dimensions from style', () => {
    const result = paperToStructured(minDoc([
      { type: 'View', style: { width: 200, height: 100, left: 10, top: 20 } },
    ]));
    const el = result.pages[0].elements[0];
    expect(el.position.width).toBe(200);
    expect(el.position.height).toBe(100);
    expect(el.position.x).toBe(10);
    expect(el.position.y).toBe(20);
  });
});

// =============================================================================
// PAPER IMAGE
// =============================================================================

describe('paperToStructured — PaperImage', () => {
  test('basic image', () => {
    const result = paperToStructured(minDoc([
      { type: 'Image', src: 'https://example.com/img.png', alt: 'Example' },
    ]));
    const el = result.pages[0].elements[0] as ImageElement;
    expect(el.type).toBe('image');
    expect(el.src).toBe('https://example.com/img.png');
    expect(el.alt).toBe('Example');
  });

  test('image dimensions from style', () => {
    const result = paperToStructured(minDoc([
      { type: 'Image', src: 'img.png', style: { width: 300, height: 200 } },
    ]));
    const el = result.pages[0].elements[0] as ImageElement;
    expect(el.position.width).toBe(300);
    expect(el.position.height).toBe(200);
    expect(el.naturalWidth).toBe(300);
    expect(el.naturalHeight).toBe(200);
  });

  test('image registered in asset registry', () => {
    const result = paperToStructured(minDoc([
      { type: 'Image', src: 'photo.jpg' },
    ]));
    expect(result.assets.images.size).toBe(1);
    const asset = [...result.assets.images.values()][0];
    expect(asset.src).toBe('photo.jpg');
    expect(asset.mimeType).toBe('image/jpeg');
  });

  test('default alt text is empty string', () => {
    const result = paperToStructured(minDoc([
      { type: 'Image', src: 'img.png' },
    ]));
    const el = result.pages[0].elements[0] as ImageElement;
    expect(el.alt).toBe('');
  });

  test('data URI mime type detection', () => {
    const result = paperToStructured(minDoc([
      { type: 'Image', src: 'data:image/svg+xml;base64,abc' },
    ]));
    const asset = [...result.assets.images.values()][0];
    expect(asset.mimeType).toBe('image/svg+xml');
  });
});

// =============================================================================
// PAPER TABLE
// =============================================================================

describe('paperToStructured — PaperTable', () => {
  test('basic table', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Table',
        rows: [
          { cells: [{ text: 'A' }, { text: 'B' }] },
          { cells: [{ text: 'C' }, { text: 'D' }] },
        ],
      },
    ]));
    const el = result.pages[0].elements[0] as TableElement;
    expect(el.type).toBe('table');
    expect(el.rows).toHaveLength(2);
    expect(el.columns).toHaveLength(2);
    expect(el.rows[0].cells[0].text).toBe('A');
    expect(el.rows[1].cells[1].text).toBe('D');
  });

  test('table with spanning cells', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Table',
        rows: [
          { cells: [{ text: 'Wide', colSpan: 2 }] },
          { cells: [{ text: 'L' }, { text: 'R' }] },
        ],
      },
    ]));
    const el = result.pages[0].elements[0] as TableElement;
    expect(el.rows[0].cells[0].colSpan).toBe(2);
    expect(el.cellMatrix[0][0].isOrigin).toBe(true);
    expect(el.cellMatrix[0][1].isOrigin).toBe(false);
    expect(el.cellMatrix[0][1].originCol).toBe(0);
  });

  test('table with header row', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Table',
        rows: [
          { isHeader: true, cells: [{ text: 'H1' }, { text: 'H2' }] },
          { cells: [{ text: 'D1' }, { text: 'D2' }] },
        ],
      },
    ]));
    const el = result.pages[0].elements[0] as TableElement;
    expect(el.headerRowCount).toBe(1);
    expect(el.rows[0].isHeader).toBe(true);
  });

  test('cell styles are applied', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Table',
        rows: [{
          cells: [{
            text: 'Styled',
            style: { backgroundColor: '#eee', color: '#333', textAlign: 'center' },
          }],
        }],
      },
    ]));
    const el = result.pages[0].elements[0] as TableElement;
    const cellStyle = el.rows[0].cells[0].style;
    expect(cellStyle.backgroundColor).toBe('#eee');
    expect(cellStyle.color).toBe('#333');
    expect(cellStyle.textAlign).toBe('center');
  });

  test('table cell rich text runs', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Table',
        rows: [{
          cells: [{
            runs: [
              { text: 'Bold', style: { fontWeight: 'bold' } },
              { text: ' normal' },
            ],
          }],
        }],
      },
    ]));
    const el = result.pages[0].elements[0] as TableElement;
    const cell = el.rows[0].cells[0];
    expect(cell.content).toHaveLength(2);
    expect(cell.content[0].fontWeight).toBe('bold');
    expect(cell.text).toBe('Bold normal');
  });
});

// =============================================================================
// PAPER CHART
// =============================================================================

describe('paperToStructured — PaperChart', () => {
  test('bar chart', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Chart',
        chartType: 'bar',
        title: 'Sales',
        series: [{ name: 'Q1', data: [10, 20, 30] }],
        categories: ['Jan', 'Feb', 'Mar'],
      },
    ]));
    const el = result.pages[0].elements[0] as ChartElement;
    expect(el.type).toBe('chart');
    expect(el.chartType).toBe('bar');
    expect(el.title).toBe('Sales');
    expect(el.series).toHaveLength(1);
    expect(el.categories).toEqual(['Jan', 'Feb', 'Mar']);
    expect(el.embedData).toBe(true);
  });

  test('line chart with axes', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Chart',
        chartType: 'line',
        series: [{ name: 'Trend', data: [1, 2, 3] }],
        axes: { x: { title: 'Time' }, y: { title: 'Value' } },
      },
    ]));
    const el = result.pages[0].elements[0] as ChartElement;
    expect(el.chartType).toBe('line');
    expect(el.axes?.xAxis?.title).toBe('Time');
    expect(el.axes?.yAxis?.title).toBe('Value');
  });

  test('chart dimensions from style', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Chart',
        chartType: 'pie',
        series: [],
        style: { width: 600, height: 400 },
      },
    ]));
    const el = result.pages[0].elements[0] as ChartElement;
    expect(el.position.width).toBe(600);
    expect(el.position.height).toBe(400);
  });
});

// =============================================================================
// PAPER GROUP
// =============================================================================

describe('paperToStructured — PaperGroup', () => {
  test('group with children', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Group',
        children: [
          { type: 'Text', children: 'A' },
          { type: 'Text', children: 'B' },
        ],
      },
    ]));
    const el = result.pages[0].elements[0] as ContainerElement;
    expect(el.type).toBe('container');
    expect(el.children).toHaveLength(2);
  });

  test('nested groups', () => {
    const result = paperToStructured(minDoc([
      {
        type: 'Group',
        children: [
          {
            type: 'Group',
            children: [{ type: 'Text', children: 'Nested' }],
          },
        ],
      },
    ]));
    const outer = result.pages[0].elements[0] as ContainerElement;
    const inner = outer.children[0] as ContainerElement;
    expect(inner.type).toBe('container');
    expect(inner.children).toHaveLength(1);
  });
});

// =============================================================================
// SKIPPED ELEMENTS
// =============================================================================

describe('paperToStructured — skipped elements', () => {
  test('connector produces warning and no element', () => {
    const result = paperToStructured(minDoc([
      { type: 'Connector' },
    ]));
    expect(result.pages[0].elements).toHaveLength(0);
    expect(result.warnings).toContain('Connector elements are not supported in DOCX output and will be skipped.');
  });

  test('video produces warning and no element', () => {
    const result = paperToStructured(minDoc([
      { type: 'Video' },
    ]));
    expect(result.pages[0].elements).toHaveLength(0);
    expect(result.warnings).toContain('Video elements are not supported in DOCX output and will be skipped.');
  });

  test('audio produces warning and no element', () => {
    const result = paperToStructured(minDoc([
      { type: 'Audio' },
    ]));
    expect(result.pages[0].elements).toHaveLength(0);
    expect(result.warnings).toContain('Audio elements are not supported in DOCX output and will be skipped.');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('paperToStructured — edge cases', () => {
  test('percentage dimensions default to 0', () => {
    const result = paperToStructured(minDoc([
      { type: 'View', style: { width: '50%', height: '100%' } },
    ]));
    const el = result.pages[0].elements[0];
    expect(el.position.width).toBe(0);
    expect(el.position.height).toBe(0);
  });

  test('missing style defaults gracefully', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', children: 'No style' },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.style.fontFamily).toBe('Calibri');
    expect(el.style.fontSize).toBe(11);
    expect(el.style.color).toBe('#000000');
  });

  test('color modifier with value', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { color: { value: '#ff0000' } }, children: 'Red' },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.style.color).toBe('#ff0000');
  });

  test('color modifier with theme token', () => {
    const result = paperToStructured({
      slides: [{
        children: [
          { type: 'Text', style: { color: { token: 'primary' } }, children: 'Themed' },
        ],
      }],
      theme: { colorScheme: { primary: '#0066cc' } },
    });
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.style.color).toBe('#0066cc');
  });

  test('color modifier with unknown token falls back to black', () => {
    const result = paperToStructured({
      slides: [{
        children: [
          { type: 'Text', style: { color: { token: 'unknown' } }, children: 'X' },
        ],
      }],
      theme: { colorScheme: { primary: '#0066cc' } },
    });
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.style.color).toBe('#000000');
  });

  test('numeric font weight 700+ treated as bold', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text', style: { fontSize: 14, fontWeight: 700 }, children: 'Bold' },
    ]));
    const el = result.pages[0].elements[0] as HeadingElement;
    expect(el.type).toBe('heading');
    expect(el.level).toBe(5);
  });

  test('empty text node', () => {
    const result = paperToStructured(minDoc([
      { type: 'Text' },
    ]));
    const el = result.pages[0].elements[0] as ParagraphElement;
    expect(el.text).toBe('');
    expect(el.runs).toEqual([]);
  });
});

// =============================================================================
// INTEGRATION
// =============================================================================

describe('paperToStructured — integration', () => {
  test('mixed document with multiple element types', () => {
    const result = paperToStructured({
      slides: [
        {
          children: [
            { type: 'Text', style: { fontSize: 28 }, children: 'Title Slide' },
            { type: 'Text', children: 'Body text' },
            { type: 'Image', src: 'logo.png', style: { width: 200, height: 100 } },
          ],
        },
        {
          children: [
            { type: 'Table', rows: [{ cells: [{ text: 'Data' }] }] },
            { type: 'Chart', chartType: 'bar', series: [{ name: 'S', data: [1] }] },
            { type: 'Group', children: [{ type: 'Text', children: 'Grouped' }] },
            { type: 'Video' },
          ],
        },
      ],
      meta: { title: 'Integration Test' },
    });

    expect(result.pages).toHaveLength(2);
    expect(result.metadata.title).toBe('Integration Test');

    // First slide
    expect(result.pages[0].elements[0].type).toBe('heading');
    expect(result.pages[0].elements[1].type).toBe('paragraph');
    expect(result.pages[0].elements[2].type).toBe('image');

    // Second slide
    expect(result.pages[1].elements[0].type).toBe('table');
    expect(result.pages[1].elements[1].type).toBe('chart');
    expect(result.pages[1].elements[2].type).toBe('container');
    // Video skipped
    expect(result.pages[1].elements).toHaveLength(3);

    // Stats
    expect(result.stats.imageCount).toBe(1);
    expect(result.stats.tableCount).toBe(1);
    expect(result.stats.chartCount).toBe(1);

    // Asset registry
    expect(result.assets.images.size).toBe(1);

    // Warnings
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Video');

    // Section break on second page
    expect(result.pages[1].sectionBreak).toEqual({ type: 'nextPage' });
  });
});
