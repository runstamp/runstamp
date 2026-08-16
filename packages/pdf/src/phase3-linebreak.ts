export interface PdfLineToken {
  breakPenalty?: number;
  characters?: Array<{ text: string; width: number }>;
  isSpace: boolean;
  mandatory: boolean;
  text: string;
  width: number;
}

export interface PdfBrokenLine {
  end: number;
  extraWordSpacing: number;
  spaceCount: number;
  start: number;
  text: string;
  width: number;
}

const DP_THRESHOLD = 1200;
const INF = Number.POSITIVE_INFINITY;

function effectiveLineEnd(tokens: PdfLineToken[], end: number): number {
  return tokens[end - 1]?.mandatory ? end - 1 : end;
}

function trimTokenRange(tokens: PdfLineToken[], start: number, end: number): { end: number; start: number } {
  let actualStart = start;
  let actualEnd = end;

  while (actualStart < actualEnd && tokens[actualStart]?.isSpace) {
    actualStart += 1;
  }
  while (actualEnd > actualStart && tokens[actualEnd - 1]?.isSpace) {
    actualEnd -= 1;
  }

  return { start: actualStart, end: actualEnd };
}

function trimTokenRangePreservingWhitespace(tokens: PdfLineToken[], start: number, end: number, preserveWhitespace: boolean): { end: number; start: number } {
  return preserveWhitespace ? { start, end } : trimTokenRange(tokens, start, end);
}

function lineStats(
  tokens: PdfLineToken[],
  start: number,
  end: number,
  preserveWhitespace = false,
): { spaceCount: number; text: string; width: number } {
  const trimmed = trimTokenRangePreservingWhitespace(tokens, start, end, preserveWhitespace);
  const slice = tokens.slice(trimmed.start, trimmed.end);
  return {
    text: slice.map((token) => token.text).join(""),
    width: slice.reduce((sum, token) => sum + token.width, 0),
    spaceCount: slice.filter((token) => token.isSpace).length,
  };
}

function greedyBreak(
  tokens: PdfLineToken[],
  maxWidth: number,
  textAlign: "justify" | "left",
  preserveWhitespace: boolean,
): PdfBrokenLine[] {
  const lines: PdfBrokenLine[] = [];
  let lineStart = 0;
  let index = 0;
  let currentWidth = 0;

  while (index < tokens.length) {
    const token = tokens[index] as PdfLineToken;
    const nextWidth = currentWidth + token.width;

    if (token.mandatory) {
      const stats = lineStats(tokens, lineStart, index, preserveWhitespace);
      lines.push({
        start: lineStart,
        end: index,
        extraWordSpacing: 0,
        spaceCount: stats.spaceCount,
        text: stats.text,
        width: stats.width,
      });
      lineStart = index + 1;
      index += 1;
      currentWidth = 0;
      continue;
    }

    if (currentWidth > 0 && nextWidth > maxWidth) {
      const stats = lineStats(tokens, lineStart, index, preserveWhitespace);
      const extraWordSpacing = textAlign === "justify" && stats.spaceCount > 0
        ? Math.max(0, (maxWidth - stats.width) / stats.spaceCount)
        : 0;
      lines.push({
        start: lineStart,
        end: index,
        extraWordSpacing,
        spaceCount: stats.spaceCount,
        text: stats.text,
        width: stats.width,
      });
      lineStart = index;
      currentWidth = 0;
      continue;
    }

    currentWidth = nextWidth;
    index += 1;
  }

  if (lineStart <= tokens.length) {
    const stats = lineStats(tokens, lineStart, tokens.length, preserveWhitespace);
    if (stats.text.length > 0 || lines.length === 0) {
      lines.push({
        start: lineStart,
        end: tokens.length,
        extraWordSpacing: 0,
        spaceCount: stats.spaceCount,
        text: stats.text,
        width: stats.width,
      });
    }
  }

  return lines;
}

function dynamicBreak(
  tokens: PdfLineToken[],
  maxWidth: number,
  textAlign: "justify" | "left",
  preserveWhitespace: boolean,
): PdfBrokenLine[] {
  const n = tokens.length;
  const cost = new Array<number>(n + 1).fill(INF);
  const nextBreak = new Array<number>(n + 1).fill(-1);
  cost[n] = 0;

  for (let start = n - 1; start >= 0; start -= 1) {
    if (tokens[start]?.mandatory) {
      cost[start] = cost[start + 1] ?? INF;
      nextBreak[start] = start + 1;
      continue;
    }

    let width = 0;
    for (let end = start + 1; end <= n; end += 1) {
      const token = tokens[end - 1] as PdfLineToken;
      if (token.mandatory) {
        const stats = lineStats(tokens, start, end - 1, preserveWhitespace);
        const slack = Math.max(0, maxWidth - stats.width);
        const lineCost = slack * slack;
        const totalCost = lineCost + (cost[end] ?? INF);
        if (totalCost <= cost[start]) {
          cost[start] = totalCost;
          nextBreak[start] = end;
        }
        break;
      }

      width += token.width;
      if (width > maxWidth && end > start + 1) {
        break;
      }

      const stats = lineStats(tokens, start, end, preserveWhitespace);
      if (stats.text.length === 0) {
        continue;
      }
      const isLastLine = end === n;
      const slack = Math.max(0, maxWidth - stats.width);
      const baseCost = isLastLine ? 0 : slack * slack;
      const justifyPenalty = textAlign === "justify" && !isLastLine && stats.spaceCount === 0 ? 5000 : 0;
      const breakPenalty = isLastLine ? 0 : (tokens[end - 1]?.breakPenalty ?? 0);
      const totalCost = baseCost + justifyPenalty + breakPenalty + (cost[end] ?? INF);
      if (totalCost < cost[start]) {
        cost[start] = totalCost;
        nextBreak[start] = end;
      }
    }
  }

  if (nextBreak[0] === -1) {
    return greedyBreak(tokens, maxWidth, textAlign, preserveWhitespace);
  }

  const lines: PdfBrokenLine[] = [];
  let cursor = 0;
  while (cursor < n) {
    const end = nextBreak[cursor];
    if (end === -1 || end <= cursor) {
      return greedyBreak(tokens, maxWidth, textAlign, preserveWhitespace);
    }
    const stats = lineStats(tokens, cursor, effectiveLineEnd(tokens, end), preserveWhitespace);
    const isLastLine = end === n;
    lines.push({
      start: cursor,
      end,
      extraWordSpacing: textAlign === "justify" && !isLastLine && stats.spaceCount > 0
        ? Math.max(0, (maxWidth - stats.width) / stats.spaceCount)
        : 0,
      spaceCount: stats.spaceCount,
      text: stats.text,
      width: stats.width,
    });
    cursor = end;
  }

  return lines;
}

export function breakTextIntoLines(
  tokens: PdfLineToken[],
  maxWidth: number,
  textAlign: "justify" | "left" = "left",
  options?: { preserveWhitespace?: boolean },
): PdfBrokenLine[] {
  const preserveWhitespace = options?.preserveWhitespace ?? false;
  if (tokens.length === 0) {
    return [{ start: 0, end: 0, extraWordSpacing: 0, spaceCount: 0, text: "", width: 0 }];
  }

  if (tokens.length > DP_THRESHOLD) {
    return greedyBreak(tokens, maxWidth, textAlign, preserveWhitespace);
  }

  return dynamicBreak(tokens, maxWidth, textAlign, preserveWhitespace);
}
