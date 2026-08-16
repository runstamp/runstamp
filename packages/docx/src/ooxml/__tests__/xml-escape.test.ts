import { describe, expect, it } from 'vitest';
import { escapeXml, escapeXmlAttr } from '../xml-escape.js';

describe('native xml escape', () => {
  it('escapes text and strips invalid characters', () => {
    expect(escapeXml(`<&"'`)).toBe('&lt;&amp;&quot;&apos;');
    expect(escapeXml('null\u0000byte')).toBe('nullbyte');
    expect(escapeXml('emoji \uD83D\uDE00')).toBe('emoji \uD83D\uDE00');
    expect(escapeXml('broken \uD800')).toBe('broken \uFFFD');
    expect(escapeXml('</w:t><w:r><w:t>injected')).toContain('&lt;/w:t&gt;');
  });

  it('escapes attribute newlines', () => {
    expect(escapeXmlAttr('line1\nline2\rline3')).toBe('line1&#xA;line2&#xD;line3');
  });
});
