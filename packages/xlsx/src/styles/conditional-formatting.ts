import type {
  SpreadsheetConditionalFormatting,
  SpreadsheetConditionalFormattingRule,
  SpreadsheetConditionalFormattingCellIsRule,
  SpreadsheetConditionalFormattingTop10Rule,
  SpreadsheetConditionalFormattingDuplicateRule,
  SpreadsheetConditionalFormattingColorScaleRule,
  SpreadsheetConditionalFormattingDataBarRule,
  SpreadsheetConditionalFormattingIconSetRule,
  SpreadsheetCfvo,
} from "../types/spreadsheet-ast.js";
import type { StyleRegistry } from "./style-registry.js";
import { serializeColorAttributes } from "./color.js";

export interface ConditionalFormattingOutput {
  xml: string;
  extLst: string;
}

function serializeCfvo(rulePoint: { type: string; value?: number | string }): string {
  const valAttr = rulePoint.value !== undefined ? ` val="${rulePoint.value}"` : "";
  return `<cfvo type="${rulePoint.type}"${valAttr}/>`;
}

function serializeCellIs(rule: SpreadsheetConditionalFormattingCellIsRule, registry: StyleRegistry, priority: number): string {
  const dxfId = registry.registerDxf(rule.style);
  const formulas = Array.isArray(rule.formula)
    ? `<formula>${rule.formula[0]}</formula><formula>${rule.formula[1]}</formula>`
    : `<formula>${rule.formula}</formula>`;
  return `<cfRule type="cellIs" dxfId="${dxfId}" priority="${priority}" operator="${rule.operator}">${formulas}</cfRule>`;
}

function serializeTop10(rule: SpreadsheetConditionalFormattingTop10Rule, registry: StyleRegistry, priority: number): string {
  const dxfId = registry.registerDxf(rule.style);
  return `<cfRule type="top10" dxfId="${dxfId}" priority="${priority}" rank="${rule.rank}" percent="${rule.percent ? 1 : 0}" bottom="${rule.bottom ? 1 : 0}"/>`;
}

function serializeDuplicate(rule: SpreadsheetConditionalFormattingDuplicateRule, registry: StyleRegistry, priority: number): string {
  const dxfId = registry.registerDxf(rule.style);
  return `<cfRule type="${rule.type}" dxfId="${dxfId}" priority="${priority}"/>`;
}

function serializeColorScale(rule: SpreadsheetConditionalFormattingColorScaleRule, priority: number): string {
  const points = [rule.scale.min, rule.scale.mid, rule.scale.max].filter(
    (point): point is SpreadsheetConditionalFormattingColorScaleRule["scale"]["min"] => point !== undefined,
  );
  const colors = points.map((point) => `<color ${serializeColorAttributes(point.color)}/>`).join("");
  return `<cfRule type="colorScale" priority="${priority}"><colorScale>${points.map((point) => serializeCfvo(point)).join("")}${colors}</colorScale></cfRule>`;
}

function needsExtendedDataBar(rule: SpreadsheetConditionalFormattingDataBarRule): boolean {
  return (
    rule.negativeColor !== undefined ||
    (rule.axisPosition !== undefined && rule.axisPosition !== "automatic") ||
    rule.gradient === false ||
    rule.direction !== undefined
  );
}

function readableLegacyDataBarColor(rule: SpreadsheetConditionalFormattingDataBarRule): string {
  const color = rule.color.replace(/^#/, "").toUpperCase();
  if (rule.gradient !== false || rule.showValue === false || !/^(?:[0-9A-F]{6}|[0-9A-F]{8})$/u.test(color)) {
    return rule.color;
  }
  const rgb = color.length === 8 ? color.slice(2) : color;
  const softened = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(rgb.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * 0.48).toString(16).padStart(2, "0").toUpperCase();
  }).join("");
  return color.length === 8 ? `${color.slice(0, 2)}${softened}` : softened;
}

function serializeDataBar(rule: SpreadsheetConditionalFormattingDataBarRule, priority: number): { basic: string; extended: string } {
  const showValueAttr = rule.showValue === false ? ` showValue="0"` : "";
  const basic = `<cfRule type="dataBar" priority="${priority}"><dataBar${showValueAttr}>${serializeCfvo(rule.min)}${serializeCfvo(rule.max)}<color ${serializeColorAttributes(readableLegacyDataBarColor(rule))}/></dataBar></cfRule>`;

  if (!needsExtendedDataBar(rule)) {
    return { basic, extended: "" };
  }

  const guid = `{00000000-0000-0000-0000-${String(priority).padStart(12, "0")}}`;

  const extParts: string[] = [];
  extParts.push(`<x14:cfRule type="dataBar" id="${guid}">`);
  extParts.push(`<x14:dataBar`);

  const extAttrs: string[] = [];
  if (rule.gradient === false) {
    extAttrs.push(` gradient="0"`);
  }
  if (rule.direction !== undefined) {
    extAttrs.push(` direction="${rule.direction}"`);
  }
  if (rule.axisPosition !== undefined && rule.axisPosition !== "automatic") {
    extAttrs.push(` axisPosition="${rule.axisPosition}"`);
  }
  extParts.push(extAttrs.join(""));
  extParts.push(">");

  extParts.push(serializeX14Cfvo(rule.min));
  extParts.push(serializeX14Cfvo(rule.max));

  if (rule.negativeColor !== undefined) {
    extParts.push(`<x14:negativeFillColor ${serializeColorAttributes(rule.negativeColor)}/>`);
  }

  if (rule.axisPosition !== "none") {
    extParts.push(`<x14:axisColor rgb="FF000000"/>`);
  }

  extParts.push("</x14:dataBar>");
  extParts.push("</x14:cfRule>");

  return { basic, extended: extParts.join("") };
}

function serializeX14Cfvo(cfvo: SpreadsheetCfvo): string {
  const valAttr = cfvo.value !== undefined ? `<xm:f>${cfvo.value}</xm:f>` : "";
  return `<x14:cfvo type="${cfvo.type}">${valAttr}</x14:cfvo>`;
}

const DEFAULT_THRESHOLDS: Record<number, number[]> = {
  3: [0, 33, 67],
  4: [0, 25, 50, 75],
  5: [0, 20, 40, 60, 80],
};

function serializeIconSet(rule: SpreadsheetConditionalFormattingIconSetRule, priority: number): string {
  const iconCount = parseInt(rule.iconSet[0], 10);

  const attrs: string[] = [`iconSet="${rule.iconSet}"`];
  if (rule.showValue === false) {
    attrs.push(`showValue="0"`);
  }
  if (rule.reverse === true) {
    attrs.push(`reverse="1"`);
  }

  let cfvos: string;
  if (rule.thresholds) {
    cfvos = rule.thresholds.map((t) => serializeCfvo(t)).join("");
  } else {
    const defaults = DEFAULT_THRESHOLDS[iconCount];
    cfvos = defaults.map((val) => `<cfvo type="percent" val="${val}"/>`).join("");
  }

  return `<cfRule type="iconSet" priority="${priority}"><iconSet ${attrs.join(" ")}>${cfvos}</iconSet></cfRule>`;
}

function serializeRule(
  rule: SpreadsheetConditionalFormattingRule,
  registry: StyleRegistry,
  priority: number,
): { basic: string; extended: string } {
  switch (rule.type) {
    case "cellIs":
      return { basic: serializeCellIs(rule, registry, priority), extended: "" };
    case "top10":
      return { basic: serializeTop10(rule, registry, priority), extended: "" };
    case "duplicateValues":
    case "uniqueValues":
      return { basic: serializeDuplicate(rule, registry, priority), extended: "" };
    case "colorScale":
      return { basic: serializeColorScale(rule, priority), extended: "" };
    case "dataBar":
      return serializeDataBar(rule, priority);
    case "iconSet":
      return { basic: serializeIconSet(rule, priority), extended: "" };
    default: {
      const _exhaustive: never = rule;
      void _exhaustive;
      return { basic: "", extended: "" };
    }
  }
}

export function serializeConditionalFormatting(
  rules: SpreadsheetConditionalFormatting[] | undefined,
  registry: StyleRegistry,
): ConditionalFormattingOutput {
  if (!rules || rules.length === 0) {
    return { xml: "", extLst: "" };
  }

  let priority = 1;
  const xmlParts: string[] = [];
  const extEntries: string[] = [];

  for (const entry of rules) {
    const ruleParts: string[] = [];
    for (const rule of entry.rules) {
      const result = serializeRule(rule, registry, priority);
      ruleParts.push(result.basic);
      if (result.extended) {
        extEntries.push(
          `<x14:conditionalFormatting xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">${result.extended}<xm:sqref>${entry.ref}</xm:sqref></x14:conditionalFormatting>`,
        );
      }
      priority += 1;
    }
    xmlParts.push(`<conditionalFormatting sqref="${entry.ref}">${ruleParts.join("")}</conditionalFormatting>`);
  }

  let extLst = "";
  if (extEntries.length > 0) {
    extLst = `<extLst><ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:conditionalFormattings>${extEntries.join("")}</x14:conditionalFormattings></ext></extLst>`;
  }

  return { xml: xmlParts.join(""), extLst };
}
