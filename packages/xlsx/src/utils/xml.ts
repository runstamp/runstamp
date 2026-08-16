const XML_ESCAPE_PATTERN = /[&<>"']/g;
const XML_ESCAPE_NEEDS_WORK = /[&<>"']/;
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CONTROL_PATTERN = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CONTROL_PATTERN_GLOBAL = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "g");

const XML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&apos;",
};

export const XML_DECLARATION = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";

export function escapeXml(value: string): string {
  if (!XML_ESCAPE_NEEDS_WORK.test(value)) {
    return value;
  }
  return value.replace(XML_ESCAPE_PATTERN, (character) => XML_ESCAPE_MAP[character] ?? character);
}

export function sanitizeSharedString(value: string): string {
  if (!FORBIDDEN_CONTROL_PATTERN.test(value)) {
    return value;
  }

  return value.replace(FORBIDDEN_CONTROL_PATTERN_GLOBAL, "");
}

export function needsXmlSpacePreserve(value: string): boolean {
  return /^\s/.test(value) || /\s$/.test(value) || /[\t\r\n]/.test(value);
}

export function formatNumberForCell(value: number): string {
  if (Object.is(value, -0)) {
    return "-0";
  }

  return String(value);
}

export function toW3CDateTime(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}
