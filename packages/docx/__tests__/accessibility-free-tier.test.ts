/**
 * Accessibility Free-Tier Schema Tests
 * =====================================
 * Tests that accessibility-related schema additions (decorative, tableDescription,
 * tableCaption, language) parse correctly in the free-tier schemas.
 */

import { describe, it, expect } from 'vitest';
import { ImageElementSchema, TableElementSchema, DocxDocumentSchema } from '../src/schema.js';
import { renderToDocx } from '../src/render.js';

// =============================================================================
// IMAGE SCHEMA — DECORATIVE FLAG
// =============================================================================

describe('ImageElementSchema accessibility fields', () => {
  it('accepts decorative flag', () => {
    const result = ImageElementSchema.safeParse({
      type: 'image',
      src: 'https://example.com/logo.png',
      decorative: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decorative).toBe(true);
    }
  });

  it('accepts without decorative (backward compat)', () => {
    const result = ImageElementSchema.safeParse({
      type: 'image',
      src: 'https://example.com/photo.jpg',
      alt: 'A photo',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decorative).toBeUndefined();
    }
  });
});

// =============================================================================
// TABLE SCHEMA — DESCRIPTION + CAPTION
// =============================================================================

describe('TableElementSchema accessibility fields', () => {
  const minimalTable = {
    type: 'table' as const,
    rows: [{
      cells: [{ text: 'Cell 1' }],
    }],
  };

  it('accepts tableDescription', () => {
    const result = TableElementSchema.safeParse({
      ...minimalTable,
      tableDescription: 'Revenue table',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tableDescription).toBe('Revenue table');
    }
  });

  it('accepts tableCaption', () => {
    const result = TableElementSchema.safeParse({
      ...minimalTable,
      tableCaption: 'Table 1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tableCaption).toBe('Table 1');
    }
  });
});

// =============================================================================
// DOCUMENT SCHEMA — LANGUAGE
// =============================================================================

describe('DocxDocumentSchema accessibility fields', () => {
  it('accepts language in metadata', () => {
    const result = DocxDocumentSchema.safeParse({
      type: 'DocxDocument',
      metadata: {
        title: 'Test',
        language: 'en-US',
      },
      pages: [{
        elements: [
          { type: 'paragraph', text: 'Hello' },
        ],
      }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata?.language).toBe('en-US');
    }
  });

  it('enforces heading hierarchy when requested', async () => {
    await expect(renderToDocx({
      type: 'DocxDocument',
      accessible: { enforceHeadingHierarchy: true },
      pages: [{ elements: [{ type: 'heading', level: 3, text: 'Skipped' }] }],
    })).rejects.toThrow(/heading hierarchy skips/i);
  });

  it('enforces explicit table headers when requested', async () => {
    await expect(renderToDocx({
      type: 'DocxDocument',
      accessible: { enforceTableHeaders: true },
      pages: [{ elements: [{ type: 'table', rows: [{ cells: [{ text: 'Value' }] }] }] }],
    })).rejects.toThrow(/missing an explicit header row/i);
  });

  it('rejects the removed no-op autoAltText option', () => {
    const result = DocxDocumentSchema.safeParse({
      type: 'DocxDocument',
      accessible: { autoAltText: true },
      pages: [{ elements: [{ type: 'paragraph', text: 'Body' }] }],
    });

    expect(result.success).toBe(false);
  });
});
