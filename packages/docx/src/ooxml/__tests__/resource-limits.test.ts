import { describe, expect, it } from 'vitest';
import type {
  CellStyle,
  ContainerElement,
  ListElement,
  ParagraphElement,
  StructuredElement,
  TableCell,
  TableElement,
} from '../../types.js';
import { serializeStructuredToNativeOOXML } from '../native-serializer.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun } from './test-utils.js';

function createParagraph(id: string, text: string): ParagraphElement {
  const runs = [createTextRun(text)];
  return {
    id,
    type: 'paragraph',
    position: { x: 0, y: 0, width: 400, height: 20 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'p',
    dataAttributes: {},
    text,
    runs,
  };
}

function createContainer(children: StructuredElement[]): ContainerElement {
  return {
    id: 'container',
    type: 'container',
    position: { x: 0, y: 0, width: 400, height: 80 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'div',
    dataAttributes: {},
    children,
  };
}

function createCellStyle(): CellStyle {
  return {
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    verticalAlign: 'top',
    textAlign: 'left',
  };
}

function createTableCell(overrides: Partial<TableCell> = {}): TableCell {
  const text = overrides.text ?? 'cell';
  return {
    row: 0,
    col: 0,
    rowSpan: 1,
    colSpan: 1,
    text,
    content: [createTextRun(text)],
    style: createCellStyle(),
    isHeader: false,
    ...overrides,
  };
}

function createTable(cell: TableCell): TableElement {
  return {
    id: 'table',
    type: 'table',
    position: { x: 0, y: 0, width: 400, height: 80 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'table',
    dataAttributes: {},
    columns: [{ width: 400 }],
    rows: [{ index: 0, height: 20, cells: [cell], isHeader: false, isFooter: false }],
    headerRowCount: 0,
    footerRowCount: 0,
    repeatHeaders: false,
    cellMatrix: [[{ originRow: 0, originCol: 0, isOrigin: true, cell }]],
  };
}

function createNestedList(): ListElement {
  return {
    id: 'list-root',
    type: 'list',
    position: { x: 0, y: 0, width: 400, height: 80 },
    zIndex: 0,
    opacity: 1,
    style: DEFAULT_STYLE,
    tagName: 'ul',
    dataAttributes: {},
    listType: 'bullet',
    start: 1,
    level: 0,
    items: [{
      text: 'one',
      content: [createTextRun('one')],
      nestedList: {
        id: 'list-nested',
        type: 'list',
        position: { x: 0, y: 0, width: 400, height: 80 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'ul',
        dataAttributes: {},
        listType: 'bullet',
        start: 1,
        level: 1,
        items: [{ text: 'two', content: [createTextRun('two')] }],
      },
    }],
  };
}

describe('native resource limits', () => {
  it('fails fast when a paragraph exceeds the run limit', async () => {
    const runs = Array.from({ length: 4 }, (_, index) => createTextRun(`run-${index}`));
    const doc = createStructuredDocument([
      {
        id: 'paragraph',
        type: 'paragraph',
        position: { x: 0, y: 0, width: 400, height: 20 },
        zIndex: 0,
        opacity: 1,
        style: DEFAULT_STYLE,
        tagName: 'p',
        dataAttributes: {},
        text: runs.map((run) => run.text).join(''),
        runs,
      },
    ] as any);

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxRunsPerParagraph: 3 },
      }),
    ).rejects.toThrow(/maxRunsPerParagraph/);
  });

  it('counts nested container children against the element limit', async () => {
    const doc = createStructuredDocument([
      createContainer([
        createParagraph('child-1', 'one'),
        createParagraph('child-2', 'two'),
        createParagraph('child-3', 'three'),
      ]),
    ]);

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxElements: 3 },
      }),
    ).rejects.toThrow(/maxElements/);
  });

  it('applies text-node limits inside structured table-cell content', async () => {
    const doc = createStructuredDocument([
      createTable(createTableCell({
        elements: [createParagraph('cell-child', 'too long')],
      })),
    ]);

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxTextNodeChars: 4 },
      }),
    ).rejects.toThrow(/maxTextNodeChars/);
  });

  it('applies paragraph limits to nested list items', async () => {
    const doc = createStructuredDocument([createNestedList()]);

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxParagraphs: 1 },
      }),
    ).rejects.toThrow(/maxParagraphs/);
  });

  it('counts header and footer content in element limits', async () => {
    const doc = createStructuredDocument([], {
      pages: [{
        pageNumber: 1,
        dimensions: {
          width: 794,
          height: 1123,
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
        },
        elements: [],
        header: { elements: [createParagraph('header', 'Header')] },
        footer: { elements: [createParagraph('footer', 'Footer')] },
      }],
    });

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxElements: 1 },
      }),
    ).rejects.toThrow(/maxElements/);
  });

  it('fails nested tables before serialization exceeds the configured depth', async () => {
    const nestedTable = createTable(createTableCell({ text: 'nested' }));
    const doc = createStructuredDocument([
      createTable(createTableCell({
        text: '',
        content: [],
        elements: [nestedTable],
      })),
    ]);

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxTableNestingDepth: 1 },
      }),
    ).rejects.toThrow(/maxTableNestingDepth/);
  });

  it('counts comment and note bodies against text limits', async () => {
    const doc = createStructuredDocument([
      {
        ...createParagraph('annotated', 'Body'),
        comment: { text: 'review note' },
        docx: {
          footnote: 'footnote body',
          endnote: 'endnote body',
        },
      },
    ]);

    await expect(
      serializeStructuredToNativeOOXML(doc, {
        resourceLimits: { maxTextLength: 12 },
      }),
    ).rejects.toThrow(/maxTextLength/);
  });
});
