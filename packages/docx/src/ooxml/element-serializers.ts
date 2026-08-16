/**
 * Element serializer registry (Phase 4.1).
 *
 * Replaces the 11-way switch statement that previously lived in
 * `document.ts:serializeStructuredElement`. Each StructuredElement type
 * has a matching `ElementSerializer<T>` instance, keyed into
 * ELEMENT_SERIALIZERS by element.type. The dispatcher in document.ts
 * now does a single `ELEMENT_SERIALIZERS[element.type]` lookup.
 *
 * ## Adding a new element type
 *
 *   1. Add the new type to `StructuredElement` union (types.ts) and
 *      `ElementType` literal.
 *   2. Update `schema.ts` Zod validator + `DocxElementSchema` union.
 *   3. Update one of the input adapters to emit the new element.
 *   4. Implement an `ElementSerializer<YourElement>` here. Register it
 *      in `ELEMENT_SERIALIZERS`.
 *   5. Update `resource-limits.ts` if the element has bounded sub-
 *      resources.
 *
 * No switch-statement edits are needed.
 *
 * ## Custom elements at runtime
 *
 * `registerElementSerializer` lets consumers attach additional
 * serializers at load time. The registry is a module-scoped mutable
 * object; call before the first `renderToDocx` for determinism.
 */

import type {
  CodeBlockElement,
  ContainerElement,
  DividerElement,
  HeadingElement,
  ImageElement,
  ListElement,
  ParagraphElement,
  ShapeElement,
  ChartElement,
  TableElement,
  TextRun,
  TextRunElement,
  StructuredElement,
  ElementType,
  PageBreakElement,
} from '../types.js';
import { Errors } from '../errors.js';
import type { SerializationContext } from './context.js';
import type { XmlElement } from './types.js';
import {
  buildBlockParagraph,
  buildCodeBlockParagraphs,
  buildDividerParagraph,
  buildPageBreakParagraph,
} from './builders/paragraph.js';
import { buildRunProperties } from './builders/run-properties.js';
import {
  buildNativeTable,
  buildContainerTableModel,
  containsExplicitPaginationBoundary,
  containerLayoutMode,
  keepBlockWithNext,
  tableModelFromElement,
  validateTableDepth,
  type NativeTableCellModel,
} from './builders/table.js';
import { xmlElement, xmlText } from './ordered-builder.js';
import { escapeXml } from './xml-escape.js';
import { buildImageRunElement, buildChartImageRunElement } from './media.js';
import { buildShapeDrawing } from './shapes.js';
import { assertNeverElement, unsupportedElementType } from './errors.js';

const MAX_KEEP_TOGETHER_CHILDREN = 8;
const MAX_KEEP_TOGETHER_BLOCKS = 24;
// Word implements keep-together as a chain of keepNext paragraphs. A short
// chain is useful; a text-heavy chain that cannot fit on one page is
// unsatisfiable and pushes the entire group forward, creating a sparse page
// before it (or an overflow on the preceding page). Bound the textual payload
// as well as the node count so caller intent remains a pagination hint rather
// than a source of void pages.
const MAX_KEEP_TOGETHER_TEXT_CHARACTERS = 250;

function textualPayloadLength(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + textualPayloadLength(item), 0);
  if (value === null || typeof value !== 'object') return 0;

  const record = value as Record<string, unknown>;
  let length = 0;
  for (const key of ['text', 'value', 'content', 'label', 'title', 'caption']) {
    if (typeof record[key] === 'string') length += record[key].length;
  }
  for (const key of ['runs', 'items', 'content', 'children', 'rows', 'cells', 'elements']) {
    length += textualPayloadLength(record[key]);
  }
  return length;
}

// =============================================================================
// PUBLIC SURFACE
// =============================================================================

/** Shared state carried through a single document's serialization walk. */
export interface SerializationState {
  tableDepth: number;
}

/** Options forwarded to every serializer. */
export interface ElementSerializerOptions {
  autoNoProof?: boolean;
  columns?: number;
  watermark?: string | {
    text?: string;
    opacity?: number;
    rotation?: number;
  };
}

/**
 * A serializer for a specific element type.
 *
 * `recurse` is the dispatcher from document.ts — pass through to it when
 * the serializer contains nested elements (containers, table cells).
 * Using the passed-in `recurse` rather than re-importing the dispatcher
 * avoids a circular module graph and lets tests swap the dispatcher.
 */
export interface ElementSerializer<T extends StructuredElement = StructuredElement> {
  readonly type: T['type'];
  serialize(
    element: T,
    context: SerializationContext,
    location: string,
    options: ElementSerializerOptions,
    state: SerializationState,
    recurse: ElementSerializerDispatcher,
  ): Promise<XmlElement[]>;
}

/** The dispatch function the walker invokes for recursion. */
export type ElementSerializerDispatcher = (
  element: StructuredElement,
  context: SerializationContext,
  location: string,
  options: ElementSerializerOptions,
  state: SerializationState,
) => Promise<XmlElement[]>;

// =============================================================================
// REGISTRY
// =============================================================================

const ELEMENT_SERIALIZERS: Partial<Record<ElementType, ElementSerializer>> = {};

export function registerElementSerializer<T extends StructuredElement>(
  serializer: ElementSerializer<T>,
): void {
  ELEMENT_SERIALIZERS[serializer.type] = serializer as ElementSerializer;
}

export function getElementSerializer(
  type: ElementType,
): ElementSerializer | undefined {
  return ELEMENT_SERIALIZERS[type];
}

export function listRegisteredElementTypes(): ElementType[] {
  return Object.keys(ELEMENT_SERIALIZERS) as ElementType[];
}

// =============================================================================
// HELPERS
// =============================================================================

function drawingParagraph(drawing: XmlElement, autoNoProof = true): XmlElement {
  const props = buildRunProperties({ autoNoProof });
  return xmlElement('w:p', undefined, [
    xmlElement('w:r', undefined, [
      ...(props ? [props as XmlElement] : []),
      drawing,
    ]),
  ]);
}

function listParagraphFromItem(
  list: ListElement,
  item: { text: string; content: TextRun[]; level: number },
  numId: number,
): ParagraphElement {
  const runs = item.content.length > 0
    ? item.content
    : [{
        text: item.text,
        fontFamily: list.style.fontFamily || 'Calibri',
        fontSize: list.style.fontSize || 11,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textDecoration: 'none' as const,
        color: list.style.color || '000000',
      }];

  return {
    id: `${list.id}-item-${item.level}-${runs.map((run) => run.text).join('-').slice(0, 16)}`,
    type: 'paragraph',
    position: list.position,
    zIndex: list.zIndex,
    opacity: list.opacity,
    style: list.style,
    tagName: 'li',
    dataAttributes: list.dataAttributes,
    docx: {
      ...list.docx,
      paragraphStyleId: 'ListParagraph',
      listInfo: {
        numId,
        level: item.level,
      },
    },
    text: item.text,
    runs,
  };
}

function validateListDepth(context: SerializationContext, list: ListElement, maxLevel: number): void {
  if (maxLevel > context.limits.maxListNestingLevel) {
    throw unsupportedElementType(
      `list nesting exceeds maxListNestingLevel (${maxLevel} > ${context.limits.maxListNestingLevel})`,
      list.id,
    );
  }
}

// =============================================================================
// BUILT-IN SERIALIZERS
// =============================================================================

const headingSerializer: ElementSerializer<HeadingElement> = {
  type: 'heading',
  async serialize(element, context, _location, options) {
    return [buildBlockParagraph(element, { autoNoProof: options.autoNoProof, context })];
  },
};

const paragraphSerializer: ElementSerializer<ParagraphElement> = {
  type: 'paragraph',
  async serialize(element, context, _location, options) {
    return [buildBlockParagraph(element, { autoNoProof: options.autoNoProof, context })];
  },
};

const textRunElementSerializer: ElementSerializer<TextRunElement> = {
  type: 'text-run',
  async serialize(element, context, _location, options) {
    return [buildBlockParagraph(element, { autoNoProof: options.autoNoProof, context })];
  },
};

const codeBlockSerializer: ElementSerializer<CodeBlockElement> = {
  type: 'code-block',
  async serialize(element, _context, _location, options) {
    return buildCodeBlockParagraphs(element, { autoNoProof: options.autoNoProof });
  },
};

const dividerSerializer: ElementSerializer<DividerElement> = {
  type: 'divider',
  async serialize(element) {
    return [buildDividerParagraph(element)];
  },
};

const pageBreakSerializer: ElementSerializer<PageBreakElement> = {
  type: 'page-break',
  async serialize() {
    return [buildPageBreakParagraph()];
  },
};

const listSerializer: ElementSerializer<ListElement> = {
  type: 'list',
  async serialize(element, context, _location, options) {
    const registered = context.numberingRegistry.registerList(element);
    const maxLevel = registered.items.reduce(
      (highest, item) => Math.max(highest, item.level),
      element.level,
    );
    validateListDepth(context, element, maxLevel);
    return registered.items.map((item, index) => {
      const paragraph = listParagraphFromItem(element, item, registered.numId);
      if (element.dataAttributes['docx-keep-last-next'] === 'true'
        && index === registered.items.length - 1) {
        paragraph.docx = { ...paragraph.docx, keepNext: true };
      }
      return buildBlockParagraph(paragraph, {
        autoNoProof: options.autoNoProof,
        context,
      });
    });
  },
};

const imageSerializer: ElementSerializer<ImageElement> = {
  type: 'image',
  async serialize(element, context, _location, options) {
    return [drawingParagraph(await buildImageRunElement(context, element), options.autoNoProof)];
  },
};

const chartSerializer: ElementSerializer<ChartElement> = {
  type: 'chart',
  async serialize(element, context, _location, options) {
    return [drawingParagraph(await buildChartImageRunElement(context, element), options.autoNoProof)];
  },
};

const shapeSerializer: ElementSerializer<ShapeElement> = {
  type: 'shape',
  async serialize(element, context, _location, options) {
    return [drawingParagraph(buildShapeDrawing(context, element), options.autoNoProof)];
  },
};

const tableSerializer: ElementSerializer<TableElement> = {
  type: 'table',
  async serialize(table, context, _location, options, state, recurse) {
    validateTableDepth(context, state.tableDepth + 1);
    if (table.columns.length > context.limits.maxTableColumns) {
      throw unsupportedElementType(
        `table columns exceed maxTableColumns (${table.columns.length} > ${context.limits.maxTableColumns})`,
        table.id,
      );
    }

    const cellBlocks = new Map<string, XmlElement[]>();
    for (const row of table.rows) {
      for (const cell of row.cells) {
        if (cell.elements && cell.elements.length > 0) {
          const blocks: XmlElement[] = [];
          for (const [childIndex, child] of cell.elements.entries()) {
            blocks.push(
              ...await recurse(
                child,
                context,
                `table ${table.id}, cell ${cell.row}:${cell.col}, child ${childIndex + 1}`,
                options,
                { ...state, tableDepth: state.tableDepth + 1 },
              ),
            );
          }
          cellBlocks.set(`${cell.row}:${cell.col}`, blocks);
          continue;
        }

        const paragraph = buildBlockParagraph({
          id: `${table.id}-cell-${cell.row}-${cell.col}`,
          type: 'paragraph',
          position: table.position,
          zIndex: table.zIndex,
          opacity: table.opacity,
          style: {
            ...table.style,
            fontFamily: cell.style.fontFamily || table.style.fontFamily,
            fontSize: cell.style.fontSize || table.style.fontSize,
            fontWeight: cell.style.fontWeight || table.style.fontWeight,
            textAlign: cell.style.textAlign,
            color: cell.style.color || table.style.color,
            backgroundColor: cell.style.backgroundColor,
            marginTop: 0,
            marginRight: 0,
            marginBottom: 0,
            marginLeft: 0,
          },
          tagName: cell.isHeader ? 'th' : 'td',
          dataAttributes: {},
          text: cell.text,
          runs: cell.content.length > 0
            ? cell.content.map((run) => ({
                ...run,
                fontFamily: cell.style.fontFamily ?? run.fontFamily,
                fontSize: cell.style.fontSize ?? run.fontSize,
                fontWeight: (cell.style.fontWeight as TextRun['fontWeight'] | undefined) ?? run.fontWeight,
                color: cell.style.color ?? run.color,
              }))
            : [{
                text: cell.text,
                fontFamily: cell.style.fontFamily || table.style.fontFamily || 'Calibri',
                fontSize: cell.style.fontSize || table.style.fontSize || 11,
                fontWeight: (cell.style.fontWeight as TextRun['fontWeight']) || 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                color: cell.style.color || table.style.color || '000000',
              }],
        }, { autoNoProof: options.autoNoProof, context });

        cellBlocks.set(`${cell.row}:${cell.col}`, [paragraph]);
      }
    }

    const model = tableModelFromElement(table, cellBlocks);
    const continuationRows = table.cellMatrix.length > 0
      ? table.cellMatrix.map((matrixRow, rowIndex) => {
          const row = model.rows[rowIndex];
          if (!row) {
            return row;
          }
          const generatedCells: NativeTableCellModel[] = [];
          const seenOrigins = new Set<string>();
          for (let colIndex = 0; colIndex < matrixRow.length; colIndex += 1) {
            const reference = matrixRow[colIndex];
            if (!reference) continue;
            const key = `${reference.originRow}:${reference.originCol}`;
            if (reference.isOrigin) {
              if (seenOrigins.has(key)) continue;
              const existing = row.cells.find(
                (cell) => cell.row === reference.originRow && cell.col === reference.originCol,
              );
              if (existing) {
                existing.vMergeMode = existing.rowSpan > 1 ? 'restart' : undefined;
                generatedCells.push(existing);
                seenOrigins.add(key);
              }
              continue;
            }
            if (reference.originCol !== colIndex) {
              continue;
            }
            const origin = reference.cell;
            generatedCells.push({
              row: rowIndex,
              col: colIndex,
              rowSpan: 1,
              colSpan: origin.colSpan,
              isHeader: row.isHeader,
              style: origin.style,
              revision: origin.revision ? { ...origin.revision } : undefined,
              blocks: [],
              vMergeMode: 'continue',
            });
            seenOrigins.add(key);
          }
          row.cells = generatedCells;
          return row;
        })
      : model.rows;

    const tableBlock = buildNativeTable({
      ...model,
      rows: continuationRows,
      revisionInfo: context.revisionInfo,
      context,
    });
    const blocks: XmlElement[] = [];
    if (table.caption) {
      blocks.push(xmlElement('w:p', undefined, [
        xmlElement('w:pPr', undefined, [
          xmlElement('w:keepNext'),
          xmlElement('w:spacing', { 'w:after': '80' }),
        ]),
        xmlElement('w:r', undefined, [
          buildRunProperties({ fontStyle: 'italic', color: '595959', autoNoProof: true })!,
          xmlElement('w:t', { 'xml:space': 'preserve' }, [xmlText(escapeXml(table.caption))]),
        ]),
      ]));
    }
    blocks.push(tableBlock);
    // OOXML has no table "space after" property. A compact spacer paragraph
    // prevents the next body paragraph from touching the bottom table rule.
    if (state.tableDepth === 0) {
      blocks.push(xmlElement('w:p', undefined, [
        xmlElement('w:pPr', undefined, [
          ...(table.keepWithNext ? [xmlElement('w:keepNext')] : []),
          xmlElement('w:spacing', { 'w:before': '80', 'w:after': '0', 'w:line': '20', 'w:lineRule': 'exact' }),
        ]),
      ]));
    } else if (table.keepWithNext) {
      blocks.push(xmlElement('w:p', undefined, [
        xmlElement('w:pPr', undefined, [xmlElement('w:keepNext')]),
      ]));
    }
    return blocks;
  },
};

const containerSerializer: ElementSerializer<ContainerElement> = {
  type: 'container',
  async serialize(element, context, location, options, state, recurse) {
    const mode = containerLayoutMode(element);
    if (mode === 'vertical') {
      const childBlockGroups: XmlElement[][] = [];
      for (const [childIndex, child] of element.children.entries()) {
        childBlockGroups.push(
          await recurse(
            child,
            context,
            `${location}, child ${childIndex + 1}`,
            options,
            state,
          ),
        );
      }
      const childBlocks = childBlockGroups.flat();
      const withinKeepTogetherLimit = element.children.length <= MAX_KEEP_TOGETHER_CHILDREN
        && childBlocks.length <= MAX_KEEP_TOGETHER_BLOCKS
        && textualPayloadLength(element.children) <= MAX_KEEP_TOGETHER_TEXT_CHARACTERS;
      if (element.keepTogether && withinKeepTogetherLimit) {
        for (let index = 0; index < childBlocks.length - 1; index += 1) {
          const block = childBlocks[index];
          const nextBlock = childBlocks[index + 1];
          if (!block || !nextBlock) continue;
          if (containsExplicitPaginationBoundary(block) || containsExplicitPaginationBoundary(nextBlock)) {
            continue;
          }
          keepBlockWithNext(block);
        }
      }
      return childBlocks;
    }

    validateTableDepth(context, state.tableDepth + 1);
    const childBlocks: XmlElement[][] = [];
    for (const [childIndex, child] of element.children.entries()) {
      childBlocks.push(
        await recurse(
          child,
          context,
          `${location}, child ${childIndex + 1}`,
          options,
          { ...state, tableDepth: state.tableDepth + 1 },
        ),
      );
    }
    return [buildNativeTable({
      ...buildContainerTableModel(element, childBlocks),
      revisionInfo: context.revisionInfo,
      context,
    })];
  },
};

// -----------------------------------------------------------------------------
// Register built-ins. Do this at module load so consumers don't have to.
// -----------------------------------------------------------------------------

const BUILT_INS: ElementSerializer[] = [
  headingSerializer,
  paragraphSerializer,
  textRunElementSerializer,
  codeBlockSerializer,
  dividerSerializer,
  pageBreakSerializer,
  listSerializer,
  imageSerializer,
  chartSerializer,
  shapeSerializer,
  tableSerializer,
  containerSerializer,
];

for (const serializer of BUILT_INS) {
  registerElementSerializer(serializer);
}

/** Invariant check for tests: every ElementType has a registered serializer. */
export function assertEveryElementTypeHasSerializer(): void {
  const ALL_ELEMENT_TYPES: ElementType[] = [
    'heading',
    'paragraph',
    'text-run',
    'code-block',
    'page-break',
    'divider',
    'table',
    'image',
    'chart',
    'shape',
    'list',
    'container',
  ];
  const missing = ALL_ELEMENT_TYPES.filter((t) => !getElementSerializer(t));
  if (missing.length > 0) {
    throw Errors.internal(`ElementSerializer registry missing: ${missing.join(', ')}`);
  }
}

/** Last-resort fallback — used by the dispatcher when a serializer is missing. */
export function unhandledElement(element: StructuredElement, location: string): XmlElement[] {
  return [assertNeverElement(element as never, location)];
}
