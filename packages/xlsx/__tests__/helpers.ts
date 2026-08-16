import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

export async function openZip(buffer: Buffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

export async function readZipEntry(buffer: Buffer, path: string): Promise<string> {
  const zip = await openZip(buffer);
  const file = zip.file(path);
  if (!file) {
    throw new Error(`Missing ZIP entry: ${path}`);
  }
  return file.async("string");
}

export async function parseZipXml(buffer: Buffer, path: string): Promise<any> {
  const xml = await readZipEntry(buffer, path);
  return xmlParser.parse(xml);
}
