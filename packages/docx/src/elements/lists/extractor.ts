/**
 * List extraction utilities for DOCX.
 *
 * Extracts nested list structure from StructuredDocument elements.
 */

import type {
  ListElement,
  ListItem as StructuredListItem,
  TextRun as StructuredTextRun,
} from '../../types';

/**
 * List type categories.
 */
export type ListType = 'bullet' | 'decimal' | 'letter' | 'roman';

/**
 * Extracted list item.
 */
export interface ExtractedListItem {
  text: string;
  content: StructuredTextRun[];
  level: number; // 0-8 nesting depth
  children: ExtractedListItem[];
  checked?: boolean; // For checkbox lists
}

/**
 * Extracted list structure.
 */
export interface ExtractedList {
  type: ListType;
  items: ExtractedListItem[];
  startNumber?: number;
  maxLevel: number; // Maximum nesting depth found
  // Per-nesting-depth listType. Index 0 is the outer list. Each subsequent
  // entry is set when a `nestedList` is observed at that depth. First-wins
  // when multiple sub-lists at the same depth declare different types.
  levelTypes: ListType[];
}

/**
 * Determine list type from element properties.
 */
export function determineListType(element: ListElement): ListType {
  const listType = element.listType?.toLowerCase() || 'bullet';

  // Map various list type names to our standard types
  const typeMapping: Record<string, ListType> = {
    bullet: 'bullet',
    disc: 'bullet',
    circle: 'bullet',
    square: 'bullet',
    unordered: 'bullet',
    ul: 'bullet',

    decimal: 'decimal',
    number: 'decimal',
    numbered: 'decimal',
    ordered: 'decimal',
    ol: 'decimal',
    '1': 'decimal',

    letter: 'letter',
    alpha: 'letter',
    'lower-alpha': 'letter',
    'upper-alpha': 'letter',
    'lower-letter': 'letter',
    'upper-letter': 'letter',
    a: 'letter',

    roman: 'roman',
    'lower-roman': 'roman',
    'upper-roman': 'roman',
    i: 'roman',
  };

  return typeMapping[listType] || 'bullet';
}

/**
 * Extract list structure from a ListElement.
 */
export function extractList(element: ListElement): ExtractedList {
  const type = determineListType(element);
  const level = element.level || 0;
  const levelTypes: ListType[] = [];
  levelTypes[level] = type;
  const items = extractListItems(element.items || [], level, levelTypes);

  // Calculate max level
  let maxLevel = level;
  const findMaxLevel = (itemList: ExtractedListItem[]): void => {
    for (const item of itemList) {
      if (item.level > maxLevel) {
        maxLevel = item.level;
      }
      if (item.children.length > 0) {
        findMaxLevel(item.children);
      }
    }
  };
  findMaxLevel(items);

  return {
    type,
    items,
    startNumber: element.start,
    maxLevel,
    levelTypes,
  };
}

/**
 * Extract list items recursively.
 * Supports both the formal `nestedList` (full ListElement) and a flat
 * `children` array shorthand for nested items.
 */
function extractListItems(
  items: StructuredListItem[],
  level: number,
  levelTypes: ListType[]
): ExtractedListItem[] {
  const extracted: ExtractedListItem[] = [];

  for (const item of items) {
    // Cast to access potential `children` shorthand that may exist on
    // loosely-typed input (e.g. benchmark fixtures or user JSON)
    const itemAny = item as StructuredListItem & {
      children?: Array<{ text?: string; content?: StructuredTextRun[]; children?: unknown[] }>;
      checked?: boolean;
    };

    const extractedItem: ExtractedListItem = {
      text: item.text || '',
      content: item.content || [],
      level: Math.min(level, 8), // Max 9 levels (0-8)
      children: [],
      checked: itemAny.checked,
    };

    // Handle nested list (formal ListElement structure)
    if (item.nestedList) {
      const childLevel = Math.min(level + 1, 8);
      // First-wins: only set if this depth has not already been observed.
      if (levelTypes[childLevel] === undefined) {
        levelTypes[childLevel] = determineListType(item.nestedList as ListElement);
      }
      const nestedItems = extractListItems(
        item.nestedList.items || [],
        level + 1,
        levelTypes
      );
      extractedItem.children = nestedItems;
    }
    // Handle flat `children` shorthand (array of {text, children?})
    else if (Array.isArray(itemAny.children) && itemAny.children.length > 0) {
      const childItems = itemAny.children.map((child: any) => ({
        text: child.text || '',
        content: child.content || [],
        nestedList: undefined,
        // Propagate nested children so they recurse properly
        ...(Array.isArray(child.children) && child.children.length > 0
          ? { children: child.children }
          : {}),
      }));
      extractedItem.children = extractListItems(
        childItems as StructuredListItem[],
        level + 1,
        levelTypes
      );
    }

    extracted.push(extractedItem);
  }

  return extracted;
}

/**
 * Flatten a nested list to a single array with level information.
 * Useful for rendering where each item is a separate paragraph.
 */
export function flattenList(list: ExtractedList): ExtractedListItem[] {
  const flattened: ExtractedListItem[] = [];

  const flatten = (items: ExtractedListItem[]): void => {
    for (const item of items) {
      flattened.push({
        ...item,
        children: [], // Remove children from flattened items
      });
      if (item.children.length > 0) {
        flatten(item.children);
      }
    }
  };

  flatten(list.items);
  return flattened;
}

/**
 * Count total items in a list (including nested items).
 */
export function countListItems(list: ExtractedList): number {
  let count = 0;

  const countItems = (items: ExtractedListItem[]): void => {
    for (const item of items) {
      count++;
      if (item.children.length > 0) {
        countItems(item.children);
      }
    }
  };

  countItems(list.items);
  return count;
}

/**
 * Get items at a specific level.
 */
export function getItemsAtLevel(list: ExtractedList, targetLevel: number): ExtractedListItem[] {
  const result: ExtractedListItem[] = [];

  const findItems = (items: ExtractedListItem[]): void => {
    for (const item of items) {
      if (item.level === targetLevel) {
        result.push(item);
      }
      if (item.children.length > 0) {
        findItems(item.children);
      }
    }
  };

  findItems(list.items);
  return result;
}
