import type { DeterministicContext } from './deterministic.js';
import { serializeXml, xmlElement } from './ordered-builder.js';


export interface NativeSettingsOptions {
  updateFields?: boolean;
  evenAndOddHeaders?: boolean;
  trackRevisions?: boolean;
  revisionRsid?: string;
}

export function buildSettingsXml(context: DeterministicContext, options: NativeSettingsOptions = {}): string {
  return serializeXml(
    xmlElement(
      'w:settings',
      {
        'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
        'xmlns:o': 'urn:schemas-microsoft-com:office:office',
        'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'xmlns:m': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
        'xmlns:v': 'urn:schemas-microsoft-com:vml',
        'xmlns:w10': 'urn:schemas-microsoft-com:office:word',
        'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
        'xmlns:w15': 'http://schemas.microsoft.com/office/word/2012/wordml',
        'mc:Ignorable': 'w14 w15',
      },
      [
        xmlElement('w:zoom', { 'w:percent': '100' }),
        ...(options.trackRevisions ? [xmlElement('w:trackRevisions')] : []),
        xmlElement('w:defaultTabStop', { 'w:val': '720' }),
        ...(options.evenAndOddHeaders ? [xmlElement('w:evenAndOddHeaders')] : []),
        xmlElement('w:characterSpacingControl', { 'w:val': 'doNotCompress' }),
        ...(options.updateFields ? [xmlElement('w:updateFields', { 'w:val': 'true' })] : []),
        xmlElement('w:compat', undefined, [
          xmlElement('w:compatSetting', {
            'w:name': 'compatibilityMode',
            'w:uri': 'http://schemas.microsoft.com/office/word',
            'w:val': '15',
          }),
        ]),
        xmlElement('w:rsids', undefined, [
          xmlElement('w:rsidRoot', { 'w:val': options.revisionRsid ?? context.rsidRoot }),
          xmlElement('w:rsid', { 'w:val': options.revisionRsid ?? context.nextRsid() }),
          xmlElement('w:rsid', { 'w:val': context.nextRsid() }),
        ]),
      ],
    ),
  );
}
