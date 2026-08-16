/**
 * High-level contract builder.
 *
 * Mirrors the `generate_contract_docx` MCP wrapper shape so the documented
 * Mode B examples work without rewriting. See
 * docs/0428-claude-test-based-directive2.md §"@runstamp/docx".
 */
import { Errors } from '../errors.js';
import type { DocxDocument, DocxElement } from '../schema.js';

export interface ContractParty {
  name: string;
  address: string;
  /** e.g. "Licensor", "Client". */
  role: string;
}

export interface ContractClause {
  /** e.g. "1", "2.1". */
  number: string;
  title: string;
  content: string;
  subclauses?: Array<{
    /** e.g. "a", "i". */
    label: string;
    content: string;
  }>;
}

export interface ContractSignature {
  name: string;
  title: string;
  /** Which party this signatory represents. */
  party: string;
}

export interface BuildContractDocxInput {
  title: string;
  /** Free-form date string. */
  effectiveDate: string;
  parties: ContractParty[];
  recitals?: string[];
  clauses: ContractClause[];
  signatures?: ContractSignature[];
  theme?: 'corporate' | 'classic' | 'academic';
  pageSize?: 'a4' | 'letter' | 'legal';
}

export function buildContractDocx(input: BuildContractDocxInput): DocxDocument {
  if (input.parties.length < 2) {
    throw Errors.invalidDocument('buildContractDocx requires at least 2 parties.');
  }

  const elements: DocxElement[] = [];

  elements.push({ type: 'heading', level: 1, text: input.title, style: { textAlign: 'center' } });
  elements.push({
    type: 'paragraph',
    text: `Effective Date: ${input.effectiveDate}`,
    style: { textAlign: 'center' },
  });

  elements.push({ type: 'divider' });

  elements.push({ type: 'heading', level: 2, text: 'PARTIES' });
  for (const [i, party] of input.parties.entries()) {
    elements.push({
      type: 'paragraph',
      text: `${i + 1}. ${party.name} ("${party.role}"), located at ${party.address}`,
    });
  }

  if (input.recitals && input.recitals.length > 0) {
    elements.push({ type: 'heading', level: 2, text: 'RECITALS' });
    for (const recital of input.recitals) {
      elements.push({ type: 'paragraph', text: `WHEREAS, ${recital}` });
    }
    elements.push({
      type: 'paragraph',
      text: 'NOW, THEREFORE, in consideration of the mutual covenants set forth herein, the parties agree as follows:',
    });
  }

  for (const clause of input.clauses) {
    elements.push({ type: 'heading', level: 2, text: `${clause.number}. ${clause.title}` });
    elements.push({ type: 'paragraph', text: clause.content });

    if (clause.subclauses && clause.subclauses.length > 0) {
      elements.push({
        type: 'list',
        listType: 'letter',
        items: clause.subclauses.map((sc) => ({ text: sc.content })),
      });
    }
  }

  if (input.signatures && input.signatures.length > 0) {
    elements.push({ type: 'divider' });
    elements.push({ type: 'heading', level: 2, text: 'SIGNATURES' });
    elements.push({
      type: 'paragraph',
      text: 'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.',
    });
    for (const sig of input.signatures) {
      elements.push({ type: 'paragraph', text: '' });
      elements.push({ type: 'paragraph', text: '____________________________' });
      elements.push({ type: 'paragraph', text: `${sig.name}, ${sig.title}` });
      elements.push({ type: 'paragraph', text: `On behalf of: ${sig.party}` });
      elements.push({ type: 'paragraph', text: 'Date: ____________________' });
    }
  }

  return {
    type: 'DocxDocument',
    pageSize: input.pageSize ?? 'letter',
    orientation: 'portrait',
    theme: { preset: input.theme ?? 'classic' },
    footer: { includePageNumber: true },
    pages: [{ elements }],
  } as DocxDocument;
}
