import { XMLBuilder } from 'fast-xml-parser';
import type { XmlContent, XmlElement, XmlTextNode } from './types.js';
import { escapeXmlAttr } from './xml-escape.js';

type PreserveOrderRecord = Record<string, unknown>;

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export class OrderedBuilder<TField extends string> {
  private readonly ordering: readonly TField[];
  private readonly values = new Map<TField, XmlContent[]>();

  constructor(ordering: readonly TField[]) {
    this.ordering = ordering;
  }

  set(field: TField, node: XmlContent | XmlContent[] | undefined): this {
    if (node === undefined) {
      this.values.delete(field);
      return this;
    }

    this.values.set(field, Array.isArray(node) ? node : [node]);
    return this;
  }

  push(field: TField, node: XmlContent): this {
    const existing = this.values.get(field);
    if (existing) {
      existing.push(node);
    } else {
      this.values.set(field, [node]);
    }
    return this;
  }

  build(): XmlContent[] {
    const result: XmlContent[] = [];
    for (const field of this.ordering) {
      const nodes = this.values.get(field);
      if (nodes) {
        result.push(...nodes);
      }
    }
    return result;
  }
}

export function xmlElement(tag: string, attrs?: Record<string, string>, children: XmlContent[] = []): XmlElement {
  return { tag, attrs, children };
}

export function xmlText(value: string): XmlTextNode {
  return { kind: 'text', value };
}

export function serializeXml(root: XmlElement): string {
  return `${XML_DECLARATION}${serializeXmlFragment([root])}`;
}

export function serializeXmlFragment(nodes: XmlContent[]): string {
  const builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    processEntities: false,
    format: false,
  });

  return builder.build(nodes.map(toPreserveOrderNode));
}

function toPreserveOrderNode(node: XmlContent): PreserveOrderRecord {
  if (isTextNode(node)) {
    return { '#text': node.value };
  }

  const record: PreserveOrderRecord = {
    [node.tag]: (node.children ?? []).map(toPreserveOrderNode),
  };

  if (node.attrs && Object.keys(node.attrs).length > 0) {
    // xmlElement callers pass raw attribute values; escaping is centralized here
    // because XMLBuilder does not escape attrs when processEntities is disabled.
    record[':@'] = Object.fromEntries(
      Object.entries(node.attrs).map(([key, value]) => [`@_${key}`, escapeXmlAttr(value)]),
    );
  }

  return record;
}

function isTextNode(node: XmlContent): node is XmlTextNode {
  return (node as XmlTextNode).kind === 'text';
}
