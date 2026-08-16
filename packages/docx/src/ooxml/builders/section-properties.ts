import type { StructuredPage } from '../../types.js';
import { pxToTwips, type Twips } from '../../utils/units.js';
import { OrderedBuilder, xmlElement } from '../ordered-builder.js';
import { SECTION_PROPERTY_ORDER, type XmlElement } from '../types.js';

export interface SectionPropertiesOptions {
  breakType?: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
  headerReferences?: Array<{ type: 'default' | 'first' | 'even'; relationshipId: string }>;
  footerReferences?: Array<{ type: 'default' | 'first' | 'even'; relationshipId: string }>;
  titlePage?: boolean;
  columns?: number;
}

function pageSize(page: StructuredPage): { width: Twips; height: Twips; orient?: 'landscape' } {
  const width: Twips = pxToTwips(page.dimensions.width);
  const height: Twips = pxToTwips(page.dimensions.height);
  if (page.dimensions.width > page.dimensions.height) {
    return { width, height, orient: 'landscape' };
  }
  return { width, height };
}

export function buildSectionProperties(
  page: StructuredPage,
  options: SectionPropertiesOptions = {},
): XmlElement {
  const builder = new OrderedBuilder<(typeof SECTION_PROPERTY_ORDER)[number]>(SECTION_PROPERTY_ORDER);
  const size = pageSize(page);
  const margins = page.dimensions.margins;
  const hasHeader = (options.headerReferences?.length ?? 0) > 0;
  const hasFooter = (options.footerReferences?.length ?? 0) > 0;
  // Keep body content out of the header/footer safe box. Word positions the
  // parts 0.5in from the edge; a 1in body margin leaves a 0.5in guard band for
  // a normal business header/footer and avoids clipping with narrow margins.
  const topMargin = hasHeader
    ? Math.max(pxToTwips(margins.top), 1440)
    : pxToTwips(margins.top);
  const bottomMargin = hasFooter
    ? Math.max(pxToTwips(margins.bottom), 1440)
    : pxToTwips(margins.bottom);

  if (options.breakType) {
    builder.set('type', xmlElement('w:type', { 'w:val': options.breakType }));
  }

  for (const reference of options.headerReferences ?? []) {
    builder.push('headerReference', xmlElement('w:headerReference', {
      'w:type': reference.type,
      'r:id': reference.relationshipId,
    }));
  }

  for (const reference of options.footerReferences ?? []) {
    builder.push('footerReference', xmlElement('w:footerReference', {
      'w:type': reference.type,
      'r:id': reference.relationshipId,
    }));
  }

  builder.set('pgSz', xmlElement('w:pgSz', {
    'w:w': String(size.width),
    'w:h': String(size.height),
    ...(size.orient ? { 'w:orient': size.orient } : {}),
  }));

  builder.set('pgMar', xmlElement('w:pgMar', {
    'w:top': String(topMargin),
    'w:right': String(pxToTwips(margins.right)),
    'w:bottom': String(bottomMargin),
    'w:left': String(pxToTwips(margins.left)),
    'w:header': '720',
    'w:footer': '720',
    'w:gutter': '0',
  }));

  const columnCount = Math.max(1, Math.floor(options.columns ?? 1));
  builder.set('cols', xmlElement('w:cols', {
    ...(columnCount > 1 ? { 'w:num': String(columnCount) } : {}),
    'w:space': '720',
  }));
  if (options.titlePage) {
    builder.set('titlePg', xmlElement('w:titlePg'));
  }
  builder.set('docGrid', xmlElement('w:docGrid', { 'w:linePitch': '360' }));

  return xmlElement('w:sectPr', undefined, builder.build());
}
