import { XML_DECLARATION } from "../utils/xml.js";

const WORKSHEET_SECTION_ORDER = {
  sheetPr: 1,
  dimension: 2,
  sheetViews: 3,
  sheetFormatPr: 4,
  cols: 5,
  sheetData: 6,
  autoFilter: 11,
  sheetProtection: 13,
  mergeCells: 15,
  conditionalFormatting: 17,
  dataValidations: 18,
  hyperlinks: 19,
  printOptions: 20,
  pageMargins: 21,
  pageSetup: 22,
  rowBreaks: 23,
  drawing: 24,
  legacyDrawing: 25,
  tableParts: 26,
  pivotTableParts: 27,
  extLst: 28,
} as const;

const SHEET_DATA_POSITION = WORKSHEET_SECTION_ORDER.sheetData;

export class SheetXmlBuilder {
  private readonly sections = new Map<number, string[]>();

  constructor(private readonly rootAttributes: string[]) {}

  setSheetPr(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.sheetPr, xml);
  }

  setDimension(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.dimension, xml);
  }

  setSheetViews(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.sheetViews, xml);
  }

  setSheetFormatPr(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.sheetFormatPr, xml);
  }

  setCols(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.cols, xml);
  }

  setSheetData(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.sheetData, xml);
  }

  setAutoFilter(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.autoFilter, xml);
  }

  setSheetProtection(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.sheetProtection, xml);
  }

  setMergeCells(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.mergeCells, xml);
  }

  addConditionalFormatting(xml: string): void {
    this.add(WORKSHEET_SECTION_ORDER.conditionalFormatting, xml);
  }

  setDataValidations(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.dataValidations, xml);
  }

  setHyperlinks(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.hyperlinks, xml);
  }

  setPrintOptions(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.printOptions, xml);
  }

  setPageMargins(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.pageMargins, xml);
  }

  setPageSetup(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.pageSetup, xml);
  }

  setRowBreaks(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.rowBreaks, xml);
  }

  setTableParts(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.tableParts, xml);
  }

  setPivotTableParts(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.pivotTableParts, xml);
  }

  setExtLst(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.extLst, xml);
  }

  setLegacyDrawing(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.legacyDrawing, xml);
  }

  setDrawing(xml: string): void {
    this.set(WORKSHEET_SECTION_ORDER.drawing, xml);
  }

  build(): string {
    const parts = [
      XML_DECLARATION,
      `<worksheet ${this.rootAttributes.join(" ")}>`,
    ];

    for (const [, sectionParts] of [...this.sections.entries()].sort((left, right) => left[0] - right[0])) {
      parts.push(...sectionParts);
    }

    parts.push("</worksheet>");
    return parts.join("");
  }

  buildSheetDataEnvelope(): { prefix: string; suffix: string } {
    const prefix = [
      XML_DECLARATION,
      `<worksheet ${this.rootAttributes.join(" ")}>`,
    ];
    const suffix: string[] = [];

    for (const [position, sectionParts] of [...this.sections.entries()].sort((left, right) => left[0] - right[0])) {
      if (position < SHEET_DATA_POSITION) {
        prefix.push(...sectionParts);
        continue;
      }
      if (position > SHEET_DATA_POSITION) {
        suffix.push(...sectionParts);
      }
    }

    prefix.push("<sheetData>");
    suffix.unshift("</sheetData>");
    suffix.push("</worksheet>");

    return {
      prefix: prefix.join(""),
      suffix: suffix.join(""),
    };
  }

  private set(position: number, xml: string): void {
    if (!xml) {
      return;
    }
    this.sections.set(position, [xml]);
  }

  private add(position: number, xml: string): void {
    if (!xml) {
      return;
    }
    const section = this.sections.get(position) ?? [];
    section.push(xml);
    this.sections.set(position, section);
  }
}
