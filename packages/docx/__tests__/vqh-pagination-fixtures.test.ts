import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { renderToDocx } from '../src/render.js';
import { validateDocxBuffer } from '../src/core/ooxml-output-validator.js';
import type { DocxDocument } from '../src/schema.js';

const fixtures = [
  'docx-agreement-supplier-sla',
  'docx-agreement-gdpr-dpa',
  'docx-analysis-competitive-landscape-cgm',
  'docx-report-pentest-summary',
  'docx-agreement-software-license',
  'docx-contract-lease-summary',
  'docx-analysis-qbr-saas-q2-fy26',
  'docx-policy-incident-response',
  'docx-policy-infosec',
] as const;

async function loadFixture(name: string): Promise<DocxDocument> {
  const fixtureUrl = new URL(`../fixtures/public/corpus/${name}.json`, import.meta.url);
  const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8')) as { document: DocxDocument };
  return fixture.document;
}

describe('strict-ratchet pagination fixture renders', () => {
  for (const fixtureName of fixtures) {
    it(`renders and validates ${fixtureName}`, async () => {
      const result = await renderToDocx(await loadFixture(fixtureName));
      const validation = await validateDocxBuffer(result.buffer);
      const zip = await JSZip.loadAsync(result.buffer);
      const documentXml = await zip.file('word/document.xml')!.async('string');

      expect(result.buffer.byteLength).toBeGreaterThan(1_000);
      expect(validation).toEqual({ ok: true, issues: [] });
      expect(documentXml).toContain('<w:document');
    });
  }

  it('keeps the SLA schedule transition continuous and removes the forced Section 5 break', async () => {
    const document = await loadFixture('docx-agreement-supplier-sla');
    const sectionFive = document.pages
      .flatMap((page) => page.elements)
      .find((element) => element.type === 'heading' && element.text === '5. Termination');

    expect(document.pages[1]?.sectionBreak).toBe('continuous');
    expect(sectionFive).not.toHaveProperty('pageBreakBefore');
  });

  it('uses semantic pagination hints on each corrected closing block', async () => {
    const expectedHintedFixtures = fixtures.filter((name) => ![
      'docx-agreement-supplier-sla',
      'docx-analysis-competitive-landscape-cgm',
    ].includes(name));

    for (const fixtureName of expectedHintedFixtures) {
      const document = await loadFixture(fixtureName);
      const serialized = JSON.stringify(document);
      expect(serialized).toMatch(/"keepTogether":true|"keepWithNext":true/);
    }
  });
});
