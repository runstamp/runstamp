import { CONTENT_TYPES } from './namespaces.js';
import { serializeXml, xmlElement } from './ordered-builder.js';

export class ContentTypesRegistry {
  private readonly defaults = new Map<string, string>([
    ['rels', CONTENT_TYPES.rels],
    ['xml', CONTENT_TYPES.xml],
  ]);

  private readonly overrides = new Map<string, string>();

  registerOverride(partName: string, contentType: string): void {
    this.overrides.set(partName, contentType);
  }

  registerDefault(extension: string, contentType: string): void {
    this.defaults.set(extension.replace(/^\./, ''), contentType);
  }

  toXml(): string {
    return serializeXml(
      xmlElement(
        'Types',
        { xmlns: 'http://schemas.openxmlformats.org/package/2006/content-types' },
        [
          ...Array.from(this.defaults.entries()).map(([extension, contentType]) =>
            xmlElement('Default', { Extension: extension, ContentType: contentType }),
          ),
          ...Array.from(this.overrides.entries()).map(([partName, contentType]) =>
            xmlElement('Override', { PartName: `/${partName}`, ContentType: contentType }),
          ),
        ],
      ),
    );
  }
}
