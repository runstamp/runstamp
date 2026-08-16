import type { DocumentMetadata } from '../types.js';
import type { DeterministicContext } from './deterministic.js';
import { NS } from './namespaces.js';
import { serializeXml, xmlElement, xmlText } from './ordered-builder.js';
import { escapeXml } from './xml-escape.js';

function toW3cDate(date: Date): string {
  return date.toISOString();
}

export function buildCorePropertiesXml(
  metadata: DocumentMetadata,
  context: DeterministicContext,
): string {
  const createdAt = metadata.createdAt ?? context.fixedDate;
  const modifiedAt = metadata.modifiedAt ?? context.fixedDate;

  return serializeXml(
    xmlElement(
      'cp:coreProperties',
      {
        'xmlns:cp': NS.coreProps,
        'xmlns:dc': NS.dc,
        'xmlns:dcterms': NS.dcterms,
        'xmlns:dcmitype': NS.dcmitype,
        'xmlns:xsi': NS.xsi,
      },
      [
        xmlElement('dc:title', undefined, [xmlText(escapeXml(metadata.title ?? 'Untitled Document'))]),
        xmlElement('dc:subject', undefined, [xmlText(escapeXml(metadata.subject ?? ''))]),
        xmlElement('dc:creator', undefined, [xmlText(escapeXml(metadata.creator ?? metadata.author ?? 'Runstamp'))]),
        xmlElement('cp:keywords', undefined, [xmlText(escapeXml((metadata.keywords ?? []).join(', ')))]),
        xmlElement('dc:description', undefined, [xmlText(escapeXml(metadata.custom?.description ?? ''))]),
        xmlElement('cp:lastModifiedBy', undefined, [xmlText(escapeXml(metadata.author ?? metadata.creator ?? 'Runstamp'))]),
        xmlElement('dcterms:created', { 'xsi:type': 'dcterms:W3CDTF' }, [xmlText(toW3cDate(createdAt))]),
        xmlElement('dcterms:modified', { 'xsi:type': 'dcterms:W3CDTF' }, [xmlText(toW3cDate(modifiedAt))]),
      ],
    ),
  );
}

export function buildAppPropertiesXml(): string {
  return serializeXml(
    xmlElement(
      'Properties',
      {
        xmlns: NS.appProps,
        'xmlns:vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
      },
      [
        xmlElement('Application', undefined, [xmlText('Runstamp')]),
        xmlElement('DocSecurity', undefined, [xmlText('0')]),
        xmlElement('ScaleCrop', undefined, [xmlText('false')]),
        xmlElement('Company', undefined, [xmlText('Runstamp')]),
        xmlElement('LinksUpToDate', undefined, [xmlText('false')]),
        xmlElement('SharedDoc', undefined, [xmlText('false')]),
        xmlElement('HyperlinksChanged', undefined, [xmlText('false')]),
        xmlElement('AppVersion', undefined, [xmlText('16.0000')]),
        xmlElement('Words', undefined, [xmlText('0')]),
        xmlElement('Characters', undefined, [xmlText('0')]),
      ],
    ),
  );
}
