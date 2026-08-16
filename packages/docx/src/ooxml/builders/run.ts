import type { TextRun } from '../../types.js';
import { buildRunProperties, containsRtlText } from './run-properties.js';
import { xmlElement, xmlText } from '../ordered-builder.js';
import { escapeXml } from '../xml-escape.js';
import type { XmlElement } from '../types.js';
import type { ResolvedRevisionInfo } from '../../core/revision-tracker.js';
import { appendRunRevisionProperties, buildDeletedTextRun, wrapInsertedRun } from '../revisions.js';
import type { SerializationContext } from '../context.js';


export interface NativeRunBuildOptions {
  autoNoProof?: boolean;
  styleId?: string;
  revisionInfo?: ResolvedRevisionInfo;
  context?: SerializationContext;
}

export function buildTextRun(run: TextRun, options: NativeRunBuildOptions = {}): XmlElement {
  if (run.revision?.type === 'delete' && options.revisionInfo) {
    return buildDeletedTextRun(run, options.revisionInfo, options.context);
  }

  const rtl = containsRtlText(run.text);
  const allowCssHex = options.context?.options.strictColors !== true;
  const baseProperties = buildRunProperties({
    fontFamily: run.fontFamily,
    fontSize: run.fontSize,
    fontWeight: run.fontWeight,
    fontStyle: run.fontStyle,
    textDecoration: run.textDecoration,
    color: run.color,
    backgroundColor: run.backgroundColor,
    superscript: run.superscript,
    subscript: run.subscript,
    autoNoProof: options.autoNoProof ?? true,
    rtl,
    language: options.context?.document.metadata.language,
    styleId: options.styleId,
    allowCssHex,
  });
  const properties = appendRunRevisionProperties(baseProperties, run, options.revisionInfo, options.context);

  const children: XmlElement[] = [];
  if (properties) {
    children.push(properties);
  }

  const lines = run.text.split(/\r\n|\n|\r/);
  lines.forEach((line, index) => {
    if (index > 0) {
      children.push(xmlElement('w:br'));
    }

    children.push(
      xmlElement('w:t', { 'xml:space': 'preserve' }, [xmlText(escapeXml(line))]),
    );
  });

  const textRun = xmlElement('w:r', undefined, children);
  return run.revision?.type === 'insert' && options.revisionInfo
    ? wrapInsertedRun(run, options.revisionInfo, textRun, options.context)
    : textRun;
}

export function buildPageBreakRun(): XmlElement {
  return xmlElement('w:r', undefined, [
    buildRunProperties({ autoNoProof: true }) ?? xmlElement('w:rPr'),
    xmlElement('w:br', { 'w:type': 'page' }),
  ]);
}
