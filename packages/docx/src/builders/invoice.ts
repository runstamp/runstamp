/**
 * High-level invoice builder.
 *
 * Mirrors the `generate_invoice_docx` MCP wrapper shape so the documented
 * Mode B examples work without rewriting. See
 * docs/0428-claude-test-based-directive2.md §"@runstamp/docx".
 */
import type { DocxDocument, DocxElement } from '../schema.js';

export interface InvoiceParty {
  name: string;
  address: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BuildInvoiceDocxInput {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  sender: InvoiceParty;
  recipient: InvoiceParty;
  items: InvoiceLineItem[];
  subtotal: number;
  /** Tax rate as decimal (e.g. 0.0875 for 8.75%). */
  taxRate?: number;
  taxAmount: number;
  total: number;
  /** ISO 4217 currency code. Defaults to 'USD'. */
  currency?: string;
  /** Notes appended after totals. */
  notes?: string;
  theme?: 'corporate' | 'modern' | 'minimal';
  pageSize?: 'a4' | 'letter';
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function partyBlock(label: string, party: InvoiceParty): string {
  const lines = [`${label}:`, party.name, party.address];
  if (party.email) lines.push(party.email);
  if (party.taxId) lines.push(`Tax ID: ${party.taxId}`);
  return lines.join('\n');
}

export function buildInvoiceDocx(input: BuildInvoiceDocxInput): DocxDocument {
  const currency = input.currency ?? 'USD';
  const elements: DocxElement[] = [];

  elements.push({
    type: 'heading',
    level: 1,
    text: 'INVOICE',
    style: { textAlign: 'right' },
  });
  elements.push({
    type: 'paragraph',
    text: `#${input.invoiceNumber}`,
    style: { textAlign: 'right' },
  });

  elements.push({ type: 'divider' });

  elements.push({
    type: 'table',
    rows: [
      {
        cells: [
          { text: partyBlock('From', input.sender) },
          { text: partyBlock('Bill To', input.recipient) },
        ],
      },
    ],
    tableStyle: 'plain',
  });

  elements.push({
    type: 'paragraph',
    text: `Invoice Date: ${input.date}    |    Due Date: ${input.dueDate}`,
  });

  elements.push({ type: 'paragraph', text: '' });

  elements.push({
    type: 'table',
    columns: [{ width: 250 }, { width: 60 }, { width: 80 }, { width: 80 }],
    rows: [
      {
        isHeader: true,
        cells: [
          { text: 'Description', style: { fontWeight: 'bold' } },
          { text: 'Qty', style: { fontWeight: 'bold', textAlign: 'right' } },
          { text: 'Unit Price', style: { fontWeight: 'bold', textAlign: 'right' } },
          { text: 'Amount', style: { fontWeight: 'bold', textAlign: 'right' } },
        ],
      },
      ...input.items.map((item) => ({
        cells: [
          { text: item.description },
          { text: String(item.quantity), style: { textAlign: 'right' as const } },
          { text: formatAmount(item.unitPrice, currency), style: { textAlign: 'right' as const } },
          { text: formatAmount(item.amount, currency), style: { textAlign: 'right' as const } },
        ],
      })),
    ],
    tableStyle: 'striped',
    repeatHeaders: true,
  });

  elements.push({ type: 'paragraph', text: '' });
  elements.push({
    type: 'table',
    columns: [{ width: 350 }, { width: 120 }],
    rows: [
      {
        cells: [
          { text: 'Subtotal', style: { textAlign: 'right' } },
          { text: formatAmount(input.subtotal, currency), style: { textAlign: 'right' } },
        ],
      },
      {
        cells: [
          {
            text: input.taxRate != null ? `Tax (${(input.taxRate * 100).toFixed(1)}%)` : 'Tax',
            style: { textAlign: 'right' },
          },
          { text: formatAmount(input.taxAmount, currency), style: { textAlign: 'right' } },
        ],
      },
      {
        cells: [
          { text: 'TOTAL', style: { fontWeight: 'bold', textAlign: 'right' } },
          { text: formatAmount(input.total, currency), style: { fontWeight: 'bold', textAlign: 'right' } },
        ],
      },
    ],
    tableStyle: 'plain',
  });

  if (input.notes) {
    elements.push({ type: 'divider' });
    elements.push({ type: 'heading', level: 3, text: 'Notes' });
    elements.push({ type: 'paragraph', text: input.notes });
  }

  return {
    type: 'DocxDocument',
    pageSize: input.pageSize ?? 'a4',
    orientation: 'portrait',
    theme: { preset: input.theme ?? 'corporate' },
    metadata: { title: `Invoice ${input.invoiceNumber}` },
    pages: [{ elements }],
  } as DocxDocument;
}
