import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generateChartXml, colLetter } from "../src/ooxml/chart/chartXml.js";
import { generateExcelBuffer } from "../src/ooxml/chart/excelEmitter.js";
import { computeClassicChartLayout, resolveClassicLegendPosition } from "../src/ooxml/chart/chartLayout.js";
import { collectChartNodes, processSlideCharts } from "../src/ooxml/chart/index.js";
import { generateChartFrameXml } from "../src/ooxml/drawing/chart.js";
import { PaperEngine } from "../src/engine.js";
import type { ChartData, PaperDocument } from "../src/types/ast.js";
import type { LayoutNode } from "../src/layout/extract.js";

const sampleChartData: ChartData = {
  chartType: "bar",
  barGrouping: "clustered",
  categories: ["Q1", "Q2", "Q3"],
  series: [
    { name: "Revenue", values: [100, 200, 300] },
    { name: "Profit", values: [50, 80, 120] },
  ],
  title: { text: "Quarterly Results", bold: true },
};

describe("Chart XML Emitter", () => {
  describe("colLetter", () => {
    it("converts 0-based index to column letters", () => {
      expect(colLetter(0)).toBe("A");
      expect(colLetter(1)).toBe("B");
      expect(colLetter(25)).toBe("Z");
      expect(colLetter(26)).toBe("AA");
      expect(colLetter(27)).toBe("AB");
    });
  });

  describe("generateChartXml", () => {
    it("generates valid bar chart XML", () => {
      const xml = generateChartXml(sampleChartData, "rId1");
      expect(xml).toContain("<c:chartSpace");
      expect(xml).toContain("<c:barChart>");
      expect(xml).toContain('<c:barDir val="col"/>');
      expect(xml).toContain('<c:grouping val="clustered"/>');
      expect(xml).toContain("Quarterly Results");
      expect(xml).toContain("Revenue");
      expect(xml).toContain("Profit");
      expect(xml).toContain("<c:catAx>");
      expect(xml).toContain("<c:valAx>");
      expect(xml).toContain('<c:externalData r:id="rId1">');
    });

    it("generates line chart XML", () => {
      const lineData: ChartData = {
        ...sampleChartData,
        chartType: "line",
        lineGrouping: "standard",
      };
      const xml = generateChartXml(lineData, "rId1");
      expect(xml).toContain("<c:lineChart>");
      expect(xml).toContain('<c:grouping val="standard"/>');
      // Chart-level marker is CT_Boolean (not CT_Marker with symbol)
      expect(xml).toContain('<c:marker val="0"/>');
    });

    it("omits native data labels for line charts", () => {
      const lineData: ChartData = {
        ...sampleChartData,
        chartType: "line",
        dataLabels: { showVal: true, position: "outEnd" },
      };
      const xml = generateChartXml(lineData, "rId1");
      const lineMatch = xml.match(/<c:lineChart>[\s\S]*?<\/c:lineChart>/);
      expect(lineMatch).toBeTruthy();
      expect(lineMatch![0]).not.toContain("<c:dLbls>");
    });

    it("generates pie chart XML", () => {
      const pieData: ChartData = {
        chartType: "pie",
        categories: ["A", "B", "C"],
        series: [{ name: "Sales", values: [30, 50, 20] }],
      };
      const xml = generateChartXml(pieData, "rId1");
      expect(xml).toContain("<c:pieChart>");
      expect(xml).toContain('<c:varyColors val="1"/>');
      // Pie should not have axes
      expect(xml).not.toContain("<c:catAx>");
    });

    it("omits title when not specified", () => {
      const noTitleData: ChartData = {
        chartType: "bar",
        categories: ["X"],
        series: [{ name: "Y", values: [1] }],
      };
      const xml = generateChartXml(noTitleData, "rId1");
      expect(xml).toContain('<c:autoTitleDeleted val="1"/>');
    });

    it("omits legend when position is none", () => {
      const noLegendData: ChartData = {
        chartType: "bar",
        categories: ["X"],
        series: [{ name: "Y", values: [1] }],
        legend: { position: "none" },
      };
      const xml = generateChartXml(noLegendData, "rId1");
      expect(xml).not.toContain("<c:legend>");
    });

    it("hides axes when visible is false", () => {
      const hiddenAxesData: ChartData = {
        chartType: "bar",
        categories: ["X"],
        series: [{ name: "Y", values: [1] }],
        categoryAxis: { visible: false },
        valueAxis: { visible: false },
      };
      const xml = generateChartXml(hiddenAxesData, "rId1");
      expect(xml).toContain('<c:delete val="1"/>');
    });

    it("emits axis scaling with max before min for schema compliance", () => {
      const xml = generateChartXml(
        {
          chartType: "bar",
          categories: ["Q1", "Q2"],
          series: [{ name: "Revenue", values: [10, 20] }],
          valueAxis: { min: 0, max: 100 },
        },
        "rId1",
      );

      expect(xml).toMatch(
        /<c:scaling>\s*<c:orientation val="minMax"\/>\s*<c:max val="100"\/>\s*<c:min val="0"\/>\s*<\/c:scaling>/,
      );
    });

    it("emits radar category axes in maxMin order for round-trip stability", () => {
      const xml = generateChartXml(
        {
          chartType: "radar",
          categories: ["A", "B", "C"],
          series: [{ name: "Series", values: [1, 2, 3] }],
        },
        "rId1",
      );

      expect(xml).toContain('<c:catAx>');
      expect(xml).toContain('<c:orientation val="maxMin"/>');
    });

    it("emits manual plot-area layout for classic charts when frame size is known", () => {
      const xml = generateChartXml(
        {
          ...sampleChartData,
          legend: { position: "right" },
        },
        "rId1",
        { width: 640, height: 360 },
      );
      expect(xml).toContain("<c:manualLayout>");
      expect(xml).toContain('<c:layoutTarget val="inner"/>');
      expect(xml).toMatch(/<c:w val="0\.\d+"/);
      expect(xml).toMatch(/<c:h val="0\.\d+"/);
    });

    it("emits a manual legend layout so bottom legends keep margin from the plot", () => {
      const xml = generateChartXml(
        {
          chartType: "area",
          categories: ["'10", "'11", "'12", "'13", "'14"],
          series: [
            { name: "Goods", values: [22, 27, 33, 40, 48] },
            { name: "Travel", values: [10, 12, 15, 17, 20] },
            { name: "Local", values: [1, 2, 3, 5, 7] },
          ],
          title: { text: "E-COMMERCE GROSS SALES", fontSize: 9 },
          legend: { position: "bottom", fontSize: 9 },
        },
        "rId1",
        { width: 470, height: 270 },
      );

      const legendMatch = xml.match(/<c:legend>[\s\S]*?<\/c:legend>/);
      expect(legendMatch).toBeTruthy();
      expect(legendMatch![0]).toContain("<c:manualLayout>");
      expect(legendMatch![0]).toContain('<c:yMode val="edge"/>');
      expect(legendMatch![0]).toMatch(/<c:y val="0\.\d+"/);
      expect((xml.match(/<c:manualLayout>/g) ?? []).length).toBeGreaterThanOrEqual(2);

      const layout = computeClassicChartLayout(
        {
          chartType: "area",
          categories: ["'10", "'11", "'12", "'13", "'14"],
          series: [
            { name: "Goods", values: [22, 27, 33, 40, 48] },
            { name: "Travel", values: [10, 12, 15, 17, 20] },
            { name: "Local", values: [1, 2, 3, 5, 7] },
          ],
          title: { text: "E-COMMERCE GROSS SALES", fontSize: 9 },
          legend: { position: "bottom", fontSize: 9 },
        },
        { width: 470, height: 270 },
      );
      expect(layout?.legendBox?.position).toBe("bottom");
      expect(layout!.plotAreaPx.top + layout!.plotAreaPx.height).toBeLessThan(layout!.legendBox!.top);
      expect(layout!.legendBox!.height).toBeGreaterThanOrEqual(24);
    });

    it("omits manual plot-area layout for short classic charts", () => {
      const xml = generateChartXml(
        {
          chartType: "line",
          categories: ["A", "B", "C"],
          series: [{ name: "Series", values: [1, 2, 3] }],
          legend: { position: "right" },
        },
        "rId1",
        { width: 520, height: 90 },
      );
      expect(xml).toContain("<c:layout/>");
      expect(xml).not.toContain("<c:manualLayout>");
    });

    it("moves small right-legend charts to bottom legend layout", () => {
      expect(resolveClassicLegendPosition(
        {
          chartType: "pie",
          categories: ["A", "B"],
          series: [{ name: "Mix", values: [60, 40] }],
          legend: { position: "right" },
        },
        { width: 320, height: 180 },
      )).toBe("bottom");
    });

    it("keeps manual layout ratios inside [0, 1]", () => {
      const layout = computeClassicChartLayout(
        {
          chartType: "line",
          categories: ["M1", "M2", "M3", "M4"],
          series: [{ name: "Cash Flow", values: [-4, -2, 1, 5] }],
          legend: { position: "none" },
        },
        { width: 860, height: 90 },
      );
      expect(layout).toBeDefined();
      expect(layout!.plotArea.x).toBeGreaterThanOrEqual(0);
      expect(layout!.plotArea.y).toBeGreaterThanOrEqual(0);
      expect(layout!.plotArea.w).toBeGreaterThan(0);
      expect(layout!.plotArea.h).toBeGreaterThan(0);
      expect(layout!.plotArea.x + layout!.plotArea.w).toBeLessThanOrEqual(1);
      expect(layout!.plotArea.y + layout!.plotArea.h).toBeLessThanOrEqual(1);
      expect(layout!.shouldEmitManualLayout).toBe(false);
    });
  });

  describe("generateChartFrameXml", () => {
    it("generates graphicFrame with chart URI", () => {
      const node: LayoutNode = {
        type: "Chart",
        chartData: sampleChartData,
        layout: { x: 100, y: 100, width: 500, height: 300 },
      } as unknown as LayoutNode;

      const xml = generateChartFrameXml(node, 5, "rId3");
      expect(xml).toContain("<p:graphicFrame>");
      expect(xml).toContain('id="5"');
      expect(xml).toContain('r:id="rId3"');
      expect(xml).toContain("drawingml/2006/chart");
    });
  });

  describe("Excel Emitter", () => {
    it("generates a valid xlsx buffer", async () => {
      const buffer = await generateExcelBuffer(sampleChartData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's a valid ZIP
      const zip = await JSZip.loadAsync(buffer);
      expect(zip.file("[Content_Types].xml")).not.toBeNull();
      expect(zip.file("xl/workbook.xml")).not.toBeNull();
      expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
      expect(zip.file("xl/sharedStrings.xml")).not.toBeNull();

      // Verify sheet data contains our values
      const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      expect(sheetXml).toContain("<v>100</v>");
      expect(sheetXml).toContain("<v>200</v>");

      // Verify shared strings
      const ssXml = await zip.file("xl/sharedStrings.xml")!.async("string");
      expect(ssXml).toContain("Revenue");
      expect(ssXml).toContain("Q1");
    });
  });

  describe("Chart Pipeline", () => {
    it("collectChartNodes finds chart nodes in DFS order", () => {
      const tree: LayoutNode = {
        type: "Slide",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [
          {
            type: "Text",
            content: "Title",
            layout: { x: 0, y: 0, width: 200, height: 30 },
          } as LayoutNode,
          {
            type: "Chart",
            chartData: sampleChartData,
            layout: { x: 0, y: 50, width: 500, height: 300 },
          } as unknown as LayoutNode,
        ],
      } as LayoutNode;

      const charts = collectChartNodes(tree);
      expect(charts).toHaveLength(1);
      expect(charts[0].type).toBe("Chart");
    });

    it("processSlideCharts generates chart assets", async () => {
      const tree: LayoutNode = {
        type: "Slide",
        layout: { x: 0, y: 0, width: 960, height: 540 },
        children: [
          {
            type: "Chart",
            chartData: sampleChartData,
            layout: { x: 0, y: 0, width: 500, height: 300 },
          } as unknown as LayoutNode,
        ],
      } as LayoutNode;

      const counter = { current: 1 };
      const manifest = await processSlideCharts(tree, counter, 5);

      expect(manifest.charts).toHaveLength(1);
      expect(manifest.charts[0].chartIndex).toBe(1);
      expect(manifest.charts[0].rId).toBe("rId5");
      expect(manifest.charts[0].chartXml).toContain("<c:barChart>");
      expect(manifest.charts[0].chartXml).toContain("<c:manualLayout>");
      expect(manifest.charts[0].excelBuffer).toBeInstanceOf(Buffer);
      expect(counter.current).toBe(2);
    });
  });

  describe("Area Charts", () => {
    it("generates area chart XML with grouping", () => {
      const areaData: ChartData = {
        chartType: "area",
        areaGrouping: "stacked",
        categories: ["Q1", "Q2", "Q3"],
        series: [{ name: "Revenue", values: [100, 200, 300] }],
        dataLabels: { showVal: true },
      };
      const xml = generateChartXml(areaData, "rId1");
      expect(xml).toContain("<c:areaChart>");
      expect(xml).toContain('<c:grouping val="stacked"/>');
      expect(xml).toContain('<c:dLbl><c:idx val="0"/><c:delete val="1"/></c:dLbl>');
      expect(xml).toContain('<c:dLbl><c:idx val="2"/><c:delete val="1"/></c:dLbl>');
      expect(xml).toContain("<c:catAx>");
      expect(xml).toContain("<c:valAx>");
    });

    it("defaults to standard grouping", () => {
      const areaData: ChartData = {
        chartType: "area",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
      };
      const xml = generateChartXml(areaData, "rId1");
      expect(xml).toContain('<c:grouping val="standard"/>');
    });

    it("area chart Excel buffer same format as line", async () => {
      const areaData: ChartData = {
        chartType: "area",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [10, 20] }],
      };
      const buffer = await generateExcelBuffer(areaData);
      const zip = await JSZip.loadAsync(buffer);
      const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      expect(sheetXml).toContain("<v>10</v>");
      expect(sheetXml).toContain("<v>20</v>");
    });
  });

  describe("Doughnut Charts", () => {
    it("generates doughnut chart XML with default holeSize", () => {
      const doughnutData: ChartData = {
        chartType: "doughnut",
        categories: ["A", "B", "C"],
        series: [{ name: "Sales", values: [30, 50, 20] }],
      };
      const xml = generateChartXml(doughnutData, "rId1");
      expect(xml).toContain("<c:doughnutChart>");
      expect(xml).toContain('<c:holeSize val="50"/>');
      expect(xml).toContain('<c:varyColors val="1"/>');
    });

    it("uses custom holeSize", () => {
      const doughnutData: ChartData = {
        chartType: "doughnut",
        holeSize: 75,
        categories: ["A", "B", "C"],
        series: [{ name: "Sales", values: [30, 50, 20] }],
      };
      const xml = generateChartXml(doughnutData, "rId1");
      expect(xml).toContain('<c:holeSize val="75"/>');
    });

    it("doughnut chart has no axes", () => {
      const doughnutData: ChartData = {
        chartType: "doughnut",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [60, 40] }],
      };
      const xml = generateChartXml(doughnutData, "rId1");
      expect(xml).not.toContain("<c:catAx>");
      expect(xml).not.toContain("<c:valAx>");
    });
  });

  describe("Scatter Charts", () => {
    const scatterData: ChartData = {
      chartType: "scatter",
      xySeries: [
        {
          name: "Series1",
          dataPoints: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: -1.5, y: -2.5 },
          ],
        },
      ],
    };

    it("generates scatter chart XML", () => {
      const xml = generateChartXml(scatterData, "rId1");
      expect(xml).toContain("<c:scatterChart>");
      expect(xml).toContain('<c:scatterStyle val="lineMarker"/>');
      expect(xml).toContain("<c:xVal>");
      expect(xml).toContain("<c:yVal>");
      expect(xml).not.toContain("<c:cat>");
    });

    it("scatter chart has two valAx, no catAx", () => {
      const xml = generateChartXml(scatterData, "rId1");
      const valAxCount = (xml.match(/<c:valAx>/g) || []).length;
      expect(valAxCount).toBe(2);
      expect(xml).not.toContain("<c:catAx>");
    });

    it("preserves negative floats in XY data", () => {
      const xml = generateChartXml(scatterData, "rId1");
      expect(xml).toContain("<c:v>-1.5</c:v>");
      expect(xml).toContain("<c:v>-2.5</c:v>");
    });

    it("XY Excel buffer has numeric cells", async () => {
      const buffer = await generateExcelBuffer(scatterData);
      const zip = await JSZip.loadAsync(buffer);
      const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      // Data rows should NOT have t="s" (string type)
      const dataRows = sheetXml.split("\n").filter(l => l.includes('r="A2"') || l.includes('<v>1</v>'));
      expect(sheetXml).toContain("<v>1</v>");
      expect(sheetXml).toContain("<v>2</v>");
      // Verify row 2 cells don't have t="s"
      const row2Match = sheetXml.match(/<row r="2">[\s\S]*?<\/row>/);
      expect(row2Match).toBeTruthy();
      expect(row2Match![0]).not.toContain('t="s"');
    });
  });

  describe("Bubble Charts", () => {
    const bubbleData: ChartData = {
      chartType: "bubble",
      xySeries: [
        {
          name: "Bubbles",
          dataPoints: [
            { x: 10, y: 20, size: 5 },
            { x: 30, y: 40, size: 15 },
          ],
        },
      ],
    };

    it("generates bubble chart XML", () => {
      const xml = generateChartXml(bubbleData, "rId1");
      expect(xml).toContain("<c:bubbleChart>");
      expect(xml).toContain("<c:bubbleSize>");
      expect(xml).toContain('<c:bubbleScale val="100"/>');
    });

    it("bubble chart has two valAx, no catAx", () => {
      const xml = generateChartXml(bubbleData, "rId1");
      const valAxCount = (xml.match(/<c:valAx>/g) || []).length;
      expect(valAxCount).toBe(2);
      expect(xml).not.toContain("<c:catAx>");
    });
  });

  describe("Combo Charts", () => {
    const comboData: ChartData = {
      chartType: "bar",
      categories: ["Q1", "Q2", "Q3"],
      series: [
        { name: "Revenue", values: [100, 200, 300] },
        { name: "Trend", values: [90, 180, 270], overrideType: "line", targetAxis: "secondary" },
      ],
    };

    it("emits both barChart and lineChart in same plotArea", () => {
      const xml = generateChartXml(comboData, "rId1");
      expect(xml).toContain("<c:barChart>");
      expect(xml).toContain("<c:lineChart>");
    });

    it("each wrapper contains only its assigned series", () => {
      const xml = generateChartXml(comboData, "rId1");
      // Bar wrapper should have Revenue
      const barMatch = xml.match(/<c:barChart>[\s\S]*?<\/c:barChart>/);
      expect(barMatch).toBeTruthy();
      expect(barMatch![0]).toContain("Revenue");
      expect(barMatch![0]).not.toContain("Trend");

      // Line wrapper should have Trend
      const lineMatch = xml.match(/<c:lineChart>[\s\S]*?<\/c:lineChart>/);
      expect(lineMatch).toBeTruthy();
      expect(lineMatch![0]).toContain("Trend");
      expect(lineMatch![0]).not.toContain("Revenue");
    });

    it("series retain correct idx/order values", () => {
      const xml = generateChartXml(comboData, "rId1");
      // Revenue is idx=0, Trend is idx=1
      const lineMatch = xml.match(/<c:lineChart>[\s\S]*?<\/c:lineChart>/);
      expect(lineMatch![0]).toContain('<c:idx val="1"/>');
      expect(lineMatch![0]).toContain('<c:order val="1"/>');
    });

    it("secondary axis emits third valAx with axPos r", () => {
      const xml = generateChartXml(comboData, "rId1");
      // Should have 3 axes total: catAx, primary valAx, secondary valAx
      const valAxCount = (xml.match(/<c:valAx>/g) || []).length;
      expect(valAxCount).toBe(2); // primary + secondary
      expect(xml).toContain('<c:axPos val="r"/>');
      expect(xml).toContain('<c:crosses val="max"/>');
    });

    it("line wrapper axId matches secondary axis ID", () => {
      const xml = generateChartXml(comboData, "rId1");
      const lineMatch = xml.match(/<c:lineChart>[\s\S]*?<\/c:lineChart>/);
      expect(lineMatch![0]).toContain('<c:axId val="555555555"/>');
    });

    it("emits escaped data label format codes", () => {
      const xml = generateChartXml(
        {
          chartType: "bar",
          categories: ["A", "B"],
          series: [
            {
              name: "S1",
              values: [1, 2],
              dataLabels: { showVal: true, formatCode: '0" units"' },
            },
            {
              name: "S2",
              values: [3, 4],
              dataLabels: { showVal: true, formatCode: '#,##0.0"%" <&>' },
            },
          ],
        },
        "rId1",
      );

      expect(xml).toContain('<c:numFmt formatCode="0&quot; units&quot;" sourceLinked="0"/>');
      expect(xml).toContain('<c:numFmt formatCode="#,##0.0&quot;%&quot; &lt;&amp;&gt;" sourceLinked="0"/>');
    });

    it("keeps data label number formats source-linked when absent", () => {
      const xml = generateChartXml(
        {
          chartType: "bar",
          categories: ["A", "B"],
          series: [{ name: "S1", values: [1, 2], dataLabels: { showVal: true } }],
        },
        "rId1",
      );

      expect(xml).toContain('<c:numFmt formatCode="General" sourceLinked="1"/>');
    });

    it("emits data label number formats before text properties for schema compliance", () => {
      const xml = generateChartXml(
        {
          chartType: "bar",
          categories: ["A", "B"],
          series: [{ name: "S1", values: [1, 2] }],
          dataLabels: {
            showVal: true,
            position: "outEnd",
            formatCode: '#,##0.0"%"',
            fontFamily: "Aptos",
            fontSize: 10,
          },
        },
        "rId1",
      );
      const dLbls = xml.match(/<c:dLbls>[\s\S]*?<\/c:dLbls>/)?.[0];
      expect(dLbls).toBeTruthy();

      const numFmtIdx = dLbls!.indexOf("<c:numFmt");
      const txPrIdx = dLbls!.indexOf("<c:txPr>");
      const dLblPosIdx = dLbls!.indexOf("<c:dLblPos");
      expect(numFmtIdx).toBeGreaterThan(-1);
      expect(txPrIdx).toBeGreaterThan(-1);
      expect(dLblPosIdx).toBeGreaterThan(-1);
      expect(numFmtIdx).toBeLessThan(txPrIdx);
      expect(txPrIdx).toBeLessThan(dLblPosIdx);
    });
  });

  describe("ECMA-376 Element Ordering", () => {
    it("dLbls appears before cat within <c:ser>", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2], dataLabels: { showVal: true } }],
      };
      const xml = generateChartXml(data, "rId1");
      const serMatch = xml.match(/<c:ser>[\s\S]*?<\/c:ser>/);
      expect(serMatch).toBeTruthy();
      const ser = serMatch![0];
      const dLblsIdx = ser.indexOf("<c:dLbls>");
      const catIdx = ser.indexOf("<c:cat>");
      expect(dLblsIdx).toBeGreaterThan(-1);
      expect(catIdx).toBeGreaterThan(-1);
      expect(dLblsIdx).toBeLessThan(catIdx);
    });

    it("dTable appears after axis elements within <c:plotArea>", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        dataTable: { showKeys: true },
      };
      const xml = generateChartXml(data, "rId1");
      const plotMatch = xml.match(/<c:plotArea>[\s\S]*?<\/c:plotArea>/);
      expect(plotMatch).toBeTruthy();
      const plot = plotMatch![0];
      const catAxIdx = plot.indexOf("<c:catAx>");
      const valAxIdx = plot.indexOf("<c:valAx>");
      const dTableIdx = plot.indexOf("<c:dTable>");
      expect(catAxIdx).toBeGreaterThan(-1);
      expect(valAxIdx).toBeGreaterThan(-1);
      expect(dTableIdx).toBeGreaterThan(-1);
      expect(dTableIdx).toBeGreaterThan(catAxIdx);
      expect(dTableIdx).toBeGreaterThan(valAxIdx);
    });

    it("gridlines appears before tickLblPos within <c:valAx>", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        valueAxis: { gridlines: { major: true } },
      };
      const xml = generateChartXml(data, "rId1");
      const valAxMatch = xml.match(/<c:valAx>[\s\S]*?<\/c:valAx>/);
      expect(valAxMatch).toBeTruthy();
      const valAx = valAxMatch![0];
      const gridIdx = valAx.indexOf("<c:majorGridlines");
      const tickIdx = valAx.indexOf("<c:tickLblPos");
      expect(gridIdx).toBeGreaterThan(-1);
      expect(tickIdx).toBeGreaterThan(-1);
      expect(gridIdx).toBeLessThan(tickIdx);
    });

    it("crossAx appears before crossBetween within <c:valAx>", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
      };
      const xml = generateChartXml(data, "rId1");
      const valAxMatch = xml.match(/<c:valAx>[\s\S]*?<\/c:valAx>/);
      expect(valAxMatch).toBeTruthy();
      const valAx = valAxMatch![0];
      const crossAxIdx = valAx.indexOf("<c:crossAx");
      const crossBetweenIdx = valAx.indexOf("<c:crossBetween");
      expect(crossAxIdx).toBeGreaterThan(-1);
      expect(crossBetweenIdx).toBeGreaterThan(-1);
      expect(crossAxIdx).toBeLessThan(crossBetweenIdx);
    });

    it("printSettings is present in chart XML", () => {
      const xml = generateChartXml(sampleChartData, "rId1");
      expect(xml).toContain("<c:printSettings>");
      expect(xml).toContain("<c:headerFooter/>");
      expect(xml).toContain("<c:pageMargins");
      expect(xml).toContain("<c:pageSetup/>");
      // printSettings should come after externalData
      const extIdx = xml.indexOf("<c:externalData");
      const printIdx = xml.indexOf("<c:printSettings>");
      expect(printIdx).toBeGreaterThan(extIdx);
    });
  });

  describe("Chart Preamble Elements", () => {
    it("generates date1904, lang, and roundedCorners in chart XML", () => {
      const xml = generateChartXml(sampleChartData, "rId1");
      expect(xml).toContain('<c:date1904 val="0"/>');
      expect(xml).toContain('<c:lang val="en-US"/>');
      expect(xml).toContain('<c:roundedCorners val="0"/>');
      // c:style removed — conflicts with separate chartStyle/chartColorStyle parts
      expect(xml).not.toContain('<c:style val="2"/>');
      // Verify order: preamble comes before <c:chart>
      const preambleIdx = xml.indexOf('<c:date1904');
      const chartIdx = xml.indexOf('<c:chart>');
      expect(preambleIdx).toBeLessThan(chartIdx);
    });
  });

  describe("Simplified Excel Structure (PowerPoint Mac compat)", () => {
    it("Excel buffer contains minimal structure without theme, table, or docProps", async () => {
      const buffer = await generateExcelBuffer(sampleChartData);
      const zip = await JSZip.loadAsync(buffer);

      // Core files should exist
      expect(zip.file("xl/workbook.xml")).not.toBeNull();
      expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
      expect(zip.file("xl/styles.xml")).not.toBeNull();
      expect(zip.file("xl/sharedStrings.xml")).not.toBeNull();

      // Theme, table, docProps should NOT exist (removed for PowerPoint Mac compat)
      expect(zip.file("xl/theme/theme1.xml")).toBeNull();
      expect(zip.file("xl/tables/table1.xml")).toBeNull();
      expect(zip.file("xl/worksheets/_rels/sheet1.xml.rels")).toBeNull();
      expect(zip.file("docProps/core.xml")).toBeNull();
      expect(zip.file("docProps/app.xml")).toBeNull();

      // Sheet XML should not have tableParts
      const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      expect(sheetXml).not.toContain("<tableParts");

      // Content types should not include theme or table
      const ctXml = await zip.file("[Content_Types].xml")!.async("string");
      expect(ctXml).not.toContain("theme1.xml");
      expect(ctXml).not.toContain("table1.xml");
      expect(ctXml).not.toContain("docProps");

      // Workbook rels should not include theme
      const wbRels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
      expect(wbRels).not.toContain("theme/theme1.xml");
    });
  });

  describe("Excel Content Types (simplified)", () => {
    it("Excel [Content_Types].xml has only essential overrides", async () => {
      const buffer = await generateExcelBuffer(sampleChartData);
      const zip = await JSZip.loadAsync(buffer);
      const ctXml = await zip.file("[Content_Types].xml")!.async("string");
      // Should have workbook, worksheet, styles, sharedStrings
      expect(ctXml).toContain("workbook.xml");
      expect(ctXml).toContain("sheet1.xml");
      expect(ctXml).toContain("styles.xml");
      expect(ctXml).toContain("sharedStrings.xml");
      // Should NOT have docProps
      expect(ctXml).not.toContain('PartName="/docProps/core.xml"');
      expect(ctXml).not.toContain('PartName="/docProps/app.xml"');
    });
  });

  describe("Legend ECMA-376 ordering", () => {
    it("legend spPr appears before txPr when both are present", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        legend: {
          position: "bottom",
          fontFamily: "Arial",
          fontSize: 12,
          fill: "#FFFFFF",
          border: { color: "#000000", width: 1 },
        },
      };
      const xml = generateChartXml(data, "rId1");
      const legendMatch = xml.match(/<c:legend>[\s\S]*?<\/c:legend>/);
      expect(legendMatch).toBeTruthy();
      const legend = legendMatch![0];
      const spPrIdx = legend.indexOf("<c:spPr>");
      const txPrIdx = legend.indexOf("<c:txPr>");
      expect(spPrIdx).toBeGreaterThan(-1);
      expect(txPrIdx).toBeGreaterThan(-1);
      expect(spPrIdx).toBeLessThan(txPrIdx);
    });
  });

  describe("Axis Element Ordering (ECMA-376 strict)", () => {
    it("tickMarks appear before tickLblPos in catAx", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        categoryAxis: { tickMark: { major: "cross", minor: "inside" } },
      };
      const xml = generateChartXml(data, "rId1");
      const catAxMatch = xml.match(/<c:catAx>[\s\S]*?<\/c:catAx>/);
      expect(catAxMatch).toBeTruthy();
      const catAx = catAxMatch![0];
      const majorTickIdx = catAx.indexOf("<c:majorTickMark");
      const tickLblIdx = catAx.indexOf("<c:tickLblPos");
      expect(majorTickIdx).toBeGreaterThan(-1);
      expect(tickLblIdx).toBeGreaterThan(-1);
      expect(majorTickIdx).toBeLessThan(tickLblIdx);
    });

    it("txPr appears after spPr in valAx", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        valueAxis: { labelFont: { fontSize: 12, fontFamily: "Arial" } },
      };
      const xml = generateChartXml(data, "rId1");
      const valAxMatch = xml.match(/<c:valAx>[\s\S]*?<\/c:valAx>/);
      expect(valAxMatch).toBeTruthy();
      const valAx = valAxMatch![0];
      const spPrIdx = valAx.indexOf("<c:spPr>");
      const txPrIdx = valAx.indexOf("<c:txPr>");
      expect(spPrIdx).toBeGreaterThan(-1);
      expect(txPrIdx).toBeGreaterThan(-1);
      expect(spPrIdx).toBeLessThan(txPrIdx);
    });

    it("crossesAt appears after crossAx in valAx", () => {
      const data: ChartData = {
        chartType: "bar",
        categories: ["A", "B"],
        series: [{ name: "S1", values: [1, 2] }],
        valueAxis: { crossesAt: 0 },
      };
      const xml = generateChartXml(data, "rId1");
      const valAxMatch = xml.match(/<c:valAx>[\s\S]*?<\/c:valAx>/);
      expect(valAxMatch).toBeTruthy();
      const valAx = valAxMatch![0];
      const crossAxIdx = valAx.indexOf("<c:crossAx");
      const crossesAtIdx = valAx.indexOf("<c:crossesAt");
      expect(crossAxIdx).toBeGreaterThan(-1);
      expect(crossesAtIdx).toBeGreaterThan(-1);
      expect(crossesAtIdx).toBeGreaterThan(crossAxIdx);
    });

    it("complete chartSpace element order is correct", () => {
      const xml = generateChartXml(sampleChartData, "rId1");
      // Verify the top-level order within chartSpace (c:style removed)
      const date1904Idx = xml.indexOf("<c:date1904");
      const langIdx = xml.indexOf("<c:lang");
      const roundedIdx = xml.indexOf("<c:roundedCorners");
      const chartIdx = xml.indexOf("<c:chart>");
      const extDataIdx = xml.indexOf("<c:externalData");
      const printIdx = xml.indexOf("<c:printSettings>");

      expect(date1904Idx).toBeLessThan(langIdx);
      expect(langIdx).toBeLessThan(roundedIdx);
      expect(roundedIdx).toBeLessThan(chartIdx);
      expect(chartIdx).toBeLessThan(extDataIdx);
      expect(extDataIdx).toBeLessThan(printIdx);
    });
  });

  describe("Full PPTX Chart Integration", () => {
    it("generates a PPTX with editable chart containing all required files", async () => {
      const doc: PaperDocument = {
        type: "Document",
        meta: { title: "Chart Test" },
        slides: [
          {
            type: "Slide",
            style: { width: 960, height: 540 },
            children: [
              {
                type: "Chart",
                chartData: sampleChartData,
                style: { width: 500, height: 300 },
              } as any,
            ],
          },
        ],
      };

      const buffer = await PaperEngine.render(doc);
      const zip = await JSZip.loadAsync(buffer);

      // Chart XML with preamble
      const chartXml = await zip.file("ppt/charts/chart1.xml")!.async("string");
      expect(chartXml).toContain('<c:date1904 val="0"/>');
      expect(chartXml).toContain('<c:lang val="en-US"/>');
      expect(chartXml).toContain('<c:roundedCorners val="0"/>');

      // Style and colors companion files are no longer generated
      // (removed to fix PowerPoint Mac chart corruption)
      expect(zip.file("ppt/charts/style1.xml")).toBeNull();
      expect(zip.file("ppt/charts/colors1.xml")).toBeNull();

      // Embedded Excel has minimal structure (no table/theme)
      const embeddingFiles = Object.keys(zip.files).filter(f => f.startsWith("ppt/embeddings/") && !zip.files[f].dir);
      expect(embeddingFiles.length).toBeGreaterThan(0);

      const xlsxBuffer = await zip.file(embeddingFiles[0])!.async("nodebuffer");
      const innerZip = await JSZip.loadAsync(xlsxBuffer);
      expect(innerZip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
      expect(innerZip.file("xl/sharedStrings.xml")).not.toBeNull();
    });
  });
});
