import type { Canvas, SKRSContext2D } from "@napi-rs/canvas";
import jpeg from "jpeg-js";
import type { LayoutNode } from "../layout/extract.js";
import type { ThemeColorScheme } from "../types/ast.js";
import { FETCH_TIMEOUT_MS, validateDataUrlSize } from "../ooxml/constants.js";
import { fetchWithRetry } from "../fetchRetry.js";
import { validateFetchUrl } from "../ooxml/urlGuard.js";

export async function paintCharts(
  canvas: Canvas,
  slideNode: LayoutNode,
  loadImage: (src: Buffer | string) => Promise<any>,
  themeColors?: ThemeColorScheme,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  const scaleX = canvas.width / slideNode.layout.width;
  const scaleY = canvas.height / slideNode.layout.height;
  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  await paintChartsRecursive(ctx, slideNode, loadImage, themeColors);

  ctx.restore();
}

async function paintChartsRecursive(
  ctx: SKRSContext2D,
  node: LayoutNode,
  loadImage: (src: Buffer | string) => Promise<any>,
  themeColors?: ThemeColorScheme,
): Promise<void> {
  if (node.type === "Chart") {
    const { x, y, width, height } = node.layout;
    if (node.chartData && width > 0 && height > 0) {
      try {
        const { rasterizeChart } = await import("../ooxml/chart/rasterizer.js");
        const pngBuffer = await rasterizeChart(
          node.chartData,
          { width, height, renderer: "echarts" },
          themeColors,
        );
        if (pngBuffer) {
          const image = await loadImage(pngBuffer);
          ctx.drawImage(image, x, y, width, height);
        }
      } catch {
        // Keep placeholder
      }
    }
  }

  if (node.children) {
    for (const child of node.children) {
      await paintChartsRecursive(ctx, child, loadImage, themeColors);
    }
  }
}

export async function paintImages(
  canvas: Canvas,
  slideNode: LayoutNode,
  loadImage: (src: Buffer | string) => Promise<any>,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  const scaleX = canvas.width / slideNode.layout.width;
  const scaleY = canvas.height / slideNode.layout.height;
  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  await paintImagesRecursive(ctx, slideNode, loadImage);

  ctx.restore();
}

async function paintImagesRecursive(
  ctx: SKRSContext2D,
  node: LayoutNode,
  loadImage: (src: Buffer | string) => Promise<any>,
): Promise<void> {
  if (node.type === "Image") {
    const { x, y, width, height } = node.layout;
    if (node.src) {
      try {
        let imageInput: Buffer | string;
        let mimeType: string | undefined;
        if (node.src.startsWith("data:")) {
          const commaIdx = node.src.indexOf(",");
          mimeType = node.src.slice(5, commaIdx).split(";")[0]?.toLowerCase();
          const base64 = node.src.slice(commaIdx + 1);
          validateDataUrlSize(base64);
          imageInput = Buffer.from(base64, "base64");
        } else if (node.src.startsWith("http://") || node.src.startsWith("https://")) {
          validateFetchUrl(node.src);
          const response = await fetchWithRetry(node.src, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
          if (!response.ok) {
            return;
          }
          mimeType = response.headers.get("content-type")?.toLowerCase() ?? undefined;
          imageInput = Buffer.from(await response.arrayBuffer());
        } else {
          return;
        }

        if (imageInput instanceof Buffer && looksLikeJpeg(imageInput, mimeType)) {
          try {
            jpeg.decode(imageInput, { useTArray: true });
          } catch {
            // Keep the placeholder for corrupted JPEGs instead of letting
            // @napi-rs/canvas crash the process while decoding them.
            return;
          }
        }

        const image = await loadImage(imageInput);
        ctx.save();

        if (node.borderRadius) {
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, node.borderRadius);
          ctx.clip();
        }

        ctx.drawImage(image, x, y, width, height);
        ctx.restore();
      } catch {
        // Keep placeholder
      }
    }
  }

  if (node.children) {
    for (const child of node.children) {
      await paintImagesRecursive(ctx, child, loadImage);
    }
  }
}

function looksLikeJpeg(buffer: Buffer, mimeType?: string): boolean {
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) {
    return true;
  }

  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}
