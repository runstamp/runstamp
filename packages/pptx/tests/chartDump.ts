// Diagnostic script: generates a PPTX with a simple bar chart and dumps all XML
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import { writeFileSync, mkdirSync } from "fs";

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

  console.log("Generating PPTX...");
  const buf = await PaperEngine.render(doc);

  const outDir = ".tmp-chart-dump";
  mkdirSync(outDir, { recursive: true });

  // Save the PPTX
  writeFileSync(`${outDir}/test-chart.pptx`, buf);
  console.log(`Saved PPTX to ${outDir}/test-chart.pptx`);

  // Extract and dump all files
  const zip = await JSZip.loadAsync(buf);

  const dumpFiles = [
    "[Content_Types].xml",
    "ppt/slides/slide1.xml",
    "ppt/slides/_rels/slide1.xml.rels",
    "ppt/charts/chart1.xml",
    "ppt/charts/_rels/chart1.xml.rels",
    "ppt/charts/style1.xml",
    "ppt/charts/colors1.xml",
    "ppt/presentation.xml",
    "ppt/_rels/presentation.xml.rels",
  ];

  for (const path of dumpFiles) {
    const file = zip.file(path);
    if (file) {
      const content = await file.async("text");
      const safeName = path.replace(/\//g, "__").replace(/\[|\]/g, "_");
      writeFileSync(`${outDir}/${safeName}`, content);
      console.log(`\n${"=".repeat(80)}`);
      console.log(`FILE: ${path}`);
      console.log("=".repeat(80));
      console.log(content);
    } else {
      console.log(`\nMISSING: ${path}`);
    }
  }

  // Check for Excel embedding
  const xlsxFile = zip.file("ppt/embeddings/chart1.xlsx");
  if (xlsxFile) {
    const xlsxBuf = await xlsxFile.async("nodebuffer");
    writeFileSync(`${outDir}/chart1.xlsx`, xlsxBuf);
    console.log(`\nExcel file exists: ${xlsxBuf.length} bytes`);
    // Verify it's a valid ZIP
    console.log(`Valid ZIP header: ${xlsxBuf[0] === 0x50 && xlsxBuf[1] === 0x4b}`);

    // Extract Excel contents
    const xlsxZip = await JSZip.loadAsync(xlsxBuf);
    const sheetXml = xlsxZip.file("xl/worksheets/sheet1.xml");
    if (sheetXml) {
      const sheetContent = await sheetXml.async("text");
      writeFileSync(`${outDir}/excel-sheet1.xml`, sheetContent);
      console.log(`\n${"=".repeat(80)}`);
      console.log("FILE: xl/worksheets/sheet1.xml (inside chart1.xlsx)");
      console.log("=".repeat(80));
      console.log(sheetContent);
    }
  } else {
    console.log("\nMISSING: ppt/embeddings/chart1.xlsx");
  }

  // List ALL files in the ZIP
  console.log(`\n${"=".repeat(80)}`);
  console.log("ALL FILES IN ZIP:");
  console.log("=".repeat(80));
  zip.forEach((relativePath) => {
    console.log(`  ${relativePath}`);
  });
}

main().catch(console.error);
