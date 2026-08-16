import type { StructuredPage } from '../../types.js';
import { buildSectionProperties, type SectionPropertiesOptions } from './section-properties.js';
import { xmlElement } from '../ordered-builder.js';
import type { XmlContent, XmlElement } from '../types.js';

function findChild(node: XmlElement, tag: string): XmlElement | undefined {
  return node.children?.find(
    (child: XmlContent): child is XmlElement => typeof child === 'object' && 'tag' in child && child.tag === tag,
  );
}

function ensureParagraphProperties(paragraph: XmlElement): XmlElement {
  let properties = findChild(paragraph, 'w:pPr');
  if (!properties) {
    properties = xmlElement('w:pPr');
    paragraph.children = [properties, ...(paragraph.children ?? [])];
  }
  return properties;
}

export function attachSectionPropertiesToPage(
  blocks: XmlElement[],
  page: StructuredPage,
  isFinalPage: boolean,
  options: SectionPropertiesOptions = {},
): XmlElement[] {
  const sectionProperties = buildSectionProperties(page, options);

  if (isFinalPage) {
    return [...blocks, sectionProperties];
  }

  const lastParagraph = [...blocks].reverse().find((block) => block.tag === 'w:p');
  if (lastParagraph) {
    const properties = ensureParagraphProperties(lastParagraph);
    properties.children = [...(properties.children ?? []), sectionProperties];
    return blocks;
  }

  return [
    ...blocks,
    xmlElement('w:p', undefined, [
      xmlElement('w:pPr', undefined, [sectionProperties]),
    ]),
  ];
}

export function buildBody(children: XmlElement[]): XmlElement {
  return xmlElement('w:body', undefined, children);
}
