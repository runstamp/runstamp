import { serializeXml, xmlElement } from './ordered-builder.js';

export function buildWebSettingsXml(): string {
  return serializeXml(
    xmlElement(
      'w:webSettings',
      { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' },
      [
        xmlElement('w:optimizeForBrowser'),
        xmlElement('w:allowPNG'),
      ],
    ),
  );
}
