import type { ChartElement, ImageAsset, ImageElement } from '../types.js';
import { Errors } from '../errors.js';
import { generateChartSVG, renderChartToImage } from '../elements/charts/chart-image-generator.js';
import type { SerializationContext } from './context.js';
import { CONTENT_TYPES, NS, REL_TYPES } from './namespaces.js';
import { xmlElement } from './ordered-builder.js';
import type { XmlElement } from './types.js';
import { asEmu, type EMU } from '../utils/units.js';
import { createResourceLimitError } from './errors.js';

const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const MAX_IMAGE_DIMENSION_PIXELS = 25_000;

type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/bmp' | 'image/svg+xml';

interface ResolvedImageBytes {
  buffer: Buffer;
  mimeType: ImageMimeType;
  extension: 'png' | 'jpg' | 'gif' | 'bmp' | 'svg';
  pixelWidth: number;
  pixelHeight: number;
  dpiX: number;
  dpiY: number;
}

function readUInt16(buffer: Buffer, offset: number, littleEndian: boolean): number {
  return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
}

function readUInt32(buffer: Buffer, offset: number, littleEndian: boolean): number {
  return littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
}

function dataUriToBuffer(src: string): Buffer {
  const match = src.match(/^data:([^,]*),(.*)$/s);
  if (!match) {
    throw Errors.imageDecodeFailed(src);
  }
  try {
    return match[1].split(';').includes('base64')
      ? Buffer.from(match[2], 'base64')
      : Buffer.from(decodeURIComponent(match[2]), 'utf8');
  } catch {
    throw Errors.imageDecodeFailed(src);
  }
}

function chartRendererStringToBuffer(data: string): Buffer {
  const trimmed = data.trimStart();
  if (trimmed.startsWith('data:')) {
    return dataUriToBuffer(trimmed);
  }
  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    return Buffer.from(data, 'utf8');
  }
  return Buffer.from(data, 'base64');
}

function assetBuffer(asset?: ImageAsset): Buffer | undefined {
  if (!asset?.data) {
    return undefined;
  }
  return Buffer.from(asset.data);
}

function detectMimeTypeFromBytes(buffer: Buffer): ImageMimeType {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header === 'GIF87a' || header === 'GIF89a') {
      return 'image/gif';
    }
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }
  const prefix = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trimStart();
  if (prefix.startsWith('<svg') || prefix.startsWith('<?xml')) {
    return 'image/svg+xml';
  }
  throw Errors.imageDecodeFailed('unknown-image-buffer');
}

function pngDimensions(buffer: Buffer): { width: number; height: number; dpiX: number; dpiY: number } {
  if (buffer.length < 24) {
    throw Errors.imageDecodeFailed('png');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  let dpiX = PX_PER_INCH;
  let dpiY = PX_PER_INCH;
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'pHYs' && offset + 8 + length <= buffer.length && length >= 9) {
      const pixelsPerUnitX = buffer.readUInt32BE(offset + 8);
      const pixelsPerUnitY = buffer.readUInt32BE(offset + 12);
      const unitSpecifier = buffer[offset + 16];
      if (unitSpecifier === 1) {
        dpiX = Math.round(pixelsPerUnitX * 0.0254);
        dpiY = Math.round(pixelsPerUnitY * 0.0254);
      }
      break;
    }
    offset += 12 + length;
  }

  return { width, height, dpiX, dpiY };
}

function jpegDimensions(buffer: Buffer): { width: number; height: number; dpiX: number; dpiY: number } {
  let offset = 2;
  let dpiX = PX_PER_INCH;
  let dpiY = PX_PER_INCH;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (offset + 2 > buffer.length) {
      break;
    }

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) {
      throw Errors.imageDecodeFailed('jpeg');
    }

    if (marker === 0xe0 && length >= 14) {
      const identifier = buffer.subarray(offset + 2, offset + 7).toString('ascii');
      if (identifier === 'JFIF\0') {
        const units = buffer[offset + 9];
        const xDensity = buffer.readUInt16BE(offset + 10);
        const yDensity = buffer.readUInt16BE(offset + 12);
        if (units === 1) {
          dpiX = xDensity;
          dpiY = yDensity;
        } else if (units === 2) {
          dpiX = Math.round(xDensity * 2.54);
          dpiY = Math.round(yDensity * 2.54);
        }
      }
    }

    if (marker === 0xe1 && length >= 12) {
      const identifier = buffer.subarray(offset + 2, offset + 8).toString('ascii');
      if (identifier === 'Exif\0\0') {
        const tiffOffset = offset + 8;
        const littleEndian = buffer.subarray(tiffOffset, tiffOffset + 2).toString('ascii') === 'II';
        const ifdOffset = readUInt32(buffer, tiffOffset + 4, littleEndian);
        const directoryOffset = tiffOffset + ifdOffset;
        if (directoryOffset + 2 <= buffer.length) {
          const count = readUInt16(buffer, directoryOffset, littleEndian);
          for (let index = 0; index < count; index += 1) {
            const entryOffset = directoryOffset + 2 + (index * 12);
            if (entryOffset + 12 > buffer.length) {
              break;
            }
            const tag = readUInt16(buffer, entryOffset, littleEndian);
            const valueOffset = readUInt32(buffer, entryOffset + 8, littleEndian);
            if ((tag === 0x011a || tag === 0x011b) && tiffOffset + valueOffset + 8 <= buffer.length) {
              const numerator = readUInt32(buffer, tiffOffset + valueOffset, littleEndian);
              const denominator = readUInt32(buffer, tiffOffset + valueOffset + 4, littleEndian);
              const value = denominator !== 0 ? Math.round(numerator / denominator) : PX_PER_INCH;
              if (tag === 0x011a) dpiX = value;
              if (tag === 0x011b) dpiY = value;
            }
            if (tag === 0x0128) {
              const unit = valueOffset & 0xffff;
              if (unit === 3) {
                dpiX = Math.round(dpiX * 2.54);
                dpiY = Math.round(dpiY * 2.54);
              }
            }
          }
        }
      }
    }

    if (
      (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf)
    ) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return { width, height, dpiX, dpiY };
    }

    offset += length;
  }

  throw Errors.imageDecodeFailed('jpeg');
}

function gifDimensions(buffer: Buffer): { width: number; height: number; dpiX: number; dpiY: number } {
  if (buffer.length < 10) {
    throw Errors.imageDecodeFailed('gif');
  }
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
    dpiX: PX_PER_INCH,
    dpiY: PX_PER_INCH,
  };
}

function bmpDimensions(buffer: Buffer): { width: number; height: number; dpiX: number; dpiY: number } {
  if (buffer.length < 38) {
    throw Errors.imageDecodeFailed('bmp');
  }
  const width = Math.abs(buffer.readInt32LE(18));
  const height = Math.abs(buffer.readInt32LE(22));
  const ppmX = buffer.readInt32LE(38);
  const ppmY = buffer.readInt32LE(42);
  return {
    width,
    height,
    dpiX: ppmX > 0 ? Math.round(ppmX * 0.0254) : PX_PER_INCH,
    dpiY: ppmY > 0 ? Math.round(ppmY * 0.0254) : PX_PER_INCH,
  };
}

function svgDimensions(buffer: Buffer): { width: number; height: number; dpiX: number; dpiY: number } {
  const svg = buffer.toString('utf8');
  const widthMatch = svg.match(/\bwidth="([0-9.]+)(px)?"/i);
  const heightMatch = svg.match(/\bheight="([0-9.]+)(px)?"/i);
  if (widthMatch && heightMatch) {
    return {
      width: Math.max(1, Math.round(Number(widthMatch[1]))),
      height: Math.max(1, Math.round(Number(heightMatch[1]))),
      dpiX: PX_PER_INCH,
      dpiY: PX_PER_INCH,
    };
  }
  const viewBoxMatch = svg.match(/\bviewBox="([0-9.\s-]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      return {
        width: Math.max(1, Math.round(parts[2])),
        height: Math.max(1, Math.round(parts[3])),
        dpiX: PX_PER_INCH,
        dpiY: PX_PER_INCH,
      };
    }
  }
  throw Errors.imageDecodeFailed('svg');
}

function describeImageBuffer(buffer: Buffer, mimeType: ImageMimeType): ResolvedImageBytes {
  if (buffer.length === 0) {
    throw Errors.imageDecodeFailed('empty-image-buffer');
  }

  switch (mimeType) {
    case 'image/png': {
      const { width, height, dpiX, dpiY } = pngDimensions(buffer);
      return { buffer, mimeType, extension: 'png', pixelWidth: width, pixelHeight: height, dpiX, dpiY };
    }
    case 'image/jpeg': {
      const { width, height, dpiX, dpiY } = jpegDimensions(buffer);
      return { buffer, mimeType, extension: 'jpg', pixelWidth: width, pixelHeight: height, dpiX, dpiY };
    }
    case 'image/gif': {
      const { width, height, dpiX, dpiY } = gifDimensions(buffer);
      return { buffer, mimeType, extension: 'gif', pixelWidth: width, pixelHeight: height, dpiX, dpiY };
    }
    case 'image/bmp': {
      const { width, height, dpiX, dpiY } = bmpDimensions(buffer);
      return { buffer, mimeType, extension: 'bmp', pixelWidth: width, pixelHeight: height, dpiX, dpiY };
    }
    case 'image/svg+xml': {
      const { width, height, dpiX, dpiY } = svgDimensions(buffer);
      return { buffer, mimeType, extension: 'svg', pixelWidth: width, pixelHeight: height, dpiX, dpiY };
    }
  }
}

async function resolveImageBuffer(context: SerializationContext, element: ImageElement): Promise<ResolvedImageBytes> {
  const asset = element.assetId ? context.document.assets.images.get(element.assetId) : undefined;
  let buffer: Buffer | undefined;
  const isExternalSource = /^https?:\/\//.test(element.src) || element.src.startsWith('//');

  if (asset) {
    buffer = assetBuffer(asset);
    if (!buffer && asset.src.startsWith('data:')) {
      buffer = dataUriToBuffer(asset.src);
    }
  } else if (element.binaryData) {
    buffer = Buffer.from(element.binaryData);
  } else if (element.src.startsWith('data:')) {
    buffer = dataUriToBuffer(element.src);
  }

  if (!buffer) {
    const { prepareImageAsync } = await import('../elements/images/extractor.js');
    const allowExternal = context.options.imageFetch?.allowExternal === true
      && !context.deterministicExternalFetchDisabled;
    const fetchLease = isExternalSource && allowExternal
      ? context.acquireExternalImageFetch(element.src)
      : undefined;
    const releaseFetchSlot = fetchLease?.release;
    let fetchedBytes = 0;
    try {
      const prepared = await prepareImageAsync({
        id: element.id,
        src: element.src,
        width: element.naturalWidth ?? element.position.width,
        height: element.naturalHeight ?? element.position.height,
        alt: element.alt,
        position: 'inline',
        alignment: 'left',
        type: 'png',
        isDataUri: element.src.startsWith('data:'),
        isExternalUrl: isExternalSource,
        needsConversion: false,
        decorative: element.decorative,
      }, {
        ...context.options.imageFetch,
        allowExternal,
        timeout: Math.min(
          context.options.imageFetch?.timeout ?? 10_000,
          fetchLease?.remainingTimeMs ?? Number.POSITIVE_INFINITY,
        ),
        maxSize: Math.min(
          context.limits.maxImageSizeBytes,
          fetchLease?.remainingBytes ?? Number.POSITIVE_INFINITY,
        ),
      }, {
        totalTimeoutMs: fetchLease?.remainingTimeMs,
      });
      fetchedBytes = prepared.fetchedBytes ?? prepared.buffer?.length ?? 0;

      if (!prepared.buffer) {
        throw prepared.error
          ? Errors.imageFetchFailed(element.src, prepared.error)
          : Errors.imageDecodeFailed(element.src);
      }
      buffer = prepared.buffer;
    } finally {
      releaseFetchSlot?.(fetchedBytes);
    }
  }

  if (buffer.length > context.limits.maxImageSizeBytes) {
    throw Errors.imageTooLarge(element.src, buffer.length, context.limits.maxImageSizeBytes);
  }

  const mimeType = detectMimeTypeFromBytes(buffer);
  const resolved = describeImageBuffer(buffer, mimeType);
  const largestDimension = Math.max(resolved.pixelWidth, resolved.pixelHeight);
  if (largestDimension > MAX_IMAGE_DIMENSION_PIXELS) {
    throw createResourceLimitError(
      'maxImageDimensionPixels',
      largestDimension,
      MAX_IMAGE_DIMENSION_PIXELS,
    );
  }
  return resolved;
}

function pxToEmuWithDpi(px: number, dpi: number): EMU {
  return asEmu(Math.round((px / Math.max(1, dpi)) * EMU_PER_INCH));
}

function positiveNumber(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
}

function renderedImageExtent(element: ImageElement, bytes: ResolvedImageBytes): { widthEmu: EMU; heightEmu: EMU } {
  const layoutWidth = positiveNumber(element.position.width);
  const layoutHeight = positiveNumber(element.position.height);
  if (layoutWidth !== undefined && layoutHeight !== undefined) {
    return {
      widthEmu: pxToEmuWithDpi(layoutWidth, PX_PER_INCH),
      heightEmu: pxToEmuWithDpi(layoutHeight, PX_PER_INCH),
    };
  }

  const naturalWidth = positiveNumber(element.naturalWidth);
  const naturalHeight = positiveNumber(element.naturalHeight);
  const targetWidth = naturalWidth ?? bytes.pixelWidth;
  const targetHeight = naturalHeight ?? bytes.pixelHeight;
  return {
    widthEmu: pxToEmuWithDpi(targetWidth, bytes.dpiX),
    heightEmu: pxToEmuWithDpi(targetHeight, bytes.dpiY),
  };
}

function createPictureGraphic(relationshipId: string, widthEmu: EMU, heightEmu: EMU, docPrId: number): XmlElement {
  const picturePropertiesId = docPrId + 1;
  return xmlElement('a:graphic', { 'xmlns:a': NS.drawingMl }, [
    xmlElement('a:graphicData', { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' }, [
      xmlElement('pic:pic', { 'xmlns:pic': NS.picture }, [
        xmlElement('pic:nvPicPr', undefined, [
          xmlElement('pic:cNvPr', {
            id: String(picturePropertiesId),
            name: `Picture ${picturePropertiesId}`,
          }),
          xmlElement('pic:cNvPicPr'),
        ]),
        xmlElement('pic:blipFill', undefined, [
          xmlElement('a:blip', { 'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'r:embed': relationshipId }),
          xmlElement('a:stretch', undefined, [xmlElement('a:fillRect')]),
        ]),
        xmlElement('pic:spPr', undefined, [
          xmlElement('a:xfrm', undefined, [
            xmlElement('a:off', { x: '0', y: '0' }),
            xmlElement('a:ext', { cx: String(widthEmu), cy: String(heightEmu) }),
          ]),
          xmlElement('a:prstGeom', { prst: 'rect' }, [xmlElement('a:avLst')]),
        ]),
      ]),
    ]),
  ]);
}

function createInlineDrawing(relationshipId: string, widthEmu: EMU, heightEmu: EMU, altText: string, docPrId: number): XmlElement {
  return xmlElement('w:drawing', undefined, [
    xmlElement('wp:inline', {
      'xmlns:wp': NS.wordprocessingDrawing,
      distT: '0',
      distB: '0',
      distL: '0',
      distR: '0',
    }, [
      xmlElement('wp:extent', { cx: String(widthEmu), cy: String(heightEmu) }),
      xmlElement('wp:effectExtent', { l: '0', t: '0', r: '0', b: '0' }),
      xmlElement('wp:docPr', {
        id: String(docPrId),
        name: `Picture ${docPrId}`,
        descr: altText,
      }),
      xmlElement('wp:cNvGraphicFramePr', undefined, [
        xmlElement('a:graphicFrameLocks', { 'xmlns:a': NS.drawingMl, noChangeAspect: '1' }),
      ]),
      createPictureGraphic(relationshipId, widthEmu, heightEmu, docPrId),
    ]),
  ]);
}

function createFloatingDrawing(
  relationshipId: string,
  widthEmu: EMU,
  heightEmu: EMU,
  altText: string,
  docPrId: number,
  element: ImageElement,
): XmlElement {
  const horizontal = element.dataAttributes['docx-horizontal'] ?? 'left';
  const vertical = element.dataAttributes['docx-vertical'] ?? 'top';
  const wrap = element.dataAttributes['docx-wrap'] ?? 'square';

  const wrapElement =
    wrap === 'topAndBottom'
      ? xmlElement('wp:wrapTopAndBottom')
      : wrap === 'tight'
        ? xmlElement('wp:wrapTight', { wrapText: 'bothSides' }, [
            xmlElement('wp:wrapPolygon', { edited: '0' }, [
              xmlElement('wp:start', { x: '0', y: '0' }),
              xmlElement('wp:lineTo', { x: '0', y: '21600' }),
              xmlElement('wp:lineTo', { x: '21600', y: '21600' }),
              xmlElement('wp:lineTo', { x: '21600', y: '0' }),
              xmlElement('wp:lineTo', { x: '0', y: '0' }),
            ]),
          ])
        : wrap === 'behind' || wrap === 'inFront'
          ? xmlElement('wp:wrapNone')
          : xmlElement('wp:wrapSquare', { wrapText: 'bothSides' });

  return xmlElement('w:drawing', undefined, [
    xmlElement('wp:anchor', {
      'xmlns:wp': NS.wordprocessingDrawing,
      distT: '0',
      distB: '0',
      distL: '114300',
      distR: '114300',
      simplePos: '0',
      relativeHeight: '251658240',
      behindDoc: wrap === 'behind' ? '1' : '0',
      locked: '0',
      layoutInCell: '1',
      allowOverlap: '1',
    }, [
      xmlElement('wp:simplePos', { x: '0', y: '0' }),
      xmlElement('wp:positionH', { relativeFrom: 'column' }, [
        xmlElement('wp:align', undefined, [{ kind: 'text', value: horizontal }]),
      ]),
      xmlElement('wp:positionV', { relativeFrom: 'paragraph' }, [
        xmlElement('wp:align', undefined, [{ kind: 'text', value: vertical }]),
      ]),
      xmlElement('wp:extent', { cx: String(widthEmu), cy: String(heightEmu) }),
      xmlElement('wp:effectExtent', { l: '0', t: '0', r: '0', b: '0' }),
      wrapElement,
      xmlElement('wp:docPr', {
        id: String(docPrId),
        name: `Picture ${docPrId}`,
        descr: altText,
      }),
      xmlElement('wp:cNvGraphicFramePr', undefined, [
        xmlElement('a:graphicFrameLocks', { 'xmlns:a': NS.drawingMl, noChangeAspect: '1' }),
      ]),
      createPictureGraphic(relationshipId, widthEmu, heightEmu, docPrId),
    ]),
  ]);
}

async function registerMediaPart(
  context: SerializationContext,
  bytes: ResolvedImageBytes,
): Promise<{ relationshipId: string }> {
  const relationshipId = context.deterministic.nextRelationshipId();
  const sequence = context.deterministic.nextId('media');
  const filename = `image${String(sequence).padStart(3, '0')}.${bytes.extension}`;
  const path = `word/media/${filename}`;
  context.addMediaPart({
    path,
    filename,
    relationshipId,
    contentType: bytes.mimeType,
    extension: bytes.extension,
    buffer: bytes.buffer,
  });
  context.contentTypes.registerDefault(bytes.extension, CONTENT_TYPES[bytes.extension] ?? bytes.mimeType);
  context.activeRelationships.add(relationshipId, REL_TYPES.image, `media/${filename}`);
  return { relationshipId };
}

export async function buildImageRunElement(context: SerializationContext, element: ImageElement): Promise<XmlElement> {
  const bytes = await resolveImageBuffer(context, element);
  const { relationshipId } = await registerMediaPart(context, bytes);
  const docPrId = context.deterministic.nextId('docPr');
  const altText = element.decorative ? '' : element.alt;

  if (!element.decorative && !altText.trim()) {
    context.recordWarning(`Image "${element.id}" is missing alt text.`);
  }

  const { widthEmu, heightEmu } = renderedImageExtent(element, bytes);
  const positioning = element.dataAttributes['docx-position'] === 'floating' ? 'floating' : 'inline';

  return positioning === 'floating'
    ? createFloatingDrawing(relationshipId, widthEmu, heightEmu, altText, docPrId, element)
    : createInlineDrawing(relationshipId, widthEmu, heightEmu, altText, docPrId);
}

export async function buildChartImageRunElement(context: SerializationContext, element: ChartElement): Promise<XmlElement> {
  if (element.series.length === 0) {
    throw Errors.chartNoData(element.id);
  }

  const rendered = await renderChartToImage(element);
  const chartBuffer = rendered
    ? {
        buffer: Buffer.isBuffer(rendered.data) ? rendered.data : chartRendererStringToBuffer(rendered.data),
        mimeType: rendered.format === 'jpg' ? 'image/jpeg' : rendered.format === 'png' ? 'image/png' : rendered.format === 'gif' ? 'image/gif' : 'image/svg+xml',
        extension: rendered.format === 'jpg' ? 'jpg' : rendered.format === 'png' ? 'png' : rendered.format === 'gif' ? 'gif' : 'svg',
        pixelWidth: rendered.width,
        pixelHeight: rendered.height,
        dpiX: PX_PER_INCH,
        dpiY: PX_PER_INCH,
      } satisfies ResolvedImageBytes
    : describeImageBuffer(Buffer.from(generateChartSVG(element, {
        width: Math.max(1, Math.round(element.position.width)),
        height: Math.max(1, Math.round(element.position.height)),
      }), 'utf8'), 'image/svg+xml');

  const { relationshipId } = await registerMediaPart(context, chartBuffer);
  const docPrId = context.deterministic.nextId('docPr');
  const altText = element.title || `Chart ${element.id}`;
  const widthEmu = pxToEmuWithDpi(chartBuffer.pixelWidth, chartBuffer.dpiX);
  const heightEmu = pxToEmuWithDpi(chartBuffer.pixelHeight, chartBuffer.dpiY);
  return createInlineDrawing(relationshipId, widthEmu, heightEmu, altText, docPrId);
}
