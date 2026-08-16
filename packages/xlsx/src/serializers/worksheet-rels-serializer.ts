import { escapeXml, XML_DECLARATION } from "../utils/xml.js";

export interface WorksheetRelationship {
  id: string;
  target: string;
  type: "hyperlink" | "table" | "vmlDrawing" | "comment" | "drawing" | "pivotTable";
}

const RELATIONSHIP_TYPE_URIS: Record<WorksheetRelationship["type"], string> = {
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  table: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table",
  vmlDrawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
  comment: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  drawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
  pivotTable: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotTable",
};

export function serializeWorksheetRelationships(relationships: WorksheetRelationship[]): string {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    ...relationships.map((relationship) => {
      const typeUri = RELATIONSHIP_TYPE_URIS[relationship.type];
      const targetMode = relationship.type === "hyperlink" ? ` TargetMode="External"` : "";
      return `<Relationship Id="${relationship.id}" Type="${typeUri}" Target="${escapeXml(relationship.target)}"${targetMode}/>`;
    }),
    `</Relationships>`,
  ].join("");
}
