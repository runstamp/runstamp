import { serializeXml, xmlElement } from './ordered-builder.js';

export interface ThemeOptions {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

function hex(color: string | undefined, fallback: string): string {
  return (color ?? fallback).replace(/^#/, '').toUpperCase();
}

export function buildThemeXml(options: ThemeOptions = {}): string {
  const accent1 = hex(options.primaryColor, '2F5597');
  const accent2 = hex(options.secondaryColor, '5B9BD5');
  const accent3 = hex(options.accentColor, '70AD47');
  const text = hex(options.textColor, '000000');
  const background = hex(options.backgroundColor, 'FFFFFF');
  const headingFont = options.headingFont ?? 'Cambria';
  const bodyFont = options.bodyFont ?? 'Calibri';

  return serializeXml(
    xmlElement(
      'a:theme',
      {
        'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        name: 'Runstamp Theme',
      },
      [
        xmlElement('a:themeElements', undefined, [
          xmlElement('a:clrScheme', { name: 'Runstamp Colors' }, [
            xmlElement('a:dk1', undefined, [xmlElement('a:srgbClr', { val: text })]),
            xmlElement('a:lt1', undefined, [xmlElement('a:srgbClr', { val: background })]),
            xmlElement('a:dk2', undefined, [xmlElement('a:srgbClr', { val: '1F1F1F' })]),
            xmlElement('a:lt2', undefined, [xmlElement('a:srgbClr', { val: 'F5F5F5' })]),
            xmlElement('a:accent1', undefined, [xmlElement('a:srgbClr', { val: accent1 })]),
            xmlElement('a:accent2', undefined, [xmlElement('a:srgbClr', { val: accent2 })]),
            xmlElement('a:accent3', undefined, [xmlElement('a:srgbClr', { val: accent3 })]),
            xmlElement('a:accent4', undefined, [xmlElement('a:srgbClr', { val: 'FFC000' })]),
            xmlElement('a:accent5', undefined, [xmlElement('a:srgbClr', { val: '4472C4' })]),
            xmlElement('a:accent6', undefined, [xmlElement('a:srgbClr', { val: 'C00000' })]),
            xmlElement('a:hlink', undefined, [xmlElement('a:srgbClr', { val: '0563C1' })]),
            xmlElement('a:folHlink', undefined, [xmlElement('a:srgbClr', { val: '954F72' })]),
          ]),
          xmlElement('a:fontScheme', { name: 'Runstamp Fonts' }, [
            xmlElement('a:majorFont', undefined, [
              xmlElement('a:latin', { typeface: headingFont }),
              xmlElement('a:ea', { typeface: '' }),
              xmlElement('a:cs', { typeface: '' }),
            ]),
            xmlElement('a:minorFont', undefined, [
              xmlElement('a:latin', { typeface: bodyFont }),
              xmlElement('a:ea', { typeface: '' }),
              xmlElement('a:cs', { typeface: '' }),
            ]),
          ]),
          xmlElement('a:fmtScheme', { name: 'Runstamp Format' }, [
            xmlElement('a:fillStyleLst', undefined, [
              xmlElement('a:solidFill', undefined, [xmlElement('a:schemeClr', { val: 'phClr' })]),
              xmlElement('a:gradFill', { rotWithShape: '1' }, [
                xmlElement('a:gsLst', undefined, [
                  xmlElement('a:gs', { pos: '0' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:tint', { val: '50000' }), xmlElement('a:satMod', { val: '300000' })])]),
                  xmlElement('a:gs', { pos: '35000' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:tint', { val: '37000' }), xmlElement('a:satMod', { val: '300000' })])]),
                  xmlElement('a:gs', { pos: '100000' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:tint', { val: '15000' }), xmlElement('a:satMod', { val: '350000' })])]),
                ]),
                xmlElement('a:lin', { ang: '16200000', scaled: '1' }),
              ]),
              xmlElement('a:gradFill', { rotWithShape: '1' }, [
                xmlElement('a:gsLst', undefined, [
                  xmlElement('a:gs', { pos: '0' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:shade', { val: '51000' }), xmlElement('a:satMod', { val: '130000' })])]),
                  xmlElement('a:gs', { pos: '80000' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:shade', { val: '93000' }), xmlElement('a:satMod', { val: '130000' })])]),
                  xmlElement('a:gs', { pos: '100000' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:shade', { val: '94000' }), xmlElement('a:satMod', { val: '135000' })])]),
                ]),
                xmlElement('a:lin', { ang: '16200000', scaled: '0' }),
              ]),
            ]),
            xmlElement('a:lnStyleLst', undefined, [
              xmlElement('a:ln', { w: '9525', cap: 'flat', cmpd: 'sng', algn: 'ctr' }, [
                xmlElement('a:solidFill', undefined, [xmlElement('a:schemeClr', { val: 'phClr' })]),
                xmlElement('a:prstDash', { val: 'solid' }),
              ]),
              xmlElement('a:ln', { w: '25400', cap: 'flat', cmpd: 'sng', algn: 'ctr' }, [
                xmlElement('a:solidFill', undefined, [xmlElement('a:schemeClr', { val: 'phClr' })]),
                xmlElement('a:prstDash', { val: 'solid' }),
              ]),
              xmlElement('a:ln', { w: '38100', cap: 'flat', cmpd: 'sng', algn: 'ctr' }, [
                xmlElement('a:solidFill', undefined, [xmlElement('a:schemeClr', { val: 'phClr' })]),
                xmlElement('a:prstDash', { val: 'solid' }),
              ]),
            ]),
            xmlElement('a:effectStyleLst', undefined, [
              xmlElement('a:effectStyle', undefined, [xmlElement('a:effectLst')]),
              xmlElement('a:effectStyle', undefined, [xmlElement('a:effectLst')]),
              xmlElement('a:effectStyle', undefined, [xmlElement('a:effectLst')]),
            ]),
            xmlElement('a:bgFillStyleLst', undefined, [
              xmlElement('a:solidFill', undefined, [xmlElement('a:schemeClr', { val: 'phClr' })]),
              xmlElement('a:solidFill', undefined, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:tint', { val: '95000' }), xmlElement('a:satMod', { val: '170000' })])]),
              xmlElement('a:gradFill', { rotWithShape: '1' }, [
                xmlElement('a:gsLst', undefined, [
                  xmlElement('a:gs', { pos: '0' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:tint', { val: '93000' }), xmlElement('a:satMod', { val: '150000' })])]),
                  xmlElement('a:gs', { pos: '50000' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:tint', { val: '98000' }), xmlElement('a:satMod', { val: '130000' })])]),
                  xmlElement('a:gs', { pos: '100000' }, [xmlElement('a:schemeClr', { val: 'phClr' }, [xmlElement('a:shade', { val: '63000' }), xmlElement('a:satMod', { val: '120000' })])]),
                ]),
                xmlElement('a:path', { path: 'circle' }, [
                  xmlElement('a:fillToRect', { l: '50000', t: '-80000', r: '50000', b: '180000' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        xmlElement('a:objectDefaults'),
        xmlElement('a:extraClrSchemeLst'),
      ],
    ),
  );
}
