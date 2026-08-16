// src/ooxml/relationships.ts
import { computePresSlideRId, computePresNotesMasterRId, computePresCommentsRId, computePresHandoutMasterRId } from "./rIdCalc.js";
import { generateRelationshipsXml, type PackageRelationship } from "./packageManifest.js";

const REL_TYPES = {
  officeDocument: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  coreProperties: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
  extendedProperties: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
  thumbnail: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail",
  customProperties: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties",
  slideMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  presProps: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",
  viewProps: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",
  tableStyles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",
  notesMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
  commentAuthors: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
  handoutMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster",
} as const;

// Generates /_rels/.rels
export function generateGlobalRels(includeDocProps: boolean = false, includeCustomProps: boolean = false): string {
  const rels: PackageRelationship[] = [
    { id: "rId1", type: REL_TYPES.officeDocument, target: "ppt/presentation.xml" },
  ];

  if (includeDocProps) {
    rels.push(
      { id: "rId2", type: REL_TYPES.coreProperties, target: "docProps/core.xml" },
      { id: "rId3", type: REL_TYPES.extendedProperties, target: "docProps/app.xml" },
      { id: "rId5", type: REL_TYPES.thumbnail, target: "docProps/thumbnail.jpeg" },
    );
  }

  if (includeCustomProps) {
    rels.push({ id: "rId4", type: REL_TYPES.customProperties, target: "docProps/custom.xml" });
  }

  return generateRelationshipsXml(rels);
}

// Generates /ppt/_rels/presentation.xml.rels
export function generatePresentationRels(
  slideCount: number = 1,
  hasNotes: boolean = false,
  hasComments: boolean = false,
  extraRels?: Array<{ rId: string; type: string; target: string }>,
  hasHandoutMaster: boolean = false,
): string {
  const rels: PackageRelationship[] = [
    { id: "rId1", type: REL_TYPES.slideMaster, target: "slideMasters/slideMaster1.xml" },
    { id: "rId2", type: REL_TYPES.theme, target: "theme/theme1.xml" },
  ];

  // Dynamic slide relationships (IDs must start after the core elements)
  for (let i = 1; i <= slideCount; i++) {
    const rId = computePresSlideRId(1, i); // rId1=master, rId2=theme, rId(2+i)=slide i
    rels.push({ id: `rId${rId}`, type: REL_TYPES.slide, target: `slides/slide${i}.xml` });
  }

  // Package-level parts (presProps, viewProps, tableStyles follow last slide rId)
  let nextRId = computePresSlideRId(1, slideCount) + 1;
  rels.push(
    { id: `rId${nextRId++}`, type: REL_TYPES.presProps, target: "presProps.xml" },
    { id: `rId${nextRId++}`, type: REL_TYPES.viewProps, target: "viewProps.xml" },
    { id: `rId${nextRId++}`, type: REL_TYPES.tableStyles, target: "tableStyles.xml" },
  );

  // Notes master (if any slide has notes)
  if (hasNotes) {
    const notesRId = computePresNotesMasterRId(1, slideCount);
    rels.push({ id: `rId${notesRId}`, type: REL_TYPES.notesMaster, target: "notesMasters/notesMaster1.xml" });
    nextRId = notesRId + 1;
  }

  // Comment authors
  if (hasComments) {
    const commentsRId = computePresCommentsRId(1, slideCount, hasNotes);
    rels.push({ id: `rId${commentsRId}`, type: REL_TYPES.commentAuthors, target: "commentAuthors.xml" });
    nextRId = commentsRId + 1;
  }

  // Handout master
  if (hasHandoutMaster) {
    const handoutRId = computePresHandoutMasterRId(1, slideCount, hasNotes, hasComments);
    rels.push({ id: `rId${handoutRId}`, type: REL_TYPES.handoutMaster, target: "handoutMasters/handoutMaster1.xml" });
    nextRId = handoutRId + 1;
  }

  // Extra rels (font embedding, etc.)
  if (extraRels) {
    for (const rel of extraRels) {
      rels.push({ id: rel.rId, type: rel.type, target: rel.target });
      nextRId++;
    }
  }

  return generateRelationshipsXml(rels);
}
