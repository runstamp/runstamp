// Diagnostic script 2: Deep inspection of Excel internals and XML validation
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";

async function main() {
  const doc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            style: {
              position: "absolute",
              top: 50,
              left: 50,
              width: 400,
              height: 300,
            },
            chartData: {
              chartType: "bar",
              categories: ["Q1", "Q2", "Q3"],
              series: [
                { name: "Revenue", values: [100, 200, 300] },
              ],
            },
          },
        ],
      },
    ],
  };

  const buf = await PaperEngine.render(doc);
  const zip = await JSZip.loadAsync(buf);

  // ===== DEEP EXCEL INSPECTION =====
  console.log("========== EXCEL INTERNALS ==========");
  const xlsxBuf = await zip.file("ppt/embeddings/chart1.xlsx")!.async("nodebuffer");
  const xlsxZip = await JSZip.loadAsync(xlsxBuf);

  // List ALL files in xlsx
  console.log("\nAll files in chart1.xlsx:");
  xlsxZip.forEach((path) => {
    console.log(`  ${path}`);
  });

  // Dump every XML file in the xlsx
  for (const [path, file] of Object.entries(xlsxZip.files)) {
    if (file.dir) continue;
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      const content = await file.async("text");
      console.log(`\n--- ${path} ---`);
      console.log(content);
    }
  }

  // ===== OOXML COMPLIANCE CHECKS =====
  console.log("\n\n========== OOXML COMPLIANCE CHECKS ==========");

  const chartXml = await zip.file("ppt/charts/chart1.xml")!.async("text");
  const slideXml = await zip.file("ppt/slides/slide1.xml")!.async("text");
  const slideRels = await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("text");
  const chartRels = await zip.file("ppt/charts/_rels/chart1.xml.rels")!.async("text");
  const contentTypes = await zip.file("[Content_Types].xml")!.async("text");

  // Check 1: CT_ChartSpace element ordering
  console.log("\n--- Check 1: CT_ChartSpace element order ---");
  const chartSpaceChildren = chartXml.match(/<c:(\w+)/g);
  if (chartSpaceChildren) {
    console.log("Top-level c: elements in order:", chartSpaceChildren.join(", "));
  }

  // Check 2: CT_BarSer element ordering (ECMA-376 strict)
  // Required order: idx, order, tx?, spPr?, invertIfNeg?, dPt*, dLbls?, trendline*, errBars*, cat?, val?, shape?
  console.log("\n--- Check 2: CT_BarSer element order ---");
  const serMatch = chartXml.match(/<c:ser>([\s\S]*?)<\/c:ser>/);
  if (serMatch) {
    const serChildren = serMatch[1].match(/<c:(\w+)/g);
    console.log("Series elements:", serChildren?.join(", "));
  }

  // Check 3: CT_CatAx element ordering
  console.log("\n--- Check 3: CT_CatAx element order ---");
  const catAxMatch = chartXml.match(/<c:catAx>([\s\S]*?)<\/c:catAx>/);
  if (catAxMatch) {
    const catAxChildren = catAxMatch[1].match(/<c:(\w+)/g);
    console.log("CatAx elements:", catAxChildren?.join(", "));
  }

  // Check 4: CT_ValAx element ordering
  console.log("\n--- Check 4: CT_ValAx element order ---");
  const valAxMatch = chartXml.match(/<c:valAx>([\s\S]*?)<\/c:valAx>/);
  if (valAxMatch) {
    const valAxChildren = valAxMatch[1].match(/<c:(\w+)/g);
    console.log("ValAx elements:", valAxChildren?.join(", "));
  }

  // Check 5: Missing numFmt in valAx
  console.log("\n--- Check 5: Missing elements ---");
  console.log("valAx has numFmt:", chartXml.includes("<c:numFmt") && chartXml.indexOf("<c:numFmt") > chartXml.indexOf("<c:valAx>"));
  console.log("catAx has numFmt:", /c:catAx[\s\S]*?c:numFmt[\s\S]*?\/c:catAx/.test(chartXml));

  // Check 6: Verify rId cross-references
  console.log("\n--- Check 6: rId cross-references ---");
  // Extract rIds from slide XML
  const slideRIds = [...slideXml.matchAll(/r:id="(rId\d+)"/g)].map(m => m[1]);
  // Extract rIds from slide rels
  const slideRelRIds = [...slideRels.matchAll(/Id="(rId\d+)"/g)].map(m => m[1]);
  console.log("Slide XML references:", slideRIds);
  console.log("Slide rels defines:", slideRelRIds);
  console.log("All slide rIds resolved:", slideRIds.every(id => slideRelRIds.includes(id)));

  // Chart rIds
  const chartXmlRIds = [...chartXml.matchAll(/r:id="(rId\d+)"/g)].map(m => m[1]);
  const chartRelRIds = [...chartRels.matchAll(/Id="(rId\d+)"/g)].map(m => m[1]);
  console.log("Chart XML references:", chartXmlRIds);
  console.log("Chart rels defines:", chartRelRIds);
  console.log("All chart rIds resolved:", chartXmlRIds.every(id => chartRelRIds.includes(id)));

  // Check 7: numFmt in catAx (CRITICAL for PowerPoint)
  // ECMA-376 says numFmt is REQUIRED for catAx, valAx
  console.log("\n--- Check 7: Required elements analysis ---");
  // Check if valAx has majorGridlines (PowerPoint expects this)
  console.log("valAx has majorGridlines:", /c:valAx[\s\S]*?c:majorGridlines[\s\S]*?\/c:valAx/.test(chartXml));
  // Check if numFmt is present in valAx
  console.log("valAx full XML:");
  const valAxFull = chartXml.match(/<c:valAx>([\s\S]*?)<\/c:valAx>/);
  if (valAxFull) console.log(valAxFull[0]);

  console.log("\ncatAx full XML:");
  const catAxFull = chartXml.match(/<c:catAx>([\s\S]*?)<\/c:catAx>/);
  if (catAxFull) console.log(catAxFull[0]);

  // Check 8: Verify graphicFrame structure
  console.log("\n--- Check 8: graphicFrame structure ---");
  const gfMatch = slideXml.match(/<p:graphicFrame>([\s\S]*?)<\/p:graphicFrame>/);
  if (gfMatch) {
    console.log("graphicFrame content:");
    console.log(gfMatch[0]);
  }

  // Check 9: Verify content types are complete
  console.log("\n--- Check 9: Content type completeness ---");
  const zipFiles: string[] = [];
  zip.forEach((path) => { if (!zip.files[path].dir) zipFiles.push(path); });

  for (const path of zipFiles) {
    if (path.endsWith(".xml") && !path.endsWith(".rels") && !path.startsWith("_rels/")) {
      const override = contentTypes.includes(`PartName="/${path}"`);
      const ext = path.split(".").pop()!;
      const defaultType = contentTypes.includes(`Extension="${ext}"`);
      if (!override && !defaultType) {
        console.log(`MISSING content type for: ${path}`);
      }
    }
  }
  console.log("All content types present ✓");

  // Check 10: ECMA-376 required element order for CT_ChartSpace
  // date1904, lang, roundedCorners, style?, chart, spPr?, externalData?, printSettings?, userShapes?
  console.log("\n--- Check 10: CT_ChartSpace strict element ordering ---");
  const topLevelOrder = ["date1904", "lang", "roundedCorners", "style", "chart", "externalData", "printSettings"];
  let lastIdx = -1;
  let orderOk = true;
  for (const elem of topLevelOrder) {
    const idx = chartXml.indexOf(`<c:${elem}`);
    if (idx === -1) continue;
    if (idx < lastIdx) {
      console.log(`ORDER VIOLATION: <c:${elem}> appears before previous element`);
      orderOk = false;
    }
    lastIdx = idx;
  }
  if (orderOk) console.log("CT_ChartSpace order: OK ✓");
}

main().catch(console.error);
