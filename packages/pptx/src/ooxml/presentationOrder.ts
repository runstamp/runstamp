const PRESENTATION_CHILD_ORDER = [
  "p:sldMasterIdLst",
  "p:notesMasterIdLst",
  "p:handoutMasterIdLst",
  "p:sldIdLst",
  "p:sldSz",
  "p:notesSz",
  "p:smartTags",
  "p:embeddedFontLst",
  "p:custShowLst",
  "p:photoAlbum",
  "p:custDataLst",
  "p:kinsoku",
  "p:defaultTextStyle",
  "p:modifyVerifier",
  "p:extLst",
] as const;

type XmlNodeObject = Record<string, unknown>;

export { PRESENTATION_CHILD_ORDER };

export function normalizePresentationChildOrder<T extends XmlNodeObject>(presentation: T): T {
  const attributeEntries = Object.entries(presentation).filter(([key]) => key.startsWith("@_"));
  const textEntries = Object.entries(presentation).filter(([key]) => key === "#text");
  const elementEntries = Object.entries(presentation).filter(
    ([key]) => !key.startsWith("@_") && key !== "#text",
  );

  const orderedElementEntries: Array<[string, unknown]> = [];
  const seen = new Set<string>();

  for (const key of PRESENTATION_CHILD_ORDER) {
    const entry = elementEntries.find(([entryKey]) => entryKey === key);
    if (entry) {
      orderedElementEntries.push(entry);
      seen.add(key);
    }
  }

  const remainingEntries = elementEntries.filter(([key]) => !seen.has(key));

  return Object.fromEntries([
    ...attributeEntries,
    ...orderedElementEntries,
    ...remainingEntries,
    ...textEntries,
  ]) as T;
}
