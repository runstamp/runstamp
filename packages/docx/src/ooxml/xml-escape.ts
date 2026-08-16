const AMP = /&/g;
const LT = /</g;
const GT = />/g;
const QUOT = /"/g;
const APOS = /'/g;
const LONE_SURROGATES = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function stripInvalidControlChars(value: string): string {
  let result = '';
  let changed = false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const invalid = (code <= 0x08) || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f);
    if (invalid) {
      changed = true;
      continue;
    }
    result += value[index];
  }
  return changed ? result : value;
}

export function escapeXml(value: string): string {
  return stripInvalidControlChars(value)
    .replace(LONE_SURROGATES, '\uFFFD')
    .replace(AMP, '&amp;')
    .replace(LT, '&lt;')
    .replace(GT, '&gt;')
    .replace(QUOT, '&quot;')
    .replace(APOS, '&apos;');
}

export function escapeXmlAttr(value: string): string {
  return escapeXml(value)
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;');
}
