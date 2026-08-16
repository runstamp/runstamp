// src/ooxml/customProps.ts — Custom document properties (docProps/custom.xml)

import type { CustomProperty } from "../types/ast.js";
import { isDeterministicMode, DETERMINISTIC_DATE } from "../deterministicMode.js";
import { escapeXml } from "./drawing/textUtils.js";

const FMTID = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";

function formatPropertyValue(value: string | number | boolean | Date): string {
  if (typeof value === "string") {
    return `<vt:lpwstr>${escapeXml(value)}</vt:lpwstr>`;
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return `<vt:i4>${value}</vt:i4>`;
    }
    return `<vt:r8>${value}</vt:r8>`;
  }
  if (typeof value === "boolean") {
    return `<vt:bool>${value}</vt:bool>`;
  }
  if (value instanceof Date) {
    const dateStr = isDeterministicMode()
      ? DETERMINISTIC_DATE.toISOString()
      : value.toISOString();
    return `<vt:filetime>${dateStr}</vt:filetime>`;
  }
  return `<vt:lpwstr>${escapeXml(String(value))}</vt:lpwstr>`;
}

/**
 * Generates docProps/custom.xml with custom metadata properties.
 */
export function generateCustomProperties(props: CustomProperty[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n`;

  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const pid = i + 2; // PIDs start at 2 per OOXML spec
    xml += `  <property fmtid="${FMTID}" pid="${pid}" name="${escapeXml(prop.name)}">${formatPropertyValue(prop.value)}</property>\n`;
  }

  xml += `</Properties>`;
  return xml;
}
