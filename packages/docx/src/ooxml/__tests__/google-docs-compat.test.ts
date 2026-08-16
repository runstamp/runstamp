import { describe, expect, it } from 'vitest';
import { serializeXmlFragment } from '../ordered-builder.js';
import { buildRunProperties } from '../builders/run-properties.js';
import { buildDocumentXml } from '../document.js';
import { createDeterministicContext } from '../deterministic.js';
import { buildSettingsXml } from '../settings.js';
import { ContentTypesRegistry } from '../content-types.js';
import { RelationshipManager } from '../relationships.js';
import { resolveResourceLimits } from '../resource-limits.js';
import { createSerializationContext } from '../context.js';
import { DEFAULT_STYLE, createStructuredDocument, createTextRun } from './test-utils.js';

describe('native google docs compatibility', () => {
  it('emits explicit hex alongside theme color and maximal root namespaces', async () => {
    const runPropertiesXml = serializeXmlFragment([
      buildRunProperties({
        color: '2F5597',
        themeColor: 'accent1',
        fontFamily: 'Calibri',
        fontSize: 11,
      })!,
    ]);

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
        text: 'Compat',
        runs: [createTextRun('Compat')],
      },
    ] as any);
    const deterministic = createDeterministicContext();
    const docXml = await buildDocumentXml(doc, createSerializationContext({
      document: doc,
      options: {},
      deterministic,
      limits: resolveResourceLimits(),
      contentTypes: new ContentTypesRegistry(),
      documentRelationships: new RelationshipManager(),
    }));

    expect(runPropertiesXml).toContain('w:val="2F5597"');
    expect(runPropertiesXml).toContain('w:themeColor="accent1"');
    expect(docXml).toContain('mc:Ignorable="w14 w15 wps wpg wpi"');
    expect(docXml).toContain('xmlns:wps=');
  });

  it('opts generated settings into Word 2013+ compatibility mode', () => {
    const settingsXml = buildSettingsXml(createDeterministicContext());

    expect(settingsXml).toContain('<w:compat>');
    expect(settingsXml).toContain('w:name="compatibilityMode"');
    expect(settingsXml).toContain('w:val="15"');
  });
});
