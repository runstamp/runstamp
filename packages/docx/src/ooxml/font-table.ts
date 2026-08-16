import type { ListElement, StructuredDocument, StructuredElement, TableElement, TextRun } from '../types.js';
import { serializeXml, xmlElement } from './ordered-builder.js';

const DEFAULT_FONTS = ['Calibri', 'Calibri Light', 'Cambria', 'Consolas'];

function addFont(fonts: Set<string>, fontName: string | undefined): void {
  const normalized = fontName?.trim();
  if (normalized) {
    fonts.add(normalized);
  }
}

function collectRunFont(fonts: Set<string>, run: TextRun): void {
  addFont(fonts, run.fontFamily);
}

function collectTableFonts(fonts: Set<string>, table: TableElement): void {
  for (const row of table.rows) {
    for (const cell of row.cells) {
      addFont(fonts, cell.style.fontFamily);
      for (const run of cell.content) {
        collectRunFont(fonts, run);
      }
    }
  }
}

function collectListFonts(fonts: Set<string>, list: ListElement): void {
  if (list.listType === 'bullet') {
    fonts.add('Symbol');
    addFont(fonts, list.dataAttributes.bulletFont ?? list.dataAttributes['bullet-font']);
  }

  for (const item of list.items) {
    for (const run of item.content) {
      collectRunFont(fonts, run);
    }
    if (item.nestedList) {
      collectElementFonts(fonts, item.nestedList);
    }
  }
}

function collectElementFonts(fonts: Set<string>, element: StructuredElement): void {
  addFont(fonts, element.style.fontFamily);

  switch (element.type) {
    case 'heading':
    case 'paragraph':
    case 'text-run':
      for (const run of element.runs) {
        collectRunFont(fonts, run);
      }
      break;
    case 'table':
      collectTableFonts(fonts, element);
      break;
    case 'list':
      collectListFonts(fonts, element);
      break;
    case 'container':
      for (const child of element.children) {
        collectElementFonts(fonts, child);
      }
      break;
    case 'shape':
      for (const run of element.runs ?? []) {
        collectRunFont(fonts, run);
      }
      break;
    case 'image':
    case 'chart':
    case 'page-break':
    case 'divider':
      break;
    case 'code-block':
      addFont(fonts, element.style.fontFamily || 'Consolas');
      break;
    default:
      break;
  }
}

export function collectFonts(document: StructuredDocument): string[] {
  const fonts = new Set<string>(DEFAULT_FONTS);

  if (document.metadata.language) {
    fonts.add('Arial');
  }

  for (const page of document.pages) {
    for (const element of page.elements) {
      collectElementFonts(fonts, element);
    }
  }

  for (const [fontName, font] of document.assets.fonts.entries()) {
    addFont(fonts, fontName);
    addFont(fonts, font.family);
  }

  return Array.from(fonts).sort((a, b) => a.localeCompare(b));
}

export function buildFontTableXml(fontNames: string[]): string {
  return serializeXml(
    xmlElement(
      'w:fonts',
      { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' },
      fontNames.map((fontName) => xmlElement('w:font', { 'w:name': fontName })),
    ),
  );
}
