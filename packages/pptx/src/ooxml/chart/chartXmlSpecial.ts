import type { ChartData } from "../../types/ast.js";
import { escapeXml } from "../drawing/textUtils.js";
import { toHex } from "../drawing/math.js";
import {
  CAT_AX_ID,
  DEFAULT_COLORS,
  VAL_AX_ID,
} from "./chartXmlShared.js";
import { normalizeWaterfallData } from "./waterfallCompat.js";

export function generateWaterfallChart(chartData: ChartData): string {
  const wd = normalizeWaterfallData(chartData);
  if (!wd) return "";

  const categories = wd.categories;
  const values = wd.values;
  const totalIndices = new Set(wd.totalIndices ?? []);
  const increaseColor = toHex(wd.increaseColor ?? "#4472C4");
  const decreaseColor = toHex(wd.decreaseColor ?? "#ED7D31");
  const totalColor = toHex(wd.totalColor ?? "#A9D18E");

  const baseValues: number[] = [];
  const increaseValues: number[] = [];
  const decreaseValues: number[] = [];

  let runningTotal = 0;
  for (let index = 0; index < values.length; index++) {
    if (totalIndices.has(index)) {
      baseValues.push(0);
      increaseValues.push(values[index]);
      decreaseValues.push(0);
      runningTotal = values[index];
    } else {
      const value = values[index];
      if (value >= 0) {
        baseValues.push(runningTotal);
        increaseValues.push(value);
        decreaseValues.push(0);
      } else {
        baseValues.push(runningTotal + value);
        increaseValues.push(0);
        decreaseValues.push(-value);
      }
      runningTotal += value;
    }
  }

  let xml = `      <c:barChart>\n`;
  xml += `        <c:barDir val="col"/>\n`;
  xml += `        <c:grouping val="stacked"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  xml += `        <c:ser>\n`;
  xml += `          <c:idx val="0"/>\n`;
  xml += `          <c:order val="0"/>\n`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Base</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
  xml += `          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>\n`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${baseValues[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>\n`;
  xml += `        </c:ser>\n`;

  xml += `        <c:ser>\n`;
  xml += `          <c:idx val="1"/>\n`;
  xml += `          <c:order val="1"/>\n`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Increase</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
  xml += `          <c:spPr><a:solidFill><a:srgbClr val="${increaseColor}"/></a:solidFill></c:spPr>\n`;
  for (let index = 0; index < categories.length; index++) {
    if (totalIndices.has(index)) {
      xml += `          <c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${totalColor}"/></a:solidFill></c:spPr></c:dPt>\n`;
    }
  }
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>\n`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$C$2:$C$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    const value = totalIndices.has(index) ? values[index] : increaseValues[index];
    xml += `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>\n`;
  xml += `        </c:ser>\n`;

  xml += `        <c:ser>\n`;
  xml += `          <c:idx val="2"/>\n`;
  xml += `          <c:order val="2"/>\n`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$D$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Decrease</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
  xml += `          <c:spPr><a:solidFill><a:srgbClr val="${decreaseColor}"/></a:solidFill></c:spPr>\n`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>\n`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$D$2:$D$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${decreaseValues[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>\n`;
  xml += `        </c:ser>\n`;

  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:barChart>\n`;
  return xml;
}

export function generateStockChart(chartData: ChartData): string {
  const sd = chartData.stockData;
  if (!sd) return "";

  const categories = sd.categories;
  const hiLowLines = sd.hiLowLines !== false;
  const upDownBars = sd.upDownBars !== false;

  let xml = `      <c:stockChart>\n`;
  const seriesData = [
    { name: "Open", values: sd.open, col: "B" },
    { name: "High", values: sd.high, col: "C" },
    { name: "Low", values: sd.low, col: "D" },
    { name: "Close", values: sd.close, col: "E" },
  ];

  for (let index = 0; index < seriesData.length; index++) {
    const series = seriesData[index];
    xml += `        <c:ser>\n`;
    xml += `          <c:idx val="${index}"/>\n`;
    xml += `          <c:order val="${index}"/>\n`;
    xml += `          <c:tx><c:strRef><c:f>Sheet1!$${series.col}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
    xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
    for (let pointIndex = 0; pointIndex < categories.length; pointIndex++) {
      xml += `<c:pt idx="${pointIndex}"><c:v>${escapeXml(categories[pointIndex])}</c:v></c:pt>`;
    }
    xml += `</c:strCache></c:strRef></c:cat>\n`;
    xml += `          <c:val><c:numRef><c:f>Sheet1!$${series.col}$2:$${series.col}$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
    for (let pointIndex = 0; pointIndex < series.values.length; pointIndex++) {
      xml += `<c:pt idx="${pointIndex}"><c:v>${series.values[pointIndex]}</c:v></c:pt>`;
    }
    xml += `</c:numCache></c:numRef></c:val>\n`;
    xml += `        </c:ser>\n`;
  }

  if (hiLowLines) {
    xml += `        <c:hiLowLines/>\n`;
  }
  if (upDownBars) {
    const upColor = toHex(sd.upColor ?? "#FFFFFF");
    const downColor = toHex(sd.downColor ?? "#000000");
    xml += `        <c:upDownBars>\n`;
    xml += `          <c:gapWidth val="150"/>\n`;
    xml += `          <c:upBars><c:spPr><a:solidFill><a:srgbClr val="${upColor}"/></a:solidFill></c:spPr></c:upBars>\n`;
    xml += `          <c:downBars><c:spPr><a:solidFill><a:srgbClr val="${downColor}"/></a:solidFill></c:spPr></c:downBars>\n`;
    xml += `        </c:upDownBars>\n`;
  }

  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:stockChart>\n`;
  return xml;
}

export function generateFunnelChart(chartData: ChartData): string {
  const fd = chartData.funnelData;
  if (!fd) return "";

  const categories = fd.categories;
  const values = fd.values;
  const maxValue = Math.max(...values);
  const leftSpacers: number[] = [];
  const rightSpacers: number[] = [];
  for (let index = 0; index < values.length; index++) {
    const spacer = (maxValue - values[index]) / 2;
    leftSpacers.push(spacer);
    rightSpacers.push(spacer);
  }

  let xml = `      <c:barChart>\n`;
  xml += `        <c:barDir val="bar"/>\n`;
  xml += `        <c:grouping val="stacked"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  xml += `        <c:ser>\n`;
  xml += `          <c:idx val="0"/>\n`;
  xml += `          <c:order val="0"/>\n`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>LeftSpacer</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
  xml += `          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>\n`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$B$2:$B$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${leftSpacers[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>\n`;
  xml += `        </c:ser>\n`;

  xml += `        <c:ser>\n`;
  xml += `          <c:idx val="1"/>\n`;
  xml += `          <c:order val="1"/>\n`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Value</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
  xml += `          <c:spPr><a:solidFill><a:srgbClr val="${DEFAULT_COLORS[0]}"/></a:solidFill></c:spPr>\n`;
  for (let index = 0; index < categories.length; index++) {
    const color = toHex(fd.colors?.[index] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]);
    xml += `          <c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:dPt>\n`;
  }
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>\n`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$C$2:$C$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${values[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>\n`;
  xml += `        </c:ser>\n`;

  xml += `        <c:ser>\n`;
  xml += `          <c:idx val="2"/>\n`;
  xml += `          <c:order val="2"/>\n`;
  xml += `          <c:tx><c:strRef><c:f>Sheet1!$D$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>RightSpacer</c:v></c:pt></c:strCache></c:strRef></c:tx>\n`;
  xml += `          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>\n`;
  xml += `          <c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${categories.length + 1}</c:f><c:strCache><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${escapeXml(categories[index])}</c:v></c:pt>`;
  }
  xml += `</c:strCache></c:strRef></c:cat>\n`;
  xml += `          <c:val><c:numRef><c:f>Sheet1!$D$2:$D$${categories.length + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${categories.length}"/>`;
  for (let index = 0; index < categories.length; index++) {
    xml += `<c:pt idx="${index}"><c:v>${rightSpacers[index]}</c:v></c:pt>`;
  }
  xml += `</c:numCache></c:numRef></c:val>\n`;
  xml += `        </c:ser>\n`;

  xml += `        <c:gapWidth val="50"/>\n`;
  xml += `        <c:overlap val="100"/>\n`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:barChart>\n`;
  return xml;
}
