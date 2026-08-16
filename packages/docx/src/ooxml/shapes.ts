import type { ShapeElement, ShapeType } from '../types.js';
import { pxToEmu, type EMU } from '../utils/units.js';
import type { SerializationContext } from './context.js';
import { NS } from './namespaces.js';
import { xmlElement, xmlText } from './ordered-builder.js';
import { escapeXml } from './xml-escape.js';
import type { XmlElement } from './types.js';

function hex(color: string | undefined, fallback: string): string {
  return (color || fallback).replace(/^#/, '').toUpperCase();
}

function fillColor(element: ShapeElement): string {
  if (element.fill?.type === 'solid' && element.fill.color) {
    return hex(element.fill.color, '4472C4');
  }
  if (element.fill?.type === 'gradient' && element.fill.gradient?.stops[0]?.color) {
    return hex(element.fill.gradient.stops[0].color, '4472C4');
  }
  return '4472C4';
}

function strokeColor(element: ShapeElement): string {
  return hex(element.stroke?.color, '2F5496');
}

function presetGeometry(shapeType: ShapeType): string {
  switch (shapeType) {
    case 'rectangle':
      return 'rect';
    case 'ellipse':
      return 'ellipse';
    case 'triangle':
      return 'triangle';
    case 'diamond':
      return 'diamond';
    case 'line':
      return 'line';
    case 'arrow':
      return 'rightArrow';
    case 'pentagon':
      return 'pentagon';
    case 'hexagon':
      return 'hexagon';
    case 'star':
      return 'star5';
    case 'custom':
      return 'rect';
  }
}

function vmlFallback(element: ShapeElement): XmlElement {
  const width = Math.max(1, element.position.width);
  const height = Math.max(1, element.position.height);
  const fill = `#${fillColor(element)}`;
  const stroke = `#${strokeColor(element)}`;
  const strokeWeight = `${Math.max(0, element.stroke?.width ?? 1)}pt`;
  const style = `width:${width}pt;height:${height}pt`;

  if (element.shapeType === 'ellipse') {
    return xmlElement('w:pict', undefined, [
      xmlElement('v:oval', {
        style,
        fillcolor: fill,
        stroked: 't',
        strokecolor: stroke,
        strokeweight: strokeWeight,
      }),
    ]);
  }

  if (element.shapeType === 'line') {
    return xmlElement('w:pict', undefined, [
      xmlElement('v:line', {
        from: '0,0',
        to: `${width}pt,${height}pt`,
        stroked: 't',
        strokecolor: stroke,
        strokeweight: strokeWeight,
      }),
    ]);
  }

  const shapeTag = element.shapeType === 'rectangle' ? 'v:rect' : 'v:shape';
  return xmlElement('w:pict', undefined, [
    xmlElement(shapeTag, {
      style,
      fillcolor: fill,
      stroked: 't',
      strokecolor: stroke,
      strokeweight: strokeWeight,
      ...(shapeTag === 'v:shape' ? { alt: `${element.shapeType} shape` } : {}),
    }, element.text ? [
      xmlElement('v:textbox', undefined, [
        xmlElement('w:txbxContent', undefined, [
          xmlElement('w:p', undefined, [
            xmlElement('w:r', undefined, [
              xmlElement('w:t', undefined, [xmlText(escapeXml(element.text))]),
            ]),
          ]),
        ]),
      ]),
    ] : []),
  ]);
}

function shapeText(element: ShapeElement): XmlElement[] {
  const text = element.text ?? element.runs?.map((run) => run.text).join('');
  if (!text) {
    return [];
  }

  return [
    xmlElement('wps:txbx', undefined, [
      xmlElement('w:txbxContent', undefined, [
        xmlElement('w:p', undefined, [
          xmlElement('w:r', undefined, [
            xmlElement('w:t', undefined, [xmlText(escapeXml(text))]),
          ]),
        ]),
      ]),
    ]),
  ];
}

export function buildShapeDrawing(context: SerializationContext, element: ShapeElement): XmlElement {
  const docPrId = context.deterministic.nextId('docPr');
  const widthEmu: EMU = pxToEmu(Math.max(1, element.position.width));
  const heightEmu: EMU = pxToEmu(Math.max(1, element.position.height));
  const fill = fillColor(element);
  const stroke = strokeColor(element);
  const strokeWidth = String(Math.max(0, Math.round((element.stroke?.width ?? 1) * 12700)));

  return xmlElement('mc:AlternateContent', undefined, [
    xmlElement('mc:Choice', { Requires: 'wps' }, [
      xmlElement('w:drawing', undefined, [
        xmlElement('wp:inline', {
          'xmlns:wp': NS.wordprocessingDrawing,
          distT: '0',
          distB: '0',
          distL: '0',
          distR: '0',
        }, [
          xmlElement('wp:extent', { cx: String(widthEmu), cy: String(heightEmu) }),
          xmlElement('wp:effectExtent', { l: '0', t: '0', r: '0', b: '0' }),
          xmlElement('wp:docPr', {
            id: String(docPrId),
            name: `Shape ${docPrId}`,
            descr: `${element.shapeType} shape`,
          }),
          xmlElement('a:graphic', { 'xmlns:a': NS.drawingMl }, [
            xmlElement('a:graphicData', { uri: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape' }, [
              xmlElement('wps:wsp', undefined, [
                xmlElement('wps:cNvSpPr'),
                xmlElement('wps:spPr', undefined, [
                  xmlElement('a:xfrm', undefined, [
                    xmlElement('a:off', { x: '0', y: '0' }),
                    xmlElement('a:ext', { cx: String(widthEmu), cy: String(heightEmu) }),
                  ]),
                  xmlElement('a:prstGeom', { prst: presetGeometry(element.shapeType) }, [
                    xmlElement('a:avLst'),
                  ]),
                  xmlElement('a:solidFill', undefined, [
                    xmlElement('a:srgbClr', { val: fill }),
                  ]),
                  xmlElement('a:ln', { w: strokeWidth }, [
                    xmlElement('a:solidFill', undefined, [
                      xmlElement('a:srgbClr', { val: stroke }),
                    ]),
                  ]),
                ]),
                xmlElement('wps:bodyPr'),
                ...shapeText(element),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    xmlElement('mc:Fallback', undefined, [
      vmlFallback(element),
    ]),
  ]);
}
