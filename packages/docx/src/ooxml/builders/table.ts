import type {
  CellStyle,
  ContainerElement,
  ExtractedLayoutInfo,
  ParagraphElement,
  TableCellRevision,
  TableElement,
  TableRowRevision,
  TableRevision,
  TextRun,
} from '../../types.js';
import { Errors } from '../../errors.js';
import type { SerializationContext } from '../context.js';
import { OrderedBuilder, xmlElement } from '../ordered-builder.js';
import { TABLE_CELL_PROPERTY_ORDER, TABLE_PROPERTY_ORDER, TABLE_ROW_PROPERTY_ORDER, type XmlElement } from '../types.js';
import { buildParagraphProperties } from './paragraph-properties.js';
import { buildTextRun } from './run.js';
import { DPI, TWIPS_PER_INCH, asTwips, pxToTwips, type Twips } from '../../utils/units.js';
import { buildTableCellRevisionChange, buildTableRevisionChange, buildTableRowRevisionChange } from '../revisions.js';
import { normalizeOoxmlColor } from '../color.js';


export interface NativeTableCellModel {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  isHeader: boolean;
  style: CellStyle;
  blocks: XmlElement[];
  vMergeMode?: 'restart' | 'continue';
  revision?: TableCellRevision;
}

export interface NativeTableRowModel {
  index: number;
  isHeader: boolean;
  height: Twips;
  cells: NativeTableCellModel[];
  revision?: TableRowRevision;
}

export interface NativeTableModel {
  columns: Twips[];
  rows: NativeTableRowModel[];
  caption?: string;
  description?: string;
  borders?: 'grid' | 'none';
  zeroMargins?: boolean;
  keepTogether?: boolean;
  keepWithNext?: boolean;
  revision?: TableRevision;
  revisionInfo?: SerializationContext['revisionInfo'];
  context?: SerializationContext;
}

function mapBorderStyle(style: string | undefined): string {
  switch (style) {
    case 'dashed':
      return 'dashed';
    case 'dotted':
      return 'dotted';
    case 'double':
      return 'double';
    case 'none':
      return 'nil';
    case 'solid':
    default:
      return 'single';
  }
}

function makeCellParagraph(runs: TextRun[], style: CellStyle): XmlElement {
  const paragraphStyle: ParagraphElement = {
    id: 'cell-paragraph',
    type: 'paragraph',
    position: { x: 0, y: 0, width: 0, height: 0 },
    zIndex: 0,
    opacity: 1,
    style: {
      backgroundColor: undefined,
      backgroundImage: undefined,
      borderTopWidth: 0,
      borderTopColor: '000000',
      borderTopStyle: 'none',
      borderRightWidth: 0,
      borderRightColor: '000000',
      borderRightStyle: 'none',
      borderBottomWidth: 0,
      borderBottomColor: '000000',
      borderBottomStyle: 'none',
      borderLeftWidth: 0,
      borderLeftColor: '000000',
      borderLeftStyle: 'none',
      borderRadius: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
      fontFamily: style.fontFamily || 'Calibri',
      fontSize: style.fontSize || 11,
      fontWeight: style.fontWeight || 'normal',
      fontStyle: 'normal',
      lineHeight: 1.15,
      letterSpacing: 0,
      textAlign: style.textAlign,
      textDecoration: 'none',
      color: style.color || '000000',
      display: 'block',
      visibility: 'visible',
      overflow: 'visible',
      opacity: 1,
      boxShadow: undefined,
      transform: undefined,
    },
    tagName: style.textAlign === 'justify' ? 'p' : 'td',
    dataAttributes: {},
    text: runs.map((run) => run.text).join(''),
    runs: runs.length > 0 ? runs : [{
      text: '',
      fontFamily: style.fontFamily || 'Calibri',
      fontSize: style.fontSize || 11,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: style.color || '000000',
    }],
  };

  const pPr = buildParagraphProperties({ element: paragraphStyle });
  return xmlElement('w:p', undefined, [
    ...(pPr ? [pPr] : []),
    ...paragraphStyle.runs.map((run) => buildTextRun(run, { autoNoProof: true })),
  ]);
}

function tableBordersForCell(style: CellStyle): XmlElement | undefined {
  const borders = [
    ['top', style.borderTop],
    ['left', style.borderLeft],
    ['bottom', style.borderBottom],
    ['right', style.borderRight],
  ] as const;
  const children = borders.flatMap(([tag, border]) => (
    border
      ? [xmlElement(`w:${tag}`, {
          'w:val': mapBorderStyle(border.style),
          'w:sz': String(Math.max(0, Math.round(border.width * 8))),
          'w:space': '0',
          'w:color': normalizeOoxmlColor(border.color, '000000', { allowCssHex: true }) ?? '000000',
        })]
      : []
  ));
  return children.length > 0 ? xmlElement('w:tcBorders', undefined, children) : undefined;
}

function normalizeCellBlocks(blocks: XmlElement[]): XmlElement[] {
  if (blocks.length === 0) {
    return [xmlElement('w:p')];
  }

  const normalized: XmlElement[] = [];
  blocks.forEach((block, index) => {
    const previous = normalized[normalized.length - 1];
    if (block.tag === 'w:tbl' && (index === 0 || previous?.tag === 'w:tbl')) {
      normalized.push(xmlElement('w:p'));
    }
    normalized.push(block);
  });

  if (normalized[normalized.length - 1]?.tag === 'w:tbl') {
    normalized.push(xmlElement('w:p'));
  }

  return normalized;
}

function isXmlElement(value: unknown): value is XmlElement {
  return typeof value === 'object' && value !== null && 'tag' in value;
}

function directChildren(element: XmlElement, tag: string): XmlElement[] {
  return (element.children ?? []).filter(
    (child): child is XmlElement => isXmlElement(child) && child.tag === tag,
  );
}

function descendantParagraphs(element: XmlElement): XmlElement[] {
  if (element.tag === 'w:p') return [element];
  return (element.children ?? []).flatMap((child) => (
    isXmlElement(child) ? descendantParagraphs(child) : []
  ));
}

export function containsExplicitPaginationBoundary(element: XmlElement): boolean {
  if (element.tag === 'w:sectPr' || element.tag === 'w:pageBreakBefore') return true;
  if (element.tag === 'w:br' && element.attrs?.['w:type'] === 'page') return true;
  return (element.children ?? []).some(
    (child) => isXmlElement(child) && containsExplicitPaginationBoundary(child),
  );
}

function addKeepNext(paragraph: XmlElement): void {
  let properties = paragraph.children?.find(
    (child): child is XmlElement => typeof child === 'object' && 'tag' in child && child.tag === 'w:pPr',
  );
  if (!properties) {
    properties = xmlElement('w:pPr');
    paragraph.children = [properties, ...(paragraph.children ?? [])];
  }
  const children = properties.children ?? [];
  if (children.some((child) => isXmlElement(child) && child.tag === 'w:keepNext')) return;
  const pStyleIndex = children.findIndex(
    (child) => isXmlElement(child) && child.tag === 'w:pStyle',
  );
  children.splice(pStyleIndex + 1, 0, xmlElement('w:keepNext'));
  properties.children = children;
}

/**
 * Attach an emitted block to its successor using Word's paragraph pagination
 * primitive. Tables require the last paragraph in every cell of their final
 * row to carry the hint; other blocks use their final descendant paragraph.
 */
export function keepBlockWithNext(block: XmlElement): boolean {
  if (containsExplicitPaginationBoundary(block)) return false;
  if (block.tag === 'w:tbl') {
    const lastRow = directChildren(block, 'w:tr').at(-1);
    if (!lastRow) return false;
    let changed = false;
    for (const cell of directChildren(lastRow, 'w:tc')) {
      const paragraph = descendantParagraphs(cell).at(-1);
      if (!paragraph) continue;
      addKeepNext(paragraph);
      changed = true;
    }
    return changed;
  }
  const paragraph = descendantParagraphs(block).at(-1);
  if (!paragraph) return false;
  addKeepNext(paragraph);
  return true;
}

function keepCellWithNextRow(blocks: XmlElement[]): XmlElement[] {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block && keepBlockWithNext(block)) break;
  }
  return blocks;
}

function buildTableProperties(model: NativeTableModel): XmlElement {
  const builder = new OrderedBuilder<(typeof TABLE_PROPERTY_ORDER)[number]>(TABLE_PROPERTY_ORDER);
  builder.set('tblW', xmlElement('w:tblW', {
    'w:w': String(model.columns.reduce((sum, width) => sum + width, 0)),
    'w:type': 'dxa',
  }));
  builder.set('tblLayout', xmlElement('w:tblLayout', { 'w:type': 'fixed' }));

  if (model.borders !== 'none') {
    builder.set('tblBorders', xmlElement('w:tblBorders', undefined, [
      'top',
      'left',
      'bottom',
      'right',
      'insideH',
      'insideV',
    ].map((tag) => xmlElement(`w:${tag}`, { 'w:val': 'single', 'w:sz': '4', 'w:space': '0', 'w:color': '000000' }))));
  } else {
    builder.set('tblBorders', xmlElement('w:tblBorders', undefined, [
      'top',
      'left',
      'bottom',
      'right',
      'insideH',
      'insideV',
    ].map((tag) => xmlElement(`w:${tag}`, { 'w:val': 'nil' }))));
  }

  builder.set('tblCellMar', xmlElement('w:tblCellMar', undefined, [
    xmlElement('w:top', { 'w:w': model.zeroMargins ? '0' : '72', 'w:type': 'dxa' }),
    xmlElement('w:left', { 'w:w': model.zeroMargins ? '0' : '108', 'w:type': 'dxa' }),
    xmlElement('w:bottom', { 'w:w': model.zeroMargins ? '0' : '72', 'w:type': 'dxa' }),
    xmlElement('w:right', { 'w:w': model.zeroMargins ? '0' : '108', 'w:type': 'dxa' }),
  ]));

  if (model.caption) {
    builder.set('tblCaption', xmlElement('w:tblCaption', { 'w:val': model.caption }));
  }
  if (model.description) {
    builder.set('tblDescription', xmlElement('w:tblDescription', { 'w:val': model.description }));
  }
  builder.set('tblPrChange', buildTableRevisionChange(model.revision, model.revisionInfo, model.context));

  return xmlElement('w:tblPr', undefined, builder.build());
}

function buildTableGrid(columns: Twips[]): XmlElement {
  return xmlElement('w:tblGrid', undefined, columns.map((width) => xmlElement('w:gridCol', { 'w:w': String(width) })));
}

function buildRowProperties(row: NativeTableRowModel, model: NativeTableModel): XmlElement | undefined {
  const builder = new OrderedBuilder<(typeof TABLE_ROW_PROPERTY_ORDER)[number]>(TABLE_ROW_PROPERTY_ORDER);
  // Keep ordinary business rows intact across page boundaries. Word still
  // splits a row that is taller than a full page, avoiding an overflow loop.
  builder.set('cantSplit', xmlElement('w:cantSplit'));
  if (row.height > 0) {
    builder.set('trHeight', xmlElement('w:trHeight', { 'w:val': String(row.height), 'w:hRule': 'atLeast' }));
  }
  if (row.isHeader) {
    builder.set('tblHeader', xmlElement('w:tblHeader'));
  }
  const rowRevision = buildTableRowRevisionChange(row.revision, model.revisionInfo, model.context);
  if (rowRevision) {
    builder.set(row.revision?.type === 'insert' ? 'ins' : 'del', rowRevision);
  }
  const children = builder.build();
  return children.length > 0 ? xmlElement('w:trPr', undefined, children) : undefined;
}

function buildCellProperties(
  cell: NativeTableCellModel,
  widthTwips: Twips,
  revisionInfo: NativeTableModel['revisionInfo'],
  context?: SerializationContext,
): XmlElement {
  const builder = new OrderedBuilder<(typeof TABLE_CELL_PROPERTY_ORDER)[number]>(TABLE_CELL_PROPERTY_ORDER);
  builder.set('tcW', xmlElement('w:tcW', { 'w:w': String(widthTwips), 'w:type': 'dxa' }));
  if (cell.colSpan > 1) {
    builder.set('gridSpan', xmlElement('w:gridSpan', { 'w:val': String(cell.colSpan) }));
  }
  if (cell.vMergeMode) {
    builder.set('vMerge', xmlElement('w:vMerge', cell.vMergeMode === 'restart' ? { 'w:val': 'restart' } : undefined));
  }
  builder.set('tcBorders', tableBordersForCell(cell.style));
  if (cell.style.backgroundColor) {
    builder.set('shd', xmlElement('w:shd', {
      'w:val': 'clear',
      'w:color': 'auto',
      'w:fill': normalizeOoxmlColor(cell.style.backgroundColor, 'FFFFFF', { allowCssHex: true }) ?? 'FFFFFF',
    }));
  }
  builder.set('tcMar', xmlElement('w:tcMar', undefined, [
    xmlElement('w:top', { 'w:w': String(pxToTwips(cell.style.padding.top)), 'w:type': 'dxa' }),
    xmlElement('w:left', { 'w:w': String(pxToTwips(cell.style.padding.left)), 'w:type': 'dxa' }),
    xmlElement('w:bottom', { 'w:w': String(pxToTwips(cell.style.padding.bottom)), 'w:type': 'dxa' }),
    xmlElement('w:right', { 'w:w': String(pxToTwips(cell.style.padding.right)), 'w:type': 'dxa' }),
  ]));
  builder.set('vAlign', xmlElement('w:vAlign', {
    'w:val': cell.style.verticalAlign === 'middle' ? 'center' : cell.style.verticalAlign,
  }));
  const cellRevision = buildTableCellRevisionChange(cell.revision, revisionInfo, context);
  if (cellRevision) {
    builder.set(cell.revision?.type === 'insert' ? 'cellIns' : 'cellDel', cellRevision);
  }
  return xmlElement('w:tcPr', undefined, builder.build());
}

export function buildNativeTable(model: NativeTableModel): XmlElement {
  // Signature, approval, and acknowledgement blocks read as a single semantic
  // unit. Chaining the final paragraph of each row prevents Word from leaving
  // an orphaned continuation row. Callers can opt other short tables in, but
  // ordinary KPI/summary tables remain free to paginate without adding pages.
  const semanticLabel = `${model.caption ?? ''} ${model.description ?? ''}`;
  const semanticKeepTogether = /\b(?:signature|acknowledg(?:e)?ment|approval)\b/i.test(semanticLabel);
  const keepSmallTableTogether = model.rows.length > 1
    && model.rows.length <= 8
    && (model.keepTogether ?? semanticKeepTogether);
  const nonHeaderRowIndexes = model.rows.flatMap((row, index) => row.isHeader ? [] : [index]);
  const widowProtectedRowIndex = !model.zeroMargins && nonHeaderRowIndexes.length >= 2
    ? nonHeaderRowIndexes.at(-2)
    : undefined;
  return xmlElement('w:tbl', undefined, [
    buildTableProperties(model),
    buildTableGrid(model.columns),
    ...model.rows.map((row, rowIndex) => {
      const rowProperties = buildRowProperties(row, model);
      return xmlElement('w:tr', undefined, [
        ...(rowProperties ? [rowProperties] : []),
        ...row.cells.map((cell) => {
          const widthTwips = model.columns
            .slice(cell.col, cell.col + Math.max(1, cell.colSpan))
            .reduce<Twips>((sum, width) => asTwips(sum + width), asTwips(0));
          return xmlElement('w:tc', undefined, [
            buildCellProperties(cell, widthTwips, model.revisionInfo, model.context),
            ...((keepSmallTableTogether && rowIndex < model.rows.length - 1)
              || rowIndex === widowProtectedRowIndex
              || (model.keepWithNext && rowIndex === model.rows.length - 1)
              ? keepCellWithNextRow(normalizeCellBlocks(cell.blocks))
              : normalizeCellBlocks(cell.blocks)),
          ]);
        }),
      ]);
    }),
  ]);
}

export function assertContiguousHeaderRows(table: TableElement): void {
  let encounteredBody = false;
  for (const row of table.rows) {
    if (row.isHeader) {
      if (encounteredBody) {
        throw Errors.internal('Table header rows must be contiguous for native OOXML serialization.');
      }
    } else {
      encounteredBody = true;
    }
  }
}

export function tableModelFromElement(
  table: TableElement,
  cellBlocks: Map<string, XmlElement[]>,
): NativeTableModel {
  assertContiguousHeaderRows(table);
  const rows: NativeTableRowModel[] = table.rows.map((row) => ({
    index: row.index,
    isHeader: row.isHeader && table.repeatHeaders,
    height: pxToTwips(row.height),
    revision: row.revision ? { ...row.revision } : undefined,
    cells: row.cells.map((cell) => ({
      row: cell.row,
      col: cell.col,
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
      isHeader: cell.isHeader,
      style: cell.style,
      revision: cell.revision ? { ...cell.revision } : undefined,
      blocks: cellBlocks.get(`${cell.row}:${cell.col}`) ?? [makeCellParagraph(cell.content, cell.style)],
    })),
  }));

  return {
    columns: normalizeColumnWidthsToTwips(table.columns.map((column) => column.width)),
    rows,
    caption: table.tableCaption,
    description: table.tableDescription,
    keepTogether: table.keepTogether,
    keepWithNext: table.keepWithNext,
    borders: table.tableStyle === 'plain'
      || table.tableStyle === 'striped'
      || table.tableStyle === 'modern'
      || table.tableStyle === 'minimal'
      ? 'none'
      : 'grid',
    revision: table.revision ? { ...table.revision } : undefined,
  };
}

function normalizeColumnWidthsToTwips(widthsPx: number[]): Twips[] {
  if (widthsPx.length === 0) {
    return [];
  }

  const exactWidths = widthsPx.map((width) => Math.max(0, (width / DPI) * TWIPS_PER_INCH));
  const totalWidth = pxToTwips(widthsPx.reduce((sum, width) => sum + width, 0));
  const normalized = exactWidths.map((width) => Math.floor(width));
  let remainder = totalWidth - normalized.reduce((sum, width) => sum + width, 0);

  const rankedFractions = exactWidths
    .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);

  for (let index = 0; index < rankedFractions.length && remainder > 0; index += 1) {
    normalized[rankedFractions[index]!.index] += 1;
    remainder -= 1;
  }

  return normalized.map(asTwips);
}

function equalColumns(columnCount: number, totalWidth: Twips): Twips[] {
  const width = Math.max(1, Math.floor(totalWidth / Math.max(1, columnCount)));
  return Array.from({ length: columnCount }, () => asTwips(width));
}

function positiveInteger(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function gridColumnCount(layout: ExtractedLayoutInfo | undefined, childCount: number): number {
  return Math.max(
    positiveInteger(layout?.columnCount)
      ?? positiveInteger(layout?.detectedColumns)
      ?? positiveInteger(layout?.gridTemplateColumns?.length)
      ?? Math.ceil(Math.sqrt(Math.max(1, childCount))),
    1,
  );
}

function gridColumnWidths(layout: ExtractedLayoutInfo | undefined, childCount: number, totalWidth: number): Twips[] {
  const columnCount = gridColumnCount(layout, childCount);

  if (layout?.gridTemplateColumns && layout.gridTemplateColumns.length === columnCount) {
    const computed = layout.gridTemplateColumns.map((track) => track.computedSize ?? (track.type === 'px' ? track.value : 0));
    const total = computed.reduce((sum, width) => sum + width, 0);
    if (total > 0) {
      return computed.map((width) => pxToTwips((width / total) * totalWidth));
    }
  }

  return equalColumns(columnCount, pxToTwips(totalWidth));
}

export function containerLayoutMode(container: ContainerElement): 'horizontal' | 'grid' | 'vertical' {
  const layout = container.layout;
  if (!layout) {
    return 'vertical';
  }
  if (layout.childrenLayout === 'grid' || layout.type === 'grid' || layout.type === 'inline-grid') {
    return 'grid';
  }
  if (
    layout.childrenLayout === 'horizontal'
    || ((layout.type === 'flex' || layout.type === 'inline-flex') && (!layout.flexDirection || layout.flexDirection.startsWith('row')))
  ) {
    return 'horizontal';
  }
  return 'vertical';
}

export function buildContainerTableModel(
  container: ContainerElement,
  childBlocks: XmlElement[][],
): NativeTableModel {
  const mode = containerLayoutMode(container);
  const totalWidth = container.position.width || 600;
  const zeroStyle: CellStyle = {
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    verticalAlign: 'top',
    textAlign: 'left',
  };

  if (mode === 'horizontal') {
    const columns = equalColumns(container.children.length, pxToTwips(totalWidth));
    return {
      columns,
      rows: [{
        index: 0,
        isHeader: false,
        height: pxToTwips(0),
        cells: container.children.map((_, index) => ({
          row: 0,
          col: index,
          rowSpan: 1,
          colSpan: 1,
          isHeader: false,
          style: zeroStyle,
          blocks: childBlocks[index] ?? [xmlElement('w:p')],
        })),
      }],
      borders: 'none',
      zeroMargins: true,
    };
  }

  const columns = gridColumnWidths(container.layout, container.children.length, totalWidth);
  const columnCount = columns.length;
  const rows: NativeTableRowModel[] = [];
  for (let offset = 0, rowIndex = 0; offset < childBlocks.length; offset += columnCount, rowIndex += 1) {
    const rowBlocks = childBlocks.slice(offset, offset + columnCount);
    rows.push({
      index: rowIndex,
      isHeader: false,
      height: pxToTwips(0),
      cells: Array.from({ length: columnCount }, (_, cellIndex) => {
        const blocks = rowBlocks[cellIndex];
        return {
          row: rowIndex,
          col: cellIndex,
          rowSpan: 1,
          colSpan: 1,
          isHeader: false,
          style: zeroStyle,
          blocks: blocks && blocks.length > 0 ? blocks : [xmlElement('w:p')],
        };
      }),
    });
  }

  if (rows.length === 0) {
    rows.push({
      index: 0,
      isHeader: false,
      height: pxToTwips(0),
      cells: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1, isHeader: false, style: zeroStyle, blocks: [xmlElement('w:p')] }],
    });
  }

  return {
    columns,
    rows,
    borders: 'none',
    zeroMargins: true,
  };
}

export function validateTableDepth(context: SerializationContext, depth: number): void {
  if (depth > context.limits.maxTableNestingDepth) {
    throw Errors.internal(`Native table nesting exceeds maxTableNestingDepth (${depth} > ${context.limits.maxTableNestingDepth}).`);
  }
}
